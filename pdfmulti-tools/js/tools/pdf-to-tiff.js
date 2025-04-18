document.addEventListener('DOMContentLoaded', function() {
    // Add PDF.js library
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload = initialize;
    document.head.appendChild(script);
});

function initialize() {
    const dropArea = document.getElementById('drop-area');
    const fileInput = document.getElementById('file-input');
    const fileInfo = document.getElementById('file-info');
    const fileSizeSpan = document.getElementById('file-size');
    const totalPagesSpan = document.getElementById('total-pages');
    const outputFilename = document.getElementById('output-filename');
    const imageResolution = document.getElementById('image-resolution');
    const compressionType = document.getElementById('compression-type');
    const depth1Bit = document.getElementById('depth-1');
    const depth8Bit = document.getElementById('depth-8');
    const depth24Bit = document.getElementById('depth-24');
    const enhanceText = document.getElementById('enhance-text');
    const optimizeColors = document.getElementById('optimize-colors');
    const removeNoise = document.getElementById('remove-noise');
    const sharpen = document.getElementById('sharpen');
    const adjustContrast = document.getElementById('adjust-contrast');
    const enhanceDetails = document.getElementById('enhance-details');
    const autoLevels = document.getElementById('auto-levels');
    const despeckle = document.getElementById('despeckle');
    const enhanceShadows = document.getElementById('enhance-shadows');
    const enhanceHighlights = document.getElementById('enhance-highlights');
    const reduceMoire = document.getElementById('reduce-moire');
    const enhanceEdges = document.getElementById('enhance-edges');
    const enhanceFineDetails = document.getElementById('enhance-fine-details');
    const enhanceMidtones = document.getElementById('enhance-midtones');
    const enhanceSaturation = document.getElementById('enhance-saturation');
    const enhanceVibrance = document.getElementById('enhance-vibrance');
    const enhanceClarity = document.getElementById('enhance-clarity');
    const enhanceDehaze = document.getElementById('enhance-dehaze');
    const enhanceDenoise = document.getElementById('enhance-denoise');
    const enhanceSuperResolution = document.getElementById('enhance-super-resolution');
    const allPagesRadio = document.getElementById('all-pages');
    const customPagesRadio = document.getElementById('custom-pages');
    const pageRangeInput = document.getElementById('page-range-input');
    const startPage = document.getElementById('start-page');
    const endPage = document.getElementById('end-page');
    const showPreview = document.getElementById('show-preview');
    const previewAllPages = document.getElementById('preview-all-pages');
    const previewEnhancements = document.getElementById('preview-enhancements');
    const previewSplitView = document.getElementById('preview-split-view');
    const previewSection = document.getElementById('preview-section');
    const previewContainer = document.getElementById('preview-container');
    const estimatedTimeSpan = document.getElementById('estimated-time');
    const convertBtn = document.getElementById('convert-btn');
    const loadingSpinner = document.getElementById('loading-spinner');
    
    // Create progress elements
    const progressContainer = document.createElement('div');
    progressContainer.className = 'progress-container mt-3';
    progressContainer.innerHTML = `
        <div class="progress mb-2">
            <div class="progress-bar progress-bar-striped progress-bar-animated" role="progressbar" style="width: 0%"></div>
        </div>
        <div class="progress-status text-center small text-muted"></div>
    `;
    convertBtn.parentNode.insertBefore(progressContainer, convertBtn.nextSibling);
    
    const progressBar = progressContainer.querySelector('.progress-bar');
    const progressStatus = progressContainer.querySelector('.progress-status');
    
    const pdfProcessor = new PDFProcessor();
    let currentFiles = [];
    let currentFileIndex = 0;

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

    async function handleFiles(e) {
        const files = Array.from(e.target.files);
        if (files.length > 0 && files.every(file => file.type === 'application/pdf')) {
            currentFiles = files;
            currentFileIndex = 0;
            try {
                const info = await pdfProcessor.loadPDF(currentFiles[0]);
                updateFileInfo(currentFiles[0], info);
                if (showPreview.checked) {
                    await generatePreview(currentFiles[0], info);
                }
            } catch (error) {
                console.error('Error loading PDF:', error);
                showError('Failed to load PDF file. Please try again.');
            }
        } else {
            showError('Please select valid PDF files.');
        }
    }

    async function generatePreview(pdfFile, info) {
        previewContainer.innerHTML = '';
        previewSection.classList.remove('d-none');
        
        const pagesToPreview = previewAllPages.checked ? info.numPages : 1;
        const previewScale = 0.2; // Scale down for preview
        
        for (let pageNum = 1; pageNum <= pagesToPreview; pageNum++) {
            try {
                const page = await pdfProcessor.getPage(pageNum);
                const canvas = document.createElement('canvas');
                await pdfProcessor.renderPageToCanvas(page, canvas, previewScale);
                
                if (previewEnhancements.checked) {
                    // Create enhanced version
                    const enhancedCanvas = document.createElement('canvas');
                    enhancedCanvas.width = canvas.width;
                    enhancedCanvas.height = canvas.height;
                    const enhancedCtx = enhancedCanvas.getContext('2d');
                    enhancedCtx.drawImage(canvas, 0, 0);
                    
                    await enhanceImage(enhancedCanvas, {
                        enhanceText: enhanceText.checked,
                        optimizeColors: optimizeColors.checked,
                        removeNoise: removeNoise.checked,
                        sharpen: sharpen.checked,
                        adjustContrast: adjustContrast.checked,
                        enhanceDetails: enhanceDetails.checked,
                        autoLevels: autoLevels.checked,
                        despeckle: despeckle.checked,
                        enhanceShadows: enhanceShadows.checked,
                        enhanceHighlights: enhanceHighlights.checked,
                        reduceMoire: reduceMoire.checked,
                        enhanceEdges: enhanceEdges.checked,
                        enhanceFineDetails: enhanceFineDetails.checked,
                        enhanceMidtones: enhanceMidtones.checked,
                        enhanceSaturation: enhanceSaturation.checked,
                        enhanceVibrance: enhanceVibrance.checked,
                        enhanceClarity: enhanceClarity.checked,
                        enhanceDehaze: enhanceDehaze.checked,
                        enhanceDenoise: enhanceDenoise.checked,
                        enhanceSuperResolution: enhanceSuperResolution.checked
                    });
                    
                    if (previewSplitView.checked) {
                        // Create split view
                        const splitCanvas = document.createElement('canvas');
                        splitCanvas.width = canvas.width * 2;
                        splitCanvas.height = canvas.height;
                        const splitCtx = splitCanvas.getContext('2d');
                        
                        // Draw original on left
                        splitCtx.drawImage(canvas, 0, 0);
                        // Draw enhanced on right
                        splitCtx.drawImage(enhancedCanvas, canvas.width, 0);
                        
                        // Add divider line
                        splitCtx.beginPath();
                        splitCtx.moveTo(canvas.width, 0);
                        splitCtx.lineTo(canvas.width, canvas.height);
                        splitCtx.strokeStyle = '#ff0000';
                        splitCtx.lineWidth = 2;
                        splitCtx.stroke();
                        
                        // Add labels
                        splitCtx.fillStyle = '#ff0000';
                        splitCtx.font = '14px Arial';
                        splitCtx.fillText('Original', 10, 20);
                        splitCtx.fillText('Enhanced', canvas.width + 10, 20);
                        
                        const previewItem = document.createElement('div');
                        previewItem.className = 'col-md-12';
                        previewItem.innerHTML = `
                            <div class="card">
                                <div class="card-body">
                                    <h6 class="card-title">Page ${pageNum}</h6>
                                    <div class="preview-image-container">
                                        <img src="${splitCanvas.toDataURL('image/jpeg', 0.7)}" class="img-fluid" alt="Page ${pageNum} Preview">
                                    </div>
                                </div>
                            </div>
                        `;
                        previewContainer.appendChild(previewItem);
                    } else {
                        // Show only enhanced version
                        const previewItem = document.createElement('div');
                        previewItem.className = 'col-md-6';
                        previewItem.innerHTML = `
                            <div class="card">
                                <div class="card-body">
                                    <h6 class="card-title">Page ${pageNum}</h6>
                                    <div class="preview-image-container">
                                        <img src="${enhancedCanvas.toDataURL('image/jpeg', 0.7)}" class="img-fluid" alt="Page ${pageNum} Preview">
                                    </div>
                                </div>
                            </div>
                        `;
                        previewContainer.appendChild(previewItem);
                    }
                } else {
                    // Show original version
                    const previewItem = document.createElement('div');
                    previewItem.className = 'col-md-6';
                    previewItem.innerHTML = `
                        <div class="card">
                            <div class="card-body">
                                <h6 class="card-title">Page ${pageNum}</h6>
                                <div class="preview-image-container">
                                    <img src="${canvas.toDataURL('image/jpeg', 0.7)}" class="img-fluid" alt="Page ${pageNum} Preview">
                                </div>
                            </div>
                        </div>
                    `;
                    previewContainer.appendChild(previewItem);
                }
            } catch (error) {
                console.error(`Error generating preview for page ${pageNum}:`, error);
            }
        }
    }

    function showError(message) {
        const errorAlert = document.createElement('div');
        errorAlert.className = 'alert alert-danger alert-dismissible fade show';
        errorAlert.innerHTML = `
            <i class="fas fa-exclamation-circle me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        fileInfo.parentNode.insertBefore(errorAlert, fileInfo);
        setTimeout(() => errorAlert.remove(), 5000);
    }

    function updateFileInfo(file, info) {
        // Format file size
        const fileSize = formatFileSize(file.size);
        fileSizeSpan.textContent = fileSize;

        // Update page count
        totalPagesSpan.textContent = info.numPages;

        // Update page range inputs
        startPage.max = info.numPages;
        endPage.max = info.numPages;
        endPage.value = info.numPages;

        // Set default output filename
        outputFilename.value = file.name.replace('.pdf', '');

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
    [imageResolution, compressionType, depth1Bit, depth8Bit, depth24Bit, enhanceText, optimizeColors, removeNoise, sharpen, adjustContrast, enhanceDetails, autoLevels, despeckle, enhanceShadows, enhanceHighlights, reduceMoire, enhanceEdges, enhanceFineDetails, enhanceMidtones, enhanceSaturation, enhanceVibrance, enhanceClarity, enhanceDehaze, enhanceDenoise, enhanceSuperResolution].forEach(element => {
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

    // Handle preview options
    showPreview.addEventListener('change', async function() {
        if (this.checked && currentFiles.length > 0) {
            try {
                const info = await pdfProcessor.loadPDF(currentFiles[0]);
                await generatePreview(currentFiles[0], info);
            } catch (error) {
                console.error('Error generating preview:', error);
            }
        } else {
            previewSection.classList.add('d-none');
        }
    });

    previewAllPages.addEventListener('change', async function() {
        if (showPreview.checked && currentFiles.length > 0) {
            try {
                const info = await pdfProcessor.loadPDF(currentFiles[0]);
                await generatePreview(currentFiles[0], info);
            } catch (error) {
                console.error('Error generating preview:', error);
            }
        }
    });

    previewEnhancements.addEventListener('change', async function() {
        if (showPreview.checked && currentFiles.length > 0) {
            try {
                const info = await pdfProcessor.loadPDF(currentFiles[0]);
                await generatePreview(currentFiles[0], info);
            } catch (error) {
                console.error('Error generating preview:', error);
            }
        }
    });

    previewSplitView.addEventListener('change', async function() {
        if (showPreview.checked && currentFiles.length > 0) {
            try {
                const info = await pdfProcessor.loadPDF(currentFiles[0]);
                await generatePreview(currentFiles[0], info);
            } catch (error) {
                console.error('Error generating preview:', error);
            }
        }
    });

    function updateConversionTimeEstimate() {
        if (currentFiles.length === 0) return;

        let baseTime = 3; // Base time in seconds
        const pageCount = parseInt(totalPagesSpan.textContent);
        const fileSize = currentFiles[0].size;

        // Adjust time based on file size and page count
        baseTime += Math.ceil(pageCount * 0.5);
        baseTime += Math.ceil(fileSize / (1024 * 1024) * 0.1);

        // Adjust time based on selected options
        if (parseInt(imageResolution.value) > 300) baseTime += 2;
        if (compressionType.value === 'lzw' || compressionType.value === 'zip') baseTime += 1;
        if (compressionType.value === 'jpeg') baseTime += 2;
        if (depth1Bit.checked) baseTime += 1;
        if (depth8Bit.checked) baseTime += 2;
        if (enhanceText.checked) baseTime += 1;
        if (optimizeColors.checked) baseTime += 1;
        if (removeNoise.checked) baseTime += 2;
        if (sharpen.checked) baseTime += 1;
        if (adjustContrast.checked) baseTime += 1;
        if (enhanceDetails.checked) baseTime += 2;
        if (autoLevels.checked) baseTime += 1;
        if (despeckle.checked) baseTime += 2;
        if (enhanceShadows.checked) baseTime += 1;
        if (enhanceHighlights.checked) baseTime += 1;
        if (reduceMoire.checked) baseTime += 3;
        if (enhanceEdges.checked) baseTime += 2;
        if (enhanceFineDetails.checked) baseTime += 2;
        if (enhanceMidtones.checked) baseTime += 1;
        if (enhanceSaturation.checked) baseTime += 1;
        if (enhanceVibrance.checked) baseTime += 2;
        if (enhanceClarity.checked) baseTime += 2;
        if (enhanceDehaze.checked) baseTime += 2;
        if (enhanceDenoise.checked) baseTime += 3;
        if (enhanceSuperResolution.checked) baseTime += 5;
        
        // Adjust time based on number of pages to process
        if (customPagesRadio.checked) {
            const start = parseInt(startPage.value);
            const end = parseInt(endPage.value);
            const pagesToProcess = end - start + 1;
            baseTime = Math.ceil(baseTime * (pagesToProcess / pageCount));
        }

        // Adjust time based on number of files
        baseTime *= currentFiles.length;

        estimatedTimeSpan.textContent = `${baseTime} seconds`;
    }

    // Handle convert button click
    convertBtn.addEventListener('click', async function() {
        if (currentFiles.length === 0) return;

        loadingSpinner.style.display = 'block';
        convertBtn.disabled = true;
        progressContainer.style.display = 'block';
        progressBar.style.width = '0%';
        progressStatus.textContent = 'Preparing conversion...';

        try {
            const zip = new JSZip();
            const totalFiles = currentFiles.length;
            let processedFiles = 0;

            for (const file of currentFiles) {
                try {
                    const info = await pdfProcessor.loadPDF(file);
                    const startPageNum = allPagesRadio.checked ? 1 : parseInt(startPage.value);
                    const endPageNum = allPagesRadio.checked ? info.numPages : parseInt(endPage.value);
                    const resolution = parseInt(imageResolution.value);
                    const compression = compressionType.value;
                    const colorDepth = depth1Bit.checked ? 1 : (depth8Bit.checked ? 8 : 24);
                    
                    // Create a folder for this PDF
                    const folderName = file.name.replace('.pdf', '');
                    const folder = zip.folder(folderName);
                    
                    // Process each page
                    for (let pageNum = startPageNum; pageNum <= endPageNum; pageNum++) {
                        try {
                            // Update progress
                            const fileProgress = processedFiles / totalFiles;
                            const pageProgress = (pageNum - startPageNum) / (endPageNum - startPageNum + 1);
                            const totalProgress = (fileProgress + pageProgress / totalFiles) * 100;
                            progressBar.style.width = `${totalProgress}%`;
                            progressStatus.textContent = `Converting ${file.name} (page ${pageNum} of ${endPageNum})...`;
                            
                            const page = await pdfProcessor.getPage(pageNum);
                            const canvas = document.createElement('canvas');
                            
                            // Render page to canvas with specified resolution
                            await pdfProcessor.renderPageToCanvas(page, canvas, resolution / 72);
                            
                            // Apply image enhancements
                            if (enhanceText.checked || optimizeColors.checked || removeNoise.checked || 
                                sharpen.checked || adjustContrast.checked || enhanceDetails.checked || 
                                autoLevels.checked || despeckle.checked || enhanceShadows.checked || 
                                enhanceHighlights.checked || reduceMoire.checked || enhanceEdges.checked ||
                                enhanceFineDetails.checked || enhanceMidtones.checked || enhanceSaturation.checked ||
                                enhanceVibrance.checked || enhanceClarity.checked || enhanceDehaze.checked ||
                                enhanceDenoise.checked || enhanceSuperResolution.checked) {
                                await enhanceImage(canvas, {
                                    enhanceText: enhanceText.checked,
                                    optimizeColors: optimizeColors.checked,
                                    removeNoise: removeNoise.checked,
                                    sharpen: sharpen.checked,
                                    adjustContrast: adjustContrast.checked,
                                    enhanceDetails: enhanceDetails.checked,
                                    autoLevels: autoLevels.checked,
                                    despeckle: despeckle.checked,
                                    enhanceShadows: enhanceShadows.checked,
                                    enhanceHighlights: enhanceHighlights.checked,
                                    reduceMoire: reduceMoire.checked,
                                    enhanceEdges: enhanceEdges.checked,
                                    enhanceFineDetails: enhanceFineDetails.checked,
                                    enhanceMidtones: enhanceMidtones.checked,
                                    enhanceSaturation: enhanceSaturation.checked,
                                    enhanceVibrance: enhanceVibrance.checked,
                                    enhanceClarity: enhanceClarity.checked,
                                    enhanceDehaze: enhanceDehaze.checked,
                                    enhanceDenoise: enhanceDenoise.checked,
                                    enhanceSuperResolution: enhanceSuperResolution.checked
                                });
                            }
                            
                            // Convert canvas to TIFF
                            const tiffBlob = await canvasToTIFF(canvas, {
                                compression: compression,
                                colorDepth: colorDepth
                            });
                            
                            // Add TIFF to zip
                            folder.file(`page-${pageNum}.tiff`, tiffBlob);
                        } catch (error) {
                            console.error(`Error processing page ${pageNum} of ${file.name}:`, error);
                            showError(`Error processing page ${pageNum} of ${file.name}. The page will be skipped.`);
                        }
                    }
                    
                    processedFiles++;
                } catch (error) {
                    console.error(`Error processing file ${file.name}:`, error);
                    showError(`Error processing file ${file.name}. The file will be skipped.`);
                    processedFiles++;
                }
            }
            
            // Update progress
            progressStatus.textContent = 'Generating ZIP file...';
            
            // Generate and download the zip file
            const zipBlob = await zip.generateAsync({ 
                type: 'blob',
                compression: 'DEFLATE',
                compressionOptions: {
                    level: 9
                }
            });
            
            const downloadLink = document.createElement('a');
            downloadLink.href = URL.createObjectURL(zipBlob);
            downloadLink.download = `${outputFilename.value || 'converted-pages'}.zip`;
            downloadLink.click();
            
            // Update progress
            progressBar.style.width = '100%';
            progressStatus.textContent = 'Conversion completed successfully!';
            
        } catch (error) {
            console.error('Error converting PDFs to TIFF:', error);
            showError('An error occurred while converting the PDFs to TIFF. Please try again.');
        } finally {
            loadingSpinner.style.display = 'none';
            convertBtn.disabled = false;
            setTimeout(() => {
                progressContainer.style.display = 'none';
            }, 3000);
        }
    });
}

// Helper function to enhance image
async function enhanceImage(canvas, options) {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Create a copy of the original data for some operations
    const originalData = new Uint8ClampedArray(data);
    
    if (options.enhanceText) {
        // Enhance text by increasing contrast around text areas
        for (let i = 0; i < data.length; i += 4) {
            const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
            if (avg < 128) {
                data[i] = data[i + 1] = data[i + 2] = Math.max(0, avg - 20);
            } else {
                data[i] = data[i + 1] = data[i + 2] = Math.min(255, avg + 20);
            }
        }
    }
    
    if (options.optimizeColors) {
        // Optimize colors by adjusting saturation
        for (let i = 0; i < data.length; i += 4) {
            const max = Math.max(data[i], data[i + 1], data[i + 2]);
            const min = Math.min(data[i], data[i + 1], data[i + 2]);
            const delta = max - min;
            if (delta > 0) {
                const factor = 1.2;
                data[i] = Math.min(255, data[i] * factor);
                data[i + 1] = Math.min(255, data[i + 1] * factor);
                data[i + 2] = Math.min(255, data[i + 2] * factor);
            }
        }
    }
    
    if (options.removeNoise) {
        // Simple noise reduction using a 3x3 median filter
        const tempData = new Uint8ClampedArray(data);
        for (let y = 1; y < canvas.height - 1; y++) {
            for (let x = 1; x < canvas.width - 1; x++) {
                const i = (y * canvas.width + x) * 4;
                const values = [];
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        const j = ((y + dy) * canvas.width + (x + dx)) * 4;
                        values.push(tempData[j]);
                    }
                }
                values.sort((a, b) => a - b);
                data[i] = data[i + 1] = data[i + 2] = values[4]; // Median value
            }
        }
    }
    
    if (options.sharpen) {
        // Simple sharpening using a 3x3 kernel
        const tempData = new Uint8ClampedArray(data);
        const kernel = [
            [0, -1, 0],
            [-1, 5, -1],
            [0, -1, 0]
        ];
        for (let y = 1; y < canvas.height - 1; y++) {
            for (let x = 1; x < canvas.width - 1; x++) {
                const i = (y * canvas.width + x) * 4;
                let sum = 0;
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        const j = ((y + dy) * canvas.width + (x + dx)) * 4;
                        sum += tempData[j] * kernel[dy + 1][dx + 1];
                    }
                }
                data[i] = data[i + 1] = data[i + 2] = Math.max(0, Math.min(255, sum));
            }
        }
    }
    
    if (options.adjustContrast) {
        // Adjust contrast using a simple linear transformation
        const factor = 1.2;
        const offset = 128 * (1 - factor);
        for (let i = 0; i < data.length; i += 4) {
            data[i] = Math.max(0, Math.min(255, data[i] * factor + offset));
            data[i + 1] = Math.max(0, Math.min(255, data[i + 1] * factor + offset));
            data[i + 2] = Math.max(0, Math.min(255, data[i + 2] * factor + offset));
        }
    }

    if (options.enhanceDetails) {
        // Enhance details using unsharp masking
        const tempData = new Uint8ClampedArray(data);
        const blurKernel = [
            [1/9, 1/9, 1/9],
            [1/9, 1/9, 1/9],
            [1/9, 1/9, 1/9]
        ];
        const amount = 1.5;
        
        // Apply blur
        for (let y = 1; y < canvas.height - 1; y++) {
            for (let x = 1; x < canvas.width - 1; x++) {
                const i = (y * canvas.width + x) * 4;
                let sum = 0;
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        const j = ((y + dy) * canvas.width + (x + dx)) * 4;
                        sum += tempData[j] * blurKernel[dy + 1][dx + 1];
                    }
                }
                // Unsharp masking
                data[i] = data[i + 1] = data[i + 2] = Math.max(0, Math.min(255, 
                    tempData[i] + amount * (tempData[i] - sum)));
            }
        }
    }

    if (options.autoLevels) {
        // Auto levels adjustment
        let min = 255, max = 0;
        for (let i = 0; i < data.length; i += 4) {
            const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
            min = Math.min(min, avg);
            max = Math.max(max, avg);
        }
        
        const range = max - min;
        if (range > 0) {
            for (let i = 0; i < data.length; i += 4) {
                const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
                const newValue = ((avg - min) / range) * 255;
                data[i] = data[i + 1] = data[i + 2] = newValue;
            }
        }
    }

    if (options.despeckle) {
        // Despeckle using a 5x5 median filter
        const tempData = new Uint8ClampedArray(data);
        for (let y = 2; y < canvas.height - 2; y++) {
            for (let x = 2; x < canvas.width - 2; x++) {
                const i = (y * canvas.width + x) * 4;
                const values = [];
                for (let dy = -2; dy <= 2; dy++) {
                    for (let dx = -2; dx <= 2; dx++) {
                        const j = ((y + dy) * canvas.width + (x + dx)) * 4;
                        values.push(tempData[j]);
                    }
                }
                values.sort((a, b) => a - b);
                data[i] = data[i + 1] = data[i + 2] = values[12]; // Median value
            }
        }
    }

    if (options.enhanceShadows) {
        // Enhance shadows using a gamma correction
        const gamma = 0.8;
        for (let i = 0; i < data.length; i += 4) {
            const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
            if (avg < 128) {
                const newValue = Math.pow(avg / 255, gamma) * 255;
                data[i] = data[i + 1] = data[i + 2] = newValue;
            }
        }
    }

    if (options.enhanceHighlights) {
        // Enhance highlights using a gamma correction
        const gamma = 1.2;
        for (let i = 0; i < data.length; i += 4) {
            const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
            if (avg > 128) {
                const newValue = Math.pow(avg / 255, gamma) * 255;
                data[i] = data[i + 1] = data[i + 2] = newValue;
            }
        }
    }

    if (options.reduceMoire) {
        // Reduce moiré pattern using a low-pass filter
        const tempData = new Uint8ClampedArray(data);
        const kernel = [
            [1/16, 1/8, 1/16],
            [1/8, 1/4, 1/8],
            [1/16, 1/8, 1/16]
        ];
        for (let y = 1; y < canvas.height - 1; y++) {
            for (let x = 1; x < canvas.width - 1; x++) {
                const i = (y * canvas.width + x) * 4;
                let sum = 0;
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        const j = ((y + dy) * canvas.width + (x + dx)) * 4;
                        sum += tempData[j] * kernel[dy + 1][dx + 1];
                    }
                }
                data[i] = data[i + 1] = data[i + 2] = Math.max(0, Math.min(255, sum));
            }
        }
    }

    if (options.enhanceEdges) {
        // Enhance edges using Sobel operator
        const tempData = new Uint8ClampedArray(data);
        const sobelX = [
            [-1, 0, 1],
            [-2, 0, 2],
            [-1, 0, 1]
        ];
        const sobelY = [
            [-1, -2, -1],
            [0, 0, 0],
            [1, 2, 1]
        ];
        
        for (let y = 1; y < canvas.height - 1; y++) {
            for (let x = 1; x < canvas.width - 1; x++) {
                const i = (y * canvas.width + x) * 4;
                let gx = 0, gy = 0;
                
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        const j = ((y + dy) * canvas.width + (x + dx)) * 4;
                        const gray = (tempData[j] + tempData[j + 1] + tempData[j + 2]) / 3;
                        gx += gray * sobelX[dy + 1][dx + 1];
                        gy += gray * sobelY[dy + 1][dx + 1];
                    }
                }
                
                const magnitude = Math.sqrt(gx * gx + gy * gy);
                const edgeValue = Math.min(255, magnitude * 2);
                data[i] = data[i + 1] = data[i + 2] = edgeValue;
            }
        }
    }

    if (options.enhanceFineDetails) {
        // Enhance fine details using high-pass filter
        const tempData = new Uint8ClampedArray(data);
        const kernel = [
            [-1, -1, -1],
            [-1, 9, -1],
            [-1, -1, -1]
        ];
        
        for (let y = 1; y < canvas.height - 1; y++) {
            for (let x = 1; x < canvas.width - 1; x++) {
                const i = (y * canvas.width + x) * 4;
                let sum = 0;
                
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        const j = ((y + dy) * canvas.width + (x + dx)) * 4;
                        const gray = (tempData[j] + tempData[j + 1] + tempData[j + 2]) / 3;
                        sum += gray * kernel[dy + 1][dx + 1];
                    }
                }
                
                const detailValue = Math.max(0, Math.min(255, sum));
                data[i] = data[i + 1] = data[i + 2] = detailValue;
            }
        }
    }

    if (options.enhanceMidtones) {
        // Enhance midtones using S-curve
        for (let i = 0; i < data.length; i += 4) {
            const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
            if (avg > 64 && avg < 192) {
                const factor = 1.2;
                data[i] = Math.min(255, data[i] * factor);
                data[i + 1] = Math.min(255, data[i + 1] * factor);
                data[i + 2] = Math.min(255, data[i + 2] * factor);
            }
        }
    }

    if (options.enhanceSaturation) {
        // Enhance saturation using HSL conversion
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i] / 255;
            const g = data[i + 1] / 255;
            const b = data[i + 2] / 255;
            
            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            const delta = max - min;
            
            if (delta > 0) {
                const factor = 1.3;
                const avg = (max + min) / 2;
                const newDelta = delta * factor;
                
                if (max === r) {
                    data[i] = Math.min(255, (avg + newDelta) * 255);
                    data[i + 1] = Math.min(255, (avg - newDelta) * 255);
                    data[i + 2] = Math.min(255, (avg - newDelta) * 255);
                } else if (max === g) {
                    data[i] = Math.min(255, (avg - newDelta) * 255);
                    data[i + 1] = Math.min(255, (avg + newDelta) * 255);
                    data[i + 2] = Math.min(255, (avg - newDelta) * 255);
                } else {
                    data[i] = Math.min(255, (avg - newDelta) * 255);
                    data[i + 1] = Math.min(255, (avg - newDelta) * 255);
                    data[i + 2] = Math.min(255, (avg + newDelta) * 255);
                }
            }
        }
    }

    if (options.enhanceVibrance) {
        // Enhance vibrance (smarter saturation)
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i] / 255;
            const g = data[i + 1] / 255;
            const b = data[i + 2] / 255;
            
            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            const delta = max - min;
            
            if (delta > 0) {
                const factor = 1.2;
                const avg = (max + min) / 2;
                const newDelta = delta * factor;
                
                // Only enhance less saturated colors
                if (delta < 0.5) {
                    if (max === r) {
                        data[i] = Math.min(255, (avg + newDelta) * 255);
                        data[i + 1] = Math.min(255, (avg - newDelta) * 255);
                        data[i + 2] = Math.min(255, (avg - newDelta) * 255);
                    } else if (max === g) {
                        data[i] = Math.min(255, (avg - newDelta) * 255);
                        data[i + 1] = Math.min(255, (avg + newDelta) * 255);
                        data[i + 2] = Math.min(255, (avg - newDelta) * 255);
                    } else {
                        data[i] = Math.min(255, (avg - newDelta) * 255);
                        data[i + 1] = Math.min(255, (avg - newDelta) * 255);
                        data[i + 2] = Math.min(255, (avg + newDelta) * 255);
                    }
                }
            }
        }
    }

    if (options.enhanceClarity) {
        // Enhance clarity using local contrast
        const tempData = new Uint8ClampedArray(data);
        const radius = 2;
        const amount = 0.5;
        
        for (let y = radius; y < canvas.height - radius; y++) {
            for (let x = radius; x < canvas.width - radius; x++) {
                const i = (y * canvas.width + x) * 4;
                let sum = 0;
                let count = 0;
                
                for (let dy = -radius; dy <= radius; dy++) {
                    for (let dx = -radius; dx <= radius; dx++) {
                        const j = ((y + dy) * canvas.width + (x + dx)) * 4;
                        const gray = (tempData[j] + tempData[j + 1] + tempData[j + 2]) / 3;
                        sum += gray;
                        count++;
                    }
                }
                
                const avg = sum / count;
                const gray = (tempData[i] + tempData[i + 1] + tempData[i + 2]) / 3;
                const diff = gray - avg;
                const newValue = gray + diff * amount;
                
                data[i] = data[i + 1] = data[i + 2] = Math.max(0, Math.min(255, newValue));
            }
        }
    }

    if (options.enhanceDehaze) {
        // Dehaze using dark channel prior
        const tempData = new Uint8ClampedArray(data);
        const radius = 7;
        const amount = 0.8;
        
        for (let y = radius; y < canvas.height - radius; y++) {
            for (let x = radius; x < canvas.width - radius; x++) {
                const i = (y * canvas.width + x) * 4;
                let min = 255;
                
                for (let dy = -radius; dy <= radius; dy++) {
                    for (let dx = -radius; dx <= radius; dx++) {
                        const j = ((y + dy) * canvas.width + (x + dx)) * 4;
                        const gray = (tempData[j] + tempData[j + 1] + tempData[j + 2]) / 3;
                        min = Math.min(min, gray);
                    }
                }
                
                const transmission = 1 - amount * (min / 255);
                const newValue = (tempData[i] - min) / transmission + min;
                data[i] = data[i + 1] = data[i + 2] = Math.max(0, Math.min(255, newValue));
            }
        }
    }

    if (options.enhanceDenoise) {
        // Advanced denoise using bilateral filter
        const tempData = new Uint8ClampedArray(data);
        const radius = 2;
        const sigmaSpace = 3;
        const sigmaColor = 10;
        
        for (let y = radius; y < canvas.height - radius; y++) {
            for (let x = radius; x < canvas.width - radius; x++) {
                const i = (y * canvas.width + x) * 4;
                let sum = 0;
                let weightSum = 0;
                
                for (let dy = -radius; dy <= radius; dy++) {
                    for (let dx = -radius; dx <= radius; dx++) {
                        const j = ((y + dy) * canvas.width + (x + dx)) * 4;
                        const gray = (tempData[j] + tempData[j + 1] + tempData[j + 2]) / 3;
                        const centerGray = (tempData[i] + tempData[i + 1] + tempData[i + 2]) / 3;
                        
                        const spaceWeight = Math.exp(-(dx * dx + dy * dy) / (2 * sigmaSpace * sigmaSpace));
                        const colorWeight = Math.exp(-Math.pow(gray - centerGray, 2) / (2 * sigmaColor * sigmaColor));
                        const weight = spaceWeight * colorWeight;
                        
                        sum += gray * weight;
                        weightSum += weight;
                    }
                }
                
                const newValue = sum / weightSum;
                data[i] = data[i + 1] = data[i + 2] = Math.max(0, Math.min(255, newValue));
            }
        }
    }

    if (options.enhanceSuperResolution) {
        // Simple super resolution using bicubic interpolation
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = canvas.width * 2;
        tempCanvas.height = canvas.height * 2;
        
        // Draw original image
        tempCtx.drawImage(canvas, 0, 0, tempCanvas.width, tempCanvas.height);
        
        // Get new image data
        const newImageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        const newData = newImageData.data;
        
        // Apply bicubic interpolation
        for (let y = 0; y < tempCanvas.height; y++) {
            for (let x = 0; x < tempCanvas.width; x++) {
                const i = (y * tempCanvas.width + x) * 4;
                const srcX = x / 2;
                const srcY = y / 2;
                
                // Get 16 surrounding pixels
                const pixels = [];
                for (let dy = -1; dy <= 2; dy++) {
                    for (let dx = -1; dx <= 2; dx++) {
                        const srcI = ((Math.floor(srcY) + dy) * canvas.width + (Math.floor(srcX) + dx)) * 4;
                        if (srcI >= 0 && srcI < data.length) {
                            pixels.push((data[srcI] + data[srcI + 1] + data[srcI + 2]) / 3);
                        }
                    }
                }
                
                // Apply bicubic interpolation
                const tx = srcX - Math.floor(srcX);
                const ty = srcY - Math.floor(srcY);
                const newValue = bicubicInterpolate(pixels, tx, ty);
                
                newData[i] = newData[i + 1] = newData[i + 2] = Math.max(0, Math.min(255, newValue));
            }
        }
        
        // Update canvas size and draw new image
        canvas.width = tempCanvas.width;
        canvas.height = tempCanvas.height;
        ctx.putImageData(newImageData, 0, 0);
    }
    
    ctx.putImageData(imageData, 0, 0);
}

// Helper function for bicubic interpolation
function bicubicInterpolate(pixels, x, y) {
    const p = [];
    for (let i = 0; i < 4; i++) {
        p[i] = [];
        for (let j = 0; j < 4; j++) {
            p[i][j] = pixels[i * 4 + j] || 0;
        }
    }
    
    const a0 = p[1][1];
    const a1 = p[1][2] - p[1][1];
    const a2 = p[1][1] - p[1][0];
    const a3 = p[1][2] - p[1][1];
    const a4 = p[2][1] - p[1][1];
    const a5 = p[2][2] - p[2][1] - p[1][2] + p[1][1];
    const a6 = p[2][1] - p[2][0] - p[1][1] + p[1][0];
    const a7 = p[2][2] - p[2][1] - p[1][2] + p[1][1];
    
    return a0 + a1 * x + a2 * y + a3 * x * y + a4 * x * x + a5 * x * x * y + a6 * x * y * y + a7 * x * x * y * y;
}

// Helper function to convert canvas to TIFF
async function canvasToTIFF(canvas, options) {
    // Create a temporary canvas for color depth conversion
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    
    // Apply color depth conversion
    if (options.colorDepth === 1) {
        // Convert to black and white
        tempCtx.drawImage(canvas, 0, 0);
        const imageData = tempCtx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
            const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
            const bw = avg > 128 ? 255 : 0;
            data[i] = data[i + 1] = data[i + 2] = bw;
        }
        tempCtx.putImageData(imageData, 0, 0);
    } else if (options.colorDepth === 8) {
        // Convert to grayscale
        tempCtx.drawImage(canvas, 0, 0);
        const imageData = tempCtx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
            const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
            data[i] = data[i + 1] = data[i + 2] = avg;
        }
        tempCtx.putImageData(imageData, 0, 0);
    } else {
        // Keep original color (24-bit)
        tempCtx.drawImage(canvas, 0, 0);
    }
    
    // Convert canvas to blob
    return new Promise((resolve) => {
        tempCanvas.toBlob((blob) => {
            resolve(blob);
        }, 'image/tiff', 1.0);
    });
} 