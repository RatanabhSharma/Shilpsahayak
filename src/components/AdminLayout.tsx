import { useState, useRef, useEffect } from 'react';
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
  ChevronDown,
} from 'lucide-react';
import { BrandLogo } from './ui';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';

export function AdminLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navItems = [
    {
      name: 'Dashboard',
      path: '/admin/dashboard',
      icon: LayoutDashboard,
    },
    {
      name: 'Storefront',
      path: '/admin/home',
      icon: Home,
    },
    {
      name: 'Customer Orders',
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
      name: 'Product Inventory',
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

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error('Error signing out:', e);
    }
    navigate('/admin/login', { replace: true });
  };

  const currentNav = navItems.find((item) => location.pathname.startsWith(item.path));

  return (
    <div className="min-h-screen bg-paper flex font-sans text-ink">
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
            <BrandLogo size="sm" showText={false} />
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
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-paper">
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

          <div className="flex items-center gap-3 sm:gap-4">
            {/* Storefront Link */}
            <Link
              to="/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-line bg-paper text-xs font-medium text-ink hover:bg-shell transition-colors shadow-xs"
            >
              <span>Storefront</span>
              <ExternalLink className="w-3.5 h-3.5 text-muted" />
            </Link>

            <div className="h-4 w-px bg-line" />

            {/* Admin Workshop Profile with Dropdown Menu */}
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setIsUserMenuOpen((prev) => !prev)}
                className="flex items-center gap-2.5 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border border-transparent hover:border-line hover:bg-shell/80 transition-all cursor-pointer group"
                aria-expanded={isUserMenuOpen}
              >
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-semibold text-ink leading-tight group-hover:text-accent transition-colors">
                    Workshop Admin
                  </p>
                  <p className="font-mono text-[10px] text-muted">Patiala Studio</p>
                </div>

                <div className="h-8 w-8 rounded-lg bg-accent text-white font-mono font-bold text-xs flex items-center justify-center shadow-xs shadow-accent/20 shrink-0">
                  SS
                </div>

                <ChevronDown
                  className={`w-3.5 h-3.5 text-muted transition-transform duration-200 ${
                    isUserMenuOpen ? 'rotate-180 text-accent' : ''
                  }`}
                />
              </button>

              {/* Dropdown Menu */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl border border-line bg-white py-1.5 shadow-lg z-50 font-sans text-xs">
                  <div className="px-3.5 py-2.5 border-b border-line">
                    <p className="font-semibold text-ink">Workshop Administrator</p>
                    <p className="font-mono text-[10px] text-muted mt-0.5">Patiala Studio Console</p>
                  </div>

                  <div className="py-1">
                    <Link
                      to="/admin/settings"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3.5 py-2 text-ink hover:bg-shell transition-colors"
                    >
                      <Settings className="w-4 h-4 text-muted" />
                      <span>Platform Settings</span>
                    </Link>

                    <Link
                      to="/admin/home"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3.5 py-2 text-ink hover:bg-shell transition-colors"
                    >
                      <Home className="w-4 h-4 text-muted" />
                      <span>Storefront</span>
                    </Link>
                  </div>

                  <div className="pt-1 border-t border-line">
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        handleLogout();
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-rose-600 hover:bg-rose-50 transition-colors font-medium cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
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


