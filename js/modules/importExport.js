import { showStatus } from '../utils/helpers.js';

export default class ImportExport {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.importBookmarks = this.importBookmarks.bind(this);
    }
    
    async exportBookmarks() {
        try {
            const bookmarks = await chrome.bookmarks.getTree();
            const data = JSON.stringify(bookmarks, null, 2);
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `bookmarks_export_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            showStatus('Bookmarks exported successfully!', 'success');
        } catch (error) {
            console.error('Export failed:', error);
            showStatus('Export failed: ' + error.message, 'error');
        }
    }
    
    showImportDialog() {
        document.getElementById('importFile').click();
    }
    
    async processImport(data) {
        try {
            // Get the existing Chrome bookmark structure
            const existingStructure = await chrome.bookmarks.getTree();
            
            if (!existingStructure || !existingStructure[0] || !existingStructure[0].children) {
                throw new Error('Could not access existing bookmark structure');
            }
            
            // Map the standard Chrome bookmark folder IDs
            const folderMap = {};
            for (const folder of existingStructure[0].children) {
                folderMap[folder.title] = folder.id;
            }
            
            // Check if we have the root folder structure from an export
            if (data[0] && data[0].children) {
                // Process each main folder from the imported data
                for (const importedFolder of data[0].children) {
                    // Find the matching Chrome folder ID
                    const targetFolderId = folderMap[importedFolder.title];
                    
                    if (targetFolderId && importedFolder.children) {
                        // We found a matching folder, import directly into it
                        const processedItems = this.restoreBookmarkDetails(importedFolder.children);
                        await this.createBookmarks(processedItems, targetFolderId);
                        showStatus(`Imported to ${importedFolder.title} successfully!`, 'success');
                    }
                }
            } else {
                // If we don't have a standard structure, put everything in the bookmark bar
                const bookmarkBarId = folderMap['Bookmarks Bar'] || folderMap['Bookmark Bar'] || '1';
                const processedItems = this.restoreBookmarkDetails(data);
                await this.createBookmarks(processedItems, bookmarkBarId);
                showStatus('Bookmarks imported to Bookmark Bar!', 'success');
            }
        } catch (error) {
            console.error('Import processing failed:', error);
            showStatus('Import failed: ' + error.message, 'error');
            throw error;
        }
    }
    
    async importBookmarks(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        try {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    
                    // Verify the data structure
                    if (!Array.isArray(data)) {
                        throw new Error('Invalid bookmark file format');
                    }
                    
                    // Process the import
                    await this.processImport(data);
                    
                    // Reset the file input so the same file can be selected again
                    event.target.value = '';
                } catch (parseError) {
                    console.error('Import parsing failed:', parseError);
                    showStatus('Import failed: ' + parseError.message, 'error');
                }
            };
            reader.readAsText(file);
        } catch (error) {
            console.error('Import failed:', error);
            showStatus('Import failed: ' + error.message, 'error');
        }
    }
    
    restoreBookmarkDetails(bookmarks) {
        // If bookmarks is not an array, wrap it in an array
        if (!Array.isArray(bookmarks)) {
            bookmarks = [bookmarks];
        }

        return bookmarks.map(item => {
            if (item.children) {
                return {
                    folderName: item.title || 'Unnamed Folder',
                    children: this.restoreBookmarkDetails(item.children)
                };
            } else {
                return {
                    name: item.title || 'Unnamed Bookmark',
                    url: item.url || "about:blank"
                };
            }
        });
    }
    
    async createBookmarks(items, parentId) {
        for (const item of items) {
            if (item.folderName) {
                // It's a folder
                const folder = await chrome.bookmarks.create({
                    parentId: parentId,
                    title: item.folderName
                });
                
                // Process its children
                if (item.children && Array.isArray(item.children)) {
                    await this.createBookmarks(item.children, folder.id);
                }
            } else {
                // It's a bookmark
                await chrome.bookmarks.create({
                    parentId: parentId,
                    title: item.name,
                    url: item.url
                });
            }
        }
    }
}