import type { AuthSession } from "./auth-session";

export interface AuthSessionReloaders<LocalReads, PeerReads, ReadState> {
  readLocalReads: (session: AuthSession) => LocalReads;
  readPeerReads: (session: AuthSession) => PeerReads;
  readReadState: (session: AuthSession) => ReadState;
}

export function createAuthSessionAppliedState<LocalReads, PeerReads, ReadState>(
  authSession: AuthSession,
  reloaders: AuthSessionReloaders<LocalReads, PeerReads, ReadState>,
) {
  return {
    authSession,
    activeImConversationId: "",
    activeImConversationVisibility: "hidden" as const,
    activeThreadId: "",
    activeThreadOpenSource: "none" as const,
    openServiceThreadIds: [],
    realtimeReminders: [],
    locallyReadImConversationReads: reloaders.readLocalReads(authSession),
    imPeerReadReceipts: reloaders.readPeerReads(authSession),
    imReadStateByConversation: reloaders.readReadState(authSession),
  };
}

export function createAuthSessionClearedState() {
  return {
    authSession: null,
    activeThreadId: "",
    activeThreadOpenSource: "none" as const,
    openServiceThreadIds: [],
    activeImConversationId: "",
    activeImConversationVisibility: "hidden" as const,
    locallyReadImConversationReads: {},
    imPeerReadReceipts: {},
    imReadStateByConversation: {},
    activeContactId: "",
    activeModule: "messages" as const,
    gatewayRealtimeStatus: "idle" as const,
    gatewayRealtimeUpdatedAt: 0,
  };
}
