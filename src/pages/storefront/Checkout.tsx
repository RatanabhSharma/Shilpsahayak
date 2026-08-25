import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Lock,
  User,
  MapPin,
  Home,
  ShieldCheck,
  Pencil,
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
  Card,
  Select,
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
  {
    value: 'Andaman and Nicobar Islands',
    label: 'Andaman and Nicobar Islands',
  },
  {
    value: 'Chandigarh',
    label: 'Chandigarh',
  },
  {
    value: 'Dadra and Nagar Haveli and Daman and Diu',
    label: 'Dadra and Nagar Haveli and Daman and Diu',
  },
  {
    value: 'Delhi',
    label: 'Delhi',
  },
  {
    value: 'Jammu and Kashmir',
    label: 'Jammu and Kashmir',
  },
  {
    value: 'Ladakh',
    label: 'Ladakh',
  },
  {
    value: 'Lakshadweep',
    label: 'Lakshadweep',
  },
  {
    value: 'Puducherry',
    label: 'Puducherry',
  },
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

  const {
    data: profile,
    isLoading: profileLoading,
  } = useUserProfile();

  const { data: settings } = useSettings();

  const navigate = useNavigate();

  const cart = useStore((state) => state.cart);
  const clearCart = useStore((state) => state.clearCart);

  const createOrder = useCreateOrder();

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [isSuccess, setIsSuccess] =
    useState(false);

  const [orderId, setOrderId] =
    useState('');

  const [stateValue, setStateValue] =
    useState('');

  const [phone, setPhone] =
    useState('');

  const [cityValue, setCityValue] =
    useState('');

  const [pincodeValue, setPincodeValue] =
    useState('');

  const [errors, setErrors] = useState<
    Record<string, string>
  >({});

  const {
    location: pincodeLocation,
    isLookingUp: isPincodeLookingUp,
    error: pincodeLookupError,
  } = usePincodeLookup(
    pincodeValue,
    true
  );

  /*
   * Populate saved profile information.
   */
  useEffect(() => {
    if (!profile) return;

    setStateValue(
      profile.address?.state || ''
    );

    setPhone(
      normalizePhone(profile.phone || '')
    );

    setCityValue(
      profile.address?.city || ''
    );

    setPincodeValue(
      profile.address?.pincode || ''
    );
  }, [profile]);

  useEffect(() => {
    if (!pincodeLocation) {
      return;
    }

    setCityValue(pincodeLocation.city);
    setStateValue(pincodeLocation.state);
    setPincodeValue(pincodeLocation.pincode);
  }, [pincodeLocation]);

  /*
   * Same pricing logic as Cart.
   */
  const getItemPrice = (
    item: (typeof cart)[number]
  ) =>
    item.customPrint?.customPrice ??
    item.product.price;

  const subtotal = cart.reduce(
    (sum, item) =>
      sum +
      getItemPrice(item) *
        item.quantity,
    0
  );

  const shippingRate =
    settings?.shippingFlatRate ?? 150;

  const freeShippingThreshold =
    settings?.freeShippingThreshold ?? 499;

  const shipping =
    subtotal >= freeShippingThreshold
      ? 0
      : shippingRate;

  const total =
    subtotal + shipping;

  /*
   * Validate checkout fields before
   * sending anything to Firebase.
   */
  const validateForm = (
    formData: FormData
  ) => {
    const nextErrors: Record<
      string,
      string
    > = {};

    const fullName = String(
      formData.get('name') || ''
    ).trim();

    const email = String(
      formData.get('email') || ''
    ).trim();

    const phoneNumber =
      normalizePhone(phone);

    const houseNo = String(
      formData.get('houseNo') || ''
    ).trim();

    const street = String(
      formData.get('street') || ''
    ).trim();

    const city = String(
      formData.get('city') || ''
    ).trim();

    const pincode = String(
      formData.get('pincode') || ''
    ).trim();

    if (fullName.length < 3) {
      nextErrors.name =
        'Please enter your full name.';
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email
      )
    ) {
      nextErrors.email =
        'Please enter a valid email address.';
    }

    if (
      !/^[6-9]\d{9}$/.test(
        phoneNumber
      )
    ) {
      nextErrors.phone =
        'Enter a valid 10-digit Indian mobile number.';
    }

    if (houseNo.length < 2) {
      nextErrors.houseNo =
        'Please enter your house, flat or building number.';
    }

    if (street.length < 2) {
      nextErrors.street =
        'Please enter your street or locality.';
    }

    if (city.length < 2) {
      nextErrors.city =
        'Please enter your city.';
    }

    if (!stateValue) {
      nextErrors.state =
        'Please select your state.';
    }

    if (!/^\d{6}$/.test(pincode)) {
      nextErrors.pincode =
        'PIN code must contain 6 digits.';
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  };

  /*
   * Real order submission.
   *
   * This intentionally uses Firebase through
   * useCreateOrder() instead of the Magic Patterns
   * mock checkout implementation.
   */
  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (isSubmitting) return;

    if (!user) {
      navigate('/login');
      return;
    }

    if (cart.length === 0) {
      return;
    }

    const form =
      event.currentTarget;

    const formData =
      new FormData(form);

    if (!validateForm(formData)) {
      document
        .getElementById('checkout-form')
        ?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });

      return;
    }

    const fullName = String(
      formData.get('name') || ''
    ).trim();

    const email = String(
      formData.get('email') || ''
    ).trim();

    const phoneNumber =
      normalizePhone(phone);

    const houseNo = String(
      formData.get('houseNo') || ''
    ).trim();

    const street = String(
      formData.get('street') || ''
    ).trim();

    const landmark = String(
      formData.get('landmark') || ''
    ).trim();

    const city = String(
      formData.get('city') || ''
    ).trim();

    const pincode = String(
      formData.get('pincode') || ''
    ).trim();

    const notes = String(
      formData.get('notes') || ''
    ).trim();

    setIsSubmitting(true);

    /*
     * Legacy formatted address.
     * Kept for compatibility with existing
     * admin/order screens.
     */
    const formattedAddress = [
      houseNo,
      street,
      landmark,
      city,
      stateValue,
      pincode,
    ]
      .filter(Boolean)
      .join(', ');

    /*
     * Structured shipping address.
     */
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

    /*
     * Clean cart items before writing
     * them into Firestore.
     */
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

      if (
        item.customNotes !== undefined &&
        item.customNotes !== ''
      ) {
        cleanItem.customNotes =
          item.customNotes;
      }

      if (
        item.variantId !== undefined &&
        item.variantId !== ''
      ) {
        cleanItem.variantId =
          item.variantId;
      }

      if (
        item.variantLabel !== undefined &&
        item.variantLabel !== ''
      ) {
        cleanItem.variantLabel =
          item.variantLabel;
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
      const newOrder =
        await createOrder.mutateAsync(
          orderData
        );

      setOrderId(newOrder.id);

      clearCart();

      setIsSuccess(true);
    } catch (error) {
      console.error(
        'Failed to place order:',
        error
      );

      alert(
        'Failed to place order. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  /*
   * ============================================================
   * SUCCESS SCREEN
   * ============================================================
   */
  if (isSuccess) {
    return (
      <div className="min-h-screen bg-[#f7f4ee]">
        <div className="mx-auto max-w-xl px-4 py-16 sm:px-6">
          <div className="border border-[#d9d2c7] bg-white p-8 text-center sm:p-10">
            <CheckCircle2 className="mx-auto h-11 w-11 text-green-600" />

            <p className="mt-6 font-mono text-[9px] uppercase tracking-[0.14em] text-[#b4491e]">
              Order confirmed
            </p>

            <h1 className="mt-3 font-display text-[28px] font-semibold tracking-[-0.025em] text-[#14120f]">
              Order placed successfully
            </h1>

            <p className="mt-3 text-[14.5px] leading-6 text-[#6b6156]">
              Thank you for your order. We will
              contact you shortly with the next
              steps.
            </p>

            <div className="mt-7 divide-y divide-[#ebe6dc] border-y border-[#d9d2c7] text-left">
              <div className="flex items-center justify-between gap-4 py-3">
                <span className="text-[13px] text-[#8e8275]">
                  Order number
                </span>

                <span className="font-mono text-[13px] text-[#14120f]">
                  #{orderId.slice(0, 8)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 py-3">
                <span className="text-[13px] text-[#8e8275]">
                  Amount
                </span>

                <span className="font-mono text-[13px] text-[#14120f]">
                  ₹
                  {total.toLocaleString(
                    'en-IN'
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 py-3">
                <span className="text-[13px] text-[#8e8275]">
                  Status
                </span>

                <span className="font-mono text-[13px] text-green-700">
                  Order received
                </span>
              </div>
            </div>

            <div className="mt-7 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
              <Link to="/catalog">
                <Button
                  variant="outline"
                  className="w-full sm:w-auto"
                >
                  Continue Shopping
                </Button>
              </Link>

              <Link to="/">
                <Button className="w-full sm:w-auto">
                  Back to Home
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /*
   * ============================================================
   * AUTH LOADING
   * ============================================================
   */
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#f7f4ee]">
        <div className="mx-auto max-w-lg px-4 py-24 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#b4491e]" />

          <p className="mt-4 text-sm text-[#6b6156]">
            Checking your account...
          </p>
        </div>
      </div>
    );
  }

  /*
   * ============================================================
   * LOGIN REQUIRED
   * ============================================================
   */
  if (!user) {
    return (
      <div className="min-h-screen bg-[#f7f4ee]">
        <div className="mx-auto max-w-lg px-4 py-24 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center border border-[#d9d2c7] bg-white text-[#b4491e]">
            <Lock className="h-5 w-5" />
          </div>

          <h2 className="mt-5 font-display text-[26px] font-semibold text-[#14120f]">
            Login required
          </h2>

          <p className="mt-2 text-sm leading-6 text-[#6b6156]">
            Please login to continue with your
            order.
          </p>

          <div className="mt-7">
            <Button
              onClick={() =>
                navigate('/login')
              }
            >
              Login to Continue
            </Button>
          </div>
        </div>
      </div>
    );
  }

  /*
   * ============================================================
   * PROFILE LOADING
   * ============================================================
   */
  if (profileLoading) {
    return (
      <div className="min-h-screen bg-[#f7f4ee]">
        <div className="mx-auto max-w-lg px-4 py-24 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#b4491e]" />

          <p className="mt-4 text-sm text-[#6b6156]">
            Loading your information...
          </p>
        </div>
      </div>
    );
  }

  /*
   * ============================================================
   * EMPTY CART
   * ============================================================
   */
  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-[#f7f4ee]">
        <div className="mx-auto max-w-md px-4 py-24 text-center">
          <h1 className="font-display text-[25px] font-semibold text-[#14120f]">
            There is nothing to check out
          </h1>

          <p className="mt-2 text-[14.5px] text-[#6b6156]">
            Add a print to your cart and come
            back here.
          </p>

          <div className="mt-7">
            <Link to="/catalog">
              <Button>
                Browse the Catalogue
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /*
   * ============================================================
   * CHECKOUT
   * ============================================================
   */
  return (
    <div className="min-h-screen bg-[#f7f4ee] text-[#14120f]">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">

        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="mb-5 inline-flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.12em] text-[#6b6156] transition-colors hover:text-[#14120f]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Cart
            </button>

            <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#b4491e]">
              Checkout
            </p>

            <h1 className="mt-2 font-display text-[30px] font-semibold leading-tight tracking-[-0.025em] sm:text-[34px]">
              Where should this go?
            </h1>
          </div>

          <div className="inline-flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.12em] text-[#8e8275]">
            <Lock className="h-3.5 w-3.5" />
            Secure checkout
          </div>
        </div>

        <div className="mt-9 grid gap-10 lg:grid-cols-12 lg:gap-14">

          {/* ====================================================== */}
          {/* FORM                                                    */}
          {/* ====================================================== */}

          <div
            id="checkout-form"
            className="lg:col-span-7"
          >
            <form
              onSubmit={handleSubmit}
              noValidate
            >

              {/* Customer information */}
              <section className="mb-9 border-b border-[#d9d2c7] pb-9">
                <div className="mb-5 flex items-baseline gap-3">
                  <span className="font-mono text-[9px] text-[#b4491e]">
                    01
                  </span>

                  <h2 className="font-display text-[19px] font-semibold tracking-[-0.015em]">
                    Customer information
                  </h2>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">

                  <div className="sm:col-span-2">
                    <Input
                      name="name"
                      label="Full Name"
                      defaultValue={
                        profile?.name ||
                        user.displayName ||
                        ''
                      }
                      placeholder="Your full name"
                      autoComplete="name"
                      required
                    />

                    {errors.name && (
                      <p className="mt-1.5 text-xs text-red-600">
                        {errors.name}
                      </p>
                    )}
                  </div>

                  <div>
                    <Input
                      name="email"
                      label="Email"
                      type="email"
                      defaultValue={
                        profile?.email ||
                        user.email ||
                        ''
                      }
                      placeholder="you@example.com"
                      autoComplete="email"
                      required
                    />

                    <p className="mt-1.5 text-[11px] text-[#8e8275]">
                      Invoice and order updates are
                      sent here.
                    </p>

                    {errors.email && (
                      <p className="mt-1.5 text-xs text-red-600">
                        {errors.email}
                      </p>
                    )}
                  </div>

                  <div>
                    <Input
                      name="phone"
                      label="Phone"
                      type="tel"
                      value={phone}
                      onChange={(event) =>
                        setPhone(
                          normalizePhone(
                            event.target.value
                          )
                        )
                      }
                      placeholder="10-digit mobile number"
                      maxLength={10}
                      inputMode="numeric"
                      autoComplete="tel"
                      required
                    />

                    <p className="mt-1.5 text-[11px] text-[#8e8275]">
                      +91 will be used for delivery
                      contact.
                    </p>

                    {errors.phone && (
                      <p className="mt-1.5 text-xs text-red-600">
                        {errors.phone}
                      </p>
                    )}
                  </div>
                </div>
              </section>

              {/* Shipping address */}
              <section className="mb-9 border-b border-[#d9d2c7] pb-9">
                <div className="mb-5 flex items-baseline gap-3">
                  <span className="font-mono text-[9px] text-[#b4491e]">
                    02
                  </span>

                  <h2 className="font-display text-[19px] font-semibold tracking-[-0.015em]">
                    Shipping address
                  </h2>
                </div>

                <div className="space-y-5">

                  <div>
                    <Input
                      name="houseNo"
                      label="Flat, Building, House No."
                      defaultValue={
                        profile?.address?.line1 ||
                        ''
                      }
                      placeholder="e.g. 123, Flat 4B"
                      autoComplete="address-line1"
                      required
                    />

                    {errors.houseNo && (
                      <p className="mt-1.5 text-xs text-red-600">
                        {errors.houseNo}
                      </p>
                    )}
                  </div>

                  <div>
                    <Input
                      name="street"
                      label="Street / Locality"
                      defaultValue={
                        profile?.address?.line2 ||
                        ''
                      }
                      placeholder="e.g. Model Town"
                      autoComplete="address-line2"
                      required
                    />

                    {errors.street && (
                      <p className="mt-1.5 text-xs text-red-600">
                        {errors.street}
                      </p>
                    )}
                  </div>

                  <Input
                    name="landmark"
                    label="Area / Landmark"
                    placeholder="e.g. Near Bus Stand"
                    autoComplete="off"
                  />

                  <div className="grid gap-5 sm:grid-cols-2">

                    <div>
                      <Input
                        name="city"
                        label="City"
                        value={cityValue}
                        onChange={(event) =>
                          setCityValue(event.target.value)
                        }
                        placeholder="e.g. Patiala"
                        autoComplete="address-level2"
                        required
                      />

                      {errors.city && (
                        <p className="mt-1.5 text-xs text-red-600">
                          {errors.city}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-[#14120f]">
                        State
                      </label>

                      <Select
                        value={stateValue}
                        onChange={setStateValue}
                        options={INDIAN_STATES}
                        placeholder="Select your state"
                      />

                      <input
                        type="hidden"
                        name="state"
                        value={stateValue}
                        readOnly
                      />

                      {errors.state && (
                        <p className="mt-1.5 text-xs text-red-600">
                          {errors.state}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">

                    <div>
                      <Input
                        name="pincode"
                        label="PIN Code"
                        value={pincodeValue}
                        onChange={(event) =>
                          setPincodeValue(
                            event.target.value
                              .replace(/\D/g, '')
                              .slice(0, 6)
                          )
                        }
                        placeholder="6-digit PIN code"
                        maxLength={6}
                        inputMode="numeric"
                        pattern="[0-9]{6}"
                        autoComplete="postal-code"
                        required
                      />

                      {pincodeValue.length === 6 && (
                        <p
                          className="mt-1.5 min-h-5 text-[11px] leading-5 text-[#6b6156]"
                          aria-live="polite"
                        >
                          {isPincodeLookingUp ? (
                            <span className="inline-flex items-center gap-2">
                              <span className="h-3 w-3 animate-spin rounded-full border-2 border-[#d9d2c7] border-t-[#b4491e]" />
                              Detecting city and state...
                            </span>
                          ) : pincodeLookupError ? (
                            <span className="text-[#9b3d2c]">
                              {pincodeLookupError}
                            </span>
                          ) : pincodeLocation ? (
                            <span className="text-green-700">
                              ✓ {pincodeLocation.city}, {pincodeLocation.state}
                            </span>
                          ) : null}
                        </p>
                      )}

                      {errors.pincode && (
                        <p className="mt-1.5 text-xs text-red-600">
                          {errors.pincode}
                        </p>
                      )}
                    </div>

                    <div className="hidden items-end sm:flex">
                      <div className="w-full border-l-2 border-[#b4491e] bg-[#f3ede4] px-3.5 py-3 text-[11px] leading-5 text-[#6b6156]">
                        <MapPin className="mr-1.5 inline-block h-3.5 w-3.5 text-[#b4491e]" />
                        Delivery available across
                        India.
                      </div>
                    </div>
                  </div>

                </div>
              </section>

              {/* Order review */}
              <section className="pb-2">
                <div className="mb-5 flex items-baseline gap-3">
                  <span className="font-mono text-[9px] text-[#b4491e]">
                    03
                  </span>

                  <h2 className="font-display text-[19px] font-semibold tracking-[-0.015em]">
                    Order review
                  </h2>
                </div>

                <div className="border-y border-[#d9d2c7]">
                  {cart.map((item, index) => {
                    const itemPrice =
                      getItemPrice(item);

                    return (
                      <div
                        key={`${item.product.id}-${index}`}
                        className="flex items-center gap-4 border-b border-[#ebe6dc] py-4 last:border-b-0"
                      >
                        <div className="h-14 w-14 shrink-0 overflow-hidden border border-[#d9d2c7] bg-white">
                          {item.customPrint ? (
                            <div className="flex h-full w-full items-center justify-center bg-[#f3ede4] text-[#b4491e]">
                              <Home className="h-5 w-5" />
                            </div>
                          ) : (
                            <img
                              src={
                                item.product.image
                              }
                              alt={
                                item.product.name
                              }
                              className="h-full w-full object-cover"
                            />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="text-[14px] font-medium text-[#14120f]">
                            {item.product.name}
                          </p>

                          {item.variantLabel && (
                            <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.08em] text-[#8e8275]">
                              {item.variantLabel}
                            </p>
                          )}

                          {item.customPrint && (
                            <p className="mt-0.5 text-[11px] text-[#8e8275]">
                              Custom print
                            </p>
                          )}

                          <p className="mt-1 text-[11px] text-[#8e8275]">
                            Qty {item.quantity}
                          </p>
                        </div>

                        <p className="font-mono text-[13px] text-[#14120f]">
                          ₹
                          {(
                            itemPrice *
                            item.quantity
                          ).toLocaleString(
                            'en-IN'
                          )}
                        </p>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-5 flex items-start gap-3 border border-[#d9d2c7] bg-white p-4">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#b4491e]" />

                  <p className="text-[12px] leading-5 text-[#6b6156]">
                    Your order is securely saved
                    with your account. We will
                    contact you regarding production
                    and delivery after the order is
                    received.
                  </p>
                </div>

                <div className="mt-5">
                  <Textarea
                    name="notes"
                    label="Order Notes (optional)"
                    placeholder="Special delivery instructions or other notes..."
                    rows={3}
                  />
                </div>

                <div className="mt-7 border-t border-[#d9d2c7] pt-6">
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full"
                    isLoading={isSubmitting}
                  >
                    {isSubmitting
                      ? 'Placing Order...'
                      : `Place Order • ₹${total.toLocaleString(
                          'en-IN'
                        )}`}
                  </Button>

                  <p className="mt-3 text-center font-mono text-[9px] uppercase tracking-[0.08em] text-[#8e8275]">
                    UPI · Cards · Netbanking · NEFT
                  </p>
                </div>
              </section>
            </form>
          </div>

          {/* ====================================================== */}
          {/* SUMMARY                                                 */}
          {/* ====================================================== */}

          <aside className="lg:col-span-5">
            <div className="border border-[#d9d2c7] bg-white p-5 lg:sticky lg:top-28">

              <div className="flex items-center justify-between border-b border-[#ebe6dc] pb-4">
                <h2 className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#8e8275]">
                  Order summary
                </h2>

                <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-[#8e8275]">
                  {cart.length}{' '}
                  {cart.length === 1
                    ? 'item'
                    : 'items'}
                </span>
              </div>

              <div className="divide-y divide-[#ebe6dc]">
                {cart.map((item, index) => {
                  const itemPrice =
                    getItemPrice(item);

                  return (
                    <div
                      key={`${item.product.id}-${index}`}
                      className="flex gap-3 py-4"
                    >
                      <div className="h-14 w-14 shrink-0 overflow-hidden border border-[#d9d2c7] bg-[#f3ede4]">
                        {item.customPrint ? (
                          <div className="flex h-full w-full items-center justify-center text-[#b4491e]">
                            <Home className="h-5 w-5" />
                          </div>
                        ) : (
                          <img
                            src={
                              item.product.image
                            }
                            alt={
                              item.product.name
                            }
                            className="h-full w-full object-cover"
                          />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-[13px] font-medium leading-5 text-[#14120f]">
                          {item.product.name}
                        </p>

                        {item.variantLabel && (
                          <p className="mt-0.5 text-[11px] text-[#8e8275]">
                            {item.variantLabel}
                          </p>
                        )}

                        <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.08em] text-[#8e8275]">
                          Qty {item.quantity}
                        </p>
                      </div>

                      <p className="shrink-0 font-mono text-[12px] text-[#14120f]">
                        ₹
                        {(
                          itemPrice *
                          item.quantity
                        ).toLocaleString(
                          'en-IN'
                        )}
                      </p>
                    </div>
                  );
                })}
              </div>

              <dl className="space-y-3 border-t border-[#d9d2c7] pt-5 text-[13px]">
                <div className="flex justify-between">
                  <dt className="text-[#6b6156]">
                    Subtotal
                  </dt>

                  <dd className="font-mono text-[#14120f]">
                    ₹
                    {subtotal.toLocaleString(
                      'en-IN'
                    )}
                  </dd>
                </div>

                <div className="flex justify-between">
                  <dt className="text-[#6b6156]">
                    Shipping
                  </dt>

                  <dd className="font-mono text-[#14120f]">
                    {shipping === 0
                      ? 'Free'
                      : `₹${shipping.toLocaleString(
                          'en-IN'
                        )}`}
                  </dd>
                </div>

                <div className="flex justify-between">
                  <dt className="text-[#6b6156]">
                    GST
                  </dt>

                  <dd className="font-mono text-[#8e8275]">
                    Included
                  </dd>
                </div>
              </dl>

              {subtotal > 0 &&
                subtotal <
                  freeShippingThreshold && (
                  <div className="mt-4 border-l-2 border-[#b4491e] bg-[#f3ede4] px-3 py-2.5">
                    <p className="text-[11.5px] leading-5 text-[#6b6156]">
                      Add ₹
                      {(
                        freeShippingThreshold -
                        subtotal
                      ).toLocaleString(
                        'en-IN'
                      )}{' '}
                      more for free shipping.
                    </p>
                  </div>
                )}

              <div className="mt-5 flex items-baseline justify-between border-t border-[#d9d2c7] pt-5">
                <span className="text-[14px] font-medium">
                  Total payable
                </span>

                <span className="font-display text-[25px] font-semibold tracking-[-0.02em]">
                  ₹
                  {total.toLocaleString(
                    'en-IN'
                  )}
                </span>
              </div>

              <div className="mt-5 flex items-start gap-2.5 border-t border-[#ebe6dc] pt-4">
                <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#8e8275]" />

                <p className="text-[11px] leading-5 text-[#8e8275]">
                  Your checkout information is
                  submitted securely with your
                  authenticated account.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}