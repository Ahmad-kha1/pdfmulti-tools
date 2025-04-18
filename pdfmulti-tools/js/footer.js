document.addEventListener('DOMContentLoaded', function() {
    // Determine if we're in a subdirectory
    const isInSubdirectory = window.location.pathname.includes('/tools/');
    const pathToRoot = isInSubdirectory ? '../' : './';

    // Create footer HTML
    const footerHTML = `
        <footer class="container-fluid py-4 mt-5 bg-light">
            <div class="row g-4">
                <!-- Quick Links Section -->
                <div class="col-12 text-center">
                    <h5 class="mb-3">Quick Links</h5>
                    <ul class="list-unstyled">
                        <li class="mb-2">
                            <a href="${pathToRoot}index.html" class="text-decoration-none text-primary link-hover">Home</a>
                        </li>
                        <li class="mb-2">
                            <a href="${pathToRoot}index.html#tools-grid" class="text-decoration-none text-primary link-hover">Tools</a>
                        </li>
                    </ul>
                </div>
            </div>
            <div class="row mt-4">
                <div class="col-12 text-center">
                    <p class="text-muted mb-0">© 2025 PDF Multi-Tools. All rights reserved.</p>
                </div>
            </div>
        </footer>
    `;

    // Replace any existing footer
    document.querySelector('footer')?.remove();
    document.body.insertAdjacentHTML('beforeend', footerHTML);

    // Add smooth scroll behavior for Tools link
    document.querySelectorAll('a[href*="#tools-grid"]').forEach(link => {
        link.addEventListener('click', function(e) {
            // Only apply smooth scroll on main page
            if (!isInSubdirectory) {
                e.preventDefault();
                document.querySelector('#tools-grid').scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });
}); 