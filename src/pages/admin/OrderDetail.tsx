import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Loader2, Package, User, MapPin, Phone, Mail } from 'lucide-react';
import { useOrders, useUpdateOrderStatus, OrderStatus } from '../../hooks/useOrders';
import { Card, Button } from '../../components/ui';

const STATUS_OPTIONS: OrderStatus[] = [
  'Pending',
  'Confirmed',
  'Printing',
  'Quality Check',
  'Shipped',
  'Delivered',
  'Cancelled'
];

const STATUS_COLORS: Record<OrderStatus, string> = {
  Pending: 'bg-amber-50 text-amber-700 border-amber-200',
  Confirmed: 'bg-blue-50 text-blue-700 border-blue-200',
  Printing: 'bg-purple-50 text-purple-700 border-purple-200',
  'Quality Check': 'bg-indigo-50 text-indigo-700 border-indigo-200',
  Shipped: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  Delivered: 'bg-green-50 text-green-700 border-green-200',
  Cancelled: 'bg-red-50 text-red-700 border-red-200'
};

export function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: orders = [], isLoading } = useOrders();
  const updateStatus = useUpdateOrderStatus();

  const order = orders.find((o) => o.id === id);

  const handleStatusChange = async (newStatus: OrderStatus) => {
    if (!order) return;
    try {
      await updateStatus.mutateAsync({ id: order.id, status: newStatus });
    } catch (error) {
      console.error(error);
      alert('Failed to update status');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-serif text-charcoal mb-4">Order not found</h2>
        <Button onClick={() => navigate('/admin/orders')}>Back to Orders</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => navigate('/admin/orders')}
            className="flex items-center text-sm text-charcoal-light hover:text-brand-500 mb-3"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Orders
          </button>
          <h1 className="text-2xl font-serif font-bold text-charcoal">
            Order #{order.id.slice(0, 8)}
          </h1>
          <p className="text-charcoal-light text-sm mt-1">
            Placed on{' '}
            {new Date(order.date).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-charcoal-light">Status:</span>
          <select
            value={order.status}
            onChange={(e) => handleStatusChange(e.target.value as OrderStatus)}
            className={`text-sm font-medium px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-brand-500 ${STATUS_COLORS[order.status]}`}
          >
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Items */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6 border-none shadow-sm">
            <h2 className="font-serif font-semibold text-lg text-charcoal mb-5 flex items-center">
              <Package className="w-5 h-5 mr-2 text-brand-500" />
              Order Items
            </h2>

            <div className="space-y-4">
              {order.items.map((item, index) => (
                <div
                  key={index}
                  className="flex gap-4 p-4 bg-surface rounded-xl"
                >
                  <div className="w-16 h-16 rounded-lg bg-surface-dark flex-shrink-0 flex items-center justify-center text-charcoal-lighter text-xs">
                    Item
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-charcoal">{item.productName}</p>
                    <p className="text-sm text-charcoal-light mt-1">
                      Qty: {item.quantity} × ₹{item.price.toLocaleString('en-IN')}
                    </p>
                    {item.variantLabel && (
                      <p className="text-xs text-charcoal-lighter mt-1">
                        {item.variantLabel}
                      </p>
                    )}
                    {item.customNotes && (
                      <p className="text-xs text-brand-600 mt-1">
                        Note: {item.customNotes}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-charcoal">
                      ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-brand-100 mt-6 pt-4 flex justify-between">
              <span className="font-medium text-charcoal">Total</span>
              <span className="text-xl font-semibold text-brand-600">
                ₹{order.total.toLocaleString('en-IN')}
              </span>
            </div>
          </Card>

          {order.notes && (
            <Card className="p-6 border-none shadow-sm">
              <h3 className="font-medium text-charcoal mb-2">Customer Notes</h3>
              <p className="text-charcoal-light text-sm">{order.notes}</p>
            </Card>
          )}
        </div>

        {/* Customer Info */}
        <div className="space-y-6">
          <Card className="p-6 border-none shadow-sm">
            <h2 className="font-serif font-semibold text-lg text-charcoal mb-5 flex items-center">
              <User className="w-5 h-5 mr-2 text-brand-500" />
              Customer Details
            </h2>

            <div className="space-y-4">
              <div>
                <p className="text-xs text-charcoal-lighter uppercase tracking-wider mb-1">
                  Name
                </p>
                <p className="font-medium text-charcoal">{order.customerName}</p>
              </div>

              <div className="flex items-start gap-2">
                <Mail className="w-4 h-4 text-charcoal-lighter mt-0.5" />
                <div>
                  <p className="text-xs text-charcoal-lighter uppercase tracking-wider mb-1">
                    Email
                  </p>
                  <p className="text-sm text-charcoal">{order.customerEmail}</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Phone className="w-4 h-4 text-charcoal-lighter mt-0.5" />
                <div>
                  <p className="text-xs text-charcoal-lighter uppercase tracking-wider mb-1">
                    Phone
                  </p>
                  <p className="text-sm text-charcoal">{order.customerPhone}</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-charcoal-lighter mt-0.5" />
                <div>
                  <p className="text-xs text-charcoal-lighter uppercase tracking-wider mb-1">
                    Shipping Address
                  </p>
                  <p className="text-sm text-charcoal leading-relaxed">
                    {order.address}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6 border-none shadow-sm bg-brand-50">
            <h3 className="font-medium text-charcoal mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <a
                href={`https://wa.me/${order.customerPhone.replace(/\D/g, '')}?text=Hi ${order.customerName}, regarding your order #${order.id.slice(0, 8)}...`}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <Button variant="outline" className="w-full justify-start">
                  Contact on WhatsApp
                </Button>
              </a>
              <a href={`mailto:${order.customerEmail}`} className="block">
                <Button variant="outline" className="w-full justify-start">
                  Send Email
                </Button>
              </a>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}