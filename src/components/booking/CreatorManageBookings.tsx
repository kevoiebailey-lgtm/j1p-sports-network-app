import React, { useState, useEffect, useMemo } from 'react';
import { 
  Camera, 
  Film, 
  Video, 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  CheckCircle, 
  AlertCircle, 
  ExternalLink, 
  Folder, 
  Send, 
  Clock3, 
  Search, 
  Filter, 
  DollarSign, 
  ShieldCheck, 
  Copy, 
  Check, 
  ChevronRight, 
  X, 
  Sparkles, 
  Lock,
  Layers,
  ArrowUpRight,
  Info,
  RefreshCw
} from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  updateDoc, 
  serverTimestamp, 
  orderBy,
  getDocs
} from 'firebase/firestore';
import { db, sanitizeFirestorePayload } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export interface BookingRecord {
  id: string;
  creatorId: string;
  creatorName?: string;
  creatorEmail?: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  userPhone?: string;
  packageId: string;
  packageName: string;
  packageCategory?: string;
  packageSubtitle?: string;
  subtotal: number;
  serviceFee: number;
  totalAmount: number;
  currency: string;
  status: 'confirmed' | 'in_progress' | 'delivered' | 'cancelled';
  paymentStatus: 'paid' | 'pending' | 'refunded';
  paymentProvider?: string;
  paypalOrderId?: string;
  gameDate: string;
  gameTime: string;
  venueName: string;
  venueCity: string;
  venueState: string;
  fieldNumber?: string;
  athleteName: string;
  athleteJersey: string;
  athleteTeam: string;
  notes?: string;
  driveUrl?: string;
  deliveryNotes?: string;
  deliveryStatus?: string;
  deliveredAt?: any;
  createdAt?: any;
  updatedAt?: any;
}

export interface CreatorManageBookingsProps {
  className?: string;
  customCreatorId?: string;
  onOpenBookingDesk?: () => void;
}

