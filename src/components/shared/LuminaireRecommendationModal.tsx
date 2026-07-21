import { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Luminaire, Product } from '@/types/database';
import { useAuth } from '@/hooks/useAuth';
import { useProducts } from '@/hooks/use-products';

export interface CustomPricing {
  fixture?: boolean;
  lamp?: boolean;
  power?: boolean;
  control?: boolean;
  accessory?: boolean;
}

export interface LuminaireRecommendationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lum: Luminaire;
  componentLabel: string;
  /** Explicit supplier company scope. Falls back to the auth user's own company. */
  companyId?: number | null;
  /** Report-level custom pricing flags — pre-fills the "Show Custom Price" checkbox per component. */
  customPricing?: CustomPricing | null;
  onSave?: (label: string, qty: string, product: Product | null) => void;
}

const CUSTOM_PRICING_KEY: Record<ComponentLabel, keyof CustomPricing> = {
  Fixture:       'fixture',
  Lamp:          'lamp',
  'Power Supply':'power',
  Control:       'control',
  Accessory:     'accessory',
};

interface CustomPriceItem {
  id: number;
  description: string;
  customPricePerUnit: string;
}

const DUMMY_CUSTOM_PRICES: Record<ComponentLabel, CustomPriceItem[]> = {
  Fixture: [
    { id: 9001, description: 'Custom LED Fixture - Surface Mount 2x4', customPricePerUnit: '48.00' },
    { id: 9002, description: 'Custom LED Fixture - Recessed Downlight 6"', customPricePerUnit: '35.50' },
    { id: 9003, description: 'Custom LED Fixture - Linear Strip 4ft', customPricePerUnit: '62.00' },
    { id: 9004, description: 'Custom LED Fixture - High Bay 150W', customPricePerUnit: '120.00' },
    { id: 9005, description: 'Custom LED Fixture - Wall Pack 40W', customPricePerUnit: '75.00' },
  ],
  Lamp: [
    { id: 9011, description: 'Custom LED Lamp - T8 4ft 18W 5000K', customPricePerUnit: '8.50' },
    { id: 9012, description: 'Custom LED Lamp - A19 9W 3000K', customPricePerUnit: '4.25' },
    { id: 9013, description: 'Custom LED Lamp - PAR38 18W 4000K', customPricePerUnit: '14.00' },
    { id: 9014, description: 'Custom LED Lamp - MR16 7W 2700K', customPricePerUnit: '6.75' },
    { id: 9015, description: 'Custom LED Lamp - T5HO 4ft 24W 5000K', customPricePerUnit: '10.50' },
  ],
  'Power Supply': [
    { id: 9021, description: 'Custom Driver - 0-10V Dimmable 40W', customPricePerUnit: '22.00' },
    { id: 9022, description: 'Custom Driver - Constant Current 350mA', customPricePerUnit: '18.50' },
    { id: 9023, description: 'Custom Driver - Emergency Backup 90min', customPricePerUnit: '55.00' },
    { id: 9024, description: 'Custom Driver - DALI 60W', customPricePerUnit: '34.00' },
    { id: 9025, description: 'Custom Driver - Phase Dimming 25W', customPricePerUnit: '16.00' },
  ],
  Control: [
    { id: 9031, description: 'Custom Occupancy Sensor - PIR 180°', customPricePerUnit: '28.00' },
    { id: 9032, description: 'Custom Daylight Sensor - Analog 0-10V', customPricePerUnit: '42.00' },
    { id: 9033, description: 'Custom Smart Switch - Zigbee', customPricePerUnit: '38.00' },
    { id: 9034, description: 'Custom Wireless Dimmer - 0-10V', customPricePerUnit: '52.00' },
    { id: 9035, description: 'Custom Timer Control - 7-Day', customPricePerUnit: '24.00' },
  ],
  Accessory: [
    { id: 9041, description: 'Custom Mounting Bracket - Adjustable Arm', customPricePerUnit: '12.00' },
    { id: 9042, description: 'Custom Lens - Frosted Diffuser Panel', customPricePerUnit: '9.50' },
    { id: 9043, description: 'Custom Guard - Wire Cage', customPricePerUnit: '15.00' },
    { id: 9044, description: 'Custom Emergency Battery Pack', customPricePerUnit: '45.00' },
    { id: 9045, description: 'Custom Wireway - 4ft Section', customPricePerUnit: '18.00' },
  ],
};

const COMPONENT_ORDER = ['Accessory', 'Fixture', 'Lamp', 'Power Supply', 'Control'] as const;
type ComponentLabel = (typeof COMPONENT_ORDER)[number];

