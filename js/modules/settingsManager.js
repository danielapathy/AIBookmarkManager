import { StorageService } from '../utils/storage.js';
import { showStatus } from '../utils/helpers.js';
import ApiConnector from './apiConnector.js';

export default class SettingsManager {
    constructor() {
        this.settings = {};
        this.storageService = new StorageService();
        // Initialize ApiConnector after setting up the settings object
        this.setupEventListeners();
    }
    
    setApiConnector(apiConnector) {
        this.apiConnector = apiConnector
    }
    
    setupEventListeners() {
        console.log("SettingsManager: setupEventListeners");
        document.getElementById('apiSelect').addEventListener('change', (e) => {
            console.log('updateAPISettingsVisibility')
            this.updateAPISettingsVisibility(e.target.value);
        });
        
        // Add the test connection button event listener
        document.getElementById('testAIBtn').addEventListener('click', async () => {
            console.log("testAIConnection");
            await this.testAIConnection();
        });
        
        document.getElementById('behaviorPreset').addEventListener('change', (e) => {
            this.updateBehaviorPreset(e.target.value);
        });

        document.getElementById('temperatureSlider').addEventListener('input', (e) => {
            const value = e.target.value;
            document.getElementById('temperatureValue').textContent = value;
            // When slider changes, set preset to custom
            document.getElementById('behaviorPreset').value = 'custom';
        });
    }
    
    async loadSettings() {
        const result = await this.storageService.get(['settings']);
        this.settings = result.settings || {
            preferredApi: 'openai',
            openaiToken: '',
            claudeToken: '',
            openaiModel: 'gpt-4',
            claudeModel: 'claude-3-opus-20240229',
            behaviorPreset: 'precise',
            temperature: 0.3,
            maxTokens: 1024
        };
        
        // Apply settings to UI
        const apiSelect = document.getElementById('apiSelect');
        apiSelect.value = this.settings.preferredApi || 'openai';
        
        document.getElementById('openaiToken').value = this.settings.openaiToken || '';
        document.getElementById('claudeToken').value = this.settings.claudeToken || '';
        document.getElementById('openaiModel').value = this.settings.openaiModel || 'gpt-4';
        document.getElementById('claudeModel').value = this.settings.claudeModel || 'claude-3-opus-20240229';
        // Add this to your loadSettings method
        document.getElementById('behaviorPreset').value = this.settings.behaviorPreset || 'precise';
        document.getElementById('temperatureSlider').value = this.settings.temperature || 0.3;
        document.getElementById('temperatureValue').textContent = this.settings.temperature || 0.3;
        document.getElementById('maxTokensInput').value = this.settings.maxTokens || 1024 * 5;

        // Show/hide custom controls based on preset
        this.updateBehaviorPreset(this.settings.behaviorPreset || 'precise');
        
        this.updateAPISettingsVisibility(this.settings.preferredApi || 'openai');
        
        // Initialize ApiConnector after settings are loaded
        if (!this.apiConnector) {
            this.apiConnector = new ApiConnector(this);
        }
    }
    
    updateAPISettingsVisibility(api) {
        const openaiSettings = document.getElementById('openaiSettings');
        const claudeSettings = document.getElementById('claudeSettings');
        
        if (api === 'openai') {
            openaiSettings.classList.add('active');
            claudeSettings.classList.remove('active');
        } else {
            openaiSettings.classList.remove('active');
            claudeSettings.classList.add('active');
        }
    }
    
    async saveSettings() {
        // Get values from form and save them to storage
        this.settings = {
            preferredApi: document.getElementById('apiSelect').value,
            openaiToken: document.getElementById('openaiToken').value,
            claudeToken: document.getElementById('claudeToken').value,
            openaiModel: document.getElementById('openaiModel').value,
            claudeModel: document.getElementById('claudeModel').value,
            behaviorPreset: document.getElementById('behaviorPreset').value,
            temperature: parseFloat(document.getElementById('temperatureSlider').value),
            maxTokens: parseInt(document.getElementById('maxTokensInput').value)
        };
        
        await this.storageService.set({ settings: this.settings });
        showStatus('Settings saved successfully!', 'success');
    }
    
    getSettings() {
        // Return a copy of the settings to avoid unintended modifications
        return {...this.settings};
    }
    
    updateBehaviorPreset(preset) {
        const customControls = document.getElementById('customBehaviorControls');
        
        if (preset === 'custom') {
            customControls.style.display = 'block';
        } else {
            customControls.style.display = 'none';
            
            // Set the appropriate temperature for each preset
            let temperature = 0.3; // default
            switch(preset) {
                case 'precise':
                    temperature = 0.3;
                    break;
                case 'balanced':
                    temperature = 0.6;
                    break;
                case 'creative':
                    temperature = 0.9;
                    break;
            }
            
            // Update slider and value display
            document.getElementById('temperatureSlider').value = temperature;
            document.getElementById('temperatureValue').textContent = temperature;
        }
    }
    
    async testAIConnection() {
        const btn = document.getElementById('testAIBtn');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Testing...';
        
        try {
            // Ensure ApiConnector is initialized
            if (!this.apiConnector) {
                this.apiConnector = new ApiConnector(this);
            }
            
            // Get current form values for testing (not saved settings)
            const currentSettings = {
                preferredApi: document.getElementById('apiSelect').value,
                openaiToken: document.getElementById('openaiToken').value,
                claudeToken: document.getElementById('claudeToken').value,
                openaiModel: document.getElementById('openaiModel').value,
                claudeModel: document.getElementById('claudeModel').value
            };
            
            // Temporarily use current form values for testing
            const savedSettings = this.settings;
            this.settings = currentSettings;
            
            await this.apiConnector.testAIConnection();
            
            // Restore original settings
            this.settings = savedSettings;
        } catch (error) {
            showStatus(`AI connection failed: ${error.message}`, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-plug"></i> Test Connection';
        }
    }
}