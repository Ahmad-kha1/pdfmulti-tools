// DOM Elements
const pdfInput = document.getElementById('pdfInput');
const uploadArea = document.querySelector('.upload-area');
const watermarkSettings = document.getElementById('watermarkSettings');
const watermarkType = document.getElementById('watermarkType');
const textSettings = document.getElementById('textSettings');
const imageSettings = document.getElementById('imageSettings');
const watermarkText = document.getElementById('watermarkText');
const watermarkImage = document.getElementById('watermarkImage');
const pageRange = document.getElementById('pageRange');
const customPageRange = document.getElementById('customPageRange');
const previewSection = document.getElementById('previewSection');
const previewCanvas = document.getElementById('previewCanvas');
const previewBtn = document.getElementById('previewBtn');
const applyBtn = document.getElementById('applyBtn');
const progressBar = document.getElementById('progressBar');
const progressBarInner = progressBar.querySelector('.progress-bar');
const statusText = document.getElementById('statusText');

// Global variables
let pdfFile = null;
let watermarkImageFile = null;
let pdfDoc = null;

// Initialize drag and drop
function initDragAndDrop() {
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        uploadArea.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, unhighlight, false);
    });

    uploadArea.addEventListener('drop', handleDrop, false);
}

// Utility functions
function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function highlight(e) {
    uploadArea.classList.add('border-primary');
}

function unhighlight(e) {
    uploadArea.classList.remove('border-primary');
}

// Handle file selection
pdfInput.addEventListener('change', function(e) {
    handlePDFFile(e.target.files[0]);
});

function handleDrop(e) {
    const dt = e.dataTransfer;
    const file = dt.files[0];
    handlePDFFile(file);
}

async function handlePDFFile(file) {
    if (!file || !file.type.includes('pdf')) {
        showError('Please select a valid PDF file.');
        return;
    }

    try {
        pdfFile = file;
        const arrayBuffer = await file.arrayBuffer();
        const { PDFDocument } = PDFLib;
        pdfDoc = await PDFDocument.load(arrayBuffer);
        
        watermarkSettings.classList.remove('d-none');
        previewBtn.classList.remove('d-none');
        applyBtn.disabled = false;
        
        showSuccess('PDF loaded successfully!');
    } catch (error) {
        console.error('Error loading PDF:', error);
        showError('Error loading PDF. Please try again.');
    }
}

// Handle watermark type change
watermarkType.addEventListener('change', function() {
    if (this.value === 'text') {
        textSettings.classList.remove('d-none');
        imageSettings.classList.add('d-none');
    } else {
        textSettings.classList.add('d-none');
        imageSettings.classList.remove('d-none');
    }
});

// Handle watermark image selection
watermarkImage.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
        watermarkImageFile = file;
        showSuccess('Watermark image selected!');
    } else {
        showError('Please select a valid image file.');
    }
});

// Handle page range selection
pageRange.addEventListener('change', function() {
    if (this.value === 'custom') {
        customPageRange.classList.remove('d-none');
    } else {
        customPageRange.classList.add('d-none');
    }
});

// Preview watermark
previewBtn.addEventListener('click', async function() {
    if (!pdfDoc) return;

    try {
        const firstPage = await pdfDoc.getPage(0);
        const { width, height } = firstPage.getSize();
        
        previewCanvas.width = width;
        previewCanvas.height = height;
        const ctx = previewCanvas.getContext('2d');
        
        // Draw page background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        
        // Apply watermark
        await applyWatermark(ctx, width, height);
        
        previewSection.classList.remove('d-none');
    } catch (error) {
        console.error('Error generating preview:', error);
        showError('Error generating preview. Please try again.');
    }
});

