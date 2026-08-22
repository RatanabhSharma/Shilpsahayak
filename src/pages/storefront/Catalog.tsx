import React, { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Filter, Loader2 } from 'lucide-react';

import { useProducts } from '../../hooks/useProducts';
import {
  Card,
  Button,
  Select
} from '../../components/ui';

export function Catalog() {
  const {
    data: products = [],
    isLoading,
    isError
  } = useProducts();

  const [searchParams, setSearchParams] = useSearchParams();
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const categoryFilter = searchParams.get('category');
  const occasionFilter = searchParams.get('occasion');
  const sortParam = searchParams.get('sort') || 'featured';

  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);

  /* =========================================================
     Active Products
  ========================================================= */

  const activeProducts = useMemo(
    () => products.filter((p) => p.active !== false),
    [products]
  );

  /* =========================================================
     Filter Options
  ========================================================= */

  const categories = Array.from(
    new Set(activeProducts.map((p) => p.category))
  );

  const materials = Array.from(
    new Set(
      activeProducts
        .map((p) => p.material)
        .filter(Boolean)
    )
  ) as string[];

  const occasions = Array.from(
    new Set(
      activeProducts
        .map((p) => p.occasion)
        .filter(Boolean)
    )
  ) as string[];

  /* =========================================================
     Filtering + Sorting
  ========================================================= */

  const filteredProducts = useMemo(() => {
    let result = [...activeProducts];

    if (categoryFilter) {
      result = result.filter(
        (p) => p.category === categoryFilter
      );
    }

    if (occasionFilter) {
      result = result.filter(
        (p) => p.occasion === occasionFilter
      );
    }

    if (minPrice) {
      result = result.filter(
        (p) => p.price >= parseInt(minPrice, 10)
      );
    }

    if (maxPrice) {
      result = result.filter(
        (p) => p.price <= parseInt(maxPrice, 10)
      );
    }

    if (selectedMaterials.length > 0) {
      result = result.filter(
        (p) =>
          p.material &&
          selectedMaterials.includes(p.material)
      );
    }

    switch (sortParam) {
      case 'price-low':
        result.sort((a, b) => a.price - b.price);
        break;

      case 'price-high':
        result.sort((a, b) => b.price - a.price);
        break;

      case 'newest':
        // Newest first.
        // Current product data does not provide
        // a reliable createdAt field here.
        break;

      case 'featured':
      default:
        result.sort(
          (a, b) =>
            (b.featured ? 1 : 0) -
            (a.featured ? 1 : 0)
        );
        break;
    }

    return result;
  }, [
    activeProducts,
    categoryFilter,
    occasionFilter,
    minPrice,
    maxPrice,
    selectedMaterials,
    sortParam
  ]);

  /* =========================================================
     Category Filter
  ========================================================= */

  const handleCategoryChange = (
    category: string | null
  ) => {
    const nextParams = new URLSearchParams(searchParams);

    if (category) {
      nextParams.set('category', category);
    } else {
      nextParams.delete('category');
    }

    setSearchParams(nextParams);
  };

  /* =========================================================
     Occasion Filter
  ========================================================= */

  const handleOccasionChange = (
    occasion: string | null
  ) => {
    const nextParams = new URLSearchParams(searchParams);

    if (occasion) {
      nextParams.set('occasion', occasion);
    } else {
      nextParams.delete('occasion');
    }

    setSearchParams(nextParams);
  };

  /* =========================================================
     Material Filter
  ========================================================= */

  const handleMaterialToggle = (
    material: string
  ) => {
    setSelectedMaterials((prev) =>
      prev.includes(material)
        ? prev.filter((m) => m !== material)
        : [...prev, material]
    );
  };

  /* =========================================================
     Sort
  ========================================================= */

  const handleSortChange = (value: string) => {
    const nextParams = new URLSearchParams(searchParams);

    nextParams.set('sort', value);

    setSearchParams(nextParams);
  };

  /* =========================================================
     Clear Filters
  ========================================================= */

  const clearFilters = () => {
    const nextParams = new URLSearchParams(searchParams);

    nextParams.delete('category');
    nextParams.delete('occasion');

    setSearchParams(nextParams);

    setMinPrice('');
    setMaxPrice('');
    setSelectedMaterials([]);
  };

  /* =========================================================
     Loading
  ========================================================= */

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    );
  }

  /* =========================================================
     Error
  ========================================================= */

  if (isError) {
    return (
      <div className="text-center py-20 text-red-600">
        Failed to load products. Please try again later.
      </div>
    );
  }

  /* =========================================================
     Page
  ========================================================= */

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

      {/* =====================================================
          Header
      ===================================================== */}

      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 pb-8 border-b border-brand-200">

        <div>
          <h1 className="text-4xl font-serif font-bold text-charcoal mb-2">
            {categoryFilter || 'All Products'}
          </h1>

          <p className="text-charcoal-light">
            {filteredProducts.length}{' '}
            {filteredProducts.length === 1
              ? 'product'
              : 'products'}{' '}
            found
          </p>
        </div>

        <div className="mt-6 md:mt-0 flex items-center space-x-4">

          {/* Mobile Filters */}

          <button
            type="button"
            className="md:hidden flex items-center text-charcoal font-medium transition-all duration-200 ease-out hover:text-brand-500"
            onClick={() =>
              setIsFilterOpen((prev) => !prev)
            }
          >
            <Filter className="w-5 h-5 mr-2" />
            Filters
          </button>

          {/* Sort */}

          <div className="relative hidden md:flex items-center">

            <span className="text-sm text-charcoal-light mr-3">
              Sort by:
            </span>

            <Select
              value={sortParam}
              onChange={handleSortChange}
              className="w-56"
              options={[
                {
                  value: 'featured',
                  label: 'Featured'
                },
                {
                  value: 'newest',
                  label: 'Newest Arrivals'
                },
                {
                  value: 'price-low',
                  label: 'Price: Low to High'
                },
                {
                  value: 'price-high',
                  label: 'Price: High to Low'
                }
              ]}
            />

          </div>

        </div>
      </div>

      {/* =====================================================
          Main Content
      ===================================================== */}

      <div className="flex flex-col md:flex-row gap-8">

        {/* ===================================================
            Sidebar Filters
        =================================================== */}

        <aside
          className={`md:w-64 flex-shrink-0 ${
            isFilterOpen
              ? 'block'
              : 'hidden md:block'
          }`}
        >

          <div className="sticky top-28 space-y-8">

            {/* Categories */}

            <div>
              <h3 className="font-serif font-semibold text-charcoal mb-4">
                Categories
              </h3>

              <ul className="space-y-3">

                <li>
                  <button
                    type="button"
                    onClick={() =>
                      handleCategoryChange(null)
                    }
                    className={`text-sm w-full text-left transition-all duration-200 ease-out ${
                      !categoryFilter
                        ? 'text-brand-600 font-medium'
                        : 'text-charcoal-light hover:text-brand-500'
                    }`}
                  >
                    All Products
                  </button>
                </li>

                {categories.map((category) => (
                  <li key={category}>
                    <button
                      type="button"
                      onClick={() =>
                        handleCategoryChange(category)
                      }
                      className={`text-sm w-full text-left transition-all duration-200 ease-out ${
                        categoryFilter === category
                          ? 'text-brand-600 font-medium'
                          : 'text-charcoal-light hover:text-brand-500'
                      }`}
                    >
                      {category}
                    </button>
                  </li>
                ))}

              </ul>
            </div>

            {/* 
              Other filters can be added here:
              - Occasion
              - Price
              - Material
            */}

          </div>
        </aside>

        {/* ===================================================
            Product Grid
        =================================================== */}

        <div className="flex-1">

          {filteredProducts.length === 0 ? (

            <div className="text-center py-20 bg-white rounded-2xl border border-brand-100">

              <p className="text-charcoal-light text-lg">
                No products found matching your criteria.
              </p>

              <Button
                variant="outline"
                className="mt-6"
                onClick={clearFilters}
              >
                Clear Filters
              </Button>

            </div>

          ) : (

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">

              {filteredProducts.map((product) => (

                <Link
                  key={product.id}
                  to={`/product/${product.id}`}
                  className="group block"
                >

                  <Card className="h-full border-transparent hover:border-brand-200 transition-all duration-300 hover:shadow-xl flex flex-col">

                    {/* Product Image */}

                    <div className="relative aspect-square overflow-hidden bg-surface-dark">

                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                      />

                      {product.isCustomizable && (
                        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-full text-[10px] font-bold text-brand-600 uppercase tracking-wider">
                          Personalise
                        </div>
                      )}

                    </div>

                    {/* Product Information */}

                    <div className="p-5 flex flex-col flex-grow">

                      <p className="text-xs text-charcoal-lighter mb-2 uppercase tracking-wider">
                        {product.category}
                      </p>

                      <h3 className="font-serif font-semibold text-charcoal text-lg mb-2 line-clamp-2 group-hover:text-brand-500 transition-colors">
                        {product.name}
                      </h3>

                      <div className="flex items-center justify-between mt-4">

                        <p className="text-brand-600 font-medium text-lg">
                          ₹{product.price.toLocaleString('en-IN')}
                        </p>

                        <span className="text-sm font-medium text-charcoal-light group-hover:text-brand-500 transition-colors">
                          View Details
                        </span>

                      </div>

                    </div>

                  </Card>

                </Link>

              ))}

            </div>

          )}

        </div>

      </div>

    </div>
  );
}