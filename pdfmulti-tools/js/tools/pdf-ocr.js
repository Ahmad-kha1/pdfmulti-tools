// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.11.338/pdf.worker.min.js';

// Initialize Tesseract worker
const worker = Tesseract.createWorker();

// Global variables
let currentPDF = null;
let currentPage = 1;
let totalPages = 1;
let isProcessing = false;

// DOM Elements
const dropArea = document.getElementById('drop-area');
const fileInput = document.getElementById('file-input');
const ocrOptions = document.getElementById('ocr-options');
const previewSection = document.getElementById('preview-section');
const processBtn = document.getElementById('process-btn');
const loadingSpinner = document.getElementById('loading-spinner');
const estimatedTime = document.getElementById('estimated-time');

// Preview elements
const prevPageBtn = document.getElementById('prev-page');
const nextPageBtn = document.getElementById('next-page');
const currentPageSpan = document.getElementById('current-page');
const totalPagesSpan = document.getElementById('total-pages');
const originalPreview = document.getElementById('original-preview');
const processedPreview = document.getElementById('processed-preview');
const extractedText = document.getElementById('extracted-text');

// Initialize Tesseract worker
async function initializeWorker() {
    await worker.load();
    await worker.loadLanguage('eng');
    await worker.initialize('eng');
}

// Initialize the worker when the page loads
initializeWorker();

// Drag and drop handlers
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

['dragenter', 'dragover'].forEach(eventName => {
    dropArea.addEventListener(eventName, highlight, false);
});

['dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, unhighlight, false);
});

function highlight(e) {
    dropArea.classList.add('highlight');
}

function unhighlight(e) {
    dropArea.classList.remove('highlight');
}

// Handle file selection
dropArea.addEventListener('drop', handleDrop, false);
fileInput.addEventListener('change', handleFileSelect, false);

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    handleFiles(files);
}

function handleFileSelect(e) {
    const files = e.target.files;
    handleFiles(files);
}

async function handleFiles(files) {
    if (files.length === 0) return;
    
    const file = files[0];
    if (file.type !== 'application/pdf') {
        showError('Please select a PDF file.');
        return;
    }

    try {
        // Load the PDF
        const arrayBuffer = await file.arrayBuffer();
        currentPDF = await pdfjsLib.getDocument(arrayBuffer).promise;
        totalPages = currentPDF.numPages;
        
        // Update UI
        totalPagesSpan.textContent = totalPages;
        currentPage = 1;
        currentPageSpan.textContent = currentPage;
        
        // Show options and preview
        ocrOptions.classList.remove('d-none');
        previewSection.classList.remove('d-none');
        processBtn.disabled = false;
        
        // Generate preview for first page
        await generatePreview();
        
        // Update estimated processing time
        updateEstimatedTime();
    } catch (error) {
        showError('Error loading PDF: ' + error.message);
    }
}

// Generate preview for current page
async function generatePreview() {
    try {
        const page = await currentPDF.getPage(currentPage);
        const viewport = page.getViewport({ scale: 1.5 });
        
        // Setup canvas for original preview
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        // Render PDF page to canvas
        await page.render({
            canvasContext: context,
            viewport: viewport
        }).promise;
        
        // Display original preview
        originalPreview.innerHTML = '';
        originalPreview.appendChild(canvas);
        
        // If preview is enabled, perform OCR on the current page
        if (document.getElementById('show-preview').checked) {
            await performOCR(canvas);
        }
        
        // Update navigation buttons
        prevPageBtn.disabled = currentPage === 1;
        nextPageBtn.disabled = currentPage === totalPages;
    } catch (error) {
        showError('Error generating preview: ' + error.message);
    }
}

