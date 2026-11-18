# Supplier catalogue import

Super admins can open **Catalogues → Import → Supplier catalogue**, select a supplier company, and then choose its CSV file. Each file belongs to exactly one supplier. Company search and pagination support suppliers beyond the first page. This importer accepts only `.csv` files; export Excel workbooks to CSV before uploading. The separate **Resolve assets to CSV** utility remains available to admin roles at `/catalogues/import/products` and retains its own import contracts and processing flow.

CSV headers are detected by name rather than fixed column positions. The supplied template's two title rows, empty rows, and category-specific columns are handled. Manufacturer, order code, technical specifications, pricing tiers, compatibility fields, notes, and unknown columns are retained. Original cell labels and unmodified values are saved in `details.sourceValues`. UTF-8 CSV, quoted newlines, escaped quotes, and leading-zero order codes are supported. CSV cannot recover hyperlinks omitted by an exporting spreadsheet application: cells must contain their actual URL or a `HYPERLINK` formula exported as text. Excel files are rejected before parsing.

## Review and import

1. Select the supplier **before choosing the file**. No products or attachments are saved during parsing or preview.
2. Review each product. Existing catalogue records match by supplier, category, and trimmed case-insensitive order code. Choose **Update existing product** and its target or **Skip this row** for every duplicate. Multiple rows with the same key in the upload require skipping all but one. New products default to Create.
3. Click **Discover linked files** for all included rows, or discover/refresh a single row. Only public HTTPS Dropbox shared links (`/s/`, `/sh/`, `/scl/fi/`, `/scl/fo/`) are supported. Set access to **Anyone with the link**, remove passwords, and enable downloads. Links must be downloadable without signing in to Dropbox. Restricted links, other providers, and Dropbox web navigation URLs are reported as unavailable. Every hyperlink-bearing column is resolved separately, including specifications, installation instructions, IES files, and unknown attachment columns. Dropbox API credentials are optional: without them, the backend downloads public files or reads the shared folder's ZIP download. Public downloads never send Dropbox credentials or cookies. Selected downloads must still be publicly accessible at preview/import time.
4. A single eligible file from a direct file link is selected automatically. Folders require a choice for each hyperlink, even when only one eligible file exists. Choose a file or **None of these** to leave that field empty. Loaded choices are available while other folders are still being discovered; there is no need to wait for the whole CSV. Import stays disabled until discovery finishes and all included rows pass review. Nested folders and listing pagination are traversed. Image candidates display thumbnails when Dropbox supports previews. A failed thumbnail does not prevent choosing a valid file by name.
5. A missing, inaccessible, or ineligible image is explicitly unavailable for import. Select an eligible image, use **Upload a product image manually** to provide JPEG, PNG, GIF, or WebP, or explicitly choose **None of these**. If there is no image hyperlink, use **Continue without a product image**. These explicit choices allow importing the product without an image; an undecided image still blocks import. A manual image replaces only the image field; each linked document needs its own file selection or explicit None choice. Non-image source errors require correcting the file or skipping the row.
6. Inspect **Review all parsed fields**, then **Import reviewed products**. All included rows must pass review. Discovery and thumbnails do not save product records or attachments. Selected originals are validated before their product is committed; declined files are not saved. Without API credentials, discovery downloads the public folder ZIP, which can contain files you later decline. Per-row successes and errors remain visible. Retry pending failures without reimporting successful rows. Keep this page open through discovery/import; reviews are not persisted across page refreshes.

Updates merge imported details into the existing product and require the product's preview timestamp to remain current. A changed product or newly detected duplicate requires a new preview. Explicit None choices clear the corresponding product fields, including image aliases, and are recorded in `details.omittedAssets`. Existing storage objects are retained on update so previously issued file URLs continue to work.

Each uploaded CSV has a shared in-memory cache for discovery and image previews. A hyperlink reused across products or across specifications, installation instructions and product image columns is discovered once; image fields filter that shared listing to supported images up to 10 MB. Preview cards share both pending and completed image requests, including after paging away and back. File selections and None choices remain independent for each row and field. Presentation-only Dropbox options (`dl`, `raw`, `subfolder_nav_tracking`, fragments) do not create duplicate cache entries; access keys and nested paths are preserved.

**Refresh collection files**, **Retry discovery**, and a supplier row's **Discover / refresh** bypass the affected cached listing and previews. A supplier row refresh fetches each distinct link once even when all three columns reuse it. Failed requests are evicted so retry can recover. Cache entries renew after 23 hours, before candidate token expiry. Retained previews have a 64 MB memory budget with least recently used eviction; an evicted preview can be fetched again. Choosing a new file, resetting the importer, changing the CSV utility's source/configuration/mapping, or leaving the page clears the cache. Selected originals still undergo the backend's public-access, content and revision checks before being saved.

## Resolve assets to CSV

