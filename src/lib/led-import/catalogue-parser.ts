import * as XLSX from 'xlsx';
import type { ProductCategory } from '../../types/database';
import type { CatalogueImportRow, ImportLink, ParsedCatalogueFile } from '../../types/catalogue-import';

const MAX_FILE_BYTES = 20 * 1024 * 1024;
const MAX_ROWS = 10_000;

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');

/** Header matching deliberately ignores spacing, units, and template capitalization. */
const FIELD_NAMES: Record<string, string> = {
  manufacturer: 'manufacturer', ordercode: 'orderCode', productdescription: 'description',
  application: 'application', category: 'lampCategory', type: 'productType',
  basecategory: 'baseCategory', basetype: 'baseType', style: 'style', mount: 'mount',
  shape: 'shape', lenstype: 'lensType', ingressprotection: 'ingressProtection',
  fixturecolor: 'fixtureColor', color: 'color', trim: 'trim',
  lengthinches: 'length', widthinches: 'width', diameterinches: 'diameter', depthinches: 'depth',
  wattage: 'wattage', lumens: 'lumens', cctoptionsk: 'cct', cctoptions: 'cct', cri: 'cri',
  l70lifetimehours: 'l70Lifetime', lifetimehours: 'lifetime', warrantyyears: 'warranty',
  voltagemin: 'voltageMin', voltagemax: 'voltageMax', dimmability: 'dimmability',
  colortunable: 'colorTunable', powerfactor: 'powerFactor', cbcp: 'cbcp', thd: 'thd',
  beamangle: 'beamAngle', optics: 'optics', certifications: 'certifications', buyamerica: 'buyAmerica',
  approxinstallationtimeminutes: 'installationTime', approxdeliverydays: 'deliveryDays',
  priceperunit: 'pricePerUnit', volumetier1minqty: 'volumeTier1Qty', volumetier1ppu: 'volumeTier1PPU',
  volumetier2minqty: 'volumeTier2Qty', volumetier2ppu: 'volumeTier2PPU',
  specificationshyperlink: 'productSpecifications', specifications: 'productSpecifications',
  installationinstructionshyperlink: 'installationInstructions', installationinstructions: 'installationInstructions',
  productimagehyperlink: 'productImage', productimage: 'productImage',
  iesfilehyperlink: 'iesFile', iesfile: 'iesFile',
  compatibleproductordercodes: 'compatibleOrderCodes', productcompatibilityordercodes: 'compatibleOrderCodes',
  compatibleballastproductcodes: 'compatibleBallastCodes', lampspoweredqty: 'lampsPowered', notes: 'notes',
};

function fieldKey(header: string): string {
  const key = normalize(header);
  return FIELD_NAMES[key] ?? `sourceField_${key || 'unnamed'}`;
}

export function isDropboxUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password &&
      (!url.port || url.port === '443') &&
      ['dropbox.com', 'www.dropbox.com'].includes(url.hostname.toLowerCase()) &&
      /^\/(?:s|sh|scl\/fi|scl\/fo)\/[^/]+(?:\/|$)/.test(url.pathname);
  } catch { return false; }
}

function inferCategory(value: string): ProductCategory | null {
  if (/\bfixtures?\b/i.test(value)) return 'fixtures';
  if (/\blamps?\b/i.test(value)) return 'lamp';
  if (/\bpower[\s_-]*suppl(?:y|ies)\b/i.test(value)) return 'power-supply';
  if (/\bcontrols?\b/i.test(value)) return 'control';
  if (/\baccess?ories\b/i.test(value)) return 'accessories';
  return null;
}

function ignoredName(value: string): boolean {
  return /^(?:introduction|validations?)(?:\b|[-_])/i.test(value.trim());
}

