import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  X,
  User,
  Film,
  Trophy,
  PlaySquare,
  ArrowRight,
  Sparkles,
  Command,
  Loader2,
  SlidersHorizontal,
  Flame
} from 'lucide-react';
import { useApp, GlobalSearchResult } from '../../context/AppContext';

export const GlobalCommandPalette: React.FC = () => {
  const { isSearchOpen, closeSearch, executeGlobalSearch, isSearching, searchResults } = useApp();
  const [localQuery, setLocalQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'athlete' | 'video' | 'play' | 'tournament'>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Focus input when opened
  useEffect(() => {
    if (isSearchOpen) {
      setLocalQuery('');
      setSelectedCategory('all');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isSearchOpen]);

  // Debounced search trigger
  useEffect(() => {
    if (!localQuery.trim()) return;
    const timer = setTimeout(() => {
      executeGlobalSearch(localQuery);
    }, 200);
    return () => clearTimeout(timer);
  }, [localQuery, executeGlobalSearch]);

  const filteredResults = searchResults.filter(item => {
    if (selectedCategory === 'all') return true;
    return item.type === selectedCategory;
  });

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isSearchOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        closeSearch();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev < filteredResults.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : filteredResults.length - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredResults[selectedIndex]) {
          const target = filteredResults[selectedIndex];
          closeSearch();
          navigate(target.url);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen, filteredResults, selectedIndex, closeSearch, navigate]);

  const handleSelectResult = (result: GlobalSearchResult) => {
    closeSearch();
    navigate(result.url);
  };

  const getResultIcon = (type: GlobalSearchResult['type']) => {
    switch (type) {
      case 'athlete':
        return <User className="w-4 h-4 text-[#FF6A00]" />;
      case 'video':
        return <Film className="w-4 h-4 text-[#00E5FF]" />;
      case 'play':
        return <PlaySquare className="w-4 h-4 text-emerald-400" />;
      case 'tournament':
        return <Trophy className="w-4 h-4 text-amber-400" />;
      default:
        return <Sparkles className="w-4 h-4 text-slate-400" />;
    }
  };

  if (!isSearchOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/80 backdrop-blur-md">
        {/* Backdrop click */}
        <div className="fixed inset-0" onClick={closeSearch} />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="relative w-full max-w-2xl bg-[#0B0F19] border border-cyan-500/30 rounded-2xl shadow-[0_0_50px_rgba(0,229,255,0.15)] overflow-hidden z-10"
        >
          {/* Search Header */}
          <div className="flex items-center px-4 py-3 border-b border-white/10 bg-white/[0.02]">
            <Search className="w-5 h-5 text-cyan-400 mr-3 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={localQuery}
              onChange={(e) => setLocalQuery(e.target.value)}
              placeholder="Search athletes, highlight film, playbook tactics, tournaments..."
              className="w-full bg-transparent text-white placeholder-slate-400 text-sm sm:text-base outline-none font-sans"
            />
            {isSearching ? (
              <Loader2 className="w-4 h-4 text-cyan-400 animate-spin ml-2 flex-shrink-0" />
            ) : (
              <button
                onClick={closeSearch}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Category Filter Chips */}
          <div className="flex items-center gap-1.5 px-4 py-2 border-b border-white/5 bg-slate-950/60 overflow-x-auto text-xs scrollbar-none">
            {[
              { id: 'all', label: 'All Results' },
              { id: 'athlete', label: 'Athletes & Scouts' },
              { id: 'video', label: 'Watch Vault Film' },
              { id: 'play', label: 'Playbook Schemes' },
              { id: 'tournament', label: 'Tournaments' }
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => {
                  setSelectedCategory(cat.id as any);
                  setSelectedIndex(0);
                }}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all whitespace-nowrap ${
                  selectedCategory === cat.id
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_10px_rgba(0,229,255,0.2)]'
                    : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Results List */}
          <div className="max-h-[60vh] overflow-y-auto p-2 divide-y divide-white/5">
            {filteredResults.length > 0 ? (
              filteredResults.map((result, idx) => {
                const isSelected = idx === selectedIndex;
                return (
                  <div
                    key={result.id}
                    onClick={() => handleSelectResult(result)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-cyan-950/40 border border-cyan-500/30 text-white shadow-[0_0_15px_rgba(0,229,255,0.1)]'
                        : 'hover:bg-white/5 text-slate-300 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-lg bg-black/40 border border-white/10 flex-shrink-0">
                        {getResultIcon(result.type)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-white truncate font-sans">
                            {result.title}
                          </span>
                          {result.badge && (
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${result.badgeColor || 'bg-slate-800 text-slate-300 border-slate-700'}`}>
                              {result.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 truncate mt-0.5 font-sans">
                          {result.subtitle}
                        </p>
                      </div>
                    </div>

                    <ArrowRight className={`w-4 h-4 flex-shrink-0 transition-transform ${isSelected ? 'text-cyan-400 translate-x-1' : 'text-slate-600'}`} />
                  </div>
                );
              })
            ) : (
              <div className="py-12 text-center text-slate-400 space-y-2">
                {localQuery ? (
                  <>
                    <p className="text-sm font-medium">No results found for &ldquo;{localQuery}&rdquo;</p>
                    <p className="text-xs text-slate-500">Try searching by athlete name, sport, position, play, or tournament.</p>
                  </>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
                      <Command className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Type to search across the entire Just1Play sports matrix</span>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-2 max-w-md mx-auto pt-2">
                      {['Basketball', 'Football', 'QB Highlights', '7v7 Cover 3', 'Showcase 2026', 'Cheer Stunts'].map(suggestion => (
                        <button
                          key={suggestion}
                          onClick={() => {
                            setLocalQuery(suggestion);
                            executeGlobalSearch(suggestion);
                          }}
                          className="px-2.5 py-1 rounded-md bg-white/5 hover:bg-cyan-500/10 border border-white/10 hover:border-cyan-500/30 text-xs text-slate-300 hover:text-cyan-300 transition-all font-sans"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Search Footer Bar */}
          <div className="flex items-center justify-between px-4 py-2 bg-black/40 border-t border-white/5 text-[11px] text-slate-500 font-sans">
            <div className="flex items-center gap-3">
              <span><kbd className="px-1.5 py-0.5 rounded bg-white/10 text-slate-300">↑↓</kbd> Navigate</span>
              <span><kbd className="px-1.5 py-0.5 rounded bg-white/10 text-slate-300">↵</kbd> Select</span>
              <span><kbd className="px-1.5 py-0.5 rounded bg-white/10 text-slate-300">ESC</kbd> Close</span>
            </div>
            <div className="flex items-center gap-1.5 text-cyan-400">
              <Sparkles className="w-3 h-3" />
              <span>Universal Search Engine</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
