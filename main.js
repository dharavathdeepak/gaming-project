// Game data from multiple APIs integrated for massive game library
let gameData = {};
let allGames = [];
let displayedGames = [];
let currentPage = 1;
let gamesPerPage = 24;
let currentCategory = 'all';
let currentFilteredGames = [];

// API integration functions - Enhanced to load thousands of games
async function fetchGamePixGames() {
    try {
        const totalPages = 25; // Increased to get more games
        const allGames = [];
        let consecutiveFailures = 0;
        
        console.log('🎮 Loading GamePix games...');
        
        for (let page = 1; page <= totalPages; page++) {
            try {
                console.log(`📄 Fetching GamePix page ${page}/${totalPages}...`);
                const response = await fetch(`https://feeds.gamepix.com/v2/json?sid=447G4&pagination=96&page=${page}`, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();
                
                if (data.items && Array.isArray(data.items) && data.items.length > 0) {
                    let validGamesOnPage = 0;
                    
                    data.items.forEach(game => {
                        if (game.title && game.url && !gameData[game.title]) {
                            const gameUrl = game.url.includes('?sid=') ? game.url : `${game.url}?sid=447G4`;
                            
                            gameData[game.title] = {
                                source: 'gamepix',
                                id: game.id,
                                url: gameUrl,
                                category: capitalizeFirst(game.category || getRandomCategory()),
                                rating: Math.round((game.quality_score || 0.8) * 5 * 10) / 10,
                                plays: generatePlayCount(),
                                description: game.description || `Play ${game.title} - an exciting ${game.category || 'action'} game with amazing gameplay!`,
                                tags: extractTags(game.description || '', game.category || 'action'),
                                thumb: game.banner_image || game.image || `https://img.gamepix.com/games/${game.namespace}/cover/${game.namespace}.png?w=320`,
                                width: game.width || 800,
                                height: game.height || 600,
                                orientation: game.orientation || 'landscape'
                            };
                            allGames.push(game.title);
                            validGamesOnPage++;
                        }
                    });
                    
                    console.log(`✅ Page ${page}: Found ${validGamesOnPage} valid games`);
                    consecutiveFailures = 0;
                    
                    if (validGamesOnPage === 0 && page > 5) {
                        console.log('📄 No more new games found, stopping early');
                        break;
                    }
                } else {
                    consecutiveFailures++;
                    console.warn(`⚠️ Page ${page}: No games found`);
                    
                    if (consecutiveFailures >= 3) {
                        console.log('📄 Too many consecutive failures, stopping');
                        break;
                    }
                }
                
                // Add small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 100));
                
            } catch (error) {
                consecutiveFailures++;
                console.warn(`❌ Error fetching GamePix page ${page}:`, error.message);
                
                if (consecutiveFailures >= 5) {
                    console.log('📄 Too many errors, stopping GamePix fetch');
                    break;
                }
            }
        }
        
        console.log(`🎮 GamePix: Successfully loaded ${allGames.length} games`);
        return allGames;
    } catch (error) {
        console.error('GamePix API connection failed:', error.message);
        return [];
    }
}

async function fetchGameMonetizeGames() {
    try {
        const allGames = [];
        
        console.log('🎮 Loading GameMonetize games...');
        
        // Try multiple pages of the main feed
        const maxPages = 10;
        for (let page = 1; page <= maxPages; page++) {
            try {
                console.log(`📄 Fetching GameMonetize page ${page}/${maxPages}...`);
                const response = await fetch(`https://gamemonetize.com/feed.php?format=1&page=${page}`, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/xml, text/xml, application/rss+xml, */*',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                });
                
                if (!response.ok) {
                    console.warn(`HTTP ${response.status} for GameMonetize page ${page}`);
                    continue;
                }
                
                const xmlText = await response.text();
                
                // Parse XML/RSS feed
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
                const items = xmlDoc.querySelectorAll('item');
                
                if (items.length === 0) {
                    console.warn(`No items found on page ${page}`);
                    continue;
                }
                
                let validGamesFromPage = 0;
                
                items.forEach(item => {
                    const title = getTextContent(item, 'title');
                    const url = getTextContent(item, 'url');
                    const category = getTextContent(item, 'category');
                    const description = getTextContent(item, 'description');
                    const thumb = getTextContent(item, 'thumb');
                    const width = parseInt(getTextContent(item, 'width')) || 800;
                    const height = parseInt(getTextContent(item, 'height')) || 600;
                    
                    if (title && url && !gameData[title]) {
                        gameData[title] = {
                            source: 'gamemonetize',
                            id: getTextContent(item, 'id'),
                            url: url,
                            category: capitalizeFirst(category || getRandomCategory()),
                            rating: Math.round((Math.random() * 1.5 + 3.5) * 10) / 10, // 3.5-5.0
                            plays: generatePlayCount(),
                            description: description || `Play ${title} - an exciting HTML5 game with great graphics and smooth gameplay!`,
                            tags: extractTags(description || '', category || 'action'),
                            thumb: thumb || `https://img.gamemonetize.com/default/512x384.jpg`,
                            width: width,
                            height: height,
                            type: getTextContent(item, 'type'),
                            instructions: getTextContent(item, 'instructions')
                        };
                        allGames.push(title);
                        validGamesFromPage++;
                    }
                });
                
                console.log(`✅ GameMonetize page ${page}: Found ${validGamesFromPage} valid games`);
                
                if (validGamesFromPage === 0) {
                    console.log('📄 No more games found, stopping GameMonetize pagination');
                    break;
                }
                
                // Add delay between requests
                await new Promise(resolve => setTimeout(resolve, 200));
                
            } catch (error) {
                console.warn(`❌ Error fetching GameMonetize page ${page}:`, error.message);
            }
        }
        
        console.log(`🎮 GameMonetize: Successfully loaded ${allGames.length} games`);
        return allGames;
    } catch (error) {
        console.error('GameMonetize API connection failed:', error.message);
        return [];
    }
}

// Helper function to get text content from XML element
function getTextContent(parent, tagName) {
    const element = parent.querySelector(tagName);
    return element ? element.textContent.trim() : '';
}

function getRandomCategory() {
    const categories = ['Action', 'Puzzle', 'Racing', 'Sports', 'Shooter', 'Adventure', 'Arcade', 'Strategy', 'Fighting', 'Simulation', 'Clicker', 'Educational', 'Platform', 'RPG'];
    return categories[Math.floor(Math.random() * categories.length)];
}

function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function generatePlayCount() {
    const counts = ['125K', '250K', '500K', '750K', '1M', '1.5M', '2M', '2.5M', '3M', '4M', '5M'];
    return counts[Math.floor(Math.random() * counts.length)];
}

function extractTags(description, category) {
    const commonTags = {
        'action': ['Action', 'Fast-paced', 'Exciting'],
        'puzzle': ['Puzzle', 'Logic', 'Brain', 'Strategy'],
        'racing': ['Racing', 'Speed', 'Cars', 'Fast'],
        'shooter': ['Shooter', 'Combat', 'Action', 'Weapons'],
        'sports': ['Sports', 'Athletic', 'Competition'],
        'adventure': ['Adventure', 'Exploration', 'Journey'],
        'arcade': ['Arcade', 'Classic', 'Retro', 'Fun'],
        'fighting': ['Fighting', 'Combat', 'Battle'],
        'simulation': ['Simulation', 'Realistic', 'Strategy'],
        'clicker': ['Clicker', 'Idle', 'Incremental'],
        'educational': ['Educational', 'Learning', 'Knowledge']
    };
    
    const baseTags = commonTags[category.toLowerCase()] || ['Game', 'Fun', 'Entertainment'];
    
    // Add some randomness
    const extraTags = ['Addictive', 'Challenging', 'Relaxing', 'Multiplayer', 'Single Player'];
    const randomTag = extraTags[Math.floor(Math.random() * extraTags.length)];
    
    return [...baseTags.slice(0, 3), randomTag];
}

// Game Player functionality
class GamePlayer {
    constructor() {
        this.currentGame = null;
        this.isFullscreen = false;
        this.initializeElements();
        this.bindEvents();
    }

    initializeElements() {
        this.gamePlayer = document.getElementById('gamePlayer');
        this.gameModal = document.getElementById('gameModal');
        this.gameIframe = document.getElementById('gameIframe');
        this.gameLoading = document.getElementById('gameLoading');
        this.gamePlayerTitle = document.getElementById('gamePlayerTitle');
        this.gamePlayerCategory = document.getElementById('gamePlayerCategory');
        
        // Modal elements
        this.modalGameTitle = document.getElementById('modalGameTitle');
        this.modalGameCategory = document.getElementById('modalGameCategory');
        this.modalGameRating = document.getElementById('modalGameRating');
        this.modalGamePlays = document.getElementById('modalGamePlays');
        this.modalGameDescription = document.getElementById('modalGameDescription');
        this.modalGameTags = document.getElementById('modalGameTags');
        this.playGameBtn = document.getElementById('playGameBtn');
    }

    bindEvents() {
        // Close game player
        document.getElementById('closeGame').addEventListener('click', () => {
            this.closeGame();
        });

        // Close modal
        document.getElementById('closeModal').addEventListener('click', () => {
            this.closeModal();
        });

        // Game controls
        document.getElementById('gameFullscreen').addEventListener('click', () => {
            this.toggleFullscreen();
        });

        document.getElementById('gameReload').addEventListener('click', () => {
            this.reloadGame();
        });

        document.getElementById('gameFavorite').addEventListener('click', () => {
            this.toggleFavorite();
        });

        // Like button
        document.getElementById('gameLike').addEventListener('click', () => {
            this.toggleLike(window.currentGameName);
        });

        // Dislike button
        document.getElementById('gameDislike').addEventListener('click', () => {
            this.toggleDislike(window.currentGameName);
        });

        // Report button
        document.getElementById('gameReport').addEventListener('click', () => {
            this.showReportModal();
        });

        // Report modal events
        document.getElementById('closeReportModal').addEventListener('click', () => {
            this.closeReportModal();
        });

        document.getElementById('cancelReport').addEventListener('click', () => {
            console.log('Cancel report button clicked');
            this.closeReportModal();
        });

        document.getElementById('submitReport').addEventListener('click', () => {
            this.submitReport();
        });

        // Modal play button
        this.playGameBtn.addEventListener('click', () => {
            this.playCurrentGame();
        });

        // Escape key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (!this.gamePlayer.classList.contains('hidden')) {
                    this.closeGame();
                } else if (!this.gameModal.classList.contains('hidden')) {
                    this.closeModal();
                }
            }
        });

        // Iframe load event
        this.gameIframe.addEventListener('load', () => {
            this.hideLoading();
        });
    }

    showGameDetails(gameName) {
        const game = gameData[gameName];
        if (!game) {
            console.error('Game not found:', gameName);
            this.showNotification('Game details not available yet!');
            return;
        }

        this.currentGame = { name: gameName, ...game };

        // Update modal content
        this.modalGameTitle.textContent = gameName;
        this.modalGameCategory.textContent = game.category;
        this.modalGameRating.textContent = game.rating;
        this.modalGamePlays.textContent = game.plays + ' plays';
        this.modalGameDescription.textContent = game.description;

        // Update tags
        this.modalGameTags.innerHTML = game.tags.map(tag => 
            `<span class="bg-game-primary/20 text-game-primary px-3 py-1 rounded-full text-sm">${tag}</span>`
        ).join('');

        // Show modal
        this.gameModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    closeModal() {
        this.gameModal.classList.add('hidden');
        document.body.style.overflow = '';
    }

    playCurrentGame() {
        if (!this.currentGame) return;

        this.closeModal();
        this.startGame(this.currentGame.name, this.currentGame.url);
    }

    startGame(gameName, gameUrl) {
        // Update player info
        this.gamePlayerTitle.textContent = gameName;
        this.gamePlayerCategory.textContent = gameData[gameName]?.category || 'Game';

        // Set current game
        this.currentGame = { name: gameName, url: gameUrl, ...gameData[gameName] };

        // Store current game name globally for event handlers
        window.currentGameName = gameName;
        
        // Load game state (likes, dislikes, favorites)
        this.loadGameState(gameName);

        // Track recently played game
        addToRecentlyPlayed(gameName);

        // Show loading
        this.showLoading();

        // Force all games to load in iframe without compatibility checks
        console.log(`🎮 Force loading game in iframe: ${gameName}`);
        this.createEnhancedGameLayout(gameName, gameUrl);
    }

    checkGameCompatibility(gameName, gameUrl) {
        // Skip compatibility check - force all games to load in iframe
        console.log(`🔧 Skipping compatibility check for: ${gameName} - forcing iframe load`);
        this.createEnhancedGameLayout(gameName, gameUrl);
    }

    handleIncompatibleGame(gameName, gameUrl) {
        // Force load in iframe anyway - no more warnings about new tabs
        console.log(`🔧 Force loading game in iframe: ${gameName}`);
        this.createEnhancedGameLayout(gameName, gameUrl);
    }

    closeIncompatibleModal() {
        // Function kept for compatibility but no longer needed
        console.log('🔧 Incompatible modal no longer used');
    }

    suggestCompatibleGame() {
        // Get a random game from the collection and try to play it
        const gameNames = Object.keys(gameData);
        if (gameNames.length > 0) {
            const randomGame = gameNames[Math.floor(Math.random() * gameNames.length)];
            const game = gameData[randomGame];
            if (game) {
                this.startGame(randomGame, game.url);
            }
        }
    }

    createEnhancedGameLayout(gameName, gameUrl) {
        // Add DNS prefetch and preconnect for faster loading
        this.addResourceHints(gameUrl);

        // Remove any existing enhanced layout
        const existingLayout = document.getElementById('enhancedGameLayout');
        if (existingLayout) {
            existingLayout.remove();
        }

        // Create main container
        const enhancedLayout = document.createElement('div');
        enhancedLayout.id = 'enhancedGameLayout';
        enhancedLayout.className = 'fixed inset-0 bg-game-dark z-50 overflow-y-auto overflow-x-hidden';
        enhancedLayout.style.scrollBehavior = 'smooth';
        enhancedLayout.style.top = '0';
        enhancedLayout.style.left = '0';
        enhancedLayout.style.width = '100%';
        enhancedLayout.style.height = '100%';

        // Create layout structure
        enhancedLayout.innerHTML = `
            <!-- Header with Home button and Search Bar -->
            <div class="sticky top-0 bg-game-dark-light border-b border-game-gray/30 p-4 flex justify-between items-center z-10">
                <div class="flex items-center space-x-4">
                    <button id="enhancedHomeBtn" class="text-gray-400 hover:text-white text-xl transition-colors" title="Go to Home">
                        <i class="fas fa-home"></i>
                    </button>
                </div>
                <div class="flex-1 mx-4 max-w-lg relative">
                    <div class="relative">
                        <input type="text" id="enhancedSearchInput" placeholder="Search for games..." class="bg-game-dark w-full px-4 py-2 rounded-full text-white focus:outline-none focus:ring-2 focus:ring-game-primary transition-all">
                        <i class="fas fa-search absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                    </div>
                    <!-- Search Results Dropdown -->
                    <div id="enhancedSearchResults" class="absolute top-full left-0 right-0 bg-game-dark-light border border-game-gray/30 rounded-lg mt-2 max-h-96 overflow-y-auto z-50 hidden">
                        <!-- Search results will be populated here -->
                    </div>
                </div>
                <div class="flex items-center space-x-3">
                    <!-- Home button moved here alone -->
                    <button id="enhancedGameFullscreen" class="text-gray-400 hover:text-white text-lg transition-colors" title="Fullscreen">
                        <i class="fas fa-expand"></i>
                    </button>
                </div>
            </div>

            <!-- Main content area - improved spacing to prevent content overlap -->
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 p-4">
                <!-- Left Sidebar -->
                <div id="leftSidebar" class="hidden lg:block lg:col-span-2 space-y-4">
                    <!-- Related games will be populated here -->
                </div>

                <!-- Game area (center) -->
                <div class="col-span-12 lg:col-span-8">
                    <!-- Container for both iframe and controls with consistent width -->
                    <div class="relative">
                        <!-- Game screen container - adjusted to ensure full game visibility -->
                        <div class="relative bg-black rounded-t-2xl overflow-hidden shadow-lg" style="padding-top: 56.25%; z-index: 5;">
                            <!-- Loading screen with improved z-index -->
                            <div id="enhancedGameLoading" class="absolute inset-0 bg-game-dark flex items-center justify-center" style="z-index:10;">
                                <div class="text-center">
                                    <div class="animate-spin w-12 h-12 border-4 border-game-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                                    <p class="text-white text-lg font-semibold">Loading Game...</p>
                                    <p class="text-gray-400 text-sm mt-2">Please wait while we prepare your game</p>
                                </div>
                            </div>
                            
                            <!-- Game iframe with improved visibility -->
                <iframe id="enhancedGameIframe" 
                    class="absolute top-0 left-0 w-full h-full border-0" 
                    allow="fullscreen *; autoplay *; gamepad *; payment *; clipboard-write *; clipboard-read *; camera *; microphone *; accelerometer *; gyroscope *; picture-in-picture *; xr-spatial-tracking *; encrypted-media *"
                    allowfullscreen
                    loading="eager"
                    importance="high"
                    style="z-index:5;"
                    sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-orientation-lock allow-pointer-lock allow-presentation">
                            </iframe>
                        </div>

                        <!-- Game Control Overlay - Below iframe with exact same width, mobile optimized -->
                        <div id="gameControlOverlay" class="bg-blue-700/90 backdrop-blur-sm px-2 sm:px-4 py-2 sm:py-3 flex flex-wrap sm:flex-nowrap items-center justify-between rounded-b-xl shadow-md" style="transform:translateZ(0); width:100%; position:relative; z-index:6;">
                        <!-- Game Info -->
                        <div class="flex items-center space-x-2 w-full sm:w-auto mb-2 sm:mb-0">
                            <img src="${gameData[gameName]?.thumb || 'https://via.placeholder.com/40'}" alt="${gameName}" class="w-8 h-8 sm:w-10 sm:h-10 rounded-md object-cover">
                            <div class="overflow-hidden">
                                <h3 class="text-white text-sm font-semibold truncate max-w-[150px] sm:max-w-none">${gameName}</h3>
                                <p class="text-white/70 text-xs hidden sm:block">by ${gameData[gameName]?.author || 'GameDev'}</p>
                            </div>
                        </div>
                        
                        <!-- Game Controls - Matching the reference image, mobile optimized -->
                        <div class="flex items-center space-x-3 sm:space-x-5 w-full sm:w-auto justify-end">
                            <!-- Like Button with Count -->
                            <div class="flex flex-col items-center">
                                <button id="enhancedGameLike" class="text-white hover:text-blue-200 text-lg sm:text-xl transition-colors relative" title="Like this game">
                                    <i class="fas fa-thumbs-up"></i>
                                </button>
                                <span id="enhancedLikeCount" class="game-stat-counter text-xs">1</span>
                            </div>
                            
                            <!-- Dislike Button with Count -->
                            <div class="flex flex-col items-center">
                                <button id="enhancedGameDislike" class="text-white hover:text-blue-200 text-lg sm:text-xl transition-colors relative" title="Dislike this game">
                                    <i class="fas fa-thumbs-down"></i>
                                </button>
                                <span id="enhancedDislikeCount" class="game-stat-counter text-xs">1</span>
                            </div>
                            
                            <!-- Report Flag Button -->
                            <div class="flex flex-col items-center">
                                <button id="enhancedGameReport" class="text-white hover:text-orange-400 text-lg transition-colors cursor-pointer" title="Report inappropriate content">
                                    <i class="fas fa-flag"></i>
                                </button>
                                <span class="game-stat-counter text-xs">Report</span>
                            </div>
                            
                            <!-- Fullscreen Button -->
                            <button id="overlayGameFullscreen" class="text-white hover:text-blue-200 text-lg transition-colors" title="Fullscreen">
                                <i class="fas fa-expand"></i>
                            </button>
                        </div>
                    </div>
                    </div>

                    <!-- Game info section -->
                    <div id="gameInfoSection" class="bg-game-dark-light border-t border-game-gray/30 p-4 mt-6 rounded-2xl">
                        <div class="flex items-start justify-between mb-3">
                            <div class="flex-1">
                                <h3 class="text-white font-bold text-lg mb-1">${gameName}</h3>
                                <div class="flex items-center space-x-4 text-sm text-gray-400 mb-2">
                                    <span class="flex items-center">
                                        <i class="fas fa-eye mr-1"></i>
                                        ${gameData[gameName]?.plays || '1M'} plays
                                    </span>
                                    <span class="flex items-center">
                                        <i class="fas fa-tag mr-1"></i>
                                        ${gameData[gameName]?.category || 'Game'}
                                    </span>
                                </div>
                                <p class="text-gray-300 text-sm leading-relaxed">
                                    ${gameData[gameName]?.description || 'An exciting game with amazing gameplay and stunning graphics!'}
                                </p>
                            </div>
                        </div>
                        
                        <!-- Tags -->
                        <div class="flex flex-wrap gap-2 mb-4">
                            ${(gameData[gameName]?.tags || ['Action', 'Fun', 'Exciting']).map(tag => 
                                `<span class="bg-game-primary/20 text-game-primary px-3 py-1 rounded-full text-sm cursor-pointer hover:bg-game-primary/30 transition-colors">${tag}</span>`
                            ).join('')}
                        </div>

                        <!-- Related Games Section -->
                        <div class="border-t border-game-gray/30 pt-6">
                            <div class="mb-4">
                                <h3 class="text-white font-bold text-lg flex items-center mb-2">
                                    <i class="fas fa-gamepad text-game-primary mr-2"></i>
                                    Related Games
                                </h3>
                                <p class="text-gray-400 text-sm">Click to play similar games</p>
                            </div>
                            
                            <div id="relatedGamesList" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                                <!-- Related games will be populated here -->
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Right Sidebar -->
                <div id="rightSidebar" class="hidden lg:block lg:col-span-2 space-y-4">
                    <!-- Related games will be populated here -->
                </div>
            </div>
        `;

        document.body.appendChild(enhancedLayout);

        // Allow scrolling within the layout, but prevent background scroll
        document.body.style.overflow = 'hidden';

        // Scroll to top of the enhanced layout for better UX
        setTimeout(() => {
            enhancedLayout.scrollTop = 0;
        }, 100);

        // Populate related games
        this.populateRelatedGames(gameName);

        // Bind events for the enhanced layout
        this.bindEnhancedLayoutEvents(gameName, gameUrl);

        // Load game state for enhanced layout
        this.loadEnhancedGameState(gameName);
        
        // Update like/dislike counts for enhanced view
        this.updateEnhancedLikeDislikeCounts(gameName);

        // Preload and optimize game loading
        this.optimizedGameLoading(gameUrl);

        // Track game play
        this.trackGamePlay(gameName);
    }

    optimizedGameLoading(gameUrl) {
        const iframe = document.getElementById('enhancedGameIframe');
        const loading = document.getElementById('enhancedGameLoading');
        const gameControlOverlay = document.getElementById('gameControlOverlay');
        
        if (!iframe || !loading) return;
        
        // Ensure the game controls don't interfere with gameplay
        if (gameControlOverlay) {
            gameControlOverlay.style.pointerEvents = 'auto';
        }

        // Show loading with progress
        loading.style.display = 'flex';
        
        // Update loading text with progress
        const loadingText = loading.querySelector('p');
        const progressText = loading.querySelector('p:last-child');
        
        let loadingProgress = 0;
        const progressInterval = setInterval(() => {
            loadingProgress += Math.random() * 15;
            if (loadingProgress > 90) loadingProgress = 90;
            
            if (progressText) {
                progressText.textContent = `Loading... ${Math.floor(loadingProgress)}%`;
            }
        }, 200);

        // Ensure the iframe is visible and properly positioned
        iframe.style.visibility = 'visible';
        iframe.style.zIndex = '5';
        
        // Iframe error handling and fallback
        let hasLoaded = false;
        let loadAttempts = 0;
        const maxAttempts = 2;

        const attemptLoad = (url, attempt = 1) => {
            console.log(`🎮 Loading attempt ${attempt} for: ${url}`);
            
            // Clear any existing content
            iframe.src = 'about:blank';
            
            // Set up error detection
            const loadTimeout = setTimeout(() => {
                if (!hasLoaded) {
                    console.warn(`⚠️ Load timeout for attempt ${attempt}`);
                    handleLoadError(url, attempt);
                }
            }, 10000); // 10 second timeout

            // Try to load the game
            try {
                iframe.src = url;
                iframe.allow = "fullscreen; gamepad; camera; microphone; autoplay; payment; clipboard-write; clipboard-read";
                // Remove sandbox restrictions to allow more games to load
                iframe.removeAttribute('sandbox');
                
                // Success handler
                const handleSuccess = () => {
                    hasLoaded = true;
                    clearTimeout(loadTimeout);
                    clearInterval(progressInterval);
                    
                    console.log(`✅ Game loaded successfully on attempt ${attempt}`);
                    
                    if (progressText) {
                        progressText.textContent = 'Game loaded successfully!';
                    }
                    
                    setTimeout(() => {
                        loading.style.display = 'none';
                    }, 500);
                    
                    iframe.removeEventListener('load', handleSuccess);
                };

                iframe.addEventListener('load', handleSuccess);

            } catch (error) {
                console.error(`❌ Error loading game on attempt ${attempt}:`, error);
                clearTimeout(loadTimeout);
                handleLoadError(url, attempt);
            }
        };

        const handleLoadError = (url, attempt) => {
            clearInterval(progressInterval);
            
            if (attempt < maxAttempts) {
                // Try again with different parameters
                if (loadingText) loadingText.textContent = `Loading failed, retrying... (${attempt + 1}/${maxAttempts})`;
                if (progressText) progressText.textContent = 'Preparing alternative method...';
                
                setTimeout(() => {
                    attemptLoad(url, attempt + 1);
                }, 2000);
            } else {
                // All attempts failed, show fallback options
                console.error(`❌ All loading attempts failed for: ${url}`);
                this.showGameLoadError(url);
            }
        };

        // Start the first loading attempt
        attemptLoad(gameUrl);
    }

    showGameLoadError(gameUrl) {
        const loading = document.getElementById('enhancedGameLoading');
        if (!loading) return;

        loading.innerHTML = `
            <div class="text-center p-8">
                <div class="text-6xl text-yellow-400 mb-4">
                    <i class="fas fa-gamepad"></i>
                </div>
                <h3 class="text-white text-xl font-bold mb-4">Game Loading Issue</h3>
                <p class="text-gray-400 mb-6 max-w-md mx-auto">
                    The game is having some trouble loading. Please try refreshing or check back later.
                </p>
                <div class="flex flex-col sm:flex-row gap-3 justify-center">
                    <button id="reloadGame" class="bg-game-primary hover:bg-game-accent text-game-dark px-6 py-3 rounded-lg font-semibold transition-all flex items-center justify-center">
                        <i class="fas fa-redo mr-2"></i>
                        Retry Loading
                    </button>
                    <button id="tryAnotherGame" class="bg-game-gray hover:bg-game-primary/20 text-white px-6 py-3 rounded-lg font-semibold transition-all flex items-center justify-center">
                        <i class="fas fa-random mr-2"></i>
                        Try Another Game
                    </button>
                </div>
            </div>
        `;

        // Bind error screen buttons
        const tryAnotherGameBtn = document.getElementById('tryAnotherGame');
        const reloadGameBtn = document.getElementById('reloadGame');

        if (reloadGameBtn) {
            reloadGameBtn.addEventListener('click', () => {
                console.log('🔄 Retrying game load...');
                // Clear the error and retry loading
                this.createEnhancedGameLayout(this.gamePlayerTitle.textContent, gameUrl);
            });
        }

        if (tryAnotherGameBtn) {
            tryAnotherGameBtn.addEventListener('click', () => {
                this.loadRandomRelatedGame();
            });
        }

    }

    loadRandomRelatedGame() {
        const relatedGames = document.querySelectorAll('.related-game-item');
        if (relatedGames.length > 0) {
            const randomIndex = Math.floor(Math.random() * relatedGames.length);
            const randomGame = relatedGames[randomIndex];
            randomGame.click();
        } else {
            this.closeEnhancedGame();
        }
    }

    handleGameSwitchError(gameName, gameUrl) {
        const loading = document.getElementById('enhancedGameLoading');
        if (!loading) return;

        loading.innerHTML = `
            <div class="text-center p-6">
                <div class="text-4xl text-yellow-400 mb-3">
                    <i class="fas fa-exclamation-circle"></i>
                </div>
                <h3 class="text-white text-lg font-bold mb-3">Cannot Load "${gameName}"</h3>
                <p class="text-gray-400 mb-4 text-sm">
                    This game has restrictions that prevent it from loading in the player.
                </p>
                <div class="flex flex-col sm:flex-row gap-2 justify-center">
                    <button id="openGameInNewTab" class="bg-game-primary hover:bg-game-accent text-game-dark px-4 py-2 rounded text-sm font-semibold transition-all">
                        <i class="fas fa-external-link-alt mr-1"></i>
                        Open in New Tab
                    </button>
                    <button id="pickAnotherGame" class="bg-game-gray hover:bg-game-primary/20 text-white px-4 py-2 rounded text-sm font-semibold transition-all">
                        <i class="fas fa-random mr-1"></i>
                        Try Another
                    </button>
                </div>
            </div>
        `;

        // Bind error buttons
        const openGameBtn = document.getElementById('openGameInNewTab');
        const pickAnotherBtn = document.getElementById('pickAnotherGame');

        if (openGameBtn) {
            openGameBtn.addEventListener('click', () => {
                window.open(gameUrl, '_blank', 'noopener,noreferrer');
                // Auto-hide the error after opening
                setTimeout(() => {
                    this.loadRandomRelatedGame();
                }, 1000);
            });
        }

        if (pickAnotherBtn) {
            pickAnotherBtn.addEventListener('click', () => {
                this.loadRandomRelatedGame();
            });
        }

        // Auto-try another game after 5 seconds
        setTimeout(() => {
            if (loading && loading.innerHTML.includes('Cannot Load')) {
                this.loadRandomRelatedGame();
            }
        }, 5000);
    }

    populateRelatedGames(currentGameName) {
        const leftSidebar = document.getElementById('leftSidebar');
        const rightSidebar = document.getElementById('rightSidebar');
        const relatedGamesList = document.getElementById('relatedGamesList');
        if (!leftSidebar || !rightSidebar || !relatedGamesList) return;

        const currentGame = gameData[currentGameName];
        const currentCategory = currentGame?.category || 'Action';
        
        // Get games from the same category, excluding current game
        let relatedGames = Object.keys(gameData).filter(gameName => {
            if (gameName === currentGameName) return false;
            const game = gameData[gameName];
            return game.category === currentCategory;
        });

        // If not enough games in same category, add games from other categories
        if (relatedGames.length < 24) {
            const otherGames = Object.keys(gameData).filter(gameName => {
                if (gameName === currentGameName) return false;
                const game = gameData[gameName];
                return game.category !== currentCategory;
            });
            relatedGames = [...relatedGames, ...otherGames];
        }

        // Shuffle and take first 24 games
        relatedGames = relatedGames.sort(() => 0.5 - Math.random()).slice(0, 24);

        // Split games for sidebars and main list
        const leftSidebarGames = relatedGames.slice(0, 6);
        const rightSidebarGames = relatedGames.slice(6, 12);
        const mainRelatedGames = relatedGames.slice(12, 24);

        // Populate sidebars
        this.populateSidebar(leftSidebar, leftSidebarGames);
        this.populateSidebar(rightSidebar, rightSidebarGames);

        // Generate HTML for related games in grid format
        const relatedGamesHTML = mainRelatedGames.map(gameName => {
            const game = gameData[gameName];
            return `
                <div class="related-game-item bg-game-gray rounded-lg overflow-hidden cursor-pointer hover:bg-game-primary/20 transition-all duration-200 hover:transform hover:scale-105 group" data-game-name="${gameName}">
                    <div class="aspect-video relative overflow-hidden">
                        <img src="${game.thumb}" alt="${gameName}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" 
                             onerror="this.style.display='none'; this.parentNode.innerHTML='<div class=\\'w-full h-full flex items-center justify-center text-game-primary text-2xl\\'>🎮</div>'">
                        <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"></div>
                        <div class="absolute bottom-2 left-2 right-2">
                            <span class="bg-game-primary text-game-dark px-2 py-1 rounded text-xs font-semibold">${game.category}</span>
                        </div>
                        <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <button class="play-related-btn bg-game-primary hover:bg-game-accent text-game-dark w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all">
                                <i class="fas fa-play text-sm ml-0.5"></i>
                            </button>
                        </div>
                    </div>
                    <div class="p-3">
                        <h4 class="text-white font-semibold text-sm mb-1 truncate group-hover:text-game-primary transition-colors">${gameName}</h4>
                        <div class="flex items-center justify-between text-xs">
                            <span class="text-gray-400 flex items-center">
                                <i class="fas fa-star text-yellow-400 mr-1"></i>
                                ${game.rating}
                            </span>
                            <span class="text-gray-500">${game.plays} plays</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        relatedGamesList.innerHTML = relatedGamesHTML;

        // Add click events to all related games
        document.querySelectorAll('.related-game-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const gameName = item.getAttribute('data-game-name');
                const game = gameData[gameName];
                if (game) {
                    // Load the new game in the same enhanced layout
                    this.switchToRelatedGame(gameName, game.url);
                }
            });

            // Preload on hover for faster switching
            item.addEventListener('mouseenter', () => {
                const gameName = item.getAttribute('data-game-name');
                const game = gameData[gameName];
                if (game && game.url) {
                    this.preloadGame(game.url);
                }
            });
        });
    }

    populateSidebar(sidebar, games) {
        const sidebarHTML = games.map(gameName => {
            const game = gameData[gameName];
            return `
                <div class="related-game-item bg-game-gray rounded-lg overflow-hidden cursor-pointer hover:bg-game-primary/20 transition-all duration-200 hover:transform hover:scale-105 group" data-game-name="${gameName}">
                    <div class="aspect-video relative overflow-hidden">
                        <img src="${game.thumb}" alt="${gameName}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" 
                             onerror="this.style.display='none'; this.parentNode.innerHTML='<div class=\\'w-full h-full flex items-center justify-center text-game-primary text-2xl\\'>🎮</div>'">
                        <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <button class="play-related-btn bg-game-primary hover:bg-game-accent text-game-dark w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all">
                                <i class="fas fa-play text-sm ml-0.5"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        sidebar.innerHTML = sidebarHTML;
    }

    preloadGame(gameUrl) {
        // Only preload if not already preloaded
        if (this.preloadedGames && this.preloadedGames.has(gameUrl)) return;
        
        if (!this.preloadedGames) {
            this.preloadedGames = new Set();
        }

        // Create hidden iframe for preloading
        const preloadIframe = document.createElement('iframe');
        preloadIframe.style.display = 'none';
        preloadIframe.style.position = 'absolute';
        preloadIframe.style.top = '-9999px';
        preloadIframe.style.width = '1px';
        preloadIframe.style.height = '1px';
        preloadIframe.src = gameUrl;
        preloadIframe.allow = "fullscreen; gamepad; camera; microphone";
        preloadIframe.sandbox = "allow-scripts allow-same-origin allow-popups allow-forms";
        
        document.body.appendChild(preloadIframe);
        
        // Mark as preloaded
        this.preloadedGames.add(gameUrl);
        
        // Remove preload iframe after 30 seconds to save memory
        setTimeout(() => {
            if (document.body.contains(preloadIframe)) {
                document.body.removeChild(preloadIframe);
            }
        }, 30000);
    }

    addResourceHints(gameUrl) {
        try {
            const url = new URL(gameUrl);
            const domain = url.origin;
            
            // Check if hints already added for this domain
            if (!this.addedResourceHints) {
                this.addedResourceHints = new Set();
            }
            
            if (this.addedResourceHints.has(domain)) return;
            
            // Add DNS prefetch
            const dnsPrefetch = document.createElement('link');
            dnsPrefetch.rel = 'dns-prefetch';
            dnsPrefetch.href = domain;
            document.head.appendChild(dnsPrefetch);
            
            // Add preconnect for faster connection
            const preconnect = document.createElement('link');
            preconnect.rel = 'preconnect';
            preconnect.href = domain;
            preconnect.crossOrigin = 'anonymous';
            document.head.appendChild(preconnect);
            
            this.addedResourceHints.add(domain);
            
        } catch (error) {
            console.warn('Could not add resource hints for:', gameUrl, error);
        }
    }

    switchToRelatedGame(newGameName, newGameUrl) {
        // Update header info
        // The header doesn't have a title/category, this part is not needed.

        // Update game info section
        const gameInfoSection = document.getElementById('gameInfoSection');
        const gameInfoTitle = gameInfoSection?.querySelector('h3');
        const gameInfoContent = gameInfoSection?.querySelector('.flex-1');

        if (gameInfoTitle) gameInfoTitle.textContent = newGameName;
        if (gameInfoContent) {
            const game = gameData[newGameName];
            const playsSpan = gameInfoContent.querySelector('.fa-eye').parentNode;
            const categorySpan = gameInfoContent.querySelector('.fa-tag').parentNode;
            const description = gameInfoContent.querySelector('p');
            
            if (playsSpan) playsSpan.innerHTML = `<i class="fas fa-eye mr-1"></i>${game?.plays || '1M'} plays`;
            if (categorySpan) categorySpan.innerHTML = `<i class="fas fa-tag mr-1"></i>${game?.category || 'Game'}`;
            if (description) description.textContent = game?.description || 'An exciting game with amazing gameplay and stunning graphics!';
        }

        // Update tags section
        const tagsContainer = document.querySelector('#enhancedGameLayout .flex.flex-wrap.gap-2.mb-4');
        if (tagsContainer && gameData[newGameName]) {
            const game = gameData[newGameName];
            tagsContainer.innerHTML = (game?.tags || ['Action', 'Fun', 'Exciting']).map(tag => 
                `<span class="bg-game-primary/20 text-game-primary px-3 py-1 rounded-full text-sm cursor-pointer hover:bg-game-primary/30 transition-colors">${tag}</span>`
            ).join('');
        }

        // Show loading and switch iframe
        const loading = document.getElementById('enhancedGameLoading');
        const iframe = document.getElementById('enhancedGameIframe');
        
        if (loading) {
            loading.style.display = 'flex';
            const loadingText = loading.querySelector('p');
            const progressText = loading.querySelector('p:last-child');
            
            if (loadingText) loadingText.textContent = 'Loading New Game...';
            if (progressText) progressText.textContent = 'Preparing game...';
        }
        
        // Fast game switching with error handling
        if (iframe) {
            // Clear current game
            iframe.src = 'about:blank';
            
            let switchHasLoaded = false;
            
            // Load new game with timeout
            const switchTimeout = setTimeout(() => {
                if (!switchHasLoaded) {
                    console.warn(`⚠️ Game switch timeout for: ${newGameName}`);
                    this.handleGameSwitchError(newGameName, newGameUrl);
                }
            }, 8000); // 8 second timeout for switching
            
            setTimeout(() => {
                try {
                    console.log(`🎮 Switching to game: ${newGameName} with URL: ${newGameUrl}`);
                    
                    // Update game image in control overlay
                    const overlayImage = document.querySelector('#gameControlOverlay img');
                    if (overlayImage) {
                        overlayImage.src = gameData[newGameName]?.thumb || 'https://via.placeholder.com/40';
                        overlayImage.alt = newGameName;
                    }
                    
                    // Update game name in control overlay
                    const overlayTitle = document.querySelector('#gameControlOverlay h3');
                    if (overlayTitle) {
                        overlayTitle.textContent = newGameName;
                    }
                    
                    // Force reload by clearing src and setting it again
                    iframe.src = 'about:blank';
                    setTimeout(() => {
                        console.log(`🎮 Loading new game: ${newGameName} at ${newGameUrl}`);
                        iframe.src = newGameUrl;
                        iframe.allow = "fullscreen; gamepad; camera; microphone; autoplay; payment; clipboard-write; clipboard-read";
                        iframe.removeAttribute('sandbox');
                    }, 50);
                    
                    const handleSwitchLoad = () => {
                        switchHasLoaded = true;
                        clearTimeout(switchTimeout);
                        
                        if (loading) {
                            const progressText = loading.querySelector('p:last-child');
                            if (progressText) progressText.textContent = 'Game ready!';
                            
                            setTimeout(() => {
                                loading.style.display = 'none';
                            }, 300);
                        }
                        iframe.removeEventListener('load', handleSwitchLoad);
                    };
                    
                    iframe.addEventListener('load', handleSwitchLoad);
                    
                } catch (error) {
                    console.error(`❌ Error switching to game: ${newGameName}`, error);
                    clearTimeout(switchTimeout);
                    this.handleGameSwitchError(newGameName, newGameUrl);
                }
                
            }, 100);
        }

        // Update related games list
        this.populateRelatedGames(newGameName);

        // Update current game reference
        this.currentGame = { name: newGameName, ...gameData[newGameName] };
        
        // Update the global current game name variable for event handlers
        window.currentGameName = newGameName;
        
        // Update like/dislike/flag status for new game
        this.loadGameState(newGameName);
        
        // Track the new game play
        this.trackGamePlay(newGameName);
    }

    bindEnhancedLayoutEvents(gameName, gameUrl) {
        // Home button
        const homeBtn = document.getElementById('enhancedHomeBtn');
        if (homeBtn) {
            homeBtn.addEventListener('click', () => this.closeEnhancedGame());
        }

        // Fullscreen button (in header)
        const fullscreenBtn = document.getElementById('enhancedGameFullscreen');
        if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', () => this.toggleEnhancedFullscreen());
        }

        // Overlay Fullscreen button (in bottom overlay)
        const overlayFullscreenBtn = document.getElementById('overlayGameFullscreen');
        if (overlayFullscreenBtn) {
            overlayFullscreenBtn.addEventListener('click', () => this.toggleEnhancedFullscreen());
        }

        // Enhanced Like button
        const likeBtn = document.getElementById('enhancedGameLike');
        if (likeBtn) {
            likeBtn.removeEventListener('click', this._boundLikeHandler);
            this._boundLikeHandler = () => this.toggleEnhancedLike(window.currentGameName);
            likeBtn.addEventListener('click', this._boundLikeHandler);
        }

        // Enhanced Dislike button
        const dislikeBtn = document.getElementById('enhancedGameDislike');
        if (dislikeBtn) {
            dislikeBtn.removeEventListener('click', this._boundDislikeHandler);
            this._boundDislikeHandler = () => this.toggleEnhancedDislike(window.currentGameName);
            dislikeBtn.addEventListener('click', this._boundDislikeHandler);
        }

        // Enhanced Report button
        const reportBtn = document.getElementById('enhancedGameReport');
        if (reportBtn) {
            reportBtn.removeEventListener('click', this._boundReportHandler);
            this._boundReportHandler = () => {
                console.log('Report button clicked');
                this.showReportModal();
            };
            reportBtn.addEventListener('click', this._boundReportHandler);
            
            // Ensure the button is visible and clickable
            reportBtn.style.pointerEvents = 'auto';
            reportBtn.style.cursor = 'pointer';
        }

        // Search functionality within the enhanced view
        const searchInput = document.getElementById('enhancedSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterRelatedGames(e.target.value);
            });
            
            // Hide search results when clicking outside
            document.addEventListener('click', (e) => {
                const searchResults = document.getElementById('enhancedSearchResults');
                if (searchResults && !searchInput.contains(e.target) && !searchResults.contains(e.target)) {
                    searchResults.classList.add('hidden');
                }
            });
        }

        // Escape key to close
        document.addEventListener('keydown', this.handleEnhancedEscapeKey);
    }

    filterRelatedGames(searchQuery) {
        const searchResults = document.getElementById('enhancedSearchResults');
        if (!searchResults) return;

        if (!searchQuery || searchQuery.trim() === '') {
            searchResults.classList.add('hidden');
            return;
        }

        const query = searchQuery.toLowerCase().trim();
        const allGameNames = Object.keys(gameData);
        
        // Filter games based on search query - show all matching games
        const filteredGames = allGameNames.filter(gameName => {
            const game = gameData[gameName];
            return gameName.toLowerCase().includes(query) ||
                   game.category.toLowerCase().includes(query) ||
                   game.description.toLowerCase().includes(query) ||
                   game.tags.some(tag => tag.toLowerCase().includes(query));
        }); // Show all matching results

        if (filteredGames.length === 0) {
            searchResults.innerHTML = `
                <div class="p-4 text-center text-gray-400">
                    <i class="fas fa-search text-2xl mb-2"></i>
                    <p>No games found for "${searchQuery}"</p>
                </div>
            `;
            searchResults.classList.remove('hidden');
            return;
        }

        // Generate search results HTML
        const resultsHTML = `
            <div class="p-3 border-b border-game-gray/30 bg-game-gray/20">
                <p class="text-game-primary text-sm font-semibold">
                    <i class="fas fa-search mr-2"></i>Found ${filteredGames.length} game${filteredGames.length !== 1 ? 's' : ''} for "${searchQuery}"
                </p>
            </div>
        ` + filteredGames.map(gameName => {
            const game = gameData[gameName];
            return `
                <div class="search-result-item flex items-center p-3 hover:bg-game-gray/50 cursor-pointer border-b border-game-gray/20 last:border-b-0" data-game-name="${gameName}">
                    <div class="w-12 h-12 rounded-lg overflow-hidden mr-3 flex-shrink-0">
                        <img src="${game.thumb}" alt="${gameName}" class="w-full h-full object-cover" 
                             onerror="this.style.display='none'; this.parentNode.innerHTML='<div class=\'w-full h-full flex items-center justify-center text-game-primary\'>🎮</div>'">
                    </div>
                    <div class="flex-1 min-w-0">
                        <h4 class="text-white font-semibold text-sm truncate">${gameName}</h4>
                        <p class="text-gray-400 text-xs truncate">${game.category} • ${game.rating} ⭐</p>
                    </div>
                    <div class="text-game-primary text-sm ml-2">
                        <i class="fas fa-play"></i>
                    </div>
                </div>
            `;
        }).join('');

        searchResults.innerHTML = resultsHTML;
        searchResults.classList.remove('hidden');

        // Add click events to search results
        searchResults.querySelectorAll('.search-result-item').forEach(item => {
            item.addEventListener('click', () => {
                const gameName = item.getAttribute('data-game-name');
                const game = gameData[gameName];
                if (game) {
                    // Clear search and hide results
                    const searchInput = document.getElementById('enhancedSearchInput');
                    if (searchInput) searchInput.value = '';
                    searchResults.classList.add('hidden');
                    
                    // Switch to the selected game
                    this.switchToRelatedGame(gameName, game.url);
                }
            });
        });
    }

    closeEnhancedGame() {
        const enhancedLayout = document.getElementById('enhancedGameLayout');
        if (enhancedLayout) {
            enhancedLayout.remove();
        }
        
        // Restore body scroll
        document.body.style.overflow = '';
        
        // Clear current game
        this.currentGame = null;
        
        // Remove escape key listener
        document.removeEventListener('keydown', this.handleEnhancedEscapeKey);
    }

    handleEnhancedEscapeKey = (e) => {
        if (e.key === 'Escape') {
            this.closeEnhancedGame();
        } else if (e.key === 'Home') {
            // Scroll to top of enhanced layout
            const enhancedLayout = document.getElementById('enhancedGameLayout');
            if (enhancedLayout) {
                enhancedLayout.scrollTop = 0;
            }
        } else if (e.key === 'End') {
            // Scroll to bottom of enhanced layout
            const enhancedLayout = document.getElementById('enhancedGameLayout');
            if (enhancedLayout) {
                enhancedLayout.scrollTop = enhancedLayout.scrollHeight;
            }
        }
    }

    toggleEnhancedFullscreen() {
        const gameArea = document.querySelector('#enhancedGameLayout .lg\\:col-span-8');

        if (!document.fullscreenElement) {
            const elementToFullscreen = gameArea || document.getElementById('enhancedGameIframe');
            if (elementToFullscreen) {
                if (elementToFullscreen.requestFullscreen) {
                    elementToFullscreen.requestFullscreen().catch(err => {
                        console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
                    });
                } else if (elementToFullscreen.mozRequestFullScreen) { /* Firefox */
                    elementToFullscreen.mozRequestFullScreen();
                } else if (elementToFullscreen.webkitRequestFullscreen) { /* Chrome, Safari & Opera */
                    elementToFullscreen.webkitRequestFullscreen();
                } else if (elementToFullscreen.msRequestFullscreen) { /* IE/Edge */
                    elementToFullscreen.msRequestFullscreen();
                }
            } else {
                 console.error('❌ Game area or iframe not found for fullscreen');
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    }

    reloadEnhancedGame() {
        const iframe = document.getElementById('enhancedGameIframe');
        const loading = document.getElementById('enhancedGameLoading');
        
        if (!iframe || !iframe.src) return;
        
        if (loading) {
            loading.style.display = 'flex';
            const loadingText = loading.querySelector('p');
            const progressText = loading.querySelector('p:last-child');
            
            if (loadingText) loadingText.textContent = 'Reloading Game...';
            if (progressText) progressText.textContent = 'Please wait...';
        }
        
        // Store current URL and reload immediately
        const currentUrl = iframe.src;
        iframe.src = 'about:blank';
        
        setTimeout(() => {
            iframe.src = currentUrl;
            
            const handleReload = () => {
                if (loading) {
                    const progressText = loading.querySelector('p:last-child');
                    if (progressText) progressText.textContent = 'Game reloaded!';
                    
                    setTimeout(() => {
                        loading.style.display = 'none';
                    }, 300);
                }
                iframe.removeEventListener('load', handleReload);
            };
            
            iframe.addEventListener('load', handleReload);
            
            // Fallback timeout
            setTimeout(() => {
                if (loading && loading.style.display !== 'none') {
                    loading.style.display = 'none';
                }
            }, 5000);
            
        }, 100);
    }

    toggleEnhancedFavorite() {
        const favoriteBtn = document.getElementById('enhancedGameFavorite');
        if (!favoriteBtn || !this.currentGame) return;

        const isCurrentlyFavorited = favoriteBtn.classList.contains('text-game-primary');
        
        if (isCurrentlyFavorited) {
            favoriteBtn.classList.remove('text-game-primary');
            favoriteBtn.classList.add('text-gray-400');
            this.removeFavorite(this.currentGame.name);
        } else {
            favoriteBtn.classList.remove('text-gray-400');
            favoriteBtn.classList.add('text-game-primary');
            this.addFavorite(this.currentGame.name);
        }
    }

    closeGame() {
        // Check if enhanced layout is open
        const enhancedLayout = document.getElementById('enhancedGameLayout');
        if (enhancedLayout) {
            this.closeEnhancedGame();
            return;
        }

        // Handle old layout
        this.gamePlayer.classList.add('hidden');
        
        // Remove backdrop
        const backdrop = document.getElementById('gameBackdrop');
        if (backdrop) {
            backdrop.remove();
        }
        
        // Reset player styles
        this.gamePlayer.style.position = '';
        this.gamePlayer.style.top = '';
        this.gamePlayer.style.left = '';
        this.gamePlayer.style.transform = '';
        this.gamePlayer.style.width = '';
        this.gamePlayer.style.height = '';
        this.gamePlayer.style.maxWidth = '';
        this.gamePlayer.style.maxHeight = '';
        this.gamePlayer.style.zIndex = '';
        this.gamePlayer.style.borderRadius = '';
        this.gamePlayer.style.overflow = '';
        this.gamePlayer.style.boxShadow = '';
        
        // Restore body scroll
        document.body.style.overflow = '';
        
        // Clear iframe
        this.gameIframe.src = '';
        this.currentGame = null;
    }

    showLoading() {
        this.gameLoading.classList.remove('hidden');
    }

    hideLoading() {
        setTimeout(() => {
            this.gameLoading.classList.add('hidden');
        }, 1000);
    }

    reloadGame() {
        if (this.gameIframe.src) {
            this.showLoading();
            this.gameIframe.src = this.gameIframe.src;
        }
    }

    toggleFullscreen() {
        const fullscreenBtn = document.getElementById('gameFullscreen');
        
        if (!this.isFullscreen) {
            if (this.gamePlayer.requestFullscreen) {
                this.gamePlayer.requestFullscreen();
            } else if (this.gamePlayer.webkitRequestFullscreen) {
                this.gamePlayer.webkitRequestFullscreen();
            } else if (this.gamePlayer.msRequestFullscreen) {
                this.gamePlayer.msRequestFullscreen();
            }
            this.isFullscreen = true;
            fullscreenBtn.innerHTML = '<i class="fas fa-compress"></i>';
            fullscreenBtn.classList.add('fullscreen-active');
            this.showNotification('Fullscreen mode activated', 'info');
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }
            this.isFullscreen = false;
            fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
            fullscreenBtn.classList.remove('fullscreen-active');
            this.showNotification('Exited fullscreen mode', 'info');
        }
    }

    toggleFavorite() {
        const favoriteBtn = document.getElementById('gameFavorite');
        const isCurrentlyFavorited = favoriteBtn.classList.contains('text-game-primary');
        
        if (isCurrentlyFavorited) {
            favoriteBtn.classList.remove('text-game-primary');
            favoriteBtn.classList.add('text-gray-400');
            this.removeFavorite(this.currentGame?.name);
        } else {
            favoriteBtn.classList.remove('text-gray-400');
            favoriteBtn.classList.add('text-game-primary');
            this.addFavorite(this.currentGame?.name);
        }
    }

    addFavorite(gameName) {
        if (!gameName) return;
        let favorites = JSON.parse(localStorage.getItem('gameFavorites') || '[]');
        if (!favorites.includes(gameName)) {
            favorites.push(gameName);
            localStorage.setItem('gameFavorites', JSON.stringify(favorites));
        }
        this.showNotification(`${gameName} added to favorites!`);
    }

    removeFavorite(gameName) {
        if (!gameName) return;
        let favorites = JSON.parse(localStorage.getItem('gameFavorites') || '[]');
        favorites = favorites.filter(name => name !== gameName);
        localStorage.setItem('gameFavorites', JSON.stringify(favorites));
        this.showNotification(`${gameName} removed from favorites!`);
    }

    // Like/Dislike functionality
    toggleLike(gameName) {
        const likeBtn = document.getElementById('gameLike');
        const dislikeBtn = document.getElementById('gameDislike');
        gameName = gameName || window.currentGameName || this.currentGame?.name;
        
        if (!gameName) return;
        
        const isCurrentlyLiked = likeBtn.classList.contains('liked');
        
        // Remove dislike if it was active
        if (dislikeBtn.classList.contains('disliked')) {
            this.removeDislike(gameName);
        }
        
        if (isCurrentlyLiked) {
            this.removeLike(gameName);
        } else {
            this.addLike(gameName);
        }
        
        this.updateLikeDislikeCounts(gameName);
    }

    toggleDislike(gameName) {
        const likeBtn = document.getElementById('gameLike');
        const dislikeBtn = document.getElementById('gameDislike');
        gameName = gameName || window.currentGameName || this.currentGame?.name;
        
        if (!gameName) return;
        
        const isCurrentlyDisliked = dislikeBtn.classList.contains('disliked');
        
        // Remove like if it was active
        if (likeBtn.classList.contains('liked')) {
            this.removeLike(gameName);
        }
        
        if (isCurrentlyDisliked) {
            this.removeDislike(gameName);
        } else {
            this.addDislike(gameName);
        }
        
        this.updateLikeDislikeCounts(gameName);
    }

    addLike(gameName) {
        const likeBtn = document.getElementById('gameLike');
        likeBtn.classList.add('liked');
        
        // Store in localStorage
        let likes = JSON.parse(localStorage.getItem('gameLikes') || '[]');
        if (!likes.includes(gameName)) {
            likes.push(gameName);
            localStorage.setItem('gameLikes', JSON.stringify(likes));
        }
        
        this.showNotification(`👍 You liked ${gameName}!`, 'success');
    }

    removeLike(gameName) {
        const likeBtn = document.getElementById('gameLike');
        likeBtn.classList.remove('liked');
        
        // Remove from localStorage
        let likes = JSON.parse(localStorage.getItem('gameLikes') || '[]');
        likes = likes.filter(name => name !== gameName);
        localStorage.setItem('gameLikes', JSON.stringify(likes));
    }

    addDislike(gameName) {
        const dislikeBtn = document.getElementById('gameDislike');
        dislikeBtn.classList.add('disliked');
        
        // Store in localStorage
        let dislikes = JSON.parse(localStorage.getItem('gameDislikes') || '[]');
        if (!dislikes.includes(gameName)) {
            dislikes.push(gameName);
            localStorage.setItem('gameDislikes', JSON.stringify(dislikes));
        }
        
        this.showNotification(`👎 You disliked ${gameName}`, 'info');
    }

    removeDislike(gameName) {
        const dislikeBtn = document.getElementById('gameDislike');
        dislikeBtn.classList.remove('disliked');
        
        // Remove from localStorage
        let dislikes = JSON.parse(localStorage.getItem('gameDislikes') || '[]');
        dislikes = dislikes.filter(name => name !== gameName);
        localStorage.setItem('gameDislikes', JSON.stringify(dislikes));
    }

    updateLikeDislikeCounts(gameName) {
        const likes = JSON.parse(localStorage.getItem('gameLikes') || '[]');
        const dislikes = JSON.parse(localStorage.getItem('gameDislikes') || '[]');
        
        const likeCount = likes.filter(name => name === gameName).length;
        const dislikeCount = dislikes.filter(name => name === gameName).length;
        
        // Use consistent numbers based on game name instead of random
        const gameNameSum = [...gameName].reduce((sum, char) => sum + char.charCodeAt(0), 0);
        const baseLikes = (gameNameSum % 800) + 50; // Between 50-849
        const baseDislikes = (gameNameSum % 70) + 5; // Between 5-74
        
        const totalLikes = baseLikes + likeCount;
        const totalDislikes = baseDislikes + dislikeCount;
        
        const likeCountEl = document.getElementById('likeCount');
        const dislikeCountEl = document.getElementById('dislikeCount');
        
        if (totalLikes > 0) {
            likeCountEl.textContent = this.formatCount(totalLikes);
            likeCountEl.classList.remove('hidden');
        } else {
            likeCountEl.classList.add('hidden');
        }
        
        if (totalDislikes > 0) {
            dislikeCountEl.textContent = this.formatCount(totalDislikes);
            dislikeCountEl.classList.remove('hidden');
        } else {
            dislikeCountEl.classList.add('hidden');
        }
    }

    formatCount(count) {
        if (count >= 1000) {
            return Math.floor(count / 1000) + 'k';
        }
        return count.toString();
    }
    
    // Format large numbers to display like 16.6M as shown in the reference image
    formatLargeNumber(num) {
        if (num >= 1000000000) {
            return (num / 1000000000).toFixed(1).replace(/\.0$/, '') + 'B';
        }
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
        }
        if (num >= 1000) {
            return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
        }
        return num.toString();
    }

    // Report functionality
    showReportModal() {
        const reportModal = document.getElementById('reportModal');
        reportModal.classList.remove('hidden');
        reportModal.style.display = 'flex';
        
        // Add reported class to flag button for visual feedback
        const reportBtn = document.getElementById('enhancedGameReport');
        if (reportBtn) {
            reportBtn.classList.add('reported');
            // Add visual feedback for orange color
            reportBtn.querySelector('i').style.color = '#ff9500';
        }
        
        // Get current game info and update modal
        const gameName = window.currentGameName || this.currentGame?.name;
        const game = gameData[gameName];
        
        if (game) {
            document.getElementById('reportGameName').textContent = gameName;
            document.getElementById('reportGameImage').src = game.thumb || 'https://via.placeholder.com/40';
        }
        
        // Reset form errors
        document.getElementById('reportReasonError').classList.add('hidden');
        document.getElementById('reportDetailsError').classList.add('hidden');
        
        // Reset form inputs
        const radios = reportModal.querySelectorAll('input[type="radio"]');
        radios.forEach(radio => radio.checked = false);
        document.getElementById('reportDetails').value = '';
    }

    closeReportModal() {
        const reportModal = document.getElementById('reportModal');
        reportModal.classList.add('hidden');
        reportModal.style.display = 'none';
        
        // Remove reported class if canceled
        const reportBtn = document.getElementById('enhancedGameReport');
        if (reportBtn) {
            reportBtn.classList.remove('reported');
            // Remove orange color visual feedback if canceled
            reportBtn.querySelector('i').style.color = '';
        }
    }

    submitReport() {
        const gameName = window.currentGameName || this.currentGame?.name;
        const gameData = this.currentGame;
        const selectedReason = document.querySelector('input[name="reportReason"]:checked');
        const details = document.getElementById('reportDetails').value.trim();
        const reportReasonError = document.getElementById('reportReasonError');
        const reportDetailsError = document.getElementById('reportDetailsError');
        
        // Reset error messages
        reportReasonError.classList.add('hidden');
        reportDetailsError.classList.add('hidden');
        
        // Validate the form
        let isValid = true;
        
        if (!selectedReason) {
            reportReasonError.classList.remove('hidden');
            isValid = false;
        }
        
        if (!details || details.length < 10) {
            reportDetailsError.classList.remove('hidden');
            reportDetailsError.textContent = details.length === 0 ? 'Please provide details about the issue' : 'Please provide at least 10 characters';
            isValid = false;
        }
        
        if (!isValid) return;
        
        // Store report (in real app, this would go to a server)
        const report = {
            gameName: gameName,
            reason: selectedReason.value,
            details: details,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent
        };
        
        let reports = JSON.parse(localStorage.getItem('gameReports') || '[]');
        reports.push(report);
        localStorage.setItem('gameReports', JSON.stringify(reports));
        
        // Keep the flag button highlighted (orange) to show reported status
        
        // Show success message and close modal
        this.showNotification(`Thank you! Your report for "${gameName}" has been submitted.`, 'success', 5000);
        
        const reportBtn = document.getElementById('enhancedGameReport');
        if (reportBtn) {
            reportBtn.classList.add('reported');
        }
        
        this.closeReportModal();
        this.showNotification('Report submitted successfully. Thank you for helping keep our platform safe!', 'success');
        
        console.log('Report submitted:', report);
    }

    // Enhanced method to load game state
    loadGameState(gameName) {
        const likes = JSON.parse(localStorage.getItem('gameLikes') || '[]');
        const dislikes = JSON.parse(localStorage.getItem('gameDislikes') || '[]');
        const favorites = JSON.parse(localStorage.getItem('gameFavorites') || '[]');
        
        // Update like button state (standard UI)
        const likeBtn = document.getElementById('gameLike');
        if (likeBtn) {
            if (likes.includes(gameName)) {
                likeBtn.classList.add('liked');
            } else {
                likeBtn.classList.remove('liked');
            }
        }
        
        // Update dislike button state (standard UI)
        const dislikeBtn = document.getElementById('gameDislike');
        if (dislikeBtn) {
            if (dislikes.includes(gameName)) {
                dislikeBtn.classList.add('disliked');
            } else {
                dislikeBtn.classList.remove('disliked');
            }
        }
        
        // Update favorite button state (standard UI)
        const favoriteBtn = document.getElementById('gameFavorite');
        if (favoriteBtn) {
            if (favorites.includes(gameName)) {
                favoriteBtn.classList.remove('text-gray-400');
                favoriteBtn.classList.add('text-game-primary');
            } else {
                favoriteBtn.classList.remove('text-game-primary');
                favoriteBtn.classList.add('text-gray-400');
            }
        }
        
        // Update enhanced UI buttons
        const enhancedLikeBtn = document.getElementById('enhancedGameLike');
        if (enhancedLikeBtn) {
            if (likes.includes(gameName)) {
                enhancedLikeBtn.classList.add('liked');
            } else {
                enhancedLikeBtn.classList.remove('liked');
            }
        }
        
        const enhancedDislikeBtn = document.getElementById('enhancedGameDislike');
        if (enhancedDislikeBtn) {
            if (dislikes.includes(gameName)) {
                enhancedDislikeBtn.classList.add('disliked');
            } else {
                enhancedDislikeBtn.classList.remove('disliked');
            }
        }
        
        // Update counts for both UIs
        this.updateLikeDislikeCounts(gameName);
        this.updateEnhancedLikeDislikeCounts(gameName);
    }

    // Enhanced layout like/dislike methods
    toggleEnhancedLike(gameName) {
        const likeBtn = document.getElementById('enhancedGameLike');
        const dislikeBtn = document.getElementById('enhancedGameDislike');
        
        if (!gameName || !likeBtn) return;
        
        const isCurrentlyLiked = likeBtn.classList.contains('liked');
        
        // Remove dislike if it was active
        if (dislikeBtn && dislikeBtn.classList.contains('disliked')) {
            this.removeEnhancedDislike(gameName);
        }
        
        if (isCurrentlyLiked) {
            this.removeEnhancedLike(gameName);
        } else {
            this.addEnhancedLike(gameName);
        }
        
        this.updateEnhancedLikeDislikeCounts(gameName);
    }

    toggleEnhancedDislike(gameName) {
        const likeBtn = document.getElementById('enhancedGameLike');
        const dislikeBtn = document.getElementById('enhancedGameDislike');
        
        if (!gameName || !dislikeBtn) return;
        
        const isCurrentlyDisliked = dislikeBtn.classList.contains('disliked');
        
        // Remove like if it was active
        if (likeBtn && likeBtn.classList.contains('liked')) {
            this.removeEnhancedLike(gameName);
        }
        
        if (isCurrentlyDisliked) {
            this.removeEnhancedDislike(gameName);
        } else {
            this.addEnhancedDislike(gameName);
        }
        
        this.updateEnhancedLikeDislikeCounts(gameName);
    }

    addEnhancedLike(gameName) {
        const likeBtn = document.getElementById('enhancedGameLike');
        if (likeBtn) {
            likeBtn.classList.add('liked');
            // Add visual feedback for green color
            likeBtn.querySelector('i').style.color = '#00ff88';
        }
        
        // Store in localStorage
        let likes = JSON.parse(localStorage.getItem('gameLikes') || '[]');
        if (!likes.includes(gameName)) {
            likes.push(gameName);
            localStorage.setItem('gameLikes', JSON.stringify(likes));
        }
        
        this.showNotification(`👍 You liked ${gameName}!`, 'success');
    }

    removeEnhancedLike(gameName) {
        const likeBtn = document.getElementById('enhancedGameLike');
        if (likeBtn) {
            likeBtn.classList.remove('liked');
            // Remove color visual feedback
            likeBtn.querySelector('i').style.color = '';
        }
        
        // Remove from localStorage
        let likes = JSON.parse(localStorage.getItem('gameLikes') || '[]');
        likes = likes.filter(name => name !== gameName);
        localStorage.setItem('gameLikes', JSON.stringify(likes));
    }

    addEnhancedDislike(gameName) {
        const dislikeBtn = document.getElementById('enhancedGameDislike');
        if (dislikeBtn) {
            dislikeBtn.classList.add('disliked');
            // Add visual feedback for red color
            dislikeBtn.querySelector('i').style.color = '#ff3366';
        }
        
        // Store in localStorage
        let dislikes = JSON.parse(localStorage.getItem('gameDislikes') || '[]');
        if (!dislikes.includes(gameName)) {
            dislikes.push(gameName);
            localStorage.setItem('gameDislikes', JSON.stringify(dislikes));
        }
        
        this.showNotification(`👎 You disliked ${gameName}`, 'info');
    }

    removeEnhancedDislike(gameName) {
        const dislikeBtn = document.getElementById('enhancedGameDislike');
        if (dislikeBtn) {
            dislikeBtn.classList.remove('disliked');
            // Remove color visual feedback
            dislikeBtn.querySelector('i').style.color = '';
        }
        
        // Remove from localStorage
        let dislikes = JSON.parse(localStorage.getItem('gameDislikes') || '[]');
        dislikes = dislikes.filter(name => name !== gameName);
        localStorage.setItem('gameDislikes', JSON.stringify(dislikes));
    }

    updateEnhancedLikeDislikeCounts(gameName) {
        const likes = JSON.parse(localStorage.getItem('gameLikes') || '[]');
        const dislikes = JSON.parse(localStorage.getItem('gameDislikes') || '[]');
        
        // Count exactly how many times this game was liked/disliked
        const likeCount = likes.filter(name => name === gameName).length || 0;
        const dislikeCount = dislikes.filter(name => name === gameName).length || 0;
        
        // Use consistent numbers based on game name instead of random
        const gameNameSum = [...gameName].reduce((sum, char) => sum + char.charCodeAt(0), 0);
        const baseLikes = (gameNameSum % 800) + 50; // Between 50-849
        const baseDislikes = (gameNameSum % 70) + 5; // Between 5-74
        
        const totalLikes = baseLikes + likeCount;
        const totalDislikes = baseDislikes + dislikeCount;
        
        const likeCountEl = document.getElementById('enhancedLikeCount');
        const dislikeCountEl = document.getElementById('enhancedDislikeCount');
        
        if (likeCountEl) {
            // Format counts consistently
            likeCountEl.textContent = this.formatCount(totalLikes);
        }
        
        if (dislikeCountEl) {
            // Format counts consistently
            dislikeCountEl.textContent = this.formatCount(totalDislikes);
        }
    }

    // Load game state for enhanced layout
    loadEnhancedGameState(gameName) {
        const likes = JSON.parse(localStorage.getItem('gameLikes') || '[]');
        const dislikes = JSON.parse(localStorage.getItem('gameDislikes') || '[]');
        
        // Update like button state
        const likeBtn = document.getElementById('enhancedGameLike');
        if (likeBtn) {
            if (likes.includes(gameName)) {
                likeBtn.classList.add('liked');
            } else {
                likeBtn.classList.remove('liked');
            }
        }
        
        // Reset counter displays
        const likeCountEl = document.getElementById('enhancedLikeCount');
        const dislikeCountEl = document.getElementById('enhancedDislikeCount');
        
        // Initialize with base values (will be updated by updateEnhancedLikeDislikeCounts)
        if (likeCountEl) likeCountEl.textContent = '1';
        if (dislikeCountEl) dislikeCountEl.textContent = '1';
        
        // Update dislike button state
        const dislikeBtn = document.getElementById('enhancedGameDislike');
        if (dislikeBtn) {
            if (dislikes.includes(gameName)) {
                dislikeBtn.classList.add('disliked');
            } else {
                dislikeBtn.classList.remove('disliked');
            }
        }
        
        // Update counts
        this.updateEnhancedLikeDislikeCounts(gameName);
    }

    trackGamePlay(gameName) {
        let gameStats = JSON.parse(localStorage.getItem('gameStats') || '{}');
        if (!gameStats[gameName]) {
            gameStats[gameName] = { plays: 0, lastPlayed: null };
        }
        gameStats[gameName].plays++;
        gameStats[gameName].lastPlayed = new Date().toISOString();
        localStorage.setItem('gameStats', JSON.stringify(gameStats));
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        
        let bgColor = 'bg-game-primary text-game-dark';
        if (type === 'success') {
            bgColor = 'bg-green-500 text-white';
        } else if (type === 'error') {
            bgColor = 'bg-red-500 text-white';
        } else if (type === 'warning') {
            bgColor = 'bg-yellow-500 text-black';
        }
        
        notification.className = `fixed top-4 right-4 ${bgColor} px-4 py-2 rounded-lg shadow-lg z-50 transform translate-x-full transition-transform duration-300 font-semibold`;
        notification.textContent = message;
        document.body.appendChild(notification);

        // Show notification
        setTimeout(() => {
            notification.classList.remove('translate-x-full');
        }, 100);

        // Hide notification after 3 seconds
        setTimeout(() => {
            notification.classList.add('translate-x-full');
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
}

// Initialize game player
const gamePlayer = new GamePlayer();

// Load API games on startup
async function initializeGames() {
    console.log('🚀 Initializing LuckyDeep Games Hub...');
    
    // Show loading message
    const loadingMessage = document.createElement('div');
    loadingMessage.id = 'apiLoadingMessage';
    loadingMessage.className = 'fixed top-4 right-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 font-semibold';
    loadingMessage.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Loading thousands of games...';
    document.body.appendChild(loadingMessage);
    
    try {
        // Load games from both APIs
        const [gamepixGames, gamemonetizeGames] = await Promise.all([
            fetchGamePixGames(),
            fetchGameMonetizeGames()
        ]);
        
        // Combine all games
        allGames = [...gamepixGames, ...gamemonetizeGames];
        
        // Update the loading message to show success
        loadingMessage.innerHTML = `<i class="fas fa-check-circle mr-2"></i>Loaded ${Object.keys(gameData).length}+ games successfully!`;
        loadingMessage.className = loadingMessage.className.replace('from-blue-500 to-purple-500', 'from-green-500 to-emerald-500');
        
        // Generate and display initial game cards
        generateGameCards();
        
        // Re-initialize search functionality now that games are loaded
        initializeSearch();
        
        console.log(`✅ Gaming hub initialized with ${Object.keys(gameData).length} games`);
        
        // Update game counters in UI
        updateGameCounters(Object.keys(gameData).length);
        
    } catch (error) {
        console.error('Error loading games:', error);
        loadingMessage.innerHTML = '<i class="fas fa-exclamation-triangle mr-2"></i>Error loading games. Using fallback games.';
        loadingMessage.className = loadingMessage.className.replace('from-blue-500 to-purple-500', 'from-red-500 to-pink-500');
        
        // Load fallback games
        loadFallbackGames();
        generateGameCards();
    }
    
    // Remove message after 5 seconds
    setTimeout(() => {
        if (loadingMessage.parentNode) {
            loadingMessage.style.transform = 'translateX(100%)';
            setTimeout(() => loadingMessage.remove(), 300);
        }
    }, 5000);
}

// Function to generate game cards from loaded data
function generateGameCards() {
    const gameNames = Object.keys(gameData);
    if (gameNames.length === 0) {
        console.warn('No games available to display');
        return;
    }
    
    // Find game sections in the HTML based on actual IDs and classes
    const gameSections = [
        { selector: '#trendingGamesContainer', maxGames: 8, type: 'trending' },
        { selector: '#newGamesContainer', maxGames: 12, type: 'new' },
        { selector: '#popularGamesContainer', maxGames: 10, type: 'popular' },
        { selector: '#featuredGamesContainer', maxGames: 6, type: 'featured' },
        { selector: '#allGamesContainer', maxGames: 24, type: 'all' }
    ];
    
    gameSections.forEach(({ selector, maxGames, type }) => {
        const container = document.querySelector(selector);
        if (container) {
            // Get shuffled games for this section
            const shuffledGames = [...gameNames].sort(() => 0.5 - Math.random()).slice(0, maxGames);
            
            const gameCardsHTML = shuffledGames.map(gameName => {
                const game = gameData[gameName];
                if (type === 'new' && container.classList.contains('xl:grid-cols-6')) {
                    // Use compact card for new games section
                    return createCompactGameCardHTML(gameName, game);
                } else if (type === 'all') {
                    // Use compact card for all games section too
                    return createCompactGameCardHTML(gameName, game);
                } else {
                    return createGameCardHTML(gameName, game);
                }
            }).join('');
            
            container.innerHTML = gameCardsHTML;
            console.log(`📊 Populated ${selector} (${type}) with ${shuffledGames.length} games`);
            
            // For all games section, set up initial display
            if (type === 'all') {
                displayedGames = shuffledGames;
                updateGamesCount(gameNames.length);
                
                // Show load more button if there are more games
                const loadMoreBtn = document.querySelector('#loadMoreGames');
                if (loadMoreBtn && shuffledGames.length < gameNames.length) {
                    loadMoreBtn.style.display = 'block';
                }
            }
        } else {
            console.warn(`Container not found: ${selector}`);
        }
    });
    
    // Re-attach event listeners for new cards
    setTimeout(() => {
        attachGameCardListeners();
        setupShuffleButton();
    }, 100);
}

// Function to update the games count display
function updateGamesCount(total, displayed = null) {
    const gamesCountElement = document.querySelector('#games-count');
    if (gamesCountElement) {
        if (displayed) {
            gamesCountElement.textContent = `Showing ${displayed} of ${total} games`;
        } else {
            gamesCountElement.textContent = `${total} games available`;
        }
    }
}

// Function to setup shuffle button
function setupShuffleButton() {
    const shuffleBtn = document.querySelector('#shuffle-games');
    if (shuffleBtn) {
        shuffleBtn.addEventListener('click', function() {
            const gameNames = Object.keys(gameData);
            if (gameNames.length === 0) return;
            
            // Shuffle and display new set of games
            const shuffledGames = [...gameNames].sort(() => 0.5 - Math.random()).slice(0, 24);
            const container = document.querySelector('#allGamesContainer');
            
            if (container) {
                const gameCardsHTML = shuffledGames.map(gameName => {
                    const game = gameData[gameName];
                    return createCompactGameCardHTML(gameName, game);
                }).join('');
                
                container.innerHTML = gameCardsHTML;
                displayedGames = shuffledGames;
                
                // Add animation
                container.style.opacity = '0.5';
                setTimeout(() => {
                    container.style.opacity = '1';
                    attachGameCardListeners();
                }, 200);
                
                showGameNotification('Games shuffled!', 'success');
            }
        });
    }
}

// Function to create individual game card HTML
function createGameCardHTML(gameName, game) {
    return `
        <div class="game-card bg-game-gray rounded-xl overflow-hidden hover:transform hover:scale-105 transition-all duration-300 cursor-pointer" data-game-name="${gameName}">
            <div class="aspect-video relative overflow-hidden">
                <img src="${game.thumb}" alt="${gameName}" class="w-full h-full object-cover" loading="lazy" 
                     onerror="this.src='data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"320\" height=\"240\" viewBox=\"0 0 320 240\"><rect width=\"320\" height=\"240\" fill=\"%23333\"/><text x=\"50%\" y=\"50%\" fill=\"%23fff\" text-anchor=\"middle\" font-size=\"16\">🎮</text></svg>'">
                <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                <div class="absolute bottom-3 left-3 right-3">
                    <div class="flex items-center justify-between">
                        <span class="bg-game-primary text-game-dark px-2 py-1 rounded text-xs font-semibold">${game.category}</span>
                        <div class="flex items-center space-x-2 text-white text-xs">
                            <span>⭐ ${game.rating}</span>
                            <span>👁️ ${game.plays}</span>
                        </div>
                    </div>
                </div>
                <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-0 hover:opacity-100 transition-opacity duration-300">
                    <button class="play-btn bg-game-primary hover:bg-game-primary/80 text-game-dark w-12 h-12 rounded-full flex items-center justify-center font-bold transition-all">
                        <i class="fas fa-play ml-1"></i>
                    </button>
                </div>
            </div>
            <div class="p-4">
                <h3 class="game-title text-white font-semibold mb-2 line-clamp-1">${gameName}</h3>
                <p class="text-gray-400 text-sm mb-3 line-clamp-2">${game.description}</p>
                <div class="flex items-center justify-between">
                    <div class="flex flex-wrap gap-1">
                        ${game.tags.slice(0, 2).map(tag => `<span class="bg-game-primary/20 text-game-primary px-2 py-1 rounded text-xs">${tag}</span>`).join('')}
                    </div>
                    <button class="play-btn bg-game-primary hover:bg-game-primary/80 text-game-dark px-4 py-2 rounded-lg font-semibold transition-all">
                        Play
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Function to create compact game card HTML for smaller grids
function createCompactGameCardHTML(gameName, game) {
    return `
        <div class="game-card bg-game-gray rounded-lg overflow-hidden hover:transform hover:scale-105 transition-all duration-300 cursor-pointer" data-game-name="${gameName}">
            <div class="aspect-square relative overflow-hidden">
                <img src="${game.thumb}" alt="${gameName}" class="w-full h-full object-cover" loading="lazy" 
                     onerror="this.src='data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"160\" height=\"160\" viewBox=\"0 0 160 160\"><rect width=\"160\" height=\"160\" fill=\"%23333\"/><text x=\"50%\" y=\"50%\" fill=\"%23fff\" text-anchor=\"middle\" font-size=\"12\">🎮</text></svg>'">
                <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"></div>
                <div class="absolute bottom-2 left-2 right-2">
                    <span class="bg-game-primary text-game-dark px-2 py-1 rounded text-xs font-semibold">${game.category}</span>
                </div>
                <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-0 hover:opacity-100 transition-opacity duration-300">
                    <button class="play-btn bg-game-primary hover:bg-game-primary/80 text-game-dark w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all">
                        <i class="fas fa-play text-sm ml-0.5"></i>
                    </button>
                </div>
            </div>
            <div class="p-3">
                <h3 class="game-title text-white font-semibold text-sm mb-1 line-clamp-1">${gameName}</h3>
                <div class="flex items-center justify-between text-xs">
                    <span class="text-gray-400">⭐ ${game.rating}</span>
                    <button class="play-btn bg-game-primary hover:bg-game-primary/80 text-game-dark px-3 py-1 rounded font-semibold transition-all">
                        Play
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Function to filter and display games based on category
function filterAndDisplayGames(category = 'all') {
    currentCategory = category;
    let filteredGames = Object.keys(gameData);
    
    // Update category title
    const categoryTitle = document.querySelector('#category-title');
    if (categoryTitle) {
        if (category === 'all') {
            categoryTitle.textContent = 'All Games';
        } else {
            categoryTitle.textContent = `${category.charAt(0).toUpperCase() + category.slice(1)} Games`;
        }
    }
    
    if (category !== 'all') {
        filteredGames = filteredGames.filter(gameName => {
            const game = gameData[gameName];
            return game.category.toLowerCase() === category.toLowerCase();
        });
    }
    
    // Store filtered games for pagination
    currentFilteredGames = filteredGames;
    
    // Reset to first page
    currentPage = 1;
    
    // Display first page
    displayGamesPage(currentPage);
    
    // Setup pagination controls
    setupPaginationControls();
    
    console.log(`🎮 Filtered to ${filteredGames.length} games in category: ${category}`);
}

// Function to display a specific page of games
function displayGamesPage(pageNumber) {
    const startIndex = (pageNumber - 1) * gamesPerPage;
    const endIndex = startIndex + gamesPerPage;
    const pageGames = currentFilteredGames.slice(startIndex, endIndex);
    
    // Update the all games container
    const allGamesContainer = document.querySelector('#allGamesContainer');
    if (allGamesContainer) {
        if (pageGames.length === 0) {
            allGamesContainer.innerHTML = `
                <div class="col-span-full text-center py-12">
                    <div class="text-6xl text-gray-600 mb-4">
                        <i class="fas fa-gamepad"></i>
                    </div>
                    <h3 class="text-xl text-gray-400 mb-2">No games found</h3>
                    <p class="text-gray-500">Try selecting a different category</p>
                </div>
            `;
        } else {
            const gameCardsHTML = pageGames.map(gameName => {
                const game = gameData[gameName];
                return createCompactGameCardHTML(gameName, game);
            }).join('');
            
            allGamesContainer.innerHTML = gameCardsHTML;
        }
        
        // Update pagination info
        updatePaginationInfo();
        
        // Re-attach event listeners
        setTimeout(() => {
            attachGameCardListeners();
        }, 100);
    }
    
    displayedGames = pageGames;
    currentPage = pageNumber;
}

// Function to setup pagination controls
function setupPaginationControls() {
    const totalGames = currentFilteredGames.length;
    const totalPages = Math.ceil(totalGames / gamesPerPage);
    
    // Show/hide pagination controls based on total games
    const paginationControls = document.querySelector('#paginationControls');
    const loadMoreBtn = document.querySelector('#loadMoreGames');
    
    if (totalPages > 1) {
        if (paginationControls) paginationControls.style.display = 'block';
        if (loadMoreBtn) loadMoreBtn.style.display = 'none';
        
        // Setup pagination buttons
        setupPaginationButtons(totalPages);
        setupPageJump(totalPages);
        setupGamesPerPageSelector();
    } else {
        if (paginationControls) paginationControls.style.display = 'none';
        if (loadMoreBtn) loadMoreBtn.style.display = 'none';
    }
}

// Function to setup pagination buttons
function setupPaginationButtons(totalPages) {
    const firstPageBtn = document.querySelector('#firstPageBtn');
    const prevPageBtn = document.querySelector('#prevPageBtn');
    const nextPageBtn = document.querySelector('#nextPageBtn');
    const lastPageBtn = document.querySelector('#lastPageBtn');
    
    // Remove existing listeners by checking if already initialized
    const buttons = [firstPageBtn, prevPageBtn, nextPageBtn, lastPageBtn];
    buttons.forEach(btn => {
        if (btn && !btn.hasAttribute('data-pagination-listener')) {
            btn.setAttribute('data-pagination-listener', 'true');
        }
    });
    
    // Add event listeners only if not already added
    if (firstPageBtn && !firstPageBtn.hasAttribute('data-pagination-active')) {
        firstPageBtn.setAttribute('data-pagination-active', 'true');
        firstPageBtn.addEventListener('click', () => goToPage(1));
    }
    
    if (prevPageBtn && !prevPageBtn.hasAttribute('data-pagination-active')) {
        prevPageBtn.setAttribute('data-pagination-active', 'true');
        prevPageBtn.addEventListener('click', () => {
            if (currentPage > 1) goToPage(currentPage - 1);
        });
    }
    
    if (nextPageBtn && !nextPageBtn.hasAttribute('data-pagination-active')) {
        nextPageBtn.setAttribute('data-pagination-active', 'true');
        nextPageBtn.addEventListener('click', () => {
            if (currentPage < totalPages) goToPage(currentPage + 1);
        });
    }
    
    if (lastPageBtn && !lastPageBtn.hasAttribute('data-pagination-active')) {
        lastPageBtn.setAttribute('data-pagination-active', 'true');
        lastPageBtn.addEventListener('click', () => goToPage(totalPages));
    }
    
    // Update page numbers
    updatePageNumbers(totalPages);
    
    // Update button states
    updatePaginationButtonStates(totalPages);
}

// Function to update page numbers display
function updatePageNumbers(totalPages) {
    const pageNumbers = document.querySelector('#pageNumbers');
    if (!pageNumbers) return;
    
    pageNumbers.innerHTML = '';
    
    // Calculate which page numbers to show
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, currentPage + 2);
    
    // Adjust if we're near the beginning or end
    if (endPage - startPage < 4) {
        if (startPage === 1) {
            endPage = Math.min(totalPages, startPage + 4);
        } else if (endPage === totalPages) {
            startPage = Math.max(1, endPage - 4);
        }
    }
    
    // Add ellipsis and first page if needed
    if (startPage > 1) {
        addPageButton(pageNumbers, 1);
        if (startPage > 2) {
            const ellipsis = document.createElement('span');
            ellipsis.textContent = '...';
            ellipsis.className = 'px-2 py-1 text-gray-400';
            pageNumbers.appendChild(ellipsis);
        }
    }
    
    // Add page numbers
    for (let i = startPage; i <= endPage; i++) {
        addPageButton(pageNumbers, i);
    }
    
    // Add ellipsis and last page if needed
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            const ellipsis = document.createElement('span');
            ellipsis.textContent = '...';
            ellipsis.className = 'px-2 py-1 text-gray-400';
            pageNumbers.appendChild(ellipsis);
        }
        addPageButton(pageNumbers, totalPages);
    }
}

// Function to add a page button
function addPageButton(container, pageNum) {
    const button = document.createElement('button');
    button.textContent = pageNum;
    button.className = `px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
        pageNum === currentPage 
            ? 'bg-game-primary text-game-dark font-semibold' 
            : 'bg-game-gray hover:bg-game-primary hover:text-game-dark text-white'
    }`;
    
    button.addEventListener('click', () => goToPage(pageNum));
    container.appendChild(button);
}

// Function to update pagination button states
function updatePaginationButtonStates(totalPages) {
    const firstPageBtn = document.querySelector('#firstPageBtn');
    const prevPageBtn = document.querySelector('#prevPageBtn');
    const nextPageBtn = document.querySelector('#nextPageBtn');
    const lastPageBtn = document.querySelector('#lastPageBtn');
    
    // Disable/enable buttons based on current page
    if (firstPageBtn) {
        firstPageBtn.disabled = currentPage === 1;
    }
    if (prevPageBtn) {
        prevPageBtn.disabled = currentPage === 1;
    }
    if (nextPageBtn) {
        nextPageBtn.disabled = currentPage === totalPages;
    }
    if (lastPageBtn) {
        lastPageBtn.disabled = currentPage === totalPages;
    }
}

// Function to go to a specific page
function goToPage(pageNumber) {
    const totalPages = Math.ceil(currentFilteredGames.length / gamesPerPage);
    
    if (pageNumber < 1 || pageNumber > totalPages) {
        showGameNotification('Invalid page number!', 'error');
        return;
    }
    
    // Add loading animation
    const allGamesContainer = document.querySelector('#allGamesContainer');
    if (allGamesContainer) {
        allGamesContainer.style.opacity = '0.5';
    }
    
    // Display the page
    setTimeout(() => {
        displayGamesPage(pageNumber);
        setupPaginationButtons(totalPages);
        
        // Restore opacity
        if (allGamesContainer) {
            allGamesContainer.style.opacity = '1';
        }
        
        // Scroll to top of games section
        const allGamesSection = document.querySelector('#all-games');
        if (allGamesSection) {
            allGamesSection.scrollIntoView({ 
                behavior: 'smooth',
                block: 'start'
            });
        }
    }, 200);
}

// Function to setup page jump functionality
function setupPageJump(totalPages) {
    const pageJumpInput = document.querySelector('#pageJumpInput');
    const pageJumpBtn = document.querySelector('#pageJumpBtn');
    
    if (pageJumpInput) {
        pageJumpInput.max = totalPages;
        pageJumpInput.value = currentPage;
        
        // Add listener only if not already added
        if (!pageJumpInput.hasAttribute('data-jump-listener')) {
            pageJumpInput.setAttribute('data-jump-listener', 'true');
            pageJumpInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const pageNum = parseInt(pageJumpInput.value);
                    goToPage(pageNum);
                }
            });
        }
    }
    
    if (pageJumpBtn) {
        // Add listener only if not already added
        if (!pageJumpBtn.hasAttribute('data-jump-listener')) {
            pageJumpBtn.setAttribute('data-jump-listener', 'true');
            pageJumpBtn.addEventListener('click', () => {
                const pageInput = document.querySelector('#pageJumpInput');
                const pageNum = parseInt(pageInput.value);
                goToPage(pageNum);
            });
        }
    }
}

