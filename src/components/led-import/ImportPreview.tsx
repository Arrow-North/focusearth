import { FolderTree, FileSpreadsheet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ParsedSheet } from '@/types/led-import';

interface ImportPreviewProps {
  sheets: ParsedSheet[];
  userId: string;
}

export function ImportPreview({ sheets, userId }: ImportPreviewProps) {
  const totalImages = sheets.reduce((sum, sheet) => {
    return (
      sum +
      sheet.rows.filter(r => r.specificationsUrl).length +
      sheet.rows.filter(r => r.productImageUrl).length
    );
  }, 0);

  const totalOrderCodes = sheets.reduce(
    (sum, sheet) => sum + sheet.orderCodes.length,
    0
  );

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Sheets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sheets.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Order Codes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrderCodes}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Images to Import
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalImages}</div>
          </CardContent>
        </Card>
      </div>

      {/* Folder Structure Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FolderTree className="h-5 w-5" />
            Folder Structure Preview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/30 rounded-lg p-4 font-mono text-sm">
            <div className="text-muted-foreground">LEDs/</div>
            <div className="ml-4 text-muted-foreground">
              {userId.slice(0, 8)}.../
              <span className="text-xs text-muted-foreground/60">(your user ID)</span>
            </div>
            {sheets.map(sheet => (
              <div key={sheet.name} className="ml-8">
                <div className="flex items-center gap-2 text-foreground">
                  <FileSpreadsheet className="h-4 w-4 text-[#7BA23F]" />
                  {sheet.name}/
                </div>
                {sheet.orderCodes.slice(0, 3).map(code => (
                  <div key={code} className="ml-6 text-muted-foreground">
                    {code}/
                    <div className="ml-4">
                      <span className="text-muted-foreground/60">
                        specifications.pdf
                      </span>
                    </div>
                    <div className="ml-4">
                      <span className="text-muted-foreground/60">
                        product-image.jpg
                      </span>
                    </div>
                  </div>
                ))}
                {sheet.orderCodes.length > 3 && (
                  <div className="ml-6 text-muted-foreground/60">
                    ... and {sheet.orderCodes.length - 3} more
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
