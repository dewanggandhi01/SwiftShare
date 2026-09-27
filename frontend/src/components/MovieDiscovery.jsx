import React, { useState, useEffect } from 'react';
import { FiStar, FiInfo, FiSearch, FiPlayCircle, FiX, FiCheck, FiFilm, FiAlertCircle } from 'react-icons/fi';
import { movieService } from '../services/movieService';

// ----------------------------------------------------
// MOVIE POSTER COMPONENT (Strict 2:3, Skeleton, Fallback)
// ----------------------------------------------------
const MoviePoster = ({ movie }) => {
  const [status, setStatus] = useState('loading'); // loading | loaded | error

  useEffect(() => {
    if (!movie?.poster || movie.poster.includes('null') || movie.poster === '') {
      setStatus('error');
    }
  }, [movie]);

  const fallbackGradient = movie?.genres?.includes('Action') ? 'from-[#2A1115]' :
                           movie?.genres?.includes('Sci-Fi') ? 'from-[#11162A]' :
                           movie?.genres?.includes('Comedy') ? 'from-[#2A2311]' :
                           'from-[#181922]';

  return (
    <div className="relative w-full aspect-[2/3] bg-[#0A0B10] overflow-hidden rounded-[10px] sm:rounded-[12px] border border-white/[0.08] shadow-sm">
      {/* Loading Skeleton */}
      {status === 'loading' && (
        <div className="absolute inset-0 bg-white/[0.03] animate-pulse" />
      )}

      {/* Cinematic Fallback for Missing Posters */}
      {status === 'error' && (
        <div className={`absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b ${fallbackGradient} to-[#06070B] p-4 text-center`}>
          <FiFilm size={32} className="mb-3 text-white/10" />
          <h4 className="text-white font-bold text-[13px] sm:text-[14px] leading-tight mb-1.5 line-clamp-3 drop-shadow-sm uppercase tracking-wide">
            {movie?.title}
          </h4>
          <span className="text-[#8B91A1] text-[10px] font-bold tracking-widest">{movie?.year}</span>
        </div>
      )}

      {/* Actual Image */}
      {movie?.poster && status !== 'error' && (
        <img 
          src={movie.poster} 
          alt={movie.title} 
          onLoad={() => setStatus('loaded')}
          onError={() => setStatus('error')}
          className={`w-full h-full object-cover transition-opacity duration-500 ${status === 'loaded' ? 'opacity-100' : 'opacity-0'}`}
          loading="lazy"
        />
      )}
    </div>
  );
};

// ----------------------------------------------------
// MOVIE CARD COMPONENT (Cinematic Poster Redesign)
// ----------------------------------------------------
const MovieCard = ({ movie, onClick, onToggleWatchlist, isWatchlisted }) => {
  if (!movie) return null;

  return (
    <div 
      className="group relative w-full aspect-[2/3] bg-[#0A0B10] rounded-[10px] sm:rounded-[12px] overflow-hidden cursor-pointer transition-all duration-250 hover:scale-[1.04] hover:z-30 hover:shadow-[0_15px_35px_rgba(0,0,0,0.6)] hover:shadow-[#7C5CFF]/10"
      onClick={() => onClick(movie)}
    >
      <MoviePoster movie={movie} />
      
      {/* Permanent Watchlist Quick Action (Top Right) */}
      <button 
        className={`absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center backdrop-blur-md transition-all duration-150 z-40 shadow-lg hover:scale-110 ${
          isWatchlisted ? "bg-[#7C5CFF] text-white" : "bg-[rgba(0,0,0,0.65)] text-white/70 hover:bg-[#7C5CFF] hover:text-white"
        }`}
        onClick={(e) => { e.stopPropagation(); onToggleWatchlist(movie.id); }}
        title={isWatchlisted ? `Remove ${movie.title} from watchlist` : `Add ${movie.title} to watchlist`}
      >
        {isWatchlisted ? <FiCheck size={12} /> : <FiStar size={12} />}
      </button>

      {/* Dark overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#05050A] via-[#05050A]/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-3 sm:p-4">

        {/* Metadata Reveal */}
        <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-200">
          <h4 className="text-white font-bold text-sm leading-tight mb-1.5 drop-shadow-md">
            {movie.title}
          </h4>
          <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-mono text-white/90 mb-2">
            {movie.rating > 0 && (
              <span className="flex items-center gap-1 text-yellow-400 font-bold">
                <FiStar size={10} className="fill-yellow-400" /> {movie.rating.toFixed(1)}
              </span>
            )}
            <span>{movie.year}</span>
            <span className="opacity-50">•</span>
            <span className="uppercase tracking-wider">{movie.industry}</span>
          </div>
          
          <div className="flex flex-wrap gap-1 mb-2.5">
            {movie.genres.slice(0, 2).map(g => (
              <span key={g} className="px-1.5 py-[1px] rounded bg-white/10 backdrop-blur border border-white/10 text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-white">
                {g}
              </span>
            ))}
          </div>

          <div className="w-full py-1.5 bg-[#7C5CFF] hover:bg-[#6b4ce6] transition-colors rounded-[6px] flex items-center justify-center gap-2 text-white text-[10px] font-bold uppercase tracking-widest">
            <FiInfo size={10} /> View
          </div>
        </div>
      </div>
    </div>
  );
};

