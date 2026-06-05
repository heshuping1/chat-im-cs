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
    (input.history ? "customerService.visitor" : "customerService.threadList.unknownCustomer");

  return {
    ariaName: displayName || "customerService.customer",
    avatarName: displayName || "customerService.customer",
    avatarTone: isVip ? "gold" : "indigo",
    avatarUrl: input.profile?.avatarUrl || input.thread?.customerAvatarUrl || input.thread?.avatarUrl,
    displayName,
    isVip,
  };
}

function usableIdentityName(value?: string | null) {
  const name = value?.trim();
  if (!name || name.startsWith("\u5386\u53f2\u4f1a\u8bdd")) return undefined;
  return name;
}