// Function to setup games per page selector
function setupGamesPerPageSelector() {
    const selector = document.querySelector('#gamesPerPageSelect');
    
    if (selector) {
        selector.value = gamesPerPage;
        
        // Add listener only if not already added
        if (!selector.hasAttribute('data-selector-listener')) {
            selector.setAttribute('data-selector-listener', 'true');
            selector.addEventListener('change', (e) => {
                gamesPerPage = parseInt(e.target.value);
                currentPage = 1; // Reset to first page
                filterAndDisplayGames(currentCategory); // Re-filter with new page size
                showGameNotification(`Now showing ${gamesPerPage} games per page`, 'success');
            });
        }
    }
}

// Function to update pagination info display
function updatePaginationInfo() {
    const totalGames = currentFilteredGames.length;
    const totalPages = Math.ceil(totalGames / gamesPerPage);
    const startIndex = (currentPage - 1) * gamesPerPage + 1;
    const endIndex = Math.min(currentPage * gamesPerPage, totalGames);
    
    // Update displays
    const elements = {
        currentPageDisplay: currentPage,
        totalPagesDisplay: totalPages,
        startGameIndex: startIndex,
        endGameIndex: endIndex,
        totalGamesInCategory: totalGames
    };
    
    Object.entries(elements).forEach(([id, value]) => {
        const element = document.querySelector(`#${id}`);
        if (element) {
            element.textContent = value;
        }
    });
    
    // Update page jump input
    const pageJumpInput = document.querySelector('#pageJumpInput');
    if (pageJumpInput) {
        pageJumpInput.value = currentPage;
        pageJumpInput.max = totalPages;
    }
}

