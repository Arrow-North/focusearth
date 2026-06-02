import type { EstimateDetail } from '@/types/database';
import LogoIcon from '@/assets/LogoIconImage.png';
import { useState, forwardRef } from 'react';
import { Pencil, Check } from 'lucide-react';
import { SignatureModal } from './SignatureModal';
import { useAuth } from '@/hooks/useAuth';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';

interface OrderContentContainer {
  content: string;
  estimate: EstimateDetail;
  className?: string;
  isSU?: boolean;
}

export const OrderContentContainer = forwardRef<HTMLDivElement, OrderContentContainer>(function OrderContentContainer({
  content,
  estimate,
  className,
  isSU }, ref) {

  const [notesDraft, setNotesDraft] = useState('');
  const [salesTaxDraft, setSalesTaxDraft] = useState('');
  const [shippingCostDraft, setShippingCostDraft] = useState('');
  const [signatureModalOpen, setSignatureModalOpen] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [clientSignatureModalOpen, setClientSignatureModalOpen] = useState(false);
  const [clientSignatureData, setClientSignatureData] = useState<string | null>(null);
  const [focusEarthSignatureModalOpen, setFocusEarthSignatureModalOpen] = useState(false);
  const [focusEarthSignatureData, setFocusEarthSignatureData] = useState<string | null>(null);
  const [depositAmountDraft, setDepositAmountDraft] = useState('');
  const [depositDue, setDepositDue] = useState<Date | undefined>();
  const [remainderDue, setRemainderDue] = useState<Date | undefined>();
  const { userType } = useAuth();
  const canAuthorize = userType === 'SUPERADMIN' || userType === 'Au' || userType === 'Sa';
  const isReadOnly = content === 'order';

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

  const BILLING_INFORMATION = {
    company: 'Focus Earth',
    attn: 'Pete Musser',
    address1: '1070 Tunnel Road',
    address2: 'Building 1, Suite 10, #202',
    city: 'Asheville',
    state: 'NC',
    zip: '28805',
    country: 'USA',
    phone: '(925) 323-0053',
  };

  const subTotal = DUMMY.items.reduce((acc, item) => acc + item.amount, 0);
  const total = subTotal + (parseFloat(salesTaxDraft) || 0) + (parseFloat(shippingCostDraft) || 0);
  const remainderAmount = total - (parseFloat(depositAmountDraft) || 0);

  console.log('content', content)

  function formatCurrency(value: number) {
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return (
    <>
      <div className="tabcontent-container py-10 px-28 font-sans" style={{ background: 'rgb(245, 245, 245)' }}>
        <div ref={ref} className="bg-white rounded-lg border border-border p-9 shadow-sm overflow-hidden">
          {/* Document Header */}
          <div className="flex items-center justify-between">
            <div className="flex gap-3">
              <img src={LogoIcon} alt="Focus Earth" className="w-[8rem] object-contain" />
              <div className="leading-tight">
              </div>
            </div>
            <div className="text-right">
              <h2 className="text-3xl font-bold">
                {{ estimate: 'Estimate', order: 'Order', shipping: 'Shipping', invoice: 'Invoice', receipt: 'Receipt' }[content] ?? 'Estimate'}
              </h2>
              <p className="text-s">
                Reference # :{' '}
                <span>
                  {estimate.reference}
                </span>
              </p>
              <p>
                Date :{' '}
                <span>
                  {estimate.createdAt
                    ? new Date(estimate.createdAt).toLocaleDateString('en-US', {
                        month: '2-digit',
                        day: '2-digit',
                        year: 'numeric',
                      })
                    : 'n/a'}
                </span>
              </p>
            </div>
          </div>

          {/* Billing & Shipping Info */}
          <div className="grid grid-cols-2 mt-4">
            <div className="space-y-3 pr-3 border-r-2 border-[#9C9C9C] border-gray-200">
              <div className="bg-[#eeeeee] rounded px-3 py-2">
                <p className="font-bold">Billing Information:</p>
              </div>
              <div className="space-y-1 leading-relaxed px-1">
                <p className="font-medium">{BILLING_INFORMATION.company}</p>
                <p>Attn : {BILLING_INFORMATION.attn}</p>
                <p>{BILLING_INFORMATION.address1}</p>
                <p>{BILLING_INFORMATION.address2}</p>
                <p>{BILLING_INFORMATION.city}, {DUMMY.billing.state} {DUMMY.billing.zip}</p>
                <p>{BILLING_INFORMATION.country}</p>
                <p>{BILLING_INFORMATION.phone}</p>
              </div>
            </div>
            <div className="space-y-3 pl-3">
              <div className="bg-[#eeeeee] rounded px-3 py-2">
                <p className="font-bold">Shipping Information:</p>
              </div>
              <div className="space-y-1 leading-relaxed px-1">                    
                <p className="font-medium">
                  {estimate?.userReu?.company?.length > 0 ? estimate?.userReu?.company[0]?.name : estimate?.userReu?.associatedToCompany?.name}
                </p>
                <p>Attn : {estimate?.userReu?.firstName} {estimate?.userReu?.lastName}</p>
                <p>{estimate?.report?.project?.address}</p>
                <p>{estimate?.report?.project?.address2}</p>
                <p>{estimate?.report?.project?.city + ', ' + estimate?.report?.project?.state + ', ' + estimate?.report?.project?.zipCode}</p>
                <p>{BILLING_INFORMATION.country}</p>
                <p>
                  {
                    isSU ? (estimate?.userSu?.phone) : (estimate?.userReu?.phone)
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Order Information Table */}
          <div className="mt-10">
            <div className="bg-[#8fcf74] font-bold px-4 py-2.5 rounded-md mb-1">
              Order Information
            </div>
            <table className="w-full border-separate border-spacing-y-5">
              <thead>
                <tr>
                  <th className="text-left py-2 px-3 font-semibold text-slate-700 w-[45%]">
                    Description
                  </th>
                  <th className="text-center py-2 px-3 font-semibold text-slate-700">
                    Part Number
                  </th>
                  <th className="text-center py-2 px-3 font-semibold text-slate-700">QTY</th>
                  <th className="text-center py-2 px-3 font-semibold text-slate-700">
                    Price Per Unit
                  </th>
                  <th className="text-center py-2 px-3 font-semibold text-slate-700">Amount</th>
                </tr>
              </thead>
              <tbody>
                {DUMMY.items.map((item, i) => (
                  <tr key={i}>
                    <td className="py-3 px-3 border-y border-l border-gray-300 rounded-l-md">{item.description}</td>
                    <td className="py-3 px-3 border-y border-gray-300 text-center">{item.partNumber}</td>
                    <td className="py-3 px-3 text-center text-slate-700 border-y border-gray-300 text-center">{item.qty}</td>
                    <td className="py-3 px-3 text-slate-700 border-y border-gray-300 text-center">
                      ${item.pricePerUnit}
                    </td>
                    <td className="py-3 px-3 pr-[3.5rem] text-right font-medium text-slate-800 border-y border-r border-gray-300 rounded-r-md">
                      {formatCurrency(item.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Sub Total */}
          <div className="flex justify-end pb-2">
            <div className="flex items-center justify-between text-sm font-bold text-slate-800 border-2 border-[#8fcf74] rounded px-[3.5rem] py-4 w-[50%]">
              <span>Sub Total:</span>
              <span>{formatCurrency(subTotal)}</span>
            </div>
          </div>

          {/* Notes + Totals */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="font-bold text-[#2c628d] mb-1">Notes:</p>
              <textarea
                value={notesDraft}
                onChange={(e) => !isReadOnly && setNotesDraft(e.target.value)}
                readOnly={isReadOnly}
                className={`w-full h-28 border border-border rounded p-2 resize-none focus:outline-none focus:ring-1 focus:ring-primary ${isReadOnly ? 'bg-gray-50 cursor-default' : 'bg-white'}`}
              />
            </div>
            <div className="flex flex-col justify-end gap-2">
              <div className="flex items-center justify-end">
                <span className="text-[#2c628d] font-bold mr-8">Sales Tax:</span>
                <div className="flex items-center border-2 rounded overflow-hidden w-32">
                  <span className="shrink-0 text-[#2c628d] px-2 bg-white border-green-500 py-1.5">
                    $
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={salesTaxDraft}
                    onChange={(e) => setSalesTaxDraft(e.target.value.replace(/[^0-9.]/g, ''))}
                    readOnly={isReadOnly}
                    className={`flex-1 min-w-0 py-1.5 pr-2 pl-1 text-left focus:outline-none text-[#2c628d] ${isReadOnly ? 'bg-gray-50 cursor-default' : ''}`}
                  />
                </div>
              </div>
              <div className="flex items-center justify-end">
                <span className="text-[#2c628d] font-bold mr-8">Shipping:</span>
                <div className="flex items-center border-2 rounded overflow-hidden w-32">
                  <span className="shrink-0 px-2 text-slate-400 bg-white py-1.5 text-[#2c628d]">
                    $
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={shippingCostDraft}
                    onChange={(e) => setShippingCostDraft(e.target.value.replace(/[^0-9.]/g, ''))}
                    readOnly={isReadOnly}
                    className={`flex-1 min-w-0 py-1.5 pr-2 pl-1 text-left focus:outline-none text-[#2c628d] ${isReadOnly ? 'bg-gray-50 cursor-default' : ''}`}
                  />
                </div>
              </div>
              <div className="flex items-center justify-end mt-1">
                <span className="font-bold text-[#2c628d] mr-8">Total:</span>
                <div className="border-2 border-[#8fcf74] rounded px-3 py-1.5 w-32 text-left font-bold text-green-600 text-sm">
                  {formatCurrency(total)}
                </div>
              </div>
            </div>
          </div>
          {!isSU && (
            <div className="grid grid-cols-2 gap-8 pt-6">
              {/* Left: Static payment info */}
              <div className="space-y-4 text-xs">
                <div className="flex gap-4">
                  <span className="font-bold whitespace-nowrap w-44 shrink-0">Payment Terms:</span>
                  <span>
                    50% Deposit due upon order placement<br />
                    50% Remainder due upon Delivery
                  </span>
                </div>
                <div className="flex gap-4">
                  <span className="font-bold whitespace-nowrap w-44 shrink-0">Make Checks Payable To:</span>
                  <span className="text-[#619c48]">Focus Earth</span>
                </div>
                <div className="flex gap-4">
                  <span className="font-bold whitespace-nowrap w-44 shrink-0">Mail To:</span>
                  <span>
                    1070 Tunnel Road<br />
                    Building 1, Suite 10, #202<br />
                    Asheville, NC 28805
                  </span>
                </div>
                <div className="flex gap-4">
                  <span className="font-bold whitespace-nowrap w-44 shrink-0">Electronic Payment:</span>
                  <span>Email accounting@focusearth.com</span>
                </div>
              </div>

              {/* Right: Editable deposit/remainder fields */}
              <div className="space-y-3">
                <div className="flex items-center justify-end gap-8">
                  <span className="font-bold text-[#2c628d] w-36 text-right shrink-0">Deposit Amount:</span>
                  <div className="flex items-center border-2 rounded overflow-hidden w-32">
                    <span className="shrink-0 text-[#2c628d] px-2 bg-white border-green-500 py-1.5">$</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={depositAmountDraft}
                      onChange={(e) => !isReadOnly && setDepositAmountDraft(e.target.value.replace(/[^0-9.]/g, ''))}
                      readOnly={isReadOnly}
                      className={`flex-1 min-w-0 py-1.5 pr-2 pl-1 text-left focus:outline-none text-[#2c628d] ${isReadOnly ? 'bg-gray-50 cursor-default' : ''}`}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-end gap-8">
                  <span className="font-bold text-[#2c628d] w-36 text-right shrink-0">Deposit Due:</span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        disabled={isReadOnly}
                        className={`w-32 border-2 rounded px-3 py-1.5 text-left text-slate-400 focus:outline-none ${isReadOnly ? 'bg-gray-50 cursor-default' : ''}`}
                      >
                        {depositDue ? depositDue.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : 'Select a date'}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={depositDue} onSelect={setDepositDue} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="flex items-center justify-end gap-8">
                  <span className="font-bold text-[#2c628d] w-40 text-right shrink-0">Remainder Amount:</span>
                  <div className="flex items-center border-2 rounded overflow-hidden w-32">
                    <span className="shrink-0 text-[#2c628d] px-2 bg-white border-green-500 py-1.5">$</span>
                    <input
                      type="text"
                      readOnly
                      value={remainderAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      className="flex-1 min-w-0 py-1.5 pr-2 pl-1 text-left focus:outline-none text-[#2c628d] bg-gray-50 cursor-default"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-end gap-8">
                  <span className="font-bold text-[#2c628d] w-36 text-right shrink-0">Remainder Due:</span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        disabled={isReadOnly}
                        className={`w-32 border-2 rounded px-3 py-1.5 text-left text-slate-400 focus:outline-none ${isReadOnly ? 'bg-gray-50 cursor-default' : ''}`}
                      >
                        {remainderDue ? remainderDue.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : 'Select a date'}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={remainderDue} onSelect={setRemainderDue} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
          )}

          {/* Supplier Authorization and Admin Authorization */}
          {
            isSU && (content === 'estimate' || content === 'order') ?
            <>
            <div className="relative mt-10">
              <div className="absolute inset-x-5 top-1/2 -translate-y-1/2 border-t border-1 border-[#222222]" />
              <div className="relative flex justify-center">
                <span className="bg-white px-8 font-semibold tracking-widest uppercase">
                  {
                    content === 'estimate' ? 'Supplier Authorization' : 'Focus Earth Authorization'
                  }
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-12 mt-10 px-5 pb-6">
              <div className="flex items-center gap-8">
                <label className="font-medium whitespace-nowrap text-[#2c628d] shrink-0">
                  Print Name:
                </label>
                {
                  content === 'estimate' ?
                  <input
                    type="text"
                    readOnly
                    value={`${estimate?.userSu?.firstName ?? ''} ${estimate?.userSu?.lastName ?? ''}`.trim()}
                    className="flex-1 min-w-0 border border-border rounded px-2 py-1.5 bg-gray-50 cursor-default focus:outline-none"
                  />
                  :
                  <input
                    type="text"
                    readOnly
                    value={`${estimate?.userAdminConsultant?.firstName ?? ''} ${estimate?.userAdminConsultant?.lastName ?? ''}`.trim()}
                    className="flex-1 min-w-0 border border-border rounded px-2 py-1.5 bg-gray-50 cursor-default focus:outline-none"
                  />

                }

              </div>
              <div className="flex items-center gap-8">
                <label className="font-medium whitespace-nowrap text-[#2c628d] shrink-0">
                  Signature:
                </label>
                <button
                  onClick={() => setSignatureModalOpen(true)}
                  className="flex-1 min-w-0 border border-border rounded px-2 py-1.5 hover:bg-slate-50 flex items-center justify-between gap-2"
                >
                  {signatureData && (
                    <img
                      src={signatureData}
                      alt="signature"
                      className="h-6 max-w-[120px] object-contain"
                    />
                  )}
                  <span className="rounded-full border border-slate-400 p-1 flex items-center justify-center ml-auto shrink-0">
                    <Pencil className="h-3 w-3 text-slate-400" />
                  </span>
                </button>
              </div>
              <div className="flex items-center gap-8">
                <label className="font-medium whitespace-nowrap text-[#2c628d] shrink-0">
                  Date:
                </label>
                <input
                  type="text"
                  readOnly
                  value={
                    estimate.suSignatureDate
                      ? new Date(estimate.suSignatureDate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
                      : new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
                  }
                  className="flex-1 min-w-0 border border-border rounded px-2 py-1.5 bg-gray-50 cursor-default focus:outline-none"
                />
              </div>
            </div>
            {canAuthorize && content === 'order' && (
              <div className="grid grid-cols-3 gap-12 px-5 pb-4">
                <div className="col-start-3 flex items-center gap-8">
                  <span className="font-medium whitespace-nowrap text-[#2c628d] shrink-0 invisible">Date:</span>
                  <button
                    className="flex-1 min-w-0 flex items-center justify-center gap-1 bg-[#4a7c3f] hover:bg-[#3d6835] text-white text-sm font-semibold px-5 py-2 rounded transition-colors"
                  >
                    <Check className="h-4 w-4" />
                    Authorize
                  </button>
                </div>
              </div>
            )}
            </>
            :
            <>
            {!isSU && content === 'order' && (
              <>
                {/* Client Authorization */}
                <div className="relative mt-10">
                  <div className="absolute inset-x-5 top-1/2 -translate-y-1/2 border-t border-1 border-[#222222]" />
                  <div className="relative flex justify-center">
                    <span className="bg-white px-8 font-semibold tracking-widest uppercase">
                      Client Authorization
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-12 mt-10 px-5 pb-6">
                  <div className="flex items-center gap-8">
                    <label className="font-medium whitespace-nowrap text-[#2c628d] shrink-0">
                      Print Name:
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={`${estimate?.userReu?.firstName ?? ''} ${estimate?.userReu?.lastName ?? ''}`.trim()}
                      className="flex-1 min-w-0 border border-border rounded px-2 py-1.5 bg-gray-50 cursor-default focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-8">
                    <label className="font-medium whitespace-nowrap text-[#2c628d] shrink-0">
                      Signature:
                    </label>
                    <button
                      onClick={() => setClientSignatureModalOpen(true)}
                      className="flex-1 min-w-0 border border-border rounded px-2 py-1.5 hover:bg-slate-50 flex items-center justify-between gap-2"
                    >
                      {clientSignatureData && (
                        <img src={clientSignatureData} alt="client signature" className="h-6 max-w-[120px] object-contain" />
                      )}
                      <span className="rounded-full border border-slate-400 p-1 flex items-center justify-center ml-auto shrink-0">
                        <Pencil className="h-3 w-3 text-slate-400" />
                      </span>
                    </button>
                  </div>
                  <div className="flex items-center gap-8">
                    <label className="font-medium whitespace-nowrap text-[#2c628d] shrink-0">
                      Date:
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}
                      className="flex-1 min-w-0 border border-border rounded px-2 py-1.5 bg-gray-50 cursor-default focus:outline-none"
                    />
                  </div>
                </div>

                {/* Focus Earth Authorization */}
                <div className="relative mt-4">
                  <div className="absolute inset-x-5 top-1/2 -translate-y-1/2 border-t border-1 border-[#222222]" />
                  <div className="relative flex justify-center">
                    <span className="bg-white px-8 font-semibold tracking-widest uppercase">
                      Focus Earth Authorization
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-12 mt-10 px-5 pb-6">
                  <div className="flex items-center gap-8">
                    <label className="font-medium whitespace-nowrap text-[#2c628d] shrink-0">
                      Print Name:
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={`${estimate?.userAdminConsultant?.firstName ?? ''} ${estimate?.userAdminConsultant?.lastName ?? ''}`.trim()}
                      className="flex-1 min-w-0 border border-border rounded px-2 py-1.5 bg-gray-50 cursor-default focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-8">
                    <label className="font-medium whitespace-nowrap text-[#2c628d] shrink-0">
                      Signature:
                    </label>
                    <button
                      onClick={() => setFocusEarthSignatureModalOpen(true)}
                      className="flex-1 min-w-0 border border-border rounded px-2 py-1.5 hover:bg-slate-50 flex items-center justify-between gap-2"
                    >
                      {focusEarthSignatureData && (
                        <img src={focusEarthSignatureData} alt="focus earth signature" className="h-6 max-w-[120px] object-contain" />
                      )}
                      <span className="rounded-full border border-slate-400 p-1 flex items-center justify-center ml-auto shrink-0">
                        <Pencil className="h-3 w-3 text-slate-400" />
                      </span>
                    </button>
                  </div>
                  <div className="flex items-center gap-8">
                    <label className="font-medium whitespace-nowrap text-[#2c628d] shrink-0">
                      Date:
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}
                      className="flex-1 min-w-0 border border-border rounded px-2 py-1.5 bg-gray-50 cursor-default focus:outline-none"
                    />
                  </div>
                </div>
                {canAuthorize && (
                  <div className="grid grid-cols-3 gap-12 px-5 pb-4">
                    <div className="col-start-3 flex items-center gap-8">
                      <span className="font-medium whitespace-nowrap text-[#2c628d] shrink-0 invisible">Date:</span>
                      <button
                        className="flex-1 min-w-0 flex items-center justify-center gap-1 bg-[#4a7c3f] hover:bg-[#3d6835] text-white text-sm font-semibold px-5 py-2 rounded transition-colors"
                      >
                        <Check className="h-4 w-4" />
                        Authorize
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
            </>
          }
        </div>
      </div>

      <SignatureModal
        isOpen={signatureModalOpen}
        onClose={() => setSignatureModalOpen(false)}
        onAuthorize={(dataUrl) => {
          setSignatureData(dataUrl);
          setSignatureModalOpen(false);
        }}
      />
      <SignatureModal
        isOpen={clientSignatureModalOpen}
        onClose={() => setClientSignatureModalOpen(false)}
        onAuthorize={(dataUrl) => {
          setClientSignatureData(dataUrl);
          setClientSignatureModalOpen(false);
        }}
      />
      <SignatureModal
        isOpen={focusEarthSignatureModalOpen}
        onClose={() => setFocusEarthSignatureModalOpen(false)}
        onAuthorize={(dataUrl) => {
          setFocusEarthSignatureData(dataUrl);
          setFocusEarthSignatureModalOpen(false);
        }}
      />
    </>
  );
});
