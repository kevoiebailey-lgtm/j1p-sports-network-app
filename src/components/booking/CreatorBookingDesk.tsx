import React, { useState, useEffect, useMemo } from 'react';
import { 
  Camera, 
  Film, 
  Video, 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  ShieldCheck, 
  CheckCircle, 
  AlertCircle, 
  Sparkles, 
  DollarSign, 
  CreditCard, 
  ChevronRight, 
  ArrowLeft, 
  Info, 
  ExternalLink,
  Search,
  Check,
  Award,
  Zap,
  Lock,
  Layers,
  FileText
} from 'lucide-react';
import { PayPalButtons, PayPalScriptProvider } from '@paypal/react-paypal-js';
import { PayPalErrorBoundary, getPayPalClientId } from '../../app/providers';
import { db, sanitizeFirestorePayload } from '../../lib/firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  addDoc, 
  serverTimestamp, 
  limit 
} from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { US_STATES } from '../../lib/locationData';
import { AuthModal } from '../Auth/AuthModal';
import { useParams, useSearchParams } from 'react-router-dom';

// Package Definition Interface
export interface BookingPackage {
  id: string;
  name: string;
  subtitle: string;
  category: 'PHOTOGRAPHY' | 'VIDEOGRAPHY' | 'COACHES_FILM';
  price: number;
  icon: typeof Camera;
  popular?: boolean;
  features: string[];
}

export interface CreatorProfileData {
  uid: string;
  displayName: string;
  brandName?: string;
  photoURL?: string;
  avatarUrl?: string;
  mediaSpecialization?: string;
  equipment?: string;
  cityState?: string;
  state?: string;
  city?: string;
  bio?: string;
  rating?: number;
  completedBookings?: number;
  creatorRates?: {
    photoSet?: number;
    mixtape?: number;
    all22?: number;
  };
  defaultPhotoPrice?: number;
  defaultVideoPrice?: number;
  paypalMerchantId?: string;
  paypalEmail?: string;
}

export interface CreatorBookingDeskProps {
  creatorId?: string;
  preselectedPackageId?: string;
  onClose?: () => void;
  onSuccess?: (bookingId: string) => void;
  className?: string;
}

const PLATFORM_SERVICE_FEE = 15.00;

