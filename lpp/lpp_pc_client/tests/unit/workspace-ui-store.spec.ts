import { describe, expect, it, vi } from "vitest";
import {
  selectCloseOpenServiceThread,
  selectActiveModule,
  selectMessageLayoutState,
  selectOpenServiceThreadIds,
  selectServiceLayoutState,
  selectSetActiveModule,
  selectSetServiceThreadFilter,
} from "../../src/renderer/data/workspace-ui/workspace-ui-store";
import { useWorkspaceStore } from "../../src/renderer/data/workspace-ui/workspace-store-core";

describe("workspace ui store selectors", () => {
  it("defaults customer service reception to busy before server sync", () => {
    expect(useWorkspaceStore.getState().customerServiceStatus).toBe("busy");
  });

  it("selects navigation and layout state from compatible workspace state", () => {
    const setActiveModule = vi.fn();
    const closeOpenServiceThread = vi.fn();
    const setFilter = vi.fn();
    const state = {
      activeModule: "messages" as const,
      activeThreadId: "thread-1",
      openServiceThreadIds: ["thread-1", "thread-2"],
      activeImConversationId: "conversation-1",
      activeContactId: "contact-1",
      listPaneWidth: 220,
      profilePaneWidth: 400,
      serviceListPaneWidth: 340,
      serviceProfilePaneWidth: 400,
      serviceAssistantPaneWidth: 400,
      serviceCustomerPaneCollapsed: false,
      serviceListPaneCollapsed: false,
      serviceAssistantPane: null,
      serviceLayoutMode: "full" as const,
      sidebarCollapsed: false,
      messageProfileVisible: true,
      messageLayoutMode: "full" as const,
      filter: "all" as const,
      messageFilter: "all" as const,
      contactFilter: "customer" as const,
      setActiveModule,
      setActiveThread: vi.fn(),
      closeOpenServiceThread,
      setActiveImConversation: vi.fn(),
      setActiveContact: vi.fn(),
      setListPaneWidth: vi.fn(),
      setProfilePaneWidth: vi.fn(),
      setServiceListPaneWidth: vi.fn(),
      setServiceProfilePaneWidth: vi.fn(),
      setServiceAssistantPaneWidth: vi.fn(),
      setServiceCustomerPaneCollapsed: vi.fn(),
      setServiceListPaneCollapsed: vi.fn(),
      setServiceAssistantPane: vi.fn(),
      setServiceLayoutMode: vi.fn(),
      setSidebarCollapsed: vi.fn(),
      setMessageProfileVisible: vi.fn(),
      setMessageLayoutMode: vi.fn(),
      setFilter,
      setMessageFilter: vi.fn(),
      setContactFilter: vi.fn(),
    };

    expect(selectActiveModule(state)).toBe("messages");
    expect(selectSetActiveModule(state)).toBe(setActiveModule);
    expect(selectOpenServiceThreadIds(state)).toEqual(["thread-1", "thread-2"]);
    expect(selectCloseOpenServiceThread(state)).toBe(closeOpenServiceThread);
    expect(selectSetServiceThreadFilter(state)).toBe(setFilter);
    expect(selectMessageLayoutState(state)).toMatchObject({
      listPaneWidth: 220,
      messageLayoutMode: "full",
      profilePaneWidth: 400,
    });
    expect(selectServiceLayoutState(state)).toMatchObject({
      serviceAssistantPane: null,
      serviceAssistantPaneWidth: 400,
      serviceCustomerPaneCollapsed: false,
      serviceListPaneCollapsed: false,
      serviceListPaneWidth: 340,
      serviceProfilePaneWidth: 400,
    });
  });

  it("allows the IM profile pane to persist widths above the old 440px cap", () => {
    const previousWidth = useWorkspaceStore.getState().profilePaneWidth;
    try {
      useWorkspaceStore.getState().setProfilePaneWidth(720);
      expect(useWorkspaceStore.getState().profilePaneWidth).toBe(720);

      useWorkspaceStore.getState().setProfilePaneWidth(1200);
      expect(useWorkspaceStore.getState().profilePaneWidth).toBe(960);

      useWorkspaceStore.getState().setProfilePaneWidth(120);
      expect(useWorkspaceStore.getState().profilePaneWidth).toBe(280);
    } finally {
      useWorkspaceStore.setState({ profilePaneWidth: previousWidth });
    }
  });
});
