import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  ShieldCheck,
  Lock,
} from 'lucide-react';
import { Button, Input, BrandLogo } from '../../components/ui';
import { auth } from '../../lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';

export function AdminLogin() {
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isLoading) return;

    setError('');
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get('email') || '').trim();
    const password = String(formData.get('password') || '');

    if (!email || !password) {
      setError('Please enter your administrator email and password.');
      setIsLoading(false);
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/admin/dashboard', { replace: true });
    } catch (err: unknown) {
      const firebaseError = err as { code?: string; message?: string };

      switch (firebaseError.code) {
        case 'auth/invalid-credential':
        case 'auth/wrong-password':
        case 'auth/user-not-found':
          setError('Invalid administrator email or password.');
          break;
        case 'auth/invalid-email':
          setError('Please enter a valid email address.');
          break;
        case 'auth/user-disabled':
          setError('This account has been disabled.');
          break;
        case 'auth/too-many-requests':
          setError('Too many attempts. Please wait a moment.');
          break;
        default:
          setError('Authentication failed. Please verify credentials.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen w-full lg:grid-cols-12 bg-shell text-ink">
      {/* Left Dark Showcase Column */}
      <div className="relative hidden overflow-hidden bg-[#0b0f17] text-white lg:col-span-5 lg:flex lg:flex-col lg:justify-between p-12 xl:p-16 border-r border-zinc-800">
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(#ff4d00_1px,transparent_1px)] [background-size:24px_24px]" />
          <div className="absolute right-0 top-1/3 h-80 w-80 rounded-full bg-accent/20 blur-3xl" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <BrandLogo size="md" showText={false} />
            <div>
              <span className="font-display text-xl font-bold tracking-tight text-white block">
                Shilp Sahayak
              </span>
              <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-accent">
                Workshop Operations
              </span>
            </div>
          </div>
        </div>

        <div className="relative z-10 max-w-sm space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-bold text-accent">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Restricted Engineer Access</span>
          </div>

          <h1 className="font-display text-4xl font-bold text-white leading-tight">
            Build. Manage. Deliver.
          </h1>

          <p className="text-xs text-zinc-400 leading-relaxed font-sans">
            Manage live 3D print queue, review customer CAD uploads, adjust filament stock, and control storefront catalog pieces.
          </p>

          <div className="pt-4 border-t border-zinc-800 flex items-center gap-4 text-xs font-mono text-zinc-400">
            <span>🔒 Multi-Role RBAC Protected</span>
          </div>
        </div>

        <div className="relative z-10 text-[11px] font-mono text-zinc-500">
          Patiala Workshop Control Console · Shilp Sahayak
        </div>
      </div>

      {/* Right Login Form Column */}
      <div className="flex min-h-screen items-center justify-center px-5 py-12 sm:px-8 lg:col-span-7 lg:px-12">
        <div className="w-full max-w-[440px]">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-muted hover:text-accent transition-colors mb-6"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Storefront</span>
          </Link>

          <div className="mb-6">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-accent block">
              Studio Access
            </span>
            <h2 className="mt-1 font-display text-3xl font-bold text-ink sm:text-4xl">
              Engineer Sign In
            </h2>
            <p className="mt-2 text-xs text-muted leading-relaxed font-sans">
              Sign in with your authorized administrator credentials to enter the production control console.
            </p>
          </div>

          <div className="rounded-xl border border-line bg-white p-7 sm:p-8 shadow-xs">
            <form onSubmit={handleLogin} noValidate className="space-y-4">
              <Input
                name="email"
                type="email"
                label="Admin Email *"
                placeholder="admin@shilpsahayak.in"
                autoComplete="username"
                required
              />

              <Input
                name="password"
                type="password"
                label="Security Key / Password *"
                placeholder="••••••••••••"
                autoComplete="current-password"
                required
              />

              {error && (
                <div className="flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <Button
                type="submit"
                size="lg"
                className="w-full font-bold shadow-xs shadow-accent/20 bg-accent text-white hover:bg-accent-dark"
                isLoading={isLoading}
              >
                Access Control Panel
              </Button>
            </form>

            <div className="mt-6 border-t border-line pt-4 text-xs text-muted font-sans flex items-start gap-2">
              <Lock className="h-4 w-4 text-accent shrink-0 mt-0.5" />
              <span>
                Role-based access permissions are enforced via Firebase Firestore security rules.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminLogin;
