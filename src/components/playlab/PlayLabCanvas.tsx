import React, { useState, useRef, useEffect } from 'react';
import { 
  TacticalPlayer, 
  RouteNumber, 
  RouteDepthLevel, 
  ReadProgressionNumber, 
  SportCategory, 
  PlayCallPayload,
  PlayLabPlay,
  DefensivePlayer,
  DefensiveZoneArea,
  DefensiveBlitzArrow,
  DefensiveManLockLink,
  DefensePresetKey,
  ZoneCoverageType,
  OpponentCoverageKey
} from '../../types/tactics';
import { 
  FORMATION_PRESETS, 
  ROUTE_TREE_DEFINITIONS, 
  generateRouteVectorPath,
  initializeFormationPlayers 
} from './FormationPresets';
import {
  INITIAL_DEFENSIVE_PLAYERS,
  DEFENSIVE_PRESET_SHELLS,
  TACTICAL_IF_THEN_PRESETS
} from './DefensePresets';
import {
  OpponentCoverageToolbar,
  OpponentCoverageOverlay,
  AudibleTacticalReadHUD,
  getOpponentDefensiveTokens,
  getDefensiveSimulationCoord,
  evaluateOpenTarget
} from './OpponentDefenseSimulator';
import { PlayerNode } from './PlayerNode';
import { DefensivePlayerNode } from './DefensivePlayerNode';
import { DefensiveCanvasOverlay } from './DefensiveCanvasOverlay';
import { RouteTreeModal } from './RouteTreeModal';
import { QuickRoutePopover } from './QuickRoutePopover';
import { PlayLabPlayModal } from './PlayLabPlayModal';
import { PlayLabErrorBoundary } from './PlayLabErrorBoundary';
import { 
  FlipHorizontal, 
  RotateCcw, 
  Send, 
  Eye, 
  Download, 
  Check, 
  Sliders, 
  Gauge, 
  ShieldAlert, 
  Sparkles,
  Layers,
  Flag,
  Trash2,
  Bookmark,
  Play,
  Radio,
  Printer,
  X,
  Shield,
  Zap,
  Lock,
  Unlock,
  Crosshair,
  Target,
  ChevronDown
} from 'lucide-react';
import { broadcastLiveCall } from '../../services/telemetryService';
import { updatePlayPrivacy, seedVettedFlagPlaybook, savePlayLabPlay } from '../../services/playlabService';
import { triggerHaptic } from '../../lib/haptics';
import { useAuth } from '../../context/AuthContext';
import { PlayPrivacyDropdown } from './PlayPrivacyDropdown';
import { TeamSelectModal } from './TeamSelectModal';

interface PlayLabCanvasProps {
  activeTeamId?: string;
  onOpenWristband?: () => void;
  onExportPrintCard?: () => void;
  onSaveToSlot?: (play: PlayLabPlay, slotIndex: number) => Promise<void>;
  currentSlotIndex?: number;
  externalLoadPlay?: PlayLabPlay | null;
  onOpenCallSheet?: () => void;
}

