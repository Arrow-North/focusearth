// Relative, extension-qualified import: this module is also loaded by the
// `resolve-led-asset` edge function, and Deno's type-checker follows even
// type-only imports, where the `@/` alias has no counterpart.
import type { Classification, LinkClass } from '../../types/catalogue-import.ts';

/**
 * Link classifier — shared by the browser preview and the `resolve-led-asset`
 * Supabase Edge Function (Deno), which imports this file by relative path.
 *
 * Because of that second consumer this module MUST stay:
 *   - dependency free (the `@/types` import above is type-only, so it is erased
 *     at compile time and never resolved at runtime),
 *   - free of browser-only globals (no window/document/localStorage) and of
 *     Deno-only globals,
 *   - side-effect free on import.
 *
 * Three layers, cheapest first:
 *   1. host  — known sharing hosts whose URL shape alone decides the verdict,
 *              and which usually need a rewrite to serve raw bytes.
 *   2. extension — the file extension on the URL pathname.
 *   3. probe — `classifyFromResponse`, fed by a HEAD/ranged GET in the edge
 *              function. Only reached when layers 1 and 2 return UNKNOWN/'none'.
 */

// ─── Extension buckets (layer 2) ────────────────────────────────────────────

const IMAGE_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
  '.bmp',
  '.tif',
  '.tiff',
  '.svg',
  '.avif',
  '.heic',
]);

const FILE_EXTENSIONS = new Set(['.pdf']);

/** An archive of images is a repository: recorded, never fetched. */
const ARCHIVE_EXTENSIONS = new Set(['.zip', '.rar', '.7z', '.tar', '.gz']);

// ─── Normalisation ──────────────────────────────────────────────────────────

/** Analytics junk that must never change the dedupe key. */
const TRACKING_PARAMS = new Set([
  'fbclid',
  'gclid',
  'dclid',
  'msclkid',
  'igshid',
  'mc_cid',
  'mc_eid',
]);

/**
 * Canonical form of a link, used as the per-run dedupe cache key.
 *
 * Lowercases the scheme and host, drops the default port, drops the fragment
 * and common tracking parameters. Every other query parameter is preserved —
 * Dropbox `rlkey` and Drive `id` are load bearing, not noise. Input that is not
 * a parseable absolute URL is returned trimmed and otherwise untouched, so a
 * malformed cell still dedupes against itself.
 */
export function normalizeUrl(raw: string): string {
  const trimmed = (raw || '').trim();
  if (!trimmed) return '';

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return trimmed;
  }

  const protocol = url.protocol.toLowerCase();
  if (protocol !== 'http:' && protocol !== 'https:') return trimmed;

  url.protocol = protocol;
  url.hostname = url.hostname.toLowerCase();
  url.hash = '';
  if (
    (protocol === 'http:' && url.port === '80') ||
    (protocol === 'https:' && url.port === '443')
  ) {
    url.port = '';
  }

  for (const key of Array.from(url.searchParams.keys())) {
    const lower = key.toLowerCase();
    if (lower.startsWith('utm_') || TRACKING_PARAMS.has(lower)) {
      url.searchParams.delete(key);
    }
  }

  const query = url.searchParams.toString();
  url.search = query ? `?${query}` : '';

  return url.toString();
}

// ─── Layer 1 + 2 ────────────────────────────────────────────────────────────

/**
 * Classify a link without touching the network — layers 1 (known host) and 2
 * (path extension). Used directly by the preview UI and as the first step
 * inside the edge function. Never throws: bad input comes back as UNKNOWN with
 * an actionable `reason`.
 *
 * A result of `{ kind: 'UNKNOWN', via: 'none' }` means "undecided, probe it";
 * any other UNKNOWN is a terminal verdict the caller should report as a failure.
 */
