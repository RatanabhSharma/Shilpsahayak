import {
  Fragment,
  useEffect,
  useMemo,
  useState,
  useCallback,
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
  ShoppingCart,
  User,
  X,
  Phone,
  Mail,
  Search,
  MessageCircle,
  Instagram,
  Youtube,
  Linkedin,
  Twitter,
  Github,
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
import { useHomepage } from '../hooks/useHomepage';
import { useBrandingConfig } from '../hooks/useBranding';
import { useNavigationConfig, DEFAULT_NAVIGATION_CONFIG } from '../hooks/useNavigation';
import { BrandLogo } from './ui';
import { CartDrawer } from './CartDrawer';

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
     Scroll to top on navbar item click
     ---------------------------------------------------------- */
  const handleNavClick = () => {
    setIsMobileMenuOpen(false);
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    if (document.documentElement) {
      document.documentElement.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    }
    if (document.body) {
      document.body.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    }
  };

  /* ----------------------------------------------------------
     Scroll listener for sticky header background transition
     ---------------------------------------------------------- */
  useEffect(() => {
    const handleScroll = () => {
      const top = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
      setIsScrolled(top > 15);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('scroll', handleScroll);
    };
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
     Business settings & Storefront CMS
     ---------------------------------------------------------- */

  const { data: settings } = useSettings();
  const { data: brandingConfig } = useBrandingConfig();
  const { data: storefrontConfig } = useHomepage();
  const { data: navigationConfig } = useNavigationConfig();

  // Announcement bar dismissible state in session/local storage
  const bannerConfig = (storefrontConfig as any)?.announcement;
  const isBannerActive = bannerConfig?.active && ((storefrontConfig as any)?.sectionVisibility?.announcement !== false);
  const [isBannerDismissed, setIsBannerDismissed] = useState(false);

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
      '/shilp-studio': 'Shilp Studio — Custom 3D Printing',
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

  // Dynamic navigation — fallback to hardcoded defaults when Firestore doc is absent
  const nav = navigationConfig ?? DEFAULT_NAVIGATION_CONFIG;
  const headerNavItems = nav.headerNav?.length ? nav.headerNav : DEFAULT_NAVIGATION_CONFIG.headerNav;
  const footerQuickLinks = nav.footerQuickLinks?.length ? nav.footerQuickLinks : DEFAULT_NAVIGATION_CONFIG.footerQuickLinks;
  const footerStudioLinks = nav.footerStudioLinks?.length ? nav.footerStudioLinks : DEFAULT_NAVIGATION_CONFIG.footerStudioLinks ?? [];
  const footerSupportLinks = nav.footerSupportLinks?.length ? nav.footerSupportLinks : DEFAULT_NAVIGATION_CONFIG.footerSupportLinks;
  const footerLegalLinks = nav.footerLegalLinks?.length ? nav.footerLegalLinks : DEFAULT_NAVIGATION_CONFIG.footerLegalLinks;

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

  // Cookie consent banner — shown once, stored in localStorage
  const [showCookieBanner, setShowCookieBanner] = useState<boolean>(() => {
    try {
      return !localStorage.getItem('shilp_cookie_notice_dismissed');
    } catch {
      return false;
    }
  });

  const dismissCookieBanner = useCallback(() => {
    try {
      localStorage.setItem('shilp_cookie_notice_dismissed', '1');
    } catch {
      // ignore (private browsing)
    }
    setShowCookieBanner(false);
  }, []);

  const isAuthenticated = !authLoading && !!user;
  const showAdmin = !authLoading && !roleLoading && isAuthenticated && isAdmin;

  // Transparent overlay only on the home page when at top and mobile menu is closed; all other pages always use solid navbar
  const isHomePage = location.pathname === '/';
  const isTransparent = isHomePage && !isScrolled && !isMobileMenuOpen;

  return (
    <div className="min-h-screen flex flex-col bg-paper text-ink">
      {/* ── Cookie Notice Banner ─────────────────────────────── */}
      {showCookieBanner && (
          <div
            role="region"
            aria-label="Cookie notice"
            aria-live="polite"
            className="fixed bottom-0 left-0 right-0 z-[60] bg-dark/95 backdrop-blur-md border-t border-zinc-700 px-3.5 py-2 sm:px-8 sm:py-2.5"
          >
            <div className="mx-auto max-w-[1440px] flex items-center justify-between gap-3">
              <p className="font-sans text-xs text-zinc-300 leading-snug">
                Strictly necessary storage only (auth &amp; cart) — no advertising cookies.{' '}
                <Link
                  to="/privacy-policy"
                  className="text-accent hover:underline font-medium ml-1"
                  onClick={dismissCookieBanner}
                >
                  Privacy Policy
                </Link>
              </p>
              <button
                type="button"
                onClick={dismissCookieBanner}
                className="shrink-0 min-h-[36px] rounded-lg bg-zinc-700 hover:bg-zinc-600 px-3.5 py-1.5 font-mono text-xs font-bold text-white transition-colors focus:outline-none focus:ring-2 focus:ring-accent cursor-pointer flex items-center justify-center"
                aria-label="Dismiss cookie notice"
              >
                Got it
              </button>
            </div>
          </div>
        )}

      {/* Accessibility Skip Link */}
      <a
        href="#main-content"
        className="fixed left-4 top-4 z-[100] -translate-y-20 rounded-xl bg-dark px-4 py-2 text-sm font-medium text-white shadow-lg transition-transform focus:translate-y-0"
      >
        Skip to content
      </a>

      {/* Persistent Single Stacked Header: Announcement Bar + Navbar */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 w-full max-w-full transition-[background-color,border-color,box-shadow] duration-200 ease-out ${
          isTransparent
            ? 'bg-transparent border-transparent'
            : 'bg-white/95 backdrop-blur-md shadow-sm border-b border-black/10'
        }`}
      >
        {/* Dynamic CMS Announcement Banner */}
        {isBannerActive && !isBannerDismissed && bannerConfig?.text && (
          <div
            role="region"
            aria-label="Announcement"
            style={{
              backgroundColor: bannerConfig.backgroundColorHex || '#111111',
              color: bannerConfig.textColorHex || '#FFFFFF',
            }}
            className="w-full py-1.5 px-3 sm:px-6 text-center text-[11px] sm:text-xs font-mono font-medium flex items-center justify-between border-b border-white/10 shrink-0"
          >
            <div className="mx-auto flex items-center justify-center gap-2 flex-wrap">
              <span>{bannerConfig.text}</span>
              {bannerConfig.link && (
                <Link
                  to={bannerConfig.link}
                  className="font-bold underline text-accent hover:opacity-90 transition-opacity ml-1"
                >
                  {bannerConfig.linkLabel || 'Learn More ➔'}
                </Link>
              )}
            </div>
            <button
              type="button"
              onClick={() => setIsBannerDismissed(true)}
              aria-label="Dismiss announcement"
              className="p-1 hover:opacity-75 transition-opacity rounded-sm focus:outline-none focus:ring-1 focus:ring-accent ml-2 shrink-0 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="mx-auto flex h-16 max-w-[1440px] w-full items-center justify-between px-3 sm:px-6 lg:h-20 lg:px-10">
          {/* Logo */}
          <Link
            to="/"
            onClick={handleNavClick}
            className="group flex items-center min-w-0 shrink mr-2"
            aria-label={`${businessName} home`}
          >
            <BrandLogo size="md" isDarkTheme={isTransparent} />
          </Link>

          {/* Desktop Navigation Links with Generous Spacing */}
          <nav
            aria-label="Primary navigation"
            className="hidden items-center gap-4 lg:gap-6 xl:gap-8 lg:flex mx-4 xl:mx-8 min-w-0"
          >
            {headerNavItems.map((item) => (
              <NavLink
                key={item.id}
                to={item.href}
                end={item.href === '/'}
                onClick={handleNavClick}
                {...(item.isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                className={({ isActive }) =>
                  [
                    'relative py-2 text-sm font-display font-medium transition-colors group whitespace-nowrap',
                    isActive
                      ? 'text-accent font-semibold'
                      : isTransparent
                      ? 'text-white/90 hover:text-white drop-shadow-none shadow-solid-sm'
                      : 'text-ink/80 hover:text-accent',
                  ].join(' ')
                }
              >
                {({ isActive }) => (
                  <span className="relative flex items-center gap-1.5 py-1">
                    {item.label}
                    {item.badge && (
                      <span className="inline-flex items-center rounded-full bg-accent/10 px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider text-accent">
                        {item.badge}
                      </span>
                    )}
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
                    'font-mono text-[10px] font-bold uppercase tracking-wider shrink-0',
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
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Search Icon Button */}
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              className={`inline-flex h-10 w-10 sm:h-10 sm:w-10 items-center justify-center rounded-xl transition-colors shadow-solid-sm active:scale-95 ${isTransparent ? 'text-white hover:bg-white/10 drop-shadow-none shadow-solid-sm' : 'text-ink hover:bg-shell'}`}
              aria-label="Search products"
              title="Search products (Ctrl+K or ⌘K)"
            >
              <Search className="h-5 w-5" />
            </button>

            {/* User Auth / Account */}
            {authLoading ? (
              <div className="h-10 w-10 sm:h-10 sm:w-10 animate-pulse rounded-xl bg-shell" />
            ) : isAuthenticated ? (
              <Link
                to="/account"
                className={`inline-flex h-10 w-10 sm:h-10 sm:w-10 items-center justify-center rounded-xl transition-colors shadow-solid-sm active:scale-95 ${isTransparent ? 'text-white hover:bg-white/10 drop-shadow-none shadow-solid-sm' : 'text-ink hover:bg-shell'}`}
                aria-label="My account"
                title="My Account"
              >
                <User className="h-5 w-5" />
              </Link>
            ) : (
              <Link
                to="/login"
                className={`inline-flex h-10 w-10 sm:h-10 sm:w-10 items-center justify-center rounded-xl transition-colors shadow-solid-sm active:scale-95 ${isTransparent ? 'text-white hover:bg-white/10 drop-shadow-none shadow-solid-sm' : 'text-ink hover:bg-shell'}`}
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
              className={`relative inline-flex h-10 w-10 sm:h-10 sm:w-10 items-center justify-center rounded-xl transition-colors shadow-solid-sm active:scale-95 ${isTransparent ? 'text-white hover:bg-white/10 drop-shadow-none shadow-solid-sm' : 'text-ink hover:bg-shell'}`}
              aria-label={`Shopping cart with ${cartItemCount} items`}
              title="View Cart"
            >
              <ShoppingCart className="h-5 w-5" aria-hidden="true" />
              {cartItemCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4.5 min-w-[18px] sm:h-5 sm:min-w-[20px] items-center justify-center rounded-full bg-accent px-1 font-mono text-[9px] sm:text-[10px] font-bold leading-none text-white shadow-sm animate-in zoom-in">
                  {cartItemCount > 99 ? '99+' : cartItemCount}
                </span>
              )}
            </button>

            {/* Mobile menu hamburger toggle */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
              className={`inline-flex h-10 w-10 sm:h-10 sm:w-10 items-center justify-center rounded-xl transition-colors shadow-solid-sm active:scale-95 lg:hidden ${isTransparent ? 'text-white hover:bg-white/10 drop-shadow-none shadow-solid-sm' : 'text-ink hover:bg-shell'}`}
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
              className="overflow-hidden border-t border-line bg-paper lg:hidden max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain"
            >
              <nav
                aria-label="Mobile navigation"
                className="mx-auto max-w-[1440px] px-4 py-4 sm:px-8 sm:py-5 space-y-2"
              >
                {headerNavItems.map((item) => (
                  <NavLink
                    key={item.id}
                    to={item.href}
                    end={item.href === '/'}
                    onClick={handleNavClick}
                    {...(item.isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
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
                        <span className="flex items-center gap-2">
                          {item.label}
                          {item.badge && (
                            <span className="inline-flex items-center rounded-full bg-accent/10 px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider text-accent">
                              {item.badge}
                            </span>
                          )}
                        </span>
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
                    onClick={handleNavClick}
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
                    to="/shop"
                    onClick={handleNavClick}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3.5 text-sm font-bold text-white shadow-md hover:bg-accent-dark transition-colors"
                  >
                    <span>Browse 3D Catalog</span>
                    <ArrowRight className="h-4 w-4" />
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
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {brandingConfig?.socialLinks?.instagram && (
                  <a
                    href={brandingConfig.socialLinks.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Instagram"
                    className="flex h-10 w-10 sm:h-9 sm:w-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/80 text-zinc-400 hover:border-zinc-700 hover:text-white transition-colors"
                  >
                    <Instagram className="h-4.5 w-4.5 sm:h-4 sm:w-4" />
                  </a>
                )}
                {brandingConfig?.socialLinks?.youtube && (
                  <a
                    href={brandingConfig.socialLinks.youtube}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="YouTube"
                    className="flex h-10 w-10 sm:h-9 sm:w-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/80 text-zinc-400 hover:border-zinc-700 hover:text-white transition-colors"
                  >
                    <Youtube className="h-4.5 w-4.5 sm:h-4 sm:w-4" />
                  </a>
                )}
                {brandingConfig?.socialLinks?.linkedin && (
                  <a
                    href={brandingConfig.socialLinks.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="LinkedIn"
                    className="flex h-10 w-10 sm:h-9 sm:w-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/80 text-zinc-400 hover:border-zinc-700 hover:text-white transition-colors"
                  >
                    <Linkedin className="h-4.5 w-4.5 sm:h-4 sm:w-4" />
                  </a>
                )}
                {brandingConfig?.socialLinks?.twitter && (
                  <a
                    href={brandingConfig.socialLinks.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Twitter / X"
                    className="flex h-10 w-10 sm:h-9 sm:w-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/80 text-zinc-400 hover:border-zinc-700 hover:text-white transition-colors"
                  >
                    <Twitter className="h-4.5 w-4.5 sm:h-4 sm:w-4" />
                  </a>
                )}
                {brandingConfig?.socialLinks?.github && (
                  <a
                    href={brandingConfig.socialLinks.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="GitHub"
                    className="flex h-10 w-10 sm:h-9 sm:w-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/80 text-zinc-400 hover:border-zinc-700 hover:text-white transition-colors"
                  >
                    <Github className="h-4.5 w-4.5 sm:h-4 sm:w-4" />
                  </a>
                )}
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="WhatsApp"
                  className="flex h-10 w-10 sm:h-9 sm:w-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/80 text-zinc-400 hover:border-emerald-500/50 hover:text-[#25D366] transition-colors"
                >
                  <MessageCircle className="h-4.5 w-4.5 sm:h-4 sm:w-4" />
                </a>
                {businessEmail && (
                  <a
                    href={`mailto:${businessEmail}`}
                    aria-label="Email studio"
                    className="flex h-10 w-10 sm:h-9 sm:w-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/80 text-zinc-400 hover:border-zinc-700 hover:text-white transition-colors"
                  >
                    <Mail className="h-4.5 w-4.5 sm:h-4 sm:w-4" />
                  </a>
                )}
                {businessPhone && (
                  <a
                    href={`tel:${businessPhone.replace(/\s+/g, '')}`}
                    aria-label="Call studio"
                    className="flex h-10 w-10 sm:h-9 sm:w-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/80 text-zinc-400 hover:border-zinc-700 hover:text-white transition-colors"
                  >
                    <Phone className="h-4.5 w-4.5 sm:h-4 sm:w-4" />
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
                {footerQuickLinks.map((link) => (
                  <li key={link.id}>
                    {link.isExternal ? (
                      <a href={link.href} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                        {link.label}
                      </a>
                    ) : (
                      <Link to={link.href} className="hover:text-white transition-colors">
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 3: Studio */}
            <div className="space-y-3">
              <h3 className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-zinc-300">
                Studio
              </h3>
              <ul className="space-y-2 text-xs sm:text-sm font-sans text-zinc-400">
                {footerStudioLinks.map((link) => (
                  <li key={link.id}>
                    {link.isExternal ? (
                      <a href={link.href} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                        {link.label}
                      </a>
                    ) : (
                      <Link to={link.href} className="hover:text-white transition-colors">
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 4: Support */}
            <div className="space-y-3">
              <h3 className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-zinc-300">
                Support
              </h3>
              <ul className="space-y-2 text-xs sm:text-sm font-sans text-zinc-400">
                {footerSupportLinks.map((link) => (
                  <li key={link.id}>
                    {link.isExternal ? (
                      <a href={link.href} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                        {link.label}
                      </a>
                    ) : (
                      <Link to={link.href} className="hover:text-white transition-colors">
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
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

          {/* Minimal Copyright Strip with Dynamic Legal Links */}
          <div className="mt-12 sm:mt-16 flex flex-col gap-3 border-t border-zinc-800/80 pt-6 sm:flex-row sm:items-center sm:justify-between text-xs text-zinc-500 font-mono">
            <p>
              © {currentYear} {businessName}. All rights reserved.
            </p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px]">
              {footerLegalLinks.map((link, idx) => (
                <Fragment key={link.id}>
                  {link.isExternal ? (
                    <a key={link.id} href={link.href} target="_blank" rel="noopener noreferrer" className="hover:text-zinc-300 transition-colors">
                      {link.label}
                    </a>
                  ) : (
                    <Link key={link.id} to={link.href} className="hover:text-zinc-300 transition-colors">
                      {link.label}
                    </Link>
                  )}
                  {idx < footerLegalLinks.length - 1 && (
                    <span className="text-zinc-700 hidden sm:inline">·</span>
                  )}
                </Fragment>
              ))}
            </div>
          </div>
        </div>
      </footer>

      {/* Floating WhatsApp button removed temporarily */}

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
                  aria-label="Search products"
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
                    aria-label="Clear search"
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



