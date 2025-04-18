/**
 * PDF Tools - Main Application Module
 * 
 * This module integrates all the utilities and tools into a cohesive interface.
 * It manages the loading of required libraries, initializes tools, and provides
 * a unified API for interacting with the PDF processing utilities.
 */

class PDFTools {
    constructor() {
        // Initialize core utilities
        this.batchProcessor = null;
        this.cacheManager = null;
        this.settingsManager = window.settingsManager || null;
        
        // Tool status tracking
        this.activeTools = new Set();
        this.loadedLibraries = new Set();
        this.pendingLibraries = new Map();
        
        // App state
        this.initialized = false;
        this.initializing = false;
        
        // Bind methods
        this.init = this.init.bind(this);
        this.loadTool = this.loadTool.bind(this);
        this.loadLibrary = this.loadLibrary.bind(this);
        this.registerTool = this.registerTool.bind(this);
        this.getToolInstance = this.getToolInstance.bind(this);
    }
    
    /**
     * Initialize the PDF Tools application
     * @param {Object} options - Initialization options
     * @returns {Promise<PDFTools>} - Resolves when initialization is complete
     */
    async init(options = {}) {
        if (this.initialized || this.initializing) {
            return this;
        }
        
        this.initializing = true;
        
        try {
            // Load required utilities
            if (!this.settingsManager) {
                await this.loadLibrary('js/utils/settings-manager.js');
                this.settingsManager = window.settingsManager;
            }
            
            await this.loadLibrary('js/batch-processor.js');
            await this.loadLibrary('js/utils/cache-manager.js');
            await this.loadLibrary('js/utils/compression.js');
            await this.loadLibrary('js/utils/file-operations.js');
            
            // Create instances
            this.batchProcessor = new BatchProcessor(options.batchProcessor || {});
            this.cacheManager = new CacheManager(options.cacheManager || {});
            
            // Set default settings
            const defaultSettings = {
                'general.theme': 'light',
                'general.autoSave': true,
                'general.maxConcurrentJobs': navigator.hardwareConcurrency || 4,
                'general.defaultDownloadFormat': 'zip',
                'tools.pdfToWord.preserveFormatting': true,
                'tools.pdfToWord.outputFormat': 'docx',
                'tools.pdfToPng.quality': 'medium',
                'tools.pdfToPng.transparentBg': false
            };
            
            this.settingsManager.setDefaults(defaultSettings);
            
            // Initialize active tool if on a tool page
            const toolMatch = window.location.pathname.match(/\/tools\/([a-zA-Z0-9-]+)\.html$/);
            if (toolMatch) {
                const toolName = toolMatch[1].replace(/-/g, '');
                await this.loadTool(toolName);
            }
            
            this.initialized = true;
            this.initializing = false;
            
            // Dispatch initialization event
            window.dispatchEvent(new CustomEvent('pdf-tools-initialized', { detail: this }));
            
            console.log('PDF Tools initialized successfully');
            
            return this;
        } catch (error) {
            this.initializing = false;
            console.error('PDF Tools initialization failed:', error);
            throw error;
        }
    }
    
    /**
     * Load a PDF processing tool
     * @param {string} toolName - Name of the tool to load
     * @returns {Promise<Object>} - The tool instance
     */
    async loadTool(toolName) {
        if (this.activeTools.has(toolName)) {
            return this.getToolInstance(toolName);
        }
        
        try {
            // Convert from kebab-case to camelCase if needed
            const normalizedName = toolName.replace(/-([a-z])/g, g => g[1].toUpperCase());
            
            // Load tool module
            await this.loadLibrary(`js/tools/${normalizedName}.js`);
            
            // Register the tool
            if (window[`${normalizedName}Tool`]) {
                return this.registerTool(normalizedName, window[`${normalizedName}Tool`]);
            } else {
                throw new Error(`Tool ${normalizedName} did not register properly`);
            }
        } catch (error) {
            console.error(`Failed to load tool ${toolName}:`, error);
            throw error;
        }
    }
    
    /**
     * Load a JavaScript library dynamically
     * @param {string} url - URL of the library to load
     * @returns {Promise<void>} - Resolves when the library is loaded
     */
    loadLibrary(url) {
        // If already loaded, return immediately
        if (this.loadedLibraries.has(url)) {
            return Promise.resolve();
        }
        
        // If already loading, return the existing promise
        if (this.pendingLibraries.has(url)) {
            return this.pendingLibraries.get(url);
        }
        
        // Create a new loading promise
        const promise = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = url;
            script.async = true;
            
            script.onload = () => {
                this.loadedLibraries.add(url);
                this.pendingLibraries.delete(url);
                resolve();
            };
            
            script.onerror = () => {
                this.pendingLibraries.delete(url);
                reject(new Error(`Failed to load library: ${url}`));
            };
            
            document.head.appendChild(script);
        });
        
        this.pendingLibraries.set(url, promise);
        return promise;
    }
    
    /**
     * Register a tool with the application
     * @param {string} toolName - Name of the tool
     * @param {Function} ToolClass - Tool class constructor
     * @returns {Object} - The tool instance
     */
    registerTool(toolName, ToolClass) {
        if (this.activeTools.has(toolName)) {
            return this.getToolInstance(toolName);
        }
        
        // Create tool instance
        const toolInstance = new ToolClass({
            batchProcessor: this.batchProcessor,
            cacheManager: this.cacheManager,
            settingsManager: this.settingsManager,
            fileOperations: window.FileOperations,
            compression: window.CompressionUtil
        });
        
        // Register the tool
        this.activeTools.add(toolName);
        window[`${toolName}ToolInstance`] = toolInstance;
        
        return toolInstance;
    }
    
    /**
     * Get a tool instance by name
     * @param {string} toolName - Name of the tool
     * @returns {Object} - The tool instance
     */
    getToolInstance(toolName) {
        // Convert from kebab-case to camelCase if needed
        const normalizedName = toolName.replace(/-([a-z])/g, g => g[1].toUpperCase());
        
        const instanceName = `${normalizedName}ToolInstance`;
        if (window[instanceName]) {
            return window[instanceName];
        }
        
        throw new Error(`Tool ${toolName} is not loaded`);
    }
    
    /**
     * Check if a tool is loaded
     * @param {string} toolName - Name of the tool
     * @returns {boolean} - True if the tool is loaded
     */
    isToolLoaded(toolName) {
        return this.activeTools.has(toolName.replace(/-([a-z])/g, g => g[1].toUpperCase()));
    }
    
    /**
     * Get the batch processor
     * @returns {BatchProcessor} - The batch processor instance
     */
    getBatchProcessor() {
        return this.batchProcessor;
    }
    
    /**
     * Get the cache manager
     * @returns {CacheManager} - The cache manager instance
     */
    getCacheManager() {
        return this.cacheManager;
    }
    
    /**
     * Get the settings manager
     * @returns {SettingsManager} - The settings manager instance
     */
    getSettingsManager() {
        return this.settingsManager;
    }
}

// Create global instance
window.pdfTools = new PDFTools();

// Initialize when document is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.pdfTools.init()
        .catch(error => console.error('Failed to initialize PDF Tools:', error));
}); 