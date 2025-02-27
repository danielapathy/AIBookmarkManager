/**
 * Service to handle Chrome storage operations
 */
export class StorageService {
    /**
     * Get items from Chrome storage
     * @param {string|string[]} keys - Key(s) to retrieve
     * @returns {Promise<object>} Retrieved items
     */
    async get(keys) {
        return new Promise((resolve) => {
            chrome.storage.sync.get(keys, (result) => {
                resolve(result);
            });
        });
    }
    
    /**
     * Store items in Chrome storage
     * @param {object} items - Key-value pairs to store
     * @returns {Promise<void>}
     */
    async set(items) {
        return new Promise((resolve) => {
            chrome.storage.sync.set(items, () => {
                resolve();
            });
        });
    }
    
    /**
     * Remove items from Chrome storage
     * @param {string|string[]} keys - Key(s) to remove
     * @returns {Promise<void>}
     */
    async remove(keys) {
        return new Promise((resolve) => {
            chrome.storage.sync.remove(keys, () => {
                resolve();
            });
        });
    }
    
    /**
     * Clear all data from Chrome storage
     * @returns {Promise<void>}
     */
    async clear() {
        return new Promise((resolve) => {
            chrome.storage.sync.clear(() => {
                resolve();
            });
        });
    }
    
    /**
     * Get the total bytes in use in storage
     * @returns {Promise<number>} Bytes in use
     */
    async getBytesInUse() {
        return new Promise((resolve) => {
            chrome.storage.sync.getBytesInUse(null, (bytesInUse) => {
                resolve(bytesInUse);
            });
        });
    }
}