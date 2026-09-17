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
  getDocs,
  getDoc,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { SportType } from '../types';
import { getProductionData } from '../lib/productionMode';

export interface RoomDeviceSession {
  sessionId: string;
  deviceType: 'mobile' | 'desktop' | 'tablet';
  deviceName: string;
  joinedAt: string;
  isBroadcaster?: boolean;
}

export interface StreamRoom {
  roomId: string;
  roomCode: string; // Unique short code, e.g., "J1P-8924"
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
  activeCamAngle?: 'sideline' | 'endzone' | 'skycam' | 'bench';
  activeDevices: RoomDeviceSession[];
  createdAt: string;
  updatedAt: string;
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

const DEMO_STREAM_ROOMS: StreamRoom[] = [
  {
    roomId: 'room-j1p-101',
    roomCode: 'J1P-101',
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
    rtmpUrl: 'rtmp://live.just1play.com/app',
    streamKey: 'j1p_key_northeast_2026',
    thumbnailUrl: 'https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=800&auto=format&fit=crop&q=80',
    homeTeamName: 'Paramus Catholic',
    awayTeamName: 'Hillsborough High',
    homeScore: 24,
    awayScore: 18,
    period: '4th Qtr',
    gameClock: '02:15',
    activeCamAngle: 'sideline',
    activeDevices: [
      {
        sessionId: 'sess-mob-1',
        deviceType: 'mobile',
        deviceName: 'iPhone 15 Pro Cam',
        joinedAt: new Date().toISOString(),
        isBroadcaster: true
      },
      {
        sessionId: 'sess-desk-1',
        deviceType: 'desktop',
        deviceName: 'MacBook Pro Desktop',
        joinedAt: new Date().toISOString(),
        isBroadcaster: false
      }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    roomId: 'room-j1p-202',
    roomCode: 'J1P-202',
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
    rtmpUrl: 'rtmp://live.just1play.com/app',
    streamKey: 'j1p_key_tristate_2026',
    thumbnailUrl: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&auto=format&fit=crop&q=80',
    homeTeamName: 'St. Anthony Prep',
    awayTeamName: 'Bergen Catholic',
    homeScore: 88,
    awayScore: 82,
    period: '4th Qtr',
    gameClock: '00:45',
    activeCamAngle: 'skycam',
    activeDevices: [
      {
        sessionId: 'sess-desk-2',
        deviceType: 'desktop',
        deviceName: 'Windows Control Deck',
        joinedAt: new Date().toISOString(),
        isBroadcaster: true
      }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

class LiveStreamGatewayService {
  /**
   * Helper to generate a unique human-friendly 6-character room code (e.g. "J1P-8924")
   */
  generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let rand = '';
    for (let i = 0; i < 4; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `J1P-${rand}`;
  }

  /**
   * Create or Register a new Stream Room with decoupled signaling
   */
  async createStreamRoom(partial: Partial<StreamRoom>): Promise<StreamRoom> {
    const roomCode = partial.roomCode || this.generateRoomCode();
    const roomId = partial.roomId || `room-${roomCode.toLowerCase().replace('-', '')}-${Date.now()}`;

    const newRoom: StreamRoom = {
      roomId,
      roomCode: roomCode.toUpperCase(),
      title: partial.title || 'Live Stream Room',
      sport: partial.sport || 'Basketball',
      broadcasterUid: partial.broadcasterUid || 'anon-user',
      broadcasterName: partial.broadcasterName || 'Just1Play Streamer',
      broadcasterAvatar: partial.broadcasterAvatar || '',
      broadcasterRole: partial.broadcasterRole || 'content_creator',
      isBroadcasting: partial.isBroadcasting ?? true,
      status: partial.status || 'live',
      viewerCount: partial.viewerCount || 1,
      streamUrl: partial.streamUrl || 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      rtmpUrl: partial.rtmpUrl || 'rtmp://live.just1play.com/app',
      streamKey: partial.streamKey || `j1p_key_${roomId}`,
      thumbnailUrl: partial.thumbnailUrl || 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&auto=format&fit=crop&q=80',
      homeTeamName: partial.homeTeamName || 'Home Team',
      awayTeamName: partial.awayTeamName || 'Away Team',
      homeScore: partial.homeScore ?? 0,
      awayScore: partial.awayScore ?? 0,
      period: partial.period || '1st Qtr',
      gameClock: partial.gameClock || '12:00',
      activeCamAngle: partial.activeCamAngle || 'sideline',
      activeDevices: partial.activeDevices || [
        {
          sessionId: `sess-${Date.now()}`,
          deviceType: window.innerWidth < 768 ? 'mobile' : 'desktop',
          deviceName: window.innerWidth < 768 ? 'Mobile Device' : 'Desktop Browser',
          joinedAt: new Date().toISOString(),
          isBroadcaster: true
        }
      ],
      createdAt: partial.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      const roomRef = doc(db, 'streamRooms', roomId);
      await setDoc(roomRef, newRoom, { merge: true });
    } catch (e) {
      console.warn('Firestore createStreamRoom fallback:', e);
    }

    return newRoom;
  }

  /**
   * Subscribe to all active Stream Rooms in real time across the application
   */
  subscribeToAllRooms(callback: (rooms: StreamRoom[]) => void): () => void {
    try {
      const roomsRef = collection(db, 'streamRooms');
      return onSnapshot(
        roomsRef,
        (snapshot) => {
          if (!snapshot.empty) {
            const list: StreamRoom[] = [];
            snapshot.forEach((docSnap) => {
              const data = docSnap.data() as StreamRoom;
              if (data.isBroadcasting || data.status === 'live') {
                list.push({ ...data, roomId: docSnap.id });
              }
            });
            callback(getProductionData(list, DEMO_STREAM_ROOMS));
          } else {
            callback(getProductionData([], DEMO_STREAM_ROOMS));
          }
        },
        (err) => {
          console.warn('Firestore streamRooms listener fallback:', err);
          callback(getProductionData([], DEMO_STREAM_ROOMS));
        }
      );
    } catch (e) {
      console.warn('Error connecting to streamRooms collection:', e);
      callback(getProductionData([], DEMO_STREAM_ROOMS));
      return () => {};
    }
  }

  /**
   * Subscribe to a specific Stream Room by roomId OR roomCode in real time
   */
  subscribeToRoom(roomIdOrCode: string, callback: (room: StreamRoom | null) => void): () => void {
    if (!roomIdOrCode) {
      callback(null);
      return () => {};
    }

    const cleanInput = roomIdOrCode.trim().toUpperCase();

    try {
      // 1. First attempt doc listener by exact roomId
      const roomDocRef = doc(db, 'streamRooms', roomIdOrCode);
      const unsubDoc = onSnapshot(
        roomDocRef,
        (snap) => {
          if (snap.exists()) {
            callback({ ...snap.data(), roomId: snap.id } as StreamRoom);
          } else {
            // 2. Fallback query by roomCode
            const roomsRef = collection(db, 'streamRooms');
            const q = query(roomsRef, where('roomCode', '==', cleanInput));
            getDocs(q).then((querySnap) => {
              if (!querySnap.empty) {
                const d = querySnap.docs[0];
                callback({ ...d.data(), roomId: d.id } as StreamRoom);
              } else {
                // Fallback check demo rooms
                const demo = DEMO_STREAM_ROOMS.find(
                  r => r.roomId === roomIdOrCode || r.roomCode.toUpperCase() === cleanInput
                );
                callback(demo || null);
              }
            }).catch(() => {
              const demo = DEMO_STREAM_ROOMS.find(
                r => r.roomId === roomIdOrCode || r.roomCode.toUpperCase() === cleanInput
              );
              callback(demo || null);
            });
          }
        },
        (err) => {
          console.warn('Stream room listener notice:', err);
          const demo = DEMO_STREAM_ROOMS.find(
            r => r.roomId === roomIdOrCode || r.roomCode.toUpperCase() === cleanInput
          );
          callback(demo || null);
        }
      );

      return unsubDoc;
    } catch (e) {
      console.warn('Error subscribing to room:', e);
      const demo = DEMO_STREAM_ROOMS.find(
        r => r.roomId === roomIdOrCode || r.roomCode.toUpperCase() === cleanInput
      );
      callback(demo || null);
      return () => {};
    }
  }

  /**
   * Join a room via code or ID, attaching client session info
   */
  async joinRoom(
    roomCodeOrId: string, 
    session: { sessionId: string; deviceType: 'mobile' | 'desktop' | 'tablet'; deviceName?: string; isBroadcaster?: boolean }
  ): Promise<StreamRoom | null> {
    const cleanInput = roomCodeOrId.trim().toUpperCase();
    
    // Check if room exists
    let targetRoom: StreamRoom | null = null;
    try {
      const roomRef = doc(db, 'streamRooms', roomCodeOrId);
      const snap = await getDoc(roomRef);
      if (snap.exists()) {
        targetRoom = { ...snap.data(), roomId: snap.id } as StreamRoom;
      } else {
        const roomsRef = collection(db, 'streamRooms');
        const q = query(roomsRef, where('roomCode', '==', cleanInput));
        const querySnap = await getDocs(q);
        if (!querySnap.empty) {
          const d = querySnap.docs[0];
          targetRoom = { ...d.data(), roomId: d.id } as StreamRoom;
        }
      }
    } catch (e) {
      console.warn('Error looking up room to join:', e);
    }

    if (!targetRoom) {
      targetRoom = DEMO_STREAM_ROOMS.find(r => r.roomId === roomCodeOrId || r.roomCode === cleanInput) || null;
    }

    if (!targetRoom) return null;

    // Attach device session
    const newSession: RoomDeviceSession = {
      sessionId: session.sessionId,
      deviceType: session.deviceType,
      deviceName: session.deviceName || (session.deviceType === 'mobile' ? 'Mobile Phone' : 'Desktop Workstation'),
      joinedAt: new Date().toISOString(),
      isBroadcaster: session.isBroadcaster || false
    };

    const updatedDevices = [...(targetRoom.activeDevices || []).filter(d => d.sessionId !== session.sessionId), newSession];
    const newViewerCount = Math.max(1, updatedDevices.length);

    try {
      const targetDocRef = doc(db, 'streamRooms', targetRoom.roomId);
      await updateDoc(targetDocRef, {
        activeDevices: updatedDevices,
        viewerCount: newViewerCount,
        updatedAt: new Date().toISOString()
      });
    } catch (e) {
      console.warn('Firestore joinRoom update fallback:', e);
    }

    return {
      ...targetRoom,
      activeDevices: updatedDevices,
      viewerCount: newViewerCount
    };
  }

  /**
   * Update live room stream signals (broadcaster video URL, score overlay, period, clock, camera angle)
   */
  async updateRoomSignals(roomId: string, signals: Partial<StreamRoom>): Promise<void> {
    try {
      const roomRef = doc(db, 'streamRooms', roomId);
      await setDoc(roomRef, {
        ...signals,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (e) {
      console.warn('Firestore updateRoomSignals fallback:', e);
    }
  }

  /**
   * Leave a Stream Room
   */
  async leaveRoom(roomId: string, sessionId: string): Promise<void> {
    try {
      const roomRef = doc(db, 'streamRooms', roomId);
      const snap = await getDoc(roomRef);
      if (snap.exists()) {
        const data = snap.data() as StreamRoom;
        const filteredDevices = (data.activeDevices || []).filter(d => d.sessionId !== sessionId);
        await updateDoc(roomRef, {
          activeDevices: filteredDevices,
          viewerCount: Math.max(0, filteredDevices.length),
          updatedAt: new Date().toISOString()
        });
      }
    } catch (e) {
      console.warn('Firestore leaveRoom error:', e);
    }
  }

  /**
   * Send live chat message inside a Stream Room
   */
  async sendRoomChatMessage(roomId: string, message: Omit<LiveChatMessage, 'id' | 'createdAt'>): Promise<void> {
    try {
      const chatRef = collection(db, 'streamRooms', roomId, 'chat');
      await addDoc(chatRef, {
        ...message,
        createdAt: new Date().toISOString()
      });
    } catch (e) {
      console.warn('Error sending room chat message:', e);
    }
  }

  /**
   * Realtime subscriber for Stream Room chat
   */
  subscribeToRoomChat(roomId: string, callback: (messages: LiveChatMessage[]) => void): () => void {
    try {
      const chatRef = collection(db, 'streamRooms', roomId, 'chat');
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
          console.warn('LiveStream chat snapshot notice:', err);
          callback([]);
        }
      );
    } catch (e) {
      console.warn('Error subscribing to room chat:', e);
      return () => {};
    }
  }
}

export const LiveStreamGateway = new LiveStreamGatewayService();
