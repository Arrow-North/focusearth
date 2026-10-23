/**
 * Assertion fixtures for the catalogue-import parsers.
 *
 * The project has no test framework on purpose; this is a plain script:
 *   npx tsx src/lib/catalogue-import/__tests__/parser.fixtures.ts
 *
 * It builds a real .xlsx in memory (written and re-read through SheetJS so the
 * hyperlink layer goes through actual serialisation) and asserts the full round
 * trip, plus every nasty CSV case.
 */

import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';

import type { ParsedTable } from '@/types/catalogue-import';

import { parseCsv, toCsv } from '../csv';
import {
  autoDetectMapping,
  cellUrl,
  listSheets,
  parseTabularFile,
  validateTabularFile,
} from '../tabular-parser';

// ─── Harness ────────────────────────────────────────────────────────────────

let passed = 0;
const failures: string[] = [];

async function check(name: string, fn: () => void | Promise<void>): Promise<void> {
  try {
    await fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    failures.push(`${name}\n      ${message.split('\n').join('\n      ')}`);
    console.log(`  FAIL ${name}`);
  }
}

/**
 * `File` is global in Node 20+. Fall back to a minimal shim with just the
 * surface the parsers touch, rather than pulling in a dependency.
 */
function makeFile(data: Uint8Array | string, name: string): File {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;

  if (typeof File !== 'undefined') {
    return new File([bytes], name);
  }

  const shim = {
    name,
    size: bytes.byteLength,
    async arrayBuffer() {
      return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    },
    async text() {
      return new TextDecoder().decode(bytes);
    },
  };
  return shim as unknown as File;
}

/**
 * Every parsed table must carry exactly one source row number per output row.
 * Every scenario in this file runs through here.
 */
function assertParallel(table: ParsedTable, label: string): void {
  assert.equal(
    table.sourceRowNumbers.length,
    table.rows.length,
    `${label}: sourceRowNumbers.length !== rows.length`,
  );
  assert.equal(table.sourceRowNumbers.length, table.totalRows, `${label}: totalRows mismatch`);
  for (const [i, n] of table.sourceRowNumbers.entries()) {
    assert.ok(
      Number.isInteger(n) && n >= 1,
      `${label}: sourceRowNumbers[${i}] = ${n} is not a 1-based row number`,
    );
    // The header is above every data row, so a data row is at least
    // headerRowIndex + 2 in 1-based terms. Dropped blanks only push it later.
    assert.ok(
      n >= table.headerRowIndex + 2,
      `${label}: sourceRowNumbers[${i}] = ${n} is at or above the header row`,
    );
    if (i > 0) {
      assert.ok(
        n > table.sourceRowNumbers[i - 1],
        `${label}: sourceRowNumbers must strictly increase`,
      );
    }
  }
}

/** The drifting formula this field exists to replace. */
function naiveRowNumbers(table: ParsedTable): number[] {
  return table.rows.map((_, i) => table.headerRowIndex + 2 + i);
}

// ─── Workbook fixture ───────────────────────────────────────────────────────

const SPEC_A = 'https://cdn.example.com/specs/0012340.pdf';
const SPEC_B = 'https://cdn.example.com/specs/0098765.pdf';
const INSTALL_A = 'https://cdn.example.com/install/0012340.pdf';

/**
 * Sheet layout (absolute 0-based rows):
 *   0  banner row, only A1 filled      -> must be skipped by header detection
 *   1  header row, blank header at C, duplicate 'Notes'
 *   2  data, leading-zero code, spec hyperlink whose text differs from target,
 *      image as bare `www.` text
 *   3  completely blank                 -> dropped, which shifts later rows
 *   4  data, spec hyperlink             -> must land at rows index 1, not 2
 *   5  data with no links at all        -> must survive
 */