// Perform OCR on a canvas
async function performOCR(canvas) {
    try {
        // Show processing indicator
        processedPreview.innerHTML = '<div class="text-center"><i class="fas fa-spinner fa-spin"></i> Processing...</div>';
        extractedText.innerHTML = '<p class="text-muted">Processing...</p>';
        
        // Get selected language
        const language = document.getElementById('ocr-language').value;
        await worker.loadLanguage(language);
        await worker.initialize(language);
        
        // Set recognition mode
        const mode = document.getElementById('ocr-mode').value;
        await worker.setParameters({
            tessedit_ocr_engine_mode: mode === 'fast' ? 2 : 1
        });
        
        // Perform OCR
        const result = await worker.recognize(canvas);
        
        // Display processed image
        const processedImage = new Image();
        processedImage.src = result.data.hocr; // Get processed image from hOCR
        processedPreview.innerHTML = '';
        processedPreview.appendChild(processedImage);
        
        // Display extracted text
        extractedText.innerHTML = `<pre>${result.data.text}</pre>`;
    } catch (error) {
        showError('Error performing OCR: ' + error.message);
    }
}

// Process entire PDF
async function processPDF() {
    if (!currentPDF || isProcessing) return;
    
    isProcessing = true;
    processBtn.disabled = true;
    loadingSpinner.style.display = 'block';
    
    try {
        const startPage = document.getElementById('all-pages').checked ? 1 : parseInt(document.getElementById('start-page').value);
        const endPage = document.getElementById('all-pages').checked ? totalPages : parseInt(document.getElementById('end-page').value);
        
        // Get selected options
        const options = {
            language: document.getElementById('ocr-language').value,
            mode: document.getElementById('ocr-mode').value,
            format: document.getElementById('output-format').value,
            deskew: document.getElementById('deskew').checked,
            enhanceText: document.getElementById('enhance-text').checked,
            removeNoise: document.getElementById('remove-noise').checked,
            detectOrientation: document.getElementById('detect-orientation').checked,
            preserveLayout: document.getElementById('preserve-layout').checked,
            enhanceContrast: document.getElementById('enhance-contrast').checked,
            removeShadows: document.getElementById('remove-shadows').checked,
            enhanceEdges: document.getElementById('enhance-edges').checked,
            removeMoire: document.getElementById('remove-moire').checked,
            enhanceFineDetails: document.getElementById('enhance-fine-details').checked,
            autoLevels: document.getElementById('auto-levels').checked,
            enhanceMidtones: document.getElementById('enhance-midtones').checked,
            enhanceSaturation: document.getElementById('enhance-saturation').checked,
            enhanceVibrance: document.getElementById('enhance-vibrance').checked,
            enhanceClarity: document.getElementById('enhance-clarity').checked,
            dehaze: document.getElementById('dehaze').checked,
            advancedDenoise: document.getElementById('advanced-denoise').checked,
            superResolution: document.getElementById('super-resolution').checked
        };
        
        // Process each page
        const results = [];
        for (let i = startPage; i <= endPage; i++) {
            // Update progress
            updateProgress(i - startPage + 1, endPage - startPage + 1);
            
            // Get page and convert to image
            const page = await currentPDF.getPage(i);
            const viewport = page.getViewport({ scale: 1.5 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            
            await page.render({
                canvasContext: context,
                viewport: viewport
            }).promise;
            
            // Perform OCR with selected options
            const result = await processPage(canvas, options);
            results.push(result);
        }
        
        // Generate output based on selected format
        await generateOutput(results, options.format);
        
        showSuccess('PDF processing completed successfully!');
    } catch (error) {
        showError('Error processing PDF: ' + error.message);
    } finally {
        isProcessing = false;
        processBtn.disabled = false;
        loadingSpinner.style.display = 'none';
    }
}

// Process a single page with options
async function processPage(canvas, options) {
    // Load selected language
    await worker.loadLanguage(options.language);
    await worker.initialize(options.language);
    
    // Apply image enhancements
    if (options.enhanceContrast || options.removeShadows || options.enhanceEdges || 
        options.removeMoire || options.enhanceFineDetails || options.autoLevels ||
        options.enhanceMidtones || options.enhanceSaturation || options.enhanceVibrance ||
        options.enhanceClarity || options.dehaze || options.advancedDenoise ||
        options.superResolution) {
        canvas = await enhanceImage(canvas, options);
    }
    
    // Set recognition parameters
    const params = {
        tessedit_ocr_engine_mode: options.mode === 'fast' ? 2 : 1,
        tessedit_pageseg_mode: options.preserveLayout ? 1 : 3,
        tessedit_do_invert: 0,
        tessedit_deskew_enable: options.deskew ? 1 : 0
    };
    
    await worker.setParameters(params);
    
    // Perform OCR
    return await worker.recognize(canvas);
}

// Image enhancement function
async function enhanceImage(canvas, options) {
    const context = canvas.getContext('2d');
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Create a copy of the image data for processing
    const processedData = new Uint8ClampedArray(data);
    
    // Apply each selected enhancement
    if (options.enhanceContrast) {
        enhanceContrast(processedData);
    }
    if (options.removeShadows) {
        removeShadows(processedData);
    }
    if (options.enhanceEdges) {
        enhanceEdges(processedData, canvas.width, canvas.height);
    }
    if (options.removeMoire) {
        removeMoire(processedData, canvas.width, canvas.height);
    }
    if (options.enhanceFineDetails) {
        enhanceFineDetails(processedData, canvas.width, canvas.height);
    }
    if (options.autoLevels) {
        autoLevels(processedData);
    }
    if (options.enhanceMidtones) {
        enhanceMidtones(processedData);
    }
    if (options.enhanceSaturation) {
        enhanceSaturation(processedData);
    }
    if (options.enhanceVibrance) {
        enhanceVibrance(processedData);
    }
    if (options.enhanceClarity) {
        enhanceClarity(processedData, canvas.width, canvas.height);
    }
    if (options.dehaze) {
        dehaze(processedData, canvas.width, canvas.height);
    }
    if (options.advancedDenoise) {
        advancedDenoise(processedData, canvas.width, canvas.height);
    }
    if (options.superResolution) {
        processedData = await superResolution(processedData, canvas.width, canvas.height);
    }
    
    // Create new canvas with enhanced image
    const enhancedCanvas = document.createElement('canvas');
    enhancedCanvas.width = canvas.width;
    enhancedCanvas.height = canvas.height;
    const enhancedContext = enhancedCanvas.getContext('2d');
    const enhancedImageData = new ImageData(processedData, canvas.width, canvas.height);
    enhancedContext.putImageData(enhancedImageData, 0, 0);
    
    return enhancedCanvas;
}

// Enhancement functions
function enhanceContrast(data) {
    const factor = 1.2; // Contrast factor
    for (let i = 0; i < data.length; i += 4) {
        data[i] = (data[i] - 128) * factor + 128;
        data[i + 1] = (data[i + 1] - 128) * factor + 128;
        data[i + 2] = (data[i + 2] - 128) * factor + 128;
    }
}

function removeShadows(data) {
    for (let i = 0; i < data.length; i += 4) {
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        if (avg < 128) {
            const factor = 1 + (128 - avg) / 128;
            data[i] = Math.min(255, data[i] * factor);
            data[i + 1] = Math.min(255, data[i + 1] * factor);
            data[i + 2] = Math.min(255, data[i + 2] * factor);
        }
    }
}

function enhanceEdges(data, width, height) {
    const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
    const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
    
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const idx = (y * width + x) * 4;
            let gx = 0, gy = 0;
            
            for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                    const pixelIdx = ((y + ky) * width + (x + kx)) * 4;
                    const weight = data[pixelIdx];
                    gx += weight * sobelX[(ky + 1) * 3 + (kx + 1)];
                    gy += weight * sobelY[(ky + 1) * 3 + (kx + 1)];
                }
            }
            
            const magnitude = Math.sqrt(gx * gx + gy * gy);
            data[idx] = data[idx + 1] = data[idx + 2] = Math.min(255, magnitude);
        }
    }
}

