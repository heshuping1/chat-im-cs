param(
  [Parameter(Mandatory = $true)]
  [string]$InstallDir
)

$target = Join-Path $InstallDir 'startlink.exe'
$iconPath = Join-Path $InstallDir 'resources\startlink-shell-icon-v3.ico'
$iconLocation = "$iconPath,0"

if (-not (Test-Path -LiteralPath $target)) {
  Write-Output "[StartLink] installed exe not found: $target"
  exit 0
}

if (-not (Test-Path -LiteralPath $iconPath)) {
  Write-Output "[StartLink] shortcut icon not found: $iconPath"
  exit 0
}

$shell = New-Object -ComObject WScript.Shell
$roots = @(
  [Environment]::GetFolderPath('CommonDesktopDirectory'),
  [Environment]::GetFolderPath('DesktopDirectory'),
  [Environment]::GetFolderPath('CommonPrograms'),
  [Environment]::GetFolderPath('Programs')
) | Where-Object { $_ -and (Test-Path -LiteralPath $_) }

foreach ($root in $roots) {
  Get-ChildItem -LiteralPath $root -Recurse -Filter *.lnk -ErrorAction SilentlyContinue | ForEach-Object {
    $shortcut = $shell.CreateShortcut($_.FullName)
    if ($shortcut.TargetPath -eq $target -or $shortcut.TargetPath -match 'StartLink|startlink') {
      $shortcut.TargetPath = $target
      $shortcut.WorkingDirectory = Split-Path $target
      $shortcut.IconLocation = $iconLocation
      $shortcut.Save()
      Write-Output "[StartLink] shortcut icon updated: $($_.FullName)"
    }
  }
}
