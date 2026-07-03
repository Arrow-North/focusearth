import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Luminaire, ProductDetails } from '@/types/database';

interface ProductDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lum: Luminaire;
  componentLabel: string;
}

function str(val: unknown): string | undefined {
  if (val === null || val === undefined) return undefined;
  return String(val);
}

function dimRange(min: unknown, max: unknown): string | undefined {
  if (min === undefined && max === undefined) return undefined;
  if (min !== undefined && max !== undefined) return `${min} - ${max}`;
  return str(min ?? max);
}

function getDetailsFromLuminaire(lum: Luminaire, label: string): ProductDetails {
  switch (label) {
    case 'Fixture': {
      const fx = lum.fixtureExisting ?? {};
      return {
        description: str(fx['Name']) ?? lum.fixtureDescription,
        productType: 'Fixture',
        wattage: str(fx['wattage']),
        application: str(fx['Application']),
        style: str(fx['Style']),
        mount: str(fx['Mount']),
        length: dimRange(fx['Length MIN (in)'], fx['Length MAX (in)']),
        width: dimRange(fx['Width MIN (in)'], fx['Width MAX (in)']),
        diameter: dimRange(fx['Diameter MIN (in)'], fx['Diameter MAX (in)']),
        depth: dimRange(fx['Depth MIN (in)'], fx['Depth MAX (in)']),
        l70Lifetime: str(fx['Lifetime (hrs)']),
        installationTime: str(fx['Installation Time (min)']),
        pricePerUnit: fx['PPU ($)'] !== undefined ? str(fx['PPU ($)']) + '$' : lum.fixturePricePerUnit,
      };
    }
    case 'Lamp':
      return {
        description: lum.lampDescription,
        productType: 'Lamp',
        wattage: lum.lampWattage,
        cct: lum.lampColorTemperature,
        lensType: lum.lampLensType,
        orderCode: lum.lampProductCode,
        pricePerUnit: lum.lampPricePerUnit,
      };
    case 'Power Supply': {
      const ps = lum.powerSupplyExisting ?? {};
      return {
        description: lum.powerSupplyDescription,
        productType: 'Power Supply',
        manufacturer: lum.powerSupplyManufacturer,
        orderCode: lum.powerSupplyProductCode,
        type: lum.powerSupplyType,
        lifetime: str(ps['Lifetime (hrs)']),
        installationTime: str(ps['Installation Time (min)']),
        pricePerUnit: ps['PPU ($)'] !== undefined ? str(ps['PPU ($)']) + '$' : lum.powerPricePerUnit,
      };
    }
    case 'Control': {
      const ctl = lum.controlExisting ?? {};
      return {
        description: lum.controlDescription,
        productType: 'Control',
        manufacturer: lum.controlManufacturer,
        type: lum.controlType,
        dimmability: lum.controlDimming,
        lifetime: str(ctl['Lifetime (hrs)']),
        installationTime: str(ctl['Installation Time (min)']),
        pricePerUnit: ctl['PPU ($)'] !== undefined ? str(ctl['PPU ($)']) + '$' : lum.controlPricePerUnit,
      };
    }
    case 'Accessory': {
      const acc = lum.accessoryExisting ?? {};
      return {
        description: lum.accessoryDescriptionA,
        productType: 'Accessory',
        manufacturer: lum.accessoryManufacturerA,
        orderCode: lum.accessoryProductCodeA,
        type: lum.accessoryTypeA,
        length: lum.accessoryLengthA,
        width: lum.accessoryWidthA,
        diameter: lum.accessoryDiameterA,
        depth: lum.accessoryDepthA,
        lifetime: str(acc['Lifetime (hrs)']),
        installationTime: str(acc['Installation Time (min)']),
        pricePerUnit: acc['PPU ($)'] !== undefined ? str(acc['PPU ($)']) + '$' : lum.accessoryPricePerUnitA,
      };
    }
    default:
      return {};
  }
}

