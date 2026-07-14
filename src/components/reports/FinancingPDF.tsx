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

export interface FinancingPDFProps {
  companyName: string;
  pageNumber: number;
  comparisonCols: readonly string[];
  financingLeft: readonly { label: string; value: string; bg: string }[];
  financingRows: readonly { label: string; values: readonly number[]; bg: string; bold: boolean }[];
  financingForecastData: readonly { year: number; existing: number; financed: number; paid: number }[];
}

const formatYAxis = (value: number) => (value === 0 ? '$0' : `$${value.toLocaleString()}`);
const Y_DOMAIN_MAX = 400000;
const Y_TICKS = [0, 50000, 100000, 150000, 200000, 250000, 300000, 350000, 400000];

const FORECAST_LEGEND = [
  { color: '#e53e3e', label: 'Existing System' },
  { color: '#f5c842', label: 'LED Upgrade (Financed)' },
  { color: '#619c48', label: 'LED Upgrade (Paid)' },
];

export function FinancingPDF({
  companyName,
  pageNumber,
  comparisonCols,
  financingLeft,
  financingRows,
  financingForecastData,
}: FinancingPDFProps) {
  return (
    <ReportPDFPage title="Financing Estimates" companyName={companyName} pageNumber={pageNumber}>
      <p className="text-gray-900 text-base leading-relaxed">
        Loan estimates are based on approximated rates in order to demonstrate alternative
        payment methods. Exact details regarding any financing arrangement must be approved
        by a lending entity.
      </p>

      <div className="flex gap-12">
        {/* Left — metric boxes */}
        <div className="shrink-0">
          <div className="space-y-3">
            {financingLeft.map((row) => (
              <div key={row.label} className="flex items-center gap-3">
                <span className="text-base text-gray-700 w-52 text-right shrink-0">{row.label}</span>
                <span
                  style={{ backgroundColor: row.bg, width: '130px', height: '34px' }}
                  className="inline-flex items-center justify-center text-base font-medium text-gray-800 shrink-0"
                >
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right — comparison table */}
        <div className="flex-1">
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
              {financingRows.map((row) => (
                <tr key={row.label}>
                  <td className="py-1 pr-3 text-gray-700 text-right">{row.label}</td>
                  {row.values.map((val, i) => (
                    <td key={i} className="px-1 py-1">
                      <span
                        style={{ backgroundColor: row.bg }}
                        className={`block w-full text-center py-3 text-gray-800 ${row.bold ? 'font-bold' : 'font-medium'}`}
                      >
                        ${val.toLocaleString()}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Financing Forecast chart */}
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-4">Financing Forecast</h3>

        <div className="flex items-center justify-center gap-8 mb-4">
          {FORECAST_LEGEND.map(({ color, label }) => (
            <div key={label} className="flex items-center gap-2">
              <span className="w-10 h-4 shrink-0 inline-block" style={{ backgroundColor: color }} />
              <span className="text-base text-gray-600">{label}</span>
            </div>
          ))}
        </div>

        <ResponsiveContainer width="100%" height={380}>
          <LineChart data={[...financingForecastData]} margin={{ top: 10, right: 20, left: 10, bottom: 35 }}>
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
              formatter={(value: number) => [`$${value.toLocaleString()}`, undefined]}
              labelFormatter={(label) => `Year ${label}`}
            />
            <Line type="linear" dataKey="existing" name="Existing System"        stroke="#e53e3e" strokeWidth={3} dot={{ r: 4, fill: '#e53e3e', strokeWidth: 0 }} />
            <Line type="linear" dataKey="financed" name="LED Upgrade (Financed)" stroke="#f5c842" strokeWidth={3} dot={{ r: 4, fill: '#f5c842', strokeWidth: 0 }} />
            <Line type="linear" dataKey="paid"     name="LED Upgrade (Paid)"     stroke="#619c48" strokeWidth={3} dot={{ r: 4, fill: '#619c48', strokeWidth: 0 }} />
          </LineChart>
        </ResponsiveContainer>

        <p className="mt-4 text-sm text-gray-600 leading-relaxed">
          <span className="font-semibold">Note:</span>{' '}
          Loan forecasts represent estimates calculated to better facilitate illumination
          system upgrades.
        </p>
      </div>
    </ReportPDFPage>
  );
}
