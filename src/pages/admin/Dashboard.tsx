import { useState, useMemo, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  ShoppingBag,
  IndianRupee,
  Clock,
  Package,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Download,
  ChevronDown,
  ExternalLink,
  Layers,
  RotateCcw,
  Plus,
  Truck,
  Sparkles,
  FileSpreadsheet,
  BarChart3,
  SlidersHorizontal,
  ArrowRight,
} from 'lucide-react';

import { useOrders } from '../../hooks/useOrders';
import { useProducts } from '../../hooks/useProducts';
import { useQuotes } from '../../hooks/useQuotes';
import {
  exportOrdersToCsv,
  exportInventoryToCsv,
  exportRevenueSummaryToCsv,
  exportProductPerformanceToCsv,
  exportCustomPrintingRevenueToCsv,
} from '../../utils/exportCsv';
import {
  StatCard,
  StatusBadge,
  LoadingState,
  ErrorState,
} from '../../components/admin/shared';

/* -------------------------------------------------------------------------- */
/* Types & Constants                                                          */
/* -------------------------------------------------------------------------- */

type DateFilterType = 'today' | '7days' | '30days' | 'custom';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCompactCurrency(value: number): string {
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(1)}k`;
  return `₹${Math.round(value)}`;
}

export function Dashboard() {
  const { data: orders = [], isLoading: ordersLoading, isError: ordersError, refetch: refetchOrders } = useOrders();
  const { data: products = [], isLoading: productsLoading, isError: productsError, refetch: refetchProducts } = useProducts();
  const { data: quotes = [], isLoading: quotesLoading, isError: quotesError, refetch: refetchQuotes } = useQuotes();

  // Date Filter State
  const [dateFilter, setDateFilter] = useState<DateFilterType>('30days');
  const [customStartDate, setCustomStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [customEndDate, setCustomEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Chart Mode: Revenue vs Orders
  const [chartMetric, setChartMetric] = useState<'revenue' | 'orders'>('revenue');

  // Export Dropdown State
  const [isExportOpen, setIsExportOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setIsExportOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isLoading = ordersLoading || productsLoading || quotesLoading;
  const isError = ordersError || productsError || quotesError;

  /* -------------------------------------------------------------------------- */
  /* Filter Orders by Selected Date Window                                     */
  /* -------------------------------------------------------------------------- */

  const { filteredOrders, dateRangeLabel } = useMemo(() => {
    const now = new Date();
    let startTimestamp = 0;
    let endTimestamp = Date.now();
    let label = 'Last 30 Days';

    if (dateFilter === 'today') {
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      startTimestamp = todayStart.getTime();
      label = 'Today';
    } else if (dateFilter === '7days') {
      startTimestamp = Date.now() - 7 * 24 * 60 * 60 * 1000;
      label = 'Last 7 Days';
    } else if (dateFilter === '30days') {
      startTimestamp = Date.now() - 30 * 24 * 60 * 60 * 1000;
      label = 'Last 30 Days';
    } else if (dateFilter === 'custom') {
      startTimestamp = customStartDate ? new Date(customStartDate).getTime() : 0;
      endTimestamp = customEndDate ? new Date(customEndDate + 'T23:59:59').getTime() : Date.now();
      label = `${customStartDate || 'Start'} to ${customEndDate || 'End'}`;
    }

    const filtered = orders.filter((o) => {
      const time = new Date(o.date).getTime();
      if (isNaN(time)) return true;
      return time >= startTimestamp && time <= endTimestamp;
    });

    return { filteredOrders: filtered, dateRangeLabel: label };
  }, [orders, dateFilter, customStartDate, customEndDate]);

  /* -------------------------------------------------------------------------- */
  /* Top Metrics Cards Calculations                                             */
  /* -------------------------------------------------------------------------- */

  const metrics = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    // Today's Sales
    const todayOrders = orders.filter((o) => {
      const time = new Date(o.date).getTime();
      return time >= todayStart && o.status !== 'Cancelled';
    });
    const todaySales = todayOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);

    // Filtered Period Sales & Counts
    const validFilteredOrders = filteredOrders.filter((o) => o.status !== 'Cancelled');
    const periodRevenue = validFilteredOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    const newOrdersCount = filteredOrders.length;

    // Operational Order Stages (Global active queue)
    const pendingOrders = orders.filter((o) => o.status === 'Pending');
    const processingOrders = orders.filter((o) =>
      ['Processing', 'Confirmed', 'Printing', 'Quality Check'].includes(o.status)
    );
    const readyToShipOrders = orders.filter(
      (o) => o.status === 'Ready to ship' || o.shippingStatus === 'Ready to ship'
    );
    const inTransitOrders = orders.filter(
      (o) => o.status === 'Shipped' || o.shippingStatus === 'In transit' || o.shippingStatus === 'Shipped'
    );

    // Product Inventory Alerts
    const lowStockThresholdDefault = 5;
    const lowStockProducts = products.filter((p) => {
      const threshold = Number(p.lowStockThreshold) || lowStockThresholdDefault;
      const stock = Number(p.stock) || 0;
      return stock > 0 && stock <= threshold;
    });
    const outOfStockProducts = products.filter((p) => (Number(p.stock) || 0) === 0);

    // Pending Custom CAD Quotes
    const pendingQuotes = quotes.filter(
      (q) => q.status === 'Pending' || q.status === 'New Request' || q.status === 'Under Review'
    );

    // Revenue Partition: Catalogue vs Custom 3D Printing
    let catalogueRevenue = 0;
    let customPrintingRevenue = 0;

    validFilteredOrders.forEach((order) => {
      let isCustomOrder = Boolean(order.quoteId);
      (order.items || []).forEach((item) => {
        const itemSubtotal = (Number(item.price) || 0) * (Number(item.quantity) || 1);
        if (item.quoteId || item.customPrint || isCustomOrder) {
          customPrintingRevenue += itemSubtotal;
        } else {
          catalogueRevenue += itemSubtotal;
        }
      });
    });

    // Average Order Value
    const aov = validFilteredOrders.length > 0 ? periodRevenue / validFilteredOrders.length : 0;

    return {
      todaySales,
      todayOrdersCount: todayOrders.length,
      periodRevenue,
      newOrdersCount,
      pendingOrdersCount: pendingOrders.length,
      processingOrdersCount: processingOrders.length,
      readyToShipCount: readyToShipOrders.length,
      inTransitCount: inTransitOrders.length,
      lowStockCount: lowStockProducts.length,
      outOfStockCount: outOfStockProducts.length,
      pendingQuotesCount: pendingQuotes.length,
      catalogueRevenue,
      customPrintingRevenue,
      aov,
      lowStockList: lowStockProducts.slice(0, 6),
      outOfStockList: outOfStockProducts.slice(0, 6),
      pendingQuotesList: pendingQuotes.slice(0, 5),
    };
  }, [orders, products, quotes, filteredOrders]);

  /* -------------------------------------------------------------------------- */
  /* Recharts Time Series Generation                                            */
  /* -------------------------------------------------------------------------- */

  const chartData = useMemo(() => {
    // Generate buckets based on dateFilter
    const buckets: { [key: string]: { label: string; dateKey: string; catalogue: number; custom: number; total: number; ordersCount: number } } = {};

    const dayCount = dateFilter === 'today' ? 1 : dateFilter === '7days' ? 7 : 30;
    const now = new Date();

    if (dateFilter === 'today') {
      // 4-hour intervals for today
      for (let h = 0; h < 24; h += 4) {
        const hourLabel = `${h}:00`;
        buckets[hourLabel] = {
          label: hourLabel,
          dateKey: hourLabel,
          catalogue: 0,
          custom: 0,
          total: 0,
          ordersCount: 0,
        };
      }
    } else {
      // Daily intervals for 7 or 30 days
      for (let i = dayCount - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dateKey = d.toISOString().split('T')[0];
        const label = d.toLocaleDateString('en-IN', {
          month: 'short',
          day: 'numeric',
        });
        buckets[dateKey] = {
          label,
          dateKey,
          catalogue: 0,
          custom: 0,
          total: 0,
          ordersCount: 0,
        };
      }
    }

    filteredOrders.forEach((order) => {
      if (order.status === 'Cancelled') return;
      const orderDate = new Date(order.date);
      if (isNaN(orderDate.getTime())) return;

      let key = orderDate.toISOString().split('T')[0];
      if (dateFilter === 'today') {
        const h = Math.floor(orderDate.getHours() / 4) * 4;
        key = `${h}:00`;
      }

      if (!buckets[key]) {
        buckets[key] = {
          label: orderDate.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
          dateKey: key,
          catalogue: 0,
          custom: 0,
          total: 0,
          ordersCount: 0,
        };
      }

      let orderCatalogue = 0;
      let orderCustom = 0;
      const isCustomOrder = Boolean(order.quoteId);

      (order.items || []).forEach((item) => {
        const lineTotal = (Number(item.price) || 0) * (Number(item.quantity) || 1);
        if (item.quoteId || item.customPrint || isCustomOrder) {
          orderCustom += lineTotal;
        } else {
          orderCatalogue += lineTotal;
        }
      });

      // If no items breakdown, attribute to catalogue
      if (orderCatalogue === 0 && orderCustom === 0) {
        orderCatalogue = Number(order.total) || 0;
      }

      buckets[key].catalogue += orderCatalogue;
      buckets[key].custom += orderCustom;
      buckets[key].total += Number(order.total) || 0;
      buckets[key].ordersCount += 1;
    });

    return Object.values(buckets);
  }, [filteredOrders, dateFilter]);

  /* -------------------------------------------------------------------------- */
  /* Top-Selling Products Calculation                                           */
  /* -------------------------------------------------------------------------- */

  const topSellingProducts = useMemo(() => {
    const productStats = new Map<string, {
      productId: string;
      productName: string;
      unitsSold: number;
      revenue: number;
      category?: string;
      sku?: string;
      currentStock: number;
    }>();

    orders.forEach((order) => {
      if (order.status === 'Cancelled') return;
      (order.items || []).forEach((item) => {
        if (!item.productId) return;
        const existing = productStats.get(item.productId) || {
          productId: item.productId,
          productName: item.productName || 'Unnamed Product',
          unitsSold: 0,
          revenue: 0,
          currentStock: 0,
        };
        existing.unitsSold += Number(item.quantity) || 0;
        existing.revenue += (Number(item.price) || 0) * (Number(item.quantity) || 1);
        productStats.set(item.productId, existing);
      });
    });

    // Cross-link with live product catalog for stock & SKU
    const result = Array.from(productStats.values()).map((stat) => {
      const match = products.find((p) => p.id === stat.productId);
      const price = Number(match?.price) || (stat.unitsSold > 0 ? Math.round(stat.revenue / stat.unitsSold) : 0);
      return {
        ...stat,
        sku: match?.sku || '—',
        category: match?.category || 'General',
        price,
        totalRevenue: stat.revenue,
        currentStock: Number(match?.stock || 0),
        image: match?.images?.[0] || null,
      };
    });

    return result.sort((a, b) => b.unitsSold - a.unitsSold).slice(0, 5);
  }, [orders, products]);

  /* -------------------------------------------------------------------------- */
  /* Recent Orders                                                              */
  /* -------------------------------------------------------------------------- */

  const recentOrders = useMemo(() => {
    return [...orders]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 6);
  }, [orders]);

  if (isLoading) {
    return <LoadingState message="Aggregating e-commerce operations telemetry & sales data..." />;
  }

  if (isError) {
    return (
      <ErrorState
        title="Telemetry & Analytics Unavailable"
        message="Failed to load orders, catalog, or CAD quotes from Firestore. Please verify connectivity."
        onRetry={() => {
          refetchOrders();
          refetchProducts();
          refetchQuotes();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header with Date Filter Toolbar & Export Menu */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-line pb-5">
        <div>
          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-accent block">
            Executive Operations Telemetry
          </span>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Operations Dashboard
          </h1>
          <p className="mt-1 text-xs text-muted font-sans">
            Business performance for {dateRangeLabel} · Showing finished catalogue sales & custom CAD quotes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Date Filter Buttons */}
          <div className="inline-flex rounded-lg border border-line bg-white p-1 shadow-xs">
            <button
              type="button"
              onClick={() => setDateFilter('today')}
              className={`px-3 py-1.5 rounded-md font-mono text-xs font-semibold transition-colors ${
                dateFilter === 'today'
                  ? 'bg-accent text-white shadow-xs'
                  : 'text-ink hover:bg-shell'
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setDateFilter('7days')}
              className={`px-3 py-1.5 rounded-md font-mono text-xs font-semibold transition-colors ${
                dateFilter === '7days'
                  ? 'bg-accent text-white shadow-xs'
                  : 'text-ink hover:bg-shell'
              }`}
            >
              Last 7 Days
            </button>
            <button
              type="button"
              onClick={() => setDateFilter('30days')}
              className={`px-3 py-1.5 rounded-md font-mono text-xs font-semibold transition-colors ${
                dateFilter === '30days'
                  ? 'bg-accent text-white shadow-xs'
                  : 'text-ink hover:bg-shell'
              }`}
            >
              Last 30 Days
            </button>
            <button
              type="button"
              onClick={() => setDateFilter('custom')}
              className={`px-3 py-1.5 rounded-md font-mono text-xs font-semibold transition-colors ${
                dateFilter === 'custom'
                  ? 'bg-accent text-white shadow-xs'
                  : 'text-ink hover:bg-shell'
              }`}
            >
              Custom Range
            </button>
          </div>

          {/* Custom Date Pickers when 'custom' is active */}
          {dateFilter === 'custom' && (
            <div className="flex items-center gap-2 bg-white border border-line p-1 rounded-lg shadow-xs">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="py-1 px-2 text-xs font-mono text-ink bg-transparent border-0 outline-none"
              />
              <span className="text-muted text-xs">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="py-1 px-2 text-xs font-mono text-ink bg-transparent border-0 outline-none"
              />
            </div>
          )}

          {/* 1-Click Operational Reports Export Menu */}
          <div className="relative" ref={exportMenuRef}>
            <button
              type="button"
              onClick={() => setIsExportOpen((prev) => !prev)}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-line bg-white px-3.5 font-sans text-xs font-semibold text-ink hover:bg-shell transition-colors shadow-xs"
              aria-expanded={isExportOpen}
            >
              <Download className="h-3.5 w-3.5 text-accent" />
              <span>Export Reports</span>
              <ChevronDown className="h-3.5 w-3.5 text-muted" />
            </button>

            {isExportOpen && (
              <div className="absolute right-0 mt-1.5 w-72 rounded-xl border border-line bg-white py-2 shadow-xl z-30 font-sans text-xs">
                <div className="px-3 py-1.5 border-b border-line font-mono text-[10px] font-bold uppercase tracking-wider text-muted">
                  Operational Business Reports
                </div>

                <button
                  type="button"
                  onClick={() => {
                    exportOrdersToCsv(orders);
                    setIsExportOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left text-ink hover:bg-shell flex items-center gap-2.5 transition-colors"
                >
                  <FileSpreadsheet className="h-4 w-4 text-emerald-600 shrink-0" />
                  <div>
                    <p className="font-semibold">Customer Orders & Dispatch</p>
                    <p className="text-[10px] text-muted font-mono">{orders.length} order records</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    exportProductPerformanceToCsv(topSellingProducts);
                    setIsExportOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left text-ink hover:bg-shell flex items-center gap-2.5 transition-colors"
                >
                  <BarChart3 className="h-4 w-4 text-blue-600 shrink-0" />
                  <div>
                    <p className="font-semibold">Product Performance & Best Sellers</p>
                    <p className="text-[10px] text-muted font-mono">Ranked by sales volume</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    exportCustomPrintingRevenueToCsv(quotes, orders);
                    setIsExportOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left text-ink hover:bg-shell flex items-center gap-2.5 transition-colors"
                >
                  <Sparkles className="h-4 w-4 text-purple-600 shrink-0" />
                  <div>
                    <p className="font-semibold">Custom Printing Quotes & Revenue</p>
                    <p className="text-[10px] text-muted font-mono">{quotes.length} CAD quotes analyzed</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    exportInventoryToCsv(products);
                    setIsExportOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left text-ink hover:bg-shell flex items-center gap-2.5 transition-colors"
                >
                  <Layers className="h-4 w-4 text-amber-600 shrink-0" />
                  <div>
                    <p className="font-semibold">Product Inventory Health</p>
                    <p className="text-[10px] text-muted font-mono">{products.length} catalogue items</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    exportRevenueSummaryToCsv(
                      chartData.map((d) => ({ label: d.label, key: d.dateKey, value: d.total })),
                      metrics.todaySales,
                      metrics.periodRevenue,
                      orders.length
                    );
                    setIsExportOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left text-ink hover:bg-shell flex items-center gap-2.5 transition-colors border-t border-line mt-1 pt-2"
                >
                  <IndianRupee className="h-4 w-4 text-accent shrink-0" />
                  <div>
                    <p className="font-semibold">Financial & Turnover Summary</p>
                    <p className="text-[10px] text-muted font-mono">Consolidated sales report</p>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* =========================================================
          8 STAT CARDS GRID (Phase 10 Specific Requirement)
          ========================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Today's Sales */}
        <StatCard
          title="Today's Sales"
          value={formatCurrency(metrics.todaySales)}
          description={`${metrics.todayOrdersCount} orders placed today`}
          icon={IndianRupee}
        />

        {/* 2. New Orders in Selected Period */}
        <StatCard
          title="New Orders"
          value={metrics.newOrdersCount}
          description={`Total value: ${formatCurrency(metrics.periodRevenue)}`}
          icon={ShoppingBag}
        />

        {/* 3. Pending Orders */}
        <StatCard
          title="Pending Orders"
          value={metrics.pendingOrdersCount}
          description="Awaiting admin confirmation"
          icon={Clock}
          warning={metrics.pendingOrdersCount > 0}
        />

        {/* 4. Orders in Processing */}
        <StatCard
          title="Orders in Processing"
          value={metrics.processingOrdersCount}
          description="In 3D fabrication & packaging"
          icon={Package}
        />

        {/* 5. Ready to Ship */}
        <StatCard
          title="Ready to Ship"
          value={metrics.readyToShipCount}
          description="Packed & waiting for courier pickup"
          icon={Truck}
        />

        {/* 6. Low-Stock Products */}
        <StatCard
          title="Low-Stock Items"
          value={metrics.lowStockCount}
          description="At or below safety threshold"
          icon={AlertTriangle}
          warning={metrics.lowStockCount > 0}
        />

        {/* 7. Out-of-Stock Products */}
        <StatCard
          title="Out of Stock"
          value={metrics.outOfStockCount}
          description="Finished inventory depleted"
          icon={RotateCcw}
          danger={metrics.outOfStockCount > 0}
        />

        {/* 8. Pending Custom Quotes */}
        <StatCard
          title="Pending CAD Quotes"
          value={metrics.pendingQuotesCount}
          description="Submitted quotes needing price review"
          icon={FileText}
        />
      </div>

      {/* =========================================================
          ORDER FULFILLMENT PIPELINE FUNNEL
          ========================================================= */}
      <div className="rounded-xl border border-line bg-white p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-accent" />
            <h3 className="font-display font-bold text-sm text-ink uppercase tracking-wider">
              Active Order Fulfillment Pipeline
            </h3>
          </div>
          <Link
            to="/admin/orders"
            className="text-xs font-mono font-semibold text-accent hover:underline flex items-center gap-1"
          >
            <span>View All Orders</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
          {/* Stage 1: Pending */}
          <Link
            to="/admin/orders"
            className="p-3 rounded-lg border border-amber-200 bg-amber-50/50 hover:bg-amber-50 transition-colors space-y-1 block"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase font-bold text-amber-800">
                1. Pending
              </span>
              <span className="w-2 h-2 rounded-full bg-amber-500" />
            </div>
            <p className="font-mono text-xl font-bold text-amber-900">
              {metrics.pendingOrdersCount}
            </p>
            <p className="text-[11px] text-muted">Awaiting confirmation</p>
          </Link>

          {/* Stage 2: Processing */}
          <Link
            to="/admin/orders"
            className="p-3 rounded-lg border border-purple-200 bg-purple-50/50 hover:bg-purple-50 transition-colors space-y-1 block"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase font-bold text-purple-800">
                2. Processing
              </span>
              <span className="w-2 h-2 rounded-full bg-purple-500" />
            </div>
            <p className="font-mono text-xl font-bold text-purple-900">
              {metrics.processingOrdersCount}
            </p>
            <p className="text-[11px] text-muted">Printing & assembling</p>
          </Link>

          {/* Stage 3: Ready to Ship */}
          <Link
            to="/admin/orders"
            className="p-3 rounded-lg border border-blue-200 bg-blue-50/50 hover:bg-blue-50 transition-colors space-y-1 block"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase font-bold text-blue-800">
                3. Ready to Ship
              </span>
              <span className="w-2 h-2 rounded-full bg-blue-500" />
            </div>
            <p className="font-mono text-xl font-bold text-blue-900">
              {metrics.readyToShipCount}
            </p>
            <p className="text-[11px] text-muted">Awaiting courier dispatch</p>
          </Link>

          {/* Stage 4: In Transit / Shipped */}
          <Link
            to="/admin/orders"
            className="p-3 rounded-lg border border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50 transition-colors space-y-1 block"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase font-bold text-indigo-800">
                4. Dispatched
              </span>
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
            </div>
            <p className="font-mono text-xl font-bold text-indigo-900">
              {metrics.inTransitCount}
            </p>
            <p className="text-[11px] text-muted">With courier network</p>
          </Link>

          {/* Stage 5: Completed / Delivered */}
          <Link
            to="/admin/orders"
            className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50 transition-colors space-y-1 block"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase font-bold text-emerald-800">
                5. Delivered
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            </div>
            <p className="font-mono text-xl font-bold text-emerald-900">
              {orders.filter((o) => o.status === 'Delivered').length}
            </p>
            <p className="text-[11px] text-muted">Completed orders</p>
          </Link>
        </div>
      </div>

      {/* =========================================================
          SALES OVERVIEW & REVENUE BREAKDOWN CHART (Recharts)
          ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Chart Column (8 cols) */}
        <div className="lg:col-span-8 rounded-xl border border-line bg-white p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-4">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-accent" />
                <h3 className="font-display font-bold text-base text-ink">
                  Sales Growth & Trend
                </h3>
              </div>
              <p className="text-xs text-muted font-sans mt-0.5">
                Gross sales distribution across Ready-Made Catalogue vs Custom 3D Printing
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-lg border border-line p-0.5 bg-shell/50 text-xs font-mono">
                <button
                  type="button"
                  onClick={() => setChartMetric('revenue')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                    chartMetric === 'revenue' ? 'bg-white shadow-xs text-accent' : 'text-muted'
                  }`}
                >
                  Revenue (₹)
                </button>
                <button
                  type="button"
                  onClick={() => setChartMetric('orders')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                    chartMetric === 'orders' ? 'bg-white shadow-xs text-blue-600' : 'text-muted'
                  }`}
                >
                  Orders (#)
                </button>
              </div>
            </div>
          </div>

          {/* Recharts Container */}
          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              {chartMetric === 'revenue' ? (
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCatalogue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EA580C" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#EA580C" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorCustom" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#9333EA" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#9333EA" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={{ stroke: '#CBD5E1' }}
                    tick={{ fontSize: 11, fill: '#64748B', fontFamily: 'monospace' }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: '#64748B', fontFamily: 'monospace' }}
                    tickFormatter={(v) => formatCompactCurrency(v)}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '0.75rem',
                      border: '1px solid #E2E8F0',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                      fontSize: '12px',
                    }}
                    formatter={(val: number) => [`₹${Number(val).toLocaleString('en-IN')}`, '']}
                  />
                  <Legend
                    wrapperStyle={{ paddingTop: '10px', fontSize: '11px', fontFamily: 'monospace' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="catalogue"
                    name="Ready-Made Catalogue"
                    stroke="#EA580C"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorCatalogue)"
                  />
                  <Area
                    type="monotone"
                    dataKey="custom"
                    name="Custom 3D Printing"
                    stroke="#9333EA"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorCustom)"
                  />
                </AreaChart>
              ) : (
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={{ stroke: '#CBD5E1' }}
                    tick={{ fontSize: 11, fill: '#64748B', fontFamily: 'monospace' }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: '#64748B', fontFamily: 'monospace' }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '0.75rem',
                      border: '1px solid #E2E8F0',
                      fontSize: '12px',
                    }}
                    formatter={(val: number) => [`${val} orders`, 'Volume']}
                  />
                  <Bar
                    dataKey="ordersCount"
                    name="Order Count"
                    fill="#3B82F6"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue Partition & AOV Breakdown (4 cols) */}
        <div className="lg:col-span-4 rounded-xl border border-line bg-white p-5 shadow-xs space-y-5 flex flex-col justify-between">
          <div>
            <div className="border-b border-line pb-3">
              <h3 className="font-display font-bold text-sm text-ink uppercase tracking-wider">
                Revenue Source Split
              </h3>
              <p className="text-xs text-muted font-sans mt-0.5">
                Channel breakdown for {dateRangeLabel}
              </p>
            </div>

            <div className="space-y-4 mt-4">
              {/* Ready Made Catalogue Split */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-ink flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-accent" />
                    Ready-Made Catalogue
                  </span>
                  <span className="font-mono font-bold text-accent">
                    ₹{metrics.catalogueRevenue.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-shell overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full"
                    style={{
                      width: `${
                        metrics.periodRevenue > 0
                          ? (metrics.catalogueRevenue / metrics.periodRevenue) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>

              {/* Custom 3D Printing Split */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-ink flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
                    Custom 3D Printing Orders
                  </span>
                  <span className="font-mono font-bold text-purple-700">
                    ₹{metrics.customPrintingRevenue.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-shell overflow-hidden">
                  <div
                    className="h-full bg-purple-600 rounded-full"
                    style={{
                      width: `${
                        metrics.periodRevenue > 0
                          ? (metrics.customPrintingRevenue / metrics.periodRevenue) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>

              {/* Key Business Performance Indicators */}
              <div className="pt-3 border-t border-line space-y-2 text-xs font-sans">
                <div className="flex justify-between text-muted">
                  <span>Average Order Value (AOV):</span>
                  <span className="font-mono font-bold text-ink">
                    ₹{Math.round(metrics.aov).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between text-muted">
                  <span>Filtered Orders:</span>
                  <span className="font-mono font-bold text-ink">
                    {metrics.newOrdersCount} orders
                  </span>
                </div>
                <div className="flex justify-between text-muted">
                  <span>Total Period Sales:</span>
                  <span className="font-mono font-bold text-emerald-600 text-sm">
                    ₹{metrics.periodRevenue.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Navigation Shortcuts */}
          <div className="pt-4 border-t border-line">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted block mb-2">
              Operational Quick Actions
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <Link
                to="/admin/catalog"
                className="p-2 rounded-lg border border-line bg-shell/50 hover:bg-shell text-ink transition-colors flex items-center gap-1.5 justify-center font-semibold"
              >
                <Plus className="w-3.5 h-3.5 text-accent" />
                <span>Add Product</span>
              </Link>
              <Link
                to="/admin/inventory"
                className="p-2 rounded-lg border border-line bg-shell/50 hover:bg-shell text-ink transition-colors flex items-center gap-1.5 justify-center font-semibold"
              >
                <Layers className="w-3.5 h-3.5 text-amber-600" />
                <span>Adjust Stock</span>
              </Link>
              <Link
                to="/admin/quotes"
                className="p-2 rounded-lg border border-line bg-shell/50 hover:bg-shell text-ink transition-colors flex items-center gap-1.5 justify-center font-semibold"
              >
                <FileText className="w-3.5 h-3.5 text-purple-600" />
                <span>CAD Quotes</span>
              </Link>
              <Link
                to="/admin/settings"
                className="p-2 rounded-lg border border-line bg-shell/50 hover:bg-shell text-ink transition-colors flex items-center gap-1.5 justify-center font-semibold"
              >
                <Truck className="w-3.5 h-3.5 text-blue-600" />
                <span>Fulfillment</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================
          RECENT ORDERS & PENDING QUOTES
          ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Orders (7 cols) */}
        <div className="lg:col-span-7 rounded-xl border border-line bg-white shadow-xs overflow-hidden">
          <div className="p-4 border-b border-line bg-shell/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-accent" />
              <h3 className="font-display font-bold text-sm text-ink uppercase tracking-wider">
                Recent Customer Orders
              </h3>
            </div>
            <Link
              to="/admin/orders"
              className="font-mono text-xs text-accent font-semibold hover:underline flex items-center gap-1"
            >
              <span>View all ({orders.length})</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="divide-y divide-line">
            {recentOrders.length === 0 ? (
              <p className="p-6 text-center text-xs font-mono text-muted">
                No orders recorded yet.
              </p>
            ) : (
              recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="p-4 flex items-center justify-between gap-4 hover:bg-shell/20 transition-colors"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/admin/orders/${order.id}`}
                        className="font-mono text-xs font-bold text-accent hover:underline"
                      >
                        #{order.id.slice(0, 8).toUpperCase()}
                      </Link>
                      <StatusBadge status={order.status} type="order" />
                      <StatusBadge
                        status={order.paymentStatus || 'Pending'}
                        type="payment"
                      />
                    </div>
                    <p className="text-xs font-semibold text-ink truncate">
                      {order.customerName}
                    </p>
                    <p className="font-mono text-[10px] text-muted">
                      {new Date(order.date).toLocaleDateString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {order.fulfillmentType && ` · ${order.fulfillmentType}`}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="font-mono text-sm font-bold text-ink">
                      ₹{Number(order.total || 0).toLocaleString('en-IN')}
                    </p>
                    <Link
                      to={`/admin/orders/${order.id}`}
                      className="inline-flex items-center gap-1 text-[11px] font-mono text-accent hover:underline mt-1"
                    >
                      <span>Manage</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Pending CAD Quotes (5 cols) */}
        <div className="lg:col-span-5 rounded-xl border border-line bg-white shadow-xs overflow-hidden">
          <div className="p-4 border-b border-line bg-shell/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-purple-600" />
              <h3 className="font-display font-bold text-sm text-ink uppercase tracking-wider">
                Pending CAD Quotes ({metrics.pendingQuotesCount})
              </h3>
            </div>
            <Link
              to="/admin/quotes"
              className="font-mono text-xs text-purple-700 font-semibold hover:underline flex items-center gap-1"
            >
              <span>Review Quotes</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="divide-y divide-line">
            {metrics.pendingQuotesList.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                <p className="text-xs font-semibold text-ink">All quotes reviewed!</p>
                <p className="text-[11px] text-muted">No custom printing requests awaiting action.</p>
              </div>
            ) : (
              metrics.pendingQuotesList.map((quote) => (
                <div
                  key={quote.id}
                  className="p-4 flex items-center justify-between gap-3 hover:bg-shell/20 transition-colors"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-purple-700">
                        #{quote.id.slice(0, 8).toUpperCase()}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-50 text-purple-700 border border-purple-200">
                        {quote.material || 'PLA'}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-ink truncate">
                      {quote.customerName}
                    </p>
                    <p className="font-mono text-[10px] text-muted">
                      Est. ₹{Number(quote.estimatedPrice || 0).toLocaleString('en-IN')} ·{' '}
                      {quote.color || 'Custom Color'}
                    </p>
                  </div>

                  <Link
                    to="/admin/quotes"
                    className="px-3 py-1.5 rounded-lg border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 font-mono text-xs font-semibold shrink-0 transition-colors"
                  >
                    Review CAD
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* =========================================================
          TOP-SELLING PRODUCTS & INVENTORY HEALTH ALERTS
          ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Top-Selling Products (7 cols) */}
        <div className="lg:col-span-7 rounded-xl border border-line bg-white shadow-xs overflow-hidden">
          <div className="p-4 border-b border-line bg-shell/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <h3 className="font-display font-bold text-sm text-ink uppercase tracking-wider">
                Top-Selling Catalogue Products
              </h3>
            </div>
            <Link
              to="/admin/catalog"
              className="font-mono text-xs text-accent font-semibold hover:underline flex items-center gap-1"
            >
              <span>Product Catalogue</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="divide-y divide-line">
            {topSellingProducts.length === 0 ? (
              <p className="p-6 text-center text-xs font-mono text-muted">
                No product sales recorded yet.
              </p>
            ) : (
              topSellingProducts.map((p, idx) => (
                <div
                  key={p.productId}
                  className="p-4 flex items-center justify-between gap-4 hover:bg-shell/20 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono text-xs font-bold text-muted w-4">
                      #{idx + 1}
                    </span>
                    <div className="space-y-0.5 min-w-0">
                      <p className="text-xs font-bold text-ink truncate">
                        {p.productName}
                      </p>
                      <p className="font-mono text-[10px] text-muted">
                        SKU: {p.sku} · {p.category}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 font-mono text-xs shrink-0">
                    <div>
                      <span className="text-[10px] text-muted uppercase block">Units Sold</span>
                      <span className="font-bold text-ink">{p.unitsSold}</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-muted uppercase block">Revenue</span>
                      <span className="font-bold text-accent">
                        ₹{p.revenue.toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-muted uppercase block">Stock</span>
                      <span
                        className={`font-semibold ${
                          p.currentStock === 0
                            ? 'text-rose-600'
                            : p.currentStock <= 5
                            ? 'text-amber-600'
                            : 'text-emerald-600'
                        }`}
                      >
                        {p.currentStock} units
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Low-Stock & Out-of-Stock Alerts (5 cols) */}
        <div className="lg:col-span-5 rounded-xl border border-line bg-white shadow-xs overflow-hidden">
          <div className="p-4 border-b border-line bg-shell/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <h3 className="font-display font-bold text-sm text-ink uppercase tracking-wider">
                Low & Out-of-Stock Items ({metrics.lowStockCount + metrics.outOfStockCount})
              </h3>
            </div>
            <Link
              to="/admin/inventory"
              className="font-mono text-xs text-amber-700 font-semibold hover:underline flex items-center gap-1"
            >
              <span>Manage Stock</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="divide-y divide-line">
            {metrics.outOfStockList.length === 0 && metrics.lowStockList.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                <p className="text-xs font-semibold text-ink">Finished Stock Healthy</p>
                <p className="text-[11px] text-muted">All catalogue items have sufficient units in inventory.</p>
              </div>
            ) : (
              <>
                {metrics.outOfStockList.map((p) => (
                  <div
                    key={p.id}
                    className="p-3.5 flex items-center justify-between gap-3 bg-rose-50/40 hover:bg-rose-50/70 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-ink truncate">{p.name}</p>
                      <p className="font-mono text-[10px] text-muted">
                        SKU: {p.sku || '—'} · {p.category}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-100 text-rose-800 border border-rose-200">
                        0 in stock
                      </span>
                      <Link
                        to="/admin/inventory"
                        className="text-[11px] font-mono text-accent font-semibold hover:underline"
                      >
                        Restock
                      </Link>
                    </div>
                  </div>
                ))}

                {metrics.lowStockList.map((p) => (
                  <div
                    key={p.id}
                    className="p-3.5 flex items-center justify-between gap-3 bg-amber-50/40 hover:bg-amber-50/70 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-ink truncate">{p.name}</p>
                      <p className="font-mono text-[10px] text-muted">
                        SKU: {p.sku || '—'} · {p.category}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        {p.stock} left (low)
                      </span>
                      <Link
                        to="/admin/inventory"
                        className="text-[11px] font-mono text-accent font-semibold hover:underline"
                      >
                        Adjust
                      </Link>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
