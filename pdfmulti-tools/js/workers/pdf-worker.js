importScripts('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js');
importScripts('https://cdn.jsdelivr.net/npm/docx@7.8.2/build/index.js');
importScripts('https://cdn.jsdelivr.net/npm/tesseract.js@2.1.5/dist/tesseract.min.js');

// Initialize pdf-lib
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

// Conversion memory cache
let conversionCache = new Map();

// Set up message handler
onmessage = async function(e) {
    if (e.data.type === 'convert') {
        try {
            // Extract options
            const options = e.data.options || {};
            const file = e.data.file;
            
            // Generate cache key based on file and options
            const cacheKey = `${file.name}-${file.lastModified}-${JSON.stringify(options)}`;
            
            // Check cache first
            if (conversionCache.has(cacheKey)) {
                postMessage({
                    type: 'progress',
                    progress: 100
                });
                
                postMessage({
                    type: 'complete',
                    result: conversionCache.get(cacheKey)
                });
                
                return;
            }
            
            // Start conversion
            const result = await convertPDFToWord(file, options);
            
            // Cache the result for future use
            conversionCache.set(cacheKey, result);
            
            // Limit cache size to prevent memory issues
            if (conversionCache.size > 5) {
                const oldestKey = conversionCache.keys().next().value;
                conversionCache.delete(oldestKey);
            }
            
            postMessage({
                type: 'complete',
                result: result
            });
        } catch (error) {
            postMessage({
                type: 'error',
                error: error.message || 'Unknown error during conversion'
            });
        }
    } else if (e.data.type === 'clearCache') {
        conversionCache.clear();
        postMessage({
            type: 'cacheCleared'
        });
    }
};

// Main conversion function
async function convertPDFToWord(file, options = {}) {
    try {
        // Merge default options
        const mergedOptions = {
            preserveFormatting: true,
            extractImages: true,
            performOCR: false,
            pageRange: 'all',
            fontFamily: 'Arial',
            fontSize: '12',
            lineSpacing: '1.0',
            textAlignment: 'left',
            marginTop: '2.54',
            marginBottom: '2.54',
            marginLeft: '2.54',
            marginRight: '2.54',
            pageOrientation: 'portrait',
            pageSize: 'A4',
            addPageNumbers: false,
            ...options
        };

        // Initialize PDF.js
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
        
        // Load the PDF document
        const pdf = await pdfjsLib.getDocument({ data: file }).promise;
        const numPages = pdf.numPages;
        
        // Determine pages to process
        let pagesToProcess = [];
        if (mergedOptions.pageRange === 'all') {
            pagesToProcess = Array.from({ length: numPages }, (_, i) => i + 1);
        } else if (mergedOptions.pageRange.includes('-')) {
            const [start, end] = mergedOptions.pageRange.split('-').map(num => parseInt(num.trim()));
            pagesToProcess = Array.from({ length: end - start + 1 }, (_, i) => start + i);
        } else {
            pagesToProcess = mergedOptions.pageRange.split(',').map(num => parseInt(num.trim()));
        }
        
        // Filter out invalid page numbers
        pagesToProcess = pagesToProcess.filter(pageNum => pageNum > 0 && pageNum <= numPages);
        
        // Create a new Word document
        const doc = new docx.Document({
            creator: "PDF to Word Converter",
            title: "Converted Document",
            description: "Document converted from PDF to Word",
            styles: {
                paragraphStyles: [
                    {
                        id: "Normal",
                        name: "Normal",
                        run: {
                            font: mergedOptions.fontFamily,
                            size: parseInt(mergedOptions.fontSize) * 2,  // Convert pt to half-points
                        },
                        paragraph: {
                            spacing: {
                                line: parseInt(parseFloat(mergedOptions.lineSpacing) * 240),
                                before: 0,
                                after: 0
                            },
                            alignment: getAlignment(mergedOptions.textAlignment)
                        }
                    }
                ]
            }
        });
        
        // Process each page
        let processedPages = 0;
        const totalPages = pagesToProcess.length;
        
        for (const pageNum of pagesToProcess) {
            const page = await pdf.getPage(pageNum);
            const result = await processPage(page, pageNum, doc, mergedOptions);
            
            if (result.success) {
                processedPages++;
                const progressPercent = Math.round((processedPages / totalPages) * 100);
                self.postMessage({ 
                    type: 'progress', 
                    data: { 
                        progress: progressPercent,
                        message: `Processing page ${processedPages} of ${totalPages}`
                    } 
                });
            } else {
                console.error(`Error processing page ${pageNum}:`, result.error);
            }
        }
        
        // Generate the Word document
        const buffer = await docx.Packer.toBuffer(doc);
        return buffer;
    } catch (error) {
        console.error('Error converting PDF to Word:', error);
        throw error;
    }
}

