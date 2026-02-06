// WebRTC Video Call Implementation
let localStream;
let callDuration = 0;
let callTimer;
let isMuted = false;
const matchedUser = JSON.parse(sessionStorage.getItem('matchedUser') || '{}');

const config = {
    iceServers: [
        { urls: ['stun:stun.l.google.com:19302'] },
        { urls: ['stun:stun1.l.google.com:19302'] }
    ]
};

async function initializeCall() {
    try {
        // Request camera and microphone permissions
        localStream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 720 }, height: { ideal: 1280 } },
            audio: true
        });
        
        const localVideo = document.getElementById('local-video');
        localVideo.srcObject = localStream;
        
        // Update remote user info
        if (matchedUser) {
            document.getElementById('remote-name').textContent = matchedUser.first_name || 'Someone';
            document.getElementById('remote-age').textContent = matchedUser.age ? `${matchedUser.age}` : '';
        }
        
        // Simulate remote video (mock - in production would use WebRTC signaling)
        simulateRemoteVideo();
        
        // Start call timer
        startCallTimer();
        
        console.log('[v0] Local stream initialized');
    } catch (error) {
        console.error('[v0] Error accessing media devices:', error);
        alert('Could not access camera/microphone. Please check permissions and try again.');
        window.location.href = '/home';
    }
}

function simulateRemoteVideo() {
    // Create a canvas-based mock for remote video
    const remoteVideo = document.getElementById('remote-video');
    const canvas = document.createElement('canvas');
    canvas.width = 360;
    canvas.height = 640;
    const ctx = canvas.getContext('2d');
    
    // Draw a gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#F4A560');
    gradient.addColorStop(1, '#E07B39');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw avatar
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 3, 60, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw user info
    ctx.fillStyle = 'white';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(matchedUser.first_name || 'Someone', canvas.width / 2, canvas.height / 2);
    
    if (matchedUser.age) {
        ctx.font = '18px sans-serif';
        ctx.fillText(`${matchedUser.age} years old`, canvas.width / 2, canvas.height / 2 + 40);
    }
    
    // Create stream from canvas
    const stream = canvas.captureStream(30);
    remoteVideo.srcObject = stream;
}

function startCallTimer() {
    callDuration = 0;
    callTimer = setInterval(() => {
        callDuration++;
    }, 1000);
}

function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
        return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${minutes}:${String(secs).padStart(2, '0')}`;
}

document.getElementById('mute-btn').addEventListener('click', () => {
    isMuted = !isMuted;
    localStream.getAudioTracks().forEach(track => {
        track.enabled = !isMuted;
    });
    
    const muteBtn = document.getElementById('mute-btn');
    muteBtn.style.opacity = isMuted ? '0.5' : '1';
    console.log('[v0] Audio ' + (isMuted ? 'muted' : 'unmuted'));
});

document.getElementById('end-call-btn').addEventListener('click', async () => {
    // Stop all tracks
    localStream.getTracks().forEach(track => track.stop());
    
    if (callTimer) clearInterval(callTimer);
    
    console.log('[v0] Call ended after ' + formatDuration(callDuration));
    
    // Show decision screen
    showDecisionScreen();
});

function showDecisionScreen() {
    // Create decision modal
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2000;
    `;
    
    const content = document.createElement('div');
    content.style.cssText = `
        background: white;
        padding: 32px;
        border-radius: 20px;
        text-align: center;
        max-width: 400px;
        box-shadow: 0 12px 32px rgba(224, 123, 57, 0.16);
    `;
    
    content.innerHTML = `
        <h1 style="font-size: 1.5rem; color: #3D3D3D; margin-bottom: 12px;">Did you feel the vibe?</h1>
        <p style="color: #8B8B8B; margin-bottom: 32px;">Take your time. Trust your gut.</p>
        <div style="display: flex; gap: 12px;">
            <button id="pass-btn" style="flex: 1; padding: 12px 24px; background: #FFF8F0; color: #E07B39; border: 2px solid #E07B39; border-radius: 8px; font-weight: 600; cursor: pointer;">Pass</button>
            <button id="match-btn" style="flex: 1; padding: 12px 24px; background: #E07B39; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">Match</button>
        </div>
    `;
    
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    document.getElementById('pass-btn').addEventListener('click', () => {
        recordDecision('pass');
    });
    
    document.getElementById('match-btn').addEventListener('click', () => {
        recordDecision('match');
    });
}

async function recordDecision(decision) {
    try {
        const response = await fetch('/api/vibe-decision', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                decision,
                matched_user_id: 1,
                call_duration: callDuration
            })
        });
        
        if (!response.ok) throw new Error('Failed to record decision');
        
        const data = await response.json();
        
        if (data.matched) {
            showMatchScreen();
        } else {
            window.location.href = '/home';
        }
    } catch (error) {
        console.error('[v0] Error recording decision:', error);
        window.location.href = '/home';
    }
}

function showMatchScreen() {
    // Clear the page
    document.body.innerHTML = '';
    
    const container = document.createElement('div');
    container.style.cssText = `
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100vh;
        background: linear-gradient(135deg, #FFF8F0 0%, #FAFBF8 100%);
        text-align: center;
        padding: 24px;
    `;
    
    container.innerHTML = `
        <div style="font-size: 4rem; margin-bottom: 24px;">🎉</div>
        <h1 style="font-size: 2rem; color: #C95E1A; margin-bottom: 12px;">It's a Match!</h1>
        <p style="font-size: 1rem; color: #8B8B8B; margin-bottom: 32px;">Say hi and see if the conversation flows.</p>
        <div style="background: white; padding: 20px 16px; border-radius: 12px; margin-bottom: 24px; width: 100%; max-width: 300px; box-shadow: 0 2px 8px rgba(224, 123, 57, 0.08);">
            <p style="color: #8B8B8B; font-size: 0.9rem; margin-bottom: 8px;">Daily messages left:</p>
            <p style="font-size: 2rem; font-weight: 700; color: #E07B39;">3</p>
        </div>
        <div style="display: flex; flex-direction: column; gap: 12px; width: 100%; max-width: 300px;">
            <button onclick="window.location.href='/messages'" style="padding: 16px 24px; background: #E07B39; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 1rem;">Message</button>
            <button onclick="window.location.href='/home'" style="padding: 16px 24px; background: #FFF8F0; color: #E07B39; border: 2px solid #E07B39; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 1rem;">Find Another Vibe</button>
        </div>
    `;
    
    document.body.appendChild(container);
}

// Initialize call when page loads
window.addEventListener('load', initializeCall);
