import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Package,
  User,
  MapPin,
  Phone,
  Mail,
  FileText,
  Truck,
  MessageCircle,
  CreditCard,
  History,
  Printer,
  Ban,
  RotateCcw,
  Send,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

import {
  useOrder,
  useUpdateOrderStatus,
  useUpdatePaymentStatus,
  useUpdateShippingDetails,
  useUpdateReturnRequest,
  useAddOrderNote,
  useCancelOrder,
  OrderStatus,
  PaymentStatus,
  ShippingStatus,
  ReturnStatus,
  RefundStatus,
} from '../../hooks/useOrders';
import {
  PageHeader,
  StatusBadge,
  ConfirmationDialog,
  LoadingState,
  ErrorState,
} from '../../components/admin/shared';

const ORDER_STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: 'Pending', label: 'Pending' },
  { value: 'Confirmed', label: 'Confirmed' },
  { value: 'Processing', label: 'Processing' },
  { value: 'Ready to ship', label: 'Ready to Ship' },
  { value: 'Shipped', label: 'Shipped' },
  { value: 'Delivered', label: 'Delivered' },
  { value: 'Cancelled', label: 'Cancelled' },
  { value: 'Refunded', label: 'Refunded' },
  /* Legacy statuses */
  { value: 'Printing', label: 'Printing (Legacy)' },
  { value: 'Quality Check', label: 'Quality Check (Legacy)' },
];

const PAYMENT_STATUS_OPTIONS: { value: PaymentStatus; label: string }[] = [
  { value: 'Pending', label: 'Pending' },
  { value: 'Paid', label: 'Paid' },
  { value: 'Failed', label: 'Failed' },
  { value: 'Refunded', label: 'Refunded' },
  { value: 'Partially refunded', label: 'Partially Refunded' },
];

const SHIPPING_STATUS_OPTIONS: { value: ShippingStatus; label: string }[] = [
  { value: 'Not shipped', label: 'Not Shipped' },
  { value: 'Ready to ship', label: 'Ready to Ship' },
  { value: 'Shipped', label: 'Shipped' },
  { value: 'In transit', label: 'In Transit' },
  { value: 'Delivered', label: 'Delivered' },
  { value: 'Returned', label: 'Returned' },
];

const RETURN_STATUS_OPTIONS: { value: ReturnStatus; label: string }[] = [
  { value: 'None', label: 'None (No Return)' },
  { value: 'Requested', label: 'Return Requested' },
  { value: 'Approved', label: 'Return Approved (Awaiting Parcel)' },
  { value: 'Received', label: 'Parcel Received at Studio' },
  { value: 'Rejected', label: 'Return Rejected' },
  { value: 'Completed', label: 'Return Completed' },
];

const REFUND_STATUS_OPTIONS: { value: RefundStatus; label: string }[] = [
  { value: 'None', label: 'None' },
  { value: 'Requested', label: 'Refund Requested' },
  { value: 'Processing', label: 'Processing' },
  { value: 'Approved', label: 'Approved' },
  { value: 'Refunded', label: 'Refunded' },
  { value: 'Rejected', label: 'Rejected' },
];

const COURIER_OPTIONS = [
  'Delhivery',
  'BlueDart',
  'DTDC',
  'India Post (Speed Post)',
  'Shadowfax',
  'Ekart',
  'Local Studio Delivery',
];

export function getCourierTrackingUrl(courier: string, awb: string): string | null {
  if (!awb || !awb.trim()) return null;
  const c = (courier || '').toLowerCase();
  const trimmedAwb = awb.trim();
  if (c.includes('delhivery')) {
    return `https://www.delhivery.com/track/package/${encodeURIComponent(trimmedAwb)}`;
  }
  if (c.includes('bluedart')) {
    return `https://www.bluedart.com/tracking`;
  }
  if (c.includes('dtdc')) {
    return `https://www.dtdc.in/tracking.asp`;
  }
  if (c.includes('india post') || c.includes('speed post')) {
    return `https://www.indiapost.gov.in/_layouts/15/dpt.cept.tracking/trackconsignment.aspx`;
  }
  if (c.includes('shadowfax')) {
    return `https://tracker.shadowfax.in/`;
  }
  if (c.includes('ekart')) {
    return `https://ekartlogistics.com/`;
  }
  return null;
}

