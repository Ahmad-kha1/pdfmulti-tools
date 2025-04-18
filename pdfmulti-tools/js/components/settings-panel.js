/**
 * Settings Panel Component
 * 
 * This component creates a configurable settings panel that can be included
 * on any tool page to allow users to configure tool-specific settings and
 * general application settings.
 */

class SettingsPanel {
    constructor(options = {}) {
        this.containerId = options.containerId || 'settings-panel-container';
        this.toolName = options.toolName || this.detectToolName();
        this.position = options.position || 'right';
        this.title = options.title || 'Settings';
        this.sections = options.sections || this.getDefaultSections();
        
        // Settings manager
        this.settingsManager = window.settingsManager || null;
        
        // State
        this.isOpen = false;
        this.initialized = false;
        
        // Bind methods
        this.init = this.init.bind(this);
        this.render = this.render.bind(this);
        this.toggle = this.toggle.bind(this);
        this.open = this.open.bind(this);
        this.close = this.close.bind(this);
        this.saveSettings = this.saveSettings.bind(this);
        this.loadSettings = this.loadSettings.bind(this);
        this.resetSettings = this.resetSettings.bind(this);
        
        // Auto-init if document is already loaded
        if (document.readyState === 'complete') {
            this.init();
        } else {
            document.addEventListener('DOMContentLoaded', this.init);
        }
    }
    
    /**
     * Detect the current tool name from the URL
     * @returns {string} - The detected tool name
     */
    detectToolName() {
        const toolMatch = window.location.pathname.match(/\/tools\/([a-zA-Z0-9-]+)\.html$/);
        if (toolMatch) {
            // Convert kebab-case to camelCase
            return toolMatch[1].replace(/-([a-z])/g, g => g[1].toUpperCase());
        }
        return 'general';
    }
    
    /**
     * Get default sections for the settings panel
     * @returns {Array} - Default sections configuration
     */
    getDefaultSections() {
        const generalSection = {
            id: 'general',
            title: 'General Settings',
            settings: [
                {
                    id: 'theme',
                    type: 'select',
                    label: 'Theme',
                    options: [
                        { value: 'light', label: 'Light' },
                        { value: 'dark', label: 'Dark' },
                        { value: 'system', label: 'System Default' }
                    ],
                    default: 'light'
                },
                {
                    id: 'autoSave',
                    type: 'checkbox',
                    label: 'Auto-save settings',
                    default: true
                }
            ]
        };
        
        // Add tool-specific sections based on the tool
        const toolSections = [];
        
        switch (this.toolName) {
            case 'pdfToWord':
                toolSections.push({
                    id: 'pdfToWord',
                    title: 'PDF to Word Settings',
                    settings: [
                        {
                            id: 'preserveFormatting',
                            type: 'checkbox',
                            label: 'Preserve formatting',
                            default: true
                        },
                        {
                            id: 'outputFormat',
                            type: 'select',
                            label: 'Output Format',
                            options: [
                                { value: 'docx', label: 'DOCX (Word 2007+)' },
                                { value: 'doc', label: 'DOC (Word 97-2003)' },
                                { value: 'rtf', label: 'RTF (Rich Text Format)' }
                            ],
                            default: 'docx'
                        }
                    ]
                });
                break;
                
            case 'pdfToPng':
                toolSections.push({
                    id: 'pdfToPng',
                    title: 'PDF to PNG Settings',
                    settings: [
                        {
                            id: 'quality',
                            type: 'select',
                            label: 'Image Quality',
                            options: [
                                { value: 'low', label: 'Low (72 DPI)' },
                                { value: 'medium', label: 'Medium (150 DPI)' },
                                { value: 'high', label: 'High (300 DPI)' },
                                { value: 'veryhigh', label: 'Very High (600 DPI)' }
                            ],
                            default: 'medium'
                        },
                        {
                            id: 'transparentBg',
                            type: 'checkbox',
                            label: 'Transparent background',
                            default: false
                        }
                    ]
                });
                break;
        }
        
        // Performance and cache settings for all tools
        const performanceSection = {
            id: 'performance',
            title: 'Performance',
            settings: [
                {
                    id: 'maxConcurrentJobs',
                    type: 'range',
                    label: 'Max concurrent jobs',
                    min: 1,
                    max: 16,
                    step: 1,
                    default: navigator.hardwareConcurrency || 4
                },
                {
                    id: 'enableCache',
                    type: 'checkbox',
                    label: 'Enable result caching',
                    default: true
                },
                {
                    id: 'cacheTTL',
                    type: 'select',
                    label: 'Cache duration',
                    options: [
                        { value: '300000', label: '5 minutes' },
                        { value: '3600000', label: '1 hour' },
                        { value: '86400000', label: '1 day' },
                        { value: '604800000', label: '1 week' }
                    ],
                    default: '3600000',
                    dependsOn: { id: 'enableCache', value: true }
                }
            ]
        };
        
        return [generalSection, ...toolSections, performanceSection];
    }
    