const CATEGORY_MAP: Record<ComponentLabel, string> = {
  Fixture: 'fixtures',
  Lamp: 'lamp',
  'Power Supply': 'power-supply',
  Control: 'control',
  Accessory: 'accessories',
};

function getProductLabel(product: Product, label: ComponentLabel): string {
  const d = product.details;
  switch (label) {
    case 'Fixture':      return d.fixtureDescription ?? d.description ?? '';
    case 'Lamp':         return d.lampDescription ?? d.description ?? '';
    case 'Power Supply': return d.powerSupplyDescription ?? d.description ?? '';
    case 'Control':      return d.controlDescription ?? d.description ?? '';
    case 'Accessory':    return d.accessoryDescriptionA ?? d.description ?? '';
    default:             return d.description ?? '';
  }
}

function SectionDivider({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 my-5">
      <div className="flex-1 h-px bg-gray-300" />
      <span className="text-[11px] font-semibold tracking-widest text-amber-600 uppercase">
        {title}
      </span>
      <div className="flex-1 h-px bg-gray-300" />
    </div>
  );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-sm font-medium text-[#2c628d] mb-1.5">{label}</p>
      {children}
    </div>
  );
}

function FilterRow({
  label,
  minValue,
  maxValue,
  onMinChange,
  onMaxChange,
}: {
  label: string;
  minValue: string;
  maxValue: string;
  onMinChange: (v: string) => void;
  onMaxChange: (v: string) => void;
}) {
  return (
    <>
      <span className="text-sm font-medium text-[#2c628d] self-center">{label}</span>
      <Input value={minValue} onChange={(e) => onMinChange(e.target.value)} className="h-9" />
      <Input value={maxValue} onChange={(e) => onMaxChange(e.target.value)} className="h-9" />
    </>
  );
}

