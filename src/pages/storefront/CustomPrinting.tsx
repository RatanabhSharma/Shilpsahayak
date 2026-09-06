import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Upload,
  Layers,
  Sparkles,
  AlertTriangle,
  Package,
  CheckCircle2,
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
  Maximize2,
  RotateCcw,
  Palette,
} from 'lucide-react';
import { usePricingSettings } from '../../hooks/usePricingSettings';
import { parse3DModel } from '../../services/model/modelParser';
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

  // Model Processing States: 'idle' | 'uploading' | 'processing' | 'ready' | 'needs_review' | 'error'
  type ModelProcessingState = 'idle' | 'uploading' | 'processing' | 'ready' | 'needs_review' | 'error';
  const [modelProcessingState, setModelProcessingState] = useState<ModelProcessingState>('idle');

  // File & Model state
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [modelResult, setModelResult] = useState<ParsedModelResult | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Model Sizing & Scale State
  const [scaleFactor, setScaleFactor] = useState<number>(1.0);
  const [baseDimensions, setBaseDimensions] = useState<{ x: number; y: number; z: number } | null>(null);
  const [targetHeightInput, setTargetHeightInput] = useState<string>('');
  const [modelColorMode, setModelColorMode] = useState<'original' | 'single'>('original');

  // Configuration state
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>('pla');
  const [selectedColorName, setSelectedColorName] = useState<string>('');
  const [customColorHex, setCustomColorHex] = useState<string | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<string>('standard');
  const [quantity, setQuantity] = useState<number>(1);
  const [packagingIncluded, setPackagingIncluded] = useState<boolean>(false);

  // Advanced settings
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

  // Handle Model Orientation Changes from 3D Viewer
  const handleOrientedDimensionsChange = useCallback(
    (dims: { x: number; y: number; z: number }) => {
      const currentScale = scaleFactor > 0 ? scaleFactor : 1;
      const unscaled = {
        x: Math.round((dims.x / currentScale) * 10) / 10,
        y: Math.round((dims.y / currentScale) * 10) / 10,
        z: Math.round((dims.z / currentScale) * 10) / 10,
      };
      setBaseDimensions((prev) => {
        if (
          prev &&
          Math.abs(prev.x - unscaled.x) < 0.1 &&
          Math.abs(prev.y - unscaled.y) < 0.1 &&
          Math.abs(prev.z - unscaled.z) < 0.1
        ) {
          return prev;
        }
        return unscaled;
      });
      setTargetHeightInput((unscaled.z * currentScale).toFixed(1));
    },
    [scaleFactor]
  );

  // Effective scaled dimensions (null when no valid model loaded)
  const effectiveDimensions = useMemo(() => {
    if (!modelResult?.success) return null;
    const base = baseDimensions || modelResult?.dimensions;
    if (!base) return null;
    return {
      x: Math.round(base.x * scaleFactor * 10) / 10,
      y: Math.round(base.y * scaleFactor * 10) / 10,
      z: Math.round(base.z * scaleFactor * 10) / 10,
    };
  }, [baseDimensions, modelResult, scaleFactor]);

  // Effective scaled volume (scales cubically with scaleFactor^3)
  const effectiveVolumeCm3 = useMemo(() => {
    if (!modelResult?.volumeCm3) return 0;
    return Math.max(0.01, Math.round(modelResult.volumeCm3 * Math.pow(scaleFactor, 3) * 100) / 100);
  }, [modelResult, scaleFactor]);

  // Max build volume verification
  const maxBuildVolume = pricingData?.pricingConfig?.maxBuildVolume || { x: 256, y: 256, z: 256 };
  const exceedsBuildVolume = useMemo(() => {
    if (!modelResult?.success || !effectiveDimensions) return false;
    return (
      effectiveDimensions.x > maxBuildVolume.x ||
      effectiveDimensions.y > maxBuildVolume.y ||
      effectiveDimensions.z > maxBuildVolume.z
    );
  }, [modelResult, effectiveDimensions, maxBuildVolume]);

  // Real-time geometry estimations using scaled volume (0 when no model)
  const estimatedMaterialUsageGrams = useMemo(() => {
    if (!modelResult?.success || !effectiveVolumeCm3) return 0;
    const baseUsage = estimateMaterialUsage(
      effectiveVolumeCm3,
      activeMaterial.density,
      activeProfile
    );
    // Modulate based on infill ratio (relative to standard 20%) and auto supports (+15% if enabled)
    const infillRatio = effectiveInfill / 20;
    const supportMultiplier = supportsEnabled ? 1.15 : 1.0;
    const adjusted = baseUsage * (0.75 + 0.25 * infillRatio) * supportMultiplier;
    return Math.max(1, Math.round(adjusted * 10) / 10);
  }, [modelResult, effectiveVolumeCm3, activeMaterial, activeProfile, effectiveInfill, supportsEnabled]);

  const estimatedPrintTimeHours = useMemo(() => {
    if (!estimatedMaterialUsageGrams) return 0;
    return estimatePrintTime(estimatedMaterialUsageGrams, activeProfile);
  }, [estimatedMaterialUsageGrams, activeProfile]);

  // Live Pricing Engine Calculation (null until a valid 3D model is analyzed)
  const quoteBreakdown = useMemo(() => {
    if (!pricingData?.pricingConfig) return null;
    if (!modelResult?.success || !effectiveVolumeCm3 || effectiveVolumeCm3 <= 0) return null;

    return calculateCustomerQuote(
      {
        materialWeightGrams: estimatedMaterialUsageGrams,
        printTimeHours: estimatedPrintTimeHours,
        material: activeMaterial,
        quantity,
        packagingIncluded,
        exceedsBuildVolume: exceedsBuildVolume || Boolean(modelResult?.exceedsBuildVolume),
      },
      pricingData.pricingConfig,
      pricingData.quantityDiscounts
    );
  }, [
    pricingData,
    modelResult,
    effectiveVolumeCm3,
    estimatedMaterialUsageGrams,
    estimatedPrintTimeHours,
    activeMaterial,
    quantity,
    packagingIncluded,
    exceedsBuildVolume,
  ]);

  // Handle Height & Scale adjustments
  const handleHeightInputChange = (val: string) => {
    setTargetHeightInput(val);
    const parsed = parseFloat(val);
    const base = baseDimensions || modelResult?.dimensions;
    if (!isNaN(parsed) && parsed > 0 && base && base.z > 0) {
      const newScale = Math.min(Math.max(parsed / base.z, 0.1), 5.0);
      setScaleFactor(newScale);
    }
  };

  const handleSliderScale = (newScale: number) => {
    setScaleFactor(newScale);
    const base = baseDimensions || modelResult?.dimensions;
    if (base && base.z > 0) {
      setTargetHeightInput((base.z * newScale).toFixed(1));
    }
  };

  const handlePresetScale = (presetScale: number) => {
    setScaleFactor(presetScale);
    const base = baseDimensions || modelResult?.dimensions;
    if (base && base.z > 0) {
      setTargetHeightInput((base.z * presetScale).toFixed(1));
    }
  };

  const handleResetScale = () => {
    setScaleFactor(1.0);
    const base = baseDimensions || modelResult?.dimensions;
    if (base) {
      setTargetHeightInput(base.z.toFixed(1));
    }
  };

  // Stepper Scroll & Focus helper
  const scrollToStep = (stepNumber: StepNumber, targetId: string) => {
    setCurrentStep(stepNumber);
    const element = document.getElementById(targetId);
    if (element) {
      const yOffset = -90;
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });

      element.classList.add('ring-2', 'ring-brand-500');
      setTimeout(() => {
        element.classList.remove('ring-2', 'ring-brand-500');
      }, 1500);
    }
  };

  // Handle File Selection (Supports STL, OBJ (+MTL/textures), 3MF, and ZIP archives)
  const handleFile = async (selected: File | File[] | FileList) => {
    if (!selected) return;

    const fileList: File[] =
      selected instanceof FileList
        ? Array.from(selected)
        : Array.isArray(selected)
        ? selected
        : [selected];

    if (fileList.length === 0) return;

    const validExts = ['.stl', '.obj', '.3mf', '.mtl', '.zip'];
    const hasValid = fileList.some((f) =>
      validExts.some((ext) => f.name.toLowerCase().endsWith(ext))
    );

    if (!hasValid) {
      alert('Currently STL (.stl), OBJ (.obj, .mtl), 3MF (.3mf), and ZIP archives (.zip) are supported.');
      return;
    }

    const totalSize = fileList.reduce((sum, f) => sum + f.size, 0);
    if (totalSize > 100 * 1024 * 1024) {
      alert('Total file size exceeds the 100 MB limit.');
      return;
    }

    // Set primary display file (prefer .3mf, .obj, .zip, or first valid)
    const primaryFile =
      fileList.find((f) => {
        const ext = f.name.toLowerCase();
        return ext.endsWith('.3mf') || ext.endsWith('.obj') || ext.endsWith('.zip') || ext.endsWith('.stl');
      }) || fileList[0];

    setFile(primaryFile);
    setModelProcessingState('uploading');
    setIsParsing(true);
    setModelResult(null);

    // Brief upload simulation for UI feedback
    await new Promise((r) => setTimeout(r, 200));
    setModelProcessingState('processing');

    const result = await parse3DModel(
      fileList.length === 1 ? fileList[0] : fileList,
      pricingData?.pricingConfig?.maxBuildVolume
    );

    setIsParsing(false);
    setModelResult(result);

    if (result.success) {
      // Default to original colors if detected, else single-colour preview
      if (result.hasOriginalColors) {
        setModelColorMode('original');
      } else {
        setModelColorMode('single');
      }

      setScaleFactor(1.0);
      setBaseDimensions(result.dimensions);
      setTargetHeightInput(result.dimensions.z.toFixed(1));

      const activeMaxVolume = pricingData?.pricingConfig?.maxBuildVolume || { x: 256, y: 256, z: 256 };
      const isOversized =
        result.dimensions.x > activeMaxVolume.x ||
        result.dimensions.y > activeMaxVolume.y ||
        result.dimensions.z > activeMaxVolume.z;

      if (result.requiresManualReview || isOversized) {
        setModelProcessingState('needs_review');
      } else {
        setModelProcessingState('ready');
      }

      if (currentStep === 1) {
        setCurrentStep(2);
      }
    } else {
      setModelProcessingState('error');
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
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setModelResult(null);
    setModelProcessingState('idle');
    setModelColorMode('original');
    setScaleFactor(1.0);
    setBaseDimensions(null);
    setTargetHeightInput('');
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
          fileUrl: fileKey,
          material: activeMaterial.name,
          color: activeColor.name,
          quality: activeProfile.name,
          infill: effectiveInfill,
          layerHeight: effectiveLayerHeight,
          supports: supportsEnabled,
          dimensions: effectiveDimensions || undefined,
          volume: effectiveVolumeCm3,
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
      alert(error?.message || 'Failed to process 3D file for order. Please try requesting a quote.');
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

      const fileKey = await upload3DFile(file, user?.uid || 'guest', (progress) => setUploadProgress(progress));

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
        supports: supportsEnabled,
        quantity,
        packagingIncluded,
        volume: effectiveVolumeCm3,
        estimatedWeight: estimatedMaterialUsageGrams,
        estimatedPrintTimeHours,
        systemEstimatedPrice: quoteBreakdown.totalPrice,
        estimatedPrice: quoteBreakdown.totalPrice,
        dimensions: effectiveDimensions ? {
          length: effectiveDimensions.x,
          width: effectiveDimensions.y,
          height: effectiveDimensions.z,
          unit: 'mm',
        } : undefined,
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
            Upload your 3D model for an instant printing estimate, or share your idea and let us help bring it to life.
          </p>

          {/* Dual Service Pathways */}
          <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl mx-auto text-left">
            <button
              type="button"
              onClick={() => handleModeChange('3d-model')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                studioMode === '3d-model'
                  ? 'border-accent bg-white dark:bg-slate-900 shadow-md ring-2 ring-accent/20'
                  : 'border-line dark:border-slate-800 bg-white/60 dark:bg-slate-900/40 hover:border-accent/40'
              }`}
            >
              <div
                className={`p-2 rounded-xl shrink-0 ${
                  studioMode === '3d-model'
                    ? 'bg-accent text-white'
                    : 'bg-shell dark:bg-slate-800 text-muted'
                }`}
              >
                <Box className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-display text-sm font-bold text-ink dark:text-white">
                    I Have a 3D Model
                  </span>
                  {studioMode === '3d-model' && (
                    <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                  )}
                </div>
                <p className="text-[11px] text-muted dark:text-slate-400 font-sans mt-0.5">
                  STL, 3MF, or OBJ · Instant visual preview &amp; estimated quotation
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleModeChange('assisted')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                studioMode === 'assisted'
                  ? 'border-accent bg-white dark:bg-slate-900 shadow-md ring-2 ring-accent/20'
                  : 'border-line dark:border-slate-800 bg-white/60 dark:bg-slate-900/40 hover:border-accent/40'
              }`}
            >
              <div
                className={`p-2 rounded-xl shrink-0 ${
                  studioMode === 'assisted'
                    ? 'bg-amber-500 text-white'
                    : 'bg-shell dark:bg-slate-800 text-muted'
                }`}
              >
                <Lightbulb className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-display text-sm font-bold text-ink dark:text-white">
                    I Have an Idea
                  </span>
                  {studioMode === 'assisted' && (
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  )}
                </div>
                <p className="text-[11px] text-muted dark:text-slate-400 font-sans mt-0.5">
                  Sketches, images, or brief · Custom CAD modeling &amp; quote
                </p>
              </div>
            </button>
          </div>

          {studioMode === '3d-model' && !file && (
            <div className="pt-2 flex justify-center">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-3 rounded-xl bg-ink hover:bg-slate-800 text-white font-mono text-xs font-bold uppercase tracking-wider shadow-md transition-all flex items-center gap-2 cursor-pointer"
              >
                <Upload className="w-4 h-4 text-accent" />
                <span>Upload 3D Model</span>
              </button>
            </div>
          )}
        </div>
      </section>

      {studioMode === '3d-model' && (
        <>

      {/* 3-Step Process Navigation */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8">
        <nav aria-label="Progress">
          <ol className="grid grid-cols-3 gap-2 sm:gap-4 border border-line dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 p-2 sm:p-3 shadow-xs">
            {[
              { step: 1, label: '1. Your 3D Model', desc: 'Preview & Dimensions', targetId: 'step-model' },
              { step: 2, label: '2. Print Options', desc: 'Material, Quality & Strength', targetId: 'step-options' },
              { step: 3, label: '3. Estimated Quote', desc: 'Verification & Order', targetId: 'step-quote' },
            ].map((item) => {
              const isActive = currentStep === item.step;
              const isDone = currentStep > item.step || (item.step === 1 && modelResult?.success);
              return (
                <li key={item.step} className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      if (item.step === 1 || modelResult?.success) {
                        scrollToStep(item.step as StepNumber, item.targetId);
                      }
                    }}
                    disabled={item.step > 1 && !modelResult?.success}
                    className={`w-full flex items-center gap-2 sm:gap-3 p-2 rounded-xl text-left transition-all cursor-pointer ${
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
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6">
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
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-mono text-xs font-bold shadow-xs hover:bg-emerald-700 cursor-pointer"
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

      {/* Main 3-Step Layout Grid */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Step 1 (Model & Sizing) + Step 2 (Print Options) */}
        <div className="lg:col-span-7 space-y-6">
          {/* STEP 1: Your 3D Model */}
          <div id="step-model" className="bg-white dark:bg-slate-900 rounded-2xl border border-line dark:border-slate-800 p-4 sm:p-5 shadow-xs space-y-4">
            {/* Step 1 Header */}
            <div className="flex items-center justify-between border-b border-line dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileBox className="w-5 h-5 text-accent" />
                <div>
                  <h2 className="font-display font-bold text-sm text-ink dark:text-white uppercase tracking-wider">
                    Step 1 — Your 3D Model
                  </h2>
                  <p className="text-[11px] text-muted dark:text-slate-400 font-sans">
                    Upload and preview your 3D CAD design for volume estimation
                  </p>
                </div>
              </div>

              {/* Processing State Badge */}
              <div className="flex items-center gap-2">
                {modelProcessingState === 'uploading' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-soft text-accent font-mono text-[10px] font-bold">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Uploading...</span>
                  </span>
                )}
                {modelProcessingState === 'processing' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-50 text-brand-700 font-mono text-[10px] font-bold">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Analyzing geometry...</span>
                  </span>
                )}
                {modelProcessingState === 'ready' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-mono text-[10px] font-bold border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Estimate Ready</span>
                  </span>
                )}
                {modelProcessingState === 'needs_review' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 font-mono text-[10px] font-bold border border-amber-200">
                    <AlertTriangle className="w-3 h-3" />
                    <span>Needs Review</span>
                  </span>
                )}
                {file && (
                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    className="inline-flex items-center gap-1 text-[11px] font-mono text-rose-600 hover:text-rose-700 hover:underline cursor-pointer ml-1"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Remove</span>
                  </button>
                )}
              </div>
            </div>

            {/* File Details bar & Replace Model action if file loaded */}
            {file && (
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono bg-shell/50 dark:bg-slate-800/40 px-3 py-2 rounded-xl border border-line dark:border-slate-800">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="truncate max-w-[220px] text-ink dark:text-slate-200 font-semibold" title={file.name}>
                    {file.name}
                  </span>
                  <span className="text-muted shrink-0">
                    · {(file.size / (1024 * 1024)).toFixed(2)} MB · {file.name.split('.').pop()?.toUpperCase()}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-[11px] font-mono text-accent hover:underline flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <Upload className="w-3 h-3" />
                  <span>Replace Model</span>
                </button>
              </div>
            )}

            {/* Three.js Canvas Viewer */}
            <ThreeModelViewer
              geometry={modelResult?.geometry || null}
              object3d={modelResult?.object3d || null}
              hasOriginalColors={modelResult?.hasOriginalColors || false}
              colorMode={modelColorMode}
              onColorModeChange={setModelColorMode}
              colorHex={activeColor.hex}
              isLoading={isParsing}
              error={modelResult?.errorMessage}
              dimensions={effectiveDimensions || undefined}
              scale={scaleFactor}
              onOrientedDimensionsChange={handleOrientedDimensionsChange}
            />

            {/* Original Colours Banner & Model Appearance Toggle */}
            {modelResult?.success && modelResult?.hasOriginalColors && (
              <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-xs">
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                  <div>
                    <span className="font-mono font-bold text-amber-900 dark:text-amber-300">
                      Original Model Colours Detected
                    </span>
                    <p className="text-[11px] text-amber-800/80 dark:text-amber-400/80 font-sans mt-0.5">
                      The 3D viewer displays your file's original design colours. Production prints will be crafted using your selected filament colour in Step 2.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 font-mono text-[11px] shrink-0">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold bg-amber-600 text-white shadow-2xs">
                    <Palette className="w-3.5 h-3.5" />
                    <span>Original Colours Active</span>
                  </span>
                </div>
              </div>
            )}

            {/* Empty State when no file selected */}
            {!file && (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 sm:p-10 text-center cursor-pointer transition-all ${
                  isDragOver
                    ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/20'
                    : 'border-line dark:border-slate-800 hover:border-accent hover:bg-shell/30'
                }`}
              >
                <div className="w-14 h-14 rounded-2xl bg-shell dark:bg-slate-800 flex items-center justify-center mx-auto text-accent mb-3 shadow-2xs">
                  <Upload className="w-7 h-7" />
                </div>
                <h3 className="font-display font-bold text-sm sm:text-base text-ink dark:text-slate-200">
                  Drag and drop your 3D CAD model here, or <span className="text-accent underline">browse</span>
                </h3>
                <p className="text-xs text-muted dark:text-slate-400 font-mono mt-1">
                  Supports 3MF (.3mf), OBJ (.obj, .mtl), STL (.stl), &amp; ZIP packages (Max 100 MB)
                </p>
                <p className="text-[11px] text-muted dark:text-slate-500 font-sans mt-3 max-w-sm mx-auto leading-relaxed">
                  Export directly from Blender, Bambu Studio, Fusion 360, Tinkercad, or community repositories. Upload multi-colour 3MF, OBJ with MTL, or ZIP archives with textures.
                </p>
              </div>
            )}

            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".stl,.obj,.3mf,.mtl,.zip"
              multiple
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleFile(e.target.files);
                }
              }}
              className="hidden"
            />

            {/* Dimensions & Sizing (Displayed when model is successfully parsed) */}
            {modelResult?.success && effectiveDimensions && (
              <div className="space-y-4 pt-3 border-t border-line dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Maximize2 className="w-4 h-4 text-accent" />
                    <span className="font-display font-bold text-xs uppercase tracking-wider text-ink dark:text-slate-200">
                      Model Dimensions & Sizing
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-accent bg-accent/10 px-2 py-0.5 rounded-md">
                      {Math.round(scaleFactor * 100)}% Scale
                    </span>
                    {scaleFactor !== 1 && (
                      <button
                        type="button"
                        onClick={handleResetScale}
                        className="text-[10px] font-mono text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1 cursor-pointer"
                        title="Reset to original 100% size"
                      >
                        <RotateCcw className="w-2.5 h-2.5" />
                        <span>Reset</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Dimensions Grid (X, Y, Z in mm) */}
                <div className="grid grid-cols-3 gap-2 bg-shell/50 dark:bg-slate-800/40 p-3 rounded-xl border border-line dark:border-slate-800 text-center">
                  <div>
                    <span className="text-[10px] font-mono text-muted uppercase tracking-wider block">
                      Length (X)
                    </span>
                    <span className="font-mono text-xs font-bold text-ink dark:text-slate-200">
                      {effectiveDimensions.x} <span className="text-[10px] font-normal">mm</span>
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-muted uppercase tracking-wider block">
                      Width (Y)
                    </span>
                    <span className="font-mono text-xs font-bold text-ink dark:text-slate-200">
                      {effectiveDimensions.y} <span className="text-[10px] font-normal">mm</span>
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-muted uppercase tracking-wider block">
                      Height (Z)
                    </span>
                    <span className="font-mono text-xs font-bold text-accent">
                      {effectiveDimensions.z} <span className="text-[10px] font-normal">mm</span>
                    </span>
                  </div>
                </div>

                {/* Scale Controls: Height & Presets */}
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                    <div>
                      <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted dark:text-slate-400 block mb-1">
                        Target Height (Z in mm)
                      </label>
                      <div className="relative flex items-center">
                        <input
                          type="number"
                          step="0.5"
                          min="5"
                          max={maxBuildVolume.z}
                          value={targetHeightInput}
                          onChange={(e) => handleHeightInputChange(e.target.value)}
                          className="w-full py-2 px-3 pr-10 rounded-xl border border-line dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-bold text-ink dark:text-white focus:outline-hidden focus:ring-2 focus:ring-brand-500 shadow-2xs"
                        />
                        <span className="absolute right-3 font-mono text-xs text-muted pointer-events-none">
                          mm
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted dark:text-slate-400 block mb-1">
                        Quick Scale Presets
                      </label>
                      <div className="flex items-center gap-1.5">
                        {[50, 75, 100, 150, 200].map((pct) => (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => handlePresetScale(pct / 100)}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                              Math.round(scaleFactor * 100) === pct
                                ? 'bg-brand-500 text-white shadow-2xs'
                                : 'bg-shell dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-ink dark:text-slate-200'
                            }`}
                          >
                            {pct}%
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Uniform Scale Slider */}
                  <div>
                    <div className="flex justify-between text-[10px] font-mono text-muted mb-1">
                      <span>25%</span>
                      <span className="font-bold text-ink dark:text-slate-200">
                        Uniform Scale: {Math.round(scaleFactor * 100)}%
                      </span>
                      <span>300%</span>
                    </div>
                    <input
                      type="range"
                      min="0.25"
                      max="3.0"
                      step="0.05"
                      value={scaleFactor}
                      onChange={(e) => handleSliderScale(parseFloat(e.target.value))}
                      className="w-full accent-brand-500 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Build Volume Envelope Check */}
                {exceedsBuildVolume ? (
                  <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/40 p-3 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">Exceeds Maximum Build Envelope</span>
                      <span>
                        Model dimensions ({effectiveDimensions.x} × {effectiveDimensions.y} × {effectiveDimensions.z} mm) exceed our {maxBuildVolume.x} × {maxBuildVolume.y} × {maxBuildVolume.z} mm printer volume. Please scale down or submit for custom split printing review.
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 dark:bg-emerald-950/20 p-2.5 text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-mono text-[11px] font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Fits Workshop Printer Envelope
                    </span>
                    <span className="font-mono text-[10px] text-emerald-700 dark:text-emerald-400">
                      Max: {maxBuildVolume.x} × {maxBuildVolume.y} × {maxBuildVolume.z} mm
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* STEP 2: Choose Printing Options */}
          <div id="step-options" className="space-y-4">
            {/* Material & Color Group */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-line dark:border-slate-800 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-line dark:border-slate-800 pb-3">
                <div>
                  <h3 className="font-display font-bold text-sm text-ink dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <Layers className="w-4 h-4 text-accent" />
                    <span>Step 2 — Material & Color</span>
                  </h3>
                  <p className="text-[11px] text-muted dark:text-slate-400 font-sans">
                    Select production filament and color finish
                  </p>
                </div>
                <span className="font-mono text-xs font-bold text-accent bg-accent/10 px-2.5 py-1 rounded-md">
                  ₹{activeMaterial.pricePerGram}/g
                </span>
              </div>

              {/* Material Selection Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {activeMaterials.map((mat) => {
                  const isSelected = selectedMaterialId === mat.id;
                  return (
                    <button
                      key={mat.id}
                      type="button"
                      onClick={() => handleMaterialChange(mat.id)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/30 ring-1 ring-brand-400 shadow-2xs'
                          : 'border-line dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-display font-bold text-sm text-ink dark:text-slate-100">
                          {mat.name}
                        </span>
                        <span className="font-mono text-[10px] font-bold text-accent">
                          ₹{mat.pricePerGram}/g
                        </span>
                      </div>
                      <p className="text-[11px] text-muted dark:text-slate-400 line-clamp-2 leading-relaxed font-sans">
                        {mat.tagline || mat.description}
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* Custom Colour Palette */}
              <div className="pt-3 border-t border-line dark:border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-ink dark:text-slate-200">
                    Printing Colour:{' '}
                    <span className="text-accent font-semibold ml-1">
                      {customColorHex ? `Custom (${customColorHex.toUpperCase()})` : activeColor.name}
                    </span>
                  </span>
                </div>

                <div className="flex items-center gap-2.5">
                  {/* Custom Colour Palette Wheel */}
                  <label
                    className="relative flex items-center justify-center w-8 h-8 rounded-full border-2 border-brand-500 scale-105 shadow-sm ring-2 ring-brand-500/30 cursor-pointer transition-all hover:scale-110"
                    style={{
                      background:
                        'conic-gradient(from 180deg at 50% 50%, #FF0000 0deg, #FFFF00 60deg, #00FF00 120deg, #00FFFF 180deg, #0000FF 240deg, #FF00FF 300deg, #FF0000 360deg)',
                    }}
                    title="Open custom colour palette"
                  >
                    <input
                      type="color"
                      value={customColorHex || activeColor.hex || '#1C1917'}
                      onChange={(e) => {
                        setCustomColorHex(e.target.value);
                        setSelectedColorName(`Custom (${e.target.value.toUpperCase()})`);
                      }}
                      className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                    />
                  </label>

                  {/* Selected Color Swatch & Hex */}
                  <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-shell/50 dark:bg-slate-800/50 border border-line dark:border-slate-700 text-xs font-mono">
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-slate-300 dark:border-slate-600 shadow-xs shrink-0"
                      style={{ backgroundColor: customColorHex || activeColor.hex }}
                    />
                    <span className="font-bold text-ink dark:text-slate-200">
                      {(customColorHex || activeColor.hex).toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Print Quality Group */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-line dark:border-slate-800 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-line dark:border-slate-800 pb-3">
                <div>
                  <h3 className="font-display font-bold text-sm text-ink dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-accent" />
                    <span>Print Quality (Layer Height)</span>
                  </h3>
                  <p className="text-[11px] text-muted dark:text-slate-400 font-sans">
                    Finer layers deliver smoother vertical walls with minimal layer lines
                  </p>
                </div>
                <span className="font-mono text-xs text-muted">
                  {effectiveLayerHeight} mm layer
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {[
                  { id: 'budget', name: 'Draft', height: '0.28 mm', desc: 'Fast prototype & rough form testing' },
                  { id: 'standard', name: 'Standard', height: '0.20 mm', desc: 'Optimal balance of surface quality & speed', recommended: true },
                  { id: 'premium', name: 'Fine', height: '0.12 mm', desc: 'Smooth surface finish for miniatures & display' },
                ].map((tier) => {
                  const isSelected = selectedProfileId === tier.id;
                  return (
                    <button
                      key={tier.id}
                      type="button"
                      onClick={() => {
                        setSelectedProfileId(tier.id);
                        setCustomLayerHeight(null);
                      }}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/30 ring-1 ring-brand-400 shadow-2xs'
                          : 'border-line dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-display font-bold text-sm text-ink dark:text-slate-100">
                          {tier.name}
                        </span>
                        {tier.recommended && (
                          <span className="px-1.5 py-0.5 rounded-full bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300 font-mono text-[9px] font-bold">
                            Recommended
                          </span>
                        )}
                      </div>
                      <p className="font-mono text-xs font-semibold text-accent mb-1">
                        {tier.height}
                      </p>
                      <p className="text-[11px] text-muted dark:text-slate-400 leading-relaxed font-sans">
                        {tier.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Strength (Infill) Group */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-line dark:border-slate-800 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-line dark:border-slate-800 pb-3">
                <div>
                  <h3 className="font-display font-bold text-sm text-ink dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <Box className="w-4 h-4 text-accent" />
                    <span>Part Strength (Infill Density)</span>
                  </h3>
                  <p className="text-[11px] text-muted dark:text-slate-400 font-sans">
                    Internal grid density determines weight, rigidity, and material usage
                  </p>
                </div>
                <span className="font-mono text-xs font-bold text-accent">
                  {effectiveInfill}% infill
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {[
                  { pct: 15, name: 'Lightweight', subtitle: '15% infill', desc: 'Display & decorative · Fastest print · Minimal material' },
                  { pct: 25, name: 'Balanced', subtitle: '25% infill', desc: 'Standard utility · Great strength-to-weight balance' },
                  { pct: 50, name: 'Reinforced', subtitle: '50% infill', desc: 'Mechanical & functional · Maximum load resistance' },
                ].map((tier) => {
                  const isSelected = effectiveInfill === tier.pct;
                  return (
                    <button
                      key={tier.pct}
                      type="button"
                      onClick={() => setCustomInfill(tier.pct)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/30 ring-1 ring-brand-400 shadow-2xs'
                          : 'border-line dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-display font-bold text-sm text-ink dark:text-slate-100">
                          {tier.name}
                        </span>
                        <span className="font-mono text-xs font-semibold text-accent">
                          {tier.subtitle}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted dark:text-slate-400 leading-relaxed font-sans">
                        {tier.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Supports Group */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-line dark:border-slate-800 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-line dark:border-slate-800 pb-3">
                <div>
                  <h3 className="font-display font-bold text-sm text-ink dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <Layers className="w-4 h-4 text-accent" />
                    <span>Support Structures</span>
                  </h3>
                  <p className="text-[11px] text-muted dark:text-slate-400 font-sans">
                    Temporary scaffolding for steep overhangs and horizontal bridges
                  </p>
                </div>
                <span className="font-mono text-xs font-semibold text-muted">
                  {supportsEnabled ? 'Auto (Enabled)' : 'None'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setSupportsEnabled(true)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    supportsEnabled
                      ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/30 ring-1 ring-brand-400 shadow-2xs'
                      : 'border-line dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-display font-bold text-sm text-ink dark:text-slate-100">
                      Auto Supports
                    </span>
                    <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-mono text-[9px] font-bold">
                      Recommended
                    </span>
                  </div>
                  <p className="text-[11px] text-muted dark:text-slate-400 leading-relaxed font-sans">
                    Recommended for steep overhangs (&gt;45°), bridges & complex organic models.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setSupportsEnabled(false)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    !supportsEnabled
                      ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/30 ring-1 ring-brand-400 shadow-2xs'
                      : 'border-line dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-display font-bold text-sm text-ink dark:text-slate-100">
                      No Supports
                    </span>
                  </div>
                  <p className="text-[11px] text-muted dark:text-slate-400 leading-relaxed font-sans">
                    Best for flat-bottom models, geometric primitives, or self-supporting angles.
                  </p>
                </button>
              </div>
            </div>

            {/* Quantity & Packaging Group */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-line dark:border-slate-800 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-line dark:border-slate-800 pb-3">
                <div>
                  <h3 className="font-display font-bold text-sm text-ink dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <Package className="w-4 h-4 text-accent" />
                    <span>Quantity & Packaging</span>
                  </h3>
                  <p className="text-[11px] text-muted dark:text-slate-400 font-sans">
                    Bulk volume discounts automatically applied
                  </p>
                </div>

                {/* Quantity Stepper */}
                <div className="flex items-center border border-line dark:border-slate-700 rounded-xl bg-shell/40 dark:bg-slate-800 p-1">
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-ink dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    −
                  </button>
                  <span className="w-10 text-center font-mono font-bold text-sm text-ink dark:text-slate-100">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-ink dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Protective Packaging Checkbox */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-line dark:border-slate-800 bg-shell/30 dark:bg-slate-800/30">
                <div className="flex items-center gap-2.5">
                  <Package className="w-4 h-4 text-accent shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-ink dark:text-slate-200 block">
                      Protective Bubble & Box Packaging
                    </span>
                    <span className="text-[10px] text-muted">
                      +₹{pricingData?.pricingConfig?.packagingPrice || 20} per piece · High-durability box with custom padding
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
          </div>
        </div>

        {/* Right Column: Step 3 — Quotation Card (Sticky on Desktop) */}
        <div id="step-quote" className="lg:col-span-5 lg:sticky lg:top-24 space-y-4 self-start">
          {quoteBreakdown && modelResult?.success ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-accent/80 p-5 shadow-md space-y-4">
              {/* Dominant Price Header */}
              <div className="border-b border-line dark:border-slate-800 pb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-[10px] uppercase font-bold tracking-wider text-accent">
                    Step 3 — Estimated Quotation
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-shell dark:bg-slate-800 text-muted dark:text-slate-300 font-mono text-[10px] font-bold border border-line dark:border-slate-700">
                    Theoretical Estimate
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-display font-extrabold text-3xl sm:text-4xl text-ink dark:text-white">
                    {formatINR(quoteBreakdown.totalPrice)}
                  </span>
                  {quantity > 1 && (
                    <span className="text-xs text-muted font-mono">
                      ({formatINR(quoteBreakdown.unitPrice)} / piece)
                    </span>
                  )}
                </div>
                <p className="text-xs font-mono text-muted dark:text-slate-400 mt-1">
                  For {quantity} {quantity === 1 ? 'piece' : 'pieces'} · {activeMaterial.name} ({activeColor.name}) · {activeProfile.name} quality
                </p>
                <p className="text-[11px] text-muted dark:text-slate-400 mt-1.5 leading-relaxed font-sans">
                  Your estimate changes based on the selected material, print settings, and quantity.
                </p>
              </div>

              {/* Compact Breakdown Table */}
              <div className="rounded-xl border border-line dark:border-slate-800 bg-shell/30 dark:bg-slate-800/30 p-3.5 space-y-2 text-xs">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted block">
                  Print Specifications Breakdown
                </span>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 font-mono text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-muted font-sans">Material:</span>
                    <span className="font-bold text-ink dark:text-slate-200 truncate ml-1">{activeMaterial.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted font-sans">Color:</span>
                    <span className="font-bold text-ink dark:text-slate-200 truncate ml-1">{activeColor.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted font-sans">Quality:</span>
                    <span className="font-bold text-ink dark:text-slate-200">{activeProfile.name} ({effectiveLayerHeight}mm)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted font-sans">Strength:</span>
                    <span className="font-bold text-ink dark:text-slate-200">{effectiveInfill}% infill</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted font-sans">Est. Material:</span>
                    <span className="font-bold text-accent">~{estimatedMaterialUsageGrams} g</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted font-sans">Est. Print Time:</span>
                    <span className="font-bold text-accent">~{formatPrintTime(estimatedPrintTimeHours)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted font-sans">Quantity:</span>
                    <span className="font-bold text-ink dark:text-slate-200">{quantity} {quantity === 1 ? 'piece' : 'pieces'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted font-sans">Packaging:</span>
                    <span className="font-bold text-ink dark:text-slate-200">{packagingIncluded ? 'Protective Box' : 'Standard'}</span>
                  </div>
                </div>
              </div>

              {/* Pricing Lines */}
              <div className="space-y-1.5 text-xs font-sans border-t border-line dark:border-slate-800 pt-3">
                <div className="flex justify-between text-muted dark:text-slate-400">
                  <span>Subtotal ({quantity} {quantity === 1 ? 'piece' : 'pieces'})</span>
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
                    <span>Minimum order adjustment (₹{pricingData?.pricingConfig?.minimumOrderValue || 149})</span>
                    <span>+{formatINR((pricingData?.pricingConfig?.minimumOrderValue || 149) - quoteBreakdown.discountedSubtotal)}</span>
                  </div>
                )}

                {quoteBreakdown.packagingAmount > 0 && (
                  <div className="flex justify-between text-muted dark:text-slate-400">
                    <span>Protective Box Packaging ({quantity}x)</span>
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
                  <span>Estimated Total</span>
                  <span className="font-mono text-base text-accent">
                    {formatINR(quoteBreakdown.totalPrice)}
                  </span>
                </div>
              </div>

              {/* Short Scannable Verification Notice */}
              <div className="rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 p-3 text-xs text-amber-900 dark:text-amber-300 space-y-1">
                <p className="font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>We verify your model and confirm the final price before production.</span>
                </p>
                <p className="text-[11px] text-amber-800 dark:text-amber-400 leading-relaxed font-sans">
                  This theoretical estimate is based on geometric volume. Our workshop team verifies slicing toolpaths, wall thicknesses, and print orientation before manufacturing begins.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-1 space-y-2">
                {!modelResult?.requiresManualReview && !exceedsBuildVolume ? (
                  <button
                    type="button"
                    onClick={handleContinueToOrder}
                    disabled={isSubmitting}
                    className="w-full p-3.5 rounded-xl bg-accent hover:bg-amber-600 text-white text-center shadow-md transition-all cursor-pointer"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center justify-center gap-2 font-mono text-xs font-bold uppercase">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Uploading Model ({uploadProgress || 0}%)...</span>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center justify-center gap-2 font-mono text-xs font-bold uppercase tracking-wider">
                          <ShoppingCart className="w-4 h-4" />
                          <span>Place order for verification · {formatINR(quoteBreakdown.totalPrice)}</span>
                        </div>
                        <span className="block text-[10px] font-sans font-normal opacity-90 mt-0.5">
                          Submit your model and settings. We will verify the details before production.
                        </span>
                      </div>
                    )}
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={() => setShowQuoteModal(true)}
                  disabled={isSubmitting}
                  className="w-full p-3.5 rounded-xl border border-line hover:border-accent bg-white dark:bg-slate-800 text-ink dark:text-slate-200 text-center shadow-xs transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-center gap-2 font-mono text-xs font-semibold">
                    <Send className="w-3.5 h-3.5 text-accent" />
                    <span>Request a quote review</span>
                  </div>
                  <span className="block text-[10px] font-sans font-normal text-muted dark:text-slate-400 mt-0.5">
                    Not ready to order? Ask us to review your model and quotation.
                  </span>
                </button>
              </div>
            </div>
          ) : (
            /* Empty Quotation Placeholder when no model uploaded */
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-line dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-line dark:border-slate-800 pb-3">
                <FileBox className="w-4 h-4 text-accent" />
                <h3 className="font-display font-bold text-sm text-ink dark:text-white uppercase tracking-wider">
                  Step 3 — Estimated Quotation
                </h3>
              </div>
              <div className="text-center py-6 space-y-3">
                <div className="w-12 h-12 rounded-full bg-shell dark:bg-slate-800 flex items-center justify-center mx-auto text-accent">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h4 className="font-display font-bold text-base text-ink dark:text-white">
                  Upload a model to see your instant price
                </h4>
                <p className="text-xs text-muted dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
                  Upload an STL, OBJ, or 3MF file to view estimated material weight, print time, and instant quotation.
                </p>
              </div>
              <div className="rounded-xl bg-shell/40 dark:bg-slate-800/40 p-3 space-y-2 text-xs text-muted dark:text-slate-400">
                <div className="flex items-center gap-2 font-medium text-ink dark:text-slate-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Live volume & theoretical cost calculation</span>
                </div>
                <div className="flex items-center gap-2 font-medium text-ink dark:text-slate-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Configurable filament, color, quality & strength</span>
                </div>
                <div className="flex items-center gap-2 font-medium text-ink dark:text-slate-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Workshop engineer verification before production</span>
                </div>
                <div className="flex items-center gap-2 font-medium text-ink dark:text-slate-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Zero upfront charge until final confirmation</span>
                </div>
              </div>
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
                      placeholder="Enter your name"
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
                      placeholder="Enter your number"
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
              modelResult?.requiresManualReview || exceedsBuildVolume
                ? () => setShowQuoteModal(true)
                : handleContinueToOrder
            }
            className="px-5 py-2.5 rounded-xl bg-accent hover:bg-amber-600 text-white font-mono text-xs font-bold uppercase tracking-wider shadow-md flex items-center gap-1.5 cursor-pointer"
          >
            <span>{modelResult?.requiresManualReview || exceedsBuildVolume ? 'Request Quote Review' : 'Place Order for Verification'}</span>
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
                      placeholder="Enter your name"
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
                      placeholder="you@example.com"
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
                      placeholder="Enter your number"
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
