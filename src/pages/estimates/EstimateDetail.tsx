import { useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EstimateStageStepper } from '@/components/estimates/EstimateStageStepper';
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
} from '@/hooks/use-estimates';
import { useAuth } from '@/hooks/useAuth';
import type { EstimateTableType, EstimateSU, EstimateREU } from '@/types/database';
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

  const [signatureText, setSignatureText] = useState('');

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

  const handleApprove = () => {
    if (!estimateId || !signatureText) return;
    approveMutation.mutate({ estimateId, tableType, signatureText });
    setSignatureText('');
  };

  const handleAdminApprove = () => {
    if (!estimateId || !signatureText) return;
    adminApproveMutation.mutate({
      estimateId,
      tableType,
      adminSignatureText: signatureText,
    });
    setSignatureText('');
  };

  const handleConvertToOrder = () => {
    if (!estimateId) return;
    convertMutation.mutate({ estimateId, tableType });
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
  };

  const handleArchive = () => {
    if (!estimateId) return;
    if (confirm('Are you sure you want to archive this estimate?')) {
      archiveMutation.mutate({ estimateId, tableType });
    }
  };

  const headerActions = (
    <>
      {isAdmin && !orderPath.archived && (
        <Button variant="outline" size="sm" onClick={handleArchive}>
          <Archive className="h-4 w-4 mr-2" />
          Archive
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
              <div className="space-y-2">
                <Label>Signature Text</Label>
                <Input
                  value={signatureText}
                  onChange={(e) => setSignatureText(e.target.value)}
                  placeholder="Type your full name as signature"
                />
              </div>
              <div className="flex gap-3">
                {(userType === 'Su' || userType === 'Reu') && (
                  <Button
                    onClick={handleApprove}
                    disabled={!signatureText || approveMutation.isPending}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {approveMutation.isPending ? 'Approving...' : 'Approve'}
                  </Button>
                )}
                {isAdmin && (
                  <Button
                    variant="outline"
                    onClick={handleAdminApprove}
                    disabled={!signatureText || adminApproveMutation.isPending}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {adminApproveMutation.isPending ? 'Approving...' : 'Admin Approve'}
                  </Button>
                )}
              </div>

              {/* Existing signatures */}
              <div className="space-y-2 pt-2 border-t border-border">
                {isSU && (est as EstimateSU).su_signature && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">SU Signature: </span>
                    <span className="font-medium italic">
                      {(est as EstimateSU).su_signature}
                    </span>
                    {(est as EstimateSU).su_signature_date && (
                      <span className="text-muted-foreground ml-2">
                        ({new Date((est as EstimateSU).su_signature_date!).toLocaleDateString()})
                      </span>
                    )}
                  </div>
                )}
                {!isSU && (est as EstimateREU).reu_signature && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">REU Signature: </span>
                    <span className="font-medium italic">
                      {(est as EstimateREU).reu_signature}
                    </span>
                    {(est as EstimateREU).reu_signature_date && (
                      <span className="text-muted-foreground ml-2">
                        (
                        {new Date(
                          (est as EstimateREU).reu_signature_date!
                        ).toLocaleDateString()}
                        )
                      </span>
                    )}
                  </div>
                )}
                {est.admin_signature && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Admin Signature: </span>
                    <span className="font-medium italic">{est.admin_signature}</span>
                    {est.admin_signature_date && (
                      <span className="text-muted-foreground ml-2">
                        ({new Date(est.admin_signature_date).toLocaleDateString()})
                      </span>
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
        {(currentStage === 'shipping' || orderPath.is_shipping) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Truck className="h-4 w-4" />
                Shipping
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping Status</span>
                <span>{est.shipping_status ?? 'Pending'}</span>
              </div>
              {est.shipping_date_created && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping Created</span>
                  <span>{new Date(est.shipping_date_created).toLocaleDateString()}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Invoice Section */}
        {(currentStage === 'invoice' || orderPath.is_invoice) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Invoice
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Invoiced</span>
                <Badge variant={est.is_invoice ? 'default' : 'secondary'} className="text-xs">
                  {est.is_invoice ? 'Yes' : 'No'}
                </Badge>
              </div>
              {est.invoice_date_created && (
                <div className="flex justify-between mt-2">
                  <span className="text-muted-foreground">Invoice Date</span>
                  <span>{new Date(est.invoice_date_created).toLocaleDateString()}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Receipt Section */}
        {(currentStage === 'receipt' || orderPath.is_receipt) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                Receipt
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Receipt</span>
                <Badge variant={est.is_receipt ? 'default' : 'secondary'} className="text-xs">
                  {est.is_receipt ? 'Yes' : 'No'}
                </Badge>
              </div>
              {est.receipt_date_created && (
                <div className="flex justify-between mt-2">
                  <span className="text-muted-foreground">Receipt Date</span>
                  <span>{new Date(est.receipt_date_created).toLocaleDateString()}</span>
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
                <Button onClick={handleConvertToOrder} disabled={convertMutation.isPending}>
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
                <Button onClick={handleMarkFulfilled} disabled={fulfilledMutation.isPending}>
                  <PackageCheck className="h-4 w-4 mr-2" />
                  {fulfilledMutation.isPending ? 'Marking...' : 'Mark Fulfilled'}
                </Button>
              )}

              {!orderPath.archived && (
                <Button
                  variant="destructive"
                  onClick={handleArchive}
                  disabled={archiveMutation.isPending}
                >
                  <Archive className="h-4 w-4 mr-2" />
                  {archiveMutation.isPending ? 'Archiving...' : 'Archive'}
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
    </DashboardLayout>
  );
}
