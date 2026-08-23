import React, {
  useState,
} from 'react';

import {
  Link,
  useNavigate,
} from 'react-router-dom';

import {
  User,
  Package,
  FileBox,
  LogOut,
  Loader2,
  CheckCircle,
  XCircle,
  RefreshCw,
} from 'lucide-react';

import { useAuth } from '../../hooks/useAuth';

import {
  useMyQuotes,
  useUpdateQuote,
} from '../../hooks/useQuotes';

import {
  useMyOrders,
} from '../../hooks/useOrders';

import {
  Card,
  Button,
} from '../../components/ui';

/* -------------------------------------------------------------------------- */
/* Status Colors                                                              */
/* -------------------------------------------------------------------------- */

const STATUS_COLORS: Record<
  string,
  string
> = {
  Pending:
    'bg-amber-50 text-amber-700',

  Quoted:
    'bg-blue-50 text-blue-700',

  Accepted:
    'bg-green-50 text-green-700',

  Rejected:
    'bg-red-50 text-red-700',

  Completed:
    'bg-purple-50 text-purple-700',

  Confirmed:
    'bg-blue-50 text-blue-700',

  Printing:
    'bg-purple-50 text-purple-700',

  'Quality Check':
    'bg-indigo-50 text-indigo-700',

  Shipped:
    'bg-cyan-50 text-cyan-700',

  Delivered:
    'bg-green-50 text-green-700',

  Cancelled:
    'bg-red-50 text-red-700',
};

/* -------------------------------------------------------------------------- */
/* Account                                                                    */
/* -------------------------------------------------------------------------- */

