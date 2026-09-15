import { WebAuthnCredential, UserProfile, UserRole } from '../types';
import { db, auth } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { safeUpdateDoc, safeSetDoc } from '../lib/firestoreQuotaGuard';

const STORAGE_DEVICE_PASSKEYS_PREFIX = 'just1play_webauthn_passkeys_';
const STORAGE_LAST_PASSKEY_USER = 'just1play_webauthn_last_user';

// ==========================================
// Base64URL Encoding & Decoding Helpers
// ==========================================

export function bufferToBase64URL(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function base64URLToBuffer(base64url: string): Uint8Array {
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    bytes[i] = raw.charCodeAt(i);
  }
  return bytes;
}

// ==========================================
// Device & Biometric Feature Detection
// ==========================================

export async function isWebAuthnSupported(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    if (!window.PublicKeyCredential || !navigator.credentials) {
      return false;
    }
    // Check if platform authenticator (TouchID, FaceID, Windows Hello, Android Biometrics) is available
    if (typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function') {
      const isAvailable = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      return Boolean(isAvailable);
    }
    return true;
  } catch (e) {
    console.warn('[WebAuthn] Detection check failed:', e);
    return false;
  }
}

export function getDeviceBiometricLabel(): { name: string; type: WebAuthnCredential['deviceType'] } {
  if (typeof window === 'undefined') return { name: 'Device Passkey', type: 'passkey' };
  
  const ua = navigator.userAgent || '';
  const platform = navigator.platform || '';

  if (/iPhone|iPad|iPod/.test(ua)) {
    return { name: 'Apple Face ID / Touch ID', type: 'face_id' };
  }
  if (/Mac/.test(platform) || /Macintosh/.test(ua)) {
    return { name: 'Mac Touch ID', type: 'touch_id' };
  }
  if (/Android/.test(ua)) {
    return { name: 'Android Biometrics', type: 'android_biometric' };
  }
  if (/Win/.test(platform) || /Windows/.test(ua)) {
    return { name: 'Windows Hello', type: 'windows_hello' };
  }

  return { name: 'Device Biometric Passkey', type: 'passkey' };
}

// ==========================================
// Stored Credentials Management
// ==========================================

export function getStoredDeviceCredentials(uid?: string): WebAuthnCredential[] {
  if (typeof window === 'undefined') return [];
  try {
    const key = uid ? `${STORAGE_DEVICE_PASSKEYS_PREFIX}${uid}` : STORAGE_DEVICE_PASSKEYS_PREFIX + 'all';
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    return JSON.parse(raw) as WebAuthnCredential[];
  } catch (e) {
    console.warn('[WebAuthn] Failed to read stored passkeys:', e);
    return [];
  }
}

export function saveStoredDeviceCredential(credential: WebAuthnCredential, uid: string, email?: string): void {
  if (typeof window === 'undefined') return;
  try {
    // 1. Save user specific
    const userKey = `${STORAGE_DEVICE_PASSKEYS_PREFIX}${uid}`;
    const userCreds = getStoredDeviceCredentials(uid).filter(c => c.id !== credential.id);
    userCreds.push(credential);
    localStorage.setItem(userKey, JSON.stringify(userCreds));

    // 2. Save global device registry for instant 1-tap resolution
    const globalKey = STORAGE_DEVICE_PASSKEYS_PREFIX + 'all';
    const allCreds = getStoredDeviceCredentials().filter(c => c.id !== credential.id);
    allCreds.push(credential);
    localStorage.setItem(globalKey, JSON.stringify(allCreds));

    // 3. Record last passkey user metadata
    localStorage.setItem(STORAGE_LAST_PASSKEY_USER, JSON.stringify({
      uid,
      email: email || '',
      deviceName: credential.deviceName,
      updatedAt: new Date().toISOString()
    }));
  } catch (e) {
    console.warn('[WebAuthn] Failed to save passkey locally:', e);
  }
}

