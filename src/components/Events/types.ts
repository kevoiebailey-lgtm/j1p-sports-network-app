export type EventCategoryType = 
  | 'All'
  | 'Combine'
  | 'Camp'
  | 'Showcase'
  | 'Media Day'
  | 'Clinic'
  | 'Tournament'
  | 'Matchup';

export interface EventScheduleItem {
  time: string;
  title: string;
  desc?: string;
  divisionId?: string;
  divisionName?: string;
}

export interface EventDivision {
  id: string;
  name: string; // e.g. "14U", "17U", "14U Girls", "17U Elite"
  format: '5v5 Flag' | '7v7' | 'Non-Contact' | string;
  teamLimit: number;
  registeredCount?: number;
}

export type StaffRole = 
  | 'Head Coach' 
  | 'Assistant Coach' 
  | 'Official / Referee' 
  | 'Field Marshall' 
  | string;

export interface EventStaffMember {
  id?: string;
  userId?: string;
  name: string;
  email?: string;
  role: StaffRole;
  divisionId?: string;
  divisionName?: string;
  teamName?: string;
  status: 'confirmed' | 'pending';
  avatarUrl?: string;
  assignedAt?: string;
}

export interface EventCoachStaff {
  name: string;
  title: string;
  schoolOrg?: string;
  avatarUrl?: string;
}

export interface EventAttendee {
  uid: string;
  name: string;
  email?: string;
  avatar?: string;
  role?: string;
  sport?: string;
  classYear?: string;
  school?: string;
  position?: string;
  registeredAt: string;
  paidAmount?: number;
  ticketType?: string;
  divisionId?: string;
  divisionName?: string;
}

export interface ShowcaseEvent {
  id: string;
  title: string;
  sport: string;
  category: EventCategoryType;
  eventType?: string;
  date: string;          // e.g. "2026-08-25"
  startDate?: string;     // e.g. "2026-08-25"
  endDate?: string;      // e.g. "2026-08-26"
  time: string;          // e.g. "09:00 AM - 03:00 PM"
  location: string;      // e.g. "MetLife Stadium Performance Center, East Rutherford, NJ"
  venueName: string;
  address: string;
  city: string;
  state: string;
  zip?: string;
  description: string;
  organizer: string;
  hostId?: string;
  hostName?: string;
  hostEmail?: string;
  hostAvatar?: string;
  hostBio?: string;
  hostRole?: string;
  isVerifiedHost?: boolean;
  capacity: number;
  registeredUserIds: string[];
  attendees?: EventAttendee[];
  price: number;         // 0 for Free RSVP
  bannerUrl: string;
  flyerUrl?: string;
  coverUrl?: string;
  thumbnailUrl?: string;
  aspectRatio?: 'banner' | 'flyer' | 'auto';
  isFeatured?: boolean;
  homeTeam?: string;
  awayTeam?: string;
  homeScore?: number | null;
  awayScore?: number | null;
  result?: string | null;
  gameType?: string;
  sourceUrl?: string;
  isHome?: boolean;
  schedule?: EventScheduleItem[];
  coaches?: EventCoachStaff[];
  divisions?: EventDivision[];
  staff?: EventStaffMember[];
  requirements?: string[];
  status: 'Upcoming' | 'Live' | 'Completed' | 'Draft';
  createdAt?: string;
  updatedAt?: string;
}

export const EVENT_CATEGORY_TABS: Array<{ id: EventCategoryType; label: string; icon: string; count?: number }> = [
  { id: 'All', label: 'All Events', icon: '🔥' },
  { id: 'Combine', label: '⚡ Combines & Lasers', icon: '⚡' },
  { id: 'Camp', label: '🏈 Camps & Clinics', icon: '🏈' },
  { id: 'Showcase', label: '🏆 Showcases / 7v7', icon: '🏆' },
  { id: 'Media Day', label: '📸 Media Days', icon: '📸' }
];

export const PRESET_BANNER_IMAGES = [
  {
    label: 'Football Combine & Field',
    url: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1200&auto=format&fit=crop&q=80',
    category: 'Combine'
  },
  {
    label: 'Basketball Arena & Dunk',
    url: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=1200&auto=format&fit=crop&q=80',
    category: 'Showcase'
  },
  {
    label: 'Girls Flag Football Turf',
    url: 'https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=1200&auto=format&fit=crop&q=80',
    category: 'Showcase'
  },
  {
    label: 'High-Impact Training Camp',
    url: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=1200&auto=format&fit=crop&q=80',
    category: 'Camp'
  },
  {
    label: 'Media Day Studio / Photoshoot',
    url: 'https://images.unsplash.com/photo-1518063319789-7217e6706b04?w=1200&auto=format&fit=crop&q=80',
    category: 'Media Day'
  },
  {
    label: 'Track & Sprint Laser',
    url: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=1200&auto=format&fit=crop&q=80',
    category: 'Combine'
  },
  {
    label: 'Lacrosse Velocity Shootout',
    url: 'https://images.unsplash.com/photo-1515037893149-de7f840978e2?w=1200&auto=format&fit=crop&q=80',
    category: 'Showcase'
  }
];

export const SAMPLE_SHOWCASE_EVENTS: ShowcaseEvent[] = [];

