/**
 * Shilp Sahayak — Notification & Confirm Dialog System
 *
 * Provides:
 *   useNotification()  → notify({ type, title, message, duration? })
 *   useConfirmDialog() → confirm({ title, message, confirmLabel?, cancelLabel?, variant? }): Promise<boolean>
 *
 * Styled per Shilp Sahayak design system:
 *   - Paper background #F0F4F8, white surfaces, ink #141414, accent #FF4D00
 *   - ARIA: role="alert" (live region) for toasts, role="dialog" aria-modal for confirms
 *   - Keyboard: Escape dismisses, Tab/Shift+Tab focus-traps inside confirm dialogs
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

/* ============================================================
   Types
   ============================================================ */

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface NotificationOptions {
  type: NotificationType;
  title: string;
  message?: string;
  /** Auto-dismiss delay in ms. Pass 0 to never auto-dismiss. Default: 5000 (success/info), 8000 (error/warning) */
  duration?: number;
}

interface ToastItem extends NotificationOptions {
  id: string;
}

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** 'danger' uses rose/red confirm button; default uses accent */
  variant?: 'default' | 'danger';
}

/* ============================================================
   Context values
   ============================================================ */

interface NotificationContextValue {
  notify: (options: NotificationOptions) => void;
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);
const ConfirmContext = createContext<ConfirmContextValue | undefined>(undefined);

/* ============================================================
   Toast icons
   ============================================================ */

const ICONS: Record<NotificationType, React.ReactNode> = {
  success: <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" aria-hidden="true" />,
  error: <XCircle className="h-5 w-5 text-rose-500 shrink-0" aria-hidden="true" />,
  warning: <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" aria-hidden="true" />,
  info: <Info className="h-5 w-5 text-sky-500 shrink-0" aria-hidden="true" />,
};

const TOAST_STYLES: Record<NotificationType, string> = {
  success: 'border-emerald-200 bg-white',
  error:   'border-rose-200 bg-white',
  warning: 'border-amber-200 bg-white',
  info:    'border-sky-200 bg-white',
};

const TOAST_TITLE_STYLES: Record<NotificationType, string> = {
  success: 'text-emerald-800',
  error:   'text-rose-800',
  warning: 'text-amber-800',
  info:    'text-sky-800',
};

/* ============================================================
   Single Toast Component
   ============================================================ */

interface ToastProps {
  item: ToastItem;
  onDismiss: (id: string) => void;
}

