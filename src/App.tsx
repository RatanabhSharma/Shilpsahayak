import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { StorefrontLayout } from './components/StorefrontLayout';
import { AdminLayout } from './components/AdminLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { CustomerRoute } from './components/CustomerRoute';
import { GlobalLoadingBar } from './components/loading/GlobalLoadingBar';

// Storefront
import { Home } from './pages/storefront/Home';
import { Catalog } from './pages/storefront/Catalog';
import { ProductDetail } from './pages/storefront/ProductDetail';
import { Cart } from './pages/storefront/Cart';
import { Checkout } from './pages/storefront/Checkout';
import { CustomService } from './pages/storefront/CustomService';
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
      <GlobalLoadingBar />
      <Routes>
        <Route path="/" element={<StorefrontLayout />}>
          <Route index element={<Home />} />
          <Route path="catalog" element={<Catalog />} />
          <Route path="product/:id" element={<ProductDetail />} />
          <Route path="cart" element={<Cart />} />
          <Route path="checkout" element={<Checkout />} />

          <Route
            path="custom-service"
            element={
              <CustomerRoute>
                <CustomService />
              </CustomerRoute>
            }
          />

          <Route path="about" element={<About />} />
          <Route path="contact" element={<Contact />} />
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
            <div className="flex min-h-screen items-center justify-center bg-[#f4f2ef] px-6 text-charcoal">
              <div className="text-center max-w-md">
                <span className="font-mono text-xs font-bold uppercase tracking-widest text-brand-500 block mb-2">
                  404 · Dimension Missing
                </span>
                <h1 className="font-serif text-4xl font-bold text-charcoal sm:text-5xl">
                  Lost in the Slicer.
                </h1>
                <p className="mt-3 text-xs text-charcoal-light leading-relaxed">
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
