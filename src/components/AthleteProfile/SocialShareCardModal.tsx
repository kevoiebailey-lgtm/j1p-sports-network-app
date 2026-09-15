import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Share2, Copy, Check, Download, ExternalLink, Sparkles, Trophy, QrCode, Flame, ShieldCheck, Layers } from 'lucide-react';
import { UserProfile } from '../../types';
import { VerifiedBadge } from '../Common/VerifiedBadge';
import { CardTheme, PREBUILT_THEMES } from '../../types/cardTheme';
import { CardThemePicker } from '../cards/CardThemePicker';
import { SportsTemplateEngine, PlayerData } from '../cards/SportsTemplateEngine';

interface SocialShareCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
}

export const SocialShareCardModal: React.FC<SocialShareCardModalProps> = ({
  isOpen,
  onClose,
  profile
}) => {
  const [copied, setCopied] = useState(false);
  const [selectedThemeId, setSelectedThemeId] = useState<string>('apex_holographic');
  const [showThemePicker, setShowThemePicker] = useState<boolean>(true);
  const [cardFormat, setCardFormat] = useState<'svg_vector' | 'banner_16_9'>('svg_vector');
  const svgRef = useRef<SVGSVGElement>(null);

  if (!isOpen) return null;

  const currentTheme = PREBUILT_THEMES[selectedThemeId] || PREBUILT_THEMES.apex_holographic;
  const shareUrl = `${window.location.origin}/athlete/${profile.uid}`;

  const playerData: PlayerData = {
    name: profile.displayName || 'Prospect Athlete',
    jerseyNumber: (profile as any).jerseyNumber?.replace('#', '') || '07',
    position: profile.position || 'ATH',
    team: (profile as any).school || (profile as any).teamName || 'JUST1PLAY',
    photoUrl: profile.photoURL || profile.avatarUrl,
    stats: {
      label1: '40Y Dash',
      value1: (profile as any).metrics?.dash40 ? `${(profile as any).metrics.dash40}s` : '4.42s',
      label2: 'Vertical',
      value2: (profile as any).metrics?.vertLeap ? `${(profile as any).metrics.vertLeap}"` : '36.5"',
      label3: 'Height',
      value3: profile.height || '6\'1"',
      label4: 'GPA',
      value4: profile.gpa ? `${profile.gpa}` : '3.85',
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadSvg = () => {
    if (!svgRef.current) return;
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);
    const downloadLink = document.createElement('a');
    downloadLink.href = svgUrl;
    downloadLink.download = `${(profile.displayName || 'athlete').toLowerCase().replace(/\s+/g, '_')}_${selectedThemeId}_card.svg`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(svgUrl);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="w-full max-w-2xl rounded-3xl bg-[#212A31] border-2 border-[#E5B868]/50 p-6 space-y-4 shadow-[0_0_50px_rgba(214,28,36,0.3)] relative text-left max-h-[92vh] overflow-y-auto"
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-2.5">
              <div 
                className="p-2.5 rounded-2xl text-black font-black"
                style={{ backgroundColor: currentTheme.accentColor }}
              >
                <Share2 className="w-5 h-5 text-black" />
              </div>
              <div>
                <h3 className="text-base font-black italic uppercase text-white tracking-tight flex items-center gap-2">
                  <span>BRANDED RECRUIT SOCIAL CARD</span>
                  <span 
                    className="px-2 py-0.5 rounded text-[10px] font-mono border"
                    style={{ color: currentTheme.accentColor, borderColor: `${currentTheme.accentColor}60` }}
                  >
                    {cardFormat === 'svg_vector' ? 'VECTOR SVG 4:5' : '16:9 BANNER'}
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400 font-mono">
                  Theme: {currentTheme.name} ({currentTheme.category.replace('_', ' ')})
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Format Switcher */}
          <div className="flex items-center justify-between gap-2 bg-black/40 p-1.5 rounded-2xl border border-white/10">
            <span className="text-[11px] font-mono font-bold text-slate-400 uppercase pl-2 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5" />
              <span>Card Layout:</span>
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCardFormat('svg_vector')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  cardFormat === 'svg_vector'
                    ? 'bg-slate-700 text-white shadow-sm border border-slate-600'
                    : 'bg-transparent text-slate-400 hover:text-white'
                }`}
              >
                Vector Trading Card (SVG)
              </button>
              <button
                type="button"
                onClick={() => setCardFormat('banner_16_9')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  cardFormat === 'banner_16_9'
                    ? 'bg-slate-700 text-white shadow-sm border border-slate-600'
                    : 'bg-transparent text-slate-400 hover:text-white'
                }`}
              >
                16:9 Landscape Banner
              </button>
            </div>
          </div>

          {/* Theme Selector */}
          <div className="bg-black/50 p-3 rounded-2xl border border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-slate-300 uppercase flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" style={{ color: currentTheme.accentColor }} />
                <span>Card Theme ({Object.keys(PREBUILT_THEMES).length} Prebuilt Themes):</span>
              </span>
              <button
                type="button"
                onClick={() => setShowThemePicker(!showThemePicker)}
                className="text-[11px] text-slate-400 hover:text-white underline cursor-pointer"
              >
                {showThemePicker ? 'Collapse Themes' : 'Change Theme'}
              </button>
            </div>

            {showThemePicker && (
              <CardThemePicker
                selectedThemeId={selectedThemeId}
                onSelectTheme={(theme) => setSelectedThemeId(theme.id)}
              />
            )}
          </div>

          {/* CARD CANVAS PREVIEW (SVG Vector 4:5 or 16:9 Banner) */}
          {cardFormat === 'svg_vector' ? (
            <div className="flex flex-col items-center justify-center p-3 bg-slate-950/70 rounded-2xl border border-white/10 overflow-hidden">
              <div className="w-full max-w-sm">
                <SportsTemplateEngine
                  ref={svgRef}
                  player={playerData}
                  themeId={selectedThemeId}
                  className="w-full h-auto drop-shadow-2xl"
                />
              </div>
            </div>
          ) : (
            <div 
              className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden border-2 p-5 flex flex-col justify-between shadow-2xl transition-all"
              style={{
                borderColor: currentTheme.accentColor,
                boxShadow: `0 0 35px ${currentTheme.glowColor}`
              }}
            >
              {/* Backdrop Image */}
              <div
                className="absolute inset-0 bg-cover bg-center pointer-events-none opacity-45 transition-all duration-500"
                style={{ backgroundImage: `url(${currentTheme.backdropUrl})` }}
              />

              {/* Dark gradient for legibility */}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/60 pointer-events-none" />

              {/* Optional Overlay */}
              {currentTheme.overlayUrl && (
                <div
                  className="absolute inset-0 bg-cover bg-center mix-blend-screen opacity-50 pointer-events-none"
                  style={{ backgroundImage: `url(${currentTheme.overlayUrl})` }}
                />
              )}

              {/* Card Header: Just1Play Brand + Verified Status */}
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs text-black shadow-md"
                    style={{ 
                      backgroundColor: currentTheme.accentColor,
                      transform: `rotate(${currentTheme.bannerAngle}deg)`
                    }}
                  >
                    J1P
                  </div>
                  <div>
                    <div 
                      className="text-xs font-black tracking-widest text-white uppercase font-sans"
                      style={{ fontStyle: currentTheme.fontStyle }}
                    >
                      JUST<span style={{ color: currentTheme.accentColor }}>1</span>PLAY
                    </div>
                    <div className="text-[9px] font-mono text-slate-400 uppercase">
                      {currentTheme.name} Series • {currentTheme.sport}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/70 border border-white/20 text-[10px] font-mono text-white font-bold uppercase backdrop-blur-md">
                  <ShieldCheck className="w-3.5 h-3.5" style={{ color: currentTheme.accentColor }} />
                  <span>VERIFIED ATHLETE</span>
                </div>
              </div>

              {/* Card Center: Athlete Avatar + Name + Stats */}
              <div className="flex items-center gap-4 relative z-10 my-auto">
                <img
                  src={profile.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'}
                  alt={profile.displayName}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-2 shadow-2xl"
                  style={{ borderColor: currentTheme.accentColor }}
                />

                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 
                      className="text-xl sm:text-2xl font-black uppercase text-white tracking-tight"
                      style={{ fontStyle: currentTheme.fontStyle }}
                    >
                      {profile.displayName}
                    </h2>
                    <VerifiedBadge size="sm" />
                  </div>

                  <p className="text-xs font-mono font-bold text-slate-300">
                    <span style={{ color: currentTheme.accentColor }}>
                      {profile.sport}
                    </span>
                    {' '}• {profile.position} • CLASS OF {profile.gradYear}
                  </p>

                  <p className="text-[11px] text-slate-400 font-sans truncate">
                    {profile.highSchool} ({profile.state})
                  </p>

                  {/* Stat Highlights Row */}
                  <div className="flex items-center gap-2 pt-1">
                    <div className="px-2 py-0.5 rounded bg-white/10 text-white font-mono text-[10px] font-bold">
                      {profile.height || '6\'2"'} / {profile.weight || '185 lbs'}
                    </div>
                    <div 
                      className="px-2 py-0.5 rounded bg-white/10 font-mono text-[10px] font-bold"
                      style={{ color: currentTheme.accentColor }}
                    >
                      {profile.gpa || '3.8 GPA'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Footer: Call to Action + QR Graphic */}
              <div className="flex items-center justify-between border-t border-white/10 pt-2 relative z-10">
                <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5" style={{ color: currentTheme.accentColor }} />
                  <span>SCAN TO VIEW RECRUIT FILM &amp; FULL MATRIX</span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="p-1 rounded bg-white text-black font-black text-[9px] font-mono">
                    <QrCode className="w-5 h-5" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Share & Download Actions */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            {cardFormat === 'svg_vector' && (
              <button
                type="button"
                onClick={handleDownloadSvg}
                className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase text-xs tracking-wider flex items-center justify-center gap-2 shadow-lg cursor-pointer transition-all shrink-0"
              >
                <Download className="w-4 h-4 stroke-[2.5]" />
                <span>DOWNLOAD SVG</span>
              </button>
            )}

            <button
              onClick={handleCopyLink}
              className="w-full py-3 rounded-2xl bg-[#E5B868] hover:bg-[#B8141B] text-black font-black uppercase text-xs tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(214,28,36,0.5)] cursor-pointer transition-all"
            >
              {copied ? <Check className="w-4 h-4 stroke-[3]" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'DIRECT MATRIX LINK COPIED!' : 'COPY SHARE LINK'}</span>
            </button>

            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: `${profile.displayName} - Just1Play Recruit Profile`,
                    text: `Check out ${profile.displayName} (${profile.sport} Class of ${profile.gradYear}) on Just1Play!`,
                    url: shareUrl
                  }).catch(() => {});
                } else {
                  handleCopyLink();
                }
              }}
              className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold uppercase text-xs tracking-wider border border-white/15 flex items-center justify-center gap-2 cursor-pointer transition-all shrink-0"
            >
              <ExternalLink className="w-4 h-4 text-slate-300" />
              <span>NATIVE SHARE</span>
            </button>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
};
