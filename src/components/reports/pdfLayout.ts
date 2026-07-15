export const PAGE_WIDTH_PX = 1200;
export const PAGE_HEIGHT_PX = Math.round(PAGE_WIDTH_PX * (297 / 210));
export const LEGACY_PX_RATIO = (PAGE_HEIGHT_PX / 297) / (96 / 25.4);

export function formatDownloadDate(date: Date): string {
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${mm}.${dd}.${date.getFullYear()}`;
}

// Always exactly 2 decimals, negatives handled correctly (-5.5 -> "-5.50").
export function formatNumber2(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Intl currency formatting puts the minus before the $ for negatives (-$5.50), unlike plain string concatenation.
export function formatCurrency2(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export const TITILLIUM_WEB_IMPORT = "@import url('https://fonts.googleapis.com/css2?family=Titillium+Web:wght@400;600;700&display=swap');";

export const FRANK_RUHL_LIBRE_IMPORT = "@import url('https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre&display=swap');";

// Shared type scale matching the Tailwind text-base/text-xl/text-sm classes already used across the report pages.
export const BODY_FONT_SIZE_PX = 16; // paragraphs, row labels, table cells
export const HEADING_FONT_SIZE_PX = 20; // section headings
export const SMALL_FONT_SIZE_PX = 14; // table column headers, footnotes