const GENERIC_COL_1_FIELDS: { key: keyof ProductDetails; label: string }[] = [
  { key: 'length', label: 'Dimensions - Length (in):' },
  { key: 'width', label: 'Dimensions - Width (in):' },
  { key: 'diameter', label: 'Dimensions - Diameter (in):' },
  { key: 'depth', label: 'Dimensions - Depth (in):' },
  { key: 'application', label: 'Application:' },
  { key: 'style', label: 'Style:' },
  { key: 'mount', label: 'Mount:' },
  { key: 'shape', label: 'Shape:' },
  { key: 'lensType', label: 'Lens Type:' },
  { key: 'ingressProtection', label: 'Ingress Protection:' },
  { key: 'fixtureColor', label: 'Fixture Color:' },
  { key: 'trim', label: 'Trim:' },
];

const GENERIC_COL_2_FIELDS: { key: keyof ProductDetails; label: string }[] = [
  { key: 'wattage', label: 'Wattage:' },
  { key: 'lumens', label: 'Lumens:' },
  { key: 'cct', label: 'CCT (K°):' },
  { key: 'cri', label: 'CRI:' },
  { key: 'l70Lifetime', label: 'L70 Lifetime (hours):' },
  { key: 'warranty', label: 'Warranty (years):' },
  { key: 'voltageMin', label: 'Voltage (min):' },
  { key: 'voltageMax', label: 'Voltage (max):' },
  { key: 'dimmability', label: 'Dimmability:' },
  { key: 'colorTunable', label: 'Color Tunable:' },
  { key: 'powerFactor', label: 'Power Factor:' },
  { key: 'cbcp', label: 'CBCP:' },
];

const GENERIC_COL_3_FIELDS: { key: keyof ProductDetails; label: string }[] = [
  { key: 'thd', label: 'THD (%):' },
  { key: 'beamAngle', label: 'Beam Angle:' },
  { key: 'optics', label: 'Optics:' },
  { key: 'certifications', label: 'Certifications:' },
  { key: 'buyAmerica', label: 'Buy America:' },
  { key: 'installationTime', label: 'Installation (minutes):' },
  { key: 'deliveryDays', label: 'Delivery (days):' },
  { key: 'pricePerUnit', label: 'Price Per Unit ($):' },
  { key: 'volumeTier1Qty', label: 'Vol. Tier 1 (min qty):' },
  { key: 'volumeTier1PPU', label: 'Vol. Tier 1 PPU ($):' },
  { key: 'volumeTier2Qty', label: 'Vol. Tier 2 (min qty):' },
  { key: 'volumeTier2PPU', label: 'Vol. Tier 2 PPU ($):' },
];

// Power Supply, Control, and Accessory share this layout — dimensions/electrical
// specs and component-level pricing rather than fixture/lamp optical specs.
const COMPONENT_COL_1_FIELDS: { key: keyof ProductDetails; label: string }[] = [
  { key: 'length', label: 'Dimensions - Length (in):' },
  { key: 'width', label: 'Dimensions - Width (in):' },
  { key: 'diameter', label: 'Dimensions - Diameter (in):' },
  { key: 'depth', label: 'Dimensions - Depth (in):' },
  { key: 'type', label: 'Type:' },
  { key: 'voltageMin', label: 'Voltage (min):' },
];

const COMPONENT_COL_2_FIELDS: { key: keyof ProductDetails; label: string }[] = [
  { key: 'voltageMax', label: 'Voltage (max):' },
  { key: 'dimmability', label: 'Dimmability:' },
  { key: 'lifetime', label: 'Lifetime (hours):' },
  { key: 'warranty', label: 'Warranty (years):' },
  { key: 'certifications', label: 'Certifications:' },
  { key: 'buyAmerica', label: 'Buy America:' },
];

