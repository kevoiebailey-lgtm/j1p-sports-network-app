import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mail, 
  Send, 
  Inbox, 
  Star, 
  Search, 
  RefreshCw, 
  Trash2, 
  ExternalLink, 
  Plus, 
  X, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  LogOut, 
  User as UserIcon,
  Sparkles,
  ArrowRight,
  Filter,
  Eye,
  MailCheck,
  MailOpen
} from 'lucide-react';
import { BentoCard } from '../BentoCard';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { 
  signInWithGoogleGmail, 
  disconnectGoogleGmail, 
  fetchGmailProfile, 
  fetchGmailMessages, 
  sendGmailEmail, 
  toggleStarGmailMessage, 
  toggleReadGmailMessage, 
  trashGmailMessage, 
  GmailMessageItem, 
  GmailUserProfile, 
  getGmailAccessToken 
} from '../../lib/gmailService';

export const GmailInboxHub: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [token, setToken] = useState<string | null>(getGmailAccessToken());
  const [userProfile, setUserProfile] = useState<GmailUserProfile | null>(null);
  const [messages, setMessages] = useState<GmailMessageItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters & Query
  const [queryCategory, setQueryCategory] = useState<'inbox' | 'starred' | 'unread' | 'sent'>('inbox');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [selectedMessage, setSelectedMessage] = useState<GmailMessageItem | null>(null);
  const [showComposeModal, setShowComposeModal] = useState<boolean>(false);

  // Compose State
  const [composeTo, setComposeTo] = useState<string>('');
  const [composeSubject, setComposeSubject] = useState<string>('');
  const [composeBody, setComposeBody] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);

  // Mandatory Delete Confirmation Modal
  const [deletingMessage, setDeletingMessage] = useState<GmailMessageItem | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Auto load profile and emails when connected
  useEffect(() => {
    if (token) {
      loadProfileAndEmails(token, queryCategory, searchQuery);
    }
  }, [token]);

  const loadProfileAndEmails = async (
    authToken: string, 
    cat: 'inbox' | 'starred' | 'unread' | 'sent' = queryCategory,
    search: string = searchQuery
  ) => {
    setLoading(true);
    setErrorMsg(null);

    try {
      // 1. Fetch User Profile
      const prof = await fetchGmailProfile(authToken);
      setUserProfile(prof);

      // 2. Build Query String
      let q = 'in:inbox';
      if (cat === 'starred') q = 'is:starred';
      else if (cat === 'unread') q = 'is:unread';
      else if (cat === 'sent') q = 'in:sent';

      if (search.trim()) {
        q += ` ${search.trim()}`;
      }

      const msgs = await fetchGmailMessages(authToken, q, 25);
      setMessages(msgs);
    } catch (err: any) {
      console.error('Gmail loading error:', err);
      setErrorMsg(err?.message || 'Unable to connect to Gmail API. Token may be expired.');
    } finally {
      setLoading(false);
    }
  };

  const handleConnectGmail = async () => {
    setErrorMsg(null);
    setLoading(true);
    try {
      const res = await signInWithGoogleGmail();
      if (res?.accessToken) {
        setToken(res.accessToken);
        showToast('success', 'Gmail Connected!', 'Access granted to Gmail inbox & email services.');
      }
    } catch (err: any) {
      console.error('Gmail connect error:', err);
      setErrorMsg(err?.message || 'Failed to authenticate with Google Gmail.');
      showToast('error', 'Connection Failed', 'Could not authenticate with Gmail.');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    await disconnectGoogleGmail();
    setToken(null);
    setUserProfile(null);
    setMessages([]);
    showToast('info', 'Gmail Disconnected', 'Signed out of Gmail session.');
  };

  const handleCategoryChange = (cat: 'inbox' | 'starred' | 'unread' | 'sent') => {
    setQueryCategory(cat);
    if (token) {
      loadProfileAndEmails(token, cat, searchQuery);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (token) {
      loadProfileAndEmails(token, queryCategory, searchQuery);
    }
  };

  const handleToggleStar = async (msg: GmailMessageItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!token) return;

    try {
      const newStarState = !msg.isStarred;
      // Optimistic update
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isStarred: newStarState } : m));
      
      await toggleStarGmailMessage(token, msg.id, msg.isStarred);
      showToast('success', newStarState ? 'Starred' : 'Unstarred', 'Email label updated.');
    } catch (err) {
      console.error('Toggle star error:', err);
      showToast('error', 'Update Failed', 'Could not update star status.');
      // Revert
      if (token) loadProfileAndEmails(token);
    }
  };

  const handleToggleRead = async (msg: GmailMessageItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!token) return;

    try {
      const markRead = msg.isUnread; // if unread, mark read
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isUnread: !markRead } : m));
      
      await toggleReadGmailMessage(token, msg.id, markRead);
    } catch (err) {
      console.error('Toggle read error:', err);
    }
  };

  const handleOpenDetail = (msg: GmailMessageItem) => {
    setSelectedMessage(msg);
    if (msg.isUnread) {
      handleToggleRead(msg);
    }
  };

  // Send Email Handler
  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !composeTo.trim() || !composeSubject.trim() || !composeBody.trim() || isSending) return;

    setIsSending(true);
    try {
      await sendGmailEmail(token, composeTo.trim(), composeSubject.trim(), composeBody.trim());
      showToast('success', 'Email Sent!', `Your message was delivered to ${composeTo.trim()}`);
      
      // Reset compose state
      setShowComposeModal(false);
      setComposeTo('');
      setComposeSubject('');
      setComposeBody('');

      // Refresh list
      loadProfileAndEmails(token);
    } catch (err: any) {
      console.error('Send email error:', err);
      showToast('error', 'Send Failed', err?.message || 'Could not send email via Gmail.');
    } finally {
      setIsSending(false);
    }
  };

  // Destructive Delete Execution
  const handleConfirmTrash = async () => {
    if (!token || !deletingMessage || isDeleting) return;

    setIsDeleting(true);
    try {
      await trashGmailMessage(token, deletingMessage.id);
      showToast('success', 'Email Trashed', 'The message was moved to Trash.');
      
      setMessages(prev => prev.filter(m => m.id !== deletingMessage.id));
      if (selectedMessage?.id === deletingMessage.id) {
        setSelectedMessage(null);
      }
      setDeletingMessage(null);
    } catch (err: any) {
      console.error('Trash email error:', err);
      showToast('error', 'Delete Failed', err?.message || 'Failed to move email to Trash.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Hero Header Section */}
      <div className="relative rounded-3xl bg-gradient-to-br from-[#222220] via-[#222220] to-[#222220] border border-slate-800 p-6 sm:p-10 overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-mono font-bold uppercase tracking-wider">
              <Mail className="w-3.5 h-3.5" />
              <span>Official Gmail Workspace Hub</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Gmail Communications & Recruiting Inbox
            </h1>
            <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
              Connect your Gmail account to manage coach inquiries, recruit offers, scout communications, and game schedule notifications seamlessly within Just1Play.
            </p>
          </div>

          {/* Account Status / Connect Button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {token ? (
              <div className="flex items-center gap-3 p-2 bg-[#222220]/80 border border-slate-800 rounded-2xl backdrop-blur-md">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-red-500 to-rose-600 flex items-center justify-center text-white font-bold shadow-md shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
                <div className="min-w-0 pr-2">
                  <p className="text-xs font-mono font-bold text-red-500 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Gmail Active
                  </p>
                  <p className="text-xs font-bold text-white truncate max-w-[180px]">
                    {userProfile?.emailAddress || user?.email || 'Connected User'}
                  </p>
                </div>
                <button
                  onClick={handleDisconnect}
                  className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-xl transition-colors shrink-0"
                  title="Disconnect Gmail Account"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleConnectGmail}
                disabled={loading}
                className="gsi-material-button px-6 py-3.5 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-red-500 text-white font-bold text-sm shadow-xl hover:shadow-red-500/20 hover:scale-[1.02] active:scale-98 transition-all flex items-center justify-center gap-2.5 cursor-pointer"
              >
                <div className="w-5 h-5 flex items-center justify-center">
                  <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  </svg>
                </div>
                <span>Connect with Gmail</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Inbox Portal Container */}
      {!token ? (
        <BentoCard className="p-12 text-center space-y-6">
          <div className="w-20 h-20 rounded-3xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mx-auto">
            <Mail className="w-10 h-10" />
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h2 className="text-2xl font-black text-white">Gmail Access Required</h2>
            <p className="text-slate-400 text-sm">
              Please sign in with your Google account to grant permission to read and send messages directly through Gmail API.
            </p>
          </div>
          <button
            onClick={handleConnectGmail}
            className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 text-white font-bold text-sm shadow-xl hover:shadow-red-500/20 hover:scale-105 transition-all inline-flex items-center gap-2 cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Authorize Gmail Access</span>
          </button>
        </BentoCard>
      ) : (
        <div className="space-y-6">
          {/* Controls Bar: Search + Filter Tabs + Compose Button */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-[#222220]/60 p-4 rounded-3xl border border-slate-800 backdrop-blur-xl">
            {/* Category Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 lg:pb-0 scrollbar-none">
              <button
                onClick={() => handleCategoryChange('inbox')}
                className={`px-4 py-2 rounded-2xl font-mono text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  queryCategory === 'inbox' 
                    ? 'bg-red-600 text-white shadow-lg shadow-red-600/30' 
                    : 'bg-slate-800/80 text-slate-400 hover:text-white'
                }`}
              >
                <Inbox className="w-4 h-4" />
                <span>Inbox</span>
              </button>

              <button
                onClick={() => handleCategoryChange('unread')}
                className={`px-4 py-2 rounded-2xl font-mono text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  queryCategory === 'unread' 
                    ? 'bg-red-600 text-white shadow-lg shadow-red-600/30' 
                    : 'bg-slate-800/80 text-slate-400 hover:text-white'
                }`}
              >
                <Mail className="w-4 h-4" />
                <span>Unread</span>
              </button>

              <button
                onClick={() => handleCategoryChange('starred')}
                className={`px-4 py-2 rounded-2xl font-mono text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  queryCategory === 'starred' 
                    ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/30' 
                    : 'bg-slate-800/80 text-slate-400 hover:text-white'
                }`}
              >
                <Star className="w-4 h-4 fill-current" />
                <span>Starred</span>
              </button>

              <button
                onClick={() => handleCategoryChange('sent')}
                className={`px-4 py-2 rounded-2xl font-mono text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  queryCategory === 'sent' 
                    ? 'bg-red-600 text-white shadow-lg shadow-red-600/30' 
                    : 'bg-slate-800/80 text-slate-400 hover:text-white'
                }`}
              >
                <Send className="w-4 h-4" />
                <span>Sent</span>
              </button>
            </div>

            {/* Search Input & Action Buttons */}
            <div className="flex items-center gap-3 flex-1 lg:max-w-md">
              <form onSubmit={handleSearchSubmit} className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search emails by coach, athlete, subject..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#222220] border border-slate-800 rounded-2xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500 transition-colors"
                />
              </form>

              <button
                onClick={() => loadProfileAndEmails(token)}
                disabled={loading}
                className="p-2.5 bg-[#222220] hover:bg-slate-800 border border-slate-800 rounded-2xl text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Refresh Inbox"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-red-400' : ''}`} />
              </button>

              <button
                onClick={() => setShowComposeModal(true)}
                className="px-4 py-2.5 bg-gradient-to-r from-red-600 to-red-600 text-slate-950 font-extrabold text-xs rounded-2xl shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Compose</span>
              </button>
            </div>
          </div>

          {/* Error Notice */}
          {errorMsg && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
              <button
                onClick={handleConnectGmail}
                className="underline hover:text-rose-100 font-bold"
              >
                Reconnect
              </button>
            </div>
          )}

          {/* Email Messages List */}
          {loading ? (
            <div className="p-12 text-center space-y-4">
              <RefreshCw className="w-8 h-8 text-red-500 animate-spin mx-auto" />
              <p className="text-slate-400 font-mono text-xs">Fetching messages from Gmail API...</p>
            </div>
          ) : messages.length === 0 ? (
            <BentoCard className="p-12 text-center space-y-4">
              <Inbox className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="text-lg font-bold text-white">No Emails Found</h3>
              <p className="text-slate-400 text-xs max-w-sm mx-auto">
                No email messages matched your category filter or search query.
              </p>
            </BentoCard>
          ) : (
            <div className="space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  onClick={() => handleOpenDetail(msg)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center gap-4 group ${
                    msg.isUnread
                      ? 'bg-[#222220]/90 border-red-500/30 hover:border-red-500/60 shadow-lg shadow-red-500/5'
                      : 'bg-[#222220]/40 border-slate-800/80 hover:border-slate-700 hover:bg-[#222220]/70'
                  }`}
                >
                  {/* Star Toggle Button */}
                  <button
                    onClick={(e) => handleToggleStar(msg, e)}
                    className="p-1 text-slate-500 hover:text-amber-400 transition-colors"
                  >
                    <Star
                      className={`w-5 h-5 ${
                        msg.isStarred ? 'text-amber-400 fill-amber-400' : 'stroke-[1.5]'
                      }`}
                    />
                  </button>

                  {/* Sender & Unread Indicator */}
                  <div className="w-48 shrink-0 min-w-0">
                    <div className="flex items-center gap-2">
                      {msg.isUnread && (
                        <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] shrink-0" />
                      )}
                      <p className={`text-xs truncate ${msg.isUnread ? 'font-black text-white' : 'font-semibold text-slate-300'}`}>
                        {msg.from.replace(/<.*>/, '').trim()}
                      </p>
                    </div>
                  </div>

                  {/* Subject & Snippet */}
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <p className={`text-xs truncate ${msg.isUnread ? 'font-bold text-white' : 'font-medium text-slate-200'}`}>
                      {msg.subject}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate font-mono">
                      {msg.snippet}
                    </p>
                  </div>

                  {/* Date Badge */}
                  <div className="text-[10px] font-mono text-slate-400 shrink-0">
                    {msg.date.split(',')[0] || msg.date}
                  </div>

                  {/* Actions on Hover */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingMessage(msg);
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/20 rounded-lg transition-colors"
                      title="Move to Trash (Requires Confirmation)"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Email Detail View Modal / Overlay */}
      <AnimatePresence>
        {selectedMessage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-3xl bg-[#222220] border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl max-h-[90vh] flex flex-col"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-800">
                <div className="space-y-1 min-w-0">
                  <h2 className="text-xl font-black text-white">{selectedMessage.subject}</h2>
                  <p className="text-xs font-mono text-slate-400">From: {selectedMessage.from}</p>
                  <p className="text-[10px] font-mono text-slate-500">Date: {selectedMessage.date}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setDeletingMessage(selectedMessage)}
                    className="p-2 text-rose-400 hover:bg-rose-500/20 rounded-xl transition-colors"
                    title="Trash Message"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setSelectedMessage(null)}
                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto space-y-4 text-xs sm:text-sm text-slate-200 leading-relaxed font-sans pr-2">
                {selectedMessage.bodyHtml ? (
                  <div 
                    dangerouslySetInnerHTML={{ __html: selectedMessage.bodyHtml }} 
                    className="prose prose-invert max-w-none text-slate-300"
                  />
                ) : (
                  <p className="whitespace-pre-wrap">{selectedMessage.bodyText}</p>
                )}
              </div>

              {/* Footer Reply Action */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                <button
                  onClick={() => {
                    const replyToEmail = selectedMessage.from.match(/<([^>]+)>/)?.[1] || selectedMessage.from;
                    setComposeTo(replyToEmail);
                    setComposeSubject(`Re: ${selectedMessage.subject}`);
                    setSelectedMessage(null);
                    setShowComposeModal(true);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-red-600 text-white font-bold text-xs flex items-center gap-2 hover:bg-red-500 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Reply via Gmail</span>
                </button>

                <button
                  onClick={() => setSelectedMessage(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs hover:text-white"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Compose Email Modal */}
      <AnimatePresence>
        {showComposeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="w-full max-w-xl bg-[#222220] border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Mail className="w-5 h-5 text-red-500" />
                  <h3 className="text-lg font-black text-white">Compose Gmail Message</h3>
                </div>
                <button
                  onClick={() => setShowComposeModal(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSendEmail} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono font-bold text-slate-400 mb-1">To Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="coach@university.edu or athlete@email.com"
                    value={composeTo}
                    onChange={(e) => setComposeTo(e.target.value)}
                    className="w-full bg-[#222220] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-red-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-slate-400 mb-1">Subject</label>
                  <input
                    type="text"
                    required
                    placeholder="Recruiting Highlight / Game Schedule Inquiry"
                    value={composeSubject}
                    onChange={(e) => setComposeSubject(e.target.value)}
                    className="w-full bg-[#222220] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-red-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-slate-400 mb-1">Message Body</label>
                  <textarea
                    rows={6}
                    required
                    placeholder="Write your email message here..."
                    value={composeBody}
                    onChange={(e) => setComposeBody(e.target.value)}
                    className="w-full bg-[#222220] border border-slate-800 rounded-xl p-3.5 text-xs text-white focus:outline-none focus:border-red-600 resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowComposeModal(false)}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSending}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-red-600 text-slate-950 font-black text-xs shadow-lg hover:scale-105 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    {isSending ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    <span>{isSending ? 'Sending via Gmail...' : 'Send Email'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mandatory User Confirmation Modal for Destructive Operations */}
      <AnimatePresence>
        {deletingMessage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-md bg-[#222220] border border-rose-500/40 rounded-3xl p-6 space-y-5 shadow-2xl"
            >
              <div className="flex items-center gap-3 text-rose-400">
                <div className="p-3 bg-rose-500/20 rounded-2xl border border-rose-500/30">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">Trash Email Message?</h3>
                  <p className="text-xs font-mono text-rose-300">Mandatory Confirmation</p>
                </div>
              </div>

              <div className="p-3 bg-[#222220] border border-slate-800 rounded-2xl text-xs text-slate-300 space-y-1">
                <p className="font-bold text-white truncate">"{deletingMessage.subject}"</p>
                <p className="text-slate-400 font-mono text-[11px]">From: {deletingMessage.from}</p>
                <p className="text-slate-400 mt-2">
                  Are you sure you want to move this email to Trash in your Gmail account?
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setDeletingMessage(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmTrash}
                  disabled={isDeleting}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg cursor-pointer"
                >
                  {isDeleting ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  <span>Confirm Trash</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
