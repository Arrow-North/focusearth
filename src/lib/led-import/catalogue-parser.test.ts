import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { isDropboxUrl, parseCatalogueCsv, parseCatalogueFile, readCatalogueCsv } from './catalogue-parser';

const fileLink = 'https://www.dropbox.com/scl/fi/abc/product.png?rlkey=example&dl=0';
const folderLink = 'https://www.dropbox.com/sh/abc/def?dl=0';
const csv = (rows: string[][]) => rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\r\n');

test('CSV parser preserves quotes, embedded newlines, BOM, identifiers, and empty cells', () => {
  assert.deepEqual(readCatalogueCsv('\uFEFF"SKU","Description","Price"\r\n"00012","A ""quoted""\nline","3.00"\r\n,,\r\n'), [
    ['SKU', 'Description', 'Price'], ['00012', 'A "quoted"\nline', '3.00'], ['', '', ''],
  ]);
  assert.throws(() => readCatalogueCsv('"unterminated'), /unterminated/);
  assert.throws(() => readCatalogueCsv('"one"junk,two'), /Unexpected text/);
});

test('headers are discovered by name and all known and unknown fields are retained', () => {
  const parsed = parseCatalogueCsv(csv([
    ['LAMPS'], ['DIMENSIONS'],
    ['Product Image (hyperlink)', 'Order Code', 'Manufacturer', 'Product Description', 'Lifetime (hours)', 'Custom field', 'Notes'],
    [fileLink, '00012', 'Euri', 'A bulb', '25,000 ', 'special', 'line one\nline two'],
    ['', ' ', '', '', '', '', ''],
  ]), 'Lamps-Table 1.csv');
  assert.equal(parsed.category, 'lamp');
  assert.equal(parsed.rows.length, 1);
  const row = parsed.rows[0];
  assert.equal(row.rowNumber, 4);
  assert.equal(row.orderCode, '00012');
  assert.equal(row.details.description, 'A bulb');
  assert.equal(row.details.lifetime, '25,000');
  assert.equal(row.details.sourceField_customfield, 'special');
  assert.equal(row.sourceValues['Lifetime (hours)'], '25,000 ');
  assert.equal(row.links[0].detailKey, 'productImage');
  assert.equal(row.imageIssue, undefined);
  assert.deepEqual(row.errors, []);
});

test('all linked fields are identified, including custom and formula fields', () => {
  const result = parseCatalogueCsv(csv([
    ['Manufacturer', 'Order Code', 'Specifications (hyperlink)', 'Installation Instructions (hyperlink)', 'Product Image (hyperlink)', 'IES File (hyperlink)', 'Other attachment'],
    ['Euri', 'ABC', folderLink, fileLink, `=HYPERLINK("${fileLink}","Image")`, fileLink, fileLink],
  ]), 'Fixtures.csv');
  assert.deepEqual(result.rows[0].links.map(link => link.detailKey), [
    'productSpecifications', 'installationInstructions', 'productImage', 'iesFile', 'sourceField_otherattachment',
  ]);
  assert.equal(result.rows[0].links.filter(link => link.kind === 'image').length, 1);
});

test('missing or unsupported image is remediable, unsupported documents and absent identity are hard errors', () => {
  const parsed = parseCatalogueCsv(csv([
    ['Manufacturer', 'Order Code', 'Product Image (hyperlink)', 'Specifications (hyperlink)'],
    ['Euri', 'A', '', ''],
    ['Euri', 'B', 'https://example.com/image.png', 'https://example.com/spec.pdf'],
    ['Euri', '', fileLink, ''],
  ]), 'Controls.csv');
  assert.match(parsed.rows[0].imageIssue!, /not available for import/);
  assert.deepEqual(parsed.rows[0].errors, []);
  assert.match(parsed.rows[1].imageIssue!, /Upload an image manually/);
  assert.equal(parsed.rows[1].errors.length, 1);
  assert.match(parsed.rows[1].errors[0], /Specifications/);
  assert.deepEqual(parsed.rows[2].errors, ['Order Code is required.']);
});

