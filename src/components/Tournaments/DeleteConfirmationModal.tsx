import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertTriangle, 
  Trash2, 
  X, 
  CheckCircle2, 
  ShieldAlert, 
  Layers, 
  Flame 
} from 'lucide-react';
import { 
  doc, 
  deleteDoc, 
  writeBatch, 
  collection, 
  query, 
  where, 
  getDocs 
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';

export interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournamentId: string;
  eventName: string;
  onConfirmDelete?: (tournamentId: string) => void;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  onClose,
  tournamentId,
  eventName,
  onConfirmDelete
}) => {
  const { user } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    setErrorMessage(null);

    try {
      // 1. Optimistic removal from localStorage caches
      try {
        const storedTourns = localStorage.getItem('just1play_tournaments');
        if (storedTourns) {
          const list = JSON.parse(storedTourns);
          const filtered = list.filter((t: any) => t.id !== tournamentId);
          localStorage.setItem('just1play_tournaments', JSON.stringify(filtered));
        }

        const storedMatches = localStorage.getItem('just1play_matches');
        if (storedMatches) {
          const mList = JSON.parse(storedMatches);
          const mFiltered = mList.filter((m: any) => m.tournamentId !== tournamentId);
          localStorage.setItem('just1play_matches', JSON.stringify(mFiltered));
        }

        const storedBrackets = localStorage.getItem('just1play_event_brackets_cache');
        if (storedBrackets) {
          const bList = JSON.parse(storedBrackets);
          const bFiltered = bList.filter((b: any) => b.id !== tournamentId);
          localStorage.setItem('just1play_event_brackets_cache', JSON.stringify(bFiltered));
        }
      } catch (e) {
        console.warn('LocalStorage deletion sync notice:', e);
      }

      // 2. Cascade delete in Firestore using writeBatch
      if (db) {
        // Delete primary tournament doc
        await deleteDoc(doc(db, 'tournaments', tournamentId));

        // Delete from EventBrackets
        try {
          await deleteDoc(doc(db, 'EventBrackets', tournamentId));
        } catch (e) {}

        // Delete from events collection if present
        try {
          await deleteDoc(doc(db, 'events', tournamentId));
        } catch (e) {}

        // Batch delete associated matches
        try {
          const batch = writeBatch(db);
          
          // Find tournamentMatches
          const matchesQuery = query(
            collection(db, 'tournamentMatches'),
            where('tournamentId', '==', tournamentId)
          );
          const matchesSnap = await getDocs(matchesQuery);
          matchesSnap.forEach(mDoc => {
            batch.delete(mDoc.ref);
          });

          // Find games
          const gamesQuery = query(
            collection(db, 'games'),
            where('tournamentId', '==', tournamentId)
          );
          const gamesSnap = await getDocs(gamesQuery);
          gamesSnap.forEach(gDoc => {
            batch.delete(gDoc.ref);
          });

          await batch.commit();
        } catch (cascadeErr) {
          console.warn('Cascade match deletion notice:', cascadeErr);
        }
      }

      // 3. Callback to parent component for state update
      if (onConfirmDelete) {
        onConfirmDelete(tournamentId);
      }

      setIsDeleting(false);
      onClose();
    } catch (err: any) {
      console.error('Error deleting tournament:', err);
      setErrorMessage(err.message || 'Failed to delete tournament. Please check permissions.');
      setIsDeleting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-md bg-[#090D16] border border-[#FF6A00]/40 rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(255,106,0,0.15)] text-white space-y-6"
        >
          {/* Header Icon with Blaze Orange Warning */}
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-2xl bg-[#FF6A00]/15 border border-[#FF6A00]/40 flex items-center justify-center text-[#FF6A00]">
              <AlertTriangle className="w-6 h-6 stroke-[2.5]" />
            </div>
            <button
              onClick={onClose}
              disabled={isDeleting}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Warning Content with high-visibility Blaze Orange styling */}
          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase text-[#FF6A00] tracking-wider font-mono flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-[#FF6A00]" />
              PERMANENT DELETION WARNING
            </span>
            <h3 className="text-xl font-black text-white tracking-tight leading-snug">
              Are you sure you want to permanently delete{' '}
              <span className="text-[#FF6A00]">"{eventName}"</span>?
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              This action will completely remove this tournament, associated brackets, court assignments, and scheduled matches. This operation cannot be undone.
            </p>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-xs text-rose-300">
              {errorMessage}
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs uppercase rounded-2xl border border-white/10 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex-1 py-3 bg-[#FF6A00] hover:bg-[#ff8533] text-black font-black text-xs uppercase tracking-wider rounded-2xl shadow-[0_0_25px_rgba(255,106,0,0.5)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isDeleting ? (
                <>
                  <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>Permanently Delete</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