export function classifyUrl(raw: string): Classification {
  const trimmed = (raw || '').trim();
  if (!trimmed) {
    return verdict('UNKNOWN', '', 'none', 'Empty link cell');
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return verdict(
      'UNKNOWN',
      trimmed,
      'none',
      `Not a valid absolute URL: "${clip(trimmed)}"`,
    );
  }

  const protocol = url.protocol.toLowerCase();
  if (protocol !== 'http:' && protocol !== 'https:') {
    return verdict(
      'UNKNOWN',
      trimmed,
      'none',
      `Unsupported scheme "${protocol.replace(':', '')}" (only http and https are fetched)`,
    );
  }

  const normalized = normalizeUrl(trimmed);
  let canonical: URL;
  try {
    canonical = new URL(normalized);
  } catch {
    canonical = url;
  }

  const byHost = classifyByHost(canonical);
  if (byHost) return byHost;

  return classifyByExtension(canonical, normalized);
}

/** Layer 2: decide purely from the extension on the pathname (query ignored). */
function classifyByExtension(url: URL, normalized: string): Classification {
  const ext = pathExtension(url.pathname);

  if (!ext) {
    return verdict(
      'UNKNOWN',
      normalized,
      'none',
      'No file extension on the URL path — needs a network probe',
    );
  }
  if (IMAGE_EXTENSIONS.has(ext)) {
    return verdict('IMAGE', normalized, 'extension', `Image extension ${ext}`);
  }
  if (FILE_EXTENSIONS.has(ext)) {
    return verdict('FILE', normalized, 'extension', `Document extension ${ext}`);
  }
  if (ARCHIVE_EXTENSIONS.has(ext)) {
    return verdict(
      'IMAGE_REPO',
      normalized,
      'extension',
      `Archive extension ${ext} (an archive of images is a repository)`,
    );
  }

  return verdict(
    'UNKNOWN',
    normalized,
    'none',
    `Unrecognised extension ${ext} — needs a network probe`,
  );
}

// ─── Layer 1 host rules ─────────────────────────────────────────────────────

/** Returns null when no host rule applies, so the caller falls through. */
function classifyByHost(url: URL): Classification | null {
  const host = url.hostname.toLowerCase();

  if (hostIs(host, 'dropboxusercontent.com')) {
    return verdict(
      'FILE',
      url.toString(),
      'host',
      'Dropbox direct-download host (already serves raw bytes)',
    );
  }
  if (hostIs(host, 'dropbox.com')) return classifyDropbox(url);
  if (host === 'drive.google.com' || host === 'drive.usercontent.google.com') {
    return classifyGoogleDrive(url);
  }
  if (
    host.endsWith('.sharepoint.com') ||
    host === 'sharepoint.com' ||
    host === 'onedrive.live.com' ||
    hostIs(host, '1drv.ms')
  ) {
    return classifySharePoint(url, host);
  }
  if (hostIs(host, 'box.com')) return classifyBox(url);
  if (
    hostIs(host, 'wetransfer.com') ||
    hostIs(host, 'smash.com') ||
    hostIs(host, 'fromsmash.com') ||
    hostIs(host, 'we.tl')
  ) {
    return verdict(
      'IMAGE_REPO',
      url.toString(),
      'host',
      `File-transfer link (${host}) — a bundle of assets, not a single file`,
    );
  }

  return null;
}

function classifyDropbox(url: URL): Classification | null {
  const seg = segments(url.pathname);

  // /s/<id>/<file> — a single shared file.
  if (seg[0] === 's' && seg.length >= 2) {
    return verdict(
      'FILE',
      dropboxDirect(url),
      'host',
      'Dropbox shared file link (/s/)',
    );
  }
  // /sh/<id>/... — a shared folder.
  if (seg[0] === 'sh') {
    return verdict(
      'IMAGE_REPO',
      url.toString(),
      'host',
      'Dropbox shared folder link (/sh/)',
    );
  }
  if (seg[0] === 'scl') {
    // /scl/fi/<id>/... — "fi" = file.
    if (seg[1] === 'fi') {
      return verdict(
        'FILE',
        dropboxDirect(url),
        'host',
        'Dropbox shared file link (/scl/fi/)',
      );
    }
    // /scl/fo/<id>/... — "fo" = folder.
    if (seg[1] === 'fo') {
      return verdict(
        'IMAGE_REPO',
        url.toString(),
        'host',
        'Dropbox folder link (/scl/fo/)',
      );
    }
  }

  return null;
}

