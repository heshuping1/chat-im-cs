import { useWorkspaceStore } from "../workspace-ui/workspace-store-core";
import type { AuthSession } from "./auth-session";

// Auth state is still physically backed by workspace store during P2.
// New callers must depend on this file instead of reading workspace auth fields directly.
export interface AuthStoreCompatibleState {
  authSession: AuthSession | null;
  setAuthSession: (session: AuthSession) => void;
  restoreDesktopAuthSession?: () => Promise<void>;
  clearAuthSession: () => void;
}

export function selectAuthSession(state: AuthStoreCompatibleState) {
  return state.authSession;
}

export function selectSetAuthSession(state: AuthStoreCompatibleState) {
  return state.setAuthSession;
}

export function selectClearAuthSession(state: AuthStoreCompatibleState) {
  return state.clearAuthSession;
}

export function selectRestoreDesktopAuthSession(state: AuthStoreCompatibleState) {
  return state.restoreDesktopAuthSession;
}

export function useAuthSession() {
  return useWorkspaceStore(selectAuthSession);
}

export function useSetAuthSession() {
  return useWorkspaceStore(selectSetAuthSession);
}

export function useClearAuthSession() {
  return useWorkspaceStore(selectClearAuthSession);
}

export function useRestoreDesktopAuthSession() {
  return useWorkspaceStore(selectRestoreDesktopAuthSession);
}

export function getAuthSessionSnapshot() {
  return selectAuthSession(useWorkspaceStore.getState());
}

export function getClearAuthSessionAction() {
  return selectClearAuthSession(useWorkspaceStore.getState());
}