At **Catalogues → Import → Resolve assets to CSV** (`/catalogues/import/products`), choose the company and product type, upload a CSV, map its asset columns, and open Preview. Collection hyperlinks show a separate chooser for each source row and field. Files can be selected as soon as their candidates load, while other folders continue loading. **None of these** can also be chosen before a folder finishes discovery; the choice is preserved when its results arrive. This leaves the resolved output field empty, including product images. Reusing a folder URL does not reuse another row's selection. Start Import remains disabled until discovery finishes and each collection has a selected file or an explicit None choice. Choices are locked during import.

**Column fill rate** measures populated source cells across every parsed data row, excluding headers and fully empty rows. Text labels and hyperlink targets with empty display labels count as filled; a separate count reports detected links and filled cells without a link. Literal `HYPERLINK` formulas in CSV or Excel are recognized without evaluating formulas. Repeated URLs count for every source row, independently of request caching. File selections and explicit None choices do not change the source fill rate. Percentages retain up to two decimal places so small nonzero rates are visible; unmapped fields are labeled separately.

Public Dropbox collections are supported without Dropbox API credentials. Discovery lists eligible images or documents from nested folders, with image previews when available. Without API credentials, images up to 1 MB use their original bytes for previews; larger images remain selectable by name. Unavailable links show an error with retry and None options. **Refresh collection files** fetches current listings and renews candidate tokens. Explicit None choices are retained; select a file again if its candidate token changes or the file becomes unavailable. Collection discovery and selected-file storage require an active super admin. Existing direct-file processing retains the utility's existing admin roles.

If a URL initially appears to be a file but the resolver reports a collection, the page returns to Preview for a choice. Earlier choices and successful uploads are preserved during that run. Selected collection files are stored in the `leds` bucket by the `catalogue-import` function's `store-asset` action. The CSV utility supports JPEG, PNG, GIF, WebP, and PDF collection candidates; the supplier importer supports the additional document types listed below.

## Backend setup

Install repository dependencies with Node 22 (verified with 22.23.0 and npm 10.9.8):

```sh
npm ci
```

Deploy `catalogue-import` to enable public Dropbox imports. No Dropbox app, access token, app key, app secret, or refresh token is required for public downloads. The backend uses Dropbox's documented [`dl=1` download behavior](https://help.dropbox.com/share/force-download), follows only HTTPS redirects within Dropbox's download hosts, and reads nested files from folder ZIPs in memory. Public folder downloads are limited to 50 MB compressed and 5,000 entries. Share a smaller folder or direct file link when necessary. Login, password, access-denied and download-disabled pages are reported as unavailable, including when Dropbox returns HTML with HTTP 200. Public visibility alone is insufficient when downloads are disabled.

