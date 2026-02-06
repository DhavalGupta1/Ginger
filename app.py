"""
GINGER - Conversation-First Dating App
Main Flask Application
"""

from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
import sqlite3
import os
import secrets
import json
from datetime import datetime, timedelta
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

app = Flask(__name__, template_folder='templates', static_folder='static')
app.secret_key = secrets.token_hex(16)
CORS(app)

# Database setup
DATABASE = 'ginger.db'

def get_db():
    """Get database connection"""
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initialize database with schema"""
    db = get_db()
    cursor = db.cursor()
    
    # Users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            username TEXT UNIQUE,
            first_name TEXT,
            birthday TEXT,
            star_sign TEXT,
            location TEXT,
            interests TEXT,
            profile_photo TEXT,
            verified BOOLEAN DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # OTP table for verification
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS otps (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL,
            code TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP,
            used BOOLEAN DEFAULT 0
        )
    ''')
    
    # Matches table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS matches (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user1_id INTEGER NOT NULL,
            user2_id INTEGER NOT NULL,
            matched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user1_id) REFERENCES users(id),
            FOREIGN KEY (user2_id) REFERENCES users(id),
            UNIQUE(user1_id, user2_id)
        )
    ''')
    
    # Messages table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sender_id INTEGER NOT NULL,
            receiver_id INTEGER NOT NULL,
            match_id INTEGER NOT NULL,
            content TEXT,
            sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            read BOOLEAN DEFAULT 0,
            FOREIGN KEY (sender_id) REFERENCES users(id),
            FOREIGN KEY (receiver_id) REFERENCES users(id),
            FOREIGN KEY (match_id) REFERENCES matches(id)
        )
    ''')
    
    # Message limit tracking (daily)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS message_limits (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            match_id INTEGER NOT NULL,
            date TEXT NOT NULL,
            messages_sent INTEGER DEFAULT 0,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (match_id) REFERENCES matches(id),
            UNIQUE(user_id, match_id, date)
        )
    ''')
    
    # Vibe passes (conversation history)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS vibe_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            matched_user_id INTEGER NOT NULL,
            decision TEXT NOT NULL,
            call_duration INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (matched_user_id) REFERENCES users(id)
        )
    ''')
    
    db.commit()
    db.close()

# Mock user pool for random matching
MOCK_USERS = [
    {
        'username': 'sarah',
        'first_name': 'Sarah',
        'age': 24,
        'interests': ['coffee', 'hiking', 'indie films']
    },
    {
        'username': 'maya',
        'first_name': 'Maya',
        'age': 23,
        'interests': ['art', 'music', 'travel']
    },
    {
        'username': 'alex',
        'first_name': 'Alex',
        'age': 25,
        'interests': ['books', 'photography', 'cooking']
    },
    {
        'username': 'jordan',
        'first_name': 'Jordan',
        'age': 24,
        'interests': ['gaming', 'design', 'memes']
    },
    {
        'username': 'riley',
        'first_name': 'Riley',
        'age': 26,
        'interests': ['yoga', 'meditation', 'nature']
    }
]

# ==================== Authentication Routes ====================

@app.route('/api/signup', methods=['POST'])
def signup():
    """Sign up new user and send OTP"""
    data = request.json
    email = data.get('email', '').strip()
    password = data.get('password', '').strip()
    
    if not email or not password:
        return jsonify({'error': 'Email and password required'}), 400
    
    if len(password) < 8:
        return jsonify({'error': 'Password must be at least 8 characters'}), 400
    
    db = get_db()
    cursor = db.cursor()
    
    # Check if user already exists
    cursor.execute('SELECT id FROM users WHERE email = ?', (email,))
    if cursor.fetchone():
        db.close()
        return jsonify({'error': 'Email already registered'}), 409
    
    # Generate OTP
    otp_code = str(secrets.randbelow(999999)).zfill(6)
    expires_at = datetime.now() + timedelta(minutes=10)
    
    cursor.execute('''
        INSERT INTO otps (email, code, expires_at)
        VALUES (?, ?, ?)
    ''', (email, otp_code, expires_at))
    
    db.commit()
    db.close()
    
    # Store temp signup data in session
    session['temp_email'] = email
    session['temp_password'] = generate_password_hash(password)
    
    # In production, send OTP via email
    print(f"DEBUG: OTP for {email}: {otp_code}")
    
    return jsonify({
        'message': 'OTP sent to email',
        'otp_debug': otp_code,
        'demo_mode': True
    }), 200

@app.route('/api/verify-otp', methods=['POST'])
def verify_otp():
    """Verify OTP and create user account"""
    data = request.json
    otp_code = data.get('otp', '').strip()
    email = session.get('temp_email')
    password_hash = session.get('temp_password')
    
    if not email or not password_hash:
        return jsonify({'error': 'Session expired. Please sign up again'}), 400
    
    db = get_db()
    cursor = db.cursor()
    
    # Check OTP validity
    cursor.execute('''
        SELECT id FROM otps
        WHERE email = ? AND code = ? AND used = 0 AND expires_at > ?
    ''', (email, otp_code, datetime.now()))
    
    otp_record = cursor.fetchone()
    if not otp_record:
        db.close()
        return jsonify({'error': 'Invalid or expired OTP'}), 400
    
    # Mark OTP as used
    cursor.execute('UPDATE otps SET used = 1 WHERE id = ?', (otp_record['id'],))
    
    # Create user account
    username = email.split('@')[0]
    cursor.execute('''
        INSERT INTO users (email, password_hash, username, verified)
        VALUES (?, ?, ?, 1)
    ''', (email, password_hash, username))
    
    user_id = cursor.lastrowid
    
    db.commit()
    db.close()
    
    # Clear session and log in
    session.clear()
    session['user_id'] = user_id
    session['email'] = email
    
    return jsonify({
        'message': 'Account created successfully',
        'user_id': user_id
    }), 201

@app.route('/api/login', methods=['POST'])
def login():
    """Log in existing user"""
    data = request.json
    email = data.get('email', '').strip()
    password = data.get('password', '').strip()
    
    if not email or not password:
        return jsonify({'error': 'Email and password required'}), 400
    
    db = get_db()
    cursor = db.cursor()
    cursor.execute('SELECT id, password_hash FROM users WHERE email = ?', (email,))
    user = cursor.fetchone()
    db.close()
    
    if not user or not check_password_hash(user['password_hash'], password):
        return jsonify({'error': 'Invalid email or password'}), 401
    
    session['user_id'] = user['id']
    session['email'] = email
    
    return jsonify({
        'message': 'Logged in successfully',
        'user_id': user['id']
    }), 200

@app.route('/api/logout', methods=['POST'])
def logout():
    """Log out user"""
    session.clear()
    return jsonify({'message': 'Logged out successfully'}), 200

@app.route('/api/user', methods=['GET'])
def get_user():
    """Get current user info"""
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': 'Not authenticated'}), 401
    
    db = get_db()
    cursor = db.cursor()
    cursor.execute('''
        SELECT id, email, username, first_name, birthday, star_sign, location, interests
        FROM users WHERE id = ?
    ''', (user_id,))
    user = cursor.fetchone()
    db.close()
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    return jsonify(dict(user)), 200

# ==================== Matching Routes ====================

@app.route('/api/random-match', methods=['GET'])
def random_match():
    """Get random user for vibe matching"""
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': 'Not authenticated'}), 401
    
    import random
    user = random.choice(MOCK_USERS)
    
    return jsonify({
        'username': user['username'],
        'first_name': user['first_name'],
        'age': user['age'],
        'interests': user['interests']
    }), 200

@app.route('/api/vibe-decision', methods=['POST'])
def vibe_decision():
    """Record user's decision after call"""
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': 'Not authenticated'}), 401
    
    data = request.json
    decision = data.get('decision')  # 'pass' or 'match'
    matched_user_id = data.get('matched_user_id')
    call_duration = data.get('call_duration', 0)
    
    if decision not in ['pass', 'match']:
        return jsonify({'error': 'Invalid decision'}), 400
    
    db = get_db()
    cursor = db.cursor()
    
    # Record vibe history
    cursor.execute('''
        INSERT INTO vibe_history (user_id, matched_user_id, decision, call_duration)
        VALUES (?, ?, ?, ?)
    ''', (user_id, matched_user_id, decision, call_duration))
    
    if decision == 'match':
        # Create match entry
        cursor.execute('''
            INSERT OR IGNORE INTO matches (user1_id, user2_id)
            VALUES (?, ?)
        ''', (user_id, matched_user_id))
    
    db.commit()
    db.close()
    
    return jsonify({
        'message': f'Decision recorded: {decision}',
        'matched': decision == 'match'
    }), 200

