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
      return 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300';

    case 'Printing':
    case 'Quality Check':
      return 'border-brand-200 dark:border-brand-800 bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300';

    case 'Shipped':
      return 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300';

    case 'Confirmed':
      return 'border-zinc-200 dark:border-slate-700 bg-zinc-50 dark:bg-slate-800 text-zinc-700 dark:text-slate-300';

    case 'Cancelled':
      return 'border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300';

    case 'Pending':
    default:
      return 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300';
  }
}

function getQuoteStatusClass(status: string): string {
  switch (status) {
    case 'Quoted':
      return 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300';

    case 'Accepted':
    case 'Completed':
      return 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300';

    case 'Rejected':
      return 'border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300';

    case 'Pending':
    default:
      return 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300';
  }
}

/* -------------------------------------------------------------------------- */
/* Small UI components                                                        */
/* -------------------------------------------------------------------------- */

function StatusPill({
  status,
}: {
  status: string;
}) {
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

function QuotePill({
  status,
}: {
  status: string;
}) {
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
    <section className="rounded-2xl border border-zinc-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm hover:border-brand-300 dark:hover:border-brand-500/50 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-charcoal-lighter dark:text-slate-400">
            {label}
          </p>

          <p
            className={`mt-2 font-serif text-3xl font-bold tracking-tight ${
              danger ? 'text-rose-600 dark:text-rose-400' : 'text-charcoal dark:text-slate-100'
            }`}
          >
            {value}
          </p>
        </div>

        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${
            danger
              ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
              : 'bg-brand-50 dark:bg-brand-500/15 text-brand-500 dark:text-brand-400'
          }`}
        >
          {icon}
        </div>
      </div>

      <p className="mt-3 text-xs text-charcoal-light dark:text-slate-400 font-mono">
        {description}
      </p>
    </section>
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

  /* ------------------------------------------------------------------------ */
  /* Loading / error                                                          */
  /* ------------------------------------------------------------------------ */

  const isLoading =
    ordersLoading ||
    productsLoading ||
    quotesLoading;

  const hasError =
    ordersError ||
    productsError ||
    quotesError;

  if (isLoading) {
    return (
      <div className="flex min-h-[500px] items-center justify-center">
        <div className="flex flex-col items-center">
          <Loader2
            className="h-7 w-7 animate-spin text-orange-600"
            aria-hidden="true"
          />

          <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-500">
            Loading dashboard
          </p>
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="space-y-5">
        <header className="border-b border-line pb-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-500">
            Administration
          </p>

          <h1 className="mt-2 font-display text-[32px] font-semibold tracking-[-0.03em] text-ink">
            Dashboard
          </h1>

          <p className="mt-2 text-[14px] text-ink-600">
            Unable to load dashboard data.
          </p>
        </header>

        <div className="border border-red-200 bg-red-50 p-5">
          <div className="flex items-start gap-3">
            <TriangleAlert
              className="mt-0.5 h-5 w-5 shrink-0 text-red-600"
              aria-hidden="true"
            />

            <div>
              <h2 className="font-medium text-red-800">
                Dashboard data could not be loaded
              </h2>

              <p className="mt-1 text-[13px] text-red-700">
                Please check the Firebase connection,
                permissions, and Firestore configuration.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------------------ */
  /* Revenue                                                                  */
  /* ------------------------------------------------------------------------ */

  const validOrders = orders.filter(
    (order) => order.status !== 'Cancelled'
  );

  const totalRevenue = validOrders.reduce(
    (total, order) =>
      total + (Number(order.total) || 0),
    0
  );

  const totalOrders = orders.length;

  const activeOrders = orders.filter((order) =>
    [
      'Pending',
      'Confirmed',
      'Printing',
      'Quality Check',
      'Shipped',
    ].includes(order.status)
  );

  const lowStockProducts = products.filter(
    (product) =>
      Number(product.stock) <= 5
  );

  /* ------------------------------------------------------------------------ */
  /* Quotes                                                                   */
  /* ------------------------------------------------------------------------ */

  const pendingQuotes = quotes.filter(
    (quote) => quote.status === 'Pending'
  );

  /* ------------------------------------------------------------------------ */
  /* Revenue history                                                          */
  /* ------------------------------------------------------------------------ */

  const revenueByMonth = new Map<
    string,
    number
  >();

  validOrders.forEach((order) => {
    const monthKey = getMonthKey(order.date);

    if (!monthKey) {
      return;
    }

    const currentValue =
      revenueByMonth.get(monthKey) || 0;

    revenueByMonth.set(
      monthKey,
      currentValue +
        (Number(order.total) || 0)
    );
  });

  const now = new Date();

  const revenueSeries = Array.from(
    { length: 6 },
    (_, index) => {
      const date = new Date(
        now.getFullYear(),
        now.getMonth() - (5 - index),
        1
      );

      const year = date.getFullYear();

      const month = String(
        date.getMonth() + 1
      ).padStart(2, '0');

      const key = `${year}-${month}`;

      return {
        key,
        label: getMonthLabel(key),
        value:
          revenueByMonth.get(key) || 0,
      };
    }
  );

  const maximumRevenue = Math.max(
    ...revenueSeries.map(
      (item) => item.value
    ),
    1
  );

  const currentMonth =
    revenueSeries[
      revenueSeries.length - 1
    ];

  const previousMonth =
    revenueSeries[
      revenueSeries.length - 2
    ];

  const revenueChange =
    previousMonth.value > 0
      ? ((currentMonth.value -
          previousMonth.value) /
          previousMonth.value) *
        100
      : null;

  /* ------------------------------------------------------------------------ */
  /* Current month                                                            */
  /* ------------------------------------------------------------------------ */

  const currentMonthOrders =
    validOrders.filter(
      (order) =>
        getMonthKey(order.date) ===
        currentMonth.key
    );

  const currentMonthRevenue =
    currentMonthOrders.reduce(
      (total, order) =>
        total + (Number(order.total) || 0),
      0
    );

  const averageOrderValue =
    currentMonthOrders.length > 0
      ? currentMonthRevenue /
        currentMonthOrders.length
      : 0;

  /* ------------------------------------------------------------------------ */
  /* Orders requiring action                                                  */
  /* ------------------------------------------------------------------------ */

  const actionOrders = orders.filter(
    (order) =>
      order.status === 'Pending' ||
      order.status === 'Confirmed' ||
      order.status === 'Quality Check'
  );

  /* ------------------------------------------------------------------------ */
  /* Production count                                                         */
  /* ------------------------------------------------------------------------ */

  const productionOrders =
    orders.filter(
      (order) =>
        order.status === 'Printing' ||
        order.status === 'Quality Check'
    );

  /* ------------------------------------------------------------------------ */
  /* Active products                                                          */
  /* ------------------------------------------------------------------------ */

  const activeProducts =
    products.filter(
      (product) =>
        product.active !== false
    );

  /* ------------------------------------------------------------------------ */
  /* Render                                                                   */
  /* ------------------------------------------------------------------------ */

  return (
    <div className="space-y-5">

      {/* ------------------------------------------------------------------ */}
      {/* Header                                                              */}
      {/* ------------------------------------------------------------------ */}

      <header className="flex flex-col gap-4 border-b border-zinc-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-brand-500 block">
            Studio Overview
          </span>
          <h1 className="mt-1 font-serif text-3xl font-bold text-charcoal sm:text-4xl">
            Workshop Dashboard
          </h1>
          <p className="mt-1 text-xs text-charcoal-light">
            Real-time telemetry, 3D printing queue, revenue analytics, and inventory health.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <Link
            to="/admin/orders"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-zinc-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 font-mono text-xs font-bold text-charcoal dark:text-slate-100 shadow-sm hover:border-brand-300 dark:hover:border-brand-500/50 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
          >
            <span>Live Orders</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>

          <Link
            to="/admin/quotes"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 font-mono text-xs font-bold text-white shadow-md shadow-brand-500/20 hover:bg-brand-600 transition-colors"
          >
            <span>Review Quotes</span>
            {pendingQuotes.length > 0 && (
              <span className="rounded-full bg-white/20 px-1.5 py-0.2 text-[10px]">
                {pendingQuotes.length}
              </span>
            )}
          </Link>
        </div>
      </header>

      {/* ------------------------------------------------------------------ */}
      {/* KPI cards                                                           */}
      {/* ------------------------------------------------------------------ */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total Revenue"
          value={formatCurrency(totalRevenue)}
          description="Excludes cancelled requests"
          icon={<IndianRupee className="h-5 w-5" />}
        />

        <MetricCard
          label="Total Orders"
          value={totalOrders}
          description={`${currentMonthOrders.length} placed this month`}
          icon={<ShoppingBag className="h-5 w-5" />}
        />

        <MetricCard
          label="Active Jobs"
          value={activeOrders.length}
          description="In queue, slicing, printing & QC"
          icon={<Clock3 className="h-5 w-5" />}
        />

        <MetricCard
          label="Low Stock Filament"
          value={lowStockProducts.length}
          description="Spools with ≤ 5 units left"
          icon={<TriangleAlert className="h-5 w-5" />}
          danger={lowStockProducts.length > 0}
        />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Main grid                                                           */}
      {/* ------------------------------------------------------------------ */}

      <div className="grid gap-6 xl:grid-cols-12">
        {/* ================================================================ */}
        {/* Revenue                                                           */}
        {/* ================================================================ */}

        <section className="rounded-3xl border border-zinc-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm xl:col-span-7">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-charcoal-lighter dark:text-slate-400 block">
                Monthly Turnover
              </span>

              <h2 className="mt-1 font-serif text-3xl font-bold text-charcoal dark:text-slate-100">
                {formatCurrency(currentMonthRevenue)}
              </h2>

              <p className="mt-1 text-xs text-charcoal-light dark:text-slate-400 font-mono">
                Current month
                {revenueChange !== null && (
                  <>
                    {' · '}
                    <span
                      className={`font-bold ${
                        revenueChange >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {revenueChange >= 0 ? '+' : ''}
                      {revenueChange.toFixed(1)}% vs prev month
                    </span>
                  </>
                )}
              </p>
            </div>

            <div className="flex gap-4 sm:gap-6 bg-[#f4f2ef] dark:bg-slate-800 p-3 rounded-2xl border border-zinc-100 dark:border-slate-700">
              <div>
                <p className="font-mono text-[9px] uppercase tracking-wider text-charcoal-lighter dark:text-slate-400">
                  Orders
                </p>
                <p className="mt-0.5 font-serif text-lg font-bold text-charcoal dark:text-slate-100">
                  {currentMonthOrders.length}
                </p>
              </div>

              <div className="border-l border-zinc-200 dark:border-slate-700 pl-4 sm:pl-6">
                <p className="font-mono text-[9px] uppercase tracking-wider text-charcoal-lighter dark:text-slate-400">
                  Avg Order
                </p>
                <p className="mt-0.5 font-serif text-lg font-bold text-charcoal dark:text-slate-100">
                  {formatCompactCurrency(averageOrderValue)}
                </p>
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="mt-8 flex h-48 items-end gap-3 pt-6 border-t border-zinc-100 dark:border-slate-800">
            {revenueSeries.map((item) => {
              const height = (item.value / maximumRevenue) * 100;
              const isCurrent = item.key === currentMonth.key;

              return (
                <div
                  key={item.key}
                  className="flex h-full flex-1 flex-col items-center justify-end gap-2"
                >
                  <span className="font-mono text-[10px] font-bold text-charcoal-light dark:text-slate-400">
                    {formatCompactCurrency(item.value)}
                  </span>

                  <div className="flex h-32 w-full items-end justify-center rounded-xl bg-zinc-50 dark:bg-slate-800/60 p-1">
                    <div
                      className={`w-full rounded-lg transition-all ${
                        isCurrent
                          ? 'bg-brand-500 shadow-md shadow-brand-500/20'
                          : 'bg-zinc-200 dark:bg-slate-700 hover:bg-zinc-300 dark:hover:bg-slate-600'
                      }`}
                      style={{
                        height: `${Math.max(height, 6)}%`,
                      }}
                      title={`${item.label}: ${formatCurrency(item.value)}`}
                    />
                  </div>

                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-charcoal-light dark:text-slate-400">
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* ================================================================ */}
        {/* Production snapshot                                               */}
        {/* ================================================================ */}

        <section className="rounded-3xl border border-zinc-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm xl:col-span-5 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-slate-800 pb-4">
            <h2 className="font-serif text-lg font-bold text-charcoal dark:text-slate-100">
              Production Snapshot
            </h2>

            <span className="font-mono text-xs font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-500/15 px-2.5 py-1 rounded-full">
              {activeProducts.length} Catalogue Items
            </span>
          </div>

          <div className="divide-y divide-zinc-100 dark:divide-slate-800">
            <div className="flex items-center gap-3.5 py-3.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-500/15 text-brand-500 dark:text-brand-400">
                <Clock3 className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-charcoal dark:text-slate-100">In Active Print</p>
                <p className="text-[11px] text-charcoal-lighter dark:text-slate-400">
                  Printing & Quality Check stages
                </p>
              </div>
              <span className="font-mono text-sm font-bold text-charcoal dark:text-slate-100">
                {productionOrders.length} jobs
              </span>
            </div>

            <div className="flex items-center gap-3.5 py-3.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
                <FileText className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-charcoal dark:text-slate-100">Pending CAD Quotes</p>
                <p className="text-[11px] text-charcoal-lighter dark:text-slate-400">
                  Custom customer requests
                </p>
              </div>
              <span className="font-mono text-sm font-bold text-charcoal dark:text-slate-100">
                {pendingQuotes.length} files
              </span>
            </div>

            <div className="flex items-center gap-3.5 py-3.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                <Package className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-charcoal dark:text-slate-100">Studio Catalogue</p>
                <p className="text-[11px] text-charcoal-lighter dark:text-slate-400">
                  Active ready-to-print designs
                </p>
              </div>
              <span className="font-mono text-sm font-bold text-charcoal dark:text-slate-100">
                {activeProducts.length} pieces
              </span>
            </div>

            <div className="flex items-center gap-3.5 py-3.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400">
                <TriangleAlert className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-charcoal dark:text-slate-100">Stock Warnings</p>
                <p className="text-[11px] text-charcoal-lighter dark:text-slate-400">
                  ≤ 5 units remaining
                </p>
              </div>
              <span className="font-mono text-sm font-bold text-rose-600 dark:text-rose-400">
                {lowStockProducts.length} alerts
              </span>
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-100 dark:border-slate-800">
            <Link
              to="/admin/inventory"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 dark:border-slate-800 bg-[#f4f2ef] dark:bg-slate-800 py-2.5 font-mono text-xs font-bold text-charcoal dark:text-slate-100 hover:bg-zinc-100 dark:hover:bg-slate-700 transition-colors"
            >
              <span>Manage Filament Inventory</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </section>

        {/* ================================================================ */}
        {/* Orders requiring action                                           */}
        {/* ================================================================ */}

        <section className="rounded-3xl border border-zinc-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm xl:col-span-8">
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-slate-800 pb-4">
            <div>
              <h2 className="font-serif text-lg font-bold text-charcoal dark:text-slate-100">
                Active Print Queue & Action Required
              </h2>
              <p className="text-xs text-charcoal-lighter dark:text-slate-400 mt-0.5">
                Orders currently waiting for confirmation, slicing, or quality check
              </p>
            </div>

            <Link
              to="/admin/orders"
              className="inline-flex items-center gap-1 font-mono text-xs font-bold text-brand-600 dark:text-brand-400 hover:text-brand-700"
            >
              <span>View all</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {actionOrders.length === 0 ? (
            <div className="py-12 text-center">
              <p className="font-mono text-xs font-semibold text-charcoal-lighter dark:text-slate-400">
                No orders currently require immediate action. All clear!
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto mt-4">
              <table className="w-full min-w-[650px] text-left">
                <thead>
                  <tr className="border-b border-zinc-100 dark:border-slate-800 text-[10px] font-mono font-bold uppercase tracking-wider text-charcoal-lighter dark:text-slate-400">
                    <th className="pb-3 pr-4">Order ID</th>
                    <th className="pb-3 px-4">Customer</th>
                    <th className="pb-3 px-4">Items</th>
                    <th className="pb-3 px-4">Value</th>
                    <th className="pb-3 pl-4 text-right">Status</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-zinc-50 dark:divide-slate-800/60">
                  {actionOrders.slice(0, 8).map((order) => {
                    const itemCount = Array.isArray(order.items)
                      ? order.items.reduce(
                          (total, item) => total + (Number(item.quantity) || 0),
                          0
                        )
                      : 0;

                    const firstItem =
                      Array.isArray(order.items) && order.items.length > 0
                        ? order.items[0].productName
                        : 'Custom Print';

                    return (
                      <tr key={order.id} className="hover:bg-zinc-50/60 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-3.5 pr-4">
                          <Link
                            to={`/admin/orders/${order.id}`}
                            className="font-mono text-xs font-bold text-brand-600 dark:text-brand-400 hover:text-brand-700 underline underline-offset-4"
                          >
                            #{order.id.slice(0, 8)}
                          </Link>
                          <span className="block font-mono text-[10px] text-charcoal-lighter dark:text-slate-400 mt-0.5">
                            {formatDate(order.date)}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 max-w-[180px]">
                          <p className="text-xs font-bold text-charcoal dark:text-slate-100 truncate">
                            {order.customerName || 'Customer'}
                          </p>
                          <p className="text-[10px] font-mono text-charcoal-lighter dark:text-slate-400 truncate">
                            {order.customerEmail || 'No email'}
                          </p>
                        </td>

                        <td className="py-3.5 px-4">
                          <p className="text-xs font-semibold text-charcoal dark:text-slate-200">
                            {itemCount} pcs
                          </p>
                          <p className="text-[10px] font-mono text-charcoal-lighter dark:text-slate-400 truncate max-w-[140px]">
                            {firstItem}
                          </p>
                        </td>

                        <td className="py-3.5 px-4 font-mono text-xs font-bold text-charcoal dark:text-slate-100">
                          {formatCurrency(Number(order.total) || 0)}
                        </td>

                        <td className="py-3.5 pl-4 text-right">
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

        {/* ================================================================ */}
        {/* Right column: Quotes + Low Stock                                  */}
        {/* ================================================================ */}

        <div className="grid gap-6 xl:col-span-4">
          {/* Recent quotes */}
          <section className="rounded-3xl border border-zinc-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-slate-800 pb-3.5">
              <h2 className="font-serif text-base font-bold text-charcoal dark:text-slate-100">
                Recent CAD Quotes
              </h2>
              <Link
                to="/admin/quotes"
                className="font-mono text-[11px] font-bold text-brand-600 dark:text-brand-400 hover:text-brand-700"
              >
                View all
              </Link>
            </div>

            {quotes.length === 0 ? (
              <div className="py-8 text-center text-xs font-mono text-charcoal-lighter dark:text-slate-400">
                No custom quote requests yet.
              </div>
            ) : (
              <ul className="divide-y divide-zinc-50 dark:divide-slate-800/60 mt-2">
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
                        <span className="font-mono text-xs font-bold text-charcoal dark:text-slate-100">
                          #{quote.id.slice(0, 8)}
                        </span>
                        <QuotePill status={quote.status} />
                      </div>

                      <p className="mt-1 text-xs font-bold text-charcoal dark:text-slate-100 truncate">
                        {quote.fileName || quote.productName || quote.requestType}
                      </p>

                      <p className="mt-0.5 text-[10px] font-mono text-charcoal-lighter dark:text-slate-400">
                        {quote.customerName || 'Client'} · {quote.material || 'PLA'} · Qty {quote.quantity}
                      </p>

                      <p className="mt-1 font-mono text-xs font-bold text-brand-600 dark:text-brand-400">
                        {price !== null ? formatCurrency(price) : 'Awaiting Pricing'}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Low Stock Alerts */}
          <section className="rounded-3xl border border-zinc-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
            <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-slate-800 pb-3.5">
              <TriangleAlert className="h-4 w-4 text-amber-500" />
              <h2 className="font-serif text-base font-bold text-charcoal dark:text-slate-100">
                Low Filament Inventory
              </h2>
            </div>

            {lowStockProducts.length === 0 ? (
              <div className="py-8 text-center text-xs font-mono text-charcoal-lighter dark:text-slate-400">
                All filament & stock levels healthy.
              </div>
            ) : (
              <ul className="divide-y divide-zinc-50 dark:divide-slate-800/60 mt-2">
                {lowStockProducts.slice(0, 4).map((product) => (
                  <li key={product.id} className="flex items-center gap-3 py-3">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="h-9 w-9 rounded-xl object-cover bg-zinc-100 dark:bg-slate-800 shrink-0"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1581783342308-f792dbdd27c5?auto=format&fit=crop&q=80&w=100';
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-charcoal dark:text-slate-100 truncate">
                        {product.name}
                      </p>
                      <p className="text-[10px] font-mono text-charcoal-lighter dark:text-slate-400">
                        {product.material || product.category || 'Filament'}
                      </p>
                    </div>
                    <span
                      className={`font-mono text-xs font-bold ${
                        Number(product.stock) <= 2
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-amber-600 dark:text-amber-400'
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
