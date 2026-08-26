import {
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  Filter,
  PackageSearch,
  Search,
  X,
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

const PRICE_STEP = 500;

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

  const [searchParams, setSearchParams] =
    useSearchParams();

  const [isFilterOpen, setIsFilterOpen] =
    useState(false);

  const [searchQuery, setSearchQuery] =
    useState('');

  const [selectedMaterials, setSelectedMaterials] =
    useState<string[]>([]);

  const [inStockOnly, setInStockOnly] =
    useState(false);

  const [minPrice, setMinPrice] =
    useState(0);

  const [maxPrice, setMaxPrice] =
    useState(15000);

  const selectedCategories = useMemo(() => {
    const param = searchParams.get('category');
    if (!param) return [];
    return param.split(',').map((c) => decodeURIComponent(c.trim())).filter(Boolean);
  }, [searchParams]);

  const occasionFilter =
    searchParams.get('occasion');

  const sortParam =
    (searchParams.get('sort') as SortOption) ||
    'featured';

  /*
   * =========================================================
   * ACTIVE PRODUCTS
   * =========================================================
   */

  const activeProducts = useMemo(
    () =>
      products.filter(
        (product) => product.active !== false
      ),
    [products]
  );

  /*
   * =========================================================
   * PRICE RANGE
   * =========================================================
   */

  const priceMaximum = useMemo(() => {
    const highestProductPrice =
      activeProducts.reduce(
        (highest, product) =>
          Math.max(
            highest,
            Number(product.price) || 0
          ),
        0
      );

    return getPriceCeiling(
      highestProductPrice
    );
  }, [activeProducts]);

  useEffect(() => {
    setMinPrice(0);
    setMaxPrice(priceMaximum);
  }, [priceMaximum]);

  /*
   * =========================================================
   * FILTER OPTIONS
   * =========================================================
   */

  const categories = useMemo(() => {
    const counts = new Map<
      string,
      number
    >();

    activeProducts.forEach((product) => {
      if (!product.category) {
        return;
      }

      counts.set(
        product.category,
        (counts.get(product.category) || 0) + 1
      );
    });

    return Array.from(counts.entries()).map(
      ([name, count]) => ({
        name,
        count,
      })
    );
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


  /*
   * =========================================================
   * FILTERING + SORTING
   * =========================================================
   */

  const filteredProducts = useMemo(() => {
    let result = [...activeProducts];

    const query =
      searchQuery.trim().toLowerCase();

    /*
     * Search
     */
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

    /*
     * Category (multi-select supported)
     */
    if (selectedCategories.length > 0) {
      result = result.filter(
        (product) =>
          product.category &&
          selectedCategories.includes(product.category)
      );
    }

    /*
     * Occasion
     */
    if (occasionFilter) {
      result = result.filter(
        (product) =>
          product.occasion === occasionFilter
      );
    }

    /*
     * Material
     */
    if (selectedMaterials.length > 0) {
      result = result.filter(
        (product) =>
          product.material &&
          selectedMaterials.includes(
            product.material
          )
      );
    }

    /*
     * Price range
     */
    result = result.filter((product) => {
      const price =
        Number(product.price) || 0;

      return (
        price >= minPrice &&
        price <= maxPrice
      );
    });

    /*
     * Availability
     *
     * Product stock is the current source of truth.
     * stock > 0 = in stock.
     */
    if (inStockOnly) {
      result = result.filter(
        (product) =>
          Number(product.stock) > 0
      );
    }

    /*
     * Sorting
     */
    switch (sortParam) {
      case 'price-low':
        result.sort(
          (a, b) =>
            (Number(a.price) || 0) -
            (Number(b.price) || 0)
        );
        break;

      case 'price-high':
        result.sort(
          (a, b) =>
            (Number(b.price) || 0) -
            (Number(a.price) || 0)
        );
        break;

      case 'newest':
        /*
         * The current Product model does not contain
         * a reliable createdAt field, so we preserve
         * Firebase's existing product order here.
         */
        break;

      case 'featured':
      default:
        result.sort(
          (a, b) =>
            Number(Boolean(b.featured)) -
            Number(Boolean(a.featured))
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

  /*
   * =========================================================
   * URL FILTER HELPERS
   * =========================================================
   */

  const updateSearchParam = (
    key: string,
    value: string | null
  ) => {
    const nextParams = new URLSearchParams(
      searchParams
    );

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

  const handleOccasionChange = (
    occasion: string | null
  ) => {
    updateSearchParam(
      'occasion',
      occasion
    );
  };

  const handleSortChange = (
    value: string
  ) => {
    updateSearchParam(
      'sort',
      value
    );
  };

  /*
   * =========================================================
   * MATERIAL FILTER
   * =========================================================
   */

  const toggleMaterial = (
    material: string
  ) => {
    setSelectedMaterials((current) =>
      current.includes(material)
        ? current.filter(
            (item) => item !== material
          )
        : [...current, material]
    );
  };

  /*
   * =========================================================
   * PRICE SLIDER
   * =========================================================
   */

  const handleMinPriceChange = (
    value: number
  ) => {
    const nextValue = Math.min(
      value,
      maxPrice - PRICE_STEP
    );

    setMinPrice(
      Math.max(0, nextValue)
    );
  };

  const handleMaxPriceChange = (
    value: number
  ) => {
    const nextValue = Math.max(
      value,
      minPrice + PRICE_STEP
    );

    setMaxPrice(
      Math.min(priceMaximum, nextValue)
    );
  };

  /*
   * =========================================================
   * CLEAR FILTERS
   * =========================================================
   */

  const clearFilters = () => {
    const nextParams = new URLSearchParams(
      searchParams
    );

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

  /*
   * =========================================================
   * ACTIVE FILTER CHIPS
   * =========================================================
   */

  const activeFilterChips = useMemo(() => {
    const chips: Array<{
      label: string;
      remove: () => void;
    }> = [];

    selectedCategories.forEach((category) => {
      chips.push({
        label: category,
        remove: () => toggleCategory(category),
      });
    });

    if (occasionFilter) {
      chips.push({
        label: occasionFilter,
        remove: () =>
          handleOccasionChange(null),
      });
    }

    selectedMaterials.forEach(
      (material) => {
        chips.push({
          label: material,
          remove: () =>
            toggleMaterial(material),
        });
      }
    );

    if (minPrice > 0) {
      chips.push({
        label: `From ${formatPrice(minPrice)}`,
        remove: () => setMinPrice(0),
      });
    }

    if (maxPrice < priceMaximum) {
      chips.push({
        label: `Up to ${formatPrice(maxPrice)}`,
        remove: () =>
          setMaxPrice(priceMaximum),
      });
    }

    if (inStockOnly) {
      chips.push({
        label: 'In stock',
        remove: () =>
          setInStockOnly(false),
      });
    }

    if (searchQuery.trim()) {
      chips.push({
        label: `"${searchQuery.trim()}"`,
        remove: () =>
          setSearchQuery(''),
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

  const hasActiveFilters =
    activeFilterChips.length > 0;

  /*
   * =========================================================
   * LOADING STATE
   * =========================================================
   */

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f7f4ee]">
        <div className="mx-auto max-w-[1440px] px-5 py-14 sm:px-8 lg:px-10 lg:py-20">
          <div className="max-w-2xl">
            <div className="ss-skeleton h-2.5 w-20 bg-[#ded8ce]" aria-hidden="true" />
            <div className="ss-skeleton mt-4 h-11 w-64 bg-[#ded8ce]" aria-hidden="true" />
            <div className="ss-skeleton mt-4 h-4 w-full max-w-xl bg-[#ded8ce]" aria-hidden="true" />
            <div className="ss-skeleton mt-2 h-4 w-4/5 max-w-lg bg-[#ded8ce]" aria-hidden="true" />
          </div>

          <div
            className="mt-12"
            role="status"
            aria-label="Loading collection"
          >
            <ProductGridSkeleton count={8} />
          </div>
        </div>
      </div>
    );
  }

  /*
   * =========================================================
   * ERROR STATE
   * =========================================================
   */

  if (isError) {
    return (
      <div className="min-h-[60vh] bg-[#f7f4ee]">
        <div className="mx-auto flex min-h-[60vh] max-w-2xl items-center justify-center px-5 text-center">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#b4491e]">
              Collection unavailable
            </p>

            <h1 className="mt-3 font-serif text-4xl font-semibold tracking-[-0.035em]">
              We couldn't load the products.
            </h1>

            <p className="mt-4 text-sm leading-6 text-[#746c63]">
              Please refresh the page and try again.
            </p>

            <Button
              type="button"
              onClick={() =>
                window.location.reload()
              }
              className="mt-7 bg-[#171512] hover:bg-[#2b2824]"
            >
              Try again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  /*
   * =========================================================
   * FILTER PANEL
   * =========================================================
   */

  const filterPanel = (
    <div className="space-y-8">

      {/* Category */}
      <FilterGroup title="Category">
        {categories.map((category) => (
          <CheckboxFilter
            key={category.name}
            label={`${category.name} (${category.count})`}
            checked={selectedCategories.includes(category.name)}
            onChange={() => toggleCategory(category.name)}
          />
        ))}
      </FilterGroup>

      {/* Material */}
      {materials.length > 0 && (
        <FilterGroup title="Material">
          {materials.map((material) => (
            <CheckboxFilter
              key={material}
              label={material}
              checked={selectedMaterials.includes(
                material
              )}
              onChange={() =>
                toggleMaterial(material)
              }
            />
          ))}
        </FilterGroup>
      )}

      {/* Price */}
      <FilterGroup title="Price">
        <div className="pt-1">

          <div className="mb-3 flex items-center justify-between">
            <span className="font-mono text-[10px] text-[#746c63]">
              {formatPrice(minPrice)}
            </span>

            <span className="font-mono text-[10px] text-[#746c63]">
              {formatPrice(priceMaximum)}
              {maxPrice === priceMaximum
                ? '+'
                : ''}
            </span>
          </div>

          {/* Dual range slider */}
          <div className="relative h-6">

            {/* Base track */}
            <div className="absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 bg-[#d8d1c7]" />

            {/* Selected range */}
            <div
              className="absolute top-1/2 h-1 -translate-y-1/2 bg-[#b4491e]"
              style={{
                left: `${
                  (minPrice /
                    priceMaximum) *
                  100
                }%`,
                right: `${
                  100 -
                  (maxPrice /
                    priceMaximum) *
                    100
                }%`,
              }}
            />

            {/* Minimum slider */}
            <input
              type="range"
              min={0}
              max={priceMaximum}
              step={PRICE_STEP}
              value={minPrice}
              onChange={(event) =>
                handleMinPriceChange(
                  Number(event.target.value)
                )
              }
              aria-label="Minimum price"
              className="catalog-range absolute inset-0 z-20 h-6 w-full cursor-pointer appearance-none bg-transparent"
            />

            {/* Maximum slider */}
            <input
              type="range"
              min={0}
              max={priceMaximum}
              step={PRICE_STEP}
              value={maxPrice}
              onChange={(event) =>
                handleMaxPriceChange(
                  Number(event.target.value)
                )
              }
              aria-label="Maximum price"
              className="catalog-range pointer-events-none absolute inset-0 z-30 h-6 w-full appearance-none bg-transparent"
            />
          </div>

          <div className="mt-2 flex justify-between">
            <span className="text-[10px] text-[#8d847a]">
              {formatPrice(minPrice)}
            </span>

            <span className="text-[10px] text-[#8d847a]">
              {formatPrice(maxPrice)}
              {maxPrice === priceMaximum
                ? '+'
                : ''}
            </span>
          </div>
        </div>
      </FilterGroup>

      {/* Availability */}
      <FilterGroup title="Availability">
        <CheckboxFilter
          label="In stock only"
          description="Excludes made-to-order pieces"
          checked={inStockOnly}
          onChange={() =>
            setInStockOnly(
              (current) => !current
            )
          }
        />
      </FilterGroup>
    </div>
  );

  /*
   * =========================================================
   * PAGE
   * =========================================================
   */

  return (
    <div className="min-h-screen bg-[#f7f4ee] text-[#171512]">

      {/* =====================================================
          PRICE SLIDER STYLES
      ====================================================== */}

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
            background: #ffffff;
            border: 1px solid #bdb5aa;
            box-shadow: 0 1px 4px rgba(23, 21, 18, 0.16);
            cursor: pointer;
            pointer-events: auto;
          }

          .catalog-range::-moz-range-thumb {
            width: 18px;
            height: 18px;
            border-radius: 9999px;
            background: #ffffff;
            border: 1px solid #bdb5aa;
            box-shadow: 0 1px 4px rgba(23, 21, 18, 0.16);
            cursor: pointer;
            pointer-events: auto;
          }

          .catalog-range:focus-visible::-webkit-slider-thumb {
            outline: 2px solid #b4491e;
            outline-offset: 2px;
          }

          .catalog-range:focus-visible::-moz-range-thumb {
            outline: 2px solid #b4491e;
            outline-offset: 2px;
          }
        `}
      </style>

      {/* =====================================================
          PAGE HEADER
      ====================================================== */}

      <section className="border-b border-[#ded8ce] bg-white">
        <div className="mx-auto max-w-[1440px] px-5 py-10 sm:px-8 lg:px-10 lg:py-14">

          <div className="flex flex-col justify-between gap-7 lg:flex-row lg:items-end">

            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#b4491e]">
                Catalogue
              </p>

              <h1 className="mt-3 max-w-3xl font-serif text-4xl font-semibold leading-[1] tracking-[-0.04em] sm:text-5xl lg:text-6xl">
                Finished prints, ready to ship
              </h1>

              <p className="mt-5 max-w-2xl text-sm leading-7 text-[#746c63]">
                Explore pieces designed and printed by
                Shilp Sahayak. Looking for custom
                geometry?{' '}
                <Link
                  to="/custom-service"
                  className="font-medium text-[#171512] underline decoration-[#b4491e] underline-offset-4 transition-colors hover:text-[#b4491e]"
                >
                  Start a custom print
                </Link>
                .
              </p>
            </div>

            <div className="shrink-0 border-l-2 border-[#b4491e] pl-4">
              <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-[#8d847a]">
                Collection
              </p>

              <p className="mt-1 font-serif text-xl font-semibold">
                {activeProducts.length}{' '}
                {activeProducts.length === 1
                  ? 'piece'
                  : 'pieces'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          CATALOG
      ====================================================== */}

      <main className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8 lg:px-10 lg:py-10">

        <div className="grid gap-10 lg:grid-cols-[240px_minmax(0,1fr)]">

          {/* =================================================
              DESKTOP SIDEBAR
          ================================================== */}

          <aside
            className="hidden lg:block"
            aria-label="Product filters"
          >
            <div className="sticky top-28">

              <div className="flex items-center justify-between border-b border-[#171512] pb-3">
                <h2 className="font-mono text-[10px] uppercase tracking-[0.15em]">
                  Filters
                </h2>

                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="font-mono text-[9px] uppercase tracking-[0.1em] text-[#b4491e] underline underline-offset-4 hover:text-[#171512]"
                  >
                    Clear all
                  </button>
                )}
              </div>

              <div className="pt-7">
                {filterPanel}
              </div>
            </div>
          </aside>

          {/* =================================================
              PRODUCT AREA
          ================================================== */}

          <section>

            {/* Search + Sort */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">

              <div className="relative min-w-0 flex-1">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8d847a]"
                  aria-hidden="true"
                />

                <Input
                  value={searchQuery}
                  onChange={(event) =>
                    setSearchQuery(
                      event.target.value
                    )
                  }
                  placeholder="Search prints, materials, categories"
                  aria-label="Search products"
                  className="h-11 border-[#d8d1c7] bg-white pl-10"
                />
              </div>

              <Button
                type="button"
                variant="outline"
                className="border-[#d8d1c7] bg-white lg:hidden"
                onClick={() =>
                  setIsFilterOpen(
                    (current) => !current
                  )
                }
              >
                <Filter
                  className="mr-2 h-4 w-4"
                  aria-hidden="true"
                />

                Filters

                {hasActiveFilters && (
                  <span className="ml-2 flex h-5 min-w-5 items-center justify-center bg-[#171512] px-1.5 font-mono text-[9px] text-white">
                    {activeFilterChips.length}
                  </span>
                )}
              </Button>

              <div className="flex items-center gap-3">
                <label
                  className="hidden whitespace-nowrap font-mono text-[9px] uppercase tracking-[0.12em] text-[#8d847a] sm:block"
                >
                  Sort
                </label>

                <Select
                  value={sortParam}
                  onChange={handleSortChange}
                  className="h-11 w-full border-[#d8d1c7] bg-white sm:w-[190px]"
                  options={[
                    {
                      value: 'featured',
                      label: 'Featured first',
                    },
                    {
                      value: 'newest',
                      label: 'Newest arrivals',
                    },
                    {
                      value: 'price-low',
                      label: 'Price: Low to High',
                    },
                    {
                      value: 'price-high',
                      label: 'Price: High to Low',
                    },
                  ]}
                />
              </div>
            </div>

            {/* =================================================
                MOBILE FILTER PANEL
            ================================================== */}

            {isFilterOpen && (
              <div className="mt-4 border border-[#d8d1c7] bg-white p-5 lg:hidden">

                <div className="mb-6 flex items-center justify-between border-b border-[#e7e1d8] pb-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em]">
                    Filter collection
                  </p>

                  <button
                    type="button"
                    aria-label="Close filters"
                    onClick={() =>
                      setIsFilterOpen(false)
                    }
                    className="text-[#746c63] hover:text-[#171512]"
                  >
                    <X
                      className="h-4 w-4"
                      aria-hidden="true"
                    />
                  </button>
                </div>

                {filterPanel}

                <div className="mt-7 flex gap-3 border-t border-[#e7e1d8] pt-5">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={clearFilters}
                    className="flex-1"
                  >
                    Clear filters
                  </Button>

                  <Button
                    type="button"
                    onClick={() =>
                      setIsFilterOpen(false)
                    }
                    className="flex-1 bg-[#171512] hover:bg-[#2b2824]"
                  >
                    Apply
                  </Button>
                </div>
              </div>
            )}

            {/* =================================================
                RESULT SUMMARY
            ================================================== */}

            <div className="mt-5 flex flex-wrap items-center gap-2 border-b border-[#ded8ce] pb-5">

              <p className="mr-2 font-mono text-[9px] uppercase tracking-[0.11em] text-[#8d847a]">
                {filteredProducts.length}{' '}
                {filteredProducts.length === 1
                  ? 'product'
                  : 'products'}
              </p>

              {activeFilterChips.map(
                (chip, index) => (
                  <button
                    key={`${chip.label}-${index}`}
                    type="button"
                    onClick={chip.remove}
                    className="inline-flex items-center gap-1.5 border border-[#d2cbc1] bg-white px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-[0.06em] text-[#625b53] transition-colors hover:border-[#171512] hover:text-[#171512]"
                  >
                    {chip.label}

                    <X
                      className="h-3 w-3"
                      aria-hidden="true"
                    />
                  </button>
                )
              )}

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="ml-auto font-mono text-[9px] uppercase tracking-[0.08em] text-[#b4491e] underline underline-offset-4 hover:text-[#171512]"
                >
                  Clear all
                </button>
              )}
            </div>

            {/* =================================================
                PRODUCT GRID
            ================================================== */}

            {filteredProducts.length === 0 ? (
              <div className="mt-8 border border-dashed border-[#d4cdc2] bg-white px-6 py-20 text-center">

                <div className="mx-auto flex h-12 w-12 items-center justify-center border border-[#d4cdc2] text-[#b4491e]">
                  <PackageSearch
                    className="h-5 w-5"
                    aria-hidden="true"
                  />
                </div>

                <p className="mt-5 font-serif text-2xl font-semibold">
                  Nothing matches those filters.
                </p>

                <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#746c63]">
                  Try adjusting your filters, or send
                  us the geometry for a custom print.
                </p>

                <div className="mt-7 flex flex-wrap justify-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={clearFilters}
                  >
                    Clear filters
                  </Button>

                  <Link to="/custom-service">
                    <Button className="bg-[#171512] hover:bg-[#2b2824]">
                      Start a custom print
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="mt-7 grid w-full gap-5 sm:grid-cols-2 xl:grid-cols-3">

                {filteredProducts.map(
                  (product) => (
                    <Link
  key={product.id}
  to={`/product/${product.id}`}
  className="group min-w-0 w-full"
>
                      <Card className="h-full overflow-hidden rounded-none border-[#ded8ce] bg-white shadow-none transition-shadow duration-300 hover:shadow-[0_12px_35px_rgba(23,21,18,0.08)]">

                        <div className="relative overflow-hidden bg-[#e8e2d8]">

                          <img
                            src={product.image}
                            alt={product.name}
                            loading="lazy"
                            className="aspect-square w-full object-cover transition-transform duration-700 group-hover:scale-[1.035]"
                          />

                          {product.isCustomizable && (
                            <span className="absolute left-3 top-3 border border-white/20 bg-[#171512]/85 px-2.5 py-1.5 font-mono text-[8px] uppercase tracking-[0.12em] text-white backdrop-blur-sm">
                              Personalise
                            </span>
                          )}

                          {product.featured && (
                            <span className="absolute right-3 top-3 border border-white/20 bg-white/90 px-2.5 py-1.5 font-mono text-[8px] uppercase tracking-[0.12em] text-[#171512] backdrop-blur-sm">
                              Featured
                            </span>
                          )}
                        </div>

                        <div className="flex flex-col p-5">

                          <p className="font-mono text-[9px] uppercase tracking-[0.13em] text-[#958c81]">
                            {product.category}
                          </p>

                          <h2 className="mt-2 line-clamp-2 min-h-[3rem] font-serif text-lg font-semibold leading-snug transition-colors group-hover:text-[#b4491e]">
                            {product.name}
                          </h2>

                          {product.description && (
                            <p className="mt-2 line-clamp-2 text-xs leading-5 text-[#8d847a]">
                              {product.description}
                            </p>
                          )}

                          <div className="mt-5 flex items-center justify-between border-t border-[#ebe6dc] pt-4">

                            <p className="font-medium text-[#b4491e]">
                              {formatPrice(
                                Number(
                                  product.price
                                ) || 0
                              )}
                            </p>

                            <span className="flex items-center gap-1.5 text-xs font-medium text-[#746c63] transition-colors group-hover:text-[#b4491e]">
                              View details
                              <span
                                aria-hidden="true"
                                className="transition-transform group-hover:translate-x-1"
                              >
                                →
                              </span>
                            </span>
                          </div>
                        </div>
                      </Card>
                    </Link>
                  )
                )}
              </div>
            )}

            {/* =================================================
                CUSTOM PRINT CTA
            ================================================== */}

            {filteredProducts.length > 0 && (
              <div className="mt-12 border border-[#ded8ce] bg-[#ebe5db] p-6 sm:p-8">
                <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">

                  <div>
                    <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-[#b4491e]">
                      Can't find what you need?
                    </p>

                    <h2 className="mt-2 font-serif text-2xl font-semibold">
                      Send us your own 3D model.
                    </h2>

                    <p className="mt-2 max-w-xl text-sm leading-6 text-[#746c63]">
                      Upload your STL and request a
                      custom quote from the Shilp Sahayak
                      team.
                    </p>
                  </div>

                  <Link
                    to="/custom-service"
                    className="shrink-0"
                  >
                    <Button className="w-full bg-[#171512] hover:bg-[#2b2824] sm:w-auto">
                      Custom print service
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

/*
 * =========================================================
 * FILTER GROUP
 * =========================================================
 */

function FilterGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="mb-4 font-mono text-[9px] uppercase tracking-[0.14em] text-[#8d847a]">
        {title}
      </h3>

      <div className="space-y-3">
        {children}
      </div>
    </div>
  );
}

/*
 * =========================================================
 * CHECKBOX FILTER
 * =========================================================
 */

function CheckboxFilter({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 text-sm text-[#625b53]">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[#b4491e]"
      />

      <span className="leading-5">
        <span
          className={
            checked
              ? 'font-medium text-[#171512]'
              : ''
          }
        >
          {label}
        </span>

        {description && (
          <span className="block text-[10px] leading-4 text-[#958c81]">
            {description}
          </span>
        )}
      </span>
    </label>
  );
}
