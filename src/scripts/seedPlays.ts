import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';

export interface StaplePlayRouteItem {
  routeCode: number | string;
  depth: 'short' | 'medium' | 'deep';
  readProgression: number;
}

export interface StaplePlayDefinition {
  name: string;
  formation: string;
  personnel: string;
  concept: string;
  targetDefense: string;
  reads: string[];
  isFlag: boolean;
  routes: Record<string, StaplePlayRouteItem>;
  createdAt?: any;
}

export const STAPLE_PLAYS: StaplePlayDefinition[] = [
  {
    name: "Trips Right - Smash",
    formation: "Trips Right",
    personnel: "5v5 Flag",
    concept: "Smash",
    targetDefense: "Cover 2 Zone",
    reads: ["Z (Corner)", "Y (Hitch)", "C (Flat)"],
    isFlag: true,
    routes: {
      X: { routeCode: 2, depth: "medium", readProgression: 3 },
      C: { routeCode: 1, depth: "short", readProgression: 3 },
      Y: { routeCode: 0, depth: "short", readProgression: 2 },
      Z: { routeCode: 6, depth: "medium", readProgression: 1 }
    },
  },
  {
    name: "Spread - Texas Angle",
    formation: "Spread 2x2",
    personnel: "5v5 Flag",
    concept: "Texas",
    targetDefense: "Man-to-Man / Blitz",
    reads: ["C (Angle)", "Y (In)", "Z (Clearout)"],
    isFlag: true,
    routes: {
      X: { routeCode: 8, depth: "deep", readProgression: 3 },
      C: { routeCode: "angle", depth: "short", readProgression: 1 },
      Y: { routeCode: 5, depth: "short", readProgression: 2 },
      Z: { routeCode: 8, depth: "deep", readProgression: 3 }
    },
  },
  {
    name: "Stack Right - Rub Wheel",
    formation: "Stack Right",
    personnel: "5v5 Flag",
    concept: "Rub Wheel",
    targetDefense: "Tight Man / Goal Line",
    reads: ["Y (Wheel)", "Z (Slant)", "C (Pop)"],
    isFlag: true,
    routes: {
      X: { routeCode: 0, depth: "short", readProgression: 3 },
      C: { routeCode: 0, depth: "short", readProgression: 2 },
      Y: { routeCode: "wheel", depth: "medium", readProgression: 1 },
      Z: { routeCode: 2, depth: "short", readProgression: 2 }
    },
  }
];

export async function seedStaplePlays(teamId: string) {
  const playbookRef = collection(db, 'teams', teamId, 'playbooks');

  const plays = STAPLE_PLAYS.map(play => ({
    ...play,
    createdAt: serverTimestamp()
  }));

  const insertedIds: string[] = [];
  for (const play of plays) {
    const docRef = await addDoc(playbookRef, play);
    insertedIds.push(docRef.id);
  }

  return insertedIds;
}
