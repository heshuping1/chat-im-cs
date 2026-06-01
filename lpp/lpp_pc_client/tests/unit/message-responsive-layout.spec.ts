import { describe, expect, it } from "vitest";

import {
  calculateMessageLayoutMode,
  calculateMessageResizeWidth,
  messageLayoutMetrics,
} from "../../src/renderer/messages/hooks/useMessageResponsiveLayout";

describe("message responsive layout", () => {
  it("shrinks and expands in the expected pane order", () => {
    const listPaneWidth = 220;
    const profilePaneWidth = 330;
    const fullWidth =
      messageLayoutMetrics.sidebarExpanded +
      listPaneWidth +
      messageLayoutMetrics.resizer +
      messageLayoutMetrics.chat +
      messageLayoutMetrics.resizer +
      profilePaneWidth +
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

    const modeFor = (width: number) =>
      calculateMessageLayoutMode({ listPaneWidth, profilePaneWidth, width });

    expect(modeFor(fullWidth)).toBe("full");
    expect(modeFor(fullWidth - 1)).toBe("no-profile");
    expect(modeFor(noProfileWidth - 1)).toBe("compact-sidebar");
    expect(modeFor(compactSidebarWidth - 1)).toBe("no-sidebar");
    expect(modeFor(noSidebarWidth - 1)).toBe("chat-focus");
  });

  it("hides the message assistant pane before hiding the profile pane", () => {
    const listPaneWidth = 220;
    const profilePaneWidth = 330;
    const baseFullWidth =
      messageLayoutMetrics.sidebarExpanded +
      listPaneWidth +
      messageLayoutMetrics.resizer +
      messageLayoutMetrics.chat +
      messageLayoutMetrics.resizer +
      profilePaneWidth +
      messageLayoutMetrics.contextRail;

    expect(
      calculateMessageLayoutMode({
        assistantPaneOpen: true,
        listPaneWidth,
        profilePaneWidth,
        width: baseFullWidth + messageLayoutMetrics.assistant,
      }),
    ).toBe("full");
    expect(
      calculateMessageLayoutMode({
        assistantPaneOpen: true,
        listPaneWidth,
        profilePaneWidth,
        width: baseFullWidth,
      }),
    ).toBe("no-assistant");
    expect(
      calculateMessageLayoutMode({
        assistantPaneOpen: true,
        listPaneWidth,
        profilePaneWidth,
        width: baseFullWidth - 1,
      }),
    ).toBe("no-profile");
  });

  it("limits profile pane resizing so the chat keeps its minimum width", () => {
    const snapshot = {
      assistantPaneOpen: false,
      listPaneWidth: 220,
      profilePaneWidth: 400,
    };
    const roomyShellWidth =
      messageLayoutMetrics.sidebarExpanded +
      snapshot.listPaneWidth +
      messageLayoutMetrics.resizer +
      messageLayoutMetrics.chat +
      messageLayoutMetrics.resizer +
      440 +
      messageLayoutMetrics.contextRail;

    expect(
      calculateMessageResizeWidth({
        requestedWidth: 520,
        shellWidth: roomyShellWidth,
        snapshot,
      }),
    ).toBe(440);

    expect(
      calculateMessageResizeWidth({
        requestedWidth: 200,
        shellWidth: roomyShellWidth,
        snapshot,
      }),
    ).toBe(280);

    expect(
      calculateMessageResizeWidth({
        requestedWidth: 440,
        shellWidth: roomyShellWidth - 60,
        snapshot,
      }),
    ).toBe(380);
  });

  it("includes the assistant pane when limiting profile pane resizing", () => {
    const snapshot = {
      assistantPaneOpen: true,
      listPaneWidth: 220,
      profilePaneWidth: 400,
    };
    const shellWidth =
      messageLayoutMetrics.sidebarExpanded +
      snapshot.listPaneWidth +
      messageLayoutMetrics.resizer +
      messageLayoutMetrics.chat +
      messageLayoutMetrics.assistant +
      messageLayoutMetrics.resizer +
      400 +
      messageLayoutMetrics.contextRail;

    expect(
      calculateMessageResizeWidth({
        requestedWidth: 440,
        shellWidth,
        snapshot,
      }),
    ).toBe(400);
  });
});