function buildWorkbookFile(): File {
  const aoa = [
    ['Catalogue Export 2024'],
    ['Order Code', 'Spec Sheet', '', 'Product Image', 'Installation Instructions', 'Notes', 'Notes'],
    ['0012340', 'Download', 'extra-1', 'www.example.com/img1.jpg', 'Install guide', 'n1', 'n2'],
    ['', '', '', '', '', '', ''],
    ['0098765', 'Spec B', 'extra-2', '', '', 'n3', 'n4'],
    ['NOLINK-1', '', '', '', '', 'no links here', ''],
  ];

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  // Hyperlinks: display text intentionally differs from the target.
  ws['B3'].l = { Target: SPEC_A };
  ws['E3'].l = { Target: INSTALL_A };
  ws['B5'].l = { Target: SPEC_B };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Products');
  // Legacy parser skipped sheets named like this; we must not.
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Read me'], ['a', 'b']]), 'Introduction');

  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' }) as Uint8Array;
  return makeFile(new Uint8Array(buffer), 'catalogue.xlsx');
}

/**
 * Sheet layout (absolute 0-based rows) for the consecutive-blank case:
 *   0  banner row            -> skipped by header detection
 *   1  header row
 *   2  data                  -> sheet row 3
 *   3  blank
 *   4  blank
 *   5  blank
 *   6  data                  -> sheet row 7, not 4
 *   7  blank
 *   8  data                  -> sheet row 9, not 5
 */
function buildGappyWorkbookFile(): File {
  const aoa = [
    ['Catalogue Export 2024'],
    ['Order Code', 'Spec Sheet'],
    ['A-1', 'x'],
    ['', ''],
    ['', ''],
    ['', ''],
    ['A-2', 'y'],
    ['', ''],
    ['A-3', 'z'],
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), 'Gappy');

  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' }) as Uint8Array;
  return makeFile(new Uint8Array(buffer), 'gappy.xlsx');
}

// ─── Suites ─────────────────────────────────────────────────────────────────

