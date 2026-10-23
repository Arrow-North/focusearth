// Supabase Edge Function: resolve-led-asset
//
// Mirrors manufacturer-catalogue asset links (product images, spec sheets,
// installation instructions) into the public `leds` Storage bucket and returns
// the resulting public URLs.
//
// Wire contract: ResolveRequest -> ResolveResponse from src/types/catalogue-import.ts.
//
// Environment variables (all injected by the Supabase platform — no `secrets set`):
// - SUPABASE_URL
// - SUPABASE_ANON_KEY              (used only to identify the caller)
// - SUPABASE_SERVICE_ROLE_KEY      (used only for the Storage upload)
//
// SECURITY: this function fetches arbitrary user-supplied URLs. `verify_jwt`
// stays at its default `true`, and on top of that every caller's profile must
// be SUPERADMIN / Sa / Au. Without that second check any registered user could
// aim the function at an arbitrary host and use it as an open proxy. Every URL
// — including every redirect hop — goes through the SSRF guard before a socket
// is opened.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import type {
  AssetField,
  LinkClass,
  ResolveRequest,
  ResolveRequestItem,
  ResolveResponse,
  ResolveResultItem,
} from "../../../src/types/catalogue-import.ts";

import {
  classifyFromResponse,
  classifyUrl,
  extensionFor,
  normalizeUrl,
} from "../../../src/lib/catalogue-import/link-classifier.ts";

import {
  assertPublicHttpUrlWithDns,
  BlockedUrlError,
} from "../../../src/lib/catalogue-import/ssrf-guard.ts";

// ─── Config ──────────────────────────────────────────────────────────────────

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const BUCKET = "leds";

/** Matches the bucket's file_size_limit (50 MB). */
const MAX_BYTES = 52_428_800;

/** Per-fetch-attempt timeout. */
const FETCH_TIMEOUT_MS = 30_000;

/** Overall per-item budget across all retries, to protect the ~150s edge limit. */
const ITEM_BUDGET_MS = 75_000;

const MAX_REDIRECTS = 5;
const MAX_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 500;
const CONCURRENCY = 5;

/** Some CDNs 403 a bare Deno UA. */
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

const ADMIN_TYPES = new Set(["SUPERADMIN", "Sa", "Au"]);

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Max-Age": "86400",
};

const JSON_HEADERS: Record<string, string> = {
  ...CORS_HEADERS,
  "Content-Type": "application/json",
};

/**
 * MIME types the `leds` bucket accepts (see
 * 20261023000000_leds_catalogue_import.sql). Anything else is remapped from the
 * resolved file extension, or rejected with a clear error, rather than being
 * bounced opaquely by Storage.
 */
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/bmp",
  "image/tiff",
  "image/svg+xml",
  "image/avif",
  "application/pdf",
]);

const EXT_TO_MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".jpe": "image/jpeg",
  ".jfif": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".bmp": "image/bmp",
  ".tif": "image/tiff",
  ".tiff": "image/tiff",
  ".svg": "image/svg+xml",
  ".avif": "image/avif",
  ".pdf": "application/pdf",
};

// ─── Storage key building ────────────────────────────────────────────────────
//
// Deliberately inlined rather than imported from
// src/lib/catalogue-import/storage-paths.ts: that module does
// `import type { AssetField } from '@/types/catalogue-import'`, and the `@/`
// alias has no counterpart in the Deno/edge module resolver (there is no
// deno.json or import map under supabase/functions). Editing that file is not
// an option — other work depends on it — so the ~6 lines are reproduced here.
// Keep FIELD_SUFFIX and buildObjectKey in sync with storage-paths.ts.

const FIELD_SUFFIX: Record<AssetField, string> = {
  productImage: "",
  specifications: "-spec",
  installationInstructions: "-install",
};

function slugify(input: string): string {
  return (
    (input || "")
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "") // strip diacritics
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .replace(/-{2,}/g, "-")
      .slice(0, 80) || "unknown"
  );
}

