import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  X,
  FileBox,
  ExternalLink,
  Download,
  Send,
  ShoppingCart,
  MessageCircle,
  Receipt,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Layers,
  Box,
  User,
  Mail,
  Phone,
  HelpCircle,
  Loader2,
  TrendingUp,
} from 'lucide-react';
import { Quote, QuoteStatus } from '../../../hooks/useQuotes';
import { usePricingSettings } from '../../../hooks/usePricingSettings';
import { calculateInternalCost } from '../../../services/pricing/calculateQuote';
import { formatINR } from '../../../services/pricing/pricingUtils';
import { parseSTLFromUrl } from '../../../services/model/modelParser';
import { ParsedModelResult } from '../../../services/model/modelTypes';
import { ThreeModelViewer } from '../../custom-printing/ThreeModelViewer';
import { StatusBadge } from '../shared/StatusBadge';
import { ConfirmationDialog } from '../shared/ConfirmationDialog';

export interface QuoteReviewDrawerProps {
  quote: Quote | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateStatus: (id: string, status: QuoteStatus) => Promise<void>;
  onSendQuote: (
    id: string,
    price: number,
    expiryDays: number,
    adminNotes?: string
  ) => Promise<void>;
  onConvertToOrder: (quote: Quote) => Promise<void>;
  isConverting?: boolean;
}

const COLOR_MAP: Record<string, string> = {
  black: '#1e293b',
  white: '#f8fafc',
  grey: '#64748b',
  gray: '#64748b',
  red: '#ef4444',
  blue: '#2563eb',
  green: '#10b981',
  yellow: '#f59e0b',
  orange: '#f97316',
  purple: '#8b5cf6',
  silver: '#94a3b8',
  gold: '#d97706',
};

const EXPIRY_OPTIONS = [
  { value: 2, label: '48 Hours (2 Days)' },
  { value: 3, label: '3 Days' },
  { value: 7, label: '7 Days (1 Week - Recommended)' },
  { value: 14, label: '14 Days (2 Weeks)' },
  { value: 30, label: '30 Days (1 Month)' },
  { value: 0, label: 'No Expiration' },
];

const QUOTE_STATUS_OPTIONS: { value: QuoteStatus; label: string }[] = [
  { value: 'New Request', label: 'New Request' },
  { value: 'Under Review', label: 'Under Review' },
  { value: 'Quote Sent', label: 'Quote Sent' },
  { value: 'Approved', label: 'Approved' },
  { value: 'Converted to Order', label: 'Converted to Order' },
  { value: 'Rejected', label: 'Rejected' },
  { value: 'Cancelled', label: 'Cancelled' },
];