// Helper functions
function readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsArrayBuffer(file);
    });
}

function dataUrlToArrayBuffer(dataUrl) {
    const base64 = dataUrl.split(',')[1];
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

async function extractParagraphs(textContent, options) {
    const paragraphs = [];
    const items = textContent.items;
    
    if (!items || items.length === 0) {
        return paragraphs;
    }
    
    // Group items by y-position (line)
    const lines = {};
    for (const item of items) {
        const y = Math.round(item.transform[5]);
        if (!lines[y]) {
            lines[y] = [];
        }
        lines[y].push(item);
    }
    
    // Sort lines by y-position (top to bottom)
    const sortedYPositions = Object.keys(lines).sort((a, b) => b - a);
    
    // Process each line
    let currentParagraph = null;
    let lastY = null;
    
    for (const y of sortedYPositions) {
        // Sort items in this line by x-position (left to right)
        const lineItems = lines[y].sort((a, b) => a.transform[4] - b.transform[4]);
        
        // Detect if this is a new paragraph based on vertical spacing
        const lineGap = lastY ? Math.abs(parseInt(lastY) - parseInt(y)) : 0;
        if (!currentParagraph || lineGap > 15) {
            // Create a new paragraph if needed
            if (currentParagraph && currentParagraph.children && currentParagraph.children.length > 0) {
                paragraphs.push(currentParagraph);
            }
            
            currentParagraph = new docx.Paragraph({
                spacing: {
                    after: 200,
                    line: options.lineSpacing ? parseInt(options.lineSpacing) : 276,
                    lineRule: docx.LineRuleType.AUTO
                },
                alignment: options.textAlignment ? getAlignment(options.textAlignment) : docx.AlignmentType.LEFT
            });
            
            if (!currentParagraph.children) {
                currentParagraph.children = [];
            }
        }
        
        // Process items in the line
        if (currentParagraph) {
            const textRuns = createTextRunsForLine(lineItems, options);
            if (textRuns && textRuns.length > 0) {
                currentParagraph.children.push(...textRuns);
            }
        }
        
        lastY = y;
    }
    
    // Add the last paragraph if it has content
    if (currentParagraph && currentParagraph.children && currentParagraph.children.length > 0) {
        paragraphs.push(currentParagraph);
    }
    
    return paragraphs;
}

function createTextRunsForLine(lineItems, options) {
    const textRuns = [];
    let currentText = '';
    let currentStyle = null;
    
    for (const item of lineItems) {
        if (!item.str || item.str.trim() === '') continue;
        
        // Extract style information
        const fontSize = item.height ? Math.round(item.height * 2) : 11; // Approximate font size
        const isBold = item.fontName && item.fontName.toLowerCase().includes('bold');
        const isItalic = item.fontName && item.fontName.toLowerCase().includes('italic');
        
        const newStyle = {
            fontSize: options.fontSize ? parseInt(options.fontSize) : fontSize,
            bold: isBold,
            italic: isItalic,
            font: options.fontFamily || (item.fontName ? item.fontName.replace(/[^a-zA-Z0-9]/g, '') : 'Arial')
        };
        
        // Check if style has changed
        const styleChanged = currentStyle && (
            currentStyle.fontSize !== newStyle.fontSize ||
            currentStyle.bold !== newStyle.bold ||
            currentStyle.italic !== newStyle.italic ||
            currentStyle.font !== newStyle.font
        );
        
        // If style changed or this is the first item, create a new text run for previous text
        if (styleChanged && currentText) {
            textRuns.push(new docx.TextRun({
                text: currentText,
                size: currentStyle.fontSize,
                bold: currentStyle.bold,
                italic: currentStyle.italic,
                font: currentStyle.font
            }));
            currentText = item.str;
            currentStyle = newStyle;
        } else {
            // First item or same style, append text
            if (!currentStyle) {
                currentStyle = newStyle;
            }
            currentText += (currentText ? ' ' : '') + item.str;
        }
    }
    
    // Add the last text run
    if (currentText) {
        textRuns.push(new docx.TextRun({
            text: currentText,
            size: currentStyle ? currentStyle.fontSize : (options.fontSize ? parseInt(options.fontSize) : 11),
            bold: currentStyle ? currentStyle.bold : false,
            italic: currentStyle ? currentStyle.italic : false,
            font: currentStyle ? currentStyle.font : (options.fontFamily || 'Arial')
        }));
    }
    
    return textRuns;
}

/**
 * Helper function to get page size based on the selected option
 * @param {string} pageSize - The page size option (A4, Letter, etc.)
 * @returns {object} Page size object with width and height
 */
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

/**
 * Helper function to get alignment type based on the selected option
 * @param {string} alignment - The text alignment option (left, center, right, justify)
 * @returns {object} Alignment type from docx library
 */
function getAlignment(alignment) {
    switch (alignment.toLowerCase()) {
        case 'center':
            return docx.AlignmentType.CENTER;
        case 'right':
            return docx.AlignmentType.RIGHT;
        case 'justify':
            return docx.AlignmentType.JUSTIFIED;
        case 'left':
        default:
            return docx.AlignmentType.LEFT;
    }
}

// Extract images from a PDF page
async function extractImagesFromPage(page) {
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = new OffscreenCanvas(viewport.width, viewport.height);
    const ctx = canvas.getContext('2d');
    
    // Render PDF page to canvas
    await page.render({
        canvasContext: ctx,
        viewport: viewport
    }).promise;
    
    // Get image data from canvas
    const imageDataUrl = canvas.toDataURL('image/png');
    
    // In a real implementation, you'd extract images from operatorList
    // For simplicity, we're just returning the rendered page as an image
    return imageDataUrl;
}

// Perform OCR on image data
async function performOCR(imageData, lang = 'eng') {
    try {
        // Initialize worker
        const worker = await Tesseract.createWorker();
        
        // Load language
        await worker.loadLanguage(lang);
        await worker.initialize(lang);
        
        // Recognize text
        const { data } = await worker.recognize(imageData);
        
        // Terminate worker
        await worker.terminate();
        
        return data.text;
    } catch (error) {
        console.error('OCR error:', error);
        throw new Error(`OCR failed: ${error.message || 'Unknown error'}`);
    }
}

// Map PDF font to Word font
function getFontFamily(pdfFontName) {
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
    if (fontName.includes('comic')) return 'Comic Sans MS';
    if (fontName.includes('impact')) return 'Impact';
    if (fontName.includes('garamond')) return 'Garamond';
    
    // Extract common font name without style indicators
    const cleanName = fontName
        .replace(/[-_+]/g, ' ')
        .replace(/(bold|italic|oblique|regular|medium|light|thin|heavy|black|underline|strike)/gi, '')
        .trim();
    
    // Capitalize first letter of each word
    return cleanName.split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ') || 'Calibri';
}

async function processPage(page, pageNum, doc, options) {
    try {
        // Extract text content
        const textContent = await page.getTextContent();
        
        // Extract paragraphs from text content
        const extractedParagraphs = await extractParagraphs(textContent, options);
        const paragraphs = extractedParagraphs.filter(p => p && p.children && p.children.length > 0);
        
        // Create a new section for each page
        const section = new docx.Section({
            properties: {
                page: {
                    size: getPageSize(options.pageSize),
                    margin: {
                        top: options.marginTop ? parseInt(options.marginTop) : 720,
                        right: options.marginRight ? parseInt(options.marginRight) : 720,
                        bottom: options.marginBottom ? parseInt(options.marginBottom) : 720,
                        left: options.marginLeft ? parseInt(options.marginLeft) : 720
                    },
                    orientation: options.pageOrientation === 'landscape' ? 
                        docx.PageOrientation.LANDSCAPE : docx.PageOrientation.PORTRAIT
                }
            },
            children: []
        });
        
        // Add header with page number if requested
        if (options.addPageNumbers) {
            section.headers = {
                default: new docx.Header({
                    children: [
                        new docx.Paragraph({
                            alignment: docx.AlignmentType.RIGHT,
                            children: [
                                new docx.TextRun(`Page ${pageNum}`)
                            ]
                        })
                    ]
                })
            };
        }
        
        // Add paragraphs to the section
        if (paragraphs.length > 0) {
            section.children.push(...paragraphs);
        } else {
            // Add an empty paragraph if no text was extracted
            section.children.push(new docx.Paragraph({
                children: [new docx.TextRun("")]
            }));
        }
        
        // Extract images if enabled
        if (options.extractImages) {
            try {
                const imageData = await extractImagesFromPage(page);
                if (imageData) {
                    // Add extracted image to document
                    const imageParagraph = new docx.Paragraph({
                        children: [
                            new docx.ImageRun({
                                data: imageData,
                                transformation: {
                                    width: 500,
                                    height: 300
                                }
                            })
                        ]
                    });
                    section.children.push(imageParagraph);
                }
            } catch (err) {
                console.error("Error extracting images:", err);
            }
        }
        
        // Add the section to the document
        doc.addSection(section);
        
        // Return progress information
        return { success: true, pageNum };
    } catch (err) {
        console.error(`Error processing page ${pageNum}:`, err);
        return { success: false, pageNum, error: err.message };
    }
} 