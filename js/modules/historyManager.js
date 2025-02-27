import { showStatus } from '../utils/helpers.js';

export default class HistoryManager {
    constructor() {
        this.history = [];
        this.loadHistory();
    }

    async loadHistory() {
        const result = await chrome.storage.local.get(['bookmarkHistory']);
        this.history = result.bookmarkHistory || [];
    }

    async saveHistory() {
        await chrome.storage.local.set({
            bookmarkHistory: this.history
        });
    }

    async addHistoryEntry(beforeState, afterState) {
        const entry = {
            id: `history_${Date.now()}`,
            timestamp: new Date().toISOString(),
            before: beforeState,
            after: afterState
        };
        
        this.history.unshift(entry); // Add to beginning of array
        
        // Keep only last 10 entries to manage storage
        if (this.history.length > 10) {
            this.history = this.history.slice(0, 10);
        }
        
        await this.saveHistory();
        this.renderHistory();
    }
    
async restoreBookmarkStructure(items, parentId) {
    for (const item of items) {
        if (item.children && item.children.length > 0) { // folder node
            // Create folder using the correct title property
            const folder = await chrome.bookmarks.create({
                parentId: parentId,
                title: item.title
            });
            if (item.isTopLevel) {
                await chrome.storage.local.set({
                    [`folder_${folder.id}_isTopLevel`]: true
                });
            }
            // Recursively restore children
            await this.restoreBookmarkStructure(item.children, folder.id);
        } else {
            // Create bookmark using item.title instead of item.name
            await chrome.bookmarks.create({
                parentId: parentId,
                title: item.title,
                url: item.url
            });
        }
    }
}

async undoChange(historyId) {
    const entry = this.history.find(h => h.id === historyId);
    if (!entry) return;

    // Get bookmarks bar
    const rootNode = (await chrome.bookmarks.getTree())[0];
    const bookmarksBar = rootNode.children[0];
    
    // Clear current bookmarks
    const existing = await chrome.bookmarks.getChildren(bookmarksBar.id);
    for (const node of existing) {
        await chrome.bookmarks.removeTree(node.id);
    }

    // Restore previous state from the 'before' snapshot
    await this.restoreBookmarkStructure(entry.before, bookmarksBar.id);
    
    showStatus('Changes undone successfully!', 'success');
    this.renderHistory();
}


    formatTimestamp(isoString) {
        const date = new Date(isoString);
        return date.toLocaleString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    renderHistory() {
        const historyList = document.getElementById('historyList');
        if (!historyList) return;

        historyList.innerHTML = this.history.map(entry => `
            <div class="history-item" data-id="${entry.id}">
                <div class="history-header">
                    <span class="history-timestamp">
                        <i class="fas fa-clock"></i>
                        ${this.formatTimestamp(entry.timestamp)}
                    </span>
                    <div class="history-actions">
                        <button class="button button-icon view-history">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="button button-icon undo-history">
                            <i class="fas fa-undo"></i>
                        </button>
                    </div>
                </div>
                <div class="history-details" style="display: none;">
                    <div class="history-comparison">
                        <div class="history-before">
                            <h4>Before</h4>
                            <pre>${JSON.stringify(entry.before, null, 2)}</pre>
                        </div>
                        <div class="history-after">
                            <h4>After</h4>
                            <pre>${JSON.stringify(entry.after, null, 2)}</pre>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

        // Add event listeners
        historyList.querySelectorAll('.view-history').forEach(button => {
            button.addEventListener('click', (e) => {
                const historyItem = e.target.closest('.history-item');
                const details = historyItem.querySelector('.history-details');
                details.style.display = details.style.display === 'none' ? 'block' : 'none';
            });
        });

        historyList.querySelectorAll('.undo-history').forEach(button => {
            button.addEventListener('click', async (e) => {
                const historyItem = e.target.closest('.history-item');
                const historyId = historyItem.dataset.id;
                await this.undoChange(historyId);
            });
        });
    }
}