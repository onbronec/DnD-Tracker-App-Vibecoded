@echo off
title DnD Companion Server
cd /d "%~dp0"

:: Pokud nebyl spusten minimalizovane, spustime novou instanci minimalizovane
if not "%1"=="minimized" (
    start "" /min cmd.exe /k ""%~f0" minimized"
    exit /b
)

echo ========================================
echo   DnD Companion - Spousteni serveru
echo ========================================
echo.

node server.js

if errorlevel 1 (
    echo.
    echo [CHYBA] Server se neocekavane ukoncil.
    echo.
    pause
)
