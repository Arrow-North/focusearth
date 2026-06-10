import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useCreateCompany } from '@/hooks/use-companies';
import { AuthContext } from '@/contexts/AuthContext';
import { COMPANY_TYPE_LABELS, COMPANY_SUBTYPES } from '@/lib/roles';
import type { CompanyType } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Minus, Trash2, Upload, ImageIcon, Pencil } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

// ─── Property types with colors ──────────────────────────────────────────────

const PROPERTY_TYPES = [
  { name: 'Office', color: '#6366f1' },
  { name: 'Industrial', color: '#8b5cf6' },
  { name: 'Retail', color: '#a78bfa' },
  { name: 'Multi Family', color: '#c4b5fd' },
  { name: 'Hospitality', color: '#14b8a6' },
  { name: 'Parking', color: '#f59e0b' },
  { name: 'Horticulture', color: '#84cc16' },
  { name: 'Healthcare', color: '#ef4444' },
  { name: 'Data Center', color: '#06b6d4' },
  { name: 'Other', color: '#ec4899' },
] as const;

// ─── Schema ─────────────────────────────────────────────────────────────────

const serviceAreaSchema = z.object({
  state: z.string().optional(),
  city: z.string().optional(),
});

const companySchema = z.object({
  name: z.string().min(1, 'Company name is required'),
  type: z.enum(['REU', 'SU', 'EU'], { required_error: 'Company type is required' }),
  company_sub_type: z.string().optional(),
  address: z.string().min(1, 'Address is required'),
  address2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  zip_code: z.string().min(1, 'Zip code is required'),
  country: z.string().min(1, 'Country is required'),
  website: z.string().optional(),
  notes: z.string().optional(),
  property_priorities: z.array(
    z.object({
      name: z.string(),
      percentage: z.number().min(0).max(100),
      color: z.string(),
    }),
  ),
  service_areas: z.array(serviceAreaSchema),
});

type CompanyFormValues = z.infer<typeof companySchema>;

// ─── Component ──────────────────────────────────────────────────────────────

