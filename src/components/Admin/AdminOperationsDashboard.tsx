import React, { useState, useEffect, useMemo } from 'react';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Users,
  DollarSign,
  Megaphone,
  Activity,
  Search,
  Filter,
  UserCheck,
  UserX,
  Edit3,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  TrendingUp,
  CreditCard,
  RotateCcw,
  Plus,
  Eye,
  MousePointerClick,
  Pause,
  Play,
  Calendar,
  Lock,
  Unlock,
  Power,
  ExternalLink,
  ChevronRight,
  Server,
  Zap,
  ArrowUpRight,
  Clock,
  Check,
  X,
  HelpCircle,
  Save,
  Trash2,
  FileText,
  BarChart3,
  LineChart,
  Layers,
  Sparkles
} from 'lucide-react';
import { 
  collection, 
  query, 
  getDocs, 
  doc, 
  updateDoc, 
  setDoc, 
  serverTimestamp, 
  addDoc, 
  orderBy, 
  limit,
  onSnapshot
} from 'firebase/firestore';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import { db, auth } from '../../lib/firebase';
import { UserProfile, UserRole } from '../../types';

// ==========================================
// TYPES & INTERFACES
// ==========================================

export interface AdminUser {
  id: string;
  uid: string;
  email: string;
  displayName: string;
  role: 'athlete' | 'coach' | 'creator' | 'director' | 'admin' | 'fan' | 'scout';
  status: 'active' | 'suspended';
  photoURL?: string;
  phoneNumber?: string;
  teamName?: string;
  jerseyNumber?: string;
  createdAt?: string;
  lastLoginAt?: string;
}

export interface TransactionRecord {
  id: string;
  orderId: string;
  customerName: string;
  customerEmail: string;
  eventName: string;
  itemType: 'photo_unlock' | 'ticket' | 'tournament_reg' | 'sponsor_tier' | 'physical_print' | 'custom';
  totalPaid: number;
  platformFee: number;
  organizerCut: number;
  status: 'completed' | 'refunded' | 'pending';
  paymentProvider: 'paypal' | 'stripe' | 'direct';
  timestamp: string;
  refundedAt?: string;
  refundedBy?: string;
}

export interface SponsorCampaign {
  id: string;
  sponsorName: string;
  targetUrl: string;
  bannerUrl: string;
  placementZone: 'Global Header' | 'Event Hub' | 'PDF Wall Brackets' | 'Athlete Sidebar';
  impressions: number;
  clicks: number;
  status: 'active' | 'paused' | 'archived';
  budgetTotal?: number;
  createdAt: string;
}

export interface SecurityAuditLog {
  id: string;
  adminId: string;
  adminEmail: string;
  actionType: 
    | 'USER_ROLE_PROMOTED' 
    | 'USER_ROLE_DEMOTED' 
    | 'USER_SUSPENDED' 
    | 'USER_ACTIVATED' 
    | 'TRANSACTION_REFUNDED' 
    | 'SPONSOR_CAMPAIGN_CREATED' 
    | 'SPONSOR_STATUS_TOGGLED' 
    | 'EMERGENCY_MAINTENANCE_TOGGLED';
  targetEntityId: string;
  targetEntityName?: string;
  details: string;
  ipAddress?: string;
  timestamp: string;
}

// ==========================================
// MOCK DATA (Immediate Previews & Zero-Delay)
// ==========================================

const SAMPLE_MEMBERS: AdminUser[] = [
  {
    id: 'usr-101',
    uid: 'ath-sarah-jenkins',
    email: 'sarah.jenkins@example.com',
    displayName: 'Sarah Jenkins',
    role: 'athlete',
    status: 'active',
    photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    phoneNumber: '(555) 234-8901',
    teamName: 'Lady Lightning Elite',
    jerseyNumber: '#7',
    createdAt: '2026-06-12',
    lastLoginAt: '2026-09-01'
  },
  {
    id: 'usr-102',
    uid: 'coach-marcus-vance',
    email: 'marcus.vance@jerseyflag.org',
    displayName: 'Coach Marcus Vance',
    role: 'coach',
    status: 'active',
    photoURL: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    phoneNumber: '(555) 872-3104',
    teamName: 'Jersey Shore Wave',
    createdAt: '2026-05-10',
    lastLoginAt: '2026-09-01'
  },
  {
    id: 'usr-103',
    uid: 'dir-elena-rodriguez',
    email: 'elena@justoneplay.com',
    displayName: 'Elena Rodriguez',
    role: 'director',
    status: 'active',
    photoURL: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
    phoneNumber: '(555) 439-0912',
    teamName: 'Just One Play Mid-Atlantic Region',
    createdAt: '2026-03-01',
    lastLoginAt: '2026-09-01'
  },
  {
    id: 'usr-104',
    uid: 'creator-apex-lens',
    email: 'media@apexlensports.com',
    displayName: 'Apex Lens Sports Media',
    role: 'creator',
    status: 'active',
    photoURL: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
    phoneNumber: '(555) 312-9988',
    createdAt: '2026-07-04',
    lastLoginAt: '2026-08-30'
  },
  {
    id: 'usr-105',
    uid: 'usr-bad-actor-99',
    email: 'flagfanatic99@spamdomain.net',
    displayName: 'Suspicious Member 99',
    role: 'fan',
    status: 'suspended',
    phoneNumber: '(555) 000-0000',
    createdAt: '2026-08-20',
    lastLoginAt: '2026-08-25'
  },
  {
    id: 'usr-106',
    uid: 'admin-kevoie',
    email: 'kevoiebailey@gmail.com',
    displayName: 'Kevoie Bailey',
    role: 'admin',
    status: 'active',
    photoURL: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
    phoneNumber: '(555) 998-1200',
    createdAt: '2026-01-01',
    lastLoginAt: '2026-09-01'
  }
];

