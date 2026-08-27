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
  MessageSquare,
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
import { CartDrawer } from './CartDrawer';

type NavItem = {
  name: string;
  path: string;
  end?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  {
    name: 'Products',
    path: '/catalog',
  },
  {
    name: 'Custom Printing',
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
      className="relative z-10 h-7 sm:h-8 bg-dark text-white flex items-center justify-center px-4 border-t border-white/10"
      role="region"
      aria-label="Store announcements"
    >
      <div className="flex items-center gap-2 max-w-full">
        <span className="flex h-1.5 w-1.5 relative shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-accent"></span>
        </span>
        <AnimatePresence mode="wait">
          <motion.p
            key={currentIndex}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="text-center text-[10px] sm:text-xs font-medium uppercase tracking-wider text-zinc-300 truncate"
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
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();

  /* ----------------------------------------------------------
     Scroll listener for sticky header background transition
     ---------------------------------------------------------- */
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  /* ----------------------------------------------------------
     Store / Cart
     ---------------------------------------------------------- */

  const cart = useStore((state) => state.cart);
  const openCart = useStore((state) => state.openCart);

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
  const businessEmail = settings?.email || '';
  const whatsappNumber = settings?.whatsappNumber || '';
  const businessPhone = settings?.phone || '';
  const businessAddress = settings?.address || '';

  const whatsappLink = whatsappNumber
    ? `https://wa.me/${whatsappNumber.replace(/\D/g, '')}`
    : '#';

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
    <div className="min-h-screen flex flex-col bg-paper text-ink">
      {/* Accessibility Skip Link */}
      <a
        href="#main-content"
        className="fixed left-4 top-4 z-[100] -translate-y-20 rounded-xl bg-dark px-4 py-2 text-sm font-medium text-white shadow-lg transition-transform focus:translate-y-0"
      >
        Skip to content
      </a>

      {/* Persistent Single Stacked Header: Navbar on Top + Announcement Bar Directly Below */}
      <header
        className={`sticky top-0 z-50 transition-all duration-300 ${
          isScrolled
            ? 'bg-paper/95 border-b border-line shadow-soft backdrop-blur-md'
            : 'bg-paper/85 border-b border-line/60 backdrop-blur-md'
        }`}
      >
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:h-20 lg:px-10">
          {/* Logo */}
          <Link
            to="/"
            className="group flex items-center"
            aria-label={`${businessName} home`}
          >
            <BrandLogo size="md" />
          </Link>

          {/* Desktop Navigation Links with Generous Spacing */}
          <nav
            aria-label="Primary navigation"
            className="hidden items-center gap-6 lg:gap-8 xl:gap-10 lg:flex mx-8"
          >
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                className={({ isActive }) =>
                  [
                    'relative py-2 text-sm font-display font-medium transition-colors group whitespace-nowrap',
                    isActive
                      ? 'text-accent font-semibold'
                      : 'text-ink/80 hover:text-accent',
                  ].join(' ')
                }
              >
                {({ isActive }) => (
                  <span className="relative flex items-center gap-1.5 py-1">
                    {item.name}
                    {/* Slide Underline Hover Effect */}
                    <span
                      className={`absolute bottom-0 left-0 h-[2px] w-full bg-accent transition-transform duration-300 origin-left ${
                        isActive ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                      }`}
                    />
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
                    'ml-2 inline-flex items-center gap-1.5 rounded-full border px-3 py-1',
                    'font-mono text-[10px] font-bold uppercase tracking-wider',
                    'transition-all duration-150',
                    isActive
                      ? 'border-accent bg-accent text-white shadow-sm'
                      : 'border-line text-ink hover:border-accent hover:text-accent',
                  ].join(' ')
                }
              >
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Admin
              </NavLink>
            )}
          </nav>

          {/* Header Action Buttons (Spacious Icon-only group) */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Search Icon Button */}
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-ink hover:bg-shell transition-colors"
              aria-label="Search products"
              title="Search products (Ctrl+K or ⌘K)"
            >
              <Search className="h-5 w-5" />
            </button>

            {/* User Auth / Account */}
            {authLoading ? (
              <div className="h-10 w-10 animate-pulse rounded-full bg-shell" />
            ) : isAuthenticated ? (
              <Link
                to="/account"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full text-ink hover:bg-shell transition-colors"
                aria-label="My account"
                title="My Account"
              >
                <User className="h-5 w-5" />
              </Link>
            ) : (
              <Link
                to="/login"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full text-ink hover:bg-shell transition-colors"
                aria-label="Sign in"
                title="Sign In"
              >
                <User className="h-5 w-5" />
              </Link>
            )}

            {/* Shopping Cart Drawer Trigger Button */}
            <button
              type="button"
              onClick={openCart}
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-ink hover:bg-shell transition-colors"
              aria-label={`Shopping cart with ${cartItemCount} items`}
              title="View Cart"
            >
              <ShoppingBag className="h-5 w-5" aria-hidden="true" />
              {cartItemCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-accent px-1 font-mono text-[10px] font-bold leading-none text-white shadow-sm animate-in zoom-in">
                  {cartItemCount > 99 ? '99+' : cartItemCount}
                </span>
              )}
            </button>

            {/* Mobile menu hamburger toggle */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-ink hover:bg-shell transition-colors lg:hidden"
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
              className="overflow-hidden border-t border-line bg-paper lg:hidden"
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
                        'flex items-center justify-between rounded-xl px-4 py-3 text-sm font-display font-semibold transition-colors',
                        isActive
                          ? 'bg-accent-soft text-accent'
                          : 'text-ink hover:bg-shell',
                      ].join(' ')
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span>{item.name}</span>
                        {isActive ? (
                          <span className="h-2 w-2 rounded-full bg-accent" />
                        ) : (
                          <ArrowRight className="h-4 w-4 text-muted" />
                        )}
                      </>
                    )}
                  </NavLink>
                ))}

                {showAdmin && (
                  <NavLink
                    to="/admin"
                    className={({ isActive }) =>
                      [
                        'flex items-center justify-between rounded-xl border px-4 py-3 text-xs font-mono uppercase tracking-wider',
                        isActive
                          ? 'border-accent bg-accent text-white'
                          : 'border-line text-ink hover:border-accent hover:text-accent',
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
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3.5 text-sm font-bold text-white shadow-md hover:bg-accent-dark transition-colors"
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>Get Custom 3D Print Quote</span>
                  </Link>
                </div>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Announcement Bar (Directly below Navbar in the persistent stacked header) */}
        {homepageSettings?.announcementEnabled &&
          homepageSettings.announcementMessages.length > 0 && (
            <AnnouncementBar
              messages={homepageSettings.announcementMessages}
              duration={homepageSettings.announcementDuration}
            />
          )}
      </header>

      {/* Main Content Area */}
      <main id="main-content" className="min-h-0 flex-1">
        <Outlet />
      </main>

      {/* Slide-in Cart Drawer */}
      <CartDrawer />

      {/* Redesigned 4-Column Footer (Dark Background #0d0d0d) */}
      <footer className="mt-20 border-t border-zinc-800 bg-dark text-zinc-300 relative overflow-hidden">
        {/* Engineering grid texture */}
        <div className="absolute inset-0 grid-plate opacity-20 pointer-events-none" />

        <div className="relative mx-auto max-w-[1440px] px-5 py-16 sm:px-8 lg:px-10">
          <div className="grid gap-12 lg:grid-cols-[1.6fr_repeat(3,1fr)]">
            {/* Column 1: Brand Intro & Contact */}
            <div className="space-y-5 max-w-sm">
              <Link to="/" className="inline-block">
                <BrandLogo isDarkTheme={true} size="lg" showTagline taglineText="If you can imagine it, we can print it." />
              </Link>

              <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                Shilp Sahayak is an Indian 3D printing and custom fabrication studio specializing in precision FDM & resin additive manufacturing, lithophanes, and bespoke physical objects.
              </p>

              <div className="flex items-center gap-3 pt-2">
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#1EBE5D] transition-colors"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Chat on WhatsApp</span>
                </a>
                <a
                  href="https://instagram.com/shilpsahayak"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-xs font-semibold text-zinc-300 hover:border-accent hover:text-white transition-colors"
                >
                  <span>@shilpsahayak</span>
                </a>
              </div>
            </div>

            {/* Column 2: Collections */}
            <div className="space-y-4">
              <h3 className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-accent">
                Collections
              </h3>
              <ul className="space-y-2.5 text-sm font-sans">
                <li>
                  <Link to="/catalog" className="text-zinc-400 hover:text-white transition-colors">
                    All 3D Products
                  </Link>
                </li>
                <li>
                  <Link to="/catalog?category=Lamps%20%26%20Lighting" className="text-zinc-400 hover:text-white transition-colors">
                    Lamps & Lithophanes
                  </Link>
                </li>
                <li>
                  <Link to="/catalog?category=Desk%20Decor" className="text-zinc-400 hover:text-white transition-colors">
                    Desk & Workspace Decor
                  </Link>
                </li>
                <li>
                  <Link to="/catalog?category=Keychains" className="text-zinc-400 hover:text-white transition-colors">
                    Keychains & Collectibles
                  </Link>
                </li>
                <li>
                  <Link to="/custom-service" className="text-accent hover:text-accent-light transition-colors font-medium flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    Custom 3D Print Quote
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 3: Customer Care & Services */}
            <div className="space-y-4">
              <h3 className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-accent">
                Services & Support
              </h3>
              <ul className="space-y-2.5 text-sm font-sans text-zinc-400">
                <li>
                  <Link to="/account" className="hover:text-white transition-colors">
                    Track Orders & Account
                  </Link>
                </li>
                <li>
                  <Link to="/about" className="hover:text-white transition-colors">
                    About Our Workshop
                  </Link>
                </li>
                <li>
                  <Link to="/contact" className="hover:text-white transition-colors">
                    Shipping & Delivery Info
                  </Link>
                </li>
                <li>
                  <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors flex items-center gap-1.5">
                    <span>Direct WhatsApp Concierge</span>
                  </a>
                </li>
              </ul>
            </div>

            {/* Column 4: Workshop & Location */}
            <div className="space-y-4">
              <h3 className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-accent">
                Workshop & Studio
              </h3>
              <ul className="space-y-3 text-sm text-zinc-400 font-sans">
                {businessAddress && (
                  <li className="flex items-start gap-2.5">
                    <MapPin className="h-4 w-4 shrink-0 text-accent mt-0.5" />
                    <span>{businessAddress}</span>
                  </li>
                )}
                {businessEmail && (
                  <li className="flex items-center gap-2.5">
                    <Mail className="h-4 w-4 shrink-0 text-accent" />
                    <a href={`mailto:${businessEmail}`} className="hover:text-white transition-colors font-mono text-xs">
                      {businessEmail}
                    </a>
                  </li>
                )}
                {businessPhone && (
                  <li className="flex items-center gap-2.5">
                    <Phone className="h-4 w-4 shrink-0 text-accent" />
                    <a href={`tel:${businessPhone.replace(/\s+/g, '')}`} className="hover:text-white transition-colors font-mono text-xs">
                      {businessPhone}
                    </a>
                  </li>
                )}
                {!businessAddress && !businessEmail && !businessPhone && (
                  <li className="flex items-center gap-2 text-zinc-500 text-xs">
                    <span>Maker Studio · Patiala, Punjab</span>
                  </li>
                )}
              </ul>
            </div>
          </div>

          {/* Footer Copyright Strip */}
          <div className="mt-16 flex flex-col gap-4 border-t border-zinc-800 pt-8 sm:flex-row sm:items-center sm:justify-between text-xs text-zinc-500 font-mono">
            <p>
              © {currentYear} {businessName}. Custom 3D Printing & Physical Fabrication.
            </p>

            <div className="flex flex-wrap items-center gap-4 text-[11px] uppercase tracking-wider">
              <span className="inline-flex items-center gap-1.5 text-zinc-400">
                <span className="h-2 w-2 rounded-full bg-accent" />
                Pan-India Delivery
              </span>
              <span className="text-zinc-700 hidden sm:inline">•</span>
              <span className="text-zinc-400">Custom CAD Slicing</span>
              <span className="text-zinc-700 hidden sm:inline">•</span>
              <span className="text-zinc-400">Secure Payments</span>
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
            <span className="text-xs font-bold leading-tight font-sans">Chat with Maker</span>
            <span className="text-[10px] text-emerald-100 font-medium leading-none font-mono">Instant Help</span>
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
              className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-line bg-white shadow-2xl z-10"
            >
              {/* Search Bar Input */}
              <div className="flex items-center gap-3 border-b border-line px-5 py-4">
                <Search className="h-5 w-5 text-accent shrink-0" />
                <input
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search lamps, lithophanes, desk decor, keychains..."
                  className="w-full bg-transparent text-sm sm:text-base font-sans font-medium text-ink placeholder:text-muted focus:outline-none"
                />
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="text-muted hover:text-ink"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : (
                  <span className="rounded bg-shell px-2 py-0.5 font-mono text-[10px] font-bold text-muted">
                    ESC
                  </span>
                )}
              </div>

              {/* Search Results Preview */}
              <div className="max-h-96 overflow-y-auto p-4 space-y-2">
                <div className="flex items-center justify-between px-2 py-1">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted">
                    {searchQuery.trim() ? `Matching Pieces (${filteredSearchResults.length})` : 'Popular Studio Picks'}
                  </span>
                  <Link
                    to="/catalog"
                    onClick={() => setIsSearchOpen(false)}
                    className="text-[11px] font-bold text-accent hover:underline font-mono"
                  >
                    View All in Catalog →
                  </Link>
                </div>

                {filteredSearchResults.length === 0 ? (
                  <div className="py-10 text-center text-xs text-muted">
                    No matching pieces found for &ldquo;{searchQuery}&rdquo;.
                  </div>
                ) : (
                  filteredSearchResults.map((prod) => (
                    <Link
                      key={prod.id}
                      to={`/product/${prod.id}`}
                      onClick={() => setIsSearchOpen(false)}
                      className="group flex items-center justify-between gap-4 rounded-2xl p-2.5 hover:bg-shell transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={prod.image}
                          alt={prod.name}
                          className="h-12 w-12 rounded-xl object-cover border border-line bg-shell shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="line-clamp-1 text-xs font-display font-bold text-ink group-hover:text-accent transition-colors">
                            {prod.name}
                          </p>
                          <span className="font-mono text-[10px] text-muted uppercase">
                            {prod.category || 'Workshop Item'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-mono text-sm font-bold text-ink">
                          ₹{Number(prod.price).toLocaleString('en-IN')}
                        </span>
                        <ArrowRight className="h-4 w-4 text-muted group-hover:translate-x-0.5 group-hover:text-accent transition-all" />
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