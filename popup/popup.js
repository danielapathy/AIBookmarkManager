// Main entry point that initializes and connects all components
import BookmarkManager from '../js/modules/bookmarkManager.js';
import PresetManager from '../js/modules/presetManager.js';
import SettingsManager from '../js/modules/settingsManager.js';
import HistoryManager from '../js/modules/historyManager.js';
import ThemeManager from '../js/modules/themeManager.js';
import UIManager from '../js/modules/uiManager.js';
import ImportExport from '../js/modules/importExport.js';
import ApiConnector from '../js/modules/apiConnector.js';


if (window.templateProcessor) {
    window.templateProcessor.ready(() => {
        console.log(document.getElementById('themeBtn'))
    });
} else {
    document.addEventListener('templateProcessorReady', () => {
        console.log(document.getElementById('themeBtn'))
    }, { once: true });
}

document.addEventListener('templateProcessorReady', async () => {
    console.log('processor ready for main body')
    // Initialize managers
    const uiManager = new UIManager();
    const themeManager = new ThemeManager(uiManager);
    const presetManager = new PresetManager();
    const historyManager = new HistoryManager();
    const settingsManager = new SettingsManager();
    
    // Wait for settings to load before creating the API connector
    await settingsManager.loadSettings();
    themeManager.forceThemeRefresh();
    
    // Create API connector with the settings manager
    const apiConnector = new ApiConnector(settingsManager);
    settingsManager.setApiConnector(apiConnector);
    
    // Initialize bookmark manager with all dependencies
    const bookmarkManager = new BookmarkManager(presetManager, apiConnector, uiManager, historyManager);
    const importExport = new ImportExport();
    
    // Setup history navigation
    document.getElementById('historyBtn').addEventListener('click', () => {
        uiManager.navigateToPage('historyPage');
        historyManager.renderHistory();
    });
    
    // Setup import/export handlers
    document.getElementById('exportBtn').addEventListener('click', importExport.exportBookmarks);
    document.getElementById('importBtn').addEventListener('click', importExport.showImportDialog);
    document.getElementById('importFile').addEventListener('change', importExport.importBookmarks);
    
    // Setup settings navigation
    document.getElementById('settingsBtn').addEventListener('click', () => {
        uiManager.navigateToPage('settingsPage');
    });
    
    // Setup presets navigation
    document.getElementById('managePresetsBtn').addEventListener('click', () => {
        uiManager.navigateToPage('presetsPage');
    });
    
    // Setup organize button
    document.getElementById('organizeBtn').addEventListener('click', () => {
        bookmarkManager.organizeBookmarks();
    });
    
    // Setup preset management
    document.getElementById('addPresetBtn').addEventListener('click', () => {
        presetManager.addNewPreset();
    });
    
    document.getElementById('addInstructionBtn').addEventListener('click', () => {
        presetManager.addInstruction();
    });
    
    document.getElementById('savePresetBtn').addEventListener('click', () => {
        presetManager.saveCurrentPreset();
    });
    
    // Setup settings management
    document.getElementById('saveSettingsBtn').addEventListener('click', () => {
        settingsManager.saveSettings();
    });

    document.getElementById('presetSelect').addEventListener('change', (e) => {
        console.log(e.target.value);
        presetManager.handlePresetSelection(e.target.value);
    });
    
    // Log successful initialization
    console.log('Bookmark Manager extension initialized successfully');
});