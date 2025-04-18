document.addEventListener('DOMContentLoaded', function() {
    const dropArea = document.getElementById('drop-area');
    const fileInput = document.getElementById('file-input');
    const fileInfo = document.getElementById('file-info');
    const fileSizeSpan = document.getElementById('file-size');
    const totalPagesSpan = document.getElementById('total-pages');
    const outputFormat = document.getElementById('output-format');
    const preserveLayout = document.getElementById('preserve-layout');
    const extractTables = document.getElementById('extract-tables');
    const ocrText = document.getElementById('ocr-text');
    const removeHeaders = document.getElementById('remove-headers');
    const removePageNumbers = document.getElementById('remove-page-numbers');
    const preserveLinks = document.getElementById('preserve-links');
    const removeExtraSpaces = document.getElementById('remove-extra-spaces');
    const fixLineBreaks = document.getElementById('fix-line-breaks');
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

        // Show file info and update extraction time estimate
        fileInfo.classList.remove('d-none');
        updateExtractionTimeEstimate();
        convertBtn.disabled = false;
    }

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Handle page selection radio buttons
    allPagesRadio.addEventListener('change', function() {
        pageRangeInput.classList.add('d-none');
        updateExtractionTimeEstimate();
    });

    customPagesRadio.addEventListener('change', function() {
        pageRangeInput.classList.remove('d-none');
        updateExtractionTimeEstimate();
    });

    // Update extraction time estimate when options change
    [outputFormat, preserveLayout, extractTables, ocrText, removeHeaders, 
     removePageNumbers, preserveLinks, removeExtraSpaces, fixLineBreaks].forEach(element => {
        element.addEventListener('change', updateExtractionTimeEstimate);
    });

    // Validate page range inputs
    startPage.addEventListener('input', function() {
        if (parseInt(this.value) > parseInt(endPage.value)) {
            endPage.value = this.value;
        }
        updateExtractionTimeEstimate();
    });

    endPage.addEventListener('input', function() {
        if (parseInt(this.value) < parseInt(startPage.value)) {
            startPage.value = this.value;
        }
        updateExtractionTimeEstimate();
    });

    function updateExtractionTimeEstimate() {
        if (!currentFile) return;

        let baseTime = 3; // Base time in seconds
        const pageCount = parseInt(totalPagesSpan.textContent);
        const fileSize = currentFile.size;

        // Adjust time based on file size and page count
        baseTime += Math.ceil(pageCount * 0.2);
        baseTime += Math.ceil(fileSize / (1024 * 1024) * 0.1);

        // Adjust time based on selected options
        if (outputFormat.value !== 'txt') baseTime += 2;
        if (preserveLayout.checked) baseTime += 1;
        if (extractTables.checked) baseTime += 2;
        if (ocrText.checked) baseTime += 4;
        if (removeHeaders.checked) baseTime += 1;
        if (removePageNumbers.checked) baseTime += 1;
        if (preserveLinks.checked) baseTime += 1;
        if (removeExtraSpaces.checked) baseTime += 1;
        if (fixLineBreaks.checked) baseTime += 1;
        
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
            // Here you would implement the actual PDF to Text extraction logic
            // For now, we'll just simulate the process
            const estimatedTime = parseInt(estimatedTimeSpan.textContent);
            await new Promise(resolve => setTimeout(resolve, estimatedTime * 1000));
            
            // Create a download link for the extracted text
            const downloadLink = document.createElement('a');
            downloadLink.href = '#'; // Replace with actual extracted text URL
            downloadLink.download = `extracted-text.${outputFormat.value}`;
            downloadLink.click();
        } catch (error) {
            console.error('Error extracting text:', error);
            alert('An error occurred while extracting text from the PDF. Please try again.');
        } finally {
            loadingSpinner.style.display = 'none';
            convertBtn.disabled = false;
        }
    });
}); 