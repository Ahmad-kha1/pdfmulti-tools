document.addEventListener('DOMContentLoaded', function() {
    const dropArea = document.getElementById('drop-area');
    const fileInput = document.getElementById('file-input');
    const fileInfo = document.getElementById('file-info');
    const fileSizeSpan = document.getElementById('file-size');
    const totalPagesSpan = document.getElementById('total-pages');
    const outputFormat = document.getElementById('output-format');
    const autoDetectTables = document.getElementById('auto-detect-tables');
    const preserveFormatting = document.getElementById('preserve-formatting');
    const extractImages = document.getElementById('extract-images');
    const tableSelection = document.getElementById('table-selection');
    const tableList = document.getElementById('table-list');
    const estimatedTimeSpan = document.getElementById('estimated-time');
    const convertBtn = document.getElementById('convert-btn');
    const loadingSpinner = document.getElementById('loading-spinner');
    let currentFile = null;
    let detectedTables = [];

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

        // Simulate getting page count and detecting tables
        const pageCount = Math.floor(Math.random() * 50) + 1;
        totalPagesSpan.textContent = pageCount;

        // Simulate table detection
        detectTables(pageCount);

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

    function detectTables(pageCount) {
        // Simulate table detection
        detectedTables = [];
        const tableCount = Math.floor(Math.random() * 10) + 1;
        
        for (let i = 1; i <= tableCount; i++) {
            const page = Math.floor(Math.random() * pageCount) + 1;
            const rows = Math.floor(Math.random() * 20) + 5;
            const cols = Math.floor(Math.random() * 10) + 3;
            
            detectedTables.push({
                id: i,
                page: page,
                rows: rows,
                cols: cols,
                selected: true
            });
        }

        updateTableList();
    }

    function updateTableList() {
        tableList.innerHTML = '';
        detectedTables.forEach(table => {
            const tableItem = document.createElement('div');
            tableItem.className = 'form-check mb-2';
            tableItem.innerHTML = `
                <input class="form-check-input" type="checkbox" id="table-${table.id}" 
                    ${table.selected ? 'checked' : ''} onchange="toggleTable(${table.id})">
                <label class="form-check-label" for="table-${table.id}">
                    Table ${table.id} (Page ${table.page}, ${table.rows}×${table.cols})
                </label>
            `;
            tableList.appendChild(tableItem);
        });

        tableSelection.classList.toggle('d-none', !autoDetectTables.checked);
    }

    window.toggleTable = function(tableId) {
        const table = detectedTables.find(t => t.id === tableId);
        if (table) {
            table.selected = !table.selected;
            updateConversionTimeEstimate();
        }
    };

    // Update conversion time estimate when options change
    [outputFormat, autoDetectTables, preserveFormatting, extractImages].forEach(element => {
        element.addEventListener('change', updateConversionTimeEstimate);
    });

    function updateConversionTimeEstimate() {
        if (!currentFile) return;

        let baseTime = 5; // Base time in seconds
        const pageCount = parseInt(totalPagesSpan.textContent);
        const fileSize = currentFile.size;

        // Adjust time based on file size and page count
        baseTime += Math.ceil(pageCount * 0.5);
        baseTime += Math.ceil(fileSize / (1024 * 1024) * 0.1);

        // Adjust time based on selected options
        if (outputFormat.value === 'xls') baseTime += 2;
        if (preserveFormatting.checked) baseTime += 3;
        if (extractImages.checked) baseTime += 5;
        
        // Adjust time based on number of tables to process
        if (autoDetectTables.checked) {
            const selectedTables = detectedTables.filter(t => t.selected).length;
            baseTime += selectedTables * 2;
        }

        estimatedTimeSpan.textContent = `${baseTime} seconds`;
    }

    // Handle convert button click
    convertBtn.addEventListener('click', async function() {
        if (!currentFile) return;

        loadingSpinner.style.display = 'block';
        convertBtn.disabled = true;

        try {
            // Here you would implement the actual PDF to Excel conversion logic
            // For now, we'll just simulate the process
            const estimatedTime = parseInt(estimatedTimeSpan.textContent);
            await new Promise(resolve => setTimeout(resolve, estimatedTime * 1000));
            
            // Create a download link for the converted document
            const downloadLink = document.createElement('a');
            downloadLink.href = '#'; // Replace with actual converted document URL
            downloadLink.download = `converted-document.${outputFormat.value}`;
            downloadLink.click();
        } catch (error) {
            console.error('Error converting PDF:', error);
            alert('An error occurred while converting the PDF. Please try again.');
        } finally {
            loadingSpinner.style.display = 'none';
            convertBtn.disabled = false;
        }
    });
}); 