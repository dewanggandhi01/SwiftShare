/**
 * tmdbImage.js
 * Utility to safely generate correct TMDB image URLs.
 */

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/';

export const getPosterUrl = (path, size = 'w500') => {
  if (!path) return null;
  // Ensure path doesn't start with double slash or miss slash
  const safePath = path.startsWith('/') ? path : `/${path}`;
  return `${TMDB_IMAGE_BASE}${size}${safePath}`;
};

export const getBackdropUrl = (path, size = 'w1280') => {
  if (!path) return null;
  const safePath = path.startsWith('/') ? path : `/${path}`;
  return `${TMDB_IMAGE_BASE}${size}${safePath}`;
};
