@echo off
chcp 65001 >nul
cd /d "%~dp0"
powershell -NoExit -ExecutionPolicy Bypass -File "%~dp0scripts\deploy-workstation.ps1"
