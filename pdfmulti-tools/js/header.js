document.addEventListener('DOMContentLoaded', function() {
    const headerPlaceholder = document.getElementById('header-placeholder');
    if (headerPlaceholder) {
        // Determine if we're in a subdirectory
        const isInSubdirectory = window.location.pathname.includes('/tools/');
        const pathToRoot = isInSubdirectory ? '../' : './';
        
        headerPlaceholder.innerHTML = `
            <nav class="navbar navbar-expand-lg navbar-light">
                <div class="container">
                    <a class="navbar-brand" href="${pathToRoot}index.html">
                        <i class="fas fa-file-pdf"></i> PDF Multi-Tools
                    </a>
                    <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
                        <span class="navbar-toggler-icon"></span>
                    </button>
                    <div class="collapse navbar-collapse" id="navbarNav">
                        <ul class="navbar-nav ms-auto">
                            <li class="nav-item">
                                <a class="nav-link" href="${pathToRoot}index.html">Home</a>
                            </li>
                            <li class="nav-item">
                                <a class="nav-link" href="${pathToRoot}index.html#tools-grid">Tools</a>
                            </li>
                        </ul>
                    </div>
                </div>
            </nav>
        `;
    }

    // Add active class to current nav item
    const navLinks = document.querySelectorAll('.nav-link');
    const currentPath = window.location.pathname.split('/').pop();
    
    navLinks.forEach(link => {
        const linkPath = link.getAttribute('href').split('/').pop().split('#')[0];
        if (linkPath === currentPath || (currentPath === '' && linkPath === 'index.html')) {
            link.classList.add('active');
        }
    });
}); 