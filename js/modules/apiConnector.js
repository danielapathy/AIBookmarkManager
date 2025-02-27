import { showStatus } from '../utils/helpers.js';

export default class ApiConnector {
    constructor(settingsManager) {
        this.settingsManager = settingsManager;
    }
    
    async communicateWithAI(message) {
        try {
            console.log("communicateWithAI called with:", message);

            if (!this.settingsManager) {
                throw new Error('Settings manager not initialized');
            }

            const settings = this.settingsManager.getSettings();
            console.log("Retrieved settings:", settings);

            if (!settings) {
                throw new Error('No settings configured');
            }

            const {
                preferredApi,
                openaiToken,
                claudeToken,
                openaiModel,
                claudeModel,
                temperature,
                maxTokens
            } = settings;

            if (preferredApi === 'openai' && !openaiToken) {
                throw new Error('OpenAI API token not configured');
            }

            if (preferredApi === 'claude' && !claudeToken) {
                throw new Error('Claude API token not configured');
            }

            console.log(`Sending ${preferredApi} request to background script`);

            return await this.sendMessageToBackground({
                type: preferredApi === 'openai' ? 'callOpenAI' : 'callAnthropic',
                message: message,
                token: preferredApi === 'openai' ? openaiToken : claudeToken,
                model: preferredApi === 'openai' ? openaiModel : claudeModel,
                temperature,
                maxTokens
            });
        } catch (error) {
            console.error('AI Communication Error:', error);
            showStatus(error.message, 'error');
            throw error;
        }
    }

    async sendMessageToBackground(messageData) {
        console.log("Sending message to background:", messageData.type);
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage(messageData, (response) => {
                const error = chrome.runtime.lastError;
                if (error) {
                    console.error("Runtime error:", error);
                    reject(new Error(error.message));
                    return;
                }
                
                if (response && response.error) {
                    console.error("Response error:", response.error);
                    reject(new Error(response.error));
                    return;
                }
                
                resolve(response.result);
            });
        });
    }
    
    async testAIConnection() {
        console.log("apiConnector contacted");
        try {
            console.log("communicateWithAI about to be called");
            const response = await this.communicateWithAI("Hello! Please respond with a simple 'Hello back!'");
            console.log('AI Response:', response);
            showStatus('AI connection successful!', 'success');
            return true;
        } catch (error) {
            console.error('Test connection error:', error);
            showStatus(`AI connection failed: ${error.message}`, 'error');
            throw error;
        }
    }
}