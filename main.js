// script.js - Final Complete Version

/* =======================================
   1. CONFIGURATION & DOM ELEMENTS
   ======================================= */

const API_KEY = "b41a99ec736e2d064cdc8d167485ee2a";
const BASE_URL = "https://api.themoviedb.org/3";
const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500"; 

// Core DOM Elements
const body = document.body;
const themeToggle = document.getElementById('theme-toggle');
const searchForm = document.getElementById('search-form');
const searchInput = document.getElementById('search-input');
const movieGrid = document.getElementById('movie-grid'); 
const movieModal = document.getElementById('movie-modal');
const modalDetails = document.getElementById('modal-details');
const modalCloseButton = document.getElementById('modal-close');

// Watchlist & Recommendations Elements
const watchlistGrid = document.getElementById('watchlist-grid');
const recommendationsGrid = document.getElementById('recommendations-grid');
const watchlistTitle = document.getElementById('watchlist-title');
const recommendationsTitle = document.getElementById('recommendations-title');

// Side Menu Elements
const menuToggle = document.getElementById('menu-toggle');
const sideMenu = document.getElementById('side-menu');
const menuClose = document.getElementById('menu-close');
const menuCategories = document.getElementById('menu-categories'); 

// Pagination Elements
const paginationControls = document.getElementById('pagination-controls');
const prevPageBtn = document.getElementById('prev-page-btn');
const nextPageBtn = document.getElementById('next-page-btn');
const currentPageDisplay = document.getElementById('current-page-display');

// Section-specific Elements
const trendingSection = document.getElementById('trending-section');
const mainContentHeading = trendingSection ? trendingSection.querySelector('h2') : null;
const topRatedGrid = document.getElementById('top-rated-grid'); 

// Pagination State & Global Cache
let currentPage = 1;
let totalPages = 1;
let lastEndpoint = '/trending/movie/week'; 
let lastQuery = ''; 
let genreList = {};


/* =======================================
   2. THEME, MENU, MODAL LOGIC 
   ======================================= */

function loadTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light-mode') {
        body.classList.add('light-mode');
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    } else {
        themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
    }
}

function toggleTheme() {
    body.classList.toggle('light-mode');
    if (body.classList.contains('light-mode')) {
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        localStorage.setItem('theme', 'light-mode');
    } else {
        themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
        localStorage.setItem('theme', '');
    }
}

function openMenu() {
    sideMenu.classList.add('active'); 
    document.body.style.overflow = 'hidden';
}

function closeMenu() {
    sideMenu.classList.remove('active'); 
    document.body.style.overflow = 'auto';
}

function handleMenuLink(endpoint) {
    closeMenu();
    lastQuery = '';
    currentPage = 1;
    lastEndpoint = endpoint;
    fetchContent(endpoint);
}

function hideModal() {
    movieModal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

/* =======================================
   3. API FETCH FUNCTIONS (CONTENT & SECTIONS)
   ======================================= */

async function fetchGenres() {
    const url = `${BASE_URL}/genre/movie/list?api_key=${API_KEY}`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        
        data.genres.forEach(genre => {
            genreList[genre.id] = genre.name;
        });
        
        const genreLinks = data.genres.map(genre => `
            <li><a href="#" data-endpoint="/discover/movie?with_genres=${genre.id}"><i class="fas fa-film"></i> ${genre.name}</a></li>
        `).join('');
        
        if (menuCategories) {
            menuCategories.innerHTML += genreLinks;
        
            menuCategories.querySelectorAll('a[data-endpoint]').forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const endpoint = link.getAttribute('data-endpoint');
                    if (endpoint) handleMenuLink(endpoint);
                });
            });
        }
    } catch (error) {
        console.error("Error fetching genres:", error);
    }
}

async function fetchMovieDetails(movieId) {
    const url = `${BASE_URL}/movie/${movieId}?api_key=${API_KEY}`;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Could not fetch movie details.');
        return await response.json();
    } catch (error) {
        console.error("Detail fetch error:", error);
        return null;
    }
}

