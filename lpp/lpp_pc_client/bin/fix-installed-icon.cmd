@echo off
setlocal

set "PROJECT_ROOT=%~dp0.."
set "ICON=%PROJECT_ROOT%\assets\app-icon-startlink.ico"
set "INSTALLED_EXE=C:\Program Files\StartLink\startlink.exe"
set "INSTALLED_ICON=C:\Program Files\StartLink\resources\startlink-shell-icon-v3.ico"

net session >nul 2>nul
if errorlevel 1 (
  echo [StartLink] Please right-click this script and choose "Run as administrator".
  pause
  exit /b 1
)

cd /d "%PROJECT_ROOT%"

for /f "delims=" %%F in ('powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Get-ChildItem \"$env:LOCALAPPDATA\electron-builder\Cache\winCodeSign\" -Recurse -Filter rcedit-x64.exe -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty FullName"') do set "RCEDIT=%%F"

if not exist "%RCEDIT%" (
  echo [StartLink] ERROR: rcedit-x64.exe was not found. Build the installer once first.
  pause
  exit /b 1
)

if not exist "%ICON%" (
  echo [StartLink] ERROR: icon not found: %ICON%
  pause
  exit /b 1
)

if not exist "%INSTALLED_EXE%" (
  echo [StartLink] ERROR: installed exe not found: %INSTALLED_EXE%
  pause
  exit /b 1
)

echo [StartLink] Patching installed exe icon...
"%RCEDIT%" "%INSTALLED_EXE%" --set-icon "%ICON%"
if errorlevel 1 (
  echo [StartLink] ERROR: failed to patch installed exe icon.
  pause
  exit /b 1
)

echo [StartLink] Installing standalone shortcut icon...
copy /Y "%ICON%" "%INSTALLED_ICON%" >nul
if errorlevel 1 (
  echo [StartLink] ERROR: failed to copy standalone shortcut icon.
  pause
  exit /b 1
)

echo [StartLink] Updating desktop/start menu shortcuts...
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command ^
  "$shell = New-Object -ComObject WScript.Shell; $target = '%INSTALLED_EXE%'; $icon = '%INSTALLED_ICON%,0'; $roots = @($env:PUBLIC + '\Desktop', $env:USERPROFILE + '\Desktop', $env:APPDATA + '\Microsoft\Windows\Start Menu\Programs', $env:ProgramData + '\Microsoft\Windows\Start Menu\Programs'); foreach ($root in $roots) { if (-not (Test-Path $root)) { continue }; Get-ChildItem $root -Recurse -Filter *.lnk -ErrorAction SilentlyContinue | ForEach-Object { $s = $shell.CreateShortcut($_.FullName); if ($s.TargetPath -match 'StartLink|startlink|lppchat|LPP' -or $_.Name -match 'StartLink|startlink|lpp|LPP') { $s.TargetPath = $target; $s.WorkingDirectory = Split-Path $target; $s.IconLocation = $icon; $s.Save(); Write-Output $_.FullName } } }"

echo [StartLink] Refreshing Windows icon cache...
ie4uinit.exe -ClearIconCache >nul 2>nul
ie4uinit.exe -show >nul 2>nul
taskkill /f /im explorer.exe >nul 2>nul
start explorer.exe

echo [StartLink] Done. If a pinned taskbar icon is still old, unpin it and pin again.
pause

endlocal
