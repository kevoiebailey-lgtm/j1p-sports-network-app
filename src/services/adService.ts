import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  increment, 
  query, 
  where, 
  limit,
  addDoc 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { AdCampaign, AdPlacementPosition } from '../types/ad';
import { firestoreCacheService } from './firestoreCacheService';

// House Default / Demo Ads so ad slots always display appealing sponsor opportunities
export const HOUSE_ADS: AdCampaign[] = [
  {
    id: 'slot-a-cinematic-gatorade',
    brandName: 'GATORADE FLUID LAB',
    contactEmail: 'sponsorships@gatorade.com',
    websiteUrl: 'https://www.gatorade.com',
    headline: 'GAME OF THE WEEK PRESENTED BY GATORADE',
    subheadline: 'Watch the #1 Ranked NJ Scholars vs. PSA Cardinals Showcase Live in 4K with Real-Time Pro Analytics.',
    ctaText: 'WATCH GAME OF THE WEEK',
    imageUrl: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=1400&auto=format&fit=crop&q=80',
    placementPosition: 'cinematic-hero',
    format: 'cinematic',
    status: 'active',
    impressions: 48200,
    clicks: 3120,
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    budget: 5000,
    tier: 'Headline Partner',
    createdAt: new Date().toISOString()
  },
  {
    id: 'slot-b-bento-nike',
    brandName: 'NIKE HOOP SUMMIT & COMBINE',
    contactEmail: 'combine@nike.com',
    websiteUrl: '/advertise',
    headline: 'TRI-STATE LASER COMBINE',
    subheadline: 'Official Nike verified 40-yd speed, vertical jump & scout radar stats on your profile.',
    ctaText: 'CLAIM COMBINE SLOT',
    imageUrl: 'https://images.unsplash.com/photo-1519766304817-4f37bda74a29?w=800&auto=format&fit=crop&q=80',
    placementPosition: 'bento-square',
    format: 'bento',
    status: 'active',
    impressions: 19400,
    clicks: 1280,
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    budget: 2000,
    tier: 'Regional MVP',
    createdAt: new Date().toISOString()
  },
  {
    id: 'slot-c-leaderboard-eastcoast',
    brandName: 'EAST COAST RECRUITING MATRIX',
    contactEmail: 'scouts@eastcoastmatrix.com',
    websiteUrl: '/advertise',
    headline: 'CONNECT DIRECTLY WITH 1,200+ DIVISION I, II & III COACHES',
    subheadline: 'Instant notification alerts when college recruiters review your video reel & transcript.',
    ctaText: 'ACTIVATE RECRUITER PASS',
    imageUrl: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1200&auto=format&fit=crop&q=80',
    placementPosition: 'native-leaderboard',
    format: 'leaderboard',
    status: 'active',
    impressions: 31200,
    clicks: 2150,
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    budget: 3000,
    tier: 'Headline Partner',
    createdAt: new Date().toISOString()
  },
  {
    id: 'slot-d-fixed-ortho',
    brandName: 'TRI-STATE ORTHOPEDICS',
    contactEmail: 'partner@tristateortho.com',
    websiteUrl: '/advertise',
    headline: 'OFFICIAL RECOVERY & INJURY PREVENTION PARTNER',
    subheadline: 'Book free biomechanics evaluation at any of our 12 Tri-State sports labs.',
    ctaText: 'BOOK FREE EVAL',
    imageUrl: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&auto=format&fit=crop&q=80',
    placementPosition: 'global-footer-banner',
    format: 'fixed-banner',
    status: 'active',
    impressions: 56200,
    clicks: 4120,
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    budget: 4500,
    tier: 'Headline Partner',
    createdAt: new Date().toISOString()
  },
  {
    id: 'house-ad-nike-1',
    brandName: 'Just1Play Media Pass',
    contactEmail: 'ads@just1play.com',
    websiteUrl: '/advertise',
    headline: 'ELEVATE YOUR ATHLETIC BRAND',
    subheadline: 'Reach 50,000+ Verified High School Athletes, College Scouts & Coaches across Tri-State.',
    ctaText: 'BOOK AD SPACE',
    imageUrl: 'https://images.unsplash.com/photo-1517649763962-0c623266010b?w=1200&auto=format&fit=crop&q=80',
    placementPosition: 'header-leaderboard',
    format: 'leaderboard',
    status: 'active',
    impressions: 14200,
    clicks: 890,
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    budget: 500,
    tier: 'Headline Partner',
    createdAt: new Date().toISOString()
  }
];

