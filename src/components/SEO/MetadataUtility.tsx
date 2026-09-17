import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export interface MetadataProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'profile' | 'video.other';
  keywords?: string;
  author?: string;
  publishedTime?: string;
}

const DEFAULT_SITE_NAME = 'Just1Play Sports Network';
const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=1200&auto=format&fit=crop&q=80';
const DEFAULT_DESCRIPTION = 'The universal network for youth sports live streaming, recruiting matrix, tournament coverage, and athlete scouting.';

/**
 * Helper to set or update <meta> tags in document.head
 */
function setMetaTag(selectorAttr: string, selectorValue: string, contentValue: string, attrName: 'content' | 'href' = 'content') {
  try {
    let element = document.head.querySelector(`[${selectorAttr}="${selectorValue}"]`);
    if (!element) {
      element = document.createElement(selectorAttr === 'rel' ? 'link' : 'meta');
      if (selectorAttr === 'rel') {
        element.setAttribute('rel', selectorValue);
      } else if (selectorAttr === 'name') {
        element.setAttribute('name', selectorValue);
      } else {
        element.setAttribute('property', selectorValue);
      }
      document.head.appendChild(element);
    }
    element.setAttribute(attrName, contentValue);
  } catch (err) {
    console.warn('[MetadataUtility] Head update warning:', err);
  }
}

/**
 * Map route paths to rich default metadata presets
 */
function getRoutePreset(pathname: string): MetadataProps {
  if (pathname === '/' || pathname === '/hub') {
    return {
      title: 'Just1Play | Youth Sports Live Streaming & Athlete Scouting Matrix',
      description: 'Stream youth sports live, explore verified athlete recruiting profiles, check tournament schedules, and connect with college scouts.',
      image: DEFAULT_IMAGE,
      type: 'website',
      keywords: 'youth sports, athlete recruiting, flag football, live stream sports, scouting matrix, high school recruiting',
    };
  }
  if (pathname.startsWith('/live') || pathname.startsWith('/stream')) {
    return {
      title: 'Just1Play Live Streams | HD Youth Sports Broadcasts',
      description: 'Watch live games, regional tournament championships, and instant camera broadcasts in HD.',
      image: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1200&auto=format&fit=crop&q=80',
      type: 'video.other',
      keywords: 'live sports stream, youth football stream, tournament broadcasts, live scoreboard',
    };
  }
  if (pathname.startsWith('/events') || pathname.startsWith('/event')) {
    return {
      title: 'Events & Tournaments | Just1Play Brackets & Live Check-In',
      description: 'Explore upcoming regional tournaments, view live scoreboards, match brackets, and coach check-in portals.',
      image: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1200&auto=format&fit=crop&q=80',
      type: 'website',
      keywords: 'youth sports tournaments, tournament brackets, basketball showcase, football check-in',
    };
  }
  if (pathname.startsWith('/athletes') || pathname.startsWith('/scout') || pathname.startsWith('/athlete')) {
    return {
      title: 'Recruiter Scouting Matrix | Just1Play Verified Athletes',
      description: 'Filter verified high school & youth athletes by position, graduation class, state, and verified combine metrics.',
      image: 'https://images.unsplash.com/photo-1519766304817-4f37bda74a29?w=1200&auto=format&fit=crop&q=80',
      type: 'website',
      keywords: 'athlete profiles, recruiting matrix, scout database, verified 40-yard dash, college prospect',
    };
  }
  if (pathname.startsWith('/organizations') || pathname.startsWith('/teams')) {
    return {
      title: 'Organizations & Roster Hub | Just1Play Team Manager',
      description: 'Manage sports clubs, team rosters, verified athlete badges, and organization staff records.',
      image: 'https://images.unsplash.com/photo-1526232761682-d26e03ac148e?w=1200&auto=format&fit=crop&q=80',
      type: 'website',
    };
  }
  if (pathname.startsWith('/media') || pathname.startsWith('/video')) {
    return {
      title: 'Media Vault & Video Highlights | Just1Play',
      description: 'Watch highlight clips, reel breakdowns, and full game replays tagged to verified athletes.',
      image: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=1200&auto=format&fit=crop&q=80',
      type: 'video.other',
    };
  }
  if (pathname.startsWith('/blog')) {
    return {
      title: 'Editorial & Scouting Reports | Just1Play Blog',
      description: 'Read tournament recaps, scouting reports, athlete spotlight stories, and recruiting guides.',
      image: 'https://images.unsplash.com/photo-1517649763962-0c6232661a0b?w=1200&auto=format&fit=crop&q=80',
      type: 'article',
    };
  }
  if (pathname.startsWith('/social')) {
    return {
      title: 'Community & Fan Feed | Just1Play Social Network',
      description: 'Engage with athletes, coaches, fan highlights, and live community updates.',
      image: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=1200&auto=format&fit=crop&q=80',
      type: 'website',
    };
  }
  if (pathname.startsWith('/gallery')) {
    return {
      title: 'Event Photo Gallery | Just1Play High-Res Albums',
      description: 'Browse high-resolution event photography and tournament action photo albums.',
      image: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=1200&auto=format&fit=crop&q=80',
      type: 'website',
    };
  }
  if (pathname.startsWith('/drive')) {
    return {
      title: 'Google Drive Sync & Vault | Just1Play',
      description: 'Cloud backup storage and media vault integration for teams and videographers.',
      image: DEFAULT_IMAGE,
      type: 'website',
    };
  }
  if (pathname.startsWith('/profile')) {
    return {
      title: 'My Profile & Verified Stats | Just1Play',
      description: 'Manage your verified athlete profile, bio, academic GPA, and uploaded game highlights.',
      image: DEFAULT_IMAGE,
      type: 'profile',
    };
  }
  if (pathname.startsWith('/advertise')) {
    return {
      title: 'Advertise & Partner | Just1Play Media Network',
      description: 'Reach thousands of youth athletes, parents, coaches, and sports organizations through Just1Play.',
      image: DEFAULT_IMAGE,
      type: 'website',
    };
  }
  if (pathname.startsWith('/admin')) {
    return {
      title: 'Admin Operations Control Center | Just1Play',
      description: 'Platform management portal for event scheduling, user verification, and financial reporting.',
      image: DEFAULT_IMAGE,
      type: 'website',
    };
  }

  return {
    title: 'Just1Play | Youth Sports Network',
    description: DEFAULT_DESCRIPTION,
    image: DEFAULT_IMAGE,
    type: 'website',
  };
}

