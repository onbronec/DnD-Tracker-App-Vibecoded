@echo off
title Instalace DnD Companion (Hrac)
cd /d "%~dp0"

echo ========================================
echo   Instalace DnD Companion (Hrac)
echo ========================================
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0files\install.ps1"

echo Stisknete libovolnou klavesu pro dokonceni...
pause >nul
