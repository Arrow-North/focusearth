import CoverLogo from '@/assets/CoverLogo.png';
import { PAGE_WIDTH_PX, PAGE_HEIGHT_PX, TITILLIUM_WEB_IMPORT, BODY_FONT_SIZE_PX, formatDownloadDate } from './pdfLayout';

export interface SpecificationsCoverPDFProps {
  companyName: string;
  proposalName: string;
  projectAddress: string;
  projectCityStateZip: string;
}

// No hills graphic here (unlike CoverPagePDF) — the legacy specifications cover is a plain centered layout.
const LOGO_TOP_OFFSET_PX = 90;
const LOGO_WIDTH_PX = 650;
const LOGO_HEIGHT_PX = Math.round(LOGO_WIDTH_PX * (231 / 655));
const TITLE_MARGIN_TOP_PX = 90;
const TITLE_FONT_SIZE_PX = 56;
const DETAILS_LINE_GAP_PX = 32;

/** Cover page for the "Specifications" PDF, converted from the legacy mainPage.html.twig. */
export function SpecificationsCoverPDF({ companyName, proposalName, projectAddress, projectCityStateZip }: SpecificationsCoverPDFProps) {
  return (
    <div
      className="relative bg-white overflow-hidden"
      style={{ width: PAGE_WIDTH_PX, height: PAGE_HEIGHT_PX }}
    >
      <div className="relative z-10 flex flex-col items-center px-20" style={{ marginTop: LOGO_TOP_OFFSET_PX }}>
        <img
          src={CoverLogo}
          alt="Focus Earth"
          style={{ width: LOGO_WIDTH_PX, height: LOGO_HEIGHT_PX }}
          className="object-contain"
        />
        <h1
          className="font-bold text-gray-900 text-center leading-tight"
          style={{ marginTop: TITLE_MARGIN_TOP_PX, fontSize: TITLE_FONT_SIZE_PX }}
        >
          Technical Specifications
        </h1>
      </div>

      <div
        className="absolute z-20 w-full flex flex-col items-center text-center font-semibold text-gray-800"
        style={{ bottom: '15%', fontSize: BODY_FONT_SIZE_PX, gap: DETAILS_LINE_GAP_PX, fontFamily: "'Titillium Web', sans-serif" }}
      >
        <p>Proposal: {proposalName}</p>
        <p>Prepared For: {companyName}</p>
        <p>Project: {projectAddress}</p>
        <p>{projectCityStateZip}</p>
        <p>Downloaded: <span className="font-bold">{formatDownloadDate(new Date())}</span></p>
      </div>

      <style>{TITILLIUM_WEB_IMPORT}</style>
    </div>
  );
}
