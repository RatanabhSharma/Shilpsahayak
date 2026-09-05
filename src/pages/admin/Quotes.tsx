import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FileBox,
  FileSpreadsheet,
  RefreshCw,
  Clock,
  ExternalLink,
  MessageCircle,
  ShoppingCart,
  CheckCircle2,
  AlertCircle,
  Eye,
  Send,
} from 'lucide-react';
import {
  useQuotes,
  useUpdateQuote,
  useDeleteQuote,
  QuoteStatus,
  Quote,
} from '../../hooks/useQuotes';
import { useCreateOrder } from '../../hooks/useOrders';
import { exportQuotesToCsv } from '../../utils/exportCsv';
import { sendQuoteReadyNotification } from '../../services/emailNotifications';

// Shared Admin Components from Phase 2
import { PageHeader } from '../../components/admin/shared/PageHeader';
import { StatCard } from '../../components/admin/shared/StatCard';
import { StatusBadge } from '../../components/admin/shared/StatusBadge';
import { SearchInput } from '../../components/admin/shared/SearchInput';
import { FilterBar } from '../../components/admin/shared/FilterBar';
import { Pagination } from '../../components/admin/shared/Pagination';
import { EmptyState } from '../../components/admin/shared/EmptyState';
import { LoadingState } from '../../components/admin/shared/LoadingState';
import { ErrorState } from '../../components/admin/shared/ErrorState';
import { ConfirmationDialog } from '../../components/admin/shared/ConfirmationDialog';

// Phase 4 Quote Review Drawer with 3D Viewer
import { QuoteReviewDrawer } from '../../components/admin/quotes/QuoteReviewDrawer';

const STATUS_FILTERS = [
  { label: 'All Statuses', value: 'ALL' },
  { label: 'New Request', value: 'New Request' },
  { label: 'Under Review', value: 'Under Review' },
  { label: 'Quote Sent', value: 'Quote Sent' },
  { label: 'Approved', value: 'Approved' },
  { label: 'Converted to Order', value: 'Converted to Order' },
  { label: 'Rejected', value: 'Rejected' },
  { label: 'Cancelled', value: 'Cancelled' },
];

const REQUEST_TYPE_FILTERS = [
  { label: 'All Types', value: 'ALL' },
  { label: '3D Model (.stl)', value: '3d-model' },
  { label: 'Image Reference', value: 'image' },
  { label: 'Idea / Concept', value: 'idea' },
];

const MATERIAL_FILTERS = [
  { label: 'All Materials', value: 'ALL' },
  { label: 'PLA', value: 'PLA' },
  { label: 'PETG', value: 'PETG' },
  { label: 'ABS', value: 'ABS' },
  { label: 'Resin', value: 'Resin' },
  { label: 'TPU', value: 'TPU' },
];

const SORT_OPTIONS = [
  { label: 'Newest First', value: 'date_desc' },
  { label: 'Oldest First', value: 'date_asc' },
  { label: 'Price: High to Low', value: 'price_desc' },
  { label: 'Price: Low to High', value: 'price_asc' },
];

const ITEMS_PER_PAGE = 8;

