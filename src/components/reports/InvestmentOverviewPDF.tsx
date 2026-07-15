import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { ReportPDFPage } from './ReportPDFPage';
import { formatCurrency2 } from './pdfLayout';

export interface InvestmentOverviewPDFProps {
  companyName: string;
  pageNumber: number;
  highlights: readonly { label: string; value: string; bg: string }[];
  pricingRows: readonly { label: string; value: string; highlight?: boolean }[];
  paybackData: readonly { year: number; existing: number; led: number }[];
  projectedSavings: { existing: readonly number[]; led: readonly number[]; savings: readonly number[] };
}

const formatYAxis = (value: number) => formatCurrency2(value);
const CHART_MARGIN = { top: 10, right: 20, left: 0, bottom: 35 } as const;
const Y_DOMAIN_MAX = 400000;
const Y_TICKS = [0, 50000, 100000, 150000, 200000, 250000, 300000, 350000, 400000];

const SAVINGS_ROWS = (savings: InvestmentOverviewPDFProps['projectedSavings']) => [
  { label: 'Existing System Cost:', data: savings.existing, bg: '#c1dbff', bold: false },
  { label: 'LED System Cost:',      data: savings.led,      bg: '#c1dbff', bold: false },
  { label: 'Upgrade Savings:',      data: savings.savings,  bg: '#8fcf74', bold: true  },
];

/** Print layout for the "Investment Overview" report tab — same data as the live tab, styled for PDF export. */
export function InvestmentOverviewPDF({
  companyName,
  pageNumber,
  highlights,
  pricingRows,
  paybackData,
  projectedSavings,
}: InvestmentOverviewPDFProps) {
  return (
    <ReportPDFPage title="Investment Overview" companyName={companyName} pageNumber={pageNumber}>
        <p className="text-gray-900 text-base leading-relaxed">
          This section illustrates some of the key investment metrics associated with an LED
          lighting upgrade. Explore the project component breakdown and annual financial
          implications for the recommended system.
        </p>

        <div className="flex gap-16">
          {/* Investment Highlights */}
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Investment Highlights</h3>
            <div className="grid grid-cols-2 gap-8 w-fit">
              {highlights.map((h) => (
                <div
                  key={h.label}
                  style={{ backgroundColor: h.bg, width: '224px', height: '120px' }}
                  className="p-4 text-center text-gray-800 flex flex-col justify-center"
                >
                  <p className="text-base font-medium underline mb-3">{h.label}</p>
                  <p className="text-4xl font-bold">{h.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Project Pricing Information */}
          <div className="w-80 shrink-0">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Project Pricing Information</h3>
            <div className="space-y-4">
              {pricingRows.map((row, i) => {
                const boxBg = row.highlight ? '#c8e6c9' : i % 2 === 0 ? '#c1dbff' : '#c1dbff69';
                return (
                  <div key={row.label} className="flex items-center justify-between gap-3">
                    <span className="text-base text-gray-700">{row.label}</span>
                    <span
                      style={{ backgroundColor: boxBg, width: '110px', height: '32px' }}
                      className="inline-flex items-center justify-center text-base font-medium text-gray-800 shrink-0"
                    >
                      {row.value}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Payback Forecast */}
        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-3">
            Payback Forecast{'  '}
            <span className="font-normal text-base ml-2">
              <span className="inline-block w-4 h-4 bg-red-500 rounded-sm mr-1 align-middle" />
              Existing System
              {'  '}
              <span className="inline-block w-4 h-4 bg-green-500 rounded-sm mr-1 ml-3 align-middle" />
              LED System
            </span>
          </h3>
          <ResponsiveContainer width="100%" height={380}>
            <LineChart data={[...paybackData]} margin={CHART_MARGIN}>
              <CartesianGrid stroke="#e5e7eb" />
              <XAxis
                dataKey="year"
                tick={{ fontSize: 14, fill: '#374151' }}
                label={{
                  value: 'Years',
                  position: 'insideBottom',
                  offset: -18,
                  fontWeight: 700,
                  fontSize: 15,
                  fill: '#111827',
                }}
              />
              <YAxis
                tickFormatter={formatYAxis}
                domain={[0, Y_DOMAIN_MAX]}
                ticks={Y_TICKS}
                tick={{ fontSize: 14, fill: '#374151' }}
                width={75}
              />
              <Tooltip
                formatter={(value: number) => [formatCurrency2(value), undefined]}
                labelFormatter={(label) => `Year ${label}`}
              />
              <Line
                type="linear"
                dataKey="existing"
                name="Existing System"
                stroke="#e53e3e"
                strokeWidth={3}
                dot={{ r: 5, fill: '#e53e3e', strokeWidth: 0 }}
              />
              <Line
                type="linear"
                dataKey="led"
                name="LED System"
                stroke="#48bb78"
                strokeWidth={3}
                dot={{ r: 5, fill: '#48bb78', strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Project Savings */}
        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-6">Project Savings</h3>
          <table className="w-full text-base border-separate border-spacing-y-2">
            <thead>
              <tr>
                <th className="w-44" />
                {[1, 2, 3, 4, 5].map((y) => (
                  <th key={y} className="text-center pb-2 font-bold text-gray-800 uppercase text-sm tracking-wide">
                    Year {y}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SAVINGS_ROWS(projectedSavings).map((row) => (
                <tr key={row.label}>
                  <td className="py-1 pr-4 text-gray-700">{row.label}</td>
                  {row.data.map((val, i) => (
                    <td key={i} className="px-1 py-1">
                      <span
                        style={{ backgroundColor: row.bg }}
                        className={`block text-center py-3 text-gray-800 text-base ${row.bold ? 'font-bold' : 'font-medium'}`}
                      >
                        {formatCurrency2(val)}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          <p className="mt-6 text-sm text-gray-600 leading-relaxed">
            <span className="font-semibold">Note:</span>{' '}
            Ask your insurance provider how your premiums can be lowered after an LED upgrade.
            Factors to consider include the reduction of electric maintenance, the improvement
            of visibility in high-traffic areas and the creation of a safer property environment.
          </p>
        </div>
    </ReportPDFPage>
  );
}
