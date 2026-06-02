@echo off
chcp 65001 >nul
setlocal

pushd "%~dp0.."

echo [LPP PC] Building Windows executable installer...
call npm.cmd run dist:win
if errorlevel 1 (
  echo.
  echo [LPP PC] Windows executable build failed.
  pause
  popd
  exit /b 1
)

echo.
echo [LPP PC] Windows executable build completed. Check the release directory.
pause
popd
exit /b 0
