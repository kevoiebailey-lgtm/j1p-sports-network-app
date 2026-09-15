import React from 'react';
import { SocialFeed, SocialFeedProps } from './SocialFeed';

export interface TheWallProps extends SocialFeedProps {
  className?: string;
}

/**
 * TheWall ("Locker Room Social Feed")
 * Primary social stream with safe bottom clearance (pb-40) for mobile dock.
 */
export const TheWall: React.FC<TheWallProps> = ({ className = '', ...rest }) => {
  return (
    <div className={`the-wall-wrapper pb-40 md:pb-24 ${className}`}>
      <SocialFeed {...rest} />
    </div>
  );
};

export default TheWall;
