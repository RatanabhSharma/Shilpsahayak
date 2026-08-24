import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  LockKeyhole,
  ShieldCheck,
} from 'lucide-react';
import { Button, Input, Card } from '../../components/ui';
import { auth } from '../../lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';

export function AdminLogin() {
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (isLoading) {
      return;
    }

    setError('');
    setIsLoading(true);

    const formData = new FormData(
      event.currentTarget
    );

    const email = String(
      formData.get('email') || ''
    ).trim();

    const password = String(
      formData.get('password') || ''
    );

    if (!email || !password) {
      setError(
        'Please enter your email address and password.'
      );
      setIsLoading(false);
      return;
    }

    try {
      /*
       * Keep the existing Firebase authentication.
       * This page does not use the Magic Patterns
       * mock authentication system.
       */
      await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      /*
       * Firebase authentication succeeded.
       *
       * ProtectedRoute will handle the subsequent
       * authorization/role check for the admin area.
       */
      navigate('/admin/dashboard', {
        replace: true,
      });
    } catch (err: unknown) {
      const firebaseError = err as {
        code?: string;
        message?: string;
      };

      switch (firebaseError.code) {
        case 'auth/invalid-credential':
        case 'auth/wrong-password':
        case 'auth/user-not-found':
          setError(
            'Invalid email or password.'
          );
          break;

        case 'auth/invalid-email':
          setError(
            'Please enter a valid email address.'
          );
          break;

        case 'auth/user-disabled':
          setError(
            'This account has been disabled. Please contact the administrator.'
          );
          break;

        case 'auth/too-many-requests':
          setError(
            'Too many login attempts. Please wait a moment and try again.'
          );
          break;

        case 'auth/network-request-failed':
          setError(
            'Network error. Please check your internet connection and try again.'
          );
          break;

        case 'auth/operation-not-allowed':
          setError(
            'Email/password authentication is not enabled for this Firebase project.'
          );
          break;

        default:
          console.error(
            'Admin authentication failed:',
            firebaseError.code,
            firebaseError.message
          );

          setError(
            'Login failed. Please try again.'
          );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f4ee] text-[#14120f]">
      <div className="mx-auto grid min-h-screen max-w-[1440px] lg:grid-cols-[1fr_1fr]">
        {/* =================================================
            Left visual panel
            ================================================= */}

        <div className="relative hidden overflow-hidden bg-[#14120f] lg:flex">
          {/* Technical background */}
          <div
            className="absolute inset-0 opacity-30"
            aria-hidden="true"
          >
            <div className="absolute inset-0 bg-[linear-gradient(rgba(247,244,238,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(247,244,238,0.05)_1px,transparent_1px)] bg-[size:48px_48px]" />

            <div className="absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#f7f4ee]/10" />

            <div className="absolute left-1/2 top-1/2 h-[360px] w-[360px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#f7f4ee]/10" />

            <div className="absolute left-1/2 top-1/2 h-[200px] w-[200px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#b4491e]/30" />
          </div>

          <div className="relative flex w-full flex-col justify-between p-12 xl:p-16">
            <div>
              <div className="flex items-center gap-3">
                <div
                  className="relative flex h-10 w-10 items-center justify-center border border-[#f7f4ee]/30 bg-[#f7f4ee] text-[#14120f]"
                  aria-hidden="true"
                >
                  <span className="font-display text-sm font-bold tracking-[-0.08em]">
                    SS
                  </span>

                  <span className="absolute -bottom-px -right-px h-2 w-2 bg-[#b4491e]" />
                </div>

                <div>
                  <p className="font-display text-lg font-semibold tracking-[-0.02em] text-[#f7f4ee]">
                    Shilp Sahayak
                  </p>

                  <p className="font-mono text-[8px] uppercase tracking-[0.16em] text-[#f7f4ee]/35">
                    Admin workspace
                  </p>
                </div>
              </div>

              <div className="mt-20 max-w-xl">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#d9784b]">
                  Restricted access / 01
                </p>

                <h1 className="mt-5 font-display text-5xl font-semibold leading-[0.98] tracking-[-0.045em] text-[#f7f4ee] xl:text-6xl">
                  Build.
                  <br />
                  Manage.
                  <br />
                  Deliver.
                </h1>

                <p className="mt-7 max-w-md text-[15px] leading-7 text-[#f7f4ee]/50">
                  Manage products, orders, customers,
                  inventory and custom printing requests
                  from the Shilp Sahayak workspace.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span
                className="h-1.5 w-1.5 rounded-full bg-[#b4491e]"
                aria-hidden="true"
              />

              <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#f7f4ee]/35">
                Authorized administrators only
              </span>
            </div>
          </div>
        </div>

        {/* =================================================
            Right login panel
            ================================================= */}

        <div className="flex min-h-screen items-center justify-center px-5 py-12 sm:px-8 lg:px-12 xl:px-20">
          <div className="w-full max-w-[480px]">
            {/* Back to storefront */}
            <button
              type="button"
              onClick={() => navigate('/')}
              className="mb-10 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[#6b6156] transition-colors hover:text-[#14120f]"
            >
              <ArrowLeft
                className="h-3.5 w-3.5"
                aria-hidden="true"
              />

              Back to store
            </button>

            {/* Heading */}
            <div className="mb-8">
              <div className="mb-5 flex h-11 w-11 items-center justify-center border border-[#d9d2c7] bg-white text-[#b4491e]">
                <ShieldCheck
                  className="h-5 w-5"
                  aria-hidden="true"
                />
              </div>

              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#b4491e]">
                Administrator sign in
              </p>

              <h2 className="mt-3 font-display text-4xl font-semibold tracking-[-0.04em] text-[#14120f] sm:text-5xl">
                Welcome back.
              </h2>

              <p className="mt-4 max-w-md text-sm leading-6 text-[#6b6156]">
                Sign in with your authorized
                administrator account to access the
                Shilp Sahayak control panel.
              </p>
            </div>

            {/* Login card */}
            <Card className="border-[#d9d2c7] bg-white p-6 shadow-[0_8px_30px_rgba(20,18,15,0.06)] sm:p-8">
              <div className="mb-7 flex items-center gap-3 border-b border-[#ebe6dc] pb-5">
                <div className="flex h-9 w-9 items-center justify-center bg-[#f7f4ee] text-[#b4491e]">
                  <LockKeyhole
                    className="h-4 w-4"
                    aria-hidden="true"
                  />
                </div>

                <div>
                  <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#8e8275]">
                    Secure authentication
                  </p>

                  <p className="mt-1 text-sm font-medium text-[#14120f]">
                    Admin credentials
                  </p>
                </div>
              </div>

              <form
                onSubmit={handleLogin}
                noValidate
                className="space-y-5"
              >
                <Input
                  name="email"
                  type="email"
                  label="Email Address"
                  placeholder="admin@example.com"
                  autoComplete="username"
                  inputMode="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  required
                />

                <Input
                  name="password"
                  type="password"
                  label="Password"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                />

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

                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  isLoading={isLoading}
                >
                  Sign In
                </Button>
              </form>

              <div className="mt-7 border-t border-[#ebe6dc] pt-5">
                <div className="flex items-start gap-2.5">
                  <ShieldCheck
                    className="mt-0.5 h-4 w-4 shrink-0 text-[#b4491e]"
                    aria-hidden="true"
                  />

                  <p className="text-xs leading-5 text-[#8e8275]">
                    Administrator permissions are verified
                    separately after Firebase authentication.
                  </p>
                </div>
              </div>
            </Card>

            <p className="mt-6 text-center font-mono text-[9px] uppercase tracking-[0.1em] text-[#9c9184]">
              Shilp Sahayak · Admin workspace
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
