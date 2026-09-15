import React, { useState } from 'react';
import { 
  X, 
  DollarSign, 
  TrendingUp, 
  Eye, 
  MousePointerClick, 
  Plus, 
  CheckCircle2, 
  Sparkles, 
  Upload, 
  Image as ImageIcon,
  ExternalLink,
  ShieldCheck,
  Target,
  BarChart3
} from 'lucide-react';

interface SponsorCampaign {
  id: string;
  brandName: string;
  placement: 'Scoreboard Ticker' | 'Live Stream Overlay' | 'Bracket Header' | 'Leaderboard Banner' | 'Recruiter Matrix Sidecard';
  status: 'ACTIVE' | 'PAUSED' | 'SCHEDULED';
  impressions: number;
  clicks: number;
  ctr: string;
  budgetTotal: number;
  dailySpend: number;
  destinationUrl: string;
  bannerImage: string;
}

const INITIAL_CAMPAIGNS: SponsorCampaign[] = [
  {
    id: 'camp-1',
    brandName: 'Gatorade Sports Science',
    placement: 'Live Stream Overlay',
    status: 'ACTIVE',
    impressions: 48920,
    clicks: 2140,
    ctr: '4.37%',
    budgetTotal: 3500,
    dailySpend: 150,
    destinationUrl: 'https://gatorade.com/fuel-station',
    bannerImage: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 'camp-2',
    brandName: 'Battle Sports Apparel',
    placement: 'Bracket Header',
    status: 'ACTIVE',
    impressions: 32110,
    clicks: 1890,
    ctr: '5.88%',
    budgetTotal: 2200,
    dailySpend: 100,
    destinationUrl: 'https://battlesports.com/gloves',
    bannerImage: 'https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 'camp-3',
    brandName: 'Pacific Orthopedic & Sports Medicine',
    placement: 'Scoreboard Ticker',
    status: 'ACTIVE',
    impressions: 21400,
    clicks: 980,
    ctr: '4.58%',
    budgetTotal: 1500,
    dailySpend: 75,
    destinationUrl: 'https://pacificortho.com/urgent-sports-care',
    bannerImage: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600&auto=format&fit=crop&q=80'
  }
];

