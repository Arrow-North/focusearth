import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { catalogueRequest } from '@/lib/led-import/catalogue-api';
import { rowBlockers, type AssetCandidate, type RowReview } from '@/lib/led-import/import-review';
import type { useCatalogueImport } from '@/hooks/use-catalogue-import';

type Importer = ReturnType<typeof useCatalogueImport>;
function Candidate({ candidate, selected, disabled, onSelect }: { candidate: AssetCandidate; selected: boolean; disabled: boolean; onSelect: () => void }) {
  const container = useRef<HTMLButtonElement>(null);
  const [preview, setPreview] = useState(candidate.previewUrl);
  const [previewError, setPreviewError] = useState(false);
  useEffect(() => {
    if (preview || !candidate.mimeType.startsWith('image/')) return;
    let cancelled = false;
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      observer.disconnect();
      catalogueRequest<{ previewUrl: string }>({ action: 'thumbnail', candidateId: candidate.id })
        .then(result => { if (!cancelled) setPreview(result.previewUrl); })
        .catch(() => { if (!cancelled) setPreviewError(true); });
    });
    if (container.current) observer.observe(container.current);
    return () => { cancelled = true; observer.disconnect(); };
  }, [candidate.id, candidate.mimeType, preview]);
  return <button ref={container} type="button" disabled={disabled} onClick={onSelect} aria-pressed={selected}
    className={`rounded-md border p-3 text-left break-words ${selected ? 'border-primary ring-2 ring-primary' : 'border-border'} disabled:opacity-60`}>
    {candidate.mimeType.startsWith('image/') && (preview ? <img src={preview} alt={candidate.name} className="h-28 w-full object-contain mb-2" /> : <div className="h-28 flex items-center justify-center bg-muted text-xs mb-2">{previewError ? 'Preview unavailable' : 'Loading preview…'}</div>)}
    <span className="block text-sm font-medium">{candidate.name}</span>
    <span className="text-xs text-muted-foreground">{(candidate.size / 1024).toFixed(0)} KB · {selected ? 'Selected' : 'Choose file'}</span>
  </button>;
}

export function CatalogueImportReview({ importer }: { importer: Importer }) {
  const { rows, busy } = importer;
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(0);
  const pending = rows.filter(item => !item.outcome && item.decision !== 'skip');
  const blocked = pending.filter(item => rowBlockers(item, rows).length);
  const completed = rows.filter(item => item.outcome);
  const visible = rows.filter(item => filter === 'all' || (filter === 'attention' ? !item.outcome && item.decision !== 'skip' && rowBlockers(item, rows).length > 0 : filter === 'ready' ? !item.outcome && item.decision !== 'skip' && !rowBlockers(item, rows).length : Boolean(item.outcome)));
  const pages = Math.max(1, Math.ceil(visible.length / 5));
  const currentPage = Math.min(page, pages - 1);
  return <div className="space-y-5">
    <Card><CardContent className="pt-6 space-y-4">
      <p className="font-medium">{importer.fileName}</p>
      <p className="text-sm">{rows.length} products · {blocked.length} need attention · {pending.length - blocked.length} ready · {completed.length} finished</p>
      <p className="text-sm text-muted-foreground">Every linked field needs a selected file. Folder links list all eligible files, including files in nested folders. Product images are required. Skip any rows you do not want to import.</p>
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" disabled={Boolean(busy) || !pending.length} onClick={() => importer.discover()}>Discover linked files</Button>
        <Button disabled={Boolean(busy) || blocked.length > 0 || !rows.some(row => !row.outcome)} onClick={importer.commit}>Import reviewed products</Button>
        <Button variant="ghost" disabled={Boolean(busy)} onClick={importer.reset}>Choose another file</Button>
      </div>
      {busy && <p role="status" className="text-sm">{busy === 'discovering' ? 'Discovering linked files' : 'Importing products'}: {importer.progress.completed} / {importer.progress.total}. Keep this page open.</p>}
      {completed.length > 0 && <p role="status" className="text-sm">Created: {completed.filter(row => row.outcome === 'created').length} · Updated: {completed.filter(row => row.outcome === 'updated').length} · Skipped: {completed.filter(row => row.outcome === 'skipped').length}. Successful rows will not be imported again when you retry.</p>}
      <div className="flex items-center gap-3"><label htmlFor="row-filter" className="text-sm">Show</label><select id="row-filter" value={filter} onChange={e => { setFilter(e.target.value); setPage(0); }} className="rounded border bg-background p-2 text-sm"><option value="all">All products</option><option value="attention">Needs attention</option><option value="ready">Ready to import</option><option value="finished">Finished</option></select></div>
    </CardContent></Card>
    {visible.slice(currentPage * 5, currentPage * 5 + 5).map(item => <Row key={item.row.id} item={item} importer={importer} />)}
    {!visible.length && <p className="text-sm text-muted-foreground">No products in this view.</p>}
    <div className="flex items-center justify-between"><Button variant="outline" disabled={!currentPage} onClick={() => setPage(currentPage - 1)}>Previous</Button><span className="text-sm">Page {currentPage + 1} of {pages}</span><Button variant="outline" disabled={currentPage + 1 >= pages} onClick={() => setPage(currentPage + 1)}>Next</Button></div>
  </div>;
}