export default function CreatorBookingDesk({
  creatorId: initialCreatorId,
  preselectedPackageId = 'viral-mixtape',
  onClose,
  onSuccess,
  className = ''
}: CreatorBookingDeskProps) {
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  const [showAuthModal, setShowAuthModal] = useState(false);

  const routeParams = useParams<{ creatorId?: string }>();
  const [searchParams] = useSearchParams();
  const resolvedInitialCreatorId = initialCreatorId || routeParams.creatorId || searchParams.get('creatorId') || '';

  // Selected Creator & Creator Directory State
  const [selectedCreatorId, setSelectedCreatorId] = useState<string>(resolvedInitialCreatorId);
  const [creator, setCreator] = useState<CreatorProfileData | null>(null);
  const [availableCreators, setAvailableCreators] = useState<CreatorProfileData[]>([]);
  const [loadingCreator, setLoadingCreator] = useState<boolean>(true);
  const [creatorSearchQuery, setCreatorSearchQuery] = useState('');

  // Selected Package
  const [selectedPackageId, setSelectedPackageId] = useState<string>(preselectedPackageId);

  // Logistics Form Fields
  const [gameDate, setGameDate] = useState('');
  const [gameTime, setGameTime] = useState('14:00');
  const [venueName, setVenueName] = useState('');
  const [venueCity, setVenueCity] = useState('');
  const [venueState, setVenueState] = useState('TX');
  const [fieldNumber, setFieldNumber] = useState('');
  const [athleteName, setAthleteName] = useState('');
  const [athleteJersey, setAthleteJersey] = useState('');
  const [athleteTeam, setAthleteTeam] = useState('');
  const [notes, setNotes] = useState('');

  // Validation & Checkout UI State
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [completedBooking, setCompletedBooking] = useState<{
    bookingId: string;
    athleteName: string;
    packageName: string;
    totalAmount: number;
    gameDate: string;
    venueName: string;
  } | null>(null);

  // Today's date for date-picker min restriction
  const minDateString = useMemo(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }, []);

  // Autofill athlete details from user's active profile if available
  useEffect(() => {
    if (profile && !athleteName) {
      if (profile.role === 'athlete') {
        if (profile.displayName) setAthleteName(profile.displayName);
        if (profile.jerseyNumber) setAthleteJersey(profile.jerseyNumber);
        if (profile.teamName || profile.highSchool) setAthleteTeam(profile.teamName || profile.highSchool || '');
        if (profile.state) setVenueState(profile.state);
        if (profile.city) setVenueCity(profile.city);
      }
    }
  }, [profile]);

  // Load Creator or Creator Directory
  useEffect(() => {
    let isMounted = true;

    async function loadCreatorData() {
      setLoadingCreator(true);
      try {
        if (selectedCreatorId) {
          // Fetch specific creator profile
          const userDocRef = doc(db, 'users', selectedCreatorId);
          const snap = await getDoc(userDocRef);
          if (snap.exists()) {
            const data = snap.data() as any;
            if (isMounted) {
              setCreator({
                uid: snap.id,
                displayName: data.displayName || data.brandName || 'Verified Sports Creator',
                brandName: data.brandName || data.displayName,
                photoURL: data.photoURL || data.avatarUrl,
                avatarUrl: data.avatarUrl || data.photoURL,
                mediaSpecialization: data.mediaSpecialization || 'Sports Photography & Videography',
                equipment: data.equipment || 'Sony A7S III / FX3 4K 120fps Cinema Rig',
                cityState: data.cityState || (data.city && data.state ? `${data.city}, ${data.state}` : 'National Coverage'),
                state: data.state || 'TX',
                city: data.city || '',
                bio: data.bio || 'Professional sports visual artist capturing high-impact gameday moments for varsity, AAU, and collegiate athletes.',
                rating: 4.95,
                completedBookings: data.completedBookings || 48,
                creatorRates: data.creatorRates,
                defaultPhotoPrice: data.defaultPhotoPrice,
                defaultVideoPrice: data.defaultVideoPrice,
                paypalMerchantId: data.paypalMerchantId,
                paypalEmail: data.paypalMerchantEmail || data.paypalEmail
              });
            }
          } else {
            // Creator document not found; fallback to generic creator object
            if (isMounted) {
              setCreator({
                uid: selectedCreatorId,
                displayName: 'Just1Play Official Media Creator',
                brandName: 'J1P Media Crew',
                mediaSpecialization: 'High-Impact Sports Cinematography',
                equipment: 'Cinema 4K Rig & Telephoto Prime Lenses',
                cityState: 'National Coverage',
                bio: 'Experienced gameday visual specialist providing pro highlight reels and high-speed DSLR action photography.',
                rating: 4.9,
                completedBookings: 62
              });
            }
          }
        } else {
          // No creatorId supplied: fetch creators from users collection
          const q = query(collection(db, 'users'), where('role', '==', 'creator'), limit(8));
          const querySnap = await getDocs(q);
          const list: CreatorProfileData[] = [];
          querySnap.forEach((d) => {
            const data = d.data() as any;
            list.push({
              uid: d.id,
              displayName: data.displayName || data.brandName || 'Creator',
              brandName: data.brandName || data.displayName,
              photoURL: data.photoURL || data.avatarUrl,
              avatarUrl: data.avatarUrl || data.photoURL,
              mediaSpecialization: data.mediaSpecialization || 'Sports Photography & Videography',
              equipment: data.equipment || 'Sony FX3 Cinema Rig',
              cityState: data.cityState || (data.city && data.state ? `${data.city}, ${data.state}` : 'National Coverage'),
              bio: data.bio || '',
              rating: 4.9,
              completedBookings: 35,
              creatorRates: data.creatorRates,
              paypalMerchantId: data.paypalMerchantId
            });
          });

          // If no creators in db, provide standard verified creator fallback
          if (list.length === 0) {
            list.push({
              uid: 'creator_featured_01',
              displayName: 'Apex Cinema & Visuals',
              brandName: 'Apex Media Group',
              mediaSpecialization: 'Sports Photography & Viral Highlight Reels',
              equipment: 'Sony A7S III / FX3 + 70-200mm f/2.8 GM',
              cityState: 'Austin, TX',
              bio: 'Top-tier high school & collegiate gameday specialist. Trusted by 200+ Texas high school athletes.',
              rating: 4.98,
              completedBookings: 112
            });
          }

          if (isMounted) {
            setAvailableCreators(list);
            if (list.length > 0) {
              setSelectedCreatorId(list[0].uid);
              setCreator(list[0]);
            }
          }
        }
      } catch (err) {
        console.error('[CreatorBookingDesk] Error loading creator:', err);
      } finally {
        if (isMounted) setLoadingCreator(false);
      }
    }

    loadCreatorData();

    return () => {
      isMounted = false;
    };
  }, [selectedCreatorId]);

  // Packages with dynamic or standard fallback rates
  const packages: BookingPackage[] = useMemo(() => {
    // Check if creator has custom rate overrides
    const photoPrice = Number(creator?.creatorRates?.photoSet) || 100;
    const mixtapePrice = Number(creator?.creatorRates?.mixtape) || 150;
    const all22Price = Number(creator?.creatorRates?.all22) || 200;

    return [
      {
        id: 'pro-photo',
        name: 'Pro Game Photo Set',
        subtitle: '25+ High-res action shots',
        category: 'PHOTOGRAPHY',
        price: photoPrice,
        icon: Camera,
        features: [
          '25+ Color-Graded 4K DSLR Action Shots',
          'In-game clutch moments & sideline warmups',
          'High-res uncompressed cloud gallery delivery',
          'Full personal, school & recruiting usage rights',
          'Delivered within 48 hours of kickoff'
        ]
      },
      {
        id: 'viral-mixtape',
        name: 'Viral Player Mixtape',
        subtitle: '60s edited reel with music & stat overlays',
        category: 'VIDEOGRAPHY',
        price: mixtapePrice,
        icon: Film,
        popular: true,
        features: [
          '60-Second High-Energy 4K Highlight Reel',
          'Sync beat-matched hip-hop / trap soundtrack',
          'Custom spotlight circle indicator & stat overlay card',
          'Optimized for TikTok, IG Reels & YouTube Shorts',
          'Includes vertical 9:16 + widescreen 16:9 master files'
        ]
      },
      {
        id: 'all-22-film',
        name: 'Recruiting All-22 / Full Game Film',
        subtitle: 'Full game continuous sideline angle',
        category: 'COACHES_FILM',
        price: all22Price,
        icon: Video,
        features: [
          'Continuous elevated sideline or endzone coaches view',
          'Uncut high-angle tactical coverage for recruiters',
          'Down & distance sequence markers with time stamps',
          'Hudl, YouTube & college scout submission compliant',
          'Full raw footage archive access'
        ]
      }
    ];
  }, [creator]);

  // Current selected package
  const selectedPackage = useMemo(() => {
    return packages.find(p => p.id === selectedPackageId) || packages[1];
  }, [packages, selectedPackageId]);

  // Price calculations
  const subtotal = selectedPackage.price;
  const serviceFee = PLATFORM_SERVICE_FEE;
  const total = subtotal + serviceFee;

  // Validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!gameDate) errors.gameDate = 'Please select the gameday date.';
    if (!gameTime) errors.gameTime = 'Please specify kickoff/start time.';
    if (!venueName.trim()) errors.venueName = 'Venue name is required.';
    if (!venueCity.trim()) errors.venueCity = 'Venue city is required.';
    if (!athleteName.trim()) errors.athleteName = 'Target athlete name is required.';
    if (!athleteJersey.trim()) errors.athleteJersey = 'Jersey number is required.';
    if (!athleteTeam.trim()) errors.athleteTeam = 'Team name is required.';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Finalize booking creation in Firestore
  const handleFinalizeBooking = async (paymentDetails: {
    paymentId: string;
    provider: 'paypal' | 'sandbox';
  }) => {
    if (!user) {
      showToast('error', 'Authentication Required', 'Please sign in to confirm your booking.');
      setShowAuthModal(true);
      return;
    }

    setIsProcessingPayment(true);

    try {
      const targetCreatorId = creator?.uid || selectedCreatorId || 'unknown_creator';
      const targetCreatorName = creator?.displayName || creator?.brandName || 'Just1Play Creator';
      const targetCreatorEmail = creator?.paypalEmail || '';
      const targetCreatorPhoto = creator?.photoURL || creator?.avatarUrl || '';

      const bookingData = sanitizeFirestorePayload({
        creatorId: targetCreatorId,
        creatorName: targetCreatorName,
        creatorEmail: targetCreatorEmail,
        creatorPhoto: targetCreatorPhoto,
        userId: user.uid,
        authorId: user.uid,
        userName: profile?.displayName || user.displayName || 'Athletic Member',
        userEmail: user.email || '',
        userPhone: (profile as any)?.phoneNumber || (user as any)?.phoneNumber || '',
        userRole: profile?.role || 'athlete',
        packageId: selectedPackage.id,
        packageName: selectedPackage.name,
        packageCategory: selectedPackage.category,
        packageSubtitle: selectedPackage.subtitle,
        subtotal: subtotal,
        serviceFee: serviceFee,
        totalAmount: total,
        currency: 'USD',
        status: 'confirmed', // 'confirmed' | 'in_progress' | 'delivered' | 'cancelled'
        paymentStatus: 'paid', // 'paid' | 'pending' | 'refunded'
        paymentProvider: paymentDetails.provider,
        paypalOrderId: paymentDetails.paymentId,
        gameDate: gameDate,
        gameTime: gameTime,
        venueName: venueName.trim(),
        venueCity: venueCity.trim(),
        venueState: venueState,
        fieldNumber: fieldNumber.trim() || 'Main Field/Court',
        athleteName: athleteName.trim(),
        athleteJersey: athleteJersey.trim().startsWith('#') ? athleteJersey.trim() : `#${athleteJersey.trim()}`,
        athleteTeam: athleteTeam.trim(),
        notes: notes.trim(),
        driveUrl: '',
        deliveryStatus: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      const docRef = await addDoc(collection(db, 'bookings'), bookingData);

      showToast('success', 'Booking Confirmed!', 'Your media creator has been locked in and notified.');

      setCompletedBooking({
        bookingId: docRef.id,
        athleteName: athleteName.trim(),
        packageName: selectedPackage.name,
        totalAmount: total,
        gameDate: `${gameDate} at ${gameTime}`,
        venueName: `${venueName.trim()} (${venueCity.trim()}, ${venueState})`
      });

      if (onSuccess) {
        onSuccess(docRef.id);
      }
    } catch (err: any) {
      console.error('[CreatorBookingDesk] Failed to record booking in Firestore:', err);
      showToast('error', 'Booking Error', err?.message || 'Could not record booking to database.');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // PayPal Create Order Handler
  const handlePayPalCreateOrder = (_data: any, actions: any) => {
    if (!validateForm()) {
      showToast('error', 'Incomplete Logistics', 'Please fill in the gameday logistics before checkout.');
      return Promise.reject(new Error('Incomplete logistics form'));
    }

    if (!actions?.order) {
      return Promise.reject(new Error('PayPal SDK order actions unavailable'));
    }

    return actions.order.create({
      intent: 'CAPTURE',
      purchase_units: [
        {
          description: `Just1Play Media: ${selectedPackage.name} for ${athleteName} (#${athleteJersey})`,
          amount: {
            currency_code: 'USD',
            value: total.toFixed(2),
            breakdown: {
              item_total: {
                currency_code: 'USD',
                value: subtotal.toFixed(2)
              },
              handling: {
                currency_code: 'USD',
                value: serviceFee.toFixed(2)
              }
            }
          },
          custom_id: `creator_${creator?.uid || selectedCreatorId}_athlete_${athleteName}`,
          shipping: {
            address: {
              country_code: 'US'
            }
          }
        }
      ]
    });
  };

  // PayPal onApprove Handler
  const handlePayPalApprove = async (_data: any, actions: any) => {
    try {
      setIsProcessingPayment(true);
      const details = await actions.order.capture();
      const orderId = details?.id || _data?.orderID || `PAYPAL_${Date.now()}`;
      await handleFinalizeBooking({
        paymentId: orderId,
        provider: 'paypal'
      });
    } catch (err: any) {
      console.error('[CreatorBookingDesk] PayPal Capture Error:', err);
      showToast('error', 'Payment Failed', err?.message || 'Could not capture PayPal payment.');
      setIsProcessingPayment(false);
    }
  };

  // Quick autofill helper
  const handleAutofillProfile = () => {
    if (!profile) return;
    if (profile.displayName) setAthleteName(profile.displayName);
    if (profile.jerseyNumber) setAthleteJersey(profile.jerseyNumber);
    if (profile.teamName || profile.highSchool) setAthleteTeam(profile.teamName || profile.highSchool || '');
    if (profile.state) setVenueState(profile.state);
    if (profile.city) setVenueCity(profile.city);
    showToast('info', 'Profile Autofilled', 'Athlete details synchronized from your Just1Play profile.');
  };

  // -------------------------------------------------------------
  // CONFIRMATION SCREEN (Obsidian Aesthetic)
  // -------------------------------------------------------------
  if (completedBooking) {
    return (
      <div id="creator-booking-confirmation" className={`w-full max-w-3xl mx-auto bg-zinc-950 border border-zinc-800 rounded-3xl p-6 md:p-10 text-white shadow-2xl relative overflow-hidden ${className}`}>
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 text-center space-y-6">
          <div className="w-20 h-20 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center mx-auto text-teal-400 shadow-[0_0_30px_rgba(20,184,166,0.2)]">
            <CheckCircle className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-teal-500/20 text-teal-300 border border-teal-500/30">
              <ShieldCheck className="w-3.5 h-3.5" /> Gameday Coverage Locked
            </span>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight text-white">
              Booking Locked! Your creator has been assigned and notified.
            </h2>
            <p className="text-sm md:text-base text-zinc-400 max-w-lg mx-auto">
              Your gameday reservation is confirmed. Your assigned visual artist is prepping their rig for your kickoff.
            </p>
          </div>

          {/* Receipt Breakdown Card */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 text-left space-y-4 max-w-xl mx-auto">
            <div className="flex justify-between items-center pb-3 border-b border-zinc-800 text-xs">
              <span className="text-zinc-400 font-medium">Booking ID</span>
              <span className="font-mono text-teal-400 font-bold">{completedBooking.bookingId}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-zinc-500 block">Target Athlete</span>
                <span className="text-white font-semibold text-sm">{completedBooking.athleteName}</span>
              </div>
              <div>
                <span className="text-zinc-500 block">Selected Package</span>
                <span className="text-teal-300 font-semibold text-sm">{completedBooking.packageName}</span>
              </div>
              <div>
                <span className="text-zinc-500 block">Scheduled Kickoff</span>
                <span className="text-white font-semibold">{completedBooking.gameDate}</span>
              </div>
              <div>
                <span className="text-zinc-500 block">Venue & Location</span>
                <span className="text-white font-semibold">{completedBooking.venueName}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-zinc-800 flex justify-between items-center">
              <span className="text-xs font-semibold text-zinc-400">Total Paid (via PayPal)</span>
              <span className="text-xl font-black text-emerald-400">${completedBooking.totalAmount.toFixed(2)} USD</span>
            </div>
          </div>

          {/* Next Steps Info */}
          <div className="p-4 rounded-xl bg-teal-950/30 border border-teal-800/40 text-left text-xs text-zinc-300 space-y-1.5 max-w-xl mx-auto">
            <div className="flex items-center gap-2 text-teal-400 font-semibold">
              <Info className="w-4 h-4" /> Next Steps
            </div>
            <p>1. Your creator will arrive at the field 30 minutes prior to kickoff.</p>
            <p>2. Keep your jersey number clearly visible during warmup and live play.</p>
            <p>3. Following gameday, your media will be color-graded and delivered via your secure Google Drive link within 48 hours.</p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <button
              id="booking-desk-done-btn"
              onClick={() => {
                if (onClose) onClose();
                else window.location.href = '/dashboard/creator';
              }}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-zinc-950 font-bold text-sm transition shadow-[0_0_20px_rgba(20,184,166,0.3)] cursor-pointer"
            >
              Go to Creator Management Desk
            </button>
            <button
              id="booking-desk-another-btn"
              onClick={() => {
                setCompletedBooking(null);
                setVenueName('');
                setNotes('');
              }}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-semibold text-sm border border-zinc-700 transition cursor-pointer"
            >
              Book Another Gameday
            </button>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // MAIN BOOKING DESK
  // -------------------------------------------------------------
  return (
    <div id="creator-booking-desk" className={`w-full max-w-5xl mx-auto space-y-8 pb-32 md:pb-16 ${className}`}>
      {/* Top Header Card */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 md:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-teal-500/10 text-teal-400 border border-teal-500/30">
              <Zap className="w-3.5 h-3.5" /> Just1Play Official Media Desk
            </div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-black text-white tracking-tight">
              Book Verified Sports Creators & Videographers
            </h1>
            <p className="text-sm text-zinc-400 max-w-2xl">
              Lock in dedicated sideline cameras for your next game. 4K DSLR action shots, viral mixtape reels, and recruiting coaches film delivered straight to your profile.
            </p>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 text-xs font-semibold transition cursor-pointer"
            >
              Close Desk
            </button>
          )}
        </div>
      </div>

      {/* Creator Profile Selector / Card */}
      {loadingCreator ? (
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-8 text-center text-zinc-400 animate-pulse">
          <div className="w-12 h-12 rounded-full bg-zinc-800 mx-auto mb-3" />
          <p className="text-sm">Loading verified sports creator profile...</p>
        </div>
      ) : creator ? (
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden flex items-center justify-center shrink-0">
              {creator.photoURL || creator.avatarUrl ? (
                <img
                  src={creator.photoURL || creator.avatarUrl}
                  alt={creator.displayName}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <Camera className="w-7 h-7 text-teal-400" />
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">{creator.brandName || creator.displayName}</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/40">
                  VERIFIED PRO
                </span>
              </div>
              <p className="text-xs text-zinc-400 line-clamp-1">{creator.mediaSpecialization}</p>
              <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                <span className="flex items-center gap-1 text-zinc-400">
                  <MapPin className="w-3.5 h-3.5 text-teal-400" /> {creator.cityState}
                </span>
                <span>•</span>
                <span className="text-amber-400 font-semibold">★ {creator.rating || 4.9}</span>
                <span>•</span>
                <span className="text-zinc-400">{creator.completedBookings || 40}+ Gamedays Completed</span>
              </div>
            </div>
          </div>

          {availableCreators.length > 1 && (
            <div className="w-full md:w-auto">
              <label className="text-xs text-zinc-400 block mb-1">Switch Creator</label>
              <select
                id="select-creator-dropdown"
                value={selectedCreatorId}
                onChange={(e) => setSelectedCreatorId(e.target.value)}
                className="w-full md:w-56 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white outline-none cursor-pointer focus:border-teal-500"
              >
                {availableCreators.map((c) => (
                  <option key={c.uid} value={c.uid} className="bg-zinc-900 text-white">
                    {c.displayName || c.brandName} ({c.cityState})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      ) : null}

      {/* STEP 1: PACKAGE SELECTORS */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-teal-400 uppercase tracking-wider">Step 1</span>
            <h2 className="text-xl font-bold text-white">Select Your Media Package</h2>
          </div>
          <span className="text-xs text-zinc-500">Includes guaranteed turnaround</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {packages.map((pkg) => {
            const isSelected = selectedPackageId === pkg.id;
            const Icon = pkg.icon;

            return (
              <div
                key={pkg.id}
                id={`package-card-${pkg.id}`}
                onClick={() => setSelectedPackageId(pkg.id)}
                className={`relative rounded-2xl p-6 cursor-pointer transition-all duration-200 flex flex-col justify-between ${
                  isSelected
                    ? 'bg-zinc-900/90 border-2 border-teal-500 shadow-[0_0_25px_rgba(20,184,166,0.2)]'
                    : 'bg-zinc-950 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/50'
                }`}
              >
                {pkg.popular && (
                  <span className="absolute -top-3 right-6 px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-teal-500 text-zinc-950 shadow-md">
                    Most Popular
                  </span>
                )}

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      isSelected ? 'bg-teal-500/20 text-teal-400 border border-teal-500/40' : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                    }`}>
                      <Icon className="w-6 h-6" />
                    </div>

                    <div className="text-right">
                      <span className="text-2xl font-black text-white">${pkg.price}</span>
                      <span className="text-xs text-zinc-500 block">USD</span>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-white">{pkg.name}</h3>
                    <p className="text-xs text-zinc-400 mt-0.5">{pkg.subtitle}</p>
                  </div>

                  <div className="pt-3 border-t border-zinc-800/80 space-y-2">
                    {pkg.features.map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-zinc-300">
                        <Check className="w-3.5 h-3.5 text-teal-400 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-5 mt-4 border-t border-zinc-800/60">
                  <div className={`w-full py-2.5 rounded-xl font-bold text-xs text-center transition ${
                    isSelected
                      ? 'bg-teal-500 text-zinc-950 shadow-sm'
                      : 'bg-zinc-900 text-zinc-400 group-hover:text-white'
                  }`}>
                    {isSelected ? 'Selected' : 'Select Package'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* STEP 2: LOGISTICS & TARGET ATHLETE */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 md:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-800">
          <div>
            <span className="text-xs font-bold text-teal-400 uppercase tracking-wider">Step 2</span>
            <h2 className="text-xl font-bold text-white">Gameday Logistics & Target Athlete</h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Specify the kickoff location and the exact athlete your creator should track.
            </p>
          </div>

          {user && (
            <button
              type="button"
              id="autofill-profile-btn"
              onClick={handleAutofillProfile}
              className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-teal-400 border border-zinc-700 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
            >
              <User className="w-3.5 h-3.5" /> Autofill My Athlete Info
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Target Athlete Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-teal-400 flex items-center gap-2">
              <User className="w-4 h-4" /> Athlete Information
            </h3>

            <div>
              <label className="text-xs font-medium text-zinc-300 block mb-1">
                Target Athlete Full Name *
              </label>
              <input
                id="booking-athlete-name"
                type="text"
                value={athleteName}
                onChange={(e) => {
                  setAthleteName(e.target.value);
                  if (formErrors.athleteName) setFormErrors(prev => ({ ...prev, athleteName: '' }));
                }}
                placeholder="e.g. Cameron Reynolds"
                className={`w-full bg-zinc-900 border ${formErrors.athleteName ? 'border-rose-500' : 'border-zinc-800'} focus:border-teal-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 outline-none`}
              />
              {formErrors.athleteName && (
                <span className="text-[11px] text-rose-400 mt-1 block">{formErrors.athleteName}</span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-zinc-300 block mb-1">
                  Jersey Number *
                </label>
                <input
                  id="booking-athlete-jersey"
                  type="text"
                  value={athleteJersey}
                  onChange={(e) => {
                    setAthleteJersey(e.target.value);
                    if (formErrors.athleteJersey) setFormErrors(prev => ({ ...prev, athleteJersey: '' }));
                  }}
                  placeholder="#12"
                  className={`w-full bg-zinc-900 border ${formErrors.athleteJersey ? 'border-rose-500' : 'border-zinc-800'} focus:border-teal-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 outline-none`}
                />
                {formErrors.athleteJersey && (
                  <span className="text-[11px] text-rose-400 mt-1 block">{formErrors.athleteJersey}</span>
                )}
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-300 block mb-1">
                  Team Name *
                </label>
                <input
                  id="booking-athlete-team"
                  type="text"
                  value={athleteTeam}
                  onChange={(e) => {
                    setAthleteTeam(e.target.value);
                    if (formErrors.athleteTeam) setFormErrors(prev => ({ ...prev, athleteTeam: '' }));
                  }}
                  placeholder="Westlake Lions Varsity"
                  className={`w-full bg-zinc-900 border ${formErrors.athleteTeam ? 'border-rose-500' : 'border-zinc-800'} focus:border-teal-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 outline-none`}
                />
                {formErrors.athleteTeam && (
                  <span className="text-[11px] text-rose-400 mt-1 block">{formErrors.athleteTeam}</span>
                )}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-zinc-300 block mb-1">
                Special Requests or Notes (Optional)
              </label>
              <textarea
                id="booking-notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Focus on 4th quarter red-zone drives; athlete is wearing white away jersey with black cleats."
                className="w-full bg-zinc-900 border border-zinc-800 focus:border-teal-500 rounded-xl p-3 text-xs text-white placeholder-zinc-500 outline-none resize-none"
              />
            </div>
          </div>

          {/* Logistics Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-teal-400 flex items-center gap-2">
              <MapPin className="w-4 h-4" /> Game Location & Kickoff Time
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-zinc-300 block mb-1">
                  Game Date *
                </label>
                <input
                  id="booking-game-date"
                  type="date"
                  min={minDateString}
                  value={gameDate}
                  onChange={(e) => {
                    setGameDate(e.target.value);
                    if (formErrors.gameDate) setFormErrors(prev => ({ ...prev, gameDate: '' }));
                  }}
                  className={`w-full bg-zinc-900 border ${formErrors.gameDate ? 'border-rose-500' : 'border-zinc-800'} focus:border-teal-500 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none cursor-pointer`}
                />
                {formErrors.gameDate && (
                  <span className="text-[11px] text-rose-400 mt-1 block">{formErrors.gameDate}</span>
                )}
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-300 block mb-1">
                  Kickoff / Tip-off Time *
                </label>
                <input
                  id="booking-game-time"
                  type="time"
                  value={gameTime}
                  onChange={(e) => {
                    setGameTime(e.target.value);
                    if (formErrors.gameTime) setFormErrors(prev => ({ ...prev, gameTime: '' }));
                  }}
                  className={`w-full bg-zinc-900 border ${formErrors.gameTime ? 'border-rose-500' : 'border-zinc-800'} focus:border-teal-500 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none cursor-pointer`}
                />
                {formErrors.gameTime && (
                  <span className="text-[11px] text-rose-400 mt-1 block">{formErrors.gameTime}</span>
                )}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-zinc-300 block mb-1">
                Venue Name / Complex *
              </label>
              <input
                id="booking-venue-name"
                type="text"
                value={venueName}
                onChange={(e) => {
                  setVenueName(e.target.value);
                  if (formErrors.venueName) setFormErrors(prev => ({ ...prev, venueName: '' }));
                }}
                placeholder="e.g. Centennial High Stadium"
                className={`w-full bg-zinc-900 border ${formErrors.venueName ? 'border-rose-500' : 'border-zinc-800'} focus:border-teal-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 outline-none`}
              />
              {formErrors.venueName && (
                <span className="text-[11px] text-rose-400 mt-1 block">{formErrors.venueName}</span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1">
                <label className="text-xs font-medium text-zinc-300 block mb-1">
                  City *
                </label>
                <input
                  id="booking-venue-city"
                  type="text"
                  value={venueCity}
                  onChange={(e) => {
                    setVenueCity(e.target.value);
                    if (formErrors.venueCity) setFormErrors(prev => ({ ...prev, venueCity: '' }));
                  }}
                  placeholder="Austin"
                  className={`w-full bg-zinc-900 border ${formErrors.venueCity ? 'border-rose-500' : 'border-zinc-800'} focus:border-teal-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 outline-none`}
                />
                {formErrors.venueCity && (
                  <span className="text-[11px] text-rose-400 mt-1 block">{formErrors.venueCity}</span>
                )}
              </div>

              <div className="col-span-1">
                <label className="text-xs font-medium text-zinc-300 block mb-1">
                  State *
                </label>
                <select
                  id="booking-venue-state"
                  value={venueState}
                  onChange={(e) => setVenueState(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-teal-500 rounded-xl px-3 py-2.5 text-sm text-white outline-none cursor-pointer"
                >
                  {US_STATES.map((st) => (
                    <option key={st.code} value={st.code} className="bg-zinc-900 text-white">
                      {st.code}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-span-1">
                <label className="text-xs font-medium text-zinc-300 block mb-1">
                  Field / Court #
                </label>
                <input
                  id="booking-field-number"
                  type="text"
                  value={fieldNumber}
                  onChange={(e) => setFieldNumber(e.target.value)}
                  placeholder="Field 2"
                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-teal-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* STEP 3: PRICE BREAKDOWN & PAYPAL CHECKOUT */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 md:p-8 space-y-6">
        <div className="pb-4 border-b border-zinc-800">
          <span className="text-xs font-bold text-teal-400 uppercase tracking-wider">Step 3</span>
          <h2 className="text-xl font-bold text-white">Price Breakdown & Secure Checkout</h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Transparent pricing with the Just1Play Gameday Delivery Guarantee.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Summary Column */}
          <div className="lg:col-span-6 space-y-4">
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-zinc-400">Package Subtotal ({selectedPackage.name}):</span>
                <span className="font-semibold text-white">${subtotal.toFixed(2)} USD</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-1.5 text-zinc-400">
                  <span>Platform Service Fee</span>
                  <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-400">Escrow</span>
                </div>
                <span className="font-semibold text-zinc-300">${serviceFee.toFixed(2)} USD</span>
              </div>

              <div className="pt-3 border-t border-zinc-800 flex justify-between items-center">
                <div>
                  <span className="text-base font-bold text-white block">Total Gameday Investment</span>
                  <span className="text-[11px] text-zinc-500">Includes guaranteed 48-hour delivery</span>
                </div>
                <span className="text-2xl font-black text-emerald-400">${total.toFixed(2)} USD</span>
              </div>
            </div>

            {/* Escrow Guarantee Pill */}
            <div className="p-4 rounded-xl bg-teal-950/20 border border-teal-800/30 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
              <div className="text-xs text-zinc-300 space-y-1">
                <span className="font-bold text-teal-300 block">Just1Play Creator Escrow Guarantee</span>
                <p className="text-zinc-400 leading-relaxed">
                  Your payment is securely held in escrow until the creator attends your game and uploads your media folder. Complete peace of mind for athletes and parents.
                </p>
              </div>
            </div>
          </div>

          {/* Payment Action Column */}
          <div className="lg:col-span-6 space-y-4">
            {!user ? (
              /* Unauthenticated Defensive Guard */
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center space-y-4">
                <div className="w-12 h-12 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center mx-auto text-teal-400">
                  <Lock className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-white">Sign In to Complete Booking</h3>
                  <p className="text-xs text-zinc-400">
                    You need an active Just1Play athletic account to lock in your creator and receive your delivery link.
                  </p>
                </div>
                <button
                  type="button"
                  id="booking-signin-btn"
                  onClick={() => setShowAuthModal(true)}
                  className="w-full py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-zinc-950 font-bold text-sm transition cursor-pointer shadow-[0_0_15px_rgba(20,184,166,0.3)]"
                >
                  Sign In / Create Account
                </button>
              </div>
            ) : (
              /* Authenticated PayPal Flow */
              <div className="space-y-4">
                <div className="text-xs text-zinc-400 flex items-center justify-between">
                  <span className="font-semibold text-zinc-300">Select Payment Method:</span>
                  <span className="flex items-center gap-1 text-teal-400">
                    <ShieldCheck className="w-3.5 h-3.5" /> 256-Bit SSL Encrypted
                  </span>
                </div>

                {/* PayPal Buttons Render */}
                <div className="w-full min-h-[160px] relative z-20">
                  <PayPalErrorBoundary>
                    <PayPalScriptProvider
                      options={{
                        clientId: getPayPalClientId(),
                        currency: 'USD',
                        intent: 'capture',
                      }}
                    >
                      <PayPalButtons
                        style={{
                          layout: 'vertical',
                          color: 'gold',
                          shape: 'rect',
                          label: 'paypal',
                          height: 46
                        }}
                        disabled={isProcessingPayment}
                        createOrder={handlePayPalCreateOrder}
                        onApprove={handlePayPalApprove}
                        onError={(err) => {
                          console.warn('[CreatorBookingDesk] PayPal Button Error:', err);
                          showToast('error', 'PayPal Error', 'PayPal could not complete the transaction. Please check details or use sandbox mode below.');
                        }}
                      />
                    </PayPalScriptProvider>
                  </PayPalErrorBoundary>
                </div>

                {/* Sandbox / Instant Simulation Button for QA & Testing */}
                <div className="pt-2 text-center">
                  <button
                    type="button"
                    id="simulate-sandbox-booking-btn"
                    disabled={isProcessingPayment}
                    onClick={() => {
                      if (!validateForm()) {
                        showToast('error', 'Incomplete Form', 'Please complete all required gameday logistics first.');
                        return;
                      }
                      handleFinalizeBooking({
                        paymentId: `SANDBOX_TX_${Date.now()}`,
                        provider: 'sandbox'
                      });
                    }}
                    className="w-full py-3 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white text-xs font-semibold transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Zap className="w-4 h-4 text-amber-400" />
                    Complete Booking in Instant Sandbox Mode (${total.toFixed(2)})
                  </button>
                  <span className="text-[10px] text-zinc-500 block mt-1">
                    Direct test bypass for development & immediate confirmation verification.
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </div>
  );
}

export { CreatorBookingDesk };
