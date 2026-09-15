import React, { useState, useEffect } from 'react';
import { collection, deleteDoc, doc, updateDoc, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { firestoreCacheService } from '../../services/firestoreCacheService';
import { NativeVideoPlayer } from '../MediaHub/NativeVideoPlayer';
import { AdminVideoUploader } from './AdminVideoUploader';
import { CreateBlogModal } from '../Blog/CreateBlogModal';
import { BlogPost } from '../Blog/BlogTypes';
import { 
  Film, 
  FileText, 
  MessageSquare, 
  Trash2, 
  Eye, 
  EyeOff, 
  Star, 
  Search, 
  Plus, 
  AlertTriangle, 
  CheckCircle2, 
  Loader2, 
  Pin, 
  ExternalLink,
  ShieldAlert
} from 'lucide-react';

export const AdminContentPage: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'videos' | 'blogs' | 'social'>('videos');
  
  // Blog Moderation State
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [blogLoading, setBlogLoading] = useState<boolean>(true);
  const [blogSearch, setBlogSearch] = useState<string>('');
  const [showCreateBlogModal, setShowCreateBlogModal] = useState<boolean>(false);

  // Social Feed Posts Moderation State
  const [socialPosts, setSocialPosts] = useState<any[]>([]);
  const [socialLoading, setSocialLoading] = useState<boolean>(true);
  const [socialSearch, setSocialSearch] = useState<string>('');

  // Notification Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (text: string) => {
    setToastMessage(text);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Fetch Blogs
  const fetchBlogPosts = async () => {
    setBlogLoading(true);
    try {
      if (!db) {
        setBlogLoading(false);
        return;
      }
      const snap = await firestoreCacheService.getDocsCached(
        query(collection(db, 'blog_posts'), orderBy('createdAt', 'desc'), limit(50)),
        'admin_blog_posts',
        { strategy: 'stale-while-revalidate', ttlMs: 5 * 60 * 1000 }
      );
      if (!snap.empty) {
        const list: BlogPost[] = [];
        snap.forEach(d => {
          list.push({ id: d.id, ...d.data() } as BlogPost);
        });
        setBlogPosts(list);
      } else {
        setBlogPosts([
          {
            id: 'blog-demo-1',
            title: '2026 Tri-State Top 50 Point Guards Scouting Breakdown',
            summary: 'In-depth video analysis and physical metric evaluation of the top rising point guards across NY, NJ, and PA.',
            content: 'Full breakdown content...',
            authorId: 'admin-1',
            authorName: 'Coach Marcus Vance',
            authorRole: 'Chief Scouting Director',
            authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
            category: 'Athlete Spotlight',
            publishDate: '2026-07-28',
            thumbnailUrl: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&auto=format&fit=crop&q=80',
            readTime: '6 min read',
            createdAt: new Date().toISOString(),
            isFeatured: true,
            isPublished: true
          },
          {
            id: 'blog-demo-2',
            title: 'Flag Football College Recruiting Roadmap for 2026-2027',
            summary: 'Key dates, NCAA/NAIA scholarship guidelines, and tournament film prep for high school flag football prospects.',
            content: 'Full breakdown content...',
            authorId: 'admin-2',
            authorName: 'Sarah Jenkins',
            authorRole: 'NCAA Recruiting Advisor',
            authorAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=80',
            category: 'Recruiting Guide',
            publishDate: '2026-07-27',
            thumbnailUrl: 'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=800&auto=format&fit=crop&q=80',
            readTime: '4 min read',
            createdAt: new Date(Date.now() - 86400000).toISOString(),
            isFeatured: false,
            isPublished: true
          }
        ]);
      }
    } catch (err) {
      console.warn('Error loading blog posts:', err);
    } finally {
      setBlogLoading(false);
    }
  };

  // Fetch Social Posts
  const fetchSocialPosts = async () => {
    setSocialLoading(true);
    try {
      if (!db) return;
      const snap = await firestoreCacheService.getDocsCached(
        query(collection(db, 'posts'), limit(50)),
        'admin_social_posts',
        { strategy: 'stale-while-revalidate', ttlMs: 5 * 60 * 1000 }
      );
      if (!snap.empty) {
        const list: any[] = [];
        snap.forEach(d => {
          list.push({ id: d.id, ...d.data() });
        });
        setSocialPosts(list);
      } else {
        setSocialPosts([
          {
            id: 'post-1',
            authorName: 'Trey Henderson',
            authorRole: 'Point Guard',
            content: 'Just dropped 32 points with 8 assists in the Tri-State Championship semi-finals! Full tape coming tonight.',
            sport: 'Basketball',
            likes: 42,
            createdAt: new Date().toISOString(),
            isPinned: false
          },
          {
            id: 'post-2',
            authorName: 'Maya Lin',
            authorRole: 'Flag Football QB',
            content: 'Grateful to receive an official offer from St. Thomas University! All glory to God.',
            sport: 'Flag Football',
            likes: 128,
            createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
            isPinned: true
          }
        ]);
      }
    } catch (err) {
      console.warn('Error loading social posts:', err);
    } finally {
      setSocialLoading(false);
    }
  };

  useEffect(() => {
    fetchBlogPosts();
    fetchSocialPosts();
  }, []);

  // Delete Blog
  const handleDeleteBlog = async (blogId: string) => {
    if (!confirm('Are you sure you want to permanently delete this blog post?')) return;
    try {
      await deleteDoc(doc(db, 'blog_posts', blogId));
      setBlogPosts(prev => prev.filter(b => b.id !== blogId));
      showToast('Blog article deleted successfully.');
    } catch (err) {
      console.error('Delete blog error:', err);
      setBlogPosts(prev => prev.filter(b => b.id !== blogId));
      showToast('Blog article removed from list.');
    }
  };

  // Toggle Publish / Unpublish Blog
  const handleTogglePublishBlog = async (blog: BlogPost) => {
    const nextState = !blog.isPublished;
    try {
      await updateDoc(doc(db, 'blog_posts', blog.id), { isPublished: nextState });
      setBlogPosts(prev => prev.map(b => b.id === blog.id ? { ...b, isPublished: nextState } : b));
      showToast(`Article ${nextState ? 'PUBLISHED' : 'UNPUBLISHED'} across the platform.`);
    } catch (err) {
      console.error('Toggle publish error:', err);
      setBlogPosts(prev => prev.map(b => b.id === blog.id ? { ...b, isPublished: nextState } : b));
      showToast(`Publish status updated locally.`);
    }
  };

  // Toggle Featured Blog
  const handleToggleFeaturedBlog = async (blog: BlogPost) => {
    const nextState = !blog.isFeatured;
    try {
      await updateDoc(doc(db, 'blog_posts', blog.id), { isFeatured: nextState });
      setBlogPosts(prev => prev.map(b => b.id === blog.id ? { ...b, isFeatured: nextState } : b));
      showToast(`Article ${nextState ? 'FEATURED' : 'UNFEATURED'} on home page hero.`);
    } catch (err) {
      console.error('Toggle featured error:', err);
      setBlogPosts(prev => prev.map(b => b.id === blog.id ? { ...b, isFeatured: nextState } : b));
    }
  };

  // Delete Social Post
  const handleDeleteSocialPost = async (postId: string) => {
    if (!confirm('Delete this user post from the global social feed?')) return;
    try {
      await deleteDoc(doc(db, 'posts', postId));
      setSocialPosts(prev => prev.filter(p => p.id !== postId));
      showToast('Social post removed from feed.');
    } catch (err) {
      console.error('Delete post error:', err);
    }
  };

  const filteredBlogs = blogPosts.filter(b => 
    b.title.toLowerCase().includes(blogSearch.toLowerCase()) ||
    b.authorName.toLowerCase().includes(blogSearch.toLowerCase()) ||
    b.category.toLowerCase().includes(blogSearch.toLowerCase())
  );

  const filteredSocial = socialPosts.filter(p =>
    (p.authorName || '').toLowerCase().includes(socialSearch.toLowerCase()) ||
    (p.content || '').toLowerCase().includes(socialSearch.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-24 right-6 z-50 p-4 rounded-2xl bg-[#000000]/90 border border-[#E5B868] text-white shadow-[0_0_30px_rgba(214,28,36,0.3)] backdrop-blur-2xl flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-[#E5B868]" />
          <span className="text-xs font-bold font-sans uppercase">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="p-6 rounded-3xl bg-[#212A31]/90 border border-white/10 backdrop-blur-2xl">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E5B868]/10 border border-[#E5B868]/30 text-[#E5B868] text-xs font-mono font-bold uppercase tracking-widest mb-2">
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Platform Content Moderation Engine</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black italic uppercase text-white font-sans tracking-tight">
          CONTENT <span className="text-[#E5B868]">MODERATION & HUB</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Full administrative control over broadcast videos, editorial blogs, and user social posts.
        </p>

        {/* Sub-Tab Selector */}
        <div className="flex flex-wrap items-center gap-2 mt-6 pt-4 border-t border-white/10">
          <button
            onClick={() => setActiveSubTab('videos')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'videos'
                ? 'bg-[#E5B868] text-black shadow-[0_0_15px_rgba(214,28,36,0.4)]'
                : 'bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            <Film className="w-4 h-4" />
            <span>Native Broadcast Videos</span>
          </button>

          <button
            onClick={() => setActiveSubTab('blogs')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'blogs'
                ? 'bg-[#E5B868] text-black shadow-[0_0_15px_rgba(214,28,36,0.4)]'
                : 'bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Blogs & Scouting Reports</span>
          </button>

          <button
            onClick={() => setActiveSubTab('social')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'social'
                ? 'bg-[#E5B868] text-black shadow-[0_0_15px_rgba(214,28,36,0.4)]'
                : 'bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Social Feed Posts</span>
          </button>
        </div>
      </div>

      {/* 1. NATIVE BROADCAST VIDEOS TAB */}
      {activeSubTab === 'videos' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Exclusive Admin Storage Uploader */}
          <AdminVideoUploader />

          <NativeVideoPlayer showUploadSection={true} />
        </div>
      )}

      {/* 2. BLOGS & EDITORIAL ARTICLES TAB */}
      {activeSubTab === 'blogs' && (
        <div className="space-y-6 animate-fadeIn">
          
          {/* Action Bar */}
          <div className="p-4 rounded-2xl bg-[#212A31]/90 border border-white/10 backdrop-blur-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search articles or authors..."
                value={blogSearch}
                onChange={e => setBlogSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#E5B868]"
              />
            </div>

            <button
              onClick={() => setShowCreateBlogModal(true)}
              className="px-4 py-2.5 rounded-xl bg-[#E5B868] hover:bg-[#B8141B] text-black font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-[0_0_15px_rgba(214,28,36,0.4)] transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Article</span>
            </button>
          </div>

          {/* Blogs Grid */}
          {blogLoading ? (
            <div className="p-12 text-center text-slate-400 font-mono text-xs flex justify-center items-center gap-2">
              <Loader2 className="w-6 h-6 text-[#E5B868] animate-spin" />
              <span>Fetching Blog Articles...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredBlogs.map((b) => (
                <div 
                  key={b.id} 
                  className={`p-5 rounded-3xl border transition-all flex flex-col justify-between gap-4 ${
                    b.isPublished 
                      ? 'bg-[#212A31]/90 border-white/10' 
                      : 'bg-red-950/20 border-red-500/30'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2.5 py-1 rounded-full bg-[#E5B868]/10 text-[#E5B868] border border-[#E5B868]/30 text-[10px] font-mono font-bold uppercase">
                        {b.category}
                      </span>
                      <div className="flex items-center gap-2">
                        {b.isFeatured && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-mono font-bold uppercase flex items-center gap-1">
                            <Star className="w-3 h-3 fill-amber-300" />
                            Featured
                          </span>
                        )}
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase border ${
                          b.isPublished ? 'bg-red-600/20 border-red-600/40 text-red-500' : 'bg-red-500/20 border-red-500/40 text-red-400'
                        }`}>
                          {b.isPublished ? 'Published' : 'Unpublished'}
                        </span>
                      </div>
                    </div>

                    <h3 className="text-base font-bold text-white font-sans line-clamp-2">
                      {b.title}
                    </h3>
                    
                    <p className="text-xs text-slate-400 line-clamp-2">
                      {b.summary || b.content}
                    </p>

                    <div className="text-[11px] text-slate-500 font-mono">
                      By: <strong className="text-slate-300">{b.authorName}</strong> ({b.authorRole})
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      
                      {/* Toggle Publish */}
                      <button
                        onClick={() => handleTogglePublishBlog(b)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
                          b.isPublished 
                            ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' 
                            : 'bg-red-600/20 hover:bg-red-600/30 text-red-500 border border-red-600/40'
                        }`}
                      >
                        {b.isPublished ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        <span>{b.isPublished ? 'Unpublish' : 'Publish'}</span>
                      </button>

                      {/* Toggle Feature */}
                      <button
                        onClick={() => handleToggleFeaturedBlog(b)}
                        className={`p-2 rounded-xl border transition-all cursor-pointer ${
                          b.isFeatured
                            ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                            : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                        }`}
                        title="Toggle Featured on Home Page"
                      >
                        <Star className={`w-3.5 h-3.5 ${b.isFeatured ? 'fill-amber-300' : ''}`} />
                      </button>

                    </div>

                    {/* Delete */}
                    <button
                      onClick={() => handleDeleteBlog(b.id)}
                      className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 transition-all cursor-pointer"
                      title="Delete Article"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                </div>
              ))}
            </div>
          )}

        </div>
      )}

      {/* 3. SOCIAL FEED MODERATION TAB */}
      {activeSubTab === 'social' && (
        <div className="space-y-6 animate-fadeIn">
          
          <div className="p-4 rounded-2xl bg-[#212A31]/90 border border-white/10 backdrop-blur-2xl">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter social posts by user or keyword..."
                value={socialSearch}
                onChange={e => setSocialSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#E5B868]"
              />
            </div>
          </div>

          <div className="space-y-4">
            {filteredSocial.map((p) => (
              <div key={p.id} className="p-5 rounded-3xl bg-[#212A31]/90 border border-white/10 backdrop-blur-2xl flex flex-col sm:flex-row items-start justify-between gap-4">
                
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-xs font-sans">{p.authorName}</span>
                    <span className="text-[10px] text-slate-500 font-mono">({p.authorRole || 'Athlete'})</span>
                    {p.isPinned && (
                      <span className="px-2 py-0.5 rounded-full bg-[#E5B868]/20 text-cyan-300 text-[9px] font-mono font-bold uppercase flex items-center gap-1 border border-[#E5B868]/40">
                        <Pin className="w-2.5 h-2.5" /> Pinned
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-300 font-sans leading-relaxed">
                    "{p.content}"
                  </p>

                  <div className="text-[10px] text-slate-500 font-mono">
                    Likes: {p.likes || 0} • Posted: {new Date(p.createdAt).toLocaleDateString()}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                  <button
                    onClick={() => handleDeleteSocialPost(p.id)}
                    className="px-3 py-1.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 font-bold text-xs uppercase flex items-center gap-1.5 cursor-pointer transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Post</span>
                  </button>
                </div>

              </div>
            ))}
          </div>

        </div>
      )}

      {/* CREATE BLOG POST MODAL */}
      <CreateBlogModal
        isOpen={showCreateBlogModal}
        onClose={() => setShowCreateBlogModal(false)}
        onArticleCreated={() => {
          fetchBlogPosts();
          showToast('New blog article published successfully!');
        }}
      />

    </div>
  );
};
