import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  getDocs,
  writeBatch,
  arrayRemove
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { isFirestoreQuotaExceeded, safeSetDoc } from '../lib/firestoreQuotaGuard';
import { ChatConversation } from '../types';

export interface UnreadDirectMessagesState {
  unreadCount: number;
  unreadChats: ChatConversation[];
  hasUnread: boolean;
  loading: boolean;
  markChatAsRead: (chatId: string, partnerUid?: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

export function useUnreadDirectMessages(): UnreadDirectMessagesState {
  const { user } = useAuth();
  const currentUid = user?.uid || '';

  const [unreadChats, setUnreadChats] = useState<ChatConversation[]>([]);
  const [notifDmCount, setNotifDmCount] = useState<number>(0);
  const [loadingChats, setLoadingChats] = useState<boolean>(false);
  const [loadingNotifs, setLoadingNotifs] = useState<boolean>(false);

  // 1. Real-time Firestore listener for Direct Messages in 'chats' collection
  useEffect(() => {
    if (!currentUid || !db) {
      setUnreadChats([]);
      setLoadingChats(false);
      return;
    }

    setLoadingChats(true);
    try {
      const chatsQuery = query(
        collection(db, 'chats'),
        where('participantUids', 'array-contains', currentUid)
      );

      const unsubscribeChats = onSnapshot(chatsQuery, (snapshot) => {
        const unreadList: ChatConversation[] = [];

        snapshot.docs.forEach((docSnap) => {
          const chat = { id: docSnap.id, ...docSnap.data() } as ChatConversation;
          
          // Check unread indicators
          let isUnread = false;

          // Case A: unreadBy array explicitly contains current user
          if (Array.isArray(chat.unreadBy) && chat.unreadBy.includes(currentUid)) {
            isUnread = true;
          }
          // Case B: unreadCount map specifies unread for current user
          else if (chat.unreadCount && typeof chat.unreadCount[currentUid] === 'number' && chat.unreadCount[currentUid] > 0) {
            isUnread = true;
          }
          // Case C: last message was sent by someone else and timestamp is newer than user's last read
          else if (chat.lastSenderUid && chat.lastSenderUid !== currentUid && chat.lastMessageTimestamp) {
            const lastRead = chat.lastReadTimestamps?.[currentUid] || chat[`lastRead_${currentUid}`];
            if (!lastRead) {
              isUnread = true;
            } else {
              const lastReadTime = new Date(lastRead).getTime();
              const lastMsgTime = new Date(chat.lastMessageTimestamp).getTime();
              if (lastReadTime < lastMsgTime) {
                isUnread = true;
              }
            }
          }

          if (isUnread) {
            unreadList.push(chat);
          }
        });

        setUnreadChats(unreadList);
        setLoadingChats(false);
      }, (err: any) => {
        if (err?.code !== 'permission-denied') {
          console.warn('Direct messages real-time snapshot notice:', err?.message || err);
        }
        setLoadingChats(false);
      });

      return () => unsubscribeChats();
    } catch (err: any) {
      if (err?.code !== 'permission-denied') {
        console.warn('Error setting up DM listener:', err?.message || err);
      }
      setLoadingChats(false);
    }
  }, [currentUid]);

  // 2. Real-time Firestore listener for DM notifications in 'notifications' collection
  useEffect(() => {
    if (!currentUid || !db) {
      setNotifDmCount(0);
      setLoadingNotifs(false);
      return;
    }

    setLoadingNotifs(true);
    try {
      const notifsQuery = query(
        collection(db, 'notifications'),
        where('recipientUid', '==', currentUid),
        where('type', '==', 'dm'),
        where('read', '==', false)
      );

      const unsubscribeNotifs = onSnapshot(notifsQuery, (snapshot) => {
        setNotifDmCount(snapshot.size);
        setLoadingNotifs(false);
      }, (err: any) => {
        if (err?.code !== 'permission-denied') {
          console.warn('DM notifications real-time snapshot notice:', err?.message || err);
        }
        setLoadingNotifs(false);
      });

      return () => unsubscribeNotifs();
    } catch (err: any) {
      if (err?.code !== 'permission-denied') {
        console.warn('Error setting up DM notifications listener:', err?.message || err);
      }
      setLoadingNotifs(false);
    }
  }, [currentUid]);

  // Compute aggregated unread count (deduplicated across chats and alerts)
  const unreadCount = useMemo(() => {
    const chatsCount = unreadChats.length;
    return Math.max(chatsCount, notifDmCount);
  }, [unreadChats.length, notifDmCount]);

  // Mark a specific conversation as read in Firestore
  const markChatAsRead = useCallback(async (chatId: string, partnerUid?: string) => {
    if (!currentUid || !chatId) return;

    // Optimistic local state update
    setUnreadChats(prev => prev.filter(c => c.id !== chatId));

    if (isFirestoreQuotaExceeded()) return;

    try {
      const nowIso = new Date().toISOString();
      const chatDocRef = doc(db, 'chats', chatId);

      // 1. Update the chat document
      await safeSetDoc(chatDocRef, {
        unreadBy: arrayRemove(currentUid),
        unreadCount: {
          [currentUid]: 0
        },
        lastReadTimestamps: {
          [currentUid]: nowIso
        },
        [`lastRead_${currentUid}`]: nowIso
      }, { merge: true });

      // 2. Mark any matching DM notifications as read
      const notifQuery = partnerUid 
        ? query(
            collection(db, 'notifications'),
            where('recipientUid', '==', currentUid),
            where('type', '==', 'dm'),
            where('linkId', '==', partnerUid),
            where('read', '==', false)
          )
        : query(
            collection(db, 'notifications'),
            where('recipientUid', '==', currentUid),
            where('type', '==', 'dm'),
            where('read', '==', false)
          );

      const notifSnap = await getDocs(notifQuery);
      if (!notifSnap.empty) {
        const batch = writeBatch(db);
        notifSnap.docs.forEach((d) => {
          batch.update(d.ref, { read: true, readAt: nowIso });
        });
        await batch.commit();
      }
    } catch (err) {
      console.warn('Failed to mark chat as read in Firestore:', err);
    }
  }, [currentUid]);

  // Mark all unread direct messages as read
  const markAllAsRead = useCallback(async () => {
    if (!currentUid) return;

    setUnreadChats([]);
    setNotifDmCount(0);

    if (isFirestoreQuotaExceeded()) return;

    try {
      const nowIso = new Date().toISOString();
      
      // Mark all unread chats
      const chatsQuery = query(
        collection(db, 'chats'),
        where('participantUids', 'array-contains', currentUid)
      );
      const chatsSnap = await getDocs(chatsQuery);
      if (!chatsSnap.empty) {
        const batch = writeBatch(db);
        chatsSnap.docs.forEach((d) => {
          batch.set(d.ref, {
            unreadBy: arrayRemove(currentUid),
            unreadCount: { [currentUid]: 0 },
            lastReadTimestamps: { [currentUid]: nowIso },
            [`lastRead_${currentUid}`]: nowIso
          }, { merge: true });
        });
        await batch.commit();
      }

      // Mark all DM notifications as read
      const notifQuery = query(
        collection(db, 'notifications'),
        where('recipientUid', '==', currentUid),
        where('type', '==', 'dm'),
        where('read', '==', false)
      );
      const notifSnap = await getDocs(notifQuery);
      if (!notifSnap.empty) {
        const batch = writeBatch(db);
        notifSnap.docs.forEach((d) => {
          batch.update(d.ref, { read: true, readAt: nowIso });
        });
        await batch.commit();
      }
    } catch (err) {
      console.warn('Failed to mark all DMs as read:', err);
    }
  }, [currentUid]);

  return {
    unreadCount,
    unreadChats,
    hasUnread: unreadCount > 0,
    loading: loadingChats || loadingNotifs,
    markChatAsRead,
    markAllAsRead
  };
}