export function removeStoredDeviceCredential(credentialId: string, uid?: string): void {
  if (typeof window === 'undefined') return;
  try {
    if (uid) {
      const userKey = `${STORAGE_DEVICE_PASSKEYS_PREFIX}${uid}`;
      const userCreds = getStoredDeviceCredentials(uid).filter(c => c.id !== credentialId);
      localStorage.setItem(userKey, JSON.stringify(userCreds));
    }
    const globalKey = STORAGE_DEVICE_PASSKEYS_PREFIX + 'all';
    const allCreds = getStoredDeviceCredentials().filter(c => c.id !== credentialId);
    localStorage.setItem(globalKey, JSON.stringify(allCreds));
  } catch (e) {
    console.warn('[WebAuthn] Failed to remove passkey locally:', e);
  }
}

export function getLastPasskeyUser(): { uid: string; email: string; deviceName: string } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_LAST_PASSKEY_USER);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// ==========================================
// WebAuthn Registration (Passkey Enrollment)
// ==========================================

export interface RegisterPasskeyOptions {
  user: {
    uid: string;
    email: string;
    displayName: string;
    role?: UserRole;
  };
  customDeviceName?: string;
}

export async function registerWebAuthnPasskey(
  options: RegisterPasskeyOptions
): Promise<{ success: boolean; credential: WebAuthnCredential; message: string }> {
  if (!navigator.credentials || !window.PublicKeyCredential) {
    throw new Error('WebAuthn is not supported in this browser environment.');
  }

  const { user, customDeviceName } = options;
  const challenge = window.crypto.getRandomValues(new Uint8Array(32));
  const userIdBytes = new TextEncoder().encode(user.uid);
  const biometricInfo = getDeviceBiometricLabel();
  const deviceName = customDeviceName || biometricInfo.name;

  const creationOptions: CredentialCreationOptions = {
    publicKey: {
      challenge,
      rp: {
        name: 'Just1Play Athletic Network',
        id: window.location.hostname === 'localhost' ? 'localhost' : window.location.hostname
      },
      user: {
        id: userIdBytes,
        name: user.email || `athlete_${user.uid.slice(0, 6)}@just1play.com`,
        displayName: user.displayName || 'Just1Play Athlete / Scout'
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' },  // ES256 (ECDSA)
        { alg: -257, type: 'public-key' } // RS256 (RSA)
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'preferred',
        residentKey: 'preferred',
        requireResidentKey: false
      },
      timeout: 60000,
      attestation: 'none'
    }
  };

  try {
    const credential = (await navigator.credentials.create(creationOptions)) as PublicKeyCredential | null;

    if (!credential) {
      throw new Error('Biometric credential enrollment was cancelled or produced an empty response.');
    }

    const rawIdBase64 = bufferToBase64URL(credential.rawId);
    const credRecord: WebAuthnCredential = {
      id: credential.id,
      rawId: rawIdBase64,
      deviceName,
      deviceType: biometricInfo.type,
      createdAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString()
    };

    // 1. Save to browser device cache
    saveStoredDeviceCredential(credRecord, user.uid, user.email);

    // 2. Persist to Firestore user document
    try {
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      const currentData = userSnap.exists() ? (userSnap.data() as UserProfile) : null;
      const currentCreds = currentData?.webAuthnCredentials || [];
      const updatedCreds = [...currentCreds.filter(c => c.id !== credRecord.id), credRecord];

      await safeUpdateDoc(userRef, {
        webAuthnCredentials: updatedCreds,
        hasWebAuthnEnabled: true,
        updatedAt: new Date().toISOString()
      });
    } catch (firestoreErr) {
      console.warn('[WebAuthn] Notice: Could not sync passkey to Firestore doc immediately, saved to local passkey store:', firestoreErr);
    }

    return {
      success: true,
      credential: credRecord,
      message: `${biometricInfo.name} successfully registered for this device!`
    };
  } catch (err: any) {
    console.error('[WebAuthn] Registration error:', err);
    if (err.name === 'NotAllowedError') {
      throw new Error('Biometric registration was cancelled or timed out on your device.');
    }
    if (err.name === 'InvalidStateError') {
      throw new Error('This device is already registered with a passkey for this account.');
    }
    throw new Error(err.message || 'Failed to register biometric passkey.');
  }
}

