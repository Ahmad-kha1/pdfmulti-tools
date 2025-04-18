/**
 * File Operations Utility for PDF Tools
 * 
 * This utility provides standardized file operations for use across
 * all PDF tools, including reading, writing, downloading, and analyzing files.
 */

class FileOperations {
    /**
     * Read a file as an ArrayBuffer
     * @param {File|Blob} file - The file to read
     * @returns {Promise<ArrayBuffer>} - The file contents as ArrayBuffer
     */
    static readAsArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('Failed to read file as ArrayBuffer'));
            reader.readAsArrayBuffer(file);
        });
    }
    
    /**
     * Read a file as text
     * @param {File|Blob} file - The file to read
     * @param {string} encoding - The text encoding to use (default: 'utf-8')
     * @returns {Promise<string>} - The file contents as string
     */
    static readAsText(file, encoding = 'utf-8') {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('Failed to read file as text'));
            reader.readAsText(file, encoding);
        });
    }
    
    /**
     * Read a file as a Data URL
     * @param {File|Blob} file - The file to read
     * @returns {Promise<string>} - The file contents as Data URL
     */
    static readAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('Failed to read file as Data URL'));
            reader.readAsDataURL(file);
        });
    }
    
    /**
     * Download a file to the user's device
     * @param {Blob|ArrayBuffer|string} data - The file data to download
     * @param {string} filename - The filename for the downloaded file
     * @param {string} mimeType - The MIME type of the file (optional)
     * @returns {Promise<boolean>} - Resolves to true if download was successful
     */
    static download(data, filename, mimeType) {
        return new Promise((resolve, reject) => {
            try {
                // Convert data to Blob if needed
                let blob;
                if (data instanceof Blob) {
                    blob = data;
                } else if (data instanceof ArrayBuffer) {
                    blob = new Blob([data], { type: mimeType || 'application/octet-stream' });
                } else if (typeof data === 'string') {
                    // If it's a data URL, extract the binary data
                    if (data.startsWith('data:')) {
                        const parts = data.split(',');
                        const matches = parts[0].match(/:(.*?);/);
                        const type = matches ? matches[1] : 'text/plain';
                        const binary = atob(parts[1]);
                        const array = new Uint8Array(binary.length);
                        for (let i = 0; i < binary.length; i++) {
                            array[i] = binary.charCodeAt(i);
                        }
                        blob = new Blob([array.buffer], { type });
                    } else {
                        blob = new Blob([data], { type: mimeType || 'text/plain' });
                    }
                } else {
                    // For objects, stringify first
                    blob = new Blob([JSON.stringify(data)], { type: mimeType || 'application/json' });
                }
                
                // Create download link
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                a.style.display = 'none';
                document.body.appendChild(a);
                
                // Trigger download
                a.click();
                
                // Clean up
                setTimeout(() => {
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    resolve(true);
                }, 100);
            } catch (error) {
                console.error('Download error:', error);
                reject(error);
            }
        });
    }
    
    /**
     * Create a Blob from various data types
     * @param {*} data - The data to convert to a Blob
     * @param {string} mimeType - The MIME type of the data (optional)
     * @returns {Promise<Blob>} - The data as a Blob
     */
    static async toBlob(data, mimeType) {
        if (data instanceof Blob) {
            return mimeType ? new Blob([await data.arrayBuffer()], { type: mimeType }) : data;
        }
        
        if (data instanceof ArrayBuffer) {
            return new Blob([data], { type: mimeType || 'application/octet-stream' });
        }
        
        if (data instanceof Uint8Array) {
            return new Blob([data.buffer], { type: mimeType || 'application/octet-stream' });
        }
        
        if (typeof data === 'string') {
            if (data.startsWith('data:')) {
                // Convert Data URL to Blob
                const parts = data.split(',');
                const matches = parts[0].match(/:(.*?);/);
                const type = mimeType || (matches ? matches[1] : 'text/plain');
                const binary = atob(parts[1]);
                const array = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i++) {
                    array[i] = binary.charCodeAt(i);
                }
                return new Blob([array.buffer], { type });
            }
            
            return new Blob([data], { type: mimeType || 'text/plain' });
        }
        
        // For objects, stringify first
        return new Blob([JSON.stringify(data)], { type: mimeType || 'application/json' });
    }
    
    /**
     * Get file information including size, type, and other metadata
     * @param {File|Blob} file - The file to analyze
     * @returns {Promise<Object>} - Information about the file
     */
    static async getFileInfo(file) {
        const info = {
            name: file.name || 'unknown',
            size: file.size,
            type: file.type || 'application/octet-stream',
            lastModified: file instanceof File ? new Date(file.lastModified) : null,
            extension: (file.name || '').split('.').pop().toLowerCase()
        };
        
        // Try to detect PDF and image specific information
        if (file.type === 'application/pdf' || info.extension === 'pdf') {
            try {
                // Use PDF.js to get page count if available
                if (typeof pdfjsLib !== 'undefined') {
                    const arrayBuffer = await FileOperations.readAsArrayBuffer(file);
                    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                    info.pageCount = pdf.numPages;
                    
                    // Get dimensions of first page
                    const page = await pdf.getPage(1);
                    const viewport = page.getViewport({ scale: 1.0 });
                    info.dimensions = {
                        width: Math.round(viewport.width),
                        height: Math.round(viewport.height)
                    };
                    
                    pdf.destroy();
                }
            } catch (error) {
                console.warn('Failed to analyze PDF:', error);
            }
        } else if (file.type.startsWith('image/')) {
            try {
                // Get image dimensions
                const dataUrl = await FileOperations.readAsDataURL(file);
                const dimensions = await FileOperations.getImageDimensions(dataUrl);
                info.dimensions = dimensions;
            } catch (error) {
                console.warn('Failed to analyze image:', error);
            }
        }
        
        return info;
    }
    
    /**
     * Get dimensions of an image
     * @param {string} dataUrl - Data URL of the image
     * @returns {Promise<Object>} - Width and height of the image
     */
    static getImageDimensions(dataUrl) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                resolve({
                    width: img.width,
                    height: img.height
                });
            };
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = dataUrl;
        });
    }
    
    /**
     * Convert file size to human-readable format
     * @param {number} bytes - File size in bytes
     * @param {boolean} binary - Use binary units (1024) instead of decimal (1000)
     * @returns {string} - Human-readable file size
     */
    static formatFileSize(bytes, binary = true) {
        if (bytes === 0) return '0 Bytes';
        
        const base = binary ? 1024 : 1000;
        const units = binary 
            ? ['Bytes', 'KiB', 'MiB', 'GiB', 'TiB'] 
            : ['Bytes', 'KB', 'MB', 'GB', 'TB'];
            
        const i = Math.floor(Math.log(bytes) / Math.log(base));
        const value = bytes / Math.pow(base, i);
        
        return `${value.toFixed(2)} ${units[i]}`;
    }
    
    /**
     * Check if a file is a supported format
     * @param {File|Blob} file - The file to check
     * @param {Array} supportedFormats - Array of supported MIME types or extensions
     * @returns {boolean} - True if the file format is supported
     */
    static isFormatSupported(file, supportedFormats) {
        const fileType = file.type.toLowerCase();
        const extension = (file.name || '').split('.').pop().toLowerCase();
        
        return supportedFormats.some(format => {
            // Check MIME type
            if (format.includes('/') && fileType === format.toLowerCase()) {
                return true;
            }
            
            // Check extension
            if (!format.includes('/') && extension === format.toLowerCase()) {
                return true;
            }
            
            return false;
        });
    }
    
    /**
     * Create a file from a URL (download)
     * @param {string} url - The URL to download
     * @param {Object} options - Download options
     * @returns {Promise<Blob>} - The downloaded file
     */
    static async downloadFromUrl(url, options = {}) {
        const requestOptions = {
            method: options.method || 'GET',
            headers: options.headers || {},
            credentials: options.credentials || 'same-origin',
            mode: options.mode || 'cors'
        };
        
        const response = await fetch(url, requestOptions);
        
        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status} - ${response.statusText}`);
        }
        
        return await response.blob();
    }
    
    /**
     * Split a file into smaller chunks
     * @param {Blob} file - The file to split
     * @param {number} chunkSize - The size of each chunk in bytes
     * @returns {Array<Blob>} - Array of file chunks
     */
    static splitFileIntoChunks(file, chunkSize = 2 * 1024 * 1024) {
        const chunks = [];
        let offset = 0;
        
        while (offset < file.size) {
            const chunk = file.slice(offset, offset + chunkSize);
            chunks.push(chunk);
            offset += chunkSize;
        }
        
        return chunks;
    }
}

// Export the FileOperations class
if (typeof module !== 'undefined') {
    module.exports = { FileOperations };
} else {
    window.FileOperations = FileOperations;
} 