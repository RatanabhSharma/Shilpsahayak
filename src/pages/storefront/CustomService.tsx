import React, { useEffect, useMemo, useState } from 'react';
import {
  Upload,
  Calculator,
  Loader2,
  CheckCircle,
  FileBox,
  Lock,
  Image as ImageIcon,
  Lightbulb,
  Box,
  ShoppingCart
} from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import {
  Button,
  Input,
  Textarea,
  Card,
  Select
} from '../../components/ui';

import { calculateSTLVolume } from '../../utils/calculateVolume';

import {
  MATERIAL_CONFIG,
  BASE_FEE,
  MaterialType
} from '../../config/pricing';

import {
  useSubmitQuote,
  QuoteRequestType
} from '../../hooks/useQuotes';

import { useAuth } from '../../hooks/useAuth';
import { useUserProfile } from '../../hooks/useUserProfile';

import { upload3DFile } from '../../utils/uploadFile';

import {
  CustomPrintData,
  Product,
  useStore
} from '../../store';

type ServiceMode =
  | '3d-model'
  | 'image'
  | 'idea';

export function CustomService() {
  const navigate = useNavigate();

  const [searchParams] =
    useSearchParams();

  const submitQuote =
    useSubmitQuote();

  const {
    user,
    loading: authLoading
  } = useAuth();

  const {
    data: profile,
    isLoading: profileLoading
  } = useUserProfile();

  const addToCart = useStore(
    (state) => state.addToCart
  );

  const products = useStore(
    (state) => state.products
  );

  /* ---------------------------------------------------------------------- */
  /* Product context                                                        */
  /* ---------------------------------------------------------------------- */

  const productId =
    searchParams.get('productId');

  const variantId =
    searchParams.get('variantId');

  const selectedProduct =
    products.find(
      (product) =>
        product.id === productId
    );

  const selectedVariant =
    selectedProduct?.variants?.find(
      (variant) =>
        variant.id === variantId
    );

  /* ---------------------------------------------------------------------- */
  /* State                                                                  */
  /* ---------------------------------------------------------------------- */

  const [mode, setMode] =
    useState<ServiceMode>('3d-model');

  const [file, setFile] =
    useState<File | null>(null);

  const [isCalculating, setIsCalculating] =
    useState(false);

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [isSuccess, setIsSuccess] =
    useState(false);

  const [successMessage, setSuccessMessage] =
    useState('');

  const [uploadProgress, setUploadProgress] =
    useState<number | null>(null);

  const [material, setMaterial] =
    useState<MaterialType>('PLA');

  /*
   * Store the selected colour as HEX.
   * Example: #FFFFFF
   */
  const [color, setColor] =
    useState('#FFFFFF');

  const [infill, setInfill] =
    useState(20);

  const [layerHeight, setLayerHeight] =
    useState(0.2);

  const [quantity, setQuantity] =
    useState(1);

  const [notes, setNotes] =
    useState('');

  const [description, setDescription] =
    useState('');

  const [length, setLength] =
    useState('');

  const [width, setWidth] =
    useState('');

  const [height, setHeight] =
    useState('');

  const [volume, setVolume] =
    useState<number | null>(null);

  const [estimatedWeight, setEstimatedWeight] =
    useState<number | null>(null);

  const [estimatedPrice, setEstimatedPrice] =
    useState<number | null>(null);

  /* ---------------------------------------------------------------------- */
  /* Material options                                                       */
  /* ---------------------------------------------------------------------- */

  const materialOptions = useMemo(
    () =>
      Object.keys(
        MATERIAL_CONFIG
      ).map((mat) => ({
        value: mat,
        label: mat
      })),
    []
  );

  const layerHeightOptions =
    useMemo(
      () => [
        {
          value: '0.12',
          label: '0.12 mm — High Detail'
        },
        {
          value: '0.16',
          label: '0.16 mm'
        },
        {
          value: '0.2',
          label: '0.20 mm — Standard'
        },
        {
          value: '0.28',
          label: '0.28 mm — Draft'
        }
      ],
      []
    );

  /* ---------------------------------------------------------------------- */
  /* Price calculation                                                      */
  /* ---------------------------------------------------------------------- */

  const calculatePrice = (
    vol: number,
    mat: MaterialType,
    inf: number,
    qty: number
  ) => {
    const config =
      MATERIAL_CONFIG[mat];

    if (!config) {
      return;
    }

    const infillFactor =
      0.3 +
      (inf / 100) * 0.7;

    const weight =
      vol *
      config.density *
      infillFactor;

    const price =
      (weight *
        config.pricePerGram +
        BASE_FEE) *
      qty;

    setEstimatedWeight(
      Math.round(weight * 10) / 10
    );

    setEstimatedPrice(
      Math.round(price)
    );
  };

  /* ---------------------------------------------------------------------- */
  /* Recalculate price                                                      */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    if (
      mode === '3d-model' &&
      volume !== null
    ) {
      calculatePrice(
        volume,
        material,
        infill,
        quantity
      );
    }
  }, [
    mode,
    volume,
    material,
    infill,
    quantity
  ]);

  /* ---------------------------------------------------------------------- */
  /* Reset file state                                                       */
  /* ---------------------------------------------------------------------- */

  const resetFileState = () => {
    setFile(null);
    setVolume(null);
    setEstimatedWeight(null);
    setEstimatedPrice(null);
    setUploadProgress(null);
  };

  /* ---------------------------------------------------------------------- */
  /* Mode change                                                            */
  /* ---------------------------------------------------------------------- */

  const handleModeChange = (
    newMode: ServiceMode
  ) => {
    setMode(newMode);
    resetFileState();
  };

  /* ---------------------------------------------------------------------- */
  /* File selection                                                         */
  /* ---------------------------------------------------------------------- */

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const selectedFile =
      e.target.files?.[0];

    if (!selectedFile) {
      return;
    }

    const is3DModel =
      mode === '3d-model';

    const allowedExtensions =
      is3DModel
        ? ['.stl', '.obj', '.3mf']
        : ['.jpg', '.jpeg', '.png', '.webp'];

    const isValid =
      allowedExtensions.some(
        (extension) =>
          selectedFile.name
            .toLowerCase()
            .endsWith(extension)
      );

    if (!isValid) {
      alert(
        is3DModel
          ? 'Please upload a valid 3D file: STL, OBJ or 3MF.'
          : 'Please upload a valid image: JPG, PNG or WEBP.'
      );

      e.target.value = '';
      return;
    }

    const maxSize =
      100 * 1024 * 1024;

    if (
      selectedFile.size >
      maxSize
    ) {
      alert(
        'File is too large. Maximum size is 50MB.'
      );

      e.target.value = '';
      return;
    }

    setFile(selectedFile);

    if (!is3DModel) {
      return;
    }

    setIsCalculating(true);

    setVolume(null);
    setEstimatedWeight(null);
    setEstimatedPrice(null);

    try {
      if (
        selectedFile.name
          .toLowerCase()
          .endsWith('.stl')
      ) {
        const calculatedVolume =
          await calculateSTLVolume(
            selectedFile
          );

        setVolume(
          calculatedVolume
        );

        calculatePrice(
          calculatedVolume,
          material,
          infill,
          quantity
        );
      } else {
        /*
         * OBJ and 3MF are accepted for
         * quote submission.
         *
         * Automatic calculation currently
         * supports STL.
         */
        setVolume(null);
        setEstimatedWeight(null);
        setEstimatedPrice(null);
      }
    } catch (error) {
      console.error(
        'Volume calculation failed:',
        error
      );

      alert(
        'Could not calculate the model volume. You can still request a quote.'
      );
    } finally {
      setIsCalculating(false);
    }
  };

  /* ---------------------------------------------------------------------- */
  /* Authentication                                                         */
  /* ---------------------------------------------------------------------- */

  if (authLoading) {
    return (
      <div className="
        max-w-lg
        mx-auto
        px-4
        py-24
        text-center
      ">
        <Loader2 className="
          w-8
          h-8
          animate-spin
          text-brand-500
          mx-auto
        " />

        <p className="
          text-sm
          text-charcoal-light
          mt-4
        ">
          Checking your account...
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="
        max-w-lg
        mx-auto
        px-4
        py-24
      ">
        <Card className="
          p-8
          text-center
          border-none
          shadow-sm
        ">

          <div className="
            w-16
            h-16
            rounded-full
            bg-brand-50
            flex
            items-center
            justify-center
            mx-auto
            mb-6
          ">
            <Lock className="
              w-7
              h-7
              text-brand-500
            " />
          </div>

          <h1 className="
            text-2xl
            font-serif
            font-bold
            text-charcoal
            mb-3
          ">
            Login Required
          </h1>

          <p className="
            text-charcoal-light
            text-sm
            leading-relaxed
            mb-7
          ">
            Please login or create an account
            before submitting a custom
            printing request.
          </p>

          <div className="
            flex
            flex-col
            sm:flex-row
            gap-3
            justify-center
          ">

            <Button
              onClick={() =>
                navigate(
                  `/login?redirect=${encodeURIComponent(
                    window.location.pathname +
                    window.location.search
                  )}`
                )
              }
            >
              Login to Continue
            </Button>

            <Link to="/register">
              <Button
                variant="outline"
                className="w-full"
              >
                Create Account
              </Button>
            </Link>

          </div>

        </Card>
      </div>
    );
  }

  /* ---------------------------------------------------------------------- */
  /* Profile loading                                                        */
  /* ---------------------------------------------------------------------- */

  if (profileLoading) {
    return (
      <div className="
        max-w-lg
        mx-auto
        px-4
        py-24
        text-center
      ">
        <Loader2 className="
          w-8
          h-8
          animate-spin
          text-brand-500
          mx-auto
        " />

        <p className="
          text-sm
          text-charcoal-light
          mt-4
        ">
          Loading your information...
        </p>
      </div>
    );
  }

  /* ---------------------------------------------------------------------- */
  /* Success screen                                                         */
  /* ---------------------------------------------------------------------- */

  if (isSuccess) {
    return (
      <div className="
        max-w-lg
        mx-auto
        px-4
        py-24
      ">
        <Card className="
          p-8
          text-center
          border-none
          shadow-sm
        ">

          <div className="
            w-16
            h-16
            rounded-full
            bg-green-50
            flex
            items-center
            justify-center
            mx-auto
            mb-6
          ">
            <CheckCircle className="
              w-8
              h-8
              text-green-600
            " />
          </div>

          <h1 className="
            text-2xl
            font-serif
            font-bold
            text-charcoal
            mb-3
          ">
            Request Submitted
          </h1>

          <p className="
            text-charcoal-light
            text-sm
            leading-relaxed
            mb-8
          ">
            {successMessage}
          </p>

          <div className="
            flex
            flex-col
            sm:flex-row
            gap-3
            justify-center
          ">

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
            >
              Submit Another Request
            </Button>

            <Button
              onClick={() =>
                navigate('/account')
              }
            >
              View Account
            </Button>

          </div>

        </Card>
      </div>
    );
  }

  /* ---------------------------------------------------------------------- */
  /* Customer information                                                  */
  /* ---------------------------------------------------------------------- */

  const customerName =
    profile?.name ||
    user.displayName ||
    '';

  const customerEmail =
    profile?.email ||
    user.email ||
    '';

  const customerPhone =
    profile?.phone ||
    '';

  /* ---------------------------------------------------------------------- */
  /* Upload helper                                                          */
  /* ---------------------------------------------------------------------- */

  const uploadRequestFile =
    async () => {
      if (!file) {
        return undefined;
      }

      setUploadProgress(0);

      const fileUrl =
        await upload3DFile(
          file,
          user.uid,
          (progress) =>
            setUploadProgress(
              progress
            )
        );

      return fileUrl;
    };

  /* ---------------------------------------------------------------------- */
  /* Submit quote                                                           */
  /* ---------------------------------------------------------------------- */

  const submitRequest = async () => {
    if (!user) {
      return;
    }

    setIsSubmitting(true);

    try {
      let fileUrl:
        | string
        | undefined;

      if (file) {
        fileUrl =
          await uploadRequestFile();
      }

      const requestType =
        mode as QuoteRequestType;

      const dimensions = {
        length: length
          ? Number(length)
          : undefined,

        width: width
          ? Number(width)
          : undefined,

        height: height
          ? Number(height)
          : undefined,

        unit: 'mm' as const
      };

      await submitQuote.mutateAsync({
        requestType,

        customerName,
        customerEmail,
        customerPhone,

        productId:
          selectedProduct?.id,

        productName:
          selectedProduct?.name,

        variantLabel:
          selectedVariant?.label,

        fileName:
          file?.name,

        fileUrl,

        material,

        color,

        infill:
          mode === '3d-model'
            ? infill
            : undefined,

        layerHeight:
          mode === '3d-model'
            ? layerHeight
            : undefined,

        quantity,

        volume:
          mode === '3d-model'
            ? volume ?? undefined
            : undefined,

        estimatedWeight:
          mode === '3d-model'
            ? estimatedWeight ??
              undefined
            : undefined,

        estimatedPrice:
          mode === '3d-model'
            ? estimatedPrice ??
              undefined
            : undefined,

        dimensions:
          mode !== '3d-model'
            ? dimensions
            : undefined,

        description:
          description ||
          undefined,

        notes:
          notes ||
          undefined,

        adminPrice:
          undefined,

        adminNotes:
          undefined
      });

      setSuccessMessage(
        mode === '3d-model'
          ? 'Your 3D model and printing specifications have been submitted. The displayed amount is only an estimate; our team will review the model before confirming the final price.'
          : 'Your request has been received. Our team will review your requirements and prepare a custom quotation.'
      );

      setIsSuccess(true);
    } catch (error) {
      console.error(
        'Failed to submit custom request:',
        error
      );

      alert(
        'Failed to submit your request. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
      setUploadProgress(null);
    }
  };

  /* ---------------------------------------------------------------------- */
  /* Add 3D model to cart                                                  */
  /* ---------------------------------------------------------------------- */

  const handleAddToCart = async () => {
    if (!user) {
      return;
    }

    if (!file) {
      alert(
        'Please upload a 3D model first.'
      );

      return;
    }

    if (
      estimatedPrice === null
    ) {
      alert(
        'An estimated price could not be calculated for this model. Please request a custom quote instead.'
      );

      return;
    }

    setIsSubmitting(true);

    try {
      const fileUrl =
        await uploadRequestFile();

      const customPrint: CustomPrintData =
        {
          fileName: file.name,

          fileUrl,

          material,

          color,

          infill,

          layerHeight,

          volume:
            volume ?? undefined,

          estimatedWeight:
            estimatedWeight ??
            undefined,

          customPrice:
            estimatedPrice
        };

      const customProduct: Product =
        {
          id: `custom-print-${Date.now()}`,

          name:
            selectedProduct?.name ||
            'Custom 3D Print',

          description:
            'Custom 3D printed item',

          price:
            estimatedPrice,

          category:
            'Custom Printing',

          image:
            selectedProduct?.image ||
            '',

          images:
            selectedProduct?.images ||
            [],

          stock:
            999,

          material:
            material,

          isCustomizable:
            true,

          active:
            true,

          featured:
            false,

          hasVariants:
            false,

          variants:
            []
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
      console.error(
        'Failed to add custom print to cart:',
        error
      );

      alert(
        'Could not add the custom print to your cart. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
      setUploadProgress(null);
    }
  };

  /* ---------------------------------------------------------------------- */
  /* Main UI                                                                */
  /* ---------------------------------------------------------------------- */

  return (
    <div className="
      max-w-6xl
      mx-auto
      px-4
      sm:px-6
      lg:px-8
      py-12
    ">

      {/* Header */}
      <div className="
        text-center
        mb-10
      ">

        <h1 className="
          text-4xl
          md:text-5xl
          font-serif
          font-bold
          text-charcoal
          mb-4
        ">
          Custom Printing
        </h1>

        <p className="
          text-charcoal-light
          max-w-2xl
          mx-auto
          leading-relaxed
        ">
          Have a 3D model, a reference image,
          or just an idea? We'll help turn it
          into a physical product.
        </p>

      </div>

      {/* Product context */}
      {selectedProduct && (
        <Card className="
          mb-8
          p-5
          border-none
          shadow-sm
          bg-brand-50/60
        ">

          <p className="
            text-xs
            uppercase
            tracking-wider
            text-brand-600
            font-medium
            mb-1
          ">
            Customizing Product
          </p>

          <div className="
            flex
            flex-col
            sm:flex-row
            sm:items-center
            sm:justify-between
            gap-2
          ">

            <h2 className="
              text-lg
              font-serif
              font-semibold
              text-charcoal
            ">
              {selectedProduct.name}
            </h2>

            {selectedVariant && (
              <span className="
                text-sm
                text-charcoal-light
              ">
                {selectedVariant.label}
              </span>
            )}

          </div>

        </Card>
      )}

      {/* Mode selector */}
      <div className="
        grid
        grid-cols-1
        md:grid-cols-3
        gap-4
        mb-8
      ">

        <ModeCard
          active={
            mode === '3d-model'
          }
          icon={
            <Box className="w-6 h-6" />
          }
          title="I have a 3D model"
          description="STL, OBJ or 3MF"
          onClick={() =>
            handleModeChange(
              '3d-model'
            )
          }
        />

        <ModeCard
          active={
            mode === 'image'
          }
          icon={
            <ImageIcon className="w-6 h-6" />
          }
          title="I have a reference"
          description="Image or drawing"
          onClick={() =>
            handleModeChange(
              'image'
            )
          }
        />

        <ModeCard
          active={
            mode === 'idea'
          }
          icon={
            <Lightbulb className="w-6 h-6" />
          }
          title="I only have an idea"
          description="We'll help you figure it out"
          onClick={() =>
            handleModeChange(
              'idea'
            )
          }
        />

      </div>

      {/* Main content */}
      <div className="
        grid
        grid-cols-1
        lg:grid-cols-5
        gap-8
      ">

        {/* Form */}
        <div className="
          lg:col-span-3
        ">

          <Card className="
            p-6
            sm:p-8
            border-none
            shadow-sm
          ">

            <div className="
              mb-6
            ">
              <h2 className="
                text-xl
                font-serif
                font-semibold
                text-charcoal
              ">
                {mode === '3d-model'
                  ? 'Upload Your 3D Model'
                  : mode === 'image'
                    ? 'Share Your Reference'
                    : 'Tell Us About Your Idea'}
              </h2>

              <p className="
                text-sm
                text-charcoal-light
                mt-1
              ">
                {mode === '3d-model'
                  ? "We'll analyse the model and calculate an estimated printing cost."
                  : mode === 'image'
                    ? 'Upload a reference image and provide the dimensions and requirements.'
                    : 'Describe what you want and our team will help turn the idea into a printable model.'}
              </p>
            </div>

            {/* File upload */}
            {mode !== 'idea' && (
              <div className="mb-6">

                <label
                  htmlFor="custom-file"
                  className="
                    block
                    text-sm
                    font-medium
                    text-charcoal
                    mb-2
                  "
                >
                  {mode === '3d-model'
                    ? '3D Model *'
                    : 'Reference Image *'}
                </label>

                <input
                  id="custom-file"
                  type="file"
                  accept={
                    mode === '3d-model'
                      ? '.stl,.obj,.3mf'
                      : '.jpg,.jpeg,.png,.webp'
                  }
                  onChange={
                    handleFileChange
                  }
                  className="hidden"
                />

                <label
                  htmlFor="custom-file"
                  className={`
                    block
                    border-2
                    border-dashed
                    rounded-2xl
                    p-8
                    text-center
                    cursor-pointer
                    transition-all
                    ${
                      file
                        ? 'border-brand-400 bg-brand-50'
                        : 'border-brand-200 hover:border-brand-400 hover:bg-brand-50/40'
                    }
                  `}
                >

                  {file ? (
                    <div className="
                      flex
                      flex-col
                      items-center
                    ">

                      {mode ===
                      '3d-model' ? (
                        <FileBox className="
                          w-10
                          h-10
                          text-brand-500
                          mb-3
                        " />
                      ) : (
                        <ImageIcon className="
                          w-10
                          h-10
                          text-brand-500
                          mb-3
                        " />
                      )}

                      <p className="
                        font-medium
                        text-charcoal
                        break-all
                      ">
                        {file.name}
                      </p>

                      <p className="
                        text-xs
                        text-charcoal-lighter
                        mt-1
                      ">
                        Click to replace
                      </p>

                    </div>
                  ) : (
                    <div className="
                      flex
                      flex-col
                      items-center
                    ">

                      <Upload className="
                        w-10
                        h-10
                        text-charcoal-lighter
                        mb-3
                      " />

                      <p className="
                        font-medium
                        text-charcoal
                      ">
                        {mode ===
                        '3d-model'
                          ? 'Upload STL, OBJ or 3MF'
                          : 'Upload JPG, PNG or WEBP'}
                      </p>

                      <p className="
                        text-xs
                        text-charcoal-lighter
                        mt-1
                      ">
                        Maximum file size: 100MB
                      </p>

                    </div>
                  )}

                </label>

              </div>
            )}

            {/* 3D specifications */}
            {mode ===
              '3d-model' && (
              <div className="
                space-y-5
              ">

                <div className="
                  grid
                  grid-cols-1
                  sm:grid-cols-2
                  gap-5
                ">

                  <Field
                    label="Material"
                    required
                  >
                    <Select
                      value={material}
                      onChange={(value) =>
                        setMaterial(
                          value as MaterialType
                        )
                      }
                      options={
                        materialOptions
                      }
                      className="w-full"
                    />
                  </Field>

                  {/* ====================================================== */}
                  {/* NATIVE COLOR PICKER                                   */}
                  {/* ====================================================== */}

                  <Field
                    label="Color"
                    required
                  >
                    <div className="
                      flex
                      items-center
                      gap-4
                      h-11
                    ">

                      <input
                        type="color"
                        value={color}
                        onChange={(e) =>
                          setColor(
                            e.target.value
                          )
                        }
                        className="
                          w-12
                          h-11
                          rounded-lg
                          border
                          border-brand-200
                          cursor-pointer
                          bg-white
                          p-1
                        "
                        aria-label="Choose print color"
                      />

                      <div className="
                        min-w-0
                      ">

                        <p className="
                          text-sm
                          font-medium
                          text-charcoal
                        ">
                          {color.toUpperCase()}
                        </p>

                        <p className="
                          text-xs
                          text-charcoal-lighter
                          truncate
                        ">
                          Choose any preferred color
                        </p>

                      </div>

                    </div>
                  </Field>

                  <Field
                    label={`Infill Density: ${infill}%`}
                  >
                    <input
                      type="range"
                      min="10"
                      max="100"
                      step="5"
                      value={infill}
                      onChange={(e) =>
                        setInfill(
                          Number(
                            e.target.value
                          )
                        )
                      }
                      className="
                        w-full
                        accent-brand-500
                      "
                    />
                  </Field>

                  <Field
                    label="Layer Height"
                  >
                    <Select
                      value={String(
                        layerHeight
                      )}
                      onChange={(value) =>
                        setLayerHeight(
                          Number(value)
                        )
                      }
                      options={
                        layerHeightOptions
                      }
                      className="w-full"
                    />
                  </Field>

                </div>

                <Field
                  label="Quantity"
                  required
                >
                  <Input
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(e) =>
                      setQuantity(
                        Math.max(
                          1,
                          Number(
                            e.target.value
                          ) || 1
                        )
                      )
                    }
                  />
                </Field>

              </div>
            )}

            {/* Image / Idea */}
            {mode !==
              '3d-model' && (
              <div className="
                space-y-5
              ">

                <Textarea
                  label={
                    mode === 'image'
                      ? 'What would you like us to make?'
                      : 'Describe your idea'
                  }
                  value={
                    description
                  }
                  onChange={(e) =>
                    setDescription(
                      e.target.value
                    )
                  }
                  placeholder={
                    mode === 'image'
                      ? 'Example: I want this object recreated as a 10 cm desk model.'
                      : 'Tell us what you want to create, how it should look, and how you plan to use it.'
                  }
                  className="
                    min-h-[130px]
                  "
                  required
                />

                <div>
                  <p className="
                    text-sm
                    font-medium
                    text-charcoal
                    mb-3
                  ">
                    Approximate Dimensions
                  </p>

                  <div className="
                    grid
                    grid-cols-3
                    gap-3
                  ">

                    <Input
                      label="Length"
                      type="number"
                      min={0}
                      placeholder="mm"
                      value={length}
                      onChange={(e) =>
                        setLength(
                          e.target.value
                        )
                      }
                    />

                    <Input
                      label="Width"
                      type="number"
                      min={0}
                      placeholder="mm"
                      value={width}
                      onChange={(e) =>
                        setWidth(
                          e.target.value
                        )
                      }
                    />

                    <Input
                      label="Height"
                      type="number"
                      min={0}
                      placeholder="mm"
                      value={height}
                      onChange={(e) =>
                        setHeight(
                          e.target.value
                        )
                      }
                    />

                  </div>

                  <p className="
                    text-xs
                    text-charcoal-lighter
                    mt-2
                  ">
                    Approximate dimensions are
                    enough. Our team can confirm
                    them during review.
                  </p>
                </div>

                <div className="
                  grid
                  grid-cols-1
                  sm:grid-cols-2
                  gap-5
                ">

                  <Field
                    label="Material Preference"
                  >
                    <Select
                      value={material}
                      onChange={(value) =>
                        setMaterial(
                          value as MaterialType
                        )
                      }
                      options={
                        materialOptions
                      }
                      className="w-full"
                    />
                  </Field>

                  {/* Native color picker for
                      image / idea mode */}
                  <Field
                    label="Preferred Color"
                  >
                    <div className="
                      flex
                      items-center
                      gap-4
                      h-11
                    ">

                      <input
                        type="color"
                        value={color}
                        onChange={(e) =>
                          setColor(
                            e.target.value
                          )
                        }
                        className="
                          w-12
                          h-11
                          rounded-lg
                          border
                          border-brand-200
                          cursor-pointer
                          bg-white
                          p-1
                        "
                        aria-label="Choose preferred color"
                      />

                      <div className="
                        min-w-0
                      ">

                        <p className="
                          text-sm
                          font-medium
                          text-charcoal
                        ">
                          {color.toUpperCase()}
                        </p>

                        <p className="
                          text-xs
                          text-charcoal-lighter
                          truncate
                        ">
                          Choose any preferred color
                        </p>

                      </div>

                    </div>
                  </Field>

                </div>

                <Field
                  label="Quantity"
                >
                  <Input
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(e) =>
                      setQuantity(
                        Math.max(
                          1,
                          Number(
                            e.target.value
                          ) || 1
                        )
                      )
                    }
                  />
                </Field>

              </div>
            )}

            {/* Customer details */}
            <div className="
              border-t
              border-brand-100
              mt-7
              pt-7
              space-y-5
            ">

              <div>
                <h3 className="
                  font-serif
                  font-semibold
                  text-lg
                  text-charcoal
                ">
                  Your Details
                </h3>

                <p className="
                  text-xs
                  text-charcoal-lighter
                  mt-1
                ">
                  Your account information has
                  been filled automatically.
                </p>
              </div>

              <div className="
                grid
                grid-cols-1
                sm:grid-cols-2
                gap-5
              ">

                <Input
                  name="name"
                  label="Full Name"
                  defaultValue={
                    customerName
                  }
                  required
                />

                <Input
                  name="phone"
                  label="Phone Number"
                  type="tel"
                  defaultValue={
                    customerPhone
                  }
                  required
                />

              </div>

              <Input
                name="email"
                label="Email Address"
                type="email"
                defaultValue={
                  customerEmail
                }
                required
              />

              <Textarea
                label="Additional Notes"
                value={notes}
                onChange={(e) =>
                  setNotes(
                    e.target.value
                  )
                }
                placeholder="Any special requirements, finishing instructions or other details..."
              />

            </div>

            {/* Actions */}
            <div className="
              mt-7
              flex
              flex-col
              sm:flex-row
              gap-3
            ">

              {mode ===
                '3d-model' && (
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={
                    handleAddToCart
                  }
                  disabled={
                    !file ||
                    !estimatedPrice ||
                    isCalculating ||
                    isSubmitting
                  }
                >
                  <ShoppingCart className="
                    w-4
                    h-4
                    mr-2
                  " />

                  {isSubmitting
                    ? uploadProgress !==
                      null
                      ? `Uploading ${uploadProgress}%`
                      : 'Adding...'
                    : 'Add to Cart'}
                </Button>
              )}

              <Button
                type="button"
                className="flex-1"
                onClick={
                  submitRequest
                }
                disabled={
                  isSubmitting ||
                  isCalculating ||
                  (mode !==
                    'idea' &&
                    !file)
                }
              >
                {isSubmitting
                  ? uploadProgress !==
                    null
                    ? `Uploading ${uploadProgress}%`
                    : 'Submitting...'
                  : mode ===
                      '3d-model'
                    ? 'Request Custom Quote'
                    : 'Request Quote'}
              </Button>

            </div>

          </Card>

        </div>

        {/* Estimate */}
        <div className="
          lg:col-span-2
        ">

          {mode ===
          '3d-model' ? (
            <Card className="
              p-6
              border-none
              shadow-sm
              sticky
              top-28
            ">

              <div className="
                flex
                items-center
                gap-2
                mb-6
              ">

                <Calculator className="
                  w-5
                  h-5
                  text-brand-500
                " />

                <h2 className="
                  font-serif
                  font-semibold
                  text-lg
                  text-charcoal
                ">
                  Price Estimate
                </h2>

              </div>

              {isCalculating ? (
                <div className="
                  flex
                  flex-col
                  items-center
                  py-12
                ">

                  <Loader2 className="
                    w-8
                    h-8
                    animate-spin
                    text-brand-500
                    mb-4
                  " />

                  <p className="
                    text-sm
                    text-charcoal-light
                  ">
                    Analysing your model...
                  </p>

                </div>
              ) : estimatedPrice !==
                null ? (
                <div className="
                  space-y-5
                ">

                  <div className="
                    bg-brand-50
                    rounded-2xl
                    p-5
                    text-center
                  ">

                    <p className="
                      text-sm
                      text-charcoal-light
                      mb-1
                    ">
                        Estimated Printing Cost
                      </p>

                      <p className="
                        text-4xl
                        font-bold
                        text-brand-600
                      ">
                        ₹
                        {estimatedPrice.toLocaleString(
                          'en-IN'
                        )}
                      </p>

                    </div>

                    <div className="
                      space-y-3
                      text-sm
                    ">

                      <EstimateRow
                        label="Material"
                        value={material}
                      />

                      <EstimateRow
                        label="Color"
                        value={color.toUpperCase()}
                      />

                      <EstimateRow
                        label="Volume"
                        value={
                          volume !==
                          null
                            ? `${volume.toFixed(
                                2
                              )} cm³`
                            : '—'
                        }
                      />

                      <EstimateRow
                        label="Estimated Weight"
                        value={
                          estimatedWeight !==
                          null
                            ? `${estimatedWeight} g`
                            : '—'
                        }
                      />

                      <EstimateRow
                        label="Infill"
                        value={`${infill}%`}
                      />

                      <EstimateRow
                        label="Layer Height"
                        value={`${layerHeight} mm`}
                      />

                      <EstimateRow
                        label="Quantity"
                        value={String(
                          quantity
                        )}
                      />

                    </div>

                  </div>

                    
                ) : file &&
  mode === '3d-model' &&
  /\.(obj|3mf)$/i.test(file.name) ? (
  <div className="
    text-center
    py-10
  ">
    <div className="
      w-14
      h-14
      rounded-full
      bg-brand-50
      flex
      items-center
      justify-center
      mx-auto
      mb-5
    ">
      <FileBox className="
        w-7
        h-7
        text-brand-500
      " />
    </div>

    <h3 className="
      font-serif
      font-semibold
      text-lg
      text-charcoal
      mb-3
    ">
      Manual Review Required
    </h3>

    <p className="
      text-sm
      leading-relaxed
      text-charcoal-light
      max-w-sm
      mx-auto
    ">
      Your {file.name.toLowerCase().endsWith('.3mf')
        ? '3MF'
        : 'OBJ'} file has been uploaded successfully.
      Our team will review the model and prepare
      your printing quotation.
    </p>

    <div className="
      mt-6
      rounded-xl
      bg-brand-50
      p-4
      text-left
    ">
      <p className="
        text-xs
        font-medium
        text-charcoal
        mb-2
      ">
        What happens next?
      </p>

      <ul className="
        text-xs
        text-charcoal-light
        space-y-1
      ">
        <li>• We inspect the uploaded model</li>
        <li>• We determine material and print requirements</li>
        <li>• Our team provides the final quotation</li>
      </ul>
    </div>
  </div>
) : (
  <div className="
    text-center
    py-12
    text-charcoal-light
  ">
    <FileBox className="
      w-10
      h-10
      mx-auto
      mb-4
      text-charcoal-lighter
    " />

    <p className="
      text-sm
      leading-relaxed
    ">
      Upload an STL file to
      calculate an estimated
      printing price.
    </p>

    <p className="
      text-xs
      text-charcoal-lighter
      mt-2
    ">
      OBJ and 3MF files can still
      be submitted for manual review.
    </p>
  </div>
)}

            </Card>
          ) : (
            <Card className="
              p-6
              border-none
              shadow-sm
              sticky
              top-28
            ">

              <div className="
                w-12
                h-12
                rounded-full
                bg-brand-50
                flex
                items-center
                justify-center
                text-brand-500
                mb-5
              ">
                {mode ===
                'image' ? (
                  <ImageIcon className="w-6 h-6" />
                ) : (
                  <Lightbulb className="w-6 h-6" />
                )}
              </div>

              <h2 className="
                text-xl
                font-serif
                font-semibold
                text-charcoal
                mb-3
              ">
                {mode === 'image'
                  ? 'Manual Quotation'
                  : "Let's Build It Together"}
              </h2>

              <p className="
                text-sm
                text-charcoal-light
                leading-relaxed
              ">
                {mode === 'image'
                  ? 'An image does not contain enough information to reliably calculate 3D printing cost. Our team will review your reference, dimensions and requirements before preparing a quote.'
                  : 'Tell us what you have in mind. Our team can help with the 3D modelling, material selection and printing requirements.'}
              </p>

              <div className="
                mt-6
                space-y-3
                text-sm
              ">

                <EstimateRow
                  label="Material"
                  value={material}
                />

                <EstimateRow
                  label="Color"
                  value={color.toUpperCase()}
                />

                <EstimateRow
                  label="Quantity"
                  value={String(
                    quantity
                  )}
                />

              </div>

              <div className="
                mt-6
                bg-surface
                rounded-xl
                p-4
              ">

                <p className="
                  text-xs
                  text-charcoal-lighter
                  leading-relaxed
                ">
                  Price will be confirmed by
                  our team after reviewing the
                  request.
                </p>

              </div>

            </Card>
          )}

        </div>

      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Helper components                                                         */
/* -------------------------------------------------------------------------- */

function ModeCard({
  active,
  icon,
  title,
  description,
  onClick
}: {
  active: boolean;
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        text-left
        rounded-2xl
        border
        p-5
        transition-all
        duration-200
        ${
          active
            ? 'border-brand-400 bg-brand-50 shadow-sm'
            : 'border-brand-100 bg-white hover:border-brand-300 hover:bg-brand-50/40'
        }
      `}
    >

      <div className="
        flex
        items-center
        gap-3
      ">

        <div className={`
          w-11
          h-11
          rounded-full
          flex
          items-center
          justify-center
          ${
            active
              ? 'bg-brand-500 text-white'
              : 'bg-brand-50 text-brand-500'
          }
        `}>
          {icon}
        </div>

        <div>

          <p className="
            font-medium
            text-charcoal
          ">
            {title}
          </p>

          <p className="
            text-xs
            text-charcoal-lighter
            mt-0.5
          ">
            {description}
          </p>

        </div>

      </div>

    </button>
  );
}

function Field({
  label,
  required,
  children
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>

      <label className="
        block
        text-sm
        font-medium
        text-charcoal
        mb-2
      ">
        {label}

        {required && (
          <span className="
            text-red-500
            ml-1
          ">
            *
          </span>
        )}
      </label>

      {children}

    </div>
  );
}

function EstimateRow({
  label,
  value
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="
      flex
      justify-between
      gap-4
    ">

      <span className="
        text-charcoal-light
      ">
        {label}
      </span>

      <span className="
        text-charcoal
        font-medium
        text-right
      ">
        {value}
      </span>

    </div>
  );
}