/**
 * Defence in depth for the object key. The client currently sends a generated
 * UUID as `productId`, which needs no sanitising — but this function is a
 * public HTTP endpoint and must not trust that. A caller passing `SKU 001/A`
 * would otherwise inject extra path segments. Case is preserved (unlike
 * slugify) so two IDs differing only in case cannot collide.
 */
function safeSegment(input: string): string {
  return (
    (input || "")
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^A-Za-z0-9._-]+/g, "-")
      .replace(/^[-.]+|[-.]+$/g, "")
      .replace(/-{2,}/g, "-")
      .slice(0, 100) || "unknown"
  );
}

function buildObjectKey(
  companySlug: string,
  typeSlug: string,
  productId: string,
  field: AssetField,
  ext: string,
): string {
  const dotted = ext.startsWith(".") ? ext : `.${ext}`;
  return `${companySlug}/${typeSlug}/${safeSegment(productId)}${
    FIELD_SUFFIX[field] ?? ""
  }${dotted}`;
}

// ─── Small helpers ───────────────────────────────────────────────────────────

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function errMessage(e: unknown): string {
  if (e instanceof Error) return e.message || e.name;
  return String(e);
}

function baseMime(contentType: string | null): string | null {
  if (!contentType) return null;
  const head = contentType.split(";")[0]?.trim().toLowerCase();
  return head || null;
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || (status >= 500 && status <= 599);
}

/** Thrown for an HTTP response we will not accept; carries the status. */
class HttpError extends Error {
  status: number;
  retryable: boolean;
  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.retryable = isRetryableStatus(status);
  }
}

/** Thrown when a body exceeds MAX_BYTES; never retryable. */
class TooLargeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TooLargeError";
  }
}

function skeleton(item: ResolveRequestItem): ResolveResultItem {
  return {
    productId: item.productId,
    field: item.field,
    status: "failed",
    publicUrl: null,
    classification: "UNKNOWN",
    httpStatus: null,
    bytes: null,
    error: null,
    cached: false,
    objectKey: null,
  };
}

// ─── Redirect-aware, SSRF-guarded fetch ──────────────────────────────────────

interface FetchOutcome {
  response: Response;
  finalUrl: string;
}

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

/**
 * Fetch with `redirect: 'manual'` and re-run the SSRF guard on every hop.
 * `redirect: 'follow'` would let a public URL bounce to 169.254.169.254 or
 * localhost without the guard ever seeing it.
 */
async function guardedFetch(
  startUrl: string,
  headers: Record<string, string>,
  signal: AbortSignal,
): Promise<FetchOutcome> {
  let current = startUrl;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    // Validated before *every* request, including each redirect target.
    await assertPublicHttpUrlWithDns(current);

    const response = await fetch(current, {
      method: "GET",
      headers,
      redirect: "manual",
      signal,
    });

    if (!REDIRECT_STATUSES.has(response.status)) {
      return { response, finalUrl: current };
    }

    const location = response.headers.get("location");
    // Drain the redirect body so the connection can be reused/closed.
    await response.body?.cancel().catch(() => {});

    if (!location) {
      throw new HttpError(
        response.status,
        `Redirect ${response.status} without a Location header`,
      );
    }

    if (hop === MAX_REDIRECTS) {
      throw new Error(`Too many redirects (>${MAX_REDIRECTS})`);
    }

    try {
      current = new URL(location, current).toString();
    } catch {
      throw new Error(`Redirect to an unparseable Location: ${location}`);
    }
  }

  // Unreachable; the loop either returns or throws.
  throw new Error(`Too many redirects (>${MAX_REDIRECTS})`);
}

/**
 * One fetch attempt with its own 30s timeout. The caller owns retry policy.
 */
