import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileSpreadsheet, CheckSquare, Square } from 'lucide-react';
import type { ParsedSheet, SheetSelection } from '@/types/led-import';

interface SheetSelectorProps {
  sheets: ParsedSheet[];
  selection: SheetSelection;
  onToggle: (sheetName: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

export function SheetSelector({
  sheets,
  selection,
  onToggle,
  onSelectAll,
  onDeselectAll,
}: SheetSelectorProps) {
  const selectedCount = Object.values(selection).filter(Boolean).length;
  const allSelected = selectedCount === sheets.length;
  const noneSelected = selectedCount === 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Select Sheets to Import</CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onSelectAll}
              disabled={allSelected}
            >
              <CheckSquare className="h-4 w-4 mr-1" />
              Select All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onDeselectAll}
              disabled={noneSelected}
            >
              <Square className="h-4 w-4 mr-1" />
              Deselect All
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sheets.map(sheet => {
            const specsCount = sheet.rows.filter(r => r.specificationsUrl).length;
            const imageCount = sheet.rows.filter(r => r.productImageUrl).length;

            return (
              <label
                key={sheet.name}
                className="flex items-center gap-4 p-3 rounded-lg border border-border hover:bg-muted/30 cursor-pointer transition-colors"
              >
                <Checkbox
                  checked={selection[sheet.name] ?? false}
                  onCheckedChange={() => onToggle(sheet.name)}
                />
                <FileSpreadsheet className="h-5 w-5 text-[#7BA23F]" />
                <div className="flex-1">
                  <div className="font-medium">{sheet.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {sheet.orderCodes.length} order codes
                  </div>
                </div>
                <div className="text-right text-sm">
                  <div className="text-muted-foreground">
                    {specsCount} specs, {imageCount} images
                  </div>
                  <div className="text-xs text-muted-foreground/60">
                    {specsCount + imageCount} files total
                  </div>
                </div>
              </label>
            );
          })}
        </div>

        {noneSelected && (
          <p className="text-sm text-destructive mt-4 text-center">
            Please select at least one sheet to import
          </p>
        )}
      </CardContent>
    </Card>
  );
}