// Function to load more games in the current category
function loadMoreGamesInCategory(filteredGames) {
    const nextPageGames = filteredGames.slice(displayedGames.length, displayedGames.length + gamesPerPage);
    
    if (nextPageGames.length === 0) {
        showGameNotification('All games in this category have been loaded!', 'info');
        return;
    }
    
    // Add new games to displayed games
    displayedGames = [...displayedGames, ...nextPageGames];
    
    // Generate HTML for new games
    const newGameCardsHTML = nextPageGames.map(gameName => {
        const game = gameData[gameName];
        return createCompactGameCardHTML(gameName, game);
    }).join('');
    
    // Find the all games container and append new cards
    const allGamesContainer = document.querySelector('#allGamesContainer');
    if (allGamesContainer) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = newGameCardsHTML;
        
        // Append each card individually for better animation
        Array.from(tempDiv.children).forEach((card, index) => {
            setTimeout(() => {
                allGamesContainer.appendChild(card);
                card.style.opacity = '0';
                card.style.transform = 'translateY(20px)';
                
                // Animate in
                setTimeout(() => {
                    card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                    card.style.opacity = '1';
                    card.style.transform = 'translateY(0)';
                }, 50);
            }, index * 50);
        });
    }
    
    // Update games count
    updateGamesCount(filteredGames.length, displayedGames.length);
    
    // Hide load more button if all games are displayed
    if (displayedGames.length >= filteredGames.length) {
        const loadMoreBtn = document.querySelector('#loadMoreGames');
        if (loadMoreBtn) {
            loadMoreBtn.style.display = 'none';
        }
    }
    
    // Re-attach event listeners for new cards
    setTimeout(() => {
        attachGameCardListeners();
    }, nextPageGames.length * 50 + 100);
    
}

