import React, { useEffect, useMemo, useState } from 'react';
import {
  Upload,
  Loader2,
  CheckCircle2Icon,
  FileBox,
  Lock,
  Image as ImageIcon,
  Lightbulb,
  Box,
  ShoppingCart,
  X,
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

import { upload3DFile } from '../../utils/uploadFile';

import {
  CustomPrintData,
  Product,
  useStore,
} from '../../store';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  to?: string;
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
};

function Shell({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`mx-auto w-full max-w-7xl px-5 sm:px-8 ${className}`}>
      {children}
    </div>
  );
}

function Button({
  children,
  to,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  ...props
}: ButtonProps) {
  const className = `inline-flex items-center justify-center border px-4 font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
    size === 'lg' ? 'h-12 text-sm' : size === 'sm' ? 'h-9 text-xs' : 'h-10 text-sm'
  } ${
    variant === 'secondary'
      ? 'border-line-strong bg-white text-ink hover:bg-paper'
      : 'border-ink bg-ink text-paper hover:bg-ink-800'
  }`;

  if (to) {
    return <Link to={to} className={className}>{children}</Link>;
  }

  return (
    <button {...props} className={`${className} ${props.className || ''}`} disabled={disabled || loading}>
      {children}
    </button>
  );
}

function Alert({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
  tone?: 'info' | 'success' | 'warning' | 'error';
}) {
  return (
    <div className="border border-line bg-white p-4 text-sm text-ink-600">
      {title && <p className="font-medium text-ink">{title}</p>}
      <div className={title ? 'mt-1' : ''}>{children}</div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-[13px] font-medium text-ink-800">
      {label}{required && <span className="ml-1 text-clay-600">*</span>}
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

function Input({
  label,
  required,
  className = '',
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  required?: boolean;
}) {
  const input = (
    <input
      {...props}
      required={required}
      className={`h-10 w-full border border-line-strong bg-white px-3 text-sm text-ink outline-none focus:border-clay-500 ${className}`}
    />
  );

  return label ? (
    <label className="block text-[13px] font-medium text-ink-800">
      {label}{required && <span className="ml-1 text-clay-600">*</span>}
      <span className="mt-1.5 block">{input}</span>
    </label>
  ) : input;
}


type ServiceMode =
  | '3d-model'
  | 'image'
  | 'idea';


type MaterialOption = {
  id: MaterialType;
  name: string;
  rate: number;
  density: number;
};


const MAX_FILE_SIZE =
  100 * 1024 * 1024;


const LAYER_HEIGHT_OPTIONS = [
  {
    value: '0.12',
    label: '0.12 mm — High Detail',
  },
  {
    value: '0.16',
    label: '0.16 mm',
  },
  {
    value: '0.2',
    label: '0.20 mm — Standard',
  },
  {
    value: '0.28',
    label: '0.28 mm — Draft',
  },
];


export function CustomService() {
  const navigate = useNavigate();

  const [searchParams] =
    useSearchParams();

  const submitQuote =
    useSubmitQuote();

  const {
    user,
    loading: authLoading,
  } = useAuth();

  const {
    data: profile,
    isLoading: profileLoading,
  } = useUserProfile();

  const addToCart =
    useStore(
      (state) => state.addToCart
    );

  const products =
    useStore(
      (state) => state.products
    );


  /* ---------------------------------------------------------------------- */
  /* Product / Variant                                                      */
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
    useState<ServiceMode>(
      '3d-model'
    );

  const [file, setFile] =
    useState<File | null>(null);

  const [
    isCalculating,
    setIsCalculating,
  ] = useState(false);

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  const [
    isSuccess,
    setIsSuccess,
  ] = useState(false);

  const [
    successMessage,
    setSuccessMessage,
  ] = useState('');

  const [
    uploadProgress,
    setUploadProgress,
  ] = useState<number | null>(null);


  /* ---------------------------------------------------------------------- */
  /* Print settings                                                         */
  /* ---------------------------------------------------------------------- */

  const [material, setMaterial] =
    useState<MaterialType>('PLA');

  const [infoMaterialModal, setInfoMaterialModal] =
    useState<MaterialType | null>(null);

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


  /* ---------------------------------------------------------------------- */
  /* Dimensions                                                             */
  /* ---------------------------------------------------------------------- */

  const [length, setLength] =
    useState('');

  const [width, setWidth] =
    useState('');

  const [height, setHeight] =
    useState('');


  /* ---------------------------------------------------------------------- */
  /* Customer                                                               */
  /* ---------------------------------------------------------------------- */

  const [customerName, setCustomerName] =
    useState('');

  const [customerEmail, setCustomerEmail] =
    useState('');

  const [customerPhone, setCustomerPhone] =
    useState('');


  /* ---------------------------------------------------------------------- */
  /* Calculation                                                            */
  /* ---------------------------------------------------------------------- */

  const [volume, setVolume] =
    useState<number | null>(null);

  const [
    estimatedWeight,
    setEstimatedWeight,
  ] = useState<number | null>(null);

  const [
    estimatedPrice,
    setEstimatedPrice,
  ] = useState<number | null>(null);


  /* ---------------------------------------------------------------------- */
  /* Material options                                                       */
  /* ---------------------------------------------------------------------- */

  const materialOptions =
    useMemo<MaterialOption[]>(
      () =>
        (
          Object.keys(
            MATERIAL_CONFIG
          ) as MaterialType[]
        ).map((id) => ({
          id,
          name: id,
          rate:
            MATERIAL_CONFIG[id]
              .pricePerGram,
          density:
            MATERIAL_CONFIG[id]
              .density,
        })),
      []
    );


  /* ---------------------------------------------------------------------- */
  /* Price calculation                                                      */
  /* ---------------------------------------------------------------------- */

  const calculatePrice = (
    modelVolume: number,
    selectedMaterial: MaterialType,
    selectedInfill: number,
    selectedQuantity: number
  ) => {
    const config =
      MATERIAL_CONFIG[
        selectedMaterial
      ];

    if (!config) {
      return;
    }

    const infillFactor =
      0.3 +
      (selectedInfill / 100) *
        0.7;

    const weight =
      modelVolume *
      config.density *
      infillFactor;

    const price =
      (
        weight *
          config.pricePerGram +
        BASE_FEE
      ) *
      selectedQuantity;

    setEstimatedWeight(
      Math.round(
        weight * 10
      ) / 10
    );

    setEstimatedPrice(
      Math.round(price)
    );
  };


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
    quantity,
  ]);


  /* ---------------------------------------------------------------------- */
  /* Populate customer information                                         */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    if (
      profile?.name ||
      user?.displayName
    ) {
      setCustomerName(
        profile?.name ||
          user?.displayName ||
          ''
      );
    }

    if (
      profile?.email ||
      user?.email
    ) {
      setCustomerEmail(
        profile?.email ||
          user?.email ||
          ''
      );
    }

    if (profile?.phone) {
      setCustomerPhone(
        profile.phone
      );
    }
  }, [
    profile,
    user,
  ]);


  /* ---------------------------------------------------------------------- */
  /* Reset file                                                             */
  /* ---------------------------------------------------------------------- */

  const resetFileState = () => {
    setFile(null);
    setVolume(null);
    setEstimatedWeight(null);
    setEstimatedPrice(null);
    setUploadProgress(null);
  };


  /* ---------------------------------------------------------------------- */
  /* Change service mode                                                    */
  /* ---------------------------------------------------------------------- */

  const handleModeChange = (
    newMode: ServiceMode
  ) => {
    setMode(newMode);

    resetFileState();

    setDescription('');
    setLength('');
    setWidth('');
    setHeight('');
  };


  /* ---------------------------------------------------------------------- */
  /* File upload                                                            */
  /* ---------------------------------------------------------------------- */

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const selectedFile =
      event.target.files?.[0];

    if (!selectedFile) {
      return;
    }

    const is3DModel =
      mode === '3d-model';

    const allowedExtensions =
      is3DModel
        ? [
            '.stl',
            '.obj',
            '.3mf',
          ]
        : [
            '.jpg',
            '.jpeg',
            '.png',
            '.webp',
          ];

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

      event.target.value = '';

      return;
    }

    if (
      selectedFile.size >
      MAX_FILE_SIZE
    ) {
      alert(
        'File is too large. Maximum size is 100MB.'
      );

      event.target.value = '';

      return;
    }

    setFile(selectedFile);

    setEstimatedPrice(null);
    setEstimatedWeight(null);
    setVolume(null);

    /*
     * Only STL is automatically analysed.
     * OBJ and 3MF go through manual review.
     */
    if (
      !is3DModel ||
      !selectedFile.name
        .toLowerCase()
        .endsWith('.stl')
    ) {
      return;
    }

    setIsCalculating(true);

    try {
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
  /* Upload file to Firebase                                                */
  /* ---------------------------------------------------------------------- */

  const uploadRequestFile =
    async () => {
      if (!file || !user) {
        return undefined;
      }

      setUploadProgress(0);

      return upload3DFile(
        file,
        user.uid,
        (progress) =>
          setUploadProgress(
            progress
          )
      );
    };


  /* ---------------------------------------------------------------------- */
  /* Validation                                                             */
  /* ---------------------------------------------------------------------- */

  const validateRequest =
    () => {
      if (
        mode !== 'idea' &&
        !file
      ) {
        alert(
          'Please upload a file before requesting a quote.'
        );

        return false;
      }

      if (
        mode !== '3d-model' &&
        !description.trim()
      ) {
        alert(
          'Please describe what you want us to make.'
        );

        return false;
      }

      if (
        !customerName.trim()
      ) {
        alert(
          'Please enter your name.'
        );

        return false;
      }

      if (
        !customerEmail.trim()
      ) {
        alert(
          'Please enter your email address.'
        );

        return false;
      }

      if (
        !customerPhone.trim()
      ) {
        alert(
          'Please enter your phone number.'
        );

        return false;
      }

      if (
        quantity < 1
      ) {
        alert(
          'Quantity must be at least 1.'
        );

        return false;
      }

      return true;
    };


  /* ---------------------------------------------------------------------- */
  /* Submit quote                                                           */
  /* ---------------------------------------------------------------------- */

  const submitRequest =
    async () => {
      if (!user) {
        return;
      }

      if (
        !validateRequest()
      ) {
        return;
      }

      setIsSubmitting(true);

      try {
        const fileUrl =
          file
            ? await uploadRequestFile()
            : undefined;

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

          unit: 'mm' as const,
        };

        await submitQuote.mutateAsync(
          {
            requestType:
              mode as QuoteRequestType,

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
                ? volume ??
                  undefined
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
              undefined,
          }
        );

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
  /* Add custom print to cart                                               */
  /* ---------------------------------------------------------------------- */

  const handleAddToCart =
    async () => {
      if (
        !user ||
        !file
      ) {
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

        const customPrint:
          CustomPrintData = {
            fileName:
              file.name,

            fileUrl,

            material,

            color,

            infill,

            layerHeight,

            volume:
              volume ??
              undefined,

            estimatedWeight:
              estimatedWeight ??
              undefined,

            customPrice:
              estimatedPrice,
          };

        const customProduct:
          Product = {
            id:
              `custom-print-${Date.now()}`,

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

            stock: 999,

            material,

            isCustomizable:
              true,

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
  /* Loading                                                                */
  /* ---------------------------------------------------------------------- */

  if (authLoading) {
    return (
      <LoadingState
        text="Checking your account..."
      />
    );
  }


  /* ---------------------------------------------------------------------- */
  /* Authentication required                                               */
  /* ---------------------------------------------------------------------- */

  if (!user) {
    return (
      <Shell className="py-20">
        <div className="mx-auto max-w-md text-center">

          <div className="mx-auto flex h-14 w-14 items-center justify-center border border-line bg-white">
            <Lock className="h-6 w-6 text-clay-600" />
          </div>

          <h1 className="mt-5 font-display text-[26px] font-semibold text-ink">
            Login required
          </h1>

          <p className="mt-2 text-[14px] leading-relaxed text-ink-600">
            Sign in before submitting a custom printing request.
          </p>

          <div className="mt-6 flex justify-center gap-2">

            <Button
              to={`/login?redirect=${encodeURIComponent(
                window.location.pathname +
                  window.location.search
              )}`}
            >
              Sign in
            </Button>

            <Button
              to="/register"
              variant="secondary"
            >
              Create account
            </Button>

          </div>
        </div>
      </Shell>
    );
  }


  /* ---------------------------------------------------------------------- */
  /* Profile loading                                                        */
  /* ---------------------------------------------------------------------- */

  if (profileLoading) {
    return (
      <LoadingState
        text="Loading your information..."
      />
    );
  }


  /* ---------------------------------------------------------------------- */
  /* Success                                                                */
  /* ---------------------------------------------------------------------- */

  if (isSuccess) {
    return (
      <Shell className="py-20">

        <div className="mx-auto max-w-lg border border-line-strong bg-white p-7 text-center">

          <CheckCircle2Icon className="mx-auto h-9 w-9 text-moss" />

          <h1 className="mt-4 font-display text-[25px] font-semibold text-ink">
            Request submitted
          </h1>

          <p className="mt-2 text-[14px] leading-relaxed text-ink-600">
            {successMessage}
          </p>

          <div className="mt-7 flex justify-center gap-2">

            <Button
              variant="secondary"
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
              Submit another request
            </Button>

            <Button to="/account">
              View account
            </Button>

          </div>
        </div>

      </Shell>
    );
  }


  /* ---------------------------------------------------------------------- */
  /* Manual review                                                          */
  /* ---------------------------------------------------------------------- */

  const hasManualFile =
    !!file &&
    mode === '3d-model' &&
    /\.(obj|3mf)$/i.test(
      file.name
    );


  /* ---------------------------------------------------------------------- */
  /* Page                                                                   */
  /* ---------------------------------------------------------------------- */

  return (
    <>
      <section className="border-b border-line bg-white">

        <Shell className="py-10">

          <div className="grid items-end gap-8 lg:grid-cols-12">

            <div className="lg:col-span-7">

              <p className="label-tech">
                Custom 3D printing
              </p>

              <h1 className="mt-3 font-display text-[32px] font-semibold leading-[1.1] tracking-[-0.03em] text-ink sm:text-[38px]">
                Send the file. We will tell you what it costs to make.
              </h1>

              <p className="mt-4 max-w-xl text-[15.5px] leading-relaxed text-ink-600">
                Upload a model, choose how it should be printed and see an estimate straight away. A production engineer reviews every job before it is confirmed.
              </p>

            </div>

            <dl className="grid grid-cols-3 gap-5 lg:col-span-5">

              {[
                [
                  'Build volume',
                  '300 × 300 × 350 mm',
                ],
                [
                  'Quote turnaround',
                  '4 working hours',
                ],
                [
                  'File formats',
                  'STL · OBJ · 3MF',
                ],
              ].map(
                ([key, value]) => (
                  <div key={key}>
                    <dt className="font-mono text-2xs uppercase tracking-[0.1em] text-ink-500">
                      {key}
                    </dt>

                    <dd className="mt-1 text-[14px] font-medium text-ink">
                      {value}
                    </dd>
                  </div>
                )
              )}

            </dl>

          </div>

        </Shell>

      </section>


      <Shell className="py-10">

        {selectedProduct && (
          <div className="mb-8 border border-line bg-white p-4">

            <p className="label-tech">
              Customising product
            </p>

            <div className="mt-1 flex flex-wrap items-center justify-between gap-2">

              <h2 className="font-display text-[18px] font-semibold text-ink">
                {selectedProduct.name}
              </h2>

              {selectedVariant && (
                <span className="font-mono text-xs text-ink-500">
                  {selectedVariant.label}
                </span>
              )}

            </div>
          </div>
        )}


        <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">

          <div className="lg:col-span-7">

            {/* STEP 01 */}

            <Step
              n="01"
              title="What are you starting with?"
            >

              <div className="grid gap-2.5 sm:grid-cols-3">

                <ModeButton
                  active={
                    mode === '3d-model'
                  }
                  icon={
                    <Box className="h-5 w-5" />
                  }
                  title="3D model"
                  description="STL, OBJ or 3MF"
                  onClick={() =>
                    handleModeChange(
                      '3d-model'
                    )
                  }
                />

                <ModeButton
                  active={
                    mode === 'image'
                  }
                  icon={
                    <ImageIcon className="h-5 w-5" />
                  }
                  title="Reference image"
                  description="Image or drawing"
                  onClick={() =>
                    handleModeChange(
                      'image'
                    )
                  }
                />

                <ModeButton
                  active={
                    mode === 'idea'
                  }
                  icon={
                    <Lightbulb className="h-5 w-5" />
                  }
                  title="Just an idea"
                  description="We help model it"
                  onClick={() =>
                    handleModeChange(
                      'idea'
                    )
                  }
                />

              </div>

            </Step>


            {/* STEP 02 */}

            <Step
              n="02"
              title={
                mode === '3d-model'
                  ? 'Upload your model'
                  : mode === 'image'
                  ? 'Upload your reference'
                  : 'Describe your idea'
              }
            >

              {mode !== 'idea' && (
                <FileUpload
                  file={file}
                  mode={mode}
                  onChange={
                    handleFileChange
                  }
                />
              )}

              {mode !== '3d-model' && (
                <label className="mt-5 block text-[13px] font-medium text-ink-800">

                  {mode === 'image'
                    ? 'What would you like us to make?'
                    : 'Describe your idea'}

                  <textarea
                    value={description}
                    onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setDescription(
                        event.target.value
                      )
                    }
                    placeholder={
                      mode === 'image'
                        ? 'Example: recreate this object as a 10 cm desk model.'
                        : 'Tell us what you want to create, how it should look and how you plan to use it.'
                    }
                    rows={5}
                    className="mt-1.5 w-full border border-line-strong bg-white px-3 py-2.5 text-[14px] leading-relaxed text-ink outline-none placeholder:text-ink-500/60 focus:border-clay-500 focus:ring-2 focus:ring-clay-500/15"
                  />

                </label>
              )}

            </Step>


            {/* STEP 03 — MATERIAL FOR ALL MODES */}

            <Step
              n="03"
              title="Choose a material"
            >

              <div className="grid gap-2.5 sm:grid-cols-2">

                {materialOptions.map(
                  (option) => {

                    const active =
                      material ===
                      option.id;

                    const meta = MATERIAL_CONFIG[option.id];

                    return (
                      <div
                        key={option.id}
                        className={`group relative flex flex-col justify-between border transition-all ${
                          active
                            ? 'border-ink bg-white ring-1 ring-ink shadow-sm'
                            : 'border-line bg-white hover:border-line-strong'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setMaterial(
                              option.id
                            )
                          }
                          aria-pressed={
                            active
                          }
                          className="w-full p-3.5 text-left"
                        >
                          <div className="flex items-baseline justify-between gap-2 pr-7">
                            <span className="font-display text-[15px] font-semibold text-ink">
                              {option.name}
                            </span>

                            <span className="font-mono text-2xs font-medium text-ink-500">
                              ₹{option.rate}/g
                            </span>
                          </div>

                          <p className="mt-1 line-clamp-1 text-[12px] text-ink-600">
                            {meta?.tagline || `Density ${option.density} g/cc`}
                          </p>

                          <div className="mt-2 flex items-center gap-2 font-mono text-[10px] text-ink-500">
                            <span>{meta?.strength.split('·')[0] || 'Standard'}</span>
                            <span>·</span>
                            <span>{meta?.heatResistance || 'Up to 55°C'}</span>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setInfoMaterialModal(option.id);
                          }}
                          title={`Learn more about ${option.name}`}
                          aria-label={`Learn more about ${option.name}`}
                          className="absolute right-2.5 top-2.5 flex h-6 w-6 items-center justify-center rounded-full border border-line-strong/60 bg-paper-light text-ink-500 transition-colors hover:border-ink hover:bg-white hover:text-ink"
                        >
                          <span className="font-serif text-[11px] font-bold italic">i</span>
                        </button>
                      </div>
                    );
                  }
                )}

              </div>

            </Step>


            {/* STEP 04 — 3D SETTINGS */}

            {mode === '3d-model' && (
              <Step
                n="04"
                title="Print settings"
              >

                <div className="grid gap-5 sm:grid-cols-2">

                  <Field
                    label={`Infill density: ${infill}%`}
                  >

                    <input
                      type="range"
                      min="10"
                      max="100"
                      step="5"
                      value={infill}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                        setInfill(
                          Number(
                            event.target.value
                          )
                        )
                      }
                      className="w-full accent-clay-500"
                    />

                  </Field>

                  <Field label="Layer height">

                    <select
                      value={String(
                        layerHeight
                      )}
                      onChange={(event: React.ChangeEvent<HTMLSelectElement>) =>
                        setLayerHeight(
                          Number(
                            event.target.value
                          )
                        )
                      }
                      className="h-10 w-full border border-line-strong bg-white px-3 text-sm text-ink outline-none focus:border-clay-500"
                    >

                      {LAYER_HEIGHT_OPTIONS.map(
                        (option) => (
                          <option
                            key={
                              option.value
                            }
                            value={
                              option.value
                            }
                          >
                            {
                              option.label
                            }
                          </option>
                        )
                      )}

                    </select>

                  </Field>

                </div>

              </Step>
            )}


            {/* COLOUR / QUANTITY / DIMENSIONS */}

            <Step
              n={
                mode === '3d-model'
                  ? '05'
                  : '04'
              }
              title="Colour, quantity and notes"
              last
            >

              <div className="grid gap-5 sm:grid-cols-2">

                <Field label="Preferred colour">

                  <div className="flex items-center gap-3">

                    <input
                      type="color"
                      value={color}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                        setColor(
                          event.target.value
                        )
                      }
                      className="h-10 w-12 cursor-pointer border border-line-strong bg-white p-1"
                    />

                    <span className="font-mono text-[13px] text-ink">
                      {color.toUpperCase()}
                    </span>

                  </div>

                </Field>

                <Field
                  label="Quantity"
                  required
                >

                  <Input
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                      setQuantity(
                        Math.max(
                          1,
                          Number(
                            event.target.value
                          ) || 1
                        )
                      )
                    }
                  />

                </Field>

              </div>


              {mode !== '3d-model' && (
                <div className="mt-5 grid grid-cols-3 gap-3">

                  <Input
                    label="Length"
                    type="number"
                    min={0}
                    placeholder="mm"
                    value={length}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                      setLength(
                        event.target.value
                      )
                    }
                  />

                  <Input
                    label="Width"
                    type="number"
                    min={0}
                    placeholder="mm"
                    value={width}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                      setWidth(
                        event.target.value
                      )
                    }
                  />

                  <Input
                    label="Height"
                    type="number"
                    min={0}
                    placeholder="mm"
                    value={height}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                      setHeight(
                        event.target.value
                      )
                    }
                  />

                </div>
              )}


              <label className="mt-5 block text-[13px] font-medium text-ink-800">

                Anything we should know?{' '}

                <span className="font-normal text-ink-500">
                  optional
                </span>

                <textarea
                  value={notes}
                    onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setNotes(
                      event.target.value
                    )
                  }
                  placeholder="Tolerances, inserts, deadline, finishing instructions or other details…"
                  rows={3}
                  className="mt-1.5 w-full border border-line-strong bg-white px-3 py-2.5 text-[14px] leading-relaxed text-ink outline-none placeholder:text-ink-500/60 focus:border-clay-500 focus:ring-2 focus:ring-clay-500/15"
                />

              </label>

            </Step>


            {/* CUSTOMER DETAILS */}

            <Step
              n={
                mode === '3d-model'
                  ? '06'
                  : '05'
              }
              title="Your details"
              last
            >

              <div className="grid gap-4 sm:grid-cols-2">

                <Input
                  label="Full name"
                  value={customerName}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    setCustomerName(
                      event.target.value
                    )
                  }
                  required
                />

                <Input
                  label="Phone"
                  type="tel"
                  value={customerPhone}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    setCustomerPhone(
                      event.target.value
                    )
                  }
                  required
                />

                <Input
                  label="Email"
                  type="email"
                  value={customerEmail}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    setCustomerEmail(
                      event.target.value
                    )
                  }
                  required
                  className="sm:col-span-2"
                />

              </div>

            </Step>

          </div>


          {/* ESTIMATE SIDEBAR */}

          <aside className="lg:col-span-5">

            <div className="lg:sticky lg:top-28">

              {isCalculating ? (
                <EstimatePanel
                  loading
                />
              ) : mode ===
                '3d-model' ? (
                <EstimatePanel
                  file={file}
                  volume={volume}
                  estimatedWeight={
                    estimatedWeight
                  }
                  estimatedPrice={
                    estimatedPrice
                  }
                  material={
                    material
                  }
                  color={color}
                  infill={infill}
                  layerHeight={
                    layerHeight
                  }
                  quantity={quantity}
                  manualReview={
                    hasManualFile
                  }
                />
              ) : (
                <ManualPanel
                  mode={mode}
                  material={
                    material
                  }
                  color={color}
                  quantity={
                    quantity
                  }
                />
              )}

              <div className="mt-5">

                <Alert
                  tone="info"
                  title="Working on something confidential?"
                >
                  We can review confidential production files before quoting.{' '}
                  <Link
                    to="/contact"
                    className="border-b border-line-strong hover:text-ink"
                  >
                    Request an NDA
                  </Link>
                  .
                </Alert>

              </div>

            </div>

          </aside>

        </div>


        {/* ACTIONS */}

        <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-end">

          {mode ===
            '3d-model' && (
            <Button
              variant="secondary"
              size="lg"
              disabled={
                !file ||
                estimatedPrice ===
                  null ||
                isCalculating ||
                isSubmitting
              }
              onClick={
                handleAddToCart
              }
            >

              <ShoppingCart className="mr-2 h-4 w-4" />

              {isSubmitting
                ? uploadProgress !==
                  null
                  ? `Uploading ${uploadProgress}%`
                  : 'Adding…'
                : 'Add to cart'}

            </Button>
          )}

          <Button
            size="lg"
            disabled={
              isSubmitting ||
              isCalculating ||
              (
                mode !==
                  'idea' &&
                !file
              )
            }
            loading={
              isSubmitting
            }
            onClick={
              submitRequest
            }
          >
            {isSubmitting
              ? uploadProgress !==
                null
                ? `Uploading ${uploadProgress}%`
                : 'Submitting…'
              : mode ===
                '3d-model'
              ? 'Request a confirmed quote'
              : 'Request quote'}
          </Button>

        </div>

      </Shell>


      {/* ENGINEERING INFORMATION */}

      <section className="border-t border-line bg-paper-dark/50 py-14">

        <Shell>

          <div className="grid gap-8 lg:grid-cols-4">

            {[
              [
                'Wall thickness',
                'Anything below about 1.2 mm on FDM can become fragile.',
              ],
              [
                'Orientation',
                'Layer direction affects strength; tell us how the part will be loaded.',
              ],
              [
                'Tolerances',
                'Flag holes, press fits and mating surfaces that need tighter control.',
              ],
              [
                'Build volume',
                '300 × 300 × 350 mm per piece; larger geometry can be sectioned.',
              ],
            ].map(
              ([key, value]) => (
                <div
                  key={key}
                  className="border-t border-line pt-4"
                >

                  <h2 className="font-display text-[17px] font-semibold text-ink">
                    {key}
                  </h2>

                  <p className="mt-1.5 text-[14px] leading-relaxed text-ink-600">
                    {value}
                  </p>

                </div>
              )
            )}

          </div>

        </Shell>

      </section>

      {/* ================================================================== */}
      {/* MATERIAL INFO MODAL                                                */}
      {/* ================================================================== */}
      {infoMaterialModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="material-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
          onClick={() => setInfoMaterialModal(null)}
        >
          <div
            className="relative w-full max-w-lg border border-line-strong bg-white p-6 shadow-2xl sm:p-7"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="label-tech text-clay-600">
                  Material Guide
                </span>
                <h3
                  id="material-modal-title"
                  className="mt-1 font-display text-2xl font-semibold text-ink"
                >
                  {MATERIAL_CONFIG[infoMaterialModal].label}
                </h3>
                <p className="text-xs text-ink-600">
                  {MATERIAL_CONFIG[infoMaterialModal].tagline}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setInfoMaterialModal(null)}
                className="p-1.5 text-ink-500 transition-colors hover:text-ink"
                aria-label="Close material guide"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="mt-4 text-[13.5px] leading-relaxed text-ink-700">
              {MATERIAL_CONFIG[infoMaterialModal].description}
            </p>

            <div className="mt-5 divide-y divide-line border-y border-line text-xs">
              <div className="flex justify-between py-2.5">
                <span className="text-ink-500">Price Rate</span>
                <span className="font-mono font-medium text-ink">
                  ₹{MATERIAL_CONFIG[infoMaterialModal].pricePerGram} / gram
                </span>
              </div>
              <div className="flex justify-between py-2.5">
                <span className="text-ink-500">Density</span>
                <span className="font-mono text-ink">
                  {MATERIAL_CONFIG[infoMaterialModal].density} g/cm³
                </span>
              </div>
              <div className="flex justify-between py-2.5">
                <span className="text-ink-500">Strength Rating</span>
                <span className="font-medium text-ink">
                  {MATERIAL_CONFIG[infoMaterialModal].strength}
                </span>
              </div>
              <div className="flex justify-between py-2.5">
                <span className="text-ink-500">Heat Deflection</span>
                <span className="font-medium text-ink">
                  {MATERIAL_CONFIG[infoMaterialModal].heatResistance}
                </span>
              </div>
              <div className="flex justify-between py-2.5">
                <span className="text-ink-500">Surface Finish</span>
                <span className="font-medium text-ink">
                  {MATERIAL_CONFIG[infoMaterialModal].finish}
                </span>
              </div>
              <div className="py-2.5">
                <span className="block text-ink-500">Ideal Applications:</span>
                <span className="mt-0.5 block font-medium text-ink">
                  {MATERIAL_CONFIG[infoMaterialModal].bestFor}
                </span>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setInfoMaterialModal(null)}
                className="border border-line px-4 py-2 text-xs font-medium text-ink-700 hover:border-ink"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setMaterial(infoMaterialModal);
                  setInfoMaterialModal(null);
                }}
                className="bg-ink px-4 py-2 text-xs font-medium text-white hover:bg-clay-600"
              >
                Choose {MATERIAL_CONFIG[infoMaterialModal].label}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


/* ========================================================================== */
/* Loading                                                                    */
/* ========================================================================== */

function LoadingState({
  text,
}: {
  text: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-24">

      <Loader2 className="h-8 w-8 animate-spin text-clay-600" />

      <p className="mt-4 text-sm text-ink-600">
        {text}
      </p>

    </div>
  );
}


/* ========================================================================== */
/* Step                                                                       */
/* ========================================================================== */

function Step({
  n,
  title,
  children,
  last,
}: {
  n: string;
  title: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <section
      className={
        last
          ? ''
          : 'mb-8 border-b border-line pb-8'
      }
    >

      <div className="mb-4 flex items-baseline gap-3">

        <span className="font-mono text-2xs text-clay-600">
          {n}
        </span>

        <h2 className="font-display text-[19px] font-semibold tracking-[-0.015em] text-ink">
          {title}
        </h2>

      </div>

      {children}

    </section>
  );
}


/* ========================================================================== */
/* Mode Button                                                                */
/* ========================================================================== */

function ModeButton({
  active,
  icon,
  title,
  description,
  onClick,
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
      aria-pressed={active}
      className={`border p-4 text-left transition-colors ${
        active
          ? 'border-ink bg-white shadow-hair'
          : 'border-line bg-white hover:border-line-strong'
      }`}
    >

      <div className="flex items-center gap-3">

        <span
          className={`flex h-9 w-9 items-center justify-center ${
            active
              ? 'bg-ink text-paper'
              : 'bg-paper-dark text-ink-600'
          }`}
        >
          {icon}
        </span>

        <span>

          <span className="block font-medium text-ink">
            {title}
          </span>

          <span className="mt-0.5 block text-[11.5px] text-ink-500">
            {description}
          </span>

        </span>

      </div>

    </button>
  );
}


/* ========================================================================== */
/* File Upload                                                                */
/* ========================================================================== */

function FileUpload({
  file,
  mode,
  onChange,
}: {
  file: File | null;
  mode: ServiceMode;
  onChange: (
    event: React.ChangeEvent<HTMLInputElement>
  ) => void;
}) {
  const accept =
    mode === '3d-model'
      ? '.stl,.obj,.3mf'
      : '.jpg,.jpeg,.png,.webp';

  return (
    <div>

      <input
        id="custom-file"
        type="file"
        accept={accept}
        onChange={onChange}
        className="hidden"
      />

      <label
        htmlFor="custom-file"
        className={`flex min-h-[180px] cursor-pointer flex-col items-center justify-center border border-dashed p-8 text-center transition-colors ${
          file
            ? 'border-ink bg-paper'
            : 'border-line-strong bg-white hover:border-ink'
        }`}
      >

        {file ? (
          <FileBox className="h-9 w-9 text-clay-600" />
        ) : (
          <Upload className="h-9 w-9 text-ink-500" />
        )}

        <p className="mt-3 break-all font-medium text-ink">
          {file
            ? file.name
            : mode === '3d-model'
            ? 'Upload STL, OBJ or 3MF'
            : 'Upload JPG, PNG or WEBP'}
        </p>

        <p className="mt-1 text-xs text-ink-500">
          {file
            ? 'Click to replace'
            : 'Maximum file size: 100MB'}
        </p>

      </label>

    </div>
  );
}


/* ========================================================================== */
/* Estimate Panel                                                             */
/* ========================================================================== */

function EstimatePanel({
  loading,
  file,
  volume,
  estimatedWeight,
  estimatedPrice,
  material,
  color,
  infill,
  layerHeight,
  quantity,
  manualReview,
}: {
  loading?: boolean;
  file?: File | null;
  volume?: number | null;
  estimatedWeight?: number | null;
  estimatedPrice?: number | null;
  material?: MaterialType;
  color?: string;
  infill?: number;
  layerHeight?: number;
  quantity?: number;
  manualReview?: boolean;
}) {
  return (
    <div className="border border-line-strong bg-white">

      <div className="border-b border-line px-5 py-4">

        <p className="font-mono text-2xs uppercase tracking-[0.14em] text-ink-500">
          Estimate
        </p>

        {loading ? (
          <Loader2 className="mt-3 h-7 w-7 animate-spin text-clay-600" />
        ) : (
          <p className="mt-2 font-display text-[30px] font-semibold leading-none tracking-[-0.025em] text-ink">
            {estimatedPrice !==
              null &&
            estimatedPrice !==
              undefined
              ? `₹${estimatedPrice.toLocaleString(
                  'en-IN'
                )}`
              : '—'}
          </p>
        )}

        <p className="mt-1.5 text-[12.5px] text-ink-600">
          {loading
            ? 'Analysing your model…'
            : estimatedPrice !==
                null &&
              estimatedPrice !==
                undefined
            ? `${quantity} × ${material} · ${color?.toUpperCase()}`
            : 'Upload an STL file to calculate pricing'}
        </p>

      </div>


      <div className="px-5 py-4">

        {manualReview ? (
          <div className="py-4">

            <FileBox className="h-8 w-8 text-clay-600" />

            <h3 className="mt-3 font-display text-[18px] font-semibold text-ink">
              Manual review required
            </h3>

            <p className="mt-2 text-[13.5px] leading-relaxed text-ink-600">
              Your{' '}
              {file?.name
                .toLowerCase()
                .endsWith(
                  '.3mf'
                )
                ? '3MF'
                : 'OBJ'}{' '}
              file is accepted. Our team will inspect it and prepare the final quotation.
            </p>

          </div>
        ) : estimatedPrice !==
          null &&
          estimatedPrice !==
            undefined ? (

          <dl className="space-y-2.5 text-[13.5px]">

            <Row
              k="Material"
              v={material || '—'}
            />

            <Row
              k="Colour"
              v={
                color?.toUpperCase() ||
                '—'
              }
            />

            <Row
              k="Volume"
              v={
                volume != null
                  ? `${volume.toFixed(
                      2
                    )} cm³`
                  : '—'
              }
            />

            <Row
              k="Estimated weight"
              v={
                estimatedWeight !=
                null
                  ? `${estimatedWeight} g`
                  : '—'
              }
            />

            <Row
              k="Infill"
              v={`${infill}%`}
            />

            <Row
              k="Layer height"
              v={`${layerHeight} mm`}
            />

            <Row
              k="Quantity"
              v={String(
                quantity
              )}
            />

          </dl>

        ) : (

          <p className="text-[13.5px] leading-relaxed text-ink-600">
            Pricing is calculated from model volume, material, infill and quantity. OBJ and 3MF files are submitted for manual review.
          </p>

        )}

      </div>

    </div>
  );
}


/* ========================================================================== */
/* Manual Panel                                                               */
/* ========================================================================== */

function ManualPanel({
  mode,
  material,
  color,
  quantity,
}: {
  mode: ServiceMode;
  material: MaterialType;
  color: string;
  quantity: number;
}) {
  return (
    <div className="border border-line-strong bg-white p-5">

      <div className="flex h-10 w-10 items-center justify-center bg-paper-dark text-clay-600">

        {mode === 'image' ? (
          <ImageIcon className="h-5 w-5" />
        ) : (
          <Lightbulb className="h-5 w-5" />
        )}

      </div>

      <h2 className="mt-4 font-display text-[20px] font-semibold text-ink">
        {mode === 'image'
          ? 'Manual quotation'
          : "Let's build it together"}
      </h2>

      <p className="mt-2 text-[14px] leading-relaxed text-ink-600">
        {mode === 'image'
          ? 'Images do not contain enough information for reliable automatic pricing. Our team will review your reference and dimensions.'
          : 'Tell us what you have in mind. We can help with modelling, material selection and printing requirements.'}
      </p>

      <dl className="mt-5 space-y-2.5 text-[13.5px]">

        <Row
          k="Material"
          v={material}
        />

        <Row
          k="Colour"
          v={color.toUpperCase()}
        />

        <Row
          k="Quantity"
          v={String(
            quantity
          )}
        />

      </dl>

    </div>
  );
}


/* ========================================================================== */
/* Row                                                                        */
/* ========================================================================== */

function Row({
  k,
  v,
}: {
  k: string;
  v: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">

      <dt className="text-ink-500">
        {k}
      </dt>

      <dd className="font-mono text-ink">
        {v}
      </dd>

    </div>
  );
}