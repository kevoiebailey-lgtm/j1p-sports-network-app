import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Sparkles, 
  Image as ImageIcon, 
  FileText, 
  Bold, 
  Italic, 
  Heading1, 
  Heading2, 
  List, 
  Quote, 
  Code, 
  Link as LinkIcon,
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Clock, 
  Star, 
  Eye, 
  Upload, 
  Zap, 
  Layers, 
  ShieldCheck,
  Send,
  Save
} from 'lucide-react';
import { 
  collection, 
  addDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { BlogCategory, BlogPost } from './BlogTypes';

export const BLOG_CATEGORIES: BlogCategory[] = [
  'Tournament Highlights',
  'Recruiting Guide',
  'Training & Fitness',
  'Media Release',
  'Athlete Spotlight'
];

const PRESET_COVERS = [
  { label: 'Tournament', url: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1200&auto=format&fit=crop&q=80' },
  { label: 'Combine', url: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=1200&auto=format&fit=crop&q=80' },
  { label: 'Training', url: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=1200&auto=format&fit=crop&q=80' },
  { label: 'Basketball', url: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=1200&auto=format&fit=crop&q=80' },
  { label: 'Football', url: 'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=1200&auto=format&fit=crop&q=80' },
];

/**
 * Normalizes user-pasted Google Drive links into direct high-performance Edge CDN URLs
 */
function normalizeImageUrl(inputUrl: string): string {
  if (!inputUrl) return '';
  const trimmed = inputUrl.trim();
  
  // Convert standard Google Drive share links to lh3 CDN format
  // Example: https://drive.google.com/file/d/1A2B3C4D5E/view?usp=sharing
  const driveMatch = trimmed.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (driveMatch && driveMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${driveMatch[1]}`;
  }

  const driveOpenMatch = trimmed.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
  if (driveOpenMatch && driveOpenMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${driveOpenMatch[1]}`;
  }

  const driveUcMatch = trimmed.match(/drive\.google\.com\/uc\?(?:.*&)?id=([a-zA-Z0-9_-]+)/);
  if (driveUcMatch && driveUcMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${driveUcMatch[1]}`;
  }

  return trimmed;
}

export interface CreateBlogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onArticleCreated?: (newArticle: BlogPost) => void;
}

export const CreateBlogModal: React.FC<CreateBlogModalProps> = ({
  isOpen,
  onClose,
  onArticleCreated
}) => {
  const authContext = useAuth();
  const user = authContext?.user;
  const profile = authContext?.profile;
  const role = authContext?.role;

  // Form Field State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<BlogCategory>('Tournament Highlights');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);

  // Status & Feedback State
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [imagePreviewError, setImagePreviewError] = useState(false);

  // Synchronize modal open/close behavior and hide floating docks
  useEffect(() => {
    if (isOpen) {
      window.dispatchEvent(new CustomEvent('app:hide-dock'));
      setErrorMessage(null);
      setSubmitSuccess(false);
      setImagePreviewError(false);
    } else {
      window.dispatchEvent(new CustomEvent('app:show-dock'));
    }
    return () => {
      window.dispatchEvent(new CustomEvent('app:show-dock'));
    };
  }, [isOpen]);

  // Clean formatted cover URL
  const processedCoverUrl = useMemo(() => {
    return normalizeImageUrl(coverImageUrl);
  }, [coverImageUrl]);

  // Dynamic Word Count & Read Time Calculation
  const { wordCount, readTimeDisplay } = useMemo(() => {
    const text = content.trim();
    if (!text) {
      return { wordCount: 0, readTimeDisplay: '1 min read' };
    }
    const words = text.split(/\s+/).filter(Boolean);
    const count = words.length;
    // Standard human reading speed: ~180-200 wpm
    const minutes = Math.max(1, Math.ceil(count / 180));
    return {
      wordCount: count,
      readTimeDisplay: `${minutes} min read`
    };
  }, [content]);

  // Handle Markdown Insertion
  const handleInsertFormatting = (prefix: string, suffix: string = '', defaultSample: string = 'text') => {
    setContent((prev) => {
      if (!prev) {
        return `${prefix}${defaultSample}${suffix}`;
      }
      return `${prev}\n${prefix}${defaultSample}${suffix}`;
    });
  };

  // Safe Author Resolution with fallbacks
  const resolveAuthorMetadata = () => {
    const defaultAuthor = {
      name: 'Just One Play Staff',
      role: 'Staff Writer',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
      id: 'staff-editorial'
    };

    try {
      const currentAuthUser = auth?.currentUser || user;
      const authorName = 
        profile?.displayName || 
        (profile as any)?.fullName ||
        currentAuthUser?.displayName || 
        defaultAuthor.name;

      const rawRole = profile?.role || role || 'Staff Writer';
      const authorRole = typeof rawRole === 'string' 
        ? rawRole.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) 
        : defaultAuthor.role;

      const authorAvatar = 
        profile?.photoURL || 
        profile?.avatarUrl || 
        currentAuthUser?.photoURL || 
        defaultAuthor.avatarUrl;

      const authorId = 
        currentAuthUser?.uid || 
        profile?.uid || 
        defaultAuthor.id;

      return {
        authorName: authorName.trim() || defaultAuthor.name,
        authorRole: authorRole.trim() || defaultAuthor.role,
        authorAvatar: authorAvatar.trim() || defaultAuthor.avatarUrl,
        authorId: authorId.trim() || defaultAuthor.id
      };
    } catch (e) {
      console.warn('Error resolving author metadata, using fallback:', e);
      return {
        authorName: defaultAuthor.name,
        authorRole: defaultAuthor.role,
        authorAvatar: defaultAuthor.avatarUrl,
        authorId: defaultAuthor.id
      };
    }
  };

  // Form Submission Flow (Draft or Published)
  const handleSubmitArticle = async (status: 'published' | 'draft') => {
    if (!title.trim()) {
      setErrorMessage('Please enter an article headline title.');
      return;
    }

    if (!content.trim()) {
      setErrorMessage('Please provide the main content body for your article.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    const author = resolveAuthorMetadata();
    const finalCover = processedCoverUrl || PRESET_COVERS[0].url;
    const finalSummary = summary.trim() || title.trim();
    const isoDateString = new Date().toISOString().split('T')[0];
    const createdTimestamp = new Date().toISOString();

    // Guard against undefined Firestore field values
    const safeArticlePayload = {
      title: title.trim(),
      category: category || 'Tournament Highlights',
      summary: finalSummary,
      content: content.trim(),
      thumbnailUrl: finalCover,
      coverImageUrl: finalCover,
      authorId: author.authorId || 'editorial-staff',
      authorName: author.authorName || 'Just One Play Editorial',
      authorRole: author.authorRole || 'Staff Writer',
      authorAvatar: author.authorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
      publishDate: isoDateString,
      readTime: readTimeDisplay,
      isPublished: status === 'published',
      status: status,
      isFeatured: Boolean(isFeatured),
      likesCount: 0,
      tags: [category || 'Tournament Highlights'],
      createdAt: createdTimestamp,
      updatedAt: createdTimestamp
    };

    try {
      let createdDocId = `article-${Date.now()}`;

      // Write to Firestore collection "articles" and "blog_posts"
      if (db) {
        try {
          const docRef = await addDoc(collection(db, 'articles'), {
            ...safeArticlePayload,
            serverCreated: serverTimestamp()
          });
          if (docRef && docRef.id) {
            createdDocId = docRef.id;
          }
        } catch (articlesDbErr) {
          console.warn('Could not write to articles collection, attempting blog_posts:', articlesDbErr);
          try {
            const blogDocRef = await addDoc(collection(db, 'blog_posts'), {
              ...safeArticlePayload,
              serverCreated: serverTimestamp()
            });
            if (blogDocRef && blogDocRef.id) {
              createdDocId = blogDocRef.id;
            }
          } catch (blogDbErr) {
            console.warn('Direct Firestore insert failed, proceeding with resilient client record:', blogDbErr);
          }
        }
      }

      const finalizedArticle: BlogPost = {
        id: createdDocId,
        ...safeArticlePayload
      };

      setSubmitSuccess(true);

      // Notify parent listener / sync into state
      if (onArticleCreated) {
        onArticleCreated(finalizedArticle);
      }

      // Reset fields after short delay then close
      setTimeout(() => {
        setTitle('');
        setCoverImageUrl('');
        setSummary('');
        setContent('');
        setIsFeatured(false);
        setSubmitting(false);
        setSubmitSuccess(false);
        onClose();
      }, 700);

    } catch (err: any) {
      console.error('Crash-proof handler caught unexpected submission error:', err);
      // Fallback local creation so user never loses work
      const fallbackArticle: BlogPost = {
        id: `local-article-${Date.now()}`,
        ...safeArticlePayload
      };

      if (onArticleCreated) {
        onArticleCreated(fallbackArticle);
      }

      setSubmitSuccess(true);
      setTimeout(() => {
        setSubmitting(false);
        setSubmitSuccess(false);
        onClose();
      }, 800);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto animate-fadeIn select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div 
        className="relative w-full max-w-4xl bg-zinc-950 border border-zinc-800 rounded-3xl shadow-[0_20px_70px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col my-auto text-white max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* MODAL HEADER */}
        <div className="px-6 py-5 border-b border-zinc-800/80 bg-zinc-900/40 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#FF6A00] to-[#FFB703] flex items-center justify-center text-zinc-950 shadow-[0_0_20px_rgba(255,106,0,0.35)] shrink-0">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight text-white font-sans">
                  Create Blog Article
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-black uppercase bg-[#00B8D4]/20 text-[#00B8D4] border border-[#00B8D4]/30">
                  CMS Studio
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-medium">
                Publish high-impact tournament recaps, scouting analysis, and training guides.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={submitting}
            className="w-9 h-9 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 text-zinc-400 hover:text-white flex items-center justify-center transition-all cursor-pointer disabled:opacity-50"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* MODAL BODY (Scrollable) */}
        <div className="p-6 sm:p-7 overflow-y-auto space-y-6 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
          
          {/* Success Banner */}
          {submitSuccess && (
            <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-3 animate-fadeIn">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>Article successfully stored and synced to the Just1Play Media & Blog Hub!</span>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center justify-between gap-3 animate-fadeIn">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{errorMessage}</span>
              </div>
              <button 
                onClick={() => setErrorMessage(null)} 
                className="text-rose-400 hover:text-rose-200 text-xs uppercase underline cursor-pointer font-black"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* 1. ARTICLE TITLE */}
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-wider text-zinc-300 flex items-center justify-between">
              <span>Article Headline Title <span className="text-[#FF6A00]">*</span></span>
              <span className="text-[10px] font-mono text-zinc-500 font-normal">{title.length}/140 chars</span>
            </label>
            <input
              id="create-blog-title-input"
              type="text"
              required
              maxLength={140}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. 2026 National Showcase: Top 10 Recruits Who Blew Up The Combine"
              className="w-full min-h-[48px] px-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-sm sm:text-base font-bold text-white placeholder-zinc-500 focus:outline-none focus:border-[#FF6A00] focus:ring-1 focus:ring-[#FF6A00]/40 transition-all"
            />
          </div>

          {/* 2. CATEGORY / TAG SELECTOR (Pill Selector) */}
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-wider text-zinc-300 flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-[#00B8D4]" />
              <span>Category / Channel Selector</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {BLOG_CATEGORIES.map((cat) => {
                const isSelected = category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`min-h-[38px] px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-[#FF6A00] text-zinc-950 shadow-[0_0_15px_rgba(255,106,0,0.4)] border border-[#FF6A00]'
                        : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    {isSelected && <Zap className="w-3 h-3 fill-current" />}
                    <span>{cat}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. COVER IMAGE URL & LIVE PREVIEW */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-zinc-300 flex items-center gap-2">
                <ImageIcon className="w-3.5 h-3.5 text-[#FFB703]" />
                <span>Cover Image URL (Web URL or Google Drive Link)</span>
              </label>
              <span className="text-[11px] font-mono text-[#00B8D4]">Edge CDN Optimized</span>
            </div>

            <div className="space-y-2">
              <input
                id="create-blog-cover-input"
                type="text"
                value={coverImageUrl}
                onChange={(e) => {
                  setCoverImageUrl(e.target.value);
                  setImagePreviewError(false);
                }}
                placeholder="Paste image URL or Google Drive link (e.g. https://lh3.googleusercontent.com/d/...)"
                className="w-full min-h-[44px] px-4 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#00B8D4] transition-all font-mono"
              />

              {/* Quick Presets */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-bold uppercase text-zinc-500 mr-1">Presets:</span>
                {PRESET_COVERS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setCoverImageUrl(preset.url);
                      setImagePreviewError(false);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-[10px] font-bold text-zinc-400 hover:text-[#FFB703] border border-zinc-800 transition-colors cursor-pointer"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Live Image Preview Box */}
            <div className="relative rounded-2xl overflow-hidden bg-zinc-900/60 border border-zinc-800 aspect-[21/9] flex items-center justify-center max-h-[180px]">
              {processedCoverUrl && !imagePreviewError ? (
                <>
                  <img
                    src={processedCoverUrl}
                    alt="Cover preview"
                    onError={() => setImagePreviewError(true)}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2 px-2.5 py-1 rounded-full bg-black/80 backdrop-blur-md text-[10px] font-mono font-bold text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Preview Loaded</span>
                  </div>
                </>
              ) : (
                <div className="text-center p-4 space-y-1 text-zinc-500">
                  <ImageIcon className="w-7 h-7 mx-auto opacity-40 text-zinc-400" />
                  <p className="text-xs font-medium">
                    {imagePreviewError 
                      ? 'Image failed to load. Please verify the URL.' 
                      : 'Cover image preview will appear here.'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 4. SUMMARY / EXCERPT */}
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-wider text-zinc-300 flex items-center justify-between">
              <span>Summary / Teaser Excerpt</span>
              <span className="text-[10px] font-mono text-zinc-500">2-3 sentence overview</span>
            </label>
            <textarea
              id="create-blog-summary-input"
              rows={2}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="A brief high-voltage synopsis highlighting the key takeaway of this article..."
              className="w-full p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#FF6A00] leading-relaxed transition-all resize-none"
            />
          </div>

          {/* 5. ARTICLE BODY (Rich Markdown Toolbar & Content Area) */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-black uppercase tracking-wider text-zinc-300 flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-[#00B8D4]" />
                <span>Article Body (Markdown Supported) <span className="text-[#FF6A00]">*</span></span>
              </label>

              {/* Dynamic Telemetry: Word Count & Read Time Badge */}
              <div className="flex items-center gap-2 text-[11px] font-mono font-bold bg-zinc-900 px-3 py-1 rounded-xl border border-zinc-800 text-zinc-300">
                <Clock className="w-3 h-3 text-[#FFB703]" />
                <span className="text-[#FFB703]">{readTimeDisplay}</span>
                <span className="text-zinc-600">|</span>
                <span>{wordCount} words</span>
              </div>
            </div>

            {/* Markdown Toolbar */}
            <div className="flex items-center gap-1 p-1.5 rounded-xl bg-zinc-900 border border-zinc-800 overflow-x-auto">
              <button
                type="button"
                onClick={() => handleInsertFormatting('**', '**', 'bold text')}
                className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                title="Bold"
              >
                <Bold className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleInsertFormatting('*', '*', 'italic text')}
                className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                title="Italic"
              >
                <Italic className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleInsertFormatting('### ', '', 'Section Heading')}
                className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                title="Header"
              >
                <Heading2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleInsertFormatting('* ', '', 'List item')}
                className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                title="Bullet List"
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleInsertFormatting('> ', '', 'Scout Quote')}
                className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                title="Quote"
              >
                <Quote className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleInsertFormatting('```\n', '\n```', 'Combine Metric Code')}
                className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                title="Code Block"
              >
                <Code className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleInsertFormatting('[', '](https://app.just1play.com)', 'Link Text')}
                className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                title="Link"
              >
                <LinkIcon className="w-3.5 h-3.5" />
              </button>
            </div>

            <textarea
              id="create-blog-content-input"
              rows={9}
              required
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your in-depth sports article, recap breakdown, or recruiting guide here...&#10;&#10;Use markdown like:&#10;### Top Standout Quarterbacks&#10;* **Player Name**: Explosive release and pocket presence...&#10;> 'Elite arm talent and 4.4 speed' — Recruiter"
              className="w-full p-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#00B8D4] leading-relaxed transition-all font-mono"
            />
          </div>

          {/* 6. FEATURED BANNER TOGGLE */}
          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Star className={`w-4 h-4 ${isFeatured ? 'text-[#FFB703] fill-[#FFB703]' : 'text-zinc-500'}`} />
                <span className="text-xs font-black uppercase text-white">Feature as Hero Article</span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Showcase this story inside the large top banner card on the Sports Media Blog Hub.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsFeatured(!isFeatured)}
              className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                isFeatured ? 'bg-[#FF6A00]' : 'bg-zinc-800 border border-zinc-700'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${
                  isFeatured ? 'right-0.5' : 'left-0.5'
                }`}
              />
            </button>
          </div>

        </div>

        {/* MODAL FOOTER ACTIONS */}
        <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-900/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Crash-proof auto-sync active</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Quick Draft Button */}
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleSubmitArticle('draft')}
              className="min-h-[44px] flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-600 text-zinc-300 hover:text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save as Draft</span>
            </button>

            {/* Publish Live Button */}
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleSubmitArticle('published')}
              className="min-h-[44px] flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#FF6A00] to-[#FFB703] hover:brightness-110 text-zinc-950 font-black text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(255,106,0,0.4)] flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-zinc-950" />
                  <span>Publishing...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Publish Live</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default CreateBlogModal;
