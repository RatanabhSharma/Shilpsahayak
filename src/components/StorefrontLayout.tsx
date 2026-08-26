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
    path: '/catalog',
  },
  {
    name: 'Custom 3D Printing',
    path: '/custom-service',
  },
  {
    name: 'About',
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
      className="relative z-40 h-8 overflow-hidden bg-[#b4491e] text-white flex items-center justify-center px-4"
      role="region"
      aria-label="Store announcements"
    >
      <AnimatePresence mode="wait">
        <motion.p
          key={currentIndex}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="text-center font-mono text-[9px] font-medium uppercase tracking-[0.16em] sm:text-[10px] text-white/95 truncate"
        >
          {cleanMessages[currentIndex]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

/* ============================================================
   STOREFRONT LAYOUT
   ============================================================ */

export function StorefrontLayout() {
  const [
    isMobileMenuOpen,
    setIsMobileMenuOpen,
  ] = useState(false);

  const location = useLocation();

  /* ----------------------------------------------------------
     Store / Cart
     ---------------------------------------------------------- */

  const cart = useStore(
    (state) => state.cart
  );

  const cartItemCount = cart.reduce(
    (total, item) =>
      total + item.quantity,
    0
  );

  /* ----------------------------------------------------------
     Authentication
     ---------------------------------------------------------- */

  const {
    user,
    loading: authLoading,
  } = useAuth();

  /* ----------------------------------------------------------
     User role
     ---------------------------------------------------------- */

  const {
    isAdmin,
    loading: roleLoading,
  } = useUserRole();

  /* ----------------------------------------------------------
     Business settings
     ---------------------------------------------------------- */

  const {
    data: settings,
  } = useSettings();

  /* ----------------------------------------------------------
     Homepage settings
     ---------------------------------------------------------- */

  const {
    data: homepageSettings,
  } = useHomepage();

  /* ----------------------------------------------------------
     Close mobile menu when route changes
     ---------------------------------------------------------- */

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  /* ----------------------------------------------------------
     Prevent page scrolling when mobile menu is open
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

  const businessName =
    settings?.businessName ||
    'Shilp Sahayak';

  const businessEmail =
    settings?.email ||
    'hello@shilpsahayak.com';

  const whatsappNumber =
    settings?.whatsappNumber || '';

  const businessAddress =
    settings?.address ||
    'Patiala, Punjab 147001';

  const whatsappLink = whatsappNumber
    ? `https://wa.me/${whatsappNumber.replace(
        /\D/g,
        ''
      )}`
    : '';

  const currentYear =
    new Date().getFullYear();

  /* ----------------------------------------------------------
     Authentication state
     ---------------------------------------------------------- */

  const isAuthenticated =
    !authLoading && !!user;

  const showAdmin =
    !authLoading &&
    !roleLoading &&
    isAuthenticated &&
    isAdmin;

  return (
    <div className="min-h-screen bg-[#f7f4ee] text-[#14120f]">

      {/* ======================================================
          ACCESSIBILITY
          ====================================================== */}

      <a
        href="#main-content"
        className="fixed left-4 top-4 z-[100] -translate-y-20 bg-[#14120f] px-4 py-2 text-sm font-medium text-[#f7f4ee] shadow-lg transition-transform focus:translate-y-0"
      >
        Skip to content
      </a>

      {/* ======================================================
          ANNOUNCEMENT BAR

          Completely controlled by Firestore / Admin.
          No hardcoded announcement text here.
          ====================================================== */}

      {homepageSettings?.announcementEnabled &&
        homepageSettings.announcementMessages.length > 0 && (
          <AnnouncementBar
            messages={
              homepageSettings.announcementMessages
            }
            duration={
              homepageSettings.announcementDuration
            }
          />
        )}

      {/* ======================================================
          HEADER
          ====================================================== */}

      <header className="sticky top-0 z-50 border-b border-[#d9d2c7] bg-[#f7f4ee]/95 backdrop-blur-sm">

        <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-5 px-5 sm:px-8 lg:h-[72px] lg:px-10">

          {/* ------------------------------------------------
              LOGO
              ------------------------------------------------ */}

          <Link
            to="/"
            className="group flex min-w-0 shrink-0 items-center gap-2.5"
            aria-label={`${businessName} home`}
          >
            <div
              className="relative flex h-9 w-9 shrink-0 items-center justify-center border border-[#14120f] bg-[#14120f] text-[#f7f4ee]"
              aria-hidden="true"
            >
              <span className="font-display text-sm font-bold tracking-[-0.08em]">
                SS
              </span>

              <span className="absolute -bottom-px -right-px h-2 w-2 bg-[#b4491e]" />
            </div>

            <div className="min-w-0">
              <span className="block truncate font-display text-[16px] font-semibold leading-none tracking-[-0.02em] text-[#14120f] transition-colors group-hover:text-[#b4491e] sm:text-[17px]">
                {businessName}
              </span>

              <span className="mt-1 block font-mono text-[8px] uppercase tracking-[0.16em] text-[#8e8275]">
                Crafted with precision
              </span>
            </div>
          </Link>

          {/* ==================================================
              DESKTOP NAVIGATION
              ================================================== */}

          <nav
            aria-label="Primary navigation"
            className="ml-auto hidden items-center gap-6 lg:flex"
          >
            {NAV_ITEMS.slice(1).map(
              (item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    [
                      'group relative py-1.5 px-0.5 text-[13.5px] transition-colors duration-150',
                      isActive
                        ? 'font-medium text-[#14120f]'
                        : 'text-[#6b6156] hover:text-[#14120f]',
                    ].join(' ')
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span className="relative z-10">{item.name}</span>
                      <span
                        className={`absolute -bottom-0.5 left-0 h-[2px] w-full bg-[#b4491e] transition-transform duration-200 origin-left ${
                          isActive
                            ? 'scale-x-100'
                            : 'scale-x-0 group-hover:scale-x-100 group-hover:bg-[#b4491e]/60'
                        }`}
                      />
                    </>
                  )}
                </NavLink>
              )
            )}

            {/* Admin Panel */}
            {showAdmin && (
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  [
                    'inline-flex items-center gap-1.5 border px-2.5 py-1.5',
                    'font-mono text-[9px] uppercase tracking-[0.12em]',
                    'transition-all duration-150',
                    isActive
                      ? 'border-[#14120f] bg-[#14120f] text-[#f7f4ee]'
                      : 'border-[#cfc7bb] text-[#514a42] hover:border-[#14120f] hover:bg-[#14120f] hover:text-[#f7f4ee]',
                  ].join(' ')
                }
              >
                <ShieldCheck
                  className="h-3 w-3"
                  aria-hidden="true"
                />

                Admin Panel
              </NavLink>
            )}
          </nav>

          {/* ==================================================
              HEADER ACTIONS
              ================================================== */}

          <div className="ml-auto flex items-center gap-1 lg:ml-5">

            {/* Authentication */}
            {authLoading ? (
              <div
                className="h-10 w-16 animate-pulse"
                aria-hidden="true"
              />
            ) : isAuthenticated ? (
              <Link
                to="/account"
                className="group inline-flex h-10 items-center gap-2 px-2.5 text-[#514a42] transition-colors hover:text-[#14120f]"
                aria-label="Open my account"
              >
                <User
                  className="h-[18px] w-[18px]"
                  aria-hidden="true"
                />

                <span className="hidden text-[13px] font-medium sm:inline">
                  Account
                </span>
              </Link>
            ) : (
              <Link
                to="/login"
                className="group inline-flex h-10 items-center gap-2 px-2.5 text-[#514a42] transition-colors hover:text-[#14120f]"
                aria-label="Login to your account"
              >
                <User
                  className="h-[18px] w-[18px]"
                  aria-hidden="true"
                />

                <span className="hidden text-[13px] font-medium sm:inline">
                  Login
                </span>
              </Link>
            )}

            {/* Cart */}
            <Link
              to="/cart"
              className="relative inline-flex h-10 w-10 items-center justify-center text-[#514a42] transition-colors hover:text-[#14120f]"
              aria-label={`Shopping cart with ${cartItemCount} ${
                cartItemCount === 1
                  ? 'item'
                  : 'items'
              }`}
            >
              <ShoppingBag
                className="h-[19px] w-[19px]"
                aria-hidden="true"
              />

              {cartItemCount > 0 && (
                <span className="absolute right-0.5 top-0.5 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-[#b4491e] px-1 font-mono text-[9px] font-semibold leading-none text-white">
                  {cartItemCount > 99
                    ? '99+'
                    : cartItemCount}
                </span>
              )}
            </Link>

            {/* Mobile menu button */}
            <button
              type="button"
              onClick={() =>
                setIsMobileMenuOpen(
                  (previous) =>
                    !previous
                )
              }
              className="inline-flex h-10 w-10 items-center justify-center text-[#514a42] transition-colors hover:text-[#14120f] lg:hidden"
              aria-label={
                isMobileMenuOpen
                  ? 'Close navigation menu'
                  : 'Open navigation menu'
              }
              aria-expanded={
                isMobileMenuOpen
              }
              aria-controls="mobile-navigation"
            >
              {isMobileMenuOpen ? (
                <X
                  className="h-5 w-5"
                  aria-hidden="true"
                />
              ) : (
                <Menu
                  className="h-5 w-5"
                  aria-hidden="true"
                />
              )}
            </button>
          </div>
        </div>

        {/* ==================================================
            MOBILE NAVIGATION
            ================================================== */}

        <AnimatePresence initial={false}>
          {isMobileMenuOpen && (
            <motion.div
              id="mobile-navigation"
              initial={{
                opacity: 0,
                height: 0,
              }}
              animate={{
                opacity: 1,
                height: 'auto',
              }}
              exit={{
                opacity: 0,
                height: 0,
              }}
              transition={{
                duration: 0.2,
                ease: 'easeOut',
              }}
              className="overflow-hidden border-t border-[#d9d2c7] bg-[#f7f4ee] lg:hidden"
            >
              <nav
                aria-label="Mobile navigation"
                className="mx-auto max-w-[1440px] px-5 py-4 sm:px-8"
              >
                <div className="space-y-0.5">

                  {NAV_ITEMS.map(
                    (item) => (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.end}
                        className={({ isActive }) =>
                          [
                            'flex items-center justify-between border-b border-[#ebe6dc] px-1 py-3.5 text-[15px] transition-colors',
                            isActive
                              ? 'font-medium text-[#b4491e]'
                              : 'text-[#514a42] hover:text-[#14120f]',
                          ].join(' ')
                        }
                      >
                        {({ isActive }) => (
                          <>
                            <span>
                              {item.name}
                            </span>

                            {isActive && (
                              <span className="h-1.5 w-1.5 rounded-full bg-[#b4491e]" />
                            )}
                          </>
                        )}
                      </NavLink>
                    )
                  )}

                  {/* Mobile Admin */}
                  {showAdmin && (
                    <NavLink
                      to="/admin"
                      className={({ isActive }) =>
                        [
                          'mt-3 flex items-center justify-between border px-3 py-3',
                          'font-mono text-[10px] uppercase tracking-[0.12em]',
                          isActive
                            ? 'border-[#14120f] bg-[#14120f] text-[#f7f4ee]'
                            : 'border-[#cfc7bb] text-[#514a42] hover:border-[#14120f] hover:text-[#14120f]',
                        ].join(' ')
                      }
                    >
                      <span className="inline-flex items-center gap-2">
                        <ShieldCheck
                          className="h-3.5 w-3.5"
                          aria-hidden="true"
                        />

                        Admin Panel
                      </span>

                      <ArrowRight
                        className="h-3.5 w-3.5"
                        aria-hidden="true"
                      />
                    </NavLink>
                  )}
                </div>

                {/* Custom print CTA */}
                <div className="mt-5 border-t border-[#d9d2c7] pt-5">
                  <Link
                    to="/custom-service"
                    className="flex items-center justify-between bg-[#14120f] px-4 py-3.5 text-[#f7f4ee] transition-colors hover:bg-[#2b2724]"
                  >
                    <span className="text-sm font-medium">
                      Start a custom print
                    </span>

                    <ArrowRight
                      className="h-4 w-4"
                      aria-hidden="true"
                    />
                  </Link>
                </div>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ======================================================
          MAIN CONTENT
          ====================================================== */}

      <main
        id="main-content"
        className="min-h-0 flex-1"
      >
        <Outlet />
      </main>

      {/* ======================================================
          FOOTER
          ====================================================== */}

      <footer className="mt-20 border-t border-[#d9d2c7] bg-[#14120f] text-[#f7f4ee]/75">
        <div className="mx-auto max-w-[1440px] px-5 py-14 sm:px-8 lg:px-10">

          <div className="grid gap-12 lg:grid-cols-[1.5fr_repeat(2,1fr)_1.1fr]">

            {/* ------------------------------------------------
                Footer brand
                ------------------------------------------------ */}

            <div className="max-w-sm">
              <Link
                to="/"
                className="group inline-flex items-center gap-2.5"
              >
                <div
                  className="relative flex h-9 w-9 items-center justify-center border border-[#f7f4ee]/30 bg-[#f7f4ee] text-[#14120f]"
                  aria-hidden="true"
                >
                  <span className="font-display text-sm font-bold tracking-[-0.08em]">
                    SS
                  </span>

                  <span className="absolute -bottom-px -right-px h-2 w-2 bg-[#b4491e]" />
                </div>

                <span className="font-display text-[18px] font-semibold tracking-[-0.02em] text-[#f7f4ee] transition-colors group-hover:text-[#d9784b]">
                  {businessName}
                </span>
              </Link>

              <p className="mt-4 max-w-sm text-[13.5px] leading-relaxed text-[#f7f4ee]/55">
                3D printing, custom manufacturing and
                physical prototyping to turn digital
                designs into useful physical objects.
              </p>

              <address className="mt-6 not-italic font-mono text-[9px] uppercase leading-relaxed tracking-[0.1em] text-[#f7f4ee]/35">
                {businessAddress}
              </address>
            </div>

            {/* ------------------------------------------------
                Explore
                ------------------------------------------------ */}

            <div>
              <h3 className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#f7f4ee]/35">
                Explore
              </h3>

              <ul className="mt-4 space-y-2.5">

                <li>
                  <Link
                    to="/catalog"
                    className="text-[13.5px] text-[#f7f4ee]/65 transition-colors hover:text-[#f7f4ee]"
                  >
                    Shop all
                  </Link>
                </li>

                <li>
                  <Link
                    to="/custom-service"
                    className="text-[13.5px] text-[#f7f4ee]/65 transition-colors hover:text-[#f7f4ee]"
                  >
                    Custom 3D printing
                  </Link>
                </li>

                <li>
                  <Link
                    to="/about"
                    className="text-[13.5px] text-[#f7f4ee]/65 transition-colors hover:text-[#f7f4ee]"
                  >
                    About us
                  </Link>
                </li>

                <li>
                  <Link
                    to="/contact"
                    className="text-[13.5px] text-[#f7f4ee]/65 transition-colors hover:text-[#f7f4ee]"
                  >
                    Contact
                  </Link>
                </li>

              </ul>
            </div>

            {/* ------------------------------------------------
                Services
                ------------------------------------------------ */}

            <div>
              <h3 className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#f7f4ee]/35">
                Services
              </h3>

              <ul className="mt-4 space-y-2.5">

                <li>
                  <Link
                    to="/custom-service"
                    className="text-[13.5px] text-[#f7f4ee]/65 transition-colors hover:text-[#f7f4ee]"
                  >
                    Custom prints
                  </Link>
                </li>

                <li>
                  <Link
                    to="/custom-service"
                    className="text-[13.5px] text-[#f7f4ee]/65 transition-colors hover:text-[#f7f4ee]"
                  >
                    Prototyping
                  </Link>
                </li>

                <li>
                  <Link
                    to="/account"
                    className="text-[13.5px] text-[#f7f4ee]/65 transition-colors hover:text-[#f7f4ee]"
                  >
                    Track an order
                  </Link>
                </li>

                <li>
                  <Link
                    to="/account"
                    className="text-[13.5px] text-[#f7f4ee]/65 transition-colors hover:text-[#f7f4ee]"
                  >
                    My account
                  </Link>
                </li>

              </ul>
            </div>

            {/* ------------------------------------------------
                Contact
                ------------------------------------------------ */}

            <div>
              <h3 className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#f7f4ee]/35">
                Get in touch
              </h3>

              <ul className="mt-4 space-y-3.5 text-[13.5px] text-[#f7f4ee]/65">

                {whatsappNumber && (
                  <li>
                    <a
                      href={whatsappLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="transition-colors hover:text-[#f7f4ee]"
                    >
                      WhatsApp
                    </a>
                  </li>
                )}

                <li>
                  <a
                    href={`mailto:${businessEmail}`}
                    className="break-all transition-colors hover:text-[#f7f4ee]"
                  >
                    {businessEmail}
                  </a>
                </li>

                <li className="leading-relaxed text-[#f7f4ee]/45">
                  {businessAddress}
                </li>

              </ul>
            </div>
          </div>

          {/* ------------------------------------------------
              Footer bottom
              ------------------------------------------------ */}

          <div className="mt-14 flex flex-col gap-4 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">

            <p className="font-mono text-[9px] uppercase tracking-[0.08em] text-[#f7f4ee]/35">
              © {currentYear}{' '}
              {businessName}. All rights reserved.
            </p>

            <div className="flex items-center gap-5 font-mono text-[9px] uppercase tracking-[0.08em] text-[#f7f4ee]/35">

              <span>
                Make in India
              </span>

              <span
                className="h-1 w-1 rounded-full bg-[#b4491e]"
                aria-hidden="true"
              />

              <span>
                3D printing & fabrication
              </span>

            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}