// Helper function to show notifications
function showGameNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `fixed top-20 right-4 px-6 py-3 rounded-lg shadow-lg z-50 font-semibold transform translate-x-full transition-transform duration-300`;
    
    switch(type) {
        case 'success':
            notification.className += ' bg-gradient-to-r from-green-500 to-emerald-500 text-white';
            break;
        case 'error':
            notification.className += ' bg-gradient-to-r from-red-500 to-pink-500 text-white';
            break;
        case 'warning':
            notification.className += ' bg-gradient-to-r from-yellow-500 to-orange-500 text-white';
            break;
        default:
            notification.className += ' bg-gradient-to-r from-blue-500 to-purple-500 text-white';
    }
    
    notification.innerHTML = `<i class="fas fa-info-circle mr-2"></i>${message}`;
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 300);
    }, 3000);
}

// Fallback games in case APIs fail
function loadFallbackGames() {
    const fallbackGames = {
        'Classic Snake': {
            url: 'https://www.google.com/fbx?fbx=snake_arcade',
            category: 'Arcade',
            rating: 4.5,
            plays: '10M',
            description: 'Classic Snake game - eat the food and grow longer!',
            tags: ['Arcade', 'Classic', 'Snake', 'Retro'],
            thumb: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="320" height="240" viewBox="0 0 320 240"><rect width="320" height="240" fill="%23000"/><text x="50%" y="50%" fill="%23fff" text-anchor="middle" font-size="24">🐍</text></svg>'
        },
        'Tic Tac Toe': {
            url: 'data:text/html,<html><body style="margin:0;display:flex;justify-content:center;align-items:center;height:100vh;background:#111;color:white;font-family:Arial;"><div><h2>Tic Tac Toe</h2><div style="display:grid;grid-template-columns:repeat(3,100px);gap:5px;"><div onclick="play(this)" style="width:100px;height:100px;border:2px solid white;display:flex;align-items:center;justify-content:center;font-size:24px;cursor:pointer;"></div><div onclick="play(this)" style="width:100px;height:100px;border:2px solid white;display:flex;align-items:center;justify-content:center;font-size:24px;cursor:pointer;"></div><div onclick="play(this)" style="width:100px;height:100px;border:2px solid white;display:flex;align-items:center;justify-content:center;font-size:24px;cursor:pointer;"></div><div onclick="play(this)" style="width:100px;height:100px;border:2px solid white;display:flex;align-items:center;justify-content:center;font-size:24px;cursor:pointer;"></div><div onclick="play(this)" style="width:100px;height:100px;border:2px solid white;display:flex;align-items:center;justify-content:center;font-size:24px;cursor:pointer;"></div><div onclick="play(this)" style="width:100px;height:100px;border:2px solid white;display:flex;align-items:center;justify-content:center;font-size:24px;cursor:pointer;"></div><div onclick="play(this)" style="width:100px;height:100px;border:2px solid white;display:flex;align-items:center;justify-content:center;font-size:24px;cursor:pointer;"></div><div onclick="play(this)" style="width:100px;height:100px;border:2px solid white;display:flex;align-items:center;justify-content:center;font-size:24px;cursor:pointer;"></div><div onclick="play(this)" style="width:100px;height:100px;border:2px solid white;display:flex;align-items:center;justify-content:center;font-size:24px;cursor:pointer;"></div></div></div><script>let turn="X";function play(e){if(!e.textContent){e.textContent=turn;turn=turn=="X"?"O":"X"}}</script></body></html>',
            category: 'Puzzle',
            rating: 4.2,
            plays: '5M',
            description: 'Classic Tic Tac Toe game - get three in a row!',
            tags: ['Puzzle', 'Classic', 'Strategy', 'Two Player'],
            thumb: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="320" height="240" viewBox="0 0 320 240"><rect width="320" height="240" fill="%23000"/><text x="50%" y="50%" fill="%23fff" text-anchor="middle" font-size="24">⭕</text></svg>'
        }
    };
    
    Object.entries(fallbackGames).forEach(([title, game]) => {
        if (!gameData[title]) {
            gameData[title] = game;
        }
    });
    
    console.log('🎮 Fallback games loaded');
    updateGameCounters(Object.keys(gameData).length);
}

