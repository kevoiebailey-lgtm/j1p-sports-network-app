import React from 'react';
import { AdminGuard } from '../Auth/AdminGuard';

export interface AdminRouteProps {
  children: React.ReactNode;
  fallbackUrl?: string;
}

/**
 * AdminRoute
 * Legacy and central route protector for Platform Administrator Command Desks.
 * Wraps AdminGuard to guarantee zero screen flickering / strobe effects during auth & role resolution.
 */
export const AdminRoute: React.FC<AdminRouteProps> = ({ 
  children, 
  fallbackUrl = '/' 
}) => {
  return <AdminGuard fallbackUrl={fallbackUrl}>{children}</AdminGuard>;
};

export { AdminGuard };
export default AdminRoute;
