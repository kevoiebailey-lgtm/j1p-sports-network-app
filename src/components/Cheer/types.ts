export type CheerSkillCategory = 
  | 'standing_tumbling' 
  | 'running_tumbling' 
  | 'stunting' 
  | 'jumps_flexibility';

export type CheerSkillLevel = 
  | 'Level 4' 
  | 'Level 5' 
  | 'Level 6' 
  | 'NCAA D1';

export type CheerSurface = 
  | 'dead_floor' 
  | 'spring_floor' 
  | 'grass_turf';

export interface CheerSkillItem {
  skillId: string;
  name: string;
  category: CheerSkillCategory;
  level: CheerSkillLevel;
  verified: boolean;
  videoUrl: string; // External links only: YouTube, Hudl, Vimeo, Instagram
  timestamp?: string; // e.g. "0:24"
  surface?: CheerSurface;
  notes?: string;
  verifiedBy?: string;
  updatedAt?: string;
}

export interface CheerMatrixData {
  userId: string;
  athleteName?: string;
  lastUpdated?: string;
  readinessScore?: number;
  skills: CheerSkillItem[];
}

export interface CategoryMetadata {
  id: CheerSkillCategory;
  name: string;
  shortName: string;
  description: string;
  iconName: string;
  accentColor: string;
  gradient: string;
}
