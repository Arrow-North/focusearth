import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, X } from 'lucide-react';

export interface LuminaireFixture {
  qty: string; mountHeight: string; description: string;
  application: string; mount: string; style: string; lens: string;
  dimLength: string; dimWidth: string; dimDepth: string; dimDiameter: string;
  pricePerUnit: string;
}

export interface LuminaireLamp {
  qtyPerFixture: string; description: string;
  category: string; type: string; baseCategory: string; baseCategoryType: string;
  wattage: string; colorTemp: string; lensType: string; productCode: string;
  pricePerUnit: string; led: string;
}

export interface LuminairePowerSupply {
  qtyPerFixture: string; description: string;
  type: string; manufacturer: string; model: string; productCode: string;
  pricePerUnit: string;
}

export interface LuminaireControl {
  qtyPerFixture: string; description: string;
  type: string; manufacturer: string; dimming: string; model: string;
  pricePerUnit: string;
}

export interface LuminaireAccessory {
  selected: boolean; qtyPerFixture: string; description: string;
  type: string; manufacturer: string; color: string; productCode: string;
  dimLength: string; dimWidth: string; dimDepth: string; dimDiameter: string;
  pricePerUnit: string;
}

export interface Luminaire {
  luminaireDescription: string;
  fixture: LuminaireFixture;
  lamp: LuminaireLamp;
  powerSupply: LuminairePowerSupply;
  control: LuminaireControl;
  accessories: LuminaireAccessory[];
}

export const COMPONENT_TABS = ['fixture', 'lamp', 'powerSupply', 'control', 'accessories'] as const;
export type ComponentTab = typeof COMPONENT_TABS[number];

export const TAB_LABELS: Record<ComponentTab, string> = {
  fixture: 'Fixture',
  lamp: 'Lamp',
  powerSupply: 'Power Supply',
  control: 'Control',
  accessories: 'Accessories',
};

export function createEmptyLuminaire(): Luminaire {
  return {
    luminaireDescription: '',
    fixture: { qty: '', mountHeight: '', description: '', application: '', mount: '', style: '', lens: '', dimLength: '', dimWidth: '', dimDepth: '', dimDiameter: '', pricePerUnit: '' },
    lamp: { qtyPerFixture: '', description: '', category: '', type: '', baseCategory: '', baseCategoryType: '', wattage: '', colorTemp: '', lensType: '', productCode: '', pricePerUnit: '', led: 'No' },
    powerSupply: { qtyPerFixture: '', description: '', type: '', manufacturer: '', model: '', productCode: '', pricePerUnit: '' },
    control: { qtyPerFixture: '', description: '', type: '', manufacturer: '', dimming: '', model: '', pricePerUnit: '' },
    accessories: [{ selected: true, qtyPerFixture: '', description: '', type: '', manufacturer: '', color: '', productCode: '', dimLength: '', dimWidth: '', dimDepth: '', dimDiameter: '', pricePerUnit: '' }],
  };
}

export function buildFixtureSection(f: LuminaireFixture): string {
  const dims = [f.dimLength, f.dimWidth, f.dimDepth, f.dimDiameter].filter(Boolean);
  return [...(dims.length ? [dims.join('x')] : []), f.mount, f.style].filter(Boolean).join(' ');
}

export function buildLampSection(l: LuminaireLamp): string {
  return [
    l.led === 'Yes' ? 'LED' : '',
    l.category, l.type, l.baseCategory, l.baseCategoryType,
    l.wattage ? `${l.wattage}W` : '',
    l.colorTemp ? `${l.colorTemp}K` : '',
    l.lensType, l.productCode,
  ].filter(Boolean).join(' ');
}

export function buildPowerSupplySection(ps: LuminairePowerSupply): string {
  return [ps.type, ps.manufacturer, ps.model, ps.productCode].filter(Boolean).join(' ');
}

export function buildControlSection(c: LuminaireControl): string {
  return [c.type, c.manufacturer, c.dimming, c.model].filter(Boolean).join(' ');
}

export function buildAccessorySection(a: LuminaireAccessory): string {
  return [a.type, a.manufacturer, a.color, a.productCode].filter(Boolean).join(' ');
}

export function buildLuminaireDescription(lum: Luminaire): string {
  return [
    buildFixtureSection(lum.fixture),
    buildLampSection(lum.lamp),
    buildPowerSupplySection(lum.powerSupply),
    buildControlSection(lum.control),
    ...lum.accessories.filter((a) => a.selected).map(buildAccessorySection).filter(Boolean),
  ].filter(Boolean).join(' , ');
}

