import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  User as UserIcon,
} from 'lucide-react';

import { useAuth } from '../../hooks/useAuth';
import { Button, BrandLogo } from '../../components/ui';

type LoginLocationState = {
  from?: {
    pathname?: string;
    search?: string;
    hash?: string;
  };
};

type AuthMainTab = 'signin' | 'signup' | 'forgot';

function getFirebaseErrorMessage(error: unknown): string {
  const firebaseError = error as { code?: string; message?: string };

  switch (firebaseError.code) {
    case 'auth/email-already-in-use':
      return 'This email address is already registered. Please sign in instead.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Invalid email or password. Please check your credentials.';
    case 'auth/weak-password':
      return 'Password should contain at least 6 characters.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment and try again.';
    case 'auth/network-request-failed':
      return 'Network connection issue. Please check your internet connection.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Please contact support.';
    case 'auth/popup-closed-by-user':
      return 'Sign-in popup was closed before completing.';
    default:
      return firebaseError.message || 'Something went wrong. Please try again.';
  }
}

function getPasswordStrength(password: string) {
  if (!password) return { label: '', score: 0, color: 'bg-zinc-200' };

  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 2) return { label: 'Weak', score: 1, color: 'bg-rose-500' };
  if (score <= 3) return { label: 'Fair', score: 2, color: 'bg-amber-500' };
  if (score === 4) return { label: 'Good', score: 3, color: 'bg-blue-500' };
  return { label: 'Strong', score: 4, color: 'bg-emerald-500' };
}

