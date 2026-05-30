import type { TrayStatus } from "../../../shared/desktop-api";

export function applyWorkspaceTrayStatus(status: TrayStatus) {
  void window.desktopApi?.setTrayStatus(status);
}
