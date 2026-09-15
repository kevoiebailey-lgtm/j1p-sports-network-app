import React, { useState } from 'react';
import { 
  Sparkles, 
  ArrowUpRight, 
  ArrowLeft, 
  ArrowRight, 
  Layers, 
  Compass, 
  Check, 
  X, 
  Sliders, 
  Zap, 
  RotateCcw,
  Pencil
} from 'lucide-react';
import { 
  ROUTE_TREE_DEFINITIONS, 
  PASSING_CONCEPTS_PRESETS, 
  RouteDefinition, 
  PassingConcept 
} from './routeTreeLibrary';
import { PlayerNode, SportType } from '../PlaybookLab';

interface RouteTreeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPlayer: PlayerNode | null;
  allPlayers: PlayerNode[];
  selectedSport: SportType;
  onApplyRouteToPlayer: (playerId: string, routePoints: { x: number; y: number }[], routeName?: string) => void;
  onApplyConcept: (concept: PassingConcept) => void;
  onSelectPlayer: (playerId: string) => void;
}

export const RouteTreeDrawer: React.FC<RouteTreeDrawerProps> = ({
  isOpen,
  onClose,
  selectedPlayer,
  allPlayers,
  selectedSport,
  onApplyRouteToPlayer,
  onApplyConcept,
  onSelectPlayer,
}) => {
  const [activeTab, setActiveTab] = useState<'individual' | 'concepts'>('individual');
  const [routeCategory, setRouteCategory] = useState<'all' | 'core_tree' | 'specialty' | 'backfield'>('all');
  const [directionOverride, setDirectionOverride] = useState<'auto' | 'left' | 'right' | 'inside' | 'outside'>('auto');
  const [depthOverride, setDepthOverride] = useState<'short' | 'medium' | 'deep'>('medium');
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const offensivePlayers = allPlayers.filter(p => p.role === 'offense' && p.shape !== 'cross');
  const currentReceiver = selectedPlayer || offensivePlayers[0] || null;

  const filteredRoutes = ROUTE_TREE_DEFINITIONS.filter(r => {
    const matchesCat = routeCategory === 'all' || r.category === routeCategory;
    const matchesSearch = !searchQuery || 
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      r.shortDesc.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.number && r.number === searchQuery);
    return matchesCat && matchesSearch;
  });

  const availableConcepts = PASSING_CONCEPTS_PRESETS.filter(
    c => c.sport === selectedSport || (selectedSport.startsWith('flag_') && c.sport.startsWith('flag_'))
  );

  const handleSelectRoute = (routeDef: RouteDefinition) => {
    if (!currentReceiver) return;

    // Determine direction
    let dir: 'left' | 'right' | 'inside' | 'outside' | undefined;
    if (directionOverride !== 'auto') {
      dir = directionOverride;
    } else {
      // Smart auto direction based on alignment
      if (routeDef.directionDefault === 'out') {
        dir = currentReceiver.x > 400 ? 'right' : 'left';
      } else if (routeDef.directionDefault === 'in') {
        dir = currentReceiver.x > 400 ? 'left' : 'right';
      }
    }

    const points = routeDef.generatePoints(currentReceiver.x, currentReceiver.y, {
      direction: dir,
      depth: depthOverride,
      fieldWidth: 800,
      fieldHeight: 500
    });

    onApplyRouteToPlayer(currentReceiver.id, points, routeDef.name);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="bg-neutral-900 border border-neutral-800 w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden text-neutral-100 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-neutral-800 flex items-center justify-between gap-4 bg-neutral-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white">Preloaded Route Tree Library</h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono font-bold uppercase">
                  Route Presets
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Instantly assign real passing routes to receivers or apply full offensive pass concepts.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="px-5 pt-3 pb-2 border-b border-neutral-800/80 flex items-center justify-between gap-3 bg-neutral-900 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('individual')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'individual'
                  ? 'bg-emerald-400 text-neutral-950 shadow-md shadow-emerald-500/20'
                  : 'bg-neutral-800 text-neutral-300 hover:text-white'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Receiver Route Tree (0-9)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('concepts')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'concepts'
                  ? 'bg-sky-400 text-neutral-950 shadow-md shadow-sky-500/20'
                  : 'bg-neutral-800 text-neutral-300 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Full Pass Concepts ({availableConcepts.length})</span>
            </button>
          </div>

          {/* Active Target Receiver Selector */}
          {activeTab === 'individual' && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-400 font-semibold">Assigning Route To:</span>
              <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-xl border border-neutral-800">
                {offensivePlayers.map((p) => {
                  const isCur = currentReceiver?.id === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => onSelectPlayer(p.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1 ${
                        isCur
                          ? 'bg-emerald-500 text-neutral-950 shadow-sm'
                          : 'text-neutral-300 hover:text-white hover:bg-neutral-800'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                      <span>{p.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Tab 1: Individual Receiver Route Tree */}
        {activeTab === 'individual' && (
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Filter & Direction Overrides Bar */}
            <div className="bg-neutral-950/70 border border-neutral-800 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3">
              {/* Category Chips */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setRouteCategory('all')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                    routeCategory === 'all' ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  All Routes
                </button>
                <button
                  type="button"
                  onClick={() => setRouteCategory('core_tree')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                    routeCategory === 'core_tree' ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  0-9 Route Tree
                </button>
                <button
                  type="button"
                  onClick={() => setRouteCategory('specialty')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                    routeCategory === 'specialty' ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  Specialty Moves
                </button>
                <button
                  type="button"
                  onClick={() => setRouteCategory('backfield')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                    routeCategory === 'backfield' ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  Backfield / RB
                </button>
              </div>

              {/* Direction and Depth Overrides */}
              <div className="flex items-center gap-3 flex-wrap">
                {/* Direction Switcher */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-mono text-neutral-400">Break:</span>
                  <div className="flex items-center bg-neutral-900 border border-neutral-800 rounded-lg p-0.5">
                    <button
                      type="button"
                      onClick={() => setDirectionOverride('auto')}
                      className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer ${
                        directionOverride === 'auto' ? 'bg-emerald-400 text-neutral-950' : 'text-neutral-400'
                      }`}
                      title="Smart Auto-Detect based on receiver alignment"
                    >
                      Auto
                    </button>
                    <button
                      type="button"
                      onClick={() => setDirectionOverride('left')}
                      className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer ${
                        directionOverride === 'left' ? 'bg-emerald-400 text-neutral-950' : 'text-neutral-400'
                      }`}
                      title="Force Break Left"
                    >
                      ⇦ Left
                    </button>
                    <button
                      type="button"
                      onClick={() => setDirectionOverride('right')}
                      className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer ${
                        directionOverride === 'right' ? 'bg-emerald-400 text-neutral-950' : 'text-neutral-400'
                      }`}
                      title="Force Break Right"
                    >
                      Right ⇨
                    </button>
                  </div>
                </div>

                {/* Depth Switcher */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-mono text-neutral-400">Depth:</span>
                  <div className="flex items-center bg-neutral-900 border border-neutral-800 rounded-lg p-0.5">
                    {(['short', 'medium', 'deep'] as const).map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDepthOverride(d)}
                        className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase cursor-pointer ${
                          depthOverride === d ? 'bg-sky-400 text-neutral-950' : 'text-neutral-400'
                        }`}
                      >
                        {d === 'short' ? 'Quick (5y)' : d === 'medium' ? 'Med (10y)' : 'Deep (15y+)'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Route Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {filteredRoutes.map((routeDef) => {
                const isNumbered = routeDef.number !== undefined;
                return (
                  <button
                    key={routeDef.id}
                    type="button"
                    onClick={() => handleSelectRoute(routeDef)}
                    className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 hover:border-emerald-500/60 hover:bg-neutral-900 transition-all text-left group flex flex-col justify-between gap-2.5 cursor-pointer shadow-sm relative overflow-hidden"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {isNumbered ? (
                          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-mono font-black text-sm group-hover:scale-110 transition-transform">
                            {routeDef.number}
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400 font-mono font-black text-xs group-hover:scale-110 transition-transform">
                            <Zap className="w-4 h-4" />
                          </div>
                        )}
                        <div>
                          <h4 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">
                            {routeDef.name}
                          </h4>
                          <span className="text-[10px] text-neutral-500 font-mono">
                            {routeDef.depthYards > 0 ? `~${routeDef.depthYards} Yds` : 'Behind Line'}
                          </span>
                        </div>
                      </div>

                      <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-emerald-400 text-neutral-950 px-2 py-0.5 rounded-md text-[10px] font-bold">
                        Apply
                      </div>
                    </div>

                    <p className="text-xs text-neutral-400 leading-snug line-clamp-2">
                      {routeDef.shortDesc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 2: Full Passing Concepts */}
        {activeTab === 'concepts' && (
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <div className="bg-sky-500/10 border border-sky-500/20 rounded-2xl p-4 flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-sky-300">1-Click Full Passing Concepts</h4>
                <p className="text-xs text-neutral-300 mt-0.5">
                  Select a passing scheme below to simultaneously assign synchronized preloaded routes to every receiver on the field for {selectedSport === 'flag_7v7' ? '7v7' : '5v5'}!
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availableConcepts.map((concept) => (
                <div
                  key={concept.id}
                  className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 flex flex-col justify-between gap-3 hover:border-sky-500/50 transition-all"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-base font-black text-white">{concept.name}</h3>
                      <span className="px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-300 font-mono text-[10px] font-bold uppercase">
                        {concept.badge}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-400 leading-relaxed">
                      {concept.description}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-neutral-500 font-mono">
                      {Object.keys(concept.playerRoutes).length} Routes Synced
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        onApplyConcept(concept);
                        onClose();
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-sky-400 hover:bg-sky-300 text-neutral-950 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-md shadow-sky-500/20"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Load Full Concept</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-neutral-800 bg-neutral-950/80 flex items-center justify-between gap-3 flex-wrap">
          <div className="text-xs text-neutral-400 flex items-center gap-2">
            <span>Tip: You can also drag the waypoints directly on the field to adjust cuts!</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold transition-all cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
