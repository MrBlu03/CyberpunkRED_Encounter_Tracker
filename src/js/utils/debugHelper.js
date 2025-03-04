// This file can be temporarily included to debug navigation issues

function debugNavigation() {
    console.log("Debug Navigation Started");
    
    // Check if navigation elements exist
    const navButton = document.querySelector('.nav-button');
    const navContent = document.querySelector('.nav-content');
    
    console.log("Navigation Button exists:", !!navButton);
    console.log("Navigation Content exists:", !!navContent);
    
    if (navButton && navContent) {
        // Log current state
        console.log("Nav content display:", window.getComputedStyle(navContent).display);
        console.log("Nav content has 'show' class:", navContent.classList.contains('show'));
        
        // Add test click handler
        navButton.addEventListener('click', function() {
            console.log("Button clicked");
            console.log("Nav content has 'show' class after click:", navContent.classList.contains('show'));
            console.log("Nav content display after click:", window.getComputedStyle(navContent).display);
        });
    }
}

// Run debug on load
document.addEventListener('DOMContentLoaded', debugNavigation);


