import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

import { useAuth } from '../hooks/useAuth';

interface CustomerRouteProps {
  children: React.ReactNode;
}

export function CustomerRoute({ children }: CustomerRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div
        className="flex min-h-[60vh] items-center justify-center bg-[#f7f4ee]"
        role="status"
        aria-live="polite"
        aria-label="Checking authentication"
      >
        <div className="flex items-center gap-3 text-[#b4491e]">
          <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
          <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#8e8275]">
            Checking account
          </span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        state={{
          from: {
            pathname: location.pathname,
            search: location.search,
            hash: location.hash,
          },
        }}
        replace
      />
    );
  }

  return <>{children}</>;
}
