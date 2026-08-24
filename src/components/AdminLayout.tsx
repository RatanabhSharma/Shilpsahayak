import React, { useState } from 'react';
import {
  Link,
  Outlet,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import {
  ArrowLeft,
  LayoutDashboard,
  ShoppingBag,
  FileText,
  Package,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { signOut } from 'firebase/auth';

import { auth } from '../lib/firebase';

type AdminNavItem = {
  name: string;
  path: string;
  icon: React.ComponentType<{
    className?: string;
  }>;
};

const adminNavItems: AdminNavItem[] = [
  {
    name: 'Dashboard',
    path: '/admin/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'Orders',
    path: '/admin/orders',
    icon: ShoppingBag,
  },
  {
    name: 'Custom Quotes',
    path: '/admin/quotes',
    icon: FileText,
  },
  {
    name: 'Catalog',
    path: '/admin/catalog',
    icon: Package,
  },
  {
    name: 'Inventory',
    path: '/admin/inventory',
    icon: Package,
  },
  {
    name: 'Customers',
    path: '/admin/customers',
    icon: Users,
  },
  {
    name: 'Settings',
    path: '/admin/settings',
    icon: Settings,
  },
];

export function AdminLayout() {
  const [isSidebarOpen, setIsSidebarOpen] =
    useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);

      navigate('/admin/login', {
        replace: true,
      });
    } catch (error) {
      console.error(
        'Failed to sign out admin:',
        error
      );
    }
  };

  const handleNavigation = () => {
    setIsSidebarOpen(false);
  };

  const handleStorefrontNavigation = () => {
    setIsSidebarOpen(false);
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-brand-50 flex">
      {/* Mobile overlay */}
      {isSidebarOpen && (
        <button
          type="button"
          aria-label="Close admin navigation"
          className="fixed inset-0 z-40 bg-charcoal/50 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50
          flex w-64 flex-col
          border-r border-brand-100
          bg-white
          transition-transform duration-200 ease-in-out
          lg:static lg:translate-x-0
          ${
            isSidebarOpen
              ? 'translate-x-0'
              : '-translate-x-full'
          }
        `}
      >
        {/* Sidebar header */}
        <div className="flex h-20 items-center justify-between border-b border-brand-100 px-6">
          <Link
            to="/admin/dashboard"
            className="flex flex-col"
            onClick={handleNavigation}
          >
            <span className="font-serif text-xl font-bold leading-none text-charcoal">
              Shilp Sahayak
            </span>

            <span className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-brand-500">
              Admin Portal
            </span>
          </Link>

          <button
            type="button"
            aria-label="Close admin navigation"
            className="text-charcoal-light transition-colors hover:text-charcoal lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-6">
          {adminNavItems.map((item) => {
            const Icon = item.icon;

            const isActive =
              location.pathname === item.path ||
              location.pathname.startsWith(
                `${item.path}/`
              );

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={handleNavigation}
                className={`
                  flex items-center rounded-xl
                  px-3 py-2.5
                  text-sm font-medium
                  transition-colors
                  ${
                    isActive
                      ? 'bg-brand-50 text-brand-600'
                      : 'text-charcoal-light hover:bg-surface hover:text-charcoal'
                  }
                `}
              >
                <Icon
                  className={`
                    mr-3 h-5 w-5
                    ${
                      isActive
                        ? 'text-brand-500'
                        : 'text-charcoal-lighter'
                    }
                  `}
                />

                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar footer */}
        <div className="border-t border-brand-100 p-4">
          {/* Main Site button */}
          <button
            type="button"
            onClick={handleStorefrontNavigation}
            className="mb-2 flex w-full items-center rounded-xl px-3 py-2.5 text-sm font-medium text-charcoal-light transition-colors hover:bg-brand-50 hover:text-charcoal"
          >
            <ArrowLeft className="mr-3 h-5 w-5 text-brand-500" />

            Main Site
          </button>

          {/* Sign out */}
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
          >
            <LogOut className="mr-3 h-5 w-5 text-red-500" />

            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-brand-100 bg-white px-4 sm:px-6 lg:px-8">
          {/* Mobile menu button */}
          <button
            type="button"
            aria-label="Open admin navigation"
            className="rounded-lg p-2 text-charcoal-light transition-colors hover:bg-brand-50 hover:text-charcoal lg:hidden"
            onClick={() => setIsSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Admin identity */}
          <div className="flex items-center space-x-4">
            <div className="hidden text-right sm:block">
              <p className="font-medium text-charcoal">
                Admin User
              </p>

              <p className="text-xs text-charcoal-lighter">
                Owner
              </p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 font-serif font-bold text-brand-700">
              A
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}