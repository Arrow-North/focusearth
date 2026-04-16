import { useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useCreateCompany } from '@/hooks/use-companies';
import { COMPANY_TYPE_LABELS, COMPANY_SUBTYPES } from '@/lib/roles';
import type { CompanyType } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
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
import { Plus, Trash2 } from 'lucide-react';

// ─── Property types (for priority sliders) ──────────────────────────────────

const PROPERTY_TYPES = [
  'Office',
  'Retail',
  'Industrial',
  'Warehouse',
  'Healthcare',
  'Education',
  'Hospitality',
  'Parking',
  'Exterior',
  'Other',
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
    }),
  ),
  service_areas: z.array(serviceAreaSchema),
});

type CompanyFormValues = z.infer<typeof companySchema>;

// ─── Component ──────────────────────────────────────────────────────────────

export default function CreateCompany() {
  const navigate = useNavigate();
  const createCompany = useCreateCompany();

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
      property_priorities: PROPERTY_TYPES.map((name) => ({ name, percentage: 10 })),
      service_areas: [{ state: '', city: '' }],
    },
  });

  const {
    fields: saFields,
    append: saAppend,
    remove: saRemove,
  } = useFieldArray({ control: form.control, name: 'service_areas' });

  const selectedType = useWatch({ control: form.control, name: 'type' });
  const subtypeOptions = selectedType ? COMPANY_SUBTYPES[selectedType as CompanyType] ?? [] : [];

  // Reset subtype when type changes
  useEffect(() => {
    form.setValue('company_sub_type', '');
  }, [selectedType, form]);

  // ── Balanced slider logic ─────────────────────────────────────────────────

  const priorities = useWatch({ control: form.control, name: 'property_priorities' });
  const totalPercentage = priorities.reduce((sum, p) => sum + p.percentage, 0);

  const handlePriorityChange = useCallback(
    (index: number, value: number) => {
      form.setValue(`property_priorities.${index}.percentage`, value);
    },
    [form],
  );

  // ── Submit ────────────────────────────────────────────────────────────────

  const onSubmit = (values: CompanyFormValues) => {
    createCompany.mutate(
      {
        ...values,
        property_priorities: values.property_priorities,
        service_areas: values.service_areas.filter((sa) => sa.state || sa.city),
      },
      {
        onSuccess: (data) => {
          const id = (data as unknown as { id: number })?.id;
          if (id) navigate(`/companies/${id}`);
          else navigate('/companies');
        },
      },
    );
  };

  return (
    <DashboardLayout title="Create Company">
      <div className="max-w-3xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* ── Basic Info ───────────────────────────────────────── */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {(Object.keys(COMPANY_TYPE_LABELS) as CompanyType[]).map((t) => (
                              <SelectItem key={t} value={t}>
                                {COMPANY_TYPE_LABELS[t]}
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
                    name="company_sub_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sub-type</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={subtypeOptions.length === 0}
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
                </div>

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

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea rows={3} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* ── Address ──────────────────────────────────────────── */}
            <Card>
              <CardHeader>
                <CardTitle>Address</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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
                <div className="grid grid-cols-2 gap-4">
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
                </div>
                <div className="grid grid-cols-2 gap-4">
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
              </CardContent>
            </Card>

            {/* ── Property Priorities ──────────────────────────────── */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Property Priorities
                  <span
                    className={`text-sm font-normal ${
                      totalPercentage === 100
                        ? 'text-green-600'
                        : 'text-destructive'
                    }`}
                  >
                    Total: {totalPercentage}%
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {PROPERTY_TYPES.map((propType, index) => (
                  <div key={propType} className="flex items-center gap-4">
                    <span className="w-24 text-sm font-medium shrink-0">
                      {propType}
                    </span>
                    <Slider
                      min={0}
                      max={100}
                      step={1}
                      value={[priorities[index]?.percentage ?? 0]}
                      onValueChange={([val]) => handlePriorityChange(index, val)}
                      className="flex-1"
                    />
                    <span className="w-12 text-right text-sm tabular-nums">
                      {priorities[index]?.percentage ?? 0}%
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* ── Service Areas ────────────────────────────────────── */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Service Areas
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => saAppend({ state: '', city: '' })}
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    Add Area
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
                            <Input placeholder="City" {...f} />
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
              </CardContent>
            </Card>

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
