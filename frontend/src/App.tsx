import { Toaster } from 'react-hot-toast';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { StorefrontLayout } from './components/StorefrontLayout';
import { AdminLayout } from './components/AdminLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { CustomerRoute } from './components/CustomerRoute';
import { GlobalLoadingBar } from './components/loading/GlobalLoadingBar';
import { ScrollToTop } from './components/ScrollToTop';
import { DynamicFavicon } from './components/DynamicFavicon';
import { NotificationProvider } from './components/NotificationContext';

import { lazy, Suspense } from 'react';
import { LoadingState } from './components/admin/shared/LoadingState';

// Storefront
import { Home } from './pages/storefront/Home';
const Catalog = lazy(() => import('./pages/storefront/Catalog').then(m => ({ default: m.Catalog })));
const ProductDetail = lazy(() => import('./pages/storefront/ProductDetail').then(m => ({ default: m.ProductDetail })));
const Cart = lazy(() => import('./pages/storefront/Cart').then(m => ({ default: m.Cart })));
const Checkout = lazy(() => import('./pages/storefront/Checkout').then(m => ({ default: m.Checkout })));
const CustomPrinting = lazy(() => import('./pages/storefront/CustomPrinting').then(m => ({ default: m.CustomPrinting })));
const About = lazy(() => import('./pages/storefront/About').then(m => ({ default: m.About })));
const Contact = lazy(() => import('./pages/storefront/Contact').then(m => ({ default: m.Contact })));
const Login = lazy(() => import('./pages/storefront/Login').then(m => ({ default: m.Login })));
const Account = lazy(() => import('./pages/storefront/Account').then(m => ({ default: m.Account })));

// Legal Pages
const PrivacyPolicy = lazy(() => import('./pages/storefront/PrivacyPolicy').then(m => ({ default: m.PrivacyPolicy })));
const TermsAndConditions = lazy(() => import('./pages/storefront/TermsAndConditions').then(m => ({ default: m.TermsAndConditions })));
const RefundPolicy = lazy(() => import('./pages/storefront/RefundPolicy').then(m => ({ default: m.RefundPolicy })));
const CookiePolicy = lazy(() => import('./pages/storefront/CookiePolicy').then(m => ({ default: m.CookiePolicy })));

// Admin
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin').then(m => ({ default: m.AdminLogin })));
const Dashboard = lazy(() => import('./pages/admin/Dashboard').then(m => ({ default: m.Dashboard })));
const Orders = lazy(() => import('./pages/admin/Orders').then(m => ({ default: m.Orders })));
const OrderDetail = lazy(() => import('./pages/admin/OrderDetail').then(m => ({ default: m.OrderDetail })));
const Quotes = lazy(() => import('./pages/admin/Quotes').then(m => ({ default: m.Quotes })));
const AdminCatalog = lazy(() => import('./pages/admin/Catalog').then(m => ({ default: m.Catalog })));
const Inventory = lazy(() => import('./pages/admin/Inventory').then(m => ({ default: m.Inventory })));
const Customers = lazy(() => import('./pages/admin/Customers').then(m => ({ default: m.Customers })));
const Settings = lazy(() => import('./pages/admin/Settings').then(m => ({ default: m.Settings })));
const Inquiries = lazy(() => import('./pages/admin/Inquiries').then(m => ({ default: m.Inquiries })));
const AdminHome = lazy(() => import('./pages/admin/AdminHome').then(m => ({ default: m.AdminHome })));
const Reviews = lazy(() => import('./pages/admin/Reviews').then(m => ({ default: m.Reviews })));
const Branding = lazy(() => import('./pages/admin/Branding').then(m => ({ default: m.Branding })));
const Coupons = lazy(() => import('./pages/admin/Coupons').then(m => ({ default: m.Coupons })));


