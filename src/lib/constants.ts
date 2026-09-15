export const DEFAULT_THUMBNAIL_URL = '/default-thumbnail.svg';

export const getDefaultThumbnail = (url?: string | null): string => {
  if (!url || url.trim() === '') return DEFAULT_THUMBNAIL_URL;
  return url;
};
