import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { ReportPDFPage } from './ReportPDFPage';

type LabeledRow = { label: string; values: readonly number[]; bg: string; bold: boolean };

export interface EnergyPDFProps {
  companyName: string;
  pageNumber: number;
  comparisonCols: readonly string[];
  energyConsumption: readonly { label: string; value: string; bg: string; bold: boolean }[];
  energyComparison: readonly LabeledRow[];
  consumptionData: readonly { year: number; existing: number; led: number }[];
  expenditureRows: readonly LabeledRow[];
}

const formatConsumptionY = (value: number) => (value === 0 ? '0' : value.toLocaleString());
const CONSUMPTION_Y_MAX = 7000000;
const CONSUMPTION_Y_TICKS = [0, 1000000, 2000000, 3000000, 4000000, 5000000, 6000000, 7000000];

function ComparisonTable({ cols, rows, dollarPrefix }: { cols: readonly string[]; rows: readonly LabeledRow[]; dollarPrefix?: boolean }) {
  return (
    <table className="w-full text-base border-separate border-spacing-y-2">
      <thead>
        <tr>
          <th className="w-40" />
          {cols.map((col) => (
            <th key={col} className="text-center pb-2 font-bold text-gray-800 uppercase text-sm tracking-wide">
              {col}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.label}>
            <td className="py-1 pr-3 text-gray-700">{row.label}</td>
            {row.values.map((val, i) => (
              <td key={i} className="px-1 py-1">
                <span
                  style={{ backgroundColor: row.bg }}
                  className={`block text-center py-3 text-gray-800 text-base ${row.bold ? 'font-bold' : 'font-medium'}`}
                >
                  {dollarPrefix ? '$' : ''}{val.toLocaleString()}
                </span>
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Print layout for the "Energy" report tab — same data as the live tab, styled for PDF export. */
export function EnergyPDF({
  companyName,
  pageNumber,
  comparisonCols,
  energyConsumption,
  energyComparison,
  consumptionData,
  expenditureRows,
}: EnergyPDFProps) {
  return (
    <ReportPDFPage title="Energy Analysis" companyName={companyName} pageNumber={pageNumber}>
      <p className="text-gray-900 text-base leading-relaxed">
        Explore this investment from an energy consumption perspective. The recommended LED
        system will reduce demand on electric generation and translate directly to lower net
        operating expenses.
      </p>

      <div className="flex gap-12">
        {/* Energy Consumption (kW) */}
        <div className="shrink-0">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Energy Consumption (kW)</h3>
          <div className="space-y-3">
            {energyConsumption.map((row) => (
              <div key={row.label} className="flex items-center gap-3">
                <span className="text-base text-gray-700 w-40 text-right">{row.label}</span>
                <span
                  style={{ backgroundColor: row.bg, width: '130px', height: '34px' }}
                  className={`inline-flex items-center justify-center text-base text-gray-800 shrink-0 ${row.bold ? 'font-bold' : 'font-medium'}`}
                >
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Energy Consumption Comparison */}
        <div className="flex-1">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Energy Consumption Comparison</h3>
          <ComparisonTable cols={comparisonCols} rows={energyComparison} />
        </div>
      </div>

      {/* Consumption bar chart */}
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-6">Consumption (kWh)</h3>
        <div className="flex gap-8">
          <div className="shrink-0 flex flex-col gap-5 pt-10">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-sm shrink-0" style={{ backgroundColor: '#ff7f56' }} />
              <span className="text-base font-semibold text-gray-700">Existing System</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-sm shrink-0" style={{ backgroundColor: '#619c48' }} />
              <span className="text-base font-semibold text-gray-700">LED System</span>
            </div>
          </div>

          <div className="flex-1">
            <ResponsiveContainer width="100%" height={380}>
              <BarChart
                data={[...consumptionData]}
                margin={{ top: 10, right: 20, left: 70, bottom: 35 }}
                barCategoryGap="15%"
                barGap={4}
              >
                <CartesianGrid stroke="#e5e7eb" vertical={false} />
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
                  tickFormatter={formatConsumptionY}
                  domain={[0, CONSUMPTION_Y_MAX]}
                  ticks={CONSUMPTION_Y_TICKS}
                  tick={{ fontSize: 13, fill: '#374151' }}
                  width={80}
                />
                <Tooltip
                  formatter={(value: number) => [value.toLocaleString(), undefined]}
                  labelFormatter={(label) => `Year ${label}`}
                />
                <Bar dataKey="existing" name="Existing System" fill="#ff7f56" radius={[2, 2, 0, 0]} />
                <Bar dataKey="led"      name="LED System"      fill="#619c48" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Energy Expenditure Comparison */}
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-6">Energy Expenditure Comparison</h3>
        <ComparisonTable cols={comparisonCols} rows={expenditureRows} dollarPrefix />

        <p className="mt-6 text-sm text-gray-600 leading-relaxed">
          <span className="font-semibold">Note:</span>{' '}
          Based on the average cost per kWh entered in the Property Details area or
          extrapolated from provided energy bills.
        </p>
      </div>
    </ReportPDFPage>
  );
}
