import { StorageService } from '../utils/storage.js';

export default class PresetManager {
    constructor() {
        this.presets = [];
        this.selectedPresetId = null;
        this.currentEditingPreset = null;
        this.storageService = new StorageService();
        
        // Important: Load presets in the constructor
        this.loadPresets().then(() => {
            this.updatePresetSelect();
        });
    }
    
    generateId() {
        return 'preset_' + Math.random().toString(36).substr(2, 9);
    }
    
    updatePresetSelect() {
        const select = document.getElementById('presetSelect');
        if (!select) return;
        
        // Store the current scroll position
        const scrollPos = select.scrollTop;
        
        // Update options
        select.innerHTML = this.presets.map(preset =>
            `<option value="${preset.id}">${preset.name}</option>`
        ).join('');
        
        // Set the selected value
        select.value = this.selectedPresetId;
        
        // Restore scroll position
        select.scrollTop = scrollPos;
    }
    
    // Add a new method to handle preset selection
    handlePresetSelection(presetId) {
        console.log('Selecting preset:', presetId);
        console.log('Current presets:', this.presets);
        
        this.selectedPresetId = presetId;
        this.savePresets();
    }
    
    async loadPresets() {
        try {
            const result = await this.storageService.get(['presets', 'selectedPresetId']);
            
            // Define default presets
            const defaultPresets = [
                {
                    id: 'preset_default1',
                    name: 'Minimal Organization',
                    instructions: [
                        'Use minimal and simple names for new folders',
                        'Sort items into as few categories as possible',
                        'Utilize subfolders where possible'
                    ]
                },
                {
                    id: 'preset_default2',
                    name: 'Stylized with Emojis',
                    instructions: [
                        'Use relevant emojis at the start of each folder name',
                        'Create descriptive category names',
                        'Group similar items together',
                        'Use subfolder hierarchy for better organization'
                    ]
                },
                {
                    id: 'preset_default3',
                    name: 'Simple Cleanup',
                    instructions: [
                        'Maintain existing folder structure where possible',
                        'Remove empty folders',
                        'Combine similar categories',
                        'Sort bookmarks alphabetically within folders'
                    ]
                }
            ];
            
            // Check if presets exist and have length
            if (!result.presets || result.presets.length === 0) {
                // Set default presets if none exist
                this.presets = [...defaultPresets];
            } else {
                // Use the loaded presets
                this.presets = result.presets;
                
                // Additional validation: check if presets are actually valid
                const hasValidPresets = this.presets.every(preset => 
                    preset && 
                    preset.id && 
                    preset.name && 
                    Array.isArray(preset.instructions)
                );
                
                if (!hasValidPresets) {
                    console.warn('Loaded presets are invalid, restoring defaults');
                    this.presets = [...defaultPresets];
                }
            }
            
            // Make sure there's at least one preset
            if (this.presets.length === 0) {
                console.warn('No presets available after loading, restoring defaults');
                this.presets = [...defaultPresets];
            }
            
            // Set the selected preset ID, defaulting to the first preset if none saved or invalid
            const selectedPresetExists = this.presets.some(p => p.id === result.selectedPresetId);
            this.selectedPresetId = selectedPresetExists ? result.selectedPresetId : this.presets[0].id;
            
            this.renderPresetList();
            this.updatePresetSelect(); // Ensure dropdown is updated
            
            console.log('Loaded presets:', this.presets);
            console.log('Selected preset ID:', this.selectedPresetId);
            
            return this.presets;
        } catch (error) {
            console.error('Error loading presets:', error);
            
            // Fallback to defaults in case of any error
            const defaultPresets = [
                {
                    id: 'preset_default1',
                    name: 'Minimal Organization',
                    instructions: [
                        'Use minimal and simple names for new folders',
                        'Sort items into as few categories as possible',
                        'Utilize subfolders where possible'
                    ]
                },
                // ... other defaults
            ];
            
            this.presets = [...defaultPresets];
            this.selectedPresetId = this.presets[0].id;
            
            this.renderPresetList();
            this.updatePresetSelect();
            
            return this.presets;
        }
    }
    
    getSelectedPreset() {
        return this.presets.find(preset => preset.id === this.selectedPresetId);
    }
    
    async savePresets() {
        try {
            console.log('Saving presets:', this.presets);
            console.log('Selected preset ID:', this.selectedPresetId);
            
            await this.storageService.set({
                presets: this.presets,
                selectedPresetId: this.selectedPresetId
            });
            
            this.updatePresetSelect();
            this.renderPresetList();
        } catch (error) {
            console.error('Error saving presets:', error);
        }
    }
    
    addNewPreset() {
        const newPreset = {
            id: this.generateId(),
            name: 'New Preset',
            instructions: ['Add your instructions here']
        };
        
        this.presets.push(newPreset);
        this.selectedPresetId = newPreset.id;
        this.currentEditingPreset = newPreset;
        this.savePresets();
        
        document.getElementById('presetEditPage').classList.remove('next');
        document.getElementById('presetsPage').classList.add('next');
        this.renderPresetEdit();
    }
    
