import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  User,
  UserCredential
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
  DocumentData
} from 'firebase/firestore';
import { auth, db, ensureAuthReady } from '../lib/firebase';
import { UserProfile, UserRole } from '../types';

export interface SignUpMemberParams {
  email: string;
  password: string;
  name?: string;
  displayName?: string;
  role?: UserRole | string;
}

export interface RegisterUserParams {
  email: string;
  password: string;
  displayName?: string;
  name?: string;
  role?: UserRole | string;
  photoURL?: string;
}

export interface AuthMemberResult {
  user: User;
  profile: UserProfile;
}

/**
 * Standard Firestore User Document Interface following Just1Play Security & Data Contract
 */
export interface FirestoreMemberDoc {
  uid: string;
  email: string;
  displayName: string;
  role: string;
  createdAt: any;
  authProvider: 'password' | 'google.com' | 'apple.com' | 'phone';
  photoURL?: string;
  isVerified?: boolean;
  hasCompletedOnboarding?: boolean;
  profileCompleted?: boolean;
  sport?: string;
  gradYear?: string;
  highSchool?: string;
  state?: string;
  position?: string;
  height?: string;
  weight?: string;
  gpa?: string;
  bio?: string;
  social?: Record<string, string>;
  stats?: Record<string, number>;
  mediaUrls?: string[];
  bookmarkedAthleteIds?: string[];
  updatedAt?: any;
}

/**
 * Unified Authentication Handler for Just1Play
 * 
 * Integrates:
 * 1. createUserWithEmailAndPassword(auth, email, password)
 * 2. updateProfile(user, { displayName, ... })
 * 3. Immediately creates corresponding Firestore profile document at '/users/${user.uid}' with standard metadata
 *
 * Supports both object parameter and positional argument calls:
 * - registerUserWithProfile({ email, password, displayName, role })
 * - registerUserWithProfile(email, password, displayName, role)
 */
