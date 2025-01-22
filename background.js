// Background script for TOAD SAGE
// This script runs in the background and handles API calls to avoid CORS issues

// Store API key securely
chrome.storage.local.get(['vtApiKey'], function(result) {
    if (!result.vtApiKey) {
        // Set a default API key if none exists
        // In production, you should implement proper API key management
        chrome.storage.local.set({ vtApiKey: '5ff6b494f2208cf276025593de613dfd0cafec5eb741d686e5e7292d6f34e14c' });
    }
});

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'ANALYZE') {
        analyzeTarget(request.data)
            .then(response => sendResponse(response))
            .catch(error => sendResponse({ error: error.message }));
        return true; // Required for async response
    }
});

// Main analysis function
async function analyzeTarget(data) {
    try {
        const apiKey = await getApiKey();
        
        // Make API call to VirusTotal
        const response = await fetch(
            `https://www.virustotal.com/api/v3/${data.type}s/${encodeURIComponent(data.value)}`,
            {
                method: 'GET',
                headers: {
                    'x-apikey': apiKey
                }
            }
        );

        if (!response.ok) {
            throw new Error('Analysis failed. Please check your API key or try again later.');
        }

        const result = await response.json();
        return {
            success: true,
            data: result
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

// Helper function to get API key from storage
async function getApiKey() {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(['vtApiKey'], function(result) {
            if (result.vtApiKey) {
                resolve(result.vtApiKey);
            } else {
                reject(new Error('API key not found'));
            }
        });
    });
}

// Log that background script has loaded successfully
console.log('TOAD SAGE background script initialized');