export function Quotes() {
  const navigate = useNavigate();
  const {
    data: quotes = [],
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useQuotes();

  const updateQuote = useUpdateQuote();
  const deleteQuote = useDeleteQuote();
  const createOrder = useCreateOrder();

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [materialFilter, setMaterialFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('date_desc');
  const [currentPage, setCurrentPage] = useState(1);

  // Active Quote Drawer & Dialogs
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [quoteToConvert, setQuoteToConvert] = useState<Quote | null>(null);
  const [quoteToDelete, setQuoteToDelete] = useState<Quote | null>(null);
  const [isConverting, setIsConverting] = useState(false);

  // Metrics calculation
  const metrics = useMemo(() => {
    const total = quotes.length;
    const newOrReview = quotes.filter(
      (q) => q.status === 'New Request' || q.status === 'Under Review' || q.status === 'Pending'
    ).length;
    const sent = quotes.filter(
      (q) => q.status === 'Quote Sent' || q.status === 'Quoted'
    ).length;
    const converted = quotes.filter(
      (q) => q.status === 'Converted to Order' || Boolean(q.orderId)
    ).length;
    const conversionRate = total > 0 ? Math.round((converted / total) * 100) : 0;

    return { total, newOrReview, sent, converted, conversionRate };
  }, [quotes]);

  // Filtered & Sorted Quotes
  const filteredQuotes = useMemo(() => {
    return quotes
      .filter((quote) => {
        // Search
        if (search.trim()) {
          const q = search.toLowerCase();
          const matches =
            (quote.id || '').toLowerCase().includes(q) ||
            (quote.customerName || '').toLowerCase().includes(q) ||
            (quote.customerEmail || '').toLowerCase().includes(q) ||
            (quote.customerPhone || '').toLowerCase().includes(q) ||
            (quote.fileName || '').toLowerCase().includes(q) ||
            (quote.notes || '').toLowerCase().includes(q) ||
            (quote.description || '').toLowerCase().includes(q);
          if (!matches) return false;
        }

        // Status
        if (statusFilter !== 'ALL') {
          const isExpired = quote.expiresAt
            ? new Date(quote.expiresAt).getTime() < Date.now()
            : false;
          const effectiveStatus =
            isExpired && (quote.status === 'Quote Sent' || quote.status === 'Quoted')
              ? 'Expired'
              : quote.status;

          if (statusFilter === 'Quote Sent') {
            if (quote.status !== 'Quote Sent' && quote.status !== 'Quoted') return false;
          } else if (statusFilter === 'New Request') {
            if (quote.status !== 'New Request' && quote.status !== 'Pending') return false;
          } else if (statusFilter === 'Approved') {
            if (quote.status !== 'Approved' && quote.status !== 'Accepted') return false;
          } else if (statusFilter === 'Converted to Order') {
            if (quote.status !== 'Converted to Order' && !quote.orderId) return false;
          } else if (quote.status !== statusFilter && effectiveStatus !== statusFilter) {
            return false;
          }
        }

        // Request Type
        if (typeFilter !== 'ALL') {
          if (quote.requestType !== typeFilter) return false;
        }

        // Material
        if (materialFilter !== 'ALL') {
          if (
            (quote.material || '').toLowerCase() !== materialFilter.toLowerCase()
          ) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'date_desc') {
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        }
        if (sortBy === 'date_asc') {
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        }
        if (sortBy === 'price_desc') {
          const pA = a.adminPrice || a.systemEstimatedPrice || a.estimatedPrice || 0;
          const pB = b.adminPrice || b.systemEstimatedPrice || b.estimatedPrice || 0;
          return pB - pA;
        }
        if (sortBy === 'price_asc') {
          const pA = a.adminPrice || a.systemEstimatedPrice || a.estimatedPrice || 0;
          const pB = b.adminPrice || b.systemEstimatedPrice || b.estimatedPrice || 0;
          return pA - pB;
        }
        return 0;
      });
  }, [quotes, search, statusFilter, typeFilter, materialFilter, sortBy]);

  // Pagination
  const totalPages = Math.ceil(filteredQuotes.length / ITEMS_PER_PAGE) || 1;
  const paginatedQuotes = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredQuotes.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredQuotes, currentPage]);

  // Open Drawer for Review
  const handleOpenReview = (quote: Quote) => {
    setSelectedQuote(quote);
    setIsDrawerOpen(true);
  };

  // Status Change Handler
  const handleUpdateStatus = async (id: string, status: QuoteStatus) => {
    try {
      await updateQuote.mutateAsync({
        id,
        status,
        reviewedAt: new Date().toISOString(),
      });
      // Update selected quote if open in drawer
      if (selectedQuote && selectedQuote.id === id) {
        setSelectedQuote((prev) => (prev ? { ...prev, status } : null));
      }
    } catch (err: any) {
      console.error('Failed to update quote status:', err);
      alert('Failed to update quote status.');
    }
  };

  // Send Quote & Trigger Email Notification
  const handleSendQuote = async (
    id: string,
    price: number,
    expiryDays: number,
    adminNotes?: string
  ) => {
    try {
      const expiresAt =
        expiryDays > 0
          ? new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString()
          : undefined;

      await updateQuote.mutateAsync({
        id,
        adminPrice: price,
        status: 'Quote Sent',
        expiresAt,
        adminNotes,
        quotedAt: new Date().toISOString(),
      });

      const targetQuote = quotes.find((q) => q.id === id);
      if (targetQuote) {
        await sendQuoteReadyNotification({
          quote: { ...targetQuote, adminPrice: price, adminNotes },
          price,
          expiresAt,
        });
      }

      if (selectedQuote && selectedQuote.id === id) {
        setSelectedQuote((prev) =>
          prev
            ? {
                ...prev,
                adminPrice: price,
                status: 'Quote Sent',
                expiresAt,
                adminNotes,
              }
            : null
        );
      }

      alert(
        `Quotation of ₹${price.toLocaleString('en-IN')} sent to ${
          targetQuote?.customerEmail || 'customer'
        }!`
      );
    } catch (err: any) {
      console.error('Failed to send quote:', err);
      alert('Failed to update quote and send notification.');
      throw err;
    }
  };

  // Convert to Confirmed Order Workflow
  const handleConvertToOrder = async (quote: Quote) => {
    try {
      setIsConverting(true);
      const orderPrice =
        quote.adminPrice ||
        quote.systemEstimatedPrice ||
        quote.estimatedPrice ||
        0;

      const created = await createOrder.mutateAsync({
        customerId: quote.customerId || null,
        customerName: quote.customerName,
        customerEmail: quote.customerEmail,
        customerPhone: quote.customerPhone,
        address: 'Specified in Custom CAD Quote Request',
        items: [
          {
            productId: `custom-${quote.id}`,
            productName: `Custom 3D Print: ${quote.fileName || '3D Model'}`,
            quantity: quote.quantity || 1,
            price: orderPrice,
            quoteId: quote.id,
            customNotes: quote.notes || quote.description,
            customPrint: {
              fileName: quote.fileName,
              fileUrl: quote.fileUrl,
              material: quote.material,
              color: quote.color,
              quality: quote.quality,
              infill: quote.infill,
              layerHeight: quote.layerHeight,
              estimatedWeight: quote.estimatedWeight,
              volume: quote.volume,
              estimatedPrintTimeHours: quote.estimatedPrintTimeHours,
              packagingIncluded: quote.packagingIncluded,
              quoteId: quote.id,
              customPrice: orderPrice,
            },
          },
        ],
        total: orderPrice,
        quoteId: quote.id,
        notes: `Converted from Custom CAD Quote #${quote.id.slice(0, 8)}${
          quote.notes ? ` — ${quote.notes}` : ''
        }`,
      });

      await updateQuote.mutateAsync({
        id: quote.id,
        status: 'Converted to Order',
        orderId: created.id,
        convertedAt: new Date().toISOString(),
      });

      if (selectedQuote && selectedQuote.id === quote.id) {
        setSelectedQuote((prev) =>
          prev
            ? { ...prev, status: 'Converted to Order', orderId: created.id }
            : null
        );
      }

      setQuoteToConvert(null);
      alert(`Quote converted to Order #${created.id}!`);
      navigate(`/admin/orders/${created.id}`);
    } catch (err: any) {
      console.error('Failed to convert quote to order:', err);
      alert(err?.message || 'Failed to convert quote to order.');
    } finally {
      setIsConverting(false);
    }
  };

  // Delete Quote Handler
  const handleDeleteQuote = async () => {
    if (!quoteToDelete) return;
    try {
      await deleteQuote.mutateAsync({
        id: quoteToDelete.id,
        fileUrl: quoteToDelete.fileUrl,
      });
      setQuoteToDelete(null);
      if (selectedQuote?.id === quoteToDelete.id) {
        setIsDrawerOpen(false);
      }
    } catch (err: any) {
      console.error('Failed to delete quote:', err);
      alert('Failed to delete quote.');
    }
  };

  if (isLoading) {
    return <LoadingState message="Loading Custom 3D CAD Quotes..." />;
  }

  if (isError) {
    return (
      <ErrorState
        title="Failed to Load Quotes"
        message="Unable to fetch custom CAD quote requests from Firestore. Please check network connection and try again."
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Custom 3D CAD Quotes"
        description="Inspect uploaded 3D CAD files in WebGL, calculate production costs, send official quotes, and convert directly to confirmed manufacturing orders."
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin' },
          { label: 'Custom CAD Quotes' },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isRefetching}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-line bg-white hover:bg-shell text-xs font-mono font-bold text-ink transition-all shadow-2xs cursor-pointer disabled:opacity-50"
              title="Refresh quotes list"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-muted ${isRefetching ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              onClick={() => exportQuotesToCsv(quotes)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-line bg-white hover:bg-shell text-ink font-mono text-xs font-bold transition-all shadow-2xs cursor-pointer"
              title="Download quotes data as Excel-friendly CSV"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Export CSV</span>
            </button>
          </div>
        }
      />

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Quote Requests"
          value={metrics.total}
          icon={FileBox}
        />
        <StatCard
          title="New / Under Review"
          value={metrics.newOrReview}
          icon={AlertCircle}
          description="Needs pricing & review"
        />
        <StatCard
          title="Quotes Sent"
          value={metrics.sent}
          icon={Send}
          description="Awaiting customer approval"
        />
        <StatCard
          title="Converted to Orders"
          value={metrics.converted}
          icon={CheckCircle2}
          description={`${metrics.conversionRate}% Conversion`}
        />
      </div>

      {/* Filters Bar */}
      <FilterBar
        isFiltered={Boolean(
          statusFilter !== 'ALL' ||
          typeFilter !== 'ALL' ||
          materialFilter !== 'ALL' ||
          search.trim()
        )}
        resultCount={filteredQuotes.length}
        onReset={() => {
          setSearch('');
          setStatusFilter('ALL');
          setTypeFilter('ALL');
          setMaterialFilter('ALL');
          setSortBy('date_desc');
          setCurrentPage(1);
        }}
      >
        <SearchInput
          placeholder="Search by quote ID, customer name, email, phone, filename..."
          value={search}
          onChange={(val) => {
            setSearch(val);
            setCurrentPage(1);
          }}
          onClear={() => {
            setSearch('');
            setCurrentPage(1);
          }}
          className="w-full sm:w-80"
        />

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="py-1.5 px-3 rounded-lg border border-line bg-white text-xs font-mono text-ink outline-none focus:border-accent cursor-pointer"
        >
          {STATUS_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>

        {/* Request Type Filter */}
        <select
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="py-1.5 px-3 rounded-lg border border-line bg-white text-xs font-mono text-ink outline-none focus:border-accent cursor-pointer"
        >
          {REQUEST_TYPE_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>

        {/* Material Filter */}
        <select
          value={materialFilter}
          onChange={(e) => {
            setMaterialFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="py-1.5 px-3 rounded-lg border border-line bg-white text-xs font-mono text-ink outline-none focus:border-accent cursor-pointer"
        >
          {MATERIAL_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>

        {/* Sort Filter */}
        <select
          value={sortBy}
          onChange={(e) => {
            setSortBy(e.target.value);
            setCurrentPage(1);
          }}
          className="py-1.5 px-3 rounded-lg border border-line bg-white text-xs font-mono text-ink outline-none focus:border-accent cursor-pointer"
        >
          {SORT_OPTIONS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </FilterBar>

      {/* Quotes List / Cards */}
      {paginatedQuotes.length === 0 ? (
        <EmptyState
          icon={FileBox}
          title="No Custom CAD Quotes Found"
          description="No quote requests matched your active filters or search term."
          action={
            search || statusFilter !== 'ALL' || typeFilter !== 'ALL' || materialFilter !== 'ALL'
              ? {
                  label: 'Clear All Filters',
                  onClick: () => {
                    setSearch('');
                    setStatusFilter('ALL');
                    setTypeFilter('ALL');
                    setMaterialFilter('ALL');
                    setCurrentPage(1);
                  },
                }
              : undefined
          }
        />
      ) : (
        <div className="space-y-4">
          {paginatedQuotes.map((quote) => {
            const isExpired = quote.expiresAt
              ? new Date(quote.expiresAt).getTime() < Date.now()
              : false;

            const effectiveStatus =
              isExpired && (quote.status === 'Quote Sent' || quote.status === 'Quoted')
                ? 'Expired'
                : quote.status;

            const finalPrice =
              quote.adminPrice ||
              quote.systemEstimatedPrice ||
              quote.estimatedPrice ||
              0;

            const whatsappMessage = `Hello ${quote.customerName || 'there'}! Your custom 3D printing quotation from Shilp Sahayak for "${quote.fileName || 'your 3D model'}" is ready.\n\n*Quoted Price:* ₹${finalPrice.toLocaleString('en-IN')}\n*Material:* ${quote.material || 'PLA'} (${quote.color || 'Standard'})\n*Quantity:* ${quote.quantity || 1} unit(s)\n\nPlease review and approve on our portal: ${window.location.origin}/account`;

            return (
              <div
                key={quote.id}
                className={`rounded-2xl border bg-white p-5 shadow-2xs transition-all hover:border-accent/30 space-y-4 ${
                  effectiveStatus === 'Expired'
                    ? 'border-rose-200 bg-rose-50/10'
                    : quote.status === 'Converted to Order'
                    ? 'border-purple-200 bg-purple-50/10'
                    : 'border-line'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                  {/* Left Column: Customer & Model Specs */}
                  <div className="flex-1 space-y-3.5">
                    {/* Customer & Status Header */}
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shrink-0 mt-0.5">
                        <FileBox className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-accent">
                            #{quote.id.slice(0, 8)}
                          </span>
                          <h3 className="font-display font-bold text-sm text-ink truncate">
                            {quote.customerName}
                          </h3>
                          <StatusBadge status={effectiveStatus} type="quote" showDot />

                          {quote.expiresAt && (quote.status === 'Quote Sent' || quote.status === 'Quoted') && (
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[10px] font-bold border ${
                                isExpired
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : 'bg-amber-50 text-amber-800 border-amber-200'
                              }`}
                            >
                              <Clock className="w-3 h-3" />
                              {isExpired
                                ? `Expired on ${new Date(quote.expiresAt).toLocaleDateString('en-IN')}`
                                : `Valid until ${new Date(quote.expiresAt).toLocaleDateString('en-IN')}`}
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-muted font-mono mt-0.5">
                          {quote.customerEmail} • {quote.customerPhone}
                        </p>
                        <p className="text-[11px] font-mono text-muted">
                          Requested on{' '}
                          {new Date(quote.date).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>

                    {/* Slicing Specs Summary */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-shell/70 p-3 rounded-xl border border-line/60 text-xs font-sans">
                      <div>
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted block">
                          File / Reference
                        </span>
                        <span className="font-mono font-bold text-ink truncate block mt-0.5" title={quote.fileName}>
                          {quote.fileName || 'Customer File'}
                        </span>
                        {quote.fileUrl && (
                          <a
                            href={quote.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            download={quote.fileName || 'model'}
                            className="inline-flex items-center gap-1 font-mono text-[10px] font-bold text-accent hover:underline mt-0.5"
                          >
                            <span>Download</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </div>

                      <div>
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted block">
                          Material & Color
                        </span>
                        <span className="font-semibold text-ink mt-0.5 block">
                          {quote.material || 'PLA'} / {quote.color || 'Default'}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted block">
                          Infill & Layer
                        </span>
                        <span className="font-mono font-semibold text-ink mt-0.5 block">
                          {quote.infill ? `${quote.infill}%` : '20%'} / {quote.layerHeight ? `${quote.layerHeight}mm` : '0.2mm'}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted block">
                          Est. Weight & Qty
                        </span>
                        <span className="font-mono font-semibold text-ink mt-0.5 block">
                          {quote.estimatedWeight || '—'}g × {quote.quantity || 1} pcs
                        </span>
                      </div>
                    </div>

                    {/* Customer Notes */}
                    {(quote.notes || quote.description) && (
                      <p className="text-xs text-ink/80 font-sans italic line-clamp-2 bg-paper/60 p-2.5 rounded-lg border border-line/50">
                        "{quote.notes || quote.description}"
                      </p>
                    )}
                  </div>

                  {/* Right Column: Pricing & Quick Actions */}
                  <div className="lg:w-72 shrink-0 space-y-3 bg-shell/30 p-4 rounded-xl border border-line flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between pb-2 border-b border-line/60">
                        <div>
                          <span className="text-[10px] font-mono uppercase font-bold text-muted block">
                            System Est.
                          </span>
                          <span className="font-mono text-xs font-bold text-slate-700">
                            ₹{(quote.systemEstimatedPrice || quote.estimatedPrice || 0).toLocaleString('en-IN')}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] font-mono uppercase font-bold text-emerald-800 block">
                            Quoted Price
                          </span>
                          <span className="font-mono text-base font-bold text-emerald-700">
                            {quote.adminPrice !== undefined
                              ? `₹${quote.adminPrice.toLocaleString('en-IN')}`
                              : 'Pending'}
                          </span>
                        </div>
                      </div>

                      {quote.adminNotes && (
                        <p className="text-[11px] font-mono text-muted mt-2 truncate" title={quote.adminNotes}>
                          Note: {quote.adminNotes}
                        </p>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-2 pt-2">
                      <button
                        type="button"
                        onClick={() => handleOpenReview(quote)}
                        className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-accent hover:bg-accent-dark text-white font-mono text-xs font-bold transition-colors shadow-2xs cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect & Quote</span>
                      </button>

                      <div className="flex items-center gap-2">
                        {quote.customerPhone && (
                          <a
                            href={`https://wa.me/91${quote.customerPhone.replace(/\D/g, '').slice(-10)}?text=${encodeURIComponent(
                              whatsappMessage
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-mono text-[11px] font-bold transition-colors shadow-2xs"
                            title="Share quote directly on WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>WhatsApp</span>
                          </a>
                        )}

                        {quote.orderId ? (
                          <Link
                            to={`/admin/orders/${quote.orderId}`}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 font-mono text-[11px] font-bold border border-purple-200 transition-colors"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Order #{quote.orderId.slice(0, 6)}</span>
                          </Link>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setQuoteToConvert(quote)}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-mono text-[11px] font-bold transition-colors shadow-2xs cursor-pointer"
                          >
                            <ShoppingCart className="w-3.5 h-3.5" />
                            <span>To Order</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={(p) => setCurrentPage(p)}
          totalItems={filteredQuotes.length}
          pageSize={ITEMS_PER_PAGE}
        />
      )}

      {/* Phase 4 Quote Review Drawer (with ThreeModelViewer) */}
      <QuoteReviewDrawer
        quote={selectedQuote}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onUpdateStatus={handleUpdateStatus}
        onSendQuote={handleSendQuote}
        onConvertToOrder={handleConvertToOrder}
        isConverting={isConverting}
      />

      {/* Confirmation Dialog for Quick Convert */}
      {quoteToConvert && (
        <ConfirmationDialog
          isOpen={Boolean(quoteToConvert)}
          title={`Convert Quote #${quoteToConvert.id.slice(0, 8)} to Order?`}
          description={`This will generate a confirmed fabrication order for "${quoteToConvert.customerName}" with a total amount of ₹${(
            quoteToConvert.adminPrice ||
            quoteToConvert.systemEstimatedPrice ||
            quoteToConvert.estimatedPrice ||
            0
          ).toLocaleString('en-IN')}.`}
          confirmText="Convert to Order"
          variant="primary"
          isLoading={isConverting}
          onConfirm={() => handleConvertToOrder(quoteToConvert)}
          onClose={() => setQuoteToConvert(null)}
        />
      )}

      {/* Confirmation Dialog for Delete */}
      {quoteToDelete && (
        <ConfirmationDialog
          isOpen={Boolean(quoteToDelete)}
          title="Delete Custom CAD Quote?"
          description={`Are you sure you want to delete quote #${quoteToDelete.id.slice(0, 8)}? This will permanently remove the quote and any associated files from Cloudflare storage.`}
          confirmText="Delete Quote"
          variant="danger"
          isLoading={deleteQuote.isPending}
          onConfirm={handleDeleteQuote}
          onClose={() => setQuoteToDelete(null)}
        />
      )}
    </div>
  );
}

export default Quotes;
