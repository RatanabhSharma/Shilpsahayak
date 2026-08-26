import {
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
} from 'react-router-dom';
import {
  ArrowRight,
  Menu,
  ShieldCheck,
  ShoppingBag,
  User,
  X,
  Sparkles,
  Phone,
  Mail,
  MapPin,
  Search,
} from 'lucide-react';
import {
  AnimatePresence,
  motion,
} from 'framer-motion';

import { useStore } from '../store';
import { useAuth } from '../hooks/useAuth';
import { useSettings } from '../hooks/useSettings';
import { useHomepage } from '../hooks/useHomepage';
import { useUserRole } from '../hooks/useUserRole';
import { useProducts } from '../hooks/useProducts';
import { BrandLogo } from './ui';
import { ThemeToggle } from './ThemeToggle';

type NavItem = {
  name: string;
  path: string;
  end?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  {
    name: 'Home',
    path: '/',
    end: true,
  },
  {
    name: 'Shop All',
    path: '/catalog',
  },
  {
    name: 'Custom 3D Printing',
    path: '/custom-service',
  },
  {
    name: 'About Studio',
    path: '/about',
  },
  {
    name: 'Contact',
    path: '/contact',
  },
];

/* ============================================================
   ANNOUNCEMENT BAR
   ============================================================ */

