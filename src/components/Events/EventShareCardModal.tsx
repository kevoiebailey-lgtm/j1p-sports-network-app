import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Share2, Copy, Check, ExternalLink, Calendar, MapPin, Building2, QrCode, ShieldCheck, Trophy, Sparkles, Flame } from 'lucide-react';
import { EventItem, Tournament } from '../../types';

interface EventShareCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  event?: EventItem | null;
  tournament?: Tournament | null;
}

export const EventShareCardModal: React.FC<EventShareCardModalProps> = ({
  isOpen,
  onClose,
  event,
  tournament
}) => {
  const [copied, setCopied] = useState(false);
  const [cardTheme, setCardTheme] = useState<'neon' | 'gold' | 'cyber'>('neon');

  if (!isOpen || (!event && !tournament)) return null;

  const title = event ? event.title : tournament?.name || 'Just1Play Official Event';
  const sport = event ? event.sport : tournament?.sport || 'All Sports';
  const location = event ? event.location : tournament?.venueName || 'Just1Play Main Complex';
  const dateStr = event ? `${event.date} • ${event.time}` : `${tournament?.startDate} - ${tournament?.endDate}`;
  const organizer = event ? event.organizer : 'Just1Play Scouting Network';
  const eventType = event ? event.eventType : 'TOURNAMENT MATRIX';
  const price = event ? (event.price === 0 ? 'FREE ENTRY' : `$${event.price}`) : 'OFFICIAL BRACKETS';

  const targetId = event?.id || tournament?.id;
  const shareUrl = targetId ? `${window.location.origin}/events/${targetId}` : window.location.href;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="w-full max-w-xl rounded-3xl bg-[#212A31] border-2 border-[#E5B868]/50 p-6 space-y-5 shadow-[0_0_50px_rgba(214,28,36,0.3)] relative text-left"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-2xl bg-[#E5B868]/20 text-[#E5B868] border border-[#E5B868]/40 shadow-[0_0_15px_rgba(214,28,36,0.4)]">
                <Share2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black italic uppercase text-white tracking-tight flex items-center gap-2">
                  <span>BRANDED EVENT MATRIX CARD</span>
                  <span className="px-2 py-0.5 rounded bg-[#E5B868]/20 text-[#E5B868] text-[10px] font-mono">16:9 EXPORT</span>
                </h3>
                <p className="text-[11px] text-slate-400 font-mono">
                  Optimized for Social Posts, Scout Passes &amp; Recruiter Invites
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

          {/* Theme Selector */}
          <div className="flex items-center justify-between gap-2 bg-black/50 p-1.5 rounded-2xl border border-white/10">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase pl-2">Matrix Theme:</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCardTheme('neon')}
                className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase transition-all cursor-pointer ${
                  cardTheme === 'neon'
                    ? 'bg-[#E5B868] text-black shadow-[0_0_10px_#E5B868]'
                    : 'bg-white/5 text-slate-400 hover:text-white'
                }`}
              >
                Matrix Green
              </button>
              <button
                onClick={() => setCardTheme('gold')}
                className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase transition-all cursor-pointer ${
                  cardTheme === 'gold'
                    ? 'bg-amber-400 text-black shadow-[0_0_10px_#f59e0b]'
                    : 'bg-white/5 text-slate-400 hover:text-white'
                }`}
              >
                D1 Gold
              </button>
              <button
                onClick={() => setCardTheme('cyber')}
                className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase transition-all cursor-pointer ${
                  cardTheme === 'cyber'
                    ? 'bg-slate-600 text-black shadow-[0_0_10px_#22d3ee]'
                    : 'bg-white/5 text-slate-400 hover:text-white'
                }`}
              >
                Cyber Blue
              </button>
            </div>
          </div>

          {/* 16:9 DYNAMIC EVENT GRAPHIC */}
          <div className={`relative aspect-[16/9] w-full rounded-2xl overflow-hidden border-2 p-5 flex flex-col justify-between shadow-2xl transition-all ${
            cardTheme === 'neon'
              ? 'bg-gradient-to-br from-[#212A31] via-[#212A31] to-black border-[#E5B868]/60 shadow-[0_0_30px_rgba(214,28,36,0.2)]'
              : cardTheme === 'gold'
              ? 'bg-gradient-to-br from-[#181205] via-[#241A08] to-black border-amber-500/60 shadow-[0_0_30px_rgba(245,158,11,0.2)]'
              : 'bg-gradient-to-br from-[#212A31] via-[#212A31] to-black border-cyan-500/60 shadow-[0_0_30px_rgba(34,211,238,0.2)]'
          }`}>
            <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px] opacity-10 pointer-events-none" />

            {/* Top Bar */}
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${
                  cardTheme === 'neon'
                    ? 'bg-[#E5B868] text-black shadow-[0_0_10px_#E5B868]'
                    : cardTheme === 'gold'
                    ? 'bg-amber-400 text-black shadow-[0_0_10px_#f59e0b]'
                    : 'bg-slate-600 text-black shadow-[0_0_10px_#22d3ee]'
                }`}>
                  J1P
                </div>
                <div>
                  <div className="text-xs font-black italic tracking-widest text-white uppercase font-sans">
                    JUST<span className={
                      cardTheme === 'neon' ? 'text-[#E5B868]' : cardTheme === 'gold' ? 'text-amber-400' : 'text-slate-300'
                    }>1</span>PLAY
                  </div>
                  <div className="text-[9px] font-mono text-slate-400 uppercase">OFFICIAL EVENT MATRIX</div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/70 border border-white/20 text-[10px] font-mono text-white font-bold uppercase">
                <ShieldCheck className={`w-3.5 h-3.5 ${
                  cardTheme === 'neon' ? 'text-[#E5B868]' : cardTheme === 'gold' ? 'text-amber-400' : 'text-slate-300'
                }`} />
                <span>{price}</span>
              </div>
            </div>

            {/* Event Info */}
            <div className="relative z-10 my-auto space-y-2">
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase font-mono ${
                  cardTheme === 'neon' ? 'bg-[#E5B868]/20 text-[#E5B868]' : cardTheme === 'gold' ? 'bg-amber-400/20 text-amber-400' : 'bg-slate-600/20 text-slate-300'
                }`}>
                  {eventType}
                </span>
                <span className="text-xs font-mono text-slate-300 uppercase font-bold">• {sport}</span>
              </div>

              <h2 className="text-xl sm:text-2xl font-black italic uppercase text-white tracking-tight line-clamp-2">
                {title}
              </h2>

              <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-slate-300">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#E5B868]" />
                  <span>{dateStr}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-300" />
                  <span className="truncate max-w-[200px]">{location}</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-white/10 pt-2 relative z-10">
              <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-amber-400" />
                <span>HOST: {organizer}</span>
              </div>

              <div className="p-1 rounded bg-white text-black font-black">
                <QrCode className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Share Actions */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <button
              onClick={handleCopyLink}
              className="w-full py-3 rounded-2xl bg-[#E5B868] hover:bg-[#F59E0B] text-black font-black uppercase text-xs tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(229,184,104,0.3)] cursor-pointer transition-all"
            >
              {copied ? <Check className="w-4 h-4 stroke-[3]" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'EVENT MATRIX LINK COPIED!' : 'COPY EVENT LINK'}</span>
            </button>

            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: `${title} - Just1Play Event`,
                    text: `Join us at ${title} (${sport}) on Just1Play!`,
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
