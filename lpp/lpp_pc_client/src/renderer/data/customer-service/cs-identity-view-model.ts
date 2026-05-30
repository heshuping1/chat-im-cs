import type { CustomerProfileCard, CustomerServiceThread } from "../api/types";

export interface CustomerServiceIdentityViewModel {
  ariaName: string;
  avatarName: string;
  avatarTone: "gold" | "indigo";
  avatarUrl?: string | null;
  displayName: string;
  isVip: boolean;
}

export function createCustomerServiceIdentityViewModel(input: {
  fallbackName?: string;
  history?: boolean;
  profile?: CustomerProfileCard;
  thread?: CustomerServiceThread;
}): CustomerServiceIdentityViewModel {
  const isVip = Boolean(input.profile?.isVip ?? input.thread?.isVip);
  const displayName =
    usableIdentityName(input.profile?.displayName) ||
    usableIdentityName(input.profile?.customerDisplayName) ||
    usableIdentityName(input.profile?.customerName) ||
    usableIdentityName(input.profile?.nickname) ||
    usableIdentityName(input.thread?.title) ||
    input.fallbackName ||
    (input.history ? "访客" : "未知客户");

  return {
    ariaName: displayName || "客户",
    avatarName: displayName || "客户",
    avatarTone: isVip ? "gold" : "indigo",
    avatarUrl: input.profile?.avatarUrl || input.thread?.customerAvatarUrl || input.thread?.avatarUrl,
    displayName,
    isVip,
  };
}

function usableIdentityName(value?: string | null) {
  const name = value?.trim();
  if (!name || name.startsWith("历史会话")) return undefined;
  return name;
}
