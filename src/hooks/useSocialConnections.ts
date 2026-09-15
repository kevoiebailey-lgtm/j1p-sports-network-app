import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  socialConnectionService, 
  SocialConnection, 
  UserFollowStats,
  isRecruiterRole,
  isAthleteRole
} from '../services/socialConnectionService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { UserProfile } from '../types';

export interface UseSocialConnectionsOptions {
  targetUserId?: string;
  targetProfile?: Partial<UserProfile> & { uid: string };
}

export function useSocialConnections(options?: UseSocialConnectionsOptions) {
  const { user, profile } = useAuth();
  const { showToast } = useToast();

  const currentUid = user?.uid || profile?.uid || '';
  const targetId = options?.targetUserId || options?.targetProfile?.uid || '';

  const [allConnections, setAllConnections] = useState<SocialConnection[]>([]);
  const [targetStats, setTargetStats] = useState<UserFollowStats>({ followersCount: 0, followingCount: 0 });
  const [currentUserFollowingIds, setCurrentUserFollowingIds] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Subscribe to all global connections
  useEffect(() => {
    const unsub = socialConnectionService.subscribeAllConnections((connections) => {
      setAllConnections(connections);
    });
    return unsub;
  }, []);

  // Subscribe to target user stats if targetId provided
  useEffect(() => {
    if (!targetId) return;
    const unsub = socialConnectionService.subscribeUserFollowStats(targetId, (stats) => {
      setTargetStats(stats);
    });
    return unsub;
  }, [targetId]);

  // Subscribe to current user's following list
  useEffect(() => {
    if (!currentUid) {
      setCurrentUserFollowingIds([]);
      return;
    }
    const unsub = socialConnectionService.subscribeUserFollowingIds(currentUid, (ids) => {
      setCurrentUserFollowingIds(ids);
    });
    return unsub;
  }, [currentUid]);

  // Is current user following the target user?
  const isFollowingTarget = useMemo(() => {
    if (!currentUid || !targetId) return false;
    return currentUserFollowingIds.includes(targetId);
  }, [currentUid, targetId, currentUserFollowingIds]);

  // Toggle follow action
  const toggleFollow = useCallback(async (customTargetProfile?: Partial<UserProfile> & { uid: string }) => {
    const target = customTargetProfile || options?.targetProfile;
    if (!target || !target.uid) {
      console.warn('Cannot follow: target profile is missing');
      return false;
    }

    if (!currentUid) {
      showToast('info', 'Sign In Required', 'Please sign in to follow athletes and recruiters.');
      return false;
    }

    if (currentUid === target.uid) {
      showToast('info', 'Notice', 'You cannot follow your own profile.');
      return false;
    }

    setIsProcessing(true);
    try {
      const followerProfile = {
        uid: currentUid,
        displayName: user?.displayName || profile?.displayName || 'Sports Member',
        role: profile?.role || 'athlete',
        avatarUrl: profile?.avatarUrl || profile?.photoURL || user?.photoURL || '',
        sport: profile?.sport || '',
        highSchool: profile?.highSchool || (profile as any)?.school || '',
        gradYear: profile?.gradYear || '',
        position: profile?.position || '',
        state: profile?.state || ''
      };

      const result = await socialConnectionService.toggleFollow(followerProfile, target);

      const targetRole = target.role || 'athlete';
      const followerRole = followerProfile.role;
      const targetName = target.displayName || 'Member';

      if (result.isFollowing) {
        if (isRecruiterRole(followerRole) && isAthleteRole(targetRole)) {
          showToast('success', 'Athlete Added to Watchlist', `You are now following prospect ${targetName}. Tracking live film & combine stats.`);
        } else if (isAthleteRole(followerRole) && isRecruiterRole(targetRole)) {
          showToast('success', 'Following Recruiter', `You are now connected to verified scout ${targetName}.`);
        } else {
          showToast('success', 'Following Member', `You are now following ${targetName}.`);
        }
      } else {
        showToast('info', 'Unfollowed', `You unfollowed ${targetName}.`);
      }

      return result.isFollowing;
    } catch (err: any) {
      console.error('Follow toggle error:', err);
      showToast('error', 'Error', err.message || 'Failed to update follow status.');
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, [currentUid, user, profile, options?.targetProfile, showToast]);

  // Cross-filtering helpers
  const recruitersWithAthletes = useMemo(() => {
    return socialConnectionService.getRecruiterAthleteIndex().recruitersWithAthletes;
  }, [allConnections]);

  const athletesWithRecruiters = useMemo(() => {
    return socialConnectionService.getRecruiterAthleteIndex().athletesWithRecruiters;
  }, [allConnections]);

  const getRecruitersFollowing = useCallback((athleteId: string) => {
    return socialConnectionService.getRecruitersFollowingAthlete(athleteId);
  }, [allConnections]);

  const getAthletesFollowedBy = useCallback((recruiterId: string) => {
    return socialConnectionService.getAthletesFollowedByRecruiter(recruiterId);
  }, [allConnections]);

  return {
    allConnections,
    targetStats,
    followersCount: targetStats.followersCount,
    followingCount: targetStats.followingCount,
    isFollowingTarget,
    currentUserFollowingIds,
    toggleFollow,
    isProcessing,
    recruitersWithAthletes,
    athletesWithRecruiters,
    getRecruitersFollowing,
    getAthletesFollowedBy
  };
}
