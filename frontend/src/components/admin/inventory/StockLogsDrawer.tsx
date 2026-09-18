import { useEffect } from 'react';
import {
  X,
  History,
  TrendingUp,
  TrendingDown,
  Loader2,
  Calendar,
  User,
  Package,
} from 'lucide-react';
import { Product } from '../../../hooks/useProducts';
import { useInventoryLogs } from '../../../hooks/useInventoryLogs';

export interface StockLogsDrawerProps {
  isOpen: boolean;
  product: Product | null;
  onClose: () => void;
}

export const StockLogsDrawer = ({
  isOpen,
  product,
  onClose,
}: StockLogsDrawerProps) => {
  const { data: logs = [], isLoading } = useInventoryLogs(product?.id);

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

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-ink/50 backdrop-blur-xs flex justify-end transition-opacity animate-in fade-in duration-200">
      {/* Backdrop */}
      <div className="absolute inset-0 cursor-pointer" onClick={onClose} />

      {/* Drawer Container */}
      <div className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col z-10 border-l border-line animate-in slide-in-from-right duration-300">
        {/* Drawer Header */}
        <div className="px-6 py-4 border-b border-line bg-shell/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shrink-0">
              <History className="w-5 h-5" />
            </div>
            <div className="truncate">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-accent block">
                Stock Audit Ledger
              </span>
              <h3 className="font-display text-base font-bold text-ink truncate">
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

        {/* Current Stock Snapshot */}
        <div className="px-6 py-3 bg-shell/50 border-b border-line flex items-center justify-between font-mono text-xs">
          <div>
            <span className="text-muted text-[10px] uppercase block font-bold">Current Stock</span>
            <span className="font-bold text-ink text-sm">{product.stock} units</span>
          </div>
          {product.sku && (
            <div className="text-right">
              <span className="text-muted text-[10px] uppercase block font-bold">SKU</span>
              <span className="font-bold text-slate-700">{product.sku}</span>
            </div>
          )}
        </div>

        {/* Logs Timeline List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-48 gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-accent" />
              <span className="text-xs font-mono text-muted uppercase">Loading audit ledger...</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-xs font-mono text-muted space-y-2 border border-line rounded-xl bg-shell/20">
              <Package className="w-8 h-8 text-muted mx-auto" />
              <p>No stock adjustments recorded yet for this product.</p>
              <p className="text-[10px] text-muted">
                Future adjustments will automatically generate an immutable audit trail here.
              </p>
            </div>
          ) : (
            <div className="relative border-l-2 border-line ml-3 pl-4 space-y-6">
              {logs.map((log) => {
                const isPositive = log.delta > 0;
                const isNegative = log.delta < 0;

                return (
                  <div key={log.id} className="relative space-y-1.5">
                    {/* Circle Node */}
                    <div
                      className={`absolute -left-[23px] top-1 w-3.5 h-3.5 rounded-full border-2 border-white ${
                        isPositive
                          ? 'bg-emerald-500'
                          : isNegative
                          ? 'bg-rose-500'
                          : 'bg-slate-400'
                      }`}
                    />

                    {/* Header Row */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span
                        className={`inline-flex items-center gap-1 font-mono text-xs font-bold px-2 py-0.5 rounded-full border ${
                          isPositive
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : isNegative
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-slate-50 text-slate-700 border-slate-200'
                        }`}
                      >
                        {isPositive ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : isNegative ? (
                          <TrendingDown className="w-3 h-3" />
                        ) : null}
                        <span>
                          {isPositive ? `+${log.delta}` : log.delta} units
                        </span>
                      </span>

                      <span className="text-[11px] font-mono text-muted flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>
                          {new Date(log.timestamp).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </span>
                    </div>

                    {/* Stock Progression & Reason */}
                    <div className="p-3 rounded-xl border border-line bg-shell/40 space-y-1.5 text-xs font-mono">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted">Stock Progression:</span>
                        <span className="font-bold text-ink">
                          {log.previousStock} → {log.newStock} units
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted">Operational Reason:</span>
                        <span className="font-bold text-accent">{log.reason}</span>
                      </div>

                      {log.notes && (
                        <p className="text-[11px] text-ink font-sans pt-1 border-t border-line/60 italic">
                          "{log.notes}"
                        </p>
                      )}

                      <div className="pt-1 text-[10px] text-muted flex items-center gap-1">
                        <User className="w-3 h-3 text-muted" />
                        <span>By {log.adminEmail || 'Admin'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