function removeMoire(data, width, height) {
    const kernel = [1/9, 1/9, 1/9, 1/9, 1/9, 1/9, 1/9, 1/9, 1/9];
    const temp = new Uint8ClampedArray(data);
    
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const idx = (y * width + x) * 4;
            let sum = 0;
            
            for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                    const pixelIdx = ((y + ky) * width + (x + kx)) * 4;
                    sum += temp[pixelIdx] * kernel[(ky + 1) * 3 + (kx + 1)];
                }
            }
            
            data[idx] = data[idx + 1] = data[idx + 2] = Math.round(sum);
        }
    }
}

function enhanceFineDetails(data, width, height) {
    const unsharpMask = [0, -1, 0, -1, 5, -1, 0, -1, 0];
    
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const idx = (y * width + x) * 4;
            let sum = 0;
            
            for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                    const pixelIdx = ((y + ky) * width + (x + kx)) * 4;
                    sum += data[pixelIdx] * unsharpMask[(ky + 1) * 3 + (kx + 1)];
                }
            }
            
            data[idx] = data[idx + 1] = data[idx + 2] = Math.min(255, Math.max(0, sum));
        }
    }
}

function autoLevels(data) {
    let min = 255, max = 0;
    
    // Find min and max values
    for (let i = 0; i < data.length; i += 4) {
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        min = Math.min(min, avg);
        max = Math.max(max, avg);
    }
    
    // Apply auto levels
    const range = max - min;
    for (let i = 0; i < data.length; i += 4) {
        data[i] = ((data[i] - min) / range) * 255;
        data[i + 1] = ((data[i + 1] - min) / range) * 255;
        data[i + 2] = ((data[i + 2] - min) / range) * 255;
    }
}

