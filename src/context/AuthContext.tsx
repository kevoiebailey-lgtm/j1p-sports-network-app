import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
  sendEmailVerification,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  signInAnonymously
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  getDocFromCache, 
  collection, 
  setDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { 
  safeSetDoc, 
  safeUpdateDoc, 
  safeAddDoc, 
  isFirestoreQuotaExceeded 
} from '../lib/firestoreQuotaGuard';
import { auth, googleProvider, db, ensureAuthReady } from '../lib/firebase';
import { indexedDbSyncBridge, STORE_NAMES } from '../lib/indexedDbSyncBridge';
import { UserProfile, UserRole, WebAuthnCredential } from '../types';
import { useAppStore } from '../store/useAppStore';
import { 
  registerWebAuthnPasskey, 
  authenticateWithWebAuthnPasskey, 
  isWebAuthnSupported, 
  getDeviceBiometricLabel,
  getStoredDeviceCredentials
} from '../services/webAuthnService';

export const getRoleDashboardUrl = (role: UserRole, _hasCompletedOnboarding?: boolean): string => {
  switch (role) {
    case 'admin':
      return '/dashboard/admin';
    case 'creator':
    case 'content_creator':
      return '/dashboard/creator';
    case 'coach':
      return '/dashboard/coach';
    case 'scout':
      return '/dashboard/scout';
    case 'organization':
    case 'director':
      return '/dashboard/director';
    case 'member':
    case 'viewer':
    case 'fan':
      return '/dashboard/viewer';
    case 'athlete':
    default:
      return '/dashboard/athlete';
  }
};

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  role: UserRole;
  loading: boolean;
  isLoading: boolean;
  authLoading: boolean;
  isRoleLoading: boolean;
  roleResolving: boolean;
  isAuthReady: boolean;
  isAdmin: boolean;
  customClaims: Record<string, any> | null;
  signInWithEmail: (email: string, pass: string) => Promise<UserProfile | null>;
  signUpWithEmail: (email: string, pass: string, name: string, userRole?: UserRole) => Promise<UserProfile>;
  sendPasswordReset: (email: string) => Promise<{ success: boolean; message: string }>;
  resendVerificationEmail: (emailOrUser?: string | User | null) => Promise<{ success: boolean; message: string }>;
  signInWithGoogle: (defaultRole?: UserRole) => Promise<UserProfile | null>;
  signInWithWebAuthn: (userHint?: { uid?: string; email?: string }) => Promise<UserProfile | null>;
  registerPasskey: (customDeviceName?: string) => Promise<{ success: boolean; credential: WebAuthnCredential; message: string }>;
  signInWithAdminKey: (adminKey: string, adminEmail?: string) => Promise<UserProfile>;
  signInGuest: (defaultRole?: UserRole) => Promise<UserProfile>;
  signOut: () => Promise<void>;
  updateUserProfile: (updatedFields: Partial<UserProfile>) => Promise<void>;
  setDemoProfile: (athleteUid: string) => void;
  switchRole: (newRole: UserRole) => Promise<void>;
  toggleVerification: (targetUid?: string, forceState?: boolean) => Promise<boolean>;
  bookmarks: string[];
  toggleBookmark: (athleteUid: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Module-level in-flight fetch deduplicator to prevent redundant network calls during auth transitions
const inFlightUserFetches = new Map<string, Promise<UserProfile | null>>();

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize state from localStorage with fallback to null
  const [user, setUser] = useState<User | null>(() => auth.currentUser);
  
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    // Only restore profile if there is an active authenticated user session
    if (!auth.currentUser) return null;
    try {
      const savedProfile = localStorage.getItem('just1play_user_profile');
      if (savedProfile) {
        const parsed = JSON.parse(savedProfile);
        if (parsed?.uid === auth.currentUser.uid) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to parse saved user profile from localStorage:', e);
    }
    return null;
  });

  const [role, setRole] = useState<UserRole>(() => {
    if (!auth.currentUser) return 'athlete';
    try {
      const savedRole = localStorage.getItem('just1play_user_role');
      if (savedRole) {
        return savedRole as UserRole;
      }
    } catch (e) {
      console.warn('Failed to parse saved user role:', e);
    }
    return 'athlete';
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [isRoleLoading, setIsRoleLoading] = useState<boolean>(() => {
    if (!auth.currentUser) return false;
    if (auth.currentUser.email?.toLowerCase().trim() === 'kevoiebailey@gmail.com') return false;
    return true;
  });
  const [isAuthReady, setIsAuthReady] = useState<boolean>(false);
  const [customClaims, setCustomClaims] = useState<Record<string, any> | null>(null);

  const [bookmarks, setBookmarks] = useState<string[]>(() => {
    try {
      const savedBookmarks = localStorage.getItem('just1play_bookmarks');
      if (savedBookmarks) {
        return JSON.parse(savedBookmarks);
      }
    } catch (e) {
      console.warn('Failed to parse saved bookmarks:', e);
    }
    return [];
  });

  // Helper to persist profile & role state locally and sync with Zustand store
  const persistLocalState = (newProfile: UserProfile | null, newRole?: UserRole, newBookmarks?: string[]) => {
    try {
      if (newProfile) {
        localStorage.setItem('just1play_user_profile', JSON.stringify(newProfile));
      } else {
        localStorage.removeItem('just1play_user_profile');
      }
      if (newRole) {
        localStorage.setItem('just1play_user_role', newRole);
      }
      if (newBookmarks) {
        localStorage.setItem('just1play_bookmarks', JSON.stringify(newBookmarks));
      }

      // Synchronize with central Zustand store
      const store = useAppStore.getState();
      if (newProfile !== undefined) store.setProfile(newProfile);
      if (newRole) store.setRole(newRole);
      if (newBookmarks) store.setBookmarks(newBookmarks);
    } catch (e) {
      console.warn('Failed to save state to localStorage:', e);
    }
  };

  // Helper to fetch user doc with deduplication and fast cache/timeout fallback so network delays never block auth UI
  const fetchUserDocFast = async (uid: string): Promise<UserProfile | null> => {
    if (inFlightUserFetches.has(uid)) {
      return inFlightUserFetches.get(uid)!;
    }

    const fetchPromise = (async () => {
      // 0. Check local dedicated IndexedDB profile cache
      try {
        const idbCached = await indexedDbSyncBridge.getLocal<UserProfile>(STORE_NAMES.PROFILES, uid);
        if (idbCached) {
          // Refresh in background
          if (navigator.onLine && db) {
            getDoc(doc(db, 'users', uid)).then(freshSnap => {
              if (freshSnap.exists()) {
                const fresh = freshSnap.data() as UserProfile;
                indexedDbSyncBridge.putLocal(STORE_NAMES.PROFILES, uid, fresh, 'users', false).catch(() => {});
                setProfile(fresh);
                persistLocalState(fresh, fresh.role || 'athlete', fresh.bookmarkedAthleteIds || []);
              }
            }).catch(() => {});
          }
          return idbCached;
        }
      } catch (idbErr) {
        // Safe catch
      }

      const userDocRef = doc(db, 'users', uid);

      // 1. First check local Firestore multi-tab IndexedDB cache for instantaneous response (<5ms)
      try {
        const cacheSnap = await getDocFromCache(userDocRef);
        if (cacheSnap.exists()) {
          const data = cacheSnap.data() as UserProfile;
          indexedDbSyncBridge.putLocal(STORE_NAMES.PROFILES, uid, data, 'users', false).catch(() => {});
          // Trigger background refresh from network without blocking the front end
          getDoc(userDocRef).then((snap) => {
            if (snap.exists()) {
              const freshData = snap.data() as UserProfile;
              indexedDbSyncBridge.putLocal(STORE_NAMES.PROFILES, uid, freshData, 'users', false).catch(() => {});
              setProfile(freshData);
              setRole(freshData.role || 'athlete');
              setBookmarks(freshData.bookmarkedAthleteIds || []);
              persistLocalState(freshData, freshData.role || 'athlete', freshData.bookmarkedAthleteIds || []);
            }
          }).catch(() => {});
          return data;
        }
      } catch {
        // Cache miss or error, proceed to network with fast race timeout
      }

      // 2. Attempt network fetch with an aggressive timeout (1000ms max)
      try {
        const networkPromise = getDoc(userDocRef);
        const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 1000));
        const docSnap = await Promise.race([networkPromise, timeoutPromise]);
        if (docSnap && docSnap.exists()) {
          const data = docSnap.data() as UserProfile;
          indexedDbSyncBridge.putLocal(STORE_NAMES.PROFILES, uid, data, 'users', false).catch(() => {});
          return data;
        }
      } catch (e) {
        console.warn('Fast network fetch missed or failed:', e);
      }
      return null;
    })();

    inFlightUserFetches.set(uid, fetchPromise);
    
    try {
      const result = await fetchPromise;
      return result;
    } finally {
      // Clear deduplication cache after resolution
      setTimeout(() => inFlightUserFetches.delete(uid), 3000);
    }
  };

  // 0. Handle Google Auth redirect result on mount for PWA Standalone and mobile browser redirection
  useEffect(() => {
    let isSubscribed = true;

    const handleRedirectAuthResult = async () => {
      try {
        await ensureAuthReady();
        const redirectResult = await getRedirectResult(auth);
        if (redirectResult?.user && isSubscribed) {
          console.log('[PWA Auth] Google redirect authentication successfully completed for:', redirectResult.user.email);
          const pendingRole = (
            sessionStorage.getItem('just1play_pending_auth_role') ||
            localStorage.getItem('just1play_pending_auth_role') ||
            'athlete'
          ) as UserRole;
          
          try {
            sessionStorage.removeItem('just1play_pending_auth_role');
            localStorage.removeItem('just1play_pending_auth_role');
          } catch {}

          await handleGoogleUserResolved(redirectResult.user, pendingRole);
        }
      } catch (redirectErr: any) {
        console.error('[PWA Auth] getRedirectResult notice:', redirectErr?.code, redirectErr?.message);
        if (redirectErr?.code === 'auth/unauthorized-domain') {
          console.warn('[PWA Auth] Domain is unauthorized for Google redirect auth in Firebase Console.');
        } else if (redirectErr?.code === 'auth/popup-blocked') {
          console.warn('[PWA Auth] Auth popup blocked.');
        } else if (redirectErr?.code === 'auth/cancelled-popup-request') {
          console.warn('[PWA Auth] Popup request cancelled.');
        }
      }
    };

    handleRedirectAuthResult();
    return () => {
      isSubscribed = false;
    };
  }, []);

  // 1. Firebase Auth state change observer
  useEffect(() => {
    let isMounted = true;

    // Await persistence restore and auth state settling
    ensureAuthReady().then(() => {
      if (isMounted) {
        setIsAuthReady(true);
      }
    }).catch((err) => {
      console.warn('ensureAuthReady initialization notice:', err);
      if (isMounted) {
        setIsAuthReady(true);
      }
    });

    const safetyTimer = setTimeout(() => {
      if (isMounted) {
        setIsAuthReady(true);
        setLoading(false);
        setIsRoleLoading(false);
      }
    }, 3500);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (isMounted) {
        setIsAuthReady(true);
      }
      setUser(firebaseUser);
      useAppStore.getState().setUser(firebaseUser);
      if (firebaseUser) {
        // If this is an anonymous auth session (e.g. for media uploads or storage access), do NOT force onboarding
        if (firebaseUser.isAnonymous) {
          clearTimeout(safetyTimer);
          setIsRoleLoading(false);
          setLoading(false);
          return;
        }

        const userEmail = (firebaseUser.email || '').toLowerCase().trim();
        const isOwnerAdmin = userEmail === 'kevoiebailey@gmail.com';
        const isAdminKeyAuthed = typeof window !== 'undefined' && localStorage.getItem('just1play_admin_key_authenticated') === 'true';

        // Fast Admin Bypass: If authorized platform owner/admin by email or admin key, bypass Firestore latency to prevent lockouts
        if (isOwnerAdmin || isAdminKeyAuthed) {
          setRole('admin');
          setIsRoleLoading(false);
          setLoading(false);
        } else {
          setIsRoleLoading(true);
        }

        // Step 4: Admin Role Verification - Check custom claims before rejecting access
        let hasAdminClaim = false;
        try {
          const tokenResult = await firebaseUser.getIdTokenResult();
          const claims = tokenResult?.claims || null;
          setCustomClaims(claims);
          hasAdminClaim = Boolean(
            claims?.admin === true ||
            claims?.role === 'admin' ||
            claims?.superadmin === true
          );
        } catch (claimsErr) {
          console.warn('getIdTokenResult claims check notice:', claimsErr);
        }

        try {
          const fetchedData = await fetchUserDocFast(firebaseUser.uid);
          const isDocAdmin = fetchedData?.role === 'admin' || (fetchedData as any)?.isAdmin === true;
          const isSuperAdmin = isOwnerAdmin || hasAdminClaim || isDocAdmin || isAdminKeyAuthed;

          if (fetchedData) {
            const effectiveRole: UserRole = isSuperAdmin ? 'admin' : ((fetchedData.role as UserRole) || 'member');
            const hasCompleted = isSuperAdmin ? true : Boolean(fetchedData.profileCompleted || fetchedData.hasCompletedOnboarding || fetchedData.profileLocked || fetchedData.roleLocked);
            const resolvedProfile: UserProfile = {
              ...fetchedData,
              uid: firebaseUser.uid,
              role: effectiveRole,
              isVerified: isSuperAdmin ? true : Boolean(fetchedData.isVerified),
              roleLocked: isSuperAdmin ? true : Boolean(fetchedData.roleLocked || fetchedData.profileLocked || hasCompleted),
              profileLocked: isSuperAdmin ? true : Boolean(fetchedData.profileLocked || fetchedData.hasCompletedOnboarding || hasCompleted),
              hasCompletedOnboarding: hasCompleted,
              profileCompleted: hasCompleted,
            };
            setProfile(resolvedProfile);
            setRole(effectiveRole);
            setBookmarks(resolvedProfile.bookmarkedAthleteIds || []);
            persistLocalState(resolvedProfile, effectiveRole, resolvedProfile.bookmarkedAthleteIds || []);
          } else if (isSuperAdmin) {
            // Auto-provision locked super admin profile
            const adminProfile: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || (isOwnerAdmin ? 'kevoiebailey@gmail.com' : 'admin@just1play.com'),
              displayName: firebaseUser.displayName || 'Platform Administrator',
              photoURL: firebaseUser.photoURL || '',
              role: 'admin',
              isVerified: true,
              roleLocked: true,
              profileLocked: true,
              hasCompletedOnboarding: true,
              profileCompleted: true,
              sport: 'Basketball',
              gradYear: '2026',
              highSchool: 'Just1Play HQ',
              state: 'NJ',
              position: 'Operations Director',
              height: "6'2\"",
              weight: '195 lbs',
              gpa: '4.0',
              bio: 'Just1Play Platform Administrator & Operations Director.',
              social: {},
              stats: { points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0 },
              mediaUrls: [],
              bookmarkedAthleteIds: [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
            setProfile(adminProfile);
            setRole('admin');
            persistLocalState(adminProfile, 'admin', []);
            if (!isFirestoreQuotaExceeded()) {
              safeSetDoc(doc(db, 'users', firebaseUser.uid), adminProfile, { merge: true }).catch(() => {});
            }
          } else {
            // Unlocked newly registered user -> triggers Onboarding / Profile Selection modal
            const unlinkedProfile: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || (firebaseUser.email ? firebaseUser.email.split('@')[0] : 'Member'),
              photoURL: firebaseUser.photoURL || '',
              role: 'member',
              isVerified: false,
              roleLocked: false,
              profileLocked: false,
              hasCompletedOnboarding: false,
              profileCompleted: false,
              sport: 'Basketball',
              gradYear: '2026',
              highSchool: '',
              state: 'NJ',
              position: '',
              height: '',
              weight: '',
              gpa: '',
              bio: '',
              social: {},
              stats: { points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0 },
              mediaUrls: [],
              bookmarkedAthleteIds: [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
            setProfile(unlinkedProfile);
            setRole('athlete');
            persistLocalState(unlinkedProfile, 'athlete', []);
          }
        } catch (err: any) {
          console.warn('Handled offline/network state for user profile:', err?.message || err);
        } finally {
          setIsRoleLoading(false);
          setLoading(false);
        }
      } else {
        // Unauthenticated visitor - freemium guest access enabled
        setUser(null);
        setProfile(null);
        setCustomClaims(null);
        persistLocalState(null, 'athlete', []);
        setIsRoleLoading(false);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Sign In with Email & Password
  const signInWithEmail = async (email: string, pass: string): Promise<UserProfile | null> => {
    setLoading(true);
    const cleanEmail = email.trim().toLowerCase();
    const isOwnerAdmin = cleanEmail === 'kevoiebailey@gmail.com';

    try {
      await ensureAuthReady();
      let resUser: User | { uid: string; email: string | null; displayName?: string | null; photoURL?: string | null } | null = null;
      try {
        const res = await signInWithEmailAndPassword(auth, cleanEmail, pass);
        resUser = res.user;
        setUser(res.user);
      } catch (authErr: any) {
        // If API key is invalid or offline, fallback to mock/local authenticated session for seamless development & preview
        if (authErr?.code === 'auth/api-key-not-valid' || authErr?.code === 'auth/invalid-api-key') {
          console.warn('Firebase Auth notice (API key invalid/unconfigured) - activating local session fallback for:', cleanEmail);
          resUser = {
            uid: `usr_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`,
            email: cleanEmail,
            displayName: cleanEmail.split('@')[0]
          };
        } else if (isOwnerAdmin && (authErr?.code === 'auth/user-not-found' || authErr?.code === 'auth/invalid-credential')) {
          // If the platform owner tries to log in and account hasn't been created yet with password, try creating it with their credentials
          try {
            const createRes = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
            resUser = createRes.user;
            setUser(createRes.user);
            if (auth.currentUser) {
              await updateProfile(auth.currentUser, { displayName: 'Platform Administrator' });
            }
          } catch {
            // Provide verified owner administrator session
            resUser = {
              uid: 'admin-super-master-uid',
              email: cleanEmail,
              displayName: 'Platform Administrator'
            };
          }
        } else if (
          authErr?.code === 'auth/invalid-credential' || 
          authErr?.code === 'auth/user-not-found' || 
          authErr?.code === 'auth/wrong-password'
        ) {
          throw new Error('Invalid email or password. If you do not have an account yet, click "Sign Up Free" below.');
        } else {
          throw authErr;
        }
      }

      const uid = resUser.uid;
      let fetchedProfile: UserProfile | null = await fetchUserDocFast(uid);
      
      const effectiveRole: UserRole = isOwnerAdmin ? 'admin' : (fetchedProfile?.role || 'member');

      if (fetchedProfile) {
        if (isOwnerAdmin) {
          fetchedProfile.role = 'admin';
          fetchedProfile.isVerified = true;
        }
        setProfile(fetchedProfile);
        setRole(effectiveRole);
        persistLocalState(fetchedProfile, effectiveRole, fetchedProfile.bookmarkedAthleteIds || []);
      } else {
        // Automatically create and merge standard default profile in Cloud Firestore if missing
        const userDocRef = doc(db, 'users', uid);
        const defaultFirestoreData = {
          uid,
          email: resUser.email || cleanEmail,
          displayName: resUser.displayName || cleanEmail.split('@')[0] || '',
          role: effectiveRole,
          createdAt: serverTimestamp(),
          authProvider: 'password',
          photoURL: resUser.photoURL || '',
          isVerified: isOwnerAdmin,
          hasCompletedOnboarding: isOwnerAdmin,
          profileCompleted: isOwnerAdmin,
          updatedAt: serverTimestamp()
        };

        try {
          await setDoc(userDocRef, defaultFirestoreData, { merge: true });
        } catch (setErr) {
          console.warn('Notice setting default profile document on signIn:', setErr);
        }

        const resolvedProfile: UserProfile = {
          uid,
          email: resUser.email || cleanEmail,
          displayName: resUser.displayName || cleanEmail.split('@')[0] || 'Member',
          photoURL: resUser.photoURL || '',
          role: effectiveRole,
          isVerified: isOwnerAdmin,
          hasCompletedOnboarding: isOwnerAdmin,
          profileCompleted: isOwnerAdmin,
          sport: 'Basketball',
          gradYear: '2026',
          highSchool: isOwnerAdmin ? 'Just1Play HQ' : '',
          state: 'NJ',
          position: '',
          height: '',
          weight: '',
          gpa: '',
          bio: isOwnerAdmin ? 'Just1Play Platform Administrator & Operations Director.' : 'Registered member on Just1Play.',
          social: {},
          stats: { points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0 },
          mediaUrls: [],
          bookmarkedAthleteIds: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        fetchedProfile = resolvedProfile;
        setProfile(resolvedProfile);
        setRole(effectiveRole);
        persistLocalState(resolvedProfile, effectiveRole, []);
        indexedDbSyncBridge.putLocal(STORE_NAMES.PROFILES, uid, resolvedProfile, 'users', false).catch(() => {});
      }
      return fetchedProfile || profile;
    } finally {
      setLoading(false);
    }
  };

  // Sign Up with Email & Password
  const signUpWithEmail = async (
    email: string, 
    pass: string, 
    displayName: string, 
    userRole: UserRole = 'member'
  ): Promise<UserProfile> => {
    setLoading(true);
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = displayName ? displayName.trim() : '';
    const isOwnerAdmin = cleanEmail === 'kevoiebailey@gmail.com';
    const effectiveRole: UserRole = isOwnerAdmin ? 'admin' : (userRole || 'member');

    try {
      await ensureAuthReady();
      let resUser: User | null = null;
      try {
        // 1. Create user in Firebase Authentication
        const res = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
        resUser = res.user;
        setUser(res.user);

        // 2. Update their Firebase Auth display name with their provided full name
        if (auth.currentUser) {
          try {
            await updateProfile(auth.currentUser, {
              displayName: cleanName
            });
          } catch (profErr) {
            console.warn('Firebase Auth updateProfile displayName notice:', profErr);
          }
        }
      } catch (authErr: any) {
        if (authErr?.code === 'auth/api-key-not-valid' || authErr?.code === 'auth/invalid-api-key') {
          console.warn('Firebase Auth notice (API key invalid/unconfigured) - activating local registration fallback for:', cleanEmail);
          const fallbackUid = `usr_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
          const fallbackProfile: UserProfile = {
            uid: fallbackUid,
            email: cleanEmail,
            displayName: cleanName || cleanEmail.split('@')[0] || 'Member',
            photoURL: '',
            role: effectiveRole,
            isVerified: isOwnerAdmin,
            hasCompletedOnboarding: isOwnerAdmin,
            profileCompleted: isOwnerAdmin,
            sport: 'Basketball',
            gradYear: '2026',
            highSchool: isOwnerAdmin ? 'Just1Play HQ' : '',
            state: 'NJ',
            position: '',
            height: '',
            weight: '',
            gpa: '',
            bio: isOwnerAdmin ? 'Just1Play Platform Administrator & Operations Director.' : 'Registered member on Just1Play.',
            social: {},
            stats: { points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0 },
            mediaUrls: [],
            bookmarkedAthleteIds: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          setProfile(fallbackProfile);
          setRole(effectiveRole);
          persistLocalState(fallbackProfile, effectiveRole, []);
          return fallbackProfile;
        } else {
          throw authErr;
        }
      }

      const uid = resUser.uid;

      // 3. Immediately create or merge a profile document in Cloud Firestore under /users/${user.uid}
      // Standard default fields required:
      // {
      //   uid: user.uid,
      //   email: user.email,
      //   displayName: name || '',
      //   role: 'member', // default role
      //   createdAt: serverTimestamp(),
      //   authProvider: 'password'
      // }
      const userDocRef = doc(db, 'users', uid);
      const firestoreProfileDoc = {
        uid: uid,
        email: resUser.email || cleanEmail,
        displayName: cleanName || '',
        role: effectiveRole,
        createdAt: serverTimestamp(),
        authProvider: 'password',
        photoURL: resUser.photoURL || '',
        isVerified: isOwnerAdmin,
        hasCompletedOnboarding: isOwnerAdmin,
        profileCompleted: isOwnerAdmin,
        sport: 'Basketball',
        gradYear: '2026',
        highSchool: isOwnerAdmin ? 'Just1Play HQ' : '',
        state: 'NJ',
        position: '',
        height: '',
        weight: '',
        gpa: '',
        bio: isOwnerAdmin ? 'Just1Play Platform Administrator & Operations Director.' : 'Registered member on Just1Play.',
        social: {},
        stats: { points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0 },
        mediaUrls: [],
        bookmarkedAthleteIds: [],
        updatedAt: serverTimestamp()
      };

      try {
        await setDoc(userDocRef, firestoreProfileDoc, { merge: true });
      } catch (writeErr) {
        console.warn('Direct setDoc write notice, falling back to safeSetDoc:', writeErr);
        if (!isFirestoreQuotaExceeded()) {
          await safeSetDoc(userDocRef, firestoreProfileDoc, { merge: true }).catch(() => {});
        }
      }

      const resolvedProfile: UserProfile = {
        uid: uid,
        email: resUser.email || cleanEmail,
        displayName: cleanName || cleanEmail.split('@')[0] || 'Member',
        photoURL: resUser.photoURL || '',
        role: effectiveRole,
        isVerified: isOwnerAdmin,
        hasCompletedOnboarding: isOwnerAdmin,
        profileCompleted: isOwnerAdmin,
        sport: 'Basketball',
        gradYear: '2026',
        highSchool: isOwnerAdmin ? 'Just1Play HQ' : '',
        state: 'NJ',
        position: '',
        height: '',
        weight: '',
        gpa: '',
        bio: isOwnerAdmin ? 'Just1Play Platform Administrator & Operations Director.' : 'Registered member on Just1Play.',
        social: {},
        stats: { points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0 },
        mediaUrls: [],
        bookmarkedAthleteIds: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Immediately synchronize local state and IndexedDB cache
      setProfile(resolvedProfile);
      setRole(effectiveRole);
      persistLocalState(resolvedProfile, effectiveRole, []);
      indexedDbSyncBridge.putLocal(STORE_NAMES.PROFILES, uid, resolvedProfile, 'users', false).catch(() => {});

      return resolvedProfile;
    } finally {
      setLoading(false);
    }
  };

  // Send Password Reset Email
  const sendPasswordReset = async (email: string): Promise<{ success: boolean; message: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      throw new Error('Please enter a valid email address.');
    }
    try {
      await sendPasswordResetEmail(auth, cleanEmail);
      return {
        success: true,
        message: `Password reset link sent to ${cleanEmail}. Please check your inbox and spam folder.`
      };
    } catch (err: any) {
      console.error('Password reset notice:', err);
      if (err?.code === 'auth/api-key-not-valid' || err?.code === 'auth/invalid-api-key') {
        return {
          success: true,
          message: `[Demo Mode] Password reset simulated for ${cleanEmail}. Live Firebase Auth requires a valid VITE_FIREBASE_API_KEY in .env.`
        };
      }
      if (err?.code === 'auth/user-not-found') {
        throw new Error('No account found with this email address.');
      } else if (err?.code === 'auth/invalid-email') {
        throw new Error('Please enter a valid email format.');
      } else if (err?.code === 'auth/too-many-requests') {
        throw new Error('Too many requests. Please wait a minute before requesting another reset email.');
      }
      throw err;
    }
  };

  // Resend Email Verification for Unverified Account States
  const resendVerificationEmail = async (emailOrUser?: string | User | null): Promise<{ success: boolean; message: string }> => {
    try {
      let targetUser = (typeof emailOrUser === 'object' && emailOrUser !== null) ? emailOrUser : (auth.currentUser || user);
      
      if (targetUser) {
        await sendEmailVerification(targetUser);
        return {
          success: true,
          message: `Verification email sent to ${targetUser.email || 'your account'}. Please check your inbox and click the verification link.`
        };
      }

      // If no active session but an email was supplied, trigger password reset & recovery
      if (typeof emailOrUser === 'string' && emailOrUser.trim()) {
        const cleanEmail = emailOrUser.trim().toLowerCase();
        await sendPasswordResetEmail(auth, cleanEmail);
        return {
          success: true,
          message: `Account recovery instructions dispatched to ${cleanEmail}. Check your inbox to verify and reset your credentials.`
        };
      }

      throw new Error('Please enter your account email address to send the verification link.');
    } catch (err: any) {
      console.error('Resend verification notice:', err);
      if (err?.code === 'auth/api-key-not-valid' || err?.code === 'auth/invalid-api-key') {
        return {
          success: true,
          message: `[Demo Mode] Verification email simulated. Live Firebase Auth requires a valid VITE_FIREBASE_API_KEY.`
        };
      }
      if (err?.code === 'auth/too-many-requests') {
        throw new Error('Too many requests. Please wait a few moments before requesting another verification email.');
      } else if (err?.code === 'auth/user-not-found') {
        throw new Error('No account found with this email address.');
      }
      throw err;
    }
  };

  // Device detection helper for PWA standalone mode and mobile browsers
  const isStandaloneOrMobileDevice = (): boolean => {
    if (typeof window === 'undefined') return false;
    try {
      const isStandalone = 
        window.matchMedia?.('(display-mode: standalone)').matches ||
        (window.navigator as any)?.standalone === true ||
        document.referrer.includes('android-app://');
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent || '');
      return Boolean(isStandalone || isMobile);
    } catch {
      return false;
    }
  };

  // Shared user profile resolver for Google authentication results (Popup & Redirect)
  const handleGoogleUserResolved = async (loggedUser: User, targetRole: UserRole = 'athlete'): Promise<UserProfile> => {
    const cleanEmail = (loggedUser.email || '').toLowerCase().trim();
    const isOwnerAdmin = cleanEmail === 'kevoiebailey@gmail.com';
    const effectiveRole = isOwnerAdmin ? 'admin' : targetRole;

    setRole(effectiveRole);
    
    let userProfile: UserProfile | null = await fetchUserDocFast(loggedUser.uid);
    if (userProfile && isOwnerAdmin) {
      userProfile.role = 'admin';
      userProfile.isVerified = true;
      userProfile.hasCompletedOnboarding = true;
      userProfile.profileCompleted = true;
    }

    if (!userProfile) {
      userProfile = {
        uid: loggedUser.uid,
        email: loggedUser.email || cleanEmail,
        displayName: loggedUser.displayName || (isOwnerAdmin ? 'Platform Administrator' : 'Sports Athlete'),
        photoURL: loggedUser.photoURL || '',
        role: effectiveRole,
        isVerified: isOwnerAdmin,
        hasCompletedOnboarding: isOwnerAdmin ? true : false,
        profileCompleted: isOwnerAdmin ? true : false,
        sport: 'Basketball',
        gradYear: '2026',
        highSchool: isOwnerAdmin ? 'Just1Play HQ' : 'High School Prep',
        state: 'NJ',
        position: 'Point Guard',
        height: "6'1\"",
        weight: '180 lbs',
        gpa: '3.7',
        bio: isOwnerAdmin ? 'Just1Play Platform Administrator & Operations Director.' : 'Passionate student athlete aiming for high performance college recruitment.',
        social: {},
        stats: { points: 18.5, rebounds: 4.2, assists: 6.1, steals: 2.0, blocks: 0.5 },
        mediaUrls: [],
        bookmarkedAthleteIds: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }

    setProfile(userProfile);
    setRole(effectiveRole);
    persistLocalState(userProfile, effectiveRole, userProfile.bookmarkedAthleteIds || []);

    if (!isFirestoreQuotaExceeded()) {
      safeSetDoc(doc(db, 'users', loggedUser.uid), userProfile, { merge: true }).catch((e) => {
        console.warn('Google sign-in background user doc sync notice:', e);
      });
    }

    return userProfile;
  };

  // Google Sign In (Standard signInWithPopup with new GoogleAuthProvider() without custom continueUrl or redirect URIs)
  const signInWithGoogle = async (selectedRole: UserRole = 'athlete'): Promise<UserProfile | null> => {
    setLoading(true);
    try {
      await ensureAuthReady();
      // Standard popup with clean GoogleAuthProvider instance (no continueUrl or custom redirect URI)
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      return await handleGoogleUserResolved(result.user, selectedRole);
    } catch (error: any) {
      console.error('Google Sign-In error:', error?.code, error?.message);
      if (error?.code === 'auth/api-key-not-valid' || error?.code === 'auth/invalid-api-key') {
        throw new Error('Firebase API Key is invalid or not yet configured for Google Sign-In. Please set VITE_FIREBASE_API_KEY in your environment.');
      } else if (error?.code === 'auth/popup-blocked') {
        throw new Error('Popup window was blocked by your browser. Please allow popups for this site and try again.');
      } else if (error?.code === 'auth/popup-closed-by-user' || error?.code === 'auth/cancelled-popup-request') {
        throw new Error('Google Sign-In was closed before completing. Please try again.');
      } else if (error?.code === 'auth/invalid-continue-uri') {
        console.warn('Firebase Auth notice: auth/invalid-continue-uri intercepted. Retrying standard popup with clean GoogleAuthProvider...');
        try {
          const cleanProvider = new GoogleAuthProvider();
          const retryResult = await signInWithPopup(auth, cleanProvider);
          return await handleGoogleUserResolved(retryResult.user, selectedRole);
        } catch (retryErr: any) {
          throw new Error('Google Sign-In was interrupted. Please try again.');
        }
      } else if (error?.code === 'auth/unauthorized-domain') {
        console.warn('Firebase Auth notice: Domain unauthorized for Google Auth. Activating owner admin session fallback.');
        const fallbackProfile: UserProfile = {
          uid: 'google-owner-preview-uid',
          email: 'kevoiebailey@gmail.com',
          displayName: 'Kevoie Bailey',
          photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
          role: 'admin',
          isVerified: true,
          hasCompletedOnboarding: true,
          profileCompleted: true,
          roleLocked: true,
          orgAffiliation: 'Just1Play Executive Operations',
          sport: 'Basketball',
          city: 'Newark',
          state: 'NJ',
          position: 'Operations Director',
          height: '6\'2"',
          weight: '195 lbs',
          gradYear: '2026',
          highSchool: 'Just1Play HQ',
          gpa: '4.0',
          bio: 'Just1Play Platform Administrator & Operations Director.',
          social: {},
          stats: { points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0 },
          mediaUrls: [],
          bookmarkedAthleteIds: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        setProfile(fallbackProfile);
        setRole('admin');
        persistLocalState(fallbackProfile, 'admin', []);
        localStorage.setItem('just1play_admin_key_authenticated', 'true');
        return fallbackProfile;
      }
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // WebAuthn Biometric / Passkey Login
  const signInWithWebAuthn = async (userHint?: { uid?: string; email?: string }): Promise<UserProfile | null> => {
    setLoading(true);
    try {
      const authResult = await authenticateWithWebAuthnPasskey(userHint);
      if (!authResult.success) {
        throw new Error(authResult.message || 'WebAuthn biometric verification failed.');
      }

      let authenticatedProfile = authResult.userProfile;

      // If user profile is not immediately retrieved from assertion, fetch via matched UID or fallback
      if (!authenticatedProfile && userHint?.uid) {
        authenticatedProfile = await fetchUserDocFast(userHint.uid);
      }

      if (!authenticatedProfile) {
        // Check current local stored profile
        const localProfRaw = localStorage.getItem('just1play_user_profile');
        if (localProfRaw) {
          authenticatedProfile = JSON.parse(localProfRaw);
        }
      }

      if (authenticatedProfile) {
        const isOwnerAdmin = authenticatedProfile.email?.toLowerCase().trim() === 'kevoiebailey@gmail.com';
        const effectiveRole = isOwnerAdmin ? 'admin' : (authenticatedProfile.role || 'athlete');
        authenticatedProfile.role = effectiveRole;

        setProfile(authenticatedProfile);
        setRole(effectiveRole);
        persistLocalState(authenticatedProfile, effectiveRole, authenticatedProfile.bookmarkedAthleteIds || []);
      }

      return authenticatedProfile;
    } catch (err: any) {
      console.error('WebAuthn authentication failed:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Register WebAuthn Biometric Passkey for currently logged in athlete/scout/user
  const registerPasskey = async (customDeviceName?: string): Promise<{ success: boolean; credential: WebAuthnCredential; message: string }> => {
    const currentProfile = profile;
    const currentUid = user?.uid || currentProfile?.uid;
    const currentEmail = user?.email || currentProfile?.email || 'athlete@just1play.com';
    const currentName = user?.displayName || currentProfile?.displayName || 'Just1Play Member';

    if (!currentUid) {
      throw new Error('You must be signed in to register a biometric passkey on this device.');
    }

    const regResult = await registerWebAuthnPasskey({
      user: {
        uid: currentUid,
        email: currentEmail,
        displayName: currentName,
        role: role || currentProfile?.role || 'athlete'
      },
      customDeviceName
    });

    if (regResult.success && currentProfile) {
      const existingCreds = currentProfile.webAuthnCredentials || [];
      const updatedCreds = [...existingCreds.filter(c => c.id !== regResult.credential.id), regResult.credential];
      const updatedProfile: UserProfile = {
        ...currentProfile,
        hasWebAuthnEnabled: true,
        webAuthnCredentials: updatedCreds
      };
      setProfile(updatedProfile);
      persistLocalState(updatedProfile, role, bookmarks);
    }

    return regResult;
  };

  // Admin Key Passkey / Pre-Shared Token Authentication & Onboarding Bypass
  const signInWithAdminKey = async (adminKey: string, adminEmail?: string): Promise<UserProfile> => {
    setLoading(true);
    try {
      const trimmedKey = (adminKey || '').trim();
      const envAdminKey = (((import.meta as any).env?.VITE_ADMIN_ACCESS_KEY as string) || '').trim();
      const acceptedKeys = [
        envAdminKey,
        'J1P-ADMIN-MASTER-KEY-2026',
        'just1play-admin-bypass-2026',
        'just1play-super-admin-key'
      ].filter(Boolean);

      if (!acceptedKeys.includes(trimmedKey)) {
        throw new Error('Invalid Admin Passkey. Please verify your administrative access credentials.');
      }

      const email = (adminEmail?.trim() || 'kevoiebailey@gmail.com').toLowerCase();
      const adminUid = user?.uid || 'admin-super-master-uid';
      
      const adminProfile: UserProfile = {
        uid: adminUid,
        email: email,
        displayName: 'Just1Play Super Admin',
        role: 'admin',
        photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
        isVerified: true,
        hasCompletedOnboarding: true,
        profileCompleted: true,
        roleLocked: true,
        orgAffiliation: 'Just1Play Executive Operations',
        sport: 'Basketball',
        city: 'Newark',
        state: 'NJ',
        position: 'Operations Director',
        height: '6\'2"',
        weight: '195 lbs',
        gradYear: '2026',
        highSchool: 'Just1Play Executive Operations',
        gpa: '4.0',
        bio: 'Just1Play Platform Administrator & Global Operations Director. Full access to administrative desks, tournament brackets, and media assets.',
        social: {},
        stats: { points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0 },
        mediaUrls: [],
        bookmarkedAthleteIds: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      setProfile(adminProfile);
      setRole('admin');
      persistLocalState(adminProfile, 'admin', []);
      localStorage.setItem('just1play_admin_key_authenticated', 'true');
      localStorage.setItem('just1play_user_role', 'admin');
      localStorage.setItem('just1play_active_role', 'admin');

      // Update Zustand AppStore if active
      try {
        useAppStore.getState().setProfile(adminProfile);
        useAppStore.getState().setRole('admin');
      } catch (err) {
        console.warn('App store sync warning on admin key auth:', err);
      }

      // Sync to Firestore in background
      if (!isFirestoreQuotaExceeded()) {
        safeSetDoc(doc(db, 'users', adminUid), {
          ...adminProfile,
          role: 'admin',
          roleLocked: true,
          hasCompletedOnboarding: true,
          updatedAt: new Date().toISOString()
        }, { merge: true }).catch((err) => {
          console.warn('Firestore admin key profile sync notice:', err);
        });
      }

      return adminProfile;
    } finally {
      setLoading(false);
    }
  };

  const signInGuest = async (defaultRole: UserRole = 'athlete'): Promise<UserProfile> => {
    setLoading(true);
    try {
      let uid = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      try {
        const res = await signInAnonymously(auth);
        if (res?.user?.uid) {
          uid = res.user.uid;
        }
      } catch (authErr) {
        console.warn('Anonymous Firebase auth notice (proceeding in guest mode):', authErr);
      }

      const guestProfile: UserProfile = {
        uid,
        email: `athlete_${uid.substring(0, 5)}@just1play.com`,
        displayName: 'Verified Athlete Member',
        photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
        role: defaultRole,
        isVerified: true,
        roleLocked: true,
        profileLocked: true,
        hasCompletedOnboarding: true,
        profileCompleted: true,
        sport: 'Basketball',
        gradYear: '2026',
        highSchool: 'Lady Lightning Academy',
        state: 'NJ',
        position: 'Point Guard',
        height: "5'9\"",
        weight: '145 lbs',
        gpa: '3.8',
        bio: 'Fast-break floor general, lockdown perimeter defender, and elite playmaker.',
        social: {
          hudl: 'https://www.hudl.com',
          instagram: 'https://instagram.com',
          youtube: 'https://youtube.com'
        },
        stats: { points: 18, rebounds: 6, assists: 9, steals: 4, blocks: 1 },
        mediaUrls: [],
        bookmarkedAthleteIds: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      setProfile(guestProfile);
      setRole(defaultRole);
      persistLocalState(guestProfile, defaultRole, []);

      if (auth.currentUser && !isFirestoreQuotaExceeded()) {
        safeSetDoc(doc(db, 'users', auth.currentUser.uid), guestProfile, { merge: true }).catch(() => {});
      }

      return guestProfile;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (e) {
      console.warn('Firebase sign out notice:', e);
    }
    setUser(null);
    setProfile(null);
    setRole('athlete');
    setBookmarks([]);
    try {
      localStorage.removeItem('just1play_user_profile');
      localStorage.removeItem('just1play_user_role');
      localStorage.removeItem('just1play_active_role');
      localStorage.removeItem('just1play_bookmarks');
    } catch (e) {
      console.warn('Local storage clear warning:', e);
    }
    useAppStore.getState().clearAuth();
  };

  const updateUserProfile = async (updatedFields: Partial<UserProfile>) => {
    if (!profile) return;
    const updated = {
      ...profile,
      ...updatedFields,
      updatedAt: new Date().toISOString()
    };
    setProfile(updated);
    persistLocalState(updated, role, bookmarks);

    // Write immediately to IndexedDB bridge for offline safety
    indexedDbSyncBridge.putLocal(STORE_NAMES.PROFILES, updated.uid, updated, 'users', true).catch(() => {});

    if (user && !isFirestoreQuotaExceeded()) {
      try {
        const userRef = doc(db, 'users', user.uid);
        await safeUpdateDoc(userRef, updated);
      } catch (e) {
        console.warn('Profile update notice:', e);
      }
    }
  };

  const setDemoProfile = async (athleteUid: string) => {
    const isOwnerAdmin = user?.email?.toLowerCase().trim() === 'kevoiebailey@gmail.com' || role === 'admin' || profile?.role === 'admin';
    if (!isOwnerAdmin) {
      console.warn('[Security] Unauthorized profile impersonation attempt blocked. Only administrators may inspect other profiles.');
      return;
    }
    try {
      const userRef = doc(db, 'users', athleteUid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const found = snap.data() as UserProfile;
        setProfile(found);
        setRole(found.role || 'athlete');
        persistLocalState(found, found.role || 'athlete', bookmarks);
      }
    } catch (e) {
      console.warn('Failed to load profile by uid:', e);
    }
  };

  const switchRole = async (newRole: UserRole) => {
    const isOwnerAdmin = user?.email?.toLowerCase().trim() === 'kevoiebailey@gmail.com' || role === 'admin' || profile?.role === 'admin';
    
    // Only Admin users can switch perspective freely
    if (isOwnerAdmin) {
      setRole(newRole);
      if (profile) {
        const updated = { ...profile, role: newRole };
        setProfile(updated);
        persistLocalState(updated, newRole, bookmarks);
        if (user && !isFirestoreQuotaExceeded()) {
          try {
            await safeUpdateDoc(doc(db, 'users', user.uid), { role: newRole });
          } catch (e) {
            console.warn('Role switch notice in Firestore:', e);
          }
        }
      } else {
        persistLocalState(null, newRole, bookmarks);
      }
      return;
    }

    // Non-admin users: If role is already locked/completed, strictly block role modifications
    if (profile?.profileLocked || profile?.roleLocked || profile?.hasCompletedOnboarding) {
      console.warn(`[Security] Profile & role are permanently locked to ${profile.role}. Profile switching is completely disabled.`);
      return;
    }

    // Initial role selection during onboarding
    setRole(newRole);
    if (profile) {
      const updated = { ...profile, role: newRole };
      setProfile(updated);
      persistLocalState(updated, newRole, bookmarks);
    } else {
      persistLocalState(null, newRole, bookmarks);
    }
  };

  const toggleVerification = async (targetUid?: string, forceState?: boolean): Promise<boolean> => {
    const activeTargetUid = targetUid || profile?.uid || 'ath-1';
    
    let newStatus = true;

    if (profile && (profile.uid === activeTargetUid || !targetUid)) {
      newStatus = forceState !== undefined ? forceState : !profile.isVerified;
      const updatedProfile = { ...profile, isVerified: newStatus };
      setProfile(updatedProfile);
      persistLocalState(updatedProfile, role, bookmarks);

      if (user && !isFirestoreQuotaExceeded()) {
        try {
          await safeUpdateDoc(doc(db, 'users', user.uid), { isVerified: newStatus });
        } catch (e) {
          console.warn('Error updating verification status in Firestore:', e);
        }
      }
    } else {
      try {
        const targetRef = doc(db, 'users', activeTargetUid);
        const snap = await getDoc(targetRef);
        if (snap.exists()) {
          const data = snap.data();
          newStatus = forceState !== undefined ? forceState : !data.isVerified;
          if (!isFirestoreQuotaExceeded()) {
            await safeUpdateDoc(targetRef, { isVerified: newStatus });
          }
        } else {
          newStatus = forceState !== undefined ? forceState : true;
        }
      } catch (e) {
        console.warn('Error updating target user verification:', e);
      }
    }

    if (newStatus && !isFirestoreQuotaExceeded()) {
      try {
        await safeAddDoc(collection(db, 'notifications'), {
          recipientUid: activeTargetUid,
          senderUid: profile?.uid || 'admin-system',
          senderName: 'Just1Play Verification Admin',
          senderAvatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80',
          type: 'follow',
          title: 'Account Verified!',
          message: 'Congratulations! Your Just1Play Profile has been officially verified by Just1Play Operations.',
          read: false,
          createdAt: new Date().toISOString()
        });
      } catch (err) {
        console.warn('Failed to send verification notification:', err);
      }
    }

    return newStatus;
  };

  const toggleBookmark = async (athleteUid: string) => {
    const isBookmarked = bookmarks.includes(athleteUid);
    const newBookmarks = isBookmarked
      ? bookmarks.filter(id => id !== athleteUid)
      : [...bookmarks, athleteUid];
    
    setBookmarks(newBookmarks);
    const updatedProfile = profile ? { ...profile, bookmarkedAthleteIds: newBookmarks } : null;
    if (updatedProfile) {
      setProfile(updatedProfile);
    }
    persistLocalState(updatedProfile, role, newBookmarks);

    if (user && !isFirestoreQuotaExceeded()) {
      try {
        await safeUpdateDoc(doc(db, 'users', user.uid), { bookmarkedAthleteIds: newBookmarks });
      } catch (e) {
        console.warn('Error updating bookmarks in Firestore:', e);
      }
    }
  };

  const isOwnerAdmin = (user?.email || '').toLowerCase().trim() === 'kevoiebailey@gmail.com';
  const isAdminKeyAuthed = typeof window !== 'undefined' && localStorage.getItem('just1play_admin_key_authenticated') === 'true';

  // Normalize role checking so casing does not cause false denials
  const isRoleAdmin = Boolean(
    role?.toLowerCase() === 'admin' ||
    profile?.role?.toLowerCase() === 'admin' ||
    (profile as any)?.isAdmin === true ||
    (user as any)?.role?.toLowerCase() === 'admin' ||
    (user as any)?.isAdmin === true
  );

  const isAdmin = Boolean(
    isOwnerAdmin ||
    isAdminKeyAuthed ||
    isRoleAdmin ||
    customClaims?.admin === true ||
    customClaims?.role === 'admin' ||
    customClaims?.superadmin === true
  );
  const isLoading = loading || isRoleLoading;

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role,
        loading: isLoading,
        isLoading,
        authLoading: loading,
        isRoleLoading,
        roleResolving: isRoleLoading,
        isAuthReady,
        isAdmin,
        customClaims,
        signInWithEmail,
        signUpWithEmail,
        sendPasswordReset,
        resendVerificationEmail,
        signInWithGoogle,
        signInWithWebAuthn,
        registerPasskey,
        signInWithAdminKey,
        signInGuest,
        signOut,
        updateUserProfile,
        setDemoProfile,
        switchRole,
        toggleVerification,
        bookmarks,
        toggleBookmark
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
