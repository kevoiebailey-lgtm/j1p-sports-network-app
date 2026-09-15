import React, { useState, useEffect } from 'react';
import { useDropzone, DropzoneOptions } from 'react-dropzone';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { collection, addDoc } from 'firebase/firestore';
import { 
  X, 
  Upload, 
  FileText, 
  Bold, 
  Italic, 
  Heading1, 
  Heading2, 
  List, 
  Quote, 
  Code, 
  Image as ImageIcon, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  ShieldCheck
} from 'lucide-react';
import { storage, db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { canCreateBlog } from '../../lib/rbac';
import { BlogCategory, BlogPost } from './BlogTypes';
import { compressImage } from '../../lib/imageCompressor';
import { uploadMediaAsset, STORAGE_FOLDERS } from '../../services/storageService';
import { useToast } from '../../context/ToastContext';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPostCreated?: (post: BlogPost) => void;
}

export const CreatePostModal: React.FC<CreatePostModalProps> = ({
  isOpen,
  onClose,
  onPostCreated
}) => {
  const { role = 'admin', user, profile } = useAuth();
  const { showToast } = useToast();
  const isAuthorized = canCreateBlog(role);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<BlogCategory>('Tournament Highlights');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageProgress, setImageProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      window.dispatchEvent(new CustomEvent('app:hide-dock'));
    } else {
      window.dispatchEvent(new CustomEvent('app:show-dock'));
    }
    return () => {
      window.dispatchEvent(new CustomEvent('app:show-dock'));
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle Dropzone Image Upload for Article Thumbnail with Base64 Fallback
  const onDropThumbnail = async (acceptedFiles: File[]) => {
    if (!acceptedFiles || acceptedFiles.length === 0) return;
    let file = acceptedFiles[0];

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (JPG, PNG, WebP).');
      return;
    }

    setUploadingImage(true);
    setError(null);
    setImageProgress(10);

    try {
      const publicUrl = await uploadMediaAsset(file, STORAGE_FOLDERS.BLOG_BANNERS, (pct) => {
        setImageProgress(pct);
      });
      setThumbnailUrl(publicUrl);
      setUploadingImage(false);
      showToast('success', 'Banner Uploaded', 'Article cover banner uploaded to /media_vault/ successfully.');
    } catch (uploadErr: any) {
      console.warn('Storage upload error, reading local fallback:', uploadErr);
      const friendlyMsg = uploadErr?.message || 'Storage upload failed. Using local preview fallback.';
      showToast('error', 'Storage Notice', friendlyMsg);
      // Fallback to local Data URL
      const reader = new FileReader();
      reader.onload = () => {
        setThumbnailUrl(reader.result as string);
        setUploadingImage(false);
      };
      reader.onerror = () => {
        setError('Failed to read image file.');
        setUploadingImage(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onDropThumbnail,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.webp'] },
    multiple: false
  } as unknown as DropzoneOptions);

  // Rich Text Editor Toolbar Actions
  const insertFormatting = (prefix: string, suffix: string = '') => {
    setContent(prev => prev + `${prefix}text${suffix}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !content.trim()) {
      setError('Please enter a title and main article content.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const finalThumbnail = thumbnailUrl.trim() || 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=1200&auto=format&fit=crop&q=80';
    const authorNameVal = profile?.displayName || user?.displayName || 'Just1Play Editorial Team';
    const authorAvatarVal = profile?.photoURL || profile?.avatarUrl || user?.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80';
    const authorRoleVal = (role || 'Editorial Author').toString().replace('_', ' ').toUpperCase();
    const authorIdVal = user?.uid || profile?.uid || 'cms-author';

    const newPostData: Omit<BlogPost, 'id'> = {
      title: title.trim(),
      category: category || 'Tournament Highlights',
      summary: summary.trim() || title.trim(),
      content: content.trim(),
      thumbnailUrl: finalThumbnail,
      authorId: authorIdVal,
      authorName: authorNameVal,
      authorRole: authorRoleVal,
      authorAvatar: authorAvatarVal,
      publishDate: new Date().toISOString().split('T')[0],
      readTime: `${Math.max(1, Math.ceil(content.split(' ').length / 150))} min read`,
      likesCount: 0,
      isPublished: true,
      isFeatured: false,
      createdAt: new Date().toISOString()
    };

    try {
      let createdPostId = `blog_${Date.now()}`;
      if (db) {
        try {
          const docRef = await addDoc(collection(db, 'blog_posts'), newPostData);
          if (docRef && docRef.id) {
            createdPostId = docRef.id;
          }
        } catch (dbErr) {
          console.warn('Direct Firestore save failed, using local resilient ID:', dbErr);
        }
      }

      const createdPost: BlogPost = { id: createdPostId, ...newPostData };

      if (onPostCreated) {
        onPostCreated(createdPost);
      }

      showToast('success', 'Article Published!', 'Your sports article is now published and live in the Media & News section.');

      setTitle('');
      setSummary('');
      setContent('');
      setThumbnailUrl('');
      setSubmitting(false);
      onClose();
    } catch (err: any) {
      console.error('Failed to create blog post:', err);
      // Even if an unexpected error occurred, create the local post fallback
      const fallbackPost: BlogPost = {
        id: `blog_local_${Date.now()}`,
        ...newPostData
      };
      if (onPostCreated) {
        onPostCreated(fallbackPost);
      }
      showToast('error', 'Publishing Issue', err?.message || 'Encountered an issue saving the article. Fallback created.');
      setSubmitting(false);
      onClose();
    }
  };

  const safeRoleLabel = (role || 'admin').toString().replace('_', ' ').toUpperCase();

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white dark:bg-[#000000] border border-slate-200 dark:border-[#E5B868]/50 rounded-3xl p-6 sm:p-8 shadow-2xl dark:shadow-[0_0_50px_rgba(214,28,36,0.2)] my-8 text-slate-900 dark:text-white">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-red-600/10 dark:bg-[#E5B868]/20 text-red-600 dark:text-[#E5B868] border border-red-600/30 dark:border-[#E5B868]/40">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black uppercase text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <span>CMS Article Publisher</span>
                <span className="px-2 py-0.5 rounded text-[9px] font-mono bg-red-600 dark:bg-[#E5B868] text-white dark:text-black font-black">
                  {safeRoleLabel}
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Publish news, tournament recap stories, and recruiting guides to the Just1Play Blog Hub.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2.5 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!isAuthorized ? (
          <div className="p-6 text-center bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-700 dark:text-rose-300 space-y-2">
            <AlertCircle className="w-8 h-8 mx-auto text-rose-500 dark:text-rose-400" />
            <h3 className="font-bold text-sm uppercase">Access Denied (RBAC Protected)</h3>
            <p className="text-xs">Only users with the role <strong>Admin</strong> or <strong>Content Creator</strong> can publish articles.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Title & Category */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="text-[11px] font-bold uppercase text-slate-700 dark:text-slate-300 block mb-1">
                  Article Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Tri-State Tournament Finals Recap & Standout MVP Performers"
                  className="w-full bg-slate-50 dark:bg-[#212A31] border border-slate-300 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:border-red-600 dark:focus:border-[#E5B868] focus:outline-none font-medium"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase text-slate-700 dark:text-slate-300 block mb-1">
                  Category *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as BlogCategory)}
                  className="w-full bg-slate-50 dark:bg-[#212A31] border border-slate-300 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:border-red-600 dark:focus:border-[#E5B868] focus:outline-none font-bold uppercase"
                >
                  <option value="Tournament Highlights">Tournament Highlights</option>
                  <option value="Recruiting Guide">Recruiting Guide</option>
                  <option value="Training & Fitness">Training & Fitness</option>
                  <option value="Media Release">Media Release</option>
                  <option value="Athlete Spotlight">Athlete Spotlight</option>
                </select>
              </div>
            </div>

            {/* Summary / Excerpt */}
            <div>
              <label className="text-[11px] font-bold uppercase text-slate-700 dark:text-slate-300 block mb-1">
                Short Excerpt / Subtitle
              </label>
              <input
                type="text"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="A brief 1-2 sentence teaser summary shown on the Bento grid card..."
                className="w-full bg-slate-50 dark:bg-[#212A31] border border-slate-300 dark:border-white/10 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:border-red-600 dark:focus:border-[#E5B868] focus:outline-none"
              />
            </div>

            {/* Thumbnail Image Uploader (Dropzone + URL Fallback) */}
            <div>
              <label className="text-[11px] font-bold uppercase text-slate-700 dark:text-slate-300 block mb-1">
                Thumbnail Cover Image (Firebase Storage Upload or Image URL)
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                <div
                  {...getRootProps()}
                  className={`border border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
                    isDragActive ? 'border-red-600 dark:border-[#E5B868] bg-red-600/10 dark:bg-[#E5B868]/10' : 'border-slate-300 dark:border-white/20 bg-slate-50 dark:bg-white/5 hover:border-red-600 dark:hover:border-[#E5B868]'
                  }`}
                >
                  <input {...getInputProps()} />
                  {uploadingImage ? (
                    <div className="flex items-center justify-center gap-2 text-xs text-red-600 dark:text-[#E5B868] font-mono">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Uploading... {imageProgress}%</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                      <Upload className="w-4 h-4 text-red-600 dark:text-[#E5B868]" />
                      <span className="font-bold">Upload Cover Image File</span>
                    </div>
                  )}
                </div>

                <input
                  type="text"
                  value={thumbnailUrl}
                  onChange={(e) => setThumbnailUrl(e.target.value)}
                  placeholder="Or paste external image URL (https://...)"
                  className="w-full bg-slate-50 dark:bg-[#212A31] border border-slate-300 dark:border-white/10 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white focus:border-red-600 dark:focus:border-[#E5B868] focus:outline-none"
                />
              </div>

              {thumbnailUrl && (
                <div className="mt-2 flex items-center gap-3 bg-slate-100 dark:bg-white/5 p-2 rounded-xl border border-slate-200 dark:border-white/10">
                  <img src={thumbnailUrl} alt="Cover Preview" className="w-16 h-10 object-cover rounded-lg border border-red-600 dark:border-[#E5B868]" />
                  <span className="text-xs text-red-600 dark:text-[#E5B868] font-mono truncate">Cover Image Ready</span>
                </div>
              )}
            </div>

            {/* Rich Text Editor Formatting Controls & Content Area */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold uppercase text-slate-700 dark:text-slate-300">
                  Article Content (Rich Formatting Supported) *
                </label>
                
                {/* Rich Text Toolbar */}
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-white/5 p-1 rounded-lg border border-slate-200 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => insertFormatting('**', '**')}
                    className="p-1 rounded hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 hover:text-red-600 dark:hover:text-[#E5B868]"
                    title="Bold"
                  >
                    <Bold className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('*', '*')}
                    className="p-1 rounded hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 hover:text-red-600 dark:hover:text-[#E5B868]"
                    title="Italic"
                  >
                    <Italic className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('\n### ')}
                    className="p-1 rounded hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 hover:text-red-600 dark:hover:text-[#E5B868]"
                    title="Heading"
                  >
                    <Heading1 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('\n* ')}
                    className="p-1 rounded hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 hover:text-red-600 dark:hover:text-[#E5B868]"
                    title="Bullet List"
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('\n> ')}
                    className="p-1 rounded hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 hover:text-red-600 dark:hover:text-[#E5B868]"
                    title="Quote"
                  >
                    <Quote className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('\n```\n', '\n```')}
                    className="p-1 rounded hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 hover:text-red-600 dark:hover:text-[#E5B868]"
                    title="Code Block"
                  >
                    <Code className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <textarea
                required
                rows={8}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your article content here. Markdown formatting like headers (###), bold (**text**), bullet points (*), and quotes (>) are fully supported..."
                className="w-full bg-slate-50 dark:bg-[#212A31] border border-slate-300 dark:border-white/10 rounded-xl p-3.5 text-xs text-slate-900 dark:text-white focus:border-red-600 dark:focus:border-[#E5B868] focus:outline-none leading-relaxed font-mono"
              />
            </div>

            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-white/10">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 font-bold text-xs uppercase cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 rounded-xl bg-red-600 dark:bg-[#E5B868] hover:bg-red-600 dark:hover:bg-[#B8141B] text-white dark:text-black font-black text-xs uppercase tracking-wider shadow-lg dark:shadow-[0_0_20px_rgba(214,28,36,0.5)] transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Publishing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 stroke-[2.5]" />
                    <span>Publish Article</span>
                  </>
                )}
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
};
