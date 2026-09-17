import React, { useState, useEffect } from 'react';
import { collection, doc, updateDoc, setDoc, query, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { firestoreCacheService } from '../../services/firestoreCacheService';
import { useAuth } from '../../context/AuthContext';
import { UserProfile, UserRole } from '../../types';
import { VerifiedBadge } from '../Common/VerifiedBadge';
import { getSportEmoji } from '../../lib/sports';
import { SportSelector } from '../Common/SportSelector';
import { isCleanSlateMode, setCleanSlateMode, getProductionData } from '../../lib/productionMode';
import { 
  Users, 
  Search, 
  Filter, 
  UserPlus, 
  ShieldCheck, 
  MoreVertical, 
  Mail, 
  KeyRound, 
  Ban, 
  CheckCircle2, 
  UserCheck, 
  X, 
  Check, 
  AlertCircle,
  Loader2,
  Lock,
  Edit3,
  Trophy,
  Medal,
  Sparkles,
  FileSpreadsheet,
  Camera,
  UserCog,
  Sliders
} from 'lucide-react';
import { AdminCsvMemberImportModal } from './AdminCsvMemberImportModal';
import { AdminEditUserModal } from './AdminEditUserModal';

export const AdminUsersPage: React.FC = () => {
  const { sendPasswordReset, toggleVerification, profile: currentAdminProfile } = useAuth();
  
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals & Action States
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [showRoleModal, setShowRoleModal] = useState<boolean>(false);
  const [newRole, setNewRole] = useState<UserRole>('athlete');
  
  // Comprehensive Admin Edit User Modal (Sport, Profile Picture, Role, Roster metadata)
  const [showEditUserModal, setShowEditUserModal] = useState<boolean>(false);
  const [userToEdit, setUserToEdit] = useState<UserProfile | null>(null);
  
  // Sport Change Modal
  const [showSportModal, setShowSportModal] = useState<boolean>(false);
  const [selectedSportUser, setSelectedSportUser] = useState<UserProfile | null>(null);
  const [targetSport, setTargetSport] = useState<string>('Basketball');

  const [showAddUserModal, setShowAddUserModal] = useState<boolean>(false);
  const [showCsvImportModal, setShowCsvImportModal] = useState<boolean>(false);
  
  // New User Form State
  const [newUserForm, setNewUserForm] = useState({
    displayName: '',
    email: '',
    role: 'athlete' as UserRole,
    sport: 'Basketball',
    position: 'Starter',
    jerseyNumber: '1',
    highSchool: 'Tri-State High School',
    gradYear: '2026',
    state: 'NJ',
    bio: '',
    isVerified: true
  });

  // Action status message toast
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setActionMessage({ text, type });
    setTimeout(() => setActionMessage(null), 4000);
  };

  // Fetch users from Firestore with local caching and bounded limits
  const fetchUsers = async (forceFresh = false) => {
    setLoading(true);
    try {
      if (!db) {
        setUsers([]);
        return;
      }
      const snap = await firestoreCacheService.getDocsCached(
        query(collection(db, 'users'), limit(100)),
        'admin_users_list',
        { 
          strategy: forceFresh ? 'server-only' : 'stale-while-revalidate',
          ttlMs: 5 * 60 * 1000 
        }
      );
      if (!snap.empty) {
        const fetchedList: UserProfile[] = [];
        snap.forEach(d => {
          fetchedList.push({ uid: d.id, ...d.data() } as UserProfile);
        });
        setUsers(fetchedList);
      } else {
        setUsers([]);
      }
    } catch (err) {
      console.warn('Error fetching Firestore users:', err);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Filter logic
  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.sport && u.sport.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesRole = 
      roleFilter === 'all' || 
      u.role === roleFilter ||
      (roleFilter === 'creator' && (u.role === 'creator' || u.role === 'content_creator')) ||
      (roleFilter === 'content_creator' && (u.role === 'creator' || u.role === 'content_creator'));
    
    const isBanned = (u as any).isBanned === true;
    const matchesStatus = 
      statusFilter === 'all' || 
      (statusFilter === 'banned' && isBanned) || 
      (statusFilter === 'active' && !isBanned);

    return matchesSearch && matchesRole && matchesStatus;
  });

  // Action: Direct Quick Role Toggle
  const handleDirectRoleToggle = async (userItem: UserProfile, targetRole: UserRole) => {
    if (userItem.role === targetRole) return;
    try {
      if (db) {
        const userRef = doc(db, 'users', userItem.uid);
        await updateDoc(userRef, { 
          role: targetRole,
          updatedAt: new Date().toISOString()
        }).catch(async () => {
          await setDoc(userRef, { role: targetRole, updatedAt: new Date().toISOString() }, { merge: true });
        });
      }
      setUsers(prev => prev.map(u => u.uid === userItem.uid ? { ...u, role: targetRole } : u));
      showToast(`Updated ${userItem.displayName} role to ${targetRole.toUpperCase()}`);
    } catch (err) {
      console.error('Direct role toggle error:', err);
      showToast('Failed to update role.', 'error');
    }
  };

  // Action: Change Role
  const handleRoleChangeSubmit = async () => {
    if (!selectedUser) return;
    try {
      const userRef = doc(db, 'users', selectedUser.uid);
      await updateDoc(userRef, { role: newRole });
      
      setUsers(prev => prev.map(u => u.uid === selectedUser.uid ? { ...u, role: newRole } : u));
      showToast(`Updated role for ${selectedUser.displayName} to ${newRole.toUpperCase()}`);
      setShowRoleModal(false);
      setSelectedUser(null);
    } catch (err) {
      console.error('Failed to update role:', err);
      showToast('Error updating role in database.', 'error');
    }
  };

  // Action: Password Reset Email
  const handleResetPassword = async (userItem: UserProfile) => {
    try {
      await sendPasswordReset(userItem.email);
      showToast(`Password reset email sent to ${userItem.email}`);
    } catch (err) {
      console.error('Reset password error:', err);
      showToast(`Failed to send reset email to ${userItem.email}. Ensure email is valid.`, 'error');
    }
  };

  // Action: Toggle Ban / Suspend
  const handleToggleBan = async (userItem: UserProfile) => {
    const currentBanned = (userItem as any).isBanned === true;
    const nextBanned = !currentBanned;
    try {
      const userRef = doc(db, 'users', userItem.uid);
      await updateDoc(userRef, { isBanned: nextBanned });

      setUsers(prev => prev.map(u => u.uid === userItem.uid ? { ...u, isBanned: nextBanned } as any : u));
      showToast(`User ${userItem.displayName} has been ${nextBanned ? 'SUSPENDED/BANNED' : 'REINSTATED'}.`);
    } catch (err) {
      console.error('Ban toggle error:', err);
      showToast('Error updating user status.', 'error');
    }
  };

  // Action: Toggle Verified Status
  const handleToggleVerify = async (userItem: UserProfile) => {
    try {
      const nextStatus = !userItem.isVerified;
      await toggleVerification(userItem.uid, nextStatus);
      setUsers(prev => prev.map(u => u.uid === userItem.uid ? { ...u, isVerified: nextStatus } : u));
      showToast(`Verification status for ${userItem.displayName} set to ${nextStatus ? 'VERIFIED' : 'UNVERIFIED'}.`);
    } catch (err) {
      console.error('Verify toggle error:', err);
      showToast('Error toggling verification.', 'error');
    }
  };

  // Action: Change Sport
  const handleSportChangeSubmit = async () => {
    if (!selectedSportUser || !targetSport.trim()) return;
    try {
      if (db) {
        try {
          const userRef = doc(db, 'users', selectedSportUser.uid);
          await updateDoc(userRef, { 
            sport: targetSport.trim(),
            updatedAt: new Date().toISOString()
          });
        } catch (dbErr) {
          console.warn('Firestore updateDoc failed, updating local state:', dbErr);
        }
      }
      
      setUsers(prev => prev.map(u => u.uid === selectedSportUser.uid ? { ...u, sport: targetSport.trim() } : u));
      showToast(`Updated primary sport for ${selectedSportUser.displayName} to ${targetSport.trim()}`);
      setShowSportModal(false);
      setSelectedSportUser(null);
    } catch (err) {
      console.error('Failed to update sport:', err);
      showToast('Error updating sport.', 'error');
    }
  };

  // Action: Add New User / Member
  const handleAddUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserForm.displayName || !newUserForm.email) return;

    try {
      const newUid = `usr-${Date.now()}`;
      const newUserDoc: UserProfile = {
        uid: newUid,
        email: newUserForm.email.trim(),
        displayName: newUserForm.displayName.trim(),
        role: newUserForm.role,
        sport: newUserForm.sport.trim() || 'Basketball',
        highSchool: newUserForm.highSchool.trim() || 'Tri-State High School',
        gradYear: newUserForm.gradYear.trim() || '2026',
        state: newUserForm.state.trim() || 'NJ',
        position: newUserForm.position.trim() || 'Athlete',
        jerseyNumber: newUserForm.jerseyNumber.trim() ? `#${newUserForm.jerseyNumber.replace('#', '')}` : '#1',
        height: "6'0\"",
        weight: '175 lbs',
        gpa: '3.5',
        bio: newUserForm.bio.trim() || `Account manually provisioned by Just1Play Admin.`,
        isVerified: newUserForm.isVerified,
        social: { instagram: '', twitter: '', tiktok: '' },
        stats: { points: 16.0, rebounds: 5.0, assists: 4.0, steals: 1.5, blocks: 0.5 },
        mediaUrls: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (db) {
        try {
          await setDoc(doc(db, 'users', newUid), newUserDoc);
        } catch (dbErr) {
          console.warn('Firestore setDoc failed, adding to local state:', dbErr);
        }
      }

      setUsers(prev => [newUserDoc, ...prev]);
      showToast(`Created new user account for ${newUserForm.displayName}`);
      setShowAddUserModal(false);
      setNewUserForm({
        displayName: '',
        email: '',
        role: 'athlete',
        sport: 'Basketball',
        position: 'Starter',
        jerseyNumber: '1',
        highSchool: 'Tri-State High School',
        gradYear: '2026',
        state: 'NJ',
        bio: '',
        isVerified: true
      });
    } catch (err) {
      console.error('Error creating user:', err);
      showToast('Error provisioning user account.', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      
      {/* Toast Alert Message */}
      {actionMessage && (
        <div className={`fixed top-24 right-6 z-50 p-4 rounded-2xl border backdrop-blur-2xl shadow-2xl flex items-center gap-3 max-w-md animate-bounceIn ${
          actionMessage.type === 'success' 
            ? 'bg-[#000000]/90 border-[#E5B868] text-white shadow-[0_0_30px_rgba(214,28,36,0.3)]' 
            : 'bg-red-950/90 border-red-500 text-white shadow-[0_0_30px_rgba(239,68,68,0.3)]'
        }`}>
          {actionMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-[#E5B868] shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          )}
          <span className="text-xs font-bold font-sans uppercase">{actionMessage.text}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-[#212A31]/90 border border-white/10 backdrop-blur-2xl">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E5B868]/10 border border-[#E5B868]/30 text-[#E5B868] text-xs font-mono font-bold uppercase tracking-widest mb-2">
            <Users className="w-3.5 h-3.5" />
            <span>User Management & Access Control</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black italic uppercase text-white font-sans tracking-tight">
            PLATFORM USER <span className="text-[#E5B868]">DATABASE</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage roles, passwords, verification badges, and account suspensions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 self-start md:self-auto">
          <button
            onClick={() => setShowCsvImportModal(true)}
            className="px-5 py-3 rounded-2xl bg-[#1E2630] hover:bg-slate-700/80 border border-[#F59E0B] text-[#F59E0B] font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.2)] transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-[#F59E0B]" />
            <span>Import Members via CSV</span>
          </button>

          <button
            onClick={() => setShowAddUserModal(true)}
            className="px-5 py-3 rounded-2xl bg-[#E5B868] hover:bg-[#B8141B] text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(214,28,36,0.4)] transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Provision New User</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-[#212A31]/90 border border-white/10 backdrop-blur-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, email, or sport..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#E5B868] font-sans transition-all"
          />
        </div>

        {/* Dropdown Filters */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          
          {/* Role Filter */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <Filter className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-300 font-bold uppercase tracking-wider focus:outline-none focus:border-[#E5B868] cursor-pointer"
            >
              <option value="all" className="bg-[#212A31]">All Roles</option>
              <option value="athlete" className="bg-[#212A31]">Athletes</option>
              <option value="coach" className="bg-[#212A31]">Coaches</option>
              <option value="creator" className="bg-[#212A31]">Creators</option>
              <option value="coordinator" className="bg-[#212A31]">Coordinators</option>
              <option value="scout" className="bg-[#212A31]">Scouts</option>
              <option value="organization" className="bg-[#212A31]">Organizations</option>
              <option value="admin" className="bg-[#212A31]">Admins</option>
            </select>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-300 font-bold uppercase tracking-wider focus:outline-none focus:border-[#E5B868] cursor-pointer"
          >
            <option value="all" className="bg-[#212A31]">All Statuses</option>
            <option value="active" className="bg-[#212A31]">Active Users</option>
            <option value="banned" className="bg-[#212A31]">Suspended Users</option>
          </select>

        </div>
      </div>

      {/* Users Data Table */}
      <div className="rounded-3xl bg-[#212A31]/90 border border-white/10 backdrop-blur-2xl overflow-hidden shadow-2xl">
        {loading ? (
          <div className="p-12 text-center text-slate-400 font-mono text-xs flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-[#E5B868] animate-spin" />
            <span>Syncing Firestore User Accounts...</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-slate-400 font-mono text-xs">
            No user accounts found matching your filter parameters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-white/5 text-[10px] font-black uppercase tracking-wider text-slate-400 font-mono">
                  <th className="py-4 px-6">User Profile</th>
                  <th className="py-4 px-6">Email Address</th>
                  <th className="py-4 px-6">Role</th>
                  <th className="py-4 px-6">Verification</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6">Sport & Year</th>
                  <th className="py-4 px-6 text-right">Admin Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs">
                {filteredUsers.map((u) => {
                  const isBanned = (u as any).isBanned === true;
                  const avatar = u.photoURL || u.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80';

                  return (
                    <tr key={u.uid} className="hover:bg-white/[0.03] transition-colors">
                      
                      {/* User Profile */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div 
                            onClick={() => {
                              setUserToEdit(u);
                              setShowEditUserModal(true);
                            }}
                            className="relative group cursor-pointer shrink-0"
                            title="Click to edit profile picture or sport"
                          >
                            <img
                              src={avatar}
                              alt={u.displayName}
                              className="w-10 h-10 rounded-full object-cover border border-white/10 group-hover:border-[#00E5FF] transition-all shadow-md"
                            />
                            <div className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-[#00E5FF]">
                              <Camera className="w-4 h-4" />
                            </div>
                          </div>
                          <div>
                            <div 
                              onClick={() => {
                                setUserToEdit(u);
                                setShowEditUserModal(true);
                              }}
                              className="font-bold text-white font-sans flex items-center gap-1.5 hover:text-[#00E5FF] cursor-pointer transition-colors"
                            >
                              <span>{u.displayName}</span>
                              {u.isVerified && <VerifiedBadge size="sm" showTooltip={false} />}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2">
                              <span>UID: {u.uid.slice(0, 8)}...</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setUserToEdit(u);
                                  setShowEditUserModal(true);
                                }}
                                className="text-[10px] text-[#00E5FF] hover:underline cursor-pointer"
                              >
                                Edit Profile
                              </button>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="py-4 px-6 font-mono text-slate-300">
                        {u.email}
                      </td>

                      {/* Role Toggle Selector */}
                      <td className="py-4 px-6">
                        <select
                          value={u.role || 'athlete'}
                          onChange={(e) => handleDirectRoleToggle(u, e.target.value as UserRole)}
                          className={`px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold uppercase border cursor-pointer focus:outline-none transition-colors ${
                            u.role === 'admin'
                              ? 'bg-purple-500/15 border-purple-500/40 text-purple-300'
                              : u.role === 'coordinator'
                              ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                              : u.role === 'creator' || u.role === 'content_creator'
                              ? 'bg-pink-500/15 border-pink-500/40 text-pink-300'
                              : u.role === 'scout'
                              ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                              : u.role === 'coach' || u.role === 'organization'
                              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                              : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                          }`}
                          title="Direct Role Toggle"
                        >
                          <option value="athlete" className="bg-[#111A26] text-white">Athlete</option>
                          <option value="coach" className="bg-[#111A26] text-white">Coach</option>
                          <option value="creator" className="bg-[#111A26] text-white">Creator</option>
                          <option value="coordinator" className="bg-[#111A26] text-white">Coordinator</option>
                          <option value="scout" className="bg-[#111A26] text-white">Scout</option>
                          <option value="organization" className="bg-[#111A26] text-white">Organization</option>
                          <option value="admin" className="bg-[#111A26] text-white">Admin</option>
                        </select>
                      </td>

                      {/* Verification Toggle */}
                      <td className="py-4 px-6">
                        <button
                          onClick={() => handleToggleVerify(u)}
                          className={`px-2.5 py-1 rounded-xl text-[10px] font-bold uppercase transition-all flex items-center gap-1 cursor-pointer ${
                            u.isVerified
                              ? 'bg-[#E5B868]/20 border border-[#E5B868]/40 text-[#E5B868]'
                              : 'bg-white/5 border border-white/10 text-slate-400 hover:text-white'
                          }`}
                        >
                          <VerifiedBadge size="sm" showTooltip={false} />
                          <span>{u.isVerified ? 'Verified' : 'Verify'}</span>
                        </button>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-6">
                        {isBanned ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase bg-red-500/15 border border-red-500/30 text-red-400">
                            <Ban className="w-3 h-3" />
                            Suspended
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase bg-red-600/15 border border-red-600/30 text-red-500">
                            <Check className="w-3 h-3" />
                            Active
                          </span>
                        )}
                      </td>

                      {/* Sport & Year */}
                      <td className="py-4 px-6 font-mono text-slate-300 text-[11px]">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedSportUser(u);
                            setTargetSport(u.sport || 'Basketball');
                            setShowSportModal(true);
                          }}
                          className="group flex items-center gap-1.5 hover:text-[#E5B868] text-left transition-colors cursor-pointer"
                          title="Click to change sport"
                        >
                          <span className="text-sm">{getSportEmoji(u.sport || 'Basketball')}</span>
                          <span className="font-bold">{u.sport || 'Basketball'}</span>
                          <Edit3 className="w-3 h-3 opacity-0 group-hover:opacity-100 text-[#E5B868] transition-opacity" />
                        </button>
                        <div className="text-[10px] text-slate-500 mt-0.5">Grad: {u.gradYear || '2026'}</div>
                      </td>

                      {/* Admin Actions */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          
                          {/* Comprehensive Edit Member Button (Photo, Sport, Role, Roster) */}
                          <button
                            onClick={() => {
                              setUserToEdit(u);
                              setShowEditUserModal(true);
                            }}
                            title="Edit User Profile Picture, Sport, Role & Bio"
                            className="px-2.5 py-1.5 rounded-xl bg-[#00E5FF]/10 hover:bg-[#00E5FF]/25 border border-[#00E5FF]/30 hover:border-[#00E5FF] text-[#00E5FF] font-mono text-[11px] font-bold flex items-center gap-1.5 shadow-[0_0_10px_rgba(0,229,255,0.15)] transition-all cursor-pointer"
                          >
                            <UserCog className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Edit</span>
                          </button>

                          {/* Change Sport Button */}
                          <button
                            onClick={() => {
                              setSelectedSportUser(u);
                              setTargetSport(u.sport || 'Basketball');
                              setShowSportModal(true);
                            }}
                            title="Change Member Sport (Football, Basketball, Soccer, etc.)"
                            className="p-2 rounded-xl bg-white/5 hover:bg-[#E5B868]/20 border border-white/10 hover:border-[#E5B868]/40 text-slate-300 hover:text-[#E5B868] transition-all cursor-pointer"
                          >
                            <Trophy className="w-3.5 h-3.5" />
                          </button>

                          {/* Change Role Button */}
                          <button
                            onClick={() => {
                              setSelectedUser(u);
                              setNewRole(u.role || 'athlete');
                              setShowRoleModal(true);
                            }}
                            title="Change User Role"
                            className="p-2 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-slate-300 hover:text-white transition-all cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* Reset Password Button */}
                          <button
                            onClick={() => handleResetPassword(u)}
                            title="Send Password Reset Email"
                            className="p-2 rounded-xl bg-white/5 hover:bg-[#E5B868]/20 border border-white/10 text-slate-300 hover:text-slate-300 transition-all cursor-pointer"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>

                          {/* Suspend / Reinstated Button */}
                          <button
                            onClick={() => handleToggleBan(u)}
                            title={isBanned ? 'Reinstate User' : 'Suspend User'}
                            className={`p-2 rounded-xl border transition-all cursor-pointer ${
                              isBanned
                                ? 'bg-red-600/20 border-red-600/40 text-red-500 hover:bg-red-600/30'
                                : 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
                            }`}
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>

                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CHANGE SPORT MODAL */}
      {showSportModal && selectedSportUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-lg p-6 rounded-3xl bg-[#212A31] border border-white/15 shadow-2xl space-y-6">
            
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#E5B868]/20 text-[#E5B868] border border-[#E5B868]/30">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black italic uppercase text-white font-sans">
                    CHANGE MEMBER SPORT
                  </h3>
                  <p className="text-xs text-slate-400">
                    Switch primary sport category or enter custom sport.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowSportModal(false);
                  setSelectedSportUser(null);
                }}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
              <div className="text-xs text-slate-400">Target Member:</div>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <span>{selectedSportUser.displayName}</span>
                <span className="text-xs px-2 py-0.5 rounded bg-white/10 font-mono text-slate-300">
                  {selectedSportUser.role}
                </span>
              </div>
              <div className="text-xs font-mono text-slate-400 flex items-center gap-2 pt-1">
                <span>Current Sport:</span>
                <span className="text-[#E5B868] font-bold">
                  {getSportEmoji(selectedSportUser.sport || 'Basketball')} {selectedSportUser.sport || 'Basketball'}
                </span>
              </div>
            </div>

            {/* Quick Select Preset Sports */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 font-mono block">
                Quick Select Popular Sports:
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  'Football',
                  'Basketball',
                  'Soccer',
                  'Baseball',
                  'Softball',
                  'Volleyball',
                  'Track & Field',
                  'Cheerleading',
                  'Lacrosse',
                  "Girls' Flag Football",
                  'Flag Football',
                  'Tennis',
                  'Swimming & Diving',
                  'Wrestling',
                  'Gymnastics',
                  'Golf',
                  'Ice Hockey',
                  'Martial Arts / MMA'
                ].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setTargetSport(s)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                      targetSport === s
                        ? 'bg-[#E5B868] text-black font-black shadow-[0_0_12px_rgba(214,28,36,0.5)]'
                        : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
                    }`}
                  >
                    <span>{getSportEmoji(s)}</span>
                    <span>{s}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Full SportSelector with Custom Typing */}
            <div className="pt-2 border-t border-white/10">
              <SportSelector
                label="Or Search All Sports / Type Custom Sport:"
                value={targetSport}
                onChange={(sp) => setTargetSport(sp)}
                allowCustom={true}
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowSportModal(false);
                  setSelectedSportUser(null);
                }}
                className="flex-1 py-3 rounded-xl bg-white/10 text-slate-300 font-bold text-xs uppercase hover:bg-white/20 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSportChangeSubmit}
                className="flex-1 py-3 rounded-xl bg-[#E5B868] text-black font-black text-xs uppercase hover:bg-[#B8141B] shadow-[0_0_15px_rgba(214,28,36,0.4)] transition-all cursor-pointer"
              >
                Update Sport
              </button>
            </div>

          </div>
        </div>
      )}

      {/* CHANGE ROLE MODAL */}
      {showRoleModal && selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-md p-6 rounded-3xl bg-[#212A31] border border-white/15 shadow-2xl space-y-6">
            
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-[#E5B868]" />
                <h3 className="text-lg font-black italic uppercase text-white font-sans">
                  CHANGE ROLE ASSIGNMENT
                </h3>
              </div>
              <button
                onClick={() => setShowRoleModal(false)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
              <div className="text-xs text-slate-400">Target User:</div>
              <div className="text-sm font-bold text-white">{selectedUser.displayName}</div>
              <div className="text-xs font-mono text-slate-400">{selectedUser.email}</div>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
                Select New Permission Level:
              </label>

              {(['athlete', 'coach', 'creator', 'coordinator', 'scout', 'organization', 'admin'] as UserRole[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setNewRole(r)}
                  className={`w-full p-3.5 rounded-2xl border text-left font-sans transition-all flex items-center justify-between cursor-pointer ${
                    newRole === r
                      ? 'bg-[#E5B868]/15 border-[#E5B868] text-white shadow-[0_0_15px_rgba(214,28,36,0.3)]'
                      : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <div className="font-bold text-xs uppercase tracking-wider">
                    {r.replace('_', ' ')}
                  </div>
                  {newRole === r && <Check className="w-4 h-4 text-[#E5B868]" />}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowRoleModal(false)}
                className="flex-1 py-3 rounded-xl bg-white/10 text-slate-300 font-bold text-xs uppercase hover:bg-white/20 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRoleChangeSubmit}
                className="flex-1 py-3 rounded-xl bg-[#E5B868] text-black font-black text-xs uppercase hover:bg-[#B8141B] shadow-[0_0_15px_rgba(214,28,36,0.4)] transition-all cursor-pointer"
              >
                Save Permission
              </button>
            </div>

          </div>
        </div>
      )}

      {/* PROVISION / MANUALLY ADD MEMBER MODAL */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <form onSubmit={handleAddUserSubmit} className="w-full max-w-xl p-6 sm:p-8 rounded-3xl bg-[#212A31] border border-white/15 shadow-2xl space-y-5 my-8 text-white">
            
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-[#E5B868]/20 text-[#E5B868] border border-[#E5B868]/30">
                  <UserPlus className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black italic uppercase text-white font-sans">
                    MANUALLY ADD MEMBER
                  </h3>
                  <p className="text-xs text-slate-400">
                    Provision an athlete, coach, scout, or admin with full sports & roster metadata.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddUserModal(false)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold uppercase text-slate-400 font-mono mb-1 block">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Marcus Carter"
                    value={newUserForm.displayName}
                    onChange={e => setNewUserForm({ ...newUserForm, displayName: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-[#E5B868]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase text-slate-400 font-mono mb-1 block">Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="marcus@example.com"
                    value={newUserForm.email}
                    onChange={e => setNewUserForm({ ...newUserForm, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-[#E5B868]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold uppercase text-slate-400 font-mono mb-1 block">Account Role</label>
                  <select
                    value={newUserForm.role}
                    onChange={e => setNewUserForm({ ...newUserForm, role: e.target.value as UserRole })}
                    className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-[#E5B868] cursor-pointer"
                  >
                    <option value="athlete" className="bg-[#212A31]">Athlete</option>
                    <option value="coach" className="bg-[#212A31]">Coach</option>
                    <option value="scout" className="bg-[#212A31]">Scout / Recruiter</option>
                    <option value="organization" className="bg-[#212A31]">Tournament Director / Organization</option>
                    <option value="content_creator" className="bg-[#212A31]">Content Creator / Media</option>
                    <option value="admin" className="bg-[#212A31]">System Admin</option>
                  </select>
                </div>

                <div>
                  <SportSelector
                    label="Primary Sport (All Sports & Custom Type)"
                    value={newUserForm.sport}
                    onChange={(sp) => setNewUserForm({ ...newUserForm, sport: sp })}
                    allowCustom={true}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold uppercase text-slate-400 font-mono mb-1 block">Position / Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Point Guard, QB, Head Coach"
                    value={newUserForm.position}
                    onChange={e => setNewUserForm({ ...newUserForm, position: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-[#E5B868]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase text-slate-400 font-mono mb-1 block">Jersey # / Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 23"
                    value={newUserForm.jerseyNumber}
                    onChange={e => setNewUserForm({ ...newUserForm, jerseyNumber: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-[#E5B868]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase text-slate-400 font-mono mb-1 block">State / Region</label>
                  <input
                    type="text"
                    placeholder="e.g. NJ, NY, TX, FL"
                    value={newUserForm.state}
                    onChange={e => setNewUserForm({ ...newUserForm, state: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-[#E5B868]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold uppercase text-slate-400 font-mono mb-1 block">High School / Club Org</label>
                  <input
                    type="text"
                    placeholder="e.g. St. Benedict's Prep"
                    value={newUserForm.highSchool}
                    onChange={e => setNewUserForm({ ...newUserForm, highSchool: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-[#E5B868]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase text-slate-400 font-mono mb-1 block">Graduation Class</label>
                  <input
                    type="text"
                    placeholder="e.g. 2026, 2027"
                    value={newUserForm.gradYear}
                    onChange={e => setNewUserForm({ ...newUserForm, gradYear: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-[#E5B868]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase text-slate-400 font-mono mb-1 block">Bio / Admin Notes (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Scouting evaluations, verified accolades, or administrative notes..."
                  value={newUserForm.bio}
                  onChange={e => setNewUserForm({ ...newUserForm, bio: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-[#E5B868]"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="verified-checkbox"
                  checked={newUserForm.isVerified}
                  onChange={e => setNewUserForm({ ...newUserForm, isVerified: e.target.checked })}
                  className="rounded border-white/20 bg-white/5 text-[#E5B868] focus:ring-[#E5B868] cursor-pointer"
                />
                <label htmlFor="verified-checkbox" className="text-xs text-slate-300 font-medium cursor-pointer flex items-center gap-1.5">
                  <VerifiedBadge size="sm" showTooltip={false} />
                  <span>Grant Verified Prospect Badge immediately</span>
                </label>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowAddUserModal(false)}
                className="flex-1 py-3 rounded-xl bg-white/10 text-slate-300 font-bold text-xs uppercase hover:bg-white/20 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-3 rounded-xl bg-[#E5B868] text-black font-black text-xs uppercase hover:bg-[#B8141B] shadow-[0_0_15px_rgba(214,28,36,0.4)] transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                <span>Create Member Account</span>
              </button>
            </div>

          </form>
        </div>
      )}

      {/* CSV Member Ingestion Modal */}
      <AdminCsvMemberImportModal
        isOpen={showCsvImportModal}
        onClose={() => setShowCsvImportModal(false)}
        onImportComplete={(summary) => {
          fetchUsers(true);
          showToast(`Successfully imported ${summary.importedCount} members from CSV.`);
        }}
      />

      {/* Admin Edit User Modal (Sport, Profile Picture, Role & Roster Metadata) */}
      {showEditUserModal && userToEdit && (
        <AdminEditUserModal
          isOpen={showEditUserModal}
          user={userToEdit}
          onClose={() => {
            setShowEditUserModal(false);
            setUserToEdit(null);
          }}
          onUserUpdated={(updatedUser) => {
            setUsers(prev => prev.map(u => u.uid === updatedUser.uid ? updatedUser : u));
            showToast(`Updated ${updatedUser.displayName}'s sport, profile picture, and role.`);
          }}
        />
      )}

    </div>
  );
};

export default AdminUsersPage;
