"use client";

import React, { useEffect } from 'react';
import { AdminGuard } from '../../../components/Auth/AdminGuard';
import AdminMasterCommandTab from '../../../components/RoleViews/AdminView/AdminMasterCommandTab';

/**
 * Dedicated Admin Command Route (/dashboard/admin)
 * Protected by AdminGuard with zero-strobe authentication and role verification.
 */
export default function AdminDashboardPage() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('retry-lazy-refreshed');
    }
  }, []);

  return (
    <AdminGuard fallbackUrl="/">
      <AdminMasterCommandTab />
    </AdminGuard>
  );
}

export { AdminDashboardPage };

