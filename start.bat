@echo off
REM GINGER - Quick Start Script (Windows)

echo 🧡 Welcome to GINGER - Conversation-First Dating App
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python not found. Please install Python 3.8 or higher.
    exit /b 1
)

echo ✓ Python found:
python --version

REM Install dependencies
echo.
echo 📦 Installing dependencies...
pip install -r requirements.txt

REM Start Flask server
echo.
echo 🚀 Starting GINGER server...
echo    → Open http://localhost:5000 in your browser
echo    → Press Ctrl+C to stop the server
echo.

python app.py