    addInstruction() {
        if (!this.currentEditingPreset) return;
        
        if (!this.currentEditingPreset.instructions) {
            this.currentEditingPreset.instructions = [];
        }
        
        this.currentEditingPreset.instructions.push('New instruction');
        this.renderInstructions();
    }
    
    saveCurrentPreset() {
        if (!this.currentEditingPreset) return;
        
        this.currentEditingPreset.name = document.getElementById('presetName').value;
        
        // Find and update in the presets array
        const index = this.presets.findIndex(p => p.id === this.currentEditingPreset.id);
        if (index !== -1) {
            this.presets[index] = this.currentEditingPreset;
        }
        
        this.savePresets();
        
        // Navigate back to presets page
        document.getElementById('presetEditPage').classList.add('next');
        document.getElementById('presetsPage').classList.remove('next');
        this.renderPresetList();
    }
    
    renderPresetList() {
        const presetList = document.getElementById('presetList');
        presetList.innerHTML = this.presets.map(preset => `
      <div class="preset-list-item" data-id="${preset.id}">
        <h3>${preset.name}</h3>
        <div class="preset-actions">
          <button class="button button-icon edit-preset">
            <i class="fas fa-edit"></i>
          </button>
          <button class="button button-icon delete-preset">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    `).join('');

        presetList.querySelectorAll('.preset-list-item').forEach(item => {
            const id = item.dataset.id;
            item.querySelector('.edit-preset').addEventListener('click', () => {
                this.editPreset(id);
            });
            item.querySelector('.delete-preset').addEventListener('click', () => {
                this.deletePreset(id);
            });
        });
        
        // Add event listeners
        presetList.querySelectorAll('.preset-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.preset-actions')) {
                    console.log('Selecting preset from card:', card.dataset.id);
                    this.selectedPresetId = card.dataset.id;
                    this.savePresets();
                    this.renderPresetList();
                }
            });
        });
        
        presetList.querySelectorAll('.edit-preset').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const presetId = btn.dataset.id;
                this.editPreset(presetId);
            });
        });
        
        presetList.querySelectorAll('.delete-preset').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const presetId = btn.dataset.id;
                this.deletePreset(presetId);
            });
        });
    }
    
    editPreset(presetId) {
        const preset = this.presets.find(p => p.id === presetId);
        if (!preset) return;
        
        this.currentEditingPreset = {...preset};
        
        document.getElementById('presetsPage').classList.add('next');
        document.getElementById('presetEditPage').classList.remove('next');
        
        this.renderPresetEdit();
    }
    
    deletePreset(presetId) {
        // Don't delete if only one preset remains
        if (this.presets.length <= 1) return;
        
        this.presets = this.presets.filter(p => p.id !== presetId);
        
        if (this.selectedPresetId === presetId) {
            this.selectedPresetId = this.presets[0].id;
        }
        
        this.savePresets();
        this.renderPresetList();
    }
    
    renderPresetEdit() {
        if (!this.currentEditingPreset) return;

        document.getElementById('presetName').value = this.currentEditingPreset.name;
        this.renderInstructions();
    }

    renderInstructions() {
        const instructionList = document.getElementById('instructionList');
        if (!instructionList) return;
        
        instructionList.innerHTML = (this.currentEditingPreset.instructions || []).map((instruction, index) => `
          <div class="instruction-item" data-index="${index}">
            <div class="instruction-number">${index + 1}</div>
            <div class="instruction-content">
              <textarea>${instruction}</textarea>
            </div>
            <div class="instruction-actions">
              <button class="button button-icon drag-handle">
                <i class="fas fa-grip-vertical"></i>
              </button>
              <button class="button button-icon delete-instruction">
                <i class="fas fa-times"></i>
              </button>
            </div>
          </div>
        `).join('');

        this.setupInstructionListeners();
        this.setupDragAndDrop();
    }

    setupInstructionListeners() {
        const instructionList = document.getElementById('instructionList');
        if (!instructionList) return;

        // Listen for text changes
        instructionList.querySelectorAll('textarea').forEach(textarea => {
            textarea.addEventListener('change', () => {
                this.updateInstructions();
            });
        });

        // Listen for delete button clicks
        instructionList.querySelectorAll('.delete-instruction').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const item = e.target.closest('.instruction-item');
                const index = parseInt(item.dataset.index);
                
                this.currentEditingPreset.instructions.splice(index, 1);
                this.renderInstructions();
            });
        });
    }
    
    updateInstructions() {
        if (!this.currentEditingPreset) return;
        
        const instructions = [];
        document.querySelectorAll('.instruction-item textarea').forEach(textarea => {
            instructions.push(textarea.value);
        });
        
        this.currentEditingPreset.instructions = instructions;
    }
    
    setupDragAndDrop() {
        // Implementation for drag-and-drop reordering using Sortable.js
        if (window.Sortable && document.getElementById('instructionList')) {
            new Sortable(document.getElementById('instructionList'), {
                animation: 150,
                handle: '.drag-handle',
                onEnd: () => {
                    this.updateInstructions();
                }
            });
        }
    }
}