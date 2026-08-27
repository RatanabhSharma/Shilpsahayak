import { useEffect, useMemo, useState } from 'react';
import {
  Upload,
  Loader2,
  CheckCircle2,
  FileBox,
  Lock,
  Image as ImageIcon,
  Lightbulb,
  Box,
  ShoppingCart,
  X,
  Sparkles,
  ShieldCheck,
  Info,
  Zap,
  HelpCircle,
} from 'lucide-react';
import {
  Link,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';

import {
  MATERIAL_CONFIG,
  BASE_FEE,
  MaterialType,
} from '../../config/pricing';
import { calculateSTLVolume } from '../../utils/calculateVolume';
import {
  useSubmitQuote,
  QuoteRequestType,
} from '../../hooks/useQuotes';
import { useAuth } from '../../hooks/useAuth';
import { useUserProfile } from '../../hooks/useUserProfile';
import { useSettings } from '../../hooks/useSettings';
import { upload3DFile } from '../../utils/uploadFile';
import {
  CustomPrintData,
  Product,
  useStore,
} from '../../store';
import { Button, Card, Badge, Input, Textarea } from '../../components/ui';

type ServiceMode = '3d-model' | 'image' | 'idea';

type MaterialOption = {
  id: MaterialType;
  name: string;
  rate: number;
  density: number;
};

const MAX_FILE_SIZE = 100 * 1024 * 1024;

const LAYER_HEIGHT_OPTIONS = [
  { value: '0.12', label: '0.12 mm — Ultra Detail (Miniatures)' },
  { value: '0.16', label: '0.16 mm — Fine Finish' },
  { value: '0.2', label: '0.20 mm — Standard (Recommended)' },
  { value: '0.28', label: '0.28 mm — Fast Prototype' },
];

export function CustomService() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const submitQuote = useSubmitQuote();
  const { user, loading: authLoading } = useAuth();
  const { data: profile, isLoading: profileLoading } = useUserProfile();
  const { data: settings } = useSettings();

  const whatsappNumber = settings?.whatsappNumber || '';
  const whatsappLink = whatsappNumber
    ? `https://wa.me/${whatsappNumber.replace(/\D/g, '')}`
    : '#';

  const addToCart = useStore((state) => state.addToCart);
  const products = useStore((state) => state.products);

  const productId = searchParams.get('productId');
  const variantId = searchParams.get('variantId');

  const selectedProduct = products.find((product) => product.id === productId);
  const selectedVariant = selectedProduct?.variants?.find((variant) => variant.id === variantId);

  /* Service Mode & File State */
  const [mode, setMode] = useState<ServiceMode>('3d-model');
  const [file, setFile] = useState<File | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  /* Print Settings */
  const [material, setMaterial] = useState<MaterialType>('PLA');
  const [infoMaterialModal, setInfoMaterialModal] = useState<MaterialType | null>(null);
  const [color, setColor] = useState('#FF4D00');
  const [infill, setInfill] = useState(20);
  const [layerHeight, setLayerHeight] = useState(0.2);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [description, setDescription] = useState('');

  /* Dimensions */
  const [length, setLength] = useState('');
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');

  /* Customer Details */
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  /* Calculations */
  const [volume, setVolume] = useState<number | null>(null);
  const [estimatedWeight, setEstimatedWeight] = useState<number | null>(null);
  const [estimatedPrice, setEstimatedPrice] = useState<number | null>(null);

  const materialOptions = useMemo<MaterialOption[]>(
    () =>
      (Object.keys(MATERIAL_CONFIG) as MaterialType[]).map((id) => ({
        id,
        name: id,
        rate: MATERIAL_CONFIG[id].pricePerGram,
        density: MATERIAL_CONFIG[id].density,
      })),
    []
  );

  const calculatePrice = (
    modelVolume: number,
    selectedMaterial: MaterialType,
    selectedInfill: number,
    selectedQuantity: number
  ) => {
    const config = MATERIAL_CONFIG[selectedMaterial];
    if (!config) return;

    const infillFactor = 0.3 + (selectedInfill / 100) * 0.7;
    const weight = modelVolume * config.density * infillFactor;
    const price = (weight * config.pricePerGram + BASE_FEE) * selectedQuantity;

    setEstimatedWeight(Math.round(weight * 10) / 10);
    setEstimatedPrice(Math.round(price));
  };

  useEffect(() => {
    if (mode === '3d-model' && volume !== null) {
      calculatePrice(volume, material, infill, quantity);
    }
  }, [mode, volume, material, infill, quantity]);

  useEffect(() => {
    if (profile?.name || user?.displayName) {
      setCustomerName(profile?.name || user?.displayName || '');
    }
    if (profile?.email || user?.email) {
      setCustomerEmail(profile?.email || user?.email || '');
    }
    if (profile?.phone) {
      setCustomerPhone(profile.phone);
    }
  }, [profile, user]);

  const resetFileState = () => {
    setFile(null);
    setVolume(null);
    setEstimatedWeight(null);
    setEstimatedPrice(null);
    setUploadProgress(null);
  };

  const handleModeChange = (newMode: ServiceMode) => {
    setMode(newMode);
    resetFileState();
    setDescription('');
    setLength('');
    setWidth('');
    setHeight('');
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    const is3DModel = mode === '3d-model';
    const allowedExtensions = is3DModel
      ? ['.stl', '.obj', '.3mf', '.step', '.stp']
      : ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];

    const isValid = allowedExtensions.some((ext) =>
      selectedFile.name.toLowerCase().endsWith(ext)
    );

    if (!isValid) {
      alert(
        is3DModel
          ? 'Please upload a valid 3D file: STL, OBJ, 3MF or STEP.'
          : 'Please upload a valid reference image: JPG, PNG, WEBP or PDF.'
      );
      event.target.value = '';
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      alert('File is too large. Maximum supported size is 100MB.');
      event.target.value = '';
      return;
    }

    setFile(selectedFile);
    setEstimatedPrice(null);
    setEstimatedWeight(null);
    setVolume(null);

    if (!is3DModel || !selectedFile.name.toLowerCase().endsWith('.stl')) {
      return;
    }

    setIsCalculating(true);
    try {
      const calculatedVolume = await calculateSTLVolume(selectedFile);
      setVolume(calculatedVolume);
      calculatePrice(calculatedVolume, material, infill, quantity);
    } catch (error) {
      console.error('Volume calculation failed:', error);
      alert('Could not auto-calculate volume for this STL. You can still submit for engineering review.');
    } finally {
      setIsCalculating(false);
    }
  };

  const uploadRequestFile = async () => {
    if (!file || !user) return undefined;
    setUploadProgress(0);
    return upload3DFile(file, user.uid, (progress) => setUploadProgress(progress));
  };

  const validateRequest = () => {
    if (mode !== 'idea' && !file) {
      alert('Please upload a file before submitting.');
      return false;
    }
    if (mode !== '3d-model' && !description.trim()) {
      alert('Please describe what you would like us to make.');
      return false;
    }
    if (!customerName.trim()) {
      alert('Please enter your full name.');
      return false;
    }
    if (!customerEmail.trim()) {
      alert('Please enter your email address.');
      return false;
    }
    if (!customerPhone.trim()) {
      alert('Please enter your contact phone number.');
      return false;
    }
    if (quantity < 1) {
      alert('Quantity must be at least 1.');
      return false;
    }
    return true;
  };

  const submitRequest = async () => {
    if (!user || !validateRequest()) return;
    setIsSubmitting(true);

    try {
      const fileUrl = file ? await uploadRequestFile() : undefined;
      const dimensions = {
        length: length ? Number(length) : undefined,
        width: width ? Number(width) : undefined,
        height: height ? Number(height) : undefined,
        unit: 'mm' as const,
      };

      await submitQuote.mutateAsync({
        requestType: mode as QuoteRequestType,
        customerName,
        customerEmail,
        customerPhone,
        productId: selectedProduct?.id,
        productName: selectedProduct?.name,
        variantLabel: selectedVariant?.label,
        fileName: file?.name,
        fileUrl,
        material,
        color,
        infill: mode === '3d-model' ? infill : undefined,
        layerHeight: mode === '3d-model' ? layerHeight : undefined,
        quantity,
        volume: mode === '3d-model' ? volume ?? undefined : undefined,
        estimatedWeight: mode === '3d-model' ? estimatedWeight ?? undefined : undefined,
        estimatedPrice: mode === '3d-model' ? estimatedPrice ?? undefined : undefined,
        dimensions: mode !== '3d-model' ? dimensions : undefined,
        description: description || undefined,
        notes: notes || undefined,
        adminPrice: undefined,
        adminNotes: undefined,
      });

      setSuccessMessage(
        mode === '3d-model'
          ? 'Your 3D model and specifications have been received! Our workshop engineers will review tolerances and confirm the final quote.'
          : 'Your request has been received! Our makers will review your design brief and prepare an exact quotation.'
      );
      setIsSuccess(true);
    } catch (error) {
      console.error('Failed to submit quote request:', error);
      alert('Failed to submit your request. Please try again.');
    } finally {
      setIsSubmitting(false);
      setUploadProgress(null);
    }
  };

  const handleAddToCart = async () => {
    if (!user || !file) return;

    if (estimatedPrice === null) {
      alert('Estimated price could not be computed automatically. Please submit for an engineering quote.');
      return;
    }

    setIsSubmitting(true);
    try {
      const fileUrl = await uploadRequestFile();

      const customPrint: CustomPrintData = {
        fileName: file.name,
        fileUrl,
        material,
        color,
        infill,
        layerHeight,
        volume: volume ?? undefined,
        estimatedWeight: estimatedWeight ?? undefined,
        customPrice: estimatedPrice,
      };

      const customProduct: Product = {
        id: `custom-print-${Date.now()}`,
        name: selectedProduct?.name || `Custom Print (${file.name})`,
        description: `Custom 3D print in ${material} (${infill}% infill)`,
        price: estimatedPrice,
        category: 'Custom 3D Printing',
        image: selectedProduct?.image || 'https://images.unsplash.com/photo-1581783342308-f792dbdd27c5?auto=format&fit=crop&q=80&w=800',
        images: selectedProduct?.images || [],
        stock: 999,
        material,
        isCustomizable: true,
        active: true,
        featured: false,
        hasVariants: false,
        variants: [],
      };

      addToCart(
        customProduct,
        quantity,
        notes || undefined,
        selectedVariant?.label,
        selectedVariant?.id,
        customPrint
      );

      navigate('/cart');
    } catch (error) {
      console.error('Failed to add custom print to cart:', error);
      alert('Could not add print to cart. Please try again.');
    } finally {
      setIsSubmitting(false);
      setUploadProgress(null);
    }
  };

  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-28 bg-paper text-ink">
        <Loader2 className="h-10 w-10 animate-spin text-accent" />
        <p className="mt-4 font-mono text-sm font-semibold text-ink">Checking your account...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[70vh] bg-paper flex items-center justify-center px-5 py-20">
        <div className="mx-auto max-w-md rounded-3xl border border-line bg-white p-8 text-center shadow-card">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent">
            <Lock className="h-7 w-7" />
          </div>

          <h1 className="mt-5 font-display text-2xl font-bold text-ink">
            Sign In to Upload 3D Files
          </h1>

          <p className="mt-2.5 font-sans text-sm text-muted leading-relaxed">
            Please sign in to your Shilp Sahayak account so we can link your 3D models and quotes to your dashboard.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row justify-center font-display">
            <Link
              to={`/login?redirect=${encodeURIComponent(
                window.location.pathname + window.location.search
              )}`}
              className="w-full"
            >
              <Button className="w-full font-bold bg-accent hover:bg-accent-dark text-white border-accent">
                Sign In to Continue
              </Button>
            </Link>
            <Link to="/login" className="w-full">
              <Button variant="outline" className="w-full font-semibold">
                Create Account
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (profileLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-28 bg-paper text-ink">
        <Loader2 className="h-10 w-10 animate-spin text-accent" />
        <p className="mt-4 font-mono text-sm font-semibold text-ink">Loading your profile...</p>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-[70vh] bg-paper flex items-center justify-center px-5 py-20">
        <div className="mx-auto max-w-lg rounded-3xl border border-emerald-200 bg-white p-8 text-center shadow-card">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-9 w-9" />
          </div>

          <h1 className="mt-5 font-display text-3xl font-bold text-ink">
            Request Received!
          </h1>

          <p className="mt-3 font-sans text-sm text-muted leading-relaxed">
            {successMessage}
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row justify-center font-display">
            <Button
              variant="outline"
              onClick={() => {
                resetFileState();
                setDescription('');
                setNotes('');
                setLength('');
                setWidth('');
                setHeight('');
                setIsSuccess(false);
              }}
              className="font-semibold"
            >
              Submit Another Print
            </Button>

            <Link to="/account">
              <Button className="font-bold bg-accent hover:bg-accent-dark text-white border-accent">
                View My Quotes & Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      {/* 1. Header Section */}
      <section className="border-b border-line bg-white">
        <div className="mx-auto max-w-[1440px] px-5 py-10 sm:px-8 lg:px-10 lg:py-12">
          <div className="grid items-end gap-8 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 font-mono text-xs font-bold text-accent">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Instant 3D Prototyping & Studio Fab</span>
              </div>

              <h1 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl text-ink">
                Send the file. Get an instant quote.
              </h1>

              <p className="mt-3 max-w-xl font-sans text-sm leading-relaxed text-muted sm:text-base">
                Upload your 3D CAD model for live STL volume and pricing calculations. Our engineering makers verify tolerances before manufacturing.
              </p>
            </div>

            {/* Quick Specs Pill Badges */}
            <div className="grid grid-cols-3 gap-3 rounded-2xl border border-line bg-shell p-4 lg:col-span-5">
              <div>
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted block">
                  Build Envelope
                </span>
                <span className="font-display text-xs sm:text-sm font-bold text-ink">
                  300 × 300 × 350 mm
                </span>
              </div>

              <div>
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted block">
                  Turnaround
                </span>
                <span className="font-display text-xs sm:text-sm font-bold text-ink">
                  24–48 Hours
                </span>
              </div>

              <div>
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted block">
                  Supported Files
                </span>
                <span className="font-display text-xs sm:text-sm font-bold text-ink">
                  STL · OBJ · 3MF
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Transparent Pricing Comparison Banner */}
      <section className="bg-accent-soft border-b border-accent/20">
        <div className="mx-auto max-w-[1440px] px-5 py-4 sm:px-8 lg:px-10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-left">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-white shadow-sm">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <span className="font-display text-sm font-bold text-ink block">
                  Transparent Per-Gram Pricing: Starting at ₹4.5/g vs Market ₹10–15/g
                </span>
                <span className="font-sans text-xs text-muted">
                  No hidden slicing surcharge. Direct maker fabrication from our Patiala studio.
                </span>
              </div>
            </div>

            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 font-mono text-xs font-bold text-accent hover:underline"
            >
              Need bulk / batch manufacturing? Chat on WhatsApp →
            </a>
          </div>
        </div>
      </section>

      {/* 3. Main Form & Sidebar */}
      <main className="mx-auto max-w-[1440px] px-5 py-10 sm:px-8 lg:px-10">
        {selectedProduct && (
          <div className="mb-8 rounded-2xl border border-accent/30 bg-accent-soft p-4 sm:p-5 flex items-center justify-between">
            <div>
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-accent">
                Customizing Product Base
              </span>
              <h2 className="font-display text-lg font-bold text-ink">
                {selectedProduct.name}
              </h2>
            </div>
            {selectedVariant && (
              <Badge variant="brand">{selectedVariant.label}</Badge>
            )}
          </div>
        )}

        <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
          {/* Left Column: Multi-Step Configuration */}
          <div className="lg:col-span-7 space-y-10">
            {/* STEP 01: Starting Method */}
            <div className="rounded-3xl border border-line bg-white p-7 shadow-soft">
              <div className="flex items-center gap-2.5 mb-5">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent font-mono text-xs font-bold text-white">
                  1
                </span>
                <h2 className="font-display text-xl font-bold text-ink">
                  What are you starting with?
                </h2>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  {
                    id: '3d-model',
                    icon: Box,
                    title: '3D CAD Model',
                    desc: 'STL, OBJ, 3MF, STEP',
                  },
                  {
                    id: 'image',
                    icon: ImageIcon,
                    title: 'Reference Images',
                    desc: 'Sketches or photos',
                  },
                  {
                    id: 'idea',
                    icon: Lightbulb,
                    title: 'Concept / Idea',
                    desc: 'We assist with 3D design',
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  const isActive = mode === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleModeChange(item.id as ServiceMode)}
                      className={`rounded-2xl border p-4 text-left transition-all ${
                        isActive
                          ? 'border-accent bg-accent-soft ring-2 ring-accent/20 shadow-sm'
                          : 'border-line bg-shell hover:border-accent/40'
                      }`}
                    >
                      <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                        isActive ? 'bg-accent text-white' : 'bg-line text-muted'
                      }`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <h3 className="mt-3 font-display text-sm font-bold text-ink">
                        {item.title}
                      </h3>
                      <p className="mt-0.5 font-mono text-xs text-muted">
                        {item.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* STEP 02: Upload or Description */}
            <div className="rounded-3xl border border-line bg-white p-7 shadow-soft">
              <div className="flex items-center gap-2.5 mb-5">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent font-mono text-xs font-bold text-white">
                  2
                </span>
                <h2 className="font-display text-xl font-bold text-ink">
                  {mode === '3d-model'
                    ? 'Upload 3D CAD Geometry'
                    : mode === 'image'
                    ? 'Upload Reference Images & Dimensions'
                    : 'Describe Your Project Concept'}
                </h2>
              </div>

              {mode !== 'idea' && (
                <div className="space-y-4">
                  <input
                    id="custom-file-input"
                    type="file"
                    accept={
                      mode === '3d-model'
                        ? '.stl,.obj,.3mf,.step,.stp'
                        : '.jpg,.jpeg,.png,.webp,.pdf'
                    }
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  <label
                    htmlFor="custom-file-input"
                    className={`flex min-h-[170px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition-all ${
                      file
                        ? 'border-accent bg-accent-soft'
                        : 'border-line bg-shell hover:border-accent hover:bg-accent-soft/30'
                    }`}
                  >
                    {file ? (
                      <div className="flex flex-col items-center">
                        <FileBox className="h-10 w-10 text-accent" />
                        <span className="mt-2 font-mono text-xs font-bold text-ink max-w-xs truncate">
                          {file.name}
                        </span>
                        <span className="text-[11px] font-mono text-accent mt-0.5">
                          Click to replace file
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <Upload className="h-10 w-10 text-muted" />
                        <span className="mt-2 font-display text-sm font-bold text-ink">
                          {mode === '3d-model'
                            ? 'Drop STL, OBJ, 3MF or STEP file'
                            : 'Drop JPG, PNG, WEBP or PDF'}
                        </span>
                        <span className="text-xs text-muted font-sans mt-1">
                          Max file size: 100MB · Instant volume parsing for STL
                        </span>
                      </div>
                    )}
                  </label>
                </div>
              )}

              {mode !== '3d-model' && (
                <div className="mt-5 space-y-2">
                  <label className="font-mono text-xs font-bold uppercase tracking-wider text-muted block">
                    {mode === 'image' ? 'Design Instructions & Desired Dimensions' : 'Detailed Project Idea'}
                  </label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={
                      mode === 'image'
                        ? 'e.g. Recreate this object at 120mm height with mounting brackets on the rear...'
                        : 'Tell us what you would like to create, its intended function, desired dimensions, and use case...'
                    }
                    rows={4}
                  />
                </div>
              )}
            </div>

            {/* STEP 03: Material Selection */}
            <div className="rounded-3xl border border-line bg-white p-7 shadow-soft">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent font-mono text-xs font-bold text-white">
                    3
                  </span>
                  <h2 className="font-display text-xl font-bold text-ink">
                    Choose Material
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => setInfoMaterialModal('PLA')}
                  className="inline-flex items-center gap-1 font-mono text-xs font-bold text-accent hover:underline"
                >
                  <HelpCircle className="h-3.5 w-3.5" />
                  <span>Material Guide</span>
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {materialOptions.map((opt) => {
                  const isActive = material === opt.id;
                  const meta = MATERIAL_CONFIG[opt.id];
                  return (
                    <div
                      key={opt.id}
                      className={`relative rounded-2xl border p-4 transition-all ${
                        isActive
                          ? 'border-accent bg-accent-soft ring-1 ring-accent shadow-sm'
                          : 'border-line bg-white hover:border-accent'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setMaterial(opt.id)}
                        className="w-full text-left"
                      >
                        <div className="flex items-baseline justify-between pr-7">
                          <span className="font-display text-base font-bold text-ink">
                            {opt.name}
                          </span>
                          <span className="font-mono text-xs font-bold text-accent">
                            ₹{opt.rate}/g
                          </span>
                        </div>

                        <p className="mt-1 font-sans text-xs text-muted line-clamp-1">
                          {meta?.tagline || `Density ${opt.density} g/cc`}
                        </p>

                        <div className="mt-2.5 flex items-center gap-2 text-[11px] font-mono text-muted">
                          <span>{meta?.strength.split('·')[0] || 'Standard'}</span>
                          <span>•</span>
                          <span>{meta?.heatResistance || '55°C'}</span>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setInfoMaterialModal(opt.id)}
                        title={`View ${opt.name} details`}
                        className="absolute top-3.5 right-3.5 flex h-6 w-6 items-center justify-center rounded-full bg-shell text-muted hover:bg-accent hover:text-white transition-colors"
                      >
                        <Info className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* STEP 04: Slicing Parameters */}
            <div className="rounded-3xl border border-line bg-white p-7 shadow-soft space-y-6">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent font-mono text-xs font-bold text-white">
                  4
                </span>
                <h2 className="font-display text-xl font-bold text-ink">
                  Print Parameters & Quantity
                </h2>
              </div>

              {mode === '3d-model' && (
                <div className="grid gap-6 sm:grid-cols-2 border-b border-line pb-6">
                  {/* Infill */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="font-mono text-xs font-bold uppercase tracking-wider text-muted">
                        Infill Density: {infill}%
                      </label>
                      <span className="font-mono text-[11px] font-semibold text-accent">
                        {infill <= 20
                          ? 'Standard / Decorative'
                          : infill <= 50
                          ? 'Structural Functional'
                          : 'Solid Mechanical'}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      step="5"
                      value={infill}
                      onChange={(e) => setInfill(Number(e.target.value))}
                      className="w-full accent-accent cursor-pointer"
                    />
                  </div>

                  {/* Layer Height */}
                  <div>
                    <label className="font-mono text-xs font-bold uppercase tracking-wider text-muted block mb-2">
                      Layer Resolution
                    </label>
                    <select
                      value={String(layerHeight)}
                      onChange={(e) => setLayerHeight(Number(e.target.value))}
                      className="h-10 w-full rounded-xl border border-line bg-white px-3 text-xs font-mono font-semibold text-ink outline-none focus:border-accent"
                    >
                      {LAYER_HEIGHT_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Color & Quantity */}
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label className="font-mono text-xs font-bold uppercase tracking-wider text-muted block mb-2">
                    Primary Filament Color
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="h-10 w-12 rounded-xl border border-line p-1 cursor-pointer bg-white"
                    />
                    <span className="font-mono text-xs font-bold text-ink">
                      {color.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="font-mono text-xs font-bold uppercase tracking-wider text-muted block mb-2">
                    Print Quantity
                  </label>
                  <Input
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
                  />
                </div>
              </div>

              {/* Dimensions for 2D/Idea mode */}
              {mode !== '3d-model' && (
                <div className="grid grid-cols-3 gap-3 border-t border-line pt-5">
                  <Input
                    label="Length (mm)"
                    type="number"
                    min={0}
                    placeholder="e.g. 100"
                    value={length}
                    onChange={(e) => setLength(e.target.value)}
                  />
                  <Input
                    label="Width (mm)"
                    type="number"
                    min={0}
                    placeholder="e.g. 80"
                    value={width}
                    onChange={(e) => setWidth(e.target.value)}
                  />
                  <Input
                    label="Height (mm)"
                    type="number"
                    min={0}
                    placeholder="e.g. 50"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                  />
                </div>
              )}

              {/* Special Notes */}
              <div className="border-t border-line pt-5">
                <label className="font-mono text-xs font-bold uppercase tracking-wider text-muted block mb-2">
                  Special Finishing or Engineering Instructions (Optional)
                </label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Brass threaded heat-set inserts required, critical 0.2mm tolerance on inner bore, matte finish..."
                  rows={2}
                />
              </div>
            </div>

            {/* STEP 05: Contact Details */}
            <div className="rounded-3xl border border-line bg-white p-7 shadow-soft space-y-5">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent font-mono text-xs font-bold text-white">
                  5
                </span>
                <h2 className="font-display text-xl font-bold text-ink">
                  Your Contact Details
                </h2>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Full Name *"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  required
                />
                <Input
                  label="Phone / WhatsApp Number *"
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  required
                />
                <Input
                  label="Email Address *"
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  required
                  className="sm:col-span-2"
                />
              </div>
            </div>
          </div>

          {/* Right Column: Live Estimate Sidebar */}
          <aside className="lg:col-span-5">
            <div className="lg:sticky lg:top-28 space-y-6">
              {/* Estimate Calculation Card */}
              <div className="rounded-3xl border border-line bg-white p-7 shadow-soft">
                <div className="flex items-center justify-between border-b border-line pb-4">
                  <span className="font-mono text-xs font-bold uppercase tracking-wider text-accent">
                    Live Calculation
                  </span>
                  <Badge variant="default">Patiala Workshop</Badge>
                </div>

                {isCalculating ? (
                  <div className="py-8 text-center space-y-3">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-accent" />
                    <p className="font-mono text-xs font-semibold text-ink">
                      Analyzing 3D STL mesh & volume...
                    </p>
                  </div>
                ) : mode === '3d-model' && estimatedPrice !== null ? (
                  <div className="py-6 space-y-5">
                    <div>
                      <span className="font-mono text-4xl font-bold text-ink">
                        ₹{estimatedPrice.toLocaleString('en-IN')}
                      </span>
                      <span className="font-sans text-xs text-muted block mt-1">
                        Includes base slicing fee + {quantity} × {material} ({infill}% infill)
                      </span>
                    </div>

                    <div className="divide-y divide-line rounded-2xl border border-line bg-shell px-4 py-2 text-xs font-sans">
                      <div className="flex justify-between py-2">
                        <span className="text-muted">Volume</span>
                        <span className="font-mono font-bold text-ink">
                          {volume?.toFixed(2)} cm³
                        </span>
                      </div>
                      <div className="flex justify-between py-2">
                        <span className="text-muted">Est. Weight</span>
                        <span className="font-mono font-bold text-ink">
                          {estimatedWeight} g
                        </span>
                      </div>
                      <div className="flex justify-between py-2">
                        <span className="text-muted">Material Rate</span>
                        <span className="font-mono font-bold text-ink">
                          ₹{MATERIAL_CONFIG[material].pricePerGram}/g
                        </span>
                      </div>
                      <div className="flex justify-between py-2">
                        <span className="text-muted">Total Quantity</span>
                        <span className="font-mono font-bold text-ink">
                          {quantity} pcs
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-6 text-center space-y-2">
                    <Box className="mx-auto h-8 w-8 text-accent/60" />
                    <p className="font-display text-base font-bold text-ink">
                      {mode === '3d-model'
                        ? 'Upload an STL file to calculate cost'
                        : 'Manual Engineering Review'}
                    </p>
                    <p className="font-sans text-xs text-muted">
                      {mode === '3d-model'
                        ? 'Live calculation computes per-gram weight and slicing tolerances.'
                        : 'Our team will review your photos or brief and provide a quote within 4 hours.'}
                    </p>
                  </div>
                )}

                {/* Primary Action Buttons */}
                <div className="space-y-3 pt-2 font-display">
                  {mode === '3d-model' && (
                    <Button
                      size="lg"
                      disabled={!file || estimatedPrice === null || isCalculating || isSubmitting}
                      onClick={handleAddToCart}
                      className="w-full font-bold shadow-lg shadow-accent/20 bg-accent hover:bg-accent-dark text-white border-accent"
                    >
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      {isSubmitting
                        ? uploadProgress !== null
                          ? `Uploading ${uploadProgress}%...`
                          : 'Adding...'
                        : 'Add Print to Cart & Checkout'}
                    </Button>
                  )}

                  <Button
                    size="lg"
                    variant="outline"
                    disabled={isSubmitting || isCalculating || (mode !== 'idea' && !file)}
                    isLoading={isSubmitting}
                    onClick={submitRequest}
                    className="w-full font-bold"
                  >
                    {mode === '3d-model'
                      ? 'Request Confirmed Engineering Review'
                      : 'Submit for Custom Quote'}
                  </Button>
                </div>
              </div>

              {/* NDA & Confidentiality Note */}
              <div className="rounded-3xl border border-line bg-white p-6 shadow-soft space-y-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-accent" />
                  <h4 className="font-display text-xs font-bold text-ink">Confidentiality Guaranteed</h4>
                </div>
                <p className="font-sans text-xs text-muted leading-relaxed">
                  Working on proprietary hardware or an unreleased invention? We protect your CAD intellectual property with standard NDA agreements.{' '}
                  <Link to="/contact" className="font-bold text-accent hover:underline font-mono">
                    Request an NDA
                  </Link>
                </p>
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* 4. Engineering Info Section */}
      <section className="border-t border-line bg-shell py-16">
        <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-10">
          <div className="mb-8">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-accent">
              Workshop Best Practices
            </span>
            <h3 className="mt-1 font-display text-2xl font-bold text-ink sm:text-3xl">
              Design for 3D Printing Guidelines
            </h3>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: 'Minimum Wall Thickness',
                desc: 'Maintain at least 1.2mm on FDM prints for structural durability and clean exterior perimeters.',
              },
              {
                title: 'Orientation & Layer Shear',
                desc: 'Parts are strongest along the XY axes. Let our team know how the part will be mechanically loaded.',
              },
              {
                title: 'Tolerances & Clearances',
                desc: 'We recommend 0.3mm to 0.4mm clearance for interlocking or sliding mechanical components.',
              },
              {
                title: 'Support Minimization',
                desc: 'Angles over 45 degrees require support structures. Chamfers are preferred over fillets at the base.',
              },
            ].map((tip) => (
              <Card key={tip.title} className="p-6 bg-white">
                <h4 className="font-display text-base font-bold text-ink">
                  {tip.title}
                </h4>
                <p className="mt-2 font-sans text-xs leading-relaxed text-muted">
                  {tip.desc}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Material Info Modal */}
      {infoMaterialModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="material-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setInfoMaterialModal(null)}
        >
          <div
            className="relative w-full max-w-lg rounded-3xl border border-line bg-white p-7 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-accent">
                  Material Guide
                </span>
                <h3 id="material-modal-title" className="mt-1 font-display text-2xl font-bold text-ink">
                  {MATERIAL_CONFIG[infoMaterialModal].label}
                </h3>
                <p className="font-sans text-xs text-muted">
                  {MATERIAL_CONFIG[infoMaterialModal].tagline}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setInfoMaterialModal(null)}
                className="rounded-lg p-1.5 text-muted hover:text-ink transition-colors"
                aria-label="Close guide"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="mt-4 font-sans text-xs leading-relaxed text-muted">
              {MATERIAL_CONFIG[infoMaterialModal].description}
            </p>

            <div className="mt-5 divide-y divide-line rounded-2xl border border-line bg-shell px-4 py-1 text-xs font-sans">
              <div className="flex justify-between py-2.5">
                <span className="text-muted">Rate</span>
                <span className="font-mono font-bold text-accent">
                  ₹{MATERIAL_CONFIG[infoMaterialModal].pricePerGram} / gram
                </span>
              </div>
              <div className="flex justify-between py-2.5">
                <span className="text-muted">Density</span>
                <span className="font-mono text-ink">
                  {MATERIAL_CONFIG[infoMaterialModal].density} g/cm³
                </span>
              </div>
              <div className="flex justify-between py-2.5">
                <span className="text-muted">Strength</span>
                <span className="font-semibold text-ink">
                  {MATERIAL_CONFIG[infoMaterialModal].strength}
                </span>
              </div>
              <div className="flex justify-between py-2.5">
                <span className="text-muted">Heat Deflection</span>
                <span className="font-semibold text-ink">
                  {MATERIAL_CONFIG[infoMaterialModal].heatResistance}
                </span>
              </div>
              <div className="py-2.5">
                <span className="text-muted block mb-0.5">Best For:</span>
                <span className="font-semibold text-ink">
                  {MATERIAL_CONFIG[infoMaterialModal].bestFor}
                </span>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2.5 font-display">
              <Button
                type="button"
                variant="outline"
                onClick={() => setInfoMaterialModal(null)}
                className="font-semibold"
              >
                Close
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setMaterial(infoMaterialModal);
                  setInfoMaterialModal(null);
                }}
                className="font-bold bg-accent hover:bg-accent-dark text-white border-accent"
              >
                Select {MATERIAL_CONFIG[infoMaterialModal].label}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}