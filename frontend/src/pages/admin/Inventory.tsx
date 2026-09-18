import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  Boxes,
  AlertTriangle,
  FileSpreadsheet,
  RefreshCw,
  Edit2,
  History,
  TrendingUp,
  ExternalLink,
  Lock,
} from 'lucide-react';
import { useProducts, Product } from '../../hooks/useProducts';
import { useOrders } from '../../hooks/useOrders';
import { exportInventoryToCsv } from '../../utils/exportCsv';

// Phase 2 Shared Admin Components
import { PageHeader } from '../../components/admin/shared/PageHeader';
import { StatCard } from '../../components/admin/shared/StatCard';
import { StatusBadge } from '../../components/admin/shared/StatusBadge';
import { SearchInput } from '../../components/admin/shared/SearchInput';
import { FilterBar } from '../../components/admin/shared/FilterBar';
import { Pagination } from '../../components/admin/shared/Pagination';
import { EmptyState } from '../../components/admin/shared/EmptyState';
import { LoadingState } from '../../components/admin/shared/LoadingState';
import { ErrorState } from '../../components/admin/shared/ErrorState';

// Phase 6 Inventory Modals
import { StockAdjustmentModal } from '../../components/admin/inventory/StockAdjustmentModal';
import { StockLogsDrawer } from '../../components/admin/inventory/StockLogsDrawer';

const STOCK_FILTERS = [
  { label: 'All Stock Levels', value: 'ALL' },
  { label: 'In Stock (> 5)', value: 'IN_STOCK' },
  { label: 'Low Stock (1-5)', value: 'LOW_STOCK' },
  { label: 'Out of Stock (0)', value: 'OUT_OF_STOCK' },
];

const SORT_OPTIONS = [
  { label: 'Stock: Lowest First', value: 'stock_asc' },
  { label: 'Stock: Highest First', value: 'stock_desc' },
  { label: 'Value: Highest First', value: 'value_desc' },
  { label: 'Name: A to Z', value: 'name_asc' },
];

const ITEMS_PER_PAGE = 10;

