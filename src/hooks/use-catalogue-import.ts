import { useCallback, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import {
  autoDetectMapping,
  cellUrl,
  listSheets,
  parseTabularFile,
  validateTabularFile,
} from '@/lib/catalogue-import/tabular-parser';
import { classifyUrl, normalizeUrl } from '@/lib/catalogue-import/link-classifier';
import { downloadCsv } from '@/lib/catalogue-import/csv';
import {
  buildErrorCsv,
  buildOutputCsv,
  emptyResolved,
} from '@/lib/catalogue-import/output';
import {
  errorReportFilename,
  outputFilename,
  slugify,
} from '@/lib/catalogue-import/storage-paths';
import {
  CHECKPOINT_KEY,
  DEFAULT_IMPORT_CONFIG,
  FETCH_FAILED,
  LUMINAIRE_TYPE_SLUGS,
  RESOLVE_FUNCTION,
} from '@/lib/catalogue-import/constants';
import { ASSET_FIELDS } from '@/types/catalogue-import';
import { catalogueRequest } from '@/lib/led-import/catalogue-api';
import { isDropboxUrl } from '@/lib/led-import/catalogue-parser';
import { repositoryKey, repositoryNeedsChoice, type RepositoryLink, type RepositoryReview } from '@/lib/catalogue-import/repository-review';
import type { AssetCandidate } from '@/lib/led-import/import-review';
import type {
  AssetField,
  Classification,
  ColumnMapping,
  ImportConfig,
  ImportFailure,
  ImportPhase,
  ImportProgressState,
  ImportRow,
  LuminaireType,
  ParsedTable,
  ResolveRequestItem,
  ResolveResponse,
  ResolveResultItem,
  SheetSummary,
} from '@/types/catalogue-import';

/** One asset to resolve: a single (row, field) pair carrying a URL. */
interface AssetTask {
  rowIndex: number;
  productId: string;
  field: AssetField;
  url: string;
  normalized: string;
}

/** Cached outcome for a normalized URL, reused across rows and across runs. */
interface CachedOutcome {
  status: ResolveResultItem['status'];
  publicUrl: string | null;
  classification: ResolveResultItem['classification'];
  httpStatus: number | null;
  error: string | null;
}

const emptyMapping: ColumnMapping = {
  specifications: null,
  installationInstructions: null,
  productImage: null,
};

function initialProgress(): ImportProgressState {
  return {
    phase: 'configuring',
    rowsTotal: 0,
    rowsCompleted: 0,
    assetsTotal: 0,
    assetsCompleted: 0,
    uploaded: 0,
    imageRepos: 0,
    skipped: 0,
    failed: 0,
    cacheHits: 0,
    currentLabel: null,
    startedAt: null,
    failures: [],
  };
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function useCatalogueImport(config: ImportConfig = DEFAULT_IMPORT_CONFIG) {
  // ─── Configuration ────────────────────────────────────────────────────────
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [luminaireType, setLuminaireType] = useState<LuminaireType | null>(null);

  // ─── Source file ──────────────────────────────────────────────────────────
  const [file, setFile] = useState<File | null>(null);
  const [sheets, setSheets] = useState<SheetSummary[]>([]);
  const [table, setTable] = useState<ParsedTable | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>(emptyMapping);

  // ─── Job ──────────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<ImportPhase>('configuring');
  const [progress, setProgress] = useState<ImportProgressState>(initialProgress);
  const [disambiguateHeaders, setDisambiguateHeaders] = useState(false);
  const [dedupeAssets, setDedupeAssets] = useState(true);

  // Rows are mutated at high frequency during a run; the ref is the source of
  // truth and state is synced at batch boundaries to avoid re-rendering per asset.
  const rowsRef = useRef<ImportRow[]>([]);
  const [rowsVersion, setRowsVersion] = useState(0);
  const [repositoryReviews, setRepositoryReviews] = useState<Record<string, RepositoryReview>>({});
  const [detectedRepositories, setDetectedRepositories] = useState<Set<string>>(new Set());
  const [discoveringRepositories, setDiscoveringRepositories] = useState(false);
  const repositoryDiscoveryActive = useRef(false);
  const reviewGeneration = useRef(0);
  const runActive = useRef(false);
  const discoveryCache = useRef(new Map<string, Promise<{ candidates: AssetCandidate[]; sourceType: 'file' | 'folder' }>>());

  const pausedRef = useRef(false);
  const cancelledRef = useRef(false);
  const failuresRef = useRef<ImportFailure[]>([]);
  const cacheRef = useRef<Map<string, CachedOutcome>>(new Map());

  const invalidateReview = useCallback(() => {
    reviewGeneration.current++;
    rowsRef.current = [];
    cacheRef.current.clear(); discoveryCache.current.clear();
    repositoryDiscoveryActive.current = false;
    setDiscoveringRepositories(false);
    setRepositoryReviews({}); setDetectedRepositories(new Set());
  }, []);

  const companySlug = useMemo(
    () => (companyName ? slugify(companyName) : ''),
    [companyName],
  );
  const typeSlug = useMemo(
    () => (luminaireType ? LUMINAIRE_TYPE_SLUGS[luminaireType] : ''),
    [luminaireType],
  );

  // ─── Checkpoint (resolved-URL cache survives a reload) ────────────────────

  const checkpointKey = useCallback(() => {
    if (!file || !companySlug || !typeSlug) return null;
    return `${CHECKPOINT_KEY}:${companySlug}:${typeSlug}:${file.name}:${file.size}`;
  }, [file, companySlug, typeSlug]);

  const saveCheckpoint = useCallback(() => {
    const key = checkpointKey();
    if (!key) return;
    try {
      const entries = Array.from(cacheRef.current.entries());
      localStorage.setItem(key, JSON.stringify(entries));
    } catch {
      // Quota or private mode: a lost checkpoint is survivable, keep going.
    }
  }, [checkpointKey]);

  const loadCheckpoint = useCallback(() => {
    const key = checkpointKey();
    if (!key) return 0;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return 0;
      const entries = JSON.parse(raw) as [string, CachedOutcome][];
      const reusable = entries.filter(([, value]) => value.status === 'uploaded' && value.classification !== 'IMAGE_REPO');
      reusable.forEach(([key, value]) => cacheRef.current.set(key, value));
      return reusable.length;
    } catch {
      return 0;
    }
  }, [checkpointKey]);

  const clearCheckpoint = useCallback(() => {
    const key = checkpointKey();
    if (!key) return;
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }, [checkpointKey]);

  // ─── File intake ──────────────────────────────────────────────────────────

  const selectFile = useCallback(async (next: File): Promise<boolean> => {
    const validation = validateTabularFile(next);
    if (!validation.valid) {
      toast.error(validation.error);
      return false;
    }

    invalidateReview();
    const generation = reviewGeneration.current;
    setPhase('uploading');
    try {
      const sheetList = await listSheets(next);
      const parsed = await parseTabularFile(next, {
        sheetName: sheetList[0]?.name,
      });

      if (generation !== reviewGeneration.current) return false;
      setFile(next);
      setSheets(sheetList);
      setTable(parsed);
      setMapping(autoDetectMapping(parsed.headers));
      setPhase('mapping');
      return true;
    } catch (err) {
      if (generation !== reviewGeneration.current) return false;
      const message = err instanceof Error ? err.message : 'Failed to parse file';
      toast.error(message);
      setPhase('uploading');
      return false;
    }
  }, [invalidateReview]);

  /** Re-parse when the user picks a different sheet or header row. */
  const reparse = useCallback(
    async (opts: { sheetName?: string; headerRowIndex?: number }) => {
      if (!file || !table) return;
      invalidateReview();
      const generation = reviewGeneration.current;
      try {
        const parsed = await parseTabularFile(file, {
          sheetName: opts.sheetName ?? table.sheetName ?? undefined,
          headerRowIndex: opts.headerRowIndex ?? table.headerRowIndex,
        });
        if (generation !== reviewGeneration.current) return;
        setTable(parsed);
        setMapping(autoDetectMapping(parsed.headers));
      } catch (err) {
        if (generation !== reviewGeneration.current) return;
        toast.error(err instanceof Error ? err.message : 'Failed to re-parse');
      }
    },
    [file, table, invalidateReview],
  );

  const repositoryLinks = useMemo((): RepositoryLink[] => {
    if (!table) return [];
    return table.rows.flatMap((_, rowIndex) => ASSET_FIELDS.flatMap(field => {
      const column = mapping[field];
      const url = column == null ? null : cellUrl(table, rowIndex, column);
      const key = repositoryKey(rowIndex, field);
      if (!url || (classifyUrl(url).kind !== 'IMAGE_REPO' && !detectedRepositories.has(key))) return [];
      return [{ key, rowIndex, field, url, sourceRow: table.sourceRowNumbers[rowIndex] }];
    }));
  }, [table, mapping, detectedRepositories]);
  const repositoryChoicesNeeded = repositoryLinks.filter(link => repositoryNeedsChoice(repositoryReviews[link.key])).length;

  const discoverRepositories = useCallback(async (onlyKey?: string, onlyUndiscovered = false) => {
    if (repositoryDiscoveryActive.current) return;
    if (!onlyKey && !onlyUndiscovered) discoveryCache.current.clear();
    repositoryDiscoveryActive.current = true; setDiscoveringRepositories(true);
    const generation = reviewGeneration.current;
    try {
      for (const link of repositoryLinks.filter(item => (!onlyKey || item.key === onlyKey) && (!onlyUndiscovered || !repositoryReviews[item.key]?.discovered))) {
        if (generation !== reviewGeneration.current) return;
        const kind = link.field === 'productImage' ? 'image' : 'document';
        const cacheKey = `${kind}:${link.url}`;
        if (onlyKey) discoveryCache.current.delete(cacheKey);
        try {
          if (!isDropboxUrl(link.url)) throw new Error('Only public Dropbox file and folder collections are supported. Choose None of these to leave this field empty.');
          let request = discoveryCache.current.get(cacheKey);
          if (!request) {
            request = catalogueRequest({ action: 'discover', url: link.url, kind, legacy: true });
            discoveryCache.current.set(cacheKey, request);
            request.catch(() => { if (generation === reviewGeneration.current && discoveryCache.current.get(cacheKey) === request) discoveryCache.current.delete(cacheKey); });
          }
          const result = await request;
          if (generation !== reviewGeneration.current) return;
          setRepositoryReviews(current => ({ ...current, [link.key]: {
            discovered: true, candidates: result.candidates,
            declined: current[link.key]?.declined,
            selectedId: current[link.key]?.declined ? undefined
              : result.candidates.some(candidate => candidate.id === current[link.key]?.selectedId) ? current[link.key].selectedId
              : result.sourceType === 'file' && result.candidates.length === 1 ? result.candidates[0].id : undefined,
            error: result.candidates.length ? undefined : 'No eligible files are available. Choose None of these or retry discovery.',
          } }));
        } catch (error) {
          if (generation !== reviewGeneration.current) return;
          setRepositoryReviews(current => ({ ...current, [link.key]: {
            discovered: true, candidates: [], declined: current[link.key]?.declined,
            error: error instanceof Error ? error.message : 'Collection is unavailable. Retry or choose None of these.',
          } }));
        }
      }
    } finally {
      if (generation === reviewGeneration.current) { repositoryDiscoveryActive.current = false; setDiscoveringRepositories(false); }
    }
  }, [repositoryLinks, repositoryReviews]);

  const chooseRepositoryFile = useCallback((key: string, candidateId?: string) => {
    setRepositoryReviews(current => ({ ...current, [key]: {
      ...current[key], candidates: current[key]?.candidates || [], discovered: current[key]?.discovered || false,
      selectedId: candidateId, declined: !candidateId, error: candidateId ? undefined : current[key]?.error,
    } }));
  }, []);

  // ─── Row construction ─────────────────────────────────────────────────────

  /** Assign a UUID per source row. Every data row gets one, links or not. */
  const buildRows = useCallback((): ImportRow[] => {
    if (!table) return [];
    return table.rows.map((values, i) => ({
      // Real 1-based sheet row. Blank rows are dropped during parsing, so
      // deriving this arithmetically would drift and misdirect the error report.
      sourceRow: table.sourceRowNumbers?.[i] ?? table.headerRowIndex + 2 + i,
      productId: crypto.randomUUID(),
      values,
      resolved: emptyResolved(),
    }));
  }, [table]);

  /** Classifications for the preview sample (layers 1-2 only, no network). */
  const previewClassifications = useMemo(() => {
    if (!table) return [];
    const sample = table.rows.slice(0, 10);
    return sample.map((_, i) => {
      const out: Partial<Record<AssetField, Classification | null>> = {};
      ASSET_FIELDS.forEach((field) => {
        const col = mapping[field];
        if (col == null) {
          out[field] = null;
          return;
        }
        const url = cellUrl(table, i, col);
        out[field] = url ? classifyUrl(url) : null;
      });
      return out;
    });
  }, [table, mapping]);

  const fillRates = useMemo(() => {
    const rates: Record<AssetField, number> = {
      specifications: 0,
      installationInstructions: 0,
      productImage: 0,
    };
    if (!table || table.rows.length === 0) return rates;
    ASSET_FIELDS.forEach((field) => {
      const col = mapping[field];
      if (col == null) return;
      let filled = 0;
      for (let i = 0; i < table.rows.length; i++) {
        if (cellUrl(table, i, col)) filled++;
      }
      rates[field] = filled / table.rows.length;
    });
    return rates;
  }, [table, mapping]);

  const estimates = useMemo(() => {
    if (!table) return { fetches: 0, repos: 0 };
    let fetches = 0;
    let repos = 0;
    const seen = new Set<string>();
    for (let i = 0; i < table.rows.length; i++) {
      for (const field of ASSET_FIELDS) {
        const col = mapping[field];
        if (col == null) continue;
        const url = cellUrl(table, i, col);
        if (!url) continue;
        const cls = classifyUrl(url);
        if (cls.kind === 'IMAGE_REPO') {
          repos++;
          continue;
        }
        const key = normalizeUrl(url);
        if (dedupeAssets && seen.has(key)) continue;
        seen.add(key);
        fetches++;
      }
    }
    return { fetches, repos };
  }, [table, mapping, dedupeAssets]);

  const goToPreview = useCallback(() => {
    if (rowsRef.current.length === 0) rowsRef.current = buildRows();
    setRowsVersion((v) => v + 1);
    setPhase('previewing');
  }, [buildRows]);

  // ─── The run ──────────────────────────────────────────────────────────────

  const applyOutcome = useCallback(
    (task: AssetTask, outcome: CachedOutcome, counters: ImportProgressState) => {
      const row = rowsRef.current[task.rowIndex];
      if (!row) return;

      switch (outcome.status) {
        case 'uploaded':
          row.resolved[task.field] = outcome.publicUrl ?? FETCH_FAILED;
          counters.uploaded++;
          break;
        case 'image_repo':
          // Collection responses are handled by the review flow before this function.
          return;
        case 'skipped':
          row.resolved[task.field] = '';
          counters.skipped++;
          break;
        case 'failed':
        default:
          row.resolved[task.field] = FETCH_FAILED;
          counters.failed++;
          failuresRef.current.push({
            sourceRow: row.sourceRow,
            productId: row.productId,
            field: task.field,
            originalUrl: task.url,
            classification: outcome.classification,
            httpStatus: outcome.httpStatus,
            message: outcome.error ?? 'Unknown error',
          });
          break;
      }
      counters.assetsCompleted++;
    },
    [],
  );

  const invokeBatch = useCallback(
    async (items: ResolveRequestItem[]): Promise<ResolveResultItem[]> => {
      let lastError = 'Unknown error';

      for (let attempt = 0; attempt < config.retryAttempts; attempt++) {
        const { data, error } = await supabase.functions.invoke<ResolveResponse>(
          RESOLVE_FUNCTION,
          { body: { companySlug, luminaireType: typeSlug, items } },
        );

        if (!error && data?.results) return data.results;

        lastError = error?.message ?? 'Malformed response from resolve-led-asset';
        if (attempt < config.retryAttempts - 1) {
          await sleep(config.retryDelayMs * Math.pow(2, attempt));
        }
      }

      // The whole invocation failed; mark every item in it rather than losing them.
      return items.map((item) => ({
        productId: item.productId,
        field: item.field,
        status: 'failed' as const,
        publicUrl: null,
        classification: 'UNKNOWN' as const,
        httpStatus: null,
        bytes: null,
        error: lastError,
        cached: false,
        objectKey: null,
      }));
    },
    [companySlug, typeSlug, config.retryAttempts, config.retryDelayMs],
  );

  const startImport = useCallback(async () => {
    if (runActive.current) return;
    if (!table || !companySlug || !typeSlug) {
      toast.error('Select a company and luminaire type first');
      return;
    }

    if (repositoryChoicesNeeded || discoveringRepositories) {
      toast.error('Choose a file or None of these for every collection link first.');
      setPhase('previewing');
      return;
    }
    runActive.current = true;
    pausedRef.current = false;
    cancelledRef.current = false;
    failuresRef.current = [];

    if (rowsRef.current.length === 0) rowsRef.current = buildRows();
    const rows = rowsRef.current;

    const restored = loadCheckpoint();
    if (restored > 0) {
      toast.info(`Resuming: ${restored} previously resolved assets reused`);
    }

    // Build the task list. A row with no links still exists in the output.
    const tasks: AssetTask[] = [];
    rows.forEach((row, rowIndex) => {
      ASSET_FIELDS.forEach((field) => {
        const col = mapping[field];
        if (col == null) {
          row.resolved[field] = '';
          return;
        }
        const url = cellUrl(table, rowIndex, col);
        if (!url) {
          row.resolved[field] = '';
          return;
        }
        tasks.push({
          rowIndex,
          productId: row.productId,
          field,
          url,
          normalized: normalizeUrl(url),
        });
      });
    });

    // Group by normalized URL so a repeated asset is fetched and stored once.
    const groups = new Map<string, AssetTask[]>();
    tasks.forEach((t) => {
      const choice = repositoryReviews[repositoryKey(t.rowIndex, t.field)];
      const key = choice ? `repository:${t.productId}:${t.field}:${choice.declined ? 'none' : choice.selectedId}`
        : dedupeAssets ? t.normalized : `${t.normalized}#${t.productId}#${t.field}`;
      const existing = groups.get(key);
      if (existing) existing.push(t);
      else groups.set(key, [t]);
    });

    const counters: ImportProgressState = {
      ...initialProgress(),
      phase: 'processing',
      rowsTotal: rows.length,
      assetsTotal: tasks.length,
      imageRepos: repositoryLinks.length,
      startedAt: Date.now(),
    };

    setPhase('processing');
    setProgress({ ...counters });

    // Anything already in the cache resolves with no network at all.
    const pending: { key: string; group: AssetTask[] }[] = [];
    groups.forEach((group, key) => {
      const cached = cacheRef.current.get(key);
      if (cached && (cached.status === 'uploaded' || cached.status === 'skipped')) {
        group.forEach((t) => {
          applyOutcome(t, cached, counters);
          counters.cacheHits++;
        });
      } else {
        pending.push({ key, group });
      }
    });

    const selectedRepositories: { key: string; group: AssetTask[] }[] = [];
    const needsNetwork: { key: string; group: AssetTask[] }[] = [];
    pending.forEach(entry => {
      const task = entry.group[0];
      if (repositoryReviews[repositoryKey(task.rowIndex, task.field)]) selectedRepositories.push(entry);
      else needsNetwork.push(entry);
    });

    setProgress({ ...counters, failures: [...failuresRef.current] });

    // Chunk the unique URLs into edge-function invocations.
    const batches: { key: string; group: AssetTask[] }[][] = [];
    for (let i = 0; i < needsNetwork.length; i += config.batchSize) {
      batches.push(needsNetwork.slice(i, i + config.batchSize));
    }

    let lateRepositories = false;
    let repositorySaveFailed = false;
    let batchCursor = 0;
    let sinceCheckpoint = 0;

    const worker = async () => {
      for (;;) {
        while (pausedRef.current && !cancelledRef.current) await sleep(150);
        if (cancelledRef.current) return;

        const index = batchCursor++;
        if (index >= batches.length) return;
        const batch = batches[index];

        const items: ResolveRequestItem[] = batch.map(({ group }) => ({
          productId: group[0].productId,
          field: group[0].field,
          url: group[0].url,
        }));

        const results = await invokeBatch(items);

        results.forEach((result, i) => {
          const entry = batch[i];
          if (!entry) return;
          if (result.status === 'image_repo') {
            lateRepositories = true;
            setDetectedRepositories(current => new Set([...current, ...entry.group.map(task => repositoryKey(task.rowIndex, task.field))]));
            cacheRef.current.delete(entry.key);
            return;
          }
          const outcome: CachedOutcome = {
            status: result.status,
            publicUrl: result.publicUrl,
            classification: result.classification,
            httpStatus: result.httpStatus,
            error: result.error,
          };
          if (outcome.status === 'uploaded') cacheRef.current.set(entry.key, outcome);
          entry.group.forEach((t, gi) => {
            applyOutcome(t, outcome, counters);
            if (gi > 0) counters.cacheHits++;
          });
        });

        counters.currentLabel = `Batch ${Math.min(index + 1, batches.length)} of ${batches.length}`;
        setProgress({ ...counters, failures: [...failuresRef.current] });

        sinceCheckpoint += batch.length;
        if (sinceCheckpoint >= 10) {
          sinceCheckpoint = 0;
          saveCheckpoint();
        }
      }
    };

    try {
      for (const entry of selectedRepositories) {
        while (pausedRef.current && !cancelledRef.current) await sleep(150);
        if (cancelledRef.current) break;
        const task = entry.group[0];
        const key = repositoryKey(task.rowIndex, task.field);
        const review = repositoryReviews[key];
        let outcome: CachedOutcome;
        if (review.declined) outcome = { status: 'skipped', publicUrl: null, classification: 'IMAGE_REPO', httpStatus: null, error: null };
        else {
          try {
            const result = await catalogueRequest<{ publicUrl: string }>({
              action: 'store-asset', companyId, luminaireType: typeSlug,
              productId: task.productId, field: task.field, url: task.url, candidateId: review.selectedId,
            });
            outcome = { status: 'uploaded', publicUrl: result.publicUrl, classification: 'IMAGE', httpStatus: null, error: null };
          } catch (error) {
            repositorySaveFailed = true;
            const message = error instanceof Error ? error.message : 'Selected file could not be saved. Retry or choose another file.';
            setRepositoryReviews(current => ({ ...current, [key]: { ...current[key], error: message } }));
            outcome = { status: 'failed', publicUrl: null, classification: 'IMAGE_REPO', httpStatus: null, error: message };
          }
        }
        if (outcome.status !== 'failed') cacheRef.current.set(entry.key, outcome);
        entry.group.forEach(task => applyOutcome(task, outcome, counters));
        setProgress({ ...counters, failures: [...failuresRef.current] });
      }
      await Promise.all(
        Array.from({ length: Math.min(config.concurrency, Math.max(batches.length, 1)) }, worker),
      );

      if ((lateRepositories || repositorySaveFailed) && !cancelledRef.current) {
        counters.phase = 'previewing'; counters.currentLabel = null;
        saveCheckpoint(); setRowsVersion(value => value + 1);
        setProgress({ ...counters, failures: [...failuresRef.current] }); setPhase('previewing');
        toast.info(lateRepositories ? 'A linked URL is a collection. Review each collection and choose a file or None of these.' : 'A selected file could not be saved. Retry or change its selection.');
        return;
      }
      counters.rowsCompleted = rows.length;
      counters.currentLabel = null;
      counters.phase = cancelledRef.current ? 'cancelled' : 'completed';

      saveCheckpoint();
      setRowsVersion((v) => v + 1);
      setProgress({ ...counters, failures: [...failuresRef.current] });
      setPhase(counters.phase);

      if (cancelledRef.current) {
        toast.warning('Import cancelled — a partial CSV is still available');
      } else if (counters.failed > 0) {
        toast.warning(`Completed with ${counters.failed} failures`);
      } else {
        toast.success('Import completed');
        clearCheckpoint();
      }
    } catch (err) {
      counters.phase = 'error';
      setProgress({ ...counters, failures: [...failuresRef.current] });
      setPhase('error');
      toast.error(err instanceof Error ? err.message : 'Import failed');
    } finally { runActive.current = false; }
  }, [
    table, companySlug, typeSlug, mapping, dedupeAssets, buildRows,
    loadCheckpoint, saveCheckpoint, clearCheckpoint, applyOutcome, invokeBatch,
    config.batchSize, config.concurrency, repositoryReviews, repositoryChoicesNeeded, discoveringRepositories, companyId, repositoryLinks.length,
  ]);

  // ─── Controls ─────────────────────────────────────────────────────────────

  const pauseImport = useCallback(() => {
    pausedRef.current = true;
    setPhase('paused');
    setProgress((p) => ({ ...p, phase: 'paused' }));
  }, []);

  const resumeImport = useCallback(() => {
    pausedRef.current = false;
    setPhase('processing');
    setProgress((p) => ({ ...p, phase: 'processing' }));
  }, []);

  const cancelImport = useCallback(() => {
    cancelledRef.current = true;
    pausedRef.current = false;
  }, []);

  // ─── Downloads ────────────────────────────────────────────────────────────

  const downloadOutput = useCallback(() => {
    if (!table) return;
    const csv = buildOutputCsv(table.headers, rowsRef.current, disambiguateHeaders);
    downloadCsv(outputFilename(companySlug, typeSlug), csv);
  }, [table, companySlug, typeSlug, disambiguateHeaders]);

  const downloadErrors = useCallback(() => {
    const csv = buildErrorCsv(failuresRef.current);
    downloadCsv(errorReportFilename(companySlug, typeSlug), csv);
  }, [companySlug, typeSlug]);

  const reset = useCallback(() => {
    pausedRef.current = false;
    cancelledRef.current = false;
    invalidateReview();
    failuresRef.current = [];
    setFile(null);
    setSheets([]);
    setTable(null);
    setMapping(emptyMapping);
    setProgress(initialProgress());
    setPhase('configuring');
    setRowsVersion((v) => v + 1);
  }, [invalidateReview]);

  return {
    // config
    companyId, companyName, luminaireType, companySlug, typeSlug,
    setCompany: (id: number, name: string) => { if (id !== companyId || name !== companyName) invalidateReview(); setCompanyId(id); setCompanyName(name); },
    setLuminaireType: (value: LuminaireType) => { if (value !== luminaireType) invalidateReview(); setLuminaireType(value); },
    // file
    file, sheets, table, mapping, setMapping: (next: ColumnMapping) => { invalidateReview(); setMapping(next); }, selectFile, reparse,
    // preview
    previewClassifications, fillRates, estimates, goToPreview,
    repositoryLinks, repositoryReviews, repositoryChoicesNeeded, discoveringRepositories, discoverRepositories, chooseRepositoryFile,
    // job
    phase, progress, rows: rowsRef.current, rowsVersion,
    startImport, pauseImport, resumeImport, cancelImport,
    // output
    disambiguateHeaders, setDisambiguateHeaders,
    dedupeAssets, setDedupeAssets,
    downloadOutput, downloadErrors, reset,
  };
}
