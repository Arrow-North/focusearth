import CoverLogo from '@/assets/CoverLogo.png';
import CoverHillsImage from '@/assets/CoverHills.png';
import { PAGE_WIDTH_PX, PAGE_HEIGHT_PX, LEGACY_PX_RATIO, TITILLIUM_WEB_IMPORT, BODY_FONT_SIZE_PX, formatDownloadDate } from './pdfLayout';

export interface CoverPagePDFProps {
  companyName: string;
  proposalName: string;
  projectAddress: string;
  projectCityStateZip: string;
  createdBy: string;
}

// Reduced logo/title sizing so 2-line titles clear the hills — see HILLS_HEIGHT_PX.
const LOGO_TOP_OFFSET_PX = 90;
const LOGO_WIDTH_PX = 650;
const LOGO_HEIGHT_PX = Math.round(LOGO_WIDTH_PX * (231 / 655));
// const LOGO_WIDTH_PX = '100%';
// const LOGO_HEIGHT_PX = '100%';// legacy logo's own aspect ratio
const TITLE_MARGIN_TOP_PX = 90;
const TITLE_FONT_SIZE_PX = 56;
const HILLS_HEIGHT_PX = Math.round(700 * LEGACY_PX_RATIO); 
const HILLS_BOTTOM_OFFSET_PX = -80;
const TEXT_BLOCK_BOTTOM_PX = Math.round(100 * LEGACY_PX_RATIO);
const DETAILS_LINE_GAP_PX = Math.round(22 * 1.2 * LEGACY_PX_RATIO);

export function CoverPagePDF({ companyName, proposalName, projectAddress, projectCityStateZip, createdBy }: CoverPagePDFProps) {
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
          style={{ marginTop: TITLE_MARGIN_TOP_PX, fontSize: TITLE_FONT_SIZE_PX, maxWidth: '70%' }}
        >
          LED Upgrade for<br />{companyName}
        </h1>
      </div>

      {/* Hills */}
      <div
        className="absolute left-0 w-full"
        style={{
          bottom: HILLS_BOTTOM_OFFSET_PX,
          height: HILLS_HEIGHT_PX,
          backgroundImage: `url(${CoverHillsImage})`,
          backgroundSize: 'cover',
          backgroundRepeat: 'no-repeat',
        }}
      />

      <div
        className="absolute z-20 w-full flex flex-col items-center text-center font-semibold text-gray-800"
        style={{ bottom: TEXT_BLOCK_BOTTOM_PX, fontSize: BODY_FONT_SIZE_PX, gap: DETAILS_LINE_GAP_PX, fontFamily: "'Titillium Web', sans-serif" }}
      >
        <p>Proposal: {proposalName}</p>
        <p>Project: {projectAddress}</p>
        <p>{projectCityStateZip}</p>
        <p>Created by: {createdBy}</p>
        <p>Downloaded: <span className="font-bold">{formatDownloadDate(new Date())}</span></p>
      </div>

      <style>{TITILLIUM_WEB_IMPORT}</style>
    </div>
  );
}
