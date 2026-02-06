# GINGER Demo Guide

## Quick Start (60 seconds)

### Mac/Linux:
```bash
bash start.sh
```

### Windows:
```bash
start.bat
```

Or manually:
```bash
pip install -r requirements.txt
python app.py
```

Then open: **http://localhost:5000**

---

## 🎬 Complete Demo Walkthrough (5 minutes)

### 1. Landing Page (30 seconds)
- **URL**: http://localhost:5000
- **What you see**: 
  - GINGER logo at top
  - Headline: "Match on vibe, not looks."
  - Two buttons: "Log In" and "Sign Up"
  - Three feature cards below
- **Demo**: Scroll down to see features, then click "Sign Up"

### 2. Sign Up Flow (1 minute)
- **URL**: http://localhost:5000/signup
- **Step 1**: Enter email and password (min 8 chars)
  - Example: `demo@ginger.app` / `Password123`
  - Click "Sign Up"
  
- **Step 2**: OTP Verification appears
  - **DEBUG TIP**: Check browser console (F12) for OTP code
  - Alternative: OTP is logged in terminal where Flask runs
  - Example OTP: `123456`
  - Copy the 6-digit code and paste into verification field
  - Click "Verify"
  
- **Step 3**: Success screen
  - Shows "Welcome to GINGER!"
  - Click "Go to Home"

### 3. Login (alternate path - 30 seconds)
- **URL**: http://localhost:5000/login
- Use same credentials from signup: `demo@ginger.app` / `Password123`
- Click "Log In"
- Redirects to home page

### 4. Home Page (1 minute)
- **URL**: http://localhost:5000/home
- **Layout**:
  - Top-left: Message icon (click to go to messages)
  - Top-right: Profile icon (click to go to profile)
  - Center: "Find a Vibe" button (main CTA)
- **Demo**: 
  - Click the large "Find a Vibe" button

### 5. Video Call (Vibe) - 1 minute 30 seconds
- **URL**: http://localhost:5000/vibe/<id>
- **Browser prompt**: Allow camera and microphone permissions
  - **IMPORTANT**: Click "Allow" in the browser permission dialog
  - Your local video stream appears in left box labeled "You"
  - Simulated remote user appears in right box with name and age
- **During call**:
  - **Mute Button**: Top-left circular button (mutes/unmutes audio)
  - **End Call Button**: Top-right red circular button
  - Click "End Call" to proceed
- **After call**: Modal appears with question "Did you feel the vibe?"

### 6. Decision Screen (15 seconds)
- Two buttons: "Pass" or "Match"
- **If you click "Pass"**: Returns to home page
- **If you click "Match"**: Shows match result screen

### 7. Match Result Screen (30 seconds)
- Shows: "It's a Match 🎉"
- Displays: "Daily messages left: 3"
- Two buttons:
  - "Message" → Goes to messaging page
  - "Find Another Vibe" → Returns to home

### 8. Messaging / DM Page (1 minute 30 seconds)
- **URL**: http://localhost:5000/messages
- **Empty state**: "No conversations yet" (if first time)
- **With matches**: Shows list of conversations
  - Each item shows: Avatar initial, name, last message preview
  - Click any conversation to open chat
- **Chat Modal** (when opened):
  - Shows conversation thread
  - "Daily messages left: 3" indicator
  - Message input at bottom
  - Type message and click "Send"
  - **Limit enforced**: After 3 messages, can't send more
  - **Auto-replies**: Matched user sends simulated replies after 1.5s delay
  - Click back button to close chat

### 9. Profile Page (1 minute)
- **URL**: http://localhost:5000/profile
- **Profile Info**:
  - Profile photo (GINGER mascot)
  - Username (auto-generated from email)
  - Email address
  - Birthday, star sign, location (show "Not set" if empty)
  - Interests section
  - "Edit Profile" button
- **Settings Section**:
  - Notifications
  - Privacy
  - Account
  - **Log Out** (bottom button, red text)
- **Demo**: Click "Log Out" to return to landing page

---

## 🧪 Key Features to Test

