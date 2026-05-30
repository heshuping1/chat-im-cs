import { useWorkspaceStore } from "../workspace-ui/workspace-store-core";
import type { ConversationReadState, ImConversationType } from "../im-read-model";
import type {
  LocalImConversationRead,
  LocalImPeerReadReceipt,
  StoredImReadState,
} from "./im-read-storage";

// IM read state is still backed by workspace store during P2.
// New callers should depend on this file instead of reading read fields directly.
export interface ImReadStoreCompatibleState {
  locallyReadImConversationReads: Record<string, LocalImConversationRead>;
  imPeerReadReceipts: Record<string, LocalImPeerReadReceipt>;
  imReadStateByConversation: StoredImReadState;
  markImConversationReadLocally: (
    id: string,
    readSeq?: number,
    messageKey?: string,
  ) => void;
  markImPeerReadReceipt: (id: string, readSeq: number) => void;
  upsertImReadState: (state: ConversationReadState) => void;
  clearPendingImRead: (
    conversationType: ImConversationType,
    conversationId: string,
    readSeq: number,
  ) => void;
}

export function selectLocalImConversationReads(state: ImReadStoreCompatibleState) {
  return state.locallyReadImConversationReads;
}

export function selectImPeerReadReceipts(state: ImReadStoreCompatibleState) {
  return state.imPeerReadReceipts;
}

export function selectImReadStateByConversation(state: ImReadStoreCompatibleState) {
  return state.imReadStateByConversation;
}

export function selectMarkImConversationReadLocally(state: ImReadStoreCompatibleState) {
  return state.markImConversationReadLocally;
}

export function selectMarkImPeerReadReceipt(state: ImReadStoreCompatibleState) {
  return state.markImPeerReadReceipt;
}

export function selectUpsertImReadState(state: ImReadStoreCompatibleState) {
  return state.upsertImReadState;
}

export function selectClearPendingImRead(state: ImReadStoreCompatibleState) {
  return state.clearPendingImRead;
}

export function useLocalImConversationReads() {
  return useWorkspaceStore(selectLocalImConversationReads);
}

export function useImPeerReadReceipts() {
  return useWorkspaceStore(selectImPeerReadReceipts);
}

export function useImReadStateByConversation() {
  return useWorkspaceStore(selectImReadStateByConversation);
}

export function useMarkImConversationReadLocally() {
  return useWorkspaceStore(selectMarkImConversationReadLocally);
}

export function useMarkImPeerReadReceipt() {
  return useWorkspaceStore(selectMarkImPeerReadReceipt);
}

export function useUpsertImReadState() {
  return useWorkspaceStore(selectUpsertImReadState);
}

export function useClearPendingImRead() {
  return useWorkspaceStore(selectClearPendingImRead);
}

export function getImReadSnapshot() {
  const state = useWorkspaceStore.getState();
  return {
    imPeerReadReceipts: state.imPeerReadReceipts,
    imReadStateByConversation: state.imReadStateByConversation,
    locallyReadImConversationReads: state.locallyReadImConversationReads,
  };
}

export function getImReadActions() {
  const state = useWorkspaceStore.getState();
  return {
    clearPendingImRead: state.clearPendingImRead,
    markImConversationReadLocally: state.markImConversationReadLocally,
    markImPeerReadReceipt: state.markImPeerReadReceipt,
    upsertImReadState: state.upsertImReadState,
  };
}
