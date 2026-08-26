import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

import { useUserRole } from '../hooks/useUserRole';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAdmin, loading } = useUserRole();
  const location = useLocation();

  if (loading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-[#f4f2ef] dark:bg-[#0f172a] transition-colors duration-200"
        role="status"
        aria-live="polite"
        aria-label="Checking administrator access"
      >
        <div className="flex items-center gap-3 text-brand-500">
          <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
          <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-charcoal-lighter dark:text-slate-400">
            Checking access
          </span>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <Navigate
        to="/admin/login"
        state={{ from: location }}
        replace
      />
    );
  }

  return <>{children}</>;
}
