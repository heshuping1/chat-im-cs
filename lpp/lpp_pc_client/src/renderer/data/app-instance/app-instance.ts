import type { AppInstanceProfilePayload } from "../../../shared/desktop-api";

const fallbackDeviceIdKey = "lpp.pc.deviceId";
const fallbackClientInstanceIdKey = "lpp.pc.clientInstanceId";

let cachedProfile: Promise<AppInstanceProfilePayload> | null = null;

export function getAppInstanceProfile(): Promise<AppInstanceProfilePayload> {
  cachedProfile ??= resolveAppInstanceProfile();
  return cachedProfile;
}

export async function getAppInstanceHeaders() {
  const profile = await getAppInstanceProfile();
  return {
    "X-Device-Id": profile.deviceId,
    "X-Client-Instance-Id": profile.clientInstanceId,
  };
}

export function formatAppInstanceLabel(profile: Pick<AppInstanceProfilePayload, "profileName">) {
  return profile.profileName || "主客户端";
}

export async function openAppProfile(profileId?: string) {
  if (typeof window === "undefined" || !window.desktopApi?.openAppProfile) {
    throw new Error("当前运行环境不支持打开新客户端");
  }
  await window.desktopApi.openAppProfile(profileId);
}

async function resolveAppInstanceProfile(): Promise<AppInstanceProfilePayload> {
  if (typeof window !== "undefined" && window.desktopApi?.getAppInstanceProfile) {
    return window.desktopApi.getAppInstanceProfile();
  }

  return {
    profileId: null,
    profileName: "浏览器调试",
    deviceId: readOrCreateBrowserId(fallbackDeviceIdKey),
    clientInstanceId: readOrCreateBrowserId(fallbackClientInstanceIdKey),
  };
}

function readOrCreateBrowserId(key: string) {
  if (typeof window === "undefined") return crypto.randomUUID();
  const stored = window.localStorage.getItem(key);
  if (stored) return stored;
  const next = crypto.randomUUID();
  window.localStorage.setItem(key, next);
  return next;
}
