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
            <div className="flex min-h-screen items-center justify-center bg-[#f7f4ee] px-6">
              <div className="text-center">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#8e8275]">
                  404 · Page not found
                </p>
                <h1 className="mt-3 font-display text-4xl font-semibold text-[#14120f]">
                  This page does not exist.
                </h1>
                <a
                  href="/"
                  className="mt-6 inline-flex items-center justify-center bg-[#14120f] px-5 py-3 text-sm font-medium text-[#f7f4ee] transition-colors hover:bg-[#b4491e]"
                >
                  Back to home
                </a>
              </div>
            </div>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
