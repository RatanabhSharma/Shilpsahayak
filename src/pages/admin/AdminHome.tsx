import React, { useEffect, useMemo, useState, type FormEvent } from 'react';
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

import { Button, Card, Input } from '../../components/ui';
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
    eyebrow: 'NEW ARRIVAL',
    title: '',
    description: '',
    image: '',
    buttonText: 'Explore now',
    buttonLink: '/catalog',
  };
}

function isExternalLink(link: string) {
  return /^https?:\/\//i.test(link);
}

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
      announcementText: form.announcementText.trim(),
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
        className={`flex items-center gap-3 border px-3 py-3 ${
          selected ? 'border-brand-200 bg-brand-50/60' : 'border-brand-100 bg-white'
        }`}
      >
        <img
          src={product.image}
          alt=""
          className="h-12 w-12 shrink-0 rounded-lg bg-surface object-cover"
        />

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-charcoal">{product.name}</p>
          <p className="mt-0.5 text-xs text-charcoal-lighter">
            {product.category || 'Uncategorized'} · ₹{product.price.toLocaleString('en-IN')}
          </p>
        </div>

        <button
          type="button"
          onClick={() => toggleProduct(field, product.id)}
          className={`inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-medium transition-colors ${
            selected
              ? 'border-brand-500 bg-brand-500 text-white hover:bg-brand-600'
              : 'border-brand-200 text-charcoal-light hover:bg-brand-50'
          }`}
        >
          {selected ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
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
              className="flex h-8 w-8 items-center justify-center rounded-md border border-brand-100 text-charcoal-light disabled:cursor-not-allowed disabled:opacity-30"
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
              className="flex h-8 w-8 items-center justify-center rounded-md border border-brand-100 text-charcoal-light disabled:cursor-not-allowed disabled:opacity-30"
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
        <Loader2 className="h-7 w-7 animate-spin text-brand-500" />
        <span className="text-sm text-charcoal-light">Loading homepage controls...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
        Failed to load homepage settings. Please refresh and try again.
      </div>
    );
  }

  return (
    <form onSubmit={save} className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.15em] text-brand-500">Storefront</p>
          <h1 className="mt-1 text-2xl font-serif font-bold text-charcoal">Home Page</h1>
          <p className="mt-1 text-sm text-charcoal-light">
            Control homepage promotions, products, categories and the announcement bar.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {showSuccess && (
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-green-600">
              <CheckCircle2 className="h-4 w-4" /> Saved
            </span>
          )}
          <Link
            to="/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-brand-200 bg-white px-4 py-2.5 text-sm font-medium text-charcoal hover:bg-brand-50"
          >
            <Eye className="h-4 w-4" /> Preview storefront
          </Link>
          <Button type="submit" isLoading={updateHomepage.isPending}>
            <Save className="mr-2 h-4 w-4" />
            {updateHomepage.isPending ? 'Saving...' : 'Save Home Page'}
          </Button>
        </div>
      </div>

      <Card className="border-none p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-serif text-lg font-semibold text-charcoal">Announcement Bar</h2>
            <p className="mt-1 text-sm text-charcoal-light">
              This message can be changed without editing the storefront code.
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              setForm((current) => ({
                ...current,
                announcementEnabled: !current.announcementEnabled,
              }))
            }
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              form.announcementEnabled
                ? 'bg-green-50 text-green-700'
                : 'bg-surface text-charcoal-light'
            }`}
          >
            {form.announcementEnabled ? 'Enabled' : 'Disabled'}
          </button>
        </div>
        <div className="mt-5">
          <Input
            label="Announcement text"
            value={form.announcementText}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                announcementText: event.target.value,
              }))
            }
            placeholder="Free Pan-India shipping on orders over ₹499..."
          />
        </div>
      </Card>

      <Card className="border-none p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="font-serif text-lg font-semibold text-charcoal">Hero Promotions</h2>
            <p className="mt-1 max-w-3xl text-sm text-charcoal-light">
              Create promotional slides for new launches, sales, announcements and campaigns. These are independent of products in the catalog.
            </p>
          </div>
          <Button type="button" onClick={addHeroSlide}>
            <Plus className="mr-2 h-4 w-4" /> Add slide
          </Button>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="flex items-center justify-between rounded-lg border border-brand-100 bg-surface px-4 py-3">
            <div>
              <p className="text-sm font-medium text-charcoal">Automatic slideshow</p>
              <p className="mt-0.5 text-xs text-charcoal-light">Automatically move through enabled slides.</p>
            </div>
            <button
              type="button"
              onClick={() =>
                setForm((current) => ({ ...current, heroAutoplay: !current.heroAutoplay }))
              }
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                form.heroAutoplay ? 'bg-green-50 text-green-700' : 'bg-surface text-charcoal-light'
              }`}
            >
              {form.heroAutoplay ? 'Enabled' : 'Disabled'}
            </button>
          </div>

          <div className="rounded-lg border border-brand-100 bg-surface px-4 py-3">
            <label className="block text-sm font-medium text-charcoal" htmlFor="hero-interval">
              Slide duration
            </label>
            <div className="mt-2 flex items-center gap-3">
              <input
                id="hero-interval"
                type="range"
                min={2500}
                max={15000}
                step={500}
                value={form.heroInterval}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    heroInterval: Number(event.target.value),
                  }))
                }
                className="w-full accent-[#b4491e]"
              />
              <span className="w-20 text-right text-sm font-medium text-charcoal">
                {(form.heroInterval / 1000).toFixed(1)}s
              </span>
            </div>
          </div>
        </div>

        {form.heroSlides.length === 0 ? (
          <div className="mt-5 rounded-lg border border-dashed border-brand-200 bg-surface px-6 py-12 text-center">
            <p className="text-sm font-medium text-charcoal">No hero slides yet.</p>
            <p className="mt-1 text-xs text-charcoal-light">
              Add a slide for a new arrival, sale, campaign or important announcement.
            </p>
          </div>
        ) : (
          <div className="mt-5 space-y-5">
            {form.heroSlides.map((slide, index) => (
              <Card key={slide.id} className="border border-brand-100 p-5 shadow-none">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.15em] text-brand-500">
                      Slide {index + 1}
                    </p>
                    <p className="mt-1 text-sm text-charcoal-light">
                      {slide.title || 'Untitled promotion'}
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => moveHeroSlide(index, -1)}
                      className="flex h-8 w-8 items-center justify-center rounded-md border border-brand-100 text-charcoal-light disabled:opacity-30"
                      aria-label="Move slide up"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={index === form.heroSlides.length - 1}
                      onClick={() => moveHeroSlide(index, 1)}
                      className="flex h-8 w-8 items-center justify-center rounded-md border border-brand-100 text-charcoal-light disabled:opacity-30"
                      aria-label="Move slide down"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeHeroSlide(slide.id)}
                      className="ml-1 flex h-8 w-8 items-center justify-center rounded-md border border-red-200 text-red-600 hover:bg-red-50"
                      aria-label="Delete slide"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="mt-5 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
                  <div className="space-y-4">
                    <Input
                      label="Small label"
                      value={slide.eyebrow}
                      onChange={(event) => updateHeroSlide(slide.id, 'eyebrow', event.target.value)}
                      placeholder="NEW ARRIVAL / SALE / ANNOUNCEMENT"
                    />
                    <Input
                      label="Main heading"
                      value={slide.title}
                      onChange={(event) => updateHeroSlide(slide.id, 'title', event.target.value)}
                      placeholder="Summer Print Sale"
                      required
                    />
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-charcoal">Description</label>
                      <textarea
                        value={slide.description}
                        onChange={(event) => updateHeroSlide(slide.id, 'description', event.target.value)}
                        placeholder="Up to 20% off selected pieces this week."
                        rows={4}
                        className="w-full rounded-lg border border-brand-200 bg-white px-3 py-2.5 text-sm text-charcoal outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Input
                      label="Hero image URL"
                      value={slide.image}
                      onChange={(event) => updateHeroSlide(slide.id, 'image', event.target.value)}
                      placeholder="https://..."
                      type="url"
                    />
                    {slide.image ? (
                      <div className="overflow-hidden border border-brand-100 bg-surface">
                        <img src={slide.image} alt="" className="aspect-[16/9] w-full object-cover" />
                      </div>
                    ) : (
                      <div className="flex aspect-[16/9] items-center justify-center border border-dashed border-brand-200 bg-surface text-xs text-charcoal-light">
                        Add an image URL to preview the banner.
                      </div>
                    )}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Input
                        label="Button text"
                        value={slide.buttonText}
                        onChange={(event) => updateHeroSlide(slide.id, 'buttonText', event.target.value)}
                        placeholder="Shop now"
                      />
                      <Input
                        label="Button link"
                        value={slide.buttonLink}
                        onChange={(event) => updateHeroSlide(slide.id, 'buttonLink', event.target.value)}
                        placeholder="/catalog"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => updateHeroSlide(slide.id, 'enabled', !slide.enabled)}
                      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${
                        slide.enabled ? 'bg-green-50 text-green-700' : 'bg-surface text-charcoal-light'
                      }`}
                    >
                      {slide.enabled ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                      {slide.enabled ? 'Visible on storefront' : 'Hidden on storefront'}
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-none p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="font-serif text-lg font-semibold text-charcoal">Homepage Product Sections</h2>
            <p className="mt-1 text-sm text-charcoal-light">
              Control the products shown in the stocked-products section and the lower workshop grid independently.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-charcoal">Pieces We Keep Stocked</h3>
            <p className="mt-1 text-xs text-charcoal-light">Select and order the products for the main featured section.</p>
            <div className="mt-3 space-y-2">
              {activeProducts.map((product) => renderProductRow(product, 'featuredProductIds'))}
            </div>
          </div>

          <div className="mt-8 border-t border-brand-100 pt-6">
            <h3 className="text-sm font-semibold text-charcoal">More From the Workshop</h3>
            <p className="mt-1 text-xs text-charcoal-light">Select and order the products for the lower homepage grid.</p>
            <div className="mt-3 space-y-2">
              {activeProducts.map((product) => renderProductRow(product, 'selectedProductIds'))}
            </div>
          </div>
        </Card>

        <Card className="border-none p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="font-serif text-lg font-semibold text-charcoal">Shop by Category</h2>
            <p className="mt-1 text-sm text-charcoal-light">
              Select the categories and their order on the homepage. Category images continue to come from the product catalog.
            </p>
          </div>

          {availableCategories.length === 0 ? (
            <p className="py-8 text-center text-sm text-charcoal-light">Create products with categories first.</p>
          ) : (
            <div className="grid gap-2">
              {availableCategories.map((category) => {
                const selected = form.categoryNames.includes(category);
                const index = form.categoryNames.indexOf(category);
                return (
                  <div
                    key={category}
                    className={`flex items-center gap-3 border p-3 ${
                      selected ? 'border-brand-200 bg-brand-50/60' : 'border-brand-100 bg-white'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleCategory(category)}
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                        selected ? 'border-brand-500 bg-brand-500 text-white' : 'border-brand-200 text-transparent'
                      }`}
                      aria-label={`${selected ? 'Remove' : 'Add'} ${category}`}
                    >
                      <span className="text-sm">✓</span>
                    </button>
                    <span className="flex-1 text-sm font-medium text-charcoal">{category}</span>
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
                          className="flex h-7 w-7 items-center justify-center rounded-md border border-brand-100 text-charcoal-light disabled:opacity-30"
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
                          className="flex h-7 w-7 items-center justify-center rounded-md border border-brand-100 text-charcoal-light disabled:opacity-30"
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
        </Card>
      </div>
    </form>
  );
}
