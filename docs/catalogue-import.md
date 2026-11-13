# Supplier catalogue import

Super admins can open **Catalogues → Import → Supplier catalogue**, select a supplier company, and then choose its CSV file. Each file belongs to exactly one supplier. Company search and pagination support suppliers beyond the first page. This importer accepts only `.csv` files; export Excel workbooks to CSV before uploading. The separate **Resolve assets to CSV** utility remains available to admin roles at `/catalogues/import/products` and retains its own import contracts and processing flow.

CSV headers are detected by name rather than fixed column positions. The supplied template's two title rows, empty rows, and category-specific columns are handled. Manufacturer, order code, technical specifications, pricing tiers, compatibility fields, notes, and unknown columns are retained. Original cell labels and unmodified values are saved in `details.sourceValues`. UTF-8 CSV, quoted newlines, escaped quotes, and leading-zero order codes are supported. CSV cannot recover hyperlinks omitted by an exporting spreadsheet application: cells must contain their actual URL or a `HYPERLINK` formula exported as text. Excel files are rejected before parsing.

## Review and import

1. Select the supplier **before choosing the file**. No products or attachments are saved during parsing or preview.
2. Review each product. Existing catalogue records match by supplier, category, and trimmed case-insensitive order code. Choose **Update existing product** and its target or **Skip this row** for every duplicate. Multiple rows with the same key in the upload require skipping all but one. New products default to Create.
3. Click **Discover linked files** for all included rows, or discover/refresh a single row. Only public HTTPS Dropbox shared links (`/s/`, `/sh/`, `/scl/fi/`, `/scl/fo/`) are supported. Set access to **Anyone with the link**, remove passwords, and enable downloads. Links must open without signing in to Dropbox. Restricted links, other providers, and Dropbox web navigation URLs are reported as unavailable. Every hyperlink-bearing column is resolved separately, including specifications, installation instructions, IES files, and unknown attachment columns. Public access is checked during discovery and again for each selected file before its thumbnail or original is downloaded.
4. A single eligible file from a direct file link is selected automatically. Folders require a choice for each hyperlink, even when only one eligible file exists. Choose a file or **None of these** to leave that field empty. Nested folders and listing pagination are traversed. Image candidates display thumbnails when Dropbox supports previews. A failed thumbnail does not prevent choosing a valid file by name.
5. A missing, inaccessible, or ineligible image is explicitly unavailable for import. Select an eligible image, use **Upload a product image manually** to provide JPEG, PNG, GIF, or WebP, or explicitly choose **None of these**. If there is no image hyperlink, use **Continue without a product image**. These explicit choices allow importing the product without an image; an undecided image still blocks import. A manual image replaces only the image field; each linked document needs its own file selection or explicit None choice. Non-image source errors require correcting the file or skipping the row.
6. Inspect **Review all parsed fields**, then **Import reviewed products**. All included rows must pass review. Discovery and thumbnails do not save product records or attachments. Selected originals are downloaded and validated before their product is committed; declined files are not downloaded or saved. Per-row successes and errors remain visible. Retry pending failures without reimporting successful rows. Keep this page open through discovery/import; reviews are not persisted across page refreshes.

Updates merge imported details into the existing product and require the product's preview timestamp to remain current. A changed product or newly detected duplicate requires a new preview. Explicit None choices clear the corresponding product fields, including image aliases, and are recorded in `details.omittedAssets`. Existing storage objects are retained on update so previously issued file URLs continue to work.

## Resolve assets to CSV

At **Catalogues → Import → Resolve assets to CSV** (`/catalogues/import/products`), choose the company and product type, upload a CSV, map its asset columns, and open Preview. Collection hyperlinks show a separate chooser for each source row and field. Choosing **None of these** leaves the resolved output field empty, including product images. Reusing a folder URL does not reuse another row's selection. Start Import remains disabled until each collection has a selected file or an explicit None choice.

Public Dropbox collections are supported. Discovery lists eligible images or documents from nested folders, with image thumbnails when available. Unavailable links show an error with retry and None options. **Refresh collection files** fetches current listings and renews candidate tokens. Explicit None choices are retained; select a file again if its candidate token changes or the file becomes unavailable. Collection discovery and selected-file storage require an active super admin. Existing direct-file processing retains the utility's existing admin roles.

