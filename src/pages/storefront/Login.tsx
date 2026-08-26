import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Phone,
  User,
} from 'lucide-react';

import { useAuth } from '../../hooks/useAuth';
import { useUserProfile } from '../../hooks/useUserProfile';
import { Button, Card, Input } from '../../components/ui';

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

  const { data: profile } = useUserProfile();

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

  useEffect(() => {
    if (user && profile === null) {
      // Profile creation is handled during registration.
    }
  }, [user, profile]);

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
      setSuccess(
        'Password reset link has been sent. Please check your inbox and spam folder.'
      );
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
    const confirmPassword = String(
      formData.get('confirmPassword') || ''
    );
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
      setError('Password should be at least 6 characters.');
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
        setError(
          'Please choose a stronger password with at least 8 characters and a mix of letters and numbers.'
        );
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
      <div className="min-h-screen w-full bg-[#f4f0e8]">
        <div className="mx-auto flex min-h-screen max-w-[1440px] items-center justify-center px-6">
          <div className="text-center" role="status" aria-live="polite">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[#d8d0c4] border-t-[#a94b27]" />
            <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.14em] text-[#81776c]">
              Checking session
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (user) return null;

  const isSignup = mode === 'signup';
  const isForgot = mode === 'forgot';

  return (
    <div className="grid min-h-screen w-full lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-[#14120f] lg:block">
        <div
          className="absolute inset-0 opacity-40"
          aria-hidden="true"
        >
          <div className="absolute inset-0 bg-[linear-gradient(rgba(247,244,238,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(247,244,238,0.045)_1px,transparent_1px)] bg-[size:48px_48px]" />
          <div className="absolute left-1/2 top-1/2 h-[620px] w-[620px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#f7f4ee]/10" />
          <div className="absolute left-1/2 top-1/2 h-[440px] w-[440px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#f7f4ee]/10" />
          <div className="absolute left-1/2 top-1/2 h-[260px] w-[260px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#a94b27]/25" />
        </div>

        <div className="relative flex h-full flex-col justify-between p-10 xl:p-14">
          <div>
            <p className="font-display text-xl font-semibold tracking-[-0.02em] text-[#f7f4ee]">
              Shilp Sahayak
            </p>
            <p className="mt-1 font-mono text-[8px] uppercase tracking-[0.16em] text-[#f7f4ee]/35">
              Customer workspace
            </p>
          </div>

          <div className="max-w-md">
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#d9784b]">
              Precision 3D Printing & Prototyping
            </p>
            <h2 className="mt-3 font-display text-2xl font-semibold text-[#f7f4ee]">
              Turn ideas into physical parts.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[#f7f4ee]/60">
              Access your order history, custom print quotes, delivery tracking, and saved settings in one unified dashboard.
            </p>
          </div>

          <p className="font-mono text-[8px] uppercase tracking-[0.1em] text-[#f7f4ee]/30">
            Shilp Sahayak Technologies · Studio Access
          </p>
        </div>
      </div>

      <div className="flex min-h-screen items-center justify-center bg-[#f7f4ee] px-5 py-12 sm:px-8 lg:px-12">
        <div className="w-full max-w-[420px]">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-[#6b6156] transition-colors hover:text-[#14120f]"
          >
            <ArrowLeft className="h-3 w-3" aria-hidden="true" />
            Back to the shop
          </Link>

          <div className="mt-7">
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#a94b27]">
              {isForgot
                ? 'Password Recovery'
                : isSignup
                ? 'Create account'
                : 'Customer login'}
            </p>

            <h1 className="mt-3 font-display text-[30px] font-semibold tracking-[-0.035em] text-[#14120f] sm:text-[34px]">
              {isForgot
                ? 'Reset your password.'
                : isSignup
                ? 'Create an account.'
                : 'Welcome back.'}
            </h1>

            <p className="mt-2.5 text-[14px] leading-6 text-[#6b6156]">
              {isForgot
                ? "Enter your registered email and we'll send you a secure link to reset your password."
                : isSignup
                ? 'Create an account to manage your orders, saved details and custom printing requests.'
                : 'Sign in to access your orders, profile and saved information.'}
            </p>
          </div>

          <Card className="mt-7 border-[#d9d2c7] bg-white p-6 shadow-[0_8px_30px_rgba(20,18,15,0.05)] sm:p-7">
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              {isSignup && (
                <div className="relative">
                  <User
                    className="pointer-events-none absolute left-3.5 top-[37px] z-10 h-4 w-4 text-[#8e8275]"
                    aria-hidden="true"
                  />
                  <Input
                    name="name"
                    type="text"
                    label="Full Name"
                    placeholder="Your full name"
                    autoComplete="name"
                    required
                    className="pl-10"
                  />
                </div>
              )}

              {isSignup && (
                <div className="relative">
                  <Phone
                    className="pointer-events-none absolute left-3.5 top-[37px] z-10 h-4 w-4 text-[#8e8275]"
                    aria-hidden="true"
                  />
                  <Input
                    name="phone"
                    type="tel"
                    label="Mobile Number"
                    placeholder="10-digit mobile number"
                    autoComplete="tel"
                    inputMode="numeric"
                    maxLength={10}
                    required
                    className="pl-10"
                  />
                </div>
              )}

              <div className="relative">
                <Mail
                  className="pointer-events-none absolute left-3.5 top-[37px] z-10 h-4 w-4 text-[#8e8275]"
                  aria-hidden="true"
                />
                <Input
                  name="email"
                  type="email"
                  label="Email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  inputMode="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  required
                  className="pl-10"
                />
              </div>

              {!isForgot && (
                <div className="relative">
                  <Lock
                    className="pointer-events-none absolute left-3.5 top-[37px] z-10 h-4 w-4 text-[#8e8275]"
                    aria-hidden="true"
                  />
                  <Input
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    label="Password"
                    placeholder={
                      isSignup ? 'Create a password' : 'Enter your password'
                    }
                    autoComplete={
                      isSignup ? 'new-password' : 'current-password'
                    }
                    minLength={6}
                    required
                    value={passwordValue}
                    onChange={(event) => setPasswordValue(event.target.value)}
                    className="pr-10 pl-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-3.5 top-[34px] z-10 p-1 text-[#8e8275] transition-colors hover:text-[#14120f]"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
              )}

              {isSignup && passwordValue && (
                <div aria-live="polite" className="-mt-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-[#8e8275]">
                      Password strength
                    </span>
                    <span className="text-[11px] font-medium text-[#6b6156]">
                      {passwordStrength.label}
                    </span>
                  </div>

                  <div className="mt-2 flex gap-1">
                    {[1, 2, 3, 4, 5].map((segment) => (
                      <div
                        key={segment}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          segment <= passwordStrength.score
                            ? 'bg-[#a94b27]'
                            : 'bg-[#e5dfd5]'
                        }`}
                      />
                    ))}
                  </div>

                  <p className="mt-2 text-[11px] leading-4 text-[#8e8275]">
                    Use 8+ characters with a mix of letters, numbers and
                    symbols for a stronger password.
                  </p>
                </div>
              )}

              {isSignup && (
                <div className="relative">
                  <Lock
                    className="pointer-events-none absolute left-3.5 top-[37px] z-10 h-4 w-4 text-[#8e8275]"
                    aria-hidden="true"
                  />
                  <Input
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    label="Confirm Password"
                    placeholder="Enter your password again"
                    autoComplete="new-password"
                    minLength={6}
                    required
                    value={confirmPasswordValue}
                    onChange={(event) =>
                      setConfirmPasswordValue(event.target.value)
                    }
                    className="pr-10 pl-10"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword((value) => !value)
                    }
                    className="absolute right-3.5 top-[34px] z-10 p-1 text-[#8e8275] transition-colors hover:text-[#14120f]"
                    aria-label={
                      showConfirmPassword
                        ? 'Hide confirm password'
                        : 'Show confirm password'
                    }
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
              )}

              {!isSignup && !isForgot && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => switchMode('forgot')}
                    className="text-[13px] text-[#a94b27] underline underline-offset-4 transition-colors hover:text-[#14120f]"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-3 border border-red-200 bg-red-50 p-3.5 text-sm text-red-700"
                >
                  <AlertCircle
                    className="mt-0.5 h-4 w-4 shrink-0"
                    aria-hidden="true"
                  />
                  <span className="leading-5">{error}</span>
                </div>
              )}

              {success && (
                <div
                  role="status"
                  aria-live="polite"
                  className="flex items-start gap-3 border border-[#cfdcca] bg-[#f1f6ee] p-3.5 text-sm text-[#496044]"
                >
                  <CheckCircle2
                    className="mt-0.5 h-4 w-4 shrink-0"
                    aria-hidden="true"
                  />
                  <span className="leading-5">{success}</span>
                </div>
              )}

              <Button
                type="submit"
                size="lg"
                className="w-full"
                isLoading={isSubmitting}
              >
                {isForgot
                  ? 'Send reset link'
                  : isSignup
                  ? 'Create account'
                  : 'Sign in'}
              </Button>
            </form>

            <div className="mt-6 border-t border-[#ebe6dc] pt-5">
              <div className="flex items-start gap-2.5">
                <CheckCircle2
                  className="mt-0.5 h-4 w-4 shrink-0 text-[#a94b27]"
                  aria-hidden="true"
                />
                <p className="text-xs leading-5 text-[#8e8275]">
                  Authentication is securely handled through Firebase. Your
                  password is not stored by the Shilp Sahayak application.
                </p>
              </div>
            </div>
          </Card>

          <p className="mt-6 text-[13.5px] text-[#6b6156]">
            {isForgot ? (
              <>
                Remembered your password?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="border-b border-[#6b6156] font-medium text-[#14120f] transition-colors hover:border-[#a94b27] hover:text-[#a94b27]"
                >
                  Sign in instead
                </button>
              </>
            ) : isSignup ? (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="border-b border-[#6b6156] font-medium text-[#14120f] transition-colors hover:border-[#a94b27] hover:text-[#a94b27]"
                >
                  Sign in instead
                </button>
              </>
            ) : (
              <>
                New to Shilp Sahayak?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('signup')}
                  className="border-b border-[#6b6156] font-medium text-[#14120f] transition-colors hover:border-[#a94b27] hover:text-[#a94b27]"
                >
                  Create one
                </button>
              </>
            )}
          </p>

          <p className="mt-6 text-center font-mono text-[8px] uppercase tracking-[0.1em] text-[#9c9184]">
            Secure customer authentication · Shilp Sahayak
          </p>
        </div>
      </div>
    </div>
  );
}
