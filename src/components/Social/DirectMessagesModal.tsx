import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Send, 
  Search, 
  MessageSquare, 
  User, 
  Sparkles, 
  Circle,
  Loader2
} from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  doc,
  serverTimestamp,
  getDocs
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { 
  safeSetDoc, 
  safeAddDoc, 
  isFirestoreQuotaExceeded, 
  isQuotaError, 
  markFirestoreQuotaExceeded,
  createBatchWriter
} from '../../lib/firestoreQuotaGuard';
import { useAuth } from '../../context/AuthContext';
import { notificationService } from '../../services/notificationService';
import { UserRole, DirectMessage, ChatConversation, ChatParticipant } from '../../types';

interface DirectMessagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser?: {
    uid: string;
    name: string;
    avatar?: string;
    role?: UserRole;
  } | null;
}

export const DirectMessagesModal: React.FC<DirectMessagesModalProps> = ({
  isOpen,
  onClose,
  targetUser
}) => {
  const { user, profile } = useAuth();
  const currentUid = user?.uid || profile?.uid || 'demo-user';
  const currentName = user?.displayName || profile?.displayName || 'Sports Athlete';
  const currentAvatar = user?.photoURL || profile?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80';
  const currentRole = profile?.role || 'athlete';

  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [activeParticipant, setActiveParticipant] = useState<ChatParticipant | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load user conversations
  useEffect(() => {
    if (!isOpen || !currentUid) return;

    setLoadingChats(true);
    try {
      const q = query(
        collection(db, 'chats'),
        where('participantUids', 'array-contains', currentUid)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const chatsList: ChatConversation[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data()
        })) as ChatConversation[];

        setConversations(chatsList);
        setLoadingChats(false);

        // If targetUser was passed, select or start conversation
        if (targetUser) {
          const existing = chatsList.find(c => c.participantUids.includes(targetUser.uid));
          if (existing) {
            setActiveChatId(existing.id);
            const partner = existing.participants.find(p => p.uid !== currentUid) || {
              uid: targetUser.uid,
              name: targetUser.name,
              avatar: targetUser.avatar,
              role: targetUser.role || 'athlete'
            };
            setActiveParticipant(partner);
          } else {
            // Create temporary active participant
            setActiveParticipant({
              uid: targetUser.uid,
              name: targetUser.name,
              avatar: targetUser.avatar,
              role: targetUser.role || 'athlete'
            });
            // Construct deterministic chat ID
            const newChatId = [currentUid, targetUser.uid].sort().join('_');
            setActiveChatId(newChatId);
          }
        } else if (chatsList.length > 0 && !activeChatId) {
          setActiveChatId(chatsList[0].id);
          const partner = chatsList[0].participants?.find(p => p.uid !== currentUid) || null;
          setActiveParticipant(partner);
        }
      }, (error) => {
        console.warn('Firestore snapshot error for chats:', error);
        setLoadingChats(false);
      });

      return () => unsubscribe();
    } catch (err) {
      console.error('Error loading conversations:', err);
      setLoadingChats(false);
    }
  }, [isOpen, currentUid, targetUser]);

  // Load messages for active chat and mark as read
  useEffect(() => {
    if (!activeChatId || !isOpen) return;

    setLoadingMessages(true);
    try {
      // 1. Mark this active chat as read in Firestore
      if (!isFirestoreQuotaExceeded() && currentUid) {
        const nowIso = new Date().toISOString();
        const chatRef = doc(db, 'chats', activeChatId);
        safeSetDoc(chatRef, {
          unreadCount: {
            [currentUid]: 0
          },
          lastReadTimestamps: {
            [currentUid]: nowIso
          },
          [`lastRead_${currentUid}`]: nowIso
        }, { merge: true }).catch(e => console.warn('Could not mark chat read:', e));

        // Mark matching DM notifications as read
        const notifQuery = query(
          collection(db, 'notifications'),
          where('recipientUid', '==', currentUid),
          where('type', '==', 'dm'),
          where('read', '==', false)
        );
        getDocs(notifQuery).then(snap => {
          if (!snap.empty) {
            const batch = createBatchWriter();
            snap.docs.forEach(d => {
              const data = d.data();
              if (activeParticipant && data.linkId === activeParticipant.uid) {
                batch.update(d.ref, { read: true, readAt: nowIso });
              }
            });
            batch.commit().catch(err => console.warn('Could not batch mark DM notifs read:', err));
          }
        }).catch(err => console.warn('DM notifs read query notice:', err));
      }

      const q = query(
        collection(db, 'chats', activeChatId, 'messages'),
        orderBy('createdAt', 'asc')
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const msgList: DirectMessage[] = snapshot.docs.map(d => ({
          id: d.id,
          ...d.data()
        })) as DirectMessage[];

        setMessages(msgList);
        setLoadingMessages(false);
      }, (error) => {
        console.warn('Firestore error reading messages:', error);
        setLoadingMessages(false);
      });

      return () => unsubscribe();
    } catch (err) {
      console.error('Error listening to messages:', err);
      setLoadingMessages(false);
    }
  }, [activeChatId, isOpen, currentUid, activeParticipant]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !activeParticipant) return;

    const msgText = inputMessage.trim();
    setInputMessage('');

    const chatId = activeChatId || [currentUid, activeParticipant.uid].sort().join('_');
    const localMsgId = `local-msg-${Date.now()}`;
    const newMsg: DirectMessage = {
      id: localMsgId,
      senderUid: currentUid,
      senderName: currentName,
      senderAvatar: currentAvatar,
      senderRole: currentRole,
      receiverUid: activeParticipant.uid,
      receiverName: activeParticipant.name,
      text: msgText,
      createdAt: new Date().toISOString()
    };

    // Optimistic UI update so conversation never feels frozen
    setMessages(prev => [...prev, newMsg]);

    try {
      if (!isFirestoreQuotaExceeded()) {
        // 1. Ensure conversation document exists
        const chatRef = doc(db, 'chats', chatId);
        const nowIso = new Date().toISOString();
        const conversationData: ChatConversation = {
          id: chatId,
          participantUids: [currentUid, activeParticipant.uid],
          participants: [
            {
              uid: currentUid,
              name: currentName,
              avatar: currentAvatar,
              role: currentRole
            },
            {
              uid: activeParticipant.uid,
              name: activeParticipant.name,
              avatar: activeParticipant.avatar,
              role: activeParticipant.role
            }
          ],
          lastMessage: msgText,
          lastSenderUid: currentUid,
          lastMessageTimestamp: nowIso,
          updatedAt: nowIso,
          unreadBy: [activeParticipant.uid],
          unreadCount: {
            [activeParticipant.uid]: 1,
            [currentUid]: 0
          },
          [`lastRead_${currentUid}`]: nowIso
        };

        // 1 & 2. Write conversation header and message atomically in 1 batch request
        const batchWriter = createBatchWriter();
        batchWriter.set(chatRef, conversationData, { merge: true });

        const messageDocRef = doc(collection(db, 'chats', chatId, 'messages'));
        batchWriter.set(messageDocRef, {
          senderUid: currentUid,
          senderName: currentName,
          senderAvatar: currentAvatar,
          senderRole: currentRole,
          receiverUid: activeParticipant.uid,
          receiverName: activeParticipant.name,
          text: msgText,
          createdAt: new Date().toISOString()
        });

        await batchWriter.commit();
      }

      // 3. Dispatch real-time notification to receiver
      notificationService.sendDirectMessageAlert({
        recipientUid: activeParticipant.uid,
        senderUid: currentUid,
        senderName: currentName,
        senderAvatar: currentAvatar,
        message: msgText
      }).catch(err => console.warn('DM notification alert notice:', err));

      if (!activeChatId) {
        setActiveChatId(chatId);
      }
    } catch (err) {
      console.warn('Failed to send message:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#212A31]/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-4xl h-[620px] rounded-3xl bg-white dark:bg-[#212A31] border border-gray-200 dark:border-white/15 shadow-2xl flex flex-col md:flex-row overflow-hidden">
        
        {/* Left Sidebar: Conversations List */}
        <div className="w-full md:w-80 bg-gray-50 dark:bg-black/40 border-r border-gray-200 dark:border-white/10 flex flex-col h-1/3 md:h-full">
          <div className="p-4 border-b border-gray-200 dark:border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-red-600 dark:text-[#E5B868]" />
              <h3 className="font-bold text-slate-900 dark:text-white text-sm uppercase tracking-wider">Direct Messages</h3>
            </div>
            <button 
              onClick={onClose}
              className="md:hidden p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {loadingChats ? (
              <div className="p-6 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-red-600 dark:text-[#E5B868]" />
                <span>Loading channels...</span>
              </div>
            ) : conversations.length > 0 ? (
              conversations.map((chat, idx) => {
                const partner = chat.participants?.find(p => p.uid !== currentUid) || {
                  uid: 'user',
                  name: 'Sports Contact',
                  role: 'athlete' as UserRole
                };
                const isSelected = activeChatId === chat.id;

                return (
                  <button
                    key={chat.id || `chat-${idx}`}
                    onClick={() => {
                      setActiveChatId(chat.id);
                      setActiveParticipant(partner);
                    }}
                    className={`w-full p-3 rounded-2xl flex items-center gap-3 text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#E5B868]/15 border border-[#E5B868]/40 text-slate-900 dark:text-white'
                        : 'hover:bg-gray-200 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300 border border-transparent'
                    }`}
                  >
                    <div className="relative">
                      <img
                        src={partner.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                        alt={partner.name}
                        className="w-10 h-10 rounded-xl object-cover border border-gray-200 dark:border-white/20"
                      />
                      <Circle className="w-3 h-3 text-red-600 dark:text-[#E5B868] stroke-[2] absolute -bottom-0.5 -right-0.5 bg-white dark:bg-black rounded-full" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs truncate text-slate-900 dark:text-white">{partner.name}</span>
                        <span className="text-[9px] text-slate-500 dark:text-slate-400 font-mono">
                          {chat.updatedAt ? new Date(chat.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">{chat.lastMessage || 'No messages yet'}</p>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="p-6 text-center text-xs text-slate-500 italic">
                No active conversations. Click "Message" on any user post or profile to initiate a direct chat!
              </div>
            )}
          </div>
        </div>

        {/* Right Main Chat Area */}
        <div className="flex-1 flex flex-col h-2/3 md:h-full bg-white dark:bg-[#212A31]/40">
          
          {/* Chat Header */}
          <div className="p-4 border-b border-gray-200 dark:border-white/10 flex items-center justify-between bg-gray-50 dark:bg-black/20">
            {activeParticipant ? (
              <div className="flex items-center gap-3">
                <img
                  src={activeParticipant.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                  alt={activeParticipant.name}
                  className="w-10 h-10 rounded-xl object-cover border border-gray-200 dark:border-white/20"
                />
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                    <span>{activeParticipant.name}</span>
                    <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-[#E5B868]/20 text-slate-900 dark:text-[#E5B868] border border-[#E5B868]/40">
                      {activeParticipant.role.replace('_', ' ')}
                    </span>
                  </h4>
                  <div className="flex items-center gap-1.5 text-[10px] text-red-600 dark:text-[#E5B868] font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-600 dark:bg-[#E5B868] animate-pulse" />
                    <span>Online & Ready</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-slate-500 dark:text-slate-400 text-xs italic">Select a contact to start chatting</div>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-gray-200 dark:bg-white/5 hover:bg-gray-300 dark:hover:bg-white/15 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all hidden md:block cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3">
            {loadingMessages ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-500 gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-red-600 dark:text-[#E5B868]" />
                <span>Loading messages...</span>
              </div>
            ) : messages.length > 0 ? (
              messages.map((msg, idx) => {
                const isMe = msg.senderUid === currentUid;
                return (
                  <div
                    key={msg.id || `msg-${idx}`}
                    className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl p-3 text-xs leading-relaxed shadow-lg ${
                        isMe
                          ? 'bg-[#E5B868] text-black font-medium rounded-br-none shadow-[0_0_15px_rgba(214,28,36,0.2)]'
                          : 'bg-gray-100 dark:bg-white/10 text-slate-900 dark:text-white rounded-bl-none border border-gray-200 dark:border-white/10'
                      }`}
                    >
                      <p>{msg.text}</p>
                      <div
                        className={`text-[9px] font-mono mt-1 text-right ${
                          isMe ? 'text-black/70' : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs italic space-y-2">
                <Sparkles className="w-8 h-8 text-red-600 dark:text-[#E5B868] opacity-50" />
                <p>Send a direct message to start the conversation.</p>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <form onSubmit={handleSendMessage} className="p-3 border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/40 flex gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={activeParticipant ? `Message ${activeParticipant.name}...` : 'Type a message...'}
              disabled={!activeParticipant}
              className="flex-1 px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-black/80 border border-gray-200 dark:border-white/15 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#E5B868] disabled:opacity-50 font-sans"
            />
            <button
              type="submit"
              disabled={!activeParticipant || !inputMessage.trim()}
              className="px-5 py-2.5 rounded-xl bg-[#E5B868] hover:bg-[#B8141B] text-black font-black text-xs uppercase tracking-wider disabled:opacity-50 transition-all flex items-center gap-1.5 shadow-[0_0_12px_rgba(214,28,36,0.3)] cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </form>

        </div>

      </div>
    </div>
  );
};
