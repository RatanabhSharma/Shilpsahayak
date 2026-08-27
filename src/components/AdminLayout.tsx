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
import { BrandLogo } from './ui';

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

  const currentNav = navItems.find((item) => location.pathname.startsWith(item.path));

  return (
    <div className="min-h-screen bg-shell flex font-sans text-ink">
      {/* Mobile sidebar overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-ink/40 z-40 lg:hidden backdrop-blur-xs transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar - 240px wide */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-60 bg-white border-r border-line transform transition-transform duration-200 ease-in-out ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } flex flex-col`}
      >
        {/* Sidebar Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-line">
          <Link to="/admin/dashboard" className="flex items-center gap-2.5">
            <BrandLogo size="sm" />
            <div>
              <span className="font-display text-base font-bold text-ink block leading-tight tracking-tight">
                Shilp Sahayak
              </span>
              <span className="font-mono text-[9px] font-semibold uppercase tracking-wider text-accent">
                Admin Control
              </span>
            </div>
          </Link>
          <button
            className="lg:hidden text-muted hover:text-ink p-1 rounded-lg hover:bg-shell"
            onClick={() => setIsSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Section Header & Items */}
        <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <p className="px-3 pb-2 font-mono text-[10px] font-bold uppercase tracking-wider text-muted">
            Menu
          </p>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname.startsWith(item.path);
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={() => setIsSidebarOpen(false)}
                  className={`flex items-center px-3 py-2 rounded-lg font-sans text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-accent text-white shadow-sm shadow-accent/25'
                      : 'text-muted hover:text-ink hover:bg-shell'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 mr-2.5 shrink-0 ${
                      isActive ? 'text-white' : 'text-muted'
                    }`}
                  />
                  <span className="truncate">{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-line space-y-1 bg-paper/50">
          <Link
            to="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between w-full px-3 py-2 rounded-lg font-sans text-xs font-medium text-muted hover:text-ink hover:bg-shell transition-colors"
          >
            <div className="flex items-center gap-2">
              <ExternalLink className="w-3.5 h-3.5 text-muted" />
              <span>View Storefront</span>
            </div>
            <span className="font-mono text-[10px] bg-shell px-1.5 py-0.5 rounded border border-line text-muted">
              Live
            </span>
          </Link>

          <button
            onClick={handleLogout}
            className="flex items-center w-full px-3 py-2 rounded-lg font-sans text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5 mr-2 shrink-0 text-rose-600" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-shell">
        {/* Topbar */}
        <header className="h-16 bg-white/90 backdrop-blur-md border-b border-line flex items-center justify-between px-5 sm:px-8 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-1.5 text-muted hover:text-ink hover:bg-shell rounded-lg"
              onClick={() => setIsSidebarOpen(true)}
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-medium text-muted">Admin</span>
              <span className="text-line">/</span>
              <span className="font-display text-sm font-semibold text-ink">
                {currentNav?.name || 'Control Panel'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link
              to="/"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-line bg-paper text-xs font-medium text-ink hover:bg-shell transition-colors"
            >
              <span>Quick View Storefront</span>
              <ExternalLink className="w-3.5 h-3.5 text-muted" />
            </Link>

            <div className="h-4 w-px bg-line hidden sm:block" />

            <div className="flex items-center gap-2.5">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-semibold text-ink leading-tight">Workshop Admin</p>
                <p className="font-mono text-[10px] text-muted">Patiala Studio</p>
              </div>
              <div className="h-9 w-9 rounded-lg bg-accent text-white font-mono font-bold text-xs flex items-center justify-center shadow-xs shadow-accent/20">
                SS
              </div>
            </div>
          </div>
        </header>

        {/* Page Body */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}