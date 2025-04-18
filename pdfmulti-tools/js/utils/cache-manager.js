/**
 * Cache Manager for PDF Tools
 * 
 * This utility provides a sophisticated caching system to improve performance 
 * by storing and retrieving processing results. Features include:
 * - LRU (Least Recently Used) eviction policy
 * - Configurable cache size limits
 * - Persistent cache option using IndexedDB
 * - Memory usage monitoring
 */

class CacheManager {
    constructor(options = {}) {
        // Cache configuration
        this.maxItems = options.maxItems || 100;
        this.maxSize = options.maxSize || 100 * 1024 * 1024; // 100MB default
        this.ttl = options.ttl || 3600 * 1000; // 1 hour default
        this.persistent = options.persistent || false;
        
        // Initialize cache
        this.cache = new Map();
        this.currentSize = 0;
        this.hits = 0;
        this.misses = 0;
        
        // Bind methods
        this.set = this.set.bind(this);
        this.get = this.get.bind(this);
        this.has = this.has.bind(this);
        this.delete = this.delete.bind(this);
        this.clear = this.clear.bind(this);
        this.getStats = this.getStats.bind(this);
        
        // Initialize IndexedDB if persistent cache is enabled
        if (this.persistent) {
            this.initDB();
        }
    }
    
    /**
     * Initialize IndexedDB for persistent caching
     */
    async initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('pdfToolsCache', 1);
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('cache')) {
                    db.createObjectStore('cache', { keyPath: 'key' });
                }
            };
            
            request.onsuccess = (event) => {
                this.db = event.target.result;
                
                // Load existing cache items
                this.loadFromDB().then(resolve).catch(reject);
            };
            
            request.onerror = (event) => {
                console.error('IndexedDB error:', event.target.error);
                reject(event.target.error);
            };
        });
    }
    
    /**
     * Load cache items from IndexedDB
     */
    async loadFromDB() {
        if (!this.db) return;
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['cache'], 'readonly');
            const store = transaction.objectStore('cache');
            const request = store.getAll();
            
            request.onsuccess = (event) => {
                const items = event.target.result;
                const now = Date.now();
                
                // Add non-expired items to memory cache
                items.forEach(item => {
                    if (!item.expires || item.expires > now) {
                        this.cache.set(item.key, {
                            value: item.value,
                            size: item.size,
                            created: item.created,
                            accessed: now,
                            expires: item.expires
                        });
                        this.currentSize += item.size;
                    }
                });
                
                resolve();
            };
            
            request.onerror = (event) => {
                console.error('Error loading cache from DB:', event.target.error);
                reject(event.target.error);
            };
        });
    }
    
    /**
     * Store cache item in IndexedDB
     */
    async saveItemToDB(key, item) {
        if (!this.db) return;
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['cache'], 'readwrite');
            const store = transaction.objectStore('cache');
            const request = store.put({
                key,
                value: item.value,
                size: item.size,
                created: item.created,
                expires: item.expires
            });
            
            request.onsuccess = () => resolve();
            request.onerror = (event) => {
                console.error('Error saving to DB:', event.target.error);
                reject(event.target.error);
            };
        });
    }
    
    /**
     * Delete cache item from IndexedDB
     */
    async deleteItemFromDB(key) {
        if (!this.db) return;
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['cache'], 'readwrite');
            const store = transaction.objectStore('cache');
            const request = store.delete(key);
            
            request.onsuccess = () => resolve();
            request.onerror = (event) => {
                console.error('Error deleting from DB:', event.target.error);
                reject(event.target.error);
            };
        });
    }
    
    /**
     * Set a cache item
     * @param {string} key - Cache key
     * @param {*} value - Value to cache
     * @param {Object} options - Cache options for this specific item
     */
    async set(key, value, options = {}) {
        // Check if key already exists
        if (this.cache.has(key)) {
            const oldItem = this.cache.get(key);
            this.currentSize -= oldItem.size;
            await this.delete(key);
        }
        
        // Calculate item size
        let size = 0;
        if (value instanceof Blob || value instanceof File) {
            size = value.size;
        } else if (value instanceof ArrayBuffer) {
            size = value.byteLength;
        } else if (typeof value === 'string') {
            size = new Blob([value]).size;
        } else {
            // For objects, stringify to estimate size
            size = new Blob([JSON.stringify(value)]).size;
        }
        
        // Create cache item
        const item = {
            value,
            size,
            created: Date.now(),
            accessed: Date.now(),
            expires: options.ttl ? Date.now() + options.ttl : (this.ttl ? Date.now() + this.ttl : null)
        };
        
        // Enforce cache limits
        this.enforceLimit(size);
        
        // Add to cache
        this.cache.set(key, item);
        this.currentSize += size;
        
        // Save to IndexedDB if persistent
        if (this.persistent) {
            await this.saveItemToDB(key, item);
        }
        
        return true;
    }
    
    /**
     * Get a cache item
     * @param {string} key - Cache key
     */
    get(key) {
        // Check if key exists
        if (!this.cache.has(key)) {
            this.misses++;
            return null;
        }
        
        const item = this.cache.get(key);
        
        // Check if item has expired
        if (item.expires && item.expires < Date.now()) {
            this.delete(key);
            this.misses++;
            return null;
        }
        
        // Update access time
        item.accessed = Date.now();
        this.cache.set(key, item);
        
        this.hits++;
        return item.value;
    }
    
    /**
     * Check if cache has a key
     * @param {string} key - Cache key
     */
    has(key) {
        if (!this.cache.has(key)) {
            return false;
        }
        
        const item = this.cache.get(key);
        
        // Check if item has expired
        if (item.expires && item.expires < Date.now()) {
            this.delete(key);
            return false;
        }
        
        return true;
    }
    
    /**
     * Delete a cache item
     * @param {string} key - Cache key
     */
    async delete(key) {
        if (this.cache.has(key)) {
            const item = this.cache.get(key);
            this.currentSize -= item.size;
            this.cache.delete(key);
            
            if (this.persistent) {
                await this.deleteItemFromDB(key);
            }
            
            return true;
        }
        
        return false;
    }
    
    /**
     * Clear all cache items
     */
    async clear() {
        this.cache.clear();
        this.currentSize = 0;
        
        if (this.persistent && this.db) {
            const transaction = this.db.transaction(['cache'], 'readwrite');
            const store = transaction.objectStore('cache');
            store.clear();
        }
        
        return true;
    }
    
    /**
     * Enforce cache limits by removing least recently used items
     * @param {number} newItemSize - Size of new item to add
     */
    enforceLimit(newItemSize) {
        // Check item count limit
        while (this.cache.size >= this.maxItems) {
            const oldestKey = this.findLRUKey();
            if (oldestKey) {
                this.delete(oldestKey);
            } else {
                break;
            }
        }
        
        // Check size limit
        while (this.currentSize + newItemSize > this.maxSize) {
            const oldestKey = this.findLRUKey();
            if (oldestKey) {
                this.delete(oldestKey);
            } else {
                break;
            }
        }
    }
    
    /**
     * Find the least recently used key
     */
    findLRUKey() {
        let oldestKey = null;
        let oldestTime = Infinity;
        
        for (const [key, item] of this.cache.entries()) {
            if (item.accessed < oldestTime) {
                oldestKey = key;
                oldestTime = item.accessed;
            }
        }
        
        return oldestKey;
    }
    
    /**
     * Get cache statistics
     */
    getStats() {
        return {
            items: this.cache.size,
            size: this.currentSize,
            hits: this.hits,
            misses: this.misses,
            hitRatio: this.hits / (this.hits + this.misses) || 0,
            persistent: this.persistent
        };
    }
}

// Export the CacheManager class
if (typeof module !== 'undefined') {
    module.exports = { CacheManager };
} else {
    window.CacheManager = CacheManager;
} 