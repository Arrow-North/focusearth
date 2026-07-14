import { ReportPDFPage } from './ReportPDFPage';

interface LuminairePair {
  existing: string;
  recommended: string;
}

interface LuminaireAreaRow {
  name: string;
  ceilingHeight: string;
  dailyUsage: string;
  controlType: string;
  application: string;
  voltage: string;
  areaSqFt: string;
  installationSurface: string;
  ingressProtection: string;
  notes: string;
  luminaires: readonly LuminairePair[];
}

export interface LuminairesPDFProps {
  companyName: string;
  pageNumber: number;
  allLuminaires: readonly LuminairePair[];
  luminaireAreas: readonly LuminaireAreaRow[];
}

// Static print version of the live tab's LumRow — no Print/Download buttons,
// since those are interactive UI chrome with no meaning in a static document.
function LumRow({ pair }: { pair: LuminairePair }) {
  return (
    <div className="grid grid-cols-2 gap-4 mb-4">
      <div className="border border-gray-200 rounded p-3 text-base text-gray-700 leading-snug">
        {pair.existing || '—'}
      </div>
      <div className="border border-[#619c48] rounded p-3 text-base text-[#619c48] leading-snug text-center">
        {pair.recommended || '—'}
      </div>
    </div>
  );
}

const AREA_DETAIL_FIELDS = (area: LuminaireAreaRow) => [
  { label: 'Ceiling Height:',      value: area.ceilingHeight },
  { label: 'Daily Usage:',         value: area.dailyUsage },
  { label: 'Control Type:',        value: area.controlType },
  { label: 'Application:',         value: area.application },
  { label: 'Voltage:',             value: area.voltage },
  { label: 'Area (sq.ft.):',       value: area.areaSqFt },
  { label: 'Installation Surface:', value: area.installationSurface },
  { label: 'Ingress Protection:',  value: area.ingressProtection },
];

export function LuminairesPDF({ companyName, pageNumber, allLuminaires, luminaireAreas }: LuminairesPDFProps) {
  return (
    <ReportPDFPage title="Luminaire Upgrades" companyName={companyName} pageNumber={pageNumber}>
      <div>
        <p className="text-gray-900 text-base leading-relaxed mb-2">
          This page details the existing lighting components that can be recycled and the
          recommended upgrades that can replace them. Use the following notation to quickly
          review the luminaire descriptions:
        </p>
        <p className="text-base font-bold">
          [Fixture QTY] Fixture Description (Lamp QTY) Component Descriptions {'{'}Mounting Height{'}'}
        </p>
      </div>

      <div>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <p className="text-center text-lg font-bold tracking-widest uppercase text-gray-400 border-b-2 border-gray-300 pb-2">
            Existing Components
          </p>
          <p className="text-center text-lg font-bold tracking-widest uppercase text-[#619c48] border-b-2 border-[#619c48] pb-2">
            Recommended Components
          </p>
        </div>

        <h3 className="text-xl font-bold text-gray-900 mb-4">Totals</h3>
        <div className="mb-8">
          {allLuminaires.length > 0
            ? allLuminaires.map((pair, i) => <LumRow key={i} pair={pair} />)
            : <p className="text-base text-gray-400">No luminaire data available.</p>}
        </div>

        {luminaireAreas.map((area) => (
          <div key={area.name} className="mb-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">{area.name}</h3>

            <div className="border border-[#2c628d] p-4 mb-4 text-base">
              <div className="grid grid-cols-4 gap-x-6 gap-y-2 mb-2">
                {AREA_DETAIL_FIELDS(area).map(({ label, value }) => (
                  <div key={label}>
                    <span className="text-[#2c628d] font-semibold">{label}</span>{' '}
                    <span className="font-bold text-gray-800">{value}</span>
                  </div>
                ))}
              </div>
              <div>
                <span className="text-[#2c628d] font-semibold">Notes:</span>{' '}
                <span className="font-bold text-gray-800">{area.notes}</span>
              </div>
            </div>

            <div>
              {area.luminaires.map((pair, i) => <LumRow key={i} pair={pair} />)}
            </div>
          </div>
        ))}
      </div>
    </ReportPDFPage>
  );
}
