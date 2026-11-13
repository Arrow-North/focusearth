/** React DOM behavioral checks using jsdom and mocked service boundaries.
 * Install jsdom in a temporary tools directory and set JSDOM_MODULE to its
 * lib/api.js, or install it locally. No live Supabase/Dropbox account is used.
 */
import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const requireFromRepo = createRequire(import.meta.url);
const { JSDOM } = await import(process.env.JSDOM_MODULE || 'jsdom');
const repo = fileURLToPath(new URL('../', import.meta.url));
const work = await mkdtemp(join(tmpdir(), 'focusearth-ui-test-'));
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'https://test.example/catalogues/import' });
for (const key of ['window', 'document', 'Node', 'Element', 'DocumentFragment', 'MutationObserver', 'HTMLElement', 'HTMLInputElement', 'HTMLSelectElement', 'Event', 'CustomEvent', 'MouseEvent', 'FileReader', 'localStorage']) {
  Object.defineProperty(globalThis, key, { value: key === 'window' ? dom.window : dom.window[key], configurable: true });
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.IntersectionObserver = class {
  constructor(callback) { this.callback = callback; }
  observe(element) { queueMicrotask(() => this.callback([{ isIntersecting: true, target: element }])); }
  disconnect() {}
};
const harness = String.raw`
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import assert from 'node:assert/strict';
import CataloguePage from './src/pages/LEDCatalogueImport';
import ProductFilePage from './src/pages/CatalogueImport';
import { FileDropzone } from './src/components/shared/FileDropzone';

const requests = [];
const companyQueries = [];
let failD = true;
let probeCollection = false;
const downloads = [];
URL.createObjectURL = blob => { downloads.push(blob); return 'blob:test-download'; };
URL.revokeObjectURL = () => {};
window.HTMLAnchorElement.prototype.click = () => {};
let assertions = 0;
function check(value, message) { assert.ok(value, message); assertions++; }
const folder = 'https://www.dropbox.com/sh/shared/token';
const image = 'https://www.dropbox.com/s/good/photo.jpg';
const unavailable = 'https://www.dropbox.com/s/missing/photo.jpg';
const doc = 'https://www.dropbox.com/sh/documents/token';
const candidate = (id, name, mimeType) => ({ id, name, mimeType, size: 100 });
globalThis.__catalogueMock = {
  companies(filters) {
    companyQueries.push(filters);
    return { data: { rows: [{ id: 42, name: 'Test supplier' }], total_count: 26 }, isLoading: false };
  },
  async invoke(_name, { body }) {
    requests.push(body);
    if (_name === 'resolve-led-asset') return { data: { results: body.items.map(item => ({
      ...item, status: probeCollection && item.url === image ? 'image_repo' : 'uploaded',
      classification: probeCollection && item.url === image ? 'IMAGE_REPO' : 'IMAGE',
      publicUrl: probeCollection && item.url === image ? null : 'https://storage.example/direct/' + item.productId + '-' + item.field,
      httpStatus: 200, bytes: 100, cached: false, objectKey: 'direct', error: null,
    })) }, error: null };
    if (body.action === 'store-asset') return { data: { publicUrl: 'https://storage.example/leds/' + body.productId + '-' + body.field + '-' + body.candidateId, objectKey: body.productId + '-' + body.field + '-' + body.candidateId }, error: null };

    if (body.action === 'duplicates') return { data: { duplicates: body.rows.map(row => ({ rowId: row.rowId, matches: row.orderCode === 'A' ? [{ id: 17, updatedAt: '2026-11-12T00:00:00Z', details: { description: 'Existing fixture' } }] : [] })) }, error: null };
    if (body.action === 'thumbnail') return { data: { previewUrl: 'data:image/jpeg;base64,/9j/2Q==' }, error: null };
    if (body.action === 'discover') {
      if (body.url === unavailable) return { data: null, error: { message: 'Dropbox image is unavailable for import (HTTP 404).' } };
      if (body.url === folder) return { data: { sourceType: 'folder', candidates: body.kind === 'image' ? [candidate('img1', 'front.jpg', 'image/jpeg'), candidate('img2', 'back.png', 'image/png')] : [candidate('doc1', 'spec.pdf', 'application/pdf'), candidate('doc2', 'instructions.pdf', 'application/pdf')] }, error: null };
      if (body.url === doc) return { data: { sourceType: 'folder', candidates: [candidate('reference', 'reference.pdf', 'application/pdf'), candidate('other', 'other.pdf', 'application/pdf')] }, error: null };
      return { data: { sourceType: 'file', candidates: [body.kind === 'image' ? candidate('single-image', 'photo.jpg', 'image/jpeg') : candidate('single-doc', 'spec.pdf', 'application/pdf')] }, error: null };
    }
    if (body.action === 'commit') {
      if (body.orderCode === 'D' && failD) { failD = false; return { data: null, error: { message: 'Temporary storage failure' } }; }
      return { data: { status: body.decision === 'update' ? 'updated' : 'created' }, error: null };
    }
    throw new Error('Unexpected mock request: ' + body.action);
  },
};
const root = createRoot(document.getElementById('root'));
const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const findButton = text => Array.from(document.querySelectorAll('button')).find(element => element.textContent.trim() === text);
async function settle() { await act(async () => { await new Promise(resolve => setTimeout(resolve, 15)); }); }
async function click(element) { check(element && !element.disabled, 'click target must be enabled'); await act(async () => element.dispatchEvent(new MouseEvent('click', { bubbles: true }))); await settle(); }
async function change(element, value) {
  await act(async () => { element.value = value; element.dispatchEvent(new Event('change', { bubbles: true })); });
  await settle();
}
async function upload(element, file) {
  Object.defineProperty(element, 'files', { value: [file], configurable: true });
  await act(async () => element.dispatchEvent(new Event('change', { bubbles: true })));
  await settle();
}
const rowCard = code => Array.from(document.querySelectorAll('[id^="decision-"]')).find(element => element.closest('.rounded-lg')?.textContent.startsWith(code + ' '))?.closest('.rounded-lg');
const rowDecision = code => rowCard(code).querySelector('[id^="decision-"]');
const imageInput = code => rowCard(code).querySelector('input[type="file"]');
const fileSection = (code, label) => Array.from(rowCard(code).querySelectorAll('details')).find(element => element.querySelector('summary')?.textContent.startsWith(label));
async function choose(code, label, name) {
  const section = fileSection(code, label);
  const target = Array.from(section.querySelectorAll('button')).find(element => element.textContent.includes(name));
  await click(target);
}
const manualImage = () => new window.File([new Uint8Array([137,80,78,71,13,10,26,10])], 'manual.png', { type: 'image/png' });

export async function run() {
  try {
    await act(async () => root.render(<QueryClientProvider client={queryClient}><CataloguePage /></QueryClientProvider>));
    const fileInput = document.querySelector('[aria-label="Catalogue file"]');
    check(fileInput.disabled, 'CSV selection is disabled before supplier selection');
    check(fileInput.accept === '.csv', 'supplier catalogue picker accepts CSV files only');
    await click(findButton('More suppliers'));
    check(companyQueries.some(filters => filters.page === 2), 'supplier pagination requests the next page');
    await change(document.getElementById('supplier-company'), '42');
    check(!fileInput.disabled, 'CSV selection enables only after choosing supplier');
    await upload(fileInput, new File(['unsupported workbook'], 'Fixtures.xlsm'));
    check(document.body.textContent.includes('Only CSV files are supported'), 'Excel workbooks are explicitly rejected');
    check(requests.length === 0, 'unsupported uploads never reach duplicate lookup or import');
    const csv = [
      'FIXTURES,,,,,,', ',,,,,,',
      'Manufacturer,Order Code,Product Description,Specifications (hyperlink),Installation Instructions (hyperlink),Product Image (hyperlink),Notes',
      ['Maker','A','Duplicate fixture',folder,folder,folder,'All fields preserved'].join(','),
      ['Maker','B','Good fixture','','',image,''].join(','),
      ['Maker','C','Missing image fixture','','','',''].slice(0,7).join(','),
      ['Maker','D','Inaccessible image fixture',doc,'',unavailable,''].join(','),
    ].join('\n');
    await upload(fileInput, new File([csv], 'Fixtures.csv', { type: 'text/csv' }));
    check(document.body.textContent.includes('Supplier: Test supplier'), 'selected supplier remains visible in preview');
    check(requests.find(request => request.action === 'duplicates').companyId === 42, 'duplicate lookup is scoped to selected supplier');
    check(rowDecision('A').value === 'unresolved', 'duplicates require an explicit decision');
    check(findButton('Import reviewed products').disabled, 'unresolved image and duplicate rows block commit');
    check(rowCard('C').textContent.includes('not available for import'), 'missing images are called out');
    await click(findButton('Discover linked files'));
    check(rowCard('D').textContent.includes('Not available for import'), 'inaccessible images are called out');
    check(fileSection('A','Product Image').querySelectorAll('button:not([aria-label])').length === 2, 'image folders expose all candidates');
    check(fileSection('A','Specifications').querySelectorAll('button:not([aria-label])').length === 2, 'document folders expose all candidates');
    check(fileSection('B','Product Image').querySelector('[aria-pressed="true"]'), 'a single eligible image is selected automatically');
    check(document.querySelectorAll('img').length >= 2, 'image candidate thumbnails render');
    check(requests.filter(request => request.action === 'discover' && request.url === folder && request.kind === 'document').length === 1, 'repeated folder metadata is cached');
    await change(rowDecision('A'), 'update');
    check(rowCard('A').querySelector('[aria-label="Existing product for A"]').value === '17', 'single duplicate target is selected for explicit update');
    await choose('A', 'Specifications', 'spec.pdf');
    check(fileSection('A','Installation Instructions').querySelectorAll('[aria-pressed="true"]').length === 0, 'same folder in another field still requires its own choice');
    await choose('A', 'Installation Instructions', 'instructions.pdf');
    await choose('A', 'Product Image', 'back.png');
    await upload(imageInput('C'), new window.File(['bad'], 'bad.svg', { type: 'image/svg+xml' }));
    check(document.body.textContent.includes('Choose a JPEG'), 'unsupported manual images are rejected');
    check(findButton('Import reviewed products').disabled, 'invalid manual image cannot enable import');
    await upload(imageInput('C'), manualImage());
    check(!rowCard('C').textContent.includes('Product image is not available for import.'), 'manual image resolves missing-image warning');
    check(findButton('Import reviewed products').disabled, 'another row without an image still blocks import');
    await upload(imageInput('D'), manualImage());
    check(findButton('Import reviewed products').disabled, 'manual image does not bypass an unselected linked document');
    await choose('D', 'Specifications', 'reference.pdf');
    check(!findButton('Import reviewed products').disabled, 'manual fallback plus reviewed documents allows commit');
    await click(findButton('Import reviewed products'));
    const commits = requests.filter(request => request.action === 'commit');
    check(commits.length === 4, 'one request is sent per included row');
    check(commits.every(request => request.companyId === 42), 'every commit uses selected supplier');
    const a = commits.find(request => request.orderCode === 'A');
    check(a.decision === 'update' && a.existingProductId === 17, 'duplicate choice and target reach backend');
    assert.deepEqual(a.attachments, [{field:'productSpecifications',candidateId:'doc1'},{field:'installationInstructions',candidateId:'doc2'},{field:'productImage',candidateId:'img2'}]); assertions++;
    check(a.details.sourceValues.Notes === 'All fields preserved', 'parsed source values are preserved');
    const d = commits.find(request => request.orderCode === 'D');
    check(d.manualImage.name === 'manual.png' && Boolean(d.manualImage.base64), 'manual image is encoded for upload');
    check(d.attachments.length === 1 && d.attachments[0].field === 'productSpecifications', 'manual image override preserves required document selection');
    check(rowCard('D').textContent.includes('Temporary storage failure'), 'per-row failure remains visible');
    await click(findButton('Import reviewed products'));
    const retried = requests.filter(request => request.action === 'commit');
    check(retried.length === 5 && retried.at(-1).orderCode === 'D', 'retry reprocesses failures without repeating successes');
    check(retried.at(-1).importId === d.importId && retried.at(-1).rowId === d.rowId, 'retry preserves idempotency identity');
    check(document.body.textContent.includes('Created: 3 · Updated: 1 · Skipped: 0'), 'final summary reports actual outcomes');
    check(findButton('Import reviewed products').disabled, 'completed rows cannot be imported again');
    await click(findButton('Choose another file'));
    await upload(document.querySelector('[aria-label="Catalogue file"]'), new File([csv], 'Fixtures.csv', { type: 'text/csv' }));
    for (const code of ['A','B','C','D']) await change(rowDecision(code), 'skip');
    check(!findButton('Import reviewed products').disabled, 'explicit skip requires no image or file selections');
    const previousCount = requests.filter(request => request.action === 'commit').length;
    await click(findButton('Import reviewed products'));
    check(requests.filter(request => request.action === 'commit').length === previousCount, 'skipped rows never upload files or products');
    check(document.body.textContent.includes('Skipped: 4'), 'skip outcomes are summarized');
    await click(findButton('Choose another file'));
    await upload(document.querySelector('[aria-label="Catalogue file"]'), new File([csv], 'Fixtures.csv', { type: 'text/csv' }));
    for (const code of ['B','D']) await change(rowDecision(code), 'skip');
    await change(rowDecision('A'), 'update');
    check(findButton('Import reviewed products').disabled, 'missing image is still blocked until an explicit None choice');
    await click(Array.from(rowCard('C').querySelectorAll('button')).find(button => button.textContent === 'Continue without a product image'));
    await click(findButton('Discover linked files'));
    await choose('A', 'Product Image', 'front.jpg');
    for (const label of ['Specifications', 'Installation Instructions', 'Product Image']) await click(fileSection('A',label).querySelector('[aria-label^="None of these"]'));
    check(!fileSection('A','Product Image').querySelector('button:not([aria-label])[aria-pressed="true"]'), 'declining a selected image clears its old card selection');
    await click(Array.from(rowCard('A').querySelectorAll('button')).find(button => button.textContent.startsWith('Discover / refresh')));
    check(fileSection('A','Product Image').querySelector('[aria-label^="None of these"]').getAttribute('aria-pressed') === 'true', 'refresh preserves explicit None');
    check(!findButton('Import reviewed products').disabled, 'explicit None for each hyperlink permits an imageless product import');
    const beforeOmissions = requests.filter(request => request.action === 'commit').length;
    await click(findButton('Import reviewed products'));
    const omittedCommits = requests.filter(request => request.action === 'commit').slice(beforeOmissions);
    const omittedA = omittedCommits.find(request => request.orderCode === 'A');
    check(omittedA.attachments.length === 0 && !omittedA.manualImage, 'None choices send no attachments or manual image');
    assert.deepEqual(new Set(omittedA.omittedFields), new Set(['productSpecifications','installationInstructions','productImage'])); assertions++;
    check(omittedCommits.find(request => request.orderCode === 'C').omittedFields.includes('productImage'), 'missing-image omission is explicit in the backend payload');

    const accepted = [];
    await act(async () => root.render(<FileDropzone accept=".csv" acceptedFormatsLabel="CSV" multiple={false} maxSize={2 * 1024 * 1024} onFilesSelected={files => accepted.push(files)} />));
    const csvInput = document.querySelector('input[type="file"]');
    for (const type of ['text/csv', 'application/vnd.ms-excel', 'application/octet-stream', '']) {
      const before = accepted.length;
      await upload(csvInput, new File([csv], 'Fixtures-Table 1.csv', { type }));
      check(accepted.length === before + 1, 'CSV file picker accepts extension regardless of browser MIME: ' + type);
      check(!document.body.textContent.includes('unsupported type'), 'supported CSV has no type error');
    }
    const dropped = new Event('drop', { bubbles: true, cancelable: true });
    Object.defineProperty(dropped, 'dataTransfer', { value: { files: [new File([csv], 'Fixtures-Table 1.CSV')] } });
    await act(async () => csvInput.parentElement.dispatchEvent(dropped)); await settle();
    check(accepted.at(-1)[0].name.endsWith('.CSV'), 'drag and drop supports uppercase CSV extensions without MIME');
    const beforeInvalid = accepted.length;
    for (const name of ['Fixtures-Table 1.xlsm', 'Fixtures-Table 1.csv.exe']) {
      await upload(csvInput, new File([csv], name, { type: 'text/csv' }));
      check(accepted.length === beforeInvalid, 'CSV-only dropzone rejects unsupported filename even with CSV MIME');
      check(document.body.textContent.includes('unsupported type'), 'unsupported extension is called out');
    }
    const oversized = new File(['data'], 'Fixtures.csv', { type: 'text/csv' });
    Object.defineProperty(oversized, 'size', { value: 2 * 1024 * 1024 + 1 });
    await upload(csvInput, oversized);
    check(accepted.length === beforeInvalid && document.body.textContent.includes('exceeds maximum size'), 'CSV extension does not bypass size validation');
    check(document.body.textContent.includes('CSV up to 2MB'), 'CSV dropzone displays accurate accepted-format guidance');
    await act(async () => root.render(<FileDropzone onFilesSelected={files => accepted.push(files)} />));
    const defaultInput = document.querySelector('input[type="file"]');
    const beforeDefault = accepted.length;
    await upload(defaultInput, new File(['png'], 'photo.png', { type: 'image/png' }));
    await upload(defaultInput, new File(['pdf'], 'spec.pdf', { type: 'application/pdf' }));
    check(accepted.length === beforeDefault + 2, 'shared image and PDF upload behavior is preserved');
    await upload(defaultInput, new File(['csv'], 'Fixtures.csv', { type: 'text/csv' }));
    check(accepted.length === beforeDefault + 2, 'default image/PDF dropzone still rejects CSV');

    await act(async () => root.render(<QueryClientProvider client={queryClient}><ProductFilePage /></QueryClientProvider>));
    await click(findButton('Choose upload test company and type'));
    await click(findButton('Continue'));
    check(document.body.textContent.includes('Upload Product File'), 'actual product upload screen is mounted');
    const productInput = document.querySelector('input[type="file"]');
    check(productInput.accept === '.csv', 'Upload Product File restricts its picker to CSV');
    check(document.body.textContent.includes('CSV up to'), 'Upload Product File shows CSV guidance');
    await upload(productInput, new File([csv], 'Fixtures-Table 1.csv', { type: 'application/vnd.ms-excel' }));
    check(!document.body.textContent.includes('unsupported type'), 'reported CSV upload is not rejected by shared MIME validation');
    check(!document.body.textContent.includes('Upload Product File'), 'valid CSV advances the real page to column mapping');
    check(document.body.textContent.includes('7 columns detected') && document.body.textContent.includes(folder), 'column mapping shows parsed CSV headers and linked sample data');
    // Exercise independent choices in the CSV utility, including a repeated folder.
    await act(async () => root.render(<div />));
    await act(async () => root.render(<QueryClientProvider client={queryClient}><ProductFilePage /></QueryClientProvider>));
    await click(findButton('Choose upload test company and type')); await click(findButton('Continue'));
    const collectionCsv = ['Manufacturer,Order Code,Specifications,Installation Instructions,Product Image',
      ['Maker','L1',folder,folder,folder].join(','), ['Maker','L2','','',folder].join(',')].join('\n');
    await upload(document.querySelector('input[type="file"]'), new File([collectionCsv], 'Fixtures.csv', {type:'text/csv'}));
    await click(findButton('Preview')); await settle();
    const collection = key => document.querySelector('[data-repository-key="' + key + '"]');
    const selectLegacy = async (key, name) => click(Array.from(collection(key).querySelectorAll('button')).find(button => button.textContent.includes(name)));
    check(findButton('Start Import').disabled, 'collection fields block import while choices remain undecided');
    check(collection('0:productImage').querySelectorAll('img').length === 2, 'legacy image collection shows all image thumbnails');
    await selectLegacy('0:specifications','spec.pdf');
    await selectLegacy('0:installationInstructions','None of these');
    await selectLegacy('0:productImage','front.jpg');
    check(!collection('1:productImage').querySelector('button:not([aria-label])[aria-pressed="true"]'), 'same folder in another row has no implicit selection');
    await selectLegacy('1:productImage','back.png');
    check(!findButton('Start Import').disabled, 'all independent collection decisions enable import');
    const beforeRefresh = requests.filter(request => request.action === 'discover').length;
    await click(findButton('Refresh collection files'));
    check(requests.filter(request => request.action === 'discover').length === beforeRefresh + 2, 'refresh fetches fresh image and document listings while sharing metadata for repeated links');
    check(collection('0:installationInstructions').querySelector('[aria-label^="None of these"]').getAttribute('aria-pressed') === 'true', 'refresh preserves an explicit None choice');
    check(Array.from(collection('1:productImage').querySelectorAll('button')).some(button => button.textContent.includes('back.png') && button.getAttribute('aria-pressed') === 'true'), 'refresh preserves a still-valid selected image');
    const beforeStore = requests.filter(request => request.action === 'store-asset').length;
    await click(findButton('Start Import'));
    const stored = requests.filter(request => request.action === 'store-asset').slice(beforeStore);
    check(stored.length === 3, 'None does not download or store a file');
    check(stored.filter(request => request.field === 'productImage').map(request => request.candidateId).join(',') === 'img1,img2', 'reused folder retains distinct per-row selected images');
    check(stored.every(request => request.url === folder), 'stored selection is bound to its original hyperlink URL');
    await click(findButton('Download CSV'));
    const output = await downloads.at(-1).text();
    check(output.includes('img1') && output.includes('img2'), 'CSV output contains both independently selected image URLs');
    check(!output.includes('IMAGE_REPO') && !output.includes('FETCH_FAILED'), 'reviewed repository links are never emitted as failure or repo sentinels');

    // A URL classified as a file can still be discovered as a collection by the backend.
    await act(async () => root.render(<div />));
    await act(async () => root.render(<QueryClientProvider client={queryClient}><ProductFilePage /></QueryClientProvider>));
    await click(findButton('Choose upload test company and type')); await click(findButton('Continue'));
    probeCollection = true;
    await upload(document.querySelector('input[type="file"]'), new File(['Manufacturer,Order Code,Product Image\nMaker,L3,' + folder + '\nMaker,L4,' + image], 'Fixtures.csv', {type:'text/csv'}));
    await click(findButton('Preview')); await settle();
    await selectLegacy('0:productImage','back.png');
    const beforeProbeStore = requests.filter(request => request.action === 'store-asset').length;
    await click(findButton('Start Import')); await settle();
    check(Boolean(collection('1:productImage')), 'a runtime image_repo result returns the page to a per-hyperlink chooser');
    check(Array.from(collection('0:productImage').querySelectorAll('button')).some(button => button.textContent.includes('back.png') && button.getAttribute('aria-pressed') === 'true'), 'discovering a later collection preserves the previously selected image');
    check(requests.filter(request => request.action === 'store-asset').length === beforeProbeStore + 1, 'reviewed collection image is stored once before the later repository is found');
    await selectLegacy('1:productImage','None of these');
    const beforeLateStore = requests.filter(request => request.action === 'store-asset').length;
    await click(findButton('Start Import'));
    check(requests.filter(request => request.action === 'store-asset').length === beforeLateStore, 'declining a late-discovered repository does not store an asset or repeat prior successful uploads');
    await click(findButton('Download CSV'));
    const declinedOutput = await downloads.at(-1).text();
    check(!declinedOutput.includes('IMAGE_REPO') && !declinedOutput.includes('FETCH_FAILED'), 'explicit None leaves a blank resolved CSV field for late-discovered repositories');
    probeCollection = false;
    console.log('UI behavioral QA passed: ' + assertions + ' assertions (actual import pages, shared dropzone, hooks, and review components; mocked transport/configuration).');
  } finally { await act(async () => root.unmount()); queryClient.clear(); }
}
`;
try {
  await build({
    stdin: { contents: harness, resolveDir: repo, sourcefile: 'catalogue-ui-harness.tsx', loader: 'tsx' },
    outfile: join(work, 'harness.mjs'), bundle: true, platform: 'node', format: 'esm', jsx: 'automatic',
    define: { 'process.env.NODE_ENV': '"development"' },
    alias: { '@': resolve(repo, 'src') },
    banner: { js: "import { createRequire as __createRequire } from 'node:module';const require = __createRequire(import.meta.url);" },
    plugins: [{ name: 'mock-service-boundaries', setup(builder) {
      // Keep React's Node runtime intact so act() uses Node's task scheduler.
      builder.onResolve({ filter: /^(?:react|react-dom)(?:\/.*)?$/ }, args => ({ path: requireFromRepo.resolve(args.path), external: true }));
      builder.onResolve({ filter: /^@\/lib\/supabase$/ }, () => ({ path: 'supabase', namespace: 'mock' }));
      builder.onResolve({ filter: /^@\/hooks\/use-companies$/ }, () => ({ path: 'companies', namespace: 'mock' }));
      builder.onResolve({ filter: /^@\/components\/layout\/DashboardLayout$/ }, () => ({ path: 'layout', namespace: 'mock' }));
      builder.onResolve({ filter: /^\.\/ImportConfigStep$/ }, args => args.importer.endsWith('/components/catalogue-import/index.ts') ? { path: 'upload-config', namespace: 'mock' } : undefined);
      builder.onLoad({ filter: /.*/, namespace: 'mock' }, ({ path }) => ({ contents:
        path === 'supabase' ? 'export const supabase = { functions: { invoke: (...args) => globalThis.__catalogueMock.invoke(...args) } };' :
        path === 'companies' ? 'export function useCompanies(filters) { return globalThis.__catalogueMock.companies(filters); }' :
        path === 'upload-config' ? 'import React from "react"; export function ImportConfigStep(props) { return React.createElement("button", { onClick() { props.onCompanyChange(42, "Test supplier"); props.onLuminaireTypeChange("Fixtures"); } }, "Choose upload test company and type"); }' :
        'export function DashboardLayout({children}) { return children; }', loader: 'js' }));
    } }],
    logLevel: 'warning',
  });
  const { run } = await import(pathToFileURL(join(work, 'harness.mjs')).href);
  await run();
} finally { dom.window.close(); await rm(work, { recursive: true, force: true }); }
