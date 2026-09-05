import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingBag,
  Download,
  IndianRupee,
  Clock,
  ExternalLink,
  Eye,
} from 'lucide-react';

import {
  useOrders,
  OrderStatus,
  useUpdateOrderStatus,
  Order,
} from '../../hooks/useOrders';
import {
  PageHeader,
  FilterBar,
  SearchInput,
  StatusBadge,
  Pagination,
  DataTable,
  Column,
  LoadingState,
  ErrorState,
} from '../../components/admin/shared';
import { exportOrdersToCsv } from '../../utils/exportCsv';

const ORDER_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'All', label: 'All Order Statuses' },
  { value: 'Pending', label: 'Pending' },
  { value: 'Confirmed', label: 'Confirmed' },
  { value: 'Processing', label: 'Processing' },
  { value: 'Ready to ship', label: 'Ready to Ship' },
  { value: 'Shipped', label: 'Shipped' },
  { value: 'Delivered', label: 'Delivered' },
  { value: 'Cancelled', label: 'Cancelled' },
  { value: 'Refunded', label: 'Refunded' },
  /* Legacy statuses */
  { value: 'Printing', label: 'Printing (Legacy)' },
  { value: 'Quality Check', label: 'Quality Check (Legacy)' },
];

const PAYMENT_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'All', label: 'All Payment Statuses' },
  { value: 'Pending', label: 'Pending' },
  { value: 'Paid', label: 'Paid' },
  { value: 'Failed', label: 'Failed' },
  { value: 'Refunded', label: 'Refunded' },
  { value: 'Partially refunded', label: 'Partially Refunded' },
];

const SHIPPING_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'All', label: 'All Shipping Statuses' },
  { value: 'Not shipped', label: 'Not Shipped' },
  { value: 'Ready to ship', label: 'Ready to Ship' },
  { value: 'Shipped', label: 'Shipped' },
  { value: 'In transit', label: 'In Transit' },
  { value: 'Delivered', label: 'Delivered' },
  { value: 'Returned', label: 'Returned' },
];

const DATE_RANGE_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: '7days', label: 'Last 7 Days' },
  { value: '30days', label: 'Last 30 Days' },
];

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: 'date-desc', label: 'Newest First' },
  { value: 'date-asc', label: 'Oldest First' },
  { value: 'amount-desc', label: 'Amount: High to Low' },
  { value: 'amount-asc', label: 'Amount: Low to High' },
];

const PAGE_SIZE = 10;

