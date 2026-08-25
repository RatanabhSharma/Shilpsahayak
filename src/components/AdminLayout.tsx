import React, { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingBag,
  FileText,
  Package,
  Users,
  Settings,
  Home,
  LogOut,
  Menu,
  X } from
'lucide-react';
export function AdminLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const navItems = [
  {
    name: 'Dashboard',
    path: '/admin/dashboard',
    icon: LayoutDashboard
  },
  {
    name: 'Home Page',
    path: '/admin/home',
    icon: Home
  },
  {
    name: 'Orders',
    path: '/admin/orders',
    icon: ShoppingBag
  },
  {
    name: 'Custom Quotes',
    path: '/admin/quotes',
    icon: FileText
  },
  {
    name: 'Catalog',
    path: '/admin/catalog',
    icon: Package
  },
  {
    name: 'Inventory',
    path: '/admin/inventory',
    icon: Package
  },
  {
    name: 'Customers',
    path: '/admin/customers',
    icon: Users
  },
  {
    name: 'Settings',
    path: '/admin/settings',
    icon: Settings
  }];

  const handleLogout = () => {
    navigate('/admin/login');
  };
  return (
    <div className="min-h-screen bg-brand-50 flex">
      {/* Mobile sidebar overlay */}
      {!isSidebarOpen &&
      <div
        className="fixed inset-0 bg-charcoal/50 z-40 lg:hidden"
        onClick={() => setIsSidebarOpen(true)} />

      }

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-brand-100 transform transition-transform duration-200 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} flex flex-col`}>
        
        <div className="h-20 flex items-center justify-between px-6 border-b border-brand-100">
          <Link to="/admin" className="flex flex-col">
            <span className="font-serif text-xl font-bold text-charcoal leading-none">
              Shilp Sahayak
            </span>
            <span className="text-[10px] text-brand-500 uppercase tracking-widest mt-1 font-semibold">
              Admin Portal
            </span>
          </Link>
          <button
            className="lg:hidden text-charcoal-light"
            onClick={() => setIsSidebarOpen(false)}>
            
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${isActive ? 'bg-brand-50 text-brand-600' : 'text-charcoal-light hover:bg-surface hover:text-charcoal'}`}>
                
                <Icon
                  className={`w-5 h-5 mr-3 ${isActive ? 'text-brand-500' : 'text-charcoal-lighter'}`} />
                
                {item.name}
              </Link>);

          })}
        </nav>

        <div className="p-4 border-t border-brand-100 space-y-2">
          <Link
            to="/"
            className="flex items-center w-full px-3 py-2.5 rounded-xl text-sm font-medium text-charcoal-light hover:bg-brand-50 hover:text-charcoal transition-colors"
          >
            <Home className="w-5 h-5 mr-3 text-charcoal-lighter" />
            View Storefront
          </Link>

          <button
            onClick={handleLogout}
            className="flex items-center w-full px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors">
            <LogOut className="w-5 h-5 mr-3 text-red-500" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-20 bg-white border-b border-brand-100 flex items-center justify-between px-4 sm:px-6 lg:px-8 sticky top-0 z-30">
          <button
            className="lg:hidden p-2 text-charcoal-light hover:bg-brand-50 rounded-lg"
            onClick={() => setIsSidebarOpen(true)}>
            
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1" /> {/* Spacer */}
          <div className="flex items-center space-x-4">
            <div className="text-sm text-right hidden sm:block">
              <p className="font-medium text-charcoal">Admin User</p>
              <p className="text-xs text-charcoal-lighter">
                Onwer
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-serif font-bold">
              A
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>);

}