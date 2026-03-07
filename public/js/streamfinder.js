/* ═══════════════════════════════════════════════════════════════════
   StreamFinder – Free Streaming Sites Directory
   No API · Pure Client-Side · Netflix-Style UI
   ═══════════════════════════════════════════════════════════════════ */
(() => {
'use strict';

// ── Streaming Sites Data ───────────────────────────────────────────
const SITES = [
    { name: '1Shows',       url: 'https://www.1shows.nl/',           color: '#e50914', tags: ['Movies', 'TV Shows'] },
    { name: '1Flex',        url: 'https://www.1flex.nl/',            color: '#ff6b35', tags: ['Movies', 'Web Series'] },
    { name: 'RgShows',      url: 'https://www.rgshows.ru/',          color: '#00d4aa', tags: ['Movies', 'TV Shows'] },
    { name: 'AlienFlix',    url: 'https://alienflix.net/',            color: '#7b2ff7', tags: ['Movies', 'Anime'] },
    { name: 'Cinegram',     url: 'https://cinegram.net/home',        color: '#ff2d55', tags: ['Movies', 'TV Shows'] },
    { name: 'FlickyStream', url: 'https://flickystream.nu/',         color: '#00bfff', tags: ['Movies', 'Web Series'] },
    { name: 'RiveStream',   url: 'https://rivestream.org/',          color: '#39ff14', tags: ['Movies', 'TV Shows'] },
    { name: 'CinemaBZ',     url: 'https://cinema.bz/',               color: '#ff9500', tags: ['Movies', 'Classics'] },
    { name: 'Spenflix',     url: 'https://watch.spencerdevs.xyz/',   color: '#e50914', tags: ['Movies', 'TV Shows'] },
    { name: 'FilmCave',     url: 'https://filmcave.ru/',             color: '#8b5cf6', tags: ['Movies', 'Web Series'] },
    { name: 'Corsflix',     url: 'https://watch.corsflix.net/',       color: '#06b6d4', tags: ['Movies', 'TV Shows'] },
    { name: 'StreamX',      url: 'https://streamex.net/',            color: '#f43f5e', tags: ['Movies', 'Live TV'] },
    { name: 'Filmex',       url: 'https://filmex.to/',               color: '#eab308', tags: ['Movies', 'TV Shows'] },
    { name: 'Cinezo',       url: 'https://www.cinezo.net/',          color: '#22c55e', tags: ['Movies', 'Web Series'] },
    { name: 'Cineby',       url: 'https://www.cineby.gd/',           color: '#3b82f6', tags: ['Movies', 'TV Shows'] },
    { name: 'MyFlixerz',    url: 'https://myflixerz.to/',            color: '#a855f7', tags: ['Movies', 'Trending'] },
    { name: 'SFlix',        url: 'https://sflix.fi/',                 color: '#ef4444', tags: ['Movies', 'TV Shows'] },
    { name: 'Hdtodayz',     url: 'https://hdtodayz.to/',             color: '#14b8a6', tags: ['HD Movies', 'TV Shows'] },
    { name: 'Nepu',         url: 'https://nepu.to/',                  color: '#f97316', tags: ['Movies', 'Anime'] },
    { name: 'FMovies',      url: 'https://fmovies-hd.to/home/',     color: '#6366f1', tags: ['Movies', 'TV Shows'] },
    { name: 'Wooflix',      url: 'https://nunflix.li/',               color: '#ec4899', tags: ['Movies', 'Web Series'] },
    { name: 'Xprime',       url: 'https://xprime.stream/',           color: '#10b981', tags: ['Movies', 'Sports'] },
    { name: 'Hexa',         url: 'https://hexa.su/',                  color: '#8b5cf6', tags: ['Movies', 'TV Shows'] },
    { name: 'SmashyStream', url: 'https://smashystream.xyz/',        color: '#f59e0b', tags: ['Movies', 'Live TV'] },
    { name: 'Flixway',      url: 'https://flixway.pro/',             color: '#06b6d4', tags: ['Movies', 'Web Series'] },
];

// ── State ──────────────────────────────────────────────────────────
const favorites = new Set(JSON.parse(localStorage.getItem('sf-favorites') || '[]'));

// ── Helpers ────────────────────────────────────────────────────────
function esc(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
}
const $ = id => document.getElementById(id);

function saveFavorites() {
    localStorage.setItem('sf-favorites', JSON.stringify([...favorites]));
}

// ── Render Site Card ───────────────────────────────────────────────
function siteCardHTML(site, index) {
    const isFav = favorites.has(site.name);
    const initial = site.name.charAt(0).toUpperCase();
    const safeUrl = esc(site.url);
    const safeName = esc(site.name);

    // Extract short domain for display
    let domain = '';
    try { domain = new URL(site.url).hostname; } catch (_) { domain = site.url; }

    const tagsHTML = site.tags.map(t => `<span class="sf-card-tag">${esc(t)}</span>`).join('');

    return `<div class="sf-site-card" style="--card-accent: ${site.color}" data-name="${safeName}" data-index="${index}">
        <div class="sf-card-top">
            <div class="sf-card-icon">${initial}</div>
            <div>
                <div class="sf-card-name">${safeName}</div>
                <div class="sf-card-number">#${index + 1} of ${SITES.length}</div>
            </div>
        </div>
        <div class="sf-card-url">${esc(domain)}</div>
        <div class="sf-card-tags">${tagsHTML}</div>
        <div class="sf-card-actions">
            <a href="${safeUrl}" target="_blank" rel="noopener noreferrer" class="sf-card-visit">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                Visit Site
            </a>
            <button class="sf-card-fav${isFav ? ' active' : ''}" data-site="${safeName}" title="${isFav ? 'Remove from favorites' : 'Add to favorites'}">
                ${isFav ? '★' : '☆'}
            </button>
        </div>
    </div>`;
}

// ── Render Grid ────────────────────────────────────────────────────
function renderSites(container, sites) {
    const el = typeof container === 'string' ? $(container) : container;
    if (!el) return;
    el.innerHTML = sites.map((s, i) => siteCardHTML(s, SITES.indexOf(s))).join('');

    // Attach favorite button listeners
    el.querySelectorAll('.sf-card-fav').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const name = btn.dataset.site;
            if (favorites.has(name)) {
                favorites.delete(name);
                btn.classList.remove('active');
                btn.innerHTML = '☆';
                btn.title = 'Add to favorites';
            } else {
                favorites.add(name);
                btn.classList.add('active');
                btn.innerHTML = '★';
                btn.title = 'Remove from favorites';
            }
            saveFavorites();
        });
    });
}

