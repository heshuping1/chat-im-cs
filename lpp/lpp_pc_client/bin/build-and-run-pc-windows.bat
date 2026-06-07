@echo off
chcp 65001 >nul
setlocal

pushd "%~dp0.."

call :ensure_dependencies
if not "%ERRORLEVEL%"=="0" (
  echo.
  echo [LPP PC] Dependency check failed.
  pause
  popd
  exit /b 1
)

echo [LPP PC] Build started...
call npm.cmd run build
if not "%ERRORLEVEL%"=="0" (
  echo.
  echo [LPP PC] Build failed.
  pause
  popd
  exit /b 1
)

echo.
echo [LPP PC] Build completed. Starting PC client from built output...
call npm.cmd run start
if not "%ERRORLEVEL%"=="0" (
  echo.
  echo [LPP PC] Start failed.
  pause
  popd
  exit /b 1
)

popd
exit /b 0

:ensure_dependencies
set "NEEDS_INSTALL=0"
if not exist "node_modules\better-sqlite3\package.json" set "NEEDS_INSTALL=1"
if not exist "node_modules\@types\better-sqlite3\index.d.ts" set "NEEDS_INSTALL=1"

if "%NEEDS_INSTALL%"=="0" exit /b 0

echo [LPP PC] Native SQLite dependencies are missing. Installing dependencies...
if exist package-lock.json (
  call npm.cmd ci
) else (
  call npm.cmd install
)
if not "%ERRORLEVEL%"=="0" (
  echo.
  echo [LPP PC] Dependency install failed. Please run npm install manually and retry.
  exit /b 1
)

exit /b 0