export default function CreateCompany() {
  const navigate = useNavigate();
  const params = useParams();
  const companyType = (params['user-type']?.toUpperCase() ?? '') as CompanyType;
  const createCompany = useCreateCompany();
  const auth = useContext(AuthContext);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: '',
      type: undefined,
      company_sub_type: '',
      address: '',
      address2: '',
      city: '',
      state: '',
      zip_code: '',
      country: 'US',
      website: '',
      notes: '',
      property_priorities: PROPERTY_TYPES.map((p) => ({ name: p.name, percentage: 10, color: p.color })),
      service_areas: [{ state: '', city: '' }],
    },
  });

  const {
    fields: saFields,
    append: saAppend,
    remove: saRemove,
  } = useFieldArray({ control: form.control, name: 'service_areas' });

  const subtypeOptions = COMPANY_SUBTYPES[companyType] ?? [];

  useEffect(() => {
    if (companyType) form.setValue('type', companyType);
  }, [companyType, form]);

  // ── Priority logic ─────────────────────────────────────────────────
  const priorities = useWatch({ control: form.control, name: 'property_priorities' });
  const totalPercentage = priorities.reduce((sum, p) => sum + p.percentage, 0);

  const handlePriorityChange = useCallback(
    (index: number, delta: number) => {
      const current = priorities[index]?.percentage ?? 0;
      const newValue = Math.max(0, current + delta);
      const newTotal = totalPercentage - current + newValue;
      if (newTotal > 100) return;
      form.setValue(`property_priorities.${index}.percentage`, newValue);
    },
    [form, priorities, totalPercentage],
  );

  // ── Logo upload ────────────────────────────────────────────────────
  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // ── Pie chart data ─────────────────────────────────────────────────
  const pieData = priorities
    .filter((p) => p.percentage > 0)
    .map((p) => ({
      name: p.name,
      value: p.percentage,
      color: p.color,
    }));

  // ── Submit ────────────────────────────────────────────────────────
  const onSubmit = (values: CompanyFormValues) => {
    createCompany.mutate(
      {
        ...values,
        property_priorities: values.property_priorities,
        service_areas: values.service_areas.filter((sa) => sa.state || sa.city),
      },
      {
        onSuccess: (companyId) => {
          // Refresh the auth profile so the user's associated_to_company_id is updated
          auth?.refreshProfile();
          if (companyId) navigate(`/companies/${companyId}`);
          else navigate('/companies');
        },
      },
    );
  };

  return (
    <DashboardLayout title={`Companies / ${COMPANY_TYPE_LABELS[companyType] ?? ''}`}>
      <div className="max-w-5xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* ── Logo & Basic Info Row ──────────────────────────────── */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex gap-6">
                  {/* Logo Upload */}
                  <div className="flex flex-col items-center gap-2">
                    <div
                      className="w-24 h-24 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {logoPreview ? (
                        <img
                          src={logoPreview}
                          alt="Logo preview"
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <ImageIcon className="w-8 h-8 text-muted-foreground" />
                      )}
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoSelect}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="w-3 h-3 mr-1" />
                      Upload Logo
                    </Button>
                  </div>

                  {/* Basic Info Fields */}
                  <div className="flex-1 grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter company name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="company_sub_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company Type</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select sub-type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {subtypeOptions.map((s) => (
                                <SelectItem key={s} value={s}>
                                  {s}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="website"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Website</FormLabel>
                          <FormControl>
                            <Input placeholder="https://..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ── Address ──────────────────────────────────────────── */}
            <Card>
              <CardHeader>
                <CardTitle>Address</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address Line 1</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="address2"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address Line 2</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-4 gap-4">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="zip_code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Zip Code</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Country</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea rows={2} placeholder="Additional notes..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* ── Serviceable Property Types ───────────────────────── */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Serviceable Property Types</span>
                  <span
                    className={`text-sm font-normal px-2 py-1 rounded ${
                      totalPercentage === 100
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    Total: {totalPercentage}%
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Property Type Cards */}
                  <div className="lg:col-span-2 grid grid-cols-2 gap-3">
                    {PROPERTY_TYPES.map((propType, index) => (
                      <div
                        key={propType.name}
                        className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                        style={{ borderLeftWidth: '4px', borderLeftColor: propType.color }}
                      >
                        <span className="flex-1 text-sm font-medium">
                          {propType.name}
                        </span>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handlePriorityChange(index, -5)}
                            disabled={(priorities[index]?.percentage ?? 0) <= 0}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-12 text-center text-sm font-medium tabular-nums">
                            {priorities[index]?.percentage ?? 0}%
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handlePriorityChange(index, 5)}
                            disabled={totalPercentage >= 100}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pie Chart */}
                  <div className="flex flex-col items-center justify-center">
                    {pieData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value: number) => [`${value}%`, 'Percentage']}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="w-full h-[220px] flex items-center justify-center text-muted-foreground text-sm">
                        Set percentages to see chart
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground text-center mt-2">
                      Property Type Distribution
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ── Serviceable Areas ────────────────────────────────── */}
            {companyType === 'EU' && <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Serviceable Areas</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => saAppend({ state: '', city: '' })}
                  >
                    <Pencil className="mr-1 h-3 w-3" />
                    Edit
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {saFields.map((field, index) => (
                  <div key={field.id} className="flex items-center gap-3">
                    <FormField
                      control={form.control}
                      name={`service_areas.${index}.state`}
                      render={({ field: f }) => (
                        <FormItem className="flex-1">
                          <FormControl>
                            <Input placeholder="State" {...f} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`service_areas.${index}.city`}
                      render={({ field: f }) => (
                        <FormItem className="flex-1">
                          <FormControl>
                            <Input placeholder="City / County" {...f} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    {saFields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => saRemove(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => saAppend({ state: '', city: '' })}
                  className="mt-2"
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Add Area
                </Button>
              </CardContent>
            </Card>}

            {/* ── Submit ───────────────────────────────────────────── */}
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/companies')}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createCompany.isPending}>
                {createCompany.isPending ? 'Creating...' : 'Create Company'}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </DashboardLayout>
  );
}
