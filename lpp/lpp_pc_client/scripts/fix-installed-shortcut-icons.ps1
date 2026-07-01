param(
  [Parameter(Mandatory = $true)]
  [string]$InstallDir
)

$targetCandidates = @(
  (Join-Path $InstallDir 'startlink.exe'),
  (Join-Path $InstallDir 'StartLink.exe')
)
$target = $targetCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
$iconPath = Join-Path $InstallDir 'resources\startlink-shell-icon-v4.ico'
$iconLocation = "$iconPath,0"

if (-not $target) {
  Write-Output "[StartLink] installed exe not found under: $InstallDir"
  exit 0
}

if (-not (Test-Path -LiteralPath $iconPath)) {
  Write-Output "[StartLink] shortcut icon not found: $iconPath"
  exit 0
}

$shell = New-Object -ComObject WScript.Shell
$shortcutName = '微界.lnk'
$roots = @(
  [Environment]::GetFolderPath('CommonDesktopDirectory'),
  [Environment]::GetFolderPath('DesktopDirectory'),
  [Environment]::GetFolderPath('CommonPrograms'),
  [Environment]::GetFolderPath('Programs')
) | Where-Object { $_ -and (Test-Path -LiteralPath $_) }

foreach ($root in $roots) {
  Get-ChildItem -LiteralPath $root -Recurse -Filter *.lnk -ErrorAction SilentlyContinue | ForEach-Object {
    $shortcut = $shell.CreateShortcut($_.FullName)
    if ($targetCandidates -contains $shortcut.TargetPath -or $shortcut.TargetPath -match 'StartLink|startlink' -or $_.Name -match '\u661f\u7edc|微界|StartLink|startlink') {
      $shortcut.TargetPath = $target
      $shortcut.WorkingDirectory = Split-Path $target
      $shortcut.IconLocation = $iconLocation
      $shortcut.Save()
      if ($_.Name -ne $shortcutName) {
        $renamedPath = Join-Path $_.DirectoryName $shortcutName
        Move-Item -Force -LiteralPath $_.FullName -Destination $renamedPath
        Write-Output "[StartLink] shortcut renamed and icon updated: $renamedPath"
      } else {
        Write-Output "[StartLink] shortcut icon updated: $($_.FullName)"
      }
    }
  }
}
