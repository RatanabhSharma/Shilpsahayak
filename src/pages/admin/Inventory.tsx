import React, { useState } from 'react';
import { Edit2, Check, X, Loader2, ImageIcon } from 'lucide-react';
import { Card, Badge } from '../../components/ui';
import { useProducts, useUpdateProduct } from '../../hooks/useProducts';

const LOW_STOCK_THRESHOLD = 5;

export function Inventory() {
  const { data: products = [], isLoading, isError } = useProducts();
  const updateProduct = useUpdateProduct();

  const lowStockProducts = products.filter(
    (p) => p.stock <= LOW_STOCK_THRESHOLD && p.stock > 0
  );
  const outOfStockProducts = products.filter((p) => p.stock === 0);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  const handleEdit = (id: string, currentStock: number) => {
    setEditingId(id);
    setEditValue(currentStock.toString());
  };

  const handleSave = async (id: string) => {
    const newStock = parseInt(editValue, 10);
    if (!isNaN(newStock) && newStock >= 0) {
      await updateProduct.mutateAsync({ id, stock: newStock });
    }
    setEditingId(null);
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
        Failed to load inventory. Please check your Firebase connection.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-bold text-charcoal">
          Product Inventory
        </h1>
        <p className="text-charcoal-light text-sm mt-1">
          Track and update stock levels for every product in your catalog.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 border-none shadow-sm">
          <h3 className="text-charcoal-light text-sm font-medium mb-1">
            Total Products
          </h3>
          <p className="text-3xl font-bold text-charcoal">{products.length}</p>
        </Card>
        <Card
          className={`p-6 border-none shadow-sm ${lowStockProducts.length > 0 ? 'bg-amber-50' : ''}`}
        >
          <h3
            className={`${lowStockProducts.length > 0 ? 'text-amber-800' : 'text-charcoal-light'} text-sm font-medium mb-1`}
          >
            Low Stock Alerts
          </h3>
          <p
            className={`text-3xl font-bold ${lowStockProducts.length > 0 ? 'text-amber-600' : 'text-charcoal'}`}
          >
            {lowStockProducts.length}
          </p>
        </Card>
        <Card
          className={`p-6 border-none shadow-sm ${outOfStockProducts.length > 0 ? 'bg-red-50' : ''}`}
        >
          <h3
            className={`${outOfStockProducts.length > 0 ? 'text-red-800' : 'text-charcoal-light'} text-sm font-medium mb-1`}
          >
            Out of Stock
          </h3>
          <p
            className={`text-3xl font-bold ${outOfStockProducts.length > 0 ? 'text-red-600' : 'text-charcoal'}`}
          >
            {outOfStockProducts.length}
          </p>
        </Card>
      </div>

      <Card className="border-none shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface text-xs uppercase tracking-wider text-charcoal-light border-b border-brand-100">
                <th className="px-6 py-4 font-medium">Product</th>
                <th className="px-6 py-4 font-medium">Category</th>
                <th className="px-6 py-4 font-medium">Stock (units)</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-50">
              {products.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-charcoal-light">
                    No products yet. Add products from the Catalog page first.
                  </td>
                </tr>
              ) : (
                products.map((product) => {
                  const isOutOfStock = product.stock === 0;
                  const isLowStock =
                    !isOutOfStock && product.stock <= LOW_STOCK_THRESHOLD;
                  const isEditing = editingId === product.id;
                  return (
                    <tr
                      key={product.id}
                      className={`transition-colors ${
                        isOutOfStock
                          ? 'bg-red-50/30 hover:bg-red-50/50'
                          : isLowStock
                          ? 'bg-amber-50/30 hover:bg-amber-50/50'
                          : 'hover:bg-brand-50/50'
                      }`}
                    >
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
                          <span className="font-medium text-charcoal">
                            {product.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-charcoal-light">
                        {product.category}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-charcoal">
                        {isEditing ? (
                          <input
                            type="number"
                            step="1"
                            min="0"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="w-20 h-8 px-2 border border-brand-300 rounded focus:outline-none focus:ring-2 focus:ring-brand-500"
                            autoFocus
                          />
                        ) : (
                          <span>{product.stock}</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <Badge
                          variant={
                            isOutOfStock ? 'danger' : isLowStock ? 'warning' : 'success'
                          }
                        >
                          {isOutOfStock
                            ? 'Out of Stock'
                            : isLowStock
                            ? 'Low Stock'
                            : 'Healthy'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {isEditing ? (
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleSave(product.id)}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleEdit(product.id, product.stock)}
                            className="p-1.5 text-charcoal-light hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors inline-flex"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
