import React, { useState, useEffect, useMemo } from "react";
import { 
  FiSearch, FiStar, FiExternalLink, FiX, FiFilm, FiTv, FiSmile, 
  FiAward, FiBookmark, FiGrid, FiClock, FiShield, FiBookOpen, FiZap
} from "react-icons/fi";

const SITES = [
  // 🎬 MOVIES & TV SHOWS
  { id: '1shows',       name: '1Shows',       url: 'https://www.1shows.org/',          color: '#7C5CFF', rank: 1,  category: 'Movies',     tags: ['Movies', 'HD Streams'], recommended: true, dateAdded: '2026-01-10', popularity: 99 },
  { id: '1flex',        name: '1Flex',        url: 'https://www.1flex.org/',           color: '#ff6b35', rank: 2,  category: 'Movies',     tags: ['Movies', 'Web Series'], recommended: true, dateAdded: '2026-01-15', popularity: 98 },
  { id: '1tube',        name: '1Tube',        url: 'https://www.1tube.org/',           color: '#00d4aa', rank: 3,  category: 'Movies',     tags: ['Movies', 'HD Streams'], recommended: true, dateAdded: '2026-01-18', popularity: 97 },
  { id: 'shuttletv',    name: 'ShuttleTV',    url: 'https://shuttletv.su/',            color: '#7b2ff7', rank: 4,  category: 'TV Shows',   tags: ['TV Shows', 'Live Streams'], recommended: false, dateAdded: '2026-01-22', popularity: 91 },
  { id: 'flickystream', name: 'FlickyStream', url: 'https://flickystream.dad/',        color: '#00bfff', rank: 5,  category: 'Movies',     tags: ['Movies', 'Web Series'], recommended: true, dateAdded: '2026-02-01', popularity: 95 },
  { id: 'meowtv',       name: 'MeowTV',       url: 'https://meowtv.ru/',               color: '#ff2d55', rank: 6,  category: 'TV Shows',   tags: ['TV Shows', 'Series'], recommended: false, dateAdded: '2026-02-05', popularity: 89 },
  { id: 'rivestream',   name: 'RiveStream',   url: 'https://rivestream.ru/',           color: '#39ff14', rank: 7,  category: 'Movies',     tags: ['Movies', 'TV Shows'], recommended: false, dateAdded: '2026-02-10', popularity: 90 },
  { id: 'cinemabz',     name: 'CinemaBZ',     url: 'https://cinema.bz/',               color: '#ff9500', rank: 8,  category: 'Movies',     tags: ['Movies', 'Classics'], recommended: true, dateAdded: '2026-02-15', popularity: 96 },
  { id: 'filmcave',     name: 'FilmCave',     url: 'https://filmcave.ru/',             color: '#8b5cf6', rank: 9,  category: 'Movies',     tags: ['Movies', 'Web Series'], recommended: true, dateAdded: '2026-02-20', popularity: 94 },
  { id: 'popcorn',      name: 'PopcornMovies',url: 'https://popcornmovies.io/',        color: '#f43f5e', rank: 10, category: 'Movies',     tags: ['Movies', 'Trending'], recommended: false, dateAdded: '2026-02-25', popularity: 88 },
  { id: 'cineby',       name: 'Cineby',       url: 'https://cineby.at/',               color: '#3b82f6', rank: 11, category: 'Movies',     tags: ['Movies', 'HD Streams'], recommended: true, dateAdded: '2026-03-01', popularity: 96 },
  { id: 'nepu',         name: 'Nepu',         url: 'https://nepu.to/',                 color: '#f97316', rank: 12, category: 'Movies',     tags: ['Movies', 'Anime'], recommended: false, dateAdded: '2026-03-05', popularity: 87 },
  { id: 'flixgaze',     name: 'FlixGaze',     url: 'https://flixgaze.com/',            color: '#06b6d4', rank: 13, category: 'Movies',     tags: ['Movies', 'TV Shows'], recommended: false, dateAdded: '2026-03-10', popularity: 86 },
  { id: 'netplayz',     name: 'Netplayz',     url: 'https://netplayz.top/',            color: '#eab308', rank: 14, category: 'Movies',     tags: ['Movies', 'HD Streams'], recommended: true, dateAdded: '2026-03-12', popularity: 95 },
  { id: 'hollymovie',   name: 'HollyMovieHD', url: 'https://hollymoviehd.cc/',        color: '#22c55e', rank: 15, category: 'Movies',     tags: ['Hollywood', 'Movies'], recommended: false, dateAdded: '2026-03-15', popularity: 85 },
  { id: 'cinemacity',   name: 'CinemaCity',   url: 'https://cinemacity.cc/',           color: '#a855f7', rank: 16, category: 'Movies',     tags: ['Movies', 'TV Shows'], recommended: false, dateAdded: '2026-03-18', popularity: 84 },
  { id: 'moviebox',     name: 'MovieBox',     url: 'https://h5.inmoviebox.com/',       color: '#ef4444', rank: 17, category: 'Movies',     tags: ['Movies', 'Mobile'], recommended: true, dateAdded: '2026-03-20', popularity: 96 },
  { id: 'hdtodayz',     name: 'HDToday',      url: 'https://hdtodayz.net/',            color: '#14b8a6', rank: 18, category: 'Movies',     tags: ['HD Movies', 'TV Shows'], recommended: true, dateAdded: '2026-03-22', popularity: 97 },
  { id: 'willow',       name: 'Willow',       url: 'https://willow.arlen.icu/',        color: '#6366f1', rank: 19, category: 'Movies',     tags: ['Movies', 'Ad-Free'], recommended: false, dateAdded: '2026-03-25', popularity: 83 },
  { id: '345movie',     name: '345Movie',     url: 'https://345movie.nl/',             color: '#ec4899', rank: 20, category: 'Movies',     tags: ['Movies', 'TV Shows'], recommended: false, dateAdded: '2026-03-28', popularity: 82 },

  // 📺 ANIME
  { id: 'reanime',      name: 'ReAnime',      url: 'https://reanime.to/home',          color: '#7C5CFF', rank: 21, category: 'Anime',      tags: ['Anime', 'Sub & Dub'], recommended: true, dateAdded: '2026-04-01', popularity: 95 },
  { id: 'animepahe',    name: 'AnimePahe',    url: 'https://animepahe.ru/',            color: '#ff6b35', rank: 22, category: 'Anime',      tags: ['Anime', '720p/1080p'], recommended: true, dateAdded: '2026-04-03', popularity: 98 },
  { id: 'anikoto',      name: 'Anikoto',      url: 'https://anikoto.to/',              color: '#00d4aa', rank: 23, category: 'Anime',      tags: ['Anime', 'Streaming'], recommended: false, dateAdded: '2026-04-05', popularity: 88 },
  { id: 'emma',         name: 'Emma',         url: 'https://emma.lol/',                color: '#7b2ff7', rank: 24, category: 'Anime',      tags: ['Anime', 'Ad-Free'], recommended: false, dateAdded: '2026-04-08', popularity: 87 },
  { id: 'miruro',       name: 'Miruro',       url: 'https://www.miruro.to/',           color: '#ff2d55', rank: 25, category: 'Anime',      tags: ['Anime', 'Fast Player'], recommended: true, dateAdded: '2026-04-10', popularity: 97 },
  { id: 'animenexus',   name: 'AnimeNexus',   url: 'https://anime.nexus/',             color: '#00bfff', rank: 26, category: 'Anime',      tags: ['Anime', 'Community'], recommended: false, dateAdded: '2026-04-12', popularity: 86 },
  { id: 'anidb',        name: 'AniDB',        url: 'https://anidb.app/home',           color: '#39ff14', rank: 27, category: 'Anime',      tags: ['Anime', 'Database'], recommended: true, dateAdded: '2026-04-15', popularity: 96 },
  { id: 'senshi',       name: 'Senshi',       url: 'https://senshi.live/',             color: '#ff9500', rank: 28, category: 'Anime',      tags: ['Anime', 'Live Streams'], recommended: false, dateAdded: '2026-04-18', popularity: 85 },
  { id: 'anikage',      name: 'Anikage',      url: 'https://anikage.cc/home',          color: '#8b5cf6', rank: 29, category: 'Anime',      tags: ['Anime', 'HD Streams'], recommended: false, dateAdded: '2026-04-20', popularity: 84 },
  { id: 'anidap',       name: 'AniDap',       url: 'https://anidap.lol/',              color: '#f43f5e', rank: 30, category: 'Anime',      tags: ['Anime', 'Fast Player'], recommended: false, dateAdded: '2026-04-22', popularity: 83 },
  { id: 'senpaiflix',   name: 'SenpaiFlix',   url: 'https://senpaiflix.fun/',          color: '#3b82f6', rank: 31, category: 'Anime',      tags: ['Anime', 'HD Streams'], recommended: true, dateAdded: '2026-04-25', popularity: 94 },
  { id: 'animex',       name: 'Animex',       url: 'https://animex.one/home',          color: '#f97316', rank: 32, category: 'Anime',      tags: ['Anime', 'Sub & Dub'], recommended: true, dateAdded: '2026-04-28', popularity: 93 },
  { id: '1anime',       name: '1Anime',       url: 'https://1anime.app/discover',      color: '#06b6d4', rank: 33, category: 'Anime',      tags: ['Anime', 'Mobile'], recommended: false, dateAdded: '2026-05-01', popularity: 89 },
  { id: 'anistream',    name: 'AniStream',    url: 'https://anistream.one/',           color: '#eab308', rank: 34, category: 'Anime',      tags: ['Anime', 'HD Player'], recommended: false, dateAdded: '2026-05-03', popularity: 88 },
  { id: 'kaa',          name: 'Kaa.si',       url: 'https://kaa.si/',                  color: '#22c55e', rank: 35, category: 'Anime',      tags: ['Anime', 'Subbed'], recommended: false, dateAdded: '2026-05-05', popularity: 87 },
  { id: 'justanime',    name: 'JustAnime',    url: 'https://justanime.to/',            color: '#a855f7', rank: 36, category: 'Anime',      tags: ['Anime', 'Streaming'], recommended: false, dateAdded: '2026-05-08', popularity: 86 },
  { id: 'aniwaves',     name: 'AniWaves',     url: 'https://aniwaves.ru/',             color: '#ef4444', rank: 37, category: 'Anime',      tags: ['Anime', 'Sub & Dub'], recommended: true, dateAdded: '2026-05-10', popularity: 97 },
  { id: 'animeheaven',  name: 'AnimeHeaven',  url: 'https://animeheaven.me/',          color: '#14b8a6', rank: 38, category: 'Anime',      tags: ['Anime', 'Classics'], recommended: true, dateAdded: '2026-05-12', popularity: 95 },
  { id: 'anitaku',      name: 'Anitaku',      url: 'https://anitaku.io/',              color: '#6366f1', rank: 39, category: 'Anime',      tags: ['GogoAnime', 'Sub & Dub'], recommended: true, dateAdded: '2026-05-15', popularity: 98 },
  { id: 'lunaranime',   name: 'LunarAnime',   url: 'https://lunaranime.ru/anime',      color: '#ec4899', rank: 40, category: 'Anime',      tags: ['Anime', 'HD Releases'], recommended: false, dateAdded: '2026-05-18', popularity: 85 },

  // 📚 MANGA
  { id: 'mangaball',    name: 'MangaBall',    url: 'https://mangaball.net/',           color: '#7C5CFF', rank: 41, category: 'Manga',      tags: ['Manga', 'Reader'], recommended: false, dateAdded: '2026-05-20', popularity: 86 },
  { id: 'atsu',         name: 'Atsu',         url: 'https://atsu.moe/',                color: '#ff6b35', rank: 42, category: 'Manga',      tags: ['Manga', 'Ad-Free'], recommended: false, dateAdded: '2026-05-22', popularity: 87 },
  { id: 'onisaga',      name: 'OniSaga',      url: 'https://onisaga.com/',             color: '#00d4aa', rank: 43, category: 'Manga',      tags: ['Manhwa', 'Manga'], recommended: false, dateAdded: '2026-05-25', popularity: 88 },
  { id: 'kagane',       name: 'Kagane',       url: 'https://kagane.to/',               color: '#7b2ff7', rank: 44, category: 'Manga',      tags: ['Manga', 'Webtoons'], recommended: false, dateAdded: '2026-05-28', popularity: 85 },
  { id: 'aquareader',   name: 'AquaReader',   url: 'https://aquareader.org/',          color: '#ff2d55', rank: 45, category: 'Manga',      tags: ['Manga', 'Online Reader'], recommended: false, dateAdded: '2026-06-01', popularity: 84 },
  { id: 'comick',       name: 'Comick',       url: 'https://comick.dev/',              color: '#00bfff', rank: 46, category: 'Manga',      tags: ['Manga', 'Fast Reader'], recommended: true, dateAdded: '2026-06-03', popularity: 98 },
  { id: 'comix',        name: 'Comix',        url: 'https://comix.to/',                color: '#39ff14', rank: 47, category: 'Manga',      tags: ['Comics', 'Manga'], recommended: false, dateAdded: '2026-06-05', popularity: 89 },
  { id: 'mangadot',     name: 'MangaDot',     url: 'https://mangadot.net/',            color: '#ff9500', rank: 48, category: 'Manga',      tags: ['Manga', 'Updates'], recommended: false, dateAdded: '2026-06-08', popularity: 86 },
  { id: 'mangabuddy',   name: 'MangaBuddy',   url: 'https://mangabuddy.co.uk/',        color: '#8b5cf6', rank: 49, category: 'Manga',      tags: ['Manga', 'Webtoons'], recommended: true, dateAdded: '2026-06-10', popularity: 96 },
  { id: 'qtoon',        name: 'QToon',        url: 'https://qtoon.org/',               color: '#f43f5e', rank: 50, category: 'Manga',      tags: ['Webtoons', 'Manhwa'], recommended: false, dateAdded: '2026-06-12', popularity: 87 },
  { id: 'mangadex',     name: 'MangaDex',     url: 'https://mangadex.org/',            color: '#3b82f6', rank: 51, category: 'Manga',      tags: ['Manga', 'Official'], recommended: true, dateAdded: '2026-06-15', popularity: 99 },
  { id: 'mangago',      name: 'Mangago',      url: 'https://mangago.se/',              color: '#f97316', rank: 52, category: 'Manga',      tags: ['Manga', 'Community'], recommended: true, dateAdded: '2026-06-18', popularity: 95 },
  { id: 'mangafire',    name: 'MangaFire',    url: 'https://mangafire.to/home',        color: '#06b6d4', rank: 53, category: 'Manga',      tags: ['Manga', 'HD Reader'], recommended: true, dateAdded: '2026-06-20', popularity: 97 },
  { id: 'allmanga',     name: 'AllManga',     url: 'https://allmanga.to/manga?cty=ALL',color: '#eab308', rank: 54, category: 'Manga',      tags: ['Manga', 'Multi-Lang'], recommended: false, dateAdded: '2026-06-22', popularity: 88 },
  { id: 'mangakakalot', name: 'MangaKakalot', url: 'https://mangakakalot.gg/',        color: '#22c55e', rank: 55, category: 'Manga',      tags: ['Manga', 'Classic Catalog'], recommended: true, dateAdded: '2026-06-25', popularity: 98 },
  { id: 'asuracomic',   name: 'AsuraComic',   url: 'https://asuracomic.net/',          color: '#a855f7', rank: 56, category: 'Manga',      tags: ['Manhwa', 'Action'], recommended: true, dateAdded: '2026-06-28', popularity: 97 },
  { id: 'mangahub',     name: 'MangaHub',     url: 'https://mangahub.io/',             color: '#ef4444', rank: 57, category: 'Manga',      tags: ['Manga', 'Catalog'], recommended: true, dateAdded: '2026-07-01', popularity: 94 },
  { id: 'weebcentral',  name: 'WeebCentral',  url: 'https://weebcentral.com/',         color: '#14b8a6', rank: 58, category: 'Manga',      tags: ['Manga', 'Fast Reader'], recommended: true, dateAdded: '2026-07-03', popularity: 96 },
  { id: 'mangakatana',  name: 'MangaKatana',  url: 'https://mangakatana.com/',         color: '#6366f1', rank: 59, category: 'Manga',      tags: ['Manga', 'Daily Updates'], recommended: true, dateAdded: '2026-07-05', popularity: 95 },
  { id: 'likemanga',    name: 'LikeManga',    url: 'https://likemanga.ink/',           color: '#ec4899', rank: 60, category: 'Manga',      tags: ['Manga', 'Webtoons'], recommended: false, dateAdded: '2026-07-08', popularity: 86 },
  { id: 'mangaxo',      name: 'MangaXO',      url: 'https://mangaxo.com/home',         color: '#00d4aa', rank: 61, category: 'Manga',      tags: ['Manga', 'Reader'], recommended: false, dateAdded: '2026-07-10', popularity: 85 },
];