/**
 * Rewrite a Dropbox share page to a direct-bytes URL.
 * The host swap is what actually serves the file; `dl=1&raw=1` is kept as a
 * belt-and-braces for the www host should a redirect bounce us back. Every
 * other query parameter survives — `rlkey` is the access token on /scl/ links,
 * and dropping it turns the fetch into a 404.
 */
function dropboxDirect(url: URL): string {
  const out = new URL(url.toString());
  out.hostname = 'dl.dropboxusercontent.com';
  out.searchParams.set('dl', '1');
  out.searchParams.set('raw', '1');
  return out.toString();
}

function classifyGoogleDrive(url: URL): Classification | null {
  const seg = segments(url.pathname);

  // /file/d/<id>/view
  if (seg[0] === 'file' && seg[1] === 'd' && seg[2]) {
    return verdict(
      'FILE',
      `https://drive.google.com/uc?export=download&id=${encodeURIComponent(seg[2])}`,
      'host',
      'Google Drive file link (/file/d/)',
    );
  }
  // /drive/folders/<id> and /drive/u/<n>/folders/<id>
  if (seg[0] === 'drive' && seg.includes('folders')) {
    return verdict(
      'IMAGE_REPO',
      url.toString(),
      'host',
      'Google Drive folder link (/drive/folders/)',
    );
  }
  // /open?id=<id> is ambiguous — it serves files and folders alike. Fall
  // through so layers 2/3 decide from the probe response.
  return null;
}

/** SharePoint / OneDrive encode the item kind in the `/:x:/` path token. */
const SHAREPOINT_FOLDER_TOKENS = ['f', 'fl'];
const SHAREPOINT_FILE_TOKENS = ['i', 'b', 'w', 'x', 'p', 'v', 't', 'u'];

function classifySharePoint(url: URL, host: string): Classification | null {
  if (hostIs(host, '1drv.ms')) {
    return verdict(
      'FILE',
      withParam(url, 'download', '1'),
      'host',
      'OneDrive short link (1drv.ms)',
    );
  }

  const path = url.pathname;
  for (const token of SHAREPOINT_FOLDER_TOKENS) {
    if (path.includes(`/:${token}:/`)) {
      return verdict(
        'IMAGE_REPO',
        url.toString(),
        'host',
        `SharePoint/OneDrive folder link (/:${token}:/)`,
      );
    }
  }
  for (const token of SHAREPOINT_FILE_TOKENS) {
    if (path.includes(`/:${token}:/`)) {
      return verdict(
        'FILE',
        withParam(url, 'download', '1'),
        'host',
        `SharePoint/OneDrive file link (/:${token}:/)`,
      );
    }
  }

  return null;
}

function classifyBox(url: URL): Classification | null {
  const seg = segments(url.pathname);

  if (seg[0] === 'folder' && seg[1]) {
    return verdict('IMAGE_REPO', url.toString(), 'host', 'Box folder link (/folder/)');
  }
  if (seg[0] === 's' && seg[1]) {
    return verdict('FILE', url.toString(), 'host', 'Box shared file link (/s/)');
  }
  if (seg[0] === 'file' && seg[1]) {
    return verdict('FILE', url.toString(), 'host', 'Box file link (/file/)');
  }

  return null;
}

// ─── Layer 3 ────────────────────────────────────────────────────────────────

