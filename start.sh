#!/bin/bash
# GINGER - Quick Start Script

echo "🧡 Welcome to GINGER - Conversation-First Dating App"
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 not found. Please install Python 3.8 or higher."
    exit 1
fi

echo "✓ Python found: $(python3 --version)"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
pip install -r requirements.txt

# Initialize database
echo ""
echo "🗄️  Initializing database..."
python3 -c "from app import init_db; init_db(); print('✓ Database initialized')"

# Start Flask server
echo ""
echo "🚀 Starting GINGER server..."
echo "   → Open http://localhost:5000 in your browser"
echo "   → Press Ctrl+C to stop the server"
echo ""

python3 app.py
