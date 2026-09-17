import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, collection, query, where, limit, deleteDoc } from 'firebase/firestore';
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  User, 
  Share2, 
  Heart, 
  Check, 
  BookOpen, 
  ShieldCheck, 
  Tag, 
  Sparkles,
  ChevronRight,
  Trash2,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { canDeleteBlog } from '../../lib/rbac';
import { BlogPost } from './BlogTypes';
import { MetadataUtility } from '../SEO/MetadataUtility';
import { cachedGetDoc, cachedGetDocs } from '../../services/firestoreCacheService';

interface BlogDetailPageProps {
  postId?: string;
  onBack?: () => void;
}

export const BlogDetailPage: React.FC<BlogDetailPageProps> = ({ postId: propPostId, onBack }) => {
  const navigate = useNavigate();
  const { role, user } = useAuth();
  const { id: urlParamId } = useParams<{ id: string }>();
  const activePostId = propPostId || urlParamId;

  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [liked, setLiked] = useState<boolean>(false);
  const [likeCount, setLikeCount] = useState<number>(0);
  const [relatedPosts, setRelatedPosts] = useState<BlogPost[]>([]);

  // Delete Article State
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const userCanDelete = canDeleteBlog(role, user?.uid, post?.authorId);

  useEffect(() => {
    const fetchArticle = async () => {
      setLoading(true);
      if (!activePostId) {
        setPost(null);
        setLoading(false);
        return;
      }

      // Fetch from Firestore articles or blog_posts using local-first cache
      try {
        let fetchedData: BlogPost | null = null;
        try {
          const docRefArticles = doc(db, 'articles', activePostId);
          const docSnapArticles = await cachedGetDoc(docRefArticles, { strategy: 'stale-while-revalidate' });
          if (docSnapArticles.exists()) {
            fetchedData = { id: docSnapArticles.id, ...docSnapArticles.data() } as BlogPost;
          }
        } catch (_) {}

        if (!fetchedData) {
          const docRef = doc(db, 'blog_posts', activePostId);
          const docSnap = await cachedGetDoc(docRef, { strategy: 'stale-while-revalidate' });
          if (docSnap.exists()) {
            fetchedData = { id: docSnap.id, ...docSnap.data() } as BlogPost;
          }
        }

        if (fetchedData) {
          setPost(fetchedData);
          setLikeCount(fetchedData.likesCount || 0);

          // Fetch related articles with cached query
          try {
            const category = fetchedData.category || 'Tournament Highlights';
            const relQ = query(
              collection(db, 'articles'),
              where('category', '==', category),
              limit(3)
            );
            const relSnap = await cachedGetDocs(relQ, `blog_rel_${category}`, { strategy: 'stale-while-revalidate' });
            const relList: BlogPost[] = [];
            relSnap.forEach(d => {
              if (d.id !== activePostId) relList.push({ id: d.id, ...d.data() } as BlogPost);
            });
            setRelatedPosts(relList);
          } catch (e) {
            setRelatedPosts([]);
          }

        } else {
          setPost(null);
        }
      } catch (err) {
        console.warn('Error fetching blog post from Firestore:', err);
        setPost(null);
      } finally {
        setLoading(false);
      }
    };

    fetchArticle();
  }, [activePostId]);

  const handleGoBack = () => {
    if (onBack) {
      onBack();
    } else if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/blog');
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleToggleLike = () => {
    setLiked(!liked);
    setLikeCount(prev => liked ? prev - 1 : prev + 1);
  };

  const handleDeleteArticle = async () => {
    if (!activePostId) return;
    setIsDeleting(true);

    try {
      await deleteDoc(doc(db, 'blog_posts', activePostId));
    } catch (err) {
      console.warn('Firestore article deletion error:', err);
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
      navigate('/blog');
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <div className="w-10 h-10 border-2 border-[#E5B868] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-mono text-slate-400">Loading Just1Play Editorial Article...</p>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="p-8 text-center bg-white/5 rounded-3xl border border-white/10 my-8 space-y-4">
        <BookOpen className="w-12 h-12 text-[#E5B868] mx-auto" />
        <h2 className="text-xl font-black text-white uppercase">Article Not Found</h2>
        <button
          onClick={handleGoBack}
          className="px-5 py-2.5 bg-[#E5B868] text-black font-black text-xs uppercase rounded-xl"
        >
          Return to Blog Hub
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16 relative">
      <MetadataUtility 
        title={`${post.title} | Just1Play Editorial`}
        description={post.summary || (post.content ? post.content.substring(0, 160) : undefined)}
        image={post.thumbnailUrl}
        type="article"
        author={post.authorName}
        publishedTime={post.publishDate}
      />
      
      {/* Native App Shell "Go Back" Header Button */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <button
          onClick={handleGoBack}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/5 hover:bg-white/15 text-white font-bold text-xs uppercase tracking-wider border border-white/15 transition-all shadow-lg hover:border-[#E5B868]/50 cursor-pointer group"
        >
          <ArrowLeft className="w-4 h-4 text-[#E5B868] group-hover:-translate-x-1 transition-transform" />
          <span>BACK TO ARTICLES</span>
        </button>

        <div className="flex items-center gap-2">
          {userCanDelete && (
            <button
              onClick={() => setShowDeleteModal(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-bold text-xs uppercase tracking-wider border border-rose-500/30 transition-all cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>DELETE ARTICLE</span>
            </button>
          )}

          <button
            onClick={handleShare}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-200 hover:text-[#E5B868] font-bold text-xs uppercase tracking-wider border border-white/15 transition-all cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-[#E5B868]" /> : <Share2 className="w-4 h-4" />}
            <span>{copied ? 'LINK COPIED' : 'SHARE ARTICLE'}</span>
          </button>
        </div>
      </div>

      {/* Hero Banner & Article Title Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#E5B868] text-black shadow-[0_0_15px_rgba(214,28,36,0.4)]">
            {post.category || 'Tournament Highlights'}
          </span>
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            {post.readTime || '4 min read'}
          </span>
          <span className="text-xs text-slate-500">•</span>
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            Published {post.publishDate || 'Recently'}
          </span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-white leading-tight font-sans">
          {post.title || 'Untitled Article'}
        </h1>

        {post.summary && (
          <p className="text-base sm:text-lg text-slate-300 font-medium leading-relaxed border-l-2 border-[#E5B868] pl-4 italic">
            {post.summary}
          </p>
        )}

        {/* Author Metadata Bar */}
        <div className="flex items-center justify-between pt-3 border-t border-white/10">
          <div className="flex items-center gap-3">
            <img
              src={post.authorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
              alt={post.authorName || 'Author'}
              className="w-10 h-10 rounded-full object-cover border border-[#E5B868]"
            />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-white">{post.authorName || 'Just1Play Author'}</span>
                <ShieldCheck className="w-4 h-4 text-[#E5B868]" />
              </div>
              <p className="text-[11px] text-slate-400 font-medium">{post.authorRole || 'Just1Play Editorial Contributor'}</p>
            </div>
          </div>

          <button
            onClick={handleToggleLike}
            className={`flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-bold transition-all cursor-pointer ${
              liked
                ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                : 'bg-white/5 text-slate-300 border-white/15 hover:border-rose-500/50'
            }`}
          >
            <Heart className={`w-4 h-4 ${liked ? 'fill-rose-500 text-rose-500' : ''}`} />
            <span>{likeCount} Likes</span>
          </button>
        </div>
      </div>

      {/* Main Cover Image */}
      <div className="relative rounded-3xl overflow-hidden border border-white/15 shadow-2xl bg-black max-h-[450px]">
        <img
          src={post.thumbnailUrl || 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=1200&auto=format&fit=crop&q=80'}
          alt={post.title || 'Cover'}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
      </div>

      {/* Main Formatted Article Content Body */}
      <article className="rounded-3xl bg-[#000000]/80 border border-white/10 p-6 sm:p-10 shadow-2xl backdrop-blur-2xl space-y-6 text-slate-200 text-sm sm:text-base leading-relaxed">
        {(post.content || '').split('\n').map((paragraph, idx) => {
          const trimmed = paragraph.trim();
          if (!trimmed) return null;

          if (trimmed.startsWith('### ')) {
            return (
              <h3 key={idx} className="text-xl sm:text-2xl font-black uppercase text-[#E5B868] mt-6 mb-2 tracking-wide font-sans">
                {trimmed.replace('### ', '')}
              </h3>
            );
          }
          if (trimmed.startsWith('## ')) {
            return (
              <h2 key={idx} className="text-2xl sm:text-3xl font-black uppercase text-white mt-8 mb-3 tracking-wide font-sans">
                {trimmed.replace('## ', '')}
              </h2>
            );
          }
          if (trimmed.startsWith('> ')) {
            return (
              <blockquote key={idx} className="my-4 p-4 rounded-2xl bg-[#E5B868]/10 border-l-4 border-[#E5B868] text-slate-200 italic font-medium">
                {trimmed.replace('> ', '')}
              </blockquote>
            );
          }
          if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
            return (
              <li key={idx} className="ml-4 list-disc text-slate-300 font-medium my-1">
                {trimmed.replace(/^[*|-]\s/, '')}
              </li>
            );
          }

          return (
            <p key={idx} className="text-slate-300 font-normal leading-relaxed">
              {trimmed}
            </p>
          );
        })}
      </article>

      {/* Related Articles Bento Section */}
      {relatedPosts.length > 0 && (
        <div className="space-y-4 pt-6 border-t border-white/10">
          <h3 className="text-lg font-black uppercase text-white tracking-wider flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#E5B868]" />
            Related Articles & Recruiting Guides
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {relatedPosts.map((rel) => (
              <div
                key={rel.id}
                onClick={() => navigate(`/blog/${rel.id}`)}
                className="group rounded-2xl bg-[#000000]/80 border border-white/10 hover:border-[#E5B868]/60 p-4 transition-all duration-300 cursor-pointer flex gap-4 items-center"
              >
                <img
                  src={rel.thumbnailUrl || 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=1200&auto=format&fit=crop&q=80'}
                  alt={rel.title}
                  className="w-20 h-20 rounded-xl object-cover border border-white/10 group-hover:scale-105 transition-transform shrink-0"
                />
                <div>
                  <span className="text-[9px] font-black uppercase text-[#E5B868] tracking-wider">
                    {rel.category || 'Guide'}
                  </span>
                  <h4 className="text-xs font-bold text-white group-hover:text-[#E5B868] transition-colors line-clamp-2 mt-0.5">
                    {rel.title || 'Untitled'}
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-1 font-mono">{rel.publishDate || 'Recent'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl">
          <div className="w-full max-w-md bg-[#000000] border border-rose-500/50 rounded-3xl p-6 shadow-[0_0_50px_rgba(244,63,94,0.3)] space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-3 rounded-2xl bg-rose-500/20 border border-rose-500/30">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black uppercase text-white">Delete Article?</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to permanently delete <strong className="text-white font-bold">"{post.title}"</strong>? This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 font-bold text-xs uppercase"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteArticle}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs uppercase flex items-center gap-2 cursor-pointer shadow-lg disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Confirm Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
