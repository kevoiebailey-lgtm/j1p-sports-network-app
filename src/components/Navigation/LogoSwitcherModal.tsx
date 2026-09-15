import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Check, 
  Sparkles, 
  Shield, 
  Zap, 
  Type, 
  Upload, 
  Image as ImageIcon,
  CheckCircle2
} from 'lucide-react';
import { useLogo, LOGO_OPTIONS, LogoStyle } from '../../context/LogoContext';
import { triggerHaptic } from '../../lib/haptics';
import { compressImage } from '../../lib/imageCompressor';

export const LogoSwitcherModal: React.FC = () => {
  const { 
    logoStyle, 
    customLogoUrl, 
    isSwitcherOpen, 
    setLogoStyle, 
    setCustomLogoUrl, 
    closeLogoSwitcher 
  } = useLogo();

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isSwitcherOpen) return null;

  const handleCustomLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    triggerHaptic('light');
    try {
      const compressed = await compressImage(file, { maxWidth: 400, maxHeight: 400, quality: 0.9 });
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        setCustomLogoUrl(dataUrl);
        setLogoStyle('custom');
      };
      reader.readAsDataURL(compressed);
    } catch (err) {
      console.warn('Logo upload reader error:', err);
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        setCustomLogoUrl(dataUrl);
        setLogoStyle('custom');
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-hidden">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', damping: 25, stiffness: 280 }}
        className="relative w-full max-w-md mx-auto my-auto max-h-[92dvh] overflow-y-auto no-scrollbar rounded-2xl sm:rounded-3xl bg-[#161C22] border border-slate-700/80 shadow-[0_25px_60px_rgba(0,0,0,0.9)] flex flex-col"
      >

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-[#161C22]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#FF6A00]/15 text-[#FF6A00] border border-[#FF6A00]/30 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider">
                Brand Logo Switcher
              </h3>
              <p className="text-[10px] text-slate-400 font-mono">Switch application brand emblem & theme style</p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeLogoSwitcher}
            className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Options List */}
        <div className="p-5 space-y-3 max-h-[75vh] overflow-y-auto">
          {LOGO_OPTIONS.map((option) => {
            const isSelected = logoStyle === option.id;

            return (
              <div
                key={option.id}
                onClick={() => {
                  triggerHaptic('light');
                  setLogoStyle(option.id);
                  if (option.id === 'custom' && !customLogoUrl) {
                    fileInputRef.current?.click();
                  }
                }}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center gap-3.5 ${
                  isSelected
                    ? 'bg-[#1E2630] border-[#FF6A00] shadow-[0_0_15px_rgba(255,106,0,0.25)]'
                    : 'bg-[#161C22] border-slate-800 hover:border-slate-700 hover:bg-[#1A222B]'
                }`}
              >
                {/* Visual Representation Icon */}
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border border-white/10 bg-gradient-to-tr ${option.previewClass}`}>
                  {option.id === 'crest' && <Shield className="w-6 h-6 stroke-[2.5]" />}
                  {option.id === 'cyber' && <Zap className="w-6 h-6 stroke-[2.5]" />}
                  {option.id === 'minimal' && <Type className="w-6 h-6 stroke-[2.5]" />}
                  {option.id === 'custom' && (
                    customLogoUrl ? (
                      <img src={customLogoUrl} alt="Custom Logo" className="w-full h-full object-contain rounded-lg p-1" />
                    ) : (
                      <ImageIcon className="w-6 h-6 stroke-[2]" />
                    )
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-white tracking-wide">{option.name}</span>
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-white/10 text-slate-300">
                      {option.badge}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed truncate">{option.description}</p>
                  
                  {option.id === 'custom' && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      className="mt-1.5 text-[10px] font-mono text-[#FF6A00] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Upload className="w-3 h-3" />
                      <span>{customLogoUrl ? 'Change custom logo photo' : 'Upload custom logo image'}</span>
                    </button>
                  )}
                </div>

                {/* Radio selection indicator */}
                <div className={`w-6 h-6 rounded-full flex items-center justify-center border transition-colors shrink-0 ${
                  isSelected ? 'bg-[#FF6A00] border-[#FF6A00] text-white' : 'border-slate-700 bg-slate-800/40'
                }`}>
                  {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
              </div>
            );
          })}
        </div>

        {/* Hidden file input for custom team logo */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleCustomLogoUpload}
          className="hidden"
        />

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-[#11161B] flex items-center justify-between">
          <span className="text-[10px] font-mono text-slate-400">
            Selected: <strong className="text-white uppercase">{logoStyle}</strong>
          </span>
          <button
            type="button"
            onClick={closeLogoSwitcher}
            className="px-4 py-2 rounded-xl bg-[#FF6A00] hover:bg-[#E55F00] text-white text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer shadow-[0_0_15px_rgba(255,106,0,0.4)]"
          >
            Apply & Close
          </button>
        </div>
      </motion.div>
    </div>
  );
};
