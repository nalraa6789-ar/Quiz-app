@echo off
cd /d "%~dp0"

echo ========================================
echo        QuizApp - Start Server
echo ========================================

aif not exist .env (
    echo [INFO] .env not found. Creating it from .env.example...
    copy /Y .env.example .env >nul
    echo [ACTION] Open .env and set DB_PASSWORD to your MySQL root password.
    echo.
    pause
)

if not exist node_modules (
    echo [INFO] Installing Node.js packages...
    call npm install
    if errorlevel 1 goto :error
)

echo [INFO] Starting QuizApp...
call npm start
if errorlevel 1 goto :error
goto :eof

:error
echo.
echo [ERROR] QuizApp could not start. Read the message above.
pause
