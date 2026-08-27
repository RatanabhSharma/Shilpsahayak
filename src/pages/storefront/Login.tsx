import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  Sparkles,
} from 'lucide-react';

import { useAuth } from '../../hooks/useAuth';
import { Button, BrandLogo, Input } from '../../components/ui';

type LoginLocationState = {
  from?: {
    pathname?: string;
    search?: string;
    hash?: string;
  };
};

type AuthMode = 'login' | 'signup' | 'forgot';

function getFirebaseErrorMessage(error: unknown): string {
  const firebaseError = error as { code?: string; message?: string };

  switch (firebaseError.code) {
    case 'auth/email-already-in-use':
      return 'This email is already registered. Please sign in instead.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Invalid email or password.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment and try again.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your internet connection and try again.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Please contact support.';
    case 'auth/operation-not-allowed':
      return 'Email/password authentication is not enabled for this Firebase project.';
    default:
      return firebaseError.message || 'Something went wrong. Please try again.';
  }
}

function getPasswordStrength(password: string) {
  if (!password) {
    return { label: '', score: 0 };
  }

  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 2) return { label: 'Weak', score };
  if (score <= 3) return { label: 'Fair', score };
  if (score === 4) return { label: 'Good', score };
  return { label: 'Strong', score };
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
    if (!pathname) return '/account';
    return `${pathname}${locationState?.from?.search || ''}${
      locationState?.from?.hash || ''
    }`;
  }, [locationState]);

  const [mode, setMode] = useState<AuthMode>('login');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [passwordValue, setPasswordValue] = useState('');
  const [confirmPasswordValue, setConfirmPasswordValue] = useState('');

  const passwordStrength = getPasswordStrength(passwordValue);

  useEffect(() => {
    if (!authLoading && user && !isSubmitting) {
      navigate(from, { replace: true });
    }
  }, [authLoading, user, isSubmitting, navigate, from]);

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  const switchMode = (newMode?: AuthMode) => {
    clearMessages();
    setPasswordValue('');
    setConfirmPasswordValue('');
    setShowPassword(false);
    setShowConfirmPassword(false);

    if (newMode) {
      setMode(newMode);
    } else {
      setMode((current) => (current === 'login' ? 'signup' : 'login'));
    }
  };

  const handleForgotPasswordSubmit = async (email: string) => {
    clearMessages();

    if (!email) {
      setError('Please enter your email address.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    setIsSubmitting(true);
    try {
      await resetPassword(email);
      setSuccess('Password reset link has been dispatched to your email inbox.');
    } catch (err: unknown) {
      setError(getFirebaseErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    clearMessages();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get('email') || '').trim();

    if (mode === 'forgot') {
      await handleForgotPasswordSubmit(email);
      return;
    }

    const name = String(formData.get('name') || '').trim();
    const password = String(formData.get('password') || '');
    const confirmPassword = String(formData.get('confirmPassword') || '');
    const phone = String(formData.get('phone') || '').trim();

    if (!email) {
      setError('Please enter your email address.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }
    if (password.length < 6) {
      setError('Password must contain at least 6 characters.');
      return;
    }

    if (mode === 'signup') {
      if (!name || name.length < 2) {
        setError('Please enter your full name.');
        return;
      }
      if (!/^[6-9]\d{9}$/.test(phone)) {
        setError('Please enter a valid 10-digit Indian mobile number.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
      if (passwordStrength.score < 2) {
        setError('Please choose a stronger password with numbers and symbols.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (mode === 'signup') {
        await register(email, password, name, phone);
      } else {
        await login(email, password);
      }
      navigate(from, { replace: true });
    } catch (err: unknown) {
      setError(getFirebaseErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-paper">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          <p className="mt-4 font-mono text-xs font-bold uppercase tracking-wider text-muted">
            Verifying session...
          </p>
        </div>
      </div>
    );
  }

  if (user) return null;

  const isSignup = mode === 'signup';
  const isForgot = mode === 'forgot';

  return (
    <div className="grid min-h-screen w-full lg:grid-cols-12 bg-paper text-ink">
      {/* Left Dark Showcase Column */}
      <div className="relative hidden overflow-hidden bg-dark text-white lg:col-span-5 lg:flex lg:flex-col lg:justify-between p-12 xl:p-16 border-r border-zinc-800">
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(#ff4d00_1px,transparent_1px)] [background-size:24px_24px]" />
          <div className="absolute right-0 top-1/4 h-80 w-80 rounded-full bg-accent/20 blur-3xl" />
        </div>

        <div className="relative z-10">
          <Link to="/" className="flex items-center gap-3 group">
            <BrandLogo isDarkTheme={true} size="md" />
          </Link>
          <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-accent mt-2 block">
            Additive Manufacturing Studio
          </span>
        </div>

        <div className="relative z-10 max-w-sm space-y-4 font-sans">
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 font-mono text-xs font-bold text-accent">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Maker Studio in Patiala</span>
          </div>

          <h2 className="font-display text-3xl font-bold text-white leading-tight">
            If you can imagine it, we can print it.
          </h2>

          <p className="text-xs text-zinc-400 leading-relaxed">
            Log in to manage custom CAD slicing quotes, review real-time fabrication stages, and track pan-India courier shipments.
          </p>

          <div className="pt-4 border-t border-zinc-800 flex items-center gap-4 text-xs font-mono text-zinc-400">
            <span>⚡ ₹4.5/g Custom 3D Printing</span>
            <span>•</span>
            <span>🛡️ 256-Bit SSL Auth</span>
          </div>
        </div>

        <div className="relative z-10 text-[11px] font-mono text-zinc-500">
          © {new Date().getFullYear()} Shilp Sahayak. All rights reserved.
        </div>
      </div>

      {/* Right Form Column */}
      <div className="flex min-h-screen items-center justify-center px-5 py-12 sm:px-8 lg:col-span-7 lg:px-12">
        <div className="w-full max-w-[440px]">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-muted hover:text-accent transition-colors mb-6"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Storefront</span>
          </Link>

          {/* Form Header */}
          <div className="mb-6">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-accent block">
              {isForgot
                ? 'Password Recovery'
                : isSignup
                ? 'Studio Registration'
                : 'Customer Authentication'}
            </span>

            <h1 className="mt-1 font-display text-3xl font-bold text-ink sm:text-4xl">
              {isForgot
                ? 'Reset your password.'
                : isSignup
                ? 'Create an account.'
                : 'Welcome back.'}
            </h1>

            <p className="mt-2 font-sans text-xs text-muted leading-relaxed">
              {isForgot
                ? "Enter your registered email and we'll send you a password reset link."
                : isSignup
                ? 'Create an account to track your prints, upload CAD models, and save addresses.'
                : 'Sign in to access your orders, saved address, and 3D printing quotes.'}
            </p>
          </div>

          {/* Form Card */}
          <div className="rounded-3xl border border-line bg-white p-7 sm:p-8 shadow-soft">
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              {isSignup && (
                <Input
                  name="name"
                  type="text"
                  label="Full Name *"
                  placeholder="e.g. Gurpreet Singh"
                  autoComplete="name"
                  required
                />
              )}

              {isSignup && (
                <Input
                  name="phone"
                  type="tel"
                  label="Mobile Number (for delivery SMS) *"
                  placeholder="10-digit mobile number"
                  autoComplete="tel"
                  inputMode="numeric"
                  maxLength={10}
                  required
                />
              )}

              <Input
                name="email"
                type="email"
                label="Email Address *"
                placeholder="you@example.com"
                autoComplete="email"
                required
              />

              {!isForgot && (
                <div className="relative">
                  <Input
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    label="Password *"
                    placeholder={
                      isSignup ? 'Create a secure password' : 'Enter your password'
                    }
                    autoComplete={isSignup ? 'new-password' : 'current-password'}
                    minLength={6}
                    required
                    value={passwordValue}
                    onChange={(e) => setPasswordValue(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-[38px] p-1 text-muted hover:text-ink transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              )}

              {isSignup && passwordValue && (
                <div className="space-y-1.5 pt-1 font-mono">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[10px] text-muted uppercase">Password Strength</span>
                    <span className="font-bold text-ink">{passwordStrength.label}</span>
                  </div>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((seg) => (
                      <div
                        key={seg}
                        className={`h-1.5 flex-1 rounded-full transition-colors ${
                          seg <= passwordStrength.score ? 'bg-accent' : 'bg-shell'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}

              {isSignup && (
                <div className="relative">
                  <Input
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    label="Confirm Password *"
                    placeholder="Re-type your password"
                    autoComplete="new-password"
                    minLength={6}
                    required
                    value={confirmPasswordValue}
                    onChange={(e) => setConfirmPasswordValue(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-[38px] p-1 text-muted hover:text-ink transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              )}

              {!isSignup && !isForgot && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => switchMode('forgot')}
                    className="font-mono text-xs font-semibold text-accent hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              {error && (
                <div className="flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-semibold text-rose-700 font-sans">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="flex items-start gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-bold text-emerald-700 font-sans">
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{success}</span>
                </div>
              )}

              <Button
                type="submit"
                size="lg"
                className="w-full font-display font-bold shadow-md shadow-accent/20 bg-accent hover:bg-accent-dark text-white border-accent"
                isLoading={isSubmitting}
              >
                {isForgot
                  ? 'Send Reset Link'
                  : isSignup
                  ? 'Create Account'
                  : 'Sign In'}
              </Button>
            </form>
          </div>

          {/* Mode Switch Footnote */}
          <p className="mt-6 text-center font-sans text-xs text-muted">
            {isForgot ? (
              <>
                Remembered your password?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="font-bold text-accent hover:underline font-mono"
                >
                  Sign in instead
                </button>
              </>
            ) : isSignup ? (
              <>
                Already registered with Shilp Sahayak?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="font-bold text-accent hover:underline font-mono"
                >
                  Sign in
                </button>
              </>
            ) : (
              <>
                New to Shilp Sahayak?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('signup')}
                  className="font-bold text-accent hover:underline font-mono"
                >
                  Create an account
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
