import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useCreateProject } from '@/hooks/use-projects';
import { useAuth } from '@/hooks/useAuth';
import { PROPERTY_TYPES } from '@/lib/constants';
import {
  CheckCircle,
  Plus,
  Trash2,
  Upload,
  Search,
  ChevronUp,
  ChevronDown,
  Lightbulb,
  Image,
  RefreshCw,
  MinusCircle,
  PlusCircle,
} from 'lucide-react';
import { toast } from 'sonner';

// ---------- US States ----------
const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY',
];

// ---------- Priority Definitions ----------
const PRIORITY_NAMES = ['Price', 'Time', 'Cost', 'Security', 'Human Centric', 'Other'] as const;
const PRIORITY_COLORS = ['#C8D84D', '#F5A623', '#C8D84D', '#5B6FAF', '#C8D84D', '#E8E8E8'];

// ---------- Types ----------
interface LuminaireFixture {
  qty: string; mountHeight: string; description: string;
  application: string; mount: string; style: string; lens: string;
  dimLength: string; dimWidth: string; dimDepth: string; dimDiameter: string;
  pricePerUnit: string;
}

interface LuminaireLamp {
  qtyPerFixture: string; description: string;
  category: string; type: string; baseCategory: string; baseCategoryType: string;
  wattage: string; colorTemp: string; lensType: string; productCode: string;
  pricePerUnit: string; led: string;
}

interface LuminairePowerSupply {
  qtyPerFixture: string; description: string;
  type: string; manufacturer: string; model: string; productCode: string;
  pricePerUnit: string;
}

interface LuminaireControl {
  qtyPerFixture: string; description: string;
  type: string; manufacturer: string; dimming: string; model: string;
  pricePerUnit: string;
}

interface LuminaireAccessory {
  selected: boolean; qtyPerFixture: string; description: string;
  type: string; manufacturer: string; color: string; productCode: string;
  dimLength: string; dimWidth: string; dimDepth: string; dimDiameter: string;
  pricePerUnit: string;
}

interface Luminaire {
  luminaireDescription: string;
  fixture: LuminaireFixture;
  lamp: LuminaireLamp;
  powerSupply: LuminairePowerSupply;
  control: LuminaireControl;
  accessories: LuminaireAccessory[];
}

interface AreaData {
  name: string;
  detailsOpen: boolean;
  ceilingHeight: string;
  dailyUsage: string;
  areaSqFt: string;
  application: string;
  voltage: string;
  installationSurface: string;
  controlType: string;
  ingressProtection: string;
  notes: string;
  luminaires: Luminaire[];
}

function createEmptyLuminaire(): Luminaire {
  return {
    luminaireDescription: '',
    fixture: { qty: '', mountHeight: '', description: '', application: '', mount: '', style: '', lens: '', dimLength: '', dimWidth: '', dimDepth: '', dimDiameter: '', pricePerUnit: '' },
    lamp: { qtyPerFixture: '', description: '', category: '', type: '', baseCategory: '', baseCategoryType: '', wattage: '', colorTemp: '', lensType: '', productCode: '', pricePerUnit: '', led: 'No' },
    powerSupply: { qtyPerFixture: '', description: '', type: '', manufacturer: '', model: '', productCode: '', pricePerUnit: '' },
    control: { qtyPerFixture: '', description: '', type: '', manufacturer: '', dimming: '', model: '', pricePerUnit: '' },
    accessories: [{ selected: true, qtyPerFixture: '', description: '', type: '', manufacturer: '', color: '', productCode: '', dimLength: '', dimWidth: '', dimDepth: '', dimDiameter: '', pricePerUnit: '' }],
  };
}

function createEmptyArea(): AreaData {
  return {
    name: '', detailsOpen: true,
    ceilingHeight: '', dailyUsage: '', areaSqFt: '', application: '',
    voltage: '', installationSurface: '', controlType: '', ingressProtection: '',
    notes: '', luminaires: [],
  };
}

// ================================================================
// MAIN COMPONENT
// ================================================================