    /**
     * Initialize the settings panel
     */
    init() {
        if (this.initialized) {
            return;
        }
        
        // Get settings manager from global instance
        if (!this.settingsManager && window.settingsManager) {
            this.settingsManager = window.settingsManager;
        }
        
        // Create container if it doesn't exist
        let container = document.getElementById(this.containerId);
        if (!container) {
            container = document.createElement('div');
            container.id = this.containerId;
            document.body.appendChild(container);
        }
        
        // Render the panel
        this.render(container);
        
        // Load settings
        this.loadSettings();
        
        // Add event handlers for form elements
        this.addEventHandlers();
        
        this.initialized = true;
        
        // Dispatch initialization event
        window.dispatchEvent(new CustomEvent('settings-panel-initialized', { detail: this }));
    }
    
    /**
     * Render the settings panel
     * @param {HTMLElement} container - The container element
     */
    render(container) {
        // Create panel HTML
        const html = `
            <div class="settings-panel ${this.isOpen ? 'open' : ''} position-${this.position}">
                <div class="settings-panel-header">
                    <h5>${this.title}</h5>
                    <button type="button" class="btn-close" aria-label="Close"></button>
                </div>
                <div class="settings-panel-body">
                    <form id="settings-form">
                        ${this.renderSections()}
                    </form>
                </div>
                <div class="settings-panel-footer">
                    <button type="button" class="btn btn-secondary btn-sm" id="settings-reset">Reset to Defaults</button>
                    <button type="button" class="btn btn-primary btn-sm" id="settings-save">Save Settings</button>
                </div>
            </div>
            <div class="settings-toggle-btn ${this.isOpen ? 'd-none' : ''}">
                <button type="button" class="btn btn-primary">
                    <i class="fas fa-cog"></i>
                </button>
            </div>
        `;
        
        // Add HTML to container
        container.innerHTML = html;
        
        // Add CSS
        this.addStyles();
        
        // Add toggle button click handler
        const toggleBtn = container.querySelector('.settings-toggle-btn button');
        toggleBtn.addEventListener('click', this.open);
        
        // Add close button click handler
        const closeBtn = container.querySelector('.settings-panel-header .btn-close');
        closeBtn.addEventListener('click', this.close);
        
        // Add save button click handler
        const saveBtn = container.querySelector('#settings-save');
        saveBtn.addEventListener('click', this.saveSettings);
        
        // Add reset button click handler
        const resetBtn = container.querySelector('#settings-reset');
        resetBtn.addEventListener('click', this.resetSettings);
    }
    
    /**
     * Render settings sections
     * @returns {string} - HTML for sections
     */
    renderSections() {
        return this.sections.map(section => {
            return `
                <div class="settings-section" data-section="${section.id}">
                    <h6>${section.title}</h6>
                    <div class="settings-grid">
                        ${this.renderSettings(section.settings, section.id)}
                    </div>
                </div>
            `;
        }).join('');
    }
    
    /**
     * Render individual settings
     * @param {Array} settings - Settings configuration
     * @param {string} sectionId - ID of the parent section
     * @returns {string} - HTML for settings
     */
    renderSettings(settings, sectionId) {
        return settings.map(setting => {
            const settingId = `${sectionId}.${setting.id}`;
            const dependsAttr = setting.dependsOn 
                ? `data-depends-on="${sectionId}.${setting.dependsOn.id}" data-depends-value="${setting.dependsOn.value}"`
                : '';
            
            switch (setting.type) {
                case 'checkbox':
                    return `
                        <div class="setting-item" ${dependsAttr}>
                            <div class="form-check form-switch">
                                <input class="form-check-input" type="checkbox" id="${settingId}" 
                                       ${setting.default ? 'checked' : ''}>
                                <label class="form-check-label" for="${settingId}">${setting.label}</label>
                            </div>
                        </div>
                    `;
                    
                case 'select':
                    const options = setting.options.map(option => {
                        return `<option value="${option.value}" ${option.value === setting.default ? 'selected' : ''}>${option.label}</option>`;
                    }).join('');
                    
                    return `
                        <div class="setting-item" ${dependsAttr}>
                            <label class="form-label" for="${settingId}">${setting.label}</label>
                            <select class="form-select" id="${settingId}">
                                ${options}
                            </select>
                        </div>
                    `;
                    
                case 'range':
                    return `
                        <div class="setting-item" ${dependsAttr}>
                            <label class="form-label" for="${settingId}">${setting.label}: <span class="range-value">${setting.default}</span></label>
                            <input type="range" class="form-range" id="${settingId}" 
                                   min="${setting.min}" max="${setting.max}" step="${setting.step}"
                                   value="${setting.default}">
                        </div>
                    `;
                    
                default:
                    return '';
            }
        }).join('');
    }
    
