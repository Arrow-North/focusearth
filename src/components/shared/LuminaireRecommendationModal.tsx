import { useState } from 'react';
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
import type { Luminaire } from '@/types/database';

export interface LuminaireRecommendationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lum: Luminaire;
  componentLabel: string;
  onSave?: (label: string, qty: string, changeType: string) => void;
}

const COMPONENT_ORDER = ['Accessory', 'Fixture', 'Lamp', 'Power Supply', 'Control'] as const;
type ComponentLabel = (typeof COMPONENT_ORDER)[number];

interface RecommendedLuminaireOption {
  id: string;
  label: string;
}

const RECOMMENDED_LUMINAIRE_OPTIONS: Partial<Record<ComponentLabel, RecommendedLuminaireOption[]>> = {
  Fixture: [
    { id: 'fix-1',  label: '7.50"x3.03" Can Frosted 18W 1260L 2700K 90CRI 14ETA $4.50' },
    { id: 'fix-2',  label: '7.50"x3.03" Can Frosted 12W 840L 2700K 90CRI 14ETA $4.50' },
    { id: 'fix-3',  label: '5.7"x2.5" Can Frosted 13W 800L 4000K 90CRI ETA $4.50' },
    { id: 'fix-4',  label: '5.70"x2.5" Can Frosted 13W 800L 4000K 90CRI 14ETA $4.50' },
    { id: 'fix-5',  label: '4.72"x0.76" Can Frosted 9W 600L 5000K 80CRI 14ETA $4.50' },
    { id: 'fix-6',  label: '4.72"x4.72"x0.43" Can Frosted 9W 600L 4000K 80CRI 14ETA $4.50' },
    { id: 'fix-7',  label: '4.72"x0.76" Can Frosted 9W 600L 4000K 80CRI 14ETA $4.50' },
    { id: 'fix-8',  label: '6.75"x0.78" Can Frosted 12W 900L 4000K 90CRI 14ETA $6.00' },
    { id: 'fix-9',  label: '6.75"x0.78" Can Frosted 12W 900L 5000K 80CRI 14ETA $6.00' },
    { id: 'fix-10', label: '6.77"x6.77"x0.47" Can Frosted 12W 900L 4000K 80CRI 14ETA $6.00' },
    { id: 'fix-11', label: '6.77"x6.77"x0.47" Can Frosted 12W 900L 3000K 80CRI 14ETA $6.00' },
    { id: 'fix-12', label: '7.40"x2.9" Can Frosted 13.5W 800L 4000K 90CRI 14ETA $7.80' },
    { id: 'fix-13', label: '24"x48"x" Troffer Acrylic 34W 3400L 2500K 83CRI 7ETA $75.00' },
  ],
};

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
  onSave,
}: LuminaireRecommendationModalProps) {
  const [currentLabel, setCurrentLabel] = useState<string>(componentLabel);
  const qty = lum.qty ?? '';
  const [changeType, setChangeType] = useState('No Change');
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
    showCustomPrice: false,
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
    onSave?.(currentLabel, qty, changeType);
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
                  onClick={() => setCurrentLabel(prevLabel)}
                  className="bg-[#2c628d] hover:bg-[#245079] text-white text-xs w-32"
                >
                  <ChevronLeft className="h-3.5 w-3.5 shrink-0" />
                  <span className="flex-1 text-center">{prevLabel}</span>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setCurrentLabel(nextLabel)}
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
              <Select value={changeType} onValueChange={setChangeType}>
                <SelectTrigger className="bg-gray-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="No Change">No Change</SelectItem>
                  {(RECOMMENDED_LUMINAIRE_OPTIONS[currentLabel as ComponentLabel] ?? []).map((opt) => (
                    <SelectItem key={opt.id} value={opt.label}>{opt.label}</SelectItem>
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
                  onCheckedChange={(v) => setFilter('showCustomPrice', !!v)}
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