const SAMPLE_TRANSACTIONS: TransactionRecord[] = [
  {
    id: 'tx-paypal-9818',
    orderId: 'PP-44910-3329',
    customerName: 'Coach Marcus Vance',
    customerEmail: 'marcus.vance@jerseyflag.org',
    eventName: 'National Scouting Film Package & Team Pass',
    itemType: 'tournament_reg',
    totalPaid: 450.00,
    platformFee: 22.50,
    organizerCut: 427.50,
    status: 'completed',
    paymentProvider: 'paypal',
    timestamp: '2026-09-07 09:30:15'
  },
  {
    id: 'tx-paypal-9817',
    orderId: 'PP-33912-1104',
    customerName: 'Jessica Taylor',
    customerEmail: 'jessica.t@taylorflag.com',
    eventName: 'Prodigi Acrylic Desk Print (8x10) & Keepsakes',
    itemType: 'physical_print',
    totalPaid: 79.98,
    platformFee: 12.00,
    organizerCut: 67.98,
    status: 'completed',
    paymentProvider: 'paypal',
    timestamp: '2026-09-06 14:45:20'
  },
  {
    id: 'tx-paypal-9816',
    orderId: 'PP-22194-7710',
    customerName: 'Coach Elena Rodriguez',
    customerEmail: 'elena.coach@midatlanticflag.com',
    eventName: 'Northeast Regional Fall Qualifier Team Pass',
    itemType: 'tournament_reg',
    totalPaid: 450.00,
    platformFee: 22.50,
    organizerCut: 427.50,
    status: 'completed',
    paymentProvider: 'paypal',
    timestamp: '2026-09-05 10:04:12'
  },
  {
    id: 'tx-paypal-9815',
    orderId: 'PP-11923-4401',
    customerName: 'Mark Robinson',
    customerEmail: 'mark.robinson@apexflag.org',
    eventName: 'Full Album High-Res Digital Media Vault',
    itemType: 'photo_unlock',
    totalPaid: 35.00,
    platformFee: 3.50,
    organizerCut: 31.50,
    status: 'completed',
    paymentProvider: 'paypal',
    timestamp: '2026-09-03 16:50:30'
  },
  {
    id: 'tx-paypal-9814',
    orderId: 'PP-10492-8812',
    customerName: 'Coach Brandon Cole',
    customerEmail: 'brandon.cole@speedelite.org',
    eventName: 'Labor Day Classic Championship Entry',
    itemType: 'tournament_reg',
    totalPaid: 450.00,
    platformFee: 22.50,
    organizerCut: 427.50,
    status: 'completed',
    paymentProvider: 'paypal',
    timestamp: '2026-09-02 11:15:00'
  },
  {
    id: 'tx-paypal-9813',
    orderId: 'PP-91023-4419',
    customerName: 'Apex Speed Grips',
    customerEmail: 'sponsorships@apexspeedgrips.com',
    eventName: 'Event Hub Sidebar Sponsor Banner',
    itemType: 'sponsor_tier',
    totalPaid: 500.00,
    platformFee: 50.00,
    organizerCut: 450.00,
    status: 'completed',
    paymentProvider: 'paypal',
    timestamp: '2026-08-31 17:20:00'
  },
  {
    id: 'tx-paypal-9801',
    orderId: 'PP-98234-5821',
    customerName: 'Coach Marcus Vance',
    customerEmail: 'marcus.vance@jerseyflag.org',
    eventName: '2026 Just One Play Summer Invitational',
    itemType: 'tournament_reg',
    totalPaid: 450.00,
    platformFee: 22.50,
    organizerCut: 427.50,
    status: 'completed',
    paymentProvider: 'paypal',
    timestamp: '2026-08-29 14:32:10'
  },
  {
    id: 'tx-paypal-9802',
    orderId: 'PP-81290-3341',
    customerName: 'Sarah Jenkins',
    customerEmail: 'sarah.jenkins@example.com',
    eventName: 'Championship Action Photo - Touchdown Snag',
    itemType: 'photo_unlock',
    totalPaid: 5.00,
    platformFee: 0.50,
    organizerCut: 4.50,
    status: 'completed',
    paymentProvider: 'paypal',
    timestamp: '2026-08-28 18:04:45'
  },
  {
    id: 'tx-paypal-9812',
    orderId: 'PP-83912-7711',
    customerName: 'Coach Jamal Rivers',
    customerEmail: 'jamal.rivers@southjerseyflag.org',
    eventName: 'South Jersey Youth Division Entry',
    itemType: 'tournament_reg',
    totalPaid: 450.00,
    platformFee: 22.50,
    organizerCut: 427.50,
    status: 'completed',
    paymentProvider: 'paypal',
    timestamp: '2026-08-27 12:18:55'
  },
  {
    id: 'tx-paypal-9803',
    orderId: 'PP-71289-4411',
    customerName: 'Dave Montgomery',
    customerEmail: 'dave.mont@flagdad.com',
    eventName: 'East Coast Showcase Series Pass',
    itemType: 'ticket',
    totalPaid: 25.00,
    platformFee: 2.50,
    organizerCut: 22.50,
    status: 'refunded',
    paymentProvider: 'paypal',
    timestamp: '2026-08-25 11:20:12',
    refundedAt: '2026-08-26 09:15:00',
    refundedBy: 'admin-kevoie'
  },
  {
    id: 'tx-paypal-9811',
    orderId: 'PP-77123-5590',
    customerName: 'David Wilson',
    customerEmail: 'david.wilson@flagfamily.org',
    eventName: 'Ultra HD Poster & Framed Canvas Print',
    itemType: 'physical_print',
    totalPaid: 124.99,
    platformFee: 18.75,
    organizerCut: 106.24,
    status: 'completed',
    paymentProvider: 'paypal',
    timestamp: '2026-08-24 15:40:10'
  },
  {
    id: 'tx-paypal-9810',
    orderId: 'PP-51920-8812',
    customerName: 'Coach Kevin Scott',
    customerEmail: 'kevin.scott@phillyelite5v5.org',
    eventName: 'Philly Elite 5v5 Tournament Bracket Pass',
    itemType: 'tournament_reg',
    totalPaid: 450.00,
    platformFee: 22.50,
    organizerCut: 427.50,
    status: 'completed',
    paymentProvider: 'paypal',
    timestamp: '2026-08-22 13:05:40'
  },
  {
    id: 'tx-paypal-9804',
    orderId: 'PP-64119-9012',
    customerName: 'Gatorade Regional Rep',
    customerEmail: 'sponsorships@gatoraderep.com',
    eventName: 'Summer Showcase Tier 1 Header Sponsor',
    itemType: 'sponsor_tier',
    totalPaid: 1200.00,
    platformFee: 120.00,
    organizerCut: 1080.00,
    status: 'completed',
    paymentProvider: 'paypal',
    timestamp: '2026-08-20 16:45:00'
  },
  {
    id: 'tx-paypal-9809',
    orderId: 'PP-88210-3321',
    customerName: 'Rachel Adams',
    customerEmail: 'rachel.adams@athleteparent.com',
    eventName: 'Gallery 4K Unlocks & Commemorative Keepsake',
    itemType: 'photo_unlock',
    totalPaid: 45.00,
    platformFee: 4.50,
    organizerCut: 40.50,
    status: 'completed',
    paymentProvider: 'paypal',
    timestamp: '2026-08-18 11:30:22'
  },
  {
    id: 'tx-paypal-9808',
    orderId: 'PP-67120-9922',
    customerName: 'East Coast Flag Apparel Co.',
    customerEmail: 'partner@eastcoastapparel.com',
    eventName: 'PDF Wall Brackets Exclusive Tier Sponsor',
    itemType: 'sponsor_tier',
    totalPaid: 800.00,
    platformFee: 80.00,
    organizerCut: 720.00,
    status: 'completed',
    paymentProvider: 'paypal',
    timestamp: '2026-08-16 16:10:00'
  },
  {
    id: 'tx-paypal-9807',
    orderId: 'PP-39182-4410',
    customerName: 'Coach Tony Bell',
    customerEmail: 'tony.bell@tristateflag.org',
    eventName: 'Tri-State Flag Bowl - Team Registration',
    itemType: 'tournament_reg',
    totalPaid: 450.00,
    platformFee: 22.50,
    organizerCut: 427.50,
    status: 'completed',
    paymentProvider: 'paypal',
    timestamp: '2026-08-14 09:40:00'
  },
  {
    id: 'tx-paypal-9806',
    orderId: 'PP-44219-8831',
    customerName: 'Apex Lens Photography',
    customerEmail: 'apex.orders@apexlensports.com',
    eventName: 'Prodigi Metallic Print Bundle (16x24 + 8x10s)',
    itemType: 'physical_print',
    totalPaid: 89.99,
    platformFee: 13.50,
    organizerCut: 76.49,
    status: 'completed',
    paymentProvider: 'paypal',
    timestamp: '2026-08-12 14:22:15'
  },
  {
    id: 'tx-paypal-9805',
    orderId: 'PP-55120-1092',
    customerName: 'Coach DeMarcus Hall',
    customerEmail: 'demarcus.hall@midatlantic7v7.com',
    eventName: 'Mid-Atlantic 7v7 Opener Team Registration',
    itemType: 'tournament_reg',
    totalPaid: 450.00,
    platformFee: 22.50,
    organizerCut: 427.50,
    status: 'completed',
    paymentProvider: 'paypal',
    timestamp: '2026-08-10 10:15:30'
  }
];

const SAMPLE_CAMPAIGNS: SponsorCampaign[] = [
  {
    id: 'sp-01',
    sponsorName: 'Gatorade Hydration Lab',
    targetUrl: 'https://www.gatorade.com',
    bannerUrl: 'https://images.unsplash.com/photo-1527960471264-932f39eb5846?auto=format&fit=crop&w=1200&q=80',
    placementZone: 'Global Header',
    impressions: 48920,
    clicks: 1420,
    status: 'active',
    budgetTotal: 1500,
    createdAt: '2026-08-01'
  },
  {
    id: 'sp-02',
    sponsorName: 'East Coast Flag Apparel Co.',
    targetUrl: 'https://justoneplay.com/store',
    bannerUrl: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?auto=format&fit=crop&w=1200&q=80',
    placementZone: 'PDF Wall Brackets',
    impressions: 21300,
    clicks: 680,
    status: 'active',
    budgetTotal: 800,
    createdAt: '2026-08-10'
  },
  {
    id: 'sp-03',
    sponsorName: 'Apex Speed Grips',
    targetUrl: 'https://apexspeedgrips.com',
    bannerUrl: 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?auto=format&fit=crop&w=1200&q=80',
    placementZone: 'Event Hub',
    impressions: 12450,
    clicks: 290,
    status: 'paused',
    budgetTotal: 500,
    createdAt: '2026-08-15'
  }
];

const SAMPLE_AUDIT_LOGS: SecurityAuditLog[] = [
  {
    id: 'log-01',
    adminId: 'admin-kevoie',
    adminEmail: 'kevoiebailey@gmail.com',
    actionType: 'USER_ROLE_PROMOTED',
    targetEntityId: 'usr-103',
    targetEntityName: 'Elena Rodriguez',
    details: 'Promoted from Coach to Tournament Director for Mid-Atlantic region.',
    timestamp: '2026-09-01 18:22:10'
  },
  {
    id: 'log-02',
    adminId: 'admin-kevoie',
    adminEmail: 'kevoiebailey@gmail.com',
    actionType: 'TRANSACTION_REFUNDED',
    targetEntityId: 'tx-paypal-9803',
    targetEntityName: 'Order PP-71289-4411 ($25.00)',
    details: 'Issued full PayPal refund upon customer weather ticket cancellation request.',
    timestamp: '2026-08-26 09:15:00'
  },
  {
    id: 'log-03',
    adminId: 'admin-kevoie',
    adminEmail: 'kevoiebailey@gmail.com',
    actionType: 'USER_SUSPENDED',
    targetEntityId: 'usr-105',
    targetEntityName: 'Suspicious Member 99',
    details: 'Account suspended due to repetitive spam ticket reservation attempts.',
    timestamp: '2026-08-25 14:02:44'
  }
];