An optional server-side Dropbox API connection retains metadata-only discovery and API thumbnails, and supports larger collections within the existing per-file and listing limits. To enable it, create a Dropbox API app, enable `sharing.read`, `files.metadata.read`, and `files.content.read`, and use offline authorization to obtain a refresh token. Suppliers do not need to invite that account to their files, and importing admins do not connect their own Dropbox accounts. The importer still rejects restricted links even when the backend account has access to them. See [Dropbox sharing](https://docs.dropboxapi.com/dropbox-api/docs/sharing), [file access](https://docs.dropboxapi.com/dropbox-api/docs/file-access), and [OAuth](https://developers.dropbox.com/oauth-guide).

For the optional API connection, create an ignored `.env.catalogue-import.local` file (never put backend secrets in `VITE_*` variables):

```dotenv
DROPBOX_APP_KEY=your_dropbox_app_key
DROPBOX_APP_SECRET=your_dropbox_app_secret
DROPBOX_REFRESH_TOKEN=your_offline_refresh_token
CATALOGUE_IMPORT_SIGNING_SECRET=your_random_high_entropy_secret
```

`DROPBOX_ACCESS_TOKEN` can be used instead of the three refresh-token variables for temporary testing; access tokens can expire. Supabase supplies `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to the function. An explicit signing secret is recommended; otherwise the service-role key signs candidate tokens. Secret rotation invalidates outstanding selections.

After selecting the intended Supabase project, apply the migrations and deploy the function:

```sh
supabase link --project-ref YOUR_PROJECT_REF
supabase db push --remote
supabase functions deploy catalogue-import
```

Set `supabase secrets set --env-file .env.catalogue-import.local` only if using the optional API connection or an explicit signing secret. A complete refresh-token configuration or `DROPBOX_ACCESS_TOKEN` selects the API path; absent or incomplete API credentials select anonymous public downloads. Existing API selections remain bound to their original transport; refresh discovery after changing the backend connection mode.

These commands affect the selected project. The initial migration creates the `catalogue-assets` bucket and privileged import log/RPC. The follow-up migration `20261112010000_catalogue_import_explicit_none.sql` allows the backend to commit explicitly declined images while preserving role and duplicate checks. Apply that migration and redeploy `catalogue-import` together with the frontend update. Supplier attachments use `catalogue-assets`; the CSV utility uses the existing `leds` bucket. Both permit public reads, with these import writes handled by the backend service role. The function validates the caller's session and requires an enabled, nondeleted `SUPERADMIN`; its commit RPC is executable only by `service_role` and independently checks the actor and supplier. No client receives Dropbox or service-role credentials. See [Supabase function secrets](https://supabase.com/docs/guides/functions/secrets).

### Discovery cannot reach the Edge Function

**Failed to send a request to the Edge Function** (or **Could not reach the catalogue-import backend**) means the browser could not complete its request to Supabase. Dropbox availability has not been established. Check the browser connection, the frontend's `VITE_SUPABASE_URL`, and whether `catalogue-import` is deployed to that same project. In the browser Network panel, inspect the `OPTIONS` and `POST` requests to `/functions/v1/catalogue-import`. The preflight must succeed and allow `authorization`, `x-client-info`, `apikey`, and `content-type`; the function includes those CORS headers on handled responses. See [Supabase browser CORS guidance](https://supabase.com/docs/guides/functions/cors).

Cloudflare frontend deployment does not deploy Supabase functions. Verify that **Deploy Supabase Functions** completed in the production GitHub Actions workflow. With Supabase CLI 3, migration commands need `--remote` even after linking; a failed migration step prevents function deployment. Once the backend is deployed, click **Retry discovery** or **Refresh collection files**. Public downloads require no Dropbox secrets. Errors about optional API credentials, permissions, or missing files are returned separately by the backend.

For local development, use the existing Supabase stack and serve the function (add `--env-file .env.catalogue-import.local` only for optional secrets):

```sh
supabase start
supabase db reset
supabase functions serve catalogue-import
```

`db reset` resets the local database. Configure `.env.local` with that stack's URL and anon key, then run `npm run dev`. Seed or create an enabled super admin and a supplier company before testing.

## Limits and operational behavior

- Catalogue file: 20 MB, 10,000 product rows, 200 columns; one supplier per file.
- Image: 10 MB; document: 50 MB; JSON request: 16 MB. File contents are checked against their supported type.
- Supported document types: PDF, IES/text, CSV, DOC/DOCX, XLS/XLSX, ZIP, and supported raster images. Other types are ineligible and are not silently imported.
- Folder traversal aborts explicitly above 100 listing pages or 5,000 entries; no partial folder result is offered. Use a smaller folder if this happens. Dropbox/API timeouts and rate limits can require retrying discovery.
- Anonymous folder discovery downloads a ZIP of at most 50 MB, enumerates nested eligible files without extracting them to disk, and decompresses only a selected file for preview/import. Nested source URLs restrict choices to their requested subtree if Dropbox returns the parent collection. The 50 MB limit applies to the entire downloaded bundle; share a smaller folder independently or use a direct file link if Dropbox returns a larger parent ZIP. Each decompressed file is bounded by its declared size and the image/document limit. Encrypted, multidisk, ZIP64, corrupt, duplicate-path and unsafe-path archives are rejected explicitly. Public direct file downloads also have a 50 MB response limit.
- Candidate selections are signed, bound to the signed-in admin, and valid for 24 hours. Refresh the row's discovery when expired or when Dropbox files change.
- API downloads use fixed Dropbox API hosts and reject redirects. Anonymous downloads accept only validated shared links and follow at most five redirects, validating HTTPS Dropbox hosts at every hop without sending authentication or cookies. Download bytes are bounded. Selected API revision/size changes require rediscovery; anonymous selections bind the file or ZIP entry's SHA-256 hash and size and are checked again before preview/import.
- Row commits are atomic in PostgreSQL; storage and PostgreSQL cannot share one transaction. Confirmed failures remove newly uploaded assets. Ambiguous network failures preserve assets to avoid deleting files referenced by a successful commit. Retry in the same review first. `catalogue_import_rows.result.assetPaths` and `product.details.importedAssets` record referenced paths for reconciliation; rare orphan files may need maintenance after interrupted requests. This version does not run automatic storage garbage collection.

## Verification

Frontend and pure/helper tests run without production credentials. The external catalogue fixture is optional and is not copied into the repository:

```sh
npm run test:catalogue-import
CATALOGUE_TEMPLATE_DIR='/path/to/Focus Earth Catalogue Upload Template - Q4 2025 (Euri Revised 11.13' npm run test:catalogue-import
npm run test:catalogue-import:sql
npm run test:catalogue-import:ui
npm run build
```

The SQL checks execute both supplier import migrations against an embedded PostgreSQL instance using the test-only PGlite dependency. The UI checks mount both real import pages, hooks, review components, and the shared upload component in jsdom with mocked transport and configuration selectors. Both run after `npm ci` without a live Supabase project or Dropbox credentials.

Verification on 2026-11-13 used Node 22.23.0, React 18.3.1, Vite 5.4.19, and `@supabase/supabase-js` 2.93.2. The reference fixture parsed 245 products (94 fixtures, 151 lamps), 241 Dropbox image sources, and four products without an image link that require a manual image or an explicit omission decision. All 50 parser, review, handler, and support tests passed with the reference fixture, as did 11 SQL runtime checks. SQL checks include explicit None insertion, replay, clearing existing image aliases on update, and rejection of missing or malformed omission decisions.

All 126 UI behavioral assertions passed, covering per-hyperlink image/document choices, repeated folders with independent selections, explicit None, missing images, manual uploads, fresh listings on refresh, preserved choices after discovery, and CSV-only file intake. Legacy CSV utility verification also passed 165 classifier checks, 53 parser checks, and output assertions. Production build and targeted ESLint passed. TypeScript output matches the unchanged main branch baseline exactly (78 diagnostics).

On 2026-11-15, transport-failure guidance and recovery were verified with 130 passing UI assertions, the production build, and targeted ESLint. The UI distinguishes an unreachable Edge Function from a Dropbox error and supports retrying discovery once connectivity is restored.

On 2026-11-15, anonymous Dropbox discovery, image previews, asset-to-CSV storage and supplier commits were verified without Dropbox credentials in the handler harness. All 61 available parser/review/handler/support checks passed; the external reference-template test was skipped because its fixture was not supplied. The 130 UI assertions, production build, targeted ESLint and standalone TypeScript check for the public-download module also passed. Regression checks cover direct files, nested stored/deflated folder ZIPs, field-specific eligibility, subtree filtering, redirects, revoked access, same-size file replacements, invalid/oversized archives and decompression limits. The supplied `EA19-5W5021cec-2` link was also requested anonymously: Dropbox redirected its legacy shared URL to `/scl/fo/` and returned an HTTP 200 HTML page whose resolution was `shared_link_no_access`. This live response confirms an access failure for that URL at verification time; it does not verify a successful live Dropbox import.

The follow-up Row 8 check on 2026-11-15 identified Dropbox's empty, stored `/` root directory marker, which the original path guard rejected. That exact marker is now accepted and excluded from candidates; absolute file paths and nonempty or compressed `/` entries remain rejected. Regression fixtures include the root marker and streamed file data descriptors. All 62 available parser/review/handler/support checks passed (one external-template fixture skipped), along with targeted ESLint and standalone TypeScript checks. Live anonymous discovery of the supplied `EA19-5020cec` link found 12 eligible files in its 4,073,911-byte ZIP. The importer then downloaded and validated `EURI Lighting - SSEA19-5020cec.pdf` (383,732 bytes) without Dropbox API credentials or storage writes.

On 2026-11-18, the file chooser was updated to remain usable during background discovery in both importers. The UI suite now passes 160 assertions, including deliberately stalled later-folder requests, file/image/None choices while loading, preservation of those choices when discovery completes, import staying disabled until discovery finishes, and choices locking during product writes. The existing parser/review/handler/support suite, targeted ESLint and production build also passed with Node 22.23.0. This is a frontend change; deploy the frontend and reload the importer to use it. No Edge Function redeployment is required for this chooser fix.

The subsequent upload-cache update on 2026-11-18 passed 72 unit/handler checks (one external-template fixture skipped), 179 UI assertions, targeted ESLint and the production build with Node 22.23.0. Ten focused cache tests cover shared pending listings/previews, image eligibility, normalized presentation parameters, isolated uploads, failure and malformed-response recovery, refresh, late request completion, preview eviction and token expiry. The real-page UI harness confirms that six fields sharing the same link across two rows and three columns make one discovery request and two unique image-preview requests, with no extra requests after pagination. It also checks independent choices and one request per distinct URL on supplier row refresh. These checks use mocked transport; original backend access/revision validation remains unchanged. This cache update requires only frontend deployment.

The column-coverage correction on 2026-11-18 passed 58 parser/coverage fixture checks, 165 classifier checks, all output fixtures, 72 unit/handler checks (one external-template fixture skipped), 193 UI assertions, targeted ESLint and the production build with Node 22.23.0. Coverage fixtures include repeated URLs, whitespace, plain labels, numeric zero text, formula links, Excel links with blank display labels, unmapped fields, and data beyond the ten-row preview. UI checks confirm exact counts, separate detected-link counts, fractional percentages and source fill rates remaining stable after None choices. This update requires only frontend deployment.

The live check verifies anonymous discovery and PDF download only. Deployed Supabase Storage writes and a production browser session remain unverified; local mocked and embedded-database results do not certify those operations. No native app or native toolchain upgrade is part of this web feature.
