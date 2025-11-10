// Mobile responsive enhancements
document.addEventListener('DOMContentLoaded', function() {
    setupMobileMenu();
    setupCategoryScrolling();
    setupResponsiveGameControls();
    setupResponsiveSearch();
    setupTouchInteractions();
});

// Mobile menu toggle
function setupMobileMenu() {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileMenu = document.getElementById('mobileMenu');
    
    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', function() {
            if (mobileMenu.classList.contains('hidden')) {
                mobileMenu.classList.remove('hidden');
                mobileMenuBtn.innerHTML = '<i class="fas fa-times"></i>';
            } else {
                mobileMenu.classList.add('hidden');
                mobileMenuBtn.innerHTML = '<i class="fas fa-bars"></i>';
            }
        });
        
        // Close menu when clicking a link
        const menuLinks = mobileMenu.querySelectorAll('a');
        menuLinks.forEach(link => {
            link.addEventListener('click', function() {
                mobileMenu.classList.add('hidden');
                mobileMenuBtn.innerHTML = '<i class="fas fa-bars"></i>';
            });
        });
    }
}

// Category scrolling controls
function setupCategoryScrolling() {
    const categoryScroll = document.querySelector('.category-scroll');
    const scrollLeftBtn = document.getElementById('scrollCategoriesLeft');
    const scrollRightBtn = document.getElementById('scrollCategoriesRight');
    
    if (categoryScroll && scrollLeftBtn && scrollRightBtn) {
        // Scroll left
        scrollLeftBtn.addEventListener('click', function() {
            categoryScroll.scrollBy({ left: -200, behavior: 'smooth' });
        });
        
        // Scroll right
        scrollRightBtn.addEventListener('click', function() {
            categoryScroll.scrollBy({ left: 200, behavior: 'smooth' });
        });
        
        // Show/hide scroll buttons based on scroll position
        categoryScroll.addEventListener('scroll', updateScrollButtonVisibility);
        
        // Initialize button visibility
        updateScrollButtonVisibility();
        
        // Also handle window resize
        window.addEventListener('resize', updateScrollButtonVisibility);
    }
    
    // Add touch swiping for category scroll
    if (categoryScroll) {
        let startX, scrollLeft;
        
        categoryScroll.addEventListener('touchstart', function(e) {
            startX = e.touches[0].pageX - categoryScroll.offsetLeft;
            scrollLeft = categoryScroll.scrollLeft;
        }, { passive: true });
        
        categoryScroll.addEventListener('touchmove', function(e) {
            if (!startX) return;
            const x = e.touches[0].pageX - categoryScroll.offsetLeft;
            const walk = (x - startX) * 1.5; // Scroll speed multiplier
            categoryScroll.scrollLeft = scrollLeft - walk;
        }, { passive: true });
        
        categoryScroll.addEventListener('touchend', function() {
            startX = null;
        }, { passive: true });
    }
}

function updateScrollButtonVisibility() {
    const categoryScroll = document.querySelector('.category-scroll');
    const scrollLeftBtn = document.getElementById('scrollCategoriesLeft');
    const scrollRightBtn = document.getElementById('scrollCategoriesRight');
    
    if (!categoryScroll || !scrollLeftBtn || !scrollRightBtn) return;
    
    // Only show left button if there's scroll to the left
    scrollLeftBtn.style.opacity = categoryScroll.scrollLeft > 20 ? '1' : '0.3';
    
    // Only show right button if there's more to scroll right
    const maxScrollLeft = categoryScroll.scrollWidth - categoryScroll.clientWidth - 20;
    scrollRightBtn.style.opacity = categoryScroll.scrollLeft < maxScrollLeft ? '1' : '0.3';
}

// Responsive game controls for touch devices
function setupResponsiveGameControls() {
    // Ensure proper spacing and sizing for touch controls on mobile
    const gameControls = document.getElementById('gameControls');
    
    if (gameControls) {
        // Add active states for touch feedback
        const controlButtons = gameControls.querySelectorAll('button');
        controlButtons.forEach(button => {
            button.addEventListener('touchstart', function() {
                this.classList.add('active');
            });
            
            button.addEventListener('touchend', function() {
                this.classList.remove('active');
            });
        });
    }
}

