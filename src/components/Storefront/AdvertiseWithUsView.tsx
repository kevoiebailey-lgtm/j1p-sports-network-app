import React, { useState } from 'react';
import { 
  Zap, 
  Target, 
  TrendingUp, 
  Users, 
  Award, 
  CheckCircle2, 
  Upload, 
  Eye, 
  ArrowRight, 
  Sparkles, 
  DollarSign, 
  ShieldCheck, 
  Image as ImageIcon, 
  Send, 
  ExternalLink,
  Layers,
  BarChart3,
  Globe
} from 'lucide-react';
import { AdPackageTier, AdPlacementPosition } from '../../types/ad';
import { adService } from '../../services/adService';
import { useAuth } from '../../context/AuthContext';
import { compressImage } from '../../lib/imageCompressor';

const AD_PACKAGE_TIERS: AdPackageTier[] = [
  {
    id: 'starter-local',
    name: 'Starter Local',
    price: 250,
    period: 'month',
    estImpressions: '25,000 - 50,000',
    features: [
      'In-Feed Native Ad Card Placement',
      'Target Local State / Sport Category',
      'Basic Click & Impression Analytics',
      'Direct Website / Landing Page Link',
      'Standard Support'
    ],
    recommendedFor: 'Local Training Academies, Regional Gyms, Gear Shops',
    color: 'emerald'
  },
  {
    id: 'regional-mvp',
    name: 'Regional MVP',
    price: 750,
    period: 'month',
    estImpressions: '100,000 - 250,000',
    features: [
      'Header Leaderboard Banner across Media Hub',
      'Recruiter Matrix Sidebar Featured Placement',
      'Featured Sponsor Badge on Event Pages',
      'Includes 1 Sponsored Blog / News Article',
      'Real-time Analytics Dashboard'
    ],
    recommendedFor: 'College Prep Programs, Orthopedic Clinics, National Apparel',
    badge: 'MOST POPULAR',
    color: 'neon'
  },
  {
    id: 'headline-partner',
    name: 'Headline Partner',
    price: 2500,
    period: 'month',
    estImpressions: '500,000+',
    features: [
      'Exclusive Tournament Bracket Header Takeover',
      'Custom Video Pre-roll in Live Streams',
      'Dedicated QR Check-in Receipt Logo',
      'Category Exclusivity (e.g. Sole Hydration Sponsor)',
      'Dedicated Account Manager & Monthly Reports'
    ],
    recommendedFor: 'Major Sports Brands, Hydration Companies, Financial Institutions',
    badge: 'MAXIMUM IMPACT',
    color: 'amber'
  }
];

