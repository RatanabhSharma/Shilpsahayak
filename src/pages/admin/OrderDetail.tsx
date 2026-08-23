import React from 'react';
import {
  Link,
  useParams,
} from 'react-router-dom';

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
  Card,
  Select,
} from '../../components/ui';

import {
  useOrder,
  useUpdateOrderStatus,
  OrderStatus,
} from '../../hooks/useOrders';

const STATUS_OPTIONS = [
  {
    value: 'Pending',
    label: 'Pending',
  },
  {
    value: 'Confirmed',
    label: 'Confirmed',
  },
  {
    value: 'Printing',
    label: 'Printing',
  },
  {
    value: 'Quality Check',
    label: 'Quality Check',
  },
  {
    value: 'Shipped',
    label: 'Shipped',
  },
  {
    value: 'Delivered',
    label: 'Delivered',
  },
  {
    value: 'Cancelled',
    label: 'Cancelled',
  },
];

const STATUS_COLORS: Record<
  OrderStatus,
  string
> = {
  Pending:
    'bg-amber-50 text-amber-700',
  Confirmed:
    'bg-blue-50 text-blue-700',
  Printing:
    'bg-purple-50 text-purple-700',
  'Quality Check':
    'bg-indigo-50 text-indigo-700',
  Shipped:
    'bg-cyan-50 text-cyan-700',
  Delivered:
    'bg-green-50 text-green-700',
  Cancelled:
    'bg-red-50 text-red-700',
};

