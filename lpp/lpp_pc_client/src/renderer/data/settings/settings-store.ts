import { useWorkspaceStore } from "../workspace-ui/workspace-store-core";
import type { PcSettings } from "./pc-settings";

// Settings are still backed by workspace store during P2.
// New callers should depend on this file instead of reading workspace settings directly.
export interface SettingsStoreCompatibleState {
  pcSettings: PcSettings;
  updatePcSetting: <K extends keyof PcSettings>(key: K, value: PcSettings[K]) => void;
}

export function selectPcSettings(state: SettingsStoreCompatibleState) {
  return state.pcSettings;
}

export function selectUpdatePcSetting(state: SettingsStoreCompatibleState) {
  return state.updatePcSetting;
}

export function usePcSettings() {
  return useWorkspaceStore(selectPcSettings);
}

export function useUpdatePcSetting() {
  return useWorkspaceStore(selectUpdatePcSetting);
}

export function getPcSettingsSnapshot() {
  return selectPcSettings(useWorkspaceStore.getState());
}
