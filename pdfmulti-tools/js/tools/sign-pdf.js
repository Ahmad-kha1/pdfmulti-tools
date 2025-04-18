// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.11.338/pdf.worker.min.js';

// Global variables
let currentPDF = null;
let currentPage = 1;
let totalPages = 1;
let isProcessing = false;
let signaturePad = null;
let signatureImage = null;
let signatureText = null;

// DOM Elements
const dropArea = document.getElementById('drop-area');
const fileInput = document.getElementById('file-input');
const signingOptions = document.getElementById('signing-options');
const previewSection = document.getElementById('preview-section');
const processBtn = document.getElementById('process-btn');
const loadingSpinner = document.getElementById('loading-spinner');

// Preview elements
const prevPageBtn = document.getElementById('prev-page');
const nextPageBtn = document.getElementById('next-page');
const currentPageSpan = document.getElementById('current-page');
const totalPagesSpan = document.getElementById('total-pages');
const pdfPreview = document.getElementById('pdf-preview');
const signaturePreview = document.getElementById('signature-preview');

// Initialize Signature Pad
function initializeSignaturePad() {
    const canvas = document.getElementById('signature-pad');
    signaturePad = new SignaturePad(canvas, {
        backgroundColor: 'rgba(255, 255, 255, 0)',
        penColor: document.getElementById('signature-color').value
    });

    // Adjust canvas size
    const container = canvas.parentElement;
    canvas.width = container.offsetWidth;
    canvas.height = container.offsetHeight * 0.5;
    signaturePad.clear();
}

// Initialize the signature pad when the page loads
initializeSignaturePad();

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
        signingOptions.classList.remove('d-none');
        previewSection.classList.remove('d-none');
        processBtn.disabled = false;
        
        // Generate preview for first page
        await generatePreview();
    } catch (error) {
        showError('Error loading PDF: ' + error.message);
    }
}

// Generate preview for current page
async function generatePreview() {
    try {
        const page = await currentPDF.getPage(currentPage);
        const viewport = page.getViewport({ scale: 1.5 });
        
        // Setup canvas for PDF preview
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        // Render PDF page to canvas
        await page.render({
            canvasContext: context,
            viewport: viewport
        }).promise;
        
        // Display PDF preview
        pdfPreview.innerHTML = '';
        pdfPreview.appendChild(canvas);
        
        // Update signature preview
        updateSignaturePreview();
        
        // Update navigation buttons
        prevPageBtn.disabled = currentPage === 1;
        nextPageBtn.disabled = currentPage === totalPages;
    } catch (error) {
        showError('Error generating preview: ' + error.message);
    }
}

// Update signature preview
function updateSignaturePreview() {
    const signatureType = document.querySelector('input[name="signature-type"]:checked').id;
    const size = document.getElementById('signature-size').value;
    const opacity = document.getElementById('signature-opacity').value;
    const color = document.getElementById('signature-color').value;
    const rotation = document.getElementById('signature-rotation').value;
    const x = document.getElementById('signature-x').value;
    const y = document.getElementById('signature-y').value;

    signaturePreview.innerHTML = '';
    signaturePreview.style.transform = `translate(${x}%, ${y}%) rotate(${rotation}deg)`;
    signaturePreview.style.opacity = opacity / 100;

    switch (signatureType) {
        case 'draw-signature':
            if (signaturePad && !signaturePad.isEmpty()) {
                const canvas = document.createElement('canvas');
                canvas.width = signaturePad.width;
                canvas.height = signaturePad.height;
                const context = canvas.getContext('2d');
                context.drawImage(signaturePad.canvas, 0, 0);
                const img = new Image();
                img.src = canvas.toDataURL();
                img.style.width = `${size}px`;
                signaturePreview.appendChild(img);
            }
            break;

        case 'upload-signature':
            if (signatureImage) {
                const img = new Image();
                img.src = signatureImage;
                img.style.width = `${size}px`;
                signaturePreview.appendChild(img);
            }
            break;

        case 'text-signature':
            if (signatureText) {
                const div = document.createElement('div');
                div.textContent = signatureText;
                div.style.fontFamily = document.getElementById('signature-font').value;
                div.style.fontSize = `${size}px`;
                div.style.color = color;
                signaturePreview.appendChild(div);
            }
            break;
    }
}

// Handle signature type changes
document.querySelectorAll('input[name="signature-type"]').forEach(radio => {
    radio.addEventListener('change', () => {
        document.getElementById('draw-signature-area').classList.toggle('d-none', radio.id !== 'draw-signature');
        document.getElementById('upload-signature-area').classList.toggle('d-none', radio.id !== 'upload-signature');
        document.getElementById('text-signature-area').classList.toggle('d-none', radio.id !== 'text-signature');
        updateSignaturePreview();
    });
});

