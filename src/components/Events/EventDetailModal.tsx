import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  DollarSign, 
  ShieldCheck, 
  Zap, 
  Share2, 
  CalendarPlus, 
  ExternalLink, 
  CheckCircle2, 
  Trophy, 
  QrCode, 
  Sparkles,
  CreditCard,
  Lock,
  ArrowRight,
  UserCheck,
  AlertCircle,
  Plus,
  UserPlus,
  Layers,
  Filter,
  Settings,
  Award,
  TrendingUp
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { 
  ShowcaseEvent, 
  EventAttendee,
  EventDivision,
  EventStaffMember,
  EventScheduleItem
} from './types';
import { isGenuineKickoffTime, formatVenueDisplay } from './EventsHub';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { downloadIcsCalendarEvent, getGoogleCalendarWebUrl } from '../../lib/googleCalendarService';
import { doc, updateDoc, arrayUnion, arrayRemove, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { AddDivisionModal } from './AddDivisionModal';
import { InviteStaffModal } from './InviteStaffModal';
import { DivisionTabFilter } from './DivisionTabFilter';
import { StaffMemberCard } from './StaffMemberCard';
import { PoolBracketEngine } from '../Tournaments/Engines/PoolBracketEngine';

export const DEFAULT_DIVISIONS: EventDivision[] = [
  { id: 'div-14u', name: '14U Girls', format: '5v5 Flag', teamLimit: 12, registeredCount: 8 },
  { id: 'div-hs', name: 'HS Girls', format: '5v5 Flag', teamLimit: 12, registeredCount: 6 },
  { id: 'div-17u', name: '17U Elite', format: '5v5 Flag', teamLimit: 16, registeredCount: 10 }
];

interface EventDetailModalProps {
  event: ShowcaseEvent | null;
  isOpen: boolean;
  onClose: () => void;
  onEventUpdated?: (updatedEvent: ShowcaseEvent) => void;
  onRequireAuth?: (action: string) => void;
}

export const EventDetailModal: React.FC<EventDetailModalProps> = ({
  event,
  isOpen,
  onClose,
  onEventUpdated,
  onRequireAuth
}) => {
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  type ModalTabType = 'overview' | 'divisions_brackets' | 'standings' | 'schedule' | 'staff' | 'roster';
  const [activeTab, setActiveTab] = useState<ModalTabType>('overview');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCheckoutConfirmation, setShowCheckoutConfirmation] = useState(false);
  const [showPassModal, setShowPassModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Live Countdown state
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isPast: false
  });

  useEffect(() => {
    if (!event) return;

    const calculateTime = () => {
      const eventDateStr = `${event.date}T09:00:00`;
      const target = new Date(eventDateStr).getTime();
      const now = new Date().getTime();
      const difference = target - now;

      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true });
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds, isPast: false });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [event]);

  // Division & Staff Management States
  const [divisions, setDivisions] = useState<EventDivision[]>(() => {
    return event?.divisions && event.divisions.length > 0 ? event.divisions : DEFAULT_DIVISIONS;
  });
  const [selectedDivisionId, setSelectedDivisionId] = useState<string>('all');
  const [isAddDivisionOpen, setIsAddDivisionOpen] = useState(false);
  const [isInviteStaffOpen, setIsInviteStaffOpen] = useState(false);

  const [staffMembers, setStaffMembers] = useState<EventStaffMember[]>(() => {
    if (event?.staff && event.staff.length > 0) return event.staff;
    if (event?.coaches && event.coaches.length > 0) {
      return event.coaches.map((c, i) => ({
        id: `staff-${i}`,
        userId: `user-${i}`,
        name: c.name,
        role: (c.title as any) || 'Head Coach',
        divisionId: i % 2 === 0 ? 'div-14u' : 'div-17u',
        divisionName: i % 2 === 0 ? '14U' : '17U',
        status: 'confirmed',
        avatarUrl: c.avatarUrl
      }));
    }
    return [
      {
        id: 'staff-default-1',
        userId: 'user-default-1',
        name: event?.hostName || 'Marcus Vance',
        email: event?.hostEmail || 'headcoach@gvocflag.com',
        role: 'Head Coach',
        divisionId: 'div-14u',
        divisionName: '14U',
        status: 'confirmed',
        avatarUrl: event?.hostAvatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80'
      },
      {
        id: 'staff-default-2',
        userId: 'user-default-2',
        name: 'Darren Hayes',
        email: 'referee.hayes@officials.org',
        role: 'Official / Referee',
        divisionId: 'div-17u',
        divisionName: '17U',
        status: 'confirmed',
        avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80'
      }
    ];
  });

  // Sync event props to local state when event document changes
  useEffect(() => {
    if (event?.divisions && event.divisions.length > 0) {
      setDivisions(event.divisions);
    } else if (event) {
      setDivisions(DEFAULT_DIVISIONS);
    }

    if (event?.staff && event.staff.length > 0) {
      setStaffMembers(event.staff);
    } else if (event?.coaches && event.coaches.length > 0) {
      setStaffMembers(
        event.coaches.map((c, i) => ({
          id: `staff-${i}`,
          userId: `user-${i}`,
          name: c.name,
          role: (c.title as any) || 'Head Coach',
          divisionId: i % 2 === 0 ? 'div-14u' : 'div-17u',
          divisionName: i % 2 === 0 ? '14U' : '17U',
          status: 'confirmed',
          avatarUrl: c.avatarUrl
        }))
      );
    }
  }, [event]);

  // Host / Admin Guard for Division & Staff Management
  const canManage = Boolean(
    user && event && (
      event.hostId === user.uid ||
      (event as any).creatorId === user.uid ||
      (event as any).directorId === user.uid ||
      (event as any).createdBy === user.uid ||
      (event as any).organizerId === user.uid ||
      event.hostEmail === user.email ||
      profile?.role === 'coach' ||
      (profile?.role as string) === 'admin' ||
      (profile?.role as string) === 'director' ||
      (profile?.role as string) === 'organization' ||
      (profile?.role as string) === 'tournament_director' ||
      (profile as any)?.isVerifiedHost === true ||
      user.email === 'kevoiebailey@gmail.com' ||
      user.email?.includes('admin')
    )
  );

  const isTournamentEvent = Boolean(
    (event?.category as string) === 'Tournament' || 
    (event?.category as string) === 'League' ||
    event?.title?.toLowerCase().includes('tournament') ||
    event?.title?.toLowerCase().includes('league') ||
    (divisions && divisions.length > 0)
  );

  const handleLaunchControlCenter = () => {
    onClose();
    const tournamentId = event?.id || 'gvoc-flag-football-league';
    navigate(`/tournaments/${tournamentId}`, {
      state: {
        tournamentId,
        tournamentTitle: event?.title || 'GVOC Flag Football League',
        sport: event?.sport || 'flag_football',
        divisions: divisions
      }
    });
  };

  const handleAddDivision = async (newDivision: EventDivision) => {
    if (!event) return;
    const updatedDivisions = [...divisions, newDivision];
    setDivisions(updatedDivisions);

    const updatedEvent: ShowcaseEvent = {
      ...event,
      divisions: updatedDivisions
    };

    if (onEventUpdated) onEventUpdated(updatedEvent);

    try {
      const eventRef = doc(db, 'events', event.id);
      await updateDoc(eventRef, {
        divisions: updatedDivisions
      });
    } catch (e) {
      console.warn('Could not persist division to Firestore:', e);
    }

    showToast('success', 'Division Added! 🏆', `Added "${newDivision.name}" (${newDivision.format}) bracket.`);
  };

  const handleInviteStaff = async (newStaff: EventStaffMember) => {
    if (!event) return;
    const updatedStaff = [newStaff, ...staffMembers];
    setStaffMembers(updatedStaff);

    const updatedEvent: ShowcaseEvent = {
      ...event,
      staff: updatedStaff
    };

    if (onEventUpdated) onEventUpdated(updatedEvent);

    try {
      // 1. Array in event doc
      const eventRef = doc(db, 'events', event.id);
      await updateDoc(eventRef, {
        staff: arrayUnion({
          userId: newStaff.userId || newStaff.id,
          name: newStaff.name,
          role: newStaff.role,
          divisionId: newStaff.divisionId || null,
          divisionName: newStaff.divisionName || 'All Divisions',
          status: newStaff.status,
          email: newStaff.email || null,
          assignedAt: newStaff.assignedAt || new Date().toISOString()
        })
      }).catch(() => {});

      // 2. Subcollection in event doc
      const subcollStaffRef = doc(db, 'events', event.id, 'staff', newStaff.id || `staff-${Date.now()}`);
      await setDoc(subcollStaffRef, {
        userId: newStaff.userId || newStaff.id,
        name: newStaff.name,
        role: newStaff.role,
        divisionId: newStaff.divisionId || null,
        divisionName: newStaff.divisionName || 'All Divisions',
        status: newStaff.status,
        email: newStaff.email || null,
        assignedAt: newStaff.assignedAt || new Date().toISOString()
      }).catch(() => {});
    } catch (e) {
      console.warn('Could not persist staff to Firestore:', e);
    }

    showToast('success', 'Staff Member Assigned! 📋', `Assigned ${newStaff.name} as ${newStaff.role} (${newStaff.divisionName || 'All Divisions'}).`);
  };

  const handleToggleStaffStatus = async (staffMember: EventStaffMember) => {
    if (!event) return;
    const nextStatus = staffMember.status === 'confirmed' ? 'pending' : 'confirmed';
    const updated = staffMembers.map(s => s.id === staffMember.id ? { ...s, status: nextStatus as any } : s);
    setStaffMembers(updated);
    if (onEventUpdated) onEventUpdated({ ...event, staff: updated });
    try {
      const eventRef = doc(db, 'events', event.id);
      await updateDoc(eventRef, { staff: updated }).catch(() => {});
    } catch (e) {}
    showToast('info', 'Status Updated', `${staffMember.name} is now marked as ${nextStatus}.`);
  };

  const handleRemoveStaff = async (staffId?: string) => {
    if (!event || !staffId) return;
    const updated = staffMembers.filter(s => s.id !== staffId);
    setStaffMembers(updated);
    if (onEventUpdated) onEventUpdated({ ...event, staff: updated });
    try {
      const eventRef = doc(db, 'events', event.id);
      await updateDoc(eventRef, { staff: updated }).catch(() => {});
    } catch (e) {}
    showToast('info', 'Staff Removed', 'Staff assignment removed.');
  };

  if (!isOpen || !event) return null;

  const isUserRegistered = Boolean(user && event.registeredUserIds?.includes(user.uid));
  const capacityRemaining = Math.max(0, event.capacity - (event.registeredUserIds?.length || 0));
  const capacityPercent = Math.min(100, Math.round(((event.registeredUserIds?.length || 0) / event.capacity) * 100));

  // Handle Free RSVP or Paid Registration
  const handleRegister = async () => {
    if (!user) {
      if (onRequireAuth) {
        onRequireAuth('register for this event');
      } else {
        showToast('error', 'Sign In Required', 'Please sign in or create an account to register.');
      }
      return;
    }

    if (isUserRegistered) {
      // Toggle off / Cancel RSVP
      setIsProcessing(true);
      try {
        const updatedRegisteredUserIds = event.registeredUserIds.filter(uid => uid !== user.uid);
        const updatedAttendees = (event.attendees || []).filter(a => a.uid !== user.uid);
        const updatedEvent: ShowcaseEvent = {
          ...event,
          registeredUserIds: updatedRegisteredUserIds,
          attendees: updatedAttendees
        };

        const eventRef = doc(db, 'events', event.id);
        await updateDoc(eventRef, {
          registeredUserIds: arrayRemove(user.uid)
        }).catch(() => {});

        if (onEventUpdated) onEventUpdated(updatedEvent);
        showToast('info', 'RSVP Cancelled', `You have un-registered from "${event.title}".`);
      } catch (err) {
        console.error('Error unregistering:', err);
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    // If paid event, open checkout confirmation dialog
    if (event.price > 0 && !showCheckoutConfirmation) {
      setShowCheckoutConfirmation(true);
      return;
    }

    // Execute Registration
    setIsProcessing(true);
    try {
      const newAttendee: EventAttendee = {
        uid: user.uid,
        name: user.displayName || user.email?.split('@')[0] || 'Athlete',
        email: user.email || undefined,
        avatar: user.photoURL || undefined,
        role: profile?.role || 'athlete',
        sport: profile?.sport || event.sport,
        school: profile?.highSchool || undefined,
        classYear: profile?.gradYear || undefined,
        registeredAt: new Date().toISOString(),
        paidAmount: event.price,
        ticketType: event.price === 0 ? 'Free RSVP Pass' : 'General Admission Pass'
      };

      const updatedRegisteredUserIds = [...(event.registeredUserIds || []), user.uid];
      const updatedAttendees = [...(event.attendees || []), newAttendee];
      const updatedEvent: ShowcaseEvent = {
        ...event,
        registeredUserIds: updatedRegisteredUserIds,
        attendees: updatedAttendees
      };

      // Sync with Firestore
      try {
        const eventRef = doc(db, 'events', event.id);
        await updateDoc(eventRef, {
          registeredUserIds: arrayUnion(user.uid)
        });
      } catch (firestoreErr) {
        // Non-blocking fallback
      }

      if (onEventUpdated) onEventUpdated(updatedEvent);
      setShowCheckoutConfirmation(false);
      setShowPassModal(true);
      showToast('success', 'Registration Confirmed! 🎉', `🎯 You are officially locked in for "${event.title}". Digital pass generated.`);
    } catch (err) {
      console.error('Registration failed:', err);
      showToast('error', 'Registration Error', 'Unable to complete registration. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // 1-Tap Google Calendar Sync
  const handleAddToGoogleCalendar = () => {
    const safeTime = event.time || '09:00 AM - 05:00 PM';
    const calendarUrl = getGoogleCalendarWebUrl({
      id: event.id,
      title: event.title || 'Showcase Event',
      description: `${event.description || ''}\n\nVenue: ${event.location || event.venueName || ''}\nHost: ${event.organizer || event.hostName || ''}`,
      venue: event.location || event.venueName || '',
      date: event.date || '',
      startTime: safeTime.split(' - ')[0] || '09:00 AM'
    });
    window.open(calendarUrl, '_blank', 'noopener,noreferrer');
  };

  // 1-Tap Apple / Outlook / iCal ICS Download
  const handleDownloadIcs = () => {
    const safeTime = event.time || '09:00 AM - 05:00 PM';
    downloadIcsCalendarEvent({
      id: event.id,
      title: event.title || 'Showcase Event',
      description: `${event.description || ''}\n\nVenue: ${event.location || event.venueName || ''}\nHost: ${event.organizer || event.hostName || ''}`,
      venue: event.location || event.venueName || '',
      date: event.date || '',
      startTime: safeTime.split(' - ')[0] || '09:00 AM',
      sport: event.sport || 'Multi-Sport'
    });
    showToast('success', 'Calendar File Downloaded', 'Importing event pass into Apple / Outlook Calendar.');
  };

  const handleShare = () => {
    const url = `${window.location.origin}/events?id=${event.id}`;
    if (navigator.share) {
      navigator.share({
        title: event.title,
        text: `Join me at ${event.title} on Just1Play!`,
        url
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      showToast('success', 'Link Copied', 'Direct showcase event URL copied to clipboard.');
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  // Active Division Helpers & Filter Logic
  const selectedDivision = divisions.find(d => d.id === selectedDivisionId);

  // Filter Schedule by selected division
  const currentSchedule = event.schedule || [];
  const filteredSchedule = selectedDivisionId === 'all'
    ? currentSchedule
    : currentSchedule.filter(item => {
        if (item.divisionId) return item.divisionId === selectedDivisionId;
        if (selectedDivision) {
          const titleLower = item.title.toLowerCase();
          const descLower = (item.desc || '').toLowerCase();
          const divLower = selectedDivision.name.toLowerCase();
          if (titleLower.includes(divLower) || descLower.includes(divLower)) return true;
        }
        return false;
      });

  // Filter Attendees by selected division
  const currentAttendees = event.attendees || [];
  const filteredAttendees = selectedDivisionId === 'all'
    ? currentAttendees
    : currentAttendees.filter(att => {
        if (att.divisionId) return att.divisionId === selectedDivisionId;
        if (selectedDivision) {
          const divLower = selectedDivision.name.toLowerCase();
          if ((att.classYear || '').toLowerCase().includes(divLower)) return true;
          if ((att.school || '').toLowerCase().includes(divLower)) return true;
          if ((att.ticketType || '').toLowerCase().includes(divLower)) return true;
        }
        return false;
      });

  // Filter Staff by selected division
  const filteredStaff = selectedDivisionId === 'all'
    ? staffMembers
    : staffMembers.filter(s => !s.divisionId || s.divisionId === 'all' || s.divisionId === selectedDivisionId);

  const confirmedStaff = filteredStaff.filter(s => s.status === 'confirmed');
  const pendingStaff = filteredStaff.filter(s => s.status === 'pending');

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto bg-black/85 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 20 }}
          className="relative w-full max-w-3xl my-auto bg-[#090D16] border border-[#24324F] rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col max-h-[92vh]"
        >
          {/* Cover Header Banner */}
          <div className="relative h-48 sm:h-64 w-full overflow-hidden shrink-0 bg-gradient-to-br from-[#0B1528] via-[#090D16] to-[#12233F]">
            {(event.flyerUrl || event.bannerUrl || (event as any).coverUrl) ? (
              <img
                src={event.flyerUrl || event.bannerUrl || (event as any).coverUrl}
                alt={event.title}
                className="w-full h-full object-cover transition-opacity duration-300"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#0B1528] via-[#090D16] to-[#1a2d4f] relative">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#00E5FF]/10 via-transparent to-transparent" />
                <Trophy className="w-16 h-16 text-[#00E5FF]/20 animate-pulse" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#090D16] via-[#090D16]/60 to-black/40" />

            {/* Top Bar Controls */}
            <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-xl bg-[#090D16]/90 border border-[#00B8D4]/50 text-[#00B8D4] text-[10px] font-black uppercase font-mono tracking-wider backdrop-blur-md shadow-md">
                  {event?.category?.toUpperCase() ?? 'SHOWCASE'}
                </span>
                <span className="px-2.5 py-1 rounded-xl bg-[#090D16]/90 border border-slate-700 text-white text-[10px] font-bold uppercase tracking-wider backdrop-blur-md">
                  {event?.sport ?? 'Multi-Sport'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleShare}
                  className="p-2 rounded-xl bg-[#090D16]/80 hover:bg-[#090D16] border border-slate-700 text-slate-300 hover:text-white transition-all backdrop-blur-md cursor-pointer"
                  title="Share Event"
                >
                  <Share2 className="w-4 h-4" />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl bg-[#090D16]/80 hover:bg-[#090D16] border border-slate-700 text-slate-300 hover:text-white transition-all backdrop-blur-md cursor-pointer"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Banner Bottom Information */}
            <div className="absolute bottom-3 left-4 right-4 z-10 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-[#FFC857] font-black uppercase font-mono tracking-wider flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {event?.date ?? 'TBD'}
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-slate-300 font-medium flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-[#00B8D4]" />
                  {isGenuineKickoffTime(event?.time) ? (
                    <span>{event?.time}</span>
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold border border-amber-500/30">
                      Time TBA / Network TBD
                    </span>
                  )}
                </span>
              </div>

              <h1 className="text-lg sm:text-2xl font-black text-white uppercase tracking-tight line-clamp-2">
                {event?.title ?? 'Event Details'}
              </h1>
            </div>
          </div>

          {/* Glowing Countdown & Capacity Ticker Bar */}
          <div className="bg-[#263238]/80 border-b border-[#24324F] px-4 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
            {/* Countdown Clock */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase font-mono tracking-wider hidden sm:inline">
                STARTS IN:
              </span>
              {timeLeft.isPast ? (
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-mono font-bold animate-pulse">
                  ⚡ EVENT LIVE / IN PROGRESS
                </span>
              ) : (
                <div className="flex items-center gap-1.5 font-mono text-xs font-black text-white">
                  <div className="px-2 py-1 rounded-lg bg-[#090D16] border border-[#24324F] text-[#00B8D4]">
                    {String(timeLeft.days).padStart(2, '0')}<span className="text-[9px] text-slate-400 ml-0.5">D</span>
                  </div>
                  <span>:</span>
                  <div className="px-2 py-1 rounded-lg bg-[#090D16] border border-[#24324F] text-[#00B8D4]">
                    {String(timeLeft.hours).padStart(2, '0')}<span className="text-[9px] text-slate-400 ml-0.5">H</span>
                  </div>
                  <span>:</span>
                  <div className="px-2 py-1 rounded-lg bg-[#090D16] border border-[#24324F] text-[#00B8D4]">
                    {String(timeLeft.minutes).padStart(2, '0')}<span className="text-[9px] text-slate-400 ml-0.5">M</span>
                  </div>
                  <span>:</span>
                  <div className="px-2 py-1 rounded-lg bg-[#090D16] border border-[#24324F] text-[#FF6A00]">
                    {String(timeLeft.seconds).padStart(2, '0')}<span className="text-[9px] text-slate-400 ml-0.5">S</span>
                  </div>
                </div>
              )}
            </div>

            {/* Tournament League Roster Bar or Standard Capacity Meter */}
            {isTournamentEvent ? (
              <div className="flex items-center flex-wrap gap-2.5">
                {/* Division Selector */}
                <div className="flex items-center gap-1.5 bg-[#090D16] border border-[#24324F] px-2.5 py-1.5 rounded-xl">
                  <Layers className="w-3.5 h-3.5 text-[#00B8D4]" />
                  <span className="text-[10px] font-mono uppercase text-slate-400 font-bold hidden sm:inline">Division:</span>
                  <select
                    value={selectedDivisionId}
                    onChange={(e) => setSelectedDivisionId(e.target.value)}
                    aria-label="Select Division"
                    className="bg-transparent text-xs font-black text-white font-mono outline-none cursor-pointer pr-1"
                  >
                    <option value="all" className="bg-[#090D16] text-white">All Divisions ({divisions.length})</option>
                    {divisions.map(div => (
                      <option key={div.id} value={div.id} className="bg-[#090D16] text-white">
                        {div.name} • {div.format || '5v5 Flag'} ({div.registeredCount || 0}/{div.teamLimit || 12} Teams)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Director / Control Center Bridge Button */}
                {canManage && (
                  <button
                    id="launch-tournament-control-center-btn"
                    onClick={handleLaunchControlCenter}
                    className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#FF6A00] to-[#FFC857] hover:from-[#FF7A1A] hover:to-[#FFD270] text-[#090D16] font-black text-xs font-mono flex items-center gap-1.5 shadow-[0_0_15px_rgba(255,106,0,0.35)] active:scale-95 transition-all cursor-pointer"
                    title="Launch Tournament Control Center"
                  >
                    <Settings className="w-3.5 h-3.5 animate-spin-slow" />
                    <span>⚙ Launch Tournament Control Center</span>
                  </button>
                )}

                <div className="text-right pl-2 border-l border-slate-700 hidden sm:block">
                  <span className="text-[10px] text-slate-400 uppercase font-mono block">FORMAT</span>
                  <span className="text-xs font-black text-[#00F5D4] font-mono">
                    {selectedDivision?.format || '5v5 Flag'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-xs font-black text-white font-mono">
                    {event.registeredUserIds?.length || 0} / {event.capacity} <span className="text-[10px] text-slate-400 font-normal">Spots Filled</span>
                  </div>
                  <div className="w-32 h-1.5 rounded-full bg-[#090D16] overflow-hidden mt-1 border border-[#24324F]">
                    <div 
                      className="h-full bg-gradient-to-r from-[#00B8D4] to-[#FF6A00] rounded-full transition-all duration-500"
                      style={{ width: `${capacityPercent}%` }}
                    />
                  </div>
                </div>

                <div className="text-right pl-3 border-l border-slate-700">
                  <span className="text-[10px] text-slate-400 uppercase font-mono block">ADMISSION</span>
                  <span className="text-sm font-black text-[#00F5D4] font-mono">
                    {event.price === 0 ? 'FREE RSVP' : `$${event.price}.00`}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Division Segmentation Bar directly above tabs */}
          <DivisionTabFilter
            divisions={divisions}
            selectedDivisionId={selectedDivisionId}
            onSelectDivision={(id) => setSelectedDivisionId(id)}
            onOpenAddDivision={() => setIsAddDivisionOpen(true)}
            canManage={canManage}
            totalAttendeesCount={event.registeredUserIds?.length || 0}
          />

          {/* Navigation Sub-Tabs */}
          <div className="flex items-center border-b border-[#24324F] px-4 bg-[#090D16] shrink-0 gap-1 overflow-x-auto">
            {(isTournamentEvent ? [
              { id: 'overview', label: 'Overview' },
              { id: 'divisions_brackets', label: 'Divisions & Brackets' },
              { id: 'standings', label: 'Standings (W/L/Diff)' },
              { id: 'schedule', label: `Schedule (${selectedDivisionId === 'all' ? (event.schedule?.length || 0) : filteredSchedule.length})` },
              { id: 'staff', label: `Staff (${filteredStaff.length})` },
              { id: 'roster', label: `Attendees (${selectedDivisionId === 'all' ? (event.registeredUserIds?.length || 0) : filteredAttendees.length})` }
            ] : [
              { id: 'overview', label: 'Overview & Venue' },
              { id: 'schedule', label: `Schedule (${selectedDivisionId === 'all' ? (event.schedule?.length || 0) : filteredSchedule.length})` },
              { id: 'staff', label: `Coaching Staff (${filteredStaff.length})` },
              { id: 'roster', label: `Attendees (${selectedDivisionId === 'all' ? (event.registeredUserIds?.length || 0) : filteredAttendees.length})` }
            ]).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 px-3.5 text-xs font-black uppercase tracking-wider transition-all border-b-2 whitespace-nowrap cursor-pointer ${
                  activeTab === tab.id
                    ? 'border-[#00B8D4] text-[#00B8D4]'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content Body (Scrollable) */}
          <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
            
            {/* TAB 1: OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Matchup Scoreboard Card (for imported fixtures & school games) */}
                {((event as any).homeTeam || (event as any).awayTeam || event.category === 'Matchup') && (
                  <div className="p-5 rounded-2xl bg-gradient-to-r from-[#263238] via-[#090D16] to-[#263238] border border-[#24324F] shadow-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold text-[#00B8D4] uppercase tracking-wider flex items-center gap-1.5">
                        <Trophy className="w-3.5 h-3.5" />
                        {(event as any).gameType || 'Official Matchup'} • {event.sport || 'Varsity'}
                      </span>
                      {(event as any).result && (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black font-mono uppercase ${
                          (event as any).result.startsWith('W') 
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        }`}>
                          {(event as any).result}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-5 items-center gap-2 py-2">
                      {/* Home Team */}
                      <div className="col-span-2 text-center space-y-1">
                        <div className="w-12 h-12 rounded-2xl bg-[#090D16] border border-[#24324F] mx-auto flex items-center justify-center text-sm font-black text-white shadow-inner">
                          {((event as any).homeTeam || event.organizer || 'HOME').slice(0, 3).toUpperCase()}
                        </div>
                        <h4 className="text-xs font-black text-white uppercase truncate px-1">
                          {(event as any).homeTeam || event.organizer || 'Home Team'}
                        </h4>
                        <span className="text-[9px] font-mono text-emerald-400 font-bold block">HOME</span>
                      </div>

                      {/* VS / Score Divider */}
                      <div className="col-span-1 text-center space-y-1">
                        {(event as any).homeScore !== null && (event as any).homeScore !== undefined ? (
                          <div className="font-mono font-black text-lg sm:text-2xl text-white tracking-widest">
                            <span className="text-[#00F5D4]">{(event as any).homeScore}</span>
                            <span className="text-slate-500 mx-1">-</span>
                            <span className="text-slate-200">{(event as any).awayScore ?? 0}</span>
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-[#090D16] border border-[#24324F] mx-auto flex items-center justify-center text-[10px] font-mono font-black text-[#00B8D4]">
                            VS
                          </div>
                        )}
                        <span className="text-[9px] font-mono text-slate-400 block">
                          {isGenuineKickoffTime(event.time) ? event.time : 'Time TBA / Network TBD'}
                        </span>
                      </div>

                      {/* Away Team */}
                      <div className="col-span-2 text-center space-y-1">
                        <div className="w-12 h-12 rounded-2xl bg-[#090D16] border border-[#24324F] mx-auto flex items-center justify-center text-sm font-black text-slate-300 shadow-inner">
                          {((event as any).awayTeam || 'AWAY').slice(0, 3).toUpperCase()}
                        </div>
                        <h4 className="text-xs font-black text-slate-200 uppercase truncate px-1">
                          {(event as any).awayTeam || 'Opponent'}
                        </h4>
                        <span className="text-[9px] font-mono text-amber-400 font-bold block">AWAY</span>
                      </div>
                    </div>

                    {(event as any).notes && (
                      <div className="p-2.5 rounded-xl bg-[#090D16]/60 border border-[#24324F] text-[11px] text-[#FFC857] text-center font-mono">
                        🔥 {(event as any).notes}
                      </div>
                    )}
                  </div>
                )}

                {/* Description */}
                <div>
                  <h3 className="text-xs font-bold text-[#00B8D4] uppercase font-mono tracking-wider mb-2 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Showcase & Combine Value
                  </h3>
                  <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-line">
                    {event?.description ?? ''}
                  </p>
                </div>

                {/* Venue & Location Map Card */}
                <div className="p-4 rounded-2xl bg-[#263238]/50 border border-[#24324F] space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-[#FFC857] uppercase font-mono tracking-wider flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" />
                      Venue & Location
                    </h3>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event?.location || event?.venueName || 'USA')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#00B8D4] hover:underline font-bold flex items-center gap-1"
                    >
                      <span>Get Driving Directions</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-white">
                      {formatVenueDisplay(event?.venueName || event?.location, event?.city, event?.state)}
                    </h4>
                    {event?.address && (
                      <p className="text-xs text-slate-300 mt-0.5">{event.address}</p>
                    )}
                  </div>

                  {event.requirements && event.requirements.length > 0 && (
                    <div className="pt-2 border-t border-[#24324F]/60 space-y-1">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        Mandatory Requirements:
                      </span>
                      <ul className="list-disc pl-4 space-y-1 text-xs text-slate-300">
                        {event.requirements.map((req, idx) => (
                          <li key={idx}>{req}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Calendar Sync Quick Action */}
                <div className="p-4 rounded-2xl bg-[#090D16] border border-[#24324F] flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <CalendarPlus className="w-5 h-5 text-[#00B8D4]" />
                    <div>
                      <h4 className="text-xs font-bold text-white">Save Event to Calendar</h4>
                      <p className="text-[11px] text-slate-400">Sync with Google Calendar or download Apple .ics pass</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleAddToGoogleCalendar}
                      className="px-3 py-1.5 rounded-xl bg-[#263238] hover:bg-[#2e3c43] border border-[#24324F] text-xs font-bold text-slate-200 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <img src="https://www.gstatic.com/companion/icon_assets/calendar_2020q4_2x.png" alt="Google" className="w-3.5 h-3.5 object-contain" />
                      <span>Google Calendar</span>
                    </button>

                    <button
                      onClick={handleDownloadIcs}
                      className="px-3 py-1.5 rounded-xl bg-[#263238] hover:bg-[#2e3c43] border border-[#24324F] text-xs font-bold text-slate-200 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Apple / iCal (.ics)</span>
                    </button>
                  </div>
                </div>

                {/* Director Bridge Banner for Hosts/Tournament Admins */}
                {canManage && isTournamentEvent && (
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-[#090D16] via-[#263238] to-[#090D16] border border-[#FF6A00]/40 flex flex-wrap items-center justify-between gap-3 shadow-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#FF6A00]/20 border border-[#FF6A00]/40 flex items-center justify-center text-[#FF6A00]">
                        <Settings className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                          <span>Tournament Director Control Hub</span>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold">
                            HOST ACCESS
                          </span>
                        </h4>
                        <p className="text-xs text-slate-300 mt-0.5">
                          Launch Score Desk Controller, Delay Broadcaster, Auto-Seeding, and Gate Roster Scanner.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleLaunchControlCenter}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#FF6A00] to-[#FFC857] text-[#090D16] font-black text-xs font-mono flex items-center gap-2 shadow-[0_0_15px_rgba(255,106,0,0.3)] hover:brightness-110 active:scale-95 cursor-pointer"
                    >
                      <Settings className="w-4 h-4 animate-spin-slow" />
                      <span>⚙ Launch Tournament Control Center</span>
                    </button>
                  </div>
                )}

              </div>
            )}

            {/* TAB: DIVISIONS & BRACKETS */}
            {activeTab === 'divisions_brackets' && (
              <div className="space-y-6">
                {/* Age Categories & Division Roster */}
                <div className="p-4 rounded-2xl bg-[#090D16] border border-[#24324F] space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <h3 className="text-xs font-bold text-[#FFC857] uppercase font-mono tracking-wider flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-[#00B8D4]" />
                        Age Categories & Division Roster
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {divisions.length} active divisions participating in championship pool play & elimination brackets.
                      </p>
                    </div>

                    {canManage && (
                      <button
                        type="button"
                        onClick={() => setIsAddDivisionOpen(true)}
                        className="px-3 py-1.5 rounded-xl bg-[#00B8D4]/20 hover:bg-[#00B8D4]/30 border border-[#00B8D4]/50 text-[#00B8D4] text-xs font-bold font-mono flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ Add Division</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    {divisions.map((div) => {
                      const isSelected = div.id === selectedDivisionId;
                      return (
                        <div
                          key={div.id}
                          onClick={() => setSelectedDivisionId(div.id)}
                          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#00B8D4]/15 border-[#00B8D4] shadow-[0_0_12px_rgba(0,184,212,0.2)]'
                              : 'bg-[#263238]/40 border-[#24324F] hover:border-slate-500'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-white font-mono uppercase">{div.name}</span>
                            <span className="px-1.5 py-0.5 rounded bg-white/10 text-[9px] font-mono text-slate-300">
                              {div.format || '5v5 Flag'}
                            </span>
                          </div>
                          <div className="mt-2 text-[11px] text-slate-400">
                            <span className="text-emerald-400 font-bold font-mono">{div.registeredCount || 0}</span> of{' '}
                            <span className="text-white font-mono">{div.teamLimit || 12}</span> Teams Registered
                          </div>
                          <div className="w-full h-1 rounded-full bg-slate-800 mt-1.5 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-[#00B8D4] to-emerald-400 rounded-full"
                              style={{ width: `${Math.min(100, Math.round(((div.registeredCount || 0) / (div.teamLimit || 12)) * 100))}%` }}
                            />
                          </div>
                          {isSelected && (
                            <span className="text-[10px] text-[#00B8D4] font-bold font-mono mt-2 block">
                              ✓ Filter Active
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Championship Bracket Engine */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-[#FF6A00] uppercase font-mono tracking-wider flex items-center gap-1.5">
                      <Trophy className="w-3.5 h-3.5" />
                      Championship Playoff Brackets — {selectedDivision?.name || 'All Divisions'}
                    </h3>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Single & Double Elimination Trees
                    </span>
                  </div>

                  <PoolBracketEngine 
                    division={selectedDivision?.name || '14U Girls'} 
                    activeView="brackets" 
                  />
                </div>
              </div>
            )}

            {/* TAB: STANDINGS (W/L/Diff) */}
            {activeTab === 'standings' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h3 className="text-xs font-bold text-[#00B8D4] uppercase font-mono tracking-wider flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5" />
                      Division Standings & Tiebreaker Metrics (W/L/Diff)
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Official group pool standings for {selectedDivision?.name || 'All Divisions'}. Points Diff & Head-to-Head determine tournament seeding.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {canManage && (
                      <button
                        onClick={handleLaunchControlCenter}
                        className="px-3 py-1 rounded-xl bg-gradient-to-r from-[#FF6A00] to-[#FFC857] text-[#090D16] font-black text-xs font-mono flex items-center gap-1.5 cursor-pointer shadow-sm hover:brightness-110 active:scale-95"
                      >
                        <Settings className="w-3.5 h-3.5" />
                        <span>⚙ Open Control Center</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Embedded Standings View from PoolBracketEngine */}
                <PoolBracketEngine 
                  division={selectedDivision?.name || '14U Girls'} 
                  activeView="standings" 
                />
              </div>
            )}

            {/* TAB: SCHEDULE */}
            {activeTab === 'schedule' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-[#FF6A00] uppercase font-mono tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    Day Timeline & Activity Itinerary
                  </h3>
                  <div className="flex items-center gap-2">
                    {selectedDivisionId !== 'all' && (
                      <span className="px-2 py-0.5 rounded-full bg-[#00B8D4]/15 border border-[#00B8D4]/40 text-[#00B8D4] text-[10px] font-mono font-bold">
                        {selectedDivision?.name}
                      </span>
                    )}
                    <span className="text-xs text-slate-400 font-mono">{event.time}</span>
                  </div>
                </div>

                {filteredSchedule && filteredSchedule.length > 0 ? (
                  <div className="relative pl-6 border-l-2 border-[#24324F] space-y-6">
                    {filteredSchedule.map((slot, idx) => (
                      <div key={idx} className="relative group">
                        {/* Timeline node */}
                        <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-[#090D16] border-2 border-[#FF6A00] group-hover:border-[#00B8D4] transition-colors" />
                        
                        <div className="p-3.5 rounded-2xl bg-[#263238]/50 border border-[#24324F] group-hover:border-[#24324F]/80 transition-all space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="px-2 py-0.5 rounded bg-[#FF6A00]/15 text-[#FF6A00] text-xs font-mono font-bold">
                              {slot.time}
                            </span>
                            <div className="flex items-center gap-2">
                              {slot.divisionName && (
                                <span className="px-1.5 py-0.5 rounded bg-[#00B8D4]/10 border border-[#00B8D4]/30 text-[#00B8D4] text-[9px] font-mono font-black">
                                  {slot.divisionName}
                                </span>
                              )}
                              <span className="text-[10px] text-slate-500 font-mono">Stage {idx + 1}</span>
                            </div>
                          </div>
                          <h4 className="text-sm font-bold text-white pt-1">{slot.title}</h4>
                          {slot.desc && (
                            <p className="text-xs text-slate-300 leading-relaxed">{slot.desc}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center bg-[#263238]/20 rounded-2xl border border-[#24324F] space-y-2">
                    <Clock className="w-8 h-8 text-slate-500 mx-auto" />
                    <p className="text-xs text-slate-300 font-bold">
                      {selectedDivisionId !== 'all'
                        ? `No itinerary events specifically scheduled for ${selectedDivision?.name || 'this division'} yet.`
                        : 'Detailed timeline being finalized by event directors.'}
                    </p>
                    {selectedDivisionId !== 'all' && (
                      <button
                        type="button"
                        onClick={() => setSelectedDivisionId('all')}
                        className="mt-2 px-3 py-1.5 rounded-xl bg-[#263238] hover:bg-[#2e3c43] text-xs font-bold text-[#00B8D4] border border-[#24324F] transition-colors cursor-pointer"
                      >
                        Show All Divisions Timeline
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: COACHING STAFF */}
            {activeTab === 'staff' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <h3 className="text-xs font-bold text-[#00B8D4] uppercase font-mono tracking-wider flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Lead Evaluators & Coaching Staff
                    </h3>
                    {selectedDivisionId !== 'all' && (
                      <p className="text-[11px] text-slate-400">
                        Showing staff for <span className="text-[#00B8D4] font-bold">{selectedDivision?.name}</span> and tournament-wide officials
                      </p>
                    )}
                  </div>

                  {canManage && (
                    <button
                      id="invite-staff-trigger-btn"
                      type="button"
                      onClick={() => setIsInviteStaffOpen(true)}
                      className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-bold uppercase tracking-wider font-mono flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/20 cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>+ Invite Staff / Coach</span>
                    </button>
                  )}
                </div>

                {/* Host / Tournament Director Card */}
                <div className="p-4 rounded-2xl bg-[#263238]/50 border border-[#24324F] flex items-start gap-3.5">
                  <img
                    src={event.hostAvatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80'}
                    alt={event.hostName || 'Host'}
                    className="w-12 h-12 rounded-2xl object-cover border border-[#00B8D4]/40 shrink-0"
                    referrerPolicy="no-referrer"
                  />
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-white">{event.hostName || event.organizer}</h4>
                      <span className="px-1.5 py-0.5 rounded bg-[#00B8D4]/15 border border-[#00B8D4]/40 text-[#00B8D4] text-[9px] font-black uppercase font-mono">
                        TOURNAMENT DIRECTOR
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">{event.hostRole || 'Director / Organizer'} • {event.organizer}</p>
                    {event.hostBio && <p className="text-xs text-slate-300 pt-1">{event.hostBio}</p>}
                  </div>
                </div>

                {/* Confirmed Staff Members */}
                {confirmedStaff.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase font-mono tracking-wider text-slate-400">
                        Confirmed Staff & Officials ({confirmedStaff.length})
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {confirmedStaff.map((member) => (
                        <StaffMemberCard
                          key={member.id || member.userId}
                          member={member}
                          canManage={canManage}
                          onToggleStatus={handleToggleStaffStatus}
                          onRemove={handleRemoveStaff}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Pending Staff Invitations */}
                {pendingStaff.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase font-mono tracking-wider text-amber-400 flex items-center gap-1.5">
                        <Clock className="w-3 h-3" />
                        Pending Invitations ({pendingStaff.length})
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {pendingStaff.map((member) => (
                        <StaffMemberCard
                          key={member.id || member.userId}
                          member={member}
                          canManage={canManage}
                          onToggleStatus={handleToggleStaffStatus}
                          onRemove={handleRemoveStaff}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {filteredStaff.length === 0 && (
                  <div className="p-8 text-center bg-[#263238]/20 rounded-2xl border border-[#24324F] space-y-2">
                    <ShieldCheck className="w-8 h-8 text-slate-500 mx-auto mb-1" />
                    <p className="text-xs text-slate-300 font-bold">
                      No coaches or staff registered for {selectedDivision?.name || 'this division'} yet.
                    </p>
                    {canManage && (
                      <button
                        type="button"
                        onClick={() => setIsInviteStaffOpen(true)}
                        className="mt-2 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold font-mono transition-colors cursor-pointer"
                      >
                        + Invite Staff for {selectedDivision?.name || 'Tournament'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: ROSTER & ATTENDEES */}
            {activeTab === 'roster' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-[#FFC857] uppercase font-mono tracking-wider flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    Registered Recruits & Attendees ({filteredAttendees.length}{selectedDivisionId !== 'all' ? ` of ${currentAttendees.length}` : ''})
                  </h3>
                  <div className="flex items-center gap-2">
                    {selectedDivisionId !== 'all' && (
                      <span className="px-2 py-0.5 rounded-full bg-[#00B8D4]/15 border border-[#00B8D4]/40 text-[#00B8D4] text-[10px] font-mono font-bold">
                        {selectedDivision?.name}
                      </span>
                    )}
                    <span className="text-xs text-slate-400 font-mono">
                      {capacityRemaining} Spots Available
                    </span>
                  </div>
                </div>

                {filteredAttendees && filteredAttendees.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {filteredAttendees.map((attendee, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-[#263238]/40 border border-[#24324F] flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-2.5">
                          <img
                            src={attendee.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'}
                            alt={attendee.name}
                            className="w-9 h-9 rounded-xl object-cover border border-slate-700"
                            referrerPolicy="no-referrer"
                          />
                          <div>
                            <h4 className="text-xs font-bold text-white flex items-center gap-1">
                              {attendee.name}
                              {attendee.role === 'athlete' && (
                                <span className="text-[9px] font-black text-[#00B8D4]">★</span>
                              )}
                            </h4>
                            <p className="text-[10px] text-slate-400">
                              {attendee.sport || event.sport} {attendee.classYear ? `• Class of '${attendee.classYear}` : ''}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1">
                          <span className="px-2 py-0.5 rounded bg-[#00B8D4]/10 text-[#00B8D4] border border-[#00B8D4]/30 text-[9px] font-mono font-bold">
                            {attendee.ticketType || 'CONFIRMED'}
                          </span>
                          {attendee.divisionName && (
                            <span className="text-[9px] font-mono text-slate-400">
                              {attendee.divisionName}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center bg-[#263238]/20 rounded-2xl border border-[#24324F] space-y-2">
                    <Users className="w-8 h-8 text-slate-500 mx-auto mb-1" />
                    <p className="text-xs text-slate-300 font-bold">
                      {selectedDivisionId !== 'all' 
                        ? `No attendees registered for ${selectedDivision?.name || 'this division'} yet.` 
                        : 'Be the first athlete to claim your spot at this showcase!'}
                    </p>
                    {selectedDivisionId !== 'all' && (
                      <button
                        type="button"
                        onClick={() => setSelectedDivisionId('all')}
                        className="mt-2 px-3 py-1.5 rounded-xl bg-[#263238] hover:bg-[#2e3c43] text-xs font-bold text-[#00B8D4] border border-[#24324F] transition-colors cursor-pointer"
                      >
                        Show All Attendees
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

          </div>

          {/* Sticky Bottom Action Drawer */}
          <div className="p-4 border-t border-[#24324F] bg-[#090D16] flex items-center justify-between gap-3 shrink-0">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-mono block">TICKET STATUS</span>
              <div className="text-sm font-black text-white font-mono flex items-center gap-1.5">
                {event.price === 0 ? (
                  <span className="text-[#00F5D4]">FREE ADMISSION</span>
                ) : (
                  <span>${event.price}.00 <span className="text-xs text-slate-400 font-normal font-sans">/ Athlete</span></span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              {isUserRegistered ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowPassModal(true)}
                    className="px-4 py-2.5 rounded-xl bg-[#00B8D4]/15 hover:bg-[#00B8D4]/25 border border-[#00B8D4]/40 text-[#00B8D4] font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer font-mono"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>View Pass</span>
                  </button>

                  <button
                    onClick={handleRegister}
                    disabled={isProcessing}
                    className="px-4 py-2.5 rounded-xl bg-[#263238] hover:bg-rose-500/20 hover:text-rose-300 border border-[#24324F] text-slate-300 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
                  >
                    {isProcessing ? 'Updating...' : 'Cancel RSVP'}
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleRegister}
                  disabled={isProcessing || capacityRemaining <= 0}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#00B8D4] to-[#00F5D4] text-[#090D16] font-black text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2 shadow-[0_0_20px_rgba(0,184,212,0.4)] hover:brightness-110 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      <span>Securing Spot...</span>
                    </>
                  ) : capacityRemaining <= 0 ? (
                    <span>Event Sold Out</span>
                  ) : event.price === 0 ? (
                    <>
                      <Zap className="w-4 h-4 fill-current" />
                      <span>1-Tap Free RSVP</span>
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4" />
                      <span>Register & Pay (${event.price})</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

        </motion.div>
      </div>

      {/* Stripe Checkout Simulation Modal */}
      {showCheckoutConfirmation && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-black/90 backdrop-blur-md">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md bg-[#090D16] border border-[#24324F] rounded-3xl p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-[#24324F] pb-3">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#00B8D4]" />
                <h3 className="text-sm font-black text-white uppercase">Secure PayPal Checkout</h3>
              </div>
              <button
                onClick={() => setShowCheckoutConfirmation(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-[#263238]/60 border border-[#24324F] space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Event Pass:</span>
                <span className="font-bold text-white">{event.title}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Athlete:</span>
                <span className="font-bold text-white">{user?.displayName || user?.email}</span>
              </div>
              <div className="flex justify-between text-sm font-bold border-t border-[#24324F] pt-2">
                <span className="text-white">Total Due:</span>
                <span className="text-[#00F5D4] font-mono">${event.price}.00</span>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#00B8D4]" />
              <span>Instant electronic pass generation & laser combine registration</span>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowCheckoutConfirmation(false)}
                className="flex-1 py-2.5 rounded-xl bg-[#263238] text-slate-300 font-bold text-xs uppercase"
              >
                Cancel
              </button>
              <button
                onClick={handleRegister}
                disabled={isProcessing}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#00B8D4] to-[#00F5D4] text-[#090D16] font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(0,184,212,0.4)]"
              >
                {isProcessing ? 'Processing...' : `Pay $${event?.price ?? 0}.00`}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Digital Event Pass Modal */}
      {showPassModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-black/90 backdrop-blur-md">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-sm bg-[#090D16] border border-[#00B8D4] rounded-3xl p-6 shadow-[0_0_35px_rgba(0,184,212,0.3)] space-y-4 text-center"
          >
            <div className="w-12 h-12 rounded-2xl bg-[#00B8D4]/15 border border-[#00B8D4] flex items-center justify-center mx-auto text-[#00B8D4]">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div>
              <span className="px-2 py-0.5 rounded bg-[#00B8D4]/15 text-[#00B8D4] text-[10px] font-black font-mono uppercase">
                OFFICIAL ATHLETE CREDENTIAL
              </span>
              <h3 className="text-base font-black text-white uppercase mt-1">{event?.title ?? 'Showcase Event'}</h3>
              <p className="text-xs text-slate-400 mt-0.5">{event?.date ?? 'TBD'} • {event?.venueName || event?.location || 'Athletic Facility'}</p>
            </div>

            {/* QR Pass Box */}
            <div className="p-4 rounded-2xl bg-white text-black max-w-[200px] mx-auto space-y-1">
              <div className="aspect-square bg-slate-100 rounded-lg flex items-center justify-center border-2 border-black">
                <QrCode className="w-32 h-32 text-black" />
              </div>
              <span className="font-mono text-[9px] font-black uppercase tracking-wider block">
                PASS: J1P-{String(event?.id || 'EVENT').slice(-6).toUpperCase()}-{user?.uid ? user.uid.slice(-4).toUpperCase() : 'PASS'}
              </span>
            </div>

            <div className="text-xs text-slate-300 font-mono">
              Athlete: <span className="font-bold text-white">{user?.displayName || user?.email}</span>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleDownloadIcs}
                className="flex-1 py-2 rounded-xl bg-[#263238] hover:bg-[#2e3c43] text-slate-200 text-xs font-bold uppercase tracking-wider"
              >
                Add to Calendar
              </button>
              <button
                onClick={() => setShowPassModal(false)}
                className="flex-1 py-2 rounded-xl bg-[#00B8D4] text-[#090D16] text-xs font-black uppercase tracking-wider"
              >
                Done
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Add Division Inline Modal */}
      <AddDivisionModal
        isOpen={isAddDivisionOpen}
        onClose={() => setIsAddDivisionOpen(false)}
        onAddDivision={handleAddDivision}
        existingDivisions={divisions}
      />

      {/* Invite Staff / Coach Inline Modal */}
      <InviteStaffModal
        isOpen={isInviteStaffOpen}
        onClose={() => setIsInviteStaffOpen(false)}
        onInviteStaff={handleInviteStaff}
        divisions={divisions}
      />

    </AnimatePresence>
  );
};
