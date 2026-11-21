@echo off
setlocal
cd /d "%~dp0"
where python >nul 2>nul
if errorlevel 1 (
  echo Python was not found. Install Python 3 or run the site with another local web server.
  pause
  exit /b 1
)
echo Starting OpenDoor at http://localhost:8000
python -m http.server 8000
pause
