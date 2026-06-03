export function saveChatArchiveFile(payload: {
  content: string;
  defaultName: string;
  kind: "export" | "backup";
}) {
  return window.desktopApi?.saveChatArchiveFile(payload) ?? null;
}

export function openChatArchiveFile() {
  return window.desktopApi?.openChatArchiveFile() ?? null;
}
