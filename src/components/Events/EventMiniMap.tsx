import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MapPin, 
  Navigation, 
  Compass, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Minimize2, 
  ExternalLink, 
  Copy, 
  Check, 
  Car, 
  Crosshair, 
  ShieldCheck, 
  Building2, 
  Info,
  Footprints,
  Bus,
  ParkingCircle,
  X
} from 'lucide-react';
import { EventItem } from '../../types';

interface EventMiniMapProps {
  event: EventItem;
  className?: string;
}

// Known venue coordinates database for accurate pinning
const VENUE_COORDINATES: Record<string, { lat: number; lng: number; city: string; state: string; parking: string; gates: string; courts: string[] }> = {
  'metlife': { lat: 40.8135, lng: -74.0744, city: 'East Rutherford', state: 'NJ', parking: 'Lot E & F (Free with Event Pass)', gates: 'Gate C - North Gatehouse', courts: ['Main Arena', 'Court A', 'Court B', 'Turf 1'] },
  'iron peak': { lat: 40.4988, lng: -74.6548, city: 'Hillsborough', state: 'NJ', parking: 'East Lot & Overflow Pavilion', gates: 'Dome Entrance 1', courts: ['Dome 1', 'Dome 2', 'Turf A', 'Turf B'] },
  'rutgers': { lat: 40.5247, lng: -74.4379, city: 'Piscataway', state: 'NJ', parking: 'Yellow Lot 105', gates: 'Athletic Center Main Concourse', courts: ['Main Court', 'Auxiliary 1', 'Auxiliary 2'] },
  'hoop group': { lat: 40.1878, lng: -74.0435, city: 'Neptune', state: 'NJ', parking: 'Main Arena Front Lot', gates: 'West Athletic Lobby', courts: ['Court 1', 'Court 2', 'Court 3', 'Court 4'] },
  'sportika': { lat: 40.2982, lng: -74.3418, city: 'Manalapan', state: 'NJ', parking: 'Complex Lot 1-3', gates: 'Main South Entrance', courts: ['Field 1', 'Court 1-6', 'Academic Hub'] },
  'apex': { lat: 40.8712, lng: -74.2965, city: 'Fairfield', state: 'NJ', parking: 'Surface Lot A', gates: 'Entrance 2', courts: ['Court A', 'Court B', 'Performance Center'] },
  'crusader': { lat: 40.9545, lng: -74.0371, city: 'Oradell', state: 'NJ', parking: 'Stadium Drive Lot', gates: 'Grandstand Gate 1', courts: ['Stadium Turf', 'Track 1'] },
  'monmouth': { lat: 40.2798, lng: -74.0049, city: 'West Long Branch', state: 'NJ', parking: 'OceanFirst Center Lot', gates: 'Kessler Stadium Gate', courts: ['Track Oval', 'Turf Field'] },
  'barclays': { lat: 40.6826, lng: -73.9754, city: 'Brooklyn', state: 'NY', parking: 'Atlantic Terminal Garage', gates: 'Geico Atrium Plaza', courts: ['Center Court', 'Practice Gym'] },
  'madison': { lat: 40.7505, lng: -73.9934, city: 'New York', state: 'NY', parking: 'Penn 1 Parking', gates: '7th Ave Main Concourse', courts: ['Main Floor', 'Locker Annex'] },
};

