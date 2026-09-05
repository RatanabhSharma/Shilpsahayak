import { useState, useMemo } from 'react';
import {
  Package,
  Plus,
  Pencil,
  Trash2,
  Copy,
  FileSpreadsheet,
  FolderTree,
  AlertTriangle,
  CheckCircle2,
  X,
  Boxes,
} from 'lucide-react';
import {
  useProducts,
  useAddProduct,
  useUpdateProduct,
  useDeleteProduct,
  Product,
  ProductStatus,
} from '../../hooks/useProducts';
import {
  useCategories,
  useAddCategory,
  useUpdateCategory,
  useDeleteCategory,
} from '../../hooks/useCategories';
import { exportCatalogToCsv } from '../../utils/exportCsv';

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
import { ConfirmationDialog } from '../../components/admin/shared/ConfirmationDialog';

// Phase 5 6-Tab Product Editor
import { ProductModalEditor } from '../../components/admin/catalog/ProductModalEditor';

const STATUS_FILTERS = [
  { label: 'All Statuses', value: 'ALL' },
  { label: 'Active (Storefront)', value: 'Active' },
  { label: 'Draft (Unpublished)', value: 'Draft' },
  { label: 'Archived', value: 'Archived' },
];

const STOCK_FILTERS = [
  { label: 'All Stock Levels', value: 'ALL' },
  { label: 'In Stock (> 5)', value: 'IN_STOCK' },
  { label: 'Low Stock (1-5)', value: 'LOW_STOCK' },
  { label: 'Out of Stock (0)', value: 'OUT_OF_STOCK' },
];

const SORT_OPTIONS = [
  { label: 'Name: A to Z', value: 'name_asc' },
  { label: 'Name: Z to A', value: 'name_desc' },
  { label: 'Price: High to Low', value: 'price_desc' },
  { label: 'Price: Low to High', value: 'price_asc' },
  { label: 'Stock: Highest First', value: 'stock_desc' },
  { label: 'Stock: Lowest First', value: 'stock_asc' },
];

const ITEMS_PER_PAGE = 9;

