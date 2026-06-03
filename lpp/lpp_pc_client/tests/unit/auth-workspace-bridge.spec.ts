import { describe, expect, it, vi } from "vitest";
import {
  createAuthSessionAppliedState,
  createAuthSessionClearedState,
} from "../../src/renderer/data/auth/auth-workspace-bridge";

const session = {
  apiBaseUrl: "https://api.example.com",
  tenantToken: "tenant-token",
  displayName: "Tester",
};

describe("auth workspace bridge", () => {
  it("builds workspace state for an applied auth session", () => {
    const readLocalReads = vi.fn(() => ({ direct: { readSeq: 1 } }));
    const readPeerReads = vi.fn(() => ({ direct: { readSeq: 2 } }));
    const readReadState = vi.fn(() => ({ direct: { conversationId: "direct" } }));

    const next = createAuthSessionAppliedState(session, {
      readLocalReads,
      readPeerReads,
      readReadState,
    });

    expect(next).toEqual({
      authSession: session,
      activeImConversationId: "",
      activeImConversationVisibility: "hidden",
      activeThreadId: "",
      activeThreadOpenSource: "none",
      openServiceThreadIds: [],
      realtimeReminders: [],
      locallyReadImConversationReads: { direct: { readSeq: 1 } },
      imPeerReadReceipts: { direct: { readSeq: 2 } },
      imReadStateByConversation: { direct: { conversationId: "direct" } },
    });
    expect(readLocalReads).toHaveBeenCalledWith(session);
    expect(readPeerReads).toHaveBeenCalledWith(session);
    expect(readReadState).toHaveBeenCalledWith(session);
  });

  it("builds workspace state for a cleared auth session", () => {
    expect(createAuthSessionClearedState()).toEqual({
      authSession: null,
      activeThreadId: "",
      activeThreadOpenSource: "none",
      openServiceThreadIds: [],
      activeImConversationId: "",
      activeImConversationVisibility: "hidden",
      locallyReadImConversationReads: {},
      imPeerReadReceipts: {},
      imReadStateByConversation: {},
      activeContactId: "",
      activeModule: "messages",
      gatewayRealtimeStatus: "idle",
      gatewayRealtimeUpdatedAt: 0,
    });
  });
});
