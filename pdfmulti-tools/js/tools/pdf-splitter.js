document.addEventListener('DOMContentLoaded', function() {
    const dropArea = document.getElementById('drop-area');
    const fileInput = document.getElementById('file-input');
    const fileInfo = document.getElementById('file-info');
    const totalPagesSpan = document.getElementById('total-pages');
    const splitMethod = document.getElementById('split-method');
    const rangeInput = document.getElementById('range-input');
    const everyInput = document.getElementById('every-input');
    const pageRanges = document.getElementById('page-ranges');
    const splitEvery = document.getElementById('split-every');
    const splitBtn = document.getElementById('split-btn');
    const loadingSpinner = document.getElementById('loading-spinner');
    let currentFile = null;
    let totalPages = 0;

    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    // Highlight drop area when item is dragged over it
    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, unhighlight, false);
    });

    function highlight() {
        dropArea.classList.add('border-primary');
    }

    function unhighlight() {
        dropArea.classList.remove('border-primary');
    }

    // Handle dropped files
    dropArea.addEventListener('drop', handleDrop, false);
    fileInput.addEventListener('change', handleFiles, false);

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const droppedFiles = dt.files;
        handleFiles({ target: { files: droppedFiles } });
    }

    function handleFiles(e) {
        const files = Array.from(e.target.files);
        if (files.length > 0 && files[0].type === 'application/pdf') {
            currentFile = files[0];
            // In a real implementation, you would use a PDF library to get the page count
            // For now, we'll simulate getting the page count
            simulateGetPageCount(currentFile);
        } else {
            alert('Please select a valid PDF file.');
        }
    }

    function simulateGetPageCount(file) {
        // Simulate getting page count (in a real implementation, use a PDF library)
        totalPages = Math.floor(Math.random() * 50) + 1; // Random number between 1 and 50
        totalPagesSpan.textContent = totalPages;
        fileInfo.classList.remove('d-none');
        updateSplitButton();
    }

    // Handle split method change
    splitMethod.addEventListener('change', function() {
        if (this.value === 'range') {
            rangeInput.classList.remove('d-none');
            everyInput.classList.add('d-none');
        } else {
            rangeInput.classList.add('d-none');
            everyInput.classList.remove('d-none');
        }
        updateSplitButton();
    });

    // Handle input changes
    pageRanges.addEventListener('input', updateSplitButton);
    splitEvery.addEventListener('input', updateSplitButton);

    function updateSplitButton() {
        if (!currentFile) {
            splitBtn.disabled = true;
            return;
        }

        if (splitMethod.value === 'range') {
            const ranges = pageRanges.value.trim();
            splitBtn.disabled = !isValidPageRanges(ranges);
        } else {
            const every = parseInt(splitEvery.value);
            splitBtn.disabled = isNaN(every) || every < 1 || every > totalPages;
        }
    }

    function isValidPageRanges(ranges) {
        if (!ranges) return false;
        
        const rangePattern = /^\d+-\d+$/;
        const rangesArray = ranges.split(',').map(r => r.trim());
        
        return rangesArray.every(range => {
            if (!rangePattern.test(range)) return false;
            const [start, end] = range.split('-').map(Number);
            return start > 0 && end <= totalPages && start <= end;
        });
    }

    // Handle split button click
    splitBtn.addEventListener('click', async function() {
        if (!currentFile) return;

        loadingSpinner.style.display = 'block';
        splitBtn.disabled = true;

        try {
            // Here you would implement the actual PDF splitting logic
            // For now, we'll just simulate the process
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Create a download link for the split PDFs
            // In a real implementation, you would create multiple files
            const downloadLink = document.createElement('a');
            downloadLink.href = '#'; // Replace with actual split PDF URL
            downloadLink.download = 'split-document.pdf';
            downloadLink.click();
        } catch (error) {
            console.error('Error splitting PDF:', error);
            alert('An error occurred while splitting the PDF. Please try again.');
        } finally {
            loadingSpinner.style.display = 'none';
            splitBtn.disabled = false;
        }
    });
}); 