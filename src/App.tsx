import { Login } from './pages/storefront/Login';
import { Account } from './pages/storefront/Account';
import { CustomerRoute } from './components/CustomerRoute';
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { StorefrontLayout } from './components/StorefrontLayout';
import { AdminLayout } from './components/AdminLayout';
import { ProtectedRoute } from './components/ProtectedRoute';

// Storefront Pages
import { Home } from './pages/storefront/Home';
import { Catalog } from './pages/storefront/Catalog';
import { ProductDetail } from './pages/storefront/ProductDetail';
import { Cart } from './pages/storefront/Cart';
import { Checkout } from './pages/storefront/Checkout';
import { CustomService } from './pages/storefront/CustomService';
import { About } from './pages/storefront/About';
import { Contact } from './pages/storefront/Contact';

// Admin Pages
import { AdminLogin } from './pages/admin/AdminLogin';
import { Dashboard } from './pages/admin/Dashboard';
import { Orders } from './pages/admin/Orders';
import { OrderDetail } from './pages/admin/OrderDetail';
import { Quotes } from './pages/admin/Quotes';
import { Catalog as AdminCatalog } from './pages/admin/Catalog';
import { Inventory } from './pages/admin/Inventory';
import { Customers } from './pages/admin/Customers';
import { Settings } from './pages/admin/Settings';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ========== Storefront Routes ========== */}
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
          {/* Customer Auth */}
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
        {/* ========== Admin Login (Public) ========== */}
        <Route path="/admin/login" element={<AdminLogin />} />

        {/* ========== Protected Admin Routes ========== */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="orders" element={<Orders />} />
          <Route path="orders/:id" element={<OrderDetail />} />
          <Route path="quotes" element={<Quotes />} />
          <Route path="catalog" element={<AdminCatalog />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="customers" element={<Customers />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}