export function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: order, isLoading, isError, refetch } = useOrder(id);

  const updateStatus = useUpdateOrderStatus();
  const updatePayment = useUpdatePaymentStatus();
  const updateShipping = useUpdateShippingDetails();
  const updateReturn = useUpdateReturnRequest();
  const addNote = useAddOrderNote();
  const cancelOrder = useCancelOrder();

  // Shipping form state
  const [shippingStatus, setShippingStatus] = useState<ShippingStatus>('Not shipped');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [courierPartner, setCourierPartner] = useState('Delhivery');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [deliveredDate, setDeliveredDate] = useState('');
  const [shippingCost, setShippingCost] = useState<number>(0);
  const [syncOrderStatus, setSyncOrderStatus] = useState(true);
  const [isUpdatingShipping, setIsUpdatingShipping] = useState(false);

  // Note form state
  const [newNoteText, setNewNoteText] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);

  // Payment update modal state
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentId, setPaymentId] = useState('');
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState<PaymentStatus>('Pending');
  const [transactionRef, setTransactionRef] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [paidAt, setPaidAt] = useState('');
  const [isUpdatingPayment, setIsUpdatingPayment] = useState(false);

  // Return & Refund modal state
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [returnStatus, setReturnStatus] = useState<ReturnStatus>('None');
  const [returnReason, setReturnReason] = useState('');
  const [returnNotes, setReturnNotes] = useState('');
  const [refundStatus, setRefundStatus] = useState<RefundStatus>('None');
  const [refundAmount, setRefundAmount] = useState<number>(0);
  const [isUpdatingReturn, setIsUpdatingReturn] = useState(false);

  // Cancel confirmation state
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason] = useState('Admin cancelled order');

  useEffect(() => {
    if (order) {
      if (order.shippingStatus) {
        setShippingStatus(order.shippingStatus);
      } else if (order.status === 'Shipped') {
        setShippingStatus('Shipped');
      } else if (order.status === 'Delivered') {
        setShippingStatus('Delivered');
      } else if (order.status === 'Ready to ship') {
        setShippingStatus('Ready to ship');
      } else {
        setShippingStatus('Not shipped');
      }

      if (order.trackingNumber) setTrackingNumber(order.trackingNumber);
      if (order.courierPartner) setCourierPartner(order.courierPartner);
      if (order.expectedDeliveryDate) setExpectedDeliveryDate(order.expectedDeliveryDate);
      if (order.deliveredDate) setDeliveredDate(order.deliveredDate);
      setShippingCost(Number(order.shippingCost ?? order.shippingFee ?? 0));

      if (order.paymentStatus) setSelectedPaymentStatus(order.paymentStatus);
      if (order.transactionRef) setTransactionRef(order.transactionRef);
      if (order.paymentMethod) setPaymentMethod(order.paymentMethod);
      if (order.paymentId) setPaymentId(order.paymentId);
      if (order.paidAt) setPaidAt(order.paidAt);

      if (order.returnStatus) setReturnStatus(order.returnStatus);
      if (order.returnReason) setReturnReason(order.returnReason);
      if (order.returnNotes) setReturnNotes(order.returnNotes);
      if (order.refundStatus) setRefundStatus(order.refundStatus);

      setRefundAmount(Number(order.refundAmount ?? order.total ?? 0));
    }
  }, [order]);

  if (isLoading) {
    return <LoadingState message="Loading order details..." />;
  }

  if (isError || !order) {
    return (
      <ErrorState
        title="Order not found"
        message="The requested order record could not be loaded from Firestore."
        onRetry={() => refetch()}
      />
    );
  }

  // Detect whether order includes custom 3D printing jobs
  const hasCustomItems = Boolean(
    order.quoteId ||
    order.items?.some((i) => i.quoteId || i.customPrint)
  );

  const handleStatusChange = async (newStatus: OrderStatus) => {
    try {
      await updateStatus.mutateAsync({
        id: order.id,
        status: newStatus,
        trackingNumber: trackingNumber || order.trackingNumber,
        courierPartner: courierPartner || order.courierPartner,
        note: `Order status set to "${newStatus}" by admin`,
      });
    } catch (error: any) {
      console.error('Failed to update status:', error);
      alert(error?.message || 'Failed to update order status');
    }
  };

  const handleSaveShipping = async () => {
    setIsUpdatingShipping(true);
    try {
      await updateShipping.mutateAsync({
        id: order.id,
        shippingStatus,
        courierPartner: courierPartner.trim(),
        trackingNumber: trackingNumber.trim(),
        shippingCost: Number(shippingCost) || 0,
        expectedDeliveryDate: expectedDeliveryDate || undefined,
        deliveredDate: deliveredDate || undefined,
        syncOrderStatus,
        note: `Shipping updated: ${shippingStatus} via ${courierPartner} (AWB: ${trackingNumber || 'N/A'})`,
      });
      alert('Fulfillment & shipping details saved successfully!');
    } catch (error: any) {
      console.error('Failed to save shipping:', error);
      alert(error?.message || 'Failed to save shipping details');
    } finally {
      setIsUpdatingShipping(false);
    }
  };

  const handleSavePayment = async () => {
    setIsUpdatingPayment(true);
    try {
      await updatePayment.mutateAsync({
        id: order.id,
        paymentId: paymentId.trim() || `PAY_${order.id.slice(0, 8).toUpperCase()}`,
        paymentStatus: selectedPaymentStatus,
        paymentMethod: paymentMethod.trim(),
        transactionRef: transactionRef.trim(),
        paidAt: paidAt || (selectedPaymentStatus === 'Paid' ? new Date().toISOString() : undefined),
        note: `Payment status manually updated to "${selectedPaymentStatus}" (${paymentMethod})`,
      });
      setPaymentModalOpen(false);
      alert('Payment details updated successfully!');
    } catch (error: any) {
      console.error('Failed to update payment:', error);
      alert(error?.message || 'Failed to update payment status');
    } finally {
      setIsUpdatingPayment(false);
    }
  };

  const handleSaveReturnAndRefund = async () => {
    setIsUpdatingReturn(true);
    try {
      await updateReturn.mutateAsync({
        id: order.id,
        returnStatus,
        returnReason: returnReason.trim(),
        returnNotes: returnNotes.trim(),
        refundAmount: Number(refundAmount) || 0,
        refundStatus,
      });
      setReturnModalOpen(false);
      alert('Return & refund record updated successfully!');
    } catch (error: any) {
      console.error('Failed to update return/refund:', error);
      alert(error?.message || 'Failed to update return/refund record');
    } finally {
      setIsUpdatingReturn(false);
    }
  };

  const handleAddInternalNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;

    setIsAddingNote(true);
    try {
      await addNote.mutateAsync({
        id: order.id,
        text: newNoteText.trim(),
        author: 'Workshop Admin',
      });
      setNewNoteText('');
    } catch (error: any) {
      console.error('Failed to add note:', error);
      alert('Failed to add internal note.');
    } finally {
      setIsAddingNote(false);
    }
  };

  const handleConfirmCancel = async () => {
    try {
      await cancelOrder.mutateAsync({
        orderId: order.id,
        reason: cancelReason,
      });
      setCancelModalOpen(false);
      alert('Order cancelled and inventory restored successfully!');
    } catch (error: any) {
      console.error('Failed to cancel order:', error);
      alert(error?.message || 'Failed to cancel order');
    }
  };

  const handlePrintInvoice = () => {
    window.print();
  };

  const trackingPortalUrl = getCourierTrackingUrl(
    order.courierPartner || courierPartner,
    order.trackingNumber || trackingNumber
  );

  const cleanPhone = (order.customerPhone || '').replace(/\D/g, '').slice(-10);
  const whatsappUrl = cleanPhone
    ? `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(
        `Hello ${order.customerName}! Update regarding your Shilp Sahayak Order #${order.id.slice(0, 8).toUpperCase()}:\n` +
        `· Order Status: ${order.status}\n` +
        `· Shipping: ${order.shippingStatus || 'Processing'}\n` +
        `· Payment: ${order.paymentStatus || 'Pending'} (₹${Number(order.total).toLocaleString('en-IN')})\n` +
        (order.trackingNumber
          ? `· Courier: ${order.courierPartner || 'Courier'} (AWB: ${order.trackingNumber})\n${
              trackingPortalUrl ? `· Track here: ${trackingPortalUrl}\n` : ''
            }`
          : '') +
        `Let us know if you have any questions!`
      )}`
    : null;

  const timeline = [...(order.timeline || [])].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  const internalNotes = [...(order.internalNotes || [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="space-y-6">
      {/* Top Header & Quick Action Buttons */}
      <div className="print:hidden">
        <PageHeader
          title={`Order #${order.id.slice(0, 8).toUpperCase()}`}
          description={`Placed on ${new Date(order.date).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })} · Channel: ${order.fulfillmentType || 'Direct Online Checkout'}`}
          breadcrumbs={[
            { label: 'Admin', href: '/admin/dashboard' },
            { label: 'Customer Orders', href: '/admin/orders' },
            { label: `#${order.id.slice(0, 8).toUpperCase()}` },
          ]}
          actions={
            <>
              <Link
                to="/admin/orders"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-line bg-white hover:bg-shell text-xs font-semibold text-ink transition-colors shadow-xs"
              >
                <ArrowLeft className="w-4 h-4 text-muted" />
                <span>All Orders</span>
              </Link>

              {whatsappUrl && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-xs font-semibold font-mono transition-colors shadow-xs"
                  title="Send dispatch / status WhatsApp message to customer"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-600" />
                  <span>WhatsApp Customer</span>
                </a>
              )}

              <button
                type="button"
                onClick={handlePrintInvoice}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-line bg-white hover:bg-shell text-xs font-semibold text-ink transition-colors shadow-xs cursor-pointer"
                title="Print official GST tax invoice"
              >
                <Printer className="w-4 h-4 text-accent" />
                <span>Print Invoice</span>
              </button>

              {order.quoteId && (
                <Link
                  to="/admin/quotes"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 text-xs font-semibold font-mono transition-colors shadow-xs"
                  title="Inspect linked custom CAD quote request"
                >
                  <FileText className="w-4 h-4" />
                  <span>Linked CAD Quote</span>
                </Link>
              )}
            </>
          }
        />
      </div>

      {/* Main Grid: Order Details vs Actions & Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 print:hidden">
        {/* Left 8 Cols: Order items, customer info, fulfillment */}
        <div className="lg:col-span-8 space-y-6">
          {/* Status & Quick Action Alert Banner */}
          <div className="rounded-xl border border-line bg-white p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="space-y-0.5">
                <span className="font-mono text-[10px] uppercase font-bold text-muted block">
                  Fulfillment & Status Overview
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={order.status} type="order" showDot />
                  <StatusBadge
                    status={order.paymentStatus || 'Pending'}
                    type="payment"
                  />
                  <StatusBadge
                    status={order.shippingStatus || 'Not shipped'}
                    type="shipping"
                    showDot
                  />
                  {order.returnStatus && order.returnStatus !== 'None' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-50 text-amber-800 border border-amber-200 font-mono text-[10px] font-bold">
                      <RotateCcw className="w-3 h-3" />
                      Return: {order.returnStatus}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-semibold text-muted">
                  Update Status:
                </span>
                <select
                  value={order.status}
                  onChange={(e) =>
                    handleStatusChange(e.target.value as OrderStatus)
                  }
                  className="py-1.5 px-3 text-xs font-mono font-semibold text-ink bg-white border border-line rounded-lg outline-none focus:border-accent cursor-pointer shadow-xs"
                >
                  {ORDER_STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => setPaymentModalOpen(true)}
                className="px-3 py-1.5 text-xs font-mono font-semibold rounded-lg border border-line bg-white hover:bg-shell text-ink transition-colors cursor-pointer flex items-center gap-1"
              >
                <CreditCard className="w-3.5 h-3.5 text-accent" />
                <span>Payment Details</span>
              </button>

              <button
                type="button"
                onClick={() => setReturnModalOpen(true)}
                className="px-3 py-1.5 text-xs font-mono font-semibold rounded-lg border border-line bg-white hover:bg-shell text-ink transition-colors cursor-pointer flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                <span>Return & Refund</span>
              </button>

              {order.status !== 'Cancelled' && order.status !== 'Refunded' && (
                <button
                  type="button"
                  onClick={() => setCancelModalOpen(true)}
                  className="px-3 py-1.5 text-xs font-mono font-semibold rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Ban className="w-3.5 h-3.5 text-rose-600" />
                  <span>Cancel Order</span>
                </button>
              )}
            </div>
          </div>

          {/* Bespoke Custom Print Item Notice */}
          {hasCustomItems && (
            <div className="rounded-xl border border-purple-200 bg-purple-50/70 p-4 text-xs font-sans text-purple-900 flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-bold font-display text-xs">
                  Bespoke Fabrication Order · Custom 3D Printing Policy
                </p>
                <p className="text-[11px] text-purple-700 leading-relaxed">
                  This order contains custom 3D printed components manufactured to unique customer CAD models. Under Shilp Sahayak policy, custom fabricated parts are bespoke and non-returnable once printing has commenced, unless a material defect or transit damage occurred.
                </p>
              </div>
            </div>
          )}

          {/* Refunded Notice Card */}
          {Number(order.refundAmount) > 0 && (
            <div className="rounded-xl border border-purple-200 bg-purple-50/70 p-4 text-xs font-sans text-purple-900 flex items-center justify-between">
              <div>
                <p className="font-bold font-display text-sm">
                  Refund Recorded: ₹{Number(order.refundAmount).toLocaleString('en-IN')}
                </p>
                <p className="text-[11px] text-purple-700 mt-0.5">
                  {order.refundReason ? `Reason: "${order.refundReason}". ` : ''}
                  {order.refundStatus ? `Refund Status: ${order.refundStatus}. ` : ''}
                  {order.refundedAt ? `Recorded on ${new Date(order.refundedAt).toLocaleString('en-IN')}` : ''}
                </p>
              </div>
              <StatusBadge status={order.paymentStatus || 'Refunded'} type="payment" />
            </div>
          )}

          {/* Line Items Card */}
          <div className="rounded-xl border border-line bg-white shadow-xs overflow-hidden">
            <div className="p-4 border-b border-line bg-shell/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-accent" />
                <h3 className="font-display font-bold text-sm text-ink uppercase tracking-wider">
                  Order Line Items
                </h3>
              </div>
              <span className="font-mono text-xs text-muted font-bold">
                {order.items?.length || 0} items
              </span>
            </div>

            <div className="divide-y divide-line">
              {(order.items || []).map((item, idx) => (
                <div
                  key={`${item.productId}-${idx}`}
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-shell/20 transition-colors"
                >
                  <div className="space-y-1.5">
                    <p className="text-sm font-bold text-ink">
                      {item.productName}
                    </p>
                    {item.variantLabel && (
                      <p className="font-mono text-xs text-muted">
                        Variant:{' '}
                        <span className="text-ink font-semibold">
                          {item.variantLabel}
                        </span>
                      </p>
                    )}
                    {item.customNotes && (
                      <p className="text-xs text-muted italic bg-shell p-2 rounded-lg border border-line max-w-lg">
                        Note: "{item.customNotes}"
                      </p>
                    )}
                    {item.customPrint && (
                      <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-purple-50 text-purple-800 font-mono text-[10px] font-bold border border-purple-200">
                        <span>Custom 3D Print Job</span>
                        {item.customPrint.material && (
                          <span>· {item.customPrint.material}</span>
                        )}
                        {item.customPrint.color && (
                          <span>· {item.customPrint.color}</span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-8 text-xs font-mono shrink-0">
                    <div>
                      <span className="text-[10px] text-muted uppercase block">
                        Rate
                      </span>
                      <span className="font-semibold text-ink">
                        ₹{Number(item.price || 0).toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-muted uppercase block">
                        Qty
                      </span>
                      <span className="font-bold text-ink">
                        {item.quantity}
                      </span>
                    </div>

                    <div className="text-right min-w-[70px]">
                      <span className="text-[10px] text-muted uppercase block">
                        Subtotal
                      </span>
                      <span className="font-bold text-accent text-sm">
                        ₹{(Number(item.price || 0) * (Number(item.quantity) || 1)).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pricing Summary Breakdown */}
            <div className="p-5 bg-shell/50 border-t border-line font-sans text-xs space-y-2">
              <div className="flex justify-between items-center text-muted">
                <span>Items Subtotal</span>
                <span className="font-mono font-semibold text-ink">
                  ₹{Number(order.total || 0).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between items-center text-muted">
                <span>Shipping & Handling</span>
                <span className="font-mono font-semibold text-emerald-600">
                  {Number(order.shippingCost ?? order.shippingFee)
                    ? `₹${Number(order.shippingCost ?? order.shippingFee)}`
                    : 'Free Delivery'}
                </span>
              </div>
              <div className="flex justify-between items-center text-muted">
                <span>Taxes & GST (18% Integrated)</span>
                <span className="font-mono text-muted">Included in Price</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-line font-display text-base font-bold text-ink">
                <span>Grand Total</span>
                <span className="font-mono text-xl text-accent">
                  ₹{Number(order.total || 0).toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>

          {/* Customer Details & Shipping Address Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Customer Details */}
            <div className="rounded-xl border border-line bg-white p-5 shadow-xs space-y-3.5">
              <div className="flex items-center gap-2 border-b border-line pb-2.5">
                <User className="w-4 h-4 text-accent" />
                <h3 className="font-display font-bold text-sm text-ink uppercase tracking-wider">
                  Customer Information
                </h3>
              </div>

              <div className="space-y-2.5 text-xs font-sans">
                <div>
                  <p className="font-mono text-[10px] font-bold uppercase text-muted">
                    Full Name
                  </p>
                  <p className="text-sm font-semibold text-ink mt-0.5">
                    {order.customerName}
                  </p>
                </div>

                <div className="flex items-center gap-2 font-mono">
                  <Mail className="w-3.5 h-3.5 text-muted shrink-0" />
                  <span className="text-ink">{order.customerEmail || '—'}</span>
                </div>

                <div className="flex items-center gap-2 font-mono">
                  <Phone className="w-3.5 h-3.5 text-muted shrink-0" />
                  <span className="text-ink">{order.customerPhone || '—'}</span>
                </div>
              </div>
            </div>

            {/* Shipping Address */}
            <div className="rounded-xl border border-line bg-white p-5 shadow-xs space-y-3.5">
              <div className="flex items-center gap-2 border-b border-line pb-2.5">
                <MapPin className="w-4 h-4 text-accent" />
                <h3 className="font-display font-bold text-sm text-ink uppercase tracking-wider">
                  Delivery Address
                </h3>
              </div>

              <div className="text-xs font-sans leading-relaxed text-ink whitespace-pre-line bg-shell p-3 rounded-lg border border-line">
                {order.address || 'No physical delivery address recorded for this order.'}
              </div>
            </div>
          </div>

          {/* Dispatch & Courier Tracking Management (Phase 9 Fulfillment) */}
          <div className="rounded-xl border border-line bg-white p-5 shadow-xs space-y-5">
            <div className="flex flex-wrap items-center justify-between border-b border-line pb-3 gap-2">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-accent" />
                <h3 className="font-display font-bold text-sm text-ink uppercase tracking-wider">
                  Courier Dispatch & Fulfillment
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={shippingStatus} type="shipping" showDot />
                {trackingPortalUrl && (
                  <a
                    href={trackingPortalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-accent hover:underline bg-shell px-2.5 py-1 rounded-md border border-line"
                  >
                    <span>Open Courier Portal</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-mono font-bold uppercase text-muted mb-1">
                  Shipping Status
                </label>
                <select
                  value={shippingStatus}
                  onChange={(e) => setShippingStatus(e.target.value as ShippingStatus)}
                  className="w-full py-2 px-3 text-xs font-mono font-semibold text-ink bg-white border border-line rounded-lg outline-none focus:border-accent cursor-pointer"
                >
                  {SHIPPING_STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-mono font-bold uppercase text-muted mb-1">
                  Courier Partner
                </label>
                <select
                  value={courierPartner}
                  onChange={(e) => setCourierPartner(e.target.value)}
                  className="w-full py-2 px-3 text-xs font-mono font-semibold text-ink bg-white border border-line rounded-lg outline-none focus:border-accent cursor-pointer"
                >
                  {COURIER_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-mono font-bold uppercase text-muted mb-1">
                  AWB Tracking Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. DEL123456789"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  className="w-full py-2 px-3 text-xs font-mono text-ink bg-white border border-line rounded-lg outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono font-bold uppercase text-muted mb-1">
                  Expected Delivery Date
                </label>
                <input
                  type="date"
                  value={expectedDeliveryDate}
                  onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                  className="w-full py-2 px-3 text-xs font-mono text-ink bg-white border border-line rounded-lg outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono font-bold uppercase text-muted mb-1">
                  Actual Delivered Date
                </label>
                <input
                  type="date"
                  value={deliveredDate}
                  onChange={(e) => setDeliveredDate(e.target.value)}
                  className="w-full py-2 px-3 text-xs font-mono text-ink bg-white border border-line rounded-lg outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono font-bold uppercase text-muted mb-1">
                  Shipping Cost / Fee (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={shippingCost}
                  onChange={(e) => setShippingCost(Number(e.target.value))}
                  className="w-full py-2 px-3 text-xs font-mono font-semibold text-ink bg-white border border-line rounded-lg outline-none focus:border-accent"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between pt-3 border-t border-line gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={syncOrderStatus}
                  onChange={(e) => setSyncOrderStatus(e.target.checked)}
                  className="rounded border-line text-accent focus:ring-accent w-4 h-4 cursor-pointer"
                />
                <span className="text-xs font-sans text-ink font-medium">
                  Auto-synchronize Order Status with Shipping Stage (e.g. Shipped → Shipped, Delivered → Delivered)
                </span>
              </label>

              <button
                type="button"
                disabled={isUpdatingShipping}
                onClick={handleSaveShipping}
                className="px-4 py-2 rounded-lg bg-accent text-white font-mono text-xs font-bold hover:bg-accent-dark transition-colors shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{isUpdatingShipping ? 'Saving...' : 'Save Shipping Details'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right 4 Cols: Order Timeline & Internal Notes */}
        <div className="lg:col-span-4 space-y-6">
          {/* Status Timeline History Card */}
          <div className="rounded-xl border border-line bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-line pb-2.5">
              <History className="w-4 h-4 text-accent" />
              <h3 className="font-display font-bold text-sm text-ink uppercase tracking-wider">
                Status History & Timeline
              </h3>
            </div>

            <div className="space-y-4 relative pl-3 before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-0.5 before:bg-line">
              {timeline.map((event, idx) => (
                <div key={event.id || idx} className="relative flex items-start gap-3">
                  <div className="w-3.5 h-3.5 rounded-full bg-accent border-2 border-white ring-2 ring-accent/30 shrink-0 mt-0.5 z-10" />
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="text-xs font-bold text-ink">
                      {event.status}
                    </p>
                    {event.note && (
                      <p className="text-[11px] text-muted font-sans leading-relaxed">
                        {event.note}
                      </p>
                    )}
                    <p className="font-mono text-[10px] text-muted">
                      {new Date(event.timestamp).toLocaleString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {event.updatedBy && ` · by ${event.updatedBy}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Internal Staff Notes Card */}
          <div className="rounded-xl border border-line bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-line pb-2.5">
              <FileText className="w-4 h-4 text-accent" />
              <h3 className="font-display font-bold text-sm text-ink uppercase tracking-wider">
                Internal Staff Notes
              </h3>
            </div>

            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
              {internalNotes.length === 0 ? (
                <p className="text-xs font-mono text-muted text-center py-4">
                  No internal notes recorded.
                </p>
              ) : (
                internalNotes.map((note) => (
                  <div
                    key={note.id}
                    className="p-3 rounded-lg bg-shell/70 border border-line space-y-1 text-xs font-sans"
                  >
                    <p className="text-ink leading-relaxed">{note.text}</p>
                    <p className="font-mono text-[10px] text-muted">
                      {note.author} ·{' '}
                      {new Date(note.createdAt).toLocaleDateString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* Add note form */}
            <form onSubmit={handleAddInternalNote} className="space-y-2 pt-2 border-t border-line">
              <textarea
                rows={2}
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                placeholder="Add private note for workshop team..."
                className="w-full p-2 text-xs font-sans text-ink bg-white border border-line rounded-lg outline-none focus:border-accent"
              />
              <button
                type="submit"
                disabled={isAddingNote || !newNoteText.trim()}
                className="w-full py-1.5 px-3 rounded-lg bg-accent text-white font-mono text-xs font-semibold hover:bg-accent-dark transition-colors shadow-xs disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isAddingNote ? 'Saving...' : 'Post Internal Note'}</span>
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* =========================================================
          PRINTABLE OFFICIAL TAX INVOICE (Rendered on window.print())
          ========================================================= */}
      <div className="hidden print:block p-8 bg-white text-black font-sans text-xs space-y-6">
        {/* Invoice Header */}
        <div className="flex justify-between items-start border-b-2 border-black pb-4">
          <div>
            <h1 className="text-2xl font-bold font-serif tracking-tight">
              SHILP SAHAYAK
            </h1>
            <p className="text-[11px] font-mono text-zinc-600">
              3D Prototyping & Custom Fabrication Studio
            </p>
            <p className="text-[10px] text-zinc-500 mt-1">
              Patiala, Punjab, India · Contact: hello@shilpsahayak.in
            </p>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-bold font-mono uppercase">
              TAX INVOICE
            </h2>
            <p className="font-mono text-xs font-semibold mt-1">
              Invoice #{order.id.slice(0, 8).toUpperCase()}
            </p>
            <p className="font-mono text-[10px] text-zinc-500">
              Date: {new Date(order.date).toLocaleDateString('en-IN')}
            </p>
          </div>
        </div>

        {/* Bill To & Ship To */}
        <div className="grid grid-cols-2 gap-8 border-b border-zinc-200 pb-4">
          <div>
            <p className="font-bold uppercase text-[10px] text-zinc-500 mb-1">
              Billed To:
            </p>
            <p className="font-bold text-sm">{order.customerName}</p>
            <p className="text-zinc-600 font-mono">{order.customerEmail}</p>
            <p className="text-zinc-600 font-mono">{order.customerPhone}</p>
          </div>
          <div>
            <p className="font-bold uppercase text-[10px] text-zinc-500 mb-1">
              Delivery Address:
            </p>
            <p className="text-zinc-700 whitespace-pre-line">
              {order.address || 'Standard Delivery'}
            </p>
            {order.courierPartner && (
              <p className="text-[10px] font-mono text-zinc-500 mt-1">
                Courier: {order.courierPartner} {order.trackingNumber ? `(AWB: ${order.trackingNumber})` : ''}
              </p>
            )}
          </div>
        </div>

        {/* Invoice Items Table */}
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b-2 border-black text-[10px] uppercase font-mono">
              <th className="py-2">Item Description</th>
              <th className="py-2 text-right">Unit Rate</th>
              <th className="py-2 text-center">Qty</th>
              <th className="py-2 text-right">Amount (INR)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {(order.items || []).map((item, index) => (
              <tr key={`print-item-${index}`}>
                <td className="py-2.5">
                  <p className="font-bold">{item.productName}</p>
                  {item.variantLabel && (
                    <p className="text-[10px] text-zinc-600">
                      Variant: {item.variantLabel}
                    </p>
                  )}
                  {item.customNotes && (
                    <p className="text-[10px] text-zinc-500 italic">
                      Note: {item.customNotes}
                    </p>
                  )}
                </td>
                <td className="py-2.5 text-right font-mono">
                  ₹{Number(item.price || 0).toLocaleString('en-IN')}
                </td>
                <td className="py-2.5 text-center font-mono">{item.quantity}</td>
                <td className="py-2.5 text-right font-mono font-bold">
                  ₹{(Number(item.price || 0) * (Number(item.quantity) || 1)).toLocaleString('en-IN')}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-black">
              <td colSpan={3} className="py-3 text-right font-bold">
                Grand Total:
              </td>
              <td className="py-3 text-right font-mono text-sm font-bold">
                ₹{Number(order.total || 0).toLocaleString('en-IN')}
              </td>
            </tr>
          </tfoot>
        </table>

        {/* Invoice Footer */}
        <div className="pt-6 border-t border-zinc-300 text-center text-[10px] text-zinc-500 space-y-1">
          <p>Thank you for choosing Shilp Sahayak for your custom 3D printing needs.</p>
          <p>This is a computer-generated tax invoice and requires no physical signature.</p>
        </div>
      </div>

      {/* =========================================================
          PAYMENT DETAILS MODAL (Phase 9 Payments)
          ========================================================= */}
      {paymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-line bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-accent" />
                <h3 className="font-display font-bold text-base text-ink">
                  Payment Record & Transaction Details
                </h3>
              </div>
              <span className="font-mono text-xs font-bold text-accent">
                Total: ₹{Number(order.total || 0).toLocaleString('en-IN')}
              </span>
            </div>

            {/* PCI Compliance Notice */}
            <div className="p-3 rounded-lg bg-emerald-50/80 border border-emerald-200 text-emerald-800 text-[11px] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <strong>PCI-DSS Compliant Storage:</strong> Shilp Sahayak never stores sensitive debit/credit card numbers or CVVs. All payments are verified via gateway UTR or UPI tokens.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-sans text-xs">
              <div>
                <label className="block font-mono text-[10px] font-bold uppercase text-muted mb-1">
                  Payment Status
                </label>
                <select
                  value={selectedPaymentStatus}
                  onChange={(e) => setSelectedPaymentStatus(e.target.value as PaymentStatus)}
                  className="w-full py-2 px-3 border border-line rounded-lg bg-white font-mono font-semibold text-ink"
                >
                  {PAYMENT_STATUS_OPTIONS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-mono text-[10px] font-bold uppercase text-muted mb-1">
                  Payment Method
                </label>
                <input
                  type="text"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  placeholder="e.g. UPI, Net Banking, COD"
                  className="w-full py-2 px-3 border border-line rounded-lg bg-white text-ink"
                />
              </div>

              <div>
                <label className="block font-mono text-[10px] font-bold uppercase text-muted mb-1">
                  Payment Reference / ID
                </label>
                <input
                  type="text"
                  value={paymentId}
                  onChange={(e) => setPaymentId(e.target.value)}
                  placeholder="e.g. PAY_SS_89F12A"
                  className="w-full py-2 px-3 border border-line rounded-lg bg-white font-mono text-ink"
                />
              </div>

              <div>
                <label className="block font-mono text-[10px] font-bold uppercase text-muted mb-1">
                  Gateway Transaction Ref / UTR
                </label>
                <input
                  type="text"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  placeholder="e.g. UPI-123456789012"
                  className="w-full py-2 px-3 border border-line rounded-lg bg-white font-mono text-ink"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-mono text-[10px] font-bold uppercase text-muted mb-1">
                  Payment Settled At (Timestamp)
                </label>
                <input
                  type="datetime-local"
                  value={paidAt ? new Date(paidAt).toISOString().slice(0, 16) : ''}
                  onChange={(e) => setPaidAt(e.target.value ? new Date(e.target.value).toISOString() : '')}
                  className="w-full py-2 px-3 border border-line rounded-lg bg-white font-mono text-ink"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-line">
              <button
                type="button"
                onClick={() => setPaymentModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-line text-xs font-semibold text-ink hover:bg-shell"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isUpdatingPayment}
                onClick={handleSavePayment}
                className="px-4 py-2 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent-dark shadow-xs disabled:opacity-50"
              >
                {isUpdatingPayment ? 'Saving...' : 'Save Payment Record'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          RETURN & REFUND WORKFLOW MODAL (Phase 9 Returns / Refunds)
          ========================================================= */}
      {returnModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-line bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-amber-600" />
                <h3 className="font-display font-bold text-base text-ink">
                  Return & Refund Management
                </h3>
              </div>
              <span className="font-mono text-xs text-muted">
                Order Value: ₹{Number(order.total || 0).toLocaleString('en-IN')}
              </span>
            </div>

            {/* Custom order specific policy check */}
            {hasCustomItems ? (
              <div className="p-3 rounded-lg bg-purple-50 border border-purple-200 text-purple-900 text-xs">
                <p className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-purple-700 shrink-0" />
                  <span>Custom Fabrication Item Policy</span>
                </p>
                <p className="text-[11px] mt-0.5 leading-relaxed text-purple-700">
                  Custom printed parts are fabricated to individual CAD geometry and cannot be restocked for general resale. Returns should only be accepted if structural defects, printing failures, or packaging damages are verified by the workshop.
                </p>
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 text-xs">
                <p className="font-bold">Ready-Made Product Return Policy</p>
                <p className="text-[11px] mt-0.5 leading-relaxed text-blue-700">
                  Finished catalogue products are eligible for return within 7 days of delivery in unused condition. Restocking can be automatically logged in Product Inventory once parcel is received.
                </p>
              </div>
            )}

            <div className="space-y-3 font-sans text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-mono text-[10px] font-bold uppercase text-muted mb-1">
                    Return Status
                  </label>
                  <select
                    value={returnStatus}
                    onChange={(e) => setReturnStatus(e.target.value as ReturnStatus)}
                    className="w-full py-2 px-3 border border-line rounded-lg bg-white font-mono font-semibold text-ink"
                  >
                    {RETURN_STATUS_OPTIONS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-mono text-[10px] font-bold uppercase text-muted mb-1">
                    Refund Status
                  </label>
                  <select
                    value={refundStatus}
                    onChange={(e) => setRefundStatus(e.target.value as RefundStatus)}
                    className="w-full py-2 px-3 border border-line rounded-lg bg-white font-mono font-semibold text-ink"
                  >
                    {REFUND_STATUS_OPTIONS.map((rf) => (
                      <option key={rf.value} value={rf.value}>
                        {rf.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-mono text-[10px] font-bold uppercase text-muted mb-1">
                  Refund Amount (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  max={Number(order.total) || 100000}
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(Number(e.target.value))}
                  className="w-full py-2 px-3 border border-line rounded-lg bg-white font-mono font-bold text-ink"
                />
              </div>

              <div>
                <label className="block font-mono text-[10px] font-bold uppercase text-muted mb-1">
                  Return / Refund Reason
                </label>
                <textarea
                  rows={2}
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  placeholder="e.g. Model layer separation on thin wall / transit damage reported by customer"
                  className="w-full p-2 border border-line rounded-lg bg-white text-ink"
                />
              </div>

              <div>
                <label className="block font-mono text-[10px] font-bold uppercase text-muted mb-1">
                  Internal Workshop Notes on Return
                </label>
                <textarea
                  rows={2}
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  placeholder="e.g. Customer provided photos of fracture; replacement or full refund approved"
                  className="w-full p-2 border border-line rounded-lg bg-white text-ink"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-line">
              <button
                type="button"
                onClick={() => setReturnModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-line text-xs font-semibold text-ink hover:bg-shell"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isUpdatingReturn}
                onClick={handleSaveReturnAndRefund}
                className="px-4 py-2 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent-dark shadow-xs disabled:opacity-50"
              >
                {isUpdatingReturn ? 'Saving...' : 'Save Return & Refund'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        onConfirm={handleConfirmCancel}
        variant="danger"
        title="Cancel Order & Restore Inventory?"
        description={`Are you sure you want to cancel Order #${order.id.slice(0, 8).toUpperCase()}? Finished product stock for any catalogue items will be automatically restocked, and customer email notification will be queued.`}
        confirmText="Yes, Cancel Order"
      />
    </div>
  );
}

export default OrderDetail;
