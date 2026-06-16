import { useState, useCallback, useRef, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
import { useCompanies } from '@/hooks/use-companies';
import { supabase } from '@/lib/supabase';
import { PROPERTY_TYPES } from '@/lib/constants';
import {
  CheckCircle,
  PlusCircle,
  MinusCircle,
  Trash2,
  Upload,
  Search,
  ChevronUp,
  ChevronDown,
  Lightbulb,
  Image,
  RefreshCw,
  HelpCircle,
  X,
  ExternalLink,
  Clock,
  Layers,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  type Luminaire as LumData,
  type ComponentTab,
  createEmptyLuminaire,
  LuminaireModal,
} from '@/components/shared/LuminaireEditModal';
import { RecentLuminairesModal, type LumRowData, type AreaOption } from '@/components/shared/RecentLuminairesModal';
import { buildLuminaireSummary } from '@/lib/formatters';

// ---------- US States ----------
const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY',
];

// ---------- Priority Definitions ----------
const PRIORITY_NAMES = ['Price', 'Time', 'Cost', 'Security', 'Human Centric', 'Other'] as const;
const PRIORITY_COLORS = ['#EC4899', '#F97316', '#84CC16', '#06B6D4', '#A855F7', '#6366F1'];

// ---------- Types ----------
type FlatLuminaire = {
  name?: string;
  quantity: number;
  wattage?: string;
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
};

type AreaData = {
  title: string;
  ceiling_height: string;
  daily_usage: string;
  area_sqft: string;
  application: string;
  voltage: string;
  installation_surface: string;
  control_type: string;
  ingress_protection: string;
  notes: string;
  image: string;
  luminaires: FlatLuminaire[];
};

function createEmptyArea(): AreaData {
  return {
    title: '', ceiling_height: '', daily_usage: '', area_sqft: '', application: '',
    voltage: '', installation_surface: '', control_type: '', ingress_protection: '',
    notes: '', image: '', luminaires: [],
  };
}

function createEmptyFlatLuminaire(): FlatLuminaire {
  return {
    name: '', quantity: 0, wattage: '',
    qty: '', fixtureMountHeight: '',
    fixtureDescription: '', lampPerFixture: '', lampDescription: '',
    powerQTYFixture: '', powerSupplyDescription: '',
    controlQTYFixture: '', controlDescription: '',
    accessoryDescriptionAQty: '', accessoryDescriptionA: '',
  };
}

// ================================================================
// MAIN COMPONENT
// ================================================================

