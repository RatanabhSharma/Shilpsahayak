import { useState } from 'react';
import { Search, Loader2, FileBox } from 'lucide-react';
import { Card, Input, Button, Select } from '../../components/ui';
import {
  useQuotes,
  useUpdateQuote,
  QuoteStatus
} from '../../hooks/useQuotes';

const STATUS_COLORS: Record<QuoteStatus, string> = {
  Pending: 'bg-amber-50 text-amber-700',
  Quoted: 'bg-blue-50 text-blue-700',
  Accepted: 'bg-green-50 text-green-700',
  Rejected: 'bg-red-50 text-red-700',
  Completed: 'bg-purple-50 text-purple-700'
};

const QUOTE_STATUS_OPTIONS = [
  { value: 'Pending', label: 'Pending' },
  { value: 'Quoted', label: 'Quoted' },
  { value: 'Accepted', label: 'Accepted' },
  { value: 'Rejected', label: 'Rejected' },
  { value: 'Completed', label: 'Completed' }
];

const QUOTE_FILTER_OPTIONS = [
  { value: 'All', label: 'All Status' },
  ...QUOTE_STATUS_OPTIONS
];

export function Quotes() {
  const {
    data: quotes = [],
    isLoading,
    isError
  } = useQuotes();

  const updateQuote = useUpdateQuote();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const filteredQuotes = quotes.filter((quote) => {
   const searchTerm = search.toLowerCase();

const matchesSearch =
  (quote.customerName || '').toLowerCase().includes(searchTerm) ||
  (quote.fileName || '').toLowerCase().includes(searchTerm) ||
  (quote.customerEmail || '').toLowerCase().includes(searchTerm);;

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
      status
    });
  } catch (error) {
    console.error(
      'Failed to update quote status:',
      error
    );

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
      status: 'Quoted'
    });
  } catch (error) {
    console.error(
      'Failed to update quote price:',
      error
    );

    alert('Failed to update price');
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
        Failed to load quotes.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-bold text-charcoal">
          Custom Quotes
        </h1>
        <p className="text-charcoal-light text-sm mt-1">
          Review and respond to custom print requests
        </p>
      </div>

      {/* Filters */}
      <Card className="p-4 border-none shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-lighter" />
            <Input
              placeholder="Search by name, email or file..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            className="w-full sm:w-52"
            options={QUOTE_FILTER_OPTIONS}
          />
        </div>
      </Card>

      {/* Quotes List */}
      <div className="space-y-4">
        {filteredQuotes.length === 0 ? (
          <Card className="p-12 text-center text-charcoal-light border-none shadow-sm">
            No quote requests yet.
          </Card>
        ) : (
          filteredQuotes.map((quote) => (
            <Card
              key={quote.id}
              className="p-6 border-none shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                {/* Left Info */}
                <div className="flex-1">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0">
                      <FileBox className="w-6 h-6 text-brand-500" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-serif font-semibold text-charcoal">
                          {quote.customerName}
                        </h3>
                        <span
                          className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                            STATUS_COLORS[quote.status]
                          }`}
                        >
                          {quote.status}
                        </span>
                      </div>
                      <p className="text-sm text-charcoal-light">
                        {quote.customerEmail} • {quote.customerPhone}
                      </p>
                      <p className="text-xs text-charcoal-lighter mt-1">
                        {new Date(quote.date).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-charcoal-lighter text-xs mb-1">File</p>
                      <p className="font-medium text-charcoal truncate">
                        {quote.fileName}
                      </p>
                    </div>
                    <div>
                      <p className="text-charcoal-lighter text-xs mb-1">
                        Material
                      </p>
                      <p className="font-medium text-charcoal">
                        {quote.material} / {quote.color}
                      </p>
                    </div>
                    <div>
                      <p className="text-charcoal-lighter text-xs mb-1">
                        Infill / Layer
                      </p>
                      <p className="font-medium text-charcoal">
                        {quote.infill}% / {quote.layerHeight}mm
                      </p>
                    </div>
                    <div>
                      <p className="text-charcoal-lighter text-xs mb-1">
                        Est. Weight
                      </p>
                      <p className="font-medium text-charcoal">
                        {quote.estimatedWeight}g × {quote.quantity}
                      </p>
                    </div>
                  </div>

                  {quote.notes && (
                    <p className="mt-4 text-sm text-charcoal-light bg-surface p-3 rounded-lg">
                      <span className="font-medium">Note:</span> {quote.notes}
                    </p>
                  )}
                </div>

                {/* Right - Price & Actions */}
                <div className="lg:w-56 flex-shrink-0 space-y-4">
                  <div className="bg-brand-50 rounded-xl p-4 text-center">
                    <p className="text-xs text-charcoal-light mb-1">
                      Customer Estimate
                    </p>
                    <p className="text-2xl font-bold text-brand-600">
                     ₹{(quote.estimatedPrice ?? 0).toLocaleString('en-IN')}
                    </p>
                  </div>

                 {quote.adminPrice !== undefined && (
                    <div className="bg-green-50 rounded-xl p-4 text-center">
                      <p className="text-xs text-charcoal-light mb-1">
                        Your Quote
                      </p>
                      <p className="text-xl font-bold text-green-700">
                        ₹{quote.adminPrice.toLocaleString('en-IN')}
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Select
                      value={quote.status}
                      onChange={(value) =>
                        handleStatusChange(
                          quote.id,
                          value as QuoteStatus
                        )
                      }
                      className="w-full"
                      options={QUOTE_STATUS_OPTIONS}
                    />

                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="Your price"
                        className="text-sm"
                        id={`price-${quote.id}`}
                      />
                      <Button
                        size="sm"
                        onClick={() => {
                          const input = document.getElementById(
                            `price-${quote.id}`
                          ) as HTMLInputElement;
                          const price = Number(input.value);
                          if (price > 0) {
                            handlePriceUpdate(quote.id, price);
                          }
                        }}
                      >
                        Set
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
