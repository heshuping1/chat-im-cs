import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  calculateServiceResizeWidth,
  calculateServiceRequiredWidth,
  calculateServiceResponsiveLayout,
  isServiceAssistantPaneVisible,
  serviceLayoutMetrics,
} from "../../src/renderer/components/OnlineServicePage";

describe("online service responsive layout", () => {
  const fullLayout = {
    serviceAssistantPane: "aiDraft" as const,
    serviceAssistantPaneWidth: 400,
    serviceCustomerPaneCollapsed: false,
    serviceListPaneCollapsed: false,
    serviceListPaneWidth: 340,
    serviceProfilePaneWidth: 400,
    sidebarCollapsed: false,
  };

  it("keeps the online service chat width aligned with IM", () => {
    expect(serviceLayoutMetrics.chatMin).toBe(420);
  });

  it("calculates required width from the rendered grid columns", () => {
    expect(calculateServiceRequiredWidth(fullLayout)).toBe(
      fullLayout.serviceListPaneWidth +
        serviceLayoutMetrics.sidebarExpanded +
        serviceLayoutMetrics.resizer +
        serviceLayoutMetrics.chatMin +
        serviceLayoutMetrics.resizer +
        fullLayout.serviceAssistantPaneWidth +
        serviceLayoutMetrics.resizer +
        fullLayout.serviceProfilePaneWidth +
        serviceLayoutMetrics.customerRail,
    );

    expect(
      calculateServiceRequiredWidth({
        ...fullLayout,
        serviceAssistantPane: null,
        serviceCustomerPaneCollapsed: true,
        serviceListPaneCollapsed: true,
      }),
    ).toBe(
      serviceLayoutMetrics.listRail +
        serviceLayoutMetrics.sidebarExpanded +
        serviceLayoutMetrics.chatMin +
        serviceLayoutMetrics.customerRail,
    );
  });

  it("collapses assistant, customer pane, and service internals without owning the global sidebar", () => {
    expect(
      calculateServiceResponsiveLayout({
        ...fullLayout,
        width: calculateServiceRequiredWidth(fullLayout, "full"),
      }),
    ).toBe("full");

    expect(
      calculateServiceResponsiveLayout({
        ...fullLayout,
        width: calculateServiceRequiredWidth(fullLayout, "no-assistant"),
      }),
    ).toBe("no-customer");

    expect(
      calculateServiceResponsiveLayout({
        ...fullLayout,
        width: calculateServiceRequiredWidth(fullLayout, "no-customer"),
      }),
    ).toBe("no-customer");

    expect(
      calculateServiceResponsiveLayout({
        ...fullLayout,
        width: calculateServiceRequiredWidth(fullLayout, "compact-sidebar"),
      }),
    ).toBe("compact-sidebar");

    expect(
      calculateServiceResponsiveLayout({
        ...fullLayout,
        width: calculateServiceRequiredWidth(fullLayout, "compact-sidebar") - 1,
      }),
    ).toBe("no-sidebar");

    expect(
      calculateServiceResponsiveLayout({
        ...fullLayout,
        width: calculateServiceRequiredWidth(fullLayout, "no-sidebar") - 1,
      }),
    ).toBe("queue-focus");

    expect(
      calculateServiceResponsiveLayout({
        ...fullLayout,
        width: calculateServiceRequiredWidth(fullLayout, "queue-focus") - 1,
      }),
    ).toBe("chat-focus");

    expect(
      calculateServiceResponsiveLayout({
        ...fullLayout,
        width: calculateServiceRequiredWidth(fullLayout, "chat-focus") - 1,
      }),
    ).toBe("chat-focus");
  });

  it("uses compact, hidden sidebar, queue rail, and chat focus widths in order", () => {
    expect(calculateServiceRequiredWidth(fullLayout, "compact-sidebar")).toBe(
      serviceLayoutMetrics.sidebarCollapsed +
        fullLayout.serviceListPaneWidth +
        serviceLayoutMetrics.resizer +
        serviceLayoutMetrics.chatMin +
        serviceLayoutMetrics.customerRail,
    );

    expect(calculateServiceRequiredWidth(fullLayout, "no-sidebar")).toBe(
      fullLayout.serviceListPaneWidth +
        serviceLayoutMetrics.resizer +
        serviceLayoutMetrics.chatMin +
        serviceLayoutMetrics.customerRail,
    );

    expect(calculateServiceRequiredWidth(fullLayout, "queue-focus")).toBe(
      serviceLayoutMetrics.listRail +
        serviceLayoutMetrics.chatMin +
        serviceLayoutMetrics.customerRail,
    );

    expect(calculateServiceRequiredWidth(fullLayout, "chat-focus")).toBe(
      serviceLayoutMetrics.chatMin + serviceLayoutMetrics.customerRail,
    );
  });

  it("keeps global sidebar width independent until narrow service modes own the space", () => {
    expect(calculateServiceRequiredWidth(fullLayout, "full")).toBe(
      fullLayout.serviceListPaneWidth +
        serviceLayoutMetrics.sidebarExpanded +
        serviceLayoutMetrics.resizer +
        serviceLayoutMetrics.chatMin +
        serviceLayoutMetrics.resizer +
        fullLayout.serviceAssistantPaneWidth +
        serviceLayoutMetrics.resizer +
        fullLayout.serviceProfilePaneWidth +
        serviceLayoutMetrics.customerRail,
    );

    expect(
      calculateServiceRequiredWidth(
        { ...fullLayout, sidebarCollapsed: true },
        "full",
      ),
    ).toBe(
      calculateServiceRequiredWidth(fullLayout, "full") -
        serviceLayoutMetrics.sidebarExpanded +
        serviceLayoutMetrics.sidebarCollapsed,
    );

    expect(calculateServiceRequiredWidth(fullLayout, "no-sidebar")).toBe(
      calculateServiceRequiredWidth({ ...fullLayout, sidebarCollapsed: true }, "no-sidebar"),
    );
  });

  it("keeps the 1047px service workspace readable with rail-based side context", () => {
    expect(
      calculateServiceResponsiveLayout({
        ...fullLayout,
        serviceAssistantPane: null,
        width: 1047,
      }),
    ).toBe("no-customer");

    expect(
      calculateServiceResponsiveLayout({
        ...fullLayout,
        width: 1047,
      }),
    ).toBe("compact-sidebar");
  });

  it("treats quick reply as the same assistant pane segment", () => {
    expect(
      calculateServiceRequiredWidth({
        ...fullLayout,
        serviceAssistantPane: "quickReply",
      }),
    ).toBe(calculateServiceRequiredWidth(fullLayout));

    expect(
      calculateServiceResponsiveLayout({
        ...fullLayout,
        serviceAssistantPane: "quickReply",
        width: calculateServiceRequiredWidth(fullLayout, "no-assistant"),
      }),
    ).toBe("no-customer");
  });

  it("keeps assistant tools visible after customer info collapses for narrow service layouts", () => {
    expect(isServiceAssistantPaneVisible("full", "aiDraft")).toBe(true);
    expect(isServiceAssistantPaneVisible("no-customer", "aiDraft")).toBe(true);
    expect(isServiceAssistantPaneVisible("no-assistant", "aiDraft")).toBe(false);
    expect(isServiceAssistantPaneVisible("compact-sidebar", "aiDraft")).toBe(false);
    expect(isServiceAssistantPaneVisible("no-sidebar", "aiDraft")).toBe(false);
    expect(isServiceAssistantPaneVisible("queue-focus", "aiDraft")).toBe(false);
    expect(isServiceAssistantPaneVisible("chat-focus", "aiDraft")).toBe(false);
    expect(isServiceAssistantPaneVisible("full", null)).toBe(false);
  });

  it("uses the collapsed sidebar as the user's baseline and does not auto expand it", () => {
    const userCollapsed = { ...fullLayout, sidebarCollapsed: true };

    expect(
      calculateServiceRequiredWidth(userCollapsed, "full"),
    ).toBe(
      calculateServiceRequiredWidth(fullLayout, "full") -
        serviceLayoutMetrics.sidebarExpanded +
        serviceLayoutMetrics.sidebarCollapsed,
    );

    expect(
      calculateServiceResponsiveLayout({
        ...userCollapsed,
        width: calculateServiceRequiredWidth(userCollapsed, "no-customer"),
      }),
    ).toBe("no-customer");

    expect(
      calculateServiceResponsiveLayout({
        ...userCollapsed,
        width: calculateServiceRequiredWidth(userCollapsed, "compact-sidebar"),
      }),
    ).toBe("no-sidebar");
  });

  it("clamps service pane resizing so chat keeps its minimum width", () => {
    const shellWidth = calculateServiceRequiredWidth(fullLayout, "full");

    expect(
      calculateServiceResizeWidth({
        mode: "full",
        pane: "list",
        requestedWidth: 420,
        shellWidth,
        snapshot: fullLayout,
      }),
    ).toBe(fullLayout.serviceListPaneWidth);

    expect(
      calculateServiceResizeWidth({
        mode: "full",
        pane: "assistant",
        requestedWidth: 420,
        shellWidth,
        snapshot: fullLayout,
      }),
    ).toBe(fullLayout.serviceAssistantPaneWidth);

    expect(
      calculateServiceResizeWidth({
        mode: "full",
        pane: "customer",
        requestedWidth: 440,
        shellWidth,
        snapshot: fullLayout,
      }),
    ).toBe(fullLayout.serviceProfilePaneWidth);

    expect(
      calculateServiceResizeWidth({
        mode: "no-sidebar",
        pane: "list",
        requestedWidth: 420,
        shellWidth: calculateServiceRequiredWidth(fullLayout, "no-sidebar"),
        snapshot: fullLayout,
      }),
    ).toBe(fullLayout.serviceListPaneWidth);
  });

  it("lets the service assistant pane expand until the chat reaches its minimum width", () => {
    const roomyShellWidth =
      serviceLayoutMetrics.sidebarExpanded +
      fullLayout.serviceListPaneWidth +
      serviceLayoutMetrics.resizer +
      serviceLayoutMetrics.chatMin +
      serviceLayoutMetrics.resizer +
      780 +
      serviceLayoutMetrics.resizer +
      fullLayout.serviceProfilePaneWidth +
      serviceLayoutMetrics.customerRail;

    expect(
      calculateServiceResizeWidth({
        mode: "full",
        pane: "assistant",
        requestedWidth: 700,
        shellWidth: roomyShellWidth,
        snapshot: fullLayout,
      }),
    ).toBe(700);

    expect(
      calculateServiceResizeWidth({
        mode: "full",
        pane: "assistant",
        requestedWidth: 960,
        shellWidth: roomyShellWidth,
        snapshot: fullLayout,
      }),
    ).toBe(780);
  });

  it("keeps online service pane resizers easy to grab", () => {
    const css = readFileSync(
      new URL(
        "../../src/renderer/styles/customer-service/customer-service.css",
        import.meta.url,
      ),
      "utf8",
    );

    expect(css).toContain(".h-flagship-grid .service-assistant-resizer");
    expect(css).toContain("margin-inline: -5px !important;");
    expect(css).toContain("padding-inline: 5px !important;");
    expect(css).toContain("z-index: 8;");
  });

  it("keeps online service message rows aligned to the chat edges", () => {
    const stage = readFileSync(
      new URL(
        "../../src/renderer/customer-service/components/CustomerServiceMessageStage.tsx",
        import.meta.url,
      ),
      "utf8",
    );
    const css = readFileSync(
      new URL(
        "../../src/renderer/styles/customer-service/customer-service.css",
        import.meta.url,
      ),
      "utf8",
    );

    expect(stage).toContain("className={`cs-message-row ${mine ? \"mine\" : \"other\"}`}");
    expect(css).toContain(".h-message-stage .cs-message-row.mine");
    expect(css).toContain("justify-content: flex-end;");
    expect(css).toContain(".h-message-stage .cs-message-row.other");
    expect(css).toContain("justify-content: flex-start;");
  });

  it("keeps customer typing preview below the scroller without overlaying messages", () => {
    const stage = readFileSync(
      new URL(
        "../../src/renderer/customer-service/components/CustomerServiceMessageStage.tsx",
        import.meta.url,
      ),
      "utf8",
    );
    const css = readFileSync(
      new URL(
        "../../src/renderer/styles/customer-service/customer-service.css",
        import.meta.url,
      ),
      "utf8",
    );

    expect(stage).toContain("cs-message-stage-shell");
    expect(stage).toContain("cs-typing-preview-dock");
    expect(css).toContain("grid-template-rows: minmax(0, 1fr) auto;");
    expect(css).toContain(".cs-typing-preview-dock");
    expect(css).toContain("justify-content: flex-start;");
    expect(css).not.toContain(".cs-typing-preview-dock {\n  position: absolute");
    expect(css).not.toContain(".cs-typing-preview-dock {\n  position: fixed");
  });
});
