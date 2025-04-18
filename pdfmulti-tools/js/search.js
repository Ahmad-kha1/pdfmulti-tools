document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('tool-search');
    const toolsGrid = document.getElementById('tools-grid');
    const toolCards = toolsGrid ? toolsGrid.getElementsByClassName('tool-card') : [];

    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            
            Array.from(toolCards).forEach(card => {
                const title = card.querySelector('.card-title').textContent.toLowerCase();
                const description = card.querySelector('.card-text').textContent.toLowerCase();
                
                if (title.includes(searchTerm) || description.includes(searchTerm)) {
                    card.parentElement.style.display = '';
                } else {
                    card.parentElement.style.display = 'none';
                }
            });
        });
    }
}); 