# ==================== Messaging Routes ====================

@app.route('/api/matches', methods=['GET'])
def get_matches():
    """Get all matches for current user"""
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': 'Not authenticated'}), 401
    
    db = get_db()
    cursor = db.cursor()
    cursor.execute('''
        SELECT * FROM matches
        WHERE user1_id = ? OR user2_id = ?
    ''', (user_id, user_id))
    
    matches = cursor.fetchall()
    db.close()
    
    return jsonify([dict(m) for m in matches]), 200

@app.route('/api/messages/<int:match_id>', methods=['GET'])
def get_messages(match_id):
    """Get messages for a specific match"""
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': 'Not authenticated'}), 401
    
    db = get_db()
    cursor = db.cursor()
    cursor.execute('''
        SELECT * FROM messages
        WHERE match_id = ?
        ORDER BY sent_at ASC
    ''', (match_id,))
    
    messages = cursor.fetchall()
    
    # Mark as read
    cursor.execute('''
        UPDATE messages SET read = 1
        WHERE match_id = ? AND receiver_id = ?
    ''', (match_id, user_id))
    
    db.commit()
    db.close()
    
    return jsonify([dict(m) for m in messages]), 200

@app.route('/api/send-message', methods=['POST'])
def send_message():
    """Send message with daily limit enforcement"""
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': 'Not authenticated'}), 401
    
    data = request.json
    match_id = data.get('match_id')
    receiver_id = data.get('receiver_id')
    content = data.get('content', '').strip()
    
    if not content:
        return jsonify({'error': 'Message cannot be empty'}), 400
    
    db = get_db()
    cursor = db.cursor()
    
    # Check daily message limit (3 messages per match per day)
    today = datetime.now().strftime('%Y-%m-%d')
    cursor.execute('''
        SELECT messages_sent FROM message_limits
        WHERE user_id = ? AND match_id = ? AND date = ?
    ''', (user_id, match_id, today))
    
    limit_record = cursor.fetchone()
    messages_sent = limit_record['messages_sent'] if limit_record else 0
    
    if messages_sent >= 3:
        db.close()
        return jsonify({
            'error': 'Daily message limit reached (3 messages)',
            'messages_left': 0
        }), 429
    
    # Insert message
    cursor.execute('''
        INSERT INTO messages (sender_id, receiver_id, match_id, content)
        VALUES (?, ?, ?, ?)
    ''', (user_id, receiver_id, match_id, content))
    
    # Update daily limit
    if limit_record:
        cursor.execute('''
            UPDATE message_limits SET messages_sent = messages_sent + 1
            WHERE user_id = ? AND match_id = ? AND date = ?
        ''', (user_id, match_id, today))
    else:
        cursor.execute('''
            INSERT INTO message_limits (user_id, match_id, date, messages_sent)
            VALUES (?, ?, ?, 1)
        ''', (user_id, match_id, today))
    
    db.commit()
    db.close()
    
    messages_left = 2 - messages_sent
    
    return jsonify({
        'message': 'Message sent',
        'messages_left': messages_left
    }), 201