function Toast({ item, onDismiss }: ToastProps) {
  const [visible, setVisible] = useState(false);

  // Animate in
  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  // Auto-dismiss
  useEffect(() => {
    const delay = item.duration ?? (item.type === 'error' || item.type === 'warning' ? 8000 : 5000);
    if (delay === 0) return;
    const timer = setTimeout(() => onDismiss(item.id), delay);
    return () => clearTimeout(timer);
  }, [item.id, item.duration, item.type, onDismiss]);

  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      className={[
        'flex items-start gap-3 rounded-2xl border p-4 shadow-card',
        'transition-all duration-300 ease-out max-w-sm w-full',
        TOAST_STYLES[item.type],
        visible
          ? 'translate-x-0 opacity-100'
          : 'translate-x-8 opacity-0',
      ].join(' ')}
    >
      {ICONS[item.type]}

      <div className="min-w-0 flex-1">
        <p className={`font-display text-sm font-bold leading-snug ${TOAST_TITLE_STYLES[item.type]}`}>
          {item.title}
        </p>
        {item.message && (
          <p className="mt-0.5 font-sans text-xs text-muted leading-relaxed">
            {item.message}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={() => onDismiss(item.id)}
        aria-label="Dismiss notification"
        className="ml-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-shell hover:text-ink transition-colors"
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}

/* ============================================================
   Toast Container
   ============================================================ */

function ToastContainer({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null;

  return createPortal(
    <div
      aria-label="Notifications"
      className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none"
      style={{ maxWidth: 'min(calc(100vw - 2rem), 380px)' }}
    >
      {toasts.map((item) => (
        <div key={item.id} className="pointer-events-auto">
          <Toast item={item} onDismiss={onDismiss} />
        </div>
      ))}
    </div>,
    document.body
  );
}

/* ============================================================
   Confirm Dialog Component
   ============================================================ */

interface ConfirmState {
  options: ConfirmOptions;
  resolve: (result: boolean) => void;
}

function ConfirmDialog({
  state,
  onClose,
}: {
  state: ConfirmState;
  onClose: (result: boolean) => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const { options } = state;
  const isDanger = options.variant === 'danger';
  const confirmLabel = options.confirmLabel ?? 'Confirm';
  const cancelLabel = options.cancelLabel ?? 'Cancel';

  // Focus trap + Escape key
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;

    // Focus first focusable element inside dialog
    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable && focusable.length > 0) {
      focusable[0].focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose(false);
        return;
      }
      if (e.key !== 'Tab' || !dialogRef.current) return;

      const items = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      );
      if (items.length === 0) return;

      const first = items[0];
      const last = items[items.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previousFocus?.focus();
    };
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
      aria-hidden="false"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose(false);
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby={options.message ? 'confirm-dialog-description' : undefined}
        className="w-full max-w-md rounded-3xl border border-line bg-white shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-start justify-between gap-3 border-b border-line p-5 ${isDanger ? 'bg-rose-50/60' : 'bg-shell/60'}`}>
          <h2
            id="confirm-dialog-title"
            className="font-display text-lg font-bold text-ink leading-snug"
          >
            {options.title}
          </h2>
          <button
            type="button"
            onClick={() => onClose(false)}
            aria-label="Close dialog"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-muted hover:bg-shell hover:text-ink transition-colors"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        {options.message && (
          <div className="px-5 pt-4 pb-2">
            <p
              id="confirm-dialog-description"
              className="font-sans text-sm text-muted leading-relaxed"
            >
              {options.message}
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 border-t border-line bg-shell p-4 mt-2">
          <button
            type="button"
            onClick={() => onClose(false)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-line bg-transparent px-4 h-9 text-xs font-semibold text-ink hover:bg-white hover:border-ink/20 transition-all"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => onClose(true)}
            className={[
              'inline-flex items-center justify-center gap-2 rounded-xl border px-4 h-9 text-xs font-semibold text-white transition-all',
              isDanger
                ? 'border-rose-600 bg-rose-600 hover:bg-rose-700 hover:border-rose-700'
                : 'border-accent bg-accent hover:bg-[#e04600] hover:border-[#e04600]',
            ].join(' ')}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ============================================================
   Provider
   ============================================================ */

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const counterRef = useRef(0);

  const notify = useCallback((options: NotificationOptions) => {
    counterRef.current += 1;
    const id = `notif-${Date.now()}-${counterRef.current}`;
    setToasts((prev) => [...prev, { ...options, id }]);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      setConfirmState({ options, resolve });
    });
  }, []);

  const handleConfirmClose = useCallback(
    (result: boolean) => {
      if (confirmState) {
        confirmState.resolve(result);
        setConfirmState(null);
      }
    },
    [confirmState]
  );

  return (
    <NotificationContext.Provider value={{ notify }}>
      <ConfirmContext.Provider value={{ confirm }}>
        {children}
        <ToastContainer toasts={toasts} onDismiss={dismiss} />
        {confirmState && (
          <ConfirmDialog state={confirmState} onClose={handleConfirmClose} />
        )}
      </ConfirmContext.Provider>
    </NotificationContext.Provider>
  );
}

/* ============================================================
   Hooks
   ============================================================ */

/**
 * Show styled toast notifications (success / error / warning / info).
 * Must be used inside <NotificationProvider>.
 */
export function useNotification(): (options: NotificationOptions) => void {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotification must be used inside <NotificationProvider>.');
  }
  return ctx.notify;
}

/**
 * Show a styled confirm dialog. Returns Promise<boolean> (true = confirmed, false = cancelled/dismissed).
 * Must be used inside <NotificationProvider>.
 */
export function useConfirmDialog(): (options: ConfirmOptions) => Promise<boolean> {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error('useConfirmDialog must be used inside <NotificationProvider>.');
  }
  return ctx.confirm;
}

