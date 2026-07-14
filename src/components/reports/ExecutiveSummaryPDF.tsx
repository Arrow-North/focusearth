import { PieChart, Pie, Cell } from 'recharts';
import CeoSignature from '@/assets/CeoSignature.png';
import { ReportPDFPage } from './ReportPDFPage';
import { LEGACY_PX_RATIO, TITILLIUM_WEB_IMPORT, FRANK_RUHL_LIBRE_IMPORT } from './pdfLayout';

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

const DIVIDER_PX = Math.round(1 * LEGACY_PX_RATIO); 
const LABEL_FONT_SIZE_PX = Math.round(18 * LEGACY_PX_RATIO);
const ROW_FONT_SIZE_PX = Math.round(22 * LEGACY_PX_RATIO);
const SIGNATURE_WIDTH_PX = Math.round(150 * LEGACY_PX_RATIO);
const SIGNATURE_HEIGHT_PX = Math.round(SIGNATURE_WIDTH_PX * (50 / 150));
const CHART_WIDTH_PX = Math.round(450 * LEGACY_PX_RATIO);
const CHART_HEIGHT_PX = Math.round(280 * LEGACY_PX_RATIO);

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
      <div style={{ fontFamily: "'Frank Ruhl Libre', serif" }} className="text-lg leading-relaxed text-gray-900 space-y-4">
        <p>Hello {companyName} Team!</p>
        <p>
          We had the privilege of working with {reuUserName} to explore the LED upgrade
          opportunity for {projectAddress}.
        </p>
        <p>
          We've prepared a customized LED system to enhance your lighting environment
          and raise your property value. This solution is estimated to reduce the lighting
          energy consumption at {projectAddress} by {energyReductionPct}%. The proposed system
          will simultaneously improve illumination by {lumensImprovementPct}% and enhance color
          rendering by {criImprovementPct}%.
        </p>
        <p>
          If you have any questions about the contents or calculations of this report, please
          contact us at any time. We look forward to working with you.
        </p>
        <div style={{ fontSize: LABEL_FONT_SIZE_PX }}>Thanks,</div>
        <img src={CeoSignature} alt="Signature" style={{ width: SIGNATURE_WIDTH_PX, height: SIGNATURE_HEIGHT_PX }} />
        <div style={{ fontSize: LABEL_FONT_SIZE_PX }}>CEO, Focus Earth</div>
      </div>

      <div style={{ borderTop: `${DIVIDER_PX}px solid #000000` }}>
        <p className="font-semibold text-gray-900 mt-6 mb-4" style={{ fontSize: LABEL_FONT_SIZE_PX, fontFamily: "'Titillium Web', sans-serif" }}>
          Project Priorities:
        </p>

        <div className="flex items-center justify-between">
          <div className="grid grid-cols-2 gap-x-10 gap-y-4" style={{ fontFamily: "'Titillium Web', sans-serif" }}>
            {PRIORITY_LABELS.map((label) => (
              <div key={label} className="flex items-center justify-between gap-6">
                <div className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded-sm shrink-0" style={{ backgroundColor: PRIORITY_COLORS[label] }} />
                  <span style={{ fontSize: ROW_FONT_SIZE_PX, fontWeight: 600 }}>{label}</span>
                </div>
                <span style={{ fontSize: ROW_FONT_SIZE_PX, fontWeight: 700, color: '#A9A9A9' }}>
                  {priorities?.[label] ?? 0}%
                </span>
              </div>
            ))}
          </div>

          <div style={{ width: CHART_WIDTH_PX, height: CHART_HEIGHT_PX }} className="shrink-0 flex items-center justify-center">
            <PieChart width={CHART_HEIGHT_PX} height={CHART_HEIGHT_PX}>
              <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={CHART_HEIGHT_PX / 2 - 10} isAnimationActive={false}>
                {pieData.map((slice) => (
                  <Cell key={slice.name} fill={slice.color} />
                ))}
              </Pie>
            </PieChart>
          </div>
        </div>
      </div>

      <style>{TITILLIUM_WEB_IMPORT}</style>
      <style>{FRANK_RUHL_LIBRE_IMPORT}</style>
    </ReportPDFPage>
  );
}
