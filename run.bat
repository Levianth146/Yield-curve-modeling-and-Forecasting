@echo off
setlocal
cd /d "%~dp0"
title Yield Curve Lab - UI V3

echo Starting Yield Curve Lab...
where py >nul 2>nul
if %errorlevel%==0 (
  py scripts\serve_dashboard.py
) else (
  where python >nul 2>nul
  if %errorlevel% neq 0 (
    echo.
    echo ERROR: Python was not found.
    echo Install Python 3.10+ and enable "Add python.exe to PATH".
    echo.
    pause
    exit /b 1
  )
  python scripts\serve_dashboard.py
)

if %errorlevel% neq 0 (
  echo.
  echo The dashboard server stopped with an error.
  echo See the message above for details.
  pause
)
endlocal