/** RFC 4180 reader which never coerces IDs, prices, dates, or leading zeros. */
export function readCatalogueCsv(text: string): string[][] {
  const source = text.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  let closedQuote = false;
  const pushCell = () => { row.push(cell); cell = ''; closedQuote = false; };
  for (let index = 0; index < source.length; index++) {
    const char = source[index];
    if (quoted) {
      if (char === '"' && source[index + 1] === '"') { cell += '"'; index++; }
      else if (char === '"') { quoted = false; closedQuote = true; }
      else cell += char;
    } else if (char === '"') {
      if (cell || closedQuote) throw new Error(`Invalid CSV quoting near row ${rows.length + 1}.`);
      quoted = true;
    } else if (char === ',') pushCell();
    else if (char === '\n' || char === '\r') {
      if (char === '\r' && source[index + 1] === '\n') index++;
      pushCell(); rows.push(row); row = [];
    } else {
      if (closedQuote && !/\s/.test(char)) throw new Error(`Unexpected text after a quoted CSV value near row ${rows.length + 1}.`);
      if (!closedQuote) cell += char;
    }
  }
  if (quoted) throw new Error('CSV contains an unterminated quoted value.');
  if (cell || row.length || closedQuote) { pushCell(); rows.push(row); }
  if (rows.length > MAX_ROWS + 10) throw new Error(`Import files may contain at most ${MAX_ROWS.toLocaleString()} product rows.`);
  return rows;
}