const COMPONENT_COL_3_FIELDS: { key: keyof ProductDetails; label: string }[] = [
  { key: 'installationTime', label: 'Installation (minutes):' },
  { key: 'deliveryDays', label: 'Delivery (days):' },
  { key: 'pricePerUnit', label: 'Price Per Unit ($):' },
  { key: 'volumeTier1Qty', label: 'Vol. Tier 1 (min qty):' },
  { key: 'volumeTier1PPU', label: 'Vol. Tier 1 PPU ($):' },
  { key: 'volumeTier2Qty', label: 'Vol. Tier 2 (min qty):' },
  { key: 'volumeTier2PPU', label: 'Vol. Tier 2 PPU ($):' },
];

const COMPONENT_LAYOUT_LABELS = ['Power Supply', 'Control', 'Accessory'];

function FieldRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-baseline justify-between py-1.5 border-b border-gray-100 last:border-b-0 gap-2">
      <span className="text-xs text-gray-500 shrink-0">{label}</span>
      {value && <span className="text-xs text-gray-900 text-right font-medium">{value}</span>}
    </div>
  );
}

export function ProductDetailsModal({ open, onOpenChange, lum, componentLabel }: ProductDetailsModalProps) {
  const details = getDetailsFromLuminaire(lum, componentLabel);
  const [orderCodeVisible, setOrderCodeVisible] = useState(false);

  const isComponentLayout = COMPONENT_LAYOUT_LABELS.includes(componentLabel);
  const col1Fields = isComponentLayout ? COMPONENT_COL_1_FIELDS : GENERIC_COL_1_FIELDS;
  const col2Fields = isComponentLayout ? COMPONENT_COL_2_FIELDS : GENERIC_COL_2_FIELDS;
  const col3Fields = isComponentLayout ? COMPONENT_COL_3_FIELDS : GENERIC_COL_3_FIELDS;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 gap-0 overflow-hidden rounded-lg">
        {/* Header */}
        <DialogHeader className="bg-[#1e3d5c] px-6 py-4 rounded-t-lg">
          <DialogTitle className="text-white text-lg font-semibold tracking-wide">
            Product Details
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-5 overflow-y-auto max-h-[80vh]">
          {/* Top info row */}
          <div className="flex gap-5 items-start">
            {/* Image placeholder */}
            <div className="w-24 h-24 border border-gray-300 rounded flex-shrink-0 bg-white overflow-hidden">
              {details.productImage && (
                <img src={details.productImage} alt="Product" className="w-full h-full object-contain" />
              )}
            </div>

            {/* Meta fields */}
            <div className="flex-1 grid grid-cols-2 gap-x-10 gap-y-1.5 text-sm">
              <div>
                <span className="font-semibold">Supplier:</span>{' '}
                <span className="text-gray-700">{details.supplier ?? 'Focus Earth'}</span>
              </div>
              <div>
                <span className="font-semibold">Product Type:</span>{' '}
                <span className="text-gray-700">{details.productType ?? ''}</span>
              </div>
              <div>
                <span className="font-semibold">Manufacturer:</span>{' '}
                <span className="text-gray-700">{details.manufacturer ?? ''}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold">Order Code:</span>{' '}
                <span className="text-gray-700">
                  {details.orderCode
                    ? orderCodeVisible
                      ? details.orderCode
                      : '••••••••'
                    : ''}
                </span>
                {details.orderCode && (
                  <button
                    type="button"
                    onClick={() => setOrderCodeVisible((v) => !v)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {orderCodeVisible
                      ? <EyeOff className="h-3.5 w-3.5" />
                      : <Eye className="h-3.5 w-3.5" />
                    }
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Three column field grid */}
          <div className="grid grid-cols-3 gap-4">
            <div className="border border-gray-200 rounded p-3">
              {col1Fields.map((f) => (
                <FieldRow key={f.key} label={f.label} value={str(details[f.key])} />
              ))}
            </div>
            <div className="border border-gray-200 rounded p-3">
              {col2Fields.map((f) => (
                <FieldRow key={f.key} label={f.label} value={str(details[f.key])} />
              ))}
            </div>
            <div className="border border-gray-200 rounded p-3">
              {col3Fields.map((f) => (
                <FieldRow key={f.key} label={f.label} value={str(details[f.key])} />
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}