function enhanceMidtones(data) {
    const gamma = 0.8; // Gamma correction factor
    for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.pow(data[i] / 255, gamma) * 255;
        data[i + 1] = Math.pow(data[i + 1] / 255, gamma) * 255;
        data[i + 2] = Math.pow(data[i + 2] / 255, gamma) * 255;
    }
}

function enhanceSaturation(data) {
    for (let i = 0; i < data.length; i += 4) {
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        data[i] = avg + (data[i] - avg) * 1.2;
        data[i + 1] = avg + (data[i + 1] - avg) * 1.2;
        data[i + 2] = avg + (data[i + 2] - avg) * 1.2;
    }
}

function enhanceVibrance(data) {
    for (let i = 0; i < data.length; i += 4) {
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        const saturation = Math.max(
            Math.abs(data[i] - avg),
            Math.abs(data[i + 1] - avg),
            Math.abs(data[i + 2] - avg)
        );
        
        if (saturation < 50) {
            data[i] = avg + (data[i] - avg) * 1.3;
            data[i + 1] = avg + (data[i + 1] - avg) * 1.3;
            data[i + 2] = avg + (data[i + 2] - avg) * 1.3;
        }
    }
}

function enhanceClarity(data, width, height) {
    const kernel = [-1, -1, -1, -1, 9, -1, -1, -1, -1];
    
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const idx = (y * width + x) * 4;
            let sum = 0;
            
            for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                    const pixelIdx = ((y + ky) * width + (x + kx)) * 4;
                    sum += data[pixelIdx] * kernel[(ky + 1) * 3 + (kx + 1)];
                }
            }
            
            data[idx] = data[idx + 1] = data[idx + 2] = Math.min(255, Math.max(0, sum));
        }
    }
}

