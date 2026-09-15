import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { siteAnalyticsService } from '../../services/siteAnalyticsService';

export const SiteTrafficTracker: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();
  const lastTrackedPath = useRef<string>('');

  useEffect(() => {
    if (location.pathname && location.pathname !== lastTrackedPath.current) {
      lastTrackedPath.current = location.pathname;
      siteAnalyticsService.recordPageView(location.pathname, user?.uid);
    }
  }, [location.pathname, user?.uid]);

  return null;
};