export function Catalog() {
  const {
    data: products = [],
    isLoading,
    isError,
    refetch,
  } = useProducts();

  const addProduct = useAddProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  // Categories Hook
  const { data: categories = [] } = useCategories();
  const addCategory = useAddCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  // Filter & Search State
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [stockFilter, setStockFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('name_asc');
  const [currentPage, setCurrentPage] = useState(1);

  // Editor Modal State
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Delete & Duplicate Confirmation
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [productToDuplicate, setProductToDuplicate] = useState<Product | null>(null);

  // Categories Manager Modal
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState('');
  const [catError, setCatError] = useState('');

  // Top Metrics Calculation
  const metrics = useMemo(() => {
    const total = products.length;
    const active = products.filter((p) => p.status === 'Active' || p.active !== false).length;
    const lowStock = products.filter((p) => {
      const stock = Number(p.stock) || 0;
      const threshold = p.lowStockThreshold ?? 5;
      return stock > 0 && stock <= threshold;
    }).length;
    const outOfStock = products.filter((p) => (Number(p.stock) || 0) === 0).length;

    return { total, active, lowStock, outOfStock };
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
            (p.slug || '').toLowerCase().includes(q) ||
            (p.category || '').toLowerCase().includes(q) ||
            (p.subcategory || '').toLowerCase().includes(q) ||
            (p.material || '').toLowerCase().includes(q) ||
            (p.tags || []).some((t) => t.toLowerCase().includes(q));
          if (!matches) return false;
        }

        // Category Filter
        if (categoryFilter !== 'ALL') {
          if ((p.category || '').toLowerCase() !== categoryFilter.toLowerCase()) {
            return false;
          }
        }

        // Status Filter
        if (statusFilter !== 'ALL') {
          const effectiveStatus = p.status || (p.active !== false ? 'Active' : 'Draft');
          if (effectiveStatus !== statusFilter) return false;
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
        if (sortBy === 'name_asc') {
          return (a.name || '').localeCompare(b.name || '');
        }
        if (sortBy === 'name_desc') {
          return (b.name || '').localeCompare(a.name || '');
        }
        if (sortBy === 'price_desc') {
          return (b.price || 0) - (a.price || 0);
        }
        if (sortBy === 'price_asc') {
          return (a.price || 0) - (b.price || 0);
        }
        if (sortBy === 'stock_desc') {
          return (b.stock || 0) - (a.stock || 0);
        }
        if (sortBy === 'stock_asc') {
          return (a.stock || 0) - (b.stock || 0);
        }
        return 0;
      });
  }, [products, search, categoryFilter, statusFilter, stockFilter, sortBy]);

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE) || 1;
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProducts.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredProducts, currentPage]);

  // Handle Create New
  const handleOpenCreate = () => {
    setEditingProduct(null);
    setIsEditorOpen(true);
  };

  // Handle Edit
  const handleOpenEdit = (product: Product) => {
    setEditingProduct(product);
    setIsEditorOpen(true);
  };

  // Save Product (Create or Update)
  const handleSaveProduct = async (productData: Partial<Product>) => {
    if (editingProduct?.id) {
      await updateProduct.mutateAsync({
        id: editingProduct.id,
        ...productData,
      });
    } else {
      await addProduct.mutateAsync(productData as Omit<Product, 'id'>);
    }
  };

  // Quick Toggle Status (Active <-> Draft)
  const handleToggleStatus = async (product: Product) => {
    const currentStatus = product.status || (product.active !== false ? 'Active' : 'Draft');
    const newStatus: ProductStatus = currentStatus === 'Active' ? 'Draft' : 'Active';

    try {
      await updateProduct.mutateAsync({
        id: product.id,
        status: newStatus,
        active: newStatus === 'Active',
      });
    } catch (err: any) {
      console.error('Failed to toggle status:', err);
      alert('Failed to update status.');
    }
  };

  // Duplicate Product
  const handleDuplicate = async (source: Product) => {
    try {
      const copyName = `${source.name} (Copy)`;
      const copyPayload: Omit<Product, 'id'> = {
        ...source,
        name: copyName,
        slug: `${source.slug || source.id}-copy-${Date.now().toString().slice(-4)}`,
        sku: source.sku ? `${source.sku}-COPY` : undefined,
        status: 'Draft',
        active: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await addProduct.mutateAsync(copyPayload);
      setProductToDuplicate(null);
      alert(`Product duplicated as "${copyName}" in Draft status.`);
    } catch (err: any) {
      console.error('Failed to duplicate product:', err);
      alert('Failed to duplicate product.');
    }
  };

  // Delete Product
  const handleDelete = async () => {
    if (!productToDelete) return;
    try {
      await deleteProduct.mutateAsync(productToDelete.id);
      setProductToDelete(null);
    } catch (err: any) {
      console.error('Failed to delete product:', err);
      alert(err?.message || 'Failed to delete product');
    }
  };

  // Categories Handlers
  const handleAddCategory = async () => {
    const name = newCatName.trim();
    if (!name) {
      setCatError('Category name is required.');
      return;
    }
    setCatError('');
    try {
      await addCategory.mutateAsync(name);
      setNewCatName('');
    } catch (err: any) {
      setCatError(err?.message || 'Failed to add category');
    }
  };

  const handleUpdateCategory = async (id: string) => {
    const name = editingCatName.trim();
    if (!name) return;
    try {
      await updateCategory.mutateAsync({ id, name });
      setEditingCatId(null);
      setEditingCatName('');
    } catch (err: any) {
      alert(err?.message || 'Failed to update category');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      await deleteCategory.mutateAsync(id);
    } catch (err: any) {
      alert(err?.message || 'Failed to delete category');
    }
  };

  if (isLoading) {
    return <LoadingState message="Loading Shilp Sahayak Product Catalogue..." />;
  }

  if (isError) {
    return (
      <ErrorState
        title="Failed to Load Product Catalogue"
        message="Unable to fetch ready-made catalog products from Firestore. Please verify your connection."
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Product Catalogue"
        description="Manage finished 3D printed catalogue items, pricing tiers, profit margins, product stock, and SEO discovery metadata."
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin' },
          { label: 'Product Catalogue' },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsCategoryModalOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-line bg-white hover:bg-shell text-ink font-mono text-xs font-bold transition-all shadow-2xs cursor-pointer"
            >
              <FolderTree className="w-4 h-4 text-accent" />
              <span>Categories ({categories.length})</span>
            </button>

            <button
              type="button"
              onClick={() => exportCatalogToCsv(products)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-line bg-white hover:bg-shell text-ink font-mono text-xs font-bold transition-all shadow-2xs cursor-pointer"
              title="Download products catalog as CSV"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent hover:bg-accent-dark text-white font-mono text-xs font-bold transition-colors shadow-xs shadow-accent/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Product</span>
            </button>
          </div>
        }
      />

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Catalogue Items"
          value={metrics.total}
          icon={Package}
        />
        <StatCard
          title="Active on Storefront"
          value={metrics.active}
          icon={CheckCircle2}
          description="Live for customers"
        />
        <StatCard
          title="Low Stock Warning"
          value={metrics.lowStock}
          icon={AlertTriangle}
          warning={metrics.lowStock > 0}
          description="Stock <= threshold"
        />
        <StatCard
          title="Out of Stock"
          value={metrics.outOfStock}
          icon={Boxes}
          danger={metrics.outOfStock > 0}
          description="Needs print replenishment"
        />
      </div>

      {/* Filter Bar */}
      <FilterBar
        isFiltered={Boolean(search.trim() || categoryFilter !== 'ALL' || statusFilter !== 'ALL' || stockFilter !== 'ALL')}
        resultCount={filteredProducts.length}
        onReset={() => {
          setSearch('');
          setCategoryFilter('ALL');
          setStatusFilter('ALL');
          setStockFilter('ALL');
          setSortBy('name_asc');
          setCurrentPage(1);
        }}
      >
        <SearchInput
          placeholder="Search by title, SKU, category, material, tags..."
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
          {categories.map((c) => (
            <option key={c.id} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="py-1.5 px-3 rounded-lg border border-line bg-white text-xs font-mono text-ink outline-none focus:border-accent cursor-pointer"
        >
          {STATUS_FILTERS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
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

      {/* Product Cards Grid */}
      {paginatedProducts.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No Catalogue Products Found"
          description="No products matched your search or active filter combination."
          action={{
            label:
              search || categoryFilter !== 'ALL' || statusFilter !== 'ALL' || stockFilter !== 'ALL'
                ? 'Reset All Filters'
                : 'Add Your First Product',
            onClick: () => {
              if (search || categoryFilter !== 'ALL' || statusFilter !== 'ALL' || stockFilter !== 'ALL') {
                setSearch('');
                setCategoryFilter('ALL');
                setStatusFilter('ALL');
                setStockFilter('ALL');
                setCurrentPage(1);
              } else {
                handleOpenCreate();
              }
            },
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {paginatedProducts.map((p) => {
            const stockNum = Number(p.stock) || 0;
            const threshold = p.lowStockThreshold ?? 5;
            const stockStatus =
              stockNum === 0
                ? 'Out of Stock'
                : stockNum <= threshold
                ? 'Low Stock'
                : 'In Stock';

            const effectiveStatus: ProductStatus =
              p.status || (p.active !== false ? 'Active' : 'Draft');

            const priceNum = Number(p.price) || 0;
            const costNum = Number(p.costPrice) || 0;
            const origPriceNum = Number(p.originalPrice) || 0;

            const marginPercent =
              priceNum > 0 && costNum > 0
                ? Math.round(((priceNum - costNum) / priceNum) * 100)
                : null;

            return (
              <div
                key={p.id}
                className="rounded-2xl border border-line bg-white p-4 shadow-2xs hover:border-accent/40 transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Image & Top Badges Header */}
                  <div className="flex gap-3.5">
                    <div className="relative w-24 h-24 rounded-xl overflow-hidden bg-shell border border-line shrink-0">
                      <img
                        src={p.image}
                        alt={p.name}
                        className="w-full h-full object-contain p-1"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'https://images.unsplash.com/photo-1581783342308-f792dbdd27c5?auto=format&fit=crop&q=80&w=200';
                        }}
                      />
                      {p.badge && (
                        <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-amber-500 text-white font-mono text-[9px] font-bold uppercase shadow-2xs">
                          {p.badge}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <StatusBadge status={effectiveStatus} type="product" showDot />
                        <span className="font-mono text-[10px] font-bold text-accent uppercase bg-accent/10 px-1.5 py-0.5 rounded">
                          {p.category || 'General'}
                        </span>
                      </div>

                      <h3
                        className="font-display font-bold text-sm text-ink truncate mt-1"
                        title={p.name}
                      >
                        {p.name}
                      </h3>

                      <div className="flex items-center gap-2 font-mono text-xs">
                        <span className="font-bold text-ink">
                          {p.hasVariants ? 'From ' : ''}₹{priceNum.toLocaleString('en-IN')}
                        </span>
                        {origPriceNum > priceNum && (
                          <span className="text-[10px] text-muted line-through">
                            ₹{origPriceNum.toLocaleString('en-IN')}
                          </span>
                        )}
                        {marginPercent !== null && (
                          <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1 py-0.2 rounded">
                            {marginPercent}% margin
                          </span>
                        )}
                      </div>

                      {p.sku && (
                        <p className="text-[10px] font-mono text-muted uppercase truncate">
                          SKU: <span className="font-semibold text-slate-700">{p.sku}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Tech Specs & Stock Strip */}
                  <div className="mt-3.5 pt-3 border-t border-line/70 grid grid-cols-2 gap-2 text-xs font-mono">
                    <div className="bg-shell/60 p-2 rounded-lg border border-line/50">
                      <span className="text-[10px] uppercase font-bold text-muted block">Stock Status</span>
                      <span
                        className={`font-bold block mt-0.5 ${
                          stockStatus === 'Out of Stock'
                            ? 'text-rose-600'
                            : stockStatus === 'Low Stock'
                            ? 'text-amber-600'
                            : 'text-emerald-700'
                        }`}
                      >
                        {stockNum} units · {stockStatus}
                      </span>
                    </div>

                    <div className="bg-shell/60 p-2 rounded-lg border border-line/50">
                      <span className="text-[10px] uppercase font-bold text-muted block">Material</span>
                      <span className="font-bold text-ink truncate block mt-0.5">
                        {p.material || 'PLA'}
                      </span>
                    </div>
                  </div>

                  {/* Variants & Dimensions pills */}
                  <div className="flex items-center gap-1.5 flex-wrap mt-2 text-[10px] font-mono text-muted">
                    {p.hasVariants && (
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-line text-slate-700 font-semibold">
                        {(p.variants || []).length} Options
                      </span>
                    )}
                    {p.weight && (
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-line text-slate-700">
                        {p.weight}g
                      </span>
                    )}
                    {p.dimensions && (
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-line text-slate-700">
                        {p.dimensions.length}×{p.dimensions.width}×{p.dimensions.height} {p.dimensions.unit || 'mm'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-line">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(p)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl border border-line bg-white hover:bg-shell text-xs font-mono font-bold text-ink transition-colors cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5 text-accent" />
                    <span>Edit Product</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleStatus(p)}
                    className={`py-1.5 px-2.5 rounded-xl border font-mono text-[11px] font-bold transition-colors cursor-pointer ${
                      effectiveStatus === 'Active'
                        ? 'border-amber-200 bg-amber-50/60 text-amber-800 hover:bg-amber-100'
                        : 'border-emerald-200 bg-emerald-50/60 text-emerald-800 hover:bg-emerald-100'
                    }`}
                    title={effectiveStatus === 'Active' ? 'Unpublish to Draft' : 'Publish to Active'}
                  >
                    {effectiveStatus === 'Active' ? 'Draft' : 'Publish'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setProductToDuplicate(p)}
                    className="p-1.5 rounded-xl border border-line bg-white text-muted hover:text-ink hover:bg-shell transition-colors cursor-pointer"
                    title="Duplicate product"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setProductToDelete(p)}
                    className="p-1.5 rounded-xl border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Delete product"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
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
          totalItems={filteredProducts.length}
          pageSize={ITEMS_PER_PAGE}
        />
      )}

      {/* 6-Tab Product Modal Editor */}
      <ProductModalEditor
        isOpen={isEditorOpen}
        product={editingProduct}
        categories={categories}
        onClose={() => setIsEditorOpen(false)}
        onSave={handleSaveProduct}
        onOpenCategoriesManager={() => setIsCategoryModalOpen(true)}
      />

      {/* Confirmation Dialog for Delete */}
      {productToDelete && (
        <ConfirmationDialog
          isOpen={Boolean(productToDelete)}
          title={`Delete "${productToDelete.name}"?`}
          description="Are you sure you want to permanently remove this product from the Shilp Sahayak catalogue? This action cannot be undone."
          confirmText="Delete Product"
          variant="danger"
          isLoading={deleteProduct.isPending}
          onConfirm={handleDelete}
          onClose={() => setProductToDelete(null)}
        />
      )}

      {/* Confirmation Dialog for Duplicate */}
      {productToDuplicate && (
        <ConfirmationDialog
          isOpen={Boolean(productToDuplicate)}
          title={`Duplicate "${productToDuplicate.name}"?`}
          description="A copy of this product will be created in Draft status with a new URL slug and SKU suffix, ready for modification."
          confirmText="Create Duplicate"
          variant="primary"
          isLoading={addProduct.isPending}
          onConfirm={() => handleDuplicate(productToDuplicate)}
          onClose={() => setProductToDuplicate(null)}
        />
      )}

      {/* Categories Manager Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-[60] bg-ink/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl border border-line shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-accent block">
                  Storefront Taxonomies
                </span>
                <h3 className="font-display text-base font-bold text-ink">Manage Categories</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="text-muted hover:text-ink p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Add Category Section */}
            <div className="space-y-2">
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-muted">
                Add New Category
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Lithophane Lamps"
                  value={newCatName}
                  onChange={(e) => {
                    setNewCatName(e.target.value);
                    setCatError('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCategory();
                    }
                  }}
                  className="flex-1 px-3 py-2 text-xs font-semibold text-ink bg-white border border-line rounded-xl outline-none focus:border-accent"
                />
                <button
                  type="button"
                  onClick={handleAddCategory}
                  disabled={addCategory.isPending}
                  className="px-4 py-2 rounded-xl bg-accent text-white font-mono text-xs font-bold hover:bg-accent-dark transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {addCategory.isPending ? 'Adding...' : 'Add'}
                </button>
              </div>
              {catError && <p className="text-xs text-rose-600 font-semibold">{catError}</p>}
            </div>

            {/* Existing Categories List */}
            <div className="space-y-2 pt-2 border-t border-line">
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-muted">
                Active Categories ({categories.length})
              </label>

              <div className="max-h-60 overflow-y-auto border border-line rounded-xl divide-y divide-line bg-shell/30">
                {categories.length === 0 ? (
                  <p className="p-4 text-center text-xs font-mono text-muted">No categories created yet.</p>
                ) : (
                  categories.map((c) => {
                    const isEditing = editingCatId === c.id;

                    return (
                      <div key={c.id} className="flex items-center justify-between p-2.5 gap-2 bg-white">
                        {isEditing ? (
                          <div className="flex items-center gap-1.5 flex-1">
                            <input
                              type="text"
                              value={editingCatName}
                              onChange={(e) => setEditingCatName(e.target.value)}
                              className="flex-1 px-2.5 py-1 text-xs font-semibold text-ink bg-white border border-accent rounded-lg outline-none"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleUpdateCategory(c.id);
                                } else if (e.key === 'Escape') {
                                  setEditingCatId(null);
                                }
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => handleUpdateCategory(c.id)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-mono text-[11px] font-bold hover:bg-emerald-100 cursor-pointer"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingCatId(null)}
                              className="px-2.5 py-1 rounded-lg border border-line bg-white font-mono text-[11px] font-bold text-muted hover:bg-shell cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <>
                            <span className="text-xs text-ink font-semibold pl-1 font-sans">{c.name}</span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingCatId(c.id);
                                  setEditingCatName(c.name);
                                }}
                                className="p-1.5 rounded-lg text-muted hover:text-accent hover:bg-shell cursor-pointer"
                                title="Edit Category"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteCategory(c.id)}
                                className="p-1.5 rounded-lg text-muted hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                                title="Delete Category"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-line">
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="py-2 px-4 rounded-xl border border-line bg-white font-mono text-xs font-bold text-ink hover:bg-shell transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Catalog;
