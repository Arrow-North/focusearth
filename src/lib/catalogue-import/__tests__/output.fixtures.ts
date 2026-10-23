import assert from 'node:assert/strict';
import { buildOutputCsv, buildErrorCsv } from '../output';
import { parseCsv } from '../csv';
import type { ImportRow, ImportFailure } from '@/types/catalogue-import';

// Source headers deliberately COLLIDE with the appended output names, and
// include a comma, a quote and a leading-zero code.
const headers = ['Order Code', 'Description, long', 'Specifications', 'Product Image'];
const rows: ImportRow[] = [
  { sourceRow: 3, productId: 'uuid-1', values: ['0012340', 'A 24" fixture, white', 'Link', 'Link'],
    resolved: { specifications: 'https://cdn/a-spec.pdf', installationInstructions: '', productImage: 'https://cdn/a.jpg' } },
  { sourceRow: 5, productId: 'uuid-2', values: ['0099', 'Multi\nline', '', ''],
    resolved: { specifications: 'IMAGE_REPO', installationInstructions: 'FETCH_FAILED', productImage: '' } },
];

const csv = buildOutputCsv(headers, rows, false);
const parsed = parseCsv(csv);

assert.equal(parsed[0].length, 8, 'header width = 4 original + 4 appended');
assert.deepEqual(parsed[0].slice(4), ['product_id', 'Specifications', 'Installation Instructions', 'Product Image']);
assert.equal(parsed[0].filter(h => h === 'Specifications').length, 2, 'duplicate header preserved verbatim');
assert.equal(parsed[1][0], '0012340', 'leading zeros survive');
assert.equal(parsed[1][1], 'A 24" fixture, white', 'comma + quote round-trip');
assert.equal(parsed[2][1], 'Multi\nline', 'embedded newline round-trips');
assert.equal(parsed[1][4], 'uuid-1');
assert.equal(parsed[1][7], 'https://cdn/a.jpg');
assert.equal(parsed[2][5], 'IMAGE_REPO');
assert.equal(parsed[2][6], 'FETCH_FAILED');
assert.equal(parsed[2][7], '', 'missing data is an empty field, not the string "null"');
assert.ok(csv.charCodeAt(0) === 0xfeff, 'BOM present for Excel');

const dis = parseCsv(buildOutputCsv(headers, rows, true));
assert.deepEqual(dis[0].slice(4), ['product_id', 'Specifications (Resolved)', 'Installation Instructions (Resolved)', 'Product Image (Resolved)']);
assert.equal(dis[0].filter(h => h === 'Specifications').length, 1, 'no collision when disambiguated');

const failures: ImportFailure[] = [
  { sourceRow: 5, productId: 'uuid-2', field: 'installationInstructions', originalUrl: 'https://x/a,b.pdf',
    classification: 'FILE', httpStatus: 404, message: 'HTTP 404: Not Found' },
];
const err = parseCsv(buildErrorCsv(failures));
assert.deepEqual(err[0], ['row_number','product_id','field','original_url','classification','http_status','error_message']);
assert.equal(err[1][0], '5');
assert.equal(err[1][3], 'https://x/a,b.pdf');
assert.equal(err[1][5], '404');

// Ragged row must be padded, not shifted.
const ragged = parseCsv(buildOutputCsv(headers, [
  { sourceRow: 9, productId: 'u3', values: ['only-one'], resolved: { specifications: '', installationInstructions: '', productImage: '' } },
], false));
assert.equal(ragged[1].length, 8, 'short source row padded to full width');
assert.equal(ragged[1][4], 'u3', 'product_id still lands in the right column');

console.log('output fixtures: all assertions passed');