# ==================== Profile Routes ====================

@app.route('/api/profile', methods=['GET', 'PUT'])
def profile():
    """Get or update user profile"""
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': 'Not authenticated'}), 401
    
    db = get_db()
    cursor = db.cursor()
    
    if request.method == 'GET':
        cursor.execute('SELECT * FROM users WHERE id = ?', (user_id,))
        user = cursor.fetchone()
        db.close()
        return jsonify(dict(user)), 200
    
    if request.method == 'PUT':
        data = request.json
        cursor.execute('''
            UPDATE users
            SET first_name = ?, birthday = ?, star_sign = ?, location = ?, interests = ?
            WHERE id = ?
        ''', (
            data.get('first_name'),
            data.get('birthday'),
            data.get('star_sign'),
            data.get('location'),
            json.dumps(data.get('interests', [])),
            user_id
        ))
        db.commit()
        db.close()
        return jsonify({'message': 'Profile updated'}), 200

# ==================== Template Routes ====================

@app.route('/')
def index():
    """Landing page"""
    return render_template('index.html')

@app.route('/signup')
def signup_page():
    """Sign up page"""
    return render_template('signup.html')

@app.route('/login')
def login_page():
    """Log in page"""
    return render_template('login.html')

@app.route('/home')
def home_page():
    """Home page"""
    user_id = session.get('user_id')
    if not user_id:
        return redirect(url_for('index'))
    return render_template('home.html')

@app.route('/vibe/<int:matched_user_id>')
def vibe_page(matched_user_id):
    """Video call page"""
    user_id = session.get('user_id')
    if not user_id:
        return redirect(url_for('index'))
    return render_template('vibe.html', matched_user_id=matched_user_id)

@app.route('/messages')
def messages_page():
    """Messages page"""
    user_id = session.get('user_id')
    if not user_id:
        return redirect(url_for('index'))
    return render_template('messages.html')

@app.route('/profile')
def profile_page():
    """Profile page"""
    user_id = session.get('user_id')
    if not user_id:
        return redirect(url_for('index'))
    return render_template('profile.html')

if __name__ == '__main__':
    init_db()
    app.run(debug=True, port=5000)
