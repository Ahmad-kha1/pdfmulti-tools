document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const dropArea = document.getElementById('drop-area');
    const fileInput = document.getElementById('file-input');
    const fileList = document.getElementById('file-list');
    const fileInfo = document.getElementById('file-info');
    const fileSize = document.getElementById('file-size');
    const totalPages = document.getElementById('total-pages');
    const estimatedTime = document.getElementById('estimated-time');
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
    const convertBtn = document.getElementById('convert-btn');
    const loadingSpinner = document.getElementById('loading-spinner');
    const conversionOptions = document.getElementById('conversion-options');
    const customRangeContainer = document.getElementById('custom-range-container');
    const customRange = document.getElementById('custom-range');
    const pageRange = document.getElementById('page-range');
    const imageQuality = document.getElementById('image-quality');
    const extractText = document.getElementById('extract-text');
    const transparentBg = document.getElementById('transparent-bg');
    const autoZip = document.getElementById('auto-zip');
    const namingPattern = document.getElementById('naming-pattern');

    // Initialize PDF.js library
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

    // Create Web Workers pool for parallel processing
    const workerCount = navigator.hardwareConcurrency || 4;
    const workers = [];
    
    // Store uploaded files
    let files = [];
    
    // Store conversion results
    let conversionResults = [];
    
    // Store conversion status
    let conversionStatus = {
        isPaused: false,
        inProgress: false,
        completedFiles: 0,
        totalFiles: 0
    };

    // Add error message container
    const errorContainer = document.createElement('div');
    errorContainer.className = 'error-container mt-3 d-none';
    errorContainer.innerHTML = `
        <div class="alert alert-danger" role="alert">
            <h5 class="alert-heading"><i class="fas fa-exclamation-triangle me-2"></i>Conversion Error</h5>
            <p id="error-message">An error occurred during conversion.</p>
            <hr>
            <div id="troubleshooting-tips">
                <p class="mb-1"><strong>Troubleshooting Tips:</strong></p>
                <ul class="mb-0">
                </ul>
            </div>
        </div>
    `;
    
    // Insert error container after file list
    fileList.parentNode.insertBefore(errorContainer, fileList.nextSibling);

    // Add action buttons container with ZIP functionality
    const actionButtons = document.createElement('div');
    actionButtons.className = 'action-buttons mt-3 d-flex flex-wrap gap-2';
    actionButtons.innerHTML = `
        <button id="zip-btn" class="btn btn-secondary" disabled>
            <i class="fas fa-file-archive me-1"></i>Download as ZIP
        </button>
    `;
    
    // Insert action buttons after error container
    errorContainer.parentNode.insertBefore(actionButtons, errorContainer.nextSibling);
    
    // Get zip button
    const zipBtn = document.getElementById('zip-btn');

    // Load JSZip library dynamically
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
    document.head.appendChild(script);

    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
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
        dropArea.classList.add('highlight');
    }

    function unhighlight() {
        dropArea.classList.remove('highlight');
    }

    // Handle dropped files
    dropArea.addEventListener('drop', handleDrop, false);
    fileInput.addEventListener('change', handleFiles, false);

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles({ target: { files: files } });
    }

    function handleFiles(e) {
        const uploadedFiles = Array.from(e.target.files);
        const pdfFiles = uploadedFiles.filter(file => file.type === 'application/pdf');
        const nonPdfFiles = uploadedFiles.filter(file => file.type !== 'application/pdf');
        
        // Handle non-PDF files
        if (nonPdfFiles.length > 0) {
            const fileNames = nonPdfFiles.map(f => f.name).join(', ');
            showError('Invalid File Type', 
                [`The following files are not PDFs and will be ignored: ${fileNames}`,
                 'Only PDF files can be converted to PNG images',
                 'Please select PDF files only']);
        }
        
        if (pdfFiles.length === 0) {
            return;
        }
        
        // Check file sizes
        const maxSizeInBytes = 50 * 1024 * 1024; // 50MB
        const oversizedFiles = pdfFiles.filter(file => file.size > maxSizeInBytes);
        
        if (oversizedFiles.length > 0) {
            const fileNames = oversizedFiles.map(f => `${f.name} (${formatFileSize(f.size)})`).join(', ');
            showError('File Size Limit Exceeded', 
                [`The following files exceed the 50MB size limit: ${fileNames}`,
                 'Large files may cause browser performance issues',
                 'Try splitting your PDF into smaller parts before uploading']);
            
            // Filter out oversized files
            files = pdfFiles.filter(file => file.size <= maxSizeInBytes);
        } else {
            files = pdfFiles;
        }

        fileList.innerHTML = '';
        files.forEach(file => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item p-3 mb-3 rounded bg-white';
            fileItem.innerHTML = `
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <i class="fas fa-file-pdf text-danger me-2"></i>
                        <span>${file.name}</span>
                        <small class="text-muted ms-2">(${formatFileSize(file.size)})</small>
                    </div>
                    <button class="btn btn-sm btn-outline-danger remove-file-btn">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
            
            // Add remove button event listener
            const removeBtn = fileItem.querySelector('.remove-file-btn');
            removeBtn.addEventListener('click', function() {
                fileItem.remove();
                files = files.filter(f => f !== file);
                updateFileInfo();
            });
            
            fileList.appendChild(fileItem);
        });

        updateFileInfo();
    }

    function updateFileInfo() {
        // Show/hide options and buttons based on file selection
        if (files.length > 0) {
            conversionOptions.classList.remove('d-none');
            fileInfo.classList.remove('d-none');
            convertBtn.disabled = false;
            zipBtn.disabled = files.length <= 1;
            
            // Update total size
            const totalSizeBytes = files.reduce((sum, file) => sum + file.size, 0);
            fileSize.textContent = formatFileSize(totalSizeBytes);
            
            // Estimate total pages (rough estimate)
            const estimatedPages = Math.ceil(totalSizeBytes / 50000); // ~50KB per page
            totalPages.textContent = estimatedPages;
            
            // Update time estimate
            updateConversionTimeEstimate(estimatedPages);
        } else {
            conversionOptions.classList.add('d-none');
            fileInfo.classList.add('d-none');
            convertBtn.disabled = true;
            zipBtn.disabled = true;
        }
        
        // Hide any previous error messages
        hideError();
    }

    function formatFileSize(bytes) {
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 Bytes';
        const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
        return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
    }

    function updateConversionTimeEstimate(pages) {
        let baseTime = pages * 1; // Base time of 1 second per page
        if (extractText.checked) baseTime *= 2;
        if (transparentBg.checked) baseTime *= 1.5;
        
        // Apply quality factor
        const qualityFactor = {
            'low': 0.5,
            'medium': 1,
            'high': 2,
            'veryhigh': 4
        };
        baseTime *= qualityFactor[imageQuality.value] || 1;
        
        estimatedTime.textContent = `${Math.ceil(baseTime)} seconds`;
    }

    // Show error message with troubleshooting tips
    function showError(title, tips) {
        const errorContainer = document.querySelector('.error-container');
        const errorMessage = document.getElementById('error-message');
        const tipsList = document.querySelector('#troubleshooting-tips ul');
        
        errorContainer.classList.remove('d-none');
        errorMessage.textContent = title;
        
        tipsList.innerHTML = '';
        tips.forEach(tip => {
            const li = document.createElement('li');
            li.textContent = tip;
            tipsList.appendChild(li);
        });
    }
    
    // Hide error message
    function hideError() {
        const errorContainer = document.querySelector('.error-container');
        errorContainer.classList.add('d-none');
    }

    // Listen for options changes to update estimate
    [imageQuality, extractText, transparentBg].forEach(el => {
        el.addEventListener('change', function() {
            if (totalPages.textContent !== '0') {
                updateConversionTimeEstimate(parseInt(totalPages.textContent));
            }
        });
    });

    // Handle page range selection
    pageRange.addEventListener('change', function() {
        if (this.value === 'custom') {
            customRangeContainer.classList.remove('d-none');
        } else {
            customRangeContainer.classList.add('d-none');
        }
    });

    // Handle conversion button click
    convertBtn.addEventListener('click', async function() {
        if (files.length === 0) return;
        
        try {
            // Reset conversion state
            conversionResults = [];
            conversionStatus = {
                isPaused: false,
                inProgress: true,
                completedFiles: 0,
                totalFiles: files.length
            };
            
            // Update UI for conversion start
            convertBtn.disabled = true;
            progressBar.classList.remove('d-none');
            progressText.textContent = 'Starting conversion...';
            loadingSpinner.classList.remove('d-none');
            
            // Create download status container
            const downloadStatus = document.createElement('div');
            downloadStatus.className = 'download-status mt-3';
            fileList.appendChild(downloadStatus);
            
            // Add pause/resume button
            const controlButton = document.createElement('button');
            controlButton.id = 'control-btn';
            controlButton.className = 'btn btn-warning ms-2';
            controlButton.innerHTML = '<i class="fas fa-pause me-1"></i>Pause';
            controlButton.addEventListener('click', togglePauseResume);
            convertBtn.parentNode.insertBefore(controlButton, convertBtn.nextSibling);
            
            // Process files
            for (let i = 0; i < files.length; i++) {
                // Wait if paused
                while (conversionStatus.isPaused) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
                
                const file = files[i];
                
                // Create status element for this file
                const fileStatus = document.createElement('div');
                fileStatus.className = 'file-status mb-2 p-2 rounded bg-light';
                fileStatus.innerHTML = `
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <i class="fas fa-file-image text-success me-2"></i>
                            <span>${file.name}</span>
                        </div>
                        <div class="status-controls">
                            <span class="badge bg-info">Converting</span>
                        </div>
                    </div>
                    <div class="progress mt-2" style="height: 5px;">
                        <div class="progress-bar" role="progressbar" style="width: 0%"></div>
                    </div>
                `;
                downloadStatus.appendChild(fileStatus);
                
                try {
                    // Get conversion options
                    const options = {
                        quality: imageQuality.value,
                        extractText: extractText.checked,
                        transparentBg: transparentBg.checked,
                        pageRange: pageRange.value === 'custom' ? customRange.value : pageRange.value,
                        namingPattern: namingPattern.value
                    };
                    
                    // Process this file
                    const result = await convertPDFToPNG(file, fileStatus, options);
                    conversionResults.push(...result);
                    
                    // Update file status
                    fileStatus.querySelector('.badge').className = 'badge bg-success';
                    fileStatus.querySelector('.badge').textContent = 'Completed';
                    fileStatus.querySelector('.progress-bar').style.width = '100%';
                    
                    conversionStatus.completedFiles++;
                    
                } catch (error) {
                    console.error(`Error processing ${file.name}:`, error);
                    fileStatus.querySelector('.badge').className = 'badge bg-danger';
                    fileStatus.querySelector('.badge').textContent = 'Failed';
                    
                    showError(`Error Processing ${file.name}`, [
                        error.message || 'Failed to convert file',
                        'Try a different PDF file',
                        'Check if the PDF is corrupted or password protected'
                    ]);
                }
            }
            
            // Conversion complete
            progressText.textContent = 'All files have been processed. Click the download buttons to save your images.';
            progressBar.querySelector('.progress-bar').style.width = '100%';
            
            // Remove pause/resume button
            document.getElementById('control-btn')?.remove();
            
            // Enable ZIP button if multiple results
            if (conversionResults.length > 1) {
                zipBtn.disabled = false;
                if (autoZip.checked) {
                    createAndDownloadZip();
                }
            }
            
        } catch (error) {
            console.error('Conversion error:', error);
            showError('Conversion Failed', [
                error.message || 'An error occurred during conversion',
                'Try refreshing the page and uploading again',
                'Make sure your PDF is not password protected'
            ]);
        } finally {
            convertBtn.disabled = false;
            loadingSpinner.classList.add('d-none');
            conversionStatus.inProgress = false;
        }
    });
    
    // Toggle pause/resume for conversion
    function togglePauseResume() {
        const controlBtn = document.getElementById('control-btn');
        
        if (conversionStatus.isPaused) {
            // Resume
            conversionStatus.isPaused = false;
            controlBtn.innerHTML = '<i class="fas fa-pause me-1"></i>Pause';
            controlBtn.className = 'btn btn-warning ms-2';
            progressText.textContent = 'Resuming conversion...';
        } else {
            // Pause
            conversionStatus.isPaused = true;
            controlBtn.innerHTML = '<i class="fas fa-play me-1"></i>Resume';
            controlBtn.className = 'btn btn-success ms-2';
            progressText.textContent = 'Conversion paused. Click Resume to continue.';
        }
    }
    
    // Create and download ZIP file
    zipBtn.addEventListener('click', createAndDownloadZip);
    
    function createAndDownloadZip() {
        // Check if jszip is available
        if (typeof JSZip === 'undefined') {
            showError('ZIP Error', [
                'JSZip library is not loaded',
                'Try refreshing the page',
                'Download images individually instead'
            ]);
            return;
        }
        
        const zip = new JSZip();
        
        // Add all PNG images to zip
        conversionResults.forEach(result => {
            zip.file(result.filename, result.blob);
        });
        
        // Generate zip file
        zip.generateAsync({type: 'blob'})
            .then(function(content) {
                // Create filename with current date
                const zipName = `pdf_images_${new Date().toISOString().slice(0,10)}.zip`;
                
                // Trigger download
                const a = document.createElement('a');
                a.href = URL.createObjectURL(content);
                a.download = zipName;
                document.body.appendChild(a);
                a.click();
                URL.revokeObjectURL(a.href);
                document.body.removeChild(a);
                
                progressText.textContent = `All images have been zipped and downloaded as ${zipName}`;
            })
            .catch(function(error) {
                console.error('ZIP creation error:', error);
                showError('ZIP Creation Failed', [
                    error.message || 'Failed to create ZIP file',
                    'Try downloading images individually',
                    'Check if you have sufficient disk space'
                ]);
            });
    }
    
    // Convert PDF to PNG images
    async function convertPDFToPNG(file, statusElement, options) {
        // Read the PDF file
        const arrayBuffer = await file.arrayBuffer();
        
        // Load the PDF document
        const pdf = await pdfjsLib.getDocument({data: arrayBuffer}).promise;
        const totalPages = pdf.numPages;
        
        // Determine pages to process
        let pagesToProcess = [];
        if (options.pageRange === 'all') {
            // Process all pages
            pagesToProcess = Array.from({length: totalPages}, (_, i) => i + 1);
        } else if (options.pageRange === '1') {
            // Process only first page
            pagesToProcess = [1];
        } else if (typeof options.pageRange === 'string' && options.pageRange.includes('-')) {
            // Process range like "1-5"
            const [start, end] = options.pageRange.split('-').map(Number);
            const validStart = Math.max(1, Math.min(start || 1, totalPages));
            const validEnd = Math.max(validStart, Math.min(end || totalPages, totalPages));
            for (let i = validStart; i <= validEnd; i++) {
                pagesToProcess.push(i);
            }
        } else if (typeof options.pageRange === 'string') {
            // Process comma-separated pages like "1,3,5"
            pagesToProcess = options.pageRange.split(',')
                .map(p => parseInt(p.trim()))
                .filter(p => !isNaN(p) && p > 0 && p <= totalPages);
        }
        
        // If no valid pages specified, process all
        if (pagesToProcess.length === 0) {
            pagesToProcess = Array.from({length: totalPages}, (_, i) => i + 1);
        }
        
        // Determine scale factor based on quality
        const scaleFactor = {
            'low': 1,
            'medium': 1.5,
            'high': 2,
            'veryhigh': 3
        }[options.quality] || 1.5;
        
        // Result storage
        const results = [];
        
        // Process each page
        for (let i = 0; i < pagesToProcess.length; i++) {
            const pageNum = pagesToProcess[i];
            const page = await pdf.getPage(pageNum);
            
            // Calculate viewport dimensions
            const viewport = page.getViewport({scale: scaleFactor});
            
            // Create canvas
            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const context = canvas.getContext('2d');
            
            // Set background color if not transparent
            if (!options.transparentBg) {
                context.fillStyle = '#FFFFFF';
                context.fillRect(0, 0, canvas.width, canvas.height);
            }
            
            // Render PDF page to the canvas
            await page.render({
                canvasContext: context,
                viewport: viewport
            }).promise;
            
            // Create filename based on pattern
            let filename;
            const baseName = file.name.replace('.pdf', '');
            const pageStr = pageNum.toString().padStart(3, '0');
            
            switch (options.namingPattern) {
                case 'filename_page':
                    filename = `${baseName}_page${pageStr}.png`;
                    break;
                case 'page_filename':
                    filename = `page${pageStr}_${baseName}.png`;
                    break;
                case 'page_number':
                    filename = `page_${pageStr}.png`;
                    break;
                default:
                    filename = `${baseName}_page${pageStr}.png`;
            }
            
            // Convert canvas to blob
            const blob = await new Promise(resolve => {
                canvas.toBlob(resolve, 'image/png');
            });
            
            // Add to results
            results.push({
                filename: filename,
                blob: blob,
                pageNum: pageNum
            });
            
            // Add download button to status element
            const downloadBtn = document.createElement('button');
            downloadBtn.className = 'btn btn-sm btn-primary ms-2';
            downloadBtn.innerHTML = '<i class="fas fa-download me-1"></i>Page ' + pageNum;
            downloadBtn.onclick = function() {
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = filename;
                a.click();
                URL.revokeObjectURL(a.href);
            };
            statusElement.querySelector('.status-controls').appendChild(downloadBtn);
            
            // Update progress
            const progress = Math.round(((i + 1) / pagesToProcess.length) * 100);
            statusElement.querySelector('.progress-bar').style.width = `${progress}%`;
            progressBar.querySelector('.progress-bar').style.width = `${Math.round((conversionStatus.completedFiles / files.length) * 100 + (progress / files.length))}%`;
            progressText.textContent = `Converting ${file.name}... ${progress}% complete`;
        }
        
        // Clean up
        pdf.destroy();
        
        return results;
    }
}); 