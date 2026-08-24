import React, { useEffect, useState } from 'react';
import {
  Link,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Lock,
  Mail,
  User,
} from 'lucide-react';

import { useAuth } from '../../hooks/useAuth';
import {
  Button,
  Card,
  Input,
} from '../../components/ui';

type LoginLocationState = {
  from?: {
    pathname?: string;
    search?: string;
    hash?: string;
  };
};

type AuthMode = 'login' | 'signup';

export function Login() {
  const {
    user,
    loading: authLoading,
    login,
    register,
  } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();

  const locationState =
    location.state as LoginLocationState | null;

  const from =
    locationState?.from?.pathname
      ? `${locationState.from.pathname}${
          locationState.from.search || ''
        }${locationState.from.hash || ''}`
      : '/account';

  const [mode, setMode] =
    useState<AuthMode>('login');

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [error, setError] =
    useState('');

  /*
   * Redirect already authenticated users.
   */
  useEffect(() => {
    if (!authLoading && user && !isSubmitting) {
      navigate('/account', {
        replace: true,
      });
    }
  }, [
    authLoading,
    user,
    isSubmitting,
    navigate,
  ]);

  /*
   * Submit login / registration form.
   */
  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setError('');
    setIsSubmitting(true);

    const formData =
      new FormData(event.currentTarget);

    const email =
      String(
        formData.get('email') || ''
      ).trim();

    const password =
      String(
        formData.get('password') || ''
      );

    const name =
      String(
        formData.get('name') || ''
      ).trim();

    /*
     * Basic client-side validation.
     */
    if (!email) {
      setError(
        'Please enter your email address.'
      );
      setIsSubmitting(false);
      return;
    }

    if (!password) {
      setError(
        'Please enter your password.'
      );
      setIsSubmitting(false);
      return;
    }

    if (password.length < 6) {
      setError(
        'Password should be at least 6 characters.'
      );
      setIsSubmitting(false);
      return;
    }

    if (mode === 'signup' && !name) {
      setError(
        'Please enter your full name.'
      );
      setIsSubmitting(false);
      return;
    }

    try {
      if (mode === 'signup') {
        await register(
          email,
          password,
          name
        );
      } else {
        await login(
          email,
          password
        );
      }

      /*
       * Firebase authentication succeeded.
       *
       * Navigate to the page the customer originally
       * requested, or /account by default.
       */
      navigate(from, {
        replace: true,
      });
    } catch (err: unknown) {
      const firebaseError =
        err as {
          code?: string;
          message?: string;
        };

      switch (firebaseError.code) {
        case 'auth/email-already-in-use':
          setError(
            'This email is already registered. Please sign in instead.'
          );
          break;

        case 'auth/invalid-email':
          setError(
            'Please enter a valid email address.'
          );
          break;

        case 'auth/invalid-credential':
        case 'auth/wrong-password':
        case 'auth/user-not-found':
          setError(
            'Invalid email or password.'
          );
          break;

        case 'auth/weak-password':
          setError(
            'Password should be at least 6 characters.'
          );
          break;

        case 'auth/too-many-requests':
          setError(
            'Too many attempts. Please wait a moment and try again.'
          );
          break;

        case 'auth/network-request-failed':
          setError(
            'Network error. Please check your internet connection and try again.'
          );
          break;

        case 'auth/user-disabled':
          setError(
            'This account has been disabled. Please contact support.'
          );
          break;

        case 'auth/operation-not-allowed':
          setError(
            'Email/password authentication is not enabled for this Firebase project.'
          );
          break;

        default:
          setError(
            firebaseError.message ||
              'Something went wrong. Please try again.'
          );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  /*
   * Switch between login and signup.
   */
  const switchMode = () => {
    setError('');

    setMode((current) =>
      current === 'login'
        ? 'signup'
        : 'login'
    );
  };

  /*
   * Authentication loading.
   */
  if (authLoading) {
    return (
      <div className="min-h-screen w-full bg-[#f4f0e8]">
        <div className="mx-auto flex min-h-screen max-w-[1440px] items-center justify-center px-6">
          <div
            className="text-center"
            role="status"
            aria-live="polite"
          >
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[#d8d0c4] border-t-[#a94b27]" />

            <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.14em] text-[#81776c]">
              Checking session
            </p>
          </div>
        </div>
      </div>
    );
  }

  /*
   * Prevent authenticated users from seeing
   * the login form during navigation.
   */
  if (user) {
    return null;
  }

  const isSignup =
    mode === 'signup';

  return (
    <div className="grid min-h-screen w-full lg:grid-cols-2">
      {/* ============================================================
          LEFT VISUAL PANEL
          ============================================================ */}

      <div className="relative hidden overflow-hidden bg-[#14120f] lg:block">
        {/* Technical background */}
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
          {/* Brand */}
          <div>
            <p className="font-display text-xl font-semibold tracking-[-0.02em] text-[#f7f4ee]">
              Shilp Sahayak
            </p>

            <p className="mt-1 font-mono text-[8px] uppercase tracking-[0.16em] text-[#f7f4ee]/35">
              Customer workspace
            </p>
          </div>

          {/* Main message */}
          <div className="max-w-md">
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#d9784b]">
              Since 2019 · Shilp Sahayak
            </p>

            <h1 className="mt-4 font-display text-[42px] font-semibold leading-[1.02] tracking-[-0.04em] text-[#f7f4ee] xl:text-5xl">
              Your orders,
              <br />
              quotes and files,
              <br />
              in one place.
            </h1>

            <p className="mt-6 max-w-md text-[14.5px] leading-7 text-[#f7f4ee]/55">
              Track your orders, manage saved
              details and keep your custom
              printing requests connected to
              your Shilp Sahayak account.
            </p>
          </div>

          {/* Footer metric */}
          <div className="flex items-center gap-3">
            <span
              className="h-1.5 w-1.5 rounded-full bg-[#a94b27]"
              aria-hidden="true"
            />

            <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#f7f4ee]/35">
              Secure Firebase authentication
            </span>
          </div>
        </div>
      </div>

      {/* ============================================================
          RIGHT FORM PANEL
          ============================================================ */}

      <div className="flex min-h-screen flex-col bg-[#f7f4ee]">
        {/* Mobile header */}
        <div className="flex items-center justify-between border-b border-[#ded7cc] px-6 py-4 lg:hidden">
          <div>
            <p className="font-display text-lg font-semibold tracking-[-0.02em] text-[#14120f]">
              Shilp Sahayak
            </p>

            <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-[#8e8275]">
              Customer account
            </p>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center px-5 py-12 sm:px-8 lg:px-12 xl:px-20">
          <div className="w-full max-w-[420px]">
            {/* Back */}
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-[#6b6156] transition-colors hover:text-[#14120f]"
            >
              <ArrowLeft
                className="h-3 w-3"
                aria-hidden="true"
              />

              Back to the shop
            </Link>

            {/* Heading */}
            <div className="mt-7">
              <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#a94b27]">
                {isSignup
                  ? 'Create account'
                  : 'Customer login'}
              </p>

              <h1 className="mt-3 font-display text-[30px] font-semibold tracking-[-0.035em] text-[#14120f] sm:text-[34px]">
                {isSignup
                  ? 'Create an account.'
                  : 'Welcome back.'}
              </h1>

              <p className="mt-2.5 text-[14px] leading-6 text-[#6b6156]">
                {isSignup
                  ? 'Create an account to manage your orders, saved details and custom printing requests.'
                  : 'Sign in to access your orders, profile and saved information.'}
              </p>
            </div>

            {/* Form card */}
            <Card className="mt-7 border-[#d9d2c7] bg-white p-6 shadow-[0_8px_30px_rgba(20,18,15,0.05)] sm:p-7">
              <form
                onSubmit={handleSubmit}
                noValidate
                className="space-y-4"
              >
                {/* Name */}
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

                {/* Email */}
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

                {/* Password */}
                <div className="relative">
                  <Lock
                    className="pointer-events-none absolute left-3.5 top-[37px] z-10 h-4 w-4 text-[#8e8275]"
                    aria-hidden="true"
                  />

                  <Input
                    name="password"
                    type="password"
                    label="Password"
                    placeholder={
                      isSignup
                        ? 'Create a password'
                        : 'Enter your password'
                    }
                    autoComplete={
                      isSignup
                        ? 'new-password'
                        : 'current-password'
                    }
                    minLength={6}
                    required
                    className="pl-10"
                  />
                </div>

                {/* Forgot password */}
                {!isSignup && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() =>
                        setError(
                          'Password reset is not enabled yet. Please contact support to reset your password.'
                        )
                      }
                      className="text-[13px] text-[#a94b27] underline underline-offset-4 transition-colors hover:text-[#14120f]"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                {/* Error */}
                {error && (
                  <div
                    role="alert"
                    className="flex items-start gap-3 border border-red-200 bg-red-50 p-3.5 text-sm text-red-700"
                  >
                    <AlertCircle
                      className="mt-0.5 h-4 w-4 shrink-0"
                      aria-hidden="true"
                    />

                    <span className="leading-5">
                      {error}
                    </span>
                  </div>
                )}

                {/* Submit */}
                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  isLoading={isSubmitting}
                >
                  {isSignup
                    ? 'Create account'
                    : 'Sign in'}
                </Button>
              </form>

              {/* Firebase note */}
              <div className="mt-6 border-t border-[#ebe6dc] pt-5">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2
                    className="mt-0.5 h-4 w-4 shrink-0 text-[#a94b27]"
                    aria-hidden="true"
                  />

                  <p className="text-xs leading-5 text-[#8e8275]">
                    Authentication is securely handled
                    through Firebase. Your password is
                    not stored by the Shilp Sahayak
                    application.
                  </p>
                </div>
              </div>
            </Card>

            {/* Switch login/signup */}
            <p className="mt-6 text-[13.5px] text-[#6b6156]">
              {isSignup
                ? 'Already have an account?'
                : 'New to Shilp Sahayak?'}{' '}

              <button
                type="button"
                onClick={switchMode}
                className="border-b border-[#6b6156] font-medium text-[#14120f] transition-colors hover:border-[#a94b27] hover:text-[#a94b27]"
              >
                {isSignup
                  ? 'Sign in instead'
                  : 'Create one'}
              </button>
            </p>

            {/* Security footer */}
            <p className="mt-6 text-center font-mono text-[8px] uppercase tracking-[0.1em] text-[#9c9184]">
              Secure customer authentication ·
              Shilp Sahayak
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}