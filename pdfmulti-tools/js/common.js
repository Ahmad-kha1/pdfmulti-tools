/**
 * PDF Multi-Tools - Common JavaScript Functions
 * This file contains shared functions used across the application
 */

// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Load shared components
    loadHeader();
    loadFooter();
    
    // Initialize Bootstrap components
    initializeBootstrapComponents();
    
    // Register service worker if available
    registerServiceWorker();
    
    // Add event listeners for common elements
    addGlobalEventListeners();
    
    // Initialize settings
    initializeSettings();
});

/**
 * Load the header component from external HTML file
 */
function loadHeader() {
    const headerPlaceholder = document.getElementById('header-placeholder');
    if (!headerPlaceholder) return;
    
    // Determine if we're in a subdirectory
    const isInSubdirectory = window.location.pathname.includes('/tools/');
    const basePath = isInSubdirectory ? '../' : './';
    
    fetch(`${basePath}components/header.html`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load header');
            }
            return response.text();
        })
        .then(html => {
            headerPlaceholder.innerHTML = html;
            highlightCurrentPage();
            
            // Initialize theme toggle after header is loaded
            const themeToggle = document.getElementById('themeToggle');
            if (themeToggle) {
                themeToggle.addEventListener('change', toggleTheme);
                // Set initial state based on user preference
                themeToggle.checked = localStorage.getItem('theme') === 'dark';
            }
            
            // Initialize search after header is loaded
            const searchTools = document.getElementById('searchTools');
            if (searchTools) {
                searchTools.addEventListener('input', filterTools);
            }
        })
        .catch(error => {
            console.error('Error loading header:', error);
            // Create a basic header if the fetch fails
            createBasicHeader(headerPlaceholder);
        });
}

/**
 * Load the footer component from external HTML file
 */
function loadFooter() {
    const footerPlaceholder = document.getElementById('footer-placeholder');
    if (!footerPlaceholder) return;
    
    // Determine if we're in a subdirectory
    const isInSubdirectory = window.location.pathname.includes('/tools/');
    const basePath = isInSubdirectory ? '../' : './';
    
    fetch(`${basePath}components/footer.html`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load footer');
            }
            return response.text();
        })
        .then(html => {
            footerPlaceholder.innerHTML = html;
            
            // Initialize back to top button
            const backToTopBtn = document.querySelector('.back-to-top');
            if (backToTopBtn) {
                backToTopBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                });
            }
        })
        .catch(error => {
            console.error('Error loading footer:', error);
            // Create a basic footer if the fetch fails
            createBasicFooter(footerPlaceholder);
        });
}

/**
 * Highlight the current page in navigation
 */
function highlightCurrentPage() {
    const currentPage = getCurrentPage();
    const navLinks = document.querySelectorAll('.nav-link, .dropdown-item');
    
    navLinks.forEach(link => {
        const linkPage = link.getAttribute('data-page');
        if (linkPage === currentPage) {
            link.classList.add('active');
            
            // If it's a dropdown item, also highlight the parent dropdown
            const dropdownParent = link.closest('.dropdown');
            if (dropdownParent) {
                const dropdownToggle = dropdownParent.querySelector('.dropdown-toggle');
                if (dropdownToggle) {
                    dropdownToggle.classList.add('active');
                }
            }
        }
    });
}

/**
 * Get the current page name from URL
 */
function getCurrentPage() {
    const path = window.location.pathname;
    const filename = path.split('/').pop().split('.')[0];
    
    // Handle special cases
    if (filename === '' || filename === 'index') {
        return 'home';
    }
    
    return filename;
}

/**
 * Create a basic header if the external file fails to load
 */
function createBasicHeader(container) {
    if (!container) return;
    
    container.innerHTML = `
        <header class="site-header">
            <nav class="navbar navbar-expand-lg navbar-light bg-light">
                <div class="container">
                    <a class="navbar-brand" href="index.html">PDF Multi-Tools</a>
                    <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
                        <span class="navbar-toggler-icon"></span>
                    </button>
                    <div class="collapse navbar-collapse" id="navbarNav">
                        <ul class="navbar-nav">
                            <li class="nav-item"><a class="nav-link" href="index.html">Home</a></li>
                            <li class="nav-item"><a class="nav-link" href="tools.html">Tools</a></li>
                        </ul>
                    </div>
                </div>
            </nav>
        </header>
    `;
}

/**
 * Create a basic footer if the external file fails to load
 */
function createBasicFooter(container) {
    if (!container) return;
    
    container.innerHTML = `
        <footer class="site-footer bg-light py-4 mt-5">
            <div class="container">
                <div class="row">
                    <div class="col-12 text-center">
                        <p class="text-muted mb-0">© ${new Date().getFullYear()} PDF Multi-Tools. All rights reserved.</p>
                    </div>
                </div>
            </div>
        </footer>
    `;
}

/**
 * Toggle between light and dark theme
 */
function toggleTheme() {
    const body = document.body;
    
    if (body.classList.contains('dark-theme')) {
        body.classList.remove('dark-theme');
        localStorage.setItem('theme', 'light');
    } else {
        body.classList.add('dark-theme');
        localStorage.setItem('theme', 'dark');
    }
}

/**
 * Initialize Bootstrap components
 */
function initializeBootstrapComponents() {
    // Initialize tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
    
    // Initialize popovers
    const popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
    popoverTriggerList.map(function (popoverTriggerEl) {
        return new bootstrap.Popover(popoverTriggerEl);
    });
}

