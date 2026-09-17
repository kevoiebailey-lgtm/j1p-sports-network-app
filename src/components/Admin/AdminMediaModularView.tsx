import React, { useState } from 'react';
import { AdminVideoManagerPage } from './AdminVideoManagerPage';
import { AdminGalleryManagerPage } from './AdminGalleryManagerPage';
import { AdminContentPage } from './AdminContentPage';
import { AdminProdigiPrintDesk } from './AdminProdigiPrintDesk';
import { Video, Camera, ShieldAlert, Film, Printer } from 'lucide-react';

export const AdminMediaModularView: React.FC = () => {
  const [subTab, setSubTab] = useState<'videos' | 'gallery' | 'prints' | 'moderation'>('videos');

  return (
    <div className="space-y-6">
      {/* Sub-navigation for Media Vault */}
      <div className="flex items-center justify-between flex-wrap gap-3 p-3 rounded-2xl bg-[#161C22]/80 backdrop-blur-md border border-[#2D3748]">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Film className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white font-mono uppercase">Media &amp; Vault Central Control</h3>
            <p className="text-xs text-slate-400">Manage 4K highlight reels, full-court photo albums, and user content moderation</p>
          </div>
        </div>

        <div className="flex items-center gap-2 p-1 bg-[#0F141A] rounded-xl border border-[#2D3748]">
          <button
            onClick={() => setSubTab('videos')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
              subTab === 'videos'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>Video Reels &amp; Film</span>
          </button>

          <button
            onClick={() => setSubTab('gallery')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
              subTab === 'gallery'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>4K Photo Albums</span>
          </button>

          <button
            onClick={() => setSubTab('prints')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
              subTab === 'prints'
                ? 'bg-[#00F5D4]/20 text-[#00F5D4] border border-[#00F5D4]/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Prodigi Print Desk</span>
          </button>

          <button
            onClick={() => setSubTab('moderation')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
              subTab === 'moderation'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Content Moderation</span>
          </button>
        </div>
      </div>

      {/* Render Sub-component */}
      <div className="transition-all duration-200">
        {subTab === 'videos' && <AdminVideoManagerPage />}
        {subTab === 'gallery' && <AdminGalleryManagerPage />}
        {subTab === 'prints' && <AdminProdigiPrintDesk />}
        {subTab === 'moderation' && <AdminContentPage />}
      </div>
    </div>
  );
};

export default AdminMediaModularView;
