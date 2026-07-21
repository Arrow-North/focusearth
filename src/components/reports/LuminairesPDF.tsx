import { useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ReportPDFPage } from './ReportPDFPage';
import { PAGE_WIDTH_PX } from './pdfLayout';

interface LuminairePair {
  existing: string;
  recommended: string;
}

interface LuminaireAreaRow {
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
  luminaires: readonly LuminairePair[];
}

// Matches ReportPDFPage's p-10 (40px each side) so measured widths equal rendered widths.
const CONTENT_WIDTH_PX = PAGE_WIDTH_PX - 80;

// Static print version of the live tab's LumRow — no Print/Download buttons, they're interactive UI chrome.
function LumRow({ pair }: { pair: LuminairePair }) {
  return (
    <div className="grid grid-cols-2 gap-4" style={{ paddingBottom: 16 }}>
      <div className="border border-gray-200 rounded p-3 text-base text-gray-700 leading-snug">
        {pair.existing || '—'}
      </div>
      <div className="border border-[#619c48] rounded p-3 text-base text-[#619c48] leading-snug text-center">
        {pair.recommended || '—'}
      </div>
    </div>
  );
}

const AREA_DETAIL_FIELDS = (area: LuminaireAreaRow) => [
  { label: 'Ceiling Height:',      value: area.ceilingHeight },
  { label: 'Daily Usage:',         value: area.dailyUsage },
  { label: 'Control Type:',        value: area.controlType },
  { label: 'Application:',         value: area.application },
  { label: 'Voltage:',             value: area.voltage },
  { label: 'Area (sq.ft.):',       value: area.areaSqFt },
  { label: 'Installation Surface:', value: area.installationSurface },
  { label: 'Ingress Protection:',  value: area.ingressProtection },
];

function IntroBlock() {
  return (
    <div style={{ paddingBottom: 32 }}>
      <p className="text-gray-900 text-base leading-relaxed mb-2">
        This page details the existing lighting components that can be recycled and the
        recommended upgrades that can replace them. Use the following notation to quickly
        review the luminaire descriptions:
      </p>
      <p className="text-base font-bold">
        [Fixture QTY] Fixture Description (Lamp QTY) Component Descriptions {'{'}Mounting Height{'}'}
      </p>
    </div>
  );
}

function TotalsHeaderBlock() {
  return (
    <div>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <p className="text-center text-lg font-bold tracking-widest uppercase text-gray-400 border-b-2 border-gray-300 pb-2">
          Existing Components
        </p>
        <p className="text-center text-lg font-bold tracking-widest uppercase text-[#619c48] border-b-2 border-[#619c48] pb-2">
          Recommended Components
        </p>
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-4">Totals</h3>
    </div>
  );
}

function AreaHeaderBlock({ area }: { area: LuminaireAreaRow }) {
  return (
    <div style={{ paddingTop: 32, paddingBottom: 16 }}>
      <h3 className="text-xl font-bold text-gray-900 mb-4">{area.name}</h3>
      <div className="border border-[#2c628d] p-4 text-base">
        <div className="grid grid-cols-4 gap-x-6 gap-y-2 mb-2">
          {AREA_DETAIL_FIELDS(area).map(({ label, value }) => (
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
    </div>
  );
}

// One indivisible chunk — a lead block (header) stays glued to the block after it, never orphaned at a page bottom.
interface LuminaireBlock {
  key: string;
  lead: boolean;
  node: ReactNode;
}

function buildBlocks(allLuminaires: readonly LuminairePair[], luminaireAreas: readonly LuminaireAreaRow[]): LuminaireBlock[] {
  const blocks: LuminaireBlock[] = [{ key: 'intro', lead: false, node: <IntroBlock /> }];

  blocks.push({ key: 'totals-header', lead: true, node: <TotalsHeaderBlock /> });
  if (allLuminaires.length > 0) {
    allLuminaires.forEach((pair, i) => blocks.push({ key: `totals-row-${i}`, lead: false, node: <LumRow pair={pair} /> }));
  } else {
    blocks.push({ key: 'totals-empty', lead: false, node: <p className="text-base text-gray-400">No luminaire data available.</p> });
  }

  luminaireAreas.forEach((area, aIdx) => {
    blocks.push({ key: `area-${aIdx}-header`, lead: true, node: <AreaHeaderBlock area={area} /> });
    area.luminaires.forEach((pair, i) => blocks.push({ key: `area-${aIdx}-row-${i}`, lead: false, node: <LumRow pair={pair} /> }));
  });

  return blocks;
}

// Greedily fills each page; starts a new one once the next block (or glued pair) no longer fits.
function paginateBlocks(blocks: LuminaireBlock[], heights: Map<string, number>, budgetPx: number): LuminaireBlock[][] {
  const pages: LuminaireBlock[][] = [[]];
  let used = 0;
  blocks.forEach((block, i) => {
    const height = heights.get(block.key) ?? 0;
    const next = blocks[i + 1];
    const glueHeight = block.lead && next ? (heights.get(next.key) ?? 0) : 0;
    if (used > 0 && used + height + glueHeight > budgetPx) {
      pages.push([]);
      used = 0;
    }
    pages[pages.length - 1].push(block);
    used += height;
  });
  return pages;
}

/** Measures Luminaires content off-screen and splits it into as many pages as it actually needs. */
export function useLuminairesPagination(allLuminaires: readonly LuminairePair[], luminaireAreas: readonly LuminaireAreaRow[]) {
  const blocks = buildBlocks(allLuminaires, luminaireAreas);
  const blockRefs = useRef(new Map<string, HTMLDivElement | null>());
  const budgetRef = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<LuminaireBlock[][] | null>(null);

  useLayoutEffect(() => {
    const heights = new Map<string, number>();
    blocks.forEach((block) => {
      const el = blockRefs.current.get(block.key);
      if (el) heights.set(block.key, el.getBoundingClientRect().height);
    });
    const budget = budgetRef.current?.getBoundingClientRect().height ?? 0;
    setPages(budget > 0 ? paginateBlocks(blocks, heights, budget) : [blocks]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allLuminaires, luminaireAreas]);

  const measurer = (
    <div aria-hidden style={{ position: 'fixed', top: 0, left: '-9999px', width: CONTENT_WIDTH_PX, pointerEvents: 'none', zIndex: -1 }}>
      {blocks.map((block) => (
        <div key={block.key} ref={(el) => blockRefs.current.set(block.key, el)}>{block.node}</div>
      ))}
      {/* Empty dummy page — contentRef measures its own content wrapper's real rendered height, the true per-page budget (header/footer/padding), instead of guessing it. */}
      <ReportPDFPage title="Luminaire Upgrades" companyName="" pageNumber={0} contentRef={budgetRef}>
        {null}
      </ReportPDFPage>
    </div>
  );

  return { pages, measurer };
}

export interface LuminairesPDFProps {
  companyName: string;
  basePageNumber: number;
  pages: LuminaireBlock[][];
}

export function LuminairesPDF({ companyName, basePageNumber, pages }: LuminairesPDFProps) {
  return (
    <>
      {pages.map((pageBlocks, i) => (
        <ReportPDFPage key={i} title="Luminaire Upgrades" companyName={companyName} pageNumber={basePageNumber + i}>
          <div style={{ width: CONTENT_WIDTH_PX }}>
            {pageBlocks.map((block) => <div key={block.key}>{block.node}</div>)}
          </div>
        </ReportPDFPage>
      ))}
    </>
  );
}