async function fetchOnce(
  url: string,
  extraHeaders: Record<string, string>,
): Promise<FetchOutcome> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await guardedFetch(
      url,
      {
        "User-Agent": USER_AGENT,
        Accept: "*/*",
        ...extraHeaders,
      },
      controller.signal,
    );
  } catch (e) {
    if (controller.signal.aborted) {
      throw new Error(`Timed out after ${FETCH_TIMEOUT_MS}ms`);
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Retry 429 / 5xx / network + timeout errors with exponential backoff.
 * 403 and 404 (and every other 4xx) fail immediately — retrying them only
 * burns the batch's time budget.
 *
 * Returns a non-redirect response; it does NOT check `response.ok`, because a
 * caller probing for classification may legitimately want a 416.
 */
async function fetchWithRetry(
  url: string,
  extraHeaders: Record<string, string>,
  deadline: number,
): Promise<FetchOutcome> {
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    if (Date.now() > deadline) {
      throw lastError ?? new Error("Time budget exhausted before fetch");
    }

    try {
      const outcome = await fetchOnce(url, extraHeaders);

      if (isRetryableStatus(outcome.response.status) && attempt < MAX_ATTEMPTS) {
        const status = outcome.response.status;
        const retryAfter = outcome.response.headers.get("retry-after");
        await outcome.response.body?.cancel().catch(() => {});
        lastError = new HttpError(status, `HTTP ${status}`);

        let delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
        const parsed = retryAfter ? Number(retryAfter) : NaN;
        if (Number.isFinite(parsed) && parsed > 0) {
          delay = Math.min(parsed * 1000, 10_000);
        }
        delay += Math.floor(Math.random() * 250);

        if (Date.now() + delay > deadline) throw lastError;
        await sleep(delay);
        continue;
      }

      return outcome;
    } catch (e) {
      // Never retry a blocked URL — it is blocked deterministically.
      if (e instanceof BlockedUrlError) throw e;
      if (e instanceof HttpError && !e.retryable) throw e;

      lastError = e;
      if (attempt === MAX_ATTEMPTS) throw e;

      const delay =
        RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1) +
        Math.floor(Math.random() * 250);
      if (Date.now() + delay > deadline) throw e;
      await sleep(delay);
    }
  }

  throw lastError ?? new Error("Fetch failed");
}

// ─── Bounded body read ───────────────────────────────────────────────────────

/**
 * Stream the body, aborting the moment it crosses MAX_BYTES.
 * Content-Length is used only as an early-exit hint — a hostile or sloppy
 * server can lie about it, and a chunked response omits it entirely — so the
 * real enforcement is the running byte count below.
 */
