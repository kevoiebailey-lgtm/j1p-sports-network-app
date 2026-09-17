import React from 'react';
import { SocialFeed, SocialFeedProps } from './SocialFeed';

export interface FeedProps extends SocialFeedProps {
  className?: string;
}

/**
 * Feed ("The Wall" / Social Feed)
 * Features safe bottom clearance (pb-40) for mobile floating dock.
 */
export const Feed: React.FC<FeedProps> = ({ className = '', ...rest }) => {
  return (
    <div className={`feed-wrapper pb-40 md:pb-24 ${className}`}>
      <SocialFeed {...rest} />
    </div>
  );
};

export default Feed;