const CATEGORIES_LIST = [
  { key: "all", name: "All Directories", icon: FiGrid },
  { key: "recommended", name: "Best Quality ⭐", icon: FiZap },
  { key: "Movies", name: "Movies", icon: FiFilm },
  { key: "TV Shows", name: "TV Shows", icon: FiTv },
  { key: "Anime", name: "Anime", icon: FiSmile },
  { key: "Manga", name: "Manga", icon: FiBookOpen },
  { key: "favorites", name: "Bookmarks", icon: FiBookmark },
];

export default function StreamFinder() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("popular"); // "popular" | "newest" | "alpha"
  const [favorites, setFavorites] = useState([]);

  // Load favorites
  useEffect(() => {
    try {
      const favs = JSON.parse(localStorage.getItem("sf-favorites") || "[]");
      setFavorites(favs);
    } catch (_) {}
  }, []);

  const toggleFavorite = (name) => {
    setFavorites((prev) => {
      const updated = prev.includes(name) 
        ? prev.filter((n) => n !== name) 
        : [...prev, name];
      localStorage.setItem("sf-favorites", JSON.stringify(updated));
      return updated;
    });
  };

  const getDomain = (url) => {
    try {
      return new URL(url).hostname;
    } catch (_) {
      return url;
    }
  };

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts = { all: SITES.length, favorites: favorites.length, recommended: 0 };
    SITES.forEach((site) => {
      counts[site.category] = (counts[site.category] || 0) + 1;
      if (site.recommended) counts.recommended += 1;
    });
    return counts;
  }, [favorites]);

  // Filter & Sort Logic
  const filteredSites = useMemo(() => {
    let result = SITES.filter((site) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        site.name.toLowerCase().includes(q) ||
        site.url.toLowerCase().includes(q) ||
        site.category.toLowerCase().includes(q) ||
        site.tags.some((t) => t.toLowerCase().includes(q));

      if (activeCategory === "all") return matchesSearch;
      if (activeCategory === "recommended") return matchesSearch && site.recommended;
      if (activeCategory === "favorites") return matchesSearch && favorites.includes(site.name);
      return matchesSearch && site.category === activeCategory;
    });

    if (sortBy === "popular") {
      result.sort((a, b) => b.popularity - a.popularity);
    } else if (sortBy === "alpha") {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === "newest") {
      result.sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
    }

    return result;
  }, [searchQuery, activeCategory, favorites, sortBy]);

  return (
    <div className="relative w-full max-w-[1720px] mx-auto pt-0 pb-16 px-0 md:px-2">
      
      <style>
        {`
          @keyframes wave-spin {
            0% { transform: rotate(0deg) scale(1); }
            50% { transform: rotate(180deg) scale(1.1); }
            100% { transform: rotate(360deg) scale(1); }
          }
          .glassy-wave-1 {
            position: absolute;
            top: -40%;
            left: -10%;
            width: 90%;
            height: 180%;
            background: linear-gradient(135deg, rgba(124,92,255,0.45) 0%, transparent 70%);
            border-radius: 40% 60% 60% 40%;
            animation: wave-spin 16s linear infinite;
            filter: blur(25px);
            pointer-events: none;
          }
          .glassy-wave-2 {
            position: absolute;
            bottom: -40%;
            right: -10%;
            width: 85%;
            height: 180%;
            background: linear-gradient(135deg, rgba(59,130,246,0.35) 0%, transparent 70%);
            border-radius: 60% 40% 40% 60%;
            animation: wave-spin 20s linear infinite reverse;
            filter: blur(30px);
            pointer-events: none;
          }
        `}
      </style>

      {/* ── 1. TOP DASHBOARD SECTION (220px Height Card Edge to Edge) ── */}
      <section className="relative w-full min-h-[200px] rounded-[24px] bg-[#111218] border border-white/[0.08] mb-6 overflow-hidden shadow-2xl">
        
        {/* Animated Glassy Waves Background */}
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-[#1E182D]/95 to-[#111218]/98">
          <div className="glassy-wave-1" />
          <div className="glassy-wave-2" />
          {/* Glass Overlay Layer to make it feel glassy */}
          <div className="absolute inset-0 backdrop-blur-[24px] bg-white/[0.02]" />
        </div>

        {/* Inner Content Container */}
        <div className="relative z-10 w-full h-full p-5 md:p-7 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 select-none">
          {/* Left Dashboard Title & Subtitle */}
          <div className="flex flex-col items-start max-w-[680px]">
            <h1 className="font-sans font-bold text-[34px] sm:text-[42px] md:text-[48px] text-white tracking-tight leading-[1.1] mb-2 drop-shadow-sm">
              Movie & Media Directory
            </h1>
            <p className="text-[#B5BAC7] text-[14px] sm:text-[16px] leading-relaxed font-normal">
              Discover 60+ verified streaming & manga directories from around the world.<br className="hidden sm:inline" />
              Fast search, bookmarks, categories and ad-free sources.
            </p>
          </div>

          {/* Right Dashboard Stats Cards */}
          <div className="flex flex-col items-end gap-3 flex-shrink-0 w-full md:w-auto">
            <div className="flex items-center gap-3">
              <div className="bg-white/[0.03] backdrop-blur-md border border-white/[0.08] px-4 py-2.5 rounded-2xl flex flex-col items-center min-w-[95px] shadow-lg">
                <span className="text-xl font-bold text-white font-mono">{SITES.length}</span>
                <span className="text-[10.5px] font-semibold text-[#9AA1AE] uppercase tracking-wide">Directories</span>
              </div>
              <div className="bg-white/[0.03] backdrop-blur-md border border-white/[0.08] px-4 py-2.5 rounded-2xl flex flex-col items-center min-w-[95px] shadow-lg">
                <span className="text-xl font-bold font-mono text-[#7C5CFF]">4</span>
                <span className="text-[10.5px] font-semibold text-[#9AA1AE] uppercase tracking-wide">Media Types</span>
              </div>
              <div className="bg-white/[0.03] backdrop-blur-md border border-white/[0.08] px-4 py-2.5 rounded-2xl flex flex-col items-center min-w-[95px] shadow-lg">
                <span className="text-xl font-bold font-mono text-emerald-400">{categoryCounts.recommended}</span>
                <span className="text-[10.5px] font-semibold text-[#9AA1AE] uppercase tracking-wide">Recommended</span>
              </div>
            </div>

            {/* Status Pills */}
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 bg-white/[0.04] backdrop-blur-md border border-white/[0.06] px-3 py-1 rounded-full text-[#9AA1AE]">
                <FiClock className="text-[#7C5CFF]" size={12} /> Updated: <strong className="text-white">Today</strong>
              </span>
              <span className="flex items-center gap-1.5 bg-emerald-500/10 backdrop-blur-md border border-emerald-500/20 px-3 py-1 rounded-full text-emerald-400 font-medium shadow-[0_0_10px_rgba(52,211,153,0.1)]">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> 3,120 Online
              </span>
            </div>
          </div>
        </div>

      </section>

      {/* ── 2. MAIN CONTENT SPLIT (Sidebar 18% | Content 82%) ── */}
      <div className="w-full flex flex-col lg:flex-row items-start gap-6 lg:gap-7">
        
        {/* ── LEFT SIDEBAR (18% Width, Sticky Top, Zero Left Gap) ── */}
        <aside className="w-full lg:w-[18%] min-w-[210px] flex-shrink-0 lg:sticky lg:top-[75px] flex flex-col gap-5 select-none pl-0">
          
          <div className="bg-[#13151D] border border-white/[0.08] rounded-[22px] p-3.5 flex flex-col gap-2">
            <span className="text-[11px] font-bold tracking-[2px] text-[#A0A0AA] uppercase px-3 py-1">
              Categories
            </span>

            <div className="flex flex-col gap-1">
              {CATEGORIES_LIST.map((cat) => {
                const CatIcon = cat.icon;
                const isActive = activeCategory === cat.key;
                const count = categoryCounts[cat.key] || 0;

                return (
                  <button
                    key={cat.key}
                    onClick={() => setActiveCategory(cat.key)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? "bg-[#7C5CFF] text-white shadow-md"
                        : "bg-transparent text-textSec hover:bg-white/[0.04] hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <CatIcon size={15} />
                      <span>{cat.name}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono ${
                      isActive ? "bg-white/20 text-white" : "bg-white/[0.05] text-[#9AA1AE]"
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Bookmarks / Information Widget */}
          <div className="bg-[#13151D] border border-white/[0.08] rounded-[22px] p-3.5 flex flex-col gap-2 text-xs">
            <span className="text-[11px] font-bold tracking-[2px] text-[#A0A0AA] uppercase px-3 py-1 flex items-center gap-1.5">
              <FiShield className="text-[#7C5CFF]" size={13} /> Verified Links
            </span>
            <p className="text-[#9AA1AE] px-3 text-[12px] leading-relaxed">
              All 60+ directories are verified for uptime, quality streams, and safe reader engines.
            </p>
          </div>

        </aside>

        {/* ── RIGHT CONTENT AREA (82% Width) ── */}
        <main className="w-full lg:w-[82%] flex-1 flex flex-col min-w-0 pr-0">
          
          {/* Top Search Bar (54px Height, 18px Rounded) */}
          <div className="w-full h-[52px] bg-[#13151D] border border-white/[0.08] rounded-[18px] flex items-center px-4.5 gap-3 mb-4 transition-colors focus-within:border-[#7C5CFF]">
            <FiSearch className="text-[#7C5CFF] text-lg flex-shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search 60+ movies, anime or manga sites by title, domain or tag..."
              className="w-full bg-transparent border-none text-white text-sm focus:outline-none placeholder:text-[#6B7280] font-normal"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="text-[#9AA1AE] hover:text-white p-1">
                <FiX size={16} />
              </button>
            )}
          </div>

          {/* Category Chips Bar */}
          <div className="flex flex-wrap items-center gap-2 mb-5">
            {CATEGORIES_LIST.map((cat) => {
              const isActive = activeCategory === cat.key;
              return (
                <button
                  key={cat.key}
                  onClick={() => setActiveCategory(cat.key)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                    isActive
                      ? "bg-[#7C5CFF] border-[#7C5CFF] text-white"
                      : "bg-[#13151D] border-white/[0.08] text-[#9AA1AE] hover:text-white hover:border-white/20"
                  }`}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>

          {/* Quick Stats & Sort Toolbar */}
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 mb-5 select-none">
            <span className="text-xs font-semibold text-[#9AA1AE]">
              Showing <strong className="text-white">{filteredSites.length}</strong> directories
            </span>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-[#9AA1AE] font-medium">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-[#13151D] border border-white/[0.08] text-white text-xs font-medium px-3 py-1.5 rounded-xl focus:outline-none focus:border-[#7C5CFF]"
              >
                <option value="popular">Most Popular</option>
                <option value="alpha">Alphabetical (A-Z)</option>
                <option value="newest">Recently Added</option>
              </select>
            </div>
          </div>

          {/* Directory Cards Grid (5-6 columns desktop responsive) */}
          {filteredSites.length === 0 ? (
            <div className="w-full bg-[#13151D] border border-white/[0.08] rounded-[22px] p-10 text-center flex flex-col items-center my-6">
              <FiSearch size={36} className="text-[#9AA1AE] mb-3 animate-pulse" />
              <h3 className="text-white font-semibold text-[18px] mb-1 tracking-tight">No directories found</h3>
              <p className="text-[#9AA1AE] text-xs leading-relaxed mb-4">Try adjusting your search query or category filters.</p>
              <button
                onClick={() => { setSearchQuery(""); setActiveCategory("all"); }}
                className="px-4 py-2 bg-white/[0.05] border border-white/[0.08] text-xs font-semibold text-white rounded-xl hover:border-[#7C5CFF] transition-colors"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-[20px]">
              {filteredSites.map((site) => {
                const isFav = favorites.includes(site.name);
                const initial = site.name.charAt(0).toUpperCase();

                return (
                  <div
                    key={site.id}
                    className="group bg-[#13151D] border border-white/[0.08] hover:border-[#7C5CFF] hover:bg-[#191B24] rounded-[22px] p-4 flex flex-col justify-between h-[185px] transition-all duration-200 relative select-none hover:-translate-y-1"
                    style={{ borderTop: `3px solid ${site.color}` }}
                  >
                    {/* Top Row: Logo Badge + Bookmark Star */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white text-sm shadow-md"
                          style={{ backgroundColor: site.color }}
                        >
                          {initial}
                        </div>
                        {site.recommended && (
                          <span className="px-1.5 py-0.5 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-[9px] font-bold rounded uppercase">
                            Best
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => toggleFavorite(site.name)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          isFav ? "text-yellow-400" : "text-[#9AA1AE] hover:text-white"
                        }`}
                        title={isFav ? "Remove bookmark" : "Add bookmark"}
                      >
                        <FiStar size={16} fill={isFav ? "currentColor" : "none"} />
                      </button>
                    </div>

                    {/* Middle Details: Name, Ranking, Domain, Tags */}
                    <div>
                      <div className="flex items-center justify-between mb-0.5">
                        <h3 className="text-white font-semibold text-[15.5px] tracking-tight truncate max-w-[125px]">
                          {site.name}
                        </h3>
                        <span className="text-[10px] font-mono text-[#7C5CFF] bg-[#7C5CFF]/10 px-1.5 py-0.5 rounded-md font-bold">
                          #{site.rank}
                        </span>
                      </div>

                      <div className="text-[11px] text-[#9AA1AE] truncate mb-2 font-mono">
                        {getDomain(site.url)}
                      </div>

                      {/* Tag Chips */}
                      <div className="flex flex-wrap gap-1">
                        {site.tags.map((tag) => (
                          <span key={tag} className="px-2 py-0.5 bg-white/[0.04] text-[10px] text-textSec font-medium rounded-md">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Bottom CTA Visit Directory Button */}
                    <a
                      href={site.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2 bg-white/[0.04] group-hover:bg-[#7C5CFF] border border-white/[0.08] group-hover:border-[#7C5CFF] text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                    >
                      Visit Directory <FiExternalLink size={13} />
                    </a>
                  </div>
                );
              })}
            </div>
          )}

        </main>

      </div>

    </div>
  );
}
