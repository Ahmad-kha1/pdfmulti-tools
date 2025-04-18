document.addEventListener('DOMContentLoaded', function() {
    // Add custom styles for the sortable list
    addSortableStyles();
    
    const dropArea = document.getElementById('drop-area');
    const fileInput = document.getElementById('file-input');
    const fileList = document.getElementById('file-list');
    const mergeBtn = document.getElementById('merge-btn');
    const clearBtn = document.getElementById('clear-btn');
    const loadingSpinner = document.getElementById('loading-spinner');
    const progressBar = document.getElementById('progress-bar');
    const progressBarInner = progressBar.querySelector('.progress-bar');
    const progressText = document.getElementById('progress-text');
    const dragInstructions = document.getElementById('drag-instructions');
    let files = [];
    let sortable;

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
        const newFiles = Array.from(e.target.files).filter(file => file.type === 'application/pdf');
        
        if (newFiles.length === 0) {
            showNotification('Please select valid PDF files.', 'warning');
            return;
        }
        
        files = [...files, ...newFiles];
        updateFileList();
        updateButtons();
        
        if (files.length >= 2) {
            dragInstructions.classList.remove('d-none');
        }
    }

    function updateFileList() {
        fileList.innerHTML = '';
        
        if (files.length === 0) {
            dragInstructions.classList.add('d-none');
            return;
        }
        
        const ul = document.createElement('ul');
        ul.className = 'list-group sortable-list';
        ul.id = 'sortable-files';
        
        files.forEach((file, index) => {
            const li = document.createElement('li');
            li.className = 'list-group-item d-flex justify-content-between align-items-center';
            li.dataset.fileIndex = index;
            li.innerHTML = `
                <div class="d-flex align-items-center">
                    <span class="drag-handle me-2"><i class="fas fa-grip-vertical text-muted"></i></span>
                    <i class="fas fa-file-pdf text-danger me-2"></i>
                    <span class="file-name">${file.name}</span>
                </div>
                <div>
                    <button class="btn btn-sm btn-outline-danger remove-file" data-index="${index}">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
            ul.appendChild(li);
        });
        
        fileList.appendChild(ul);
        
        // Initialize sortable
        if (sortable) {
            sortable.destroy();
        }
        
        sortable = new Sortable(ul, {
            animation: 150,
            handle: '.drag-handle',
            ghostClass: 'sortable-ghost',
            onEnd: function() {
                reorderFiles();
            }
        });
        
        // Add event listeners to remove buttons
        document.querySelectorAll('.remove-file').forEach(button => {
            button.addEventListener('click', function() {
                const index = parseInt(this.dataset.index);
                removeFile(index);
            });
        });
    }

    function reorderFiles() {
        const newOrder = Array.from(document.querySelectorAll('#sortable-files li')).map(li => {
            return parseInt(li.dataset.fileIndex);
        });
        
        const reorderedFiles = [];
        newOrder.forEach(oldIndex => {
            reorderedFiles.push(files[oldIndex]);
        });
        
        files = reorderedFiles;
        updateFileList();
    }

    function removeFile(index) {
        files.splice(index, 1);
        updateFileList();
        updateButtons();
        
        if (files.length < 2) {
            dragInstructions.classList.add('d-none');
        }
    }

    function updateButtons() {
        mergeBtn.disabled = files.length < 2;
        clearBtn.disabled = files.length === 0;
    }
    
    // Handle clear button click
    clearBtn.addEventListener('click', function() {
        files = [];
        updateFileList();
        updateButtons();
        dragInstructions.classList.add('d-none');
    });

    // Handle merge button click
    mergeBtn.addEventListener('click', async function() {
        if (files.length < 2) {
            showNotification('Please add at least two PDF files to merge.', 'warning');
            return;
        }

        try {
            // Show loading state
            loadingSpinner.style.display = 'block';
            mergeBtn.disabled = true;
            clearBtn.disabled = true;
            progressBar.classList.remove('d-none');
            progressText.textContent = 'Preparing to merge files...';
            
            // Create a new PDF document
            const mergedPdf = await PDFLib.PDFDocument.create();
            
            // Process each file
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                
                // Update progress
                const progress = Math.round((i / files.length) * 90); // Reserve 10% for final processing
                progressBarInner.style.width = `${progress}%`;
                progressText.textContent = `Processing ${file.name} (${i + 1}/${files.length})...`;
                
                try {
                    // Read the PDF file
                    const fileData = await readFileAsArrayBuffer(file);
                    
                    // Load the PDF document
                    const pdfDoc = await PDFLib.PDFDocument.load(fileData);
                    
                    // Get the number of pages
                    const pageCount = pdfDoc.getPageCount();
                    
                    // Copy all pages to the merged PDF
                    const copiedPages = await mergedPdf.copyPages(pdfDoc, Array.from(Array(pageCount).keys()));
                    copiedPages.forEach(page => {
                        mergedPdf.addPage(page);
                    });
                    
                    // Small delay to allow UI to update
                    await new Promise(resolve => setTimeout(resolve, 10));
                    
                } catch (error) {
                    console.error(`Error processing ${file.name}:`, error);
                    showNotification(`Error processing ${file.name}: ${error.message}`, 'danger');
                }
            }
            
            // Update progress for final processing
            progressBarInner.style.width = '95%';
            progressText.textContent = 'Finalizing merged PDF...';
            
            // Save the merged PDF
            const mergedPdfBytes = await mergedPdf.save();
            
            // Convert to Blob
            const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
            
            // Final progress update
            progressBarInner.style.width = '100%';
            progressText.textContent = 'PDF successfully merged! Downloading...';
            
            // Create a nice filename
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
            const fileName = `merged_document_${timestamp}.pdf`;
            
            // Download the file
            download(blob, fileName, 'application/pdf');
            
            // Show success message
            showNotification('PDF files merged successfully!', 'success');
            
        } catch (error) {
            console.error('Error merging PDFs:', error);
            showNotification(`Error merging PDFs: ${error.message}`, 'danger');
        } finally {
            // Reset UI state after a short delay
            setTimeout(() => {
                loadingSpinner.style.display = 'none';
                progressBar.classList.add('d-none');
                progressText.textContent = '';
                mergeBtn.disabled = files.length < 2;
                clearBtn.disabled = files.length === 0;
            }, 2000);
        }
    });
    
    // Helper function to read a file as ArrayBuffer
    function readFileAsArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }
    
    // Helper function to show notifications if global function isn't available
    function showNotification(message, type = 'info', duration = 3000) {
        if (window.showNotification) {
            window.showNotification(message, type, duration);
        } else {
            alert(message);
        }
    }
    
    // Function to add custom styles for sortable list
    function addSortableStyles() {
        // Check if styles already exist
        if (document.getElementById('sortable-styles')) return;
        
        const styleEl = document.createElement('style');
        styleEl.id = 'sortable-styles';
        styleEl.textContent = `
            .sortable-list .list-group-item {
                cursor: default;
                transition: background-color 0.2s ease;
                border-left: 3px solid transparent;
            }
            
            .sortable-list .list-group-item:hover {
                background-color: var(--background-color);
                border-left-color: var(--primary-color);
            }
            
            .drag-handle {
                cursor: grab;
                padding: 5px;
                border-radius: 3px;
            }
            
            .drag-handle:hover {
                background-color: rgba(0, 0, 0, 0.05);
            }
            
            .dark-theme .drag-handle:hover {
                background-color: rgba(255, 255, 255, 0.1);
            }
            
            .sortable-ghost {
                opacity: 0.4;
                background-color: var(--primary-color) !important;
            }
            
            .file-name {
                max-width: 400px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                display: inline-block;
            }
            
            .remove-file {
                min-width: auto;
                width: 32px;
                height: 32px;
                padding: 0;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            #drag-instructions {
                font-size: 0.9rem;
                background-color: var(--background-color);
                padding: 0.5rem;
                border-radius: 4px;
                border-left: 3px solid var(--primary-color);
            }
        `;
        document.head.appendChild(styleEl);
    }
}); 