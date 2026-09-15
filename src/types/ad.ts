export type AdPlacementPosition = 
  | 'cinematic-hero'      // Slot A: Premium Cinematic Banner
  | 'bento-square'        // Slot B: Native Bento Ad Square
  | 'native-leaderboard'  // Slot C: Native Leaderboard Ad
  | 'global-footer-banner'// Slot D: Global Fixed Sponsor Banner
  | 'header-leaderboard'
  | 'home-feed'
  | 'events-top'
  | 'tournament-bracket'
  | 'media-hub'
  | 'recruiter-sidebar'
  | 'article-inline'
  | 'footer-wide';

export type AdFormat = 'cinematic' | 'bento' | 'leaderboard' | 'native' | 'fixed-banner' | 'rectangle' | 'badge';

export interface AdCampaign {
  id: string;
  brandName: string;
  contactEmail: string;
  contactPhone?: string;
  websiteUrl: string;
  headline: string;
  subheadline?: string;
  ctaText: string;
  imageUrl: string;
  placementPosition: AdPlacementPosition;
  format: AdFormat;
  targetSport?: string;
  status: 'pending' | 'active' | 'paused' | 'completed' | 'rejected';
  impressions: number;
  clicks: number;
  startDate: string;
  endDate: string;
  budget: number;
  tier: 'Starter Local' | 'Regional MVP' | 'Headline Partner' | 'Custom';
  additionalImages?: string[];
  enableRandomRotation?: boolean;
  createdAt: string;
  creatorUid?: string;
}

export interface AdPackageTier {
  id: string;
  name: string;
  price: number;
  period: 'week' | 'month' | 'season';
  estImpressions: string;
  features: string[];
  recommendedFor: string;
  badge?: string;
  color: string;
}
