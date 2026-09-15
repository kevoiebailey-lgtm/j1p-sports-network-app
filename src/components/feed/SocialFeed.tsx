import React, { useState, useEffect } from 'react';
import { LockerRoomView } from '../LockerRoom/LockerRoomView';
import { PostComposerSheet } from './PostComposerSheet';
import { Plus } from 'lucide-react';
import { triggerHaptic } from '../../lib/haptics';

export interface SocialFeedProps {
  initialSport?: string;
  className?: string;
}

/**
 * SocialFeed ("The Wall" / Locker Room Social Feed)
 * Features full real-time community highlights, scouting reels,
 * safe bottom clearance (pb-36) for the mobile floating dock,
 * and integrated one-thumb quick post trigger.
 */
export const SocialFeed: React.FC<SocialFeedProps> = (props) => {
  const [composerOpen, setComposerOpen] = useState(false);

  useEffect(() => {
    const handleOpenQuickPost = () => setComposerOpen(true);
    window.addEventListener('app:open-quick-post', handleOpenQuickPost);
    return () => window.removeEventListener('app:open-quick-post', handleOpenQuickPost);
  }, []);

  return (
    <div className={`relative w-full ${props.className || ''}`}>
      {/* Primary Locker Room Dual-Feed Wall */}
      <LockerRoomView />

      {/* Global Quick Post Sheet Trigger */}
      <PostComposerSheet
        isOpen={composerOpen}
        onClose={() => setComposerOpen(false)}
        onSuccess={() => setComposerOpen(false)}
        initialSport={props.initialSport || '🏀 Basketball'}
      />
    </div>
  );
};

export default SocialFeed;