// ----------------------------------------------------
// MOVIE MODAL COMPONENT (Polished)
// ----------------------------------------------------
const MovieModal = ({ movie, onClose, onToggleWatchlist, isWatchlisted }) => {
  if (!movie) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6" onClick={onClose}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      
      <div 
        className="relative w-full max-w-4xl bg-[#111218] border border-white/10 rounded-[24px] overflow-hidden flex flex-col max-h-[90vh] shadow-2xl animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-[#7C5CFF] transition-colors"
        >
          <FiX size={18} />
        </button>

        {/* Backdrop Header */}
        <div className="w-full h-[200px] sm:h-[300px] relative bg-[#0A0B10]">
          <div className="absolute inset-0 bg-gradient-to-t from-[#111218] via-[#111218]/80 to-transparent z-10" />
          {movie.backdrop && (
            <img src={movie.backdrop} alt="Backdrop" className="w-full h-full object-cover mix-blend-lighten" />
          )}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto px-6 pb-8 -mt-20 relative z-20 custom-scrollbar">
          <div className="flex flex-col sm:flex-row gap-8">
            
            {/* Poster */}
            <div className="w-32 sm:w-56 flex-shrink-0 rounded-xl overflow-hidden shadow-2xl border border-white/10 hidden sm:block bg-[#0A0B10]">
              <MoviePoster src={movie.poster} alt={movie.title} />
            </div>

            {/* Info */}
            <div className="flex flex-col pt-2 sm:pt-16 w-full">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-2 tracking-tight leading-none">{movie.title}</h2>
              
              <div className="flex flex-wrap items-center gap-3 text-sm text-[#9AA1AE] mb-4 font-mono">
                {movie.rating > 0 && <span className="text-yellow-400 font-bold px-2 py-0.5 bg-yellow-400/10 rounded">★ {movie.rating.toFixed(1)}</span>}
                <span>{movie.year}</span>
                <span>•</span>
                <span>{movie.language}</span>
                <span>•</span>
                <span className="text-[#7C5CFF] font-semibold tracking-wide">{movie.industry}</span>
              </div>

              <div className="flex flex-wrap gap-2 mb-6">
                {movie.genres.map(g => (
                  <span key={g} className="px-3 py-1 bg-white/[0.05] rounded-full text-[11px] font-medium text-white border border-white/10 tracking-wide uppercase">
                    {g}
                  </span>
                ))}
              </div>

              <p className="text-[#B5BAC7] text-sm leading-relaxed mb-6 max-w-2xl">
                {movie.overview}
              </p>

              <div className="mb-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {movie.cast?.length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-bold text-[#7C5CFF] uppercase tracking-widest mb-1.5">Top Cast</h4>
                    <p className="text-[13px] text-white">{movie.cast.join(", ")}</p>
                  </div>
                )}
                {movie.director && movie.director !== "Unknown" && (
                  <div>
                    <h4 className="text-[10px] font-bold text-[#7C5CFF] uppercase tracking-widest mb-1.5">Director</h4>
                    <p className="text-[13px] text-white">{movie.director}</p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 mt-auto border-t border-white/[0.05] pt-6">
                <button 
                  onClick={() => onToggleWatchlist(movie.id)}
                  className={`px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${
                    isWatchlisted 
                      ? "bg-white/[0.05] text-white border border-white/10 hover:bg-white/10" 
                      : "bg-white text-black hover:bg-gray-200"
                  }`}
                >
                  {isWatchlisted ? <FiCheck size={18} /> : <FiStar size={18} />}
                  {isWatchlisted ? "Added to Watchlist" : "Add to Watchlist"}
                </button>
                
                {movie.trailer && (
                  <a 
                    href={movie.trailer} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 bg-[#7C5CFF] text-white hover:bg-[#6b4ce6] transition-colors"
                  >
                    <FiPlayCircle size={18} />
                    Watch Trailer
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ----------------------------------------------------
// ONBOARDING MODAL COMPONENT
// ----------------------------------------------------
const OnboardingModal = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [selectedLanguages, setSelectedLanguages] = useState([]);

  const ALL_GENRES = ["Action", "Comedy", "Drama", "Thriller", "Horror", "Romance", "Sci-Fi", "Fantasy", "Animation", "Adventure"];
  const ALL_LANGUAGES = ["English", "Hindi", "Telugu", "Tamil", "Japanese", "Korean"];

  const toggleSelection = (item, list, setList) => {
    setList(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);
  };

  const handleFinish = () => {
    movieService.saveUserPreferences({ genres: selectedGenres, languages: selectedLanguages });
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#111218] border border-[#7C5CFF]/30 w-full max-w-lg rounded-[24px] p-8 shadow-2xl relative">
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-[#7C5CFF]/20 rounded-full blur-3xl pointer-events-none" />
        
        <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">Movie Discovery Engine</h2>
        <p className="text-sm text-[#9AA1AE] mb-8">Personalize your recommendations to discover the best titles.</p>

        {step === 1 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <h3 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">What kind of movies do you like?</h3>
            <div className="flex flex-wrap gap-2 mb-8">
              {ALL_GENRES.map(g => (
                <button
                  key={g}
                  onClick={() => toggleSelection(g, selectedGenres, setSelectedGenres)}
                  className={`px-4 py-2 rounded-full text-xs font-semibold transition-all border ${
                    selectedGenres.includes(g) 
                      ? "bg-[#7C5CFF] border-[#7C5CFF] text-white" 
                      : "bg-transparent border-white/10 text-[#9AA1AE] hover:border-white/30"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
            <button 
              onClick={() => setStep(2)}
              disabled={selectedGenres.length === 0}
              className="w-full py-3 rounded-xl bg-white text-black font-bold disabled:opacity-50 transition-all hover:scale-[1.02]"
            >
              Continue
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <h3 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">Preferred Languages</h3>
            <div className="flex flex-wrap gap-2 mb-8">
              {ALL_LANGUAGES.map(l => (
                <button
                  key={l}
                  onClick={() => toggleSelection(l, selectedLanguages, setSelectedLanguages)}
                  className={`px-4 py-2 rounded-full text-xs font-semibold transition-all border ${
                    selectedLanguages.includes(l) 
                      ? "bg-[#7C5CFF] border-[#7C5CFF] text-white" 
                      : "bg-transparent border-white/10 text-[#9AA1AE] hover:border-white/30"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="px-4 py-3 rounded-xl bg-white/5 text-white font-semibold hover:bg-white/10">Back</button>
              <button 
                onClick={handleFinish}
                className="flex-1 py-3 rounded-xl bg-[#7C5CFF] text-white font-bold hover:bg-[#6b4ce6] transition-all"
              >
                Build My Recommendations
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ----------------------------------------------------
// MAIN MOVIE DISCOVERY MODULE
// ----------------------------------------------------
const NAV_TABS = ["For You", "New Releases", "Trending", "Hollywood", "Bollywood", "Tollywood", "Upcoming", "Genres", "Watchlist"];

export default function MovieDiscovery({ onBack }) {
  const [activeTab, setActiveTab] = useState("For You");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Data States
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(false);
  const [watchlistIds, setWatchlistIds] = useState([]);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [activeGenreFilter, setActiveGenreFilter] = useState("Action");

  // Init
  useEffect(() => {
    const prefs = movieService.getUserPreferences();
    if (!prefs) setShowOnboarding(true);
    setWatchlistIds(movieService.getWatchlistIds());
    loadData(activeTab);
  }, []);

  // Watch tab changes
  useEffect(() => {
    if (!searchQuery) loadData(activeTab);
  }, [activeTab]);

  // Watch search changes with debounce
  useEffect(() => {
    if (searchQuery) {
      const timer = setTimeout(async () => {
        setLoading(true);
        setApiError(false);
        try {
          const results = await movieService.searchMovies(searchQuery);
          setMovies(results);
        } catch (e) {
          setApiError(true);
        }
        setLoading(false);
      }, 500);
      return () => clearTimeout(timer);
    } else if (searchQuery === "") {
      loadData(activeTab);
    }
  }, [searchQuery]);

  // Genre tab change handler
  useEffect(() => {
    if (activeTab === "Genres" && !searchQuery) {
      loadData("Genres");
    }
  }, [activeGenreFilter]);

  // Load Data based on tab
  const loadData = async (tab) => {
    setLoading(true);
    setApiError(false);
    let data = [];
    try {
      if (tab === "For You") data = await movieService.getRecommendedMovies();
      else if (tab === "New Releases") data = await movieService.getNewReleases();
      else if (tab === "Trending") data = await movieService.getTrendingMovies();
      else if (tab === "Hollywood") data = await movieService.getMoviesByIndustry("Hollywood");
      else if (tab === "Bollywood") data = await movieService.getMoviesByIndustry("Bollywood");
      else if (tab === "Tollywood") data = await movieService.getMoviesByIndustry("Tollywood");
      else if (tab === "Upcoming") data = await movieService.getUpcomingMovies();
      else if (tab === "Watchlist") data = await movieService.getWatchlistMovies();
      else if (tab === "Genres") data = await movieService.getMoviesByGenre(activeGenreFilter);
    } catch (e) {
      console.error(e);
      setApiError(true);
    }
    setMovies(data);
    setLoading(false);
  };

  const handleToggleWatchlist = async (id) => {
    await movieService.toggleWatchlist(id);
    setWatchlistIds(movieService.getWatchlistIds());
    if (activeTab === "Watchlist") loadData("Watchlist");
  };

  return (
    <div className="fixed inset-0 top-[75px] z-20 bg-[#06070B] overflow-y-auto custom-scrollbar">
      {/* Subtle Radial Cinematic Glow */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,rgba(79,140,255,0.08),transparent_50%)] z-0" />
      {/* Modals */}
      {showOnboarding && <OnboardingModal onComplete={() => { setShowOnboarding(false); loadData("For You"); }} />}
      {selectedMovie && (
        <MovieModal 
          movie={selectedMovie} 
          onClose={() => setSelectedMovie(null)} 
          isWatchlisted={watchlistIds.includes(selectedMovie.id)}
          onToggleWatchlist={handleToggleWatchlist}
        />
      )}

      {/* Floating UI Chrome (Controls & Navigation) */}
      <div className="sticky top-0 z-40 w-full bg-[#06070B]/80 backdrop-blur-xl pt-4 pb-0 flex flex-col gap-3">
        
        {/* ROW 1: Main Controls (Left, Center, Right) */}
        <div className="w-full px-4 sm:px-6 flex flex-col lg:flex-row items-center justify-between gap-4">
          
          {/* LEFT: Exit & Title */}
          <div className="flex items-center gap-3 w-full lg:w-auto justify-start">
            {onBack && (
              <button 
                onClick={onBack} 
                className="w-11 h-11 rounded-full bg-[#11131A] border border-white/[0.07] flex items-center justify-center text-[#8B91A1] hover:text-white hover:bg-black/50 hover:border-[#7C4DFF]/50 transition-all duration-150 shadow-md shrink-0"
              >
                <FiX size={18} />
              </button>
            )}
            <div className="flex items-center gap-2 bg-[#11131A] border border-white/[0.07] px-4 h-11 rounded-[14px] shadow-md whitespace-nowrap shrink-0 transition-all duration-150">
              <span className="text-[14px]">🎬</span>
              <h2 className="text-white font-semibold tracking-wide text-[14px] sm:text-[15px]">MOVIE DISCOVERY</h2>
            </div>
          </div>

          {/* CENTER: Segmented Control (All | Movies | TV Shows) */}
          <div className="flex items-center bg-[#11131A] border border-white/[0.07] p-1 rounded-full shadow-md w-full lg:w-auto shrink-0 overflow-x-auto custom-scrollbar-hide h-11">
            <button className="px-4 sm:px-5 py-1.5 h-full rounded-full text-[12px] sm:text-[13px] font-semibold bg-gradient-to-r from-[#7C4DFF] to-[#6b3ce6] text-white shadow-[0_0_12px_rgba(124,77,255,0.3)] transition-all duration-150 whitespace-nowrap">All</button>
            <button className="px-4 sm:px-5 py-1.5 h-full rounded-full text-[12px] sm:text-[13px] font-semibold text-[#8B91A1] hover:text-white transition-all duration-150 whitespace-nowrap">Movies</button>
            <button className="px-4 sm:px-5 py-1.5 h-full rounded-full text-[12px] sm:text-[13px] font-semibold text-[#8B91A1] hover:text-white transition-all duration-150 whitespace-nowrap">TV Shows</button>
          </div>

          {/* RIGHT: Search Bar */}
          <div className="w-full lg:w-[280px] shrink-0 h-11 bg-[#11131A] border border-white/[0.07] rounded-full flex items-center px-5 gap-3 shadow-md focus-within:border-[#7C4DFF]/60 focus-within:shadow-[0_0_15px_rgba(124,77,255,0.15)] transition-all duration-200">
            <FiSearch className="text-[#8B91A1]" size={15} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search movies, cast..."
              className="w-full bg-transparent border-none text-white text-[13px] font-medium focus:outline-none placeholder:text-[#8B91A1]"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="text-[#8B91A1] hover:text-white transition-colors duration-150"><FiX size={15}/></button>
            )}
          </div>
        </div>

        {/* ROW 2: Category Navigation */}
        <div className="w-full px-4 sm:px-6 overflow-x-auto custom-scrollbar-hide border-b border-white/[0.06]">
          <div className="flex items-center gap-7 pb-3 min-w-max">
            {NAV_TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`relative pb-1 text-[12px] font-semibold uppercase tracking-wider transition-colors duration-150 ${
                  activeTab === tab ? "text-white" : "text-[#8B91A1] hover:text-[#B5BAC7]"
                }`}
              >
                {tab}
                {activeTab === tab && (
                  <div className="absolute -bottom-[13px] left-0 right-0 h-[2px] bg-[#7C4DFF] rounded-t-full shadow-[0_-2px_10px_rgba(124,77,255,0.6)]" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Dense Cinematic Poster Wall */}
      <div className="relative z-10 w-full px-3 sm:px-5 pb-24 mt-4">
        
        {loading ? (
          // Dense Skeleton loader
          <div className="grid grid-cols-2 min-[420px]:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-9 2xl:grid-cols-10 3xl:grid-cols-12 gap-x-2 gap-y-3 sm:gap-x-3 sm:gap-y-4 max-w-[2200px] mx-auto">
            {[...Array(48)].map((_, i) => (
              <div key={i} className={`w-full aspect-[2/3] bg-white/[0.02] rounded-[10px] animate-pulse transition-transform ${i % 2 === 0 ? "translate-y-0" : "translate-y-[12px] sm:translate-y-[20px]"}`} />
            ))}
          </div>
        ) : apiError ? (
          <div className="w-full h-[60vh] flex flex-col items-center justify-center text-center">
            <FiAlertCircle size={40} className="text-red-500 mb-4 opacity-80" />
            <h3 className="text-white font-bold mb-2">Connection Error</h3>
            <p className="text-[#9AA1AE] text-sm">Could not load the cinematic wall.</p>
          </div>
        ) : movies.length > 0 ? (
          <div className="grid grid-cols-2 min-[420px]:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-9 2xl:grid-cols-10 3xl:grid-cols-12 gap-x-2 gap-y-3 sm:gap-x-3 sm:gap-y-4 max-w-[2200px] mx-auto animate-in fade-in duration-1000 pb-10">
            {movies.map((movie, i) => (
              <div key={movie.id} className={`transition-transform duration-500 ${i % 2 === 0 ? "translate-y-0" : "translate-y-[12px] sm:translate-y-[20px]"}`}>
                <MovieCard 
                  movie={movie} 
                  onClick={setSelectedMovie}
                  isWatchlisted={watchlistIds.includes(movie.id)}
                  onToggleWatchlist={handleToggleWatchlist}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="w-full h-[60vh] flex flex-col items-center justify-center text-center">
            <FiSearch size={40} className="text-white/20 mb-4" />
            <h3 className="text-white font-bold mb-2">No Posters Found</h3>
            <p className="text-[#9AA1AE] text-sm">Try adjusting your filters.</p>
          </div>
        )}

      </div>
    </div>
  );
}
