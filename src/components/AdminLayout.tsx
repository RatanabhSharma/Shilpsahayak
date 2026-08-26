import { useState } from 'react';
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
  X,
  ExternalLink,
  Layers,
} from 'lucide-react';
import { BrandLogo, Badge } from './ui';
import { ThemeToggle } from './ThemeToggle';

export function AdminLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    {
      name: 'Studio Dashboard',
      path: '/admin/dashboard',
      icon: LayoutDashboard,
    },
    {
      name: 'Storefront CMS',
      path: '/admin/home',
      icon: Home,
    },
    {
      name: 'Orders & Dispatch',
      path: '/admin/orders',
      icon: ShoppingBag,
    },
    {
      name: 'Custom CAD Quotes',
      path: '/admin/quotes',
      icon: FileText,
    },
    {
      name: 'Product Catalogue',
      path: '/admin/catalog',
      icon: Package,
    },
    {
      name: 'Filament & Materials',
      path: '/admin/inventory',
      icon: Layers,
    },
    {
      name: 'Customer Directory',
      path: '/admin/customers',
      icon: Users,
    },
    {
      name: 'Platform Settings',
      path: '/admin/settings',
      icon: Settings,
    },
  ];

  const handleLogout = () => {
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen bg-[#f4f2ef] dark:bg-[#0f172a] flex text-charcoal dark:text-slate-100 transition-colors duration-200">
      {/* Mobile sidebar overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-white dark:bg-slate-900 border-r border-zinc-200/80 dark:border-slate-800 transform transition-transform duration-200 ease-in-out ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } flex flex-col`}
      >
        {/* Sidebar Header */}
        <div className="h-20 flex items-center justify-between px-6 border-b border-zinc-100 dark:border-slate-800">
          <Link to="/admin/dashboard" className="flex items-center gap-3">
            <BrandLogo size="sm" />
            <div>
              <span className="font-serif text-lg font-bold text-charcoal dark:text-white block leading-tight">
                Shilp Sahayak
              </span>
              <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-brand-500">
                Workshop Portal
              </span>
            </div>
          </Link>
          <button
            className="lg:hidden text-charcoal-light dark:text-slate-400 hover:text-charcoal dark:hover:text-white p-1"
            onClick={() => setIsSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sidebar Nav Items */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => setIsSidebarOpen(false)}
                className={`flex items-center px-3.5 py-2.5 rounded-xl font-mono text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20'
                    : 'text-charcoal-light dark:text-slate-400 hover:bg-zinc-100 dark:hover:bg-slate-800 hover:text-charcoal dark:hover:text-white'
                }`}
              >
                <Icon
                  className={`w-4 h-4 mr-3 ${
                    isActive ? 'text-white' : 'text-charcoal-lighter dark:text-slate-400'
                  }`}
                />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-zinc-100 dark:border-slate-800 space-y-2">
          <Link
            to="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between w-full px-3.5 py-2.5 rounded-xl font-mono text-xs font-bold text-charcoal-light dark:text-slate-400 hover:bg-zinc-100 dark:hover:bg-slate-800 hover:text-charcoal dark:hover:text-white transition-colors"
          >
            <div className="flex items-center gap-2">
              <Home className="w-4 h-4 text-charcoal-lighter dark:text-slate-400" />
              <span>Live Storefront</span>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-charcoal-lighter dark:text-slate-400" />
          </Link>

          <button
            onClick={handleLogout}
            className="flex items-center w-full px-3.5 py-2.5 rounded-xl font-mono text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
          >
            <LogOut className="w-4 h-4 mr-3 text-rose-500" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-20 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-zinc-200/80 dark:border-slate-800 flex items-center justify-between px-5 sm:px-8 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-2 text-charcoal-light dark:text-slate-400 hover:bg-zinc-100 dark:hover:bg-slate-800 rounded-xl"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden sm:flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-charcoal-lighter dark:text-slate-400 uppercase">Studio Control</span>
              <span className="text-zinc-300 dark:text-slate-700">•</span>
              <Badge variant="brand">Patiala Farm Active</Badge>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <ThemeToggle size="sm" />

            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-charcoal dark:text-slate-100">Studio Engineer</p>
              <p className="font-mono text-[10px] text-charcoal-lighter dark:text-slate-400 uppercase">
                Admin Privileges
              </p>
            </div>
            <div className="h-10 w-10 rounded-2xl bg-brand-500 flex items-center justify-center text-white font-mono font-bold text-sm shadow-md shadow-brand-500/20">
              SS
            </div>
          </div>
        </header>

        {/* Page Body */}
        <div className="flex-1 overflow-auto p-5 sm:p-8 lg:p-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}