// Apply watermark to PDF
applyBtn.addEventListener('click', async function() {
    if (!pdfDoc) return;

    try {
        progressBar.classList.remove('d-none');
        applyBtn.disabled = true;
        statusText.textContent = 'Applying watermark...';

        // Get pages to process
        const pages = getSelectedPages();
        
        // Process each page
        for (let i = 0; i < pages.length; i++) {
            const pageIndex = pages[i] - 1;
            const page = pdfDoc.getPage(pageIndex);
            const { width, height } = page.getSize();

            if (watermarkType.value === 'text') {
                // Apply text watermark
                const text = watermarkText.value;
                const fontSize = parseInt(document.getElementById('fontSize').value);
                const color = document.getElementById('fontColor').value;
                const opacity = parseInt(document.getElementById('opacity').value) / 100;
                const rotation = parseInt(document.getElementById('rotation').value);
                
                page.drawText(text, {
                    x: getXPosition(width),
                    y: getYPosition(height),
                    size: fontSize,
                    color: PDFLib.rgb(...hexToRgb(color)),
                    opacity: opacity,
                    rotate: PDFLib.degrees(rotation),
                });
            } else {
                // Apply image watermark
                if (!watermarkImageFile) {
                    showError('Please select a watermark image.');
                    return;
                }

                const imageBytes = await watermarkImageFile.arrayBuffer();
                let image;
                if (watermarkImageFile.type === 'image/jpeg') {
                    image = await pdfDoc.embedJpg(imageBytes);
                } else {
                    image = await pdfDoc.embedPng(imageBytes);
                }

                const imageSize = parseInt(document.getElementById('imageSize').value) / 100;
                const opacity = parseInt(document.getElementById('opacity').value) / 100;
                const rotation = parseInt(document.getElementById('rotation').value);
                
                const imgDims = image.scale(imageSize);
                page.drawImage(image, {
                    x: getXPosition(width, imgDims.width),
                    y: getYPosition(height, imgDims.height),
                    width: imgDims.width,
                    height: imgDims.height,
                    opacity: opacity,
                    rotate: PDFLib.degrees(rotation),
                });
            }

            // Update progress
            const progress = ((i + 1) / pages.length) * 100;
            progressBarInner.style.width = `${progress}%`;
            statusText.textContent = `Processing page ${i + 1} of ${pages.length}...`;
        }

        // Save the PDF
        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        saveAs(blob, 'watermarked.pdf');

        // Reset UI
        progressBar.classList.add('d-none');
        progressBarInner.style.width = '0%';
        showSuccess('Watermark applied successfully!');
        applyBtn.disabled = false;

    } catch (error) {
        console.error('Error applying watermark:', error);
        showError('Error applying watermark. Please try again.');
        progressBar.classList.add('d-none');
        applyBtn.disabled = false;
    }
});

// Helper functions
function getSelectedPages() {
    const totalPages = pdfDoc.getPageCount();
    const selectedRange = pageRange.value;
    
    if (selectedRange === 'all') {
        return Array.from({ length: totalPages }, (_, i) => i + 1);
    } else if (selectedRange === 'first') {
        return [1];
    } else {
        // Parse custom range
        const customPages = document.getElementById('customPages').value;
        const pages = new Set();
        
        customPages.split(',').forEach(part => {
            if (part.includes('-')) {
                const [start, end] = part.split('-').map(num => parseInt(num.trim()));
                for (let i = start; i <= end; i++) {
                    if (i > 0 && i <= totalPages) pages.add(i);
                }
            } else {
                const pageNum = parseInt(part.trim());
                if (pageNum > 0 && pageNum <= totalPages) pages.add(pageNum);
            }
        });
        
        return Array.from(pages).sort((a, b) => a - b);
    }
}

function getXPosition(pageWidth, watermarkWidth = 0) {
    const position = document.getElementById('position').value;
    const margin = 20;
    
    switch (position) {
        case 'topLeft':
        case 'bottomLeft':
            return margin;
        case 'topRight':
        case 'bottomRight':
            return pageWidth - watermarkWidth - margin;
        default: // center
            return (pageWidth - watermarkWidth) / 2;
    }
}

function getYPosition(pageHeight, watermarkHeight = 0) {
    const position = document.getElementById('position').value;
    const margin = 20;
    
    switch (position) {
        case 'topLeft':
        case 'topRight':
            return pageHeight - margin - watermarkHeight;
        case 'bottomLeft':
        case 'bottomRight':
            return margin;
        default: // center
            return (pageHeight - watermarkHeight) / 2;
    }
}

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
        parseInt(result[1], 16) / 255,
        parseInt(result[2], 16) / 255,
        parseInt(result[3], 16) / 255
    ] : [0, 0, 0];
}

function showError(message) {
    statusText.innerHTML = `<div class="alert alert-danger">${message}</div>`;
    setTimeout(() => {
        statusText.innerHTML = '';
    }, 3000);
}

function showSuccess(message) {
    statusText.innerHTML = `<div class="alert alert-success">${message}</div>`;
    setTimeout(() => {
        statusText.innerHTML = '';
    }, 3000);
}

// Initialize
initDragAndDrop(); 