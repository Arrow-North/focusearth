import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useProject } from '@/hooks/use-projects';
import { useCreateReport } from '@/hooks/use-reports';
import { Check, FileWarning, ExternalLink } from 'lucide-react';

const reportSchema = z.object({
  proposalName: z.string().min(1, 'Report title is required'),
  selectAreas: z.string().optional(),
  biddingOption: z.string().optional(),
  illuminationReports: z.string().optional(),
  installationEstimate: z.string().optional(),
  notes: z.string().optional(),
  status: z.string().default('draft'),
});

type ReportFormValues = z.infer<typeof reportSchema>;

export default function CreateReport() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const projectId = id ? Number(id) : 0;
  const createReport = useCreateReport();

  const { data: project } = useProject(projectId || undefined);
  const areas = project?.areas ?? [];

  const form = useForm<ReportFormValues>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      proposalName: '',
      selectAreas: '',
      biddingOption: 'Bidding Closed',
      illuminationReports: '',
      installationEstimate: '',
      notes: '',
      status: 'draft',
    },
  });

  const onSubmit = async (values: ReportFormValues) => {
    const reportId = await createReport.mutateAsync({
      projectId,
      proposal: {},
      proposalName: values.proposalName,
      status: values.status,
      notes: values.notes || undefined,
    });

    navigate(`/reports/${reportId}`);
  };

  const headerActions = (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="border-yellow-400 bg-yellow-50 text-yellow-800 hover:bg-yellow-100"
        onClick={() => navigate(`/projects/${projectId}`)}
      >
        <FileWarning className="h-4 w-4 mr-1.5" />
        Unfinished
      </Button>
      <Button
        size="sm"
        className="bg-lime-400 hover:bg-lime-500 text-gray-900"
        onClick={form.handleSubmit(onSubmit)}
        disabled={createReport.isPending}
      >
        <Check className="h-4 w-4 mr-1.5" />
        {createReport.isPending ? 'Saving...' : 'Done'}
      </Button>
    </div>
  );

  return (
    <DashboardLayout title="Report" showSearch={false} actions={headerActions}>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            {/* Row 1: Report Title + Select Areas */}
            <div className="grid grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="proposalName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-gray-700">Report Title:</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="selectAreas"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-gray-700">Select Areas:</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select areas" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="all">All Areas</SelectItem>
                        {areas.map((area, i) => (
                          <SelectItem key={i} value={area.name || `area-${i}`}>
                            {area.name || `Area ${i + 1}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>

            {/* Row 2: Bidding Options + Illumination Reports */}
            <div className="grid grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="biddingOption"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-gray-700">Bidding Options:</FormLabel>
                    <div className="flex items-center gap-2">
                      <FormControl>
                        <Input {...field} readOnly className="bg-gray-50" />
                      </FormControl>
                      <Button
                        type="button"
                        size="sm"
                        className="shrink-0 bg-yellow-400 hover:bg-yellow-500 text-gray-900"
                      >
                        <ExternalLink className="h-3.5 w-3.5 mr-1" />
                        Edit
                      </Button>
                    </div>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="illuminationReports"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-gray-700">Illumination Reports:</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="ies">IES Report</SelectItem>
                        <SelectItem value="photometric">Photometric</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>

            {/* Row 3: Installation Estimate + Notes */}
            <div className="grid grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="installationEstimate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-gray-700">Installation Estimate:</FormLabel>
                    <div className="flex items-center gap-2">
                      <FormControl>
                        <Input {...field} readOnly className="bg-gray-50" />
                      </FormControl>
                      <Button
                        type="button"
                        size="sm"
                        className="shrink-0 bg-yellow-400 hover:bg-yellow-500 text-gray-900"
                      >
                        <ExternalLink className="h-3.5 w-3.5 mr-1" />
                        Edit
                      </Button>
                    </div>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-gray-700">Notes:</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {/* Totals Section */}
            <div className="mt-8">
              <div className="bg-slate-600 text-white rounded-t-lg px-6 py-3">
                <h3 className="text-lg font-bold">Totals</h3>
              </div>
              <div className="border border-t-0 border-gray-200 rounded-b-lg p-6">
                <div className="grid grid-cols-2 gap-8">
                  {/* Existing */}
                  <div>
                    <div className="border-b-2 border-gray-300 pb-1 mb-3">
                      <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wide">Existing</h4>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-xs font-bold text-gray-500 uppercase mb-2">
                      <span>QTY</span>
                      <span>Luminaire Description</span>
                      <span>Mount Height</span>
                    </div>
                    <div className="text-sm text-gray-400 py-4">
                      No existing luminaires yet.
                    </div>
                  </div>

                  {/* Recommended */}
                  <div>
                    <div className="border-b-2 border-green-400 pb-1 mb-3">
                      <h4 className="text-sm font-bold text-green-500 uppercase tracking-wide">Recommended</h4>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-xs font-bold text-gray-500 uppercase mb-2">
                      <span>QTY</span>
                      <span>Luminaire Description</span>
                      <span>Mount Height</span>
                    </div>
                    <div className="text-sm text-gray-400 py-4">
                      No recommended luminaires yet.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </Form>
      </div>
    </DashboardLayout>
  );
}
