import React, { useState, useEffect } from 'react';
import { 
  Play, 
  RotateCcw, 
  Sparkles, 
  Bookmark, 
  BookOpen, 
  Share2, 
  Sliders, 
  Layers, 
  Info, 
  CheckCircle2,
  Trophy,
  Activity,
  ArrowRight,
  ShieldAlert,
  Flame,
  Download,
  Eye,
  Radio,
  Printer,
  LayoutGrid,
  Database
} from 'lucide-react';
import { PlaybookLab } from '../PlaybookLab';
import { Canvas as PlayLabVectorCanvas } from '../playlab/Canvas';
import { CallSheet12Grid } from '../playlab/CallSheet12Card';
import { PlaybookVault } from '../playlab/PlaybookVault';
import { WristbandHUD } from '../playlab/WristbandHUD';
import { WristbandPrintExporter } from '../wristband/WristbandPrintExporter';
import { useAuth } from '../../context/AuthContext';
import { triggerHaptic } from '../../lib/haptics';
import { PlayLabPlay } from '../../types/tactics';
import { get12SlotCallSheet, seedChampionship12Playbook } from '../../services/playlabService';
import { pushLiveCallout } from '../../services/telemetryService';

export const PlaybookLabPage: React.FC = () => {
  const { user } = useAuth();
  const activeTeamId = (user as any)?.teamId || (user as any)?.clubId || (user?.uid ? `sandbox_${user.uid}` : 'sandbox_guest');

  const [activeTab, setActiveTab] = useState<'playlab' | 'callsheet' | 'vault' | 'wristband' | 'print' | 'multisport' | 'guide'>('playlab');
  const [selectedPlayForCanvas, setSelectedPlayForCanvas] = useState<PlayLabPlay | null>(null);
  const [activeSlotIndex, setActiveSlotIndex] = useState<number>(1);
  const [callSheetPlays, setCallSheetPlays] = useState<PlayLabPlay[]>([]);
  const [isBroadcasting, setIsBroadcasting] = useState<boolean>(false);

  const loadCallSheet = async () => {
    const uid = user?.uid || 'coach';
    try {
      const plays = await get12SlotCallSheet(uid);
      setCallSheetPlays(plays);
    } catch (e) {
      console.warn('Failed to load call sheet plays:', e);
    }
  };

  useEffect(() => {
    loadCallSheet();
  }, [user]);

  const handleSelectSlot = (play: PlayLabPlay) => {
    setSelectedPlayForCanvas(play);
    if (play.slotIndex) {
      setActiveSlotIndex(play.slotIndex);
    }
    setActiveTab('playlab');
  };

  const handleLoadFromVault = (play: PlayLabPlay) => {
    setSelectedPlayForCanvas(play);
    if (play.slotIndex) {
      setActiveSlotIndex(play.slotIndex);
    }
    setActiveTab('playlab');
  };

  const handleBroadcastAll = async () => {
    setIsBroadcasting(true);
    try {
      if (callSheetPlays.length > 0) {
        const firstPlay = callSheetPlays[0];
        const primary = firstPlay.routes.find((r) => r.isPrimary);
        const assignmentsMap: Record<string, string> = {};
        firstPlay.routes.forEach((r) => {
          assignmentsMap[r.player] = r.routeType;
        });

        await pushLiveCallout(activeTeamId, {
          playId: firstPlay.id || `play_${Date.now()}`,
          playName: firstPlay.name,
          formation: firstPlay.formation,
          signalCode: `SLOT-${firstPlay.slotIndex || 1}`,
          audibleColor: (firstPlay.audibleColor as any) || 'GREEN LIGHT',
          cadence: (firstPlay.cadence as any) || 'ON ONE',
          assignments: assignmentsMap,
        });
      }
    } catch (err) {
      console.warn('Broadcast all error:', err);
    } finally {
      setIsBroadcasting(false);
    }
  };

  const handleSeedChampionshipPlays = async () => {
    const uid = user?.uid || 'coach';
    await seedChampionship12Playbook(uid);
    await loadCallSheet();
  };

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 py-3 sm:py-8 px-2.5 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        
        {/* Compact Tactical Suite Header & Segmented Toolbar */}
        <header className="bg-neutral-900/90 border border-neutral-800/90 rounded-2xl p-2.5 sm:p-3 backdrop-blur-xl shadow-xl">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
            {/* Suite Title & Live Indicator */}
            <div className="flex items-center justify-between sm:justify-start gap-3 px-1">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-[#00F0D0] animate-pulse" />
                <h1 className="text-sm sm:text-base font-black tracking-tight text-white whitespace-nowrap">
                  PlayLab Tactical Suite
                </h1>
              </div>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#00F0D0]/10 border border-[#00F0D0]/30 text-[#00F0D0] text-[10px] font-mono font-bold uppercase tracking-wider">
                <Radio className="w-3 h-3 animate-pulse" />
                <span className="hidden sm:inline">HUD TELEMETRY</span>
                <span className="sm:hidden">LIVE</span>
              </div>
            </div>

            {/* Consolidated Segmented Toolbar (Horizontal scroll on mobile/tablet, flex on desktop) */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar whitespace-nowrap p-1 bg-neutral-950 rounded-xl border border-neutral-800/80">
              <button
                type="button"
                id="tab-playlab"
                onClick={() => {
                  triggerHaptic('light');
                  setActiveTab('playlab');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  activeTab === 'playlab'
                    ? 'bg-[#00F0D0] text-black shadow-md shadow-[#00F0D0]/20'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>PlayLab Vector</span>
              </button>

              <button
                type="button"
                id="tab-callsheet"
                onClick={() => {
                  triggerHaptic('light');
                  setActiveTab('callsheet');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  activeTab === 'callsheet'
                    ? 'bg-amber-400 text-black shadow-md shadow-amber-400/20'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>12-Slot Call Sheet</span>
              </button>

              <button
                type="button"
                id="tab-vault"
                onClick={() => {
                  triggerHaptic('light');
                  setActiveTab('vault');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  activeTab === 'vault'
                    ? 'bg-purple-500 text-white shadow-md shadow-purple-500/20'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                <span>Vault Library</span>
              </button>

              <button
                type="button"
                id="tab-wristband"
                onClick={() => {
                  triggerHaptic('light');
                  setActiveTab('wristband');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  activeTab === 'wristband'
                    ? 'bg-emerald-400 text-black shadow-md shadow-emerald-400/20'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Wristband HUD</span>
              </button>

              <button
                type="button"
                id="tab-multisport"
                onClick={() => {
                  triggerHaptic('light');
                  setActiveTab('multisport');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  activeTab === 'multisport'
                    ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Multi-Sport Board</span>
              </button>

              <button
                type="button"
                id="tab-print"
                onClick={() => {
                  triggerHaptic('light');
                  setActiveTab('print');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  activeTab === 'print'
                    ? 'bg-amber-400 text-black shadow-md shadow-amber-400/20'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Printer className="w-3.5 h-3.5" />
                <span>12-Slot Card</span>
              </button>

              <button
                type="button"
                id="tab-guide"
                onClick={() => {
                  triggerHaptic('light');
                  setActiveTab('guide');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  activeTab === 'guide'
                    ? 'bg-purple-400 text-black shadow-md shadow-purple-400/20'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Guide</span>
              </button>
            </div>
          </div>
        </header>

        {/* Tab 1: PlayLab Vector Engine */}
        {activeTab === 'playlab' && (
          <div className="space-y-6">
            <PlayLabVectorCanvas
              activeTeamId={activeTeamId}
              currentSlotIndex={activeSlotIndex}
              externalLoadPlay={selectedPlayForCanvas}
              onSaveToSlot={async (_play, slot) => {
                setActiveSlotIndex(slot);
              }}
              onOpenCallSheet={() => setActiveTab('callsheet')}
              onOpenWristband={() => setActiveTab('wristband')}
              onExportPrintCard={() => setActiveTab('print')}
            />
          </div>
        )}

        {/* Tab 2: 12-Slot Call Sheet (PlaymakerX-Style 3x4 Grid) */}
        {activeTab === 'callsheet' && (
          <div className="space-y-6">
            <CallSheet12Grid
              plays={callSheetPlays}
              activePlayId={selectedPlayForCanvas?.id}
              onSelectPlay={handleSelectSlot}
              onPrintWristband={() => setActiveTab('print')}
              onBroadcastAll={handleBroadcastAll}
              onSeedChampionshipPlays={handleSeedChampionshipPlays}
              selectedTeamId={activeTeamId}
              isBroadcasting={isBroadcasting}
            />
          </div>
        )}

        {/* Tab 3: Playbook Vault (Private Plays & Slot Assignment) */}
        {activeTab === 'vault' && (
          <div className="space-y-6">
            <PlaybookVault
              inline={true}
              isOpen={true}
              onClose={() => setActiveTab('playlab')}
              userId={user?.uid || 'coach'}
              onLoadPlay={handleLoadFromVault}
              activePlayId={selectedPlayForCanvas?.id}
              onPlaysUpdated={loadCallSheet}
            />
          </div>
        )}

        {/* Tab 4: Live Wristband HUD with 12-Slot Quick Tap & Field Glare Mode */}
        {activeTab === 'wristband' && (
          <div className="space-y-6">
            <WristbandHUD
              teamId={activeTeamId}
              onOpenPlayLab={() => setActiveTab('playlab')}
              onOpenPrintCard={() => setActiveTab('print')}
            />
          </div>
        )}

        {/* Tab 5: 12-Slot Physical Print Card */}
        {activeTab === 'print' && (
          <div className="space-y-6">
            <WristbandPrintExporter
              teamName="Just1Play Varsity"
              onBack={() => setActiveTab('playlab')}
            />
          </div>
        )}

        {/* Tab 6: Multi-Sport Tactics Board */}
        {activeTab === 'multisport' && (
          <div className="space-y-6">
            <PlaybookLab currentUserId={user?.uid} />
          </div>
        )}

        {/* Tab 7: Route Tree Guide & PlayLab Instructions */}
        {activeTab === 'guide' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              <div className="bg-neutral-900/70 border border-neutral-800 rounded-2xl p-5 backdrop-blur-xl space-y-2">
                <div className="w-9 h-9 rounded-xl bg-[#00F0D0]/10 border border-[#00F0D0]/30 flex items-center justify-center text-[#00F0D0] font-black text-sm">
                  0-9
                </div>
                <h3 className="text-sm font-bold text-white uppercase tracking-tight">Numbered Route Tree</h3>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Tap any player node to assign official passing stems: 0 (Curl), 1 (Flat), 2 (Slant), 3 (Comeback), 4 (Out), 5 (Dig), 6 (Corner), 7 (Post), 8 (Go), 9 (Block/Motion).
                </p>
              </div>

              <div className="bg-neutral-900/70 border border-neutral-800 rounded-2xl p-5 backdrop-blur-xl space-y-2">
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-white uppercase tracking-tight">1-Tap Flip Formation</h3>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Mirror offensive alignments across the field centerline with one tap. Receiver cuts, stems, and yard lines mirror automatically.
                </p>
              </div>

              <div className="bg-neutral-900/70 border border-neutral-800 rounded-2xl p-5 backdrop-blur-xl space-y-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Radio className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-white uppercase tracking-tight">&lt;200ms Telemetry</h3>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Push tactical calls to /teams/&#123;teamId&#125;/liveCallout/current. Sideline and wrist receivers update in real-time with tactile haptics.
                </p>
              </div>

              <div className="bg-neutral-900/70 border border-neutral-800 rounded-2xl p-5 backdrop-blur-xl space-y-2">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Eye className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-white uppercase tracking-tight">Field Glare Mode</h3>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Ultra-high contrast yellow and stark monochrome layout specifically optimized for visibility under direct stadium sunlight.
                </p>
              </div>

              <div className="bg-neutral-900/70 border border-neutral-800 rounded-2xl p-5 backdrop-blur-xl space-y-2">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Printer className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-white uppercase tracking-tight">12-Slot Wristband Print</h3>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Render physical wrist coach inserts calibrated to standard 2.25&quot; x 4.5&quot; dimensions with dedicated print stylesheets.
                </p>
              </div>
            </div>
          </div>
        )}

      </div>
    </main>
  );
};

export default PlaybookLabPage;
