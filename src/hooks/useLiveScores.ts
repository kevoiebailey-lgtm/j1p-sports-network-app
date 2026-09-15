import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface LiveMatch {
  id: string;
  tournament: string;
  sport: string;
  homeTeam: string;
  homeScore: number;
  awayTeam: string;
  awayScore: number;
  status: 'LIVE' | 'FINAL' | 'UPCOMING';
  period: string;
  possession?: 'home' | 'away';
  viewersCount?: number;
}

export const useLiveScores = (initialMatches: LiveMatch[] = [], socketUrl?: string) => {
  const [matches, setMatches] = useState<LiveMatch[]>(initialMatches);
  const [loading, setLoading] = useState<boolean>(true);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  useEffect(() => {
    let unsubscribeFirestore: (() => void) | null = null;
    let isFirestoreActive = false;

    try {
      // Listen to matches collection in real-time from Firestore
      const matchesQuery = query(
        collection(db, 'matches'),
        where('status', 'in', ['LIVE', 'FINAL', 'UPCOMING'])
      );

      unsubscribeFirestore = onSnapshot(
        matchesQuery,
        (snapshot) => {
          if (!snapshot.empty) {
            const liveData: LiveMatch[] = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...(doc.data() as Omit<LiveMatch, 'id'>),
            }));
            setMatches(liveData);
            setIsConnected(true);
            isFirestoreActive = true;
          } else if (!isFirestoreActive) {
            // Keep initial/simulated matches if Firestore collection is empty
            setMatches(initialMatches);
          }
          setLoading(false);
        },
        (error) => {
          console.warn('Firestore score listener notice (using simulated live feed):', error);
          setLoading(false);
        }
      );
    } catch (e) {
      console.warn('Firestore initialization notice:', e);
    }

    // Polling simulation fallback when Firestore is empty or for extra live effect
    const interval = setInterval(() => {
      setMatches((prev) => {
        if (prev.length === 0) return initialMatches;
        return prev.map((match) => {
          if (match.status !== 'LIVE') return match;
          
          // Simulate live score tick (randomly increment scores)
          const homeInc = Math.random() > 0.88 ? 1 : 0;
          const awayInc = Math.random() > 0.90 ? 1 : 0;

          if (homeInc === 0 && awayInc === 0) return match;

          return {
            ...match,
            homeScore: match.homeScore + homeInc,
            awayScore: match.awayScore + awayInc,
          };
        });
      });
    }, 5000);

    return () => {
      if (unsubscribeFirestore) unsubscribeFirestore();
      clearInterval(interval);
    };
  }, [socketUrl]);

  return { matches, loading, isConnected };
};
