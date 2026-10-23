# `resolve-led-asset`

Mirrors manufacturer-catalogue asset links (product images, spec sheets,
installation instructions) into the public `leds` Storage bucket and returns the
resulting public URLs.

Wire contract: `ResolveRequest` -> `ResolveResponse` from
[`src/types/catalogue-import.ts`](../../../src/types/catalogue-import.ts).

---

## Prerequisites

The function depends on migration
`supabase/migrations/20261023000000_leds_catalogue_import.sql`, which widens the
`leds` bucket's `allowed_mime_types`. Apply migrations before deploying, or
uploads of BMP / TIFF / SVG / AVIF assets will be rejected by Storage.

```bash
supabase db push          # remote
supabase db reset         # local
```

## Deploy

```bash
supabase functions deploy resolve-led-asset
```

### Environment variables

**None need to be set.** `SUPABASE_URL`, `SUPABASE_ANON_KEY` and
`SUPABASE_SERVICE_ROLE_KEY` are injected into every edge function by the
platform, and those are the only three this function reads. There is no
`supabase secrets set` step.

### JWT verification

`verify_jwt` stays at its **default `true`** — do **not** deploy with
`--no-verify-jwt`. On top of the platform's JWT check the function resolves the
caller's `public.profiles` row and returns **403** unless
`profiles.type IN ('SUPERADMIN', 'Sa', 'Au')`.

This second check is not redundant. The function fetches arbitrary
user-supplied URLs; a valid JWT alone would make it an open proxy that any
registered user could aim at any host.

### A note on the module layout

`index.ts` imports `link-classifier.ts` and `ssrf-guard.ts` from `src/` by
relative path (`../../../src/lib/catalogue-import/...`) so that the browser
preview and the edge function cannot drift apart. This bundles correctly: the
deploy bundler builds a **code-only** module graph, and the `@/types/...`
alias those modules use is a type-only import that is erased before resolution.

`deno check` (full type-checking) *does* follow type-only imports and will fail
on that alias — that is expected and does not affect `supabase functions deploy`.

---

## Smoke tests

Set up the shell. The JWT must belong to a `SUPERADMIN` / `Sa` / `Au` user —
grab one from the browser devtools console on a signed-in admin session:

```js
// in the browser console, signed in as an admin
(await window.supabase.auth.getSession()).data.session.access_token
```

```bash
export FN_URL="https://<project-ref>.supabase.co/functions/v1/resolve-led-asset"
export ANON_KEY="<your anon key>"
export JWT="<admin access token>"

# local instead:
# export FN_URL="http://127.0.0.1:54321/functions/v1/resolve-led-asset"
```

### 0. CORS preflight

```bash
curl -i -X OPTIONS "$FN_URL" \
  -H "Origin: http://localhost:8080" \
  -H "Access-Control-Request-Method: POST"
```

Expect `200` with `access-control-allow-origin: *`.

### 1. The full battery

One call covering a direct image, a Dropbox file link, a Dropbox folder link, a
404, and a blocked SSRF target. Every item is independent — one failure never
fails the batch, and you always get exactly one result per input item, in input
order.

```bash
curl -s -X POST "$FN_URL" \
  -H "Authorization: Bearer $JWT" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "companySlug": "acme-lighting",
    "luminaireType": "power-supplies",
    "items": [
      { "productId": "SMOKE-IMAGE",
        "field": "productImage",
        "url": "https://upload.wikimedia.org/wikipedia/commons/4/47/PNG_transparency_demonstration_1.png" },

      { "productId": "SMOKE-DBX-FILE",
        "field": "specifications",
        "url": "https://www.dropbox.com/scl/fi/REPLACE/spec-sheet.pdf?rlkey=REPLACE&dl=0" },

      { "productId": "SMOKE-DBX-FOLDER",
        "field": "productImage",
        "url": "https://www.dropbox.com/scl/fo/REPLACE/AAAA?rlkey=REPLACE&dl=0" },

      { "productId": "SMOKE-404",
        "field": "installationInstructions",
        "url": "https://upload.wikimedia.org/wikipedia/commons/this-does-not-exist-404.pdf" },

      { "productId": "SMOKE-SSRF",
        "field": "productImage",
        "url": "http://169.254.169.254/latest/meta-data/iam/security-credentials/" },

      { "productId": "SMOKE-BLANK",
        "field": "specifications",
        "url": "" },

      { "productId": "SMOKE-DUPE",
        "field": "productImage",
        "url": "https://upload.wikimedia.org/wikipedia/commons/4/47/PNG_transparency_demonstration_1.png" }
    ]
  }' | jq -r '.results[] | "\(.productId)\t\(.status)\t\(.classification)\tcached=\(.cached)\thttp=\(.httpStatus)\t\(.publicUrl // .error // "")"'
```

Expected:

