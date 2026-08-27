import { useState } from 'react';
import { Search, Loader2, FileBox } from 'lucide-react';
import {
  useQuotes,
  useUpdateQuote,
  QuoteStatus,
} from '../../hooks/useQuotes';

const QUOTE_STATUS_OPTIONS: { value: QuoteStatus; label: string }[] = [
  { value: 'Pending', label: 'Pending' },
  { value: 'Quoted', label: 'Quoted' },
  { value: 'Accepted', label: 'Accepted' },
  { value: 'Rejected', label: 'Rejected' },
  { value: 'Completed', label: 'Completed' },
];

const QUOTE_FILTER_OPTIONS = [
  { value: 'All', label: 'All Statuses' },
  ...QUOTE_STATUS_OPTIONS,
];

function getQuoteStatusClass(status: QuoteStatus): string {
  switch (status) {
    case 'Quoted':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'Accepted':
    case 'Completed':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'Rejected':
      return 'bg-rose-50 text-rose-700 border-rose-200';
    case 'Pending':
    default:
      return 'bg-amber-50 text-amber-700 border-amber-200';
  }
}

export function Quotes() {
  const {
    data: quotes = [],
    isLoading,
    isError,
  } = useQuotes();

  const updateQuote = useUpdateQuote();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const filteredQuotes = quotes.filter((quote) => {
    const searchTerm = search.toLowerCase();
    const matchesSearch =
      (quote.customerName || '').toLowerCase().includes(searchTerm) ||
      (quote.fileName || '').toLowerCase().includes(searchTerm) ||
      (quote.customerEmail || '').toLowerCase().includes(searchTerm);

    const matchesStatus =
      statusFilter === 'All' || quote.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleStatusChange = async (
    id: string,
    status: QuoteStatus
  ) => {
    try {
      await updateQuote.mutateAsync({
        id,
        status,
      });
    } catch (error) {
      console.error('Failed to update quote status:', error);
      alert('Failed to update status');
    }
  };

  const handlePriceUpdate = async (
    id: string,
    adminPrice: number
  ) => {
    try {
      await updateQuote.mutateAsync({
        id,
        adminPrice,
        status: 'Quoted',
      });
    } catch (error) {
      console.error('Failed to update quote price:', error);
      alert('Failed to update price');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 gap-2">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
        <span className="text-xs font-mono text-muted uppercase tracking-wider">Loading CAD quotes...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center text-xs font-semibold text-rose-700">
        Failed to load custom quote requests.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-4">
        <div>
          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-accent block">
            Custom CAD Estimation
          </span>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Custom 3D CAD Quotes
          </h1>
          <p className="mt-1 text-xs text-muted">
            Review uploaded STL/CAD files, evaluate material weight, and send pricing quotes to clients.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-line shadow-xs font-mono text-xs font-bold text-ink">
          <FileBox className="w-4 h-4 text-accent" />
          <span>{quotes.length} Quotes Received</span>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="rounded-xl border border-line bg-white p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text"
              placeholder="Search by customer name, email or file name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs font-sans text-ink bg-white border border-line rounded-lg outline-none focus:border-accent"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-52 py-2 px-3 text-xs font-sans font-semibold text-ink bg-white border border-line rounded-lg outline-none focus:border-accent cursor-pointer"
          >
            {QUOTE_FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Quotes Cards List */}
      <div className="space-y-4">
        {filteredQuotes.length === 0 ? (
          <div className="rounded-xl border border-line bg-white p-12 text-center text-xs font-mono text-muted shadow-xs">
            No quote requests matching criteria.
          </div>
        ) : (
          filteredQuotes.map((quote) => (
            <div
              key={quote.id}
              className="rounded-xl border border-line bg-white p-6 shadow-xs hover:border-accent/30 transition-all space-y-4"
            >
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                {/* Left Info Area */}
                <div className="flex-1 space-y-4">
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent shrink-0 mt-0.5">
                      <FileBox className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h3 className="font-display font-bold text-sm text-ink">
                          {quote.customerName}
                        </h3>
                        <span
                          className={`inline-flex px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold uppercase tracking-wider border ${getQuoteStatusClass(
                            quote.status
                          )}`}
                        >
                          {quote.status}
                        </span>
                      </div>
                      <p className="text-xs text-muted font-mono mt-0.5">
                        {quote.customerEmail} • {quote.customerPhone}
                      </p>
                      <p className="text-[10px] font-mono text-muted mt-0.5">
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

                  {/* Tech Specifications Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-shell p-3 rounded-lg border border-line text-xs font-sans">
                    <div>
                      <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted">File Name</p>
                      <p className="font-mono font-semibold text-ink truncate mt-0.5">
                        {quote.fileName}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted">Material / Color</p>
                      <p className="font-semibold text-ink mt-0.5">
                        {quote.material} / {quote.color}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted">Infill / Layer</p>
                      <p className="font-mono font-semibold text-ink mt-0.5">
                        {quote.infill}% / {quote.layerHeight}mm
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted">Est. Weight / Qty</p>
                      <p className="font-mono font-semibold text-ink mt-0.5">
                        {quote.estimatedWeight}g × {quote.quantity} pcs
                      </p>
                    </div>
                  </div>

                  {quote.notes && (
                    <div className="text-xs text-muted bg-paper p-3 rounded-lg border border-line">
                      <span className="font-semibold text-ink">Client Request Notes:</span> {quote.notes}
                    </div>
                  )}
                </div>

                {/* Right Area: Pricing & Actions */}
                <div className="lg:w-60 shrink-0 space-y-3 bg-shell/40 p-4 rounded-lg border border-line">
                  <div className="text-center bg-white p-3 rounded-lg border border-line">
                    <p className="text-[10px] font-mono uppercase tracking-wider text-muted font-bold">
                      Automated Customer Est.
                    </p>
                    <p className="text-xl font-mono font-bold text-accent mt-0.5">
                      ₹{(quote.estimatedPrice ?? 0).toLocaleString('en-IN')}
                    </p>
                  </div>

                  {quote.adminPrice !== undefined && (
                    <div className="text-center bg-emerald-50 p-3 rounded-lg border border-emerald-200">
                      <p className="text-[10px] font-mono uppercase tracking-wider text-emerald-800 font-bold">
                        Official Admin Quote
                      </p>
                      <p className="text-xl font-mono font-bold text-emerald-700 mt-0.5">
                        ₹{quote.adminPrice.toLocaleString('en-IN')}
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-muted">
                      Quote Status
                    </label>
                    <select
                      value={quote.status}
                      onChange={(e) =>
                        handleStatusChange(quote.id, e.target.value as QuoteStatus)
                      }
                      className="w-full py-1.5 px-2.5 text-xs font-mono font-semibold text-ink bg-white border border-line rounded-lg outline-none focus:border-accent cursor-pointer"
                    >
                      {QUOTE_STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>

                    <div className="pt-2 border-t border-line space-y-1.5">
                      <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-muted">
                        Set Custom Price (₹)
                      </label>
                      <div className="flex gap-1.5">
                        <input
                          type="number"
                          placeholder="Amount in ₹"
                          className="w-full px-2.5 py-1.5 text-xs font-mono text-ink bg-white border border-line rounded-lg outline-none focus:border-accent"
                          id={`price-${quote.id}`}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const input = document.getElementById(
                              `price-${quote.id}`
                            ) as HTMLInputElement;
                            const price = Number(input.value);
                            if (price > 0) {
                              handlePriceUpdate(quote.id, price);
                            }
                          }}
                          className="px-3 py-1.5 rounded-lg bg-accent text-white font-mono text-xs font-bold hover:bg-accent-dark transition-colors shrink-0 shadow-xs"
                        >
                          Set
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Quotes;
