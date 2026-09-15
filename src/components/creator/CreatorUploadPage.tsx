import React, { useState, useEffect } from 'react';
import { useSearchParams, useParams, useNavigate } from 'react-router-dom';
import {
  Upload,
  Layers,
  Camera,
  ArrowLeft,
  Plus,
  Eye,
  ShieldCheck,
  Zap,
  Info,
  DollarSign
} from 'lucide-react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  getDoc
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { useAuthRole, normalizeRole } from '../../hooks/useAuthRole';
import { useToast } from '../../context/ToastContext';
import { BatchUploadDropzone } from './BatchUploadDropzone';
import { PageContainer } from '../Layout/PageContainer';

interface AlbumOption {
  id: string;
  title: string;
  sport: string;
  photoCount: number;
  paypalEmail?: string;
  watermarkText?: string;
  singlePrice?: number;
  bundlePrice?: number;
}

export const CreatorUploadPage: React.FC = () => {
  const { user, profile } = useAuth();
  const { role } = useAuthRole();
  const canonicalRole = normalizeRole(role);
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const userRoleStr = (canonicalRole as string) || (profile?.role as string) || '';
  const isAdmin = ['admin', 'director', 'tournament_director'].includes(userRoleStr) || user?.email === 'kevoiebailey@gmail.com';

  const { albumId: routeAlbumId } = useParams();
  const queryAlbumId = routeAlbumId || searchParams.get('albumId') || '';

  const [albums, setAlbums] = useState<AlbumOption[]>([]);
  const [selectedAlbumId, setSelectedAlbumId] = useState<string>(queryAlbumId);
  const [loadingAlbums, setLoadingAlbums] = useState(true);

  // Subscribe to creator's albums for selection
  useEffect(() => {
    if (!db) {
      setLoadingAlbums(false);
      return;
    }

    const albumsRef = collection(db, 'albums');
    const q = query(albumsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: AlbumOption[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() || {};
          const isCreator = user?.uid && (
            data.creatorId === user.uid ||
            data.authorId === user.uid ||
            data.createdBy === user.uid ||
            data.photographerId === user.uid ||
            data.creatorEmail === user.email
          );

          if (isAdmin || isCreator) {
            list.push({
              id: docSnap.id,
              title: data.title || 'Untitled Album',
              sport: data.sport || 'Sports',
              photoCount: data.photoCount || (Array.isArray(data.mediaUrls) ? data.mediaUrls.length : 0),
              paypalEmail: data.paypalEmail || data.creatorPayPalEmail || '',
              watermarkText: data.watermarkText || 'JUST1PLAY',
              singlePrice: data.singlePrice || data.price || 10.0,
              bundlePrice: data.bundlePrice || data.fullAlbumPrice || 45.0,
            });
          }
        });

        setAlbums(list);
        setLoadingAlbums(false);

        // Auto-select first album if none selected or if query param matched
        if (queryAlbumId && list.some((a) => a.id === queryAlbumId)) {
          setSelectedAlbumId(queryAlbumId);
        } else if (!selectedAlbumId && list.length > 0) {
          setSelectedAlbumId(list[0].id);
          setSearchParams({ albumId: list[0].id });
        }
      },
      (err) => {
        console.warn('Notice loading albums for upload dropzone:', err);
        setLoadingAlbums(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid, user?.email, isAdmin, queryAlbumId]);

  const activeAlbum = albums.find((a) => a.id === selectedAlbumId);

  const handleSelectAlbum = (id: string) => {
    setSelectedAlbumId(id);
    setSearchParams({ albumId: id });
  };

  return (
    <PageContainer>
      <div id="creator-upload-page-root" className="space-y-8 max-w-7xl mx-auto pb-16">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <button
              onClick={() => navigate('/creator/portal')}
              className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-[#00B8D4] transition-colors mb-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Creator Portal
            </button>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-mono flex items-center gap-3">
              <Upload className="w-7 h-7 text-[#00B8D4]" />
              High-Speed Batch Ingest System
            </h1>
            <p className="text-xs sm:text-sm text-slate-300">
              LumaPic direct-to-cloud architecture: in-browser multi-worker WebP derivatives + private master vault storage.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/creator/portal')}
              className="px-4 py-2 rounded-xl bg-[#1E293B] hover:bg-[#2A3B52] text-slate-200 font-mono text-xs uppercase tracking-wider transition-colors border border-[#334155] flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5 text-[#00B8D4]" />
              Create New Album
            </button>

            {activeAlbum && (
              <button
                onClick={() => navigate(`/gallery?albumId=${activeAlbum.id}`)}
                className="px-4 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-mono text-xs uppercase tracking-wider transition-colors border border-emerald-500/30 flex items-center gap-1.5"
              >
                <Eye className="w-3.5 h-3.5" />
                Live Gallery
              </button>
            )}
          </div>
        </div>

        {/* Target Album Selection Bar */}
        <div className="bg-[#141B2D] border border-[#24324F] rounded-2xl p-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-mono uppercase text-[#00B8D4] font-bold">
                Target Event Album:
              </label>
              {loadingAlbums ? (
                <div className="h-10 w-64 bg-[#0B0F19] rounded-xl animate-pulse" />
              ) : albums.length === 0 ? (
                <div className="text-xs font-mono text-amber-400 flex items-center gap-1.5">
                  <Info className="w-4 h-4" />
                  No albums found. Please create an album first in the Creator Portal.
                </div>
              ) : (
                <select
                  value={selectedAlbumId}
                  onChange={(e) => handleSelectAlbum(e.target.value)}
                  className="bg-[#0B0F19] border border-[#24324F] rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-[#00B8D4] min-w-[280px]"
                >
                  {albums.map((album) => (
                    <option key={album.id} value={album.id}>
                      {album.title} ({album.sport}) — {album.photoCount} photos
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Active Album Context Cards */}
            {activeAlbum && (
              <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
                <div className="p-2.5 rounded-xl bg-[#0B0F19] border border-[#1E293B]">
                  <span className="text-slate-400 block text-[10px] uppercase">Single Download</span>
                  <span className="font-bold text-emerald-400">${activeAlbum.singlePrice?.toFixed(2)}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#0B0F19] border border-[#1E293B]">
                  <span className="text-slate-400 block text-[10px] uppercase">Full Album Pass</span>
                  <span className="font-bold text-[#00B8D4]">${activeAlbum.bundlePrice?.toFixed(2)}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#0B0F19] border border-[#1E293B]">
                  <span className="text-slate-400 block text-[10px] uppercase">Watermark Preset</span>
                  <span className="font-bold text-slate-200">{activeAlbum.watermarkText || 'JUST1PLAY'}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Dropzone Component */}
        {activeAlbum ? (
          <BatchUploadDropzone
            albumId={activeAlbum.id}
            albumTitle={activeAlbum.title}
            creatorPayPalEmail={activeAlbum.paypalEmail}
            watermarkText={activeAlbum.watermarkText || 'JUST1PLAY'}
            onUploadSuccess={(count) => {
              showToast('success', 'Batch Ingest Complete', `Successfully uploaded ${count} photos directly to ${activeAlbum.title}.`);
            }}
            onViewGallery={() => {
              navigate(`/gallery?albumId=${activeAlbum.id}`);
            }}
          />
        ) : (
          <div className="bg-[#141B2D]/50 border border-[#24324F] rounded-2xl p-12 text-center space-y-4">
            <Camera className="w-12 h-12 text-slate-500 mx-auto" />
            <h3 className="text-lg font-bold text-white font-mono">
              Select or Create an Album to Begin Batch Ingest
            </h3>
            <button
              onClick={() => navigate('/creator/portal')}
              className="px-5 py-2.5 rounded-xl bg-[#00B8D4] hover:bg-[#00D4EE] text-black font-bold font-mono text-xs uppercase tracking-wider transition-colors inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Go to Creator Portal
            </button>
          </div>
        )}
      </div>
    </PageContainer>
  );
};

export default CreatorUploadPage;
