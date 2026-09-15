import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  limit, 
  addDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { SportType } from '../types';
import { getProductionData } from '../lib/productionMode';

export interface StandaloneStream {
  id: string;
  title: string;
  sport: SportType;
  broadcasterUid: string;
  broadcasterName: string;
  broadcasterAvatar?: string;
  broadcasterRole?: string;
  isBroadcasting: boolean;
  status: 'live' | 'ended' | 'scheduled';
  viewerCount: number;
  streamUrl: string;
  rtmpUrl?: string;
  streamKey?: string;
  thumbnailUrl?: string;
  homeTeamName?: string;
  awayTeamName?: string;
  homeScore?: number;
  awayScore?: number;
  period?: string;
  gameClock?: string;
  startedAt: string;
  updatedAt: string;
  deviceType?: 'mobile' | 'desktop' | 'tablet';
}

export interface LiveChatMessage {
  id: string;
  senderUid?: string;
  authorName: string;
  authorAvatar?: string;
  authorRole?: string;
  authorIsVerified?: boolean;
  text: string;
  reaction?: string;
  createdAt: string;
}

const DEMO_LIVE_STREAMS: StandaloneStream[] = [
  {
    id: 'stream-standalone-1',
    title: 'Northeast Championship Finals - Live Sideline Camera',
    sport: "Girls' Flag Football",
    broadcasterUid: 'creator-1',
    broadcasterName: 'Coach Vance & J1P Media',
    broadcasterAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    broadcasterRole: 'content_creator',
    isBroadcasting: true,
    status: 'live',
    viewerCount: 412,
    streamUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    thumbnailUrl: 'https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=800&auto=format&fit=crop&q=80',
    homeTeamName: 'Paramus Catholic',
    awayTeamName: 'Hillsborough High',
    homeScore: 24,
    awayScore: 18,
    period: '4th Qtr',
    gameClock: '02:15',
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deviceType: 'mobile'
  },
  {
    id: 'stream-standalone-2',
    title: 'Tri-State Elite Showcase - Court 1 HD Feed',
    sport: 'Basketball',
    broadcasterUid: 'admin-1',
    broadcasterName: 'Just1Play Official Broadcast',
    broadcasterAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
    broadcasterRole: 'admin',
    isBroadcasting: true,
    status: 'live',
    viewerCount: 829,
    streamUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    thumbnailUrl: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&auto=format&fit=crop&q=80',
    homeTeamName: 'St. Anthony Prep',
    awayTeamName: 'Bergen Catholic',
    homeScore: 88,
    awayScore: 82,
    period: '4th Qtr',
    gameClock: '00:45',
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deviceType: 'desktop'
  }
];

export const liveStreamService = {
  /**
   * Subscribe to active live streams across the entire platform
   */
  subscribeToActiveStreams(callback: (streams: StandaloneStream[]) => void) {
    try {
      const streamsRef = collection(db, 'liveStreams');
      return onSnapshot(
        streamsRef,
        (snapshot) => {
          if (!snapshot.empty) {
            const list: StandaloneStream[] = [];
            snapshot.forEach((docSnap) => {
              const data = docSnap.data() as StandaloneStream;
              if (data.isBroadcasting || data.status === 'live') {
                list.push({ ...data, id: docSnap.id });
              }
            });
            callback(getProductionData(list, DEMO_LIVE_STREAMS));
          } else {
            callback(getProductionData([], DEMO_LIVE_STREAMS));
          }
        },
        (err) => {
          console.warn('Firestore liveStreams listener error, fallback to demo:', err);
          callback(getProductionData([], DEMO_LIVE_STREAMS));
        }
      );
    } catch (e) {
      console.warn('Error connecting to liveStreams collection:', e);
      callback(getProductionData([], DEMO_LIVE_STREAMS));
      return () => {};
    }
  },

  /**
   * Publish or update a standalone stream in Firestore
   */
  async publishStream(stream: Partial<StandaloneStream> & { id: string }) {
    try {
      const streamRef = doc(db, 'liveStreams', stream.id);
      const payload: StandaloneStream = {
        id: stream.id,
        title: stream.title || 'Live Standalone Stream',
        sport: stream.sport || 'Basketball',
        broadcasterUid: stream.broadcasterUid || 'user-anon',
        broadcasterName: stream.broadcasterName || 'Just1Play Broadcaster',
        broadcasterAvatar: stream.broadcasterAvatar || '',
        broadcasterRole: stream.broadcasterRole || 'content_creator',
        isBroadcasting: stream.isBroadcasting ?? true,
        status: stream.status || 'live',
        viewerCount: stream.viewerCount || 1,
        streamUrl: stream.streamUrl || 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        rtmpUrl: stream.rtmpUrl || 'rtmp://live.just1play.com/app',
        streamKey: stream.streamKey || `j1p_key_${Date.now()}`,
        thumbnailUrl: stream.thumbnailUrl || 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&auto=format&fit=crop&q=80',
        homeTeamName: stream.homeTeamName || 'Home Team',
        awayTeamName: stream.awayTeamName || 'Away Team',
        homeScore: stream.homeScore ?? 0,
        awayScore: stream.awayScore ?? 0,
        period: stream.period || '1st Qtr',
        gameClock: stream.gameClock || '12:00',
        startedAt: stream.startedAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deviceType: stream.deviceType || (window.innerWidth < 768 ? 'mobile' : 'desktop')
      };

      await setDoc(streamRef, payload, { merge: true });
      return payload;
    } catch (e) {
      console.warn('Error publishing live stream to Firestore:', e);
      return null;
    }
  },

  /**
   * Stop / End a live stream in Firestore
   */
  async endStream(streamId: string) {
    try {
      const streamRef = doc(db, 'liveStreams', streamId);
      await updateDoc(streamRef, {
        isBroadcasting: false,
        status: 'ended',
        updatedAt: new Date().toISOString()
      });
    } catch (e) {
      console.warn('Error ending stream in Firestore:', e);
    }
  },

  /**
   * Subscribe to real-time live chat for a stream
   */
  subscribeToChat(streamId: string, callback: (messages: LiveChatMessage[]) => void) {
    try {
      const chatRef = collection(db, 'liveStreams', streamId, 'chat');
      const q = query(chatRef, orderBy('createdAt', 'asc'), limit(50));
      return onSnapshot(
        q,
        (snapshot) => {
          if (!snapshot.empty) {
            const msgs: LiveChatMessage[] = [];
            snapshot.forEach((d) => {
              msgs.push({ id: d.id, ...d.data() } as LiveChatMessage);
            });
            callback(msgs);
          }
        },
        (err) => {
          console.warn('Live stream chat snapshot notice:', err);
          callback([]);
        }
      );
    } catch (e) {
      console.warn('Error subscribing to live stream chat:', e);
      return () => {};
    }
  },

  /**
   * Send chat message
   */
  async sendChatMessage(streamId: string, message: Omit<LiveChatMessage, 'id' | 'createdAt'>) {
    try {
      const chatRef = collection(db, 'liveStreams', streamId, 'chat');
      await addDoc(chatRef, {
        ...message,
        createdAt: new Date().toISOString()
      });
    } catch (e) {
      console.warn('Error sending chat message:', e);
    }
  }
};
