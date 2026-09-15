import React, { useState, useEffect, useMemo } from 'react';
import { 
  Building2, 
  Users, 
  UserCheck, 
  ShieldCheck, 
  Search, 
  Filter, 
  PlusCircle, 
  CheckCircle2, 
  Award, 
  ExternalLink, 
  QrCode, 
  Download, 
  FileSpreadsheet, 
  X, 
  Check, 
  Trophy, 
  Calendar, 
  Mail, 
  Phone, 
  MapPin, 
  Globe, 
  UserPlus, 
  BadgeCheck, 
  AlertCircle,
  FileText,
  ChevronRight,
  Sparkles,
  Printer,
  Copy,
  Hash,
  Briefcase,
  UserCheck2,
  Clock,
  ShieldAlert,
  Edit,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, addDoc, doc, updateDoc, deleteDoc, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { getProductionData } from '../../lib/productionMode';
import { VerifiedBadge } from '../Common/VerifiedBadge';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from '../ui/table';

// --- DATA TYPES ---
export interface OrganizationItem {
  id: string;
  name: string;
  type: 'High School' | 'AAU Club' | 'Flag Football League' | 'Prep Academy' | 'Independent';
  location: string;
  logo: string;
  website?: string;
  contactEmail?: string;
  contactPhone?: string;
  bio: string;
  totalTeams: number;
  totalAthletes: number;
  verifiedCoachCount: number;
  establishedYear?: string;
  directorName?: string;
  createdAt: string;
}

export interface TeamItem {
  id: string;
  orgId: string;
  orgName: string;
  teamName: string;
  sport: string;
  ageGroup: string; // e.g. "Varsity", "17U", "15U", "Girls Open"
  coachName: string;
  coachTitle: string;
  coachPhone?: string;
  coachEmail?: string;
  seasonRecord?: string;
  verifiedRosterCount: number;
  maxRosterLimit: number;
  createdAt: string;
}

export interface OrganizationMember {
  id: string;
  orgId: string;
  orgName: string;
  memberName: string;
  role: 'Athletic Director' | 'Head Coach' | 'Assistant Coach' | 'Athletic Trainer' | 'Team Manager' | 'Student Athlete' | 'Recruiting Coordinator';
  email: string;
  phone: string;
  status: 'Active' | 'Certified' | 'Pending Verification' | 'Inactive';
  joinedDate: string;
  assignedTeam: string;
  photoUrl: string;
}

export interface RosterPlayer {
  id: string;
  teamId: string;
  athleteName: string;
  jerseyNumber: string;
  position: string;
  gradYear: string;
  gpa: string;
  heightWeight?: string;
  isVerified: boolean;
  checkInStatus: 'Checked In' | 'Pending' | 'Flagged';
  photoUrl?: string;
  memberId?: string;
}

// Pre-seeded initial Organizations
const DEFAULT_ORGANIZATIONS: OrganizationItem[] = [
  {
    id: 'org-1',
    name: 'West Orange High School Athletics',
    type: 'High School',
    location: 'West Orange, NJ',
    logo: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=150&auto=format&fit=crop&q=80',
    website: 'https://westorange.k12.nj.us',
    contactEmail: 'athletics@westorange.k12.nj.us',
    contactPhone: '(973) 669-5400',
    bio: 'Premier NJSIAA member program specializing in Flag Football, Football, Basketball, and Track & Field.',
    totalTeams: 8,
    totalAthletes: 145,
    verifiedCoachCount: 12,
    establishedYear: '1898',
    directorName: 'Coach Marcus Vance',
    createdAt: new Date().toISOString()
  },
  {
    id: 'org-2',
    name: 'NJ Scholars EYBL Club',
    type: 'AAU Club',
    location: 'Newark, NJ',
    logo: 'https://images.unsplash.com/photo-1519766304817-4f37bda74a29?w=150&auto=format&fit=crop&q=80',
    website: 'https://njscholars.org',
    contactEmail: 'info@njscholars.org',
    contactPhone: '(973) 824-3320',
    bio: 'Nationally ranked Nike EYBL grassroots club developing top Division 1 prospects across the East Coast.',
    totalTeams: 6,
    totalAthletes: 72,
    verifiedCoachCount: 8,
    establishedYear: '2012',
    directorName: 'Terrance Simmons',
    createdAt: new Date().toISOString()
  },
  {
    id: 'org-3',
    name: 'East Orange Campus Athletics',
    type: 'High School',
    location: 'East Orange, NJ',
    logo: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=150&auto=format&fit=crop&q=80',
    website: 'https://eastorange.k12.nj.us',
    contactEmail: 'sports@eastorange.k12.nj.us',
    contactPhone: '(973) 266-5700',
    bio: 'State championship athletic powerhouse known for elite speed, football prowess, and top college commits.',
    totalTeams: 10,
    totalAthletes: 180,
    verifiedCoachCount: 15,
    establishedYear: '1905',
    directorName: 'Coach Derrick Hall',
    createdAt: new Date().toISOString()
  },
  {
    id: 'org-4',
    name: 'Metro Flag Football Alliance',
    type: 'Flag Football League',
    location: 'Jersey City, NJ',
    logo: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=150&auto=format&fit=crop&q=80',
    website: 'https://metroflagnj.com',
    contactEmail: 'league@metroflagnj.com',
    contactPhone: '(201) 451-9000',
    bio: 'Tri-state sanctioned girls and adult flag football competitive alliance hosting regional tournaments.',
    totalTeams: 14,
    totalAthletes: 210,
    verifiedCoachCount: 18,
    establishedYear: '2019',
    directorName: 'Samantha Torres',
    createdAt: new Date().toISOString()
  }
];

// Seeded Teams
const DEFAULT_TEAMS: TeamItem[] = [
  {
    id: 'team-1',
    orgId: 'org-1',
    orgName: 'West Orange High School Athletics',
    teamName: 'West Orange Varsity Flag Football',
    sport: 'Flag Football',
    ageGroup: 'Varsity Girls',
    coachName: 'Coach Sarah Miller',
    coachTitle: 'Head Coach',
    coachPhone: '(973) 555-0192',
    coachEmail: 'smiller@westorange.k12.nj.us',
    seasonRecord: '12-1-0 (Sectional Champions)',
    verifiedRosterCount: 18,
    maxRosterLimit: 22,
    createdAt: new Date().toISOString()
  },
  {
    id: 'team-2',
    orgId: 'org-2',
    orgName: 'NJ Scholars EYBL Club',
    teamName: 'NJ Scholars 17U EYBL Boys',
    sport: 'Basketball',
    ageGroup: '17U EYBL',
    coachName: 'Coach Rashad Evans',
    coachTitle: 'Head Coach / Director',
    coachPhone: '(973) 555-8831',
    coachEmail: 'revans@njscholars.org',
    seasonRecord: '18-4-0 (Peach Jam Qualifier)',
    verifiedRosterCount: 10,
    maxRosterLimit: 12,
    createdAt: new Date().toISOString()
  },
  {
    id: 'team-3',
    orgId: 'org-3',
    orgName: 'East Orange Campus Athletics',
    teamName: 'East Orange Varsity Football',
    sport: 'Football',
    ageGroup: 'Varsity Boys',
    coachName: 'Coach Derrick Hall',
    coachTitle: 'Head Football Coach',
    coachPhone: '(973) 555-4011',
    coachEmail: 'dhall@eastorange.k12.nj.us',
    seasonRecord: '11-2-0 (State Finalist)',
    verifiedRosterCount: 28,
    maxRosterLimit: 35,
    createdAt: new Date().toISOString()
  }
];

// Seeded Organization Members & Staff
const DEFAULT_MEMBERS: OrganizationMember[] = [
  {
    id: 'mem-1',
    orgId: 'org-1',
    orgName: 'West Orange High School Athletics',
    memberName: 'Coach Marcus Vance',
    role: 'Athletic Director',
    email: 'mvance@westorange.k12.nj.us',
    phone: '(973) 669-5400',
    status: 'Certified',
    joinedDate: '2018-08-15',
    assignedTeam: 'All Athletic Programs',
    photoUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'mem-2',
    orgId: 'org-1',
    orgName: 'West Orange High School Athletics',
    memberName: 'Coach Sarah Miller',
    role: 'Head Coach',
    email: 'smiller@westorange.k12.nj.us',
    phone: '(973) 555-0192',
    status: 'Certified',
    joinedDate: '2021-03-10',
    assignedTeam: 'Varsity Flag Football',
    photoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'mem-3',
    orgId: 'org-2',
    orgName: 'NJ Scholars EYBL Club',
    memberName: 'Terrance Simmons',
    role: 'Athletic Director',
    email: 'tsimmons@njscholars.org',
    phone: '(973) 824-3320',
    status: 'Certified',
    joinedDate: '2019-05-01',
    assignedTeam: 'EYBL Circuit Operations',
    photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'mem-4',
    orgId: 'org-2',
    orgName: 'NJ Scholars EYBL Club',
    memberName: 'Coach Rashad Evans',
    role: 'Head Coach',
    email: 'revans@njscholars.org',
    phone: '(973) 555-8831',
    status: 'Certified',
    joinedDate: '2020-01-15',
    assignedTeam: '17U EYBL Boys',
    photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80'
  }
];

// Seeded Rosters
const DEFAULT_ROSTERS: RosterPlayer[] = [
  {
    id: 'rost-1',
    teamId: 'team-1',
    athleteName: 'Maya Sanchez',
    jerseyNumber: '12',
    position: 'Quarterback',
    gradYear: '2026',
    gpa: '3.9',
    heightWeight: "5'7\" / 135 lbs",
    isVerified: true,
    checkInStatus: 'Checked In',
    photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    memberId: 'J1P-ATH-9921'
  },
  {
    id: 'rost-2',
    teamId: 'team-1',
    athleteName: 'Brianna Jackson',
    jerseyNumber: '07',
    position: 'Wide Receiver / Safety',
    gradYear: '2026',
    gpa: '3.7',
    heightWeight: "5'8\" / 140 lbs",
    isVerified: true,
    checkInStatus: 'Checked In',
    photoUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    memberId: 'J1P-ATH-9922'
  },
  {
    id: 'rost-3',
    teamId: 'team-1',
    athleteName: 'Chloe Bennett',
    jerseyNumber: '21',
    position: 'Rusher / Blitzer',
    gradYear: '2027',
    gpa: '3.8',
    heightWeight: "5'6\" / 130 lbs",
    isVerified: true,
    checkInStatus: 'Checked In',
    photoUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80',
    memberId: 'J1P-ATH-9923'
  },
  {
    id: 'rost-4',
    teamId: 'team-2',
    athleteName: 'Malcolm Bagley',
    jerseyNumber: '03',
    position: 'Point Guard',
    gradYear: '2026',
    gpa: '3.6',
    heightWeight: "6'2\" / 180 lbs",
    isVerified: true,
    checkInStatus: 'Checked In',
    photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    memberId: 'J1P-ATH-8811'
  },
  {
    id: 'rost-5',
    teamId: 'team-2',
    athleteName: 'Tariq Simmons',
    jerseyNumber: '11',
    position: 'Shooting Guard',
    gradYear: '2026',
    gpa: '3.4',
    heightWeight: "6'5\" / 195 lbs",
    isVerified: true,
    checkInStatus: 'Checked In',
    photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    memberId: 'J1P-ATH-8812'
  }
];

export const OrganizationRosterHubPage: React.FC = () => {
  const { profile } = useAuth();

  // Navigation Sub-Tabs
  const [activeTab, setActiveTab] = useState<'orgs' | 'teams' | 'members' | 'rosters'>('orgs');

  // State Management
  const [organizations, setOrganizations] = useState<OrganizationItem[]>(() => getProductionData([], DEFAULT_ORGANIZATIONS));
  const [teams, setTeams] = useState<TeamItem[]>(() => getProductionData([], DEFAULT_TEAMS));
  const [members, setMembers] = useState<OrganizationMember[]>(() => getProductionData([], DEFAULT_MEMBERS));
  const [rosters, setRosters] = useState<RosterPlayer[]>(() => getProductionData([], DEFAULT_ROSTERS));

  // Active Selections & Filters
  const [selectedOrg, setSelectedOrg] = useState<OrganizationItem | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<TeamItem | null>(DEFAULT_TEAMS[0]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('All');

  // Member Table Filters
  const [memberRoleFilter, setMemberRoleFilter] = useState<string>('All');
  const [memberStatusFilter, setMemberStatusFilter] = useState<string>('All');

  // Modals for Creation
  const [isAddOrgModalOpen, setIsAddOrgModalOpen] = useState<boolean>(false);
  const [isAddTeamModalOpen, setIsAddTeamModalOpen] = useState<boolean>(false);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState<boolean>(false);
  const [isAddPlayerModalOpen, setIsAddPlayerModalOpen] = useState<boolean>(false);
  const [showQrModal, setShowQrModal] = useState<boolean>(false);

  // Modals for Editing
  const [editingTeam, setEditingTeam] = useState<TeamItem | null>(null);
  const [editingPlayer, setEditingPlayer] = useState<RosterPlayer | null>(null);
  const [editingMember, setEditingMember] = useState<OrganizationMember | null>(null);

  // New Organization Form State
  const [newOrgName, setNewOrgName] = useState<string>('');
  const [newOrgType, setNewOrgType] = useState<OrganizationItem['type']>('High School');
  const [newOrgLocation, setNewOrgLocation] = useState<string>('');
  const [newOrgBio, setNewOrgBio] = useState<string>('');
  const [newOrgDirector, setNewOrgDirector] = useState<string>('');
  const [newOrgEmail, setNewOrgEmail] = useState<string>('');

  // New / Edit Team Form State
  const [targetOrgId, setTargetOrgId] = useState<string>('');
  const [teamFormName, setTeamFormName] = useState<string>('');
  const [teamFormSport, setTeamFormSport] = useState<string>('Flag Football');
  const [teamFormAgeGroup, setTeamFormAgeGroup] = useState<string>('Varsity');
  const [teamFormCoach, setTeamFormCoach] = useState<string>('');
  const [teamFormCoachPhone, setTeamFormCoachPhone] = useState<string>('');
  const [teamFormCoachEmail, setTeamFormCoachEmail] = useState<string>('');
  const [teamFormRecord, setTeamFormRecord] = useState<string>('');
  const [teamFormMaxRoster, setTeamFormMaxRoster] = useState<number>(25);

  // New / Edit Member Form State
  const [memberFormName, setMemberFormName] = useState<string>('');
  const [memberFormRole, setMemberFormRole] = useState<OrganizationMember['role']>('Head Coach');
  const [memberFormEmail, setMemberFormEmail] = useState<string>('');
  const [memberFormPhone, setMemberFormPhone] = useState<string>('');
  const [memberFormAssignedTeam, setMemberFormAssignedTeam] = useState<string>('Varsity Team');
  const [memberFormStatus, setMemberFormStatus] = useState<OrganizationMember['status']>('Certified');

  // New / Edit Player Form State
  const [playerFormName, setPlayerFormName] = useState<string>('');
  const [playerFormJersey, setPlayerFormJersey] = useState<string>('');
  const [playerFormPosition, setPlayerFormPosition] = useState<string>('');
  const [playerFormGradYear, setPlayerFormGradYear] = useState<string>('2026');
  const [playerFormGPA, setPlayerFormGPA] = useState<string>('3.5');
  const [playerFormHeightWeight, setPlayerFormHeightWeight] = useState<string>('');
  const [playerFormCheckInStatus, setPlayerFormCheckInStatus] = useState<RosterPlayer['checkInStatus']>('Checked In');
  const [playerFormIsVerified, setPlayerFormIsVerified] = useState<boolean>(true);

  // -------------------------------------------------------------
  // REAL-TIME FIRESTORE LISTENERS
  // -------------------------------------------------------------

  // 1. Organizations Listener
  useEffect(() => {
    let unsub = () => {};
    try {
      const q = query(collection(db, 'Organizations'), orderBy('createdAt', 'desc'));
      unsub = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const fetched: OrganizationItem[] = snapshot.docs.map(docSnap => ({
            id: docSnap.id,
            ...docSnap.data()
          } as OrganizationItem));
          setOrganizations(getProductionData(fetched, [...fetched, ...DEFAULT_ORGANIZATIONS.filter(d => !fetched.some(f => f.id === d.id))]));
        } else {
          setOrganizations(getProductionData([], DEFAULT_ORGANIZATIONS));
        }
      }, (err) => console.warn('Firestore Org listener fallback:', err));
    } catch (err) {
      console.warn('Firestore Org setup error:', err);
    }
    return () => unsub();
  }, []);

  // 2. Teams Listener
  useEffect(() => {
    let unsub = () => {};
    try {
      const q = query(collection(db, 'Teams'), orderBy('createdAt', 'desc'));
      unsub = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const fetched: TeamItem[] = snapshot.docs.map(docSnap => ({
            id: docSnap.id,
            ...docSnap.data()
          } as TeamItem));
          setTeams(getProductionData(fetched, [...fetched, ...DEFAULT_TEAMS.filter(d => !fetched.some(f => f.id === d.id))]));
        } else {
          setTeams(getProductionData([], DEFAULT_TEAMS));
        }
      }, (err) => console.warn('Firestore Teams listener fallback:', err));
    } catch (err) {
      console.warn('Firestore Teams setup error:', err);
    }
    return () => unsub();
  }, []);

  // 3. Org Members Listener
  useEffect(() => {
    let unsub = () => {};
    try {
      const q = query(collection(db, 'OrgMembers'), orderBy('joinedDate', 'desc'));
      unsub = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const fetched: OrganizationMember[] = snapshot.docs.map(docSnap => ({
            id: docSnap.id,
            ...docSnap.data()
          } as OrganizationMember));
          setMembers(getProductionData(fetched, [...fetched, ...DEFAULT_MEMBERS.filter(d => !fetched.some(f => f.id === d.id))]));
        } else {
          setMembers(getProductionData([], DEFAULT_MEMBERS));
        }
      }, (err) => console.warn('Firestore OrgMembers listener fallback:', err));
    } catch (err) {
      console.warn('Firestore OrgMembers setup error:', err);
    }
    return () => unsub();
  }, []);

  // 4. Rosters Listener
  useEffect(() => {
    let unsub = () => {};
    try {
      const q = query(collection(db, 'Rosters'));
      unsub = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const fetched: RosterPlayer[] = snapshot.docs.map(docSnap => ({
            id: docSnap.id,
            ...docSnap.data()
          } as RosterPlayer));
          setRosters(getProductionData(fetched, [...fetched, ...DEFAULT_ROSTERS.filter(d => !fetched.some(f => f.id === d.id))]));
        } else {
          setRosters(getProductionData([], DEFAULT_ROSTERS));
        }
      }, (err) => console.warn('Firestore Rosters listener fallback:', err));
    } catch (err) {
      console.warn('Firestore Rosters setup error:', err);
    }
    return () => unsub();
  }, []);

  // Sync selectedTeam if teams list updates or is empty
  useEffect(() => {
    if (!selectedTeam && teams.length > 0) {
      setSelectedTeam(teams[0]);
    }
  }, [teams]);

  // Filtered Organizations
  const filteredOrgs = useMemo(() => {
    return organizations.filter(org => {
      const matchesSearch = org.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            org.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (org.directorName && org.directorName.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesType = typeFilter === 'All' || org.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [organizations, searchQuery, typeFilter]);

  // Filtered Teams
  const filteredTeams = useMemo(() => {
    return teams.filter(t => {
      const matchesSearch = t.teamName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            t.sport.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            t.coachName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            t.orgName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesOrg = !selectedOrg || t.orgId === selectedOrg.id;
      return matchesSearch && matchesOrg;
    });
  }, [teams, searchQuery, selectedOrg]);

  // Filtered Members for Data Table
  const filteredMembers = useMemo(() => {
    return members.filter(mem => {
      const matchesSearch = mem.memberName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            mem.orgName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            mem.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            mem.assignedTeam.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = memberRoleFilter === 'All' || mem.role === memberRoleFilter;
      const matchesStatus = memberStatusFilter === 'All' || mem.status === memberStatusFilter;
      const matchesOrg = !selectedOrg || mem.orgId === selectedOrg.id;
      return matchesSearch && matchesRole && matchesStatus && matchesOrg;
    });
  }, [members, searchQuery, memberRoleFilter, memberStatusFilter, selectedOrg]);

  // Roster for Selected Team
  const selectedTeamRoster = useMemo(() => {
    if (!selectedTeam) return [];
    return rosters.filter(r => r.teamId === selectedTeam.id);
  }, [rosters, selectedTeam]);

  // -------------------------------------------------------------
  // HANDLERS FOR ORGANIZATIONS
  // -------------------------------------------------------------
  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim()) return;

    const orgObj: OrganizationItem = {
      id: `org-${Date.now()}`,
      name: newOrgName.trim(),
      type: newOrgType,
      location: newOrgLocation.trim() || 'New Jersey',
      logo: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=150&auto=format&fit=crop&q=80',
      bio: newOrgBio.trim() || 'Registered sports organization on the Just1Play Network.',
      directorName: newOrgDirector.trim() || profile?.displayName || 'Athletic Director',
      contactEmail: newOrgEmail.trim() || 'contact@just1play.com',
      totalTeams: 0,
      totalAthletes: 0,
      verifiedCoachCount: 1,
      createdAt: new Date().toISOString()
    };

    try {
      await addDoc(collection(db, 'Organizations'), orgObj);
    } catch (err) {
      console.warn('Firestore add org error:', err);
    }

    setOrganizations(prev => [orgObj, ...prev]);
    setIsAddOrgModalOpen(false);
    setNewOrgName('');
    setNewOrgBio('');
    setNewOrgDirector('');
    setNewOrgEmail('');
    setNewOrgLocation('');
  };

  // -------------------------------------------------------------
  // HANDLERS FOR TEAMS
  // -------------------------------------------------------------
  const openAddTeamModal = () => {
    const defaultOrg = selectedOrg || organizations[0] || DEFAULT_ORGANIZATIONS[0];
    setTargetOrgId(defaultOrg.id);
    setTeamFormName('');
    setTeamFormSport('Flag Football');
    setTeamFormAgeGroup('Varsity');
    setTeamFormCoach(profile?.displayName || '');
    setTeamFormCoachPhone('(973) 555-0100');
    setTeamFormCoachEmail('coach@just1play.com');
    setTeamFormRecord('0-0-0');
    setTeamFormMaxRoster(25);
    setIsAddTeamModalOpen(true);
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamFormName.trim()) return;

    const parentOrg = organizations.find(o => o.id === targetOrgId) || selectedOrg || organizations[0];
    if (!parentOrg) return;

    const teamObj: TeamItem = {
      id: `team-${Date.now()}`,
      orgId: parentOrg.id,
      orgName: parentOrg.name,
      teamName: teamFormName.trim(),
      sport: teamFormSport,
      ageGroup: teamFormAgeGroup,
      coachName: teamFormCoach.trim() || 'Head Coach',
      coachTitle: 'Head Coach',
      coachPhone: teamFormCoachPhone.trim(),
      coachEmail: teamFormCoachEmail.trim(),
      seasonRecord: teamFormRecord.trim() || '0-0-0',
      verifiedRosterCount: 0,
      maxRosterLimit: teamFormMaxRoster || 25,
      createdAt: new Date().toISOString()
    };

    try {
      await addDoc(collection(db, 'Teams'), teamObj);
      // Update Org team count
      const orgRef = doc(db, 'Organizations', parentOrg.id);
      await updateDoc(orgRef, {
        totalTeams: (parentOrg.totalTeams || 0) + 1
      });
    } catch (err) {
      console.warn('Firestore create team error:', err);
    }

    setTeams(prev => [teamObj, ...prev]);
    setSelectedTeam(teamObj);
    setIsAddTeamModalOpen(false);
  };

  const openEditTeamModal = (team: TeamItem) => {
    setEditingTeam(team);
    setTeamFormName(team.teamName);
    setTeamFormSport(team.sport);
    setTeamFormAgeGroup(team.ageGroup);
    setTeamFormCoach(team.coachName);
    setTeamFormCoachPhone(team.coachPhone || '');
    setTeamFormCoachEmail(team.coachEmail || '');
    setTeamFormRecord(team.seasonRecord || '');
    setTeamFormMaxRoster(team.maxRosterLimit);
  };

  const handleUpdateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeam || !teamFormName.trim()) return;

    const updatedTeam: TeamItem = {
      ...editingTeam,
      teamName: teamFormName.trim(),
      sport: teamFormSport,
      ageGroup: teamFormAgeGroup,
      coachName: teamFormCoach.trim(),
      coachPhone: teamFormCoachPhone.trim(),
      coachEmail: teamFormCoachEmail.trim(),
      seasonRecord: teamFormRecord.trim(),
      maxRosterLimit: teamFormMaxRoster
    };

    try {
      const teamRef = doc(db, 'Teams', editingTeam.id);
      await updateDoc(teamRef, {
        teamName: updatedTeam.teamName,
        sport: updatedTeam.sport,
        ageGroup: updatedTeam.ageGroup,
        coachName: updatedTeam.coachName,
        coachPhone: updatedTeam.coachPhone,
        coachEmail: updatedTeam.coachEmail,
        seasonRecord: updatedTeam.seasonRecord,
        maxRosterLimit: updatedTeam.maxRosterLimit
      });
    } catch (err) {
      console.warn('Firestore update team error:', err);
    }

    setTeams(prev => prev.map(t => t.id === editingTeam.id ? updatedTeam : t));
    if (selectedTeam?.id === editingTeam.id) {
      setSelectedTeam(updatedTeam);
    }
    setEditingTeam(null);
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (!window.confirm('Are you sure you want to delete this team? All associated roster items will remain intact.')) return;

    try {
      await deleteDoc(doc(db, 'Teams', teamId));
    } catch (err) {
      console.warn('Firestore delete team error:', err);
    }

    setTeams(prev => prev.filter(t => t.id !== teamId));
    if (selectedTeam?.id === teamId) {
      const remaining = teams.filter(t => t.id !== teamId);
      setSelectedTeam(remaining[0] || null);
    }
    setEditingTeam(null);
  };

  // -------------------------------------------------------------
  // HANDLERS FOR ROSTER ATHLETES
  // -------------------------------------------------------------
  const openAddPlayerModal = () => {
    setPlayerFormName('');
    setPlayerFormJersey('');
    setPlayerFormPosition('');
    setPlayerFormGradYear('2026');
    setPlayerFormGPA('3.5');
    setPlayerFormHeightWeight("5'9\" / 150 lbs");
    setPlayerFormCheckInStatus('Checked In');
    setPlayerFormIsVerified(true);
    setIsAddPlayerModalOpen(true);
  };

  const handleCreatePlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerFormName.trim() || !selectedTeam) return;

    const playerObj: RosterPlayer = {
      id: `rost-${Date.now()}`,
      teamId: selectedTeam.id,
      athleteName: playerFormName.trim(),
      jerseyNumber: playerFormJersey.trim() || '00',
      position: playerFormPosition.trim() || 'ATH',
      gradYear: playerFormGradYear,
      gpa: playerFormGPA,
      heightWeight: playerFormHeightWeight,
      isVerified: playerFormIsVerified,
      checkInStatus: playerFormCheckInStatus,
      photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      memberId: `J1P-ATH-${Math.floor(1000 + Math.random() * 9000)}`
    };

    try {
      await addDoc(collection(db, 'Rosters'), playerObj);
      // Update team roster count
      const teamRef = doc(db, 'Teams', selectedTeam.id);
      const newCount = (selectedTeam.verifiedRosterCount || 0) + 1;
      await updateDoc(teamRef, { verifiedRosterCount: newCount });
      setSelectedTeam(prev => prev ? { ...prev, verifiedRosterCount: newCount } : null);
    } catch (err) {
      console.warn('Firestore add roster player error:', err);
    }

    setRosters(prev => [playerObj, ...prev]);
    setIsAddPlayerModalOpen(false);
  };

  const openEditPlayerModal = (player: RosterPlayer) => {
    setEditingPlayer(player);
    setPlayerFormName(player.athleteName);
    setPlayerFormJersey(player.jerseyNumber);
    setPlayerFormPosition(player.position);
    setPlayerFormGradYear(player.gradYear);
    setPlayerFormGPA(player.gpa);
    setPlayerFormHeightWeight(player.heightWeight || '');
    setPlayerFormCheckInStatus(player.checkInStatus);
    setPlayerFormIsVerified(player.isVerified);
  };

  const handleUpdatePlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlayer || !playerFormName.trim()) return;

    const updatedPlayer: RosterPlayer = {
      ...editingPlayer,
      athleteName: playerFormName.trim(),
      jerseyNumber: playerFormJersey.trim() || '00',
      position: playerFormPosition.trim() || 'ATH',
      gradYear: playerFormGradYear,
      gpa: playerFormGPA,
      heightWeight: playerFormHeightWeight,
      checkInStatus: playerFormCheckInStatus,
      isVerified: playerFormIsVerified
    };

    try {
      const pRef = doc(db, 'Rosters', editingPlayer.id);
      await updateDoc(pRef, {
        athleteName: updatedPlayer.athleteName,
        jerseyNumber: updatedPlayer.jerseyNumber,
        position: updatedPlayer.position,
        gradYear: updatedPlayer.gradYear,
        gpa: updatedPlayer.gpa,
        heightWeight: updatedPlayer.heightWeight,
        checkInStatus: updatedPlayer.checkInStatus,
        isVerified: updatedPlayer.isVerified
      });
    } catch (err) {
      console.warn('Firestore update roster player error:', err);
    }

    setRosters(prev => prev.map(p => p.id === editingPlayer.id ? updatedPlayer : p));
    setEditingPlayer(null);
  };

  const handleDeletePlayer = async (playerId: string) => {
    if (!window.confirm('Remove this athlete from the official team roster?')) return;

    try {
      await deleteDoc(doc(db, 'Rosters', playerId));
      if (selectedTeam) {
        const teamRef = doc(db, 'Teams', selectedTeam.id);
        const newCount = Math.max(0, (selectedTeam.verifiedRosterCount || 1) - 1);
        await updateDoc(teamRef, { verifiedRosterCount: newCount });
        setSelectedTeam(prev => prev ? { ...prev, verifiedRosterCount: newCount } : null);
      }
    } catch (err) {
      console.warn('Firestore delete roster player error:', err);
    }

    setRosters(prev => prev.filter(p => p.id !== playerId));
    setEditingPlayer(null);
  };

  const handleToggleVerification = async (playerId: string) => {
    const player = rosters.find(p => p.id === playerId);
    if (!player) return;
    const nextStatus = !player.isVerified;

    try {
      const pRef = doc(db, 'Rosters', playerId);
      await updateDoc(pRef, { isVerified: nextStatus });
    } catch (err) {
      console.warn('Firestore toggle verification error:', err);
    }

    setRosters(prev => prev.map(p => p.id === playerId ? { ...p, isVerified: nextStatus } : p));
  };

  // -------------------------------------------------------------
  // HANDLERS FOR MEMBERS & STAFF
  // -------------------------------------------------------------
  const openAddMemberModal = () => {
    setMemberFormName('');
    setMemberFormRole('Head Coach');
    setMemberFormEmail('staff@just1play.com');
    setMemberFormPhone('(973) 555-0100');
    setMemberFormAssignedTeam('Varsity Program');
    setMemberFormStatus('Certified');
    setIsAddMemberModalOpen(true);
  };

  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberFormName.trim()) return;

    const currentOrg = selectedOrg || organizations[0] || DEFAULT_ORGANIZATIONS[0];

    const newMember: OrganizationMember = {
      id: `mem-${Date.now()}`,
      orgId: currentOrg.id,
      orgName: currentOrg.name,
      memberName: memberFormName.trim(),
      role: memberFormRole,
      email: memberFormEmail.trim() || 'staff@just1play.com',
      phone: memberFormPhone.trim() || '(973) 555-0100',
      status: memberFormStatus,
      joinedDate: new Date().toISOString().split('T')[0],
      assignedTeam: memberFormAssignedTeam.trim() || 'General Operations',
      photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
    };

    try {
      await addDoc(collection(db, 'OrgMembers'), newMember);
    } catch (err) {
      console.warn('Firestore add member error:', err);
    }

    setMembers(prev => [newMember, ...prev]);
    setIsAddMemberModalOpen(false);
  };

  const openEditMemberModal = (member: OrganizationMember) => {
    setEditingMember(member);
    setMemberFormName(member.memberName);
    setMemberFormRole(member.role);
    setMemberFormEmail(member.email);
    setMemberFormPhone(member.phone);
    setMemberFormAssignedTeam(member.assignedTeam);
    setMemberFormStatus(member.status);
  };

  const handleUpdateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember || !memberFormName.trim()) return;

    const updatedMember: OrganizationMember = {
      ...editingMember,
      memberName: memberFormName.trim(),
      role: memberFormRole,
      email: memberFormEmail.trim(),
      phone: memberFormPhone.trim(),
      assignedTeam: memberFormAssignedTeam.trim(),
      status: memberFormStatus
    };

    try {
      const mRef = doc(db, 'OrgMembers', editingMember.id);
      await updateDoc(mRef, {
        memberName: updatedMember.memberName,
        role: updatedMember.role,
        email: updatedMember.email,
        phone: updatedMember.phone,
        assignedTeam: updatedMember.assignedTeam,
        status: updatedMember.status
      });
    } catch (err) {
      console.warn('Firestore update member error:', err);
    }

    setMembers(prev => prev.map(m => m.id === editingMember.id ? updatedMember : m));
    setEditingMember(null);
  };

  const handleDeleteMember = async (memberId: string) => {
    if (!window.confirm('Delete this member / staff entry?')) return;

    try {
      await deleteDoc(doc(db, 'OrgMembers', memberId));
    } catch (err) {
      console.warn('Firestore delete member error:', err);
    }

    setMembers(prev => prev.filter(m => m.id !== memberId));
    setEditingMember(null);
  };

  const handleToggleMemberStatus = async (memberId: string) => {
    const member = members.find(m => m.id === memberId);
    if (!member) return;

    const nextStatus: OrganizationMember['status'] = 
      member.status === 'Certified' ? 'Active' : 
      member.status === 'Active' ? 'Pending Verification' : 'Certified';

    try {
      const mRef = doc(db, 'OrgMembers', memberId);
      await updateDoc(mRef, { status: nextStatus });
    } catch (err) {
      console.warn('Firestore toggle status error:', err);
    }

    setMembers(prev => prev.map(m => m.id === memberId ? { ...m, status: nextStatus } : m));
  };

  return (
    <div className="space-y-8 pb-16">
      
      {/* HERO HEADER BANNER */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-[#000000] via-[#212A31] to-[#000000] border border-[#E5B868]/30 p-8 shadow-[0_0_50px_rgba(214,28,36,0.12)] backdrop-blur-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#E5B868]/10 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E5B868]/15 border border-[#E5B868]/40 text-[#E5B868] text-xs font-black uppercase tracking-widest font-mono">
              <Building2 className="w-3.5 h-3.5" />
              <span>ORGANIZATIONS & TEAM ROSTER HUB</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black italic tracking-tight uppercase text-white font-sans">
              OFFICIAL TEAM <span className="text-[#E5B868]">ROSTERS</span> & LEAGUES<span className="text-[#E5B868]">.</span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
              Verified organization profiles, staff directories, team rosters, and digital player check-in cards for Just1Play sanctioned events.
            </p>

            {/* Quick Metrics Badges */}
            <div className="flex flex-wrap items-center gap-4 pt-2 text-xs font-mono">
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/5 border border-white/10 text-slate-200">
                <Building2 className="w-4 h-4 text-[#E5B868]" />
                <span><strong className="text-white font-bold">{organizations.length}</strong> Registered Orgs</span>
              </div>
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/5 border border-white/10 text-slate-200">
                <Users className="w-4 h-4 text-slate-300" />
                <span><strong className="text-white font-bold">{teams.length}</strong> Verified Teams</span>
              </div>
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/5 border border-white/10 text-slate-200">
                <UserCheck className="w-4 h-4 text-red-500" />
                <span><strong className="text-white font-bold">{members.length}</strong> Staff & Members</span>
              </div>
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/5 border border-white/10 text-slate-200">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span><strong className="text-white font-bold">{rosters.length}</strong> Active Athletes</span>
              </div>
            </div>
          </div>

          {/* Action Callout Button */}
          <div className="flex flex-col sm:flex-row md:flex-col gap-3 self-start md:self-center shrink-0">
            <button
              onClick={() => setIsAddOrgModalOpen(true)}
              className="px-6 py-4 rounded-2xl bg-[#E5B868] hover:bg-[#B8141B] text-black font-black uppercase tracking-wider text-xs flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(214,28,36,0.5)] transition-all transform hover:scale-[1.03] cursor-pointer"
            >
              <PlusCircle className="w-5 h-5 stroke-[2.5]" />
              <span>Register Organization / School</span>
            </button>

            <button
              onClick={openAddTeamModal}
              className="px-6 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-black uppercase tracking-wider text-xs flex items-center justify-center gap-2 border border-white/20 transition-all cursor-pointer"
            >
              <Users className="w-4 h-4 text-[#E5B868]" />
              <span>Add Team to Directory</span>
            </button>
          </div>
        </div>
      </div>

      {/* NAVIGATION SUB-TABS */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-2 border-b border-white/10">
        <button
          onClick={() => setActiveTab('orgs')}
          className={`px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'orgs'
              ? 'bg-[#E5B868] text-black shadow-[0_0_20px_rgba(214,28,36,0.4)]'
              : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white border border-white/10'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Organizations ({organizations.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('teams')}
          className={`px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'teams'
              ? 'bg-[#E5B868] text-black shadow-[0_0_20px_rgba(214,28,36,0.4)]'
              : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white border border-white/10'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Team Directory ({teams.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('members')}
          className={`px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'members'
              ? 'bg-[#E5B868] text-black shadow-[0_0_20px_rgba(214,28,36,0.4)]'
              : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white border border-white/10'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          <span>Org Members & Staff Data Table ({members.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('rosters')}
          className={`px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'rosters'
              ? 'bg-[#E5B868] text-black shadow-[0_0_20px_rgba(214,28,36,0.4)]'
              : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white border border-white/10'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Verified Roster Cards ({selectedTeamRoster.length})</span>
        </button>
      </div>

      {/* --- TAB 1: ORGANIZATIONS DIRECTORY --- */}
      {activeTab === 'orgs' && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl bg-black/60 border border-white/10 backdrop-blur-xl">
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
              <Filter className="w-4 h-4 text-[#E5B868] flex-shrink-0" />
              {['All', 'High School', 'AAU Club', 'Flag Football League', 'Prep Academy'].map(t => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider flex-shrink-0 transition-all cursor-pointer ${
                    typeFilter === t
                      ? 'bg-[#E5B868] text-black shadow-[0_0_12px_rgba(214,28,36,0.4)]'
                      : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white border border-white/10'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="relative min-w-[240px]">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search org, school, or location..."
                className="w-full bg-[#212A31] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:border-[#E5B868] focus:outline-none"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            </div>
          </div>

          {/* Org Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredOrgs.map((org) => (
              <div
                key={org.id}
                className="group rounded-3xl overflow-hidden bg-[#212A31] border border-white/10 hover:border-[#E5B868]/50 transition-all duration-300 hover:shadow-[0_0_25px_rgba(214,28,36,0.15)] flex flex-col justify-between p-6 space-y-4"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <img
                      src={org.logo}
                      alt={org.name}
                      className="w-14 h-14 rounded-2xl object-cover border-2 border-[#E5B868]/50"
                    />
                    <span className="px-3 py-1 rounded-full bg-[#E5B868]/10 text-[#E5B868] border border-[#E5B868]/30 text-[10px] font-black uppercase font-mono">
                      {org.type}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-black text-white uppercase group-hover:text-[#E5B868] transition-colors flex items-center gap-1.5">
                      <span>{org.name}</span>
                      <VerifiedBadge size="sm" />
                    </h3>
                    <p className="text-xs text-slate-400 font-mono flex items-center gap-1 mt-1">
                      <MapPin className="w-3.5 h-3.5 text-[#E5B868]" />
                      <span>{org.location}</span>
                    </p>
                  </div>

                  <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                    {org.bio}
                  </p>
                </div>

                <div className="space-y-3 pt-3 border-t border-white/10">
                  <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
                    <div className="p-2 rounded-xl bg-black/50 border border-white/5">
                      <p className="text-slate-400 text-[9px] uppercase">Teams</p>
                      <p className="text-white font-bold">{org.totalTeams}</p>
                    </div>
                    <div className="p-2 rounded-xl bg-black/50 border border-white/5">
                      <p className="text-slate-400 text-[9px] uppercase">Athletes</p>
                      <p className="text-[#E5B868] font-bold">{org.totalAthletes}</p>
                    </div>
                    <div className="p-2 rounded-xl bg-black/50 border border-white/5">
                      <p className="text-slate-400 text-[9px] uppercase">Coaches</p>
                      <p className="text-slate-300 font-bold">{org.verifiedCoachCount}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedOrg(org);
                      const matchingTeams = teams.filter(t => t.orgId === org.id);
                      if (matchingTeams.length > 0) setSelectedTeam(matchingTeams[0]);
                      setActiveTab('teams');
                    }}
                    className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-[#E5B868] text-white hover:text-black font-black uppercase text-xs flex items-center justify-center gap-2 transition-all border border-white/10 cursor-pointer"
                  >
                    <span>View Teams & Roster</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- TAB 2: TEAMS DIRECTORY --- */}
      {activeTab === 'teams' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-black/60 border border-white/10">
            <div>
              <h2 className="text-lg font-black uppercase text-white italic flex items-center gap-2">
                <span>Active Teams Directory ({filteredTeams.length})</span>
                {selectedOrg && (
                  <span className="text-xs font-normal text-[#E5B868] font-mono">
                    Filtered: {selectedOrg.name}
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">
                Manage, add, and update teams. Select a team to open its verified roster cards.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {selectedOrg && (
                <button
                  onClick={() => setSelectedOrg(null)}
                  className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs text-slate-300 font-mono flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Show All Orgs</span>
                </button>
              )}

              <button
                onClick={openAddTeamModal}
                className="px-4 py-2 rounded-xl bg-[#E5B868] text-black font-black uppercase text-xs flex items-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(214,28,36,0.4)]"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Add New Team</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTeams.map((t) => {
              const isSelected = selectedTeam?.id === t.id;
              return (
                <div
                  key={t.id}
                  className={`p-6 rounded-3xl border transition-all cursor-pointer space-y-4 relative ${
                    isSelected
                      ? 'bg-[#212A31] border-[#E5B868] shadow-[0_0_25px_rgba(214,28,36,0.2)]'
                      : 'bg-white/5 border-white/10 hover:border-white/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#E5B868]/20 text-[#E5B868] border border-[#E5B868]/40 text-[10px] font-black uppercase">
                      {t.sport}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-slate-400">{t.ageGroup}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditTeamModal(t);
                        }}
                        className="p-1 rounded bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
                        title="Edit Team Details"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div onClick={() => setSelectedTeam(t)}>
                    <h3 className="text-base font-black text-white uppercase">{t.teamName}</h3>
                    <p className="text-xs text-slate-400">{t.orgName}</p>
                  </div>

                  <div className="p-3 rounded-2xl bg-black/50 border border-white/5 space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Head Coach:</span>
                      <span className="text-white font-bold">{t.coachName}</span>
                    </div>
                    {t.coachPhone && (
                      <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                        <span>Contact:</span>
                        <span>{t.coachPhone}</span>
                      </div>
                    )}
                    {t.seasonRecord && (
                      <div className="flex justify-between pt-1 border-t border-white/5">
                        <span className="text-slate-400">Season Record:</span>
                        <span className="text-[#E5B868] font-mono font-bold">{t.seasonRecord}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs font-mono pt-2 border-t border-white/10">
                    <span className="text-slate-300">Roster Capacity:</span>
                    <span className="text-red-500 font-bold">{t.verifiedRosterCount} / {t.maxRosterLimit} Players</span>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedTeam(t);
                      setActiveTab('rosters');
                    }}
                    className="w-full py-2.5 rounded-xl bg-[#E5B868]/10 text-[#E5B868] hover:bg-[#E5B868] hover:text-black font-black uppercase text-xs transition-all border border-[#E5B868]/30 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Open Official Roster</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* --- TAB 3: ORGANIZATION MEMBERS & STAFF DATA TABLE --- */}
      {activeTab === 'members' && (
        <div className="space-y-6">
          
          {/* Controls & Filter Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 rounded-3xl bg-[#212A31] border border-white/10 backdrop-blur-xl">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 bg-black/50 p-2 rounded-2xl border border-white/10">
                <Briefcase className="w-4 h-4 text-[#E5B868]" />
                <span className="text-xs font-black uppercase text-white font-mono">Roles:</span>
                <select
                  value={memberRoleFilter}
                  onChange={(e) => setMemberRoleFilter(e.target.value)}
                  className="bg-[#212A31] border border-white/15 rounded-xl px-3 py-1.5 text-xs text-white focus:border-[#E5B868] focus:outline-none font-mono"
                >
                  <option value="All">All Roles</option>
                  <option value="Athletic Director">Athletic Director</option>
                  <option value="Head Coach">Head Coach</option>
                  <option value="Assistant Coach">Assistant Coach</option>
                  <option value="Athletic Trainer">Athletic Trainer</option>
                  <option value="Team Manager">Team Manager</option>
                  <option value="Recruiting Coordinator">Recruiting Coordinator</option>
                </select>
              </div>

              <div className="flex items-center gap-2 bg-black/50 p-2 rounded-2xl border border-white/10">
                <ShieldCheck className="w-4 h-4 text-slate-300" />
                <span className="text-xs font-black uppercase text-white font-mono">Status:</span>
                <select
                  value={memberStatusFilter}
                  onChange={(e) => setMemberStatusFilter(e.target.value)}
                  className="bg-[#212A31] border border-white/15 rounded-xl px-3 py-1.5 text-xs text-white focus:border-[#E5B868] focus:outline-none font-mono"
                >
                  <option value="All">All Statuses</option>
                  <option value="Certified">Certified</option>
                  <option value="Active">Active</option>
                  <option value="Pending Verification">Pending Verification</option>
                </select>
              </div>

              {selectedOrg && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#E5B868]/10 border border-[#E5B868]/30 text-[#E5B868] text-xs font-mono">
                  <span>Filtered: {selectedOrg.name}</span>
                  <button onClick={() => setSelectedOrg(null)} className="hover:text-white">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="relative min-w-[220px]">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search staff, email, team..."
                  className="w-full bg-[#212A31] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:border-[#E5B868] focus:outline-none font-mono"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              </div>

              <button
                onClick={openAddMemberModal}
                className="px-4 py-2.5 rounded-xl bg-[#E5B868] hover:bg-[#B8141B] text-black font-black uppercase tracking-wider text-xs flex items-center gap-2 shadow-[0_0_15px_rgba(214,28,36,0.4)] cursor-pointer whitespace-nowrap"
              >
                <UserPlus className="w-4 h-4 stroke-[2.5]" />
                <span>Add Member / Staff</span>
              </button>
            </div>
          </div>

          {/* DATA TABLE CONTAINER */}
          <div className="rounded-3xl bg-[#212A31] border border-white/10 overflow-hidden shadow-2xl">
            <div className="p-4 bg-black/60 border-b border-white/10 flex items-center justify-between text-xs font-mono">
              <span className="text-white font-bold flex items-center gap-2">
                <Users className="w-4 h-4 text-[#E5B868]" />
                ORGANIZATION MEMBERS & OFFICIAL STAFF MANIFEST ({filteredMembers.length} Accounts)
              </span>

              <button
                onClick={() => {
                  const header = "Name,Role,Organization,Team,Email,Phone,Status,JoinedDate\n";
                  const rows = filteredMembers.map(m => `"${m.memberName}","${m.role}","${m.orgName}","${m.assignedTeam}","${m.email}","${m.phone}","${m.status}","${m.joinedDate}"`).join("\n");
                  const blob = new Blob([header + rows], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'org_members_manifest.csv';
                  a.click();
                }}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-[#E5B868] text-slate-300 hover:text-black font-mono font-bold text-[11px] uppercase border border-white/10 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Export Member Data</span>
              </button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[220px]">Member & Avatar</TableHead>
                  <TableHead>Role Title</TableHead>
                  <TableHead>Organization / Program</TableHead>
                  <TableHead>Assigned Team / Dept</TableHead>
                  <TableHead>Contact Info</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filteredMembers.map((member) => (
                  <TableRow key={member.id} className="group">
                    <TableCell className="font-sans font-bold text-white">
                      <div className="flex items-center gap-3">
                        <img
                          src={member.photoUrl}
                          alt={member.memberName}
                          className="w-9 h-9 rounded-xl object-cover border border-[#E5B868]/50 flex-shrink-0"
                        />
                        <div>
                          <div className="flex items-center gap-1 text-sm font-black uppercase text-white group-hover:text-[#E5B868] transition-colors">
                            <span>{member.memberName}</span>
                            <VerifiedBadge size="sm" />
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">Joined {member.joinedDate}</span>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <span className="px-2.5 py-1 rounded-md bg-slate-700/10 text-slate-300 border border-cyan-500/30 text-[10px] font-black uppercase font-mono">
                        {member.role}
                      </span>
                    </TableCell>

                    <TableCell className="text-xs font-semibold text-slate-200">
                      {member.orgName}
                    </TableCell>

                    <TableCell className="text-xs font-mono text-[#E5B868]">
                      {member.assignedTeam}
                    </TableCell>

                    <TableCell className="text-[11px] font-mono text-slate-300">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3 h-3 text-[#E5B868]" />
                          <span>{member.email}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <Phone className="w-3 h-3 text-slate-300" />
                          <span>{member.phone}</span>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider font-mono border inline-flex items-center gap-1 ${
                        member.status === 'Certified'
                          ? 'bg-red-600/20 text-red-500 border-red-600/40'
                          : member.status === 'Active'
                          ? 'bg-[#E5B868]/20 text-slate-300 border-[#E5B868]/40'
                          : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                      }`}>
                        {member.status === 'Certified' && <CheckCircle2 className="w-3 h-3" />}
                        {member.status === 'Active' && <BadgeCheck className="w-3 h-3" />}
                        {member.status === 'Pending Verification' && <Clock className="w-3 h-3" />}
                        <span>{member.status}</span>
                      </span>
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditMemberModal(member)}
                          className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white transition-all cursor-pointer"
                          title="Edit Staff Member"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleToggleMemberStatus(member.id)}
                          className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-[#E5B868] text-slate-200 hover:text-black font-mono font-bold text-[10px] uppercase tracking-wider transition-all border border-white/10 cursor-pointer"
                        >
                          Status
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>

              <TableCaption>
                Official Just1Play Organization Member Directory • {filteredMembers.length} total staff records.
              </TableCaption>
            </Table>
          </div>
        </div>
      )}

      {/* --- TAB 4: VERIFIED ROSTERS --- */}
      {activeTab === 'rosters' && (
        <div className="space-y-6">
          {/* Team Selector Header */}
          <div className="p-6 rounded-3xl bg-[#212A31] border border-[#E5B868]/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-slate-400 uppercase font-bold">Selected Team:</span>
                <select
                  value={selectedTeam?.id || ''}
                  onChange={(e) => {
                    const found = teams.find(t => t.id === e.target.value);
                    if (found) setSelectedTeam(found);
                  }}
                  className="bg-[#212A31] border border-[#E5B868]/40 text-[#E5B868] text-sm font-black rounded-xl px-3 py-1.5 focus:outline-none"
                >
                  {teams.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.teamName} ({t.sport} - {t.ageGroup})
                    </option>
                  ))}
                </select>
              </div>

              {selectedTeam && (
                <div className="pt-2">
                  <h2 className="text-2xl font-black uppercase text-white flex items-center gap-2">
                    <span>{selectedTeam.teamName}</span>
                    <VerifiedBadge size="md" />
                  </h2>
                  <p className="text-xs text-slate-400 font-mono">
                    Org: {selectedTeam.orgName} | Coach: {selectedTeam.coachName} {selectedTeam.coachPhone ? `(${selectedTeam.coachPhone})` : ''}
                  </p>
                </div>
              )}
            </div>

            {selectedTeam && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => openEditTeamModal(selectedTeam)}
                  className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer border border-white/15"
                >
                  <Edit className="w-3.5 h-3.5 text-slate-300" />
                  <span>Edit Team Info</span>
                </button>

                <button
                  onClick={() => setShowQrModal(true)}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-black uppercase text-xs flex items-center gap-2 cursor-pointer border border-white/15"
                >
                  <QrCode className="w-4 h-4 text-[#E5B868]" />
                  <span>Team QR Pass</span>
                </button>

                <button
                  onClick={openAddPlayerModal}
                  className="px-4 py-2 rounded-xl bg-[#E5B868] text-black font-black uppercase text-xs flex items-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(214,28,36,0.4)]"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Add Athlete to Roster</span>
                </button>
              </div>
            )}
          </div>

          {/* Roster Data Table */}
          {selectedTeam && (
            <div className="rounded-3xl bg-[#212A31] border border-white/10 overflow-hidden shadow-2xl">
              <div className="p-4 bg-black/60 border-b border-white/10 flex items-center justify-between text-xs font-mono">
                <span className="text-white font-bold flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#E5B868]" />
                  VERIFIED TEAM ROSTER MANIFEST ({selectedTeamRoster.length} / {selectedTeam.maxRosterLimit} Athletes)
                </span>
                <span className="text-red-500 font-bold">100% Eligible</span>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">#</TableHead>
                    <TableHead>Athlete Name</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Grad Class</TableHead>
                    <TableHead>GPA</TableHead>
                    <TableHead>Ht / Wt</TableHead>
                    <TableHead>Check-In Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {selectedTeamRoster.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-slate-400 font-mono text-xs">
                        No athletes added to this team roster yet. Click "Add Athlete to Roster" above to get started!
                      </TableCell>
                    </TableRow>
                  ) : (
                    selectedTeamRoster.map((player) => (
                      <TableRow key={player.id}>
                        <TableCell className="font-bold text-[#E5B868] font-mono">{player.jerseyNumber}</TableCell>
                        <TableCell className="font-bold text-white font-sans">
                          <div className="flex items-center gap-2">
                            <img
                              src={player.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                              alt={player.athleteName}
                              className="w-7 h-7 rounded-full object-cover border border-[#E5B868]"
                            />
                            <span>{player.athleteName}</span>
                            {player.isVerified && <VerifiedBadge size="sm" />}
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-300 text-xs">{player.position}</TableCell>
                        <TableCell className="text-slate-300 font-mono text-xs">'{player.gradYear}</TableCell>
                        <TableCell className="text-amber-300 font-bold font-mono text-xs">{player.gpa}</TableCell>
                        <TableCell className="text-slate-400 font-mono text-xs">{player.heightWeight || '—'}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            player.checkInStatus === 'Checked In'
                              ? 'bg-red-600/20 text-red-500 border border-red-600/40'
                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                          }`}>
                            {player.checkInStatus}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openEditPlayerModal(player)}
                              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white transition-all cursor-pointer"
                              title="Edit Athlete Info"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleToggleVerification(player.id)}
                              className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                                player.isVerified
                                  ? 'bg-[#E5B868] text-black shadow-[0_0_10px_rgba(214,28,36,0.4)]'
                                  : 'bg-white/10 text-slate-300 hover:bg-white/20'
                              }`}
                            >
                              {player.isVerified ? '✓ VERIFIED' : 'VERIFY'}
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}

      {/* --- ADD / EDIT TEAM MODAL --- */}
      <AnimatePresence>
        {(isAddTeamModalOpen || editingTeam) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#212A31] border border-[#E5B868]/40 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="text-sm font-black uppercase text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#E5B868]" />
                  <span>{editingTeam ? 'Edit Team Details' : 'Add New Team to Directory'}</span>
                </h3>
                <button
                  onClick={() => {
                    setIsAddTeamModalOpen(false);
                    setEditingTeam(null);
                  }}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={editingTeam ? handleUpdateTeam : handleCreateTeam} className="space-y-3 text-xs">
                {!editingTeam && (
                  <div>
                    <label className="text-slate-300 font-bold block mb-1">Parent Organization</label>
                    <select
                      value={targetOrgId}
                      onChange={(e) => setTargetOrgId(e.target.value)}
                      className="w-full bg-black/60 border border-white/15 rounded-xl px-3.5 py-2 text-white focus:border-[#E5B868] focus:outline-none"
                    >
                      {organizations.map(o => (
                        <option key={o.id} value={o.id}>{o.name} ({o.type})</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="text-slate-300 font-bold block mb-1">Team Name</label>
                  <input
                    type="text"
                    required
                    value={teamFormName}
                    onChange={(e) => setTeamFormName(e.target.value)}
                    placeholder="e.g. West Orange Varsity Girls Flag"
                    className="w-full bg-black/60 border border-white/15 rounded-xl px-3.5 py-2 text-white focus:border-[#E5B868] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-300 font-bold block mb-1">Sport</label>
                    <select
                      value={teamFormSport}
                      onChange={(e) => setTeamFormSport(e.target.value)}
                      className="w-full bg-black/60 border border-white/15 rounded-xl px-3.5 py-2 text-white focus:border-[#E5B868] focus:outline-none"
                    >
                      <option value="Flag Football">Flag Football</option>
                      <option value="Basketball">Basketball</option>
                      <option value="Football">Football</option>
                      <option value="Track & Field">Track & Field</option>
                      <option value="Lacrosse">Lacrosse</option>
                      <option value="Soccer">Soccer</option>
                      <option value="Baseball">Baseball</option>
                      <option value="Softball">Softball</option>
                      <option value="Volleyball">Volleyball</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-300 font-bold block mb-1">Age / Level Group</label>
                    <input
                      type="text"
                      value={teamFormAgeGroup}
                      onChange={(e) => setTeamFormAgeGroup(e.target.value)}
                      placeholder="e.g. Varsity Girls, 17U EYBL"
                      className="w-full bg-black/60 border border-white/15 rounded-xl px-3.5 py-2 text-white focus:border-[#E5B868] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-300 font-bold block mb-1">Head Coach Name</label>
                    <input
                      type="text"
                      value={teamFormCoach}
                      onChange={(e) => setTeamFormCoach(e.target.value)}
                      placeholder="Coach Name"
                      className="w-full bg-black/60 border border-white/15 rounded-xl px-3.5 py-2 text-white focus:border-[#E5B868] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-slate-300 font-bold block mb-1">Coach Phone</label>
                    <input
                      type="text"
                      value={teamFormCoachPhone}
                      onChange={(e) => setTeamFormCoachPhone(e.target.value)}
                      placeholder="(973) 555-0192"
                      className="w-full bg-black/60 border border-white/15 rounded-xl px-3.5 py-2 text-white focus:border-[#E5B868] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-300 font-bold block mb-1">Season Record</label>
                    <input
                      type="text"
                      value={teamFormRecord}
                      onChange={(e) => setTeamFormRecord(e.target.value)}
                      placeholder="e.g. 12-1-0"
                      className="w-full bg-black/60 border border-white/15 rounded-xl px-3.5 py-2 text-white focus:border-[#E5B868] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-slate-300 font-bold block mb-1">Max Roster Limit</label>
                    <input
                      type="number"
                      value={teamFormMaxRoster}
                      onChange={(e) => setTeamFormMaxRoster(parseInt(e.target.value) || 25)}
                      className="w-full bg-black/60 border border-white/15 rounded-xl px-3.5 py-2 text-white focus:border-[#E5B868] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between gap-3">
                  {editingTeam && (
                    <button
                      type="button"
                      onClick={() => handleDeleteTeam(editingTeam.id)}
                      className="px-4 py-3 rounded-xl bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete</span>
                    </button>
                  )}

                  <button
                    type="submit"
                    className="flex-1 py-3 rounded-xl bg-[#E5B868] text-black font-black uppercase tracking-wider text-xs shadow-[0_0_20px_rgba(214,28,36,0.5)] cursor-pointer"
                  >
                    {editingTeam ? 'Save Team Updates' : 'Confirm & Register Team'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- ADD / EDIT PLAYER MODAL --- */}
      <AnimatePresence>
        {(isAddPlayerModalOpen || editingPlayer) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#212A31] border border-[#E5B868]/40 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="text-sm font-black uppercase text-white flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-[#E5B868]" />
                  <span>{editingPlayer ? 'Edit Athlete Roster Info' : 'Add Athlete to Team Roster'}</span>
                </h3>
                <button
                  onClick={() => {
                    setIsAddPlayerModalOpen(false);
                    setEditingPlayer(null);
                  }}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={editingPlayer ? handleUpdatePlayer : handleCreatePlayer} className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-300 font-bold block mb-1">Full Athlete Name</label>
                  <input
                    type="text"
                    required
                    value={playerFormName}
                    onChange={(e) => setPlayerFormName(e.target.value)}
                    placeholder="e.g. Maya Sanchez"
                    className="w-full bg-black/60 border border-white/15 rounded-xl px-3.5 py-2 text-white focus:border-[#E5B868] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-300 font-bold block mb-1">Jersey #</label>
                    <input
                      type="text"
                      value={playerFormJersey}
                      onChange={(e) => setPlayerFormJersey(e.target.value)}
                      placeholder="e.g. 12"
                      className="w-full bg-black/60 border border-white/15 rounded-xl px-3.5 py-2 text-white focus:border-[#E5B868] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-slate-300 font-bold block mb-1">Position</label>
                    <input
                      type="text"
                      value={playerFormPosition}
                      onChange={(e) => setPlayerFormPosition(e.target.value)}
                      placeholder="e.g. Quarterback"
                      className="w-full bg-black/60 border border-white/15 rounded-xl px-3.5 py-2 text-white focus:border-[#E5B868] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-300 font-bold block mb-1">Grad Year</label>
                    <select
                      value={playerFormGradYear}
                      onChange={(e) => setPlayerFormGradYear(e.target.value)}
                      className="w-full bg-black/60 border border-white/15 rounded-xl px-3.5 py-2 text-white focus:border-[#E5B868] focus:outline-none"
                    >
                      <option value="2025">2025</option>
                      <option value="2026">2026</option>
                      <option value="2027">2027</option>
                      <option value="2028">2028</option>
                      <option value="2029">2029</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-300 font-bold block mb-1">GPA</label>
                    <input
                      type="text"
                      value={playerFormGPA}
                      onChange={(e) => setPlayerFormGPA(e.target.value)}
                      placeholder="e.g. 3.8"
                      className="w-full bg-black/60 border border-white/15 rounded-xl px-3.5 py-2 text-white focus:border-[#E5B868] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-300 font-bold block mb-1">Height / Weight</label>
                  <input
                    type="text"
                    value={playerFormHeightWeight}
                    onChange={(e) => setPlayerFormHeightWeight(e.target.value)}
                    placeholder="e.g. 5'8&quot; / 140 lbs"
                    className="w-full bg-black/60 border border-white/15 rounded-xl px-3.5 py-2 text-white focus:border-[#E5B868] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-300 font-bold block mb-1">Check-In Status</label>
                    <select
                      value={playerFormCheckInStatus}
                      onChange={(e) => setPlayerFormCheckInStatus(e.target.value as any)}
                      className="w-full bg-black/60 border border-white/15 rounded-xl px-3.5 py-2 text-white focus:border-[#E5B868] focus:outline-none"
                    >
                      <option value="Checked In">Checked In</option>
                      <option value="Pending">Pending</option>
                      <option value="Flagged">Flagged</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2 pt-5">
                    <input
                      type="checkbox"
                      id="verifiedCheck"
                      checked={playerFormIsVerified}
                      onChange={(e) => setPlayerFormIsVerified(e.target.checked)}
                      className="w-4 h-4 accent-[#E5B868] rounded"
                    />
                    <label htmlFor="verifiedCheck" className="text-xs text-white font-bold cursor-pointer">
                      Verified Pass
                    </label>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between gap-3">
                  {editingPlayer && (
                    <button
                      type="button"
                      onClick={() => handleDeletePlayer(editingPlayer.id)}
                      className="px-4 py-3 rounded-xl bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete</span>
                    </button>
                  )}

                  <button
                    type="submit"
                    className="flex-1 py-3 rounded-xl bg-[#E5B868] text-black font-black uppercase tracking-wider text-xs shadow-[0_0_20px_rgba(214,28,36,0.5)] cursor-pointer"
                  >
                    {editingPlayer ? 'Save Player Updates' : 'Add to Team Roster'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- ADD / EDIT MEMBER MODAL --- */}
      <AnimatePresence>
        {(isAddMemberModalOpen || editingMember) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#212A31] border border-[#E5B868]/40 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="text-sm font-black uppercase text-white flex items-center gap-2 font-sans">
                  <UserPlus className="w-4 h-4 text-[#E5B868]" />
                  <span>{editingMember ? 'Edit Staff Member' : 'Add Member or Staff to Organization'}</span>
                </h3>
                <button
                  onClick={() => {
                    setIsAddMemberModalOpen(false);
                    setEditingMember(null);
                  }}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={editingMember ? handleUpdateMember : handleCreateMember} className="space-y-3 text-xs font-mono">
                <div>
                  <label className="text-slate-300 font-bold block mb-1">Full Member Name</label>
                  <input
                    type="text"
                    required
                    value={memberFormName}
                    onChange={(e) => setMemberFormName(e.target.value)}
                    placeholder="e.g. Coach Sarah Miller"
                    className="w-full bg-black/60 border border-white/15 rounded-xl px-3.5 py-2 text-white focus:border-[#E5B868] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-300 font-bold block mb-1">Role Title</label>
                    <select
                      value={memberFormRole}
                      onChange={(e) => setMemberFormRole(e.target.value as OrganizationMember['role'])}
                      className="w-full bg-black/60 border border-white/15 rounded-xl px-3.5 py-2 text-white focus:border-[#E5B868] focus:outline-none"
                    >
                      <option value="Athletic Director">Athletic Director</option>
                      <option value="Head Coach">Head Coach</option>
                      <option value="Assistant Coach">Assistant Coach</option>
                      <option value="Athletic Trainer">Athletic Trainer</option>
                      <option value="Team Manager">Team Manager</option>
                      <option value="Recruiting Coordinator">Recruiting Coordinator</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-300 font-bold block mb-1">Assigned Team / Dept</label>
                    <input
                      type="text"
                      value={memberFormAssignedTeam}
                      onChange={(e) => setMemberFormAssignedTeam(e.target.value)}
                      placeholder="e.g. Varsity Girls Flag"
                      className="w-full bg-black/60 border border-white/15 rounded-xl px-3.5 py-2 text-white focus:border-[#E5B868] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-300 font-bold block mb-1">Email Address</label>
                    <input
                      type="email"
                      value={memberFormEmail}
                      onChange={(e) => setMemberFormEmail(e.target.value)}
                      placeholder="coach@school.edu"
                      className="w-full bg-black/60 border border-white/15 rounded-xl px-3.5 py-2 text-white focus:border-[#E5B868] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-slate-300 font-bold block mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={memberFormPhone}
                      onChange={(e) => setMemberFormPhone(e.target.value)}
                      placeholder="(973) 555-0192"
                      className="w-full bg-black/60 border border-white/15 rounded-xl px-3.5 py-2 text-white focus:border-[#E5B868] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-300 font-bold block mb-1">Certification Status</label>
                  <select
                    value={memberFormStatus}
                    onChange={(e) => setMemberFormStatus(e.target.value as OrganizationMember['status'])}
                    className="w-full bg-black/60 border border-white/15 rounded-xl px-3.5 py-2 text-white focus:border-[#E5B868] focus:outline-none"
                  >
                    <option value="Certified">Certified</option>
                    <option value="Active">Active</option>
                    <option value="Pending Verification">Pending Verification</option>
                  </select>
                </div>

                <div className="pt-2 flex items-center justify-between gap-3">
                  {editingMember && (
                    <button
                      type="button"
                      onClick={() => handleDeleteMember(editingMember.id)}
                      className="px-4 py-3 rounded-xl bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete</span>
                    </button>
                  )}

                  <button
                    type="submit"
                    className="flex-1 py-3 rounded-xl bg-[#E5B868] text-black font-black uppercase tracking-wider text-xs shadow-[0_0_20px_rgba(214,28,36,0.5)] cursor-pointer"
                  >
                    {editingMember ? 'Save Staff Changes' : 'Save Member to Organization'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- ADD ORGANIZATION MODAL --- */}
      <AnimatePresence>
        {isAddOrgModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#212A31] border border-[#E5B868]/40 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="text-sm font-black uppercase text-white flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#E5B868]" />
                  <span>Register Sports Organization</span>
                </h3>
                <button onClick={() => setIsAddOrgModalOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateOrganization} className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-300 font-bold block mb-1">Organization / School Name</label>
                  <input
                    type="text"
                    required
                    value={newOrgName}
                    onChange={(e) => setNewOrgName(e.target.value)}
                    placeholder="e.g. West Orange High School Athletics"
                    className="w-full bg-black/60 border border-white/15 rounded-xl px-3.5 py-2 text-white focus:border-[#E5B868] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-300 font-bold block mb-1">Org Type</label>
                    <select
                      value={newOrgType}
                      onChange={(e) => setNewOrgType(e.target.value as OrganizationItem['type'])}
                      className="w-full bg-black/60 border border-white/15 rounded-xl px-3.5 py-2 text-white focus:border-[#E5B868] focus:outline-none"
                    >
                      <option value="High School">High School</option>
                      <option value="AAU Club">AAU Club</option>
                      <option value="Flag Football League">Flag Football League</option>
                      <option value="Prep Academy">Prep Academy</option>
                      <option value="Independent">Independent</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-300 font-bold block mb-1">Location</label>
                    <input
                      type="text"
                      value={newOrgLocation}
                      onChange={(e) => setNewOrgLocation(e.target.value)}
                      placeholder="e.g. West Orange, NJ"
                      className="w-full bg-black/60 border border-white/15 rounded-xl px-3.5 py-2 text-white focus:border-[#E5B868] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-300 font-bold block mb-1">Athletic Director / Lead Coach</label>
                  <input
                    type="text"
                    value={newOrgDirector}
                    onChange={(e) => setNewOrgDirector(e.target.value)}
                    placeholder="Director Name"
                    className="w-full bg-black/60 border border-white/15 rounded-xl px-3.5 py-2 text-white focus:border-[#E5B868] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-bold block mb-1">Program Overview / Bio</label>
                  <textarea
                    rows={3}
                    value={newOrgBio}
                    onChange={(e) => setNewOrgBio(e.target.value)}
                    placeholder="Brief description of teams, sports, and athletic achievements..."
                    className="w-full bg-black/60 border border-white/15 rounded-xl px-3.5 py-2 text-white focus:border-[#E5B868] focus:outline-none resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-[#E5B868] text-black font-black uppercase tracking-wider text-xs shadow-[0_0_20px_rgba(214,28,36,0.5)] cursor-pointer"
                >
                  Confirm & Save Organization
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- QR CODE MODAL --- */}
      <AnimatePresence>
        {showQrModal && selectedTeam && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#212A31] border border-[#E5B868]/40 rounded-3xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl"
            >
              <div className="flex justify-between items-center border-b border-white/10 pb-3">
                <span className="text-xs font-black uppercase text-white">Team Check-In Pass</span>
                <button onClick={() => setShowQrModal(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 bg-white rounded-2xl mx-auto inline-block border-4 border-[#E5B868]">
                <QrCode className="w-40 h-40 text-black mx-auto" />
              </div>

              <div>
                <h4 className="text-sm font-black text-white uppercase">{selectedTeam.teamName}</h4>
                <p className="text-xs text-[#E5B868] font-mono mt-0.5">Sanctioned QR Code Check-In Pass</p>
                <p className="text-[11px] text-slate-400 mt-2">
                  Scan at staff check-in desk for tournament eligibility verification.
                </p>
              </div>

              <button
                onClick={() => setShowQrModal(false)}
                className="w-full py-2.5 rounded-xl bg-[#E5B868] text-black font-black uppercase text-xs cursor-pointer"
              >
                Close Pass
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
