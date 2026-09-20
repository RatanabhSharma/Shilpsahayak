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
  ArrowLeft,
  Box,
  Lightbulb,
  Info,
  Image as ImageIcon,
  MessageSquare,
  Maximize2,
  Palette,
  Check,
  ChevronDown,
  ChevronUp,
  Shield,
  Sliders,
  Lock,
  Unlock,
  RotateCcw,
} from 'lucide-react';
import { usePricingSettings } from '../../hooks/usePricingSettings';
import { parse3DModel } from '../../services/model/modelParser';
import { ParsedModelResult, ColorReplacement, ProductionColorMapping, DetectedColor } from '../../services/model/modelTypes';
import { globalGeometryCache } from '../../services/model/sceneBuilder';
import { ThreeModelViewer } from '../../components/custom-printing/ThreeModelViewer';
import {
  formatINR,
} from '../../services/pricing/pricingUtils';
import { calculateCustomerQuote } from '../../services/pricing/calculateQuote';
import { DEFAULT_QUANTITY_DISCOUNTS } from '../../services/pricing/pricingConfig';
import type { QuoteSnapshot } from '../../services/pricing/pricingTypes';
import { createDefaultProductionMapping } from '../../services/filament/filamentCatalog';
import { useStore } from '../../store';
import { useAuth } from '../../hooks/useAuth';
import { upload3DFile } from '../../utils/uploadFile';
import { useSubmitQuote } from '../../hooks/useQuotes';
import { executeSlicingJob, fetchActiveProfileEnvelope, SlicingSuccessResult, inspectModelFile, ColorAnalysis, UniversalModelAnalysis } from '../../services/slicing/slicingClient';


export type StudioTab = 'upload' | 'configure' | 'estimate';
export type QualityPreset = 'draft' | 'standard' | 'fine';
export type StrengthPreset = 'light' | 'balanced' | 'strong';
export type SupportMode = 'auto' | 'none' | 'required';
export type SurfaceFinish = 'standard' | 'smooth';
export type SizeMode = 'original' | 'custom';

export type { ColorReplacement, ProductionColorMapping };

const POPULAR_FILAMENT_COLORS = [
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Black', hex: '#161616' },
  { name: 'Red', hex: '#EF4444' },
  { name: 'Blue', hex: '#3B82F6' },
  { name: 'Yellow', hex: '#FACC15' },
  { name: 'Green', hex: '#10B981' },
  { name: 'Orange', hex: '#F97316' },
  { name: 'Purple', hex: '#8B5CF6' },
  { name: 'Grey', hex: '#6B7280' },
  { name: 'Pink', hex: '#EC4899' },
];

// Customer-Facing Options Definitions
const QUALITY_OPTIONS: {
  id: QualityPreset;
  name: string;
  badge?: string;
  description: string;
  profileId: string;
}[] = [
  {
    id: 'draft',
    name: 'Draft',
    description: 'Faster printing, lower detail. Suitable for prototypes and simple shapes.',
    profileId: 'budget',
  },
  {
    id: 'standard',
    name: 'Standard',
    badge: 'Recommended',
    description: 'Balanced quality and print time. Suitable for general-purpose printing.',
    profileId: 'standard',
  },
  {
    id: 'fine',
    name: 'Fine',
    description: 'More detail, longer print time. Suitable for miniatures and detailed models.',
    profileId: 'premium',
  },
];

const STRENGTH_OPTIONS: {
  id: StrengthPreset;
  name: string;
  badge?: string;
  description: string;
  defaultInfill: number;
}[] = [
  {
    id: 'light',
    name: 'Light',
    description: 'Suitable for decorative objects with lower material usage.',
    defaultInfill: 15,
  },
  {
    id: 'balanced',
    name: 'Balanced',
    badge: 'Recommended',
    description: 'Suitable for general-purpose objects with optimal strength-to-weight balance.',
    defaultInfill: 25,
  },
  {
    id: 'strong',
    name: 'Strong',
    description: 'Suitable for functional parts with high resistance to load and impact.',
    defaultInfill: 50,
  },
];

const SUPPORT_OPTIONS: {
  id: SupportMode;
  name: string;
  badge?: string;
  description: string;
}[] = [
  {
    id: 'auto',
    name: 'Auto',
    badge: 'Recommended',
    description: 'Let us choose. Optimal scaffolding placed automatically on steep overhangs.',
  },
  {
    id: 'none',
    name: 'No support',
    description: 'Print without support where possible. Best for flat-bottom and simple models.',
  },
  {
    id: 'required',
    name: 'Required',
    description: 'Use support for difficult areas, complex bridges, and organic details.',
  },
];