/**
 * Register service worker for offline capabilities
 */
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        // First check if the service worker file exists to prevent 404 errors
        fetch('/service-worker.js')
            .then(response => {
                if (response.ok) {
                    // File exists, register it
                    return navigator.serviceWorker.register('/service-worker.js')
                        .then(registration => {
                            console.log('Service Worker registered with scope:', registration.scope);
                        });
                } else {
                    // File does not exist, log a message but don't produce a 404 error
                    console.log('Service Worker file not found, skipping registration');
                    return Promise.resolve();
                }
            })
            .catch(error => {
                console.log('Service Worker check failed, skipping registration:', error);
            });
    }
}

/**
 * Filter tools based on search input
 */
function filterTools() {
    const searchInput = document.getElementById('searchTools');
    if (!searchInput) return;
    
    const query = searchInput.value.toLowerCase();
    const toolItems = document.querySelectorAll('.tool-card');
    
    toolItems.forEach(item => {
        const title = item.querySelector('.card-title').innerText.toLowerCase();
        const description = item.querySelector('.card-text').innerText.toLowerCase();
        
        if (title.includes(query) || description.includes(query)) {
            item.closest('.col-md-4, .col-sm-6').style.display = '';
        } else {
            item.closest('.col-md-4, .col-sm-6').style.display = 'none';
        }
    });
}

/**
 * Add global event listeners for common elements
 */
function addGlobalEventListeners() {
    // Setup file drag and drop listeners
    setupDragAndDropListeners();
    
    // Setup global notification system
    setupNotifications();
    
    // Back to top button
    const backToTopBtn = document.querySelector('.back-to-top');
    if (backToTopBtn) {
        window.addEventListener('scroll', function() {
            if (window.pageYOffset > 300) {
                backToTopBtn.classList.add('show');
            } else {
                backToTopBtn.classList.remove('show');
            }
        });
        
        backToTopBtn.addEventListener('click', function(e) {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
}

/**
 * Initialize settings manager
 */
function initializeSettings() {
    // Apply theme preference
    const theme = localStorage.getItem('theme') || 'light';
    if (theme === 'dark') {
        document.body.classList.add('dark-theme');
    }
    
    // Load other user settings if available
    const settings = localStorage.getItem('settings');
    if (settings) {
        try {
            const parsedSettings = JSON.parse(settings);
            applyUserSettings(parsedSettings);
        } catch (e) {
            console.error('Error parsing settings:', e);
        }
    }
}

/**
 * Apply user settings from object
 */
function applyUserSettings(settings) {
    if (!settings) return;
    
    // Apply each setting to corresponding elements
    Object.keys(settings).forEach(key => {
        const element = document.getElementById(key);
        if (element) {
            if (element.type === 'checkbox') {
                element.checked = settings[key];
            } else {
                element.value = settings[key];
            }
            
            // Trigger change event
            const event = new Event('change');
            element.dispatchEvent(event);
        }
    });
}

/**
 * Setup file drag and drop listeners for the whole document
 */
function setupDragAndDropListeners() {
    const dropZones = document.querySelectorAll('.drop-zone');
    if (dropZones.length === 0) return;
    
    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        document.body.addEventListener(eventName, preventDefaults, false);
        dropZones.forEach(dropZone => {
            dropZone.addEventListener(eventName, preventDefaults, false);
        });
    });
    
    // Highlight drop zone when file is dragged over it
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZones.forEach(dropZone => {
            dropZone.addEventListener(eventName, highlight, false);
        });
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dropZones.forEach(dropZone => {
            dropZone.addEventListener(eventName, unhighlight, false);
        });
    });
    
    // Handle dropped files
    dropZones.forEach(dropZone => {
        dropZone.addEventListener('drop', handleDrop, false);
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    function highlight(e) {
        this.classList.add('highlight');
    }
    
    function unhighlight(e) {
        this.classList.remove('highlight');
    }
    
    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        
        // Trigger custom event with files
        const dropEvent = new CustomEvent('files-dropped', {
            detail: { files: files, dropZone: this }
        });
        document.dispatchEvent(dropEvent);
    }
}

/**
 * Setup global notification system
 */
function setupNotifications() {
    // Create notification container if it doesn't exist
    let notificationContainer = document.getElementById('notification-container');
    if (!notificationContainer) {
        notificationContainer = document.createElement('div');
        notificationContainer.id = 'notification-container';
        notificationContainer.className = 'notification-container';
        document.body.appendChild(notificationContainer);
    }
    
    // Add global method to show notifications
    window.showNotification = function(message, type = 'info', duration = 5000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        
        const icon = getNotificationIcon(type);
        
        notification.innerHTML = `
            <div class="notification-content">
                <i class="${icon}"></i>
                <span>${message}</span>
            </div>
            <button type="button" class="notification-close">×</button>
        `;
        
        notificationContainer.appendChild(notification);
        
        // Add visible class after a small delay for animation
        setTimeout(() => {
            notification.classList.add('visible');
        }, 10);
        
        // Close notification when close button is clicked
        const closeButton = notification.querySelector('.notification-close');
        closeButton.addEventListener('click', () => {
            closeNotification(notification);
        });
        
        // Automatically close notification after duration
        if (duration > 0) {
            setTimeout(() => {
                closeNotification(notification);
            }, duration);
        }
        
        return notification;
    };
    
    function closeNotification(notification) {
        notification.classList.remove('visible');
        
        // Remove notification from DOM after animation
        setTimeout(() => {
            notification.remove();
        }, 300);
    }
    
    function getNotificationIcon(type) {
        switch (type) {
            case 'success': return 'fas fa-check-circle';
            case 'error': return 'fas fa-exclamation-circle';
            case 'warning': return 'fas fa-exclamation-triangle';
            case 'info':
            default: return 'fas fa-info-circle';
        }
    }
} 