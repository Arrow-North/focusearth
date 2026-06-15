import {
  type Luminaire as LumData,
  type ComponentTab,
  createEmptyLuminaire,
  buildLuminaireDescription,
  LuminaireModal,
} from '@/components/shared/LuminaireEditModal';
import {
  RecentLuminairesModal,
  type LumRowData,
  type AreaOption,
} from '@/components/shared/RecentLuminairesModal';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { useProject, useUpdateProject, useProjectFiles } from '@/hooks/use-projects';
import { useFileUpload } from '@/hooks/use-file-upload';
import { useCompanies } from '@/hooks/use-companies';
import { supabase } from '@/lib/supabase';
import { buildLuminaireSummary } from '@/lib/formatters';
import { toast } from 'sonner';
import {
  Check,
  Image as ImageIcon,
  RefreshCw,
  Plus,
  Minus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Lightbulb,
  Upload,
  Search,
  HelpCircle,
  X,
  ExternalLink,
  Clock,
  Layers
} from 'lucide-react';

const luminaireSchema = z.object({
  name: z.string().optional(),
  quantity: z.coerce.number().min(0).default(0),
  wattage: z.string().optional(),
  qty: z.string().optional(),
  fixtureMountHeight: z.string().optional(),
  fixtureDescription: z.string().optional(),
  lampPerFixture: z.string().optional(),
  lampDescription: z.string().optional(),
  powerQTYFixture: z.string().optional(),
  powerSupplyDescription: z.string().optional(),
  controlQTYFixture: z.string().optional(),
  controlDescription: z.string().optional(),
  accessoryDescriptionAQty: z.string().optional(),
  accessoryDescriptionA: z.string().optional(),
});

const areaSchema = z.object({
  title: z.string().min(1, 'Area title is required'),
  ceiling_height: z.string().optional(),
  daily_usage: z.string().optional(),
  area_sqft: z.string().optional(),
  application: z.string().optional(),
  voltage: z.string().optional(),
  installation_surface: z.string().optional(),
  control_type: z.string().optional(),
  ingress_protection: z.string().optional(),
  notes: z.string().optional(),
  image: z.string().optional(),
  luminaires: z.array(luminaireSchema).default([]),
});

const projectSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  company_id: z.coerce.number().min(1, 'Company is required'),
  property_type: z.string().optional(),
  property_size: z.string().optional(),
  address: z.string().optional(),
  address2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip_code: z.coerce.number().optional(),
  labor_cost: z.string().optional(),
  cost_per_kilowatt_hour: z.string().optional(),
  operation_days_per_year: z.coerce.number().optional(),
  sales_tax: z.string().optional(),
  complience_hyperlink: z.string().optional(),
  light_count: z.string().optional(),
  be_financing: z.string().optional(),
  interest_rate: z.string().optional(),
  deposit_amount: z.coerce.number().optional(),
  loan_period: z.coerce.number().optional(),
  notes: z.string().optional(),
  areas: z.array(areaSchema).default([]),
});

type ProjectFormValues = z.infer<typeof projectSchema>;

const PROPERTY_TYPES = ['Commercial', 'Residential', 'Industrial', 'Retail', 'Office', 'Warehouse', 'Other'];
const US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];
const APPLICATIONS = ['Indoor', 'Outdoor', 'Garage'];
const VOLTAGES = ['12V', '24V', '48V', '120V', '220V', '277V', '347V', '480V'];
const SURFACES = ['Wood', 'Drywall', 'Metal', 'Concrete', 'Stone'];
const CONTROL_TYPES = ['Wall Switch', 'Timer', 'Photocell', 'Occupancy'];
const INGRESS_RATINGS = ['IP 54', 'IP 55', 'IP 65', 'IP 66', 'IP 67', 'IP 68'];

const PRIORITY_LABELS = ['Price', 'Time', 'Cost', 'Security', 'Human Centric', 'Other'];


const PRIORITY_COLORS: Record<string, string> = {
  Price: '#EC4899',
  Time: '#F97316',
  Cost: '#84CC16',
  Security: '#06B6D4',
  'Human Centric': '#A855F7',
  Other: '#6366F1',
};