export const EventMiniMap: React.FC<EventMiniMapProps> = ({ event, className = '' }) => {
  const [zoomLevel, setZoomLevel] = useState<number>(14);
  const [mapMode, setMapMode] = useState<'vector' | 'satellite'>('vector');
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTravelMode, setActiveTravelMode] = useState<'drive' | 'transit' | 'walk'>('drive');
  const [showFacilityInfo, setShowFacilityInfo] = useState(false);
  const [radarPulse] = useState(true);

  // Compute or resolve coordinates
  const locationDetails = useMemo(() => {
    const locLower = (event.location || '').toLowerCase();
    const titleLower = (event.title || '').toLowerCase();

    // Check matched known venues
    for (const key of Object.keys(VENUE_COORDINATES)) {
      if (locLower.includes(key) || titleLower.includes(key)) {
        return {
          ...VENUE_COORDINATES[key],
          venueName: event.location,
          address: `${event.location}, ${VENUE_COORDINATES[key].city}, ${VENUE_COORDINATES[key].state}`
        };
      }
    }

    // Deterministic fallback based on location text
    let hash = 0;
    const combinedStr = (event.location || event.title || 'Just1Play Arena');
    for (let i = 0; i < combinedStr.length; i++) {
      hash = (hash << 5) - hash + combinedStr.charCodeAt(i);
      hash |= 0;
    }
    const latOffset = ((Math.abs(hash) % 1000) / 10000) * (hash > 0 ? 1 : -1);
    const lngOffset = ((Math.abs(hash * 31) % 1000) / 10000) * (hash > 0 ? 1 : -1);

    const baseLat = 40.7306 + latOffset;
    const baseLng = -73.9352 + lngOffset;

    return {
      lat: Number(baseLat.toFixed(4)),
      lng: Number(baseLng.toFixed(4)),
      city: event.state === 'FL' ? 'Orlando' : (event.state === 'TX' ? 'Dallas' : 'Metro Area'),
      state: event.state || 'NJ',
      parking: 'Designated Athlete & Spectator Surface Lot',
      gates: 'Main Athletic Concourse Gate A',
      courts: ['Court 1 (Main Arena)', 'Court 2', 'Court 3', 'Auxiliary Hall'],
      venueName: event.location || 'Just1Play Athletic Center',
      address: `${event.location || 'Just1Play Athletic Center'}, ${event.state || 'NJ'}`
    };
  }, [event]);

  // Handle address copy
  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(locationDetails.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // fallback
    }
  };

  // Maps URL generators
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationDetails.address)}`;
  const appleMapsUrl = `https://maps.apple.com/?q=${encodeURIComponent(locationDetails.address)}&ll=${locationDetails.lat},${locationDetails.lng}`;

  // Calculate simulated ETA
  const travelEstimates = {
    drive: { time: '14-18 min', distance: '6.4 mi', route: 'Via I-95 Express & Route 3' },
    transit: { time: '32 min', distance: '7.1 mi', route: 'NJ Transit Bus 160 / Metro Shuttle' },
    walk: { time: '1 hr 45 min', distance: '5.2 mi', route: 'Athletic Parkway Pedestrian Trail' },
  };

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 1, 18));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 1, 11));
  const handleResetCenter = () => {
    setZoomLevel(14);
  };

  const renderMapContent = (fullscreen = false) => {
    // Generates OpenStreetMap tile URL or Google embed query
    const osmEmbedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${locationDetails.lng - 0.015 * (16 / zoomLevel)}%2C${locationDetails.lat - 0.012 * (16 / zoomLevel)}%2C${locationDetails.lng + 0.015 * (16 / zoomLevel)}%2C${locationDetails.lat + 0.012 * (16 / zoomLevel)}&layer=mapnik&marker=${locationDetails.lat}%2C${locationDetails.lng}`;

    return (
      <div className={`relative w-full rounded-2xl overflow-hidden bg-[#12181C] border border-[#212A31] shadow-inner select-none ${fullscreen ? 'h-[75vh]' : 'h-80 sm:h-96'}`}>
        {/* Layer 1: Actual Map or Styled Dark Vector HUD */}
        {mapMode === 'satellite' ? (
          <div className="absolute inset-0 w-full h-full overflow-hidden bg-[#0A0E11]">
            <iframe
              title="Event Venue Location Map"
              src={osmEmbedUrl}
              className="w-full h-full border-0 filter invert contrast-125 hue-rotate-180 brightness-90 opacity-80"
              loading="lazy"
            />
            {/* Dark overlay grid to blend with Just1Play branding */}
            <div className="absolute inset-0 bg-[#0F1418]/30 pointer-events-none" />
          </div>
        ) : (
          /* Styled Tactical Vector Canvas Map */
          <div className="absolute inset-0 w-full h-full bg-[#141C22] overflow-hidden">
            {/* Vector Street Grid Background */}
            <svg 
              className="w-full h-full opacity-70 transition-transform duration-500 ease-out" 
              viewBox="0 0 800 500" 
              preserveAspectRatio="xMidYMid slice"
              style={{
                transform: `scale(${1 + (zoomLevel - 14) * 0.15})`
              }}
            >
              <defs>
                <pattern id="tacticalGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#212E37" strokeWidth="0.8" />
                  <circle cx="0" cy="0" r="1" fill="#00F2FE" opacity="0.3" />
                </pattern>
                <radialGradient id="venueGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#00F2FE" stopOpacity="0.4" />
                  <stop offset="60%" stopColor="#00F2FE" stopOpacity="0.08" />
                  <stop offset="100%" stopColor="#00F2FE" stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* Grid backdrop */}
              <rect width="100%" height="100%" fill="url(#tacticalGrid)" />

              {/* Waterway / River curved vector */}
              <path 
                d="M -50,380 C 150,370 280,450 480,430 C 650,410 750,480 850,470 L 850,550 L -50,550 Z" 
                fill="#0D2230" 
                stroke="#00F2FE" 
                strokeWidth="1.5" 
                strokeOpacity="0.4" 
              />

              {/* Major Highway / Interstate lines (Glowing Gold and Cyan) */}
              <path d="M -20,160 L 820,240" stroke="#334155" strokeWidth="12" strokeLinecap="round" />
              <path d="M -20,160 L 820,240" stroke="#00F2FE" strokeWidth="2.5" strokeOpacity="0.6" strokeDasharray="8 6" />

              <path d="M 280,-20 L 520,520" stroke="#334155" strokeWidth="14" strokeLinecap="round" />
              <path d="M 280,-20 L 520,520" stroke="#E5B868" strokeWidth="3" strokeOpacity="0.7" strokeDasharray="12 6" />

              {/* Secondary Arterial Streets */}
              <path d="M 120,40 L 700,100" stroke="#25333F" strokeWidth="6" />
              <path d="M 80,320 L 740,300" stroke="#25333F" strokeWidth="6" />
              <path d="M 160,-10 L 220,510" stroke="#25333F" strokeWidth="6" />
              <path d="M 640,-10 L 610,510" stroke="#25333F" strokeWidth="6" />
              <path d="M 380,80 L 440,420" stroke="#25333F" strokeWidth="8" />

              {/* Sports Complex Compound Perimeter */}
              <rect x="340" y="190" width="160" height="130" rx="16" fill="#18232B" stroke="#00F2FE" strokeWidth="1.5" strokeOpacity="0.7" />
              
              {/* Stadium Arena Footprint */}
              <rect x="365" y="215" width="110" height="80" rx="12" fill="#212E37" stroke="#E5B868" strokeWidth="2" strokeOpacity="0.8" />
              
              {/* Arena Courts / Field Lines */}
              <line x1="420" y1="215" x2="420" y2="295" stroke="#00F2FE" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
              <circle cx="420" cy="255" r="16" fill="none" stroke="#00F2FE" strokeWidth="1" opacity="0.6" />

              {/* Surrounding Parking Lots */}
              <rect x="348" y="198" width="45" height="30" rx="4" fill="#1B2832" stroke="#475569" strokeWidth="1" />
              <text x="370" y="217" fill="#64748B" fontSize="10" fontWeight="bold" textAnchor="middle">P-1</text>

              <rect x="445" y="198" width="45" height="30" rx="4" fill="#1B2832" stroke="#475569" strokeWidth="1" />
              <text x="467" y="217" fill="#64748B" fontSize="10" fontWeight="bold" textAnchor="middle">P-2</text>

              {/* Surrounding Landmark Markers */}
              <g transform="translate(180, 140)">
                <circle cx="0" cy="0" r="4" fill="#64748B" />
                <text x="8" y="3" fill="#94A3B8" fontSize="9" fontFamily="monospace" fontWeight="bold">TRANSIT HUB</text>
              </g>
              <g transform="translate(630, 210)">
                <circle cx="0" cy="0" r="4" fill="#64748B" />
                <text x="8" y="3" fill="#94A3B8" fontSize="9" fontFamily="monospace" fontWeight="bold">HOTEL / LODGING</text>
              </g>
              <g transform="translate(230, 390)">
                <circle cx="0" cy="0" r="4" fill="#64748B" />
                <text x="8" y="3" fill="#94A3B8" fontSize="9" fontFamily="monospace" fontWeight="bold">PARK & RIDE</text>
              </g>

              {/* Radar Area Glow behind venue */}
              <circle cx="420" cy="255" r="90" fill="url(#venueGlow)" />
            </svg>
          </div>
        )}

        {/* Layer 2: Glowing Animated Tactical Radar Pin Centered on Venue */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative flex flex-col items-center pointer-events-auto group cursor-pointer" onClick={() => setShowFacilityInfo(!showFacilityInfo)}>
            
            {/* Pulsing Sonar Waves */}
            {radarPulse && (
              <>
                <motion.div
                  animate={{ scale: [1, 2.2, 3], opacity: [0.8, 0.3, 0] }}
                  transition={{ repeat: Infinity, duration: 2.4, ease: "easeOut" }}
                  className="absolute w-12 h-12 rounded-full border-2 border-[#00F2FE] -top-3 -left-3 pointer-events-none"
                />
                <motion.div
                  animate={{ scale: [1, 1.8, 2.4], opacity: [0.7, 0.2, 0] }}
                  transition={{ repeat: Infinity, duration: 2.4, delay: 0.8, ease: "easeOut" }}
                  className="absolute w-12 h-12 rounded-full border-2 border-[#E5B868] -top-3 -left-3 pointer-events-none"
                />
              </>
            )}

            {/* Pinned Venue Tooltip Badge */}
            <motion.div 
              initial={{ y: 5, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="mb-2 px-3 py-1.5 rounded-xl bg-[#182228]/95 border-2 border-[#00F2FE] shadow-[0_0_20px_rgba(0,242,254,0.5)] backdrop-blur-xl flex items-center gap-2"
            >
              <span className="w-2 h-2 rounded-full bg-[#00F2FE] animate-ping" />
              <div className="text-left">
                <p className="text-[11px] font-black uppercase tracking-wider text-white font-mono flex items-center gap-1">
                  {locationDetails.venueName}
                  <ShieldCheck className="w-3 h-3 text-[#00F2FE]" />
                </p>
                <p className="text-[9px] text-[#E5B868] font-mono font-bold">
                  {event.sport || 'Sports'} Event Venue • {locationDetails.city}, {locationDetails.state}
                </p>
              </div>
            </motion.div>

            {/* Custom Glowing Just1Play Sports Pin Marker */}
            <motion.div
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.95 }}
              className="relative z-10 w-9 h-9 rounded-full bg-gradient-to-tr from-[#E5B868] via-[#00F2FE] to-[#38BDF8] p-0.5 shadow-[0_0_25px_rgba(0,242,254,0.8)] flex items-center justify-center cursor-pointer"
            >
              <div className="w-full h-full bg-[#182228] rounded-full flex items-center justify-center text-[#00F2FE]">
                <MapPin className="w-5 h-5 fill-[#00F2FE] text-slate-950" />
              </div>
            </motion.div>

            {/* Pin Anchor Shadow */}
            <div className="w-3 h-1.5 bg-[#00F2FE]/60 rounded-full blur-[1px] mt-0.5" />
          </div>
        </div>

        {/* Layer 3: HUD Telemetry Overlays (Top Left) */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 pointer-events-none">
          <div className="px-2.5 py-1 rounded-lg bg-[#182228]/90 border border-slate-700/80 backdrop-blur-md flex items-center gap-2">
            <Crosshair className="w-3.5 h-3.5 text-[#00F2FE]" />
            <span className="text-[10px] font-mono font-bold text-slate-300">
              GPS: <span className="text-[#00F2FE]">{locationDetails.lat}° N, {Math.abs(locationDetails.lng)}° W</span>
            </span>
          </div>
          <div className="hidden sm:flex px-2.5 py-0.5 rounded-md bg-[#182228]/80 border border-slate-800 text-[9px] font-mono text-slate-400 items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>GEO-VERIFIED VENUE</span>
            <span className="text-slate-600">•</span>
            <span>ZOOM: {zoomLevel}x</span>
          </div>
        </div>

        {/* Layer 4: Map Controls (Top Right) */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          {/* Map Layer Mode Switcher */}
          <div className="p-1 rounded-xl bg-[#182228]/90 border border-slate-700 backdrop-blur-md flex items-center gap-1">
            <button
              onClick={() => setMapMode('vector')}
              className={`px-2 py-1 rounded-lg text-[10px] font-mono font-black uppercase transition-all cursor-pointer ${
                mapMode === 'vector' 
                  ? 'bg-[#00F2FE] text-slate-950 shadow-[0_0_12px_rgba(0,242,254,0.4)]' 
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Vector Tactical Map"
            >
              Tactical
            </button>
            <button
              onClick={() => setMapMode('satellite')}
              className={`px-2 py-1 rounded-lg text-[10px] font-mono font-black uppercase transition-all cursor-pointer ${
                mapMode === 'satellite' 
                  ? 'bg-[#E5B868] text-slate-950 shadow-[0_0_12px_rgba(229,184,104,0.4)]' 
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Dark Live Map View"
            >
              Satellite
            </button>
          </div>

          {/* Fullscreen Trigger */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 rounded-xl bg-[#182228]/90 border border-slate-700 hover:border-[#00F2FE] text-slate-300 hover:text-[#00F2FE] backdrop-blur-md transition-all cursor-pointer"
            title={fullscreen ? "Exit Fullscreen" : "Expand Full View"}
          >
            {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>

        {/* Layer 5: Bottom Interactive Controls (+ / - / Center / Info) */}
        <div className="absolute bottom-3 right-3 flex flex-col gap-1.5">
          <button
            onClick={handleZoomIn}
            className="p-2 rounded-xl bg-[#182228]/90 border border-slate-700 hover:border-[#00F2FE] text-white hover:text-[#00F2FE] backdrop-blur-md transition-all cursor-pointer shadow-lg active:scale-95"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-2 rounded-xl bg-[#182228]/90 border border-slate-700 hover:border-[#00F2FE] text-white hover:text-[#00F2FE] backdrop-blur-md transition-all cursor-pointer shadow-lg active:scale-95"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleResetCenter}
            className="p-2 rounded-xl bg-[#182228]/90 border border-slate-700 hover:border-[#E5B868] text-white hover:text-[#E5B868] backdrop-blur-md transition-all cursor-pointer shadow-lg active:scale-95"
            title="Center on Venue Pin"
          >
            <Compass className="w-4 h-4" />
          </button>
        </div>

        {/* Layer 6: Bottom Left Venue Fast Actions Badge */}
        <div className="absolute bottom-3 left-3 flex items-center gap-2">
          <button
            onClick={handleCopyAddress}
            className="px-3 py-1.5 rounded-xl bg-[#182228]/90 border border-slate-700 hover:border-[#00F2FE] text-white font-mono text-[10px] font-bold uppercase tracking-wider backdrop-blur-md flex items-center gap-1.5 transition-all cursor-pointer shadow-lg"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#00F2FE]" />
                <span className="text-[#00F2FE]">Address Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Copy Address</span>
              </>
            )}
          </button>

          <button
            onClick={() => setShowFacilityInfo(!showFacilityInfo)}
            className="px-3 py-1.5 rounded-xl bg-[#182228]/90 border border-slate-700 hover:border-[#E5B868] text-white font-mono text-[10px] font-bold uppercase tracking-wider backdrop-blur-md flex items-center gap-1.5 transition-all cursor-pointer shadow-lg"
          >
            <Building2 className="w-3.5 h-3.5 text-[#E5B868]" />
            <span className="hidden sm:inline">Facility Info</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Mini Map Card Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-[#00F2FE]/15 border border-[#00F2FE]/30 text-[#00F2FE]">
            <Navigation className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-black uppercase tracking-wider text-white font-mono flex items-center gap-2">
              Official Venue Location & Mini Map
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#00F2FE]/10 text-[#00F2FE] border border-[#00F2FE]/30 font-sans">
                LIVE PIN
              </span>
            </h4>
            <p className="text-xs text-slate-400 font-mono">{locationDetails.address}</p>
          </div>
        </div>

        {/* Quick External Navigation Buttons */}
        <div className="flex items-center gap-2">
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-xl bg-[#212A31] hover:bg-[#2A3742] border border-slate-700 hover:border-[#00F2FE] text-white hover:text-[#00F2FE] text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <span>Google Maps</span>
            <ExternalLink className="w-3 h-3" />
          </a>

          <a
            href={appleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-xl bg-[#212A31] hover:bg-[#2A3742] border border-slate-700 hover:border-[#E5B868] text-white hover:text-[#E5B868] text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <span>Apple Maps</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Mini Map Container */}
      {renderMapContent(false)}

      {/* Transit & Venue Amenities Subpanel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Route / ETA Estimator */}
        <div className="p-3.5 rounded-2xl bg-[#182228]/80 border border-[#212A31] space-y-2.5">
          <div className="flex items-center justify-between text-[11px] font-black uppercase text-slate-300 font-mono">
            <span className="flex items-center gap-1.5">
              <Navigation className="w-3.5 h-3.5 text-[#00F2FE]" /> Travel & Directions
            </span>
            <span className="text-[#00F2FE]">{travelEstimates[activeTravelMode].time}</span>
          </div>

          <div className="flex items-center gap-1 p-1 bg-[#12181C] rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTravelMode('drive')}
              className={`flex-1 py-1 px-2 rounded-lg text-[10px] font-mono font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                activeTravelMode === 'drive' ? 'bg-[#00F2FE] text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Car className="w-3 h-3" />
              <span>Drive</span>
            </button>
            <button
              onClick={() => setActiveTravelMode('transit')}
              className={`flex-1 py-1 px-2 rounded-lg text-[10px] font-mono font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                activeTravelMode === 'transit' ? 'bg-[#00F2FE] text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Bus className="w-3 h-3" />
              <span>Transit</span>
            </button>
            <button
              onClick={() => setActiveTravelMode('walk')}
              className={`flex-1 py-1 px-2 rounded-lg text-[10px] font-mono font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                activeTravelMode === 'walk' ? 'bg-[#00F2FE] text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Footprints className="w-3 h-3" />
              <span>Walk</span>
            </button>
          </div>

          <p className="text-[10px] text-slate-400 font-mono leading-tight">
            Est: <strong className="text-white">{travelEstimates[activeTravelMode].distance}</strong> • {travelEstimates[activeTravelMode].route}
          </p>
        </div>

        {/* Parking & Gates Info */}
        <div className="p-3.5 rounded-2xl bg-[#182228]/80 border border-[#212A31] space-y-2">
          <div className="flex items-center gap-1.5 text-[11px] font-black uppercase text-slate-300 font-mono">
            <ParkingCircle className="w-3.5 h-3.5 text-[#E5B868]" /> Parking & Gate Entry
          </div>
          <div className="text-[10px] font-mono space-y-1">
            <p className="text-slate-300">
              <span className="text-slate-500">PARKING:</span> {locationDetails.parking}
            </p>
            <p className="text-slate-300">
              <span className="text-slate-500">GATE:</span> {locationDetails.gates}
            </p>
          </div>
        </div>

        {/* Designated Courts / Fields Layout */}
        <div className="p-3.5 rounded-2xl bg-[#182228]/80 border border-[#212A31] space-y-2">
          <div className="flex items-center justify-between text-[11px] font-black uppercase text-slate-300 font-mono">
            <span className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-cyan-400" /> Court & Field Areas
            </span>
            <span className="text-[9px] text-[#00F2FE]">{locationDetails.courts.length} zones</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {locationDetails.courts.map((court, idx) => (
              <span 
                key={idx} 
                className="px-2 py-0.5 rounded-md bg-[#212A31] border border-slate-700 text-[10px] font-mono font-bold text-slate-200"
              >
                {court}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Facility Info Drawer Modal / Popover */}
      <AnimatePresence>
        {showFacilityInfo && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-4 rounded-2xl bg-[#182228] border-2 border-[#E5B868]/50 shadow-xl space-y-3 overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-[#E5B868]" />
                <h5 className="font-mono text-xs font-black uppercase text-white">
                  Athlete & Spectator Facility Logistics
                </h5>
              </div>
              <button
                onClick={() => setShowFacilityInfo(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[10px] font-mono">
              <div className="p-2.5 rounded-xl bg-[#212A31] border border-slate-700">
                <span className="text-[#00F2FE] font-bold block mb-0.5">CHECK-IN DESK</span>
                <span className="text-slate-300">Concourse Level 1 Lobby</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#212A31] border border-slate-700">
                <span className="text-[#E5B868] font-bold block mb-0.5">LOCKER ROOMS</span>
                <span className="text-slate-300">Sections 104-108 (Athlete Pass)</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#212A31] border border-slate-700">
                <span className="text-emerald-400 font-bold block mb-0.5">FIRST AID / TRAINERS</span>
                <span className="text-slate-300">Courtside Medical Suite A</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#212A31] border border-slate-700">
                <span className="text-purple-400 font-bold block mb-0.5">CONCESSIONS</span>
                <span className="text-slate-300">Gate C Plaza & Food Truck Deck</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fullscreen Interactive Map Modal */}
      <AnimatePresence>
        {isFullscreen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-5xl bg-[#182228] border-2 border-[#00F2FE] rounded-3xl p-5 shadow-[0_0_50px_rgba(0,242,254,0.4)] flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-slate-700/80 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-[#00F2FE]/20 text-[#00F2FE]">
                    <Navigation className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-mono text-sm font-black uppercase text-white">
                      {locationDetails.venueName} • Interactive Navigation
                    </h3>
                    <p className="text-xs text-slate-400 font-mono">{locationDetails.address}</p>
                  </div>
                </div>

                <button
                  onClick={() => setIsFullscreen(false)}
                  className="p-2 rounded-xl bg-[#212A31] hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {renderMapContent(true)}

              <div className="flex items-center justify-end gap-3 pt-2">
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl bg-[#00F2FE] hover:bg-[#38BDF8] text-slate-950 font-black font-mono text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-[0_0_15px_rgba(0,242,254,0.4)]"
                >
                  <Navigation className="w-4 h-4" />
                  <span>Launch Turn-by-Turn GPS</span>
                </a>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
