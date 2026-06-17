import { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SignatureModal } from '@/components/estimates/SignatureModal';
import { ShareModal } from '@/components/estimates/ShareModal';
import { ShippingFormModal } from '@/components/estimates/ShippingFormModal';
import { ShippingDetailCard } from '@/components/estimates/ShippingDetailCard';
import { InvoiceUploadCard } from '@/components/estimates/InvoiceUploadCard';
import { ReceiptUploadCard } from '@/components/estimates/ReceiptUploadCard';
import { OrderContentContainer } from '@/components/estimates/OrderContentContainer';
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
  Download,
  CloudDownload,
  Pencil,
  CheckCircle,
  ShoppingCart,
  Truck,
  FileText,
  Receipt,
  PackageCheck,
  Archive,
  RotateCcw,
  Plus,
  Users,
  ArrowRight,
  Package,
} from 'lucide-react';

// --- Dummy data (replace with real data when API is ready) ---
const DUMMY = {
  proposal: 'Order Sample Flow',
  date: '05/21/2026',
  generatedBy: 'Pete Musser',
  billing: {
    company: 'Focus Earth',
    attn: 'Pete Musser',
    address1: '1070 Tunnel Road',
    address2: 'Building 1, Suite 10, #202',
    city: 'Asheville',
    state: 'NC',
    zip: '28805',
    country: 'USA',
    phone: '(925) 323-0053',
  },
  shipping: {
    company: 'Focus Earth Real Estate',
    attn: 'Pete REU Musser',
    address1: '707 Shining Street',
    address2: 'Building 7',
    city: 'San Diego',
    state: 'CA',
    zip: '92037',
    country: 'USA',
    phone: '925-323-0053',
  },
  items: [
    {
      description: '6.0"x6" Can Acryle 10W 1000L 3500k 83CRI 7ETA',
      partNumber: 'F ABC1O8',
      qty: 100,
      pricePerUnit: 22.5,
      amount: 2250.0,
    },
    {
      description: '6"x6" Metal Halide E 40 40W 400L OtherK 90CRI 34ETA',
      partNumber: 'L ABC1S3',
      qty: 350,
      pricePerUnit: 5,
      amount: 1750.0,
    },
  ],
  subTotal: 4000.0,
  total: 4000.0,
  printName: 'Pete SU Musser',
  signatureDate: '05/23/2026',
};


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

  console.log('estimate', estimate);

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

  const [signatureModalOpen, setSignatureModalOpen] = useState(false);
  const [adminSignatureModalOpen, setAdminSignatureModalOpen] = useState(false);
  const [shippingModalOpen, setShippingModalOpen] = useState(false);
  const [editingShipping, setEditingShipping] = useState<ShippingDetail | null>(null);

  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [fulfilledDialogOpen, setFulfilledDialogOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [unarchiveDialogOpen, setUnarchiveDialogOpen] = useState(false);

  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [notesDraft, setNotesDraft] = useState('');
  const [salesTaxDraft, setSalesTaxDraft] = useState('');
  const [shippingCostDraft, setShippingCostDraft] = useState('');

  const contentRef = useRef<HTMLDivElement>(null);

  if (estLoading || pathLoading) {
    return (
      <DashboardLayout title={<span>Orders / Estimate</span>}>
        <div className="space-y-4 py-10 px-28">
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
          <div className="h-64 bg-muted animate-pulse rounded-lg" />
        </div>
      </DashboardLayout>
    );
  }

  if (!estimate || !orderPath) {
    return (
      <DashboardLayout title={<span>Orders / Estimate Not Found</span>}>
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg font-medium">Estimate not found</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>
            Go Back
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const est = estimate;
  
  const currentStage = orderPath.current_stage;
  const effectiveTab = activeTab ?? currentStage ?? 'estimate';
  const basePath = isSU ? '/orders/suppliers' : '/orders/real-estate';

  const handleDownloadPDF = async () => {
    if (!contentRef.current) return;
    const canvas = await html2canvas(contentRef.current, { scale: 2, useCORS: true });
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const imgH = (canvas.height * pageW) / canvas.width;
    let remaining = imgH;
    let sourceY = 0;
    while (remaining > 0) {
      const sliceH = Math.min(remaining, pageH);
      const sliceCanvas = document.createElement('canvas');
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = (sliceH / pageW) * canvas.width;
      sliceCanvas.getContext('2d')!.drawImage(canvas, 0, sourceY * (canvas.width / pageW), canvas.width, sliceCanvas.height, 0, 0, canvas.width, sliceCanvas.height);
      pdf.addImage(sliceCanvas.toDataURL('image/png'), 'PNG', 0, 0, pageW, sliceH);
      remaining -= sliceH;
      sourceY += sliceH;
      if (remaining > 0) pdf.addPage();
    }
    pdf.save(`${effectiveTab}-${est.reference}.pdf`);
  };

  const handleApprove = (signatureDataUrl: string) => {
    if (!estimateId) return;
    approveMutation.mutate({ estimateId, tableType, signatureText: signatureDataUrl });
  };

  const handleAdminApprove = (signatureDataUrl: string) => {
    if (!estimateId) return;
    adminApproveMutation.mutate({ estimateId, tableType, adminSignatureText: signatureDataUrl });
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
    shippingMutation.mutate({ estimateId, tableType, shippingDetails: data });
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

  const canAuthorize = userType === 'Su' || userType === 'Reu';

  return (
    <DashboardLayout
      title={
        <span>
          <span>Orders</span>
          <span className="mx-2">/</span>
          <Link to={basePath} className="hover:underline">
            {isSU ? 'Supplier' : 'Real Estate'}
          </Link>
          <span className="mx-2">/</span>
          <span>
            {{ estimate: 'Estimate', order: 'Order', shipping: 'Shipping', invoice: 'Invoice', receipt: 'Receipt' }[effectiveTab] ?? 'Estimate'}
            {' / #'}
            {est.reference}
          </span>
        </span>
      }
      mainClassName="!p-0 !max-w-[1240px]"
    >
      <div className="space-y-4 p-0">
        {/* Page Header */}
        <div
          className="order-header flex items-start justify-between rounded-md"
          style={{ border: '1px solid rgb(219, 218, 218)', background: 'rgb(245, 245, 245)', padding: '2rem' }}
        >
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">{{ estimate: 'Estimate', order: 'Order', shipping: 'Shipping', invoice: 'Invoice', receipt: 'Receipt' }[effectiveTab] ?? 'Estimate'} #
                {est.reference}
            </h1>
            <div className="text-sm text-muted-foreground space-y-0.5">
              <p>
                <span className="font-medium text-foreground">Proposal :</span>{' '}
                <span className="text-primary underline cursor-pointer">{est?.report?.proposalName}</span>
              </p>
              <p>
                <span className="font-medium text-foreground">Date :</span>{' '}
                {(() => {
                  const dateMap: Record<string, string | null | undefined> = {
                    estimate: est.createdAt,
                    order: est.orderDateCreated,
                    shipping: est.shippingDateCreated,
                    invoice: est.invoiceDateCreated,
                    receipt: est.receiptDateCreated,
                  };
                  const dateVal = dateMap[effectiveTab];
                  return dateVal
                    ? new Date(dateVal).toLocaleDateString('en-US', {
                        month: '2-digit',
                        day: '2-digit',
                        year: 'numeric',
                      })
                    : 'n/a';
                })()}
              </p>
              <p>
                <span className="font-medium text-foreground">Generated By :</span>{' '}
                <span className="text-primary">{estimate?.userAdminConsultant?.firstName + ' ' + estimate?.userAdminConsultant?.lastName}</span>
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 shrink-0">
            <Button className="bg-[#2c628d] text-white gap-2 h-9 px-5 text-xs font-medium hover:bg-[#2c628d]" onClick={handleDownloadPDF}>
              <CloudDownload className="h-4 w-4" />
              Download PDF
            </Button>
            {
              effectiveTab === 'estimate' ?
              <Button
                className="bg-[#8fcf74] gap-2 h-9 px-4 text-xs text-slate-900 font-medium hover:bg-[#8fcf74]"
                onClick={() => setConvertDialogOpen(true)}
                disabled={convertMutation.isPending}
              >
                <Pencil className="h-4 w-4" />
                {convertMutation.isPending ? 'Creating...' : 'Create Order'}
              </Button>
              :
              effectiveTab === 'order'
              ?
              <Button
                className="bg-[#ff9a7a] gap-2 h-9 px-4 text-xs text-slate-900 font-medium hover:bg-[##ff9a7a]"
                disabled={convertMutation.isPending}
              >
                <Package className="h-4 w-4" />
                {convertMutation.isPending ? 'Creating...' : 'Create Shipping'}
              </Button>
              :
              ''
            }

            <Button className="bg-[#ffe68d] text-slate-900 gap-2 h-9 px-4 text-xs font-medium hover:bg-[#ffe68d]" onClick={() => setShareModalOpen(true)}>
              <Users className="h-4 w-4" />
              Share {{ estimate: 'Estimate', order: 'Order', shipping: 'Shipping', invoice: 'Invoice', receipt: 'Receipt' }[effectiveTab] ?? 'Estimate'}
            </Button>
            <Button
              variant="outline"
              className="gap-2 h-9 px-4 text-xs font-medium border-2 border-[#5f5f5f] hover:bg-transparent hover:text-current"
              onClick={() => setArchiveDialogOpen(true)}
              disabled={archiveMutation.isPending}
            >
              <Archive className="h-4 w-4" />
              {archiveMutation.isPending ? 'Archiving...' : 'Archive'}
            </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <Tabs value={effectiveTab} onValueChange={setActiveTab} className="w-full pt-10 border-none">
          <TabsList className="h-auto bg-transparent rounded-none p-0 w-full gap-0">
            {[
              { value: 'estimate', label: 'Estimate', asterisk: currentStage === 'estimate', showArrow: est.isOrder },
              { value: 'order', label: 'Order', asterisk: currentStage === 'order' },
              { value: 'shipping', label: 'Shipping' },
              { value: 'invoice', label: 'Invoice' },
              { value: 'receipt', label: 'Receipt' },
            ].map(({ value, label, asterisk, showArrow }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="relative flex-1 rounded-none border-b-4 border-transparent data-[state=active]:border-[#619C48] data-[state=active]:bg-transparent data-[state=active]:text-[#619C48] data-[state=active]:shadow-none data-[state=active]:font-bold pb-2 pt-1 text-[1.125rem] font-medium text-[#619C48]"
              >
                {label}
                {asterisk && <span className="inline-block self-start mt-1 ml-2 w-1.5 h-1.5 rounded-full bg-[#619C48] shrink-0" />}
                {showArrow && <ArrowRight className="text-[#c0c0c0] absolute right-0 top-1/2 -translate-y-1/2 h-4 w-4" />}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="estimate">
            <OrderContentContainer
              ref={contentRef}
              content="estimate"
              estimate={est}
              isSU={isSU}
            />
          </TabsContent>

          {/* Order Tab */}
          <TabsContent value="order">
            {
              est.isOrder ? (
                <OrderContentContainer
                  ref={contentRef}
                  content="order"
                  estimate={est}
                  isSU={isSU}
                />
              ) : (
                <div className="py-20 px-28 flex flex-col items-center justify-center gap-3 text-center" style={{ background: 'rgb(245, 245, 245)' }}>
                  <PackageCheck className="h-12 w-12 text-slate-300" />
                  <p className="text-slate-500 font-medium">No order has been created yet.</p>
                </div>
              )
            }
          </TabsContent>

          {/* Shipping Tab */}
          <TabsContent value="shipping" className="space-y-4 py-10 px-28">
            <div className="flex items-center justify-between">
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
                {(shippingDetails as ShippingDetail[]).map((shipping) => (
                  <ShippingDetailCard
                    key={shipping.id}
                    shipping={shipping}
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
          </TabsContent>

          {/* Invoice Tab */}
          <TabsContent value="invoice" className="space-y-4 py-10 px-28">
            <div className="flex items-center gap-3">
              {est.invoiceDateCreated && (
                <span className="text-xs text-muted-foreground">
                  {new Date(est.invoiceDateCreated).toLocaleDateString()}
                </span>
              )}
              {orderPath.is_shipping && !orderPath.is_invoice && (
                <Button
                  size="sm"
                  className="ml-auto"
                  onClick={handleMarkInvoice}
                  disabled={invoiceMutation.isPending}
                >
                  {invoiceMutation.isPending ? 'Marking...' : 'Mark Invoice'}
                </Button>
              )}
            </div>
            {estimateId && (
              <InvoiceUploadCard estimateId={estimateId} canUpload={!orderPath.archived} />
            )}
          </TabsContent>

          {/* Receipt Tab */}
          <TabsContent value="receipt" className="space-y-4 py-10 px-28">
            <div className="flex items-center gap-3">
              {est.receiptDateCreated && (
                <span className="text-xs text-muted-foreground">
                  {new Date(est.receiptDateCreated).toLocaleDateString()}
                </span>
              )}
              {orderPath.is_invoice && !orderPath.is_receipt && (
                <Button
                  size="sm"
                  className="ml-auto"
                  onClick={handleMarkReceipt}
                  disabled={receiptMutation.isPending}
                >
                  {receiptMutation.isPending ? 'Marking...' : 'Mark Receipt'}
                </Button>
              )}
            </div>
            {estimateId && (
              <ReceiptUploadCard estimateId={estimateId} canUpload={!orderPath.archived} />
            )}
            {orderPath.is_receipt && !orderPath.marked_fulfilled && (
              <div className="flex justify-end">
                <Button
                  onClick={() => setFulfilledDialogOpen(true)}
                  disabled={fulfilledMutation.isPending}
                >
                  <PackageCheck className="h-4 w-4 mr-2" />
                  {fulfilledMutation.isPending ? 'Marking...' : 'Mark Fulfilled'}
                </Button>
              </div>
            )}
            {orderPath.marked_fulfilled && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
                <PackageCheck className="h-4 w-4" />
                <span className="font-medium">Order Fulfilled</span>
                {est.markedFulfilledDateCreated && (
                  <span className="text-xs ml-1 text-emerald-600">
                    – {new Date(est.markedFulfilledDateCreated).toLocaleDateString()}
                  </span>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <ShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        label={{ estimate: 'Estimate', order: 'Order', shipping: 'Shipping', invoice: 'Invoice', receipt: 'Receipt' }[effectiveTab] ?? 'Estimate'}
        referenceId={est.reference}
      />

      {/* Signature Modals */}
      {/* <SignatureModal
        open={signatureModalOpen}
        onOpenChange={setSignatureModalOpen}
        onConfirm={handleApprove}
        title="Sign & Approve Estimate"
        existingSignature={
          isSU ? (est as EstimateSU).su_signature : (est as EstimateREU).reu_signature
        }
      />

      <SignatureModal
        open={adminSignatureModalOpen}
        onOpenChange={setAdminSignatureModalOpen}
        onConfirm={handleAdminApprove}
        title="Admin Authorization Signature"
        isAdmin
        existingSignature={est.admin_signature}
      /> */}

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
        defaultValues={
          editingShipping
            ? {
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
              }
            : undefined
        }
      />

      {/* Confirmation Dialogs */}
      <AlertDialog open={convertDialogOpen} onOpenChange={setConvertDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Convert to Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to convert this estimate to an order? This will assign an order
              UID and move it to the order stage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConvertToOrder}>Convert to Order</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={fulfilledDialogOpen} onOpenChange={setFulfilledDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark as Fulfilled</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to mark this order as fulfilled? This indicates all items have
              been delivered.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleMarkFulfilled}>Mark Fulfilled</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Estimate</AlertDialogTitle>
            <AlertDialogDescription>
              This estimate will be moved to the archived section and hidden from active lists.
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
              This estimate will be moved back to the active section.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnarchive}>Restore</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}