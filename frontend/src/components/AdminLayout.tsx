import { useState, useRef, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  MessageSquare,
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
  Star,
  Compass,
  Palette,
  Image,
  Globe,
  FileCheck,
  Tag,
  Megaphone,
  FolderTree,
  Sliders,
  Bell,
  ShieldCheck,
  Truck,
  Printer,
  CreditCard,
  Building2,
} from 'lucide-react';
import { BrandLogo } from './ui';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { useSettings } from '../hooks/useSettings';

interface NavItemConfig {
  name: string;
  path: string;
  icon: any;
  isComingSoon?: boolean;
  badge?: string;
  isSettingsTab?: boolean;
  children?: Omit<NavItemConfig, 'children'>[];
}

interface NavGroupConfig {
  group: string;
  items: NavItemConfig[];
}

export function AdminLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({ Settings: true });
  const userMenuRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { data: settings } = useSettings();
  const businessName = settings?.businessName || 'Shilp Sahayak';
  const businessAddress = settings?.address || 'Patiala Studio';

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

    const navItems: NavItemConfig[] = [
    {
      name: 'Dashboard',
      path: '/admin/dashboard',
      icon: LayoutDashboard,
    },
    {
      name: 'Operations',
      path: '/admin/orders',
      icon: ShoppingBag,
      children: [
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
          name: 'Customer Inquiries',
          path: '/admin/inquiries',
          icon: MessageSquare,
        },
        {
          name: 'Reviews',
          path: '/admin/reviews',
          icon: Star,
        },
      ],
    },
    {
      name: 'Catalogue',
      path: '/admin/catalog',
      icon: Package,
      children: [
        {
          name: 'Products',
          path: '/admin/catalog',
          icon: Package,
        },
        {
          name: 'Inventory',
          path: '/admin/inventory',
          icon: Layers,
        },
      ],
    },
    {
      name: 'Customers',
      path: '/admin/customers',
      icon: Users,
      children: [
        {
          name: 'Customer Directory',
          path: '/admin/customers',
          icon: Users,
        },
      ],
    },
    {
      name: 'Storefront',
      path: '/admin/home',
      icon: Home,
      children: [
        {
          name: 'Homepage CMS',
          path: '/admin/home',
          icon: Home,
        },
        {
          name: 'Branding',
          path: '/admin/branding',
          icon: Palette,
        },
      ],
    },
    {
      name: 'Marketing',
      path: '/admin/coupons',
      icon: Tag,
      children: [
        {
          name: 'Coupons & Discounts',
          path: '/admin/coupons',
          icon: Tag,
        },
      ],
    },
    {
      name: 'Settings',
      path: '/admin/settings',
      icon: Settings,
      children: [
        {
          name: 'Business Information',
          path: '/admin/settings?tab=business',
          icon: Building2,
          isSettingsTab: true,
        },
        {
          name: 'Pricing & Slicing',
          path: '/admin/settings?tab=pricing',
          icon: Sliders,
          isSettingsTab: true,
        },
        {
          name: 'Printers & Profiles',
          path: '/admin/settings?tab=printers',
          icon: Printer,
          isSettingsTab: true,
        },
        {
          name: 'Shipping & Delivery',
          path: '/admin/settings?tab=shipping',
          icon: Truck,
          isSettingsTab: true,
        },
        {
          name: 'Operational Alerts',
          path: '/admin/settings?tab=notifications',
          icon: Bell,
          isSettingsTab: true,
        },
      ],
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

  // Check active navigation link against current pathname & search query
    const allNavItems = navItems.flatMap((item) => [item, ...(item.children || [])]);
  const currentNav = allNavItems.find((item) => {
    if (item.children) return false;
    if (item.isComingSoon) return false;
    if (item.isSettingsTab) {
      return (
        location.pathname === '/admin/settings' &&
        (location.search ? item.path.includes(location.search) : item.path.includes('tab=business'))
      );
    }
    return location.pathname.startsWith(item.path);
  });

  return (
    <div className="min-h-screen bg-paper flex font-sans text-ink">
      {/* Mobile sidebar overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-ink/40 z-40 lg:hidden backdrop-blur-xs transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar - 250px wide */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-line transform transition-transform duration-200 ease-in-out ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } flex flex-col`}
      >
        {/* Sidebar Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-line shrink-0">
          <Link to="/admin/dashboard" className="flex items-center gap-2.5">
            <BrandLogo size="sm" showText={false} />
            <div>
              <span className="font-display text-base font-bold text-ink block leading-tight tracking-tight">
                {businessName}
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

                {/* Hierarchical Navigation List */}
        <div className="flex-1 px-3 py-3 overflow-y-auto space-y-1">
          <nav className="space-y-0.5">
            {navItems.map((item) => {
              const Icon = item.icon;

              if (item.children) {
                const isAnyChildActive = item.children.some(child => {
                  if (child.isSettingsTab) {
                    const currentTab = new URLSearchParams(location.search).get('tab') || 'business';
                    return location.pathname === '/admin/settings' && child.path.includes(`tab=${currentTab}`);
                  }
                  return location.pathname.startsWith(child.path);
                });
                
                const isOpen = openMenus[item.name] ?? isAnyChildActive;
                
                return (
                  <div key={item.name} className="space-y-0.5">
                    <button
                      onClick={() => setOpenMenus(prev => ({ ...prev, [item.name]: !isOpen }))}
                      className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg font-sans text-xs font-medium transition-all ${
                        isAnyChildActive ? 'text-accent font-semibold' : 'text-muted hover:text-ink hover:bg-shell'
                      }`}
                    >
                      <div className="flex items-center min-w-0">
                        <Icon className={`w-4 h-4 mr-2.5 shrink-0 ${isAnyChildActive ? 'text-accent' : 'text-muted'}`} />
                        <span className="truncate">{item.name}</span>
                      </div>
                      <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {isOpen && (
                      <div className="pl-5 pr-1 space-y-0.5 mt-0.5">
                        {item.children.map(child => {
                          const ChildIcon = child.icon;
                          let isChildActive = false;
                          if (child.isSettingsTab) {
                            const currentTab = new URLSearchParams(location.search).get('tab') || 'business';
                            isChildActive = location.pathname === '/admin/settings' && child.path.includes(`tab=${currentTab}`);
                          } else {
                            isChildActive = location.pathname.startsWith(child.path);
                          }
                          
                          if (child.isComingSoon) {
                            return (
                              <div
                                key={child.name}
                                title={`Coming in ${child.badge || 'future phase'}`}
                                className="flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium text-muted/50 cursor-not-allowed select-none group"
                              >
                                <div className="flex items-center min-w-0">
                                  <ChildIcon className="w-4 h-4 mr-2.5 shrink-0 text-muted/40" />
                                  <span className="truncate">{child.name}</span>
                                </div>
                                {child.badge && (
                                  <span className="font-mono text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-shell text-muted/70 shrink-0">
                                    {child.badge}
                                  </span>
                                )}
                              </div>
                            );
                          }

                          return (
                            <Link
                              key={child.name}
                              to={child.path}
                              onClick={() => setIsSidebarOpen(false)}
                              className={`flex items-center justify-between px-3 py-1.5 rounded-lg font-sans text-xs font-medium transition-all ${
                                isChildActive
                                  ? 'bg-accent text-white shadow-xs font-semibold'
                                  : 'text-muted hover:text-ink hover:bg-shell'
                              }`}
                            >
                              <div className="flex items-center min-w-0">
                                <ChildIcon className={`w-4 h-4 mr-2.5 shrink-0 ${isChildActive ? 'text-white' : 'text-muted'}`} />
                                <span className="truncate">{child.name}</span>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              // Active check for standalone item:
              let isActive = false;
              if (!item.isComingSoon) {
                if (item.isSettingsTab) {
                  const currentTab = new URLSearchParams(location.search).get('tab') || 'business';
                  isActive =
                    location.pathname === '/admin/settings' &&
                    item.path.includes(`tab=${currentTab}`);
                } else {
                  isActive = location.pathname.startsWith(item.path);
                }
              }

              if (item.isComingSoon) {
                return (
                  <div
                    key={item.name}
                    title={`Coming in ${item.badge || 'future phase'}`}
                    className="flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium text-muted/50 cursor-not-allowed select-none group"
                  >
                    <div className="flex items-center min-w-0">
                      <Icon className="w-4 h-4 mr-2.5 shrink-0 text-muted/40" />
                      <span className="truncate">{item.name}</span>
                    </div>
                    {item.badge && (
                      <span className="font-mono text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-shell text-muted/70 shrink-0">
                        {item.badge}
                      </span>
                    )}
                  </div>
                );
              }

              return (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={() => setIsSidebarOpen(false)}
                  className={`flex items-center justify-between px-3 py-1.5 rounded-lg font-sans text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-accent text-white shadow-xs font-semibold'
                      : 'text-muted hover:text-ink hover:bg-shell'
                  }`}
                >
                  <div className="flex items-center min-w-0">
                    <Icon
                      className={`w-4 h-4 mr-2.5 shrink-0 ${
                        isActive ? 'text-white' : 'text-muted'
                      }`}
                    />
                    <span className="truncate">{item.name}</span>
                  </div>
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
                  <p className="font-mono text-[10px] text-muted">{businessName}</p>
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
                    <p className="font-mono text-[10px] text-muted mt-0.5">{businessName} Console</p>
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






