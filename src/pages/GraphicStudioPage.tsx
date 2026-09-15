import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { GraphicStudioModal } from '../components/PlayCard/GraphicStudioModal';
import { GraphicsPromoBanner } from '../components/PlayCard/GraphicsPromoBanner';
import { GraphicStudioControls } from '../components/PlayCard/GraphicStudioControls';
import { SportsPlayCardView, TEMPLATES, DEFAULT_SPORT_STATS, DEFAULT_SPORT_IMAGES, AthleteCardData } from '../components/PlayCard/SportsTemplateEngine';

export const GraphicStudioPage: React.FC = () => {
  const navigate = useNavigate();
  const [studioOpen, setStudioOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');

  // Interactive sandbox card
  const [sandboxCard, setSandboxCard] = useState<AthleteCardData>({
    athleteName: 'Maya Sterling',
    jerseyNumber: '07',
    teamName: 'Apex All-Stars',
    position: 'Flyer / Base',
    sportCategory: 'Cheer',
    templateId: 'cheer_nova_flare',
    primaryColor: 'magenta',
    stats: DEFAULT_SPORT_STATS.Cheer,
    mediaUrl: DEFAULT_SPORT_IMAGES.Cheer,
    classYear: '2026'
  });

  // Default showcase cards
  const showcaseCards: AthleteCardData[] = [
    {
      athleteName: 'Maya Sterling',
      jerseyNumber: '07',
      teamName: 'Apex All-Stars',
      position: 'Flyer / Base',
      sportCategory: 'Cheer',
      templateId: 'cheer_nova_flare',
      primaryColor: 'magenta',
      stats: DEFAULT_SPORT_STATS.Cheer,
      mediaUrl: DEFAULT_SPORT_IMAGES.Cheer,
      classYear: '2026'
    },
    {
      athleteName: 'Marcus Cole',
      jerseyNumber: '24',
      teamName: 'Cyber Horizon',
      position: 'Point Guard',
      sportCategory: 'Basketball',
      templateId: 'court_matrix_2077',
      primaryColor: 'cyan',
      stats: DEFAULT_SPORT_STATS.Basketball,
      mediaUrl: DEFAULT_SPORT_IMAGES.Basketball,
      classYear: '2026'
    },
    {
      athleteName: 'Jaxson Vance',
      jerseyNumber: '11',
      teamName: 'Apex Gridiron',
      position: 'Quarterback',
      sportCategory: 'Football',
      templateId: 'gridiron_apex_tech',
      primaryColor: 'emerald',
      stats: DEFAULT_SPORT_STATS.Football,
      mediaUrl: DEFAULT_SPORT_IMAGES.Football,
      classYear: '2027'
    }
  ];

  return (
    <div 
      className="w-full min-h-screen bg-[#070A12] text-white pb-32 overflow-y-auto"
      style={{ WebkitOverflowScrolling: 'touch', overscrollBehaviorY: 'contain' }}
    >
      {/* Top Header */}
      <div className="border-b border-[#1E293B] bg-[#0A0D18]/90 backdrop-blur-md sticky top-0 z-20 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-[#00F0D0]" />
            </button>
            <div>
              <h1 className="text-base sm:text-lg font-black uppercase tracking-wider text-white">
                Futuristic Athlete Graphic & Play Card Hub
              </h1>
              <p className="text-xs text-slate-400">
                18 High-Tech SVG/Tailwind Themes • Live HUD Overlays • PNG Canvas Export
              </p>
            </div>
          </div>

          <button
            onClick={() => setStudioOpen(true)}
            className="px-4 py-2 rounded-xl bg-[#00F0D0] hover:bg-[#00d8b8] text-black font-black text-xs font-mono uppercase tracking-wider shadow-[0_0_20px_rgba(0,240,208,0.35)] transition-all cursor-pointer"
          >
            Launch Studio
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-10">
        {/* Hero Promo Banner */}
        <GraphicsPromoBanner onOpenStudio={() => setStudioOpen(true)} />

        {/* Live Play Card Sandbox & Quick Controls */}
        <div className="space-y-6 bg-[#0A0D18]/80 border border-[#1E293B] p-6 sm:p-8 rounded-3xl backdrop-blur-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 pb-4 gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-cyan-400" />
                <h2 className="text-base sm:text-lg font-black uppercase tracking-wider text-white">
                  Live Play Card Quick Editor & HUD Sandbox
                </h2>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-1">
                Powered by GraphicStudioControls • Real-time reactive updates & mobile tab switching
              </p>
            </div>
            <button
              onClick={() => setStudioOpen(true)}
              className="px-4 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer self-start sm:self-auto"
            >
              Open Full 18-Theme Studio →
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start justify-items-center">
            {/* Left: Interactive GraphicStudioControls */}
            <div className={`w-full flex justify-center ${activeTab === 'preview' ? 'hidden lg:flex' : 'flex'}`}>
              <GraphicStudioControls
                cardData={sandboxCard}
                setCardData={setSandboxCard}
                activeTab={activeTab}
                setActiveTab={(tab) => setActiveTab(tab as any)}
              />
            </div>

            {/* Right: Live Card Preview */}
            <div className={`w-full flex flex-col items-center ${activeTab === 'edit' ? 'hidden lg:flex' : 'flex'}`}>
              <div className="w-full max-w-sm flex flex-col items-center">
                <SportsPlayCardView cardData={sandboxCard} />
                <div className="mt-4 flex items-center justify-center gap-3 w-full">
                  <button
                    onClick={() => setActiveTab('edit')}
                    className="lg:hidden px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white font-mono text-xs uppercase"
                  >
                    ← Back to Edit
                  </button>
                  <button
                    onClick={() => setStudioOpen(true)}
                    className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs font-mono uppercase tracking-wider transition-all cursor-pointer"
                  >
                    Customize Theme in Studio
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Featured Showcase Cards Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div>
              <h2 className="text-lg font-black uppercase tracking-wider text-white">
                Pre-Rendered Concept Showcase
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Real-time SVG matrix & canvas vector rendering
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 justify-items-center">
            {showcaseCards.map((card, idx) => (
              <div key={idx} className="w-full flex flex-col items-center">
                <SportsPlayCardView cardData={card} />
                <button
                  onClick={() => setStudioOpen(true)}
                  className="mt-3 text-xs font-mono text-[#00F0D0] hover:underline cursor-pointer"
                >
                  Customize in Studio →
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Interactive Graphic Studio Modal */}
      <GraphicStudioModal 
        isOpen={studioOpen} 
        onClose={() => setStudioOpen(false)} 
      />
    </div>
  );
};

export default GraphicStudioPage;
