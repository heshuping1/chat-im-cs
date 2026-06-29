!define /ifndef UNINSTALL_REGISTRY_KEY_2 "Software\Microsoft\Windows\CurrentVersion\Uninstall\868c27b3-7679-5e69-abe8-9ac298e3acb3"

!macro customInit
  ${IfNot} ${Silent}
    ReadRegStr $R0 HKLM "${UNINSTALL_REGISTRY_KEY_2}" DisplayVersion
    ReadRegStr $R1 HKCU "${UNINSTALL_REGISTRY_KEY_2}" DisplayVersion
    ReadRegStr $R2 HKLM "${UNINSTALL_REGISTRY_KEY}" DisplayVersion
    ReadRegStr $R3 HKCU "${UNINSTALL_REGISTRY_KEY}" DisplayVersion

    ${If} $R0 != ""
      MessageBox MB_YESNO|MB_ICONQUESTION "检测到已安装的 微界 $R0。$\r$\n继续安装会覆盖升级到 startlink ${VERSION}，并保留本地数据。$\r$\n$\r$\n是否继续？" IDYES +2
      Quit
    ${ElseIf} $R1 != ""
      MessageBox MB_YESNO|MB_ICONQUESTION "检测到已安装的 微界 $R1。$\r$\n继续安装会覆盖升级到 startlink ${VERSION}，并保留本地数据。$\r$\n$\r$\n是否继续？" IDYES +2
      Quit
    ${ElseIf} $R2 != ""
      MessageBox MB_YESNO|MB_ICONQUESTION "检测到已安装的 startlink $R2。$\r$\n继续安装会覆盖升级到 startlink ${VERSION}，并保留本地数据。$\r$\n$\r$\n是否继续？" IDYES +2
      Quit
    ${ElseIf} $R3 != ""
      MessageBox MB_YESNO|MB_ICONQUESTION "检测到已安装的 startlink $R3。$\r$\n继续安装会覆盖升级到 startlink ${VERSION}，并保留本地数据。$\r$\n$\r$\n是否继续？" IDYES +2
      Quit
    ${EndIf}
  ${EndIf}
!macroend

!macro customInstallMode
  ReadRegStr $R0 HKLM "${UNINSTALL_REGISTRY_KEY_2}" UninstallString
  ReadRegStr $R1 HKCU "${UNINSTALL_REGISTRY_KEY_2}" UninstallString

  ${If} $R0 != ""
    StrCpy $isForceMachineInstall "1"
  ${ElseIf} $R1 != ""
    StrCpy $isForceCurrentInstall "1"
  ${EndIf}
!macroend

!macro customInstall
  DetailPrint "Updating StartLink shortcut icons"
  ExecWait `"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -File "$INSTDIR\resources\fix-installed-shortcut-icons.ps1" "$INSTDIR"`
  DetailPrint "Refreshing Windows icon cache"
  ExecWait '"$SYSDIR\ie4uinit.exe" -ClearIconCache'
  ExecWait '"$SYSDIR\ie4uinit.exe" -show'
  System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0, i 0, i 0)'
!macroend
