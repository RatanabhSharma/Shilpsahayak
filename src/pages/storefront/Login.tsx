import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, User, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { Button, Input, Card } from '../../components/ui';

export function Login() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from?.pathname || '/account';

  const [isRegister, setIsRegister] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const name = formData.get('name') as string;

    try {
      if (isRegister) {
        await register(email, password, name);
      } else {
        await login(email, password);
      }
      navigate(from, { replace: true });
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError('This email is already registered. Please login.');
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        setError('Invalid email or password.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password should be at least 6 characters.');
      } else {
        setError(err.message || 'Something went wrong. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-serif text-3xl font-bold text-charcoal">
            {isRegister ? 'Create Account' : 'Welcome Back'}
          </h1>
          <p className="text-charcoal-light mt-2">
            {isRegister
              ? 'Register to track your quotes and orders'
              : 'Login to view your quotes and orders'}
          </p>
        </div>

        <Card className="p-8 border-none shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-5">
            {isRegister && (
              <Input
                name="name"
                label="Full Name"
                placeholder="Your name"
                required
              />
            )}

            <Input
              name="email"
              type="email"
              label="Email Address"
              placeholder="you@example.com"
              required
            />

            <Input
              name="password"
              type="password"
              label="Password"
              placeholder="••••••••"
              required
            />

            {error && (
              <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
              {isRegister ? 'Create Account' : 'Login'}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            {isRegister ? (
              <p className="text-charcoal-light">
                Already have an account?{' '}
                <button
                  onClick={() => setIsRegister(false)}
                  className="text-brand-600 font-medium hover:underline"
                >
                  Login
                </button>
              </p>
            ) : (
              <p className="text-charcoal-light">
                Don’t have an account?{' '}
                <button
                  onClick={() => setIsRegister(true)}
                  className="text-brand-600 font-medium hover:underline"
                >
                  Register
                </button>
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}