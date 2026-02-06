// Home page handler
document.getElementById('dm-btn').addEventListener('click', () => {
    window.location.href = '/messages';
});

document.getElementById('profile-btn').addEventListener('click', () => {
    window.location.href = '/profile';
});

let currentMatchedUser = null;

document.getElementById('vibe-btn').addEventListener('click', async () => {
    try {
        const response = await fetch('/api/random-match');
        if (!response.ok) throw new Error('Failed to fetch match');
        
        const user = await response.json();
        currentMatchedUser = user;
        
        // Store user ID in session/session storage for vibe page
        sessionStorage.setItem('matchedUser', JSON.stringify(user));
        
        window.location.href = `/vibe/${Math.random() * 1000}`;
    } catch (error) {
        console.error('[v0] Error fetching match:', error);
        alert('Could not find a vibe. Try again!');
    }
});
