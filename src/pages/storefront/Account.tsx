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
  Sparkles,
  ChevronRight,
  ShieldCheck,
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
  Button,
  Input,
  Badge,
} from '../../components/ui';

/* -------------------------------------------------------------------------- */
/* Status styling                                                             */
/* -------------------------------------------------------------------------- */

const STATUS_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  Pending: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  Quoted: { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' },
  Accepted: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  Rejected: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  Completed: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  Confirmed: { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' },
  Printing: { bg: 'bg-brand-50', text: 'text-brand-700', border: 'border-brand-200' },
  'Quality Check': { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  Shipped: { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200' },
  Delivered: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  Cancelled: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
};

function getStatusBadge(status: string) {
  const style = STATUS_STYLES[status] || { bg: 'bg-zinc-50', text: 'text-zinc-700', border: 'border-zinc-200' };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider ${style.bg} ${style.text} ${style.border}`}>
      {status}
    </span>
  );
}

function getInitials(name?: string | null) {
  if (!name) return 'SS';
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

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
    useState<'orders' | 'quotes' | 'addresses' | 'profile'>('orders');

  const [selectedOrder, setSelectedOrder] =
    useState<(typeof myOrders)[number] | null>(null);

  const [profileMessage, setProfileMessage] = useState('');
  const [profileError, setProfileError] = useState('');
  const [isProfileEditing, setIsProfileEditing] = useState(false);

  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profilePhone, setProfilePhone] = useState('');

  const [addressMessage, setAddressMessage] = useState('');
  const [addressError, setAddressError] = useState('');
  const [isAddressEditing, setIsAddressEditing] = useState(false);
  const [profileAddress, setProfileAddress] = useState<UserAddress>(emptyAddress);

  const {
    location: pincodeLocation,
    isLookingUp: isPincodeLookingUp,
    error: pincodeLookupError,
  } = usePincodeLookup(profileAddress.pincode, isAddressEditing);

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    if (!profile) return;

    setProfileName(profile.name || user?.displayName || '');
    setProfileEmail(profile.email || user?.email || '');
    setProfilePhone(profile.phone || '');

    if (!isAddressEditing) {
      setProfileAddress({
        line1: profile.address?.line1 || '',
        line2: profile.address?.line2 || '',
        city: profile.address?.city || '',
        state: profile.address?.state || '',
        pincode: profile.address?.pincode || '',
      });
    }
  }, [profile, user?.displayName, user?.email, isAddressEditing]);

  useEffect(() => {
    if (!pincodeLocation) return;

    setProfileAddress((current) => ({
      ...current,
      city: pincodeLocation.city,
      state: pincodeLocation.state,
      pincode: pincodeLocation.pincode,
    }));
  }, [pincodeLocation]);

  const startProfileEditing = () => {
    setProfileError('');
    setProfileMessage('');
    setProfileName(profile?.name || user?.displayName || '');
    setProfileEmail(profile?.email || user?.email || '');
    setProfilePhone(profile?.phone || '');
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

  const updateAddressField = (field: keyof UserAddress, value: string) => {
    setProfileAddress((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSaveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user || saveUserProfile.isPending) return;

    setProfileError('');
    setProfileMessage('');

    const name = profileName.trim();
    const email = profileEmail.trim().toLowerCase();
    const phone = profilePhone.replace(/\D/g, '').slice(0, 10);

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
      setProfileError('Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    try {
      await updateAccount({ name, email });
      await saveUserProfile.mutateAsync({ name, email, phone, address });
      setProfileMessage(
        email !== user?.email
          ? 'Profile updated. A verification link was sent to your new email.'
          : 'Profile saved successfully.'
      );
      setIsProfileEditing(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to update profile. Please try again.';
      if (message.includes('auth/requires-recent-login')) {
        setProfileError('For security, please sign out and sign in again before changing your email.');
      } else if (message.includes('auth/email-already-in-use')) {
        setProfileError('That email is already registered.');
      } else {
        setProfileError(message);
      }
    }
  };

  const handleSaveAddress = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user || saveUserProfile.isPending) return;

    setAddressError('');
    setAddressMessage('');

    const address: UserAddress = {
      line1: profileAddress.line1.trim(),
      line2: profileAddress.line2.trim(),
      city: profileAddress.city.trim(),
      state: profileAddress.state.trim(),
      pincode: profileAddress.pincode.replace(/\D/g, '').slice(0, 6),
    };

    if (!address.line1) {
      setAddressError('Please enter your house/building details.');
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
        error instanceof Error ? error.message : 'Unable to save address.'
      );
    }
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await logout();
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Logout failed:', error);
      setIsLoggingOut(false);
    }
  };

  const handleAcceptQuote = async (quoteId: string) => {
    try {
      await updateQuote.mutateAsync({ id: quoteId, status: 'Accepted' });
    } catch (error) {
      console.error('Failed to accept quote:', error);
      alert('Failed to accept quote. Please try again.');
    }
  };

  const handleRejectQuote = async (quoteId: string) => {
    if (!window.confirm('Are you sure you want to decline this quote?')) return;
    try {
      await updateQuote.mutateAsync({ id: quoteId, status: 'Rejected' });
    } catch (error) {
      console.error('Failed to decline quote:', error);
      alert('Failed to decline quote. Please try again.');
    }
  };

  const handleRefreshOrders = async () => {
    try {
      await refetchOrders();
    } catch (error) {
      console.error('Failed to refresh orders:', error);
    }
  };

  const handleOrderAgain = async (order: (typeof myOrders)[number]) => {
    try {
      await reorderOrder.mutateAsync(order);
      navigate('/cart');
    } catch (error) {
      console.error('Failed to reorder:', error);
      alert(error instanceof Error ? error.message : 'Unable to reorder. Please try again.');
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-[#faf9f6]">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          <p className="mt-4 font-mono text-xs font-bold uppercase tracking-wider text-charcoal-lighter">
            Authenticating account...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-[#faf9f6] px-5 py-20">
        <div className="max-w-md rounded-3xl border border-zinc-200 bg-white p-8 text-center shadow-lg">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
            <User className="h-7 w-7" />
          </div>

          <h1 className="mt-5 font-serif text-2xl font-bold text-charcoal">
            You are signed out
          </h1>

          <p className="mt-2 text-sm text-charcoal-light leading-relaxed">
            Sign in to track orders, review 3D print quotes, and manage your delivery address.
          </p>

          <div className="mt-6 flex justify-center gap-3">
            <Link to="/login">
              <Button className="font-bold">Sign in</Button>
            </Link>
            <Link to="/catalog">
              <Button variant="outline" className="font-semibold">Browse Catalogue</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const activeOrder = myOrders.find(
    (order) => order.status !== 'Delivered' && order.status !== 'Cancelled'
  );

  return (
    <div className="min-h-screen bg-[#faf9f6] text-charcoal">
      {/* Account Hero Header */}
      <section className="border-b border-zinc-200/80 bg-white">
        <div className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8 lg:px-10">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-brand-500 font-mono text-xl font-bold text-white shadow-md shadow-brand-500/20">
                {getInitials(user?.displayName)}
              </div>

              <div>
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-brand-500 block">
                  Studio Member Account
                </span>
                <h1 className="mt-1 font-serif text-2xl font-bold text-charcoal sm:text-3xl">
                  {user?.displayName || 'My Account'}
                </h1>
                <p className="text-xs text-charcoal-light">{user?.email}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link to="/custom-service">
                <Button size="sm" className="font-bold">
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                  New Custom Print
                </Button>
              </Link>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="font-semibold text-rose-600 hover:bg-rose-50"
              >
                <LogOut className="mr-1.5 h-3.5 w-3.5" />
                {isLoggingOut ? 'Signing out...' : 'Sign out'}
              </Button>
            </div>
          </div>

          {/* Active Order Alert Bar */}
          {activeOrder && (
            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-brand-200 bg-brand-50/60 p-4">
              <div className="flex items-center gap-3">
                <span className="relative flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-brand-500" />
                </span>
                <p className="text-xs text-charcoal">
                  <span className="font-bold">Active Order #{activeOrder.id.slice(0, 8).toUpperCase()}</span>
                  {' is currently '}
                  <span className="font-bold text-brand-600 uppercase">{activeOrder.status}</span>
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedOrder(activeOrder)}
                className="inline-flex items-center gap-1 font-mono text-xs font-bold text-brand-600 hover:text-brand-700"
              >
                <span>Track Progress</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Main Tabs Container */}
      <main className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8 lg:px-10">
        {/* Navigation Tabs */}
        <div className="flex overflow-x-auto border-b border-zinc-200 gap-2 pb-px">
          {[
            { id: 'orders', label: 'Orders', count: myOrders.length, icon: Package },
            { id: 'quotes', label: 'CAD Quotes', count: myQuotes.length, icon: FileText },
            { id: 'addresses', label: 'Saved Address', icon: MapPin },
            { id: 'profile', label: 'Profile Settings', icon: User },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 rounded-t-2xl px-5 py-3 font-mono text-xs font-bold uppercase tracking-wider transition-all ${
                  active
                    ? 'border-b-2 border-brand-500 bg-white text-brand-600 shadow-sm'
                    : 'text-charcoal-light hover:text-charcoal hover:bg-zinc-100/60'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`rounded-full px-2 py-0.5 text-[10px] ${active ? 'bg-brand-100 text-brand-700' : 'bg-zinc-200/60 text-charcoal-lighter'}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ================================================================= */}
        {/* ORDERS TAB                                                        */}
        {/* ================================================================= */}
        {activeTab === 'orders' && (
          <div className="mt-8 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-serif text-2xl font-bold text-charcoal">
                  Your Orders
                </h2>
                <p className="text-xs text-charcoal-light">
                  Track fabrication stages and pan-India courier dispatch.
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshOrders}
                disabled={ordersLoading}
                className="font-bold text-xs"
              >
                <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${ordersLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            {ordersLoading ? (
              <div className="py-20 text-center">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
                <p className="mt-4 text-xs font-semibold text-charcoal-light">Loading orders...</p>
              </div>
            ) : myOrders.length === 0 ? (
              <div className="rounded-3xl border border-zinc-200 bg-white p-12 text-center shadow-sm">
                <Package className="mx-auto h-12 w-12 text-zinc-300" />
                <h3 className="mt-4 font-serif text-xl font-bold text-charcoal">No orders yet</h3>
                <p className="mt-1 text-xs text-charcoal-light">
                  Browse our catalog or submit custom 3D files to start your first order.
                </p>
                <Link to="/catalog" className="mt-5 inline-block">
                  <Button className="font-bold">Browse Catalogue</Button>
                </Link>
              </div>
            ) : (
              <div className="grid gap-4">
                {myOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex flex-col gap-5 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="font-mono text-sm font-bold text-charcoal">
                          #{order.id.slice(0, 8).toUpperCase()}
                        </span>
                        {getStatusBadge(order.status)}
                      </div>

                      <p className="text-xs text-charcoal-light">
                        {order.items.length} {order.items.length === 1 ? 'item' : 'items'} •{' '}
                        {new Date(order.date).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                      <div className="sm:text-right">
                        <span className="font-mono text-[10px] text-charcoal-lighter uppercase block">Total</span>
                        <span className="font-mono text-base font-bold text-charcoal">
                          ₹{order.total.toLocaleString('en-IN')}
                        </span>
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedOrder(order)}
                        className="font-bold text-xs"
                      >
                        View Details
                      </Button>

                      <Button
                        size="sm"
                        onClick={() => handleOrderAgain(order)}
                        disabled={reorderOrder.isPending}
                        className="font-bold text-xs"
                      >
                        <ShoppingCart className="mr-1.5 h-3.5 w-3.5" />
                        {reorderOrder.isPending ? 'Adding...' : 'Order Again'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* QUOTES TAB                                                        */}
        {/* ================================================================= */}
        {activeTab === 'quotes' && (
          <div className="mt-8 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-serif text-2xl font-bold text-charcoal">
                  Custom Print Quotes
                </h2>
                <p className="text-xs text-charcoal-light">
                  Engineer reviews, slicing feasibility, and price confirmations for your CAD uploads.
                </p>
              </div>

              <Link to="/custom-service">
                <Button size="sm" className="font-bold text-xs">
                  Upload New Model
                </Button>
              </Link>
            </div>

            {quotesLoading ? (
              <div className="py-20 text-center">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
                <p className="mt-4 text-xs font-semibold text-charcoal-light">Loading quotes...</p>
              </div>
            ) : myQuotes.length === 0 ? (
              <div className="rounded-3xl border border-zinc-200 bg-white p-12 text-center shadow-sm">
                <FileText className="mx-auto h-12 w-12 text-zinc-300" />
                <h3 className="mt-4 font-serif text-xl font-bold text-charcoal">No quotes requested</h3>
                <p className="mt-1 text-xs text-charcoal-light">
                  Upload an STL/OBJ model or share reference images for an instant or engineer-verified quote.
                </p>
                <Link to="/custom-service" className="mt-5 inline-block">
                  <Button className="font-bold">Request Custom Quote</Button>
                </Link>
              </div>
            ) : (
              <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-50 border-b border-zinc-200 font-mono text-[10px] uppercase text-charcoal-lighter">
                      <tr>
                        <th className="px-6 py-4">Quote ID</th>
                        <th className="px-6 py-4">File Name</th>
                        <th className="px-6 py-4">Specs</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Price</th>
                        <th className="px-6 py-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {myQuotes.map((quote) => (
                        <tr key={quote.id} className="hover:bg-zinc-50/50">
                          <td className="px-6 py-4 font-mono font-bold text-charcoal">
                            #{quote.id.slice(0, 8).toUpperCase()}
                          </td>
                          <td className="px-6 py-4">
                            <p className="max-w-[200px] truncate font-bold text-charcoal">
                              {quote.fileName}
                            </p>
                            <span className="font-mono text-[10px] text-charcoal-lighter">
                              {new Date(quote.date).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                              })}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-semibold text-charcoal">{quote.material}</span> • {quote.color}
                            <p className="font-mono text-[10px] text-charcoal-lighter">{quote.infill}% Infill</p>
                          </td>
                          <td className="px-6 py-4">
                            {getStatusBadge(quote.status)}
                          </td>
                          <td className="px-6 py-4 font-mono font-bold text-charcoal">
                            {quote.adminPrice ? (
                              <div>
                                <span>₹{quote.adminPrice.toLocaleString('en-IN')}</span>
                                <span className="block text-[10px] font-bold text-emerald-600">Final Price</span>
                              </div>
                            ) : (
                              <div>
                                <span>₹{(quote.estimatedPrice ?? 0).toLocaleString('en-IN')}</span>
                                <span className="block text-[10px] text-charcoal-lighter">Estimate</span>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            {quote.status === 'Quoted' && quote.adminPrice ? (
                              <div className="flex justify-end gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleAcceptQuote(quote.id)}
                                  disabled={updateQuote.isPending}
                                  className="font-bold text-xs"
                                >
                                  <CheckCircle className="mr-1 h-3.5 w-3.5" />
                                  Accept
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleRejectQuote(quote.id)}
                                  disabled={updateQuote.isPending}
                                  className="font-bold text-xs"
                                >
                                  <XCircle className="mr-1 h-3.5 w-3.5" />
                                  Decline
                                </Button>
                              </div>
                            ) : (
                              <Link to="/custom-service">
                                <Button size="sm" variant="ghost" className="font-bold text-xs">
                                  New Quote
                                </Button>
                              </Link>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* ADDRESS TAB                                                       */}
        {/* ================================================================= */}
        {activeTab === 'addresses' && (
          <div className="mt-8 grid gap-8 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <div className="rounded-3xl border border-zinc-200 bg-white p-7 shadow-sm">
                <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="font-serif text-xl font-bold text-charcoal">
                        Primary Delivery Address
                      </h2>
                      <span className="text-xs text-charcoal-light">Used to auto-populate checkout.</span>
                    </div>
                  </div>
                  <Badge variant="brand">Active</Badge>
                </div>

                {profileLoading ? (
                  <div className="py-8 text-center">
                    <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
                  </div>
                ) : (
                  <div className="mt-5 space-y-4">
                    {profile?.address && Object.values(profile.address).some(Boolean) ? (
                      <p className="text-sm text-charcoal-light leading-relaxed">
                        {profile.address.line1}
                        {profile.address.line2 ? `, ${profile.address.line2}` : ''}
                        <br />
                        {profile.address.city ? `${profile.address.city}, ` : ''}
                        {profile.address.state ? `${profile.address.state} ` : ''}
                        {profile.address.pincode ? ` - ${profile.address.pincode}` : ''}
                      </p>
                    ) : (
                      <p className="text-xs text-charcoal-lighter">
                        No saved delivery address yet. Add your address for faster 1-click checkout.
                      </p>
                    )}

                    {!isAddressEditing ? (
                      <div className="pt-2">
                        <Button size="sm" onClick={startAddressEditing} className="font-bold">
                          {profile?.address && Object.values(profile.address).some(Boolean)
                            ? 'Edit Address'
                            : 'Add Address'}
                        </Button>
                      </div>
                    ) : (
                      <form onSubmit={handleSaveAddress} className="border-t border-zinc-100 pt-5 space-y-4">
                        <Input
                          name="addressLine1"
                          label="Flat / House / Building *"
                          value={profileAddress.line1}
                          onChange={(e) => updateAddressField('line1', e.target.value)}
                          placeholder="e.g. Flat 304, Green Heights"
                          required
                        />

                        <Input
                          name="addressLine2"
                          label="Street / Locality"
                          value={profileAddress.line2}
                          onChange={(e) => updateAddressField('line2', e.target.value)}
                          placeholder="e.g. Model Town Road"
                        />

                        <div className="grid gap-4 sm:grid-cols-2">
                          <Input
                            name="addressCity"
                            label="City *"
                            value={profileAddress.city}
                            onChange={(e) => updateAddressField('city', e.target.value)}
                            placeholder="e.g. Patiala"
                            required
                          />

                          <Input
                            name="addressState"
                            label="State *"
                            value={profileAddress.state}
                            onChange={(e) => updateAddressField('state', e.target.value)}
                            placeholder="e.g. Punjab"
                            required
                          />
                        </div>

                        <div>
                          <Input
                            name="addressPincode"
                            label="6-Digit PIN Code *"
                            value={profileAddress.pincode}
                            onChange={(e) =>
                              updateAddressField(
                                'pincode',
                                e.target.value.replace(/\D/g, '').slice(0, 6)
                              )
                            }
                            placeholder="e.g. 147001"
                            maxLength={6}
                            required
                          />
                          {profileAddress.pincode.length === 6 && (
                            <p className="mt-1 text-[11px]">
                              {isPincodeLookingUp ? (
                                <span className="text-charcoal-lighter">Auto-detecting postal circle...</span>
                              ) : pincodeLookupError ? (
                                <span className="text-rose-600">{pincodeLookupError}</span>
                              ) : pincodeLocation ? (
                                <span className="text-emerald-700 font-bold">
                                  ✓ {pincodeLocation.city}, {pincodeLocation.state}
                                </span>
                              ) : null}
                            </p>
                          )}
                        </div>

                        {addressError && (
                          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
                            {addressError}
                          </div>
                        )}

                        {addressMessage && (
                          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-700">
                            {addressMessage}
                          </div>
                        )}

                        <div className="flex gap-2 pt-2">
                          <Button type="submit" isLoading={saveUserProfile.isPending} className="font-bold">
                            Save Address
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={cancelAddressEditing}
                            disabled={saveUserProfile.isPending}
                          >
                            Cancel
                          </Button>
                        </div>
                      </form>
                    )}
                  </div>
                )}
              </div>

              {/* Address Change History */}
              <div className="mt-8 rounded-3xl border border-zinc-200 bg-white p-7 shadow-sm">
                <h3 className="font-serif text-lg font-bold text-charcoal">
                  Address History
                </h3>
                <p className="text-xs text-charcoal-lighter">
                  Previous delivery destinations logged for your account.
                </p>

                {profile?.addressHistory && profile.addressHistory.length > 0 ? (
                  <div className="mt-4 divide-y divide-zinc-100">
                    {profile.addressHistory.map((item, idx) => (
                      <div key={item.id || idx} className="flex items-center justify-between py-3 text-xs">
                        <div>
                          <p className="font-medium text-charcoal">
                            {item.address.line1}, {item.address.city}, {item.address.state} - {item.address.pincode}
                          </p>
                          <span className="font-mono text-[10px] text-charcoal-lighter">
                            {new Date(item.updatedAt).toLocaleDateString('en-IN')}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setProfileAddress({ ...item.address });
                            setIsAddressEditing(true);
                          }}
                          className="font-bold text-xs"
                        >
                          Use
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-charcoal-lighter">No prior addresses recorded.</p>
                )}
              </div>
            </div>

            <aside className="lg:col-span-5">
              <div className="rounded-3xl border border-zinc-200 bg-white p-7 shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-charcoal font-bold text-sm">
                  <ShieldCheck className="h-4 w-4 text-brand-500" />
                  <span>Pan-India Delivery Guarantee</span>
                </div>
                <p className="text-xs text-charcoal-light leading-relaxed">
                  We verify pin codes directly with Indian Postal & courier databases to prevent dispatch errors and transit delays.
                </p>
              </div>
            </aside>
          </div>
        )}

        {/* ================================================================= */}
        {/* PROFILE TAB                                                       */}
        {/* ================================================================= */}
        {activeTab === 'profile' && (
          <div className="mt-8 grid gap-8 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <div className="rounded-3xl border border-zinc-200 bg-white p-7 shadow-sm">
                <h2 className="font-serif text-xl font-bold text-charcoal">
                  Account Details
                </h2>
                <p className="text-xs text-charcoal-light">
                  Update your contact details for order notifications and invoices.
                </p>

                {profileLoading ? (
                  <div className="py-8 text-center">
                    <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
                  </div>
                ) : (
                  <form onSubmit={handleSaveProfile} className="mt-6 space-y-4">
                    <Input
                      name="profileName"
                      label="Full Name *"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      disabled={!isProfileEditing}
                      required
                    />

                    <Input
                      name="profileEmail"
                      label="Email Address *"
                      type="email"
                      value={profileEmail}
                      onChange={(e) => setProfileEmail(e.target.value)}
                      disabled={!isProfileEditing}
                      required
                    />

                    <Input
                      name="profilePhone"
                      label="Mobile Number *"
                      type="tel"
                      value={profilePhone}
                      onChange={(e) => setProfilePhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      disabled={!isProfileEditing}
                      maxLength={10}
                      required
                    />

                    {profileError && (
                      <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
                        {profileError}
                      </div>
                    )}

                    {profileMessage && (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-700">
                        {profileMessage}
                      </div>
                    )}

                    <div className="pt-2">
                      {!isProfileEditing ? (
                        <Button type="button" onClick={startProfileEditing} className="font-bold">
                          Edit Profile
                        </Button>
                      ) : (
                        <div className="flex gap-2">
                          <Button type="submit" isLoading={saveUserProfile.isPending} className="font-bold">
                            Save Changes
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={cancelProfileEditing}
                            disabled={saveUserProfile.isPending}
                          >
                            Cancel
                          </Button>
                        </div>
                      )}
                    </div>
                  </form>
                )}
              </div>
            </div>

            <aside className="lg:col-span-5">
              <div className="rounded-3xl border border-zinc-200 bg-white p-7 shadow-sm space-y-4">
                <h3 className="font-serif text-lg font-bold text-charcoal">
                  Account Overview
                </h3>
                <dl className="divide-y divide-zinc-100 text-xs">
                  <div className="flex justify-between py-2.5">
                    <span className="text-charcoal-lighter">Total Orders</span>
                    <span className="font-mono font-bold text-charcoal">{myOrders.length}</span>
                  </div>
                  <div className="flex justify-between py-2.5">
                    <span className="text-charcoal-lighter">CAD Quotes</span>
                    <span className="font-mono font-bold text-charcoal">{myQuotes.length}</span>
                  </div>
                  <div className="flex justify-between py-2.5">
                    <span className="text-charcoal-lighter">Account Email</span>
                    <span className="font-mono font-medium text-charcoal truncate max-w-[160px]">{user.email}</span>
                  </div>
                </dl>
              </div>
            </aside>
          </div>
        )}
      </main>

      {/* ================================================================== */}
      {/* ORDER DETAILS MODAL                                                */}
      {/* ================================================================== */}
      {selectedOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 py-8"
          role="dialog"
          aria-modal="true"
          onClick={() => setSelectedOrder(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-zinc-200 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-zinc-100 p-6">
              <div>
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-brand-500 block">
                  Order Details
                </span>
                <h2 className="font-serif text-2xl font-bold text-charcoal">
                  #{selectedOrder.id.slice(0, 8).toUpperCase()}
                </h2>
                <p className="text-xs text-charcoal-lighter">
                  {new Date(selectedOrder.date).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-100 text-charcoal-light hover:bg-zinc-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between rounded-2xl bg-zinc-50 p-4">
                <span className="font-mono text-xs font-bold text-charcoal-lighter uppercase">Fabrication Status</span>
                {getStatusBadge(selectedOrder.status)}
              </div>

              {/* Items List */}
              <div className="divide-y divide-zinc-100 border-y border-zinc-100">
                {selectedOrder.items.map((item, index) => (
                  <div key={`${item.productId}-${index}`} className="flex items-center gap-4 py-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                      <Package className="h-5 w-5" />
                    </div>

                    <div className="min-w-0 flex-1 text-xs">
                      <p className="font-bold text-charcoal">{item.productName}</p>
                      <p className="font-mono text-[11px] text-charcoal-lighter">
                        Qty {item.quantity} {item.variantLabel && `• ${item.variantLabel}`}
                      </p>
                    </div>

                    <span className="font-mono text-xs font-bold text-charcoal">
                      ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>

              {/* Price Breakdown */}
              <div className="space-y-2 text-xs divide-y divide-zinc-100">
                <div className="flex justify-between pt-2">
                  <span className="text-charcoal-lighter">Delivery</span>
                  <span className="font-mono font-bold text-emerald-600">Pan-India Tracked</span>
                </div>
                <div className="flex items-baseline justify-between pt-3">
                  <span className="font-serif text-base font-bold text-charcoal">Total Amount</span>
                  <span className="font-serif text-2xl font-bold text-charcoal">
                    ₹{selectedOrder.total.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 border-t border-zinc-100 bg-zinc-50/60 p-4 rounded-b-3xl">
              <Button variant="ghost" onClick={() => setSelectedOrder(null)} className="font-semibold text-xs">
                Close
              </Button>
              <Button
                onClick={() => handleOrderAgain(selectedOrder)}
                disabled={reorderOrder.isPending}
                className="font-bold text-xs"
              >
                <ShoppingCart className="mr-1.5 h-3.5 w-3.5" />
                {reorderOrder.isPending ? 'Adding...' : 'Order Again'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}