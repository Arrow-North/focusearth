# Supplier catalogue import

Super admins can open **Catalogues → Import → Supplier catalogue**, select a supplier company, and then choose its CSV file. Each file belongs to exactly one supplier. Company search and pagination support suppliers beyond the first page. This importer accepts only `.csv` files; export Excel workbooks to CSV before uploading. The separate **Resolve assets to CSV** utility remains available to admin roles at `/catalogues/import/products` and retains its own import contracts and processing flow.

CSV headers are detected by name rather than fixed column positions. The supplied template's two title rows, empty rows, and category-specific columns are handled. Manufacturer, order code, technical specifications, pricing tiers, compatibility fields, notes, and unknown columns are retained. Original cell labels and unmodified values are saved in `details.sourceValues`. UTF-8 CSV, quoted newlines, escaped quotes, and leading-zero order codes are supported. CSV cannot recover hyperlinks omitted by an exporting spreadsheet application: cells must contain their actual URL or a `HYPERLINK` formula exported as text. Excel files are rejected before parsing.

## Review and import

1. Select the supplier **before choosing the file**. No products or attachments are saved during parsing or preview.
2. Review each product. Existing catalogue records match by supplier, category, and trimmed case-insensitive order code. Choose **Update existing product** and its target or **Skip this row** for every duplicate. Multiple rows with the same key in the upload require skipping all but one. New products default to Create.
3. Click **Discover linked files** for all included rows, or discover/refresh a single row. Only public HTTPS Dropbox shared links (`/s/`, `/sh/`, `/scl/fi/`, `/scl/fo/`) are supported. Set access to **Anyone with the link**, remove passwords, and enable downloads. Links must open without signing in to Dropbox. Restricted links, other providers, and Dropbox web navigation URLs are reported as unavailable. Every hyperlink-bearing column is resolved separately, including specifications, installation instructions, IES files, and unknown attachment columns. Public access is checked during discovery and again for each selected file before its thumbnail or original is downloaded.
4. A single eligible file is selected automatically. For a folder or link with multiple eligible files, choose one for that field. Nested folders and listing pagination are traversed. Image candidates display thumbnails when Dropbox supports previews. A failed thumbnail does not prevent choosing a valid file by name.
5. Product images are mandatory. A missing, inaccessible, or ineligible image is explicitly unavailable for import. Use **Upload a product image manually** to provide JPEG, PNG, GIF, or WebP instead, or skip the row. A manual image replaces only the image field; linked documents still require selections. Non-image source errors require correcting the file or skipping the row.
6. Inspect **Review all parsed fields**, then **Import reviewed products**. All included rows must pass review. Selected files are downloaded and validated before their product is committed. Per-row successes and errors remain visible. Retry pending failures without reimporting successful rows. Keep this page open through discovery/import; reviews are not persisted across page refreshes.

Updates merge imported details into the existing product and require the product's preview timestamp to remain current. A changed product or newly detected duplicate requires a new preview. Existing storage assets are retained on update so previously referenced file URLs continue to work.

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

After selecting the intended Supabase project, apply the migration, set the secrets, and deploy the function:

```sh
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
supabase secrets set --env-file .env.catalogue-import.local
supabase functions deploy catalogue-import
```

These commands affect the selected project. The migration creates the `catalogue-assets` bucket and privileged import log/RPC. The bucket permits public reads for product images/documents, with writes restricted to the backend service role. The function validates the caller's session and requires an enabled, nondeleted `SUPERADMIN`; its commit RPC is executable only by `service_role` and independently checks the actor and supplier. No client receives Dropbox or service-role credentials. See [Supabase function secrets](https://supabase.com/docs/guides/functions/secrets).

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

The SQL checks execute the migration against an embedded PostgreSQL instance using the test-only PGlite dependency. The UI checks mount the real import page, hook, and review components in jsdom with mocked transport. Both run after `npm ci` without a live Supabase project or Dropbox credentials.

Implementation verification on 2026-11-12 used Node 22.23.0, React 18.3.1, Vite 5.4.19, and `@supabase/supabase-js` 2.93.2. The reference fixture parsed 245 products (94 fixtures, 151 lamps), 241 Dropbox image sources, and four products requiring manual images. All 36 parser, review, handler, and support tests passed with the reference fixture, as did nine SQL runtime checks and 47 UI behavioral assertions. Build and targeted ESLint passed. Whole-repository TypeScript and ESLint already fail on the unchanged baseline (65 TypeScript diagnostics; 24 lint errors and 12 warnings); feature changes are checked against that baseline.

Live Dropbox discovery/download, deployed Supabase Storage writes, and a production browser session require configured credentials and deployment. Local mocked and embedded-database results do not certify those live operations. No native app or native toolchain upgrade is part of this web feature.

The public-link restriction was subsequently checked with regression tests for private/team links, login-required links, password protection, disabled downloads, and restricted children inside public folders. The updated suite passed 38 checks with its optional external-template check skipped; targeted ESLint and the production build also passed. Restricted files are rejected before downloading their contents or writing them to Storage.

Integration with the newer main branch preserves its asset-to-CSV importer and uses separate supplier hook/type modules. Merge verification passed all 39 supplier checks including the reference CSVs, nine SQL checks, 47 UI assertions, and the existing importer's 165 classifier checks, 53 parser checks, and output checks. The production build and targeted lint passed. TypeScript output is identical to the pulled main branch's baseline (78 diagnostics).

The supplier catalogue uploader is now CSV-only in both the file picker and parser. XLSM, XLSX, XLS, and other input formats are rejected before reading the file or calling the backend. Verification passed all 40 feature checks including the reference CSVs, 50 UI assertions, targeted lint, and the production build. Linked document attachments retain the supported formats listed above.