test('only exact HTTPS Dropbox hosts are accepted', () => {
  assert.equal(isDropboxUrl(fileLink), true);
  assert.equal(isDropboxUrl('https://dropbox.com/s/abc/file.pdf'), true);
  for (const value of ['http://www.dropbox.com/file', 'https://dropbox.com.evil.com/file', 'https://www.dropbox.com@evil.com/file', 'https://evil.com/file', 'https://user:secret@dropbox.com/file', 'https://dropbox.com:123/file', 'https://dl.dropboxusercontent.com/s/abc/file.png', 'https://www.dropbox.com/home/photos', 'https://www.dropbox.com/']) {
    assert.equal(isDropboxUrl(value), false, value);
  }
});

test('ambiguous image URLs can be replaced manually without blocking the product identity', () => {
  const parsed = parseCatalogueCsv(csv([
    ['Manufacturer', 'Order Code', 'Product Image (hyperlink)'],
    ['Euri', 'A', `${fileLink}\n${folderLink}`],
  ]), 'Fixtures.csv');
  assert.match(parsed.rows[0].imageIssue!, /multiple URLs/);
  assert.deepEqual(parsed.rows[0].errors, []);
  assert.deepEqual(parsed.rows[0].links, []);
});

test('empty product templates are valid and duplicate column names are rejected', () => {
  assert.equal(parseCatalogueCsv('POWER SUPPLIES\nDIMENSIONS\nManufacturer,Order Code,Product Image (hyperlink)\n, ,', 'Power Supplies.csv').rows.length, 0);
  assert.throws(() => parseCatalogueCsv('Manufacturer,Order Code,Order Code\nEuri,A,B', 'Fixtures.csv'), /duplicate column/);
  assert.throws(() => parseCatalogueCsv('Manufacturer,Description\nEuri,A', 'Fixtures.csv'), /header row/);
});

test('preview flags overlong order codes and long filenames cannot overflow row IDs', () => {
  const parsed = parseCatalogueCsv(csv([
    ['Manufacturer', 'Order Code', 'Product Image (hyperlink)'],
    ['Euri', 'A'.repeat(256), fileLink],
    ['Euri', 'A'.repeat(255), fileLink],
  ]), `Fixtures-${'a'.repeat(240)}.csv`);
  assert.deepEqual(parsed.rows[0].errors, ['Order Code must be 255 characters or fewer.']);
  assert.deepEqual(parsed.rows[1].errors, []);
  assert.ok(parsed.rows.every(row => row.id.length <= 255));
  assert.notEqual(parsed.rows[0].id, parsed.rows[1].id);
});

test('file validation rejects unsupported formats and excessive sizes', async () => {
  const input = { name: 'file.pdf', arrayBuffer: async () => new ArrayBuffer(0) };
  await assert.rejects(parseCatalogueFile(input), /Choose a CSV/);
  await assert.rejects(parseCatalogueFile({ ...input, name: 'Fixtures.csv', size: 21 * 1024 * 1024 }), /20 MB/);
  assert.deepEqual(await parseCatalogueFile({ ...input, name: 'Introduction-Table 1.csv' }), []);
});

// Set CATALOGUE_TEMPLATE_DIR to verify the supplied external fixture without copying
// supplier catalogue data into this proprietary repository.
test('reference templates contain 245 products and 241 image sources', { skip: !process.env.CATALOGUE_TEMPLATE_DIR }, async () => {
  const base = process.env.CATALOGUE_TEMPLATE_DIR!;
  const fixtures = parseCatalogueCsv(await readFile(`${base}/Fixtures-Table 1.csv`, 'utf8'), 'Fixtures-Table 1.csv');
  const lamps = parseCatalogueCsv(await readFile(`${base}/Lamps-Table 1.csv`, 'utf8'), 'Lamps-Table 1.csv');
  assert.equal(fixtures.rows.length, 94);
  assert.equal(lamps.rows.length, 151);
  const rows = [...fixtures.rows, ...lamps.rows];
  assert.equal(rows.filter(row => row.links.some(link => link.kind === 'image')).length, 241);
  assert.equal(rows.filter(row => row.imageIssue).length, 4);
  assert.equal(rows.flatMap(row => row.errors).length, 0);
  assert.equal(fixtures.rows[0].details.orderCode, 'DLC4-1040e');
  assert.equal(fixtures.rows[0].details.pricePerUnit, '3');
  for (const name of ['Accessories', 'Controls', 'Power Supplies']) {
    assert.equal(parseCatalogueCsv(await readFile(`${base}/${name}-Table 1.csv`, 'utf8'), `${name}.csv`).rows.length, 0);
  }
});
