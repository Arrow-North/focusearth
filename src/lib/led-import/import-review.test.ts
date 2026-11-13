import assert from 'node:assert/strict';
import { test } from 'node:test';
import { omittedFields, rowBlockers, validateManualImage, type RowReview } from './import-review';

function review(): RowReview {
  return { row: { id: 'Fixtures:4', rowNumber: 4, category: 'fixtures', orderCode: 'ABC', details: {}, sourceValues: {}, links: [], errors: [], imageIssue: 'No image.' }, matches: [], decision: 'create', links: {} };
}
const manual = new File(['image'], 'image.png', { type: 'image/png' });

test('missing image blocks import and a valid manual upload resolves it', () => {
  const row = review();
  assert.match(rowBlockers(row, [row]).join(' '), /image is not available/);
  row.manualImage = manual;
  assert.deepEqual(rowBlockers(row, [row]), []);
});
test('each hyperlink field needs discovery and explicit multi-file selection', () => {
  const row = review(); row.manualImage = manual;
  row.row.links = [{ id: 'spec', header: 'Specifications', detailKey: 'productSpecifications', url: 'https://dropbox.com/sh/folder', kind: 'document' }];
  assert.match(rowBlockers(row, [row]).join(' '), /discover/);
  row.links.spec = { discovered: true, candidates: [{ id: 'one', name: 'one.pdf', mimeType: 'application/pdf', size: 5 }, { id: 'two', name: 'two.pdf', mimeType: 'application/pdf', size: 5 }] };
  assert.match(rowBlockers(row, [row]).join(' '), /select a file/);
  row.links.spec.selectedId = 'two';
  assert.deepEqual(rowBlockers(row, [row]), []);
});
test('manual image overrides inaccessible image only, documents still block', () => {
  const row = review(); row.manualImage = manual;
  row.row.links = [{ id: 'image', header: 'Image', detailKey: 'productImage', url: 'https://dropbox.com/sh/folder', kind: 'image' }, { id: 'doc', header: 'IES', detailKey: 'iesFile', url: 'https://dropbox.com/sh/folder', kind: 'document' }];
  row.links.image = { discovered: true, candidates: [], error: 'Unavailable' };
  row.links.doc = { discovered: true, candidates: [], error: 'Unavailable' };
  assert.deepEqual(rowBlockers(row, [row]), ['IES: Unavailable']);
});
test('duplicate action and target must be decided before update', () => {
  const row = review(); row.manualImage = manual; row.decision = 'unresolved';
  assert.match(rowBlockers(row, [row]).join(' '), /existing catalogue record/);
  row.decision = 'update';
  assert.match(rowBlockers(row, [row]).join(' '), /existing product/);
  row.existingProductId = 1;
  assert.deepEqual(rowBlockers(row, [row]), []);
});
test('repeated order codes in the same file require skipping all but one', () => {
  const first = review(); first.manualImage = manual;
  const second = review(); second.row = { ...second.row, id: 'Fixtures:5', orderCode: ' abc ' }; second.manualImage = manual;
  assert.match(rowBlockers(first, [first, second]).join(' '), /repeats this order code/);
  second.decision = 'skip';
  assert.deepEqual(rowBlockers(first, [first, second]), []);
  assert.deepEqual(rowBlockers(second, [first, second]), []);
});
test('skip and successful outcomes do not block retrying pending rows', () => {
  const row = review(); row.decision = 'skip'; assert.deepEqual(rowBlockers(row, [row]), []);
  row.decision = 'create'; row.outcome = 'created'; assert.deepEqual(rowBlockers(row, [row]), []);
});
test('hard data errors remain after a manual image is supplied', () => {
  const row = review(); row.manualImage = manual; row.row.errors = ['Order Code is required.'];
  assert.deepEqual(rowBlockers(row, [row]), ['Order Code is required.']);
});
test('manual image rejects unsupported, empty and oversize files', () => {
  assert.equal(validateManualImage({ type: 'image/jpeg', size: 1024 }), undefined);
  assert.match(validateManualImage({ type: 'image/svg+xml', size: 1024 })!, /JPEG/);
  assert.match(validateManualImage({ type: 'image/png', size: 0 })!, /nonempty/);
  assert.match(validateManualImage({ type: 'image/png', size: 10 * 1024 * 1024 + 1 })!, /10 MB/);
});

test('a product without an image requires an explicit omission decision', () => {
  const row = review();
  assert.match(rowBlockers(row, [row]).join(' '), /explicitly continue without an image/);
  assert.deepEqual(omittedFields(row), []);
  row.imageOmitted = true;
  assert.deepEqual(rowBlockers(row, [row]), []);
  assert.deepEqual(omittedFields(row), ['productImage']);
});

test('declining one hyperlink does not decide another hyperlink using the same folder', () => {
  const row = review();
  row.row.links = [
    { id: 'spec', header: 'Specifications', detailKey: 'productSpecifications', url: 'https://dropbox.com/sh/folder', kind: 'document' },
    { id: 'image', header: 'Product Image', detailKey: 'productImage', url: 'https://dropbox.com/sh/folder', kind: 'image' },
  ];
  row.links.spec = { discovered: true, candidates: [], declined: true };
  row.links.image = { discovered: true, candidates: [{ id: 'one', name: 'one.jpg', mimeType: 'image/jpeg', size: 5 }], sourceType: 'folder' };
  assert.match(rowBlockers(row, [row]).join(' '), /Product Image: select a file or choose None/);
  assert.deepEqual(omittedFields(row), ['productSpecifications']);
  row.links.image.declined = true;
  row.imageOmitted = true;
  assert.deepEqual(rowBlockers(row, [row]), []);
  assert.deepEqual(omittedFields(row), ['productSpecifications', 'productImage']);
});

test('an unavailable linked file is omitted only after an explicit None decision', () => {
  const row = review(); row.imageOmitted = true;
  row.row.links = [{ id: 'spec', header: 'Specifications', detailKey: 'productSpecifications', url: 'https://dropbox.com/sh/folder', kind: 'document' }];
  row.links.spec = { discovered: true, candidates: [], error: 'No eligible files' };
  assert.deepEqual(rowBlockers(row, [row]), ['Specifications: No eligible files']);
  row.links.spec.declined = true;
  assert.deepEqual(rowBlockers(row, [row]), []);
  assert.deepEqual(omittedFields(row), ['productSpecifications', 'productImage']);
});

test('a manual image overrides an earlier image omission but preserves declined documents', () => {
  const row = review(); row.imageOmitted = true; row.manualImage = manual;
  row.row.links = [
    { id: 'spec', header: 'Specifications', detailKey: 'productSpecifications', url: 'https://dropbox.com/sh/folder', kind: 'document' },
    { id: 'image', header: 'Product Image', detailKey: 'productImage', url: 'https://dropbox.com/sh/folder', kind: 'image' },
  ];
  row.links.spec = { discovered: true, candidates: [], declined: true };
  row.links.image = { discovered: true, candidates: [], declined: true };
  assert.deepEqual(omittedFields(row), ['productSpecifications']);
  assert.deepEqual(rowBlockers(row, [row]), []);
});

test('omitting an image never resolves unrelated product validation errors', () => {
  const row = review(); row.imageOmitted = true; row.row.errors = ['Order Code is required.'];
  assert.deepEqual(rowBlockers(row, [row]), ['Order Code is required.']);
});
