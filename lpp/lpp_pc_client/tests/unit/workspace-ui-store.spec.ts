import { describe, expect, it, vi } from "vitest";
import {
  selectActiveModule,
  selectMessageLayoutState,
  selectServiceLayoutState,
  selectSetActiveModule,
  selectSetServiceThreadFilter,
} from "../../src/renderer/data/workspace-ui/workspace-ui-store";

describe("workspace ui store selectors", () => {
  it("selects navigation and layout state from compatible workspace state", () => {
    const setActiveModule = vi.fn();
    const setFilter = vi.fn();
    const state = {
      activeModule: "messages" as const,
      activeThreadId: "thread-1",
      activeImConversationId: "conversation-1",
      activeContactId: "contact-1",
      listPaneWidth: 220,
      profilePaneWidth: 330,
      serviceListPaneWidth: 340,
      serviceProfilePaneWidth: 330,
      messageProfileVisible: true,
      messageLayoutMode: "full" as const,
      filter: "all" as const,
      messageFilter: "all" as const,
      contactFilter: "customer" as const,
      setActiveModule,
      setActiveThread: vi.fn(),
      setActiveImConversation: vi.fn(),
      setActiveContact: vi.fn(),
      setListPaneWidth: vi.fn(),
      setProfilePaneWidth: vi.fn(),
      setServiceListPaneWidth: vi.fn(),
      setServiceProfilePaneWidth: vi.fn(),
      setMessageProfileVisible: vi.fn(),
      setMessageLayoutMode: vi.fn(),
      setFilter,
      setMessageFilter: vi.fn(),
      setContactFilter: vi.fn(),
    };

    expect(selectActiveModule(state)).toBe("messages");
    expect(selectSetActiveModule(state)).toBe(setActiveModule);
    expect(selectSetServiceThreadFilter(state)).toBe(setFilter);
    expect(selectMessageLayoutState(state)).toMatchObject({
      listPaneWidth: 220,
      messageLayoutMode: "full",
      profilePaneWidth: 330,
    });
    expect(selectServiceLayoutState(state)).toMatchObject({
      serviceListPaneWidth: 340,
      serviceProfilePaneWidth: 330,
    });
  });
});
