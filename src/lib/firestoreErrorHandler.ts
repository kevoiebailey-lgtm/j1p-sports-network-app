import { getAuth } from 'firebase/auth';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType | string;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown, 
  operationType: OperationType | string = OperationType.WRITE, 
  path: string | null = null
): never {
  let authInfoSafe: FirestoreErrorInfo['authInfo'] = {
    userId: null,
    email: null,
    emailVerified: null,
    isAnonymous: null,
    tenantId: null,
    providerInfo: []
  };

  try {
    const currentAuth = getAuth();
    if (currentAuth && currentAuth.currentUser) {
      authInfoSafe = {
        userId: currentAuth.currentUser.uid || null,
        email: currentAuth.currentUser.email || null,
        emailVerified: typeof currentAuth.currentUser.emailVerified === 'boolean' ? currentAuth.currentUser.emailVerified : null,
        isAnonymous: typeof currentAuth.currentUser.isAnonymous === 'boolean' ? currentAuth.currentUser.isAnonymous : null,
        tenantId: currentAuth.currentUser.tenantId || null,
        providerInfo: Array.isArray(currentAuth.currentUser.providerData)
          ? currentAuth.currentUser.providerData.map(provider => ({
              providerId: provider?.providerId || null,
              email: provider?.email || null,
            }))
          : []
      };
    }
  } catch {
    // Auth context unavailable or during initial bootstrapping
  }

  const errorMessage = error instanceof Error 
    ? error.message 
    : (typeof error === 'object' && error !== null && 'message' in error) 
      ? String((error as any).message) 
      : String(error || 'Unknown Firestore error');

  const errInfo: FirestoreErrorInfo = {
    error: errorMessage,
    authInfo: authInfoSafe,
    operationType,
    path: path || 'unknown'
  };
  
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
