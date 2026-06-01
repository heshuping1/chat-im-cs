import { useEffect, type RefObject } from "react";

import type { MessageLayoutMode } from "../../data/workspace-ui/workspace-ui-store";

export const messageLayoutMetrics = {
  sidebarExpanded: 156,
  sidebarCollapsed: 76,
  sidebarHidden: 0,
  assistant: 400,
  contextRail: 56,
  resizer: 3,
  chat: 420,
};

const profilePaneWidthBounds = {
  max: 960,
  min: 280,
};

type MessageResizeSnapshot = {
  assistantPaneWidth?: number;
  assistantPaneOpen?: boolean;
  listPaneWidth: number;
  profilePaneWidth: number;
  sidebarWidth?: number;
};

type UseMessageResponsiveLayoutOptions = {
  chatPanelRef: RefObject<HTMLElement | null>;
  assistantPaneOpen: boolean;
  listPaneWidth: number;
  messageLayoutMode: MessageLayoutMode;
  profilePaneWidth: number;
  setConversationDrawerOpen: (open: boolean) => void;
  setMessageLayoutMode: (mode: MessageLayoutMode) => void;
  setProfileStandaloneOpen: (open: boolean) => void;
};

function clampProfilePaneWidth(width: number) {
  return Math.min(
    profilePaneWidthBounds.max,
    Math.max(profilePaneWidthBounds.min, Math.round(width)),
  );
}

function calculateMessageFullRequiredWidth({
  assistantPaneWidth = messageLayoutMetrics.assistant,
  assistantPaneOpen = false,
  listPaneWidth,
  profilePaneWidth,
  sidebarWidth = messageLayoutMetrics.sidebarExpanded,
}: MessageResizeSnapshot) {
  return (
    sidebarWidth +
    listPaneWidth +
    messageLayoutMetrics.resizer +
    messageLayoutMetrics.chat +
    (assistantPaneOpen ? assistantPaneWidth : 0) +
    messageLayoutMetrics.resizer +
    profilePaneWidth +
    messageLayoutMetrics.contextRail
  );
}

export function calculateMessageResizeWidth({
  requestedWidth,
  shellWidth,
  snapshot,
}: {
  requestedWidth: number;
  shellWidth: number;
  snapshot: MessageResizeSnapshot;
}) {
  const nextWidth = clampProfilePaneWidth(requestedWidth);
  const availableProfileWidth =
    shellWidth -
    calculateMessageFullRequiredWidth({
      ...snapshot,
      profilePaneWidth: 0,
    });
  const maxAllowedWidth = Math.min(
    profilePaneWidthBounds.max,
    Math.max(profilePaneWidthBounds.min, availableProfileWidth),
  );
  return Math.min(nextWidth, maxAllowedWidth);
}

export function calculateMessageLayoutMode({
  assistantPaneOpen = false,
  listPaneWidth,
  profilePaneWidth,
  width,
}: {
  assistantPaneOpen?: boolean;
  listPaneWidth: number;
  profilePaneWidth: number;
  width: number;
}): MessageLayoutMode {
  const fullWidth =
    messageLayoutMetrics.sidebarExpanded +
    listPaneWidth +
    messageLayoutMetrics.resizer +
    messageLayoutMetrics.chat +
    messageLayoutMetrics.resizer +
    profilePaneWidth +
    messageLayoutMetrics.contextRail;
  const fullWithAssistantWidth =
    fullWidth + (assistantPaneOpen ? messageLayoutMetrics.assistant : 0);
  const noProfileWithAssistantWidth =
    messageLayoutMetrics.sidebarExpanded +
    listPaneWidth +
    messageLayoutMetrics.resizer +
    messageLayoutMetrics.chat +
    messageLayoutMetrics.assistant +
    messageLayoutMetrics.contextRail;
  const noProfileWidth =
    messageLayoutMetrics.sidebarExpanded +
    listPaneWidth +
    messageLayoutMetrics.resizer +
    messageLayoutMetrics.chat +
    messageLayoutMetrics.contextRail;
  const compactSidebarWidth =
    messageLayoutMetrics.sidebarCollapsed +
    listPaneWidth +
    messageLayoutMetrics.resizer +
    messageLayoutMetrics.chat +
    messageLayoutMetrics.contextRail;
  const noSidebarWidth =
    messageLayoutMetrics.sidebarHidden +
    listPaneWidth +
    messageLayoutMetrics.resizer +
    messageLayoutMetrics.chat +
    messageLayoutMetrics.contextRail;

  if (width >= fullWithAssistantWidth) return "full";
  if (assistantPaneOpen && width >= noProfileWithAssistantWidth) return "no-profile";
  if (assistantPaneOpen && width >= fullWidth) return "no-assistant";
  if (width >= noProfileWidth) return "no-profile";
  if (width >= compactSidebarWidth) return "compact-sidebar";
  if (width >= noSidebarWidth) return "no-sidebar";
  return "chat-focus";
}

export function useMessageResponsiveLayout({
  assistantPaneOpen,
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
      const nextMode = calculateMessageLayoutMode({
        assistantPaneOpen,
        listPaneWidth,
        profilePaneWidth,
        width,
      });
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
  }, [
    assistantPaneOpen,
    chatPanelRef,
    listPaneWidth,
    profilePaneWidth,
    setMessageLayoutMode,
  ]);

  useEffect(() => {
    if (messageLayoutMode === "full") {
      setProfileStandaloneOpen(false);
    }
    if (messageLayoutMode !== "chat-focus") {
      setConversationDrawerOpen(false);
    }
  }, [messageLayoutMode, setConversationDrawerOpen, setProfileStandaloneOpen]);
}
