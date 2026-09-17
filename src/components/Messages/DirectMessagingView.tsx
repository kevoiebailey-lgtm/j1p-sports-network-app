import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  MessageSquare, 
  Send, 
  Search, 
  Plus, 
  User, 
  ShieldCheck, 
  Sparkles, 
  CheckCheck, 
  Clock, 
  Filter, 
  Phone, 
  Video, 
  Info, 
  ExternalLink, 
  ChevronRight, 
  Trash2, 
  Smile, 
  Paperclip, 
  Award, 
  School, 
  GraduationCap, 
  MapPin, 
  X, 
  Check, 
  ChevronDown, 
  Lock, 
  AlertCircle, 
  RefreshCw,
  Users,
  Compass,
  FileText,
  Flame,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  doc 
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { 
  directMessagingService, 
  ContactSearchResult 
} from '../../services/directMessagingService';
import { 
  ChatConversation, 
  DirectMessage, 
  ChatParticipant, 
  UserRole 
} from '../../types';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';

// Recruiting Quick Inquiries for Recruiters & Scouts
const RECRUITER_TEMPLATES = [
  {
    title: 'Camp & Combine Invite',
    inquiryType: 'Combine Invitation',
    text: 'Hello! Our coaching staff has evaluated your recent athletic tape and would like to officially invite you to our upcoming Elite Showcase & Combine workout. Let us know if you are available!'
  },
  {
    title: 'Recruiting Evaluation',
    inquiryType: 'Recruiting',
    text: 'Coach here from athletic recruiting. We are currently scouting Class of recruits for our program. We would love to discuss your academic eligibility and athletic trajectory.'
  },
  {
    title: 'Game Film Request',
    inquiryType: 'General',
    text: 'Great performance recently! Could you send over your unedited full-game film and updated season statistics for our scouting staff to review?'
  },
  {
    title: 'Official Program Inquiry',
    inquiryType: 'Camp Offer',
    text: 'We are very impressed by your athleticism and work ethic. Please let us know the best contact number for you and your head coach to schedule a direct introductory phone call.'
  }
];

// Quick Inquiries for Athletes
const ATHLETE_TEMPLATES = [
  {
    title: 'Highlight Reel Submission',
    inquiryType: 'Highlight Reel',
    text: 'Coach, thank you for connecting! Here is my updated highlight reel and verified combine metrics on Just1Play. I would appreciate any feedback on my game.'
  },
  {
    title: 'Combine & Camp Interest',
    inquiryType: 'Evaluation',
    text: 'Coach, I am very interested in your collegiate program and would love to participate in your upcoming camp/showcase. Are there roster spots open for my position?'
  },
  {
    title: 'Academic & GPA Update',
    inquiryType: 'Recruiting',
    text: 'Hello Coach, I wanted to provide an update on my recent academic progress (GPA & transcript) along with my upcoming tournament schedule.'
  },
  {
    title: 'Evaluation Request',
    inquiryType: 'General',
    text: 'Hello Coach! I play varsity athletics and am eager to compete at the next level. Please review my profile and let me know how I can fit into your program.'
  }
];

