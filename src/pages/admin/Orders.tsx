import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Filter,
  ChevronRight,
  Loader2
} from 'lucide-react';

import {
  Card,
  Input,
  Select
} from '../../components/ui';

import {
  useOrders,
  OrderStatus,
  useUpdateOrderStatus
} from '../../hooks/useOrders';

const STATUS_OPTIONS = [
  { value: 'Pending', label: 'Pending' },
  { value: 'Confirmed', label: 'Confirmed' },
  { value: 'Printing', label: 'Printing' },
  { value: 'Quality Check', label: 'Quality Check' },
  { value: 'Shipped', label: 'Shipped' },
  { value: 'Delivered', label: 'Delivered' },
  { value: 'Cancelled', label: 'Cancelled' }
];

const FILTER_OPTIONS = [
  { value: 'All', label: 'All Status' },
  ...STATUS_OPTIONS
];

export function Orders() {
  const {
    data: orders = [],
    isLoading,
    isError
  } = useOrders();

  const updateStatus = useUpdateOrderStatus();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const filteredOrders = orders.filter((order) => {
    const searchTerm = search.toLowerCase().trim();

    const matchesSearch =
      order.customerName
        .toLowerCase()
        .includes(searchTerm) ||
      order.id
        .toLowerCase()
        .includes(searchTerm) ||
      order.customerEmail
        .toLowerCase()
        .includes(searchTerm);

    const matchesStatus =
      statusFilter === 'All' ||
      order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleStatusChange = async (
    orderId: string,
    newStatus: OrderStatus
  ) => {
    try {
      await updateStatus.mutateAsync({
        id: orderId,
        status: newStatus
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
      <div className="text-center py-12 text-red-600">
        Failed to load orders. Please try again.
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-serif font-bold text-charcoal">
            Orders
          </h1>

          <p className="text-charcoal-light text-sm mt-1">
            Manage and track customer orders
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4 border-none shadow-sm overflow-visible">
        <div className="flex flex-col sm:flex-row gap-4">

          {/* Search */}
          <div className="relative flex-1">
            <Search
              className="
                absolute
                left-3
                top-1/2
                -translate-y-1/2
                w-4
                h-4
                text-charcoal-lighter
              "
            />

            <Input
              placeholder="Search by name, email or order ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-charcoal-lighter flex-shrink-0" />

            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              className="w-52"
              options={FILTER_OPTIONS}
            />
          </div>

        </div>
      </Card>

      {/* Orders Table */}
      <Card className="border-none shadow-sm overflow-hidden">
        <div className="overflow-x-auto">

          <table className="w-full text-left border-collapse">

            <thead>
              <tr
                className="
                  bg-surface
                  text-xs
                  uppercase
                  tracking-wider
                  text-charcoal-light
                  border-b
                  border-brand-100
                "
              >
                <th className="px-6 py-4 font-medium">
                  Order ID
                </th>

                <th className="px-6 py-4 font-medium">
                  Customer
                </th>

                <th className="px-6 py-4 font-medium">
                  Date
                </th>

                <th className="px-6 py-4 font-medium">
                  Total
                </th>

                <th className="px-6 py-4 font-medium">
                  Status
                </th>

                <th className="px-6 py-4 font-medium text-right">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-brand-50">

              {filteredOrders.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="
                      px-6
                      py-12
                      text-center
                      text-charcoal-light
                    "
                  >
                    No orders found.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="
                      hover:bg-brand-50/50
                      transition-colors
                    "
                  >

                    {/* Order ID */}
                    <td className="px-6 py-4">
                      <Link
                        to={`/admin/orders/${order.id}`}
                        className="
                          font-medium
                          text-brand-600
                          hover:text-brand-700
                          transition-colors
                        "
                      >
                        #{order.id.slice(0, 8)}
                      </Link>
                    </td>

                    {/* Customer */}
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-charcoal">
                          {order.customerName}
                        </p>

                        <p className="text-xs text-charcoal-lighter">
                          {order.customerEmail}
                        </p>
                      </div>
                    </td>

                    {/* Date */}
                    <td className="px-6 py-4 text-sm text-charcoal-light">
                      {new Date(
                        order.date
                      ).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </td>

                    {/* Total */}
                    <td className="px-6 py-4 font-medium text-charcoal">
                      ₹{order.total.toLocaleString('en-IN')}
                    </td>

                    {/* Individual Order Status */}
                    <td className="px-6 py-4">
                      <Select
                        value={order.status}
                        onChange={(value) =>
                          handleStatusChange(
                            order.id,
                            value as OrderStatus
                          )
                        }
                        className="w-44"
                        options={STATUS_OPTIONS}
                      />
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <Link
                        to={`/admin/orders/${order.id}`}
                        className="
                          inline-flex
                          items-center
                          text-sm
                          text-charcoal-light
                          hover:text-brand-600
                          transition-colors
                        "
                      >
                        View

                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Link>
                    </td>

                  </tr>
                ))
              )}

            </tbody>
          </table>

        </div>
      </Card>

    </div>
  );
}
