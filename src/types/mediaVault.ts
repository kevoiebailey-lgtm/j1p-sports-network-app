import { VideoType } from '../lib/videoEmbedUtils';

export type MediaVaultType = 'all' | 'photo' | 'video_reel' | 'raw_tape';

export interface TaggedAthlete {
  id?: string;
  name: string;
  avatar: string;
  school: string;
  gradYear: string;
  position: string;
  sport: string;
}

export interface CameraExif {
  camera: string;
  lens: string;
  shutter: string;
  iso: string;
  aperture: string;
}

export interface MediaVaultItem {
  id: string;
  type: 'photo' | 'video_reel' | 'raw_tape';
  title: string;
  description: string;
  sport: string;
  eventName: string;
  eventDate: string;
  mediaUrl: string;
  thumbnailUrl: string;
  watermarkPreviewUrl?: string;
  highResDownloadUrl?: string;
  storagePath?: string;
  eventId?: string;
  resolution: string; // e.g. "24.2 MP RAW", "4K UHD 60fps", "1080p 120fps"
  price: number; // e.g. 4.99, 9.99, 14.99
  venue: string;
  opponents?: string;
  photographer?: string;
  cameraExif?: CameraExif;
  taggedAthletes: TaggedAthlete[];
  duration?: string; // For video/tape
  isPurchased?: boolean;
  isPinnedToProfile?: boolean;
  viewCount: number;
  likesCount: number;
  ratingScore: number;
  isOfficial?: boolean;
  isMemberSubmission?: boolean;
  videoType?: VideoType;
  embedUrl?: string;
  platformName?: string;
  createdAt: string;
}

export interface DigitalPurchaseOrder {
  id: string;
  mediaId: string;
  mediaTitle: string;
  mediaType: 'photo' | 'video_reel' | 'raw_tape';
  thumbnailUrl: string;
  tier: 'web_license' | 'commercial_print' | 'event_bundle';
  tierName: string;
  amount: number;
  buyerUid?: string;
  buyerName: string;
  buyerEmail: string;
  paymentMethod: 'card' | 'apple_pay' | 'google_pay';
  purchasedAt: string;
  downloadUrl: string;
  licenseKey: string;
}
