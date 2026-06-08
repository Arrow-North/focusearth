import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm, useWatch } from 'react-hook-form';
import type { Luminaire, ProjectArea } from '@/types/database';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form';
import { useProject } from '@/hooks/use-projects';
import { useCreateReport } from '@/hooks/use-reports';
import { Check, FileWarning, ExternalLink, ChevronDown, ChevronUp, X, Paperclip } from 'lucide-react';
import { ProductDetailsModal } from '@/components/shared/ProductDetailsModal';
import { LuminaireRecommendationModal } from '@/components/shared/LuminaireRecommendationModal';

const reportSchema = z.object({
  proposalName: z.string().min(1, 'Report title is required'),
  selectAreas: z.array(z.string()).default([]),
  biddingOption: z.string().optional(),
  illuminationReports: z.array(z.string()).default([]),
  installationEstimate: z.string().optional(),
  notes: z.string().optional(),
  status: z.string().default('draft'),
});

type ReportFormValues = z.infer<typeof reportSchema>;

function buildLuminaireSummary(lum: Luminaire): string {
  const parts: string[] = [];
  if (lum.fixtureDescription) parts.push(lum.fixtureDescription);
  if (lum.lampDescription) parts.push(`(${lum.lampPerFixture ?? 1}) ${lum.lampDescription}`);
  if (lum.powerSupplyDescription) parts.push(`powered by ${lum.powerSupplyDescription}`);
  if (lum.controlDescription) parts.push(`controlled by ${lum.controlDescription}`);
  if (lum.accessoryDescriptionA) parts.push(`with ${lum.accessoryDescriptionA}`);
  return parts.join(' , ') || '—';
}

function buildRecommendedSummary(
  baseKey: string,
  selections: Record<string, string>,
): string {
  const get = (label: string): string | null => {
    const v = selections[`${baseKey}-${label}`];
    return v && v !== 'No Change' ? v : null;
  };
  const parts: string[] = [];
  const fixture = get('Fixture');
  if (fixture) parts.push(fixture);
  const lamp = get('Lamp');
  if (lamp) parts.push(lamp);
  const power = get('Power Supply');
  if (power) parts.push(power);
  const control = get('Control');
  if (control) parts.push(control);
  const accessory = get('Accessory');
  if (accessory) parts.push(accessory);
  return parts.join(' , ') || '—';
}

function getLuminaireComponents(lum: Luminaire) {
  const rows = [
    { label: 'Fixture',       qty: lum.qty ?? '—',                 description: lum.fixtureDescription ?? '—' },
    { label: 'Lamp',          qty: lum.lampPerFixture ?? '—',       description: lum.lampDescription ?? '—' },
    { label: 'Power Supply',  qty: lum.powerQTYFixture ?? '—',      description: lum.powerSupplyDescription ?? '—' },
    { label: 'Control',       qty: lum.controlQTYFixture ?? '—',    description: lum.controlDescription ?? '—' },
  ];
  if (lum.accessoryDescriptionA) {
    rows.push({ label: 'Accessory', qty: lum.accessoryDescriptionAQty ?? '1', description: lum.accessoryDescriptionA });
  }
  return rows;
}

function ColumnHeaders() {
  return (
    <div className="grid grid-cols-2 gap-6 px-4 pt-4 border-0">
      <div className="border-b-2 border-gray-300 pb-1 mb-8">
        <h4 className="text-lg text-center font-bold text-gray-400 uppercase tracking-wide">Existing</h4>
      </div>
      <div className="border-b-2 border-[#619c48] pb-1 mb-8">
        <h4 className="text-lg text-center font-bold text-[#619c48] uppercase tracking-wide">Recommended</h4>
      </div>
      <div className="flex gap-2 text-xs font-bold text-gray-500 uppercase pb-4">
        <span className="w-12 shrink-0">QTY</span><span className="flex-1 text-center">Luminaire Description</span><span>Mount Height</span>
      </div>
      <div className="flex gap-2 text-xs font-bold text-gray-500 uppercase pb-4">
        <span className="w-12 shrink-0">QTY</span><span className="flex-1 text-center">Luminaire Description</span><span>Mount Height</span>
      </div>
    </div>
  );
}

