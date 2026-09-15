import { UserRole } from '../../types/platform';

export type LockerRoomTab = 'hype' | 'chill';

export const EXPANDED_SPORT_CATEGORIES = [
  '🏈 Football',
  '⚡ Girls Flag Football',
  '🏀 Basketball',
  '⚾ Baseball',
  '🥎 Softball',
  '⚽ Soccer',
  '🥍 Lacrosse',
  '🏒 Ice Hockey',
  '🏑 Field Hockey',
  '🎀 Cheer & Dance',
  '🤼 Wrestling & Combat',
  '🏊 Swimming & Diving',
  '🏃 Track & Field / XC',
  '🏐 Volleyball',
  '⛳ Golf',
  '🎾 Tennis'
] as const;

export type SportCategory = 'All' | typeof EXPANDED_SPORT_CATEGORIES[number] | string;

export type FeedFilterType = 'all' | 'reels' | 'photos' | 'highlights';

export interface PostMetrics {
  fortyYard?: string;
  vertical?: string;
  gpa?: string;
  height?: string;
  weight?: string;
  verified?: boolean;
}

export type ReactionType = 'hype' | 'sauce' | 'clutch' | 'bigW';

export interface ReactionCounts {
  hype: number;
  sauce: number;
  clutch: number;
  bigW: number;
}

export interface LockerPost {
  id: string;
  feedType: 'video' | 'lounge';
  sport: string;
  caption: string;
  videoUrl?: string;
  imageUrl?: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  authorRole: UserRole | string;
  authorSport?: string;
  authorSchool?: string;
  authorClassYear?: string;
  isVerifiedRecruit?: boolean;
  metrics?: PostMetrics;
  reactions: ReactionCounts;
  userReactions?: Record<string, ReactionType>; // userId -> ReactionType
  commentsCount: number;
  createdAt: any;
}

export interface LockerComment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  authorRole: string;
  text: string;
  createdAt: any;
}