If a URL initially appears to be a file but the resolver reports a collection, the page returns to Preview for a choice. Earlier choices and successful uploads are preserved during that run. Selected collection files are stored in the `leds` bucket by the `catalogue-import` function's `store-asset` action. The CSV utility supports JPEG, PNG, GIF, WebP, and PDF collection candidates; the supplier importer supports the additional document types listed below.

## Backend setup

Install repository dependencies with Node 22 (verified with 22.23.0 and npm 10.9.8):

```sh
npm ci
```

Create a Dropbox API app and authorize a server-side API connection. Enable `sharing.read`, `files.metadata.read`, and `files.content.read`, and use offline authorization to obtain a refresh token. These backend credentials allow the application to enumerate public shared folders through the Dropbox API; suppliers do not need to invite that account to their files, and importing admins do not connect their own Dropbox accounts. Source links must be public, password-free, and downloadable. The importer rejects restricted links even when the backend account has access to them. See [Dropbox sharing](https://docs.dropboxapi.com/dropbox-api/docs/sharing), [file access](https://docs.dropboxapi.com/dropbox-api/docs/file-access), and [OAuth](https://developers.dropbox.com/oauth-guide).

Create an ignored `.env.catalogue-import.local` file (never put backend secrets in `VITE_*` variables):

```dotenv
DROPBOX_APP_KEY=your_dropbox_app_key
DROPBOX_APP_SECRET=your_dropbox_app_secret
DROPBOX_REFRESH_TOKEN=your_offline_refresh_token
CATALOGUE_IMPORT_SIGNING_SECRET=your_random_high_entropy_secret
```

`DROPBOX_ACCESS_TOKEN` can be used instead of the three refresh-token variables for temporary testing; access tokens can expire. Supabase supplies `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to the function. An explicit signing secret is recommended; otherwise the service-role key signs candidate tokens. Secret rotation invalidates outstanding selections.

After selecting the intended Supabase project, apply the migrations, set the secrets, and deploy the function:

```sh
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
supabase secrets set --env-file .env.catalogue-import.local
supabase functions deploy catalogue-import
```

These commands affect the selected project. The initial migration creates the `catalogue-assets` bucket and privileged import log/RPC. The follow-up migration `20261112010000_catalogue_import_explicit_none.sql` allows the backend to commit explicitly declined images while preserving role and duplicate checks. Apply that migration and redeploy `catalogue-import` together with the frontend update. Supplier attachments use `catalogue-assets`; the CSV utility uses the existing `leds` bucket. Both permit public reads, with these import writes handled by the backend service role. The function validates the caller's session and requires an enabled, nondeleted `SUPERADMIN`; its commit RPC is executable only by `service_role` and independently checks the actor and supplier. No client receives Dropbox or service-role credentials. See [Supabase function secrets](https://supabase.com/docs/guides/functions/secrets).

For local development, use the existing Supabase stack and serve the function with the same ignored env file:

```sh
supabase start
supabase db reset
supabase functions serve catalogue-import --env-file .env.catalogue-import.local
```

`db reset` resets the local database. Configure `.env.local` with that stack's URL and anon key, then run `npm run dev`. Seed or create an enabled super admin and a supplier company before testing.

## Limits and operational behavior

- Catalogue file: 20 MB, 10,000 product rows, 200 columns; one supplier per file.
- Image: 10 MB; document: 50 MB; JSON request: 16 MB. File contents are checked against their supported type.
- Supported document types: PDF, IES/text, CSV, DOC/DOCX, XLS/XLSX, ZIP, and supported raster images. Other types are ineligible and are not silently imported.
- Folder traversal aborts explicitly above 100 listing pages or 5,000 entries; no partial folder result is offered. Use a smaller folder if this happens. Dropbox/API timeouts and rate limits can require retrying discovery.
- Candidate selections are signed, bound to the signed-in admin, and valid for 24 hours. Refresh the row's discovery when expired or when Dropbox files change.
- Downloads use fixed Dropbox API hosts; user-supplied URLs are never fetched directly. Redirects are rejected. Download bytes are bounded and selected revision/size changes require rediscovery.
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

Live Dropbox discovery/download, deployed Supabase Storage writes, and a production browser session require configured credentials and deployment. Local mocked and embedded-database results do not certify those live operations. No native app or native toolchain upgrade is part of this web feature.