async function csvSuite(): Promise<void> {
  console.log('\nCSV');

  await check('parses a simple grid', () => {
    assert.deepEqual(parseCsv('a,b\n1,2'), [['a', 'b'], ['1', '2']]);
  });

  await check('trailing newline produces no phantom row', () => {
    assert.deepEqual(parseCsv('a,b\n1,2\n'), [['a', 'b'], ['1', '2']]);
    assert.deepEqual(parseCsv('a,b\r\n1,2\r\n'), [['a', 'b'], ['1', '2']]);
  });

  await check('handles CRLF, LF and lone CR line endings', () => {
    assert.deepEqual(parseCsv('a,b\r\nc,d'), [['a', 'b'], ['c', 'd']]);
    assert.deepEqual(parseCsv('a,b\rc,d'), [['a', 'b'], ['c', 'd']]);
    assert.deepEqual(parseCsv('a,b\nc,d'), [['a', 'b'], ['c', 'd']]);
  });

  await check('strips a leading UTF-8 BOM', () => {
    assert.deepEqual(parseCsv('﻿code,name\n0012340,Lamp'), [
      ['code', 'name'],
      ['0012340', 'Lamp'],
    ]);
  });

  await check('reads quoted fields with commas, quotes and newlines', () => {
    const text = 'a,b,c\n"x, y","he said ""hi""","line1\nline2"';
    assert.deepEqual(parseCsv(text), [
      ['a', 'b', 'c'],
      ['x, y', 'he said "hi"', 'line1\nline2'],
    ]);
  });

  await check('keeps embedded CRLF inside a quoted field', () => {
    assert.deepEqual(parseCsv('a\n"l1\r\nl2"'), [['a'], ['l1\r\nl2']]);
  });

  await check('preserves empty leading/trailing fields', () => {
    assert.deepEqual(parseCsv('a,,c\n,,'), [['a', '', 'c'], ['', '', '']]);
  });

  await check('sniffs a semicolon delimiter', () => {
    assert.deepEqual(parseCsv('code;name;url\n0012340;Lamp A;https://x/y?a=1,2'), [
      ['code', 'name', 'url'],
      ['0012340', 'Lamp A', 'https://x/y?a=1,2'],
    ]);
  });

  await check('sniffs a tab delimiter', () => {
    assert.deepEqual(parseCsv('code\tname\n1\tLamp, large'), [
      ['code', 'name'],
      ['1', 'Lamp, large'],
    ]);
  });

  await check('ignores delimiters inside quotes while sniffing', () => {
    assert.deepEqual(parseCsv('"a;b;c;d",second\n1,2'), [['a;b;c;d', 'second'], ['1', '2']]);
  });

  await check('never coerces leading-zero codes or dates', () => {
    const [, row] = parseCsv('code,when\n0012340,2024-01-02');
    assert.equal(row[0], '0012340');
    assert.equal(row[1], '2024-01-02');
  });

  await check('toCsv writes a BOM and quotes nasty fields', () => {
    const out = toCsv(['a', 'b'], [['x, y', 'he said "hi"']]);
    assert.ok(out.startsWith('﻿'), 'missing BOM');
    assert.ok(out.includes('"x, y"'), 'comma not quoted');
    assert.ok(out.includes('"he said ""hi"""'), 'quote not doubled');
  });

  await check('toCsv preserves duplicate headers verbatim', () => {
    const headers = ['Notes', 'Notes', 'Specifications', 'Specifications'];
    const grid = parseCsv(toCsv(headers, [['1', '2', '3', '4']]));
    assert.deepEqual(grid[0], headers);
  });

  await check('round-trips every nasty case', () => {
    const headers = ['plain', 'comma', 'quote', 'newline', 'crlf', 'semi'];
    const rows = [
      ['0012340', 'x, y', 'he said "hi"', 'line1\nline2', 'l1\r\nl2', 'a;b;c'],
      ['', '  padded  ', '"', '\n', '\r', ';;;'],
    ];
    const grid = parseCsv(toCsv(headers, rows));
    assert.deepEqual(grid[0], headers);
    assert.deepEqual(grid.slice(1), rows);
  });

  await check('empty input yields no rows', () => {
    assert.deepEqual(parseCsv(''), []);
    assert.deepEqual(parseCsv('﻿'), []);
  });
}

