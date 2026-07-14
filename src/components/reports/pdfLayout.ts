export const PAGE_WIDTH_PX = 1200;
export const PAGE_HEIGHT_PX = Math.round(PAGE_WIDTH_PX * (297 / 210));
export const LEGACY_PX_RATIO = (PAGE_HEIGHT_PX / 297) / (96 / 25.4);

export function formatDownloadDate(date: Date): string {
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${mm}.${dd}.${date.getFullYear()}`;
}

export const TITILLIUM_WEB_IMPORT = "@import url('https://fonts.googleapis.com/css2?family=Titillium+Web:wght@400;600;700&display=swap');";

export const FRANK_RUHL_LIBRE_IMPORT = "@import url('https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre&display=swap');";