function updateGameCounters(totalGames = null) {
    const gameCount = totalGames || Object.keys(gameData).length;
    
    // Update any game counter elements
    const gameCounters = document.querySelectorAll('.game-counter');
    gameCounters.forEach(counter => {
        counter.textContent = gameCount + '+ games';
    });
    
    // Update hero stats
    const heroStats = document.querySelector('.hero-stats');
    if (heroStats) {
        const gameStatElement = heroStats.querySelector('div:first-child .text-2xl');
        if (gameStatElement) {
            gameStatElement.textContent = gameCount > 1000 ? Math.floor(gameCount / 1000) + 'K+' : gameCount + '+';
        }
    }
}

function populateGameSections() {
    // Get random games for different sections
    const allGameNames = Object.keys(gameData);
    const shuffled = [...allGameNames].sort(() => 0.5 - Math.random());
    
    // You can use this to dynamically populate sections if needed
    console.log(`📊 Available for dynamic loading: ${shuffled.length} games`);
}

// Enhanced game card click handlers
document.addEventListener('DOMContentLoaded', async function() {
    // Initialize games first
    await initializeGames();
    
    // Initialize UI elements first (mobile menu, search, navigation)
    initializeUIElements();
    
    // Initialize recently played functionality
    initializeRecentlyPlayed();
    
    // Get all game cards and add proper event listeners (optional if games exist)
    function attachGameCardListeners() {
        const gameCards = document.querySelectorAll('.game-card');
        
        if (gameCards.length === 0) {
            console.log('ℹ️ No game cards found - UI elements only mode');
            return;
        }
        
        gameCards.forEach(card => {
            // Skip if already has listeners attached
            if (card.hasAttribute('data-card-listener')) {
                return;
            }
            card.setAttribute('data-card-listener', 'true');
            
            // Add click event to the entire card
            card.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                // Get game name from multiple possible locations
                let gameName = null;
                const gameTitle = this.querySelector('h3, .game-title, [data-game-name]');
                const gameNameAttr = this.getAttribute('data-game-name');
                
                if (gameTitle) {
                    gameName = gameTitle.textContent.trim();
                } else if (gameNameAttr) {
                    gameName = gameNameAttr;
                }
                
                if (!gameName) {
                    console.warn('❌ Could not find game name for card');
                    return;
                }
                
                // Check if click was on play button or card
                const clickedElement = e.target;
                const isPlayButton = clickedElement.closest('button') || 
                                   clickedElement.classList.contains('play-btn') ||
                                   clickedElement.classList.contains('fa-play') ||
                                   clickedElement.closest('.play-btn');
                
                // Always try to play the game on any click
                const game = gameData[gameName];
                if (game && game.url) {
                    console.log(`🎮 Starting game: ${gameName}`);
                    gamePlayer.startGame(gameName, game.url);
                } else {
                    console.warn(`❌ Game not found in gameData: ${gameName}`);
                    console.log('Available games:', Object.keys(gameData).slice(0, 10));
                    gamePlayer.showNotification(`Game "${gameName}" is loading... Please wait!`);
                }
            });
            
            // Add specific button event listeners for better detection
            const buttons = card.querySelectorAll('button, .play-btn, .btn');
            buttons.forEach(button => {
                if (!button.hasAttribute('data-btn-listener')) {
                    button.setAttribute('data-btn-listener', 'true');
                    button.addEventListener('click', function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        
                        // Force trigger the parent card click
                        card.click();
                    });
                    
                    // Enhanced hover effects
                    button.addEventListener('mouseenter', function() {
                        this.style.transform = 'scale(1.1)';
                        this.style.boxShadow = '0 8px 25px rgba(0, 204, 106, 0.4)';
                    });
                    
                    button.addEventListener('mouseleave', function() {
                        this.style.transform = 'scale(1)';
                        this.style.boxShadow = '';
                    });
                }
            });
            
            // Add card hover effect
            if (!card.hasAttribute('data-hover-listener')) {
                card.setAttribute('data-hover-listener', 'true');
                card.addEventListener('mouseenter', function() {
                    this.style.transform = 'translateY(-5px)';
                    this.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.3)';
                });
                
                card.addEventListener('mouseleave', function() {
                    this.style.transform = 'translateY(0)';
                    this.style.boxShadow = '';
                });
            }
        });
    }
    
    // Initial attachment
    attachGameCardListeners();
    
    // Reattach when new content is loaded
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                // Check if game cards were added
                const hasGameCards = Array.from(mutation.addedNodes).some(node => 
                    node.nodeType === 1 && (
                        node.classList?.contains('game-card') || 
                        node.querySelector?.('.game-card')
                    )
                );
                if (hasGameCards) {
                    setTimeout(attachGameCardListeners, 100);
                }
            }
        });
    });
    
    observer.observe(document.body, { childList: true, subtree: true });

    console.log('🎮 LuckyDeep Games Hub - Fully Loaded!');
    console.log(`📚 ${Object.keys(gameData).length} games available for play`);
});