export function Orders() {
  const { data: orders = [], isLoading, isError, refetch } = useOrders();
  const updateStatus = useUpdateOrderStatus();

  // Filters & State
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [paymentFilter, setPaymentFilter] = useState('All');
  const [shippingFilter, setShippingFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date-desc');
  const [currentPage, setCurrentPage] = useState(1);

  // Status update in-flight tracking
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    setUpdatingOrderId(orderId);
    try {
      await updateStatus.mutateAsync({
        id: orderId,
        status: newStatus,
        note: `Status changed to ${newStatus} from orders table`,
      });
    } catch (error) {
      console.error('Failed to update order status:', error);
      alert('Failed to update order status. Please try again.');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('All');
    setPaymentFilter('All');
    setShippingFilter('All');
    setDateFilter('all');
    setSortBy('date-desc');
    setCurrentPage(1);
  };

  const isFiltered =
    search.trim() !== '' ||
    statusFilter !== 'All' ||
    paymentFilter !== 'All' ||
    shippingFilter !== 'All' ||
    dateFilter !== 'all' ||
    sortBy !== 'date-desc';

  // Filtered & Sorted orders computation
  const filteredOrders = useMemo(() => {
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;

    return orders
      .filter((order) => {
        // Search
        const term = search.toLowerCase().trim();
        if (term) {
          const matchesId = (order.id || '').toLowerCase().includes(term);
          const matchesCustomer = (order.customerName || '')
            .toLowerCase()
            .includes(term);
          const matchesEmail = (order.customerEmail || '')
            .toLowerCase()
            .includes(term);
          const matchesPhone = (order.customerPhone || '').includes(term);
          if (!matchesId && !matchesCustomer && !matchesEmail && !matchesPhone) {
            return false;
          }
        }

        // Order Status
        if (statusFilter !== 'All' && order.status !== statusFilter) {
          return false;
        }

        // Payment Status
        const currentPayment = order.paymentStatus || 'Pending';
        if (paymentFilter !== 'All' && currentPayment !== paymentFilter) {
          return false;
        }

        // Shipping Status
        if (shippingFilter !== 'All') {
          const currentShipping =
            order.shippingStatus ||
            (order.status === 'Shipped'
              ? 'Shipped'
              : order.status === 'Delivered'
              ? 'Delivered'
              : order.status === 'Ready to ship'
              ? 'Ready to ship'
              : 'Not shipped');
          if (currentShipping !== shippingFilter) {
            return false;
          }
        }

        // Date Filter
        if (dateFilter !== 'all') {
          const orderTime = new Date(order.date).getTime();
          if (isNaN(orderTime)) return true;

          if (dateFilter === 'today' && now - orderTime > oneDayMs) {
            return false;
          }
          if (dateFilter === '7days' && now - orderTime > 7 * oneDayMs) {
            return false;
          }
          if (dateFilter === '30days' && now - orderTime > 30 * oneDayMs) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'date-asc') {
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        }
        if (sortBy === 'amount-desc') {
          return (Number(b.total) || 0) - (Number(a.total) || 0);
        }
        if (sortBy === 'amount-asc') {
          return (Number(a.total) || 0) - (Number(b.total) || 0);
        }
        // default date-desc
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
  }, [orders, search, statusFilter, paymentFilter, dateFilter, sortBy]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredOrders.length / PAGE_SIZE) || 1;
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredOrders.slice(start, start + PAGE_SIZE);
  }, [filteredOrders, currentPage]);

  // Aggregate metrics
  const totalValue = useMemo(() => {
    return filteredOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  }, [filteredOrders]);

  const activeOrdersCount = useMemo(() => {
    return orders.filter(
      (o) =>
        !['Delivered', 'Cancelled', 'Refunded'].includes(o.status)
    ).length;
  }, [orders]);

  if (isLoading) {
    return <LoadingState message="Loading customer orders..." />;
  }

  if (isError) {
    return (
      <ErrorState
        title="Orders could not be loaded"
        message="Unable to fetch orders from Cloud Firestore. Please check your network and security rules."
        onRetry={() => refetch()}
      />
    );
  }

  // Define Table Columns
  const columns: Column<Order>[] = [
    {
      key: 'id',
      header: 'Order ID',
      className: 'font-mono text-xs font-bold text-accent',
      render: (order) => (
        <Link
          to={`/admin/orders/${order.id}`}
          className="hover:underline flex items-center gap-1 group"
        >
          <span>#{order.id.slice(0, 8).toUpperCase()}</span>
          <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
        </Link>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (order) => (
        <div className="space-y-0.5">
          <p className="font-semibold text-ink truncate max-w-[180px]">
            {order.customerName || 'Anonymous Guest'}
          </p>
          <p className="font-mono text-[10px] text-muted truncate max-w-[180px]">
            {order.customerEmail || '—'}
          </p>
        </div>
      ),
    },
    {
      key: 'date',
      header: 'Order Date',
      render: (order) => (
        <span className="font-mono text-xs text-muted">
          {order.date
            ? new Date(order.date).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })
            : '—'}
        </span>
      ),
    },
    {
      key: 'items',
      header: 'Items',
      render: (order) => {
        const totalItems = (order.items || []).reduce(
          (sum, i) => sum + (Number(i.quantity) || 0),
          0
        );
        const firstItem = order.items?.[0];
        return (
          <div className="text-xs max-w-[200px]">
            <p className="truncate text-ink font-medium">
              {firstItem ? firstItem.productName : 'Custom CAD Job'}
            </p>
            <p className="font-mono text-[10px] text-muted">
              {totalItems} {totalItems === 1 ? 'unit' : 'units'}
              {order.items?.length > 1
                ? ` (${order.items.length} lines)`
                : ''}
            </p>
          </div>
        );
      },
    },
    {
      key: 'total',
      header: 'Total',
      align: 'right',
      render: (order) => (
        <span className="font-mono text-xs font-bold text-ink">
          ₹{Number(order.total || 0).toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      key: 'paymentStatus',
      header: 'Payment',
      render: (order) => (
        <StatusBadge
          status={order.paymentStatus || 'Pending'}
          type="payment"
          showDot={order.paymentStatus === 'Paid'}
        />
      ),
    },
    {
      key: 'status',
      header: 'Order Status',
      render: (order) => (
        <div className="flex items-center gap-2">
          <StatusBadge status={order.status} type="order" />
          <select
            value={order.status}
            disabled={updatingOrderId === order.id}
            onChange={(e) =>
              handleStatusChange(order.id, e.target.value as OrderStatus)
            }
            className="py-1 px-2 text-[11px] font-mono border border-line rounded bg-white text-ink outline-none focus:border-accent cursor-pointer disabled:opacity-50"
            title="Quick update order status"
          >
            {ORDER_STATUS_OPTIONS.filter((o) => o.value !== 'All').map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      ),
    },
    {
      key: 'shippingStatus',
      header: 'Shipping',
      render: (order) => {
        const sStatus =
          order.shippingStatus ||
          (order.status === 'Shipped'
            ? 'Shipped'
            : order.status === 'Delivered'
            ? 'Delivered'
            : order.status === 'Ready to ship'
            ? 'Ready to ship'
            : 'Not shipped');
        return (
          <div className="space-y-0.5">
            <StatusBadge status={sStatus} type="shipping" showDot />
            {order.courierPartner && (
              <p className="font-mono text-[10px] text-muted truncate max-w-[120px]">
                {order.courierPartner}
              </p>
            )}
          </div>
        );
      },
    },
    {
      key: 'fulfillment',
      header: 'Fulfillment',
      render: (order) => (
        <span className="font-mono text-[11px] text-muted">
          {order.fulfillmentType || 'Standard Shipping'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (order) => (
        <Link
          to={`/admin/orders/${order.id}`}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-line bg-white hover:bg-shell font-mono text-xs font-semibold text-ink transition-colors shadow-xs"
        >
          <Eye className="w-3.5 h-3.5 text-muted" />
          <span>View</span>
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        badgeText="Fulfillment & Orders"
        title="Customer Orders"
        description="Unified order operations pipeline for catalogue ready-made items and bespoke custom 3D printing orders."
        breadcrumbs={[{ label: 'Orders' }]}
        actions={
          <>
            <button
              type="button"
              onClick={() => exportOrdersToCsv(filteredOrders)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-line bg-white hover:bg-shell text-xs font-semibold text-ink transition-colors shadow-xs cursor-pointer"
            >
              <Download className="w-4 h-4 text-accent" />
              <span>Export Orders CSV</span>
            </button>
          </>
        }
      />

      {/* KPI Overview Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-line bg-white p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase font-bold text-muted">
              Total Order Records
            </p>
            <p className="mt-1 font-mono text-2xl font-bold text-ink">
              {orders.length}
            </p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
            <ShoppingBag className="w-4 h-4" />
          </div>
        </div>

        <div className="rounded-xl border border-line bg-white p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase font-bold text-muted">
              Active Fulfillment Queue
            </p>
            <p className="mt-1 font-mono text-2xl font-bold text-blue-700">
              {activeOrdersCount}
            </p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
            <Clock className="w-4 h-4" />
          </div>
        </div>

        <div className="rounded-xl border border-line bg-white p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase font-bold text-muted">
              Filtered Revenue Value
            </p>
            <p className="mt-1 font-mono text-2xl font-bold text-emerald-700">
              ₹{totalValue.toLocaleString('en-IN')}
            </p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
            <IndianRupee className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <FilterBar
        isFiltered={isFiltered}
        onReset={handleResetFilters}
        resultCount={filteredOrders.length}
      >
        <SearchInput
          value={search}
          onChange={(val) => {
            setSearch(val);
            setCurrentPage(1);
          }}
          placeholder="Search by Order ID, Customer Name, Email, or Phone..."
          className="flex-1"
        />

        {/* Order Status Dropdown */}
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="py-2 px-3 text-xs font-sans font-semibold text-ink bg-white border border-line rounded-lg outline-none focus:border-accent cursor-pointer"
        >
          {ORDER_STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Payment Status Dropdown */}
        <select
          value={paymentFilter}
          onChange={(e) => {
            setPaymentFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="py-2 px-3 text-xs font-sans font-semibold text-ink bg-white border border-line rounded-lg outline-none focus:border-accent cursor-pointer"
        >
          {PAYMENT_STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Shipping Status Dropdown */}
        <select
          value={shippingFilter}
          onChange={(e) => {
            setShippingFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="py-2 px-3 text-xs font-sans font-semibold text-ink bg-white border border-line rounded-lg outline-none focus:border-accent cursor-pointer"
        >
          {SHIPPING_STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Date Filter Dropdown */}
        <select
          value={dateFilter}
          onChange={(e) => {
            setDateFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="py-2 px-3 text-xs font-sans font-semibold text-ink bg-white border border-line rounded-lg outline-none focus:border-accent cursor-pointer"
        >
          {DATE_RANGE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Sort Options */}
        <select
          value={sortBy}
          onChange={(e) => {
            setSortBy(e.target.value);
            setCurrentPage(1);
          }}
          className="py-2 px-3 text-xs font-sans font-semibold text-ink bg-white border border-line rounded-lg outline-none focus:border-accent cursor-pointer"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </FilterBar>

      {/* Orders Data Table */}
      <DataTable
        columns={columns}
        data={paginatedOrders}
        keyExtractor={(order) => order.id}
        emptyTitle="No orders match criteria"
        emptyMessage="Try adjusting or resetting your search keywords, status filters, or date range."
        emptyAction={
          isFiltered
            ? {
                label: 'Reset Filters',
                onClick: handleResetFilters,
              }
            : undefined
        }
        footer={
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={filteredOrders.length}
            pageSize={PAGE_SIZE}
          />
        }
      />
    </div>
  );
}

export default Orders;
