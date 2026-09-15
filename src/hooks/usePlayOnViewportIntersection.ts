import { useState, useEffect, useRef, useCallback, RefObject } from 'react';

export interface ViewportIntersectionOptions {
  /**
   * Intersection threshold (0 to 1) required to trigger autoplay.
   * Default: 0.4 (40% visible)
   */
  threshold?: number | number[];
  /**
   * Root margin around root bounding box.
   * Default: '0px'
   */
  rootMargin?: string;
  /**
   * Whether intersection monitoring is enabled.
   * Default: true
   */
  enabled?: boolean;
  /**
   * Automatically ensure video is muted to comply with browser autoplay policies.
   * Default: true
   */
  autoMute?: boolean;
  /**
   * Automatically pause playback when element exits the viewport.
   * Default: true
   */
  pauseOnExit?: boolean;
  /**
   * Optional custom container or video ref.
   */
  targetRef?: RefObject<HTMLElement | null>;
}

export interface ViewportIntersectionResult {
  containerRef: RefObject<HTMLDivElement | null>;
  videoRef: RefObject<HTMLVideoElement | null>;
  isIntersecting: boolean;
  isPlaying: boolean;
  isMuted: boolean;
  play: () => Promise<void>;
  pause: () => void;
  togglePlay: () => void;
  toggleMute: () => void;
}

/**
 * PlayOnViewportIntersection Hook
 *
 * Automatically monitors element visibility in viewport via IntersectionObserver
 * and triggers HTML5 <video> or embed players to play (muted) when entering viewport,
 * and pauses when leaving viewport.
 */
export function usePlayOnViewportIntersection(
  options: ViewportIntersectionOptions = {}
): ViewportIntersectionResult {
  const {
    threshold = 0.4,
    rootMargin = '0px 0px 0px 0px',
    enabled = true,
    autoMute = true,
    pauseOnExit = true,
    targetRef
  } = options;

  const internalContainerRef = useRef<HTMLDivElement | null>(null);
  const containerRef = (targetRef as RefObject<HTMLDivElement | null>) || internalContainerRef;
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [isIntersecting, setIsIntersecting] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(autoMute);

  // Play video with audio policy safety
  const play = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      if (autoMute) {
        video.muted = true;
        setIsMuted(true);
      }
      video.playsInline = true;
      await video.play();
      setIsPlaying(true);
    } catch (err) {
      // Browser may reject non-muted autoplay, retry with muted
      if (video && !video.muted) {
        try {
          video.muted = true;
          setIsMuted(true);
          await video.play();
          setIsPlaying(true);
        } catch {
          setIsPlaying(false);
        }
      } else {
        setIsPlaying(false);
      }
    }
  }, [autoMute]);

  // Pause video
  const pause = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    try {
      video.pause();
      setIsPlaying(false);
    } catch (err) {
      console.warn('Error pausing video on viewport exit:', err);
    }
  }, []);

  // Toggle play/pause
  const togglePlay = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, pause, play]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const nextMuted = !video.muted;
    video.muted = nextMuted;
    setIsMuted(nextMuted);
  }, []);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      return;
    }

    const element = containerRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;

        const isVisible = entry.isIntersecting;
        setIsIntersecting(isVisible);

        if (isVisible) {
          play();
        } else if (pauseOnExit) {
          pause();
        }
      },
      {
        threshold,
        rootMargin
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [enabled, threshold, rootMargin, pauseOnExit, containerRef, play, pause]);

  // Track manual play/pause events on video element
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onVolumeChange = () => setIsMuted(video.muted);

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('volumechange', onVolumeChange);

    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('volumechange', onVolumeChange);
    };
  }, [videoRef.current]);

  return {
    containerRef,
    videoRef,
    isIntersecting,
    isPlaying,
    isMuted,
    play,
    pause,
    togglePlay,
    toggleMute
  };
}

/**
 * Named alias for usePlayOnViewportIntersection matching requested casing
 */
export const PlayOnViewportIntersection = usePlayOnViewportIntersection;

export default usePlayOnViewportIntersection;