export function Account() {
  const {
    user,
    logout,
    loading: authLoading,
  } = useAuth();

  const {
    data: myQuotes = [],
    isLoading: quotesLoading,
  } = useMyQuotes();

  const [
    activeTab,
    setActiveTab,
  ] = useState<
    'quotes' | 'orders'
  >('quotes');

  /*
   * Orders are fetched only when the
   * Orders tab is active.
   *
   * This prevents the Account page from
   * waiting for the orders query during
   * the initial Quotes page load.
   */
const {
  data: myOrders = [],
  isLoading: ordersLoading,
  refetch: refetchOrders,
} = useMyOrders(activeTab === 'orders');

  const updateQuote =
    useUpdateQuote();

  const navigate =
    useNavigate();

  /* ------------------------------------------------------------------------ */
  /* Logout                                                                   */
  /* ------------------------------------------------------------------------ */

  const handleLogout =
    async () => {
      try {
        await logout();
        navigate('/');
      } catch (error) {
        console.error(
          'Logout failed:',
          error
        );
      }
    };

  /* ------------------------------------------------------------------------ */
  /* Accept Quote                                                             */
  /* ------------------------------------------------------------------------ */

  const handleAcceptQuote =
    async (
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
          'Failed to accept quote'
        );
      }
    };

  /* ------------------------------------------------------------------------ */
  /* Reject Quote                                                             */
  /* ------------------------------------------------------------------------ */

  const handleRejectQuote =
    async (
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
          'Failed to decline quote'
        );
      }
    };

  /* ------------------------------------------------------------------------ */
  /* Refresh Orders                                                           */
  /* ------------------------------------------------------------------------ */

  const handleRefreshOrders =
    async () => {
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
  /* Authentication Loading                                                   */
  /* ------------------------------------------------------------------------ */

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    );
  }

  /* ------------------------------------------------------------------------ */
  /* Authentication Check                                                     */
  /* ------------------------------------------------------------------------ */

  if (!user) {
    navigate('/login');
    return null;
  }

  /* ------------------------------------------------------------------------ */
  /* Quotes Loading                                                           */
  /* ------------------------------------------------------------------------ */

  if (
    activeTab === 'quotes' &&
    quotesLoading
  ) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    );
  }

  /* ------------------------------------------------------------------------ */
  /* Orders Loading                                                           */
  /* ------------------------------------------------------------------------ */

  if (
    activeTab === 'orders' &&
    ordersLoading
  ) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />

        <p className="mt-4 text-sm text-charcoal-light">
          Loading your orders...
        </p>
      </div>
    );
  }

  /* ------------------------------------------------------------------------ */
  /* Page                                                                     */
  /* ------------------------------------------------------------------------ */

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

      {/* ================================================================== */}
      {/* Header                                                             */}
      {/* ================================================================== */}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">

        <div className="flex items-center gap-4">

          <div className="w-14 h-14 rounded-full bg-brand-100 flex items-center justify-center">
            <User className="w-7 h-7 text-brand-600" />
          </div>

          <div>
            <h1 className="text-2xl font-serif font-bold text-charcoal">
              {user.displayName ||
                'My Account'}
            </h1>

            <p className="text-charcoal-light text-sm">
              {user.email}
            </p>
          </div>

        </div>

        <Button
          variant="outline"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>

      </div>

      {/* ================================================================== */}
      {/* Tabs                                                               */}
      {/* ================================================================== */}

      <div className="flex gap-2 mb-8 border-b border-brand-100">

        {/* -------------------------------------------------------------- */}
        {/* Quotes Tab                                                     */}
        {/* -------------------------------------------------------------- */}

        <button
         onClick={async () => {
  setActiveTab('orders');
  await refetchOrders();
}}
          className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'quotes'
              ? 'border-brand-500 text-brand-600'
              : 'border-transparent text-charcoal-light hover:text-charcoal'
          }`}
        >
          <FileBox className="w-4 h-4 inline mr-2" />

          My Quotes (
          {myQuotes.length}
          )
        </button>

        {/* -------------------------------------------------------------- */}
        {/* Orders Tab                                                     */}
        {/* -------------------------------------------------------------- */}

        <button
          type="button"
          onClick={() =>
            setActiveTab(
              'orders'
            )
          }
          className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'orders'
              ? 'border-brand-500 text-brand-600'
              : 'border-transparent text-charcoal-light hover:text-charcoal'
          }`}
        >
          <Package className="w-4 h-4 inline mr-2" />

          My Orders (
          {myOrders.length}
          )
        </button>

      </div>

      {/* ================================================================== */}
      {/* Quotes Tab                                                         */}
      {/* ================================================================== */}

      {activeTab === 'quotes' && (
        <div className="space-y-4">

          {myQuotes.length === 0 ? (

            <Card className="p-12 text-center border-none shadow-sm">

              <FileBox className="w-12 h-12 text-charcoal-lighter mx-auto mb-4" />

              <p className="text-charcoal-light mb-4">
                No quote requests yet.
              </p>

              <Link to="/custom-service">
                <Button>
                  Request a Custom Quote
                </Button>
              </Link>

            </Card>

          ) : (

            myQuotes.map(
              (quote) => (

                <Card
                  key={quote.id}
                  className="p-6 border-none shadow-sm"
                >

                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">

                    <div className="flex-1">

                      <div className="flex items-center gap-3 mb-2">

                        <h3 className="font-medium text-charcoal">
                          {quote.fileName}
                        </h3>

                        <span
                          className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                            STATUS_COLORS[
                              quote.status
                            ] ||
                            'bg-gray-50 text-gray-700'
                          }`}
                        >
                          {quote.status}
                        </span>

                      </div>

                      <p className="text-sm text-charcoal-light">
                        {quote.material}
                        {' • '}
                        {quote.color}
                        {' • '}
                        Infill{' '}
                        {quote.infill}%
                      </p>

                      <p className="text-xs text-charcoal-lighter mt-1">
                        Submitted on{' '}

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

                    </div>

                    <div className="text-right">

                      <p className="text-xs text-charcoal-lighter mb-1">
                        Your Estimate
                      </p>

                      <p className="text-lg font-semibold text-charcoal">
                        ₹
                        {(
                          quote.estimatedPrice ??
                          0
                        ).toLocaleString(
                          'en-IN'
                        )}
                      </p>

                      {quote.adminPrice && (
                        <div className="mt-3 bg-green-50 rounded-lg px-4 py-2">

                          <p className="text-xs text-green-700 mb-0.5">
                            Final Quote
                          </p>

                          <p className="text-xl font-bold text-green-700">
                            ₹
                            {quote.adminPrice.toLocaleString(
                              'en-IN'
                            )}
                          </p>

                        </div>
                      )}

                    </div>

                  </div>

                  {/* Quote Actions */}

                  {quote.status ===
                    'Quoted' &&
                    quote.adminPrice && (

                      <div className="mt-5 pt-5 border-t border-brand-100 flex gap-3">

                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() =>
                            handleAcceptQuote(
                              quote.id
                            )
                          }
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />

                          Accept Quote
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() =>
                            handleRejectQuote(
                              quote.id
                            )
                          }
                        >
                          <XCircle className="w-4 h-4 mr-2" />

                          Decline
                        </Button>

                      </div>
                    )}

                </Card>

              )
            )

          )}

        </div>
      )}

      {/* ================================================================== */}
      {/* Orders Tab                                                         */}
      {/* ================================================================== */}

      {activeTab === 'orders' && (
        <div className="space-y-4">

          {/* ------------------------------------------------------------ */}
          {/* Orders Header                                                */}
          {/* ------------------------------------------------------------ */}

          <div className="flex items-center justify-between">

            <div>
              <h2 className="font-serif text-xl font-semibold text-charcoal">
                My Orders
              </h2>

              <p className="text-sm text-charcoal-light mt-1">
                View your recent orders and their status.
              </p>
            </div>

            <button
              type="button"
              onClick={handleRefreshOrders}
              disabled={ordersLoading}
              className="flex items-center gap-2 text-sm text-brand-600 hover:text-brand-700 disabled:opacity-50 transition-colors"
            >
              <RefreshCw
                className={`w-4 h-4 ${
                  ordersLoading
                    ? 'animate-spin'
                    : ''
                }`}
              />

              Refresh
            </button>

          </div>

          {/* ------------------------------------------------------------ */}
          {/* Orders List                                                   */}
          {/* ------------------------------------------------------------ */}

          {myOrders.length === 0 ? (

            <Card className="p-12 text-center border-none shadow-sm">

              <Package className="w-12 h-12 text-charcoal-lighter mx-auto mb-4" />

              <p className="text-charcoal-light mb-4">
                No orders yet.
              </p>

              <Link to="/catalog">
                <Button>
                  Browse Catalog
                </Button>
              </Link>

            </Card>

          ) : (

            myOrders.map(
              (order) => (

                <Card
                  key={order.id}
                  className="p-6 border-none shadow-sm"
                >

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

                    <div>

                      <div className="flex items-center gap-3 mb-1">

                        <h3 className="font-medium text-charcoal">
                          Order #
                          {order.id.slice(
                            0,
                            8
                          )}
                        </h3>

                        <span
                          className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                            STATUS_COLORS[
                              order.status
                            ] ||
                            'bg-gray-50 text-gray-700'
                          }`}
                        >
                          {order.status}
                        </span>

                      </div>

                      <p className="text-sm text-charcoal-light">

                        {order.items.length}{' '}
                        item(s)

                        {' • '}

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

                    <p className="text-lg font-semibold text-brand-600">
                      ₹
                      {order.total.toLocaleString(
                        'en-IN'
                      )}
                    </p>

                  </div>

                </Card>

              )
            )

          )}

        </div>
      )}

    </div>
  );
}