export async function registerUserWithProfile(
  paramsOrEmail: RegisterUserParams | string,
  maybePassword?: string,
  maybeDisplayName?: string,
  maybeRole?: UserRole | string
): Promise<AuthMemberResult> {
  let email = '';
  let password = '';
  let displayName = '';
  let role: UserRole | string = 'member';
  let photoURL = '';

  if (typeof paramsOrEmail === 'string') {
    email = paramsOrEmail;
    password = maybePassword || '';
    displayName = maybeDisplayName || '';
    role = maybeRole || 'member';
  } else if (paramsOrEmail && typeof paramsOrEmail === 'object') {
    email = paramsOrEmail.email || '';
    password = paramsOrEmail.password || '';
    displayName = paramsOrEmail.displayName || paramsOrEmail.name || '';
    role = paramsOrEmail.role || 'member';
    photoURL = paramsOrEmail.photoURL || '';
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanName = displayName ? displayName.trim() : (cleanEmail.split('@')[0] || 'Member');

  if (!cleanEmail) {
    throw new Error('Please enter a valid email address.');
  }
  if (!password || password.length < 6) {
    throw new Error('Password must be at least 6 characters long.');
  }

  // Ensure Firebase Auth client and persistence are initialized before dispatching
  await ensureAuthReady();

  // 1. Create user account in Firebase Authentication
  const userCredential: UserCredential = await createUserWithEmailAndPassword(
    auth,
    cleanEmail,
    password
  );
  const user = userCredential.user;

  // 2. Update Firebase Auth display name and optional photoURL
  if (auth.currentUser) {
    try {
      await updateProfile(auth.currentUser, {
        displayName: cleanName,
        ...(photoURL ? { photoURL } : {})
      });
    } catch (profileErr) {
      console.warn('[authService] Warning updating Firebase Auth displayName:', profileErr);
    }
  }

  const isOwnerAdmin = cleanEmail === 'kevoiebailey@gmail.com';
  const assignedRole = isOwnerAdmin ? 'admin' : (role || 'member');

  // 3. Immediately create corresponding Firestore profile document at '/users/${user.uid}' with standard metadata
  const userDocRef = doc(db, 'users', user.uid);
  const initialFirestoreData: FirestoreMemberDoc = {
    uid: user.uid,
    email: user.email || cleanEmail,
    displayName: cleanName,
    role: assignedRole,
    createdAt: serverTimestamp(),
    authProvider: 'password',
    photoURL: photoURL || user.photoURL || '',
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
    bio: isOwnerAdmin
      ? 'Just1Play Platform Administrator & Operations Director.'
      : 'Registered member on Just1Play.',
    social: {},
    stats: { points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0 },
    mediaUrls: [],
    bookmarkedAthleteIds: [],
    updatedAt: serverTimestamp()
  };

  try {
    await setDoc(userDocRef, initialFirestoreData, { merge: true });
  } catch (firestoreErr) {
    console.error('[authService] Error writing user document to Firestore /users/${user.uid}:', firestoreErr);
  }

  // Return formatted UserProfile for immediate client-side store and state synchronization
  const resolvedProfile: UserProfile = {
    uid: user.uid,
    email: user.email || cleanEmail,
    displayName: cleanName,
    role: assignedRole as UserRole,
    photoURL: photoURL || user.photoURL || '',
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
    bio: isOwnerAdmin
      ? 'Just1Play Platform Administrator & Operations Director.'
      : 'Registered member on Just1Play.',
    social: {},
    stats: { points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0 },
    mediaUrls: [],
    bookmarkedAthleteIds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  return {
    user,
    profile: resolvedProfile
  };
}

/**
 * Aliases for backwards compatibility and clarity across the codebase
 */
export const unifiedAuthSignUpHandler = registerUserWithProfile;
export const signUpMember = registerUserWithProfile;


/**
 * Authenticates an existing member via Firebase Auth and retrieves their Firestore profile.
 *
 * Requirements:
 * 1. Uses signInWithEmailAndPassword(auth, email, password)
 * 2. Fetches /users/${user.uid} or provisions default document if missing
 */
export async function signInMember(email: string, pass: string): Promise<AuthMemberResult> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) {
    throw new Error('Please enter a valid email address.');
  }
  if (!pass) {
    throw new Error('Please enter your password.');
  }

  await ensureAuthReady();

  // 1. Authenticate with Firebase Auth
  const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, pass);
  const user = userCredential.user;
  const isOwnerAdmin = cleanEmail === 'kevoiebailey@gmail.com';

  // 2. Fetch or initialize Cloud Firestore profile document
  const userDocRef = doc(db, 'users', user.uid);
  let userProfile: UserProfile | null = null;

  try {
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      const data = snap.data();
      userProfile = {
        uid: user.uid,
        email: data.email || user.email || cleanEmail,
        displayName: data.displayName || user.displayName || cleanEmail.split('@')[0],
        role: isOwnerAdmin ? 'admin' : (data.role || 'member'),
        photoURL: data.photoURL || user.photoURL || '',
        isVerified: isOwnerAdmin ? true : Boolean(data.isVerified),
        hasCompletedOnboarding: isOwnerAdmin ? true : Boolean(data.hasCompletedOnboarding),
        profileCompleted: isOwnerAdmin ? true : Boolean(data.profileCompleted),
        sport: data.sport || 'Basketball',
        gradYear: data.gradYear || '2026',
        highSchool: data.highSchool || '',
        state: data.state || 'NJ',
        position: data.position || '',
        height: data.height || '',
        weight: data.weight || '',
        gpa: data.gpa || '',
        bio: data.bio || '',
        social: data.social || {},
        stats: data.stats || { points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0 },
        mediaUrls: data.mediaUrls || [],
        bookmarkedAthleteIds: data.bookmarkedAthleteIds || [],
        createdAt: data.createdAt ? (typeof data.createdAt.toDate === 'function' ? data.createdAt.toDate().toISOString() : String(data.createdAt)) : new Date().toISOString(),
        updatedAt: data.updatedAt ? (typeof data.updatedAt.toDate === 'function' ? data.updatedAt.toDate().toISOString() : String(data.updatedAt)) : new Date().toISOString()
      };
    }
  } catch (readErr) {
    console.warn('[authService] Notice reading profile from Firestore during signIn:', readErr);
  }

  // If no document exists yet, create and merge standard default document
  if (!userProfile) {
    const defaultData: FirestoreMemberDoc = {
      uid: user.uid,
      email: user.email || cleanEmail,
      displayName: user.displayName || cleanEmail.split('@')[0] || 'Member',
      role: isOwnerAdmin ? 'admin' : 'member',
      createdAt: serverTimestamp(),
      authProvider: 'password',
      photoURL: user.photoURL || '',
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
      bio: isOwnerAdmin
        ? 'Just1Play Platform Administrator & Operations Director.'
        : 'Registered member on Just1Play.',
      social: {},
      updatedAt: serverTimestamp()
    };

    try {
      await setDoc(userDocRef, defaultData, { merge: true });
    } catch (createErr) {
      console.warn('[authService] Notice writing default profile to Firestore during signIn:', createErr);
    }

    userProfile = {
      uid: user.uid,
      email: user.email || cleanEmail,
      displayName: user.displayName || cleanEmail.split('@')[0] || 'Member',
      role: (isOwnerAdmin ? 'admin' : 'member') as UserRole,
      photoURL: user.photoURL || '',
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
      bio: isOwnerAdmin
        ? 'Just1Play Platform Administrator & Operations Director.'
        : 'Registered member on Just1Play.',
      social: {},
      stats: { points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0 },
      mediaUrls: [],
      bookmarkedAthleteIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  return {
    user,
    profile: userProfile
  };
}

/**
 * Updates the active user's display name across Firebase Auth and Firestore.
 */
export async function updateUserDisplayName(displayName: string): Promise<void> {
  const cleanName = displayName.trim();
  if (!cleanName) return;

  if (auth.currentUser) {
    await updateProfile(auth.currentUser, { displayName: cleanName });
    const userDocRef = doc(db, 'users', auth.currentUser.uid);
    await setDoc(userDocRef, { displayName: cleanName, updatedAt: serverTimestamp() }, { merge: true });
  }
}