async function fetchContent(endpoint, query = '') {
    if (!movieGrid || !mainContentHeading) return;

    movieGrid.innerHTML = '<p class="info-message">Loading content...</p>';
    
    // Set the heading based on the current action
    if (query) {
        mainContentHeading.textContent = `Search Results for "${query}"`;
    } else if (endpoint.includes('discover')) {
        const genreId = endpoint.split('with_genres=')[1];
        mainContentHeading.textContent = `Category: ${genreList[genreId] || 'Movies'}`;
    } else if (endpoint.includes('/movie/popular')) {
         mainContentHeading.textContent = 'Popular Movies';
    } else if (endpoint.includes('/movie/top_rated')) {
         mainContentHeading.textContent = 'Top Rated';
    } else if (endpoint.includes('/movie/upcoming')) {
         mainContentHeading.textContent = 'Upcoming Movies';
    } else {
        mainContentHeading.textContent = 'Trending Now';
    }

    let url;
    let isSearch = endpoint.includes('/search/movie');
    const isTrending = endpoint === '/trending/movie/week';
    
    // --- GENRE LINK URL CONSTRUCTION FIX ---
    if (isSearch) {
        // Standard search URL construction
        url = `${BASE_URL}${endpoint}?api_key=${API_KEY}&query=${encodeURIComponent(query)}&page=${currentPage}`;
    } else {
        // DISCOVER/CATEGORY URL CONSTRUCTION FIX
        url = `${BASE_URL}${endpoint}`;
        
        // Append API key and page parameter correctly
        if (endpoint.includes('?')) {
            // If endpoint already has '?', append with '&'
            url += `&api_key=${API_KEY}&page=${currentPage}`;
        } else {
            // If no '?', start with '?'
            url += `?api_key=${API_KEY}&page=${currentPage}`;
        }
    }
    // --- END FIX ---

    lastEndpoint = endpoint;
    lastQuery = query;

    try {
        const response = await fetch(url);
        
        if (!response.ok) {
            if (response.status === 401) {
                throw new Error("401: Invalid API Key or Unauthorized Access.");
            }
            throw new Error(`HTTP Error! Status: ${response.status}`);
        }
        
        const data = await response.json();
        
        currentPage = data.page;
        totalPages = data.total_pages;
        updatePaginationControls();

        if (isTrending) { 
            localStorage.setItem('cachedMovies', JSON.stringify(data.results));
        }

        displayMovies(data.results, movieGrid, true); 
    } catch (error) {
        console.error("Fetch Content Error:", error);
        
        if (isTrending) {
             loadCachedMovies();
        } else if (String(error).includes("401")) {
             movieGrid.innerHTML = `<p class="error-message">ERROR: Invalid API Key. Please check the 'API_KEY' variable in script.js.</p>`;
        } else {
             movieGrid.innerHTML = `<p class="error-message">Failed to load content. Please check your network connection.</p>`;
        }
    }
}

function loadCachedMovies() {
    const cachedData = localStorage.getItem('cachedMovies');
    if (cachedData) {
        const movies = JSON.parse(cachedData);
        mainContentHeading.textContent = 'Trending (Cached Offline)';
        displayMovies(movies, movieGrid, true);
        updatePaginationControls(true); 
    } else {
        movieGrid.innerHTML = `<p class="info-message">Could not load trending movies. Connect to the internet to fetch data.</p>`;
    }
}

async function fetchTopRated() {
    if (!topRatedGrid) return;
    
    const url = `${BASE_URL}/movie/top_rated?api_key=${API_KEY}`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        
        displayMovies(data.results.slice(0, 8), topRatedGrid, true); 
    } catch (error) {
        console.error("Error fetching top rated:", error);
    }
}


/* =======================================
   4. WATCHLIST & RECOMMENDATION LOGIC
   ======================================= */

function getWatchlist() {
    const watchlist = localStorage.getItem('cineMuseWatchlist');
    return watchlist ? JSON.parse(watchlist) : [];
}

function saveWatchlist(watchlist) {
    localStorage.setItem('cineMuseWatchlist', JSON.stringify(watchlist));
    displayWatchlist(); 
}

function addToWatchlist(movieData) {
    let watchlist = getWatchlist();
    if (!watchlist.some(m => m.id === movieData.id)) {
        watchlist.push(movieData);
        saveWatchlist(watchlist);
        alert(`${movieData.title} added to your Watchlist!`);
        generateRecommendations();
    } else {
        alert(`${movieData.title} is already in your Watchlist.`);
    }
}

function removeFromWatchlist(movieId) {
    let watchlist = getWatchlist();
    const updatedWatchlist = watchlist.filter(m => m.id !== movieId);
    saveWatchlist(updatedWatchlist);
    alert('Movie removed from Watchlist.');
    generateRecommendations(); 
}

function displayWatchlist() {
    const watchlist = getWatchlist();
    
    if (watchlist.length > 0) {
        watchlistTitle.style.display = 'block';
        displayMovies(watchlist, watchlistGrid, false, true); 
    } else {
        watchlistTitle.style.display = 'none';
        watchlistGrid.innerHTML = '<p class="info-message">Your watchlist is currently empty. Add some movies!</p>';
    }
}

