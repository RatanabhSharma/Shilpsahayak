import { useState, useEffect } from 'react';
import {
  X,
  Loader2,
  Upload,
  FileText,
  Image as ImageIcon,
  Tag,
  Package,
  Truck,
  Globe,
  Plus,
  Trash2,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import {
  Product,
  ProductVariant,
  ProductStatus,
} from '../../../hooks/useProducts';
import { uploadProductImage } from '../../../utils/uploadFile';

export interface ProductModalEditorProps {
  isOpen: boolean;
  product: Product | null;
  categories: { id: string; name: string }[];
  onClose: () => void;
  onSave: (productData: Partial<Product>) => Promise<void>;
  onOpenCategoriesManager: () => void;
}

export type EditorTab =
  | 'general'
  | 'media'
  | 'pricing'
  | 'inventory'
  | 'shipping'
  | 'seo';

const emptyVariant = (): ProductVariant => ({
  id: crypto.randomUUID(),
  label: '',
  sku: '',
  price: 0,
  originalPrice: 0,
  costPrice: 0,
  stock: 0,
  image: '',
  theme: '',
  color: '',
  size: '',
  weight: 0,
});

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function generateSku(category: string, name: string): string {
  const catPrefix = (category || 'GEN')
    .replace(/[^a-zA-Z]/g, '')
    .slice(0, 3)
    .toUpperCase();
  const namePrefix = (name || 'PRD')
    .replace(/[^a-zA-Z]/g, '')
    .slice(0, 3)
    .toUpperCase();
  const randomNum = Math.floor(100 + Math.random() * 900);
  return `SS-${catPrefix}-${namePrefix}-${randomNum}`;
}

export const ProductModalEditor: React.FC<ProductModalEditorProps> = ({
  isOpen,
  product,
  categories,
  onClose,
  onSave,
  onOpenCategoriesManager,
}) => {
  const [activeTab, setActiveTab] = useState<EditorTab>('general');
  const [saving, setSaving] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [sku, setSku] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [status, setStatus] = useState<ProductStatus>('Active');
  const [badge, setBadge] = useState('');
  const [material, setMaterial] = useState('PLA');
  const [occasion, setOccasion] = useState('');
  const [featured, setFeatured] = useState(false);
  const [isCustomizable, setIsCustomizable] = useState(false);
  const [isCancellable, setIsCancellable] = useState(true);

  // Media
  const [image, setImage] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [newGalleryImageUrl, setNewGalleryImageUrl] = useState('');
  const [imageUploading, setImageUploading] = useState(false);
  const [imageUploadProgress, setImageUploadProgress] = useState<number | null>(null);
  const [showManualUrl, setShowManualUrl] = useState(false);

  // Pricing
  const [price, setPrice] = useState<number | ''>(0);
  const [originalPrice, setOriginalPrice] = useState<number | ''>('');
  const [costPrice, setCostPrice] = useState<number | ''>('');

  // Inventory & Variants
  const [stock, setStock] = useState<number | ''>(0);
  const [lowStockThreshold, setLowStockThreshold] = useState<number | ''>(5);
  const [hasVariants, setHasVariants] = useState(false);
  const [variants, setVariants] = useState<ProductVariant[]>([]);

  // Shipping & Dimensions
  const [weight, setWeight] = useState<number | ''>('');
  const [length, setLength] = useState<number | ''>('');
  const [width, setWidth] = useState<number | ''>('');
  const [height, setHeight] = useState<number | ''>('');
  const [dimUnit, setDimUnit] = useState<'mm' | 'cm' | 'in'>('mm');
  const [leadTimeDays, setLeadTimeDays] = useState<number | ''>(2);
  const [packagingNotes, setPackagingNotes] = useState('');

  // SEO
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  // Initialize form when product changes or modal opens
  useEffect(() => {
    if (product) {
      setName(product.name || '');
      setSlug(product.slug || slugify(product.name || ''));
      setSku(product.sku || '');
      setShortDescription(product.shortDescription || '');
      setDescription(product.description || '');
      setCategory(product.category || '');
      setSubcategory(product.subcategory || '');
      setStatus(product.status || (product.active !== false ? 'Active' : 'Draft'));
      setBadge(product.badge || '');
      setMaterial(product.material || 'PLA');
      setOccasion(product.occasion || '');
      setFeatured(!!product.featured);
      setIsCustomizable(!!product.isCustomizable);
      setIsCancellable(product.isCancellable !== false);

      setImage(product.image || '');
      setImages(product.images || []);

      setPrice(product.price || 0);
      setOriginalPrice(product.originalPrice || '');
      setCostPrice(product.costPrice || '');

      setStock(product.stock || 0);
      setLowStockThreshold(product.lowStockThreshold ?? 5);
      setHasVariants(!!product.hasVariants);
      setVariants(
        (product.variants || []).map((v) => ({
          ...v,
          originalPrice: v.originalPrice || 0,
          costPrice: v.costPrice || 0,
          weight: v.weight || 0,
        }))
      );

      setWeight(product.weight || '');
      setLength(product.dimensions?.length || '');
      setWidth(product.dimensions?.width || '');
      setHeight(product.dimensions?.height || '');
      setDimUnit(product.dimensions?.unit || 'mm');
      setLeadTimeDays(product.leadTimeDays ?? 2);
      setPackagingNotes(product.packagingNotes || '');

      setSeoTitle(product.seoTitle || product.name || '');
      setSeoDescription(product.seoDescription || product.description?.slice(0, 160) || '');
      setTagsInput((product.tags || []).join(', '));
    } else {
      // Defaults for brand new product
      setName('');
      setSlug('');
      setSku('');
      setShortDescription('');
      setDescription('');
      setCategory(categories[0]?.name || '');
      setSubcategory('');
      setStatus('Active');
      setBadge('');
      setMaterial('PLA');
      setOccasion('');
      setFeatured(false);
      setIsCustomizable(false);
      setIsCancellable(true);

      setImage('');
      setImages([]);

      setPrice(0);
      setOriginalPrice('');
      setCostPrice('');

      setStock(10);
      setLowStockThreshold(5);
      setHasVariants(false);
      setVariants([]);

      setWeight(150);
      setLength('');
      setWidth('');
      setHeight('');
      setDimUnit('mm');
      setLeadTimeDays(2);
      setPackagingNotes('Cardboard box with cushioning');

      setSeoTitle('');
      setSeoDescription('');
      setTagsInput('');
    }
    setActiveTab('general');
  }, [product, isOpen, categories]);

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

  if (!isOpen) return null;

  // Margin calculation
  const priceNum = typeof price === 'number' ? price : 0;
  const costNum = typeof costPrice === 'number' ? costPrice : 0;
  const origPriceNum = typeof originalPrice === 'number' ? originalPrice : 0;

  const profitNum = priceNum > 0 && costNum > 0 ? priceNum - costNum : 0;
  const grossMarginPercent =
    priceNum > 0 && costNum > 0
      ? Math.round(((priceNum - costNum) / priceNum) * 100)
      : null;

  const discountPercent =
    origPriceNum > priceNum && priceNum > 0
      ? Math.round(((origPriceNum - priceNum) / origPriceNum) * 100)
      : null;

  // Total stock calculated from variants if enabled
  const totalStock = hasVariants
    ? variants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0)
    : Number(stock) || 0;

  // Variant Helpers
  const addVariantRow = () => {
    const newVar = emptyVariant();
    newVar.price = priceNum;
    newVar.costPrice = costNum;
    newVar.stock = 5;
    newVar.sku = `${sku || 'VAR'}-${variants.length + 1}`;
    setVariants([...variants, newVar]);
  };

  const updateVariant = (index: number, field: keyof ProductVariant, val: any) => {
    const updated = [...variants];
    updated[index] = { ...updated[index], [field]: val };
    setVariants(updated);
  };

  const removeVariant = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  // Gallery Helpers
  const addGalleryImage = () => {
    if (!newGalleryImageUrl.trim()) return;
    setImages([...images, newGalleryImageUrl.trim()]);
    setNewGalleryImageUrl('');
  };

  const removeGalleryImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      alert('Product name is required.');
      setActiveTab('general');
      return;
    }

    if (!image.trim()) {
      alert('Please upload or provide a primary product image.');
      setActiveTab('media');
      return;
    }

    setSaving(true);
    try {
      const cleanVariants = hasVariants
        ? variants
            .filter((v) => v.label.trim())
            .map((v) => ({
              id: v.id || crypto.randomUUID(),
              label: v.label.trim(),
              sku: v.sku?.trim() || undefined,
              price: Number(v.price) || 0,
              originalPrice: Number(v.originalPrice) || 0,
              costPrice: Number(v.costPrice) || 0,
              stock: Number(v.stock) || 0,
              image: v.image?.trim() || '',
              theme: v.theme || '',
              color: v.color || '',
              size: v.size || '',
              weight: Number(v.weight) || 0,
            }))
        : [];

      let finalPrice = priceNum;
      let finalOrigPrice = origPriceNum || finalPrice;

      if (hasVariants && cleanVariants.length > 0) {
        const sorted = [...cleanVariants].sort((a, b) => a.price - b.price);
        finalPrice = sorted[0].price;
        finalOrigPrice = sorted[0].originalPrice || finalPrice;
      }

      const tagsArray = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const payload: Partial<Product> = {
        name: name.trim(),
        slug: (slug || slugify(name)).trim(),
        sku: sku.trim() || generateSku(category, name),
        shortDescription: shortDescription.trim(),
        description: description.trim(),
        price: finalPrice,
        originalPrice: finalOrigPrice,
        costPrice: costNum > 0 ? costNum : undefined,
        category: category || 'General',
        subcategory: subcategory.trim() || undefined,
        image: image.trim(),
        images: images.filter(Boolean),
        stock: totalStock,
        lowStockThreshold: typeof lowStockThreshold === 'number' ? lowStockThreshold : 5,
        material: material.trim(),
        occasion: occasion.trim() || undefined,
        status,
        active: status === 'Active',
        badge: badge.trim() || undefined,
        featured,
        isCustomizable,
        isCancellable,
        hasVariants,
        variants: cleanVariants,
        weight: typeof weight === 'number' ? weight : undefined,
        dimensions:
          length || width || height
            ? {
                length: Number(length) || 0,
                width: Number(width) || 0,
                height: Number(height) || 0,
                unit: dimUnit,
              }
            : undefined,
        leadTimeDays: typeof leadTimeDays === 'number' ? leadTimeDays : undefined,
        packagingNotes: packagingNotes.trim() || undefined,
        tags: tagsArray,
        seoTitle: (seoTitle || name).trim(),
        seoDescription: (seoDescription || shortDescription || description.slice(0, 160)).trim(),
        updatedAt: new Date().toISOString(),
      };

      await onSave(payload);
      onClose();
    } catch (err: any) {
      console.error('Failed to save product:', err);
      alert(err?.message || 'Failed to save product.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-ink/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-line flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-line bg-shell/40 flex items-center justify-between shrink-0">
          <div>
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-accent block">
              {product ? 'Catalogue Management' : 'Create Catalogue Item'}
            </span>
            <h2 className="font-display text-lg font-bold text-ink">
              {product ? `Edit: ${product.name}` : 'Add New Ready-Made Product'}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted hover:text-ink hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 6-Tab Navigation Bar */}
        <div className="px-6 bg-white border-b border-line flex items-center gap-1 overflow-x-auto shrink-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`inline-flex items-center gap-2 py-3 px-3.5 border-b-2 text-xs font-mono font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'general'
                ? 'border-accent text-accent'
                : 'border-transparent text-muted hover:text-ink hover:border-slate-300'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>General</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('media')}
            className={`inline-flex items-center gap-2 py-3 px-3.5 border-b-2 text-xs font-mono font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'media'
                ? 'border-accent text-accent'
                : 'border-transparent text-muted hover:text-ink hover:border-slate-300'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Media</span>
            {images.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-slate-100 text-[10px]">
                {images.length + 1}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pricing')}
            className={`inline-flex items-center gap-2 py-3 px-3.5 border-b-2 text-xs font-mono font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'pricing'
                ? 'border-accent text-accent'
                : 'border-transparent text-muted hover:text-ink hover:border-slate-300'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Pricing</span>
            {grossMarginPercent !== null && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                {grossMarginPercent}%
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('inventory')}
            className={`inline-flex items-center gap-2 py-3 px-3.5 border-b-2 text-xs font-mono font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'inventory'
                ? 'border-accent text-accent'
                : 'border-transparent text-muted hover:text-ink hover:border-slate-300'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Inventory</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full bg-slate-100 text-[10px]">
              {totalStock} in stock
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('shipping')}
            className={`inline-flex items-center gap-2 py-3 px-3.5 border-b-2 text-xs font-mono font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'shipping'
                ? 'border-accent text-accent'
                : 'border-transparent text-muted hover:text-ink hover:border-slate-300'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Shipping</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('seo')}
            className={`inline-flex items-center gap-2 py-3 px-3.5 border-b-2 text-xs font-mono font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'seo'
                ? 'border-accent text-accent'
                : 'border-transparent text-muted hover:text-ink hover:border-slate-300'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>SEO</span>
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* TAB 1: GENERAL */}
          {activeTab === 'general' && (
            <div className="space-y-4">
              {/* Name & Slug */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-muted mb-1">
                    Product Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (!product) {
                        setSlug(slugify(e.target.value));
                      }
                    }}
                    placeholder="e.g. The Reveal Moonlight 3D Lamp"
                    className="w-full px-3 py-2 text-xs font-semibold text-ink bg-white border border-line rounded-xl outline-none focus:border-accent"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-mono font-bold uppercase tracking-wider text-muted">
                      URL Slug
                    </label>
                    <button
                      type="button"
                      onClick={() => setSlug(slugify(name))}
                      className="text-[10px] font-mono text-accent hover:underline flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Generate from Title</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(slugify(e.target.value))}
                    placeholder="e.g. the-reveal-moonlight-3d-lamp"
                    className="w-full px-3 py-2 text-xs font-mono text-slate-700 bg-white border border-line rounded-xl outline-none focus:border-accent"
                  />
                </div>
              </div>

              {/* Descriptions */}
              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-muted mb-1">
                  Short Description (Highlight snippet)
                </label>
                <input
                  type="text"
                  value={shortDescription}
                  onChange={(e) => setShortDescription(e.target.value)}
                  placeholder="One sentence summary for catalog cards and checkout preview..."
                  className="w-full px-3 py-2 text-xs text-ink bg-white border border-line rounded-xl outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-muted mb-1">
                  Full Detailed Description
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Comprehensive description covering print run details, ambient lighting, finish, materials, and care instructions..."
                  className="w-full px-3 py-2 text-xs text-ink bg-white border border-line rounded-xl outline-none focus:border-accent"
                />
              </div>

              {/* Category, Subcategory, Material */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-mono font-bold uppercase tracking-wider text-muted">
                      Category *
                    </label>
                    <button
                      type="button"
                      onClick={onOpenCategoriesManager}
                      className="text-[10px] font-mono text-accent hover:underline font-bold"
                    >
                      + Manage
                    </button>
                  </div>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold text-ink bg-white border border-line rounded-xl outline-none focus:border-accent cursor-pointer"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-muted mb-1">
                    Subcategory (Optional)
                  </label>
                  <input
                    type="text"
                    value={subcategory}
                    onChange={(e) => setSubcategory(e.target.value)}
                    placeholder="e.g. Ambient Lamps"
                    className="w-full px-3 py-2 text-xs text-ink bg-white border border-line rounded-xl outline-none focus:border-accent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-muted mb-1">
                    Default Material
                  </label>
                  <input
                    type="text"
                    value={material}
                    onChange={(e) => setMaterial(e.target.value)}
                    placeholder="e.g. Translucent PLA+"
                    className="w-full px-3 py-2 text-xs font-mono text-ink bg-white border border-line rounded-xl outline-none focus:border-accent"
                  />
                </div>
              </div>

              {/* Status & Badges Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-muted mb-2">
                    Product Publication Status
                  </label>
                  <div className="grid grid-cols-3 gap-2 font-mono text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setStatus('Active')}
                      className={`py-2 px-3 rounded-xl border text-center transition-all cursor-pointer ${
                        status === 'Active'
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-xs'
                          : 'border-line text-muted hover:bg-shell'
                      }`}
                    >
                      Active
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatus('Draft')}
                      className={`py-2 px-3 rounded-xl border text-center transition-all cursor-pointer ${
                        status === 'Draft'
                          ? 'bg-amber-50 border-amber-500 text-amber-800 shadow-xs'
                          : 'border-line text-muted hover:bg-shell'
                      }`}
                    >
                      Draft
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatus('Archived')}
                      className={`py-2 px-3 rounded-xl border text-center transition-all cursor-pointer ${
                        status === 'Archived'
                          ? 'bg-slate-100 border-slate-400 text-slate-700 shadow-xs'
                          : 'border-line text-muted hover:bg-shell'
                      }`}
                    >
                      Archived
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-muted mb-2">
                    Promotional Badge / Tag
                  </label>
                  <select
                    value={badge}
                    onChange={(e) => setBadge(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono text-ink bg-white border border-line rounded-xl outline-none focus:border-accent cursor-pointer"
                  >
                    <option value="">No Badge</option>
                    <option value="Bestseller">Bestseller</option>
                    <option value="New Arrival">New Arrival</option>
                    <option value="Featured">Featured</option>
                    <option value="Sale">Sale / Discounted</option>
                    <option value="Limited Edition">Limited Edition</option>
                  </select>
                </div>
              </div>

              {/* Feature Toggles */}
              <div className="p-4 rounded-xl border border-line bg-shell/50 flex flex-wrap items-center gap-6 font-mono text-xs text-ink">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={featured}
                    onChange={(e) => setFeatured(e.target.checked)}
                    className="accent-[#ff4d00]"
                  />
                  <span>Featured on Storefront Homepage</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isCustomizable}
                    onChange={(e) => setIsCustomizable(e.target.checked)}
                    className="accent-[#ff4d00]"
                  />
                  <span>Allows Custom Text / Engraving</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isCancellable}
                    onChange={(e) => setIsCancellable(e.target.checked)}
                    className="accent-[#ff4d00]"
                  />
                  <span>Eligible for Cancellation (Pre-Printing)</span>
                </label>
              </div>
            </div>
          )}

          {/* TAB 2: MEDIA */}
          {activeTab === 'media' && (
            <div className="space-y-6">
              {/* Primary Image */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-muted">
                    Primary Product Image *
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowManualUrl(!showManualUrl)}
                    className="font-mono text-xs font-bold text-accent hover:underline"
                  >
                    {showManualUrl ? 'Use File Uploader' : 'Enter Direct Image URL'}
                  </button>
                </div>

                {showManualUrl ? (
                  <input
                    type="url"
                    value={image}
                    onChange={(e) => setImage(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full px-3 py-2 text-xs font-mono text-ink bg-white border border-line rounded-xl outline-none focus:border-accent"
                  />
                ) : (
                  <div>
                    <input
                      id="primary-img-input"
                      type="file"
                      accept=".png,.jpg,.jpeg,.webp"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setImageUploading(true);
                        setImageUploadProgress(0);
                        try {
                          const url = await uploadProductImage(file, (p) =>
                            setImageUploadProgress(p)
                          );
                          setImage(url);
                        } catch (err: any) {
                          alert(err?.message || 'Failed to upload image.');
                        } finally {
                          setImageUploading(false);
                          setImageUploadProgress(null);
                        }
                      }}
                      className="hidden"
                    />

                    {image ? (
                      <div className="flex items-center justify-between p-3 rounded-xl border border-line bg-shell/40">
                        <div className="flex items-center gap-3">
                          <img
                            src={image}
                            alt="Primary preview"
                            className="w-16 h-16 rounded-lg object-contain bg-white border border-line"
                          />
                          <div>
                            <span className="font-mono text-xs font-bold text-ink block">
                              Primary Product Display
                            </span>
                            <span className="font-mono text-[10px] text-emerald-600 font-bold">
                              ✓ Ready
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setImage('')}
                          className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50"
                          title="Remove image"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <label
                        htmlFor="primary-img-input"
                        className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-line rounded-2xl bg-white hover:bg-shell/40 cursor-pointer transition-colors"
                      >
                        {imageUploading ? (
                          <div className="flex flex-col items-center gap-2">
                            <Loader2 className="w-6 h-6 animate-spin text-accent" />
                            <span className="font-mono text-xs text-accent">
                              Uploading image: {imageUploadProgress}%
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2">
                            <Upload className="w-6 h-6 text-muted" />
                            <span className="font-mono text-xs font-bold text-ink">
                              Upload Primary Image (PNG, JPG, WEBP)
                            </span>
                            <span className="text-[10px] font-mono text-muted">
                              Recommended 1000×1000px square ratio
                            </span>
                          </div>
                        )}
                      </label>
                    )}
                  </div>
                )}
              </div>

              {/* Gallery Images */}
              <div className="space-y-3 pt-4 border-t border-line">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-mono font-bold uppercase tracking-wider text-muted">
                      Additional Gallery Images ({images.length})
                    </label>
                    <span className="text-[11px] text-muted font-mono">
                      Supporting angles, scale references, and lifestyle photos
                    </span>
                  </div>
                </div>

                {/* Add Gallery Image Row */}
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={newGalleryImageUrl}
                    onChange={(e) => setNewGalleryImageUrl(e.target.value)}
                    placeholder="Enter additional photo URL (https://...)"
                    className="flex-1 px-3 py-2 text-xs font-mono text-ink bg-white border border-line rounded-xl outline-none focus:border-accent"
                  />
                  <button
                    type="button"
                    onClick={addGalleryImage}
                    className="px-4 py-2 rounded-xl bg-accent/10 hover:bg-accent/20 text-accent font-mono text-xs font-bold transition-colors cursor-pointer"
                  >
                    + Add Image
                  </button>
                </div>

                {/* Gallery Preview Grid */}
                {images.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                    {images.map((imgUrl, idx) => (
                      <div
                        key={idx}
                        className="relative rounded-xl border border-line bg-white p-2 group shadow-2xs"
                      >
                        <img
                          src={imgUrl}
                          alt={`Gallery ${idx + 1}`}
                          className="w-full h-24 object-contain rounded-lg bg-shell"
                        />
                        <button
                          type="button"
                          onClick={() => removeGalleryImage(idx)}
                          className="absolute top-3 right-3 p-1 rounded-md bg-white/90 text-rose-600 hover:bg-rose-50 shadow-xs cursor-pointer opacity-90 group-hover:opacity-100"
                          title="Remove image"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: PRICING */}
          {activeTab === 'pricing' && (
            <div className="space-y-6">
              {/* Pricing Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-muted mb-1">
                    Selling Price (₹) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm font-bold text-muted">
                      ₹
                    </span>
                    <input
                      type="number"
                      required
                      min={0}
                      value={price}
                      onChange={(e) =>
                        setPrice(e.target.value ? Number(e.target.value) : '')
                      }
                      className="w-full pl-8 pr-3 py-2 text-sm font-mono font-bold text-ink bg-white border border-line rounded-xl outline-none focus:border-accent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-muted mb-1">
                    Original / MRP (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm font-bold text-muted">
                      ₹
                    </span>
                    <input
                      type="number"
                      min={0}
                      value={originalPrice}
                      onChange={(e) =>
                        setOriginalPrice(e.target.value ? Number(e.target.value) : '')
                      }
                      placeholder="e.g. 1999"
                      className="w-full pl-8 pr-3 py-2 text-sm font-mono text-slate-700 bg-white border border-line rounded-xl outline-none focus:border-accent"
                    />
                  </div>
                  {discountPercent !== null && (
                    <span className="block mt-1 text-[11px] font-mono font-bold text-emerald-600">
                      ⚡ Save {discountPercent}% discount badge will show on storefront
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-muted mb-1">
                    Cost Price / COGS (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm font-bold text-muted">
                      ₹
                    </span>
                    <input
                      type="number"
                      min={0}
                      value={costPrice}
                      onChange={(e) =>
                        setCostPrice(e.target.value ? Number(e.target.value) : '')
                      }
                      placeholder="e.g. 450 (material + electricity)"
                      className="w-full pl-8 pr-3 py-2 text-sm font-mono text-slate-700 bg-white border border-line rounded-xl outline-none focus:border-accent"
                    />
                  </div>
                  <span className="text-[10px] font-mono text-muted block mt-1">
                    Internal only — never shown to customer
                  </span>
                </div>
              </div>

              {/* Profit & Margin Indicator Card */}
              {costNum > 0 && priceNum > 0 && (
                <div className="p-4 rounded-2xl border border-line bg-shell/50 space-y-3">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-accent block">
                    Financial Margins & Profitability
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono">
                    <div className="p-3 bg-white rounded-xl border border-line text-center">
                      <span className="text-[10px] text-muted uppercase font-bold block">
                        Net Profit per Unit
                      </span>
                      <span className="text-base font-bold text-emerald-600 mt-0.5 block">
                        ₹{profitNum.toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-line text-center">
                      <span className="text-[10px] text-muted uppercase font-bold block">
                        Gross Profit Margin
                      </span>
                      <span
                        className={`text-base font-bold mt-0.5 block ${
                          grossMarginPercent && grossMarginPercent >= 40
                            ? 'text-emerald-600'
                            : grossMarginPercent && grossMarginPercent >= 20
                            ? 'text-amber-600'
                            : 'text-rose-600'
                        }`}
                      >
                        {grossMarginPercent}%
                      </span>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-line text-center">
                      <span className="text-[10px] text-muted uppercase font-bold block">
                        Markup Multiplier
                      </span>
                      <span className="text-base font-bold text-ink mt-0.5 block">
                        {(priceNum / costNum).toFixed(2)}×
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="p-3 rounded-xl border border-line bg-paper text-xs font-mono text-muted flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-accent shrink-0" />
                <span>
                  All Shilp Sahayak retail catalogue selling prices include applicable 18% GST for B2C consumer invoices.
                </span>
              </div>
            </div>
          )}

          {/* TAB 4: INVENTORY & VARIANTS */}
          {activeTab === 'inventory' && (
            <div className="space-y-6">
              {/* SKU & Single Stock */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-mono font-bold uppercase tracking-wider text-muted">
                      Base SKU
                    </label>
                    <button
                      type="button"
                      onClick={() => setSku(generateSku(category, name))}
                      className="text-[10px] font-mono text-accent hover:underline font-bold"
                    >
                      Auto-generate
                    </button>
                  </div>
                  <input
                    type="text"
                    value={sku}
                    onChange={(e) => setSku(e.target.value.toUpperCase())}
                    placeholder="e.g. SS-LMP-001"
                    className="w-full px-3 py-2 text-xs font-mono font-bold text-ink bg-white border border-line rounded-xl outline-none focus:border-accent uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-muted mb-1">
                    Finished Stock (Units) *
                  </label>
                  <input
                    type="number"
                    min={0}
                    disabled={hasVariants}
                    value={hasVariants ? totalStock : stock}
                    onChange={(e) =>
                      setStock(e.target.value ? Number(e.target.value) : '')
                    }
                    className="w-full px-3 py-2 text-xs font-mono font-bold text-ink bg-white border border-line rounded-xl outline-none focus:border-accent disabled:bg-shell disabled:text-muted"
                  />
                  {hasVariants && (
                    <span className="text-[10px] font-mono text-muted block mt-1">
                      Calculated automatically from variants sum
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-muted mb-1">
                    Low Stock Threshold
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={lowStockThreshold}
                    onChange={(e) =>
                      setLowStockThreshold(e.target.value ? Number(e.target.value) : '')
                    }
                    className="w-full px-3 py-2 text-xs font-mono text-ink bg-white border border-line rounded-xl outline-none focus:border-accent"
                  />
                  <span className="text-[10px] font-mono text-muted block mt-1">
                    Triggers warning when stock falls below this
                  </span>
                </div>
              </div>

              {/* Variants Toggle */}
              <div className="pt-2 border-t border-line space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl border border-line bg-shell/40">
                  <div>
                    <label className="flex items-center gap-2 font-mono text-xs font-bold text-ink cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hasVariants}
                        onChange={(e) => {
                          setHasVariants(e.target.checked);
                          if (e.target.checked && variants.length === 0) {
                            addVariantRow();
                          }
                        }}
                        className="accent-[#ff4d00]"
                      />
                      <span>This product has multiple options / variants (size, pack, color)</span>
                    </label>
                  </div>

                  {hasVariants && (
                    <button
                      type="button"
                      onClick={addVariantRow}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-white font-mono text-xs font-bold hover:bg-accent-dark transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Option</span>
                    </button>
                  )}
                </div>

                {/* Variants List */}
                {hasVariants && (
                  <div className="space-y-3">
                    {variants.map((v, idx) => (
                      <div
                        key={v.id}
                        className="p-4 rounded-xl border border-line bg-white shadow-2xs space-y-3"
                      >
                        <div className="flex items-center justify-between pb-2 border-b border-line/60">
                          <span className="font-mono text-xs font-bold text-accent">
                            Option #{idx + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeVariant(idx)}
                            className="inline-flex items-center gap-1 text-[11px] font-mono text-rose-600 hover:underline"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove</span>
                          </button>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div>
                            <label className="block text-[10px] font-mono font-bold text-muted">
                              Option Label *
                            </label>
                            <input
                              type="text"
                              required
                              value={v.label}
                              onChange={(e) => updateVariant(idx, 'label', e.target.value)}
                              placeholder="e.g. Large (20cm)"
                              className="w-full px-2.5 py-1.5 text-xs font-semibold text-ink bg-white border border-line rounded-lg outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-mono font-bold text-muted">
                              Option SKU
                            </label>
                            <input
                              type="text"
                              value={v.sku || ''}
                              onChange={(e) => updateVariant(idx, 'sku', e.target.value.toUpperCase())}
                              placeholder="e.g. SS-LMP-001-LG"
                              className="w-full px-2.5 py-1.5 text-xs font-mono uppercase text-ink bg-white border border-line rounded-lg outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-mono font-bold text-muted">
                              Selling Price (₹) *
                            </label>
                            <input
                              type="number"
                              required
                              min={0}
                              value={v.price}
                              onChange={(e) =>
                                updateVariant(idx, 'price', Number(e.target.value))
                              }
                              className="w-full px-2.5 py-1.5 text-xs font-mono font-bold text-ink bg-white border border-line rounded-lg outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-mono font-bold text-muted">
                              Stock Units *
                            </label>
                            <input
                              type="number"
                              required
                              min={0}
                              value={v.stock}
                              onChange={(e) =>
                                updateVariant(idx, 'stock', Number(e.target.value))
                              }
                              className="w-full px-2.5 py-1.5 text-xs font-mono font-bold text-ink bg-white border border-line rounded-lg outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: SHIPPING */}
          {activeTab === 'shipping' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-muted mb-1">
                    Finished Product Weight (Grams)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      value={weight}
                      onChange={(e) =>
                        setWeight(e.target.value ? Number(e.target.value) : '')
                      }
                      placeholder="e.g. 240"
                      className="w-full px-3 py-2 text-xs font-mono font-bold text-ink bg-white border border-line rounded-xl outline-none focus:border-accent"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-xs text-muted">
                      g
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-muted mb-1">
                    Dispatch Lead Time (Days)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={leadTimeDays}
                    onChange={(e) =>
                      setLeadTimeDays(e.target.value ? Number(e.target.value) : '')
                    }
                    placeholder="e.g. 2 days"
                    className="w-full px-3 py-2 text-xs font-mono text-ink bg-white border border-line rounded-xl outline-none focus:border-accent"
                  />
                </div>
              </div>

              {/* Dimensions */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-muted">
                    Product Package Dimensions
                  </label>
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <button
                      type="button"
                      onClick={() => setDimUnit('mm')}
                      className={`px-2 py-0.5 rounded ${dimUnit === 'mm' ? 'bg-accent text-white font-bold' : 'text-muted'}`}
                    >
                      mm
                    </button>
                    <button
                      type="button"
                      onClick={() => setDimUnit('cm')}
                      className={`px-2 py-0.5 rounded ${dimUnit === 'cm' ? 'bg-accent text-white font-bold' : 'text-muted'}`}
                    >
                      cm
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-mono text-muted mb-0.5">Length</label>
                    <input
                      type="number"
                      min={0}
                      value={length}
                      onChange={(e) =>
                        setLength(e.target.value ? Number(e.target.value) : '')
                      }
                      placeholder="L"
                      className="w-full px-3 py-2 text-xs font-mono text-ink bg-white border border-line rounded-xl outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-muted mb-0.5">Width</label>
                    <input
                      type="number"
                      min={0}
                      value={width}
                      onChange={(e) =>
                        setWidth(e.target.value ? Number(e.target.value) : '')
                      }
                      placeholder="W"
                      className="w-full px-3 py-2 text-xs font-mono text-ink bg-white border border-line rounded-xl outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-muted mb-0.5">Height</label>
                    <input
                      type="number"
                      min={0}
                      value={height}
                      onChange={(e) =>
                        setHeight(e.target.value ? Number(e.target.value) : '')
                      }
                      placeholder="H"
                      className="w-full px-3 py-2 text-xs font-mono text-ink bg-white border border-line rounded-xl outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-muted mb-1">
                  Packaging & Handling Notes
                </label>
                <textarea
                  rows={2}
                  value={packagingNotes}
                  onChange={(e) => setPackagingNotes(e.target.value)}
                  placeholder="e.g. Ships in rigid cardboard box with dual foam wrap insert..."
                  className="w-full px-3 py-2 text-xs text-ink bg-white border border-line rounded-xl outline-none focus:border-accent"
                />
              </div>
            </div>
          )}

          {/* TAB 6: SEO */}
          {activeTab === 'seo' && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-muted">
                    Meta Title
                  </label>
                  <span className={`text-[10px] font-mono ${seoTitle.length > 60 ? 'text-rose-600' : 'text-muted'}`}>
                    {seoTitle.length}/60 chars
                  </span>
                </div>
                <input
                  type="text"
                  value={seoTitle}
                  onChange={(e) => setSeoTitle(e.target.value)}
                  placeholder={name || 'Product title for search engines...'}
                  className="w-full px-3 py-2 text-xs text-ink bg-white border border-line rounded-xl outline-none focus:border-accent"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-muted">
                    Meta Description
                  </label>
                  <span className={`text-[10px] font-mono ${seoDescription.length > 160 ? 'text-rose-600' : 'text-muted'}`}>
                    {seoDescription.length}/160 chars
                  </span>
                </div>
                <textarea
                  rows={3}
                  value={seoDescription}
                  onChange={(e) => setSeoDescription(e.target.value)}
                  placeholder="Compelling 150-160 character snippet that appears in Google search results..."
                  className="w-full px-3 py-2 text-xs text-ink bg-white border border-line rounded-xl outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-muted mb-1">
                  Search Tags & Keywords (Comma separated)
                </label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="3D lamp, moonlight, lithophane, bedroom decor, gifts"
                  className="w-full px-3 py-2 text-xs font-mono text-ink bg-white border border-line rounded-xl outline-none focus:border-accent"
                />
              </div>

              {/* Google SERP Snippet Preview */}
              <div className="p-4 rounded-xl border border-line bg-shell/30 space-y-1.5 pt-3">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted block">
                  Google Search Snippet Preview
                </span>
                <div className="bg-white p-3 rounded-lg border border-line/60 font-sans">
                  <div className="text-[11px] text-[#202124] flex items-center gap-1 font-mono truncate">
                    <span>https://shilpsahayak.in</span>
                    <span>›</span>
                    <span className="text-[#5f6368]">products</span>
                    <span>›</span>
                    <span className="text-[#5f6368]">{slug || 'product-slug'}</span>
                  </div>
                  <h4 className="text-sm font-semibold text-[#1a0dab] hover:underline cursor-pointer truncate mt-0.5">
                    {seoTitle || name || 'Shilp Sahayak Product'}
                  </h4>
                  <p className="text-xs text-[#4d5156] line-clamp-2 mt-0.5">
                    {seoDescription ||
                      shortDescription ||
                      description ||
                      'Shop custom 3D printed products made in India with precision fabrication.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Modal Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-line">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 rounded-xl border border-line bg-white font-mono text-xs font-bold text-ink hover:bg-shell transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="py-2.5 px-6 rounded-xl bg-accent text-white font-mono text-xs font-bold hover:bg-accent-dark transition-colors shadow-xs disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{product ? 'Save & Update Product' : 'Create Product'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
