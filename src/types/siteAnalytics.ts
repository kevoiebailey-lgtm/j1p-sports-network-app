export type SiteSectionCategory = 
  | 'front_page'
  | 'galleries'
  | 'social_wall'
  | 'back_page'
  | 'social_network'
  | 'video_vault'
  | 'events_tournaments'
  | 'other';

export interface SectionTrafficStat {
  sectionId: SiteSectionCategory;
  name: string;
  description: string;
  pathPrefix: string;
  pageViews: number;
  uniqueVisitors: number;
  avgDwellTimeSeconds: number;
  percentageShare: number;
  topInteraction: string;
  adImpressionPotential: 'High' | 'Very High' | 'Maximum' | 'Moderate';
  color: string;
  iconName: string;
}

export interface HourlyTrafficBucket {
  hour: string;
  pageViews: number;
  uniqueSessions: number;
  galleries: number;
  socialWall: number;
  frontPage: number;
  socialNetwork: number;
  backPages: number;
}

export interface DailyTrafficTrend {
  date: string;
  dayLabel: string;
  totalViews: number;
  uniqueVisitors: number;
  galleriesViews: number;
  wallViews: number;
  frontPageViews: number;
  networkViews: number;
  backPageViews: number;
  adImpressions: number;
}

export interface AdZonePerformance {
  slotId: string;
  slotName: string;
  placementLocation: string;
  section: SiteSectionCategory;
  impressions: number;
  clicks: number;
  ctr: number;
  estimatedCpm: number;
  revenuePotential: number;
  status: 'active' | 'available' | 'high_demand';
}

export interface TrafficAnalyticsSummary {
  totalPageViews: number;
  totalUniqueVisitors: number;
  totalAdImpressions: number;
  avgSessionDurationSeconds: number;
  bounceRate: number;
  activeVisitorsNow: number;
  peakHour: string;
  topTrafficSection: string;
  deviceBreakdown: {
    mobile: number;
    desktop: number;
    tablet: number;
  };
  referrerSources: {
    direct: number;
    social: number;
    search: number;
    collegeCoaches: number;
  };
  sections: SectionTrafficStat[];
  dailyTrends: DailyTrafficTrend[];
  hourlyDistribution: HourlyTrafficBucket[];
  adZones: AdZonePerformance[];
  lastUpdated: string;
}