function Row({ item, importer }: { item: RowReview; importer: Importer }) {
  const { row } = item;
  const disabled = Boolean(importer.busy || item.outcome);
  const issues = rowBlockers(item, importer.rows);
  return <Card>
    <CardHeader className="pb-3"><CardTitle className="text-base flex flex-wrap justify-between gap-3"><span>{row.orderCode || 'Missing order code'} <span className="text-xs font-normal text-muted-foreground">{row.category} · row {row.rowNumber}</span></span><span className={`text-sm ${item.outcome || item.decision === 'skip' || !issues.length ? 'text-green-700' : 'text-amber-700'}`}>{item.outcome ?? (item.decision === 'skip' ? 'Will skip' : issues.length ? 'Needs attention' : 'Ready')}</span></CardTitle></CardHeader>
    <CardContent className="space-y-4">
      <p className="text-sm">{String(row.details.description ?? '')}</p>
      <div className="flex flex-wrap items-center gap-3"><label className="text-sm" htmlFor={`decision-${row.id}`}>{item.matches.length ? `${item.matches.length} existing record(s):` : 'Import action:'}</label>
        <select id={`decision-${row.id}`} disabled={disabled} value={item.decision} className="rounded border bg-background p-2 text-sm" onChange={e => importer.updateRow(row.id, { decision: e.target.value as RowReview['decision'], existingProductId: item.matches.length === 1 ? item.matches[0].id : undefined })}>
          {item.matches.length > 0 && <option value="unresolved">Choose duplicate action…</option>}
          {!item.matches.length && <option value="create">Create product</option>}
          {item.matches.length > 0 && <option value="update">Update existing product</option>}
          <option value="skip">Skip this row</option>
        </select>
        {item.decision === 'update' && <select aria-label={`Existing product for ${row.orderCode}`} disabled={disabled} value={item.existingProductId ?? ''} className="rounded border bg-background p-2 text-sm" onChange={e => importer.updateRow(row.id, { existingProductId: Number(e.target.value) })}><option value="">Choose existing product…</option>{item.matches.map(match => <option key={match.id} value={match.id}>#{match.id} · {String(match.details.description ?? row.orderCode)}</option>)}</select>}
      </div>
      {item.error && <p role="alert" className="text-sm text-destructive">Import failed: {item.error} Retry after resolving the issue. If the catalogue changed, start a new preview.</p>}
      {item.decision !== 'skip' && !item.outcome && <>
        {issues.length > 0 && <ul className="list-disc pl-5 text-sm text-amber-800 space-y-1">{issues.map(issue => <li key={issue}>{issue}</li>)}</ul>}
        {!item.manualImage && !row.links.some(link => link.kind === 'image') && <p className="text-sm text-destructive">{row.imageIssue || 'Product image is not available for import.'}</p>}
        <Button size="sm" variant="outline" disabled={disabled || !row.links.length} onClick={() => importer.discover(row.id)}>Discover / refresh this row’s linked files</Button>
        {row.links.map(link => {
          const state = item.links[link.id];
          const overridden = link.kind === 'image' && item.manualImage;
          return <details key={link.id} className="border rounded-md p-3" open={Boolean(state?.discovered && !overridden)}>
            <summary className="cursor-pointer text-sm font-medium">{link.header} — {overridden ? 'Manual image selected' : state?.selectedId ? `Selected: ${state.candidates.find(candidate => candidate.id === state.selectedId)?.name}` : state?.discovered ? `${state.candidates.length} eligible files; selection required` : 'Not discovered'}</summary>
            <p className="text-xs break-all mt-2 text-muted-foreground">{link.url}</p>
            {state?.error && !overridden && <p role="alert" className="text-sm text-destructive mt-2">Not available for import: {state.error}</p>}
            {!overridden && state?.candidates.length > 1 && <p className="text-sm mt-2">This link contains multiple files. Choose one for this field.</p>}
            {!overridden && <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">{state?.candidates.map(candidate => <Candidate key={candidate.id} candidate={candidate} selected={state.selectedId === candidate.id} disabled={disabled} onSelect={() => importer.selectCandidate(row.id, link.id, candidate.id)} />)}</div>}
          </details>;
        })}
        <div className="space-y-2"><label htmlFor={`image-${row.id}`} className="block text-sm font-medium">Upload a product image manually {item.manualImage ? `— ${item.manualImage.name}` : '(required if the linked image is unavailable)'}</label><input id={`image-${row.id}`} type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={disabled} onChange={e => { importer.manualImage(row.id, e.target.files?.[0]); e.target.value = ''; }} className="block max-w-full text-sm" /><p className="text-xs text-muted-foreground">JPEG, PNG, WebP, or GIF. Maximum 10 MB.</p>{item.manualImage && <Button size="sm" variant="ghost" disabled={disabled} onClick={() => importer.manualImage(row.id)}>Remove manual image</Button>}</div>
      </>}
      <details><summary className="cursor-pointer text-sm">Review all parsed fields</summary><dl className="grid md:grid-cols-2 gap-3 mt-3">{Object.entries(row.sourceValues).map(([key, value]) => <div key={key} className="text-sm min-w-0"><dt className="font-medium">{key}</dt><dd className="break-words text-muted-foreground whitespace-pre-wrap">{value || '—'}</dd></div>)}</dl></details>
    </CardContent>
  </Card>;
}
