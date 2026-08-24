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
      return 'border-green-200 bg-green-50 text-green-700';

    case 'Printing':
    case 'Quality Check':
      return 'border-amber-200 bg-amber-50 text-amber-700';

    case 'Shipped':
      return 'border-blue-200 bg-blue-50 text-blue-700';

    case 'Confirmed':
      return 'border-slate-200 bg-slate-50 text-slate-700';

    case 'Cancelled':
      return 'border-red-200 bg-red-50 text-red-700';

    case 'Pending':
    default:
      return 'border-orange-200 bg-orange-50 text-orange-700';
  }
}

function getQuoteStatusClass(status: string): string {
  switch (status) {
    case 'Quoted':
      return 'border-blue-200 bg-blue-50 text-blue-700';

    case 'Accepted':
      return 'border-green-200 bg-green-50 text-green-700';

    case 'Completed':
      return 'border-green-200 bg-green-50 text-green-700';

    case 'Rejected':
      return 'border-red-200 bg-red-50 text-red-700';

    case 'Pending':
    default:
      return 'border-amber-200 bg-amber-50 text-amber-700';
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
      className={`inline-flex items-center whitespace-nowrap border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.08em] ${getOrderStatusClass(
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
      className={`inline-flex items-center whitespace-nowrap border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.08em] ${getQuoteStatusClass(
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
    <section className="border border-line-strong bg-white p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-500">
            {label}
          </p>

          <p
            className={`mt-2 font-display text-[25px] font-semibold tracking-[-0.02em] ${
              danger ? 'text-red-700' : 'text-ink'
            }`}
          >
            {value}
          </p>
        </div>

        <span
          className={
            danger
              ? 'text-red-600'
              : 'text-orange-600'
          }
        >
          {icon}
        </span>
      </div>

      <p className="mt-3 text-[12px] text-ink-500">
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

      <header className="flex flex-col gap-4 border-b border-line pb-5 lg:flex-row lg:items-end lg:justify-between">

        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-500">
            Administration
          </p>

          <h1 className="mt-2 font-display text-[32px] font-semibold tracking-[-0.03em] text-ink">
            Dashboard
          </h1>

          <p className="mt-2 text-[14px] text-ink-600">
            Production and business overview
          </p>
        </div>

        <div className="flex flex-wrap gap-2">

          <Link
            to="/admin/orders"
            className="inline-flex h-9 items-center justify-center gap-2 border border-line-strong bg-white px-3 text-[12px] font-medium text-ink hover:bg-paper"
          >
            Open orders
            <ArrowUpRight
              className="h-3.5 w-3.5"
              aria-hidden="true"
            />
          </Link>

          <Link
            to="/admin/custom-quotes"
            className="inline-flex h-9 items-center justify-center gap-2 border border-ink bg-ink px-3 text-[12px] font-medium text-white hover:bg-black"
          >
            Review quotes

            {pendingQuotes.length > 0 && (
              <span>
                ({pendingQuotes.length})
              </span>
            )}
          </Link>

        </div>

      </header>

      {/* ------------------------------------------------------------------ */}
      {/* KPI cards                                                           */}
      {/* ------------------------------------------------------------------ */}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">

        <MetricCard
          label="Total revenue"
          value={formatCurrency(
            totalRevenue
          )}
          description="Cancelled orders excluded"
          icon={
            <IndianRupee
              className="h-4 w-4"
              aria-hidden="true"
            />
          }
        />

        <MetricCard
          label="Total orders"
          value={totalOrders}
          description={`${currentMonthOrders.length} orders this month`}
          icon={
            <ShoppingBag
              className="h-4 w-4"
              aria-hidden="true"
            />
          }
        />

        <MetricCard
          label="Active jobs"
          value={activeOrders.length}
          description="Pending through shipped"
          icon={
            <Clock3
              className="h-4 w-4"
              aria-hidden="true"
            />
          }
        />

        <MetricCard
          label="Low stock"
          value={lowStockProducts.length}
          description="Products with 5 or fewer units"
          icon={
            <TriangleAlert
              className="h-4 w-4"
              aria-hidden="true"
            />
          }
          danger={
            lowStockProducts.length > 0
          }
        />

      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Main grid                                                           */}
      {/* ------------------------------------------------------------------ */}

      <div className="grid gap-4 xl:grid-cols-12">

        {/* ================================================================ */}
        {/* Revenue                                                           */}
        {/* ================================================================ */}

        <section className="border border-line-strong bg-white p-5 xl:col-span-7">

          <div className="flex flex-col justify-between gap-4 sm:flex-row">

            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-500">
                Revenue
              </p>

              <h2 className="mt-2 font-display text-[30px] font-semibold tracking-[-0.03em] text-ink">
                {formatCurrency(
                  currentMonthRevenue
                )}
              </h2>

              <p className="mt-1 text-[12px] text-ink-500">
                Current month

                {revenueChange !== null && (
                  <>
                    {' · '}

                    <span
                      className={
                        revenueChange >= 0
                          ? 'text-green-700'
                          : 'text-red-700'
                      }
                    >
                      {revenueChange >= 0
                        ? '+'
                        : ''}
                      {revenueChange.toFixed(
                        1
                      )}
                      %
                    </span>
                  </>
                )}
              </p>
            </div>

            <div className="flex gap-5">

              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-ink-500">
                  Orders
                </p>

                <p className="mt-1 font-display text-[18px] font-semibold text-ink">
                  {currentMonthOrders.length}
                </p>
              </div>

              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-ink-500">
                  Average
                </p>

                <p className="mt-1 font-display text-[18px] font-semibold text-ink">
                  {formatCompactCurrency(
                    averageOrderValue
                  )}
                </p>
              </div>

            </div>

          </div>

          {/* Chart */}

          <div className="mt-8 flex h-40 items-end gap-3">

            {revenueSeries.map(
              (item) => {
                const height =
                  (item.value /
                    maximumRevenue) *
                  100;

                const isCurrent =
                  item.key ===
                  currentMonth.key;

                return (
                  <div
                    key={item.key}
                    className="flex h-full flex-1 flex-col items-center justify-end gap-2"
                  >

                    <span className="font-mono text-[9px] text-ink-500">
                      {formatCompactCurrency(
                        item.value
                      )}
                    </span>

                    <div className="flex h-28 w-full items-end">

                      <div
                        className={
                          isCurrent
                            ? 'w-full bg-orange-500'
                            : 'w-full bg-slate-300'
                        }
                        style={{
                          height: `${Math.max(
                            height,
                            2
                          )}%`,
                        }}
                        title={`${item.label}: ${formatCurrency(
                          item.value
                        )}`}
                      />

                    </div>

                    <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-ink-500">
                      {item.label}
                    </span>

                  </div>
                );
              }
            )}

          </div>

        </section>

        {/* ================================================================ */}
        {/* Production snapshot                                               */}
        {/* ================================================================ */}

        <section className="border border-line-strong bg-white xl:col-span-5">

          <div className="flex items-center justify-between border-b border-line px-5 py-3.5">

            <h2 className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-500">
              Production snapshot
            </h2>

            <span className="font-mono text-[10px] text-ink-500">
              {activeProducts.length} active products
            </span>

          </div>

          <div className="divide-y divide-line">

            <div className="flex items-center gap-3 px-5 py-4">

              <div className="flex h-8 w-8 items-center justify-center bg-orange-50 text-orange-600">
                <Clock3
                  className="h-4 w-4"
                  aria-hidden="true"
                />
              </div>

              <div className="min-w-0 flex-1">

                <p className="text-[13px] font-medium text-ink">
                  In production
                </p>

                <p className="mt-0.5 text-[11px] text-ink-500">
                  Printing and quality check
                </p>

              </div>

              <span className="font-mono text-[13px] text-ink">
                {productionOrders.length}
              </span>

            </div>

            <div className="flex items-center gap-3 px-5 py-4">

              <div className="flex h-8 w-8 items-center justify-center bg-amber-50 text-amber-700">
                <FileText
                  className="h-4 w-4"
                  aria-hidden="true"
                />
              </div>

              <div className="min-w-0 flex-1">

                <p className="text-[13px] font-medium text-ink">
                  Pending quotes
                </p>

                <p className="mt-0.5 text-[11px] text-ink-500">
                  Custom requests awaiting review
                </p>

              </div>

              <span className="font-mono text-[13px] text-ink">
                {pendingQuotes.length}
              </span>

            </div>

            <div className="flex items-center gap-3 px-5 py-4">

              <div className="flex h-8 w-8 items-center justify-center bg-slate-50 text-slate-600">
                <Package
                  className="h-4 w-4"
                  aria-hidden="true"
                />
              </div>

              <div className="min-w-0 flex-1">

                <p className="text-[13px] font-medium text-ink">
                  Catalogue
                </p>

                <p className="mt-0.5 text-[11px] text-ink-500">
                  Active products available
                </p>

              </div>

              <span className="font-mono text-[13px] text-ink">
                {activeProducts.length}
              </span>

            </div>

            <div className="flex items-center gap-3 px-5 py-4">

              <div className="flex h-8 w-8 items-center justify-center bg-red-50 text-red-600">
                <TriangleAlert
                  className="h-4 w-4"
                  aria-hidden="true"
                />
              </div>

              <div className="min-w-0 flex-1">

                <p className="text-[13px] font-medium text-ink">
                  Stock alerts
                </p>

                <p className="mt-0.5 text-[11px] text-ink-500">
                  Five units or fewer
                </p>

              </div>

              <span className="font-mono text-[13px] text-red-700">
                {lowStockProducts.length}
              </span>

            </div>

          </div>

        </section>

        {/* ================================================================ */}
        {/* Orders requiring action                                           */}
        {/* ================================================================ */}

        <section className="border border-line-strong bg-white xl:col-span-8">

          <div className="flex items-center justify-between border-b border-line px-5 py-3.5">

            <h2 className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-500">
              Orders requiring action
            </h2>

            <Link
              to="/admin/orders"
              className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.1em] text-orange-600 hover:text-ink"
            >
              View all

              <ArrowUpRight
                className="h-3 w-3"
                aria-hidden="true"
              />
            </Link>

          </div>

          {actionOrders.length === 0 ? (
            <div className="px-5 py-10 text-center">

              <p className="text-[13px] text-ink-500">
                No orders currently require action.
              </p>

            </div>
          ) : (
            <div className="overflow-x-auto">

              <table className="w-full min-w-[700px] border-collapse text-left">

                <thead>
                  <tr className="border-b border-line">

                    <th className="px-5 py-2.5 font-mono text-[9px] uppercase tracking-[0.1em] text-ink-500">
                      Order
                    </th>

                    <th className="px-5 py-2.5 font-mono text-[9px] uppercase tracking-[0.1em] text-ink-500">
                      Customer
                    </th>

                    <th className="px-5 py-2.5 font-mono text-[9px] uppercase tracking-[0.1em] text-ink-500">
                      Items
                    </th>

                    <th className="px-5 py-2.5 font-mono text-[9px] uppercase tracking-[0.1em] text-ink-500">
                      Value
                    </th>

                    <th className="px-5 py-2.5 font-mono text-[9px] uppercase tracking-[0.1em] text-ink-500">
                      Status
                    </th>

                  </tr>
                </thead>

                <tbody>

                  {actionOrders
                    .slice(0, 8)
                    .map((order) => {

                      const itemCount =
                        Array.isArray(
                          order.items
                        )
                          ? order.items.reduce(
                              (
                                total,
                                item
                              ) =>
                                total +
                                (Number(
                                  item.quantity
                                ) || 0),
                              0
                            )
                          : 0;

                      const firstItem =
                        Array.isArray(
                          order.items
                        ) &&
                        order.items.length > 0
                          ? order.items[0]
                              .productName
                          : 'Order';

                      return (
                        <tr
                          key={order.id}
                          className="border-b border-line last:border-0 hover:bg-slate-50"
                        >

                          <td className="px-5 py-3">

                            <Link
                              to={`/admin/orders/${order.id}`}
                              className="font-mono text-[12px] text-orange-600 hover:text-ink"
                            >
                              #
                              {order.id.slice(
                                0,
                                8
                              )}
                            </Link>

                            <span className="mt-1 block font-mono text-[9px] text-ink-500">
                              {formatDate(
                                order.date
                              )}
                            </span>

                          </td>

                          <td className="max-w-[190px] px-5 py-3">

                            <p className="truncate text-[13px] text-ink-700">
                              {order.customerName ||
                                'Unknown customer'}
                            </p>

                            <p className="mt-1 truncate font-mono text-[9px] text-ink-500">
                              {order.customerEmail ||
                                'No email'}
                            </p>

                          </td>

                          <td className="px-5 py-3">

                            <p className="text-[13px] text-ink-700">
                              {itemCount} pcs
                            </p>

                            <p className="mt-1 max-w-[170px] truncate font-mono text-[9px] text-ink-500">
                              {firstItem}
                            </p>

                          </td>

                          <td className="px-5 py-3 font-mono text-[12px] text-ink">
                            {formatCurrency(
                              Number(
                                order.total
                              ) || 0
                            )}
                          </td>

                          <td className="px-5 py-3">
                            <StatusPill
                              status={
                                order.status
                              }
                            />
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
        {/* Right column                                                       */}
        {/* ================================================================ */}

        <div className="grid gap-4 xl:col-span-4">

          {/* -------------------------------------------------------------- */}
          {/* Recent quotes                                                   */}
          {/* -------------------------------------------------------------- */}

          <section className="border border-line-strong bg-white">

            <div className="flex items-center justify-between border-b border-line px-5 py-3.5">

              <h2 className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-500">
                Recent custom quotes
              </h2>

              <Link
                to="/admin/custom-quotes"
                className="font-mono text-[10px] uppercase tracking-[0.1em] text-orange-600 hover:text-ink"
              >
                View all
              </Link>

            </div>

            {quotes.length === 0 ? (
              <div className="px-5 py-8 text-center">

                <p className="text-[13px] text-ink-500">
                  No custom quotes yet.
                </p>

              </div>
            ) : (
              <ul className="divide-y divide-line">

                {quotes
                  .slice(0, 4)
                  .map((quote) => {

                    const price =
                      quote.adminPrice !=
                      null
                        ? Number(
                            quote.adminPrice
                          )
                        : quote.estimatedPrice !=
                            null
                          ? Number(
                              quote.estimatedPrice
                            )
                          : null;

                    return (
                      <li
                        key={quote.id}
                        className="px-5 py-3"
                      >

                        <div className="flex items-center justify-between gap-3">

                          <span className="font-mono text-[11px] text-ink">
                            #
                            {quote.id.slice(
                              0,
                              8
                            )}
                          </span>

                          <QuotePill
                            status={
                              quote.status
                            }
                          />

                        </div>

                        <p className="mt-1.5 truncate text-[13px] text-ink-700">
                          {quote.fileName ||
                            quote.productName ||
                            quote.requestType}
                        </p>

                        <p className="mt-1 truncate font-mono text-[9px] text-ink-500">
                          {quote.customerName ||
                            'Customer'}
                          {' · '}
                          {quote.material ||
                            'Material pending'}
                          {' · '}
                          Qty {quote.quantity}
                        </p>

                        <p className="mt-1 font-mono text-[10px] text-ink-600">
                          {price !== null
                            ? formatCurrency(
                                price
                              )
                            : 'Not priced'}
                        </p>

                      </li>
                    );
                  })}

              </ul>
            )}

          </section>

          {/* -------------------------------------------------------------- */}
          {/* Low stock                                                       */}
          {/* -------------------------------------------------------------- */}

          <section className="border border-line-strong bg-white">

            <div className="flex items-center gap-2 border-b border-line px-5 py-3.5">

              <TriangleAlert
                className="h-3.5 w-3.5 text-amber-600"
                aria-hidden="true"
              />

              <h2 className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-500">
                Low stock products
              </h2>

            </div>

            {lowStockProducts.length === 0 ? (
              <div className="px-5 py-8 text-center">

                <p className="text-[13px] text-ink-500">
                  No low-stock products.
                </p>

              </div>
            ) : (
              <ul className="divide-y divide-line">

                {lowStockProducts
                  .slice(0, 5)
                  .map((product) => (
                    <li
                      key={product.id}
                      className="flex items-center gap-3 px-5 py-3"
                    >

                      <div className="flex h-8 w-8 shrink-0 items-center justify-center border border-line bg-slate-50">
                        <Package
                          className="h-4 w-4 text-ink-500"
                          aria-hidden="true"
                        />
                      </div>

                      <div className="min-w-0 flex-1">

                        <p className="truncate text-[13px] text-ink-700">
                          {product.name}
                        </p>

                        <p className="mt-0.5 truncate font-mono text-[9px] text-ink-500">
                          {product.material ||
                            product.category ||
                            'Product'}
                        </p>

                      </div>

                      <span
                        className={
                          Number(
                            product.stock
                          ) <= 2
                            ? 'font-mono text-[10px] text-red-700'
                            : 'font-mono text-[10px] text-amber-700'
                        }
                      >
                        {product.stock} left
                      </span>

                    </li>
                  ))}

              </ul>
            )}

            <div className="border-t border-line px-5 py-3">

              <Link
                to="/admin/inventory"
                className="inline-flex h-9 items-center justify-center border border-line-strong bg-white px-3 text-[12px] font-medium text-ink hover:bg-slate-50"
              >
                Manage inventory
              </Link>

            </div>

          </section>

        </div>

      </div>

    </div>
  );
}

export default Dashboard;
