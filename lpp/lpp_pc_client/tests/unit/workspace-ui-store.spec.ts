import { describe, expect, it, vi } from "vitest";
import {
  selectCloseOpenServiceThread,
  selectActiveModule,
  selectGatewayRealtimeState,
  selectActiveThreadOpenSource,
  selectMessageLayoutState,
  selectOpenServiceThreadIds,
  selectOpenCustomerServiceThread,
  selectServiceLayoutState,
  selectSetActiveModule,
  selectSetGatewayRealtimeStatus,
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
      activeThreadOpenSource: "user" as const,
      openServiceThreadIds: ["thread-1", "thread-2"],
      activeImConversationId: "conversation-1",
      activeImConversationVisibility: "paneVisible" as const,
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
      gatewayRealtimeStatus: "connected" as const,
      gatewayRealtimeUpdatedAt: 123,
      imPresenceStatus: "online" as const,
      customerServiceStatus: "busy" as const,
      setActiveModule,
      setActiveThread: vi.fn(),
      openCustomerServiceThread: vi.fn(),
      closeOpenServiceThread,
      setActiveImConversation: vi.fn(),
      setActiveImConversationVisibility: vi.fn(),
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
      setImPresenceStatus: vi.fn(),
      setCustomerServiceStatus: vi.fn(),
      setGatewayRealtimeStatus: vi.fn(),
    };

    expect(selectActiveModule(state)).toBe("messages");
    expect(selectActiveThreadOpenSource(state)).toBe("user");
    expect(selectSetActiveModule(state)).toBe(setActiveModule);
    expect(selectOpenServiceThreadIds(state)).toEqual(["thread-1", "thread-2"]);
    expect(selectOpenCustomerServiceThread(state)).toBe(state.openCustomerServiceThread);
    expect(selectCloseOpenServiceThread(state)).toBe(closeOpenServiceThread);
    expect(selectSetServiceThreadFilter(state)).toBe(setFilter);
    expect(selectGatewayRealtimeState(state)).toEqual({
      status: "connected",
      updatedAt: 123,
    });
    expect(selectSetGatewayRealtimeStatus(state)).toBe(state.setGatewayRealtimeStatus);
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

  it("tracks gateway realtime connection health", () => {
    const previousState = useWorkspaceStore.getState();
    try {
      useWorkspaceStore.setState({
        gatewayRealtimeStatus: "idle",
        gatewayRealtimeUpdatedAt: 0,
      });

      useWorkspaceStore.getState().setGatewayRealtimeStatus("retrying");

      expect(useWorkspaceStore.getState().gatewayRealtimeStatus).toBe("retrying");
      expect(useWorkspaceStore.getState().gatewayRealtimeUpdatedAt).toBeGreaterThan(0);
    } finally {
      useWorkspaceStore.setState({
        gatewayRealtimeStatus: previousState.gatewayRealtimeStatus,
        gatewayRealtimeUpdatedAt: previousState.gatewayRealtimeUpdatedAt,
      });
    }
  });

  it("tracks whether a customer-service thread was explicitly opened", () => {
    const previousState = useWorkspaceStore.getState();
    try {
      useWorkspaceStore.setState({
        activeThreadId: "",
        activeThreadOpenSource: "none",
        openServiceThreadIds: [],
      });

      useWorkspaceStore.getState().setActiveThread("thread-auto");
      expect(useWorkspaceStore.getState()).toMatchObject({
        activeThreadId: "thread-auto",
        activeThreadOpenSource: "auto",
        openServiceThreadIds: ["thread-auto"],
      });

      useWorkspaceStore.getState().openCustomerServiceThread("thread-user", "user");
      expect(useWorkspaceStore.getState()).toMatchObject({
        activeThreadId: "thread-user",
        activeThreadOpenSource: "user",
        openServiceThreadIds: ["thread-auto", "thread-user"],
      });

      useWorkspaceStore.getState().setActiveThread("");
      expect(useWorkspaceStore.getState()).toMatchObject({
        activeThreadId: "",
        activeThreadOpenSource: "none",
      });
    } finally {
      useWorkspaceStore.setState({
        activeThreadId: previousState.activeThreadId,
        activeThreadOpenSource: previousState.activeThreadOpenSource,
        openServiceThreadIds: previousState.openServiceThreadIds,
      });
    }
  });

  it("preserves the active IM conversation when reopening the message module", () => {
    const previousState = useWorkspaceStore.getState();
    try {
      useWorkspaceStore.setState({
        activeImConversationId: "conversation-1",
        activeImConversationVisibility: "paneVisible",
        activeModule: "contacts",
      });

      useWorkspaceStore.getState().setActiveModule("messages");
      expect(useWorkspaceStore.getState()).toMatchObject({
        activeImConversationId: "conversation-1",
        activeImConversationVisibility: "paneVisible",
        activeModule: "messages",
      });

      useWorkspaceStore.getState().setActiveImConversation("conversation-2");
      expect(useWorkspaceStore.getState()).toMatchObject({
        activeImConversationId: "conversation-2",
        activeModule: "messages",
      });
      const selectedConversationState = useWorkspaceStore.getState();
      useWorkspaceStore.getState().setActiveImConversation("conversation-2");
      expect(useWorkspaceStore.getState()).toBe(selectedConversationState);

      useWorkspaceStore.getState().setActiveImConversationVisibility("paneVisible");
      expect(useWorkspaceStore.getState().activeImConversationVisibility).toBe("paneVisible");
    } finally {
      useWorkspaceStore.setState({
        activeImConversationId: previousState.activeImConversationId,
        activeImConversationVisibility: previousState.activeImConversationVisibility,
        activeModule: previousState.activeModule,
      });
    }
  });

  it("hides the IM pane but keeps the selected conversation when leaving messages", () => {
    const previousState = useWorkspaceStore.getState();
    try {
      useWorkspaceStore.setState({
        activeImConversationId: "conversation-1",
        activeImConversationVisibility: "paneVisible",
        activeModule: "messages",
      });

      useWorkspaceStore.getState().setActiveModule("contacts");
      expect(useWorkspaceStore.getState()).toMatchObject({
        activeImConversationId: "conversation-1",
        activeImConversationVisibility: "hidden",
        activeModule: "contacts",
      });
    } finally {
      useWorkspaceStore.setState({
        activeImConversationId: previousState.activeImConversationId,
        activeImConversationVisibility: previousState.activeImConversationVisibility,
        activeModule: previousState.activeModule,
      });
    }
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

  it("allows the online service assistant pane to expand like an IM side pane", () => {
    const previousWidth = useWorkspaceStore.getState().serviceAssistantPaneWidth;
    try {
      useWorkspaceStore.getState().setServiceAssistantPaneWidth(700);
      expect(useWorkspaceStore.getState().serviceAssistantPaneWidth).toBe(700);

      useWorkspaceStore.getState().setServiceAssistantPaneWidth(1200);
      expect(useWorkspaceStore.getState().serviceAssistantPaneWidth).toBe(960);

      useWorkspaceStore.getState().setServiceAssistantPaneWidth(120);
      expect(useWorkspaceStore.getState().serviceAssistantPaneWidth).toBe(320);
    } finally {
      useWorkspaceStore.setState({ serviceAssistantPaneWidth: previousWidth });
    }
  });
});
