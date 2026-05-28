import type { MouseEvent } from "react";

export function openExternalUrl(url: string) {
  if (!url) return;
  if (window.desktopApi?.openExternal) {
    void window.desktopApi.openExternal(url);
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

export function handleExternalLinkClick(
  event: Pick<MouseEvent, "preventDefault">,
  url?: string,
) {
  if (!url) return;
  event.preventDefault();
  openExternalUrl(url);
}