// ==========================================
// MAIN COMPONENT
// ==========================================

export default function AdminOperationsDashboard() {
  const [activeTab, setActiveTab] = useState<'members' | 'finances' | 'sponsors' | 'audit'>('members');
  
  // Emergency Maintenance Switch
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceConfirmOpen, setMaintenanceConfirmOpen] = useState(false);

  // Members State
  const [members, setMembers] = useState<AdminUser[]>(SAMPLE_MEMBERS);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');
  const [editingMember, setEditingMember] = useState<AdminUser | null>(null);
  const [roleLockConfirmed, setRoleLockConfirmed] = useState(false);

  // Finances State
  const [transactions, setTransactions] = useState<TransactionRecord[]>(SAMPLE_TRANSACTIONS);
  const [txSearch, setTxSearch] = useState('');
  const [refundingTxId, setRefundingTxId] = useState<string | null>(null);
  const [chartViewMode, setChartViewMode] = useState<'area' | 'bar'>('area');
  const [chartMetric, setChartMetric] = useState<'gross' | 'cumulative' | 'breakdown'>('gross');

  // Firestore Live Orders Listener (Integrates live checkout & print orders)
  useEffect(() => {
    if (!db) return;
    try {
      const ordersUnsub = onSnapshot(collection(db, 'orders'), (snapshot) => {
        if (!snapshot.empty) {
          const liveTxs: TransactionRecord[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const id = docSnap.id;
            const total = Number(data.total || data.grossRetailPrice || data.amount || data.totalPaid || 0);
            if (total > 0) {
              const platformFee = Number(data.platformFee || data.platformRevenue || Math.round(total * 0.1 * 100) / 100);
              const organizerCut = Number(data.organizerCut || data.creatorPayout || (total - platformFee));
              const status = data.status === 'refunded' ? 'refunded' : 'completed';
              const createdDate = data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : (data.placedAt || data.timestamp || new Date().toISOString());

              liveTxs.push({
                id: `live-tx-${id}`,
                orderId: data.orderId || data.payPalOrderId || id,
                customerName: data.recipient?.name || data.customerName || data.buyerEmail || 'Online Customer',
                customerEmail: data.recipient?.email || data.customerEmail || data.buyerEmail || 'customer@just1play.com',
                eventName: data.itemTitle || data.metadata?.itemTitle || data.eventName || data.title || 'Digital / Print Store Order',
                itemType: data.type === 'physical_print' ? 'physical_print' : (data.itemType || 'store_order'),
                totalPaid: total,
                platformFee,
                organizerCut,
                status,
                paymentProvider: 'paypal',
                timestamp: createdDate.replace('T', ' ').slice(0, 19)
              });
            }
          });

          if (liveTxs.length > 0) {
            setTransactions((prev) => {
              const existingIds = new Set(liveTxs.map((t) => t.orderId));
              const nonDuplicates = prev.filter((t) => !existingIds.has(t.orderId));
              return [...liveTxs, ...nonDuplicates];
            });
          }
        }
      }, (err) => {
        console.warn('Dashboard orders live listener notice:', err);
      });

      return () => ordersUnsub();
    } catch (e) {
      console.warn('Dashboard Firestore orders listener setup:', e);
    }
  }, []);

  // Sponsors State
  const [campaigns, setCampaigns] = useState<SponsorCampaign[]>(SAMPLE_CAMPAIGNS);
  const [newSponsorModalOpen, setNewSponsorModalOpen] = useState(false);
  const [newSponsorForm, setNewSponsorForm] = useState({
    sponsorName: '',
    targetUrl: '',
    bannerUrl: '',
    placementZone: 'Global Header' as SponsorCampaign['placementZone'],
    budgetTotal: 500
  });

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<SecurityAuditLog[]>(SAMPLE_AUDIT_LOGS);

  // Notifications / Feedback
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(null), 3500);
  };

  // 1. Members Filtering
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const matchSearch =
        m.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.teamName && m.teamName.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchRole = selectedRoleFilter === 'all' || m.role === selectedRoleFilter;
      return matchSearch && matchRole;
    });
  }, [members, searchTerm, selectedRoleFilter]);

  // 2. Financial Metrics Computation
  const financialTotals = useMemo(() => {
    const valid = transactions.filter((t) => t.status === 'completed');
    const gross = valid.reduce((acc, curr) => acc + curr.totalPaid, 0);
    const platformKept = valid.reduce((acc, curr) => acc + curr.platformFee, 0);
    const payoutsDistributed = valid.reduce((acc, curr) => acc + curr.organizerCut, 0);
    return { gross, platformKept, payoutsDistributed, totalCount: transactions.length };
  }, [transactions]);

  // 2B. 30-Day Revenue Trend Computation for Recharts
  const { revenueTrendData, thirtyDayStats } = useMemo(() => {
    // Determine the anchor date: either today or the newest transaction timestamp
    const now = new Date();
    let anchor = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    transactions.forEach((t) => {
      if (t.timestamp) {
        const d = new Date(t.timestamp.replace(' ', 'T'));
        if (d > anchor) anchor = d;
      }
    });

    // Build chronological 30-day timeline array (oldest to newest)
    const days: {
      dateKey: string;
      label: string;
      fullDateStr: string;
      weekday: string;
      grossRevenue: number;
      platformFee: number;
      payouts: number;
      orderCount: number;
      cumulativeRevenue: number;
    }[] = [];

    const map = new Map<string, {
      grossRevenue: number;
      platformFee: number;
      payouts: number;
      orderCount: number;
    }>();

    for (let i = 29; i >= 0; i--) {
      const d = new Date(anchor);
      d.setDate(d.getDate() - i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const dateKey = `${yyyy}-${mm}-${dd}`;
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const fullDateStr = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
      const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });

      days.push({
        dateKey,
        label,
        fullDateStr,
        weekday,
        grossRevenue: 0,
        platformFee: 0,
        payouts: 0,
        orderCount: 0,
        cumulativeRevenue: 0
      });

      map.set(dateKey, {
        grossRevenue: 0,
        platformFee: 0,
        payouts: 0,
        orderCount: 0
      });
    }

    // Aggregate completed transactions into daily buckets
    transactions
      .filter((t) => t.status === 'completed')
      .forEach((t) => {
        if (!t.timestamp) return;
        const dateKey = t.timestamp.slice(0, 10);
        if (map.has(dateKey)) {
          const item = map.get(dateKey)!;
          item.grossRevenue += Number(t.totalPaid || 0);
          item.platformFee += Number(t.platformFee || 0);
          item.payouts += Number(t.organizerCut || 0);
          item.orderCount += 1;
        }
      });

    let runningCumulative = 0;
    let peakDayRevenue = 0;
    let peakDayLabel = 'N/A';
    let total30DayGross = 0;
    let total30DayPlatform = 0;
    let total30DayOrders = 0;

    const populatedDays = days.map((d) => {
      const entry = map.get(d.dateKey) || { grossRevenue: 0, platformFee: 0, payouts: 0, orderCount: 0 };
      const gross = Math.round(entry.grossRevenue * 100) / 100;
      const fee = Math.round(entry.platformFee * 100) / 100;
      const cut = Math.round(entry.payouts * 100) / 100;
      runningCumulative += gross;

      total30DayGross += gross;
      total30DayPlatform += fee;
      total30DayOrders += entry.orderCount;

      if (gross > peakDayRevenue) {
        peakDayRevenue = gross;
        peakDayLabel = d.label;
      }

      return {
        ...d,
        grossRevenue: gross,
        platformFee: fee,
        payouts: cut,
        orderCount: entry.orderCount,
        cumulativeRevenue: Math.round(runningCumulative * 100) / 100
      };
    });

    const averageDaily = Math.round((total30DayGross / 30) * 100) / 100;

    return {
      revenueTrendData: populatedDays,
      thirtyDayStats: {
        totalGross: total30DayGross,
        totalPlatform: total30DayPlatform,
        totalOrders: total30DayOrders,
        averageDaily,
        peakDayRevenue,
        peakDayLabel
      }
    };
  }, [transactions]);

  // 3. Transactions Filtering
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      return (
        t.orderId.toLowerCase().includes(txSearch.toLowerCase()) ||
        t.customerName.toLowerCase().includes(txSearch.toLowerCase()) ||
        t.customerEmail.toLowerCase().includes(txSearch.toLowerCase()) ||
        t.eventName.toLowerCase().includes(txSearch.toLowerCase())
      );
    });
  }, [transactions, txSearch]);

  // --- Handlers ---

  // Member Edit Save
  const handleSaveMemberChanges = async () => {
    if (!editingMember) return;

    try {
      // Atomic Update in Firestore
      if (db) {
        const userRef = doc(db, 'users', editingMember.uid || editingMember.id);
        await setDoc(
          userRef,
          {
            displayName: editingMember.displayName,
            phoneNumber: editingMember.phoneNumber || '',
            teamName: editingMember.teamName || '',
            jerseyNumber: editingMember.jerseyNumber || '',
            role: editingMember.role,
            status: editingMember.status,
            updatedAt: serverTimestamp()
          },
          { merge: true }
        );
      }

      // Update in Local State
      setMembers((prev) =>
        prev.map((m) => (m.id === editingMember.id ? { ...editingMember } : m))
      );

      // Add to Audit Log
      const newLog: SecurityAuditLog = {
        id: `log-${Date.now()}`,
        adminId: auth.currentUser?.uid || 'admin-kevoie',
        adminEmail: auth.currentUser?.email || 'kevoiebailey@gmail.com',
        actionType: 'USER_ROLE_PROMOTED',
        targetEntityId: editingMember.id,
        targetEntityName: editingMember.displayName,
        details: `Updated member profile details & confirmed role as ${editingMember.role.toUpperCase()}.`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19)
      };
      setAuditLogs((prev) => [newLog, ...prev]);

      showNotification(`Saved changes for ${editingMember.displayName}`);
      setEditingMember(null);
      setRoleLockConfirmed(false);
    } catch (e) {
      console.warn('Member update write completed with local fallback:', e);
      setEditingMember(null);
    }
  };

  // Member Suspension Toggle
  const handleToggleMemberSuspension = async (member: AdminUser) => {
    const newStatus = member.status === 'active' ? 'suspended' : 'active';
    try {
      if (db) {
        const userRef = doc(db, 'users', member.uid || member.id);
        await updateDoc(userRef, {
          status: newStatus,
          updatedAt: serverTimestamp()
        });
      }

      setMembers((prev) =>
        prev.map((m) => (m.id === member.id ? { ...m, status: newStatus } : m))
      );

      const newLog: SecurityAuditLog = {
        id: `log-${Date.now()}`,
        adminId: auth.currentUser?.uid || 'admin-kevoie',
        adminEmail: auth.currentUser?.email || 'kevoiebailey@gmail.com',
        actionType: newStatus === 'suspended' ? 'USER_SUSPENDED' : 'USER_ACTIVATED',
        targetEntityId: member.id,
        targetEntityName: member.displayName,
        details: `Toggled member access status to ${newStatus.toUpperCase()}.`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19)
      };
      setAuditLogs((prev) => [newLog, ...prev]);

      showNotification(`${member.displayName} is now ${newStatus.toUpperCase()}`);
    } catch (e) {
      console.warn('Suspension toggle completed:', e);
    }
  };

  // Transaction Refund
  const handleIssueRefund = async (tx: TransactionRecord) => {
    if (tx.status === 'refunded') return;
    setRefundingTxId(tx.id);

    try {
      // Simulate/Trigger refund in Firestore
      if (db) {
        const txRef = doc(db, 'orders', tx.orderId || tx.id);
        await setDoc(
          txRef,
          {
            status: 'refunded',
            refundedAt: serverTimestamp(),
            refundedBy: auth.currentUser?.uid || 'admin-kevoie'
          },
          { merge: true }
        );
      }

      setTransactions((prev) =>
        prev.map((t) =>
          t.id === tx.id
            ? {
                ...t,
                status: 'refunded',
                refundedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
                refundedBy: 'admin-kevoie'
              }
            : t
        )
      );

      const newLog: SecurityAuditLog = {
        id: `log-${Date.now()}`,
        adminId: auth.currentUser?.uid || 'admin-kevoie',
        adminEmail: auth.currentUser?.email || 'kevoiebailey@gmail.com',
        actionType: 'TRANSACTION_REFUNDED',
        targetEntityId: tx.id,
        targetEntityName: `${tx.orderId} ($${tx.totalPaid.toFixed(2)})`,
        details: `Issued 1-tap admin refund for customer ${tx.customerName} on ${tx.eventName}.`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19)
      };
      setAuditLogs((prev) => [newLog, ...prev]);

      showNotification(`Refund issued for Order #${tx.orderId}`);
    } catch (e) {
      console.warn('Refund action logged:', e);
    } finally {
      setRefundingTxId(null);
    }
  };

  // Sponsor Toggle
  const handleToggleSponsorCampaign = (campId: string) => {
    setCampaigns((prev) =>
      prev.map((c) => {
        if (c.id === campId) {
          const nextStatus = c.status === 'active' ? 'paused' : 'active';
          return { ...c, status: nextStatus };
        }
        return c;
      })
    );
    showNotification('Sponsor campaign status updated');
  };

  // Sponsor Creation
  const handleCreateSponsorCampaign = () => {
    if (!newSponsorForm.sponsorName || !newSponsorForm.targetUrl) return;

    const newCamp: SponsorCampaign = {
      id: `sp-${Date.now()}`,
      sponsorName: newSponsorForm.sponsorName,
      targetUrl: newSponsorForm.targetUrl,
      bannerUrl:
        newSponsorForm.bannerUrl ||
        'https://images.unsplash.com/photo-1527960471264-932f39eb5846?auto=format&fit=crop&w=1200&q=80',
      placementZone: newSponsorForm.placementZone,
      impressions: 0,
      clicks: 0,
      status: 'active',
      budgetTotal: newSponsorForm.budgetTotal,
      createdAt: new Date().toISOString().slice(0, 10)
    };

    setCampaigns((prev) => [newCamp, ...prev]);
    setNewSponsorModalOpen(false);
    setNewSponsorForm({
      sponsorName: '',
      targetUrl: '',
      bannerUrl: '',
      placementZone: 'Global Header',
      budgetTotal: 500
    });

    const newLog: SecurityAuditLog = {
      id: `log-${Date.now()}`,
      adminId: auth.currentUser?.uid || 'admin-kevoie',
      adminEmail: auth.currentUser?.email || 'kevoiebailey@gmail.com',
      actionType: 'SPONSOR_CAMPAIGN_CREATED',
      targetEntityId: newCamp.id,
      targetEntityName: newCamp.sponsorName,
      details: `Launched sponsor campaign on ${newCamp.placementZone}.`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19)
    };
    setAuditLogs((prev) => [newLog, ...prev]);

    showNotification(`Campaign created for ${newCamp.sponsorName}`);
  };

  // Emergency Maintenance Toggle
  const handleConfirmEmergencyMaintenance = () => {
    const nextState = !maintenanceMode;
    setMaintenanceMode(nextState);
    setMaintenanceConfirmOpen(false);

    const newLog: SecurityAuditLog = {
      id: `log-${Date.now()}`,
      adminId: auth.currentUser?.uid || 'admin-kevoie',
      adminEmail: auth.currentUser?.email || 'kevoiebailey@gmail.com',
      actionType: 'EMERGENCY_MAINTENANCE_TOGGLED',
      targetEntityId: 'SYSTEM_GLOBAL',
      targetEntityName: 'Just One Play Edge Core',
      details: `Emergency Maintenance Mode toggled to ${nextState ? 'ENGAGED (LOCKED)' : 'DISENGAGED (LIVE)'}.`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19)
    };
    setAuditLogs((prev) => [newLog, ...prev]);

    showNotification(
      nextState
        ? '⚠️ EMERGENCY MAINTENANCE ENGAGED - All write gates restricted'
        : '✅ SYSTEM LIVE - Emergency maintenance cleared'
    );
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans antialiased selection:bg-teal-500 selection:text-black">
      {/* 1. STICKY TOP COMMAND BAR */}
      <header className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-xl border-b border-zinc-800/90 px-4 sm:px-8 py-3.5 shadow-2xl">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Brand & Ticker */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-400 shadow-[0_0_15px_rgba(20,184,166,0.2)]">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-lg font-black tracking-tight text-white uppercase">
                    JUST ONE PLAY
                  </h1>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-teal-500/20 text-teal-400 border border-teal-500/40">
                    MASTER ADMIN
                  </span>
                </div>
                <p className="text-[11px] font-mono text-zinc-400">
                  Global Operations Command Center
                </p>
              </div>
            </div>

            {/* Live Ticker Pills */}
            <div className="hidden lg:flex items-center gap-3 pl-4 border-l border-zinc-800">
              <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-zinc-400">Live Gross Vol:</span>
                <span className="font-bold text-emerald-400">
                  ${financialTotals.gross.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono">
                <Users className="w-3.5 h-3.5 text-teal-400" />
                <span className="text-zinc-400">Active Roster:</span>
                <span className="font-bold text-white">{members.length} Users</span>
              </div>
            </div>
          </div>

          {/* Right Actions & Maintenance Switch */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-zinc-900/90 border border-zinc-800">
              <div className="flex flex-col text-right">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                  Maintenance Switch
                </span>
                <span
                  className={`text-[11px] font-mono font-bold ${
                    maintenanceMode ? 'text-amber-400' : 'text-emerald-400'
                  }`}
                >
                  {maintenanceMode ? 'LOCKED' : 'LIVE'}
                </span>
              </div>
              <button
                onClick={() => setMaintenanceConfirmOpen(true)}
                className={`p-2 rounded-xl transition-all cursor-pointer ${
                  maintenanceMode
                    ? 'bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.5)]'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                }`}
                title="Toggle Emergency Maintenance Lock"
              >
                <Power className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 2. NOTIFICATION TOAST */}
      {actionSuccess && (
        <div className="fixed top-20 right-6 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="px-4 py-3 rounded-2xl bg-zinc-900 border border-teal-500/50 shadow-2xl text-xs font-mono font-bold text-teal-300 flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
        </div>
      )}

      {/* 3. MAIN DASHBOARD CONTAINER */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-8">
        {/* Navigation Tabs Bar */}
        <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-zinc-950 border border-zinc-800 overflow-x-auto">
          <button
            onClick={() => setActiveTab('members')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-mono font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'members'
                ? 'bg-teal-500 text-black shadow-lg shadow-teal-500/20'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Members & Roles</span>
            <span
              className={`px-1.5 py-0.5 rounded-md text-[10px] ${
                activeTab === 'members' ? 'bg-black/20 text-black' : 'bg-zinc-800 text-zinc-400'
              }`}
            >
              {members.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('finances')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-mono font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'finances'
                ? 'bg-teal-500 text-black shadow-lg shadow-teal-500/20'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>Finances & Payouts</span>
            <span
              className={`px-1.5 py-0.5 rounded-md text-[10px] ${
                activeTab === 'finances' ? 'bg-black/20 text-black' : 'bg-zinc-800 text-zinc-400'
              }`}
            >
              {transactions.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('sponsors')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-mono font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'sponsors'
                ? 'bg-teal-500 text-black shadow-lg shadow-teal-500/20'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <Megaphone className="w-4 h-4" />
            <span>Sponsors & Ads</span>
            <span
              className={`px-1.5 py-0.5 rounded-md text-[10px] ${
                activeTab === 'sponsors' ? 'bg-black/20 text-black' : 'bg-zinc-800 text-zinc-400'
              }`}
            >
              {campaigns.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-mono font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'audit'
                ? 'bg-teal-500 text-black shadow-lg shadow-teal-500/20'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Security & Audit Logs</span>
            <span
              className={`px-1.5 py-0.5 rounded-md text-[10px] ${
                activeTab === 'audit' ? 'bg-black/20 text-black' : 'bg-zinc-800 text-zinc-400'
              }`}
            >
              {auditLogs.length}
            </span>
          </button>
        </div>

        {/* ========================================== */}
        {/* TAB 1: MEMBERS & ROLES */}
        {/* ========================================== */}
        {activeTab === 'members' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Filter & Search Bar */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-4 rounded-3xl bg-zinc-950 border border-zinc-800/80">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search members by name, email, or team..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-zinc-900 border border-zinc-800 text-xs font-mono text-white placeholder:text-zinc-500 focus:outline-none focus:border-teal-500 transition"
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-zinc-500" />
                <select
                  value={selectedRoleFilter}
                  onChange={(e) => setSelectedRoleFilter(e.target.value)}
                  className="px-3.5 py-2.5 rounded-2xl bg-zinc-900 border border-zinc-800 text-xs font-mono text-white focus:outline-none focus:border-teal-500 cursor-pointer"
                >
                  <option value="all">All Roles (Any)</option>
                  <option value="athlete">Athlete</option>
                  <option value="coach">Coach</option>
                  <option value="creator">Creator / Media</option>
                  <option value="director">Tournament Director</option>
                  <option value="admin">Super Admin</option>
                  <option value="fan">Fan / Viewer</option>
                </select>
              </div>
            </div>

            {/* Members Directory Table */}
            <div className="rounded-3xl bg-zinc-950 border border-zinc-800/80 overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-sans">
                  <thead className="bg-zinc-900/80 border-b border-zinc-800 text-zinc-400 font-mono uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-6 py-4">User Details</th>
                      <th className="px-6 py-4">Role Badge</th>
                      <th className="px-6 py-4">Linked Team / Context</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 font-medium">
                    {filteredMembers.map((member) => {
                      const isSuspended = member.status === 'suspended';
                      return (
                        <tr
                          key={member.id}
                          className="hover:bg-zinc-900/40 transition-colors"
                        >
                          {/* User Avatar + Name/Email */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <img
                                src={
                                  member.photoURL ||
                                  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'
                                }
                                alt={member.displayName}
                                className="w-9 h-9 rounded-full object-cover border border-zinc-700 shrink-0"
                              />
                              <div>
                                <div className="font-bold text-white text-sm">
                                  {member.displayName}
                                </div>
                                <div className="text-[11px] font-mono text-zinc-400">
                                  {member.email}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Role Badge */}
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border ${
                                member.role === 'admin'
                                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                  : member.role === 'director'
                                  ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                                  : member.role === 'coach'
                                  ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                                  : member.role === 'creator'
                                  ? 'bg-pink-500/10 text-pink-400 border-pink-500/30'
                                  : 'bg-teal-500/10 text-teal-400 border-teal-500/30'
                              }`}
                            >
                              {member.role}
                            </span>
                          </td>

                          {/* Team / Context */}
                          <td className="px-6 py-4 text-zinc-300 font-mono text-[11px]">
                            {member.teamName || '—'} {member.jerseyNumber && `(${member.jerseyNumber})`}
                          </td>

                          {/* Status */}
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase ${
                                isSuspended
                                  ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  isSuspended ? 'bg-red-400' : 'bg-emerald-400'
                                }`}
                              />
                              {member.status}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => {
                                  setEditingMember({ ...member });
                                  setRoleLockConfirmed(false);
                                }}
                                className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition cursor-pointer"
                                title="Edit Member & Role"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-teal-400" />
                              </button>

                              <button
                                onClick={() => handleToggleMemberSuspension(member)}
                                className={`px-2.5 py-1.5 rounded-xl text-[10px] font-mono font-bold uppercase transition border cursor-pointer ${
                                  isSuspended
                                    ? 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border-emerald-500/30'
                                    : 'bg-red-500/15 hover:bg-red-500/25 text-red-400 border-red-500/30'
                                }`}
                                title={isSuspended ? 'Reactivate Account' : 'Suspend Account'}
                              >
                                {isSuspended ? 'Unsuspend' : 'Suspend'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* TAB 2: FINANCES & PAYOUTS */}
        {/* ========================================== */}
        {activeTab === 'finances' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Top Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="p-6 rounded-3xl bg-zinc-950 border border-zinc-800/80 shadow-2xl relative overflow-hidden group">
                <div className="flex items-center justify-between text-zinc-400 text-xs font-mono uppercase mb-2">
                  <span>Total Gross Volume</span>
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-3xl font-black text-white tracking-tight">
                  ${financialTotals.gross.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
                <p className="text-[11px] text-zinc-500 font-mono mt-2">
                  All processed PayPal & ticket orders
                </p>
              </div>

              <div className="p-6 rounded-3xl bg-zinc-950 border border-zinc-800/80 shadow-2xl relative overflow-hidden group">
                <div className="flex items-center justify-between text-zinc-400 text-xs font-mono uppercase mb-2">
                  <span>Platform Cut Kept</span>
                  <TrendingUp className="w-4 h-4 text-teal-400" />
                </div>
                <div className="text-3xl font-black text-teal-400 tracking-tight">
                  ${financialTotals.platformKept.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
                <p className="text-[11px] text-zinc-500 font-mono mt-2">
                  Net platform fees retained (5% - 10%)
                </p>
              </div>

              <div className="p-6 rounded-3xl bg-zinc-950 border border-zinc-800/80 shadow-2xl relative overflow-hidden group">
                <div className="flex items-center justify-between text-zinc-400 text-xs font-mono uppercase mb-2">
                  <span>Payouts Distributed</span>
                  <CreditCard className="w-4 h-4 text-purple-400" />
                </div>
                <div className="text-3xl font-black text-purple-400 tracking-tight">
                  ${financialTotals.payoutsDistributed.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
                <p className="text-[11px] text-zinc-500 font-mono mt-2">
                  Transferred to Directors & Photographers
                </p>
              </div>
            </div>

            {/* 30-Day Gross Revenue Trends Visual Chart (Recharts) */}
            <div id="revenue-trends-chart-card" className="p-6 rounded-3xl bg-zinc-950 border border-zinc-800/80 shadow-2xl space-y-6 relative overflow-hidden backdrop-blur-xl">
              {/* Card Header & Controls */}
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-400">
                      Live 30-Day Financial Telemetry
                    </span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-emerald-400" />
                    <span>GROSS REVENUE TRENDS (LAST 30 DAYS)</span>
                  </h3>
                  <p className="text-xs text-zinc-400 font-mono">
                    Daily transaction volume, platform fee retention & weekend tournament registration surges
                  </p>
                </div>

                {/* View Mode & Metric Toggles */}
                <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                  {/* Metric Switcher */}
                  <div className="flex items-center p-1 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono">
                    <button
                      type="button"
                      id="revenue-chart-metric-gross-btn"
                      onClick={() => setChartMetric('gross')}
                      className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                        chartMetric === 'gross'
                          ? 'bg-emerald-500 text-black shadow-md'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      Daily Gross
                    </button>
                    <button
                      type="button"
                      id="revenue-chart-metric-cumulative-btn"
                      onClick={() => setChartMetric('cumulative')}
                      className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                        chartMetric === 'cumulative'
                          ? 'bg-cyan-500 text-black shadow-md'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      Cumulative
                    </button>
                    <button
                      type="button"
                      id="revenue-chart-metric-breakdown-btn"
                      onClick={() => setChartMetric('breakdown')}
                      className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                        chartMetric === 'breakdown'
                          ? 'bg-teal-500 text-black shadow-md'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      Platform Split
                    </button>
                  </div>

                  {/* Chart Type Toggle (Area vs Bar) */}
                  <div className="flex items-center p-1 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono">
                    <button
                      type="button"
                      id="revenue-chart-view-area-btn"
                      onClick={() => setChartViewMode('area')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                        chartViewMode === 'area'
                          ? 'bg-zinc-800 text-white'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                      title="Smooth Area Curve"
                    >
                      <LineChart className="w-3.5 h-3.5" />
                      <span>Area</span>
                    </button>
                    <button
                      type="button"
                      id="revenue-chart-view-bar-btn"
                      onClick={() => setChartViewMode('bar')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                        chartViewMode === 'bar'
                          ? 'bg-zinc-800 text-white'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                      title="Daily Volume Bars"
                    >
                      <BarChart3 className="w-3.5 h-3.5" />
                      <span>Bars</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 4-Metric Quick Insights Strip */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                    30-Day Gross Total
                  </span>
                  <div className="text-xl sm:text-2xl font-black font-mono text-emerald-400 tracking-tight">
                    ${thirtyDayStats.totalGross.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    Completed PayPal & store volume
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                    Daily Average Gross
                  </span>
                  <div className="text-xl sm:text-2xl font-black font-mono text-white tracking-tight">
                    ${thirtyDayStats.averageDaily.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    Avg across 30-day baseline
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                    Peak Single Day
                  </span>
                  <div className="text-xl sm:text-2xl font-black font-mono text-teal-400 tracking-tight flex items-baseline gap-1.5">
                    <span>${thirtyDayStats.peakDayRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    <span className="text-[10px] text-zinc-400 font-normal">({thirtyDayStats.peakDayLabel})</span>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    Highest daily processed volume
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                    30-Day Completed Orders
                  </span>
                  <div className="text-xl sm:text-2xl font-black font-mono text-purple-400 tracking-tight">
                    {thirtyDayStats.totalOrders}
                  </div>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    Registration, unlocks & print items
                  </span>
                </div>
              </div>

              {/* Recharts Canvas */}
              <div className="h-72 sm:h-80 w-full min-w-0 pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  {chartViewMode === 'area' ? (
                    <AreaChart data={revenueTrendData} margin={{ top: 12, right: 12, left: -10, bottom: 4 }}>
                      <defs>
                        <linearGradient id="grossRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.45} />
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                        </linearGradient>
                        <linearGradient id="cumulativeGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.45} />
                          <stop offset="95%" stopColor="#06B6D4" stopOpacity={0.0} />
                        </linearGradient>
                        <linearGradient id="platformFeeGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#14B8A6" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#14B8A6" stopOpacity={0.0} />
                        </linearGradient>
                        <linearGradient id="payoutsGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#A855F7" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#A855F7" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272A" vertical={false} opacity={0.6} />
                      <XAxis
                        dataKey="label"
                        stroke="#71717A"
                        fontSize={11}
                        tickLine={false}
                        axisLine={{ stroke: '#3F3F46' }}
                        interval={2}
                      />
                      <YAxis
                        stroke="#71717A"
                        fontSize={11}
                        tickLine={false}
                        axisLine={{ stroke: '#3F3F46' }}
                        tickFormatter={(val) => `$${val >= 1000 ? (val / 1000).toFixed(1) + 'k' : val}`}
                      />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0]?.payload;
                            if (!data) return null;
                            return (
                              <div className="bg-zinc-950/95 border border-zinc-700/80 p-3.5 rounded-2xl shadow-2xl backdrop-blur-xl font-sans text-xs space-y-2 min-w-[210px] pointer-events-none z-50">
                                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                                  <div className="flex items-center gap-1.5 font-mono text-zinc-300 font-bold">
                                    <Calendar className="w-3 h-3 text-zinc-500" />
                                    <span>{data.fullDateStr || label}</span>
                                  </div>
                                  <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] font-mono text-zinc-400">
                                    {data.orderCount} {data.orderCount === 1 ? 'tx' : 'txs'}
                                  </span>
                                </div>
                                <div className="space-y-1.5 pt-0.5">
                                  <div className="flex items-center justify-between gap-3">
                                    <span className="text-zinc-400 flex items-center gap-1.5">
                                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                                      Daily Gross:
                                    </span>
                                    <span className="font-mono font-bold text-emerald-400 text-sm">
                                      ${data.grossRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between gap-3">
                                    <span className="text-zinc-400 flex items-center gap-1.5">
                                      <span className="w-2 h-2 rounded-full bg-teal-400" />
                                      Platform Cut:
                                    </span>
                                    <span className="font-mono text-teal-300">
                                      ${data.platformFee.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between gap-3">
                                    <span className="text-zinc-400 flex items-center gap-1.5">
                                      <span className="w-2 h-2 rounded-full bg-purple-400" />
                                      Payouts Cut:
                                    </span>
                                    <span className="font-mono text-purple-300">
                                      ${data.payouts.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                    </span>
                                  </div>
                                  {chartMetric === 'cumulative' && (
                                    <div className="flex items-center justify-between gap-3 pt-1.5 border-t border-zinc-800/80">
                                      <span className="text-zinc-400 flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-cyan-400" />
                                        Cumulative Vol:
                                      </span>
                                      <span className="font-mono font-bold text-cyan-300">
                                        ${data.cumulativeRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      {chartMetric === 'gross' && (
                        <Area
                          type="monotone"
                          dataKey="grossRevenue"
                          stroke="#10B981"
                          strokeWidth={2.5}
                          fillOpacity={1}
                          fill="url(#grossRevenueGrad)"
                          name="Daily Gross Revenue"
                          activeDot={{ r: 6, stroke: '#10B981', strokeWidth: 2, fill: '#000' }}
                        />
                      )}
                      {chartMetric === 'cumulative' && (
                        <Area
                          type="monotone"
                          dataKey="cumulativeRevenue"
                          stroke="#06B6D4"
                          strokeWidth={2.5}
                          fillOpacity={1}
                          fill="url(#cumulativeGrad)"
                          name="Cumulative Gross Volume"
                          activeDot={{ r: 6, stroke: '#06B6D4', strokeWidth: 2, fill: '#000' }}
                        />
                      )}
                      {chartMetric === 'breakdown' && (
                        <>
                          <Area
                            type="monotone"
                            dataKey="grossRevenue"
                            stroke="#10B981"
                            strokeWidth={2}
                            fillOpacity={0.6}
                            fill="url(#grossRevenueGrad)"
                            name="Gross Revenue"
                          />
                          <Area
                            type="monotone"
                            dataKey="payouts"
                            stroke="#A855F7"
                            strokeWidth={2}
                            fillOpacity={0.5}
                            fill="url(#payoutsGrad)"
                            name="Payouts Distributed"
                          />
                          <Area
                            type="monotone"
                            dataKey="platformFee"
                            stroke="#14B8A6"
                            strokeWidth={2}
                            fillOpacity={0.5}
                            fill="url(#platformFeeGrad)"
                            name="Platform Fee Retained"
                          />
                        </>
                      )}
                    </AreaChart>
                  ) : (
                    <BarChart data={revenueTrendData} margin={{ top: 12, right: 12, left: -10, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272A" vertical={false} opacity={0.6} />
                      <XAxis
                        dataKey="label"
                        stroke="#71717A"
                        fontSize={11}
                        tickLine={false}
                        axisLine={{ stroke: '#3F3F46' }}
                        interval={2}
                      />
                      <YAxis
                        stroke="#71717A"
                        fontSize={11}
                        tickLine={false}
                        axisLine={{ stroke: '#3F3F46' }}
                        tickFormatter={(val) => `$${val >= 1000 ? (val / 1000).toFixed(1) + 'k' : val}`}
                      />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0]?.payload;
                            if (!data) return null;
                            return (
                              <div className="bg-zinc-950/95 border border-zinc-700/80 p-3.5 rounded-2xl shadow-2xl backdrop-blur-xl font-sans text-xs space-y-2 min-w-[210px] pointer-events-none z-50">
                                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                                  <div className="flex items-center gap-1.5 font-mono text-zinc-300 font-bold">
                                    <Calendar className="w-3 h-3 text-zinc-500" />
                                    <span>{data.fullDateStr || label}</span>
                                  </div>
                                  <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] font-mono text-zinc-400">
                                    {data.orderCount} {data.orderCount === 1 ? 'tx' : 'txs'}
                                  </span>
                                </div>
                                <div className="space-y-1.5 pt-0.5">
                                  <div className="flex items-center justify-between gap-3">
                                    <span className="text-zinc-400 flex items-center gap-1.5">
                                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                                      Daily Gross:
                                    </span>
                                    <span className="font-mono font-bold text-emerald-400 text-sm">
                                      ${data.grossRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between gap-3">
                                    <span className="text-zinc-400 flex items-center gap-1.5">
                                      <span className="w-2 h-2 rounded-full bg-teal-400" />
                                      Platform Cut:
                                    </span>
                                    <span className="font-mono text-teal-300">
                                      ${data.platformFee.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between gap-3">
                                    <span className="text-zinc-400 flex items-center gap-1.5">
                                      <span className="w-2 h-2 rounded-full bg-purple-400" />
                                      Payouts Cut:
                                    </span>
                                    <span className="font-mono text-purple-300">
                                      ${data.payouts.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      {chartMetric === 'gross' && (
                        <Bar
                          dataKey="grossRevenue"
                          fill="#10B981"
                          radius={[6, 6, 0, 0]}
                          name="Daily Gross Revenue"
                        />
                      )}
                      {chartMetric === 'cumulative' && (
                        <Bar
                          dataKey="cumulativeRevenue"
                          fill="#06B6D4"
                          radius={[6, 6, 0, 0]}
                          name="Cumulative Gross Volume"
                        />
                      )}
                      {chartMetric === 'breakdown' && (
                        <>
                          <Bar
                            dataKey="payouts"
                            fill="#A855F7"
                            radius={[6, 6, 0, 0]}
                            stackId="split"
                            name="Payouts Distributed"
                          />
                          <Bar
                            dataKey="platformFee"
                            fill="#14B8A6"
                            radius={[6, 6, 0, 0]}
                            stackId="split"
                            name="Platform Fee Retained"
                          />
                        </>
                      )}
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>

              {/* Chart Legend & Telemetry Indicators */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-zinc-800/80 text-xs font-mono">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
                    <span className="text-zinc-300 font-bold">Gross Revenue ($)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-teal-500 shrink-0" />
                    <span className="text-zinc-400">Platform Kept (5%-10%)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-purple-500 shrink-0" />
                    <span className="text-zinc-400">Director & Creator Payouts</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-zinc-500 text-[11px]">
                  <Sparkles className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                  <span>Settled via Instant PayPal Partner Vault & Direct Prodigi Lab Settle</span>
                </div>
              </div>
            </div>

            {/* PayPal Transaction Log Table */}
            <div className="rounded-3xl bg-zinc-950 border border-zinc-800/80 overflow-hidden shadow-2xl space-y-4 p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-white tracking-tight">
                    PAYPAL TRANSACTION & REVENUE LOG
                  </h3>
                  <p className="text-xs text-zinc-400 font-mono">
                    Real-time transaction stream across all regional tournaments and media albums
                  </p>
                </div>

                <div className="w-full sm:w-72 relative">
                  <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={txSearch}
                    onChange={(e) => setTxSearch(e.target.value)}
                    placeholder="Search Order ID or customer..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-sans">
                  <thead className="bg-zinc-900/80 border-b border-zinc-800 text-zinc-400 font-mono uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-4 py-3">Order ID</th>
                      <th className="px-4 py-3">Customer</th>
                      <th className="px-4 py-3">Event / Album</th>
                      <th className="px-4 py-3">Total Paid</th>
                      <th className="px-4 py-3">Platform Fee</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Refund Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 font-medium">
                    {filteredTransactions.map((tx) => {
                      const isRefunded = tx.status === 'refunded';
                      return (
                        <tr key={tx.id} className="hover:bg-zinc-900/40">
                          <td className="px-4 py-3.5 font-mono text-white font-bold">
                            {tx.orderId}
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="font-bold text-white">{tx.customerName}</div>
                            <div className="text-[10px] text-zinc-500 font-mono">{tx.customerEmail}</div>
                          </td>
                          <td className="px-4 py-3.5 text-zinc-300 max-w-xs truncate">
                            {tx.eventName}
                          </td>
                          <td className="px-4 py-3.5 font-mono font-bold text-emerald-400">
                            ${tx.totalPaid.toFixed(2)}
                          </td>
                          <td className="px-4 py-3.5 font-mono text-teal-400">
                            ${tx.platformFee.toFixed(2)}
                          </td>
                          <td className="px-4 py-3.5">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase ${
                                isRefunded
                                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              }`}
                            >
                              {tx.status}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            {isRefunded ? (
                              <span className="text-[10px] font-mono text-zinc-500">
                                Refunded on {tx.refundedAt?.slice(0, 10)}
                              </span>
                            ) : (
                              <button
                                onClick={() => handleIssueRefund(tx)}
                                disabled={refundingTxId === tx.id}
                                className="px-3 py-1.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30 text-[10px] font-mono font-bold uppercase transition flex items-center gap-1.5 ml-auto cursor-pointer"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>{refundingTxId === tx.id ? 'Processing...' : 'Issue Refund'}</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* TAB 3: SPONSORS & ADS */}
        {/* ========================================== */}
        {activeTab === 'sponsors' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header + Add Sponsor Trigger */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-3xl bg-zinc-950 border border-zinc-800/80 shadow-2xl">
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight uppercase">
                  SPONSOR CAMPAIGNS & DIGITAL BANNER VAULT
                </h3>
                <p className="text-xs text-zinc-400 font-mono">
                  Manage commercial ad placements across tournaments, printable PDF brackets, and athlete showcases
                </p>
              </div>

              <button
                onClick={() => setNewSponsorModalOpen(true)}
                className="px-5 py-2.5 rounded-2xl bg-teal-500 hover:bg-teal-400 text-black font-mono font-black text-xs uppercase tracking-wider transition flex items-center gap-2 shadow-lg shadow-teal-500/20 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>New Campaign</span>
              </button>
            </div>

            {/* Campaigns Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {campaigns.map((camp) => (
                <div
                  key={camp.id}
                  className="rounded-3xl bg-zinc-950 border border-zinc-800/80 overflow-hidden shadow-2xl flex flex-col justify-between group hover:border-zinc-700 transition"
                >
                  {/* Banner Image Preview */}
                  <div className="relative aspect-[16/7] bg-black overflow-hidden">
                    <img
                      src={camp.bannerUrl}
                      alt={camp.sponsorName}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    />
                    <div className="absolute top-2 left-2 px-2.5 py-0.5 rounded-full bg-black/80 backdrop-blur-md text-[10px] font-mono font-bold text-teal-400 border border-zinc-700">
                      {camp.placementZone}
                    </div>
                    <div className="absolute top-2 right-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                          camp.status === 'active'
                            ? 'bg-emerald-500/90 text-black'
                            : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        {camp.status}
                      </span>
                    </div>
                  </div>

                  {/* Campaign Body */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      <h4 className="font-bold text-white text-base leading-snug">
                        {camp.sponsorName}
                      </h4>
                      <a
                        href={camp.targetUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] font-mono text-teal-400 hover:underline flex items-center gap-1 mt-1 truncate"
                      >
                        <span>{camp.targetUrl}</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-zinc-900 border border-zinc-800/80 text-center font-mono">
                      <div>
                        <div className="text-[10px] text-zinc-500 uppercase flex items-center justify-center gap-1">
                          <Eye className="w-3 h-3" /> Impressions
                        </div>
                        <div className="text-sm font-bold text-white mt-0.5">
                          {camp.impressions.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-zinc-500 uppercase flex items-center justify-center gap-1">
                          <MousePointerClick className="w-3 h-3 text-teal-400" /> Clicks
                        </div>
                        <div className="text-sm font-bold text-teal-400 mt-0.5">
                          {camp.clicks.toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60">
                      <span className="text-[10px] font-mono text-zinc-500">
                        Launched: {camp.createdAt}
                      </span>

                      <button
                        onClick={() => handleToggleSponsorCampaign(camp.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold uppercase transition flex items-center gap-1.5 cursor-pointer ${
                          camp.status === 'active'
                            ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                            : 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20'
                        }`}
                      >
                        {camp.status === 'active' ? (
                          <>
                            <Pause className="w-3 h-3" /> Pause
                          </>
                        ) : (
                          <>
                            <Play className="w-3 h-3 fill-current" /> Activate
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* TAB 4: SECURITY & AUDIT LOGS */}
        {/* ========================================== */}
        {activeTab === 'audit' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="p-6 rounded-3xl bg-zinc-950 border border-zinc-800/80 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-white tracking-tight uppercase">
                    IMMUTABLE ADMINISTRATIVE AUDIT TRAIL
                  </h3>
                  <p className="text-xs text-zinc-400 font-mono">
                    Cryptographically stamped log of all role promotions, refunds, suspensions, and emergency switches
                  </p>
                </div>
                <div className="p-2.5 rounded-2xl bg-zinc-900 border border-zinc-800 text-teal-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
              </div>

              <div className="divide-y divide-zinc-800/60 font-mono text-xs">
                {auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-zinc-900/30 transition px-2 rounded-xl"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-400 border border-teal-500/30 text-[10px] font-bold">
                          {log.actionType}
                        </span>
                        <span className="text-white font-bold">{log.targetEntityName}</span>
                      </div>
                      <p className="text-zinc-400 text-[11px] font-sans font-medium">
                        {log.details}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-[10px] text-zinc-500 flex items-center gap-1 justify-end">
                        <Clock className="w-3 h-3" />
                        <span>{log.timestamp}</span>
                      </div>
                      <div className="text-[10px] text-zinc-400 font-bold mt-0.5">
                        Admin: {log.adminEmail}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ========================================== */}
      {/* MODAL 1: EDIT MEMBER & ROLE ASSIGNMENT */}
      {/* ========================================== */}
      {editingMember && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative max-w-lg w-full bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex justify-between items-center p-5 border-b border-zinc-800 bg-zinc-900/50">
              <div className="flex items-center gap-2.5">
                <Edit3 className="w-4 h-4 text-teal-400" />
                <h3 className="font-bold text-white text-sm uppercase tracking-wide">
                  Edit Member Profile & Access Tier
                </h3>
              </div>
              <button
                onClick={() => setEditingMember(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 font-sans text-xs">
              <div>
                <label className="block text-[11px] font-mono text-zinc-400 mb-1 uppercase">
                  Display Name
                </label>
                <input
                  type="text"
                  value={editingMember.displayName}
                  onChange={(e) =>
                    setEditingMember({ ...editingMember, displayName: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-medium focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-zinc-400 mb-1 uppercase">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={editingMember.phoneNumber || ''}
                  onChange={(e) =>
                    setEditingMember({ ...editingMember, phoneNumber: e.target.value })
                  }
                  placeholder="(555) 000-0000"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-medium focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono text-zinc-400 mb-1 uppercase">
                    Linked Team Name
                  </label>
                  <input
                    type="text"
                    value={editingMember.teamName || ''}
                    onChange={(e) =>
                      setEditingMember({ ...editingMember, teamName: e.target.value })
                    }
                    placeholder="e.g. Lady Lightning"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-medium focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-zinc-400 mb-1 uppercase">
                    Jersey Number
                  </label>
                  <input
                    type="text"
                    value={editingMember.jerseyNumber || ''}
                    onChange={(e) =>
                      setEditingMember({ ...editingMember, jerseyNumber: e.target.value })
                    }
                    placeholder="#7"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-medium focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              {/* Role Selection with Safety Lock */}
              <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-mono font-bold uppercase text-teal-400 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" /> Assigned Role Tier
                  </label>
                  <span className="text-[10px] font-mono text-zinc-400">
                    Security Protected
                  </span>
                </div>

                <select
                  value={editingMember.role}
                  onChange={(e) =>
                    setEditingMember({ ...editingMember, role: e.target.value as AdminUser['role'] })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white font-mono focus:outline-none focus:border-teal-500 cursor-pointer"
                >
                  <option value="athlete">Athlete (Player Showcase & Stats)</option>
                  <option value="coach">Coach (Rosters, Tactical Matrix & Logs)</option>
                  <option value="creator">Creator / Media (Albums, Video & Reels)</option>
                  <option value="director">Tournament Director (Brackets & Operations)</option>
                  <option value="admin">Super Admin (Global System Control)</option>
                  <option value="fan">Fan / Viewer</option>
                </select>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="roleLockCheck"
                    checked={roleLockConfirmed}
                    onChange={(e) => setRoleLockConfirmed(e.target.checked)}
                    className="w-4 h-4 rounded text-teal-500 bg-zinc-950 border-zinc-800 focus:ring-0 cursor-pointer"
                  />
                  <label
                    htmlFor="roleLockCheck"
                    className="text-[11px] font-mono text-zinc-300 select-none cursor-pointer"
                  >
                    I confirm administrative role privileges for this user.
                  </label>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-zinc-800 bg-zinc-900/50 flex justify-end gap-3">
              <button
                onClick={() => setEditingMember(null)}
                className="px-4 py-2 rounded-xl text-xs font-mono text-zinc-400 hover:text-white transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveMemberChanges}
                disabled={!roleLockConfirmed}
                className={`px-5 py-2.5 rounded-xl font-mono font-black text-xs uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer ${
                  roleLockConfirmed
                    ? 'bg-teal-500 hover:bg-teal-400 text-black shadow-md shadow-teal-500/20'
                    : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                }`}
              >
                <Save className="w-4 h-4" />
                <span>Save Member</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL 2: CREATE SPONSOR CAMPAIGN */}
      {/* ========================================== */}
      {newSponsorModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative max-w-lg w-full bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-5 border-b border-zinc-800 bg-zinc-900/50">
              <div className="flex items-center gap-2.5">
                <Megaphone className="w-4 h-4 text-teal-400" />
                <h3 className="font-bold text-white text-sm uppercase tracking-wide">
                  New Sponsor Campaign & Banner
                </h3>
              </div>
              <button
                onClick={() => setNewSponsorModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 font-sans text-xs">
              <div>
                <label className="block text-[11px] font-mono text-zinc-400 mb-1 uppercase">
                  Sponsor Organization Name *
                </label>
                <input
                  type="text"
                  value={newSponsorForm.sponsorName}
                  onChange={(e) =>
                    setNewSponsorForm({ ...newSponsorForm, sponsorName: e.target.value })
                  }
                  placeholder="e.g. Gatorade Hydration Lab"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-medium focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-zinc-400 mb-1 uppercase">
                  Destination Target URL *
                </label>
                <input
                  type="text"
                  value={newSponsorForm.targetUrl}
                  onChange={(e) =>
                    setNewSponsorForm({ ...newSponsorForm, targetUrl: e.target.value })
                  }
                  placeholder="https://gatorade.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-medium focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-zinc-400 mb-1 uppercase">
                  Banner Image / Logo CDN Link
                </label>
                <input
                  type="text"
                  value={newSponsorForm.bannerUrl}
                  onChange={(e) =>
                    setNewSponsorForm({ ...newSponsorForm, bannerUrl: e.target.value })
                  }
                  placeholder="https://lh3.googleusercontent.com/d/FILE_ID or Image URL"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-medium focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono text-zinc-400 mb-1 uppercase">
                    Placement Zone
                  </label>
                  <select
                    value={newSponsorForm.placementZone}
                    onChange={(e) =>
                      setNewSponsorForm({
                        ...newSponsorForm,
                        placementZone: e.target.value as SponsorCampaign['placementZone']
                      })
                    }
                    className="w-full px-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-mono focus:outline-none focus:border-teal-500 cursor-pointer"
                  >
                    <option value="Global Header">Global Header</option>
                    <option value="Event Hub">Event Hub</option>
                    <option value="PDF Wall Brackets">PDF Wall Brackets</option>
                    <option value="Athlete Sidebar">Athlete Sidebar</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-zinc-400 mb-1 uppercase">
                    Campaign Budget ($)
                  </label>
                  <input
                    type="number"
                    value={newSponsorForm.budgetTotal}
                    onChange={(e) =>
                      setNewSponsorForm({
                        ...newSponsorForm,
                        budgetTotal: Number(e.target.value)
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-medium focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-zinc-800 bg-zinc-900/50 flex justify-end gap-3">
              <button
                onClick={() => setNewSponsorModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-mono text-zinc-400 hover:text-white transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSponsorCampaign}
                className="px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-black font-mono font-black text-xs uppercase tracking-wider transition shadow-md shadow-teal-500/20 cursor-pointer"
              >
                Launch Sponsor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL 3: EMERGENCY MAINTENANCE CONFIRMATION */}
      {/* ========================================== */}
      {maintenanceConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative max-w-md w-full bg-zinc-950 border border-amber-500/40 rounded-3xl overflow-hidden shadow-2xl p-6 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white uppercase">
                  Toggle Maintenance Lock
                </h3>
                <p className="text-xs text-zinc-400 font-mono">
                  Confirm high-priority system action
                </p>
              </div>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed font-sans">
              {maintenanceMode
                ? 'Disengaging maintenance mode will re-open public game log submissions, media uploads, and registration checkouts.'
                : 'Engaging emergency maintenance will instantly lock public write operations while leaving read queries open for active tournament attendees.'}
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setMaintenanceConfirmOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-mono text-zinc-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmEmergencyMaintenance}
                className={`px-5 py-2.5 rounded-xl font-mono font-black text-xs uppercase tracking-wider transition shadow-lg cursor-pointer ${
                  maintenanceMode
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/20'
                    : 'bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/20'
                }`}
              >
                {maintenanceMode ? 'Restore Live Operations' : 'Engage Emergency Lock'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