// Handle signature image upload
document.getElementById('signature-image').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            signatureImage = e.target.result;
            updateSignaturePreview();
        };
        reader.readAsDataURL(file);
    }
});

// Handle text signature input
document.getElementById('signature-text').addEventListener('input', (e) => {
    signatureText = e.target.value;
    updateSignaturePreview();
});

// Handle signature property changes
['signature-size', 'signature-opacity', 'signature-color', 'signature-rotation', 'signature-x', 'signature-y'].forEach(id => {
    document.getElementById(id).addEventListener('input', updateSignaturePreview);
});

// Handle signature font changes
document.getElementById('signature-font').addEventListener('change', updateSignaturePreview);

// Handle signature pad clear and undo
document.getElementById('clear-signature').addEventListener('click', () => {
    signaturePad.clear();
    updateSignaturePreview();
});

document.getElementById('undo-signature').addEventListener('click', () => {
    const data = signaturePad.toData();
    if (data) {
        data.pop(); // Remove the last dot or line
        signaturePad.fromData(data);
        updateSignaturePreview();
    }
});

// Process PDF
async function processPDF() {
    if (!currentPDF || isProcessing) return;
    
    isProcessing = true;
    processBtn.disabled = true;
    loadingSpinner.style.display = 'block';
    
    try {
        const startPage = document.getElementById('all-pages').checked ? 1 : parseInt(document.getElementById('start-page').value);
        const endPage = document.getElementById('all-pages').checked ? totalPages : parseInt(document.getElementById('end-page').value);
        
        // Get signature data
        const signatureType = document.querySelector('input[name="signature-type"]:checked').id;
        const size = document.getElementById('signature-size').value;
        const opacity = document.getElementById('signature-opacity').value;
        const color = document.getElementById('signature-color').value;
        const rotation = document.getElementById('signature-rotation').value;
        const x = document.getElementById('signature-x').value;
        const y = document.getElementById('signature-y').value;
        
        // Create signature image
        let signatureData;
        switch (signatureType) {
            case 'draw-signature':
                if (!signaturePad.isEmpty()) {
                    signatureData = signaturePad.toDataURL();
                }
                break;
            case 'upload-signature':
                signatureData = signatureImage;
                break;
            case 'text-signature':
                if (signatureText) {
                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d');
                    context.font = `${size}px ${document.getElementById('signature-font').value}`;
                    const metrics = context.measureText(signatureText);
                    canvas.width = metrics.width;
                    canvas.height = size * 1.5;
                    context.font = `${size}px ${document.getElementById('signature-font').value}`;
                    context.fillStyle = color;
                    context.fillText(signatureText, 0, size);
                    signatureData = canvas.toDataURL();
                }
                break;
        }
        
        if (!signatureData) {
            throw new Error('Please create a signature first');
        }
        
        // Process each page
        const pdfDoc = await PDFDocument.create();
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
            
            // Add signature to page
            const img = await pdfDoc.embedPng(signatureData);
            const signaturePage = await pdfDoc.addPage([viewport.width, viewport.height]);
            const signatureX = (viewport.width * x / 100) - (img.width * size / 100 / 2);
            const signatureY = viewport.height - (viewport.height * y / 100) - (img.height * size / 100 / 2);
            
            signaturePage.drawImage(img, {
                x: signatureX,
                y: signatureY,
                width: img.width * size / 100,
                height: img.height * size / 100,
                rotate: rotation * Math.PI / 180,
                opacity: opacity / 100
            });
        }
        
        // Save the PDF
        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        
        // Create download link
        const link = document.createElement('a');
        link.href = url;
        link.download = 'signed-document.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        showSuccess('PDF signed successfully!');
    } catch (error) {
        showError('Error signing PDF: ' + error.message);
    } finally {
        isProcessing = false;
        processBtn.disabled = false;
        loadingSpinner.style.display = 'none';
    }
}

// Helper functions
function updateProgress(current, total) {
    const percent = Math.round((current / total) * 100);
    loadingSpinner.style.display = 'block';
    loadingSpinner.style.setProperty('--progress', `${percent}%`);
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

// Event listeners for page selection
document.getElementById('all-pages').addEventListener('change', () => {
    document.getElementById('page-range-input').classList.add('d-none');
});

document.getElementById('custom-pages').addEventListener('change', () => {
    document.getElementById('page-range-input').classList.remove('d-none');
}); 