function renderAllSites() {
    renderSites('sitesGrid', SITES);
    $('sitesCount').textContent = `Showing ${SITES.length} sites`;
}

function renderFavorites() {
    const favSites = SITES.filter(s => favorites.has(s.name));
    const grid = $('favoritesGrid');
    const empty = $('favEmpty');

    if (!favSites.length) {
        grid.innerHTML = '';
        empty.style.display = 'block';
        $('favCount').textContent = '';
    } else {
        empty.style.display = 'none';
        renderSites(grid, favSites);
        $('favCount').textContent = `${favSites.length} site${favSites.length > 1 ? 's' : ''}`;
    }
}

// ── Search ─────────────────────────────────────────────────────────
function handleSearch(query) {
    const q = query.trim().toLowerCase();
    const allSection = $('sites');
    const noResults = $('noResults');

    if (!q) {
        renderAllSites();
        noResults.style.display = 'none';
        return;
    }

    const filtered = SITES.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.url.toLowerCase().includes(q) ||
        s.tags.some(t => t.toLowerCase().includes(q))
    );

    if (filtered.length) {
        noResults.style.display = 'none';
        renderSites('sitesGrid', filtered);
        $('sitesCount').textContent = `Showing ${filtered.length} of ${SITES.length} sites`;
    } else {
        $('sitesGrid').innerHTML = '';
        noResults.style.display = 'block';
        $('sitesCount').textContent = '0 results';
    }
}

// ── Section Switching ──────────────────────────────────────────────
function switchView(filter) {
    const allSection = $('sites');
    const favSection = $('favoritesSection');

    document.querySelectorAll('.sf-filter-btn').forEach(link => {
        link.classList.toggle('active', link.dataset.filter === filter);
    });

    if (filter === 'favorites') {
        allSection.style.display = 'none';
        favSection.style.display = 'block';
        $('sectionTitle').textContent = 'My Favorite Sites';
        renderFavorites();
    } else {
        allSection.style.display = 'block';
        favSection.style.display = 'none';
        $('sectionTitle').textContent = 'All Streaming Sites';
        renderAllSites();
    }
}

// ── Event Listeners ────────────────────────────────────────────────
function setupEvents() {
    // Nav scroll (transparent → solid on scroll)
    const nav = document.getElementById('main-nav');
    if (nav) {
        window.addEventListener('scroll', () => {
            nav.classList.toggle('scrolled', window.scrollY > 40);
        }, { passive: true });
    }

    // Search toggle
    $('searchToggle').addEventListener('click', () => {
        const box = $('searchBox');
        box.classList.toggle('open');
        if (box.classList.contains('open')) {
            $('searchInput').focus();
        } else {
            $('searchInput').value = '';
            handleSearch('');
        }
    });

    // Search input
    $('searchInput').addEventListener('input', e => handleSearch(e.target.value));

    // Filter buttons
    document.querySelectorAll('.sf-filter-btn').forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            const filter = link.dataset.filter;
            if (filter) switchView(filter);
        });
    });

    // Keyboard
    document.addEventListener('keydown', e => {
        if (e.key === '/' && document.activeElement.tagName !== 'INPUT') {
            e.preventDefault();
            $('searchBox').classList.add('open');
            $('searchInput').focus();
        }
        if (e.key === 'Escape') {
            $('searchBox').classList.remove('open');
            $('searchInput').value = '';
            handleSearch('');
        }
    });
}

// ── Init ───────────────────────────────────────────────────────────
function init() {
    setupEvents();
    renderAllSites();
}

init();

})();
