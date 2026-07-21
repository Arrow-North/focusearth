import type { ProductDetails } from '@/types/database';
import { ReportPDFPage } from './ReportPDFPage';
import { PAGE_WIDTH_PX } from './pdfLayout';

export type ComponentLabel = 'Fixture' | 'Lamp' | 'Power Supply' | 'Control' | 'Accessory';

export interface TechnicalSpecPage {
  componentLabel: ComponentLabel;
  details: ProductDetails;
}

export interface TechnicalInfoPDFProps {
  companyName: string;
  basePageNumber: number;
  pages: readonly TechnicalSpecPage[];
}

// Returns the first non-empty value among the given keys — callers list the canonical field first, then legacy aliases.
function pick(details: ProductDetails, ...keys: (keyof ProductDetails)[]): string {
  for (const key of keys) {
    const value = details[key];
    if (typeof value === 'string' && value) return value;
    if (Array.isArray(value) && value.length) return value.join(', ');
  }
  return '';
}

const DIMENSION_FIELDS: { label: string; get: (d: ProductDetails) => string }[] = [
  { label: 'Length',   get: (d) => pick(d, 'dimensionsLength', 'length', 'fixtureLength') },
  { label: 'Width',    get: (d) => pick(d, 'dimensionsWidth', 'width', 'fixtureWidth') },
  { label: 'Depth',    get: (d) => pick(d, 'dimensionsDepth', 'depth', 'fixtureDepth') },
  { label: 'Diameter', get: (d) => pick(d, 'dimensionsDiameter', 'diameter', 'fixtureDiameter') },
];

// One field list per component type, matching the legacy per-type field sets.
const SPEC_FIELDS: Record<ComponentLabel, { label: string; get: (d: ProductDetails) => string }[]> = {
  Fixture: [
    { label: 'Application',           get: (d) => pick(d, 'fixtureApplication', 'application') },
    { label: 'Style',                 get: (d) => pick(d, 'fixtureStyle', 'style') },
    { label: 'Mount',                 get: (d) => pick(d, 'fixtureMount', 'mount') },
    { label: 'Shape',                 get: (d) => pick(d, 'fixtureShape', 'shape') },
    { label: 'Lens Type',             get: (d) => pick(d, 'fixtureLens', 'lensType') },
    { label: 'Wattage',               get: (d) => pick(d, 'wattage') },
    { label: 'Lumens',                get: (d) => pick(d, 'lumens') },
    { label: 'CCT (K)',               get: (d) => pick(d, 'cct') },
    { label: 'CRI',                   get: (d) => pick(d, 'cri') },
    { label: 'L70 Lifetime (hours)',  get: (d) => pick(d, 'lifetime', 'l70Lifetime') },
    { label: 'Warranty (years)',      get: (d) => pick(d, 'fixtureWarranty', 'warranty') },
    { label: 'Voltage (min)',         get: (d) => pick(d, 'vMin', 'voltageMin') },
    { label: 'Voltage (max)',         get: (d) => pick(d, 'vMax', 'voltageMax') },
    { label: 'Fixture Color',         get: (d) => pick(d, 'fixtureColor') },
    { label: 'Trim',                  get: (d) => pick(d, 'trim') },
    { label: 'Ingress Protection',    get: (d) => pick(d, 'ingressProtection') },
    { label: 'Dimmability',           get: (d) => pick(d, 'dimmability') },
    { label: 'Color Tunable',         get: (d) => pick(d, 'colorTunable') },
    { label: 'Power Factor',          get: (d) => pick(d, 'powerFactor') },
    { label: 'CBCP',                  get: (d) => pick(d, 'cBCP', 'cbcp') },
    { label: 'THD (%)',               get: (d) => pick(d, 'thd') },
    { label: 'Beam Angle',            get: (d) => pick(d, 'beamAngle') },
    { label: 'Optics',                get: (d) => pick(d, 'optics') },
    { label: 'Buy America',           get: (d) => pick(d, 'buyAmerica') },
    { label: 'Certifications',        get: (d) => pick(d, 'certifications') },
  ],
  Lamp: [
    { label: 'Application',           get: (d) => pick(d, 'application') },
    { label: 'Category',              get: (d) => pick(d, 'lampCategory') },
    { label: 'Type',                  get: (d) => pick(d, 'lampCategoryType', 'type') },
    { label: 'Base Category',         get: (d) => pick(d, 'lampBaseCategory') },
    { label: 'Base Type',             get: (d) => pick(d, 'lampBaseCategoryType', 'baseType') },
    { label: 'Wattage',               get: (d) => pick(d, 'lampWattage', 'wattage') },
    { label: 'Lumens',                get: (d) => pick(d, 'lumens') },
    { label: 'CCT (K)',               get: (d) => pick(d, 'lampColorTemperature', 'cct') },
    { label: 'CRI',                   get: (d) => pick(d, 'cri') },
    { label: 'L70 Lifetime (hours)',  get: (d) => pick(d, 'lifetime', 'l70Lifetime') },
    { label: 'Warranty (years)',      get: (d) => pick(d, 'warranty') },
    { label: 'Voltage (min)',         get: (d) => pick(d, 'vMin', 'voltageMin') },
    { label: 'Voltage (max)',         get: (d) => pick(d, 'vMax', 'voltageMax') },
    { label: 'Lens Type',             get: (d) => pick(d, 'lampLensType', 'lensType') },
    { label: 'Ingress Protection',    get: (d) => pick(d, 'ingressProtection') },
    { label: 'Dimmability',           get: (d) => pick(d, 'dimmability') },
    { label: 'Color Tunable',         get: (d) => pick(d, 'colorTunable') },
    { label: 'Power Factor',          get: (d) => pick(d, 'powerFactor') },
    { label: 'CBCP',                  get: (d) => pick(d, 'cBCP', 'cbcp') },
    { label: 'THD (%)',               get: (d) => pick(d, 'thd') },
    { label: 'Beam Angle',            get: (d) => pick(d, 'beamAngle') },
    { label: 'Optics',                get: (d) => pick(d, 'optics') },
    { label: 'Buy America',           get: (d) => pick(d, 'buyAmerica') },
    { label: 'Certifications',        get: (d) => pick(d, 'certifications') },
  ],
  'Power Supply': [
    { label: 'Type',                  get: (d) => pick(d, 'powerSupplyType', 'type') },
    { label: 'Wattage',               get: (d) => pick(d, 'wattage') },
    { label: 'L70 Lifetime (hours)',  get: (d) => pick(d, 'lifetime', 'l70Lifetime') },
    { label: 'Warranty (years)',      get: (d) => pick(d, 'warranty') },
    { label: 'Voltage (min)',         get: (d) => pick(d, 'vMin', 'voltageMin') },
    { label: 'Voltage (max)',         get: (d) => pick(d, 'vMax', 'voltageMax') },
    { label: 'Dimmability',           get: (d) => pick(d, 'dimmability') },
    { label: 'Lamps Powered',         get: (d) => pick(d, 'lampPerFixture') },
    { label: 'Buy America',           get: (d) => pick(d, 'buyAmerica') },
    { label: 'Certifications',        get: (d) => pick(d, 'certifications') },
  ],
  Control: [
    { label: 'Type',                  get: (d) => pick(d, 'controlType', 'type') },
    { label: 'L70 Lifetime (hours)',  get: (d) => pick(d, 'lifetime', 'l70Lifetime') },
    { label: 'Warranty (years)',      get: (d) => pick(d, 'warranty') },
    { label: 'Voltage (min)',         get: (d) => pick(d, 'vMin', 'voltageMin') },
    { label: 'Voltage (max)',         get: (d) => pick(d, 'vMax', 'voltageMax') },
    { label: 'Dimmability',           get: (d) => pick(d, 'dimmability') },
    { label: 'Buy America',           get: (d) => pick(d, 'buyAmerica') },
    { label: 'Certifications',        get: (d) => pick(d, 'certifications') },
  ],
  Accessory: [
    { label: 'Color',                 get: (d) => pick(d, 'accessoryColorA', 'fixtureColor') },
    { label: 'L70 Lifetime (hours)',  get: (d) => pick(d, 'lifetime', 'l70Lifetime') },
    { label: 'Warranty (years)',      get: (d) => pick(d, 'warranty') },
    { label: 'Buy America',           get: (d) => pick(d, 'buyAmerica') },
    { label: 'Certifications',        get: (d) => pick(d, 'certifications') },
  ],
};

