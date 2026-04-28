import { useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EstimateStageStepper } from '@/components/estimates/EstimateStageStepper';
import { SignatureModal } from '@/components/estimates/SignatureModal';
import { ShippingFormModal } from '@/components/estimates/ShippingFormModal';
import { ShippingDetailCard } from '@/components/estimates/ShippingDetailCard';
import { InvoiceUploadCard } from '@/components/estimates/InvoiceUploadCard';
import { ReceiptUploadCard } from '@/components/estimates/ReceiptUploadCard';
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
import {
  useEstimate,
  useOrderPath,
  useApproveEstimate,
  useAdminApproveEstimate,
  useConvertToOrder,
  useUpdateShipping,
  useMarkInvoice,
  useMarkReceipt,
  useMarkFulfilled,
  useArchiveEstimate,
  useUnarchiveEstimate,
  useShippingDetails,
  useDeleteShipping,
} from '@/hooks/use-estimates';
import { useAuth } from '@/hooks/useAuth';
import type { EstimateTableType, EstimateSU, EstimateREU, ShippingDetail } from '@/types/database';
import {
  ArrowLeft,
  CheckCircle,
  ShoppingCart,
  Truck,
  FileText,
  Receipt,
  PackageCheck,
  Archive,
  PenLine,
  RotateCcw,
  Plus,
} from 'lucide-react';

