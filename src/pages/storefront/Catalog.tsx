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
  ArrowRight,
  SlidersHorizontal,
} from 'lucide-react';
import {
  Link,
  useSearchParams,
} from 'react-router-dom';

import { useProducts } from '../../hooks/useProducts';
import {
  Button,
  Card,
  Input,
  Select,
} from '../../components/ui';
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

  /* ----------------------------------------------------------
     Active Products
     ---------------------------------------------------------- */

  const activeProducts = useMemo(
    () => products.filter((product) => product.active !== false),
    [products]
  );

  /* ----------------------------------------------------------
     Price Range
     ---------------------------------------------------------- */

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

  /* ----------------------------------------------------------
     Filter Options
     ---------------------------------------------------------- */

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

  /* ----------------------------------------------------------
     Filtering & Sorting Logic
     ---------------------------------------------------------- */

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

  /* ----------------------------------------------------------
     URL Parameter Helpers
     ---------------------------------------------------------- */

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
      <div className="min-h-screen bg-[#faf9f6]">
        <div className="mx-auto max-w-[1440px] px-5 py-12 sm:px-8 lg:px-10">
          <div className="max-w-2xl space-y-3">
            <div className="h-4 w-24 rounded-full bg-zinc-200 animate-pulse" />
            <div className="h-10 w-72 rounded-xl bg-zinc-200 animate-pulse" />
            <div className="h-4 w-full max-w-lg rounded-md bg-zinc-200 animate-pulse" />
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
      <div className="min-h-[60vh] bg-[#faf9f6] flex items-center justify-center px-5">
        <div className="max-w-md text-center">
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-brand-500">
            Catalog Error
          </span>
          <h1 className="mt-3 font-serif text-3xl font-bold text-charcoal">
            Unable to load products.
          </h1>
          <p className="mt-3 text-sm text-charcoal-light">
            Please check your connection and refresh the page.
          </p>
          <Button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 font-bold"
          >
            Retry Connection
          </Button>
        </div>
      </div>
    );
  }

  /* ----------------------------------------------------------
     Sidebar Filter Panel
     ---------------------------------------------------------- */

  const filterPanel = (
    <div className="space-y-7">
      {/* Categories */}
      <FilterGroup title="Categories">
        {categories.map((category) => (
          <CheckboxFilter
            key={category.name}
            label={`${category.name}`}
            badgeCount={category.count}
            checked={selectedCategories.includes(category.name)}
            onChange={() => toggleCategory(category.name)}
          />
        ))}
      </FilterGroup>

      {/* Materials */}
      {materials.length > 0 && (
        <FilterGroup title="Material">
          {materials.map((material) => (
            <CheckboxFilter
              key={material}
              label={material}
              checked={selectedMaterials.includes(material)}
              onChange={() => toggleMaterial(material)}
            />
          ))}
        </FilterGroup>
      )}

      {/* Price Range */}
      <FilterGroup title="Price Range">
        <div className="pt-2">
          <div className="mb-3 flex items-center justify-between text-xs font-mono font-semibold text-charcoal">
            <span>{formatPrice(minPrice)}</span>
            <span>
              {formatPrice(maxPrice)}
              {maxPrice === priceMaximum ? '+' : ''}
            </span>
          </div>

          <div className="relative h-6 flex items-center">
            {/* Slider track background */}
            <div className="absolute left-0 right-0 h-1.5 rounded-full bg-zinc-200" />

            {/* Active range track */}
            <div
              className="absolute h-1.5 rounded-full bg-brand-500"
              style={{
                left: `${(minPrice / priceMaximum) * 100}%`,
                right: `${100 - (maxPrice / priceMaximum) * 100}%`,
              }}
            />

            {/* Min Range Input */}
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

            {/* Max Range Input */}
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
      </FilterGroup>

      {/* In Stock Only */}
      <FilterGroup title="Availability">
        <CheckboxFilter
          label="In Stock Only"
          description="Ready for immediate packing"
          checked={inStockOnly}
          onChange={() => setInStockOnly((prev) => !prev)}
        />
      </FilterGroup>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#faf9f6] text-charcoal">
      {/* Slider Styles */}
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
            background: #ff6b1a;
            border: 2px solid #ffffff;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
            cursor: pointer;
            pointer-events: auto;
          }
          .catalog-range::-moz-range-thumb {
            width: 18px;
            height: 18px;
            border-radius: 9999px;
            background: #ff6b1a;
            border: 2px solid #ffffff;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
            cursor: pointer;
            pointer-events: auto;
          }
          .catalog-range:focus-visible::-webkit-slider-thumb {
            outline: 2px solid #ff6b1a;
            outline-offset: 2px;
          }
        `}
      </style>

      {/* Page Header */}
      <section className="border-b border-zinc-200/80 bg-white">
        <div className="mx-auto max-w-[1440px] px-5 py-10 sm:px-8 lg:px-10 lg:py-12">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-600">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Shop Collection</span>
              </div>

              <h1 className="mt-3 font-serif text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl text-charcoal">
                3D Printed Catalog & Creations
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-charcoal-light sm:text-base">
                Explore our curated catalog of precision-printed pieces. Have a custom STL or CAD model you want us to produce instead?{' '}
                <Link
                  to="/custom-service"
                  className="font-bold text-brand-600 underline underline-offset-4 hover:text-brand-700 transition-colors"
                >
                  Upload for Instant Quote →
                </Link>
              </p>
            </div>

            <div className="shrink-0 rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4">
              <span className="font-mono text-xs font-semibold uppercase tracking-wider text-charcoal-lighter block">
                Total Stock
              </span>
              <span className="font-serif text-2xl font-bold text-charcoal">
                {activeProducts.length} {activeProducts.length === 1 ? 'Piece' : 'Pieces'}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
        <div className="grid gap-10 lg:grid-cols-[260px_minmax(0,1fr)]">
          {/* Desktop Filter Sidebar */}
          <aside className="hidden lg:block" aria-label="Product filters">
            <div className="sticky top-28 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-brand-500" />
                  <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-charcoal">
                    Filters
                  </h2>
                </div>

                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="font-mono text-[11px] font-bold text-brand-600 hover:text-brand-700 underline"
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
              {/* Search Bar */}
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal-lighter" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search prints, materials, keywords..."
                  aria-label="Search catalog"
                  className="pl-10 pr-9 bg-white"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal-lighter hover:text-charcoal"
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Mobile Filter Sheet Button */}
              <Button
                type="button"
                variant="outline"
                className="bg-white lg:hidden font-semibold"
                onClick={() => setIsFilterOpen((prev) => !prev)}
              >
                <Filter className="mr-2 h-4 w-4 text-brand-500" />
                Filters
                {hasActiveFilters && (
                  <span className="ml-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-500 px-1 font-mono text-[10px] font-bold text-white">
                    {activeFilterChips.length}
                  </span>
                )}
              </Button>

              {/* Sort Selector */}
              <div className="flex items-center gap-2">
                <span className="hidden whitespace-nowrap font-mono text-xs font-semibold text-charcoal-lighter sm:inline">
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

            {/* Mobile Filter Drawer / Modal */}
            {isFilterOpen && (
              <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-lg lg:hidden">
                <div className="mb-6 flex items-center justify-between border-b border-zinc-100 pb-4">
                  <h3 className="font-serif text-lg font-bold text-charcoal">
                    Filter Products
                  </h3>
                  <button
                    type="button"
                    aria-label="Close filters"
                    onClick={() => setIsFilterOpen(false)}
                    className="rounded-lg p-1 text-charcoal-lighter hover:text-charcoal"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {filterPanel}

                <div className="mt-8 flex gap-3 border-t border-zinc-100 pt-5">
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

            {/* Active Filters Bar */}
            <div className="mt-5 flex flex-wrap items-center gap-2 border-b border-zinc-200 pb-4">
              <span className="mr-1 font-mono text-xs font-semibold text-charcoal-light">
                {filteredProducts.length} {filteredProducts.length === 1 ? 'result' : 'results'}
              </span>

              {activeFilterChips.map((chip, index) => (
                <button
                  key={`${chip.label}-${index}`}
                  type="button"
                  onClick={chip.remove}
                  className="group inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 font-mono text-xs font-semibold text-brand-700 hover:bg-brand-100 transition-colors"
                >
                  <span>{chip.label}</span>
                  <X className="h-3 w-3 text-brand-500 group-hover:text-brand-800" />
                </button>
              ))}

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="ml-auto font-mono text-xs font-bold text-brand-600 hover:text-brand-700 underline"
                >
                  Clear All
                </button>
              )}
            </div>

            {/* Product Cards Grid */}
            {filteredProducts.length === 0 ? (
              <div className="mt-8 rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-20 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-500">
                  <PackageSearch className="h-7 w-7" />
                </div>

                <h3 className="mt-5 font-serif text-2xl font-bold text-charcoal">
                  No products matched your filters
                </h3>

                <p className="mx-auto mt-2 max-w-md text-sm text-charcoal-light">
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
                    <Button className="font-bold">
                      <Sparkles className="mr-2 h-4 w-4" />
                      Get Custom 3D Quote
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="mt-7 grid w-full gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {filteredProducts.map((product) => (
                  <Link
                    key={product.id}
                    to={`/product/${product.id}`}
                    className="group min-w-0 w-full"
                  >
                    <Card className="flex h-full flex-col overflow-hidden transition-all duration-300 group-hover:-translate-y-1.5 group-hover:shadow-xl group-hover:border-brand-300">
                      <div className="relative overflow-hidden bg-zinc-100">
                        <img
                          src={product.image}
                          alt={product.name}
                          loading="lazy"
                          className="aspect-square w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />

                        {product.isCustomizable && (
                          <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-charcoal/85 backdrop-blur-sm px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                            <Sparkles className="h-3 w-3 text-brand-400" />
                            Personalize
                          </span>
                        )}

                        {product.featured && (
                          <span className="absolute top-3 right-3 rounded-full bg-brand-500 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
                            Featured
                          </span>
                        )}
                      </div>

                      <div className="flex flex-1 flex-col justify-between p-5">
                        <div>
                          <span className="font-mono text-[11px] font-medium uppercase tracking-wider text-charcoal-lighter">
                            {product.category || 'Workshop Item'}
                          </span>

                          <h2 className="mt-1.5 line-clamp-2 min-h-[3rem] font-serif text-lg font-bold text-charcoal group-hover:text-brand-600 transition-colors">
                            {product.name}
                          </h2>

                          {product.description && (
                            <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-charcoal-lighter">
                              {product.description}
                            </p>
                          )}
                        </div>

                        <div className="mt-5 flex items-center justify-between border-t border-zinc-100 pt-3.5">
                          <div>
                            <span className="text-[11px] text-charcoal-lighter block">Price</span>
                            <span className="font-serif text-lg font-bold text-charcoal">
                              {formatPrice(Number(product.price) || 0)}
                            </span>
                          </div>

                          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600 group-hover:bg-brand-500 group-hover:text-white transition-colors">
                            <ArrowRight className="h-4 w-4" />
                          </span>
                        </div>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            )}

            {/* Custom Print Service Promo Banner */}
            {filteredProducts.length > 0 && (
              <div className="mt-14 rounded-2xl border border-brand-500/30 bg-gradient-to-r from-brand-50 via-orange-50/50 to-white p-6 sm:p-8 shadow-sm">
                <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
                  <div className="space-y-1">
                    <span className="font-mono text-xs font-bold uppercase tracking-wider text-brand-600">
                      Looking for custom dimensions or prototypes?
                    </span>
                    <h2 className="font-serif text-2xl font-bold text-charcoal">
                      Send us your 3D CAD file for a instant estimate.
                    </h2>
                    <p className="max-w-xl text-xs text-charcoal-light sm:text-sm">
                      Upload STL/OBJ files, calculate precise weight and material volume, and get rapid fabrication within 48 hours.
                    </p>
                  </div>

                  <Link to="/custom-service" className="shrink-0">
                    <Button size="lg" className="w-full font-bold sm:w-auto shadow-md shadow-brand-500/20">
                      <Sparkles className="mr-2 h-4 w-4" />
                      Start Custom Print
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

/* ----------------------------------------------------------
   Subcomponents for Filters
   ---------------------------------------------------------- */

function FilterGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="mb-3 font-mono text-xs font-bold uppercase tracking-wider text-charcoal-lighter">
        {title}
      </h3>
      <div className="space-y-2.5">{children}</div>
    </div>
  );
}

function CheckboxFilter({
  label,
  description,
  badgeCount,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  badgeCount?: number;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-2 text-sm text-charcoal-light hover:text-charcoal transition-colors">
      <div className="flex items-start gap-2.5">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="mt-0.5 h-4 w-4 shrink-0 rounded cursor-pointer accent-brand-500"
        />
        <div className="leading-tight">
          <span className={checked ? 'font-bold text-charcoal' : 'font-medium'}>
            {label}
          </span>
          {description && (
            <span className="block text-[11px] text-charcoal-lighter mt-0.5">
              {description}
            </span>
          )}
        </div>
      </div>

      {typeof badgeCount === 'number' && (
        <span className="font-mono text-xs text-charcoal-lighter">
          {badgeCount}
        </span>
      )}
    </label>
  );
}