export const QuoteReviewDrawer: React.FC<QuoteReviewDrawerProps> = ({
  quote,
  isOpen,
  onClose,
  onUpdateStatus,
  onSendQuote,
  onConvertToOrder,
  isConverting = false,
}) => {
  const { data: pricingData } = usePricingSettings();

  // 3D Model Parsing State
  const [parsedModel, setParsedModel] = useState<ParsedModelResult | null>(null);
  const [isLoadingModel, setIsLoadingModel] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);

  // Form State
  const [adminPriceInput, setAdminPriceInput] = useState<number | ''>('');
  const [adminNotesInput, setAdminNotesInput] = useState('');
  const [expiryDays, setExpiryDays] = useState(7);
  const [showCostReceipt, setShowCostReceipt] = useState(true);
  const [isSendingQuote, setIsSendingQuote] = useState(false);
  const [showConvertConfirm, setShowConvertConfirm] = useState(false);

  // Sync inputs when quote changes
  useEffect(() => {
    if (quote) {
      setAdminPriceInput(quote.adminPrice || quote.systemEstimatedPrice || quote.estimatedPrice || '');
      setAdminNotesInput(quote.adminNotes || quote.adminAdjustmentReason || '');
      setExpiryDays(7);
      setModelError(null);
      setParsedModel(null);

      const isStl =
        quote.fileName?.toLowerCase().endsWith('.stl') ||
        quote.fileUrl?.toLowerCase().includes('.stl') ||
        quote.requestType === '3d-model';

      if (quote.fileUrl && isStl) {
        setIsLoadingModel(true);
        parseSTLFromUrl(quote.fileUrl, quote.fileName || 'model.stl')
          .then((result) => {
            if (result.success) {
              setParsedModel(result);
              setModelError(null);
            } else {
              setParsedModel(null);
              setModelError(result.errorMessage || 'Failed to parse 3D geometry.');
            }
          })
          .catch((err) => {
            setParsedModel(null);
            setModelError(err?.message || 'Failed to download 3D file.');
          })
          .finally(() => {
            setIsLoadingModel(false);
          });
      } else {
        setIsLoadingModel(false);
      }
    }
  }, [quote]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !quote) return null;

  const isExpired = quote.expiresAt
    ? new Date(quote.expiresAt).getTime() < Date.now()
    : false;

  const effectiveStatus =
    isExpired && (quote.status === 'Quote Sent' || quote.status === 'Quoted')
      ? 'Expired'
      : quote.status;

  const colorHex = quote.color
    ? COLOR_MAP[quote.color.toLowerCase()] || '#2563eb'
    : '#2563eb';

  // Calculate internal production cost
  const quoteMaterial =
    (pricingData?.materials || []).find(
      (m) => m.name.toLowerCase() === (quote.material || '').toLowerCase()
    ) || pricingData?.materials?.[0];

  const internalCost =
    quote.estimatedWeight && pricingData?.pricingConfig && quoteMaterial
      ? calculateInternalCost(
          {
            materialWeightGrams: quote.estimatedWeight,
            printTimeHours:
              quote.estimatedPrintTimeHours ||
              Math.round((quote.estimatedWeight / 15) * 10) / 10,
            material: quoteMaterial,
            quantity: quote.quantity || 1,
            packagingIncluded: quote.packagingIncluded || false,
          },
          pricingData.pricingConfig
        )
      : null;

  const adminPriceNum = typeof adminPriceInput === 'number' ? adminPriceInput : 0;
  const productionCostNum = internalCost?.productionCost || 0;
  const grossMargin =
    adminPriceNum > 0 && productionCostNum > 0
      ? Math.round(((adminPriceNum - productionCostNum) / adminPriceNum) * 100)
      : null;

  const isImageFile =
    quote.requestType === 'image' ||
    Boolean(quote.fileName?.match(/\.(jpg|jpeg|png|webp|gif|svg)$/i)) ||
    Boolean(quote.fileUrl?.match(/\.(jpg|jpeg|png|webp|gif|svg)/i));

  const handleSendQuoteClick = async () => {
    if (!adminPriceNum || adminPriceNum <= 0) {
      alert('Please enter a valid quoted price greater than ₹0.');
      return;
    }
    try {
      setIsSendingQuote(true);
      await onSendQuote(quote.id, adminPriceNum, expiryDays, adminNotesInput.trim());
    } catch (err: any) {
      console.error('Error in handleSendQuoteClick:', err);
      alert(err?.message || 'Failed to send quote.');
    } finally {
      setIsSendingQuote(false);
    }
  };

  const whatsappMessage = `Hello ${quote.customerName || 'there'}! Your custom 3D printing quotation from Shilp Sahayak for "${quote.fileName || 'your 3D model'}" is ready.\n\n*Quoted Price:* ₹${(adminPriceNum || quote.adminPrice || quote.estimatedPrice || 0).toLocaleString('en-IN')}\n*Material:* ${quote.material || 'PLA'} (${quote.color || 'Standard'})\n*Quantity:* ${quote.quantity || 1} unit(s)\n\nPlease review and approve on our portal: ${window.location.origin}/account`;

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-hidden bg-ink/50 backdrop-blur-xs flex justify-end transition-opacity animate-in fade-in duration-200">
        {/* Click outside to close backdrop */}
        <div className="absolute inset-0 cursor-pointer" onClick={onClose} />

        {/* Drawer Container */}
        <div className="relative w-full max-w-3xl bg-white h-full shadow-2xl flex flex-col z-10 overflow-hidden border-l border-line animate-in slide-in-from-right duration-300">
          {/* Drawer Header */}
          <div className="px-6 py-4 border-b border-line bg-shell/50 flex items-center justify-between gap-4 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shrink-0">
                <FileBox className="w-5 h-5" />
              </div>
              <div className="truncate">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-display text-base font-bold text-ink truncate">
                    Quote #{quote.id.slice(0, 8)}
                  </h2>
                  <StatusBadge status={effectiveStatus} type="quote" showDot />
                </div>
                <p className="text-xs font-mono text-muted truncate mt-0.5">
                  Requested on {new Date(quote.date).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={quote.status}
                onChange={(e) => onUpdateStatus(quote.id, e.target.value as QuoteStatus)}
                className="py-1.5 px-3 rounded-lg border border-line bg-white text-xs font-mono font-semibold text-ink outline-none focus:border-accent cursor-pointer"
                title="Change quote status"
              >
                {QUOTE_STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-lg text-muted hover:text-ink hover:bg-slate-100 transition-colors cursor-pointer"
                title="Close drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Drawer Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Model Preview Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                  <Box className="w-4 h-4 text-accent" />
                  <span>Model / Reference Inspection</span>
                </span>

                {quote.fileUrl && (
                  <a
                    href={quote.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={quote.fileName || 'model-file'}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-line bg-white hover:bg-shell text-xs font-mono font-bold text-ink transition-colors cursor-pointer shadow-2xs"
                  >
                    <Download className="w-3.5 h-3.5 text-accent" />
                    <span>Download Original Asset</span>
                    <ExternalLink className="w-3 h-3 text-muted" />
                  </a>
                )}
              </div>

              {/* 3D Viewer or Image Preview Card */}
              <div className="rounded-2xl border border-line bg-slate-50 overflow-hidden relative">
                {isImageFile && quote.fileUrl ? (
                  <div className="p-4 flex flex-col items-center justify-center min-h-[340px] bg-slate-900/5">
                    <img
                      src={quote.fileUrl}
                      alt={quote.fileName || 'Reference'}
                      className="max-h-[380px] max-w-full rounded-xl object-contain shadow-md"
                    />
                    <p className="mt-3 text-xs font-mono text-muted text-center">
                      Customer Reference Image: {quote.fileName || 'Uploaded image'}
                    </p>
                  </div>
                ) : quote.fileUrl ? (
                  <div>
                    <ThreeModelViewer
                      geometry={parsedModel?.geometry || null}
                      colorHex={colorHex}
                      isLoading={isLoadingModel}
                      error={modelError}
                      dimensions={parsedModel?.dimensions}
                    />

                    {/* Geometry Spec Overlay Footer */}
                    {parsedModel?.success && (
                      <div className="p-3 bg-white border-t border-line grid grid-cols-2 sm:grid-cols-4 gap-3 text-center font-mono">
                        <div className="p-2 rounded-lg bg-shell/70 border border-line/60">
                          <span className="text-[10px] uppercase font-bold text-muted block">Bounding Box</span>
                          <span className="text-xs font-bold text-ink">
                            {parsedModel.dimensions.x}×{parsedModel.dimensions.y}×{parsedModel.dimensions.z}{' '}
                            <span className="text-[10px] text-muted">mm</span>
                          </span>
                        </div>
                        <div className="p-2 rounded-lg bg-shell/70 border border-line/60">
                          <span className="text-[10px] uppercase font-bold text-muted block">Signed Volume</span>
                          <span className="text-xs font-bold text-ink">
                            {parsedModel.volumeCm3}{' '}
                            <span className="text-[10px] text-muted">cm³</span>
                          </span>
                        </div>
                        <div className="p-2 rounded-lg bg-shell/70 border border-line/60">
                          <span className="text-[10px] uppercase font-bold text-muted block">Mesh Triangles</span>
                          <span className="text-xs font-bold text-ink">
                            {parsedModel.triangleCount.toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div className="p-2 rounded-lg bg-shell/70 border border-line/60">
                          <span className="text-[10px] uppercase font-bold text-muted block">Build Plate</span>
                          <span className={`text-xs font-bold ${parsedModel.exceedsBuildVolume ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {parsedModel.exceedsBuildVolume ? 'Exceeds Envelope' : 'Fits Volume'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-8 text-center text-xs font-mono text-muted space-y-2">
                    <HelpCircle className="w-8 h-8 text-muted mx-auto" />
                    <p>No 3D file or image uploaded. Customer submitted an idea or conceptual query.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Customer Details & Specs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Customer Info Card */}
              <div className="p-4 rounded-xl border border-line bg-white space-y-3 shadow-2xs">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-accent" />
                  <span>Customer Contact</span>
                </span>
                <div className="space-y-2 text-xs font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-muted">Name:</span>
                    <span className="font-bold text-ink">{quote.customerName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted">Email:</span>
                    <a
                      href={`mailto:${quote.customerEmail}`}
                      className="text-accent hover:underline flex items-center gap-1"
                    >
                      <Mail className="w-3 h-3" />
                      <span>{quote.customerEmail}</span>
                    </a>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted">Phone:</span>
                    <a
                      href={`tel:${quote.customerPhone}`}
                      className="text-accent hover:underline flex items-center gap-1"
                    >
                      <Phone className="w-3 h-3" />
                      <span>{quote.customerPhone}</span>
                    </a>
                  </div>
                  {quote.customerId && (
                    <div className="flex items-center justify-between pt-1 border-t border-line/60 text-[10px]">
                      <span className="text-muted">User UID:</span>
                      <span className="text-slate-500">{quote.customerId.slice(0, 12)}...</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Slicing Specs Card */}
              <div className="p-4 rounded-xl border border-line bg-white space-y-3 shadow-2xs">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-accent" />
                  <span>Fabrication Specifications</span>
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="bg-shell p-2 rounded-lg border border-line/60">
                    <span className="text-[10px] text-muted uppercase block">Material / Color</span>
                    <span className="font-bold text-ink">{quote.material || 'PLA'} / {quote.color || 'Standard'}</span>
                  </div>
                  <div className="bg-shell p-2 rounded-lg border border-line/60">
                    <span className="text-[10px] text-muted uppercase block">Infill / Layer</span>
                    <span className="font-bold text-ink">
                      {quote.infill ? `${quote.infill}%` : '20%'} / {quote.layerHeight ? `${quote.layerHeight}mm` : '0.2mm'}
                    </span>
                  </div>
                  <div className="bg-shell p-2 rounded-lg border border-line/60">
                    <span className="text-[10px] text-muted uppercase block">Weight / Volume</span>
                    <span className="font-bold text-ink">
                      {quote.estimatedWeight || '—'}g / {quote.volume || '—'}cm³
                    </span>
                  </div>
                  <div className="bg-shell p-2 rounded-lg border border-line/60">
                    <span className="text-[10px] text-muted uppercase block">Est. Print Time</span>
                    <span className="font-bold text-ink">
                      {quote.estimatedPrintTimeHours ? `~${quote.estimatedPrintTimeHours} hrs` : '—'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Customer Message & Custom Requirements */}
            {(quote.notes || quote.description) && (
              <div className="p-4 rounded-xl border border-line bg-paper space-y-1.5 shadow-2xs">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-muted block">
                  Customer Instructions & Requirements:
                </span>
                <p className="text-xs text-ink whitespace-pre-line font-sans leading-relaxed">
                  {quote.notes || quote.description}
                </p>
              </div>
            )}

            {/* Internal Cost Breakdown (Collapsible) */}
            {internalCost && (
              <div className="rounded-xl border border-line overflow-hidden shadow-2xs">
                <button
                  type="button"
                  onClick={() => setShowCostReceipt(!showCostReceipt)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-shell/70 hover:bg-shell text-xs font-mono font-bold text-ink transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2 text-accent">
                    <Receipt className="w-4 h-4" />
                    <span>Internal Real Production Cost Breakdown</span>
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-ink font-bold">
                      Base Cost: {formatINR(internalCost.productionCost)}
                    </span>
                    {showCostReceipt ? (
                      <ChevronUp className="w-4 h-4 text-muted" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted" />
                    )}
                  </div>
                </button>

                {showCostReceipt && (
                  <div className="p-4 bg-[#FFFDF7] font-mono text-xs space-y-2 border-t border-line">
                    <div className="flex justify-between text-muted">
                      <span>Filament Plastic ({quote.estimatedWeight}g @ {quote.material})</span>
                      <span>{formatINR(internalCost.materialCost)}</span>
                    </div>
                    <div className="flex justify-between text-muted">
                      <span>Electricity Consumption</span>
                      <span>{formatINR(internalCost.electricityCost)}</span>
                    </div>
                    <div className="flex justify-between text-muted">
                      <span>Machine Wear & Maintenance</span>
                      <span>{formatINR(internalCost.machineWearCost)}</span>
                    </div>
                    <div className="flex justify-between text-muted">
                      <span>Failure Buffer ({pricingData?.pricingConfig?.failureBufferPercent || 10}%)</span>
                      <span>{formatINR(internalCost.failureBufferCost)}</span>
                    </div>
                    <div className="flex justify-between text-muted">
                      <span>Finishing & Post-Processing Labor</span>
                      <span>{formatINR(internalCost.labourCost)}</span>
                    </div>
                    <div className="flex justify-between text-muted">
                      <span>Base Workshop Service Fee</span>
                      <span>{formatINR(internalCost.baseServiceFee)}</span>
                    </div>
                    {quote.packagingIncluded && (
                      <div className="flex justify-between text-muted">
                        <span>Safe Packaging & Cushioning</span>
                        <span>{formatINR(internalCost.packagingCost)}</span>
                      </div>
                    )}
                    <div className="pt-2 border-t-2 border-ink flex justify-between font-bold text-ink text-sm">
                      <span>Total Real Manufacturing Cost</span>
                      <span>{formatINR(internalCost.productionCost)}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Pricing Workspace Card */}
            <div className="p-5 rounded-2xl border border-line bg-shell/40 space-y-4 shadow-2xs">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-accent block">
                Admin Quotation & Pricing Engine
              </span>

              {/* Side-by-Side Comparison */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-white border border-line text-center">
                  <span className="text-[10px] font-mono uppercase font-bold text-muted block">
                    Calculated Estimate
                  </span>
                  <span className="text-base font-mono font-bold text-slate-700 mt-1 block">
                    ₹{(quote.systemEstimatedPrice || quote.estimatedPrice || 0).toLocaleString('en-IN')}
                  </span>
                  <span className="text-[10px] font-mono text-muted">From slicer formula</span>
                </div>

                <div className="p-3 rounded-xl bg-white border border-line text-center">
                  <span className="text-[10px] font-mono uppercase font-bold text-muted block">
                    Internal Cost Floor
                  </span>
                  <span className="text-base font-mono font-bold text-slate-700 mt-1 block">
                    {internalCost ? formatINR(internalCost.productionCost) : '—'}
                  </span>
                  <span className="text-[10px] font-mono text-muted">Real production cost</span>
                </div>

                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                  <span className="text-[10px] font-mono uppercase font-bold text-emerald-800 block">
                    Quoted Admin Price
                  </span>
                  <span className="text-lg font-mono font-bold text-emerald-700 mt-1 block">
                    {adminPriceNum > 0 ? `₹${adminPriceNum.toLocaleString('en-IN')}` : 'Not Quoted Yet'}
                  </span>
                  {grossMargin !== null && (
                    <span className="text-[10px] font-mono font-bold text-emerald-700 flex items-center justify-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      <span>{grossMargin}% gross margin</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Price Input & Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-muted mb-1.5">
                    Quoted Price to Customer (₹) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm font-bold text-muted">
                      ₹
                    </span>
                    <input
                      type="number"
                      placeholder="e.g. 850"
                      value={adminPriceInput}
                      onChange={(e) =>
                        setAdminPriceInput(e.target.value ? Number(e.target.value) : '')
                      }
                      className="w-full pl-8 pr-3 py-2 text-sm font-mono font-bold text-ink bg-white border border-line rounded-xl outline-none focus:border-accent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-muted mb-1.5">
                    Quote Expiry Window
                  </label>
                  <select
                    value={expiryDays}
                    onChange={(e) => setExpiryDays(Number(e.target.value))}
                    className="w-full py-2 px-3 text-xs font-mono text-ink bg-white border border-line rounded-xl outline-none focus:border-accent cursor-pointer"
                  >
                    {EXPIRY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-muted mb-1.5">
                  Admin Price Adjustment Notes / Rationale (Internal)
                </label>
                <input
                  type="text"
                  placeholder="e.g. High precision 0.12mm layer height + manual support post-processing"
                  value={adminNotesInput}
                  onChange={(e) => setAdminNotesInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-sans text-ink bg-white border border-line rounded-xl outline-none focus:border-accent"
                />
              </div>

              {/* Action Buttons inside workspace */}
              <div className="flex flex-wrap items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleSendQuoteClick}
                  disabled={isSendingQuote || !adminPriceNum || adminPriceNum <= 0}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-accent hover:bg-accent-dark text-white font-mono text-xs font-bold transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isSendingQuote ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  <span>Send Quote & Email Customer</span>
                </button>

                {quote.customerPhone && (
                  <a
                    href={`https://wa.me/91${quote.customerPhone.replace(/\D/g, '').slice(-10)}?text=${encodeURIComponent(
                      whatsappMessage
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-mono text-xs font-bold transition-colors shadow-xs"
                  >
                    <MessageCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>WhatsApp</span>
                  </a>
                )}
              </div>
            </div>

            {/* Converted Order Info or Conversion Callout */}
            {quote.orderId ? (
              <div className="p-4 rounded-xl border border-purple-200 bg-purple-50 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-purple-600 text-white flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-mono text-xs font-bold text-purple-900 block">
                      Converted to Order #{quote.orderId.slice(0, 8)}
                    </span>
                    <span className="text-[11px] font-mono text-purple-700">
                      This quote has been converted into an active fabrication order.
                    </span>
                  </div>
                </div>

                <Link
                  to={`/admin/orders/${quote.orderId}`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-mono text-xs font-bold transition-colors shadow-xs shrink-0"
                >
                  <span>View Order</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-line bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
                <div>
                  <span className="font-mono text-xs font-bold text-ink block">
                    Ready to start manufacturing?
                  </span>
                  <span className="text-xs text-muted font-sans">
                    Instantly convert this CAD quote into an official confirmed customer order.
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setShowConvertConfirm(true)}
                  disabled={isConverting}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-mono text-xs font-bold transition-colors shadow-xs cursor-pointer shrink-0 disabled:opacity-50"
                >
                  {isConverting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ShoppingCart className="w-4 h-4" />
                  )}
                  <span>Convert to Order</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Dialog for Conversion */}
      <ConfirmationDialog
        isOpen={showConvertConfirm}
        title={`Convert Quote #${quote.id.slice(0, 8)} to Order?`}
        description={`This will generate a confirmed production order for "${quote.customerName}" with a total amount of ₹${(
          adminPriceNum ||
          quote.adminPrice ||
          quote.systemEstimatedPrice ||
          quote.estimatedPrice ||
          0
        ).toLocaleString('en-IN')}. The quote status will update to 'Converted to Order'.`}
        confirmText="Convert to Order"
        variant="primary"
        isLoading={isConverting}
        onConfirm={async () => {
          setShowConvertConfirm(false);
          await onConvertToOrder(quote);
        }}
        onClose={() => setShowConvertConfirm(false)}
      />
    </>
  );
};