const ARCHIVE_MIME_TYPES = new Set([
  'application/zip',
  'application/x-zip-compressed',
  'multipart/x-zip',
  'application/x-rar-compressed',
  'application/vnd.rar',
  'application/x-7z-compressed',
  'application/x-tar',
  'application/gzip',
  'application/x-gzip',
]);

const OCTET_STREAM_TYPES = new Set([
  'application/octet-stream',
  'binary/octet-stream',
  'application/binary',
]);

/**
 * Layer 3 — turn a probe response into a verdict.
 *
 * `finalUrl` is the URL after redirects; it becomes `fetchUrl` verbatim so the
 * caller re-fetches exactly what it probed.
 */
export function classifyFromResponse(
  contentType: string | null,
  contentDisposition: string | null,
  finalUrl: string,
): Classification {
  const fetchUrl = (finalUrl || '').trim();
  const mime = mimeOf(contentType);

  if (!mime) {
    return verdict(
      'UNKNOWN',
      fetchUrl,
      'probe',
      'No Content-Type on the probe response',
    );
  }
  if (mime.startsWith('image/')) {
    return verdict('IMAGE', fetchUrl, 'probe', `Content-Type ${mime}`);
  }
  if (mime === 'application/pdf') {
    return verdict('FILE', fetchUrl, 'probe', `Content-Type ${mime}`);
  }
  if (mime === 'text/html' || mime === 'application/xhtml+xml') {
    return verdict(
      'IMAGE_REPO',
      fetchUrl,
      'probe',
      `Content-Type ${mime} (a landing or gallery page, not an asset)`,
    );
  }
  if (ARCHIVE_MIME_TYPES.has(mime)) {
    return verdict(
      'IMAGE_REPO',
      fetchUrl,
      'probe',
      `Content-Type ${mime} (an archive of images is a repository)`,
    );
  }

  if (OCTET_STREAM_TYPES.has(mime)) {
    const filename = filenameFromContentDisposition(contentDisposition);
    const ext =
      (filename ? pathExtension(filename) : '') || pathExtension(pathnameOf(fetchUrl));
    const source = filename
      ? `Content-Disposition filename "${clip(filename, 80)}"`
      : 'URL path';

    if (ARCHIVE_EXTENSIONS.has(ext)) {
      return verdict(
        'IMAGE_REPO',
        fetchUrl,
        'probe',
        `Content-Type ${mime} with archive extension ${ext} from ${source}`,
      );
    }
    if (IMAGE_EXTENSIONS.has(ext)) {
      return verdict(
        'IMAGE',
        fetchUrl,
        'probe',
        `Content-Type ${mime} with image extension ${ext} from ${source}`,
      );
    }
    if (FILE_EXTENSIONS.has(ext)) {
      return verdict(
        'FILE',
        fetchUrl,
        'probe',
        `Content-Type ${mime} with document extension ${ext} from ${source}`,
      );
    }
    return verdict(
      'UNKNOWN',
      fetchUrl,
      'probe',
      `Content-Type ${mime} with no recognisable filename extension`,
    );
  }

  return verdict('UNKNOWN', fetchUrl, 'probe', `Unhandled Content-Type ${mime}`);
}

// ─── Extension selection ────────────────────────────────────────────────────

/** Definite Content-Types only — octet-stream is deliberately absent. */
const EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/pjpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/bmp': '.bmp',
  'image/x-ms-bmp': '.bmp',
  'image/tiff': '.tif',
  'image/svg+xml': '.svg',
  'image/avif': '.avif',
  'image/heic': '.heic',
  'image/heif': '.heic',
  'image/x-icon': '.ico',
  'application/pdf': '.pdf',
  'application/zip': '.zip',
  'application/x-zip-compressed': '.zip',
  'application/vnd.rar': '.rar',
  'application/x-rar-compressed': '.rar',
  'application/x-7z-compressed': '.7z',
  'application/x-tar': '.tar',
  'application/gzip': '.gz',
  'application/x-gzip': '.gz',
  'text/html': '.html',
};