export const DirectMessagingView: React.FC = () => {
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const currentUid = user?.uid || profile?.uid || '';
  const currentName = user?.displayName || profile?.displayName || 'Sports Member';
  const currentAvatar = user?.photoURL || profile?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80';
  const currentRole = (profile?.role as UserRole) || 'athlete';

  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [loadingChats, setLoadingChats] = useState<boolean>(true);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState<boolean>(false);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [selectedInquiryType, setSelectedInquiryType] = useState<string | null>(null);
  const [isSending, setIsSending] = useState<boolean>(false);

  // Search & Filter state
  const [filterRole, setFilterRole] = useState<'all' | 'scout' | 'athlete' | 'coach' | 'unread'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [messageSearchQuery, setMessageSearchQuery] = useState<string>('');
  const [showSearchInMessage, setShowSearchInMessage] = useState<boolean>(false);

  // New Conversation Modal
  const [showNewChatModal, setShowNewChatModal] = useState<boolean>(false);
  const [contactSearchText, setContactSearchText] = useState<string>('');
  const [contactResults, setContactResults] = useState<ContactSearchResult[]>([]);
  const [isSearchingContacts, setIsSearchingContacts] = useState<boolean>(false);

  // Right Drawer Profile Details
  const [showProfileDrawer, setShowProfileDrawer] = useState<boolean>(true);
  const [showQuickTemplates, setShowQuickTemplates] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);

  // Determine active conversation & partner
  const activeConversation = useMemo(() => {
    return conversations.find((c) => c.id === activeChatId) || null;
  }, [conversations, activeChatId]);

  const activePartner = useMemo<ChatParticipant | null>(() => {
    if (!activeConversation) return null;
    const partner = activeConversation.participants?.find((p) => p.uid !== currentUid);
    if (partner) return partner;
    // Fallback if participants array was incomplete
    const partnerUid = activeConversation.participantUids?.find((uid) => uid !== currentUid) || 'user';
    return {
      uid: partnerUid,
      name: 'Sports Contact',
      role: 'athlete',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'
    };
  }, [activeConversation, currentUid]);

  // Scroll to bottom smoothly
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 1. Listen to all conversations where current user is a participant
  useEffect(() => {
    if (!currentUid || !db) {
      setConversations([]);
      setLoadingChats(false);
      return;
    }

    setLoadingChats(true);
    try {
      const q = query(
        collection(db, 'chats'),
        where('participantUids', 'array-contains', currentUid)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const chatList: ChatConversation[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data()
        })) as ChatConversation[];

        // Sort descending by last message timestamp or updated timestamp
        chatList.sort((a, b) => {
          const timeA = new Date(a.lastMessageTimestamp || a.updatedAt || 0).getTime();
          const timeB = new Date(b.lastMessageTimestamp || b.updatedAt || 0).getTime();
          return timeB - timeA;
        });

        setConversations(chatList);
        setLoadingChats(false);

        // Check if URL searchParam provided target user (e.g. ?userId=xyz or ?chatId=abc)
        const targetUserId = searchParams.get('userId') || searchParams.get('to');
        const targetChatId = searchParams.get('chatId');

        if (targetChatId) {
          setActiveChatId(targetChatId);
        } else if (targetUserId && targetUserId !== currentUid) {
          const existing = chatList.find((c) => c.participantUids?.includes(targetUserId));
          if (existing) {
            setActiveChatId(existing.id);
          } else {
            // Pre-seed a new deterministic chat
            const generatedChatId = directMessagingService.getDeterministicChatId(currentUid, targetUserId);
            setActiveChatId(generatedChatId);
          }
        } else if (!activeChatId && chatList.length > 0) {
          setActiveChatId(chatList[0].id);
        }
      }, (error) => {
        console.warn('[DirectMessaging] Conversation snapshot error:', error);
        setLoadingChats(false);
      });

      return () => unsubscribe();
    } catch (err) {
      console.error('[DirectMessaging] Error listening to conversations:', err);
      setLoadingChats(false);
    }
  }, [currentUid, searchParams]);

  // 2. Listen to messages for the active conversation
  useEffect(() => {
    if (!activeChatId || !db) {
      setMessages([]);
      return;
    }

    setLoadingMessages(true);
    try {
      // Mark active conversation as read
      if (currentUid) {
        directMessagingService.markConversationAsRead(activeChatId, currentUid);
      }

      const messagesQuery = query(
        collection(db, 'chats', activeChatId, 'messages'),
        orderBy('createdAt', 'asc')
      );

      const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
        const msgList: DirectMessage[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data()
        })) as DirectMessage[];

        setMessages(msgList);
        setLoadingMessages(false);
      }, (error) => {
        console.warn('[DirectMessaging] Messages snapshot warning:', error);
        setLoadingMessages(false);
      });

      return () => unsubscribe();
    } catch (err) {
      console.error('[DirectMessaging] Error reading messages:', err);
      setLoadingMessages(false);
    }
  }, [activeChatId, currentUid]);

  // 3. Search contacts for new conversation modal
  useEffect(() => {
    if (!showNewChatModal || !currentUid) return;

    const timer = setTimeout(async () => {
      setIsSearchingContacts(true);
      const results = await directMessagingService.searchContacts(contactSearchText, currentUid);
      setContactResults(results);
      setIsSearchingContacts(false);
    }, 250);

    return () => clearTimeout(timer);
  }, [showNewChatModal, contactSearchText, currentUid]);

  // Handle sending a message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim() || !activePartner || !currentUid || isSending) return;

    const textToSend = inputMessage.trim();
    const inquiry = selectedInquiryType;

    // Reset input fields immediately
    setInputMessage('');
    setSelectedInquiryType(null);
    setShowQuickTemplates(false);
    setIsSending(true);

    // Optimistic UI insert
    const tempId = `temp_${Date.now()}`;
    const optimisticMsg: DirectMessage = {
      id: tempId,
      senderUid: currentUid,
      senderName: currentName,
      senderAvatar: currentAvatar,
      senderRole: currentRole,
      receiverUid: activePartner.uid,
      receiverName: activePartner.name,
      text: textToSend,
      inquiryType: inquiry || undefined,
      createdAt: new Date().toISOString()
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      const result = await directMessagingService.sendDirectMessage({
        senderUid: currentUid,
        senderName: currentName,
        senderAvatar: currentAvatar,
        senderRole: currentRole,
        senderIsVerified: !!profile?.isVerified,
        receiverUid: activePartner.uid,
        receiverName: activePartner.name,
        receiverAvatar: activePartner.avatar,
        receiverRole: activePartner.role,
        text: textToSend,
        inquiryType: inquiry || undefined,
        organization: (profile as any)?.organization || (profile as any)?.school || (currentRole === 'scout' ? 'Recruiting Scout' : undefined),
        sport: (profile as any)?.sport
      });

      if (!activeChatId) {
        setActiveChatId(result.chatId);
      }
    } catch (err: any) {
      console.error('Failed to send message:', err);
      showToast('error', 'Message Not Sent', 'Could not transmit message. Please check connection.');
    } finally {
      setIsSending(false);
      messageInputRef.current?.focus();
    }
  };

  // Start new conversation from contact search
  const handleSelectContactToChat = (contact: ContactSearchResult) => {
    setShowNewChatModal(false);
    const chatId = directMessagingService.getDeterministicChatId(currentUid, contact.uid);
    setActiveChatId(chatId);

    // Check if exists in conversations or create temporary participant wrapper
    const existing = conversations.find((c) => c.id === chatId);
    if (!existing) {
      const newTempConv: ChatConversation = {
        id: chatId,
        participantUids: [currentUid, contact.uid],
        participants: [
          {
            uid: currentUid,
            name: currentName,
            avatar: currentAvatar,
            role: currentRole
          },
          {
            uid: contact.uid,
            name: contact.name,
            avatar: contact.avatar,
            role: contact.role,
            isVerified: contact.isVerified,
            sport: contact.sport,
            position: contact.position,
            organization: contact.organization
          }
        ],
        lastMessage: 'Conversation initiated',
        lastMessageTimestamp: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      setConversations((prev) => [newTempConv, ...prev]);
    }
  };

  // Filter conversations
  const filteredConversations = useMemo(() => {
    return conversations.filter((c) => {
      const partner = c.participants?.find((p) => p.uid !== currentUid);
      const partnerName = partner?.name || '';
      const partnerRole = partner?.role || 'athlete';
      const partnerSport = partner?.sport || '';
      const lastMsg = c.lastMessage || '';

      // Text search match
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches = 
          partnerName.toLowerCase().includes(q) ||
          partnerRole.toLowerCase().includes(q) ||
          partnerSport.toLowerCase().includes(q) ||
          lastMsg.toLowerCase().includes(q);
        if (!matches) return false;
      }

      // Role / Unread tab match
      if (filterRole === 'unread') {
        const hasUnread = (c.unreadCount && c.unreadCount[currentUid] > 0) || (Array.isArray(c.unreadBy) && c.unreadBy.includes(currentUid));
        return hasUnread;
      }
      if (filterRole === 'scout') {
        return (partnerRole as string) === 'scout' || (partnerRole as string) === 'recruiter' || (partnerRole as string) === 'director';
      }
      if (filterRole === 'athlete') {
        return (partnerRole as string) === 'athlete';
      }
      if (filterRole === 'coach') {
        return (partnerRole as string) === 'coach';
      }

      return true;
    });
  }, [conversations, currentUid, searchQuery, filterRole]);

  // Filter messages in active conversation if message search is open
  const displayMessages = useMemo(() => {
    if (!messageSearchQuery.trim()) return messages;
    const q = messageSearchQuery.toLowerCase();
    return messages.filter((m) => m.text?.toLowerCase().includes(q) || m.inquiryType?.toLowerCase().includes(q));
  }, [messages, messageSearchQuery]);

  // Format timestamps cleanly
  const formatTime = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const formatDateHeader = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      const today = new Date();
      if (date.toDateString() === today.toDateString()) {
        return 'Today';
      }
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);
      if (date.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
      }
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return '';
    }
  };

  return (
    <div className="min-h-screen bg-[#0E131F] text-white pt-16 pb-12 px-2 sm:px-4 lg:px-6 flex flex-col">
      
      {/* Top Banner & Security Indicator */}
      <div className="max-w-7xl mx-auto w-full mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-slate-900/90 via-[#161F30] to-slate-900/90 border border-[#24324F] p-3 sm:p-4 rounded-2xl shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00B8D4] to-[#007EA7] flex items-center justify-center text-slate-950 font-black shadow-[0_0_20px_rgba(0,184,212,0.4)]">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black uppercase tracking-tight italic text-white">
                  Direct Messenger
                </h1>
                <span className="px-2 py-0.5 rounded-md bg-[#00B8D4]/15 border border-[#00B8D4]/40 text-[#00B8D4] text-[10px] font-mono font-bold uppercase">
                  Real-Time Hub
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Direct verified communication between athletes, collegiate scouts, recruiters & coaches.
              </p>
            </div>
          </div>

          {/* Security & Privacy Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono">
            <Lock className="w-3.5 h-3.5" />
            <span className="font-bold">Private & End-to-End Authenticated</span>
          </div>
        </div>
      </div>

      {/* Main Messaging Container */}
      <div className="max-w-7xl mx-auto w-full flex-1 h-[750px] min-h-[600px] bg-[#121826] border border-[#24324F] rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row relative">
        
        {/* =========================================================
            LEFT COLUMN: CONVERSATION INBOX & CONTACT SEARCH
           ========================================================= */}
        <div className="w-full md:w-80 lg:w-96 bg-[#0B0F19] border-r border-[#24324F] flex flex-col h-full shrink-0">
          
          {/* Inbox Header */}
          <div className="p-4 border-b border-[#24324F] flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                <span>Inbox</span>
                {conversations.length > 0 && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#24324F] text-slate-300">
                    {conversations.length}
                  </span>
                )}
              </h2>
            </div>
            
            <button
              onClick={() => setShowNewChatModal(true)}
              className="px-3 py-1.5 rounded-xl bg-[#00B8D4] hover:bg-[#00F5D4] text-slate-950 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(0,184,212,0.3)] cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>New Chat</span>
            </button>
          </div>

          {/* Search Conversations Bar */}
          <div className="p-3 border-b border-[#24324F]/60">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search athletes, scouts, coaches..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#161F30] border border-[#24324F] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00B8D4] transition-all font-sans"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick Filter Tabs */}
            <div className="flex items-center gap-1.5 mt-2.5 overflow-x-auto pb-1 no-scrollbar text-[11px] font-bold">
              {[
                { id: 'all', label: 'All' },
                { id: 'scout', label: 'Recruiters' },
                { id: 'athlete', label: 'Athletes' },
                { id: 'coach', label: 'Coaches' },
                { id: 'unread', label: 'Unread' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setFilterRole(tab.id as any)}
                  className={`px-2.5 py-1 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                    filterRole === tab.id
                      ? 'bg-[#00B8D4] text-slate-950 font-black shadow-[0_0_10px_rgba(0,184,212,0.3)]'
                      : 'bg-[#161F30] text-slate-400 hover:text-slate-200 border border-[#24324F]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Conversations List Feed */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {loadingChats ? (
              <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                <RefreshCw className="w-5 h-5 text-[#00B8D4] animate-spin" />
                <span className="text-xs text-slate-500 font-mono">Syncing messaging channels...</span>
              </div>
            ) : filteredConversations.length > 0 ? (
              filteredConversations.map((chat) => {
                const partner = chat.participants?.find((p) => p.uid !== currentUid) || {
                  uid: 'user',
                  name: 'Sports Member',
                  role: 'athlete' as UserRole
                };
                const isSelected = activeChatId === chat.id;
                const unreadCount = chat.unreadCount?.[currentUid] || 0;
                const isUnread = unreadCount > 0 || (Array.isArray(chat.unreadBy) && chat.unreadBy.includes(currentUid));

                return (
                  <button
                    key={chat.id}
                    onClick={() => setActiveChatId(chat.id)}
                    className={`w-full p-3 rounded-2xl flex items-center gap-3 text-left transition-all cursor-pointer border relative ${
                      isSelected
                        ? 'bg-gradient-to-r from-[#00B8D4]/20 to-[#161F30] border-[#00B8D4]/60 text-white shadow-lg'
                        : 'bg-[#121826]/70 hover:bg-[#161F30] border-transparent hover:border-[#24324F] text-slate-300'
                    }`}
                  >
                    {/* Partner Avatar with verified role badge */}
                    <div className="relative shrink-0">
                      <img
                        src={partner.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                        alt={partner.name}
                        className="w-11 h-11 rounded-xl object-cover border border-[#24324F]"
                      />
                      {(partner.role as string) === 'scout' || (partner.role as string) === 'recruiter' ? (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-[9px] font-black" title="Recruiter / Scout">
                          ★
                        </div>
                      ) : (
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#0B0F19] absolute -bottom-0.5 -right-0.5" />
                      )}
                    </div>

                    {/* Partner Info & Last Message Snippet */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className={`text-xs font-black truncate ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                            {partner.name}
                          </span>
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase bg-[#24324F] text-slate-300">
                            {partner.role}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono shrink-0">
                          {formatTime(chat.lastMessageTimestamp || chat.updatedAt)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-[11px] truncate ${isUnread ? 'text-[#00B8D4] font-bold' : 'text-slate-400'}`}>
                          {chat.inquiryType && (
                            <span className="text-[#FF6A00] font-bold mr-1">[{chat.inquiryType}]</span>
                          )}
                          {chat.lastMessage || 'Initiated conversation'}
                        </p>
                        
                        {isUnread && (
                          <span className="w-2 h-2 rounded-full bg-[#FF6A00] shrink-0 animate-pulse" />
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="py-12 px-4 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-[#161F30] border border-[#24324F] flex items-center justify-center text-slate-500 mx-auto">
                  <Compass className="w-6 h-6" />
                </div>
                <h3 className="text-xs font-bold uppercase text-slate-300">No Conversations Found</h3>
                <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                  {searchQuery ? 'No members match your search.' : 'Start a direct chat with any athlete, recruiter or coach on Just1Play.'}
                </p>
                <button
                  onClick={() => setShowNewChatModal(true)}
                  className="px-4 py-2 rounded-xl bg-[#00B8D4]/20 hover:bg-[#00B8D4]/30 border border-[#00B8D4]/40 text-[#00B8D4] text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Start New Conversation</span>
                </button>
              </div>
            )}
          </div>

          {/* User Profile Mini Footer */}
          <div className="p-3 border-t border-[#24324F] bg-[#070A10] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <img
                src={currentAvatar}
                alt={currentName}
                className="w-8 h-8 rounded-lg object-cover border border-[#24324F]"
              />
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">{currentName}</p>
                <p className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Online ({currentRole})</span>
                </p>
              </div>
            </div>
            <Link
              to="/profile"
              className="p-1.5 rounded-lg bg-[#161F30] hover:bg-[#24324F] text-slate-400 hover:text-white transition-all text-xs"
              title="View your sports profile"
            >
              <User className="w-4 h-4" />
            </Link>
          </div>

        </div>

        {/* =========================================================
            CENTER COLUMN: ACTIVE CHAT FEED & MESSAGE THREAD
           ========================================================= */}
        <div className="flex-1 flex flex-col h-full bg-[#121826] relative overflow-hidden">
          
          {activePartner ? (
            <>
              {/* Chat Thread Header */}
              <div className="p-3.5 sm:p-4 border-b border-[#24324F] bg-[#161F30]/80 backdrop-blur-md flex items-center justify-between gap-3 z-10">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative shrink-0">
                    <img
                      src={activePartner.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                      alt={activePartner.name}
                      className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl object-cover border border-[#00B8D4]/40 shadow-[0_0_12px_rgba(0,184,212,0.2)]"
                    />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#161F30] absolute -bottom-0.5 -right-0.5" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm sm:text-base font-black text-white uppercase italic tracking-tight truncate">
                        {activePartner.name}
                      </h3>
                      <span className="px-2 py-0.5 rounded text-[9px] font-mono font-black uppercase bg-[#00B8D4]/20 border border-[#00B8D4]/40 text-[#00B8D4]">
                        {activePartner.role}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      {activePartner.sport && (
                        <span>{activePartner.sport}</span>
                      )}
                      {activePartner.position && (
                        <span>• {activePartner.position}</span>
                      )}
                      {activePartner.organization && (
                        <span>• {activePartner.organization}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Header Action Tools */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowSearchInMessage(!showSearchInMessage)}
                    className={`p-2 rounded-xl border transition-all cursor-pointer ${
                      showSearchInMessage 
                        ? 'bg-[#00B8D4]/20 border-[#00B8D4] text-[#00B8D4]' 
                        : 'bg-[#121826] hover:bg-[#1E293B] border-[#24324F] text-slate-400 hover:text-white'
                    }`}
                    title="Search within conversation"
                  >
                    <Search className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setShowProfileDrawer(!showProfileDrawer)}
                    className={`p-2 rounded-xl border transition-all cursor-pointer ${
                      showProfileDrawer 
                        ? 'bg-[#FF6A00]/20 border-[#FF6A00] text-[#FF6A00]' 
                        : 'bg-[#121826] hover:bg-[#1E293B] border-[#24324F] text-slate-400 hover:text-white'
                    }`}
                    title="Toggle Athlete/Recruiter details"
                  >
                    <Info className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* In-Conversation Search Sub-bar */}
              {showSearchInMessage && (
                <div className="p-2.5 bg-[#0B0F19] border-b border-[#24324F] flex items-center gap-2 animate-fadeIn">
                  <Search className="w-4 h-4 text-slate-400 ml-2" />
                  <input
                    type="text"
                    placeholder="Search in this chat history..."
                    value={messageSearchQuery}
                    onChange={(e) => setMessageSearchQuery(e.target.value)}
                    className="flex-1 bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
                    autoFocus
                  />
                  {messageSearchQuery && (
                    <button onClick={() => setMessageSearchQuery('')} className="text-slate-400 hover:text-white mr-2">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}

              {/* Quick Inquiry Templates Trigger Bar (Athletes & Recruiters) */}
              <div className="px-4 py-2 bg-[#0E1522] border-b border-[#24324F]/50 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
                <div className="flex items-center gap-2 shrink-0 text-[11px] font-bold text-slate-400">
                  <Sparkles className="w-3.5 h-3.5 text-[#00B8D4]" />
                  <span>Quick Templates:</span>
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  {((currentRole as string) === 'scout' || (currentRole as string) === 'director' ? RECRUITER_TEMPLATES : ATHLETE_TEMPLATES).map((tmpl, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setInputMessage(tmpl.text);
                        setSelectedInquiryType(tmpl.inquiryType);
                        messageInputRef.current?.focus();
                      }}
                      className="px-2.5 py-1 rounded-lg bg-[#161F30] hover:bg-[#00B8D4]/20 border border-[#24324F] hover:border-[#00B8D4]/50 text-slate-300 hover:text-[#00B8D4] text-[10px] font-mono whitespace-nowrap transition-all cursor-pointer"
                    >
                      {tmpl.title}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message Feed List */}
              <div className="flex-1 p-4 overflow-y-auto space-y-4">
                {loadingMessages ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-2">
                    <RefreshCw className="w-5 h-5 text-[#00B8D4] animate-spin" />
                    <span className="text-xs font-mono">Loading encrypted message history...</span>
                  </div>
                ) : displayMessages.length > 0 ? (
                  displayMessages.map((msg, idx) => {
                    const isMe = msg.senderUid === currentUid;
                    const prevMsg = idx > 0 ? displayMessages[idx - 1] : null;
                    const showDateHeader = !prevMsg || formatDateHeader(msg.createdAt) !== formatDateHeader(prevMsg.createdAt);

                    return (
                      <React.Fragment key={msg.id || idx}>
                        {showDateHeader && (
                          <div className="flex items-center justify-center my-3">
                            <span className="px-3 py-1 rounded-full bg-[#161F30] border border-[#24324F] text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                              {formatDateHeader(msg.createdAt)}
                            </span>
                          </div>
                        )}

                        <div className={`flex items-end gap-2.5 ${isMe ? 'justify-end' : 'justify-start'}`}>
                          {!isMe && (
                            <img
                              src={msg.senderAvatar || activePartner.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                              alt={msg.senderName}
                              className="w-7 h-7 rounded-lg object-cover border border-[#24324F] mb-1 shrink-0"
                            />
                          )}

                          <div className={`max-w-[85%] sm:max-w-[75%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                            {/* Inquiry Category Header if attached */}
                            {msg.inquiryType && (
                              <div className="mb-1">
                                <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-black uppercase tracking-wider flex items-center gap-1 ${
                                  isMe
                                    ? 'bg-[#FF6A00] text-slate-950'
                                    : 'bg-[#00B8D4]/20 text-[#00B8D4] border border-[#00B8D4]/40'
                                }`}>
                                  <Flame className="w-3 h-3" />
                                  <span>{msg.inquiryType}</span>
                                </span>
                              </div>
                            )}

                            {/* Main Message Bubble */}
                            <div
                              className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-lg ${
                                isMe
                                  ? 'bg-gradient-to-r from-[#00B8D4] to-[#0096B4] text-slate-950 font-medium rounded-br-xs shadow-[0_0_20px_rgba(0,184,212,0.25)]'
                                  : 'bg-[#161F30] text-slate-100 rounded-bl-xs border border-[#24324F]'
                              }`}
                            >
                              <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                            </div>

                            {/* Message Timestamp & Status */}
                            <div className="flex items-center gap-1 mt-1 text-[9px] font-mono text-slate-500">
                              <span>{formatTime(msg.createdAt)}</span>
                              {isMe && (
                                <CheckCheck className="w-3 h-3 text-[#00B8D4]" />
                              )}
                            </div>
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#00B8D4]/20 to-[#FF6A00]/20 border border-[#24324F] flex items-center justify-center text-[#00B8D4]">
                      <Sparkles className="w-7 h-7" />
                    </div>
                    <h4 className="text-sm font-black uppercase tracking-wide text-white">
                      Start Your Direct Conversation
                    </h4>
                    <p className="text-xs text-slate-400 max-w-sm">
                      Send a message, invite {activePartner.name} to a showcase, or submit your sports tape for official collegiate evaluation.
                    </p>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input Bar */}
              <div className="p-3 sm:p-4 border-t border-[#24324F] bg-[#161F30]/90 backdrop-blur-md">
                {selectedInquiryType && (
                  <div className="mb-2 flex items-center justify-between px-3 py-1.5 rounded-xl bg-[#FF6A00]/15 border border-[#FF6A00]/40 text-[#FF6A00] text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <Flame className="w-3.5 h-3.5" />
                      <span>Tagging as: <strong>{selectedInquiryType}</strong></span>
                    </div>
                    <button onClick={() => setSelectedInquiryType(null)} className="hover:text-white">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                  <input
                    ref={messageInputRef}
                    type="text"
                    placeholder={`Message ${activePartner.name}... (Press Enter to send)`}
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    disabled={isSending}
                    className="flex-1 px-4 py-3 rounded-2xl bg-[#0B0F19] border border-[#24324F] text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#00B8D4] transition-all font-sans disabled:opacity-50"
                  />

                  <button
                    type="submit"
                    disabled={!inputMessage.trim() || isSending}
                    className="px-5 py-3 rounded-2xl bg-gradient-to-r from-[#00B8D4] to-[#0096B4] hover:from-[#00F5D4] hover:to-[#00B8D4] text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-[0_0_20px_rgba(0,184,212,0.4)] disabled:opacity-40 transition-all cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span className="hidden sm:inline">Send</span>
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-[#161F30] border border-[#24324F] flex items-center justify-center text-[#00B8D4] shadow-2xl">
                <MessageSquare className="w-8 h-8" />
              </div>
              <h3 className="text-base font-black uppercase italic tracking-tight text-white">
                Select or Start a Direct Message
              </h3>
              <p className="text-xs text-slate-400 max-w-md">
                Choose a conversation from your inbox on the left, or click "New Chat" to search and connect directly with athletes, scouts, and program directors.
              </p>
              <button
                onClick={() => setShowNewChatModal(true)}
                className="px-6 py-3 rounded-2xl bg-[#00B8D4] hover:bg-[#00F5D4] text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-[0_0_20px_rgba(0,184,212,0.3)] transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Start New Conversation</span>
              </button>
            </div>
          )}

        </div>

        {/* =========================================================
            RIGHT DRAWER: ATHLETE / RECRUITER MINI PROFILE CARD
           ========================================================= */}
        {showProfileDrawer && activePartner && (
          <div className="w-full lg:w-72 bg-[#0B0F19] border-l border-[#24324F] p-4 flex flex-col overflow-y-auto shrink-0 animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-[#24324F]">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-300">Contact Details</h4>
              <button onClick={() => setShowProfileDrawer(false)} className="lg:hidden text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 flex flex-col items-center text-center space-y-2 border-b border-[#24324F]">
              <img
                src={activePartner.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                alt={activePartner.name}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-[#00B8D4]/60 shadow-[0_0_20px_rgba(0,184,212,0.3)]"
              />
              <div>
                <h3 className="text-sm font-black uppercase text-white">{activePartner.name}</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-[#24324F] text-[#00B8D4] inline-block mt-1">
                  {activePartner.role}
                </span>
              </div>
            </div>

            {/* Quick Metrics & Sport Info */}
            <div className="py-3 space-y-2.5 text-xs text-slate-300 border-b border-[#24324F]">
              {activePartner.sport && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-mono text-[10px] uppercase">Sport</span>
                  <span className="font-bold text-white">{activePartner.sport}</span>
                </div>
              )}
              {activePartner.position && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-mono text-[10px] uppercase">Position</span>
                  <span className="font-bold text-white">{activePartner.position}</span>
                </div>
              )}
              {activePartner.organization && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-mono text-[10px] uppercase">Program / School</span>
                  <span className="font-bold text-white truncate max-w-[140px] text-right">{activePartner.organization}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="pt-4 space-y-2">
              <Link
                to={`/profile/${activePartner.uid}`}
                className="w-full py-2.5 px-3 rounded-xl bg-[#161F30] hover:bg-[#24324F] text-slate-200 hover:text-white text-xs font-bold flex items-center justify-center gap-1.5 border border-[#24324F] transition-all"
              >
                <User className="w-3.5 h-3.5" />
                <span>View Full Sports Profile</span>
                <ExternalLink className="w-3 h-3 ml-auto text-slate-400" />
              </Link>
            </div>
          </div>
        )}

      </div>

      {/* =========================================================
          MODAL: NEW DIRECT CHAT / SEARCH CONTACTS
         ========================================================= */}
      <AnimatePresence>
        {showNewChatModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-[#121826] border border-[#24324F] rounded-3xl p-6 shadow-2xl space-y-4 text-white"
            >
              <div className="flex items-center justify-between pb-2 border-b border-[#24324F]">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-[#00B8D4]" />
                  <h3 className="text-base font-black uppercase italic tracking-tight text-white">
                    Start Direct Conversation
                  </h3>
                </div>
                <button
                  onClick={() => setShowNewChatModal(false)}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search athletes, recruiters, scouts, coaches..."
                  value={contactSearchText}
                  onChange={(e) => setContactSearchText(e.target.value)}
                  className="w-full pl-9 pr-4 py-3 rounded-xl bg-[#0B0F19] border border-[#24324F] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00B8D4]"
                  autoFocus
                />
              </div>

              {/* Contact Results List */}
              <div className="max-h-72 overflow-y-auto space-y-1.5 p-1">
                {isSearchingContacts ? (
                  <div className="py-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-[#00B8D4]" />
                    <span>Searching athlete & scout database...</span>
                  </div>
                ) : contactResults.length > 0 ? (
                  contactResults.map((contact) => (
                    <button
                      key={contact.uid}
                      onClick={() => handleSelectContactToChat(contact)}
                      className="w-full p-3 rounded-2xl bg-[#161F30]/70 hover:bg-[#161F30] border border-[#24324F] hover:border-[#00B8D4]/60 flex items-center justify-between gap-3 text-left transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={contact.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                          alt={contact.name}
                          className="w-10 h-10 rounded-xl object-cover border border-[#24324F] shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold text-white group-hover:text-[#00B8D4] truncate">
                              {contact.name}
                            </h4>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase bg-[#24324F] text-slate-300">
                              {contact.role}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 truncate">
                            {contact.sport} {contact.position ? `• ${contact.position}` : ''} {contact.organization ? `• ${contact.organization}` : ''}
                          </p>
                        </div>
                      </div>

                      <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-[#00B8D4] shrink-0" />
                    </button>
                  ))
                ) : (
                  <div className="py-8 text-center text-xs text-slate-500">
                    {contactSearchText ? 'No matching athletes or recruiters found.' : 'Type a name, school or sport to find contacts.'}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default DirectMessagingView;
