// Navigation dropdown functionality
document.addEventListener('DOMContentLoaded', () => {
    const navButton = document.querySelector('.nav-button');
    const navContent = document.querySelector('.nav-content');

    if (navButton && navContent) {
        // Toggle dropdown on button click
        navButton.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent document click from immediately closing it
            navContent.classList.toggle('show');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            // If click is outside the dropdown and the dropdown is open, close it
            if (!navButton.contains(e.target) && !navContent.contains(e.target)) {
                navContent.classList.remove('show');
            }
        });

        // Add active class to current page in navigation
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        const navLinks = document.querySelectorAll('.nav-content a');
        
        navLinks.forEach(link => {
            // Add active class to current page
            if (link.getAttribute('href') === currentPage) {
                link.classList.add('active');
            }
            
            // Optional: close dropdown after clicking a link
            link.addEventListener('click', () => {
                navContent.classList.remove('show');
            });
        });
    }
});