// Enhanced search experience for mobile
function setupResponsiveSearch() {
    const mobileSearchInput = document.getElementById('mobileSearchInput');
    const desktopSearchInput = document.getElementById('searchInput');

    // Sync search input values between mobile and desktop
    if (mobileSearchInput && desktopSearchInput) {
        mobileSearchInput.addEventListener('input', function() {
            desktopSearchInput.value = this.value;
            // Trigger search on mobile input
            if (typeof searchGames === 'function') {
                searchGames(this.value);
            }
        });

        desktopSearchInput.addEventListener('input', function() {
            mobileSearchInput.value = this.value;
        });
    }

    // Focus search input when search button is clicked
    const searchButtons = document.querySelectorAll('.fa-search');
    searchButtons.forEach(button => {
        button.addEventListener('click', function() {
            const input = this.closest('.relative')?.querySelector('input');
            if (input) {
                input.focus();
            }
        });
    });
}

// Improved touch interactions
function setupTouchInteractions() {
    // Make clickable areas larger on mobile
    const touchElements = document.querySelectorAll('.touch-manipulation');
    
    // Add proper touch feedback
    touchElements.forEach(el => {
        el.addEventListener('touchstart', function() {
            this.style.transform = 'scale(0.98)';
        });
        
        el.addEventListener('touchend', function() {
            this.style.transform = '';
        });
    });
    
    // Optimize scrolling behavior for touch devices
    if ('ontouchstart' in window) {
        document.documentElement.style.scrollBehavior = 'smooth';
    }
    
    // Hide descriptions and related games on mobile
    if (window.innerWidth <= 768) {
        hideMobileDescriptionsAndRelated();
    }
    
    // Setup mobile back button
    if (window.innerWidth <= 768) {
        createMobileBackButton();
    }
}

