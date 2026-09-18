import { useState, useEffect } from 'react';
import {
  X,
  Loader2,
  TrendingUp,
  TrendingDown,
  Package,
} from 'lucide-react';
import { Product } from '../../../hooks/useProducts';
import {
  useAdjustStock,
  InventoryAdjustmentReason,
} from '../../../hooks/useInventoryLogs';

export interface StockAdjustmentModalProps {
  isOpen: boolean;
  product: Product | null;
  onClose: () => void;
  onSuccess?: () => void;
}

const REASONS: InventoryAdjustmentReason[] = [
  'Finished Batch Print Run',
  'Manual Restock',
  'Damaged / QC Scrap',
  'Inventory Audit Recount',
  'Customer Return / Exchange',
  'Loss / Expired Scrap',
  'Other Adjustment',
];

export const StockAdjustmentModal: React.FC<StockAdjustmentModalProps> = ({
  isOpen,
  product,
  onClose,
  onSuccess,
}) => {
  const adjustStock = useAdjustStock();

  const [mode, setMode] = useState<'relative' | 'absolute'>('relative');
  const [deltaInput, setDeltaInput] = useState<number | ''>('');
  const [absoluteInput, setAbsoluteInput] = useState<number | ''>('');
  const [reason, setReason] = useState<InventoryAdjustmentReason>(
    'Finished Batch Print Run'
  );
  const [notes, setNotes] = useState('');

  const currentStock = product?.stock || 0;

  useEffect(() => {
    if (product) {
      setMode('relative');
      setDeltaInput('');
      setAbsoluteInput(currentStock);
      setReason('Finished Batch Print Run');
      setNotes('');
    }
  }, [product, currentStock, isOpen]);

  // Handle ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !product) return null;

  // Calculate new stock and delta
  let calculatedNewStock = currentStock;
  let calculatedDelta = 0;

  if (mode === 'relative') {
    const d = typeof deltaInput === 'number' ? deltaInput : 0;
    calculatedDelta = d;
    calculatedNewStock = Math.max(0, currentStock + d);
  } else {
    const a = typeof absoluteInput === 'number' ? absoluteInput : currentStock;
    calculatedNewStock = Math.max(0, a);
    calculatedDelta = calculatedNewStock - currentStock;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (calculatedDelta === 0) {
      alert('The adjustment results in no change to stock (delta is 0).');
      return;
    }

    try {
      await adjustStock.mutateAsync({
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        previousStock: currentStock,
        newStock: calculatedNewStock,
        reason,
        notes: notes.trim(),
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to adjust stock:', err);
      alert(err?.message || 'Failed to update stock and write log.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-ink/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-line overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-line bg-shell/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-accent block">
                Product Stock Adjustment
              </span>
              <h3 className="font-display text-base font-bold text-ink truncate max-w-xs sm:max-w-sm">
                {product.name}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted hover:text-ink hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 font-sans text-xs">
          {/* Current Stock Banner */}
          <div className="p-3.5 rounded-xl border border-line bg-shell/60 flex items-center justify-between font-mono">
            <div>
              <span className="text-[10px] uppercase font-bold text-muted block">
                Current Finished Stock
              </span>
              <span className="text-lg font-bold text-ink">{currentStock} units</span>
            </div>
            {product.sku && (
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-muted block">SKU</span>
                <span className="text-xs font-bold text-slate-700">{product.sku}</span>
              </div>
            )}
          </div>

          {/* Mode Selector */}
          <div>
            <label className="block font-mono text-[10px] font-bold uppercase tracking-wider text-muted mb-1.5">
              Adjustment Mode
            </label>
            <div className="grid grid-cols-2 gap-2 font-mono text-xs">
              <button
                type="button"
                onClick={() => setMode('relative')}
                className={`py-2 px-3 rounded-xl border font-bold transition-all cursor-pointer text-center ${
                  mode === 'relative'
                    ? 'bg-accent/10 border-accent text-accent'
                    : 'border-line bg-white text-muted hover:bg-shell'
                }`}
              >
                Add / Subtract (+ / -)
              </button>

              <button
                type="button"
                onClick={() => setMode('absolute')}
                className={`py-2 px-3 rounded-xl border font-bold transition-all cursor-pointer text-center ${
                  mode === 'absolute'
                    ? 'bg-accent/10 border-accent text-accent'
                    : 'border-line bg-white text-muted hover:bg-shell'
                }`}
              >
                Set Exact Total
              </button>
            </div>
          </div>

          {/* Quantity Input */}
          {mode === 'relative' ? (
            <div>
              <label className="block font-mono text-[10px] font-bold uppercase tracking-wider text-muted mb-1">
                Units to Add or Subtract *
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="1"
                  required
                  placeholder="e.g. 15 (or -3 to deduct)"
                  value={deltaInput}
                  onChange={(e) =>
                    setDeltaInput(e.target.value ? Number(e.target.value) : '')
                  }
                  className="w-full px-3 py-2 text-sm font-mono font-bold text-ink bg-white border border-line rounded-xl outline-none focus:border-accent"
                />
              </div>
              <span className="text-[11px] font-mono text-muted block mt-1">
                Tip: Enter positive number (+10) to restock, or negative (-3) for scrap/damaged.
              </span>
            </div>
          ) : (
            <div>
              <label className="block font-mono text-[10px] font-bold uppercase tracking-wider text-muted mb-1">
                New Target Finished Stock *
              </label>
              <input
                type="number"
                step="1"
                min="0"
                required
                placeholder="e.g. 25"
                value={absoluteInput}
                onChange={(e) =>
                  setAbsoluteInput(e.target.value ? Number(e.target.value) : '')
                }
                className="w-full px-3 py-2 text-sm font-mono font-bold text-ink bg-white border border-line rounded-xl outline-none focus:border-accent"
              />
            </div>
          )}

          {/* Reason Selector */}
          <div>
            <label className="block font-mono text-[10px] font-bold uppercase tracking-wider text-muted mb-1">
              Operational Reason *
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as InventoryAdjustmentReason)}
              className="w-full px-3 py-2 text-xs font-mono text-ink bg-white border border-line rounded-xl outline-none focus:border-accent cursor-pointer"
            >
              {REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Staff Notes */}
          <div>
            <label className="block font-mono text-[10px] font-bold uppercase tracking-wider text-muted mb-1">
              Internal Ledger Note (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Batch run completed on Bambu P1S #2"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs text-ink bg-white border border-line rounded-xl outline-none focus:border-accent"
            />
          </div>

          {/* Summary Preview Box */}
          <div className="p-3.5 rounded-xl border border-line bg-[#FFFDF7] font-mono text-xs space-y-1.5">
            <div className="flex justify-between text-muted">
              <span>Previous Stock:</span>
              <span className="text-ink font-bold">{currentStock} units</span>
            </div>
            <div className="flex justify-between text-muted">
              <span>Stock Adjustment:</span>
              <span
                className={`font-bold flex items-center gap-1 ${
                  calculatedDelta > 0
                    ? 'text-emerald-600'
                    : calculatedDelta < 0
                    ? 'text-rose-600'
                    : 'text-muted'
                }`}
              >
                {calculatedDelta > 0 ? (
                  <TrendingUp className="w-3 h-3" />
                ) : calculatedDelta < 0 ? (
                  <TrendingDown className="w-3 h-3" />
                ) : null}
                {calculatedDelta > 0 ? `+${calculatedDelta}` : calculatedDelta} units
              </span>
            </div>
            <div className="pt-1.5 border-t border-line flex justify-between font-bold text-ink text-sm">
              <span>New Resulting Stock:</span>
              <span>{calculatedNewStock} units</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-line">
            <button
              type="button"
              onClick={onClose}
              className="py-2 px-4 rounded-xl border border-line bg-white font-mono text-xs font-bold text-ink hover:bg-shell transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={adjustStock.isPending || calculatedDelta === 0}
              className="py-2 px-5 rounded-xl bg-accent text-white font-mono text-xs font-bold hover:bg-accent-dark transition-colors shadow-xs disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              {adjustStock.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Commit Stock Change</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
