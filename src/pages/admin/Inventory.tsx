import React, { useState } from 'react';
import { Edit2, Check, X } from 'lucide-react';
import { useStore } from '../../store';
import { Card, Badge, Input } from '../../components/ui';
export function Inventory() {
  const filaments = useStore((state) => state.filaments);
  const updateFilamentStock = useStore((state) => state.updateFilamentStock);
  const lowStockFilaments = filaments.filter(
    (f) => f.stockKg <= f.lowStockThresholdKg
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const handleEdit = (id: string, currentStock: number) => {
    setEditingId(id);
    setEditValue(currentStock.toString());
  };
  const handleSave = (id: string) => {
    const newStock = parseFloat(editValue);
    if (!isNaN(newStock)) {
      updateFilamentStock(id, newStock);
    }
    setEditingId(null);
  };
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-bold text-charcoal">
          Raw Materials Inventory
        </h1>
        <p className="text-charcoal-light text-sm mt-1">
          Manage filament and resin stock levels.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 border-none shadow-sm">
          <h3 className="text-charcoal-light text-sm font-medium mb-1">
            Total Spools / Bottles
          </h3>
          <p className="text-3xl font-bold text-charcoal">{filaments.length}</p>
        </Card>
        <Card
          className={`p-6 border-none shadow-sm ${lowStockFilaments.length > 0 ? 'bg-red-50' : ''}`}>
          
          <h3
            className={`${lowStockFilaments.length > 0 ? 'text-red-800' : 'text-charcoal-light'} text-sm font-medium mb-1`}>
            
            Low Stock Alerts
          </h3>
          <p
            className={`text-3xl font-bold ${lowStockFilaments.length > 0 ? 'text-red-600' : 'text-charcoal'}`}>
            
            {lowStockFilaments.length}
          </p>
        </Card>
      </div>

      <Card className="border-none shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface text-xs uppercase tracking-wider text-charcoal-light border-b border-brand-100">
                <th className="px-6 py-4 font-medium">Material</th>
                <th className="px-6 py-4 font-medium">Type</th>
                <th className="px-6 py-4 font-medium">Stock (kg/L)</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-50">
              {filaments.map((filament) => {
                const isLowStock =
                filament.stockKg <= filament.lowStockThresholdKg;
                const isEditing = editingId === filament.id;
                return (
                  <tr
                    key={filament.id}
                    className={`transition-colors ${isLowStock ? 'bg-red-50/30 hover:bg-red-50/50' : 'hover:bg-brand-50/50'}`}>
                    
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-6 h-6 rounded-full shadow-sm border border-brand-100"
                          style={{
                            backgroundColor: filament.colorHex
                          }} />
                        
                        <span className="font-medium text-charcoal">
                          {filament.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-charcoal-light">
                      {filament.material}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-charcoal">
                      {isEditing ?
                      <div className="flex items-center gap-2">
                          <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-20 h-8 px-2 border border-brand-300 rounded focus:outline-none focus:ring-2 focus:ring-brand-500"
                          autoFocus />
                        
                        </div> :

                      <span>{filament.stockKg.toFixed(2)}</span>
                      }
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={isLowStock ? 'danger' : 'success'}>
                        {isLowStock ? 'Low Stock' : 'Healthy'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {isEditing ?
                      <div className="flex justify-end gap-2">
                          <button
                          onClick={() => handleSave(filament.id)}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                          
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                          onClick={() => setEditingId(null)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                          
                            <X className="w-4 h-4" />
                          </button>
                        </div> :

                      <button
                        onClick={() =>
                        handleEdit(filament.id, filament.stockKg)
                        }
                        className="p-1.5 text-charcoal-light hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors inline-flex">
                        
                          <Edit2 className="w-4 h-4" />
                        </button>
                      }
                    </td>
                  </tr>);

              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>);

}