export default function CreatorManageBookings({
  className = '',
  customCreatorId,
  onOpenBookingDesk
}: CreatorManageBookingsProps) {
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  const isAdmin = profile?.role === 'admin' || user?.email === 'kevoiebailey@gmail.com';

  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'upcoming' | 'in_progress' | 'completed' | 'all'>('upcoming');
  const [searchQuery, setSearchQuery] = useState('');

  // Delivery Modal State
  const [selectedBookingForDelivery, setSelectedBookingForDelivery] = useState<BookingRecord | null>(null);
  const [deliveryDriveUrl, setDeliveryDriveUrl] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [isSubmittingDelivery, setIsSubmittingDelivery] = useState(false);
  const [deliveryUrlError, setDeliveryUrlError] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Active Target Creator UID (either passed in or current user's UID)
  const activeCreatorUid = customCreatorId || user?.uid;

  // Real-time Firestore query listener
  useEffect(() => {
    if (!user || !activeCreatorUid) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    let unsubscribe: (() => void) | null = null;

    try {
      const bookingsRef = collection(db, 'bookings');
      
      // If admin and no specific creator filtered, allow viewing all
      let q = query(
        bookingsRef,
        where('creatorId', '==', activeCreatorUid)
      );

      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const list: BookingRecord[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            list.push({
              id: docSnap.id,
              ...data
            } as BookingRecord);
          });

          // Sort in memory by gameDate or createdAt (newest / upcoming first)
          list.sort((a, b) => {
            const dateA = new Date(`${a.gameDate || ''}T${a.gameTime || '00:00'}`).getTime() || 0;
            const dateB = new Date(`${b.gameDate || ''}T${b.gameTime || '00:00'}`).getTime() || 0;
            return dateB - dateA;
          });

          setBookings(list);
          setLoading(false);
        },
        async (err) => {
          console.warn('[CreatorManageBookings] Snapshot listener error, attempting direct query:', err);
          try {
            const directSnap = await getDocs(query(bookingsRef, where('creatorId', '==', activeCreatorUid)));
            const fallbackList: BookingRecord[] = [];
            directSnap.forEach((docSnap) => {
              fallbackList.push({ id: docSnap.id, ...docSnap.data() } as BookingRecord);
            });
            setBookings(fallbackList);
          } catch (directErr: any) {
            console.error('[CreatorManageBookings] Fallback query failed:', directErr);
            setError(directErr?.message || 'Could not load bookings.');
          } finally {
            setLoading(false);
          }
        }
      );
    } catch (err: any) {
      console.error('[CreatorManageBookings] Setup error:', err);
      setError(err?.message || 'Could not initiate bookings listener.');
      setLoading(false);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user, activeCreatorUid]);

  // Tab counts
  const tabCounts = useMemo(() => {
    const upcoming = bookings.filter(b => b.status === 'confirmed').length;
    const inProgress = bookings.filter(b => b.status === 'in_progress').length;
    const completed = bookings.filter(b => b.status === 'delivered').length;
    const all = bookings.length;
    return { upcoming, inProgress, completed, all };
  }, [bookings]);

  // Filtered Bookings for the active view
  const filteredBookings = useMemo(() => {
    return bookings.filter((item) => {
      // Tab filter
      if (activeTab === 'upcoming' && item.status !== 'confirmed') return false;
      if (activeTab === 'in_progress' && item.status !== 'in_progress') return false;
      if (activeTab === 'completed' && item.status !== 'delivered') return false;

      // Text search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchAthlete = item.athleteName?.toLowerCase().includes(q);
        const matchTeam = item.athleteTeam?.toLowerCase().includes(q);
        const matchVenue = item.venueName?.toLowerCase().includes(q);
        const matchPackage = item.packageName?.toLowerCase().includes(q);
        const matchId = item.id.toLowerCase().includes(q);
        return matchAthlete || matchTeam || matchVenue || matchPackage || matchId;
      }

      return true;
    });
  }, [bookings, activeTab, searchQuery]);

  // Quick Action: Update booking status (e.g. Move to In-Progress / Editing)
  const handleUpdateStatus = async (bookingId: string, newStatus: 'in_progress' | 'confirmed') => {
    try {
      const docRef = doc(db, 'bookings', bookingId);
      await updateDoc(docRef, sanitizeFirestorePayload({
        status: newStatus,
        updatedAt: serverTimestamp()
      }));

      showToast(
        'success',
        newStatus === 'in_progress' ? 'Coverage In Progress' : 'Status Updated',
        newStatus === 'in_progress' ? 'Booking moved to active editing. Athlete has been notified.' : 'Booking status synchronized.'
      );
    } catch (err: any) {
      console.error('[CreatorManageBookings] Status update error:', err);
      showToast('error', 'Update Failed', err?.message || 'Could not update status.');
    }
  };

  // Deliver Media Action: Submit Google Drive Link
  const handleSubmitDelivery = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedBookingForDelivery) return;

    const trimmedUrl = deliveryDriveUrl.trim();

    // Validate Google Drive or Cloud URL
    if (!trimmedUrl) {
      setDeliveryUrlError('Please enter a Google Drive folder link.');
      return;
    }

    if (!trimmedUrl.includes('drive.google.com') && !trimmedUrl.includes('dropbox.com') && !trimmedUrl.includes('onedrive') && !trimmedUrl.startsWith('http')) {
      setDeliveryUrlError('Please enter a valid URL (preferably a Google Drive folder link, e.g. https://drive.google.com/drive/folders/...).');
      return;
    }

    setDeliveryUrlError('');
    setIsSubmittingDelivery(true);

    try {
      const docRef = doc(db, 'bookings', selectedBookingForDelivery.id);
      await updateDoc(docRef, sanitizeFirestorePayload({
        status: 'delivered',
        deliveryStatus: 'delivered',
        driveUrl: trimmedUrl,
        deliveryNotes: deliveryNotes.trim(),
        deliveredAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }));

      showToast(
        'success',
        'Media Delivered!',
        `Google Drive link submitted for ${selectedBookingForDelivery.athleteName}. Athlete has been notified.`
      );

      // Close modal and reset fields
      setSelectedBookingForDelivery(null);
      setDeliveryDriveUrl('');
      setDeliveryNotes('');
    } catch (err: any) {
      console.error('[CreatorManageBookings] Delivery submission failed:', err);
      showToast('error', 'Delivery Error', err?.message || 'Could not submit delivery link.');
    } finally {
      setIsSubmittingDelivery(false);
    }
  };

  // Copy helper
  const handleCopyLink = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    showToast('info', 'Link Copied', 'Delivery link copied to clipboard.');
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Defensive Guard: Unauthenticated
  if (!user) {
    return (
      <div id="creator-manage-bookings-auth-guard" className={`bg-zinc-950 border border-zinc-800 rounded-3xl p-8 text-center space-y-4 ${className}`}>
        <div className="w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center mx-auto text-teal-400">
          <Lock className="w-7 h-7" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-white">Creator Access Restricted</h2>
          <p className="text-sm text-zinc-400 max-w-md mx-auto">
            Please sign in with your Just1Play creator account to access your gameday assignments and media delivery desk.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div id="creator-manage-bookings" className={`space-y-6 pb-32 md:pb-16 ${className}`}>
      {/* Header Bar */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-teal-500/10 text-teal-400 border border-teal-500/30">
            <Film className="w-3.5 h-3.5" /> Media Delivery & Assignment Desk
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
            Creator Gameday Bookings
          </h1>
          <p className="text-sm text-zinc-400 max-w-xl">
            Track your confirmed sideline shoots, update gameday coverage status, and deliver color-graded 4K footage and photo galleries directly via Google Drive.
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-3">
          {onOpenBookingDesk && (
            <button
              onClick={onOpenBookingDesk}
              className="px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-zinc-950 font-bold text-xs transition flex items-center gap-1.5 shadow-[0_0_15px_rgba(20,184,166,0.3)] cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" /> Book Client Gameday
            </button>
          )}
        </div>
      </div>

      {/* Tabs & Search Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            id="tab-upcoming-gamedays"
            onClick={() => setActiveTab('upcoming')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'upcoming'
                ? 'bg-teal-500 text-zinc-950 shadow-sm'
                : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Upcoming Gamedays</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              activeTab === 'upcoming' ? 'bg-zinc-950/30 text-zinc-950' : 'bg-zinc-800 text-teal-400'
            }`}>
              {tabCounts.upcoming}
            </span>
          </button>

          <button
            id="tab-awaiting-delivery"
            onClick={() => setActiveTab('in_progress')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'in_progress'
                ? 'bg-amber-500 text-zinc-950 shadow-sm'
                : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            <Clock3 className="w-3.5 h-3.5" />
            <span>Awaiting Delivery</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              activeTab === 'in_progress' ? 'bg-zinc-950/30 text-zinc-950' : 'bg-zinc-800 text-amber-400'
            }`}>
              {tabCounts.inProgress}
            </span>
          </button>

          <button
            id="tab-completed-bookings"
            onClick={() => setActiveTab('completed')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'completed'
                ? 'bg-emerald-500 text-zinc-950 shadow-sm'
                : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Completed</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              activeTab === 'completed' ? 'bg-zinc-950/30 text-zinc-950' : 'bg-zinc-800 text-emerald-400'
            }`}>
              {tabCounts.completed}
            </span>
          </button>

          <button
            id="tab-all-bookings"
            onClick={() => setActiveTab('all')}
            className={`px-3 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'all'
                ? 'bg-zinc-200 text-zinc-950'
                : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            <span>All</span>
            <span className="text-[10px] text-zinc-500">({tabCounts.all})</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search athlete, venue, team..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder-zinc-500 outline-none focus:border-teal-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Bookings List / Cards */}
      {loading ? (
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-12 text-center text-zinc-400 space-y-3">
          <div className="w-8 h-8 border-2 border-teal-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium">Synchronizing creator bookings...</p>
        </div>
      ) : filteredBookings.length === 0 ? (
        /* Empty State */
        <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-500">
            <Camera className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white">No Bookings In This Category</h3>
            <p className="text-xs text-zinc-400 max-w-md mx-auto">
              {activeTab === 'upcoming' && "You don't have any confirmed upcoming gamedays scheduled yet."}
              {activeTab === 'in_progress' && "You don't have any media shoots currently awaiting editing or Google Drive delivery."}
              {activeTab === 'completed' && "Completed deliveries with verified Google Drive links will appear here."}
              {activeTab === 'all' && "No media bookings have been made for your creator profile yet."}
            </p>
          </div>

          {onOpenBookingDesk && (
            <button
              onClick={onOpenBookingDesk}
              className="px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-zinc-950 font-bold text-xs transition cursor-pointer shadow-sm"
            >
              Open Booking Desk
            </button>
          )}
        </div>
      ) : (
        /* List of Cards */
        <div className="grid grid-cols-1 gap-4">
          {filteredBookings.map((booking) => {
            const isConfirmed = booking.status === 'confirmed';
            const isInProgress = booking.status === 'in_progress';
            const isDelivered = booking.status === 'delivered';

            return (
              <div
                key={booking.id}
                id={`booking-card-${booking.id}`}
                className="bg-zinc-950 border border-zinc-800 hover:border-zinc-750 rounded-2xl p-5 md:p-6 transition space-y-5"
              >
                {/* Top status bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-800/80">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Status badge */}
                    {isConfirmed && (
                      <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-teal-500/15 text-teal-400 border border-teal-500/30 flex items-center gap-1.5">
                        <Calendar className="w-3 h-3" /> Confirmed Gameday
                      </span>
                    )}
                    {isInProgress && (
                      <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1.5 animate-pulse">
                        <Clock3 className="w-3 h-3" /> In Progress (Editing)
                      </span>
                    )}
                    {isDelivered && (
                      <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                        <CheckCircle className="w-3 h-3" /> Media Delivered
                      </span>
                    )}

                    <span className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-zinc-900 text-zinc-400 border border-zinc-800">
                      ID: {booking.id.slice(0, 8)}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs text-zinc-500">Payout</span>
                    <span className="text-lg font-black text-emerald-400">${(booking.subtotal || booking.totalAmount || 100).toFixed(2)} USD</span>
                  </div>
                </div>

                {/* Main Body Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {/* Column 1: Athlete Info */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-teal-400 block">
                      Target Athlete
                    </span>
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-bold text-white">{booking.athleteName}</h4>
                      <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-xs font-mono font-bold text-teal-300">
                        {booking.athleteJersey}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 font-medium">{booking.athleteTeam}</p>
                    {booking.userEmail && (
                      <p className="text-[11px] text-zinc-500">Contact: {booking.userEmail}</p>
                    )}
                  </div>

                  {/* Column 2: Gameday Kickoff & Venue */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-teal-400 block">
                      Gameday Kickoff
                    </span>
                    <div className="flex items-center gap-1.5 text-xs text-white font-semibold">
                      <Calendar className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                      <span>{booking.gameDate} at {booking.gameTime}</span>
                    </div>
                    <div className="flex items-start gap-1.5 text-xs text-zinc-400">
                      <MapPin className="w-3.5 h-3.5 text-teal-400 shrink-0 mt-0.5" />
                      <div>
                        <span>{booking.venueName}</span>
                        <span className="block text-[11px] text-zinc-500">
                          {booking.venueCity}, {booking.venueState} • {booking.fieldNumber || 'Main Field'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Column 3: Package Details & Notes */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-teal-400 block">
                      Booked Deliverable
                    </span>
                    <div className="text-xs font-bold text-zinc-200">
                      {booking.packageName}
                    </div>
                    <p className="text-[11px] text-zinc-400">
                      {booking.packageSubtitle || 'High-res media package'}
                    </p>
                    {booking.notes && (
                      <div className="p-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800 text-[11px] text-zinc-300">
                        <span className="text-zinc-500 block font-semibold text-[10px] uppercase">Special Instructions:</span>
                        "{booking.notes}"
                      </div>
                    )}
                  </div>
                </div>

                {/* Delivered URL Display Banner (if completed) */}
                {isDelivered && booking.driveUrl && (
                  <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-800/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                        <Folder className="w-5 h-5" />
                      </div>
                      <div className="overflow-hidden">
                        <span className="text-xs font-bold text-emerald-300 block">Google Drive Delivery Folder</span>
                        <a
                          href={booking.driveUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-zinc-400 hover:text-white truncate block underline"
                        >
                          {booking.driveUrl}
                        </a>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleCopyLink(booking.driveUrl!, booking.id)}
                        className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-medium border border-zinc-700 transition flex items-center gap-1 cursor-pointer"
                      >
                        {copiedId === booking.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedId === booking.id ? 'Copied' : 'Copy Link'}</span>
                      </button>

                      <a
                        href={booking.driveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold transition flex items-center gap-1"
                      >
                        <span>Open Folder</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                )}

                {/* Actions Row */}
                <div className="pt-3 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-[11px] text-zinc-500">
                    Payment Status: <span className="text-emerald-400 font-semibold uppercase">{booking.paymentStatus || 'PAID'}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* If Confirmed -> Can advance to In Progress */}
                    {isConfirmed && (
                      <button
                        id={`mark-progress-btn-${booking.id}`}
                        onClick={() => handleUpdateStatus(booking.id, 'in_progress')}
                        className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-amber-400 border border-amber-500/40 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Clock3 className="w-3.5 h-3.5" /> Mark Attended & Start Editing
                      </button>
                    )}

                    {/* Deliver Media Trigger Button */}
                    <button
                      id={`deliver-media-btn-${booking.id}`}
                      onClick={() => {
                        setSelectedBookingForDelivery(booking);
                        setDeliveryDriveUrl(booking.driveUrl || '');
                        setDeliveryNotes(booking.deliveryNotes || '');
                      }}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                        isDelivered
                          ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700'
                          : 'bg-teal-500 hover:bg-teal-400 text-zinc-950 shadow-[0_0_15px_rgba(20,184,166,0.3)]'
                      }`}
                    >
                      <Folder className="w-3.5 h-3.5" />
                      <span>{isDelivered ? 'Update Delivery Link' : 'Deliver Media'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* DELIVER MEDIA MODAL (Google Drive Folder Submission) */}
      {/* ------------------------------------------------------------- */}
      {selectedBookingForDelivery && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl max-w-lg w-full p-6 md:p-8 text-white relative shadow-2xl space-y-6 my-auto">
            {/* Close Button */}
            <button
              onClick={() => setSelectedBookingForDelivery(null)}
              disabled={isSubmittingDelivery}
              className="absolute top-5 right-5 text-zinc-400 hover:text-white p-1 rounded-xl hover:bg-zinc-900 transition disabled:opacity-50 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-teal-500/10 text-teal-400 border border-teal-500/30">
                <Folder className="w-3.5 h-3.5" /> Media Fulfillment
              </div>
              <h3 className="text-xl font-bold text-white">
                Deliver Media for {selectedBookingForDelivery.athleteName}
              </h3>
              <p className="text-xs text-zinc-400">
                {selectedBookingForDelivery.packageName} • {selectedBookingForDelivery.gameDate}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitDelivery} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-zinc-300 block mb-1.5">
                  Google Drive Folder URL *
                </label>
                <input
                  id="delivery-drive-url-input"
                  type="url"
                  placeholder="https://drive.google.com/drive/folders/..."
                  value={deliveryDriveUrl}
                  onChange={(e) => {
                    setDeliveryDriveUrl(e.target.value);
                    if (deliveryUrlError) setDeliveryUrlError('');
                  }}
                  className={`w-full bg-zinc-900 border ${deliveryUrlError ? 'border-rose-500' : 'border-zinc-800'} focus:border-teal-500 rounded-xl px-4 py-3 text-xs text-white placeholder-zinc-500 outline-none`}
                  required
                />
                {deliveryUrlError && (
                  <span className="text-[11px] text-rose-400 mt-1 block">{deliveryUrlError}</span>
                )}
                <span className="text-[11px] text-zinc-500 mt-1.5 block">
                  Ensure link sharing is set to <strong className="text-zinc-300">"Anyone with the link can view"</strong> so the athlete and scouts can access their files.
                </span>
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-300 block mb-1.5">
                  Delivery Notes or File Summary (Optional)
                </label>
                <textarea
                  id="delivery-notes-input"
                  rows={3}
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  placeholder="e.g. Includes 34 color-graded photos (Sony Raw exports) and 2 vertical reels formatted for Instagram & TikTok."
                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-teal-500 rounded-xl p-3 text-xs text-white placeholder-zinc-500 outline-none resize-none"
                />
              </div>

              <div className="p-4 rounded-xl bg-teal-950/30 border border-teal-800/40 text-xs text-zinc-300 space-y-1">
                <span className="font-bold text-teal-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" /> Escrow Release Trigger
                </span>
                <p className="text-[11px] text-zinc-400">
                  Submitting your verified Google Drive link updates your booking status to "delivered" and triggers notification alerts to the athlete and coaching staff.
                </p>
              </div>

              <div className="sticky bottom-0 z-50 bg-zinc-950/95 backdrop-blur-md pt-4 pb-2 border-t border-zinc-800/80 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedBookingForDelivery(null)}
                  disabled={isSubmittingDelivery}
                  className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 text-xs font-semibold border border-zinc-800 transition cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  id="submit-delivery-notify-btn"
                  type="submit"
                  disabled={isSubmittingDelivery}
                  className="px-6 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-zinc-950 font-bold text-xs transition flex items-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(20,184,166,0.3)] disabled:opacity-50"
                >
                  {isSubmittingDelivery ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                      <span>Submitting Delivery...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Submit Delivery & Notify Athlete</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export { CreatorManageBookings };
