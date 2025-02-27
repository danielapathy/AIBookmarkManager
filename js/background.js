/**
 * Background script for the Bookmarks Manager extension
 * Handles API calls and listens for extension messages
 */

// Listeners for message passing
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'callOpenAI') {
        callOpenAIAPI(message.message, message.token, message.model, message.temperature, message.maxTokens)
            .then(result => sendResponse({ result }))
            .catch(error => sendResponse({ error: error.message }));
        return true; // Indicate async response
    }
    
    if (message.type === 'callAnthropic') {
        callAnthropicAPI(message.message, message.token, message.model, message.temperature, message.maxTokens)
            .then(result => sendResponse({ result }))
            .catch(error => sendResponse({ error: error.message }));
        return true; // Indicate async response
    }
});


/**
 * Call the OpenAI API
 * @param {string} message - The message to send to the API
 * @param {string} token - The API token
 * @param {string} model - The model to use
 * @returns {Promise<string>} The API response text
 */
async function callOpenAIAPI(message, token, model, temperature, maxTokens) {
    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                model: model,
                messages: [{ role: 'user', content: message }],
                temperature: temperature || 0.7, // Default if not provided
                max_tokens: maxTokens || 1024 // Default if not provided
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    } catch (error) {
        console.error('OpenAI API Error:', error);
        throw error;
    }
}


/**
 * Call the Anthropic API
 * @param {string} message - The message to send to the API
 * @param {string} token - The API token
 * @param {string} model - The model to use
 * @returns {Promise<string>} The API response text
 */
async function callAnthropicAPI(message, token, model, temperature, maxTokens) {
    try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': token,
                'anthropic-version': '2023-06-01',
                'anthropic-dangerous-direct-browser-access': true
            },
            body: JSON.stringify({
                model: model,
                messages: [{ role: 'user', content: message }],
                temperature: temperature || 0.7, // Default if not provided
                max_tokens: maxTokens || 2000 // Default if not provided
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Anthropic API error: ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        return data.content[0].text;
    } catch (error) {
        console.error('Anthropic API Error:', error);
        throw error;
    }
}
