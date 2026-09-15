import React from 'react';
import { AdminGuard } from './AdminGuard';
import { RoleGuard } from './RoleGuard';

export { AdminGuard, RoleGuard };

export interface AuthGateProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  fallbackUrl?: string;
}

export const AuthGate: React.FC<AuthGateProps> = ({
  children,
  requireAdmin = false,
  fallbackUrl = '/'
}) => {
  if (requireAdmin) {
    return <AdminGuard fallbackUrl={fallbackUrl}>{children}</AdminGuard>;
  }
  return <>{children}</>;
};

export default AuthGate;
