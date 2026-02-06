// Messaging page handler
let currentMatch = null;
let currentMessages = [];
let messagesLeft = 3;

async function loadMatches() {
    try {
        const response = await fetch('/api/matches');
        if (!response.ok) throw new Error('Failed to load matches');
        
        const matches = await response.json();
        
        const chatList = document.querySelector('.chat-list');
        
        if (matches.length === 0) {
            chatList.innerHTML = `
                <div class="empty-state">
                    <p>No conversations yet.</p>
                    <p class="text-hint">Find a vibe to start chatting</p>
                </div>
            `;
            return;
        }
        
        chatList.innerHTML = matches.map((match, idx) => `
            <div class="chat-item" onclick="openChat(${match.id}, 'User ${idx + 1}')">
                <div class="chat-avatar">${String.fromCharCode(65 + idx)}</div>
                <div class="chat-info">
                    <div class="chat-header">
                        <span class="chat-name">User ${idx + 1}</span>
                        <span class="chat-time">Today</span>
                    </div>
                    <div class="chat-preview">Hi! How's your day going?</div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('[v0] Error loading matches:', error);
    }
}

async function openChat(matchId, userName) {
    currentMatch = matchId;
    document.getElementById('chat-name').textContent = userName;
    
    const modal = document.getElementById('chat-modal');
    modal.style.display = 'flex';
    
    await loadMessages(matchId);
}

function closeChat() {
    document.getElementById('chat-modal').style.display = 'none';
}

async function loadMessages(matchId) {
    try {
        const response = await fetch(`/api/messages/${matchId}`);
        if (!response.ok) throw new Error('Failed to load messages');
        
        currentMessages = await response.json();
        renderMessages();
    } catch (error) {
        console.error('[v0] Error loading messages:', error);
    }
}

function renderMessages() {
    const container = document.getElementById('messages-container');
    
    container.innerHTML = currentMessages.map(msg => `
        <div class="message ${msg.sender_id === getUserId() ? 'sent' : 'received'}">
            <div class="message-bubble">${escapeHtml(msg.content)}</div>
        </div>
    `).join('');
    
    // Scroll to bottom
    container.scrollTop = container.scrollHeight;
}

document.getElementById('send-btn').addEventListener('click', async () => {
    const input = document.getElementById('message-input');
    const content = input.value.trim();
    
    if (!content || !currentMatch) return;
    
    try {
        const response = await fetch('/api/send-message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                match_id: currentMatch,
                receiver_id: 2, // Mock receiver
                content
            })
        });
        
        if (response.status === 429) {
            const data = await response.json();
            alert(data.error);
            return;
        }
        
        if (!response.ok) throw new Error('Failed to send message');
        
        const data = await response.json();
        messagesLeft = data.messages_left;
        document.getElementById('messages-left').textContent = messagesLeft;
        
        // Add message to UI
        currentMessages.push({
            content,
            sender_id: getUserId()
        });
        
        input.value = '';
        renderMessages();
        
        // Simulate reply after a delay
        setTimeout(() => simulateReply(), 1500);
    } catch (error) {
        console.error('[v0] Error sending message:', error);
    }
});

function simulateReply() {
    const replies = [
        'That sounds amazing!',
        'Haha I love that 😄',
        'Tell me more!',
        'That\'s so cool',
        'Yeah totally agree',
        'Oh nice, I do that too!'
    ];
    
    const randomReply = replies[Math.floor(Math.random() * replies.length)];
    
    currentMessages.push({
        content: randomReply,
        sender_id: 2 // Other user
    });
    
    renderMessages();
}

function getUserId() {
    return parseInt(localStorage.getItem('user_id') || '1');
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// Load matches on page load
window.addEventListener('load', loadMatches);

// Close modal when clicking outside
document.getElementById('chat-modal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('chat-modal')) {
        closeChat();
    }
});
