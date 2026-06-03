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
} from 'lucide-react';

// ── Schemas ──────────────────────────────────────────────────────────

const luminaireSchema = z.object({
  name: z.string().optional(),
  quantity: z.coerce.number().min(0).default(0),
  wattage: z.string().optional(),
});

const areaSchema = z.object({
  name: z.string().min(1, 'Area name is required'),
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

// ── Component ────────────────────────────────────────────────────────

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
  const [expandedAreas, setExpandedAreas] = useState<Set<number>>(new Set([0]));
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Project image upload state
  const [projectImage, setProjectImage] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Sync Company modal state
  const [syncCompanyOpen, setSyncCompanyOpen] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);

  // Light count estimate modal state
  const [lightCountModalOpen, setLightCountModalOpen] = useState(false);

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
        name: a.name ?? '',
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
    setExpandedAreas((prev) => {
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
      {/* ── Tabs ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="flex border-b border-gray-200">
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
            {/* ── Property Tab ───────────────────────────────── */}
            {activeTab === 'property' && (
              <div className="p-6 space-y-6">
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

            {/* ── Luminaires Tab ──────────────────────────────── */}
            {activeTab === 'luminaires' && (
              <div className="p-6 space-y-4">
                {/* Area selector + add button */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-gray-700">Area:</span>
                    <Select>
                      <SelectTrigger className="w-56">
                        <SelectValue placeholder="All Areas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Areas</SelectItem>
                        {areaFields.map((a, i) => (
                          <SelectItem key={a.id} value={String(i)}>
                            {form.watch(`areas.${i}.name`) || `Area ${i + 1}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => {
                      appendArea({
                        name: '',
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
                      setExpandedAreas((prev) => new Set(prev).add(areaFields.length));
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add New Area
                  </Button>
                </div>

                {/* Area sections */}
                {areaFields.map((areaField, areaIndex) => (
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
                    <div className="bg-slate-700 text-white rounded-t-lg px-4 py-3 flex items-center justify-between">
                      <FormField
                        control={form.control}
                        name={`areas.${areaIndex}.name`}
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
                          className="bg-green-600 hover:bg-green-700 text-white border-none"
                          onClick={() => {
                            const lums = form.getValues(`areas.${areaIndex}.luminaires`);
                            form.setValue(`areas.${areaIndex}.luminaires`, [
                              ...lums,
                              { name: '', quantity: 0, wattage: '' },
                            ]);
                          }}
                        >
                          <Lightbulb className="h-4 w-4 mr-1" />
                          Add Luminaire
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          className="bg-gray-800 hover:bg-gray-900 text-white border-none"
                          onClick={() => toggleArea(areaIndex)}
                        >
                          Area Details
                          {expandedAreas.has(areaIndex) ? (
                            <ChevronUp className="h-4 w-4 ml-1" />
                          ) : (
                            <ChevronDown className="h-4 w-4 ml-1" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Area details (collapsible) */}
                    {expandedAreas.has(areaIndex) && (
                      <div className="border border-t-0 border-gray-200 rounded-b-lg p-4 space-y-4">
                        {/* Image + details grid */}
                        <div className="flex gap-4">
                          <div className="shrink-0">
                            <Button type="button" size="sm" variant="outline" className="mb-2 text-xs bg-green-50 text-green-700 border-green-300">
                              <ImageIcon className="h-3 w-3 mr-1" />
                              Upload Photo
                            </Button>
                            <div className="w-64 h-48 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
                              <Lightbulb className="h-12 w-12 text-gray-300" strokeWidth={1} />
                            </div>
                          </div>

                          <div className="flex-1 grid grid-cols-4 gap-3 content-start">
                            <FormField control={form.control} name={`areas.${areaIndex}.ceiling_height`} render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-green-700 font-semibold text-xs">Ceiling Height (feet):</FormLabel>
                                <FormControl><Input {...field} /></FormControl>
                              </FormItem>
                            )} />
                            <FormField control={form.control} name={`areas.${areaIndex}.daily_usage`} render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-green-700 font-semibold text-xs">Daily Usage (hours):</FormLabel>
                                <FormControl><Input {...field} /></FormControl>
                              </FormItem>
                            )} />
                            <FormField control={form.control} name={`areas.${areaIndex}.area_sqft`} render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-green-700 font-semibold text-xs">Area (sq.ft.):</FormLabel>
                                <FormControl><Input {...field} /></FormControl>
                              </FormItem>
                            )} />
                            <FormField control={form.control} name={`areas.${areaIndex}.application`} render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-green-700 font-semibold text-xs">Application:</FormLabel>
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
                                <FormLabel className="text-green-700 font-semibold text-xs">Voltage:</FormLabel>
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
                                <FormLabel className="text-green-700 font-semibold text-xs">Installation Surface:</FormLabel>
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
                                <FormLabel className="text-green-700 font-semibold text-xs">Control Type:</FormLabel>
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
                                <FormLabel className="text-green-700 font-semibold text-xs">Ingress Protection:</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                                  <SelectContent>
                                    {INGRESS_RATINGS.map((ip) => <SelectItem key={ip} value={ip}>{ip}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </FormItem>
                            )} />
                          </div>
                        </div>

                        {/* Area notes */}
                        <FormField control={form.control} name={`areas.${areaIndex}.notes`} render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-green-700 font-semibold text-xs">Notes:</FormLabel>
                            <FormControl><Input {...field} /></FormControl>
                          </FormItem>
                        )} />

                        {/* Luminaires table */}
                        <div>
                          <div className="flex items-center gap-6 text-sm font-bold text-gray-700 border-b border-gray-200 pb-2 mb-2">
                            <span className="w-16">QTY</span>
                            <span>Luminaire Description</span>
                          </div>
                          <LuminairesSubForm form={form} areaIndex={areaIndex} />
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {areaFields.length === 0 && (
                  <div className="text-center py-12 text-gray-400">
                    <Lightbulb className="h-8 w-8 mx-auto mb-2" />
                    <p className="text-sm">No areas defined. Click &quot;Add New Area&quot; to get started.</p>
                  </div>
                )}
              </div>
            )}

            {/* ── Uploads Tab ─────────────────────────────────── */}
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
    </DashboardLayout>
  );
}

// ── Luminaires Sub-form ──────────────────────────────────────────────

function LuminairesSubForm({
  form,
  areaIndex,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: any;
  areaIndex: number;
}) {
  const {
    fields: lumFields,
    append: appendLum,
    remove: removeLum,
  } = useFieldArray({
    control: form.control,
    name: `areas.${areaIndex}.luminaires` as const,
  });

  return (
    <div className="space-y-2">
      {lumFields.map((lumField, lumIndex) => (
        <div key={lumField.id} className="relative flex items-start gap-4">
          <button
            type="button"
            className="absolute -left-3 top-1 w-4 h-4 bg-red-500 text-white rounded-sm flex items-center justify-center"
            onClick={() => removeLum(lumIndex)}
          >
            <Trash2 className="h-2.5 w-2.5" />
          </button>
          <FormField
            control={form.control}
            name={`areas.${areaIndex}.luminaires.${lumIndex}.quantity`}
            render={({ field }) => (
              <FormItem className="w-16">
                <FormControl>
                  <Input type="number" className="text-center" {...field} />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name={`areas.${areaIndex}.luminaires.${lumIndex}.name`}
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormControl>
                  <Textarea rows={2} placeholder="Luminaire description..." {...field} />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
      ))}
      {lumFields.length === 0 && (
        <p className="text-xs text-gray-400 py-2">No luminaires. Use the &quot;Add Luminaire&quot; button above.</p>
      )}
    </div>
  );
}