export function OrderDetail() {
  const { id } = useParams<{
    id: string;
  }>();

  const {
    data: order,
    isLoading,
    isError,
  } = useOrder(id);

  const updateStatus =
    useUpdateOrderStatus();

  const handleStatusChange = async (
    value: string
  ) => {
    if (!order) {
      return;
    }

    try {
      await updateStatus.mutateAsync({
        id: order.id,
        status: value as OrderStatus,
      });
    } catch (error) {
      console.error(
        'Failed to update order status:',
        error
      );

      alert(
        'Failed to update order status. Please try again.'
      );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="py-12 text-center">
        <p className="text-red-600">
          Failed to load this order.
        </p>

        <Link
          to="/admin/orders"
          className="inline-block mt-4 text-brand-600 hover:text-brand-700"
        >
          Back to Orders
        </Link>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="py-12 text-center">
        <p className="text-charcoal-light">
          Order not found.
        </p>

        <Link
          to="/admin/orders"
          className="inline-flex items-center gap-2 mt-4 text-brand-600 hover:text-brand-700"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Orders
        </Link>
      </div>
    );
  }

  const orderDate = new Date(
    order.date
  );

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

        <div>
          <Link
            to="/admin/orders"
            className="inline-flex items-center gap-2 text-sm text-charcoal-light hover:text-brand-600 transition-colors mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Orders
          </Link>

          <h1 className="text-2xl font-serif font-bold text-charcoal">
            Order #{order.id.slice(0, 8)}
          </h1>

          <p className="text-sm text-charcoal-light mt-1">
            Placed on{' '}
            {orderDate.toLocaleDateString(
              'en-IN',
              {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              }
            )}
          </p>
        </div>

        <div className="w-full sm:w-52">
          <Select
            value={order.status}
            onChange={handleStatusChange}
            options={STATUS_OPTIONS}
          />
        </div>
      </div>

      {/* Status */}
      <div>
        <span
          className={`inline-flex px-3 py-1.5 rounded-full text-sm font-medium ${
            STATUS_COLORS[order.status]
          }`}
        >
          {order.status}
        </span>
      </div>

      {/* Customer + Order summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Customer */}
        <Card className="border-none shadow-sm p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-full bg-brand-50 flex items-center justify-center">
              <User className="w-5 h-5 text-brand-600" />
            </div>

            <h2 className="text-lg font-serif font-bold text-charcoal">
              Customer
            </h2>
          </div>

          <div className="space-y-4">

            <div>
              <p className="text-xs uppercase tracking-wide text-charcoal-lighter">
                Name
              </p>
              <p className="mt-1 font-medium text-charcoal">
                {order.customerName}
              </p>
            </div>

            <div className="flex items-start gap-3">
              <Mail className="w-4 h-4 mt-1 text-charcoal-lighter" />

              <div>
                <p className="text-xs uppercase tracking-wide text-charcoal-lighter">
                  Email
                </p>

                <p className="mt-1 text-charcoal">
                  {order.customerEmail}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Phone className="w-4 h-4 mt-1 text-charcoal-lighter" />

              <div>
                <p className="text-xs uppercase tracking-wide text-charcoal-lighter">
                  Phone
                </p>

                <p className="mt-1 text-charcoal">
                  {order.customerPhone}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 mt-1 text-charcoal-lighter" />

              <div>
                <p className="text-xs uppercase tracking-wide text-charcoal-lighter">
                  Delivery Address
                </p>

                <p className="mt-1 text-charcoal whitespace-pre-line">
                  {order.address}
                </p>
              </div>
            </div>

          </div>
        </Card>

        {/* Summary */}
        <Card className="border-none shadow-sm p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-full bg-brand-50 flex items-center justify-center">
              <Package className="w-5 h-5 text-brand-600" />
            </div>

            <h2 className="text-lg font-serif font-bold text-charcoal">
              Order Summary
            </h2>
          </div>

          <div className="space-y-4">

            <div className="flex justify-between gap-4">
              <span className="text-charcoal-light">
                Order ID
              </span>

              <span className="font-medium text-charcoal break-all text-right">
                {order.id}
              </span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-charcoal-light">
                Items
              </span>

              <span className="font-medium text-charcoal">
                {order.items.length}
              </span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-charcoal-light">
                Status
              </span>

              <span className="font-medium text-charcoal">
                {order.status}
              </span>
            </div>

            <div className="border-t border-brand-100 pt-4 flex justify-between">
              <span className="font-medium text-charcoal">
                Total
              </span>

              <span className="text-xl font-bold text-brand-600">
                ₹
                {order.total.toLocaleString(
                  'en-IN'
                )}
              </span>
            </div>

          </div>
        </Card>

      </div>

      {/* Items */}
      <Card className="border-none shadow-sm overflow-hidden">

        <div className="p-6 border-b border-brand-100">
          <div className="flex items-center gap-3">
            <Package className="w-5 h-5 text-brand-600" />

            <h2 className="text-lg font-serif font-bold text-charcoal">
              Order Items
            </h2>
          </div>
        </div>

        <div className="divide-y divide-brand-50">

          {order.items.length === 0 ? (
            <div className="p-8 text-center text-charcoal-light">
              No items found for this order.
            </div>
          ) : (
            order.items.map(
              (item, index) => (
                <div
                  key={`${item.productId}-${index}`}
                  className="p-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium text-charcoal">
                      {item.productName}
                    </p>

                    {item.variantLabel && (
                      <p className="text-sm text-charcoal-light mt-1">
                        {item.variantLabel}
                      </p>
                    )}

                    {item.customNotes && (
                      <p className="text-sm text-charcoal-light mt-1">
                        {item.customNotes}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-8">

                    <div>
                      <p className="text-xs text-charcoal-lighter">
                        Quantity
                      </p>

                      <p className="font-medium text-charcoal">
                        {item.quantity}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-xs text-charcoal-lighter">
                        Price
                      </p>

                      <p className="font-medium text-charcoal">
                        ₹
                        {(
                          item.price *
                          item.quantity
                        ).toLocaleString(
                          'en-IN'
                        )}
                      </p>
                    </div>

                  </div>
                </div>
              )
            )
          )}

        </div>
      </Card>

      {/* Notes */}
      {order.notes && (
        <Card className="border-none shadow-sm p-6">

          <div className="flex items-center gap-3 mb-4">
            <FileText className="w-5 h-5 text-brand-600" />

            <h2 className="text-lg font-serif font-bold text-charcoal">
              Order Notes
            </h2>
          </div>

          <p className="text-charcoal-light whitespace-pre-line">
            {order.notes}
          </p>

        </Card>
      )}

    </div>
  );
}