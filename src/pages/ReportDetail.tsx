import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { useReport, useApproveReport } from '@/hooks/use-reports';
import { useProject } from '@/hooks/use-projects';
import { useCompany } from '@/hooks/use-companies';
import { useUser } from '@/hooks/use-users';
import type { ReportCalculationResult } from '@/lib/report-calculator';
import { buildLuminaireSummary } from '@/lib/formatters';
import { useAuth } from '@/hooks/useAuth';
import { ReportPDFCapture } from '@/components/reports/ReportPDFCapture';
import { CoverPagePDF } from '@/components/reports/CoverPagePDF';
import { TableOfContentsPDF } from '@/components/reports/TableOfContentsPDF';
import { ExecutiveSummaryPDF } from '@/components/reports/ExecutiveSummaryPDF';
import { InvestmentOverviewPDF } from '@/components/reports/InvestmentOverviewPDF';
import { EnergyPDF } from '@/components/reports/EnergyPDF';
import { EcoIncentivePDF } from '@/components/reports/EcoIncentivePDF';
import { LuminairesPDF } from '@/components/reports/LuminairesPDF';
import { FinancingPDF } from '@/components/reports/FinancingPDF';
import {
  ChevronDown,
  Download,
  Printer,
  CheckCircle,
  HelpCircle,
  Lightbulb,
  Calculator,
  CloudDownload,
} from 'lucide-react';

// ── Luminaire component types for the Luminaires tab ─────────────────────────

interface LuminairePair {
  existing: string;
  recommended: string;
}

// ── Payback forecast dummy data ───────────────────────────────────────────────

const PAYBACK_DATA = [
  { year: 0, existing: 0,      led: 0     },
  { year: 1, existing: 38000,  led: 5000  },
  { year: 2, existing: 75000,  led: 10000 },
  { year: 3, existing: 112000, led: 15000 },
  { year: 4, existing: 153000, led: 18000 },
  { year: 5, existing: 192000, led: 23000 },
  { year: 6, existing: 234000, led: 27000 },
  { year: 7, existing: 270000, led: 32000 },
  { year: 8, existing: 305000, led: 37000 },
  { year: 9, existing: 350000, led: 43000 },
];

const formatYAxis = (value: number) =>
  value === 0 ? '$0' : `$${value.toLocaleString()}`;

const CHART_MARGIN = { top: 10, right: 20, left: 0, bottom: 35 } as const;
const Y_DOMAIN_MAX = 400000;

// Energy tab — consumption bar chart data (every 2 years, 0–10)
const CONSUMPTION_DATA = [
  { year: 0,  existing: 635100,  led: 262800  },
  { year: 2,  existing: 1270200, led: 525600  },
  { year: 4,  existing: 2540400, led: 1051200 },
  { year: 6,  existing: 3810600, led: 1576800 },
  { year: 8,  existing: 5080800, led: 2102400 },
  { year: 10, existing: 6351000, led: 2628000 },
];

const formatConsumptionY = (value: number) =>
  value === 0 ? '0' : value.toLocaleString();

// Energy tab dummy data
const ENERGY_CONSUMPTION = [
  { label: 'Existing System:', value: '36.25 kW', bg: '#ffe68d',   bold: false },
  { label: 'LED Upgrade:',     value: '15.00 kW', bg: '#ffe68d5e', bold: false },
  { label: 'Energy Saved:',    value: '21.25 kW', bg: '#8fcf74',   bold: true  },
] as const;

const ENERGY_COMPARISON_COLS = ['Monthly', 'Year 1', 'Year 3', 'Year 5'] as const;

const ENERGY_COMPARISON = [
  { label: 'Existing kWh:', values: [52925,  635100,  1905300, 3175500], bg: '#ffe68d',   bold: false },
  { label: 'LED kWh:',      values: [21900,  262800,   788400, 1314000], bg: '#ffe68d', bold: false },
  { label: 'Saved kWh:',    values: [31025,  372300,  1116900, 1861500], bg: '#8fcf74',   bold: true  },
] as const;

// Energy Expenditure Comparison dummy data
const EXPENDITURE_ROWS = [
  { label: 'Existing System:', values: [11644,  139722, 419166, 698610], bg: '#ffe68d',   bold: false },
  { label: 'LED Upgrade:',     values: [4818,    57816, 173448, 289080], bg: '#ffe68d',   bold: false },
  { label: 'Saved Capital:',   values: [6826,    81906, 245718, 409530], bg: '#8fcf74',   bold: true  },
] as const;

// Eco Incentive — Human Element
const HUMAN_ELEMENT_DATA = [
  { area: 'Entrance', cri: 20,  lumens: 22161 },
  { area: 'Garage',   cri: 5,   lumens: 50    },
];

// Eco Incentive — Precious Time
const PRECIOUS_TIME_ROWS = [
  { label: 'Existing System:',   values: [8, 99, 297, 495], bg: '#ffe6d8', bold: false },
  { label: 'LED Upgrade',        values: [0,  4,  12,  20], bg: '#ffe6d8', bold: false },
  { label: 'Labor Hours Saved:', values: [8, 95, 285, 475], bg: '#8fcf74', bold: true  },
] as const;

// Eco Incentive dummy data
const ECO_ROWS = [
  { label: 'AC Savings:',         values: [1216, 14596, 43788, 72980], prefix: '$' },
  { label: 'CO2 Abated (tons):',  values: [22,   264,   792,   1320 ], prefix: ''  },
  { label: 'Mercury Abated (mg):', values: [0,    1,     3,     5    ], prefix: ''  },
] as const;

// Financing tab dummy data
const FINANCING_LEFT = [
  { label: 'Investment Total:',     value: '$5,213',   bg: '#ffe68d'   },
  { label: 'Deposit:',              value: '$500',     bg: '#ffe68d5e' },
  { label: 'Principle Loan Amount:', value: '$4,713',  bg: '#ffe68d'   },
  { label: 'Rate:',                 value: '10 %',     bg: '#ffe68d5e' },
  { label: 'Duration:',             value: '49 mo',    bg: '#ffe68d' },
  { label: 'Total Loan Amount:',    value: '$5,184.3', bg: '#8fcf74'   },
] as const;

const FINANCING_TABLE_ROWS = [
  { label: 'Loan Amount Due:',   values: [106,  1270,  3809,  0     ], bg: '#ffe68d', bold: false },
  { label: 'LED Upgrade Saved:', values: [2833, 33990, 101970, 169950], bg: '#8fcf74', bold: true  },
  { label: 'Saved:',             values: [2727, 32720, 98161, 169950], bg: '#8fcf74', bold: true  },
] as const;

// Financing Forecast line chart data (years 0–10)
const FINANCING_FORECAST_DATA = [
  { year: 0,  existing: 0,      financed: 0,     paid: 0     },
  { year: 1,  existing: 38000,  financed: 6500,  paid: 5000  },
  { year: 2,  existing: 76000,  financed: 13000, paid: 9500  },
  { year: 3,  existing: 116000, financed: 18500, paid: 10500 },
  { year: 4,  existing: 154000, financed: 24000, paid: 11000 },
  { year: 5,  existing: 193000, financed: 29000, paid: 11500 },
  { year: 6,  existing: 232000, financed: 33000, paid: 12000 },
  { year: 7,  existing: 270000, financed: 37000, paid: 12000 },
  { year: 8,  existing: 308000, financed: 41500, paid: 12000 },
  { year: 9,  existing: 347000, financed: 46500, paid: 12000 },
  { year: 10, existing: 385000, financed: 52000, paid: 12000 },
];