async function readBodyCapped(response: Response): Promise<Uint8Array> {
  const declared = Number(response.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_BYTES) {
    await response.body?.cancel().catch(() => {});
    throw new TooLargeError(
      `Content-Length ${declared} exceeds the ${MAX_BYTES} byte limit`,
    );
  }

  if (!response.body) return new Uint8Array(0);

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      total += value.byteLength;
      if (total > MAX_BYTES) {
        await reader.cancel().catch(() => {});
        throw new TooLargeError(
          `Body exceeds the ${MAX_BYTES} byte limit (aborted at ${total} bytes)`,
        );
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock?.();
  }

  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

// ─── MIME resolution ─────────────────────────────────────────────────────────

/**
 * Pick a content type Storage will accept. Many CDNs serve
 * `application/octet-stream` (Dropbox in particular), which the bucket rejects;
 * in that case fall back to the extension the classifier resolved.
 */
function resolveUploadMime(
  contentType: string | null,
  ext: string,
): string | null {
  const base = baseMime(contentType);
  if (base && ALLOWED_MIME.has(base)) return base;

  const byExt = EXT_TO_MIME[ext.toLowerCase()];
  if (byExt) return byExt;

  return null;
}

// ─── Per-item resolution ─────────────────────────────────────────────────────

interface Context {
  companySlug: string;
  typeSlug: string;
  // deno-lint-ignore no-explicit-any
  storage: any;
  /**
   * Normalized URL -> in-flight-or-settled resolution.
   *
   * Promises, not finished results: with CONCURRENCY workers the same repeated
   * URL is very often started by several workers in the same tick, and a
   * result-only cache would miss every one of them and re-download the file.
   * The stored promise is produced by `resolveUncached`, which never rejects.
   */
  cache: Map<string, Promise<ResolveResultItem>>;
}

async function uploadAndPublish(
  ctx: Context,
  item: ResolveRequestItem,
  bytes: Uint8Array,
  contentType: string,
  ext: string,
): Promise<{ publicUrl: string; objectKey: string }> {
  const objectKey = buildObjectKey(
    ctx.companySlug,
    ctx.typeSlug,
    item.productId,
    item.field,
    ext,
  );

  const { error } = await ctx.storage.from(BUCKET).upload(objectKey, bytes, {
    contentType,
    upsert: true,
    cacheControl: "3600",
  });

  if (error) {
    throw new Error(`Storage upload failed: ${errMessage(error)}`);
  }

  const { data } = ctx.storage.from(BUCKET).getPublicUrl(objectKey);
  const publicUrl: string | undefined = data?.publicUrl;
  if (!publicUrl) {
    throw new Error("Storage upload succeeded but no public URL was returned");
  }

  return { publicUrl, objectKey };
}

/**
 * Fetch `url`, enforce the size cap, upload, and return a populated result.
 * `fallbackResponse` lets the UNKNOWN probe path reuse a response it already
 * holds (a server that ignored our Range header handed us the whole body).
 */
async function fetchUploadAndBuild(
  ctx: Context,
  item: ResolveRequestItem,
  url: string,
  kind: LinkClass,
  deadline: number,
  fallbackResponse?: FetchOutcome,
): Promise<ResolveResultItem> {
  const result = skeleton(item);
  result.classification = kind;

  const outcome = fallbackResponse ?? (await fetchWithRetry(url, {}, deadline));
  const { response, finalUrl } = outcome;
  result.httpStatus = response.status;

  if (!response.ok) {
    await response.body?.cancel().catch(() => {});
    throw new HttpError(response.status, `HTTP ${response.status} fetching ${url}`);
  }

  const contentType = response.headers.get("content-type");
  const contentDisposition = response.headers.get("content-disposition");
  const ext = extensionFor(contentType, contentDisposition, finalUrl);

  const uploadMime = resolveUploadMime(contentType, ext);
  if (!uploadMime) {
    await response.body?.cancel().catch(() => {});
    throw new Error(
      `Unsupported content type "${
        baseMime(contentType) ?? "unknown"
      }" (resolved extension "${ext}")`,
    );
  }

  const bytes = await readBodyCapped(response);
  if (bytes.byteLength === 0) {
    throw new Error("Remote returned an empty body");
  }
  result.bytes = bytes.byteLength;

  const { publicUrl, objectKey } = await uploadAndPublish(
    ctx,
    item,
    bytes,
    uploadMime,
    ext,
  );

  result.status = "uploaded";
  result.publicUrl = publicUrl;
  result.objectKey = objectKey;
  result.error = null;
  return result;
}

/**
 * UNKNOWN links (layers 1-2 could not decide): spend one cheap byte to read the
 * response headers, then act on `classifyFromResponse`.
 */
async function probeAndResolve(
  ctx: Context,
  item: ResolveRequestItem,
  url: string,
  deadline: number,
): Promise<ResolveResultItem> {
  let probe = await fetchWithRetry(url, { Range: "bytes=0-0" }, deadline);

  // 416 Range Not Satisfiable / 501 Not Implemented => the server dislikes
  // Range. Retry without it.
  if (probe.response.status === 416 || probe.response.status === 501) {
    await probe.response.body?.cancel().catch(() => {});
    probe = await fetchWithRetry(url, {}, deadline);
  }

  const { response, finalUrl } = probe;

  if (!response.ok && response.status !== 206) {
    await response.body?.cancel().catch(() => {});
    throw new HttpError(response.status, `HTTP ${response.status} probing ${url}`);
  }

  const verdict = classifyFromResponse(
    response.headers.get("content-type"),
    response.headers.get("content-disposition"),
    finalUrl,
  );

  if (verdict.kind === "IMAGE_REPO") {
    await response.body?.cancel().catch(() => {});
    const result = skeleton(item);
    result.status = "image_repo";
    result.classification = "IMAGE_REPO";
    result.httpStatus = response.status;
    result.error = null;
    console.log(`resolve-led-asset: image_repo via probe ${url} (${verdict.reason})`);
    return result;
  }

  if (verdict.kind !== "IMAGE" && verdict.kind !== "FILE") {
    await response.body?.cancel().catch(() => {});
    const result = skeleton(item);
    result.classification = "UNKNOWN";
    result.httpStatus = response.status;
    result.error =
      verdict.reason ||
      "Could not classify the link from its URL or its response headers";
    return result;
  }

  // The server ignored our Range header and handed back the whole entity —
  // reuse it rather than paying for a second round trip.
  const canReuse =
    response.status === 200 &&
    verdict.fetchUrl === finalUrl &&
    response.body !== null;

  if (canReuse) {
    return await fetchUploadAndBuild(
      ctx,
      item,
      finalUrl,
      verdict.kind,
      deadline,
      probe,
    );
  }

  await response.body?.cancel().catch(() => {});
  return await fetchUploadAndBuild(
    ctx,
    item,
    verdict.fetchUrl,
    verdict.kind,
    deadline,
  );
}

/** Resolve one item for real. Never rejects — always returns a result. */
async function resolveUncached(
  ctx: Context,
  item: ResolveRequestItem,
  raw: string,
): Promise<ResolveResultItem> {
  const deadline = Date.now() + ITEM_BUDGET_MS;
  let result: ResolveResultItem;

  try {
    const classification = classifyUrl(raw);

    if (classification.kind === "IMAGE_REPO") {
      // A folder / gallery / archive. Recorded, never fetched.
      result = skeleton(item);
      result.status = "image_repo";
      result.classification = "IMAGE_REPO";
      // `status` is the discriminator; `error` stays null so a consumer that
      // treats a non-null `error` as a failure does not miscount these.
      result.error = null;
      console.log(
        `resolve-led-asset: image_repo ${raw} (${classification.reason})`,
      );
    } else if (
      classification.kind === "IMAGE" ||
      classification.kind === "FILE"
    ) {
      result = await fetchUploadAndBuild(
        ctx,
        item,
        classification.fetchUrl,
        classification.kind,
        deadline,
      );
    } else {
      result = await probeAndResolve(ctx, item, classification.fetchUrl, deadline);
    }
  } catch (e) {
    // One bad item must never fail the batch.
    result = skeleton(item);
    result.status = "failed";

    if (e instanceof BlockedUrlError) {
      result.error = `Blocked URL: ${errMessage(e)}`;
    } else if (e instanceof HttpError) {
      result.httpStatus = e.status;
      result.error = errMessage(e);
    } else if (e instanceof TooLargeError) {
      result.error = errMessage(e);
    } else {
      result.error = errMessage(e);
    }

    // Preserve whatever the layer-1/2 classifier managed to decide.
    try {
      result.classification = classifyUrl(raw).kind;
    } catch {
      result.classification = "UNKNOWN";
    }
  }

  result.cached = false;
  return result;
}

async function resolveItem(
  ctx: Context,
  item: ResolveRequestItem,
): Promise<ResolveResultItem> {
  const raw = (item.url ?? "").trim();

  // Blank cell: not an error, just nothing to do.
  if (!raw) {
    const result = skeleton(item);
    result.status = "skipped";
    result.error = null;
    return result;
  }

  let cacheKey: string;
  try {
    cacheKey = normalizeUrl(raw) || raw;
  } catch {
    cacheKey = raw;
  }

  // A catalogue repeats the same image URL across dozens of rows; one fetch +
  // one upload serves all of them.
  const existing = ctx.cache.get(cacheKey);
  if (existing) {
    const base = await existing;
    return {
      ...base,
      productId: item.productId,
      field: item.field,
      cached: true,
    };
  }

  // Registered synchronously, before the first await, so concurrent workers
  // holding the same URL join this resolution instead of starting their own.
  const pending = resolveUncached(ctx, item, raw);
  ctx.cache.set(cacheKey, pending);
  return await pending;
}

// ─── Bounded-concurrency batch runner ────────────────────────────────────────

async function runBatch(
  ctx: Context,
  items: ResolveRequestItem[],
): Promise<ResolveResultItem[]> {
  const results = new Array<ResolveResultItem>(items.length);
  let next = 0;

  const worker = async () => {
    while (true) {
      const index = next++;
      if (index >= items.length) return;
      const item = items[index];
      try {
        results[index] = await resolveItem(ctx, item);
      } catch (e) {
        // resolveItem is already total, but never let a worker die silently.
        const fallback = skeleton(item);
        fallback.status = "failed";
        fallback.error = errMessage(e);
        results[index] = fallback;
      }
    }
  };

  const workers: Promise<void>[] = [];
  for (let i = 0; i < Math.min(CONCURRENCY, items.length); i++) {
    workers.push(worker());
  }
  await Promise.all(workers);

  return results;
}

// ─── Auth ────────────────────────────────────────────────────────────────────

interface AuthOutcome {
  ok: boolean;
  status: number;
  message?: string;
}

async function authorizeAdmin(authHeader: string): Promise<AuthOutcome> {
  // Anon-key client carrying the caller's JWT. Used ONLY to identify them;
  // it never touches Storage.
  const caller = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Pass the bearer token explicitly: `getUser()` with no argument goes through
  // session storage, which an edge function does not have.
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  const { data: userData, error: userError } = await caller.auth.getUser(token);
  const user = userData?.user;
  if (userError || !user) {
    return { ok: false, status: 401, message: "Invalid or expired token" };
  }

  const { data: profile, error: profileError } = await caller
    .from("profiles")
    .select("type, is_deleted")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return { ok: false, status: 403, message: "No profile for this user" };
  }

  if (profile.is_deleted) {
    return { ok: false, status: 403, message: "Profile is deleted" };
  }

  if (!ADMIN_TYPES.has(String(profile.type))) {
    return {
      ok: false,
      status: 403,
      message: "Catalogue import requires an admin profile (SUPERADMIN, Sa, Au)",
    };
  }

  return { ok: true, status: 200 };
}

