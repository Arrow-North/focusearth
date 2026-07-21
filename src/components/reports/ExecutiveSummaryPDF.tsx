import { PieChart, Pie, Cell } from 'recharts';
import CeoSignature from '@/assets/CeoSignature.png';
import { ReportPDFPage } from './ReportPDFPage';
import { LEGACY_PX_RATIO, TITILLIUM_WEB_IMPORT, FRANK_RUHL_LIBRE_IMPORT, BODY_FONT_SIZE_PX, HEADING_FONT_SIZE_PX, formatNumber2 } from './pdfLayout';

export interface ExecutiveSummaryPDFProps {
  companyName: string;
  pageNumber: number;
  reuUserName: string;
  projectAddress: string;
  energyReductionPct: number;
  lumensImprovementPct: number;
  criImprovementPct: number;
  priorities: Record<string, number> | null;
}


const PRIORITY_LABELS = ['Price', 'Time', 'Cost', 'Security', 'Human Centric', 'Other'] as const;
const PRIORITY_COLORS: Record<string, string> = {
  Price: '#EC4899',
  Time: '#F97316',
  Cost: '#84CC16',
  Security: '#06B6D4',
  'Human Centric': '#A855F7',
  Other: '#6366F1',
};
const UNALLOCATED_COLOR = '#d1d5db';

const LETTER_FONT_SIZE_PX = 24; // bumped up from the shared BODY_FONT_SIZE_PX, scoped to this page's letter only
const CONTENT_BOTTOM_GAP_PX = 100; // space between the priorities block and the page footer border
const DIVIDER_PX = Math.round(1 * LEGACY_PX_RATIO);
const SIGNATURE_WIDTH_PX = Math.round(150 * LEGACY_PX_RATIO);
const SIGNATURE_HEIGHT_PX = Math.round(SIGNATURE_WIDTH_PX * (50 / 150));
const CHART_SIZE_PX = 220; // fixed number, not ResponsiveContainer — that needs a live resize measurement html2canvas's fixed-delay capture can't guarantee

/** Print layout for the "Executive Summary" report page — same letter + priorities chart as the legacy PDF. */
export function ExecutiveSummaryPDF({
  companyName,
  pageNumber,
  reuUserName,
  projectAddress,
  energyReductionPct,
  lumensImprovementPct,
  criImprovementPct,
  priorities,
}: ExecutiveSummaryPDFProps) {
  const pieSlices = PRIORITY_LABELS
    .filter((label) => (priorities?.[label] ?? 0) > 0)
    .map((label) => ({ name: label, value: priorities![label], color: PRIORITY_COLORS[label] }));
  const allocatedTotal = pieSlices.reduce((sum, slice) => sum + slice.value, 0);
  const pieData = allocatedTotal >= 100
    ? pieSlices
    : [...pieSlices, { name: 'Unallocated', value: 100 - allocatedTotal, color: UNALLOCATED_COLOR }];

  return (
    <ReportPDFPage title="Executive Summary" companyName={companyName} pageNumber={pageNumber}>
      <div style={{ fontFamily: "'Frank Ruhl Libre', serif", fontSize: LETTER_FONT_SIZE_PX }} className="leading-relaxed text-gray-900 space-y-4">
        <p>Hello {companyName} Team!</p>
        <p>
          We had the privilege of working with {reuUserName} to explore the LED upgrade
          opportunity for {projectAddress}.
        </p>
        <p>
          We've prepared a customized LED system to enhance your lighting environment
          and raise your property value. This solution is estimated to reduce the lighting
          energy consumption at {projectAddress} by {formatNumber2(energyReductionPct)}%. The proposed system
          will simultaneously improve illumination by {formatNumber2(lumensImprovementPct)}% and enhance color
          rendering by {formatNumber2(criImprovementPct)}%.
        </p>
        <p>
          If you have any questions about the contents or calculations of this report, please
          contact us at any time. We look forward to working with you.
        </p>
      </div>

      {/* Signature+priorities grouped into one flex item so all the leftover space lands in the single gap above this block, not split before and after the signature. */}
      <div style={{ paddingBottom: CONTENT_BOTTOM_GAP_PX }}>
        <div style={{ fontSize: BODY_FONT_SIZE_PX }}>Thanks,</div>
        <img src={CeoSignature} alt="Signature" style={{ width: SIGNATURE_WIDTH_PX, height: SIGNATURE_HEIGHT_PX }} />
        <div style={{ fontSize: BODY_FONT_SIZE_PX }}>CEO, Focus Earth</div>

        <div className="mt-8" style={{ borderTop: `${DIVIDER_PX}px solid #000000` }}>
          <p className="font-semibold text-gray-900 mt-6 mb-4" style={{ fontSize: HEADING_FONT_SIZE_PX, fontFamily: "'Titillium Web', sans-serif" }}>
            Project Priorities:
          </p>

          <div className="flex items-center justify-between">
            <div className="grid grid-cols-2 gap-3" style={{ fontFamily: "'Titillium Web', sans-serif" }}>
              {PRIORITY_LABELS.map((label) => (
                <div key={label} className="flex items-center gap-4 border border-gray-200 rounded-lg shadow-sm px-4 py-2.5">
                  <span className="w-3 shrink-0 rounded-sm self-stretch" style={{ backgroundColor: PRIORITY_COLORS[label] }} />
                  <span className="whitespace-nowrap" style={{ fontSize: BODY_FONT_SIZE_PX, fontWeight: 600 }}>{label}</span>
                  <span className="ml-auto whitespace-nowrap" style={{ fontSize: BODY_FONT_SIZE_PX, fontWeight: 700, color: '#A9A9A9' }}>
                    {formatNumber2(priorities?.[label] ?? 0)}%
                  </span>
                </div>
              ))}
            </div>

            <div className="flex-1 flex items-center justify-center">
              <PieChart width={CHART_SIZE_PX} height={CHART_SIZE_PX}>
                <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={CHART_SIZE_PX / 2 - 5} isAnimationActive={false}>
                  {pieData.map((slice) => (
                    <Cell key={slice.name} fill={slice.color} />
                  ))}
                </Pie>
              </PieChart>
            </div>
          </div>
        </div>
      </div>

      <style>{TITILLIUM_WEB_IMPORT}</style>
      <style>{FRANK_RUHL_LIBRE_IMPORT}</style>
    </ReportPDFPage>
  );
}
