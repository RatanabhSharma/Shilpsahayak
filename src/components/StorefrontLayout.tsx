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
import { BrandLogo } from './ui';

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

  const currentYear = new Date().getFullYear();

  const isAuthenticated = !authLoading && !!user;
  const showAdmin = !authLoading && !roleLoading && isAuthenticated && isAdmin;

  return (
    <div className="min-h-screen flex flex-col bg-[#f4f2ef] text-charcoal">
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
      <header className="sticky top-0 z-50 border-b border-zinc-200/80 bg-[#f4f2ef]/95 backdrop-blur-md transition-shadow">
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
                      ? 'text-brand-500 bg-brand-50/80'
                      : 'text-charcoal-light hover:text-charcoal hover:bg-zinc-100/60',
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
                      : 'border-zinc-300 text-charcoal hover:border-brand-500 hover:text-brand-600',
                  ].join(' ')
                }
              >
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Admin
              </NavLink>
            )}
          </nav>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Custom Print Quick Action (Desktop) */}
            <Link
              to="/custom-service"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-brand-500/30 bg-brand-50 px-3.5 py-2 text-xs font-bold text-brand-700 hover:bg-brand-100 transition-colors shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5 text-brand-500" />
              <span>Instant Quote</span>
            </Link>

            {/* User Auth / Account */}
            {authLoading ? (
              <div className="h-10 w-10 animate-pulse rounded-xl bg-zinc-200" />
            ) : isAuthenticated ? (
              <Link
                to="/account"
                className="inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium text-charcoal hover:bg-zinc-100 transition-colors"
                aria-label="My account"
              >
                <User className="h-4 w-4 text-charcoal-light" />
                <span className="hidden md:inline font-semibold text-xs">Account</span>
              </Link>
            ) : (
              <Link
                to="/login"
                className="inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold text-charcoal hover:bg-zinc-100 transition-colors"
                aria-label="Sign in"
              >
                <User className="h-4 w-4 text-charcoal-light" />
                <span>Sign In</span>
              </Link>
            )}

            {/* Shopping Cart Button */}
            <Link
              to="/cart"
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl text-charcoal hover:bg-zinc-100 transition-colors"
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
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-charcoal hover:bg-zinc-100 transition-colors lg:hidden"
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
              className="overflow-hidden border-t border-zinc-200 bg-[#f4f2ef] lg:hidden"
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
                          ? 'bg-brand-50 text-brand-600'
                          : 'text-charcoal hover:bg-zinc-100',
                      ].join(' ')
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span>{item.name}</span>
                        {isActive ? (
                          <span className="h-2 w-2 rounded-full bg-brand-500" />
                        ) : (
                          <ArrowRight className="h-4 w-4 text-charcoal-lighter" />
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
                          ? 'border-brand-500 bg-brand-500 text-white'
                          : 'border-zinc-300 text-charcoal hover:border-charcoal',
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

              <p className="text-sm leading-relaxed text-slate-400">
                A custom 3D printing & rapid prototyping studio. From one-off personalized gifts to production batches for startups and engineering teams.
              </p>

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

            {/* Column 2: Explore */}
            <div className="space-y-4">
              <h3 className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-brand-400">
                Explore
              </h3>
              <ul className="space-y-2.5 text-sm">
                <li>
                  <Link to="/catalog" className="text-slate-400 hover:text-white transition-colors">
                    Catalog & Products
                  </Link>
                </li>
                <li>
                  <Link to="/custom-service" className="text-slate-400 hover:text-white transition-colors">
                    Custom 3D Printing
                  </Link>
                </li>
                <li>
                  <Link to="/about" className="text-slate-400 hover:text-white transition-colors">
                    About Our Workshop
                  </Link>
                </li>
                <li>
                  <Link to="/contact" className="text-slate-400 hover:text-white transition-colors">
                    Contact & Studio
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 3: Capabilities */}
            <div className="space-y-4">
              <h3 className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-brand-400">
                Capabilities
              </h3>
              <ul className="space-y-2.5 text-sm text-slate-400">
                <li>FDM Printing (PLA / PETG / ABS)</li>
                <li>High-Detail Resin SLA</li>
                <li>Functional CAD Prototyping</li>
                <li>Batch Enclosures & Mounts</li>
                <li>Personalized Decor & Gifts</li>
              </ul>
            </div>

            {/* Column 4: Contact & Studio Info */}
            <div className="space-y-4">
              <h3 className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-brand-400">
                Studio Location
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
              © {currentYear} {businessName}. If you can imagine it, we can print it.
            </p>

            <div className="flex items-center gap-4 font-mono text-[11px] uppercase tracking-wider">
              <span className="inline-flex items-center gap-1.5 text-slate-400">
                <span className="h-2 w-2 rounded-full bg-brand-500" />
                Proudly Made in India
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}