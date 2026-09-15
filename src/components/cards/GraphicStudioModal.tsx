import React, { useState, useRef } from "react";
import { PREBUILT_THEMES } from "../../lib/themeLibrary";
import { SportsTemplateEngine, PlayerData } from "./SportsTemplateEngine";
import { useAuth } from "../../context/AuthContext";

interface GraphicStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPlayer?: Partial<PlayerData>;
}

export function GraphicStudioModal({ isOpen, onClose, initialPlayer }: GraphicStudioModalProps) {
  const { user, role: userRole, isAdmin: authIsAdmin, customClaims } = useAuth();
  const isUserAdmin = Boolean(
    user?.email?.toLowerCase().trim() === 'kevoiebailey@gmail.com' ||
    userRole === 'admin' ||
    authIsAdmin ||
    customClaims?.admin === true
  );

  const [selectedThemeId, setSelectedThemeId] = useState("apex_holographic");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isExporting, setIsExporting] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  const [player, setPlayer] = useState<PlayerData>({
    name: initialPlayer?.name || "MAYA STERLING",
    jerseyNumber: initialPlayer?.jerseyNumber || "07",
    position: initialPlayer?.position || "FLYER / BASE",
    team: initialPlayer?.team || "APEX ALL-STARS",
    photoUrl: initialPlayer?.photoUrl || "",
    stats: {
      label1: "STUNT", value1: "99.4",
      label2: "DIFFICULTY", value2: "10.0",
      label3: "SYNC RATE", value3: "98.5%",
      label4: "HANG TIME", value4: "1.8s",
      ...initialPlayer?.stats
    }
  });

  if (!isOpen) return null;

  const themes = Object.values(PREBUILT_THEMES);
  const filteredThemes = selectedCategory === "all" 
    ? themes 
    : themes.filter(t => t.category === selectedCategory);

  // Cross-Origin Safe Native SVG to Canvas Export
  const handleDownload = async () => {
    if (!svgRef.current) return;
    setIsExporting(true);

    try {
      const svgElement = svgRef.current;
      const svgString = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
      const URLObj = window.URL || (window as any).webkitURL || URL;
      const blobUrl = URLObj.createObjectURL(svgBlob);

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 1600; // 2x resolution for print & HD display
        canvas.height = 2000;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, 1600, 2000);
          const pngUrl = canvas.toDataURL("image/png");
          const downloadLink = document.createElement("a");
          downloadLink.href = pngUrl;
          downloadLink.download = `${player.name.replace(/\s+/g, "_")}_TradingCard.png`;
          document.body.appendChild(downloadLink);
          downloadLink.click();
          document.body.removeChild(downloadLink);
        }
        URLObj.revokeObjectURL(blobUrl);
        setIsExporting(false);
      };
      img.src = blobUrl;
    } catch (err) {
      console.error("Export failed:", err);
      setIsExporting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 overflow-y-auto overscroll-contain animate-in fade-in duration-200"
      style={{ WebkitOverflowScrolling: 'touch', overscrollBehaviorY: 'contain' }}
    >
      <div className="relative flex flex-col lg:flex-row w-full max-w-6xl max-h-[92vh] my-auto bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close Studio"
          className="absolute top-4 right-4 z-20 p-2 text-slate-400 hover:text-white rounded-full bg-slate-900 border border-slate-700 cursor-pointer"
        >
          ✕
        </button>

        {/* LEFT CONTROLS PANEL */}
        <div 
          className="w-full lg:w-1/2 p-4 sm:p-6 overflow-y-auto max-h-[85vh] native-scroll-panel space-y-6 border-b lg:border-b-0 lg:border-r border-slate-800"
          style={{ WebkitOverflowScrolling: 'touch', overscrollBehaviorY: 'contain', touchAction: 'pan-y' }}
        >
          <div>
            <h2 className="text-xl font-extrabold text-white tracking-wider">ATHLETIC GRAPHIC STUDIO</h2>
            <p className="text-xs text-slate-400">18 Pre-built Themes • Real Game Day & Trading Cards</p>
          </div>

          {/* Theme Category Pills */}
          <div className="flex gap-2 pb-1 overflow-x-auto no-scrollbar">
            {["all", "gameday", "shatter", "trading_card", "classic"].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 text-xs font-bold uppercase rounded-full transition cursor-pointer ${
                  selectedCategory === cat 
                    ? "bg-cyan-500 text-black" 
                    : "bg-slate-900 text-slate-400 border border-slate-800 hover:text-white"
                }`}
              >
                {cat.replace("_", " ")}
              </button>
            ))}
          </div>

          {/* 18-Theme Thumbnail Grid */}
          <div className="grid grid-cols-3 gap-2.5 max-h-48 overflow-y-auto p-1 bg-slate-900/60 rounded-xl border border-slate-800/80">
            {filteredThemes.map((theme) => (
              <button
                key={theme.id}
                onClick={() => setSelectedThemeId(theme.id)}
                className={`flex flex-col items-start p-2 rounded-lg text-left transition border cursor-pointer ${
                  selectedThemeId === theme.id
                    ? "border-cyan-400 bg-cyan-950/40 shadow-sm shadow-cyan-500/20"
                    : "border-slate-800 bg-slate-900 hover:border-slate-700"
                }`}
              >
                <div className="w-full h-2 rounded mb-1.5" style={{ backgroundColor: theme.accentColor }} />
                <span className="text-[11px] font-bold text-white leading-tight truncate w-full">{theme.name}</span>
                <span className="text-[9px] text-slate-500 uppercase">{theme.category}</span>
              </button>
            ))}
          </div>

          {/* Player Metadata Controls */}
          <div className="space-y-4">
            <h3 className="text-xs font-mono text-cyan-400 tracking-wider">01 // PLAYER INFORMATION</h3>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Player Name"
                value={player.name}
                onChange={(e) => setPlayer({ ...player, name: e.target.value })}
                className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:border-cyan-500 outline-none"
              />
              <input
                type="text"
                placeholder="Jersey #"
                value={player.jerseyNumber}
                onChange={(e) => setPlayer({ ...player, jerseyNumber: e.target.value })}
                className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:border-cyan-500 outline-none"
              />
              <input
                type="text"
                placeholder="Team / Program"
                value={player.team}
                onChange={(e) => setPlayer({ ...player, team: e.target.value })}
                className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:border-cyan-500 outline-none"
              />
              <input
                type="text"
                placeholder="Position"
                value={player.position}
                onChange={(e) => setPlayer({ ...player, position: e.target.value })}
                className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:border-cyan-500 outline-none"
              />
            </div>
          </div>

          {/* Stats Inputs */}
          <div className="space-y-4">
            <h3 className="text-xs font-mono text-cyan-400 tracking-wider">02 // DYNAMIC HUD METRICS</h3>
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((num) => (
                <div key={num} className="flex gap-1.5">
                  <input
                    type="text"
                    placeholder={`Metric ${num}`}
                    value={(player.stats as any)[`label${num}`]}
                    onChange={(e) =>
                      setPlayer({
                        ...player,
                        stats: { ...player.stats, [`label${num}`]: e.target.value }
                      })
                    }
                    className="w-1/2 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-[11px] text-slate-400 focus:border-cyan-500 outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Val"
                    value={(player.stats as any)[`value${num}`]}
                    onChange={(e) =>
                      setPlayer({
                        ...player,
                        stats: { ...player.stats, [`value${num}`]: e.target.value }
                      })
                    }
                    className="w-1/2 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-[11px] text-white font-bold focus:border-cyan-500 outline-none"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT PREVIEW & ACTION PANEL */}
        <div 
          className="w-full lg:w-1/2 p-4 sm:p-6 flex flex-col items-center justify-between bg-slate-900/40 overflow-y-auto max-h-[85vh] native-scroll-panel"
          style={{ WebkitOverflowScrolling: 'touch', overscrollBehaviorY: 'contain', touchAction: 'pan-y' }}
        >
          <div className="w-full max-w-[380px] drop-shadow-2xl">
            <SportsTemplateEngine
              ref={svgRef}
              player={player}
              themeId={selectedThemeId}
            />
          </div>

          <div className="w-full max-w-[380px] mt-4">
            <button
              onClick={handleDownload}
              disabled={isExporting}
              className={`w-full py-3 px-4 font-extrabold text-sm rounded-xl transition duration-150 shadow-lg cursor-pointer disabled:opacity-50 ${
                isUserAdmin
                  ? 'bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-500 hover:from-blue-500 hover:via-cyan-400 hover:to-blue-400 text-white shadow-cyan-500/30 ring-1 ring-cyan-300/60'
                  : 'bg-cyan-400 hover:bg-cyan-300 active:scale-[0.99] text-black shadow-cyan-500/20'
              }`}
            >
              {isExporting 
                ? "GENERATING HIGH-RES CARD..." 
                : (isUserAdmin ? "DOWNLOAD HD MASTER (ADMIN FREE)" : "DOWNLOAD HD GRAPHIC ($2.99)")}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

export default GraphicStudioModal;
