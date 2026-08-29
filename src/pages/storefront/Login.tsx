import React, { useEffect, useMemo, useState, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  Lock,
  Mail,
  RefreshCw,
  ShieldCheck,
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
type SignUpStep = 'form' | 'otp' | 'success';

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
    signInWithGoogle,
    signInWithMicrosoft,
    requestPhoneOtp,
    confirmPhoneOtp,
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

  /* State Management */
  const [tab, setTab] = useState<AuthMainTab>('signin');
  const [signUpStep, setSignUpStep] = useState<SignUpStep>('form');

  const [isLoading, setIsLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'microsoft' | null>(null);
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

  /* OTP State */
  const [otpValues, setOtpValues] = useState(['', '', '', '', '', '']);
  const [otpCountdown, setOtpCountdown] = useState(0);
  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const passwordStrength = getPasswordStrength(password);

  /* Auto Redirect if already logged in */
  useEffect(() => {
    if (!authLoading && user && !isLoading && !socialLoading && signUpStep !== 'otp') {
      navigate(from, { replace: true });
    }
  }, [authLoading, user, isLoading, socialLoading, signUpStep, navigate, from]);

  /* OTP Countdown Timer */
  useEffect(() => {
    if (otpCountdown <= 0) return;
    const timer = setInterval(() => {
      setOtpCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [otpCountdown]);

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  const handleTabSwitch = (newTab: AuthMainTab) => {
    clearMessages();
    setTab(newTab);
    setSignUpStep('form');
    setOtpValues(['', '', '', '', '', '']);
  };

  /* ----------------------------------------------------
     GOOGLE 1-CLICK AUTH
  ----------------------------------------------------- */
  const handleGoogleSignIn = async () => {
    clearMessages();
    setSocialLoading('google');
    try {
      await signInWithGoogle();
      navigate(from, { replace: true });
    } catch (err: unknown) {
      setError(getFirebaseErrorMessage(err));
    } finally {
      setSocialLoading(null);
    }
  };

  /* ----------------------------------------------------
     MICROSOFT 1-CLICK AUTH
  ----------------------------------------------------- */
  const handleMicrosoftSignIn = async () => {
    clearMessages();
    setSocialLoading('microsoft');
    try {
      await signInWithMicrosoft();
      navigate(from, { replace: true });
    } catch (err: unknown) {
      setError(getFirebaseErrorMessage(err));
    } finally {
      setSocialLoading(null);
    }
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
     SIGN UP: REGISTER + SEND EMAIL LINK + SEND EMAIL OTP
  ----------------------------------------------------- */
  const handleSignUpInitiate = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);

    if (cleanName.length < 2) {
      setError('Please enter your full name.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
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
      // 1. Create account & dispatch official Firebase verification email
      await register(cleanEmail, password, cleanName, cleanPhone, false);

      // 2. Generate and send 6-digit Phone OTP to user's email
      await requestPhoneOtp(cleanEmail, cleanPhone);

      setSignUpStep('otp');
      setOtpCountdown(60);
      setOtpValues(['', '', '', '', '', '']);
      setTimeout(() => {
        otpInputsRef.current[0]?.focus();
      }, 150);
    } catch (err: unknown) {
      setError(getFirebaseErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  /* ----------------------------------------------------
     OTP INPUT HANDLERS
  ----------------------------------------------------- */
  const handleOtpChange = (index: number, val: string) => {
    const cleanDigit = val.replace(/\D/g, '').slice(-1);
    const newValues = [...otpValues];
    newValues[index] = cleanDigit;
    setOtpValues(newValues);

    if (cleanDigit && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }

    if (cleanDigit && index === 5 && newValues.every((d) => d !== '')) {
      handleVerifyOtp(newValues.join(''));
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpValues[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    const newValues = ['', '', '', '', '', ''];
    for (let i = 0; i < pasted.length; i++) {
      newValues[i] = pasted[i];
    }
    setOtpValues(newValues);

    const nextIndex = Math.min(pasted.length, 5);
    otpInputsRef.current[nextIndex]?.focus();

    if (pasted.length === 6) {
      handleVerifyOtp(pasted);
    }
  };

  /* ----------------------------------------------------
     VERIFY EMAIL OTP & COMPLETE PHONE VERIFICATION
  ----------------------------------------------------- */
  const handleVerifyOtp = async (codeToVerify?: string) => {
    const code = codeToVerify || otpValues.join('');
    clearMessages();

    if (code.length !== 6) {
      setError('Please enter the full 6-digit OTP code.');
      return;
    }

    setIsLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      const cleanPhone = phone.replace(/\D/g, '').slice(-10);

      await confirmPhoneOtp(cleanEmail, cleanPhone, code);

      setSignUpStep('success');
      setSuccess('Phone number verified! Official verification link sent to your email.');

      setTimeout(() => {
        navigate(from, { replace: true });
      }, 2200);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid OTP code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  /* ----------------------------------------------------
     RESEND OTP
  ----------------------------------------------------- */
  const handleResendOtp = async () => {
    clearMessages();
    setIsLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      const cleanPhone = phone.replace(/\D/g, '').slice(-10);
      await requestPhoneOtp(cleanEmail, cleanPhone);
      setOtpCountdown(60);
      setSuccess('A new 6-digit verification code has been dispatched to your email.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to resend code.');
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

          {/* Social Sign-In Buttons (Available on Sign In & Sign Up Form Step) */}
          {tab !== 'forgot' && signUpStep === 'form' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2.5">
                {/* Google Sign In */}
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={socialLoading !== null || isLoading}
                  className="flex items-center justify-center gap-2 h-11 rounded-xl border border-line bg-white hover:bg-shell/60 text-ink text-xs font-semibold shadow-2xs hover:border-ink/20 active:scale-98 transition-all disabled:opacity-60 cursor-pointer"
                >
                  {socialLoading === 'google' ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-accent" />
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                  )}
                  <span>Google</span>
                </button>

                {/* Microsoft Sign In */}
                <button
                  type="button"
                  onClick={handleMicrosoftSignIn}
                  disabled={socialLoading !== null || isLoading}
                  className="flex items-center justify-center gap-2 h-11 rounded-xl border border-line bg-white hover:bg-shell/60 text-ink text-xs font-semibold shadow-2xs hover:border-ink/20 active:scale-98 transition-all disabled:opacity-60 cursor-pointer"
                >
                  {socialLoading === 'microsoft' ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-accent" />
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 21 21">
                      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
                      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
                      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
                      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
                    </svg>
                  )}
                  <span>Microsoft</span>
                </button>
              </div>

              {/* Divider */}
              <div className="relative flex items-center justify-center">
                <div className="w-full border-t border-line" />
                <span className="bg-white px-3 font-mono text-[10px] uppercase tracking-wider text-muted shrink-0">
                  Or with credentials
                </span>
              </div>
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
              TAB 2: CREATE ACCOUNT (DUAL EMAIL & EMAIL-OTP FLOW)
          ====================================================== */}
          {tab === 'signup' && (
            <div className="space-y-4">
              {/* STEP 1: Registration Form */}
              {signUpStep === 'form' && (
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
                        placeholder="Ratanabh Sharma"
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

                  {/* Phone Number (with +91 Indian prefix) */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted">
                        INDIAN MOBILE NUMBER *
                      </label>
                      <span className="font-mono text-[9px] text-accent font-bold">EMAIL OTP VERIFIED</span>
                    </div>
                    <div className="flex items-center rounded-xl border border-line bg-shell/40 px-3.5 focus-within:border-accent focus-within:bg-white transition-colors">
                      <span className="font-mono text-xs font-bold text-ink mr-2">
                        🇮🇳 +91
                      </span>
                      <input
                        type="tel"
                        required
                        maxLength={10}
                        placeholder="98765 43210"
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
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink cursor-pointer"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
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
                      <span>Create Account & Verify</span>
                      <ArrowRight className="w-4 h-4 ml-1.5" />
                    </Button>
                  </div>
                </form>
              )}

              {/* STEP 2: Enter 6-Digit Email OTP to verify Mobile */}
              {signUpStep === 'otp' && (
                <div className="space-y-5">
                  <div className="space-y-1.5">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-accent">
                      STEP 2 OF 2 · EMAIL OTP VERIFICATION
                    </span>
                    <h3 className="font-display text-xl font-bold text-ink">
                      Verify Your Phone Number
                    </h3>
                    <p className="font-sans text-xs text-muted leading-relaxed">
                      We sent a 6-digit OTP to <strong className="text-ink font-semibold">{email}</strong> to verify mobile{' '}
                      <strong className="font-mono font-bold text-ink">+91 {phone}</strong>.{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setSignUpStep('form');
                          clearMessages();
                        }}
                        className="font-bold text-accent hover:underline cursor-pointer ml-1"
                      >
                        Change details
                      </button>
                    </p>
                  </div>

                  {/* Expiration Notice */}
                  <div className="flex items-center gap-1.5 text-[11px] font-mono text-muted bg-shell/60 px-3 py-1.5 rounded-lg border border-line">
                    <Clock className="w-3.5 h-3.5 text-accent" />
                    <span>OTP code is valid for 10 minutes</span>
                  </div>

                  {/* 6 Split Digit Boxes */}
                  <div className="flex justify-between gap-1.5 sm:gap-2">
                    {otpValues.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => {
                          otpInputsRef.current[idx] = el;
                        }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(idx, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                        onPaste={idx === 0 ? handleOtpPaste : undefined}
                        className="h-12 w-12 sm:h-13 sm:w-13 rounded-xl border border-line bg-shell/40 text-center font-mono text-xl font-bold text-ink outline-none focus:border-accent focus:bg-white focus:ring-2 focus:ring-accent/20 transition-all"
                      />
                    ))}
                  </div>

                  <Button
                    type="button"
                    onClick={() => handleVerifyOtp()}
                    variant="primary"
                    size="lg"
                    isLoading={isLoading}
                    disabled={isLoading || otpValues.some((d) => !d)}
                    className="w-full font-bold uppercase tracking-wider text-xs"
                  >
                    <span>Confirm OTP & Verify Mobile</span>
                    <CheckCircle2 className="w-4 h-4 ml-1.5" />
                  </Button>

                  <div className="flex items-center justify-between font-mono text-xs text-muted pt-1">
                    <span>Didn't receive email?</span>
                    {otpCountdown > 0 ? (
                      <span>Resend in {otpCountdown}s</span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        disabled={isLoading}
                        className="inline-flex items-center gap-1 font-bold text-accent hover:underline cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Resend OTP</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 3: Success & Email Notice Banner */}
              {signUpStep === 'success' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-6 space-y-4"
                >
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="font-display text-xl font-bold text-ink">
                      Account Created & Mobile Verified!
                    </h3>
                    <p className="font-sans text-xs text-muted leading-relaxed max-w-sm mx-auto">
                      Your mobile number has been verified. We also sent an official verification link to{' '}
                      <strong className="text-ink font-bold">{email}</strong>. Please check your inbox!
                    </p>
                  </div>
                </motion.div>
              )}
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

          {/* Studio Guarantee Badge */}
          <div className="pt-2 border-t border-line/60 flex items-center justify-center gap-2 text-muted font-mono text-[10px]">
            <ShieldCheck className="w-3.5 h-3.5 text-accent" />
            <span>256-Bit Encrypted · Verified Customer Studio</span>
          </div>
        </div>
      </div>
    </div>
  );
}



