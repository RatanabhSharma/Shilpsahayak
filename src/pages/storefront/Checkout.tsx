import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Lock,
  MapPin,
  FileBox,
  ShieldCheck,
} from 'lucide-react';

import { useStore } from '../../store';
import { useAuth } from '../../hooks/useAuth';
import { useUserProfile } from '../../hooks/useUserProfile';
import { usePincodeLookup } from '../../hooks/usePincodeLookup';
import { useCreateOrder } from '../../hooks/useOrders';
import { useSettings } from '../../hooks/useSettings';

import {
  Button,
  Input,
  Textarea,
  Select,
  Badge,
} from '../../components/ui';

const INDIAN_STATES = [
  { value: 'Andhra Pradesh', label: 'Andhra Pradesh' },
  { value: 'Arunachal Pradesh', label: 'Arunachal Pradesh' },
  { value: 'Assam', label: 'Assam' },
  { value: 'Bihar', label: 'Bihar' },
  { value: 'Chhattisgarh', label: 'Chhattisgarh' },
  { value: 'Goa', label: 'Goa' },
  { value: 'Gujarat', label: 'Gujarat' },
  { value: 'Haryana', label: 'Haryana' },
  { value: 'Himachal Pradesh', label: 'Himachal Pradesh' },
  { value: 'Jharkhand', label: 'Jharkhand' },
  { value: 'Karnataka', label: 'Karnataka' },
  { value: 'Kerala', label: 'Kerala' },
  { value: 'Madhya Pradesh', label: 'Madhya Pradesh' },
  { value: 'Maharashtra', label: 'Maharashtra' },
  { value: 'Manipur', label: 'Manipur' },
  { value: 'Meghalaya', label: 'Meghalaya' },
  { value: 'Mizoram', label: 'Mizoram' },
  { value: 'Nagaland', label: 'Nagaland' },
  { value: 'Odisha', label: 'Odisha' },
  { value: 'Punjab', label: 'Punjab' },
  { value: 'Rajasthan', label: 'Rajasthan' },
  { value: 'Sikkim', label: 'Sikkim' },
  { value: 'Tamil Nadu', label: 'Tamil Nadu' },
  { value: 'Telangana', label: 'Telangana' },
  { value: 'Tripura', label: 'Tripura' },
  { value: 'Uttar Pradesh', label: 'Uttar Pradesh' },
  { value: 'Uttarakhand', label: 'Uttarakhand' },
  { value: 'West Bengal', label: 'West Bengal' },
  { value: 'Andaman and Nicobar Islands', label: 'Andaman and Nicobar Islands' },
  { value: 'Chandigarh', label: 'Chandigarh' },
  { value: 'Dadra and Nagar Haveli and Daman and Diu', label: 'Dadra and Nagar Haveli and Daman and Diu' },
  { value: 'Delhi', label: 'Delhi' },
  { value: 'Jammu and Kashmir', label: 'Jammu and Kashmir' },
  { value: 'Ladakh', label: 'Ladakh' },
  { value: 'Lakshadweep', label: 'Lakshadweep' },
  { value: 'Puducherry', label: 'Puducherry' },
];

function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.startsWith('91') && digits.length > 10) {
    return digits.slice(2, 12);
  }
  return digits.slice(0, 10);
}