async function generateRecommendations() {
    const watchlist = getWatchlist();
    recommendationsGrid.innerHTML = '';
    
    if (watchlist.length === 0) {
        recommendationsTitle.style.display = 'none';
        return;
    }
    
    recommendationsTitle.style.display = 'block';

    const watchlistGenres = new Set();
    watchlist.forEach(movie => {
        if (movie.genres) {
            movie.genres.forEach(genre => watchlistGenres.add(genre.id));
        } else if (movie.genre_ids) {
            movie.genre_ids.forEach(id => watchlistGenres.add(id));
        }
    });

    if (watchlistGenres.size === 0) {
         recommendationsGrid.innerHTML = '<p class="info-message">No genre data available for recommendations.</p>';
         return;
    }

    const trendingUrl = `${BASE_URL}/discover/movie?api_key=${API_KEY}&sort_by=popularity.desc`;
    try {
        const response = await fetch(trendingUrl);
        const data = await response.json();
        const allPopularMovies = data.results;

        const recommendedMovies = allPopularMovies
            .filter(movie => {
                const isInWatchlist = watchlist.some(w => w.id === movie.id);
                if (isInWatchlist) return false;

                if (movie.genre_ids) {
                    return movie.genre_ids.some(genreId => watchlistGenres.has(genreId));
                }
                return false;
            })
            .slice(0, 8); 

        if (recommendedMovies.length > 0) {
            displayMovies(recommendedMovies, recommendationsGrid, true, false);
        } else {
             recommendationsGrid.innerHTML = '<p class="info-message">Could not find suitable recommendations.</p>';
        }

    } catch (error) {
        console.error("Recommendation fetch error:", error);
    }
}

/* =======================================
   5. MOVIE DISPLAY FUNCTIONS
   ======================================= */

function displayMovies(movies, container, showAdd = true, showRemove = false) {
    if (container !== movieGrid) container.innerHTML = '';

    if (!movies || movies.length === 0) {
        if (container !== movieGrid) container.innerHTML = '<p class="info-message">No content to display.</p>';
        return;
    }

    let cardsHtml = '';
    movies.forEach(movie => {
        if (movie.poster_path) {
            
            let actionButtonHTML = '';
            if (showAdd) {
                 actionButtonHTML = `
                    <button class="card-action-btn add-btn" data-movie-id="${movie.id}">
                        <i class="fas fa-plus"></i> Watchlist
                    </button>`;
            } else if (showRemove) {
                 actionButtonHTML = `
                    <button class="card-action-btn remove-btn" data-movie-id="${movie.id}">
                        <i class="fas fa-trash"></i> Remove
                    </button>`;
            }
            
            cardsHtml += `
                <div class="movie-card" data-movie-id="${movie.id}">
                    <img src="${IMAGE_BASE_URL}${movie.poster_path}" alt="${movie.title} Poster">
                    <div class="card-info">
                        <div>
                            <h3>${movie.title}</h3>
                            <p>${movie.release_date ? movie.release_date.substring(0, 4) : 'N/A'}</p>
                        </div>
                        ${actionButtonHTML}
                    </div>
                </div>
            `;
        }
    });
    
    container.innerHTML = cardsHtml;

    // Attach listeners for modal open
    container.querySelectorAll('.movie-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.card-action-btn')) {
                 const movieId = parseInt(card.getAttribute('data-movie-id'));
                 if (movieId) showMovieDetails(movieId);
            }
        });
    });
    
    // Attach listeners for 'Add' buttons
    container.querySelectorAll('.add-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
            e.stopPropagation();
            const movieId = parseInt(e.target.closest('button').getAttribute('data-movie-id'));
            const movieDetails = await fetchMovieDetails(movieId);
            if(movieDetails) {
                 addToWatchlist(movieDetails);
            }
        });
    });
    
    // Attach listeners for 'Remove' buttons
    container.querySelectorAll('.remove-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const movieId = parseInt(e.target.closest('button').getAttribute('data-movie-id'));
            removeFromWatchlist(movieId);
        });
    });
}

/* =======================================
   6. MODAL LOGIC (FINAL VERIFIED)
   ======================================= */

async function showMovieDetails(movieId) {
    const details = await fetchMovieDetails(movieId);
    
    if (details) {
        const modalContentHTML = `
            <div class="modal-poster">
                <img src="${IMAGE_BASE_URL}${details.poster_path}" alt="${details.title} Poster">
            </div>
            <div class="modal-text">
                <h2>${details.title} (${details.release_date.substring(0, 4)})</h2>
                <p class="tagline">${details.tagline || ''}</p>
                <p><strong>Rating:</strong> ${details.vote_average.toFixed(1)}/10 (${details.vote_count} votes)</p>
                <p><strong>Runtime:</strong> ${details.runtime} minutes</p>
                <p><strong>Genres:</strong> ${details.genres.map(g => g.name).join(', ')}</p>
                <p class="overview">${details.overview}</p>
                <button class="card-action-btn add-to-watchlist-modal" data-movie-id="${details.id}">
                    <i class="fas fa-plus"></i> Add to Watchlist
                </button>
            </div>
        `;
        
        modalDetails.innerHTML = modalContentHTML;
        movieModal.style.display = 'flex'; 
        document.body.style.overflow = 'hidden'; 
        
        document.querySelector('.add-to-watchlist-modal').addEventListener('click', () => {
             addToWatchlist(details);
        });
    }
}