| productId          | status       | classification | notes                                                                 |
| ------------------ | ------------ | -------------- | --------------------------------------------------------------------- |
| `SMOKE-IMAGE`      | `uploaded`   | `IMAGE`        | `publicUrl` ends `acme-lighting/power-supplies/SMOKE-IMAGE.png`         |
| `SMOKE-DBX-FILE`   | `uploaded`   | `FILE`         | fetched via the classifier's raw-bytes rewrite; key ends `-spec.pdf`    |
| `SMOKE-DBX-FOLDER` | `image_repo` | `IMAGE_REPO`   | `publicUrl: null`, **never fetched**                                    |
| `SMOKE-404`        | `failed`     | `FILE`         | `httpStatus: 404`, no retries (4xx fails immediately)                   |
| `SMOKE-SSRF`       | `failed`     | `UNKNOWN`      | `error` starts `Blocked URL:`, returns in ms — **no hang, no timeout**  |
| `SMOKE-BLANK`      | `skipped`    | `UNKNOWN`      | a blank cell is not an error                                            |
| `SMOKE-DUPE`       | `uploaded`   | `IMAGE`        | `cached: true`, same `publicUrl` as `SMOKE-IMAGE`, no second download    |

Replace the two `REPLACE` Dropbox links with real share links. The shapes that
matter are `/scl/fi/` (a single file -> `FILE`) and `/scl/fo/` (a folder ->
`IMAGE_REPO`).

### 2. The SSRF guard on its own

The important property is that these come back *fast* and *clean*, not that the
request hangs until a timeout:

```bash
time curl -s -X POST "$FN_URL" \
  -H "Authorization: Bearer $JWT" -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "companySlug":"acme-lighting","luminaireType":"power-supplies","items":[
      {"productId":"S1","field":"productImage","url":"http://169.254.169.254/latest/meta-data/"},
      {"productId":"S2","field":"productImage","url":"http://metadata.google.internal/computeMetadata/v1/"},
      {"productId":"S3","field":"productImage","url":"http://127.0.0.1:54321/rest/v1/profiles"},
      {"productId":"S4","field":"productImage","url":"http://[::1]:8000/"},
      {"productId":"S5","field":"productImage","url":"file:///etc/passwd"},
      {"productId":"S6","field":"productImage","url":"http://10.0.0.1/internal"}
    ]}' | jq -r '.results[] | "\(.productId)\t\(.status)\t\(.error)"'
```

All six: `failed`, with `error` beginning `Blocked URL:`. Total wall time should
be well under a second — nothing opens a socket.

The guard also re-runs on **every redirect hop** (`redirect: 'manual'`, max 5
hops), so a public URL that 302s to `169.254.169.254` is blocked at the hop, not
followed.

### 3. Authorization

```bash
# No token -> 401
curl -s -o /dev/null -w '%{http_code}\n' -X POST "$FN_URL" \
  -H "Content-Type: application/json" -d '{"companySlug":"a","luminaireType":"b","items":[]}'

# Valid token for a NON-admin profile (Reu / Su / Eu / Gu) -> 403
curl -s -X POST "$FN_URL" \
  -H "Authorization: Bearer $NON_ADMIN_JWT" -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"companySlug":"a","luminaireType":"b","items":[]}'
# {"error":"Catalogue import requires an admin profile (SUPERADMIN, Sa, Au)"}
```

### 4. Confirm the object actually landed

```bash
curl -s -o /dev/null -w '%{http_code} %{content_type} %{size_download}\n' \
  "https://<project-ref>.supabase.co/storage/v1/object/public/leds/acme-lighting/power-supplies/SMOKE-IMAGE.png"
```

Expect `200 image/png <bytes>`.

### Cleaning up smoke-test objects

```bash
supabase storage rm -r "ss:///leds/acme-lighting/power-supplies" --experimental
```

Or delete the `acme-lighting/` prefix from the Studio storage browser (signed in
as an admin — that is what the new RLS policies in the migration are for; the
function itself writes with the service role and bypasses RLS).

---

## Behaviour reference

| Concern              | Value                                                                       |
| -------------------- | --------------------------------------------------------------------------- |
| Bucket               | `leds` (public), key `<company-slug>/<type-slug>/<productId><suffix><ext>`    |
| Field suffixes       | `productImage` → *(none)*, `specifications` → `-spec`, `installationInstructions` → `-install` |
| Size cap             | 50 MB, enforced by **streaming** and aborting — `Content-Length` is only a hint |
| Per-attempt timeout  | 30 s; per-item budget 75 s across all retries                                 |
| Retries              | 3 attempts, exponential backoff + jitter, honours `Retry-After`               |
| Retried              | `429`, `5xx`, network errors, timeouts                                        |
| **Not** retried      | `403`, `404`, every other `4xx`, blocked URLs, oversized bodies               |
| Redirects            | max 5, `redirect: 'manual'`, SSRF guard re-run on each hop                    |
| Batch concurrency    | 5 items in flight                                                             |
| Dedupe               | per-request map keyed on `normalizeUrl`; concurrent duplicates join one fetch |
| Upload               | `upsert: true`, real content type (remapped from the extension when the origin sends `application/octet-stream`) |

### Troubleshooting

- **`mime type ... is not supported`** — the migration has not been applied to
  this project. Run `supabase db push`.
- **Everything 403s from one vendor CDN** — the function already sends a
  browser-like `User-Agent`; some CDNs additionally require a `Referer`. Those
  items fail cleanly and land in the error report for manual handling.
- **`Unsupported content type "text/html"`** — the link resolves to a landing
  page, not the asset. Usually a share link that needs its raw-bytes rewrite
  added to `link-classifier.ts`.
