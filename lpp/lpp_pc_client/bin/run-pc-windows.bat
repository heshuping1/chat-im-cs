@echo off
chcp 65001 >nul
setlocal

pushd "%~dp0.."

echo [LPP PC] Starting PC client in dev mode...
echo [LPP PC] If port 5173 is already in use, close the existing dev instance or Electron window first.
call npm.cmd run dev
if not "%ERRORLEVEL%"=="0" (
  echo.
  echo [LPP PC] Start failed.
  pause
  popd
  exit /b 1
)

popd
exit /b 0
