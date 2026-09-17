import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  doc, 
  deleteDoc 
} from 'firebase/firestore';
import { 
  BookOpen, 
  Plus, 
  Search, 
  Sparkles, 
  Calendar, 
  Clock, 
  ArrowRight, 
  Zap, 
  X, 
  ChevronRight,
  Loader2
} from 'lucide-react';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { BlogPost, BlogCategory } from './BlogTypes';
import { CreateBlogModal } from './CreateBlogModal';

export interface SportsMediaBlogHubProps {
  onSelectArticle?: (post: BlogPost) => void;
}

const BLOG_CATEGORIES: string[] = [
  'All',
  'Tournament Highlights',
  'Recruiting Guide',
  'Training & Fitness',
  'Media Release',
  'Athlete Spotlight'
];

export const SportsMediaBlogHub: React.FC<SportsMediaBlogHubProps> = ({ 
  onSelectArticle 
}) => {
  const navigate = useNavigate();
  const authContext = useAuth();
  const user = authContext?.user;
  const role = authContext?.role;

  // Modals & UI State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Deletion State
  const [postToDelete, setPostToDelete] = useState<{ id: string; title: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Firestore Articles State - Starts strictly empty without hardcoded mock data
  const [articles, setArticles] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Real-time Firestore Sync: Query /articles ordered by createdAt desc
  useEffect(() => {
    setLoading(true);
    if (!db) {
      setArticles([]);
      setLoading(false);
      return;
    }

    let unsubscribe: (() => void) | null = null;
    try {
      const qArticles = query(collection(db, 'articles'), orderBy('createdAt', 'desc'));
      unsubscribe = onSnapshot(
        qArticles, 
        (snapshot) => {
          if (!snapshot.empty) {
            const fetched: BlogPost[] = snapshot.docs.map((docSnap) => ({
              id: docSnap.id,
              ...docSnap.data()
            } as BlogPost));
            setArticles(fetched);
          } else {
            setArticles([]);
          }
          setLoading(false);
        },
        (err) => {
          console.warn('articles listener orderBy warning, fallback to unordered collection:', err);
          try {
            const fallbackQ = collection(db, 'articles');
            unsubscribe = onSnapshot(fallbackQ, (snapshot) => {
              if (!snapshot.empty) {
                const fetched: BlogPost[] = snapshot.docs.map((docSnap) => ({
                  id: docSnap.id,
                  ...docSnap.data()
                } as BlogPost));
                fetched.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
                setArticles(fetched);
              } else {
                setArticles([]);
              }
              setLoading(false);
            }, () => {
              setArticles([]);
              setLoading(false);
            });
          } catch {
            setArticles([]);
            setLoading(false);
          }
        }
      );
    } catch (e) {
      console.error('Error establishing Firestore /articles listener:', e);
      setArticles([]);
      setLoading(false);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Filtered Articles Calculation (Dynamic live categories + search)
  const filteredArticles = useMemo(() => {
    return articles.filter((post) => {
      if (!post) return false;
      const title = post.title || '';
      const summary = post.summary || '';
      const content = post.content || '';
      const authorName = post.authorName || '';
      const category = post.category || '';

      const matchesCategory = selectedCategory === 'All' || category === selectedCategory;
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch = 
        !q ||
        title.toLowerCase().includes(q) ||
        summary.toLowerCase().includes(q) ||
        content.toLowerCase().includes(q) ||
        authorName.toLowerCase().includes(q) ||
        category.toLowerCase().includes(q);

      return matchesCategory && matchesSearch;
    });
  }, [articles, selectedCategory, searchQuery]);

  // Featured Article: Pick designated featured or first available from filtered pool
  const featuredArticle = useMemo(() => {
    if (filteredArticles.length === 0) return null;
    return filteredArticles.find((a) => a.isFeatured) || filteredArticles[0];
  }, [filteredArticles]);

  const handleArticleClick = (post: BlogPost) => {
    if (onSelectArticle) {
      onSelectArticle(post);
    } else {
      navigate(`/blog/${post.id}`);
    }
  };

  const handleConfirmDelete = async () => {
    if (!postToDelete) return;
    setIsDeleting(true);

    try {
      if (db) {
        try {
          await deleteDoc(doc(db, 'articles', postToDelete.id));
        } catch (_) {}
        try {
          await deleteDoc(doc(db, 'blog_posts', postToDelete.id));
        } catch (_) {}
      }

      setArticles((prev) => prev.filter((p) => p.id !== postToDelete.id));
      showToast(`Article "${postToDelete.title}" deleted.`);
    } catch (err) {
      console.error('Error deleting article:', err);
      setArticles((prev) => prev.filter((p) => p.id !== postToDelete.id));
      showToast(`Article removed from feed.`);
    } finally {
      setIsDeleting(false);
      setPostToDelete(null);
    }
  };

  return (
    <div className="space-y-8 pb-20 select-none animate-fadeIn relative">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 px-5 py-3.5 bg-gradient-to-r from-[#FF6A00] to-[#FFB703] text-zinc-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-[0_0_30px_rgba(255,106,0,0.6)] animate-bounce flex items-center gap-2">
          <Sparkles className="w-4 h-4 fill-current" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. TOP HEADER BANNER & ACTION BAR */}
      <div className="relative rounded-3xl overflow-hidden bg-zinc-950 border border-zinc-800 p-6 sm:p-8 shadow-2xl backdrop-blur-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#FF6A00]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#00B8D4]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF6A00]/15 border border-[#FF6A00]/30 text-[#FF6A00] text-xs font-mono font-black uppercase tracking-wider">
              <Zap className="w-3.5 h-3.5 animate-pulse" />
              <span>JUST1PLAY EDITORIAL & SCOUTING MEDIA HUB</span>
            </div>
            
            <h1 className="text-2xl sm:text-4xl font-black uppercase tracking-tight text-white flex items-center gap-2 font-sans">
              <span>Sports Media & Blog Hub</span>
              <span className="text-[#FF6A00]">.</span>
            </h1>

            <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl leading-relaxed font-medium">
              Verified tournament recaps, Division 1 recruiting breakdowns, combine telemetry insights, and coach strategy playbooks.
            </p>
          </div>

          {/* "+ CREATE BLOG ARTICLE" Button */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              id="create-blog-article-btn"
              onClick={() => setIsCreateModalOpen(true)}
              className="min-h-[46px] px-5 py-3 rounded-2xl bg-gradient-to-r from-[#FF6A00] to-[#FFB703] hover:brightness-110 text-zinc-950 font-black text-xs uppercase tracking-wider shadow-[0_0_25px_rgba(255,106,0,0.4)] flex items-center gap-2 transition-all cursor-pointer transform active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>+ CREATE BLOG ARTICLE</span>
            </button>
          </div>
        </div>

        {/* Search & Category Filter Controls */}
        <div className="mt-6 pt-6 border-t border-zinc-800/80 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Category Chips Bar */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            {BLOG_CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`min-h-[36px] px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                    isSelected
                      ? 'bg-[#FF6A00] text-zinc-950 shadow-[0_0_15px_rgba(255,106,0,0.4)] border border-[#FF6A00]'
                      : 'bg-zinc-900/90 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative w-full lg:w-80 shrink-0">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="blog-hub-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search articles, guides, keywords..."
              className="w-full min-h-[40px] pl-10 pr-9 rounded-full bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#00B8D4] transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-white rounded-full"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

        </div>
      </div>

      {/* Loading Indicator */}
      {loading && (
        <div className="flex items-center justify-center p-12 text-zinc-400 gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-[#FF6A00]" />
          <span className="text-xs font-mono uppercase tracking-wider">Syncing Sports Media Articles...</span>
        </div>
      )}

      {/* 2. FEATURED HERO BENTO CARD */}
      {!loading && featuredArticle && selectedCategory === 'All' && !searchQuery && (
        <div 
          onClick={() => handleArticleClick(featuredArticle)}
          className="group relative rounded-3xl overflow-hidden bg-zinc-950 border border-zinc-800 hover:border-[#FF6A00]/80 transition-all duration-300 shadow-2xl cursor-pointer"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[380px]">
            {/* Cover Image Side */}
            <div className="lg:col-span-7 relative overflow-hidden bg-black min-h-[260px] lg:min-h-full">
              <img
                src={featuredArticle.thumbnailUrl || featuredArticle.coverImageUrl || 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=1200&auto=format&fit=crop&q=80'}
                alt={featuredArticle.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/30 to-transparent lg:bg-gradient-to-r lg:from-transparent lg:to-zinc-950" />
              
              <div className="absolute top-4 left-4 flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-[10px] font-mono font-black uppercase tracking-wider bg-[#FF6A00] text-zinc-950 shadow-[0_0_15px_rgba(255,106,0,0.5)]">
                  FEATURED STORY
                </span>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase bg-black/80 backdrop-blur-md text-[#00B8D4] border border-zinc-700">
                  {featuredArticle.category}
                </span>
              </div>
            </div>

            {/* Content Side */}
            <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between bg-zinc-950">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
                  <span className="text-[#FF6A00] font-bold">{featuredArticle.category}</span>
                  <span>•</span>
                  <span>{featuredArticle.readTime || '4 min read'}</span>
                </div>

                <h2 className="text-xl sm:text-2xl font-black uppercase text-white group-hover:text-[#FF6A00] transition-colors leading-tight font-sans">
                  {featuredArticle.title}
                </h2>

                <p className="text-xs sm:text-sm text-zinc-400 line-clamp-3 leading-relaxed">
                  {featuredArticle.summary || featuredArticle.title}
                </p>
              </div>

              <div className="pt-6 border-t border-zinc-800/80 flex items-center justify-between mt-4">
                <div className="flex items-center gap-3">
                  <img
                    src={featuredArticle.authorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                    alt={featuredArticle.authorName}
                    className="w-9 h-9 rounded-full object-cover border border-[#FF6A00]"
                  />
                  <div>
                    <span className="text-xs font-bold text-white block">{featuredArticle.authorName || 'Just One Play Staff'}</span>
                    <span className="text-[10px] text-zinc-500 font-mono">{featuredArticle.publishDate || 'Recent'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-xs font-black text-[#FF6A00] group-hover:translate-x-1 transition-transform">
                  <span>READ STORY</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. ARTICLES BENTO GRID */}
      {!loading && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-base sm:text-lg font-black uppercase text-white tracking-wider flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#FF6A00]" />
              <span>Articles & Scouting Reports ({filteredArticles.length})</span>
            </h3>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-zinc-500">Channel:</span>
              <span className="text-xs font-bold text-[#00B8D4] uppercase">{selectedCategory}</span>
            </div>
          </div>

          {/* High-Contrast Empty State Card */}
          {filteredArticles.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-zinc-950 border border-zinc-800 space-y-4 my-6 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#FF6A00]/10 rounded-full blur-3xl pointer-events-none" />
              <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-700 flex items-center justify-center mx-auto text-[#FF6A00] shadow-lg">
                <BookOpen className="w-8 h-8" />
              </div>
              <h4 className="text-xl font-black uppercase text-white tracking-wide">
                No articles published yet.
              </h4>
              <p className="text-sm text-zinc-300 max-w-lg mx-auto leading-relaxed font-medium">
                {selectedCategory === 'All' 
                  ? "No articles published yet. Tap '+ CREATE BLOG ARTICLE' to post your first tournament recap or recruiting guide."
                  : `No articles published under "${selectedCategory}" yet. Tap '+ CREATE BLOG ARTICLE' to post your first tournament recap or recruiting guide.`}
              </p>
              <div className="pt-2">
                <button
                  id="empty-state-create-blog-btn"
                  onClick={() => setIsCreateModalOpen(true)}
                  className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-[#FF6A00] to-[#FFB703] hover:brightness-110 text-zinc-950 font-black text-xs uppercase tracking-wider cursor-pointer shadow-[0_0_25px_rgba(255,106,0,0.5)] transition-all transform active:scale-95 inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>+ CREATE BLOG ARTICLE</span>
                </button>
              </div>
            </div>
          ) : (
            /* Grid of Article Cards */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredArticles.map((post) => (
                <div
                  key={post.id}
                  id={`blog-card-${post.id}`}
                  onClick={() => handleArticleClick(post)}
                  className="group relative rounded-3xl bg-zinc-950 border border-zinc-800 hover:border-[#00B8D4]/60 p-5 transition-all duration-300 shadow-xl flex flex-col justify-between hover:scale-[1.01] cursor-pointer"
                >
                  <div>
                    {/* Thumbnail Banner */}
                    <div className="relative aspect-video rounded-2xl overflow-hidden mb-4 bg-black border border-zinc-800">
                      <img
                        src={post.thumbnailUrl || post.coverImageUrl || 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=1200&auto=format&fit=crop&q=80'}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-transparent to-transparent" />
                      
                      <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[9px] font-mono font-black uppercase tracking-wider bg-zinc-900/90 border border-zinc-700 text-[#00B8D4] backdrop-blur-md">
                        {post.category || 'General'}
                      </span>

                      {post.isFeatured && (
                        <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-[#FF6A00] text-zinc-950 shadow-sm">
                          FEATURED
                        </span>
                      )}
                    </div>

                    {/* Metadata Bar */}
                    <div className="flex items-center gap-2 text-[10px] text-zinc-400 mb-2 font-mono">
                      <Calendar className="w-3 h-3 text-zinc-500" />
                      <span>{post.publishDate || 'Recent'}</span>
                      <span>•</span>
                      <Clock className="w-3 h-3 text-zinc-500" />
                      <span>{post.readTime || '3 min read'}</span>
                    </div>

                    {/* Headline */}
                    <h4 className="text-base font-black text-white group-hover:text-[#00B8D4] transition-colors uppercase leading-snug line-clamp-2">
                      {post.title}
                    </h4>

                    {/* Teaser Summary */}
                    <p className="text-xs text-zinc-400 mt-2 line-clamp-3 leading-relaxed">
                      {post.summary || post.title}
                    </p>
                  </div>

                  {/* Card Footer */}
                  <div className="pt-4 mt-4 border-t border-zinc-800/80 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={post.authorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                        alt={post.authorName}
                        className="w-7 h-7 rounded-full object-cover border border-zinc-700"
                      />
                      <span className="text-zinc-300 font-bold truncate max-w-[120px] text-xs">
                        {post.authorName || 'Just One Play Staff'}
                      </span>
                    </div>

                    <span className="text-[#FF6A00] font-bold text-xs group-hover:translate-x-1 transition-transform flex items-center gap-1">
                      <span>Read</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. PRODUCTION-READY CREATE BLOG MODAL */}
      <CreateBlogModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onArticleCreated={(newArticle) => {
          setArticles((prev) => [newArticle, ...prev.filter(p => p.id !== newArticle.id)]);
          showToast(`Article "${newArticle.title}" published!`);
        }}
      />

    </div>
  );
};

export default SportsMediaBlogHub;

