/**
 * global-settings.js
 * Applies settings from settings-manager.js globally to all PDF tools
 * Handles performance optimizations and download behavior
 */

// Apply global settings when document is ready
document.addEventListener('DOMContentLoaded', function() {
    // Initialize global settings
    initializeGlobalSettings();
});

/**
 * Initialize global settings for all PDF tools
 */
function initializeGlobalSettings() {
    // Apply theme first for visual consistency
    settingsManager.applyTheme();
    
    // Apply font size settings
    applyFontSizeSettings();
    
    // Setup worker pool based on performance settings
    setupWorkerPool();
    
    // Apply download behavior settings
    applyDownloadSettings();
    
    // Setup debug mode if enabled
    if (settingsManager.get('advanced.debugMode', false)) {
        enableDebugMode();
    }
}

/**
 * Apply font size settings to the entire application
 */
function applyFontSizeSettings() {
    const fontSize = settingsManager.get('appearance.fontSize', 100);
    document.documentElement.style.fontSize = `${fontSize}%`;
}

/**
 * Setup worker pool based on performance settings
 */
function setupWorkerPool() {
    // Check if Web Workers are enabled in settings
    if (!settingsManager.get('performance.useWorkers', true)) {
        window.useWebWorkers = false;
        return;
    }
    
    // Initialize worker pool
    window.useWebWorkers = true;
    window.workerPool = [];
    
    // Get max concurrent jobs from settings (default to hardware concurrency or 4)
    const hardwareConcurrency = navigator.hardwareConcurrency || 4;
    const maxConcurrentJobs = settingsManager.get('performance.maxConcurrentJobs', hardwareConcurrency);
    
    // Create workers based on settings
    for (let i = 0; i < maxConcurrentJobs; i++) {
        window.workerPool.push({
            id: i,
            busy: false,
            worker: null
        });
    }
    
    // Global function to get available worker
    window.getAvailableWorker = function(workerUrl) {
        for (let i = 0; i < window.workerPool.length; i++) {
            if (!window.workerPool[i].busy) {
                // Create worker if it doesn't exist
                if (!window.workerPool[i].worker) {
                    window.workerPool[i].worker = new Worker(workerUrl);
                }
                window.workerPool[i].busy = true;
                return window.workerPool[i];
            }
        }
        return null; // No workers available
    };
    
    // Global function to release worker
    window.releaseWorker = function(workerId) {
        const worker = window.workerPool.find(w => w.id === workerId);
        if (worker) {
            worker.busy = false;
        }
    };
}

/**
 * Apply download settings globally
 */
function applyDownloadSettings() {
    // Set global download behavior
    window.autoDownloadEnabled = settingsManager.get('downloads.autoDownload', true);
    window.filenameTemplate = settingsManager.get('downloads.filenameTemplate', '{filename}_{tool}_{date}');
    window.overwriteExisting = settingsManager.get('downloads.overwriteExisting', true);
    window.zipMultiFiles = settingsManager.get('downloads.zipMultiFiles', false);
    
    // Global function to download file with settings applied
    window.downloadFileWithSettings = function(blob, filename, toolName) {
        if (!blob) {
            console.error('Blob is null or undefined');
            return;
        }
        
        // Check if auto-download is enabled
        if (!window.autoDownloadEnabled) {
            return blob; // Return blob for manual download
        }
        
        // Apply filename template
        let formattedFilename = window.filenameTemplate;
        
        // Remove file extension if present
        const filenameWithoutExt = filename.replace(/\.[^.]+$/, '');
        const extension = filename.match(/\.[^.]+$/)?.[0] || '';
        
        // Get current date and time
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0]; 
        const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
        
        // Replace template variables
        formattedFilename = formattedFilename.replace('{filename}', filenameWithoutExt)
            .replace('{tool}', toolName || 'pdf-tool')
            .replace('{date}', dateStr)
            .replace('{time}', timeStr);
            
        // Add extension back
        formattedFilename += extension;
        
        // Create download link
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = formattedFilename;
        
        // Trigger download
        document.body.appendChild(a);
        a.click();
        
        // Clean up
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
        
        return blob;
    };
}

/**
 * Enable debug mode with console logging
 */
function enableDebugMode() {
    window.debugMode = true;
    
    // Enhance console.log for debugging
    const originalConsoleLog = console.log;
    console.log = function() {
        const args = Array.from(arguments);
        const timestamp = new Date().toISOString();
        originalConsoleLog.apply(console, [`[${timestamp}]`, ...args]);
    };
    
    console.log('Debug mode enabled');
    
    // Log global settings
    console.log('Global settings:', {
        theme: settingsManager.get('general.theme', 'light'),
        fontSize: settingsManager.get('appearance.fontSize', 100),
        maxConcurrentJobs: settingsManager.get('performance.maxConcurrentJobs', 4),
        useWebWorkers: settingsManager.get('performance.useWorkers', true),
        enableCache: settingsManager.get('performance.enableCache', true),
        autoDownload: settingsManager.get('downloads.autoDownload', true),
        filenameTemplate: settingsManager.get('downloads.filenameTemplate', '{filename}_{tool}_{date}')
    });
}

// Helper function to check if cache is enabled
function isCacheEnabled() {
    return settingsManager.get('performance.enableCache', true);
}

// Global cache functions
if (typeof window !== 'undefined') {
    // Cache functions for the application
    window.cacheEnabled = isCacheEnabled();
    
    // Save data to cache
    window.saveToCache = function(key, data, ttl = null) {
        if (!window.cacheEnabled) return false;
        
        const cacheKey = `pdf_tools_cache_${key}`;
        const timestamp = Date.now();
        const cacheTTL = ttl || settingsManager.get('performance.cacheTTL', 3600000); // Default: 1 hour
        
        const cacheData = {
            data: data,
            timestamp: timestamp,
            expiry: timestamp + cacheTTL
        };
        
        try {
            localStorage.setItem(cacheKey, JSON.stringify(cacheData));
            return true;
        } catch (error) {
            console.error('Error saving to cache:', error);
            return false;
        }
    };
    
    // Get data from cache
    window.getFromCache = function(key) {
        if (!window.cacheEnabled) return null;
        
        const cacheKey = `pdf_tools_cache_${key}`;
        const cachedDataStr = localStorage.getItem(cacheKey);
        
        if (!cachedDataStr) return null;
        
        try {
            const cachedData = JSON.parse(cachedDataStr);
            
            // Check expiry
            if (Date.now() > cachedData.expiry) {
                localStorage.removeItem(cacheKey); // Remove expired item
                return null;
            }
            
            return cachedData.data;
        } catch (error) {
            console.error('Error retrieving from cache:', error);
            return null;
        }
    };
    
    // Clear specific cache entry
    window.clearCacheItem = function(key) {
        const cacheKey = `pdf_tools_cache_${key}`;
        localStorage.removeItem(cacheKey);
    };
    
    // Clear all cache
    window.clearAllCache = function() {
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('pdf_tools_cache_')) {
                localStorage.removeItem(key);
            }
        });
        
        // Clear IndexedDB cache if available
        if (window.indexedDB) {
            const DBDeleteRequest = indexedDB.deleteDatabase('pdf_tools_cache');
            DBDeleteRequest.onsuccess = function() {
                console.log('IndexedDB cache deleted successfully');
            };
        }
    };
} 