export interface CardTheme {
  id: string;
  name: string;
  sport: string;
  category: "gameday" | "shatter" | "trading_card" | "classic";
  backdropUrl: string;
  overlayUrl?: string;
  accentColor: string;
  glowColor: string;
  bannerAngle: number;
  fontStyle: "italic" | "normal";
}

export const PREBUILT_THEMES: Record<string, CardTheme> = {
  // --- Game Day Series ---
  stadium_prime: {
    id: "stadium_prime",
    name: "Stadium Prime",
    sport: "all",
    category: "gameday",
    backdropUrl: "/assets/cards/backdrops/gameday_stadium_prime.webp",
    overlayUrl: "/assets/cards/overlays/stadium_lights_smoke.webp",
    accentColor: "#F59E0B",
    glowColor: "rgba(245, 158, 11, 0.6)",
    bannerAngle: -2,
    fontStyle: "italic"
  },
  midnight_blitz: {
    id: "midnight_blitz",
    name: "Midnight Blitz",
    sport: "flag_football",
    category: "gameday",
    backdropUrl: "/assets/cards/backdrops/midnight_blitz_turf.webp",
    overlayUrl: "/assets/cards/overlays/floodlights_flare.webp",
    accentColor: "#38BDF8",
    glowColor: "rgba(56, 189, 248, 0.7)",
    bannerAngle: -3,
    fontStyle: "italic"
  },
  court_ignite: {
    id: "court_ignite",
    name: "Court Ignite",
    sport: "basketball",
    category: "gameday",
    backdropUrl: "/assets/cards/backdrops/court_ignite_hardwood.webp",
    accentColor: "#FB923C",
    glowColor: "rgba(251, 146, 60, 0.6)",
    bannerAngle: -2,
    fontStyle: "italic"
  },
  pitch_spotlight: {
    id: "pitch_spotlight",
    name: "Pitch Spotlight",
    sport: "soccer",
    category: "gameday",
    backdropUrl: "/assets/cards/backdrops/pitch_spotlight_turf.webp",
    accentColor: "#10B981",
    glowColor: "rgba(16, 185, 129, 0.6)",
    bannerAngle: -1,
    fontStyle: "italic"
  },
  cheer_grand_arena: {
    id: "cheer_grand_arena",
    name: "Grand Arena",
    sport: "cheer",
    category: "gameday",
    backdropUrl: "/assets/cards/backdrops/cheer_grand_arena.webp",
    overlayUrl: "/assets/cards/overlays/lens_flare_pink.webp",
    accentColor: "#EC4899",
    glowColor: "rgba(236, 72, 153, 0.7)",
    bannerAngle: -2,
    fontStyle: "italic"
  },

  // --- Shatter & Kinetic Series ---
  cyan_shatter: {
    id: "cyan_shatter",
    name: "Cyan Shatter",
    sport: "all",
    category: "shatter",
    backdropUrl: "/assets/cards/backdrops/cyan_shatter_core.webp",
    overlayUrl: "/assets/cards/overlays/glass_shards_cyan.webp",
    accentColor: "#00F5FF",
    glowColor: "rgba(0, 245, 255, 0.8)",
    bannerAngle: -3,
    fontStyle: "italic"
  },
  crimson_surge: {
    id: "crimson_surge",
    name: "Crimson Surge",
    sport: "all",
    category: "shatter",
    backdropUrl: "/assets/cards/backdrops/crimson_surge_glass.webp",
    overlayUrl: "/assets/cards/overlays/shatter_sparks_red.webp",
    accentColor: "#EF4444",
    glowColor: "rgba(239, 68, 68, 0.8)",
    bannerAngle: -4,
    fontStyle: "italic"
  },
  volt_fragment: {
    id: "volt_fragment",
    name: "Volt Fragment",
    sport: "all",
    category: "shatter",
    backdropUrl: "/assets/cards/backdrops/volt_fragment_shatter.webp",
    overlayUrl: "/assets/cards/overlays/polygon_shards_volt.webp",
    accentColor: "#CCFF00",
    glowColor: "rgba(204, 255, 0, 0.7)",
    bannerAngle: -3,
    fontStyle: "italic"
  },
  gold_shatter: {
    id: "gold_shatter",
    name: "Gold Shatter",
    sport: "all",
    category: "shatter",
    backdropUrl: "/assets/cards/backdrops/gold_shatter_facet.webp",
    accentColor: "#EAB308",
    glowColor: "rgba(234, 179, 8, 0.7)",
    bannerAngle: -2,
    fontStyle: "italic"
  },
  hyper_velocity: {
    id: "hyper_velocity",
    name: "Hyper Velocity",
    sport: "all",
    category: "shatter",
    backdropUrl: "/assets/cards/backdrops/hyper_velocity_rays.webp",
    accentColor: "#8B5CF6",
    glowColor: "rgba(139, 92, 246, 0.8)",
    bannerAngle: -3,
    fontStyle: "italic"
  },

  // --- Hologram & Trading Card Series ---
  apex_holographic: {
    id: "apex_holographic",
    name: "Apex Hologram",
    sport: "all",
    category: "trading_card",
    backdropUrl: "/assets/cards/backdrops/apex_hologram_blue.webp",
    accentColor: "#00E5FF",
    glowColor: "rgba(0, 229, 255, 0.85)",
    bannerAngle: -2,
    fontStyle: "italic"
  },
  matrix_2077: {
    id: "matrix_2077",
    name: "Matrix 2077",
    sport: "all",
    category: "trading_card",
    backdropUrl: "/assets/cards/backdrops/matrix_2077_grid.webp",
    accentColor: "#22D3EE",
    glowColor: "rgba(34, 211, 238, 0.75)",
    bannerAngle: 0,
    fontStyle: "normal"
  },
  quantum_foil: {
    id: "quantum_foil",
    name: "Quantum Foil",
    sport: "all",
    category: "trading_card",
    backdropUrl: "/assets/cards/backdrops/quantum_foil_metal.webp",
    accentColor: "#A78BFA",
    glowColor: "rgba(167, 139, 250, 0.7)",
    bannerAngle: -2,
    fontStyle: "italic"
  },
  dark_matter_prospect: {
    id: "dark_matter_prospect",
    name: "Dark Matter",
    sport: "all",
    category: "trading_card",
    backdropUrl: "/assets/cards/backdrops/dark_matter_purple.webp",
    accentColor: "#C084FC",
    glowColor: "rgba(192, 132, 252, 0.8)",
    bannerAngle: -3,
    fontStyle: "italic"
  },
  cyber_gridiron: {
    id: "cyber_gridiron",
    name: "Cyber Gridiron",
    sport: "flag_football",
    category: "trading_card",
    backdropUrl: "/assets/cards/backdrops/cyber_gridiron_cyan.webp",
    accentColor: "#06B6D4",
    glowColor: "rgba(6, 182, 212, 0.8)",
    bannerAngle: -2,
    fontStyle: "italic"
  },

  // --- Classic & Minimal Series ---
  monochrome_beast: {
    id: "monochrome_beast",
    name: "Monochrome Beast",
    sport: "all",
    category: "classic",
    backdropUrl: "/assets/cards/backdrops/monochrome_textured.webp",
    accentColor: "#F8FAFC",
    glowColor: "rgba(248, 250, 252, 0.5)",
    bannerAngle: 0,
    fontStyle: "normal"
  },
  retro_card_90s: {
    id: "retro_card_90s",
    name: "Retro 90s Card",
    sport: "all",
    category: "classic",
    backdropUrl: "/assets/cards/backdrops/retro_card_gradient.webp",
    accentColor: "#F43F5E",
    glowColor: "rgba(244, 63, 94, 0.7)",
    bannerAngle: -4,
    fontStyle: "italic"
  },
  royal_titan: {
    id: "royal_titan",
    name: "Royal Titan",
    sport: "all",
    category: "classic",
    backdropUrl: "/assets/cards/backdrops/royal_titan_navy.webp",
    accentColor: "#38BDF8",
    glowColor: "rgba(56, 189, 248, 0.6)",
    bannerAngle: -1,
    fontStyle: "italic"
  }
};
