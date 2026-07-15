import IconMission from '@/assets/icons/IconMission.png';
import IconValue from '@/assets/icons/IconValue.png';
import IconPrivacy from '@/assets/icons/IconPrivacy.png';
import IconPerspective from '@/assets/icons/IconPerspective.png';
import IconIntegrity from '@/assets/icons/IconIntegrity.png';
import IconVision from '@/assets/icons/IconVision.png';
import { ReportPDFPage } from './ReportPDFPage';
import { LEGACY_PX_RATIO, TITILLIUM_WEB_IMPORT, FRANK_RUHL_LIBRE_IMPORT, BODY_FONT_SIZE_PX, HEADING_FONT_SIZE_PX } from './pdfLayout';

export interface CompanyHighlightsPDFProps {
  companyName: string;
  pageNumber: number;
}

const BORDER_COLOR = '#F3F3F3';
const ICON_WIDTH_PX = Math.round(50 * LEGACY_PX_RATIO); // legacy: icon width: 50px
const COL_BORDER_PX = Math.round(1 * LEGACY_PX_RATIO); // legacy: column border: 1px

// Static marketing copy, no report data — 6 columns across 2 rows, all sharing the same top padding so icon/title/body line up across each row.
const HIGHLIGHTS = [
  {
    icon: IconMission, title: 'Mission',
    body: 'Our mission is to upgrade properties with the best lighting systems possible. We seek to improve work settings for tenants and reduce costs for owners. We aim to support sustainability and other worthy causes by donating a portion of every project to different charities.',
    borderRight: true, borderBottom: true, paddingBottomPx: Math.round(40 * LEGACY_PX_RATIO),
  },
  {
    icon: IconValue, title: 'Value',
    body: 'There are many methods of measuring valuation and we pride ourselves on the depth and breadth of our analytic abilities. Yet value is inherently subjective, so please let us know if you feel our estimation efforts could be enhanced by including different metrics or calculations.',
    borderRight: true, borderBottom: true, paddingBottomPx: Math.round(50 * LEGACY_PX_RATIO),
  },
  {
    icon: IconPrivacy, title: 'Privacy',
    body: 'We strive to encrypt and safeguard any information entrusted to us. Any data we collect is for the sole purpose of helping our clients improve their circumstance. We will never sell your information to any 3rd party for marketing or advertising purposes.',
    borderRight: false, borderBottom: true, paddingBottomPx: Math.round(80 * LEGACY_PX_RATIO),
  },
  {
    icon: IconPerspective, title: 'Perspective',
    body: 'Most things are relative and we want to know what is most important to your organization. The better we understand your goals and expectations, the more accurate our system recommendations will be. We support our clients efforts to enhance flexibility in their work environment and improve their IoT management capabilities.',
    borderRight: true, borderBottom: false, paddingBottomPx: 0,
  },
  {
    icon: IconIntegrity, title: 'Integrity',
    body: "At Focus Earth, we believe that if you're going to do something, it's important to it right. Just like LED technology, we want to provide support for the long haul. If you experience any problems with a recommended lighting system, we wont shy away from making things right. We want to be the best at what we do.",
    borderRight: true, borderBottom: false, paddingBottomPx: 0,
  },
  {
    icon: IconVision, title: 'Vision',
    body: "Focus Earth is always looking ahead, and we're not afraid to ask for help. Our goal is to provide a range of environmentally sustainable alternatives to the real estate industry, but we can't do it alone. We're constantly looking for new partners to support our mission. Please share any eco-friendly suggestions you feel we should explore!",
    borderRight: false, borderBottom: false, paddingBottomPx: 0,
  },
];

const COL_PADDING_X_PX = Math.round(20 * LEGACY_PX_RATIO); // legacy: padding-right: 20px on every column
const COL_LEFT_INSET_PX = Math.round(40 * LEGACY_PX_RATIO); // legacy: padding-left: 40px on columns 2 and 3

function HighlightColumn({ item, index }: { item: typeof HIGHLIGHTS[number]; index: number }) {
  return (
    <div
      className="flex-1"
      style={{
        paddingRight: COL_PADDING_X_PX,
        paddingLeft: index === 0 ? 0 : COL_LEFT_INSET_PX,
        paddingBottom: item.paddingBottomPx,
        borderRight: item.borderRight ? `${COL_BORDER_PX}px solid ${BORDER_COLOR}` : undefined,
        borderBottom: item.borderBottom ? `${COL_BORDER_PX}px solid ${BORDER_COLOR}` : undefined,
      }}
    >
      <div className="flex justify-center">
        <img src={item.icon} alt={item.title} style={{ width: ICON_WIDTH_PX }} />
      </div>
      <p
        className="text-center font-bold mt-4"
        style={{ fontSize: HEADING_FONT_SIZE_PX, fontFamily: "'Titillium Web', sans-serif" }}
      >
        {item.title}
      </p>
      <p
        className="mt-4"
        style={{ fontSize: BODY_FONT_SIZE_PX, lineHeight: 1.5, fontFamily: "'Frank Ruhl Libre', serif" }}
      >
        {item.body}
      </p>
    </div>
  );
}

/** Print layout for the "Company Highlights" report page — static marketing copy, same as the legacy PDF. */
export function CompanyHighlightsPDF({ companyName, pageNumber }: CompanyHighlightsPDFProps) {
  return (
    <ReportPDFPage title="Company Highlights" companyName={companyName} pageNumber={pageNumber}>
      {/* Intro and grid in one block (not 2 flex items) so ReportPDFPage's justify-between has no middle gap to create — leftover space lands at the bottom instead. */}
      <div>
        <p style={{ fontSize: BODY_FONT_SIZE_PX, fontFamily: "'Frank Ruhl Libre', serif" }}>
          The following information describes what makes Focus Earth a valuable partner. If
          you&rsquo;ve worked with us before, this page is review. If this is our first project
          together, we think it&rsquo;s important to let you know what we stand for!
        </p>

        <div className="flex mt-10">
          {HIGHLIGHTS.slice(0, 3).map((item, i) => <HighlightColumn key={item.title} item={item} index={i} />)}
        </div>
        <div className="flex">
          {HIGHLIGHTS.slice(3, 6).map((item, i) => <HighlightColumn key={item.title} item={item} index={i} />)}
        </div>
      </div>

      <style>{TITILLIUM_WEB_IMPORT}</style>
      <style>{FRANK_RUHL_LIBRE_IMPORT}</style>
    </ReportPDFPage>
  );
}
