import type {
  ConversationListItem,
  CustomerProfileCard,
  FriendProfileExtraDto,
} from "./api-client";
import type { TenantMemberProfileDto } from "./api/contacts-client";
import type { ContactItem } from "./types";

export function publicContactIdFromSources({
  contact,
  conversation,
  profile,
  profileExtra,
  tenantMemberProfile,
}: {
  contact?: ContactItem | null;
  conversation?: ConversationListItem;
  profile?: CustomerProfileCard;
  profileExtra?: FriendProfileExtraDto;
  tenantMemberProfile?: TenantMemberProfileDto;
}) {
  return firstKnownText(
    publicContactIdFromRecord(profile),
    conversation?.peerLppId,
    conversation?.peerLppNo,
    conversation?.peerLppNumber,
    conversation?.peerUserNo,
    profileExtra?.lppId,
    contact?.lppId,
    contact?.greenBubbleNo,
    tenantMemberProfile?.greenBubbleNo,
  );
}

export function enrichContactWithPublicId<T extends ContactItem | undefined>(
  contact: T,
  publicId?: string | null,
): T {
  if (!contact || contact.greenBubbleNo || !publicId?.trim()) return contact;
  return { ...contact, greenBubbleNo: publicId.trim() } as T;
}

export function publicContactIdFromRecord(source?: object | null) {
  if (!source) return undefined;
  const record = source as Record<string, unknown>;
  return firstKnownText(
    record.lppId,
    record.lppNo,
    record.lppNumber,
    record.customerLppId,
    record.customerLppNo,
    record.greenBubbleId,
    record.greenBubbleNo,
    record.userNo,
  );
}

function firstKnownText(...values: unknown[]) {
  for (const value of values) {
    const text = knownText(value);
    if (text) return text;
  }
  return undefined;
}

function knownText(value: unknown) {
  if (typeof value === "string") return value.trim() || undefined;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return undefined;
}
