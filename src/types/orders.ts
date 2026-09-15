/**
 * Just1Play Order & Purchase Ledger Types
 * Handles PayPal captures, order records in /orders/{orderId}, and user purchase records.
 */

export interface OrderRecord {
  id: string; // Document ID (orderId)
  orderId: string;
  buyerUid: string;
  buyerEmail?: string;
  buyerName?: string;
  galleryId: string;
  photoId?: string;
  amount: number;
  currency: string;
  itemTitle: string;
  unwatermarkedUrl: string;
  thumbnailUrl?: string;
  storageFilePath?: string;
  timestamp: any;
  createdAt?: any;
  status: 'COMPLETED' | 'PENDING' | 'REFUNDED' | 'FAILED';
  paymentProcessor: 'paypal';
  captureId?: string;
  unlockedPhotoIds?: string[];
  mediaType?: 'photo' | 'album' | 'video_reel' | 'raw_tape';
  resolution?: string;
  licenseType?: 'standard_personal' | 'commercial_print' | 'event_bundle';
  creatorUid?: string;
  creatorPayout?: number;
  platformFee?: number;
  metadata?: Record<string, any>;
}

export interface UserPurchaseItem {
  id: string; // Purchase or Order ID
  orderId: string;
  buyerUid: string;
  galleryId: string;
  photoId?: string;
  itemTitle: string;
  amount: number;
  currency: string;
  unwatermarkedUrl: string;
  thumbnailUrl?: string;
  mediaType: 'photo' | 'album' | 'video_reel' | 'raw_tape';
  resolution?: string;
  timestamp: any;
  purchasedAt: string;
  captureId?: string;
  status: 'COMPLETED' | 'PENDING' | 'REFUNDED' | 'FAILED';
  unlockedPhotoIds?: string[];
  photographerName?: string;
  eventName?: string;
  eventDate?: string;
  venue?: string;
  downloadCount?: number;
}

export interface PayPalCaptureSuccessPayload {
  orderId: string;
  captureId: string;
  buyerUid: string;
  buyerEmail?: string;
  buyerName?: string;
  galleryId: string;
  photoId?: string;
  amount: number;
  itemTitle: string;
  unwatermarkedUrl: string;
  thumbnailUrl?: string;
  mediaType?: 'photo' | 'album' | 'video_reel' | 'raw_tape';
  resolution?: string;
  unlockedPhotoIds?: string[];
}
