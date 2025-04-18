/**
 * Compression Utility for PDF Tools
 * 
 * This utility provides methods for compressing and decompressing data
 * to improve performance when transferring large files or storing data.
 * It supports various compression algorithms and formats.
 */

class CompressionUtil {
    /**
     * Compress data using the specified algorithm
     * @param {Blob|ArrayBuffer|string} data - The data to compress
     * @param {Object} options - Compression options
     * @returns {Promise<Blob>} - The compressed data
     */
    static async compress(data, options = {}) {
        const algorithm = options.algorithm || 'deflate'; // 'deflate', 'gzip', 'brotli'
        const level = options.level || 6; // 1-9, where 9 is highest compression
        
        // Convert data to ArrayBuffer if needed
        let buffer;
        if (data instanceof Blob) {
            buffer = await data.arrayBuffer();
        } else if (data instanceof ArrayBuffer) {
            buffer = data;
        } else if (typeof data === 'string') {
            buffer = new TextEncoder().encode(data).buffer;
        } else if (data instanceof Uint8Array) {
            buffer = data.buffer;
        } else {
            // For objects, stringify first
            buffer = new TextEncoder().encode(JSON.stringify(data)).buffer;
        }
        
        // Use CompressionStream API if available (modern browsers)
        if (typeof CompressionStream !== 'undefined') {
            try {
                const stream = new CompressionStream(algorithm);
                const writer = stream.writable.getWriter();
                writer.write(new Uint8Array(buffer));
                writer.close();
                
                const reader = stream.readable.getReader();
                const chunks = [];
                
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    chunks.push(value);
                }
                
                // Combine chunks
                const totalLength = chunks.reduce((total, chunk) => total + chunk.length, 0);
                const result = new Uint8Array(totalLength);
                
                let offset = 0;
                for (const chunk of chunks) {
                    result.set(chunk, offset);
                    offset += chunk.length;
                }
                
                return new Blob([result.buffer], { type: 'application/octet-stream' });
            } catch (error) {
                console.warn('CompressionStream not available or failed:', error);
                // Fall back to pako or other libraries
            }
        }
        
        // Fallback for browsers that don't support CompressionStream
        // We'll use pako library if it's available
        if (typeof pako !== 'undefined') {
            const uint8Array = new Uint8Array(buffer);
            let result;
            
            switch (algorithm) {
                case 'deflate':
                    result = pako.deflate(uint8Array, { level });
                    break;
                case 'gzip':
                    result = pako.gzip(uint8Array, { level });
                    break;
                default:
                    throw new Error(`Compression algorithm ${algorithm} not supported by fallback method`);
            }
            
            return new Blob([result.buffer], { type: 'application/octet-stream' });
        }
        
