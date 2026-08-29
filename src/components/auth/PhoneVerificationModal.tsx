import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Phone,
  ShieldCheck,
  X,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  ArrowRight,
  Mail,
  Clock,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui';

interface PhoneVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerified?: () => void;
  initialPhone?: string;
  userEmail?: string;
  title?: string;
  description?: string;
}

export function PhoneVerificationModal({
  isOpen,
  onClose,
  onVerified,
  initialPhone = '',
  userEmail = '',
  title = 'Verify Your Mobile Number',
  description = 'To ensure your order is securely tracked and prevent spam orders, we will send a 6-digit verification code to your registered email address.',
}: PhoneVerificationModalProps) {
  const { user, requestPhoneOtp, confirmPhoneOtp } = useAuth();

  const targetEmail = userEmail || user?.email || '';
  const [step, setStep] = useState<'input' | 'otp' | 'success'>('input');
  const [phoneNumber, setPhoneNumber] = useState(
    initialPhone.replace(/\D/g, '').slice(-10)
  );
  const [otpValues, setOtpValues] = useState(['', '', '', '', '', '']);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);

  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (initialPhone) {
      setPhoneNumber(initialPhone.replace(/\D/g, '').slice(-10));
    }
  }, [initialPhone]);

  // Countdown timer for Resend OTP (60 seconds)
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');

    const clean = phoneNumber.replace(/\D/g, '').slice(-10);
    if (!/^[6-9]\d{9}$/.test(clean)) {
      setError('Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    if (!targetEmail) {
      setError('No registered email found. Please ensure you are logged in.');
      return;
    }

    setIsLoading(true);
    try {
      await requestPhoneOtp(targetEmail, clean);
      setStep('otp');
      setCountdown(60);
      setOtpValues(['', '', '', '', '', '']);
      setTimeout(() => {
        otpInputsRef.current[0]?.focus();
      }, 150);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Failed to dispatch OTP code. Please try again.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (index: number, val: string) => {
    const cleanDigit = val.replace(/\D/g, '').slice(-1);
    const newValues = [...otpValues];
    newValues[index] = cleanDigit;
    setOtpValues(newValues);

    // Auto-advance to next input
    if (cleanDigit && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }

    // Auto-verify if all 6 digits entered
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

  const handleVerifyOtp = async (codeToVerify?: string) => {
    const code = codeToVerify || otpValues.join('');
    setError('');

    if (code.length !== 6) {
      setError('Please enter the complete 6-digit OTP.');
      return;
    }

    setIsLoading(true);
    try {
      await confirmPhoneOtp(targetEmail, phoneNumber, code);
      setStep('success');
      setTimeout(() => {
        if (onVerified) onVerified();
        onClose();
      }, 1400);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Invalid OTP code. Please check your email and try again.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 select-none">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-line bg-white p-6 sm:p-8 shadow-2xl"
        >
          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-shell hover:text-ink transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>

          {/* STEP 1: Phone Input */}
          {step === 'input' && (
            <div className="space-y-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-accent">
                <Phone className="h-6 w-6" />
              </div>

              <div className="space-y-1.5">
                <h3 className="font-display text-xl font-bold tracking-tight text-ink">
                  {title}
                </h3>
                <p className="font-sans text-xs text-muted leading-relaxed">
                  {description}
                </p>
              </div>

              {/* Delivery Email Preview Note */}
              <div className="flex items-center gap-2 rounded-xl border border-line bg-shell/70 p-3 text-xs text-ink font-sans">
                <Mail className="h-4 w-4 text-accent shrink-0" />
                <span>
                  OTP will be sent to:{' '}
                  <strong className="font-mono text-ink">{targetEmail || 'your email'}</strong>
                </span>
              </div>

              {error && (
                <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted block mb-1.5">
                    INDIAN MOBILE NUMBER
                  </label>
                  <div className="flex items-center rounded-xl border border-line bg-shell/50 px-3.5 focus-within:border-accent focus-within:bg-white transition-colors">
                    <span className="font-mono text-sm font-bold text-ink mr-2">
                      🇮🇳 +91
                    </span>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      autoFocus
                      placeholder="98765 43210"
                      value={phoneNumber}
                      onChange={(e) =>
                        setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))
                      }
                      className="w-full h-11 bg-transparent font-mono text-sm font-bold text-ink placeholder:font-sans placeholder:font-normal placeholder:text-muted outline-none"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  isLoading={isLoading}
                  disabled={isLoading || phoneNumber.length !== 10}
                  className="w-full font-bold uppercase tracking-wider text-xs"
                >
                  <span>Send 6-Digit OTP to Email</span>
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </form>
            </div>
          )}

          {/* STEP 2: 6-Digit OTP Verification */}
          {step === 'otp' && (
            <div className="space-y-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-accent">
                <ShieldCheck className="h-6 w-6" />
              </div>

              <div className="space-y-1.5">
                <h3 className="font-display text-xl font-bold tracking-tight text-ink">
                  Enter Verification Code
                </h3>
                <p className="font-sans text-xs text-muted leading-relaxed">
                  We sent a 6-digit code to{' '}
                  <strong className="text-ink font-semibold">{targetEmail}</strong> to verify mobile{' '}
                  <strong className="font-mono font-bold text-ink">+91 {phoneNumber}</strong>.{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setStep('input');
                      setError('');
                    }}
                    className="font-bold text-accent hover:underline cursor-pointer ml-1"
                  >
                    Change
                  </button>
                </p>
              </div>

              {/* Expiry Banner */}
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-muted bg-shell/60 px-3 py-1.5 rounded-lg border border-line">
                <Clock className="w-3.5 h-3.5 text-accent" />
                <span>Code expires in 10 minutes</span>
              </div>

              {error && (
                <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* 6-Digit Split Boxes */}
              <div className="flex justify-between gap-2 sm:gap-2.5 py-1">
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
                    className="h-12 w-12 sm:h-13 sm:w-13 rounded-xl border border-line bg-shell/40 text-center font-mono text-xl font-bold text-ink shadow-2xs outline-none focus:border-accent focus:bg-white focus:ring-2 focus:ring-accent/20 transition-all"
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
                <span>Verify Mobile Number</span>
                <CheckCircle2 className="w-4 h-4 ml-1.5" />
              </Button>

              {/* Resend OTP Bar */}
              <div className="flex items-center justify-between font-mono text-xs text-muted pt-1">
                <span>Didn't receive email?</span>
                {countdown > 0 ? (
                  <span className="text-muted">Resend in {countdown}s</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSendOtp()}
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

          {/* STEP 3: Success Banner */}
          {step === 'success' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-6 text-center space-y-4"
            >
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <div className="space-y-1">
                <h3 className="font-display text-xl font-bold text-ink">
                  Mobile Number Verified!
                </h3>
                <p className="font-sans text-xs text-muted">
                  +91 {phoneNumber} has been securely verified and linked to your account.
                </p>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}



