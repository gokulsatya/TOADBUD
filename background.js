// Background script for TOAD SAGE
// This script runs in the background and handles API calls to avoid CORS issues

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Handle different types of messages
    if (request.type === 'ANALYZE') {
        analyzeTarget(request.data)
            .then(response => sendResponse(response))
            .catch(error => sendResponse({ error: error.message }));
        return true; // Required for async response
    } else if (request.type === 'SAVE_API_KEY') {
        // Handle saving new API key
        chrome.storage.local.set({ vtApiKey: request.apiKey }, () => {
            sendResponse({ success: true });
        });
        return true;
    }
});

// Main analysis function with improved error handling
async function analyzeTarget(data) {
    try {
        const apiKey = await getApiKey();
        
        // Make API call to VirusTotal with proper error handling
        const response = await fetch(
            `https://www.virustotal.com/api/v3/${data.type}s/${encodeURIComponent(data.value)}`,
            {
                method: 'GET',
                headers: {
                    'x-apikey': apiKey
                }
            }
        );

        // Handle different types of API response errors
        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('Invalid API key. Please check your VirusTotal API key.');
            } else if (response.status === 429) {
                throw new Error('Rate limit exceeded. Please try again in a few minutes.');
            }
            throw new Error(`Analysis failed (${response.status}). Please try again later.`);
        }

        const result = await response.json();
        return {
            success: true,
            data: result
        };
    } catch (error) {
        // Enhanced error handling with more specific messages
        if (error.message.includes('API key not found')) {
            return {
                success: false,
                error: 'Please enter your VirusTotal API key in the extension settings.'
            };
        }
        return {
            success: false,
            error: error.message
        };
    }
}

// Helper function to get API key from storage with better error messaging
async function getApiKey() {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(['vtApiKey'], function(result) {
            if (result.vtApiKey && result.vtApiKey.trim() !== '') {
                resolve(result.vtApiKey);
            } else {
                reject(new Error('API key not found'));
            }
        });
    });
}

// Log that background script has loaded successfully
console.log('TOAD SAGE background script initialized');