export function LuminaireModal({
  open, onClose, tab, setTab, luminaire, onChange,
}: {
  open: boolean;
  onClose: () => void;
  tab: ComponentTab;
  setTab: (t: ComponentTab) => void;
  luminaire: Luminaire | undefined;
  onChange: (patch: Partial<Luminaire>) => void;
}) {
  if (!luminaire) return null;

  const currentIdx = COMPONENT_TABS.indexOf(tab);
  const prevTab = COMPONENT_TABS[(currentIdx - 1 + COMPONENT_TABS.length) % COMPONENT_TABS.length];
  const nextTab = COMPONENT_TABS[(currentIdx + 1) % COMPONENT_TABS.length];

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-0">
        <DialogHeader className="bg-[#C8A84D] px-6 py-4 rounded-t-lg">
          <DialogTitle className="text-white text-lg">
            Luminaire Details - {TAB_LABELS[tab]}
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 py-4 space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <Label className="text-[#5B6FAF] font-semibold text-sm">Luminaire Description</Label>
              <Textarea
                value={luminaire.luminaireDescription}
                readOnly
                onMouseDown={(e) => e.preventDefault()}
                rows={1}
                className="bg-muted/50 cursor-default resize-none overflow-hidden min-h-0"
                style={{ fieldSizing: 'content' } as never}
                tabIndex={-1}
              />
            </div>
            <div className="text-right space-y-1">
              <span className="text-xs text-muted-foreground block">Navigate Components</span>
              <div className="flex gap-1">
                <Button size="sm" className="bg-[#3B4A6B] hover:bg-[#4B5A7B] text-white text-xs" onClick={() => setTab(prevTab)}>
                  &lsaquo; {TAB_LABELS[prevTab]}
                </Button>
                <Button size="sm" className="bg-[#3B4A6B] hover:bg-[#4B5A7B] text-white text-xs" onClick={() => setTab(nextTab)}>
                  {TAB_LABELS[nextTab]} &rsaquo;
                </Button>
              </div>
            </div>
          </div>

          {tab === 'fixture' && <FixtureTab fixture={luminaire.fixture} onChange={(f) => {
            const updated = { ...luminaire.fixture, ...f };
            updated.description = buildFixtureSection(updated);
            onChange({ fixture: updated, luminaireDescription: buildLuminaireDescription({ ...luminaire, fixture: updated }) });
          }} />}
          {tab === 'lamp' && <LampTab lamp={luminaire.lamp} onChange={(l) => {
            const updated = { ...luminaire.lamp, ...l };
            updated.description = buildLampSection(updated);
            onChange({ lamp: updated, luminaireDescription: buildLuminaireDescription({ ...luminaire, lamp: updated }) });
          }} />}
          {tab === 'powerSupply' && <PowerSupplyTab ps={luminaire.powerSupply} onChange={(p) => {
            const updated = { ...luminaire.powerSupply, ...p };
            updated.description = buildPowerSupplySection(updated);
            onChange({ powerSupply: updated, luminaireDescription: buildLuminaireDescription({ ...luminaire, powerSupply: updated }) });
          }} />}
          {tab === 'control' && <ControlTab ctrl={luminaire.control} onChange={(c) => {
            const updated = { ...luminaire.control, ...c };
            updated.description = buildControlSection(updated);
            onChange({ control: updated, luminaireDescription: buildLuminaireDescription({ ...luminaire, control: updated }) });
          }} />}
          {tab === 'accessories' && <AccessoriesTab accessories={luminaire.accessories} onChange={(accessories) => {
            onChange({ accessories, luminaireDescription: buildLuminaireDescription({ ...luminaire, accessories }) });
          }} />}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2 my-4">
      <div className="flex-1 border-t border-border" />
      <span className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">{title}</span>
      <div className="flex-1 border-t border-border" />
    </div>
  );
}

