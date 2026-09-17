import { SocialPost } from '../types';
import { sendToServiceWorkerCache } from './offlineFavoritesService';

const WATCHLIST_STORAGE_KEY = 'j1p_scout_watchlist_posts';

export interface WatchlistEntry {
  postId: string;
  authorUid: string;
  authorName: string;
  authorAvatar?: string;
  authorSport?: string;
  classYear?: string;
  position?: string;
  videoUrl?: string;
  videoThumbnailUrl?: string;
  caption: string;
  savedAt: string;
}

export const getWatchlistEntries = (): WatchlistEntry[] => {
  try {
    const raw = localStorage.getItem(WATCHLIST_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.warn('Error reading scout watchlist:', err);
    return [];
  }
};

export const isPostInWatchlist = (postId: string): boolean => {
  const entries = getWatchlistEntries();
  return entries.some(e => e.postId === postId);
};

export const toggleWatchlistPost = (post: SocialPost): boolean => {
  try {
    const entries = getWatchlistEntries();
    const index = entries.findIndex(e => e.postId === post.id);
    let isNowSaved = false;
    let updated: WatchlistEntry[];

    if (index >= 0) {
      updated = entries.filter(e => e.postId !== post.id);
      isNowSaved = false;
    } else {
      const newEntry: WatchlistEntry = {
        postId: post.id,
        authorUid: post.authorUid,
        authorName: post.authorName,
        authorAvatar: post.authorAvatar,
        authorSport: post.authorSport,
        classYear: post.classYear || (post.caption.match(/class of '?(\d{2,4})/i)?.[0]),
        position: post.position,
        videoUrl: post.videoUrl,
        videoThumbnailUrl: post.videoThumbnailUrl,
        caption: post.caption,
        savedAt: new Date().toISOString()
      };
      updated = [newEntry, ...entries];
      isNowSaved = true;
    }

    localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(updated));
    
    // Sync to Service Worker Cache
    const mediaUrls = updated.flatMap(u => [u.authorAvatar, u.videoThumbnailUrl]).filter(Boolean) as string[];
    sendToServiceWorkerCache('watchlist', { entries: updated }, mediaUrls);

    window.dispatchEvent(new CustomEvent('j1p-watchlist-updated', { detail: { postId: post.id, isSaved: isNowSaved } }));
    return isNowSaved;
  } catch (err) {
    console.warn('Error updating scout watchlist:', err);
    return false;
  }
};
