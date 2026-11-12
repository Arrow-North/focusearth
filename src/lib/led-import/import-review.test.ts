import assert from 'node:assert/strict';
import { test } from 'node:test';
import { rowBlockers, validateManualImage, type RowReview } from './import-review';

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
