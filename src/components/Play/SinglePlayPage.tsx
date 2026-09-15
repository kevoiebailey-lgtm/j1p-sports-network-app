import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, collection, query, limit, getDocs } from 'firebase/firestore';
import { 
  ArrowLeft, 
  Play, 
  Sparkles, 
  Flame, 
  User, 
  Calendar, 
  Tag, 
  ExternalLink,
  ShieldCheck,
  Film,
  AlertCircle,
  Sliders,
  Edit3
} from 'lucide-react';
import { db } from '../../lib/firebase';
import { ShareButton } from '../ShareButton';
import { UniversalVideoPlayer } from '../Common/UniversalVideoPlayer';
import { PlaybookLab } from '../PlaybookLab';
import { MetadataUtility } from '../SEO/MetadataUtility';
import { PageContainer } from '../Layout/PageContainer';

export interface PlayItem {
  id: string;
  title?: string;
  description?: string;
  videoUrl?: string;
  mediaUrl?: string;
  thumbnailUrl?: string;
  athleteName?: string;
  athleteId?: string;
  authorName?: string;
  authorId?: string;
  authorAvatar?: string;
  sport?: string;
  sportName?: string;
  category?: string;
  viewsCount?: number;
  likesCount?: number;
  players?: any[];
  isInteractive?: boolean;
  type?: string;
  createdAt?: any;
}

