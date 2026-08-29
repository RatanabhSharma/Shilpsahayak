import React, { useState } from 'react';
import { Plus, Pencil, Trash2, Loader2, X, Upload } from 'lucide-react';
import {
  useProducts,
  useAddProduct,
  useUpdateProduct,
  useDeleteProduct,
  Product,
  ProductVariant,
} from '../../hooks/useProducts';
import {
  useCategories,
  useAddCategory,
  useUpdateCategory,
  useDeleteCategory,
} from '../../hooks/useCategories';
import { uploadProductImage } from '../../utils/uploadFile';

const emptyVariant = (): ProductVariant => ({
  id: crypto.randomUUID(),
  label: '',
  price: 0,
  originalPrice: 0,
  stock: 0,
  image: '',
  theme: '',
  color: '',
  size: '',
});

const emptyForm = {
  name: '',
  description: '',
  price: 0,
  originalPrice: 0,
  category: '',
  subcategory: '',
  image: '',
  stock: 0,
  material: 'PLA',
  occasion: '',
  isCustomizable: false,
  featured: false,
  active: true,
  hasVariants: false,
  variants: [] as ProductVariant[],
};

export function Catalog() {
  const { data: products = [], isLoading, isError } = useProducts();
  const addProduct = useAddProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageUploadProgress, setImageUploadProgress] = useState<number | null>(null);
  const [showManualUrl, setShowManualUrl] = useState(false);

  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoryError, setCategoryError] = useState('');

  const { data: categories = [] } = useCategories();
  const addCategory = useAddCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm, variants: [] });
    setShowManualUrl(false);
    setIsOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditingId(product.id);
    setForm({
      name: product.name || '',
      description: product.description || '',
      price: product.price || 0,
      originalPrice: product.originalPrice || 0,
      category: product.category || '',
      subcategory: product.subcategory || '',
      image: product.image || '',
      stock: product.stock || 0,
      material: product.material || 'PLA',
      occasion: product.occasion || '',
      isCustomizable: !!product.isCustomizable,
      featured: !!product.featured,
      active: product.active !== false,
      hasVariants: !!product.hasVariants,
      variants: product.variants ? product.variants.map((v) => ({ ...v, originalPrice: v.originalPrice || 0 })) : [],
    });
    setShowManualUrl(false);
    setIsOpen(true);
  };

  const updateVariant = (index: number, field: keyof ProductVariant, value: string | number) => {
    const next = [...form.variants];
    next[index] = { ...next[index], [field]: value };
    setForm({ ...form, variants: next });
  };

  const addVariantRow = () => {
    setForm({ ...form, variants: [...form.variants, emptyVariant()] });
  };

  const removeVariantRow = (index: number) => {
    setForm({
      ...form,
      variants: form.variants.filter((_, i) => i !== index),
    });
  };

  const handleAddCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) {
      setCategoryError('Please enter a category name.');
      return;
    }
    setCategoryError('');
    try {
      const newCategory = await addCategory.mutateAsync(name);
      setForm((current) => ({
        ...current,
        category: newCategory.name,
      }));
      setNewCategoryName('');
    } catch (error: any) {
      setCategoryError(error?.message || 'Failed to add category.');
    }
  };

  const handleUpdateCategory = async (id: string) => {
    const name = editingCategoryName.trim();
    if (!name) {
      alert('Category name cannot be empty.');
      return;
    }
    try {
      await updateCategory.mutateAsync({ id, name });
      setEditingCategoryId(null);
      setEditingCategoryName('');
    } catch (error: any) {
      alert(error?.message || 'Failed to update category.');
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete the category "${name}"? Products in this category will not be deleted, but their category link will be removed.`)) {
      try {
        await deleteCategory.mutateAsync(id);
        if (form.category === name) {
          setForm((current) => ({ ...current, category: '' }));
        }
      } catch (error: any) {
        alert(error?.message || 'Failed to delete category.');
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const cleanVariants = form.hasVariants
        ? form.variants
            .filter((v) => v.label.trim())
            .map((v) => ({
              id: v.id || crypto.randomUUID(),
              label: v.label.trim(),
              price: Number(v.price) || 0,
              originalPrice: Number(v.originalPrice) || 0,
              stock: Number(v.stock) || 0,
              image: v.image?.trim() || '',
              theme: v.theme || '',
              color: v.color || '',
              size: v.size || '',
            }))
        : [];

      let calculatedPrice = Number(form.price) || 0;
      let calculatedOriginalPrice = Number(form.originalPrice) || 0;

      if (form.hasVariants && cleanVariants.length > 0) {
        const activeVariants = cleanVariants.filter((v) => Number(v.price) > 0);
        if (activeVariants.length > 0) {
          const sorted = [...activeVariants].sort((a, b) => a.price - b.price);
          calculatedPrice = sorted[0].price;
          calculatedOriginalPrice = sorted[0].originalPrice || calculatedPrice;
        }
      }

      const payload: any = {
        name: form.name.trim(),
        description: form.description.trim(),
        price: calculatedPrice,
        originalPrice: calculatedOriginalPrice,
        category: form.category,
        subcategory: form.subcategory.trim(),
        image: form.image.trim(),
        stock: form.hasVariants
          ? cleanVariants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0)
          : Number(form.stock) || 0,
        material: form.material || '',
        occasion: form.occasion || '',
        isCustomizable: !!form.isCustomizable,
        featured: !!form.featured,
        active: !!form.active,
        hasVariants: !!form.hasVariants,
        variants: cleanVariants,
      };

      if (editingId) {
        await updateProduct.mutateAsync({ id: editingId, ...payload });
      } else {
        await addProduct.mutateAsync(payload);
      }

      setIsOpen(false);
      setEditingId(null);
      setForm({ ...emptyForm });
    } catch (error) {
      console.error(error);
      alert('Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this product from catalog?')) return;
    try {
      await deleteProduct.mutateAsync(id);
    } catch (error: any) {
      console.error(error);
      alert(error?.message || 'Failed to delete product');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 gap-2">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
        <span className="text-xs font-mono text-muted uppercase tracking-wider">Loading product catalog...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center text-xs font-semibold text-rose-700">
        Failed to load catalog products.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-4">
        <div>
          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-accent block">
            Storefront Inventory
          </span>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Product Catalogue
          </h1>
          <p className="mt-1 text-xs text-muted">
            Create, edit and manage ready-to-print catalogue products and price variants.
          </p>
        </div>

        <button
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-white hover:bg-accent-dark transition-colors shadow-xs shadow-accent/20"
        >
          <Plus className="w-4 h-4" /> Add New Product
        </button>
      </div>

      {/* Product Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {products.map((product) => (
          <div
            key={product.id}
            className="rounded-xl border border-line bg-white p-4 shadow-xs hover:border-accent/30 transition-all flex flex-col justify-between"
          >
            <div className="flex gap-3.5">
              <img
                src={product.image}
                alt={product.name}
                className="w-20 h-20 rounded-lg object-cover bg-shell border border-line shrink-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'https://images.unsplash.com/photo-1581783342308-f792dbdd27c5?auto=format&fit=crop&q=80&w=200';
                }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-mono text-[10px] font-semibold text-accent uppercase bg-accent/10 px-1.5 py-0.5 rounded">
                    {product.category || 'General'}
                  </span>
                  {product.featured && (
                    <span className="font-mono text-[10px] font-semibold text-amber-700 uppercase bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                      Featured
                    </span>
                  )}
                </div>
                <h3 className="font-display font-bold text-sm text-ink truncate mt-1">
                  {product.name}
                </h3>
                <p className="font-mono text-sm font-bold text-ink mt-1">
                  {product.hasVariants ? 'From ' : ''}₹{product.price.toLocaleString('en-IN')}
                </p>
                <p className="text-[11px] font-mono text-muted mt-0.5">
                  Stock: <span className="text-ink font-semibold">{product.stock} units</span>
                  {product.hasVariants ? ' · Has variants' : ''}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-line">
              <button
                onClick={() => openEdit(product)}
                className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 rounded-lg border border-line bg-white font-sans text-xs font-semibold text-ink hover:bg-shell transition-colors"
              >
                <Pencil className="w-3.5 h-3.5 text-muted" /> Edit
              </button>
              <button
                onClick={() => handleDelete(product.id)}
                className="inline-flex items-center justify-center p-1.5 rounded-lg border border-rose-200 bg-white font-sans text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
                title="Delete product"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {products.length === 0 && (
        <div className="rounded-xl border border-line bg-white p-12 text-center text-xs font-mono text-muted shadow-xs">
          No catalogue products found. Click "Add New Product" to create your first item.
        </div>
      )}

      {/* Product Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-ink/40 flex items-start justify-center p-4 overflow-y-auto backdrop-blur-xs">
          <div className="w-full max-w-2xl my-8 rounded-xl border border-line bg-white p-6 shadow-xl relative space-y-5">
            <button
              type="button"
              className="absolute right-4 top-4 text-muted hover:text-ink p-1 rounded-lg hover:bg-shell"
              onClick={() => setIsOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-accent">
                {editingId ? 'Edit Catalogue Entry' : 'Create Catalogue Entry'}
              </span>
              <h2 className="font-display text-xl font-bold text-ink">
                {editingId ? 'Edit Product Details' : 'Add New Product'}
              </h2>
            </div>

            <form onSubmit={handleSave} className="space-y-4 font-sans text-xs">
              {/* Product Name */}
              <div>
                <label className="block font-mono text-[10px] font-bold uppercase tracking-wider text-muted mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Geometric Lithophane Desk Lamp"
                  required
                  className="w-full px-3 py-2 text-xs font-semibold text-ink bg-white border border-line rounded-lg outline-none focus:border-accent"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block font-mono text-[10px] font-bold uppercase tracking-wider text-muted mb-1">
                  Product Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="High quality 3D printed model..."
                  rows={3}
                  className="w-full px-3 py-2 text-xs text-ink bg-white border border-line rounded-lg outline-none focus:border-accent"
                />
              </div>

              {/* Category + Subcategory + Material */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-mono text-[10px] font-bold uppercase tracking-wider text-muted">
                      Category
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setNewCategoryName('');
                        setCategoryError('');
                        setEditingCategoryId(null);
                        setIsCategoryOpen(true);
                      }}
                      className="font-mono text-[10px] font-bold text-accent hover:underline"
                    >
                      Manage Categories
                    </button>
                  </div>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-semibold text-ink bg-white border border-line rounded-lg outline-none focus:border-accent cursor-pointer"
                  >
                    <option value="">Select Category</option>
                    {categories.map((cat: { id: string; name: string }) => (
                      <option key={cat.id} value={cat.name}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="mb-1 h-[15px] flex items-center">
                    <label className="block font-mono text-[10px] font-bold uppercase tracking-wider text-muted">
                      Subcategory (Optional)
                    </label>
                  </div>
                  <input
                    type="text"
                    value={form.subcategory}
                    onChange={(e) => setForm({ ...form, subcategory: e.target.value })}
                    placeholder="e.g. Moonlight Lamps"
                    className="w-full px-3 py-2 text-xs font-semibold text-ink bg-white border border-line rounded-lg outline-none focus:border-accent"
                  />
                </div>

                <div>
                  <div className="mb-1 h-[15px] flex items-center">
                    <label className="block font-mono text-[10px] font-bold uppercase tracking-wider text-muted">
                      Print Material
                    </label>
                  </div>
                  <input
                    type="text"
                    value={form.material}
                    onChange={(e) => setForm({ ...form, material: e.target.value })}
                    placeholder="PLA / PETG / Resin"
                    className="w-full px-3 py-2 text-xs font-mono text-ink bg-white border border-line rounded-lg outline-none focus:border-accent"
                  />
                </div>
              </div>

              {/* Image Upload / URL Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block font-mono text-[10px] font-bold uppercase tracking-wider text-muted">
                    Product Image *
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowManualUrl(!showManualUrl)}
                    className="font-mono text-[10px] font-bold text-accent hover:underline"
                  >
                    {showManualUrl ? 'Use Uploader' : 'Enter URL Manually'}
                  </button>
                </div>

                {showManualUrl ? (
                  <input
                    type="url"
                    value={form.image}
                    onChange={(e) => setForm({ ...form, image: e.target.value })}
                    placeholder="https://images.unsplash.com/..."
                    required
                    className="w-full px-3 py-2 text-xs font-mono text-ink bg-white border border-line rounded-lg outline-none focus:border-accent"
                  />
                ) : (
                  <div className="space-y-2">
                    <input
                      id="product-image-uploader"
                      type="file"
                      accept=".png,.jpg,.jpeg,.webp"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        
                        setImageUploading(true);
                        setImageUploadProgress(0);
                        try {
                          const uploadedUrl = await uploadProductImage(file, (progress) => {
                            setImageUploadProgress(progress);
                          });
                          setForm({ ...form, image: uploadedUrl });
                        } catch (error: any) {
                          console.error('Image upload failed:', error);
                          alert(error?.message || 'Failed to upload image. Please try again.');
                        } finally {
                          setImageUploading(false);
                          setImageUploadProgress(null);
                        }
                      }}
                      className="hidden"
                    />

                    {form.image ? (
                      <div className="flex items-center justify-between p-3 rounded-xl border border-line bg-shell/50">
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={form.image}
                            alt="Product preview"
                            className="w-12 h-12 rounded-lg object-contain bg-white border border-line shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-ink truncate font-mono">
                              {form.image.split('?key=')[1] ? decodeURIComponent(form.image.split('?key=')[1]) : 'Uploaded Image'}
                            </p>
                            <p className="text-[10px] text-emerald-600 font-semibold font-mono flex items-center gap-1">
                              <span>Upload successful</span>
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, image: '' })}
                          className="p-1 rounded-lg text-muted hover:text-rose-600 hover:bg-rose-50"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <label
                        htmlFor="product-image-uploader"
                        className="flex h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line bg-white hover:bg-shell/50 transition-colors"
                      >
                        {imageUploading ? (
                          <div className="flex flex-col items-center gap-2">
                            <Loader2 className="h-5 w-5 text-accent animate-spin" />
                            <span className="font-mono text-[10px] text-accent">
                              Uploading to workshop: {imageUploadProgress}%
                            </span>
                          </div>
                        ) : (
                          <>
                            <Upload className="h-5 w-5 text-muted" />
                            <span className="font-sans text-xs font-semibold text-ink">
                              Choose or Drop Product Image
                            </span>
                            <span className="font-mono text-[9px] text-muted">
                              PNG, JPG, JPEG or WEBP (Max 10MB)
                            </span>
                          </>
                        )}
                      </label>
                    )}
                  </div>
                )}
              </div>

              {/* Options Checkboxes */}
              <div className="flex flex-wrap gap-4 pt-1 font-mono text-xs text-ink bg-shell p-3 rounded-lg border border-line">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.hasVariants}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        hasVariants: e.target.checked,
                        variants:
                          e.target.checked && form.variants.length === 0
                            ? [emptyVariant()]
                            : form.variants,
                      })
                    }
                    className="accent-[#ff4d00]"
                  />
                  <span>Has Variants</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.featured}
                    onChange={(e) => setForm({ ...form, featured: e.target.checked })}
                    className="accent-[#ff4d00]"
                  />
                  <span>Featured</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isCustomizable}
                    onChange={(e) => setForm({ ...form, isCustomizable: e.target.checked })}
                    className="accent-[#ff4d00]"
                  />
                  <span>Customizable</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) => setForm({ ...form, active: e.target.checked })}
                    className="accent-[#ff4d00]"
                  />
                  <span>Active</span>
                </label>
              </div>

              {/* Price/Stock or Variants Rows */}
              {!form.hasVariants ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block font-mono text-[10px] font-bold uppercase tracking-wider text-muted mb-1">
                      Selling Price (₹) *
                    </label>
                    <input
                      type="number"
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                      required
                      min={0}
                      className="w-full px-3 py-2 text-xs font-mono font-bold text-ink bg-white border border-line rounded-lg outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="block font-mono text-[10px] font-bold uppercase tracking-wider text-muted mb-1">
                      Original / MRP (₹)
                    </label>
                    <input
                      type="number"
                      value={form.originalPrice || ''}
                      onChange={(e) => setForm({ ...form, originalPrice: Number(e.target.value) })}
                      placeholder="e.g. 4049"
                      min={0}
                      className="w-full px-3 py-2 text-xs font-mono text-ink bg-white border border-line rounded-lg outline-none focus:border-accent"
                    />
                    {Number(form.originalPrice) > Number(form.price) && Number(form.price) > 0 && (
                      <span className="block mt-1 text-[10px] font-mono font-semibold text-emerald-600">
                        ⚡ Save {Math.round(((Number(form.originalPrice) - Number(form.price)) / Number(form.originalPrice)) * 100)}% Badge Active
                      </span>
                    )}
                  </div>
                  <div>
                    <label className="block font-mono text-[10px] font-bold uppercase tracking-wider text-muted mb-1">
                      Stock Count *
                    </label>
                    <input
                      type="number"
                      value={form.stock}
                      onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })}
                      required
                      min={0}
                      className="w-full px-3 py-2 text-xs font-mono font-bold text-ink bg-white border border-line rounded-lg outline-none focus:border-accent"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between border-b border-line pb-2">
                    <span className="font-mono text-xs font-bold uppercase tracking-wider text-accent">
                      Product Variants
                    </span>
                    <button
                      type="button"
                      onClick={addVariantRow}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-accent/10 text-accent font-mono text-[11px] font-bold hover:bg-accent/20"
                    >
                      <Plus className="w-3 h-3" /> Add Variant
                    </button>
                  </div>

                  {form.variants.map((variant, index) => (
                    <div key={variant.id} className="p-3 rounded-lg bg-shell border border-line space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-mono text-muted">Variant Label *</label>
                          <input
                            type="text"
                            value={variant.label}
                            onChange={(e) => updateVariant(index, 'label', e.target.value)}
                            placeholder="e.g. Single Pack / Large"
                            required
                            className="w-full px-2.5 py-1.5 text-xs text-ink bg-white border border-line rounded outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-mono text-muted">Image URL (Optional)</label>
                          <input
                            type="text"
                            value={variant.image || ''}
                            onChange={(e) => updateVariant(index, 'image', e.target.value)}
                            placeholder="https://..."
                            className="w-full px-2.5 py-1.5 text-xs font-mono text-ink bg-white border border-line rounded outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-mono text-muted">Selling Price (₹) *</label>
                          <input
                            type="number"
                            value={variant.price}
                            onChange={(e) => updateVariant(index, 'price', Number(e.target.value))}
                            required
                            min={0}
                            className="w-full px-2.5 py-1.5 text-xs font-mono text-ink bg-white border border-line rounded outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-mono text-muted">Original / MRP (₹)</label>
                          <input
                            type="number"
                            value={variant.originalPrice || ''}
                            onChange={(e) => updateVariant(index, 'originalPrice', Number(e.target.value))}
                            placeholder="Optional MRP"
                            min={0}
                            className="w-full px-2.5 py-1.5 text-xs font-mono text-ink bg-white border border-line rounded outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-mono text-muted">Stock *</label>
                          <input
                            type="number"
                            value={variant.stock}
                            onChange={(e) => updateVariant(index, 'stock', Number(e.target.value))}
                            required
                            min={0}
                            className="w-full px-2.5 py-1.5 text-xs font-mono text-ink bg-white border border-line rounded outline-none"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => removeVariantRow(index)}
                          className="inline-flex items-center gap-1 text-[11px] font-mono text-rose-600 hover:underline"
                        >
                          <Trash2 className="w-3 h-3" /> Remove Variant
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 px-4 rounded-lg bg-accent text-white font-sans text-xs font-semibold hover:bg-accent-dark transition-colors shadow-xs disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {editingId ? 'Update Product' : 'Save Product'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="py-2.5 px-4 rounded-lg border border-line bg-white font-sans text-xs font-semibold text-ink hover:bg-shell transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Categories Modal */}
      {isCategoryOpen && (
        <div className="fixed inset-0 z-[60] bg-ink/40 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="w-full max-w-md p-6 rounded-xl border border-line bg-white shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="font-display text-base font-bold text-ink">Manage Categories</h3>
              <button
                type="button"
                onClick={() => setIsCategoryOpen(false)}
                className="text-muted hover:text-ink"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Add Category Section */}
            <div className="space-y-2">
              <label className="block font-mono text-[10px] font-bold uppercase tracking-wider text-muted">
                Add New Category
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Moonlight Lamps"
                  value={newCategoryName}
                  onChange={(e) => {
                    setNewCategoryName(e.target.value);
                    setCategoryError('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCategory();
                    }
                  }}
                  className="flex-1 px-3 py-1.5 text-xs text-ink bg-white border border-line rounded-lg outline-none focus:border-accent"
                />
                <button
                  type="button"
                  onClick={handleAddCategory}
                  disabled={addCategory.isPending}
                  className="px-4 py-1.5 rounded-lg bg-accent text-white font-sans text-xs font-semibold hover:bg-accent-dark transition-colors shadow-xs disabled:opacity-50"
                >
                  {addCategory.isPending ? 'Adding...' : 'Add'}
                </button>
              </div>
              {categoryError && (
                <p className="text-xs text-rose-600 font-semibold">{categoryError}</p>
              )}
            </div>

            {/* List and Manage Existing Categories */}
            <div className="space-y-2.5 pt-3 border-t border-line">
              <label className="block font-mono text-[10px] font-bold uppercase tracking-wider text-muted">
                Existing Categories ({categories.length})
              </label>
              
              <div className="max-h-56 overflow-y-auto border border-line rounded-xl divide-y divide-line bg-shell/20">
                {categories.length === 0 ? (
                  <p className="p-4 text-center text-xs font-mono text-muted">No categories created yet.</p>
                ) : (
                  categories.map((cat: any) => {
                    const isEditing = editingCategoryId === cat.id;

                    return (
                      <div key={cat.id} className="flex items-center justify-between p-2.5 gap-2 bg-white">
                        {isEditing ? (
                          <div className="flex items-center gap-1.5 flex-1">
                            <input
                              type="text"
                              value={editingCategoryName}
                              onChange={(e) => setEditingCategoryName(e.target.value)}
                              className="flex-1 px-2 py-1 text-xs text-ink bg-white border border-accent rounded outline-none"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleUpdateCategory(cat.id);
                                } else if (e.key === 'Escape') {
                                  setEditingCategoryId(null);
                                }
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => handleUpdateCategory(cat.id)}
                              className="px-2 py-1 rounded bg-emerald-50 text-emerald-700 font-sans text-[10px] font-bold hover:bg-emerald-100"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingCategoryId(null)}
                              className="px-2 py-1 rounded border border-line bg-white font-sans text-[10px] font-bold text-muted hover:bg-shell"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <>
                            <span className="text-xs text-ink font-semibold pl-1 font-sans">{cat.name}</span>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingCategoryId(cat.id);
                                  setEditingCategoryName(cat.name);
                                }}
                                className="p-1 rounded text-muted hover:text-accent hover:bg-shell"
                                title="Edit Name"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteCategory(cat.id, cat.name)}
                                className="p-1 rounded text-muted hover:text-rose-600 hover:bg-rose-50"
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
                onClick={() => setIsCategoryOpen(false)}
                className="py-1.5 px-4 rounded-lg border border-line bg-white font-sans text-xs font-semibold text-ink hover:bg-shell transition-colors"
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



