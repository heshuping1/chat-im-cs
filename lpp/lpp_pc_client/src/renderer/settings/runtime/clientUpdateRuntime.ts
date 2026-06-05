import type {
  ClientUpdatePreferences,
  ClientUpdateState,
} from "../../../shared/desktop-api";

const defaultPreferences: ClientUpdatePreferences = {
  autoCheck: false,
  channel: "stable",
  downloadMode: "differential-first",
};

export function isClientUpdateRuntimeAvailable() {
  if (typeof window === "undefined") return false;
  return Boolean(window.desktopApi?.checkForUpdates);
}

export async function getClientUpdateState(): Promise<ClientUpdateState> {
  if (typeof window === "undefined") return fallbackState();
  if (!window.desktopApi?.getUpdateState) return fallbackState();
  return window.desktopApi.getUpdateState();
}

export async function setClientUpdatePreferences(
  preferences: ClientUpdatePreferences,
): Promise<ClientUpdatePreferences> {
  if (typeof window === "undefined") {
    throw new Error("当前客户端未接入更新设置接口");
  }
  if (!window.desktopApi?.setUpdatePreferences) {
    throw new Error("当前客户端未接入更新设置接口");
  }
  return window.desktopApi.setUpdatePreferences(preferences);
}

export async function checkClientUpdateRuntime(): Promise<ClientUpdateState> {
  if (typeof window === "undefined") {
    throw new Error("当前客户端未接入更新检查接口");
  }
  if (!window.desktopApi?.checkForUpdates) {
    throw new Error("当前客户端未接入更新检查接口");
  }
  return window.desktopApi.checkForUpdates();
}

export async function downloadClientUpdate(): Promise<ClientUpdateState> {
  if (typeof window === "undefined") {
    throw new Error("当前客户端未接入更新下载接口");
  }
  if (!window.desktopApi?.downloadUpdate) {
    throw new Error("当前客户端未接入更新下载接口");
  }
  return window.desktopApi.downloadUpdate();
}

export async function installClientUpdate(): Promise<void> {
  if (typeof window === "undefined") {
    throw new Error("当前客户端未接入更新安装接口");
  }
  if (!window.desktopApi?.installUpdate) {
    throw new Error("当前客户端未接入更新安装接口");
  }
  return window.desktopApi.installUpdate();
}

export function subscribeClientUpdateState(
  callback: (state: ClientUpdateState) => void,
) {
  if (typeof window === "undefined") return () => undefined;
  return window.desktopApi?.onUpdateStateChanged?.(callback) ?? (() => undefined);
}

function fallbackState(): ClientUpdateState {
  return {
    currentVersion: "0.1.0",
    preferences: defaultPreferences,
    phase: "idle",
  };
}