function FixtureTab({ fixture, onChange }: { fixture: LuminaireFixture; onChange: (p: Partial<LuminaireFixture>) => void }) {
  return (
    <>
      <SectionHeader title="Fixture Details" />
      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label className="text-xs">QTY</Label>
          <Input value={fixture.qty} onChange={(e) => onChange({ qty: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs">Mount Height (ft)</Label>
          <Input value={fixture.mountHeight} onChange={(e) => onChange({ mountHeight: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs">Fixture Description</Label>
          <Input value={fixture.description} readOnly onMouseDown={(e) => e.preventDefault()} className="bg-muted/50 cursor-default" />
        </div>
      </div>
      <SectionHeader title="Filters" />
      <div className="grid grid-cols-4 gap-4">
        {(['application', 'mount', 'style', 'lens'] as const).map((field) => (
          <div key={field}>
            <Label className="text-[#5B6FAF] font-semibold text-xs capitalize">{field}:</Label>
            <Select value={fixture[field]} onValueChange={(v) => onChange({ [field]: v })}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="option1">Option 1</SelectItem>
                <SelectItem value="option2">Option 2</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-4 gap-4">
        <div>
          <Label className="text-[#5B6FAF] font-semibold text-xs">Dimensions-Length (in):</Label>
          <Input value={fixture.dimLength} onChange={(e) => onChange({ dimLength: e.target.value })} />
        </div>
        <div>
          <Label className="text-[#5B6FAF] font-semibold text-xs">Dimensions-Width (in):</Label>
          <Input value={fixture.dimWidth} onChange={(e) => onChange({ dimWidth: e.target.value })} />
        </div>
        <div>
          <Label className="text-[#5B6FAF] font-semibold text-xs">Dimensions-Depth (in):</Label>
          <Input value={fixture.dimDepth} onChange={(e) => onChange({ dimDepth: e.target.value })} />
        </div>
        <div>
          <Label className="text-[#5B6FAF] font-semibold text-xs">Dimensions-Diameter (in):</Label>
          <Input value={fixture.dimDiameter} onChange={(e) => onChange({ dimDiameter: e.target.value })} />
        </div>
      </div>
      <div className="w-40">
        <Label className="text-[#5B6FAF] font-semibold text-xs">Price Per Unit ($):</Label>
        <Input value={fixture.pricePerUnit} onChange={(e) => onChange({ pricePerUnit: e.target.value })} />
      </div>
    </>
  );
}

function LampTab({ lamp, onChange }: { lamp: LuminaireLamp; onChange: (p: Partial<LuminaireLamp>) => void }) {
  return (
    <>
      <SectionHeader title="Lamp Details" />
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-xs">QTY/Fixture</Label>
          <Input value={lamp.qtyPerFixture} onChange={(e) => onChange({ qtyPerFixture: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs">Lamp Description</Label>
          <Input value={lamp.description} readOnly onMouseDown={(e) => e.preventDefault()} className="bg-muted/50 cursor-default" />
        </div>
      </div>
      <SectionHeader title="Filters" />
      <div className="grid grid-cols-4 gap-4">
        {(['category', 'type', 'baseCategory', 'baseCategoryType'] as const).map((field) => (
          <div key={field}>
            <Label className="text-[#5B6FAF] font-semibold text-xs capitalize">
              {field.replace(/([A-Z])/g, ' $1').trim()}:
            </Label>
            <Select value={lamp[field]} onValueChange={(v) => onChange({ [field]: v })}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="option1">Option 1</SelectItem>
                <SelectItem value="option2">Option 2</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-4 gap-4">
        <div>
          <Label className="text-[#5B6FAF] font-semibold text-xs">Wattage:</Label>
          <Input value={lamp.wattage} onChange={(e) => onChange({ wattage: e.target.value })} />
        </div>
        <div>
          <Label className="text-[#5B6FAF] font-semibold text-xs">Color Temperature:</Label>
          <Input value={lamp.colorTemp} onChange={(e) => onChange({ colorTemp: e.target.value })} />
        </div>
        <div>
          <Label className="text-[#5B6FAF] font-semibold text-xs">Lens Type:</Label>
          <Select value={lamp.lensType} onValueChange={(v) => onChange({ lensType: v })}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="clear">Clear</SelectItem>
              <SelectItem value="frosted">Frosted</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[#5B6FAF] font-semibold text-xs">Product Code:</Label>
          <Input value={lamp.productCode} onChange={(e) => onChange({ productCode: e.target.value })} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 w-80">
        <div>
          <Label className="text-[#5B6FAF] font-semibold text-xs">Price Per Unit ($):</Label>
          <Input value={lamp.pricePerUnit} onChange={(e) => onChange({ pricePerUnit: e.target.value })} />
        </div>
        <div>
          <Label className="text-[#5B6FAF] font-semibold text-xs">LED:</Label>
          <Select value={lamp.led} onValueChange={(v) => onChange({ led: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="No">No</SelectItem>
              <SelectItem value="Yes">Yes</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </>
  );
}

function PowerSupplyTab({ ps, onChange }: { ps: LuminairePowerSupply; onChange: (p: Partial<LuminairePowerSupply>) => void }) {
  return (
    <>
      <SectionHeader title="Power Supply Details" />
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-xs">QTY/Fixture</Label>
          <Input value={ps.qtyPerFixture} onChange={(e) => onChange({ qtyPerFixture: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs">Power Supply Description</Label>
          <Input value={ps.description} readOnly onMouseDown={(e) => e.preventDefault()} className="bg-muted/50 cursor-default" />
        </div>
      </div>
      <SectionHeader title="Filters" />
      <div className="grid grid-cols-4 gap-4">
        <div>
          <Label className="text-[#5B6FAF] font-semibold text-xs">Type:</Label>
          <Select value={ps.type} onValueChange={(v) => onChange({ type: v })}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="driver">Driver</SelectItem>
              <SelectItem value="transformer">Transformer</SelectItem>
              <SelectItem value="ballast">Ballast</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[#5B6FAF] font-semibold text-xs">Manufacturer:</Label>
          <Input value={ps.manufacturer} onChange={(e) => onChange({ manufacturer: e.target.value })} />
        </div>
        <div>
          <Label className="text-[#5B6FAF] font-semibold text-xs">Model:</Label>
          <Input value={ps.model} onChange={(e) => onChange({ model: e.target.value })} />
        </div>
        <div>
          <Label className="text-[#5B6FAF] font-semibold text-xs">Product Code:</Label>
          <Input value={ps.productCode} onChange={(e) => onChange({ productCode: e.target.value })} />
        </div>
      </div>
      <div className="w-40">
        <Label className="text-[#5B6FAF] font-semibold text-xs">Price Per Unit ($):</Label>
        <Input value={ps.pricePerUnit} onChange={(e) => onChange({ pricePerUnit: e.target.value })} />
      </div>
    </>
  );
}

function ControlTab({ ctrl, onChange }: { ctrl: LuminaireControl; onChange: (p: Partial<LuminaireControl>) => void }) {
  return (
    <>
      <SectionHeader title="Control Details" />
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-xs">QTY/Fixture</Label>
          <Input value={ctrl.qtyPerFixture} onChange={(e) => onChange({ qtyPerFixture: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs">Control Description</Label>
          <Input value={ctrl.description} readOnly onMouseDown={(e) => e.preventDefault()} className="bg-muted/50 cursor-default" />
        </div>
      </div>
      <SectionHeader title="Filters" />
      <div className="grid grid-cols-4 gap-4">
        <div>
          <Label className="text-[#5B6FAF] font-semibold text-xs">Type:</Label>
          <Select value={ctrl.type} onValueChange={(v) => onChange({ type: v })}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="switch">Switch</SelectItem>
              <SelectItem value="dimmer">Dimmer</SelectItem>
              <SelectItem value="sensor">Sensor</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[#5B6FAF] font-semibold text-xs">Manufacturer:</Label>
          <Input value={ctrl.manufacturer} onChange={(e) => onChange({ manufacturer: e.target.value })} />
        </div>
        <div>
          <Label className="text-[#5B6FAF] font-semibold text-xs">Dimming:</Label>
          <Input value={ctrl.dimming} onChange={(e) => onChange({ dimming: e.target.value })} />
        </div>
        <div>
          <Label className="text-[#5B6FAF] font-semibold text-xs">Model:</Label>
          <Input value={ctrl.model} onChange={(e) => onChange({ model: e.target.value })} />
        </div>
      </div>
      <div className="w-40">
        <Label className="text-[#5B6FAF] font-semibold text-xs">Price Per Unit ($):</Label>
        <Input value={ctrl.pricePerUnit} onChange={(e) => onChange({ pricePerUnit: e.target.value })} />
      </div>
    </>
  );
}

function AccessoriesTab({ accessories, onChange }: { accessories: LuminaireAccessory[]; onChange: (a: LuminaireAccessory[]) => void }) {
  const [activeIdx, setActiveIdx] = useState(0);

  const updateAccessory = (idx: number, patch: Partial<LuminaireAccessory>) =>
    onChange(accessories.map((a, i) => i === idx ? { ...a, ...patch } : a));

  const addAccessory = () => {
    const newIdx = accessories.length;
    onChange([...accessories, { selected: true, qtyPerFixture: '', description: '', type: '', manufacturer: '', color: '', productCode: '', dimLength: '', dimWidth: '', dimDepth: '', dimDiameter: '', pricePerUnit: '' }]);
    setActiveIdx(newIdx);
  };

  const removeAccessory = (idx: number) => {
    if (accessories.length <= 1) return;
    const next = accessories.filter((_, i) => i !== idx);
    onChange(next);
    setActiveIdx(Math.min(activeIdx, next.length - 1));
  };

  const safeIdx = Math.min(activeIdx, accessories.length - 1);
  const current = accessories[safeIdx];
  if (!current) return null;

  return (
    <>
      <SectionHeader title="Accessories Details" />
      <div className="space-y-2">
        {accessories.map((acc, i) => (
          <div
            key={i}
            className={`flex items-center gap-3 rounded-md border px-3 py-2 cursor-pointer transition-colors ${i === safeIdx ? 'border-[#3B4A6B] bg-[#3B4A6B]/5' : 'border-border bg-background hover:bg-muted/40'}`}
            onClick={() => setActiveIdx(i)}
          >
            <span className={`w-7 h-7 flex items-center justify-center rounded text-xs font-bold shrink-0 ${i === safeIdx ? 'bg-[#3B4A6B] text-white' : 'bg-muted text-muted-foreground'}`}>
              {String.fromCharCode(65 + i)}
            </span>
            <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
              <Label className="text-xs block mb-0.5">QTY/Fixture</Label>
              <Input value={acc.qtyPerFixture} onChange={(e) => updateAccessory(i, { qtyPerFixture: e.target.value })} className="w-20 h-7 text-xs" />
            </div>
            <div className="flex-1" onClick={(e) => e.stopPropagation()}>
              <Label className="text-xs block mb-0.5">Accessory Description</Label>
              <Input value={acc.description} readOnly onMouseDown={(e) => e.preventDefault()} className="bg-muted/50 cursor-default h-7 text-xs" />
            </div>
            {accessories.length > 1 && (
              <button type="button" onClick={(e) => { e.stopPropagation(); removeAccessory(i); }} className="shrink-0 text-muted-foreground hover:text-destructive transition-colors">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      <Button type="button" size="sm" className="bg-[#3B4A6B] hover:bg-[#4B5A7B] text-white" onClick={addAccessory}>
        <Plus className="h-3 w-3 mr-1" />
        New Accessory
      </Button>

      <SectionHeader title="Filters" />
      <div className="grid grid-cols-4 gap-4">
        <div>
          <Label className="text-[#5B6FAF] font-semibold text-xs">Type:</Label>
          <Select value={current.type} onValueChange={(v) => updateAccessory(safeIdx, { type: v })}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="bracket">Bracket</SelectItem>
              <SelectItem value="reflector">Reflector</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[#5B6FAF] font-semibold text-xs">Manufacturer:</Label>
          <Input value={current.manufacturer} onChange={(e) => updateAccessory(safeIdx, { manufacturer: e.target.value })} />
        </div>
        <div>
          <Label className="text-[#5B6FAF] font-semibold text-xs">Color:</Label>
          <Input value={current.color} onChange={(e) => updateAccessory(safeIdx, { color: e.target.value })} />
        </div>
        <div>
          <Label className="text-[#5B6FAF] font-semibold text-xs">Product Code:</Label>
          <Input value={current.productCode} onChange={(e) => updateAccessory(safeIdx, { productCode: e.target.value })} />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-4">
        <div>
          <Label className="text-[#5B6FAF] font-semibold text-xs">Dimensions-Length (in):</Label>
          <Input value={current.dimLength} onChange={(e) => updateAccessory(safeIdx, { dimLength: e.target.value })} />
        </div>
        <div>
          <Label className="text-[#5B6FAF] font-semibold text-xs">Dimensions-Width (in):</Label>
          <Input value={current.dimWidth} onChange={(e) => updateAccessory(safeIdx, { dimWidth: e.target.value })} />
        </div>
        <div>
          <Label className="text-[#5B6FAF] font-semibold text-xs">Dimensions-Depth (in):</Label>
          <Input value={current.dimDepth} onChange={(e) => updateAccessory(safeIdx, { dimDepth: e.target.value })} />
        </div>
        <div>
          <Label className="text-[#5B6FAF] font-semibold text-xs">Dimensions-Diameter (in):</Label>
          <Input value={current.dimDiameter} onChange={(e) => updateAccessory(safeIdx, { dimDiameter: e.target.value })} />
        </div>
      </div>
      <div className="w-40">
        <Label className="text-[#5B6FAF] font-semibold text-xs">Price Per Unit ($):</Label>
        <Input value={current.pricePerUnit} onChange={(e) => updateAccessory(safeIdx, { pricePerUnit: e.target.value })} />
      </div>
    </>
  );
}