// Function to hide descriptions and related games on mobile - AGGRESSIVE
function hideMobileDescriptionsAndRelated() {
    const isMobile = window.innerWidth <= 768;
    if (!isMobile) return;
    
    // Aggressive hiding function
    function hideElements() {
        // Remove modal description completely
        const modalDesc = document.getElementById('modalGameDescription');
        if (modalDesc) modalDesc.parentElement.remove();
        
        const modalTags = document.getElementById('modalGameTags');
        if (modalTags) modalTags.parentElement.remove();
        
        // Remove enhanced layout sections
        const gameInfo = document.getElementById('gameInfoSection');
        if (gameInfo) gameInfo.remove();
        
        const leftSidebar = document.getElementById('leftSidebar');
        if (leftSidebar) leftSidebar.remove();
        
        const rightSidebar = document.getElementById('rightSidebar');
        if (rightSidebar) rightSidebar.remove();
        
        const relatedList = document.getElementById('relatedGamesList');
        if (relatedList) relatedList.parentElement.remove();
        
        // Remove all description paragraphs in modals
        document.querySelectorAll('#gameModal p.text-gray-400, #gameModal .mb-6').forEach(el => {
            if (el.textContent.includes('About') || el.textContent.includes('game') || el.textContent.includes('Experience')) {
                el.remove();
            }
        });
        
        // Remove all h4 headers in modals ("About this game" etc)
        document.querySelectorAll('#gameModal h4').forEach(el => el.remove());
        
        // Remove tag sections
        document.querySelectorAll('.flex-wrap, .gap-2').forEach(el => {
            if (el.querySelector('.bg-game-primary')) {
                el.remove();
            }
        });
        
        // Remove description text in enhanced layout
        document.querySelectorAll('.text-gray-300.text-sm.leading-relaxed').forEach(el => el.remove());
        
        // Remove "Related Games" sections completely
        document.querySelectorAll('h3').forEach(el => {
            if (el.textContent.includes('Related Games')) {
                el.parentElement.remove();
            }
        });
    }
    
    // Run immediately
    hideElements();
    
    // Run after short delay for dynamic content
    setTimeout(hideElements, 100);
    setTimeout(hideElements, 500);
    setTimeout(hideElements, 1000);
    
    // Set up aggressive observer
    const observer = new MutationObserver(function() {
        if (window.innerWidth <= 768) {
            setTimeout(hideElements, 10);
        }
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    // Also run on any modal opening
    document.addEventListener('click', function(e) {
        if (e.target.closest('.game-card') || e.target.closest('[data-game-name]')) {
            setTimeout(hideElements, 50);
            setTimeout(hideElements, 200);
        }
    });
    
    // Make game iframe full screen on mobile
    makeGameFullScreenMobile();
}

// Function to make game iframe full screen on mobile
function makeGameFullScreenMobile() {
    const isMobile = window.innerWidth <= 768;
    if (!isMobile) return;
    
    function enforceFullScreen() {
        // Set viewport for full screen
        let viewport = document.querySelector('meta[name="viewport"]');
        if (viewport) {
            viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
        }
        
        // Make game iframes full screen
        const gameIframes = document.querySelectorAll('#gameIframe, #enhancedGameIframe');
        gameIframes.forEach(iframe => {
            if (iframe) {
                iframe.style.width = '100vw';
                iframe.style.height = '100vh';
                iframe.style.height = '100dvh';
                iframe.style.position = 'fixed';
                iframe.style.top = '0';
                iframe.style.left = '0';
                iframe.style.zIndex = '9999';
                iframe.style.border = 'none';
                iframe.style.margin = '0';
                iframe.style.padding = '0';
            }
        });
        
        // Make game containers full screen
        const gameContainers = document.querySelectorAll('#gamePlayer, #enhancedGameLayout');
        gameContainers.forEach(container => {
            if (container && !container.classList.contains('hidden')) {
                container.style.width = '100vw';
                container.style.height = '100vh';
                container.style.height = '100dvh';
                container.style.position = 'fixed';
                container.style.top = '0';
                container.style.left = '0';
                container.style.margin = '0';
                container.style.padding = '0';
                container.style.background = '#000';
                
                // Hide headers and controls
                const headers = container.querySelectorAll('.bg-game-dark, .sticky, .game-player-header, #gameControlOverlay, .bg-blue-700');
                headers.forEach(header => header.style.display = 'none');
            }
        });
        
        // Lock body scroll
        if (document.querySelector('#gamePlayer:not(.hidden)') || document.querySelector('#enhancedGameLayout')) {
            document.body.style.overflow = 'hidden';
            document.body.style.margin = '0';
            document.body.style.padding = '0';
            document.body.style.width = '100vw';
            document.body.style.height = '100vh';
            document.body.style.height = '100dvh';
        }
    }
    
    // Run immediately
    enforceFullScreen();
    
    // Run on orientation change
    window.addEventListener('orientationchange', function() {
        setTimeout(enforceFullScreen, 100);
        setTimeout(enforceFullScreen, 500);
    });
    
    // Run on resize
    window.addEventListener('resize', function() {
        if (window.innerWidth <= 768) {
            setTimeout(enforceFullScreen, 50);
        }
    });
    
    // Monitor for game opening
    const observer = new MutationObserver(function() {
        if (window.innerWidth <= 768) {
            setTimeout(enforceFullScreen, 10);
        }
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'style']
    });
    
    // Run when games are opened
    document.addEventListener('click', function(e) {
        if (e.target.closest('.play-btn, #playGameBtn, #playNowBtn, .game-card, [data-game-name]')) {
            setTimeout(enforceFullScreen, 100);
            setTimeout(enforceFullScreen, 300);
            setTimeout(enforceFullScreen, 600);
            setTimeout(showMobileBackButton, 50);
            setTimeout(showMobileBackButton, 200);
            setTimeout(showMobileBackButton, 500);
        }
    });
    
    // Also monitor for game layout changes
    const gameObserver = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                const target = mutation.target;
                if (target.id === 'gamePlayer' && !target.classList.contains('hidden')) {
                    setTimeout(showMobileBackButton, 50);
                }
            }
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(function(node) {
                    if (node.id === 'enhancedGameLayout') {
                        setTimeout(showMobileBackButton, 50);
                    }
                });
            }
        });
    });
    
    gameObserver.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class']
    });
    
    // Create and manage mobile back button
    createMobileBackButton();
}