    /**
     * Add CSS styles for the settings panel
     */
    addStyles() {
        if (document.getElementById('settings-panel-styles')) {
            return;
        }
        
        const styles = `
            .settings-panel {
                position: fixed;
                top: 0;
                bottom: 0;
                width: 300px;
                background-color: #fff;
                box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
                z-index: 1050;
                transform: translateX(100%);
                transition: transform 0.3s ease-in-out;
                display: flex;
                flex-direction: column;
            }
            
            .settings-panel.position-right {
                right: 0;
                transform: translateX(100%);
            }
            
            .settings-panel.position-left {
                left: 0;
                transform: translateX(-100%);
            }
            
            .settings-panel.open {
                transform: translateX(0);
            }
            
            .settings-panel-header {
                padding: 1rem;
                border-bottom: 1px solid #dee2e6;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .settings-panel-header h5 {
                margin: 0;
            }
            
            .settings-panel-body {
                flex: 1;
                overflow-y: auto;
                padding: 1rem;
            }
            
            .settings-panel-footer {
                padding: 1rem;
                border-top: 1px solid #dee2e6;
                display: flex;
                justify-content: space-between;
            }
            
            .settings-toggle-btn {
                position: fixed;
                bottom: 20px;
                right: 20px;
                z-index: 1040;
            }
            
            .settings-toggle-btn button {
                width: 50px;
                height: 50px;
                border-radius: 50%;
                padding: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
            }
            
            .settings-section {
                margin-bottom: 1.5rem;
            }
            
            .settings-section h6 {
                margin-bottom: 0.5rem;
                padding-bottom: 0.5rem;
                border-bottom: 1px solid #eee;
            }
            
            .settings-grid {
                display: grid;
                grid-gap: 0.75rem;
                margin-top: 0.75rem;
            }
            
            .setting-item {
                margin-bottom: 0.5rem;
            }
            
            /* Dark mode support */
            @media (prefers-color-scheme: dark) {
                body.theme-system .settings-panel {
                    background-color: #212529;
                    color: #e9ecef;
                }
                
                body.theme-system .settings-panel-header,
                body.theme-system .settings-panel-footer {
                    border-color: #343a40;
                }
                
                body.theme-system .settings-section h6 {
                    border-color: #343a40;
                }
            }
            
            body.theme-dark .settings-panel {
                background-color: #212529;
                color: #e9ecef;
            }
            
            body.theme-dark .settings-panel-header,
            body.theme-dark .settings-panel-footer {
                border-color: #343a40;
            }
            
            body.theme-dark .settings-section h6 {
                border-color: #343a40;
            }
        `;
        
        const styleElement = document.createElement('style');
        styleElement.id = 'settings-panel-styles';
        styleElement.textContent = styles;
        document.head.appendChild(styleElement);
    }
    
    /**
     * Add event handlers for form elements
     */
    addEventHandlers() {
        const form = document.getElementById('settings-form');
        
        // Handle range inputs
        form.querySelectorAll('input[type="range"]').forEach(range => {
            const valueDisplay = range.previousElementSibling.querySelector('.range-value');
            range.addEventListener('input', () => {
                valueDisplay.textContent = range.value;
            });
        });
        
        // Handle conditional settings
        form.querySelectorAll('[data-depends-on]').forEach(setting => {
            const dependsOn = document.getElementById(setting.dataset.dependsOn);
            const dependsValue = setting.dataset.dependsValue === 'true';
            
            const updateVisibility = () => {
                if (dependsOn.type === 'checkbox') {
                    setting.style.display = dependsOn.checked === dependsValue ? 'block' : 'none';
                } else {
                    setting.style.display = dependsOn.value === setting.dataset.dependsValue ? 'block' : 'none';
                }
            };
            
            dependsOn.addEventListener('change', updateVisibility);
            updateVisibility();
        });
    }
    
