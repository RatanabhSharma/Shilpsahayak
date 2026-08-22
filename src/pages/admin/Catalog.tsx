import React, { useState } from 'react';
import { Plus, Pencil, Trash2, Loader2, X } from 'lucide-react';
import {
  useProducts,
  useAddProduct,
  useUpdateProduct,
  useDeleteProduct,
  Product,
  ProductVariant
} from '../../hooks/useProducts';
import { Button, Card, Input, Textarea } from '../../components/ui';

const emptyVariant = (): ProductVariant => ({
  id: crypto.randomUUID(),
  label: '',
  price: 0,
  stock: 0,
  image: '',
  theme: '',
  color: '',
  size: ''
});

const emptyForm = {
  name: '',
  description: '',
  price: 0,
  category: 'Keychains',
  image: '',
  stock: 0,
  material: 'PLA',
  occasion: '',
  isCustomizable: false,
  featured: false,
  active: true,
  hasVariants: false,
  variants: [] as ProductVariant[]
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

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm, variants: [] });
    setIsOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditingId(product.id);
    setForm({
      name: product.name || '',
      description: product.description || '',
      price: product.price || 0,
      category: product.category || 'Keychains',
      image: product.image || '',
      stock: product.stock || 0,
      material: product.material || 'PLA',
      occasion: product.occasion || '',
      isCustomizable: !!product.isCustomizable,
      featured: !!product.featured,
      active: product.active !== false,
      hasVariants: !!product.hasVariants,
      variants: product.variants ? [...product.variants] : []
    });
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
      variants: form.variants.filter((_, i) => i !== index)
    });
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
        stock: Number(v.stock) || 0,
        image: v.image?.trim() || '',
        theme: v.theme || '',
        color: v.color || '',
        size: v.size || ''
      }))
  : [];

const payload: any = {
  name: form.name.trim(),
  description: form.description.trim(),
  price: Number(form.price) || 0,
  category: form.category,
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
  variants: cleanVariants
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
  if (!confirm('Delete this product?')) return;
  try {
    await deleteProduct.mutateAsync(id);
  } catch (error: any) {
    console.error(error);
    alert(error?.message || 'Failed to delete product');
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
    return <div className="text-red-600">Failed to load products.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-charcoal">Catalog</h1>
          <p className="text-sm text-charcoal-light mt-1">
            Manage products and variants
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Add Product
        </Button>
      </div>

      {/* Product list */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {products.map((product) => (
          <Card key={product.id} className="p-4 border-none shadow-sm">
            <div className="flex gap-3">
              <img
                src={product.image}
                alt={product.name}
                className="w-16 h-16 rounded-lg object-cover bg-surface"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'https://images.unsplash.com/photo-1581783342308-f792dbdd27c5?auto=format&fit=crop&q=80&w=200';
                }}
              />
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-charcoal truncate">{product.name}</h3>
                <p className="text-xs text-charcoal-lighter">{product.category}</p>
                <p className="text-sm text-brand-600 mt-1">
                  ₹{product.price.toLocaleString('en-IN')}
                  {product.hasVariants ? ' · has variants' : ''}
                </p>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button size="sm" variant="outline" onClick={() => openEdit(product)}>
                <Pencil className="w-3.5 h-3.5 mr-1" />
                Edit
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleDelete(product.id)}>
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                Delete
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {products.length === 0 && (
        <Card className="p-10 text-center text-charcoal-light border-none shadow-sm">
          No products yet. Click Add Product.
        </Card>
      )}

      {/* Modal form */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center p-4 overflow-y-auto">
          <Card className="w-full max-w-2xl my-8 p-6 border-none shadow-lg relative">
            <button
              className="absolute right-4 top-4 text-charcoal-light hover:text-charcoal"
              onClick={() => setIsOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-serif font-bold text-charcoal mb-6">
              {editingId ? 'Edit Product' : 'Add Product'}
            </h2>

            <form onSubmit={handleSave} className="space-y-4">
              <Input
                label="Product Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />

              <Textarea
                label="Description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-charcoal mb-2">
                    Category
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full rounded-lg border border-brand-200 px-3 py-2.5 text-sm"
                  >
                    <option>Keychains</option>
                    <option>Lamps</option>
                    <option>Lithophanes</option>
                    <option>Vases</option>
                    <option>Decor</option>
                    <option>Idols</option>
                    <option>Custom & Personalised</option>
                  </select>
                </div>

                <Input
                  label="Material"
                  value={form.material}
                  onChange={(e) => setForm({ ...form, material: e.target.value })}
                />
              </div>

              <Input
                label="Main Image URL"
                value={form.image}
                onChange={(e) => setForm({ ...form, image: e.target.value })}
                required
              />

              <div className="flex flex-wrap gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.hasVariants}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        hasVariants: e.target.checked,
                        variants: e.target.checked && form.variants.length === 0
                          ? [emptyVariant()]
                          : form.variants
                      })
                    }
                  />
                  Has Variants
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.featured}
                    onChange={(e) => setForm({ ...form, featured: e.target.checked })}
                  />
                  Featured
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.isCustomizable}
                    onChange={(e) => setForm({ ...form, isCustomizable: e.target.checked })}
                  />
                  Customizable
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) => setForm({ ...form, active: e.target.checked })}
                  />
                  Active
                </label>
              </div>

              {!form.hasVariants ? (
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Price (₹)"
                    type="number"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                    required
                  />
                  <Input
                    label="Stock"
                    type="number"
                    value={form.stock}
                    onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })}
                    required
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-charcoal">Variants</p>
                    <Button type="button" size="sm" variant="outline" onClick={addVariantRow}>
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Add Variant
                    </Button>
                  </div>

                  {form.variants.map((variant, index) => (
                    <div
                      key={variant.id}
                      className="p-3 rounded-xl bg-surface space-y-2 border border-brand-100"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <Input
                          label="Label (e.g. One Piece)"
                          value={variant.label}
                          onChange={(e) => updateVariant(index, 'label', e.target.value)}
                          required
                        />
                        <Input
                          label="Image URL (optional)"
                          value={variant.image || ''}
                          onChange={(e) => updateVariant(index, 'image', e.target.value)}
                        />
                        <Input
                          label="Price (₹)"
                          type="number"
                          value={variant.price}
                          onChange={(e) => updateVariant(index, 'price', Number(e.target.value))}
                          required
                        />
                        <Input
                          label="Stock"
                          type="number"
                          value={variant.stock}
                          onChange={(e) => updateVariant(index, 'stock', Number(e.target.value))}
                          required
                        />
                      </div>
                      <button
                        type="button"
                        className="text-xs text-red-600"
                        onClick={() => removeVariantRow(index)}
                      >
                        Remove variant
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button type="submit" className="flex-1" isLoading={saving}>
                  {editingId ? 'Update Product' : 'Save Product'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}