async function excelSuite(): Promise<void> {
  console.log('\nExcel');

  const file = buildWorkbookFile();
  const table = await parseTabularFile(file);

  await check('lists every sheet, including Introduction', async () => {
    const sheets = await listSheets(file);
    assert.deepEqual(sheets.map(s => s.name), ['Products', 'Introduction']);
    assert.equal(sheets[0].rowCount, 6);
    assert.equal(sheets[1].rowCount, 2);
  });

  await check('detects the header row below the banner row', () => {
    assert.equal(table.headerRowIndex, 1);
  });

  await check('names blank headers and keeps duplicates verbatim', () => {
    assert.deepEqual(table.headers, [
      'Order Code',
      'Spec Sheet',
      'Column C',
      'Product Image',
      'Installation Instructions',
      'Notes',
      'Notes',
    ]);
  });

  await check('drops the fully blank row and keeps the link-less row', () => {
    assert.equal(table.rows.length, 3);
    assert.equal(table.totalRows, 3);
    assert.deepEqual(table.rows.map(r => r[0]), ['0012340', '0098765', 'NOLINK-1']);
  });

  await check('preserves a leading-zero order code', () => {
    assert.equal(table.rows[0][0], '0012340');
  });

  await check('pads every row to headers.length', () => {
    for (const row of table.rows) {
      assert.equal(row.length, table.headers.length);
    }
  });

  await check('hyperlink keys are relative to rows, after blank rows are dropped', () => {
    assert.equal(table.hyperlinks.get('0,1'), SPEC_A);
    assert.equal(table.hyperlinks.get('0,4'), INSTALL_A);
    // Sheet row 4; naive `r - headerRowIndex - 1` would misfile this as '2,1'.
    assert.equal(table.hyperlinks.get('1,1'), SPEC_B);
    assert.equal(table.hyperlinks.get('2,1'), undefined);
    assert.equal(table.hyperlinks.size, 3);
  });

  await check('keeps the display text, not the hyperlink target, in rows', () => {
    assert.equal(table.rows[0][1], 'Download');
    assert.equal(table.rows[1][1], 'Spec B');
  });

  await check('cellUrl prefers the hyperlink target over the cell text', () => {
    assert.equal(cellUrl(table, 0, 1), SPEC_A);
    assert.equal(cellUrl(table, 1, 1), SPEC_B);
  });

  await check('cellUrl falls back to URL-looking text and prefixes www.', () => {
    assert.equal(cellUrl(table, 0, 3), 'https://www.example.com/img1.jpg');
  });

  await check('cellUrl returns null for non-URL text and empty cells', () => {
    assert.equal(cellUrl(table, 2, 1), null);
    assert.equal(cellUrl(table, 2, 5), null);
    assert.equal(cellUrl(table, 0, 0), null);
    assert.equal(cellUrl(table, 99, 0), null);
  });

  await check('reports sheet names and the selected sheet', () => {
    assert.deepEqual(table.sheetNames, ['Products', 'Introduction']);
    assert.equal(table.sheetName, 'Products');
  });

  await check('honours an explicit sheetName', async () => {
    const intro = await parseTabularFile(file, { sheetName: 'Introduction' });
    assert.equal(intro.sheetName, 'Introduction');
    assert.deepEqual(intro.headers, ['a', 'b']);
    assert.equal(intro.rows.length, 0);
  });

  await check('honours an explicit headerRowIndex', async () => {
    const forced = await parseTabularFile(file, { headerRowIndex: 0 });
    assert.equal(forced.headerRowIndex, 0);
    assert.equal(forced.headers[0], 'Catalogue Export 2024');
    assert.equal(forced.headers[1], 'Column B');
    // The real header row is now a data row, and the blank row is still dropped.
    assert.equal(forced.rows.length, 4);
    assert.equal(forced.rows[0][0], 'Order Code');
    assert.equal(forced.hyperlinks.get('1,1'), SPEC_A);
    assert.equal(forced.hyperlinks.get('2,1'), SPEC_B);
  });

  await check('sourceRowNumbers are the real 1-based sheet rows across the blank gap', () => {
    // Sheet rows: 3 (data), 4 is blank and dropped, 5, 6.
    assert.deepEqual(table.sourceRowNumbers, [3, 5, 6]);
  });

  await check('sourceRowNumbers compound the banner offset and the dropped blank row', () => {
    // headerRowIndex is 1 (a banner row sits above the header), so the naive
    // `headerRowIndex + 2 + i` gives [3, 4, 5] and silently points the user one
    // line too high for every row after the gap.
    assert.deepEqual(naiveRowNumbers(table), [3, 4, 5]);
    assert.notDeepEqual(
      table.sourceRowNumbers,
      naiveRowNumbers(table),
      'sourceRowNumbers must not be headerRowIndex + 2 + i',
    );
    assert.equal(table.sourceRowNumbers[1], 5, 'row after the gap must report sheet row 5');
    assert.equal(table.sourceRowNumbers[2], 6);
  });

  await check('sourceRowNumbers is parallel to rows', () => {
    assertParallel(table, 'workbook');
  });

  await check('sourceRowNumbers survives multiple consecutive blank rows', async () => {
    const gappy = await parseTabularFile(buildGappyWorkbookFile());
    assert.equal(gappy.headerRowIndex, 1);
    assert.deepEqual(gappy.rows.map(r => r[0]), ['A-1', 'A-2', 'A-3']);
    assert.deepEqual(gappy.sourceRowNumbers, [3, 7, 9]);
    assert.deepEqual(naiveRowNumbers(gappy), [3, 4, 5]);
    assertParallel(gappy, 'gappy workbook');
  });

  await check('sourceRowNumbers is parallel to rows for the Introduction sheet', async () => {
    const intro = await parseTabularFile(file, { sheetName: 'Introduction' });
    assert.deepEqual(intro.sourceRowNumbers, []);
    assertParallel(intro, 'Introduction sheet');
  });

  await check('an explicit headerRowIndex of 0 still reports true sheet rows', async () => {
    const forced = await parseTabularFile(file, { headerRowIndex: 0 });
    // Sheet rows 2 and 3 are data, 4 is the dropped blank, then 5 and 6.
    assert.deepEqual(forced.sourceRowNumbers, [2, 3, 5, 6]);
    assert.deepEqual(naiveRowNumbers(forced), [2, 3, 4, 5]);
    assertParallel(forced, 'forced headerRowIndex 0');
  });

  await check('the parsed table survives a toCsv round trip with duplicate headers', () => {
    const grid = parseCsv(toCsv(table.headers, table.rows));
    assert.deepEqual(grid[0], table.headers);
    assert.deepEqual(grid.slice(1), table.rows);
  });
}

