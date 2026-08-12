import React, { useState, useEffect } from 'react';
import { Upload, Calculator, Loader2, CheckCircle, FileBox } from 'lucide-react';
import { Button, Input, Textarea, Card } from '../../components/ui';
import { calculateSTLVolume } from '../../utils/calculateVolume';
import { MATERIAL_CONFIG, BASE_FEE, MaterialType } from '../../config/pricing';
import { useSubmitQuote } from '../../hooks/useQuotes';
import { useAuth } from '../../hooks/useAuth';
import { upload3DFile } from '../../utils/uploadFile';

export function CustomService() {
  const submitQuote = useSubmitQuote();
  const { user } = useAuth();

  const [file, setFile] = useState<File | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  // Form state
  const [material, setMaterial] = useState<MaterialType>('PLA');
  const [color, setColor] = useState('White');
  const [infill, setInfill] = useState(20);
  const [layerHeight, setLayerHeight] = useState(0.2);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');

  // Calculated values
  const [volume, setVolume] = useState<number | null>(null);
  const [estimatedWeight, setEstimatedWeight] = useState<number | null>(null);
  const [estimatedPrice, setEstimatedPrice] = useState<number | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const validTypes = ['.stl', '.obj', '.3mf'];
    const isValid = validTypes.some((ext) =>
      selectedFile.name.toLowerCase().endsWith(ext)
    );

    if (!isValid) {
      alert('Please upload a valid 3D file (.stl, .obj, or .3mf)');
      return;
    }

    if (selectedFile.size > 50 * 1024 * 1024) {
      alert('File is too large. Maximum size is 50MB.');
      return;
    }

    setFile(selectedFile);
    setIsCalculating(true);
    setVolume(null);
    setEstimatedWeight(null);
    setEstimatedPrice(null);

    try {
      if (selectedFile.name.toLowerCase().endsWith('.stl')) {
        const vol = await calculateSTLVolume(selectedFile);
        setVolume(vol);
        calculatePrice(vol, material, infill, quantity);
      } else {
        setVolume(null);
        setEstimatedWeight(null);
        setEstimatedPrice(null);
      }
    } catch (error) {
      console.error('Volume calculation failed:', error);
      alert('Could not calculate volume from this file. You can still submit the quote.');
    } finally {
      setIsCalculating(false);
    }
  };

  const calculatePrice = (
    vol: number,
    mat: MaterialType,
    inf: number,
    qty: number
  ) => {
    const config = MATERIAL_CONFIG[mat];
    const infillFactor = 0.3 + (inf / 100) * 0.7;
    const weight = vol * config.density * infillFactor;
    const price = (weight * config.pricePerGram + BASE_FEE) * qty;

    setEstimatedWeight(Math.round(weight * 10) / 10);
    setEstimatedPrice(Math.round(price));
  };

  useEffect(() => {
    if (volume !== null) {
      calculatePrice(volume, material, infill, quantity);
    }
  }, [material, infill, quantity, volume]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file) {
      alert('Please upload a 3D file first');
      return;
    }

    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);

    try {
      // 1. Upload the 3D file
      setUploadProgress(0);
      const fileUrl = await upload3DFile(
        file,
        user?.uid,
        (progress) => setUploadProgress(progress)
      );

      // 2. Save the quote with the file URL
      await submitQuote.mutateAsync({
        customerName: formData.get('name') as string,
        customerEmail: formData.get('email') as string,
        customerPhone: formData.get('phone') as string,
        fileName: file.name,
        fileUrl: fileUrl,
        material,
        color,
        infill,
        layerHeight,
        quantity,
        estimatedWeight: estimatedWeight || 0,
        estimatedPrice: estimatedPrice || 0,
        notes
      });

      setIsSuccess(true);
    } catch (error) {
      console.error(error);
      alert('Failed to submit quote. Please try again.');
    } finally {
      setIsSubmitting(false);
      setUploadProgress(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-serif font-bold text-charcoal mb-4">
          Custom 3D Print Quote
        </h1>
        <p className="text-charcoal-light max-w-2xl mx-auto">
          Upload your 3D model and get an instant estimated price. Our team will
          review and confirm the final quote.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Left - Form */}
        <div className="lg:col-span-3">
          <Card className="p-6 border-none shadow-sm">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-charcoal mb-2">
                  Upload 3D File *
                </label>
                <div
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                    file
                      ? 'border-brand-400 bg-brand-50'
                      : 'border-brand-200 hover:border-brand-400'
                  }`}
                >
                  <input
                    type="file"
                    id="file-upload"
                    accept=".stl,.obj,.3mf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    {file ? (
                      <div className="flex flex-col items-center">
                        <FileBox className="w-10 h-10 text-brand-500 mb-3" />
                        <p className="font-medium text-charcoal">{file.name}</p>
                        <p className="text-xs text-charcoal-lighter mt-1">
                          Click to change file
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <Upload className="w-10 h-10 text-charcoal-lighter mb-3" />
                        <p className="font-medium text-charcoal">
                          Click to upload STL, OBJ or 3MF
                        </p>
                        <p className="text-xs text-charcoal-lighter mt-1">
                          Maximum file size 50MB
                        </p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {/* Parameters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-charcoal mb-2">
                    Material
                  </label>
                  <select
                    value={material}
                    onChange={(e) => setMaterial(e.target.value as MaterialType)}
                    className="w-full rounded-lg border border-brand-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    {Object.keys(MATERIAL_CONFIG).map((mat) => (
                      <option key={mat} value={mat}>
                        {mat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-charcoal mb-2">
                    Color
                  </label>
                  <select
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-full rounded-lg border border-brand-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option>White</option>
                    <option>Black</option>
                    <option>Grey</option>
                    <option>Red</option>
                    <option>Blue</option>
                    <option>Natural</option>
                    <option>Marble</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-charcoal mb-2">
                    Infill Density: {infill}%
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={infill}
                    onChange={(e) => setInfill(Number(e.target.value))}
                    className="w-full accent-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-charcoal mb-2">
                    Layer Height
                  </label>
                  <select
                    value={layerHeight}
                    onChange={(e) => setLayerHeight(Number(e.target.value))}
                    className="w-full rounded-lg border border-brand-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value={0.12}>0.12 mm (High Detail)</option>
                    <option value={0.16}>0.16 mm</option>
                    <option value={0.2}>0.20 mm (Standard)</option>
                    <option value={0.28}>0.28 mm (Draft)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-charcoal mb-2">
                    Quantity
                  </label>
                  <Input
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value) || 1)}
                  />
                </div>
              </div>

              {/* Customer Details */}
              <div className="border-t border-brand-100 pt-6 space-y-5">
                <h3 className="font-serif font-semibold text-charcoal">
                  Your Details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <Input
                    name="name"
                    label="Full Name"
                    defaultValue={user?.displayName || ''}
                    required
                  />
                  <Input
                    name="phone"
                    label="Phone Number"
                    type="tel"
                    required
                  />
                </div>
                <Input
                  name="email"
                  label="Email Address"
                  type="email"
                  defaultValue={user?.email || ''}
                  required
                />
                <Textarea
                  label="Additional Notes (optional)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any special requirements..."
                />
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full"
                isLoading={isSubmitting}
                disabled={!file || isCalculating}
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

        {/* Right - Price Estimate */}
        <div className="lg:col-span-2">
          <Card className="p-6 border-none shadow-sm sticky top-28">
            <div className="flex items-center gap-2 mb-6">
              <Calculator className="w-5 h-5 text-brand-500" />
              <h2 className="font-serif font-semibold text-lg text-charcoal">
                Price Estimate
              </h2>
            </div>

            {isCalculating ? (
              <div className="flex flex-col items-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-brand-500 mb-4" />
                <p className="text-sm text-charcoal-light">
                  Calculating volume...
                </p>
              </div>
            ) : estimatedPrice !== null ? (
              <div className="space-y-5">
                <div className="bg-brand-50 rounded-xl p-5 text-center">
                  <p className="text-sm text-charcoal-light mb-1">
                    Estimated Price
                  </p>
                  <p className="text-4xl font-bold text-brand-600">
                    ₹{estimatedPrice.toLocaleString('en-IN')}
                  </p>
                  <p className="text-xs text-charcoal-lighter mt-2">
                    Final price may vary slightly after review
                  </p>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-charcoal-light">Material</span>
                    <span className="text-charcoal font-medium">{material}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-charcoal-light">Estimated Weight</span>
                    <span className="text-charcoal font-medium">
                      {estimatedWeight} g
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-charcoal-light">Volume</span>
                    <span className="text-charcoal font-medium">
                      {volume?.toFixed(2)} cm³
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-charcoal-light">Infill</span>
                    <span className="text-charcoal font-medium">{infill}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-charcoal-light">Quantity</span>
                    <span className="text-charcoal font-medium">{quantity}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-charcoal-light text-sm">
                Upload a 3D file to see the estimated price
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}