function AreaImage({ src }: { src?: string }) {
  const [errored, setErrored] = useState(false);
  const showPlaceholder = !src || errored;
  return (
    <div className="w-full h-full bg-gray-100 flex flex-col items-center justify-center gap-1 text-gray-400 overflow-hidden">
      {showPlaceholder ? (
        <>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 20.25h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12.75c0 .828.672 1.5 1.5 1.5z" />
          </svg>
          <span className="text-xs">No image</span>
        </>
      ) : (
        <img src={src} alt="Area" className="w-full h-full object-cover" onError={() => setErrored(true)} />
      )}
    </div>
  );
}

export default function CreateReport() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const projectId = id ? Number(id) : 0;
  const createReport = useCreateReport();

  const { data: project } = useProject(projectId || undefined);
  const areas = (project?.areas ?? []) as ProjectArea[];

  const form = useForm<ReportFormValues>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      proposalName: '',
      selectAreas: [],
      biddingOption: 'Bidding Closed',
      illuminationReports: [],
      installationEstimate: '',
      notes: '',
      status: 'draft',
    },
  });

  const selectedAreaNames = useWatch({ control: form.control, name: 'selectAreas' });
  const selectedAreas = areas.filter((a) => selectedAreaNames.includes(a.title || ''));

  const [openLuminaires, setOpenLuminaires] = useState<Set<string>>(new Set());
  const toggleLuminaire = (key: string) =>
    setOpenLuminaires((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const [productModal, setProductModal] = useState<{ lum: Luminaire; label: string } | null>(null);
  const [recommendationModal, setRecommendationModal] = useState<{
    lum: Luminaire;
    label: string;
    areaTitle: string;
    lumIndex: number;
  } | null>(null);
  const [recommendedSelections, setRecommendedSelections] = useState<Record<string, string>>({});

  const [openAreaDetails, setOpenAreaDetails] = useState<Set<number>>(new Set());
  const toggleAreaDetails = (index: number) =>
    setOpenAreaDetails((prev) => {
      const next = new Set(prev);
      next.has(index) ? next.delete(index) : next.add(index);
      return next;
    });

  const [isBiddingOpen, setIsBiddingOpen] = useState(false);
  const [biddingModalOpen, setBiddingModalOpen] = useState(false);
  const confirmBiddingToggle = () => {
    const next = !isBiddingOpen;
    setIsBiddingOpen(next);
    form.setValue('biddingOption', next ? 'Bidding Open' : 'Bidding Closed');
    setBiddingModalOpen(false);
  };

  const [installationBidModalOpen, setInstallationBidModalOpen] = useState(false);
  const [installationBidExpanded, setInstallationBidExpanded] = useState(true);

  const renderLuminaireRow = (area: ProjectArea, li: number, lum: Luminaire) => {
    const lumKey = `${area.title}-${li}`;
    const isOpen = openLuminaires.has(lumKey);
    const components = getLuminaireComponents(lum);
    return (
      <div key={lumKey} className="mb-8">
        {/* Summary row — always visible, same height both sides, click toggles accordion */}
        <div className="flex cursor-pointer gap-4" onClick={() => toggleLuminaire(lumKey)}>
          {/* Existing summary */}
          <div className="flex-1 p-4 bg-gray-50 hover:bg-gray-200 transition-colors border border-gray-200">
            <div className="grid grid-cols-[48px_1fr_64px] gap-2 text-xs items-start">
              <span className="font-medium">{lum.qty ?? '—'}</span>
              <span className="text-center text-gray-700 leading-snug">{buildLuminaireSummary(lum)}</span>
              <span className="text-center text-gray-500">{lum.fixtureMountHeight ?? '—'}</span>
            </div>
          </div>
          {/* Recommended summary or Add Recommendation */}
          {(() => {
            const baseKey = `${area.title ?? ''}-${li}`;
            const hasRec = ['Fixture', 'Lamp', 'Power Supply', 'Control', 'Accessory'].some((label) => {
              const v = recommendedSelections[`${baseKey}-${label}`];
              return v && v !== 'No Change';
            });
            return hasRec ? (
              <div className="flex-1 p-4 bg-gray-50 hover:bg-gray-200 transition-colors border border-[#619c48]">
                <div className="grid grid-cols-[48px_1fr_64px] gap-2 text-xs items-start">
                  <span className="font-medium">{lum.qty ?? '—'}</span>
                  <span className="text-center leading-snug">{buildRecommendedSummary(baseKey, recommendedSelections)}</span>
                  <span className="text-center text-gray-500">{lum.fixtureMountHeight ?? '—'}</span>
                </div>
              </div>
            ) : (
              <div className="flex-1 p-4 bg-gray-50 hover:bg-gray-200 transition-colors flex items-center justify-center border border-[#619c48]">
                <div className="rounded-lg w-full flex items-center justify-center py-3 text-sm text-gray-400 h-full min-h-[60px]">
                  Add Recommendation
                </div>
              </div>
            );
          })()}
        </div>

        {/* Accordion — component breakdown */}
        {isOpen && (
          <div className="flex gap-4">
            {/* Existing components */}
            <div className="flex-1 px-4 py-3 border border-t-0 bg-gray-50">
              <div className="grid grid-cols-[100px_56px_1fr] gap-2 text-xs font-bold text-gray-400 uppercase mb-2">
                <span>Component</span><span>QTY</span><span>Description</span>
              </div>
              {components.map((c) => (
                <div key={c.label} className="grid grid-cols-[100px_56px_1fr] gap-2 text-sm py-1 items-center">
                  <span className="text-gray-600">{c.label}</span>
                  <input readOnly value={c.qty} className="border border-gray-200 rounded px-2 py-0.5 text-xs w-full bg-gray-50" />
                  <input
                    readOnly
                    value={c.description}
                    className="border border-gray-200 rounded px-2 py-0.5 text-xs w-full bg-gray-50 cursor-pointer hover:bg-gray-100 hover:border-gray-400 transition-colors"
                    onClick={() => setProductModal({ lum, label: c.label })}
                  />
                </div>
              ))}
            </div>
            {/* Recommended components */}
            <div className="flex-1 px-4 py-3 border border-t-0 border-[#619c48] bg-gray-50">
              <div className="grid grid-cols-[100px_56px_1fr_60px] gap-2 text-xs font-bold text-gray-400 uppercase mb-2">
                <span>Component</span><span>QTY</span><span>Description</span><span></span>
              </div>
              {components.map((c) => {
                const recKey = `${area.title}-${li}-${c.label}`;
                const recValue = recommendedSelections[recKey];
                const isSelected = !!recValue && recValue !== 'No Change';
                const inputStyle = { borderColor: '#619c48', backgroundColor: isSelected ? '#dbfdce' : '' };
                return (
                <div key={c.label} className="grid grid-cols-[100px_56px_1fr_60px] gap-2 text-sm py-1 items-center">
                  <span className="text-gray-600">{c.label}</span>
                  <input readOnly value={c.qty} className="border rounded px-2 py-0.5 text-xs w-full bg-gray-50" style={inputStyle} />
                  <input readOnly value={recValue ?? 'No Change'} className="border rounded px-2 py-0.5 text-xs w-full bg-gray-50" style={inputStyle} />
                  <Button
                    type="button"
                    size="sm"
                    className="h-6 text-xs px-2 bg-yellow-400 hover:bg-yellow-500 text-gray-900"
                    onClick={() => setRecommendationModal({ lum, label: c.label, areaTitle: area.title ?? '', lumIndex: li })}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />Edit
                  </Button>
                </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

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
    <DashboardLayout title="Report" showSearch={false} actions={headerActions} mainClassName={"!p-0"}>
      <div className="bg-gray-100 shadow-sm border border-gray-200 p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            {/* Row 1: Report Title + Select Areas */}
            <div className="grid grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="proposalName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-semibold text-gray-700">Report Title:</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="selectAreas"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-semibold text-gray-700">Select Areas:</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant="outline" className="w-full justify-between font-normal h-9 px-3 hover:bg-transparent hover:text-current">
                            <span className={field.value.length === 0 ? 'text-muted-foreground' : ''}>
                              {field.value.length === 0 ? 'Select areas' : field.value.join(', ')}
                            </span>
                            <ChevronDown className="h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-2" align="start">
                        {areas.length === 0 ? (
                          <p className="text-base text-muted-foreground px-2 py-1">No areas available</p>
                        ) : (
                          <div className="space-y-1 max-h-48 overflow-y-auto">
                            {areas.map((area, i) => {
                              const value = area.title || `area-${i}`;
                              const label = area.title || `Area ${i + 1}`;
                              return (
                                <label key={i} className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer">
                                  <Checkbox
                                    checked={field.value.includes(value)}
                                    onCheckedChange={(checked) => {
                                      field.onChange(
                                        checked
                                          ? [...field.value, value]
                                          : field.value.filter((v) => v !== value),
                                      );
                                    }}
                                  />
                                  <span className="text-base">{label}</span>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </PopoverContent>
                    </Popover>
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
                    <FormLabel className="text-base font-semibold text-gray-700">Bidding Options:</FormLabel>
                    <div className="flex items-center gap-2">
                      <FormControl>
                        <Input {...field} readOnly className="bg-gray-50" />
                      </FormControl>
                      <Button
                        type="button"
                        size="sm"
                        className="shrink-0 bg-[#ffaf8d] hover:bg-[#ffaf8d] text-gray-900"
                        onClick={() => setBiddingModalOpen(true)}
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
                    <FormLabel className="text-base font-semibold text-gray-700">Illumination Reports:</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant="outline" className="w-full justify-between font-normal h-9 px-3 hover:bg-transparent hover:text-current">
                            <span className={field.value.length === 0 ? 'text-muted-foreground' : ''}>
                              {field.value.length === 0 ? 'Select areas' : field.value.join(', ')}
                            </span>
                            <ChevronDown className="h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-2" align="start">
                        {areas.length === 0 ? (
                          <p className="text-base text-muted-foreground px-2 py-1">No areas available</p>
                        ) : (
                          <div className="space-y-1 max-h-48 overflow-y-auto">
                            {areas.map((area, i) => {
                              const value = area.title || `area-${i}`;
                              const label = area.title || `Area ${i + 1}`;
                              return (
                                <label key={i} className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer">
                                  <Checkbox
                                    checked={field.value.includes(value)}
                                    onCheckedChange={(checked) => {
                                      field.onChange(
                                        checked
                                          ? [...field.value, value]
                                          : field.value.filter((v) => v !== value),
                                      );
                                    }}
                                  />
                                  <span className="text-base">{label}</span>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </PopoverContent>
                    </Popover>
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
                    <FormLabel className="text-base font-semibold text-gray-700">Installation Estimate:</FormLabel>
                    <div className="flex items-center gap-2">
                      <FormControl>
                        <Input {...field} readOnly className="bg-gray-50" />
                      </FormControl>
                      <Button
                        type="button"
                        size="sm"
                        className="shrink-0 bg-[#ffaf8d] hover:bg-[#ffaf8d] text-gray-900"
                        onClick={() => setInstallationBidModalOpen(true)}
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
                    <FormLabel className="text-base font-semibold text-gray-700">Notes:</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {/* Totals Section */}
            <div className="!mt-[4rem]">
              <div className="bg-[#2c628d] text-white rounded-lg px-6 py-3 mb-8">
                <h3 className="text-lg font-bold ">Totals</h3>
              </div>
              <div>
                {selectedAreas.length === 0 ? (
                  <p className="text-sm text-gray-400 p-6">Select areas above to see luminaire totals.</p>
                ) : (
                  <>
                    {/* Combined totals across all selected areas */}
                    <div className="mb-8">
                      <ColumnHeaders />
                      {selectedAreas.flatMap((area) =>
                        (area.luminaires ?? []).map((lum, li) => renderLuminaireRow(area, li, lum))
                      )}
                    </div>

                    {/* Per-area breakdown — banner first, then that area's luminaires */}
                    {selectedAreas.map((area, areaIndex) => (
                      <div key={area.title}>
                        <div className="rounded-lg overflow-hidden mb-8">
                          <div className="flex items-center justify-between bg-[#2c628d] text-white px-6 py-3">
                          <span className="font-bold text-base">{area.title || area.name}</span>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="text-white border-white bg-[#2c628d] hover:bg-white/10 text-xs"
                            onClick={() => toggleAreaDetails(areaIndex)}
                          >
                            Area Details
                            {openAreaDetails.has(areaIndex)
                              ? <ChevronUp className="h-3 w-3 ml-1" />
                              : <ChevronDown className="h-3 w-3 ml-1" />
                            }
                          </Button>
                        </div>

                        {/* Area details accordion */}
                        {openAreaDetails.has(areaIndex) && (() => {
                          const a = area as Record<string, unknown>;
                          const f = (camel: string, snake: string) => (a[camel] ?? a[snake]) as string | undefined;
                          const ceilingHeight     = f('ceilingHeight', 'ceiling_height');
                          const dailyUsage        = f('dailyUsage', 'daily_usage');
                          const areaSqFt          = f('areaSqFt', 'area_sqft');
                          const application       = a['application'] as string | undefined;
                          const voltage           = a['voltage'] as string | undefined;
                          const installSurface    = f('installationSurface', 'installation_surface');
                          const controlType       = f('controlType', 'control_type');
                          const ingressProtection = f('ingressProtection', 'ingress_protection');
                          const notes             = a['notes'] as string | undefined;
                          const image             = a['image'] as string | undefined;

                          return (
                            <div className="bg-gray-50 border border-t-0 border-gray-200 p-5">
                              <div className="flex gap-5 items-stretch">
                                {/* Area image */}
                                <div className="flex-shrink-0 w-64 self-stretch border border-gray-200 rounded overflow-hidden">
                                  <AreaImage src={image} />
                                </div>

                                {/* Fields */}
                                <div className="flex-1 space-y-4">
                                  <div className="grid grid-cols-4 gap-4">
                                    {[
                                      { label: 'Ceiling Height:', value: ceilingHeight },
                                      { label: 'Daily Usage (hours):', value: dailyUsage },
                                      { label: 'Area (sq.ft.):', value: areaSqFt },
                                      { label: 'Application:', value: application },
                                      { label: 'Voltage:', value: voltage },
                                      { label: 'Installation Surface:', value: installSurface },
                                      { label: 'Control Type:', value: controlType },
                                      { label: 'Ingress Protection:', value: ingressProtection },
                                    ].map(({ label, value }) => (
                                      <div key={label}>
                                        <p className="text-xs font-semibold text-[#2c628d] mb-1">{label}</p>
                                        <div className="border border-gray-200 rounded px-3 py-2 text-sm bg-white text-gray-700 min-h-[36px]">
                                          {value ?? ''}
                                        </div>
                                      </div>
                                    ))}
                                  </div>

                                  <div>
                                    <p className="text-xs font-semibold text-[#2c628d] mb-1">Notes:</p>
                                    <div className="border border-gray-200 rounded px-3 py-2 text-sm bg-white text-gray-700 min-h-[60px]">
                                      {notes ?? ''}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                        </div>

                        <ColumnHeaders />
                        {(area.luminaires ?? []).map((lum, li) => renderLuminaireRow(area, li, lum))}
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          </form>
        </Form>
      </div>

      {productModal && (
        <ProductDetailsModal
          open={true}
          onOpenChange={(open) => { if (!open) setProductModal(null); }}
          lum={productModal.lum}
          componentLabel={productModal.label}
        />
      )}

      {recommendationModal && (
        <LuminaireRecommendationModal
          open={true}
          onOpenChange={(open) => { if (!open) setRecommendationModal(null); }}
          lum={recommendationModal.lum}
          componentLabel={recommendationModal.label}
          onSave={(componentLabel, _qty, changeType) => {
            const key = `${recommendationModal.areaTitle}-${recommendationModal.lumIndex}-${componentLabel}`;
            setRecommendedSelections((prev) => ({ ...prev, [key]: changeType }));
          }}
        />
      )}

      <Dialog open={biddingModalOpen} onOpenChange={setBiddingModalOpen}>
        <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden rounded-lg [&>button:last-child]:hidden">
          <div className={`px-6 py-4 flex items-center justify-between ${isBiddingOpen ? 'bg-[#ff9292]' : 'bg-[#ffe68d]'}`}>
            <h2 className="flex-1 text-center text-lg font-bold text-[#7a1f1f]">
              {isBiddingOpen ? 'Close Bidding Process?' : 'Open Bidding Process?'}
            </h2>
            <button
              type="button"
              onClick={() => setBiddingModalOpen(false)}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="px-8 py-8 flex flex-col items-center gap-6">
            <p className="text-center text-gray-700">
              Are you sure you're ready to {isBiddingOpen ? 'close' : 'open'} the bidding process?
              <br />
              This will notify all EUs in serviceable area...
            </p>

            <div className="flex flex-col items-center gap-2 w-full">
              <Button
                type="button"
                onClick={confirmBiddingToggle}
                className="w-64 bg-[#2c628d] hover:bg-[#24527a] text-white font-semibold"
              >
                Yes, {isBiddingOpen ? 'Close' : 'Open'} Bidding
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setBiddingModalOpen(false)}
                className="w-64 font-semibold"
              >
                No, Go Back
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={installationBidModalOpen} onOpenChange={setInstallationBidModalOpen}>
        <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden rounded-lg [&>button:last-child]:hidden">
          <div className="bg-[#ffb38a] px-6 py-4 flex items-center justify-between">
            <h2 className="flex-1 text-center text-lg font-bold text-gray-900">Installation Bid:</h2>
            <button
              type="button"
              onClick={() => setInstallationBidModalOpen(false)}
              className="text-gray-600 hover:text-gray-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="px-8 py-6 space-y-6 overflow-y-auto max-h-[80vh]">
            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-gray-300" />
              <h3 className="text-sm font-bold text-[#2c628d] tracking-wide uppercase shrink-0">Select Installation Bid</h3>
              <div className="flex-1 h-px bg-gray-300" />
            </div>

            <div>
              <div className="grid grid-cols-3 gap-6 mb-1.5">
                <p className="text-sm font-semibold text-[#2c628d]">Installation Estimate:</p>
                <p className="text-sm font-semibold text-[#2c628d]">Company:</p>
                <p className="text-sm font-semibold text-[#2c628d]">Date:</p>
              </div>
              <button
                type="button"
                onClick={() => setInstallationBidExpanded((v) => !v)}
                className="w-full flex items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-500"
              >
                <span />
                {installationBidExpanded
                  ? <ChevronUp className="h-4 w-4 opacity-60" />
                  : <ChevronDown className="h-4 w-4 opacity-60" />
                }
              </button>

              {installationBidExpanded && (
                <div className="mt-2 border border-gray-200 rounded-md p-2 bg-white">
                  <div className="bg-gray-100 rounded px-4 py-2.5 text-sm text-gray-700">Sourced Separately</div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-gray-300" />
              <h3 className="text-sm font-bold text-[#2c628d] tracking-wide uppercase shrink-0">Bid Details</h3>
              <div className="flex-1 h-px bg-gray-300" />
            </div>

            <div className="grid grid-cols-3 gap-x-6 gap-y-4">
              {['Labor', 'Materials', 'Permits', 'Tax', 'Recycling/Disposal'].map((label) => (
                <div key={label}>
                  <p className="text-sm font-semibold text-[#2c628d] mb-1.5">{label}</p>
                  <Input placeholder="$" className="bg-gray-100" />
                </div>
              ))}
              <div>
                <p className="text-sm font-semibold text-[#2c628d] mb-1.5">Availability</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-x-6 gap-y-4">
              <div>
                <p className="text-sm font-semibold text-[#2c628d] mb-1.5">Uploaded Files</p>
                <label className="flex items-center gap-2 rounded-md border border-gray-300 bg-gray-100 px-3 py-2 text-sm text-gray-500 cursor-pointer hover:bg-gray-200 transition-colors">
                  <Paperclip className="h-4 w-4 shrink-0" />
                  <span className="truncate">Choose file</span>
                  <input type="file" className="hidden" />
                </label>
              </div>
              <div>
                <p className="text-sm font-semibold text-[#2c628d] mb-1.5">Date</p>
                <Input type="date" className="bg-gray-100" />
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