async function csvFileSuite(): Promise<void> {
  console.log('\nCSV through parseTabularFile');

  const text =
    '﻿Catalogue Export\n' +
    'Order Code;Specifications;;Notes;Notes\n' +
    '0012340;https://cdn.example.com/a.pdf;x;"a, b";n2\n' +
    ';;;;\n' +
    'NOLINK-1;not a url;y;plain;\n';
  const file = makeFile(text, 'catalogue.csv');
  const table = await parseTabularFile(file);

  await check('reports a single synthetic sheet', async () => {
    assert.deepEqual(await listSheets(file), [{ name: 'Sheet1', rowCount: 5 }]);
    assert.deepEqual(table.sheetNames, ['Sheet1']);
    assert.equal(table.sheetName, null);
  });

  await check('skips the banner row and names the blank header', () => {
    assert.equal(table.headerRowIndex, 1);
    assert.deepEqual(table.headers, [
      'Order Code',
      'Specifications',
      'Column C',
      'Notes',
      'Notes',
    ]);
  });

  await check('drops the blank row, keeps the rest, pads ragged rows', () => {
    assert.equal(table.rows.length, 2);
    assert.deepEqual(table.rows[0], [
      '0012340',
      'https://cdn.example.com/a.pdf',
      'x',
      'a, b',
      'n2',
    ]);
    assert.equal(table.rows[1].length, table.headers.length);
  });

  await check('has an empty hyperlink layer but still resolves URL text', () => {
    assert.equal(table.hyperlinks.size, 0);
    assert.equal(cellUrl(table, 0, 1), 'https://cdn.example.com/a.pdf');
    assert.equal(cellUrl(table, 1, 1), null);
  });

  await check('sourceRowNumbers skips the blank line in the middle of the CSV', () => {
    // Lines: 1 banner, 2 header, 3 data, 4 blank (dropped), 5 data.
    assert.deepEqual(table.sourceRowNumbers, [3, 5]);
    assert.deepEqual(naiveRowNumbers(table), [3, 4]);
    assert.notDeepEqual(
      table.sourceRowNumbers,
      naiveRowNumbers(table),
      'CSV sourceRowNumbers must not be headerRowIndex + 2 + i',
    );
    assertParallel(table, 'CSV with a banner and a blank line');
  });

  await check('a gapless CSV numbers rows consecutively from the header', async () => {
    const plain = makeFile('Order Code,Spec\nA-1,x\nA-2,y\n', 'plain.csv');
    const parsed = await parseTabularFile(plain);
    assert.equal(parsed.headerRowIndex, 0);
    assert.deepEqual(parsed.sourceRowNumbers, [2, 3]);
    assertParallel(parsed, 'gapless CSV');
  });

  await check('a CSV with consecutive blank lines reports true line numbers', async () => {
    const gappy = makeFile(
      'Order Code,Spec\nA-1,x\n\n\n\nA-2,y\n\nA-3,z\n',
      'gappy.csv',
    );
    const parsed = await parseTabularFile(gappy);
    assert.deepEqual(parsed.rows.map(r => r[0]), ['A-1', 'A-2', 'A-3']);
    assert.deepEqual(parsed.sourceRowNumbers, [2, 6, 8]);
    assert.deepEqual(naiveRowNumbers(parsed), [2, 3, 4]);
    assertParallel(parsed, 'gappy CSV');
  });
}

