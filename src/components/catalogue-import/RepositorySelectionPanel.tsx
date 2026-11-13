import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ImportAssetCandidate } from '@/components/shared/ImportAssetCandidate';
import { FIELD_LABELS } from '@/lib/catalogue-import/constants';
import type { useCatalogueImport } from '@/hooks/use-catalogue-import';

export function RepositorySelectionPanel({ importer }: { importer: ReturnType<typeof useCatalogueImport> }) {
  const [page, setPage] = useState(0);
  const links = importer.repositoryLinks;
  if (!links.length) return null;
  const pages = Math.max(1, Math.ceil(links.length / 5));
  const currentPage = Math.min(page, pages - 1);
  return <Card>
    <CardHeader><CardTitle className="text-base">Choose files from collections</CardTitle></CardHeader>
    <CardContent className="space-y-4">
      <p className="text-sm text-muted-foreground">Choose one file for each hyperlink, or None of these to leave that output field empty. Each row and field has its own choice, even when the collection URL is shared. Public Dropbox folders include eligible files in nested folders.</p>
      <p role="status" className="text-sm">{importer.repositoryChoicesNeeded} collection fields still need a choice.{importer.discoveringRepositories ? ' Loading linked files…' : ''}</p>
      <Button variant="outline" disabled={importer.discoveringRepositories} onClick={() => importer.discoverRepositories()}>Refresh collection files</Button>
      {links.slice(currentPage * 5, currentPage * 5 + 5).map(link => {
        const review = importer.repositoryReviews[link.key];
        return <section key={link.key} data-repository-key={link.key} aria-label={`Collection row ${link.sourceRow} ${FIELD_LABELS[link.field]}`} className="rounded border p-4 space-y-3">
          <h3 className="text-sm font-semibold">Row {link.sourceRow} · {FIELD_LABELS[link.field]}</h3>
          <p className="break-all text-xs text-muted-foreground">{link.url}</p>
          <p className="text-sm">{review?.declined ? 'None selected. This output field will be empty.' : review?.selectedId ? `Selected: ${review.candidates.find(candidate => candidate.id === review.selectedId)?.name}` : 'Choose a file or None of these before importing.'}</p>
          {!review?.declined && review?.error && <p role="alert" className="text-sm text-destructive">{review.error}</p>}
          <div className="flex flex-wrap gap-2">
            <Button variant={review?.declined ? 'default' : 'outline'} aria-pressed={Boolean(review?.declined)} aria-label={`None of these for row ${link.sourceRow} ${FIELD_LABELS[link.field]}`} disabled={importer.discoveringRepositories} onClick={() => importer.chooseRepositoryFile(link.key)}>None of these</Button>
            <Button size="sm" variant="ghost" disabled={importer.discoveringRepositories} onClick={() => importer.discoverRepositories(link.key)}>Retry discovery</Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">{review?.candidates.map(candidate => <ImportAssetCandidate key={candidate.id} candidate={candidate} selected={review.selectedId === candidate.id && !review.declined} disabled={importer.discoveringRepositories} onSelect={() => importer.chooseRepositoryFile(link.key, candidate.id)} />)}</div>
        </section>;
      })}
      <div className="flex items-center justify-between gap-2"><Button variant="outline" disabled={!currentPage} onClick={() => setPage(currentPage - 1)}>Previous collections</Button><span className="text-xs">Page {currentPage + 1} of {pages}</span><Button variant="outline" disabled={currentPage + 1 >= pages} onClick={() => setPage(currentPage + 1)}>Next collections</Button></div>
    </CardContent>
  </Card>;
}
