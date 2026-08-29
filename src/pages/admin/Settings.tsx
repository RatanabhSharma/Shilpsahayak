import {
  useEffect,
  useState,
  type FormEvent,
} from 'react';

import {
  CheckCircle2,
  Loader2,
  Store,
  Truck,
  CreditCard,
  Save,
} from 'lucide-react';

import {
  Settings as SettingsType,
  useStore,
} from '../../store';

import {
  useSettings,
  useUpdateSettings,
} from '../../hooks/useSettings';

export function Settings() {
  const localSettings = useStore((state) => state.settings);

  const {
    data: firestoreSettings,
    isLoading,
    isError,
  } = useSettings();

  const updateSettings = useUpdateSettings();

  const [form, setForm] = useState<SettingsType>(localSettings);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (firestoreSettings) {
      setForm(firestoreSettings);
    }
  }, [firestoreSettings]);

  const updateField = <K extends keyof SettingsType>(
    field: K,
    value: SettingsType[K]
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      await updateSettings.mutateAsync({
        businessName: form.businessName.trim(),
        email: form.email.trim(),
        whatsappNumber: form.whatsappNumber.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        shippingFlatRate: Number(form.shippingFlatRate) || 0,
        freeShippingThreshold: Number(form.freeShippingThreshold) || 0,
        upiId: form.upiId.trim(),
      });

      setShowSuccess(true);
      window.setTimeout(() => {
        setShowSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 gap-2">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
        <span className="text-xs font-mono text-muted uppercase tracking-wider">Loading settings...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-700">
        Failed to load platform settings. Please refresh the page and try again.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-4">
        <div>
          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-accent block">
            Studio Configuration
          </span>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Platform Settings
          </h1>
          <p className="mt-1 text-xs text-muted">
            Configure workshop business contact info, pan-India delivery shipping rates, and UPI payments.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {showSuccess && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">
              <CheckCircle2 className="w-3.5 h-3.5" /> Saved
            </span>
          )}
          <button
            type="submit"
            disabled={updateSettings.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-white hover:bg-accent-dark transition-colors shadow-xs shadow-accent/20 disabled:opacity-50"
          >
            {updateSettings.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            {updateSettings.isPending ? 'Saving Changes...' : 'Save Settings'}
          </button>
        </div>
      </div>

      {/* Business Information Card */}
      <div className="rounded-xl border border-line bg-white p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 border-b border-line pb-3">
          <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent shrink-0">
            <Store className="w-4 h-4" />
          </div>
          <h2 className="font-display text-base font-bold text-ink">Business Information</h2>
        </div>

        <div className="space-y-4 font-sans text-xs">
          <div>
            <label className="block font-mono text-[10px] font-bold uppercase tracking-wider text-muted mb-1">
              Studio Business Name *
            </label>
            <input
              type="text"
              name="businessName"
              value={form.businessName}
              onChange={(e) => updateField('businessName', e.target.value)}
              required
              className="w-full px-3 py-2 text-xs font-semibold text-ink bg-white border border-line rounded-lg outline-none focus:border-accent"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-mono text-[10px] font-bold uppercase tracking-wider text-muted mb-1">
                Business Support Email *
              </label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
                placeholder="hello@shilpsahayak.com"
                required
                className="w-full px-3 py-2 text-xs font-mono text-ink bg-white border border-line rounded-lg outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="block font-mono text-[10px] font-bold uppercase tracking-wider text-muted mb-1">
                Phone Number *
              </label>
              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                required
                className="w-full px-3 py-2 text-xs font-mono text-ink bg-white border border-line rounded-lg outline-none focus:border-accent"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-mono text-[10px] font-bold uppercase tracking-wider text-muted mb-1">
                WhatsApp Hotline Number *
              </label>
              <input
                type="tel"
                name="whatsappNumber"
                value={form.whatsappNumber}
                onChange={(e) => updateField('whatsappNumber', e.target.value)}
                required
                className="w-full px-3 py-2 text-xs font-mono text-ink bg-white border border-line rounded-lg outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="block font-mono text-[10px] font-bold uppercase tracking-wider text-muted mb-1">
                Studio Address *
              </label>
              <input
                type="text"
                name="address"
                value={form.address}
                onChange={(e) => updateField('address', e.target.value)}
                required
                className="w-full px-3 py-2 text-xs text-ink bg-white border border-line rounded-lg outline-none focus:border-accent"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Shipping & Delivery Card */}
      <div className="rounded-xl border border-line bg-white p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 border-b border-line pb-3">
          <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent shrink-0">
            <Truck className="w-4 h-4" />
          </div>
          <h2 className="font-display text-base font-bold text-ink">Shipping & Delivery Rates</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-sans text-xs">
          <div>
            <label className="block font-mono text-[10px] font-bold uppercase tracking-wider text-muted mb-1">
              Standard Shipping Flat Rate (₹) *
            </label>
            <input
              type="number"
              min="0"
              name="shippingFlatRate"
              value={form.shippingFlatRate}
              onChange={(e) => updateField('shippingFlatRate', Number(e.target.value))}
              required
              className="w-full px-3 py-2 text-xs font-mono font-bold text-ink bg-white border border-line rounded-lg outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="block font-mono text-[10px] font-bold uppercase tracking-wider text-muted mb-1">
              Free Shipping Order Threshold (₹) *
            </label>
            <input
              type="number"
              min="0"
              name="freeShippingThreshold"
              value={form.freeShippingThreshold}
              onChange={(e) => updateField('freeShippingThreshold', Number(e.target.value))}
              required
              className="w-full px-3 py-2 text-xs font-mono font-bold text-ink bg-white border border-line rounded-lg outline-none focus:border-accent"
            />
          </div>
        </div>
      </div>

      {/* Payment Settings Card */}
      <div className="rounded-xl border border-line bg-white p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 border-b border-line pb-3">
          <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent shrink-0">
            <CreditCard className="w-4 h-4" />
          </div>
          <h2 className="font-display text-base font-bold text-ink">Payment Gateways</h2>
        </div>

        <div className="font-sans text-xs space-y-3">
          <div>
            <label className="block font-mono text-[10px] font-bold uppercase tracking-wider text-muted mb-1">
              UPI Merchant VPA / ID
            </label>
            <input
              type="text"
              name="upiId"
              value={form.upiId}
              onChange={(e) => updateField('upiId', e.target.value)}
              placeholder="shilpsahayak@upi"
              className="w-full px-3 py-2 text-xs font-mono font-bold text-ink bg-white border border-line rounded-lg outline-none focus:border-accent"
            />
            <p className="mt-1 text-[11px] text-muted">
              Used for QR code generation during checkout on the storefront.
            </p>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={updateSettings.isPending}
          className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-5 py-2.5 text-xs font-semibold text-white hover:bg-accent-dark transition-colors shadow-xs shadow-accent/20 disabled:opacity-50"
        >
          {updateSettings.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {updateSettings.isPending ? 'Saving Changes...' : 'Save All Settings'}
        </button>
      </div>
    </form>
  );
}

export default Settings;



