import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Upload,
  Layers,
  Sparkles,
  AlertTriangle,
  Clock,
  Scale,
  Package,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  X,
  FileBox,
  ShoppingCart,
  Send,
  Loader2,
  ArrowRight,
  Box,
  Lightbulb,
  Image as ImageIcon,
  MessageSquare,
} from 'lucide-react';
import { usePricingSettings } from '../../hooks/usePricingSettings';
import { parseSTLModel } from '../../services/model/modelParser';
import { ParsedModelResult } from '../../services/model/modelTypes';
import { ThreeModelViewer } from '../../components/custom-printing/ThreeModelViewer';
import {
  estimateMaterialUsage,
  estimatePrintTime,
  formatINR,
  formatPrintTime,
} from '../../services/pricing/pricingUtils';
import { calculateCustomerQuote } from '../../services/pricing/calculateQuote';
import { useStore } from '../../store';
import { useAuth } from '../../hooks/useAuth';
import { upload3DFile } from '../../utils/uploadFile';
import { useSubmitQuote } from '../../hooks/useQuotes';

type StepNumber = 1 | 2 | 3 | 4;

export function CustomPrinting() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: pricingData } = usePricingSettings();
  const addToCart = useStore((state) => state.addToCart);
  const openCart = useStore((state) => state.openCart);
  const submitQuoteMutation = useSubmitQuote();

  // Studio Mode State (3D CAD Model vs Assisted Design)
  const [searchParams, setSearchParams] = useSearchParams();
  const initialMode = searchParams.get('mode') === 'assisted' ? 'assisted' : '3d-model';
  const [studioMode, setStudioMode] = useState<'3d-model' | 'assisted'>(initialMode);

  const handleModeChange = (mode: '3d-model' | 'assisted') => {
    setStudioMode(mode);
    setSearchParams(mode === 'assisted' ? { mode: 'assisted' } : {}, { replace: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Assisted Mode States
  const [assistedSub, setAssistedSub] = useState<'has-reference' | 'idea-only'>('has-reference');
  const [assistedFile, setAssistedFile] = useState<File | null>(null);
  const [assistedDesc, setAssistedDesc] = useState('');
  const [assistedMaterial, setAssistedMaterial] = useState('PLA');
  const [assistedQuantity, setAssistedQuantity] = useState(1);
  const [assistedName, setAssistedName] = useState('');
  const [assistedEmail, setAssistedEmail] = useState('');
  const [assistedPhone, setAssistedPhone] = useState('');
  const [assistedNotes, setAssistedNotes] = useState('');
  const [assistedSuccess, setAssistedSuccess] = useState(false);
  const [isSubmittingAssisted, setIsSubmittingAssisted] = useState(false);
  const [assistedUploadProgress, setAssistedUploadProgress] = useState<number | null>(null);

  useEffect(() => {
    if (user) {
      if (!assistedName && user.displayName) setAssistedName(user.displayName);
      if (!assistedEmail && user.email) setAssistedEmail(user.email);
    }
  }, [user]);

  const handleAssistedFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.pdf', '.stl', '.obj'];
    const isValid = allowed.some((ext) => selected.name.toLowerCase().endsWith(ext));
    if (!isValid) {
      alert('Please upload a valid reference image or document (JPG, PNG, WEBP, PDF, STL, OBJ).');
      return;
    }
    if (selected.size > 100 * 1024 * 1024) {
      alert('File size exceeds 100MB limit.');
      return;
    }
    setAssistedFile(selected);
  };

  const handleAssistedSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      if (
        confirm(
          'Please sign in to your Shilp Sahayak account so we can link your custom design request to your dashboard.\nWould you like to log in now?'
        )
      ) {
        navigate('/login?redirect=/shilp-studio?mode=assisted');
      }
      return;
    }

    if (assistedSub === 'has-reference' && !assistedFile && !assistedDesc.trim()) {
      alert('Please upload a reference image/file or describe your design brief.');
      return;
    }

    if (assistedSub === 'idea-only' && !assistedDesc.trim()) {
      alert('Please describe your idea or project.');
      return;
    }

    const customerName = assistedName.trim() || user.displayName || user.email || 'Customer';
    const customerEmail = assistedEmail.trim() || user.email || '';
    if (!customerEmail) {
      alert('Please provide your email address.');
      return;
    }

    try {
      setIsSubmittingAssisted(true);
      setAssistedUploadProgress(10);

      let fileUrl: string | undefined = undefined;
      if (assistedFile) {
        fileUrl = await upload3DFile(assistedFile, user.uid, (p) => setAssistedUploadProgress(p));
      }

      await submitQuoteMutation.mutateAsync({
        requestType: assistedSub === 'has-reference' ? 'image' : 'idea',
        customerName,
        customerEmail,
        customerPhone: assistedPhone.trim(),
        fileName: assistedFile?.name,
        fileUrl,
        material: assistedMaterial,
        quantity: assistedQuantity,
        description: assistedDesc.trim() || undefined,
        notes: assistedNotes.trim() || undefined,
      });

      setIsSubmittingAssisted(false);
      setAssistedUploadProgress(null);
      setAssistedSuccess(true);
    } catch (error: any) {
      console.error('Failed to submit assisted quote:', error);
      setIsSubmittingAssisted(false);
      setAssistedUploadProgress(null);
      alert(error?.message || 'Failed to submit design request. Please try again.');
    }
  };

  // Stepper state
  const [currentStep, setCurrentStep] = useState<StepNumber>(1);

  // File & Model state
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [modelResult, setModelResult] = useState<ParsedModelResult | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Configuration state
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>('pla');
  const [selectedColorName, setSelectedColorName] = useState<string>('');
  const [customColorHex, setCustomColorHex] = useState<string | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<string>('standard');
  const [quantity, setQuantity] = useState<number>(1);
  const [packagingIncluded, setPackagingIncluded] = useState<boolean>(false);

  // Advanced settings (collapsed by default)
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [customInfill, setCustomInfill] = useState<number | null>(null);
  const [customLayerHeight, setCustomLayerHeight] = useState<number | null>(null);
  const [supportsEnabled, setSupportsEnabled] = useState<boolean>(false);

  // Handoff & submission states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [quoteSuccess, setQuoteSuccess] = useState<boolean>(false);
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [showQuoteModal, setShowQuoteModal] = useState(false);

  // Active configurations
  const activeMaterials = useMemo(
    () => (pricingData?.materials || []).filter((m) => m.enabled),
    [pricingData]
  );

  const activeMaterial = useMemo(() => {
    return (
      activeMaterials.find((m) => m.id === selectedMaterialId) ||
      activeMaterials[0] ||
      pricingData.materials[0]
    );
  }, [activeMaterials, selectedMaterialId, pricingData]);

  const handleMaterialChange = (materialId: string) => {
    setSelectedMaterialId(materialId);
    setCustomColorHex(null);
    const newMat = activeMaterials.find((m) => m.id === materialId);
    if (newMat?.colors && newMat.colors.length > 0) {
      setSelectedColorName(newMat.colors[0].name);
    }
  };

  // Selected Color
  const activeColor = useMemo(() => {
    if (customColorHex) {
      return { name: selectedColorName || 'Custom Shade', hex: customColorHex };
    }
    if (!activeMaterial?.colors || activeMaterial.colors.length === 0) {
      return { name: 'Standard', hex: '#2563EB' };
    }
    const found = activeMaterial.colors.find((c) => c.name === selectedColorName);
    return found || activeMaterial.colors[0];
  }, [activeMaterial, selectedColorName, customColorHex]);

  // Active Profile
  const activeProfiles = useMemo(
    () => (pricingData?.printProfiles || []).filter((p) => p.enabled),
    [pricingData]
  );

  const activeProfile = useMemo(() => {
    return (
      activeProfiles.find((p) => p.id === selectedProfileId) ||
      activeProfiles[0] ||
      pricingData.printProfiles[0]
    );
  }, [activeProfiles, selectedProfileId, pricingData]);

  // Effective print parameters
  const effectiveInfill = customInfill ?? activeProfile.infillPercent;
  const effectiveLayerHeight = customLayerHeight ?? activeProfile.layerHeight;

  // Real-time geometry estimations
  const estimatedMaterialUsageGrams = useMemo(() => {
    if (!modelResult?.volumeCm3) return 0;
    return estimateMaterialUsage(
      modelResult.volumeCm3,
      activeMaterial.density,
      activeProfile
    );
  }, [modelResult, activeMaterial, activeProfile]);

  const estimatedPrintTimeHours = useMemo(() => {
    if (!estimatedMaterialUsageGrams) return 0;
    return estimatePrintTime(estimatedMaterialUsageGrams, activeProfile);
  }, [estimatedMaterialUsageGrams, activeProfile]);

  // Live Pricing Engine Calculation
  const quoteBreakdown = useMemo(() => {
    if (!pricingData?.pricingConfig) return null;

    return calculateCustomerQuote(
      {
        materialWeightGrams: estimatedMaterialUsageGrams,
        printTimeHours: estimatedPrintTimeHours,
        material: activeMaterial,
        quantity,
        packagingIncluded,
        exceedsBuildVolume: modelResult?.exceedsBuildVolume,
      },
      pricingData.pricingConfig,
      pricingData.quantityDiscounts
    );
  }, [
    pricingData,
    estimatedMaterialUsageGrams,
    estimatedPrintTimeHours,
    activeMaterial,
    quantity,
    packagingIncluded,
    modelResult,
  ]);

  // Handle File Selection
  const handleFile = async (selectedFile: File) => {
    if (!selectedFile) return;

    // Validation
    const name = selectedFile.name.toLowerCase();
    if (!name.endsWith('.stl')) {
      alert('Currently STL files (.stl) are supported. OBJ & 3MF support will be added soon.');
      return;
    }

    if (selectedFile.size > 100 * 1024 * 1024) {
      alert('File size exceeds the 100 MB limit.');
      return;
    }

    setFile(selectedFile);
    setIsParsing(true);
    setModelResult(null);

    const result = await parseSTLModel(
      selectedFile,
      pricingData?.pricingConfig?.maxBuildVolume
    );

    setIsParsing(false);
    setModelResult(result);

    if (result.success) {
      // Auto advance to Configure step if on step 1
      if (currentStep === 1) {
        setCurrentStep(2);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setModelResult(null);
    setCurrentStep(1);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Add to Cart & Checkout Flow
  const handleContinueToOrder = async () => {
    if (!file || !modelResult || !quoteBreakdown) return;

    if (!user) {
      // If user is not logged in, prompt sign in or proceed to quote modal
      if (
        confirm(
          'Please sign in to proceed directly to order checkout. Would you like to log in now?\n(Or click Cancel to submit a quote request with your contact info)'
        )
      ) {
        navigate('/login?redirect=/shilp-studio');
        return;
      } else {
        setShowQuoteModal(true);
        return;
      }
    }

    try {
      setIsSubmitting(true);
      setUploadProgress(10);

      // Upload file to Cloudflare R2
      const fileKey = await upload3DFile(file, user.uid, (progress) => {
        setUploadProgress(progress);
      });

      // Add to Cart
      addToCart(
        {
          id: `custom-${Date.now()}`,
          name: `Custom 3D Print: ${file.name}`,
          description: `${activeMaterial.name} · ${activeColor.name} · ${activeProfile.name} Quality (${quoteBreakdown.quantity} pcs)`,
          price: quoteBreakdown.unitPrice,
          category: 'Custom 3D Print',
          image: '/custom-print-placeholder.png',
          stock: 999,
          active: true,
        },
        quantity,
        customerNotes || undefined,
        undefined,
        undefined,
        {
          fileName: file.name,
          fileKey,
          material: activeMaterial.name,
          color: activeColor.name,
          quality: activeProfile.name,
          infill: effectiveInfill,
          layerHeight: effectiveLayerHeight,
          dimensions: modelResult.dimensions,
          volume: modelResult.volumeCm3,
          estimatedWeight: estimatedMaterialUsageGrams,
          estimatedPrintTimeHours,
          packagingIncluded,
          pricingVersion: pricingData.pricingVersion,
          isEstimate: true,
          customPrice: quoteBreakdown.totalPrice,
        }
      );

      setIsSubmitting(false);
      setUploadProgress(null);
      openCart();
    } catch (error: any) {
      console.error('Failed to prepare custom print order:', error);
      setIsSubmitting(false);
      setUploadProgress(null);
      alert(error?.message || 'Failed to upload 3D file for order. Please try requesting a quote.');
    }
  };

  // Submit Quote Flow
  const handleSubmitQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !modelResult || !quoteBreakdown) return;

    const customerName = user ? (user.displayName || user.email || 'Customer') : guestName.trim();
    const customerEmail = user ? user.email || '' : guestEmail.trim();
    const customerPhone = guestPhone.trim();

    if (!customerName || !customerEmail) {
      alert('Please provide your name and email address.');
      return;
    }

    try {
      setIsSubmitting(true);
      setUploadProgress(15);

      let fileKey = '';
      if (user) {
        fileKey = await upload3DFile(file, user.uid, (progress) => setUploadProgress(progress));
      }

      await submitQuoteMutation.mutateAsync({
        requestType: '3d-model',
        customerName,
        customerEmail,
        customerPhone,
        fileName: file.name,
        fileUrl: fileKey || undefined,
        fileSizeBytes: file.size,
        material: activeMaterial.name,
        color: activeColor.name,
        quality: activeProfile.name,
        infill: effectiveInfill,
        layerHeight: effectiveLayerHeight,
        quantity,
        packagingIncluded,
        volume: modelResult.volumeCm3,
        estimatedWeight: estimatedMaterialUsageGrams,
        estimatedPrintTimeHours,
        systemEstimatedPrice: quoteBreakdown.totalPrice,
        estimatedPrice: quoteBreakdown.totalPrice,
        dimensions: {
          length: modelResult.dimensions.x,
          width: modelResult.dimensions.y,
          height: modelResult.dimensions.z,
          unit: 'mm',
        },
        notes: customerNotes.trim() || undefined,
        pricingVersion: pricingData.pricingVersion,
      });

      setIsSubmitting(false);
      setUploadProgress(null);
      setShowQuoteModal(false);
      setQuoteSuccess(true);
    } catch (error: any) {
      console.error('Failed to submit quote request:', error);
      setIsSubmitting(false);
      setUploadProgress(null);
      alert(error?.message || 'Failed to submit quote request. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors pb-28">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-line dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 backdrop-blur-xs py-10 sm:py-14 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 dark:bg-brand-950/40 border border-brand-200 dark:border-brand-800 text-brand-700 dark:text-brand-300 font-mono text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-brand-500" />
            <span>Shilp Studio · Digital Fabrication & 3D Prototyping</span>
          </div>

          <h1 className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-ink dark:text-white">
            Your Design. <span className="text-accent">Printed Your Way.</span>
          </h1>

          <p className="max-w-2xl mx-auto text-sm sm:text-base text-muted dark:text-slate-400 font-sans leading-relaxed">
            Upload your 3D CAD model for an instant slicing estimate & 3D WebGL preview, or share your sketches & ideas for assisted fabrication by our master makers.
          </p>

          {/* Mode Switcher Tabs */}
          <div className="pt-3 flex justify-center">
            <div className="inline-flex p-1.5 rounded-2xl bg-shell dark:bg-slate-900 border border-line dark:border-slate-800 shadow-inner">
              <button
                type="button"
                onClick={() => handleModeChange('3d-model')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer ${
                  studioMode === '3d-model'
                    ? 'bg-white dark:bg-slate-800 text-accent shadow-sm border border-line dark:border-slate-700'
                    : 'text-muted hover:text-ink dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <Box className="w-4 h-4 text-accent" />
                <span>3D CAD Model (Instant Quote)</span>
              </button>
              <button
                type="button"
                onClick={() => handleModeChange('assisted')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer ${
                  studioMode === 'assisted'
                    ? 'bg-white dark:bg-slate-800 text-accent shadow-sm border border-line dark:border-slate-700'
                    : 'text-muted hover:text-ink dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <Lightbulb className="w-4 h-4 text-amber-500" />
                <span>Assisted Design / Bring Your Idea</span>
              </button>
            </div>
          </div>

          {studioMode === '3d-model' && (
            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-3 rounded-xl bg-ink hover:bg-slate-800 text-white font-mono text-xs font-bold uppercase tracking-wider shadow-md transition-all flex items-center gap-2 cursor-pointer"
              >
                <Upload className="w-4 h-4 text-accent" />
                <span>Upload 3D Model</span>
              </button>

              <button
                type="button"
                onClick={() => handleModeChange('assisted')}
                className="px-5 py-3 rounded-xl border border-line hover:border-accent/40 bg-white dark:bg-slate-800 text-ink dark:text-slate-200 font-mono text-xs font-semibold transition-all hover:bg-shell/50 cursor-pointer"
              >
                Don't have a 3D file? Get a Custom Design →
              </button>
            </div>
          )}
        </div>
      </section>

      {studioMode === '3d-model' && (
        <>

      {/* Stepper Header */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8">
        <nav aria-label="Progress">
          <ol className="flex items-center justify-between border border-line dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 p-2 sm:p-3 shadow-xs">
            {[
              { step: 1, label: 'Upload', desc: 'STL file' },
              { step: 2, label: 'Configure', desc: 'Material & Quality' },
              { step: 3, label: 'Estimate', desc: 'Live Quote' },
              { step: 4, label: 'Order', desc: 'Checkout / Review' },
            ].map((item) => {
              const isActive = currentStep === item.step;
              const isDone = currentStep > item.step || (item.step === 1 && modelResult?.success);
              return (
                <li key={item.step} className="flex-1 relative">
                  <button
                    type="button"
                    onClick={() => {
                      if (item.step === 1 || modelResult?.success) {
                        setCurrentStep(item.step as StepNumber);
                      }
                    }}
                    disabled={item.step > 1 && !modelResult?.success}
                    className={`w-full flex items-center gap-2 sm:gap-3 p-2 rounded-xl text-left transition-all ${
                      isActive
                        ? 'bg-brand-50/80 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 ring-1 ring-brand-300 dark:ring-brand-700'
                        : isDone
                        ? 'text-ink dark:text-slate-200 hover:bg-shell/50'
                        : 'text-slate-400 dark:text-slate-600 cursor-not-allowed'
                    }`}
                  >
                    <span
                      className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center font-mono text-xs font-bold shrink-0 ${
                        isActive
                          ? 'bg-brand-500 text-white shadow-xs'
                          : isDone
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                      }`}
                    >
                      {isDone && !isActive ? <CheckCircle2 className="w-4 h-4" /> : item.step}
                    </span>
                    <div className="hidden sm:block">
                      <p className="text-xs font-bold leading-tight">{item.label}</p>
                      <p className="text-[10px] text-muted dark:text-slate-400 font-mono">{item.desc}</p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>
      </div>

      {/* Success Notification Banner */}
      {quoteSuccess && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/90 dark:bg-emerald-950/30 p-6 text-center space-y-3 shadow-xs">
            <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-md">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h3 className="font-display text-xl font-bold text-emerald-950 dark:text-emerald-200">
              Quote Request Submitted Successfully!
            </h3>
            <p className="text-xs text-emerald-800 dark:text-emerald-300 max-w-md mx-auto">
              Our engineering team has received your 3D model and specifications. We will review the geometry, verify slicer settings, and notify you via email shortly.
            </p>
            <div className="pt-2 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setQuoteSuccess(false);
                  handleRemoveFile();
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-mono text-xs font-bold shadow-xs hover:bg-emerald-700"
              >
                Upload Another Model
              </button>
              <Link
                to="/account"
                className="px-4 py-2 rounded-xl border border-emerald-300 text-emerald-800 dark:text-emerald-200 font-mono text-xs font-bold hover:bg-emerald-100/50"
              >
                View My Quotes
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid Layout */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: 3D Preview & Analysis */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-line dark:border-slate-800 p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileBox className="w-4 h-4 text-accent" />
                <h2 className="font-display font-bold text-sm text-ink dark:text-white uppercase tracking-wider">
                  3D Model Preview
                </h2>
              </div>
              {file && (
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="inline-flex items-center gap-1 text-[11px] font-mono text-rose-600 hover:text-rose-700 hover:underline"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Remove file</span>
                </button>
              )}
            </div>

            {/* Three.js Canvas Viewer */}
            <ThreeModelViewer
              geometry={modelResult?.geometry || null}
              colorHex={activeColor.hex}
              isLoading={isParsing}
              error={modelResult?.errorMessage}
              dimensions={modelResult?.dimensions}
            />

            {/* Model Geometry Analysis Specs */}
            {modelResult?.success && (
              <div className="space-y-3 pt-2">
                <div className="grid grid-cols-3 gap-2 bg-shell/50 dark:bg-slate-800/40 p-3 rounded-xl border border-line dark:border-slate-800 text-center">
                  <div>
                    <span className="text-[10px] font-mono text-muted uppercase tracking-wider block">
                      Bounding Box
                    </span>
                    <span className="font-mono text-xs font-bold text-ink dark:text-slate-200">
                      {modelResult.dimensions.x}×{modelResult.dimensions.y}×{modelResult.dimensions.z} <span className="text-[10px] font-normal">mm</span>
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-muted uppercase tracking-wider block">
                      Volume
                    </span>
                    <span className="font-mono text-xs font-bold text-ink dark:text-slate-200">
                      {modelResult.volumeCm3} <span className="text-[10px] font-normal">cm³</span>
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-muted uppercase tracking-wider block">
                      Triangles
                    </span>
                    <span className="font-mono text-xs font-bold text-ink dark:text-slate-200">
                      {modelResult.triangleCount.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Print Estimates */}
                <div className="grid grid-cols-2 gap-2 bg-brand-50/40 dark:bg-brand-950/20 p-3 rounded-xl border border-brand-100 dark:border-brand-900 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Scale className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                    <div className="text-left">
                      <span className="text-[10px] font-mono text-muted uppercase tracking-wider block">
                        Est. Material Usage
                      </span>
                      <span className="font-mono text-xs font-bold text-brand-700 dark:text-brand-300">
                        ~{estimatedMaterialUsageGrams}g
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <Clock className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                    <div className="text-left">
                      <span className="text-[10px] font-mono text-muted uppercase tracking-wider block">
                        Est. Print Time
                      </span>
                      <span className="font-mono text-xs font-bold text-brand-700 dark:text-brand-300">
                        ~{formatPrintTime(estimatedPrintTimeHours)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".stl"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFile(e.target.files[0]);
                }
              }}
              className="hidden"
            />

            {/* Dropzone prompt if no file selected */}
            {!file && (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                  isDragOver
                    ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/20'
                    : 'border-line dark:border-slate-800 hover:border-accent hover:bg-shell/30'
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-shell dark:bg-slate-800 flex items-center justify-center mx-auto text-muted dark:text-slate-400 mb-3">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="text-xs font-bold text-ink dark:text-slate-200">
                  Drag and drop your STL file here, or <span className="text-accent underline">browse</span>
                </p>
                <p className="text-[11px] text-muted dark:text-slate-500 font-mono mt-1">
                  Supports Binary and ASCII STL (Max 100 MB)
                </p>
              </div>
            )}
          </div>

          {/* Safety Net Banner */}
          {modelResult?.requiresManualReview && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/90 dark:bg-amber-950/40 p-4 text-xs space-y-2">
              <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-bold">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Requires Engineering Review</span>
              </div>
              <p className="text-amber-800 dark:text-amber-300">
                {modelResult.reviewReason ||
                  'This 3D geometry requires verification by our production engineer before manufacturing.'}
              </p>
              <button
                type="button"
                onClick={() => setShowQuoteModal(true)}
                className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-mono text-[11px] font-bold shadow-xs cursor-pointer"
              >
                <Send className="w-3 h-3" />
                <span>Request Manual Quote</span>
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Configuration & Pricing Stepper */}
        <div className="lg:col-span-6 space-y-4">
          {/* Material & Color Selection Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-line dark:border-slate-800 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-line dark:border-slate-800 pb-3">
              <h3 className="font-display font-bold text-sm text-ink dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-accent" />
                <span>1. Select Material</span>
              </h3>
              <span className="font-mono text-xs font-bold text-accent bg-accent/10 px-2 py-0.5 rounded-md">
                ₹{activeMaterial.pricePerGram}/g
              </span>
            </div>

            {/* Material Dropdown Selector */}
            <div className="space-y-2">
              <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted dark:text-slate-400 block">
                Filament Material
              </label>
              <div className="relative">
                <select
                  value={selectedMaterialId}
                  onChange={(e) => handleMaterialChange(e.target.value)}
                  className="w-full py-2.5 px-3.5 pr-10 rounded-xl border border-line dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-ink dark:text-white appearance-none cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-brand-500 shadow-2xs"
                >
                  {activeMaterials.map((mat) => (
                    <option key={mat.id} value={mat.id}>
                      {mat.name} — ₹{mat.pricePerGram}/g ({mat.tagline})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-muted absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Selected Material Summary Card */}
              <div className="flex items-center justify-between bg-shell/50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-line dark:border-slate-800 text-xs">
                <span className="text-muted dark:text-slate-400 text-[11px] leading-tight">
                  {activeMaterial.tagline || activeMaterial.description}
                </span>
                <span className="font-mono text-[10px] font-bold text-ink dark:text-slate-200 shrink-0 ml-3 bg-white dark:bg-slate-700 px-2 py-0.5 rounded-md border border-line/60 dark:border-slate-600">
                  {activeMaterial.density} g/cm³
                </span>
              </div>
            </div>

            {/* Color Palette */}
            <div className="pt-2 space-y-2.5 border-t border-line dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-ink dark:text-slate-200 flex items-center gap-1.5">
                  Colour: <span className="text-accent">{activeColor.name}</span>
                  <span className="text-muted text-[10px] font-mono font-normal">
                    ({activeColor.hex})
                  </span>
                </span>
                <span className="text-[10px] font-mono text-muted">
                  {activeMaterial.colors ? activeMaterial.colors.length : 0} shades + custom
                </span>
              </div>

              {/* Swatches & Custom Picker */}
              <div className="flex flex-wrap items-center gap-2">
                {activeMaterial.colors &&
                  activeMaterial.colors.map((color) => {
                    const isSelected = !customColorHex && activeColor.name === color.name;
                    return (
                      <button
                        key={color.name}
                        type="button"
                        onClick={() => {
                          setCustomColorHex(null);
                          setSelectedColorName(color.name);
                        }}
                        className={`w-7 h-7 rounded-full border-2 transition-all relative flex items-center justify-center cursor-pointer ${
                          isSelected
                            ? 'border-brand-500 scale-110 shadow-sm ring-2 ring-brand-500/30'
                            : 'border-slate-300 dark:border-slate-700 hover:scale-105'
                        }`}
                        style={{ backgroundColor: color.hex }}
                        title={`${color.name} (${color.hex})`}
                      >
                        {isSelected && (
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{
                              backgroundColor:
                                color.hex.toLowerCase() === '#f8fafc' ||
                                color.hex.toLowerCase() === '#ffffff' ||
                                color.hex.toLowerCase() === '#f1f5f9'
                                  ? '#000000'
                                  : '#ffffff',
                            }}
                          />
                        )}
                      </button>
                    );
                  })}

                {/* Custom Color Palette / Hex Picker */}
                <label
                  className={`relative flex items-center justify-center w-7 h-7 rounded-full border-2 cursor-pointer transition-all ${
                    customColorHex
                      ? 'border-brand-500 scale-110 shadow-sm ring-2 ring-brand-500/30'
                      : 'border-dashed border-slate-400 dark:border-slate-600 hover:scale-105'
                  }`}
                  style={{
                    background: customColorHex
                      ? customColorHex
                      : 'conic-gradient(from 180deg at 50% 50%, #FF0000 0deg, #FFFF00 60deg, #00FF00 120deg, #00FFFF 180deg, #0000FF 240deg, #FF00FF 300deg, #FF0000 360deg)',
                  }}
                  title="Pick custom color"
                >
                  <input
                    type="color"
                    value={customColorHex || '#FF4D00'}
                    onChange={(e) => {
                      setCustomColorHex(e.target.value);
                      setSelectedColorName(`Custom (${e.target.value.toUpperCase()})`);
                    }}
                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                  />
                  {customColorHex && (
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{
                        backgroundColor:
                          customColorHex.toLowerCase() === '#ffffff' ? '#000000' : '#ffffff',
                      }}
                    />
                  )}
                </label>
                <span className="text-[10px] font-mono text-muted pl-0.5">
                  {customColorHex ? 'Custom' : '+ Custom'}
                </span>
              </div>
            </div>
          </div>

          {/* Quality & Print Profiles */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-line dark:border-slate-800 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-line dark:border-slate-800 pb-3">
              <h3 className="font-display font-bold text-sm text-ink dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-accent" />
                <span>2. Print Quality</span>
              </h3>
              <span className="font-mono text-[11px] text-muted">Layer Height & Infill</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {activeProfiles.map((profile) => {
                const isSelected = activeProfile.id === profile.id;
                return (
                  <button
                    key={profile.id}
                    type="button"
                    onClick={() => {
                      setSelectedProfileId(profile.id);
                      setCustomInfill(null);
                      setCustomLayerHeight(null);
                    }}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/30 ring-1 ring-brand-400'
                        : 'border-line dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700 bg-white dark:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-display font-bold text-sm text-ink dark:text-slate-100">
                        {profile.name}
                      </span>
                      {profile.id === 'standard' && (
                        <span className="px-1.5 py-0.5 rounded-full bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300 font-mono text-[9px] font-bold">
                          Recommended
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] font-mono text-muted dark:text-slate-400 mt-1">
                      {profile.layerHeight}mm · {profile.infillPercent}% infill
                    </p>
                    <p className="text-[11px] text-muted dark:text-slate-400 line-clamp-2 mt-1">
                      {profile.tagline}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Collapsible Advanced Print Settings */}
            <div className="pt-2 border-t border-line dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full flex items-center justify-between text-xs font-mono font-bold text-muted hover:text-ink dark:hover:text-white transition-colors"
              >
                <span>Advanced Print Settings</span>
                {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showAdvanced && (
                <div className="pt-3 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted block mb-1">
                        Infill Density: {effectiveInfill}%
                      </label>
                      <input
                        type="range"
                        min="10"
                        max="100"
                        step="5"
                        value={effectiveInfill}
                        onChange={(e) => setCustomInfill(Number(e.target.value))}
                        className="w-full accent-brand-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted block mb-1">
                        Layer Height
                      </label>
                      <select
                        value={effectiveLayerHeight}
                        onChange={(e) => setCustomLayerHeight(Number(e.target.value))}
                        className="w-full py-1.5 px-2 rounded-lg border border-line dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
                      >
                        <option value="0.12">0.12 mm — Ultra Detail</option>
                        <option value="0.16">0.16 mm — Fine Finish</option>
                        <option value="0.20">0.20 mm — Standard</option>
                        <option value="0.28">0.28 mm — Fast Prototype</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="supports"
                      checked={supportsEnabled}
                      onChange={(e) => setSupportsEnabled(e.target.checked)}
                      className="rounded text-brand-500 focus:ring-brand-400"
                    />
                    <label htmlFor="supports" className="text-xs text-ink dark:text-slate-300 font-sans">
                      Enable Tree/Organic Supports for steep overhangs
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quantity & Optional Packaging */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-line dark:border-slate-800 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-display font-bold text-sm text-ink dark:text-white uppercase tracking-wider block">
                  3. Quantity & Packaging
                </span>
                <span className="text-[11px] text-muted">Bulk discounts automatically applied</span>
              </div>

              {/* Quantity Counter */}
              <div className="flex items-center border border-line dark:border-slate-700 rounded-xl bg-shell/40 dark:bg-slate-800 p-1">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-ink dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 transition-colors"
                >
                  −
                </button>
                <span className="w-10 text-center font-mono font-bold text-sm text-ink dark:text-slate-100">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-ink dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 transition-colors"
                >
                  +
                </button>
              </div>
            </div>

            {/* Optional Packaging Checkbox */}
            <div className="flex items-center justify-between p-3 rounded-xl border border-line dark:border-slate-800 bg-shell/30 dark:bg-slate-800/30">
              <div className="flex items-center gap-2.5">
                <Package className="w-4 h-4 text-accent" />
                <div>
                  <span className="text-xs font-bold text-ink dark:text-slate-200 block">
                    Protective Bubble & Box Packaging
                  </span>
                  <span className="text-[10px] text-muted">
                    +₹{pricingData?.pricingConfig?.packagingPrice || 20} per piece
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={packagingIncluded}
                onChange={(e) => setPackagingIncluded(e.target.checked)}
                className="w-4 h-4 rounded text-brand-500 focus:ring-brand-400 cursor-pointer"
              />
            </div>
          </div>

          {/* Customer Quote Summary Card */}
          {quoteBreakdown && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-brand-500/80 p-5 shadow-md space-y-4">
              <div className="flex items-center justify-between border-b border-line dark:border-slate-800 pb-3">
                <div>
                  <span className="font-mono text-[10px] uppercase font-bold tracking-wider text-brand-600 dark:text-brand-400 block">
                    Estimated Price
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="font-display text-3xl font-bold text-ink dark:text-white">
                      {formatINR(quoteBreakdown.totalPrice)}
                    </span>
                    <span className="text-xs text-muted font-mono">
                      ({formatINR(quoteBreakdown.unitPrice)} / piece)
                    </span>
                  </div>
                </div>

                <span className="px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-mono text-[10px] font-bold border border-emerald-200 dark:border-emerald-800">
                  Valid for 7 days
                </span>
              </div>

              {/* Price Line Breakdown */}
              <div className="space-y-1.5 text-xs font-sans">
                <div className="flex justify-between text-muted dark:text-slate-400">
                  <span>
                    Subtotal ({quantity} {quantity === 1 ? 'piece' : 'pieces'})
                  </span>
                  <span className="font-mono">{formatINR(quoteBreakdown.subtotal)}</span>
                </div>

                {quoteBreakdown.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                    <span>Bulk Quantity Discount</span>
                    <span className="font-mono">−{formatINR(quoteBreakdown.discountAmount)}</span>
                  </div>
                )}

                {quoteBreakdown.minimumOrderChargeApplied && (
                  <div className="flex justify-between text-amber-700 dark:text-amber-400 text-[11px] font-mono">
                    <span>Minimum order value adjustment (₹{pricingData?.pricingConfig?.minimumOrderValue || 149})</span>
                    <span>Applied (+{formatINR((pricingData?.pricingConfig?.minimumOrderValue || 149) - quoteBreakdown.discountedSubtotal)})</span>
                  </div>
                )}

                {quoteBreakdown.packagingAmount > 0 && (
                  <div className="flex justify-between text-muted dark:text-slate-400">
                    <span>Protective Bubble & Box Packaging ({quantity}x)</span>
                    <span className="font-mono">+{formatINR(quoteBreakdown.packagingAmount)}</span>
                  </div>
                )}

                {quoteBreakdown.gstAmount > 0 && (
                  <div className="flex justify-between text-muted dark:text-slate-400">
                    <span>GST ({pricingData?.pricingConfig?.gstRate}%)</span>
                    <span className="font-mono">+{formatINR(quoteBreakdown.gstAmount)}</span>
                  </div>
                )}

                <div className="pt-2 border-t border-line dark:border-slate-800 flex justify-between font-bold text-sm text-ink dark:text-white">
                  <span>Total Estimated Cost</span>
                  <span className="font-mono text-base text-brand-600 dark:text-brand-400">
                    {formatINR(quoteBreakdown.totalPrice)}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 space-y-2">
                {!modelResult?.requiresManualReview ? (
                  <button
                    type="button"
                    onClick={handleContinueToOrder}
                    disabled={isSubmitting}
                    className="w-full py-3.5 px-4 rounded-xl bg-accent hover:bg-amber-600 text-white font-mono text-xs font-bold uppercase tracking-wider shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Uploading Model ({uploadProgress || 0}%)...</span>
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="w-4 h-4" />
                        <span>Continue to Order · {formatINR(quoteBreakdown.totalPrice)}</span>
                      </>
                    )}
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={() => setShowQuoteModal(true)}
                  disabled={isSubmitting}
                  className="w-full py-3 px-4 rounded-xl border border-line hover:border-accent bg-white dark:bg-slate-800 text-ink dark:text-slate-200 font-mono text-xs font-semibold shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5 text-accent" />
                  <span>Request Manual Quote / Confirmation</span>
                </button>
              </div>

              <p className="text-[10px] text-muted text-center">
                * This is an estimated price. Final pricing may change after engineer slicer review.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Quote Request Modal */}
      {showQuoteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-line dark:border-slate-800 max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-line dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-accent" />
                <h3 className="font-display font-bold text-base text-ink dark:text-white">
                  Submit 3D CAD Quote Request
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowQuoteModal(false)}
                className="p-1 rounded-lg hover:bg-shell text-muted"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitQuote} className="space-y-3">
              {!user && (
                <>
                  <div>
                    <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted block mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rahul Sharma"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      className="w-full py-2 px-3 rounded-lg border border-line dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-ink dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted block mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="you@domain.com"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      className="w-full py-2 px-3 rounded-lg border border-line dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-ink dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted block mb-1">
                      Phone Number (WhatsApp)
                    </label>
                    <input
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value)}
                      className="w-full py-2 px-3 rounded-lg border border-line dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-ink dark:text-white"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted block mb-1">
                  Custom Instructions / Special Requirements
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Needs high impact resistance for drone mount, tolerance requirements..."
                  value={customerNotes}
                  onChange={(e) => setCustomerNotes(e.target.value)}
                  className="w-full py-2 px-3 rounded-lg border border-line dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-ink dark:text-white"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowQuoteModal(false)}
                  className="px-4 py-2 rounded-lg border border-line text-xs font-mono"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-lg bg-accent text-white font-mono text-xs font-bold shadow-xs hover:bg-amber-600 flex items-center gap-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Submit Request</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sticky Bottom Bar for Mobile Devices */}
      {quoteBreakdown && (
        <div className="fixed bottom-0 left-0 right-0 lg:hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-line dark:border-slate-800 p-3 shadow-lg z-40 flex items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-mono text-muted uppercase tracking-wider block">
              Estimated Total
            </span>
            <div className="font-display font-bold text-xl text-ink dark:text-white">
              {formatINR(quoteBreakdown.totalPrice)}
            </div>
          </div>
          <button
            type="button"
            onClick={
              modelResult?.requiresManualReview
                ? () => setShowQuoteModal(true)
                : handleContinueToOrder
            }
            className="px-5 py-2.5 rounded-xl bg-accent hover:bg-amber-600 text-white font-mono text-xs font-bold uppercase tracking-wider shadow-md flex items-center gap-1.5 cursor-pointer"
          >
            <span>{modelResult?.requiresManualReview ? 'Request Quote' : 'Continue to Order'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
        </>
      )}

      {/* Assisted Design Studio Mode */}
      {studioMode === 'assisted' && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-8 space-y-8">
          {assistedSuccess ? (
            <div className="rounded-3xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-slate-900 p-8 sm:p-12 text-center shadow-lg">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <h2 className="mt-5 font-display text-2xl sm:text-3xl font-bold text-ink dark:text-white">
                Custom Design Request Received!
              </h2>
              <p className="mt-3 font-sans text-sm sm:text-base text-muted dark:text-slate-400 max-w-xl mx-auto leading-relaxed">
                Our master makers will review your project brief, examine 3D CAD modeling specifications, and send you a custom quotation within 4 hours.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setAssistedSuccess(false);
                    setAssistedFile(null);
                    setAssistedDesc('');
                    setAssistedNotes('');
                  }}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl border border-line dark:border-slate-700 bg-shell dark:bg-slate-800 text-xs font-mono font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Submit Another Request
                </button>
                <Link
                  to="/account"
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-accent hover:bg-amber-600 text-white text-xs font-mono font-bold shadow-md transition-colors text-center"
                >
                  View My Quotes & Dashboard →
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleAssistedSubmit} className="space-y-6">
              {/* Step 1 Card: What are you starting with? */}
              <div className="rounded-3xl border border-line dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-xs space-y-6">
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent font-mono text-xs font-bold text-white">
                    1
                  </span>
                  <h2 className="font-display text-lg sm:text-xl font-bold text-ink dark:text-white">
                    Tell Us About Your Idea
                  </h2>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setAssistedSub('has-reference')}
                    className={`rounded-2xl border p-5 text-left transition-all cursor-pointer ${
                      assistedSub === 'has-reference'
                        ? 'border-accent bg-accent-soft/40 dark:bg-amber-950/20 ring-2 ring-accent/20'
                        : 'border-line dark:border-slate-800 bg-shell/50 dark:bg-slate-800/40 hover:border-accent/40'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className={`p-2.5 rounded-xl ${
                        assistedSub === 'has-reference' ? 'bg-accent text-white' : 'bg-line dark:bg-slate-700 text-muted'
                      }`}>
                        <ImageIcon className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-line dark:bg-slate-700 text-muted">
                        Photo / Drawing
                      </span>
                    </div>
                    <h3 className="mt-3 font-display text-sm font-bold text-ink dark:text-white">
                      I have a photo, sketch, or 2D drawing
                    </h3>
                    <p className="mt-1 font-sans text-xs text-muted dark:text-slate-400">
                      Upload your reference images or diagrams and our CAD designers will turn them into 3D printable files.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAssistedSub('idea-only')}
                    className={`rounded-2xl border p-5 text-left transition-all cursor-pointer ${
                      assistedSub === 'idea-only'
                        ? 'border-accent bg-accent-soft/40 dark:bg-amber-950/20 ring-2 ring-accent/20'
                        : 'border-line dark:border-slate-800 bg-shell/50 dark:bg-slate-800/40 hover:border-accent/40'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className={`p-2.5 rounded-xl ${
                        assistedSub === 'idea-only' ? 'bg-accent text-white' : 'bg-line dark:bg-slate-700 text-muted'
                      }`}>
                        <MessageSquare className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-line dark:bg-slate-700 text-muted">
                        Text Concept
                      </span>
                    </div>
                    <h3 className="mt-3 font-display text-sm font-bold text-ink dark:text-white">
                      I just have an idea or concept
                    </h3>
                    <p className="mt-1 font-sans text-xs text-muted dark:text-slate-400">
                      Describe what you want made, approximate dimensions, and how it will be used. We'll design it from scratch.
                    </p>
                  </button>
                </div>

                {assistedSub === 'has-reference' && (
                  <div className="space-y-3 pt-2">
                    <label className="block text-xs font-mono font-bold uppercase tracking-wider text-muted dark:text-slate-400">
                      Upload Reference File (JPG, PNG, WEBP, PDF, STL, OBJ)
                    </label>
                    <input
                      id="assisted-file-input"
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp,.pdf,.stl,.obj"
                      onChange={handleAssistedFileChange}
                      className="hidden"
                    />
                    <label
                      htmlFor="assisted-file-input"
                      className={`flex min-h-[140px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition-all ${
                        assistedFile
                          ? 'border-accent bg-accent-soft/40 dark:bg-amber-950/20'
                          : 'border-line dark:border-slate-700 bg-shell/40 dark:bg-slate-800/30 hover:border-accent hover:bg-accent-soft/20'
                      }`}
                    >
                      {assistedFile ? (
                        <div className="flex flex-col items-center">
                          <FileBox className="h-9 w-9 text-accent mb-2" />
                          <span className="font-mono text-xs font-bold text-ink dark:text-white max-w-sm truncate">
                            {assistedFile.name} ({(assistedFile.size / (1024 * 1024)).toFixed(2)} MB)
                          </span>
                          <span className="text-[11px] font-mono text-accent mt-1">
                            Click to replace reference file
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center">
                          <Upload className="h-8 w-8 text-muted mb-2" />
                          <span className="font-display text-sm font-bold text-ink dark:text-white">
                            Drop your reference image, drawing or document
                          </span>
                          <span className="text-xs text-muted dark:text-slate-400 font-sans mt-1">
                            Supports JPG, PNG, WEBP, PDF, STL · Up to 100MB
                          </span>
                        </div>
                      )}
                    </label>
                  </div>
                )}

                <div className="space-y-2 pt-2">
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-muted dark:text-slate-400">
                    {assistedSub === 'has-reference' ? 'Design Instructions & Notes' : 'Describe What You Want to Create *'}
                  </label>
                  <textarea
                    required={assistedSub === 'idea-only'}
                    rows={4}
                    value={assistedDesc}
                    onChange={(e) => setAssistedDesc(e.target.value)}
                    placeholder={
                      assistedSub === 'has-reference'
                        ? 'e.g. Recreate this object at 150mm height, make the base hollow for an LED light, smooth matte finish...'
                        : 'e.g. A desktop plant holder shaped like a low-poly geometric fox, about 100mm wide and 120mm tall...'
                    }
                    className="w-full py-2.5 px-3.5 rounded-xl border border-line dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-ink dark:text-white leading-relaxed focus:outline-hidden focus:ring-2 focus:ring-accent"
                  />
                </div>
              </div>

              {/* Step 2 Card: Material & Quantity */}
              <div className="rounded-3xl border border-line dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-xs space-y-6">
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent font-mono text-xs font-bold text-white">
                    2
                  </span>
                  <h2 className="font-display text-lg sm:text-xl font-bold text-ink dark:text-white">
                    Preferred Material & Quantity
                  </h2>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    {
                      id: 'PLA',
                      name: 'PLA Filament',
                      badge: 'Popular',
                      tag: 'Smooth & Everyday',
                      desc: 'Perfect for display items, figurines, prototypes, and decorative pieces.',
                    },
                    {
                      id: 'PETG',
                      name: 'PETG Filament',
                      badge: 'Durable',
                      tag: 'Tough & Heat Resistant',
                      desc: 'Great for functional parts, phone stands, brackets, and outdoor use.',
                    },
                    {
                      id: 'ABS',
                      name: 'ABS Filament',
                      badge: 'Engineering',
                      tag: 'Impact & Wear Resistant',
                      desc: 'Ideal for mechanical components, enclosures, and high-wear applications.',
                    },
                    {
                      id: 'TPU',
                      name: 'TPU Flexible',
                      badge: 'Elastic',
                      tag: 'Rubber-like Flexibility',
                      desc: 'Best for shock absorbers, gaskets, phone cases, and bendable items.',
                    },
                  ].map((mat) => {
                    const isSelected = assistedMaterial === mat.id;
                    return (
                      <button
                        key={mat.id}
                        type="button"
                        onClick={() => setAssistedMaterial(mat.id)}
                        className={`rounded-2xl border p-4 text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'border-accent bg-accent-soft/40 dark:bg-amber-950/20 ring-1 ring-accent'
                            : 'border-line dark:border-slate-800 bg-white dark:bg-slate-800/40 hover:border-accent/40'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-display text-sm font-bold text-ink dark:text-white">
                            {mat.name}
                          </span>
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-shell dark:bg-slate-700 text-muted">
                            {mat.badge}
                          </span>
                        </div>
                        <p className="mt-1 font-mono text-[11px] font-semibold text-accent">
                          {mat.tag}
                        </p>
                        <p className="mt-1 font-sans text-xs text-muted dark:text-slate-400">
                          {mat.desc}
                        </p>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-line dark:border-slate-800">
                  <div>
                    <label className="text-xs font-mono font-bold uppercase tracking-wider text-muted dark:text-slate-400 block">
                      Quantity
                    </label>
                    <span className="text-xs font-sans text-muted">
                      Number of physical pieces required
                    </span>
                  </div>
                  <div className="flex items-center border border-line dark:border-slate-700 rounded-xl overflow-hidden bg-shell/50 dark:bg-slate-800">
                    <button
                      type="button"
                      onClick={() => setAssistedQuantity(Math.max(1, assistedQuantity - 1))}
                      className="px-3 py-2 text-ink dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700 font-bold cursor-pointer"
                    >
                      -
                    </button>
                    <span className="px-4 py-2 font-mono text-sm font-bold text-ink dark:text-white">
                      {assistedQuantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setAssistedQuantity(assistedQuantity + 1)}
                      className="px-3 py-2 text-ink dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700 font-bold cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Step 3 Card: Contact Information */}
              <div className="rounded-3xl border border-line dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-xs space-y-6">
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent font-mono text-xs font-bold text-white">
                    3
                  </span>
                  <h2 className="font-display text-lg sm:text-xl font-bold text-ink dark:text-white">
                    Your Contact Details
                  </h2>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted block mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rajesh Kumar"
                      value={assistedName}
                      onChange={(e) => setAssistedName(e.target.value)}
                      className="w-full py-2.5 px-3 rounded-lg border border-line dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-ink dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted block mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="rajesh@example.com"
                      value={assistedEmail}
                      onChange={(e) => setAssistedEmail(e.target.value)}
                      className="w-full py-2.5 px-3 rounded-lg border border-line dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-ink dark:text-white"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted block mb-1">
                      Phone Number (WhatsApp for updates)
                    </label>
                    <input
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={assistedPhone}
                      onChange={(e) => setAssistedPhone(e.target.value)}
                      className="w-full py-2.5 px-3 rounded-lg border border-line dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-ink dark:text-white"
                    />
                  </div>
                </div>

                <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-line dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => handleModeChange('3d-model')}
                    className="text-xs font-mono text-accent hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>Have an STL / 3D file ready instead? Switch to 3D Slicing Engine →</span>
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmittingAssisted}
                    className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-accent hover:bg-amber-600 text-white font-mono text-xs font-bold uppercase tracking-wider shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSubmittingAssisted ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>
                          {assistedUploadProgress !== null
                            ? `Uploading (${assistedUploadProgress}%)...`
                            : 'Submitting Brief...'}
                        </span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Submit Design Brief for Quote</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

export { CustomPrinting as ShilpStudio };
