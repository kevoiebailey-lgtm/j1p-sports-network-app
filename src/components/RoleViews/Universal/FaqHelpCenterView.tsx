import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  ChevronDown, 
  ChevronUp, 
  HelpCircle, 
  UserCheck,
  Calendar,
  Trophy, 
  SlidersHorizontal,
  Camera, 
  Film,
  QrCode,
  Crosshair,
  Flame,
  CreditCard,
  Zap,
  CheckCircle2,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Share2,
  Mail,
  Phone,
  MessageSquare,
  ArrowRight,
  Sparkles,
  ExternalLink,
  BookOpen,
  Send,
  X,
  RotateCcw
} from 'lucide-react';
import { ALL_FAQ_DATA, FAQ_CATEGORIES, QUICK_HOW_TO_GUIDES, FaqItem } from '../../../data/faqData';
import { useToast } from '../../../context/ToastContext';
import { PageContainer } from '../../Layout/PageContainer';

export const FaqHelpCenterView: React.FC = () => {
  const { showToast } = useToast();
  
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');
  const [openItemIds, setOpenItemIds] = useState<string[]>(['acc-1', 'trn-1', 'dir-1', 'gal-1']);
  const [activeGuideModal, setActiveGuideModal] = useState<typeof QUICK_HOW_TO_GUIDES[0] | null>(null);
  const [showContactModal, setShowContactModal] = useState<boolean>(false);
  const [helpfulFeedback, setHelpfulFeedback] = useState<Record<string, 'yes' | 'no'>>({});

  // Contact form state
  const [contactName, setContactName] = useState<string>('');
  const [contactEmail, setContactEmail] = useState<string>('');
  const [contactTopic, setContactTopic] = useState<string>('General Support');
  const [contactMessage, setContactMessage] = useState<string>('');
  const [contactSubmitting, setContactSubmitting] = useState<boolean>(false);

  // Category Icon Resolver
  const getCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case 'UserCheck': return UserCheck;
      case 'Calendar': return Calendar;
      case 'Trophy': return Trophy;
      case 'SlidersHorizontal': return SlidersHorizontal;
      case 'Camera': return Camera;
      case 'Film': return Film;
      case 'QrCode': return QrCode;
      case 'Crosshair': return Crosshair;
      case 'Flame': return Flame;
      case 'CreditCard': return CreditCard;
      default: return HelpCircle;
    }
  };

  // Filter FAQ items based on Search, Category, and Role
  const filteredFaqs = useMemo(() => {
    return ALL_FAQ_DATA.filter(item => {
      // Category check
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      
      // Role check
      const matchesRole = selectedRoleFilter === 'all' || 
        !item.roleTarget || 
        item.roleTarget.includes('all') || 
        item.roleTarget.includes(selectedRoleFilter as any);

      // Search Query check
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        item.question.toLowerCase().includes(q) || 
        item.answer.toLowerCase().includes(q) ||
        (item.steps && item.steps.some(s => s.toLowerCase().includes(q))) ||
        item.tags.some(t => t.toLowerCase().includes(q));

      return matchesCategory && matchesRole && matchesSearch;
    });
  }, [searchQuery, selectedCategory, selectedRoleFilter]);

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

  const handleCopyQuestionLink = (faq: FaqItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/faq?q=${encodeURIComponent(faq.question)}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      showToast('success', 'Link Copied', 'Question link copied to clipboard!');
    } else {
      showToast('info', 'Question Link', 'Question link generated.');
    }
  };

  const handleFeedback = (faqId: string, rating: 'yes' | 'no', e: React.MouseEvent) => {
    e.stopPropagation();
    setHelpfulFeedback(prev => ({ ...prev, [faqId]: rating }));
    if (rating === 'yes') {
      showToast('success', 'Thank You!', 'Glad this answered your question.');
    } else {
      showToast('info', 'Feedback Received', 'Thanks for your feedback. We will clarify this article.');
    }
  };

  const handleTagClick = (tag: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSearchQuery(tag);
    setSelectedCategory('all');
  };

  const handleSubmitContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim() || !contactEmail.trim() || !contactMessage.trim()) {
      showToast('error', 'Required Fields', 'Please fill out all required fields.');
      return;
    }
    setContactSubmitting(true);
    setTimeout(() => {
      setContactSubmitting(false);
      setShowContactModal(false);
      setContactName('');
      setContactEmail('');
      setContactMessage('');
      showToast('success', 'Ticket Dispatched', 'Our executive director will respond shortly.');
    }, 600);
  };

  return (
    <PageContainer maxWidth="max-w-4xl">
        {/* HERO BANNER */}
        <div className="relative rounded-3xl bg-gradient-to-br from-[#121B2B] via-[#0A0F1A] to-[#1A120B] p-6 sm:p-10 border border-[#24324F] shadow-2xl overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#00B8D4]/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#FF6A00]/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

          <div className="relative z-10 space-y-4 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00B8D4]/15 border border-[#00B8D4]/30 text-[#00B8D4] text-xs font-mono font-black uppercase tracking-wider">
              <BookOpen className="w-3.5 h-3.5" />
              <span>JUST1PLAY OFFICIAL KNOWLEDGE BASE & FAQ</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight uppercase font-sans">
              Frequently Asked <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00B8D4] via-[#38BDF8] to-[#FF6A00]">Questions</span>
            </h1>

            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Find instant answers and detailed walkthroughs for every single feature across Just1Play — from logging in, switching role perspectives, creating tournaments, and operating the Director Score Desk to downloading 4K action photos and scanning athlete QR passes.
            </p>

            {/* LIVE SEARCH BAR */}
            <div className="pt-3 relative">
              <div className="relative flex items-center">
                <Search className="w-5 h-5 absolute left-4 text-[#00B8D4]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search any topic (e.g. login, create tournament, download photos, director desk, QR pass, travel fee)..."
                  className="w-full pl-12 pr-28 py-4 rounded-2xl bg-[#090D16]/90 border-2 border-[#24324F] focus:border-[#00B8D4] text-sm text-white placeholder-slate-400 focus:outline-none transition-all shadow-[0_0_20px_rgba(0,184,212,0.15)]"
                />
                {searchQuery ? (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs text-slate-300 hover:text-white transition-all cursor-pointer"
                  >
                    Clear
                  </button>
                ) : (
                  <span className="hidden sm:inline-block absolute right-4 text-[10px] font-mono text-slate-500 bg-white/5 px-2 py-1 rounded border border-white/10">
                    ESC to clear
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* QUICK HOW-TO STEP-BY-STEP ACTION GUIDES */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#FFC857]" />
              <h2 className="text-lg font-black text-white uppercase tracking-wide">
                Quick Action Walkthroughs
              </h2>
            </div>
            <span className="text-xs text-slate-400 font-mono">1-Tap Step-by-Step Guides</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {QUICK_HOW_TO_GUIDES.map((guide) => {
              const Icon = getCategoryIcon(guide.iconName);
              return (
                <button
                  key={guide.id}
                  onClick={() => setActiveGuideModal(guide)}
                  className={`p-4 rounded-2xl bg-[#121824] border hover:border-cyan-400 transition-all text-left group cursor-pointer flex flex-col justify-between space-y-3 ${guide.color.split(' ')[2] || 'border-[#24324F]'}`}
                >
                  <div className="space-y-2">
                    <div className="p-2.5 w-fit rounded-xl bg-black/40 border border-white/10">
                      <Icon className="w-5 h-5 text-white group-hover:scale-110 transition-transform" />
                    </div>
                    <h3 className="font-bold text-sm text-white group-hover:text-cyan-300 transition-colors">
                      {guide.title}
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {guide.shortDesc}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs font-bold text-cyan-400">
                    <span>View 3-Step Guide</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* CATEGORY & ROLE FILTER CONTROLS */}
        <div className="p-4 rounded-2xl bg-[#0D131F] border border-[#24324F] space-y-4">
          
          {/* Categories Horizontal Carousel */}
          <div className="space-y-2">
            <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Filter by Topic Category ({FAQ_CATEGORIES.length - 1} Specializations)</span>
              <span className="text-[#00B8D4]">{filteredFaqs.length} Questions Found</span>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              {FAQ_CATEGORIES.map(cat => {
                const Icon = getCategoryIcon(cat.iconName);
                const isSelected = selectedCategory === cat.key;
                const count = cat.key === 'all' 
                  ? ALL_FAQ_DATA.length 
                  : ALL_FAQ_DATA.filter(i => i.category === cat.key).length;

                return (
                  <button
                    key={cat.key}
                    onClick={() => setSelectedCategory(cat.key)}
                    className={`px-3.5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                      isSelected
                        ? 'bg-[#00B8D4] text-slate-950 shadow-[0_0_15px_rgba(0,184,212,0.4)]'
                        : 'bg-[#182232] hover:bg-[#222E42] text-slate-300 border border-[#24324F]'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-slate-950' : 'text-[#00B8D4]'}`} />
                    <span>{cat.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${isSelected ? 'bg-black/20 text-slate-950' : 'bg-black/40 text-slate-400'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Secondary Role Perspectives Filter & Accordion Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/5 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-bold">Target Role:</span>
              {['all', 'athlete', 'scout', 'director', 'viewer', 'admin'].map((roleKey) => (
                <button
                  key={roleKey}
                  onClick={() => setSelectedRoleFilter(roleKey)}
                  className={`px-2.5 py-1 rounded-lg uppercase text-[10px] font-mono font-bold transition-all cursor-pointer ${
                    selectedRoleFilter === roleKey
                      ? 'bg-[#FF6A00] text-white'
                      : 'bg-white/5 hover:bg-white/10 text-slate-400'
                  }`}
                >
                  {roleKey}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={expandAll}
                className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white font-mono text-[11px] transition-all cursor-pointer"
              >
                Expand All
              </button>
              <button
                onClick={collapseAll}
                className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white font-mono text-[11px] transition-all cursor-pointer"
              >
                Collapse All
              </button>
            </div>
          </div>
        </div>

        {/* FAQ ACCORDION LIST */}
        <div className="space-y-3.5">
          {filteredFaqs.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-[#0D131F] border border-[#24324F] space-y-4">
              <HelpCircle className="w-12 h-12 text-slate-500 mx-auto" />
              <h3 className="text-lg font-bold text-white">No Matching Questions Found</h3>
              <p className="text-sm text-slate-400 max-w-md mx-auto">
                We couldn't find any questions matching "{searchQuery}". Try searching a different keyword or submit your inquiry to our executive director.
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => { setSearchQuery(''); setSelectedCategory('all'); setSelectedRoleFilter('all'); }}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase cursor-pointer"
                >
                  Reset Filters
                </button>
                <button
                  onClick={() => setShowContactModal(true)}
                  className="px-4 py-2 rounded-xl bg-[#00B8D4] text-slate-950 font-black text-xs uppercase cursor-pointer hover:bg-cyan-300"
                >
                  Ask Executive Support
                </button>
              </div>
            </div>
          ) : (
            filteredFaqs.map((faq, idx) => {
              const isOpen = openItemIds.includes(faq.id);
              const categoryObj = FAQ_CATEGORIES.find(c => c.key === faq.category) || FAQ_CATEGORIES[0];
              const CategoryIcon = getCategoryIcon(categoryObj.iconName);
              const isHelpful = helpfulFeedback[faq.id];

              return (
                <div
                  key={faq.id}
                  className={`rounded-2xl border transition-all overflow-hidden ${
                    isOpen 
                      ? 'bg-[#0E1522] border-[#00B8D4]/60 shadow-[0_0_20px_rgba(0,184,212,0.12)]' 
                      : 'bg-[#0D131F] border-[#24324F] hover:border-slate-600'
                  }`}
                >
                  {/* Accordion Header */}
                  <button
                    onClick={() => toggleItem(faq.id)}
                    className="w-full p-4 sm:p-5 flex items-start justify-between gap-4 text-left cursor-pointer"
                  >
                    <div className="flex items-start gap-3.5 min-w-0">
                      <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${isOpen ? 'bg-[#00B8D4]/20 text-[#00B8D4]' : 'bg-white/5 text-slate-400'}`}>
                        <CategoryIcon className="w-4 h-4" />
                      </div>

                      <div className="space-y-1.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase bg-white/5 border border-white/10 text-slate-400">
                            {categoryObj.label}
                          </span>
                          {faq.featured && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-black uppercase bg-[#FF6A00]/20 text-[#FF6A00] border border-[#FF6A00]/40">
                              Essential
                            </span>
                          )}
                        </div>

                        <h3 className="font-bold text-sm sm:text-base text-white hover:text-cyan-300 transition-colors">
                          {faq.question}
                        </h3>
                      </div>
                    </div>

                    <div className={`p-1.5 rounded-lg border shrink-0 transition-transform duration-200 ${isOpen ? 'bg-[#00B8D4] text-slate-950 rotate-180 border-[#00B8D4]' : 'bg-white/5 text-slate-400 border-white/10'}`}>
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </button>

                  {/* Accordion Body */}
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="p-4 sm:p-5 pt-0 border-t border-white/5 space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed">
                          
                          {/* Main Answer Text */}
                          <div className="pt-3">
                            <p className="text-slate-200 leading-relaxed font-sans">
                              {faq.answer}
                            </p>
                          </div>

                          {/* Step-by-Step Instructions if present */}
                          {faq.steps && faq.steps.length > 0 && (
                            <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-2.5 my-3">
                              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#00B8D4] flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Step-by-Step Procedure
                              </span>
                              <ol className="space-y-2 text-xs text-slate-300 pl-1">
                                {faq.steps.map((step, sIdx) => (
                                  <li key={sIdx} className="flex items-start gap-2.5">
                                    <span className="w-5 h-5 rounded-full bg-[#00B8D4]/20 border border-[#00B8D4]/40 text-[#00B8D4] font-mono font-bold flex items-center justify-center shrink-0 text-[10px] mt-0.5">
                                      {sIdx + 1}
                                    </span>
                                    <span className="leading-relaxed">{step}</span>
                                  </li>
                                ))}
                              </ol>
                            </div>
                          )}

                          {/* Tags & Action Buttons */}
                          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/5">
                            {/* Keyword Tags */}
                            <div className="flex flex-wrap items-center gap-1.5">
                              {faq.tags.map((tag) => (
                                <button
                                  key={tag}
                                  onClick={(e) => handleTagClick(tag, e)}
                                  className="px-2 py-0.5 rounded-md bg-white/5 hover:bg-cyan-500/20 text-slate-400 hover:text-cyan-300 text-[10px] font-mono border border-white/5 transition-all cursor-pointer"
                                >
                                  #{tag}
                                </button>
                              ))}
                            </div>

                            {/* Helpful Rating & Copy Link */}
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] text-slate-400">Was this helpful?</span>
                              <button
                                onClick={(e) => handleFeedback(faq.id, 'yes', e)}
                                className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                  isHelpful === 'yes'
                                    ? 'bg-emerald-500/30 text-emerald-300 border-emerald-500'
                                    : 'bg-white/5 hover:bg-white/10 text-slate-400 border-white/10'
                                }`}
                                title="Yes, this helped!"
                              >
                                <ThumbsUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={(e) => handleFeedback(faq.id, 'no', e)}
                                className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                  isHelpful === 'no'
                                    ? 'bg-rose-500/30 text-rose-300 border-rose-500'
                                    : 'bg-white/5 hover:bg-white/10 text-slate-400 border-white/10'
                                }`}
                                title="No, I need more details"
                              >
                                <ThumbsDown className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={(e) => handleCopyQuestionLink(faq, e)}
                                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 transition-all cursor-pointer ml-1"
                                title="Copy Question Link"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })
          )}
        </div>

        {/* STILL HAVE QUESTIONS / DIRECT SUPPORT BANNER */}
        <div className="rounded-3xl bg-gradient-to-r from-[#111927] via-[#162235] to-[#1F1710] p-6 sm:p-8 border border-[#24324F] flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
          <div className="space-y-2 text-center sm:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF6A00]/20 text-[#FF6A00] text-[11px] font-mono font-bold uppercase border border-[#FF6A00]/30">
              <Phone className="w-3.5 h-3.5" />
              <span>DIRECT EXECUTIVE DESK SUPPORT</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white uppercase">
              Still Need Assistance or Have a Custom Request?
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
              Our Just1Play tournament directors and technical staff are available 7 days a week for immediate event support, media bookings, or account inquiries.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0 w-full sm:w-auto">
            <button
              onClick={() => setShowContactModal(true)}
              className="w-full sm:w-auto px-5 py-3 rounded-xl bg-[#00B8D4] hover:bg-cyan-300 text-slate-950 font-black text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(0,184,212,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Submit Inquiry</span>
            </button>

            <a
              href="tel:2012069097"
              className="w-full sm:w-auto px-5 py-3 rounded-xl bg-[#1E2B40] hover:bg-slate-700 text-white font-bold text-xs uppercase tracking-wider border border-[#24324F] transition-all flex items-center justify-center gap-2 text-center"
            >
              <Phone className="w-4 h-4 text-amber-400" />
              <span>(201) 206-9097</span>
            </a>
          </div>
        </div>

      {/* QUICK HOW-TO GUIDE MODAL */}
      <AnimatePresence>
        {activeGuideModal && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg p-6 sm:p-8 rounded-3xl bg-[#0E1522] border border-[#00B8D4]/40 shadow-2xl space-y-6 text-white"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-[#00B8D4]/20 text-[#00B8D4] border border-[#00B8D4]/40">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-base uppercase font-sans">
                      {activeGuideModal.title}
                    </h3>
                    <p className="text-xs text-slate-400 font-mono">Walkthrough Guide</p>
                  </div>
                </div>

                <button
                  onClick={() => setActiveGuideModal(null)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                {activeGuideModal.steps.map((step, idx) => (
                  <div key={idx} className="p-3.5 rounded-2xl bg-black/50 border border-white/10 flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#00B8D4] text-slate-950 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </div>
                    <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                      {step}
                    </p>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setActiveGuideModal(null)}
                className="w-full py-3 rounded-xl bg-[#00B8D4] text-slate-950 font-black text-xs uppercase hover:bg-cyan-300 transition-all cursor-pointer"
              >
                Got It, Thanks!
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DIRECT INQUIRY / CONTACT MODAL */}
      <AnimatePresence>
        {showContactModal && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg p-6 sm:p-8 rounded-3xl bg-[#0E1522] border border-[#24324F] shadow-2xl space-y-6 text-white"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-[#FF6A00]/20 text-[#FF6A00] border border-[#FF6A00]/40">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-base uppercase font-sans">
                      Ask Executive Support
                    </h3>
                    <p className="text-xs text-slate-400 font-mono">Response within 2-4 hours</p>
                  </div>
                </div>

                <button
                  onClick={() => setShowContactModal(false)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmitContact} className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="text-slate-300 font-bold uppercase font-mono text-[10px]">Your Name *</label>
                  <input
                    type="text"
                    required
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Coach / Parent / Athlete Name"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white focus:outline-none focus:border-[#00B8D4]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-bold uppercase font-mono text-[10px]">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white focus:outline-none focus:border-[#00B8D4]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-bold uppercase font-mono text-[10px]">Topic *</label>
                  <select
                    value={contactTopic}
                    onChange={(e) => setContactTopic(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white focus:outline-none focus:border-[#00B8D4]"
                  >
                    <option value="General Support">General Support & Account Help</option>
                    <option value="Tournament Registration">Tournament & Bracket Assistance</option>
                    <option value="Media Booking">Videography & Photo Vault Inquiries</option>
                    <option value="Combine Timing">Combine Laser Stats Verification</option>
                    <option value="PayPal Payouts">Director PayPal Commerce Payouts</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-bold uppercase font-mono text-[10px]">Your Question or Message *</label>
                  <textarea
                    required
                    rows={4}
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                    placeholder="Provide details about what you need help with..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white focus:outline-none focus:border-[#00B8D4]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={contactSubmitting}
                  className="w-full py-3 rounded-xl bg-[#00B8D4] hover:bg-cyan-300 text-slate-950 font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(0,184,212,0.3)]"
                >
                  <Send className="w-4 h-4" />
                  <span>{contactSubmitting ? 'Sending Ticket...' : 'Submit Support Inquiry'}</span>
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </PageContainer>
  );
};

export default FaqHelpCenterView;
