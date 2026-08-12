import React, { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Filter, ChevronDown, Loader2 } from 'lucide-react';
import { useProducts } from '../../hooks/useProducts';
import { Card, Button } from '../../components/ui';

export function Catalog() {
  const { data: products = [], isLoading, isError } = useProducts();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const categoryFilter = searchParams.get('category');
  const occasionFilter = searchParams.get('occasion');
  const sortParam = searchParams.get('sort') || 'featured';
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);

  const activeProducts = useMemo(
    () => products.filter((p) => p.active !== false),
    [products]
  );

  const categories = Array.from(new Set(activeProducts.map((p) => p.category)));
  const materials = Array.from(
    new Set(activeProducts.map((p) => p.material).filter(Boolean))
  ) as string[];
  const occasions = Array.from(
    new Set(activeProducts.map((p) => p.occasion).filter(Boolean))
  ) as string[];

  const filteredProducts = useMemo(() => {
    let result = [...activeProducts];

    if (categoryFilter) {
      result = result.filter((p) => p.category === categoryFilter);
    }
    if (occasionFilter) {
      result = result.filter((p) => p.occasion === occasionFilter);
    }
    if (minPrice) {
      result = result.filter((p) => p.price >= parseInt(minPrice, 10));
    }
    if (maxPrice) {
      result = result.filter((p) => p.price <= parseInt(maxPrice, 10));
    }
    if (selectedMaterials.length > 0) {
      result = result.filter(
        (p) => p.material && selectedMaterials.includes(p.material)
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
        // newest first (assuming later documents are newer)
        break;
      default:
        result.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
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

  const handleCategoryChange = (category: string | null) => {
    if (category) {
      searchParams.set('category', category);
    } else {
      searchParams.delete('category');
    }
    setSearchParams(searchParams);
  };

  const handleOccasionChange = (occasion: string | null) => {
    if (occasion) {
      searchParams.set('occasion', occasion);
    } else {
      searchParams.delete('occasion');
    }
    setSearchParams(searchParams);
  };

  const handleMaterialToggle = (material: string) => {
    setSelectedMaterials((prev) =>
      prev.includes(material)
        ? prev.filter((m) => m !== material)
        : [...prev, material]
    );
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    searchParams.set('sort', e.target.value);
    setSearchParams(searchParams);
  };

  const clearFilters = () => {
    searchParams.delete('category');
    searchParams.delete('occasion');
    setSearchParams(searchParams);
    setMinPrice('');
    setMaxPrice('');
    setSelectedMaterials([]);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-20 text-red-600">
        Failed to load products. Please try again later.
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 pb-8 border-b border-brand-200">
        <div>
          <h1 className="text-4xl font-serif font-bold text-charcoal mb-2">
            {categoryFilter ? categoryFilter : 'All Products'}
          </h1>
          <p className="text-charcoal-light">
            {filteredProducts.length}{' '}
            {filteredProducts.length === 1 ? 'product' : 'products'} found
          </p>
        </div>

        <div className="mt-6 md:mt-0 flex items-center space-x-4">
          <button
            className="md:hidden flex items-center text-charcoal font-medium"
            onClick={() => setIsFilterOpen(!isFilterOpen)}
          >
            <Filter className="w-5 h-5 mr-2" />
            Filters
          </button>

          <div className="relative hidden md:flex items-center">
            <span className="text-sm text-charcoal-light mr-3">Sort by:</span>
            <select
              value={sortParam}
              onChange={handleSortChange}
              className="appearance-none bg-white border border-brand-200 rounded-lg py-2 pl-4 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 text-charcoal font-medium"
            >
              <option value="featured">Featured</option>
              <option value="newest">Newest Arrivals</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
            </select>
            <ChevronDown className="w-4 h-4 text-charcoal-light absolute right-3 pointer-events-none" />
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar Filters */}
        <aside
          className={`md:w-64 flex-shrink-0 ${
            isFilterOpen ? 'block' : 'hidden md:block'
          }`}
        >
          <div className="sticky top-28 space-y-8">
            <div>
              <h3 className="font-serif font-semibold text-charcoal mb-4">
                Categories
              </h3>
              <ul className="space-y-3">
                <li>
                  <button
                    onClick={() => handleCategoryChange(null)}
                    className={`text-sm w-full text-left transition-colors ${
                      !categoryFilter
                        ? 'text-brand-600 font-medium'
                        : 'text-charcoal-light hover:text-brand-500'
                    }`}
                  >
                    All Products
                  </button>
                </li>
                {categories.map((cat) => (
                  <li key={cat}>
                    <button
                      onClick={() => handleCategoryChange(cat)}
                      className={`text-sm w-full text-left transition-colors ${
                        categoryFilter === cat
                          ? 'text-brand-600 font-medium'
                          : 'text-charcoal-light hover:text-brand-500'
                      }`}
                    >
                      {cat}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Other filters (Occasion, Price, Material) can stay the same as before */}
          </div>
        </aside>

        {/* Product Grid */}
        <div className="flex-1">
          {filteredProducts.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-brand-100">
              <p className="text-charcoal-light text-lg">
                No products found matching your criteria.
              </p>
              <Button variant="outline" className="mt-6" onClick={clearFilters}>
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
                    <div className="p-5 flex flex-col flex-grow">
                      <p className="text-xs text-charcoal-lighter mb-2 uppercase tracking-wider">
                        {product.category}
                      </p>
                      <h3 className="font-serif font-semibold text-charcoal text-lg mb-2 line-clamp-2 group-hover:text-brand-500 transition-colors flex-grow">
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