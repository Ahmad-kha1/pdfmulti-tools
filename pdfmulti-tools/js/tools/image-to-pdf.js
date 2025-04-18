// DOM Elements
const imageInput = document.getElementById('imageInput');
const uploadArea = document.querySelector('.upload-area');
const imagePreviewSection = document.getElementById('imagePreviewSection');
const imagePreviewContainer = document.getElementById('imagePreviewContainer');
const convertBtn = document.getElementById('convertBtn');
const progressBar = document.getElementById('progressBar');
const progressBarInner = progressBar.querySelector('.progress-bar');
const statusText = document.getElementById('statusText');

// Global variables
let selectedFiles = [];
const MAX_WORKERS = Math.min(navigator.hardwareConcurrency || 2, 4);
let workerPool = [];

// Initialize workers
function initWorkers() {
    for (let i = 0; i < MAX_WORKERS; i++) {
        const worker = new Worker('../../js/workers/image-worker.js');
        worker.busy = false;
        worker.onmessage = handleWorkerMessage;
        workerPool.push(worker);
    }
}

// Get available worker
function getAvailableWorker() {
    for (let worker of workerPool) {
        if (!worker.busy) {
            worker.busy = true;
            return worker;
        }
    }
    return null;
}

// Handle worker messages
function handleWorkerMessage(e) {
    const data = e.data;
    
    if (data.type === 'progress') {
        updateProgress(data.progress, data.message);
    } 
    else if (data.type === 'complete') {
        // Create download link
        const blob = new Blob([data.pdfBuffer], { type: 'application/pdf' });
        downloadFile(blob, 'converted_images.pdf');
        
        // Mark worker as available
        this.busy = false;
        
        // Complete
        updateProgress(100, 'Conversion complete!');
        setTimeout(() => {
            document.getElementById('progressContainer').classList.add('d-none');
            document.getElementById('convertBtn').disabled = false;
        }, 1000);
    } 
    else if (data.error) {
        // Handle error
        showError(data.error);
        this.busy = false;
        document.getElementById('convertBtn').disabled = false;
    }
}

// Update progress
function updateProgress(progress, message) {
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    
    if (progressBar && progressText) {
        progressBar.style.width = `${progress}%`;
        progressBar.setAttribute('aria-valuenow', progress);
        progressText.textContent = message || `${Math.round(progress)}%`;
    }
}

// Show error
function showError(message) {
    const errorContainer = document.getElementById('errorContainer');
    if (errorContainer) {
        errorContainer.textContent = message;
        errorContainer.classList.remove('d-none');
        setTimeout(() => {
            errorContainer.classList.add('d-none');
        }, 5000);
    }
    
    updateProgress(0, 'Conversion failed');
    setTimeout(() => {
        document.getElementById('progressContainer').classList.add('d-none');
    }, 2000);
}

// Download file
function downloadFile(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);
}

// Handle files
function handleFiles(files) {
    // Filter only image files
    const validImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    selectedFiles = Array.from(files).filter(file => validImageTypes.includes(file.type));
    
    if (selectedFiles.length === 0) {
        showError('Please select valid image files (JPEG, PNG, WebP, or GIF)');
        return;
    }
    
    // Update file counter
    const fileCounter = document.getElementById('fileCounter');
    if (fileCounter) {
        fileCounter.textContent = `${selectedFiles.length} file(s) selected`;
    }
    
    // Show preview container
    const previewContainer = document.getElementById('imagePreview');
    if (previewContainer) {
        previewContainer.innerHTML = '';
        previewContainer.classList.remove('d-none');
        
        // Process in batches to prevent UI lag
        const processPreviewBatch = (startIndex, batchSize) => {
            const endIndex = Math.min(startIndex + batchSize, selectedFiles.length);
            
            for (let i = startIndex; i < endIndex; i++) {
                const file = selectedFiles[i];
                const reader = new FileReader();
                
                reader.onload = function(e) {
                    const img = document.createElement('img');
                    img.src = e.target.result;
                    img.className = 'img-thumbnail m-1';
                    img.style.maxHeight = '100px';
                    img.style.maxWidth = '100px';
                    previewContainer.appendChild(img);
                };
                
                reader.readAsDataURL(file);
            }
            
            // Process next batch if needed
            if (endIndex < selectedFiles.length) {
                setTimeout(() => {
                    processPreviewBatch(endIndex, batchSize);
                }, 0);
            }
        };
        
        // Start processing previews in batches of 20
        processPreviewBatch(0, 20);
    }
    
    // Enable conversion button
    document.getElementById('convertBtn').disabled = false;
}

// Initialize event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Init workers
    initWorkers();
    
    // File input change
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.addEventListener('change', function(e) {
            handleFiles(e.target.files);
        });
    }
    
    // Convert button click
    const convertBtn = document.getElementById('convertBtn');
    if (convertBtn) {
        convertBtn.addEventListener('click', async function() {
            if (selectedFiles.length === 0) {
                showError('Please select at least one image file');
                return;
            }
            
            // Get options
            const pageSize = document.getElementById('pageSize').value;
            const pageOrientation = document.getElementById('pageOrientation').value;
            const imageQuality = document.getElementById('imageQuality').value;
            const margin = parseInt(document.getElementById('margin').value) || 10;
            
            // Get available worker
            const worker = getAvailableWorker();
            if (!worker) {
                showError('All workers are busy. Please try again in a moment.');
                return;
            }
            
            // Show progress
            document.getElementById('progressContainer').classList.remove('d-none');
            document.getElementById('convertBtn').disabled = true;
            document.getElementById('errorContainer').classList.add('d-none');
            updateProgress(5, 'Reading image files...');
            
            // Prepare images for processing
            const processedImages = [];
            for (let i = 0; i < selectedFiles.length; i++) {
                const file = selectedFiles[i];
                const progress = 5 + (i / selectedFiles.length) * 5;
                updateProgress(progress, `Preparing image ${i + 1} of ${selectedFiles.length}...`);
                
                try {
                    const arrayBuffer = await file.arrayBuffer();
                    processedImages.push({
                        name: file.name,
                        type: file.type,
                        data: new Uint8Array(arrayBuffer)
                    });
                } catch (error) {
                    showError(`Error processing ${file.name}: ${error.message}`);
                    worker.busy = false;
                    document.getElementById('convertBtn').disabled = false;
                    return;
                }
            }
            
            // Send to worker
            updateProgress(10, 'Starting conversion...');
            worker.postMessage({
                action: 'convertImagesToPDF',
                images: processedImages,
                options: {
                    pageSize,
                    pageOrientation,
                    imageQuality,
                    margin
                }
            });
        });
    }
    
    // Drag and drop
    const dropArea = document.getElementById('dropArea');
    if (dropArea) {
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
        
        function highlight() {
            dropArea.classList.add('border-primary');
        }
        
        function unhighlight() {
            dropArea.classList.remove('border-primary');
        }
        
        dropArea.addEventListener('drop', function(e) {
            const dt = e.dataTransfer;
            const files = dt.files;
            handleFiles(files);
        }, false);
    }
}); 