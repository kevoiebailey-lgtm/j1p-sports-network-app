import React from 'react';
import { LiveScoresTicker } from '../LiveScoresTicker';
import { LeagueFilter } from '../../lib/sportsApi';

export interface SportsTickerProps {
  initialLeague?: LeagueFilter;
  className?: string;
  showTitle?: boolean;
}

export const SportsTicker: React.FC<SportsTickerProps> = (props) => {
  return <LiveScoresTicker {...props} />;
};

export default SportsTicker;
export { LiveScoresTicker };