export function LuminaireRecommendationModal({
  open,
  onOpenChange,
  lum,
  componentLabel,
  companyId: propCompanyId,
  customPricing,
  onSave,
}: LuminaireRecommendationModalProps) {
  const [currentLabel, setCurrentLabel] = useState<string>(componentLabel);
  const qty = lum.qty ?? '';
  const [selectedProductId, setSelectedProductId] = useState<string>('no-change');

  const getCustomPricingDefault = (label: string) =>
    !!(customPricing?.[CUSTOM_PRICING_KEY[label as ComponentLabel]]);

  const [filters, setFilters] = useState({
    wattageMin: '',
    wattageMax: '',
    lumensMin: '',
    lumensMax: '',
    colorMin: '',
    colorMax: '',
    priceMin: '',
    priceMax: '',
    certification: '',
    dimmability: '',
    showCustomPrice: getCustomPricingDefault(componentLabel),
    buyAmerican: false,
    type: '',
    manufacturer: '',
    model: '',
    productCode: '',
    dimensionsLength: '',
    dimensionsWidth: '',
    dimensionsDepth: '',
    dimensionsDiameter: '',
  });

  // Sync showCustomPrice default + reset product selection when navigating components
  useEffect(() => {
    setFilter('showCustomPrice', getCustomPricingDefault(currentLabel));
    setSelectedProductId('no-change');
  }, [currentLabel]);

  const { companyId: authCompanyId } = useAuth();
  const resolvedCompanyId = propCompanyId !== undefined ? propCompanyId : authCompanyId;

  const { data: productsData } = useProducts({
    companyId: resolvedCompanyId ?? undefined,
    isExisting: false,
    pageSize: 1000,
  });

  const recommendedOptions = (productsData?.rows ?? []).filter(
    (p) => p.airtable_colum_name === CATEGORY_MAP[currentLabel as ComponentLabel],
  );

  // When custom price is enabled, swap the dropdown to show dummy custom-price items.
  const displayOptions: { value: string; label: string }[] = filters.showCustomPrice
    ? DUMMY_CUSTOM_PRICES[currentLabel as ComponentLabel].map((item) => ({
        value: `custom-${item.id}`,
        label: `${item.description} — $${item.customPricePerUnit}`,
      }))
    : recommendedOptions.map((product) => ({
        value: String(product.id),
        label: getProductLabel(product, currentLabel as ComponentLabel) || `Product #${product.id}`,
      }));
  const selectedProduct: Product | null = (() => {
    if (selectedProductId === 'no-change') return null;
    if (selectedProductId.startsWith('custom-')) {
      const customId = Number(selectedProductId.replace('custom-', ''));
      const item = DUMMY_CUSTOM_PRICES[currentLabel as ComponentLabel].find((i) => i.id === customId);
      if (!item) return null;
      return {
        id: item.id,
        user_id: null, company_id: null, project_id: null, report_id: null, estimate_su_id: null,
        airtable_record: '', airtable_base: null, airtable_colum_name: '',
        is_existing: false, created_at: '', updated_at: null,
        details: { description: item.description, customPricePerUnit: item.customPricePerUnit, isCustomPrice: true },
      };
    }
    return recommendedOptions.find((p) => String(p.id) === selectedProductId) ?? null;
  })();

  const currentIndex = COMPONENT_ORDER.indexOf(currentLabel as ComponentLabel);
  const prevLabel = COMPONENT_ORDER[(currentIndex - 1 + COMPONENT_ORDER.length) % COMPONENT_ORDER.length];
  const nextLabel = COMPONENT_ORDER[(currentIndex + 1) % COMPONENT_ORDER.length];

  const luminaireDescription = (() => {
    switch (currentLabel) {
      case 'Fixture':      return lum.fixtureDescription ?? '';
      case 'Lamp':         return lum.lampDescription ?? '';
      case 'Power Supply': return lum.powerSupplyDescription ?? '';
      case 'Control':      return lum.controlDescription ?? '';
      case 'Accessory':    return lum.accessoryDescriptionA ?? '';
      default:             return '';
    }
  })();

  const setFilter = <K extends keyof typeof filters>(key: K, value: (typeof filters)[K]) =>
    setFilters((prev) => ({ ...prev, [key]: value }));

  const handleSave = () => {
    onSave?.(currentLabel, qty, selectedProduct);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 gap-0 overflow-hidden rounded-lg [&>button:last-child]:hidden">
        {/* Yellow header */}
        <div className="bg-[#f5c842] px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 flex-1 text-center">
            Luminaire Recommendation - {currentLabel}
          </h2>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="text-gray-700 hover:text-gray-900 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 overflow-y-auto max-h-[80vh]">
          {/* Luminaire Description + Navigate Components */}
          <div className="flex items-end gap-6">
            <div className="flex-1">
              <p className="text-sm font-semibold text-[#2c628d] mb-1.5">Luminaire Description</p>
              <Input readOnly value={luminaireDescription} className="bg-gray-100 text-gray-700" />
            </div>

            <div className="shrink-0 flex flex-col items-center gap-2">
              <div className="flex items-center gap-2 w-full">
                <div className="flex-1 h-px bg-gray-300" />
                <span className="text-xs text-gray-500 whitespace-nowrap">Navigate Components</span>
                <div className="flex-1 h-px bg-gray-300" />
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => { setCurrentLabel(prevLabel); setSelectedProductId('no-change'); }}
                  className="bg-[#2c628d] hover:bg-[#245079] text-white text-xs w-32"
                >
                  <ChevronLeft className="h-3.5 w-3.5 shrink-0" />
                  <span className="flex-1 text-center">{prevLabel}</span>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => { setCurrentLabel(nextLabel); setSelectedProductId('no-change'); }}
                  className="bg-[#2c628d] hover:bg-[#245079] text-white text-xs w-32"
                >
                  <span className="flex-1 text-center">{nextLabel}</span>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                </Button>
              </div>
            </div>
          </div>

          {/* Component Details */}
          <SectionDivider title={`${currentLabel} Details`} />

          <div className="flex items-end gap-4">
            <div className="w-40">
              <p className="text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                {
                  currentLabel === 'Lamp' ? 'QTY / Fixture' : 'QTY'
                }
                </p>
              <div className="h-9 flex items-center px-3 rounded-md border border-input bg-gray-100 text-sm text-gray-700">
                {qty || '—'}
              </div>
            </div>
            <div className="flex-1">
              <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                <SelectTrigger className="bg-gray-100">
                  <SelectValue placeholder="No Change" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no-change">No Change</SelectItem>
                  {displayOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Filters */}
          <SectionDivider title="Filters" />

          {(currentLabel === 'Power Supply' || currentLabel === 'Control' || currentLabel === 'Accessory' ) ? (
            <div className="grid grid-cols-4 gap-4">
              <FilterField label="Type:">
                <Select value={filters.type} onValueChange={(v) => setFilter('type', v)}>
                  <SelectTrigger className="bg-gray-100">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Standard">Standard</SelectItem>
                    <SelectItem value="Dimming">Dimming</SelectItem>
                    <SelectItem value="DALI">DALI</SelectItem>
                    <SelectItem value="0-10V">0-10V</SelectItem>
                  </SelectContent>
                </Select>
              </FilterField>
              <FilterField label="Manufacturer:">
                <Select value={filters.manufacturer} onValueChange={(v) => setFilter('manufacturer', v)}>
                  <SelectTrigger className="bg-gray-100">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent />
                </Select>
              </FilterField>
              <FilterField label="Model:">
                <Input value={filters.model} onChange={(e) => setFilter('model', e.target.value)} />
              </FilterField>
              <FilterField label="Product Code:">
                <Input value={filters.productCode} onChange={(e) => setFilter('productCode', e.target.value)} />
              </FilterField>

              <FilterField label="Dimensions-Length (in):">
                <Input value={filters.dimensionsLength} onChange={(e) => setFilter('dimensionsLength', e.target.value)} />
              </FilterField>
              <FilterField label="Dimensions-Width (in):">
                <Input value={filters.dimensionsWidth} onChange={(e) => setFilter('dimensionsWidth', e.target.value)} />
              </FilterField>
              <FilterField label="Dimensions-Depth (in):">
                <Input value={filters.dimensionsDepth} onChange={(e) => setFilter('dimensionsDepth', e.target.value)} />
              </FilterField>
              <FilterField label="Dimensions-Diameter (in):">
                <Input value={filters.dimensionsDiameter} onChange={(e) => setFilter('dimensionsDiameter', e.target.value)} />
              </FilterField>
            </div>
          ) : (
          <div className="grid grid-cols-[160px_1fr_1fr] items-center gap-x-4 gap-y-3">
            {/* Column headers */}
            <div />
            <p className="text-xs font-bold text-center text-gray-700 uppercase tracking-wide">Minimum</p>
            <p className="text-xs font-bold text-center text-gray-700 uppercase tracking-wide">Maximum</p>

            <FilterRow
              label="Wattage"
              minValue={filters.wattageMin}
              maxValue={filters.wattageMax}
              onMinChange={(v) => setFilter('wattageMin', v)}
              onMaxChange={(v) => setFilter('wattageMax', v)}
            />
            <FilterRow
              label="Lumens"
              minValue={filters.lumensMin}
              maxValue={filters.lumensMax}
              onMinChange={(v) => setFilter('lumensMin', v)}
              onMaxChange={(v) => setFilter('lumensMax', v)}
            />
            <FilterRow
              label="Color"
              minValue={filters.colorMin}
              maxValue={filters.colorMax}
              onMinChange={(v) => setFilter('colorMin', v)}
              onMaxChange={(v) => setFilter('colorMax', v)}
            />
            <FilterRow
              label="Price"
              minValue={filters.priceMin}
              maxValue={filters.priceMax}
              onMinChange={(v) => setFilter('priceMin', v)}
              onMaxChange={(v) => setFilter('priceMax', v)}
            />

            {/* Certification — full width */}
            <span className="text-sm font-medium text-[#2c628d] self-center">Certification</span>
            <div className="col-span-2">
              <Select
                value={filters.certification}
                onValueChange={(v) => setFilter('certification', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UL">UL</SelectItem>
                  <SelectItem value="ETL">ETL</SelectItem>
                  <SelectItem value="DLC">DLC</SelectItem>
                  <SelectItem value="Energy Star">Energy Star</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Dimmability — full width */}
            <span className="text-sm font-medium text-[#2c628d] self-center">Dimmability</span>
            <div className="col-span-2">
              <Select
                value={filters.dimmability}
                onValueChange={(v) => setFilter('dimmability', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Dimmable">Dimmable</SelectItem>
                  <SelectItem value="Non-Dimmable">Non-Dimmable</SelectItem>
                  <SelectItem value="0-10V">0-10V</SelectItem>
                  <SelectItem value="TRIAC">TRIAC</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          )}

          {/* Show Custom Price + Buy American */}
          <div className="flex items-center justify-between mt-4 pt-2">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-[#2c628d] leading-tight">
                Show Custom<br />Price Options
              </span>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="custom-price"
                  checked={filters.showCustomPrice}
                  onCheckedChange={(v) => {
                    setFilter('showCustomPrice', !!v);
                    setSelectedProductId('no-change');
                  }}
                />
                <label htmlFor="custom-price" className="text-sm text-gray-600 cursor-pointer">
                  Yes
                </label>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-[#2c628d]">Buy American</span>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="buy-american"
                  checked={filters.buyAmerican}
                  onCheckedChange={(v) => setFilter('buyAmerican', !!v)}
                />
                <label htmlFor="buy-american" className="text-sm text-gray-600 cursor-pointer">
                  Yes
                </label>
              </div>
            </div>
          </div>

          {/* Footer actions */}
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="bg-[#2c628d] hover:bg-[#245079] text-white"
              onClick={handleSave}
            >
              Apply
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
