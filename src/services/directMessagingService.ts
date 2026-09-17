import { 
  collection, 
  doc, 
  query, 
  where, 
  getDocs, 
  limit, 
  serverTimestamp,
  orderBy,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  safeSetDoc, 
  safeAddDoc, 
  createBatchWriter, 
  isFirestoreQuotaExceeded 
} from '../lib/firestoreQuotaGuard';
import { notificationService } from './notificationService';
import { DirectMessage, ChatConversation, ChatParticipant, UserRole } from '../types';

export interface SendMessagePayload {
  senderUid: string;
  senderName: string;
  senderAvatar?: string;
  senderRole?: UserRole;
  senderIsVerified?: boolean;
  receiverUid: string;
  receiverName: string;
  receiverAvatar?: string;
  receiverRole?: UserRole;
  text: string;
  inquiryType?: 'Recruiting' | 'Combine Invitation' | 'Camp Offer' | 'General' | 'Highlight Reel' | 'Evaluation' | string;
  organization?: string;
  sport?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'highlight' | 'link';
}

export interface ContactSearchResult {
  uid: string;
  name: string;
  avatar?: string;
  role: UserRole;
  isVerified?: boolean;
  sport?: string;
  position?: string;
  organization?: string;
  highSchool?: string;
  gradYear?: string | number;
  email?: string;
}

export class DirectMessagingService {
  /**
   * Generates a consistent, deterministic chat document ID for 2 participants
   */
  public getDeterministicChatId(uid1: string, uid2: string): string {
    return [uid1, uid2].sort().join('_');
  }

