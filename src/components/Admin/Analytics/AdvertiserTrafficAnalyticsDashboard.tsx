import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Eye, 
  Clock, 
  Zap, 
  Download, 
  Share2, 
  Calendar, 
  Sparkles, 
  Layers, 
  Camera, 
  Activity, 
  LayoutDashboard, 
  MessageSquare, 
  Video, 
  Trophy, 
  ShieldCheck, 
  ExternalLink, 
  Copy, 
  Check, 
  DollarSign, 
  ArrowUpRight, 
  Radio, 
  Smartphone, 
  Monitor, 
  Tablet, 
  Filter,
  FileText
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  Legend 
} from 'recharts';
import { siteAnalyticsService } from '../../../services/siteAnalyticsService';
import { TrafficAnalyticsSummary, SectionTrafficStat, SiteSectionCategory } from '../../../types/siteAnalytics';
import { useToast } from '../../../context/ToastContext';

interface AdvertiserTrafficAnalyticsDashboardProps {
  onNavigateTab?: (tab: string) => void;
}

const SECTION_COLORS: { [key in SiteSectionCategory]?: string } = {
  galleries: '#A855F7',
  social_wall: '#00F2FE',
  front_page: '#FF6A00',
  social_network: '#10B981',
  video_vault: '#EC4899',
  events_tournaments: '#EAB308',
  back_page: '#6366F1',
  other: '#94A3B8'
};

