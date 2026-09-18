import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  X,
  Mail,
  Phone,
  MessageCircle,
  ShoppingBag,
  FileBox,
  MapPin,
  Building,
  ExternalLink,
  Loader2,
  Save,
} from 'lucide-react';
import { Order } from '../../../hooks/useOrders';
import { Quote } from '../../../hooks/useQuotes';
import { StatusBadge } from '../shared/StatusBadge';

export interface CustomerRecord {
  id: string; // uid or email
  uid?: string;
  name: string;
  email: string;
  phone: string;
  customerType: 'Retail' | 'Corporate' | 'Custom Printing' | string;
  companyName?: string;
  gstin?: string;
  adminNotes?: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
  totalSpent: number;
  ordersCount: number;
  quotesCount: number;
  orders: Order[];
  quotes: Quote[];
  joinedDate?: string;
  lastActiveDate?: string;
}

export interface CustomerProfileDrawerProps {
  isOpen: boolean;
  customer: CustomerRecord | null;
  onClose: () => void;
  onSaveAdminData?: (
    id: string,
    data: {
      adminNotes?: string;
      customerType?: string;
      companyName?: string;
      gstin?: string;
    }
  ) => Promise<void>;
}

export const CustomerProfileDrawer: React.FC<CustomerProfileDrawerProps> = ({
  isOpen,
  customer,
  onClose,
  onSaveAdminData,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'quotes' | 'addresses' | 'crm'>('overview');
  const [adminNotes, setAdminNotes] = useState('');
  const [customerType, setCustomerType] = useState('Retail');
  const [companyName, setCompanyName] = useState('');
  const [gstin, setGstin] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (customer) {
      setAdminNotes(customer.adminNotes || '');
      setCustomerType(customer.customerType || 'Retail');
      setCompanyName(customer.companyName || '');
      setGstin(customer.gstin || '');
      setActiveTab('overview');
    }
  }, [customer, isOpen]);

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

  if (!isOpen || !customer) return null;

  const aov =
    customer.ordersCount > 0
      ? Math.round(customer.totalSpent / customer.ordersCount)
      : 0;

  const handleSaveCrm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSaveAdminData) return;
    try {
      setIsSaving(true);
      await onSaveAdminData(customer.id, {
        adminNotes: adminNotes.trim(),
        customerType,
        companyName: companyName.trim(),
        gstin: gstin.trim().toUpperCase(),
      });
      alert('Customer CRM details updated successfully!');
    } catch (err: any) {
      alert(err?.message || 'Failed to update CRM data.');
    } finally {
      setIsSaving(false);
    }
  };

  const whatsappUrl = customer.phone
    ? `https://wa.me/91${customer.phone.replace(/\D/g, '').slice(-10)}?text=${encodeURIComponent(
        `Hello ${customer.name || 'valued customer'}, greetings from Shilp Sahayak team!`
      )}`
    : null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-ink/50 backdrop-blur-xs flex justify-end transition-opacity animate-in fade-in duration-200">
      {/* Backdrop */}
      <div className="absolute inset-0 cursor-pointer" onClick={onClose} />

      {/* Drawer */}
      <div className="relative w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col z-10 border-l border-line animate-in slide-in-from-right duration-300">
        {/* Drawer Header */}
        <div className="px-6 py-4 border-b border-line bg-shell/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center font-mono font-bold text-accent text-sm shrink-0">
              {customer.name ? customer.name.charAt(0).toUpperCase() : 'C'}
            </div>
            <div className="truncate">
              <div className="flex items-center gap-2">
                <h2 className="font-display text-base font-bold text-ink truncate">
                  {customer.name || 'Guest Customer'}
                </h2>
                <span
                  className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-bold border ${
                    customer.customerType === 'Corporate'
                      ? 'bg-purple-50 text-purple-700 border-purple-200'
                      : customer.customerType === 'Custom Printing'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}
                >
                  {customer.customerType}
                </span>
              </div>
              <p className="text-xs font-mono text-muted truncate mt-0.5">
                {customer.email}
              </p>
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

        {/* Tab Navigation */}
        <div className="px-6 bg-white border-b border-line flex items-center gap-1 overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-3.5 border-b-2 text-xs font-mono font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'overview'
                ? 'border-accent text-accent'
                : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            Overview
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`py-3 px-3.5 border-b-2 text-xs font-mono font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'orders'
                ? 'border-accent text-accent'
                : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            Orders ({customer.ordersCount})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('quotes')}
            className={`py-3 px-3.5 border-b-2 text-xs font-mono font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'quotes'
                ? 'border-accent text-accent'
                : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            Quotes ({customer.quotesCount})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('addresses')}
            className={`py-3 px-3.5 border-b-2 text-xs font-mono font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'addresses'
                ? 'border-accent text-accent'
                : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            Addresses
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('crm')}
            className={`py-3 px-3.5 border-b-2 text-xs font-mono font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'crm'
                ? 'border-accent text-accent'
                : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            CRM & Notes
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Financial Metrics Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-center">
                <div className="p-3 bg-shell/60 rounded-xl border border-line">
                  <span className="text-[10px] uppercase font-bold text-muted block">Lifetime Spend</span>
                  <span className="text-base font-bold text-accent mt-0.5 block">
                    ₹{customer.totalSpent.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="p-3 bg-shell/60 rounded-xl border border-line">
                  <span className="text-[10px] uppercase font-bold text-muted block">Orders Placed</span>
                  <span className="text-base font-bold text-ink mt-0.5 block">
                    {customer.ordersCount}
                  </span>
                </div>

                <div className="p-3 bg-shell/60 rounded-xl border border-line">
                  <span className="text-[10px] uppercase font-bold text-muted block">Average Order</span>
                  <span className="text-base font-bold text-slate-700 mt-0.5 block">
                    ₹{aov.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="p-3 bg-shell/60 rounded-xl border border-line">
                  <span className="text-[10px] uppercase font-bold text-muted block">CAD Quotes</span>
                  <span className="text-base font-bold text-blue-700 mt-0.5 block">
                    {customer.quotesCount}
                  </span>
                </div>
              </div>

              {/* Contact Information Card */}
              <div className="p-4 rounded-xl border border-line bg-white space-y-3 shadow-2xs">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-muted block">
                  Contact Details
                </span>

                <div className="space-y-2 text-xs font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-muted flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-muted" />
                      <span>Email:</span>
                    </span>
                    <a
                      href={`mailto:${customer.email}`}
                      className="font-bold text-accent hover:underline"
                    >
                      {customer.email}
                    </a>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-muted flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-muted" />
                      <span>Phone:</span>
                    </span>
                    <span className="font-bold text-ink">
                      {customer.phone || 'Not provided'}
                    </span>
                  </div>

                  {whatsappUrl && (
                    <div className="pt-2 border-t border-line flex justify-end">
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-800 font-mono text-xs font-bold hover:bg-emerald-100 transition-colors shadow-2xs"
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Chat on WhatsApp</span>
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* B2B / Corporate Card */}
              {(customer.companyName || customer.gstin) && (
                <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/50 space-y-2 text-xs font-mono">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-800 flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-purple-600" />
                    <span>Corporate / GST Account</span>
                  </span>
                  {customer.companyName && (
                    <div className="flex justify-between">
                      <span className="text-purple-700">Company:</span>
                      <span className="font-bold text-purple-900">{customer.companyName}</span>
                    </div>
                  )}
                  {customer.gstin && (
                    <div className="flex justify-between">
                      <span className="text-purple-700">GSTIN:</span>
                      <span className="font-bold text-purple-900">{customer.gstin}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Staff Notes snippet if present */}
              {customer.adminNotes && (
                <div className="p-4 rounded-xl border border-line bg-paper space-y-1 shadow-2xs">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted block">
                    Internal Staff Notes:
                  </span>
                  <p className="text-xs text-ink whitespace-pre-line font-sans italic">
                    "{customer.adminNotes}"
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ORDER HISTORY */}
          {activeTab === 'orders' && (
            <div className="space-y-3">
              {customer.orders.length === 0 ? (
                <div className="p-8 text-center text-xs font-mono text-muted border border-line rounded-xl bg-shell/20">
                  <ShoppingBag className="w-8 h-8 text-muted mx-auto mb-2" />
                  <p>No orders placed by this customer yet.</p>
                </div>
              ) : (
                customer.orders.map((order) => (
                  <div
                    key={order.id}
                    className="p-4 rounded-xl border border-line bg-white hover:border-accent/30 transition-all flex items-center justify-between gap-4 shadow-2xs"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-accent">
                          #{order.id.slice(0, 8)}
                        </span>
                        <StatusBadge status={order.status} type="order" showDot />
                      </div>
                      <p className="text-[11px] font-mono text-muted">
                        {order.date ? new Date(order.date).toLocaleDateString('en-IN') : '—'} ·{' '}
                        {(order.items || []).length} item(s)
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-mono text-sm font-bold text-ink">
                        ₹{(order.total || 0).toLocaleString('en-IN')}
                      </span>
                      <Link
                        to={`/admin/orders/${order.id}`}
                        className="p-1.5 rounded-lg border border-line bg-white hover:bg-shell text-muted hover:text-accent transition-colors"
                        title="View Order Details"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 3: CUSTOM QUOTES */}
          {activeTab === 'quotes' && (
            <div className="space-y-3">
              {customer.quotes.length === 0 ? (
                <div className="p-8 text-center text-xs font-mono text-muted border border-line rounded-xl bg-shell/20">
                  <FileBox className="w-8 h-8 text-muted mx-auto mb-2" />
                  <p>No custom CAD quotes submitted by this customer.</p>
                </div>
              ) : (
                customer.quotes.map((quote) => (
                  <div
                    key={quote.id}
                    className="p-4 rounded-xl border border-line bg-white hover:border-accent/30 transition-all flex items-center justify-between gap-4 shadow-2xs"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-accent">
                          #{quote.id.slice(0, 8)}
                        </span>
                        <StatusBadge status={quote.status} type="quote" showDot />
                      </div>
                      <p className="text-xs font-semibold text-ink truncate">
                        {quote.fileName || '3D CAD Model'}
                      </p>
                      <p className="text-[11px] font-mono text-muted">
                        {quote.material || 'PLA'} · Qty: {quote.quantity || 1}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-mono text-sm font-bold text-ink">
                        ₹{(quote.adminPrice || quote.systemEstimatedPrice || quote.estimatedPrice || 0).toLocaleString('en-IN')}
                      </span>
                      <Link
                        to="/admin/quotes"
                        className="p-1.5 rounded-lg border border-line bg-white hover:bg-shell text-muted hover:text-accent transition-colors"
                        title="Open in Custom Quotes"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 4: ADDRESSES */}
          {activeTab === 'addresses' && (
            <div className="space-y-3 font-mono text-xs">
              {customer.address?.line1 ? (
                <div className="p-4 rounded-xl border border-line bg-white space-y-1.5 shadow-2xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted block">
                    Primary Delivery Address
                  </span>
                  <p className="font-semibold text-ink">{customer.address.line1}</p>
                  {customer.address.line2 && <p className="text-muted">{customer.address.line2}</p>}
                  <p className="text-muted">
                    {customer.address.city}, {customer.address.state} — {customer.address.pincode}
                  </p>
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-muted border border-line rounded-xl bg-shell/20">
                  <MapPin className="w-8 h-8 text-muted mx-auto mb-2" />
                  <p>No saved delivery address on file.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: CRM & INTERNAL NOTES */}
          {activeTab === 'crm' && (
            <form onSubmit={handleSaveCrm} className="space-y-4 font-sans text-xs">
              <div>
                <label className="block font-mono text-[10px] font-bold uppercase tracking-wider text-muted mb-1">
                  Customer Segment
                </label>
                <select
                  value={customerType}
                  onChange={(e) => setCustomerType(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono font-semibold text-ink bg-white border border-line rounded-xl outline-none focus:border-accent cursor-pointer"
                >
                  <option value="Retail">Retail Consumer</option>
                  <option value="Corporate">Corporate / B2B Client</option>
                  <option value="Custom Printing">Custom Printing Studio Client</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-mono text-[10px] font-bold uppercase tracking-wider text-muted mb-1">
                    Company Name
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Acme Robotics Pvt Ltd"
                    className="w-full px-3 py-2 text-xs text-ink bg-white border border-line rounded-xl outline-none focus:border-accent"
                  />
                </div>

                <div>
                  <label className="block font-mono text-[10px] font-bold uppercase tracking-wider text-muted mb-1">
                    GSTIN (Tax ID)
                  </label>
                  <input
                    type="text"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value.toUpperCase())}
                    placeholder="e.g. 07AAAAA0000A1Z5"
                    className="w-full px-3 py-2 text-xs font-mono uppercase text-ink bg-white border border-line rounded-xl outline-none focus:border-accent"
                  />
                </div>
              </div>

              <div>
                <label className="block font-mono text-[10px] font-bold uppercase tracking-wider text-muted mb-1">
                  Staff CRM Notes (Internal only)
                </label>
                <textarea
                  rows={4}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Record customer preferences, dispatch instructions, special requests..."
                  className="w-full px-3 py-2 text-xs text-ink bg-white border border-line rounded-xl outline-none focus:border-accent"
                />
              </div>

              <div className="flex justify-end pt-2 border-t border-line">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-white font-mono text-xs font-bold hover:bg-accent-dark transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Save CRM Notes</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
