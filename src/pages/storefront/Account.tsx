import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FileText,
  LogOut,
  Package,
  MapPin,
  User,
  RefreshCw,
  ShoppingCart,
  CheckCircle,
  XCircle,
  X,
} from 'lucide-react';

import { useAuth } from '../../hooks/useAuth';
import { usePincodeLookup } from '../../hooks/usePincodeLookup';

import {
  emptyAddress,
  useSaveUserProfile,
  useUserProfile,
  type UserAddress,
} from '../../hooks/useUserProfile';

import {
  useMyQuotes,
  useUpdateQuote,
} from '../../hooks/useQuotes';

import {
  useMyOrders,
  useReorderOrder,
} from '../../hooks/useOrders';

import {
  Card,
  Button,
  Input,
} from '../../components/ui';

/* -------------------------------------------------------------------------- */
/* Status styling                                                             */
/* -------------------------------------------------------------------------- */

const STATUS_STYLES: Record<string, string> = {
  Pending: 'border-amber-200 bg-amber-50 text-amber-700',
  Quoted: 'border-blue-200 bg-blue-50 text-blue-700',
  Accepted: 'border-green-200 bg-green-50 text-green-700',
  Rejected: 'border-red-200 bg-red-50 text-red-700',
  Completed: 'border-purple-200 bg-purple-50 text-purple-700',
  Confirmed: 'border-blue-200 bg-blue-50 text-blue-700',
  Printing: 'border-purple-200 bg-purple-50 text-purple-700',
  'Quality Check':
    'border-indigo-200 bg-indigo-50 text-indigo-700',
  Shipped: 'border-cyan-200 bg-cyan-50 text-cyan-700',
  Delivered: 'border-green-200 bg-green-50 text-green-700',
  Cancelled: 'border-red-200 bg-red-50 text-red-700',
};

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function getInitials(name?: string | null) {
  if (!name) {
    return 'SS';
  }

  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

/* -------------------------------------------------------------------------- */
/* Account                                                                    */
/* -------------------------------------------------------------------------- */

export function Account() {
  const {
    user,
    logout,
    loading: authLoading,
    updateAccount,
  } = useAuth();

  const {
    data: profile,
    isLoading: profileLoading,
    isError: profileLoadError,
  } = useUserProfile();

  const saveUserProfile = useSaveUserProfile();

  const {
    data: myQuotes = [],
    isLoading: quotesLoading,
  } = useMyQuotes();

  const {
    data: myOrders = [],
    isLoading: ordersLoading,
    refetch: refetchOrders,
  } = useMyOrders();

  const updateQuote = useUpdateQuote();
  const reorderOrder = useReorderOrder();

  const navigate = useNavigate();

  const [activeTab, setActiveTab] =
    useState<'orders' | 'quotes' | 'addresses' | 'profile'>(
      'orders'
    );

  const [selectedOrder, setSelectedOrder] =
    useState<typeof myOrders[number] | null>(null);

  const [profileMessage, setProfileMessage] =
    useState('');

  const [profileError, setProfileError] =
    useState('');

  const [isProfileEditing, setIsProfileEditing] =
    useState(false);

  const [profileName, setProfileName] =
    useState('');

  const [profileEmail, setProfileEmail] =
    useState('');

  const [profilePhone, setProfilePhone] =
    useState('');

  const [addressMessage, setAddressMessage] =
    useState('');

  const [addressError, setAddressError] =
    useState('');

  const [isAddressEditing, setIsAddressEditing] =
    useState(false);

  const [profileAddress, setProfileAddress] =
    useState<UserAddress>(emptyAddress);

  const {
    location: pincodeLocation,
    isLookingUp: isPincodeLookingUp,
    error: pincodeLookupError,
  } = usePincodeLookup(
    profileAddress.pincode,
    isAddressEditing
  );

  const [isLoggingOut, setIsLoggingOut] =
    useState(false);

  /* ------------------------------------------------------------------------ */
  /* Editable customer profile                                                */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    if (!profile) {
      return;
    }

    setProfileName(
      profile.name ||
        user?.displayName ||
        ''
    );

    setProfileEmail(
      profile.email ||
        user?.email ||
        ''
    );

    setProfilePhone(
      profile.phone || ''
    );

    if (!isAddressEditing) {
      setProfileAddress({
        line1: profile.address?.line1 || '',
        line2: profile.address?.line2 || '',
        city: profile.address?.city || '',
        state: profile.address?.state || '',
        pincode: profile.address?.pincode || '',
      });
    }
  }, [
    profile,
    user?.displayName,
    user?.email,
    isAddressEditing,
  ]);

  /* ------------------------------------------------------------------------ */
  /* Automatic PIN code lookup                                                */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    if (!pincodeLocation) {
      return;
    }

    setProfileAddress((current) => ({
      ...current,
      city: pincodeLocation.city,
      state: pincodeLocation.state,
      pincode: pincodeLocation.pincode,
    }));
  }, [pincodeLocation]);

  /* ------------------------------------------------------------------------ */
  /* Profile and address editing                                              */
  /* ------------------------------------------------------------------------ */

  const startProfileEditing = () => {
    setProfileError('');
    setProfileMessage('');

    setProfileName(
      profile?.name ||
        user?.displayName ||
        ''
    );

    setProfileEmail(
      profile?.email ||
        user?.email ||
        ''
    );

    setProfilePhone(
      profile?.phone ||
      ''
    );

    setIsProfileEditing(true);
  };

  const cancelProfileEditing = () => {
    setProfileError('');
    setProfileMessage('');
    setIsProfileEditing(false);
  };

  const startAddressEditing = () => {
    setAddressError('');
    setAddressMessage('');

    setProfileAddress({
      line1: profile?.address?.line1 || '',
      line2: profile?.address?.line2 || '',
      city: profile?.address?.city || '',
      state: profile?.address?.state || '',
      pincode: profile?.address?.pincode || '',
    });

    setIsAddressEditing(true);
  };

  const cancelAddressEditing = () => {
    setAddressError('');
    setAddressMessage('');
    setIsAddressEditing(false);
  };

  const updateAddressField = (
    field: keyof UserAddress,
    value: string
  ) => {
    setProfileAddress((current) => ({
      ...current,
      [field]: value,
    }));
  };

  /* ------------------------------------------------------------------------ */
  /* Save profile                                                             */
  /* ------------------------------------------------------------------------ */

  const handleSaveProfile = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!user || saveUserProfile.isPending) {
      return;
    }

    setProfileError('');
    setProfileMessage('');

    const name = profileName.trim();
    const email = profileEmail.trim().toLowerCase();
    const phone = profilePhone
      .replace(/\D/g, '')
      .slice(0, 10);

    const address: UserAddress = {
      line1: profile?.address?.line1 || '',
      line2: profile?.address?.line2 || '',
      city: profile?.address?.city || '',
      state: profile?.address?.state || '',
      pincode: profile?.address?.pincode || '',
    };

    if (name.length < 2) {
      setProfileError('Please enter your full name.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setProfileError('Please enter a valid email address.');
      return;
    }

    if (!/^[6-9]\d{9}$/.test(phone)) {
      setProfileError(
        'Please enter a valid 10-digit Indian mobile number.'
      );
      return;
    }

    try {
      await updateAccount({
        name,
        email,
      });

      await saveUserProfile.mutateAsync({
        name,
        email,
        phone,
        address,
      });

      setProfileMessage(
        email !== user?.email
          ? 'Profile updated. A verification email has been sent to your new email address.'
          : 'Profile updated successfully.'
      );

      setIsProfileEditing(false);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to update your profile. Please try again.';

      if (message.includes('auth/requires-recent-login')) {
        setProfileError(
          'For security, Firebase requires you to sign in again before changing your email. Please sign out and sign in again, then retry.'
        );
      } else if (message.includes('auth/email-already-in-use')) {
        setProfileError(
          'That email address is already in use by another account.'
        );
      } else if (message.includes('auth/invalid-email')) {
        setProfileError('Please enter a valid email address.');
      } else {
        setProfileError(message);
      }
    }
  };

  /* ------------------------------------------------------------------------ */
  /* Save address                                                             */
  /* ------------------------------------------------------------------------ */

  const handleSaveAddress = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!user || saveUserProfile.isPending) {
      return;
    }

    setAddressError('');
    setAddressMessage('');

    const address: UserAddress = {
      line1: profileAddress.line1.trim(),
      line2: profileAddress.line2.trim(),
      city: profileAddress.city.trim(),
      state: profileAddress.state.trim(),
      pincode: profileAddress.pincode
        .replace(/\D/g, '')
        .slice(0, 6),
    };

    if (!address.line1) {
      setAddressError(
        'Please enter your house, flat, or building details.'
      );
      return;
    }

    if (!address.city) {
      setAddressError('Please enter your city.');
      return;
    }

    if (!address.state) {
      setAddressError('Please select your state.');
      return;
    }

    if (!/^\d{6}$/.test(address.pincode)) {
      setAddressError('Please enter a valid 6-digit PIN code.');
      return;
    }

    try {
      await saveUserProfile.mutateAsync({
        name: profile?.name || user.displayName || '',
        email: profile?.email || user.email || '',
        phone: profile?.phone || '',
        address,
      });

      setAddressMessage('Saved address updated successfully.');
      setIsAddressEditing(false);
    } catch (error) {
      setAddressError(
        error instanceof Error
          ? error.message
          : 'Unable to save your address. Please try again.'
      );
    }
  };

  /* ------------------------------------------------------------------------ */
  /* Logout                                                                   */
  /* ------------------------------------------------------------------------ */

  const handleLogout = async () => {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);

    try {
      await logout();

      navigate('/', {
        replace: true,
      });
    } catch (error) {
      console.error(
        'Logout failed:',
        error
      );

      setIsLoggingOut(false);
    }
  };

  /* ------------------------------------------------------------------------ */
  /* Quote actions                                                            */
  /* ------------------------------------------------------------------------ */

  const handleAcceptQuote = async (
    quoteId: string
  ) => {
    try {
      await updateQuote.mutateAsync({
        id: quoteId,
        status: 'Accepted',
      });
    } catch (error) {
      console.error(
        'Failed to accept quote:',
        error
      );

      alert(
        'Failed to accept quote. Please try again.'
      );
    }
  };

  const handleRejectQuote = async (
    quoteId: string
  ) => {
    const confirmed =
      window.confirm(
        'Are you sure you want to decline this quote?'
      );

    if (!confirmed) {
      return;
    }

    try {
      await updateQuote.mutateAsync({
        id: quoteId,
        status: 'Rejected',
      });
    } catch (error) {
      console.error(
        'Failed to decline quote:',
        error
      );

      alert(
        'Failed to decline quote. Please try again.'
      );
    }
  };

  /* ------------------------------------------------------------------------ */
  /* Refresh orders                                                           */
  /* ------------------------------------------------------------------------ */

  const handleRefreshOrders = async () => {
    try {
      await refetchOrders();
    } catch (error) {
      console.error(
        'Failed to refresh orders:',
        error
      );
    }
  };

  /* ------------------------------------------------------------------------ */
  /* Reorder                                                                  */
  /* ------------------------------------------------------------------------ */

  const handleOrderAgain = async (
    order: typeof myOrders[number]
  ) => {
    try {
      await reorderOrder.mutateAsync(order);

      navigate('/cart');
    } catch (error) {
      console.error(
        'Failed to reorder:',
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : 'Unable to reorder this order. Please try again.'
      );
    }
  };

  /* ------------------------------------------------------------------------ */
  /* Loading                                                                  */
  /* ------------------------------------------------------------------------ */

  if (authLoading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-[#f7f4ee]">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[#d9d2c7] border-t-[#b4491e]" />

          <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.14em] text-[#8e8275]">
            Checking account
          </p>
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------------------ */
  /* Not logged in                                                            */
  /* ------------------------------------------------------------------------ */

  if (!user) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-[#f7f4ee] px-5">
        <div className="max-w-md text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center border border-[#d9d2c7] bg-white text-[#b4491e]">
            <User className="h-6 w-6" />
          </div>

          <h1 className="mt-6 font-display text-[28px] font-semibold tracking-[-0.025em] text-[#14120f]">
            You are signed out
          </h1>

          <p className="mt-3 text-[14px] leading-6 text-[#6b6156]">
            Sign in to see your orders, quotes,
            saved information and account details.
          </p>

          <div className="mt-7 flex justify-center gap-3">
            <Link to="/login">
              <Button>
                Sign in
              </Button>
            </Link>

            <Link to="/catalog">
              <Button variant="outline">
                Keep browsing
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------------------ */
  /* Active order                                                             */
  /* ------------------------------------------------------------------------ */

  const activeOrder =
    myOrders.find(
      (order) =>
        order.status !== 'Delivered' &&
        order.status !== 'Cancelled'
    );

  /* ------------------------------------------------------------------------ */
  /* Page                                                                     */
  /* ------------------------------------------------------------------------ */

  return (
    <>
      {/* ================================================================== */}
      {/* ACCOUNT HEADER                                                     */}
      {/* ================================================================== */}

      <section className="border-b border-[#d9d2c7] bg-white">
        <div className="mx-auto max-w-[1200px] px-5 py-9 sm:px-8 lg:px-10">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center border border-[#d9d2c7] bg-[#f7f4ee] font-display text-[19px] font-semibold text-[#14120f]">
                {getInitials(user?.displayName)}
              </div>

              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#8e8275]">
                  Customer account
                </p>

                <h1 className="mt-1 font-display text-[26px] font-semibold leading-tight tracking-[-0.025em] text-[#14120f]">
                  {user?.displayName || 'My Account'}
                </h1>

                <p className="text-[13.5px] text-[#6b6156]">
                  {user?.email}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link to="/custom-service">
                <Button size="sm">
                  Start a custom print
                </Button>
              </Link>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                disabled={isLoggingOut}
              >
                <LogOut className="mr-1.5 h-3.5 w-3.5" />

                {isLoggingOut
                  ? 'Signing out...'
                  : 'Sign out'}
              </Button>
            </div>
          </div>

          {/* Active order */}

          {activeOrder && (
            <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-2 border-l-2 border-[#b4491e] bg-[#f7f4ee] px-4 py-3">
              <p className="text-[13.5px] text-[#14120f]">
                <span className="font-medium">
                  Order #{activeOrder.id.slice(0, 8)}
                </span>

                {' is currently '}

                <span className="font-medium text-[#b4491e]">
                  {activeOrder.status.toLowerCase()}
                </span>
              </p>

              <button
                type="button"
                onClick={() =>
                  setSelectedOrder(activeOrder)
                }
                className="font-mono text-[9px] uppercase tracking-[0.1em] text-[#b4491e] underline underline-offset-4 hover:text-[#14120f]"
              >
                See details
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ================================================================== */}
      {/* MAIN ACCOUNT AREA                                                  */}
      {/* ================================================================== */}

      <main className="min-h-[60vh] bg-[#f7f4ee]">
        <div className="mx-auto max-w-[1200px] px-5 py-8 sm:px-8 lg:px-10">

          {/* Tabs */}

          <div className="overflow-x-auto border-b border-[#d9d2c7]">
            <div className="flex min-w-max">
              {[
                {
                  id: 'orders',
                  label: 'Orders',
                  count: myOrders.length,
                  icon: Package,
                },
                {
                  id: 'quotes',
                  label: 'Quotes',
                  count: myQuotes.length,
                  icon: FileText,
                },
                {
                  id: 'addresses',
                  label: 'Saved address',
                  icon: MapPin,
                },
                {
                  id: 'profile',
                  label: 'Profile',
                  icon: User,
                },
              ].map((tab) => {
                const Icon = tab.icon;
                const active =
                  activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() =>
                      setActiveTab(
                        tab.id as typeof activeTab
                      )
                    }
                    className={`flex items-center gap-2 border-b-2 px-5 py-3 font-mono text-[9px] uppercase tracking-[0.1em] transition-colors ${
                      active
                        ? 'border-[#b4491e] text-[#b4491e]'
                        : 'border-transparent text-[#8e8275] hover:text-[#14120f]'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />

                    {tab.label}

                    {tab.count !== undefined && (
                      <span className="text-[8px] opacity-70">
                        ({tab.count})
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ================================================================= */}
          {/* ORDERS                                                           */}
          {/* ================================================================= */}

          {activeTab === 'orders' && (
            <div className="mt-8">
              <div className="mb-6 flex items-center justify-between gap-4">
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#8e8275]">
                    Purchase history
                  </p>

                  <h2 className="mt-1 font-display text-[21px] font-semibold tracking-[-0.015em] text-[#14120f]">
                    Your orders
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={handleRefreshOrders}
                  disabled={ordersLoading}
                  className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.1em] text-[#b4491e] disabled:opacity-50"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${
                      ordersLoading
                        ? 'animate-spin'
                        : ''
                    }`}
                  />

                  Refresh
                </button>
              </div>

              {ordersLoading ? (
                <div className="py-20 text-center">
                  <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-[#d9d2c7] border-t-[#b4491e]" />

                  <p className="mt-4 text-sm text-[#6b6156]">
                    Loading your orders...
                  </p>
                </div>
              ) : myOrders.length === 0 ? (
                <Card className="border-[#d9d2c7] bg-white p-12 text-center shadow-none">
                  <Package className="mx-auto h-10 w-10 text-[#b8aea0]" />

                  <h3 className="mt-4 font-display text-[19px] font-semibold text-[#14120f]">
                    No orders yet
                  </h3>

                  <p className="mt-2 text-[14px] text-[#6b6156]">
                    Your completed and active orders
                    will appear here.
                  </p>

                  <div className="mt-6">
                    <Link to="/catalog">
                      <Button>
                        Browse catalogue
                      </Button>
                    </Link>
                  </div>
                </Card>
              ) : (
                <div className="space-y-4">
                  {myOrders.map((order) => (
                    <Card
                      key={order.id}
                      className="border-[#d9d2c7] bg-white p-5 shadow-none sm:p-6"
                    >
                      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-3">
                            <h3 className="font-mono text-[13px] font-medium text-[#14120f]">
                              #{order.id.slice(0, 8)}
                            </h3>

                            <span
                              className={`border px-2.5 py-1 font-mono text-[8px] uppercase tracking-[0.08em] ${
                                STATUS_STYLES[
                                  order.status
                                ] ||
                                'border-gray-200 bg-gray-50 text-gray-700'
                              }`}
                            >
                              {order.status}
                            </span>
                          </div>

                          <p className="mt-2 text-[13.5px] text-[#6b6156]">
                            {order.items.length}{' '}
                            item
                            {order.items.length !== 1
                              ? 's'
                              : ''}

                            {' · '}

                            {new Date(
                              order.date
                            ).toLocaleDateString(
                              'en-IN',
                              {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              }
                            )}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          <div className="text-left sm:text-right">
                            <p className="font-mono text-[8px] uppercase tracking-[0.1em] text-[#8e8275]">
                              Total
                            </p>

                            <p className="mt-1 font-display text-[20px] font-semibold text-[#14120f]">
                              ₹
                              {order.total.toLocaleString(
                                'en-IN'
                              )}
                            </p>
                          </div>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setSelectedOrder(order)
                            }
                          >
                            View details
                          </Button>

                          <Button
                            size="sm"
                            onClick={() =>
                              handleOrderAgain(order)
                            }
                            disabled={
                              reorderOrder.isPending
                            }
                          >
                            <ShoppingCart className="mr-1.5 h-3.5 w-3.5" />

                            {reorderOrder.isPending
                              ? 'Adding...'
                              : 'Order again'}
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ================================================================= */}
          {/* QUOTES                                                           */}
          {/* ================================================================= */}

          {activeTab === 'quotes' && (
            <div className="mt-8">
              <div className="mb-6">
                <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#8e8275]">
                  Custom printing
                </p>

                <h2 className="mt-1 font-display text-[21px] font-semibold tracking-[-0.015em] text-[#14120f]">
                  Your quotes
                </h2>
              </div>

              {quotesLoading ? (
                <div className="py-20 text-center">
                  <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-[#d9d2c7] border-t-[#b4491e]" />

                  <p className="mt-4 text-sm text-[#6b6156]">
                    Loading your quotes...
                  </p>
                </div>
              ) : myQuotes.length === 0 ? (
                <Card className="border-[#d9d2c7] bg-white p-12 text-center shadow-none">
                  <FileText className="mx-auto h-10 w-10 text-[#b8aea0]" />

                  <h3 className="mt-4 font-display text-[19px] font-semibold text-[#14120f]">
                    No quotes yet
                  </h3>

                  <p className="mx-auto mt-2 max-w-md text-[14px] leading-6 text-[#6b6156]">
                    Upload your model and request a
                    custom print quote. Your requests
                    will appear here.
                  </p>

                  <div className="mt-6">
                    <Link to="/custom-service">
                      <Button>
                        Upload a model
                      </Button>
                    </Link>
                  </div>
                </Card>
              ) : (
                <div className="overflow-x-auto border border-[#d9d2c7] bg-white">
                  <table className="w-full min-w-[760px] border-collapse text-left">
                    <thead>
                      <tr className="border-b border-[#14120f]">
                        {[
                          'Quote',
                          'File',
                          'Settings',
                          'Status',
                          'Amount',
                          '',
                        ].map((heading) => (
                          <th
                            key={heading}
                            className="px-4 py-3 font-mono text-[8px] uppercase tracking-[0.12em] text-[#8e8275]"
                          >
                            {heading}
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody>
                      {myQuotes.map((quote) => (
                        <tr
                          key={quote.id}
                          className="border-b border-[#ebe6dc] align-top last:border-b-0"
                        >
                          <td className="px-4 py-4 font-mono text-[12px] text-[#14120f]">
                            #{quote.id.slice(0, 8)}
                          </td>

                          <td className="px-4 py-4">
                            <p className="max-w-[220px] truncate font-mono text-[12px] text-[#14120f]">
                              {quote.fileName}
                            </p>

                            <p className="mt-1 text-[11px] text-[#8e8275]">
                              Submitted{' '}
                              {new Date(
                                quote.date
                              ).toLocaleDateString(
                                'en-IN',
                                {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                }
                              )}
                            </p>
                          </td>

                          <td className="px-4 py-4 text-[12px] text-[#6b6156]">
                            <p>
                              {quote.material}
                              {' · '}
                              {quote.color}
                            </p>

                            <p className="mt-1 font-mono text-[9px] text-[#8e8275]">
                              {quote.infill}% infill
                            </p>
                          </td>

                          <td className="px-4 py-4">
                            <span
                              className={`inline-flex border px-2.5 py-1 font-mono text-[8px] uppercase tracking-[0.08em] ${
                                STATUS_STYLES[
                                  quote.status
                                ] ||
                                'border-gray-200 bg-gray-50 text-gray-700'
                              }`}
                            >
                              {quote.status}
                            </span>
                          </td>

                          <td className="px-4 py-4 font-mono text-[12px] text-[#14120f]">
                            {quote.adminPrice ? (
                              <>
                                ₹
                                {quote.adminPrice.toLocaleString(
                                  'en-IN'
                                )}

                                <span className="mt-1 block text-[8px] uppercase tracking-[0.08em] text-green-600">
                                  Final quote
                                </span>
                              </>
                            ) : (
                              <>
                                ₹
                                {(
                                  quote.estimatedPrice ??
                                  0
                                ).toLocaleString(
                                  'en-IN'
                                )}

                                <span className="mt-1 block text-[8px] uppercase tracking-[0.08em] text-[#8e8275]">
                                  Estimate
                                </span>
                              </>
                            )}
                          </td>

                          <td className="px-4 py-4 text-right">
                            {quote.status === 'Quoted' &&
                            quote.adminPrice ? (
                              <div className="flex justify-end gap-2">
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    handleAcceptQuote(
                                      quote.id
                                    )
                                  }
                                  disabled={
                                    updateQuote.isPending
                                  }
                                >
                                  <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                                  Accept
                                </Button>

                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    handleRejectQuote(
                                      quote.id
                                    )
                                  }
                                  disabled={
                                    updateQuote.isPending
                                  }
                                >
                                  <XCircle className="mr-1.5 h-3.5 w-3.5" />
                                  Decline
                                </Button>
                              </div>
                            ) : (
                              <Link to="/custom-service">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                >
                                  New quote
                                </Button>
                              </Link>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ================================================================= */}
          {/* SAVED ADDRESS                                                   */}
          {/* ================================================================= */}

          {activeTab === 'addresses' && (
            <div className="mt-8">
              <div className="mb-6">
                <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#8e8275]">
                  Delivery details
                </p>

                <h2 className="mt-1 font-display text-[21px] font-semibold tracking-[-0.015em] text-[#14120f]">
                  Saved address
                </h2>

                <p className="mt-2 max-w-xl text-[13.5px] leading-6 text-[#6b6156]">
                  Manage the address used for future orders and custom print requests.
                </p>
              </div>

              <Card className="max-w-2xl border-[#d9d2c7] bg-white p-6 shadow-none">
                {profileLoading ? (
                  <div className="flex items-center gap-3 py-6">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#d9d2c7] border-t-[#b4491e]" />

                    <p className="text-[13px] text-[#6b6156]">
                      Loading saved address...
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center bg-[#f7f4ee] text-[#b4491e]">
                          <MapPin className="h-4 w-4" />
                        </div>

                        <div>
                          <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-[#8e8275]">
                            Primary address
                          </p>

                          <h3 className="mt-1 text-[15px] font-medium text-[#14120f]">
                            {profile?.name ||
                              user?.displayName ||
                              'Customer'}
                          </h3>
                        </div>
                      </div>

                      <span className="border border-green-200 bg-green-50 px-2.5 py-1 font-mono text-[8px] uppercase tracking-[0.08em] text-green-700">
                        Saved
                      </span>
                    </div>

                    {profile?.address &&
                    Object.values(
                      profile.address
                    ).some(Boolean) ? (
                      <div className="mt-5 border-t border-[#ebe6dc] pt-5">
                        <p className="text-[13.5px] leading-6 text-[#6b6156]">
                          {profile.address.line1}

                          {profile.address.line2
                            ? `, ${profile.address.line2}`
                            : ''}

                          {profile.address.city
                            ? `, ${profile.address.city}`
                            : ''}

                          {profile.address.state
                            ? `, ${profile.address.state}`
                            : ''}

                          {profile.address.pincode
                            ? ` - ${profile.address.pincode}`
                            : ''}
                        </p>
                      </div>
                    ) : (
                      <div className="mt-5 border-t border-[#ebe6dc] pt-5">
                        <p className="text-[13.5px] leading-6 text-[#6b6156]">
                          No saved address yet. Add one to speed up checkout.
                        </p>
                      </div>
                    )}

                    <div className="mt-5 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        onClick={startAddressEditing}
                      >
                        {profile?.address &&
                        Object.values(
                          profile.address
                        ).some(Boolean)
                          ? 'Edit address'
                          : 'Add address'}
                      </Button>

                      <Link to="/checkout">
                        <Button
                          size="sm"
                          variant="outline"
                        >
                          Continue to checkout
                        </Button>
                      </Link>
                    </div>

                    {isAddressEditing && (
                      <form
                        onSubmit={handleSaveAddress}
                        className="mt-6 border-t border-[#d9d2c7] pt-6"
                      >
                        <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-[#8e8275]">
                          Edit saved address
                        </p>

                        <div className="mt-4 space-y-4">
                          <Input
                            name="addressLine1"
                            label="House / Flat / Building"
                            value={profileAddress.line1}
                            onChange={(event) =>
                              updateAddressField(
                                'line1',
                                event.target.value
                              )
                            }
                            autoComplete="address-line1"
                            placeholder="House no., flat, building"
                            required
                          />

                          <Input
                            name="addressLine2"
                            label="Street / Locality"
                            value={profileAddress.line2}
                            onChange={(event) =>
                              updateAddressField(
                                'line2',
                                event.target.value
                              )
                            }
                            autoComplete="address-line2"
                            placeholder="Street, locality, area"
                          />

                          <div className="grid gap-4 sm:grid-cols-2">
                            <Input
                              name="addressCity"
                              label="City"
                              value={profileAddress.city}
                              onChange={(event) =>
                                updateAddressField(
                                  'city',
                                  event.target.value
                                )
                              }
                              autoComplete="address-level2"
                              placeholder="City"
                              required
                            />

                            <Input
                              name="addressState"
                              label="State"
                              value={profileAddress.state}
                              onChange={(event) =>
                                updateAddressField(
                                  'state',
                                  event.target.value
                                )
                              }
                              autoComplete="address-level1"
                              placeholder="State"
                              required
                            />
                          </div>

                          <Input
                            name="addressPincode"
                            label="PIN Code"
                            value={profileAddress.pincode}
                            onChange={(event) =>
                              updateAddressField(
                                'pincode',
                                event.target.value
                                  .replace(/\D/g, '')
                                  .slice(0, 6)
                              )
                            }
                            autoComplete="postal-code"
                            inputMode="numeric"
                            maxLength={6}
                            placeholder="6-digit PIN code"
                            required
                          />

                          {profileAddress.pincode.length === 6 && (
                            <div
                              className="min-h-5 text-[11px] leading-5 text-[#6b6156]"
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
                                  ✓ {pincodeLocation.city},{' '}
                                  {pincodeLocation.state}
                                </span>
                              ) : null}
                            </div>
                          )}

                          <p className="text-[11px] leading-5 text-[#8e8275]">
                            Enter your 6-digit PIN and we’ll automatically fill the city and state.
                          </p>

                          <div className="flex flex-wrap gap-2 pt-2">
                            <Button
                              type="submit"
                              isLoading={
                                saveUserProfile.isPending
                              }
                            >
                              Save address
                            </Button>

                            <Button
                              type="button"
                              variant="outline"
                              onClick={
                                cancelAddressEditing
                              }
                              disabled={
                                saveUserProfile.isPending
                              }
                            >
                              Cancel
                            </Button>
                          </div>

                          {addressError && (
                            <div
                              role="alert"
                              className="border border-red-200 bg-red-50 px-4 py-3 text-[13px] leading-5 text-red-700"
                            >
                              {addressError}
                            </div>
                          )}

                          {addressMessage && (
                            <div
                              role="status"
                              className="border border-green-200 bg-green-50 px-4 py-3 text-[13px] leading-5 text-green-700"
                            >
                              {addressMessage}
                            </div>
                          )}
                        </div>
                      </form>
                    )}
                  </>
                )}
              </Card>
            </div>
          )}

          {/* ================================================================= */}
          {/* PROFILE                                                          */}
          {/* ================================================================= */}

          {activeTab === 'profile' && (
            <div className="mt-8 grid gap-10 lg:grid-cols-12">
              <div className="lg:col-span-7">
                <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#8e8275]">
                  Account details
                </p>

                <h2 className="mt-1 font-display text-[21px] font-semibold tracking-[-0.015em] text-[#14120f]">
                  Profile
                </h2>

                <p className="mt-2 text-[13.5px] leading-6 text-[#6b6156]">
                  Update your personal information here. Orders and quotes remain view-only.
                </p>

                {profileLoading ? (
                  <div className="mt-6 flex items-center gap-3 py-8">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#d9d2c7] border-t-[#b4491e]" />

                    <p className="text-[13px] text-[#6b6156]">
                      Loading your profile...
                    </p>
                  </div>
                ) : (
                  <form
                    className="mt-6 space-y-5"
                    onSubmit={handleSaveProfile}
                  >
                    <Input
                      name="profileName"
                      label="Full Name"
                      value={profileName}
                      onChange={(event) =>
                        setProfileName(
                          event.target.value
                        )
                      }
                      placeholder="Your full name"
                      autoComplete="name"
                      disabled={!isProfileEditing}
                      required
                    />

                    <Input
                      name="profileEmail"
                      label="Email Address"
                      type="email"
                      value={profileEmail}
                      onChange={(event) =>
                        setProfileEmail(
                          event.target.value
                        )
                      }
                      placeholder="you@example.com"
                      autoComplete="email"
                      disabled={!isProfileEditing}
                      required
                    />

                    <Input
                      name="profilePhone"
                      label="Mobile Number"
                      type="tel"
                      value={profilePhone}
                      onChange={(event) =>
                        setProfilePhone(
                          event.target.value
                            .replace(/\D/g, '')
                            .slice(0, 10)
                        )
                      }
                      placeholder="10-digit mobile number"
                      autoComplete="tel"
                      inputMode="numeric"
                      maxLength={10}
                      disabled={!isProfileEditing}
                      required
                    />

                    <div className="rounded-none border border-[#d9d2c7] bg-white p-4">
                      <p className="font-mono text-[8px] uppercase tracking-[0.12em] text-[#8e8275]">
                        Account security
                      </p>

                      <p className="mt-2 text-[13px] leading-5 text-[#6b6156]">
                        Email changes are updated through Firebase Authentication and require email verification. If Firebase requires a recent login, sign in again before changing your email.
                      </p>
                    </div>

                    {profileLoadError && (
                      <div
                        role="alert"
                        className="border border-red-200 bg-red-50 px-4 py-3 text-[13px] leading-5 text-red-700"
                      >
                        Unable to load your saved profile. Please refresh and try again.
                      </div>
                    )}

                    {profileError && (
                      <div
                        role="alert"
                        className="border border-red-200 bg-red-50 px-4 py-3 text-[13px] leading-5 text-red-700"
                      >
                        {profileError}
                      </div>
                    )}

                    {profileMessage && (
                      <div
                        role="status"
                        className="border border-green-200 bg-green-50 px-4 py-3 text-[13px] leading-5 text-green-700"
                      >
                        {profileMessage}
                      </div>
                    )}

                    {!isProfileEditing ? (
                      <Button
                        type="button"
                        onClick={
                          startProfileEditing
                        }
                      >
                        Edit profile
                      </Button>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="submit"
                          isLoading={
                            saveUserProfile.isPending
                          }
                        >
                          Save profile
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          onClick={
                            cancelProfileEditing
                          }
                          disabled={
                            saveUserProfile.isPending
                          }
                        >
                          Cancel
                        </Button>
                      </div>
                    )}
                  </form>
                )}
              </div>

              <aside className="lg:col-span-5">
                <Card className="border-[#d9d2c7] bg-white p-5 shadow-none">
                  <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-[#8e8275]">
                    Account summary
                  </p>

                  <dl className="mt-4 divide-y divide-[#ebe6dc] border-y border-[#ebe6dc]">
                    <div className="flex justify-between gap-5 py-3">
                      <dt className="text-[13px] text-[#6b6156]">
                        Orders placed
                      </dt>

                      <dd className="font-mono text-[13px] text-[#14120f]">
                        {myOrders.length}
                      </dd>
                    </div>

                    <div className="flex justify-between gap-5 py-3">
                      <dt className="text-[13px] text-[#6b6156]">
                        Quotes raised
                      </dt>

                      <dd className="font-mono text-[13px] text-[#14120f]">
                        {myQuotes.length}
                      </dd>
                    </div>

                    <div className="flex justify-between gap-5 py-3">
                      <dt className="text-[13px] text-[#6b6156]">
                        Email
                      </dt>

                      <dd className="max-w-[180px] truncate font-mono text-[12px] text-[#14120f]">
                        {profile?.email ||
                          user?.email ||
                          'Not available'}
                      </dd>
                    </div>

                    <div className="flex justify-between gap-5 py-3">
                      <dt className="text-[13px] text-[#6b6156]">
                        Mobile
                      </dt>

                      <dd className="max-w-[180px] truncate font-mono text-[12px] text-[#14120f]">
                        {profile?.phone ||
                          'Not saved'}
                      </dd>
                    </div>
                  </dl>

                  <p className="mt-5 text-[13px] leading-6 text-[#6b6156]">
                    Personal information is editable. Orders and quotes are protected transaction records and cannot be edited from the customer account.
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setActiveTab('addresses')
                      }
                    >
                      Manage address
                    </Button>

                    <Link to="/custom-service">
                      <Button size="sm">
                        Start a custom print
                      </Button>
                    </Link>
                  </div>
                </Card>
              </aside>
            </div>
          )}
        </div>
      </main>

      {/* ================================================================== */}
      {/* ORDER DETAILS MODAL                                                */}
      {/* ================================================================== */}

      {selectedOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#14120f]/60 px-4 py-8"
          role="dialog"
          aria-modal="true"
          aria-label="Order details"
          onClick={() =>
            setSelectedOrder(null)
          }
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto border border-[#d9d2c7] bg-white shadow-2xl"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            {/* Modal header */}

            <div className="flex items-start justify-between gap-5 border-b border-[#d9d2c7] p-5 sm:p-6">
              <div>
                <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-[#8e8275]">
                  Order details
                </p>

                <h2 className="mt-1 font-display text-[21px] font-semibold text-[#14120f]">
                  #{selectedOrder.id.slice(0, 8)}
                </h2>

                <p className="mt-1 text-[12.5px] text-[#6b6156]">
                  {new Date(
                    selectedOrder.date
                  ).toLocaleDateString(
                    'en-IN',
                    {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    }
                  )}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedOrder(null)
                }
                className="flex h-8 w-8 items-center justify-center border border-[#d9d2c7] text-[#6b6156] hover:bg-[#f7f4ee] hover:text-[#14120f]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal body */}

            <div className="p-5 sm:p-6">
              <div className="mb-5 flex items-center justify-between">
                <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-[#8e8275]">
                  Current status
                </span>

                <span
                  className={`border px-2.5 py-1 font-mono text-[8px] uppercase tracking-[0.08em] ${
                    STATUS_STYLES[
                      selectedOrder.status
                    ] ||
                    'border-gray-200 bg-gray-50 text-gray-700'
                  }`}
                >
                  {selectedOrder.status}
                </span>
              </div>

              {/* Items */}

              <div className="border-y border-[#ebe6dc]">
                {selectedOrder.items.map(
                  (item, index) => (
                    <div
                      key={`${item.productId}-${index}`}
                      className="flex items-center gap-4 border-b border-[#ebe6dc] py-4 last:border-b-0"
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center bg-[#f7f4ee]">
                        <Package className="h-5 w-5 text-[#8e8275]" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-[13.5px] font-medium text-[#14120f]">
                          {item.productName}
                        </p>

                        <p className="mt-1 font-mono text-[8px] uppercase tracking-[0.08em] text-[#8e8275]">
                          Qty {item.quantity}

                          {item.variantLabel &&
                            ` · ${item.variantLabel}`}
                        </p>
                      </div>

                      <p className="font-mono text-[12.5px] text-[#14120f]">
                        ₹
                        {(
                          item.price *
                          item.quantity
                        ).toLocaleString(
                          'en-IN'
                        )}
                      </p>
                    </div>
                  )
                )}
              </div>

              {/* Totals */}

              <div className="mt-5 space-y-3">
                <div className="flex justify-between text-[13px]">
                  <span className="text-[#6b6156]">
                    Items
                  </span>

                  <span className="font-mono text-[#14120f]">
                    ₹
                    {selectedOrder.items
                      .reduce(
                        (sum, item) =>
                          sum +
                          item.price *
                            item.quantity,
                        0
                      )
                      .toLocaleString(
                        'en-IN'
                      )}
                  </span>
                </div>

                <div className="flex justify-between text-[13px]">
                  <span className="text-[#6b6156]">
                    Shipping
                  </span>

                  <span className="font-mono text-[#14120f]">
                    Included
                  </span>
                </div>

                <div className="flex justify-between border-t border-[#d9d2c7] pt-4">
                  <span className="font-medium text-[#14120f]">
                    Total paid
                  </span>

                  <span className="font-display text-[21px] font-semibold text-[#14120f]">
                    ₹
                    {selectedOrder.total.toLocaleString(
                      'en-IN'
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal footer */}

            <div className="flex flex-wrap justify-end gap-2 border-t border-[#d9d2c7] bg-[#f7f4ee] p-4">
              <Button
                variant="ghost"
                onClick={() =>
                  setSelectedOrder(null)
                }
              >
                Close
              </Button>

              <Button
                onClick={() =>
                  handleOrderAgain(
                    selectedOrder
                  )
                }
                disabled={
                  reorderOrder.isPending
                }
              >
                <ShoppingCart className="mr-1.5 h-3.5 w-3.5" />

                {reorderOrder.isPending
                  ? 'Adding...'
                  : 'Order again'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}