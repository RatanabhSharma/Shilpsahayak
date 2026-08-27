import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  Clock3,
  FileText,
  IndianRupee,
  Loader2,
  Package,
  ShoppingBag,
  TriangleAlert,
  ChevronRight,
} from 'lucide-react';

import { useOrders } from '../../hooks/useOrders';
import { useProducts } from '../../hooks/useProducts';
import { useQuotes } from '../../hooks/useQuotes';

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCompactCurrency(value: number): string {
  if (value >= 100000) {
    return `₹${(value / 100000).toFixed(1)}L`;
  }
  if (value >= 1000) {
    return `₹${(value / 1000).toFixed(1)}K`;
  }
  return `₹${Math.round(value)}`;
}

function formatDate(date: string): string {
  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) {
    return '—';
  }
  return parsedDate.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function getMonthKey(date: string): string | null {
  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }
  const year = parsedDate.getFullYear();
  const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function getMonthLabel(monthKey: string): string {
  const parts = monthKey.split('-');
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString('en-IN', {
    month: 'short',
  });
}

function getOrderStatusClass(status: string): string {
  switch (status) {
    case 'Delivered':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'Printing':
    case 'Quality Check':
      return 'border-purple-200 bg-purple-50 text-purple-700';
    case 'Shipped':
      return 'border-blue-200 bg-blue-50 text-blue-700';
    case 'Confirmed':
      return 'border-slate-200 bg-slate-100 text-slate-700';
    case 'Cancelled':
      return 'border-rose-200 bg-rose-50 text-rose-700';
    case 'Pending':
    default:
      return 'border-amber-200 bg-amber-50 text-amber-700';
  }
}

function getQuoteStatusClass(status: string): string {
  switch (status) {
    case 'Quoted':
      return 'border-blue-200 bg-blue-50 text-blue-700';
    case 'Accepted':
    case 'Completed':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'Rejected':
      return 'border-rose-200 bg-rose-50 text-rose-700';
    case 'Pending':
    default:
      return 'border-amber-200 bg-amber-50 text-amber-700';
  }
}

/* -------------------------------------------------------------------------- */
/* Status Pills                                                               */
/* -------------------------------------------------------------------------- */

function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider ${getOrderStatusClass(
        status
      )}`}
    >
      {status}
    </span>
  );
}

function QuotePill({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider ${getQuoteStatusClass(
        status
      )}`}
    >
      {status}
    </span>
  );
}

