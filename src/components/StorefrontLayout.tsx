import React, { useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import {
  User,
  ShoppingBag,
  Menu,
  X,
  Instagram,
  Facebook,
  Twitter,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '../store';
import { useAuth } from '../hooks/useAuth';

type NavLink = {
  name: string;
  path: string;
};

export function StorefrontLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const cart = useStore((state) => state.cart);

  const cartItemCount = cart.reduce(
    (acc, item) => acc + item.quantity,
    0
  );

  const location = useLocation();
  const { isLoggedIn } = useAuth();

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const navLinks: NavLink[] = [
    {
      name: 'Home',
      path: '/',
    },
    {
      name: 'Shop',
      path: '/catalog',
    },
    {
      name: 'Services',
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

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      {/* Announcement Bar */}
      <div className="bg-brand-500 text-white text-xs font-medium py-2 text-center px-4">
        Free Pan-India shipping on orders over ₹499. Crafted with precision.
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-surface/80 backdrop-blur-md border-b border-brand-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            
            {/* Logo */}
            <Link to="/" className="flex flex-col">
              <span className="font-serif text-2xl font-bold text-charcoal leading-none">
                Shilp Sahayak
              </span>

              <span className="text-[10px] text-charcoal-lighter uppercase tracking-widest mt-1">
                Crafted with Precision
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-6 lg:space-x-8">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.path}
                  className={`text-sm font-medium transition-colors hover:text-brand-500 ${
                    location.pathname === link.path
                      ? 'text-brand-500'
                      : 'text-charcoal-light'
                  }`}
                >
                  {link.name}
                </Link>
              ))}
            </nav>

            {/* Actions */}
            <div className="flex items-center space-x-4">

              {/* Account / Login */}
              {isLoggedIn ? (
                <Link
                  to="/account"
                  className="flex items-center gap-2 text-sm font-medium text-charcoal hover:text-brand-600 transition-colors"
                >
                  <User className="w-5 h-5" />

                  <span className="hidden sm:inline">
                    My Account
                  </span>
                </Link>
              ) : (
                <Link
                  to="/login"
                  className="flex items-center gap-2 text-sm font-medium text-charcoal hover:text-brand-600 transition-colors"
                >
                  <User className="w-5 h-5" />

                  <span className="hidden sm:inline">
                    Login
                  </span>
                </Link>
              )}

              {/* Cart */}
              <Link
                to="/cart"
                className="relative p-2 text-charcoal hover:text-brand-500 transition-colors"
                aria-label={`Shopping cart with ${cartItemCount} items`}
              >
                <ShoppingBag className="w-6 h-6" />

                {cartItemCount > 0 && (
                  <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-brand-500 rounded-full">
                    {cartItemCount}
                  </span>
                )}
              </Link>

              {/* Mobile Menu Button */}
              <button
                type="button"
                className="md:hidden p-2 text-charcoal"
                onClick={() =>
                  setIsMobileMenuOpen(!isMobileMenuOpen)
                }
                aria-label={
                  isMobileMenuOpen
                    ? 'Close navigation menu'
                    : 'Open navigation menu'
                }
                aria-expanded={isMobileMenuOpen}
              >
                {isMobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
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
              className="md:hidden border-t border-brand-100 bg-surface overflow-hidden"
            >
              <div className="px-4 pt-2 pb-6 space-y-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.name}
                    to={link.path}
                    className={`block px-3 py-3 text-base font-medium rounded-lg transition-colors ${
                      location.pathname === link.path
                        ? 'bg-brand-50 text-brand-500'
                        : 'text-charcoal hover:bg-brand-50 hover:text-brand-500'
                    }`}
                  >
                    {link.name}
                  </Link>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Main Content */}
      <main className="flex-grow">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-surface-dark border-t border-brand-200 pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">

            {/* Brand */}
            <div className="col-span-1 md:col-span-2">
              <Link to="/" className="flex flex-col mb-6">
                <span className="font-serif text-2xl font-bold text-charcoal leading-none">
                  Shilp Sahayak
                </span>

                <span className="text-xs text-charcoal-lighter uppercase tracking-widest mt-1">
                  Crafted with Precision
                </span>
              </Link>

              <p className="text-charcoal-light text-sm max-w-md mb-6 leading-relaxed">
                A boutique 3D printing studio in India,
                specializing in custom gifts, decor, lithophane
                lamps, and personalized keepsakes. We blend artisan
                care with precision engineering.
              </p>

              {/* Social Links */}
              <div className="flex space-x-4">

                <a
                  href="#"
                  className="text-charcoal-lighter hover:text-brand-500 transition-colors"
                  aria-label="Instagram"
                >
                  <Instagram className="w-5 h-5" />
                </a>

                <a
                  href="#"
                  className="text-charcoal-lighter hover:text-brand-500 transition-colors"
                  aria-label="Facebook"
                >
                  <Facebook className="w-5 h-5" />
                </a>

                <a
                  href="#"
                  className="text-charcoal-lighter hover:text-brand-500 transition-colors"
                  aria-label="Twitter"
                >
                  <Twitter className="w-5 h-5" />
                </a>

              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="font-serif font-semibold text-charcoal mb-4">
                Quick Links
              </h3>

              <ul className="space-y-3">
                <li>
                  <Link
                    to="/catalog"
                    className="text-sm text-charcoal-light hover:text-brand-500"
                  >
                    Shop All
                  </Link>
                </li>

                <li>
                  <Link
                    to="/custom-service"
                    className="text-sm text-charcoal-light hover:text-brand-500"
                  >
                    Custom Printing
                  </Link>
                </li>

                <li>
                  <Link
                    to="/about"
                    className="text-sm text-charcoal-light hover:text-brand-500"
                  >
                    Our Story
                  </Link>
                </li>

                <li>
                  <Link
                    to="/contact"
                    className="text-sm text-charcoal-light hover:text-brand-500"
                  >
                    Contact Us
                  </Link>
                </li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h3 className="font-serif font-semibold text-charcoal mb-4">
                Contact
              </h3>

              <ul className="space-y-3 text-sm text-charcoal-light">
                <li>
                  WhatsApp: +91 xxxxx xxxxx
                </li>

                <li>
                  Email: hello@shilpsahayak.in
                </li>

                <li>
                  Studio: PATIALA, PUNJAB 147001
                </li>
              </ul>
            </div>
          </div>

          {/* Copyright */}
          <div className="border-t border-brand-200 pt-8 flex flex-col md:flex-row justify-between items-center">

            <p className="text-xs text-charcoal-lighter mb-4 md:mb-0">
              © {new Date().getFullYear()} Shilp Sahayak.
              All rights reserved.
            </p>

            <div className="flex space-x-6 text-xs text-charcoal-lighter">

              <a
                href="#"
                className="hover:text-brand-500"
              >
                Privacy Policy
              </a>

              <a
                href="#"
                className="hover:text-brand-500"
              >
                Terms of Service
              </a>

              <Link
                to="/admin/login"
                className="hover:text-brand-500"
              >
                Admin Login
              </Link>

            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}