// Initialize all UI elements (mobile menu, search, navigation, buttons)
function initializeUIElements() {
    console.log('🎮 Initializing UI elements...');
    
    // Mobile menu toggle
    const mobileMenuButton = document.getElementById('mobileMenuBtn');
    const mobileMenu = document.getElementById('mobileMenu');
    
    if (mobileMenuButton && mobileMenu) {
        mobileMenuButton.addEventListener('click', function() {
            mobileMenu.classList.toggle('hidden');
            const icon = mobileMenuButton.querySelector('i');
            if (icon) {
                icon.classList.toggle('fa-bars');
                icon.classList.toggle('fa-times');
            }
        });
        console.log('✅ Mobile menu initialized');
    } else {
        console.warn('⚠️ Mobile menu elements not found');
    }

    // Enhanced search functionality
    const searchInput = document.getElementById('searchInput');
    
    if (searchInput) {
        const performSearch = () => {
            const query = searchInput.value.toLowerCase().trim();
            const allGameNames = Object.keys(gameData);
            
            console.log(`🔍 Searching for: "${query}"`);
            console.log(`📚 Available games: ${allGameNames.length}`);
            
            if (query && query.length > 1) {
                if (allGameNames.length === 0) {
                    console.warn('⚠️ No games loaded yet for search');
                    // Show no games message
                    displaySearchResults([], query);
                    return;
                }
                
                // Filter games based on search in the complete game library
                const matchingGames = allGameNames.filter(gameName => {
                    const game = gameData[gameName];
                    const nameMatch = gameName.toLowerCase().includes(query);
                    const categoryMatch = game.category && game.category.toLowerCase().includes(query);
                    const tagMatch = game.tags && game.tags.some(tag => tag.toLowerCase().includes(query));
                    const descMatch = game.description && game.description.toLowerCase().includes(query);
                    
                    return nameMatch || categoryMatch || tagMatch || descMatch;
                });
                
                console.log(`🎯 Found ${matchingGames.length} matching games`);
                
                // Show search results
                displaySearchResults(matchingGames, query);
            } else {
                // Hide search results
                hideSearchResults();
            }
        };

        // Clear any existing listeners
        if (!searchInput.hasAttribute('data-search-initialized')) {
            searchInput.setAttribute('data-search-initialized', 'true');
            
            searchInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    performSearch();
                }
            });

            // Real-time search with debouncing
            let searchTimeout;
            searchInput.addEventListener('input', function() {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    if (this.value.length > 1) {
                        performSearch();
                    } else {
                        hideSearchResults();
                    }
                }, 300);
            });
            
            // Clear search when clicking outside
            document.addEventListener('click', function(e) {
                if (!searchInput.contains(e.target) && !document.getElementById('searchResults')?.contains(e.target)) {
                    hideSearchResults();
                }
            });
            
            console.log('✅ Search functionality initialized');
        }
    } else {
        console.warn('⚠️ Search input not found');
    }

    // Navigation links smooth scrolling (excluding category filters)
    const navLinks = document.querySelectorAll('nav > div > a[href^="#"], .mobile-menu a[href^="#"]');
    navLinks.forEach(link => {
        // Skip if this is a category filter link
        if (link.closest('.category-scroll')) {
            return;
        }
        
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId && targetId.startsWith('#')) {
                const targetSection = document.querySelector(targetId);
                if (targetSection) {
                    targetSection.scrollIntoView({ 
                        behavior: 'smooth',
                        block: 'start'
                    });
                    // Close mobile menu if open
                    if (mobileMenu && !mobileMenu.classList.contains('hidden')) {
                        mobileMenu.classList.add('hidden');
                        const icon = mobileMenuButton?.querySelector('i');
                        if (icon) {
                            icon.classList.add('fa-bars');
                            icon.classList.remove('fa-times');
                        }
                    }
                }
            }
        });
    });
    console.log(`✅ ${navLinks.length} navigation links initialized`);

    // Category filter functionality
    initializeCategoryFilters();

    // Load More buttons functionality
    initializeLoadMoreButtons();
    
    // Modal buttons functionality 
    initializeModalButtons();

    // Back to top button
    const backToTopButton = document.getElementById('backToTop');
    if (backToTopButton) {
        window.addEventListener('scroll', function() {
            if (window.pageYOffset > 300) {
                backToTopButton.classList.remove('opacity-0', 'invisible');
                backToTopButton.classList.add('opacity-100', 'visible');
            } else {
                backToTopButton.classList.add('opacity-0', 'invisible');
                backToTopButton.classList.remove('opacity-100', 'visible');
            }
        });

        backToTopButton.addEventListener('click', function(e) {
            e.preventDefault();
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
        console.log('✅ Back to top button initialized');
    }
    
    // Header navigation buttons functionality
    initializeHeaderButtons();
    
    // View All buttons functionality
    initializeViewAllButtons();
    
    // Initialize counting numbers
    initializeNumberCounters();
    
    console.log('🎮 All UI elements initialized successfully!');
}

// Initialize header navigation buttons functionality
function initializeHeaderButtons() {
    console.log('🎯 Initializing header navigation buttons...');
    
    // Play Now button - scrolls to games section and shows random game
    const playNowBtn = document.getElementById('playNowBtn');
    if (playNowBtn) {
        playNowBtn.addEventListener('click', function() {
            console.log('🎮 Play Now button clicked');
            
            // First scroll to the trending games section
            const trendingSection = document.getElementById('trending');
            if (trendingSection) {
                trendingSection.scrollIntoView({ 
                    behavior: 'smooth',
                    block: 'start'
                });
            }
            
            // Wait a moment for scroll, then start a random game
            setTimeout(() => {
                playRandomGame();
            }, 800);
        });
        console.log('✅ Play Now button initialized');
    } else {
        console.warn('⚠️ Play Now button not found');
    }
    
    // Trending Games button - scrolls to trending section
    const trendingGamesBtn = document.getElementById('trendingGamesBtn');
    if (trendingGamesBtn) {
        trendingGamesBtn.addEventListener('click', function() {
            console.log('🔥 Trending Games button clicked');
            
            const trendingSection = document.getElementById('trending');
            if (trendingSection) {
                trendingSection.scrollIntoView({ 
                    behavior: 'smooth',
                    block: 'start'
                });
            } else {
                console.warn('⚠️ Trending section not found');
            }
        });
        console.log('✅ Trending Games button initialized');
    } else {
        console.warn('⚠️ Trending Games button not found');
    }
}

// Initialize number counters with animation
function initializeNumberCounters() {
    const statsContainer = document.querySelector('.hero-stats');
    if (!statsContainer) {
        console.warn('⚠️ Hero stats container not found for counting numbers.');
        return;
    }

    const counters = statsContainer.querySelectorAll('.text-2xl');
    
    const animateCount = (element, target) => {
        let current = 0;
        const increment = target / 100; // Animate over 100 steps
        const duration = 2000; // 2 seconds
        const stepTime = duration / 100;

        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                clearInterval(timer);
                element.textContent = target.toLocaleString() + '+';
            } else {
                element.textContent = Math.floor(current).toLocaleString() + '+';
            }
        }, stepTime);
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                counters.forEach(counter => {
                    const targetText = counter.textContent.replace(/[^\d]/g, '');
                    const target = parseInt(targetText, 10);
                    if (!isNaN(target) && !counter.hasAttribute('data-counted')) {
                        animateCount(counter, target);
                        counter.setAttribute('data-counted', 'true');
                    }
                });
                observer.unobserve(statsContainer); // Stop observing after animation
            }
        });
    }, { threshold: 0.5 });

    observer.observe(statsContainer);
}

