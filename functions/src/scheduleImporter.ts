import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

if (!getApps().length) {
  initializeApp();
}
const db = getFirestore();

const geminiSecret = defineSecret("GEMINI_API_KEY");

export interface RawParsedGame {
  date: string;
  time: string;
  opponent: string;
  isHome: boolean;
  location: string;
  gameType: string;
  notes?: string | null;
}

export interface ImportSchedulePayload {
  teamId: string;
  rawText?: string;
  seasonYear?: number;
  sport?: string;
  action?: "parse" | "save" | "import";
  confirmedGames?: RawParsedGame[];
  autoSave?: boolean;
}

/**
 * Universal Gemini 1.5 Flash Prompt & Parser Logic
 */
export async function parseScheduleWithGemini(
  rawText: string,
  apiKey: string,
  seasonYear?: number,
  sport?: string
): Promise<RawParsedGame[]> {
  const currentYear = seasonYear || new Date().getFullYear();
  const currentSport = sport || "Sports";

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.1,
    },
  });

  const prompt = `You are an elite sports information director and data extraction AI.
Parse the following messy, unstructured sports schedule text for ${currentSport} (target season year: ${currentYear}).
The input may come from NCAA Sidearm sites, MaxPreps, Hudl, ArbiterLive, Tourney Machine, Zorts, league emails, or PDF/Word dumps.

CRITICAL EXTRACTION RULES & HEURISTICS:
1. MATCHUP NOTATION:
   - HOME games: Indicated by "vs", "vs.", "v", "against", "Home", or when the opponent is listed without an "@" prefix. Set isHome: true.
   - AWAY games: Indicated by "@", "at", "Away", "vs (at Opponent)", or neutral location names. Set isHome: false.
   - NEUTRAL SITE games: Indicated by "vs [Team] (Orlando, FL)" or tournament locations. Set isHome: false and extract the venue/city into location.

2. DATE & YEAR NORMALIZATION:
   - Normalize shorthand dates like "Aug 20", "8/20", "Friday, Sept 4th", "10/17/26" into strict ISO format "YYYY-MM-DD".
   - If the year is omitted in raw text, use the target season year (${currentYear}). If a season spans across years (e.g. basketball 2026-2027), use ${currentYear} for fall months (Aug-Dec) and ${currentYear + 1} for winter/spring months (Jan-Jun).

3. TIME & LOCATION EXTRACTION:
   - Time format: "HH:MM AM/PM" (e.g. "06:00 PM", "01:30 PM", "11:00 AM") or "TBD" if not announced.
   - Location: Extract stadium/arena/court name (e.g. "Mountaineer Field", "MetLife Stadium", "Court 3"). If not explicitly mentioned, use "Home Stadium" for home games, "Away Field" for away games, or "TBD".

4. GAME CLASSIFICATION:
   - Classify gameType into one of: "Conference", "Non-Conference", "Exhibition", "Playoff", "Tournament", "Scrimmage", or "Regular Season".

5. EXTRA NOTES:
   - Extract promotional or broadcast details into notes (e.g. "Senior Night", "Homecoming", "ESPN+", "Doubleheader", "Pool Play Game 1"). If none, set to null.

6. CLEAN OPPONENT NAME:
   - Strip out extraneous ranking seeds or prefixes (e.g., "#12 Bayonne" -> "Bayonne High School", "@ Duke" -> "Duke Blue Devils").

RETURN STRICTLY A JSON ARRAY conforming to this schema:
[
  {
    "date": "YYYY-MM-DD",
    "time": "HH:MM AM/PM or TBD",
    "opponent": "Clean Opponent Name",
    "isHome": true,
    "location": "Venue Name or TBD",
    "gameType": "Conference | Non-Conference | Playoff | Tournament | Scrimmage | Regular Season",
    "notes": "string or null"
  }
]

RAW SCHEDULE TEXT TO PARSE:
"""
${rawText}
"""`;

  const result = await model.generateContent(prompt);
  const responseText = result.response.text();

  if (!responseText) {
    throw new Error("Gemini returned an empty schedule response.");
  }

  let parsed: RawParsedGame[];
  try {
    parsed = JSON.parse(responseText);
  } catch (err: any) {
    // Attempt markdown block cleanup if present
    const cleaned = responseText.replace(/```json/gi, "").replace(/```/g, "").trim();
    parsed = JSON.parse(cleaned);
  }

  if (!Array.isArray(parsed)) {
    throw new Error("Invalid response format: Expected a JSON array of games.");
  }

  // Sanitize and validate fields
  return parsed.map((item, index) => {
    let dateStr = String(item.date || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      // Fallback normalization
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        dateStr = d.toISOString().split("T")[0];
      } else {
        dateStr = `${currentYear}-01-01`;
      }
    }

    return {
      date: dateStr,
      time: String(item.time || "TBD").trim(),
      opponent: String(item.opponent || `Opponent Game ${index + 1}`).trim(),
      isHome: Boolean(item.isHome),
      location: String(item.location || (item.isHome ? "Home Stadium" : "Away Field")).trim(),
      gameType: String(item.gameType || "Regular Season").trim(),
      notes: item.notes ? String(item.notes).trim() : null,
    };
  });
}

