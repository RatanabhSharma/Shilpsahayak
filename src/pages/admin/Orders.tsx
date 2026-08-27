import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Filter,
  ChevronRight,
  Loader2,
  ShoppingBag,
} from 'lucide-react';

import {
  useOrders,
  OrderStatus,
  useUpdateOrderStatus,
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

const FILTER_OPTIONS = [
  { value: 'All', label: 'All Statuses' },
  ...STATUS_OPTIONS,
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

export function Orders() {
  const {
    data: orders = [],
    isLoading,
    isError,
  } = useOrders();

  const updateStatus = useUpdateOrderStatus();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const filteredOrders = orders.filter((order) => {
    const searchTerm = search.toLowerCase().trim();

    const matchesSearch =
      order.customerName.toLowerCase().includes(searchTerm) ||
      order.id.toLowerCase().includes(searchTerm) ||
      order.customerEmail.toLowerCase().includes(searchTerm);

    const matchesStatus =
      statusFilter === 'All' || order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleStatusChange = async (
    orderId: string,
    newStatus: OrderStatus
  ) => {
    try {
      await updateStatus.mutateAsync({
        id: orderId,
        status: newStatus,
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
        <span className="text-xs font-mono text-muted uppercase tracking-wider">Loading orders...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center text-xs font-semibold text-rose-700">
        Failed to load orders. Please check your connection and try again.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-4">
        <div>
          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-accent block">
            Fulfillment & Dispatch
          </span>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Customer Orders
          </h1>
          <p className="mt-1 text-xs text-muted">
            Track live customer orders, update production status, and manage dispatch history.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-line shadow-xs">
          <ShoppingBag className="w-4 h-4 text-accent" />
          <span className="font-mono text-xs font-bold text-ink">
            {orders.length} Total Orders
          </span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="rounded-xl border border-line bg-white p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text"
              placeholder="Search by customer name, email, or order ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs font-sans text-ink bg-white border border-line rounded-lg outline-none focus:border-accent"
            />
          </div>

          {/* Status Filter Dropdown */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-48 py-2 px-3 text-xs font-sans font-semibold text-ink bg-white border border-line rounded-lg outline-none focus:border-accent cursor-pointer"
            >
              {FILTER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Orders Table Card */}
      <div className="rounded-xl border border-line bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-shell/50 border-b border-line text-[10px] font-mono font-bold uppercase tracking-wider text-muted">
                <th className="px-5 py-3">Order ID</th>
                <th className="px-5 py-3">Customer</th>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Total Amount</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line font-sans text-xs">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-xs font-mono text-muted">
                    No orders matching your criteria found.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-shell/40 transition-colors">
                    {/* Order ID */}
                    <td className="px-5 py-3.5">
                      <Link
                        to={`/admin/orders/${order.id}`}
                        className="font-mono text-xs font-bold text-accent hover:underline"
                      >
                        #{order.id.slice(0, 8)}
                      </Link>
                    </td>

                    {/* Customer */}
                    <td className="px-5 py-3.5">
                      <div>
                        <p className="font-semibold text-ink">{order.customerName}</p>
                        <p className="font-mono text-[10px] text-muted">{order.customerEmail}</p>
                      </div>
                    </td>

                    {/* Date */}
                    <td className="px-5 py-3.5 font-mono text-muted">
                      {new Date(order.date).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>

                    {/* Total Amount */}
                    <td className="px-5 py-3.5 font-mono font-bold text-ink">
                      ₹{Number(order.total || 0).toLocaleString('en-IN')}
                    </td>

                    {/* Status Dropdown / Pill */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full font-mono text-[10px] font-bold uppercase tracking-wider border ${getOrderStatusClass(
                            order.status
                          )}`}
                        >
                          {order.status}
                        </span>
                        <select
                          value={order.status}
                          onChange={(e) =>
                            handleStatusChange(order.id, e.target.value as OrderStatus)
                          }
                          className="py-1 px-2 text-[11px] font-mono border border-line rounded bg-white text-ink outline-none focus:border-accent cursor-pointer"
                        >
                          {STATUS_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5 text-right">
                      <Link
                        to={`/admin/orders/${order.id}`}
                        className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-muted hover:text-accent transition-colors"
                      >
                        <span>View</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Orders;
