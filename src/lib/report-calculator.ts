import type { Project } from '@/types/database';

// ── Project fields needed for the calculation ─────────────────────────────────
export type ProjectConfig = Pick<
  Project,
  | 'cost_per_kilowatt_hour'
  | 'operation_days_per_year'
  | 'labor_cost'
  | 'sales_tax'
  | 'light_count'
  | 'state'
>;

// ── Loose record for product specs stored in proposal JSON ────────────────────
// Supports both new canonical field names (ProductDetails) and legacy Airtable keys.
export type ProductSpec = Record<string, unknown>;

// ── One luminaire row inside a proposal area ──────────────────────────────────
export interface ProposalLuminaire {
  qty?: string;              // fixture count (existing)
  lampPerFixture?: string;
  lampWattage?: string;      // existing lamp wattage
  lampPricePerUnit?: string; // custom price override for existing lamp
  powerPricePerUnit?: string;
  controlDescription?: string;

  lampExisting?: ProductSpec;
  powerSupplyExisting?: ProductSpec;

  // Recommended product data — canonical ProductDetails field names preferred;
  // legacy Airtable key names accepted as fallback inside toNum/toStr helpers.
  recommendedLamp?: ProductSpec;
  recommendedPowerSupply?: ProductSpec;

  recommendedFixtureQty?: string;
  recommendedLampQty?: string;
}

// ── One proposal area (maps to project.areas) ─────────────────────────────────
export interface ProposalItem {
  title?: string;
  application?: string;   // 'Indoor' | 'Outdoor' | 'Garage'
  dailyUsage?: string;
  areaSqFt?: string;
  controlType?: string;
  luminaires: ProposalLuminaire[];
}

// ── Per-area CRI / lumen entry used in the result ─────────────────────────────
export interface AreaMetric {
  name: string;
  count: number;
  totalCount: number;
}

// ── Full calculation result ───────────────────────────────────────────────────
export interface ReportCalculationResult {
  addedLumens: number;
  lumenIncrease: number;
  lumenIncreaseSqFt: number;
  lumenIncreaseFixture: number;
  existingSystem: string;   // formatted "1,234.56"
  ledSystem: string;
  energySaved: string;
  existingYearEnergySmall: number;
  ledYearEnergySmall: number;
  energySavedEco: number;
  existingYearEnergyBig: number;
  ledYearEnergyBig: number;
  daily: number;
  criGlobal: number;
  lumensGlobal: number;
  cri: AreaMetric[];
  lumens: AreaMetric[];
  mercuryAbated: number;
  existingLaborHours: number;
  ledLaborHours: number;
  roi: number;
  etaDay: number;
  payback: number;
  existingLuminairesCost: number;
  ledLuminairesCost: number;
  ledLuminaires: number;
  tax: number;
  lightCountWaiver: number;
  savings10: number;
  yearOneExisting: number;
  yearThreeExisting: number;
  yearFiveExisting: number;
  yearOneLed: number;
  yearThreeLed: number;
  yearFiveLed: number;
  reportNpv: number;
  sensor: number;
  colorTunable: number;
  co2Abated: number;
  acSavings: number;
  projectTotal: number;
  // Annual cost savings persisted as cost_year
  annualSavings: number;
}

// ── States where indoor AC savings factor is higher ───────────────────────────
const HOT_STATES = new Set([
  'CA', 'TX', 'FL', 'HI', 'AZ', 'NM', 'NV', 'OK',
  'LA', 'MS', 'AL', 'GA', 'SC', 'NC',
]);

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Read a numeric value from a ProductSpec, trying keys in order.
 * Strips non-numeric characters (e.g. "$", ",") before parsing.
 */
function toNum(obj: ProductSpec | null | undefined, ...keys: string[]): number {
  if (!obj) return 0;
  for (const k of keys) {
    const v = obj[k];
    if (v != null && v !== '') {
      const n = parseFloat(String(v).replace(/[^0-9.]/g, ''));
      if (!isNaN(n)) return n;
    }
  }
  return 0;
}

