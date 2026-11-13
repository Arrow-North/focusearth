import { useEffect, useRef, useState } from 'react';
import { catalogueRequest } from '@/lib/led-import/catalogue-api';
import type { AssetCandidate } from '@/lib/led-import/import-review';

/** Original files are downloaded only after review; previews load as cards enter view. */
export function ImportAssetCandidate({ candidate, selected, disabled, onSelect }: {
  candidate: AssetCandidate;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
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