function dehaze(data, width, height) {
    const darkChannel = new Uint8ClampedArray(width * height);
    
    // Calculate dark channel
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            darkChannel[y * width + x] = Math.min(
                data[idx],
                data[idx + 1],
                data[idx + 2]
            );
        }
    }
    
    // Apply dehazing
    const atmosphericLight = 220;
    const t0 = 0.1;
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const t = 1 - 0.95 * darkChannel[y * width + x] / atmosphericLight;
            const tMax = Math.max(t, t0);
            
            data[idx] = (data[idx] - atmosphericLight) / tMax + atmosphericLight;
            data[idx + 1] = (data[idx + 1] - atmosphericLight) / tMax + atmosphericLight;
            data[idx + 2] = (data[idx + 2] - atmosphericLight) / tMax + atmosphericLight;
        }
    }
}

function advancedDenoise(data, width, height) {
    const sigmaS = 3; // Spatial standard deviation
    const sigmaR = 0.1; // Range standard deviation
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            let sum = 0, weightSum = 0;
            
            for (let ky = -2; ky <= 2; ky++) {
                for (let kx = -2; kx <= 2; kx++) {
                    const nx = x + kx, ny = y + ky;
                    if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                        const nidx = (ny * width + nx) * 4;
                        const spatialWeight = Math.exp(-(kx * kx + ky * ky) / (2 * sigmaS * sigmaS));
                        const rangeWeight = Math.exp(-Math.abs(data[nidx] - data[idx]) / (2 * sigmaR * sigmaR));
                        const weight = spatialWeight * rangeWeight;
                        
                        sum += data[nidx] * weight;
                        weightSum += weight;
                    }
                }
            }
            
            data[idx] = data[idx + 1] = data[idx + 2] = sum / weightSum;
        }
    }
}

async function superResolution(data, width, height) {
    // Create a new canvas with double resolution
    const newWidth = width * 2;
    const newHeight = height * 2;
    const newData = new Uint8ClampedArray(newWidth * newHeight * 4);
    
    // Bicubic interpolation
    for (let y = 0; y < newHeight; y++) {
        for (let x = 0; x < newWidth; x++) {
            const oldX = x / 2;
            const oldY = y / 2;
            const x1 = Math.floor(oldX);
            const y1 = Math.floor(oldY);
            const x2 = Math.min(x1 + 1, width - 1);
            const y2 = Math.min(y1 + 1, height - 1);
            
            const dx = oldX - x1;
            const dy = oldY - y1;
            
            for (let c = 0; c < 3; c++) {
                const idx = (y * newWidth + x) * 4 + c;
                const p11 = data[(y1 * width + x1) * 4 + c];
                const p12 = data[(y1 * width + x2) * 4 + c];
                const p21 = data[(y2 * width + x1) * 4 + c];
                const p22 = data[(y2 * width + x2) * 4 + c];
                
                newData[idx] = Math.round(
                    p11 * (1 - dx) * (1 - dy) +
                    p12 * dx * (1 - dy) +
                    p21 * (1 - dx) * dy +
                    p22 * dx * dy
                );
            }
            newData[(y * newWidth + x) * 4 + 3] = 255; // Alpha channel
        }
    }
    
    return newData;
}