export function Checkout() {
  const { user, loading: authLoading } = useAuth();
  const { data: profile, isLoading: profileLoading } = useUserProfile();
  const { data: settings } = useSettings();
  const navigate = useNavigate();

  const cart = useStore((state) => state.cart);
  const clearCart = useStore((state) => state.clearCart);
  const createOrder = useCreateOrder();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [orderId, setOrderId] = useState('');

  const [stateValue, setStateValue] = useState('');
  const [phone, setPhone] = useState('');
  const [cityValue, setCityValue] = useState('');
  const [pincodeValue, setPincodeValue] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const {
    location: pincodeLocation,
    isLookingUp: isPincodeLookingUp,
    error: pincodeLookupError,
  } = usePincodeLookup(pincodeValue, true);

  useEffect(() => {
    if (!profile) return;
    setStateValue(profile.address?.state || '');
    setPhone(normalizePhone(profile.phone || ''));
    setCityValue(profile.address?.city || '');
    setPincodeValue(profile.address?.pincode || '');
  }, [profile]);

  useEffect(() => {
    if (!pincodeLocation) return;
    setCityValue(pincodeLocation.city);
    setStateValue(pincodeLocation.state);
    setPincodeValue(pincodeLocation.pincode);
  }, [pincodeLocation]);

  const getItemPrice = (item: (typeof cart)[number]) =>
    item.customPrint?.customPrice ?? item.product.price;

  const subtotal = cart.reduce(
    (sum, item) => sum + getItemPrice(item) * item.quantity,
    0
  );

  const shippingRate = settings?.shippingFlatRate ?? 150;
  const freeShippingThreshold = settings?.freeShippingThreshold ?? 499;
  const shipping = subtotal >= freeShippingThreshold ? 0 : shippingRate;
  const total = subtotal + shipping;

  const validateForm = (formData: FormData) => {
    const nextErrors: Record<string, string> = {};
    const fullName = String(formData.get('name') || '').trim();
    const email = String(formData.get('email') || '').trim();
    const phoneNumber = normalizePhone(phone);
    const houseNo = String(formData.get('houseNo') || '').trim();
    const street = String(formData.get('street') || '').trim();
    const city = String(formData.get('city') || '').trim();
    const pincode = String(formData.get('pincode') || '').trim();

    if (fullName.length < 3) {
      nextErrors.name = 'Please enter your full name.';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      nextErrors.email = 'Please enter a valid email address.';
    }
    if (!/^[6-9]\d{9}$/.test(phoneNumber)) {
      nextErrors.phone = 'Enter a valid 10-digit Indian mobile number.';
    }
    if (houseNo.length < 2) {
      nextErrors.houseNo = 'Please enter your flat, house, or building number.';
    }
    if (street.length < 2) {
      nextErrors.street = 'Please enter your street or locality.';
    }
    if (city.length < 2) {
      nextErrors.city = 'Please enter your city.';
    }
    if (!stateValue) {
      nextErrors.state = 'Please select your state.';
    }
    if (!/^\d{6}$/.test(pincode)) {
      nextErrors.pincode = 'PIN code must contain 6 digits.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    if (!user) {
      navigate('/login');
      return;
    }
    if (cart.length === 0) return;

    const form = event.currentTarget;
    const formData = new FormData(form);

    if (!validateForm(formData)) {
      document.getElementById('checkout-form')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
      return;
    }

    const fullName = String(formData.get('name') || '').trim();
    const email = String(formData.get('email') || '').trim();
    const phoneNumber = normalizePhone(phone);
    const houseNo = String(formData.get('houseNo') || '').trim();
    const street = String(formData.get('street') || '').trim();
    const landmark = String(formData.get('landmark') || '').trim();
    const city = String(formData.get('city') || '').trim();
    const pincode = String(formData.get('pincode') || '').trim();
    const notes = String(formData.get('notes') || '').trim();

    setIsSubmitting(true);

    const formattedAddress = [houseNo, street, landmark, city, stateValue, pincode]
      .filter(Boolean)
      .join(', ');

    const shippingAddress = {
      fullName,
      phone: phoneNumber,
      email,
      houseNo,
      street,
      landmark,
      city,
      state: stateValue,
      pincode,
    };

    const items = cart.map((item) => {
      const cleanItem: {
        productId: string;
        productName: string;
        quantity: number;
        price: number;
        customNotes?: string;
        variantId?: string;
        variantLabel?: string;
      } = {
        productId: item.product.id,
        productName: item.product.name,
        quantity: item.quantity,
        price: getItemPrice(item),
      };

      if (item.customNotes !== undefined && item.customNotes !== '') {
        cleanItem.customNotes = item.customNotes;
      }
      if (item.variantId !== undefined && item.variantId !== '') {
        cleanItem.variantId = item.variantId;
      }
      if (item.variantLabel !== undefined && item.variantLabel !== '') {
        cleanItem.variantLabel = item.variantLabel;
      }

      return cleanItem;
    });

    const orderData = {
      customerId: user.uid,
      customerName: fullName,
      customerEmail: email,
      customerPhone: phoneNumber,
      address: formattedAddress,
      shippingAddress,
      items,
      total,
      notes,
    };

    try {
      const newOrder = await createOrder.mutateAsync(orderData);
      setOrderId(newOrder.id);
      clearCart();
      setIsSuccess(true);
    } catch (error) {
      console.error('Failed to place order:', error);
      alert('Failed to place order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-[75vh] bg-paper flex items-center justify-center px-5 py-16">
        <div className="mx-auto max-w-lg rounded-3xl border border-emerald-200 bg-white p-8 sm:p-10 text-center shadow-card">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-10 w-10" />
          </div>

          <span className="mt-5 font-mono text-xs font-bold uppercase tracking-wider text-accent block">
            Order Confirmed & Queued
          </span>

          <h1 className="mt-2 font-display text-3xl font-bold text-ink">
            Thank you for your order!
          </h1>

          <p className="mt-2 font-sans text-sm text-muted leading-relaxed">
            Your prints have been entered into our Patiala studio production schedule. We will reach out via WhatsApp/email with slicing confirmation.
          </p>

          <div className="mt-6 rounded-2xl border border-line bg-shell p-4 text-left divide-y divide-line text-xs font-sans">
            <div className="flex justify-between py-2">
              <span className="text-muted">Order Reference</span>
              <span className="font-mono font-bold text-ink">
                #{orderId.slice(0, 8).toUpperCase()}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted">Total Paid / Payable</span>
              <span className="font-mono font-bold text-ink">
                ₹{total.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted">Status</span>
              <span className="font-bold text-emerald-700">
                Queued for Fabrication
              </span>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row justify-center font-display">
            <Link to="/account" className="w-full sm:w-auto">
              <Button className="w-full font-bold">
                View in Account Dashboard
              </Button>
            </Link>
            <Link to="/catalog" className="w-full sm:w-auto">
              <Button variant="outline" className="w-full font-semibold">
                Continue Shopping
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-[60vh] bg-paper flex flex-col items-center justify-center py-24">
        <Loader2 className="h-10 w-10 animate-spin text-accent" />
        <p className="mt-4 text-sm font-semibold text-ink font-sans">Loading checkout details...</p>
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

          <h2 className="mt-5 font-display text-2xl font-bold text-ink">
            Login Required
          </h2>

          <p className="mt-2 text-sm text-muted leading-relaxed font-sans">
            Please log in to continue with your shipping details and save this order to your account.
          </p>

          <Button
            onClick={() => navigate('/login')}
            className="mt-6 w-full font-display font-bold"
          >
            Log In to Continue
          </Button>
        </div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="min-h-[70vh] bg-paper flex items-center justify-center px-5 py-20">
        <div className="mx-auto max-w-md text-center">
          <h1 className="font-display text-3xl font-bold text-ink">
            Your cart is empty
          </h1>
          <p className="mt-2 text-sm text-muted font-sans">
            Add items to your cart before proceeding to checkout.
          </p>
          <Link to="/catalog" className="mt-6 inline-block">
            <Button className="font-display font-bold">Browse Catalog</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      {/* Checkout Header */}
      <section className="border-b border-line bg-white">
        <div className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8 lg:px-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="mb-4 inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-muted hover:text-accent transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back to Cart</span>
              </button>

              <h1 className="font-display text-3xl font-bold text-ink sm:text-4xl">
                Pan-India Delivery & Checkout
              </h1>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-mono font-bold text-emerald-800">
              <Lock className="h-3.5 w-3.5 text-emerald-600" />
              <span>256-Bit SSL Encrypted</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Container */}
      <main className="mx-auto max-w-[1440px] px-5 py-10 sm:px-8 lg:px-10">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
          {/* Checkout Form */}
          <div id="checkout-form" className="lg:col-span-7">
            <form onSubmit={handleSubmit} noValidate className="space-y-8">
              {/* Step 1: Contact Details */}
              <div className="rounded-3xl border border-line bg-white p-7 shadow-soft">
                <div className="flex items-center gap-2.5 mb-5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent font-mono text-xs font-bold text-white">
                    1
                  </span>
                  <h2 className="font-display text-xl font-bold text-ink">
                    Customer Information
                  </h2>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Input
                      name="name"
                      label="Full Name *"
                      defaultValue={profile?.name || user.displayName || ''}
                      placeholder="Your full name"
                      autoComplete="name"
                      required
                    />
                    {errors.name && (
                      <p className="mt-1 text-xs font-semibold text-rose-600">
                        {errors.name}
                      </p>
                    )}
                  </div>

                  <div>
                    <Input
                      name="email"
                      label="Email Address *"
                      type="email"
                      defaultValue={profile?.email || user.email || ''}
                      placeholder="you@example.com"
                      autoComplete="email"
                      required
                    />
                    <p className="mt-1 font-mono text-[11px] text-muted">
                      Invoices & tracking updates sent here.
                    </p>
                    {errors.email && (
                      <p className="mt-1 text-xs font-semibold text-rose-600">
                        {errors.email}
                      </p>
                    )}
                  </div>

                  <div>
                    <Input
                      name="phone"
                      label="Mobile Phone (for delivery SMS/call) *"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(normalizePhone(e.target.value))}
                      placeholder="10-digit mobile number"
                      maxLength={10}
                      inputMode="numeric"
                      autoComplete="tel"
                      required
                    />
                    <p className="mt-1 font-mono text-[11px] text-muted">
                      +91 India format for dispatch.
                    </p>
                    {errors.phone && (
                      <p className="mt-1 text-xs font-semibold text-rose-600">
                        {errors.phone}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Step 2: Shipping Address */}
              <div className="rounded-3xl border border-line bg-white p-7 shadow-soft">
                <div className="flex items-center gap-2.5 mb-5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent font-mono text-xs font-bold text-white">
                    2
                  </span>
                  <h2 className="font-display text-xl font-bold text-ink">
                    Shipping & Delivery Address
                  </h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <Input
                      name="houseNo"
                      label="Flat / House / Building Number *"
                      defaultValue={profile?.address?.line1 || ''}
                      placeholder="e.g. Flat 304, Green Heights"
                      autoComplete="address-line1"
                      required
                    />
                    {errors.houseNo && (
                      <p className="mt-1 text-xs font-semibold text-rose-600">
                        {errors.houseNo}
                      </p>
                    )}
                  </div>

                  <div>
                    <Input
                      name="street"
                      label="Street / Locality / Sector *"
                      defaultValue={profile?.address?.line2 || ''}
                      placeholder="e.g. Model Town Road"
                      autoComplete="address-line2"
                      required
                    />
                    {errors.street && (
                      <p className="mt-1 text-xs font-semibold text-rose-600">
                        {errors.street}
                      </p>
                    )}
                  </div>

                  <Input
                    name="landmark"
                    label="Landmark (Optional)"
                    placeholder="e.g. Opposite Central Mall"
                    autoComplete="off"
                  />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Input
                        name="city"
                        label="City *"
                        value={cityValue}
                        onChange={(e) => setCityValue(e.target.value)}
                        placeholder="e.g. Patiala"
                        autoComplete="address-level2"
                        required
                      />
                      {errors.city && (
                        <p className="mt-1 text-xs font-semibold text-rose-600">
                          {errors.city}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="mb-1.5 block font-mono text-xs font-bold uppercase tracking-wider text-muted">
                        State *
                      </label>
                      <Select
                        value={stateValue}
                        onChange={setStateValue}
                        options={INDIAN_STATES}
                        placeholder="Select state"
                      />
                      <input type="hidden" name="state" value={stateValue} readOnly />
                      {errors.state && (
                        <p className="mt-1 text-xs font-semibold text-rose-600">
                          {errors.state}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Input
                        name="pincode"
                        label="6-Digit PIN Code *"
                        value={pincodeValue}
                        onChange={(e) =>
                          setPincodeValue(e.target.value.replace(/\D/g, '').slice(0, 6))
                        }
                        placeholder="e.g. 147001"
                        maxLength={6}
                        inputMode="numeric"
                        pattern="[0-9]{6}"
                        autoComplete="postal-code"
                        required
                      />
                      {pincodeValue.length === 6 && (
                        <p className="mt-1 min-h-5 text-[11px] leading-5 font-mono">
                          {isPincodeLookingUp ? (
                            <span className="inline-flex items-center gap-1.5 text-muted">
                              <span className="h-3 w-3 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                              Auto-detecting postal circle...
                            </span>
                          ) : pincodeLookupError ? (
                            <span className="text-rose-600">{pincodeLookupError}</span>
                          ) : pincodeLocation ? (
                            <span className="text-emerald-700 font-bold">
                              ✓ {pincodeLocation.city}, {pincodeLocation.state}
                            </span>
                          ) : null}
                        </p>
                      )}
                      {errors.pincode && (
                        <p className="mt-1 text-xs font-semibold text-rose-600">
                          {errors.pincode}
                        </p>
                      )}
                    </div>

                    <div className="flex items-end">
                      <div className="w-full rounded-xl border border-accent/30 bg-accent-soft p-3 text-xs text-ink flex items-center gap-2 font-sans">
                        <MapPin className="h-4 w-4 text-accent shrink-0" />
                        <span>Pan-India tracked courier delivery across all 29 states & UTs.</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 3: Order Notes */}
              <div className="rounded-3xl border border-line bg-white p-7 shadow-soft">
                <div className="flex items-center gap-2.5 mb-4">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent font-mono text-xs font-bold text-white">
                    3
                  </span>
                  <h2 className="font-display text-xl font-bold text-ink">
                    Special Delivery Instructions
                  </h2>
                </div>

                <Textarea
                  name="notes"
                  placeholder="Gate instructions, preferred delivery timing, or packaging remarks..."
                  rows={2}
                />
              </div>

              {/* Submit CTA */}
              <Button
                type="submit"
                size="lg"
                variant="primary"
                disabled={isSubmitting}
                className="w-full font-semibold"
                isLoading={isSubmitting}
              >
                {isSubmitting
                  ? 'Placing Order...'
                  : `Place Order • ₹${total.toLocaleString('en-IN')}`}
              </Button>
            </form>
          </div>

          {/* Right Column: Order Review Sidebar */}
          <aside className="lg:col-span-5">
            <div className="rounded-3xl border border-line bg-white p-7 shadow-soft lg:sticky lg:top-28 space-y-6">
              <div className="flex items-center justify-between border-b border-line pb-4">
                <h2 className="font-display text-xl font-bold text-ink">
                  Items in this Order
                </h2>
                <Badge variant="default">
                  {cart.length} {cart.length === 1 ? 'item' : 'items'}
                </Badge>
              </div>

              {/* Item Mini List */}
              <div className="divide-y divide-line max-h-80 overflow-y-auto pr-1 font-sans">
                {cart.map((item, index) => {
                  const itemPrice = getItemPrice(item);
                  return (
                    <div
                      key={`${item.product.id}-${index}`}
                      className="flex items-center gap-3 py-3"
                    >
                      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-line bg-shell">
                        {item.customPrint ? (
                          <div className="flex h-full w-full items-center justify-center bg-accent-soft text-accent">
                            <FileBox className="h-6 w-6" />
                          </div>
                        ) : (
                          <img
                            src={item.product.image}
                            alt={item.product.name}
                            className="h-full w-full object-cover"
                          />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-1 text-xs font-bold text-ink font-display">
                          {item.product.name}
                        </p>
                        {item.variantLabel && (
                          <span className="font-mono text-[10px] text-muted block">
                            {item.variantLabel}
                          </span>
                        )}
                        <span className="font-mono text-[11px] text-muted">
                          Qty: {item.quantity}
                        </span>
                      </div>

                      <span className="font-mono text-xs font-bold text-ink">
                        ₹{(itemPrice * item.quantity).toLocaleString('en-IN')}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Price Breakdown */}
              <div className="divide-y divide-line border-t border-line pt-4 text-xs font-sans space-y-2">
                <div className="flex justify-between pt-2">
                  <span className="text-muted">Subtotal</span>
                  <span className="font-mono font-bold text-ink">
                    ₹{subtotal.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="flex justify-between pt-2">
                  <span className="text-muted">Pan-India Courier</span>
                  <span className="font-mono font-bold text-ink">
                    {shipping === 0 ? (
                      <span className="text-emerald-600 font-bold">FREE</span>
                    ) : (
                      `₹${shipping.toLocaleString('en-IN')}`
                    )}
                  </span>
                </div>

                <div className="flex justify-between pt-2">
                  <span className="text-muted">Taxes</span>
                  <span className="text-muted">GST Included</span>
                </div>

                <div className="flex items-baseline justify-between pt-4">
                  <span className="font-display text-base font-bold text-ink">
                    Total Payable
                  </span>
                  <span className="font-mono text-2xl font-bold text-accent">
                    ₹{total.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Trust Footer */}
              <div className="rounded-2xl border border-line bg-shell p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-ink font-display">
                  <ShieldCheck className="h-4 w-4 text-accent" />
                  <span>Workshop Guarantee</span>
                </div>
                <p className="text-[11px] text-muted leading-relaxed font-sans">
                  Every order is checked for dimensional accuracy and wrapped with shock-resistant cushioning.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}