import { setLoading, simplifyBookmarkStructure, showStatus } from '../utils/helpers.js';

export default class BookmarkManager {
    constructor(presetManager, apiConnector, uiManager, historyManager) {
        this.presetManager = presetManager;
        this.apiConnector = apiConnector;
        this.uiManager = uiManager;
        this.historyManager = historyManager
        
        // Validate dependencies
        if (!this.presetManager) {
            console.warn('BookmarkManager: PresetManager not provided');
        }
        
        if (!this.apiConnector) {
            console.warn('BookmarkManager: ApiConnector not provided');
        }
        
        if (!this.uiManager) {
            console.warn('BookmarkManager: UIManager not provided');
        }
    }
    
    /* Obsolete */
    async getFolderStructureWithCounts(nodes) {
        const result = [];
        
        for (const node of nodes) {
            if (node.children) {
                let bookmarkCount = 0;
                let folderCount = 0;
                
                for (const child of node.children) {
                    if (child.url) {
                        bookmarkCount++;
                    } else if (child.children) {
                        folderCount++;
                    }
                }
                
                result.push({
                    id: node.id,
                    title: node.title,
                    bookmarkCount,
                    folderCount,
                    children: await this.getFolderStructureWithCounts(node.children)
                });
            }
        }
        
        return result;
    }
    
    async organizeBookmarks() {
        const organizeBtn = document.getElementById('organizeBtn');
        setLoading(organizeBtn, true);
        
        try {
            // Verify ApiConnector is available
            if (!this.apiConnector) {
                throw new Error('API connector not configured. Please set up API settings first.');
            }
            
            const bookmarkTree = (await chrome.bookmarks.getTree())[0].children[0];
            const folderStructure = await this.getFlatFolderStructure(bookmarkTree.children);
            
            const allBookmarks = [];
            await this.collectBookmarks(bookmarkTree.children, allBookmarks);
            
            const beforeState = simplifyBookmarkStructure(bookmarkTree.children, true);
            const preset = this.presetManager.getSelectedPreset();
            console.log('preset')
            console.log(preset)
            
            if (!preset) {
                throw new Error('Selected preset not found');
            }
            
            // Process bookmarks one by one
            let processedCount = 0;
            const totalCount = allBookmarks.length;
            
            for (const bookmark of allBookmarks) {
                // Skip folders
                if (!bookmark.url) continue;
                
                // Get current path
                const currentPath = await this.getBookmarkPath(bookmark.id);
                
                // Update loading button with progress percentage
                const percentage = Math.round((processedCount / totalCount) * 100);
                setLoading(organizeBtn, true, `Processing... ${percentage}%`);
                
                // Get AI suggestion for this bookmark
                try {
                    const suggestion = await this.getSuggestionForBookmark(
                        bookmark,
                        currentPath,
                        folderStructure,
                        preset
                    );
                    
                    if (suggestion.recommendedAction === 'move') {
                        await this.moveBookmark(bookmark, suggestion.suggestedPath);
                    } else if (suggestion.recommendedAction === 'style_update') {
                        // Handle style updates if necessary
                    }
                    
                    processedCount++;
                    
                    // Update progress
                    if (processedCount % 5 === 0 || processedCount === totalCount) {
                    //    showStatus(`Processed ${processedCount}/${totalCount} bookmarks`, 'success');
                    }
                } catch (error) {
                    console.error(`Error processing bookmark ${bookmark.title}:`, error);
                }
            }
            
            const afterState = simplifyBookmarkStructure((await chrome.bookmarks.getTree())[0].children[0].children, true);
            await this.historyManager.addHistoryEntry(beforeState, afterState);
            
            showStatus(`Organization complete! Processed ${processedCount} bookmarks.`, 'success');
            setLoading(organizeBtn, false);
        } catch (error) {
            console.error(error);
            setLoading(organizeBtn, false);
            showStatus(`Error: ${error.message}`, 'error');
        }
    }
    
    async collectBookmarks(nodes, allBookmarks) {
        for (const node of nodes) {
            if (node.url) {
                allBookmarks.push(node);
            } else if (node.children) {
                await this.collectBookmarks(node.children, allBookmarks);
            }
        }
    }
    
