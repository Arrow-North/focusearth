import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
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
import { useCreateEstimateSU, useCreateEstimateREU } from '@/hooks/use-estimates';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft } from 'lucide-react';

const estimateSchema = z.object({
  reportId: z.coerce.number().min(1, 'Report ID is required'),
  companyId: z.coerce.number().min(1, 'Company ID is required'),
  reference: z.string().optional(),
  salesTax: z.string().optional(),
  rebates: z.string().optional(),
  shipping: z.string().optional(),
  depositAmount: z.string().optional(),
  depositDue: z.string().optional(),
  remainderDue: z.string().optional(),
  remainderAmount: z.string().optional(),
  notes: z.string().optional(),
  luminaires: z.string().optional().refine(
    (val) => {
      if (!val || val.trim() === '') return true;
      try {
        const parsed = JSON.parse(val);
        return Array.isArray(parsed);
      } catch {
        return false;
      }
    },
    { message: 'Must be a valid JSON array' }
  ),
});

type EstimateFormValues = z.infer<typeof estimateSchema>;

export default function CreateEstimate() {
  const navigate = useNavigate();
  const location = useLocation();
  const { userType, companyId } = useAuth();

  const isREU = location.pathname.includes('/real-estate') || userType === 'Reu';
  const basePath = isREU ? '/orders/real-estate' : '/orders/suppliers';

  const createSU = useCreateEstimateSU();
  const createREU = useCreateEstimateREU();

  const form = useForm<EstimateFormValues>({
    resolver: zodResolver(estimateSchema),
    defaultValues: {
      reportId: 0,
      companyId: companyId ?? 0,
      reference: '',
      salesTax: '',
      rebates: '',
      shipping: '',
      depositAmount: '',
      depositDue: '',
      remainderDue: '',
      remainderAmount: '',
      notes: '',
      luminaires: '',
    },
  });

  const onSubmit = async (values: EstimateFormValues) => {
    const parsedLuminaires = values.luminaires
      ? JSON.parse(values.luminaires)
      : undefined;

    if (isREU) {
      const id = await createREU.mutateAsync({
        reportId: values.reportId,
        companyId: values.companyId,
        reference: values.reference || undefined,
        salesTax: values.salesTax || undefined,
        rebates: values.rebates || undefined,
        shipping: values.shipping || undefined,
        depositAmount: values.depositAmount || undefined,
        depositDue: values.depositDue || undefined,
        remainderDue: values.remainderDue || undefined,
        remainderAmount: values.remainderAmount || undefined,
        reuNotes: values.notes || undefined,
        luminaires: parsedLuminaires,
      });
      navigate(`${basePath}/${id}`);
    } else {
      const id = await createSU.mutateAsync({
        reportId: values.reportId,
        companyId: values.companyId,
        reference: values.reference || undefined,
        salesTax: values.salesTax || undefined,
        rebates: values.rebates || undefined,
        shipping: values.shipping || undefined,
        depositAmount: values.depositAmount || undefined,
        depositDue: values.depositDue || undefined,
        remainderDue: values.remainderDue || undefined,
        remainderAmount: values.remainderAmount || undefined,
        suNotes: values.notes || undefined,
        luminaires: parsedLuminaires,
      });
      navigate(`${basePath}/${id}`);
    }
  };

  const isPending = createSU.isPending || createREU.isPending;

  return (
    <DashboardLayout
      title={`Create ${isREU ? 'Real Estate' : 'Supplier'} Estimate`}
      showSearch={false}
    >
      <div className="max-w-3xl mx-auto space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(basePath)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to List
        </Button>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Report & Company */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Estimate Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="reportId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Report ID *</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="Report ID" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="companyId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company ID *</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="Company ID" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="reference"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reference</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., EST-2024-001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Financial */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Financial</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="salesTax"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sales Tax</FormLabel>
                        <FormControl>
                          <Input placeholder="0.00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="rebates"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rebates</FormLabel>
                        <FormControl>
                          <Input placeholder="0.00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="shipping"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Shipping</FormLabel>
                        <FormControl>
                          <Input placeholder="0.00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="depositAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Deposit Amount</FormLabel>
                        <FormControl>
                          <Input placeholder="0.00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="depositDue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Deposit Due</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="remainderAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Remainder Amount</FormLabel>
                        <FormControl>
                          <Input placeholder="0.00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="remainderDue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Remainder Due</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Luminaires */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Luminaires (JSON)</CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="luminaires"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Luminaires Array</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder='[{"name": "LED Panel", "quantity": 10, "wattage": "40W"}]'
                          className="font-mono text-sm min-h-[120px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Notes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea placeholder="Additional notes..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Submit */}
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => navigate(basePath)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Creating...' : 'Create Estimate'}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </DashboardLayout>
  );
}