const FINISH_OPTIONS: {
  id: SurfaceFinish;
  name: string;
  badge?: string;
  description: string;
}[] = [
  {
    id: 'standard',
    name: 'Standard',
    badge: 'Default',
    description: 'Natural layer texture, clean, robust, and authentic to 3D printing.',
  },
  {
    id: 'smooth',
    name: 'Smooth',
    description: 'Enhanced surface refinement and ironing for smoother top faces and touch.',
  },
];




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
  const assistedMaterial = 'To be advised by Shilp team';
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

  // 3-Step Tab Navigation State
  const [activeTab, setActiveTab] = useState<StudioTab>('upload');

  // Model Processing States: 'idle' | 'uploading' | 'processing' | 'ready' | 'needs_review' | 'error'
  type ModelProcessingState = 'idle' | 'uploading' | 'processing' | 'ready' | 'needs_review' | 'error';
  const [modelProcessingState, setModelProcessingState] = useState<ModelProcessingState>('idle');

  // File & Model state
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [modelResult, setModelResult] = useState<ParsedModelResult | null>(null);
  const [activePlateId, setActivePlateId] = useState<string | undefined>(undefined);
  const [isDragOver, setIsDragOver] = useState(false);

  // Real Slicer Service Integration State (Phase 2B/2C)
  const [isSlicing, setIsSlicing] = useState<boolean>(false);
  const [slicingStageMessage, setSlicingStageMessage] = useState<string>('');
  const [slicerResult, setSlicerResult] = useState<SlicingSuccessResult | null>(null);
  const [slicerError, setSlicerError] = useState<string | null>(null);
  const [backendActiveEnvelope, setBackendActiveEnvelope] = useState<{ x: number; y: number; z: number } | null>(null);
  const currentJobTokenRef = useRef<string>('');

  // Backend Multicolor Detection State (Phase 1)
  const [colorAnalysis, setColorAnalysis] = useState<ColorAnalysis | null>(null);
  const [modelInspection, setModelInspection] = useState<UniversalModelAnalysis | null>(null);





  useEffect(() => {
    fetchActiveProfileEnvelope().then((env) => {
      if (env) setBackendActiveEnvelope(env);
    });
  }, []);

  // Model Sizing & Scale State
  const [sizeMode, setSizeMode] = useState<SizeMode>('original');
  const [lockAspectRatio, setLockAspectRatio] = useState<boolean>(true);
  const [scaleFactor, setScaleFactor] = useState<number>(1.0);
  const [scaleX, setScaleX] = useState<number>(1.0);
  const [scaleY, setScaleY] = useState<number>(1.0);
  const [scaleZ, setScaleZ] = useState<number>(1.0);
  const [baseDimensions, setBaseDimensions] = useState<{ x: number; y: number; z: number } | null>(null);
  const [dimInputX, setDimInputX] = useState<string>('');
  const [dimInputY, setDimInputY] = useState<string>('');
  const [dimInputZ, setDimInputZ] = useState<string>('');
  const [modelColorMode, setModelColorMode] = useState<'original' | 'single'>('original');

  // Customer-Facing Configuration Presets
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>('pla');
  const [selectedColorName, setSelectedColorName] = useState<string>('#1C1917');
  const [customColorHex, setCustomColorHex] = useState<string>('#808080');
  const [qualityPreset, setQualityPreset] = useState<QualityPreset>('standard');
  const [strengthPreset, setStrengthPreset] = useState<StrengthPreset>('balanced');
  const [supportMode, setSupportMode] = useState<SupportMode>('auto');
  const [surfaceFinish, setSurfaceFinish] = useState<SurfaceFinish>('standard');
  const [quantity, setQuantity] = useState<number>(1);
  const [packagingIncluded, setPackagingIncluded] = useState<boolean>(false);

  // Optional Advanced Settings (Hidden by default)
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [customInfill, setCustomInfill] = useState<number | null>(null);
  const [customLayerHeight, setCustomLayerHeight] = useState<number | null>(null);

  // Handoff & Submission States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [quoteSuccess, setQuoteSuccess] = useState<boolean>(false);
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [showQuoteModal, setShowQuoteModal] = useState(false);

  // Active configurations from pricing settings
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
    const newMat = activeMaterials.find((m) => m.id === materialId);
    if (newMat) {
      setColorReplacements((prev) => {
        const updated: Record<number, ProductionColorMapping> = {};
        for (const [key, mapping] of Object.entries(prev)) {
          updated[Number(key)] = {
            ...mapping,
            materialId: newMat.id,
            materialType: newMat.name,
          };
        }
        return updated;
      });
    }
  };

  // User Color / Material / AMS Production Replacements for Multicolor Models (Phase 2B)
  const [colorReplacements, setColorReplacements] = useState<Record<number, ProductionColorMapping>>({});
  const [activeColorPickerFilament, setActiveColorPickerFilament] = useState<number | null>(null);

  const handleColorReplacement = (filamentIndex: number, originalHex: string, newHex: string) => {
    // Switch viewer to 'single' (Filament Colour) mode so user immediately sees live preview
    setModelColorMode('single');

    setColorReplacements((prev) => {
      const existing = prev[filamentIndex];
      return {
        ...prev,
        [filamentIndex]: {
          sourceFilament: filamentIndex,
          originalHex,
          productionHex: newHex.toUpperCase(),
          materialId: activeMaterial.id,
          materialType: activeMaterial.name,
          amsSlot: existing?.amsSlot ?? null,
        },
      };
    });
  };

  const handleResetColorReplacement = (filamentIndex: number, originalHex: string) => {
    setColorReplacements((prev) => {
      return {
        ...prev,
        [filamentIndex]: {
          sourceFilament: filamentIndex,
          originalHex,
          productionHex: originalHex,
          materialId: activeMaterial.id,
          materialType: activeMaterial.name,
          amsSlot: null,
        },
      };
    });
  };



  // Selected Color from the interactive Color Palette
  const activeColor = useMemo(() => {
    const hex = customColorHex || '#808080';
    return {
      name: selectedColorName || hex.toUpperCase(),
      hex,
    };
  }, [customColorHex, selectedColorName]);

  // Active Plate and contextual detected colors for plate-aware palette filtering
  const activePlate = useMemo(() => {
    if (modelResult?.previewMode === 'multi_plate' && activePlateId && modelResult.plates) {
      return modelResult.plates.find((p) => p.id === activePlateId) || null;
    }
    return null;
  }, [modelResult, activePlateId]);

  function getDisplayColorName(hex: string, fallbackIndex?: number): string {
    if (!hex) return fallbackIndex !== undefined ? `Color ${fallbackIndex}` : 'Unknown';
    const cleanHex = hex.trim().toLowerCase();
    const popular = POPULAR_FILAMENT_COLORS.find((c) => c.hex.toLowerCase() === cleanHex);
    if (popular) return popular.name;
    const fromPalette = colorAnalysis?.colors?.find((c) => (c.hex || '').toLowerCase() === cleanHex);
    if (fromPalette?.colorName) return fromPalette.colorName;
    if (fromPalette?.materialName) return fromPalette.materialName;
    return hex.toUpperCase();
  }

  const displayedDetectedColors = useMemo(() => {
    if (!modelResult) return [];
    if (modelResult.previewMode === 'multi_plate' && activePlate) {
      if (activePlate.detectedColors && activePlate.detectedColors.length > 0) {
        return activePlate.detectedColors;
      }
    }
    return modelResult.detectedColors || [];
  }, [modelResult, activePlate]);

  // Unified detection: check both backend deep analysis and client-side model parser
  const detectedMulticolorHexList = useMemo<string[]>(() => {
    if (colorAnalysis?.colors && colorAnalysis.colors.length > 1) {
      return colorAnalysis.colors.map((c) => c.hex);
    }
    if (displayedDetectedColors && displayedDetectedColors.length > 1) {
      return displayedDetectedColors;
    }
    if (modelResult?.detectedColors && modelResult.detectedColors.length > 1) {
      return modelResult.detectedColors;
    }
    return [];
  }, [colorAnalysis, displayedDetectedColors, modelResult]);

  // Unified single source of truth: model is multicolor if either backend or client parser identified multiple colors
  const isMultiColorModel = Boolean(
    (colorAnalysis?.isMultiColor && (colorAnalysis.colors?.length ?? 0) > 1) ||
    detectedMulticolorHexList.length > 1
  );

  // Normalized color list for multicolor UI display (backed by either backend colorAnalysis or client parser)
  const effectiveMulticolorColors = useMemo<DetectedColor[]>(() => {
    if (colorAnalysis?.colors && colorAnalysis.colors.length > 1) {
      return colorAnalysis.colors;
    }
    if (detectedMulticolorHexList.length > 1) {
      return detectedMulticolorHexList.map((hex, idx) => ({
        index: idx + 1,
        sourceFilament: idx + 1,
        hex,
        colorName: getDisplayColorName(hex, idx + 1),
        materialType: activeMaterial.name,
      }));
    }
    return [];
  }, [colorAnalysis, detectedMulticolorHexList, activeMaterial]);


  const customizedCount = useMemo(() => {
    if (!effectiveMulticolorColors || effectiveMulticolorColors.length === 0) return 0;
    return effectiveMulticolorColors.filter((col) => {
      const slot = col.sourceFilament ?? col.index;
      const rep = colorReplacements[slot];
      if (!rep) return false;
      return rep.productionHex.toUpperCase() !== col.hex.toUpperCase();
    }).length;
  }, [colorReplacements, effectiveMulticolorColors]);

  // Active Profiles & Profile Resolution from Customer Quality Preset
  const activeProfiles = useMemo(
    () => (pricingData?.printProfiles || []).filter((p) => p.enabled),
    [pricingData]
  );

  const activeProfile = useMemo(() => {
    const targetOption = QUALITY_OPTIONS.find((q) => q.id === qualityPreset);
    const targetProfileId = targetOption?.profileId || 'standard';
    return (
      activeProfiles.find((p) => p.id === targetProfileId) ||
      activeProfiles.find((p) => p.id === 'standard') ||
      activeProfiles[0] ||
      pricingData.printProfiles[0]
    );
  }, [activeProfiles, qualityPreset, pricingData]);

  // Resolution: Strength Preset -> Default Infill
  const resolvedInfill = useMemo(() => {
    if (customInfill !== null) return customInfill;
    const option = STRENGTH_OPTIONS.find((s) => s.id === strengthPreset);
    return option?.defaultInfill ?? 25;
  }, [strengthPreset, customInfill]);

  // Effective Parameters for Slicer Engine & Summary
  const effectiveInfill = resolvedInfill;
  const effectiveLayerHeight = customLayerHeight ?? activeProfile.layerHeight;
  const supportsEnabled = supportMode !== 'none';

  // Keep stable ref to scaleFactor to prevent recreation of handleOrientedDimensionsChange
  const scaleFactorRef = useRef(scaleFactor);
  useEffect(() => {
    scaleFactorRef.current = scaleFactor;
  }, [scaleFactor]);

  // Handle Model Orientation Changes from 3D Viewer (unscaled geometry dims)
  const handleOrientedDimensionsChange = useCallback(
    (unscaled: { x: number; y: number; z: number }) => {
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
    },
    []
  );

  // Sync inputs whenever base dimensions change
  useEffect(() => {
    const base = baseDimensions || modelResult?.dimensions;
    if (base) {
      setDimInputX((base.x * scaleX).toFixed(1));
      setDimInputY((base.y * scaleY).toFixed(1));
      setDimInputZ((base.z * scaleZ).toFixed(1));
    }
  }, [baseDimensions, modelResult?.dimensions]);

  // Effective scaled dimensions
  const effectiveDimensions = useMemo(() => {
    if (!modelResult?.success) return null;
    const base = baseDimensions || modelResult?.dimensions;
    if (!base) return null;
    return {
      x: Math.round(base.x * scaleX * 10) / 10,
      y: Math.round(base.y * scaleY * 10) / 10,
      z: Math.round(base.z * scaleZ * 10) / 10,
    };
  }, [baseDimensions, modelResult, scaleX, scaleY, scaleZ]);

  // Effective scaled volume (scales with scaleX * scaleY * scaleZ)
  const effectiveVolumeCm3 = useMemo(() => {
    if (!modelResult?.volumeCm3) return 0;
    return Math.max(0.01, Math.round(modelResult.volumeCm3 * scaleX * scaleY * scaleZ * 100) / 100);
  }, [modelResult, scaleX, scaleY, scaleZ]);

  // Max build volume — use backend-returned envelope from the active profile when available,
  // then fall back to health-check active envelope, then Firestore pricingConfig.
  const maxBuildVolume = slicerResult?.activeEnvelope ||
    backendActiveEnvelope ||
    pricingData?.pricingConfig?.maxBuildVolume ||
    null;

  const exceedsBuildVolume = useMemo(() => {
    if (!modelResult?.success) return false;
    if (!maxBuildVolume) return false;

    // Helper to check if a specific dimension exceeds the envelope
    const checkDim = (dim: { x: number; y: number; z: number }) => {
      const scaledX = dim.x * scaleX;
      const scaledY = dim.y * scaleY;
      const scaledZ = dim.z * scaleZ;
      return (
        scaledX > maxBuildVolume.x ||
        scaledY > maxBuildVolume.y ||
        scaledZ > maxBuildVolume.z
      );
    };

    // If multi-plate, check EVERY plate
    if (modelResult.previewMode === 'multi_plate' && modelResult.plates && modelResult.plates.length > 0) {
      return modelResult.plates.some((plate) => checkDim(plate.dimensions));
    }

    // Otherwise, check the overall effective dimensions
    if (!effectiveDimensions) return false;
    return (
      effectiveDimensions.x > maxBuildVolume.x ||
      effectiveDimensions.y > maxBuildVolume.y ||
      effectiveDimensions.z > maxBuildVolume.z
    );
  }, [modelResult, effectiveDimensions, maxBuildVolume, scaleX, scaleY, scaleZ]);


  // ─── AUTHORITATIVE PRODUCTION QUOTE (calculated from actual slicer metrics) ───
  // Evaluates live admin pricing using the actual toolpath filament and print duration.
  // When quantity or packaging changes, this useMemo recalculates immediately in pure
  // client code without re-running the slicer.
  const productionQuoteBreakdown = useMemo(() => {
    if (slicerResult?.status === 'completed' && slicerResult.statistics && pricingData?.pricingConfig) {
      const stats = slicerResult.statistics;
      const filamentGrams = slicerResult.filament_grams ?? stats.filament_grams;
      const printTimeHours = stats.print_time_hours ?? (slicerResult.print_time_seconds ? slicerResult.print_time_seconds / 3600 : 0);

      try {
        const q = calculateCustomerQuote(
          {
            materialWeightGrams: filamentGrams,
            printTimeHours,
            material: activeMaterial,
            quantity,
            packagingIncluded,
            exceedsBuildVolume,
            activeEnvelope: slicerResult.activeEnvelope || pricingData.pricingConfig.maxBuildVolume,
            dimensions: slicerResult.dimensions || effectiveDimensions,
          },
          pricingData.pricingConfig,
          pricingData.quantityDiscounts || DEFAULT_QUANTITY_DISCOUNTS
        );

        return {
          unitPrice: q.unitPrice,
          quantity: q.quantity,
          subtotal: q.subtotal,
          discountAmount: q.discountAmount,
          discountedSubtotal: q.discountedSubtotal,
          packagingAmount: q.packagingAmount,
          subtotalBeforeGst: q.subtotalBeforeGst,
          minimumOrderChargeApplied: q.minimumOrderChargeApplied,
          gstAmount: q.gstAmount,
          totalPrice: q.totalPrice,
          quoteStatus: q.quoteStatus || (exceedsBuildVolume ? 'manual_review' : 'production_verified'),
          isEstimate: false,
          requiresManualReview: Boolean(exceedsBuildVolume || slicerResult.quote?.requiresManualReview),
          reviewReason: exceedsBuildVolume
            ? `Model dimensions exceed the active printer build envelope (${maxBuildVolume?.x || 256} × ${maxBuildVolume?.y || 256} × ${maxBuildVolume?.z || 200} mm). Requires manual review.`
            : slicerResult.quote?.reviewReason,
          pricingBreakdown: q.pricingBreakdown,
        };
      } catch (err) {
        return slicerResult.quote || null;
      }
    } else if (slicerResult?.status === 'completed' && slicerResult.quote) {
      return slicerResult.quote;
    }
    return null;
  }, [
    slicerResult,
    activeMaterial,
    quantity,
    packagingIncluded,
    exceedsBuildVolume,
    effectiveDimensions,
    maxBuildVolume,
    pricingData,
  ]);

  // The active quote MUST be the authoritative production quote:
  const quoteBreakdown = productionQuoteBreakdown;
  const isProductionVerified = Boolean(productionQuoteBreakdown);

  // Actual Slicer-calculated filament weight and print duration (authoritative, from production verification)
  const actualFilamentGrams = slicerResult?.filament_grams ?? slicerResult?.statistics?.filament_grams ?? null;
  const actualFilamentMm = slicerResult?.filament_mm ?? slicerResult?.statistics?.filament_mm ?? null;
  const actualPrintTimeSeconds = slicerResult?.print_time_seconds ?? slicerResult?.statistics?.print_time_seconds ?? null;
  const actualPrintTimeHours = slicerResult?.statistics?.print_time_hours ?? (actualPrintTimeSeconds ? actualPrintTimeSeconds / 3600 : null);
  const actualPrintTimeMinutes = slicerResult?.statistics?.print_time_minutes ?? (actualPrintTimeSeconds ? Math.round(actualPrintTimeSeconds / 60) : null);
  const actualPrintTimeString = slicerResult?.raw_time_string ?? slicerResult?.statistics?.raw_time_string ?? null;
  const actualDimensions = slicerResult?.dimensions ?? effectiveDimensions;

  // Multicolor Slicing Summary & Display Helpers
  const multicolorSummary = slicerResult?.multicolorSummary;

  // ─── AUTOMATIC BACKGROUND SLICER & TOOLPATH HASHING ──────────────────────
  // Toolpath Hash: Changes to these properties require regenerating G-code toolpaths.
  // Changes to quantity or packagingIncluded are excluded: they recalculate price immediately
  // in pure client code using the existing valid slicer statistics.
  const toolpathHash = useMemo(() => {
    if (!file || !modelResult?.success) return null;
    return [
      file.name,
      file.size,
      file.lastModified,
      selectedMaterialId,
      qualityPreset,
      customLayerHeight ?? '',
      effectiveInfill,
      supportMode,
      scaleX.toFixed(3),
      scaleY.toFixed(3),
      scaleZ.toFixed(3),
      baseDimensions?.x?.toFixed(1) ?? '',
      baseDimensions?.y?.toFixed(1) ?? '',
      baseDimensions?.z?.toFixed(1) ?? '',
      JSON.stringify(colorReplacements),
    ].join('|');
  }, [
    file,
    modelResult?.success,
    selectedMaterialId,
    qualityPreset,
    customLayerHeight,
    effectiveInfill,
    supportMode,
    scaleX,
    scaleY,
    scaleZ,
    baseDimensions?.x,
    baseDimensions?.y,
    baseDimensions?.z,
    colorReplacements,
  ]);

  const lastSlicedHashRef = useRef<string | null>(null);

  // Automatic background slicing function
  const runBackgroundSlice = useCallback(async (hash: string) => {
    if (!file) return;

    // FUTURE SLICER:
    // Automatic slicing is temporarily disabled.
    // Previous implementation preserved under future-tasks/slicer/
    // Re-enable only after slicing accuracy is independently validated.
    
    // We immediately stop slicing and force a manual review.
    setIsSlicing(false);
    setSlicerError(null);
    lastSlicedHashRef.current = hash;
  }, [file]);

  // Automatic Background Slicer: Triggers whenever toolpath-affecting settings change (debounced).
  useEffect(() => {
    if (!toolpathHash) {
      lastSlicedHashRef.current = null;
      setSlicerResult(null);
      setSlicerError(null);
      setIsSlicing(false);
      return;
    }

    if (toolpathHash === lastSlicedHashRef.current && slicerResult) {
      return; // Already sliced with this exact toolpath configuration
    }

    const timer = setTimeout(() => {
      runBackgroundSlice(toolpathHash);
    }, 500);

    return () => clearTimeout(timer);
  }, [toolpathHash, runBackgroundSlice, slicerResult]);

  // Navigation State Guards
  const canGoToConfigure = Boolean(file && modelResult?.success);
  const canGoToEstimate = Boolean(file && modelResult?.success);

  // Tab Navigation Handler
  // Clicking the Estimate tab shows the instant estimate immediately — no slicer is triggered.
  // Production verification is a separate optional customer action on the Estimate tab.
  const handleTabChange = (tab: StudioTab) => {
    if (tab === 'upload') {
      setActiveTab('upload');
      window.scrollTo({ top: 300, behavior: 'smooth' });
    } else if (tab === 'configure') {
      if (canGoToConfigure) {
        setActiveTab('configure');
        window.scrollTo({ top: 300, behavior: 'smooth' });
      }
    } else if (tab === 'estimate') {
      if (canGoToEstimate) {
        setActiveTab('estimate');
        window.scrollTo({ top: 300, behavior: 'smooth' });
      }
    }
  };


  // Guard: Automatically return to valid tab if model is removed
  useEffect(() => {
    if (activeTab === 'configure' && !canGoToConfigure) {
      setActiveTab('upload');
    } else if (activeTab === 'estimate' && !canGoToConfigure) {
      setActiveTab('upload');
    }
  }, [activeTab, canGoToConfigure]);

  // Handle Dimension & Scale adjustments
  const handleDimChange = (axis: 'x' | 'y' | 'z', val: string) => {
    if (axis === 'x') setDimInputX(val);
    if (axis === 'y') setDimInputY(val);
    if (axis === 'z') setDimInputZ(val);

    const parsed = parseFloat(val);
    const base = baseDimensions || modelResult?.dimensions;
    if (!isNaN(parsed) && parsed > 0 && base && base[axis] > 0) {
      if (lockAspectRatio) {
        const ratio = Math.min(Math.max(parsed / base[axis], 0.05), 5.0);
        setScaleFactor(Math.round(ratio * 1000) / 1000);
        setScaleX(ratio);
        setScaleY(ratio);
        setScaleZ(ratio);
        if (axis !== 'x') setDimInputX((base.x * ratio).toFixed(1));
        if (axis !== 'y') setDimInputY((base.y * ratio).toFixed(1));
        if (axis !== 'z') setDimInputZ((base.z * ratio).toFixed(1));
      } else {
        const axisRatio = Math.min(Math.max(parsed / base[axis], 0.05), 5.0);
        if (axis === 'x') setScaleX(axisRatio);
        if (axis === 'y') setScaleY(axisRatio);
        if (axis === 'z') setScaleZ(axisRatio);
      }
    }
  };

  const handleSliderScale = (newScale: number) => {
    setScaleFactor(newScale);
    setScaleX(newScale);
    setScaleY(newScale);
    setScaleZ(newScale);
    const base = baseDimensions || modelResult?.dimensions;
    if (base) {
      setDimInputX((base.x * newScale).toFixed(1));
      setDimInputY((base.y * newScale).toFixed(1));
      setDimInputZ((base.z * newScale).toFixed(1));
    }
  };

  const handlePresetScale = (presetScale: number) => {
    setScaleFactor(presetScale);
    setScaleX(presetScale);
    setScaleY(presetScale);
    setScaleZ(presetScale);
    const base = baseDimensions || modelResult?.dimensions;
    if (base) {
      setDimInputX((base.x * presetScale).toFixed(1));
      setDimInputY((base.y * presetScale).toFixed(1));
      setDimInputZ((base.z * presetScale).toFixed(1));
    }
  };

  const handleResetScale = () => {
    setScaleFactor(1.0);
    setScaleX(1.0);
    setScaleY(1.0);
    setScaleZ(1.0);
    const base = baseDimensions || modelResult?.dimensions;
    if (base) {
      setDimInputX(base.x.toFixed(1));
      setDimInputY(base.y.toFixed(1));
      setDimInputZ(base.z.toFixed(1));
    }
  };

  const handleSizeModeChange = (mode: SizeMode) => {
    setSizeMode(mode);
    if (mode === 'original') {
      handleResetScale();
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
    setColorAnalysis(null);
    setModelInspection(null);
    setColorReplacements({});
    setActiveColorPickerFilament(null);
    globalGeometryCache.clear();
    currentJobTokenRef.current = '';
    setSlicerResult(null);
    setSlicerError(null);
    setIsSlicing(false);
    setSlicingStageMessage('');

    // Backend deep inspection (classification & Bambu/Orca color_analysis)
    inspectModelFile(primaryFile, primaryFile.name)
      .then((insp) => {
        if (insp.success && insp.modelAnalysis) {
          setModelInspection(insp.modelAnalysis);
        }
        if (insp.success && insp.colorAnalysis) {
          setColorAnalysis(insp.colorAnalysis);
          if (insp.colorAnalysis.isMultiColor && insp.colorAnalysis.colors) {
            const analysisColors = insp.colorAnalysis.colors;
            setColorReplacements((prev) => {
              const base = createDefaultProductionMapping(analysisColors, activeMaterials, activeMaterial);
              for (const [k, v] of Object.entries(prev)) {
                const numKey = Number(k);
                if (base[numKey] && v.productionHex !== v.originalHex) {
                  base[numKey] = {
                    ...base[numKey],
                    productionHex: v.productionHex,
                  };
                }
              }
              return base;
            });
          }
        }
      })
      .catch((err) => {
        console.warn('Backend model inspection deferred:', err);
      });

    // Brief upload simulation for UI feedback
    await new Promise((r) => setTimeout(r, 200));
    setModelProcessingState('processing');

    const result = await parse3DModel(
      fileList.length === 1 ? fileList[0] : fileList,
      pricingData?.pricingConfig?.maxBuildVolume
    );

    // FUTURE SLICER: Force manual review for ALL files.
    result.requiresManualReview = true;
    result.reviewReason = "Automatic quotation is temporarily disabled. All models require engineer review.";


    setIsParsing(false);
    setModelResult(result);

    if (result.success) {
      // Seed colorReplacements immediately if client parser detected multicolor
      if (result.detectedColors && result.detectedColors.length > 1) {
        const clientColors: DetectedColor[] = result.detectedColors.map((hex, idx) => ({
          index: idx + 1,
          sourceFilament: idx + 1,
          hex,
          colorName: getDisplayColorName(hex, idx + 1),
          materialType: activeMaterial.name,
        }));
        setColorReplacements((prev) => {
          if (Object.keys(prev).length > 0) return prev;
          return createDefaultProductionMapping(clientColors, activeMaterials, activeMaterial);
        });
      }
      if (result.hasOriginalColors) {
        setModelColorMode('original');
      } else {
        setModelColorMode('single');
      }

      if (result.previewMode === 'multi_plate' && result.plates && result.plates.length > 0) {
        setActivePlateId(result.plates[0].id);
      } else {
        setActivePlateId(undefined);
      }

      setScaleFactor(1.0);
      setScaleX(1.0);
      setScaleY(1.0);
      setScaleZ(1.0);
      setSizeMode('original');
      setBaseDimensions(result.dimensions);
      setDimInputX(result.dimensions.x.toFixed(1));
      setDimInputY(result.dimensions.y.toFixed(1));
      setDimInputZ(result.dimensions.z.toFixed(1));

      const activeMaxVolume = backendActiveEnvelope ||
        pricingData?.pricingConfig?.maxBuildVolume ||
        { x: 256, y: 256, z: 200 };
      const isOversized =
        result.dimensions.x > activeMaxVolume.x ||
        result.dimensions.y > activeMaxVolume.y ||
        result.dimensions.z > activeMaxVolume.z;

      if (result.requiresManualReview || isOversized) {
        setModelProcessingState('needs_review');
      } else {
        setModelProcessingState('ready');
      }

      // Automatically advance to configure tab
      setActiveTab('configure');
    } else {
      setModelProcessingState('error');
    }
  };

  const handleActivePlateChange = (plateId: string) => {
    setActivePlateId(plateId);
    if (modelResult?.plates) {
      const plate = modelResult.plates.find((p) => p.id === plateId);
      if (plate) {
        setBaseDimensions(plate.dimensions);
        setDimInputX(plate.dimensions.x.toFixed(1));
        setDimInputY(plate.dimensions.y.toFixed(1));
        setDimInputZ(plate.dimensions.z.toFixed(1));
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
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setModelResult(null);
    setColorAnalysis(null);
    setModelInspection(null);
    setColorReplacements({});
    setActiveColorPickerFilament(null);
    globalGeometryCache.clear();
    currentJobTokenRef.current = '';
    setSlicerResult(null);
    setSlicerError(null);
    setIsSlicing(false);
    setSlicingStageMessage('');
    setActivePlateId(undefined);
    setModelProcessingState('idle');
    setModelColorMode('original');
    setScaleFactor(1.0);
    setSizeMode('original');
    setBaseDimensions(null);
    setDimInputX('');
    setDimInputY('');
    setDimInputZ('');
    setActiveTab('upload');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Add to Cart & Checkout Flow
  const handleContinueToOrder = async () => {
    if (!file || !modelResult || !quoteBreakdown) return;

    if (!user) {
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

    // Pre-Order Validation: Authoritative slicer result is required before placing an order.
    if (isSlicing) {
      alert('Please wait a moment while the production slicer finishes calculating the exact price.');
      return;
    }

    if (!slicerResult || slicerResult.status !== 'completed' || !quoteBreakdown) {
      if (
        confirm(
          'A verified production price could not be calculated for this model configuration.\n\n' +
          'Would you like to request an Engineer Workshop Review?'
        )
      ) {
        setShowQuoteModal(true);
      }
      return;
    }


    const filamentVal = actualFilamentGrams ?? 0;
    if (filamentVal <= 0 && (!actualFilamentMm || actualFilamentMm <= 0)) {
      setSlicerResult(null);
      alert('Authoritative filament data is missing from the slicer result.');
      return;
    }

    const timeVal = actualPrintTimeSeconds ?? 0;
    if (timeVal <= 0) {
      setSlicerResult(null);
      alert('Authoritative print duration is missing from the slicer result.');
      return;
    }

    if (!actualDimensions || actualDimensions.x <= 0 || actualDimensions.y <= 0 || actualDimensions.z <= 0) {
      setSlicerResult(null);
      alert('Authoritative model dimensions are missing from the slicer result.');
      return;
    }

    if (exceedsBuildVolume || slicerResult.quote?.exceedsBuildVolume) {
      setSlicerResult(null);
      alert('Model dimensions exceed the printer build envelope. Please request a Workshop Review.');
      return;
    }

    if (!pricingData?.pricingConfig) {
      setSlicerResult(null);
      alert('Pricing configuration is unavailable. Please refresh the page.');
      return;
    }

    if (!quoteBreakdown) {
      setSlicerResult(null);
      alert('Quote has been invalidated. Please re-slice your model.');
      return;
    }

    try {
      setIsSubmitting(true);
      setUploadProgress(10);

      // Upload file to Cloudflare R2
      const fileKey = await upload3DFile(file, user.uid, (progress) => {
        setUploadProgress(progress);
      });

      // Construct Complete Immutable QuoteSnapshot (Section 3A)
      const authoritativeQuoteId = slicerResult.quoteId || `quote-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const quoteSnapshot: QuoteSnapshot = {
        quoteId: authoritativeQuoteId,
        fileReference: {
          fileKey,
          fileName: file.name,
          fileSizeBytes: file.size,
          modelHash: slicerResult.fileSha256 || `${file.name}-${file.size}-${file.lastModified}`,
        },
        dimensions: {
          x: actualDimensions.x,
          y: actualDimensions.y,
          z: actualDimensions.z,
        },
        scale: {
          scaleFactor,
          scaleX,
          scaleY,
          scaleZ,
        },
        rotation: { x: 0, y: 0, z: 0 },
        filamentGrams: actualFilamentGrams ?? 0,
        filamentMm: actualFilamentMm ?? undefined,
        printTimeSeconds: actualPrintTimeSeconds ?? 0,
        rawTimeString: actualPrintTimeString || '',
        weightSource: slicerResult.weight_source || 'slicer_grams',
        timeSource: 'slicer_toolpath',
        printerId: slicerResult.printer_id || 'bambu_production',
        profileId: slicerResult.profile_id || activeProfile.id,
        profileName: slicerResult.profileApplied || activeProfile.name,
        profileVersion: slicerResult.profile_version || '2026-09-07-v1',
        nozzleDiameterMm: 0.4,
        activeEnvelope: slicerResult.activeEnvelope || maxBuildVolume || { x: 256, y: 256, z: 200 },
        material: {
          id: activeMaterial.id,
          name: activeMaterial.name,
          pricePerGram: activeMaterial.pricePerGram,
          density: activeMaterial.density,
          color: activeColor.name,
          colorHex: customColorHex || activeColor.hex,
        },
        qualityPreset,
        layerHeight: effectiveLayerHeight,
        infillPercent: effectiveInfill,
        wallCount: activeProfile.wallCount,
        supportMode,
        quantity,
        packagingIncluded,
        pricingVersion: pricingData.pricingVersion,
        pricingUpdatedAt: pricingData.updatedAt,
        costBreakdown: {
          materialCost: quoteBreakdown.pricingBreakdown?.materialCost || 0,
          electricityCost: quoteBreakdown.pricingBreakdown?.electricityCost || 0,
          machineWearCost: quoteBreakdown.pricingBreakdown?.machineWearCost || 0,
          failureBufferCost: quoteBreakdown.pricingBreakdown?.failureBufferCost || 0,
          labourCost: quoteBreakdown.pricingBreakdown?.labourCost || 0,
          packagingCost: quoteBreakdown.packagingAmount,
          baseServiceFee: quoteBreakdown.pricingBreakdown?.baseServiceFee || 0,
          productionCost: quoteBreakdown.pricingBreakdown?.productionCost ?? 0,
          markupAmount: quoteBreakdown.pricingBreakdown?.markupAmount ?? 0,
          subtotal: quoteBreakdown.subtotal,
          discountAmount: quoteBreakdown.discountAmount,
          discountedSubtotal: quoteBreakdown.discountedSubtotal,
          minimumOrderChargeApplied: quoteBreakdown.minimumOrderChargeApplied,
          gstAmount: quoteBreakdown.gstAmount,
          totalPrice: quoteBreakdown.totalPrice,
          unitPrice: quoteBreakdown.unitPrice,
        },
        multicolorSummary: slicerResult.multicolorSummary,
        quoteStatus: 'production_verified',
        createdAt: new Date().toISOString(),
      };

      // Add to Cart with Complete Configuration Metadata & Immutable Snapshot
      const cartItemDescription = isMultiColorModel
      ? `${activeMaterial.name} (${effectiveMulticolorColors.length} Colors) · Multicolor Production · ${qualityPreset.toUpperCase()} Quality · ${strengthPreset.toUpperCase()} Strength (${quoteBreakdown.quantity} pcs)`
      : `${activeMaterial.name} · ${activeColor.name} · ${qualityPreset.toUpperCase()} Quality · ${strengthPreset.toUpperCase()} Strength (${quoteBreakdown.quantity} pcs)`;

      addToCart(
        {
          id: `custom-${Date.now()}`,
          name: `Custom 3D Print: ${file.name}`,
          description: cartItemDescription,
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
          qualityPreset,
          strengthPreset,
          supportMode,
          surfaceFinish,
          sizeMode,
          infill: effectiveInfill,
          layerHeight: effectiveLayerHeight,
          supports: supportsEnabled,
          dimensions: actualDimensions,
          volume: effectiveVolumeCm3,
          estimatedWeight: actualFilamentGrams ?? 0,
          estimatedPrintTimeHours: actualPrintTimeHours ?? 0,
          packagingIncluded,
          pricingVersion: pricingData.pricingVersion,
          isEstimate: false,
          customPrice: quoteBreakdown.totalPrice,
          quoteId: authoritativeQuoteId,
          quoteSnapshot,
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

  // Submit Quote Review Flow
  const handleSubmitQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    const customerName = user ? user.displayName || user.email || 'Customer' : guestName.trim();
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

      const customerNotesWithPresets = [
        `Selected Presets: Quality=${qualityPreset}, Strength=${strengthPreset}, Support=${supportMode}, Finish=${surfaceFinish}, Size=${sizeMode}`,
        customerNotes.trim(),
        slicerError ? `Automated Slicing Notice: ${slicerError}` : '',
      ]
        .filter(Boolean)
        .join('\n');

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
        volume: effectiveVolumeCm3 || 0,
        estimatedWeight: actualFilamentGrams ?? 0,
        estimatedPrintTimeHours: actualPrintTimeHours ?? 0,
        systemEstimatedPrice: quoteBreakdown ? quoteBreakdown.totalPrice : 0,
        estimatedPrice: quoteBreakdown ? quoteBreakdown.totalPrice : 0,
        dimensions: actualDimensions
          ? {
              length: actualDimensions.x,
              width: actualDimensions.y,
              height: actualDimensions.z,
              unit: 'mm',
            }
          : undefined,
        notes: customerNotesWithPresets || undefined,
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

      {/* 3-Step Process Tab Navigation */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8">
        <nav aria-label="Progress">
          <ol className="grid grid-cols-3 gap-2 sm:gap-4 border border-line dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 p-2 sm:p-3 shadow-xs">
            {[
              {
                id: 'upload',
                step: '01',
                title: 'Upload',
                desc: '3D CAD Model',
                canAccess: true,
              },
              {
                id: 'configure',
                step: '02',
                title: 'Configure',
                desc: 'Material & Quality',
                canAccess: canGoToConfigure,
              },
              {
                id: 'estimate',
                step: '03',
                title: 'Estimate',
                desc: 'Instant Pricing & Quote',
                canAccess: canGoToEstimate,
              },
            ].map((item) => {
              const isActive = activeTab === item.id;
              const isDone =
                (item.id === 'upload' && modelResult?.success) ||
                (item.id === 'configure' && activeTab === 'estimate');

              return (
                <li key={item.id} className="relative">
                  <button
                    type="button"
                    onClick={() => handleTabChange(item.id as StudioTab)}
                    disabled={!item.canAccess}
                    className={`w-full flex items-center gap-2 sm:gap-3 p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                      isActive
                        ? 'bg-accent/10 dark:bg-amber-950/40 text-accent ring-1 ring-accent/40 shadow-2xs'
                        : item.canAccess
                        ? 'text-ink dark:text-slate-200 hover:bg-shell/60 dark:hover:bg-slate-800/60'
                        : 'text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-60'
                    }`}
                  >
                    <span
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center font-mono text-xs font-bold shrink-0 transition-colors ${
                        isActive
                          ? 'bg-accent text-white shadow-xs'
                          : isDone
                          ? 'bg-emerald-500 text-white'
                          : 'bg-shell dark:bg-slate-800 text-muted dark:text-slate-400'
                      }`}
                    >
                      {isDone && !isActive ? <Check className="w-4 h-4" /> : item.step}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-display font-bold leading-tight truncate">
                        {item.title}
                      </p>
                      <p className="text-[10px] sm:text-[11px] text-muted dark:text-slate-400 font-sans hidden sm:block truncate">
                        {item.desc}
                      </p>
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

      {/* ========================================================= */}
      {/* TAB 1: UPLOAD                                             */}
      {/* ========================================================= */}
      {activeTab === 'upload' && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-8 space-y-6">
          <div className="text-center space-y-2">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-ink dark:text-white">
              Upload your 3D model
            </h2>
            <p className="text-sm text-muted dark:text-slate-400 font-sans max-w-lg mx-auto">
              Start with the file you want us to print.
            </p>
          </div>

          {/* Drag and Drop Upload Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-line dark:border-slate-800 p-6 sm:p-8 shadow-xs space-y-6">
            {!file ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-10 sm:p-14 text-center cursor-pointer transition-all ${
                  isDragOver
                    ? 'border-accent bg-accent/5 dark:bg-amber-950/20'
                    : 'border-line dark:border-slate-800 hover:border-accent hover:bg-shell/30 dark:hover:bg-slate-800/40'
                }`}
              >
                <div className="w-16 h-16 rounded-2xl bg-shell dark:bg-slate-800 flex items-center justify-center mx-auto text-accent mb-4 shadow-xs">
                  <Upload className="w-8 h-8" />
                </div>
                <h3 className="font-display font-bold text-base sm:text-lg text-ink dark:text-slate-200">
                  Drag and drop your 3D CAD model here, or <span className="text-accent underline">browse</span>
                </h3>
                <p className="text-xs text-muted dark:text-slate-400 font-mono mt-2">
                  Supports 3MF (.3mf), OBJ (.obj, .mtl), STL (.stl), &amp; ZIP packages (Max 100 MB)
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-2 text-[11px] font-mono text-muted dark:text-slate-400">
                  <span className="px-2.5 py-1 rounded-md bg-shell dark:bg-slate-800 border border-line dark:border-slate-700">.STL</span>
                  <span className="px-2.5 py-1 rounded-md bg-shell dark:bg-slate-800 border border-line dark:border-slate-700">.3MF (Bambu / Prusa)</span>
                  <span className="px-2.5 py-1 rounded-md bg-shell dark:bg-slate-800 border border-line dark:border-slate-700">.OBJ + .MTL</span>
                  <span className="px-2.5 py-1 rounded-md bg-shell dark:bg-slate-800 border border-line dark:border-slate-700">.ZIP (Textures)</span>
                </div>
                <p className="text-[11px] text-muted dark:text-slate-500 font-sans mt-4 max-w-sm mx-auto leading-relaxed">
                  Direct export from Bambu Studio, Blender, Fusion 360, Tinkercad, or maker repositories.
                </p>
              </div>
            ) : (
              /* File Loaded & Parsed State */
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-shell/50 dark:bg-slate-800/50 border border-line dark:border-slate-800">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-accent/10 dark:bg-amber-950/40 text-accent flex items-center justify-center shrink-0">
                      <FileBox className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-display font-bold text-sm text-ink dark:text-white truncate" title={file.name}>
                        {file.name}
                      </h4>
                      <p className="text-xs text-muted dark:text-slate-400 font-mono">
                        {(file.size / (1024 * 1024)).toFixed(2)} MB · {file.name.split('.').pop()?.toUpperCase()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-lg border border-line dark:border-slate-700 hover:border-accent text-xs font-mono text-ink dark:text-slate-200 transition-colors cursor-pointer"
                    >
                      Replace Model
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveFile}
                      className="px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-900/40 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-xs font-mono text-rose-600 transition-colors cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                </div>

                {/* Processing State Feedback */}
                {modelProcessingState === 'processing' || isParsing ? (
                  <div className="p-8 text-center space-y-3 rounded-xl border border-line dark:border-slate-800 bg-white/40 dark:bg-slate-900/40">
                    <Loader2 className="w-8 h-8 text-accent animate-spin mx-auto" />
                    <p className="font-display font-bold text-sm text-ink dark:text-white">Analyzing 3D Geometry...</p>
                    <p className="text-xs text-muted dark:text-slate-400 font-sans">
                      Calculating surface mesh, manifold volume, and boundary dimensions.
                    </p>
                  </div>
                ) : modelResult?.success ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3.5 rounded-xl border border-line dark:border-slate-800 bg-white dark:bg-slate-800/40">
                        <span className="text-[10px] font-mono text-muted uppercase tracking-wider block">Length (X)</span>
                        <span className="font-mono text-sm font-bold text-ink dark:text-slate-200">{modelResult.dimensions.x} mm</span>
                      </div>
                      <div className="p-3.5 rounded-xl border border-line dark:border-slate-800 bg-white dark:bg-slate-800/40">
                        <span className="text-[10px] font-mono text-muted uppercase tracking-wider block">Width (Y)</span>
                        <span className="font-mono text-sm font-bold text-ink dark:text-slate-200">{modelResult.dimensions.y} mm</span>
                      </div>
                      <div className="p-3.5 rounded-xl border border-line dark:border-slate-800 bg-white dark:bg-slate-800/40">
                        <span className="text-[10px] font-mono text-muted uppercase tracking-wider block">Height (Z)</span>
                        <span className="font-mono text-sm font-bold text-accent">{modelResult.dimensions.z} mm</span>
                      </div>
                      <div className="p-3.5 rounded-xl border border-line dark:border-slate-800 bg-white dark:bg-slate-800/40">
                        <span className="text-[10px] font-mono text-muted uppercase tracking-wider block">Solid Volume</span>
                        <span className="font-mono text-sm font-bold text-ink dark:text-slate-200">{modelResult.volumeCm3.toFixed(1)} cm³</span>
                      </div>
                    </div>

                    {modelInspection?.success && (
                      <div className="rounded-xl border border-line dark:border-slate-800 bg-white/70 dark:bg-slate-900/40 p-3.5">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-mono text-muted uppercase tracking-wider block">File Intelligence</span>
                            <span className="text-xs text-ink dark:text-slate-200">
                              {String(modelInspection.format || 'model').toUpperCase()} · {modelInspection.objects?.length || 0} object(s) · {modelInspection.geometry?.triangleCount?.toLocaleString() || 0} triangles
                            </span>
                          </div>
                          <div className="text-[10px] font-mono text-muted">
                            {modelInspection.meshHealth?.manifold ? 'Closed manifold' : 'Mesh review may be required'}
                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-mono text-muted">
                          <span>Colors: {modelInspection.colors?.length || 0}</span>
                          <span>Materials: {modelInspection.materials?.length || 0}</span>
                          <span>Textures: {modelInspection.textures?.length || 0}</span>
                          {Boolean(modelInspection.project?.slicerOrigin) && (
                            <span>Slicer: {String(modelInspection.project?.slicerOrigin)}</span>
                          )}
                        </div>
                      </div>
                    )}

                    {exceedsBuildVolume ? (
                      <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/40 p-3.5 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold block">Exceeds Standard Build Envelope</span>
                          <span>
                            This model ({modelResult.dimensions.x} × {modelResult.dimensions.y} × {modelResult.dimensions.z} mm) exceeds our {maxBuildVolume.x} × {maxBuildVolume.y} × {maxBuildVolume.z} mm build volume. You can scale it down in Step 2 or request a custom split quote.
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 dark:bg-emerald-950/20 p-3 text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                        <span className="flex items-center gap-2 font-mono text-xs font-semibold">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          Geometry Verified · Ready to Configure
                        </span>
                        <span className="font-mono text-[10px] text-emerald-700 dark:text-emerald-400">
                          Workshop Printer: {maxBuildVolume.x} × {maxBuildVolume.y} × {maxBuildVolume.z} mm
                        </span>
                      </div>
                    )}

                    {/* Continue Button */}
                    <div className="pt-4 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleTabChange('configure')}
                        className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-accent hover:bg-amber-600 text-white font-mono text-xs font-bold uppercase tracking-wider shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <span>Continue to Configure</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : modelProcessingState === 'error' ? (
                  <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 text-xs flex items-center justify-between">
                    <span>{modelResult?.errorMessage || 'Unable to parse 3D model. Please try another file format.'}</span>
                    <button
                      type="button"
                      onClick={handleRemoveFile}
                      className="font-mono text-xs font-bold underline cursor-pointer"
                    >
                      Try again
                    </button>
                  </div>
                ) : null}
              </div>
            )}

          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: CONFIGURE                                          */}
      {/* ========================================================= */}
      {activeTab === 'configure' && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: 3D Model Viewer & Size Settings */}
            <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-4">
              {/* 3D Model Viewer Card */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-line dark:border-slate-800 p-4 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-line dark:border-slate-800 pb-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileBox className="w-4 h-4 text-accent shrink-0" />
                    <span className="font-display font-bold text-xs uppercase tracking-wider text-ink dark:text-white truncate">
                      {file?.name}
                    </span>
                    {modelResult?.previewMode === 'multi_plate' && modelResult.plates && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
                        {modelResult.plates.length} Plates
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-[10px] text-muted shrink-0">
                    {effectiveVolumeCm3.toFixed(1)} cm³
                  </span>
                </div>

                {/* Three.js Canvas Viewer */}
                <ThreeModelViewer
                  modelResult={modelResult}
                  activePlateId={activePlateId}
                  onActivePlateChange={handleActivePlateChange}
                  geometry={modelResult?.geometry || null}
                  object3d={modelResult?.object3d || null}
                  hasOriginalColors={modelResult?.hasOriginalColors || false}
                  colorMode={modelColorMode}
                  onColorModeChange={setModelColorMode}
                  colorHex={activeColor.hex}
                  colorReplacements={colorReplacements}
                  isMultiColor={isMultiColorModel}
                  isLoading={isParsing}
                  error={modelResult?.errorMessage}
                  dimensions={effectiveDimensions || undefined}
                  scale={scaleFactor}
                  scaleVector={{ x: scaleX, y: scaleY, z: scaleZ }}
                  onOrientedDimensionsChange={handleOrientedDimensionsChange}
                />

                {/* Original Colors Badge with Viewer Switch */}
                {modelResult?.success && (modelResult?.hasOriginalColors || isMultiColorModel) && (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-[11px]">
                    <span className="font-mono font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                      <Palette className="w-3.5 h-3.5 text-accent" />
                      {isMultiColorModel && colorAnalysis?.colors
                        ? `Original Colours (${colorAnalysis.colors.length} detected)`
                        : `Original Colours (${displayedDetectedColors.length || modelResult.detectedColors?.length || modelResult.originalColorCount || 'Multi'})`}
                    </span>
                    <div className="flex items-center gap-1 bg-white/80 dark:bg-slate-900/80 p-0.5 rounded-lg border border-amber-200/60 dark:border-amber-900/50">
                      <button
                        type="button"
                        onClick={() => setModelColorMode('original')}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer ${
                          modelColorMode === 'original'
                            ? 'bg-accent text-white shadow-2xs'
                            : 'text-muted hover:text-ink dark:hover:text-white'
                        }`}
                      >
                        Model Colours
                      </button>
                      <button
                        type="button"
                        onClick={() => setModelColorMode('single')}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer ${
                          modelColorMode === 'single'
                            ? 'bg-accent text-white shadow-2xs'
                            : 'text-muted hover:text-ink dark:hover:text-white'
                        }`}
                      >
                        Filament Colour
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Size Card */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-line dark:border-slate-800 p-4 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-line dark:border-slate-800 pb-2.5">
                  <div>
                    <h3 className="font-display font-bold text-xs uppercase tracking-wider text-ink dark:text-white flex items-center gap-1.5">
                      <Maximize2 className="w-3.5 h-3.5 text-accent" />
                      <span>Size</span>
                    </h3>
                    <p className="text-[11px] text-muted dark:text-slate-400 font-sans">
                      Original dimensions or custom scaled sizing
                    </p>
                  </div>

                  {/* Size Mode Toggle */}
                  <div className="flex items-center p-1 bg-shell dark:bg-slate-800 rounded-xl border border-line dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => handleSizeModeChange('original')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                        sizeMode === 'original'
                          ? 'bg-accent text-white shadow-2xs'
                          : 'text-muted hover:text-ink dark:hover:text-white'
                      }`}
                    >
                      Original
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSizeModeChange('custom')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                        sizeMode === 'custom'
                          ? 'bg-accent text-white shadow-2xs'
                          : 'text-muted hover:text-ink dark:hover:text-white'
                      }`}
                    >
                      Custom
                    </button>
                  </div>
                </div>

                {/* Custom Scale Controls (shown only if custom size selected) */}
                {sizeMode === 'custom' ? (
                  <div className="space-y-3 pt-1">
                    {/* Header: Dimensions & Lock Ratio Toggle */}
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted dark:text-slate-400">
                        Editable Dimensions (mm)
                      </span>
                      <button
                        type="button"
                        onClick={() => setLockAspectRatio(!lockAspectRatio)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer border ${
                          lockAspectRatio
                            ? 'bg-accent/10 border-accent/30 text-accent font-bold'
                            : 'bg-shell dark:bg-slate-800 border-line dark:border-slate-700 text-muted hover:text-ink'
                        }`}
                        title={lockAspectRatio ? 'Click to unlock independent X, Y, Z scaling' : 'Click to lock aspect ratio'}
                      >
                        {lockAspectRatio ? (
                          <>
                            <Lock className="w-3.5 h-3.5 text-accent" />
                            <span>Ratio Locked</span>
                          </>
                        ) : (
                          <>
                            <Unlock className="w-3.5 h-3.5" />
                            <span>Ratio Unlocked</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* 3 Editable Inputs: Length (X), Width (Y), Height (Z) */}
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[9px] font-mono font-bold uppercase tracking-wider text-muted dark:text-slate-400 block mb-1">
                          Length (X)
                        </label>
                        <div className="relative flex items-center">
                          <input
                            type="number"
                            step="0.5"
                            min="1"
                            value={dimInputX}
                            onChange={(e) => handleDimChange('x', e.target.value)}
                            className="w-full py-1.5 px-2.5 pr-8 rounded-xl border border-line dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-bold text-ink dark:text-white focus:outline-hidden focus:ring-2 focus:ring-accent shadow-2xs"
                          />
                          <span className="absolute right-2 font-mono text-[10px] text-muted pointer-events-none">
                            mm
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="text-[9px] font-mono font-bold uppercase tracking-wider text-muted dark:text-slate-400 block mb-1">
                          Width (Y)
                        </label>
                        <div className="relative flex items-center">
                          <input
                            type="number"
                            step="0.5"
                            min="1"
                            value={dimInputY}
                            onChange={(e) => handleDimChange('y', e.target.value)}
                            className="w-full py-1.5 px-2.5 pr-8 rounded-xl border border-line dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-bold text-ink dark:text-white focus:outline-hidden focus:ring-2 focus:ring-accent shadow-2xs"
                          />
                          <span className="absolute right-2 font-mono text-[10px] text-muted pointer-events-none">
                            mm
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="text-[9px] font-mono font-bold uppercase tracking-wider text-muted dark:text-slate-400 block mb-1">
                          Height (Z)
                        </label>
                        <div className="relative flex items-center">
                          <input
                            type="number"
                            step="0.5"
                            min="1"
                            value={dimInputZ}
                            onChange={(e) => handleDimChange('z', e.target.value)}
                            className="w-full py-1.5 px-2.5 pr-8 rounded-xl border border-line dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-bold text-ink dark:text-white focus:outline-hidden focus:ring-2 focus:ring-accent shadow-2xs"
                          />
                          <span className="absolute right-2 font-mono text-[10px] text-muted pointer-events-none">
                            mm
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Scale Presets */}
                    <div>
                      <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted dark:text-slate-400 block mb-1">
                        Quick Scale Presets
                      </label>
                      <div className="flex items-center gap-1">
                        {[50, 75, 100, 150, 200].map((pct) => (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => handlePresetScale(pct / 100)}
                            className={`flex-1 py-1 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer ${
                              Math.round(scaleFactor * 100) === pct && scaleX === scaleY && scaleY === scaleZ
                                ? 'bg-accent text-white shadow-2xs'
                                : 'bg-shell dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-ink dark:text-slate-200'
                            }`}
                          >
                            {pct}%
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Optional Uniform Scale Slider */}
                    <div>
                      <div className="flex justify-between text-[10px] font-mono text-muted mb-1">
                        <span>10%</span>
                        <span className="font-bold text-ink dark:text-slate-200">
                          Slider (Uniform): {Math.round(scaleFactor * 100)}%
                        </span>
                        <span>300%</span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="3.0"
                        step="0.05"
                        value={scaleFactor}
                        onChange={(e) => handleSliderScale(parseFloat(e.target.value))}
                        className="w-full accent-accent cursor-pointer"
                      />
                    </div>
                  </div>
                ) : (
                  /* Dimensions Preview (X, Y, Z mm) for Original Mode */
                  effectiveDimensions && (
                    <div className="grid grid-cols-3 gap-2 bg-shell/50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-line dark:border-slate-800 text-center">
                      <div>
                        <span className="text-[9px] font-mono text-muted uppercase tracking-wider block">
                          Length (X)
                        </span>
                        <span className="font-mono text-xs font-bold text-ink dark:text-slate-200">
                          {effectiveDimensions.x} <span className="text-[10px] font-normal">mm</span>
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] font-mono text-muted uppercase tracking-wider block">
                          Width (Y)
                        </span>
                        <span className="font-mono text-xs font-bold text-ink dark:text-slate-200">
                          {effectiveDimensions.y} <span className="text-[10px] font-normal">mm</span>
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] font-mono text-muted uppercase tracking-wider block">
                          Height (Z)
                        </span>
                        <span className="font-mono text-xs font-bold text-accent">
                          {effectiveDimensions.z} <span className="text-[10px] font-normal">mm</span>
                        </span>
                      </div>
                    </div>
                  )
                )}

                {/* Build Envelope Warning / Confirmation */}
                {exceedsBuildVolume ? (
                  <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/40 p-2.5 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">Exceeds Maximum Build Envelope</span>
                      <span className="text-[11px]">
                        Model exceeds {maxBuildVolume.x} × {maxBuildVolume.y} × {maxBuildVolume.z} mm printer volume. Scale down or submit for custom quote review.
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 dark:bg-emerald-950/20 p-2 text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-mono text-[11px] font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Fits Workshop Printer
                    </span>
                    <span className="font-mono text-[10px] text-emerald-700 dark:text-emerald-400">
                      Max: {maxBuildVolume.x} × {maxBuildVolume.y} × {maxBuildVolume.z} mm
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Customer-Facing Configuration Cards */}
            <div className="lg:col-span-7 space-y-4">
              {/* Multicolor Model Detected Section */}
              {isMultiColorModel && effectiveMulticolorColors.length > 1 && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-line dark:border-slate-800 p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-line dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-accent" />
                      <h3 className="font-display font-bold text-sm text-ink dark:text-white uppercase tracking-wider">
                        Multicolor Model Detected
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      {customizedCount > 0 && (
                        <span className="font-mono text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                          {customizedCount} customized
                        </span>
                      )}
                      <span className="font-mono text-xs font-bold text-accent bg-accent/10 px-2.5 py-1 rounded-md border border-accent/20">
                        {effectiveMulticolorColors.length} colors detected
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-muted dark:text-slate-400 font-sans leading-relaxed">
                    This multicolor project contains multiple color assignments. Customize individual production colors below. Production material is selected globally.
                  </p>

                  {/* Responsive Grid: 4 cards per row on desktop, 2 on tablet/mobile */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {effectiveMulticolorColors.map((col) => {
                      const filamentSlot = col.sourceFilament ?? col.index;
                      const replacement = colorReplacements[filamentSlot];

                      const effectiveMapping: ProductionColorMapping = replacement || {
                        sourceFilament: filamentSlot,
                        originalHex: col.hex,
                        productionHex: col.hex,
                        materialId: activeMaterial.id,
                        materialType: activeMaterial.name,
                        amsSlot: null,
                      };

                      const isColorCustomized = effectiveMapping.productionHex.toUpperCase() !== col.hex.toUpperCase();
                      const isCustomized = isColorCustomized;
                      const effectiveHex = effectiveMapping.productionHex;
                      const isPickerOpen = activeColorPickerFilament === filamentSlot;

                      return (
                        <div
                          key={col.index}
                          className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                            isCustomized
                              ? 'border-accent/60 bg-accent/5 dark:bg-amber-950/20 shadow-xs ring-1 ring-accent/30'
                              : 'border-line dark:border-slate-800 bg-shell/40 dark:bg-slate-800/40'
                          }`}
                        >
                          {/* Color Details: Original Color & Production Color */}
                          <div className="space-y-2.5">
                            {/* Original Color */}
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-[11px] font-sans text-muted dark:text-slate-400">
                                Original Color
                              </span>
                              <div className="flex items-center gap-1.5">
                                <span
                                  className="w-4 h-4 rounded-full border border-black/20 dark:border-white/20 shadow-2xs shrink-0"
                                  style={{ backgroundColor: col.hex }}
                                />
                                <span className="font-mono text-[11px] font-semibold text-muted dark:text-slate-400">
                                  {col.hex.toUpperCase()}
                                </span>
                              </div>
                            </div>

                            {/* Production Color */}
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-[11px] font-sans text-muted dark:text-slate-400">
                                Production Color
                              </span>
                              <div className="flex items-center gap-1.5">
                                <label className="relative cursor-pointer group">
                                  <span
                                    className="w-4 h-4 rounded-full border border-black/20 dark:border-white/20 shadow-2xs shrink-0 block group-hover:scale-110 transition-transform"
                                    style={{ backgroundColor: effectiveHex }}
                                  />
                                  <input
                                    type="color"
                                    aria-label={`Select production color for ${col.hex}`}
                                    value={effectiveHex}
                                    onChange={(e) => handleColorReplacement(filamentSlot, col.hex, e.target.value)}
                                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                                  />
                                </label>
                                {isColorCustomized ? (
                                  <span className="font-mono text-[11px] font-bold text-accent dark:text-amber-400">
                                    {effectiveMapping.productionHex}
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-sans italic text-muted dark:text-slate-500">
                                    Same as original
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Card Action: Change Color & Reset buttons */}
                          <div className="pt-2 border-t border-line/60 dark:border-slate-800 flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setActiveColorPickerFilament(isPickerOpen ? null : filamentSlot)}
                              className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                isPickerOpen
                                  ? 'bg-ink text-white dark:bg-white dark:text-ink shadow-xs'
                                  : 'bg-white dark:bg-slate-800 border border-line dark:border-slate-700 hover:border-accent hover:text-accent text-ink dark:text-slate-200 shadow-2xs'
                              }`}
                            >
                              <Palette className="w-3.5 h-3.5" />
                              <span>{isPickerOpen ? 'Done' : 'Change Color'}</span>
                            </button>

                            {isCustomized && (
                              <button
                                type="button"
                                onClick={() => handleResetColorReplacement(filamentSlot, col.hex)}
                                title="Reset to original color"
                                className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-line dark:border-slate-700 hover:border-accent hover:text-accent text-muted dark:text-slate-400 transition-all cursor-pointer shadow-2xs"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          {/* Inline Color Picker Popover / Drawer */}
                          {isPickerOpen && (
                            <div className="pt-2 mt-1 border-t border-line/80 dark:border-slate-700/80 space-y-2.5 animate-in fade-in duration-150">
                              {/* HEX text input & Native Color Wheel trigger */}
                              <div className="flex items-center gap-2">
                                <div className="relative flex-1">
                                  <span className="absolute left-2 top-1/2 -translate-y-1/2 font-mono text-[10px] font-bold text-muted">
                                    #
                                  </span>
                                  <input
                                    type="text"
                                    maxLength={6}
                                    value={effectiveHex.startsWith('#') ? effectiveHex.slice(1) : effectiveHex}
                                    onChange={(e) => {
                                      const raw = e.target.value.replace(/[^0-9A-Fa-f]/g, '').slice(0, 6);
                                      if (raw.length === 6) {
                                        handleColorReplacement(filamentSlot, col.hex, `#${raw.toUpperCase()}`);
                                      }
                                    }}
                                    placeholder="FFFFFF"
                                    className="w-full pl-5 pr-2 py-1 rounded-md border border-line dark:border-slate-700 bg-white dark:bg-slate-900 text-[11px] font-mono font-bold text-ink dark:text-white uppercase focus:outline-hidden focus:ring-1 focus:ring-accent"
                                  />
                                </div>
                                <label className="relative px-2 py-1 rounded-md border border-line dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-accent text-[10px] font-mono font-semibold text-muted dark:text-slate-300 transition-colors cursor-pointer shadow-2xs flex items-center gap-1">
                                  <span
                                    className="w-3 h-3 rounded-full shrink-0"
                                    style={{
                                      background:
                                        'conic-gradient(from 180deg at 50% 50%, #FF0000 0deg, #FFFF00 60deg, #00FF00 120deg, #00FFFF 180deg, #0000FF 240deg, #FF00FF 300deg, #FF0000 360deg)',
                                    }}
                                  />
                                  <span>Pick</span>
                                  <input
                                    type="color"
                                    value={effectiveHex}
                                    onChange={(e) => handleColorReplacement(filamentSlot, col.hex, e.target.value)}
                                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                                  />
                                </label>
                              </div>

                              {/* Quick Preset Color Dots */}
                              <div>
                                <span className="text-[9px] font-mono text-muted dark:text-slate-400 block mb-1">
                                  Quick Presets
                                </span>
                                <div className="flex flex-wrap gap-1.5">
                                  {POPULAR_FILAMENT_COLORS.map((preset) => (
                                    <button
                                      key={preset.hex}
                                      type="button"
                                      onClick={() => handleColorReplacement(filamentSlot, col.hex, preset.hex)}
                                      title={preset.name}
                                      className={`w-5 h-5 rounded-full border transition-transform hover:scale-115 cursor-pointer shadow-2xs ${
                                        effectiveHex.toUpperCase() === preset.hex.toUpperCase()
                                          ? 'border-accent ring-2 ring-accent/40 scale-110'
                                          : 'border-black/20 dark:border-white/20'
                                      }`}
                                      style={{ backgroundColor: preset.hex }}
                                    />
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Explanatory note regarding multicolor customization */}
                  <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-900/30 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-300">
                    <Sparkles className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block mb-0.5">Multicolor Customization</span>
                      <span className="text-[11px] leading-relaxed block">
                        Customize individual model colors above to your preferred production colors. The 3D preview updates in real time. Choose your production thermoplastic in the Production Material section below.
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* 1. Material */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-line dark:border-slate-800 p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-line dark:border-slate-800 pb-3">
                  <div>
                    <h3 className="font-display font-bold text-sm text-ink dark:text-white uppercase tracking-wider flex items-center gap-2">
                      <Layers className="w-4 h-4 text-accent" />
                      <span>{isMultiColorModel ? 'Production Material' : 'Material'}</span>
                    </h3>
                    <p className="text-[11px] text-muted dark:text-slate-400 font-sans">
                      {isMultiColorModel
                        ? 'Choose the production material for your multicolor print.'
                        : 'Choose the material for your print.'}
                    </p>
                  </div>
                  <span className="font-mono text-xs font-bold text-accent bg-accent/10 px-2.5 py-1 rounded-md">
                    ₹{activeMaterial.pricePerGram}/g
                  </span>
                </div>

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
                            ? 'border-accent bg-accent/5 dark:bg-amber-950/30 ring-1 ring-accent/60 shadow-2xs'
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
              </div>

              {/* 2. Color (Single-Material Models Only - Hidden for Multicolor Models) */}
              {!isMultiColorModel && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-line dark:border-slate-800 p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-line dark:border-slate-800 pb-3">
                    <div>
                      <h3 className="font-display font-bold text-sm text-ink dark:text-white uppercase tracking-wider flex items-center gap-2">
                        <Palette className="w-4 h-4 text-accent" />
                        <span>Color Palette</span>
                    </h3>
                    <p className="text-[11px] text-muted dark:text-slate-400 font-sans">
                      Select or enter your desired print color.
                    </p>
                  </div>
                  <span className="font-mono text-xs font-bold text-accent px-2.5 py-1 rounded-md bg-accent/10 border border-accent/20">
                    {customColorHex ? customColorHex.toUpperCase() : activeColor.name}
                  </span>
                </div>


                <div className="pt-1">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted dark:text-slate-400 block mb-1">
                    Production Filament Selection (Single-Colour Production)
                  </span>
                </div>

                {/* Interactive Color Palette Picker */}
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-4 p-4 rounded-xl bg-shell/40 dark:bg-slate-800/40 border border-line dark:border-slate-800">
                  {/* Swatch & Native Color Wheel Trigger */}
                  <div className="relative group cursor-pointer shrink-0">
                    <div
                      className="w-12 h-12 rounded-xl border-2 border-white/80 dark:border-slate-700 shadow-md transition-transform group-hover:scale-105 flex items-center justify-center relative overflow-hidden"
                      style={{ backgroundColor: customColorHex }}
                    >
                      {/* Rainbow corner badge indicating interactive color picker */}
                      <div
                        className="absolute bottom-0 right-0 w-5 h-5 rounded-tl-lg shadow-xs"
                        style={{
                          background:
                            'conic-gradient(from 180deg at 50% 50%, #FF0000 0deg, #FFFF00 60deg, #00FF00 120deg, #00FFFF 180deg, #0000FF 240deg, #FF00FF 300deg, #FF0000 360deg)',
                        }}
                      />
                    </div>
                    <input
                      type="color"
                      aria-label="Choose print color"
                      value={customColorHex}
                      onChange={(e) => {
                        const hex = e.target.value.toUpperCase();
                        setCustomColorHex(hex);
                        setSelectedColorName(hex);
                      }}
                      className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                    />
                  </div>

                  {/* HEX Input & Color Description */}
                  <div className="flex-1 min-w-[200px] space-y-1.5">
                    <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted dark:text-slate-400 block">
                      Color Hex Code
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1 max-w-[160px]">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs font-bold text-muted">
                          #
                        </span>
                        <input
                          type="text"
                          maxLength={7}
                          value={customColorHex.startsWith('#') ? customColorHex.slice(1) : customColorHex}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/[^0-9A-Fa-f]/g, '').slice(0, 6);
                            const hex = `#${raw.toUpperCase()}`;
                            setCustomColorHex(hex);
                            setSelectedColorName(hex);
                          }}
                          placeholder="1C1917"
                          className="w-full pl-7 pr-3 py-1.5 rounded-xl border border-line dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-bold text-ink dark:text-white uppercase focus:outline-hidden focus:ring-2 focus:ring-accent shadow-2xs"
                        />
                      </div>
                      <label
                        className="relative px-3 py-1.5 rounded-xl border border-line dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-accent hover:text-accent text-xs font-mono font-semibold text-muted dark:text-slate-300 transition-colors cursor-pointer shadow-2xs flex items-center gap-1.5"
                      >
                        <span
                          className="w-3.5 h-3.5 rounded-full shrink-0 shadow-2xs"
                          style={{
                            background:
                              'conic-gradient(from 180deg at 50% 50%, #FF0000 0deg, #FFFF00 60deg, #00FF00 120deg, #00FFFF 180deg, #0000FF 240deg, #FF00FF 300deg, #FF0000 360deg)',
                          }}
                        />
                        <span>Pick Color</span>
                        <input
                          type="color"
                          value={customColorHex}
                          onChange={(e) => {
                            const hex = e.target.value.toUpperCase();
                            setCustomColorHex(hex);
                            setSelectedColorName(hex);
                          }}
                          className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                        />
                      </label>
                    </div>
                    <p className="text-[10px] text-muted dark:text-slate-400 font-sans">
                      Click the swatch or &quot;Pick Color&quot; to open the palette picker, or enter any HEX color code.
                    </p>
                  </div>
                </div>
              </div>
              )}

              {/* 3. Print Quality Presets */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-line dark:border-slate-800 p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-line dark:border-slate-800 pb-3">
                  <div>
                    <h3 className="font-display font-bold text-sm text-ink dark:text-white uppercase tracking-wider flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-accent" />
                      <span>Print Quality</span>
                    </h3>
                    <p className="text-[11px] text-muted dark:text-slate-400 font-sans">
                      How much detail do you want?
                    </p>
                  </div>
                  <span className="font-mono text-xs font-semibold text-accent capitalize">
                    {qualityPreset}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {QUALITY_OPTIONS.map((opt) => {
                    const isSelected = qualityPreset === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          setQualityPreset(opt.id);
                          setCustomLayerHeight(null);
                        }}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'border-accent bg-accent/5 dark:bg-amber-950/30 ring-1 ring-accent/60 shadow-2xs'
                            : 'border-line dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800/40'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-display font-bold text-sm text-ink dark:text-slate-100">
                            {opt.name}
                          </span>
                          {opt.badge && (
                            <span className="px-1.5 py-0.5 rounded-full bg-accent/10 dark:bg-amber-950 text-accent font-mono text-[9px] font-bold">
                              {opt.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted dark:text-slate-400 leading-relaxed font-sans">
                          {opt.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. Strength Presets */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-line dark:border-slate-800 p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-line dark:border-slate-800 pb-3">
                  <div>
                    <h3 className="font-display font-bold text-sm text-ink dark:text-white uppercase tracking-wider flex items-center gap-2">
                      <Shield className="w-4 h-4 text-accent" />
                      <span>Strength</span>
                    </h3>
                    <p className="text-[11px] text-muted dark:text-slate-400 font-sans">
                      How much strength does your part need?
                    </p>
                  </div>
                  <span className="font-mono text-xs font-semibold text-accent capitalize">
                    {strengthPreset}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {STRENGTH_OPTIONS.map((opt) => {
                    const isSelected = strengthPreset === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          setStrengthPreset(opt.id);
                          setCustomInfill(null);
                        }}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'border-accent bg-accent/5 dark:bg-amber-950/30 ring-1 ring-accent/60 shadow-2xs'
                            : 'border-line dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800/40'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-display font-bold text-sm text-ink dark:text-slate-100">
                            {opt.name}
                          </span>
                          {opt.badge && (
                            <span className="px-1.5 py-0.5 rounded-full bg-accent/10 dark:bg-amber-950 text-accent font-mono text-[9px] font-bold">
                              {opt.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted dark:text-slate-400 leading-relaxed font-sans">
                          {opt.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 5. Support Options */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-line dark:border-slate-800 p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-line dark:border-slate-800 pb-3">
                  <div>
                    <h3 className="font-display font-bold text-sm text-ink dark:text-white uppercase tracking-wider flex items-center gap-2">
                      <Layers className="w-4 h-4 text-accent" />
                      <span>Support</span>
                    </h3>
                    <p className="text-[11px] text-muted dark:text-slate-400 font-sans">
                      How should we handle difficult overhangs?
                    </p>
                  </div>
                  <span className="font-mono text-xs font-semibold text-accent capitalize">
                    {supportMode}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {SUPPORT_OPTIONS.map((opt) => {
                    const isSelected = supportMode === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setSupportMode(opt.id)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'border-accent bg-accent/5 dark:bg-amber-950/30 ring-1 ring-accent/60 shadow-2xs'
                            : 'border-line dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800/40'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-display font-bold text-sm text-ink dark:text-slate-100">
                            {opt.name}
                          </span>
                          {opt.badge && (
                            <span className="px-1.5 py-0.5 rounded-full bg-accent/10 dark:bg-amber-950 text-accent font-mono text-[9px] font-bold">
                              {opt.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted dark:text-slate-400 leading-relaxed font-sans">
                          {opt.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 6. Surface Finish */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-line dark:border-slate-800 p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-line dark:border-slate-800 pb-3">
                  <div>
                    <h3 className="font-display font-bold text-sm text-ink dark:text-white uppercase tracking-wider flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-accent" />
                      <span>Surface Finish</span>
                    </h3>
                    <p className="text-[11px] text-muted dark:text-slate-400 font-sans">
                      What kind of finish do you want?
                    </p>
                  </div>
                  <span className="font-mono text-xs font-semibold text-accent capitalize">
                    {surfaceFinish}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {FINISH_OPTIONS.map((opt) => {
                    const isSelected = surfaceFinish === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setSurfaceFinish(opt.id)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'border-accent bg-accent/5 dark:bg-amber-950/30 ring-1 ring-accent/60 shadow-2xs'
                            : 'border-line dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800/40'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-display font-bold text-sm text-ink dark:text-slate-100">
                            {opt.name}
                          </span>
                          {opt.badge && (
                            <span className="px-1.5 py-0.5 rounded-full bg-accent/10 dark:bg-amber-950 text-accent font-mono text-[9px] font-bold">
                              {opt.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted dark:text-slate-400 leading-relaxed font-sans">
                          {opt.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 7. Quantity */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-line dark:border-slate-800 p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-display font-bold text-sm text-ink dark:text-white uppercase tracking-wider flex items-center gap-2">
                      <Package className="w-4 h-4 text-accent" />
                      <span>Quantity</span>
                    </h3>
                    <p className="text-[11px] text-muted dark:text-slate-400 font-sans">
                      Discounts automatically applied on volume orders
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
              </div>

              {/* 8. Advanced Settings (Collapsible / Optional) */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-line dark:border-slate-800 overflow-hidden shadow-xs">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="w-full p-4 flex items-center justify-between text-left hover:bg-shell/30 dark:hover:bg-slate-800/30 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Sliders className="w-4 h-4 text-accent" />
                    <div>
                      <span className="font-display font-bold text-xs uppercase tracking-wider text-ink dark:text-white block">
                        Advanced Settings
                      </span>
                      <span className="text-[11px] text-muted dark:text-slate-400 font-sans">
                        Optional production overrides (hidden by default)
                      </span>
                    </div>
                  </div>
                  {showAdvanced ? (
                    <ChevronUp className="w-4 h-4 text-muted" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted" />
                  )}
                </button>

                {showAdvanced && (
                  <div className="p-5 border-t border-line dark:border-slate-800 space-y-4 bg-shell/20 dark:bg-slate-900/40">
                    <p className="text-[11px] text-muted dark:text-slate-400 font-sans leading-relaxed">
                      Presets handle these settings automatically. You may optionally override specific values below:
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Custom Layer Height */}
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted">
                            Layer Height Override
                          </label>
                          {customLayerHeight !== null && (
                            <button
                              type="button"
                              onClick={() => setCustomLayerHeight(null)}
                              className="text-[10px] font-mono text-accent hover:underline"
                            >
                              Reset to {activeProfile.layerHeight}mm
                            </button>
                          )}
                        </div>
                        <input
                          type="number"
                          step="0.04"
                          min="0.08"
                          max="0.36"
                          placeholder={`Default (${activeProfile.layerHeight} mm)`}
                          value={customLayerHeight ?? ''}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            setCustomLayerHeight(!isNaN(val) ? val : null);
                          }}
                          className="w-full py-2 px-3 rounded-xl border border-line dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-ink dark:text-white"
                        />
                      </div>

                      {/* Custom Infill Density */}
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted">
                            Infill Density Override (%)
                          </label>
                          {customInfill !== null && (
                            <button
                              type="button"
                              onClick={() => setCustomInfill(null)}
                              className="text-[10px] font-mono text-accent hover:underline"
                            >
                              Reset to preset ({resolvedInfill}%)
                            </button>
                          )}
                        </div>
                        <input
                          type="number"
                          step="5"
                          min="10"
                          max="100"
                          placeholder={`Default (${resolvedInfill}%)`}
                          value={customInfill ?? ''}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            setCustomInfill(!isNaN(val) ? val : null);
                          }}
                          className="w-full py-2 px-3 rounded-xl border border-line dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-ink dark:text-white"
                        />
                      </div>
                    </div>

                    {/* Protective Box Packaging */}
                    <div className="flex items-center justify-between p-3 rounded-xl border border-line dark:border-slate-800 bg-white dark:bg-slate-800/40">
                      <div className="flex items-center gap-2.5">
                        <Package className="w-4 h-4 text-accent shrink-0" />
                        <div>
                          <span className="text-xs font-bold text-ink dark:text-slate-200 block">
                            Protective Bubble &amp; Box Packaging
                          </span>
                          <span className="text-[10px] text-muted">
                            +₹{pricingData?.pricingConfig?.packagingPrice || 20} per piece · High-durability box with custom foam
                          </span>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={packagingIncluded}
                        onChange={(e) => setPackagingIncluded(e.target.checked)}
                        className="w-4 h-4 rounded text-accent focus:ring-accent cursor-pointer"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Production Price & Calculation Status Card */}
              <div className="pt-2">
                {isSlicing ? (
                  <div className="p-5 rounded-2xl border border-accent/40 bg-accent/5 dark:bg-amber-950/20 space-y-2.5">
                    <div className="flex items-center gap-3">
                      <Loader2 className="w-5 h-5 animate-spin text-accent shrink-0" />
                      <div className="min-w-0 flex-1">
                        <span className="font-display font-bold text-sm text-ink dark:text-white block">
                          Calculating exact production price...
                        </span>
                        <span className="text-xs text-muted dark:text-slate-400 font-sans block truncate">
                          {slicingStageMessage || 'Generating toolpaths and calculating material usage...'}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : slicerError ? (
                  <div className="p-5 rounded-2xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/20 space-y-3">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                      <div className="space-y-1 min-w-0 flex-1">
                        <span className="font-display font-bold text-sm text-rose-700 dark:text-rose-400 block">
                          Unable to calculate verified production price
                        </span>
                        <p className="text-xs text-rose-600/90 dark:text-rose-400/90 font-sans leading-relaxed">
                          {slicerError}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2.5 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          lastSlicedHashRef.current = null;
                          if (toolpathHash) runBackgroundSlice(toolpathHash);
                        }}
                        className="px-3.5 py-1.5 rounded-lg bg-accent text-white font-mono text-xs font-bold uppercase tracking-wider hover:bg-amber-600 cursor-pointer"
                      >
                        Retry Calculation
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowQuoteModal(true)}
                        className="px-3.5 py-1.5 rounded-lg border border-line dark:border-slate-700 bg-white dark:bg-slate-800 text-ink dark:text-slate-200 font-mono text-xs font-bold hover:border-accent cursor-pointer flex items-center gap-1.5"
                      >
                        <Send className="w-3.5 h-3.5 text-accent" />
                        <span>Request Workshop Review</span>
                      </button>
                    </div>
                  </div>
                ) : quoteBreakdown ? (
                  <div className="p-5 rounded-2xl border-2 border-accent/80 bg-white dark:bg-slate-900 shadow-md space-y-4">
                    <div className="flex items-start justify-between border-b border-line dark:border-slate-800 pb-3">
                      <div>
                        <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 mb-0.5">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Production Price</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="font-display font-extrabold text-2xl sm:text-3xl text-ink dark:text-white">
                            {formatINR(quoteBreakdown.totalPrice)}
                          </span>
                          {quantity > 1 && (
                            <span className="text-xs text-muted font-mono">
                              ({formatINR(quoteBreakdown.unitPrice)} / piece)
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted dark:text-slate-400 font-mono mt-0.5">
                          For {quantity} {quantity === 1 ? 'piece' : 'pieces'} · {activeMaterial.name}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleTabChange('estimate')}
                        className="text-xs font-mono text-accent hover:underline flex items-center gap-1 cursor-pointer pt-1 shrink-0"
                      >
                        View breakdown →
                      </button>
                    </div>

                    {/* Quick toolpath metrics */}
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                      <div className="p-2.5 rounded-xl bg-shell/40 dark:bg-slate-800/40 border border-line dark:border-slate-800">
                        <span className="text-[10px] text-muted block uppercase font-bold tracking-wider">Filament</span>
                        <span className="font-bold text-ink dark:text-white mt-0.5 block">
                          {actualFilamentGrams !== null ? `${actualFilamentGrams} g ${activeMaterial.name}` : '—'}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-shell/40 dark:bg-slate-800/40 border border-line dark:border-slate-800">
                        <span className="text-[10px] text-muted block uppercase font-bold tracking-wider">Print Time</span>
                        <span className="font-bold text-ink dark:text-white mt-0.5 block">
                          {actualPrintTimeString || (actualPrintTimeMinutes !== null ? `${actualPrintTimeMinutes}m` : '—')}
                        </span>
                      </div>
                    </div>

                    {/* Primary Order Button */}
                    <button
                      type="button"
                      onClick={handleContinueToOrder}
                      disabled={isSubmitting}
                      className="w-full py-3.5 px-4 rounded-xl bg-accent hover:bg-amber-600 text-white font-mono text-xs font-bold uppercase tracking-wider shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      <span>Order for Production · {formatINR(quoteBreakdown.totalPrice)}</span>
                    </button>
                  </div>
                ) : null}
              </div>

              {/* Bottom Navigation Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => handleTabChange('upload')}
                  className="w-full sm:w-auto px-5 py-3 rounded-xl border border-line dark:border-slate-700 hover:border-slate-400 bg-white dark:bg-slate-800 text-ink dark:text-slate-200 text-xs font-mono font-bold flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Upload</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleTabChange('estimate')}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl border border-line dark:border-slate-700 hover:border-accent text-ink dark:text-slate-200 font-mono text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>View Specifications &amp; Breakdown</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

            </div>
          </div>
        </div>
      )}


      {/* ========================================================= */}
              {/* TAB 3: ESTIMATE / PRODUCTION QUOTE                        */}
        {/* ========================================================= */}
        {activeTab === 'estimate' && (
          <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
            <div className="text-center space-y-1.5">
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-ink dark:text-white">
                Engineer Review Required
              </h2>
              <p className="text-sm text-muted dark:text-slate-400 font-sans max-w-lg mx-auto">
                We'll review your model and send you a quotation within 48 hours. Automatic quotation is temporarily disabled.
              </p>
            </div>
            
            <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 rounded-3xl border border-line dark:border-slate-800 p-6 sm:p-8 shadow-sm text-center">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                  Please request an engineer quote. We will verify your file and provide you with an exact production price.
                </p>
                <button
                  type="button"
                  onClick={() => setShowQuoteModal(true)}
                  className="px-6 py-3 rounded-xl bg-accent hover:bg-amber-600 text-white font-mono text-sm font-bold uppercase tracking-wider shadow-md inline-flex items-center gap-2 cursor-pointer transition-all hover:scale-105"
                >
                  <span>Request Engineer Quote</span>
                </button>
            </div>
          </div>
        )}

        {/* Temporary block to replace the rest of the original estimate tab */}
        {false && (<div />)}
        

        {/* Sticky Bottom Bar for Mobile Devices */}
      {studioMode === '3d-model' && quoteBreakdown && (activeTab === 'configure' || activeTab === 'estimate') && (
        <div className="fixed bottom-0 left-0 right-0 lg:hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-line dark:border-slate-800 p-3 shadow-lg z-40 flex items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-mono text-muted uppercase tracking-wider block">
              Estimated Total
            </span>
            <div className="font-display font-bold text-xl text-ink dark:text-white">
              {formatINR(quoteBreakdown.totalPrice)}
            </div>
          </div>
          {activeTab === 'configure' ? (
            <button
              type="button"
              onClick={() => handleTabChange('estimate')}
              className="px-5 py-2.5 rounded-xl bg-accent hover:bg-amber-600 text-white font-mono text-xs font-bold uppercase tracking-wider shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <span>View Estimate</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={
                modelResult?.requiresManualReview || exceedsBuildVolume
                  ? () => setShowQuoteModal(true)
                  : handleContinueToOrder
              }
              className="px-5 py-2.5 rounded-xl bg-accent hover:bg-amber-600 text-white font-mono text-xs font-bold uppercase tracking-wider shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <span>{modelResult?.requiresManualReview || exceedsBuildVolume ? 'Request Review' : 'Place Order'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
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

              {/* Step 2 Card: Quantity */}
              <div className="rounded-3xl border border-line dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent font-mono text-xs font-bold text-white shrink-0">
                      2
                    </span>
                    <div>
                      <h2 className="font-display text-lg sm:text-xl font-bold text-ink dark:text-white">
                        Quantity
                      </h2>
                      <p className="text-xs font-sans text-muted dark:text-slate-400">
                        Number of physical pieces required
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center self-start sm:self-auto border border-line dark:border-slate-700 rounded-xl overflow-hidden bg-shell/50 dark:bg-slate-800">
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

      {/* Persistent Hidden File Input for uploading/replacing model */}
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
    </div>
  );
}

export { CustomPrinting as ShilpStudio };
