import React, { useState } from 'react';
import { Plus, Edit2, Trash2, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Card, Button, Input, Textarea } from '../../components/ui';
import {
  useProducts,
  useAddProduct,
  useUpdateProduct,
  useDeleteProduct,
  Product
} from '../../hooks/useProducts';

export function Catalog() {
  const { data: products = [], isLoading, isError } = useProducts();
  const addProduct = useAddProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const handleOpenForm = (product?: Product) => {
    setEditingProduct(product || null);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingProduct(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const productData = {
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      price: parseInt(formData.get('price') as string, 10),
      category: formData.get('category') as string,
      image:
        (formData.get('image') as string) ||
        'https://images.unsplash.com/photo-1581783342308-f792dbdd27c5?auto=format&fit=crop&q=80&w=800',
      stock: parseInt(formData.get('stock') as string, 10),
      isCustomizable: formData.get('isCustomizable') === 'on',
      featured: formData.get('featured') === 'on',
      active: true
    };

    try {
      if (editingProduct) {
        await updateProduct.mutateAsync({ id: editingProduct.id, ...productData });
      } else {
        await addProduct.mutateAsync(productData);
      }
      handleCloseForm();
    } catch (error) {
      console.error('Error saving product:', error);
      alert('Failed to save product. Check console for details.');
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
        Failed to load products. Please check your Firebase connection.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-serif font-bold text-charcoal">
            Catalog Management
          </h1>
          <p className="text-charcoal-light text-sm mt-1">
            Manage your products, pricing, and inventory.
          </p>
        </div>
        {!isFormOpen && (
          <Button onClick={() => handleOpenForm()}>
            <Plus className="w-4 h-4 mr-2" /> Add Product
          </Button>
        )}
      </div>

      {isFormOpen ? (
        <Card className="p-6 border-none shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-serif font-semibold text-xl text-charcoal">
              {editingProduct ? 'Edit Product' : 'Add New Product'}
            </h2>
            <button
              onClick={handleCloseForm}
              className="text-charcoal-lighter hover:text-charcoal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                name="name"
                label="Product Name"
                defaultValue={editingProduct?.name}
                required
              />
              <Input
                name="category"
                label="Category"
                defaultValue={editingProduct?.category}
                required
              />
              <Input
                name="price"
                type="number"
                label="Price (₹)"
                defaultValue={editingProduct?.price}
                required
              />
              <Input
                name="stock"
                type="number"
                label="Stock Quantity"
                defaultValue={editingProduct?.stock}
                required
              />
              <div className="md:col-span-2">
                <Input
                  name="image"
                  label="Image URL"
                  defaultValue={editingProduct?.image}
                  placeholder="https://images.unsplash.com/..."
                />
              </div>
              <div className="md:col-span-2">
                <Textarea
                  name="description"
                  label="Description"
                  defaultValue={editingProduct?.description}
                  required
                />
              </div>
            </div>

            <div className="flex gap-6 pt-4 border-t border-brand-100">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="isCustomizable"
                  defaultChecked={editingProduct?.isCustomizable}
                  className="rounded border-brand-300 text-brand-500 focus:ring-brand-500"
                />
                <span className="text-sm text-charcoal font-medium">
                  Allow Personalisation
                </span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="featured"
                  defaultChecked={editingProduct?.featured}
                  className="rounded border-brand-300 text-brand-500 focus:ring-brand-500"
                />
                <span className="text-sm text-charcoal font-medium">
                  Feature on Homepage
                </span>
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-6">
              <Button type="button" variant="outline" onClick={handleCloseForm}>
                Cancel
              </Button>
              <Button
                type="submit"
                isLoading={addProduct.isPending || updateProduct.isPending}
              >
                {editingProduct ? 'Save Changes' : 'Add Product'}
              </Button>
            </div>
          </form>
        </Card>
      ) : (
        <Card className="border-none shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface text-xs uppercase tracking-wider text-charcoal-light border-b border-brand-100">
                  <th className="px-6 py-4 font-medium">Product</th>
                  <th className="px-6 py-4 font-medium">Category</th>
                  <th className="px-6 py-4 font-medium">Price</th>
                  <th className="px-6 py-4 font-medium">Stock</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-50">
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-charcoal-light">
                      No products yet. Click “Add Product” to create your first one.
                    </td>
                  </tr>
                ) : (
                  products.map((product) => (
                    <tr key={product.id} className="hover:bg-brand-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-surface-dark flex-shrink-0">
                            {product.image ? (
                              <img
                                src={product.image}
                                alt={product.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-charcoal-lighter">
                                <ImageIcon className="w-4 h-4" />
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-charcoal">{product.name}</p>
                            <div className="flex gap-2 mt-1">
                              {product.featured && (
                                <span className="text-[10px] bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded">
                                  Featured
                                </span>
                              )}
                              {product.isCustomizable && (
                                <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                                  Custom
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-charcoal-light">
                        {product.category}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-charcoal">
                        ₹{product.price.toLocaleString('en-IN')}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`text-sm font-medium px-2.5 py-1 rounded-full ${
                            product.stock > 10
                              ? 'bg-green-50 text-green-700'
                              : product.stock > 0
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-red-50 text-red-700'
                          }`}
                        >
                          {product.stock} in stock
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleOpenForm(product)}
                            className="p-2 text-charcoal-light hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={async () => {
                              if (confirm('Are you sure you want to delete this product?')) {
                                await deleteProduct.mutateAsync(product.id);
                              }
                            }}
                            className="p-2 text-charcoal-light hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}