export const PlayLabCanvas: React.FC<PlayLabCanvasProps> = ({
  activeTeamId = 'default_team',
  onOpenWristband,
  onExportPrintCard,
  onSaveToSlot,
  currentSlotIndex = 1,
  externalLoadPlay,
  onOpenCallSheet,
}) => {
  const { user } = useAuth();

  // Active formation preset key
  const [selectedFormationKey, setSelectedFormationKey] = useState<string>('5v5_Spread');
  const [activeCategoryTab, setActiveCategoryTab] = useState<SportCategory>('flag_5v5');
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [isRoutePickerOpen, setIsRoutePickerOpen] = useState<boolean>(false);
  const [isQuickRouteOpen, setIsQuickRouteOpen] = useState<boolean>(false);
  const [isPlayLabModalOpen, setIsPlayLabModalOpen] = useState<boolean>(false);

  // Play metadata
  const [playName, setPlayName] = useState<string>('5v5 Spread Standard');
  const [signalCode, setSignalCode] = useState<string>('FLAG-42');
  const [audibleColor, setAudibleColor] = useState<string>('GREEN LIGHT');
  const [cadence, setCadence] = useState<string>('ON ONE');

  // Active play persistence & privacy state
  const [activePlayId, setActivePlayId] = useState<string | null>(null);
  const [activeSlotIndex, setActiveSlotIndex] = useState<number>(currentSlotIndex);
  const [activeIsPublic, setActiveIsPublic] = useState<boolean>(false);
  const [activeSharedTeams, setActiveSharedTeams] = useState<string[]>([]);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState<boolean>(false);
  const [isMobileSettingsOpen, setIsMobileSettingsOpen] = useState<boolean>(false);

  // Top-Level Mode: Offense vs Defense
  const [tacticalMode, setTacticalMode] = useState<'offense' | 'defense'>('offense');

  // Defensive Play Design State
  const [defensivePlayers, setDefensivePlayers] = useState<DefensivePlayer[]>(INITIAL_DEFENSIVE_PLAYERS);
  const [activeDefensePreset, setActiveDefensePreset] = useState<DefensePresetKey>('Cover 2');
  const [defenseZones, setDefenseZones] = useState<DefensiveZoneArea[]>(DEFENSIVE_PRESET_SHELLS['Cover 2'].zones);
  const [blitzArrows, setBlitzArrows] = useState<DefensiveBlitzArrow[]>(DEFENSIVE_PRESET_SHELLS['Cover 2'].blitzArrows);
  const [manLockLinks, setManLockLinks] = useState<DefensiveManLockLink[]>([]);
  const [selectedDefPlayerId, setSelectedDefPlayerId] = useState<string | null>(null);

  // Offensive Read Progressions & Tactical If/Then Notes
  const [tacticalIfThen, setTacticalIfThen] = useState<string>('If Press Man -> Target Read 1 (Mesh/Rub)');

  // Opponent Defensive Coverage Simulator
  const [opponentCoverage, setOpponentCoverage] = useState<OpponentCoverageKey>('off');

  // Animated Play Runner Engine
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playProgress, setPlayProgress] = useState<number>(0);
  const animationRef = useRef<number | null>(null);

  // 1-Click Seeder State
  const [isSeedingPack, setIsSeedingPack] = useState<boolean>(false);
  const [seedingBannerText, setSeedingBannerText] = useState<string | null>(null);

  // Load a PlayLabPlay directly onto the active vector canvas
  const handleLoadPlayLabPlay = (play: PlayLabPlay) => {
    triggerHaptic('medium');
    setPlayName(play.name);
    setSignalCode(`LAB-${Math.floor(10 + Math.random() * 89)}`);
    setActivePlayId(play.id || null);
    setActiveIsPublic(Boolean(play.isPublic));
    setActiveSharedTeams(play.sharedTeams || play.sharedWithTeamIds || []);
    if (play.cadence) setCadence(play.cadence);
    if (play.audibleColor) setAudibleColor(play.audibleColor);
    if (play.tacticalIfThen) setTacticalIfThen(play.tacticalIfThen);

    // Defensive play mode loading
    if (play.playMode === 'defense') {
      setTacticalMode('defense');
      if (play.defensePreset && DEFENSIVE_PRESET_SHELLS[play.defensePreset as DefensePresetKey]) {
        setActiveDefensePreset(play.defensePreset as DefensePresetKey);
      }
      if (Array.isArray(play.defenseZones) && play.defenseZones.length > 0) {
        setDefenseZones(play.defenseZones);
      }
      if (Array.isArray(play.blitzArrows)) {
        setBlitzArrows(play.blitzArrows);
      }
      if (Array.isArray(play.manLockLinks)) {
        setManLockLinks(play.manLockLinks);
      }
    } else {
      setTacticalMode('offense');
    }
    
    // Map format & formation
    let category: 'flag_5v5' | 'flag_7v7' | 'tackle_11v11' = 'flag_5v5';
    let basePresetKey = '5v5_Spread';
    if (play.format === '7v7') {
      category = 'flag_7v7';
      basePresetKey = play.formation === 'Trips' ? '7v7_Trips' : '7v7_Spread';
    } else if (play.format === '11v11') {
      category = 'tackle_11v11';
      basePresetKey = play.formation === 'Trips' ? '11v11_Trips_Open' : '11v11_Spread_2x2';
    } else {
      category = 'flag_5v5';
      basePresetKey = play.formation === 'Trips' ? '5v5_Trips' : '5v5_Spread';
    }
    setActiveCategoryTab(category);
    setSelectedFormationKey(basePresetKey);

    // Initialize players from preset, then overlay the vector routes
    const basePlayers = initializeFormationPlayers(basePresetKey, false);
    const updatedPlayers = basePlayers.map((bp) => {
      const matchedRoute = play.routes.find((r) => r.player === bp.label);
      if (matchedRoute && matchedRoute.coordinates.length > 0) {
        const startPt = matchedRoute.coordinates[0];
        const pathD = matchedRoute.coordinates.reduce((acc, pt, idx) => {
          return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
        }, '');

        const progression = matchedRoute.readProgression || (matchedRoute.isPrimary ? 1 : null);

        return {
          ...bp,
          x: startPt.x,
          y: startPt.y,
          routeName: matchedRoute.routeType,
          readProgression: progression as any,
          routePoints: matchedRoute.coordinates,
          svgPathD: pathD,
          endMarker: 'arrow' as const,
        };
      }
      return bp;
    });

    setPlayers(updatedPlayers);
  };

  // Canvas Header Privacy Status Updater
  const handleUpdateActivePrivacy = async (updates: { isPublic: boolean; sharedTeams?: string[] }) => {
    triggerHaptic('medium');
    setActiveIsPublic(updates.isPublic);
    if (updates.sharedTeams !== undefined) {
      setActiveSharedTeams(updates.sharedTeams);
    }
    if (activePlayId) {
      try {
        await updatePlayPrivacy(activePlayId, updates);
      } catch (err) {
        console.warn('Failed to update active play privacy in Firestore:', err);
      }
    }
  };

  // 1-Click "Load Flag Playbook (9 Plays)" Preset Seeder from Header
  const handleImportPackFromHeader = async () => {
    triggerHaptic('medium');
    setIsSeedingPack(true);
    setSeedingBannerText(null);
    try {
      const userId = user?.uid || 'coach_sandbox';
      const seededPlays = await seedVettedFlagPlaybook(userId);
      if (seededPlays && seededPlays.length > 0) {
        handleLoadPlayLabPlay(seededPlays[0]); // Load Fil Fly
      }
      setSeedingBannerText('Flag Playbook Pack (9 Plays) successfully imported to your private library!');
      triggerHaptic('success');
      setTimeout(() => {
        setSeedingBannerText(null);
      }, 5000);
    } catch (err) {
      console.error('Failed to seed flag playbook:', err);
      alert('Could not import playbook pack. Please try again.');
    } finally {
      setIsSeedingPack(false);
    }
  };

  // Dispatch feedback state
  const [isDispatching, setIsDispatching] = useState<boolean>(false);
  const [dispatchSuccess, setDispatchSuccess] = useState<boolean>(false);

  // Active tactical players on field with computed vector paths
  const [players, setPlayers] = useState<TacticalPlayer[]>(() => {
    return initializeFormationPlayers('5v5_Spread', false);
  });

  const svgRef = useRef<SVGSVGElement | null>(null);
  const draggingPlayerRef = useRef<{ 
    id: string; 
    isDefense?: boolean;
    startPointerX: number; 
    startPointerY: number; 
    origX: number; 
    origY: number 
  } | null>(null);

  // Current formation shell details
  const activePreset = FORMATION_PRESETS[selectedFormationKey] || FORMATION_PRESETS['5v5_Spread'];
  const isFlag = activePreset.category === 'flag_5v5' || activePreset.category === 'flag_7v7';

  // 1. Formation Preset Selector Handler
  const handleSelectFormation = (key: string) => {
    triggerHaptic('light');
    setSelectedFormationKey(key);
    setIsFlipped(false);
    setSelectedPlayerId(null);

    const preset = FORMATION_PRESETS[key];
    if (preset) {
      setActiveCategoryTab(preset.category);
      setPlayers(initializeFormationPlayers(key, false));
      setPlayName(`${preset.name.split('(')[0].trim()}`);
      setSignalCode(`${preset.category.startsWith('flag') ? 'FLAG' : 'TCK'}-${Math.floor(10 + Math.random() * 89)}`);
    }
  };

  // 2. 1-Tap Horizontal Play Mirroring
  const handleFlipFormation = () => {
    triggerHaptic('medium');
    const newFlipped = !isFlipped;
    setIsFlipped(newFlipped);

    setPlayers((prev) =>
      prev.map((p) => {
        const mirroredX = 800 - p.x;
        if (p.routeNumber !== undefined) {
          const vectorRes = generateRouteVectorPath(
            mirroredX,
            p.y,
            p.routeNumber,
            p.routeDepth || 'medium',
            newFlipped
          );
          return {
            ...p,
            x: mirroredX,
            routeDepthYards: vectorRes.depthYards,
            routePoints: vectorRes.routePoints,
            svgPathD: vectorRes.svgPathD,
            endMarker: vectorRes.endMarker,
          };
        }
        return {
          ...p,
          x: mirroredX,
          routePoints: p.routePoints.map((pt) => ({ x: 800 - pt.x, y: pt.y })),
          svgPathD: `M ${mirroredX} ${p.y}`,
        };
      })
    );
  };

  // 3. Reset Formation
  const handleResetFormation = () => {
    triggerHaptic('light');
    setIsFlipped(false);
    setSelectedPlayerId(null);
    setPlayers(initializeFormationPlayers(selectedFormationKey, false));
  };

  // Defensive Presets & Coverage Handlers
  const handleSelectDefensePreset = (presetKey: DefensePresetKey) => {
    triggerHaptic('medium');
    const preset = DEFENSIVE_PRESET_SHELLS[presetKey];
    if (!preset) return;
    setActiveDefensePreset(presetKey);
    setDefensivePlayers(preset.players);
    setDefenseZones(preset.zones);
    setBlitzArrows(preset.blitzArrows);
    setManLockLinks(preset.manLockLinks);
    setPlayName(`Defense ${preset.key}`);
    setTacticalIfThen(preset.tacticalNote);
    setSignalCode(`DEF-${Math.floor(10 + Math.random() * 89)}`);
  };

  const handleToggleDefenseZone = (zoneType: ZoneCoverageType) => {
    triggerHaptic('light');
    const existingIndex = defenseZones.findIndex((z) => z.name === zoneType);
    if (existingIndex >= 0) {
      setDefenseZones((prev) => prev.filter((_, idx) => idx !== existingIndex));
    } else {
      const isDeep = zoneType.includes('Deep');
      const isFlat = zoneType === 'Flat';
      const color =
        zoneType === 'Hook'
          ? 'rgba(168, 85, 247, 0.28)'
          : isFlat
          ? 'rgba(16, 185, 129, 0.28)'
          : zoneType === 'QB Spy'
          ? 'rgba(239, 68, 68, 0.28)'
          : 'rgba(56, 189, 248, 0.28)';

      const newZone: DefensiveZoneArea = {
        id: `zone_${Date.now()}_${Math.random()}`,
        name: zoneType,
        x: isFlat ? 180 : 400,
        y: isDeep ? 180 : 300,
        width: isDeep ? 300 : isFlat ? 200 : 220,
        height: isDeep ? 130 : 90,
        color,
        assignedPlayer: zoneType === 'Hook' ? 'MLB' : isFlat ? 'LCB' : zoneType === 'QB Spy' ? 'MLB' : 'FS',
      };
      setDefenseZones((prev) => [...prev, newZone]);
    }
  };

  const handleToggleBlitzArrow = () => {
    triggerHaptic('medium');
    if (blitzArrows.length > 0) {
      setBlitzArrows([]);
    } else {
      const rusher = defensivePlayers.find((d) => d.label === 'R') || defensivePlayers[0];
      setBlitzArrows([
        {
          id: `blitz_${Date.now()}`,
          fromPlayer: rusher.label,
          startX: rusher.x,
          startY: rusher.y,
          endX: 400,
          endY: 410,
          color: '#EF4444',
        },
      ]);
    }
  };

  const handleToggleManLock = () => {
    triggerHaptic('medium');
    if (manLockLinks.length > 0) {
      setManLockLinks([]);
    } else {
      setManLockLinks([
        { id: 'lock_lcb_x', defenderLabel: 'LCB', receiverLabel: 'X' },
        { id: 'lock_rcb_z', defenderLabel: 'RCB', receiverLabel: 'Z' },
        { id: 'lock_mlb_c', defenderLabel: 'MLB', receiverLabel: 'C' },
      ]);
    }
  };

  const handleResetDefense = () => {
    triggerHaptic('light');
    handleSelectDefensePreset(activeDefensePreset);
  };

  const handleDefensivePointerDown = (player: DefensivePlayer, e: React.PointerEvent<SVGGElement>) => {
    e.stopPropagation();
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const scaleX = 800 / rect.width;
    const scaleY = 500 / rect.height;

    setSelectedDefPlayerId(player.id);
    setSelectedPlayerId(null);
    setIsQuickRouteOpen(false);

    draggingPlayerRef.current = {
      id: player.id,
      isDefense: true,
      startPointerX: (e.clientX - rect.left) * scaleX,
      startPointerY: (e.clientY - rect.top) * scaleY,
      origX: player.x,
      origY: player.y,
    };

    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  // Offensive Read Progression Setter (1: Primary, 2: Secondary, 3: Checkdown)
  const handleSetProgression = (playerId?: string, readProgression?: ReadProgressionNumber | null) => {
    if (!playerId) return;
    triggerHaptic('medium');
    setPlayers((prev) =>
      prev.map((p) => {
        if (p.id !== playerId) return p;
        return {
          ...p,
          readProgression: readProgression || undefined,
          isPrimary: readProgression === 1,
        };
      })
    );
  };

  // 4. Select Player Node & Open Quick Route Popover
  const handleSelectPlayer = (player: TacticalPlayer) => {
    triggerHaptic('light');
    setSelectedPlayerId(player.id);
    setIsQuickRouteOpen(true);
  };

  // Toggle Pre-Snap Motion (dashed horizontal vector across backfield)
  const handleToggleMotion = (playerId?: string) => {
    const targetId = playerId || selectedPlayerId;
    if (!targetId) return;
    triggerHaptic('medium');
    setPlayers((prev) =>
      prev.map((p) => {
        if (p.id !== targetId) return p;
        const currentEnabled = Boolean(p.motion?.enabled);
        if (currentEnabled) {
          return {
            ...p,
            motion: undefined,
          };
        }
        // Horizontal vector across the backfield before the snap
        const isLeft = p.x <= 400;
        const targetX = Math.max(60, Math.min(740, isLeft ? p.x + 150 : p.x - 150));
        const targetY = Math.min(420, Math.max(360, p.y + 10));
        return {
          ...p,
          motion: {
            enabled: true,
            type: 'jet',
            targetX,
            targetY,
          },
        };
      })
    );
  };

  // Toggle Beats Coverage tag on player for Tactical Opponent Simulator
  const handleToggleBeatsCoverage = (playerId: string | undefined, coverageTag: string) => {
    const targetId = playerId || selectedPlayerId;
    if (!targetId) return;
    triggerHaptic('medium');
    setPlayers((prev) =>
      prev.map((p) => {
        if (p.id !== targetId) return p;
        const current = p.beatsCoverage || [];
        const exists = current.includes(coverageTag);
        const updated = exists ? current.filter((c) => c !== coverageTag) : [...current, coverageTag];
        return {
          ...p,
          beatsCoverage: updated,
        };
      })
    );
  };

  // Clear all active routes without resetting player positions
  const handleClearAllRoutes = () => {
    triggerHaptic('medium');
    setPlayers((prev) =>
      prev.map((p) => ({
        ...p,
        routeNumber: undefined,
        routeName: undefined,
        routeDepth: undefined,
        routeDepthYards: undefined,
        readProgression: null,
        motion: undefined,
        routePoints: [{ x: p.x, y: p.y }],
        svgPathD: `M ${p.x} ${p.y}`,
        endMarker: 'none',
      }))
    );
  };

  // Helper: Vector interpolation along route polyline for realistic play playback
  const getPointOnPolyline = (
    points: { x: number; y: number }[] | undefined,
    progress: number,
    fallback: { x: number; y: number }
  ): { x: number; y: number } => {
    if (!points || points.length === 0) return fallback;
    if (points.length === 1 || progress <= 0) return points[0];
    if (progress >= 1) return points[points.length - 1];

    let totalLength = 0;
    const segLengths: number[] = [];
    for (let i = 0; i < points.length - 1; i++) {
      const dx = points[i + 1].x - points[i].x;
      const dy = points[i + 1].y - points[i].y;
      const len = Math.hypot(dx, dy);
      segLengths.push(len);
      totalLength += len;
    }

    if (totalLength === 0) return points[0];

    const targetDist = progress * totalLength;
    let accumulated = 0;

    for (let i = 0; i < segLengths.length; i++) {
      const len = segLengths[i];
      if (accumulated + len >= targetDist || i === segLengths.length - 1) {
        const segFraction = len > 0 ? (targetDist - accumulated) / len : 0;
        const x = points[i].x + (points[i + 1].x - points[i].x) * segFraction;
        const y = points[i].y + (points[i + 1].y - points[i].y) * segFraction;
        return { x, y };
      }
      accumulated += len;
    }

    return points[points.length - 1];
  };

  // Play Runner Playback Controls
  const handleStopPlay = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    setIsPlaying(false);
    setPlayProgress(0);
  };

  const handleRunPlay = () => {
    triggerHaptic('medium');
    if (isPlaying) {
      handleStopPlay();
      return;
    }

    setIsPlaying(true);
    setPlayProgress(0);
    const startTime = performance.now();
    const duration = 2600; // 2.6s authentic snap timing

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      setPlayProgress(progress);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(tick);
      } else {
        setTimeout(() => {
          setIsPlaying(false);
          setPlayProgress(0);
        }, 700);
      }
    };

    animationRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Opponent Defensive Coverage Simulation Computations
  const opponentDefensiveTokens = React.useMemo(() => {
    return getOpponentDefensiveTokens(opponentCoverage, players);
  }, [opponentCoverage, players]);

  const openTargetEvaluation = React.useMemo(() => {
    return evaluateOpenTarget(players, opponentCoverage);
  }, [players, opponentCoverage]);

  const animatedOpponentDefensiveTokens = React.useMemo(() => {
    if (!isPlaying || opponentCoverage === 'off') return opponentDefensiveTokens;
    return opponentDefensiveTokens.map((d) => {
      const animatedCoord = getDefensiveSimulationCoord(
        d,
        opponentCoverage,
        playProgress,
        players,
        (p) => getPointOnPolyline(p.routePoints, playProgress, { x: p.x, y: p.y })
      );
      return { ...d, x: animatedCoord.x, y: animatedCoord.y };
    });
  }, [isPlaying, opponentCoverage, playProgress, opponentDefensiveTokens, players]);

  // Sync external loaded play
  useEffect(() => {
    if (externalLoadPlay) {
      handleLoadPlayLabPlay(externalLoadPlay);
      if (externalLoadPlay.slotIndex) {
        setActiveSlotIndex(externalLoadPlay.slotIndex);
      }
    }
  }, [externalLoadPlay]);

  // Quick Save to Active Slot (1-12)
  const handleQuickSaveToSlot = async (slotNum?: number) => {
    triggerHaptic('success');
    const targetSlot = slotNum || activeSlotIndex || 1;
    const currentFormat = activeCategoryTab === 'flag_7v7' ? '7v7' : activeCategoryTab === 'tackle_11v11' ? '11v11' : '5v5';

    const playToSave: PlayLabPlay = {
      id: activePlayId || `play_${Date.now()}`,
      userId: user?.uid || 'coach',
      name: playName,
      formation: tacticalMode === 'defense' ? `Defense ${activeDefensePreset}` : activePreset.name,
      category: tacticalMode === 'defense' ? 'Defense' : activePreset.category,
      format: currentFormat,
      isPublic: activeIsPublic,
      sharedTeams: activeSharedTeams,
      sharedWithTeamIds: activeSharedTeams,
      slotIndex: targetSlot,
      cadence,
      audibleColor,
      tacticalIfThen,
      playMode: tacticalMode,
      defensePreset: tacticalMode === 'defense' ? activeDefensePreset : undefined,
      defenseZones: tacticalMode === 'defense' ? defenseZones : undefined,
      blitzArrows: tacticalMode === 'defense' ? blitzArrows : undefined,
      manLockLinks: tacticalMode === 'defense' ? manLockLinks : undefined,
      routes: players.map((p) => ({
        player: p.label as any,
        coordinates: p.routePoints && p.routePoints.length > 0 ? p.routePoints : [{ x: p.x, y: p.y }],
        routeType: p.routeName || (p.routeNumber !== undefined ? `${p.routeNumber}: ${ROUTE_TREE_DEFINITIONS[p.routeNumber]?.name || 'Route'}` : 'Stem'),
        isPrimary: p.readProgression === 1,
        readProgression: p.readProgression || undefined,
        color: p.readProgression === 1 ? '#F59E0B' : p.readProgression === 2 ? '#38BDF8' : p.readProgression === 3 ? '#10B981' : p.label === 'C' ? '#10B981' : '#38BDF8',
        isMotion: Boolean(p.motion?.enabled),
      })),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    try {
      const savedId = await savePlayLabPlay(playToSave);
      setActivePlayId(savedId);
      setActiveSlotIndex(targetSlot);
      setSeedingBannerText(`✅ Saved "${playName}" to Slot #${targetSlot}!`);
      setTimeout(() => setSeedingBannerText(null), 3500);
      if (onSaveToSlot) {
        await onSaveToSlot(playToSave, targetSlot);
      }
    } catch (err) {
      console.warn('Quick save error:', err);
      setSeedingBannerText(`⚠️ Saved locally to Slot #${targetSlot}`);
      setTimeout(() => setSeedingBannerText(null), 3000);
    }
  };

  // 5. Tap-to-Assign Route Selection Handler
  const handleAssignRoute = (
    routeNum: RouteNumber,
    depth: RouteDepthLevel = 'medium',
    readProgression?: ReadProgressionNumber | null,
    note?: string
  ) => {
    triggerHaptic('medium');
    if (!selectedPlayerId) return;

    setPlayers((prev) =>
      prev.map((p) => {
        if (p.id !== selectedPlayerId) return p;
        const vectorRes = generateRouteVectorPath(p.x, p.y, routeNum, depth, isFlipped);
        return {
          ...p,
          routeNumber: routeNum,
          routeName: ROUTE_TREE_DEFINITIONS[routeNum]?.name,
          routeDepth: depth,
          routeDepthYards: vectorRes.depthYards,
          readProgression: readProgression ?? null,
          assignmentNote: note !== undefined ? note : p.assignmentNote,
          routePoints: vectorRes.routePoints,
          svgPathD: vectorRes.svgPathD,
          endMarker: vectorRes.endMarker,
        };
      })
    );
  };

  // 6. Clear Route / Set to Block
  const handleClearRoute = () => {
    if (!selectedPlayerId) return;
    setPlayers((prev) =>
      prev.map((p) => {
        if (p.id !== selectedPlayerId) return p;
        return {
          ...p,
          routeNumber: undefined,
          routeName: undefined,
          routeDepth: undefined,
          routeDepthYards: undefined,
          readProgression: null,
          routePoints: [{ x: p.x, y: p.y }],
          svgPathD: `M ${p.x} ${p.y}`,
          endMarker: 'none',
        };
      })
    );
  };

  // 7. Drag Player Node with Yard-Line Snapping
  const handlePointerDown = (player: TacticalPlayer, e: React.PointerEvent<SVGGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const scaleX = 800 / rect.width;
    const scaleY = 500 / rect.height;

    draggingPlayerRef.current = {
      id: player.id,
      startPointerX: (e.clientX - rect.left) * scaleX,
      startPointerY: (e.clientY - rect.top) * scaleY,
      origX: player.x,
      origY: player.y,
    };

    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!draggingPlayerRef.current || !svgRef.current) return;
    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();
    const scaleX = 800 / rect.width;
    const scaleY = 500 / rect.height;

    const currentX = (e.clientX - rect.left) * scaleX;
    const currentY = (e.clientY - rect.top) * scaleY;

    const dx = currentX - draggingPlayerRef.current.startPointerX;
    const dy = currentY - draggingPlayerRef.current.startPointerY;

    let targetX = draggingPlayerRef.current.origX + dx;
    let targetY = draggingPlayerRef.current.origY + dy;

    // Field boundaries
    targetX = Math.max(40, Math.min(760, targetX));
    targetY = Math.max(120, Math.min(470, targetY));

    // Yard-Line Snapping (snaps Y to nearest 10 field units, X to nearest 5 units)
    const snappedX = Math.round(targetX / 5) * 5;
    const snappedY = Math.round(targetY / 10) * 10;

    const activeId = draggingPlayerRef.current.id;

    if (draggingPlayerRef.current.isDefense) {
      setDefensivePlayers((prev) =>
        prev.map((dp) => (dp.id === activeId ? { ...dp, x: snappedX, y: snappedY } : dp))
      );
      return;
    }

    setPlayers((prev) =>
      prev.map((p) => {
        if (p.id !== activeId) return p;
        if (p.routeNumber !== undefined) {
          const vectorRes = generateRouteVectorPath(
            snappedX,
            snappedY,
            p.routeNumber,
            p.routeDepth || 'medium',
            isFlipped
          );
          return {
            ...p,
            x: snappedX,
            y: snappedY,
            routeDepthYards: vectorRes.depthYards,
            routePoints: vectorRes.routePoints,
            svgPathD: vectorRes.svgPathD,
            endMarker: vectorRes.endMarker,
          };
        }
        return {
          ...p,
          x: snappedX,
          y: snappedY,
          routePoints: [{ x: snappedX, y: snappedY }],
          svgPathD: `M ${snappedX} ${snappedY}`,
        };
      })
    );
  };

  const handlePointerUp = () => {
    draggingPlayerRef.current = null;
  };

  // 8. Coach Telemetry Broadcast (<200ms real-time to game_sessions & wristband)
  const handlePushToWristband = async () => {
    triggerHaptic('success');
    setIsDispatching(true);

    const assignments: Record<string, string> = {};
    players.forEach((p) => {
      const routeTitle = p.routeNumber !== undefined 
        ? `${p.routeNumber}: ${ROUTE_TREE_DEFINITIONS[p.routeNumber]?.name || 'Route'}` 
        : 'BLOCK';
      const depthStr = p.routeDepthYards ? ` (${p.routeDepthYards}yd)` : '';
      const readStr = p.readProgression ? ` [${p.readProgression}st Read]` : '';
      const noteStr = p.assignmentNote ? ` • ${p.assignmentNote}` : '';
      assignments[p.label] = `${routeTitle}${depthStr}${readStr}${noteStr}`;
    });

    try {
      const progressionReads = players
        .filter((p) => p.readProgression)
        .sort((a, b) => (a.readProgression || 9) - (b.readProgression || 9))
        .map((p) => ({
          readNumber: p.readProgression as 1 | 2 | 3,
          player: p.label,
          routeType: p.routeName || 'Route',
        }));

      const payload: PlayCallPayload = {
        playId: `play_${Date.now()}`,
        playName,
        formation: tacticalMode === 'defense' ? `Defense ${activeDefensePreset}` : activePreset.name,
        signalCode,
        audibleColor,
        cadence,
        timestamp: Date.now(),
        playState: 'LIVE',
        assignments,
        activePersonnel: activePreset.personnel,
        category: tacticalMode === 'defense' ? 'defense' : activePreset.category,
        tacticalIfThen,
        playMode: tacticalMode,
        progressionReads: progressionReads.length > 0 ? progressionReads : undefined,
      };

      await broadcastLiveCall(activeTeamId, payload);

      setDispatchSuccess(true);
      setTimeout(() => setDispatchSuccess(false), 2500);
    } catch (err) {
      console.warn('Live telemetry broadcast warning:', err);
    } finally {
      setIsDispatching(false);
    }
  };

  const selectedPlayer = players.find((p) => p.id === selectedPlayerId) || null;

  return (
    <PlayLabErrorBoundary onReset={handleResetFormation}>
      <div className="flex flex-col gap-4 w-full">
        {/* Mobile Compact Sticky Control Bar (< 768px): [ 🏈 5v5 Flag ▾ ] [ Active Play Name ] [ ⚙ Coverage ] [ 🖨 Print ] */}
        <div className="md:hidden sticky top-0 z-30 h-14 w-full bg-[#0B0F19]/95 backdrop-blur-xl border-b border-slate-800 px-2 flex items-center justify-between gap-1.5 shadow-xl">
          {/* [ 🏈 5v5 Flag ▾ ] */}
          <div className="relative shrink-0">
            <select
              value={activeCategoryTab}
              onChange={(e) => {
                const val = e.target.value as any;
                setActiveCategoryTab(val);
                handleSelectFormation(
                  val === 'flag_7v7' ? '7v7_Spread' : val === 'tackle_11v11' ? '11v11_Spread_2x2' : '5v5_Spread'
                );
              }}
              className="bg-slate-900 border border-slate-700 text-xs font-black text-[#00F0D0] rounded-xl px-2.5 py-2 focus:outline-none min-h-[44px] cursor-pointer appearance-none pr-6"
            >
              <option value="flag_5v5">🏈 5v5 Flag</option>
              <option value="flag_7v7">🏈 7v7 Flag</option>
              <option value="tackle_11v11">🛡️ 11v11</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* [ Active Play Name ] */}
          <button
            type="button"
            onClick={() => setIsPlayLabModalOpen(true)}
            className="flex-1 flex items-center justify-center gap-1 min-w-0 px-2.5 py-2 rounded-xl bg-slate-900/90 border border-slate-800 text-xs font-black text-white truncate min-h-[44px] cursor-pointer active:scale-98 transition-all"
            title="Open Playbook Library"
          >
            <span className="truncate">{playName}</span>
            {activeSlotIndex && <span className="text-[10px] text-amber-400 font-mono shrink-0">#{activeSlotIndex}</span>}
          </button>

          {/* [ ⚙ Coverage ] */}
          <div className="relative shrink-0">
            <select
              value={opponentCoverage}
              onChange={(e) => setOpponentCoverage(e.target.value as any)}
              className={`text-xs font-black rounded-xl px-2 py-2 focus:outline-none min-h-[44px] cursor-pointer appearance-none pr-5 border transition-all ${
                opponentCoverage !== 'off'
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/50'
                  : 'bg-slate-900 text-slate-300 border-slate-700'
              }`}
              title="Opponent Defensive Coverage Shell"
            >
              <option value="off">⚙ Off</option>
              <option value="cover_1">⚙ C1 Man</option>
              <option value="cover_2">⚙ C2 Zone</option>
              <option value="cover_3">⚙ C3 Zone</option>
              <option value="zero_blitz">⚡ Blitz</option>
            </select>
            <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* [ 🖨 Print ] */}
          {onExportPrintCard && (
            <button
              type="button"
              onClick={onExportPrintCard}
              className="min-h-[44px] min-w-[44px] px-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/40 flex items-center justify-center cursor-pointer shrink-0 transition-all active:scale-95"
              title="Print 12-Slot Wristband Card"
            >
              <Printer className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Top Control Bar: Formation Preset Picker & Playbook Tools (Desktop) */}
        <div className="hidden md:flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 p-4 bg-[#0B0F19]/95 border border-slate-800 rounded-3xl backdrop-blur-xl shadow-2xl">
          {/* Presets Navigation & Mode Toggle */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-3 w-full xl:w-auto">
            {/* Top-Level Mode Toggle: [ 🏈 Offense | 🛡️ Defense ] */}
            <div className="inline-flex rounded-2xl bg-slate-950 p-1 border border-slate-800 shrink-0 shadow-inner">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setTacticalMode('offense');
                }}
                className={`px-3 py-1.5 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                  tacticalMode === 'offense'
                    ? 'bg-[#00F0D0] text-black shadow-md shadow-[#00F0D0]/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>🏈 Offense</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setTacticalMode('defense');
                }}
                className={`px-3 py-1.5 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                  tacticalMode === 'defense'
                    ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20 ring-1 ring-rose-300'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Defense</span>
              </button>
            </div>

            {/* OFFENSE CONTROLS: Category Tabs + Formation Presets */}
            {tacticalMode === 'offense' && (
              <div className="flex flex-wrap items-center gap-2">
                {/* Category Segmented Tabs: 5v5 Flag / 7v7 Flag / 11v11 Tackle */}
                <div className="inline-flex rounded-2xl bg-slate-950 p-1 border border-slate-800 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveCategoryTab('flag_5v5');
                      handleSelectFormation('5v5_Spread');
                    }}
                    className={`px-2.5 py-1 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                      activeCategoryTab === 'flag_5v5'
                        ? 'bg-[#00F0D0] text-black shadow-md shadow-[#00F0D0]/20'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Flag className="w-3 h-3" />
                    <span>5v5 Flag</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveCategoryTab('flag_7v7');
                      handleSelectFormation('7v7_Spread');
                    }}
                    className={`px-2.5 py-1 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                      activeCategoryTab === 'flag_7v7'
                        ? 'bg-[#00F0D0] text-black shadow-md shadow-[#00F0D0]/20'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Flag className="w-3 h-3" />
                    <span>7v7 Flag</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveCategoryTab('tackle_11v11');
                      handleSelectFormation('11v11_Spread_2x2');
                    }}
                    className={`px-2.5 py-1 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                      activeCategoryTab === 'tackle_11v11'
                        ? 'bg-[#FF6A00] text-black shadow-md shadow-[#FF6A00]/20'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <ShieldAlert className="w-3 h-3" />
                    <span>11v11 Tackle</span>
                  </button>
                </div>

                {/* Presets Sub-Buttons */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {activeCategoryTab === 'flag_5v5' && (
                    <>
                      {['5v5_Spread', '5v5_Trips', '5v5_Bunch', '5v5_Empty'].map((fKey) => (
                        <button
                          key={fKey}
                          type="button"
                          onClick={() => handleSelectFormation(fKey)}
                          className={`px-2.5 py-1 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                            selectedFormationKey === fKey
                              ? 'bg-[#00F0D0]/20 text-[#00F0D0] border-[#00F0D0] shadow-sm'
                              : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          {fKey.replace('5v5_', '')}
                        </button>
                      ))}
                    </>
                  )}

                  {activeCategoryTab === 'flag_7v7' && (
                    <>
                      {['7v7_Spread', '7v7_Trips', '7v7_Bunch', '7v7_Empty'].map((fKey) => (
                        <button
                          key={fKey}
                          type="button"
                          onClick={() => handleSelectFormation(fKey)}
                          className={`px-2.5 py-1 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                            selectedFormationKey === fKey
                              ? 'bg-[#00F0D0]/20 text-[#00F0D0] border-[#00F0D0] shadow-sm'
                              : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          {fKey.replace('7v7_', '')}
                        </button>
                      ))}
                    </>
                  )}

                  {activeCategoryTab === 'tackle_11v11' && (
                    <>
                      {[
                        { key: '11v11_Spread_2x2', label: 'Spread 2x2' },
                        { key: '11v11_Trips_Open', label: 'Trips Open' },
                        { key: '11v11_Pistol', label: 'Pistol' },
                        { key: '11v11_I_Form', label: 'I-Form' },
                      ].map((fItem) => (
                        <button
                          key={fItem.key}
                          type="button"
                          onClick={() => handleSelectFormation(fItem.key)}
                          className={`px-2.5 py-1 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                            selectedFormationKey === fItem.key
                              ? 'bg-[#FF6A00]/20 text-[#FF6A00] border-[#FF6A00] shadow-sm'
                              : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          {fItem.label}
                        </button>
                      ))}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* DEFENSE CONTROLS: 4 Defensive Shell Presets + Vector Shading & Blitz Tools */}
            {tacticalMode === 'defense' && (
              <div className="flex flex-wrap items-center gap-2">
                {/* 4 Preset Shells */}
                <div className="inline-flex rounded-2xl bg-slate-950 p-1 border border-slate-800 shrink-0">
                  {(['Cover 2', 'Cover 3', 'Cover 1 Man-Free', '1-Rusher Spy'] as DefensePresetKey[]).map((shellKey) => (
                    <button
                      key={shellKey}
                      type="button"
                      onClick={() => handleSelectDefensePreset(shellKey)}
                      className={`px-2.5 py-1 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1 ${
                        activeDefensePreset === shellKey
                          ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>{shellKey}</span>
                    </button>
                  ))}
                </div>

                {/* Vector Tools: Zone Shading, Blitz, Man-Lock */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleToggleDefenseZone('Hook')}
                    className={`px-2 py-1 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                      defenseZones.some((z) => z.name === 'Hook')
                        ? 'bg-purple-500/30 text-purple-300 border-purple-400'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                    title="Toggle Hook Zone (Purple)"
                  >
                    + Hook
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleDefenseZone('Flat')}
                    className={`px-2 py-1 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                      defenseZones.some((z) => z.name === 'Flat')
                        ? 'bg-emerald-500/30 text-emerald-300 border-emerald-400'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                    title="Toggle Flat Zone (Green)"
                  >
                    + Flat
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleDefenseZone('Deep Half')}
                    className={`px-2 py-1 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                      defenseZones.some((z) => z.name.includes('Deep'))
                        ? 'bg-sky-500/30 text-sky-300 border-sky-400'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                    title="Toggle Deep Zone (Blue)"
                  >
                    + Deep
                  </button>

                  <button
                    type="button"
                    onClick={handleToggleBlitzArrow}
                    className={`px-2 py-1 rounded-xl text-[11px] font-bold border flex items-center gap-1 transition-all cursor-pointer ${
                      blitzArrows.length > 0
                        ? 'bg-rose-500 text-white border-rose-400 shadow-md shadow-rose-500/30'
                        : 'bg-slate-900 text-rose-400 border-slate-800 hover:bg-slate-800'
                    }`}
                    title="Toggle Blitz Arrow from Rusher to QB"
                  >
                    <Zap className="w-3 h-3 fill-current" />
                    <span>Blitz</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleToggleManLock}
                    className={`px-2 py-1 rounded-xl text-[11px] font-bold border flex items-center gap-1 transition-all cursor-pointer ${
                      manLockLinks.length > 0
                        ? 'bg-amber-500 text-black border-amber-300 shadow-md shadow-amber-500/30 font-black'
                        : 'bg-slate-900 text-amber-400 border-slate-800 hover:bg-slate-800'
                    }`}
                    title="Toggle Man-Lock Tethers to Offense"
                  >
                    {manLockLinks.length > 0 ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                    <span>Man-Lock</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResetDefense}
                    className="p-1 rounded-xl bg-slate-900 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-slate-700 cursor-pointer"
                    title="Reset Defensive Alignment"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Action Tools: 1-Tap Play Flip, Reset, Privacy Dropdown, Seeder, Wristband HUD */}
          <div className="flex items-center flex-wrap gap-2 shrink-0">
            {/* Active Vector Canvas Privacy Status Dropdown */}
            <PlayPrivacyDropdown
              size="md"
              isPublic={activeIsPublic}
              sharedTeams={activeSharedTeams}
              onChangePrivacy={handleUpdateActivePrivacy}
              onOpenTeamModal={() => setIsTeamModalOpen(true)}
            />

            {/* 1-Click "Load Flag Playbook (9 Plays)" Preset Seeder */}
            <button
              type="button"
              disabled={isSeedingPack}
              onClick={handleImportPackFromHeader}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#00F0D0]/10 hover:bg-[#00F0D0]/20 text-[#00F0D0] border border-[#00F0D0]/40 flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap disabled:opacity-50"
              title="1-Click Load 9 Vetted 5v5 Flag Plays into your private library"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isSeedingPack ? 'Importing Pack...' : '+ Import 5v5 Playbook Pack'}</span>
            </button>

            {/* 1-Tap Horizontal Play Mirroring */}
            <button
              type="button"
              onClick={handleFlipFormation}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                isFlipped
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/60 ring-1 ring-purple-500'
                  : 'bg-slate-900 text-slate-300 border-slate-700 hover:text-white hover:border-slate-500'
              }`}
              title="1-Tap Mirror Play: Inverts player X and route angles across field center"
            >
              <FlipHorizontal className="w-3.5 h-3.5" />
              <span>Flip Formation</span>
            </button>

            {/* PlayLab Vector Plays (Save / Library) */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setIsPlayLabModalOpen(true);
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#00F0D0] hover:bg-[#00d0b0] text-black shadow-md shadow-[#00F0D0]/20 flex items-center gap-1.5 transition-all cursor-pointer"
              title="Save current vector stems or load from PlayLab library"
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>PlayLab Plays</span>
            </button>

            {/* Clear All Routes */}
            <button
              type="button"
              onClick={handleClearAllRoutes}
              className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-rose-500/40 bg-rose-950/20 text-rose-300 hover:bg-rose-950/40 hover:border-rose-500 transition-all cursor-pointer"
              title="Clear all route paths without resetting player alignment"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Clear Routes</span>
            </button>

            {/* Reset */}
            <button
              type="button"
              onClick={handleResetFormation}
              className="p-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Reset Formation to Standard Alignment"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Wristband HUD Link */}
            {onOpenWristband && (
              <button
                type="button"
                onClick={onOpenWristband}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-[#00F0D0] border border-[#00F0D0]/30 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Wristband HUD</span>
              </button>
            )}

            {/* Physical Print Card */}
            {onExportPrintCard && (
              <button
                type="button"
                onClick={onExportPrintCard}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Print Card</span>
              </button>
            )}
          </div>
        </div>

        {/* 1-Click Import Notification Banner */}
        {seedingBannerText && (
          <div className="p-3 bg-emerald-500/15 border border-emerald-500/40 rounded-2xl flex items-center justify-between text-xs font-bold text-emerald-300 animate-in fade-in">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{seedingBannerText}</span>
            </div>
            <button
              type="button"
              onClick={() => setIsPlayLabModalOpen(true)}
              className="px-2.5 py-1 bg-emerald-500 text-black rounded-lg text-[11px] font-black hover:bg-emerald-400 transition-colors"
            >
              Open Library
            </button>
          </div>
        )}

        {/* Opponent Defensive Coverage Shell & Read Simulator Controls */}
        <div className="flex flex-col gap-2">
          <OpponentCoverageToolbar
            activeCoverage={opponentCoverage}
            onSelectCoverage={(cov) => {
              triggerHaptic('medium');
              setOpponentCoverage(cov);
            }}
          />

          {opponentCoverage !== 'off' && (
            <AudibleTacticalReadHUD
              coverage={opponentCoverage}
              openEvaluation={openTargetEvaluation}
              onApplyTacticalRead={(note) => {
                triggerHaptic('success');
                setTacticalIfThen(note);
              }}
            />
          )}
        </div>

        {/* Main Tactical Vector Canvas */}
        <div className="relative w-full aspect-[16/10] max-h-[440px] sm:max-h-[480px] lg:max-h-[520px] xl:max-h-[560px] bg-[#07130F] rounded-2xl md:rounded-3xl border-2 border-emerald-900/60 shadow-2xl overflow-hidden select-none">
          <svg
            ref={svgRef}
            viewBox="0 0 800 500"
            className="w-full h-full touch-none"
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onClick={() => {
              setSelectedPlayerId(null);
              setIsQuickRouteOpen(false);
            }}
          >
            {/* SVG Marker Definitions for Crisp Vector Route Ends (Enlarged 1.5x for on-field sideline visibility) */}
            <defs>
              {/* Default Cyan Arrowhead (1.5x enlarged) */}
              <marker
                id="marker-arrow-cyan"
                viewBox="0 0 10 10"
                refX="8.5"
                refY="5"
                markerWidth="9"
                markerHeight="9"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#00F0D0" />
              </marker>

              {/* Gold/Amber Arrowhead (1st Read - 1.5x enlarged) */}
              <marker
                id="marker-arrow-gold"
                viewBox="0 0 10 10"
                refX="8.5"
                refY="5"
                markerWidth="9"
                markerHeight="9"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#F59E0B" />
              </marker>

              {/* Pre-Snap Motion Arrowhead (Amber - 1.5x enlarged) */}
              <marker
                id="marker-arrow-motion"
                viewBox="0 0 10 10"
                refX="8.5"
                refY="5"
                markerWidth="9"
                markerHeight="9"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#F59E0B" />
              </marker>

              {/* Purple Arrowhead (Deep Routes - 1.5x enlarged) */}
              <marker
                id="marker-arrow-purple"
                viewBox="0 0 10 10"
                refX="8.5"
                refY="5"
                markerWidth="9"
                markerHeight="9"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#A855F7" />
              </marker>

              {/* Emerald Arrowhead (In-Breaking Routes - 1.5x enlarged) */}
              <marker
                id="marker-arrow-emerald"
                viewBox="0 0 10 10"
                refX="8.5"
                refY="5"
                markerWidth="9"
                markerHeight="9"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#10B981" />
              </marker>

              {/* White Arrowhead (Selected - 1.5x enlarged) */}
              <marker
                id="marker-arrow-white"
                viewBox="0 0 10 10"
                refX="8.5"
                refY="5"
                markerWidth="9"
                markerHeight="9"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#FFFFFF" />
              </marker>

              {/* Curl Loop Marker (1.5x enlarged) */}
              <marker
                id="marker-curl-cap"
                viewBox="0 0 10 10"
                refX="5"
                refY="5"
                markerWidth="10"
                markerHeight="10"
                orient="auto"
              >
                <circle cx="5" cy="5" r="4" fill="none" stroke="#00F0D0" strokeWidth="2.2" />
              </marker>

              {/* Block T-Bar Marker (1.5x enlarged) */}
              <marker
                id="marker-t-cap"
                viewBox="0 0 10 10"
                refX="5"
                refY="5"
                markerWidth="11"
                markerHeight="11"
                orient="auto"
              >
                <line x1="0" y1="5" x2="10" y2="5" stroke="#94A3B8" strokeWidth="3" />
              </marker>

              {/* Subtle turf stripe pattern */}
              <linearGradient id="turf-stripes" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0B1A14" />
                <stop offset="100%" stopColor="#08140F" />
              </linearGradient>
            </defs>

            {/* Field Background */}
            <rect width="800" height="500" fill="url(#turf-stripes)" />

            {/* Boundary Sideline Chalk */}
            <line x1="30" y1="0" x2="30" y2="500" stroke="rgba(255,255,255,0.25)" strokeWidth="2" />
            <line x1="770" y1="0" x2="770" y2="500" stroke="rgba(255,255,255,0.25)" strokeWidth="2" />
            <line x1="30" y1="12" x2="770" y2="12" stroke="rgba(255,255,255,0.22)" strokeWidth="2" />
            <line x1="30" y1="488" x2="770" y2="488" stroke="rgba(255,255,255,0.22)" strokeWidth="2" />

            {/* Field Increments every 50 units */}
            {[100, 150, 200, 250, 300, 350, 400, 450].map((yVal) => (
              <g key={yVal}>
                <line
                  x1="30"
                  y1={yVal}
                  x2="770"
                  y2={yVal}
                  stroke={yVal === 350 ? '#38BDF8' : 'rgba(255,255,255,0.12)'}
                  strokeWidth={yVal === 350 ? '3' : '1'}
                  strokeDasharray={yVal === 350 ? undefined : '2 4'}
                />

                {/* Hashes on intermediate yard lines */}
                <line x1="310" y1={yVal - 4} x2="310" y2={yVal + 4} stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />
                <line x1="490" y1={yVal - 4} x2="490" y2={yVal + 4} stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />

                {/* Yard numbers cleanly centered */}
                {yVal % 100 === 0 && (
                  <>
                    <text x="55" y={yVal + 4} textAnchor="middle" fill="rgba(255,255,255,0.28)" fontSize="13" fontWeight="900" fontFamily="monospace">
                      {50 - Math.abs(350 - yVal) / 5}
                    </text>
                    <text x="745" y={yVal + 4} textAnchor="middle" fill="rgba(255,255,255,0.28)" fontSize="13" fontWeight="900" fontFamily="monospace">
                      {50 - Math.abs(350 - yVal) / 5}
                    </text>
                  </>
                )}
              </g>
            ))}

            {/* Line of Scrimmage (LOS at Y=350) */}
            <g className="pointer-events-none select-none">
              <rect x="30" y="348" width="740" height="4" fill="#38BDF8" opacity="0.35" filter="blur(2px)" />
              <line x1="30" y1="350" x2="770" y2="350" stroke="#38BDF8" strokeWidth="2" opacity="0.85" />
              {/* Left Sideline LOS Badge - sits comfortably above player tokens at Y=333 with backdrop badge and CSS letter spacing */}
              <rect x="36" y="333" width="134" height="13" rx="3" fill="#07130F" fillOpacity="0.95" stroke="#38BDF8" strokeWidth="0.8" />
              <text x="103" y="342.5" textAnchor="middle" fill="#38BDF8" fontSize="8" fontWeight="900" fontFamily="monospace" style={{ letterSpacing: '0.05em' }}>
                LINE OF SCRIMMAGE (LOS)
              </text>
            </g>

            {/* 7-Yard Rusher Line for Flag Football (Y = 298) */}
            {isFlag && (
              <g className="pointer-events-none select-none">
                <line
                  x1="30"
                  y1="298"
                  x2="770"
                  y2="298"
                  stroke="#F59E0B"
                  strokeWidth="1.8"
                  strokeDasharray="6 3"
                  opacity="0.85"
                />
                <rect x="36" y="284" width="134" height="13" rx="3" fill="#07130F" fillOpacity="0.95" stroke="#F59E0B" strokeWidth="0.8" />
                <text x="103" y="293.5" textAnchor="middle" fill="#F59E0B" fontSize="8" fontWeight="900" fontFamily="monospace" style={{ letterSpacing: '0.05em' }}>
                  7-YD RUSHER LINE (FLAG)
                </text>
              </g>
            )}

            {/* First Down Marker Line (at y = 250, 10 yards ahead of LOS) */}
            <g className="pointer-events-none select-none">
              <line x1="30" y1="250" x2="770" y2="250" stroke="#FACC15" strokeWidth="1.5" strokeDasharray="6 3" opacity="0.75" />
              <rect x="632" y="238" width="124" height="13" rx="3" fill="#07130F" fillOpacity="0.95" stroke="#FACC15" strokeWidth="0.8" />
              <text x="694" y="247.5" textAnchor="middle" fill="#FACC15" fontSize="8" fontWeight="900" fontFamily="monospace" style={{ letterSpacing: '0.05em' }}>
                LINE TO GAIN (10Y)
              </text>
            </g>

            {/* Vector Route Paths Snapped to Canvas */}
            {players.map((p) => {
              if (p.routeNumber === undefined && (!p.routePoints || p.routePoints.length < 2)) return null;

              // Generate path string from svgPathD or point array
              let pathData = p.svgPathD;
              if (!pathData && p.routePoints && p.routePoints.length >= 2) {
                pathData = p.routePoints.reduce((acc, pt, i) => {
                  return i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
                }, '');
              }
              if (!pathData) return null;

              const isSelected = p.id === selectedPlayerId;
              const isOpenTarget = opponentCoverage !== 'off' && openTargetEvaluation.openPlayerId === p.id;
              const isBlock = p.routeNumber === 9;
              const is1stRead = p.readProgression === 1;
              const isDeep = p.routeNumber === 8 || p.routeNumber === 7;
              const isIn = p.routeNumber === 2 || p.routeNumber === 5;

              let strokeColor = '#00F0D0';
              let markerEnd = 'url(#marker-arrow-cyan)';

              if (isOpenTarget) {
                strokeColor = '#F59E0B';
                markerEnd = 'url(#marker-arrow-gold)';
              } else if (isSelected) {
                strokeColor = '#FFFFFF';
                markerEnd = 'url(#marker-arrow-white)';
              } else if (is1stRead) {
                strokeColor = '#F59E0B';
                markerEnd = 'url(#marker-arrow-gold)';
              } else if (isBlock) {
                strokeColor = '#94A3B8';
                markerEnd = 'url(#marker-t-cap)';
              } else if (p.endMarker === 'curl' || p.routeNumber === 0) {
                strokeColor = '#00F0D0';
                markerEnd = 'url(#marker-curl-cap)';
              } else if (isDeep) {
                strokeColor = '#A855F7';
                markerEnd = 'url(#marker-arrow-purple)';
              } else if (isIn) {
                strokeColor = '#10B981';
                markerEnd = 'url(#marker-arrow-emerald)';
              }

              const isPrimaryRead = is1stRead || isOpenTarget;
              const finalPoint = p.routePoints && p.routePoints.length >= 2 ? p.routePoints[p.routePoints.length - 1] : null;

              return (
                <g key={`route-${p.id}`} className="transition-opacity duration-150">
                  {/* High-Contrast Black Halo / Outline Border for Sunlit Turf Legibility */}
                  <path
                    d={pathData}
                    fill="none"
                    stroke="#000000"
                    strokeWidth={isPrimaryRead ? '8' : isSelected ? '7.5' : '7'}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.9"
                  />

                  {/* Route Glow Shadow (Field Visual Accent) */}
                  <path
                    d={pathData}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={isPrimaryRead ? '7' : isSelected ? '6' : '5'}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={isOpenTarget ? 0.6 : isSelected ? 0.4 : 0.2}
                    filter="blur(2px)"
                  />

                  {/* Primary High-Contrast Vector Path (Min 4px, 5px for Primary Read) */}
                  <path
                    d={pathData}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={isPrimaryRead ? '5' : isSelected ? '4.5' : '4'}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray={isBlock ? '5 3' : undefined}
                    markerEnd={markerEnd}
                  />

                  {/* Enlarged Pass Target Termination Point (1.5x) */}
                  {finalPoint && !isBlock && (
                    <circle
                      cx={finalPoint.x}
                      cy={finalPoint.y}
                      r={isPrimaryRead ? '5.5' : '4.5'}
                      fill={strokeColor}
                      stroke="#000000"
                      strokeWidth="2"
                      className="filter drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]"
                    />
                  )}
                </g>
              );
            })}

            {/* Pre-Snap Motion Dashed Horizontal Vectors Across Backfield */}
            {players.map((p) => {
              if (!p.motion?.enabled) return null;
              const startX = p.x;
              const startY = p.y;
              const targetX = p.motion.targetX;
              const targetY = p.motion.targetY;

              return (
                <g key={`motion-vec-${p.id}`} className="transition-all duration-200">
                  {/* Motion Black Halo Underneath */}
                  <line
                    x1={startX}
                    y1={startY}
                    x2={targetX}
                    y2={targetY}
                    stroke="#000000"
                    strokeWidth="7"
                    strokeLinecap="round"
                    strokeDasharray="6 4"
                    opacity="0.85"
                  />
                  {/* Motion Shadow Glow */}
                  <line
                    x1={startX}
                    y1={startY}
                    x2={targetX}
                    y2={targetY}
                    stroke="#F59E0B"
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeDasharray="6 4"
                    opacity="0.35"
                    filter="blur(1px)"
                  />
                  {/* Motion Primary Dashed Vector (Min 4px) */}
                  <line
                    x1={startX}
                    y1={startY}
                    x2={targetX}
                    y2={targetY}
                    stroke="#F59E0B"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray="6 4"
                    markerEnd="url(#marker-arrow-motion)"
                  />
                  {/* Motion Label Badge */}
                  <rect
                    x={(startX + targetX) / 2 - 25}
                    y={(startY + targetY) / 2 - 14}
                    width="50"
                    height="13"
                    rx="3.5"
                    fill="#0B0F19"
                    stroke="#F59E0B"
                    strokeWidth="1"
                    opacity="0.95"
                  />
                  <text
                    x={(startX + targetX) / 2}
                    y={(startY + targetY) / 2 - 5}
                    fill="#F59E0B"
                    fontSize="7.5"
                    fontWeight="900"
                    fontFamily="monospace"
                    textAnchor="middle"
                    letterSpacing="1"
                    className="pointer-events-none select-none"
                  >
                    MOTION
                  </text>
                </g>
              );
            })}

            {/* Opponent Defensive Coverage Shell (Zones, Honey Holes, Blitz Penetration, Open Target Pin, Defensive Tokens) */}
            {opponentCoverage !== 'off' && (
              <OpponentCoverageOverlay
                coverage={opponentCoverage}
                defensiveTokens={animatedOpponentDefensiveTokens}
                openEvaluation={openTargetEvaluation}
                offensivePlayers={players}
              />
            )}

            {/* Defensive Coverage Shell Overlay (Zone Area Shading, Blitz Vectors, Man-Lock Tethers) */}
            {(tacticalMode === 'defense' || defenseZones.length > 0 || blitzArrows.length > 0 || manLockLinks.length > 0) && (
              <DefensiveCanvasOverlay
                zones={defenseZones}
                blitzArrows={blitzArrows}
                manLockLinks={manLockLinks}
                defensivePlayers={defensivePlayers}
                offensivePlayers={players}
              />
            )}

            {/* Interactive Player Node Tokens (smoothly animated along vector routes when running play) */}
            {players.map((player) => {
              const animatedCoord = isPlaying
                ? getPointOnPolyline(player.routePoints, playProgress, { x: player.x, y: player.y })
                : { x: player.x, y: player.y };

              const animatedPlayer = isPlaying
                ? { ...player, x: animatedCoord.x, y: animatedCoord.y }
                : player;

              return (
                <g key={player.id} opacity={tacticalMode === 'defense' ? 0.45 : 1}>
                  <PlayerNode
                    player={animatedPlayer}
                    isSelected={player.id === selectedPlayerId && !isPlaying && tacticalMode === 'offense'}
                    onSelect={isPlaying || tacticalMode === 'defense' ? () => {} : handleSelectPlayer}
                    onDragStart={isPlaying || tacticalMode === 'defense' ? undefined : handlePointerDown}
                  />
                </g>
              );
            })}

            {/* Defensive Player Tokens (R, MLB, LCB, RCB, FS) */}
            {tacticalMode === 'defense' &&
              defensivePlayers.map((dPlayer) => (
                <DefensivePlayerNode
                  key={dPlayer.id}
                  player={dPlayer}
                  isSelected={dPlayer.id === selectedDefPlayerId}
                  onSelect={(dp) => {
                    setSelectedDefPlayerId(dp.id);
                    setSelectedPlayerId(null);
                    setIsQuickRouteOpen(false);
                  }}
                  onDragStart={handleDefensivePointerDown}
                />
              ))}
          </svg>

          {/* Animated Playback Progress Bar */}
          {isPlaying && (
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-slate-900/90 z-20 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 via-[#00F0D0] to-amber-400 transition-all duration-75"
                style={{ width: `${playProgress * 100}%` }}
              />
            </div>
          )}

          {/* 2.3-Second Rusher Timing Gauge Overlay during Playback */}
          {isPlaying && (
            <div className="absolute top-14 sm:top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none select-none">
              <div
                className={`px-3.5 py-1.5 rounded-full border backdrop-blur-xl shadow-2xl flex items-center gap-2 transition-all ${
                  playProgress * 2.3 < 1.5
                    ? 'bg-emerald-950/90 border-emerald-500/70 text-emerald-300'
                    : playProgress * 2.3 < 2.3
                    ? 'bg-amber-950/90 border-amber-500/70 text-amber-300'
                    : 'bg-rose-950/95 border-rose-500 text-rose-300 animate-pulse'
                }`}
              >
                <div
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    playProgress * 2.3 < 1.5
                      ? 'bg-emerald-400 animate-ping'
                      : playProgress * 2.3 < 2.3
                      ? 'bg-amber-400 animate-ping'
                      : 'bg-rose-400'
                  }`}
                />
                <span className="font-mono text-xs sm:text-sm font-black tracking-wider shrink-0">
                  {(playProgress * 2.3).toFixed(1)}s / 2.3s
                </span>
                <div className="h-3 w-px bg-white/20 shrink-0" />
                <span className="text-[10px] sm:text-xs font-black tracking-wide uppercase whitespace-nowrap">
                  {playProgress * 2.3 < 1.5
                    ? '⚡ HOT READ (< 1.5s)'
                    : playProgress * 2.3 < 2.3
                    ? '⚠️ POCKET CLOSING'
                    : '🚨 2.3s SACK WINDOW'}
                </span>
              </div>
            </div>
          )}

          {/* DIRECT-ON-CANVAS CONTROLS (Zero Button Overlap & Clean Ergonomics) */}

          {/* Top-Left: Compact Glassmorphic Secondary Utilities Toolbar [ Reset | Flip | Save Slot #X ] */}
          <div className="absolute top-3 left-3 z-30 flex items-center gap-1 sm:gap-1.5 p-1 sm:p-1.5 rounded-2xl bg-slate-950/85 backdrop-blur-xl border border-slate-700/80 shadow-2xl">
            {/* [ ↻ Reset Routes ] */}
            <button
              type="button"
              id="canvas-reset-routes-btn"
              onClick={handleClearAllRoutes}
              className="min-h-[44px] px-3 py-2 rounded-xl text-slate-300 hover:text-rose-400 hover:bg-rose-500/10 flex items-center gap-1.5 text-xs font-bold transition-all active:scale-95 cursor-pointer select-none"
              title="Reset All Routes"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">Reset</span>
            </button>

            <div className="h-5 w-px bg-slate-700/80" />

            {/* [ ⇄ Flip Formation (L/R) ] */}
            <button
              type="button"
              id="canvas-flip-formation-btn"
              onClick={handleFlipFormation}
              className={`min-h-[44px] px-3 py-2 rounded-xl flex items-center gap-1.5 text-xs font-bold transition-all active:scale-95 cursor-pointer select-none ${
                isFlipped
                  ? 'bg-purple-500/30 text-purple-300 border border-purple-500 ring-1 ring-purple-400'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
              title="Flip Formation Horizontally (L/R)"
            >
              <FlipHorizontal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Flip (L/R)</span>
            </button>

            <div className="h-5 w-px bg-slate-700/80" />

            {/* [ 💾 Quick Save to Active Slot ] */}
            <button
              type="button"
              id="canvas-quick-save-slot-btn"
              onClick={() => handleQuickSaveToSlot()}
              className="min-h-[44px] px-3 sm:px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 hover:text-amber-200 flex items-center gap-1.5 text-xs font-black transition-all active:scale-95 cursor-pointer select-none shadow-sm"
              title={`Quick Save to Call Sheet Slot #${activeSlotIndex}`}
            >
              <Bookmark className="w-3.5 h-3.5 fill-amber-400/30 text-amber-400" />
              <span>Save Slot #{activeSlotIndex}</span>
            </button>
          </div>

          {/* Bottom-Right: Standalone Floating Action Button [ ▶ Run Play ] */}
          <div className="absolute bottom-3 sm:bottom-4 right-3 sm:right-4 z-30 pointer-events-auto">
            <button
              type="button"
              id="canvas-run-play-btn"
              onClick={handleRunPlay}
              className={`min-h-[48px] min-w-[48px] px-5 py-2.5 rounded-2xl font-black text-xs sm:text-sm flex items-center gap-2.5 shadow-2xl backdrop-blur-xl border transition-all active:scale-95 cursor-pointer select-none ${
                isPlaying
                  ? 'bg-rose-500 hover:bg-rose-600 text-white border-rose-400 ring-2 ring-rose-500/50 animate-pulse'
                  : 'bg-[#00F0D0] hover:bg-cyan-300 text-black border-cyan-200 shadow-[0_0_30px_rgba(0,240,208,0.55)]'
              }`}
              title={isPlaying ? 'Stop Play Vector Animation' : 'Run Play Vector Animation'}
            >
              {isPlaying ? (
                <>
                  <div className="w-3.5 h-3.5 rounded-sm bg-white" />
                  <span>Stop</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Run Play</span>
                </>
              )}
            </button>
          </div>

          {/* Quick Route Assignment & Pre-Snap Motion Popover */}
          <QuickRoutePopover
            player={selectedPlayer}
            isOpen={isQuickRouteOpen && selectedPlayer !== null}
            isFlipped={isFlipped}
            onSelectRoute={(routeNum) => {
              handleAssignRoute(
                routeNum,
                selectedPlayer?.routeDepth || 'medium',
                selectedPlayer?.readProgression
              );
            }}
            onSetProgression={(prog) => {
              handleSetProgression(selectedPlayer?.id, prog);
            }}
            onToggleMotion={() => {
              handleToggleMotion(selectedPlayer?.id);
            }}
            onToggleBeatsCoverage={(coverageTag) => {
              handleToggleBeatsCoverage(selectedPlayer?.id, coverageTag);
            }}
            onClearPlayerRoute={() => {
              handleClearRoute();
            }}
            onOpenFullModal={() => {
              setIsQuickRouteOpen(false);
              setIsRoutePickerOpen(true);
            }}
            onClose={() => {
              setIsQuickRouteOpen(false);
            }}
          />

          {/* Tactical Canvas Overlay Watermark / Anchor Cue */}
          <div className="absolute top-2.5 left-3 sm:left-4 z-10 pointer-events-none flex items-center gap-1.5 font-mono text-[10px] text-emerald-300 font-bold tracking-wider bg-slate-950/90 backdrop-blur-md px-3 py-1 rounded-full border border-emerald-500/30 shadow-lg max-w-[calc(100%-24px)] sm:max-w-max">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0 animate-pulse" />
            <span className="hidden md:inline shrink-0 text-emerald-400/80">PLAYLAB VECTOR •</span>
            <span className="whitespace-nowrap overflow-hidden text-ellipsis">
              <span className="hidden sm:inline">TAP RECEIVER/CENTER TO ASSIGN ROUTE</span>
              <span className="sm:hidden">TAP PLAYER TO ASSIGN ROUTE</span>
            </span>
          </div>
        </div>

        {/* Coach Game-Day Telemetry Dispatcher Bar - Unified Sticky Action Footer */}
        <div className="sticky bottom-0 z-40 flex items-center justify-between gap-3 px-4 py-2 bg-slate-950/90 backdrop-blur border-t border-slate-800 rounded-b-2xl md:rounded-2xl shadow-2xl">
          <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar py-1 flex-1 min-w-0">
            {/* Play Name Input */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[10px] font-mono uppercase text-slate-400 font-bold whitespace-nowrap">Play:</span>
              <input
                type="text"
                value={playName}
                onChange={(e) => setPlayName(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-[#00F0D0] w-[130px] sm:w-[150px]"
              />
            </div>

            {/* Signal Code Input */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[10px] font-mono uppercase text-slate-400 font-bold whitespace-nowrap">Signal:</span>
              <input
                type="text"
                value={signalCode}
                onChange={(e) => setSignalCode(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono font-black text-[#00F0D0] focus:outline-none focus:border-[#00F0D0] w-[80px]"
              />
            </div>

            {/* Audible Color Selector */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[10px] font-mono uppercase text-slate-400 font-bold whitespace-nowrap">Color:</span>
              <select
                value={audibleColor}
                onChange={(e) => setAudibleColor(e.target.value)}
                className="px-2 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-[#00F0D0] cursor-pointer"
              >
                <option value="GREEN LIGHT">GREEN LIGHT</option>
                <option value="BLUE 42">BLUE 42</option>
                <option value="RED 80">RED 80</option>
                <option value="GOLDEN RUSH">GOLDEN RUSH</option>
                <option value="PURPLE RAIN">PURPLE RAIN</option>
                <option value="BLACK VIPER">BLACK VIPER</option>
              </select>
            </div>

            {/* Cadence */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[10px] font-mono uppercase text-slate-400 font-bold whitespace-nowrap">Snap:</span>
              <select
                value={cadence}
                onChange={(e) => setCadence(e.target.value)}
                className="px-2 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-[#00F0D0] cursor-pointer"
              >
                <option value="ON ONE">ON ONE</option>
                <option value="ON TWO">ON TWO</option>
                <option value="SOUND">ON SOUND</option>
                <option value="FREEZE">FREEZE</option>
              </select>
            </div>

            {/* Tactical Audible / If-Then Rule Field */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[10px] font-mono uppercase text-slate-400 font-bold whitespace-nowrap">
                Note:
              </span>
              <input
                type="text"
                value={tacticalIfThen}
                onChange={(e) => setTacticalIfThen(e.target.value)}
                placeholder="e.g. If Press -> Mesh"
                className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-medium text-amber-200 focus:outline-none focus:border-amber-400 w-[140px] sm:w-[180px]"
              />
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    setTacticalIfThen(e.target.value);
                  }
                }}
                defaultValue=""
                className="px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-[11px] text-slate-300 focus:outline-none cursor-pointer"
                title="Insert Tactical Preset"
              >
                <option value="" disabled>Presets ▾</option>
                {TACTICAL_IF_THEN_PRESETS.map((preset) => (
                  <option key={preset} value={preset}>
                    {preset}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Real-time Broadcast Dispatch Action Button (<200ms) */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handlePushToWristband}
              disabled={isDispatching}
              className={`shrink-0 min-w-[140px] sm:min-w-[180px] md:min-w-[210px] px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer whitespace-nowrap ${
                dispatchSuccess
                  ? 'bg-emerald-500 text-black shadow-emerald-500/30'
                  : 'bg-gradient-to-r from-[#00F0D0] to-cyan-500 hover:from-cyan-400 hover:to-[#00F0D0] text-black shadow-[0_0_20px_rgba(0,240,208,0.3)] active:scale-[0.98]'
              }`}
            >
              {dispatchSuccess ? (
                <>
                  <Check className="w-4 h-4 shrink-0 text-black" />
                  <span className="whitespace-nowrap">DISPATCHED (&lt;200MS)</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 shrink-0" />
                  <span className="hidden md:inline whitespace-nowrap">PUSH TO WRISTBAND HUD</span>
                  <span className="md:hidden whitespace-nowrap">PUSH TO HUD</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Tap-to-Assign Route Tree Bottom Sheet Modal */}
        <RouteTreeModal
          isOpen={isRoutePickerOpen}
          player={selectedPlayer}
          isFlipped={isFlipped}
          onClose={() => setIsRoutePickerOpen(false)}
          onSelectRoute={handleAssignRoute}
          onClearRoute={handleClearRoute}
        />

        {/* PlayLab Vector Play Save / Library Modal */}
        <PlayLabPlayModal
          isOpen={isPlayLabModalOpen}
          onClose={() => setIsPlayLabModalOpen(false)}
          players={players}
          currentPlayName={playName}
          activeFormat={activeCategoryTab === 'flag_7v7' ? '7v7' : activeCategoryTab === 'tackle_11v11' ? '11v11' : '5v5'}
          activeTeamId={activeTeamId}
          onLoadPlay={handleLoadPlayLabPlay}
        />

        {/* Team Select Modal for Wristband HUD Access */}
        {isTeamModalOpen && (
          <TeamSelectModal
            isOpen={isTeamModalOpen}
            onClose={() => setIsTeamModalOpen(false)}
            playName={playName}
            currentSharedTeams={activeSharedTeams}
            defaultTeamId={activeTeamId}
            onSaveSharedTeams={(newTeams) => {
              handleUpdateActivePrivacy({
                isPublic: false,
                sharedTeams: newTeams,
              });
              setIsTeamModalOpen(false);
            }}
          />
        )}

        {/* Mobile Secondary Settings Modal / Bottom Sheet */}
        {isMobileSettingsOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="w-full max-w-lg bg-[#0B0F19] border border-slate-800 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto text-slate-100">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-[#00F0D0]" />
                  Tactical Settings &amp; Formations
                </h3>
                <button
                  type="button"
                  onClick={() => setIsMobileSettingsOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Formations list */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-slate-400">Select Preset Formation:</span>
                <div className="grid grid-cols-2 gap-2">
                  {activeCategoryTab === 'flag_5v5' &&
                    ['5v5_Spread', '5v5_Trips', '5v5_Bunch', '5v5_Empty'].map((fKey) => (
                      <button
                        key={`mob-f-${fKey}`}
                        type="button"
                        onClick={() => {
                          handleSelectFormation(fKey);
                          setIsMobileSettingsOpen(false);
                        }}
                        className={`p-2.5 rounded-xl text-xs font-bold border text-left transition-all cursor-pointer ${
                          selectedFormationKey === fKey
                            ? 'bg-[#00F0D0]/20 text-[#00F0D0] border-[#00F0D0]'
                            : 'bg-slate-900 border-slate-800 text-slate-300'
                        }`}
                      >
                        {fKey.replace('5v5_', '')}
                      </button>
                    ))}
                  {activeCategoryTab === 'flag_7v7' &&
                    ['7v7_Spread', '7v7_Trips', '7v7_Bunch', '7v7_Empty'].map((fKey) => (
                      <button
                        key={`mob-f7-${fKey}`}
                        type="button"
                        onClick={() => {
                          handleSelectFormation(fKey);
                          setIsMobileSettingsOpen(false);
                        }}
                        className={`p-2.5 rounded-xl text-xs font-bold border text-left transition-all cursor-pointer ${
                          selectedFormationKey === fKey
                            ? 'bg-[#00F0D0]/20 text-[#00F0D0] border-[#00F0D0]'
                            : 'bg-slate-900 border-slate-800 text-slate-300'
                        }`}
                      >
                        {fKey.replace('7v7_', '')}
                      </button>
                    ))}
                  {activeCategoryTab === 'tackle_11v11' &&
                    [
                      { key: '11v11_Spread_2x2', label: 'Spread 2x2' },
                      { key: '11v11_Trips_Open', label: 'Trips Open' },
                      { key: '11v11_Pistol', label: 'Pistol' },
                      { key: '11v11_I_Form', label: 'I-Form' },
                    ].map((fItem) => (
                      <button
                        key={`mob-f11-${fItem.key}`}
                        type="button"
                        onClick={() => {
                          handleSelectFormation(fItem.key);
                          setIsMobileSettingsOpen(false);
                        }}
                        className={`p-2.5 rounded-xl text-xs font-bold border text-left transition-all cursor-pointer ${
                          selectedFormationKey === fItem.key
                            ? 'bg-[#FF6A00]/20 text-[#FF6A00] border-[#FF6A00]'
                            : 'bg-slate-900 border-slate-800 text-slate-300'
                        }`}
                      >
                        {fItem.label}
                      </button>
                    ))}
                </div>
              </div>

              {/* Play details: Cadence, Audible, Signal Code */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="text-[10px] font-mono uppercase text-slate-400 font-bold block mb-1">Cadence:</label>
                  <select
                    value={cadence}
                    onChange={(e) => setCadence(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-xs font-bold text-white cursor-pointer"
                  >
                    <option value="ON ONE">ON ONE</option>
                    <option value="ON TWO">ON TWO</option>
                    <option value="SOUND">ON SOUND</option>
                    <option value="FREEZE">FREEZE / DUMMY</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase text-slate-400 font-bold block mb-1">Audible Color:</label>
                  <select
                    value={audibleColor}
                    onChange={(e) => setAudibleColor(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-xs font-bold text-white cursor-pointer"
                  >
                    <option value="GREEN LIGHT">GREEN LIGHT</option>
                    <option value="BLUE 42">BLUE 42</option>
                    <option value="RED 80">RED 80</option>
                    <option value="GOLDEN RUSH">GOLDEN RUSH</option>
                    <option value="PURPLE RAIN">PURPLE RAIN</option>
                    <option value="BLACK VIPER">BLACK VIPER</option>
                  </select>
                </div>
              </div>

              {/* Preset Seeder */}
              <div className="pt-2">
                <button
                  type="button"
                  disabled={isSeedingPack}
                  onClick={async () => {
                    await handleImportPackFromHeader();
                    setIsMobileSettingsOpen(false);
                  }}
                  className="w-full py-2.5 rounded-xl bg-[#00F0D0]/15 border border-[#00F0D0]/40 text-[#00F0D0] font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-[#00F0D0]" />
                  <span>{isSeedingPack ? 'Importing Pack...' : '+ Import 5v5 Playbook Pack'}</span>
                </button>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    handleResetFormation();
                    setIsMobileSettingsOpen(false);
                  }}
                  className="w-full py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Reset Formation to Standard Alignment</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PlayLabErrorBoundary>
  );
};

export default PlayLabCanvas;
