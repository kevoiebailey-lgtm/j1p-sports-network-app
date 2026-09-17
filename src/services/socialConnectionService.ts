import { 
  collection, 
  doc, 
  query, 
  limit, 
  onSnapshot, 
  getDocs,
  where,
  getDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { safeSetDoc, safeDeleteDoc, safeAddDoc, isFirestoreQuotaExceeded } from '../lib/firestoreQuotaGuard';
import { UserProfile, UserRole } from '../types';

export type SocialRelationshipType = 
  | 'recruiter_athlete'    // Recruiter/Scout follows Athlete
  | 'athlete_recruiter'    // Athlete follows Recruiter/Scout
  | 'coach_athlete'        // Coach follows Athlete
  | 'athlete_coach'        // Athlete follows Coach
  | 'peer_athlete'         // Athlete follows Athlete
  | 'general';             // General member connection

export interface SocialConnection {
  id: string; // `${followerId}_${targetId}`
  followerId: string;
  followerName: string;
  followerRole: string;
  followerAvatar?: string;
  followerSport?: string;
  followerSchool?: string;
  followerGradYear?: string;
  followerPosition?: string;
  followerState?: string;
  
  targetId: string;
  targetName: string;
  targetRole: string;
  targetAvatar?: string;
  targetSport?: string;
  targetSchool?: string;
  targetGradYear?: string;
  targetPosition?: string;
  targetState?: string;

  isRecruiterFollowingAthlete: boolean;
  isAthleteFollowingRecruiter: boolean;
  relationshipType: SocialRelationshipType;
  
  createdAt: string;
}

export interface UserFollowStats {
  followersCount: number;
  followingCount: number;
}

/**
 * Check if a role is classified as a Recruiter / Scout
 */
export function isRecruiterRole(role?: string): boolean {
  if (!role) return false;
  const r = role.toLowerCase().trim();
  return r === 'scout' || r === 'recruiter' || r === 'ncaa_scout' || r === 'college_scout';
}

/**
 * Check if a role is classified as an Athlete
 */
export function isAthleteRole(role?: string): boolean {
  if (!role) return false;
  const r = role.toLowerCase().trim();
  return r === 'athlete' || r === 'prospect' || r === 'player';
}

/**
 * Classify relationship type between follower and target
 */
export function determineRelationshipType(followerRole?: string, targetRole?: string): {
  relationshipType: SocialRelationshipType;
  isRecruiterFollowingAthlete: boolean;
  isAthleteFollowingRecruiter: boolean;
} {
  const isRecruiter = isRecruiterRole(followerRole);
  const isTargetAthlete = isAthleteRole(targetRole);
  const isFollowerAthlete = isAthleteRole(followerRole);
  const isTargetRecruiter = isRecruiterRole(targetRole);

  if (isRecruiter && isTargetAthlete) {
    return {
      relationshipType: 'recruiter_athlete',
      isRecruiterFollowingAthlete: true,
      isAthleteFollowingRecruiter: false
    };
  }

  if (isFollowerAthlete && isTargetRecruiter) {
    return {
      relationshipType: 'athlete_recruiter',
      isRecruiterFollowingAthlete: false,
      isAthleteFollowingRecruiter: true
    };
  }

  if (followerRole === 'coach' && isTargetAthlete) {
    return {
      relationshipType: 'coach_athlete',
      isRecruiterFollowingAthlete: false,
      isAthleteFollowingRecruiter: false
    };
  }

  if (isFollowerAthlete && targetRole === 'coach') {
    return {
      relationshipType: 'athlete_coach',
      isRecruiterFollowingAthlete: false,
      isAthleteFollowingRecruiter: false
    };
  }

  if (isFollowerAthlete && isTargetAthlete) {
    return {
      relationshipType: 'peer_athlete',
      isRecruiterFollowingAthlete: false,
      isAthleteFollowingRecruiter: false
    };
  }

  return {
    relationshipType: 'general',
    isRecruiterFollowingAthlete: false,
    isAthleteFollowingRecruiter: false
  };
}

class SocialConnectionService {
  private localConnections: Map<string, SocialConnection> = new Map();
  private listeners: Set<(connections: SocialConnection[]) => void> = new Set();
  private isSubscribed: boolean = false;
  private unsubscribeFirestore: (() => void) | null = null;

  constructor() {
    this.initRealtimeSubscription();
  }

  /**
   * Initializes real-time listener on user_follows collection with fallback
   */
  private initRealtimeSubscription() {
    if (this.isSubscribed || !db) return;

    try {
      const followsQuery = query(collection(db, 'user_follows'), limit(1500));
      this.unsubscribeFirestore = onSnapshot(followsQuery, (snapshot) => {
        this.localConnections.clear();
        snapshot.docs.forEach((docSnap) => {
          const data = docSnap.data() as any;
          const conn: SocialConnection = {
            id: docSnap.id,
            followerId: data.followerId || data.followerUid || '',
            followerName: data.followerName || 'Member',
            followerRole: data.followerRole || 'athlete',
            followerAvatar: data.followerAvatar || data.photoURL || '',
            followerSport: data.followerSport || '',
            followerSchool: data.followerSchool || '',
            followerGradYear: data.followerGradYear || '',
            followerPosition: data.followerPosition || '',
            followerState: data.followerState || '',
            
            targetId: data.targetId || data.targetUid || '',
            targetName: data.targetName || 'Member',
            targetRole: data.targetRole || 'athlete',
            targetAvatar: data.targetAvatar || '',
            targetSport: data.targetSport || '',
            targetSchool: data.targetSchool || '',
            targetGradYear: data.targetGradYear || '',
            targetPosition: data.targetPosition || '',
            targetState: data.targetState || '',

            isRecruiterFollowingAthlete: Boolean(data.isRecruiterFollowingAthlete),
            isAthleteFollowingRecruiter: Boolean(data.isAthleteFollowingRecruiter),
            relationshipType: data.relationshipType || 'general',
            createdAt: data.createdAt || new Date().toISOString()
          };
          this.localConnections.set(conn.id, conn);
        });

        this.notifyListeners();
      }, (err) => {
        console.warn('[SocialConnectionService] Follows listener notice:', err);
      });

      this.isSubscribed = true;
    } catch (err) {
      console.warn('[SocialConnectionService] Subscription init error:', err);
    }
  }

  private notifyListeners() {
    const list = Array.from(this.localConnections.values());
    this.listeners.forEach((fn) => {
      try {
        fn(list);
      } catch (e) {
        console.error('Error notifying social connection listener:', e);
      }
    });
  }

  /**
   * Subscribe to all social connections
   */
  public subscribeAllConnections(callback: (connections: SocialConnection[]) => void): () => void {
    this.listeners.add(callback);
    callback(Array.from(this.localConnections.values()));

    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Subscribe to specific follower's list of followed user IDs
   */
  public subscribeUserFollowingIds(followerId: string, callback: (targetIds: string[]) => void): () => void {
    const update = (connections: SocialConnection[]) => {
      const followedTargetIds = connections
        .filter(c => c.followerId === followerId)
        .map(c => c.targetId);
      callback(followedTargetIds);
    };

    return this.subscribeAllConnections(update);
  }

  /**
   * Subscribe to a user's follower and following counts in real-time
   */
  public subscribeUserFollowStats(userId: string, callback: (stats: UserFollowStats) => void): () => void {
    const update = (connections: SocialConnection[]) => {
      let followersCount = 0;
      let followingCount = 0;

      for (const conn of connections) {
        if (conn.targetId === userId) followersCount++;
        if (conn.followerId === userId) followingCount++;
      }

      callback({ followersCount, followingCount });
    };

    return this.subscribeAllConnections(update);
  }

  /**
   * Toggle follow / unfollow between two users with full role metadata
   */
  public async toggleFollow(
    follower: Partial<UserProfile> & { uid: string },
    target: Partial<UserProfile> & { uid: string }
  ): Promise<{ isFollowing: boolean }> {
    if (!follower.uid || !target.uid) {
      throw new Error('Both follower and target user IDs are required.');
    }

    if (follower.uid === target.uid) {
      throw new Error('Users cannot follow themselves.');
    }

    const docId = `${follower.uid}_${target.uid}`;
    const currentlyFollowing = this.localConnections.has(docId);

    if (currentlyFollowing) {
      // Unfollow
      await this.unfollowUser(follower.uid, target.uid);
      return { isFollowing: false };
    } else {
      // Follow
      await this.followUser(follower, target);
      return { isFollowing: true };
    }
  }

  /**
   * Follow a user and store relationship in Firestore
   */
  public async followUser(
    follower: Partial<UserProfile> & { uid: string },
    target: Partial<UserProfile> & { uid: string }
  ): Promise<void> {
    const docId = `${follower.uid}_${target.uid}`;
    const followerRole = follower.role || 'athlete';
    const targetRole = target.role || 'athlete';

    const { relationshipType, isRecruiterFollowingAthlete, isAthleteFollowingRecruiter } = 
      determineRelationshipType(followerRole, targetRole);

    const connectionData: SocialConnection = {
      id: docId,
      followerId: follower.uid,
      followerName: follower.displayName || 'Sports Member',
      followerRole,
      followerAvatar: follower.avatarUrl || follower.photoURL || '',
      followerSport: follower.sport || '',
      followerSchool: follower.highSchool || (follower as any).school || '',
      followerGradYear: follower.gradYear || '',
      followerPosition: follower.position || '',
      followerState: follower.state || '',

      targetId: target.uid,
      targetName: target.displayName || 'Sports Member',
      targetRole,
      targetAvatar: target.avatarUrl || target.photoURL || '',
      targetSport: target.sport || '',
      targetSchool: target.highSchool || (target as any).school || '',
      targetGradYear: target.gradYear || '',
      targetPosition: target.position || '',
      targetState: target.state || '',

      isRecruiterFollowingAthlete,
      isAthleteFollowingRecruiter,
      relationshipType,
      createdAt: new Date().toISOString()
    };

    // Optimistically store in memory
    this.localConnections.set(docId, connectionData);
    this.notifyListeners();

    if (!db) return;

    try {
      // 1. Primary write to `user_follows`
      await safeSetDoc(doc(db, 'user_follows', docId), {
        ...connectionData,
        timestamp: serverTimestamp()
      });

      // 2. Legacy mirror to `followers` for existing components
      await safeSetDoc(doc(db, 'followers', docId), {
        followerUid: follower.uid,
        followerName: connectionData.followerName,
        targetUid: target.uid,
        targetName: connectionData.targetName,
        createdAt: connectionData.createdAt
      });

      // 3. Dispatch in-app notification if target is active
      if (!isFirestoreQuotaExceeded()) {
        try {
          let notifTitle = 'New Follower';
          let notifMessage = `${connectionData.followerName} started following your profile.`;

          if (isRecruiterFollowingAthlete) {
            notifTitle = 'Verified Recruiter Following You!';
            notifMessage = `College Scout & Recruiter ${connectionData.followerName} added you to their scouting watchlist.`;
          } else if (isAthleteFollowingRecruiter) {
            notifTitle = 'New Athlete Prospect Follower';
            notifMessage = `Athlete ${connectionData.followerName} (${connectionData.followerSport || 'Talent'}) started following your scouting radar.`;
          }

          await safeAddDoc(collection(db, 'notifications'), {
            recipientUid: target.uid,
            senderUid: follower.uid,
            senderName: connectionData.followerName,
            senderAvatar: connectionData.followerAvatar || '',
            type: 'follow',
            title: notifTitle,
            message: notifMessage,
            read: false,
            createdAt: new Date().toISOString()
          });
        } catch (notifErr) {
          console.warn('[SocialConnectionService] Notification dispatch notice:', notifErr);
        }
      }
    } catch (err) {
      console.warn('[SocialConnectionService] Firestore write error:', err);
    }
  }

  /**
   * Unfollow a user and delete record from Firestore
   */
  public async unfollowUser(followerId: string, targetId: string): Promise<void> {
    const docId = `${followerId}_${targetId}`;

    // Optimistically remove from memory
    this.localConnections.delete(docId);
    this.notifyListeners();

    if (!db) return;

    try {
      await safeDeleteDoc(doc(db, 'user_follows', docId));
      await safeDeleteDoc(doc(db, 'followers', docId));
    } catch (err) {
      console.warn('[SocialConnectionService] Firestore delete error:', err);
    }
  }

  /**
   * Check if follower follows target
   */
  public isFollowing(followerId: string, targetId: string): boolean {
    const docId = `${followerId}_${targetId}`;
    return this.localConnections.has(docId);
  }

  /**
   * Get all followers for a user
   */
  public getFollowers(userId: string): SocialConnection[] {
    const results: SocialConnection[] = [];
    for (const conn of this.localConnections.values()) {
      if (conn.targetId === userId) {
        results.push(conn);
      }
    }
    return results;
  }

  /**
   * Get all users followed by a user
   */
  public getFollowing(userId: string): SocialConnection[] {
    const results: SocialConnection[] = [];
    for (const conn of this.localConnections.values()) {
      if (conn.followerId === userId) {
        results.push(conn);
      }
    }
    return results;
  }

  /**
   * Filter: Get all recruiters following a given athlete
   */
  public getRecruitersFollowingAthlete(athleteId: string): SocialConnection[] {
    return Array.from(this.localConnections.values()).filter(
      conn => conn.targetId === athleteId && (conn.isRecruiterFollowingAthlete || isRecruiterRole(conn.followerRole))
    );
  }

  /**
   * Filter: Get all athletes followed by a given recruiter
   */
  public getAthletesFollowedByRecruiter(recruiterId: string): SocialConnection[] {
    return Array.from(this.localConnections.values()).filter(
      conn => conn.followerId === recruiterId && (conn.isRecruiterFollowingAthlete || isAthleteRole(conn.targetRole))
    );
  }

  /**
   * Get an aggregated index of all recruiters and which athletes they follow
   */
  public getRecruiterAthleteIndex(): {
    recruitersWithAthletes: Map<string, { recruiterName: string; recruiterRole: string; athleteIds: Set<string>; connections: SocialConnection[] }>;
    athletesWithRecruiters: Map<string, { athleteName: string; recruiterIds: Set<string>; connections: SocialConnection[] }>;
  } {
    const recruitersWithAthletes = new Map<string, { recruiterName: string; recruiterRole: string; athleteIds: Set<string>; connections: SocialConnection[] }>();
    const athletesWithRecruiters = new Map<string, { athleteName: string; recruiterIds: Set<string>; connections: SocialConnection[] }>();

    for (const conn of this.localConnections.values()) {
      if (conn.isRecruiterFollowingAthlete || (isRecruiterRole(conn.followerRole) && isAthleteRole(conn.targetRole))) {
        // Recruiter -> Athlete
        if (!recruitersWithAthletes.has(conn.followerId)) {
          recruitersWithAthletes.set(conn.followerId, {
            recruiterName: conn.followerName,
            recruiterRole: conn.followerRole,
            athleteIds: new Set(),
            connections: []
          });
        }
        const rEntry = recruitersWithAthletes.get(conn.followerId)!;
        rEntry.athleteIds.add(conn.targetId);
        rEntry.connections.push(conn);

        // Athlete -> Recruiter
        if (!athletesWithRecruiters.has(conn.targetId)) {
          athletesWithRecruiters.set(conn.targetId, {
            athleteName: conn.targetName,
            recruiterIds: new Set(),
            connections: []
          });
        }
        const aEntry = athletesWithRecruiters.get(conn.targetId)!;
        aEntry.recruiterIds.add(conn.followerId);
        aEntry.connections.push(conn);
      }
    }

    return { recruitersWithAthletes, athletesWithRecruiters };
  }
}

export const socialConnectionService = new SocialConnectionService();