        // If all else fails, dynamically load pako
        return await CompressionUtil.loadPako().then(() => {
            return CompressionUtil.compress(data, options);
        });
    }
    
    /**
     * Decompress data using the specified algorithm
     * @param {Blob|ArrayBuffer} compressedData - The compressed data
     * @param {Object} options - Decompression options
     * @returns {Promise<ArrayBuffer>} - The decompressed data
     */
    static async decompress(compressedData, options = {}) {
        const algorithm = options.algorithm || 'deflate'; // 'deflate', 'gzip', 'brotli'
        const outputType = options.outputType || 'arraybuffer'; // 'arraybuffer', 'text', 'json'
        
        // Convert data to ArrayBuffer if needed
        let buffer;
        if (compressedData instanceof Blob) {
            buffer = await compressedData.arrayBuffer();
        } else if (compressedData instanceof ArrayBuffer) {
            buffer = compressedData;
        } else {
            throw new Error('Compressed data must be a Blob or ArrayBuffer');
        }
        
        // Use DecompressionStream API if available (modern browsers)
        if (typeof DecompressionStream !== 'undefined') {
            try {
                const stream = new DecompressionStream(algorithm);
                const writer = stream.writable.getWriter();
                writer.write(new Uint8Array(buffer));
                writer.close();
                
                const reader = stream.readable.getReader();
                const chunks = [];
                
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    chunks.push(value);
                }
                
                // Combine chunks
                const totalLength = chunks.reduce((total, chunk) => total + chunk.length, 0);
                const result = new Uint8Array(totalLength);
                
                let offset = 0;
                for (const chunk of chunks) {
                    result.set(chunk, offset);
                    offset += chunk.length;
                }
                
                // Convert to requested output type
                return CompressionUtil.convertOutput(result.buffer, outputType);
            } catch (error) {
                console.warn('DecompressionStream not available or failed:', error);
                // Fall back to pako or other libraries
            }
        }
        
        // Fallback for browsers that don't support DecompressionStream
        // We'll use pako library if it's available
        if (typeof pako !== 'undefined') {
            const uint8Array = new Uint8Array(buffer);
            let result;
            
            switch (algorithm) {
                case 'deflate':
                    result = pako.inflate(uint8Array);
                    break;
                case 'gzip':
                    result = pako.ungzip(uint8Array);
                    break;
                default:
                    throw new Error(`Decompression algorithm ${algorithm} not supported by fallback method`);
            }
            
            // Convert to requested output type
            return CompressionUtil.convertOutput(result.buffer, outputType);
        }
        
        // If all else fails, dynamically load pako
        return await CompressionUtil.loadPako().then(() => {
            return CompressionUtil.decompress(compressedData, options);
        });
    }
    
    /**
     * Convert output to the requested type
     * @param {ArrayBuffer} buffer - The decompressed buffer
     * @param {string} outputType - The desired output type
     * @returns {ArrayBuffer|string|Object} - The converted output
     */
    static convertOutput(buffer, outputType) {
        switch (outputType) {
            case 'arraybuffer':
                return buffer;
            case 'text':
                return new TextDecoder().decode(buffer);
            case 'json':
                const text = new TextDecoder().decode(buffer);
                return JSON.parse(text);
            default:
                return buffer;
        }
    }
    
    /**
     * Dynamically load the pako library if needed
     * @returns {Promise} - Resolves when pako is loaded
     */
    static loadPako() {
        return new Promise((resolve, reject) => {
            if (typeof pako !== 'undefined') {
                resolve();
                return;
            }
            
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pako/2.1.0/pako.min.js';
            script.onload = resolve;
            script.onerror = () => reject(new Error('Failed to load pako compression library'));
            document.head.appendChild(script);
        });
    }
    
    /**
     * Calculate the compression ratio
     * @param {number} originalSize - The original size in bytes
     * @param {number} compressedSize - The compressed size in bytes
     * @returns {number} - The compression ratio (0-100%)
     */
    static getCompressionRatio(originalSize, compressedSize) {
        return Math.round((1 - (compressedSize / originalSize)) * 100);
    }
    
    /**
     * Estimate the ideal compression algorithm based on data type
     * @param {Blob|ArrayBuffer|string} data - The data to analyze
     * @param {string} mimeType - The MIME type of the data, if known
     * @returns {string} - The recommended compression algorithm
     */
    static suggestAlgorithm(data, mimeType) {
        // If already compressed format, don't try to compress further
        const compressedFormats = [
            'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
            'audio/mp3', 'audio/mp4', 'video/mp4', 'application/zip',
            'application/gzip', 'application/x-gzip', 'application/pdf'
        ];
        
        if (mimeType && compressedFormats.includes(mimeType)) {
            return 'none';
        }
        
        // For text and JSON, brotli is often the best
        if (typeof data === 'string' || mimeType === 'application/json') {
            return typeof CompressionStream !== 'undefined' ? 'brotli' : 'deflate';
        }
        
        // For other data, gzip is a good default
        return 'gzip';
    }
}

// Export the CompressionUtil class
if (typeof module !== 'undefined') {
    module.exports = { CompressionUtil };
} else {
    window.CompressionUtil = CompressionUtil;
} 