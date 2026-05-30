import { useEffect, type RefObject } from "react";

import type { MessageLayoutMode } from "../../data/workspace-ui/workspace-ui-store";

export const messageLayoutMetrics = {
  sidebarExpanded: 156,
  sidebarCollapsed: 76,
  resizer: 3,
  chat: 420,
  compactChat: 360,
  railTrigger: 620,
};

type UseMessageResponsiveLayoutOptions = {
  chatPanelRef: RefObject<HTMLElement | null>;
  listPaneWidth: number;
  messageLayoutMode: MessageLayoutMode;
  profilePaneWidth: number;
  setConversationDrawerOpen: (open: boolean) => void;
  setMessageLayoutMode: (mode: MessageLayoutMode) => void;
  setProfileStandaloneOpen: (open: boolean) => void;
};

export function useMessageResponsiveLayout({
  chatPanelRef,
  listPaneWidth,
  messageLayoutMode,
  profilePaneWidth,
  setConversationDrawerOpen,
  setMessageLayoutMode,
  setProfileStandaloneOpen,
}: UseMessageResponsiveLayoutOptions) {
  useEffect(() => {
    const shell = chatPanelRef.current?.closest(".app-shell.messages-layout");
    if (!shell) return undefined;

    const updateLayoutMode = () => {
      const shellWidth = shell.getBoundingClientRect().width;
      const viewportWidth = Math.min(
        window.innerWidth || shellWidth,
        document.documentElement.clientWidth || shellWidth,
      );
      const width = Math.min(shellWidth, viewportWidth);
      const fullWidth =
        messageLayoutMetrics.sidebarExpanded +
        listPaneWidth +
        messageLayoutMetrics.resizer +
        messageLayoutMetrics.chat +
        messageLayoutMetrics.resizer +
        profilePaneWidth;
      const noProfileWidth =
        messageLayoutMetrics.sidebarExpanded +
        listPaneWidth +
        messageLayoutMetrics.resizer +
        messageLayoutMetrics.chat;
      const nextMode: MessageLayoutMode =
        width >= fullWidth
          ? "full"
          : width >= noProfileWidth
            ? "no-profile"
            : width >= messageLayoutMetrics.railTrigger
              ? "chat-focus"
              : "rail-focus";
      setMessageLayoutMode(nextMode);
    };

    updateLayoutMode();
    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(() => updateLayoutMode());
    resizeObserver?.observe(shell);
    window.addEventListener("resize", updateLayoutMode);
    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", updateLayoutMode);
    };
  }, [chatPanelRef, listPaneWidth, profilePaneWidth, setMessageLayoutMode]);

  useEffect(() => {
    if (messageLayoutMode === "full") {
      setProfileStandaloneOpen(false);
    }
    if (messageLayoutMode !== "chat-focus" && messageLayoutMode !== "rail-focus") {
      setConversationDrawerOpen(false);
    }
  }, [messageLayoutMode, setConversationDrawerOpen, setProfileStandaloneOpen]);
}
