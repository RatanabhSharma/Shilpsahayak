import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Loader2,
  Package,
  User,
  MapPin,
  Phone,
  Mail,
  FileText,
} from 'lucide-react';

import {
  useOrder,
  useUpdateOrderStatus,
  OrderStatus,
} from '../../hooks/useOrders';

const STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: 'Pending', label: 'Pending' },
  { value: 'Confirmed', label: 'Confirmed' },
  { value: 'Printing', label: 'Printing' },
  { value: 'Quality Check', label: 'Quality Check' },
  { value: 'Shipped', label: 'Shipped' },
  { value: 'Delivered', label: 'Delivered' },
  { value: 'Cancelled', label: 'Cancelled' },
];

function getOrderStatusClass(status: OrderStatus): string {
  switch (status) {
    case 'Delivered':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'Printing':
    case 'Quality Check':
      return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'Shipped':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'Confirmed':
      return 'bg-slate-100 text-slate-700 border-slate-200';
    case 'Cancelled':
      return 'bg-rose-50 text-rose-700 border-rose-200';
    case 'Pending':
    default:
      return 'bg-amber-50 text-amber-700 border-amber-200';
  }
}

export function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: order, isLoading, isError } = useOrder(id);
  const updateStatus = useUpdateOrderStatus();

  const handleStatusChange = async (value: string) => {
    if (!order) return;
    try {
      await updateStatus.mutateAsync({
        id: order.id,
        status: value as OrderStatus,
      });
    } catch (error) {
      console.error('Failed to update order status:', error);
      alert('Failed to update order status. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 gap-2">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
        <span className="text-xs font-mono text-muted uppercase tracking-wider">Loading order details...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-8 text-center">
        <p className="text-xs font-semibold text-rose-700">Failed to load order information.</p>
        <Link
          to="/admin/orders"
          className="inline-flex items-center gap-1.5 mt-3 text-xs font-mono font-bold text-accent hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Orders List
        </Link>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="rounded-xl border border-line bg-white p-8 text-center space-y-3">
        <p className="text-xs font-mono text-muted">Order record not found.</p>
        <Link
          to="/admin/orders"
          className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-accent hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Orders
        </Link>
      </div>
    );
  }

  const orderDate = new Date(order.date);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-4">
        <div>
          <Link
            to="/admin/orders"
            className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-muted hover:text-accent transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Orders
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              Order #{order.id.slice(0, 8)}
            </h1>
            <span
              className={`inline-flex px-3 py-1 rounded-full font-mono text-[10px] font-bold uppercase tracking-wider border ${getOrderStatusClass(
                order.status
              )}`}
            >
              {order.status}
            </span>
          </div>
          <p className="text-xs text-muted mt-1 font-mono">
            Placed on {orderDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-semibold text-muted">Update Status:</span>
          <select
            value={order.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="py-2 px-3 text-xs font-mono font-semibold text-ink bg-white border border-line rounded-lg outline-none focus:border-accent cursor-pointer shadow-xs"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Customer + Order Summary Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customer Details Card */}
        <div className="rounded-xl border border-line bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 border-b border-line pb-3">
            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent shrink-0">
              <User className="w-4 h-4" />
            </div>
            <h2 className="font-display text-base font-bold text-ink">Customer Information</h2>
          </div>

          <div className="space-y-3 font-sans text-xs">
            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted">Full Name</p>
              <p className="mt-0.5 text-sm font-semibold text-ink">{order.customerName}</p>
            </div>

            <div className="flex items-start gap-2.5">
              <Mail className="w-4 h-4 text-muted mt-0.5 shrink-0" />
              <div>
                <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted">Email Address</p>
                <p className="mt-0.5 font-mono text-ink">{order.customerEmail}</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <Phone className="w-4 h-4 text-muted mt-0.5 shrink-0" />
              <div>
                <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted">Phone Number</p>
                <p className="mt-0.5 font-mono text-ink">{order.customerPhone}</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <MapPin className="w-4 h-4 text-muted mt-0.5 shrink-0" />
              <div>
                <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted">Shipping Address</p>
                <p className="mt-0.5 text-ink whitespace-pre-line leading-relaxed">{order.address}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Order Summary Card */}
        <div className="rounded-xl border border-line bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 border-b border-line pb-3">
            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent shrink-0">
              <Package className="w-4 h-4" />
            </div>
            <h2 className="font-display text-base font-bold text-ink">Order Summary</h2>
          </div>

          <div className="space-y-3 font-sans text-xs">
            <div className="flex justify-between items-center py-1">
              <span className="text-muted font-mono text-[11px] uppercase tracking-wider">Full Order ID</span>
              <span className="font-mono text-xs font-bold text-ink">{order.id}</span>
            </div>

            <div className="flex justify-between items-center py-1 border-t border-line">
              <span className="text-muted font-mono text-[11px] uppercase tracking-wider">Items Quantity</span>
              <span className="font-mono text-xs font-semibold text-ink">{order.items.length} unique line items</span>
            </div>

            <div className="flex justify-between items-center py-1 border-t border-line">
              <span className="text-muted font-mono text-[11px] uppercase tracking-wider">Current Status</span>
              <span className="font-mono text-xs font-bold text-ink">{order.status}</span>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-line">
              <span className="font-display text-sm font-bold text-ink">Grand Total</span>
              <span className="font-mono text-xl font-bold text-accent">
                ₹{Number(order.total || 0).toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Items Breakdown Card */}
      <div className="rounded-xl border border-line bg-white shadow-xs overflow-hidden">
        <div className="p-5 border-b border-line bg-shell/50 flex items-center gap-2.5">
          <Package className="w-4 h-4 text-accent" />
          <h2 className="font-display text-base font-bold text-ink">Order Items</h2>
        </div>

        <div className="divide-y divide-line">
          {order.items.length === 0 ? (
            <div className="p-8 text-center text-xs font-mono text-muted">
              No items recorded for this order.
            </div>
          ) : (
            order.items.map((item, index) => (
              <div
                key={`${item.productId}-${index}`}
                className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-shell/30 transition-colors"
              >
                <div className="space-y-1">
                  <p className="text-xs font-bold text-ink">{item.productName}</p>
                  {item.variantLabel && (
                    <p className="font-mono text-[11px] text-muted">
                      Variant: <span className="text-ink font-medium">{item.variantLabel}</span>
                    </p>
                  )}
                  {item.customNotes && (
                    <p className="text-[11px] text-muted italic bg-shell p-2 rounded border border-line">
                      Note: "{item.customNotes}"
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-8 text-xs font-mono">
                  <div>
                    <span className="text-[10px] text-muted uppercase block">Qty</span>
                    <span className="font-bold text-ink">{item.quantity}</span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-muted uppercase block">Subtotal</span>
                    <span className="font-bold text-ink">
                      ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Order Notes Card */}
      {order.notes && (
        <div className="rounded-xl border border-line bg-white p-5 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-ink">
            <FileText className="w-4 h-4 text-accent" />
            <h2 className="font-display text-sm font-bold">Special Instructions / Customer Notes</h2>
          </div>
          <p className="text-xs text-muted font-sans whitespace-pre-line bg-shell p-3 rounded-lg border border-line">
            {order.notes}
          </p>
        </div>
      )}
    </div>
  );
}

export default OrderDetail;