    /**
     * Toggle the settings panel
     */
    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }
    
    /**
     * Open the settings panel
     */
    open() {
        const panel = document.querySelector('.settings-panel');
        const toggleBtn = document.querySelector('.settings-toggle-btn');
        
        panel.classList.add('open');
        toggleBtn.classList.add('d-none');
        
        this.isOpen = true;
    }
    
    /**
     * Close the settings panel
     */
    close() {
        const panel = document.querySelector('.settings-panel');
        const toggleBtn = document.querySelector('.settings-toggle-btn');
        
        panel.classList.remove('open');
        toggleBtn.classList.remove('d-none');
        
        this.isOpen = false;
    }
    
    /**
     * Save settings from the form
     */
    saveSettings() {
        if (!this.settingsManager) {
            console.error('Settings manager not available');
            return;
        }
        
        // Collect settings from form
        const form = document.getElementById('settings-form');
        
        this.sections.forEach(section => {
            section.settings.forEach(setting => {
                const settingId = `${section.id}.${setting.id}`;
                const element = document.getElementById(settingId);
                
                if (!element) return;
                
                let value;
                if (element.type === 'checkbox') {
                    value = element.checked;
                } else if (element.type === 'range') {
                    value = parseInt(element.value);
                } else {
                    value = element.value;
                }
                
                // Save to settings manager
                if (section.id === this.toolName) {
                    this.settingsManager.setToolSetting(this.toolName, setting.id, value);
                } else {
                    this.settingsManager.set(`${section.id}.${setting.id}`, value);
                }
            });
        });
        
        // Apply theme change
        const theme = this.settingsManager.get('general.theme');
        this.applyTheme(theme);
        
        // Show success message
        alert('Settings saved successfully');
    }
    
    /**
     * Load settings into the form
     */
    loadSettings() {
        if (!this.settingsManager) {
            console.error('Settings manager not available');
            return;
        }
        
        // Apply settings to form
        this.sections.forEach(section => {
            section.settings.forEach(setting => {
                const settingId = `${section.id}.${setting.id}`;
                const element = document.getElementById(settingId);
                
                if (!element) return;
                
                let value;
                if (section.id === this.toolName) {
                    value = this.settingsManager.getToolSetting(this.toolName, setting.id, setting.default);
                } else {
                    value = this.settingsManager.get(`${section.id}.${setting.id}`, setting.default);
                }
                
                if (element.type === 'checkbox') {
                    element.checked = value;
                } else {
                    element.value = value;
                    
                    // Update range display if needed
                    if (element.type === 'range') {
                        const valueDisplay = element.previousElementSibling.querySelector('.range-value');
                        if (valueDisplay) {
                            valueDisplay.textContent = value;
                        }
                    }
                }
            });
        });
        
        // Apply theme
        const theme = this.settingsManager.get('general.theme', 'light');
        this.applyTheme(theme);
    }
    
    /**
     * Reset settings to defaults
     */
    resetSettings() {
        if (!confirm('Are you sure you want to reset all settings to defaults?')) {
            return;
        }
        
        // Reset form to defaults
        this.sections.forEach(section => {
            section.settings.forEach(setting => {
                const settingId = `${section.id}.${setting.id}`;
                const element = document.getElementById(settingId);
                
                if (!element) return;
                
                if (element.type === 'checkbox') {
                    element.checked = setting.default;
                } else {
                    element.value = setting.default;
                    
                    // Update range display if needed
                    if (element.type === 'range') {
                        const valueDisplay = element.previousElementSibling.querySelector('.range-value');
                        if (valueDisplay) {
                            valueDisplay.textContent = setting.default;
                        }
                    }
                }
            });
        });
        
        // Save the defaults
        this.saveSettings();
    }
    
    /**
     * Apply the selected theme
     * @param {string} theme - The theme to apply ('light', 'dark', or 'system')
     */
    applyTheme(theme) {
        document.body.classList.remove('theme-light', 'theme-dark', 'theme-system');
        document.body.classList.add(`theme-${theme}`);
        
        // If using system, check system preference
        if (theme === 'system') {
            const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            document.documentElement.dataset.bsTheme = prefersDark ? 'dark' : 'light';
        } else {
            document.documentElement.dataset.bsTheme = theme;
        }
    }
}

// Export the SettingsPanel class
if (typeof module !== 'undefined') {
    module.exports = { SettingsPanel };
} else {
    window.SettingsPanel = SettingsPanel;
} 