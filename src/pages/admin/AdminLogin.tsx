import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, AlertCircle } from 'lucide-react';
import { Button, Input, Card } from '../../components/ui';
import { auth } from '../../lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';

export function AdminLogin() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true); 
    setError('');

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/admin/dashboard');
    } catch (err: any) {
      setError(err.message.includes('auth/invalid-credential') 
        ? 'Invalid email or password' 
        : 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-serif text-3xl font-bold text-charcoal">
            Shilp Sahayak
          </h1>
          <p className="text-brand-600 font-medium tracking-widest uppercase text-xs mt-2">
            Admin Portal
          </p>
        </div>

        <Card className="p-8">
          <div className="flex justify-center mb-6">
            <div className="w-12 h-12 bg-brand-50 rounded-full flex items-center justify-center text-brand-500">
              <Lock className="w-6 h-6" />
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <Input
              name="email"
              type="email"
              label="Email Address"
              
              required />

            <Input
              name="password"
              type="password"
              label="Password"
              
              required />

            {error && (
              <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              size="lg"
              isLoading={isLoading}>
              Sign In
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-charcoal-lighter">
              Use the credentials you created in Firebase
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}