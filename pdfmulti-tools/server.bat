@echo off
echo Starting HTTP server at http://localhost:8000
echo Press Ctrl+C to stop the server
python -m http.server 8000
pause 