// Function to create mobile back button
function createMobileBackButton() {
    const isMobile = window.innerWidth <= 768;
    if (!isMobile) return;
    
    // Remove existing back button if any
    const existingBtn = document.getElementById('mobileGameBackButton');
    if (existingBtn) existingBtn.remove();
    
    // Create back button
    const backButton = document.createElement('button');
    backButton.id = 'mobileGameBackButton';
    backButton.innerHTML = '&#8592;'; // Left arrow Unicode
    backButton.title = 'Go Back';
    
    // Force initial styling
    backButton.style.position = 'fixed';
    backButton.style.top = '15px';
    backButton.style.left = '15px';
    backButton.style.width = '45px';
    backButton.style.height = '45px';
    backButton.style.background = 'rgba(255, 255, 255, 0.9)';
    backButton.style.borderRadius = '12px';
    backButton.style.display = 'none';
    backButton.style.alignItems = 'center';
    backButton.style.justifyContent = 'center';
    backButton.style.color = '#333';
    backButton.style.fontSize = '18px';
    backButton.style.zIndex = '999999';
    backButton.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.15)';
    backButton.style.border = '1px solid rgba(0, 0, 0, 0.1)';
    backButton.style.cursor = 'pointer';
    backButton.style.fontWeight = 'bold';
    
    // Add click handler
    backButton.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log('🔙 Back button clicked!');
        closeMobileGame();
    });
    
    // Add to body
    document.body.appendChild(backButton);
    console.log('✅ Mobile back button created');
}

// Function to show back button when game is active
function showMobileBackButton() {
    const isMobile = window.innerWidth <= 768;
    if (!isMobile) return;
    
    let backButton = document.getElementById('mobileGameBackButton');
    
    // Create button if it doesn't exist
    if (!backButton) {
        createMobileBackButton();
        backButton = document.getElementById('mobileGameBackButton');
    }
    
    const gameActive = document.querySelector('#gamePlayer:not(.hidden)') || document.querySelector('#enhancedGameLayout');
    
    if (backButton && gameActive) {
        backButton.style.display = 'flex';
        backButton.style.opacity = '1';
        backButton.style.visibility = 'visible';
        backButton.style.pointerEvents = 'auto';
        console.log('✅ Back button shown');
    }
    
    // Force show with timeout
    setTimeout(() => {
        if (backButton && gameActive) {
            backButton.style.display = 'flex';
        }
    }, 100);
}

// Function to hide back button
function hideMobileBackButton() {
    const backButton = document.getElementById('mobileGameBackButton');
    if (backButton) {
        backButton.style.display = 'none';
        backButton.style.opacity = '0';
        backButton.style.visibility = 'hidden';
        backButton.style.pointerEvents = 'none';
    }
}

// Function to close mobile game
function closeMobileGame() {
    // Close enhanced layout
    const enhancedLayout = document.getElementById('enhancedGameLayout');
    if (enhancedLayout) {
        enhancedLayout.remove();
    }
    
    // Close old game player
    const gamePlayer = document.getElementById('gamePlayer');
    if (gamePlayer) {
        gamePlayer.classList.add('hidden');
    }
    
    // Restore body
    document.body.style.overflow = '';
    document.body.style.margin = '';
    document.body.style.padding = '';
    document.body.style.width = '';
    document.body.style.height = '';
    
    // Restore viewport
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
        viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
    }
    
    // Hide back button
    hideMobileBackButton();
    
    console.log('✅ Mobile game closed, returned to game browser');
}

// Helper function to add a game to recently played list
// This is used in mobile view and needs to be available globally
function addToRecentlyPlayed(gameName) {
    if (!gameName) return;
    
    // Get current recently played games
    let recentlyPlayed = JSON.parse(localStorage.getItem('recentlyPlayed') || '[]');
    
    // Remove the game if it's already in the list
    recentlyPlayed = recentlyPlayed.filter(name => name !== gameName);
    
    // Add the game to the beginning of the list
    recentlyPlayed.unshift(gameName);
    
    // Keep only the last 20 games
    recentlyPlayed = recentlyPlayed.slice(0, 20);
    
    // Save back to localStorage
    localStorage.setItem('recentlyPlayed', JSON.stringify(recentlyPlayed));
    
    // Show the recently played section if hidden
    const recentlyPlayedSection = document.getElementById('recently-played');
    if (recentlyPlayedSection && recentlyPlayedSection.style.display === 'none') {
        recentlyPlayedSection.style.display = 'block';
    }
    
    // Refresh recently played list if it exists
    if (typeof refreshRecentlyPlayed === 'function') {
        refreshRecentlyPlayed();
    }
}