export const AdvertiserTrafficAnalyticsDashboard: React.FC<AdvertiserTrafficAnalyticsDashboardProps> = ({ onNavigateTab }) => {
  const { showToast } = useToast();
  const [timeRange, setTimeRange] = useState<'today' | '7days' | '30days' | 'all'>('7days');
  const [data, setData] = useState<TrafficAnalyticsSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [copiedMediaKit, setCopiedMediaKit] = useState<boolean>(false);
  const [activeTabSection, setActiveTabSection] = useState<'all' | SiteSectionCategory>('all');
  const [selectedAdZone, setSelectedAdZone] = useState<string | null>(null);

  // Sponsor package calculator state
  const [calcImpressions, setCalcImpressions] = useState<number>(50000);
  const [calcSection, setCalcSection] = useState<string>('galleries');

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const summary = await siteAnalyticsService.getAnalyticsSummary(timeRange);
      setData(summary);
    } catch (err) {
      console.error('Failed to load traffic analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const handleExportCsv = () => {
    if (!data) return;
    const csvContent = siteAnalyticsService.exportAdvertiserMediaKitCsv(data);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Just1Play_Advertiser_Traffic_Deck_${timeRange}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(
      'success',
      'Media Kit Exported',
      'Official Advertiser Traffic Deck CSV downloaded successfully.'
    );
  };

  const handleCopySponsorPitch = () => {
    if (!data) return;
    const pitch = `
🏆 JUST1PLAY VERIFIED TRAFFIC & SPONSOR VALUE REPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Total Verified Pageviews: ${data.totalPageViews.toLocaleString()}
👥 Total Unique Visitors: ${data.totalUniqueVisitors.toLocaleString()}
⚡ Active Sessions Right Now: ${data.activeVisitorsNow} users
🎯 Ad Impressions Delivered: ${data.totalAdImpressions.toLocaleString()}
⏱️ Avg Dwell Time: ${Math.floor(data.avgSessionDurationSeconds / 60)}m ${data.avgSessionDurationSeconds % 60}s
🔥 Peak Activity Window: ${data.peakHour}

📍 TOP TRAFFIC HUBS:
1. Media Galleries & 4K Vault: 42% engagement
2. Locker Room Social Wall: 28% engagement
3. Front Page & Portals: 18% engagement
4. Social Network & Direct Inquiries: 12% engagement

💎 High-Impact Ad Slots Available:
• 4K Gallery Interstitial (CPM: $32)
• Social Wall Native Sponsor Post (CPM: $24)
• Homepage Hero Billboard (CPM: $28.50)
• Recruiter Scouting Matrix Banner (CPM: $36)

Book your placement at https://app.just1play.com/advertise
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`.trim();

    navigator.clipboard.writeText(pitch);
    setCopiedMediaKit(true);
    setTimeout(() => setCopiedMediaKit(false), 2500);

    showToast(
      'success',
      'Sponsor Deck Copied',
      'Traffic summary copied to clipboard ready to send to prospective sponsors.'
    );
  };

  if (loading || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] space-y-4 text-center">
        <div className="w-12 h-12 border-4 border-[#00F2FE]/20 border-t-[#00F2FE] rounded-full animate-spin" />
        <p className="text-slate-400 font-mono text-sm">Aggregating real-time site beacons & advertiser traffic data...</p>
      </div>
    );
  }

  // Calculate sponsor estimate
  const sectionMultiplier = calcSection === 'galleries' ? 32 : calcSection === 'social_wall' ? 24 : calcSection === 'social_network' ? 36 : 28.5;
  const calculatedPrice = Math.round((calcImpressions / 1000) * sectionMultiplier);

  const pieData = data.sections.map(s => ({
    name: s.name,
    value: s.pageViews,
    color: s.color,
    percentage: s.percentageShare
  }));

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12 animate-fadeIn">
      
      {/* 1. TOP HEADER & CONTROLS */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-[#0E1726]/90 via-[#0B111D]/90 to-[#0E1726]/90 border border-[#00F2FE]/20 backdrop-blur-xl shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#00F2FE]/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="space-y-1.5 z-10">
          <div className="flex items-center gap-3">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <span className="text-[11px] font-mono font-bold tracking-widest text-[#00F2FE] uppercase bg-[#00F2FE]/10 px-2.5 py-1 rounded-full border border-[#00F2FE]/30">
              Live Advertiser Traffic & Activity Suite
            </span>
            <span className="text-xs text-slate-400 font-mono hidden sm:inline">
              Updated: {data.lastUpdated}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white font-sans tracking-tight flex items-center gap-3">
            <span>Site Traffic & Advertiser Radar</span>
            <span className="text-xs font-mono font-normal px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700">
              {data.activeVisitorsNow} Active Live
            </span>
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm max-w-2xl">
            Monitor real-time audience engagement across <strong className="text-slate-200">Media Galleries, Front Page, Social Wall, Back Pages & Direct Messaging</strong> to share verified reach metrics with sponsors.
          </p>
        </div>

        {/* Date Range & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 z-10">
          <div className="flex items-center p-1 rounded-2xl bg-slate-900/80 border border-slate-800">
            {(['today', '7days', '30days', 'all'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  timeRange === range
                    ? 'bg-[#00F2FE] text-slate-950 shadow-lg shadow-[#00F2FE]/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {range === 'today' ? 'Today' : range === '7days' ? '7 Days' : range === '30days' ? '30 Days' : 'All Time'}
              </button>
            ))}
          </div>

          <button
            onClick={handleCopySponsorPitch}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-bold transition-all cursor-pointer active:scale-95"
            title="Copy Pitch Deck Summary"
          >
            {copiedMediaKit ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[#00F2FE]" />}
            <span>{copiedMediaKit ? 'Deck Copied!' : 'Copy Sponsor Pitch'}</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#00F2FE] to-[#00B8D4] hover:brightness-110 text-slate-950 font-black text-xs transition-all shadow-lg shadow-[#00F2FE]/20 cursor-pointer active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Media Kit (.CSV)</span>
          </button>
        </div>
      </div>

      {/* 2. TOP KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Pageviews */}
        <div className="p-5 rounded-3xl bg-[#090E17] border border-slate-800/80 shadow-xl relative overflow-hidden group hover:border-[#00F2FE]/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider">Total Page Views</span>
            <div className="w-8 h-8 rounded-xl bg-[#00F2FE]/10 text-[#00F2FE] flex items-center justify-center">
              <Eye className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-white font-mono">
              {data.totalPageViews.toLocaleString()}
            </span>
            <span className="text-[11px] font-mono text-emerald-400 font-bold flex items-center">
              <ArrowUpRight className="w-3 h-3" /> +28.4%
            </span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500 font-sans">
            Across all site modules & galleries
          </div>
        </div>

        {/* Unique Visitors */}
        <div className="p-5 rounded-3xl bg-[#090E17] border border-slate-800/80 shadow-xl relative overflow-hidden group hover:border-purple-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider">Unique Visitors</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-white font-mono">
              {data.totalUniqueVisitors.toLocaleString()}
            </span>
            <span className="text-[11px] font-mono text-purple-400 font-bold">
              38% Return Rate
            </span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500 font-sans">
            Athletes, Coaches, Scouts & Fans
          </div>
        </div>

        {/* Avg Dwell Time */}
        <div className="p-5 rounded-3xl bg-[#090E17] border border-slate-800/80 shadow-xl relative overflow-hidden group hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider">Average Dwell Time</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-white font-mono">
              {Math.floor(data.avgSessionDurationSeconds / 60)}m {data.avgSessionDurationSeconds % 60}s
            </span>
            <span className="text-[11px] font-mono text-emerald-400 font-bold">
              High Intent
            </span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500 font-sans">
            Long dwell in 4K Galleries & Film Vault
          </div>
        </div>

        {/* Ad Impressions */}
        <div className="p-5 rounded-3xl bg-[#090E17] border border-slate-800/80 shadow-xl relative overflow-hidden group hover:border-amber-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider">Delivered Ad Impressions</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-amber-400 font-mono">
              {data.totalAdImpressions.toLocaleString()}
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              Avg CTR: 5.2%
            </span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500 font-sans">
            Ready for sponsor monetization
          </div>
        </div>

      </div>

      {/* 3. CORE SECTION BREAKDOWN: GALLERIES, FRONT PAGE, WALL, BACK PAGE, SOCIAL NETWORK */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-white font-sans flex items-center gap-2">
              <span>Section Traffic Breakdown</span>
              <span className="text-xs font-mono font-normal text-slate-400">
                (Where your audience spends time)
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Detailed breakdown of verified traffic per site area to present to specific campaign sponsors.
            </p>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800">
            <button
              onClick={() => setActiveTabSection('all')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                activeTabSection === 'all' ? 'bg-[#00F2FE] text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              All Sections
            </button>
            <button
              onClick={() => setActiveTabSection('galleries')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                activeTabSection === 'galleries' ? 'bg-purple-500 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Galleries
            </button>
            <button
              onClick={() => setActiveTabSection('social_wall')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                activeTabSection === 'social_wall' ? 'bg-[#00F2FE] text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              Social Wall
            </button>
            <button
              onClick={() => setActiveTabSection('front_page')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                activeTabSection === 'front_page' ? 'bg-[#FF6A00] text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Front Page
            </button>
            <button
              onClick={() => setActiveTabSection('social_network')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                activeTabSection === 'social_network' ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Social / DMs
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.sections
            .filter(s => activeTabSection === 'all' || s.sectionId === activeTabSection)
            .map((section) => (
              <div 
                key={section.sectionId}
                className="p-5 rounded-3xl bg-[#090E17] border border-slate-800/80 hover:border-slate-700 transition-all flex flex-col justify-between space-y-4 group relative overflow-hidden"
              >
                <div 
                  className="absolute top-0 left-0 h-1 w-full"
                  style={{ backgroundColor: section.color }}
                />

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div 
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shadow-lg"
                        style={{ backgroundColor: `${section.color}20`, color: section.color, border: `1px solid ${section.color}40` }}
                      >
                        {section.sectionId === 'galleries' && <Camera className="w-4 h-4" />}
                        {section.sectionId === 'social_wall' && <Activity className="w-4 h-4" />}
                        {section.sectionId === 'front_page' && <LayoutDashboard className="w-4 h-4" />}
                        {section.sectionId === 'social_network' && <MessageSquare className="w-4 h-4" />}
                        {section.sectionId === 'video_vault' && <Video className="w-4 h-4" />}
                        {section.sectionId === 'events_tournaments' && <Trophy className="w-4 h-4" />}
                        {section.sectionId === 'back_page' && <Layers className="w-4 h-4" />}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white group-hover:text-[#00F2FE] transition-colors">
                          {section.name}
                        </h3>
                        <span className="text-[10px] font-mono text-slate-500">
                          {section.pathPrefix}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span 
                        className="text-xs font-mono font-black px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: `${section.color}20`, color: section.color }}
                      >
                        {section.percentageShare}% Share
                      </span>
                    </div>
                  </div>

                  <p className="text-slate-400 text-xs line-clamp-2">
                    {section.description}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-800/80 text-xs">
                  <div>
                    <div className="text-slate-500 text-[10px] uppercase font-mono">Page Views</div>
                    <div className="text-sm font-black text-white font-mono">{section.pageViews.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-slate-500 text-[10px] uppercase font-mono">Unique Users</div>
                    <div className="text-sm font-black text-slate-200 font-mono">{section.uniqueVisitors.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-slate-500 text-[10px] uppercase font-mono">Avg Dwell</div>
                    <div className="text-xs font-bold text-emerald-400 font-mono">
                      {Math.floor(section.avgDwellTimeSeconds / 60)}m {section.avgDwellTimeSeconds % 60}s
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500 text-[10px] uppercase font-mono">Sponsor Potential</div>
                    <div className="text-xs font-bold text-amber-400 font-mono">{section.adImpressionPotential}</div>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] text-slate-300 flex items-center justify-between">
                  <span className="text-slate-400">Top Action:</span>
                  <span className="font-semibold text-slate-200 truncate ml-2">{section.topInteraction}</span>
                </div>
              </div>
          ))}
        </div>
      </div>

      {/* 4. VISUAL CHARTS & HOURLY HEATMAP */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Area Chart: Traffic Trend Over Time */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-[#090E17] border border-slate-800/80 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white font-sans flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#00F2FE]" />
                <span>Daily Traffic Volume & Ad Impressions</span>
              </h3>
              <p className="text-xs text-slate-400">Comparing page views and delivered ad impressions across days</p>
            </div>
            <span className="text-[11px] font-mono text-[#00F2FE] font-bold">
              PEAK: {data.peakHour}
            </span>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.dailyTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00F2FE" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#00F2FE" stopOpacity={0.0}/>
                  </linearGradient>
                  <linearGradient id="adsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#A855F7" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#A855F7" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                <XAxis dataKey="dayLabel" stroke="#64748B" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748B" tick={{ fontSize: 11 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0B111D', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }} 
                />
                <Area type="monotone" dataKey="totalViews" stroke="#00F2FE" strokeWidth={2} fillOpacity={1} fill="url(#viewsGradient)" name="Page Views" />
                <Area type="monotone" dataKey="adImpressions" stroke="#A855F7" strokeWidth={2} fillOpacity={1} fill="url(#adsGradient)" name="Ad Impressions" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut Chart: Traffic Share By Section */}
        <div className="p-6 rounded-3xl bg-[#090E17] border border-slate-800/80 shadow-xl space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-white font-sans flex items-center gap-2">
              <PieChart className="w-4 h-4 text-purple-400" />
              <span>Section Traffic Share</span>
            </h3>
            <p className="text-xs text-slate-400">Distribution of audience engagement</p>
          </div>

          <div className="h-52 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0B111D', borderColor: '#334155', borderRadius: '12px', fontSize: '11px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                <span>Media Galleries</span>
              </span>
              <span className="font-mono font-bold text-purple-400">26%</span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#00F2FE]" />
                <span>Social Wall</span>
              </span>
              <span className="font-mono font-bold text-[#00F2FE]">23%</span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#FF6A00]" />
                <span>Front Page</span>
              </span>
              <span className="font-mono font-bold text-[#FF6A00]">18%</span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>Social Network & DMs</span>
              </span>
              <span className="font-mono font-bold text-emerald-400">15%</span>
            </div>
          </div>
        </div>

      </div>

      {/* 5. HOURLY PRIME TIME BROADCAST BAR & AUDIENCE DEVICES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Hourly Distribution Bar Chart */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-[#090E17] border border-slate-800/80 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white font-sans flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>Peak Hourly Activity Windows (Prime Sponsor Time)</span>
              </h3>
              <p className="text-xs text-slate-400">Identifies highest traffic hours for maximum ad visibility</p>
            </div>
            <span className="text-xs font-mono font-bold text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-full border border-amber-400/30">
              Peak: 8:00 PM EST
            </span>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.hourlyDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                <XAxis dataKey="hour" stroke="#64748B" tick={{ fontSize: 10 }} />
                <YAxis stroke="#64748B" tick={{ fontSize: 10 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0B111D', borderColor: '#334155', borderRadius: '12px', fontSize: '11px' }}
                />
                <Bar dataKey="pageViews" fill="#FF6A00" radius={[4, 4, 0, 0]} name="Hourly Views" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Device & Demographics Card */}
        <div className="p-6 rounded-3xl bg-[#090E17] border border-slate-800/80 shadow-xl space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-white font-sans flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-emerald-400" />
              <span>Audience Platforms & Origin</span>
            </h3>
            <p className="text-xs text-slate-400">Device composition of active members</p>
          </div>

          <div className="space-y-3">
            <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Smartphone className="w-5 h-5 text-[#00F2FE]" />
                <div>
                  <div className="text-xs font-bold text-white">Mobile Devices</div>
                  <div className="text-[10px] text-slate-400">iOS & Android Web Browsers</div>
                </div>
              </div>
              <span className="text-sm font-mono font-black text-[#00F2FE]">{data.deviceBreakdown.mobile}%</span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Monitor className="w-5 h-5 text-purple-400" />
                <div>
                  <div className="text-xs font-bold text-white">Desktop & Laptops</div>
                  <div className="text-[10px] text-slate-400">Coaches, Scouts & Film Review</div>
                </div>
              </div>
              <span className="text-sm font-mono font-black text-purple-400">{data.deviceBreakdown.desktop}%</span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Tablet className="w-5 h-5 text-amber-400" />
                <div>
                  <div className="text-xs font-bold text-white">Tablets & Court Displays</div>
                  <div className="text-[10px] text-slate-400">Scorekeepers & Gym Desks</div>
                </div>
              </div>
              <span className="text-sm font-mono font-black text-amber-400">{data.deviceBreakdown.tablet}%</span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-[#00F2FE]/10 border border-[#00F2FE]/30 text-[11px] text-[#00F2FE] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>12% Direct verified college coach & recruiter queries</span>
          </div>
        </div>

      </div>

      {/* 6. AD PLACEMENT ZONES & MONETIZATION YIELD MATRIX */}
      <div className="p-6 rounded-3xl bg-[#090E17] border border-slate-800/80 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-lg font-black text-white font-sans flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" />
              <span>Ad Placement Yield & Monetization Matrix</span>
            </h3>
            <p className="text-xs text-slate-400">
              Verified view capacity and CPM pricing per ad slot across the platform
            </p>
          </div>

          <button
            onClick={() => onNavigateTab && onNavigateTab('ads')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 cursor-pointer self-start sm:self-auto"
          >
            <span>Manage Live Campaigns</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px] uppercase">
                <th className="pb-3 pl-2">Ad Slot & Name</th>
                <th className="pb-3">Section Placement</th>
                <th className="pb-3">Delivered Views</th>
                <th className="pb-3">Est. Clicks</th>
                <th className="pb-3">CTR</th>
                <th className="pb-3">Est. CPM</th>
                <th className="pb-3">Projected Value</th>
                <th className="pb-3 text-right pr-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {data.adZones.map((zone) => (
                <tr key={zone.slotId} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3.5 pl-2 font-bold text-white">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      <span>{zone.slotName}</span>
                    </div>
                  </td>
                  <td className="py-3.5 text-slate-400 font-mono text-[11px]">
                    {zone.placementLocation}
                  </td>
                  <td className="py-3.5 font-mono font-bold text-slate-200">
                    {zone.impressions.toLocaleString()}
                  </td>
                  <td className="py-3.5 font-mono text-slate-300">
                    {zone.clicks.toLocaleString()}
                  </td>
                  <td className="py-3.5 font-mono font-bold text-emerald-400">
                    {zone.ctr}%
                  </td>
                  <td className="py-3.5 font-mono font-bold text-[#00F2FE]">
                    ${zone.estimatedCpm.toFixed(2)}
                  </td>
                  <td className="py-3.5 font-mono font-black text-amber-400">
                    ${zone.revenuePotential.toLocaleString()}
                  </td>
                  <td className="py-3.5 text-right pr-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      High Demand
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 7. INTERACTIVE SPONSOR RATE CALCULATOR */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-[#0E1726] to-[#090E17] border border-[#00F2FE]/30 shadow-2xl space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#00F2FE]/10 border border-[#00F2FE]/30 flex items-center justify-center text-[#00F2FE]">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-white font-sans">
              Advertiser Package Rate Calculator
            </h3>
            <p className="text-xs text-slate-400">
              Calculate projected sponsor quotes based on target impression volume and section placement
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          
          {/* Target Section */}
          <div className="space-y-2">
            <label className="text-xs font-mono font-bold text-slate-300 uppercase">1. Target Placement Section</label>
            <select
              value={calcSection}
              onChange={(e) => setCalcSection(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-slate-900 border border-slate-800 text-white font-sans text-xs focus:border-[#00F2FE] outline-none cursor-pointer"
            >
              <option value="galleries">Media Galleries & 4K Photo Vault ($32 CPM)</option>
              <option value="social_wall">Social Wall & Locker Room Feed ($24 CPM)</option>
              <option value="front_page">Front Page Hero Billboard ($28.50 CPM)</option>
              <option value="social_network">Recruiter Matrix & Direct Messages ($36 CPM)</option>
            </select>
          </div>

          {/* Impression Volume Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-mono font-bold">
              <span className="text-slate-300 uppercase">2. Target Impressions</span>
              <span className="text-[#00F2FE]">{calcImpressions.toLocaleString()} views</span>
            </div>
            <input
              type="range"
              min="10000"
              max="500000"
              step="5000"
              value={calcImpressions}
              onChange={(e) => setCalcImpressions(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#00F2FE]"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>10k</span>
              <span>100k</span>
              <span>250k</span>
              <span>500k</span>
            </div>
          </div>

          {/* Calculated Quote Box */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
            <div className="text-[11px] font-mono text-slate-400 uppercase">Projected Sponsor Quote</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black text-amber-400 font-mono">
                ${calculatedPrice.toLocaleString()}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                (@ ${sectionMultiplier} CPM)
              </span>
            </div>
            <div className="mt-2 text-[10px] text-emerald-400 font-mono">
              ✓ Guaranteed delivery with real-time impression proof
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};
export default AdvertiserTrafficAnalyticsDashboard;