// Play a random game
function playRandomGame() {
    console.log('🎲 Starting random game...');
    
    const allGameNames = Object.keys(gameData);
    if (allGameNames.length === 0) {
        console.warn('⚠️ No games available to play');
        return;
    }
    
    // Get a random game
    const randomIndex = Math.floor(Math.random() * allGameNames.length);
    const randomGameName = allGameNames[randomIndex];
    const randomGame = gameData[randomGameName];
    
    if (randomGame && gamePlayer) {
        console.log(`🎮 Playing random game: ${randomGameName}`);
        gamePlayer.startGame(randomGameName, randomGame.url);
    } else {
        console.error('❌ Failed to start random game');
    }
}

// Initialize View All buttons functionality
function initializeViewAllButtons() {
    console.log('🔗 Initializing View All buttons...');
    
    // Get all View All buttons
    const viewAllButtons = document.querySelectorAll('a[href="#all-trending"], a[href="#all-new"], a[href="#all-popular"]');
    
    viewAllButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const href = this.getAttribute('href');
            
            console.log(`🎮 View All clicked: ${href}`);
            
            switch(href) {
                case '#all-trending':
                    showAllGames('trending', 'Trending Games');
                    break;
                case '#all-new':
                    showAllGames('new', 'New Games');
                    break;
                case '#all-popular':
                    showAllGames('popular', 'Most Played Games');
                    break;
            }
        });
    });
    
    console.log(`✅ ${viewAllButtons.length} View All buttons initialized`);
}

// Show all games in a category
function showAllGames(category, title) {
    console.log(`🎯 Showing all ${category} games`);
    
    // Create modal overlay
    const modal = document.createElement('div');
    modal.id = 'allGamesModal';
    modal.className = 'fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4';
    
    // Get games based on category
    let games = [];
    const allGameNames = Object.keys(gameData);
    
    switch(category) {
        case 'trending':
            // Get trending games (games with high ratings and recent activity)
            games = allGameNames.filter(name => {
                const game = gameData[name];
                return game && parseFloat(game.rating) >= 4.0;
            }).slice(0, 50); // Show top 50 trending
            break;
            
        case 'new':
            // Get newer games (reverse order to show recent first)
            games = allGameNames.slice(-50).reverse(); // Show last 50 games as "new"
            break;
            
        case 'popular':
            // Get popular games (based on play count)
            games = allGameNames.filter(name => {
                const game = gameData[name];
                return game && game.plays && parseInt(game.plays.replace(/[^\d]/g, '')) > 100000;
            }).slice(0, 50); // Show top 50 popular
            break;
            
        default:
            games = allGameNames.slice(0, 50);
    }
    
    // Create modal content
    modal.innerHTML = `
        <div class="bg-game-dark-light rounded-xl max-w-6xl w-full max-h-[90vh] overflow-hidden border border-game-gray/30">
            <!-- Header -->
            <div class="sticky top-0 bg-game-dark border-b border-game-gray/30 p-6 flex justify-between items-center">
                <h2 class="text-2xl font-game font-bold text-white">
                    <i class="fas fa-gamepad mr-3 text-game-primary"></i>
                    ${title} (${games.length})
                </h2>
                <button id="closeAllGamesModal" class="text-gray-400 hover:text-white text-2xl transition-colors">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <!-- Games Grid -->
            <div class="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
                <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    ${games.map(gameName => {
                        const game = gameData[gameName];
                        if (!game) return '';
                        
                        return `
                            <div class="bg-game-gray rounded-lg p-4 hover:bg-game-gray-light transition-all cursor-pointer transform hover:scale-105" onclick="playGameFromModal('${gameName}')">
                                <div class="aspect-video bg-gray-800 rounded-lg mb-3 overflow-hidden">
                                    <img src="${game.thumb || 'https://via.placeholder.com/200x120/4F46E5/white?text=' + encodeURIComponent(gameName.charAt(0))}" 
                                         alt="${gameName}" 
                                         class="w-full h-full object-cover"
                                         onerror="this.style.display='none'; this.parentNode.innerHTML='<div class=\\'w-full h-full flex items-center justify-center text-game-primary text-2xl\\'>🎮</div>'">
                                </div>
                                <h3 class="text-white font-semibold text-sm mb-2 truncate">${gameName}</h3>
                                <div class="flex items-center justify-between text-xs text-gray-400">
                                    <span>${game.category || 'Game'}</span>
                                    <span class="text-yellow-400">★ ${game.rating || '4.5'}</span>
                                </div>
                            </div>
                        `;
                    }).filter(html => html !== '').join('')}
                </div>
                
                ${games.length === 0 ? `
                    <div class="text-center py-12">
                        <div class="text-6xl text-gray-600 mb-4">
                            <i class="fas fa-gamepad"></i>
                        </div>
                        <p class="text-gray-400">No games found in this category</p>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
    
    // Add close functionality
    const closeBtn = document.getElementById('closeAllGamesModal');
    closeBtn.addEventListener('click', closeAllGamesModal);
    
    // Close on backdrop click
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeAllGamesModal();
        }
    });
    
    // Close on escape key
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            closeAllGamesModal();
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);
    
    console.log(`✅ All games modal opened with ${games.length} games`);
}

// Close all games modal
function closeAllGamesModal() {
    const modal = document.getElementById('allGamesModal');
    if (modal) {
        modal.remove();
        document.body.style.overflow = '';
        console.log('✅ All games modal closed');
    }
}

// Play game from modal
function playGameFromModal(gameName) {
    console.log(`🎮 Playing game from modal: ${gameName}`);
    
    // Close the modal first
    closeAllGamesModal();
    
    // Get game data and start playing
    const game = gameData[gameName];
    if (game && gamePlayer) {
        gamePlayer.startGame(gameName, game.url);
    } else {
        console.error('❌ Game not found or game player not initialized');
    }
}