/* =======================================
   7. PAGINATION LOGIC
   ======================================= */

function updatePaginationControls(forceHide = false) {
    const shouldHide = forceHide || totalPages <= 1 || lastQuery !== '';

    if (!shouldHide) {
        paginationControls.style.display = 'flex';
        currentPageDisplay.textContent = `Page ${currentPage} of ${totalPages}`;
        
        prevPageBtn.disabled = currentPage === 1;
        nextPageBtn.disabled = currentPage === totalPages;
        
        prevPageBtn.style.opacity = currentPage === 1 ? 0.5 : 1;
        nextPageBtn.style.opacity = currentPage === totalPages ? 0.5 : 1;
    } else {
        paginationControls.style.display = 'none';
    }
}

function changePage(delta) {
    const newPage = currentPage + delta;
    if (newPage >= 1 && newPage <= totalPages) {
        currentPage = newPage;
        if (lastQuery) {
            fetchContent('/search/movie', lastQuery);
        } else {
            fetchContent(lastEndpoint);
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}


/* =======================================
   8. SEARCH SUGGESTIONS & DEBOUNCE LOGIC
   ======================================= */

const debounce = (func, delay) => {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };
};

const searchSuggestions = document.createElement('div');
searchSuggestions.id = 'search-suggestions';
searchForm.appendChild(searchSuggestions);

async function fetchSuggestions(query) {
    if (query.length < 3) {
        searchSuggestions.innerHTML = '';
        return;
    }

    const url = `${BASE_URL}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(query)}`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        
        searchSuggestions.innerHTML = '';
        
        data.results.slice(0, 5).forEach(movie => {
            const item = document.createElement('div');
            item.className = 'suggestion-item';
            item.textContent = `${movie.title} (${movie.release_date ? movie.release_date.substring(0, 4) : 'N/A'})`;
            
            item.addEventListener('click', () => {
                searchInput.value = movie.title;
                searchSuggestions.innerHTML = '';
                searchForm.dispatchEvent(new Event('submit'));
            });
            searchSuggestions.appendChild(item);
        });

    } catch (error) {
        console.error("Suggestion fetch error:", error);
    }
}

const debouncedFetchSuggestions = debounce(fetchSuggestions, 300);


/* =======================================
   9. INITIALIZATION & EVENT LISTENERS
   ======================================= */

// Load theme preference on startup
loadTheme();

// --- THEME TOGGLE LISTENER FIX ---
if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme); 
}
// ---------------------------------

// --- MODAL CLOSING LISTENERS ---
if (modalCloseButton && movieModal) {
    modalCloseButton.addEventListener('click', hideModal);
    movieModal.addEventListener('click', (e) => {
        if (e.target === movieModal) { 
            hideModal();
        }
    });
}

// --- SIDE MENU LISTENERS ---
if (menuToggle && menuClose && sideMenu) {
    menuToggle.addEventListener('click', openMenu);
    menuClose.addEventListener('click', closeMenu);
    sideMenu.addEventListener('click', (e) => {
        if (e.target === sideMenu) closeMenu();
    });
}

// --- STATIC MENU LINKS ---
document.getElementById('view-watchlist-link').addEventListener('click', (e) => {
    e.preventDefault();
    closeMenu();
    document.getElementById('watchlist-title').scrollIntoView({ behavior: 'smooth' });
});

document.getElementById('view-recommendations-link').addEventListener('click', (e) => {
    e.preventDefault();
    closeMenu();
    document.getElementById('recommendations-title').scrollIntoView({ behavior: 'smooth' });
});

// --- PAGINATION LISTENERS ---
if (prevPageBtn && nextPageBtn) {
    prevPageBtn.addEventListener('click', () => changePage(-1));
    nextPageBtn.addEventListener('click', () => changePage(1));
}

// --- SEARCH LISTENERS ---
searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const query = searchInput.value.trim();
    if (query) {
        searchSuggestions.innerHTML = ''; 
        lastQuery = query;
        currentPage = 1;
        fetchContent('/search/movie', query);
    }
});

searchInput.addEventListener('input', (e) => {
    debouncedFetchSuggestions(e.target.value);
});


// FINAL INITIAL LOAD
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Load secondary data first (genres, watchlist, recommendations, top rated)
    await fetchGenres(); 
    displayWatchlist(); 
    generateRecommendations(); 
    fetchTopRated();
    
    // 2. Load primary content last (Trending, with cache fallback)
    fetchContent('/trending/movie/week'); 
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/service-worker.js")
      .then(reg => console.log("Service Worker registered:", reg.scope))
      .catch(err => console.log("Service Worker failed:", err));
  });
}