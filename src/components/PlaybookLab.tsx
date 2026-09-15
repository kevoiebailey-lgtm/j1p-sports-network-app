'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Play,
  RotateCcw,
  Save,
  Plus,
  Trash2,
  CheckCircle2,
  Settings,
  Circle,
  X as XIcon,
  Square,
  Sparkles,
  Share2,
  ExternalLink,
  ChevronRight,
  Eye,
  Sliders,
  Shield,
  Zap,
  Download,
  Undo2,
  Redo2,
  Image as ImageIcon,
  FileCode,
  ChevronDown,
  Loader2,
  Compass,
  ArrowUpRight,
  Pencil,
  Move,
  FlipHorizontal,
  Layers,
  HelpCircle,
  Printer,
  Target,
  Flame,
  Activity,
  FolderOpen,
  Radio,
  Watch
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ShareButton } from './ShareButton';
import { RouteTreeDrawer } from './Playbook/RouteTreeDrawer';
import { CoverageDiagnosticModal } from './Playbook/CoverageDiagnosticModal';
import { WristbandGeneratorModal } from './Playbook/WristbandGeneratorModal';
import { PlaybookAIModal } from './Playbook/PlaybookAIModal';
import { SavedPlaysModal } from './Playbook/SavedPlaysModal';
import { SignalHubUpgradeCard } from './Playbook/SignalHub/SignalHubUpgradeCard';
import { CoachSignalDispatcherModal } from './Playbook/SignalHub/CoachSignalDispatcherModal';
import { WristHudReceiverView } from './Playbook/SignalHub/WristHudReceiverView';
import { LiveDispatcherModal } from './playbook/LiveDispatcherModal';
import { RouteLibraryModal } from './playbook/RouteLibraryModal';
import { AIAssistantModal } from './playbook/AIAssistantModal';
import { savePlay, getPlayById, updatePlay } from '../services/playbookService';
import { 
  SportType, 
  TokenShape, 
  PlayerNode, 
  ProgressionRead, 
  BlockingType, 
  PreSnapMotion,
  PlaybookCardData
} from './Playbook/types';
import { 
  ROUTE_TREE_DEFINITIONS, 
  PASSING_CONCEPTS_PRESETS, 
  PassingConcept, 
  RouteDefinition 
} from './Playbook/routeTreeLibrary';

export type { SportType, TokenShape, PlayerNode };

const COLOR_PALETTE = ['#10b981', '#38bdf8', '#ef4444', '#f59e0b', '#a855f7', '#ffffff', '#ec4899', '#6366f1'];

export const SPORT_PRESETS: Record<SportType, { name: string; icon: string; players: PlayerNode[] }> = {
  flag_5v5: {
    name: 'Flag Football (5v5)',
    icon: '🏈',
    players: [
      { id: 'qb', label: 'QB', role: 'offense', shape: 'circle', color: '#10b981', x: 400, y: 430, route: [], assignedRoute: '3-Step Drop, Read FS' },
      { id: 'c', label: 'C', role: 'offense', shape: 'circle', color: '#10b981', x: 400, y: 350, route: [{ x: 400, y: 250 }, { x: 500, y: 250 }], progression: 'checkdown', assignedRoute: 'Check Flat Option', readOrder: 'CHK' },
      { id: 'wr1', label: 'WR1', role: 'offense', shape: 'circle', color: '#10b981', x: 140, y: 350, route: [{ x: 140, y: 220 }, { x: 280, y: 150 }], progression: '1', assignedRoute: '10-Yd Corner Cut', readOrder: '1st Read' },
      { id: 'wr2', label: 'WR2', role: 'offense', shape: 'circle', color: '#10b981', x: 660, y: 350, route: [{ x: 660, y: 180 }], progression: 'clearout', assignedRoute: 'Streak Clear-Out', readOrder: 'CLR' },
      { id: 'slot', label: 'SLOT', role: 'offense', shape: 'circle', color: '#10b981', x: 260, y: 360, route: [{ x: 120, y: 270 }], progression: '2', assignedRoute: 'Underneath Drag', readOrder: '2nd Read' },
      { id: 'rusher', label: 'RUSH', role: 'defense', shape: 'cross', color: '#ef4444', x: 400, y: 250, route: [{ x: 400, y: 410 }] },
      { id: 'cb1', label: 'CB', role: 'defense', shape: 'cross', color: '#ef4444', x: 140, y: 220, route: [{ x: 180, y: 200 }] },
      { id: 'safety', label: 'FS', role: 'defense', shape: 'cross', color: '#ef4444', x: 400, y: 140, route: [{ x: 300, y: 140 }] },
    ],
  },
  flag_7v7: {
    name: 'Flag Football (7v7)',
    icon: '🏈',
    players: [
      { id: 'qb', label: 'QB', role: 'offense', shape: 'circle', color: '#10b981', x: 400, y: 440, route: [], assignedRoute: 'Shotgun 3-Step, Read Safety' },
      { id: 'c', label: 'C', role: 'offense', shape: 'circle', color: '#10b981', x: 400, y: 350, route: [], assignedRoute: 'Pass Pro / Check Middle' },
      { id: 'x', label: 'X', role: 'offense', shape: 'circle', color: '#10b981', x: 100, y: 350, route: [{ x: 100, y: 150 }], progression: '1', assignedRoute: 'Go / Fade Route', readOrder: '1st Read' },
      { id: 'y', label: 'Y', role: 'offense', shape: 'circle', color: '#10b981', x: 230, y: 360, route: [{ x: 230, y: 240 }, { x: 400, y: 240 }], progression: '2', assignedRoute: '10-Yd Dig In', readOrder: '2nd Read' },
      { id: 'z', label: 'Z', role: 'offense', shape: 'circle', color: '#10b981', x: 700, y: 350, route: [{ x: 700, y: 200 }, { x: 550, y: 120 }], progression: '3', assignedRoute: 'Deep Post Route', readOrder: '3rd Read' },
      { id: 'h', label: 'H', role: 'offense', shape: 'circle', color: '#10b981', x: 570, y: 360, route: [{ x: 720, y: 290 }], progression: 'clearout', assignedRoute: 'Speed Out to Sideline', readOrder: 'CLR' },
      { id: 'rb', label: 'RB', role: 'offense', shape: 'circle', color: '#10b981', x: 460, y: 430, route: [{ x: 540, y: 370 }, { x: 540, y: 280 }], progression: 'checkdown', assignedRoute: 'Wheel Route Option', readOrder: 'CHK' },
      { id: 'mlb', label: 'MLB', role: 'defense', shape: 'cross', color: '#ef4444', x: 400, y: 240, route: [] },
      { id: 'cb1', label: 'CB1', role: 'defense', shape: 'cross', color: '#ef4444', x: 100, y: 220, route: [] },
      { id: 'cb2', label: 'CB2', role: 'defense', shape: 'cross', color: '#ef4444', x: 700, y: 220, route: [] },
    ],
  },
  football_11v11: {
    name: 'Tackle Football (11v11)',
    icon: '🛡️',
    players: [
      { id: 'qb', label: 'QB', role: 'offense', shape: 'circle', color: '#10b981', x: 400, y: 410, route: [] },
      { id: 'c', label: 'C', role: 'offense', shape: 'square', color: '#38bdf8', x: 400, y: 350, route: [] },
      { id: 'rg', label: 'G', role: 'offense', shape: 'square', color: '#38bdf8', x: 440, y: 350, route: [] },
      { id: 'lg', label: 'G', role: 'offense', shape: 'square', color: '#38bdf8', x: 360, y: 350, route: [] },
      { id: 'rt', label: 'T', role: 'offense', shape: 'square', color: '#38bdf8', x: 480, y: 350, route: [] },
      { id: 'lt', label: 'T', role: 'offense', shape: 'square', color: '#38bdf8', x: 320, y: 350, route: [] },
      { id: 'wr1', label: 'WR', role: 'offense', shape: 'circle', color: '#10b981', x: 100, y: 350, route: [{ x: 100, y: 120 }] },
      { id: 'wr2', label: 'WR', role: 'offense', shape: 'circle', color: '#10b981', x: 700, y: 350, route: [{ x: 700, y: 220 }, { x: 550, y: 150 }] },
      { id: 'rb', label: 'RB', role: 'offense', shape: 'circle', color: '#10b981', x: 400, y: 450, route: [{ x: 460, y: 390 }, { x: 520, y: 280 }] },
      { id: 'te', label: 'TE', role: 'offense', shape: 'circle', color: '#10b981', x: 520, y: 350, route: [{ x: 520, y: 240 }, { x: 440, y: 200 }] },
      { id: 'dt1', label: 'DT', role: 'defense', shape: 'cross', color: '#ef4444', x: 380, y: 330, route: [] },
      { id: 'dt2', label: 'DT', role: 'defense', shape: 'cross', color: '#ef4444', x: 420, y: 330, route: [] },
    ],
  },
  basketball: {
    name: 'Basketball (Half Court)',
    icon: '🏀',
    players: [
      { id: 'pg', label: '1', role: 'offense', shape: 'circle', color: '#f59e0b', x: 400, y: 440, route: [{ x: 400, y: 320 }, { x: 280, y: 200 }] },
      { id: 'sg', label: '2', role: 'offense', shape: 'circle', color: '#f59e0b', x: 180, y: 360, route: [{ x: 160, y: 200 }] },
      { id: 'sf', label: '3', role: 'offense', shape: 'circle', color: '#f59e0b', x: 620, y: 360, route: [{ x: 640, y: 220 }] },
      { id: 'pf', label: '4', role: 'offense', shape: 'circle', color: '#f59e0b', x: 280, y: 200, route: [{ x: 380, y: 340 }] },
      { id: 'c', label: '5', role: 'offense', shape: 'circle', color: '#f59e0b', x: 520, y: 180, route: [{ x: 420, y: 120 }] },
      { id: 'd1', label: 'X1', role: 'defense', shape: 'cross', color: '#ef4444', x: 400, y: 380, route: [] },
      { id: 'd2', label: 'X2', role: 'defense', shape: 'cross', color: '#ef4444', x: 200, y: 310, route: [] },
      { id: 'd3', label: 'X3', role: 'defense', shape: 'cross', color: '#ef4444', x: 600, y: 310, route: [] },
    ],
  },
  soccer: {
    name: 'Soccer (Attacking Zone)',
    icon: '⚽',
    players: [
      { id: 'st', label: 'ST', role: 'offense', shape: 'circle', color: '#10b981', x: 400, y: 180, route: [{ x: 400, y: 90 }] },
      { id: 'lw', label: 'LW', role: 'offense', shape: 'circle', color: '#10b981', x: 180, y: 240, route: [{ x: 160, y: 120 }, { x: 280, y: 90 }] },
      { id: 'rw', label: 'RW', role: 'offense', shape: 'circle', color: '#10b981', x: 620, y: 240, route: [{ x: 640, y: 120 }] },
      { id: 'cam', label: 'CAM', role: 'offense', shape: 'circle', color: '#10b981', x: 400, y: 320, route: [{ x: 400, y: 220 }] },
      { id: 'cm', label: 'CM', role: 'offense', shape: 'circle', color: '#10b981', x: 400, y: 420, route: [{ x: 340, y: 330 }] },
      { id: 'cb', label: 'CB', role: 'defense', shape: 'cross', color: '#ef4444', x: 400, y: 140, route: [] },
      { id: 'gk', label: 'GK', role: 'defense', shape: 'square', color: '#f59e0b', x: 400, y: 40, route: [] },
    ],
  },
  lacrosse: {
    name: 'Lacrosse (Crease & Wing)',
    icon: '🥍',
    players: [
      { id: 'a1', label: 'A1', role: 'offense', shape: 'circle', color: '#38bdf8', x: 400, y: 200, route: [{ x: 400, y: 130 }] },
      { id: 'a2', label: 'A2', role: 'offense', shape: 'circle', color: '#38bdf8', x: 220, y: 200, route: [{ x: 180, y: 120 }] },
      { id: 'a3', label: 'A3', role: 'offense', shape: 'circle', color: '#38bdf8', x: 580, y: 200, route: [{ x: 620, y: 120 }] },
      { id: 'm1', label: 'M1', role: 'offense', shape: 'circle', color: '#38bdf8', x: 400, y: 380, route: [{ x: 400, y: 280 }] },
      { id: 'g', label: 'G', role: 'defense', shape: 'square', color: '#ef4444', x: 400, y: 80, route: [] },
      { id: 'd1', label: 'D1', role: 'defense', shape: 'cross', color: '#ef4444', x: 400, y: 170, route: [] },
    ],
  },
};

export interface PlaybookLabProps {
  currentUserId?: string;
  initialPlayId?: string;
  onPlaySaved?: (playId: string) => void;
  readOnly?: boolean;
}

