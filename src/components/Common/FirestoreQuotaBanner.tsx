import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Database, AlertTriangle, ExternalLink, X, CheckCircle2, Calculator } from 'lucide-react';
import { isFirestoreQuotaExceeded, subscribeToQuotaStatus, FIRESTORE_UPGRADE_URL } from '../../lib/firestoreQuotaGuard';
import { CostCalculatorModal } from './CostCalculatorModal';
import { useAuth } from '../../context/AuthContext';

export const FirestoreQuotaBanner: React.FC = () => {
  const { user, profile, role } = useAuth();
  const isAdmin = role === 'admin' || profile?.role === 'admin' || user?.email === 'kevoiebailey@gmail.com';
  const [exceeded, setExceeded] = useState<boolean>(isFirestoreQuotaExceeded());
  const [dismissed, setDismissed] = useState<boolean>(false);
  const [showCostCalculator, setShowCostCalculator] = useState<boolean>(false);

  useEffect(() => {
    const unsub = subscribeToQuotaStatus((isExceeded) => {
      setExceeded(isExceeded);
    });
    return unsub;
  }, []);

  if (!isAdmin) {
    return null;
  }

  if (!exceeded || dismissed) {
    return (
      <CostCalculatorModal
        isOpen={showCostCalculator}
        onClose={() => setShowCostCalculator(false)}
      />
    );
  }

  return (
    <>
      <CostCalculatorModal
        isOpen={showCostCalculator}
        onClose={() => setShowCostCalculator(false)}
      />
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
          className="w-full bg-gradient-to-r from-amber-500/15 via-[#1E2630] to-amber-500/15 border-b border-amber-500/30 px-4 py-2 text-xs text-slate-300 shadow-md backdrop-blur-md relative z-40"
        >
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-amber-400 font-medium">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              <Database className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="text-slate-200">
                <strong className="text-amber-400 font-semibold">Offline / Cached State Active:</strong> Firestore daily free write quota reached. Changes are safely stored in your local session.
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setShowCostCalculator(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#00F2FE]/15 hover:bg-[#00F2FE]/25 text-[#00F2FE] border border-[#00F2FE]/40 text-[11px] font-bold font-mono transition-colors cursor-pointer"
              >
                <Calculator className="w-3 h-3" />
                <span>Cost Calculator</span>
              </button>

              <a
                href={FIRESTORE_UPGRADE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 hover:text-amber-200 border border-amber-500/40 text-[11px] font-bold font-mono transition-colors"
              >
                <span>Firebase Console</span>
                <ExternalLink className="w-3 h-3" />
              </a>

              <button
                onClick={() => setDismissed(true)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-slate-700/50 transition-colors"
                title="Dismiss Notice"
                aria-label="Dismiss Notice"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </>
  );
};