export function Inventory() {
  const {
    data: products = [],
    isLoading: isProductsLoading,
    isError: isProductsError,
    refetch: refetchProducts,
    isRefetching,
  } = useProducts();

  const { data: orders = [] } = useOrders();

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [stockFilter, setStockFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('stock_asc');
  const [currentPage, setCurrentPage] = useState(1);

  // Modals & Drawers
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [historyProduct, setHistoryProduct] = useState<Product | null>(null);

  // Extract distinct categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set).sort();
  }, [products]);

  // Calculate Reserved Units per Product from unfulfilled active orders
  const reservedMap = useMemo(() => {
    const map: Record<string, number> = {};

    const activeOrders = orders.filter(
      (o) => o.status !== 'Delivered' && o.status !== 'Cancelled'
    );

    activeOrders.forEach((order) => {
      (order.items || []).forEach((item) => {
        if (item.productId) {
          map[item.productId] = (map[item.productId] || 0) + (Number(item.quantity) || 0);
        }
      });
    });

    return map;
  }, [orders]);

  // Calculate Metrics
  const metrics = useMemo(() => {
    let totalUnits = 0;
    let totalValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    products.forEach((p) => {
      const stock = Number(p.stock) || 0;
      const price = Number(p.price) || 0;
      const threshold = p.lowStockThreshold ?? 5;

      totalUnits += stock;
      totalValue += stock * price;

      if (stock === 0) {
        outOfStockCount++;
      } else if (stock <= threshold) {
        lowStockCount++;
      }
    });

    return { totalUnits, totalValue, lowStockCount, outOfStockCount };
  }, [products]);

  // Filtered and Sorted Products
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        // Search
        if (search.trim()) {
          const q = search.toLowerCase();
          const matches =
            (p.name || '').toLowerCase().includes(q) ||
            (p.sku || '').toLowerCase().includes(q) ||
            (p.category || '').toLowerCase().includes(q) ||
            (p.material || '').toLowerCase().includes(q);
          if (!matches) return false;
        }

        // Category Filter
        if (categoryFilter !== 'ALL') {
          if ((p.category || '').toLowerCase() !== categoryFilter.toLowerCase()) {
            return false;
          }
        }

        // Stock Filter
        if (stockFilter !== 'ALL') {
          const stock = Number(p.stock) || 0;
          const threshold = p.lowStockThreshold ?? 5;
          if (stockFilter === 'IN_STOCK' && stock <= threshold) return false;
          if (stockFilter === 'LOW_STOCK' && (stock === 0 || stock > threshold)) return false;
          if (stockFilter === 'OUT_OF_STOCK' && stock > 0) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const stockA = Number(a.stock) || 0;
        const stockB = Number(b.stock) || 0;
        const valueA = stockA * (Number(a.price) || 0);
        const valueB = stockB * (Number(b.price) || 0);

        if (sortBy === 'stock_asc') return stockA - stockB;
        if (sortBy === 'stock_desc') return stockB - stockA;
        if (sortBy === 'value_desc') return valueB - valueA;
        if (sortBy === 'name_asc') return (a.name || '').localeCompare(b.name || '');
        return 0;
      });
  }, [products, search, categoryFilter, stockFilter, sortBy]);

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE) || 1;
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProducts.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredProducts, currentPage]);

  if (isProductsLoading) {
    return <LoadingState message="Loading Product Finished Stock Inventory..." />;
  }

  if (isProductsError) {
    return (
      <ErrorState
        title="Failed to Load Product Inventory"
        message="Unable to fetch finished product stock telemetry from Firestore."
        onRetry={() => refetchProducts()}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Product Inventory"
        description="Real-time operational inventory tracking finished ready-made products on hand, units reserved in active orders, and immutable stock audit ledgers."
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin' },
          { label: 'Product Inventory' },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => refetchProducts()}
              disabled={isRefetching}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-line bg-white hover:bg-shell text-xs font-mono font-bold text-ink transition-all shadow-2xs cursor-pointer disabled:opacity-50"
              title="Refresh inventory telemetry"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 text-muted ${isRefetching ? 'animate-spin' : ''}`}
              />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              onClick={() => exportInventoryToCsv(products)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-line bg-white hover:bg-shell text-ink font-mono text-xs font-bold transition-all shadow-2xs cursor-pointer"
              title="Download inventory report as CSV"
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
          title="Total Inventory Asset Value"
          value={`₹${metrics.totalValue.toLocaleString('en-IN')}`}
          icon={TrendingUp}
          description="Finished goods valuation"
        />
        <StatCard
          title="Total Stock on Hand"
          value={`${metrics.totalUnits} Units`}
          icon={Boxes}
          description="Ready-to-dispatch items"
        />
        <StatCard
          title="Low Stock Warnings"
          value={metrics.lowStockCount}
          icon={AlertTriangle}
          warning={metrics.lowStockCount > 0}
          description="Stock <= threshold"
        />
        <StatCard
          title="Out of Stock Items"
          value={metrics.outOfStockCount}
          icon={Package}
          danger={metrics.outOfStockCount > 0}
          description="Requires print batch"
        />
      </div>

      {/* Filter Bar */}
      <FilterBar
        isFiltered={Boolean(
          categoryFilter !== 'ALL' ||
          stockFilter !== 'ALL' ||
          search.trim() ||
          sortBy !== 'stock_asc'
        )}
        resultCount={filteredProducts.length}
        onReset={() => {
          setSearch('');
          setCategoryFilter('ALL');
          setStockFilter('ALL');
          setSortBy('stock_asc');
          setCurrentPage(1);
        }}
      >
        <SearchInput
          placeholder="Search by product name, SKU, category..."
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

        {/* Category Filter */}
        <select
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="py-1.5 px-3 rounded-lg border border-line bg-white text-xs font-mono text-ink outline-none focus:border-accent cursor-pointer"
        >
          <option value="ALL">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        {/* Stock Level Filter */}
        <select
          value={stockFilter}
          onChange={(e) => {
            setStockFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="py-1.5 px-3 rounded-lg border border-line bg-white text-xs font-mono text-ink outline-none focus:border-accent cursor-pointer"
        >
          {STOCK_FILTERS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
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
          className="py-1.5 px-3 rounded-lg border border-line bg-white text-xs font-mono text-ink outline-none focus:border-accent cursor-pointer"
        >
          {SORT_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </FilterBar>

      {/* Inventory Table */}
      {paginatedProducts.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title="No Inventory Items Found"
          description="No finished products match your active search or stock filters."
          action={{
            label: 'Clear All Filters',
            onClick: () => {
              setSearch('');
              setCategoryFilter('ALL');
              setStockFilter('ALL');
              setCurrentPage(1);
            },
          }}
        />
      ) : (
        <div className="rounded-2xl border border-line bg-white shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-sans text-xs">
              <thead>
                <tr className="bg-shell/50 border-b border-line text-[10px] font-mono font-bold uppercase tracking-wider text-muted">
                  <th className="px-5 py-3.5">Product & SKU</th>
                  <th className="px-4 py-3.5">Category</th>
                  <th className="px-4 py-3.5">Unit Price</th>
                  <th className="px-4 py-3.5 text-center">In Stock</th>
                  <th className="px-4 py-3.5 text-center">Reserved</th>
                  <th className="px-4 py-3.5 text-center">Available</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {paginatedProducts.map((p) => {
                  const stockNum = Number(p.stock) || 0;
                  const reservedNum = reservedMap[p.id] || 0;
                  const availableNum = Math.max(0, stockNum - reservedNum);
                  const priceNum = Number(p.price) || 0;
                  const threshold = p.lowStockThreshold ?? 5;

                  const isOutOfStock = availableNum === 0;
                  const isLowStock = !isOutOfStock && availableNum <= threshold;

                  const statusLabel = isOutOfStock
                    ? 'Out of Stock'
                    : isLowStock
                    ? 'Low Stock Warning'
                    : 'In Stock';

                  return (
                    <tr
                      key={p.id}
                      className={`transition-colors ${
                        isOutOfStock
                          ? 'bg-rose-50/15 hover:bg-rose-50/30'
                          : isLowStock
                          ? 'bg-amber-50/15 hover:bg-amber-50/30'
                          : 'hover:bg-shell/40'
                      }`}
                    >
                      {/* Product & SKU */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3 min-w-[220px]">
                          <img
                            src={p.image}
                            alt={p.name}
                            className="w-10 h-10 rounded-lg object-contain bg-shell border border-line shrink-0"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                'https://images.unsplash.com/photo-1581783342308-f792dbdd27c5?auto=format&fit=crop&q=80&w=200';
                            }}
                          />
                          <div className="min-w-0">
                            <h4
                              className="font-display font-bold text-xs text-ink truncate"
                              title={p.name}
                            >
                              {p.name}
                            </h4>
                            <span className="font-mono text-[10px] text-muted block uppercase">
                              {p.sku || 'NO-SKU'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-4 py-3.5 font-mono text-muted whitespace-nowrap">
                        <span className="bg-shell px-2 py-0.5 rounded border border-line/60">
                          {p.category || 'General'}
                        </span>
                      </td>

                      {/* Unit Price */}
                      <td className="px-4 py-3.5 font-mono whitespace-nowrap">
                        <span className="font-bold text-ink">
                          ₹{priceNum.toLocaleString('en-IN')}
                        </span>
                        <span className="text-[10px] text-muted block">
                          Asset: ₹{(stockNum * priceNum).toLocaleString('en-IN')}
                        </span>
                      </td>

                      {/* In Stock */}
                      <td className="px-4 py-3.5 text-center font-mono font-bold text-ink whitespace-nowrap">
                        {stockNum}
                      </td>

                      {/* Reserved */}
                      <td className="px-4 py-3.5 text-center font-mono whitespace-nowrap">
                        {reservedNum > 0 ? (
                          <span className="inline-flex items-center gap-1 font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 text-[11px]">
                            <Lock className="w-2.5 h-2.5" />
                            <span>{reservedNum}</span>
                          </span>
                        ) : (
                          <span className="text-muted">0</span>
                        )}
                      </td>

                      {/* Available */}
                      <td className="px-4 py-3.5 text-center font-mono font-bold whitespace-nowrap">
                        <span
                          className={`text-sm ${
                            availableNum === 0
                              ? 'text-rose-600'
                              : availableNum <= threshold
                              ? 'text-amber-600'
                              : 'text-emerald-700'
                          }`}
                        >
                          {availableNum}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <StatusBadge status={statusLabel} type="stock" showDot />
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setAdjustingProduct(p)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-line bg-white hover:bg-shell text-ink font-mono text-[11px] font-bold transition-colors cursor-pointer shadow-2xs"
                            title="Adjust Stock Count"
                          >
                            <Edit2 className="w-3 h-3 text-accent" />
                            <span>Adjust</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setHistoryProduct(p)}
                            className="p-1.5 rounded-lg border border-line bg-white hover:bg-shell text-muted hover:text-ink transition-colors cursor-pointer"
                            title="View Stock Audit Ledger"
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>

                          <Link
                            to="/admin/catalog"
                            className="p-1.5 rounded-lg border border-line bg-white hover:bg-shell text-muted hover:text-accent transition-colors"
                            title="View in Product Catalog"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={(p) => setCurrentPage(p)}
          totalItems={filteredProducts.length}
          pageSize={ITEMS_PER_PAGE}
        />
      )}

      {/* Stock Adjustment Modal */}
      <StockAdjustmentModal
        isOpen={Boolean(adjustingProduct)}
        product={adjustingProduct}
        onClose={() => setAdjustingProduct(null)}
      />

      {/* Stock History Audit Drawer */}
      <StockLogsDrawer
        isOpen={Boolean(historyProduct)}
        product={historyProduct}
        onClose={() => setHistoryProduct(null)}
      />
    </div>
  );
}

export default Inventory;
