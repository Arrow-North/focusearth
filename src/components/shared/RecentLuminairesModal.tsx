import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { buildLuminaireSummary } from '@/lib/formatters';

// ── Types ────────────────────────────────────────────────────────────

export interface LumRowData {
  qty?: string;
  fixtureMountHeight?: string;
  fixtureDescription?: string;
  lampPerFixture?: string;
  lampDescription?: string;
  powerQTYFixture?: string;
  powerSupplyDescription?: string;
  controlQTYFixture?: string;
  controlDescription?: string;
  accessoryDescriptionAQty?: string;
  accessoryDescriptionA?: string;
  wattage?: string;
}

export interface AreaOption {
  title: string;
  application?: string;
  luminaires: LumRowData[];
}

interface FlatLuminaire extends LumRowData {
  areaName: string;
  areaApplication: string;
  label: string;
  key: string;
}

interface RecentLuminairesModalProps {
  open: boolean;
  onClose: () => void;
  areas: AreaOption[];
  onApply: (data: LumRowData) => void;
}

// ── Component ────────────────────────────────────────────────────────

export function RecentLuminairesModal({
  open,
  onClose,
  areas,
  onApply,
}: RecentLuminairesModalProps) {
  const [qty, setQty] = useState('');
  const [mountHeight, setMountHeight] = useState('');
  const [selectedKey, setSelectedKey] = useState('');
  const [filterApplication, setFilterApplication] = useState('');
  const [filterArea, setFilterArea] = useState('');
  const [filterStyle, setFilterStyle] = useState('');
  const [filterWattage, setFilterWattage] = useState('');

  // Flatten all luminaires across all areas into a single selectable list
  const allLuminaires = useMemo<FlatLuminaire[]>(() => {
    const result: FlatLuminaire[] = [];
    areas.forEach((area, ai) => {
      const areaName = area.title || area.application || `Area ${ai + 1}`;
      (area.luminaires ?? []).forEach((lum, li) => {
        const summary = buildLuminaireSummary(lum) || `Luminaire ${li + 1}`;
        result.push({
          ...lum,
          areaName,
          areaApplication: area.application ?? '',
          label: summary,
          key: `lum-${ai}-${li}`,
        });
      });
    });
    return result;
  }, [areas]);

  const applicationOptions = useMemo(
    () => [...new Set(areas.map((a) => a.application).filter(Boolean))] as string[],
    [areas],
  );

  const areaNameOptions = useMemo(
    () => [...new Set(areas.map((a, ai) => a.title || a.application || `Area ${ai + 1}`))],
    [areas],
  );

  const filteredLuminaires = useMemo(
    () =>
      allLuminaires.filter((lum) => {
        if (filterApplication && lum.areaApplication !== filterApplication) return false;
        if (filterArea && lum.areaName !== filterArea) return false;
        if (
          filterWattage &&
          !(lum.wattage ?? '').toLowerCase().includes(filterWattage.toLowerCase())
        )
          return false;
        if (filterStyle) {
          const desc = (lum.fixtureDescription ?? '').toLowerCase();
          if (!desc.includes(filterStyle.toLowerCase())) return false;
        }
        return true;
      }),
    [allLuminaires, filterApplication, filterArea, filterWattage, filterStyle],
  );

  const selectedLum = filteredLuminaires.find((l) => l.key === selectedKey);

  const reset = () => {
    setQty('');
    setMountHeight('');
    setSelectedKey('');
    setFilterApplication('');
    setFilterArea('');
    setFilterStyle('');
    setFilterWattage('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSelectLuminaire = (key: string) => {
    setSelectedKey(key);
    const lum = filteredLuminaires.find((l) => l.key === key);
    if (lum) {
      if (!qty) setQty(lum.qty ?? '');
      if (!mountHeight) setMountHeight(lum.fixtureMountHeight ?? '');
    }
  };

  const handleApply = () => {
    if (!selectedLum) return;
    onApply({
      ...selectedLum,
      qty: qty || selectedLum.qty || '',
      fixtureMountHeight: mountHeight || selectedLum.fixtureMountHeight || '',
    });
    handleClose();
  };

  const clearFilter = (setter: (v: string) => void) => (v: string) => {
    setter(v === '__all__' ? '' : v);
    setSelectedKey('');
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-4xl p-0 gap-0 overflow-hidden rounded-lg">
        <DialogHeader className="bg-[#8aafc5] px-6 py-4">
          <DialogTitle className="text-white text-xl font-semibold text-center tracking-wide">
            Recent Luminaires
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 py-5 space-y-5">
          {/* QTY / Mount Height / Luminaire Options */}
          <div className="grid grid-cols-[90px_160px_1fr] gap-4 items-end">
            <div>
              <Label className="text-sm font-semibold text-[#3B4A6B]">QTY</Label>
              <Input
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm font-semibold text-[#3B4A6B]">Mount Height</Label>
              <Input
                value={mountHeight}
                onChange={(e) => setMountHeight(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm font-semibold text-[#3B4A6B]">Luminaire Options</Label>
              <Select value={selectedKey} onValueChange={handleSelectLuminaire}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent className="w-[var(--radix-select-trigger-width)] max-w-[var(--radix-select-trigger-width)]">
                  {filteredLuminaires.length === 0 ? (
                    <SelectItem value="__none__" disabled>
                      No luminaires found
                    </SelectItem>
                  ) : (
                    filteredLuminaires.map((lum) => (
                      <SelectItem key={lum.key} value={lum.key} className="whitespace-normal break-words">
                        {lum.label}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Filters divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 border-t border-gray-200" />
            <span className="text-xs font-bold text-[#3B4A6B] tracking-[0.2em] uppercase">
              Filters
            </span>
            <div className="flex-1 border-t border-gray-200" />
          </div>

          {/* Filter fields */}
          <div className="grid grid-cols-4 gap-4">
            <div>
              <Label className="text-sm font-semibold text-[#3B4A6B]">Application</Label>
              <Select
                value={filterApplication || '__all__'}
                onValueChange={clearFilter(setFilterApplication)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Select</SelectItem>
                  {applicationOptions.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-semibold text-[#3B4A6B]">Area</Label>
              <Select
                value={filterArea || '__all__'}
                onValueChange={clearFilter(setFilterArea)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Select</SelectItem>
                  {areaNameOptions.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-semibold text-[#3B4A6B]">Component Style</Label>
              <Select
                value={filterStyle || '__all__'}
                onValueChange={clearFilter(setFilterStyle)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Select</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-semibold text-[#3B4A6B]">Wattage</Label>
              <Input
                value={filterWattage}
                onChange={(e) => {
                  setFilterWattage(e.target.value);
                  setSelectedKey('');
                }}
                className="mt-1"
              />
            </div>
          </div>

          {/* Apply */}
          <div className="flex justify-end pt-2">
            <Button
              type="button"
              onClick={handleApply}
              disabled={!selectedKey}
              className="bg-[#3B4A6B] hover:bg-[#4B5A7B] text-white px-10"
            >
              Apply
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