// Generate output file
async function generateOutput(results, format) {
    const blob = await createOutputFile(results, format);
    const url = URL.createObjectURL(blob);
    
    // Create download link
    const link = document.createElement('a');
    link.href = url;
    link.download = `ocr-result.${getFileExtension(format)}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// Create output file based on format
async function createOutputFile(results, format) {
    switch (format) {
        case 'text':
            const text = results.map(r => r.data.text).join('\n\n--- Page Break ---\n\n');
            return new Blob([text], { type: 'text/plain' });
            
        case 'word':
            // Create simple Word document
            const docx = `<html><body>${results.map(r => r.data.text.replace(/\n/g, '<br>')).join('<br><br>')}</body></html>`;
            return new Blob([docx], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
            
        case 'searchable-pdf':
            // Create searchable PDF (simplified version)
            const pdf = await PDFDocument.create();
            for (const result of results) {
                const page = await pdf.addPage();
                page.drawText(result.data.text);
            }
            const pdfBytes = await pdf.save();
            return new Blob([pdfBytes], { type: 'application/pdf' });
    }
}

// Helper functions
function getFileExtension(format) {
    switch (format) {
        case 'text': return 'txt';
        case 'word': return 'docx';
        case 'searchable-pdf': return 'pdf';
    }
}

function updateProgress(current, total) {
    const percent = Math.round((current / total) * 100);
    loadingSpinner.style.display = 'block';
    loadingSpinner.style.setProperty('--progress', `${percent}%`);
}

function updateEstimatedTime() {
    const pages = document.getElementById('all-pages').checked ? 
        totalPages : 
        parseInt(document.getElementById('end-page').value) - parseInt(document.getElementById('start-page').value) + 1;
    
    const mode = document.getElementById('ocr-mode').value;
    let timePerPage = mode === 'fast' ? 3 : 5;
    
    // Add time for each enhancement
    if (document.getElementById('enhance-contrast').checked) timePerPage += 0.5;
    if (document.getElementById('remove-shadows').checked) timePerPage += 0.5;
    if (document.getElementById('enhance-edges').checked) timePerPage += 1;
    if (document.getElementById('remove-moire').checked) timePerPage += 1;
    if (document.getElementById('enhance-fine-details').checked) timePerPage += 1;
    if (document.getElementById('auto-levels').checked) timePerPage += 0.5;
    if (document.getElementById('enhance-midtones').checked) timePerPage += 0.5;
    if (document.getElementById('enhance-saturation').checked) timePerPage += 0.5;
    if (document.getElementById('enhance-vibrance').checked) timePerPage += 0.5;
    if (document.getElementById('enhance-clarity').checked) timePerPage += 1;
    if (document.getElementById('dehaze').checked) timePerPage += 1;
    if (document.getElementById('advanced-denoise').checked) timePerPage += 2;
    if (document.getElementById('super-resolution').checked) timePerPage += 3;
    
    const totalTime = pages * timePerPage;
    estimatedTime.textContent = `${totalTime} seconds`;
}

function showError(message) {
    // Create and show error alert
    const alert = document.createElement('div');
    alert.className = 'alert alert-danger alert-dismissible fade show';
    alert.innerHTML = `
        <i class="fas fa-exclamation-circle me-2"></i>${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.querySelector('.tool-container').prepend(alert);
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        alert.remove();
    }, 5000);
}

function showSuccess(message) {
    // Create and show success alert
    const alert = document.createElement('div');
    alert.className = 'alert alert-success alert-dismissible fade show';
    alert.innerHTML = `
        <i class="fas fa-check-circle me-2"></i>${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.querySelector('.tool-container').prepend(alert);
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        alert.remove();
    }, 5000);
}

// Event listeners for navigation
prevPageBtn.addEventListener('click', async () => {
    if (currentPage > 1) {
        currentPage--;
        currentPageSpan.textContent = currentPage;
        await generatePreview();
    }
});

nextPageBtn.addEventListener('click', async () => {
    if (currentPage < totalPages) {
        currentPage++;
        currentPageSpan.textContent = currentPage;
        await generatePreview();
    }
});

// Event listener for process button
processBtn.addEventListener('click', processPDF);

// Event listeners for option changes
document.getElementById('ocr-mode').addEventListener('change', updateEstimatedTime);
document.getElementById('all-pages').addEventListener('change', updateEstimatedTime);
document.getElementById('custom-pages').addEventListener('change', () => {
    document.getElementById('page-range-input').classList.toggle('d-none');
    updateEstimatedTime();
});

// Event listener for preview toggle
document.getElementById('show-preview').addEventListener('change', async (e) => {
    if (e.target.checked && currentPDF) {
        await generatePreview();
    }
}); 