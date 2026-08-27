import {
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  Filter,
  PackageSearch,
  Search,
  Sparkles,
  X,
  SlidersHorizontal,
} from 'lucide-react';
import {
  Link,
  useSearchParams,
} from 'react-router-dom';
import { motion } from 'framer-motion';

import { useProducts } from '../../hooks/useProducts';
import {
  Button,
  Input,
  Select,
} from '../../components/ui';
import { ProductCard } from '../../components/product/ProductCard';
import { ProductGridSkeleton } from '../../components/loading/ProductSkeleton';

type SortOption =
  | 'featured'
  | 'newest'
  | 'price-low'
  | 'price-high';

const PRICE_STEP = 250;

function formatPrice(value: number) {
  return `₹${value.toLocaleString('en-IN')}`;
}

function getPriceCeiling(price: number) {
  if (price <= 0) {
    return 15000;
  }
  return Math.max(
    15000,
    Math.ceil(price / 1000) * 1000
  );
}

export function Catalog() {
  const {
    data: products = [],
    isLoading,
    isError,
  } = useProducts();

  const [searchParams, setSearchParams] = useSearchParams();

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(15000);

  const selectedCategories = useMemo(() => {
    const param = searchParams.get('category');
    if (!param) return [];
    return param.split(',').map((c) => decodeURIComponent(c.trim())).filter(Boolean);
  }, [searchParams]);

  const occasionFilter = searchParams.get('occasion');

  const sortParam =
    (searchParams.get('sort') as SortOption) || 'featured';

  /* Active Products */
  const activeProducts = useMemo(
    () => products.filter((product) => product.active !== false),
    [products]
  );

  /* Price Ceiling */
  const priceMaximum = useMemo(() => {
    const highestProductPrice = activeProducts.reduce(
      (highest, product) =>
        Math.max(highest, Number(product.price) || 0),
      0
    );

    return getPriceCeiling(highestProductPrice);
  }, [activeProducts]);

  useEffect(() => {
    setMinPrice(0);
    setMaxPrice(priceMaximum);
  }, [priceMaximum]);

  /* Filter Options */
  const categories = useMemo(() => {
    const counts = new Map<string, number>();

    activeProducts.forEach((product) => {
      if (!product.category) return;
      counts.set(
        product.category,
        (counts.get(product.category) || 0) + 1
      );
    });

    return Array.from(counts.entries()).map(([name, count]) => ({
      name,
      count,
    }));
  }, [activeProducts]);

  const materials = useMemo(
    () =>
      Array.from(
        new Set(
          activeProducts
            .map((product) => product.material)
            .filter(Boolean)
        )
      ) as string[],
    [activeProducts]
  );

  /* Filtering & Sorting Logic */
  const filteredProducts = useMemo(() => {
    let result = [...activeProducts];

    const query = searchQuery.trim().toLowerCase();

    if (query) {
      result = result.filter((product) => {
        const searchableText = [
          product.name,
          product.description,
          product.category,
          product.material,
          product.occasion,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return searchableText.includes(query);
      });
    }

    if (selectedCategories.length > 0) {
      result = result.filter(
        (product) =>
          product.category &&
          selectedCategories.includes(product.category)
      );
    }

    if (occasionFilter) {
      result = result.filter(
        (product) => product.occasion === occasionFilter
      );
    }

    if (selectedMaterials.length > 0) {
      result = result.filter(
        (product) =>
          product.material &&
          selectedMaterials.includes(product.material)
      );
    }

    result = result.filter((product) => {
      const price = Number(product.price) || 0;
      return price >= minPrice && price <= maxPrice;
    });

    if (inStockOnly) {
      result = result.filter((product) => Number(product.stock) > 0);
    }

    switch (sortParam) {
      case 'price-low':
        result.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
        break;

      case 'price-high':
        result.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
        break;

      case 'newest':
        break;

      case 'featured':
      default:
        result.sort(
          (a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured))
        );
        break;
    }

    return result;
  }, [
    activeProducts,
    selectedCategories,
    occasionFilter,
    searchQuery,
    selectedMaterials,
    minPrice,
    maxPrice,
    inStockOnly,
    sortParam,
  ]);

  /* URL Helpers */
  const updateSearchParam = (key: string, value: string | null) => {
    const nextParams = new URLSearchParams(searchParams);
    if (value) {
      nextParams.set(key, value);
    } else {
      nextParams.delete(key);
    }
    setSearchParams(nextParams);
  };

  const toggleCategory = (category: string) => {
    const current = selectedCategories;
    const next = current.includes(category)
      ? current.filter((c) => c !== category)
      : [...current, category];

    updateSearchParam(
      'category',
      next.length > 0 ? next.join(',') : null
    );
  };

  const handleOccasionChange = (occasion: string | null) => {
    updateSearchParam('occasion', occasion);
  };

  const handleSortChange = (value: string) => {
    updateSearchParam('sort', value);
  };

  const toggleMaterial = (material: string) => {
    setSelectedMaterials((current) =>
      current.includes(material)
        ? current.filter((item) => item !== material)
        : [...current, material]
    );
  };

  const handleMinPriceChange = (value: number) => {
    const nextValue = Math.min(value, maxPrice - PRICE_STEP);
    setMinPrice(Math.max(0, nextValue));
  };

  const handleMaxPriceChange = (value: number) => {
    const nextValue = Math.max(value, minPrice + PRICE_STEP);
    setMaxPrice(Math.min(priceMaximum, nextValue));
  };

  const clearFilters = () => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('category');
    nextParams.delete('occasion');
    nextParams.delete('sort');
    setSearchParams(nextParams);

    setSearchQuery('');
    setSelectedMaterials([]);
    setInStockOnly(false);
    setMinPrice(0);
    setMaxPrice(priceMaximum);
  };

  const activeFilterChips = useMemo(() => {
    const chips: Array<{
      label: string;
      remove: () => void;
    }> = [];

    selectedCategories.forEach((category) => {
      chips.push({
        label: `Category: ${category}`,
        remove: () => toggleCategory(category),
      });
    });

    if (occasionFilter) {
      chips.push({
        label: `Occasion: ${occasionFilter}`,
        remove: () => handleOccasionChange(null),
      });
    }

    selectedMaterials.forEach((material) => {
      chips.push({
        label: `Material: ${material}`,
        remove: () => toggleMaterial(material),
      });
    });

    if (minPrice > 0) {
      chips.push({
        label: `Min ${formatPrice(minPrice)}`,
        remove: () => setMinPrice(0),
      });
    }

    if (maxPrice < priceMaximum) {
      chips.push({
        label: `Max ${formatPrice(maxPrice)}`,
        remove: () => setMaxPrice(priceMaximum),
      });
    }

    if (inStockOnly) {
      chips.push({
        label: 'In Stock Only',
        remove: () => setInStockOnly(false),
      });
    }

    if (searchQuery.trim()) {
      chips.push({
        label: `"${searchQuery.trim()}"`,
        remove: () => setSearchQuery(''),
      });
    }

    return chips;
  }, [
    selectedCategories,
    occasionFilter,
    selectedMaterials,
    minPrice,
    maxPrice,
    priceMaximum,
    inStockOnly,
    searchQuery,
  ]);

  const hasActiveFilters = activeFilterChips.length > 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-paper">
        <div className="mx-auto max-w-[1440px] px-5 py-12 sm:px-8 lg:px-10">
          <div className="max-w-2xl space-y-3">
            <div className="h-4 w-24 rounded-full bg-shell animate-pulse" />
            <div className="h-10 w-72 rounded-xl bg-shell animate-pulse" />
            <div className="h-4 w-full max-w-lg rounded-md bg-shell animate-pulse" />
          </div>

          <div className="mt-12">
            <ProductGridSkeleton count={8} />
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-[60vh] bg-paper text-ink flex items-center justify-center px-5">
        <div className="max-w-md text-center">
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-accent">
            Catalog Error
          </span>
          <h1 className="mt-3 font-display text-3xl font-bold text-ink">
            Unable to load products.
          </h1>
          <p className="mt-3 text-sm text-muted font-sans">
            Please check your connection and refresh the page.
          </p>
          <Button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 font-display font-bold"
          >
            Retry Connection
          </Button>
        </div>
      </div>
    );
  }

  /* Sidebar Filter Panel */
  const filterPanel = (
    <div className="space-y-7 font-sans">
      {/* Categories */}
      <div className="space-y-3">
        <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-ink">Categories</h3>
        <div className="space-y-2">
          {categories.map((category) => {
            const isChecked = selectedCategories.includes(category.name);
            return (
              <label
                key={category.name}
                className="flex items-center justify-between text-xs font-medium text-ink cursor-pointer hover:text-accent transition-colors"
              >
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleCategory(category.name)}
                    className="h-4 w-4 rounded border-line text-accent focus:ring-accent"
                  />
                  <span>{category.name}</span>
                </div>
                <span className="font-mono text-2xs text-muted bg-shell px-2 py-0.5 rounded-full">
                  {category.count}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Materials */}
      {materials.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-line">
          <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-ink">Material</h3>
          <div className="space-y-2">
            {materials.map((material) => {
              const isChecked = selectedMaterials.includes(material);
              return (
                <label
                  key={material}
                  className="flex items-center gap-2 text-xs font-medium text-ink cursor-pointer hover:text-accent transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleMaterial(material)}
                    className="h-4 w-4 rounded border-line text-accent focus:ring-accent"
                  />
                  <span>{material}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Price Range */}
      <div className="space-y-3 pt-4 border-t border-line">
        <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-ink">Price Range</h3>
        <div>
          <div className="mb-3 flex items-center justify-between text-xs font-mono font-semibold text-ink">
            <span>{formatPrice(minPrice)}</span>
            <span>
              {formatPrice(maxPrice)}
              {maxPrice === priceMaximum ? '+' : ''}
            </span>
          </div>

          <div className="relative h-6 flex items-center">
            <div className="absolute left-0 right-0 h-1.5 rounded-full bg-line" />
            <div
              className="absolute h-1.5 rounded-full bg-accent"
              style={{
                left: `${(minPrice / priceMaximum) * 100}%`,
                right: `${100 - (maxPrice / priceMaximum) * 100}%`,
              }}
            />
            <input
              type="range"
              min={0}
              max={priceMaximum}
              step={PRICE_STEP}
              value={minPrice}
              onChange={(e) => handleMinPriceChange(Number(e.target.value))}
              aria-label="Minimum price"
              className="catalog-range absolute inset-0 z-20 h-6 w-full cursor-pointer appearance-none bg-transparent"
            />
            <input
              type="range"
              min={0}
              max={priceMaximum}
              step={PRICE_STEP}
              value={maxPrice}
              onChange={(e) => handleMaxPriceChange(Number(e.target.value))}
              aria-label="Maximum price"
              className="catalog-range pointer-events-none absolute inset-0 z-30 h-6 w-full appearance-none bg-transparent"
            />
          </div>
        </div>
      </div>

      {/* Availability */}
      <div className="space-y-3 pt-4 border-t border-line">
        <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-ink">Availability</h3>
        <label className="flex items-center gap-2 text-xs font-medium text-ink cursor-pointer">
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={() => setInStockOnly((prev) => !prev)}
            className="h-4 w-4 rounded border-line text-accent focus:ring-accent"
          />
          <span>In Stock Only</span>
        </label>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-paper text-ink">
      <style>
        {`
          .catalog-range {
            pointer-events: none;
          }
          .catalog-range::-webkit-slider-thumb {
            appearance: none;
            width: 18px;
            height: 18px;
            border-radius: 9999px;
            background: #ff4d00;
            border: 2px solid #ffffff;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
            cursor: pointer;
            pointer-events: auto;
          }
          .catalog-range::-moz-range-thumb {
            width: 18px;
            height: 18px;
            border-radius: 9999px;
            background: #ff4d00;
            border: 2px solid #ffffff;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
            cursor: pointer;
            pointer-events: auto;
          }
        `}
      </style>

      {/* Page Header */}
      <section className="border-b border-line bg-white">
        <div className="mx-auto max-w-[1440px] px-5 py-10 sm:px-8 lg:px-10 lg:py-12">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 font-mono text-xs font-bold text-accent">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Shop Collection</span>
              </div>

              <h1 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl text-ink">
                3D Printed Catalog & Creations
              </h1>

              <p className="mt-3 max-w-2xl font-sans text-sm leading-relaxed text-muted sm:text-base">
                Browse our curated line of precision 3D printed products. Have a custom STL or CAD model you want us to produce instead?{' '}
                <Link
                  to="/custom-service"
                  className="font-bold text-accent underline underline-offset-4 hover:text-accent-dark transition-colors"
                >
                  Upload CAD for Instant Quote →
                </Link>
              </p>
            </div>

            <div className="shrink-0 rounded-2xl border border-line bg-shell p-4 font-mono">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted block">
                Total Stock
              </span>
              <span className="font-display text-2xl font-bold text-ink">
                {activeProducts.length} {activeProducts.length === 1 ? 'Piece' : 'Pieces'}
              </span>
            </div>
          </div>

          {/* Category Filter Pills Horizontal Strip */}
          {categories.length > 0 && (
            <div className="mt-8 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              <button
                type="button"
                onClick={() => updateSearchParam('category', null)}
                className={`px-4 py-2 rounded-full font-mono text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-colors border ${
                  selectedCategories.length === 0
                    ? 'bg-accent text-white border-accent'
                    : 'bg-shell text-ink border-line hover:border-accent hover:text-accent'
                }`}
              >
                All Products ({activeProducts.length})
              </button>
              {categories.map((cat) => {
                const isSelected = selectedCategories.includes(cat.name);
                return (
                  <button
                    key={cat.name}
                    type="button"
                    onClick={() => toggleCategory(cat.name)}
                    className={`px-4 py-2 rounded-full font-mono text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-colors border ${
                      isSelected
                        ? 'bg-accent text-white border-accent'
                        : 'bg-shell text-ink border-line hover:border-accent hover:text-accent'
                    }`}
                  >
                    {cat.name} ({cat.count})
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Main Content Area */}
      <main className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
        <div className="grid gap-10 lg:grid-cols-[260px_minmax(0,1fr)]">
          {/* Desktop Filter Sidebar */}
          <aside className="hidden lg:block" aria-label="Product filters">
            <div className="sticky top-28 rounded-2xl border border-line bg-white p-6 shadow-soft">
              <div className="flex items-center justify-between border-b border-line pb-4">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-accent" />
                  <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-ink">
                    Filters
                  </h2>
                </div>

                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="font-mono text-[11px] font-bold text-accent hover:underline"
                  >
                    Reset
                  </button>
                )}
              </div>

              <div className="pt-6">
                {filterPanel}
              </div>
            </div>
          </aside>

          {/* Product Listing Area */}
          <section>
            {/* Search & Sort Controls Bar */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search pieces, materials, keywords..."
                  aria-label="Search catalog"
                  className="pl-10 pr-9 bg-white"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Mobile Filter Button */}
              <Button
                type="button"
                variant="outline"
                className="bg-white lg:hidden font-semibold"
                onClick={() => setIsFilterOpen((prev) => !prev)}
              >
                <Filter className="mr-2 h-4 w-4 text-accent" />
                Filters
                {hasActiveFilters && (
                  <span className="ml-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 font-mono text-[10px] font-bold text-white">
                    {activeFilterChips.length}
                  </span>
                )}
              </Button>

              {/* Sort Selector */}
              <div className="flex items-center gap-2">
                <span className="hidden whitespace-nowrap font-mono text-xs font-semibold text-muted sm:inline">
                  Sort:
                </span>
                <Select
                  value={sortParam}
                  onChange={handleSortChange}
                  className="w-full sm:w-[190px] bg-white font-medium"
                  options={[
                    { value: 'featured', label: 'Featured First' },
                    { value: 'newest', label: 'Newest Arrivals' },
                    { value: 'price-low', label: 'Price: Low to High' },
                    { value: 'price-high', label: 'Price: High to Low' },
                  ]}
                />
              </div>
            </div>

            {/* Mobile Filter Drawer */}
            {isFilterOpen && (
              <div className="mt-4 rounded-2xl border border-line bg-white p-6 shadow-card lg:hidden">
                <div className="mb-6 flex items-center justify-between border-b border-line pb-4">
                  <h3 className="font-display text-lg font-bold text-ink">
                    Filter Products
                  </h3>
                  <button
                    type="button"
                    aria-label="Close filters"
                    onClick={() => setIsFilterOpen(false)}
                    className="rounded-lg p-1 text-muted hover:text-ink"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {filterPanel}

                <div className="mt-8 flex gap-3 border-t border-line pt-5">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={clearFilters}
                    className="flex-1 font-semibold"
                  >
                    Clear All
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setIsFilterOpen(false)}
                    className="flex-1 font-bold"
                  >
                    Apply Filters
                  </Button>
                </div>
              </div>
            )}

            {/* Active Filter Chips Bar */}
            <div className="mt-5 flex flex-wrap items-center gap-2 border-b border-line pb-4">
              <span className="mr-1 font-mono text-xs font-semibold text-muted">
                {filteredProducts.length} {filteredProducts.length === 1 ? 'result' : 'results'}
              </span>

              {activeFilterChips.map((chip, index) => (
                <button
                  key={`${chip.label}-${index}`}
                  type="button"
                  onClick={chip.remove}
                  className="group inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent-soft px-3 py-1 font-mono text-xs font-semibold text-accent hover:bg-accent hover:text-white transition-colors"
                >
                  <span>{chip.label}</span>
                  <X className="h-3 w-3" />
                </button>
              ))}

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="ml-auto font-mono text-xs font-bold text-accent hover:underline"
                >
                  Clear All
                </button>
              )}
            </div>

            {/* Product Cards Grid */}
            {filteredProducts.length === 0 ? (
              <div className="mt-8 rounded-2xl border border-dashed border-line bg-white px-6 py-20 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-shell text-accent">
                  <PackageSearch className="h-7 w-7" />
                </div>

                <h3 className="mt-5 font-display text-2xl font-bold text-ink">
                  No products matched your filters
                </h3>

                <p className="mx-auto mt-2 max-w-md font-sans text-sm text-muted">
                  Try clearing some filter tags, or request a custom 3D print using your own 3D CAD design.
                </p>

                <div className="mt-7 flex flex-wrap justify-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={clearFilters}
                    className="font-semibold"
                  >
                    Clear Filters
                  </Button>

                  <Link to="/custom-service">
                    <Button className="font-display font-bold">
                      <Sparkles className="mr-2 h-4 w-4" />
                      Get Custom 3D Quote
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
                className="mt-7 grid w-full gap-6 sm:grid-cols-2 xl:grid-cols-3"
              >
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </motion.div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
