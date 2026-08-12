import React from 'react';
import { Link } from 'react-router-dom';
import {
  IndianRupee,
  ShoppingBag,
  Clock,
  TrendingUp,
  Package,
  Loader2,
  ArrowRight
} from 'lucide-react';
import { Card } from '../../components/ui';
import { useOrders } from '../../hooks/useOrders';
import { useProducts } from '../../hooks/useProducts';

export function Dashboard() {
  const { data: orders = [], isLoading: ordersLoading } = useOrders();
  const { data: products = [], isLoading: productsLoading } = useProducts();

  const isLoading = ordersLoading || productsLoading;

  // Calculate real stats
  const totalRevenue = orders
    .filter((o) => o.status !== 'Cancelled')
    .reduce((sum, o) => sum + o.total, 0);

  const totalOrders = orders.length;

  const activePrintJobs = orders.filter((o) =>
    ['Pending', 'Confirmed', 'Printing', 'Quality Check'].includes(o.status)
  ).length;

  const lowStockProducts = products.filter((p) => p.stock <= 5).length;

  const recentOrders = orders.slice(0, 5);

  const STATUS_COLORS: Record<string, string> = {
    Pending: 'bg-amber-50 text-amber-700',
    Confirmed: 'bg-blue-50 text-blue-700',
    Printing: 'bg-purple-50 text-purple-700',
    'Quality Check': 'bg-indigo-50 text-indigo-700',
    Shipped: 'bg-cyan-50 text-cyan-700',
    Delivered: 'bg-green-50 text-green-700',
    Cancelled: 'bg-red-50 text-red-700'
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-serif font-bold text-charcoal">
          Dashboard
        </h1>
        <p className="text-charcoal-light text-sm mt-1">
          Welcome back. Here's what's happening in the studio today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="p-6 border-none shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
              <IndianRupee className="w-5 h-5 text-brand-500" />
            </div>
            <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
              Live
            </span>
          </div>
          <p className="text-sm text-charcoal-light mb-1">Total Revenue</p>
          <p className="text-2xl font-bold text-charcoal">
            ₹{totalRevenue.toLocaleString('en-IN')}
          </p>
        </Card>

        <Card className="p-6 border-none shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-blue-500" />
            </div>
          </div>
          <p className="text-sm text-charcoal-light mb-1">Total Orders</p>
          <p className="text-2xl font-bold text-charcoal">{totalOrders}</p>
        </Card>

        <Card className="p-6 border-none shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
              <Clock className="w-5 h-5 text-purple-500" />
            </div>
          </div>
          <p className="text-sm text-charcoal-light mb-1">Active Print Jobs</p>
          <p className="text-2xl font-bold text-charcoal">{activePrintJobs}</p>
        </Card>

        <Card className="p-6 border-none shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <Package className="w-5 h-5 text-amber-500" />
            </div>
          </div>
          <p className="text-sm text-charcoal-light mb-1">Low Stock Items</p>
          <p className="text-2xl font-bold text-charcoal">{lowStockProducts}</p>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card className="border-none shadow-sm overflow-hidden">
        <div className="p-6 border-b border-brand-100 flex justify-between items-center">
          <h2 className="font-serif font-semibold text-lg text-charcoal">
            Recent Orders
          </h2>
          <Link
            to="/admin/orders"
            className="text-sm text-brand-600 hover:text-brand-700 font-medium flex items-center"
          >
            View All <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <div className="p-12 text-center text-charcoal-light">
            No orders yet.
          </div>
        ) : (
          <div className="divide-y divide-brand-50">
            {recentOrders.map((order) => (
              <Link
                key={order.id}
                to={`/admin/orders/${order.id}`}
                className="flex items-center justify-between p-5 hover:bg-brand-50/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div>
                    <p className="font-medium text-charcoal">
                      {order.customerName}
                    </p>
                    <p className="text-xs text-charcoal-lighter mt-0.5">
                      #{order.id.slice(0, 8)} •{' '}
                      {new Date(order.date).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short'
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span
                    className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                      STATUS_COLORS[order.status] || 'bg-gray-50 text-gray-700'
                    }`}
                  >
                    {order.status}
                  </span>
                  <p className="font-medium text-charcoal min-w-[80px] text-right">
                    ₹{order.total.toLocaleString('en-IN')}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}