export default function CreateProject() {
  const navigate = useNavigate();
  const { companyId: defaultCompanyId } = useAuth();
  const createProject = useCreateProject();
  const { data: companiesData } = useCompanies({ pageSize: 100 });
  const companies = companiesData?.rows ?? [];

  // Sync Company modal state
  const [syncCompanyOpen, setSyncCompanyOpen] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);

  // Initialize selectedCompanyId from auth on mount
  const companyId = selectedCompanyId ?? defaultCompanyId;

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

  // Priorities (default all to 0%)
  const [priorities, setPriorities] = useState([0, 0, 0, 0, 0, 0]);

  // Luminaires tab state
  const [areas, setAreas] = useState<AreaData[]>([]);
  const [areaFilter, setAreaFilter] = useState('all');
  const [collapsedAreas, setCollapsedAreas] = useState<Set<number>>(new Set());

  // Luminaire component edit modal state
  const [lumModalOpen, setLumModalOpen] = useState(false);
  const [lumTab, setLumTab] = useState<ComponentTab>('fixture');
  const [lumData, setLumData] = useState<LumData | null>(null);
  const editingLum = useRef<{ areaIndex: number; lumIndex: number }>({ areaIndex: 0, lumIndex: 0 });

  // Recent Luminaires modal state
  const [recentModalOpen, setRecentModalOpen] = useState(false);
  const recentModalLum = useRef<{ areaIndex: number; lumIndex: number }>({ areaIndex: 0, lumIndex: 0 });

  // Area image upload state
  const [activeAreaImageIndex, setActiveAreaImageIndex] = useState<number | null>(null);
  const [isUploadingAreaImage, setIsUploadingAreaImage] = useState(false);
  const areaImageInputRef = useRef<HTMLInputElement>(null);

  // Uploads tab state
  const [dragOver, setDragOver] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  // Project image upload state
  const [projectImage, setProjectImage] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Light count estimate modal state
  const [lightCountModalOpen, setLightCountModalOpen] = useState(false);

  // Priority helpers
  const totalPriority = priorities.reduce((a, b) => a + b, 0);

  const pieSlices = useMemo(() => {
    const slices: { pct: number; color: string }[] = [];
    priorities.forEach((val, i) => {
      if (val > 0) slices.push({ pct: val / 100, color: PRIORITY_COLORS[i] });
    });
    if (totalPriority < 100) slices.push({ pct: (100 - totalPriority) / 100, color: '#E5E7EB' });
    let cumulative = 0;
    return slices.map((slice, i) => {
      if (slice.pct >= 1) return { key: i, isFullCircle: true, color: slice.color, d: '' };
      const startAngle = cumulative * 360;
      cumulative += slice.pct;
      const endAngle = cumulative * 360;
      const start = polarToCartesian(100, 100, 80, startAngle);
      const end = polarToCartesian(100, 100, 80, endAngle);
      const largeArc = slice.pct > 0.5 ? 1 : 0;
      return { key: i, isFullCircle: false, color: slice.color, d: `M100,100 L${start.x},${start.y} A80,80 0 ${largeArc},1 ${end.x},${end.y} Z` };
    });
  }, [priorities, totalPriority]);

  const adjustPriority = useCallback((index: number, delta: number) => {
    setPriorities(prev => {
      const currentTotal = prev.reduce((a, b) => a + b, 0);
      const currentVal = prev[index];
      const newVal = Math.max(0, Math.min(100, currentVal + delta));
      const newTotal = currentTotal - currentVal + newVal;
      if (newTotal > 100) return prev;
      const next = [...prev];
      next[index] = newVal;
      return next;
    });
  }, []);

  // Area helpers
  const addArea = () => setAreas(prev => [...prev, createEmptyArea()]);
  const removeArea = (idx: number) => setAreas(prev => prev.filter((_, i) => i !== idx));
  const updateArea = (idx: number, patch: Partial<AreaData>) => {
    setAreas(prev => prev.map((a, i) => i === idx ? { ...a, ...patch } : a));
  };

  const toggleArea = (idx: number) => {
    setCollapsedAreas((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const removeLuminaire = (areaIdx: number, lumIdx: number) => {
    setAreas(prev => prev.map((a, ai) => ai === areaIdx ? {
      ...a,
      luminaires: a.luminaires.filter((_, li) => li !== lumIdx),
    } : a));
  };

  const openLumModal = useCallback((areaIndex: number, lumIndex: number, componentLabel: string) => {
    const vals = areas[areaIndex]?.luminaires[lumIndex] ?? createEmptyFlatLuminaire();
    const data = createEmptyLuminaire();
    data.fixture.qty = vals.qty ?? String(vals.quantity ?? '');
    data.fixture.mountHeight = vals.fixtureMountHeight ?? '';
    data.fixture.description = vals.fixtureDescription ?? '';
    data.lamp.qtyPerFixture = vals.lampPerFixture ?? '';
    data.lamp.description = vals.lampDescription ?? '';
    data.powerSupply.qtyPerFixture = vals.powerQTYFixture ?? '';
    data.powerSupply.description = vals.powerSupplyDescription ?? '';
    data.control.qtyPerFixture = vals.controlQTYFixture ?? '';
    data.control.description = vals.controlDescription ?? '';
    data.accessories[0].qtyPerFixture = vals.accessoryDescriptionAQty ?? '';
    data.accessories[0].description = vals.accessoryDescriptionA ?? '';
    data.luminaireDescription = [data.fixture.description, data.lamp.description, data.powerSupply.description, data.control.description, data.accessories[0]?.description].filter(Boolean).join(' , ');
    editingLum.current = { areaIndex, lumIndex };
    setLumData(data);
    setLumTab(COMP_TAB_MAP[componentLabel] ?? 'fixture');
    setLumModalOpen(true);
  }, [areas]);

  const handleLumModalChange = useCallback((patch: Partial<LumData>) => {
    setLumData((prev) => {
      if (!prev) return null;
      const updated: LumData = { ...prev, ...patch };
      const { areaIndex, lumIndex } = editingLum.current;
      const fieldPatch: Partial<FlatLuminaire> = {};
      if (patch.fixture) {
        fieldPatch.qty = updated.fixture.qty;
        fieldPatch.fixtureMountHeight = updated.fixture.mountHeight;
        fieldPatch.fixtureDescription = updated.fixture.description;
      }
      if (patch.lamp) {
        fieldPatch.lampPerFixture = updated.lamp.qtyPerFixture;
        fieldPatch.lampDescription = updated.lamp.description;
      }
      if (patch.powerSupply) {
        fieldPatch.powerQTYFixture = updated.powerSupply.qtyPerFixture;
        fieldPatch.powerSupplyDescription = updated.powerSupply.description;
      }
      if (patch.control) {
        fieldPatch.controlQTYFixture = updated.control.qtyPerFixture;
        fieldPatch.controlDescription = updated.control.description;
      }
      if (patch.accessories) {
        const acc0 = updated.accessories[0];
        fieldPatch.accessoryDescriptionAQty = acc0?.qtyPerFixture ?? '';
        fieldPatch.accessoryDescriptionA = acc0?.description ?? '';
      }
      setAreas((prevAreas) => prevAreas.map((a, ai) => ai !== areaIndex ? a : {
        ...a,
        luminaires: a.luminaires.map((l, li) => li !== lumIndex ? l : { ...l, ...fieldPatch }),
      }));
      return updated;
    });
  }, []);

  const handleRecentApply = useCallback((data: LumRowData) => {
    const { areaIndex, lumIndex } = recentModalLum.current;
    setAreas((prev) => prev.map((a, ai) => ai !== areaIndex ? a : {
      ...a,
      luminaires: a.luminaires.map((l, li) => li !== lumIndex ? l : {
        ...l,
        qty: data.qty ?? '',
        fixtureMountHeight: data.fixtureMountHeight ?? '',
        fixtureDescription: data.fixtureDescription ?? '',
        lampPerFixture: data.lampPerFixture ?? '',
        lampDescription: data.lampDescription ?? '',
        powerQTYFixture: data.powerQTYFixture ?? '',
        powerSupplyDescription: data.powerSupplyDescription ?? '',
        controlQTYFixture: data.controlQTYFixture ?? '',
        controlDescription: data.controlDescription ?? '',
        accessoryDescriptionAQty: data.accessoryDescriptionAQty ?? '',
        accessoryDescriptionA: data.accessoryDescriptionA ?? '',
        wattage: data.wattage ?? '',
      }),
    }));
  }, []);

  const recentAreas = useMemo<AreaOption[]>(() => areas.map((a) => ({
    title: a.title,
    application: a.application,
    luminaires: a.luminaires,
  })), [areas]);

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

  // Project image upload handler
  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    // Validate file type
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) {
      toast.error('Only JPEG, PNG, WebP, and GIF images are allowed');
      return;
    }

    // Validate file size (10 MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be smaller than 10 MB');
      return;
    }

    setIsUploadingImage(true);

    try {
      // Build a unique path using timestamp
      const timestamp = Date.now();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `temp/${timestamp}_${safeName}`;

      // Upload to Supabase Storage
      const { error: storageError } = await supabase.storage
        .from('project-images')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (storageError) {
        throw new Error(storageError.message);
      }

      // Get the public URL
      const { data: urlData } = supabase.storage
        .from('project-images')
        .getPublicUrl(storagePath);

      setProjectImage(urlData.publicUrl);
      toast.success('Image uploaded');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      toast.error(`Image upload failed: ${message}`);
    } finally {
      setIsUploadingImage(false);
    }
  }, []);

  // Area image upload handler
  const handleAreaImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const areaIndex = activeAreaImageIndex;
    e.target.value = '';
    if (!file || areaIndex === null) return;

    // Validate file type
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) {
      toast.error('Only JPEG, PNG, WebP, and GIF images are allowed');
      return;
    }

    // Validate file size (10 MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be smaller than 10 MB');
      return;
    }

    setIsUploadingAreaImage(true);

    try {
      // Build a unique path using timestamp
      const timestamp = Date.now();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `temp/area_${areaIndex}_${timestamp}_${safeName}`;

      // Upload to Supabase Storage
      const { error: storageError } = await supabase.storage
        .from('project-images')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (storageError) {
        throw new Error(storageError.message);
      }

      // Get the public URL
      const { data: urlData } = supabase.storage
        .from('project-images')
        .getPublicUrl(storagePath);

      updateArea(areaIndex, { image: urlData.publicUrl });
      toast.success('Image uploaded');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      toast.error(`Image upload failed: ${message}`);
    } finally {
      setIsUploadingAreaImage(false);
    }
  }, [activeAreaImageIndex]);

  // Submit
  const handleDone = async () => {
    if (!title.trim()) {
      toast.error('Project title is required');
      return;
    }
    if (!companyId) {
      toast.error('You must be associated with a company to create a project');
      return;
    }
    try {
      const projectId = await createProject.mutateAsync({
        title,
        company_id: companyId,
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
        image: projectImage || undefined,
        areas: areas.length > 0 ? areas : undefined,
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
    <DashboardLayout title={<span><Link to="/projects" className="hover:underline">Projects</Link><span className="mx-2">/</span><span>Create Project</span></span>} showSearch={false} actions={headerActions}>
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
              <div className="w-48 h-36 border-2 border-dashed border-border rounded-lg flex items-center justify-center bg-muted/30 overflow-hidden">
                {isUploadingImage ? (
                  <div className="animate-spin h-8 w-8 border-2 border-[#7BA23F] border-t-transparent rounded-full" />
                ) : projectImage ? (
                  <img src={projectImage} alt="Project" className="w-full h-full object-cover" />
                ) : (
                  <Image className="h-10 w-10 text-muted-foreground/40" />
                )}
              </div>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handleImageUpload}
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="bg-[#7BA23F] hover:bg-[#6B9235] text-white text-xs"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={isUploadingImage}
                >
                  <Image className="h-3 w-3 mr-1" />
                  {isUploadingImage ? 'Uploading...' : 'Upload Photo'}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="bg-[#F5A623] hover:bg-[#E09620] text-white text-xs"
                  onClick={() => setSyncCompanyOpen(true)}
                >
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
              <Label className="text-[#5B6FAF] font-semibold text-sm flex items-center gap-1">
                Light Count:
                <button
                  type="button"
                  onClick={() => setLightCountModalOpen(true)}
                  className="text-yellow-500 hover:text-yellow-600"
                >
                  <HelpCircle className="h-4 w-4" />
                </button>
              </Label>
              <Select value={lightCount} onValueChange={setLightCount}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Yes">Yes</SelectItem>
                  <SelectItem value="No">No</SelectItem>
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
                    <button
                      type="button"
                      onClick={() => adjustPriority(i, 5)}
                      disabled={totalPriority >= 100}
                      className={`${totalPriority >= 100 ? 'text-gray-300 cursor-not-allowed' : 'text-[#7BA23F] hover:text-[#6B9235]'}`}
                    >
                      <PlusCircle className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => adjustPriority(i, -5)}
                      disabled={priorities[i] === 0}
                      className={`${priorities[i] === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-[#D97B3A] hover:text-[#C06B2A]'}`}
                    >
                      <MinusCircle className="h-5 w-5" />
                    </button>
                    <span className="text-sm text-muted-foreground w-10 text-right">{priorities[i]}%</span>
                  </div>
                ))}
              </div>

              {/* Pie chart */}
              <div className="flex-shrink-0 relative">
                <svg viewBox="0 0 200 200" width="240" height="240">
                  {totalPriority === 0
                    ? <circle cx="100" cy="100" r="80" fill="#E5E7EB" />
                    : pieSlices.map(slice =>
                        slice.isFullCircle
                          ? <circle key={slice.key} cx="100" cy="100" r="80" fill={slice.color} />
                          : <path key={slice.key} d={slice.d} fill={slice.color} stroke="white" strokeWidth="1" />
                      )
                  }
                  <text x="100" y="105" textAnchor="middle" className="text-lg font-bold fill-gray-700">
                    {totalPriority}%
                  </text>
                </svg>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ============================================================ */}
        {/* LUMINAIRES TAB */}
        {/* ============================================================ */}
        <TabsContent value="luminaires" className="mt-6 space-y-4">
          <input
            ref={areaImageInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handleAreaImageUpload}
          />

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
                    <SelectItem key={i} value={String(i)}>{a.title || `Area ${i + 1}`}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="button" onClick={addArea} className="bg-[#7BA23F] hover:bg-[#6B9235] text-white">
              <Layers className="h-4 w-4 mr-2" />
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
                    value={area.title}
                    onChange={e => updateArea(realIdx, { title: e.target.value })}
                    placeholder="Area Title"
                    className="bg-transparent border-none text-white placeholder:text-white/60 text-lg font-semibold focus-visible:ring-0 p-0 h-auto"
                  />
                  <div className="flex items-center gap-2 ml-auto flex-shrink-0">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="bg-yellow-200 text-foreground hover:bg-yellow-300"
                      onClick={() => {
                        const newIndex = area.luminaires.length;
                        setAreas(prev => prev.map((a, ai) => ai !== realIdx ? a : {
                          ...a,
                          luminaires: [...a.luminaires, createEmptyFlatLuminaire()],
                        }));
                        setCollapsedAreas(prev => {
                          const next = new Set(prev);
                          next.delete(realIdx);
                          return next;
                        });
                        openLumModal(realIdx, newIndex, 'Fixture');
                      }}
                    >
                      <Lightbulb className="h-4 w-4 mr-1" />
                      Add Luminaire
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="bg-[#3B4A6B] text-white border-white hover:bg-[#4B5A7B]"
                      onClick={() => toggleArea(realIdx)}
                    >
                      Area Details
                      {!collapsedAreas.has(realIdx) ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
                    </Button>
                  </div>
                </div>

                {/* Area details */}
                {!collapsedAreas.has(realIdx) && (
                  <div className="p-4 space-y-4">
                    <div className="flex gap-6">
                      {/* Photo */}
                      <div className="flex-shrink-0 space-y-2">
                        <Button
                          type="button"
                          size="sm"
                          className="bg-[#7BA23F] hover:bg-[#6B9235] text-white text-xs"
                          onClick={() => {
                            setActiveAreaImageIndex(realIdx);
                            areaImageInputRef.current?.click();
                          }}
                          disabled={isUploadingAreaImage && activeAreaImageIndex === realIdx}
                        >
                          <Image className="h-3 w-3 mr-1" />
                          {isUploadingAreaImage && activeAreaImageIndex === realIdx ? 'Uploading...' : 'Upload Photo'}
                        </Button>
                        <div className="w-48 h-36 border-2 border-dashed border-border rounded-lg flex items-center justify-center bg-muted/30 overflow-hidden">
                          {isUploadingAreaImage && activeAreaImageIndex === realIdx ? (
                            <div className="animate-spin h-8 w-8 border-2 border-[#7BA23F] border-t-transparent rounded-full" />
                          ) : area.image ? (
                            <img src={area.image} alt="Area" className="w-full h-full object-cover" />
                          ) : (
                            <Image className="h-10 w-10 text-muted-foreground/40" />
                          )}
                        </div>
                      </div>

                      {/* Fields */}
                      <div className="flex-1 space-y-4">
                        <div className="grid grid-cols-4 gap-4">
                          <div>
                            <Label className="text-[#5B6FAF] font-semibold text-sm">Ceiling Height (feet):</Label>
                            <Input value={area.ceiling_height} onChange={e => updateArea(realIdx, { ceiling_height: e.target.value })} />
                          </div>
                          <div>
                            <Label className="text-[#5B6FAF] font-semibold text-sm">Daily Usage (hours):</Label>
                            <Input value={area.daily_usage} onChange={e => updateArea(realIdx, { daily_usage: e.target.value })} />
                          </div>
                          <div>
                            <Label className="text-[#5B6FAF] font-semibold text-sm">Area (sq.ft.):</Label>
                            <Input value={area.area_sqft} onChange={e => updateArea(realIdx, { area_sqft: e.target.value })} />
                          </div>
                          <div>
                            <Label className="text-[#5B6FAF] font-semibold text-sm">Application:</Label>
                            <Select value={area.application} onValueChange={v => updateArea(realIdx, { application: v })}>
                              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                              <SelectContent>
                                {['Indoor', 'Outdoor', 'Garage'].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
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
                                {['12V', '24V', '48V', '120V', '220V', '277V', '347V', '480V'].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-[#5B6FAF] font-semibold text-sm">Installation Surface:</Label>
                            <Select value={area.installation_surface} onValueChange={v => updateArea(realIdx, { installation_surface: v })}>
                              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                              <SelectContent>
                                {['Wood', 'Drywall', 'Metal', 'Concrete', 'Stone'].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-[#5B6FAF] font-semibold text-sm">Control Type:</Label>
                            <Select value={area.control_type} onValueChange={v => updateArea(realIdx, { control_type: v })}>
                              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                              <SelectContent>
                                {['Wall Switch', 'Timer', 'Photocell', 'Occupancy'].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-[#5B6FAF] font-semibold text-sm">Ingress Protection:</Label>
                            <Select value={area.ingress_protection} onValueChange={v => updateArea(realIdx, { ingress_protection: v })}>
                              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                              <SelectContent>
                                {['IP 54', 'IP 55', 'IP 65', 'IP 66', 'IP 67', 'IP 68'].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
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

                    {/* Luminaires */}
                    <div className="border-t border-border pt-4">
                      <LuminairesSubForm
                        luminaires={area.luminaires}
                        onEditComponent={(lumIndex, componentLabel) => openLumModal(realIdx, lumIndex, componentLabel)}
                        onOpenRecent={(lumIndex) => {
                          recentModalLum.current = { areaIndex: realIdx, lumIndex };
                          setRecentModalOpen(true);
                        }}
                        onRemove={(lumIndex) => removeLuminaire(realIdx, lumIndex)}
                      />
                    </div>
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
      <RecentLuminairesModal
        open={recentModalOpen}
        onClose={() => setRecentModalOpen(false)}
        areas={recentAreas}
        onApply={handleRecentApply}
      />
      <LuminaireModal
        open={lumModalOpen}
        onClose={() => setLumModalOpen(false)}
        tab={lumTab}
        setTab={setLumTab}
        luminaire={lumData ?? undefined}
        onChange={handleLumModalChange}
      />

      {/* ============================================================ */}
      {/* SYNC COMPANY MODAL */}
      {/* ============================================================ */}
      <Dialog open={syncCompanyOpen} onOpenChange={setSyncCompanyOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#5B6FAF]">Sync Company</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              Select a company to associate with this project.
            </p>
            <div>
              <Label className="text-[#5B6FAF] font-semibold text-sm mb-1.5 block">Company:</Label>
              <Select
                value={selectedCompanyId?.toString() ?? (defaultCompanyId?.toString() ?? '')}
                onValueChange={(val) => setSelectedCompanyId(Number(val))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a company" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id.toString()}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setSyncCompanyOpen(false)}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700"
              >
                Cancel
              </Button>
              <Button
                onClick={() => setSyncCompanyOpen(false)}
                className="bg-[#7BA23F] hover:bg-[#6B9235] text-white"
              >
                Sync
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ============================================================ */}
      {/* LIGHT COUNT ESTIMATE MODAL */}
      {/* ============================================================ */}
      <Dialog open={lightCountModalOpen} onOpenChange={setLightCountModalOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden [&>button]:hidden">
          <div className="bg-[#E8D87C] px-6 py-4 flex items-center justify-between">
            <DialogTitle className="text-lg font-bold text-gray-900">Light Count Estimate</DialogTitle>
            <button
              type="button"
              onClick={() => setLightCountModalOpen(false)}
              className="text-gray-700 hover:text-gray-900"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="px-6 py-6 space-y-6">
            <p className="text-center text-gray-700">
              Focus Earth can conduct a light count of your property for $0.01/sq.ft. The light count cost is waived from all approved projects upon authorization.
            </p>
            <div className="text-center">
              <p className="text-gray-700 mb-3">For your property, the site visit and count estimate is:</p>
              <div className="border border-gray-300 rounded-md px-4 py-3 inline-block min-w-[120px]">
                <span className="text-lg font-medium text-gray-900">
                  {propertySize ? (parseFloat(propertySize) * 0.01).toFixed(2) : '0'}
                </span>
              </div>
            </div>
            <div className="flex justify-center gap-4 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLightCountModalOpen(false)}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 border-gray-300 px-6"
              >
                Nevermind, Go Back
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setLightCount('Yes');
                  setLightCountModalOpen(false);
                }}
                className="bg-[#3B4A6B] hover:bg-[#4B5A7B] text-white px-6"
              >
                OK, Let's Do it!
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

// ================================================================
// LUMINAIRES SUB-FORM
// ================================================================

const LUM_COMPONENTS = [
  { label: 'Fixture',      qtyField: 'qty',                      descField: 'fixtureDescription' },
  { label: 'Lamp',         qtyField: 'lampPerFixture',           descField: 'lampDescription' },
  { label: 'Power Supply', qtyField: 'powerQTYFixture',          descField: 'powerSupplyDescription' },
  { label: 'Control',      qtyField: 'controlQTYFixture',        descField: 'controlDescription' },
  { label: 'Accessory',    qtyField: 'accessoryDescriptionAQty', descField: 'accessoryDescriptionA' },
] as const;

const COMP_TAB_MAP: Record<string, ComponentTab> = {
  Fixture: 'fixture',
  Lamp: 'lamp',
  'Power Supply': 'powerSupply',
  Control: 'control',
  Accessory: 'accessories',
};

function buildSummary(vals: FlatLuminaire): string {
  return buildLuminaireSummary(vals) || vals.name || '—';
}

function LuminairesSubForm({
  luminaires, onEditComponent, onOpenRecent, onRemove,
}: {
  luminaires: FlatLuminaire[];
  onEditComponent: (lumIndex: number, componentLabel: string) => void;
  onOpenRecent: (lumIndex: number) => void;
  onRemove: (lumIndex: number) => void;
}) {
  const [openLuminaires, setOpenLuminaires] = useState<Set<number>>(new Set());
  const toggleLum = (i: number) =>
    setOpenLuminaires((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  return (
    <div className="grid grid-cols-2 gap-4">
      {luminaires.map((lum, lumIndex) => {
        const isOpen = openLuminaires.has(lumIndex);
        const summary = buildSummary(lum);
        const qty = lum.qty || (lum.quantity ? String(lum.quantity) : '');

        return (
          <div key={lumIndex} className="mb-4">
            {/* Column labels - outside the box */}
            <div className="flex gap-2 text-xs font-bold text-muted-foreground uppercase pb-1 px-1">
              <span className="w-14 shrink-0">QTY</span>
              <span className="flex-1">Luminaire Description</span>
            </div>

            {/* Box wrapper - trash button anchored here */}
            <div className="relative">
              <button
                type="button"
                className="absolute -left-3 -top-2 w-5 h-5 bg-red-500 text-white rounded-sm flex items-center justify-center z-10"
                onClick={() => onRemove(lumIndex)}
              >
                <Trash2 className="h-3 w-3" />
              </button>

              {/* Summary row */}
              <div
                className="flex items-center gap-2 px-3 py-2 bg-muted/30 hover:bg-muted/50 border border-border cursor-pointer transition-colors mt-4"
                onClick={() => toggleLum(lumIndex)}
              >
                <span className="w-14 shrink-0 text-sm font-medium">{qty}</span>
                <span className="flex-1 text-sm leading-snug break-words min-w-0">{summary}</span>
                {isOpen
                  ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                  : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
              </div>

              {/* Accordion - component breakdown */}
              {isOpen && (
                <div className="border border-t-0 border-border bg-muted/30 px-4 py-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="grid grid-cols-[110px_1fr_60px] gap-2 flex-1 text-xs font-bold text-muted-foreground uppercase">
                      <span>Component</span>
                      <span>Description</span>
                      <span />
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      className="shrink-0 bg-sky-600 hover:bg-sky-700 text-white text-xs h-7 px-2 ml-2"
                      onClick={() => onOpenRecent(lumIndex)}
                    >
                      <Clock className="h-3 w-3 mr-1" />
                      Recent Luminaires
                    </Button>
                  </div>

                  {LUM_COMPONENTS.map(({ label, descField }) => (
                    <div key={label} className="grid grid-cols-[110px_1fr_60px] gap-2 text-sm py-1 items-start">
                      <span className="text-muted-foreground text-xs pt-1">{label}</span>
                      <div className="min-h-7 text-xs px-2 py-1 border border-border rounded bg-background break-words leading-snug">
                        {lum[descField] ?? ''}
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        className="h-7 text-xs px-2 bg-yellow-400 hover:bg-yellow-500 text-gray-900"
                        onClick={() => onEditComponent(lumIndex, label)}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />Edit
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {luminaires.length === 0 && (
        <p className="col-span-2 text-xs text-muted-foreground py-2">No luminaires. Use the &quot;Add Luminaire&quot; button above.</p>
      )}
    </div>
  );
}

// ---------- SVG Helper ----------
function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(angleRad), y: cy + r * Math.sin(angleRad) };
}
