document.addEventListener('DOMContentLoaded', function() {
    const dropArea = document.getElementById('drop-area');
    const fileInput = document.getElementById('file-input');
    const fileInfo = document.getElementById('file-info');
    const fileSizeSpan = document.getElementById('file-size');
    const totalPagesSpan = document.getElementById('total-pages');
    const imageQuality = document.getElementById('image-quality');
    const qualityValue = document.getElementById('quality-value');
    const imageResolution = document.getElementById('image-resolution');
    const removeBackground = document.getElementById('remove-background');
    const enhanceText = document.getElementById('enhance-text');
    const optimizeColors = document.getElementById('optimize-colors');
    const allPagesRadio = document.getElementById('all-pages');
    const customPagesRadio = document.getElementById('custom-pages');
    const pageRangeInput = document.getElementById('page-range-input');
    const startPage = document.getElementById('start-page');
    const endPage = document.getElementById('end-page');
    const estimatedTimeSpan = document.getElementById('estimated-time');
    const convertBtn = document.getElementById('convert-btn');
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
        fileSizeSpan.textContent = fileSize;

        // Simulate getting page count
        const pageCount = Math.floor(Math.random() * 50) + 1;
        totalPagesSpan.textContent = pageCount;

        // Update page range inputs
        startPage.max = pageCount;
        endPage.max = pageCount;
        endPage.value = pageCount;

        // Show file info and update conversion time estimate
        fileInfo.classList.remove('d-none');
        updateConversionTimeEstimate();
        convertBtn.disabled = false;
    }

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Update quality value display
    imageQuality.addEventListener('input', function() {
        qualityValue.textContent = this.value + '%';
        updateConversionTimeEstimate();
    });

    // Handle page selection radio buttons
    allPagesRadio.addEventListener('change', function() {
        pageRangeInput.classList.add('d-none');
        updateConversionTimeEstimate();
    });

    customPagesRadio.addEventListener('change', function() {
        pageRangeInput.classList.remove('d-none');
        updateConversionTimeEstimate();
    });

    // Update conversion time estimate when options change
    [imageQuality, imageResolution, removeBackground, enhanceText, optimizeColors].forEach(element => {
        element.addEventListener('change', updateConversionTimeEstimate);
    });

    // Validate page range inputs
    startPage.addEventListener('input', function() {
        if (parseInt(this.value) > parseInt(endPage.value)) {
            endPage.value = this.value;
        }
        updateConversionTimeEstimate();
    });

    endPage.addEventListener('input', function() {
        if (parseInt(this.value) < parseInt(startPage.value)) {
            startPage.value = this.value;
        }
        updateConversionTimeEstimate();
    });

    function updateConversionTimeEstimate() {
        if (!currentFile) return;

        let baseTime = 3; // Base time in seconds
        const pageCount = parseInt(totalPagesSpan.textContent);
        const fileSize = currentFile.size;

        // Adjust time based on file size and page count
        baseTime += Math.ceil(pageCount * 0.5);
        baseTime += Math.ceil(fileSize / (1024 * 1024) * 0.1);

        // Adjust time based on selected options
        if (parseInt(imageQuality.value) < 50) baseTime -= 1;
        if (parseInt(imageResolution.value) > 300) baseTime += 2;
        if (removeBackground.checked) baseTime += 1;
        if (enhanceText.checked) baseTime += 1;
        if (optimizeColors.checked) baseTime += 1;
        
        // Adjust time based on number of pages to process
        if (customPagesRadio.checked) {
            const start = parseInt(startPage.value);
            const end = parseInt(endPage.value);
            const pagesToProcess = end - start + 1;
            baseTime = Math.ceil(baseTime * (pagesToProcess / pageCount));
        }

        estimatedTimeSpan.textContent = `${baseTime} seconds`;
    }

    // Handle convert button click
    convertBtn.addEventListener('click', async function() {
        if (!currentFile) return;

        loadingSpinner.style.display = 'block';
        convertBtn.disabled = true;

        try {
            // Here you would implement the actual PDF to JPG conversion logic
            // For now, we'll just simulate the process
            const estimatedTime = parseInt(estimatedTimeSpan.textContent);
            await new Promise(resolve => setTimeout(resolve, estimatedTime * 1000));
            
            // Create a download link for the converted images
            const downloadLink = document.createElement('a');
            downloadLink.href = '#'; // Replace with actual converted images URL
            downloadLink.download = 'converted-images.zip';
            downloadLink.click();
        } catch (error) {
            console.error('Error converting PDF to JPG:', error);
            alert('An error occurred while converting the PDF to JPG. Please try again.');
        } finally {
            loadingSpinner.style.display = 'none';
            convertBtn.disabled = false;
        }
    });
}); 