// ==========================================
// WebAuthn Authentication (Biometric Login)
// ==========================================

export interface AuthenticatePasskeyResult {
  success: boolean;
  credentialId: string;
  userProfile: UserProfile | null;
  message: string;
}

export async function authenticateWithWebAuthnPasskey(
  userHint?: { uid?: string; email?: string }
): Promise<AuthenticatePasskeyResult> {
  if (!navigator.credentials || !window.PublicKeyCredential) {
    throw new Error('WebAuthn biometrics are not supported on this browser.');
  }

  // 1. Determine allowed credentials
  let allowCredentials: PublicKeyCredentialDescriptor[] | undefined = undefined;
  const targetUid = userHint?.uid || getLastPasskeyUser()?.uid;

  if (targetUid) {
    const localCreds = getStoredDeviceCredentials(targetUid);
    if (localCreds.length > 0) {
      allowCredentials = localCreds.map(c => ({
        id: base64URLToBuffer(c.rawId || c.id),
        type: 'public-key' as const,
        transports: ['internal']
      }));
    }
  }

  const challenge = window.crypto.getRandomValues(new Uint8Array(32));

  const requestOptions: CredentialRequestOptions = {
    publicKey: {
      challenge,
      rpId: window.location.hostname === 'localhost' ? 'localhost' : window.location.hostname,
      userVerification: 'preferred',
      timeout: 60000,
      ...(allowCredentials && allowCredentials.length > 0 ? { allowCredentials } : {})
    }
  };

  try {
    const assertion = (await navigator.credentials.get(requestOptions)) as PublicKeyCredential | null;

    if (!assertion) {
      throw new Error('Biometric authentication returned no credential response.');
    }

    const credentialId = assertion.id;

    // Resolve which user owns this credential
    let matchedUid: string | null = targetUid || null;
    let matchedProfile: UserProfile | null = null;

    // Check device store
    const allStored = getStoredDeviceCredentials();
    const matchedStored = allStored.find(c => c.id === credentialId);

    if (matchedStored && !matchedUid) {
      const lastUser = getLastPasskeyUser();
      if (lastUser) matchedUid = lastUser.uid;
    }

    // Try fetching profile from Firestore or local cache
    if (matchedUid) {
      try {
        const userDocRef = doc(db, 'users', matchedUid);
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
          matchedProfile = userSnap.data() as UserProfile;
          
          // Update last used biometric login timestamp
          safeUpdateDoc(userDocRef, {
            lastBiometricLoginAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }).catch(e => console.warn('[WebAuthn] Update timestamp notice:', e));
        }
      } catch (e) {
        console.warn('[WebAuthn] Firestore user profile fetch notice:', e);
      }
    }

    // Fallback: Check localStorage user profile
    if (!matchedProfile && typeof window !== 'undefined') {
      try {
        const localProfRaw = localStorage.getItem('just1play_user_profile');
        if (localProfRaw) {
          matchedProfile = JSON.parse(localProfRaw);
        }
      } catch {
        // Ignore
      }
    }

    return {
      success: true,
      credentialId,
      userProfile: matchedProfile,
      message: 'Biometric authentication verified successfully.'
    };
  } catch (err: any) {
    console.error('[WebAuthn] Authentication error:', err);
    if (err.name === 'NotAllowedError') {
      throw new Error('Biometric verification cancelled or biometric hardware did not recognize identity.');
    }
    throw new Error(err.message || 'Biometric authentication failed.');
  }
}