export const AdvertiseWithUsView: React.FC<{ onOpenTab?: (tab: string) => void }> = ({ onOpenTab }) => {
  const { user, profile } = useAuth();

  // Campaign Form State
  const [selectedTier, setSelectedTier] = useState<string>('regional-mvp');
  const [brandName, setBrandName] = useState('');
  const [contactEmail, setContactEmail] = useState(user?.email || '');
  const [contactPhone, setContactPhone] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('https://');
  const [headline, setHeadline] = useState('');
  const [subheadline, setSubheadline] = useState('');
  const [ctaText, setCtaText] = useState('GET STARTED');
  const [placementPosition, setPlacementPosition] = useState<AdPlacementPosition>('header-leaderboard');
  const [targetSport, setTargetSport] = useState('All Sports');
  const [durationWeeks, setDurationWeeks] = useState<number>(4);
  const [imageUrl, setImageUrl] = useState('https://images.unsplash.com/photo-1517649763962-0c623266010b?w=1200&auto=format&fit=crop&q=80');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  // File upload for ad banner
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file, { maxWidth: 1200, maxHeight: 800, quality: 0.82 });
      const reader = new FileReader();
      reader.onload = () => {
        setImageUrl(reader.result as string);
      };
      reader.readAsDataURL(compressed);
    } catch (err) {
      console.warn('Image compression fallback in AdvertiseWithUsView:', err);
      const reader = new FileReader();
      reader.onload = () => {
        setImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Estimated Calculations
  const calculatedCost = Math.round((durationWeeks / 4) * (selectedTier === 'starter-local' ? 250 : selectedTier === 'regional-mvp' ? 750 : 2500));
  const estimatedViews = Math.round(durationWeeks * 12500 * (selectedTier === 'starter-local' ? 1 : selectedTier === 'regional-mvp' ? 3 : 10));

  const handleSubmitCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandName.trim() || !contactEmail.trim() || !headline.trim()) {
      alert('Please complete Brand Name, Email, and Ad Headline.');
      return;
    }

    setIsSubmitting(true);
    try {
      await adService.submitCampaign({
        brandName: brandName.trim(),
        contactEmail: contactEmail.trim(),
        contactPhone: contactPhone.trim(),
        websiteUrl: websiteUrl.trim(),
        headline: headline.trim(),
        subheadline: subheadline.trim(),
        ctaText: ctaText.trim() || 'LEARN MORE',
        imageUrl,
        placementPosition,
        format: placementPosition.includes('sidebar') ? 'rectangle' : 'leaderboard',
        targetSport,
        status: 'pending',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + durationWeeks * 7 * 86400000).toISOString().split('T')[0],
        budget: calculatedCost,
        tier: AD_PACKAGE_TIERS.find(t => t.id === selectedTier)?.name as any || 'Regional MVP',
        creatorUid: user?.uid
      });

      setSubmittedSuccess(true);
    } catch (err) {
      console.error('Ad submission error:', err);
      alert('Failed to submit campaign request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-12 pb-16 text-slate-100 max-w-6xl mx-auto">
      
      {/* Hero Header Pitch */}
      <div className="relative rounded-3xl bg-gradient-to-br from-[#212A31] via-black to-[#212A31] border border-[#E5B868]/30 p-8 sm:p-12 overflow-hidden shadow-[0_0_50px_rgba(214,28,36,0.15)]">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#E5B868]/10 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E5B868]/10 border border-[#E5B868]/40 text-[#E5B868] text-xs font-mono font-bold uppercase tracking-wider">
            <Zap className="w-3.5 h-3.5" /> JUST1PLAY ADVERTISING NETWORK
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tight leading-none">
            REACH THE NEXT GENERATION OF <span className="text-[#E5B868]">ATHLETES & FAMILIES</span>
          </h1>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Promote your brand directly to thousands of high school athletes, collegiate scouts, club coaches, and sports parents across the country. High-visibility banners, sponsored event takeovers, and native video placements.
          </p>

          {/* Quick Audience Stats Bar */}
          <div className="pt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-white/10">
            <div>
              <span className="text-2xl font-black text-[#E5B868] font-mono">50K+</span>
              <span className="text-[10px] text-slate-400 font-mono uppercase block">Monthly Active Athletes</span>
            </div>
            <div>
              <span className="text-2xl font-black text-slate-300 font-mono">1.2M</span>
              <span className="text-[10px] text-slate-400 font-mono uppercase block">Monthly Page Views</span>
            </div>
            <div>
              <span className="text-2xl font-black text-red-500 font-mono">2,400+</span>
              <span className="text-[10px] text-slate-400 font-mono uppercase block">College Scouts & Coaches</span>
            </div>
            <div>
              <span className="text-2xl font-black text-amber-400 font-mono">8.4%</span>
              <span className="text-[10px] text-slate-400 font-mono uppercase block">Average Ad CTR</span>
            </div>
          </div>
        </div>
      </div>

      {/* Package Pricing Tiers */}
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-black text-white uppercase tracking-tight flex items-center justify-center gap-2">
            <DollarSign className="w-6 h-6 text-[#E5B868]" /> ADVERTISING PACKAGES & SPONSORSHIPS
          </h2>
          <p className="text-xs text-slate-400 font-mono uppercase">
            Transparent pricing • Custom targeting • Guaranteed impressions
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {AD_PACKAGE_TIERS.map((tier) => {
            const isSelected = selectedTier === tier.id;
            return (
              <div
                key={tier.id}
                onClick={() => setSelectedTier(tier.id)}
                className={`relative rounded-3xl border p-6 flex flex-col justify-between transition-all cursor-pointer ${
                  isSelected 
                    ? 'border-[#E5B868] bg-black/90 shadow-[0_0_30px_rgba(214,28,36,0.25)] scale-[1.02]' 
                    : 'border-white/15 bg-black/60 hover:border-white/30'
                }`}
              >
                {tier.badge && (
                  <span className="absolute -top-3 right-6 px-3 py-0.5 rounded-full bg-[#E5B868] text-black text-[9px] font-black uppercase tracking-wider shadow-[0_0_10px_rgba(214,28,36,0.5)]">
                    {tier.badge}
                  </span>
                )}

                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-black uppercase text-white tracking-tight">{tier.name}</h3>
                    <p className="text-[11px] text-slate-400 font-mono mt-1">{tier.recommendedFor}</p>
                  </div>

                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-[#E5B868] font-mono">${tier.price}</span>
                    <span className="text-xs text-slate-400 font-mono">/ {tier.period}</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-mono text-cyan-300 flex items-center justify-between">
                    <span>Est. Impressions:</span>
                    <span className="font-bold text-white">{tier.estImpressions}</span>
                  </div>

                  <ul className="space-y-2 pt-2 border-t border-white/10">
                    {tier.features.map((feat, i) => (
                      <li key={i} className="text-xs text-slate-300 flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#E5B868] shrink-0" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  type="button"
                  className={`mt-6 w-full py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all ${
                    isSelected
                      ? 'bg-[#E5B868] text-black shadow-[0_0_15px_rgba(214,28,36,0.4)]'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  {isSelected ? 'SELECTED PACKAGE' : 'SELECT PACKAGE'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Interactive Ad Campaign Submission Form & Live Simulator */}
      <div className="rounded-3xl border border-white/15 bg-black/80 p-6 sm:p-10 backdrop-blur-2xl space-y-8">
        <div className="flex items-center justify-between flex-wrap gap-4 border-b border-white/10 pb-6">
          <div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-2">
              <Target className="w-6 h-6 text-[#E5B868]" /> SELF-SERVICE AD CAMPAIGN BUILDER
            </h2>
            <p className="text-xs text-slate-400 font-mono">
              Build your custom banner, upload creative, set targeting, and submit your campaign.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-[#E5B868]/10 border border-[#E5B868]/40 px-4 py-2 rounded-2xl">
            <BarChart3 className="w-4 h-4 text-[#E5B868]" />
            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase font-mono block">Estimated Cost</span>
              <span className="text-lg font-black text-[#E5B868] font-mono">${calculatedCost} USD</span>
            </div>
          </div>
        </div>

        {submittedSuccess ? (
          <div className="p-8 rounded-2xl bg-[#E5B868]/10 border border-[#E5B868]/50 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-[#E5B868] text-black flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(214,28,36,0.6)]">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-black uppercase text-white">AD CAMPAIGN SUBMITTED SUCCESSFULLY!</h3>
            <p className="text-xs text-slate-300 max-w-md mx-auto">
              Our advertising team has received your campaign for <strong className="text-white">{brandName}</strong>. You will receive an invoice and approval notification at <strong className="text-[#E5B868]">{contactEmail}</strong> within 24 hours.
            </p>
            <button
              onClick={() => {
                setSubmittedSuccess(false);
                setBrandName('');
                setHeadline('');
              }}
              className="px-6 py-2.5 rounded-xl bg-[#E5B868] text-black font-black text-xs uppercase tracking-wider"
            >
              CREATE ANOTHER AD CAMPAIGN
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmitCampaign} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Left Form Inputs */}
            <div className="space-y-4">
              <h3 className="text-sm font-black text-[#E5B868] font-mono uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4" /> 1. BRAND & CAMPAIGN DETAILS
              </h3>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-300 font-mono">Brand / Organization Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Gatorade, East Coast Basketball League"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#121212] border border-white/15 rounded-xl text-xs text-white focus:border-[#E5B868] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-300 font-mono">Contact Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="sponsors@yourbrand.com"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#121212] border border-white/15 rounded-xl text-xs text-white focus:border-[#E5B868] focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-300 font-mono">Phone (Optional)</label>
                  <input
                    type="text"
                    placeholder="(555) 123-4567"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#121212] border border-white/15 rounded-xl text-xs text-white focus:border-[#E5B868] focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-300 font-mono">Destination Landing URL *</label>
                <input
                  type="url"
                  required
                  placeholder="https://yourwebsite.com/offer"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#121212] border border-white/15 rounded-xl text-xs text-white focus:border-[#E5B868] focus:outline-none"
                />
              </div>

              <h3 className="text-sm font-black text-[#E5B868] font-mono uppercase tracking-wider flex items-center gap-2 pt-2">
                <ImageIcon className="w-4 h-4" /> 2. AD COPY & CREATIVE BANNER
              </h3>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-300 font-mono">Ad Headline * (Catchy offer)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. OFFICIAL HYDRATION PARTNER - 20% OFF EQUIPMENT"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#121212] border border-white/15 rounded-xl text-xs text-white focus:border-[#E5B868] focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-300 font-mono">Subheadline / Body Text</label>
                <input
                  type="text"
                  placeholder="Fuel your athletic goals with certified sports nutrition."
                  value={subheadline}
                  onChange={(e) => setSubheadline(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#121212] border border-white/15 rounded-xl text-xs text-white focus:border-[#E5B868] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-300 font-mono">Button CTA Text</label>
                  <input
                    type="text"
                    placeholder="LEARN MORE"
                    value={ctaText}
                    onChange={(e) => setCtaText(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#121212] border border-white/15 rounded-xl text-xs text-white focus:border-[#E5B868] focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-300 font-mono">Placement Slot</label>
                  <select
                    value={placementPosition}
                    onChange={(e) => setPlacementPosition(e.target.value as AdPlacementPosition)}
                    className="w-full px-3.5 py-2.5 bg-[#121212] border border-white/15 rounded-xl text-xs text-white focus:border-[#E5B868] focus:outline-none"
                  >
                    <option value="header-leaderboard">Header Leaderboard (728x90)</option>
                    <option value="home-feed">Home Social Feed Card (Native)</option>
                    <option value="events-top">Tournament Header Banner</option>
                    <option value="recruiter-sidebar">Recruiter Matrix Sidebar</option>
                  </select>
                </div>
              </div>

              {/* Banner Upload / Preset */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold uppercase text-slate-300 font-mono">Ad Creative Image</label>
                  <label className="px-3 py-1 bg-[#E5B868]/10 border border-[#E5B868]/40 text-[#E5B868] text-[10px] font-bold uppercase rounded-lg cursor-pointer flex items-center gap-1.5 hover:bg-[#E5B868]/20 transition-colors">
                    <Upload className="w-3.5 h-3.5" /> Upload File
                    <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                  </label>
                </div>
                <input
                  type="url"
                  placeholder="Or enter image URL..."
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#121212] border border-white/10 rounded-xl text-xs text-slate-300 focus:outline-none"
                />
              </div>

              <div className="space-y-1 pt-2">
                <label className="text-[10px] font-bold uppercase text-slate-300 font-mono">Campaign Duration (Weeks)</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 4, 8, 12].map((wk) => (
                    <button
                      key={wk}
                      type="button"
                      onClick={() => setDurationWeeks(wk)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all ${
                        durationWeeks === wk 
                          ? 'bg-[#E5B868] text-black shadow-[0_0_10px_rgba(214,28,36,0.4)]' 
                          : 'bg-white/5 border border-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      {wk} {wk === 1 ? 'Wk' : 'Wks'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Live Ad Preview & Submit Box */}
            <div className="space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <h3 className="text-sm font-black text-[#E5B868] font-mono uppercase tracking-wider flex items-center gap-2">
                  <Eye className="w-4 h-4" /> 3. LIVE AD PREVIEW SIMULATOR
                </h3>

                <div className="p-4 rounded-2xl bg-[#212A31] border border-white/15 space-y-3 shadow-2xl">
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 uppercase">
                    <span>Selected Slot: {placementPosition}</span>
                    <span className="text-[#E5B868]">Live Render</span>
                  </div>

                  {/* Banner Render */}
                  <div className="rounded-2xl border border-[#E5B868]/40 bg-black p-4 relative overflow-hidden">
                    <div 
                      className="absolute inset-0 bg-cover bg-center opacity-25" 
                      style={{ backgroundImage: `url(${imageUrl})` }}
                    />
                    <div className="relative z-10 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded bg-[#E5B868] text-black font-black text-[9px] uppercase">
                          SPONSORED
                        </span>
                        <span className="text-[10px] font-mono text-[#E5B868] font-bold">
                          {brandName || 'YOUR BRAND NAME'}
                        </span>
                      </div>

                      <h4 className="text-sm font-black uppercase text-white line-clamp-2">
                        {headline || 'YOUR CATCHY AD HEADLINE GOES HERE'}
                      </h4>
                      <p className="text-xs text-slate-300 line-clamp-2">
                        {subheadline || 'Your description line highlighting your products, services, or tournament event promotions.'}
                      </p>

                      <div className="pt-2 flex justify-end">
                        <button
                          type="button"
                          className="px-4 py-2 rounded-xl bg-[#E5B868] text-black font-black text-xs uppercase flex items-center gap-1 shadow-[0_0_12px_rgba(214,28,36,0.5)]"
                        >
                          <span>{ctaText || 'LEARN MORE'}</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Estimate Summary */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-300">
                    <span>Package Tier:</span>
                    <strong className="text-white uppercase">{AD_PACKAGE_TIERS.find(t => t.id === selectedTier)?.name}</strong>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Est. Impressions:</span>
                    <strong className="text-slate-300 font-mono">{estimatedViews.toLocaleString()} Views</strong>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Duration:</span>
                    <strong className="text-white font-mono">{durationWeeks} Weeks</strong>
                  </div>
                  <div className="pt-2 border-t border-white/10 flex justify-between items-baseline text-sm">
                    <span className="font-bold text-white">Total Campaign Budget:</span>
                    <strong className="text-xl font-black text-[#E5B868] font-mono">${calculatedCost} USD</strong>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 rounded-2xl bg-[#E5B868] hover:bg-[#B8141B] text-black font-black text-sm uppercase tracking-wider shadow-[0_0_25px_rgba(214,28,36,0.4)] flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>SUBMITTING AD CAMPAIGN...</span>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>SUBMIT AD CAMPAIGN FOR APPROVAL (${calculatedCost})</span>
                  </>
                )}
              </button>
            </div>

          </form>
        )}
      </div>

    </div>
  );
};
