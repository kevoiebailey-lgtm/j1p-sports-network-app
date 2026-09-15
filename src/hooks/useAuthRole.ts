import { useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole, AppRole, UserDoc } from '../types/platform';

const ROLE_STORAGE_KEY = 'just1play_active_role';

// Canonical role normalizer
export function normalizeRole(rawRole?: string | null): UserRole {
  if (!rawRole) return 'athlete';
  if (rawRole === 'member') return 'member';
  if (rawRole === 'coach') return 'coach';
  if (rawRole === 'coach_scout' || rawRole === 'scout') return 'scout';
  if (rawRole === 'tournament_director' || rawRole === 'director' || rawRole === 'organization') return 'director';
  if (rawRole === 'creator' || rawRole === 'content_creator' || rawRole === 'media_creator') return 'creator';
  if (rawRole === 'admin') return 'admin';
  if (rawRole === 'fan' || rawRole === 'viewer') return 'fan';
  return 'athlete';
}

/**
 * useAuthRole
 * Fully synchronized with AuthContext to eliminate dual-source-of-truth race conditions.
 */
export function useAuthRole() {
  const navigate = useNavigate();
  const location = useLocation();
  const authCtx = useAuth();

  const currentUser = authCtx.user;
  const role = authCtx.role;
  const loading = authCtx.isLoading;
  const isAdmin = authCtx.isAdmin;
  const userDoc = (authCtx.profile as unknown as UserDoc) || null;

  // Sync role with URL if in a dashboard path (admins only to prevent unauthorized switching)
  useEffect(() => {
    const pathname = location.pathname;
    let targetRole: UserRole | null = null;
    if (pathname.startsWith('/dashboard/athlete') || pathname.startsWith('/app/dashboard/athlete')) {
      targetRole = 'athlete';
    } else if (pathname.startsWith('/dashboard/scout') || pathname.startsWith('/app/dashboard/scout')) {
      targetRole = 'scout';
    } else if (pathname.startsWith('/dashboard/director') || pathname.startsWith('/app/dashboard/director')) {
      targetRole = 'director';
    } else if (pathname.startsWith('/dashboard/creator') || pathname.startsWith('/creator/studio')) {
      targetRole = 'creator';
    } else if (pathname.startsWith('/dashboard/viewer') || pathname.startsWith('/app/dashboard/viewer') || pathname.startsWith('/fan')) {
      targetRole = 'fan';
    } else if (pathname.startsWith('/dashboard/admin') || pathname.startsWith('/admin') || pathname.startsWith('/app/dashboard/admin')) {
      targetRole = 'admin';
    }

    if (targetRole && targetRole !== role && isAdmin) {
      authCtx.switchRole(targetRole).catch(() => {});
    }
  }, [location.pathname, role, isAdmin, authCtx]);

  // Switch role and navigate to the isolated dashboard safely
  const switchRole = useCallback(async (newRoleInput: UserRole | AppRole) => {
    const newRole = normalizeRole(newRoleInput);

    if (!isAdmin) {
      console.warn('[Security] Role switching is restricted to Platform Administrators only.');
      return;
    }

    await authCtx.switchRole(newRole);

    // Direct routing to designated uncluttered layout route
    switch (newRole) {
      case 'athlete':
        navigate('/dashboard/athlete');
        break;
      case 'coach':
        navigate('/playbook');
        break;
      case 'scout':
        navigate('/dashboard/scout');
        break;
      case 'director':
        navigate('/dashboard/director');
        break;
      case 'creator':
        navigate('/dashboard/creator');
        break;
      case 'member':
      case 'fan':
      case 'viewer':
        navigate('/dashboard/viewer');
        break;
      case 'admin':
        navigate('/dashboard/admin');
        break;
    }
  }, [isAdmin, authCtx, navigate]);

  const roleLocked = Boolean(authCtx.profile?.roleLocked || authCtx.profile?.profileLocked || authCtx.profile?.profileCompleted || authCtx.profile?.hasCompletedOnboarding) || isAdmin;
  const hasCompletedOnboarding = Boolean(authCtx.profile?.profileCompleted || authCtx.profile?.hasCompletedOnboarding || authCtx.profile?.profileLocked || authCtx.profile?.roleLocked) || isAdmin;
  const profileCompleted = hasCompletedOnboarding;

  return {
    user: currentUser,
    userDoc,
    profile: authCtx.profile,
    role,
    roleLocked,
    hasCompletedOnboarding,
    profileCompleted,
    loading,
    isLoading: authCtx.isLoading,
    isRoleLoading: authCtx.isRoleLoading,
    roleResolving: authCtx.roleResolving,
    switchRole,
    isMember: role === 'member',
    isAthlete: role === 'athlete',
    isCoach: role === 'coach',
    isScout: role === 'scout',
    isDirector: role === 'director',
    isCreator: role === 'creator',
    isViewer: role === 'viewer' || role === 'fan' || role === 'member',
    isFan: role === 'fan' || role === 'viewer' || role === 'member',
    isAdmin
  };
}

export default useAuthRole;
