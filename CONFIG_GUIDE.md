# Configuration Guide for GINGER

## Environment Setup

### Development Environment Variables (Optional)
Create a `.env` file in the root directory (not needed for demo, but good practice):

```
FLASK_ENV=development
FLASK_APP=app.py
FLASK_DEBUG=1
SECRET_KEY=your-secret-key-here
DATABASE_URL=sqlite:///ginger.db
```

### Flask Configuration
The `app.py` automatically:
- Creates `ginger.db` SQLite database on first run
- Initializes all tables with proper schema
- Sets up CORS for cross-origin requests
- Uses secure session management

## Browser Requirements

### Supported Browsers (WebRTC)
- ✅ Chrome/Chromium 70+
- ✅ Firefox 60+
- ✅ Safari 14+
- ✅ Edge 79+

### Permissions Required
1. **Camera Access** - For video calls
2. **Microphone Access** - For audio calls

These are requested automatically when entering video call page.

## Database

### SQLite Database
- **File**: `ginger.db` (created automatically)
- **Location**: Root project directory
- **Schema**: 6 tables (users, otps, matches, messages, message_limits, vibe_history)
- **Size**: ~1MB after demo data

### Reset Database
To start fresh:
```bash
rm ginger.db
python app.py  # Recreates database
```

## Port Configuration

### Default Port: 5000
If port 5000 is already in use, modify in `app.py`:

```python
if __name__ == '__main__':
    init_db()
    app.run(debug=True, port=5000)  # Change 5000 to desired port
```

### Check if Port is Available
```bash
# Mac/Linux
lsof -i :5000

# Windows
netstat -ano | findstr :5000
```

## CORS Configuration

Currently enabled for all origins (development mode).
For production, modify in `app.py`:

```python
CORS(app)  # Change to specific origins
```

Example for production:
```python
CORS(app, origins=['https://yourdomain.com'])
```

## Security Considerations

### For Production
1. ✅ Change `SECRET_KEY` to random value
2. ✅ Set `debug=False` in `app.run()`
3. ✅ Use environment variables for secrets
4. ✅ Enable HTTPS/SSL
5. ✅ Configure CORS properly
6. ✅ Add rate limiting
7. ✅ Use PostgreSQL instead of SQLite
8. ✅ Add CSRF protection

### Current Demo Configuration
- Uses default secret key (demo only)
- Debug mode enabled (shows errors)
- CORS allows all origins
- SQLite in-memory fast (not persistent across restarts)

## File Structure

```
/vercel/share/v0-project/
├── app.py (Main Flask app)
├── ginger.db (SQLite database - created on run)
├── requirements.txt
├── README.md
├── DEMO_GUIDE.md
├── PROJECT_SUMMARY.md
├── start.sh / start.bat
├── templates/ (HTML pages)
├── static/ (CSS, JavaScript)
└── public/ (Images)
```

## Common Issues & Solutions

### Issue: Module not found
```bash
pip install -r requirements.txt
```

### Issue: Port already in use
```bash
# Find process
lsof -i :5000  # Mac/Linux

# Kill process
kill -9 <PID>

# Or change port in app.py
```

### Issue: Camera permission denied
- Check browser settings
- Try incognito/private window
- Check system permissions

### Issue: Database locked
- Delete `ginger.db` and restart
- Or restart Flask application

### Issue: CORS errors
- These are normal for cross-origin requests
- Ignore if developing locally
- Fix in production with proper CORS config

## Performance

### Expected Performance
- **Page Load**: < 500ms
- **API Response**: < 100ms
- **Video Connection**: 1-3 seconds
- **Message Send**: < 200ms

### Optimization Tips
- Use Firefox Developer Tools for profiling
- Check Network tab in browser DevTools
- Monitor Flask console for slow queries

## Deployment

### Local Development
```bash
python app.py
```

### Production (Vercel)
Note: Flask on Vercel requires serverless adaptation.
Recommend using Heroku or AWS instead.

### Production (Heroku)
1. Create `Procfile`:
```
web: python app.py
```

2. Deploy:
```bash
heroku create
heroku config:set SECRET_KEY=your-secret
git push heroku main
```

### Production (AWS/DigitalOcean)
Deploy to always-on VPS or AppPlatform.
Replace SQLite with PostgreSQL.

## Testing the App

### Test Signup
1. Go to `/signup`
2. Enter email and password
3. Check console (F12) for OTP
4. Enter OTP to verify

### Test Login
1. Go to `/login`
2. Use signup credentials
3. Should redirect to `/home`

### Test Video Call
1. From home, click "Find a Vibe"
2. Allow camera/microphone
3. Click "End Call" after a few seconds
4. Choose Pass or Match

### Test Messaging
1. Make a match (choose Match after call)
2. Click "Message" button
3. Send messages (limited to 3/day)
4. See auto-replies

## Logging & Debugging

### Flask Debug Logs
Visible in terminal where `python app.py` runs.

### Browser Console Logs
Press F12 → Console tab to see JavaScript logs.
Look for `[v0]` prefix for debug statements.

### OTP Debug
When signing up, OTP appears in console:
```
DEBUG: OTP for email@example.com: 123456
```

## API Testing

### Using curl
```bash
# Signup
curl -X POST http://localhost:5000/api/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@ginger.app","password":"Password123"}'

# Login
curl -X POST http://localhost:5000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@ginger.app","password":"Password123"}'

# Get user
curl http://localhost:5000/api/user
```

### Using Postman
1. Import API endpoints from documentation
2. Set base URL: `http://localhost:5000`
3. Use cookies for session management

## Monitoring

### SQLite Database
```bash
# View users
sqlite3 ginger.db "SELECT * FROM users;"

# View messages
sqlite3 ginger.db "SELECT * FROM messages;"

# View matches
sqlite3 ginger.db "SELECT * FROM matches;"
```

## Backup & Recovery

### Backup Database
```bash
cp ginger.db ginger.db.backup
```

### Restore Database
```bash
cp ginger.db.backup ginger.db
```

## Updates & Maintenance

### Update Dependencies
```bash
pip install --upgrade -r requirements.txt
```

### Check for Security Issues
```bash
pip check
```

## Support

For issues:
1. Check DEMO_GUIDE.md troubleshooting
2. Check browser console (F12)
3. Check Flask terminal output
4. Review README.md documentation
5. Check PROJECT_SUMMARY.md for overview

---

Built with intention. Configured for success. Ready to scale. 🧡
