@echo off
chcp 65001 >nul
setlocal

pushd "%~dp0.."

echo [LPP PC] Building build-and-run launcher exe...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "scripts\build-build-and-run-launcher.ps1"
if not "%ERRORLEVEL%"=="0" (
  echo.
  echo [LPP PC] Launcher exe build failed.
  pause
  popd
  exit /b 1
)

echo.
echo [LPP PC] Launcher exe created: release\build-and-run-pc-windows.exe
pause
popd
exit /b 0