const CONTENT_WIDTH_PX = PAGE_WIDTH_PX - 112; // matches ReportPDFPage's p-14 (56px each side)

function SpecRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div>
      <div className="flex items-center justify-between whitespace-nowrap text-base">
        <span>{label}</span>
        <span className={bold ? 'font-bold' : 'font-semibold'}>{value}</span>
      </div>
      <div className="h-px bg-gray-200 my-2" />
    </div>
  );
}

function ComponentSpecPage({ componentLabel, details, companyName, pageNumber }: TechnicalSpecPage & { companyName: string; pageNumber: number }) {
  const image = pick(details, 'productImage', 'image', 'productImageHyperlink');
  const description = pick(details, 'description', 'supplierProductDescription');
  const orderCode = pick(details, 'orderCode');

  return (
    <ReportPDFPage title="Technical Specifications" companyName={companyName} pageNumber={pageNumber}>
      <div className="flex gap-8" style={{ width: CONTENT_WIDTH_PX }}>
        <div className="w-1/2">
          {image ? (
            <img src={image} alt={componentLabel} className="w-full object-cover border-2 border-gray-400" style={{ height: 320 }} />
          ) : (
            <div className="w-full border-2 border-gray-400" style={{ height: 320 }} />
          )}

          <h3 className="mt-8 mb-2 text-base font-bold bg-gray-100 rounded-lg px-3 py-2">Description</h3>
          <p className="text-base">{description}</p>

          <div className="mt-6">
            <SpecRow label="Component Type" value={componentLabel} bold />
            <SpecRow label="Order Code" value={orderCode} bold />
          </div>

          <h3 className="mt-6 mb-2 text-base font-bold bg-gray-100 rounded-lg px-3 py-2">Dimensions (inches)</h3>
          {DIMENSION_FIELDS.map((f) => <SpecRow key={f.label} label={f.label} value={f.get(details)} bold />)}
        </div>

        <div className="w-1/2">
          <div className="mb-2 text-base bg-gray-100 rounded-lg px-3 py-2">{componentLabel}</div>
          {SPEC_FIELDS[componentLabel].map((f) => <SpecRow key={f.label} label={f.label} value={f.get(details)} />)}
        </div>
      </div>
    </ReportPDFPage>
  );
}

/** Technical Info section of the Specifications PDF — every qualifying component gets its own dedicated page. */
export function TechnicalInfoPDF({ companyName, basePageNumber, pages }: TechnicalInfoPDFProps) {
  return (
    <>
      {pages.map((page, i) => (
        <ComponentSpecPage key={i} {...page} companyName={companyName} pageNumber={basePageNumber + i} />
      ))}
    </>
  );
}