export function getAdScheduleStatus(ad: AdCampaign): 'live' | 'scheduled' | 'expired' | 'paused' | 'pending' {
  if (ad.status === 'pending') return 'pending';
  if (ad.status === 'paused') return 'paused';
  if (ad.status === 'rejected') return 'paused';

  const today = new Date().toISOString().split('T')[0];
  if (ad.startDate && ad.startDate > today) return 'scheduled';
  if (ad.endDate && ad.endDate < today) return 'expired';
  return 'live';
}

class AdService {
  private localAds: AdCampaign[] = [...HOUSE_ADS];

  private isAdWithinSchedule(ad: AdCampaign): boolean {
    if (ad.status !== 'active') return false;
    const today = new Date().toISOString().split('T')[0];
    if (ad.startDate && ad.startDate > today) return false; // Future scheduled
    if (ad.endDate && ad.endDate < today) return false; // Expired
    return true;
  }

  async getActiveAds(position?: AdPlacementPosition): Promise<AdCampaign[]> {
    try {
      if (!db) return this.getLocalAds(position);
      const adsRef = collection(db, 'adCampaigns');
      const q = position 
        ? query(adsRef, where('status', '==', 'active'), where('placementPosition', '==', position), limit(25))
        : query(adsRef, where('status', '==', 'active'), limit(25));
      
      const snap = await firestoreCacheService.getDocsCached(
        q,
        `ad_campaigns_active_${position || 'all'}`,
        { strategy: 'stale-while-revalidate', ttlMs: 10 * 60 * 1000 }
      );
      if (!snap.empty) {
        const fetched: AdCampaign[] = [];
        snap.forEach((docSnap) => {
          const item = { id: docSnap.id, ...docSnap.data() } as AdCampaign;
          if (this.isAdWithinSchedule(item)) {
            fetched.push(item);
          }
        });
        return fetched.length > 0 ? fetched : this.getLocalAds(position);
      }
    } catch (err) {
      console.warn('Firestore ad fetch warning, using local house fallback:', err);
    }
    return this.getLocalAds(position);
  }

  private getLocalAds(position?: AdPlacementPosition): AdCampaign[] {
    const activeAndScheduled = this.localAds.filter(a => this.isAdWithinSchedule(a));
    if (!position) return activeAndScheduled;
    const matched = activeAndScheduled.filter(a => a.placementPosition === position);
    if (matched.length > 0) return matched;
    return activeAndScheduled;
  }

  async getAllCampaigns(): Promise<AdCampaign[]> {
    try {
      if (!db) return this.localAds;
      const snap = await firestoreCacheService.getDocsCached(
        query(collection(db, 'adCampaigns'), limit(50)),
        'ad_campaigns_all',
        { strategy: 'stale-while-revalidate', ttlMs: 5 * 60 * 1000 }
      );
      if (!snap.empty) {
        const list: AdCampaign[] = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() } as AdCampaign));
        return list;
      }
    } catch (err) {
      console.warn('Failed to load all campaigns from Firestore:', err);
    }
    return this.localAds;
  }

  async submitCampaign(data: Omit<AdCampaign, 'id' | 'impressions' | 'clicks' | 'createdAt'>): Promise<AdCampaign> {
    const newAd: AdCampaign = {
      ...data,
      id: 'ad-' + Date.now(),
      impressions: 0,
      clicks: 0,
      createdAt: new Date().toISOString()
    };

    try {
      const docRef = await addDoc(collection(db, 'adCampaigns'), newAd);
      newAd.id = docRef.id;
    } catch (err) {
      console.warn('Saving ad campaign locally due to Firestore quota/error:', err);
      this.localAds.unshift(newAd);
    }
    return newAd;
  }

  async updateCampaignStatus(id: string, status: AdCampaign['status']): Promise<void> {
    try {
      const docRef = doc(db, 'adCampaigns', id);
      await updateDoc(docRef, { status });
    } catch (err) {
      console.warn('Updating campaign status locally:', err);
      const local = this.localAds.find(a => a.id === id);
      if (local) local.status = status;
    }
  }

  async trackImpression(adId: string): Promise<void> {
    try {
      const docRef = doc(db, 'adCampaigns', adId);
      await updateDoc(docRef, { impressions: increment(1) });
    } catch (err) {
      const local = this.localAds.find(a => a.id === adId);
      if (local) local.impressions += 1;
    }
  }

  async trackClick(adId: string): Promise<void> {
    try {
      const docRef = doc(db, 'adCampaigns', adId);
      await updateDoc(docRef, { clicks: increment(1) });
    } catch (err) {
      const local = this.localAds.find(a => a.id === adId);
      if (local) local.clicks += 1;
    }
  }
}

export const adService = new AdService();
