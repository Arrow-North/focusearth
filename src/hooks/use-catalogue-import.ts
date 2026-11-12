import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { parseCatalogueFile } from '@/lib/led-import/catalogue-parser';
import { catalogueRequest, fileBase64 } from '@/lib/led-import/catalogue-api';
import { rowBlockers, validateManualImage, type AssetCandidate, type DuplicateMatch, type RowReview } from '@/lib/led-import/import-review';
import type { ImportLink } from '@/types/catalogue-import';

type Discovery = { candidates: AssetCandidate[]; sourceType: 'file' | 'folder' };
export function useCatalogueImport() {
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<RowReview[]>([]);
  const [fileName, setFileName] = useState('');
  const [companyId, setCompanyId] = useState<number>();
  const [busy, setBusy] = useState<'parsing' | 'discovering' | 'importing' | null>(null);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [error, setError] = useState<string>();
  const importId = useRef(crypto.randomUUID());
  const active = useRef(false);
  const cache = useRef(new Map<string, Promise<Discovery>>());

  function updateRow(id: string, patch: Partial<RowReview>) {
    setRows(current => current.map(item => item.row.id === id ? { ...item, ...patch, error: undefined } : item));
  }
  async function parse(file: File, supplierId: number) {
    if (active.current) return;
    active.current = true;
    setBusy('parsing'); setError(undefined); setRows([]); cache.current.clear();
    importId.current = crypto.randomUUID();
    try {
      const files = await parseCatalogueFile(file);
      const parsed = files.flatMap(item => item.rows);
      const identifiable = parsed.filter(row => row.orderCode.trim() && row.orderCode.length <= 255);
      if (!parsed.length) throw new Error('This file contains no product rows. Choose a populated catalogue CSV or workbook.');
      const matches = new Map<string, DuplicateMatch[]>();
      for (let i = 0; i < identifiable.length; i += 100) {
        const result = await catalogueRequest<{ duplicates: { rowId: string; matches: DuplicateMatch[] }[] }>({
          action: 'duplicates', companyId: supplierId,
          rows: identifiable.slice(i, i + 100).map(row => ({ rowId: row.id, category: row.category, orderCode: row.orderCode })),
        });
        result.duplicates.forEach(item => matches.set(item.rowId, item.matches));
      }
      setRows(parsed.map(row => ({ row, matches: matches.get(row.id) ?? [], decision: matches.get(row.id)?.length ? 'unresolved' : 'create', links: {} })));
      setFileName(file.name); setCompanyId(supplierId);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not prepare this catalogue.'); }
    finally { active.current = false; setBusy(null); }
  }
  async function discoverLink(link: ImportLink, retry: boolean): Promise<Discovery> {
    const key = `${link.kind}:${link.url}`;
    if (retry) cache.current.delete(key);
    let promise = cache.current.get(key);
    if (!promise) {
      promise = catalogueRequest<Discovery>({ action: 'discover', url: link.url, kind: link.kind });
      cache.current.set(key, promise);
      promise.catch(() => cache.current.delete(key));
    }
    return promise;
  }
  async function discover(rowId?: string) {
    if (active.current) return;
    active.current = true; setBusy('discovering'); setError(undefined);
    const selected = rows.filter(item => !item.outcome && item.decision !== 'skip' && (!rowId || item.row.id === rowId));
    setProgress({ completed: 0, total: selected.length });
    try {
      for (const [index, item] of selected.entries()) {
        for (const link of item.row.links) {
          if (link.kind === 'image' && item.manualImage) continue;
          try {
            const discovery = await discoverLink(link, Boolean(rowId));
            const state = {
              ...discovery, discovered: true,
              selectedId: discovery.candidates.length === 1 ? discovery.candidates[0].id : undefined,
              error: discovery.candidates.length ? undefined : `No eligible ${link.kind === 'image' ? 'image' : 'file'} is available for import.`,
            };
            setRows(current => current.map(value => value.row.id === item.row.id ? { ...value, links: { ...value.links, [link.id]: state } } : value));
          } catch (e) {
            const message = e instanceof Error ? e.message : 'Linked files are not available for import.';
            setRows(current => current.map(value => value.row.id === item.row.id ? { ...value, links: { ...value.links, [link.id]: { discovered: true, candidates: [], error: message } } } : value));
          }
        }
        setProgress({ completed: index + 1, total: selected.length });
      }
    } finally { active.current = false; setBusy(null); }
  }
  function selectCandidate(rowId: string, linkId: string, candidateId: string) {
    setRows(current => current.map(item => item.row.id === rowId ? {
      ...item, error: undefined,
      manualImage: item.row.links.find(link => link.id === linkId)?.kind === 'image' ? undefined : item.manualImage,
      links: { ...item.links, [linkId]: { ...item.links[linkId], selectedId: candidateId } },
    } : item));
  }
  function manualImage(rowId: string, file?: File) {
    const issue = file && validateManualImage(file);
    if (issue) { setError(issue); return; }
    updateRow(rowId, { manualImage: file }); setError(undefined);
  }
  async function commit() {
    if (active.current || !companyId || rows.some(row => rowBlockers(row, rows).length)) return;
    active.current = true; setBusy('importing'); setError(undefined);
    const pending = rows.filter(row => !row.outcome);
    setProgress({ completed: 0, total: pending.length });
    try {
      for (const [index, item] of pending.entries()) {
        if (item.decision === 'skip') {
          updateRow(item.row.id, { outcome: 'skipped' });
          setProgress({ completed: index + 1, total: pending.length });
          continue;
        }
        try {
          const match = item.matches.find(value => value.id === item.existingProductId);
          const image = item.manualImage;
          const result = await catalogueRequest<{ status: 'created' | 'updated' | 'skipped' }>({
            action: 'commit', importId: importId.current, rowId: item.row.id, companyId,
            category: item.row.category, orderCode: item.row.orderCode,
            details: { ...item.row.details, sourceValues: item.row.sourceValues, sourceFile: fileName, sourceRow: item.row.rowNumber },
            sourceLinks: item.row.links,
            decision: item.decision, existingProductId: match?.id, existingUpdatedAt: match?.updatedAt,
            attachments: item.row.links.filter(link => !(image && link.kind === 'image')).map(link => ({ field: link.detailKey, candidateId: item.links[link.id].selectedId })),
            manualImage: image ? { name: image.name, mimeType: image.type, base64: await fileBase64(image) } : undefined,
          });
          updateRow(item.row.id, { outcome: result.status });
        } catch (e) {
          const message = e instanceof Error ? e.message : 'Import failed. You can retry this row.';
          setRows(current => current.map(value => value.row.id === item.row.id ? { ...value, error: message } : value));
        }
        setProgress({ completed: index + 1, total: pending.length });
      }
      await queryClient.invalidateQueries({ queryKey: ['products'] });
    } finally { active.current = false; setBusy(null); }
  }
  function reset() {
    if (active.current) return;
    setRows([]); setFileName(''); setCompanyId(undefined); setError(undefined); cache.current.clear();
  }
  return { rows, fileName, companyId, busy, progress, error, parse, discover, updateRow, selectCandidate, manualImage, commit, reset };
}
