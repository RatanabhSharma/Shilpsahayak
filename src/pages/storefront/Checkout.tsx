import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle,
  Loader2,
  MapPin,
  User,
  Phone,
  Mail,
  Home,
  Map,
} from 'lucide-react';

import { useStore } from '../../store';
import { useAuth } from '../../hooks/useAuth';
import { useUserProfile } from '../../hooks/useUserProfile';
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

  const {
    data: settings,
  } = useSettings();

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

  /*
   * Populate profile information when
   * the user's Firestore profile becomes available.
   */
  useEffect(() => {
    if (!profile) {
      return;
    }

    setStateValue(
      profile.address?.state || ''
    );

    setPhone(
      normalizePhone(profile.phone || '')
    );
  }, [profile]);

  /*
   * Use the same pricing logic as Cart.
   */
  const getItemPrice = (
    item: (typeof cart)[number]
  ) => {
    return (
      item.customPrint?.customPrice ??
      item.product.price
    );
  };

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
   * Submit order.
   */
  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!user) {
      alert('Please login to continue.');
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

    const fullName =
      String(
        formData.get('name') || ''
      ).trim();

    const email =
      String(
        formData.get('email') || ''
      ).trim();

    const phoneNumber =
      normalizePhone(phone);

    const houseNo =
      String(
        formData.get('houseNo') || ''
      ).trim();

    const street =
      String(
        formData.get('street') || ''
      ).trim();

    const landmark =
      String(
        formData.get('landmark') || ''
      ).trim();

    const city =
      String(
        formData.get('city') || ''
      ).trim();

    const pincode =
      String(
        formData.get('pincode') || ''
      ).trim();

    const notes =
      String(
        formData.get('notes') || ''
      ).trim();

    /*
     * Extra validation.
     */
    if (!/^[6-9]\d{9}$/.test(phoneNumber)) {
      alert(
        'Please enter a valid 10-digit Indian mobile number.'
      );
      return;
    }

    if (!/^\d{6}$/.test(pincode)) {
      alert(
        'Please enter a valid 6-digit PIN code.'
      );
      return;
    }

    if (!stateValue) {
      alert('Please select your state.');
      return;
    }

    setIsSubmitting(true);

    /*
     * Keep a legacy formatted address as well.
     *
     * Existing admin/order screens already expect
     * `address: string`, so keeping this field makes
     * the change backward compatible.
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

    const orderData = {
      customerId: user.uid,

      customerName: fullName,

      customerEmail: email,

      customerPhone: phoneNumber,

      /*
       * Backward-compatible address.
       */
      address: formattedAddress,

      /*
       * New structured address.
       */
      shippingAddress,

    items: cart.map((item) => {
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
}),

      total,

      notes,
    };

    try {
      const newOrder =
        await createOrder.mutateAsync(
          orderData
        );

      setOrderId(
        newOrder.id
      );

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
   * Success screen.
   */
  if (isSuccess) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>

        <h1 className="text-2xl font-serif font-bold text-charcoal mb-3">
          Order Placed Successfully!
        </h1>

        <p className="text-charcoal-light mb-2">
          Thank you for your order.
          We will contact you shortly.
        </p>

        <p className="text-sm text-charcoal-lighter mb-8">
          Order ID:{' '}
          <span className="font-medium text-charcoal">
            #{orderId.slice(0, 8)}
          </span>
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/catalog">
            <Button variant="outline">
              Continue Shopping
            </Button>
          </Link>

          <Link to="/">
            <Button>
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  /*
   * Authentication loading.
   */
  if (authLoading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500 mx-auto" />

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
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-serif font-bold text-charcoal mb-3">
          Login Required
        </h2>

        <p className="text-charcoal-light mb-8">
          Please login to continue
          with your order.
        </p>

        <Button
          onClick={() =>
            navigate('/login')
          }
        >
          Login to Continue
        </Button>
      </div>
    );
  }

  /*
   * Profile loading.
   */
  if (profileLoading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500 mx-auto" />

        <p className="text-sm text-charcoal-light mt-4">
          Loading your information...
        </p>
      </div>
    );
  }

  /*
   * Empty cart.
   */
  if (cart.length === 0) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <h2 className="text-xl font-serif text-charcoal mb-4">
          Your cart is empty
        </h2>

        <Link to="/catalog">
          <Button>
            Browse Catalog
          </Button>
        </Link>
      </div>
    );
  }

  /*
   * Checkout page.
   */
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-12">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="flex items-center text-sm text-charcoal-light hover:text-brand-500 transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Cart
      </button>

      <h1 className="text-3xl md:text-4xl font-serif font-bold text-charcoal mb-8">
        Checkout
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-10">
        {/* ============================================================ */}
        {/* LEFT - CHECKOUT FORM                                         */}
        {/* ============================================================ */}

        <div className="lg:col-span-3">
          <Card className="p-6 md:p-8 border-none shadow-sm">
            <form
              onSubmit={handleSubmit}
              className="space-y-8"
            >
              {/* ====================================================== */}
              {/* CONTACT INFORMATION                                     */}
              {/* ====================================================== */}

              <section>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-9 h-9 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center">
                    <User className="w-4 h-4" />
                  </div>

                  <div>
                    <h2 className="font-serif font-semibold text-xl text-charcoal">
                      Contact Information
                    </h2>

                    <p className="text-xs text-charcoal-light mt-0.5">
                      How we can contact you about your order
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <Input
                    name="name"
                    label="Full Name"
                    defaultValue={
                      profile?.name ||
                      user.displayName ||
                      ''
                    }
                    placeholder="Your full name"
                    required
                  />

                  <div>
                    <Input
                      name="phone"
                      label="Phone Number"
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
                      required
                    />

                    <p className="text-xs text-charcoal-lighter mt-1.5">
                      +91 will be used for delivery contact.
                    </p>
                  </div>
                </div>

                <div className="mt-5">
                  <Input
                    name="email"
                    label="Email Address"
                    type="email"
                    defaultValue={
                      profile?.email ||
                      user.email ||
                      ''
                    }
                    placeholder="you@example.com"
                    required
                  />
                </div>
              </section>

              {/* ====================================================== */}
              {/* DELIVERY ADDRESS                                        */}
              {/* ====================================================== */}

              <section className="border-t border-brand-100 pt-7">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-9 h-9 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center">
                    <MapPin className="w-4 h-4" />
                  </div>

                  <div>
                    <h2 className="font-serif font-semibold text-xl text-charcoal">
                      Delivery Address
                    </h2>

                    <p className="text-xs text-charcoal-light mt-0.5">
                      Where should we deliver your order?
                    </p>
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <Input
                      name="houseNo"
                      label="House / Flat / Building No."
                      defaultValue={
                        profile?.address?.line1 ||
                        ''
                      }
                      placeholder="e.g. 123, Flat 4B"
                      required
                    />

                    <Input
                      name="street"
                      label="Street / Locality"
                      defaultValue={
                        profile?.address?.line2 ||
                        ''
                      }
                      placeholder="e.g. Model Town"
                      required
                    />
                  </div>

                  <Input
                    name="landmark"
                    label="Landmark (optional)"
                    placeholder="e.g. Near Bus Stand"
                    defaultValue=""
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <Input
                      name="city"
                      label="City"
                      defaultValue={
                        profile?.address?.city ||
                        ''
                      }
                      placeholder="e.g. Patiala"
                      required
                    />

                    <div>
                      <label className="block text-sm font-medium text-charcoal mb-1.5">
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
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <Input
                      name="pincode"
                      label="PIN Code"
                      defaultValue={
                        profile?.address?.pincode ||
                        ''
                      }
                      placeholder="6-digit PIN code"
                      maxLength={6}
                      inputMode="numeric"
                      pattern="[0-9]{6}"
                      required
                    />

                    <div className="hidden sm:flex items-end">
                      <div className="w-full rounded-xl bg-brand-50 px-4 py-3 text-xs text-charcoal-light">
                        <Map className="w-4 h-4 text-brand-500 inline-block mr-2 align-middle" />
                        Delivery currently available across India.
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* ====================================================== */}
              {/* ORDER NOTES                                             */}
              {/* ====================================================== */}

              <section className="border-t border-brand-100 pt-7">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-9 h-9 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center">
                    <Home className="w-4 h-4" />
                  </div>

                  <div>
                    <h2 className="font-serif font-semibold text-xl text-charcoal">
                      Order Notes
                    </h2>

                    <p className="text-xs text-charcoal-light mt-0.5">
                      Optional instructions for your order
                    </p>
                  </div>
                </div>

                <Textarea
                  name="notes"
                  label="Special Instructions (optional)"
                  placeholder="Any special delivery or order instructions..."
                  rows={4}
                />
              </section>

              {/* ====================================================== */}
              {/* SUBMIT                                                   */}
              {/* ====================================================== */}

              <div className="border-t border-brand-100 pt-7">
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

                <p className="text-xs text-center text-charcoal-lighter mt-3">
                  Your order details will be securely saved
                  with your account.
                </p>
              </div>
            </form>
          </Card>
        </div>

        {/* ============================================================ */}
        {/* RIGHT - ORDER SUMMARY                                        */}
        {/* ============================================================ */}

        <div className="lg:col-span-2">
          <Card className="p-6 border-none shadow-sm sticky top-28">
            <h2 className="font-serif font-semibold text-xl text-charcoal mb-6">
              Order Summary
            </h2>

            <div className="space-y-5 mb-6">
              {cart.map((item, index) => {
                const itemPrice =
                  getItemPrice(item);

                return (
                  <div
                    key={`${item.product.id}-${index}`}
                    className="flex gap-4"
                  >
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-surface-dark flex-shrink-0">
                      {item.customPrint ? (
                        <div className="w-full h-full flex items-center justify-center bg-brand-50 text-brand-500">
                          <MapPin className="w-6 h-6" />
                        </div>
                      ) : (
                        <img
                          src={item.product.image}
                          alt={item.product.name}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-charcoal text-sm line-clamp-1">
                        {item.product.name}
                      </p>

                      {item.variantLabel && (
                        <p className="text-xs text-charcoal-light mt-0.5">
                          {item.variantLabel}
                        </p>
                      )}

                      <p className="text-xs text-charcoal-lighter mt-0.5">
                        Qty: {item.quantity}
                      </p>

                      <p className="text-sm font-medium text-brand-600 mt-1">
                        ₹
                        {(
                          itemPrice *
                          item.quantity
                        ).toLocaleString(
                          'en-IN'
                        )}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-brand-100 pt-5 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-charcoal-light">
                  Subtotal
                </span>

                <span className="text-charcoal">
                  ₹
                  {subtotal.toLocaleString(
                    'en-IN'
                  )}
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-charcoal-light">
                  Shipping
                </span>

                <span className="text-charcoal">
                  {shipping === 0
                    ? 'Free'
                    : `₹${shipping.toLocaleString(
                        'en-IN'
                      )}`}
                </span>
              </div>

              {subtotal > 0 &&
                subtotal <
                  freeShippingThreshold && (
                  <div className="rounded-xl bg-brand-50 px-3 py-2">
                    <p className="text-xs text-brand-600">
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

              <div className="flex justify-between items-center text-base font-semibold pt-4 border-t border-brand-100">
                <span className="text-charcoal">
                  Total
                </span>

                <span className="text-xl text-brand-600">
                  ₹
                  {total.toLocaleString(
                    'en-IN'
                  )}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}