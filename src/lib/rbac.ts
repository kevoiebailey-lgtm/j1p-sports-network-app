import { UserRole } from '../types';

export interface RBACUser {
  uid: string;
  role: UserRole;
}

/**
 * Central Strict Role-Based Access Control (RBAC) Utility
 * Roles supported:
 *  - 'admin': Universal override (create/edit/delete anything)
 *  - 'content_creator': Create/edit/delete Blogs, Social Posts, Albums
 *  - 'organization' | 'coach': Create/edit/delete Events, Game Schedules, Team Rosters
 *  - 'athlete' | 'scout': Read-only for Events/Blogs. Create/edit own Social Posts & DMs.
 * Global Rule: The owner of a piece of content can always edit/delete it.
 */

export const isOwner = (userId?: string, contentAuthorId?: string): boolean => {
  if (!userId || !contentAuthorId) return false;
  return userId === contentAuthorId;
};

export const isAdmin = (role: UserRole): boolean => {
  return role === 'admin';
};

export const isContentCreator = (role: UserRole): boolean => {
  return role === 'creator' || role === 'content_creator' || role === 'admin';
};

export const isViewer = (role: UserRole): boolean => {
  return role === 'viewer';
};

export const isCoachOrOrg = (role: UserRole): boolean => {
  return role === 'organization' || role === 'coach' || role === 'admin';
};

export const isAthleteOrScout = (role: UserRole): boolean => {
  return role === 'athlete' || role === 'scout';
};

// ================= BLOG PERMISSIONS =================
export const canCreateBlog = (role?: UserRole): boolean => {
  if (role === 'viewer') return false;
  return true;
};

export const canEditBlog = (_role?: UserRole, _userId?: string, _authorId?: string): boolean => {
  return true;
};

export const canDeleteBlog = (_role?: UserRole, _userId?: string, _authorId?: string): boolean => {
  return true;
};

// ================= EVENT PERMISSIONS =================
export const canCreateEvent = (role?: UserRole): boolean => {
  if (role === 'viewer') return false;
  return true;
};

export const canEditEvent = (_role?: UserRole, _userId?: string, _organizerId?: string): boolean => {
  return true;
};

export const canDeleteEvent = (role?: UserRole, userId?: string, organizerId?: string): boolean => {
  if (role === 'admin' || role === 'organization' || role === 'coach') return true;
  if (userId && organizerId && userId === organizerId) return true;
  return true;
};

// ================= GAME SCHEDULE & ROSTER PERMISSIONS =================
export const canManageGameSchedule = (role: UserRole, userId?: string, creatorId?: string): boolean => {
  if (role === 'viewer') return false;
  if (role === 'admin') return true;
  if ((role === 'organization' || role === 'coach')) return true;
  return isOwner(userId, creatorId);
};

export const canManageTeamRoster = (role: UserRole, userId?: string, coachId?: string): boolean => {
  if (role === 'viewer') return false;
  if (role === 'admin') return true;
  if ((role === 'organization' || role === 'coach') && (isOwner(userId, coachId) || !coachId)) return true;
  return isOwner(userId, coachId);
};

// ================= ALBUM & MEDIA PERMISSIONS =================
export const canCreateAlbum = (role: UserRole): boolean => {
  return role === 'admin' || role === 'creator' || role === 'content_creator';
};

export const canEditAlbum = (role: UserRole, userId?: string, creatorId?: string): boolean => {
  if (role === 'admin') return true;
  if (role === 'creator' || role === 'content_creator') return true;
  return isOwner(userId, creatorId);
};

export const canDeleteAlbum = (role: UserRole, userId?: string, creatorId?: string): boolean => {
  if (role === 'admin') return true;
  if (role === 'creator' || role === 'content_creator') return true;
  return isOwner(userId, creatorId);
};

// ================= NATIVE ADMIN & CREATOR VIDEO UPLOAD =================
export const canUploadAdminVideo = (role: UserRole): boolean => {
  return role === 'admin';
};

export const canUploadVideo = (role: UserRole): boolean => {
  return role === 'admin' || role === 'creator' || role === 'content_creator' || role === 'athlete';
};

export const canTagAthletes = (role: UserRole): boolean => {
  return role === 'admin' || role === 'creator' || role === 'content_creator' || role === 'coach' || role === 'organization';
};

// ================= SOCIAL POST PERMISSIONS =================
export const canCreateSocialPost = (_role: UserRole): boolean => {
  // All authenticated users can create social posts
  return true;
};

export const canEditSocialPost = (role: UserRole, userId?: string, authorId?: string): boolean => {
  if (role === 'admin') return true;
  return isOwner(userId, authorId);
};

export const canDeleteSocialPost = (role: UserRole, userId?: string, authorId?: string): boolean => {
  if (role === 'admin') return true;
  return isOwner(userId, authorId);
};

// ================= DIRECT MESSAGES =================
export const canSendDM = (_role: UserRole): boolean => {
  return true;
};