export default function EditProject() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const projectId = id ? Number(id) : undefined;

  const { data: project, isLoading } = useProject(projectId);
  const { data: files } = useProjectFiles(projectId);
  const updateProject = useUpdateProject();
  const { upload, isUploading } = useFileUpload();
  const { data: companiesData } = useCompanies({ pageSize: 100 });
  const companies = companiesData?.rows ?? [];

  const [activeTab, setActiveTab] = useState<'property' | 'luminaires' | 'uploads'>('property');
  const [priorities, setPriorities] = useState<Record<string, number>>({
    Price: 0,
    Time: 0,
    Cost: 0,
    Security: 0,
    'Human Centric': 0,
    Other: 0,
  });
  const [collapsedAreas, setCollapsedAreas] = useState<Set<number>>(new Set());
  const [areaFilter, setAreaFilter] = useState<string>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Areas/luminaires as last saved to the database. Used by "Recent Luminaires"
  // so a luminaire that gets replaced in the (unsaved) form stays selectable
  // until the project is actually saved.
  const savedAreas = useMemo<AreaOption[]>(() => {
    if (!project) return [];
    const raw = project.areas;
    const parsed = typeof raw === 'string'
      ? (() => { try { return JSON.parse(raw); } catch { return []; } })()
      : (raw ?? []);
    return (parsed as Record<string, unknown>[]).map((a) => ({
      title: (a.title as string) ?? '',
      application: (a.application as string) ?? '',
      luminaires: (a.luminaires as LumRowData[]) ?? [],
    }));
  }, [project]);

  // Project image upload state
  const [projectImage, setProjectImage] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Area image upload state
  const [activeAreaImageIndex, setActiveAreaImageIndex] = useState<number | null>(null);
  const [isUploadingAreaImage, setIsUploadingAreaImage] = useState(false);
  const areaImageInputRef = useRef<HTMLInputElement>(null);

  // Sync Company modal state
  const [syncCompanyOpen, setSyncCompanyOpen] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);

  // Light count estimate modal state
  const [lightCountModalOpen, setLightCountModalOpen] = useState(false);

  // Luminaire component edit modal state
  const [lumModalOpen, setLumModalOpen] = useState(false);
  const [lumTab, setLumTab] = useState<ComponentTab>('fixture');
  const [lumData, setLumData] = useState<LumData | null>(null);
  const editingLum = useRef<{ areaIndex: number; lumIndex: number }>({ areaIndex: 0, lumIndex: 0 });

  // Recent Luminaires modal state
  const [recentModalOpen, setRecentModalOpen] = useState(false);
  const recentModalLum = useRef<{ areaIndex: number; lumIndex: number }>({ areaIndex: 0, lumIndex: 0 });

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      title: '',
      company_id: 0,
      property_type: '',
      property_size: '',
      address: '',
      address2: '',
      city: '',
      state: '',
      zip_code: undefined,
      labor_cost: '',
      cost_per_kilowatt_hour: '',
      operation_days_per_year: undefined,
      sales_tax: '',
      complience_hyperlink: '',
      light_count: '',
      be_financing: '',
      interest_rate: '',
      deposit_amount: undefined,
      loan_period: undefined,
      notes: '',
      areas: [],
    },
  });

  const {
    fields: areaFields,
    append: appendArea,
    remove: removeArea,
  } = useFieldArray({ control: form.control, name: 'areas' });

  // Populate form when project loads
  useEffect(() => {
    if (!project) return;

    const notesStr =
      project.notes && typeof project.notes === 'object'
        ? JSON.stringify(project.notes)
        : typeof project.notes === 'string'
          ? project.notes
          : '';

    form.reset({
      title: project.title ?? '',
      company_id: project.company_id ?? 0,
      property_type: project.property_type ?? '',
      property_size: project.property_size ?? '',
      address: project.address ?? '',
      address2: project.address2 ?? '',
      city: project.city ?? '',
      state: project.state ?? '',
      zip_code: project.zip_code ?? undefined,
      labor_cost: project.labor_cost ?? '',
      cost_per_kilowatt_hour: project.cost_per_kilowatt_hour ?? '',
      operation_days_per_year: project.operation_days_per_year ?? undefined,
      sales_tax: project.sales_tax ?? '',
      complience_hyperlink: project.complience_hyperlink ?? '',
      light_count: project.light_count ?? '',
      be_financing: project.be_financing ?? '',
      interest_rate: project.interest_rate ?? '',
      deposit_amount: project.deposit_amount ?? undefined,
      loan_period: project.loan_period ?? undefined,
      notes: notesStr,
      areas: ((): typeof project.areas => {
        const raw = project.areas;
        if (typeof raw === 'string') {
          try { return JSON.parse(raw); } catch { return []; }
        }
        return raw ?? [];
      })().map((a) => ({
        title: (a as Record<string, unknown>).title as string ?? '',
        ceiling_height: (a as Record<string, unknown>).ceiling_height as string ?? '',
        daily_usage: (a as Record<string, unknown>).daily_usage as string ?? '',
        area_sqft: (a as Record<string, unknown>).area_sqft as string ?? '',
        application: (a as Record<string, unknown>).application as string ?? '',
        voltage: (a as Record<string, unknown>).voltage as string ?? '',
        installation_surface: (a as Record<string, unknown>).installation_surface as string ?? '',
        control_type: (a as Record<string, unknown>).control_type as string ?? '',
        ingress_protection: (a as Record<string, unknown>).ingress_protection as string ?? '',
        notes: (a as Record<string, unknown>).notes as string ?? '',
        image: (a as Record<string, unknown>).image as string ?? '',
        luminaires: (a.luminaires ?? []).map((l) => ({
          name: l.name ?? '',
          quantity: l.quantity ?? 0,
          wattage: l.wattage ?? '',
          qty: l.qty ?? '',
          fixtureMountHeight: l.fixtureMountHeight ?? '',
          fixtureDescription: l.fixtureDescription ?? '',
          lampPerFixture: l.lampPerFixture ?? '',
          lampDescription: l.lampDescription ?? '',
          powerQTYFixture: l.powerQTYFixture ?? '',
          powerSupplyDescription: l.powerSupplyDescription ?? '',
          controlQTYFixture: l.controlQTYFixture ?? '',
          controlDescription: l.controlDescription ?? '',
          accessoryDescriptionAQty: l.accessoryDescriptionAQty ?? '',
          accessoryDescriptionA: l.accessoryDescriptionA ?? '',
        })),
      })),
    });

    // Set priorities
    if (project.property_priorities && typeof project.property_priorities === 'object') {
      const pp = project.property_priorities as Record<string, number>;
      setPriorities((prev) => ({
        ...prev,
        ...Object.fromEntries(PRIORITY_LABELS.map((l) => [l, pp[l] ?? 0])),
      }));
    }

    // Set project image
    if (project.image) {
      setProjectImage(project.image);
    }

    // Set selected company
    if (project.company_id) {
      setSelectedCompanyId(project.company_id);
    }
  }, [project, form]);

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
      const storagePath = `projects/${projectId}/${timestamp}_${safeName}`;

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
  }, [projectId]);

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
      const storagePath = `${projectId}/area_${areaIndex}_${timestamp}_${safeName}`;

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

      form.setValue(`areas.${areaIndex}.image`, urlData.publicUrl);
      toast.success('Image uploaded');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      toast.error(`Image upload failed: ${message}`);
    } finally {
      setIsUploadingAreaImage(false);
    }
  }, [projectId, activeAreaImageIndex, form]);

  const onSubmit = async (values: ProjectFormValues) => {
    if (!projectId) return;

    await updateProject.mutateAsync({
      projectId,
      fields: {
        title: values.title,
        company_id: selectedCompanyId ?? values.company_id,
        property_type: values.property_type || null,
        property_size: values.property_size || null,
        address: values.address || null,
        address2: values.address2 || null,
        city: values.city || null,
        state: values.state || null,
        zip_code: values.zip_code || null,
        labor_cost: values.labor_cost || null,
        cost_per_kilowatt_hour: values.cost_per_kilowatt_hour || null,
        operation_days_per_year: values.operation_days_per_year || null,
        sales_tax: values.sales_tax || null,
        complience_hyperlink: values.complience_hyperlink || null,
        light_count: values.light_count || null,
        be_financing: values.be_financing || null,
        interest_rate: values.interest_rate || null,
        deposit_amount: values.deposit_amount || null,
        loan_period: values.loan_period || null,
        notes: values.notes || null,
        areas: values.areas.length > 0 ? values.areas : null,
        property_priorities: priorities,
        image: projectImage || null,
      },
    });

    navigate(`/projects/${projectId}`);
  };

  const toggleArea = (idx: number) => {
    setCollapsedAreas((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const adjustPriority = useCallback((label: string, delta: number) => {
    setPriorities((prev) => {
      const total = Object.values(prev).reduce((a, b) => a + b, 0);
      const current = prev[label] ?? 0;
      const next = Math.max(0, Math.min(100, current + delta));
      if (total - current + next > 100) return prev;
      return { ...prev, [label]: next };
    });
  }, []);

  const totalPriority = useMemo(
    () => Object.values(priorities).reduce((a, b) => a + b, 0),
    [priorities],
  );

  const pieData = useMemo(() => {
    const slices = PRIORITY_LABELS
      .filter((l) => priorities[l] > 0)
      .map((l) => ({ name: l, value: priorities[l], color: PRIORITY_COLORS[l] }));
    const remainder = 100 - totalPriority;
    if (slices.length === 0) return [{ name: 'Empty', value: 100, color: '#d1d5db' }];
    if (remainder > 0) return [...slices, { name: 'Unallocated', value: remainder, color: '#d1d5db' }];
    return slices;
  }, [priorities, totalPriority]);

  const handleFileDrop = useCallback(
    async (fileList: FileList) => {
      if (!projectId) return;
      for (const file of Array.from(fileList)) {
        await upload({ file, entityType: 'project', entityId: projectId });
      }
    },
    [projectId, upload],
  );

  const openLumModal = useCallback((areaIndex: number, lumIndex: number, componentLabel: string) => {
    const vals = form.getValues(`areas.${areaIndex}.luminaires.${lumIndex}`) ?? {};
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
  }, [form]);

  const handleLumModalChange = useCallback((patch: Partial<LumData>) => {
    setLumData((prev) => {
      if (!prev) return null;
      const updated: LumData = { ...prev, ...patch };
      const { areaIndex, lumIndex } = editingLum.current;
      const base = `areas.${areaIndex}.luminaires.${lumIndex}` as const;
      if (patch.fixture) {
        form.setValue(`${base}.qty`, updated.fixture.qty);
        form.setValue(`${base}.fixtureMountHeight`, updated.fixture.mountHeight);
        form.setValue(`${base}.fixtureDescription`, updated.fixture.description);
      }
      if (patch.lamp) {
        form.setValue(`${base}.lampPerFixture`, updated.lamp.qtyPerFixture);
        form.setValue(`${base}.lampDescription`, updated.lamp.description);
      }
      if (patch.powerSupply) {
        form.setValue(`${base}.powerQTYFixture`, updated.powerSupply.qtyPerFixture);
        form.setValue(`${base}.powerSupplyDescription`, updated.powerSupply.description);
      }
      if (patch.control) {
        form.setValue(`${base}.controlQTYFixture`, updated.control.qtyPerFixture);
        form.setValue(`${base}.controlDescription`, updated.control.description);
      }
      if (patch.accessories) {
        const acc0 = updated.accessories[0];
        form.setValue(`${base}.accessoryDescriptionAQty`, acc0?.qtyPerFixture ?? '');
        form.setValue(`${base}.accessoryDescriptionA`, acc0?.description ?? '');
      }
      return updated;
    });
  }, [form]);

  const handleRecentApply = useCallback((data: LumRowData) => {
    const { areaIndex, lumIndex } = recentModalLum.current;
    const base = `areas.${areaIndex}.luminaires.${lumIndex}` as const;
    form.setValue(`${base}.qty`, data.qty ?? '');
    form.setValue(`${base}.fixtureMountHeight`, data.fixtureMountHeight ?? '');
    form.setValue(`${base}.fixtureDescription`, data.fixtureDescription ?? '');
    form.setValue(`${base}.lampPerFixture`, data.lampPerFixture ?? '');
    form.setValue(`${base}.lampDescription`, data.lampDescription ?? '');
    form.setValue(`${base}.powerQTYFixture`, data.powerQTYFixture ?? '');
    form.setValue(`${base}.powerSupplyDescription`, data.powerSupplyDescription ?? '');
    form.setValue(`${base}.controlQTYFixture`, data.controlQTYFixture ?? '');
    form.setValue(`${base}.controlDescription`, data.controlDescription ?? '');
    form.setValue(`${base}.accessoryDescriptionAQty`, data.accessoryDescriptionAQty ?? '');
    form.setValue(`${base}.accessoryDescriptionA`, data.accessoryDescriptionA ?? '');
    form.setValue(`${base}.wattage`, data.wattage ?? '');
  }, [form]);

  if (isLoading) {
    return (
      <DashboardLayout title="Edit Project" showSearch={false}>
        <div className="space-y-4">
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
          <div className="h-64 bg-muted animate-pulse rounded-lg" />
        </div>
      </DashboardLayout>
    );
  }

  if (!project) {
    return (
      <DashboardLayout title="Project Not Found" showSearch={false}>
        <div className="text-center py-16 text-muted-foreground">
          <p>Project not found.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/projects')}>
            Back to Projects
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const headerActions = (
    <Button
      size="sm"
      className="bg-lime-400 hover:bg-lime-500 text-gray-900"
      onClick={form.handleSubmit(onSubmit)}
      disabled={updateProject.isPending}
    >
      <Check className="h-4 w-4 mr-1.5" />
      {updateProject.isPending ? 'Saving...' : 'Done'}
    </Button>
  );

  return (
    <DashboardLayout title={<span><Link to="/projects" className="hover:underline">Projects</Link><span className="mx-2">/</span><span>Edit Project</span></span>} showSearch={false} actions={headerActions}>
      <div className="bg-transparent">
        <div className="flex">
          {(['property', 'luminaires', 'uploads'] as const).map((tab) => (
            <button
              key={tab}
              className={`px-8 py-3 text-sm font-medium capitalize transition-colors ${
                activeTab === tab
                  ? 'text-gray-900 border-b-2 border-green-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            {activeTab === 'property' && (
              <div className="p-6 space-y-6 border border-[#E2E8F0]">
                {/* Image + basic fields row */}
                <div className="flex gap-6">
                  {/* Image */}
                  <div className="shrink-0">
                    <div className="w-44 h-36 rounded-lg overflow-hidden bg-gray-100 border border-gray-200 mb-2 flex items-center justify-center">
                      {isUploadingImage ? (
                        <div className="animate-spin h-8 w-8 border-2 border-green-600 border-t-transparent rounded-full" />
                      ) : projectImage ? (
                        <img src={projectImage} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Lightbulb className="h-12 w-12 text-gray-300" strokeWidth={1} />
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
                        variant="outline"
                        className="text-xs bg-green-50 text-green-700 border-green-300"
                        onClick={() => imageInputRef.current?.click()}
                        disabled={isUploadingImage}
                      >
                        <ImageIcon className="h-3 w-3 mr-1" />
                        {isUploadingImage ? 'Uploading...' : 'Upload Photo'}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="text-xs bg-orange-50 text-orange-700 border-orange-300"
                        onClick={() => setSyncCompanyOpen(true)}
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Sync Company
                      </Button>
                    </div>
                  </div>

                  {/* Basic fields + Address fields */}
                  <div className="flex-1 space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-green-700 font-semibold text-xs">Project Title:</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="property_type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-green-700 font-semibold text-xs">Property Type:</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {PROPERTY_TYPES.map((t) => (
                                  <SelectItem key={t} value={t.toLowerCase()}>{t}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="property_size"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-green-700 font-semibold text-xs">Property Size (sq.ft):</FormLabel>
                            <FormControl><Input {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <FormField control={form.control} name="address" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-green-700 font-semibold text-xs">Address:</FormLabel>
                          <FormControl><Input {...field} /></FormControl>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="address2" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-green-700 font-semibold text-xs">Address 2:</FormLabel>
                          <FormControl><Input {...field} /></FormControl>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="city" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-green-700 font-semibold text-xs">City:</FormLabel>
                          <FormControl><Input {...field} /></FormControl>
                        </FormItem>
                      )} />
                    </div>
                  </div>
                </div>

                {/* State / Zip / Labor / Cost row */}
                <div className="grid grid-cols-4 gap-4">
                  <FormField control={form.control} name="state" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-green-700 font-semibold text-xs">State:</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {US_STATES.map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="zip_code" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-green-700 font-semibold text-xs">Zip Code:</FormLabel>
                      <FormControl><Input type="number" {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="labor_cost" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-green-700 font-semibold text-xs">Labor Cost (hourly):</FormLabel>
                      <FormControl><Input placeholder="$ 0" {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="cost_per_kilowatt_hour" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-green-700 font-semibold text-xs">Cost per kilowatt hour ($/kWh):</FormLabel>
                      <FormControl><Input placeholder="$ 0.00" {...field} /></FormControl>
                    </FormItem>
                  )} />
                </div>

                {/* Operation / Tax / Compliance / Light Count */}
                <div className="grid grid-cols-4 gap-4">
                  <FormField control={form.control} name="operation_days_per_year" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-green-700 font-semibold text-xs">Operation Days Per Year:</FormLabel>
                      <FormControl><Input type="number" {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="sales_tax" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-green-700 font-semibold text-xs">Sales Tax % (If Applicable):</FormLabel>
                      <FormControl><Input placeholder="0 %" {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="complience_hyperlink" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-green-700 font-semibold text-xs">Compliance Hyperlink (If Applicable):</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="light_count" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-green-700 font-semibold text-xs flex items-center gap-1">
                        Light Count:
                        <button
                          type="button"
                          onClick={() => setLightCountModalOpen(true)}
                          className="text-yellow-500 hover:text-yellow-600"
                        >
                          <HelpCircle className="h-3.5 w-3.5" />
                        </button>
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Yes">Yes</SelectItem>
                          <SelectItem value="No">No</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                </div>

                {/* Financing row */}
                <div className="grid grid-cols-4 gap-4">
                  <FormField control={form.control} name="be_financing" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-green-700 font-semibold text-xs">Will you be financing this project?:</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Yes">Yes</SelectItem>
                          <SelectItem value="No">No</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="interest_rate" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-green-700 font-semibold text-xs">Interest Rate (%):</FormLabel>
                      <FormControl><Input placeholder="0 %" {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="deposit_amount" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-green-700 font-semibold text-xs">Deposit Amount ($):</FormLabel>
                      <FormControl><Input type="number" placeholder="$ 0" {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="loan_period" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-green-700 font-semibold text-xs">Loan Period (months):</FormLabel>
                      <FormControl><Input type="number" {...field} /></FormControl>
                    </FormItem>
                  )} />
                </div>

                {/* Notes */}
                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-green-700 font-semibold text-xs">Notes:</FormLabel>
                    <FormControl>
                      <Textarea rows={3} {...field} />
                    </FormControl>
                  </FormItem>
                )} />

                {/* Project Priorities */}
                <div>
                  <p className="text-green-700 font-semibold text-xs mb-3">Project Priorities:</p>
                  <div className="flex gap-6">
                    {/* Priority controls */}
                    <div className="flex-1 grid grid-cols-2 gap-3">
                      {PRIORITY_LABELS.map((label) => (
                        <div
                          key={label}
                          className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2"
                        >
                          <div className="w-1.5 h-8 rounded-sm" style={{ backgroundColor: PRIORITY_COLORS[label] }} />
                          <span className="text-sm font-medium min-w-[100px]">{label}</span>
                          <button
                            type="button"
                            disabled={totalPriority >= 100}
                            className={`w-6 h-6 rounded-full flex items-center justify-center ${
                              totalPriority >= 100
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-green-600 text-white hover:bg-green-700'
                            }`}
                            onClick={() => adjustPriority(label, 5)}
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={priorities[label] === 0}
                            className={`w-6 h-6 rounded-full flex items-center justify-center ${
                              priorities[label] === 0
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-red-500 text-white hover:bg-red-600'
                            }`}
                            onClick={() => adjustPriority(label, -5)}
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="text-sm text-gray-600 ml-auto">{priorities[label]}%</span>
                        </div>
                      ))}
                    </div>

                    {/* Pie chart */}
                    <div className="shrink-0 h-72 w-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={115}
                            innerRadius={0}
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'luminaires' && (
              <div className="p-6 space-y-4 border border-[##E2E8F0] bg-[#f2f2f2]">
                <input
                  ref={areaImageInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={handleAreaImageUpload}
                />
                {/* Area selector + add button */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-gray-700">Area:</span>
                    <Select value={areaFilter} onValueChange={setAreaFilter}>
                      <SelectTrigger className="w-56">
                        <SelectValue placeholder="All Areas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Areas</SelectItem>
                        {areaFields.map((a, i) => (
                          <SelectItem key={a.id} value={String(i)}>
                            {form.watch(`areas.${i}.title`) || `Area ${i + 1}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    className="bg-[#8FCF74] hover:bg-[#8FCF74] text-gray-700"
                    onClick={() => {
                      appendArea({
                        title: '',
                        ceiling_height: '',
                        daily_usage: '',
                        area_sqft: '',
                        application: '',
                        voltage: '',
                        installation_surface: '',
                        control_type: '',
                        ingress_protection: '',
                        notes: '',
                        image: '',
                        luminaires: [],
                      });
                    }}
                  >
                    <Layers className="h-4 w-4 mr-1" />
                    Add New Area
                  </Button>
                </div>

                {/* Area sections */}
                {areaFields.map((areaField, areaIndex) => {
                  if (areaFilter !== 'all' && areaFilter !== String(areaIndex)) return null;
                  return (
                  <div key={areaField.id} className="relative">
                    {/* Delete button */}
                    <button
                      type="button"
                      className="absolute -left-2 -top-2 w-5 h-5 bg-red-500 text-white rounded-sm flex items-center justify-center z-10"
                      onClick={() => removeArea(areaIndex)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>

                    {/* Area header */}
                    <div className="bg-[#2c628d] text-white rounded-t-lg px-4 py-3 flex items-center justify-between">
                      <FormField
                        control={form.control}
                        name={`areas.${areaIndex}.title`}
                        render={({ field }) => (
                          <input
                            className="bg-transparent text-white text-lg font-bold border-none outline-none placeholder:text-gray-300 w-64"
                            placeholder="Area name..."
                            {...field}
                          />
                        )}
                      />
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          className="bg-[#ffe68d] hover:bg-[##ffe68d] text-gray-700 border-none"
                          onClick={() => {
                            const lums = form.getValues(`areas.${areaIndex}.luminaires`);
                            const newIndex = lums.length;
                            form.setValue(`areas.${areaIndex}.luminaires`, [
                              ...lums,
                              {
                                name: '', quantity: 0, wattage: '',
                                qty: '', fixtureMountHeight: '',
                                fixtureDescription: '', lampPerFixture: '', lampDescription: '',
                                powerQTYFixture: '', powerSupplyDescription: '',
                                controlQTYFixture: '', controlDescription: '',
                                accessoryDescriptionAQty: '', accessoryDescriptionA: '',
                              },
                            ]);
                            setCollapsedAreas((prev) => {
                              const next = new Set(prev);
                              next.delete(areaIndex);
                              return next;
                            });
                            openLumModal(areaIndex, newIndex, 'Fixture');
                          }}
                        >
                          <Lightbulb className="h-4 w-4 mr-1" />
                          Add Luminaire
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          className="bg-[#2c628d] hover:bg-[#2c628d] text-white border border-white"
                          onClick={() => toggleArea(areaIndex)}
                        >
                          Area Details
                          {!collapsedAreas.has(areaIndex) ? (
                            <ChevronUp className="h-4 w-4 ml-1" />
                          ) : (
                            <ChevronDown className="h-4 w-4 ml-1" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Area details (collapsible) */}
                    {!collapsedAreas.has(areaIndex) && (
                      
                      <div className="p-4 space-y-4">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="mb-2 text-xs bg-[#8FCF74] hover:bg-[#8FCF74] text-gray-700 hover:text-gray-700"
                          onClick={() => {
                            setActiveAreaImageIndex(areaIndex);
                            areaImageInputRef.current?.click();
                          }}
                          disabled={isUploadingAreaImage && activeAreaImageIndex === areaIndex}
                        >
                          <ImageIcon className="h-3 w-3 mr-1" />
                          {isUploadingAreaImage && activeAreaImageIndex === areaIndex ? 'Uploading...' : 'Upload Photo'}
                        </Button>
                        {/* Image + details grid */}
                        <div className="flex gap-4">
                          <div className="shrink-0">
                            <div className="w-64 h-full bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center overflow-hidden">
                              {isUploadingAreaImage && activeAreaImageIndex === areaIndex ? (
                                <div className="animate-spin h-8 w-8 border-2 border-green-600 border-t-transparent rounded-full" />
                              ) : form.watch(`areas.${areaIndex}.image`) ? (
                                <img src={form.watch(`areas.${areaIndex}.image`)} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <Lightbulb className="h-12 w-12 text-gray-300" strokeWidth={1} />
                              )}
                            </div>
                          </div>

                          <div className="flex-1 grid grid-cols-4 gap-3 content-start">
                            <FormField control={form.control} name={`areas.${areaIndex}.ceiling_height`} render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-[#2c628d] font-semibold text-xs">Ceiling Height (feet):</FormLabel>
                                <FormControl><Input {...field} /></FormControl>
                              </FormItem>
                            )} />
                            <FormField control={form.control} name={`areas.${areaIndex}.daily_usage`} render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-[#2c628d] font-semibold text-xs">Daily Usage (hours):</FormLabel>
                                <FormControl><Input {...field} /></FormControl>
                              </FormItem>
                            )} />
                            <FormField control={form.control} name={`areas.${areaIndex}.area_sqft`} render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-[#2c628d] font-semibold text-xs">Area (sq.ft.):</FormLabel>
                                <FormControl><Input {...field} /></FormControl>
                              </FormItem>
                            )} />
                            <FormField control={form.control} name={`areas.${areaIndex}.application`} render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-[#2c628d] font-semibold text-xs">Application:</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                                  <SelectContent>
                                    {APPLICATIONS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </FormItem>
                            )} />

                            <FormField control={form.control} name={`areas.${areaIndex}.voltage`} render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-[#2c628d] font-semibold text-xs">Voltage:</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                                  <SelectContent>
                                    {VOLTAGES.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </FormItem>
                            )} />
                            <FormField control={form.control} name={`areas.${areaIndex}.installation_surface`} render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-[#2c628d] font-semibold text-xs">Installation Surface:</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                                  <SelectContent>
                                    {SURFACES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </FormItem>
                            )} />
                            <FormField control={form.control} name={`areas.${areaIndex}.control_type`} render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-[#2c628d] font-semibold text-xs">Control Type:</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                                  <SelectContent>
                                    {CONTROL_TYPES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </FormItem>
                            )} />
                            <FormField control={form.control} name={`areas.${areaIndex}.ingress_protection`} render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-[#2c628d] font-semibold text-xs">Ingress Protection:</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                                  <SelectContent>
                                    {INGRESS_RATINGS.map((ip) => <SelectItem key={ip} value={ip}>{ip}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </FormItem>
                            )} />
                            <FormField control={form.control} name={`areas.${areaIndex}.notes`} render={({ field }) => (
                              <FormItem className="col-span-4">
                                <FormLabel className="text-[#2c628d] font-semibold text-xs">Notes:</FormLabel>
                                <FormControl><Input {...field} /></FormControl>
                              </FormItem>
                            )} />
                          </div>
                        </div>

                        <div className="border-b border-[#E2E8F0]"> </div>

                        {/* Luminaires table */}
                        <div className="!mt-[4rem]">
                          <LuminairesSubForm
                            form={form}
                            areaIndex={areaIndex}
                            onEditComponent={(lumIndex, componentLabel) => openLumModal(areaIndex, lumIndex, componentLabel)}
                            onOpenRecent={(lumIndex) => {
                              recentModalLum.current = { areaIndex, lumIndex };
                              setRecentModalOpen(true);
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  );
                })}

                {areaFields.length === 0 && (
                  <div className="text-center py-12 text-gray-400">
                    <Lightbulb className="h-8 w-8 mx-auto mb-2" />
                    <p className="text-sm">No areas defined. Click &quot;Add New Area&quot; to get started.</p>
                  </div>
                )}
              </div>
            )}

            {/* Uploads Tab */}
            {activeTab === 'uploads' && (
              <div className="p-6 space-y-6">
                <div className="flex items-start justify-between gap-6">
                  <p className="text-sm text-gray-700 max-w-lg">
                    Upload pertinent company files by dragging them into the designated area (below) or browse your device (blue button). Whether it&apos;s a reflected ceiling plan, insurance documentation or building schematics - the more information we have, the better we can assist!
                  </p>
                  <Button
                    type="button"
                    className="bg-slate-700 hover:bg-slate-800 text-white shrink-0"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Search className="h-4 w-4 mr-2" />
                    Browse For Files
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files) handleFileDrop(e.target.files);
                    }}
                  />
                </div>

                {/* Drag & drop zone */}
                <div
                  className="border-2 border-dashed border-gray-300 rounded-lg py-16 flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 transition-colors"
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (e.dataTransfer.files.length > 0) {
                      handleFileDrop(e.dataTransfer.files);
                    }
                  }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-10 w-10 text-gray-400 mb-3" />
                  <p className="text-sm text-gray-600">
                    <span className="font-bold">Drag+Drop</span> Files to Upload
                  </p>
                </div>

                {isUploading && (
                  <p className="text-sm text-gray-500">Uploading...</p>
                )}

                {/* Existing files */}
                {files && files.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-bold text-gray-700">Uploaded Files</h3>
                    {files.map((file) => (
                      <div key={file.id} className="flex items-center justify-between border border-gray-200 rounded px-3 py-2">
                        <span className="text-sm text-gray-700">{file.name}</span>
                        <span className="text-xs text-gray-400">
                          {file.created_at ? new Date(file.created_at).toLocaleDateString() : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </form>
        </Form>
      </div>

      {/* Sync Company Dialog */}
      <Dialog open={syncCompanyOpen} onOpenChange={setSyncCompanyOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-green-700">Sync Company</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              Select a company to associate with this project.
            </p>
            <div>
              <Label className="text-green-700 font-semibold text-sm mb-1.5 block">Company:</Label>
              <Select
                value={selectedCompanyId?.toString() ?? ''}
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
                onClick={() => {
                  if (selectedCompanyId) {
                    form.setValue('company_id', selectedCompanyId);
                  }
                  setSyncCompanyOpen(false);
                }}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Sync
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Light Count Estimate Modal */}
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
                  {form.watch('property_size') ? (parseFloat(form.watch('property_size')) * 0.01).toFixed(2) : '0'}
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
                  form.setValue('light_count', 'Yes');
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

      <RecentLuminairesModal
        open={recentModalOpen}
        onClose={() => setRecentModalOpen(false)}
        areas={savedAreas}
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
    </DashboardLayout>
  );
}

// Luminaires Sub-form //
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

function buildSummary(vals: Record<string, string>): string {
  return buildLuminaireSummary(vals) || vals.name || '';
}

function LuminairesSubForm({
  form,
  areaIndex,
  onEditComponent,
  onOpenRecent,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: any;
  areaIndex: number;
  onEditComponent: (lumIndex: number, componentLabel: string) => void;
  onOpenRecent: (lumIndex: number) => void;
}) {
  const { fields: lumFields, remove: removeLum } = useFieldArray({
    control: form.control,
    name: `areas.${areaIndex}.luminaires` as const,
  });

  const [openLuminaires, setOpenLuminaires] = useState<Set<number>>(new Set());
  const toggleLum = (i: number) =>
    setOpenLuminaires((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });

  return (
    <div className="grid grid-cols-2 gap-4">
      {lumFields.map((lumField, lumIndex) => {
        const isOpen = openLuminaires.has(lumIndex);
        const base = `areas.${areaIndex}.luminaires.${lumIndex}`;
        const vals = form.watch(base) ?? {};
        const summary = buildSummary(vals);
        const qty = vals.qty || vals.quantity || '';

        return (
          <div key={lumField.id} className="mb-4">

            {/* Column labels - outside the box */}
            <div className="flex gap-2 text-xs font-bold text-gray-500 uppercase pb-1 px-1">
              <span className="w-14 shrink-0">QTY</span>
              <span className="flex-1">Luminaire Description</span>
            </div>

            {/* Box wrapper - trash button anchored here */}
            <div className="relative">
              <button
                type="button"
                className="absolute -left-3 -top-2 w-5 h-5 bg-red-500 text-white rounded-sm flex items-center justify-center z-10"
                onClick={() => removeLum(lumIndex)}
              >
                <Trash2 className="h-3 w-3" />
              </button>

              {/* Summary row */}
              <div
                className="flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 cursor-pointer transition-colors mt-4"
                onClick={() => toggleLum(lumIndex)}
              >
                <span className="w-14 shrink-0 text-sm font-medium text-gray-700">{qty}</span>
                <span className="flex-1 text-sm text-gray-700 leading-snug break-words min-w-0">{summary}</span>
                {isOpen
                  ? <ChevronUp className="h-4 w-4 text-gray-400 shrink-0" />
                  : <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />}
              </div>

            {/* Accordion â€” component breakdown */}
            {isOpen && (
              <div className="border border-t-0 border-gray-200 bg-gray-50 px-4 py-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="grid grid-cols-[110px_1fr_60px] gap-2 flex-1 text-xs font-bold text-gray-400 uppercase">
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
                    <span className="text-gray-600 text-xs pt-1">{label}</span>
                    <div className="min-h-7 text-xs px-2 py-1 text-gray-700 border border-gray-200 rounded bg-white break-words leading-snug">
                      {(form.watch(`${base}.${descField}`) as string) || ''}
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

      {lumFields.length === 0 && (
        <p className="col-span-2 text-xs text-gray-400 py-2">No luminaires. Use the &quot;Add Luminaire&quot; button above.</p>
      )}
    </div>
  );
}