export default function EstimateDetail() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin, userType } = useAuth();

  const estimateId = id ? Number(id) : undefined;
  const tableType: EstimateTableType = location.pathname.includes('/real-estate')
    ? 'estimate_reu'
    : 'estimate';

  const isSU = tableType === 'estimate';

  const { data: estimate, isLoading: estLoading } = useEstimate(estimateId, tableType);
  const { data: orderPath, isLoading: pathLoading } = useOrderPath(estimateId, tableType);

  const approveMutation = useApproveEstimate();
  const adminApproveMutation = useAdminApproveEstimate();
  const convertMutation = useConvertToOrder();
  const shippingMutation = useUpdateShipping();
  const invoiceMutation = useMarkInvoice();
  const receiptMutation = useMarkReceipt();
  const fulfilledMutation = useMarkFulfilled();
  const archiveMutation = useArchiveEstimate();
  const unarchiveMutation = useUnarchiveEstimate();
  const deleteShippingMutation = useDeleteShipping();

  const { data: shippingDetails } = useShippingDetails(estimateId, tableType);

  // Modal states
  const [signatureModalOpen, setSignatureModalOpen] = useState(false);
  const [adminSignatureModalOpen, setAdminSignatureModalOpen] = useState(false);
  const [shippingModalOpen, setShippingModalOpen] = useState(false);
  const [editingShipping, setEditingShipping] = useState<ShippingDetail | null>(null);

  // Confirmation dialog states
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [fulfilledDialogOpen, setFulfilledDialogOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [unarchiveDialogOpen, setUnarchiveDialogOpen] = useState(false);

  if (estLoading || pathLoading) {
    return (
      <DashboardLayout title="Estimate">
        <div className="space-y-4">
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
          <div className="h-64 bg-muted animate-pulse rounded-lg" />
        </div>
      </DashboardLayout>
    );
  }

  if (!estimate || !orderPath) {
    return (
      <DashboardLayout title="Estimate Not Found">
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg font-medium">Estimate not found</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>
            Go Back
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const est = estimate as EstimateSU & EstimateREU;
  const currentStage = orderPath.current_stage;
  const basePath = isSU ? '/orders/suppliers' : '/orders/real-estate';

  const handleApprove = (signatureDataUrl: string) => {
    if (!estimateId) return;
    approveMutation.mutate({ estimateId, tableType, signatureText: signatureDataUrl });
  };

  const handleAdminApprove = (signatureDataUrl: string) => {
    if (!estimateId) return;
    adminApproveMutation.mutate({
      estimateId,
      tableType,
      adminSignatureText: signatureDataUrl,
    });
  };

  const handleConvertToOrder = () => {
    if (!estimateId) return;
    convertMutation.mutate({ estimateId, tableType });
    setConvertDialogOpen(false);
  };

  const handleMarkInvoice = () => {
    if (!estimateId) return;
    invoiceMutation.mutate({ estimateId, tableType });
  };

  const handleMarkReceipt = () => {
    if (!estimateId) return;
    receiptMutation.mutate({ estimateId, tableType });
  };

  const handleMarkFulfilled = () => {
    if (!estimateId) return;
    fulfilledMutation.mutate({ estimateId, tableType });
    setFulfilledDialogOpen(false);
  };

  const handleArchive = () => {
    if (!estimateId) return;
    archiveMutation.mutate({ estimateId, tableType });
    setArchiveDialogOpen(false);
  };

  const handleUnarchive = () => {
    if (!estimateId) return;
    unarchiveMutation.mutate({ estimateId, tableType });
    setUnarchiveDialogOpen(false);
  };

  const handleShippingSubmit = (data: Record<string, unknown>) => {
    if (!estimateId) return;
    shippingMutation.mutate({
      estimateId,
      tableType,
      shippingDetails: data,
    });
    setShippingModalOpen(false);
    setEditingShipping(null);
  };

  const handleDeleteShipping = (shippingId: number) => {
    deleteShippingMutation.mutate({ shippingId });
  };

  const handleEditShipping = (shipping: ShippingDetail) => {
    setEditingShipping(shipping);
    setShippingModalOpen(true);
  };

  const headerActions = (
    <>
      {isAdmin && !orderPath.archived && (
        <Button variant="outline" size="sm" onClick={() => setArchiveDialogOpen(true)}>
          <Archive className="h-4 w-4 mr-2" />
          Archive
        </Button>
      )}
      {isAdmin && orderPath.archived && (
        <Button variant="outline" size="sm" onClick={() => setUnarchiveDialogOpen(true)}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Restore
        </Button>
      )}
    </>
  );

  const luminaires = est.luminaires ?? [];

  return (
    <DashboardLayout
      title={`${isSU ? 'Supplier' : 'Real Estate'} Estimate #${est.id}`}
      actions={headerActions}
    >
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(basePath)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to List
        </Button>

        {/* Stage Stepper */}
        <Card>
          <CardContent className="p-6">
            <EstimateStageStepper currentStage={currentStage} orderPath={orderPath} />
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Estimate Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Estimate Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">ID</span>
                <span className="font-medium">#{est.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Reference</span>
                <span className="font-medium">{est.reference ?? '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Company</span>
                <span>#{est.company_id ?? '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Report</span>
                <span>#{est.report_id ?? '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>
                  {est.created_at ? new Date(est.created_at).toLocaleDateString() : '-'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Stage</span>
                <Badge variant="secondary" className="text-xs capitalize">
                  {currentStage}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Financial */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Financial Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Sales Tax</p>
                  <p className="font-medium">{est.sales_tax ?? '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Rebates</p>
                  <p className="font-medium">{est.rebates ?? '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Shipping</p>
                  <p className="font-medium">{est.shipping ?? '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Deposit Amount</p>
                  <p className="font-medium">{est.deposit_amount ?? '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Deposit Due</p>
                  <p className="font-medium">{est.deposit_due ?? '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Remainder Amount</p>
                  <p className="font-medium">{est.remainder_amount ?? '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Remainder Due</p>
                  <p className="font-medium">{est.remainder_due ?? '-'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Luminaires */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Luminaires ({luminaires.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {luminaires.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No luminaires in this estimate.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 pr-4 font-medium text-muted-foreground">
                        Name
                      </th>
                      <th className="text-left py-2 pr-4 font-medium text-muted-foreground">
                        Quantity
                      </th>
                      <th className="text-left py-2 pr-4 font-medium text-muted-foreground">
                        Wattage
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {luminaires.map((lum, index) => (
                      <tr key={index} className="border-b border-border/50">
                        <td className="py-2 pr-4">{lum.name ?? '-'}</td>
                        <td className="py-2 pr-4">{lum.quantity ?? '-'}</td>
                        <td className="py-2 pr-4">{lum.wattage ?? '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Signature & Approval Section */}
        {(currentStage === 'estimate' || currentStage === 'created') && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <PenLine className="h-4 w-4" />
                Signature & Approval
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                {(userType === 'Su' || userType === 'Reu') && (
                  <Button
                    onClick={() => setSignatureModalOpen(true)}
                    disabled={approveMutation.isPending}
                  >
                    <PenLine className="h-4 w-4 mr-2" />
                    {approveMutation.isPending ? 'Approving...' : 'Sign & Approve'}
                  </Button>
                )}
                {isAdmin && (
                  <Button
                    variant="outline"
                    onClick={() => setAdminSignatureModalOpen(true)}
                    disabled={adminApproveMutation.isPending}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {adminApproveMutation.isPending ? 'Approving...' : 'Admin Sign & Approve'}
                  </Button>
                )}
              </div>

              {/* Existing signatures */}
              <div className="space-y-3 pt-2 border-t border-border">
                {isSU && (est as EstimateSU).su_signature && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">SU Signature:</p>
                    {(est as EstimateSU).su_signature?.startsWith('data:image') ? (
                      <img
                        src={(est as EstimateSU).su_signature!}
                        alt="SU Signature"
                        className="h-12 object-contain border border-border rounded p-1"
                      />
                    ) : (
                      <p className="font-medium italic">{(est as EstimateSU).su_signature}</p>
                    )}
                    {(est as EstimateSU).su_signature_date && (
                      <p className="text-xs text-muted-foreground">
                        Signed: {new Date((est as EstimateSU).su_signature_date!).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                )}
                {!isSU && (est as EstimateREU).reu_signature && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">REU Signature:</p>
                    {(est as EstimateREU).reu_signature?.startsWith('data:image') ? (
                      <img
                        src={(est as EstimateREU).reu_signature!}
                        alt="REU Signature"
                        className="h-12 object-contain border border-border rounded p-1"
                      />
                    ) : (
                      <p className="font-medium italic">{(est as EstimateREU).reu_signature}</p>
                    )}
                    {(est as EstimateREU).reu_signature_date && (
                      <p className="text-xs text-muted-foreground">
                        Signed: {new Date((est as EstimateREU).reu_signature_date!).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                )}
                {est.admin_signature && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Admin Signature:</p>
                    {est.admin_signature.startsWith('data:image') ? (
                      <img
                        src={est.admin_signature}
                        alt="Admin Signature"
                        className="h-12 object-contain border border-border rounded p-1"
                      />
                    ) : (
                      <p className="font-medium italic">{est.admin_signature}</p>
                    )}
                    {est.admin_signature_date && (
                      <p className="text-xs text-muted-foreground">
                        Signed: {new Date(est.admin_signature_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Order UID */}
        {orderPath.is_order && est.order_uid && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                Order
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Order UID</span>
                <span className="font-mono font-medium">{est.order_uid}</span>
              </div>
              {est.order_date_created && (
                <div className="flex justify-between mt-2">
                  <span className="text-muted-foreground">Order Created</span>
                  <span>{new Date(est.order_date_created).toLocaleDateString()}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Shipping Details */}
        {(currentStage === 'shipping' || orderPath.is_shipping || orderPath.is_order) && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold flex items-center gap-2">
                <Truck className="h-4 w-4" />
                Shipping Details
              </h3>
              {orderPath.is_order && !orderPath.archived && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditingShipping(null);
                    setShippingModalOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Shipping
                </Button>
              )}
            </div>

            {shippingDetails && shippingDetails.length > 0 ? (
              <div className="space-y-3">
                {shippingDetails.map((shipping) => (
                  <ShippingDetailCard
                    key={shipping.id}
                    shipping={shipping as ShippingDetail}
                    onEdit={handleEditShipping}
                    onDelete={handleDeleteShipping}
                    isDeleting={deleteShippingMutation.isPending}
                    canEdit={!orderPath.archived}
                  />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-6 text-center text-sm text-muted-foreground">
                  No shipping details added yet.
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Invoice Section */}
        {(currentStage === 'invoice' || orderPath.is_invoice || orderPath.is_shipping) && estimateId && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant={est.is_invoice ? 'default' : 'secondary'} className="text-xs">
                  {est.is_invoice ? 'Invoiced' : 'Pending Invoice'}
                </Badge>
                {est.invoice_date_created && (
                  <span className="text-xs text-muted-foreground">
                    {new Date(est.invoice_date_created).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
            <InvoiceUploadCard
              estimateId={estimateId}
              canUpload={!orderPath.archived}
            />
          </div>
        )}

        {/* Receipt Section */}
        {(currentStage === 'receipt' || orderPath.is_receipt || orderPath.is_invoice) && estimateId && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant={est.is_receipt ? 'default' : 'secondary'} className="text-xs">
                  {est.is_receipt ? 'Received' : 'Pending Receipt'}
                </Badge>
                {est.receipt_date_created && (
                  <span className="text-xs text-muted-foreground">
                    {new Date(est.receipt_date_created).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
            <ReceiptUploadCard
              estimateId={estimateId}
              canUpload={!orderPath.archived}
            />
          </div>
        )}

        {/* Fulfilled Status */}
        {orderPath.marked_fulfilled && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 text-green-600">
                <PackageCheck className="h-4 w-4" />
                Order Fulfilled
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              {est.marked_fulfilled_date_created && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fulfilled Date</span>
                  <span>{new Date(est.marked_fulfilled_date_created).toLocaleDateString()}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Stage Action Buttons */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {currentStage === 'approved' && !orderPath.is_order && (
                <Button onClick={() => setConvertDialogOpen(true)} disabled={convertMutation.isPending}>
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  {convertMutation.isPending ? 'Converting...' : 'Convert to Order'}
                </Button>
              )}

              {orderPath.is_shipping && !orderPath.is_invoice && (
                <Button onClick={handleMarkInvoice} disabled={invoiceMutation.isPending}>
                  <FileText className="h-4 w-4 mr-2" />
                  {invoiceMutation.isPending ? 'Marking...' : 'Mark Invoice'}
                </Button>
              )}

              {orderPath.is_invoice && !orderPath.is_receipt && (
                <Button onClick={handleMarkReceipt} disabled={receiptMutation.isPending}>
                  <Receipt className="h-4 w-4 mr-2" />
                  {receiptMutation.isPending ? 'Marking...' : 'Mark Receipt'}
                </Button>
              )}

              {orderPath.is_receipt && !orderPath.marked_fulfilled && (
                <Button onClick={() => setFulfilledDialogOpen(true)} disabled={fulfilledMutation.isPending}>
                  <PackageCheck className="h-4 w-4 mr-2" />
                  {fulfilledMutation.isPending ? 'Marking...' : 'Mark Fulfilled'}
                </Button>
              )}

              {!orderPath.archived && isAdmin && (
                <Button
                  variant="destructive"
                  onClick={() => setArchiveDialogOpen(true)}
                  disabled={archiveMutation.isPending}
                >
                  <Archive className="h-4 w-4 mr-2" />
                  {archiveMutation.isPending ? 'Archiving...' : 'Archive'}
                </Button>
              )}

              {orderPath.archived && isAdmin && (
                <Button
                  variant="outline"
                  onClick={() => setUnarchiveDialogOpen(true)}
                  disabled={unarchiveMutation.isPending}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  {unarchiveMutation.isPending ? 'Restoring...' : 'Restore'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        {(isSU ? (est as EstimateSU).su_notes : (est as EstimateREU).reu_notes) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">
                {isSU ? (est as EstimateSU).su_notes : (est as EstimateREU).reu_notes}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Signature Modals */}
      <SignatureModal
        open={signatureModalOpen}
        onOpenChange={setSignatureModalOpen}
        onConfirm={handleApprove}
        title="Sign & Approve Estimate"
        existingSignature={isSU ? (est as EstimateSU).su_signature : (est as EstimateREU).reu_signature}
      />

      <SignatureModal
        open={adminSignatureModalOpen}
        onOpenChange={setAdminSignatureModalOpen}
        onConfirm={handleAdminApprove}
        title="Admin Authorization Signature"
        isAdmin
        existingSignature={est.admin_signature}
      />

      {/* Shipping Form Modal */}
      <ShippingFormModal
        open={shippingModalOpen}
        onOpenChange={(open) => {
          setShippingModalOpen(open);
          if (!open) setEditingShipping(null);
        }}
        onSubmit={handleShippingSubmit}
        isLoading={shippingMutation.isPending}
        mode={editingShipping ? 'edit' : 'create'}
        defaultValues={editingShipping ? {
          sender_company_name: editingShipping.sender_company_name ?? '',
          sender_tracking_link: editingShipping.sender_tracking_link ?? '',
          sender_address1: editingShipping.sender_address1 ?? '',
          sender_address2: editingShipping.sender_address2 ?? '',
          sender_city: editingShipping.sender_city ?? '',
          sender_state: editingShipping.sender_state ?? '',
          sender_zip_code: editingShipping.sender_zip_code ?? '',
          sender_country: editingShipping.sender_country ?? 'USA',
          sender_phone: editingShipping.sender_phone ?? '',
          receiver_company_name: editingShipping.receiver_company_name ?? '',
          receiver_name: editingShipping.receiver_name ?? '',
          receiver_address1: editingShipping.receiver_address1 ?? '',
          receiver_address2: editingShipping.receiver_address2 ?? '',
          receiver_city: editingShipping.receiver_city ?? '',
          receiver_state: editingShipping.receiver_state ?? '',
          receiver_zip_code: editingShipping.receiver_zip_code ?? '',
          receiver_country: editingShipping.receiver_country ?? 'USA',
          receiver_phone: editingShipping.receiver_phone ?? '',
          notes: editingShipping.notes ?? '',
          shipping_reference: editingShipping.shipping_reference ?? '',
        } : undefined}
      />

      {/* Confirmation Dialogs */}
      <AlertDialog open={convertDialogOpen} onOpenChange={setConvertDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Convert to Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to convert this estimate to an order? This action will assign an order UID and move it to the order stage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConvertToOrder}>
              Convert to Order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={fulfilledDialogOpen} onOpenChange={setFulfilledDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark as Fulfilled</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to mark this order as fulfilled? This indicates that all items have been delivered and the order is complete.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleMarkFulfilled}>
              Mark Fulfilled
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Estimate</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to archive this estimate? It will be moved to the archived section and hidden from active lists.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleArchive}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={unarchiveDialogOpen} onOpenChange={setUnarchiveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Estimate</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to restore this estimate? It will be moved back to the active section.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnarchive}>
              Restore
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
