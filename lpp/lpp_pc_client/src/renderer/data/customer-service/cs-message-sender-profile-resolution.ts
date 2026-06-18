import type { MessageItemDto, TenantMemberDto } from "../api-client";
import { isCustomerServiceStaffSideMessage } from "./message-domain";

export function customerServiceStaffSenderProfileTargetIds({
  currentUserIds = [],
  messages,
  tenantMembers = [],
}: {
  currentUserIds?: Array<string | null | undefined>;
  messages: MessageItemDto[];
  tenantMembers?: TenantMemberDto[];
}) {
  const currentIds = new Set(currentUserIds.map(normalizeIdentity).filter(Boolean));
  const localAvatars = new Map<string, string>();
  for (const member of tenantMembers) {
    const userId = normalizeIdentity(member.userId);
    const avatarUrl = normalizeText(member.avatarUrl);
    if (userId && avatarUrl) localAvatars.set(userId, avatarUrl);
  }

  const targetIds: string[] = [];
  const seen = new Set<string>();
  for (const message of messages) {
    if (!isCustomerServiceStaffMessage(message)) continue;
    const senderUserId = normalizeIdentity(message.senderUserId);
    if (!senderUserId || currentIds.has(senderUserId) || localAvatars.has(senderUserId)) {
      continue;
    }
    if (seen.has(senderUserId)) continue;
    seen.add(senderUserId);
    targetIds.push(message.senderUserId!.trim());
  }
  return targetIds;
}

function isCustomerServiceStaffMessage(message: MessageItemDto) {
  return isCustomerServiceStaffSideMessage({
    direction: message.direction,
    fromRole: message.fromRole,
    isMine: message.isMine,
    isSelf: message.isSelf,
    messageType: message.messageType,
    senderDisplayName: message.senderDisplayName,
    senderRole: message.senderRole,
    senderType: message.senderType,
  });
}

function normalizeIdentity(value?: string | null) {
  return normalizeText(value)?.toLowerCase();
}

function normalizeText(value?: string | null) {
  const normalized = `${value ?? ""}`.trim();
  return normalized || undefined;
}
