export type StatusCategory =
  | 'order'
  | 'payment'
  | 'quote'
  | 'product'
  | 'stock'
  | 'shipping'
  | 'general';

export interface StatusBadgeProps {
  status: string;
  type?: StatusCategory;
  className?: string;
  showDot?: boolean;
}

export function getStatusColor(
  status: string,
  _type: StatusCategory = 'general'
): { bg: string; text: string; border: string; dot: string } {
  const normalized = (status || '').toLowerCase().trim();

  // Success / Completed / Positive
  if (
    [
      'delivered',
      'paid',
      'approved',
      'accepted',
      'completed',
      'active',
      'in stock',
      'healthy',
      'stock healthy',
    ].includes(normalized)
  ) {
    return {
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
      dot: 'bg-emerald-500',
    };
  }

  // Error / Danger / Failed / Rejected
  if (
    [
      'cancelled',
      'failed',
      'rejected',
      'out of stock',
      'archived',
      'expired',
      'returned',
    ].includes(normalized)
  ) {
    return {
      bg: 'bg-rose-50',
      text: 'text-rose-700',
      border: 'border-rose-200',
      dot: 'bg-rose-500',
    };
  }

  // Warning / Attention / Low stock / Under Review / Processing
  if (
    [
      'pending',
      'low stock',
      'low stock warning',
      'under review',
      'draft',
      'partially refunded',
    ].includes(normalized)
  ) {
    return {
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      border: 'border-amber-200',
      dot: 'bg-amber-500',
    };
  }

  // Primary / Active Progress / In-flight / Quote Sent / Shipped
  if (
    [
      'shipped',
      'in transit',
      'quote sent',
      'quoted',
      'confirmed',
      'ready to ship',
      'new request',
    ].includes(normalized)
  ) {
    return {
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      border: 'border-blue-200',
      dot: 'bg-blue-500',
    };
  }

  // Purple / Workshop Fabrication / QC / Converted
  if (
    [
      'printing',
      'quality check',
      'processing',
      'converted to order',
      'converted',
    ].includes(normalized)
  ) {
    return {
      bg: 'bg-purple-50',
      text: 'text-purple-700',
      border: 'border-purple-200',
      dot: 'bg-purple-500',
    };
  }

  // Neutral / Refunded / Slate fallback
  return {
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-200',
    dot: 'bg-slate-400',
  };
}

export function StatusBadge({
  status,
  type = 'general',
  className = '',
  showDot = false,
}: StatusBadgeProps) {
  const { bg, text, border, dot } = getStatusColor(status, type);

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider ${bg} ${text} ${border} ${className}`}
    >
      {showDot && (
        <span
          className={`h-1.5 w-1.5 rounded-full ${dot} shrink-0 animate-pulse`}
          aria-hidden="true"
        />
      )}
      <span>{status}</span>
    </span>
  );
}