### ✓ Authentication
- [x] Signup with OTP verification
- [x] Login with credentials
- [x] Logout functionality
- [x] Session management

### ✓ Video Calls (WebRTC)
- [x] Camera/microphone permission request
- [x] Local video stream displays
- [x] Remote user simulation
- [x] Mute/unmute audio
- [x] End call functionality
- [x] Call duration tracking

### ✓ Matching System
- [x] Random user selection
- [x] Pass/Match decisions
- [x] Match result screen
- [x] Daily message count display

### ✓ Messaging (3-message limit)
- [x] View conversations
- [x] Open chat threads
- [x] Send messages (up to 3/day per match)
- [x] Message limit enforcement
- [x] Auto-reply simulation
- [x] Message history

### ✓ Profile
- [x] View user info
- [x] Edit profile button
- [x] Settings menu
- [x] Logout functionality

### ✓ Design
- [x] Warm ginger/beige color palette
- [x] Rounded cards and buttons
- [x] Soft shadows
- [x] Mobile-responsive layout
- [x] Smooth transitions

---

## 🔧 Troubleshooting

### Issue: "Camera/microphone permission denied"
**Solution**: 
- Check browser allows camera access
- Check browser console (F12) for errors
- Try incognito/private window

### Issue: "Module not found" error
**Solution**:
```bash
pip install -r requirements.txt
```

### Issue: "Port 5000 already in use"
**Solution**:
```bash
# Kill the process using port 5000
# Linux/Mac: lsof -i :5000 | grep LISTEN | awk '{print $2}' | xargs kill -9
# Windows: netstat -ano | findstr :5000, then taskkill /PID <PID>
```

### Issue: OTP not appearing
**Solution**:
- Check browser console (F12 → Console tab)
- Check terminal where Flask is running
- OTP logs appear as: `DEBUG: OTP for email@example.com: 123456`

### Issue: Video call shows only black screen
**Solution**:
- This is normal for remote video (simulated)
- Local video should show your camera feed
- Check camera is working in system settings

---

## 📊 Test Data

### Test Credentials (after signup):
- Email: `demo@ginger.app`
- Password: `Password123`
- OTP: Check console (F12) or terminal

### Mock Users (for random matching):
1. Sarah, 24 (coffee, hiking, indie films)
2. Maya, 23 (art, music, travel)
3. Alex, 25 (books, photography, cooking)
4. Jordan, 24 (gaming, design, memes)
5. Riley, 26 (yoga, meditation, nature)

### Message Limit:
- 3 messages per match per day
- Resets at midnight (based on date in database)
- Simulated auto-replies from matched users

---

## 🎯 Investor Demo Tips

### What to highlight:
1. **Authentication**: Show secure OTP-based signup
2. **Conversation-First**: Emphasize video call BEFORE profile/matching
3. **Intentional Design**: Show 3-message limit enforces quality
4. **Real Backend**: Show Flask API routes doing actual work
5. **Responsive Design**: Demo on mobile and desktop
6. **Database**: Mention SQLite schema with users, matches, messages

### 60-second pitch:
"GINGER is conversation-first dating. Instead of swiping photos, users have real video calls. If they feel the vibe, they match. Then messaging is limited to 3 per day to encourage depth over volume. It's built with a secure backend, real WebRTC video, and designed for emotional safety and authenticity."

---

## 🚀 Production Deployment

### Before deploying:
1. Replace SQLite with PostgreSQL
2. Add real email/SMTP for OTP
3. Set up WebSocket server for real WebRTC signaling
4. Add HTTPS/SSL certificates
5. Configure environment variables
6. Add database migrations
7. Implement rate limiting
8. Add comprehensive logging

### Deployment options:
- **Vercel**: Flask on serverless (limited)
- **Heroku**: Simple Flask deployment
- **AWS/GCP**: Full control, recommended
- **DigitalOcean**: App Platform or VPS

---

## 📞 Support

- Check README.md for full documentation
- Review app.py for backend logic
- Check static/ folder for frontend JavaScript
- Browser console (F12) for debug logs
- Terminal logs for Flask debug output

Enjoy demoing GINGER! 🧡
