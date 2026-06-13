@echo off
setlocal

set "PROJECT_ROOT=%~dp0.."
cd /d "%PROJECT_ROOT%"

echo [StartLink] Building Windows installer...
echo [StartLink] Working directory: %CD%
echo.

where npm.cmd >nul 2>nul
if errorlevel 1 (
  echo [StartLink] ERROR: npm.cmd was not found. Please install Node.js first.
  exit /b 1
)

call npm.cmd run dist:win
if errorlevel 1 (
  echo.
  echo [StartLink] Build failed.
  exit /b 1
)

echo.
echo [StartLink] Build succeeded.
echo [StartLink] Installer:
echo %CD%\release\startlink-1.0.1-win-x64.exe

endlocal
