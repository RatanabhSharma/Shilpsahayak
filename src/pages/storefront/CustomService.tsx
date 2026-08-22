import React, { useEffect, useState } from 'react';
import {
  Upload,
  Calculator,
  Loader2,
  CheckCircle,
  FileBox,
  Lock,
  UserRound
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

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

import { useSubmitQuote } from '../../hooks/useQuotes';
import { useAuth } from '../../hooks/useAuth';
import { useUserProfile } from '../../hooks/useUserProfile';
import { upload3DFile } from '../../utils/uploadFile';

export function CustomService() {
  const navigate = useNavigate();

  const submitQuote = useSubmitQuote();

  const {
    user,
    loading: authLoading
  } = useAuth();

  const {
    data: profile,
    isLoading: profileLoading
  } = useUserProfile();

  const [file, setFile] = useState<File | null>(null);

  const [isCalculating, setIsCalculating] =
    useState(false);

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [isSuccess, setIsSuccess] =
    useState(false);

  const [uploadProgress, setUploadProgress] =
    useState<number | null>(null);

  const [material, setMaterial] =
    useState<MaterialType>('PLA');

  const [color, setColor] =
    useState('White');

  const [infill, setInfill] =
    useState(20);

  const [layerHeight, setLayerHeight] =
    useState(0.2);

  const [quantity, setQuantity] =
    useState(1);

  const [notes, setNotes] =
    useState('');

  const [volume, setVolume] =
    useState<number | null>(null);

  const [estimatedWeight, setEstimatedWeight] =
    useState<number | null>(null);

  const [estimatedPrice, setEstimatedPrice] =
    useState<number | null>(null);

  /*
   * Material options
   */
  const MATERIAL_OPTIONS = Object.keys(
    MATERIAL_CONFIG
  ).map((mat) => ({
    value: mat,
    label: mat
  }));

  /*
   * Color options
   */
  const COLOR_OPTIONS = [
    'White',
    'Black',
    'Grey',
    'Red',
    'Blue',
    'Natural',
    'Marble'
  ].map((value) => ({
    value,
    label: value
  }));

  /*
   * Layer height options
   */
  const LAYER_HEIGHT_OPTIONS = [
    {
      value: '0.12',
      label: '0.12 mm (High Detail)'
    },
    {
      value: '0.16',
      label: '0.16 mm'
    },
    {
      value: '0.2',
      label: '0.20 mm (Standard)'
    },
    {
      value: '0.28',
      label: '0.28 mm (Draft)'
    }
  ];

  /*
   * Calculate estimated price
   */
  const calculatePrice = (
    vol: number,
    mat: MaterialType,
    inf: number,
    qty: number
  ) => {
    const config = MATERIAL_CONFIG[mat];

    const infillFactor =
      0.3 + (inf / 100) * 0.7;

    const weight =
      vol *
      config.density *
      infillFactor;

    const price =
      (weight * config.pricePerGram + BASE_FEE) *
      qty;

    setEstimatedWeight(
      Math.round(weight * 10) / 10
    );

    setEstimatedPrice(
      Math.round(price)
    );
  };

  /*
   * Recalculate price whenever
   * relevant options change.
   */
  useEffect(() => {
    if (volume !== null) {
      calculatePrice(
        volume,
        material,
        infill,
        quantity
      );
    }
  }, [
    material,
    infill,
    quantity,
    volume
  ]);

  /*
   * Validate and process uploaded file.
   */
  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const selectedFile =
      e.target.files?.[0];

    if (!selectedFile) return;

    const validTypes = [
      '.stl',
      '.obj',
      '.3mf'
    ];

    const isValid = validTypes.some(
      (ext) =>
        selectedFile.name
          .toLowerCase()
          .endsWith(ext)
    );

    if (!isValid) {
      alert(
        'Please upload a valid 3D file (.stl, .obj, or .3mf)'
      );

      e.target.value = '';
      return;
    }

    if (
      selectedFile.size >
      50 * 1024 * 1024
    ) {
      alert(
        'File is too large. Maximum size is 50MB.'
      );

      e.target.value = '';
      return;
    }

    setFile(selectedFile);

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
        const vol =
          await calculateSTLVolume(
            selectedFile
          );

        setVolume(vol);

        calculatePrice(
          vol,
          material,
          infill,
          quantity
        );
      } else {
        /*
         * OBJ and 3MF are accepted for
         * quote submission, but the
         * current calculator only
         * calculates STL volume.
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
        'Could not calculate volume from this file. You can still submit the quote.'
      );
    } finally {
      setIsCalculating(false);
    }
  };

  /*
   * Submit quote.
   */
  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    /*
     * Extra safety check.
     * Guests should never be able
     * to submit a custom quote.
     */
    if (!user) {
      navigate(
        '/login?redirect=/custom-service'
      );

      return;
    }

    if (!file) {
      alert(
        'Please upload a 3D file first.'
      );

      return;
    }

    setIsSubmitting(true);

    const formData =
      new FormData(
        e.currentTarget
      );

    try {
      /*
       * 1. Upload 3D file
       */
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

      /*
       * 2. Save quote
       */
      await submitQuote.mutateAsync({
        customerName:
          (formData.get(
            'name'
          ) as string) || '',

        customerEmail:
          (formData.get(
            'email'
          ) as string) || '',

        customerPhone:
          (formData.get(
            'phone'
          ) as string) || '',

        fileName:
          file.name,

        fileUrl,

        material,

        color,

        infill,

        layerHeight,

        quantity,

        estimatedWeight:
          estimatedWeight || 0,

        estimatedPrice:
          estimatedPrice || 0,

        notes
      });

      setIsSuccess(true);
    } catch (error) {
      console.error(
        'Failed to submit quote:',
        error
      );

      alert(
        'Failed to submit quote. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
      setUploadProgress(null);
    }
  };

  /*
   * Authentication loading state
   */
  if (authLoading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-24 text-center">

        <Loader2
          className="w-8 h-8 animate-spin text-brand-500 mx-auto"
        />

        <p className="text-sm text-charcoal-light mt-4">
          Checking your account...
        </p>

      </div>
    );
  }

  /*
   * Login required.
   */
  if (!user) {
    return (
      <div className="max-w-lg mx-auto px-4 py-24">

        <Card className="p-8 text-center border-none shadow-sm">

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
            <Lock className="w-7 h-7 text-brand-500" />
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
            Please login or create an account before
            submitting a custom printing request.
            This allows us to securely manage your
            uploaded files and order details.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">

            <Button
              onClick={() =>
                navigate(
                  '/login?redirect=/custom-service'
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

  /*
   * Profile loading.
   */
  if (profileLoading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-24 text-center">

        <Loader2
          className="w-8 h-8 animate-spin text-brand-500 mx-auto"
        />

        <p className="text-sm text-charcoal-light mt-4">
          Loading your information...
        </p>

      </div>
    );
  }

  /*
   * Successful quote submission.
   */
  if (isSuccess) {
    return (
      <div className="max-w-lg mx-auto px-4 py-24">

        <Card className="p-8 text-center border-none shadow-sm">

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
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>

          <h1 className="
            text-2xl
            font-serif
            font-bold
            text-charcoal
            mb-3
          ">
            Quote Request Submitted
          </h1>

          <p className="
            text-charcoal-light
            text-sm
            leading-relaxed
            mb-8
          ">
            Your 3D model has been received successfully.
            Our team will review the file and contact you
            with the final quote.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">

            <Button
              onClick={() => {
                setFile(null);
                setVolume(null);
                setEstimatedWeight(null);
                setEstimatedPrice(null);
                setIsSuccess(false);
              }}
              variant="outline"
            >
              Submit Another Model
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

  /*
   * Main Custom Printing page.
   */
  return (
    <div className="
      max-w-5xl
      mx-auto
      px-4
      sm:px-6
      lg:px-8
      py-12
    ">

      {/* Header */}
      <div className="text-center mb-12">

        <div className="
          inline-flex
          items-center
          gap-2
          px-4
          py-2
          rounded-full
          bg-brand-50
          text-brand-600
          text-xs
          font-medium
          mb-5
        ">
          <UserRound className="w-4 h-4" />
          Logged in as {user.email}
        </div>

        <h1 className="
          text-4xl
          font-serif
          font-bold
          text-charcoal
          mb-4
        ">
          Custom 3D Print Quote
        </h1>

        <p className="
          text-charcoal-light
          max-w-2xl
          mx-auto
        ">
          Upload your 3D model and get an instant
          estimated price. Our team will review
          and confirm the final quote.
        </p>

      </div>

      <div className="
        grid
        grid-cols-1
        lg:grid-cols-5
        gap-8
      ">

        {/* Form */}
        <div className="lg:col-span-3">

          <Card className="
            p-6
            border-none
            shadow-sm
          ">

            <form
              onSubmit={handleSubmit}
              className="space-y-6"
            >

              {/* File Upload */}
              <div>

                <label className="
                  block
                  text-sm
                  font-medium
                  text-charcoal
                  mb-2
                ">
                  Upload 3D File *
                </label>

                <div
                  className={`
                    border-2
                    border-dashed
                    rounded-2xl
                    p-8
                    text-center
                    transition-all
                    duration-200
                    ${
                      file
                        ? 'border-brand-400 bg-brand-50'
                        : 'border-brand-200 hover:border-brand-400 hover:bg-brand-50/40'
                    }
                  `}
                >

                  <input
                    type="file"
                    id="file-upload"
                    accept=".stl,.obj,.3mf"
                    onChange={
                      handleFileChange
                    }
                    className="hidden"
                  />

                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer"
                  >

                    {file ? (
                      <div className="
                        flex
                        flex-col
                        items-center
                      ">

                        <FileBox className="
                          w-10
                          h-10
                          text-brand-500
                          mb-3
                        " />

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
                          Click to change file
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
                          Click to upload STL, OBJ or 3MF
                        </p>

                        <p className="
                          text-xs
                          text-charcoal-lighter
                          mt-1
                        ">
                          Maximum file size 50MB
                        </p>

                      </div>
                    )}

                  </label>

                </div>

              </div>

              {/* Parameters */}
              <div className="
                grid
                grid-cols-1
                sm:grid-cols-2
                gap-5
              ">

                {/* Material */}
                <div>
                  <label className="
                    block
                    text-sm
                    font-medium
                    text-charcoal
                    mb-2
                  ">
                    Material
                  </label>

                  <Select
                    value={material}
                    onChange={(value) =>
                      setMaterial(
                        value as MaterialType
                      )
                    }
                    className="w-full"
                    options={
                      MATERIAL_OPTIONS
                    }
                  />
                </div>

                {/* Color */}
                <div>
                  <label className="
                    block
                    text-sm
                    font-medium
                    text-charcoal
                    mb-2
                  ">
                    Color
                  </label>

                  <Select
                    value={color}
                    onChange={setColor}
                    className="w-full"
                    options={
                      COLOR_OPTIONS
                    }
                  />
                </div>

                {/* Infill */}
                <div>

                  <label className="
                    block
                    text-sm
                    font-medium
                    text-charcoal
                    mb-2
                  ">
                    Infill Density: {infill}%
                  </label>

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
                    className="w-full accent-brand-500"
                  />

                </div>

                {/* Layer Height */}
                <div>

                  <label className="
                    block
                    text-sm
                    font-medium
                    text-charcoal
                    mb-2
                  ">
                    Layer Height
                  </label>

                  <Select
                    value={String(
                      layerHeight
                    )}
                    onChange={(value) =>
                      setLayerHeight(
                        Number(value)
                      )
                    }
                    className="w-full"
                    options={
                      LAYER_HEIGHT_OPTIONS
                    }
                  />

                </div>

                {/* Quantity */}
                <div>

                  <label className="
                    block
                    text-sm
                    font-medium
                    text-charcoal
                    mb-2
                  ">
                    Quantity
                  </label>

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

                </div>

              </div>

              {/* Customer Details */}
              <div className="
                border-t
                border-brand-100
                pt-6
                space-y-5
              ">

                <div>
                  <h3 className="
                    font-serif
                    font-semibold
                    text-charcoal
                  ">
                    Your Details
                  </h3>

                  <p className="
                    text-xs
                    text-charcoal-lighter
                    mt-1
                  ">
                    Your saved account information has
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
                      profile?.name ||
                      user.displayName ||
                      ''
                    }
                    required
                  />

                  <Input
                    name="phone"
                    label="Phone Number"
                    type="tel"
                    defaultValue={
                      profile?.phone || ''
                    }
                    required
                  />

                </div>

                <Input
                  name="email"
                  label="Email Address"
                  type="email"
                  defaultValue={
                    profile?.email ||
                    user.email ||
                    ''
                  }
                  required
                />

                <Textarea
                  label="Address"
                  name="address"
                  defaultValue={
                    profile?.address
                      ? [
                          profile.address.line1,
                          profile.address.line2,
                          profile.address.city,
                          profile.address.state,
                          profile.address.pincode
                        ]
                          .filter(Boolean)
                          .join(', ')
                      : ''
                  }
                  placeholder="House no, Street, Area, City, Pincode"
                  required
                />

                <Textarea
                  label="Additional Notes (optional)"
                  value={notes}
                  onChange={(e) =>
                    setNotes(
                      e.target.value
                    )
                  }
                  placeholder="Any special requirements..."
                />

              </div>

              {/* Submit */}
              <Button
                type="submit"
                size="lg"
                className="w-full"
                isLoading={isSubmitting}
                disabled={
                  !file ||
                  isCalculating
                }
              >
                {isSubmitting
                  ? uploadProgress !== null
                    ? `Uploading... ${uploadProgress}%`
                    : 'Submitting...'
                  : 'Submit Quote Request'}
              </Button>

            </form>

          </Card>

        </div>

        {/* Price Estimate */}
        <div className="lg:col-span-2">

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
                  Calculating volume...
                </p>

              </div>

            ) : estimatedPrice !== null ? (

              <div className="space-y-5">

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
                    Estimated Price
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

                  <p className="
                    text-xs
                    text-charcoal-lighter
                    mt-2
                  ">
                    Final price may vary slightly
                    after review
                  </p>

                </div>

                <div className="
                  space-y-3
                  text-sm
                ">

                  <div className="
                    flex
                    justify-between
                  ">
                    <span className="text-charcoal-light">
                      Material
                    </span>

                    <span className="
                      text-charcoal
                      font-medium
                    ">
                      {material}
                    </span>
                  </div>

                  <div className="
                    flex
                    justify-between
                  ">
                    <span className="text-charcoal-light">
                      Estimated Weight
                    </span>

                    <span className="
                      text-charcoal
                      font-medium
                    ">
                      {estimatedWeight} g
                    </span>
                  </div>

                  <div className="
                    flex
                    justify-between
                  ">
                    <span className="text-charcoal-light">
                      Volume
                    </span>

                    <span className="
                      text-charcoal
                      font-medium
                    ">
                      {volume?.toFixed(2)} cm³
                    </span>
                  </div>

                  <div className="
                    flex
                    justify-between
                  ">
                    <span className="text-charcoal-light">
                      Infill
                    </span>

                    <span className="
                      text-charcoal
                      font-medium
                    ">
                      {infill}%
                    </span>
                  </div>

                  <div className="
                    flex
                    justify-between
                  ">
                    <span className="text-charcoal-light">
                      Quantity
                    </span>

                    <span className="
                      text-charcoal
                      font-medium
                    ">
                      {quantity}
                    </span>
                  </div>

                </div>

              </div>

            ) : (

              <div className="
                text-center
                py-12
                text-charcoal-light
                text-sm
              ">
                Upload a 3D file to see the
                estimated price
              </div>

            )}

          </Card>

        </div>

      </div>
    </div>
  );
}