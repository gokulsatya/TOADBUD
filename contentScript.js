// contentScript.js
class ToadSageAssistant {
    constructor() {
        this.createFloatingIcon();
        this.createChatInterface();
        this.initializeEventListeners();
        this.groqKey = null;
        this.loadGroqKey();
    }

    createFloatingIcon() {
        const icon = document.createElement('div');
        icon.innerHTML = '🐸';
        icon.id = 'toad-sage-icon';
        document.body.appendChild(icon);
    }

    createChatInterface() {
        const chat = document.createElement('div');
        chat.id = 'toad-sage-chat';
        chat.innerHTML = `
            <div class="chat-header">
                <span>🐸 TOAD SAGE Assistant</span>
                <button class="close-btn">×</button>
            </div>
            <div class="chat-messages"></div>
            <div class="chat-input">
                <textarea placeholder="Describe the security incident or paste suspicious content..."></textarea>
                <button class="send-btn">Send</button>
            </div>
        `;
        document.body.appendChild(chat);
    }

    async loadGroqKey() {
        const result = await chrome.storage.local.get(['groqApiKey']);
        this.groqKey = result.groqApiKey;
    }

    async analyzeWithGroq(userInput) {
        const systemPrompt = `You are a cybersecurity expert assistant. Analyze the following content and provide:
1. Potential type of security threat/attack
2. MITRE ATT&CK tactics and techniques that might be involved
3. Recommended defensive measures
Format the response in a clear, structured way.`;

        const response = await fetch('https://api.groq.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.groqKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: "mixtral-8x7b-32768",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userInput }
                ],
                temperature: 0.7,
                max_tokens: 2048
            })
        });

        return await response.json();
    }

    addMessage(content, isUser = false) {
        const messagesDiv = document.querySelector('.chat-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${isUser ? 'user' : 'assistant'}`;
        messageDiv.textContent = content;
        messagesDiv.appendChild(messageDiv);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    initializeEventListeners() {
        // Toggle chat interface when icon is clicked
        document.getElementById('toad-sage-icon').addEventListener('click', () => {
            const chat = document.getElementById('toad-sage-chat');
            chat.classList.toggle('visible');
        });

        // Close button handler
        document.querySelector('.close-btn').addEventListener('click', () => {
            document.getElementById('toad-sage-chat').classList.remove('visible');
        });

        // Send button handler
        document.querySelector('.send-btn').addEventListener('click', async () => {
            const textarea = document.querySelector('.chat-input textarea');
            const userInput = textarea.value.trim();
            
            if (!userInput) return;
            
            this.addMessage(userInput, true);
            textarea.value = '';

            try {
                const response = await this.analyzeWithGroq(userInput);
                this.addMessage(response.choices[0].message.content);
            } catch (error) {
                this.addMessage('Error analyzing the content. Please try again.');
            }
        });
    }
}

// Initialize the assistant
new ToadSageAssistant();