    async getBookmarkPath(bookmarkId) {
        const paths = [];
        
        async function findPath(nodes, currentPath = []) {
            for (const node of nodes) {
                const newPath = [...currentPath, node.title];
                
                if (node.id === bookmarkId) {
                    paths.push(newPath);
                    return;
                }
                
                if (node.children) {
                    await findPath(node.children, newPath);
                }
            }
        }
        
        const tree = await chrome.bookmarks.getTree();
        await findPath(tree[0].children);
        
        return paths[0] || [];
    }
    
    async getFlatFolderStructure(nodes, prefix = "") {
        const result = [];
        
        for (const node of nodes) {
            if (node.children) {
                const bookmarkCount = node.children.filter(child => child.url).length;
                const folderCount = node.children.filter(child => !child.url).length;
                
                // Create the current folder entry
                const fullPath = prefix ? `${prefix} > ${node.title}` : node.title;
                result.push({
                    title: fullPath,
                    bookmarkCount: bookmarkCount,
                    folderCount: folderCount
                });
                
                // Process child folders with updated prefix
                if (folderCount > 0) {
                    const childResults = await this.getFlatFolderStructure(
                        node.children.filter(child => !child.url),
                        fullPath
                    );
                    result.push(...childResults);
                }
            }
        }
        
        return result;
    }
    
    async getSuggestionForBookmark(bookmark, currentPath, folderStructure, preset) {
        const instructions = preset.instructions.join('\n');
            
  //          Current folder structure:
//            ${JSON.stringify(folderStructure, null, 2)}
        const message = `
            Analyze this bookmark and suggest organization placement:
            
            Bookmark: ${bookmark.title}
            URL: ${bookmark.url}
            Current location: ${currentPath.join(' > ')}
            
            Organization instructions:
            ${instructions}
            
            Respond with JSON in this exact format:
            {
                "suggestedPath": ["Folder", "Subfolder"],
                "explanation": "Explanation for the suggested location",
                "currentLocationOptimal": true/false,
                "styleMatches": true/false,
                "stabilityScore": 0.0-1.0,
                "recommendedAction": "move"/"keep"/"style_update"
            }
        `;
        console.log(message)
        console.log("Sending bookmark analysis request to AI");
        const response = await this.apiConnector.communicateWithAI(message);
        console.log(response)
        console.log("Received AI response for bookmark analysis");
        return this.parseAISuggestion(response, currentPath);
    }
    
    parseAISuggestion(response, currentPath) {
        try {
            // Extract JSON from the response
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const suggestion = JSON.parse(jsonMatch[0]);
                
                // Validate the structure
                if (!suggestion.suggestedPath || !suggestion.explanation || 
                    typeof suggestion.currentLocationOptimal !== 'boolean' ||
                    typeof suggestion.styleMatches !== 'boolean' ||
                    typeof suggestion.stabilityScore !== 'number' ||
                    !['move', 'style_update', 'keep'].includes(suggestion.recommendedAction)) {
                    throw new Error('Invalid extracted JSON structure');
                }
                
                return suggestion;
            }
            throw new Error('No valid JSON found in response');
        } catch (error) {
            console.error('AI Response:', response);
            console.error('Parse Error:', error);
            // Return a safe default that keeps the bookmark in its current location
            return {
                suggestedPath: currentPath,
                explanation: "Error processing bookmark - maintaining current location",
                currentLocationOptimal: true,
                styleMatches: true,
                stabilityScore: 1.0,
                recommendedAction: "keep"
            };
        }
    }
    
    async moveBookmark(bookmark, targetPath) {
        // Create folders if needed
        let currentParentId = '1'; // Root bookmarks folder
        
        for (const folderName of targetPath) {
            const existingFolders = await chrome.bookmarks.getChildren(currentParentId);
            const matchingFolder = existingFolders.find(
                f => !f.url && f.title.toLowerCase() === folderName.toLowerCase()
            );
            
            if (matchingFolder) {
                currentParentId = matchingFolder.id;
            } else {
                const newFolder = await chrome.bookmarks.create({
                    parentId: currentParentId,
                    title: folderName
                });
                currentParentId = newFolder.id;
            }
        }
        
        // Move the bookmark
        await chrome.bookmarks.move(bookmark.id, { parentId: currentParentId });
    }
}