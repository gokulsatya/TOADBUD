// Main extension functionality that handles the popup interface and user interactions
document.addEventListener('DOMContentLoaded', function() {
    // Get references to DOM elements we'll be working with
    const input = document.getElementById('securityInput');
    const checkButton = document.getElementById('checkButton');
    const clearButton = document.getElementById('clearButton');
    const resultsSection = document.getElementById('resultsSection');
    const resultsContent = document.getElementById('resultsContent');
    
    // Handle the analyze button click event
    checkButton.addEventListener('click', async () => {
        const value = input.value.trim();
        if (!value) {
            showError('Please enter a URL, IP, or file hash');
            return;
        }

        // Update UI to show loading state
        checkButton.disabled = true;
        checkButton.textContent = 'Analyzing...';
        
        try {
            // Determine what type of input we're dealing with
            const type = determineInputType(value);
            
            // Instead of making the API call directly, we send a message to the background script
            // This is more secure and avoids CORS issues
            const response = await chrome.runtime.sendMessage({
                type: 'ANALYZE',
                data: {
                    type: type,
                    value: value
                }
            });

            // Handle different response scenarios
            if (response.error) {
                throw new Error(response.error);
            }

            if (response.success && response.data) {
                const result = processResults(response.data, type);
                showResults(result);
            } else {
                throw new Error('Analysis failed. Please try again.');
            }
        } catch (error) {
            showError(error.message);
        } finally {
            // Reset UI state regardless of success or failure
            checkButton.disabled = false;
            checkButton.textContent = 'Analyze';
        }
    });

    // Clear button handler - resets the input and hides results
    clearButton.addEventListener('click', () => {
        input.value = '';
        resultsSection.classList.add('hidden');
    });

    // Helper function to determine what type of input the user provided
    function determineInputType(value) {
        if (isValidUrl(value)) return 'url';
        if (isValidIp(value)) return 'ip_address';
        return 'file'; // Default to file hash if not URL or IP
    }

    // Function to display analysis results in the popup
    function showResults(result) {
        resultsSection.classList.remove('hidden');
        resultsContent.innerHTML = `
            <div class="space-y-2">
                <div class="flex items-center space-x-2">
                    <span class="text-${result.malicious ? 'red' : 'green'}-400 text-lg">●</span>
                    <span class="font-medium">${result.verdict}</span>
                </div>
                <div class="text-sm text-gray-300">
                    ${result.details}
                </div>
                ${result.educational ? `
                    <div class="mt-4 p-3 bg-gray-700 rounded-lg">
                        <h3 class="text-sm font-medium text-green-400 mb-2">Learning Point</h3>
                        <p class="text-sm">${result.educational}</p>
                    </div>
                ` : ''}
            </div>
        `;
    }

    // Function to display error messages to the user
    function showError(message) {
        resultsSection.classList.remove('hidden');
        resultsContent.innerHTML = `
            <div class="text-red-400">
                ${message}
            </div>
        `;
    }

    // Input validation helper functions
    function isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }

    function isValidIp(string) {
        const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
        return ipRegex.test(string);
    }

    // Process the API response data into a user-friendly format
    function processResults(data, type) {
        const stats = data.data.attributes.last_analysis_stats;
        const malicious = stats.malicious > 0;

        return {
            malicious,
            verdict: malicious ? 'Potentially Harmful' : 'Likely Safe',
            details: `Detected by ${stats.malicious} out of ${stats.total} security vendors.`,
            educational: getEducationalContent(type, malicious)
        };
    }

    // Provide educational content based on the analysis result
    function getEducationalContent(type, isMalicious) {
        const educational = {
            url: {
                safe: "This URL appears safe, but always be cautious when clicking links. Look for HTTPS and verify the domain name carefully.",
                malicious: "Malicious URLs often mimic legitimate websites. Always verify the sender and check for subtle misspellings in domain names."
            },
            ip_address: {
                safe: "While this IP appears safe, remember that IP addresses can be spoofed. Monitor for unusual connection attempts.",
                malicious: "Malicious IPs are often used in cyber attacks. Consider blocking this IP and investigating any connections from it."
            },
            file: {
                safe: "Even safe files should be handled carefully. Always scan downloads with updated antivirus software.",
                malicious: "Malicious files can harm your system. Never run suspicious executables and keep your security software updated."
            }
        };

        return educational[type][isMalicious ? 'malicious' : 'safe'];
    }
});