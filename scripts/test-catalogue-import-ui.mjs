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
for (const key of ['window', 'document', 'HTMLElement', 'HTMLInputElement', 'HTMLSelectElement', 'Event', 'MouseEvent', 'FileReader']) {
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

const requests = [];
const companyQueries = [];
let failD = true;
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
    await click(findButton('More suppliers'));
    check(companyQueries.some(filters => filters.page === 2), 'supplier pagination requests the next page');
    await change(document.getElementById('supplier-company'), '42');
    check(!fileInput.disabled, 'CSV selection enables only after choosing supplier');
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
    check(fileSection('A','Product Image').querySelectorAll('button').length === 2, 'image folders expose all candidates');
    check(fileSection('A','Specifications').querySelectorAll('button').length === 2, 'document folders expose all candidates');
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
    console.log('UI behavioral QA passed: ' + assertions + ' assertions (actual page, hook, review components; mocked transport).');
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
      builder.onLoad({ filter: /.*/, namespace: 'mock' }, ({ path }) => ({ contents:
        path === 'supabase' ? 'export const supabase = { functions: { invoke: (...args) => globalThis.__catalogueMock.invoke(...args) } };' :
        path === 'companies' ? 'export function useCompanies(filters) { return globalThis.__catalogueMock.companies(filters); }' :
        'export function DashboardLayout({children}) { return children; }', loader: 'js' }));
    } }],
    logLevel: 'warning',
  });
  const { run } = await import(pathToFileURL(join(work, 'harness.mjs')).href);
  await run();
} finally { dom.window.close(); await rm(work, { recursive: true, force: true }); }
