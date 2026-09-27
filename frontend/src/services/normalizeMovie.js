import { getPosterUrl, getBackdropUrl } from './tmdbImage';

// Map TMDB genre IDs to strings
const GENRE_MAP = {
  28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy", 
  80: "Crime", 99: "Documentary", 18: "Drama", 10751: "Family", 
  14: "Fantasy", 36: "History", 27: "Horror", 10402: "Music", 
  9648: "Mystery", 10749: "Romance", 878: "Sci-Fi", 10770: "TV Movie", 
  53: "Thriller", 10752: "War", 37: "Western"
};

const getIndustry = (movie) => {
  const lang = movie.original_language?.toLowerCase();
  
  // Use production countries if available (from detail endpoint)
  const isIndian = movie.production_countries?.some(c => c.iso_3166_1 === 'IN') 
    || ['hi', 'te', 'ta', 'ml', 'kn', 'mr', 'bn'].includes(lang);

  if (isIndian) {
    if (lang === 'hi') return 'Bollywood';
    if (lang === 'te') return 'Tollywood';
    if (lang === 'ta') return 'Kollywood';
    if (lang === 'ml') return 'Mollywood';
    return 'Indian';
  }

  // Western / English
  if (lang === 'en') return 'Hollywood';
  
  if (lang === 'ko') return 'Korean';
  if (lang === 'ja') return 'Anime/Japanese';
  
  return 'International';
};

const getLanguageName = (code) => {
  const map = {
    'en': 'English', 'hi': 'Hindi', 'te': 'Telugu', 'ta': 'Tamil',
    'ml': 'Malayalam', 'ja': 'Japanese', 'ko': 'Korean', 'es': 'Spanish',
    'fr': 'French', 'de': 'German', 'zh': 'Chinese'
  };
  return map[code] || code?.toUpperCase() || 'Unknown';
};

export const normalizeMovie = (raw) => {
  if (!raw) return null;

  // Extract year
  const year = raw.release_date ? raw.release_date.split('-')[0] : 'N/A';
  
  // Resolve genres (handles both detailed objects and genre_ids array)
  let genres = [];
  if (raw.genres) {
    genres = raw.genres.map(g => g.name);
  } else if (raw.genre_ids) {
    genres = raw.genre_ids.map(id => GENRE_MAP[id]).filter(Boolean);
  }

  // Cast & Director (only available from detail endpoint with append_to_response=credits)
  let cast = [];
  let director = "Unknown";
  if (raw.credits) {
    if (raw.credits.cast) {
      cast = raw.credits.cast.slice(0, 3).map(c => c.name);
    }
    if (raw.credits.crew) {
      const d = raw.credits.crew.find(c => c.job === 'Director');
      if (d) director = d.name;
    }
  }

  // Trailer (only available from detail endpoint with append_to_response=videos)
  let trailer = null;
  if (raw.videos?.results?.length > 0) {
    const t = raw.videos.results.find(v => v.type === 'Trailer' && v.site === 'YouTube');
    if (t) trailer = `https://www.youtube.com/watch?v=${t.key}`;
  }

  return {
    id: raw.id,
    title: raw.title || raw.original_title,
    poster: getPosterUrl(raw.poster_path, 'w500'),
    backdrop: getBackdropUrl(raw.backdrop_path, 'w1280'),
    releaseDate: raw.release_date,
    year,
    rating: raw.vote_average || 0,
    genres,
    language: getLanguageName(raw.original_language),
    industry: getIndustry(raw),
    overview: raw.overview || "No overview available.",
    popularity: raw.popularity || 0,
    cast,
    director,
    trailer
  };
};