// Projected Savings dummy data (Year 1 – 5)
const PROJECTED_SAVINGS = {
  existing: [38586,  77172,  115758, 154344, 192930],
  led:      [4596,   9192,   13788,  18384,  22980 ],
  savings:  [33990,  67980,  101970, 135960, 169950],
} as const;

// ── Tab definitions ───────────────────────────────────────────────────────────

interface TabDef {
  key: string;
  label: string;
  hint?: boolean;
  disabled?: boolean;
  allowClick?: boolean;
}

const DETAIL_TABS: TabDef[] = [
  { key: 'investment',    label: 'Investment' },
  { key: 'energy',        label: 'Energy' },
  { key: 'eco_incentive', label: 'Eco Incentive' },
  { key: 'luminaires',    label: 'Luminaires' },
  { key: 'financing',     label: 'Financing' },
  { key: 'illumination',  label: 'Illumination', hint: true, disabled: true, allowClick: true },
];

// ── Main component ────────────────────────────────────────────────────────────

function LumRow({ pair }: { pair: LuminairePair }) {
  return (
    <div className="grid grid-cols-2 gap-4 mb-4">
      <div className="border border-gray-200 rounded p-3 text-sm text-gray-700 leading-snug">
        {pair.existing || '—'}
      </div>
      <div className="border border-[#619c48] rounded p-3 text-sm text-[#619c48] leading-snug flex flex-col items-center justify-center gap-2 text-center relative">
        <span>{pair.recommended || '—'}</span>
        <div className="absolute top-2 right-2 flex gap-1.5">
          <button type="button" className="text-gray-300 hover:text-[#2c628d] transition-colors" title="Print">
            <Printer className="h-3.5 w-3.5" />
          </button>
          <button type="button" className="text-gray-300 hover:text-[#619c48] transition-colors" title="Download">
            <CloudDownload className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ReportDetail() {
  // Supports both /reports/:id and /projects/:projectId/proposal/:reportId
  const { id, reportId: reportIdParam, projectId } = useParams<{
    id?: string;
    reportId?: string;
    projectId?: string;
  }>();
  const navigate = useNavigate();
  const { isAdmin, userType } = useAuth();
  const isReu = userType === 'Reu';

  const reportId    = (reportIdParam ?? id) ? Number(reportIdParam ?? id) : undefined;
  const projectIdNum = projectId ? Number(projectId) : undefined;

  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<string>('investment');
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [calc, setCalc] = useState<ReportCalculationResult | null>(null);
  const [pdfDownload, setPdfDownload] = useState(false);

  const { data,    isLoading } = useReport(reportId);
  const { data: project }      = useProject(projectIdNum);
  const { data: company }      = useCompany(project?.company_id ?? undefined);
  const { data: reuUser }      = useUser(project?.user_id ?? undefined);
  const approveMutation        = useApproveReport();

  // Auto-calculate via edge function on every page visit
  useEffect(() => {
    if (!reportId) return;
    supabase.functions.invoke<ReportCalculationResult>('calculate-report', { body: { reportId } })
      .then(({ data, error }) => {
        if (error) { console.error('[calculate-report]', error); return; }
        if (data) setCalc(data);
        queryClient.invalidateQueries({ queryKey: ['report', reportId] });
      });
  }, [reportId]);

  // ── Loading ───────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <DashboardLayout title="Report">
        <div className="space-y-4">
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
          <div className="h-64 bg-muted animate-pulse rounded-lg" />
        </div>
      </DashboardLayout>
    );
  }

  if (!data) {
    return (
      <DashboardLayout title="Report Not Found">
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg font-medium">Report not found</p>
          <Button variant="outline" className="mt-4"
            onClick={() => projectId ? navigate(`/projects/${projectId}`) : navigate(-1)}>
            Go Back
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const { report, created_by: reportCreatedBy } = data;

  // ── Derived values ────────────────────────────────────────────────────────

  const areas = project?.areas?.map((a) => a.name).filter(Boolean).join(', ') || 'Entrance, Garage';

  const notesText = (() => {
    const n = report.notes;
    if (typeof n === 'string' && n.trim()) return n;
    return 'Project Estimate Deadline - 5.31.26';
  })();

  // ── Helpers ───────────────────────────────────────────────────────────────
  const fmt$ = (n: number) => `$${n.toLocaleString()}`;
  const fmtN = (n: number) => n.toLocaleString();

  // ── Pricing rows (prefer calculated values, fall back to report fields) ───
  const ledLuminaires   = calc?.ledLuminaires   ?? Number(report.led_price   ?? 0);
  const rebates         = calc ? 0              : Number(report.rebates      ?? 0);
  const lcWaiver        = calc?.lightCountWaiver ?? Number(report.light_count_waiver ?? 0);
  const salesTax        = calc?.tax             ?? Number(report.tax         ?? 0);
  const shipping        = calc ? 0              : Number(report.shipping     ?? 0);
  const projectTotal    = calc?.projectTotal    ?? Number(report.system_price ?? 0);

  const pricingRows: { label: string; value: string; highlight?: boolean }[] = [
    { label: 'LED Luminaires:',     value: ledLuminaires ? fmt$(ledLuminaires)                 : 'TBD' },
    { label: 'Rebates:',            value: rebates       ? fmt$(rebates)                       : 'TBD' },
    { label: 'Light Count Waiver:', value: lcWaiver      ? `(${fmt$(lcWaiver)})`               : '$0'  },
    { label: 'Sales Tax:',          value: salesTax      ? fmt$(salesTax)                      : '$0'  },
    { label: 'Shipping:',           value: shipping      ? fmt$(shipping)                      : 'TBD' },
    { label: 'Installation:',       value: '$0' },
    { label: 'Project Total:',      value: projectTotal  ? fmt$(projectTotal)                  : '—', highlight: true },
  ];

  // ── Report PDF footer/cover values ────────────────────────────────────────
  const pdfCompanyName = company?.name ?? 'Focus Earth Real Estate';
  const pdfCreatedBy = `${reportCreatedBy.first_name} ${reportCreatedBy.last_name}`.trim();
  const pdfProjectCityStateZip = [project?.city, [project?.state, project?.zip_code].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join(', ');
  const pdfReuUserName = `${reuUser?.first_name ?? ''} ${reuUser?.last_name ?? ''}`.trim();
  const pdfEnergyReductionPct = calc
    ? Math.round((parseFloat(calc.energySaved.replace(/,/g, '')) / parseFloat(calc.existingSystem.replace(/,/g, ''))) * 100)
    : 0;
  const pdfPriorities = (project?.property_priorities ?? null) as Record<string, number> | null;

  const pdfToc = {
    tableOfContents:    { title: 'Table Of Contents',     page: 1 },
    executiveSummary:   { title: 'Executive Summary',     page: 2 },
    investmentOverview: { title: 'Investment Overview',   page: 3 },
    energy:              { title: 'Energy Analysis',      page: 4 },
    ecoIncentive:         { title: 'Eco Incentive',         page: 5 },
    luminaires:           { title: 'Luminaire Upgrades',    page: 6 },
    financing:            { title: 'Financing Estimates',   page: 7 },
    companyHighlights:  { title: 'Company Highlights',    page: 8 },
  };

  // ── Investment highlights ──────────────────────────────────────────────────
  const highlights: { label: string; value: string; bg: string }[] = [
    { label: 'Payback (yrs)',    value: calc ? calc.payback.toFixed(1)            : (report.payback ?? '—'), bg: '#8fcf74' },
    { label: 'NPV',              value: calc ? fmt$(calc.reportNpv)               : '—',                     bg: '#f1d2ff' },
    { label: 'ROI (10 yrs)',     value: calc ? `${calc.roi.toFixed(1)}%`          : '—',                     bg: '#f1d2ff' },
    { label: 'Savings (10 yrs)', value: calc ? fmt$(calc.savings10)               : '—',                     bg: '#8fcf74' },
  ];

  // ── Projected Savings (Years 1–5) ─────────────────────────────────────────
  const projectedSavings = calc ? {
    existing: [1,2,3,4,5].map((y) => Math.round(calc.existingLuminairesCost * y)),
    led:      [1,2,3,4,5].map((y) => Math.round(calc.ledLuminairesCost      * y)),
    savings:  [1,2,3,4,5].map((y) => Math.round(calc.annualSavings          * y)),
  } : PROJECTED_SAVINGS;

  // ── Payback forecast chart (Years 0–9) ────────────────────────────────────
  const paybackData = calc ? Array.from({ length: 10 }, (_, y) => ({
    year:     y,
    existing: Math.round(calc.existingLuminairesCost * y),
    led:      Math.round(calc.projectTotal + calc.ledLuminairesCost * y),
  })) : PAYBACK_DATA;

  // ── Energy kW ─────────────────────────────────────────────────────────────
  const energyConsumption = calc ? [
    { label: 'Existing System:', value: `${calc.existingSystem} kW`, bg: '#ffe68d',   bold: false },
    { label: 'LED Upgrade:',     value: `${calc.ledSystem} kW`,      bg: '#ffe68d5e', bold: false },
    { label: 'Energy Saved:',    value: `${calc.energySaved} kW`,    bg: '#8fcf74',   bold: true  },
  ] : ENERGY_CONSUMPTION;

  // ── Energy kWh comparison ─────────────────────────────────────────────────
  const energyComparison = calc ? [
    { label: 'Existing kWh:', values: [
        Math.round(calc.existingYearEnergySmall / 12),
        calc.existingYearEnergySmall,
        Math.round(calc.existingYearEnergySmall * 3),
        Math.round(calc.existingYearEnergySmall * 5),
      ], bg: '#ffe68d', bold: false },
    { label: 'LED kWh:', values: [
        Math.round(calc.ledYearEnergySmall / 12),
        calc.ledYearEnergySmall,
        Math.round(calc.ledYearEnergySmall * 3),
        Math.round(calc.ledYearEnergySmall * 5),
      ], bg: '#ffe68d', bold: false },
    { label: 'Saved kWh:', values: [
        Math.round(calc.energySavedEco / 12),
        calc.energySavedEco,
        Math.round(calc.energySavedEco * 3),
        Math.round(calc.energySavedEco * 5),
      ], bg: '#8fcf74', bold: true },
  ] : ENERGY_COMPARISON;

  // ── Energy expenditure comparison ($) ─────────────────────────────────────
  const expenditureRows = calc ? [
    { label: 'Existing System:', values: [
        Math.round(calc.existingYearEnergyBig / 12),
        Math.round(calc.existingYearEnergyBig),
        Math.round(calc.existingYearEnergyBig * 3),
        Math.round(calc.existingYearEnergyBig * 5),
      ], bg: '#ffe68d', bold: false },
    { label: 'LED Upgrade:', values: [
        Math.round(calc.ledYearEnergyBig / 12),
        Math.round(calc.ledYearEnergyBig),
        Math.round(calc.ledYearEnergyBig * 3),
        Math.round(calc.ledYearEnergyBig * 5),
      ], bg: '#ffe68d', bold: false },
    { label: 'Saved Capital:', values: [
        Math.round((calc.existingYearEnergyBig - calc.ledYearEnergyBig) / 12),
        Math.round(calc.existingYearEnergyBig - calc.ledYearEnergyBig),
        Math.round((calc.existingYearEnergyBig - calc.ledYearEnergyBig) * 3),
        Math.round((calc.existingYearEnergyBig - calc.ledYearEnergyBig) * 5),
      ], bg: '#8fcf74', bold: true },
  ] : EXPENDITURE_ROWS;

  // ── Consumption bar chart (kWh cumulative every 2 years) ──────────────────
  const consumptionData = calc ? [0,2,4,6,8,10].map((y) => ({
    year:     y,
    existing: Math.round(calc.existingYearEnergySmall * (y || 1)),
    led:      Math.round(calc.ledYearEnergySmall      * (y || 1)),
  })) : CONSUMPTION_DATA;

  // ── Eco — Human element per area ──────────────────────────────────────────
  const humanElementData = calc?.cri?.length
    ? calc.cri.map((c, i) => ({
        area:   c.name,
        cri:    c.count,
        lumens: calc.lumens?.[i]?.count ?? 0,
      }))
    : HUMAN_ELEMENT_DATA;

  // ── Eco — Environmental benefits ──────────────────────────────────────────
  const ecoRows = calc ? [
    { label: 'AC Savings:',          values: [
        Math.round(calc.acSavings / 12), Math.round(calc.acSavings),
        Math.round(calc.acSavings * 3),  Math.round(calc.acSavings * 5),
      ], prefix: '$' },
    { label: 'CO2 Abated (tons):',   values: [
        Math.round(calc.co2Abated / 12), Math.round(calc.co2Abated),
        Math.round(calc.co2Abated * 3),  Math.round(calc.co2Abated * 5),
      ], prefix: '' },
    { label: 'Mercury Abated (mg):', values: [
        Math.round(calc.mercuryAbated / 12), Math.round(calc.mercuryAbated),
        Math.round(calc.mercuryAbated * 3),  Math.round(calc.mercuryAbated * 5),
      ], prefix: '' },
  ] : ECO_ROWS;

  // ── Eco — Precious time (labor hours) ─────────────────────────────────────
  const savedLabor = calc ? calc.existingLaborHours - calc.ledLaborHours : 0;
  const preciousTimeRows = calc ? [
    { label: 'Existing System:',   values: [
        Math.round(calc.existingLaborHours / 12), Math.round(calc.existingLaborHours),
        Math.round(calc.existingLaborHours * 3),  Math.round(calc.existingLaborHours * 5),
      ], bg: '#ffe6d8', bold: false },
    { label: 'LED Upgrade:',       values: [
        Math.round(calc.ledLaborHours / 12), Math.round(calc.ledLaborHours),
        Math.round(calc.ledLaborHours * 3),  Math.round(calc.ledLaborHours * 5),
      ], bg: '#ffe6d8', bold: false },
    { label: 'Labor Hours Saved:', values: [
        Math.round(savedLabor / 12), Math.round(savedLabor),
        Math.round(savedLabor * 3),  Math.round(savedLabor * 5),
      ], bg: '#8fcf74', bold: true },
  ] : PRECIOUS_TIME_ROWS;

  // ── Human element highlights ───────────────────────────────────────────────
  const criImprovement    = calc ? calc.criGlobal    : 20;
  const lumenImprovement  = calc ? calc.lumensGlobal : 22161;

  // ── Luminaire areas from fn_get_project ───────────────────────────────────
  type AreaRow = {
    name: string;
    ceilingHeight: string;
    dailyUsage: string;
    controlType: string;
    application: string;
    voltage: string;
    areaSqFt: string;
    installationSurface: string;
    ingressProtection: string;
    notes: string;
    luminaires: LuminairePair[];
  };

  const proposalItems = Array.isArray(report.proposal) ? (report.proposal as Record<string, unknown>[]) : [];

  const luminaireAreas: AreaRow[] = (project?.areas ?? []).map((area, aIdx) => {
    const a = area as Record<string, unknown>;
    const areaTitle = (a.title ?? a.name ?? '') as string;

    // Match by title first (proposal areas may not be in the same order as project areas)
    const proposalArea = (
      proposalItems.find((p) => (p.title as string) === areaTitle) ??
      proposalItems[aIdx] ??
      {}
    ) as Record<string, unknown>;

    const proposalLums = Array.isArray(proposalArea.luminaires)
      ? (proposalArea.luminaires as Record<string, unknown>[])
      : [];

    return {
      name:                areaTitle || `Area ${aIdx + 1}`,
      ceilingHeight:       (a.ceilingHeight || a.ceiling_height || '—') as string,
      dailyUsage:          (a.dailyUsage    || a.daily_usage    || '—') as string,
      controlType:         (a.controlType   || a.control_type   || '—') as string,
      application:         (a.application                       || '—') as string,
      voltage:             (a.voltage                           || '—') as string,
      areaSqFt:            (a.areaSqFt      || a.area_sqft      || '—') as string,
      installationSurface: (a.installationSurface || a.installation_surface || '—') as string,
      ingressProtection:   (a.ingressProtection   || a.ingress_protection   || '—') as string,
      notes:               (a.notes                            || '—') as string,
      luminaires: (area.luminaires ?? []).map((lum, lIdx): LuminairePair => {
        const l  = lum as Record<string, unknown>;
        const pl = (proposalLums[lIdx] ?? {}) as Record<string, unknown>;

        // Existing — prefer proposal *Existing objects, fall back to flat luminaire fields
        const fe = pl.fixtureExisting     as Record<string, unknown> | null | undefined;
        const le = pl.lampExisting        as Record<string, unknown> | null | undefined;
        const pe = pl.powerSupplyExisting as Record<string, unknown> | null | undefined;
        const ce = pl.controlExisting     as Record<string, unknown> | null | undefined;
        const ae = pl.accessoryExisting   as Record<string, unknown> | null | undefined;

        const existing = buildLuminaireSummary({
          fixtureDescription:     String(fe?.description     ?? l.fixtureDescription     ?? ''),
          lampPerFixture:         String(pl.lampPerFixture   ?? l.lampPerFixture          ?? ''),
          lampDescription:        String(le?.description     ?? l.lampDescription         ?? ''),
          powerSupplyDescription: String(pe?.description     ?? l.powerSupplyDescription  ?? ''),
          controlDescription:     String(ce?.description     ?? l.controlDescription      ?? ''),
          accessoryDescriptionA:  String(ae?.description     ?? l.accessoryDescriptionA   ?? ''),
        }) || '—';

        // Recommended — check 'description' (seeded products) then component-specific keys
        // (manually-created products may store the label in fixtureDescription, lampDescription, etc.)
        const desc = (obj: unknown, ...altKeys: string[]): string => {
          if (!obj || typeof obj !== 'object') return '';
          const o = obj as Record<string, unknown>;
          for (const key of ['description', ...altKeys]) {
            if (o[key] != null && o[key] !== '') return String(o[key]);
          }
          return '';
        };

        const recParts: string[] = [];
        const fix = desc(pl.fixtureRecommended, 'fixtureDescription');
        const lam = desc(pl.lampRecommended,     'lampDescription');
        const lpf = String(pl.lampPerFixture ?? '');
        const pow = desc(pl.powerSupplyRecommended, 'powerSupplyDescription');
        const ctl = desc(pl.controlRecommended,     'controlDescription');
        const acc = desc(pl.accessoryRecommended,   'accessoryDescriptionA');
        if (fix) recParts.push(fix);
        if (lam) recParts.push(lpf ? `(${lpf}) ${lam}` : lam);
        if (pow) recParts.push(`powered by ${pow}`);
        if (ctl) recParts.push(`controlled by ${ctl}`);
        if (acc) recParts.push(`with ${acc}`);

        return { existing, recommended: recParts.join(', ') || '—' };
      }),
    };
  });

  const allLuminaires = luminaireAreas.flatMap((a) => a.luminaires);

  const breadcrumb = (
    <span>
      <Link to="/projects" className="hover:underline">Projects</Link>
      {project && (
        <>
          <span className="mx-2">/</span>
          <Link to={`/projects/${projectIdNum}`} className="hover:underline">
            {project.title ?? 'Project'}
          </Link>
        </>
      )}
      <span className="mx-2">/</span>
      <span>{report.proposal_name}</span>
    </span>
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <DashboardLayout title={breadcrumb} mainClassName={"!p-0"}>

      {/* ── Header + Tab bar (one connected white block) ────────────────── */}
      <div className="bg-white border border-[#dbdada] shadow-sm overflow-hidden mb-0">

        {/* Header row */}
        <div className="flex gap-6 p-8 bg-[#f5f5f5]">

          {/* Thumbnail */}
          <div className="shrink-0 w-48 h-36 bg-gray-100 overflow-hidden border border-[#dbdada]">
            {project?.image ? (
              <img src={project.image} alt={project.title ?? ''} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Lightbulb className="h-12 w-12 text-gray-300" strokeWidth={1} />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 py-1">
            <h1 className="text-2xl font-bold text-gray-900 mb-2 truncate">
              {report.proposal_name}
            </h1>
            <p className="text-[1.125rem] text-gray-700">
              <span className="font-semibold">Areas:</span>{' '}
              <span className="text-gray-600 font-normal">{areas}</span>
            </p>
            <p className="text-[1.125rem] text-gray-700 mt-1">
              <span className="font-semibold">Notes:</span>{' '}
              <span className="text-gray-600 font-normal">{notesText}</span>
            </p>
          </div>

          {/* Action buttons */}
          <div className="shrink-0 flex flex-col items-end self-start pt-1" style={{ gap: '1rem' }}>

            {/* Calculator — admin / super admin only */}
            {isAdmin && (
              <button
                type="button"
                className="flex items-center gap-2 px-4 rounded justify-center transition-colors hover:opacity-90"
                style={{ backgroundColor: '#d76e34', width: '170px', height: '40px', fontSize: '0.75rem', fontWeight: 600 }}
                onClick={() => navigate(`/projects/${projectIdNum}/reports/${reportId}`)}
              >
                <Calculator className="h-4 w-4 text-white shrink-0" />
                <span className="text-gray-900">Calculator</span>
              </button>
            )}

            {/* Download or Print accordion */}
            <div style={{ width: '170px' }}>
              <button
                type="button"
                onClick={() => setDownloadOpen((o) => !o)}
                className={[
                  'flex items-center gap-2.5 px-4 bg-[#2C628D] hover:bg-[#245479] text-white transition-colors w-full ',
                  downloadOpen ? 'rounded-t' : 'rounded',
                ].join(' ')}
                style={{ height: '40px', fontSize: '0.75rem', fontWeight: 600 }}
              >
                <ChevronDown
                  className={[
                    'h-4 w-4 shrink-0 transition-transform duration-200',
                    downloadOpen ? 'rotate-180' : '',
                  ].join(' ')}
                />
                Download or Print
              </button>
              {downloadOpen && (
                <div className="w-full bg-[#eaf6ff] shadow-sm">
                  {isReu ? (
                    <>
                      <button
                        type="button"
                        className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <Download className="h-4 w-4 shrink-0 text-gray-500" />
                        Download PDF
                      </button>
                      <button
                        type="button"
                        className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <Printer className="h-4 w-4 shrink-0 text-gray-500" />
                        Print PDF
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        onClick={() => setPdfDownload(true)}
                      >
                        <CloudDownload className="h-4 w-4 shrink-0 text-gray-500" />
                        Energy Report
                      </button>
                      <button
                        type="button"
                        className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <CloudDownload className="h-4 w-4 shrink-0 text-gray-500" />
                        Specifications
                      </button>
                      <button
                        type="button"
                        className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <Printer className="h-4 w-4 shrink-0 text-gray-500" />
                        Print PDF
                      </button>
                    </>
                  )}
                  <div className="h-0.5 bg-[#46cd0d]" />
                </div>
              )}
            </div>

            {/* Approved / Approve button */}
            {report.approved ? (
              <button
                type="button"
                disabled
                className="flex items-center gap-2 px-4 bg-[#8fcf74] text-gray-900 rounded justify-center opacity-90 cursor-default "
                style={{ width: '170px', height: '40px', fontSize: '0.75rem', fontWeight: 600 }}
              >
                <CheckCircle className="h-4 w-4" />
                Approved
              </button>
            ) : isAdmin ? (
              <button
                type="button"
                disabled={approveMutation.isPending}
                onClick={() => reportId && confirm('Approve this report?') && approveMutation.mutate(reportId)}
                className="flex items-center gap-2 px-4 bg-[#8fcf74] hover:bg-[#7aba62] text-gray-900 rounded justify-center transition-colors disabled:opacity-60 "
                style={{ width: '170px', height: '40px', fontSize: '0.75rem', fontWeight: 600 }}
              >
                <CheckCircle className="h-4 w-4" />
                {approveMutation.isPending ? 'Approving…' : 'Approve'}
              </button>
            ) : null}

          </div>
        </div>

        {/* ── Tab bar ────────────────────────────────────────────────────── */}
        <div className="flex border-t border-[#dbdada] pt-10">
          {DETAIL_TABS.map((tab) => {
            const isDisabled  = tab.disabled === true;
            const isClickable = !isDisabled || tab.allowClick === true;
            const isActive    = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                disabled={isDisabled && !tab.allowClick}
                onClick={() => { if (isClickable) setActiveTab(tab.key); }}
                style={{ color: isDisabled ? '#a9a9a9' : '#619c48' }}
                className="relative flex-1 py-3.5 text-[1.125rem] font-bold text-center transition-colors select-none"
              >
                {tab.label}
                {tab.hint === true && (
                  <HelpCircle
                    className="inline h-6 w-6 ml-1 align-middle"
                    style={{ fill: '#ff7f56', color: 'white' }}
                  />
                )}
                {isActive && (
                  <span
                    className="absolute bottom-0 left-0 right-0 h-1"
                    style={{ backgroundColor: isDisabled ? '#a9a9a9' : '#619c48' }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Tab content area ─────────────────────────────────────────────── */}
      <div className="bg-gray-100 min-h-screen p-8 border border-t-0 border-[#dbdada]">

        {/* Investment tab */}
        {activeTab === 'investment' && (
          <div className="bg-white p-8 max-w-5xl border border-[#dbdada] mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Investment Overview</h2>
            <p className="text-gray-900 text-sm leading-relaxed mb-6">
              This section illustrates some of the key investment metrics associated with an LED
              lighting upgrade. Explore the project component breakdown and annual financial
              implications for the recommended system.
            </p>
            <hr className="border-[#dbdada] mb-6" />

            <div className="flex gap-12">
              {/* Investment Highlights */}
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 mb-4">Investment Highlights</h3>
                <div className="grid grid-cols-2 gap-10 w-fit ml-6">
                  {highlights.map((h) => (
                    <div
                      key={h.label}
                      style={{ backgroundColor: h.bg, width: '176px', height: '93px' }}
                      className="p-4 text-center text-gray-800 flex flex-col justify-center"
                    >
                      <p className="text-sm font-medium underline mb-2">{h.label}</p>
                      <p className="text-2xl font-bold">{h.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Project Pricing Information */}
              <div className="w-72 shrink-0">
                <h3 className="font-bold text-gray-900 mb-4">Project Pricing Information</h3>
                <div className="space-y-2.5">
                  {pricingRows.map((row, i) => {
                    const boxBg = row.highlight
                      ? '#ffbaba'
                      : i % 2 === 0
                      ? '#c1dbff'
                      : '#c1dbff69';
                    return (
                      <div key={row.label} className="flex items-center justify-between gap-3">
                        <span className="text-sm text-gray-700">{row.label}</span>
                        <span
                          style={{ backgroundColor: boxBg, width: '83px', height: '23px' }}
                          className="inline-flex items-center justify-center text-sm font-medium text-gray-800 shrink-0"
                        >
                          {row.value}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <hr className="border-[#dbdada] my-8" />

            {/* Payback Forecast */}
            <div>
              <h3 className="font-bold text-gray-900 mb-1">
                Payback Forecast{'  '}
                <span className="font-normal text-sm ml-2">
                  <span className="inline-block w-3 h-3 bg-red-500 rounded-sm mr-1 align-middle" />
                  Existing System
                  {'  '}
                  <span className="inline-block w-3 h-3 bg-green-500 rounded-sm mr-1 ml-3 align-middle" />
                  LED System
                </span>
              </h3>
              <div className="mt-4">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart
                    data={paybackData}
                    margin={CHART_MARGIN}
                  >
                    <CartesianGrid stroke="#e5e7eb" strokeDasharray="" />
                    <XAxis
                      dataKey="year"
                      tick={{ fontSize: 12, fill: '#374151' }}
                      label={{
                        value: 'Years',
                        position: 'insideBottom',
                        offset: -18,
                        fontWeight: 700,
                        fontSize: 13,
                        fill: '#111827',
                      }}
                    />
                    <YAxis
                      tickFormatter={formatYAxis}
                      domain={[0, Y_DOMAIN_MAX]}
                      ticks={[0, 50000, 100000, 150000, 200000, 250000, 300000, 350000, 400000]}
                      tick={{ fontSize: 12, fill: '#374151' }}
                      width={65}
                    />
                    <Tooltip
                      formatter={(value: number) => [`$${value.toLocaleString()}`, undefined]}
                      labelFormatter={(label) => `Year ${label}`}
                    />
                    <Line
                      type="linear"
                      dataKey="existing"
                      name="Existing System"
                      stroke="#e53e3e"
                      strokeWidth={2}
                      dot={{ r: 4, fill: '#e53e3e', strokeWidth: 0 }}
                      activeDot={{ r: 5 }}
                    />
                    <Line
                      type="linear"
                      dataKey="led"
                      name="LED System"
                      stroke="#48bb78"
                      strokeWidth={2}
                      dot={{ r: 4, fill: '#48bb78', strokeWidth: 0 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <hr className="border-[#dbdada] my-8" />

            {/* Projected Savings */}
            <div>
              <h3 className="font-bold text-gray-900 mb-4">Projected Savings</h3>
              <table className="w-full text-sm border-separate border-spacing-y-1">
                <thead>
                  <tr>
                    <th className="w-44" />
                    {[1, 2, 3, 4, 5].map((y) => (
                      <th
                        key={y}
                        className="text-center pb-2 font-bold text-gray-800 uppercase text-xs tracking-wide"
                      >
                        Year {y}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(
                    [
                      { label: 'Existing System Cost:', data: projectedSavings.existing, bg: '#c1dbff', bold: false },
                      { label: 'LED System Cost:',      data: projectedSavings.led,      bg: '#c1dbff', bold: false },
                      { label: 'Upgrade Savings:',      data: projectedSavings.savings,  bg: '#8fcf74', bold: true  },
                    ]
                  ).map((row) => (
                    <tr key={row.label}>
                      <td className="py-1 pr-4 text-gray-700">{row.label}</td>
                      {row.data.map((val: number, i: number) => (
                        <td key={i} className="px-1 py-1">
                          <span
                            style={{ backgroundColor: row.bg }}
                            className={[
                              'block text-center py-1.5 text-gray-800 text-sm',
                              row.bold ? 'font-bold' : 'font-medium',
                            ].join(' ')}
                          >
                            ${val.toLocaleString()}
                          </span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>

              <p className="mt-5 text-xs text-gray-600 leading-relaxed">
                <span className="font-semibold">Note:</span>{' '}
                Ask your insurance provider how your premiums can be lowered after an LED upgrade.
                Factors to consider include the reduction of electric maintenance, the improvement
                of visibility in high-traffic areas and the creation of a safer property environment.
              </p>
            </div>
          </div>
        )}

        {/* ── Energy tab ───────────────────────────────────────────────── */}
        {activeTab === 'energy' && (
          <div className="bg-white p-8 max-w-5xl mx-auto border border-[#dbdada]">
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Energy Analysis</h2>
            <p className="text-gray-900 text-sm leading-relaxed mb-6">
              Explore this investment from an energy consumption perspective. The recommended LED
              system will reduce demand on electric generation and translate directly to lower net
              operating expenses.
            </p>
            <hr className="border-gray-200 mb-8" />

            <div className="flex gap-10">
              {/* Left — Energy Consumption (kW) */}
              <div className="shrink-0">
                <h3 className="font-bold text-gray-900 mb-4">Energy Consumption (kW)</h3>
                <div className="space-y-2">
                  {energyConsumption.map((row) => (
                    <div key={row.label} className="flex items-center gap-3">
                      <span className="text-sm text-gray-700 w-32 text-right">{row.label}</span>
                      <span
                        style={{ backgroundColor: row.bg, width: '100px', height: '26px' }}
                        className={`inline-flex items-center justify-center text-sm text-gray-800 shrink-0 ${row.bold ? 'font-bold' : 'font-medium'}`}
                      >
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right — Energy Consumption Comparison */}
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 mb-4">Energy Consumption Comparison</h3>
                <table className="w-full text-sm border-separate border-spacing-y-1">
                  <thead>
                    <tr>
                      <th className="w-28" />
                      {ENERGY_COMPARISON_COLS.map((col) => (
                        <th
                          key={col}
                          className="text-center pb-2 font-bold text-gray-800 uppercase text-xs tracking-wide"
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {energyComparison.map((row) => (
                      <tr key={row.label}>
                        <td className="py-1 pr-3 text-gray-700 text-sm">{row.label}</td>
                        {row.values.map((val: number, i: number) => (
                          <td key={i} className="px-1 py-1">
                            <span
                              style={{ backgroundColor: row.bg }}
                              className={[
                                'block text-center py-1.5 text-gray-800 text-sm',
                                row.bold ? 'font-bold' : 'font-medium',
                              ].join(' ')}
                            >
                              {val.toLocaleString()}
                            </span>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <hr className="border-gray-200 my-8" />

            {/* Consumption bar chart */}
            <div>
              <h3 className="font-bold text-gray-900 mb-4">Consumption (kWh):</h3>
              <div className="flex gap-6">

                {/* Left legend */}
                <div className="shrink-0 flex flex-col gap-4 pt-10">
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-sm shrink-0" style={{ backgroundColor: '#ff7f56' }} />
                    <span className="text-sm font-semibold text-gray-700">Existing System</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-sm shrink-0" style={{ backgroundColor: '#619c48' }} />
                    <span className="text-sm font-semibold text-gray-700">LED System</span>
                  </div>
                </div>

                {/* Chart */}
                <div className="flex-1">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={consumptionData}
                      margin={{ top: 10, right: 20, left: 70, bottom: 35 }}
                      barCategoryGap="15%"
                      barGap={4}
                    >
                      <CartesianGrid stroke="#e5e7eb" vertical={false} />
                      <XAxis
                        dataKey="year"
                        tick={{ fontSize: 12, fill: '#374151' }}
                        label={{
                          value: 'Years',
                          position: 'insideBottom',
                          offset: -18,
                          fontWeight: 700,
                          fontSize: 13,
                          fill: '#111827',
                        }}
                      />
                      <YAxis
                        tickFormatter={formatConsumptionY}
                        domain={[0, 7000000]}
                        ticks={[0, 1000000, 2000000, 3000000, 4000000, 5000000, 6000000, 7000000]}
                        tick={{ fontSize: 11, fill: '#374151' }}
                        width={75}
                      />
                      <Tooltip
                        formatter={(value: number) => [value.toLocaleString(), undefined]}
                        labelFormatter={(label) => `Year ${label}`}
                      />
                      <Bar dataKey="existing" name="Existing System" fill="#ff7f56" radius={[2, 2, 0, 0]} />
                      <Bar dataKey="led"      name="LED System"      fill="#619c48" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <hr className="border-gray-200 my-8" />

            {/* Energy Expenditure Comparison */}
            <div>
              <h3 className="font-bold text-gray-900 mb-4">Energy Expenditure Comparison</h3>
              <table className="w-full text-sm border-separate border-spacing-y-1">
                <thead>
                  <tr>
                    <th className="w-36" />
                    {ENERGY_COMPARISON_COLS.map((col) => (
                      <th
                        key={col}
                        className="text-center pb-2 font-bold text-gray-800 uppercase text-xs tracking-wide"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {expenditureRows.map((row) => (
                    <tr key={row.label}>
                      <td className="py-1 pr-3 text-gray-700 text-sm">{row.label}</td>
                      {row.values.map((val: number, i: number) => (
                        <td key={i} className="px-1 py-1">
                          <span
                            style={{ backgroundColor: row.bg }}
                            className={[
                              'block text-center py-1.5 text-gray-800 text-sm',
                              row.bold ? 'font-bold' : 'font-medium',
                            ].join(' ')}
                          >
                            ${val.toLocaleString()}
                          </span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-4 text-xs text-gray-600 leading-relaxed">
                <span className="font-semibold">Note:</span>{' '}
                Based on the average cost per kWh entered in the Property Details area or
                extrapolated from provided energy bills.
              </p>
            </div>
          </div>
        )}

        {/* ── Eco Incentive tab ────────────────────────────────────────── */}
        {activeTab === 'eco_incentive' && (
          <div className="bg-white p-8 max-w-5xl mx-auto border border-[#dbdada]">
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Eco Incentive</h2>
            <p className="text-gray-900 text-sm leading-relaxed mb-6">
              By illuminating your building with LEDs, you're making a good choice for the planet.
              Choosing an energy-conscious technology reduces your environmental footprint. The chart
              below outlines some of the ways your upgrade will work towards a greener future.
            </p>
            <hr className="border-gray-200 mb-8" />

            <h3 className="font-bold text-gray-900 mb-4">Environmental Benefits</h3>
            <table className="w-full text-sm border-separate border-spacing-y-1">
              <thead>
                <tr>
                  <th className="w-44" />
                  {ENERGY_COMPARISON_COLS.map((col) => (
                    <th
                      key={col}
                      className="text-center pb-2 font-bold text-gray-800 uppercase text-xs tracking-wide"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ecoRows.map((row) => (
                  <tr key={row.label}>
                    <td className="py-1 pr-3 text-gray-700 text-sm text-right">{row.label}</td>
                    {row.values.map((val: number, i: number) => (
                      <td key={i} className="px-1 py-1">
                        <span
                          style={{ backgroundColor: '#d4e3cd' }}
                          className="block text-center py-3 text-gray-800 text-sm font-medium"
                        >
                          {row.prefix}{val.toLocaleString()}
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>

            <hr className="border-gray-200 my-8" />

            {/* Human Element */}
            <div className="flex gap-10">

              {/* Left — text + metrics */}
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 mb-3">Human Element</h3>
                <p className="text-gray-900 text-sm leading-relaxed mb-5">
                  Studies show that a properly lit work environment can increase employee
                  productivity by 10-15%. Upgrading to solid state LEDs will alleviate your team
                  of the headaches and eye strain so often associated with traditional
                  fluorescents and HIDs.
                </p>

                <div className="space-y-2 mb-5">
                  <div className="flex items-center gap-3">
                    <span
                      style={{ backgroundColor: '#9cbdd8' }}
                      className="w-28 text-center py-2 text-sm font-semibold text-gray-800 shrink-0"
                    >
                      {criImprovement}%
                    </span>
                    <span className="text-sm text-gray-700">Avg. Improved CRI</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      style={{ backgroundColor: '#ffd339' }}
                      className="w-28 text-center py-2 text-sm font-semibold text-gray-800 shrink-0"
                    >
                      {lumenImprovement.toLocaleString()}%
                    </span>
                    <span className="text-sm text-gray-700">Avg. Improved Illumination</span>
                  </div>
                </div>

                <p className="text-gray-900 text-sm leading-relaxed">
                  Properly illuminated work environments also reduce on-site accidents and can
                  minimize insurance premiums.
                </p>
              </div>

              {/* Right — grouped bar chart */}
              <div className="flex-1 bg-white">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={humanElementData}
                    margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
                    barGap={4}
                    barCategoryGap="35%"
                  >
                    <XAxis dataKey="area" tick={{ fontSize: 12, fill: '#374151' }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip
                      cursor={false}
                      formatter={(value: number) => [value.toLocaleString(), undefined]}
                      labelFormatter={(label) => `${label}`}
                    />
                    <Bar dataKey="cri"    name="Improved CRI"                fill="#9cbdd8" radius={[2, 2, 0, 0]} isAnimationActive={false} />
                    <Bar dataKey="lumens" name="Improved Directional Lumens" fill="#ffd339" radius={[2, 2, 0, 0]} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>

                {/* Legend */}
                <div className="flex items-center gap-6 mt-2 pl-4">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-3.5 rounded-sm shrink-0" style={{ backgroundColor: '#9cbdd8' }} />
                    <span className="text-xs text-gray-600">Improved CRI</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-3.5 rounded-sm shrink-0" style={{ backgroundColor: '#ffd339' }} />
                    <span className="text-xs text-gray-600">Improved Directional Lumens</span>
                  </div>
                </div>
              </div>
            </div>

            <hr className="border-gray-200 my-8" />

            {/* Precious Time */}
            <div>
              <h3 className="font-bold text-gray-900 mb-3">Precious Time</h3>
              <p className="text-gray-900 text-sm leading-relaxed mb-4">
                Additionally, long lasting LEDs reduce the amount of time you must spend on lamp
                replacement, allowing your company electrician to focus on more important tasks.
              </p>

              <h4 className="font-bold text-gray-900 mb-3">Labor Hours Saved</h4>
              <table className="w-full text-sm border-separate border-spacing-y-1 table-fixed">
                <thead>
                  <tr>
                    <th className="w-31" />
                    {ENERGY_COMPARISON_COLS.map((col) => (
                      <th
                        key={col}
                        className="text-center pb-2 font-bold text-gray-800 uppercase text-xs tracking-wide"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preciousTimeRows.map((row) => (
                    <tr key={row.label}>
                      <td className="py-1 pr-3 text-gray-700 text-sm text-right">{row.label}</td>
                      {row.values.map((val: number, i: number) => (
                        <td key={i} className="px-1 py-1">
                          <span
                            style={{ backgroundColor: row.bg }}
                            className={[
                              'block w-full text-center py-4 text-gray-800 text-sm',
                              row.bold ? 'font-bold' : 'font-medium',
                            ].join(' ')}
                          >
                            {val.toLocaleString()}
                          </span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>

              <p className="mt-4 text-gray-900 text-xs leading-relaxed">
                <span className="font-semibold">Note:</span>{' '}
                We defer to your own internal measurements for just how much time this upgrade
                will save in your acquisition and coordination departments.
              </p>
            </div>
          </div>
        )}

        {/* Other tabs — placeholder until data wired */}
        {/* ── Financing tab ────────────────────────────────────────────── */}
        {activeTab === 'financing' && (
          <div className="bg-white p-8 max-w-5xl mx-auto border border-[#dbdada]">
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Financing Estimates</h2>
            <p className="text-gray-900 text-sm leading-relaxed mb-6">
              Loan estimates are based on approximated rates in order to demonstrate alternative
              payment methods. Exact details regarding any financing arrangement must be approved
              by a lending entity.
            </p>
            <hr className="border-gray-200 mb-8" />

            <div className="flex gap-12">
              {/* Left — metric boxes */}
              <div className="shrink-0">
                <div className="space-y-2">
                  {FINANCING_LEFT.map((row) => (
                    <div key={row.label} className="flex items-center gap-3">
                      <span className="text-sm text-gray-700 w-44 text-right shrink-0">{row.label}</span>
                      <span
                        style={{ backgroundColor: row.bg, width: '100px', height: '26px' }}
                        className="inline-flex items-center justify-center text-sm font-medium text-gray-800 shrink-0"
                      >
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right — comparison table */}
              <div className="flex-1">
                <table className="w-full text-sm border-separate border-spacing-y-1 table-fixed">
                  <thead>
                    <tr>
                      <th className="w-36" />
                      {ENERGY_COMPARISON_COLS.map((col) => (
                        <th
                          key={col}
                          className="text-center pb-2 font-bold text-gray-800 uppercase text-xs tracking-wide"
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {FINANCING_TABLE_ROWS.map((row) => (
                      <tr key={row.label}>
                        <td className="py-1 pr-3 text-gray-700 text-sm text-right">{row.label}</td>
                        {row.values.map((val: number, i: number) => (
                          <td key={i} className="px-1 py-1">
                            <span
                              style={{ backgroundColor: row.bg }}
                              className={[
                                'block w-full text-center py-2 text-gray-800 text-sm',
                                row.bold ? 'font-bold' : 'font-medium',
                              ].join(' ')}
                            >
                              ${val.toLocaleString()}
                            </span>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <hr className="border-gray-200 my-8" />

            {/* Financing Forecast chart */}
            <div>
              <h3 className="font-bold text-gray-900 mb-3">Financing Forecast</h3>

              {/* Legend — top of chart */}
              <div className="flex items-center justify-center gap-8 mb-4">
                {[
                  { color: '#e53e3e', label: 'Existing System' },
                  { color: '#f5c842', label: 'LED Upgrade (Financed)' },
                  { color: '#619c48', label: 'LED Upgrade (Paid)' },
                ].map(({ color, label }) => (
                  <div key={label} className="flex items-center gap-2">
                    <span className="w-8 h-3.5 shrink-0 inline-block" style={{ backgroundColor: color }} />
                    <span className="text-xs text-gray-600">{label}</span>
                  </div>
                ))}
              </div>

              <ResponsiveContainer width="100%" height={320}>
                <LineChart
                  data={FINANCING_FORECAST_DATA}
                  margin={{ top: 10, right: 20, left: 10, bottom: 35 }}
                >
                  <CartesianGrid stroke="#e5e7eb" />
                  <XAxis
                    dataKey="year"
                    tick={{ fontSize: 12, fill: '#374151' }}
                    label={{
                      value: 'Years',
                      position: 'insideBottom',
                      offset: -18,
                      fontWeight: 700,
                      fontSize: 13,
                      fill: '#111827',
                    }}
                  />
                  <YAxis
                    tickFormatter={formatYAxis}
                    domain={[0, 400000]}
                    ticks={[0, 50000, 100000, 150000, 200000, 250000, 300000, 350000, 400000]}
                    tick={{ fontSize: 11, fill: '#374151' }}
                    width={75}
                  />
                  <Tooltip
                    formatter={(value: number) => [`$${value.toLocaleString()}`, undefined]}
                    labelFormatter={(label) => `Year ${label}`}
                  />
                  <Line type="linear" dataKey="existing" name="Existing System"        stroke="#e53e3e" strokeWidth={2} dot={{ r: 3, fill: '#e53e3e', strokeWidth: 0 }} />
                  <Line type="linear" dataKey="financed" name="LED Upgrade (Financed)" stroke="#f5c842" strokeWidth={2} dot={{ r: 3, fill: '#f5c842', strokeWidth: 0 }} />
                  <Line type="linear" dataKey="paid"     name="LED Upgrade (Paid)"     stroke="#619c48" strokeWidth={2} dot={{ r: 3, fill: '#619c48', strokeWidth: 0 }} />
                </LineChart>
              </ResponsiveContainer>

              <p className="mt-4 text-xs text-gray-600 leading-relaxed">
                <span className="font-semibold">Note:</span>{' '}
                Loan forecasts represent estimates calculated to better facilitate illumination
                system upgrades.
              </p>
            </div>
          </div>
        )}

        {/* ── Illumination tab ─────────────────────────────────────────── */}
        {activeTab === 'illumination' && (
          <div className="bg-white p-8 max-w-5xl mx-auto min-h-screen border border-[#dbdada]">
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Illumination Reports</h2>
            <p className="text-gray-900 text-sm leading-relaxed mb-6">
              Explore how each upgrade will impact the lighting environment in the various areas
              of the project.
            </p>
            <hr className="border-gray-200 mb-6" />

            <div className="flex justify-between">
              <h3 className="text-base font-bold" style={{ color: '#2c628d' }}>Areas</h3>
              <h3 className="text-base font-bold" style={{ color: '#2c628d' }}>Maps</h3>
            </div>
          </div>
        )}

        {/* ── Luminaires tab ───────────────────────────────────────────── */}
        {activeTab === 'luminaires' && (
          <div className="bg-white p-8 max-w-5xl mx-auto border border-[#dbdada]">
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Luminaires</h2>
            <p className="text-gray-900 text-sm leading-relaxed mb-2">
              This page details the existing lighting components that can be recycled and the
              recommended upgrades that can replace them. Use the following notation to quickly
              review the luminaire descriptions:
            </p>
            <p className="text-sm font-bold mb-6">
              [Fixture QTY] Fixture Description (Lamp QTY) Component Descriptions {'{'}Mounting Height{'}'}
            </p>
            <hr className="border-[#dbdada] mb-12" />

            {/* Column headers */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <p className="text-center text-lg font-bold tracking-widest uppercase text-gray-400 border-b-2 border-gray-300 pb-2">
                Existing Components
              </p>
              <p className="text-center text-lg font-bold tracking-widest uppercase text-[#619c48] border-b-2 border-[#619c48] pb-2">
                Recommended Components
              </p>
            </div>

            {/* Totals */}
            <h3 className="font-bold text-gray-900 text-base mb-3">Totals</h3>
            <div className="mb-10">
              {allLuminaires.length > 0
                ? allLuminaires.map((pair, i) => <LumRow key={i} pair={pair} />)
                : <p className="text-sm text-gray-400">No luminaire data available.</p>}
            </div>

            {/* Per-area sections */}
            {luminaireAreas.map((area) => (
              <div key={area.name} className="mb-10">
                <h3 className="font-bold text-gray-900 text-base mb-3">{area.name}</h3>

                {/* Area details panel */}
                <div className="border border-[#2c628d] p-4 mb-4 text-sm">
                  <div className="grid grid-cols-4 gap-x-6 gap-y-2 mb-2">
                    {[
                      { label: 'Ceiling Height:',       value: area.ceilingHeight       },
                      { label: 'Daily Usage:',           value: area.dailyUsage          },
                      { label: 'Control Type:',          value: area.controlType         },
                      { label: 'Application:',           value: area.application         },
                      { label: 'Voltage:',               value: area.voltage             },
                      { label: 'Area (sq.ft.):',         value: area.areaSqFt            },
                      { label: 'Installation Surface:',  value: area.installationSurface },
                      { label: 'Ingress Protection:',    value: area.ingressProtection   },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <span className="text-[#2c628d] font-semibold">{label}</span>{' '}
                        <span className="font-bold text-gray-800">{value}</span>
                      </div>
                    ))}
                  </div>
                  <div>
                    <span className="text-[#2c628d] font-semibold">Notes:</span>{' '}
                    <span className="font-bold text-gray-800">{area.notes}</span>
                  </div>
                </div>

                {/* Luminaire cards for this area */}
                <div>
                  {area.luminaires.map((pair, i) => (
                    <LumRow key={i} pair={pair} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Other tabs — placeholder until data wired */}
        {activeTab !== 'investment' && activeTab !== 'energy' && activeTab !== 'eco_incentive' && activeTab !== 'financing' && activeTab !== 'illumination' && activeTab !== 'luminaires' && (
          <div className="bg-white p-12 max-w-5xl mx-auto text-center text-gray-400 border border-[#dbdada]">
            <p className="text-sm">
              {DETAIL_TABS.find((t) => t.key === activeTab)?.label} content coming soon.
            </p>
          </div>
        )}
      </div>

      {pdfDownload && (
        <ReportPDFCapture
          fileName={`${project.title}_${report.proposal_name || reportId}.pdf`}
          onDone={() => setPdfDownload(false)}
        >
          <CoverPagePDF
            companyName={pdfCompanyName}
            proposalName={report.proposal_name}
            projectAddress={project?.address ?? ''}
            projectCityStateZip={pdfProjectCityStateZip}
            createdBy={pdfCreatedBy}
          />
          <TableOfContentsPDF
            companyName={pdfCompanyName}
            pageNumber={pdfToc.tableOfContents.page}
            entries={Object.values(pdfToc)}
          />
          <ExecutiveSummaryPDF
            companyName={pdfCompanyName}
            pageNumber={pdfToc.executiveSummary.page}
            reuUserName={pdfReuUserName}
            projectAddress={project?.address ?? ''}
            energyReductionPct={pdfEnergyReductionPct}
            lumensImprovementPct={calc?.lumensGlobal ?? 0}
            criImprovementPct={calc?.criGlobal ?? 0}
            priorities={pdfPriorities}
          />
          <InvestmentOverviewPDF
            companyName={pdfCompanyName}
            pageNumber={pdfToc.investmentOverview.page}
            highlights={highlights}
            pricingRows={pricingRows}
            paybackData={paybackData}
            projectedSavings={projectedSavings}
          />
          <EnergyPDF
            companyName={pdfCompanyName}
            pageNumber={pdfToc.energy.page}
            comparisonCols={ENERGY_COMPARISON_COLS}
            energyConsumption={energyConsumption}
            energyComparison={energyComparison}
            consumptionData={consumptionData}
            expenditureRows={expenditureRows}
          />
          <EcoIncentivePDF
            companyName={pdfCompanyName}
            pageNumber={pdfToc.ecoIncentive.page}
            comparisonCols={ENERGY_COMPARISON_COLS}
            ecoRows={ecoRows}
            humanElementData={humanElementData}
            criImprovement={criImprovement}
            lumenImprovement={lumenImprovement}
            preciousTimeRows={preciousTimeRows}
          />
          <LuminairesPDF
            companyName={pdfCompanyName}
            pageNumber={pdfToc.luminaires.page}
            allLuminaires={allLuminaires}
            luminaireAreas={luminaireAreas}
          />
          <FinancingPDF
            companyName={pdfCompanyName}
            pageNumber={pdfToc.financing.page}
            comparisonCols={ENERGY_COMPARISON_COLS}
            financingLeft={FINANCING_LEFT}
            financingRows={FINANCING_TABLE_ROWS}
            financingForecastData={FINANCING_FORECAST_DATA}
          />
        </ReportPDFCapture>
      )}
    </DashboardLayout>
  );
}
