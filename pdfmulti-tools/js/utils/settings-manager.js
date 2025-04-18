/**
 * settings-manager.js
 * Manages application settings, provides methods to get/set settings,
 * and handles saving to localStorage and applying settings.
 */

/**
 * Settings Manager Module
 * Handles loading, saving, and applying application settings
 */
const settingsManager = (function() {
    // Default settings
    const DEFAULT_SETTINGS = {
        general: {
            autoSave: true,
            rememberLastTool: false,
            language: 'en',
            theme: 'light'
        },
        appearance: {
            fontSize: 100,
            showToolTips: true,
            animationsEnabled: true,
            highContrastMode: false
        },
        performance: {
            useWorkers: true,
            maxConcurrentJobs: 4,
            enableCache: true,
            cacheTTL: 3600000, // 1 hour
            renderMode: 'normal',
            lowMemoryMode: false
        },
        downloads: {
            autoDownload: true,
            filenameTemplate: '{filename}_{tool}_{date}',
            overwriteExisting: true,
            zipMultiFiles: false,
            saveLocation: 'downloads'
        },
        advanced: {
            debugMode: false,
            allFormats: false,
            securityLevel: 'standard',
            customLibraries: ''
        }
    };

    // Storage key for settings
    const STORAGE_KEY = 'pdf_tools_settings';
    
    // Internal settings object
    let currentSettings = {};
    
    /**
     * Load settings from localStorage
     */
    function loadSettings() {
        try {
            const storedSettings = localStorage.getItem(STORAGE_KEY);
            currentSettings = storedSettings 
                ? deepMerge(DEFAULT_SETTINGS, JSON.parse(storedSettings)) 
                : {...DEFAULT_SETTINGS};
                
            if (isDebugMode()) {
                console.log('Settings loaded:', currentSettings);
            }
        } catch (error) {
            console.error('Error loading settings:', error);
            currentSettings = {...DEFAULT_SETTINGS};
        }
        
        return currentSettings;
    }
    
    /**
     * Save settings to localStorage
     */
    function saveSettings() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(currentSettings));
            if (isDebugMode()) {
                console.log('Settings saved:', currentSettings);
            }
            return true;
        } catch (error) {
            console.error('Error saving settings:', error);
            return false;
        }
    }
    
    /**
     * Deep merge of objects
     * @param {Object} target - Target object
     * @param {Object} source - Source object
     * @returns {Object} - Merged object
     */
    function deepMerge(target, source) {
        const output = {...target};
        
        if (isObject(target) && isObject(source)) {
            Object.keys(source).forEach(key => {
                if (isObject(source[key])) {
                    if (!(key in target)) {
                        output[key] = source[key];
                    } else {
                        output[key] = deepMerge(target[key], source[key]);
                    }
                } else {
                    output[key] = source[key];
                }
            });
        }
        
        return output;
    }
    
    /**
     * Check if value is an object
     * @param {*} item - Item to check
     * @returns {boolean} - True if object
     */
    function isObject(item) {
        return (item && typeof item === 'object' && !Array.isArray(item));
    }
    
    /**
     * Get a setting value
     * @param {string} path - Dot notation path to setting (e.g., 'general.theme')
     * @param {*} defaultValue - Default value if setting not found
     * @returns {*} - Setting value
     */
    function getSetting(path, defaultValue) {
        if (!currentSettings || Object.keys(currentSettings).length === 0) {
            loadSettings();
        }
        
        const parts = path.split('.');
        let current = currentSettings;
        
        for (const part of parts) {
            if (current === undefined || current === null || typeof current !== 'object') {
                return defaultValue;
            }
            current = current[part];
        }
        
        return current !== undefined ? current : defaultValue;
    }
    
    /**
     * Set a setting value
     * @param {string} path - Dot notation path to setting (e.g., 'general.theme')
     * @param {*} value - Value to set
     * @returns {boolean} - True if successful
     */
    function setSetting(path, value) {
        if (!currentSettings || Object.keys(currentSettings).length === 0) {
            loadSettings();
        }
        
        const parts = path.split('.');
        let current = currentSettings;
        
        // Navigate to the last parent
        for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i];
            if (!(part in current) || typeof current[part] !== 'object') {
                current[part] = {};
            }
            current = current[part];
        }
        
        // Set the value
        current[parts[parts.length - 1]] = value;
        
        // If auto-save is enabled, save settings
        if (getSetting('general.autoSave', true)) {
            return saveSettings();
        }
        
        return true;
    }
    
    /**
     * Check if debug mode is enabled
     * @returns {boolean} - True if debug mode enabled
     */
    function isDebugMode() {
        return getSetting('advanced.debugMode', false);
    }
    
    /**
     * Apply theme setting to document
     */
    function applyTheme() {
        const theme = getSetting('general.theme', 'light');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        // Determine theme based on system or user preference
        let effectiveTheme = theme;
        if (theme === 'system') {
            effectiveTheme = prefersDark ? 'dark' : 'light';
        }
        
        // Set theme class on html element
        document.documentElement.classList.remove('theme-light', 'theme-dark');
        document.documentElement.classList.add(`theme-${effectiveTheme}`);
        
        // Set Bootstrap data-bs-theme attribute
        document.documentElement.setAttribute('data-bs-theme', effectiveTheme);
        
        // Apply high contrast if enabled
        if (getSetting('appearance.highContrastMode', false)) {
            document.documentElement.classList.add('high-contrast');
        } else {
            document.documentElement.classList.remove('high-contrast');
        }
        
        // Apply animations setting
        if (!getSetting('appearance.animationsEnabled', true)) {
            document.documentElement.classList.add('no-animations');
        } else {
            document.documentElement.classList.remove('no-animations');
        }
        
        // Apply font size
        const fontSize = getSetting('appearance.fontSize', 100);
        document.documentElement.style.fontSize = `${fontSize}%`;
    }
    
    /**
     * Apply all settings to the document
     */
    function applySettings() {
        // Apply theme settings
        applyTheme();
        
        // Apply other visual settings
        
        // Log debug information
        if (isDebugMode()) {
            console.log('Settings applied:', currentSettings);
        }
    }
    
    /**
     * Reset all settings to defaults
     */
    function resetToDefaults() {
        currentSettings = {...DEFAULT_SETTINGS};
        saveSettings();
        applySettings();
        return true;
    }
    
    /**
     * Clear cache data
     */
    function clearCache() {
        // Clear localStorage cache
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('pdf_tools_cache_')) {
                localStorage.removeItem(key);
            }
        });
        
        // Clear IndexedDB cache if available
        if (window.indexedDB) {
            try {
                const DBDeleteRequest = indexedDB.deleteDatabase('pdf_tools_cache');
                DBDeleteRequest.onsuccess = function() {
                    if (isDebugMode()) {
                        console.log('IndexedDB cache deleted successfully');
                    }
                };
            } catch (error) {
                console.error('Error clearing IndexedDB cache:', error);
            }
        }
        
        return true;
    }
    
    /**
     * Bind form inputs to settings
     * This automatically connects inputs with data-setting attributes to the settings manager
     */
    function bindFormInputs() {
        // Find all form elements with data-setting attribute
        const settingInputs = document.querySelectorAll('[data-setting]');
        
        settingInputs.forEach(input => {
            const settingPath = input.dataset.setting;
            if (!settingPath) return;
            
            // Set initial value from settings
            const currentValue = getSetting(settingPath);
            
            if (input.type === 'checkbox') {
                input.checked = !!currentValue;
            } else if (input.type === 'radio') {
                input.checked = input.value === String(currentValue);
            } else if (input.tagName === 'SELECT' || input.tagName === 'TEXTAREA' || input.type === 'text' || input.type === 'range') {
                input.value = currentValue !== undefined ? currentValue : '';
            }
            
            // Add event listener to update setting when changed
            input.addEventListener('change', function() {
                let newValue;
                
                if (input.type === 'checkbox') {
                    newValue = input.checked;
                } else if (input.type === 'radio') {
                    newValue = input.value;
                } else if (input.type === 'number' || input.type === 'range') {
                    newValue = parseFloat(input.value);
                } else {
                    newValue = input.value;
                }
                
                setSetting(settingPath, newValue);
                
                // Apply settings if needed (like theme changes)
                if (settingPath.startsWith('general.theme') || 
                    settingPath.startsWith('appearance')) {
                    applySettings();
                }
            });
        });
        
        // Bind buttons
        const saveButton = document.getElementById('save-settings-btn');
        if (saveButton) {
            saveButton.addEventListener('click', function() {
                if (saveSettings()) {
                    alert('Settings saved successfully!');
                    window.location.href = '../index.html';
                } else {
                    alert('Error saving settings. Please try again.');
                }
            });
        }
        
        const resetButton = document.getElementById('reset-settings-btn');
        if (resetButton) {
            resetButton.addEventListener('click', function() {
                if (confirm('Are you sure you want to reset all settings to default values?')) {
                    if (resetToDefaults()) {
                        alert('Settings reset to defaults.');
                        // Refresh the form
                        bindFormInputs();
                    } else {
                        alert('Error resetting settings. Please try again.');
                    }
                }
            });
        }
        
        const clearCacheButton = document.getElementById('clear-cache-btn');
        if (clearCacheButton) {
            clearCacheButton.addEventListener('click', function() {
                if (confirm('Are you sure you want to clear the application cache?')) {
                    if (clearCache()) {
                        alert('Application cache has been cleared.');
                    } else {
                        alert('Error clearing cache. Please try again.');
                    }
                }
            });
        }
    }
    
    // Initialize
    document.addEventListener('DOMContentLoaded', function() {
        loadSettings();
        applySettings();
        
        // If on settings page, bind inputs
        if (window.location.href.includes('settings.html')) {
            // Wait for settings form to be ready
            setTimeout(bindFormInputs, 500);
        }
        
        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
    });
    
    // Public API
    return {
        load: loadSettings,
        save: saveSettings,
        get: getSetting,
        set: setSetting,
        reset: resetToDefaults,
        clearCache: clearCache,
        applyTheme: applyTheme,
        applySettings: applySettings,
        bindFormInputs: bindFormInputs
    };
})();

// Make available globally
window.settingsManager = settingsManager; 