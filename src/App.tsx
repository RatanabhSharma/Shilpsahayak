import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { StorefrontLayout } from './components/StorefrontLayout';
import { AdminLayout } from './components/AdminLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { CustomerRoute } from './components/CustomerRoute';
import { GlobalLoadingBar } from './components/loading/GlobalLoadingBar';
import { ScrollToTop } from './components/ScrollToTop';

// Storefront
import { Home } from './pages/storefront/Home';
import { Catalog } from './pages/storefront/Catalog';
import { ProductDetail } from './pages/storefront/ProductDetail';
import { Cart } from './pages/storefront/Cart';
import { Checkout } from './pages/storefront/Checkout';
import { CustomPrinting } from './pages/storefront/CustomPrinting';
import { About } from './pages/storefront/About';
import { Contact } from './pages/storefront/Contact';
import { Login } from './pages/storefront/Login';
import { Account } from './pages/storefront/Account';

// Admin
import { AdminLogin } from './pages/admin/AdminLogin';
import { Dashboard } from './pages/admin/Dashboard';
import { Orders } from './pages/admin/Orders';
import { OrderDetail } from './pages/admin/OrderDetail';
import { Quotes } from './pages/admin/Quotes';
import { Catalog as AdminCatalog } from './pages/admin/Catalog';
import { Inventory } from './pages/admin/Inventory';
import { Customers } from './pages/admin/Customers';
import { Settings } from './pages/admin/Settings';
import { AdminHome } from './pages/admin/AdminHome';

export function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <GlobalLoadingBar />
      <Routes>
        <Route path="/" element={<StorefrontLayout />}>
          <Route index element={<Home />} />
          <Route path="shop" element={<Catalog />} />
          <Route path="product/:id" element={<ProductDetail />} />
          <Route path="cart" element={<Cart />} />
          <Route path="checkout" element={<Checkout />} />

          {/* Shilp Studio: Instant 3D Printing Quote & Slicing Engine + Assisted Design (Requires Sign-In) */}
          <Route
            path="shilp-studio"
            element={
              <CustomerRoute>
                <CustomPrinting />
              </CustomerRoute>
            }
          />
          <Route path="custom-printing" element={<Navigate to="/shilp-studio" replace />} />

          <Route path="our-story" element={<About />} />
          <Route path="reach-us" element={<Contact />} />
          <Route path="login" element={<Login />} />

          <Route
            path="account"
            element={
              <CustomerRoute>
                <Account />
              </CustomerRoute>
            }
          />
        </Route>

        <Route path="/admin/login" element={<AdminLogin />} />

        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="home" element={<AdminHome />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="orders" element={<Orders />} />
          <Route path="orders/:id" element={<OrderDetail />} />
          <Route path="quotes" element={<Quotes />} />
          <Route path="catalog" element={<AdminCatalog />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="customers" element={<Customers />} />
          <Route path="settings" element={<Settings />} />
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
  );
}



