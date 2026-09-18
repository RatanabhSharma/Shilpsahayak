import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { useAuth } from '../hooks/useAuth';
import { PageLoading } from './loading/PageLoading';

interface CustomerRouteProps {
  children: React.ReactNode;
}

export function CustomerRoute({ children }: CustomerRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <PageLoading label="Checking account" />;
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



