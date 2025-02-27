/**
 * Shows a status message overlay
 * @param {string} message - Message to display
 * @param {string} type - 'success' or 'error'
 */
export function showStatus(message, type = 'success') {
    const status = document.getElementById('status');
    if (!status) {
        // Create status element if it doesn't exist
        const newStatus = document.createElement('div');
        newStatus.id = 'status';
        newStatus.className = 'status';
        document.body.appendChild(newStatus);
        setTimeout(() => showStatus(message, type), 10);
        return;
    }
    
    // Update status message
    status.textContent = message;
    status.className = 'status ' + type;
    
    // Show the message
    status.style.opacity = '1';
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
        status.style.opacity = '0';
    }, 3000);
}

/**
 * Changes a button to loading state and disables it
 * @param {HTMLElement} button - The button element to modify
 * @param {boolean} isLoading - Whether to show loading state
 * @param {string} text - Custom loading text (optional)
 */
export function setLoading(button, isLoading, text = 'Processing...') {
    if (isLoading) {
        button.disabled = true;
        button.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${text}`;
        
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'flex';
            const loadingText = loadingOverlay.querySelector('p');
            if (loadingText) {
                loadingText.textContent = text;
            }
        }
    } else {
        button.disabled = false;
        button.innerHTML = '<i class="fas fa-magic"></i> Organize Bookmarks';
        
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
            // Reset text for next time
            const loadingText = loadingOverlay.querySelector('p');
            if (loadingText) {
                loadingText.textContent = 'Organizing bookmarks...';
            }
        }
    }
}

/**
 * Creates a simplified representation of the bookmark structure
 * @param {Array} nodes - Bookmark tree nodes
 * @param {boolean} includeUrls - Whether to include URLs in the output
 * @returns {Array} Simplified bookmark structure
 */
export function simplifyBookmarkStructure(nodes, includeUrls = false) {
    if (!nodes || !Array.isArray(nodes)) {
        return [];
    }
    
    return nodes.map(node => {
        if (node.url && !includeUrls) {
            return null; // Skip bookmarks if not including URLs
        }
        
        const result = {
            title: node.title || ''
        };
        
        if (node.url && includeUrls) {
            result.url = node.url;
        }
        
        if (node.children) {
            const children = simplifyBookmarkStructure(node.children, includeUrls);
            if (children.length > 0) {
                result.children = children.filter(Boolean); // Filter out null values
            }
        }
        
        return result;
    }).filter(Boolean); // Filter out null values
}

/**
 * Format a date for display
 * @param {Date|string|number} date - Date to format
 * @returns {string} Formatted date string
 */
export function formatDate(date) {
    if (!date) return '';
    
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    
    return d.toLocaleString();
}

/**
 * Creates a deep copy of an object
 * @param {*} obj - The object to clone
 * @returns {*} A deep copy of the object
 */
export function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}