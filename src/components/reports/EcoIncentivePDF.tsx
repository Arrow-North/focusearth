import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { ReportPDFPage } from './ReportPDFPage';

export interface EcoIncentivePDFProps {
  companyName: string;
  pageNumber: number;
  comparisonCols: readonly string[];
  ecoRows: readonly { label: string; values: readonly number[]; prefix: string }[];
  humanElementData: readonly { area: string; cri: number; lumens: number }[];
  criImprovement: number;
  lumenImprovement: number;
  preciousTimeRows: readonly { label: string; values: readonly number[]; bg: string; bold: boolean }[];
}

/** Print layout for the "Eco Incentive" report tab — same data as the live tab, styled for PDF export. */
export function EcoIncentivePDF({
  companyName,
  pageNumber,
  comparisonCols,
  ecoRows,
  humanElementData,
  criImprovement,
  lumenImprovement,
  preciousTimeRows,
}: EcoIncentivePDFProps) {
  return (
    <ReportPDFPage title="Eco Incentive" companyName={companyName} pageNumber={pageNumber}>
      <p className="text-gray-900 text-base leading-relaxed">
        By illuminating your building with LEDs, you're making a good choice for the planet.
        Choosing an energy-conscious technology reduces your environmental footprint. The chart
        below outlines some of the ways your upgrade will work towards a greener future.
      </p>

      {/* Environmental Benefits */}
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-6">Environmental Benefits</h3>
        <table className="w-full text-base border-separate border-spacing-y-2">
          <thead>
            <tr>
              <th className="w-48" />
              {comparisonCols.map((col) => (
                <th key={col} className="text-center pb-2 font-bold text-gray-800 uppercase text-sm tracking-wide">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ecoRows.map((row) => (
              <tr key={row.label}>
                <td className="py-1 pr-3 text-gray-700 text-right">{row.label}</td>
                {row.values.map((val, i) => (
                  <td key={i} className="px-1 py-1">
                    <span
                      style={{ backgroundColor: '#d4e3cd' }}
                      className="block text-center py-3 text-gray-800 font-medium"
                    >
                      {row.prefix}{val.toLocaleString()}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Human Element */}
      <div className="flex gap-10">
        <div className="flex-1">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Human Element</h3>
          <p className="text-gray-900 text-base leading-relaxed mb-5">
            Studies show that a properly lit work environment can increase employee
            productivity by 10-15%. Upgrading to solid state LEDs will alleviate your team
            of the headaches and eye strain so often associated with traditional
            fluorescents and HIDs.
          </p>

          <div className="space-y-3 mb-5">
            <div className="flex items-center gap-3">
              <span
                style={{ backgroundColor: '#9cbdd8' }}
                className="w-36 text-center py-3 text-lg font-semibold text-gray-800 shrink-0"
              >
                {criImprovement}%
              </span>
              <span className="text-base text-gray-700">Avg. Improved CRI</span>
            </div>
            <div className="flex items-center gap-3">
              <span
                style={{ backgroundColor: '#ffd339' }}
                className="w-36 text-center py-3 text-lg font-semibold text-gray-800 shrink-0"
              >
                {lumenImprovement.toLocaleString()}%
              </span>
              <span className="text-base text-gray-700">Avg. Improved Illumination</span>
            </div>
          </div>

          <p className="text-gray-900 text-base leading-relaxed">
            Properly illuminated work environments also reduce on-site accidents and can
            minimize insurance premiums.
          </p>
        </div>

        <div className="flex-1">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={[...humanElementData]}
              margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
              barGap={4}
              barCategoryGap="35%"
            >
              <XAxis dataKey="area" tick={{ fontSize: 14, fill: '#374151' }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                cursor={false}
                formatter={(value: number) => [value.toLocaleString(), undefined]}
                labelFormatter={(label) => `${label}`}
              />
              <Bar dataKey="cri"    name="Improved CRI"                fill="#9cbdd8" radius={[2, 2, 0, 0]} isAnimationActive={false} />
              <Bar dataKey="lumens" name="Improved Directional Lumens" fill="#ffd339" radius={[2, 2, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>

          <div className="flex items-center gap-6 mt-2 pl-4">
            <div className="flex items-center gap-2">
              <span className="w-10 h-4 rounded-sm shrink-0" style={{ backgroundColor: '#9cbdd8' }} />
              <span className="text-sm text-gray-600">Improved CRI</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-10 h-4 rounded-sm shrink-0" style={{ backgroundColor: '#ffd339' }} />
              <span className="text-sm text-gray-600">Improved Directional Lumens</span>
            </div>
          </div>
        </div>
      </div>

      {/* Precious Time */}
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-3">Precious Time</h3>
        <p className="text-gray-900 text-base leading-relaxed mb-4">
          Additionally, long lasting LEDs reduce the amount of time you must spend on lamp
          replacement, allowing your company electrician to focus on more important tasks.
        </p>

        <h4 className="text-lg font-bold text-gray-900 mb-3">Labor Hours Saved</h4>
        <table className="w-full text-base border-separate border-spacing-y-2 table-fixed">
          <thead>
            <tr>
              <th className="w-40" />
              {comparisonCols.map((col) => (
                <th key={col} className="text-center pb-2 font-bold text-gray-800 uppercase text-sm tracking-wide">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {preciousTimeRows.map((row) => (
              <tr key={row.label}>
                <td className="py-1 pr-3 text-gray-700 text-right">{row.label}</td>
                {row.values.map((val, i) => (
                  <td key={i} className="px-1 py-1">
                    <span
                      style={{ backgroundColor: row.bg }}
                      className={`block w-full text-center py-4 text-gray-800 ${row.bold ? 'font-bold' : 'font-medium'}`}
                    >
                      {val.toLocaleString()}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        <p className="mt-4 text-gray-900 text-sm leading-relaxed">
          <span className="font-semibold">Note:</span>{' '}
          We defer to your own internal measurements for just how much time this upgrade
          will save in your acquisition and coordination departments.
        </p>
      </div>
    </ReportPDFPage>
  );
}
