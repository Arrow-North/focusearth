import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCompanies } from '@/hooks/use-companies';
import { useSupplierCatalogueImport } from '@/hooks/use-supplier-catalogue-import';
import { CatalogueImportReview } from '@/components/led-import/CatalogueImportReview';

export default function LEDCatalogueImport() {
  const importer = useSupplierCatalogueImport();
  const [supplier, setSupplier] = useState<{ id: number; name: string }>();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const { data: companies, isLoading, error } = useCompanies({ type: 'SU', search, page, pageSize: 25 });
  return <DashboardLayout title="Catalogues / Import Catalogue" showSearch={false}>
    <div className="max-w-5xl mx-auto space-y-6">
      <p className="text-muted-foreground">Choose the supplier company for this file, review its products and linked files, then import. Use public Dropbox file or folder links with downloads enabled. Links must open without a Dropbox login or password.</p>
      {importer.error && <p role="alert" className="rounded border border-destructive p-4 text-sm text-destructive">{importer.error}</p>}
      {!importer.rows.length ? <Card>
        <CardHeader><CardTitle className="text-lg">1. Choose supplier company</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <label htmlFor="supplier-search" className="block text-sm font-medium">Find supplier</label>
          <Input id="supplier-search" placeholder="Search supplier companies" value={search} disabled={Boolean(importer.busy)} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          {error && <p role="alert" className="text-destructive text-sm">Could not load supplier companies. {error.message}</p>}
          {isLoading && <p role="status" className="text-sm">Loading supplier companies…</p>}
          <label htmlFor="supplier-company" className="block text-sm font-medium">Supplier company</label>
          <select id="supplier-company" className="w-full rounded border bg-background p-3 text-sm" value={supplier?.id ?? ''} disabled={Boolean(importer.busy) || isLoading} onChange={e => {
            const company = companies?.rows.find(item => item.id === Number(e.target.value));
            setSupplier(company ? { id: company.id, name: company.name } : undefined);
          }}><option value="">Select a supplier…</option>{supplier && !companies?.rows.some(item => item.id === supplier.id) && <option value={supplier.id}>{supplier.name}</option>}{companies?.rows.map(company => <option key={company.id} value={company.id}>{company.name}</option>)}</select>
          <div className="flex items-center gap-3"><Button variant="outline" size="sm" disabled={Boolean(importer.busy) || page <= 1} onClick={() => setPage(page - 1)}>Previous suppliers</Button><span className="text-xs">Page {page}</span><Button variant="outline" size="sm" disabled={Boolean(importer.busy) || !companies || page * 25 >= companies.total_count} onClick={() => setPage(page + 1)}>More suppliers</Button></div>
          {!isLoading && companies?.total_count === 0 && <p className="text-sm">No suppliers found. Create a supplier company before importing its catalogue.</p>}
          <div className="border-t pt-5 space-y-3"><h2 className="font-semibold">2. Choose catalogue file</h2><p className="text-sm text-muted-foreground">One supplier per file. CSV, XLSX, XLSM, and XLS are supported. Files are parsed locally before any products or attachments are saved.</p><input aria-label="Catalogue file" type="file" accept=".csv,.xlsx,.xlsm,.xls" disabled={!supplier || Boolean(importer.busy)} onChange={e => {
            const file = e.target.files?.[0]; if (file && supplier) void importer.parse(file, supplier.id); e.target.value = '';
          }} className="block max-w-full text-sm" />{importer.busy === 'parsing' && <p role="status" className="text-sm">Parsing catalogue and checking existing products…</p>}</div>
        </CardContent>
      </Card> : <><p className="text-sm font-medium">Supplier: {supplier?.name} · Review before saving</p><CatalogueImportReview importer={importer} /></>}
    </div>
  </DashboardLayout>;
}
