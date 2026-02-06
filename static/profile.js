// Profile page handler
async function loadProfile() {
    try {
        const response = await fetch('/api/user');
        if (!response.ok) throw new Error('Failed to load user');
        
        const user = await response.json();
        
        document.getElementById('profile-name').textContent = user.first_name || user.username || 'Your Profile';
        document.getElementById('profile-email').textContent = user.email;
        document.getElementById('profile-birthday').textContent = user.birthday || 'Not set';
        document.getElementById('profile-starsign').textContent = user.star_sign || 'Not set';
        document.getElementById('profile-location').textContent = user.location || 'Not set';
        
        // Load interests
        const interests = user.interests ? JSON.parse(user.interests) : [];
        const chipsContainer = document.getElementById('interests-chips');
        
        if (interests.length > 0) {
            chipsContainer.innerHTML = interests.map(interest => 
                `<div class="interest-chip">${escapeHtml(interest)}</div>`
            ).join('');
        } else {
            chipsContainer.innerHTML = '<p style="color: #8B8B8B; font-size: 0.9rem;">No interests yet</p>';
        }
        
        localStorage.setItem('user_id', user.id);
    } catch (error) {
        console.error('[v0] Error loading profile:', error);
    }
}

function editProfile() {
    alert('Edit profile functionality would be implemented here');
}

async function logout() {
    try {
        await fetch('/api/logout', { method: 'POST' });
        window.location.href = '/';
    } catch (error) {
        console.error('[v0] Error logging out:', error);
    }
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

// Load profile on page load
window.addEventListener('load', loadProfile);