/**
 * Pick the storage extension for a fetched asset, INCLUDING the leading dot.
 *
 * Priority, highest first: Content-Type, then the Content-Disposition
 * filename, then the URL path, then `.jpg`. A definite Content-Type always
 * wins over the URL — hosts that serve a PNG from a `.jpg` path are common and
 * the bytes, not the path, are the truth.
 */
export function extensionFor(
  contentType: string | null,
  contentDisposition: string | null,
  url: string,
): string {
  const mime = mimeOf(contentType);
  const mapped = EXTENSION_BY_MIME[mime];
  if (mapped) return mapped;

  // An unlisted but definite image subtype, e.g. image/jxl.
  if (mime.startsWith('image/')) {
    const subtype = mime.slice('image/'.length).replace(/\+.*$/, '');
    if (/^[a-z0-9]{1,5}$/.test(subtype)) return `.${subtype}`;
  }

  const filename = filenameFromContentDisposition(contentDisposition);
  const fromFilename = filename ? pathExtension(filename) : '';
  if (fromFilename) return fromFilename;

  const fromUrl = pathExtension(pathnameOf(url));
  if (fromUrl) return fromUrl;

  return '.jpg';
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function verdict(
  kind: LinkClass,
  fetchUrl: string,
  via: Classification['via'],
  reason: string,
): Classification {
  return { kind, fetchUrl, via, reason };
}

/** True for the domain itself and any subdomain of it. */
function hostIs(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`);
}

function segments(pathname: string): string[] {
  return pathname.split('/').filter(Boolean);
}

/** Add or overwrite one query parameter, leaving the rest alone. */
function withParam(url: URL, key: string, value: string): string {
  const out = new URL(url.toString());
  out.searchParams.set(key, value);
  return out.toString();
}

/** Lowercased media type with any `;charset=` / `;boundary=` suffix stripped. */
function mimeOf(contentType: string | null): string {
  return (contentType || '').split(';')[0].trim().toLowerCase();
}

/**
 * Lowercased extension of the last path segment, including the dot.
 * Returns '' when there is no plausible extension. Deliberately strict —
 * `/s/abc/Catalogue 2024.final` must not be read as a `.final` file type.
 */
function pathExtension(path: string): string {
  const raw = (path || '').split('/').pop() || '';
  let name = raw;
  try {
    name = decodeURIComponent(raw);
  } catch {
    name = raw;
  }
  const dot = name.lastIndexOf('.');
  if (dot <= 0 || dot === name.length - 1) return '';
  const ext = name.slice(dot + 1).toLowerCase();
  return /^[a-z0-9]{1,5}$/.test(ext) ? `.${ext}` : '';
}

/** Pathname of an absolute URL; falls back to string surgery for fragments. */
function pathnameOf(url: string): string {
  const raw = (url || '').trim();
  if (!raw) return '';
  try {
    return new URL(raw).pathname;
  } catch {
    return raw.split('#')[0].split('?')[0];
  }
}

/** RFC 5987 `filename*` wins over the plain `filename`, as the RFC requires. */
function filenameFromContentDisposition(value: string | null): string {
  const header = (value || '').trim();
  if (!header) return '';

  const extended = header.match(/filename\*\s*=\s*([^;]+)/i);
  if (extended) {
    const parts = extended[1].trim().split("''");
    const encoded = (parts.length > 1 ? parts[1] : parts[0]).trim();
    try {
      return decodeURIComponent(stripQuotes(encoded));
    } catch {
      return stripQuotes(encoded);
    }
  }

  const quoted = header.match(/filename\s*=\s*"([^"]*)"/i);
  if (quoted) return quoted[1].trim();

  const bare = header.match(/filename\s*=\s*([^;]+)/i);
  if (bare) return stripQuotes(bare[1].trim());

  return '';
}

function stripQuotes(value: string): string {
  return value.replace(/^"(.*)"$/, '$1').trim();
}

function clip(value: string, max = 120): string {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}
