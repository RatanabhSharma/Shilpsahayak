import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import {
  CheckCircle2,
  Loader2,
  Save,
  ExternalLink,
  Plus,
  Trash2,
  Upload,
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
import { uploadHeroVideo, uploadProductImage } from '../../utils/uploadFile';
import toast from 'react-hot-toast';

export function AdminHome() {
  const { data: products = [], isLoading: productsLoading } = useProducts();
  const { data: savedSettings, isLoading: settingsLoading } = useHomepage();
  const updateHomepage = useUpdateHomepage();

  const [form, setForm] = useState<HomepageSettings>(DEFAULT_HOMEPAGE_SETTINGS);
  const [showSuccess, setShowSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isUploadingHeroVideo, setIsUploadingHeroVideo] = useState(false);
  const [isUploadingHeroImage, setIsUploadingHeroImage] = useState(false);
  const [isUploadingHeroSlide, setIsUploadingHeroSlide] = useState(false);

  const activeProducts = useMemo(
    () => products.filter((product) => product.active !== false),
    [products]
  );

  useEffect(() => {
    if (!savedSettings) return;

    setForm({
      ...DEFAULT_HOMEPAGE_SETTINGS,
      ...savedSettings,
      hero: {
        ...DEFAULT_HOMEPAGE_SETTINGS.hero,
        ...savedSettings.hero,
      },
      featuredProductIds: [...savedSettings.featuredProductIds],
    });
  }, [savedSettings]);

  const handleHeroImageUpload = async (
    event: ChangeEvent<HTMLInputElement>,
    target: 'image' | 'slideshow'
  ) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;

    const setUploading = target === 'image' ? setIsUploadingHeroImage : setIsUploadingHeroSlide;
    setUploading(true);
    try {
      const url = await uploadProductImage(file);
      setForm((current) => ({
        ...current,
        hero: {
          ...current.hero,
          ...(target === 'image'
            ? { heroImageUrl: url }
            : { heroSlideshowImageUrls: [...(current.hero.heroSlideshowImageUrls || []), url] }),
        },
      }));
    } catch (error) {
      console.error('Failed to upload homepage hero image:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload hero image.');
    } finally {
      setUploading(false);
    }
  };

  const removeHeroSlide = (index: number) => {
    setForm((current) => ({
      ...current,
      hero: {
        ...current.hero,
        heroSlideshowImageUrls: (current.hero.heroSlideshowImageUrls || []).filter(
          (_, slideIndex) => slideIndex !== index
        ),
      },
    }));
  };

  const handleHeroVideoUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;

    setIsUploadingHeroVideo(true);
    try {
      const url = await uploadHeroVideo(file);
      setForm((current) => ({
        ...current,
        hero: { ...current.hero, heroVideoUrl: url },
      }));
      toast.success('Hero video uploaded. Publish changes to make it live.');
    } catch (error) {
      console.error('Failed to upload homepage hero video:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload hero video.');
    } finally {
      setIsUploadingHeroVideo(false);
    }
  };

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
      toast.error(err?.message || 'Failed to save storefront settings.');
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

      
        {/* HERO CONFIGURATION */}
        <div className="p-5 rounded-2xl border border-line bg-white shadow-2xs space-y-4">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-accent block">
            Hero Configuration
          </span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-muted mb-1">
                Badge Text
              </label>
              <input
                type="text"
                value={form.hero?.badgeText || ''}
                onChange={(e) => setForm({ ...form, hero: { ...form.hero!, badgeText: e.target.value } })}
                placeholder="Shilp Sahayak - 3D Printing"
                className="w-full px-3 py-2 text-xs bg-white border border-line rounded-xl outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-muted mb-1">
                Hero Video URL
              </label>
              <input
                type="text"
                value={form.hero?.heroVideoUrl || ''}
                onChange={(e) => setForm({ ...form, hero: { ...form.hero!, heroVideoUrl: e.target.value } })}
                placeholder="/videos/demo_video2.mp4"
                className="w-full px-3 py-2 text-xs bg-white border border-line rounded-xl outline-none focus:border-accent"
              />
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-xs font-mono font-bold text-ink hover:border-accent">
                  <Upload className="h-4 w-4 text-accent" />
                  {isUploadingHeroVideo ? 'Uploading video…' : 'Upload MP4/WebM'}
                  <input
                    type="file"
                    accept="video/mp4,video/webm,.mp4,.webm"
                    className="sr-only"
                    disabled={isUploadingHeroVideo}
                    onChange={(event) => void handleHeroVideoUpload(event)}
                  />
                </label>
                <span className="text-[11px] text-muted">MP4 or WebM, up to 100 MB</span>
              </div>
            </div>

            {/* Enable / Disable Hero Video */}
            <div className="md:col-span-2">
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-muted mb-2">
                Hero Video
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, hero: { ...form.hero!, enableVideo: true } })}
                  className={`px-4 py-2 rounded-xl text-xs font-mono font-bold border transition-all ${
                    form.hero?.enableVideo !== false
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-white text-muted border-line hover:border-accent hover:text-accent'
                  }`}
                >
                  ✓ Enable Video
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, hero: { ...form.hero!, enableVideo: false } })}
                  className={`px-4 py-2 rounded-xl text-xs font-mono font-bold border transition-all ${
                    form.hero?.enableVideo === false
                      ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                      : 'bg-white text-muted border-line hover:border-rose-400 hover:text-rose-500'
                  }`}
                >
                  ✕ Disable Video
                </button>
                <span className="text-xs text-muted font-sans">
                  {form.hero?.enableVideo !== false
                    ? 'Video is currently enabled on the storefront hero.'
                    : 'Video is disabled — choose a still image or slideshow below.'}
                </span>
              </div>
            </div>

            {form.hero?.enableVideo === false && (
              <div className="md:col-span-2 rounded-xl border border-line bg-shell/30 p-4 space-y-4">
                <div>
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-muted mb-1">
                    Static Hero Display
                  </label>
                  <select
                    value={form.hero?.heroImageMode || 'image'}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        hero: {
                          ...form.hero!,
                          heroImageMode: event.target.value as 'image' | 'slideshow',
                        },
                      })
                    }
                    className="w-full max-w-sm px-3 py-2 text-xs bg-white border border-line rounded-xl outline-none focus:border-accent"
                  >
                    <option value="image">Single static image</option>
                    <option value="slideshow">Slideshow</option>
                  </select>
                </div>

                {form.hero?.heroImageMode !== 'slideshow' ? (
                  <div className="flex flex-wrap items-center gap-3">
                    {form.hero?.heroImageUrl && (
                      <img
                        src={form.hero.heroImageUrl}
                        alt="Current static hero"
                        className="h-16 w-28 rounded-lg border border-line bg-white object-cover"
                      />
                    )}
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-xs font-mono font-bold text-ink hover:border-accent">
                      <Upload className="h-4 w-4 text-accent" />
                      {isUploadingHeroImage ? 'Uploading…' : 'Upload image'}
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        disabled={isUploadingHeroImage}
                        onChange={(event) => void handleHeroImageUpload(event, 'image')}
                      />
                    </label>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-accent px-3 py-2 text-xs font-mono font-bold text-white hover:bg-accent-dark">
                      <Plus className="h-4 w-4" />
                      {isUploadingHeroSlide ? 'Uploading…' : 'Add slideshow image'}
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        disabled={isUploadingHeroSlide}
                        onChange={(event) => void handleHeroImageUpload(event, 'slideshow')}
                      />
                    </label>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {(form.hero?.heroSlideshowImageUrls || []).map((url, index) => (
                        <div key={`${url}-${index}`} className="relative">
                          <img
                            src={url}
                            alt={`Hero slideshow image ${index + 1}`}
                            className="h-24 w-full rounded-lg border border-line bg-white object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removeHeroSlide(index)}
                            aria-label={`Remove slideshow image ${index + 1}`}
                            className="absolute right-1 top-1 rounded-md bg-white/95 p-1 text-rose-600 shadow-sm hover:bg-rose-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                    {(form.hero?.heroSlideshowImageUrls || []).length === 0 && (
                      <p className="text-xs text-muted">Add at least one image. Slides advance every five seconds.</p>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="md:col-span-2">
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-muted mb-1">
                Headline
              </label>
              <input
                type="text"
                value={form.hero?.headline || ''}
                onChange={(e) => setForm({ ...form, hero: { ...form.hero!, headline: e.target.value } })}
                placeholder="Bring Your Ideas to Life in 3D"
                className="w-full px-3 py-2 text-xs font-bold text-ink bg-white border border-line rounded-xl outline-none focus:border-accent"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-muted mb-1">
                Subheadline
              </label>
              <input
                type="text"
                value={form.hero?.subheadline || ''}
                onChange={(e) => setForm({ ...form, hero: { ...form.hero!, subheadline: e.target.value } })}
                placeholder="Upload your custom models..."
                className="w-full px-3 py-2 text-xs text-ink bg-white border border-line rounded-xl outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="mb-1 flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-muted">
                <input
                  type="checkbox"
                  checked={form.hero?.enablePrimaryCta !== false}
                  onChange={(e) => setForm({ ...form, hero: { ...form.hero!, enablePrimaryCta: e.target.checked } })}
                  className="accent-[#ff4d00]"
                />
                Show Primary CTA
              </label>
              <input
                type="text"
                value={form.hero?.primaryCtaText || ''}
                onChange={(e) => setForm({ ...form, hero: { ...form.hero!, primaryCtaText: e.target.value } })}
                placeholder="Upload 3D Model"
                disabled={form.hero?.enablePrimaryCta === false}
                className="w-full px-3 py-2 text-xs bg-white border border-line rounded-xl outline-none focus:border-accent disabled:bg-shell disabled:text-muted"
              />
            </div>
            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-muted mb-1">
                Primary CTA Link
              </label>
              <input
                type="text"
                value={form.hero?.primaryCtaLink || ''}
                onChange={(e) => setForm({ ...form, hero: { ...form.hero!, primaryCtaLink: e.target.value } })}
                placeholder="/shilp-studio"
                className="w-full px-3 py-2 text-xs bg-white border border-line rounded-xl outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="mb-1 flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-muted">
                <input
                  type="checkbox"
                  checked={form.hero?.enableSecondaryCta !== false}
                  onChange={(e) => setForm({ ...form, hero: { ...form.hero!, enableSecondaryCta: e.target.checked } })}
                  className="accent-[#ff4d00]"
                />
                Show Secondary CTA
              </label>
              <input
                type="text"
                value={form.hero?.secondaryCtaText || ''}
                onChange={(e) => setForm({ ...form, hero: { ...form.hero!, secondaryCtaText: e.target.value } })}
                placeholder="Shop Collection"
                disabled={form.hero?.enableSecondaryCta === false}
                className="w-full px-3 py-2 text-xs bg-white border border-line rounded-xl outline-none focus:border-accent disabled:bg-shell disabled:text-muted"
              />
            </div>
            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-muted mb-1">
                Secondary CTA Link
              </label>
              <input
                type="text"
                value={form.hero?.secondaryCtaLink || ''}
                onChange={(e) => setForm({ ...form, hero: { ...form.hero!, secondaryCtaLink: e.target.value } })}
                placeholder="/shop"
                className="w-full px-3 py-2 text-xs bg-white border border-line rounded-xl outline-none focus:border-accent"
              />
            </div>
          </div>
        </div>

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
                <span className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.customPromoButtonEnabled !== false}
                    onChange={(e) => setForm({ ...form, customPromoButtonEnabled: e.target.checked })}
                    className="accent-[#ff4d00]"
                  />
                  Show CTA Button
                </span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={form.customPromoButtonText || ''}
                  onChange={(e) =>
                    setForm({ ...form, customPromoButtonText: e.target.value })
                  }
                  placeholder="Explore Collection"
                  disabled={form.customPromoButtonEnabled === false}
                  className="w-full px-3 py-2 text-xs font-mono text-ink bg-white border border-line rounded-xl outline-none focus:border-accent disabled:bg-shell disabled:text-muted"
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