export function App() {
  return (
    <NotificationProvider>
      <Toaster position="top-right" />
      <BrowserRouter>
        <DynamicFavicon />
        <ScrollToTop />
        <GlobalLoadingBar />
        <Routes>
        <Route path="/" element={<StorefrontLayout />}>
          <Route index element={<Home />} />
          <Route path="shop" element={<Suspense fallback={<LoadingState message="Loading catalog..." />}><Catalog /></Suspense>} />
          <Route path="product/:id" element={<Suspense fallback={<LoadingState message="Loading product..." />}><ProductDetail /></Suspense>} />
          <Route path="cart" element={<Suspense fallback={<LoadingState message="Loading cart..." />}><Cart /></Suspense>} />
          <Route path="checkout" element={<Suspense fallback={<LoadingState message="Preparing checkout..." />}><Checkout /></Suspense>} />

          {/* Legacy & Relocated Routes */}
          <Route path="catalog" element={<Navigate to="/shop" replace />} />
          <Route path="about" element={<Navigate to="/our-story" replace />} />
          <Route path="contact" element={<Navigate to="/reach-us" replace />} />

          {/* Shilp Studio: Custom 3D-printing workflow */}
          <Route path="shilp-studio" element={<Suspense fallback={<LoadingState message="Launching Shilp Studio..." />}><CustomPrinting /></Suspense>} />
          <Route path="custom-printing" element={<Navigate to="/shilp-studio" replace />} />
          <Route path="custom-service" element={<Navigate to="/shilp-studio" replace />} />

          <Route path="our-story" element={<Suspense fallback={<LoadingState message="Loading..." />}><About /></Suspense>} />
          <Route path="reach-us" element={<Suspense fallback={<LoadingState message="Loading..." />}><Contact /></Suspense>} />
          <Route path="login" element={<Suspense fallback={<LoadingState message="Loading..." />}><Login /></Suspense>} />

          <Route
            path="account"
            element={
              <CustomerRoute>
                <Suspense fallback={<LoadingState message="Loading account..." />}>
                  <Account />
                </Suspense>
              </CustomerRoute>
            }
          />

          {/* Legal Pages */}
          <Route path="privacy-policy" element={<Suspense fallback={<LoadingState message="Loading..." />}><PrivacyPolicy /></Suspense>} />
          <Route path="terms-and-conditions" element={<Suspense fallback={<LoadingState message="Loading..." />}><TermsAndConditions /></Suspense>} />
          <Route path="refund-policy" element={<Suspense fallback={<LoadingState message="Loading..." />}><RefundPolicy /></Suspense>} />
          <Route path="cookie-policy" element={<Suspense fallback={<LoadingState message="Loading..." />}><CookiePolicy /></Suspense>} />
        </Route>

        <Route path="/admin/login" element={<Suspense fallback={<LoadingState message="Loading admin..." />}><AdminLogin /></Suspense>} />

        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <Suspense fallback={<LoadingState message="Loading dashboard..." />}>
                <AdminLayout />
              </Suspense>
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="home" element={<Suspense fallback={<LoadingState message="Loading..." />}><AdminHome /></Suspense>} />
          <Route path="dashboard" element={<Suspense fallback={<LoadingState message="Loading..." />}><Dashboard /></Suspense>} />
          <Route path="orders" element={<Suspense fallback={<LoadingState message="Loading..." />}><Orders /></Suspense>} />
          <Route path="orders/:id" element={<Suspense fallback={<LoadingState message="Loading..." />}><OrderDetail /></Suspense>} />
          <Route path="quotes" element={<Suspense fallback={<LoadingState message="Loading..." />}><Quotes /></Suspense>} />
          <Route path="reviews" element={<Suspense fallback={<LoadingState message="Loading..." />}><Reviews /></Suspense>} />
          <Route path="catalog" element={<Suspense fallback={<LoadingState message="Loading..." />}><AdminCatalog /></Suspense>} />
          <Route path="inventory" element={<Suspense fallback={<LoadingState message="Loading..." />}><Inventory /></Suspense>} />
          <Route path="customers" element={<Suspense fallback={<LoadingState message="Loading..." />}><Customers /></Suspense>} />
          <Route path="inquiries" element={<Suspense fallback={<LoadingState message="Loading..." />}><Inquiries /></Suspense>} />
          <Route path="settings" element={<Suspense fallback={<LoadingState message="Loading..." />}><Settings /></Suspense>} />
          <Route path="branding" element={<Suspense fallback={<LoadingState message="Loading..." />}><Branding /></Suspense>} />
          <Route path="coupons" element={<Suspense fallback={<LoadingState message="Loading..." />}><Coupons /></Suspense>} />
        </Route>

        {/* Internal fallback. Vercel rewrite sends the request to the SPA. */}
        <Route
          path="*"
          element={
            <div className="flex min-h-screen items-center justify-center bg-[#F0F4F8] dark:bg-[#0f172a] px-6 text-charcoal dark:text-slate-100 transition-colors duration-200">
              <div className="text-center max-w-md">
                <span className="font-mono text-xs font-bold uppercase tracking-widest text-brand-500 block mb-2">
                  404 · Dimension Missing
                </span>
                <h1 className="font-serif text-4xl font-bold text-charcoal dark:text-slate-100 sm:text-5xl">
                  Lost in the Slicer.
                </h1>
                <p className="mt-3 text-xs text-charcoal-light dark:text-slate-400 leading-relaxed">
                  The page or 3D model path you were looking for doesn't exist or may have been relocated.
                </p>
                <a
                  href="/"
                  className="mt-6 inline-flex items-center justify-center rounded-xl bg-brand-500 px-6 py-3 font-mono text-xs font-bold text-white shadow-md shadow-brand-500/20 hover:bg-brand-600 transition-colors"
                >
                  Return to Storefront
                </a>
              </div>
            </div>
          }
        />
      </Routes>
      </BrowserRouter>
    </NotificationProvider>
  );
}





