/**
 * Tournament & Event Authorization Guard
 * Allows edit/delete actions if the current authenticated user is:
 * - The tournament/event creator (`creatorId`, `directorId`, `createdBy`, or `organizerId`)
 * - An administrator (`admin`)
 * - A tournament director (`director`)
 * - Or authorized organization / manager
 */

export interface AuthorizableEvent {
  creatorId?: string;
  directorId?: string;
  createdBy?: string;
  organizerId?: string;
  [key: string]: any;
}

export function canManageEvent(
  event?: AuthorizableEvent | null,
  user?: { uid: string } | null,
  role?: string | null
): boolean {
  if (!user && !role) return false;

  const normalizedRole = (role || '').toLowerCase().trim();
  if (normalizedRole === 'admin' || normalizedRole === 'director' || normalizedRole === 'organization') {
    return true;
  }

  if (!user?.uid || !event) {
    return false;
  }

  const uid = user.uid;
  return (
    event.creatorId === uid ||
    event.directorId === uid ||
    event.createdBy === uid ||
    event.organizerId === uid
  );
}

export function canCreateEvents(
  user?: { uid: string } | null,
  role?: string | null
): boolean {
  if (!user && !role) return false;
  const normalizedRole = (role || '').toLowerCase().trim();
  return (
    normalizedRole === 'admin' ||
    normalizedRole === 'director' ||
    normalizedRole === 'organization' ||
    normalizedRole === 'coach' ||
    Boolean(user?.uid)
  );
}
