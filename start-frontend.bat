@echo off
echo Starting Frontend Server...
cd frontend
echo Opening http://localhost:8080 in your browser...
start http://localhost:8080
python -m http.server 8080
pause
