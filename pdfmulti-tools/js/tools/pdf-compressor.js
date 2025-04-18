document.addEventListener('DOMContentLoaded', function() {
    const dropArea = document.getElementById('drop-area');
    const fileInput = document.getElementById('file-input');
    const fileInfo = document.getElementById('file-info');
    const originalSizeSpan = document.getElementById('original-size');
    const totalPagesSpan = document.getElementById('total-pages');
    const compressionLevel = document.getElementById('compression-level');
    const optimizeImages = document.getElementById('optimize-images');
    const removeMetadata = document.getElementById('remove-metadata');
    const compressFonts = document.getElementById('compress-fonts');
    const estimatedCompressionSpan = document.getElementById('estimated-compression');
    const compressBtn = document.getElementById('compress-btn');
    const loadingSpinner = document.getElementById('loading-spinner');
    let currentFile = null;

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
            updateFileInfo(currentFile);
        } else {
            alert('Please select a valid PDF file.');
        }
    }

    function updateFileInfo(file) {
        // Format file size
        const fileSize = formatFileSize(file.size);
        originalSizeSpan.textContent = fileSize;

        // Simulate getting page count (in a real implementation, use a PDF library)
        const pageCount = Math.floor(Math.random() * 50) + 1;
        totalPagesSpan.textContent = pageCount;

        // Show file info and update compression estimate
        fileInfo.classList.remove('d-none');
        updateCompressionEstimate();
        compressBtn.disabled = false;
    }

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Update compression estimate when options change
    [compressionLevel, optimizeImages, removeMetadata, compressFonts].forEach(element => {
        element.addEventListener('change', updateCompressionEstimate);
    });

    function updateCompressionEstimate() {
        if (!currentFile) return;

        let baseCompression = 0;
        switch (compressionLevel.value) {
            case 'low':
                baseCompression = 20;
                break;
            case 'medium':
                baseCompression = 40;
                break;
            case 'high':
                baseCompression = 60;
                break;
        }

        let additionalCompression = 0;
        if (optimizeImages.checked) additionalCompression += 15;
        if (removeMetadata.checked) additionalCompression += 5;
        if (compressFonts.checked) additionalCompression += 10;

        const totalCompression = Math.min(baseCompression + additionalCompression, 90);
        estimatedCompressionSpan.textContent = `${totalCompression}%`;
    }

    // Handle compress button click
    compressBtn.addEventListener('click', async function() {
        if (!currentFile) return;

        loadingSpinner.style.display = 'block';
        compressBtn.disabled = true;

        try {
            // Here you would implement the actual PDF compression logic
            // For now, we'll just simulate the process
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Create a download link for the compressed PDF
            const downloadLink = document.createElement('a');
            downloadLink.href = '#'; // Replace with actual compressed PDF URL
            downloadLink.download = 'compressed-document.pdf';
            downloadLink.click();
        } catch (error) {
            console.error('Error compressing PDF:', error);
            alert('An error occurred while compressing the PDF. Please try again.');
        } finally {
            loadingSpinner.style.display = 'none';
            compressBtn.disabled = false;
        }
    });
}); 