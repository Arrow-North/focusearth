import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Truck, Save } from 'lucide-react';

const shippingFormSchema = z.object({
  // Sender info
  sender_company_name: z.string().min(1, 'Company name is required'),
  sender_tracking_link: z.string().optional(),
  sender_address1: z.string().min(1, 'Address is required'),
  sender_address2: z.string().optional(),
  sender_city: z.string().min(1, 'City is required'),
  sender_state: z.string().min(1, 'State is required'),
  sender_zip_code: z.string().min(1, 'ZIP code is required'),
  sender_country: z.string().default('USA'),
  sender_phone: z.string().optional(),
  // Receiver info
  receiver_company_name: z.string().min(1, 'Company name is required'),
  receiver_name: z.string().min(1, 'Recipient name is required'),
  receiver_address1: z.string().min(1, 'Address is required'),
  receiver_address2: z.string().optional(),
  receiver_city: z.string().min(1, 'City is required'),
  receiver_state: z.string().min(1, 'State is required'),
  receiver_zip_code: z.string().min(1, 'ZIP code is required'),
  receiver_country: z.string().default('USA'),
  receiver_phone: z.string().optional(),
  // Additional
  notes: z.string().optional(),
  shipping_reference: z.string().optional(),
});

type ShippingFormData = z.infer<typeof shippingFormSchema>;

interface ShippingFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ShippingFormData) => void;
  isLoading?: boolean;
  defaultValues?: Partial<ShippingFormData>;
  mode?: 'create' | 'edit';
}

export function ShippingFormModal({
  open,
  onOpenChange,
  onSubmit,
  isLoading = false,
  defaultValues,
  mode = 'create',
}: ShippingFormModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ShippingFormData>({
    resolver: zodResolver(shippingFormSchema),
    defaultValues: {
      sender_country: 'USA',
      receiver_country: 'USA',
      ...defaultValues,
    },
  });

  const handleFormSubmit = (data: ShippingFormData) => {
    onSubmit(data);
    reset();
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            {mode === 'create' ? 'Create Shipping Detail' : 'Edit Shipping Detail'}
          </DialogTitle>
          <DialogDescription>
            Enter the sender and recipient shipping information.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          {/* Two column layout for sender/receiver */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Sender Section */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm bg-muted px-3 py-2 rounded-md">
                Sender Information
              </h3>

              <div className="space-y-2">
                <Label htmlFor="sender_company_name">Company Name *</Label>
                <Input
                  id="sender_company_name"
                  {...register('sender_company_name')}
                  className={errors.sender_company_name ? 'border-destructive' : ''}
                />
                {errors.sender_company_name && (
                  <p className="text-xs text-destructive">{errors.sender_company_name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="sender_tracking_link">Tracking Link</Label>
                <Input
                  id="sender_tracking_link"
                  {...register('sender_tracking_link')}
                  placeholder="https://..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sender_address1">Address Line 1 *</Label>
                <Input
                  id="sender_address1"
                  {...register('sender_address1')}
                  className={errors.sender_address1 ? 'border-destructive' : ''}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sender_address2">Address Line 2</Label>
                <Input id="sender_address2" {...register('sender_address2')} />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="sender_city">City *</Label>
                  <Input
                    id="sender_city"
                    {...register('sender_city')}
                    className={errors.sender_city ? 'border-destructive' : ''}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sender_state">State *</Label>
                  <Input
                    id="sender_state"
                    {...register('sender_state')}
                    className={errors.sender_state ? 'border-destructive' : ''}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="sender_zip_code">ZIP Code *</Label>
                  <Input
                    id="sender_zip_code"
                    {...register('sender_zip_code')}
                    className={errors.sender_zip_code ? 'border-destructive' : ''}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sender_country">Country</Label>
                  <Input id="sender_country" {...register('sender_country')} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sender_phone">Phone</Label>
                <Input id="sender_phone" {...register('sender_phone')} placeholder="123-456-7890" />
              </div>
            </div>

            {/* Receiver Section */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm bg-muted px-3 py-2 rounded-md">
                Recipient Information
              </h3>

              <div className="space-y-2">
                <Label htmlFor="receiver_company_name">Company Name *</Label>
                <Input
                  id="receiver_company_name"
                  {...register('receiver_company_name')}
                  className={errors.receiver_company_name ? 'border-destructive' : ''}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="receiver_name">Recipient Name *</Label>
                <Input
                  id="receiver_name"
                  {...register('receiver_name')}
                  className={errors.receiver_name ? 'border-destructive' : ''}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="receiver_address1">Address Line 1 *</Label>
                <Input
                  id="receiver_address1"
                  {...register('receiver_address1')}
                  className={errors.receiver_address1 ? 'border-destructive' : ''}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="receiver_address2">Address Line 2</Label>
                <Input id="receiver_address2" {...register('receiver_address2')} />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="receiver_city">City *</Label>
                  <Input
                    id="receiver_city"
                    {...register('receiver_city')}
                    className={errors.receiver_city ? 'border-destructive' : ''}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="receiver_state">State *</Label>
                  <Input
                    id="receiver_state"
                    {...register('receiver_state')}
                    className={errors.receiver_state ? 'border-destructive' : ''}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="receiver_zip_code">ZIP Code *</Label>
                  <Input
                    id="receiver_zip_code"
                    {...register('receiver_zip_code')}
                    className={errors.receiver_zip_code ? 'border-destructive' : ''}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="receiver_country">Country</Label>
                  <Input id="receiver_country" {...register('receiver_country')} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="receiver_phone">Phone</Label>
                <Input
                  id="receiver_phone"
                  {...register('receiver_phone')}
                  placeholder="123-456-7890"
                />
              </div>
            </div>
          </div>

          {/* Notes section */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="shipping_reference">Shipping Reference</Label>
              <Input id="shipping_reference" {...register('shipping_reference')} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                {...register('notes')}
                placeholder="Additional shipping notes..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? 'Saving...' : mode === 'create' ? 'Create Shipping' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