function cellUrls(value: string, attached?: string): string[] {
  if (attached) return [attached.trim()];
  // Excel formulas can be exported as text in CSVs; only the target is a link.
  const formula = value.match(/^\s*=HYPERLINK\(\s*"((?:[^"]|"")+)"\s*[,;]/i);
  if (formula) return [formula[1].replace(/""/g, '"')];
  return [...new Set((value.match(/https?:\/\/[^\s<>"\r\n]+/gi) ?? []).map(url => url.trim()))];
}

function parseRows(
  data: string[][],
  name: string,
  hyperlinkAt?: (row: number, column: number) => string | undefined,
  idPrefix = name,
): ParsedCatalogueFile {
  const category = inferCategory(`${name} ${data.slice(0, 3).flat().join(' ')}`);
  if (!category) throw new Error(`Cannot identify the product category for ${name}. Use Fixtures, Lamps, Power Supplies, Controls, or Accessories.`);
  const headerIndex = data.findIndex(row => row.some(cell => normalize(cell) === 'ordercode') && row.some(cell => normalize(cell) === 'manufacturer'));
  if (headerIndex < 0) throw new Error(`${name}: a header row containing Manufacturer and Order Code is required.`);
  const headers = data[headerIndex].map(value => value.trim());
  if (headers.length > 200 || data.some(row => row.length > 200)) throw new Error(`${name}: at most 200 columns are supported.`);
  const populatedHeaders = headers.map(normalize).filter(Boolean);
  if (new Set(populatedHeaders).size !== populatedHeaders.length) throw new Error(`${name}: duplicate column headers are ambiguous. Rename duplicate headers before importing.`);
  const rows: CatalogueImportRow[] = [];
  for (let index = headerIndex + 1; index < data.length; index++) {
    const cells = data[index];
    if (!cells.some(cell => cell.trim())) continue;
    const sourceValues: Record<string, string> = {};
    const details: CatalogueImportRow['details'] = {};
    const links: ImportLink[] = [];
    const errors: string[] = [];
    let imageIssue: string | undefined;
    for (let column = 0; column < Math.max(headers.length, cells.length); column++) {
      const header = headers[column] || `Column ${column + 1}`;
      const raw = cells[column] ?? '';
      sourceValues[header] = raw;
      const key = fieldKey(header);
      details[key] = raw.trim();
      const urls = cellUrls(raw, hyperlinkAt?.(index, column));
      const isLinkField = /hyperlink/i.test(header) || ['productImage', 'productSpecifications', 'installationInstructions', 'iesFile'].includes(key);
      if (urls.length > 1) {
        const message = `${header} contains multiple URLs. Provide one Dropbox file or folder URL for this field.`;
        if (key === 'productImage') imageIssue = `${message} Image is not available for import. Upload an image manually.`;
        else errors.push(message);
      }
      if ((isLinkField && raw.trim() && !urls.length) || (urls.length && !isDropboxUrl(urls[0]))) {
        const message = `${header}: only HTTPS Dropbox file or folder URLs are supported.`;
        if (key === 'productImage') imageIssue = `${message} Image is not available for import. Upload an image manually.`;
        else errors.push(message);
      }
      if (urls.length === 1 && isDropboxUrl(urls[0])) {
        links.push({ id: `${index + 1}:${column}`, header, detailKey: key, url: urls[0], kind: key === 'productImage' ? 'image' : 'document' });
      }
    }
    const orderCode = String(details.orderCode ?? '').trim();
    if (!orderCode) errors.push('Order Code is required.');
    else if (orderCode.length > 255) errors.push('Order Code must be 255 characters or fewer.');
    if (!links.some(link => link.kind === 'image') && !imageIssue) imageIssue = 'Product image is not available for import. Upload an image manually.';
    rows.push({ id: `${idPrefix}:${index + 1}`, rowNumber: index + 1, category, orderCode, details, sourceValues, links, errors, imageIssue });
  }
  if (rows.length > MAX_ROWS) throw new Error(`Import files may contain at most ${MAX_ROWS.toLocaleString()} product rows.`);
  return { name, category, rows };
}

export function parseCatalogueCsv(text: string, fileName: string): ParsedCatalogueFile {
  // Row IDs are scoped by the import UUID; keep CSV filenames out of their bounded
  // backend identifier while retaining the complete filename in source provenance.
  return parseRows(readCatalogueCsv(text), fileName, undefined, 'csv');
}

/** Workbooks remain supported; CSV input always resolves to a single supplier file. */
export async function parseCatalogueFile(file: { name: string; size?: number; arrayBuffer(): Promise<ArrayBuffer> }): Promise<ParsedCatalogueFile[]> {
  const extension = file.name.toLowerCase().match(/\.[^.]+$/)?.[0];
  if (!['.csv', '.xlsx', '.xlsm', '.xls'].includes(extension ?? '')) throw new Error('Choose a CSV, XLSX, XLSM, or XLS file.');
  if (file.size && file.size > MAX_FILE_BYTES) throw new Error('Catalogue files must be 20 MB or smaller.');
  if (ignoredName(file.name)) return [];
  const buffer = await file.arrayBuffer();
  if (buffer.byteLength > MAX_FILE_BYTES) throw new Error('Catalogue files must be 20 MB or smaller.');
  if (extension === '.csv') return [parseCatalogueCsv(new TextDecoder('utf-8', { fatal: true }).decode(buffer), file.name)];
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: false, cellFormula: true });
  const files: ParsedCatalogueFile[] = [];
  for (const sheetName of workbook.SheetNames) {
    if (ignoredName(sheetName)) continue;
    const sheet = workbook.Sheets[sheetName];
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
    if (range.e.r > MAX_ROWS + 10 || range.e.c > 200) throw new Error(`${sheetName} exceeds the supported row or column limit.`);
    const cells: string[][] = [];
    for (let row = 0; row <= range.e.r; row++) {
      const values: string[] = [];
      for (let column = 0; column <= range.e.c; column++) {
        const cell = sheet[XLSX.utils.encode_cell({ r: row, c: column })] as XLSX.CellObject | undefined;
        values.push(cell?.w ?? (cell?.v === undefined || cell.v === null ? '' : String(cell.v)));
      }
      cells.push(values);
    }
    files.push(parseRows(cells, sheetName, (row, column) => {
      const cell = sheet[XLSX.utils.encode_cell({ r: row, c: column })] as XLSX.CellObject | undefined;
      return cell?.l?.Target ?? (cell?.f ? cellUrls(`=${cell.f}`)[0] : undefined);
    }));
  }
  return files;
}
