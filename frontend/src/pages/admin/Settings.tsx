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
  Save,
  Layers,
  Bell,
  Key,
} from 'lucide-react';

import { useLocation, useNavigate } from 'react-router-dom';
import {
  Settings as SettingsType,
  PrivateSettings,
  useStore,
} from '../../store';

import {
  useSettings,
  useUpdateSettings,
  usePrivateSettings,
  useUpdatePrivateSettings
} from '../../hooks/useSettings';
import { PricingSettingsTab } from '../../components/admin/PricingSettingsTab';
import { PrinterProfilesTab } from '../../components/admin/PrinterProfilesTab';
import { useNotification } from '../../components/NotificationContext';

type SettingsTab =
  | 'business'
  | 'pricing'
  | 'printers'
  | 'shipping'
  | 'notifications';

export function Settings() {
  const location = useLocation();
  const navigate = useNavigate();
  const urlTab = new URLSearchParams(location.search).get('tab') as SettingsTab | null;
  const activeTab = urlTab || 'business';

  const setActiveTab = (tab: SettingsTab) => {
    navigate(`/admin/settings?tab=${tab}`, { replace: true });
  };

  const localSettings = useStore((state) => state.settings);
  const notify = useNotification();

  const { data: firestoreSettings, isLoading: isLoadingPub, isError: isErrorPub, refetch: refetchPub } = useSettings();
  const { data: currentPrivateSettings, isLoading: isLoadingPriv, isError: isErrorPriv, refetch: refetchPriv } = usePrivateSettings(true);
  const isLoading = isLoadingPub || isLoadingPriv;
  const isError = isErrorPub || isErrorPriv;
  const refetch = () => { refetchPub(); refetchPriv(); };

  const updateSettings = useUpdateSettings();
  const updatePrivateSettings = useUpdatePrivateSettings();

  const [form, setForm] = useState<SettingsType & PrivateSettings>(localSettings);
  const [showSuccess, setShowSuccess] = useState(false);
  const [zoneInput, setZoneInput] = useState('');

  useEffect(() => {
    if (firestoreSettings) {
      setForm({ ...firestoreSettings, ...(currentPrivateSettings || {}) });
    }
  }, [firestoreSettings, currentPrivateSettings]);

  const updateField = <K extends keyof SettingsType>(
    field: K,
    value: SettingsType[K]
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const updateNestedNotification = (
    key: keyof NonNullable<PrivateSettings['notifications']>,
    value: any
  ) => {
    setForm((current) => ({
      ...current,
      notifications: {
        ...(current.notifications || {
          newOrderAlerts: true,
          quoteAlerts: true,
          lowStockAlerts: true,
          alertEmailRecipient: current.email || '',
        }),
        [key]: value,
      },
    }));
  };


  const handleAddZone = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    e.preventDefault();
    if (!zoneInput.trim()) return;
    const currentZones = form.deliveryZones || [];
    if (!currentZones.includes(zoneInput.trim())) {
      updateField('deliveryZones', [...currentZones, zoneInput.trim()]);
    }
    setZoneInput('');
  };

  const handleRemoveZone = (zoneToRemove: string) => {
    const currentZones = form.deliveryZones || [];
    updateField(
      'deliveryZones',
      currentZones.filter((z) => z !== zoneToRemove)
    );
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      const { notifications, ...publicFields } = form;
      // @ts-ignore
      delete publicFields.adminUsers;

      await updateSettings.mutateAsync({
        ...publicFields,
        businessName: form.businessName?.trim() || 'Shilp Sahayak',
        email: form.email?.trim() || '',
        whatsappNumber: form.whatsappNumber?.trim() || '',
        phone: form.phone?.trim() || '',
        address: form.address?.trim() || '',
        gstin: form.gstin?.trim() || '',
        cin: form.cin?.trim() || '',
        supportHours: form.supportHours?.trim() || '',
        baseFee: Number(form.baseFee) || 0,
        minimumOrderValue: Number(form.minimumOrderValue) || 0,
        defaultGSTRate: Number(form.defaultGSTRate) || 18,
        shippingFlatRate: Number(form.shippingFlatRate) || 0,
        freeShippingThreshold: Number(form.freeShippingThreshold) || 0,
        expressShippingRate: Number(form.expressShippingRate) || 0,
        defaultCourierPartner: form.defaultCourierPartner?.trim() || 'Delhivery',
        upiId: form.upiId?.trim() || '',
        maxCodOrderValue: Number(publicFields.maxCodOrderValue) || 5000,
      });

      await updatePrivateSettings.mutateAsync({
        notifications: notifications ?? {
          newOrderAlerts: true,
          quoteAlerts: true,
          lowStockAlerts: true,
          alertEmailRecipient: 'info.shilpsahayak@gmail.com',
        },
      });

      setShowSuccess(true);
      window.setTimeout(() => {
        setShowSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('Failed to save settings:', error);
      notify({ type: 'error', title: 'Save Failed', message: 'Failed to save settings. Please try again.' });
    }
  };


  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 gap-2">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
        <span className="text-xs font-mono text-muted uppercase tracking-wider">
          Loading platform settings...
        </span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-700 flex items-center justify-between">
        <span>Failed to load platform settings from Firestore.</span>
        <button
          type="button"
          onClick={() => refetch()}
          className="px-3 py-1 bg-white border border-rose-300 rounded-lg text-xs hover:bg-rose-100"
        >
          Retry
        </button>
      </div>
    );
  }

  const tabs: { id: SettingsTab; label: string; icon: any }[] = [
    { id: 'business', label: 'Business Information', icon: Store },
    { id: 'pricing', label: 'Pricing & Slicing Engine', icon: Layers },
    { id: 'printers', label: 'Printers & Production Profiles', icon: Key },
    { id: 'shipping', label: 'Shipping & Delivery', icon: Truck },
    { id: 'notifications', label: 'Operational Alerts', icon: Bell },
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-4">
        <div>
          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-accent block">
            System Administration
          </span>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Platform Settings
          </h1>
          <p className="mt-1 text-xs text-muted font-sans">
            Manage legal business details, custom printing pricing matrix, shipping zones, and admin access.
          </p>
        </div>

        {activeTab !== 'pricing' && activeTab !== 'printers' && (
          <div className="flex items-center gap-3">
            {showSuccess && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">
                <CheckCircle2 className="w-3.5 h-3.5" /> Saved
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                const formEl = document.getElementById('settings-main-form') as HTMLFormElement;
                if (formEl) formEl.requestSubmit();
              }}
              disabled={(updateSettings.isPending || updatePrivateSettings.isPending)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-white hover:bg-accent-dark transition-colors shadow-xs shadow-accent/20 disabled:opacity-50 cursor-pointer"
            >
              {updateSettings.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>{updateSettings.isPending ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Top 6 Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-line pb-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-mono font-bold rounded-lg transition-colors cursor-pointer ${
                isActive
                  ? 'bg-accent text-white shadow-xs'
                  : 'text-muted hover:text-ink hover:bg-shell'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'pricing' ? (
        <PricingSettingsTab />
      ) : activeTab === 'printers' ? (
        <PrinterProfilesTab />
      ) : (
        <form
          id="settings-main-form"
          onSubmit={handleSubmit}
          className="space-y-6 max-w-4xl font-sans"
        >
          {/* TAB 1: BUSINESS INFORMATION */}
          {activeTab === 'business' && (
            <div className="rounded-xl border border-line bg-white p-6 shadow-xs space-y-5">
              <div className="flex items-center gap-2.5 border-b border-line pb-3">
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent shrink-0">
                  <Store className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-display text-base font-bold text-ink">
                    Business & Workshop Information
                  </h2>
                  <p className="text-xs text-muted">
                    Official registered company details for invoices and customer communications.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-mono text-[10px] font-bold uppercase tracking-wider text-muted mb-1">
                    Studio Business Name *
                  </label>
                  <input
                    type="text"
                    value={form.businessName || ''}
                    onChange={(e) => updateField('businessName', e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs font-semibold text-ink bg-white border border-line rounded-lg outline-none focus:border-accent"
                  />
                </div>

                <div>
                  <label className="block font-mono text-[10px] font-bold uppercase tracking-wider text-muted mb-1">
                    Support Email *
                  </label>
                  <input
                    type="email"
                    value={form.email || ''}
                    onChange={(e) => updateField('email', e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs font-mono text-ink bg-white border border-line rounded-lg outline-none focus:border-accent"
                  />
                </div>

                <div>
                  <label className="block font-mono text-[10px] font-bold uppercase tracking-wider text-muted mb-1">
                    Primary Phone Number (Optional)
                  </label>
                  <input
                    type="tel"
                    value={form.phone || ''}
                    onChange={(e) => updateField('phone', e.target.value)}
                    
                    className="w-full px-3 py-2 text-xs font-mono text-ink bg-white border border-line rounded-lg outline-none focus:border-accent"
                  />
                </div>

                <div>
                  <label className="block font-mono text-[10px] font-bold uppercase tracking-wider text-muted mb-1">
                    WhatsApp Customer Hotline (Optional)
                  </label>
                  <input
                    type="tel"
                    value={form.whatsappNumber || ''}
                    onChange={(e) => updateField('whatsappNumber', e.target.value)}
                    
                    className="w-full px-3 py-2 text-xs font-mono text-ink bg-white border border-line rounded-lg outline-none focus:border-accent"
                  />
                </div>

                <div>
                  <label className="block font-mono text-[10px] font-bold uppercase tracking-wider text-muted mb-1">
                    Workshop Support Hours
                  </label>
                  <input
                    type="text"
                    value={form.supportHours || ''}
                    onChange={(e) => updateField('supportHours', e.target.value)}
                    placeholder="Mon - Sat: 9:00 AM - 7:00 PM IST"
                    className="w-full px-3 py-2 text-xs text-ink bg-white border border-line rounded-lg outline-none focus:border-accent"
                  />
                </div>

                <div>
                  <label className="block font-mono text-[10px] font-bold uppercase tracking-wider text-muted mb-1">
                    GSTIN (Tax Registration)
                  </label>
                  <input
                    type="text"
                    value={form.gstin || ''}
                    onChange={(e) => updateField('gstin', e.target.value.toUpperCase())}
                    placeholder="03AAAAA0000A1Z5"
                    className="w-full px-3 py-2 text-xs font-mono text-ink bg-white border border-line rounded-lg outline-none focus:border-accent"
                  />
                </div>

                <div>
                  <label className="block font-mono text-[10px] font-bold uppercase tracking-wider text-muted mb-1">
                    CIN / Corporate Identification
                  </label>
                  <input
                    type="text"
                    value={form.cin || ''}
                    onChange={(e) => updateField('cin', e.target.value.toUpperCase())}
                    placeholder="U72900PB2024PTC123456"
                    className="w-full px-3 py-2 text-xs font-mono text-ink bg-white border border-line rounded-lg outline-none focus:border-accent"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block font-mono text-[10px] font-bold uppercase tracking-wider text-muted mb-1">
                    Physical Workshop & Fabrication Address *
                  </label>
                  <textarea
                    rows={2}
                    value={form.address || ''}
                    onChange={(e) => updateField('address', e.target.value)}
                    required
                    placeholder="Urban Estate Phase 2, Patiala, Punjab 147002, India"
                    className="w-full px-3 py-2 text-xs text-ink bg-white border border-line rounded-lg outline-none focus:border-accent"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SHIPPING & DELIVERY */}
          {activeTab === 'shipping' && (
            <div className="rounded-xl border border-line bg-white p-6 shadow-xs space-y-5">
              <div className="flex items-center gap-2.5 border-b border-line pb-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-display text-base font-bold text-ink">
                    Shipping Rates & Courier Zones
                  </h2>
                  <p className="text-xs text-muted">
                    Configure standard flat rate shipping, free shipping thresholds, and domestic delivery zones.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-mono text-[10px] font-bold uppercase tracking-wider text-muted mb-1">
                    Default Courier Partner
                  </label>
                  <select
                    value={form.defaultCourierPartner || 'Delhivery'}
                    onChange={(e) => updateField('defaultCourierPartner', e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono text-ink bg-white border border-line rounded-lg outline-none focus:border-accent cursor-pointer"
                  >
                    <option value="Delhivery">Delhivery</option>
                    <option value="BlueDart">BlueDart</option>
                    <option value="DTDC">DTDC</option>
                    <option value="India Post (Speed Post)">India Post (Speed Post)</option>
                    <option value="Shadowfax">Shadowfax</option>
                    <option value="Ekart">Ekart</option>
                  </select>
                </div>

                <div>
                  <label className="block font-mono text-[10px] font-bold uppercase tracking-wider text-muted mb-1">
                    Standard Shipping Flat Rate (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.shippingFlatRate}
                    onChange={(e) => updateField('shippingFlatRate', Number(e.target.value))}
                    required
                    className="w-full px-3 py-2 text-xs font-mono font-bold text-ink bg-white border border-line rounded-lg outline-none focus:border-accent"
                  />
                  <span className="text-[10px] text-muted font-mono mt-0.5 block">
                    Applied when cart is below free shipping threshold
                  </span>
                </div>

                <div>
                  <label className="block font-mono text-[10px] font-bold uppercase tracking-wider text-muted mb-1">
                    Free Shipping Threshold (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.freeShippingThreshold}
                    onChange={(e) => updateField('freeShippingThreshold', Number(e.target.value))}
                    required
                    className="w-full px-3 py-2 text-xs font-mono font-bold text-ink bg-white border border-line rounded-lg outline-none focus:border-accent"
                  />
                  <span className="text-[10px] text-muted font-mono mt-0.5 block">
                    Orders with total ≥ this amount get free delivery
                  </span>
                </div>

                <div>
                  <label className="block font-mono text-[10px] font-bold uppercase tracking-wider text-muted mb-1">
                    Express Air Shipping Rate (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.expressShippingRate ?? 199}
                    onChange={(e) => updateField('expressShippingRate', Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-mono font-bold text-ink bg-white border border-line rounded-lg outline-none focus:border-accent"
                  />
                  <span className="text-[10px] text-muted font-mono mt-0.5 block">
                    Fast-track courier air transit fee
                  </span>
                </div>

                <div className="md:col-span-2 space-y-2 pt-2 border-t border-line">
                  <label className="block font-mono text-[10px] font-bold uppercase tracking-wider text-muted">
                    Covered Domestic Delivery Zones
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {(form.deliveryZones || ['All India (Domestic)', 'Metro Tier-1', 'Punjab Local Studio Delivery']).map((zone) => (
                      <span
                        key={zone}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-shell border border-line text-ink font-mono text-xs"
                      >
                        <span>{zone}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveZone(zone)}
                          className="text-muted hover:text-rose-600 font-bold ml-1 cursor-pointer"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>

                  <div className="flex gap-2 pt-1">
                    <input
                      type="text"
                      placeholder="Add delivery zone (e.g. North East Air, Tier 3 Pincodes)..."
                      value={zoneInput}
                      onChange={(e) => setZoneInput(e.target.value)}
                      onKeyDown={handleAddZone}
                      className="flex-1 px-3 py-1.5 text-xs bg-white border border-line rounded-lg outline-none focus:border-accent"
                    />
                    <button
                      type="button"
                      onClick={handleAddZone}
                      className="px-3 py-1.5 rounded-lg border border-line bg-shell hover:bg-line text-xs font-mono font-semibold"
                    >
                      Add Zone
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: OPERATIONAL NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <div className="rounded-xl border border-line bg-white p-6 shadow-xs space-y-5">
              <div className="flex items-center gap-2.5 border-b border-line pb-3">
                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-display text-base font-bold text-ink">
                    Operational Alert Preferences
                  </h2>
                  <p className="text-xs text-muted">
                    Control instant notifications sent to the workshop operations team.
                  </p>
                </div>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-mono text-[10px] font-bold uppercase tracking-wider text-muted mb-1">
                    Notification Recipient Email *
                  </label>
                  <input
                    type="email"
                    value={form.notifications?.alertEmailRecipient || form.email || ''}
                    onChange={(e) => updateNestedNotification('alertEmailRecipient', e.target.value)}
                    placeholder="info.shilpsahayak@gmail.com"
                    className="w-full px-3 py-2 text-xs font-mono text-ink bg-white border border-line rounded-lg outline-none focus:border-accent"
                  />
                </div>

                <div className="divide-y divide-line border border-line rounded-lg overflow-hidden bg-shell/20">
                  <div className="p-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="font-bold text-ink">New Customer Order Alerts</p>
                      <p className="text-[11px] text-muted">
                        Receive instant alert email with order summary and dispatch address when order is placed.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={form.notifications?.newOrderAlerts ?? true}
                      onChange={(e) => updateNestedNotification('newOrderAlerts', e.target.checked)}
                      className="rounded border-line text-accent focus:ring-accent w-4 h-4 cursor-pointer"
                    />
                  </div>

                  <div className="p-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="font-bold text-ink">Custom 3D CAD Quote Request Alerts</p>
                      <p className="text-[11px] text-muted">
                        Alert workshop engineers when a customer uploads a new 3D STL CAD model for quoting.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={form.notifications?.quoteAlerts ?? true}
                      onChange={(e) => updateNestedNotification('quoteAlerts', e.target.checked)}
                      className="rounded border-line text-accent focus:ring-accent w-4 h-4 cursor-pointer"
                    />
                  </div>

                  <div className="p-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="font-bold text-ink">Low-Stock Inventory Warnings</p>
                      <p className="text-[11px] text-muted">
                        Notify inventory manager when finished product stock falls below the low-stock safety threshold.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={form.notifications?.lowStockAlerts ?? true}
                      onChange={(e) => updateNestedNotification('lowStockAlerts', e.target.checked)}
                      className="rounded border-line text-accent focus:ring-accent w-4 h-4 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          </form>
      )}
    </div>
  );
}

export default Settings;
