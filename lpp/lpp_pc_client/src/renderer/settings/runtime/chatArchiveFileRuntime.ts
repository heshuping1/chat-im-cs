export function saveChatArchiveFile(payload: {
  content: string;
  defaultName: string;
  kind: "export" | "backup";
}) {
  const api = window.desktopApi;
  if (!api?.saveChatArchiveFile) {
    throw new Error("Desktop chat archive file API is unavailable.");
  }
  return api.saveChatArchiveFile(payload);
}

export function openChatArchiveFile() {
  const api = window.desktopApi;
  if (!api?.openChatArchiveFile) {
    throw new Error("Desktop chat archive file API is unavailable.");
  }
  return api.openChatArchiveFile();
}

export function isChatArchiveFileRuntimeAvailable() {
  return Boolean(window.desktopApi?.saveChatArchiveFile && window.desktopApi?.openChatArchiveFile);
}