/**
 * Batch write confirmed games to Firestore
 */
export async function batchWriteGamesToFirestore(
  teamId: string,
  games: RawParsedGame[]
) {
  if (!teamId) {
    throw new HttpsError("invalid-argument", "Missing required teamId for schedule persistence.");
  }
  if (!games || !games.length) {
    throw new HttpsError("invalid-argument", "No games provided for batch write.");
  }

  const teamRef = db.collection("teams").doc(teamId);
  const gamesSubcollection = teamRef.collection("games");

  // Chunk in batches of 400 (Firestore batch limit is 500 ops)
  const chunkSize = 400;
  const savedGames: any[] = [];

  for (let i = 0; i < games.length; i += chunkSize) {
    const chunk = games.slice(i, i + chunkSize);
    const batch = db.batch();

    for (const game of chunk) {
      const gameRef = gamesSubcollection.doc();
      const gameData = {
        id: gameRef.id,
        teamId,
        date: game.date,
        time: game.time,
        opponent: game.opponent,
        isHome: Boolean(game.isHome),
        location: game.location || (game.isHome ? "Home Stadium" : "Away Field"),
        gameType: game.gameType || "Regular Season",
        notes: game.notes || null,
        status: "scheduled", // "scheduled" | "in_progress" | "final"
        homeScore: null,
        awayScore: null,
        source: "ai_universal_importer",
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };

      batch.set(gameRef, gameData);
      savedGames.push(gameData);
    }

    await batch.commit();
  }

  // Update team metadata (totalGames, lastSyncAt)
  await teamRef.set(
    {
      totalGames: FieldValue.increment(games.length),
      lastSyncAt: FieldValue.serverTimestamp(),
      scheduleSource: "ai_universal_importer",
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return savedGames;
}

/**
 * 2nd Gen Firebase Cloud Function: importUniversalSchedule
 */
export const importUniversalSchedule = onCall(
  { secrets: [geminiSecret], cors: true },
  async (request) => {
    // Auth Requirement: Reject unauthenticated callers
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "You must be authenticated to import team schedules.");
    }

    const {
      teamId,
      rawText,
      seasonYear,
      sport,
      action = "parse",
      confirmedGames,
      autoSave = false,
    } = request.data as ImportSchedulePayload;

    if (!teamId) {
      throw new HttpsError("invalid-argument", "Missing required teamId.");
    }

    const apiKey = geminiSecret.value() || process.env.GEMINI_API_KEY || "";
    if (!apiKey) {
      throw new HttpsError("failed-precondition", "GEMINI_API_KEY secret is not configured.");
    }

    // Mode 1: If saving pre-reviewed / confirmed games directly
    if (action === "save" || (confirmedGames && confirmedGames.length > 0 && !rawText)) {
      if (!confirmedGames || !confirmedGames.length) {
        throw new HttpsError("invalid-argument", "No confirmed games provided to save.");
      }
      const saved = await batchWriteGamesToFirestore(teamId, confirmedGames);
      return {
        success: true,
        action: "save",
        count: saved.length,
        games: saved,
      };
    }

    // Mode 2: Parse raw schedule text using Gemini 1.5 Flash
    if (!rawText || !rawText.trim()) {
      throw new HttpsError("invalid-argument", "No raw schedule text provided for parsing.");
    }

    const parsedGames = await parseScheduleWithGemini(rawText.trim(), apiKey, seasonYear, sport);

    // If autoSave flag or action === "import", immediately write to Firestore
    if (autoSave || action === "import") {
      const saved = await batchWriteGamesToFirestore(teamId, parsedGames);
      return {
        success: true,
        action: "import",
        count: saved.length,
        games: saved,
      };
    }

    // Default: Return parsed games for coach verification and editing
    return {
      success: true,
      action: "parse",
      count: parsedGames.length,
      games: parsedGames,
    };
  }
);
