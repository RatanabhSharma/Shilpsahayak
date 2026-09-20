import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  CheckCircle2,
  Loader2,
  Save,
  ExternalLink,
} from 'lucide-react';

import { useProducts } from '../../hooks/useProducts';
import {
  DEFAULT_HOMEPAGE_SETTINGS,
  HomepageSettings,
  useHomepage,
  useUpdateHomepage,
} from '../../hooks/useHomepage';

// Phase 2 Shared Admin Components
import { PageHeader } from '../../components/admin/shared/PageHeader';

export function AdminHome() {
  const { data: products = [], isLoading: productsLoading } = useProducts();
  const { data: savedSettings, isLoading: settingsLoading } = useHomepage();
  const updateHomepage = useUpdateHomepage();

  const [form, setForm] = useState<HomepageSettings>(DEFAULT_HOMEPAGE_SETTINGS);
  const [showSuccess, setShowSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  const activeProducts = useMemo(
    () => products.filter((product) => product.active !== false),
    [products]
  );

  useEffect(() => {
    if (!savedSettings) return;

    setForm({
      ...DEFAULT_HOMEPAGE_SETTINGS,
      ...savedSettings,
      featuredProductIds: [...savedSettings.featuredProductIds],
    });
  }, [savedSettings]);

  // Toggle Products
  const toggleProduct = (
    field: 'featuredProductIds',
    id: string
  ) => {
    setForm((current) => {
      const currentIds = current[field];
      const exists = currentIds.includes(id);
      const nextIds = exists
        ? currentIds.filter((item) => item !== id)
        : [...currentIds, id];
      return { ...current, [field]: nextIds };
    });
  };

  // Save changes
  const handleSave = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);

    try {
      await updateHomepage.mutateAsync({
        ...form,
        featuredProductIds: form.featuredProductIds.filter((id) =>
          activeProducts.some((product) => product.id === id)
        ),
      });

      setShowSuccess(true);
      window.setTimeout(() => setShowSuccess(false), 3500);
    } catch (err: any) {
      console.error('Failed to save storefront settings:', err);
      alert(err?.message || 'Failed to save storefront settings.');
    } finally {
      setSaving(false);
    }
  };

  if (settingsLoading || productsLoading) {
    return (
      <div className="flex items-center justify-center h-64 gap-2">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
        <span className="text-xs font-mono text-muted uppercase tracking-wider">
          Loading Storefront Settings...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Storefront Content Manager"
        description="Curate featured collections and promotional content for the public storefront."
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin' },
          { label: 'Storefront' },
        ]}
        actions={
          <div className="flex items-center gap-2.5">
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-line bg-white hover:bg-shell text-ink font-mono text-xs font-bold transition-all shadow-2xs"
            >
              <span>Live Storefront Preview</span>
              <ExternalLink className="w-3.5 h-3.5 text-accent" />
            </a>

            <button
              type="button"
              onClick={() => handleSave()}
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-accent hover:bg-accent-dark text-white font-mono text-xs font-bold transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>Publish Changes</span>
            </button>
          </div>
        }
      />

      {/* Success Toast */}
      {showSuccess && (
        <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 font-mono text-xs font-bold flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Storefront changes successfully published and live!</span>
          </div>
          <a href="/" target="_blank" rel="noopener noreferrer" className="underline">
            View Live Site ➔
          </a>
        </div>
      )}

      {/* FEATURED COLLECTIONS & SHILP STUDIO PROMO */}
      <div className="space-y-6">
        {/* Section Titles */}
        <div className="p-5 rounded-2xl border border-line bg-white shadow-2xs space-y-4">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-accent block">
            Featured Grid Titles
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-muted mb-1">
                Section Headline
              </label>
              <input
                type="text"
                value={form.featuredTitle || ''}
                onChange={(e) => setForm({ ...form, featuredTitle: e.target.value })}
                placeholder="Featured 3D Creations"
                className="w-full px-3 py-2 text-xs font-bold text-ink bg-white border border-line rounded-xl outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-muted mb-1">
                Section Subtitle
              </label>
              <input
                type="text"
                value={form.featuredSubtitle || ''}
                onChange={(e) => setForm({ ...form, featuredSubtitle: e.target.value })}
                placeholder="Handcrafted 3D printed lighting, desk accessories..."
                className="w-full px-3 py-2 text-xs text-ink bg-white border border-line rounded-xl outline-none focus:border-accent"
              />
            </div>
          </div>
        </div>

        {/* Product Picker Grid */}
        <div className="p-5 rounded-2xl border border-line bg-white shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-accent block">
                Select Featured Products ({form.featuredProductIds.length} Selected)
              </span>
              <span className="text-xs text-muted">
                Click to toggle which products are highlighted on the storefront homepage.
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[400px] overflow-y-auto pr-2">
            {activeProducts.map((p) => {
              const isSelected = form.featuredProductIds.includes(p.id);
              return (
                <div
                  key={p.id}
                  onClick={() => toggleProduct('featuredProductIds', p.id)}
                  className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-accent bg-accent/5 shadow-2xs'
                      : 'border-line bg-white hover:bg-shell/40'
                  }`}
                >
                  <img
                    src={p.image}
                    alt={p.name}
                    className="w-12 h-12 rounded-lg object-contain bg-shell border border-line shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-xs truncate text-ink">{p.name}</p>
                    <p className="font-mono text-[10px] text-muted uppercase mt-0.5 truncate">
                      {p.category || 'Uncategorized'}
                    </p>
                  </div>
                  {isSelected && (
                    <CheckCircle2 className="w-4 h-4 text-accent ml-auto shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Shilp Studio Custom Promo Panel */}
        <div className="p-5 rounded-2xl border border-line bg-white shadow-2xs space-y-4">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-accent block">
            Custom Printing / Studio Promo
          </span>
          <p className="text-xs text-muted font-sans -mt-2">
            Configure the call-to-action text for the interactive 3D studio upload section.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="md:col-span-2">
              <label className="block font-mono text-[10px] font-bold uppercase tracking-wider text-muted mb-1">
                Headline / Main Title
              </label>
              <input
                type="text"
                value={form.customPromoTitle || ''}
                onChange={(e) => setForm({ ...form, customPromoTitle: e.target.value })}
                placeholder="Have a 3D Model? Upload your STL & get an instant quote."
                className="w-full px-3 py-2 text-xs font-bold text-ink bg-white border border-line rounded-xl outline-none focus:border-accent"
              />
            </div>
            
            <div>
              <label className="block font-mono text-[10px] font-bold uppercase tracking-wider text-muted mb-1">
                CTA Button Text
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={form.customPromoButtonText || ''}
                  onChange={(e) =>
                    setForm({ ...form, customPromoButtonText: e.target.value })
                  }
                  placeholder="Explore Collection"
                  className="w-full px-3 py-2 text-xs font-mono text-ink bg-white border border-line rounded-xl outline-none focus:border-accent"
                />
              </div>
            </div>

            <div>
              <label className="block font-mono text-[10px] font-bold uppercase tracking-wider text-muted mb-1">
                CTA Target Route
              </label>
              <input
                type="text"
                value={form.customPromoButtonLink || ''}
                onChange={(e) =>
                  setForm({ ...form, customPromoButtonLink: e.target.value })
                }
                placeholder="/shop or /shilp-studio"
                className="w-full px-3 py-2 text-xs font-mono text-ink bg-white border border-line rounded-xl outline-none focus:border-accent"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
