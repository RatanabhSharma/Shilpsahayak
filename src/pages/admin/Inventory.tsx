import { useState } from 'react';
import { Edit2, Check, X, Loader2, ImageIcon, Layers, TriangleAlert } from 'lucide-react';
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
      <div className="flex items-center justify-center h-64 gap-2">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
        <span className="text-xs font-mono text-muted uppercase tracking-wider">Loading stock telemetry...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center text-xs font-semibold text-rose-700">
        Failed to load inventory levels. Please check your Firebase connection.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-4">
        <div>
          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-accent block">
            Material Telemetry
          </span>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Filament & Stock Inventory
          </h1>
          <p className="mt-1 text-xs text-muted">
            Monitor real-time stock levels, update spool counts, and resolve inventory warnings.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-line bg-white p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted">
              Total Products
            </p>
            <p className="mt-2 font-mono text-2xl font-bold text-ink">{products.length}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-shell flex items-center justify-center text-muted shrink-0">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div
          className={`rounded-xl border p-5 shadow-xs flex items-center justify-between transition-colors ${
            lowStockProducts.length > 0
              ? 'border-amber-200 bg-amber-50/60'
              : 'border-line bg-white'
          }`}
        >
          <div>
            <p
              className={`font-mono text-[10px] font-bold uppercase tracking-wider ${
                lowStockProducts.length > 0 ? 'text-amber-800' : 'text-muted'
              }`}
            >
              Low Stock Warnings
            </p>
            <p
              className={`mt-2 font-mono text-2xl font-bold ${
                lowStockProducts.length > 0 ? 'text-amber-700' : 'text-ink'
              }`}
            >
              {lowStockProducts.length}
            </p>
          </div>
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
              lowStockProducts.length > 0 ? 'bg-amber-100 text-amber-700' : 'bg-shell text-muted'
            }`}
          >
            <TriangleAlert className="w-5 h-5" />
          </div>
        </div>

        <div
          className={`rounded-xl border p-5 shadow-xs flex items-center justify-between transition-colors ${
            outOfStockProducts.length > 0
              ? 'border-rose-200 bg-rose-50/60'
              : 'border-line bg-white'
          }`}
        >
          <div>
            <p
              className={`font-mono text-[10px] font-bold uppercase tracking-wider ${
                outOfStockProducts.length > 0 ? 'text-rose-800' : 'text-muted'
              }`}
            >
              Out of Stock
            </p>
            <p
              className={`mt-2 font-mono text-2xl font-bold ${
                outOfStockProducts.length > 0 ? 'text-rose-700' : 'text-ink'
              }`}
            >
              {outOfStockProducts.length}
            </p>
          </div>
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
              outOfStockProducts.length > 0 ? 'bg-rose-100 text-rose-700' : 'bg-shell text-muted'
            }`}
          >
            <X className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="rounded-xl border border-line bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-shell/50 border-b border-line text-[10px] font-mono font-bold uppercase tracking-wider text-muted">
                <th className="px-5 py-3">Product</th>
                <th className="px-5 py-3">Category</th>
                <th className="px-5 py-3">Stock (Units)</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Quick Edit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line font-sans text-xs">
              {products.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-xs font-mono text-muted">
                    No items in inventory. Add products in the Catalog section first.
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
                          ? 'bg-rose-50/20 hover:bg-rose-50/40'
                          : isLowStock
                          ? 'bg-amber-50/20 hover:bg-amber-50/40'
                          : 'hover:bg-shell/40'
                      }`}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg overflow-hidden bg-shell border border-line flex-shrink-0">
                            {product.image ? (
                              <img
                                src={product.image}
                                alt={product.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-muted">
                                <ImageIcon className="w-4 h-4" />
                              </div>
                            )}
                          </div>
                          <span className="font-semibold text-ink">
                            {product.name}
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-3.5 font-mono text-muted">
                        {product.category || 'General'}
                      </td>

                      <td className="px-5 py-3.5 font-mono font-bold text-ink">
                        {isEditing ? (
                          <input
                            type="number"
                            step="1"
                            min="0"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="w-20 px-2 py-1 border border-accent rounded bg-white font-mono font-bold text-ink outline-none"
                            autoFocus
                          />
                        ) : (
                          <span>{product.stock} units</span>
                        )}
                      </td>

                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold uppercase tracking-wider border ${
                            isOutOfStock
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : isLowStock
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          {isOutOfStock
                            ? 'Out of Stock'
                            : isLowStock
                            ? 'Low Stock Warning'
                            : 'Stock Healthy'}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        {isEditing ? (
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => handleSave(product.id)}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors border border-emerald-200"
                              title="Save stock"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-rose-200"
                              title="Cancel"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleEdit(product.id, product.stock)}
                            className="p-1.5 text-muted hover:text-accent hover:bg-shell rounded-lg transition-colors inline-flex border border-line"
                            title="Edit stock count"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
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
      </div>
    </div>
  );
}

export default Inventory;



