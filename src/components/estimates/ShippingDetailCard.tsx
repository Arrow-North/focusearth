import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Truck, ExternalLink, Trash2, Pencil } from 'lucide-react';
import type { ShippingDetail } from '@/types/database';

interface ShippingDetailCardProps {
  shipping: ShippingDetail;
  onEdit?: (shipping: ShippingDetail) => void;
  onDelete?: (shippingId: number) => void;
  isDeleting?: boolean;
  canEdit?: boolean;
}

const SHIPPING_STATUS_LABELS: Record<number, string> = {
  0: 'Pending',
  1: 'In Transit',
  2: 'Delivered',
  3: 'Cancelled',
};

const SHIPPING_STATUS_VARIANTS: Record<number, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  0: 'secondary',
  1: 'default',
  2: 'default',
  3: 'destructive',
};

export function ShippingDetailCard({
  shipping,
  onEdit,
  onDelete,
  isDeleting = false,
  canEdit = true,
}: ShippingDetailCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleDelete = () => {
    if (onDelete) {
      onDelete(shipping.id);
    }
    setShowDeleteDialog(false);
  };

  const formatAddress = (
    address1?: string | null,
    address2?: string | null,
    city?: string | null,
    state?: string | null,
    zipCode?: string | null,
    country?: string | null
  ) => {
    const parts = [address1, address2, `${city || ''}, ${state || ''} ${zipCode || ''}`, country]
      .filter(Boolean)
      .map((p) => p?.trim())
      .filter((p) => p && p !== ',');
    return parts;
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Truck className="h-4 w-4" />
              Shipping Detail #{shipping.id}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant={SHIPPING_STATUS_VARIANTS[shipping.status] || 'secondary'}>
                {SHIPPING_STATUS_LABELS[shipping.status] || 'Unknown'}
              </Badge>
              {canEdit && (
                <>
                  {onEdit && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(shipping)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowDeleteDialog(true)}
                      disabled={isDeleting}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            {/* Sender */}
            <div className="space-y-1">
              <p className="font-medium text-muted-foreground">From:</p>
              <p className="font-semibold">{shipping.sender_company_name || '-'}</p>
              {formatAddress(
                shipping.sender_address1,
                shipping.sender_address2,
                shipping.sender_city,
                shipping.sender_state,
                shipping.sender_zip_code,
                shipping.sender_country
              ).map((line, i) => (
                <p key={i} className="text-muted-foreground">
                  {line}
                </p>
              ))}
              {shipping.sender_phone && (
                <p className="text-muted-foreground">{shipping.sender_phone}</p>
              )}
            </div>

            {/* Receiver */}
            <div className="space-y-1">
              <p className="font-medium text-muted-foreground">To:</p>
              <p className="font-semibold">{shipping.receiver_company_name || '-'}</p>
              {shipping.receiver_name && <p>{shipping.receiver_name}</p>}
              {formatAddress(
                shipping.receiver_address1,
                shipping.receiver_address2,
                shipping.receiver_city,
                shipping.receiver_state,
                shipping.receiver_zip_code,
                shipping.receiver_country
              ).map((line, i) => (
                <p key={i} className="text-muted-foreground">
                  {line}
                </p>
              ))}
              {shipping.receiver_phone && (
                <p className="text-muted-foreground">{shipping.receiver_phone}</p>
              )}
            </div>
          </div>

          {/* Tracking link */}
          {shipping.sender_tracking_link && shipping.sender_tracking_link !== 'Tracking Link' && (
            <div className="pt-2 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                asChild
              >
                <a
                  href={shipping.sender_tracking_link}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Track Package
                </a>
              </Button>
            </div>
          )}

          {/* Reference and Notes */}
          {(shipping.shipping_reference || shipping.notes) && (
            <div className="pt-2 border-t border-border space-y-2 text-sm">
              {shipping.shipping_reference && (
                <div>
                  <span className="text-muted-foreground">Reference: </span>
                  <span>{shipping.shipping_reference}</span>
                </div>
              )}
              {shipping.notes && (
                <div>
                  <span className="text-muted-foreground">Notes: </span>
                  <span className="whitespace-pre-wrap">{shipping.notes}</span>
                </div>
              )}
            </div>
          )}

          {/* Date */}
          {shipping.created_at && (
            <div className="text-xs text-muted-foreground pt-2 border-t border-border">
              Created: {new Date(shipping.created_at).toLocaleDateString()}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Shipping Detail</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this shipping detail? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
