@echo off
echo Installing Node.js dependencies...
cd backend
call npm install
if %errorlevel% neq 0 (
    echo Error: npm install failed. Make sure Node.js is installed.
    pause
    exit /b 1
)

echo.
echo Backend setup complete!
echo.
echo To start the application:
echo 1. Open two command prompts
echo 2. In first prompt: cd backend && npm start
echo 3. In second prompt: cd frontend && python -m http.server 8080
echo 4. Open http://localhost:8080 in your browser
echo.
pause
