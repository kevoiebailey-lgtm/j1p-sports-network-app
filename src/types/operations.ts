/**
 * Just1Play Operations Hub & Multi-Role CRM Alternative Types
 * Encompasses Media Sales Fulfillment, Creator Monetization, and Event Coordinator Live Ops.
 */

export type RegistrationFeeStatus = 'PAID' | 'PENDING' | 'WAIVED';

export interface TeamRosterAthlete {
  id: string;
  athleteUid?: string;
  name: string;
  jerseyNumber: string;
  position: string;
  gradYear?: string;
  waiverSigned: boolean;
  medicalClearance?: boolean;
}

export interface TeamCheckInRecord {
  teamId: string;
  eventId: string;
  eventName: string;
  teamName: string;
  division: string; // e.g. "18U Premier", "15U Gold", "12U Open", "Varsity"
  headCoach: string;
  coachEmail: string;
  coachPhone: string;
  rosterCount: number;
  feeStatus: RegistrationFeeStatus;
  amountPaid: number;
  totalFee: number;
  rosterLocked: boolean;
  checkedIn: boolean;
  checkedInAt?: string;
  checkedInBy?: string;
  notes?: string;
  roster?: TeamRosterAthlete[];
  updatedAt?: any;
}

export interface EventOperationsSummary {
  eventId: string;
  eventName: string;
  location: string;
  eventDate: string;
  totalTeams: number;
  checkedInTeams: number;
  rostersLockedCount: number;
  totalFeesExpected: number;
  totalFeesCollected: number;
  pendingFeesCount: number;
  globalRosterLocked: boolean;
}

export interface CreatorGalleryRule {
  galleryId: string;
  galleryTitle: string;
  coverUrl?: string;
  photoPrice: number;
  albumPrice: number;
  videoReelPrice?: number;
  watermarkEnabled?: boolean;
  watermarkStyle: 'shield_center' | 'diagonal_text' | 'corner_badge' | 'heavy_pattern';
  customWatermarkText: string;
  isLockedForSales: boolean;
  totalSalesCount: number;
  totalRevenue: number;
  updatedAt?: any;
}

export interface CreatorEarningsMetrics {
  creatorUid: string;
  grossSales: number;
  platformSplitPercent: number; // e.g. 15 for 15%
  platformFeeAmount: number;
  netAvailableBalance: number;
  pendingPayout: number;
  lifetimePaidOut: number;
  salesCount: number;
  activeGalleriesCount: number;
}

export interface CreatorItemizedSale {
  id: string;
  orderId: string;
  photoId?: string;
  galleryId: string;
  galleryTitle: string;
  itemTitle: string;
  thumbnailUrl?: string;
  buyerUid: string;
  buyerName: string;
  buyerEmail: string;
  grossAmount: number;
  creatorPayout: number;
  platformFee: number;
  currency: string;
  timestamp: string;
  status: 'COMPLETED' | 'PENDING' | 'REFUNDED';
}