interface SponsorCampaignDeskModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SponsorCampaignDeskModal: React.FC<SponsorCampaignDeskModalProps> = ({ isOpen, onClose }) => {
  const [campaigns, setCampaigns] = useState<SponsorCampaign[]>(INITIAL_CAMPAIGNS);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newBrand, setNewBrand] = useState('');
  const [newPlacement, setNewPlacement] = useState<SponsorCampaign['placement']>('Live Stream Overlay');
  const [newBudget, setNewBudget] = useState('1000');
  const [newUrl, setNewUrl] = useState('https://');
  const [notification, setNotification] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCreateCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBrand) return;

    const created: SponsorCampaign = {
      id: `camp-${Date.now()}`,
      brandName: newBrand,
      placement: newPlacement,
      status: 'ACTIVE',
      impressions: 0,
      clicks: 0,
      ctr: '0.00%',
      budgetTotal: parseFloat(newBudget) || 500,
      dailySpend: 50,
      destinationUrl: newUrl,
      bannerImage: 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=600&auto=format&fit=crop&q=80'
    };

    setCampaigns(prev => [created, ...prev]);
    setShowAddForm(false);
    setNewBrand('');
    setNotification(`⚡ Sponsor Campaign Launched: "${created.brandName}" on ${created.placement}`);
    setTimeout(() => setNotification(null), 3500);
  };

  const totalImpressions = campaigns.reduce((acc, c) => acc + c.impressions, 0);
  const totalClicks = campaigns.reduce((acc, c) => acc + c.clicks, 0);
  const totalRevenue = campaigns.reduce((acc, c) => acc + c.budgetTotal, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="bg-[#12171E] border border-[#2D3748] rounded-3xl w-full max-w-5xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden text-white">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2D3748] bg-[#161C22]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#E5B868]/15 border border-[#E5B868]/30 text-[#E5B868]">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white font-mono tracking-wide flex items-center gap-2">
                <span>SPONSOR &amp; AD CAMPAIGN MANAGEMENT DESK</span>
                <span className="text-[10px] text-[#E5B868] bg-[#E5B868]/15 border border-[#E5B868]/30 px-2 py-0.5 rounded-full font-mono">
                  DIRECTOR PORTAL
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Monetize live streams, leaderboards, and tournament score tickers
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-[#1E2630] hover:bg-[#2D3748] text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Workspace */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {notification && (
            <div className="p-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold flex items-center gap-2 animate-pulse">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{notification}</span>
            </div>
          )}

          {/* High-Level Monetization Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-[#161C22] border border-[#2D3748] space-y-1">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span>Total Sponsor Revenue</span>
                <DollarSign className="w-4 h-4 text-[#E5B868]" />
              </div>
              <div className="text-2xl font-black font-mono text-white">${totalRevenue.toLocaleString()}</div>
              <div className="text-[10px] text-emerald-400 font-mono">+18% vs last tournament</div>
            </div>

            <div className="p-4 rounded-2xl bg-[#161C22] border border-[#2D3748] space-y-1">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span>Total Ad Impressions</span>
                <Eye className="w-4 h-4 text-[#00F2FE]" />
              </div>
              <div className="text-2xl font-black font-mono text-white">{totalImpressions.toLocaleString()}</div>
              <div className="text-[10px] text-cyan-400 font-mono">100% Verified Event Views</div>
            </div>

            <div className="p-4 rounded-2xl bg-[#161C22] border border-[#2D3748] space-y-1">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span>Total CTR Engagement</span>
                <MousePointerClick className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-black font-mono text-white">{totalClicks.toLocaleString()} Clicks</div>
              <div className="text-[10px] text-slate-400 font-mono">Avg CTR: {((totalClicks / (totalImpressions || 1)) * 100).toFixed(2)}%</div>
            </div>
          </div>

          {/* New Campaign Creation Trigger & List */}
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono font-black uppercase tracking-wider text-slate-300">
              Active Sponsor Campaigns ({campaigns.length})
            </h3>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#E5B868] hover:bg-[#F0C878] text-slate-950 font-mono font-black text-xs uppercase cursor-pointer transition-all shadow-[0_0_12px_rgba(229,184,104,0.3)]"
            >
              <Plus className="w-4 h-4" />
              <span>{showAddForm ? 'Cancel' : 'New Sponsor Campaign'}</span>
            </button>
          </div>

          {/* Add Campaign Form Drawer */}
          {showAddForm && (
            <form onSubmit={handleCreateCampaign} className="p-5 rounded-2xl bg-[#161C22] border border-[#E5B868]/40 space-y-4">
              <h4 className="text-xs font-mono font-black text-[#E5B868] uppercase">
                Configure Brand Sponsorship Placement
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Brand Name</label>
                  <input
                    type="text"
                    required
                    value={newBrand}
                    onChange={(e) => setNewBrand(e.target.value)}
                    placeholder="e.g. Wilson Football"
                    className="w-full bg-[#0F141A] border border-[#2D3748] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#E5B868]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Placement Spot</label>
                  <select
                    value={newPlacement}
                    onChange={(e: any) => setNewPlacement(e.target.value)}
                    className="w-full bg-[#0F141A] border border-[#2D3748] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#E5B868]"
                  >
                    <option value="Live Stream Overlay">Live Stream Overlay</option>
                    <option value="Scoreboard Ticker">Scoreboard Ticker</option>
                    <option value="Bracket Header">Bracket Header</option>
                    <option value="Leaderboard Banner">Leaderboard Banner</option>
                    <option value="Recruiter Matrix Sidecard">Recruiter Matrix Sidecard</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Total Budget ($)</label>
                  <input
                    type="number"
                    value={newBudget}
                    onChange={(e) => setNewBudget(e.target.value)}
                    placeholder="1000"
                    className="w-full bg-[#0F141A] border border-[#2D3748] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#E5B868]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Destination URL</label>
                  <input
                    type="url"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    placeholder="https://brand.com/deal"
                    className="w-full bg-[#0F141A] border border-[#2D3748] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#E5B868]"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-[#E5B868] hover:bg-[#F0C878] text-slate-950 font-mono font-black text-xs uppercase cursor-pointer"
              >
                Launch Sponsorship Placement
              </button>
            </form>
          )}

          {/* Campaign Table */}
          <div className="border border-[#2D3748] rounded-2xl overflow-hidden bg-[#0F141A]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#1A222D] text-slate-400 font-mono uppercase text-[10px]">
                <tr>
                  <th className="p-3">Sponsor Brand</th>
                  <th className="p-3">Slot Placement</th>
                  <th className="p-3">Impressions</th>
                  <th className="p-3">Clicks</th>
                  <th className="p-3">CTR</th>
                  <th className="p-3">Budget</th>
                  <th className="p-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2D3748] text-slate-200">
                {campaigns.map((camp) => (
                  <tr key={camp.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-3 font-bold text-white flex items-center gap-2">
                      <img src={camp.bannerImage} alt={camp.brandName} className="w-7 h-7 rounded-lg object-cover" />
                      <span>{camp.brandName}</span>
                    </td>
                    <td className="p-3 font-mono text-slate-300">{camp.placement}</td>
                    <td className="p-3 font-mono">{camp.impressions.toLocaleString()}</td>
                    <td className="p-3 font-mono">{camp.clicks.toLocaleString()}</td>
                    <td className="p-3 font-mono font-bold text-[#00F2FE]">{camp.ctr}</td>
                    <td className="p-3 font-mono font-bold text-[#E5B868]">${camp.budgetTotal}</td>
                    <td className="p-3 text-right">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold">
                        {camp.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#161C22] border-t border-[#2D3748]">
          <div className="text-xs font-mono text-slate-400">
            Automated pixel tracking active across all web and mobile tournament views.
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#2D3748] hover:bg-[#4A5568] text-white font-mono text-xs font-bold transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