// ─── Entry point ─────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("resolve-led-asset: missing platform environment variables");
    return json({ error: "Function is not configured" }, 500);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return json({ error: "Missing Authorization header" }, 401);
  }

  let auth: AuthOutcome;
  try {
    auth = await authorizeAdmin(authHeader);
  } catch (e) {
    console.error("resolve-led-asset: auth error", e);
    return json({ error: "Authorization check failed" }, 500);
  }
  if (!auth.ok) {
    return json({ error: auth.message ?? "Forbidden" }, auth.status);
  }

  let body: ResolveRequest;
  try {
    body = (await req.json()) as ResolveRequest;
  } catch {
    return json({ error: "Request body is not valid JSON" }, 400);
  }

  if (!body || typeof body !== "object" || !Array.isArray(body.items)) {
    return json({ error: "`items` must be an array" }, 400);
  }
  if (!body.companySlug || !body.luminaireType) {
    return json(
      { error: "`companySlug` and `luminaireType` are required" },
      400,
    );
  }

  // Service-role client. Used ONLY for the Storage upload; it bypasses RLS,
  // which is why the admin check above is mandatory.
  const service = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const ctx: Context = {
    companySlug: slugify(body.companySlug),
    typeSlug: slugify(body.luminaireType),
    storage: service.storage,
    cache: new Map<string, Promise<ResolveResultItem>>(),
  };

  const started = Date.now();
  const results = await runBatch(ctx, body.items);

  console.log(
    `resolve-led-asset: ${results.length} item(s) in ${Date.now() - started}ms ` +
      `(${results.filter((r) => r.status === "uploaded").length} uploaded, ` +
      `${results.filter((r) => r.cached).length} cached, ` +
      `${results.filter((r) => r.status === "failed").length} failed)`,
  );

  const response: ResolveResponse = { results };
  return json(response, 200);
});