function AnnouncementBar({
  messages,
  duration,
}: {
  messages: string[];
  duration: number;
}) {
  const cleanMessages = useMemo(
    () =>
      messages
        .map((message) => message.trim())
        .filter((msg) => msg && !msg.toLowerCase().includes('whatsapp')),
    [messages]
  );

  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (cleanMessages.length <= 1) return;
    const intervalMs = Math.max(Math.min((duration || 5) * 1000, 12000), 3000);
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % cleanMessages.length);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [cleanMessages.length, duration]);

  if (cleanMessages.length === 0) return null;

  return (
    <div
      className="relative z-40 h-9 overflow-hidden bg-charcoal text-white flex items-center justify-center px-4 border-b border-white/10"
      role="region"
      aria-label="Store announcements"
    >
      <div className="flex items-center gap-2 max-w-full">
        <span className="flex h-2 w-2 relative shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500"></span>
        </span>
        <AnimatePresence mode="wait">
          <motion.p
            key={currentIndex}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="text-center font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-200 truncate"
          >
            {cleanMessages[currentIndex]}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ============================================================
   STOREFRONT LAYOUT
   ============================================================ */

export function StorefrontLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  /* ----------------------------------------------------------
     Store / Cart
     ---------------------------------------------------------- */

  const cart = useStore((state) => state.cart);

  const cartItemCount = cart.reduce(
    (total, item) => total + item.quantity,
    0
  );

  /* ----------------------------------------------------------
     Authentication
     ---------------------------------------------------------- */

  const { user, loading: authLoading } = useAuth();

  /* ----------------------------------------------------------
     User role
     ---------------------------------------------------------- */

  const { isAdmin, loading: roleLoading } = useUserRole();

  /* ----------------------------------------------------------
     Business settings
     ---------------------------------------------------------- */

  const { data: settings } = useSettings();

  /* ----------------------------------------------------------
     Homepage settings
     ---------------------------------------------------------- */

  const { data: homepageSettings } = useHomepage();

  /* ----------------------------------------------------------
     Close mobile menu on route change
     ---------------------------------------------------------- */

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  /* ----------------------------------------------------------
     Lock body scroll when mobile menu open
     ---------------------------------------------------------- */

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  /* ----------------------------------------------------------
     Business information
     ---------------------------------------------------------- */

  const businessName = settings?.businessName || 'Shilp Sahayak';
  const businessEmail = settings?.email || 'hello@shilpsahayak.com';
  const whatsappNumber = settings?.whatsappNumber || '919876543210';
  const businessPhone = settings?.phone || '+91 98765 43210';
  const businessAddress = settings?.address || 'Patiala, Punjab 147001';

  const whatsappLink = whatsappNumber
    ? `https://wa.me/${whatsappNumber.replace(/\D/g, '')}`
    : 'https://wa.me/919876543210';

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { data: allProducts = [] } = useProducts();

  const filteredSearchResults = useMemo(() => {
    if (!searchQuery.trim()) return allProducts.slice(0, 4);
    const q = searchQuery.toLowerCase().trim();
    return allProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q) ||
        p.material?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q)
    );
  }, [searchQuery, allProducts]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
      if (e.key === 'Escape' && isSearchOpen) {
        setIsSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen]);

  /* ----------------------------------------------------------
     Close search on route change
     ---------------------------------------------------------- */
  useEffect(() => {
    setIsSearchOpen(false);
    setSearchQuery('');
  }, [location.pathname]);

  const currentYear = new Date().getFullYear();

  const isAuthenticated = !authLoading && !!user;
  const showAdmin = !authLoading && !roleLoading && isAuthenticated && isAdmin;

  return (
    <div className="min-h-screen flex flex-col bg-[#f4f2ef] dark:bg-[#0f172a] text-charcoal dark:text-slate-100 transition-colors duration-200">
      {/* Accessibility Skip Link */}
      <a
        href="#main-content"
        className="fixed left-4 top-4 z-[100] -translate-y-20 rounded-xl bg-charcoal px-4 py-2 text-sm font-medium text-white shadow-lg transition-transform focus:translate-y-0"
      >
        Skip to content
      </a>

      {/* Announcement Bar */}
      {homepageSettings?.announcementEnabled &&
        homepageSettings.announcementMessages.length > 0 && (
          <AnnouncementBar
            messages={homepageSettings.announcementMessages}
            duration={homepageSettings.announcementDuration}
          />
        )}

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-zinc-200/80 bg-[#f4f2ef]/95 dark:border-slate-800 dark:bg-[#0f172a]/95 backdrop-blur-md transition-shadow">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:h-20 lg:px-10">
          {/* Logo */}
          <Link
            to="/"
            className="group flex items-center"
            aria-label={`${businessName} home`}
          >
            <BrandLogo size="md" />
          </Link>

          {/* Desktop Navigation Links */}
          <nav
            aria-label="Primary navigation"
            className="hidden items-center gap-1 xl:gap-2 lg:flex"
          >
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                className={({ isActive }) =>
                  [
                    'relative px-3.5 py-2 text-[13.5px] font-semibold tracking-[-0.01em] transition-colors rounded-xl',
                    isActive
                      ? 'text-brand-500 bg-brand-50/80 dark:bg-brand-500/15 dark:text-brand-400'
                      : 'text-charcoal-light dark:text-slate-300 hover:text-charcoal dark:hover:text-white hover:bg-zinc-100/60 dark:hover:bg-slate-800/60',
                  ].join(' ')
                }
              >
                {({ isActive }) => (
                  <span className="flex items-center gap-1.5">
                    {item.name}
                    {isActive && (
                      <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                    )}
                  </span>
                )}
              </NavLink>
            ))}

            {/* Admin Panel Badge */}
            {showAdmin && (
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  [
                    'ml-2 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5',
                    'font-mono text-[10px] font-semibold uppercase tracking-wider',
                    'transition-all duration-150',
                    isActive
                      ? 'border-brand-500 bg-brand-500 text-white shadow-sm'
                      : 'border-zinc-300 dark:border-slate-700 text-charcoal dark:text-slate-300 hover:border-brand-500 hover:text-brand-600',
                  ].join(' ')
                }
              >
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Admin
              </NavLink>
            )}
          </nav>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Quick Search Button */}
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-zinc-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 px-3 text-xs text-charcoal-light dark:text-slate-300 hover:border-brand-500/50 hover:bg-white dark:hover:bg-slate-800 transition-all shadow-sm"
              aria-label="Search products"
            >
              <Search className="h-4 w-4 text-charcoal-lighter dark:text-slate-400" />
              <span className="hidden md:inline font-medium">Search pieces...</span>
              <kbd className="hidden md:inline-flex rounded bg-zinc-100 dark:bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-charcoal-lighter dark:text-slate-400">
                ⌘K
              </kbd>
            </button>

            {/* Custom Print Quick Action (Desktop) */}
            <Link
              to="/custom-service"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-brand-500/30 bg-brand-50 dark:bg-brand-500/10 px-3.5 py-2 text-xs font-bold text-brand-700 dark:text-brand-400 hover:bg-brand-100 dark:hover:bg-brand-500/20 transition-colors shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5 text-brand-500" />
              <span>Instant Quote</span>
            </Link>

            {/* Theme Toggle Button */}
            <ThemeToggle size="sm" />

            {/* User Auth / Account */}
            {authLoading ? (
              <div className="h-10 w-10 animate-pulse rounded-xl bg-zinc-200 dark:bg-slate-800" />
            ) : isAuthenticated ? (
              <Link
                to="/account"
                className="inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium text-charcoal dark:text-slate-200 hover:bg-zinc-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="My account"
              >
                <User className="h-4 w-4 text-charcoal-light dark:text-slate-400" />
                <span className="hidden md:inline font-semibold text-xs">Account</span>
              </Link>
            ) : (
              <Link
                to="/login"
                className="inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold text-charcoal dark:text-slate-200 hover:bg-zinc-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Sign in"
              >
                <User className="h-4 w-4 text-charcoal-light dark:text-slate-400" />
                <span>Sign In</span>
              </Link>
            )}

            {/* Shopping Cart Button */}
            <Link
              to="/cart"
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl text-charcoal dark:text-slate-200 hover:bg-zinc-100 dark:hover:bg-slate-800 transition-colors"
              aria-label={`Shopping cart with ${cartItemCount} items`}
            >
              <ShoppingBag className="h-5 w-5" aria-hidden="true" />
              {cartItemCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-brand-500 px-1 font-mono text-[10px] font-bold leading-none text-white shadow-sm animate-in zoom-in">
                  {cartItemCount > 99 ? '99+' : cartItemCount}
                </span>
              )}
            </Link>

            {/* Mobile menu hamburger toggle */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-charcoal dark:text-slate-200 hover:bg-zinc-100 dark:hover:bg-slate-800 transition-colors lg:hidden"
              aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-navigation"
            >
              {isMobileMenuOpen ? (
                <X className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Menu className="h-5 w-5" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Navigation */}
        <AnimatePresence initial={false}>
          {isMobileMenuOpen && (
            <motion.div
              id="mobile-navigation"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="overflow-hidden border-t border-zinc-200 dark:border-slate-800 bg-[#f4f2ef] dark:bg-[#0f172a] lg:hidden"
            >
              <nav
                aria-label="Mobile navigation"
                className="mx-auto max-w-[1440px] px-5 py-5 sm:px-8 space-y-2"
              >
                {NAV_ITEMS.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.end}
                    className={({ isActive }) =>
                      [
                        'flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold transition-colors',
                        isActive
                          ? 'bg-brand-50 dark:bg-brand-500/15 text-brand-600 dark:text-brand-400'
                          : 'text-charcoal dark:text-slate-200 hover:bg-zinc-100 dark:hover:bg-slate-800',
                      ].join(' ')
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span>{item.name}</span>
                        {isActive ? (
                          <span className="h-2 w-2 rounded-full bg-brand-500" />
                        ) : (
                          <ArrowRight className="h-4 w-4 text-charcoal-lighter dark:text-slate-500" />
                        )}
                      </>
                    )}
                  </NavLink>
                ))}

                {/* Mobile Theme Toggle Row */}
                <div className="flex items-center justify-between rounded-xl px-4 py-2.5 border border-zinc-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-800/60">
                  <span className="text-xs font-semibold text-charcoal dark:text-slate-200">
                    Theme Appearance
                  </span>
                  <ThemeToggle size="sm" showLabel={true} />
                </div>

                {showAdmin && (
                  <NavLink
                    to="/admin"
                    className={({ isActive }) =>
                      [
                        'flex items-center justify-between rounded-xl border px-4 py-3 text-xs font-mono uppercase tracking-wider',
                        isActive
                          ? 'border-brand-500 bg-brand-500 text-white'
                          : 'border-zinc-300 dark:border-slate-700 text-charcoal dark:text-slate-200 hover:border-brand-500 hover:text-brand-500',
                      ].join(' ')
                    }
                  >
                    <span className="inline-flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4" />
                      Admin Workspace
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </NavLink>
                )}

                <div className="pt-3">
                  <Link
                    to="/custom-service"
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-3.5 text-sm font-bold text-white shadow-md hover:bg-brand-600 transition-colors"
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>Get an Instant Custom Quote</span>
                  </Link>
                </div>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Main Content Area */}
      <main id="main-content" className="min-h-0 flex-1">
        <Outlet />
      </main>

      {/* Rich Dark Theme Footer */}
      <footer className="mt-20 border-t border-slate-800 bg-[#0b0f17] text-slate-300 relative overflow-hidden">
        {/* Subtle grid background texture */}
        <div className="absolute inset-0 grid-plate opacity-20 pointer-events-none" />

        <div className="relative mx-auto max-w-[1440px] px-5 py-16 sm:px-8 lg:px-10">
          <div className="grid gap-12 lg:grid-cols-[1.6fr_repeat(3,1fr)]">
            {/* Column 1: Brand intro */}
            <div className="space-y-5 max-w-sm">
              <Link to="/" className="inline-block">
                <BrandLogo theme="dark" size="lg" showTagline taglineText="If you can imagine it, we can print it." />
              </Link>

              <div className="flex items-center gap-3 pt-2">
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#1EBE5D] transition-colors"
                >
                  <span>Chat on WhatsApp</span>
                </a>
                <a
                  href="https://instagram.com/shilpsahayak"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900/60 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:border-brand-500 hover:text-white transition-colors"
                >
                  <span>@shilpsahayak</span>
                </a>
              </div>
            </div>

            {/* Column 2: Shop Collections */}
            <div className="space-y-4">
              <h3 className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-brand-400">
                Shop Collections
              </h3>
              <ul className="space-y-2.5 text-sm">
                <li>
                  <Link to="/catalog" className="text-slate-400 hover:text-white transition-colors">
                    All 3D Products
                  </Link>
                </li>
                <li>
                  <Link to="/catalog?category=Lamps%20%26%20Lighting" className="text-slate-400 hover:text-white transition-colors">
                    Lamps & Lithophanes
                  </Link>
                </li>
                <li>
                  <Link to="/catalog?category=Desk%20Decor" className="text-slate-400 hover:text-white transition-colors">
                    Desk & Workspace Decor
                  </Link>
                </li>
                <li>
                  <Link to="/catalog?category=Keychains" className="text-slate-400 hover:text-white transition-colors">
                    Keychains & Collectibles
                  </Link>
                </li>
                <li>
                  <Link to="/custom-service" className="text-brand-400 hover:text-brand-300 transition-colors font-medium flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    Custom 3D Print Quote
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 3: Customer Care & Guarantee */}
            <div className="space-y-4">
              <h3 className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-brand-400">
                Customer Care
              </h3>
              <ul className="space-y-2.5 text-sm text-slate-400">
                <li>
                  <Link to="/account" className="hover:text-white transition-colors">
                    Track Your Orders
                  </Link>
                </li>
                <li>
                  <Link to="/about" className="hover:text-white transition-colors">
                    Our Quality Promise
                  </Link>
                </li>
                <li>
                  <Link to="/contact" className="hover:text-white transition-colors">
                    Shipping & Delivery Info
                  </Link>
                </li>
                <li>
                  <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors flex items-center gap-1.5">
                    <span>Direct WhatsApp Help</span>
                  </a>
                </li>
              </ul>
            </div>

            {/* Column 4: Contact & Studio Info */}
            <div className="space-y-4">
              <h3 className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-brand-400">
                Workshop & Studio
              </h3>
              <ul className="space-y-3 text-sm text-slate-400">
                <li className="flex items-start gap-2.5">
                  <MapPin className="h-4 w-4 shrink-0 text-brand-500 mt-0.5" />
                  <span>{businessAddress}</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Mail className="h-4 w-4 shrink-0 text-brand-500" />
                  <a href={`mailto:${businessEmail}`} className="hover:text-white transition-colors">
                    {businessEmail}
                  </a>
                </li>
                <li className="flex items-center gap-2.5">
                  <Phone className="h-4 w-4 shrink-0 text-brand-500" />
                  <a href={`tel:${businessPhone.replace(/\s+/g, '')}`} className="hover:text-white transition-colors">
                    {businessPhone}
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Footer Bottom Bar */}
          <div className="mt-16 flex flex-col gap-4 border-t border-slate-800/80 pt-8 sm:flex-row sm:items-center sm:justify-between text-xs text-slate-500">
            <p className="font-mono">
              © {currentYear} {businessName}. Premium 3D Printed Goods & Bespoke Creations.
            </p>

            <div className="flex flex-wrap items-center gap-4 font-mono text-[11px] uppercase tracking-wider">
              <span className="inline-flex items-center gap-1.5 text-slate-400">
                <span className="h-2 w-2 rounded-full bg-brand-500" />
                Pan-India Delivery
              </span>
              <span className="text-slate-600 hidden sm:inline">•</span>
              <span className="text-slate-400">100% Quality Inspected</span>
              <span className="text-slate-600 hidden sm:inline">•</span>
              <span className="text-slate-400">Secure Payments</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Floating WhatsApp Support Button */}
      <aside className="fixed bottom-5 right-5 z-40">
        <a
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center gap-2.5 rounded-full bg-[#25D366] py-2.5 pl-3 pr-4 text-white shadow-xl shadow-emerald-500/25 transition-all duration-300 hover:scale-105 hover:bg-[#1EBE5D]"
          aria-label="Chat with 3D Printing Maker on WhatsApp"
        >
          <div className="relative flex h-7 w-7 items-center justify-center rounded-full bg-white/20">
            <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-100"></span>
            </span>
            <Phone className="h-3.5 w-3.5 fill-white text-white" />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-xs font-bold leading-tight">Chat with Maker</span>
            <span className="text-[10px] text-emerald-100 font-medium leading-none">Instant Help</span>
          </div>
        </a>
      </aside>

      {/* Quick Search Modal Dialog */}
      <AnimatePresence>
        {isSearchOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 sm:pt-28 px-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSearchOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Modal Dialog Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-zinc-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl z-10"
            >
              {/* Search Bar Input */}
              <div className="flex items-center gap-3 border-b border-zinc-200 dark:border-slate-800 px-5 py-4">
                <Search className="h-5 w-5 text-brand-500 shrink-0" />
                <input
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search lamps, lithophanes, desk decor, keychains..."
                  className="w-full bg-transparent text-sm sm:text-base font-medium text-charcoal dark:text-slate-100 placeholder:text-zinc-400 dark:placeholder:text-slate-500 focus:outline-none"
                />
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="text-zinc-400 hover:text-charcoal dark:hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : (
                  <span className="rounded bg-zinc-100 dark:bg-slate-800 px-2 py-0.5 font-mono text-[10px] font-bold text-zinc-500">
                    ESC
                  </span>
                )}
              </div>

              {/* Search Results Preview */}
              <div className="max-h-96 overflow-y-auto p-4 space-y-2">
                <div className="flex items-center justify-between px-2 py-1">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-charcoal-lighter dark:text-slate-400">
                    {searchQuery.trim() ? `Matching Pieces (${filteredSearchResults.length})` : 'Popular Studio Picks'}
                  </span>
                  <Link
                    to="/catalog"
                    onClick={() => setIsSearchOpen(false)}
                    className="text-[11px] font-bold text-brand-600 dark:text-brand-400 hover:underline"
                  >
                    View All in Catalog →
                  </Link>
                </div>

                {filteredSearchResults.length === 0 ? (
                  <div className="py-10 text-center text-xs text-charcoal-lighter dark:text-slate-400">
                    No matching pieces found for &ldquo;{searchQuery}&rdquo;.
                  </div>
                ) : (
                  filteredSearchResults.map((prod) => (
                    <Link
                      key={prod.id}
                      to={`/product/${prod.id}`}
                      onClick={() => setIsSearchOpen(false)}
                      className="group flex items-center justify-between gap-4 rounded-2xl p-2.5 hover:bg-zinc-50 dark:hover:bg-slate-800/70 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={prod.image}
                          alt={prod.name}
                          className="h-12 w-12 rounded-xl object-cover border border-zinc-100 dark:border-slate-800 bg-zinc-100 dark:bg-slate-800 shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="line-clamp-1 text-xs font-bold text-charcoal dark:text-slate-100 group-hover:text-brand-600 transition-colors">
                            {prod.name}
                          </p>
                          <span className="font-mono text-[10px] text-charcoal-lighter dark:text-slate-400 uppercase">
                            {prod.category || 'Workshop Item'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-serif text-sm font-bold text-charcoal dark:text-slate-100">
                          ₹{Number(prod.price).toLocaleString('en-IN')}
                        </span>
                        <ArrowRight className="h-4 w-4 text-charcoal-lighter group-hover:translate-x-0.5 group-hover:text-brand-500 transition-all" />
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}