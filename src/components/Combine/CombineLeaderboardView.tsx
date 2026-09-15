import React from 'react';
import { LaserCombineLeaderboard } from '../matrix/LaserCombineLeaderboard';

export const CombineLeaderboardView: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#090D16] text-white pb-24 space-y-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        <LaserCombineLeaderboard showHeroBanner={true} />
      </div>
    </div>
  );
};

export default CombineLeaderboardView;
