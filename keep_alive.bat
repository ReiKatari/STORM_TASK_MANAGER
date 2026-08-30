@echo off
title STORM TASK MANAGER - KEEP ALIVE
color 0A

echo ============================================
echo   STORM TASK MANAGER - PERSISTENT SERVER
echo ============================================
echo.

cd /d "e:\STORM TASK MANAGER"

:loop
echo [%date% %time%] Starting STORM TASK MANAGER on port 3000...
echo.

node build/index.js

echo.
echo [%date% %time%] Server stopped! Restarting in 3 seconds...
echo.
timeout /t 3 /nobreak >nul
goto loop