export default function CreateProject() {
  const navigate = useNavigate();
  const { companyId } = useAuth();
  const createProject = useCreateProject();

  // Property tab state
  const [title, setTitle] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [propertySize, setPropertySize] = useState('');
  const [address, setAddress] = useState('');
  const [address2, setAddress2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [laborCost, setLaborCost] = useState('');
  const [costPerKwh, setCostPerKwh] = useState('');
  const [operationDays, setOperationDays] = useState('');
  const [salesTax, setSalesTax] = useState('');
  const [complianceLink, setComplianceLink] = useState('');
  const [lightCount, setLightCount] = useState('');
  const [beFinancing, setBeFinancing] = useState('No');
  const [interestRate, setInterestRate] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [loanPeriod, setLoanPeriod] = useState('');
  const [notes, setNotes] = useState('');

  // Priorities
  const [priorities, setPriorities] = useState([10, 20, 30, 10, 15, 5]);

  // Luminaires tab state
  const [areas, setAreas] = useState<AreaData[]>([]);
  const [areaFilter, setAreaFilter] = useState('all');

  // Luminaire modal state
  const [lumModalOpen, setLumModalOpen] = useState(false);
  const [lumModalTab, setLumModalTab] = useState<'fixture' | 'lamp' | 'powerSupply' | 'control' | 'accessories'>('fixture');
  const [editingAreaIdx, setEditingAreaIdx] = useState(0);
  const [editingLumIdx, setEditingLumIdx] = useState(0);

  // Uploads tab state
  const [dragOver, setDragOver] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  // Priority helpers
  const adjustPriority = (index: number, delta: number) => {
    setPriorities(prev => {
      const next = [...prev];
      const newVal = Math.max(0, Math.min(100, next[index] + delta));
      next[index] = newVal;
      return next;
    });
  };

  const totalPriority = priorities.reduce((a, b) => a + b, 0);

  // Area helpers
  const addArea = () => setAreas(prev => [...prev, createEmptyArea()]);
  const removeArea = (idx: number) => setAreas(prev => prev.filter((_, i) => i !== idx));
  const updateArea = (idx: number, patch: Partial<AreaData>) => {
    setAreas(prev => prev.map((a, i) => i === idx ? { ...a, ...patch } : a));
  };

  const addLuminaire = (areaIdx: number) => {
    setAreas(prev => prev.map((a, i) => i === areaIdx ? { ...a, luminaires: [...a.luminaires, createEmptyLuminaire()] } : a));
  };

  const openLumModal = (areaIdx: number, lumIdx: number) => {
    setEditingAreaIdx(areaIdx);
    setEditingLumIdx(lumIdx);
    setLumModalTab('fixture');
    setLumModalOpen(true);
  };

  const updateLuminaire = useCallback((areaIdx: number, lumIdx: number, patch: Partial<Luminaire>) => {
    setAreas(prev => prev.map((a, ai) => ai === areaIdx ? {
      ...a,
      luminaires: a.luminaires.map((l, li) => li === lumIdx ? { ...l, ...patch } : l),
    } : a));
  }, []);

  const removeLuminaire = (areaIdx: number, lumIdx: number) => {
    setAreas(prev => prev.map((a, ai) => ai === areaIdx ? {
      ...a,
      luminaires: a.luminaires.filter((_, li) => li !== lumIdx),
    } : a));
  };

  // File upload
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    setUploadedFiles(prev => [...prev, ...files]);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setUploadedFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  }, []);

  // Submit
  const handleDone = async () => {
    if (!title.trim()) {
      toast.error('Project title is required');
      return;
    }
    try {
      const projectId = await createProject.mutateAsync({
        title,
        company_id: companyId ?? 0,
        address: address || undefined,
        address2: address2 || undefined,
        city: city || undefined,
        state: state || undefined,
        zip_code: zipCode ? Number(zipCode) : undefined,
        property_type: propertyType || undefined,
        property_size: propertySize || undefined,
        cost_per_kilowatt_hour: costPerKwh || undefined,
        sales_tax: salesTax || undefined,
        interest_rate: interestRate || undefined,
        labor_cost: laborCost || undefined,
        operation_days_per_year: operationDays ? Number(operationDays) : undefined,
        loan_period: loanPeriod ? Number(loanPeriod) : undefined,
        deposit_amount: depositAmount ? Number(depositAmount) : undefined,
        be_financing: beFinancing || undefined,
        areas: areas.length > 0 ? areas.map(a => ({
          name: a.name,
          ceilingHeight: a.ceilingHeight,
          dailyUsage: a.dailyUsage,
          areaSqFt: a.areaSqFt,
          application: a.application,
          voltage: a.voltage,
          installationSurface: a.installationSurface,
          controlType: a.controlType,
          ingressProtection: a.ingressProtection,
          notes: a.notes,
          luminaires: a.luminaires.map(l => ({
            description: l.luminaireDescription,
            fixture: l.fixture,
            lamp: l.lamp,
            powerSupply: l.powerSupply,
            control: l.control,
            accessories: l.accessories,
          })),
        })) : undefined,
      });
      navigate(`/projects/${projectId}`);
    } catch {
      // toast handled by mutation
    }
  };

  const filteredAreas = areaFilter === 'all' ? areas : areas.filter((_, i) => String(i) === areaFilter);

  const headerActions = (
    <Button
      className="bg-[#7BA23F] hover:bg-[#6B9235] text-white"
      onClick={handleDone}
      disabled={createProject.isPending}
    >
      <CheckCircle className="h-4 w-4 mr-2" />
      {createProject.isPending ? 'Saving...' : 'Done'}
    </Button>
  );

  return (
    <DashboardLayout title="Projects / Create Project" showSearch={false} actions={headerActions}>
      <Tabs defaultValue="property" className="w-full">
        <TabsList className="bg-transparent border-b border-border rounded-none w-full justify-start gap-0 h-auto p-0">
          <TabsTrigger value="property" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#5B6FAF] data-[state=active]:text-[#5B6FAF] data-[state=active]:bg-transparent data-[state=active]:shadow-none text-[#5B6FAF] px-6 py-3">
            Property
          </TabsTrigger>
          <TabsTrigger value="luminaires" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#7BA23F] data-[state=active]:text-[#7BA23F] data-[state=active]:bg-transparent data-[state=active]:shadow-none text-[#5B6FAF] px-6 py-3">
            Luminaires
          </TabsTrigger>
          <TabsTrigger value="uploads" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#7BA23F] data-[state=active]:text-[#7BA23F] data-[state=active]:bg-transparent data-[state=active]:shadow-none text-[#5B6FAF] px-6 py-3">
            Uploads
          </TabsTrigger>
        </TabsList>

        {/* ============================================================ */}
        {/* PROPERTY TAB */}
        {/* ============================================================ */}
        <TabsContent value="property" className="mt-6 space-y-6">
          {/* Photo + Top Fields */}
          <div className="flex gap-6">
            {/* Photo placeholder */}
            <div className="flex-shrink-0 space-y-3">
              <div className="w-48 h-36 border-2 border-dashed border-border rounded-lg flex items-center justify-center bg-muted/30">
                <Image className="h-10 w-10 text-muted-foreground/40" />
              </div>
              <div className="flex gap-2">
                <Button type="button" size="sm" className="bg-[#7BA23F] hover:bg-[#6B9235] text-white text-xs">
                  <Image className="h-3 w-3 mr-1" />
                  Upload Photo
                </Button>
                <Button type="button" size="sm" className="bg-[#F5A623] hover:bg-[#E09620] text-white text-xs">
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Sync Company
                </Button>
              </div>
            </div>

            {/* First row of fields */}
            <div className="flex-1 grid grid-cols-3 gap-4 content-start">
              <div>
                <Label className="text-[#5B6FAF] font-semibold text-sm">Project Title:</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} />
              </div>
              <div>
                <Label className="text-[#5B6FAF] font-semibold text-sm">Property Type:</Label>
                <Select value={propertyType} onValueChange={setPropertyType}>
                  <SelectTrigger><SelectValue placeholder="Select Property Type" /></SelectTrigger>
                  <SelectContent>
                    {PROPERTY_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[#5B6FAF] font-semibold text-sm">Property Size (sq.ft):</Label>
                <Input value={propertySize} onChange={e => setPropertySize(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Address row */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-[#5B6FAF] font-semibold text-sm">Address:</Label>
              <Input value={address} onChange={e => setAddress(e.target.value)} />
            </div>
            <div>
              <Label className="text-[#5B6FAF] font-semibold text-sm">Address 2:</Label>
              <Input value={address2} onChange={e => setAddress2(e.target.value)} />
            </div>
            <div>
              <Label className="text-[#5B6FAF] font-semibold text-sm">City:</Label>
              <Input value={city} onChange={e => setCity(e.target.value)} />
            </div>
          </div>

          {/* State / Zip / Labor / Cost row */}
          <div className="grid grid-cols-4 gap-4">
            <div>
              <Label className="text-[#5B6FAF] font-semibold text-sm">State:</Label>
              <Select value={state} onValueChange={setState}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {US_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[#5B6FAF] font-semibold text-sm">Zip Code:</Label>
              <Input value={zipCode} onChange={e => setZipCode(e.target.value)} />
            </div>
            <div>
              <Label className="text-[#5B6FAF] font-semibold text-sm">Labor Cost (hourly):</Label>
              <Input value={laborCost} onChange={e => setLaborCost(e.target.value)} placeholder="$" />
            </div>
            <div>
              <Label className="text-[#5B6FAF] font-semibold text-sm">Cost per kilowatt hour ($/kWh):</Label>
              <Input value={costPerKwh} onChange={e => setCostPerKwh(e.target.value)} placeholder="$" />
            </div>
          </div>

          {/* Operation / Sales Tax / Compliance / Light Count row */}
          <div className="grid grid-cols-4 gap-4">
            <div>
              <Label className="text-[#5B6FAF] font-semibold text-sm">Operation Days Per Year:</Label>
              <Input value={operationDays} onChange={e => setOperationDays(e.target.value)} />
            </div>
            <div>
              <Label className="text-[#5B6FAF] font-semibold text-sm">Sales Tax % (If Applicable):</Label>
              <Input value={salesTax} onChange={e => setSalesTax(e.target.value)} placeholder="%" />
            </div>
            <div>
              <Label className="text-[#5B6FAF] font-semibold text-sm">Compliance Hyperlink (If Applicable):</Label>
              <Input value={complianceLink} onChange={e => setComplianceLink(e.target.value)} />
            </div>
            <div>
              <Label className="text-[#5B6FAF] font-semibold text-sm">Light Count:</Label>
              <Select value={lightCount} onValueChange={setLightCount}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {['1-50', '51-100', '101-250', '251-500', '500+'].map(v => (
                    <SelectItem key={v} value={v}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Financing row */}
          <div className="grid grid-cols-4 gap-4">
            <div>
              <Label className="text-[#5B6FAF] font-semibold text-sm">Will you be financing this project?:</Label>
              <Select value={beFinancing} onValueChange={setBeFinancing}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="No">No</SelectItem>
                  <SelectItem value="Yes">Yes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[#5B6FAF] font-semibold text-sm">Interest Rate (%):</Label>
              <Input value={interestRate} onChange={e => setInterestRate(e.target.value)} placeholder="%" />
            </div>
            <div>
              <Label className="text-[#5B6FAF] font-semibold text-sm">Deposit Amount ($):</Label>
              <Input value={depositAmount} onChange={e => setDepositAmount(e.target.value)} placeholder="$" />
            </div>
            <div>
              <Label className="text-[#5B6FAF] font-semibold text-sm">Loan Period (months):</Label>
              <Input value={loanPeriod} onChange={e => setLoanPeriod(e.target.value)} />
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label className="text-[#5B6FAF] font-semibold text-sm">Notes:</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} className="min-h-[100px]" />
          </div>

          {/* Project Priorities */}
          <div>
            <Label className="text-[#5B6FAF] font-semibold text-sm mb-3 block">Project Priorities:</Label>
            <div className="flex gap-8">
              <div className="grid grid-cols-2 gap-3 flex-1">
                {PRIORITY_NAMES.map((name, i) => (
                  <div key={name} className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2">
                    <div className="w-1.5 h-8 rounded-sm" style={{ backgroundColor: PRIORITY_COLORS[i] }} />
                    <span className="text-sm font-medium flex-1">{name}</span>
                    <button type="button" onClick={() => adjustPriority(i, 5)} className="text-[#7BA23F] hover:text-[#6B9235]">
                      <PlusCircle className="h-5 w-5" />
                    </button>
                    <button type="button" onClick={() => adjustPriority(i, -5)} className="text-[#D97B3A] hover:text-[#C06B2A]">
                      <MinusCircle className="h-5 w-5" />
                    </button>
                    <span className="text-sm text-muted-foreground w-10 text-right">{priorities[i]}%</span>
                  </div>
                ))}
              </div>

              {/* Pie chart */}
              <div className="flex-shrink-0">
                <svg viewBox="0 0 200 200" width="180" height="180">
                  {(() => {
                    let cumulative = 0;
                    return priorities.map((val, i) => {
                      if (val === 0 || totalPriority === 0) return null;
                      const pct = val / totalPriority;
                      const startAngle = cumulative * 360;
                      cumulative += pct;
                      const endAngle = cumulative * 360;
                      const start = polarToCartesian(100, 100, 80, startAngle);
                      const end = polarToCartesian(100, 100, 80, endAngle);
                      const largeArc = pct > 0.5 ? 1 : 0;
                      const d = `M100,100 L${start.x},${start.y} A80,80 0 ${largeArc},1 ${end.x},${end.y} Z`;
                      return <path key={i} d={d} fill={PRIORITY_COLORS[i]} stroke="white" strokeWidth="1" />;
                    });
                  })()}
                </svg>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ============================================================ */}
        {/* LUMINAIRES TAB */}
        {/* ============================================================ */}
        <TabsContent value="luminaires" className="mt-6 space-y-4">
          {/* Area filter + Add button */}
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center gap-3">
              <Label className="font-semibold">Area:</Label>
              <Select value={areaFilter} onValueChange={setAreaFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Areas</SelectItem>
                  {areas.map((a, i) => (
                    <SelectItem key={i} value={String(i)}>{a.name || `Area ${i + 1}`}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="button" onClick={addArea} className="bg-[#7BA23F] hover:bg-[#6B9235] text-white">
              <Lightbulb className="h-4 w-4 mr-2" />
              Add New Area
            </Button>
          </div>

          {filteredAreas.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No areas added yet. Click "Add New Area" to get started.
            </div>
          )}

          {filteredAreas.map((area, filteredIdx) => {
            const realIdx = areaFilter === 'all' ? filteredIdx : Number(areaFilter);
            return (
              <div key={realIdx} className="border border-border rounded-lg overflow-hidden">
                {/* Area header */}
                <div className="bg-[#3B4A6B] text-white px-4 py-3 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => removeArea(realIdx)}
                    className="w-5 h-5 bg-red-500 rounded-sm flex items-center justify-center text-white hover:bg-red-600 flex-shrink-0"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                  <Input
                    value={area.name}
                    onChange={e => updateArea(realIdx, { name: e.target.value })}
                    placeholder="Area Title"
                    className="bg-transparent border-none text-white placeholder:text-white/60 text-lg font-semibold focus-visible:ring-0 p-0 h-auto"
                  />
                  <div className="flex items-center gap-2 ml-auto flex-shrink-0">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="bg-white text-foreground hover:bg-gray-100"
                      onClick={() => { addLuminaire(realIdx); openLumModal(realIdx, area.luminaires.length); }}
                    >
                      <Lightbulb className="h-4 w-4 mr-1" />
                      Add Luminaire
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="bg-[#3B4A6B] text-white border-white hover:bg-[#4B5A7B]"
                      onClick={() => updateArea(realIdx, { detailsOpen: !area.detailsOpen })}
                    >
                      Area Details
                      {area.detailsOpen ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
                    </Button>
                  </div>
                </div>

                {/* Area details */}
                {area.detailsOpen && (
                  <div className="p-4 space-y-4">
                    <div className="flex gap-6">
                      {/* Photo placeholder */}
                      <div className="flex-shrink-0 space-y-2">
                        <Button type="button" size="sm" className="bg-[#7BA23F] hover:bg-[#6B9235] text-white text-xs">
                          <Image className="h-3 w-3 mr-1" />
                          Upload Photo
                        </Button>
                        <div className="w-48 h-36 border-2 border-dashed border-border rounded-lg flex items-center justify-center bg-muted/30">
                          <Image className="h-10 w-10 text-muted-foreground/40" />
                        </div>
                      </div>

                      {/* Fields */}
                      <div className="flex-1 space-y-4">
                        <div className="grid grid-cols-4 gap-4">
                          <div>
                            <Label className="text-[#5B6FAF] font-semibold text-sm">Ceiling Height (feet):</Label>
                            <Input value={area.ceilingHeight} onChange={e => updateArea(realIdx, { ceilingHeight: e.target.value })} />
                          </div>
                          <div>
                            <Label className="text-[#5B6FAF] font-semibold text-sm">Daily Usage (hours):</Label>
                            <Input value={area.dailyUsage} onChange={e => updateArea(realIdx, { dailyUsage: e.target.value })} />
                          </div>
                          <div>
                            <Label className="text-[#5B6FAF] font-semibold text-sm">Area (sq.ft.):</Label>
                            <Input value={area.areaSqFt} onChange={e => updateArea(realIdx, { areaSqFt: e.target.value })} />
                          </div>
                          <div>
                            <Label className="text-[#5B6FAF] font-semibold text-sm">Application:</Label>
                            <Select value={area.application} onValueChange={v => updateArea(realIdx, { application: v })}>
                              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                              <SelectContent>
                                {['Indoor', 'Outdoor', 'Both'].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="grid grid-cols-4 gap-4">
                          <div>
                            <Label className="text-[#5B6FAF] font-semibold text-sm">Voltage:</Label>
                            <Select value={area.voltage} onValueChange={v => updateArea(realIdx, { voltage: v })}>
                              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                              <SelectContent>
                                {['120V', '208V', '240V', '277V', '347V', '480V'].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-[#5B6FAF] font-semibold text-sm">Installation Surface:</Label>
                            <Select value={area.installationSurface} onValueChange={v => updateArea(realIdx, { installationSurface: v })}>
                              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                              <SelectContent>
                                {['Ceiling', 'Wall', 'Floor', 'Pole', 'Recessed'].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-[#5B6FAF] font-semibold text-sm">Control Type:</Label>
                            <Select value={area.controlType} onValueChange={v => updateArea(realIdx, { controlType: v })}>
                              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                              <SelectContent>
                                {['Switch', 'Dimmer', 'Occupancy Sensor', 'Daylight Sensor', 'Timer'].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-[#5B6FAF] font-semibold text-sm">Ingress Protection:</Label>
                            <Select value={area.ingressProtection} onValueChange={v => updateArea(realIdx, { ingressProtection: v })}>
                              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                              <SelectContent>
                                {['IP20', 'IP44', 'IP54', 'IP65', 'IP66', 'IP67', 'IP68'].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div>
                          <Label className="text-[#5B6FAF] font-semibold text-sm">Notes:</Label>
                          <Input value={area.notes} onChange={e => updateArea(realIdx, { notes: e.target.value })} />
                        </div>
                      </div>
                    </div>

                    {/* Luminaires list */}
                    {area.luminaires.length > 0 && (
                      <div className="border-t border-border pt-4 space-y-2">
                        <Label className="text-sm font-medium text-muted-foreground">Luminaires</Label>
                        {area.luminaires.map((lum, lumIdx) => (
                          <div key={lumIdx} className="flex items-center gap-3 p-2 bg-muted/30 rounded-md">
                            <Lightbulb className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm flex-1">{lum.luminaireDescription || `Luminaire ${lumIdx + 1}`}</span>
                            <Button type="button" variant="outline" size="sm" onClick={() => openLumModal(realIdx, lumIdx)}>
                              Edit
                            </Button>
                            <Button type="button" variant="ghost" size="sm" onClick={() => removeLuminaire(realIdx, lumIdx)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </TabsContent>

        {/* ============================================================ */}
        {/* UPLOADS TAB */}
        {/* ============================================================ */}
        <TabsContent value="uploads" className="mt-6 space-y-6">
          <div className="flex items-start justify-between gap-8">
            <p className="text-sm text-foreground max-w-xl">
              Upload pertinent company files by dragging them into the designated area (below) or browse your device (blue button).
              Whether it's a reflected ceiling plan, insurance documentation or building schematics - the more information we have, the better we can assist!
            </p>
            <label>
              <input type="file" multiple className="hidden" onChange={handleFileSelect} />
              <div className="bg-[#3B4A6B] hover:bg-[#4B5A7B] text-white px-6 py-3 rounded-lg cursor-pointer flex items-center gap-2 font-medium whitespace-nowrap">
                <Search className="h-4 w-4" />
                Browse For Files
              </div>
            </label>
          </div>

          <div
            className={`border-2 border-dashed rounded-lg p-16 text-center transition-colors ${dragOver ? 'border-primary bg-primary/5' : 'border-border'}`}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <Upload className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold">Drag+Drop</span> Files to Upload
            </p>
          </div>

          {uploadedFiles.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Selected Files</Label>
              {uploadedFiles.map((file, i) => (
                <div key={i} className="flex items-center justify-between bg-muted/30 p-2 rounded-md">
                  <span className="text-sm">{file.name}</span>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setUploadedFiles(prev => prev.filter((_, j) => j !== i))}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ============================================================ */}
      {/* LUMINAIRE DETAIL MODAL */}
      {/* ============================================================ */}
      <LuminaireModal
        open={lumModalOpen}
        onClose={() => setLumModalOpen(false)}
        tab={lumModalTab}
        setTab={setLumModalTab}
        luminaire={areas[editingAreaIdx]?.luminaires[editingLumIdx]}
        onChange={(patch) => updateLuminaire(editingAreaIdx, editingLumIdx, patch)}
      />
    </DashboardLayout>
  );
}

// ================================================================
// LUMINAIRE MODAL
// ================================================================

const COMPONENT_TABS = ['fixture', 'lamp', 'powerSupply', 'control', 'accessories'] as const;
type ComponentTab = typeof COMPONENT_TABS[number];

const TAB_LABELS: Record<ComponentTab, string> = {
  fixture: 'Fixture',
  lamp: 'Lamp',
  powerSupply: 'Power Supply',
  control: 'Control',
  accessories: 'Accessories',
};

function LuminaireModal({
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
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-0">
        {/* Header */}
        <DialogHeader className="bg-[#C8A84D] px-6 py-4 rounded-t-lg">
          <DialogTitle className="text-white text-lg">
            Luminaire Details - {TAB_LABELS[tab]}
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 py-4 space-y-6">
          {/* Luminaire Description + Navigation */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <Label className="text-[#5B6FAF] font-semibold text-sm">Luminaire Description</Label>
              <Input
                value={luminaire.luminaireDescription}
                onChange={e => onChange({ luminaireDescription: e.target.value })}
                className="bg-muted/30"
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

          {/* TAB CONTENT */}
          {tab === 'fixture' && <FixtureTab fixture={luminaire.fixture} onChange={f => onChange({ fixture: { ...luminaire.fixture, ...f } })} />}
          {tab === 'lamp' && <LampTab lamp={luminaire.lamp} onChange={l => onChange({ lamp: { ...luminaire.lamp, ...l } })} />}
          {tab === 'powerSupply' && <PowerSupplyTab ps={luminaire.powerSupply} onChange={p => onChange({ powerSupply: { ...luminaire.powerSupply, ...p } })} />}
          {tab === 'control' && <ControlTab ctrl={luminaire.control} onChange={c => onChange({ control: { ...luminaire.control, ...c } })} />}
          {tab === 'accessories' && <AccessoriesTab accessories={luminaire.accessories} onChange={a => onChange({ accessories: a })} />}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Section Header ----------
function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2 my-4">
      <div className="flex-1 border-t border-border" />
      <span className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">{title}</span>
      <div className="flex-1 border-t border-border" />
    </div>
  );
}

// ---------- Fixture Tab ----------
function FixtureTab({ fixture, onChange }: { fixture: LuminaireFixture; onChange: (p: Partial<LuminaireFixture>) => void }) {
  return (
    <>
      <SectionHeader title="Fixture Details" />
      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label className="text-xs">QTY</Label>
          <Input value={fixture.qty} onChange={e => onChange({ qty: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs">Mount Height (ft)</Label>
          <Input value={fixture.mountHeight} onChange={e => onChange({ mountHeight: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs">Fixture Description</Label>
          <Input value={fixture.description} onChange={e => onChange({ description: e.target.value })} className="bg-muted/30" />
        </div>
      </div>

      <SectionHeader title="Filters" />
      <div className="grid grid-cols-4 gap-4">
        {(['application', 'mount', 'style', 'lens'] as const).map(field => (
          <div key={field}>
            <Label className="text-[#5B6FAF] font-semibold text-xs capitalize">{field}:</Label>
            <Select value={fixture[field]} onValueChange={v => onChange({ [field]: v })}>
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
          <Input value={fixture.dimLength} onChange={e => onChange({ dimLength: e.target.value })} />
        </div>
        <div>
          <Label className="text-[#5B6FAF] font-semibold text-xs">Dimensions-Width (in):</Label>
          <Input value={fixture.dimWidth} onChange={e => onChange({ dimWidth: e.target.value })} />
        </div>
        <div>
          <Label className="text-[#5B6FAF] font-semibold text-xs">Dimensions-Depth (in):</Label>
          <Input value={fixture.dimDepth} onChange={e => onChange({ dimDepth: e.target.value })} />
        </div>
        <div>
          <Label className="text-[#5B6FAF] font-semibold text-xs">Dimensions-Diameter (in):</Label>
          <Input value={fixture.dimDiameter} onChange={e => onChange({ dimDiameter: e.target.value })} />
        </div>
      </div>

      <div className="w-40">
        <Label className="text-[#5B6FAF] font-semibold text-xs">Price Per Unit ($):</Label>
        <Input value={fixture.pricePerUnit} onChange={e => onChange({ pricePerUnit: e.target.value })} />
      </div>
    </>
  );
}

// ---------- Lamp Tab ----------
function LampTab({ lamp, onChange }: { lamp: LuminaireLamp; onChange: (p: Partial<LuminaireLamp>) => void }) {
  return (
    <>
      <SectionHeader title="Lamp Details" />
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-xs">QTY/Fixture</Label>
          <Input value={lamp.qtyPerFixture} onChange={e => onChange({ qtyPerFixture: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs">Lamp Description</Label>
          <Input value={lamp.description} onChange={e => onChange({ description: e.target.value })} className="bg-muted/30" />
        </div>
      </div>

      <SectionHeader title="Filters" />
      <div className="grid grid-cols-4 gap-4">
        {(['category', 'type', 'baseCategory', 'baseCategoryType'] as const).map(field => (
          <div key={field}>
            <Label className="text-[#5B6FAF] font-semibold text-xs capitalize">{field.replace(/([A-Z])/g, ' $1').trim()}:</Label>
            <Select value={lamp[field]} onValueChange={v => onChange({ [field]: v })}>
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
          <Input value={lamp.wattage} onChange={e => onChange({ wattage: e.target.value })} />
        </div>
        <div>
          <Label className="text-[#5B6FAF] font-semibold text-xs">Color Temperature:</Label>
          <Input value={lamp.colorTemp} onChange={e => onChange({ colorTemp: e.target.value })} />
        </div>
        <div>
          <Label className="text-[#5B6FAF] font-semibold text-xs">Lens Type:</Label>
          <Select value={lamp.lensType} onValueChange={v => onChange({ lensType: v })}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="clear">Clear</SelectItem>
              <SelectItem value="frosted">Frosted</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[#5B6FAF] font-semibold text-xs">Product Code:</Label>
          <Input value={lamp.productCode} onChange={e => onChange({ productCode: e.target.value })} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 w-80">
        <div>
          <Label className="text-[#5B6FAF] font-semibold text-xs">Price Per Unit ($):</Label>
          <Input value={lamp.pricePerUnit} onChange={e => onChange({ pricePerUnit: e.target.value })} />
        </div>
        <div>
          <Label className="text-[#5B6FAF] font-semibold text-xs">LED:</Label>
          <Select value={lamp.led} onValueChange={v => onChange({ led: v })}>
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

// ---------- Power Supply Tab ----------
function PowerSupplyTab({ ps, onChange }: { ps: LuminairePowerSupply; onChange: (p: Partial<LuminairePowerSupply>) => void }) {
  return (
    <>
      <SectionHeader title="Power Supply Details" />
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-xs">QTY/Fixture</Label>
          <Input value={ps.qtyPerFixture} onChange={e => onChange({ qtyPerFixture: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs">Power Supply Description</Label>
          <Input value={ps.description} onChange={e => onChange({ description: e.target.value })} className="bg-muted/30" />
        </div>
      </div>

      <SectionHeader title="Filters" />
      <div className="grid grid-cols-4 gap-4">
        <div>
          <Label className="text-[#5B6FAF] font-semibold text-xs">Type:</Label>
          <Select value={ps.type} onValueChange={v => onChange({ type: v })}>
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
          <Input value={ps.manufacturer} onChange={e => onChange({ manufacturer: e.target.value })} />
        </div>
        <div>
          <Label className="text-[#5B6FAF] font-semibold text-xs">Model:</Label>
          <Input value={ps.model} onChange={e => onChange({ model: e.target.value })} />
        </div>
        <div>
          <Label className="text-[#5B6FAF] font-semibold text-xs">Product Code:</Label>
          <Input value={ps.productCode} onChange={e => onChange({ productCode: e.target.value })} />
        </div>
      </div>

      <div className="w-40">
        <Label className="text-[#5B6FAF] font-semibold text-xs">Price Per Unit ($):</Label>
        <Input value={ps.pricePerUnit} onChange={e => onChange({ pricePerUnit: e.target.value })} />
      </div>
    </>
  );
}

// ---------- Control Tab ----------
function ControlTab({ ctrl, onChange }: { ctrl: LuminaireControl; onChange: (p: Partial<LuminaireControl>) => void }) {
  return (
    <>
      <SectionHeader title="Control Details" />
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-xs">QTY/Fixture</Label>
          <Input value={ctrl.qtyPerFixture} onChange={e => onChange({ qtyPerFixture: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs">Control Description:</Label>
          <Input value={ctrl.description} onChange={e => onChange({ description: e.target.value })} className="bg-muted/30" />
        </div>
      </div>

      <SectionHeader title="Filters" />
      <div className="grid grid-cols-4 gap-4">
        <div>
          <Label className="text-[#5B6FAF] font-semibold text-xs">Type:</Label>
          <Select value={ctrl.type} onValueChange={v => onChange({ type: v })}>
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
          <Input value={ctrl.manufacturer} onChange={e => onChange({ manufacturer: e.target.value })} />
        </div>
        <div>
          <Label className="text-[#5B6FAF] font-semibold text-xs">Dimming:</Label>
          <Input value={ctrl.dimming} onChange={e => onChange({ dimming: e.target.value })} />
        </div>
        <div>
          <Label className="text-[#5B6FAF] font-semibold text-xs">Model:</Label>
          <Input value={ctrl.model} onChange={e => onChange({ model: e.target.value })} />
        </div>
      </div>

      <div className="w-40">
        <Label className="text-[#5B6FAF] font-semibold text-xs">Price Per Unit ($):</Label>
        <Input value={ctrl.pricePerUnit} onChange={e => onChange({ pricePerUnit: e.target.value })} />
      </div>
    </>
  );
}

// ---------- Accessories Tab ----------
function AccessoriesTab({ accessories, onChange }: { accessories: LuminaireAccessory[]; onChange: (a: LuminaireAccessory[]) => void }) {
  const updateAccessory = (idx: number, patch: Partial<LuminaireAccessory>) => {
    onChange(accessories.map((a, i) => i === idx ? { ...a, ...patch } : a));
  };

  const addAccessory = () => {
    onChange([...accessories, { selected: true, qtyPerFixture: '', description: '', type: '', manufacturer: '', color: '', productCode: '', dimLength: '', dimWidth: '', dimDepth: '', dimDiameter: '', pricePerUnit: '' }]);
  };

  const current = accessories[0];
  if (!current) return null;

  return (
    <>
      <SectionHeader title="Accessories Details" />
      <div className="flex items-end gap-3">
        <div>
          <Label className="text-xs">Select</Label>
          <div className="flex gap-1">
            {accessories.map((acc, i) => (
              <button
                key={i}
                type="button"
                className={`w-8 h-8 rounded text-sm font-medium ${acc.selected ? 'bg-[#3B4A6B] text-white' : 'bg-muted text-muted-foreground'}`}
                onClick={() => updateAccessory(i, { selected: !acc.selected })}
              >
                {String.fromCharCode(65 + i)}
              </button>
            ))}
          </div>
        </div>
        <div>
          <Label className="text-xs">QTY/Fixture</Label>
          <Input value={current.qtyPerFixture} onChange={e => updateAccessory(0, { qtyPerFixture: e.target.value })} className="w-20" />
        </div>
        <div className="flex-1">
          <Label className="text-xs">Accessory Description</Label>
          <Input value={current.description} onChange={e => updateAccessory(0, { description: e.target.value })} className="bg-muted/30" />
        </div>
      </div>
      <Button type="button" size="sm" className="bg-[#3B4A6B] hover:bg-[#4B5A7B] text-white" onClick={addAccessory}>
        <Plus className="h-3 w-3 mr-1" />
        New Accessory
      </Button>

      <SectionHeader title="Filters" />
      <div className="grid grid-cols-4 gap-4">
        <div>
          <Label className="text-[#5B6FAF] font-semibold text-xs">Type:</Label>
          <Select value={current.type} onValueChange={v => updateAccessory(0, { type: v })}>
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
          <Input value={current.manufacturer} onChange={e => updateAccessory(0, { manufacturer: e.target.value })} />
        </div>
        <div>
          <Label className="text-[#5B6FAF] font-semibold text-xs">Color:</Label>
          <Input value={current.color} onChange={e => updateAccessory(0, { color: e.target.value })} />
        </div>
        <div>
          <Label className="text-[#5B6FAF] font-semibold text-xs">Product Code:</Label>
          <Input value={current.productCode} onChange={e => updateAccessory(0, { productCode: e.target.value })} />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div>
          <Label className="text-[#5B6FAF] font-semibold text-xs">Dimensions-Length (in):</Label>
          <Input value={current.dimLength} onChange={e => updateAccessory(0, { dimLength: e.target.value })} />
        </div>
        <div>
          <Label className="text-[#5B6FAF] font-semibold text-xs">Dimensions-Width (in):</Label>
          <Input value={current.dimWidth} onChange={e => updateAccessory(0, { dimWidth: e.target.value })} />
        </div>
        <div>
          <Label className="text-[#5B6FAF] font-semibold text-xs">Dimensions-Depth (in):</Label>
          <Input value={current.dimDepth} onChange={e => updateAccessory(0, { dimDepth: e.target.value })} />
        </div>
        <div>
          <Label className="text-[#5B6FAF] font-semibold text-xs">Dimensions-Diameter (in):</Label>
          <Input value={current.dimDiameter} onChange={e => updateAccessory(0, { dimDiameter: e.target.value })} />
        </div>
      </div>

      <div className="w-40">
        <Label className="text-[#5B6FAF] font-semibold text-xs">Price Per Unit ($):</Label>
        <Input value={current.pricePerUnit} onChange={e => updateAccessory(0, { pricePerUnit: e.target.value })} />
      </div>
    </>
  );
}

// ---------- SVG Helper ----------
function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(angleRad), y: cy + r * Math.sin(angleRad) };
}