export const SinglePlayPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [play, setPlay] = useState<PlayItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [relatedPlays, setRelatedPlays] = useState<PlayItem[]>([]);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    const fetchPlay = async () => {
      setLoading(true);
      try {
        if (!db) {
          setLoading(false);
          return;
        }

        // 1. Try 'plays' collection first
        let foundDoc = await getDoc(doc(db, 'plays', id));
        let playData: PlayItem | null = null;

        if (foundDoc.exists()) {
          const d = foundDoc.data();
          playData = {
            id: foundDoc.id,
            title: d.title || d.name || 'Highlight Play',
            description: d.description || d.caption || '',
            videoUrl: d.videoUrl || d.mediaUrl || d.url || '',
            mediaUrl: d.mediaUrl || d.videoUrl || '',
            thumbnailUrl: d.thumbnailUrl || d.coverUrl || '',
            athleteName: d.athleteName || d.authorName || 'Athlete',
            athleteId: d.athleteId || d.authorId || d.userId || '',
            authorAvatar: d.authorAvatar || d.avatarUrl,
            sport: d.sport || 'Sports',
            sportName: d.sportName || d.sport || 'Sports',
            category: d.category || 'Film',
            viewsCount: d.viewsCount || 0,
            likesCount: d.likesCount || (Array.isArray(d.likes) ? d.likes.length : 0),
            players: Array.isArray(d.players) ? d.players : undefined,
            isInteractive: d.isInteractive || (Array.isArray(d.players) && d.players.length > 0),
            type: d.type || (Array.isArray(d.players) ? 'tactical_playbook' : 'video'),
            createdAt: d.createdAt
          };
        } else {
          // 2. Try fallback 'posts' collection
          const postDoc = await getDoc(doc(db, 'posts', id));
          if (postDoc.exists()) {
            const d = postDoc.data();
            playData = {
              id: postDoc.id,
              title: d.title || (d.content ? d.content.slice(0, 50) + '...' : 'Locker Room Play'),
              description: d.content || d.caption || '',
              videoUrl: d.videoUrl || d.mediaUrl || '',
              mediaUrl: d.mediaUrl || d.videoUrl || '',
              thumbnailUrl: d.imageUrl || d.thumbnailUrl || '',
              athleteName: d.authorName || 'Athlete Member',
              athleteId: d.authorId || '',
              authorAvatar: d.authorAvatar || d.avatarUrl,
              sport: d.sport || 'Sports',
              category: 'Locker Room',
              viewsCount: d.viewsCount || 0,
              likesCount: Array.isArray(d.likes) ? d.likes.length : 0,
              createdAt: d.createdAt
            };
          } else {
            // 3. Try fallback 'videos' collection
            const videoDoc = await getDoc(doc(db, 'videos', id));
            if (videoDoc.exists()) {
              const d = videoDoc.data();
              playData = {
                id: videoDoc.id,
                title: d.title || 'Game Film',
                description: d.description || '',
                videoUrl: d.videoUrl || d.url || d.mediaUrl || '',
                mediaUrl: d.mediaUrl || d.videoUrl || '',
                thumbnailUrl: d.thumbnailUrl || '',
                athleteName: d.athleteName || d.uploaderName || 'Featured Athlete',
                athleteId: d.athleteId || d.uploaderId || '',
                sport: d.sport || 'Sports',
                category: 'Game Reel',
                createdAt: d.createdAt
              };
            }
          }
        }

        setPlay(playData);

        // Fetch a couple related plays from 'plays' or 'posts'
        if (db) {
          const playsQuery = query(collection(db, 'plays'), limit(4));
          const playsSnap = await getDocs(playsQuery).catch(() => null);
          if (playsSnap && !playsSnap.empty) {
            const list = playsSnap.docs
              .filter(d => d.id !== id)
              .map(d => ({ id: d.id, ...d.data() } as PlayItem));
            setRelatedPlays(list);
          }
        }
      } catch (err) {
        console.error('Error fetching play highlight:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPlay();
  }, [id]);

  if (loading) {
    return (
      <main className="min-h-screen bg-neutral-950 text-neutral-100 py-12 px-4 sm:px-6 lg:px-8 flex justify-center items-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-mono text-neutral-400">Loading highlight play...</p>
        </div>
      </main>
    );
  }

  if (!play) {
    return (
      <main className="min-h-screen bg-neutral-950 text-neutral-100 py-12 px-4 sm:px-6 lg:px-8 flex justify-center items-center">
        <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-3xl p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-neutral-800 flex items-center justify-center mx-auto text-amber-400">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white">Play Not Found</h2>
          <p className="text-sm text-neutral-400">
            The requested highlight or game play could not be located on Just One Play.
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold cursor-pointer transition-all"
            >
              Go Back
            </button>
            <Link
              to="/locker-room"
              className="px-4 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-neutral-950 text-xs font-bold transition-all"
            >
              Explore Locker Room
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const effectiveVideoUrl = play.videoUrl || play.mediaUrl || '';
  const athleteIdentifier = play.athleteId;

  const playTitle = `${play.title || 'Highlight Play'} | Just1Play Highlights`;
  const playDesc = play.description || `Watch ${play.athleteName || 'Athlete'}'s highlight reel and tactical breakdown on Just1Play Sports Network.`;
  const playThumbnail = play.thumbnailUrl || 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=1200&auto=format&fit=crop&q=80';

  return (
    <PageContainer maxWidth="max-w-4xl">
      <MetadataUtility
        title={playTitle}
        description={playDesc}
        image={playThumbnail}
        type="video.other"
        keywords={`${play.title}, ${play.athleteName}, ${play.sport}, sports highlight, game tape, youth sports`}
      />
      <div className="w-full space-y-6">
        
        {/* Navigation & Breadcrumb */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 text-xs font-semibold transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-emerald-400" />
            <span>Back</span>
          </button>

          {play.sport && (
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold uppercase tracking-wider">
              {play.sport}
            </span>
          )}
        </div>

        {/* Play Content (Interactive Playbook Lab OR Universal Video Player) */}
        {play.isInteractive && play.players && play.players.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-neutral-900/60 border border-neutral-800 rounded-2xl px-4 py-2.5">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-mono font-bold uppercase text-emerald-400">Interactive Tactical Playbook</span>
              </div>
              <Link
                to={`/playbook?playId=${play.id}`}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold border border-neutral-700 transition-all"
              >
                <Edit3 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Customize in Lab</span>
              </Link>
            </div>

            <PlaybookLab
              initialPlayId={play.id}
              readOnly={false}
            />
          </div>
        ) : (
          <div className="bg-neutral-900/70 border border-neutral-800 rounded-3xl p-4 sm:p-6 backdrop-blur-xl shadow-2xl space-y-4">
            <div className="w-full rounded-2xl overflow-hidden bg-neutral-950 border border-neutral-800">
              {effectiveVideoUrl ? (
                <UniversalVideoPlayer
                  videoUrl={effectiveVideoUrl}
                  title={play.title || 'Play Highlight'}
                  className="w-full"
                  playOnViewport={true}
                />
              ) : (
                <div className="aspect-video w-full flex flex-col items-center justify-center text-neutral-400 text-sm gap-2">
                  <Film className="w-8 h-8 text-neutral-600" />
                  <span>Video is currently processing or unavailable.</span>
                </div>
              )}
            </div>

            {/* Details & Share Header */}
            <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2">
              <div className="space-y-1">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  {play.title || 'Highlight Play'}
                </h1>
                {play.athleteName && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-neutral-400">Athlete:</span>
                    {athleteIdentifier ? (
                      <Link
                        to={`/profile/${athleteIdentifier}`}
                        className="text-emerald-400 hover:text-emerald-300 font-semibold text-sm hover:underline flex items-center gap-1"
                      >
                        {play.authorAvatar && (
                          <img
                            src={play.authorAvatar}
                            alt={play.athleteName}
                            className="w-5 h-5 rounded-full object-cover"
                          />
                        )}
                        <span>{play.athleteName}</span>
                      </Link>
                    ) : (
                      <span className="text-emerald-400 font-semibold text-sm">
                        {play.athleteName}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <ShareButton
                path={`play/${play.id}`}
                title={`${play.title || 'Highlight'} | Just One Play`}
                text={`Watch ${play.title || 'this game play'} by ${play.athleteName || 'this athlete'} on Just One Play!`}
              />
            </div>

            {play.description && (
              <div className="text-neutral-300 text-sm leading-relaxed border-t border-neutral-800/80 pt-4 whitespace-pre-line">
                {play.description}
              </div>
            )}
          </div>
        )}

        {/* Related Plays or Action Bar */}
        {relatedPlays.length > 0 && (
          <div className="bg-neutral-900/50 border border-neutral-800 rounded-3xl p-6 backdrop-blur-md space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>More Highlights & Plays</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {relatedPlays.map((item) => (
                <Link
                  key={item.id}
                  to={`/play/${item.id}`}
                  className="group p-3 rounded-2xl bg-neutral-950 border border-neutral-800 hover:border-emerald-400/40 transition-all block"
                >
                  <div className="aspect-video bg-neutral-900 rounded-xl overflow-hidden relative flex items-center justify-center">
                    {item.thumbnailUrl ? (
                      <img
                        src={item.thumbnailUrl}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <Play className="w-6 h-6 text-neutral-600 group-hover:text-emerald-400 transition-colors" />
                    )}
                  </div>
                  <h4 className="text-xs font-bold text-white mt-2 truncate group-hover:text-emerald-400 transition-colors">
                    {item.title || 'Highlight Play'}
                  </h4>
                  <p className="text-[11px] text-neutral-400 truncate mt-0.5">
                    {item.athleteName || 'Athlete'}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}

      </div>
    </PageContainer>
  );
};

export default SinglePlayPage;
