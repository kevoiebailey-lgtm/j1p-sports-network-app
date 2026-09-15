/**
 * Just1Play User & Vault Ledger Types
 */

import { UserProfile, UserPurchase } from '../types';
import { UserPurchaseItem } from './orders';

export type { UserProfile, UserPurchase };

export interface UserPurchasesLedger {
  uid: string;
  purchases: UserPurchaseItem[];
  totalSpent: number;
  lastPurchaseDate?: string;
}

export interface UserPurchasedPhotoRef {
  photoId: string;
  orderId: string;
  galleryId?: string;
  downloadUrl: string;
  unlockedAt: any;
  title?: string;
}

export interface UserWithPurchases extends UserProfile {
  purchases?: UserPurchase[];
  purchasedPhotos?: Record<string, boolean>;
}
