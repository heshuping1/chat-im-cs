@echo off
chcp 65001 >nul
setlocal

pushd "%~dp0"

echo [LPP PC] Build started...
call npm.cmd run build
if errorlevel 1 (
  echo.
  echo [LPP PC] Build failed.
  pause
  popd
  exit /b 1
)

echo.
echo [LPP PC] Build completed.
pause
popd
exit /b 0
