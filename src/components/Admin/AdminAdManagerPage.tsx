import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  PauseCircle, 
  Play, 
  Eye, 
  MousePointer, 
  DollarSign, 
  TrendingUp, 
  Filter, 
  RefreshCw, 
  Search, 
  ExternalLink,
  Target,
  Sparkles,
  Calendar,
  Tag,
  Shuffle,
  Images,
  Trash2
} from 'lucide-react';
import { AdCampaign } from '../../types/ad';
import { adService, getAdScheduleStatus } from '../../services/adService';
import { AdVisualPlacementPreviewModal } from './AdVisualPlacementPreviewModal';
import { AdPerformanceChart } from './AdPerformanceChart';
import { compressImage } from '../../lib/imageCompressor';

export const AdminAdManagerPage: React.FC = () => {
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New Ad Form State
  const [newBrand, setNewBrand] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newHeadline, setNewHeadline] = useState('');
  const [newSubheadline, setNewSubheadline] = useState('');
  const [newCta, setNewCta] = useState('LEARN MORE');
  const [newUrl, setNewUrl] = useState('https://');
  const [newImage, setNewImage] = useState('https://images.unsplash.com/photo-1517649763962-0c623266010b?w=800&auto=format&fit=crop&q=80');
  const [newAdditionalImages, setNewAdditionalImages] = useState<string[]>([]);
  const [newEnableRandomRotation, setNewEnableRandomRotation] = useState<boolean>(true);
  const [newPosition, setNewPosition] = useState<any>('header-leaderboard');
  const [newBudget, setNewBudget] = useState(500);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]);

  // Edit Modal State
  const [editingAd, setEditingAd] = useState<AdCampaign | null>(null);

  // Visual Preview Modal State
  const [previewAd, setPreviewAd] = useState<Partial<AdCampaign> | null>(null);

  const fetchCampaigns = async () => {
    setLoading(true);
    const list = await adService.getAllCampaigns();
    setCampaigns(list);
    setLoading(false);
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, isEdit = false) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file, { maxWidth: 1400, maxHeight: 800, quality: 0.82 });
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        if (isEdit && editingAd) {
          setEditingAd({ ...editingAd, imageUrl: result });
        } else {
          setNewImage(result);
        }
      };
      reader.readAsDataURL(compressed);
    } catch (err) {
      console.warn('Image compression fallback:', err);
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        if (isEdit && editingAd) {
          setEditingAd({ ...editingAd, imageUrl: result });
        } else {
          setNewImage(result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAdditionalFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, isEdit = false) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    for (const file of files) {
      try {
        const compressed = await compressImage(file, { maxWidth: 1400, maxHeight: 800, quality: 0.82 });
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          if (isEdit) {
            setEditingAd((prev) => prev ? {
              ...prev,
              additionalImages: [...(prev.additionalImages || []), result]
            } : null);
          } else {
            setNewAdditionalImages((prev) => [...prev, result]);
          }
        };
        reader.readAsDataURL(compressed);
      } catch (err) {
        console.warn('Additional image compression fallback:', err);
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          if (isEdit) {
            setEditingAd((prev) => prev ? {
              ...prev,
              additionalImages: [...(prev.additionalImages || []), result]
            } : null);
          } else {
            setNewAdditionalImages((prev) => [...prev, result]);
          }
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const removeAdditionalImage = (index: number, isEdit = false) => {
    if (isEdit && editingAd) {
      setEditingAd({
        ...editingAd,
        additionalImages: (editingAd.additionalImages || []).filter((_, i) => i !== index)
      });
    } else {
      setNewAdditionalImages(prev => prev.filter((_, i) => i !== index));
    }
  };

  const applyQuickPreset = (days: number, isEdit = false) => {
    const start = new Date();
    const end = new Date(start.getTime() + days * 86400000);
    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];

    if (isEdit && editingAd) {
      setEditingAd({ ...editingAd, startDate: startStr, endDate: endStr });
    } else {
      setStartDate(startStr);
      setEndDate(endStr);
    }
  };

  const handleStatusChange = async (id: string, status: AdCampaign['status']) => {
    await adService.updateCampaignStatus(id, status);
    fetchCampaigns();
  };

  const handleCreateAd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBrand || !newHeadline) return;

    await adService.submitCampaign({
      brandName: newBrand,
      contactEmail: newEmail || 'admin@just1play.com',
      websiteUrl: newUrl,
      headline: newHeadline,
      subheadline: newSubheadline,
      ctaText: newCta || 'LEARN MORE',
      imageUrl: newImage,
      additionalImages: newAdditionalImages,
      enableRandomRotation: newEnableRandomRotation,
      placementPosition: newPosition,
      format: newPosition.includes('sidebar') ? 'rectangle' : 'leaderboard',
      status: 'active',
      startDate: startDate,
      endDate: endDate,
      budget: Number(newBudget),
      tier: 'Custom'
    });

    setShowCreateModal(false);
    setNewBrand('');
    setNewHeadline('');
    setNewSubheadline('');
    setNewAdditionalImages([]);
    setNewEnableRandomRotation(true);
    fetchCampaigns();
  };

  const handleSaveEditedAd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAd) return;

    try {
      await adService.submitCampaign({
        brandName: editingAd.brandName,
        contactEmail: editingAd.contactEmail,
        websiteUrl: editingAd.websiteUrl,
        headline: editingAd.headline,
        subheadline: editingAd.subheadline,
        ctaText: editingAd.ctaText,
        imageUrl: editingAd.imageUrl,
        additionalImages: editingAd.additionalImages || [],
        enableRandomRotation: editingAd.enableRandomRotation ?? false,
        placementPosition: editingAd.placementPosition,
        format: editingAd.format,
        status: editingAd.status,
        startDate: editingAd.startDate,
        endDate: editingAd.endDate,
        budget: editingAd.budget,
        tier: editingAd.tier
      });
      setEditingAd(null);
      fetchCampaigns();
    } catch (err) {
      console.error('Failed to update ad campaign:', err);
    }
  };

  // Metrics
  const totalRevenue = campaigns.filter(c => c.status === 'active' || c.status === 'completed').reduce((sum, c) => sum + (c.budget || 0), 0);
  const totalImpressions = campaigns.reduce((sum, c) => sum + (c.impressions || 0), 0);
  const totalClicks = campaigns.reduce((sum, c) => sum + (c.clicks || 0), 0);
  const avgCtr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : '0.00';

  const filtered = campaigns.filter(c => {
    const matchesStatus = filterStatus === 'all' || c.status === filterStatus;
    const matchesSearch = c.brandName.toLowerCase().includes(searchQuery.toLowerCase()) || c.headline.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-8 pb-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E5B868]/10 border border-[#E5B868]/30 text-[#E5B868] text-xs font-mono font-bold uppercase mb-2">
            <Zap className="w-3.5 h-3.5" /> ADVERTISING & SPONSORSHIP MANAGER
          </div>
          <h1 className="text-2xl sm:text-3xl font-black italic uppercase text-white tracking-tight">
            Ad Space Monetization Control Center
          </h1>
          <p className="text-xs text-slate-400 font-mono">
            Manage incoming advertiser campaigns submitted via /advertise, toggle ad slots, and track real-time yield.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setPreviewAd({
              brandName: newBrand || 'Sample Sponsor',
              headline: newHeadline || 'PRO ATHLETE HYDRATION & RECOVERY',
              subheadline: newSubheadline || 'Official energy partner for Just1Play national combines.',
              ctaText: newCta || 'LEARN MORE',
              imageUrl: newImage,
              additionalImages: newAdditionalImages,
              enableRandomRotation: newEnableRandomRotation,
              placementPosition: newPosition || 'header-leaderboard',
              websiteUrl: newUrl
            })}
            className="px-4 py-2.5 rounded-xl bg-slate-700/10 hover:bg-[#E5B868]/20 border border-cyan-500/30 text-slate-300 font-mono font-bold text-xs uppercase flex items-center gap-2 cursor-pointer transition-colors"
          >
            <Eye className="w-4 h-4" />
            <span>Visual Preview Studio</span>
          </button>
          <button
            onClick={fetchCampaigns}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Refresh Ad Campaigns"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 rounded-xl bg-[#E5B868] hover:bg-[#B8141B] text-black font-black text-xs uppercase tracking-wider shadow-[0_0_15px_rgba(214,28,36,0.4)] flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Create Custom Ad Slot</span>
          </button>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-black/80 border border-[#E5B868]/30 backdrop-blur-xl space-y-1">
          <span className="text-[10px] font-mono text-slate-400 uppercase block">Ad Revenue Generated</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-[#E5B868] font-mono">${totalRevenue.toLocaleString()}</span>
            <span className="text-xs text-red-500 font-mono font-bold">USD</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-black/80 border border-white/15 backdrop-blur-xl space-y-1">
          <span className="text-[10px] font-mono text-slate-400 uppercase block">Total Ad Views</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-300 font-mono">{totalImpressions.toLocaleString()}</span>
            <span className="text-xs text-slate-400 font-mono">Views</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-black/80 border border-white/15 backdrop-blur-xl space-y-1">
          <span className="text-[10px] font-mono text-slate-400 uppercase block">Total Ad Clicks</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-red-500 font-mono">{totalClicks.toLocaleString()}</span>
            <span className="text-xs text-slate-400 font-mono">Clicks</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-black/80 border border-white/15 backdrop-blur-xl space-y-1">
          <span className="text-[10px] font-mono text-slate-400 uppercase block">Average Click-Through Rate</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-amber-400 font-mono">{avgCtr}%</span>
            <span className="text-xs text-slate-400 font-mono">CTR</span>
          </div>
        </div>
      </div>

      {/* Interactive Recharts Analytics Visualization */}
      <AdPerformanceChart campaigns={campaigns} />

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-3 rounded-2xl bg-black/80 border border-white/15 backdrop-blur-xl">
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto scrollbar-none">
          {['all', 'pending', 'active', 'paused', 'completed'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition-all whitespace-nowrap cursor-pointer ${
                filterStatus === st 
                  ? 'bg-[#E5B868] text-black shadow-[0_0_10px_rgba(214,28,36,0.4)]' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {st} {st === 'pending' && campaigns.filter(c => c.status === 'pending').length > 0 && `(${campaigns.filter(c => c.status === 'pending').length})`}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search brand or headline..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#121212] border border-white/15 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#E5B868]"
          />
        </div>
      </div>

      {/* Ad Campaigns Table / Cards */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-xs font-mono text-slate-400">Loading active ad campaigns...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-xs font-mono text-slate-400 bg-black/60 rounded-2xl border border-white/10">
            No ad campaigns found for the selected filter.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filtered.map((ad) => (
              <div 
                key={ad.id}
                className={`p-5 rounded-2xl border bg-black/80 backdrop-blur-xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 transition-all ${
                  ad.status === 'pending' 
                    ? 'border-amber-500/50 bg-amber-500/5' 
                    : ad.status === 'active'
                    ? 'border-[#E5B868]/40 shadow-[0_0_15px_rgba(214,28,36,0.08)]'
                    : 'border-white/10'
                }`}
              >
                <div className="flex items-start gap-4 max-w-2xl">
                  <div className="w-20 h-16 rounded-xl overflow-hidden border border-white/15 shrink-0 bg-[#212A31] relative">
                    <img src={ad.imageUrl} alt={ad.brandName} className="w-full h-full object-cover" />
                    <span className="absolute top-1 left-1 px-1 py-0.2 rounded bg-black/80 text-[8px] font-mono font-bold text-[#E5B868]">
                      {ad.format}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-mono font-bold text-[#E5B868] uppercase">{ad.brandName}</span>
                      
                      {/* Schedule Status Badge */}
                      {(() => {
                        const schedule = getAdScheduleStatus(ad);
                        if (schedule === 'live') {
                          return (
                            <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-[#E5B868]/20 text-[#E5B868] border border-[#E5B868]/50 flex items-center gap-1 shadow-[0_0_8px_rgba(214,28,36,0.3)]">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#E5B868] animate-ping" />
                              LIVE NOW
                            </span>
                          );
                        }
                        if (schedule === 'scheduled') {
                          return (
                            <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-[#E5B868]/20 text-slate-300 border border-[#E5B868]/40 flex items-center gap-1">
                              <Calendar className="w-2.5 h-2.5" />
                              SCHEDULED ({ad.startDate})
                            </span>
                          );
                        }
                        if (schedule === 'expired') {
                          return (
                            <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-400 border border-rose-500/40">
                              EXPIRED ({ad.endDate})
                            </span>
                          );
                        }
                        if (schedule === 'pending') {
                          return (
                            <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-400/20 text-amber-400 border border-amber-400/40">
                              PENDING APPROVAL
                            </span>
                          );
                        }
                        return (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-slate-800 text-slate-400">
                            PAUSED
                          </span>
                        );
                      })()}

                      <span className="text-[10px] font-mono text-slate-400 uppercase">
                        Slot: {ad.placementPosition}
                      </span>

                      {ad.additionalImages && ad.additionalImages.length > 0 && (
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase border flex items-center gap-1 ${
                          ad.enableRandomRotation 
                            ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-[0_0_8px_rgba(168,85,247,0.3)]' 
                            : 'bg-white/5 text-slate-400 border-white/10'
                        }`}>
                          <Shuffle className="w-2.5 h-2.5 text-purple-300" />
                          {1 + ad.additionalImages.length} Banners {ad.enableRandomRotation ? '(Random Rotation)' : ''}
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm font-black text-white uppercase">{ad.headline}</h3>
                    <p className="text-xs text-slate-300 line-clamp-1">{ad.subheadline || 'No subheadline'}</p>

                    <div className="flex flex-wrap items-center gap-4 text-[10px] font-mono text-slate-400 pt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-[#E5B868]" />
                        Schedule: <strong className="text-white">{ad.startDate || 'Immediate'} → {ad.endDate || 'Ongoing'}</strong>
                      </span>
                      <span>Email: <strong className="text-white">{ad.contactEmail}</strong></span>
                      <span>Budget: <strong className="text-[#E5B868]">${ad.budget}</strong></span>
                      <a href={ad.websiteUrl} target="_blank" rel="noreferrer" className="text-slate-300 hover:underline flex items-center gap-0.5">
                        URL <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                  </div>
                </div>

                {/* Stats & Controls */}
                <div className="flex items-center gap-6 w-full lg:w-auto justify-between border-t lg:border-t-0 pt-3 lg:pt-0 border-white/10">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <span className="text-[9px] font-mono text-slate-400 uppercase block">Views</span>
                      <span className="text-sm font-black text-slate-300 font-mono">{ad.impressions.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-mono text-slate-400 uppercase block">Clicks</span>
                      <span className="text-sm font-black text-red-500 font-mono">{ad.clicks.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {ad.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleStatusChange(ad.id, 'active')}
                          className="px-3 py-1.5 rounded-xl bg-[#E5B868] text-black font-black text-xs uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                        </button>
                        <button
                          onClick={() => handleStatusChange(ad.id, 'rejected')}
                          className="px-3 py-1.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/40 font-bold text-xs uppercase flex items-center gap-1 cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Reject
                        </button>
                      </>
                    )}

                    {ad.status === 'active' && (
                      <button
                        onClick={() => handleStatusChange(ad.id, 'paused')}
                        className="px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 font-bold text-xs uppercase flex items-center gap-1 cursor-pointer"
                      >
                        <PauseCircle className="w-3.5 h-3.5" /> Pause
                      </button>
                    )}

                    {ad.status === 'paused' && (
                      <button
                        onClick={() => handleStatusChange(ad.id, 'active')}
                        className="px-3 py-1.5 rounded-xl bg-[#E5B868]/20 text-[#E5B868] border border-[#E5B868]/40 font-bold text-xs uppercase flex items-center gap-1 cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5" /> Resume
                      </button>
                    )}

                    <button
                      onClick={() => setPreviewAd(ad)}
                      className="px-3 py-1.5 rounded-xl bg-slate-700/10 hover:bg-[#E5B868]/20 text-slate-300 border border-cyan-500/30 font-bold text-xs uppercase flex items-center gap-1 cursor-pointer transition-colors"
                      title="Visual Placement Preview"
                    >
                      <Eye className="w-3.5 h-3.5" /> Preview
                    </button>

                    <button
                      onClick={() => setEditingAd(ad)}
                      className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase cursor-pointer transition-colors"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal to Create Custom Ad */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#212A31] border border-white/20 rounded-3xl p-6 max-w-lg w-full space-y-4 my-8">
            <h3 className="text-lg font-black text-white uppercase flex items-center gap-2">
              <Zap className="w-5 h-5 text-[#E5B868]" /> CREATE CUSTOM AD SLOT
            </h3>
            <form onSubmit={handleCreateAd} className="space-y-3">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-300 font-mono">Brand Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Gatorade, Nike Training"
                  value={newBrand}
                  onChange={(e) => setNewBrand(e.target.value)}
                  className="w-full px-3 py-2 bg-black border border-white/15 rounded-xl text-xs text-white"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-300 font-mono">Ad Headline</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. OFFICIAL HYDRATION PARTNER OF JUST1PLAY"
                  value={newHeadline}
                  onChange={(e) => setNewHeadline(e.target.value)}
                  className="w-full px-3 py-2 bg-black border border-white/15 rounded-xl text-xs text-white"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-300 font-mono">Subheadline / Description</label>
                <input
                  type="text"
                  placeholder="e.g. Fuel your performance with certified electrolyte hydration."
                  value={newSubheadline}
                  onChange={(e) => setNewSubheadline(e.target.value)}
                  className="w-full px-3 py-2 bg-black border border-white/15 rounded-xl text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-300 font-mono">Destination Link URL</label>
                  <input
                    type="url"
                    required
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    className="w-full px-3 py-2 bg-black border border-white/15 rounded-xl text-xs text-white"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-300 font-mono">Button CTA Text</label>
                  <input
                    type="text"
                    value={newCta}
                    onChange={(e) => setNewCta(e.target.value)}
                    className="w-full px-3 py-2 bg-black border border-white/15 rounded-xl text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-300 font-mono">Target Page Placement</label>
                  <select
                    value={newPosition}
                    onChange={(e) => setNewPosition(e.target.value)}
                    className="w-full px-3 py-2 bg-black border border-white/15 rounded-xl text-xs text-white"
                  >
                    <option value="header-leaderboard">Header Leaderboard (Global)</option>
                    <option value="home-feed">Home Social Feed (Native Card)</option>
                    <option value="tournament-bracket">Tournament Brackets Header</option>
                    <option value="events-top">Events Standalone Top Banner</option>
                    <option value="recruiter-sidebar">Recruiter Matrix Sidebar</option>
                    <option value="media-hub">Media Hub Top Banner</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-300 font-mono">Campaign Budget ($ USD)</label>
                  <input
                    type="number"
                    value={newBudget}
                    onChange={(e) => setNewBudget(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-black border border-white/15 rounded-xl text-xs text-white"
                  />
                </div>
              </div>

              {/* Display Duration Dates */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold uppercase text-slate-300 font-mono flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-[#E5B868]" /> Campaign Schedule Dates
                  </label>
                  <div className="flex items-center gap-1 text-[9px] font-mono">
                    <span className="text-slate-400">Presets:</span>
                    <button type="button" onClick={() => applyQuickPreset(7, false)} className="px-1.5 py-0.5 rounded bg-white/10 hover:bg-[#E5B868]/20 text-slate-300 hover:text-[#E5B868] transition-colors cursor-pointer">+7D</button>
                    <button type="button" onClick={() => applyQuickPreset(30, false)} className="px-1.5 py-0.5 rounded bg-white/10 hover:bg-[#E5B868]/20 text-slate-300 hover:text-[#E5B868] transition-colors cursor-pointer">+30D</button>
                    <button type="button" onClick={() => applyQuickPreset(90, false)} className="px-1.5 py-0.5 rounded bg-white/10 hover:bg-[#E5B868]/20 text-slate-300 hover:text-[#E5B868] transition-colors cursor-pointer">+90D</button>
                    <button type="button" onClick={() => applyQuickPreset(180, false)} className="px-1.5 py-0.5 rounded bg-white/10 hover:bg-[#E5B868]/20 text-slate-300 hover:text-[#E5B868] transition-colors cursor-pointer">+180D</button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] font-mono text-slate-400 uppercase block mb-0.5">Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3 py-2 bg-black border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-[#E5B868]"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-mono text-slate-400 uppercase block mb-0.5">End Date</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-3 py-2 bg-black border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-[#E5B868]"
                    />
                  </div>
                </div>
              </div>

              {/* Multi-Banner Creatives & Random Rotation Controls */}
              <div className="space-y-3 p-3.5 bg-black/60 rounded-2xl border border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Images className="w-4 h-4 text-[#E5B868]" />
                    <span className="text-xs font-bold uppercase text-white font-mono">Campaign Banners & Creatives</span>
                  </div>

                  {/* Random Rotation Toggle */}
                  <label className="flex items-center gap-2 cursor-pointer bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded-lg border border-white/10 transition-colors">
                    <input
                      type="checkbox"
                      checked={newEnableRandomRotation}
                      onChange={(e) => setNewEnableRandomRotation(e.target.checked)}
                      className="rounded bg-black border-white/20 text-[#E5B868] focus:ring-[#E5B868]"
                    />
                    <Shuffle className={`w-3.5 h-3.5 ${newEnableRandomRotation ? 'text-[#E5B868]' : 'text-slate-400'}`} />
                    <span className="text-[10px] font-mono font-bold uppercase text-slate-200">
                      Random Rotation
                    </span>
                  </label>
                </div>

                {/* Primary Banner */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-mono text-slate-400 uppercase">Primary Banner Image URL</label>
                    <label className="text-[10px] font-bold uppercase text-[#E5B868] cursor-pointer hover:underline flex items-center gap-1">
                      <span>Upload Primary</span>
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, false)} />
                    </label>
                  </div>
                  <input
                    type="url"
                    value={newImage}
                    onChange={(e) => setNewImage(e.target.value)}
                    className="w-full px-3 py-1.5 bg-black border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-[#E5B868]"
                    placeholder="Primary image URL..."
                  />
                </div>

                {/* Additional Banners */}
                <div className="space-y-2 pt-2 border-t border-white/10">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-slate-400 uppercase">
                      Additional Banners ({newAdditionalImages.length})
                    </span>
                    <label className="px-2.5 py-1 bg-slate-700/10 hover:bg-[#E5B868]/20 border border-cyan-500/30 text-slate-300 text-[10px] font-bold uppercase rounded-md cursor-pointer transition-colors flex items-center gap-1">
                      <Plus className="w-3 h-3" /> Add More Banners
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => handleAdditionalFileUpload(e, false)}
                      />
                    </label>
                  </div>

                  {/* Thumbnail Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                    {/* Primary Banner Thumbnail */}
                    <div className="relative group h-20 rounded-xl overflow-hidden border-2 border-[#E5B868] bg-[#212A31]">
                      <img src={newImage} alt="Primary Banner" className="w-full h-full object-cover" />
                      <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/80 text-[#E5B868] text-[8px] font-mono font-bold uppercase border border-[#E5B868]/40">
                        Primary
                      </span>
                    </div>

                    {/* Additional Banner Thumbnails */}
                    {newAdditionalImages.map((imgUrl, idx) => (
                      <div key={idx} className="relative group h-20 rounded-xl overflow-hidden border border-white/20 bg-[#212A31]">
                        <img src={imgUrl} alt={`Banner ${idx + 2}`} className="w-full h-full object-cover" />
                        <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/80 text-slate-300 text-[8px] font-mono font-bold uppercase border border-cyan-400/40">
                          Banner #{idx + 2}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeAdditionalImage(idx, false)}
                          className="absolute top-1 right-1 p-1 rounded-lg bg-rose-500/80 hover:bg-rose-600 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          title="Remove Banner"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Rotation Status Explanation */}
                  {newEnableRandomRotation && (
                    <p className="text-[10px] text-[#E5B868]/90 font-mono flex items-center gap-1.5 mt-1 bg-[#E5B868]/5 p-2 rounded-lg border border-[#E5B868]/20">
                      <Shuffle className="w-3 h-3 shrink-0 text-[#E5B868]" />
                      <span>Random Rotation Active: System will cycle randomly between all {1 + newAdditionalImages.length} banners across ad slot impressions.</span>
                    </p>
                  )}
                </div>
              </div>

              <div className="pt-3 flex items-center justify-between gap-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setPreviewAd({
                    brandName: newBrand || 'Draft Sponsor',
                    headline: newHeadline || 'NEW SPONSORSHIP HEADLINE',
                    subheadline: newSubheadline,
                    ctaText: newCta,
                    imageUrl: newImage,
                    additionalImages: newAdditionalImages,
                    enableRandomRotation: newEnableRandomRotation,
                    placementPosition: newPosition,
                    websiteUrl: newUrl
                  })}
                  className="px-3.5 py-2 rounded-xl bg-slate-700/10 hover:bg-[#E5B868]/20 border border-cyan-500/30 text-slate-300 text-xs font-mono font-bold uppercase flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Preview Placement</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 rounded-xl bg-white/10 text-xs font-bold text-slate-300 uppercase cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[#E5B868] text-black text-xs font-black uppercase shadow-[0_0_15px_rgba(214,28,36,0.4)] cursor-pointer"
                  >
                    Publish Ad Campaign
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal to Edit Existing Ad */}
      {editingAd && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#212A31] border border-white/20 rounded-3xl p-6 max-w-lg w-full space-y-4 my-8">
            <h3 className="text-lg font-black text-white uppercase flex items-center gap-2">
              ✏️ EDIT AD CAMPAIGN
            </h3>
            <form onSubmit={handleSaveEditedAd} className="space-y-3">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-300 font-mono">Brand Name</label>
                <input
                  type="text"
                  required
                  value={editingAd.brandName}
                  onChange={(e) => setEditingAd({ ...editingAd, brandName: e.target.value })}
                  className="w-full px-3 py-2 bg-black border border-white/15 rounded-xl text-xs text-white"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-300 font-mono">Headline</label>
                <input
                  type="text"
                  required
                  value={editingAd.headline}
                  onChange={(e) => setEditingAd({ ...editingAd, headline: e.target.value })}
                  className="w-full px-3 py-2 bg-black border border-white/15 rounded-xl text-xs text-white"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-300 font-mono">Subheadline</label>
                <input
                  type="text"
                  value={editingAd.subheadline || ''}
                  onChange={(e) => setEditingAd({ ...editingAd, subheadline: e.target.value })}
                  className="w-full px-3 py-2 bg-black border border-white/15 rounded-xl text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-300 font-mono">Target Page Placement</label>
                  <select
                    value={editingAd.placementPosition}
                    onChange={(e) => setEditingAd({ ...editingAd, placementPosition: e.target.value as any })}
                    className="w-full px-3 py-2 bg-black border border-white/15 rounded-xl text-xs text-white"
                  >
                    <option value="header-leaderboard">Header Leaderboard</option>
                    <option value="home-feed">Home Feed Native</option>
                    <option value="tournament-bracket">Tournament Brackets</option>
                    <option value="events-top">Events Top Banner</option>
                    <option value="recruiter-sidebar">Recruiter Sidebar</option>
                    <option value="media-hub">Media Hub Top Banner</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-300 font-mono">Budget ($ USD)</label>
                  <input
                    type="number"
                    value={editingAd.budget}
                    onChange={(e) => setEditingAd({ ...editingAd, budget: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-black border border-white/15 rounded-xl text-xs text-white"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold uppercase text-slate-300 font-mono flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-[#E5B868]" /> Campaign Schedule Dates
                  </label>
                  <div className="flex items-center gap-1 text-[9px] font-mono">
                    <span className="text-slate-400">Presets:</span>
                    <button type="button" onClick={() => applyQuickPreset(7, true)} className="px-1.5 py-0.5 rounded bg-white/10 hover:bg-[#E5B868]/20 text-slate-300 hover:text-[#E5B868] transition-colors cursor-pointer">+7D</button>
                    <button type="button" onClick={() => applyQuickPreset(30, true)} className="px-1.5 py-0.5 rounded bg-white/10 hover:bg-[#E5B868]/20 text-slate-300 hover:text-[#E5B868] transition-colors cursor-pointer">+30D</button>
                    <button type="button" onClick={() => applyQuickPreset(90, true)} className="px-1.5 py-0.5 rounded bg-white/10 hover:bg-[#E5B868]/20 text-slate-300 hover:text-[#E5B868] transition-colors cursor-pointer">+90D</button>
                    <button type="button" onClick={() => applyQuickPreset(180, true)} className="px-1.5 py-0.5 rounded bg-white/10 hover:bg-[#E5B868]/20 text-slate-300 hover:text-[#E5B868] transition-colors cursor-pointer">+180D</button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] font-mono text-slate-400 uppercase block mb-0.5">Start Date</label>
                    <input
                      type="date"
                      value={editingAd.startDate}
                      onChange={(e) => setEditingAd({ ...editingAd, startDate: e.target.value })}
                      className="w-full px-3 py-2 bg-black border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-[#E5B868]"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-mono text-slate-400 uppercase block mb-0.5">End Date</label>
                    <input
                      type="date"
                      value={editingAd.endDate}
                      onChange={(e) => setEditingAd({ ...editingAd, endDate: e.target.value })}
                      className="w-full px-3 py-2 bg-black border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-[#E5B868]"
                    />
                  </div>
                </div>
              </div>

              {/* Multi-Banner Creatives & Random Rotation Controls */}
              <div className="space-y-3 p-3.5 bg-black/60 rounded-2xl border border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Images className="w-4 h-4 text-[#E5B868]" />
                    <span className="text-xs font-bold uppercase text-white font-mono">Campaign Banners & Creatives</span>
                  </div>

                  {/* Random Rotation Toggle */}
                  <label className="flex items-center gap-2 cursor-pointer bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded-lg border border-white/10 transition-colors">
                    <input
                      type="checkbox"
                      checked={editingAd.enableRandomRotation ?? false}
                      onChange={(e) => setEditingAd({ ...editingAd, enableRandomRotation: e.target.checked })}
                      className="rounded bg-black border-white/20 text-[#E5B868] focus:ring-[#E5B868]"
                    />
                    <Shuffle className={`w-3.5 h-3.5 ${editingAd.enableRandomRotation ? 'text-[#E5B868]' : 'text-slate-400'}`} />
                    <span className="text-[10px] font-mono font-bold uppercase text-slate-200">
                      Random Rotation
                    </span>
                  </label>
                </div>

                {/* Primary Banner */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-mono text-slate-400 uppercase">Primary Banner Image URL</label>
                    <label className="text-[10px] font-bold uppercase text-[#E5B868] cursor-pointer hover:underline flex items-center gap-1">
                      <span>Upload Primary</span>
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, true)} />
                    </label>
                  </div>
                  <input
                    type="url"
                    value={editingAd.imageUrl}
                    onChange={(e) => setEditingAd({ ...editingAd, imageUrl: e.target.value })}
                    className="w-full px-3 py-1.5 bg-black border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-[#E5B868]"
                    placeholder="Primary image URL..."
                  />
                </div>

                {/* Additional Banners */}
                <div className="space-y-2 pt-2 border-t border-white/10">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-slate-400 uppercase">
                      Additional Banners ({editingAd.additionalImages?.length || 0})
                    </span>
                    <label className="px-2.5 py-1 bg-slate-700/10 hover:bg-[#E5B868]/20 border border-cyan-500/30 text-slate-300 text-[10px] font-bold uppercase rounded-md cursor-pointer transition-colors flex items-center gap-1">
                      <Plus className="w-3 h-3" /> Add More Banners
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => handleAdditionalFileUpload(e, true)}
                      />
                    </label>
                  </div>

                  {/* Thumbnail Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                    {/* Primary Banner Thumbnail */}
                    <div className="relative group h-20 rounded-xl overflow-hidden border-2 border-[#E5B868] bg-[#212A31]">
                      <img src={editingAd.imageUrl} alt="Primary Banner" className="w-full h-full object-cover" />
                      <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/80 text-[#E5B868] text-[8px] font-mono font-bold uppercase border border-[#E5B868]/40">
                        Primary
                      </span>
                    </div>

                    {/* Additional Banner Thumbnails */}
                    {(editingAd.additionalImages || []).map((imgUrl, idx) => (
                      <div key={idx} className="relative group h-20 rounded-xl overflow-hidden border border-white/20 bg-[#212A31]">
                        <img src={imgUrl} alt={`Banner ${idx + 2}`} className="w-full h-full object-cover" />
                        <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/80 text-slate-300 text-[8px] font-mono font-bold uppercase border border-cyan-400/40">
                          Banner #{idx + 2}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeAdditionalImage(idx, true)}
                          className="absolute top-1 right-1 p-1 rounded-lg bg-rose-500/80 hover:bg-rose-600 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          title="Remove Banner"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Rotation Status Explanation */}
                  {editingAd.enableRandomRotation && (
                    <p className="text-[10px] text-[#E5B868]/90 font-mono flex items-center gap-1.5 mt-1 bg-[#E5B868]/5 p-2 rounded-lg border border-[#E5B868]/20">
                      <Shuffle className="w-3 h-3 shrink-0 text-[#E5B868]" />
                      <span>Random Rotation Active: System will cycle randomly between all {1 + (editingAd.additionalImages?.length || 0)} banners across ad slot impressions.</span>
                    </p>
                  )}
                </div>
              </div>

              <div className="pt-3 flex items-center justify-between gap-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setPreviewAd(editingAd)}
                  className="px-3.5 py-2 rounded-xl bg-slate-700/10 hover:bg-[#E5B868]/20 border border-cyan-500/30 text-slate-300 text-xs font-mono font-bold uppercase flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Preview Placement</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingAd(null)}
                    className="px-4 py-2 rounded-xl bg-white/10 text-xs font-bold text-slate-300 uppercase cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[#E5B868] text-black text-xs font-black uppercase cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Visual Placement Preview Studio Modal */}
      {previewAd && (
        <AdVisualPlacementPreviewModal
          ad={previewAd}
          onClose={() => setPreviewAd(null)}
          onUpdateAd={(updatedFields) => {
            setPreviewAd(prev => prev ? { ...prev, ...updatedFields } : null);
            if (editingAd) {
              setEditingAd(prev => prev ? { ...prev, ...updatedFields } : null);
            } else {
              if (updatedFields.brandName !== undefined) setNewBrand(updatedFields.brandName);
              if (updatedFields.headline !== undefined) setNewHeadline(updatedFields.headline);
              if (updatedFields.subheadline !== undefined) setNewSubheadline(updatedFields.subheadline);
              if (updatedFields.ctaText !== undefined) setNewCta(updatedFields.ctaText);
              if (updatedFields.imageUrl !== undefined) setNewImage(updatedFields.imageUrl);
              if (updatedFields.placementPosition !== undefined) setNewPosition(updatedFields.placementPosition);
              if (updatedFields.enableRandomRotation !== undefined) setNewEnableRandomRotation(updatedFields.enableRandomRotation);
            }
          }}
        />
      )}

    </div>
  );
};