/** Read a string value from a ProductSpec, trying keys in order. */
function toStr(obj: ProductSpec | null | undefined, ...keys: string[]): string {
  if (!obj) return '';
  for (const k of keys) {
    const v = obj[k];
    if (v != null && v !== '') return String(v);
  }
  return '';
}

/** Format a number like PHP number_format($n, 2, '.', ',') */
function fmtNum(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * 10-year NPV at 5% discount rate.
 * annualSavings: recurring cash inflow per year
 * projectCost:   initial outlay (positive number)
 */
function npv10(annualSavings: number, projectCost: number): number {
  const rate = 0.05;
  const n = 10;
  const pvFactor = (1 - Math.pow(1 + rate, -n)) / rate;
  return annualSavings * pvFactor - projectCost;
}

// ── Main calculation function ─────────────────────────────────────────────────

/**
 * Pure, side-effect-free port of the legacy PHP calculateReport() method.
 *
 * Returns null when custom pricing exists (the caller should skip saving and
 * surface a message to the user instead).
 *
 * PHP operator-precedence bugs in $elrc/$eapsbrc/$ealc (where `*` bound tighter
 * than `??`) are fixed — prices are now resolved before being multiplied.
 */
export function calculateReport(
  project: ProjectConfig,
  proposalItems: ProposalItem[],
  options: {
    installation?: { total?: string } | null;
    customPricing?: Record<string, boolean> | null;
    shipping?: number;
    rebates?: number;
  },
): ReportCalculationResult | null {
  // Skip when any custom bid is active
  if (options.customPricing && Object.values(options.customPricing).some(Boolean)) {
    return null;
  }

  const costKW  = parseFloat(project.cost_per_kilowatt_hour ?? '0') || 0;
  const opDays  = project.operation_days_per_year ?? 0;
  const laborCost = parseFloat(project.labor_cost ?? '0') || 0;
  const salesTax  = parseFloat(project.sales_tax  ?? '0') || 0;
  const state     = project.state ?? '';
  const lightCount = project.light_count ?? '';

  // ── Accumulators ─────────────────────────────────────────────────────────

  let globalDaily = 0;
  let lightCuntWaiver = 0;

  // kW totals — start at 1 (faithful port of PHP $existingSystem = 1; $ledSystem = 1;)
  let existingSystem = 1;
  let ledSystem = 1;

  let energySavedEco = 0;
  let co2abated      = 0;
  let acSavings      = 0;
  let mercury        = 0;
  let existingLaborHours = 0;
  let ledLaborHours  = 0;
  let illuminance    = 0;
  let lumensIncrease = 0;
  let sensorsYes = 0;
  let sensorsNo  = 0;

  // Track last luminaire's individual qty (matches PHP behaviour)
  let existingLedQtyGlobal = 0;
  let recomLedQtyGlobal    = 0;
  let existingLedGlobalQties = 0;
  let recomLedGlobalQties    = 0;

  const colorTunableYes: string[] = [];
  const colorTunableNo:  string[] = [];
  const applications:    string[] = [];
  const etaDay:          number[] = [];

  // Financial accumulators
  let el  = 0; // existing total annual cost
  let llt = 0; // LED total annual cost
  let eaecTotal = 0;
  let laecTotal = 0;
  let ledLuminairesPrice = 0;
  let elrcTotal  = 0;
  let llrcTotal  = 0;

  const infoCri:    AreaMetric[] = [];
  const infoLumens: AreaMetric[] = [];

  // ── Main loop: areas ─────────────────────────────────────────────────────

  for (const item of proposalItems) {
    const daily  = parseFloat(item.dailyUsage ?? '0') || 0;
    globalDaily += daily;

    if (item.areaSqFt) lightCuntWaiver += parseFloat(item.areaSqFt) || 0;
    if (item.application) applications.push(item.application);

    const CriesLocal: number[] = [];
    const Lumens:     number[] = [];

    // Per-area totalCount for weighted CRI/lumen averages
    const totalCount = item.luminaires.reduce((carry, lum) => {
      const rLampQty    = parseFloat(lum.recommendedLampQty    ?? '0') || 1;
      const rFixtureQty = parseFloat(lum.recommendedFixtureQty ?? lum.qty ?? '0') || 1;
      return carry + rLampQty * rFixtureQty;
    }, 1);

    // ── Inner loop: luminaires ──────────────────────────────────────────

    for (const luminaire of item.luminaires) {
      const recLamp   = luminaire.recommendedLamp;
      const recPower  = luminaire.recommendedPowerSupply;
      const exLamp    = luminaire.lampExisting;
      const exPower   = luminaire.powerSupplyExisting;

      // Skip luminaires with no recommendation
      if (!recLamp) continue;

      // Quantities
      const existingQty  = parseFloat(luminaire.qty ?? '1') || 1;
      const lampPerFix   = parseFloat(luminaire.lampPerFixture ?? '1') || 1;
      const recFixtureQty = parseFloat(luminaire.recommendedFixtureQty ?? luminaire.qty ?? '1') || 1;
      const recLampQty    = parseFloat(luminaire.recommendedLampQty ?? '1') || 1;
      const recLedQty     = recFixtureQty * recLampQty;

      existingLedQtyGlobal = existingQty;
      recomLedQtyGlobal    = recLedQty;
      recomLedGlobalQties    += recLedQty;
      existingLedGlobalQties += existingQty;

      // ── Pricing: recommended lamp (volume tiers apply per-luminaire qty) ──
      let pricePerUnit: number;
      const customPPU = toNum(recLamp, 'customPricePerUnit', 'SU PPU ($) Custom');
      if (customPPU) {
        pricePerUnit = customPPU;
      } else {
        pricePerUnit = toNum(recLamp, 'pricePerUnit', 'Price Per Unit ($)') || 1;
        if (recLedQty >= 200) {
          pricePerUnit = toNum(recLamp, 'volumeTier2PPU', 'Volume Tier 2 PPU ($)') || pricePerUnit;
        } else if (recLedQty >= 100) {
          pricePerUnit = toNum(recLamp, 'volumeTier1PPU', 'Volume Tier 1 PPU ($)') || pricePerUnit;
        }
      }

      // ── Pricing: recommended power supply ──────────────────────────────
      let pricePower: number;
      const customPowerPPU = toNum(recPower, 'customPricePerUnit', 'SU PPU ($) Custom');
      pricePower = customPowerPPU
        ? customPowerPPU
        : (toNum(recPower, 'pricePerUnit', 'Price Per Unit ($)') || 1);

      // ── Lumen increase ─────────────────────────────────────────────────
      const areaSqFt = parseFloat(item.areaSqFt ?? '0') || 1;
      lumensIncrease += (recFixtureQty * recLampQty - existingQty * lampPerFix) / areaSqFt;

      // ── CRI ────────────────────────────────────────────────────────────
      const criLed      = toNum(recLamp, 'cri', 'CRI');
      const criExisting = toNum(exLamp,  'cri', 'CRI');
      CriesLocal.push(
        Math.round((criLed - criExisting) / 30 * 100) * recLampQty * recFixtureQty / totalCount,
      );

      // ── Lumens % change (weighted) ──────────────────────────────────────
      const recLumens  = toNum(recLamp, 'lumens', 'Lumens');
      const exLumens   = toNum(exLamp,  'lumens', 'Directional Lumens') || 1;
      Lumens.push(
        Math.round(
          ((recLumens - exLumens) / exLumens * 100) *
          recLampQty * recFixtureQty / totalCount,
        ),
      );

      // ── Lamp lifetimes ─────────────────────────────────────────────────
      const existingLifetime = toNum(exLamp, 'lifetime', 'Lifetime (hrs)') || 50000;
      const ledLifetime      = toNum(recLamp, 'l70Lifetime', 'L70 Lifetime (hours)') || 50000;

      const safeDaily  = daily  || 1;
      const safeOpDays = opDays || 1;
      const ealfq = existingLifetime / safeDaily / safeOpDays;
      const lalfq = ledLifetime      / safeDaily / safeOpDays;

      // ── Illuminance ─────────────────────────────────────────────────────
      illuminance += recLumens * recLampQty * recFixtureQty;

      // ── Labor hours ─────────────────────────────────────────────────────
      const exInstallHrs = toNum(exLamp, 'installationTime', 'Installation Time (hrs)');
      existingLaborHours +=
        (daily * opDays / (existingLifetime || 1)) *
        exInstallHrs * existingQty * lampPerFix;

      const recInstallMins = toNum(recLamp, 'installationTime', 'Approx. Installation Time (minutes)');
      ledLaborHours +=
        (daily * opDays / (ledLifetime || 1)) *
        recFixtureQty * (recInstallMins / 60) * recLampQty;

      // ── Mercury ─────────────────────────────────────────────────────────
      const mercuryPerSystem = toNum(exLamp, 'mercuryPerSystem', 'Mercury/System (mg)') || 1;
      mercury += mercuryPerSystem * ealfq;

      // ── kW: existing system ─────────────────────────────────────────────
      const lampWattage = parseFloat(luminaire.lampWattage ?? '0') || 0;
      if (lampWattage) {
        existingSystem += lampWattage * existingQty * lampPerFix / 1000;
      }

      // ── kW: LED system ──────────────────────────────────────────────────
      const recWattage = toNum(recLamp, 'wattage', 'Wattage');
      if (recWattage) {
        ledSystem += (recWattage / 1000) * recFixtureQty * recLampQty;
      }

      // ── Sensors ─────────────────────────────────────────────────────────
      const recControlDesc = toStr(recLamp, 'controlRecomendedDescription', 'controlDescription').toLowerCase();
      const lumControlDesc  = (luminaire.controlDescription ?? '').toLowerCase();
      const descForSensor   = recControlDesc || lumControlDesc;
      if (descForSensor.includes('sensor')) {
        sensorsYes++;
      } else {
        sensorsNo++;
      }

      // ── Color tunable ────────────────────────────────────────────────────
      const colorTunable = toStr(recLamp, 'colorTunable', 'Color Tunable');
      if (colorTunable === 'Yes') colorTunableYes.push(colorTunable);
      else if (colorTunable)    colorTunableNo.push(colorTunable);

      // ── Annual energy costs ─────────────────────────────────────────────
      const controlType    = (item.controlType ?? '').toLowerCase();
      const hasNoControl   = lumControlDesc.includes('none') || controlType.includes('wall switch');
      const dailyFactor    = hasNoControl ? daily : daily + daily / 100 * 25;
      const safeWatts      = lampWattage / 1000 || 1 / 1000;
      const safeRecWatts   = recWattage  / 1000 || 1 / 1000;

      const eaec =
        dailyFactor * existingQty * lampPerFix * safeWatts * (costKW || 1) * (opDays || 1);
      const laec =
        dailyFactor * recFixtureQty * recLampQty * safeRecWatts * (costKW || 1) * (opDays || 1);

      // ── ETA delivery ─────────────────────────────────────────────────────
      etaDay.push(toNum(recLamp, 'approxDeliveryDays', 'Approx. Delivery (days)'));

      // ── Existing replacement costs (PHP bug fixed: price resolved first) ─
      const lampPPU     = parseFloat(luminaire.lampPricePerUnit ?? '0') || 0;
      const exLampPPU   = toNum(exLamp, 'pricePerUnit', 'PPU ($)') || 1;
      const elrc        = ealfq * (lampPPU || exLampPPU);

      const powerPPU    = parseFloat(luminaire.powerPricePerUnit ?? '0') || 0;
      const exPowerLife = toNum(exPower, 'lifetime', 'Expected Lifetime (Hours)');
      const eapsbfq     = exPowerLife / safeDaily / safeOpDays;
      const exPowerPPU  = toNum(exPower, 'pricePerUnit', 'PPU ($)') || 0;
      const eapsbrc     = eapsbfq * (powerPPU || exPowerPPU);
      const etarc       = elrc + eapsbrc;

      // ── Existing annual labor cost (PHP bug fixed) ───────────────────────
      const exInstallMin = toNum(exLamp, 'installationTime', 'Installation Time (min)') / 60;
      const ealc = laborCost * (ealfq * exInstallMin + eapsbfq * exPowerPPU);
      const teac = eaec + etarc + ealc;

      // ── LED costs ────────────────────────────────────────────────────────
      const ll       = recFixtureQty * recLampQty * pricePerUnit;
      const llrc     = lalfq * pricePerUnit;
      const lapsbfq  = toNum(recPower, 'l70Lifetime', 'L70 Lifetime (hours)') / safeDaily / safeOpDays;
      const lapsbrc  = lapsbfq * pricePower;
      const lalc     = (laborCost || 1) * (lalfq * 0.5) + lapsbfq * pricePower;
      const ltarc    = llrc + lapsbrc;
      const tlac     = laec + ltarc + lalc;

      // ── Accumulate ───────────────────────────────────────────────────────
      el  += teac;
      llt += tlac;
      eaecTotal       += eaec;
      laecTotal       += laec;
      ledLuminairesPrice += ll;
      elrcTotal       += elrc;
      llrcTotal       += llrc;
    }

    infoCri.push({
      name: item.title ?? '',
      count: CriesLocal.reduce((s, v) => Math.round(s + v), 0),
      totalCount,
    });
    infoLumens.push({
      name: item.title ?? '',
      count: Lumens.reduce((s, v) => Math.round(s + v), 0),
      totalCount,
    });
  }

  // ── Weighted CRI / lumen averages ─────────────────────────────────────────

  function weightedAvg(items: AreaMetric[]): number {
    if (items.length <= 1) return items.reduce((s, i) => s + i.count, 0);
    const total = items.reduce((s, i) => s + i.totalCount, 0);
    return items.reduce((s, i) => s + (i.totalCount / (total || 1)) * i.count, 0);
  }

  const criRes    = weightedAvg(infoCri);
  const lumensRes = weightedAvg(infoLumens);

  // ── Ratios ────────────────────────────────────────────────────────────────

  const colorTunableTotal = colorTunableYes.length + colorTunableNo.length;
  const colorTunableRes   = colorTunableTotal > 0
    ? colorTunableYes.length / colorTunableTotal * 100
    : 0;

  const sensorTotal = sensorsYes + sensorsNo;
  const sensorRes   = sensorTotal > 0 ? sensorsYes / sensorTotal * 100 : 0;

  // ── Project total ─────────────────────────────────────────────────────────

  const shipping = options.shipping ?? 0;
  const installTotal =
    parseFloat(String((options.installation as Record<string, unknown> | null)?.total ?? '0').replace(',', '')) || 0;

  const taxAmount        = Math.round(ledLuminairesPrice / 100 * salesTax);
  const lightCountWaiver = lightCount === 'Yes Please' ? lightCuntWaiver * 0.01 : 0;
  const projectTotalLocal =
    taxAmount + shipping + ledLuminairesPrice + installTotal - lightCountWaiver;

  // ── Yearly energy ─────────────────────────────────────────────────────────

  let existingYearEnergySmall = 0;
  let ledYearEnergySmall      = 0;
  let existingYearEnergyBig   = 0;
  let ledYearEnergyBig        = 0;

  if (globalDaily !== 0) {
    existingYearEnergySmall = existingSystem * globalDaily * (opDays || 1);
    ledYearEnergySmall      = ledSystem      * globalDaily * (opDays || 1);
    energySavedEco          = existingYearEnergySmall - ledYearEnergySmall;
    existingYearEnergyBig   = existingYearEnergySmall * (costKW || 1);
    ledYearEnergyBig        = ledYearEnergySmall      * (costKW || 1);
  }

  if (energySavedEco !== 0) co2abated = 0.000709 * energySavedEco;

  // ── AC savings ────────────────────────────────────────────────────────────

  const hasOutdoor = applications.some((a) => a === 'Outdoor' || a === 'Garage');
  const hasIndoor  = applications.some((a) => a === 'Indoor');
  if (hasOutdoor) acSavings = 0;
  if (hasIndoor) {
    acSavings = (costKW || 1) * (HOT_STATES.has(state) ? 0.1782 : 0.1254) * energySavedEco;
  }

  // ── Financial metrics ─────────────────────────────────────────────────────

  const annualSavings   = (eaecTotal - laecTotal) + (elrcTotal - llrcTotal);
  const roi             = 100 * ((annualSavings * 10 - projectTotalLocal) / (projectTotalLocal || 1));
  const payback         = projectTotalLocal / (((eaecTotal - laecTotal) || 1) + (elrcTotal - llrcTotal));
  const npvAnnualInput  = (eaecTotal + elrcTotal) - (llrcTotal + laecTotal);
  const npvVal          = npv10(npvAnnualInput, projectTotalLocal);

  // ── Top-3 areas by combined CRI+lumen significance ───────────────────────

  const merged = infoCri
    .map((c) => {
      const l = infoLumens.find((i) => i.name === c.name);
      return { name: c.name, totalCount: c.totalCount, sumCount: c.count + (l?.count ?? 0) };
    })
    .sort((a, b) => b.sumCount - a.sumCount);

  const top3Names = merged.slice(0, 3).map((i) => i.name);
  const filteredCri    = top3Names.map((n) => infoCri.find((i)    => i.name === n)!).filter(Boolean);
  const filteredLumens = top3Names.map((n) => infoLumens.find((i) => i.name === n)!).filter(Boolean);

  // ── Result ────────────────────────────────────────────────────────────────

  return {
    addedLumens:           Math.round(recomLedQtyGlobal - existingLedQtyGlobal),
    lumenIncrease:         lumensIncrease,
    lumenIncreaseSqFt:     (recomLedQtyGlobal - existingLedQtyGlobal) / (lightCuntWaiver || 1),
    lumenIncreaseFixture:  (recomLedQtyGlobal - existingLedQtyGlobal) / (existingLedGlobalQties || 1),
    existingSystem:        fmtNum(existingSystem),
    ledSystem:             fmtNum(ledSystem),
    energySaved:           fmtNum(existingSystem - ledSystem),
    existingYearEnergySmall: Math.round(existingYearEnergySmall),
    ledYearEnergySmall:      Math.round(ledYearEnergySmall),
    energySavedEco:          Math.round(energySavedEco),
    existingYearEnergyBig:   Math.round(existingYearEnergyBig),
    ledYearEnergyBig:        Math.round(ledYearEnergyBig),
    daily:                 Math.round(globalDaily),
    criGlobal:             Math.round(criRes),
    lumensGlobal:          Math.round(lumensRes),
    cri:                   filteredCri,
    lumens:                filteredLumens,
    mercuryAbated:         Math.round(mercury),
    existingLaborHours:    Math.round(existingLaborHours),
    ledLaborHours:         Math.round(ledLaborHours),
    roi:                   Math.round(roi),
    etaDay:                etaDay.length > 0 ? Math.max(...etaDay) : 0,
    payback,
    existingLuminairesCost: Math.round(el),
    ledLuminairesCost:      Math.round(llt),
    ledLuminaires:          Math.round(ledLuminairesPrice),
    tax:                   taxAmount,
    lightCountWaiver,
    savings10:             Math.round(el * 10 - llt * 10),
    yearOneExisting:       Math.round(el),
    yearThreeExisting:     Math.round(el * 3),
    yearFiveExisting:      Math.round(el * 5),
    yearOneLed:            Math.round(llt),
    yearThreeLed:          Math.round(llt * 3),
    yearFiveLed:           Math.round(llt * 5),
    reportNpv:             Math.round(npvVal),
    sensor:                Math.round(sensorRes),
    colorTunable:          Math.round(colorTunableRes),
    co2Abated:             Math.round(co2abated),
    acSavings:             Math.round(acSavings),
    projectTotal:          Math.round(projectTotalLocal),
    annualSavings:         Math.round(annualSavings),
  };
}
