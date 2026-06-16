@echo off
chcp 65001 >nul
setlocal

pushd "%~dp0.."

echo [LPP PC] Project root: %CD%
set "VITE_DEV_SERVER_URL="
call :stop_running_client

call :ensure_dependencies
if not "%ERRORLEVEL%"=="0" (
  echo.
  echo [LPP PC] Dependency check failed.
  pause
  popd
  exit /b 1
)

call :clean_build_output
if not "%ERRORLEVEL%"=="0" (
  echo.
  echo [LPP PC] Could not clean old build output.
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
set "VITE_DEV_SERVER_URL="
call :stop_running_client
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

:stop_running_client
powershell -NoProfile -ExecutionPolicy Bypass -Command "$root=(Resolve-Path '.').Path; $installed=@((Join-Path $env:ProgramFiles 'StartLink\StartLink.exe'), (Join-Path $env:ProgramFiles 'StartLink\startlink.exe'), (Join-Path ${env:ProgramFiles(x86)} 'StartLink\StartLink.exe'), (Join-Path ${env:ProgramFiles(x86)} 'StartLink\startlink.exe')) | Where-Object { $_ }; Get-CimInstance Win32_Process -Filter \"name = 'electron.exe' or name = 'node.exe' or name = 'StartLink.exe' or name = 'startlink.exe'\" | Where-Object { $cmd=$_.CommandLine; $exe=$_.ExecutablePath; ($cmd -and ($cmd -like ('*' + $root + '*') -or $cmd -like '*127.0.0.1:5173*')) -or ($exe -and (($installed -contains $exe) -or ($exe -like ($root + '*')))) } | ForEach-Object { try { Stop-Process -Id $_.ProcessId -Force -ErrorAction Stop; Write-Host ('[LPP PC] Stopped old process PID ' + $_.ProcessId + ' (' + $_.Name + ')') } catch { Write-Host ('[LPP PC] Could not stop old process PID ' + $_.ProcessId + ': ' + $_.Exception.Message) } }"
exit /b 0

:clean_build_output
echo [LPP PC] Cleaning old build output...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$root=(Resolve-Path '.').Path; $dist=Join-Path $root 'dist'; if (Test-Path -LiteralPath $dist) { $resolved=(Resolve-Path -LiteralPath $dist).Path; if (-not $resolved.StartsWith($root, [StringComparison]::OrdinalIgnoreCase)) { throw ('Refusing to clean outside project: ' + $resolved) }; Remove-Item -LiteralPath $resolved -Recurse -Force; Write-Host ('[LPP PC] Removed ' + $resolved) } else { Write-Host '[LPP PC] No dist directory to clean.' }"
exit /b %ERRORLEVEL%

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