function MetricCard({
  label,
  value,
  description,
  icon,
  danger = false,
}: {
  label: string;
  value: string | number;
  description: string;
  icon: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <div className="rounded-xl border border-line bg-white p-5 shadow-xs hover:border-accent/30 transition-all">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted">
            {label}
          </p>
          <p
            className={`mt-2 font-mono text-2xl font-bold tracking-tight ${
              danger ? 'text-rose-600' : 'text-ink'
            }`}
          >
            {value}
          </p>
        </div>
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
            danger
              ? 'bg-rose-50 text-rose-600'
              : 'bg-accent/10 text-accent'
          }`}
        >
          {icon}
        </div>
      </div>
      <p className="mt-3 text-xs text-muted font-sans font-medium">
        {description}
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Dashboard                                                                  */
/* -------------------------------------------------------------------------- */

export function Dashboard() {
  const {
    data: orders = [],
    isLoading: ordersLoading,
    isError: ordersError,
  } = useOrders();

  const {
    data: products = [],
    isLoading: productsLoading,
    isError: productsError,
  } = useProducts();

  const {
    data: quotes = [],
    isLoading: quotesLoading,
    isError: quotesError,
  } = useQuotes();

  const isLoading = ordersLoading || productsLoading || quotesLoading;
  const hasError = ordersError || productsError || quotesError;

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center">
          <Loader2 className="h-7 w-7 animate-spin text-accent" aria-hidden="true" />
          <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-muted font-medium">
            Loading dashboard data...
          </p>
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="space-y-4">
        <header className="border-b border-line pb-4">
          <p className="font-mono text-[10px] uppercase tracking-wider text-accent font-semibold">
            Admin Telemetry
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold text-ink">
            Studio Dashboard
          </h1>
        </header>

        <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-rose-800">
          <div className="flex items-start gap-3">
            <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
            <div>
              <h2 className="font-semibold text-sm">Dashboard data could not be loaded</h2>
              <p className="mt-1 text-xs text-rose-700">
                Please check your network connection and Firestore security rules.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------------------ */
  /* Analytics calculations                                                   */
  /* ------------------------------------------------------------------------ */

  const validOrders = orders.filter((order) => order.status !== 'Cancelled');
  const totalRevenue = validOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  const totalOrders = orders.length;

  const activeOrders = orders.filter((order) =>
    ['Pending', 'Confirmed', 'Printing', 'Quality Check', 'Shipped'].includes(order.status)
  );

  const lowStockProducts = products.filter((p) => Number(p.stock) <= 5);
  const pendingQuotes = quotes.filter((q) => q.status === 'Pending');

  /* Monthly Revenue Series */
  const revenueByMonth = new Map<string, number>();
  validOrders.forEach((order) => {
    const monthKey = getMonthKey(order.date);
    if (!monthKey) return;
    revenueByMonth.set(monthKey, (revenueByMonth.get(monthKey) || 0) + (Number(order.total) || 0));
  });

  const now = new Date();
  const revenueSeries = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const key = `${year}-${month}`;
    return {
      key,
      label: getMonthLabel(key),
      value: revenueByMonth.get(key) || 0,
    };
  });

  const maximumRevenue = Math.max(...revenueSeries.map((item) => item.value), 1);
  const currentMonth = revenueSeries[revenueSeries.length - 1];
  const previousMonth = revenueSeries[revenueSeries.length - 2];
  const revenueChange =
    previousMonth.value > 0
      ? ((currentMonth.value - previousMonth.value) / previousMonth.value) * 100
      : null;

  const currentMonthOrders = validOrders.filter(
    (order) => getMonthKey(order.date) === currentMonth.key
  );
  const currentMonthRevenue = currentMonthOrders.reduce(
    (sum, order) => sum + (Number(order.total) || 0),
    0
  );
  const averageOrderValue =
    currentMonthOrders.length > 0 ? currentMonthRevenue / currentMonthOrders.length : 0;

  const actionOrders = orders.filter((order) =>
    ['Pending', 'Confirmed', 'Quality Check'].includes(order.status)
  );

  const productionOrders = orders.filter((order) =>
    ['Printing', 'Quality Check'].includes(order.status)
  );

  const activeProducts = products.filter((product) => product.active !== false);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-5">
        <div>
          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-accent block">
            Telemetry & Operations
          </span>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Studio Dashboard
          </h1>
          <p className="mt-1 text-xs text-muted font-sans">
            Real-time shop metrics, order processing queue, and CAD quotation status.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <Link
            to="/admin/orders"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-white px-3.5 font-sans text-xs font-semibold text-ink hover:bg-shell transition-colors shadow-xs"
          >
            <span>View Orders</span>
            <ArrowUpRight className="h-3.5 w-3.5 text-muted" />
          </Link>

          <Link
            to="/admin/quotes"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-accent px-3.5 font-sans text-xs font-semibold text-white hover:bg-accent-dark transition-colors shadow-xs shadow-accent/20"
          >
            <span>Review CAD Quotes</span>
            {pendingQuotes.length > 0 && (
              <span className="rounded-full bg-white/20 px-1.5 py-0.2 font-mono text-[10px]">
                {pendingQuotes.length}
              </span>
            )}
          </Link>
        </div>
      </header>

      {/* Metric Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total Revenue"
          value={formatCurrency(totalRevenue)}
          description="Net completed order totals"
          icon={<IndianRupee className="h-4 w-4" />}
        />

        <MetricCard
          label="Total Orders"
          value={totalOrders}
          description={`${currentMonthOrders.length} placed this month`}
          icon={<ShoppingBag className="h-4 w-4" />}
        />

        <MetricCard
          label="Active Jobs"
          value={activeOrders.length}
          description="In queue, printing & dispatch"
          icon={<Clock3 className="h-4 w-4" />}
        />

        <MetricCard
          label="Low Stock Alert"
          value={lowStockProducts.length}
          description="Products with ≤ 5 units"
          icon={<TriangleAlert className="h-4 w-4" />}
          danger={lowStockProducts.length > 0}
        />
      </div>

      {/* Main Grid: Revenue Chart + Production Snapshot */}
      <div className="grid gap-6 xl:grid-cols-12">
        {/* Revenue Analytics Card */}
        <section className="rounded-xl border border-line bg-white p-6 shadow-xs xl:col-span-7">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted block">
                Monthly Performance
              </span>
              <h2 className="mt-1 font-mono text-2xl font-bold text-ink">
                {formatCurrency(currentMonthRevenue)}
              </h2>
              <p className="mt-1 text-xs text-muted font-sans">
                Current month turnover
                {revenueChange !== null && (
                  <>
                    {' · '}
                    <span
                      className={`font-semibold ${
                        revenueChange >= 0 ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {revenueChange >= 0 ? '+' : ''}
                      {revenueChange.toFixed(1)}% vs prev
                    </span>
                  </>
                )}
              </p>
            </div>

            <div className="flex gap-4 bg-shell p-3 rounded-lg border border-line">
              <div>
                <p className="font-mono text-[9px] uppercase tracking-wider text-muted font-semibold">
                  Month Orders
                </p>
                <p className="mt-0.5 font-mono text-base font-bold text-ink">
                  {currentMonthOrders.length}
                </p>
              </div>
              <div className="border-l border-line pl-4">
                <p className="font-mono text-[9px] uppercase tracking-wider text-muted font-semibold">
                  Avg Order
                </p>
                <p className="mt-0.5 font-mono text-base font-bold text-ink">
                  {formatCompactCurrency(averageOrderValue)}
                </p>
              </div>
            </div>
          </div>

          {/* Bar Chart Visualization */}
          <div className="mt-6 flex h-40 items-end gap-3.5 pt-4 border-t border-line">
            {revenueSeries.map((item) => {
              const height = (item.value / maximumRevenue) * 100;
              const isCurrent = item.key === currentMonth.key;
              return (
                <div
                  key={item.key}
                  className="flex h-full flex-1 flex-col items-center justify-end gap-1.5"
                >
                  <span className="font-mono text-[10px] font-medium text-muted">
                    {formatCompactCurrency(item.value)}
                  </span>
                  <div className="flex h-28 w-full items-end justify-center rounded-lg bg-shell/80 p-1">
                    <div
                      className={`w-full rounded-md transition-all ${
                        isCurrent
                          ? 'bg-accent shadow-xs'
                          : 'bg-line hover:bg-muted/40'
                      }`}
                      style={{
                        height: `${Math.max(height, 6)}%`,
                      }}
                      title={`${item.label}: ${formatCurrency(item.value)}`}
                    />
                  </div>
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted">
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Production Snapshot Card */}
        <section className="rounded-xl border border-line bg-white p-6 shadow-xs xl:col-span-5 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-line pb-3.5">
            <h2 className="font-display text-base font-bold text-ink">
              Production Snapshot
            </h2>
            <span className="font-mono text-[11px] font-semibold text-accent bg-accent/10 px-2.5 py-0.5 rounded-full">
              {activeProducts.length} Active Items
            </span>
          </div>

          <div className="divide-y divide-line my-2">
            <div className="flex items-center gap-3 py-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50 text-purple-700 shrink-0">
                <Clock3 className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-ink">In Printing Queue</p>
                <p className="text-[11px] text-muted">Printing & QC processing</p>
              </div>
              <span className="font-mono text-sm font-bold text-ink">
                {productionOrders.length} jobs
              </span>
            </div>

            <div className="flex items-center gap-3 py-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-700 shrink-0">
                <FileText className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-ink">Pending CAD Quotes</p>
                <p className="text-[11px] text-muted">Awaiting response</p>
              </div>
              <span className="font-mono text-sm font-bold text-ink">
                {pendingQuotes.length} requests
              </span>
            </div>

            <div className="flex items-center gap-3 py-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-700 shrink-0">
                <Package className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-ink">Catalogue Inventory</p>
                <p className="text-[11px] text-muted">Active shop products</p>
              </div>
              <span className="font-mono text-sm font-bold text-ink">
                {activeProducts.length} products
              </span>
            </div>

            <div className="flex items-center gap-3 py-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-50 text-rose-700 shrink-0">
                <TriangleAlert className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-ink">Stock Warnings</p>
                <p className="text-[11px] text-muted">≤ 5 units remaining</p>
              </div>
              <span className="font-mono text-sm font-bold text-rose-600">
                {lowStockProducts.length} alerts
              </span>
            </div>
          </div>

          <div className="pt-3 border-t border-line">
            <Link
              to="/admin/inventory"
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-line bg-shell py-2 font-mono text-xs font-semibold text-ink hover:bg-line/40 transition-colors"
            >
              <span>Manage Filament Inventory</span>
              <ChevronRight className="h-3.5 w-3.5 text-muted" />
            </Link>
          </div>
        </section>

        {/* Action Required Orders Table */}
        <section className="rounded-xl border border-line bg-white p-6 shadow-xs xl:col-span-8">
          <div className="flex items-center justify-between border-b border-line pb-4">
            <div>
              <h2 className="font-display text-base font-bold text-ink">
                Active Print Queue & Action Items
              </h2>
              <p className="text-xs text-muted mt-0.5">
                Orders awaiting confirmation, slicing, or dispatch quality check
              </p>
            </div>

            <Link
              to="/admin/orders"
              className="inline-flex items-center gap-1 font-mono text-xs font-bold text-accent hover:underline"
            >
              <span>View all orders</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {actionOrders.length === 0 ? (
            <div className="py-10 text-center font-mono text-xs text-muted">
              No orders currently require action. Production queue is clear!
            </div>
          ) : (
            <div className="overflow-x-auto mt-3">
              <table className="w-full min-w-[600px] text-left">
                <thead>
                  <tr className="border-b border-line text-[10px] font-mono font-bold uppercase tracking-wider text-muted bg-shell/50">
                    <th className="py-2.5 px-3">Order ID</th>
                    <th className="py-2.5 px-3">Customer</th>
                    <th className="py-2.5 px-3">Items</th>
                    <th className="py-2.5 px-3">Value</th>
                    <th className="py-2.5 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {actionOrders.slice(0, 6).map((order) => {
                    const itemCount = Array.isArray(order.items)
                      ? order.items.reduce(
                          (total, item) => total + (Number(item.quantity) || 0),
                          0
                        )
                      : 0;

                    const firstItem =
                      Array.isArray(order.items) && order.items.length > 0
                        ? order.items[0].productName
                        : 'Custom Order';

                    return (
                      <tr key={order.id} className="hover:bg-shell/50 transition-colors">
                        <td className="py-3 px-3">
                          <Link
                            to={`/admin/orders/${order.id}`}
                            className="font-mono text-xs font-bold text-accent hover:underline"
                          >
                            #{order.id.slice(0, 8)}
                          </Link>
                          <span className="block font-mono text-[10px] text-muted mt-0.5">
                            {formatDate(order.date)}
                          </span>
                        </td>

                        <td className="py-3 px-3 max-w-[160px]">
                          <p className="text-xs font-semibold text-ink truncate">
                            {order.customerName || 'Customer'}
                          </p>
                          <p className="text-[10px] font-mono text-muted truncate">
                            {order.customerEmail || 'No email'}
                          </p>
                        </td>

                        <td className="py-3 px-3">
                          <p className="text-xs font-medium text-ink">
                            {itemCount} pcs
                          </p>
                          <p className="text-[10px] font-mono text-muted truncate max-w-[130px]">
                            {firstItem}
                          </p>
                        </td>

                        <td className="py-3 px-3 font-mono text-xs font-bold text-ink">
                          {formatCurrency(Number(order.total) || 0)}
                        </td>

                        <td className="py-3 px-3 text-right">
                          <StatusPill status={order.status} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Right Side Column: CAD Quotes + Low Stock */}
        <div className="grid gap-6 xl:col-span-4">
          {/* Recent CAD Quotes Card */}
          <section className="rounded-xl border border-line bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h2 className="font-display text-sm font-bold text-ink">
                Recent CAD Quotes
              </h2>
              <Link
                to="/admin/quotes"
                className="font-mono text-[11px] font-bold text-accent hover:underline"
              >
                View all
              </Link>
            </div>

            {quotes.length === 0 ? (
              <div className="py-6 text-center text-xs font-mono text-muted">
                No quote requests recorded.
              </div>
            ) : (
              <ul className="divide-y divide-line mt-1">
                {quotes.slice(0, 4).map((quote) => {
                  const price =
                    quote.adminPrice != null
                      ? Number(quote.adminPrice)
                      : quote.estimatedPrice != null
                      ? Number(quote.estimatedPrice)
                      : null;

                  return (
                    <li key={quote.id} className="py-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-bold text-ink">
                          #{quote.id.slice(0, 8)}
                        </span>
                        <QuotePill status={quote.status} />
                      </div>
                      <p className="mt-1 text-xs font-semibold text-ink truncate">
                        {quote.fileName || quote.productName || quote.requestType}
                      </p>
                      <p className="mt-0.5 text-[10px] font-mono text-muted">
                        {quote.customerName || 'Client'} · {quote.material || 'PLA'} · Qty {quote.quantity}
                      </p>
                      <p className="mt-1 font-mono text-xs font-bold text-accent">
                        {price !== null ? formatCurrency(price) : 'Pending Quote'}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Low Stock Filament Card */}
          <section className="rounded-xl border border-line bg-white p-5 shadow-xs">
            <div className="flex items-center gap-2 border-b border-line pb-3">
              <TriangleAlert className="h-4 w-4 text-amber-500" />
              <h2 className="font-display text-sm font-bold text-ink">
                Filament Stock Warnings
              </h2>
            </div>

            {lowStockProducts.length === 0 ? (
              <div className="py-6 text-center text-xs font-mono text-muted">
                Filament levels are sufficient.
              </div>
            ) : (
              <ul className="divide-y divide-line mt-1">
                {lowStockProducts.slice(0, 4).map((product) => (
                  <li key={product.id} className="flex items-center gap-3 py-2.5">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="h-8 w-8 rounded-md object-cover bg-shell shrink-0"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1581783342308-f792dbdd27c5?auto=format&fit=crop&q=80&w=100';
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-ink truncate">
                        {product.name}
                      </p>
                      <p className="text-[10px] font-mono text-muted">
                        {product.material || product.category || 'Material'}
                      </p>
                    </div>
                    <span
                      className={`font-mono text-xs font-bold ${
                        Number(product.stock) <= 2 ? 'text-rose-600' : 'text-amber-600'
                      }`}
                    >
                      {product.stock} left
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
