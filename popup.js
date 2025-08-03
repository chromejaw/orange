document.addEventListener('DOMContentLoaded', () => {
    console.log('🍊 Orange popup loaded - FINAL bulletproof GIF cycling');
    
    const particles = document.querySelectorAll('.particle');
    const gifElement = document.getElementById('dynamic-gif');
    const totalGifs = 6;
    
    // Bulletproof GIF cycling with multiple fallbacks
    initializeGifCycling();
    
    // Particle setup
    particles.forEach((particle, index) => {
        const randomSize = Math.random() * 1.5 + 2;
        particle.style.width = `${randomSize}px`;
        particle.style.height = `${randomSize}px`;
        
        const randomOpacity = Math.random() * 0.4 + 0.5;
        particle.style.opacity = randomOpacity;
        
        const randomDuration = Math.random() * 4 + 8;
        particle.style.animationDuration = `${randomDuration}s`;
    });
    
    function initializeGifCycling() {
        // Method 1: Try Chrome storage
        try {
            chrome.storage.local.get(['nextGifIndex'], (result) => {
                if (chrome.runtime.lastError) {
                    console.log('Storage error, using localStorage fallback');
                    handleWithLocalStorage();
                    return;
                }
                
                let nextIndex = result.nextGifIndex || 1;
                
                // Ensure valid range
                if (nextIndex < 1 || nextIndex > totalGifs) {
                    nextIndex = 1;
                }
                
                console.log(`📺 Loading GIF ${nextIndex} from Chrome storage`);
                loadGif(nextIndex);
                
                // Calculate and store NEXT gif for next popup open
                let futureIndex = nextIndex >= totalGifs ? 1 : nextIndex + 1;
                
                chrome.storage.local.set({ nextGifIndex: futureIndex }, () => {
                    if (!chrome.runtime.lastError) {
                        console.log(`💾 Next gif set to ${futureIndex}`);
                    }
                });
            });
        } catch (error) {
            console.log('Chrome storage failed, using localStorage');
            handleWithLocalStorage();
        }
    }
    
    function handleWithLocalStorage() {
        // Method 2: localStorage fallback
        try {
            let nextIndex = parseInt(localStorage.getItem('orangeNextGif')) || 1;
            
            if (nextIndex < 1 || nextIndex > totalGifs) {
                nextIndex = 1;
            }
            
            console.log(`📺 Loading GIF ${nextIndex} from localStorage`);
            loadGif(nextIndex);
            
            // Store next gif index
            let futureIndex = nextIndex >= totalGifs ? 1 : nextIndex + 1;
            localStorage.setItem('orangeNextGif', futureIndex);
            console.log(`💾 Next gif set to ${futureIndex} (localStorage)`);
            
        } catch (error) {
            console.log('localStorage failed, using sessionStorage');
            handleWithSessionStorage();
        }
    }
    
    function handleWithSessionStorage() {
        // Method 3: sessionStorage fallback
        try {
            let nextIndex = parseInt(sessionStorage.getItem('orangeNextGif')) || 1;
            
            if (nextIndex < 1 || nextIndex > totalGifs) {
                nextIndex = 1;
            }
            
            console.log(`📺 Loading GIF ${nextIndex} from sessionStorage`);
            loadGif(nextIndex);
            
            let futureIndex = nextIndex >= totalGifs ? 1 : nextIndex + 1;
            sessionStorage.setItem('orangeNextGif', futureIndex);
            console.log(`💾 Next gif set to ${futureIndex} (sessionStorage)`);
            
        } catch (error) {
            console.log('All storage methods failed, using random');
            handleWithRandom();
        }
    }
    
    function handleWithRandom() {
        // Method 4: Random fallback if all storage fails
        const randomIndex = Math.floor(Math.random() * totalGifs) + 1;
        console.log(`🎲 Loading random GIF ${randomIndex}`);
        loadGif(randomIndex);
    }
    
    function loadGif(index) {
        const gifPath = `icons/${index}.gif`;
        
        // Smooth transition
        gifElement.style.opacity = '0';
        gifElement.style.transform = 'scale(0.9)';
        
        setTimeout(() => {
            gifElement.src = gifPath;
            gifElement.alt = `Animation ${index}`;
            
            // Fade back in
            gifElement.style.opacity = '1';
            gifElement.style.transform = 'scale(1)';
            
            console.log(`✅ Successfully loaded: ${gifPath}`);
        }, 200);
    }
    
    // GIF interactions
    if (gifElement) {
        gifElement.addEventListener('click', () => {
            gifElement.style.animation = 'gifBounce 0.3s ease-in-out 3';
            gifElement.style.filter = 'drop-shadow(0 6px 20px rgba(255, 215, 0, 0.8)) brightness(1.2)';
            
            setTimeout(() => {
                gifElement.style.animation = 'gifBounce 3s ease-in-out infinite';
                gifElement.style.filter = 'drop-shadow(0 4px 10px rgba(0, 0, 0, 0.3))';
            }, 1000);
        });
        
        gifElement.addEventListener('error', () => {
            console.warn(`❌ Failed to load: ${gifElement.src}`);
            // Try gif 1 as fallback
            if (!gifElement.src.includes('1.gif')) {
                gifElement.src = '1.gif';
            }
        });
    }
    
    // Mouse effects
    document.addEventListener('mousemove', (e) => {
        const rect = document.body.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;
        
        particles.forEach((particle, index) => {
            const speed = (index % 3 + 1) * 0.3;
            const translateX = (x - 0.5) * speed;
            const translateY = (y - 0.5) * speed;
            
            particle.style.transform += ` translate(${translateX}px, ${translateY}px)`;
        });
    });
    
    // Debug function - test cycling manually
    window.testGifCycle = () => {
        console.log('🔄 Testing GIF cycle...');
        
        // Get current storage state
        chrome.storage.local.get(['nextGifIndex'], (result) => {
            console.log('Current storage state:', result);
            
            // Force next gif
            let current = result.nextGifIndex || 1;
            let next = current >= totalGifs ? 1 : current + 1;
            
            loadGif(current);
            chrome.storage.local.set({ nextGifIndex: next });
            console.log(`Loaded ${current}, next will be ${next}`);
        });
    };
    
    // Debug function - clear storage
    window.resetGifCycle = () => {
        chrome.storage.local.remove(['nextGifIndex']);
        localStorage.removeItem('orangeNextGif');
        sessionStorage.removeItem('orangeNextGif');
        console.log('🗑️ All gif storage cleared');
        loadGif(1);
    };
});