// Initialize search functionality
function initializeSearch() {
    const searchInput = document.getElementById('searchInput');
    
    if (!searchInput) {
        console.warn('⚠️ Search input not found');
        return;
    }
    
    console.log('🔍 Initializing search functionality...');
    
    const performSearch = () => {
        const query = searchInput.value.toLowerCase().trim();
        const allGameNames = Object.keys(gameData);
        
        console.log(`🔍 Searching for: "${query}"`);
        console.log(`📚 Available games: ${allGameNames.length}`);
        
        if (query && query.length > 1) {
            if (allGameNames.length === 0) {
                console.warn('⚠️ No games loaded yet for search');
                // Show no games message
                displaySearchResults([], query);
                return;
            }
            
            // Filter games based on search in the complete game library
            const matchingGames = allGameNames.filter(gameName => {
                const game = gameData[gameName];
                const nameMatch = gameName.toLowerCase().includes(query);
                const categoryMatch = game.category && game.category.toLowerCase().includes(query);
                const tagMatch = game.tags && game.tags.some(tag => tag.toLowerCase().includes(query));
                const descMatch = game.description && game.description.toLowerCase().includes(query);
                
                return nameMatch || categoryMatch || tagMatch || descMatch;
            });
            
            console.log(`🎯 Found ${matchingGames.length} matching games`);
            
            // Show search results
            displaySearchResults(matchingGames, query);
        } else {
            // Hide search results
            hideSearchResults();
        }
    };

    // Clear any existing listeners
    if (!searchInput.hasAttribute('data-search-initialized')) {
        searchInput.setAttribute('data-search-initialized', 'true');
        
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                performSearch();
            }
        });

        // Real-time search with debouncing
        let searchTimeout;
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                if (this.value.length > 1) {
                    performSearch();
                } else {
                    hideSearchResults();
                }
            }, 300);
        });
        
        // Clear search when clicking outside
        document.addEventListener('click', function(e) {
            if (!searchInput.contains(e.target) && !document.getElementById('searchResults')?.contains(e.target)) {
                hideSearchResults();
            }
        });
        
        console.log('✅ Search functionality initialized');
    }
}

// Initialize Load More buttons
function initializeLoadMoreButtons() {
    // Find all Load More buttons
    const loadMoreButtons = document.querySelectorAll('button');
    
    loadMoreButtons.forEach(button => {
        const buttonText = button.textContent.trim();
        
        if (buttonText.includes('Load More') || buttonText.includes('load more')) {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                
                // Load more games if available
                if (Object.keys(gameData).length > 0) {
                    loadMoreGames();
                } else {
                    showGameNotification('No games are currently loaded. Please wait for games to load.', 'info');
                }
                
                console.log(`🎮 Load More button clicked: ${buttonText}`);
            });
        }
    });
    
    console.log('✅ Load More buttons initialized');
}

// Function to load more games (pagination)
function loadMoreGames() {
    // This function is now handled by the pagination system
    // Redirect to next page functionality
    const totalPages = Math.ceil(currentFilteredGames.length / gamesPerPage);
    if (currentPage < totalPages) {
        goToPage(currentPage + 1);
    } else {
        showGameNotification('All games have been loaded!', 'info');
    }
}

// Initialize modal and game-related buttons
function initializeModalButtons() {
    // Favorite button in modal (different from game player favorite)
    const favoriteGameBtn = document.getElementById('favoriteGameBtn');
    if (favoriteGameBtn) {
        favoriteGameBtn.addEventListener('click', function(e) {
            e.preventDefault();
            showGameNotification('No game selected to add to favorites.', 'warning');
            console.log('🎮 Modal favorite button clicked');
        });
        console.log('✅ Modal favorite button initialized');
    }
    
    // Play button in modal (this might be handled by GamePlayer but adding backup)
    const playGameBtn = document.getElementById('playGameBtn');
    if (playGameBtn) {
        // Only add if no existing listeners (GamePlayer handles this normally)
        const hasExistingListener = playGameBtn.hasAttribute('data-listener-added');
        if (!hasExistingListener) {
            playGameBtn.addEventListener('click', function(e) {
                e.preventDefault();
                showGameNotification('No game available to play.', 'warning');
                console.log('🎮 Modal play button clicked (backup handler)');
            });
            playGameBtn.setAttribute('data-listener-added', 'true');
            console.log('✅ Modal play button backup initialized');
        }
    }
    
    // Hero section buttons
    const heroButtons = document.querySelectorAll('.hero button, .cta button');
    heroButtons.forEach(button => {
        const buttonText = button.textContent.trim();
        // Skip if already has specific handler
        if (!button.hasAttribute('data-listener-added') && button.id !== 'playNowBtn' && button.id !== 'trendingGamesBtn') {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                
                if (buttonText.includes('Play') || buttonText.includes('Start')) {
                    playRandomGame();
                } else if (buttonText.includes('Browse')) {
                    const allGamesSection = document.querySelector('#all-games');
                    if (allGamesSection) {
                        allGamesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                } else {
                    showGameNotification('Feature coming soon!', 'info');
                }
                
                console.log(`🎮 Hero button clicked: ${buttonText}`);
            });
            button.setAttribute('data-listener-added', 'true');
        }
    });
    
    console.log('✅ Modal and hero buttons initialized');
}

// Initialize category filter functionality
function initializeCategoryFilters() {
    const categoryLinks = document.querySelectorAll('.category-scroll a');
    
    // Remove any existing listeners first
    categoryLinks.forEach(link => {
        if (link.hasAttribute('data-category-listener')) {
            return; // Skip if already initialized
        }
        link.setAttribute('data-category-listener', 'true');
    });
    
    categoryLinks.forEach(link => {
        if (link.hasAttribute('data-category-listener')) {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                
                // Remove active class from all category links
                categoryLinks.forEach(l => {
                    l.classList.remove('bg-game-primary', 'text-game-dark');
                    l.classList.add('bg-game-gray');
                });
                
                // Add active class to clicked link
                this.classList.remove('bg-game-gray');
                this.classList.add('bg-game-primary', 'text-game-dark');
                
                const category = this.getAttribute('href').replace('#', '');
                
                // Show all games section
                const allGamesSection = document.querySelector('#all-games');
                if (allGamesSection) {
                    allGamesSection.style.display = 'block';
                    
                    // Smooth scroll to the all games section
                    setTimeout(() => {
                        allGamesSection.scrollIntoView({ 
                            behavior: 'smooth',
                            block: 'start'
                        });
                    }, 100);
                }
                
                // Filter and display games for this category
                if (Object.keys(gameData).length > 0) {
                    filterAndDisplayGames(category);
                    showGameNotification(`Showing ${category === 'all' ? 'all' : category} games`, 'success');
                } else {
                    showGameNotification(`Category "${category}" selected. Loading games...`, 'info');
                }
                
                console.log(`🎮 Category selected: ${category}`);
            });
        }
    });
    
    console.log(`✅ ${categoryLinks.length} category filters initialized`);
}

// Search results display functions
function displaySearchResults(matchingGames, query) {
    console.log(`� Displaying search results for "${query}":`, matchingGames);
    console.log(`�📊 Displaying ${matchingGames.length} search results for "${query}"`);
    
    let searchResultsContainer = document.getElementById('searchResults');
    
    if (!searchResultsContainer) {
        searchResultsContainer = document.createElement('div');
        searchResultsContainer.id = 'searchResults';
        searchResultsContainer.className = 'fixed top-20 left-0 right-0 bg-game-dark/95 backdrop-blur-md z-50 max-h-[70vh] overflow-y-auto border-t border-game-primary/20 shadow-2xl';
        document.body.appendChild(searchResultsContainer);
    }
    
    if (matchingGames.length === 0) {
        searchResultsContainer.innerHTML = `
            <div class="p-6 text-center text-gray-400">
                <i class="fas fa-search text-3xl mb-3"></i>
                <p class="text-lg">No games found for "${query}"</p>
                <p class="text-sm text-gray-500 mt-2">Try searching for categories like "action", "puzzle", or "racing"</p>
            </div>
        `;
    } else {
        const resultsHTML = matchingGames.map(gameName => {
            const game = gameData[gameName];
            if (!game) return '';
            
            return `
                <div class="p-4 border-b border-game-primary/10 hover:bg-game-primary/10 cursor-pointer flex items-center space-x-4 search-result-item transition-all duration-200" data-game="${gameName}">
                    <div class="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-gradient-to-br from-game-primary/20 to-game-secondary/20">
                        <img src="${game.thumb}" alt="${gameName}" class="w-full h-full object-cover" 
                             onerror="this.style.display='none'; this.parentNode.innerHTML='<div class=\\'w-full h-full flex items-center justify-center text-game-primary\\'>🎮</div>'">
                    </div>
                    <div class="flex-1 min-w-0">
                        <h4 class="text-white font-semibold truncate">${gameName}</h4>
                        <p class="text-game-primary text-sm">${game.category} • ${game.rating}⭐ • ${game.plays} plays</p>
                    </div>
                    <button class="bg-game-primary hover:bg-game-accent text-game-dark px-4 py-2 rounded-lg font-semibold transition-all flex items-center">
                        <i class="fas fa-play mr-1"></i> Play
                    </button>
                </div>
            `;
        }).filter(html => html !== '').join('');
        
        searchResultsContainer.innerHTML = `
            <div class="p-4 bg-game-primary/10 border-b border-game-primary/20 sticky top-0 z-10">
                <div class="flex items-center justify-between">
                    <h3 class="text-game-primary font-semibold">Found ${matchingGames.length} games for "${query}" ${matchingGames.length > 10 ? '(scroll to see all)' : ''}</h3>
                    <button id="clearSearch" class="text-gray-400 hover:text-white transition-colors">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
            <div class="search-results-list">
                ${resultsHTML}
            </div>
        `;
        
        // Add click handlers to search results
        searchResultsContainer.querySelectorAll('.search-result-item').forEach(item => {
            item.addEventListener('click', function(e) {
                e.preventDefault();
                const gameName = this.dataset.game;
                const game = gameData[gameName];
                console.log(`🎮 Starting game from search: ${gameName}`);
                if (game) {
                    hideSearchResults();
                    // Clear search input
                    const searchInput = document.getElementById('searchInput');
                    if (searchInput) searchInput.value = '';
                    // Start the game
                    gamePlayer.startGame(gameName, game.url);
                }
            });
        });
        
        // Add clear search handler
        const clearSearchBtn = document.getElementById('clearSearch');
        if (clearSearchBtn) {
            clearSearchBtn.addEventListener('click', () => {
                hideSearchResults();
                const searchInput = document.getElementById('searchInput');
                if (searchInput) {
                    searchInput.value = '';
                    searchInput.focus();
                }
            });
        }
    }
    
    searchResultsContainer.classList.remove('hidden');
    searchResultsContainer.style.display = 'block';
}

function hideSearchResults() {
    const searchResultsContainer = document.getElementById('searchResults');
    if (searchResultsContainer) {
        searchResultsContainer.style.display = 'none';
        searchResultsContainer.classList.add('hidden');
    }
}

// ===== RECENTLY PLAYED FUNCTIONALITY =====

// Add game to recently played list
function addToRecentlyPlayed(gameName) {
    console.log(`📝 Adding ${gameName} to recently played`);
    
    let recentlyPlayed = getRecentlyPlayed();
    
    // Remove if already exists to avoid duplicates
    recentlyPlayed = recentlyPlayed.filter(game => game.name !== gameName);
    
    // Add to beginning of array with timestamp
    recentlyPlayed.unshift({
        name: gameName,
        timestamp: Date.now(),
        playedAt: new Date().toISOString()
    });
    
    // Keep only last 12 games
    recentlyPlayed = recentlyPlayed.slice(0, 12);
    
    // Save to localStorage
    localStorage.setItem('recentlyPlayedGames', JSON.stringify(recentlyPlayed));
    
    // Update the UI
    updateRecentlyPlayedDisplay();
}

// Get recently played games from localStorage
function getRecentlyPlayed() {
    try {
        const stored = localStorage.getItem('recentlyPlayedGames');
        return stored ? JSON.parse(stored) : [];
    } catch (error) {
        console.warn('⚠️ Error reading recently played games:', error);
        return [];
    }
}

// Update the recently played display
function updateRecentlyPlayedDisplay() {
    const recentlyPlayed = getRecentlyPlayed();
    const section = document.getElementById('recently-played');
    const container = document.getElementById('recentlyPlayedContainer');
    
    if (!section || !container) {
        console.warn('⚠️ Recently played elements not found');
        return;
    }
    
    if (recentlyPlayed.length === 0) {
        // Hide section if no games played
        section.style.display = 'none';
        return;
    }
    
    // Show section
    section.style.display = 'block';
    
    // Generate HTML for recently played games
    container.innerHTML = recentlyPlayed.map(recentGame => {
        const game = gameData[recentGame.name];
        if (!game) return '';
        
        const timeAgo = getTimeAgo(recentGame.timestamp);
        
        return `
            <div class="bg-game-gray rounded-lg p-3 hover:bg-game-gray-light transition-all group relative overflow-hidden">
                <div class="aspect-video bg-gray-800 rounded-lg mb-2 overflow-hidden relative">
                    <img src="${game.thumb || 'https://via.placeholder.com/200x120/4F46E5/white?text=' + encodeURIComponent(recentGame.name.charAt(0))}" 
                         alt="${recentGame.name}" 
                         class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                         onerror="this.style.display='none'; this.parentNode.innerHTML='<div class=\\'w-full h-full flex items-center justify-center text-game-primary text-xl\\'>🎮</div>'">
                    <div class="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                        ${timeAgo}
                    </div>
                    <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <button class="recent-play-btn bg-game-primary hover:bg-game-accent text-game-dark w-12 h-12 rounded-full flex items-center justify-center font-bold transition-all transform hover:scale-110" data-game-name="${recentGame.name}">
                            <i class="fas fa-play text-lg ml-0.5"></i>
                        </button>
                    </div>
                </div>
                <h3 class="text-white font-semibold text-sm mb-1 truncate group-hover:text-game-primary transition-colors">${recentGame.name}</h3>
                <div class="flex items-center justify-between text-xs text-gray-400">
                    <span>${game.category || 'Game'}</span>
                    <button class="recent-play-btn bg-game-primary hover:bg-game-accent text-game-dark px-3 py-1 rounded font-semibold transition-all text-xs" data-game-name="${recentGame.name}">
                        <i class="fas fa-play mr-1"></i>Play
                    </button>
                </div>
            </div>
        `;
    }).filter(html => html !== '').join('');
    
    // Attach event listeners to play buttons
    setTimeout(() => {
        attachRecentlyPlayedListeners();
    }, 100);
    
    console.log(`✅ Recently played display updated with ${recentlyPlayed.length} games`);
}

// Get time ago string
function getTimeAgo(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return 'A while ago';
}

// Attach event listeners for recently played game buttons
function attachRecentlyPlayedListeners() {
    const recentPlayButtons = document.querySelectorAll('.recent-play-btn');
    
    recentPlayButtons.forEach(button => {
        // Skip if already has listener
        if (button.hasAttribute('data-recent-listener')) {
            return;
        }
        button.setAttribute('data-recent-listener', 'true');
        
        button.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const gameName = this.getAttribute('data-game-name');
            if (!gameName) {
                console.warn('❌ No game name found on recently played button');
                return;
            }
            
            const game = gameData[gameName];
            if (game && game.url) {
                console.log(`🎮 Playing recently played game: ${gameName}`);
                gamePlayer.startGame(gameName, game.url);
            } else {
                console.warn(`❌ Game not found or no URL: ${gameName}`);
                // Show user-friendly message
                const notification = document.createElement('div');
                notification.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
                notification.innerHTML = `<i class="fas fa-exclamation-triangle mr-2"></i>Game "${gameName}" is not available`;
                document.body.appendChild(notification);
                
                setTimeout(() => {
                    notification.remove();
                }, 3000);
            }
        });
    });
    
    console.log(`✅ Attached listeners to ${recentPlayButtons.length} recently played buttons`);
}

// Clear recently played history
function clearRecentlyPlayed() {
    console.log('🗑️ Clearing recently played history');
    
    localStorage.removeItem('recentlyPlayedGames');
    
    // Hide the section
    const section = document.getElementById('recently-played');
    if (section) {
        section.style.display = 'none';
    }
    
    console.log('✅ Recently played history cleared');
}

// Initialize recently played functionality
function initializeRecentlyPlayed() {
    console.log('📚 Initializing recently played functionality...');
    
    // Update display on page load
    updateRecentlyPlayedDisplay();
    
    // Initialize clear button
    const clearBtn = document.getElementById('clearRecentlyPlayed');
    if (clearBtn) {
        clearBtn.addEventListener('click', function() {
            if (confirm('Are you sure you want to clear your game history?')) {
                clearRecentlyPlayed();
            }
        });
        console.log('✅ Clear recently played button initialized');
    }
    
    console.log('✅ Recently played functionality initialized');
}
