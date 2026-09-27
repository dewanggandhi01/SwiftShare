import { MOVIES } from '../data/moviesData';

class MovieService {
  constructor() {
    this.movies = MOVIES;
  }

  // Helper: Sort valid posters first, then by existing score/popularity
  sortMoviesWithPostersFirst(movies, secondarySortFn) {
    return movies.sort((a, b) => {
      const aHasPoster = a.poster && a.poster.trim() !== '' && !a.poster.includes('null');
      const bHasPoster = b.poster && b.poster.trim() !== '' && !b.poster.includes('null');
      
      if (aHasPoster && !bHasPoster) return -1;
      if (!aHasPoster && bHasPoster) return 1;
      
      return secondarySortFn ? secondarySortFn(a, b) : 0;
    });
  }

  // --- Core Fetchers (Simulating API) ---
  
  async getTrendingMovies() {
    return this.sortMoviesWithPostersFirst([...this.movies], (a, b) => b.popularity - a.popularity);
  }

  async getNewReleases() {
    const newReleases = this.movies.filter(m => m.isNewRelease);
    return this.sortMoviesWithPostersFirst(newReleases, (a, b) => new Date(b.releaseDate) - new Date(a.releaseDate));
  }

  async getUpcomingMovies() {
    const upcoming = this.movies.filter(m => m.isUpcoming);
    return this.sortMoviesWithPostersFirst(upcoming, (a, b) => b.popularity - a.popularity);
  }

  async getMoviesByIndustry(industry) {
    const byIndustry = this.movies.filter(m => m.industry === industry);
    return this.sortMoviesWithPostersFirst(byIndustry, (a, b) => b.popularity - a.popularity);
  }

  async getMoviesByGenre(genre) {
    const byGenre = this.movies.filter(m => m.genres.includes(genre));
    return this.sortMoviesWithPostersFirst(byGenre, (a, b) => b.popularity - a.popularity);
  }

  async searchMovies(query) {
    if (!query || query.trim() === '') return [];
    const q = query.toLowerCase();
    const results = this.movies.filter(m => 
      m.title.toLowerCase().includes(q) || 
      m.genres.some(g => g.toLowerCase().includes(q)) ||
      m.cast?.some(c => c.toLowerCase().includes(q)) ||
      m.director?.toLowerCase().includes(q)
    );
    return this.sortMoviesWithPostersFirst(results, (a, b) => b.popularity - a.popularity);
  }

  async getMovieDetails(id) {
    const movie = this.movies.find(m => m.id === id);
    if (!movie) throw new Error("Movie not found");
    return movie;
  }

  // --- Watchlist & Preferences (Local Storage) ---
  
  getWatchlistIds() {
    try {
      return JSON.parse(localStorage.getItem('sf-movie-watchlist') || '[]');
    } catch {
      return [];
    }
  }

  async toggleWatchlist(id) {
    let ids = this.getWatchlistIds();
    if (ids.includes(id)) {
      ids = ids.filter(i => i !== id);
    } else {
      ids.push(id);
    }
    localStorage.setItem('sf-movie-watchlist', JSON.stringify(ids));
    return ids.includes(id);
  }

  async getWatchlistMovies() {
    const ids = this.getWatchlistIds();
    return ids.map(id => this.movies.find(m => m.id === id)).filter(Boolean);
  }

  getUserPreferences() {
    try {
      return JSON.parse(localStorage.getItem('sf-movie-prefs'));
    } catch {
      return null;
    }
  }

  saveUserPreferences(prefs) {
    localStorage.setItem('sf-movie-prefs', JSON.stringify(prefs));
  }

  // --- Recommendation Engine (Local) ---
  
  async getRecommendedMovies() {
    const prefs = this.getUserPreferences();
    if (!prefs || (prefs.genres.length === 0 && prefs.languages.length === 0)) {
      return this.getTrendingMovies();
    }

    const scoredMovies = this.movies.map(movie => {
      let score = movie.popularity / 10; 
      
      // Genre match bonus
      if (prefs.genres && prefs.genres.length > 0) {
        const matchingGenres = movie.genres.filter(g => prefs.genres.includes(g));
        score += matchingGenres.length * 20; 
      }
      
      // Language match bonus
      if (prefs.languages && prefs.languages.length > 0) {
        if (prefs.languages.includes(movie.language)) {
          score += 30;
        }
      }

      return { movie, score };
    });

    const sortedByScore = scoredMovies.sort((a, b) => b.score - a.score).map(item => item.movie);
    return this.sortMoviesWithPostersFirst(sortedByScore);
  }
}

export const movieService = new MovieService();
