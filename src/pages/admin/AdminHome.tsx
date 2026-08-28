import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { useProducts, Product } from '../../hooks/useProducts';
import {
  DEFAULT_HOMEPAGE_SETTINGS,
  HomepageHeroSlide,
  HomepageSettings,
  useHomepage,
  useUpdateHomepage,
} from '../../hooks/useHomepage';

function moveItem<T>(items: T[], index: number, direction: -1 | 1) {
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= items.length) return items;

  const next = [...items];
  [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
  return next;
}

function createHeroSlide(): HomepageHeroSlide {
  return {
    id: `hero-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    enabled: true,
    eyebrow: 'STUDIO CRAFTSMANSHIP',
    title: 'Custom 3D Fabrication & Prototyping',
    description: 'Precision layered engineering and personalized creations delivered directly to your doorstep.',
    image: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=80',
    buttonText: 'Explore Collection',
    buttonLink: '/catalog',
  };
}

const CURATED_HERO_PRESETS = [
  {
    label: '3D Lamp & Lithophane',
    tag: 'Bespoke Art',
    url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=80',
  },
  {
    label: 'Robotics & Hardware Enclosure',
    tag: 'Engineering',
    url: 'https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?auto=format&fit=crop&w=1200&q=80',
  },
  {
    label: 'Architectural Scale Model',
    tag: 'Architecture',
    url: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=1200&q=80',
  },
  {
    label: 'Desktop Organizer & Station',
    tag: 'Home Decor',
    url: 'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?auto=format&fit=crop&w=1200&q=80',
  },
  {
    label: 'High-Detail SLA Resin Part',
    tag: 'SLA Resin',
    url: 'https://images.unsplash.com/photo-1563770660941-20978e870e26?auto=format&fit=crop&w=1200&q=80',
  },
];

export function AdminHome() {
  const { data: products = [], isLoading: productsLoading } = useProducts();
  const { data: savedSettings, isLoading: settingsLoading, isError } = useHomepage();
  const updateHomepage = useUpdateHomepage();

  const [form, setForm] = useState<HomepageSettings>(DEFAULT_HOMEPAGE_SETTINGS);
  const [showSuccess, setShowSuccess] = useState(false);

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
      heroSlides: [...savedSettings.heroSlides],
      featuredProductIds: [...savedSettings.featuredProductIds],
      selectedProductIds: [...savedSettings.selectedProductIds],
      categoryNames: [...savedSettings.categoryNames],
      announcementMessages: savedSettings.announcementMessages?.length
        ? [...savedSettings.announcementMessages]
        : [savedSettings.announcementText || DEFAULT_HOMEPAGE_SETTINGS.announcementText],
      announcementDuration: savedSettings.announcementDuration ?? DEFAULT_HOMEPAGE_SETTINGS.announcementDuration,
    });
  }, [savedSettings]);

  const updateHeroSlide = (
    id: string,
    field: keyof HomepageHeroSlide,
    value: string | boolean
  ) => {
    setForm((current) => ({
      ...current,
      heroSlides: current.heroSlides.map((slide) =>
        slide.id === id ? { ...slide, [field]: value } : slide
      ),
    }));
  };

  const addHeroSlide = () => {
    setForm((current) => ({
      ...current,
      heroSlides: [...current.heroSlides, createHeroSlide()],
    }));
  };

  const removeHeroSlide = (id: string) => {
    setForm((current) => ({
      ...current,
      heroSlides: current.heroSlides.filter((slide) => slide.id !== id),
    }));
  };

  const moveHeroSlide = (index: number, direction: -1 | 1) => {
    setForm((current) => ({
      ...current,
      heroSlides: moveItem(current.heroSlides, index, direction),
    }));
  };

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

  const toggleCategory = (category: string) => {
    setForm((current) => ({
      ...current,
      categoryNames: current.categoryNames.includes(category)
        ? current.categoryNames.filter((item) => item !== category)
        : [...current.categoryNames, category],
    }));
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();

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
      announcementMessages: form.announcementMessages.map((message) => message.trim()).filter(Boolean),
      announcementDuration: Math.min(Math.max(Math.round(form.announcementDuration), 12), 40),
      announcementText: form.announcementMessages.map((message) => message.trim()).filter(Boolean)[0] || '',
    });

    setForm((current) => ({ ...current, heroSlides: cleanSlides }));
    setShowSuccess(true);
    window.setTimeout(() => setShowSuccess(false), 3000);
  };

  const renderProductRow = (
    product: Product,
    field: 'featuredProductIds' | 'selectedProductIds'
  ) => {
    const ids = form[field];
    const selected = ids.includes(product.id);
    const index = ids.indexOf(product.id);

    return (
      <div
        key={`${field}-${product.id}`}
        className={`flex items-center gap-3 rounded-lg border px-3.5 py-2.5 transition-colors ${
          selected
            ? 'border-accent/40 bg-accent/5'
            : 'border-line bg-white hover:border-line/80'
        }`}
      >
        <img
          src={product.image}
          alt=""
          className="h-10 w-10 shrink-0 rounded-md bg-shell object-cover border border-line"
        />

        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-ink">{product.name}</p>
          <p className="mt-0.5 text-[11px] font-mono text-muted">
            {product.category || 'Uncategorized'} · ₹{product.price.toLocaleString('en-IN')}
          </p>
        </div>

        <button
          type="button"
          onClick={() => toggleProduct(field, product.id)}
          className={`inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-semibold transition-colors ${
            selected
              ? 'border-accent bg-accent text-white hover:bg-accent-dark'
              : 'border-line bg-white text-muted hover:text-ink hover:bg-shell'
          }`}
        >
          {selected ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          {selected ? 'Selected' : 'Add'}
        </button>

        {selected && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={index <= 0}
              onClick={() =>
                setForm((current) => ({
                  ...current,
                  [field]: moveItem(current[field], index, -1),
                }))
              }
              className="flex h-7 w-7 items-center justify-center rounded-md border border-line text-muted disabled:cursor-not-allowed disabled:opacity-30 hover:bg-shell hover:text-ink"
              aria-label={`Move ${product.name} up`}
            >
              <ArrowUp className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              disabled={index === -1 || index >= ids.length - 1}
              onClick={() =>
                setForm((current) => ({
                  ...current,
                  [field]: moveItem(current[field], index, 1),
                }))
              }
              className="flex h-7 w-7 items-center justify-center rounded-md border border-line text-muted disabled:cursor-not-allowed disabled:opacity-30 hover:bg-shell hover:text-ink"
              aria-label={`Move ${product.name} down`}
            >
              <ArrowDown className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    );
  };

  if (productsLoading || settingsLoading) {
    return (
      <div className="flex h-64 items-center justify-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
        <span className="text-xs font-mono text-muted uppercase tracking-wider">Loading storefront settings...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700">
        Failed to load homepage configuration. Please refresh the page and try again.
      </div>
    );
  }

  return (
    <form onSubmit={save} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-4">
        <div>
          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-accent block">
            Storefront CMS
          </span>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-ink">
            Homepage Content Manager
          </h1>
          <p className="mt-1 text-xs text-muted">
            Configure announcement ticker, hero carousel slides, featured product grids, and shop categories.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {showSuccess && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">
              <CheckCircle2 className="h-3.5 w-3.5" /> Changes Saved
            </span>
          )}
          <Link
            to="/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3.5 py-2 text-xs font-semibold text-ink hover:bg-shell transition-colors shadow-xs"
          >
            <Eye className="h-3.5 w-3.5 text-muted" /> Preview Storefront
          </Link>
          <button
            type="submit"
            disabled={updateHomepage.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-white hover:bg-accent-dark transition-colors shadow-xs shadow-accent/20 disabled:opacity-50"
          >
            {updateHomepage.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            {updateHomepage.isPending ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </div>

      {/* Announcement Bar Settings Card */}
      <div className="rounded-xl border border-line bg-white p-6 shadow-xs space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="font-display text-base font-bold text-ink">Announcement Bar</h2>
            <p className="mt-0.5 text-xs text-muted">
              Add broadcast messages displayed at the top banner of the storefront.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setForm((current) => ({ ...current, announcementEnabled: !current.announcementEnabled }))}
            className={`rounded-full px-3 py-1 font-mono text-[11px] font-bold ${
              form.announcementEnabled
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-shell text-muted border border-line'
            }`}
          >
            {form.announcementEnabled ? 'Status: Active' : 'Status: Disabled'}
          </button>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_260px]">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-semibold uppercase tracking-wider text-muted">
                Ticker Messages
              </span>
              <button
                type="button"
                onClick={() => setForm((current) => ({ ...current, announcementMessages: [...current.announcementMessages, ''] }))}
                className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-2.5 py-1 text-xs font-semibold text-ink hover:bg-shell"
              >
                <Plus className="h-3.5 w-3.5 text-accent" /> Add Message
              </button>
            </div>

            <div className="space-y-2">
              {form.announcementMessages.map((message, index) => (
                <div key={`announcement-${index}`} className="flex items-center gap-2">
                  <span className="font-mono text-[10px] font-bold text-muted w-5 text-center">
                    {index + 1}
                  </span>
                  <input
                    type="text"
                    value={message}
                    onChange={(event) => setForm((current) => ({
                      ...current,
                      announcementMessages: current.announcementMessages.map((item, itemIndex) =>
                        itemIndex === index ? event.target.value : item
                      ),
                    }))}
                    placeholder="Free Pan-India shipping on custom 3D orders over ₹999..."
                    className="flex-1 rounded-lg border border-line bg-white px-3 py-2 text-xs font-sans text-ink outline-none focus:border-accent"
                  />
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => setForm((current) => ({ ...current, announcementMessages: moveItem(current.announcementMessages, index, -1) }))}
                      className="p-1.5 rounded border border-line text-muted disabled:opacity-30 hover:bg-shell hover:text-ink"
                      aria-label="Move announcement up"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={index === form.announcementMessages.length - 1}
                      onClick={() => setForm((current) => ({ ...current, announcementMessages: moveItem(current.announcementMessages, index, 1) }))}
                      className="p-1.5 rounded border border-line text-muted disabled:opacity-30 hover:bg-shell hover:text-ink"
                      aria-label="Move announcement down"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={form.announcementMessages.length === 1}
                      onClick={() => setForm((current) => ({ ...current, announcementMessages: current.announcementMessages.filter((_, itemIndex) => itemIndex !== index) }))}
                      className="p-1.5 rounded border border-rose-200 text-rose-600 hover:bg-rose-50 disabled:opacity-30"
                      aria-label="Remove announcement"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-line bg-shell p-4 space-y-2">
            <label className="block text-xs font-semibold text-ink" htmlFor="announcement-duration">
              Scroll Speed (Duration)
            </label>
            <p className="text-[11px] text-muted leading-relaxed">
              Higher value means smoother, slower ticker movement across the header.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <input
                id="announcement-duration"
                type="range"
                min={12}
                max={40}
                step={1}
                value={form.announcementDuration}
                onChange={(event) => setForm((current) => ({ ...current, announcementDuration: Number(event.target.value) }))}
                className="w-full accent-[#ff4d00]"
              />
              <span className="font-mono text-xs font-bold text-ink w-10 text-right">{form.announcementDuration}s</span>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Section & Background Video / GIF Manager */}
      <div className="rounded-xl border border-line bg-white p-6 shadow-xs space-y-6">
        <div>
          <h2 className="font-display text-base font-bold text-ink">Hero Section & Video Background</h2>
          <p className="mt-0.5 text-xs text-muted">
            Configure the continuous looping background video or GIF, typography, and primary storefront CTAs.
          </p>
        </div>

        {/* Hero Background Video / GIF Controller */}
        <div className="rounded-lg border border-line bg-shell p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <p className="text-xs font-semibold text-ink">Hero Looping Video or Animated GIF URL</p>
              <p className="text-[11px] text-muted">
                Paste a direct .mp4 video link, webm link, or animated .gif link. It will loop continuously with smooth parallax scroll.
              </p>
            </div>
            {form.heroVideoUrl && (
              <span className="font-mono text-[10px] font-bold text-accent bg-accent/10 px-2.5 py-1 rounded-full border border-accent/20">
                Active Looping Stream
              </span>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={form.heroVideoUrl || ''}
              onChange={(e) => setForm((curr) => ({ ...curr, heroVideoUrl: e.target.value }))}
              placeholder="https://.../video.mp4 or https://.../animation.gif"
              className="flex-1 rounded-lg border border-line bg-white px-3 py-2 text-xs font-mono text-ink outline-none focus:border-accent"
            />
            <button
              type="button"
              onClick={() =>
                setForm((curr) => ({
                  ...curr,
                  heroVideoUrl: '/videos/demo_video.mp4',
                }))
              }
              className="px-3.5 py-2 text-xs font-semibold text-ink hover:text-accent bg-white border border-line rounded-lg hover:border-accent/40 transition-colors shadow-xs"
            >
              Use Demo Video Loop
            </button>
            <button
              type="button"
              onClick={() =>
                setForm((curr) => ({
                  ...curr,
                  heroVideoUrl: '/hero-print.gif',
                }))
              }
              className="px-3.5 py-2 text-xs font-semibold text-ink hover:text-accent bg-white border border-line rounded-lg hover:border-accent/40 transition-colors shadow-xs"
            >
              Use 3D Print GIF Loop
            </button>
          </div>

          {/* Live Admin Video / GIF Preview */}
          <div className="mt-3 overflow-hidden rounded-lg border border-line bg-black relative max-h-56 flex items-center justify-center">
            {form.heroVideoUrl && (/\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(form.heroVideoUrl) || form.heroVideoUrl.includes('video') || form.heroVideoUrl.endsWith('.webm')) ? (
              <video
                key={form.heroVideoUrl}
                src={form.heroVideoUrl}
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-56 object-cover object-center opacity-85"
              />
            ) : form.heroVideoUrl ? (
              <img
                src={form.heroVideoUrl}
                alt="Hero Background Preview"
                className="w-full h-56 object-cover object-center opacity-85"
              />
            ) : (
              <div className="py-10 text-xs font-mono text-zinc-400">No background video specified</div>
            )}
            <div className="absolute bottom-2 right-2 rounded bg-black/70 px-2 py-0.5 font-mono text-[10px] text-white">
              Live Background Canvas
            </div>
          </div>
        </div>

        {/* Hero Copy & Typography Fields */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-muted mb-1">
              Hero Eyebrow Tagline
            </label>
            <input
              type="text"
              value={form.heroEyebrow || ''}
              onChange={(e) => setForm((curr) => ({ ...curr, heroEyebrow: e.target.value }))}
              placeholder="BESPOKE 3D FABRICATION STUDIO"
              className="w-full rounded-lg border border-line bg-white px-3 py-2 text-xs font-semibold text-ink outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-muted mb-1">
              Primary Button Text & Destination
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={form.heroButtonText || ''}
                onChange={(e) => setForm((curr) => ({ ...curr, heroButtonText: e.target.value }))}
                placeholder="Explore Collection"
                className="w-1/2 rounded-lg border border-line bg-white px-3 py-2 text-xs font-semibold text-ink outline-none focus:border-accent"
              />
              <input
                type="text"
                value={form.heroButtonLink || ''}
                onChange={(e) => setForm((curr) => ({ ...curr, heroButtonLink: e.target.value }))}
                placeholder="/catalog"
                className="w-1/2 rounded-lg border border-line bg-white px-3 py-2 text-xs font-mono text-ink outline-none focus:border-accent"
              />
            </div>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-muted mb-1">
              Hero Main Headline
            </label>
            <input
              type="text"
              value={form.heroTitle || ''}
              onChange={(e) => setForm((curr) => ({ ...curr, heroTitle: e.target.value }))}
              placeholder="Turn Ideas Into Something Real."
              className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm font-bold text-ink outline-none focus:border-accent"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-muted mb-1">
              Hero Subtitle / Description
            </label>
            <textarea
              rows={2}
              value={form.heroSubtitle || ''}
              onChange={(e) => setForm((curr) => ({ ...curr, heroSubtitle: e.target.value }))}
              placeholder="Precision 3D printed lighting, mechanical components, and bespoke goods crafted in India."
              className="w-full rounded-lg border border-line bg-white px-3 py-2 text-xs font-sans text-ink outline-none focus:border-accent"
            />
          </div>
        </div>
      </div>

      {/* Featured Products & Shop Categories Sections */}
      <div className="grid gap-6 xl:grid-cols-2">
        {/* Featured Products Card */}
        <div className="rounded-xl border border-line bg-white p-6 shadow-xs space-y-4">
          <div>
            <h2 className="font-display text-base font-bold text-ink">Featured Product Sections</h2>
            <p className="mt-0.5 text-xs text-muted">
              Select which products appear in the featured homepage showcases.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-accent">
              Section 1: Stocked Items Showcase
            </h3>
            <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
              {activeProducts.map((product) => renderProductRow(product, 'featuredProductIds'))}
            </div>
          </div>

          <div className="pt-4 border-t border-line space-y-2">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-accent">
              Section 2: Secondary Workshop Grid
            </h3>
            <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
              {activeProducts.map((product) => renderProductRow(product, 'selectedProductIds'))}
            </div>
          </div>
        </div>

        {/* Categories Card */}
        <div className="rounded-xl border border-line bg-white p-6 shadow-xs space-y-4">
          <div>
            <h2 className="font-display text-base font-bold text-ink">Shop by Category Order</h2>
            <p className="mt-0.5 text-xs text-muted">
              Toggle categories to display on the storefront homepage and set their presentation sequence.
            </p>
          </div>

          {availableCategories.length === 0 ? (
            <p className="py-8 text-center text-xs font-mono text-muted">
              No categories found. Add products with categories in the catalog first.
            </p>
          ) : (
            <div className="space-y-2">
              {availableCategories.map((category) => {
                const selected = form.categoryNames.includes(category);
                const index = form.categoryNames.indexOf(category);
                return (
                  <div
                    key={category}
                    className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
                      selected
                        ? 'border-accent/40 bg-accent/5'
                        : 'border-line bg-white'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleCategory(category)}
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded border ${
                        selected
                          ? 'border-accent bg-accent text-white font-bold'
                          : 'border-line text-transparent'
                      }`}
                      aria-label={`${selected ? 'Remove' : 'Add'} ${category}`}
                    >
                      <span className="text-xs">✓</span>
                    </button>
                    <span className="flex-1 text-xs font-semibold text-ink">{category}</span>
                    {selected && (
                      <div className="flex gap-1">
                        <button
                          type="button"
                          disabled={index <= 0}
                          onClick={() =>
                            setForm((current) => ({
                              ...current,
                              categoryNames: moveItem(current.categoryNames, index, -1),
                            }))
                          }
                          className="p-1 rounded border border-line text-muted disabled:opacity-30 hover:bg-shell"
                        >
                          <ArrowUp className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          disabled={index >= form.categoryNames.length - 1}
                          onClick={() =>
                            setForm((current) => ({
                              ...current,
                              categoryNames: moveItem(current.categoryNames, index, 1),
                            }))
                          }
                          className="p-1 rounded border border-line text-muted disabled:opacity-30 hover:bg-shell"
                        >
                          <ArrowDown className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Homepage Section Headlines & Promo Banner Manager */}
      <div className="rounded-xl border border-line bg-white p-6 shadow-xs space-y-5">
        <div>
          <h2 className="font-display text-base font-bold text-ink">Section Headlines & Custom STL Promo Banner</h2>
          <p className="mt-0.5 text-xs text-muted">
            Configure section titles and custom 3D printing spotlight copy displayed across the storefront homepage.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Featured Collection Copy */}
          <div className="rounded-lg border border-line bg-shell p-4 space-y-3">
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-accent block">
              Featured Products Section
            </span>
            <div>
              <label className="block text-xs font-semibold text-ink mb-1" htmlFor="featured-title">
                Section Heading Title
              </label>
              <input
                id="featured-title"
                type="text"
                value={form.featuredTitle || ''}
                onChange={(e) => setForm((current) => ({ ...current, featuredTitle: e.target.value }))}
                placeholder="Featured Products"
                className="w-full rounded-lg border border-line bg-white px-3 py-2 text-xs font-semibold text-ink outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink mb-1" htmlFor="featured-subtitle">
                Section Subtitle
              </label>
              <input
                id="featured-subtitle"
                type="text"
                value={form.featuredSubtitle || ''}
                onChange={(e) => setForm((current) => ({ ...current, featuredSubtitle: e.target.value }))}
                placeholder="Handcrafted 3D printed lighting, desk accessories, and customized keepsakes."
                className="w-full rounded-lg border border-line bg-white px-3 py-2 text-xs text-ink outline-none focus:border-accent"
              />
            </div>
          </div>

          {/* Custom STL Promo Spotlight Copy */}
          <div className="rounded-lg border border-line bg-shell p-4 space-y-3">
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-accent block">
              Custom 3D Printing Spotlight Banner
            </span>
            <div>
              <label className="block text-xs font-semibold text-ink mb-1" htmlFor="promo-title">
                Banner Headline
              </label>
              <input
                id="promo-title"
                type="text"
                value={form.customPromoTitle || ''}
                onChange={(e) => setForm((current) => ({ ...current, customPromoTitle: e.target.value }))}
                placeholder="Have a 3D Model? Upload your STL & get an instant quote."
                className="w-full rounded-lg border border-line bg-white px-3 py-2 text-xs font-semibold text-ink outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink mb-1" htmlFor="promo-subtitle">
                Banner Subtitle
              </label>
              <textarea
                id="promo-subtitle"
                rows={2}
                value={form.customPromoSubtitle || ''}
                onChange={(e) => setForm((current) => ({ ...current, customPromoSubtitle: e.target.value }))}
                placeholder="Our interactive custom printing pipeline computes volume..."
                className="w-full rounded-lg border border-line bg-white px-3 py-2 text-xs text-ink outline-none focus:border-accent"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-mono text-muted mb-1" htmlFor="promo-btn-text">
                  Button Text
                </label>
                <input
                  id="promo-btn-text"
                  type="text"
                  value={form.customPromoButtonText || ''}
                  onChange={(e) => setForm((current) => ({ ...current, customPromoButtonText: e.target.value }))}
                  placeholder="Upload 3D File"
                  className="w-full rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs text-ink outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-mono text-muted mb-1" htmlFor="promo-btn-link">
                  Button Link
                </label>
                <input
                  id="promo-btn-link"
                  type="text"
                  value={form.customPromoButtonLink || ''}
                  onChange={(e) => setForm((current) => ({ ...current, customPromoButtonLink: e.target.value }))}
                  placeholder="/custom-service"
                  className="w-full rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs text-ink outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
