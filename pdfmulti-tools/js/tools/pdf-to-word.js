document.addEventListener('DOMContentLoaded', function() {
    // Initialize UI elements
    const dropArea = document.getElementById('drop-area');
    const fileInput = document.getElementById('file-input');
    const fileList = document.getElementById('file-list');
    const fileInfo = document.getElementById('file-info');
    const fileSize = document.getElementById('file-size');
    const totalPages = document.getElementById('total-pages');
    const estimatedTime = document.getElementById('estimated-time');
    const progressBar = document.getElementById('progress-bar');
    const progressBarInner = progressBar.querySelector('.progress-bar');
    const progressText = document.getElementById('progress-text');
    const convertBtn = document.getElementById('convert-btn');
    const loadingSpinner = document.getElementById('loading-spinner');
    const conversionOptions = document.getElementById('conversion-options');
    const customRangeContainer = document.getElementById('custom-range-container');
    const customRange = document.getElementById('custom-range');
    const pageRange = document.getElementById('page-range');
    const outputFormat = document.getElementById('output-format');
    const language = document.getElementById('language');
    const preserveFormatting = document.getElementById('preserve-formatting');
    const extractImages = document.getElementById('extract-images');
    const ocrText = document.getElementById('ocr-text');
    const autoZip = document.getElementById('auto-zip');

    // Add new UI elements for zip functionality
    const actionButtons = document.createElement('div');
    actionButtons.className = 'action-buttons mt-3 d-flex flex-wrap gap-2';
    actionButtons.innerHTML = `
        <button id="zip-btn" class="btn btn-secondary" disabled>
            <i class="fas fa-file-archive me-1"></i>Download as ZIP
        </button>
        <div class="form-check form-switch ms-3 d-flex align-items-center">
            <input class="form-check-input" type="checkbox" id="auto-zip-toggle" checked>
            <label class="form-check-label ms-2" for="auto-zip-toggle">Automatically ZIP multiple files</label>
        </div>
    `;
    
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
    
    // Insert elements after the file list
    fileList.parentNode.insertBefore(actionButtons, fileList.nextSibling);
    fileList.parentNode.insertBefore(errorContainer, actionButtons.nextSibling);
    
    // Get the new elements
    const zipBtn = document.getElementById('zip-btn');
    const autoZipToggle = document.getElementById('auto-zip-toggle');
    
    // Connect autoZip with autoZipToggle functionality
    autoZipToggle.addEventListener('change', function() {
        autoZip.checked = this.checked;
    });
    
    autoZip.addEventListener('change', function() {
        autoZipToggle.checked = this.checked;
    });

    // Initialize PDF.js worker
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
    }

    // Store uploaded files
    let files = [];
    
    // Store conversion results
    let conversionResults = [];
    
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
        dropArea.addEventListener('drop', handleDrop, false);
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
        const files = dt.files;
        handleFiles({ target: { files: files } });
    }

    function handleFiles(e) {
        // Clear any previous error messages
        hideError();
        
        const uploadedFiles = Array.from(e.target.files);
        
        if (uploadedFiles.length === 0) {
            return;
        }
        
        const pdfFiles = uploadedFiles.filter(file => file.type === 'application/pdf');
        const nonPdfFiles = uploadedFiles.filter(file => file.type !== 'application/pdf');
        
        // Handle non-PDF files
        if (nonPdfFiles.length > 0) {
            const fileNames = nonPdfFiles.map(f => f.name).join(', ');
            showError('Invalid File Type', 
                [`The following files are not PDFs and will be ignored: ${fileNames}`,
                 'Only PDF files can be converted to Word documents',
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
        }
        
        // Filter out oversized files
        files = pdfFiles.filter(file => file.size <= maxSizeInBytes);
        
        if (files.length === 0) {
            return;
        }
        
        // Update file list UI
        updateFileList();
        
        // Show conversion options and file info
        conversionOptions.classList.remove('d-none');
        fileInfo.classList.remove('d-none');
        
        // Calculate and display file info
        const totalSizeBytes = files.reduce((sum, file) => sum + file.size, 0);
        fileSize.textContent = formatFileSize(totalSizeBytes);
        
        // First, check PDF pages by loading the first file
        updatePDFPageCount(files[0]);
    }
    
    function updateFileList() {
        fileList.innerHTML = '';
        
        files.forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item p-3 mb-3 rounded bg-light';
            fileItem.innerHTML = `
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <i class="fas fa-file-pdf text-danger me-2"></i>
                        <span class="file-name">${file.name}</span>
                        <small class="text-muted ms-2">(${formatFileSize(file.size)})</small>
                    </div>
                    <button class="btn btn-sm btn-outline-danger remove-file" data-index="${index}">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
            fileList.appendChild(fileItem);
            
            // Add remove event listener
            fileItem.querySelector('.remove-file').addEventListener('click', function() {
                files.splice(index, 1);
                updateFileList();
                
                // Update buttons state
                convertBtn.disabled = files.length === 0;
                zipBtn.disabled = files.length <= 1;
                
                // Hide options if no files
                if (files.length === 0) {
                    conversionOptions.classList.add('d-none');
                    fileInfo.classList.add('d-none');
                } else {
                    // Recalculate file info
                    const totalSizeBytes = files.reduce((sum, file) => sum + file.size, 0);
                    fileSize.textContent = formatFileSize(totalSizeBytes);
                }
            });
        });
        
        // Update buttons state
        convertBtn.disabled = files.length === 0;
        zipBtn.disabled = files.length <= 1;
    }

    async function updatePDFPageCount(file) {
        try {
            const arrayBuffer = await readFileAsArrayBuffer(file);
            const pdf = await pdfjsLib.getDocument({data: arrayBuffer}).promise;
            const numPages = pdf.numPages;
            
            // Update UI
            totalPages.textContent = numPages;
            
            // Update estimated time
            updateConversionTimeEstimate(numPages);
            
        } catch (error) {
            console.error('Error counting PDF pages:', error);
            totalPages.textContent = 'Unknown';
            estimatedTime.textContent = 'Unknown';
        }
    }

    function formatFileSize(bytes) {
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 Bytes';
        const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
        return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
    }

    function updateConversionTimeEstimate(pages) {
        // Base estimate: 1.5 seconds per page
        let baseTime = pages * 1.5;
        
        // Adjust for OCR (4x slower)
        if (ocrText.checked) baseTime *= 4;
        
        // Adjust for image extraction (1.5x slower)
        if (extractImages.checked) baseTime *= 1.5;
        
        // Format time
        let timeText;
        if (baseTime < 60) {
            timeText = `${Math.ceil(baseTime)} seconds`;
        } else {
            const minutes = Math.floor(baseTime / 60);
            const seconds = Math.ceil(baseTime % 60);
            timeText = `${minutes} minute${minutes > 1 ? 's' : ''} ${seconds} second${seconds > 1 ? 's' : ''}`;
        }
        
        estimatedTime.textContent = timeText;
    }

    // Show error message with troubleshooting tips
    function showError(title, tips) {
        const errorContainer = document.querySelector('.error-container');
        const errorMessage = document.getElementById('error-message');
        const tipsList = document.querySelector('#troubleshooting-tips ul');
        
        if (errorContainer && errorMessage && tipsList) {
            errorContainer.classList.remove('d-none');
            errorMessage.textContent = title;
            
            tipsList.innerHTML = '';
            tips.forEach(tip => {
                const li = document.createElement('li');
                li.textContent = tip;
                tipsList.appendChild(li);
            });
        } else {
            // Fallback to notification
            if (window.showNotification) {
                window.showNotification(title, 'danger');
            } else {
                alert(title);
            }
        }
    }
    
    // Hide error message
    function hideError() {
        const errorContainer = document.querySelector('.error-container');
        if (errorContainer) {
            errorContainer.classList.add('d-none');
        }
    }

    // Add event listeners for options that affect conversion time
    [ocrText, extractImages].forEach(element => {
        element.addEventListener('change', function() {
            if (totalPages.textContent !== '0' && totalPages.textContent !== 'Unknown') {
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

    // Handle document conversion
    convertBtn.addEventListener('click', async function() {
        if (files.length === 0) {
            showError('No Files Selected', ['Please select at least one PDF file to convert']);
            return;
        }
        
        // Hide any previous errors
        hideError();
        
        try {
            // Set up state
            conversionResults = [];
            let completedFiles = 0;
            
            // Show UI for conversion in progress
            convertBtn.disabled = true;
            progressBar.classList.remove('d-none');
            progressBarInner.style.width = '0%';
            progressText.textContent = 'Starting conversion...';
            loadingSpinner.classList.remove('d-none');
            
            // Create download status container
            const downloadStatus = document.createElement('div');
            downloadStatus.className = 'download-status mt-3';
            fileList.appendChild(downloadStatus);
            
            // Get conversion options
            const options = {
                format: outputFormat.value,
                language: language.value,
                preserveFormatting: preserveFormatting.checked,
                extractImages: extractImages.checked,
                performOCR: ocrText.checked,
                pageRange: pageRange.value === 'custom' ? customRange.value : pageRange.value,
                pageSizing: document.getElementById('page-sizing').value || 'compact'
            };
            
            // Process each file
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                
                // Create status element for this file
                const fileStatus = document.createElement('div');
                fileStatus.className = 'file-status mb-2 p-2 rounded bg-light';
                fileStatus.innerHTML = `
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <i class="fas fa-file-word text-primary me-2"></i>
                            <span>${file.name.replace('.pdf', `.${options.format}`)}</span>
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
                    // Update progress
                    const fileProgress = (i / files.length) * 100;
                    progressBarInner.style.width = `${fileProgress}%`;
                    progressText.textContent = `Converting ${file.name} (${i + 1}/${files.length})...`;
                    
                    // Process the PDF file
                    await processPDF(file, options, fileStatus, function(progress) {
                        // Update individual file progress
                        const progressBar = fileStatus.querySelector('.progress-bar');
                        progressBar.style.width = `${progress}%`;
                    });
                    
                    // Update conversion status
                    completedFiles++;
                    
                } catch (error) {
                    console.error(`Error processing ${file.name}:`, error);
                    
                    // Update file status to show error
                    const statusBadge = fileStatus.querySelector('.badge');
                    statusBadge.className = 'badge bg-danger';
                    statusBadge.textContent = 'Failed';
                    
                    // Show error message
                    showError(`Error Processing ${file.name}`, [
                        error.message || 'Failed to convert file',
                        'Try a different PDF file',
                        'If using OCR, try disabling it',
                        'Check if the PDF is corrupted or password protected'
                    ]);
                }
            }
            
            // Update final status
            progressBarInner.style.width = '100%';
            
            if (completedFiles === files.length) {
                progressText.textContent = 'All files converted successfully!';
                
                // Show success message
                if (window.showNotification) {
                    window.showNotification(`Successfully converted ${completedFiles} file(s)`, 'success');
                }
                
                // Show zip button if multiple files
                if (completedFiles > 1) {
                    zipBtn.disabled = false;
                    
                    // Auto zip if enabled
                    if (autoZip.checked) {
                        createAndDownloadZip();
                    }
                }
            } else if (completedFiles > 0) {
                progressText.textContent = `Completed ${completedFiles} out of ${files.length} files. Some files had errors.`;
            } else {
                progressText.textContent = 'Conversion failed for all files. Please check the error messages.';
            }
            
        } catch (error) {
            console.error('Conversion error:', error);
            showError('Conversion Failed', [
                error.message || 'An unexpected error occurred',
                'Try refreshing the page and uploading again',
                'Try with smaller PDF files',
                'Check your browser console for technical details'
            ]);
        } finally {
            // Reset UI
            convertBtn.disabled = false;
            loadingSpinner.classList.add('d-none');
        }
    });
    
    // Handle ZIP download
    zipBtn.addEventListener('click', createAndDownloadZip);
    
    function createAndDownloadZip() {
        try {
            const zip = new JSZip();
            
            // Add all converted files to the ZIP
            conversionResults.forEach(result => {
                zip.file(result.fileName, result.data);
            });
            
            // Generate ZIP and trigger download
            zip.generateAsync({type: 'blob'})
                .then(function(content) {
                    // Create filename with timestamp
                    const timestamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
                    const zipName = `converted_documents_${timestamp}.zip`;
                    
                    // Download the ZIP file
                    if (window.download) {
                        download(content, zipName, 'application/zip');
                    } else {
                        // Fallback download method
                        const a = document.createElement('a');
                        a.href = URL.createObjectURL(content);
                        a.download = zipName;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(a.href);
                    }
                    
                    // Show success message
                    progressText.textContent = `All files zipped and downloaded as ${zipName}`;
                    
                    // Show notification
                    if (window.showNotification) {
                        window.showNotification(`ZIP file downloaded: ${zipName}`, 'success');
                    }
                })
                .catch(function(error) {
                    console.error('ZIP creation error:', error);
                    showError('ZIP Creation Failed', [
                        error.message || 'Failed to create ZIP file',
                        'Try downloading files individually',
                        'Check if you have sufficient disk space',
                        'Try with fewer files'
                    ]);
                });
                
        } catch (error) {
            console.error('ZIP error:', error);
            showError('ZIP Error', [
                error.message || 'Error creating ZIP file',
                'JSZip library may not be loaded properly',
                'Try downloading files individually'
            ]);
        }
    }

    // Process text items from PDF to maintain better layout
    async function processTextItems(items, page) {
        if (!items || items.length === 0) {
            return [];
        }
        
        // Get page viewport for calculating actual sizes
        const viewport = page.getViewport({ scale: 1.0 });
        
        // Group text items by Y position (lines)
        const lineMap = {};
        
        // Track fonts and styles from the PDF
        const fontMap = new Map();
        
        // Store positions for table detection
        const positionMap = [];
        
        // Process each text item to extract styling information
        items.forEach(item => {
            if (!item.str.trim()) return;
            
            // Store position data for table detection
            positionMap.push({
                text: item.str,
                x: Math.round(item.transform[4]),
                y: Math.round(item.transform[5]),
                width: item.width,
                height: item.height,
                font: item.fontName
            });
            
            // Extract font info
            if (item.fontName) {
                const fontDetails = {
                    name: item.fontName,
                    size: Math.round(item.height * 2) || 11, // Convert to point size
                    isBold: /bold|heavy|black/i.test(item.fontName),
                    isItalic: /italic|oblique/i.test(item.fontName)
                };
                fontMap.set(item.fontName, fontDetails);
            }
            
            // Round Y position to group nearby items
            const yPos = Math.round(item.transform[5]);
            if (!lineMap[yPos]) {
                lineMap[yPos] = [];
            }
            lineMap[yPos].push(item);
        });
        
        // Detect if this document has tabular data
        const hasTabularStructure = detectTabularStructure(positionMap);
        
        // If it's a table-heavy document like a payslip, use table-based processing
        if (hasTabularStructure) {
            return processAsTable(positionMap, fontMap, viewport);
        }
        
        // Sort Y positions (top to bottom)
        const yPositions = Object.keys(lineMap).sort((a, b) => b - a);
        
        // Process lines into paragraphs
        const paragraphs = [];
        let currentTextRuns = [];
        let lastY = null;
        
        // Minimum gap to consider as new paragraph (dynamically calculated based on typical font size)
        const avgFontSize = [...fontMap.values()].reduce((sum, font) => sum + font.size, 0) / 
                            Math.max(1, fontMap.size) || 11;
        const paragraphGap = Math.max(8, avgFontSize * 0.8); // Use font size to determine paragraph breaks
        
        for (const y of yPositions) {
            // Sort items in this line by X position (left to right)
            const line = lineMap[y].sort((a, b) => a.transform[4] - b.transform[4]);
            
            // Check if this is a new paragraph based on vertical spacing
            const isNewParagraph = lastY === null || Math.abs(parseInt(y) - parseInt(lastY)) > paragraphGap;
            
            if (isNewParagraph && currentTextRuns.length > 0) {
                // Determine alignment based on X position and width
                const alignment = determineAlignment(line, viewport.width);
                
                // Create paragraph from accumulated text runs
                paragraphs.push(
                    new docx.Paragraph({
                        children: currentTextRuns,
                        spacing: {
                            after: 100,
                            before: 100,
                            line: 240
                        },
                        alignment: alignment,
                        keepLines: true // Keep lines together to prevent splitting across pages
                    })
                );
                currentTextRuns = [];
            }
            
            // Process each text item in the line, preserving fonts and styles
            line.forEach(item => {
                if (!item.str.trim()) return;
                
                // Extract font information
                const fontSize = item.height ? Math.round(item.height * 2) : 
                                 (fontMap.get(item.fontName)?.size || 11);
                const fontFamily = inferFontFamily(item.fontName);
                const isBold = fontMap.get(item.fontName)?.isBold || 
                              /bold|heavy|black/i.test(item.fontName);
                const isItalic = fontMap.get(item.fontName)?.isItalic || 
                                /italic|oblique/i.test(item.fontName);
                
                // Create text run with proper styling
                currentTextRuns.push(
                    new docx.TextRun({
                        text: item.str,
                        size: fontSize * 2, // Convert to half-points as required by docx
                        font: fontFamily,
                        bold: isBold,
                        italic: isItalic
                    })
                );
                
                // Add space between items if they're not the last in the line
                if (item !== line[line.length - 1]) {
                    currentTextRuns.push(new docx.TextRun({ text: " " }));
                }
            });
            
            // Add line break if not a new paragraph and not the last line
            if (!isNewParagraph && y !== yPositions[yPositions.length - 1]) {
                currentTextRuns.push(new docx.TextRun({ text: "", break: 1 }));
            }
            
            lastY = y;
        }
        
        // Add the last paragraph
        if (currentTextRuns.length > 0) {
            // Determine alignment for the last paragraph
            const alignment = determineAlignment(lineMap[lastY], viewport.width);
            
            paragraphs.push(
                new docx.Paragraph({
                    children: currentTextRuns,
                    spacing: {
                        after: 100,
                        before: 100,
                        line: 240
                    },
                    alignment: alignment,
                    keepLines: true
                })
            );
        }
        
        return paragraphs;
    }

    // Process PDF content as a table (for payslips, forms, etc.)
    function processAsTable(positions, fontMap, viewport) {
        // Sort positions by Y then X to create a grid
        positions.sort((a, b) => {
            if (Math.abs(a.y - b.y) < 5) { // Items within 5 points are on the same row
                return a.x - b.x; // Sort by X position
            }
            return b.y - a.y; // Sort rows top to bottom
        });
        
        const paragraphs = [];
        
        // Group items into rows
        const rows = [];
        let currentRow = [];
        let currentY = positions.length > 0 ? positions[0].y : null;
        
        positions.forEach(item => {
            // If Y position differs by more than 5 points, it's a new row
            if (Math.abs(item.y - currentY) > 5) {
                if (currentRow.length > 0) {
                    rows.push(currentRow);
                    currentRow = [];
                }
                currentY = item.y;
            }
            currentRow.push(item);
        });
        
        // Add the last row if any
        if (currentRow.length > 0) {
            rows.push(currentRow);
        }
        
        // Detect table columns by analyzing position patterns
        // Get common X positions
        const xPositions = [];
        rows.forEach(row => {
            row.forEach(item => {
                if (!xPositions.includes(item.x)) {
                    xPositions.push(item.x);
                }
            });
        });
        
        // Sort X positions
        xPositions.sort((a, b) => a - b);
        
        // Find column boundaries by clustering X positions
        const columnBoundaries = [];
        let lastX = -100;
        xPositions.forEach(x => {
            if (x - lastX > 20) { // Min 20pt gap to consider a new column
                columnBoundaries.push(x - 10); // Column starts 10pt before text
            }
            lastX = x;
        });
        
        // Create a table from the rows
        rows.forEach(row => {
            // For each row, create a paragraph with tabs for column alignment
            let currentPosition = 0;
            let tableRow = new docx.Paragraph({
                spacing: {
                    before: 60,
                    after: 60,
                },
                keepLines: true,
                tabStops: columnBoundaries.map((boundary, index) => ({
                    position: boundary,
                    type: docx.TabStopType.LEFT
                }))
            });
            
            const children = [];
            
            // Add items to the row, inserting tabs as needed
            row.forEach((item, index) => {
                // Find which column this item belongs to
                let columnIndex = 0;
                for (let i = 0; i < columnBoundaries.length; i++) {
                    if (item.x >= columnBoundaries[i]) {
                        columnIndex = i;
                    } else {
                        break;
                    }
                }
                
                // Add tabs for column alignment, if needed
                if (columnIndex > currentPosition) {
                    for (let i = currentPosition; i < columnIndex; i++) {
                        children.push(new docx.TextRun({ text: "\t" }));
                    }
                    currentPosition = columnIndex;
                }
                
                // Extract font information
                const fontDetails = fontMap.get(item.font) || { size: 11, isBold: false, isItalic: false };
                
                // Create text run with proper styling
                children.push(new docx.TextRun({
                    text: item.text,
                    size: (fontDetails.size || 11) * 2, // Convert to half-points
                    font: inferFontFamily(item.font),
                    bold: fontDetails.isBold,
                    italic: fontDetails.isItalic
                }));
                
                // Add space if not the last item
                if (index < row.length - 1) {
                    // Only add space if the next item is in the same column
                    const nextItem = row[index + 1];
                    let nextColumnIndex = 0;
                    for (let i = 0; i < columnBoundaries.length; i++) {
                        if (nextItem.x >= columnBoundaries[i]) {
                            nextColumnIndex = i;
                        } else {
                            break;
                        }
                    }
                    
                    if (nextColumnIndex === columnIndex) {
                        children.push(new docx.TextRun({ text: " " }));
                    }
                }
            });
            
            tableRow.children = children;
            paragraphs.push(tableRow);
            
            // Add horizontal line if this appears to be a header row (bold text, etc.)
            const hasBoldText = row.some(item => {
                const fontDetails = fontMap.get(item.font);
                return fontDetails && fontDetails.isBold;
            });
            
            if (hasBoldText || row.some(item => item.text.includes('Total') || item.text.includes('TOTAL'))) {
                paragraphs.push(
                    new docx.Paragraph({
                        children: [new docx.TextRun({ text: "" })],
                        border: {
                            bottom: { color: "auto", space: 1, style: "single", size: 6 }
                        },
                        spacing: { before: 60, after: 60 }
                    })
                );
            }
        });
        
        return paragraphs;
    }

    // Detect if content appears to be tabular (like a report, invoice, or payslip)
    function detectTabularStructure(positions) {
        if (positions.length < 10) return false;
        
        // Group positions by Y coordinate to identify rows
        const yPosMap = {};
        positions.forEach(item => {
            const y = Math.round(item.y / 5) * 5; // Round to nearest 5 for grouping
            if (!yPosMap[y]) yPosMap[y] = [];
            yPosMap[y].push(item);
        });
        
        // Count rows with multiple items (potential table rows)
        const multiItemRows = Object.values(yPosMap).filter(row => row.length > 1).length;
        
        // Look for alignment patterns in X positions
        const xPositions = positions.map(item => item.x);
        const uniqueXPositions = [...new Set(xPositions)];
        
        // If at least 30% of content is in aligned columns and we have multiple rows,
        // it's likely a table-structured document
        const alignmentRatio = uniqueXPositions.length / positions.length;
        const hasMultipleAlignedRows = multiItemRows > 3;
        
        return alignmentRatio < 0.5 && hasMultipleAlignedRows;
    }

    // Determine text alignment based on position
    function determineAlignment(line, pageWidth) {
        if (!line || line.length === 0) return docx.AlignmentType.LEFT;
        
        // Get leftmost and rightmost positions
        const leftPos = Math.min(...line.map(item => item.transform[4]));
        
        // Calculate approximate text width
        const totalWidth = line.reduce((sum, item) => sum + (item.width || 0), 0);
        const rightPos = leftPos + totalWidth;
        
        // Get page center
        const pageCenter = pageWidth / 2;
        
        // Determine alignment
        if (Math.abs(leftPos - 0) < 100) {
            return docx.AlignmentType.LEFT;
        } else if (Math.abs(rightPos - pageWidth) < 100) {
            return docx.AlignmentType.RIGHT;
        } else if (Math.abs((leftPos + rightPos) / 2 - pageCenter) < 100) {
            return docx.AlignmentType.CENTER;
        }
        
        // Default to LEFT alignment
        return docx.AlignmentType.LEFT;
    }

    // Infer font family from PDF font name
    function inferFontFamily(pdfFontName) {
        if (!pdfFontName) return 'Calibri';
        
        const fontName = pdfFontName.toLowerCase();
        
        // Common font mappings
        if (fontName.includes('times')) return 'Times New Roman';
        if (fontName.includes('arial') || fontName.includes('helvetica')) return 'Arial';
        if (fontName.includes('courier')) return 'Courier New';
        if (fontName.includes('georgia')) return 'Georgia';
        if (fontName.includes('verdana')) return 'Verdana';
        if (fontName.includes('tahoma')) return 'Tahoma';
        if (fontName.includes('trebuchet')) return 'Trebuchet MS';
        if (fontName.includes('calibri')) return 'Calibri';
        if (fontName.includes('cambria')) return 'Cambria';
        if (fontName.includes('garamond')) return 'Garamond';
        if (fontName.includes('comic')) return 'Comic Sans MS';
        if (fontName.includes('consolas')) return 'Consolas';
        
        // Extract common font name without style indicators
        const cleanName = fontName
            .replace(/[-+_]/g, ' ')
            .replace(/(bold|italic|oblique|regular|medium|light|thin|heavy|black|condensed|extended|narrow)/gi, '')
            .trim();
        
        // Capitalize each word
        return cleanName.split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ') || 'Calibri';
    }

    // Calculate optimal document settings based on content
    function calculateOptimalDocumentSettings(pdf, options) {
        // Get the first page of the PDF
        return pdf.getPage(1).then(page => {
            // Get the viewport of the first page
            const viewport = page.getViewport({ scale: 1.0 });
            
            // Determine page size by actual PDF dimensions
            let pageWidth = viewport.width;
            let pageHeight = viewport.height;
            
            // Calculate page size
            let size;
            let orientation = options.pageOrientation || 'portrait';
            
            // Default to specified size if provided
            if (options.pageSize) {
                size = getPageSize(options.pageSize);
            } else {
                // Auto-detect page size based on dimensions
                // Common page sizes in points (72 points = 1 inch)
                const pageSizes = {
                    LETTER: { width: 612, height: 792 },
                    A4: { width: 595, height: 842 },
                    LEGAL: { width: 612, height: 1008 },
                    A5: { width: 420, height: 595 },
                    A3: { width: 842, height: 1191 }
                };
                
                // Find closest match
                let bestMatch = 'LETTER';
                let smallestDiff = Infinity;
                
                for (const [name, dimensions] of Object.entries(pageSizes)) {
                    const widthDiff = Math.abs(pageWidth - dimensions.width);
                    const heightDiff = Math.abs(pageHeight - dimensions.height);
                    const totalDiff = widthDiff + heightDiff;
                    
                    if (totalDiff < smallestDiff) {
                        smallestDiff = totalDiff;
                        bestMatch = name;
                    }
                }
                
                size = docx.PageSize[bestMatch];
                
                // Check if orientation should be landscape
                if (pageWidth > pageHeight) {
                    orientation = 'landscape';
                }
            }
            
            // Calculate optimal margins (in twips - 1/20 of a point)
            // For 1-page PDFs, use smaller margins to ensure content fits on one page
            const isLikelySinglePage = (options.pageRange === '1' || 
                                        (options.pageRange === 'all' && pdf.numPages === 1));
            
            const marginMultiplier = isLikelySinglePage ? 0.7 : 1.0;
            
            const margins = {
                top: options.marginTop ? parseInt(options.marginTop) * 72 : Math.min(720, 500 * marginMultiplier),
                right: options.marginRight ? parseInt(options.marginRight) * 72 : Math.min(720, 500 * marginMultiplier),
                bottom: options.marginBottom ? parseInt(options.marginBottom) * 72 : Math.min(720, 500 * marginMultiplier),
                left: options.marginLeft ? parseInt(options.marginLeft) * 72 : Math.min(720, 500 * marginMultiplier)
            };
            
            return {
                size,
                orientation: orientation === 'landscape' ? docx.PageOrientation.LANDSCAPE : docx.PageOrientation.PORTRAIT,
                margins
            };
        });
    }

    // Process a PDF file to convert to Word
    async function processPDF(file, options, fileStatus, progressCallback) {
        return new Promise(async (resolve, reject) => {
            try {
                // Read the PDF file
                const arrayBuffer = await readFileAsArrayBuffer(file);
                
                // Load PDF document
                const pdf = await pdfjsLib.getDocument({data: arrayBuffer}).promise;
                const numPages = pdf.numPages;
                
                // Determine if this is a single-page document (important for format preservation)
                const isSinglePage = numPages === 1;
                
                // Determine pages to process
                let pagesToProcess = [];
                
                if (options.pageRange === 'all') {
                    // Process all pages
                    pagesToProcess = Array.from({length: numPages}, (_, i) => i + 1);
                } else if (options.pageRange === '1') {
                    // First page only
                    pagesToProcess = [1];
                } else if (typeof options.pageRange === 'string' && options.pageRange.includes('-')) {
                    // Process range (e.g., "1-5")
                    const [start, end] = options.pageRange.split('-').map(Number);
                    const validStart = Math.max(1, Math.min(start || 1, numPages));
                    const validEnd = Math.max(validStart, Math.min(end || numPages, numPages));
                    
                    for (let i = validStart; i <= validEnd; i++) {
                        pagesToProcess.push(i);
                    }
                } else if (typeof options.pageRange === 'string') {
                    // Process specific pages (e.g., "1,3,5")
                    pagesToProcess = options.pageRange.split(',')
                        .map(p => parseInt(p.trim()))
                        .filter(p => !isNaN(p) && p > 0 && p <= numPages);
                }
                
                // If no valid pages specified, process all
                if (pagesToProcess.length === 0) {
                    pagesToProcess = Array.from({length: numPages}, (_, i) => i + 1);
                }
                
                // Get first page to analyze document properties
                const firstPage = await pdf.getPage(1);
                const viewport = firstPage.getViewport({ scale: 1.0 });
                
                // Extract font information from first page to analyze document styling
                const firstPageTextContent = await firstPage.getTextContent();
                const documentFonts = extractDocumentFonts(firstPageTextContent);
                
                // Get PDF dimensions
                const pdfWidth = viewport.width;
                const pdfHeight = viewport.height;
                
                // Calculate optimal margins based on actual content positioning
                // We'll use 25% tighter margins for single-page documents to ensure they stay single page
                const marginReduction = isSinglePage ? 0.65 : 1.0;
                
                // Create a document settings object with the exact dimensions and reduced margins
                const documentSettings = {
                    size: {
                        width: Math.round(pdfWidth * 1.00), // Preserve exact PDF width
                        height: Math.round(pdfHeight * 1.00) // Preserve exact PDF height
                    },
                    orientation: pdfWidth > pdfHeight ? 
                        docx.PageOrientation.LANDSCAPE : 
                        docx.PageOrientation.PORTRAIT,
                    margins: {
                        top: Math.round(72 * marginReduction), // 0.5-1 inch depending on document type
                        right: Math.round(72 * marginReduction),
                        bottom: Math.round(72 * marginReduction),
                        left: Math.round(72 * marginReduction)
                    }
                };
                
                // Create content array to store all text and images
                const docChildren = [];
                
                // Process pages - collect text and images
                for (let i = 0; i < pagesToProcess.length; i++) {
                    // Update progress
                    const pageProgress = (i / pagesToProcess.length) * 100;
                    if (progressCallback) progressCallback(pageProgress);
                    
                    // Get page number
                    const pageNum = pagesToProcess[i];
                    
                    // Get page
                    const page = await pdf.getPage(pageNum);
                    
                    // Extract text content with positioning
                    const textContent = await page.getTextContent({
                        normalizeWhitespace: false,
                        disableCombineTextItems: false
                    });
                    
                    // If it's a single page document, try to extract exact positions
                    // and closely mimic the layout to preserve the single-page format
                    if (isSinglePage) {
                        const exactLayoutItems = await processExactLayout(textContent.items, page, documentFonts);
                        exactLayoutItems.forEach(item => {
                            docChildren.push(item);
                        });
                    } else {
                        // For multi-page documents, use the table-aware processing
                        // to better handle tables and maintain structure
                        const textItems = await processTextItems(textContent.items, page);
                        textItems.forEach(item => {
                            docChildren.push(item);
                        });
                    }
                    
                    // Extract images if needed - reduce image quality for single-page docs
                    // to ensure they fit on one page without expanding
                    if (options.extractImages) {
                        try {
                            // Use lower scale for single-page documents to save space
                            const scale = isSinglePage ? 1.2 : 1.5;
                            const viewport = page.getViewport({ scale });
                            
                            // Create a canvas to render the page
                            const canvas = document.createElement('canvas');
                            canvas.width = viewport.width;
                            canvas.height = viewport.height;
                            
                            // Render the page to the canvas
                            const ctx = canvas.getContext('2d');
                            await page.render({ canvasContext: ctx, viewport }).promise;
                            
                            // Use higher compression for single-page docs
                            const imageQuality = isSinglePage ? 0.7 : 0.85;
                            const imageData = canvas.toDataURL('image/jpeg', imageQuality);
                            
                            // Convert data URL to binary
                            const base64Data = imageData.split(',')[1];
                            const binaryData = atob(base64Data);
                            const array = new Uint8Array(binaryData.length);
                            
                            for (let j = 0; j < binaryData.length; j++) {
                                array[j] = binaryData.charCodeAt(j);
                            }
                            
                            // Calculate reasonable image dimensions - use smaller images for single-page docs
                            const maxWidth = isSinglePage ? 400 : 450;
                            let imgWidth = maxWidth;
                            let imgHeight = canvas.height * (imgWidth / canvas.width);
                            
                            // Stricter height limits for single-page documents
                            const maxHeight = isSinglePage ? 500 : 600;
                            if (imgHeight > maxHeight) {
                                imgHeight = maxHeight;
                                imgWidth = canvas.width * (imgHeight / canvas.height);
                            }
                            
                            // Create an image run in a paragraph
                            const imageBuffer = array.buffer;
                            const imageRun = new docx.ImageRun({
                                data: imageBuffer,
                                transformation: {
                                    width: imgWidth,
                                    height: imgHeight
                                }
                            });
                            
                            // Add image paragraph to children array - reduce spacing for single-page docs
                            docChildren.push(new docx.Paragraph({ 
                                children: [imageRun],
                                spacing: {
                                    before: isSinglePage ? 80 : 120,
                                    after: isSinglePage ? 80 : 120
                                }
                            }));
                        } catch (err) {
                            console.error('Error adding image:', err);
                        }
                    }
                    
                    // Add page break only if not the last page AND we have multiple pages
                    // No page breaks in single-page documents at all
                    if (!isSinglePage && i < pagesToProcess.length - 1 && pagesToProcess.length > 1) {
                        docChildren.push(new docx.Paragraph({
                            children: [new docx.TextRun("")],
                            pageBreakBefore: true
                        }));
                    }
                }
                
                // Special handling for single-page conversions
                if (isSinglePage) {
                    // Add final small adjustments to ensure the document fits on one page
                    documentSettings.margins.bottom = Math.round(documentSettings.margins.bottom * 0.8);
                    
                    // No page breaks at all for single-page documents
                    docChildren = docChildren.filter(child => !child.properties?.pageBreakBefore);
                }
                
                // Create the document with the collected content
                const doc = new docx.Document({
                    sections: [{
                        properties: {
                            page: {
                                size: documentSettings.size,
                                orientation: documentSettings.orientation,
                                margin: documentSettings.margins
                            }
                        },
                        children: docChildren
                    }]
                });
                
                // Generate document using browser-compatible method
                const blob = await docx.Packer.toBlob(doc);
                
                // Convert blob to ArrayBuffer for consistent handling
                const buffer = await blob.arrayBuffer();
                
                // Update file status
                const statusBadge = fileStatus.querySelector('.badge');
                statusBadge.className = 'badge bg-success';
                statusBadge.textContent = 'Completed';
                
                // Set progress to 100%
                if (progressCallback) progressCallback(100);
                
                // Add download button
                const statusControls = fileStatus.querySelector('.status-controls');
                const downloadBtn = document.createElement('button');
                downloadBtn.className = 'btn btn-sm btn-primary ms-2';
                downloadBtn.innerHTML = '<i class="fas fa-download me-1"></i>Download';
                
                // Create filename
                const fileName = file.name.replace('.pdf', `.${options.format}`);
                
                // Store the conversion result
                const result = {
                    fileName: fileName,
                    data: buffer
                };
                
                conversionResults.push(result);
                
                // Download function
                downloadBtn.addEventListener('click', function() {
                    const docBlob = new Blob([buffer], { 
                        type: options.format === 'docx' 
                            ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
                            : options.format === 'doc' 
                                ? 'application/msword' 
                                : 'application/rtf' 
                    });
                    
                    if (window.download) {
                        download(docBlob, fileName, docBlob.type);
                    } else {
                        // Fallback download
                        const url = URL.createObjectURL(docBlob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = fileName;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                    }
                });
                
                statusControls.appendChild(downloadBtn);
                
                // Auto download if it's the only file or auto-zip is disabled
                if (files.length === 1 || !autoZip.checked) {
                    downloadBtn.click();
                }
                
                resolve(result);
                
            } catch (error) {
                console.error('PDF processing error:', error);
                reject(error);
            }
        });
    }

    // Extract document fonts from PDF content
    function extractDocumentFonts(textContent) {
        const fontMap = new Map();
        
        textContent.items.forEach(item => {
            if (item.fontName) {
                if (!fontMap.has(item.fontName)) {
                    fontMap.set(item.fontName, {
                        name: item.fontName,
                        size: Math.round(item.height * 2) || 11,
                        isBold: /bold|heavy|black/i.test(item.fontName),
                        isItalic: /italic|oblique/i.test(item.fontName),
                        isSerif: /serif|times|georgia|garamond/i.test(item.fontName),
                        isSansSerif: /sans|arial|helvetica|verdana|tahoma|trebuchet/i.test(item.fontName),
                        isMonospace: /mono|courier|consolas|menlo/i.test(item.fontName),
                        count: 1
                    });
                } else {
                    const font = fontMap.get(item.fontName);
                    font.count++;
                    // Average size for better estimation
                    font.size = Math.round((font.size * font.count + Math.round(item.height * 2)) / (font.count + 1));
                }
            }
        });
        
        // Sort by most common fonts
        return [...fontMap.entries()]
            .sort((a, b) => b[1].count - a[1].count)
            .map(entry => entry[1]);
    }

    // Process exact layout for single page documents
    async function processExactLayout(items, page, documentFonts) {
        // Get page metrics
        const viewport = page.getViewport({ scale: 1.0 });
        const pageWidth = viewport.width;
        const pageHeight = viewport.height;
        
        // Sort items by Y position from top to bottom
        items.sort((a, b) => b.transform[5] - a.transform[5]);
        
        // Group items by Y position with a very small tolerance (1-2 pts)
        const lineGroups = [];
        let currentGroup = [];
        let currentY = items.length > 0 ? items[0].transform[5] : null;
        
        items.forEach(item => {
            // Skip empty items
            if (!item.str.trim()) return;
            
            // If this item is close enough to current Y, add to current group
            if (Math.abs(item.transform[5] - currentY) <= 2) {
                currentGroup.push(item);
            } else {
                // Start a new group
                if (currentGroup.length > 0) {
                    lineGroups.push([...currentGroup]);
                }
                currentGroup = [item];
                currentY = item.transform[5];
            }
        });
        
        // Add final group if any
        if (currentGroup.length > 0) {
            lineGroups.push(currentGroup);
        }
        
        // Process each line group to create DOCX paragraphs with exact styling
        const paragraphs = [];
        
        lineGroups.forEach(group => {
            // Sort items in this line by X position (left to right)
            group.sort((a, b) => a.transform[4] - b.transform[4]);
            
            // Create text runs for this line with font info
            const textRuns = [];
            
            group.forEach(item => {
                // Get font details
                const fontDetails = {
                    name: item.fontName || (documentFonts.length > 0 ? documentFonts[0].name : 'Arial'),
                    size: Math.round(item.height * 2) || 11,
                    isBold: /bold|heavy|black/i.test(item.fontName || ''),
                    isItalic: /italic|oblique/i.test(item.fontName || ''),
                };
                
                // Map PDF font to Word font
                const wordFont = inferFontFamily(fontDetails.name);
                
                // Create text run with exact styling
                textRuns.push(
                    new docx.TextRun({
                        text: item.str,
                        size: fontDetails.size * 2, // Word uses half-points
                        font: wordFont,
                        bold: fontDetails.isBold,
                        italic: fontDetails.isItalic
                    })
                );
            });
            
            // Determine alignment based on X position
            let alignment = docx.AlignmentType.LEFT;
            
            if (group.length > 0) {
                const firstX = group[0].transform[4];
                const lastX = group[group.length - 1].transform[4] + (group[group.length - 1].width || 0);
                const lineCenter = (firstX + lastX) / 2;
                const pageCenter = pageWidth / 2;
                
                if (Math.abs(firstX - 0) <= 50) {
                    alignment = docx.AlignmentType.LEFT;
                } else if (Math.abs(lastX - pageWidth) <= 50) {
                    alignment = docx.AlignmentType.RIGHT;
                } else if (Math.abs(lineCenter - pageCenter) <= 50) {
                    alignment = docx.AlignmentType.CENTER;
                }
            }
            
            // Calculate spacing exactly - use minimal spacing for single page documents
            // This ensures we don't add unnecessary vertical space
            const spacing = {
                before: 60, // Minimal spacing (60 twips = 3 points)
                after: 60
            };
            
            // Create paragraph with exact positioning
            paragraphs.push(
                new docx.Paragraph({
                    children: textRuns,
                    alignment: alignment,
                    spacing: spacing,
                    // Prevent Word from breaking this paragraph across pages
                    keepLines: true,
                    // Prevent widow/orphan control to avoid auto page breaks
                    widowControl: false
                })
            );
        });
        
        return paragraphs;
    }

    // Helper function to read a file as ArrayBuffer
    function readFileAsArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }

    // Add Preserve Original Formatting option in the UI
    const optionsContainer = document.querySelector('.conversion-options');
    const preserveFormattingDiv = document.createElement('div');
    preserveFormattingDiv.className = 'form-check mb-3';
    preserveFormattingDiv.innerHTML = `
        <input class="form-check-input" type="checkbox" id="preserve-formatting" checked>
        <label class="form-check-label" for="preserve-formatting">
            Preserve Original Formatting
        </label>
        <small class="form-text text-muted d-block">Maintains fonts, sizes, and styles from the original PDF</small>
    `;
    optionsContainer.insertBefore(preserveFormattingDiv, optionsContainer.firstChild);

    /**
     * Trigger a download of the converted file
     * @param {Blob} blob - The file blob to download
     * @param {string} filename - The name of the file to save
     */
    function downloadFile(blob, filename) {
        // Create a URL for the blob
        const url = window.URL.createObjectURL(blob);
        
        // Create a temporary anchor element
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = filename;
        
        // Add to the DOM and trigger the download
        document.body.appendChild(a);
        a.click();
        
        // Clean up
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    }

    /**
     * Update the progress bar and status message
     * @param {number} progress - Progress percentage (0-100)
     * @param {string} message - Status message to display
     */
    function updateProgress(progress, message) {
        const progressBar = document.getElementById('progress-bar');
        const progressText = document.getElementById('progress-text');
        
        if (progressBar) {
            progressBar.style.width = `${progress}%`;
            progressBar.setAttribute('aria-valuenow', progress);
        }
        
        if (progressText) {
            progressText.textContent = message;
        }
    }

    // Update the worker message handler to ensure proper file download
    worker.onmessage = function(e) {
        if (e.data.status === 'progress') {
            updateProgress(e.data.progress, e.data.message);
        } else if (e.data.status === 'complete') {
            updateProgress(100, 'Conversion complete! Downloading file...');
            
            // Convert the array buffer to a Blob
            const blob = new Blob([e.data.docxBuffer], { 
                type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
            });
            
            // Generate a filename based on the original file
            const originalName = currentFile.name.replace(/\.pdf$/i, '');
            const filename = `${originalName}_converted.docx`;
            
            // Trigger the download
            downloadFile(blob, filename);
            
            // Reset the UI after a short delay
            setTimeout(() => {
                updateProgress(0, 'Ready for conversion');
                document.getElementById('convert-btn').disabled = false;
            }, 1500);
        } else if (e.data.status === 'error') {
            updateProgress(0, `Error: ${e.data.error}`);
            document.getElementById('convert-btn').disabled = false;
        }
    };

    // Helper function to get page size based on the selected option
    function getPageSize(pageSize) {
        switch (pageSize.toLowerCase()) {
            case 'a3':
                return docx.PageSize.A3;
            case 'a4':
                return docx.PageSize.A4;
            case 'a5':
                return docx.PageSize.A5;
            case 'legal':
                return docx.PageSize.LEGAL;
            case 'letter':
            default:
                return docx.PageSize.LETTER;
        }
    }
}); 