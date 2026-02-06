// Authentication signup handler
document.getElementById('signupForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    try {
        const response = await fetch('/api/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        if (!response.ok) {
            const data = await response.json();
            showError('signup-error', data.error);
            return;
        }
        
        const data = await response.json();
        showOTPForm(email, data.otp_debug);
    } catch (error) {
        showError('signup-error', 'Something went wrong. Please try again.');
    }
});

// OTP verification handler
document.getElementById('otpForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const otp = document.getElementById('otp').value;
    
    try {
        const response = await fetch('/api/verify-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ otp })
        });
        
        if (!response.ok) {
            const data = await response.json();
            showError('otp-error', data.error);
            return;
        }
        
        showSuccessScreen();
    } catch (error) {
        showError('otp-error', 'Something went wrong. Please try again.');
    }
});

function showOTPForm(email, debugOtp) {
    document.getElementById('signup-form').style.display = 'none';
    document.getElementById('otp-form').style.display = 'block';
    document.getElementById('verify-email').textContent = email;
    
    if (debugOtp) {
        // Display OTP code in the UI for demo/development
        const displayBox = document.getElementById('otp-display-box');
        const codeDisplay = document.getElementById('otp-code-display');
        displayBox.style.display = 'block';
        codeDisplay.textContent = debugOtp;
        
        console.log(`[v0] Verification Code: ${debugOtp}`);
    }
}

function showSuccessScreen() {
    document.getElementById('otp-form').style.display = 'none';
    document.getElementById('success-message').style.display = 'block';
}

function showError(elementId, message) {
    const element = document.getElementById(elementId);
    element.textContent = message;
    element.style.display = 'block';
}

document.getElementById('resend-otp').addEventListener('click', () => {
    alert('Resend functionality would be implemented here');
});
