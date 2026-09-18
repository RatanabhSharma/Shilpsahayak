import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Loader2,
  Plus,
  Save,
  Trash2,
  ExternalLink,
  HelpCircle,
  Megaphone,
  ShoppingBag,
  Star,
  Film,
  Globe,
} from 'lucide-react';

import { useProducts } from '../../hooks/useProducts';
import {
  DEFAULT_HOMEPAGE_SETTINGS,
  DEFAULT_HERO_SLIDES,
  DEFAULT_HOMEPAGE_TESTIMONIALS,
  DEFAULT_HOMEPAGE_FAQS,
  HomepageSettings,
  HomepageHeroSlide,
  HomepageTestimonial,
  HomepageFaq,
  useHomepage,
  useUpdateHomepage,
} from '../../hooks/useHomepage';

// Phase 2 Shared Admin Components
import { PageHeader } from '../../components/admin/shared/PageHeader';

function moveItem<T>(items: T[], index: number, direction: -1 | 1) {
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= items.length) return items;

  const next = [...items];
  [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
  return next;
}

export type StorefrontTab =
  | 'hero'
  | 'announcements'
  | 'featured'
  | 'testimonials'
  | 'faqs'
  | 'footer';

export function AdminHome() {
  const { data: products = [], isLoading: productsLoading } = useProducts();
  const { data: savedSettings, isLoading: settingsLoading } = useHomepage();
  const updateHomepage = useUpdateHomepage();

  const [activeTab, setActiveTab] = useState<StorefrontTab>('hero');
  const [form, setForm] = useState<HomepageSettings>(DEFAULT_HOMEPAGE_SETTINGS);
  const [showSuccess, setShowSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  const activeProducts = useMemo(
    () => products.filter((product) => product.active !== false),
    [products]
  );

  const availableCategories = useMemo(() => {
    return Array.from(
      new Set(
        activeProducts
          .map((product) => product.category?.trim())
          .filter(Boolean) as string[]
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [activeProducts]);

  useEffect(() => {
    if (!savedSettings) return;

    setForm({
      ...DEFAULT_HOMEPAGE_SETTINGS,
      ...savedSettings,
      heroSlides: savedSettings.heroSlides ? [...savedSettings.heroSlides] : DEFAULT_HERO_SLIDES,
      featuredProductIds: [...savedSettings.featuredProductIds],
      selectedProductIds: [...savedSettings.selectedProductIds],
      categoryNames: [...savedSettings.categoryNames],
      announcementMessages: savedSettings.announcementMessages?.length
        ? [...savedSettings.announcementMessages]
        : [savedSettings.announcementText || DEFAULT_HOMEPAGE_SETTINGS.announcementText],
      announcementDuration: savedSettings.announcementDuration ?? DEFAULT_HOMEPAGE_SETTINGS.announcementDuration,
      testimonials: savedSettings.testimonials?.length
        ? [...savedSettings.testimonials]
        : DEFAULT_HOMEPAGE_TESTIMONIALS,
      faqs: savedSettings.faqs?.length
        ? [...savedSettings.faqs]
        : DEFAULT_HOMEPAGE_FAQS,
      isPublished: savedSettings.isPublished ?? true,
    });
  }, [savedSettings]);

  // Slide Helpers
  const addSlide = () => {
    const newSlide: HomepageHeroSlide = {
      id: `hero-${Date.now()}`,
      enabled: true,
      eyebrow: 'Precision 3D Craftsmanship',
      title: 'New Headline Goes Here',
      description: 'Highlight your custom 3D printing capabilities or product collection.',
      image: 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?auto=format&fit=crop&w=1200&q=80',
      buttonText: 'Explore Collection',
      buttonLink: '/shop',
    };
    setForm((current) => ({
      ...current,
      heroSlides: [...current.heroSlides, newSlide],
    }));
  };

  const updateSlide = (index: number, field: keyof HomepageHeroSlide, value: any) => {
    setForm((current) => {
      const slides = [...current.heroSlides];
      slides[index] = { ...slides[index], [field]: value };
      return { ...current, heroSlides: slides };
    });
  };

  const removeSlide = (index: number) => {
    setForm((current) => ({
      ...current,
      heroSlides: current.heroSlides.filter((_, i) => i !== index),
    }));
  };

  // Testimonials Helpers
  const addTestimonial = () => {
    const newTest: HomepageTestimonial = {
      id: `test-${Date.now()}`,
      author: 'Customer Name',
      location: 'City, India',
      rating: 5,
      comment: 'Excellent 3D print quality and fast dispatch!',
      verified: true,
      enabled: true,
    };
    setForm((curr) => ({
      ...curr,
      testimonials: [...(curr.testimonials || []), newTest],
    }));
  };

  const updateTestimonial = (index: number, field: keyof HomepageTestimonial, val: any) => {
    setForm((curr) => {
      const list = [...(curr.testimonials || [])];
      list[index] = { ...list[index], [field]: val };
      return { ...curr, testimonials: list };
    });
  };

  const removeTestimonial = (index: number) => {
    setForm((curr) => ({
      ...curr,
      testimonials: (curr.testimonials || []).filter((_, i) => i !== index),
    }));
  };

  // FAQ Helpers
  const addFaq = () => {
    const newFaq: HomepageFaq = {
      id: `faq-${Date.now()}`,
      question: 'Frequently asked question title?',
      answer: 'Detailed explanation and instructions for customers.',
      category: 'General',
      enabled: true,
    };
    setForm((curr) => ({
      ...curr,
      faqs: [...(curr.faqs || []), newFaq],
    }));
  };

  const updateFaq = (index: number, field: keyof HomepageFaq, val: any) => {
    setForm((curr) => {
      const list = [...(curr.faqs || [])];
      list[index] = { ...list[index], [field]: val };
      return { ...curr, faqs: list };
    });
  };

  const removeFaq = (index: number) => {
    setForm((curr) => ({
      ...curr,
      faqs: (curr.faqs || []).filter((_, i) => i !== index),
    }));
  };

  // Toggle Products & Categories
  const toggleProduct = (
    field: 'featuredProductIds' | 'selectedProductIds',
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
      const cleanSlides = form.heroSlides
        .map((slide) => ({
          ...slide,
          eyebrow: slide.eyebrow.trim(),
          title: slide.title.trim(),
          description: slide.description.trim(),
          image: slide.image.trim(),
          buttonText: slide.buttonText.trim(),
          buttonLink: slide.buttonLink.trim(),
        }))
        .filter((slide) => slide.title || slide.image || slide.description);

      await updateHomepage.mutateAsync({
        ...form,
        heroSlides: cleanSlides,
        heroInterval: Math.min(Math.max(Math.round(form.heroInterval), 2500), 15000),
        featuredProductIds: form.featuredProductIds.filter((id) =>
          activeProducts.some((product) => product.id === id)
        ),
        selectedProductIds: form.selectedProductIds.filter((id) =>
          activeProducts.some((product) => product.id === id)
        ),
        categoryNames: form.categoryNames.filter((name) =>
          availableCategories.includes(name)
        ),
        announcementMessages: form.announcementMessages.map((m) => m.trim()).filter(Boolean),
        announcementDuration: Math.min(Math.max(Math.round(form.announcementDuration), 12), 40),
        announcementText: form.announcementMessages.map((m) => m.trim()).filter(Boolean)[0] || '',
      });

      setForm((current) => ({ ...current, heroSlides: cleanSlides }));
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
        description="Curate public homepage hero banners, running announcements, featured collections, customer reviews, and FAQs."
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

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 border-b border-line bg-white px-2 overflow-x-auto scrollbar-none rounded-xl">
        <button
          type="button"
          onClick={() => setActiveTab('hero')}
          className={`inline-flex items-center gap-2 py-3 px-4 border-b-2 font-mono text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'hero'
              ? 'border-accent text-accent'
              : 'border-transparent text-muted hover:text-ink'
          }`}
        >
          <Film className="w-3.5 h-3.5" />
          <span>Hero Banners ({form.heroSlides.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('announcements')}
          className={`inline-flex items-center gap-2 py-3 px-4 border-b-2 font-mono text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'announcements'
              ? 'border-accent text-accent'
              : 'border-transparent text-muted hover:text-ink'
          }`}
        >
          <Megaphone className="w-3.5 h-3.5" />
          <span>Marquee Bar</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('featured')}
          className={`inline-flex items-center gap-2 py-3 px-4 border-b-2 font-mono text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'featured'
              ? 'border-accent text-accent'
              : 'border-transparent text-muted hover:text-ink'
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          <span>Featured Collections ({form.featuredProductIds.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('testimonials')}
          className={`inline-flex items-center gap-2 py-3 px-4 border-b-2 font-mono text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'testimonials'
              ? 'border-accent text-accent'
              : 'border-transparent text-muted hover:text-ink'
          }`}
        >
          <Star className="w-3.5 h-3.5" />
          <span>Testimonials ({(form.testimonials || []).length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('faqs')}
          className={`inline-flex items-center gap-2 py-3 px-4 border-b-2 font-mono text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'faqs'
              ? 'border-accent text-accent'
              : 'border-transparent text-muted hover:text-ink'
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>FAQs ({(form.faqs || []).length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('footer')}
          className={`inline-flex items-center gap-2 py-3 px-4 border-b-2 font-mono text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'footer'
              ? 'border-accent text-accent'
              : 'border-transparent text-muted hover:text-ink'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>Footer & Brand</span>
        </button>
      </div>

      {/* TAB 1: HERO BANNERS & SLIDES */}
      {activeTab === 'hero' && (
        <div className="space-y-6">
          {/* Carousel Settings */}
          <div className="p-5 rounded-2xl border border-line bg-white shadow-2xs space-y-4">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-accent block">
              Hero Carousel Settings
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
              <label className="flex items-center gap-2.5 p-3 rounded-xl border border-line bg-shell/40 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.heroAutoplay}
                  onChange={(e) =>
                    setForm({ ...form, heroAutoplay: e.target.checked })
                  }
                  className="accent-[#ff4d00]"
                />
                <span className="font-bold text-ink">Enable Auto-Slide Transition</span>
              </label>

              <div className="p-3 rounded-xl border border-line bg-shell/40">
                <div className="flex justify-between mb-1">
                  <span className="text-muted">Slide Interval:</span>
                  <span className="font-bold text-ink">
                    {(form.heroInterval / 1000).toFixed(1)} seconds
                  </span>
                </div>
                <input
                  type="range"
                  min={2500}
                  max={12000}
                  step={500}
                  value={form.heroInterval}
                  onChange={(e) =>
                    setForm({ ...form, heroInterval: Number(e.target.value) })
                  }
                  className="w-full accent-[#ff4d00]"
                />
              </div>
            </div>
          </div>

          {/* Slides List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-muted">
                Active Hero Slides ({form.heroSlides.length})
              </span>
              <button
                type="button"
                onClick={addSlide}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-accent text-white font-mono text-xs font-bold hover:bg-accent-dark transition-colors shadow-2xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Hero Slide</span>
              </button>
            </div>

            {form.heroSlides.map((slide, idx) => (
              <div
                key={slide.id || idx}
                className="p-5 rounded-2xl border border-line bg-white shadow-2xs space-y-4"
              >
                <div className="flex items-center justify-between pb-3 border-b border-line">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs font-bold text-accent">
                      Slide #{idx + 1}
                    </span>
                    <label className="flex items-center gap-1.5 font-mono text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={slide.enabled}
                        onChange={(e) => updateSlide(idx, 'enabled', e.target.checked)}
                        className="accent-[#ff4d00]"
                      />
                      <span className={slide.enabled ? 'text-emerald-700 font-bold' : 'text-muted'}>
                        {slide.enabled ? 'Active' : 'Disabled'}
                      </span>
                    </label>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() =>
                        setForm((curr) => ({
                          ...curr,
                          heroSlides: moveItem(curr.heroSlides, idx, -1),
                        }))
                      }
                      className="p-1 rounded-lg border border-line bg-white hover:bg-shell text-muted disabled:opacity-30 cursor-pointer"
                      title="Move Up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === form.heroSlides.length - 1}
                      onClick={() =>
                        setForm((curr) => ({
                          ...curr,
                          heroSlides: moveItem(curr.heroSlides, idx, 1),
                        }))
                      }
                      className="p-1 rounded-lg border border-line bg-white hover:bg-shell text-muted disabled:opacity-30 cursor-pointer"
                      title="Move Down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeSlide(idx)}
                      className="p-1 rounded-lg border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 cursor-pointer ml-1"
                      title="Delete Slide"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
                  <div className="space-y-3">
                    <div>
                      <label className="block font-mono text-[10px] font-bold uppercase tracking-wider text-muted mb-1">
                        Eyebrow Text (Small Pre-header)
                      </label>
                      <input
                        type="text"
                        value={slide.eyebrow}
                        onChange={(e) => updateSlide(idx, 'eyebrow', e.target.value)}
                        placeholder="e.g. BESPOKE 3D PRINTING"
                        className="w-full px-3 py-2 text-xs font-mono uppercase text-ink bg-white border border-line rounded-xl outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-mono text-[10px] font-bold uppercase tracking-wider text-muted mb-1">
                        Main Slide Headline *
                      </label>
                      <input
                        type="text"
                        value={slide.title}
                        onChange={(e) => updateSlide(idx, 'title', e.target.value)}
                        placeholder="e.g. Turn Ideas Into Something Real"
                        className="w-full px-3 py-2 text-xs font-bold text-ink bg-white border border-line rounded-xl outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-mono text-[10px] font-bold uppercase tracking-wider text-muted mb-1">
                        Subtitle / Description
                      </label>
                      <textarea
                        rows={2}
                        value={slide.description}
                        onChange={(e) => updateSlide(idx, 'description', e.target.value)}
                        placeholder="Explaining the craftsmanship or precision fabrication..."
                        className="w-full px-3 py-2 text-xs text-ink bg-white border border-line rounded-xl outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block font-mono text-[10px] font-bold uppercase tracking-wider text-muted mb-1">
                        Background Image URL *
                      </label>
                      <input
                        type="url"
                        value={slide.image}
                        onChange={(e) => updateSlide(idx, 'image', e.target.value)}
                        placeholder="https://images.unsplash.com/..."
                        className="w-full px-3 py-2 text-xs font-mono text-ink bg-white border border-line rounded-xl outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block font-mono text-[10px] font-bold uppercase tracking-wider text-muted mb-1">
                          Button CTA Text
                        </label>
                        <input
                          type="text"
                          value={slide.buttonText}
                          onChange={(e) => updateSlide(idx, 'buttonText', e.target.value)}
                          placeholder="Explore Products"
                          className="w-full px-3 py-2 text-xs font-mono text-ink bg-white border border-line rounded-xl outline-none"
                        />
                      </div>

                      <div>
                        <label className="block font-mono text-[10px] font-bold uppercase tracking-wider text-muted mb-1">
                          Button Link
                        </label>
                        <input
                          type="text"
                          value={slide.buttonLink}
                          onChange={(e) => updateSlide(idx, 'buttonLink', e.target.value)}
                          placeholder="/shop or /custom-printing"
                          className="w-full px-3 py-2 text-xs font-mono text-ink bg-white border border-line rounded-xl outline-none"
                        />
                      </div>
                    </div>

                    {slide.image && (
                      <div className="h-20 rounded-xl overflow-hidden border border-line bg-shell relative">
                        <img
                          src={slide.image}
                          alt="Slide preview"
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute bottom-1 right-2 text-[10px] font-mono bg-ink/70 text-white px-2 py-0.5 rounded">
                          Slide Preview
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: MARQUEE ANNOUNCEMENTS */}
      {activeTab === 'announcements' && (
        <div className="p-6 rounded-2xl border border-line bg-white shadow-2xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-line">
            <div>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-accent block">
                Top Running Marquee Banner
              </span>
              <p className="text-xs text-muted mt-0.5">
                Displays real-time announcements, shipping notices, or coupon codes across the top of the storefront.
              </p>
            </div>

            <label className="flex items-center gap-2 font-mono text-xs font-bold cursor-pointer">
              <input
                type="checkbox"
                checked={form.announcementEnabled}
                onChange={(e) =>
                  setForm({ ...form, announcementEnabled: e.target.checked })
                }
                className="accent-[#ff4d00]"
              />
              <span className={form.announcementEnabled ? 'text-emerald-700' : 'text-muted'}>
                {form.announcementEnabled ? 'Banner Enabled' : 'Banner Disabled'}
              </span>
            </label>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-muted">
                Ticker Messages ({form.announcementMessages.length})
              </label>
              <button
                type="button"
                onClick={() =>
                  setForm({
                    ...form,
                    announcementMessages: [
                      ...form.announcementMessages,
                      'Free Express Shipping on prepaid orders across India!',
                    ],
                  })
                }
                className="text-xs font-mono font-bold text-accent hover:underline"
              >
                + Add Message
              </button>
            </div>

            {form.announcementMessages.map((msg, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  value={msg}
                  onChange={(e) => {
                    const next = [...form.announcementMessages];
                    next[idx] = e.target.value;
                    setForm({ ...form, announcementMessages: next });
                  }}
                  placeholder="e.g. ⚡ Fast turnaround: Custom 3D prints dispatch in 24-48 hours"
                  className="flex-1 px-3 py-2 text-xs font-sans text-ink bg-white border border-line rounded-xl outline-none focus:border-accent"
                />
                <button
                  type="button"
                  onClick={() =>
                    setForm({
                      ...form,
                      announcementMessages: form.announcementMessages.filter(
                        (_, i) => i !== idx
                      ),
                    })
                  }
                  className="p-2 rounded-xl text-rose-600 hover:bg-rose-50"
                  title="Remove message"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-line">
            <div className="flex justify-between text-xs font-mono mb-1">
              <span className="text-muted">Marquee Scroll Speed:</span>
              <span className="font-bold text-ink">{form.announcementDuration} seconds loop</span>
            </div>
            <input
              type="range"
              min={12}
              max={40}
              step={2}
              value={form.announcementDuration}
              onChange={(e) =>
                setForm({ ...form, announcementDuration: Number(e.target.value) })
              }
              className="w-full accent-[#ff4d00]"
            />
          </div>
        </div>
      )}

      {/* TAB 3: FEATURED COLLECTIONS & SHILP STUDIO PROMO */}
      {activeTab === 'featured' && (
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
                  className="w-full px-3 py-2 text-xs font-bold text-ink bg-white border border-line rounded-xl outline-none"
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
                  className="w-full px-3 py-2 text-xs text-ink bg-white border border-line rounded-xl outline-none"
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

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
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
                      <h4 className="font-display font-bold text-xs text-ink truncate">
                        {p.name}
                      </h4>
                      <p className="font-mono text-[11px] text-muted">
                        ₹{Number(p.price).toLocaleString('en-IN')}
                      </p>
                    </div>
                    <span
                      className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${
                        isSelected
                          ? 'bg-accent text-white'
                          : 'bg-slate-100 text-muted'
                      }`}
                    >
                      {isSelected ? '✓ On Home' : '+ Add'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Shilp Studio Custom Printing Promo Banner */}
          <div className="p-5 rounded-2xl border border-line bg-white shadow-2xs space-y-4">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-accent block">
              Custom CAD Printing Banner Promotion
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-muted mb-1">
                  Banner Headline
                </label>
                <input
                  type="text"
                  value={form.customPromoTitle || ''}
                  onChange={(e) => setForm({ ...form, customPromoTitle: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-bold text-ink bg-white border border-line rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-muted mb-1">
                  Button Text & Link
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={form.customPromoButtonText || ''}
                    onChange={(e) =>
                      setForm({ ...form, customPromoButtonText: e.target.value })
                    }
                    placeholder="Upload 3D File"
                    className="w-full px-3 py-2 text-xs font-mono text-ink bg-white border border-line rounded-xl outline-none"
                  />
                  <input
                    type="text"
                    value={form.customPromoButtonLink || ''}
                    onChange={(e) =>
                      setForm({ ...form, customPromoButtonLink: e.target.value })
                    }
                    placeholder="/custom-printing"
                    className="w-full px-3 py-2 text-xs font-mono text-ink bg-white border border-line rounded-xl outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: TESTIMONIALS */}
      {activeTab === 'testimonials' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-accent block">
                Customer Testimonials & Social Proof
              </span>
              <span className="text-xs text-muted">
                Curate reviews highlighting dimensional accuracy, ambient lighting, and prototype speed.
              </span>
            </div>
            <button
              type="button"
              onClick={addTestimonial}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-accent text-white font-mono text-xs font-bold hover:bg-accent-dark transition-colors shadow-2xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Review</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(form.testimonials || []).map((t, idx) => (
              <div
                key={t.id || idx}
                className="p-4 rounded-2xl border border-line bg-white shadow-2xs space-y-3"
              >
                <div className="flex items-center justify-between pb-2 border-b border-line">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-accent">
                      Review #{idx + 1}
                    </span>
                    <label className="flex items-center gap-1 font-mono text-[11px] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={t.enabled}
                        onChange={(e) => updateTestimonial(idx, 'enabled', e.target.checked)}
                        className="accent-[#ff4d00]"
                      />
                      <span className={t.enabled ? 'text-emerald-700 font-bold' : 'text-muted'}>
                        {t.enabled ? 'Shown' : 'Hidden'}
                      </span>
                    </label>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeTestimonial(idx)}
                    className="p-1 rounded-lg text-rose-600 hover:bg-rose-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-sans">
                  <div>
                    <label className="block text-[10px] font-mono text-muted mb-0.5">Author</label>
                    <input
                      type="text"
                      value={t.author}
                      onChange={(e) => updateTestimonial(idx, 'author', e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs text-ink bg-white border border-line rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-muted mb-0.5">Location</label>
                    <input
                      type="text"
                      value={t.location || ''}
                      onChange={(e) => updateTestimonial(idx, 'location', e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs text-ink bg-white border border-line rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-muted mb-0.5">Review Feedback</label>
                  <textarea
                    rows={2}
                    value={t.comment}
                    onChange={(e) => updateTestimonial(idx, 'comment', e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs text-ink bg-white border border-line rounded-lg"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: FAQS */}
      {activeTab === 'faqs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-accent block">
                Frequently Asked Questions (FAQ)
              </span>
              <span className="text-xs text-muted">
                Answers to customer questions regarding print materials, turnaround times, and tolerances.
              </span>
            </div>
            <button
              type="button"
              onClick={addFaq}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-accent text-white font-mono text-xs font-bold hover:bg-accent-dark transition-colors shadow-2xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add FAQ</span>
            </button>
          </div>

          <div className="space-y-3">
            {(form.faqs || []).map((faq, idx) => (
              <div
                key={faq.id || idx}
                className="p-4 rounded-2xl border border-line bg-white shadow-2xs space-y-3"
              >
                <div className="flex items-center justify-between pb-2 border-b border-line">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-accent">
                      Q#{idx + 1}
                    </span>
                    <label className="flex items-center gap-1 font-mono text-[11px] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={faq.enabled}
                        onChange={(e) => updateFaq(idx, 'enabled', e.target.checked)}
                        className="accent-[#ff4d00]"
                      />
                      <span className={faq.enabled ? 'text-emerald-700 font-bold' : 'text-muted'}>
                        {faq.enabled ? 'Published' : 'Hidden'}
                      </span>
                    </label>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeFaq(idx)}
                    className="p-1 rounded-lg text-rose-600 hover:bg-rose-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-2">
                  <input
                    type="text"
                    value={faq.question}
                    onChange={(e) => updateFaq(idx, 'question', e.target.value)}
                    placeholder="Question..."
                    className="w-full px-3 py-2 text-xs font-bold text-ink bg-white border border-line rounded-xl outline-none"
                  />
                  <textarea
                    rows={2}
                    value={faq.answer}
                    onChange={(e) => updateFaq(idx, 'answer', e.target.value)}
                    placeholder="Detailed answer..."
                    className="w-full px-3 py-2 text-xs text-ink bg-white border border-line rounded-xl outline-none"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: FOOTER & BRAND */}
      {activeTab === 'footer' && (
        <div className="p-6 rounded-2xl border border-line bg-white shadow-2xs space-y-4">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-accent block">
            Storefront Brand Footer
          </span>

          <div>
            <label className="block text-xs font-mono font-bold uppercase tracking-wider text-muted mb-1">
              Footer Brand Statement
            </label>
            <input
              type="text"
              value={form.footerNote || ''}
              onChange={(e) => setForm({ ...form, footerNote: e.target.value })}
              placeholder="e.g. Crafted with pride in India · Precision additive manufacturing"
              className="w-full px-3 py-2 text-xs text-ink bg-white border border-line rounded-xl outline-none"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminHome;
