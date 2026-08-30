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
  Search,
  MessageCircle,
  Instagram,
} from 'lucide-react';
import {
  AnimatePresence,
  motion,
} from 'framer-motion';

import { useStore } from '../store';
import { useAuth } from '../hooks/useAuth';
import { useSettings } from '../hooks/useSettings';
import { useUserRole } from '../hooks/useUserRole';
import { useProducts } from '../hooks/useProducts';
import { BrandLogo } from './ui';
import { CartDrawer } from './CartDrawer';
import whatsappLogo from '../assets/pictures/whatsapp.png';

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
    name: 'Shop',
    path: '/shop',
  },
  {
    name: 'Shilp Studio',
    path: '/shilp-studio',
  },
  {
    name: 'Our Story',
    path: '/our-story',
  },
  {
    name: 'Reach Us',
    path: '/reach-us',
  },
];

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
     Close mobile menu on route change
     ---------------------------------------------------------- */

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  /* ----------------------------------------------------------
     Dynamic browser tab title per route
     ---------------------------------------------------------- */

  useEffect(() => {
    const PAGE_TITLES: Record<string, string> = {
      '/':             'Where Ideas Come to Life',
      '/shop':         'Shop',
      '/shilp-studio': 'Shilp Studio',
      '/our-story':    'Our Story',
      '/reach-us':     'Reach Us',
      '/cart':         'Cart',
      '/checkout':     'Checkout',
      '/login':        'Sign In',
      '/account':      'My Account',
    };

    // Match exact first, then prefix (e.g. /product/:id, /shop?category=...)
    const path = location.pathname;
    const exact = PAGE_TITLES[path];
    if (exact) {
      document.title = exact;
    } else if (path.startsWith('/product/')) {
      document.title = 'Product | Shilp Sahayak';
    } else if (path.startsWith('/shop')) {
      document.title = 'Shop | Shilp Sahayak';
    } else {
      document.title = 'Shilp Sahayak — Where Ideas Come to Life';
    }
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

  // Transparent overlay only on the home page; all other pages always use solid navbar
  const isHomePage = location.pathname === '/';
  const isTransparent = isHomePage && !isScrolled;

  return (
    <div className="min-h-screen flex flex-col bg-paper text-ink">
      {/* Accessibility Skip Link */}
      <a
        href="#main-content"
        className="fixed left-4 top-4 z-[100] -translate-y-20 rounded-xl bg-dark px-4 py-2 text-sm font-medium text-white shadow-lg transition-transform focus:translate-y-0"
      >
        Skip to content
      </a>

      {/* Persistent Single Stacked Header: Navbar on Top */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isTransparent
            ? 'bg-transparent'
            : 'bg-white/90 backdrop-blur-md shadow-sm border-b border-black/5'
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
                      : isTransparent
                      ? 'text-white/90 hover:text-white drop-shadow'
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
              className={`inline-flex h-10 w-10 items-center justify-center rounded-full transition-colors ${isTransparent ? 'text-white hover:bg-white/10 drop-shadow' : 'text-ink hover:bg-shell'}`}
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
                className={`inline-flex h-10 w-10 items-center justify-center rounded-full transition-colors ${isTransparent ? 'text-white hover:bg-white/10 drop-shadow' : 'text-ink hover:bg-shell'}`}
                aria-label="My account"
                title="My Account"
              >
                <User className="h-5 w-5" />
              </Link>
            ) : (
              <Link
                to="/login"
                className={`inline-flex h-10 w-10 items-center justify-center rounded-full transition-colors ${isTransparent ? 'text-white hover:bg-white/10 drop-shadow' : 'text-ink hover:bg-shell'}`}
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
              className={`relative inline-flex h-10 w-10 items-center justify-center rounded-full transition-colors ${isTransparent ? 'text-white hover:bg-white/10 drop-shadow' : 'text-ink hover:bg-shell'}`}
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
              className={`inline-flex h-10 w-10 items-center justify-center rounded-full transition-colors lg:hidden ${isTransparent ? 'text-white hover:bg-white/10 drop-shadow' : 'text-ink hover:bg-shell'}`}
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
                    to="/shilp-studio"
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

      </header>

      {/* Main Content Area */}
      <main id="main-content" className="min-h-0 flex-1">
        <Outlet />
      </main>

      {/* Slide-in Cart Drawer */}
      <CartDrawer />

      {/* Minimal & Quiet Premium Footer */}
      <footer className="mt-20 border-t border-zinc-800 bg-dark text-zinc-400">
        <div className="mx-auto max-w-[1440px] px-5 py-12 sm:px-8 sm:py-16 lg:px-10">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-12">
            {/* Column 1: Brand & Social Icons Only */}
            <div className="col-span-2 sm:col-span-1 space-y-4">
              <Link to="/" className="inline-block">
                <BrandLogo isDarkTheme={true} size="md" />
              </Link>
              <p className="text-xs text-zinc-500 font-sans leading-relaxed">
                Bespoke 3D Fabrication Studio<br />
                {businessAddress || 'Patiala, Punjab, India'}
              </p>

              {/* Social Media = Icons Only */}
              <div className="flex items-center gap-2 pt-1">
                <a
                  href="https://instagram.com/shilpsahayak"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/80 text-zinc-400 hover:border-zinc-700 hover:text-white transition-colors"
                >
                  <Instagram className="h-4 w-4" />
                </a>
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="WhatsApp"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/80 text-zinc-400 hover:border-emerald-500/50 hover:text-[#25D366] transition-colors"
                >
                  <MessageCircle className="h-4 w-4" />
                </a>
                {businessEmail && (
                  <a
                    href={`mailto:${businessEmail}`}
                    aria-label="Email studio"
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/80 text-zinc-400 hover:border-zinc-700 hover:text-white transition-colors"
                  >
                    <Mail className="h-4 w-4" />
                  </a>
                )}
                {businessPhone && (
                  <a
                    href={`tel:${businessPhone.replace(/\s+/g, '')}`}
                    aria-label="Call studio"
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/80 text-zinc-400 hover:border-zinc-700 hover:text-white transition-colors"
                  >
                    <Phone className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>

            {/* Column 2: Collections */}
            <div className="space-y-3">
              <h3 className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-zinc-300">
                Collections
              </h3>
              <ul className="space-y-2 text-xs sm:text-sm font-sans text-zinc-400">
                <li>
                  <Link to="/shop" className="hover:text-white transition-colors">
                    All 3D Pieces
                  </Link>
                </li>
                <li>
                  <Link to="/shop?category=Lamps%20%26%20Lighting" className="hover:text-white transition-colors">
                    Lamps & Lithophanes
                  </Link>
                </li>
                <li>
                  <Link to="/shop?category=Desk%20Decor" className="hover:text-white transition-colors">
                    Desk & Workspace
                  </Link>
                </li>
                <li>
                  <Link to="/shop?category=Keychains" className="hover:text-white transition-colors">
                    Keychains & Gifts
                  </Link>
                </li>
                <li>
                  <Link to="/shilp-studio" className="text-accent hover:text-accent-light transition-colors font-medium">
                    Custom 3D Printing
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 3: Studio & Services */}
            <div className="space-y-3">
              <h3 className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-zinc-300">
                Studio
              </h3>
              <ul className="space-y-2 text-xs sm:text-sm font-sans text-zinc-400">
                <li>
                  <Link to="/shilp-studio" className="hover:text-white transition-colors">
                    Instant STL Slicer
                  </Link>
                </li>
                <li>
                  <Link to="/reach-us?type=corporate" className="hover:text-white transition-colors">
                    Corporate & Bulk
                  </Link>
                </li>
                <li>
                  <Link to="/our-story" className="hover:text-white transition-colors">
                    About Workshop
                  </Link>
                </li>
                <li>
                  <Link to="/reach-us" className="hover:text-white transition-colors">
                    Contact & Inquiries
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 4: Account & Support */}
            <div className="space-y-3">
              <h3 className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-zinc-300">
                Support
              </h3>
              <ul className="space-y-2 text-xs sm:text-sm font-sans text-zinc-400">
                <li>
                  <Link to="/account" className="hover:text-white transition-colors">
                    Track Orders
                  </Link>
                </li>
                <li>
                  <Link to="/account" className="hover:text-white transition-colors">
                    CAD Quotes
                  </Link>
                </li>
                <li>
                  <Link to="/reach-us" className="hover:text-white transition-colors">
                    Shipping & Delivery
                  </Link>
                </li>
                {businessEmail && (
                  <li>
                    <a href={`mailto:${businessEmail}`} className="hover:text-white transition-colors font-mono text-xs">
                      {businessEmail}
                    </a>
                  </li>
                )}
              </ul>
            </div>
          </div>

          {/* Minimal Copyright Strip */}
          <div className="mt-12 sm:mt-16 flex flex-col gap-3 border-t border-zinc-800/80 pt-6 sm:flex-row sm:items-center sm:justify-between text-xs text-zinc-500 font-mono">
            <p>
              © {currentYear} {businessName}. All rights reserved.
            </p>
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-zinc-500">
              <span>Pan-India Tracked Dispatch</span>
              <span className="text-zinc-700 hidden sm:inline">•</span>
              <span>Patiala Workshop, India</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Floating WhatsApp Support Button (Compact Circular Logo Only) */}
      <aside className="fixed bottom-5 right-5 z-40 sm:bottom-6 sm:right-6">
        <a
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex h-[52px] w-[52px] sm:h-[58px] sm:w-[58px] items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-emerald-600/30 transition-all duration-200 ease-out hover:scale-105 hover:bg-[#1EBE5D] hover:shadow-xl hover:shadow-emerald-600/40 active:scale-95 touch-manipulation"
          aria-label="Chat with Shilp Sahayak on WhatsApp"
          title="Chat with Shilp Sahayak on WhatsApp"
        >
          <img
            src={whatsappLogo}
            alt=""
            aria-hidden="true"
            className="h-7 w-7 sm:h-8 sm:w-8 object-contain transition-transform duration-200 group-hover:scale-105"
          />
          <span className="sr-only">Chat with Shilp Sahayak on WhatsApp</span>
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
                    to="/shop"
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