export function Login() {
  const {
    user,
    loading: authLoading,
    login,
    register,
    resetPassword,
  } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as LoginLocationState | null;

  const from = useMemo(() => {
    const pathname = locationState?.from?.pathname;
    if (pathname) {
      return `${pathname}${locationState?.from?.search || ''}${
        locationState?.from?.hash || ''
      }`;
    }
    const searchParams = new URLSearchParams(location.search);
    const redirectParam = searchParams.get('redirect');
    if (redirectParam) return redirectParam;

    return '/account';
  }, [locationState, location.search]);

  /* State Management */
  const [tab, setTab] = useState<AuthMainTab>('signin');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  /* Form Fields */
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const passwordStrength = getPasswordStrength(password);

  /* Auto Redirect if already logged in */
  useEffect(() => {
    if (!authLoading && user && !isLoading) {
      navigate(from, { replace: true });
    }
  }, [authLoading, user, isLoading, navigate, from]);

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  const handleTabSwitch = (newTab: AuthMainTab) => {
    clearMessages();
    setTab(newTab);
  };

  /* ----------------------------------------------------
     SIGN IN: EMAIL + PASSWORD
  ----------------------------------------------------- */
  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setIsLoading(true);
    try {
      await login(email.trim(), password);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      setError(getFirebaseErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  /* ----------------------------------------------------
     SIGN UP: REGISTER + SEND EMAIL VERIFICATION LINK
  ----------------------------------------------------- */
  const handleSignUpInitiate = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone ? phone.replace(/\D/g, '').slice(-10) : '';

    if (cleanName.length < 2) {
      setError('Please enter your full name.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (cleanPhone && !/^[6-9]\d{9}$/.test(cleanPhone)) {
      setError('Please enter a valid 10-digit Indian mobile number.');
      return;
    }
    if (password.length < 6) {
      setError('Password must contain at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      // Create account & dispatch official Firebase verification email
      await register(cleanEmail, password, cleanName, cleanPhone || undefined);
      setSuccess('Account created successfully! An official verification link has been sent to your email.');

      setTimeout(() => {
        navigate(from, { replace: true });
      }, 1500);
    } catch (err: unknown) {
      setError(getFirebaseErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  /* ----------------------------------------------------
     FORGOT PASSWORD
  ----------------------------------------------------- */
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    try {
      await resetPassword(email.trim());
      setSuccess('Password reset link has been dispatched to your email inbox.');
    } catch (err: unknown) {
      setError(getFirebaseErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F4F8] text-ink py-10 sm:py-16 px-4 sm:px-6 flex flex-col justify-center select-none pt-16 lg:pt-20">
      <div className="mx-auto w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8 space-y-2">
          <Link to="/" className="inline-block transition-transform hover:scale-105">
            <BrandLogo size="lg" />
          </Link>
          <p className="font-mono text-xs text-muted uppercase tracking-widest">
            Precision 3D Fabrication Studio · India
          </p>
        </div>

        {/* Main Authentication Card */}
        <div className="rounded-3xl border border-line bg-white p-6 sm:p-8 shadow-card space-y-6">
          {/* Header & Tabs */}
          {tab !== 'forgot' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-ink">
                    {tab === 'signin' ? 'Welcome Back' : 'Create Account'}
                  </h1>
                  <p className="font-sans text-xs text-muted mt-0.5">
                    {tab === 'signin'
                      ? 'Sign in to track orders, CAD quotes, and invoices.'
                      : 'Join Shilp Sahayak for verified, secure 3D printing.'}
                  </p>
                </div>
              </div>

              {/* Main Tab Pill */}
              <div className="grid grid-cols-2 p-1 rounded-2xl bg-shell/80 border border-line font-display text-xs font-bold">
                <button
                  type="button"
                  onClick={() => handleTabSwitch('signin')}
                  className={`py-2.5 rounded-xl transition-all ${
                    tab === 'signin'
                      ? 'bg-white text-ink shadow-xs'
                      : 'text-muted hover:text-ink'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => handleTabSwitch('signup')}
                  className={`py-2.5 rounded-xl transition-all ${
                    tab === 'signup'
                      ? 'bg-white text-ink shadow-xs'
                      : 'text-muted hover:text-ink'
                  }`}
                >
                  Create Account
                </button>
              </div>
            </div>
          )}

          {/* Forgot Password Header */}
          {tab === 'forgot' && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleTabSwitch('signin')}
                className="inline-flex items-center gap-1.5 font-display text-xs font-bold text-muted hover:text-ink mb-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Sign In</span>
              </button>
              <h1 className="font-display text-2xl font-bold text-ink">
                Reset Password
              </h1>
              <p className="font-sans text-xs text-muted">
                Enter your registered email address to receive a secure password reset link.
              </p>
            </div>
          )}

          {/* Feedback Messages */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800 space-y-2"
            >
              <div className="flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
            </motion.div>
          )}

          {success && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-800"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
              <span className="leading-relaxed">{success}</span>
            </motion.div>
          )}

          {/* =====================================================
              TAB 1: SIGN IN MODE (EMAIL + PASSWORD)
          ====================================================== */}
          {tab === 'signin' && (
            <form onSubmit={handleEmailSignIn} className="space-y-4">
              <div>
                <label className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted block mb-1">
                  EMAIL ADDRESS
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                  <input
                    type="email"
                    required
                    placeholder="you@domain.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-11 rounded-xl border border-line bg-shell/40 pl-10 pr-4 font-sans text-xs text-ink outline-none focus:border-accent focus:bg-white transition-colors"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted">
                    PASSWORD
                  </label>
                  <button
                    type="button"
                    onClick={() => handleTabSwitch('forgot')}
                    className="font-display text-[11px] font-bold text-accent hover:underline cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-11 rounded-xl border border-line bg-shell/40 pl-10 pr-10 font-sans text-xs text-ink outline-none focus:border-accent focus:bg-white transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isLoading}
                disabled={isLoading}
                className="w-full font-bold uppercase tracking-wider text-xs"
              >
                <span>Sign In</span>
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </form>
          )}

          {/* =====================================================
              TAB 2: CREATE ACCOUNT
          ====================================================== */}
          {tab === 'signup' && (
            <div className="space-y-4">
              <form onSubmit={handleSignUpInitiate} className="space-y-3.5">
                {/* Full Name */}
                <div>
                  <label className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted block mb-1">
                    FULL NAME *
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                    <input
                      type="text"
                      required
                      placeholder="Enter your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full h-11 rounded-xl border border-line bg-shell/40 pl-10 pr-4 font-sans text-xs text-ink outline-none focus:border-accent focus:bg-white transition-colors"
                    />
                  </div>
                </div>

                {/* Email Address */}
                <div>
                  <label className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted block mb-1">
                    EMAIL ADDRESS *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                    <input
                      type="email"
                      required
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full h-11 rounded-xl border border-line bg-shell/40 pl-10 pr-4 font-sans text-xs text-ink outline-none focus:border-accent focus:bg-white transition-colors"
                    />
                  </div>
                </div>

                {/* Phone Number (Optional with +91 Indian prefix) */}
                <div>
                  <label className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted block mb-1">
                    INDIAN MOBILE NUMBER (OPTIONAL)
                  </label>
                  <div className="flex items-center rounded-xl border border-line bg-shell/40 px-3.5 focus-within:border-accent focus-within:bg-white transition-colors">
                    <span className="font-mono text-xs font-bold text-ink mr-2">
                      🇮🇳 +91
                    </span>
                    <input
                      type="tel"
                      maxLength={10}
                      placeholder="Enter your number"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      className="w-full h-11 bg-transparent font-mono text-xs font-bold text-ink placeholder:font-sans placeholder:font-normal placeholder:text-muted outline-none"
                    />
                  </div>
                </div>

                {/* Password & Strength Indicator */}
                <div>
                  <label className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted block mb-1">
                    PASSWORD *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="At least 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full h-11 rounded-xl border border-line bg-shell/40 pl-10 pr-10 font-sans text-xs text-ink outline-none focus:border-accent focus:bg-white transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {password && (
                    <div className="flex items-center gap-2 mt-1.5 font-mono text-[10px]">
                      <div className="flex-1 h-1.5 rounded-full bg-shell overflow-hidden">
                        <div
                          className={`h-full ${passwordStrength.color} transition-all duration-300`}
                          style={{ width: `${(passwordStrength.score / 4) * 100}%` }}
                        />
                      </div>
                      <span className="text-muted font-bold">{passwordStrength.label}</span>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted block mb-1">
                    CONFIRM PASSWORD *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full h-11 rounded-xl border border-line bg-shell/40 pl-10 pr-10 font-sans text-xs text-ink outline-none focus:border-accent focus:bg-white transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Terms & Privacy Consent — required */}
                <div className="rounded-xl border border-line bg-shell/40 p-3">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      required
                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-line accent-accent cursor-pointer"
                      aria-describedby="signup-consent-desc"
                    />
                    <span id="signup-consent-desc" className="font-sans text-xs text-muted leading-relaxed">
                      I have read and agree to the{' '}
                      <Link
                        to="/terms-and-conditions"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent hover:underline font-semibold"
                      >
                        Terms &amp; Conditions
                      </Link>{' '}
                      and{' '}
                      <Link
                        to="/privacy-policy"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent hover:underline font-semibold"
                      >
                        Privacy Policy
                      </Link>
                      , including the collection of my name, email, and mobile number (if provided) for account
                      creation and order fulfilment.{' '}
                      <strong className="text-ink">*</strong>
                    </span>
                  </label>
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    isLoading={isLoading}
                    disabled={isLoading}
                    className="w-full font-bold uppercase tracking-wider text-xs"
                  >
                    <span>Create Account</span>
                    <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* =====================================================
              TAB 3: FORGOT PASSWORD
          ====================================================== */}
          {tab === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted block mb-1">
                  REGISTERED EMAIL ADDRESS
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                  <input
                    type="email"
                    required
                    placeholder="you@domain.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-11 rounded-xl border border-line bg-shell/40 pl-10 pr-4 font-sans text-xs text-ink outline-none focus:border-accent focus:bg-white transition-colors"
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isLoading}
                disabled={isLoading}
                className="w-full font-bold uppercase tracking-wider text-xs"
              >
                <span>Send Reset Link</span>
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}



