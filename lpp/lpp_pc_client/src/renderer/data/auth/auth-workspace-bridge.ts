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
    locallyReadImConversationReads: reloaders.readLocalReads(authSession),
    imPeerReadReceipts: reloaders.readPeerReads(authSession),
    imReadStateByConversation: reloaders.readReadState(authSession),
  };
}

export function createAuthSessionClearedState() {
  return {
    authSession: null,
    activeThreadId: "",
    openServiceThreadIds: [],
    activeImConversationId: "",
    locallyReadImConversationReads: {},
    imPeerReadReceipts: {},
    imReadStateByConversation: {},
    activeContactId: "",
    activeModule: "messages" as const,
  };
}