  /**
   * Sends a direct message, updates conversation metadata atomically, and dispatches alerts
   */
  public async sendDirectMessage(payload: SendMessagePayload): Promise<{ success: boolean; chatId: string; messageId: string }> {
    const {
      senderUid,
      senderName,
      senderAvatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
      senderRole = 'athlete',
      senderIsVerified = false,
      receiverUid,
      receiverName,
      receiverAvatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
      receiverRole = 'athlete',
      text,
      inquiryType,
      organization,
      sport,
      mediaUrl,
      mediaType
    } = payload;

    const trimmedText = text.trim();
    if (!trimmedText || !senderUid || !receiverUid) {
      throw new Error('Missing required message parameters');
    }

    const chatId = this.getDeterministicChatId(senderUid, receiverUid);
    const nowIso = new Date().toISOString();
    const messageDocId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const messageData: DirectMessage = {
      id: messageDocId,
      senderUid,
      senderName,
      senderAvatar,
      senderRole,
      senderIsVerified,
      receiverUid,
      receiverName,
      text: trimmedText,
      ...(inquiryType ? { inquiryType } : {}),
      ...(organization ? { organization } : {}),
      ...(sport ? { sport } : {}),
      ...(mediaUrl ? { mediaUrl } : {}),
      ...(mediaType ? { mediaType } : {}),
      createdAt: nowIso
    };

    const senderParticipant: ChatParticipant = {
      uid: senderUid,
      name: senderName,
      avatar: senderAvatar,
      role: senderRole,
      isVerified: senderIsVerified,
      ...(sport ? { sport } : {}),
      ...(organization ? { organization } : {})
    };

    const receiverParticipant: ChatParticipant = {
      uid: receiverUid,
      name: receiverName,
      avatar: receiverAvatar,
      role: receiverRole
    };

    const conversationData: Partial<ChatConversation> = {
      id: chatId,
      participantUids: [senderUid, receiverUid],
      participants: [senderParticipant, receiverParticipant],
      lastMessage: inquiryType ? `[${inquiryType}] ${trimmedText}` : trimmedText,
      lastSenderUid: senderUid,
      lastMessageTimestamp: nowIso,
      updatedAt: nowIso,
      unreadBy: [receiverUid],
      unreadCount: {
        [receiverUid]: 1,
        [senderUid]: 0
      },
      [`lastRead_${senderUid}`]: nowIso,
      lastReadTimestamps: {
        [senderUid]: nowIso
      }
    };

    if (inquiryType) {
      conversationData.inquiryType = inquiryType;
    }
    if (organization) {
      conversationData.organization = organization;
    }

    if (!isFirestoreQuotaExceeded() && db) {
      try {
        const batch = createBatchWriter();
        
        // Update or create parent conversation
        const chatRef = doc(db, 'chats', chatId);
        batch.set(chatRef, conversationData, { merge: true });

        // Add to subcollection messages
        const messageDocRef = doc(db, 'chats', chatId, 'messages', messageDocId);
        batch.set(messageDocRef, messageData);

        await batch.commit();
      } catch (err) {
        console.warn('[DirectMessagingService] Batch commit notice:', err);
      }
    }

    // Dispatch real-time push notification and in-app toast to recipient
    try {
      notificationService.sendDirectMessageAlert({
        recipientUid: receiverUid,
        senderUid,
        senderName,
        senderAvatar,
        message: inquiryType ? `[${inquiryType}] ${trimmedText}` : trimmedText
      }).catch(err => console.warn('[DirectMessagingService] Alert notice:', err));
    } catch (notifErr) {
      console.warn('[DirectMessagingService] Alert dispatch warning:', notifErr);
    }

    // Broadcast local window event for instant cross-tab and component update
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('just1play:direct-message-sent', {
        detail: { chatId, message: messageData }
      }));
    }

    return { success: true, chatId, messageId: messageDocId };
  }

  /**
   * Marks an entire conversation as read for the active user
   */
  public async markConversationAsRead(chatId: string, currentUid: string): Promise<void> {
    if (!chatId || !currentUid || !db || isFirestoreQuotaExceeded()) return;

    try {
      const nowIso = new Date().toISOString();
      const chatRef = doc(db, 'chats', chatId);
      await safeSetDoc(chatRef, {
        unreadCount: {
          [currentUid]: 0
        },
        lastReadTimestamps: {
          [currentUid]: nowIso
        },
        [`lastRead_${currentUid}`]: nowIso
      }, { merge: true });

      // Clean up matching unread notifications in batch
      const notifQuery = query(
        collection(db, 'notifications'),
        where('recipientUid', '==', currentUid),
        where('type', '==', 'dm'),
        where('read', '==', false)
      );

      const notifSnap = await getDocs(notifQuery);
      if (!notifSnap.empty) {
        const batch = createBatchWriter();
        notifSnap.docs.forEach((d) => {
          batch.update(d.ref, { read: true, readAt: nowIso });
        });
        await batch.commit();
      }
    } catch (err) {
      console.warn('[DirectMessagingService] Mark read warning:', err);
    }
  }

  /**
   * Searches for athletes, scouts/recruiters, coaches, and members in Firestore
   */
  public async searchContacts(
    searchQuery: string, 
    currentUid: string, 
    limitCount: number = 20
  ): Promise<ContactSearchResult[]> {
    if (!db) return [];
    const queryLower = searchQuery.toLowerCase().trim();
    const resultsMap = new Map<string, ContactSearchResult>();

    try {
      // 1. Search Users collection
      const usersRef = collection(db, 'users');
      const usersSnap = await getDocs(query(usersRef, limit(40)));
      
      usersSnap.docs.forEach((docSnap) => {
        const d = docSnap.data();
        const uid = docSnap.id;
        if (uid === currentUid) return;

        const displayName = d.displayName || d.name || d.fullName || 'Sports Member';
        const role: UserRole = (d.role as UserRole) || 'athlete';
        const sport = d.sport || d.primarySport || '';
        const organization = d.organization || d.school || d.highSchool || d.college || '';
        const position = d.position || '';

        const searchableText = `${displayName} ${sport} ${position} ${organization} ${role}`.toLowerCase();
        
        if (!queryLower || searchableText.includes(queryLower)) {
          resultsMap.set(uid, {
            uid,
            name: displayName,
            avatar: d.photoURL || d.avatarUrl || d.avatar,
            role,
            isVerified: !!d.isVerified || !!d.verified,
            sport,
            position,
            organization,
            highSchool: d.highSchool || d.school,
            gradYear: d.gradYear || d.classYear || d.class,
            email: d.email
          });
        }
      });

      // 2. Also search Athletes collection if available
      try {
        const athletesRef = collection(db, 'athletes');
        const athletesSnap = await getDocs(query(athletesRef, limit(40)));
        
        athletesSnap.docs.forEach((docSnap) => {
          const d = docSnap.data();
          const uid = d.uid || docSnap.id;
          if (uid === currentUid) return;

          const displayName = d.displayName || d.name || 'Athlete';
          const sport = d.sport || '';
          const organization = d.highSchool || d.school || d.team || '';
          const position = d.position || '';

          const searchableText = `${displayName} ${sport} ${position} ${organization}`.toLowerCase();

          if (!queryLower || searchableText.includes(queryLower)) {
            const existing = resultsMap.get(uid);
            resultsMap.set(uid, {
              uid,
              name: displayName,
              avatar: d.avatarUrl || d.photoURL || existing?.avatar,
              role: 'athlete',
              isVerified: !!d.isVerified || !!d.verified,
              sport: sport || existing?.sport,
              position: position || existing?.position,
              organization: organization || existing?.organization,
              highSchool: d.highSchool || existing?.highSchool,
              gradYear: d.gradYear || d.classYear || existing?.gradYear
            });
          }
        });
      } catch (athleteErr) {
        console.warn('[DirectMessagingService] Athlete search fallback:', athleteErr);
      }

      return Array.from(resultsMap.values()).slice(0, limitCount);
    } catch (err) {
      console.warn('[DirectMessagingService] Search contacts error:', err);
      return [];
    }
  }
}

export const directMessagingService = new DirectMessagingService();
