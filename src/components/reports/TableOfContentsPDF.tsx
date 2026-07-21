import { ChevronRight } from 'lucide-react';
import { ReportPDFPage } from './ReportPDFPage';
import { LEGACY_PX_RATIO, TITILLIUM_WEB_IMPORT, HEADING_FONT_SIZE_PX } from './pdfLayout';

export interface TocEntry {
  title: string;
  page: number;
}

export interface TableOfContentsPDFProps {
  companyName: string;
  pageNumber: number;
  entries: readonly TocEntry[];
}

const ROW_MIN_HEIGHT_PX = Math.round(70 * LEGACY_PX_RATIO);
const ROW_BORDER_PX = Math.round(2 * LEGACY_PX_RATIO);
const ROW_PADDING_X_PX = Math.round(20 * LEGACY_PX_RATIO);
const ROW_MARGIN_TOP_PX = Math.round(20 * LEGACY_PX_RATIO);
const ROW_TEXT_GAP_PX = Math.round(20 * LEGACY_PX_RATIO);
const ROW_BORDER_COLOR = '#9CBDD8';

/** Table of Contents — one bordered row per report page, listing its page number and title. */
export function TableOfContentsPDF({ companyName, pageNumber, entries }: TableOfContentsPDFProps) {
  return (
    <ReportPDFPage title="Table Of Contents" companyName={companyName} pageNumber={pageNumber}>
      <div style={{ fontFamily: "'Titillium Web', sans-serif" }}>
        {entries.map((entry) => (
          <div
            key={entry.title}
            className="flex items-center justify-between"
            style={{
              minHeight: ROW_MIN_HEIGHT_PX,
              border: `${ROW_BORDER_PX}px solid ${ROW_BORDER_COLOR}`,
              padding: `0 ${ROW_PADDING_X_PX}px`,
              marginTop: ROW_MARGIN_TOP_PX,
            }}
          >
            <div className="flex items-center">
              <span style={{ fontSize: HEADING_FONT_SIZE_PX, fontWeight: 300, marginRight: ROW_TEXT_GAP_PX }}>
                {entry.page}
              </span>
              <span style={{ fontSize: HEADING_FONT_SIZE_PX, fontWeight: 700 }}>
                {entry.title}
              </span>
            </div>
            <ChevronRight className="h-8 w-8 text-gray-400 shrink-0" />
          </div>
        ))}
      </div>

      <style>{TITILLIUM_WEB_IMPORT}</style>
    </ReportPDFPage>
  );
}