/**
 * MetadataUtility
 * Dynamically updates page titles, OpenGraph images, and meta tags based on current route or explicit props.
 */
export const MetadataUtility: React.FC<MetadataProps> = ({
  title,
  description,
  image,
  url,
  type,
  keywords,
  author,
  publishedTime,
}) => {
  const location = useLocation();

  useEffect(() => {
    const routePreset = getRoutePreset(location.pathname);

    const activeTitle = title || routePreset.title || 'Just1Play Sports Network';
    const activeDescription = description || routePreset.description || DEFAULT_DESCRIPTION;
    const activeImage = image || routePreset.image || DEFAULT_IMAGE;
    const activeType = type || routePreset.type || 'website';
    const activeUrl = url || `${window.location.origin}${location.pathname}`;
    const activeKeywords = keywords || routePreset.keywords || 'youth sports, athlete recruiting, sports live stream';

    // Update document title
    document.title = activeTitle;

    // Standard HTML Meta Tags
    setMetaTag('name', 'description', activeDescription);
    setMetaTag('name', 'keywords', activeKeywords);
    if (author) setMetaTag('name', 'author', author);

    // OpenGraph Meta Tags
    setMetaTag('property', 'og:site_name', DEFAULT_SITE_NAME);
    setMetaTag('property', 'og:title', activeTitle);
    setMetaTag('property', 'og:description', activeDescription);
    setMetaTag('property', 'og:image', activeImage);
    setMetaTag('property', 'og:url', activeUrl);
    setMetaTag('property', 'og:type', activeType);

    // Twitter Card Meta Tags
    setMetaTag('name', 'twitter:card', 'summary_large_image');
    setMetaTag('name', 'twitter:title', activeTitle);
    setMetaTag('name', 'twitter:description', activeDescription);
    setMetaTag('name', 'twitter:image', activeImage);

    // Article Specifics
    if (publishedTime) {
      setMetaTag('property', 'article:published_time', publishedTime);
    }

    // Canonical Link Tag
    setMetaTag('rel', 'canonical', activeUrl, 'href');

  }, [location.pathname, title, description, image, url, type, keywords, author, publishedTime]);

  return null;
};