async function validationSuite(): Promise<void> {
  console.log('\nValidation');

  const ok = { name: 'a.xlsx', size: 1024 } as File;
  const bad = { name: 'a.pdf', size: 1024 } as File;
  const huge = { name: 'a.csv', size: 101 * 1024 * 1024 } as File;

  await check('accepts the supported extensions', () => {
    for (const ext of ['.csv', '.xlsx', '.xlsm', '.xls']) {
      assert.equal(validateTabularFile({ name: `a${ext}`, size: 10 } as File).valid, true);
    }
    assert.equal(validateTabularFile({ name: 'A.XLSX', size: 10 } as File).valid, true);
    assert.equal(validateTabularFile(ok).valid, true);
  });

  await check('rejects an unsupported extension', () => {
    const result = validateTabularFile(bad);
    assert.equal(result.valid, false);
    assert.match(result.error, /Unsupported file type/);
  });

  await check('rejects an oversized file', () => {
    const result = validateTabularFile(huge);
    assert.equal(result.valid, false);
    assert.match(result.error, /too large/);
  });
}

async function mappingSuite(): Promise<void> {
  console.log('\nauto-detect mapping');

  await check('maps exact aliases', () => {
    assert.deepEqual(
      autoDetectMapping(['Order Code', 'Specifications', 'Installation Instructions', 'Product Image']),
      { specifications: 1, installationInstructions: 2, productImage: 3 },
    );
  });

  await check('is insensitive to case, spacing and punctuation', () => {
    assert.deepEqual(autoDetectMapping(['SPEC_SHEET', 'install-guide', 'Photo']), {
      specifications: 0,
      installationInstructions: 1,
      productImage: 2,
    });
  });

  await check('returns null for fields with no column', () => {
    assert.deepEqual(autoDetectMapping(['Order Code', 'Wattage']), {
      specifications: null,
      installationInstructions: null,
      productImage: null,
    });
  });

  await check('matches substrings when no exact alias exists', () => {
    const mapping = autoDetectMapping(['Code', 'Specification Sheet URL', 'Product Image Link']);
    assert.equal(mapping.specifications, 1);
    assert.equal(mapping.productImage, 2);
  });

  await check('an exact match beats a substring match for a contested column', () => {
    // 'Images' is an exact productImage alias and a substring candidate for nothing
    // else; 'Product Image Gallery' only matches productImage by substring.
    const mapping = autoDetectMapping(['Product Image Gallery', 'Images']);
    assert.equal(mapping.productImage, 1);
  });

  await check('a column is claimed by at most one field', () => {
    const mapping = autoDetectMapping(['Spec', 'Spec', 'Spec']);
    assert.equal(mapping.specifications, 0);
    const claimed = Object.values(mapping).filter(v => v !== null);
    assert.equal(new Set(claimed).size, claimed.length);
  });

  await check('ignores generated blank-column names', () => {
    assert.deepEqual(autoDetectMapping(['Column A', 'Column B']), {
      specifications: null,
      installationInstructions: null,
      productImage: null,
    });
  });
}

// ─── Run ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  await csvSuite();
  await excelSuite();
  await csvFileSuite();
  await validationSuite();
  await mappingSuite();

  console.log(`\n${passed} passed, ${failures.length} failed`);
  if (failures.length > 0) {
    console.log('\nFailures:');
    for (const failure of failures) console.log(`  - ${failure}`);
    process.exit(1);
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
