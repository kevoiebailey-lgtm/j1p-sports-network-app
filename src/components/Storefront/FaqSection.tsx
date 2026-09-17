import React, { useState, useMemo } from 'react';
import { 
  Search, 
  ChevronDown, 
  ChevronUp, 
  HelpCircle, 
  Trophy, 
  Camera, 
  Shield, 
  Users, 
  CreditCard, 
  Zap,
  CheckCircle2,
  Mail,
  ArrowRight,
  Filter,
  UserCheck,
  Calendar,
  SlidersHorizontal,
  Film,
  QrCode,
  Crosshair,
  Flame,
  ThumbsUp,
  ThumbsDown,
  Copy
} from 'lucide-react';
import { ALL_FAQ_DATA, FAQ_CATEGORIES, FaqItem } from '../../data/faqData';
import { useToast } from '../../context/ToastContext';

export const FaqSection: React.FC = () => {
  const { showToast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [openItemIds, setOpenItemIds] = useState<string[]>(['acc-1', 'trn-1', 'dir-1', 'gal-1']);
  const [helpfulFeedback, setHelpfulFeedback] = useState<Record<string, 'yes' | 'no'>>({});

  const toggleItem = (id: string) => {
    setOpenItemIds(prev => 
      prev.includes(id) ? prev.filter(itemId => itemId !== id) : [...prev, id]
    );
  };

  const expandAll = () => {
    setOpenItemIds(filteredFaqs.map(item => item.id));
  };

  const collapseAll = () => {
    setOpenItemIds([]);
  };

  const handleCopyLink = (faq: FaqItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/faq?q=${encodeURIComponent(faq.question)}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      showToast('success', 'Link Copied', 'Question link copied!');
    }
  };

  const handleFeedback = (faqId: string, rating: 'yes' | 'no', e: React.MouseEvent) => {
    e.stopPropagation();
    setHelpfulFeedback(prev => ({ ...prev, [faqId]: rating }));
    if (rating === 'yes') {
      showToast('success', 'Thank You!', 'Glad this answered your question.');
    } else {
      showToast('info', 'Feedback Received', 'Thanks, we will improve this answer.');
    }
  };

  const getCategoryIcon = (key: string) => {
    switch (key) {
      case 'account': return UserCheck;
      case 'events': return Calendar;
      case 'tournaments': return Trophy;
      case 'director': return SlidersHorizontal;
      case 'gallery': return Camera;
      case 'videos': return Film;
      case 'credentials': return QrCode;
      case 'scouting': return Crosshair;
      case 'social': return Flame;
      case 'payments': return CreditCard;
      default: return HelpCircle;
    }
  };

  const filteredFaqs = useMemo(() => {
    return ALL_FAQ_DATA.filter(item => {
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      const query = searchQuery.toLowerCase().trim();
      const matchesQuery = !query || 
        item.question.toLowerCase().includes(query) || 
        item.answer.toLowerCase().includes(query) ||
        (item.steps && item.steps.some(s => s.toLowerCase().includes(query))) ||
        item.tags.some(tag => tag.toLowerCase().includes(query));
      
      return matchesCategory && matchesQuery;
    });
  }, [selectedCategory, searchQuery]);

  return (
    <div className="space-y-6">
      
      {/* Search Bar & Quick Controls */}
      <div className="p-4 sm:p-6 rounded-3xl bg-black/80 border border-white/15 backdrop-blur-xl space-y-4 shadow-xl">
        <div className="relative">
          <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-[#00B8D4]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search questions across login, tournaments, photo downloads, score desk, QR pass..."
            className="w-full pl-12 pr-20 py-3.5 rounded-2xl bg-white/5 border border-white/15 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-[#00B8D4] transition-colors shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-300 hover:text-white bg-white/10 px-2.5 py-1.5 rounded-xl cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {FAQ_CATEGORIES.map(cat => {
            const Icon = getCategoryIcon(cat.key);
            const isSelected = selectedCategory === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => setSelectedCategory(cat.key)}
                className={`px-3.5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                  isSelected
                    ? 'bg-[#00B8D4] text-slate-950 shadow-[0_0_15px_rgba(0,184,212,0.4)]'
                    : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-slate-950' : 'text-[#00B8D4]'}`} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Results Counter & Actions */}
        <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-white/10 flex-wrap gap-2">
          <div>
            Showing <span className="text-[#00B8D4] font-mono font-bold">{filteredFaqs.length}</span> question{filteredFaqs.length !== 1 ? 's' : ''}
            {selectedCategory !== 'all' && <span> in <strong className="text-white capitalize">{selectedCategory}</strong></span>}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={expandAll}
              className="hover:text-white text-slate-400 font-mono text-[11px] underline cursor-pointer"
            >
              Expand All
            </button>
            <span className="text-slate-600">|</span>
            <button
              onClick={collapseAll}
              className="hover:text-white text-slate-400 font-mono text-[11px] underline cursor-pointer"
            >
              Collapse All
            </button>
          </div>
        </div>
      </div>

      {/* FAQ Accordion List */}
      {filteredFaqs.length === 0 ? (
        <div className="p-8 text-center rounded-2xl bg-black/60 border border-white/10 space-y-3">
          <HelpCircle className="w-10 h-10 text-slate-500 mx-auto" />
          <h3 className="text-sm font-bold text-white uppercase">No matching questions found</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Try adjusting your search terms or select another category filter above.
          </p>
          <button
            onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}
            className="px-4 py-2 rounded-xl bg-[#00B8D4]/20 text-[#00B8D4] border border-[#00B8D4]/40 text-xs font-bold uppercase mt-2 hover:bg-[#00B8D4]/30 cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredFaqs.map(item => {
            const isOpen = openItemIds.includes(item.id);
            const isHelpful = helpfulFeedback[item.id];
            const Icon = getCategoryIcon(item.category);

            return (
              <div
                key={item.id}
                className={`rounded-2xl border transition-all overflow-hidden ${
                  isOpen
                    ? 'bg-[#0E1522] border-[#00B8D4]/50 shadow-[0_0_20px_rgba(0,184,212,0.12)]'
                    : 'bg-black/70 border-white/10 hover:border-white/20'
                }`}
              >
                <button
                  onClick={() => toggleItem(item.id)}
                  className="w-full p-4 sm:p-5 text-left flex items-start justify-between gap-4 cursor-pointer select-none"
                >
                  <div className="space-y-1.5 pr-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded-md bg-white/10 text-slate-300 font-mono text-[10px] uppercase font-bold flex items-center gap-1">
                        <Icon className="w-3 h-3 text-[#00B8D4]" />
                        <span>{item.category}</span>
                      </span>
                      {item.featured && (
                        <span className="px-2 py-0.5 rounded-md bg-[#FF6A00]/20 text-[#FF6A00] font-mono text-[10px] uppercase font-bold flex items-center gap-1 border border-[#FF6A00]/30">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>POPULAR</span>
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-white uppercase tracking-wide group-hover:text-[#00B8D4] transition-colors">
                      {item.question}
                    </h3>
                  </div>

                  <div className={`p-2 rounded-xl border transition-all mt-1 ${
                    isOpen ? 'bg-[#00B8D4] text-slate-950 border-[#00B8D4]' : 'bg-white/5 text-slate-400 border-white/10'
                  }`}>
                    {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </button>

                {isOpen && (
                  <div className="px-4 sm:px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-white/10 bg-white/[0.02] space-y-3">
                    <p className="leading-relaxed text-slate-200">{item.answer}</p>

                    {item.steps && item.steps.length > 0 && (
                      <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 space-y-2 my-2">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#00B8D4] flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Action Steps</span>
                        </span>
                        <ol className="space-y-1.5 text-xs text-slate-300">
                          {item.steps.map((s, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="w-4 h-4 rounded-full bg-[#00B8D4]/20 text-[#00B8D4] text-[9px] font-mono font-bold flex items-center justify-center shrink-0 mt-0.5">
                                {idx + 1}
                              </span>
                              <span>{s}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-white/5">
                      {item.tags.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-mono text-slate-500 uppercase font-bold mr-1">Tags:</span>
                          {item.tags.map(tag => (
                            <span
                              key={tag}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSearchQuery(tag);
                              }}
                              className="px-2 py-0.5 rounded bg-white/5 hover:bg-[#00B8D4]/20 hover:text-[#00B8D4] text-slate-400 text-[10px] font-mono cursor-pointer transition-colors"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center gap-1.5 ml-auto">
                        <button
                          onClick={(e) => handleFeedback(item.id, 'yes', e)}
                          className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                            isHelpful === 'yes' ? 'bg-emerald-500/30 text-emerald-300 border-emerald-500' : 'bg-white/5 text-slate-400 border-white/10'
                          }`}
                          title="Helpful"
                        >
                          <ThumbsUp className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => handleFeedback(item.id, 'no', e)}
                          className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                            isHelpful === 'no' ? 'bg-rose-500/30 text-rose-300 border-rose-500' : 'bg-white/5 text-slate-400 border-white/10'
                          }`}
                          title="Not helpful"
                        >
                          <ThumbsDown className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => handleCopyLink(item, e)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 border border-white/10 cursor-pointer"
                          title="Copy Link"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Direct Help / Support Card */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-[#00B8D4]/10 via-black to-black border border-[#00B8D4]/30 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1 text-center sm:text-left">
          <h4 className="text-sm font-black uppercase text-white flex items-center gap-2 justify-center sm:justify-start">
            <Mail className="w-4 h-4 text-[#00B8D4]" />
            <span>Have a question not listed here?</span>
          </h4>
          <p className="text-xs text-slate-300">
            Contact Kevoie Bailey (Executive Director) directly at <strong className="text-[#00B8D4]">kevoiebailey@gmail.com</strong> or call <strong className="text-white">(201) 206-9097</strong> for immediate assistance.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href="tel:2012069097"
            className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs font-mono transition-all flex items-center gap-2 cursor-pointer"
          >
            <span>(201) 206-9097</span>
          </a>
          <a
            href="mailto:kevoiebailey@gmail.com"
            className="px-5 py-2.5 rounded-xl bg-[#00B8D4] hover:bg-cyan-300 text-slate-950 font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer shadow-[0_0_15px_rgba(0,184,212,0.3)]"
          >
            <span>EMAIL DIRECT</span>
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>

    </div>
  );
};

export default FaqSection;