export function PlaybookLab({ currentUserId, initialPlayId, onPlaySaved, readOnly = false }: PlaybookLabProps) {
  const { user, profile } = useAuth();
  const effectiveUserId = currentUserId || user?.uid || 'guest_coach';
  const effectiveAuthorName = user?.displayName || 'Coach / Athlete';

  // J1P Signal Hub State & Gating
  const [showSignalDispatcherModal, setShowSignalDispatcherModal] = useState(false);
  const [showLiveTextDispatcher, setShowLiveTextDispatcher] = useState(false);
  const [showTestReceiverModal, setShowTestReceiverModal] = useState<{ isOpen: boolean; pin: string; pos: string }>({
    isOpen: false,
    pin: '',
    pos: 'QB'
  });
  const isSignalHubUnlocked = Boolean(
    profile?.hasSignalHubAddon ||
    profile?.isCoachPass ||
    profile?.isDirectorEnterprise ||
    profile?.subscriptionTier === 'PRO_PLAYBOOK' ||
    profile?.isNCAAPro
  );

  const [selectedSport, setSelectedSport] = useState<SportType>('flag_5v5');
  const [playTitle, setPlayTitle] = useState('5v5 Mesh Option');
  const [playDescription, setPlayDescription] = useState('Quick mesh cross underneath with deep corner stretch.');
  const [players, setPlayers] = useState<PlayerNode[]>(SPORT_PRESETS.flag_5v5.players);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [isDrawingRoute, setIsDrawingRoute] = useState(false);
  const [drawingMode, setDrawingMode] = useState<'freehand' | 'waypoint'>('waypoint');
  const [showRouteDrawerModal, setShowRouteDrawerModal] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationDuration, setAnimationDuration] = useState(2.5);
  const [isSaving, setIsSaving] = useState(false);
  const [savedPlayId, setSavedPlayId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState<'png' | 'svg' | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement | null>(null);

  // Next-Gen Modals State
  const [showCoverageDiagnosticModal, setShowCoverageDiagnosticModal] = useState(false);
  const [showWristbandModal, setShowWristbandModal] = useState(false);
  const [showAIPlayModal, setShowAIPlayModal] = useState(false);
  const [showSavedPlaysModal, setShowSavedPlaysModal] = useState(false);
  const [showRouteLibraryModal, setShowRouteLibraryModal] = useState(false);
  const [showAIAssistantModal, setShowAIAssistantModal] = useState(false);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<string | null>(null);

  // J1P Task 43 & 44: Pure Text Wrist HUD Dispatcher Payload & Trigger
  const [dispatcherPayload, setDispatcherPayload] = useState<{
    playName: string;
    formation: string;
    positions: Record<string, string>;
  } | null>(null);
  const [isDispatcherOpen, setIsDispatcherOpen] = useState(false);

  // Visual Overlay Toggles
  const [showProgressionReads, setShowProgressionReads] = useState(true);
  const [showQBVisionCone, setShowQBVisionCone] = useState(true);
  const [showBlockingVectors, setShowBlockingVectors] = useState(true);
  const [passType, setPassType] = useState<'bullet' | 'touch_lob'>('bullet');

  // Close export dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    };
    if (showExportMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showExportMenu]);

  // Undo / Redo History Stack
  const [undoStack, setUndoStack] = useState<PlayerNode[][]>([]);
  const [redoStack, setRedoStack] = useState<PlayerNode[][]>([]);
  const playersRef = useRef(players);
  playersRef.current = players;
  const dragStartSnapshotRef = useRef<PlayerNode[] | null>(null);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const [draggedPlayer, setDraggedPlayer] = useState<string | null>(null);
  const playerDragStartCoordRef = useRef<{ x: number; y: number; initialRoute: { x: number; y: number }[] } | null>(null);
  const [draggedWaypoint, setDraggedWaypoint] = useState<{ playerId: string; pointIndex: number } | null>(null);
  const [isSketching, setIsSketching] = useState(false);
  const [currentSketch, setCurrentSketch] = useState<{ x: number; y: number }[]>([]);
  const touchStartPosRef = useRef<{ x: number; y: number; time: number } | null>(null);

  // Record a snapshot of players into undo stack and clear redo stack
  const recordUndoSnapshot = (currentPlayers: PlayerNode[]) => {
    setUndoStack((prev) => [...prev.slice(-49), JSON.parse(JSON.stringify(currentPlayers))]);
    setRedoStack([]);
  };

  const handleUndo = () => {
    if (readOnly || undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    const newUndoStack = undoStack.slice(0, -1);

    setRedoStack((prev) => [...prev.slice(-49), JSON.parse(JSON.stringify(playersRef.current))]);
    setUndoStack(newUndoStack);
    setPlayers(previous);

    if (selectedPlayerId && !previous.some((p) => p.id === selectedPlayerId)) {
      setSelectedPlayerId(null);
    }
  };

  const handleRedo = () => {
    if (readOnly || redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    const newRedoStack = redoStack.slice(0, -1);

    setUndoStack((prev) => [...prev.slice(-49), JSON.parse(JSON.stringify(playersRef.current))]);
    setRedoStack(newRedoStack);
    setPlayers(next);

    if (selectedPlayerId && !next.some((p) => p.id === selectedPlayerId)) {
      setSelectedPlayerId(null);
    }
  };

  // Keyboard shortcut listener for Undo (Ctrl/Cmd+Z) and Redo (Ctrl/Cmd+Y, Ctrl/Cmd+Shift+Z)
  useEffect(() => {
    if (readOnly) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      if (isCtrlOrCmd && key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if (isCtrlOrCmd && key === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [readOnly, undoStack, redoStack, players, selectedPlayerId]);

  // Load existing play if initialPlayId provided
  useEffect(() => {
    if (!initialPlayId) return;
    const fetchExistingPlay = async () => {
      try {
        const loadedPlay = await getPlayById(initialPlayId);
        if (loadedPlay) {
          if (loadedPlay.title) setPlayTitle(loadedPlay.title);
          if (loadedPlay.description) setPlayDescription(loadedPlay.description);
          if (loadedPlay.sport && SPORT_PRESETS[loadedPlay.sport]) {
            setSelectedSport(loadedPlay.sport);
          }
          if (Array.isArray(loadedPlay.players) && loadedPlay.players.length > 0) {
            setPlayers(loadedPlay.players);
            setUndoStack([]);
            setRedoStack([]);
          }
          setSavedPlayId(loadedPlay.id);
        }
      } catch (e) {
        console.error('Error fetching existing play:', e);
      }
    };
    fetchExistingPlay();
  }, [initialPlayId]);

  const selectedPlayer = players.find((p) => p.id === selectedPlayerId);

  // SVG coordinate converter with responsive bounds from client coords
  const getSVGCoordinatesFromClient = (clientX: number, clientY: number) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return { x: 0, y: 0 };
    const x = ((clientX - rect.left) / rect.width) * 800;
    const y = ((clientY - rect.top) / rect.height) * 500;
    return { 
      x: Math.max(10, Math.min(790, Math.round(x))), 
      y: Math.max(10, Math.min(490, Math.round(y))) 
    };
  };

  const getSVGCoordinates = (
    e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement> | React.PointerEvent<SVGSVGElement>
  ) => {
    if ('touches' in e && e.touches.length > 0) {
      return getSVGCoordinatesFromClient(e.touches[0].clientX, e.touches[0].clientY);
    }
    if ('changedTouches' in e && e.changedTouches.length > 0) {
      return getSVGCoordinatesFromClient(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
    }
    if ('clientX' in e) {
      return getSVGCoordinatesFromClient((e as React.MouseEvent).clientX, (e as React.MouseEvent).clientY);
    }
    return { x: 0, y: 0 };
  };

  // --- MOUSE & TOUCH HANDLERS FOR DRAGGING AND DRAWING ---

  const handleMouseDown = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (readOnly) return;
    setSelectedPlayerId(id);
    if (!isDrawingRoute) {
      dragStartSnapshotRef.current = JSON.parse(JSON.stringify(playersRef.current));
      const targetP = playersRef.current.find((p) => p.id === id);
      if (targetP) {
        playerDragStartCoordRef.current = {
          x: targetP.x,
          y: targetP.y,
          initialRoute: JSON.parse(JSON.stringify(targetP.route || []))
        };
      }
      setDraggedPlayer(id);
    }
  };

  const handleTouchStartPlayer = (id: string, e: React.TouchEvent) => {
    e.stopPropagation();
    if (readOnly) return;
    
    if (e.touches.length > 0) {
      touchStartPosRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        time: Date.now()
      };
    }

    setSelectedPlayerId(id);
    if (!isDrawingRoute) {
      dragStartSnapshotRef.current = JSON.parse(JSON.stringify(playersRef.current));
      const targetP = playersRef.current.find((p) => p.id === id);
      if (targetP) {
        playerDragStartCoordRef.current = {
          x: targetP.x,
          y: targetP.y,
          initialRoute: JSON.parse(JSON.stringify(targetP.route || []))
        };
      }
      setDraggedPlayer(id);
    }
  };

  // Start dragging a specific route waypoint/cut handle
  const handleWaypointMouseDown = (playerId: string, pointIndex: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (readOnly) return;
    dragStartSnapshotRef.current = JSON.parse(JSON.stringify(playersRef.current));
    setDraggedWaypoint({ playerId, pointIndex });
  };

  const handleWaypointTouchStart = (playerId: string, pointIndex: number, e: React.TouchEvent) => {
    e.stopPropagation();
    if (readOnly) return;
    dragStartSnapshotRef.current = JSON.parse(JSON.stringify(playersRef.current));
    setDraggedWaypoint({ playerId, pointIndex });
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (readOnly) return;
    const { x, y } = getSVGCoordinates(e);

    // 1. Dragging a waypoint handle to adjust a route cut
    if (draggedWaypoint) {
      setPlayers((prev) =>
        prev.map((p) => {
          if (p.id !== draggedWaypoint.playerId) return p;
          const updatedRoute = [...p.route];
          if (updatedRoute[draggedWaypoint.pointIndex]) {
            updatedRoute[draggedWaypoint.pointIndex] = { x, y };
          }
          return { ...p, route: updatedRoute };
        })
      );
      return;
    }

    // 2. Dragging a player token - Translate entire route along with player
    if (draggedPlayer && !isDrawingRoute) {
      setPlayers((prev) =>
        prev.map((p) => {
          if (p.id !== draggedPlayer) return p;
          if (playerDragStartCoordRef.current) {
            const dx = x - playerDragStartCoordRef.current.x;
            const dy = y - playerDragStartCoordRef.current.y;
            const shiftedRoute = playerDragStartCoordRef.current.initialRoute.map((pt) => ({
              x: Math.max(10, Math.min(790, pt.x + dx)),
              y: Math.max(10, Math.min(490, pt.y + dy))
            }));
            return { ...p, x, y, route: shiftedRoute };
          }
          return { ...p, x, y };
        })
      );
      return;
    }

    // 3. Freehand sketch drawing live preview
    if (isDrawingRoute && isSketching && selectedPlayerId) {
      setCurrentSketch((prev) => {
        const last = prev[prev.length - 1];
        if (!last || Math.hypot(x - last.x, y - last.y) > 12) {
          return [...prev, { x, y }];
        }
        return prev;
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent<SVGSVGElement>) => {
    if (readOnly) return;
    if (e.cancelable) {
      e.preventDefault();
    }
    const { x, y } = getSVGCoordinates(e);

    // 1. Dragging a waypoint handle on mobile
    if (draggedWaypoint) {
      setPlayers((prev) =>
        prev.map((p) => {
          if (p.id !== draggedWaypoint.playerId) return p;
          const updatedRoute = [...p.route];
          if (updatedRoute[draggedWaypoint.pointIndex]) {
            updatedRoute[draggedWaypoint.pointIndex] = { x, y };
          }
          return { ...p, route: updatedRoute };
        })
      );
      return;
    }

    // 2. Dragging a player token on mobile - Translate route along
    if (draggedPlayer && !isDrawingRoute) {
      setPlayers((prev) =>
        prev.map((p) => {
          if (p.id !== draggedPlayer) return p;
          if (playerDragStartCoordRef.current) {
            const dx = x - playerDragStartCoordRef.current.x;
            const dy = y - playerDragStartCoordRef.current.y;
            const shiftedRoute = playerDragStartCoordRef.current.initialRoute.map((pt) => ({
              x: Math.max(10, Math.min(790, pt.x + dx)),
              y: Math.max(10, Math.min(490, pt.y + dy))
            }));
            return { ...p, x, y, route: shiftedRoute };
          }
          return { ...p, x, y };
        })
      );
      return;
    }

    // 3. Freehand touch sketch drawing
    if (isDrawingRoute && isSketching && selectedPlayerId) {
      setCurrentSketch((prev) => {
        const last = prev[prev.length - 1];
        if (!last || Math.hypot(x - last.x, y - last.y) > 12) {
          return [...prev, { x, y }];
        }
        return prev;
      });
    }
  };

  const finalizeDrag = () => {
    if (dragStartSnapshotRef.current) {
      const snapshot = dragStartSnapshotRef.current;
      const current = playersRef.current;
      const hasChanged = JSON.stringify(snapshot) !== JSON.stringify(current);
      if (hasChanged) {
        setUndoStack((prev) => [...prev.slice(-49), snapshot]);
        setRedoStack([]);
      }
      dragStartSnapshotRef.current = null;
    }
    setDraggedPlayer(null);
    playerDragStartCoordRef.current = null;
    setDraggedWaypoint(null);

    // If freehand sketch completed
    if (isSketching && selectedPlayerId && currentSketch.length > 1) {
      recordUndoSnapshot(playersRef.current);
      // Downsample sketch points to clean tactical waypoints (every 3rd-4th point + endpoint)
      const sampled = currentSketch.filter((_, idx) => idx % 3 === 0 || idx === currentSketch.length - 1);
      setPlayers((prev) =>
        prev.map((p) => (p.id === selectedPlayerId ? { ...p, route: sampled } : p))
      );
      setCurrentSketch([]);
      setIsSketching(false);
    }
  };

  const handleMouseUp = () => {
    finalizeDrag();
  };

  const handleTouchEnd = (e: React.TouchEvent<SVGSVGElement>) => {
    // If drawing in click/tap waypoint mode
    if (isDrawingRoute && selectedPlayerId && touchStartPosRef.current && e.changedTouches.length > 0 && !isSketching) {
      const touch = e.changedTouches[0];
      const dist = Math.hypot(
        touch.clientX - touchStartPosRef.current.x,
        touch.clientY - touchStartPosRef.current.y
      );
      const duration = Date.now() - touchStartPosRef.current.time;
      
      if (dist < 15 && duration < 500) {
        const coords = getSVGCoordinatesFromClient(touch.clientX, touch.clientY);
        recordUndoSnapshot(playersRef.current);
        setPlayers((prev) =>
          prev.map((p) => (p.id === selectedPlayerId ? { ...p, route: [...p.route, coords] } : p))
        );
      }
    }

    finalizeDrag();
    touchStartPosRef.current = null;
  };

  const handleSvgMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (readOnly) return;
    if (isDrawingRoute && selectedPlayerId) {
      const coords = getSVGCoordinates(e);
      if (drawingMode === 'freehand') {
        setIsSketching(true);
        setCurrentSketch([coords]);
      } else {
        recordUndoSnapshot(playersRef.current);
        setPlayers((prev) =>
          prev.map((p) => (p.id === selectedPlayerId ? { ...p, route: [...p.route, coords] } : p))
        );
      }
    }
  };

  const handleSvgTouchStart = (e: React.TouchEvent<SVGSVGElement>) => {
    if (readOnly) return;
    if (e.touches.length > 0) {
      touchStartPosRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        time: Date.now()
      };
      if (isDrawingRoute && selectedPlayerId && drawingMode === 'freehand') {
        const coords = getSVGCoordinatesFromClient(e.touches[0].clientX, e.touches[0].clientY);
        setIsSketching(true);
        setCurrentSketch([coords]);
      }
    }
  };

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (readOnly) return;
    // handled in mousedown / touch
  };

  // --- PRELOADED ROUTES & CONCEPTS HANDLERS ---

  const handleApplyPreloadedRoute = (playerId: string, routePoints: { x: number; y: number }[], routeName?: string) => {
    recordUndoSnapshot(playersRef.current);
    setPlayers((prev) =>
      prev.map((p) => (p.id === playerId ? { ...p, route: routePoints, assignedRoute: routeName || p.assignedRoute || 'Custom Route' } : p))
    );
    setSelectedPlayerId(playerId);
  };

  const handleApplyPassingConcept = (concept: PassingConcept) => {
    recordUndoSnapshot(playersRef.current);
    setPlayers((prev) =>
      prev.map((player) => {
        // match by ID (wr1, wr2, slot, x, y, z, h, rb, c, qb) or fallback to position label
        const targetKey = Object.keys(concept.playerRoutes).find(
          (k) => k.toLowerCase() === player.id.toLowerCase() || k.toLowerCase() === player.label.toLowerCase()
        );
        if (!targetKey) return player;

        const routeConfig = concept.playerRoutes[targetKey];
        const routeDef = ROUTE_TREE_DEFINITIONS.find((r) => r.id === routeConfig.routeId);
        if (!routeDef) return player;

        let dir = routeConfig.direction;
        if (!dir) {
          if (routeDef.directionDefault === 'out') {
            dir = player.x > 400 ? 'right' : 'left';
          } else if (routeDef.directionDefault === 'in') {
            dir = player.x > 400 ? 'left' : 'right';
          }
        }

        const generatedPoints = routeDef.generatePoints(player.x, player.y, {
          direction: dir,
          depth: routeConfig.depth || 'medium',
          fieldWidth: 800,
          fieldHeight: 500
        });

        const assigned = routeDef.name;
        return { ...player, route: generatedPoints, assignedRoute: assigned };
      })
    );
    setPlayTitle(`${concept.name}`);
    setPlayDescription(concept.description);
  };

  // Auto-extract position assignments directly from the active canvas nodes
  const handleBroadcastCurrentScheme = () => {
    const currentPositions: Record<string, string> = {};
    const nodes = players;
    const activeConceptName = playTitle;
    const selectedFormat = SPORT_PRESETS[selectedSport]?.name || selectedSport;

    // Extract route name and progression order for each active node
    nodes.forEach((node) => {
      const fallbackRoute = node.assignedRoute || (
        node.route && node.route.length > 0 
          ? (node.customNote || 'Custom Route') 
          : (node.label === 'QB' ? '3-Step Drop, Read FS' : (node.blocking && node.blocking !== 'none' ? `Pass Pro (${node.blocking.replace(/_/g, ' ')})` : 'Block / Pass Pro'))
      );
      const route = node.assignedRoute || fallbackRoute;
      const read = node.readOrder ? `[${node.readOrder}] ` : '';
      currentPositions[node.label] = `${read}${route}`;
    });

    // Open the Live Dispatcher with pre-populated payloads
    setDispatcherPayload({
      playName: activeConceptName || 'Custom Scheme',
      formation: selectedFormat, // '5v5 Flag', '7v7', etc.
      positions: currentPositions,
    });
    setIsDispatcherOpen(true);
    setShowLiveTextDispatcher(true);
  };

  const handleFlipSelectedRoute = () => {
    if (!selectedPlayerId || !selectedPlayer || selectedPlayer.route.length === 0) return;
    recordUndoSnapshot(playersRef.current);
    const originX = selectedPlayer.x;
    const mirrored = selectedPlayer.route.map((pt) => ({
      x: Math.max(10, Math.min(790, originX - (pt.x - originX))),
      y: pt.y
    }));
    setPlayers((prev) =>
      prev.map((p) => (p.id === selectedPlayerId ? { ...p, route: mirrored } : p))
    );
  };

  const handleDeleteWaypoint = (playerId: string, pointIndex: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (readOnly) return;
    recordUndoSnapshot(playersRef.current);
    setPlayers((prev) =>
      prev.map((p) => {
        if (p.id !== playerId) return p;
        return { ...p, route: p.route.filter((_, idx) => idx !== pointIndex) };
      })
    );
  };

  const handleSportChange = (sport: SportType) => {
    recordUndoSnapshot(playersRef.current);
    setSelectedSport(sport);
    setPlayers(SPORT_PRESETS[sport].players);
    setPlayTitle(`${SPORT_PRESETS[sport].name} Concept`);
    setPlayDescription(`Tactical formation and route tree for ${SPORT_PRESETS[sport].name}.`);
    setSelectedPlayerId(null);
    setIsAnimating(false);
    setSavedPlayId(null);
  };

  const updateSelectedPlayer = (updates: Partial<PlayerNode>) => {
    if (!selectedPlayerId || readOnly) return;
    recordUndoSnapshot(playersRef.current);
    setPlayers((prev) =>
      prev.map((p) => (p.id === selectedPlayerId ? { ...p, ...updates } : p))
    );
  };

  const addCustomToken = (role: 'offense' | 'defense' | 'cone') => {
    if (readOnly) return;
    recordUndoSnapshot(playersRef.current);
    const id = `token_${Date.now()}`;
    const shape: TokenShape = role === 'defense' ? 'cross' : role === 'cone' ? 'square' : 'circle';
    const color = role === 'defense' ? '#ef4444' : role === 'cone' ? '#f59e0b' : '#10b981';
    const label = role === 'defense' ? 'X' : role === 'cone' ? 'CONE' : 'O';

    const newNode: PlayerNode = {
      id,
      label,
      role,
      shape,
      color,
      x: 400,
      y: role === 'defense' ? 200 : 350,
      route: [],
    };
    setPlayers((prev) => [...prev, newNode]);
    setSelectedPlayerId(id);
  };

  const removeSelectedPlayer = () => {
    if (!selectedPlayerId || readOnly) return;
    recordUndoSnapshot(playersRef.current);
    setPlayers((prev) => prev.filter((p) => p.id !== selectedPlayerId));
    setSelectedPlayerId(null);
  };

  const handleSavePlay = async (isNewCopy: boolean = false) => {
    setIsSaving(true);
    try {
      const playIdToSave = isNewCopy ? undefined : (savedPlayId || undefined);
      const titleToSave = isNewCopy ? `${playTitle} (Copy)` : (playTitle || 'Tactical Play');

      const savedId = await savePlay({
        id: playIdToSave,
        title: titleToSave,
        description: playDescription || 'Designed in Just1Play Playbook Lab.',
        sport: selectedSport,
        sportName: SPORT_PRESETS[selectedSport]?.name || 'Sports',
        players,
        authorId: effectiveUserId,
        authorName: effectiveAuthorName,
      });

      setSavedPlayId(savedId);
      if (isNewCopy) {
        setPlayTitle(titleToSave);
      }
      setSaveSuccessNotice(isNewCopy ? 'Saved as new play to Firestore!' : 'Play saved to Firestore successfully!');
      setTimeout(() => setSaveSuccessNotice(null), 4000);

      if (onPlaySaved) {
        onPlaySaved(savedId);
      }
    } catch (err) {
      console.error('Error saving play to Firestore:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadPlay = (play: PlaybookCardData) => {
    recordUndoSnapshot(playersRef.current);
    if (play.title) setPlayTitle(play.title);
    if (play.description) setPlayDescription(play.description);
    if (play.sport && SPORT_PRESETS[play.sport]) {
      setSelectedSport(play.sport);
    }
    if (Array.isArray(play.players) && play.players.length > 0) {
      setPlayers(play.players);
    }
    setSavedPlayId(play.id);
    setSelectedPlayerId(null);
    setIsAnimating(false);
    setSaveSuccessNotice(`Loaded play: "${play.title}"`);
    setTimeout(() => setSaveSuccessNotice(null), 3500);
  };

  // --- EXPORT DIAGRAM AS SVG OR HIGH-RES PNG ---

  const getSanitizedFilename = (extension: string) => {
    const cleanTitle = (playTitle || 'tactical_play')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9_-]/g, '_')
      .replace(/_+/g, '_');
    const cleanSport = selectedSport.replace(/[^a-z0-9_-]/g, '_');
    return `just1play_${cleanSport}_${cleanTitle}.${extension}`;
  };

  const getCleanSvgString = () => {
    if (!svgRef.current) return null;
    const svgCopy = svgRef.current.cloneNode(true) as SVGSVGElement;

    svgCopy.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svgCopy.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
    svgCopy.setAttribute('width', '800');
    svgCopy.setAttribute('height', '500');
    svgCopy.setAttribute('viewBox', '0 0 800 500');

    // Remove selection spinner rings for a clean exported diagram
    const selectionRings = svgCopy.querySelectorAll('.animate-spin, circle[stroke="#38bdf8"]');
    selectionRings.forEach((node) => node.remove());

    // Add high-contrast professional banner header & footer watermark
    const bannerGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    const safeTitle = (playTitle || 'Tactical Play').replace(/[<>&"]/g, '');
    const safeSport = (SPORT_PRESETS[selectedSport]?.name || '').replace(/[<>&"]/g, '');

    bannerGroup.innerHTML = `
      <rect x="0" y="468" width="800" height="32" fill="#05070a" fill-opacity="0.95" />
      <line x1="0" y1="468" x2="800" y2="468" stroke="#1f2937" stroke-width="1" />
      <text x="16" y="488" fill="#10b981" font-size="11" font-weight="900" font-family="system-ui, -apple-system, sans-serif" letter-spacing="1.5">JUST1PLAY TACTICS LAB</text>
      <text x="784" y="488" fill="#9ca3af" font-size="10" font-weight="700" font-family="system-ui, -apple-system, sans-serif" text-anchor="end">${safeTitle} • ${safeSport}</text>
    `;
    svgCopy.appendChild(bannerGroup);

    const serializer = new XMLSerializer();
    let source = serializer.serializeToString(svgCopy);

    if (!source.match(/^<svg[^>]+xmlns="http:\/\/www\.w3\.org\/2000\/svg"/)) {
      source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    if (!source.match(/^<svg[^>]+xmlns:xlink="http:\/\/www\.w3\.org\/1999\/xlink"/)) {
      source = source.replace(/^<svg/, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
    }

    return '<?xml version="1.0" standalone="no"?>\r\n' + source;
  };

  const handleDownloadSVG = () => {
    try {
      setIsExporting('svg');
      const svgString = getCleanSvgString();
      if (!svgString) return;

      const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = getSanitizedFilename('svg');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export SVG:', err);
    } finally {
      setIsExporting(null);
      setShowExportMenu(false);
    }
  };

  const handleDownloadPNG = async () => {
    try {
      setIsExporting('png');
      const svgString = getCleanSvgString();
      if (!svgString) return;

      const img = new Image();
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = url;
      });

      // 2x Retina High-Resolution canvas (1600x1000)
      const scale = 2;
      const canvas = document.createElement('canvas');
      canvas.width = 800 * scale;
      canvas.height = 500 * scale;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Fill crisp dark field background
      ctx.fillStyle = '#080a0e';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);

      canvas.toBlob((blob) => {
        if (!blob) return;
        const pngUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = pngUrl;
        link.download = getSanitizedFilename('png');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(pngUrl);
        setIsExporting(null);
        setShowExportMenu(false);
      }, 'image/png');
    } catch (err) {
      console.error('Failed to export PNG:', err);
      setIsExporting(null);
      setShowExportMenu(false);
    }
  };

  // Render court/pitch based on selected sport
  const renderFieldBackground = () => {
    switch (selectedSport) {
      case 'flag_5v5':
        return (
          <g id="field-geometry-flag-5v5">
            {/* 50-yd Field: End Zone (Y: 0 - 70) */}
            <rect x="0" y="0" width="800" height="70" fill="#047857" fillOpacity="0.22" />
            <line x1="0" y1="70" x2="800" y2="70" stroke="#10b981" strokeWidth="2.5" />
            <text
              x="400"
              y="45"
              fill="#10b981"
              fontSize="14"
              fontWeight="900"
              letterSpacing="6"
              textAnchor="middle"
              opacity="0.9"
            >
              50-YD FIELD • END ZONE
            </text>

            {/* 5-yd No-Run Zone before End Zone (Y: 70 - 105) */}
            <rect x="0" y="70" width="800" height="35" fill="#f59e0b" fillOpacity="0.08" />
            <line
              x1="0"
              y1="105"
              x2="800"
              y2="105"
              stroke="#f59e0b"
              strokeWidth="1.75"
              strokeDasharray="6 4"
              opacity="0.8"
            />
            <text x="770" y="98" fill="#f59e0b" fontSize="9" fontWeight="bold" textAnchor="end">
              5-YD NO-RUN ZONE
            </text>

            {/* Midfield Line & Hash (Y: 250) */}
            <line x1="0" y1="250" x2="800" y2="250" stroke="#ffffff" strokeWidth="2" opacity="0.5" />
            {[260, 320, 380, 440, 500, 560].map((hx) => (
              <line
                key={hx}
                x1={hx}
                y1="244"
                x2={hx}
                y2="256"
                stroke="#ffffff"
                strokeWidth="1.5"
                opacity="0.6"
              />
            ))}
            <text x="30" y="244" fill="#ffffff" fontSize="10" fontWeight="900" opacity="0.75">
              MIDFIELD (25 YD)
            </text>

            {/* 5-yd No-Run Zone before Midfield (Y: 250 - 285) */}
            <rect x="0" y="250" width="800" height="35" fill="#f59e0b" fillOpacity="0.06" />
            <line
              x1="0"
              y1="285"
              x2="800"
              y2="285"
              stroke="#f59e0b"
              strokeWidth="1.5"
              strokeDasharray="5 4"
              opacity="0.7"
            />
            <text x="770" y="280" fill="#f59e0b" fontSize="9" fontWeight="bold" textAnchor="end">
              5-YD NO-RUN ZONE (MIDFIELD)
            </text>

            {/* 7-yd Rusher Dotted Line (Y: 300) */}
            <line
              x1="0"
              y1="300"
              x2="800"
              y2="300"
              stroke="#ef4444"
              strokeWidth="2.5"
              strokeDasharray="4 4"
              opacity="0.9"
            />
            <text
              x="770"
              y="295"
              fill="#ef4444"
              fontSize="10"
              fontWeight="900"
              letterSpacing="1"
              textAnchor="end"
            >
              7-YD RUSHER RESTRAINT LINE
            </text>

            {/* Line of Scrimmage (Y: 350) */}
            <line
              x1="0"
              y1="350"
              x2="800"
              y2="350"
              stroke="#00B8D4"
              strokeWidth="2.5"
              strokeDasharray="6 6"
            />
            <text x="30" y="344" fill="#00B8D4" fontSize="11" fontWeight="900">
              LINE OF SCRIMMAGE (BALL SPOT)
            </text>
          </g>
        );

      case 'flag_7v7':
        return (
          <g id="field-geometry-7v7-showcase">
            {/* 40-yd Offensive Field: Endzone (Y: 0 - 75) */}
            <rect x="0" y="0" width="800" height="75" fill="#1e3a8a" fillOpacity="0.25" />
            <line x1="0" y1="75" x2="800" y2="75" stroke="#3b82f6" strokeWidth="2.5" />
            <text
              x="400"
              y="48"
              fill="#60a5fa"
              fontSize="14"
              fontWeight="900"
              letterSpacing="6"
              textAnchor="middle"
              opacity="0.9"
            >
              7v7 SHOWCASE • 40-YD OFFENSIVE FIELD
            </text>

            {/* 15-Yard Boundary Line & Hashes (Y: 175) */}
            <line
              x1="0"
              y1="175"
              x2="800"
              y2="175"
              stroke="#94a3b8"
              strokeWidth="1.5"
              strokeDasharray="8 4"
              opacity="0.5"
            />
            <line x1="280" y1="168" x2="280" y2="182" stroke="#ffffff" strokeWidth="2" />
            <line x1="520" y1="168" x2="520" y2="182" stroke="#ffffff" strokeWidth="2" />
            <line x1="60" y1="168" x2="60" y2="182" stroke="#ffffff" strokeWidth="2" />
            <line x1="740" y1="168" x2="740" y2="182" stroke="#ffffff" strokeWidth="2" />
            <text x="30" y="170" fill="#94a3b8" fontSize="10" fontWeight="900" opacity="0.8">
              15-YD LINE (REDZONE ENTRY)
            </text>

            {/* 25-Yard 1st Down / Midpoint Hash (Y: 250) */}
            <line x1="0" y1="250" x2="800" y2="250" stroke="#f59e0b" strokeWidth="2" opacity="0.65" />
            <line x1="280" y1="242" x2="280" y2="258" stroke="#f59e0b" strokeWidth="2.5" />
            <line x1="520" y1="242" x2="520" y2="258" stroke="#f59e0b" strokeWidth="2.5" />
            <line x1="60" y1="242" x2="60" y2="258" stroke="#f59e0b" strokeWidth="2.5" />
            <line x1="740" y1="242" x2="740" y2="258" stroke="#f59e0b" strokeWidth="2.5" />
            <text x="30" y="244" fill="#f59e0b" fontSize="10" fontWeight="900">
              25-YD LINE (1ST DOWN CONVERSION)
            </text>

            {/* 40-Yard Starting Boundary (Y: 350) */}
            <line x1="0" y1="350" x2="800" y2="350" stroke="#00B8D4" strokeWidth="3" />
            <text x="30" y="344" fill="#00B8D4" fontSize="11" fontWeight="900">
              40-YD LINE (OFFENSIVE START)
            </text>
            {/* Boundary Sideline Hashes */}
            {[100, 150, 200, 300, 400].map((y) => (
              <g key={y}>
                <line x1="20" y1={y} x2="35" y2={y} stroke="#475569" strokeWidth="2" />
                <line x1="765" y1={y} x2="780" y2={y} stroke="#475569" strokeWidth="2" />
              </g>
            ))}
          </g>
        );

      case 'football_11v11':
        return (
          <g id="field-geometry-11v11-tackle">
            {/* Endzone */}
            <rect x="0" y="0" width="800" height="60" fill="#14532d" fillOpacity="0.25" />
            <line x1="0" y1="60" x2="800" y2="60" stroke="#16a34a" strokeWidth="2.5" />
            <text
              x="400"
              y="38"
              fill="#22c55e"
              fontSize="13"
              fontWeight="900"
              letterSpacing="6"
              textAnchor="middle"
              opacity="0.8"
            >
              11v11 NCAA / NFHS REGULATION FIELD
            </text>

            {/* Yard lines every 40px with Painted Numbers */}
            {[
              { y: 100, num: '10' },
              { y: 140, num: '20' },
              { y: 180, num: '30' },
              { y: 220, num: '40' },
              { y: 260, num: '50' },
              { y: 300, num: '40' },
              { y: 340, num: '30' },
              { y: 380, num: '20' },
              { y: 420, num: '10' },
            ].map(({ y, num }) => (
              <g key={y}>
                <line x1="0" y1={y} x2="800" y2={y} stroke="#1e293b" strokeWidth="1.5" />
                <line x1="310" y1={y - 5} x2="310" y2={y + 5} stroke="#64748b" strokeWidth="2" />
                <line x1="490" y1={y - 5} x2="490" y2={y + 5} stroke="#64748b" strokeWidth="2" />
                <line x1="80" y1={y - 4} x2="80" y2={y + 4} stroke="#475569" strokeWidth="1.5" />
                <line x1="720" y1={y - 4} x2="720" y2={y + 4} stroke="#475569" strokeWidth="1.5" />
                <text
                  x="115"
                  y={y + 4}
                  fill="#334155"
                  fontSize="12"
                  fontWeight="900"
                  fontFamily="monospace"
                  textAnchor="middle"
                >
                  {num}
                </text>
                <text
                  x="685"
                  y={y + 4}
                  fill="#334155"
                  fontSize="12"
                  fontWeight="900"
                  fontFamily="monospace"
                  textAnchor="middle"
                >
                  {num}
                </text>
              </g>
            ))}

            {/* Line of Scrimmage */}
            <line x1="0" y1="350" x2="800" y2="350" stroke="#00B8D4" strokeWidth="3" />
            <text x="30" y="344" fill="#00B8D4" fontSize="11" fontWeight="900">
              LINE OF SCRIMMAGE (BALL SPOT)
            </text>
          </g>
        );

      case 'basketball':
        return (
          <g>
            {/* Half Court Baseline */}
            <rect x="40" y="20" width="720" height="460" fill="none" stroke="#eab308" strokeWidth="2.5" opacity="0.7" />
            {/* Key / Paint */}
            <rect x="300" y="20" width="200" height="220" fill="#eab308" fillOpacity="0.08" stroke="#eab308" strokeWidth="2" />
            {/* Free throw circle */}
            <circle cx="400" cy="240" r="70" fill="none" stroke="#eab308" strokeWidth="2" strokeDasharray="5 5" />
            {/* 3-Point Arc */}
            <path d="M 120 20 L 120 120 A 280 280 0 0 0 680 120 L 680 20" fill="none" stroke="#eab308" strokeWidth="2.5" />
            {/* Basket Rim & Backboard */}
            <line x1="360" y1="35" x2="440" y2="35" stroke="#ffffff" strokeWidth="3.5" />
            <circle cx="400" cy="50" r="12" fill="none" stroke="#f97316" strokeWidth="2.5" />
            {/* Restricted Area */}
            <path d="M 360 35 A 40 40 0 0 0 440 35" fill="none" stroke="#eab308" strokeWidth="1.5" />
          </g>
        );

      case 'soccer':
        return (
          <g>
            {/* Goal Line & Penalty Box */}
            <line x1="40" y1="20" x2="760" y2="20" stroke="#ffffff" strokeWidth="2.5" opacity="0.7" />
            <rect x="220" y="20" width="360" height="160" fill="none" stroke="#ffffff" strokeWidth="2" opacity="0.7" />
            {/* 6-Yard Box */}
            <rect x="320" y="20" width="160" height="60" fill="none" stroke="#ffffff" strokeWidth="1.5" opacity="0.7" />
            {/* Penalty Spot & Arc */}
            <circle cx="400" cy="120" r="4" fill="#ffffff" />
            <path d="M 330 180 A 80 80 0 0 0 470 180" fill="none" stroke="#ffffff" strokeWidth="1.5" opacity="0.7" />
            {/* Goal Net Area */}
            <rect x="350" y="5" width="100" height="15" fill="#10b981" fillOpacity="0.2" stroke="#ffffff" strokeWidth="1.5" />
          </g>
        );

      case 'lacrosse':
        return (
          <g>
            {/* Crease Circle & Goal */}
            <circle cx="400" cy="100" r="65" fill="#38bdf8" fillOpacity="0.06" stroke="#38bdf8" strokeWidth="2.5" opacity="0.8" />
            <polygon points="385,85 415,85 400,115" fill="#ef4444" fillOpacity="0.5" stroke="#ffffff" strokeWidth="1.5" />
            {/* Wing / Restraining Lines */}
            <line x1="160" y1="20" x2="160" y2="480" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="6 6" opacity="0.6" />
            <line x1="640" y1="20" x2="640" y2="480" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="6 6" opacity="0.6" />
            {/* Endline */}
            <line x1="40" y1="20" x2="760" y2="20" stroke="#ffffff" strokeWidth="2" opacity="0.7" />
          </g>
        );
    }
  };

  // Render individual player marker shape (O, X, or Square)
  const renderShapeIcon = (player: PlayerNode) => {
    switch (player.shape) {
      case 'cross':
        return (
          <g stroke={player.color} strokeWidth="3.5" strokeLinecap="round">
            <line x1="-11" y1="-11" x2="11" y2="11" />
            <line x1="11" y1="-11" x2="-11" y2="11" />
          </g>
        );
      case 'square':
        return (
          <rect
            x="-14"
            y="-14"
            width="28"
            height="28"
            rx="5"
            fill={player.color}
            fillOpacity="0.9"
            stroke="#ffffff"
            strokeWidth="2"
          />
        );
      case 'circle':
      default:
        return (
          <circle
            cx="0"
            cy="0"
            r="16"
            fill={player.color}
            stroke="#ffffff"
            strokeWidth="2"
            className="shadow-lg"
          />
        );
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-4">
      {/* Top Header Deck */}
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-3xl p-4 sm:p-5 backdrop-blur-xl flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3 flex-wrap flex-1 min-w-[280px]">
          <div className="flex flex-col gap-1 w-full sm:w-auto">
            <input
              type="text"
              value={playTitle}
              disabled={readOnly}
              onChange={(e) => setPlayTitle(e.target.value)}
              placeholder="Play Name / Concept..."
              className="bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-white font-black text-base sm:text-lg focus:outline-none focus:border-emerald-500 w-full sm:w-72"
            />
          </div>

          {/* Sport Selector */}
          {!readOnly && (
            <select
              value={selectedSport}
              onChange={(e) => handleSportChange(e.target.value as SportType)}
              className="bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-neutral-200 text-sm font-semibold focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="flag_5v5">🏈 Flag Football (5v5)</option>
              <option value="flag_7v7">🏈 Flag Football (7v7)</option>
              <option value="football_11v11">🛡️ Tackle Football (11v11)</option>
              <option value="basketball">🏀 Basketball (Half Court)</option>
              <option value="soccer">⚽ Soccer (Attacking Zone)</option>
              <option value="lacrosse">🥍 Lacrosse (Crease Zone)</option>
            </select>
          )}

          {readOnly && (
            <span className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold uppercase">
              {SPORT_PRESETS[selectedSport]?.name || 'Tactical Play'}
            </span>
          )}
        </div>

        {/* Playback Controls, Undo/Redo & Save Button */}
        <div className="flex items-center gap-2 flex-wrap">
          {!readOnly && (
            <div className="flex items-center bg-neutral-950 p-1 rounded-2xl border border-neutral-800">
              <button
                type="button"
                onClick={handleUndo}
                disabled={undoStack.length === 0}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  undoStack.length > 0
                    ? 'text-neutral-200 hover:text-white hover:bg-neutral-800 cursor-pointer active:scale-95'
                    : 'text-neutral-600 cursor-not-allowed opacity-50'
                }`}
                title={undoStack.length > 0 ? `Undo last action (${undoStack.length} in stack) • Ctrl+Z / ⌘Z` : 'Nothing to undo (Ctrl+Z)'}
              >
                <Undo2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Undo</span>
                {undoStack.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-neutral-800 text-emerald-400 font-mono font-bold">
                    {undoStack.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={handleRedo}
                disabled={redoStack.length === 0}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  redoStack.length > 0
                    ? 'text-neutral-200 hover:text-white hover:bg-neutral-800 cursor-pointer active:scale-95'
                    : 'text-neutral-600 cursor-not-allowed opacity-50'
                }`}
                title={redoStack.length > 0 ? `Redo action (${redoStack.length} in stack) • Ctrl+Y / ⌘⇧Z` : 'Nothing to redo (Ctrl+Y)'}
              >
                <Redo2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Redo</span>
                {redoStack.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-neutral-800 text-sky-400 font-mono font-bold">
                    {redoStack.length}
                  </span>
                )}
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              setIsAnimating(false);
              setTimeout(() => setIsAnimating(true), 40);
            }}
            className="flex items-center gap-2 bg-emerald-400 hover:bg-emerald-300 text-neutral-950 px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
          >
            <Play className="w-4 h-4 fill-neutral-950" />
            <span>Run Play</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAnimating(false)}
            className="p-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl text-sm transition-all cursor-pointer"
            title="Reset Positions"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Playbook Vault & Cloud Library Trigger */}
          <button
            type="button"
            onClick={() => setShowSavedPlaysModal(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-neutral-800 to-neutral-800/80 hover:from-neutral-700 hover:to-neutral-700/80 text-white border border-neutral-700 px-3.5 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer shadow-md active:scale-95 group"
            title="Open Saved Plays Vault to load, manage, or duplicate plays from Firestore"
          >
            <FolderOpen className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
            <span>Playbook Vault</span>
          </button>

          {!readOnly && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleSavePlay(false)}
                disabled={isSaving}
                className="flex items-center gap-2 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/40 px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer disabled:opacity-50 active:scale-95 shadow-md shadow-emerald-950/20"
                title="Save current play to Firestore database"
              >
                {savedPlayId ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Save className="w-4 h-4" />}
                <span>{savedPlayId ? 'Update Cloud Play' : isSaving ? 'Saving...' : 'Save to Cloud'}</span>
              </button>

              {savedPlayId && (
                <button
                  type="button"
                  onClick={() => handleSavePlay(true)}
                  disabled={isSaving}
                  className="px-2.5 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                  title="Save as a new copy in Firestore"
                >
                  Save as New
                </button>
              )}
            </div>
          )}

          {/* Export Diagram (SVG / PNG) */}
          <div className="relative" ref={exportMenuRef}>
            <button
              type="button"
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={isExporting !== null}
              className="flex items-center gap-1.5 bg-neutral-800 hover:bg-neutral-700 text-sky-400 border border-sky-500/30 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer disabled:opacity-50 active:scale-95 shadow-md"
              title="Download tactical diagram as PNG image or SVG vector"
            >
              {isExporting ? (
                <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
              ) : (
                <Download className="w-4 h-4 text-sky-400" />
              )}
              <span>{isExporting ? `Exporting ${isExporting.toUpperCase()}...` : 'Export'}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-neutral-400 transition-transform ${showExportMenu ? 'rotate-180' : ''}`} />
            </button>

            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl p-2 z-50 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 space-y-1">
                <div className="px-3 py-1.5 text-[11px] font-mono font-bold uppercase tracking-wider text-neutral-400 border-b border-neutral-800/80">
                  Export Tactical Diagram
                </div>

                <button
                  type="button"
                  onClick={handleDownloadPNG}
                  disabled={isExporting !== null}
                  className="w-full flex items-start gap-3 p-2.5 rounded-xl hover:bg-neutral-800 text-left transition-colors cursor-pointer group"
                >
                  <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 group-hover:bg-sky-500/20 shrink-0">
                    <ImageIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-neutral-100 flex items-center gap-1.5">
                      <span>Download PNG Image</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 font-mono">HD 2X</span>
                    </div>
                    <p className="text-[11px] text-neutral-400 leading-tight mt-0.5">
                      High-resolution 1600x1000 image for social, messaging & print.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadSVG}
                  disabled={isExporting !== null}
                  className="w-full flex items-start gap-3 p-2.5 rounded-xl hover:bg-neutral-800 text-left transition-colors cursor-pointer group"
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500/20 shrink-0">
                    <FileCode className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-neutral-100 flex items-center gap-1.5">
                      <span>Download SVG Vector</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">VECTOR</span>
                    </div>
                    <p className="text-[11px] text-neutral-400 leading-tight mt-0.5">
                      Lossless scalable vector graphic for playbooks and slide decks.
                    </p>
                  </div>
                </button>
              </div>
            )}
          </div>

          {savedPlayId && (
            <ShareButton
              path={`play/${savedPlayId}`}
              title={`${playTitle} | Just One Play Playbook`}
              text={`Check out this ${SPORT_PRESETS[selectedSport]?.name} animated play in Just One Play Playbook Lab!`}
              variant="secondary"
            />
          )}
        </div>
      </div>

      {/* J1P Signal Hub: Real-Time Playbook Wrist & HUD Dispatcher Gating / Control Bar */}
      <SignalHubUpgradeCard
        isUnlocked={isSignalHubUnlocked}
        onOpenDispatcher={() => setShowSignalDispatcherModal(true)}
      />

      {/* Advanced Coaching Suite & Tactical AI Action Bar */}
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-3xl p-3.5 backdrop-blur-xl flex flex-wrap items-center justify-between gap-3 shadow-xl">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5 mr-1">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            Tactical Intelligence:
          </span>

          {/* J1P Signal Hub Live Game Dispatcher Shortcut */}
          <button
            type="button"
            onClick={() => setShowSignalDispatcherModal(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 text-cyan-300 border border-cyan-500/40 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm active:scale-95 group"
            title="Open Live Wrist & HUD Game Dispatcher"
          >
            <Radio className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform animate-pulse" />
            <span>Signal Hub</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono">
              LIVE
            </span>
          </button>

          {/* J1P Task 43: Pure Text Live Wrist HUD Dispatcher Shortcut */}
          <button
            id="btn-open-pure-text-dispatcher"
            type="button"
            onClick={handleBroadcastCurrentScheme}
            className="flex items-center gap-2 bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-cyan-500/20 hover:from-emerald-500/30 hover:to-cyan-500/30 text-emerald-300 border border-emerald-500/40 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm active:scale-95 group"
            title="Auto-extract active canvas routes and broadcast directly to Live Wrist HUD"
          >
            <Watch className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform animate-pulse" />
            <span>Wrist HUD Dispatcher</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/25 text-emerald-300 font-mono font-bold">
              BROADCAST
            </span>
          </button>

          {/* Task 44: One-Tap Core Concept Templates (Quick-Load Presets) */}
          <button
            id="btn-preloaded-concepts-preset"
            type="button"
            onClick={() => setShowRouteLibraryModal(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-teal-500/20 to-emerald-500/20 hover:from-teal-500/30 hover:to-emerald-500/30 text-teal-300 border border-teal-500/40 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm active:scale-95 group"
            title="Load Core Passing Concepts (Mesh, Smash, Flood, Levels, Stick)"
          >
            <Layers className="w-4 h-4 text-teal-400 group-hover:scale-110 transition-transform" />
            <span>Preloaded Concepts</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-teal-500/25 text-teal-200 font-mono font-bold">
              5 PRESETS
            </span>
          </button>

          {/* Defense Coverage Diagnostic Trigger */}
          <button
            type="button"
            onClick={() => setShowCoverageDiagnosticModal(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-emerald-500/15 to-teal-500/15 hover:from-emerald-500/25 hover:to-teal-500/25 text-emerald-300 border border-emerald-500/30 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95 group"
          >
            <Shield className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
            <span>Coverage Diagnostic (AI)</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
              Live Audit
            </span>
          </button>

          {/* AI Play & Counter Assistant Trigger */}
          <button
            type="button"
            onClick={() => setShowAIPlayModal(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-amber-500/15 to-orange-500/15 hover:from-amber-500/25 hover:to-orange-500/25 text-amber-300 border border-amber-500/30 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95 group"
          >
            <Sparkles className="w-4 h-4 text-amber-400 group-hover:rotate-12 transition-transform" />
            <span>AI Play Assistant & Counters</span>
          </button>

          {/* Wristband & Card Generator Trigger */}
          <button
            type="button"
            onClick={() => setShowWristbandModal(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-sky-500/15 to-indigo-500/15 hover:from-sky-500/25 hover:to-indigo-500/25 text-sky-300 border border-sky-500/30 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95 group"
          >
            <Printer className="w-4 h-4 text-sky-400 group-hover:scale-110 transition-transform" />
            <span>Wristband & Call Sheet</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 font-mono">
              PDF / Print
            </span>
          </button>
        </div>

        {/* Tactical Canvas Overlays Switchers */}
        <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-2xl border border-neutral-800 flex-wrap">
          <button
            type="button"
            onClick={() => setShowProgressionReads(!showProgressionReads)}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              showProgressionReads
                ? 'bg-neutral-800 text-emerald-400 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-300'
            }`}
            title="Toggle QB Progression Number Badges (1, 2, 3, Hot)"
          >
            <Target className="w-3.5 h-3.5" />
            <span>1-2-3 Reads</span>
          </button>

          <button
            type="button"
            onClick={() => setShowQBVisionCone(!showQBVisionCone)}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              showQBVisionCone
                ? 'bg-neutral-800 text-amber-400 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-300'
            }`}
            title="Toggle QB Vision Cone and Read Sequence Path"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>QB Vision</span>
          </button>

          <button
            type="button"
            onClick={() => setShowBlockingVectors(!showBlockingVectors)}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              showBlockingVectors
                ? 'bg-neutral-800 text-sky-400 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-300'
            }`}
            title="Toggle Linemen Blocking Schemes & Pull Vectors"
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Protection</span>
          </button>
        </div>
      </div>

      {/* Main Tactical Grid Canvas */}
      <div 
        className="relative w-full aspect-[4/5] sm:aspect-[16/9] bg-neutral-950 border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl touch-none select-none"
        style={{ touchAction: 'none' }}
      >
        {/* Top Floating Status Indicator when Drawing */}
        {!readOnly && isDrawingRoute && (
          <div className="absolute top-4 left-4 right-4 sm:right-auto z-20 bg-emerald-500/90 text-neutral-950 backdrop-blur-md px-4 py-2 rounded-2xl shadow-xl flex items-center justify-between gap-3 border border-emerald-400">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neutral-950 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-neutral-950"></span>
              </span>
              <span className="text-xs font-black uppercase tracking-wider">
                {drawingMode === 'freehand'
                  ? `Freehand Sketching Route for ${selectedPlayer?.label || 'Token'}`
                  : `Adding Cuts for ${selectedPlayer?.label || 'Token'}`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold opacity-90 hidden md:inline">
                {drawingMode === 'freehand'
                  ? 'Drag across field to sketch path'
                  : 'Click anywhere on field to place cut waypoints'}
              </span>
              <button
                type="button"
                onClick={() => setIsDrawingRoute(false)}
                className="bg-neutral-950 hover:bg-neutral-900 text-white text-[11px] font-black px-2.5 py-1 rounded-xl cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        )}

        <svg
          ref={svgRef}
          viewBox="0 0 800 500"
          onMouseDown={handleSvgMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onTouchStart={handleSvgTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleMouseUp}
          onClick={handleSvgClick}
          style={{ touchAction: 'none' }}
          className={`w-full h-auto select-none block touch-none ${
            isDrawingRoute ? (drawingMode === 'freehand' ? 'cursor-pencil' : 'cursor-crosshair') : 'cursor-default'
          }`}
        >
          <defs>
            <pattern id="tactical-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#171a1f" strokeWidth="0.75" />
            </pattern>
            {COLOR_PALETTE.map((c) => {
              const safeId = `arrow-${c.replace('#', '')}`;
              return (
                <marker
                  key={safeId}
                  id={safeId}
                  viewBox="0 0 10 10"
                  refX="6"
                  refY="5"
                  markerWidth="7"
                  markerHeight="7"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill={c} />
                </marker>
              );
            })}
            <marker id="arrow-default" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#38bdf8" />
            </marker>
            <filter id="emerald-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#2dd4bf" floodOpacity="0.85" />
            </filter>
          </defs>

          {/* Background Grid Layer */}
          <rect width="800" height="500" fill="#080a0e" />
          <rect width="800" height="500" fill="url(#tactical-grid)" />

          {/* Dynamic Sport Field Boundaries */}
          {renderFieldBackground()}

          {/* QB Vision Read Cone & Progression Sequence Vectors */}
          {showQBVisionCone && (() => {
            const qb = players.find((p) => p.id === 'qb' || p.label.toLowerCase() === 'qb') || players.find((p) => p.role === 'offense');
            if (!qb) return null;

            const r1 = players.find((p) => p.progression === '1' && p.route.length > 0);
            const r2 = players.find((p) => p.progression === '2' && p.route.length > 0);
            const r3 = players.find((p) => p.progression === '3' && p.route.length > 0);
            const hot = players.find((p) => p.progression === 'hot' && p.route.length > 0);

            const r1End = r1 ? r1.route[r1.route.length - 1] : null;
            const r2End = r2 ? r2.route[r2.route.length - 1] : null;
            const r3End = r3 ? r3.route[r3.route.length - 1] : null;
            const hotEnd = hot ? hot.route[hot.route.length - 1] : null;

            return (
              <g pointerEvents="none">
                {/* Subtle Fan Vision Cone */}
                <polygon
                  points={`${qb.x},${qb.y} ${Math.max(20, qb.x - 240)},${Math.max(20, qb.y - 300)} ${Math.min(780, qb.x + 240)},${Math.max(20, qb.y - 300)}`}
                  fill="#10b981"
                  fillOpacity="0.03"
                  stroke="#10b981"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                  strokeOpacity="0.25"
                />

                {/* Primary Read Vector (QB -> Read 1) */}
                {r1End && (
                  <path
                    d={`M ${qb.x} ${qb.y} Q ${(qb.x + r1End.x) / 2} ${(qb.y + r1End.y) / 2 - 20} ${r1End.x} ${r1End.y}`}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2"
                    strokeDasharray="4 3"
                    strokeOpacity="0.75"
                  />
                )}

                {/* Secondary Read Vector (Read 1 -> Read 2) */}
                {r1End && r2End && (
                  <path
                    d={`M ${r1End.x} ${r1End.y} L ${r2End.x} ${r2End.y}`}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="1.75"
                    strokeDasharray="3 3"
                    strokeOpacity="0.65"
                  />
                )}

                {/* Third Read Vector (Read 2 -> Read 3) */}
                {r2End && r3End && (
                  <path
                    d={`M ${r2End.x} ${r2End.y} L ${r3End.x} ${r3End.y}`}
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                    strokeOpacity="0.55"
                  />
                )}

                {/* Hot Blitz Read Vector */}
                {hotEnd && (
                  <path
                    d={`M ${qb.x} ${qb.y} L ${hotEnd.x} ${hotEnd.y}`}
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="2"
                    strokeDasharray="2 2"
                    strokeOpacity="0.8"
                  />
                )}
              </g>
            );
          })()}

          {/* Blocking Schemes & Linemen Protection Vectors */}
          {showBlockingVectors &&
            players.map((player) => {
              if (!player.blocking || player.blocking === 'none') return null;

              const isPassPro = player.blocking === 'pass_pro_bob';
              const isSlideLeft = player.blocking === 'slide_left';
              const isSlideRight = player.blocking === 'slide_right';
              const isPullLeft = player.blocking === 'pull_left';
              const isPullRight = player.blocking === 'pull_right';
              const isLead = player.blocking === 'lead_block';
              const isChip = player.blocking === 'chip_release';

              return (
                <g key={`blocking-${player.id}`} pointerEvents="none">
                  {/* Pass Pro BOB: T-Bar */}
                  {isPassPro && (
                    <g stroke="#38bdf8" strokeWidth="3" strokeLinecap="square">
                      <line x1={player.x - 16} y1={player.y - 20} x2={player.x + 16} y2={player.y - 20} />
                      <line x1={player.x} y1={player.y - 14} x2={player.x} y2={player.y - 20} />
                    </g>
                  )}

                  {/* Slide Left: Slanted Barrier & Left Arrow */}
                  {isSlideLeft && (
                    <g stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round">
                      <line x1={player.x + 10} y1={player.y - 15} x2={player.x - 22} y2={player.y - 25} />
                      <path d={`M ${player.x - 16} ${player.y - 30} L ${player.x - 24} ${player.y - 25} L ${player.x - 18} ${player.y - 18}`} fill="none" />
                    </g>
                  )}

                  {/* Slide Right: Slanted Barrier & Right Arrow */}
                  {isSlideRight && (
                    <g stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round">
                      <line x1={player.x - 10} y1={player.y - 15} x2={player.x + 22} y2={player.y - 25} />
                      <path d={`M ${player.x + 16} ${player.y - 30} L ${player.x + 24} ${player.y - 25} L ${player.x + 18} ${player.y - 18}`} fill="none" />
                    </g>
                  )}

                  {/* Pull Left: Curved loop behind line */}
                  {isPullLeft && (
                    <path
                      d={`M ${player.x} ${player.y + 14} Q ${player.x - 40} ${player.y + 35} ${player.x - 80} ${player.y - 20}`}
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="2.5"
                      strokeDasharray="4 2"
                      markerEnd="url(#arrow-f59e0b)"
                    />
                  )}

                  {/* Pull Right: Curved loop behind line */}
                  {isPullRight && (
                    <path
                      d={`M ${player.x} ${player.y + 14} Q ${player.x + 40} ${player.y + 35} ${player.x + 80} ${player.y - 20}`}
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="2.5"
                      strokeDasharray="4 2"
                      markerEnd="url(#arrow-f59e0b)"
                    />
                  )}

                  {/* Lead Block: Forward Shield Arrow */}
                  {isLead && (
                    <g stroke="#10b981" strokeWidth="2.5" strokeLinecap="round">
                      <line x1={player.x} y1={player.y - 16} x2={player.x} y2={player.y - 36} />
                      <line x1={player.x - 12} y1={player.y - 36} x2={player.x + 12} y2={player.y - 36} />
                    </g>
                  )}

                  {/* Chip & Release */}
                  {isChip && (
                    <g stroke="#a855f7" strokeWidth="2.5">
                      <line x1={player.x - 10} y1={player.y - 18} x2={player.x + 10} y2={player.y - 18} />
                    </g>
                  )}
                </g>
              );
            })}

          {/* Route Vectors & Paths */}
          {players.map((player) => {
            if (player.route.length === 0) return null;
            const isSelected = selectedPlayerId === player.id;
            const pathString = `M ${player.x} ${player.y} ` + player.route.map((pt) => `L ${pt.x} ${pt.y}`).join(' ');
            const markerId = player.color ? `url(#arrow-${player.color.replace('#', '')})` : 'url(#arrow-default)';

            return (
              <g key={`route-${player.id}`}>
                {/* Outer route glow when player is selected */}
                {isSelected && (
                  <path
                    d={pathString}
                    fill="none"
                    stroke={player.color}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="opacity-25"
                  />
                )}

                {/* Main route vector line */}
                <path
                  d={pathString}
                  fill="none"
                  stroke={player.color}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  markerEnd={markerId}
                  className="opacity-90 drop-shadow-md"
                />

                {/* Waypoint Cut Nodes & Draggable Handles */}
                {player.route.map((pt, i) => {
                  const isLast = i === player.route.length - 1;
                  const isBeingDragged = draggedWaypoint?.playerId === player.id && draggedWaypoint.pointIndex === i;

                  return (
                    <g key={i} className="group">
                      {/* Generous touch hitbox for dragging waypoint */}
                      {!readOnly && isSelected && (
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r={18}
                          fill="transparent"
                          pointerEvents="all"
                          className="cursor-move"
                          onMouseDown={(e) => handleWaypointMouseDown(player.id, i, e)}
                          onTouchStart={(e) => handleWaypointTouchStart(player.id, i, e)}
                        />
                      )}

                      {/* Waypoint visual circle */}
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={isSelected ? 5.5 : 3.5}
                        fill={isSelected ? '#ffffff' : player.color}
                        stroke={player.color}
                        strokeWidth={isSelected ? 2.5 : 1}
                        className={isBeingDragged ? 'scale-125' : ''}
                        pointerEvents="none"
                      />

                      {/* Number badge for sequential cuts when selected */}
                      {isSelected && !isLast && (
                        <text
                          x={pt.x}
                          y={pt.y - 8}
                          textAnchor="middle"
                          fill="#ffffff"
                          fontSize="9"
                          fontWeight="bold"
                          className="drop-shadow pointer-events-none select-none opacity-80"
                        >
                          {i + 1}
                        </text>
                      )}
                    </g>
                  );
                })}

                {/* Progression Read Vector Badge at Route Endpoint */}
                {showProgressionReads && player.progression && player.progression !== 'none' && (
                  <g pointerEvents="none">
                    {(() => {
                      const endPt = player.route[player.route.length - 1];
                      const badgeConfig: Record<string, { bg: string; text: string; label: string; border: string }> = {
                        '1': { bg: '#2dd4bf', text: '#042f2e', label: '1', border: '#14b8a6' },
                        '2': { bg: '#f59e0b', text: '#451a03', label: '2', border: '#fbbf24' },
                        '3': { bg: '#38bdf8', text: '#082f49', label: '3', border: '#7dd3fc' },
                        '4': { bg: '#a855f7', text: '#3b0764', label: '4', border: '#c084fc' },
                        'hot': { bg: '#ef4444', text: '#ffffff', label: 'HOT', border: '#f87171' },
                        'checkdown': { bg: '#94a3b8', text: '#0f172a', label: 'CHK', border: '#cbd5e1' },
                        'clearout': { bg: '#a855f7', text: '#ffffff', label: 'CLR', border: '#c084fc' },
                      };
                      const conf = badgeConfig[player.progression] || badgeConfig['1'];
                      const isHotOrChk = player.progression === 'hot' || player.progression === 'checkdown' || player.progression === 'clearout';

                      return (
                        <g transform={`translate(${endPt.x}, ${endPt.y - 18})`}>
                          {isHotOrChk ? (
                            <rect
                              x="-14"
                              y="-8"
                              width="28"
                              height="16"
                              rx="8"
                              fill={conf.bg}
                              stroke={conf.border}
                              strokeWidth="1.5"
                              className="drop-shadow-lg"
                            />
                          ) : (
                            <circle
                              cx="0"
                              cy="0"
                              r="9"
                              fill={conf.bg}
                              stroke={conf.border}
                              strokeWidth="1.5"
                              className="drop-shadow-lg"
                            />
                          )}
                          <text
                            x="0"
                            y={isHotOrChk ? "3.5" : "3.5"}
                            textAnchor="middle"
                            fill={conf.text}
                            fontSize={isHotOrChk ? "8" : "10"}
                            fontWeight="900"
                            fontFamily="system-ui, -apple-system, sans-serif"
                          >
                            {conf.label}
                          </text>
                        </g>
                      );
                    })()}
                  </g>
                )}
              </g>
            );
          })}

          {/* Live Freehand Sketch Preview Path */}
          {isSketching && currentSketch.length > 1 && selectedPlayer && (
            <path
              d={`M ${selectedPlayer.x} ${selectedPlayer.y} ` + currentSketch.map((pt) => `L ${pt.x} ${pt.y}`).join(' ')}
              fill="none"
              stroke={selectedPlayer.color}
              strokeWidth="4"
              strokeDasharray="4 4"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="opacity-90 animate-pulse"
            />
          )}

          {/* Animated Football Trajectory & Spiral Catch Physics */}
          {isAnimating && (() => {
            const qb = players.find((p) => p.id === 'qb' || p.label.toLowerCase() === 'qb') || players.find((p) => p.role === 'offense');
            // Prioritize 1st Read, then first player with route
            const targetRec = players.find((p) => p.progression === '1' && p.route.length > 0) || players.find((p) => p.route.length > 0);

            if (!qb || !targetRec || targetRec.route.length === 0) return null;
            const targetEnd = targetRec.route[targetRec.route.length - 1];

            // Parabolic Flight Arc Coordinates
            const midX = (qb.x + targetEnd.x) / 2;
            const midY = Math.min(qb.y, targetEnd.y) - 60;

            return (
              <g pointerEvents="none">
                {/* Target Catch Ripple Ring */}
                <motion.circle
                  cx={targetEnd.x}
                  cy={targetEnd.y}
                  initial={{ r: 4, opacity: 0 }}
                  animate={{ r: [6, 24, 30], opacity: [0, 0.8, 0] }}
                  transition={{
                    duration: animationDuration,
                    times: [0, 0.7, 1],
                    repeat: Infinity,
                    repeatDelay: 0.5,
                  }}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2.5"
                />

                {/* Animated Football Token */}
                <motion.g
                  initial={{ x: qb.x, y: qb.y, scale: 0.8, rotate: 0 }}
                  animate={{
                    x: [qb.x, qb.x, midX, targetEnd.x],
                    y: [qb.y, qb.y - 10, midY, targetEnd.y],
                    scale: [0.8, 0.9, 1.35, 1.0],
                    rotate: [0, 45, 360, 720],
                  }}
                  transition={{
                    duration: animationDuration,
                    times: [0, 0.25, 0.65, 1],
                    ease: 'easeInOut',
                  }}
                >
                  {/* Leather Body */}
                  <ellipse rx="10" ry="5.5" fill="#854d0e" stroke="#451a03" strokeWidth="1" />
                  {/* White Stripe Tips */}
                  <path d="M -7 -4.2 L -7 4.2" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" />
                  <path d="M 7 -4.2 L 7 4.2" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" />
                  {/* Laces */}
                  <line x1="-3.5" y1="0" x2="3.5" y2="0" stroke="#ffffff" strokeWidth="1.2" />
                  <line x1="-2" y1="-2" x2="-2" y2="2" stroke="#ffffff" strokeWidth="0.8" />
                  <line x1="0" y1="-2" x2="0" y2="2" stroke="#ffffff" strokeWidth="0.8" />
                  <line x1="2" y1="-2" x2="2" y2="2" stroke="#ffffff" strokeWidth="0.8" />
                </motion.g>
              </g>
            );
          })()}

          {/* Player Nodes & Movable Tokens */}
          {players.map((player) => {
            const isSelected = selectedPlayerId === player.id;
            const animateX = isAnimating && player.route.length > 0 ? [player.x, ...player.route.map((r) => r.x)] : player.x;
            const animateY = isAnimating && player.route.length > 0 ? [player.y, ...player.route.map((r) => r.y)] : player.y;

            return (
              <motion.g
                key={player.id}
                animate={{ x: animateX, y: animateY }}
                transition={{
                  duration: isAnimating && player.route.length > 0 ? animationDuration : 0,
                  ease: 'easeInOut',
                }}
                onMouseDown={(e) => handleMouseDown(player.id, e)}
                onTouchStart={(e) => handleTouchStartPlayer(player.id, e)}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!readOnly) {
                    setSelectedPlayerId(player.id);
                  }
                }}
                className={`${readOnly ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'} touch-none`}
              >
                {/* Generous Touch Target Hitbox for Mobile Fingers (Expanded to 44px) */}
                <circle cx={0} cy={0} r={44} fill="transparent" pointerEvents="all" />

                {/* Active Selection Emerald/Teal Glow Ring */}
                {isSelected && (
                  <g pointerEvents="none">
                    <circle cx={0} cy={0} r={26} fill="none" stroke="#2dd4bf" strokeWidth="3" filter="url(#emerald-glow)" className="animate-pulse" />
                    <circle cx={0} cy={0} r={22} fill="none" stroke="#2dd4bf" strokeWidth="2" strokeDasharray="4 3" />
                  </g>
                )}

                {/* Token Shape */}
                {renderShapeIcon(player)}

                {/* Jersey Label / Position */}
                {player.shape !== 'cross' && (
                  <text x={0} y={4} textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="900" pointerEvents="none">
                    {player.label}
                  </text>
                )}
              </motion.g>
            );
          })}
        </svg>

        {/* Route Drawer Overlay Controls */}
        {!readOnly && (
          <div className="absolute bottom-4 left-4 right-4 sm:right-auto bg-neutral-900/95 border border-neutral-800 backdrop-blur-md rounded-2xl p-2 flex items-center justify-between sm:justify-start gap-2 shadow-2xl flex-wrap z-10">
            {/* Draw Mode Switcher */}
            <button
              type="button"
              onClick={() => {
                if (!selectedPlayerId && players.length > 0) {
                  setSelectedPlayerId(players[0].id);
                }
                setIsDrawingRoute(!isDrawingRoute);
              }}
              className={`px-3.5 py-2 sm:py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                isDrawingRoute
                  ? 'bg-emerald-400 text-neutral-950 shadow-md shadow-emerald-500/20'
                  : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
              }`}
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>{isDrawingRoute ? 'Exit Drawing' : 'Draw Route'}</span>
            </button>

            {isDrawingRoute && (
              <div className="flex items-center bg-neutral-950 p-0.5 rounded-xl border border-neutral-800">
                <button
                  type="button"
                  onClick={() => setDrawingMode('waypoint')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    drawingMode === 'waypoint' ? 'bg-neutral-800 text-emerald-400' : 'text-neutral-400'
                  }`}
                  title="Click field to place crisp tactical cut waypoints"
                >
                  Waypoint Cuts
                </button>
                <button
                  type="button"
                  onClick={() => setDrawingMode('freehand')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    drawingMode === 'freehand' ? 'bg-neutral-800 text-emerald-400' : 'text-neutral-400'
                  }`}
                  title="Drag and sketch freehand curved routes"
                >
                  Freehand Sketch
                </button>
              </div>
            )}

            {/* Quick Route Tree & Concept Library Modal Opener */}
            <button
              type="button"
              onClick={() => setShowRouteDrawerModal(true)}
              className="px-3 py-2 sm:py-1.5 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Open full Route Tree library (0-9) and Passing Concepts (Mesh, Smash, Flood)"
            >
              <Compass className="w-3.5 h-3.5 text-sky-400" />
              <span>Route Library & Concepts</span>
            </button>

            {selectedPlayerId && selectedPlayer && selectedPlayer.route.length > 0 && (
              <>
                {/* Flip Route Direction Button */}
                <button
                  type="button"
                  onClick={handleFlipSelectedRoute}
                  className="px-2.5 py-2 sm:py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  title="Mirror / Flip route direction inside vs outside"
                >
                  <FlipHorizontal className="w-3.5 h-3.5" />
                  <span>Flip</span>
                </button>

                {/* Clear Route */}
                <button
                  type="button"
                  onClick={() => updateSelectedPlayer({ route: [] })}
                  className="px-2.5 py-2 sm:py-1.5 bg-neutral-800 hover:bg-neutral-700 text-red-400 hover:text-red-300 rounded-xl text-xs font-semibold cursor-pointer"
                  title="Clear route for this player"
                >
                  Clear
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* 1-Click Quick Route Selector Bar for Active Receiver */}
      {!readOnly && selectedPlayer && (
        <div className="bg-neutral-900/90 border border-neutral-800 rounded-3xl p-3.5 backdrop-blur-xl flex flex-col gap-2.5 shadow-xl">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-neutral-400 flex items-center gap-1">
                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                Quick Preloaded Routes for <span className="text-white font-mono">{selectedPlayer.label}</span>:
              </span>
              {selectedPlayer.route.length > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono border border-emerald-500/20">
                  {selectedPlayer.route.length} Cuts Defined • Drag Waypoints to Adjust
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowRouteLibraryModal(true)}
                className="text-xs font-bold text-teal-400 hover:text-teal-300 flex items-center gap-1 cursor-pointer bg-teal-500/10 border border-teal-500/30 px-2.5 py-1 rounded-xl"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Concept Presets & Route Tree</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Tactile Route Selection Carousel: Slant, Out, Hitch, Post, Corner, Wheel, Dig */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {[
              { id: 'slant', name: 'Slant', num: '2', color: 'border-emerald-500/40 text-emerald-300' },
              { id: 'out', name: 'Out', num: '3', color: 'border-sky-500/40 text-sky-300' },
              { id: 'hitch', name: 'Hitch', num: '0', color: 'border-amber-500/40 text-amber-300' },
              { id: 'post', name: 'Post', num: '8', color: 'border-purple-500/40 text-purple-300' },
              { id: 'corner', name: 'Corner', num: '7', color: 'border-cyan-500/40 text-cyan-300' },
              { id: 'wheel', name: 'Wheel', num: 'W', color: 'border-rose-500/40 text-rose-300' },
              { id: 'dig', name: 'Dig', num: '4', color: 'border-indigo-500/40 text-indigo-300' },
            ].map((routeItem) => {
              const def = ROUTE_TREE_DEFINITIONS.find((r) => r.id === routeItem.id) || ROUTE_TREE_DEFINITIONS[0];
              const defaultDir = def.directionDefault === 'out'
                ? (selectedPlayer.x > 400 ? 'right' : 'left')
                : def.directionDefault === 'in'
                ? (selectedPlayer.x > 400 ? 'left' : 'right')
                : undefined;

              return (
                <button
                  key={routeItem.id}
                  type="button"
                  onClick={() => {
                    const generated = def.generatePoints(selectedPlayer.x, selectedPlayer.y, {
                      direction: defaultDir,
                      depth: 'medium',
                      fieldWidth: 800,
                      fieldHeight: 500
                    });
                    handleApplyPreloadedRoute(selectedPlayer.id, generated, routeItem.name);
                  }}
                  className={`px-3 py-1.5 rounded-xl bg-neutral-950 hover:bg-neutral-800 border ${routeItem.color} text-xs font-black whitespace-nowrap cursor-pointer transition-all active:scale-95 flex items-center gap-1.5 shrink-0 shadow-sm`}
                >
                  <span className="w-4 h-4 rounded-md bg-white/10 font-mono text-[10px] font-black flex items-center justify-center">
                    {routeItem.num}
                  </span>
                  <span>{routeItem.name}</span>
                </button>
              );
            })}

            <div className="h-5 w-px bg-neutral-800 shrink-0 mx-1" />

            {/* Additional Route Tree Definitions */}
            {ROUTE_TREE_DEFINITIONS.filter((r) => !['slant', 'out', 'hitch', 'post', 'corner', 'wheel', 'dig'].includes(r.id)).slice(0, 6).map((routeDef) => {
              const defaultDir = routeDef.directionDefault === 'out'
                ? (selectedPlayer.x > 400 ? 'right' : 'left')
                : routeDef.directionDefault === 'in'
                ? (selectedPlayer.x > 400 ? 'left' : 'right')
                : undefined;

              return (
                <button
                  key={routeDef.id}
                  type="button"
                  onClick={() => {
                    const generated = routeDef.generatePoints(selectedPlayer.x, selectedPlayer.y, {
                      direction: defaultDir,
                      depth: 'medium',
                      fieldWidth: 800,
                      fieldHeight: 500
                    });
                    handleApplyPreloadedRoute(selectedPlayer.id, generated, routeDef.name);
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-800/80 hover:border-neutral-700 text-neutral-300 hover:text-white text-xs font-bold whitespace-nowrap cursor-pointer transition-all active:scale-95 flex items-center gap-1.5 shrink-0 shadow-sm"
                >
                  {routeDef.number !== undefined && (
                    <span className="w-4 h-4 rounded-md bg-emerald-500/20 text-emerald-400 font-mono text-[10px] font-black flex items-center justify-center">
                      {routeDef.number}
                    </span>
                  )}
                  <span>{routeDef.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Selected Token Customizer Drawer */}
      {!readOnly && selectedPlayer && (
        <div className="bg-neutral-900/90 border border-neutral-800 rounded-3xl p-4 backdrop-blur-xl flex flex-col gap-4 shadow-xl">
          {/* Row 1: Basic Token Properties */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-800/80 pb-3">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                <Settings className="w-3.5 h-3.5 text-emerald-400" />
                Customize Token ({selectedPlayer.label}):
              </span>

              {/* Label Input */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-neutral-400">Position / #:</span>
                <input
                  type="text"
                  value={selectedPlayer.label}
                  onChange={(e) => updateSelectedPlayer({ label: e.target.value })}
                  className="bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1 text-white text-xs font-bold w-20 focus:outline-none focus:border-emerald-400"
                />
              </div>

              {/* Shape Switcher */}
              <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-xl border border-neutral-800">
                <button
                  type="button"
                  onClick={() => updateSelectedPlayer({ shape: 'circle' })}
                  className={`p-1.5 rounded-lg cursor-pointer ${selectedPlayer.shape === 'circle' ? 'bg-neutral-800 text-emerald-400' : 'text-neutral-400'}`}
                  title="Circle (Offense / Skill Player)"
                >
                  <Circle className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => updateSelectedPlayer({ shape: 'cross' })}
                  className={`p-1.5 rounded-lg cursor-pointer ${selectedPlayer.shape === 'cross' ? 'bg-neutral-800 text-red-400' : 'text-neutral-400'}`}
                  title="Cross (Defense / Rusher)"
                >
                  <XIcon className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => updateSelectedPlayer({ shape: 'square' })}
                  className={`p-1.5 rounded-lg cursor-pointer ${selectedPlayer.shape === 'square' ? 'bg-neutral-800 text-sky-400' : 'text-neutral-400'}`}
                  title="Square (Block / Screen / Goalie)"
                >
                  <Square className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Color Palette */}
              <div className="flex items-center gap-1.5">
                {COLOR_PALETTE.map((color) => (
                  <button
                    type="button"
                    key={color}
                    onClick={() => updateSelectedPlayer({ color })}
                    className={`w-5 h-5 rounded-full cursor-pointer transition-transform ${
                      selectedPlayer.color === color ? 'ring-2 ring-white scale-110' : 'opacity-80 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={removeSelectedPlayer}
              className="flex items-center gap-1 text-red-400 hover:text-red-300 text-xs font-semibold px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Remove Token</span>
            </button>
          </div>

          {/* Row 2: QB Progression Read & Blocking Assignments for Offensive Nodes */}
          {selectedPlayer.role === 'offense' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Progression Read Tag */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-teal-400" />
                  QB Progression Hierarchy:
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { id: 'none', label: 'None', activeStyle: 'bg-neutral-800 text-white border-neutral-600' },
                    { id: '1', label: '❶ 1st Read (Teal)', activeStyle: 'bg-teal-500/20 text-teal-300 border-teal-500/60 ring-1 ring-teal-400' },
                    { id: '2', label: '❷ 2nd Read (Amber)', activeStyle: 'bg-amber-500/20 text-amber-300 border-amber-500/60 ring-1 ring-amber-400' },
                    { id: 'checkdown', label: '⤹ Checkdown (Slate)', activeStyle: 'bg-slate-500/20 text-slate-300 border-slate-400/60 ring-1 ring-slate-400' },
                    { id: 'clearout', label: '🚀 Clear-Out (Purple)', activeStyle: 'bg-purple-500/20 text-purple-300 border-purple-500/60 ring-1 ring-purple-400' },
                    { id: '3', label: '❸ 3rd Read (Sky)', activeStyle: 'bg-sky-500/20 text-sky-300 border-sky-500/60 ring-1 ring-sky-400' },
                    { id: 'hot', label: '⚡ HOT Blitz', activeStyle: 'bg-red-500/20 text-red-300 border-red-500/60 ring-1 ring-red-400' },
                  ].map((item) => {
                    const isActive = (selectedPlayer.progression || 'none') === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          const prog = item.id as ProgressionRead;
                          const readOrderMap: Record<string, string> = {
                            '1': '1st Read',
                            '2': '2nd Read',
                            '3': '3rd Read',
                            '4': '4th Read',
                            'hot': 'HOT Blitz',
                            'checkdown': 'Checkdown',
                            'clearout': 'Clearout'
                          };
                          updateSelectedPlayer({ 
                            progression: prog,
                            readOrder: prog !== 'none' ? (readOrderMap[prog] || prog) : undefined
                          });
                        }}
                        className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                          isActive
                            ? `${item.activeStyle} shadow-sm`
                            : 'bg-neutral-950 text-neutral-400 border-neutral-800/80 hover:border-neutral-700'
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Blocking Assignment */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-sky-400" />
                  Protection / Blocking Scheme:
                </span>
                <div className="flex items-center gap-1 flex-wrap">
                  {[
                    { id: 'none', label: 'None' },
                    { id: 'pass_pro_bob', label: 'Pass Pro BOB' },
                    { id: 'slide_left', label: 'Slide ⬅️' },
                    { id: 'slide_right', label: 'Slide ➡️' },
                    { id: 'pull_left', label: 'Pull Left ↩️' },
                    { id: 'pull_right', label: 'Pull Right ↪️' },
                    { id: 'lead_block', label: 'Lead ⬆️' },
                    { id: 'chip_release', label: 'Chip & Go' },
                  ].map((item) => {
                    const isActive = (selectedPlayer.blocking || 'none') === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => updateSelectedPlayer({ blocking: item.id as BlockingType })}
                        className={`px-2 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                          isActive
                            ? 'bg-neutral-800 text-white border-sky-500/50 shadow-sm'
                            : 'bg-neutral-950 text-neutral-400 border-neutral-800/80 hover:border-neutral-700'
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bottom Token Spawner Tray & Save Status */}
      {!readOnly && (
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-3.5 backdrop-blur-md flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Add Markers:</span>
            <button
              type="button"
              onClick={() => addCustomToken('offense')}
              className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Offense (O)</span>
            </button>
            <button
              type="button"
              onClick={() => addCustomToken('defense')}
              className="flex items-center gap-1 bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Defense (X)</span>
            </button>
            <button
              type="button"
              onClick={() => addCustomToken('cone')}
              className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Cone / Pick</span>
            </button>
          </div>

          {savedPlayId && (
            <div className="text-xs text-neutral-300 flex items-center gap-2 flex-wrap">
              <span>Play saved to cloud:</span>
              <a
                href={`/play/${savedPlayId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-neutral-950 px-2.5 py-1 rounded text-emerald-400 border border-emerald-500/30 hover:underline flex items-center gap-1 font-mono"
              >
                <span>/play/{savedPlayId}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>
      )}

      {/* Preloaded Route Tree & Passing Concepts Modal */}
      <RouteTreeDrawer
        isOpen={showRouteDrawerModal}
        onClose={() => setShowRouteDrawerModal(false)}
        selectedPlayer={selectedPlayer || null}
        allPlayers={players}
        selectedSport={selectedSport}
        onApplyRouteToPlayer={(playerId, routePoints) => {
          handleApplyPreloadedRoute(playerId, routePoints);
        }}
        onApplyConcept={(concept) => {
          handleApplyPassingConcept(concept);
        }}
        onSelectPlayer={(playerId) => {
          setSelectedPlayerId(playerId);
        }}
      />

      {/* Coverage Diagnostic AI Modal */}
      <CoverageDiagnosticModal
        isOpen={showCoverageDiagnosticModal}
        onClose={() => setShowCoverageDiagnosticModal(false)}
        players={players}
        selectedSport={selectedSport}
        playTitle={playTitle}
      />

      {/* Wristband & Installation Call Sheet Modal */}
      <WristbandGeneratorModal
        isOpen={showWristbandModal}
        onClose={() => setShowWristbandModal(false)}
        players={players}
        selectedSport={selectedSport}
        playTitle={playTitle}
        playDescription={playDescription}
      />

      {/* AI Play Assistant & Counter Generator Modal */}
      <PlaybookAIModal
        isOpen={showAIPlayModal}
        onClose={() => setShowAIPlayModal(false)}
        players={players}
        selectedSport={selectedSport}
        playTitle={playTitle}
        onApplyPlayVariant={(newPlayers, newTitle, newDesc) => {
          recordUndoSnapshot(playersRef.current);
          setPlayers(newPlayers);
          setPlayTitle(newTitle);
          setPlayDescription(newDesc);
        }}
      />

      {/* Saved Plays Vault Modal */}
      <SavedPlaysModal
        isOpen={showSavedPlaysModal}
        onClose={() => setShowSavedPlaysModal(false)}
        onSelectPlay={(play) => {
          handleLoadPlay(play);
        }}
        currentPlayId={savedPlayId}
        selectedSport={selectedSport}
      />

      {/* J1P Signal Hub: Coach Live Game Dispatcher Drawer / Modal */}
      <CoachSignalDispatcherModal
        isOpen={showSignalDispatcherModal}
        onClose={() => setShowSignalDispatcherModal(false)}
        currentPlay={{
          title: playTitle,
          formation: SPORT_PRESETS[selectedSport]?.name || 'Standard Formation',
          sport: selectedSport,
          players,
          playId: savedPlayId || undefined,
          description: playDescription
        }}
        teamId={profile?.teamName ? profile.teamName.toLowerCase().replace(/\s+/g, '_') : 'varsity_team'}
        teamName={profile?.teamName || 'Varsity 7v7 Team'}
        onOpenReceiverPreview={(pin, pos) => {
          setShowTestReceiverModal({
            isOpen: true,
            pin,
            pos
          });
        }}
      />

      {/* J1P Task 43: Pure Text Real-Time Wrist Live Dispatcher Modal */}
      <LiveDispatcherModal
        isOpen={showLiveTextDispatcher || isDispatcherOpen}
        onClose={() => {
          setShowLiveTextDispatcher(false);
          setIsDispatcherOpen(false);
        }}
        initialPlayName={dispatcherPayload?.playName || playTitle || '5v5 Mesh Option'}
        initialAssignments={dispatcherPayload?.positions}
        formation={dispatcherPayload?.formation || SPORT_PRESETS[selectedSport]?.name || selectedSport}
        teamId={profile?.teamName ? profile.teamName.toLowerCase().replace(/\s+/g, '_') : 'varsity_7v7_team'}
      />

      {/* J1P Task 44: Preloaded Core Concepts & Route Library Modal */}
      <RouteLibraryModal
        isOpen={showRouteLibraryModal}
        onClose={() => setShowRouteLibraryModal(false)}
        selectedPlayer={selectedPlayer || null}
        allPlayers={players}
        onApplyConcept={(newPlayers, conceptName) => {
          recordUndoSnapshot(playersRef.current);
          setPlayers(newPlayers);
          setPlayTitle(conceptName);
          setPlayDescription(`Loaded championship ${conceptName} passing scheme.`);
          setSaveSuccessNotice(`Applied ${conceptName} formation`);
          setTimeout(() => setSaveSuccessNotice(null), 3000);
        }}
        onApplyRouteToPlayer={(playerId, routePoints, routeName) => {
          handleApplyPreloadedRoute(playerId, routePoints, routeName);
          setSaveSuccessNotice(`Applied ${routeName} to ${players.find(p => p.id === playerId)?.label || 'player'}`);
          setTimeout(() => setSaveSuccessNotice(null), 3000);
        }}
        onUpdateProgression={(playerId, prog) => {
          const readOrderMap: Record<string, string> = {
            '1': '1st Read',
            '2': '2nd Read',
            '3': '3rd Read',
            '4': '4th Read',
            'hot': 'HOT Blitz',
            'checkdown': 'Checkdown',
            'clearout': 'Clearout'
          };
          recordUndoSnapshot(playersRef.current);
          setPlayers(prev => prev.map(p => p.id === playerId ? { 
            ...p, 
            progression: prog, 
            readOrder: prog !== 'none' ? (readOrderMap[prog] || prog) : undefined 
          } : p));
        }}
      />

      {/* J1P Task 44: Next-Gen AI Assistant & Counters Modal */}
      <AIAssistantModal
        isOpen={showAIAssistantModal}
        onClose={() => setShowAIAssistantModal(false)}
        players={players}
        selectedSport={selectedSport}
        playTitle={playTitle}
        onApplyPlayVariant={(newPlayers, newTitle, newDesc) => {
          recordUndoSnapshot(playersRef.current);
          setPlayers(newPlayers);
          setPlayTitle(newTitle);
          setPlayDescription(newDesc);
          setSaveSuccessNotice(`Applied AI counter: ${newTitle}`);
          setTimeout(() => setSaveSuccessNotice(null), 3000);
        }}
      />

      {/* On-Screen Test Wrist HUD Receiver Modal (Interactive Sideline Tester) */}
      {showTestReceiverModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-sm">
            <WristHudReceiverView
              initialPin={showTestReceiverModal.pin}
              initialPosition={showTestReceiverModal.pos}
              onClose={() => setShowTestReceiverModal({ isOpen: false, pin: '', pos: 'QB' })}
            />
          </div>
        </div>
      )}

      {/* Floating Save / Load Toast Notification */}
      {saveSuccessNotice && (
        <div className="fixed bottom-6 right-6 z-50 bg-neutral-900 border border-emerald-500/40 text-white px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-emerald-300">Playbook Cloud Sync</div>
            <div className="text-[11px] text-neutral-300">{saveSuccessNotice}</div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PlaybookLab;
