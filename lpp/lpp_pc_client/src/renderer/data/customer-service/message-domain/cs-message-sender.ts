export type CustomerServiceMessageSenderKind =
  | "ai"
  | "manager"
  | "staff"
  | "system"
  | "unknown"
  | "visitor";

export interface CustomerServiceMessageSenderInput {
  direction?: string | null;
  isMine?: boolean | null;
  isSelf?: boolean | null;
  messageType?: string | null;
  senderDisplayName?: string | null;
  senderRole?: string | null;
  senderType?: string | null;
  fromRole?: string | null;
}

export interface CustomerServiceMessageAvatarInput extends CustomerServiceMessageSenderInput {
  avatarUrl?: string | null;
  currentStaffAvatarUrl?: string | null;
  customerAvatarUrl?: string | null;
  senderProfileAvatarUrl?: string | null;
  senderAvatarUrl?: string | null;
  staffAvatarUrl?: string | null;
}

export interface CustomerServiceMessageSender {
  apiRole?: string;
  displayName?: string;
  kind: CustomerServiceMessageSenderKind;
  missingDisplayName: boolean;
  missingRole: boolean;
  unknownRole: boolean;
}

export function resolveCustomerServiceMessageSender(
  input: CustomerServiceMessageSenderInput,
): CustomerServiceMessageSender {
  const displayName = nonEmpty(input.senderDisplayName);
  const role = firstNonEmpty(input.senderRole, input.senderType, input.fromRole);
  const kind = customerServiceMessageSenderKind(input, role);
  const missingRole = !role && kind !== "system";
  const unknownRole = Boolean(role) && kind === "unknown";

  return {
    apiRole: role,
    displayName,
    kind,
    missingDisplayName: kind !== "system" && !displayName,
    missingRole,
    unknownRole,
  };
}

export function isCustomerServiceSystemMessage(
  input: CustomerServiceMessageSenderInput,
) {
  return customerServiceMessageSenderKind(
    input,
    firstNonEmpty(input.senderRole, input.senderType, input.fromRole),
  ) === "system";
}

export function isCustomerServiceStaffSideMessage(
  input: CustomerServiceMessageSenderInput,
) {
  const sender = resolveCustomerServiceMessageSender(input);
  if (sender.kind === "system" || sender.kind === "visitor") return false;
  if (
    sender.kind === "staff" ||
    sender.kind === "ai" ||
    sender.kind === "manager"
  ) {
    return true;
  }
  const direction = normalizeToken(input.direction);
  return (
    input.isMine === true ||
    input.isSelf === true ||
    direction === "out" ||
    direction === "outgoing" ||
    direction === "sent" ||
    direction === "self"
  );
}

export function resolveCustomerServiceMessageAvatarUrl(
  input: CustomerServiceMessageAvatarInput,
) {
  const sender = resolveCustomerServiceMessageSender(input);
  if (sender.kind === "system") return null;

  if (
    sender.kind === "staff" ||
    sender.kind === "ai" ||
    sender.kind === "manager" ||
    isCustomerServiceStaffSideMessage(input)
  ) {
    return (
      firstNonEmpty(
        input.senderProfileAvatarUrl,
        input.senderAvatarUrl,
        input.staffAvatarUrl,
        input.avatarUrl,
      ) ||
      (isExplicitCurrentStaffMessage(input)
        ? firstNonEmpty(input.currentStaffAvatarUrl) || null
        : null)
    );
  }

  if (sender.kind === "visitor") {
    return firstNonEmpty(input.senderAvatarUrl, input.avatarUrl, input.customerAvatarUrl) || null;
  }

  return firstNonEmpty(input.senderAvatarUrl, input.avatarUrl) || null;
}

export function resolveCustomerServiceMessageAvatarFallbackName(
  input: CustomerServiceMessageSenderInput,
) {
  const sender = resolveCustomerServiceMessageSender(input);
  return sender.kind === "system" ? "" : sender.displayName || "";
}

function customerServiceMessageSenderKind(
  input: CustomerServiceMessageSenderInput,
  role?: string,
): CustomerServiceMessageSenderKind {
  const normalizedRole = normalizeToken(role);
  if (normalizedRole) {
    if (normalizedRole === "visitor" || normalizedRole === "customer") return "visitor";
    if (
      normalizedRole === "agent" ||
      normalizedRole === "customer_service" ||
      normalizedRole === "kefu" ||
      normalizedRole === "operator" ||
      normalizedRole === "service_staff" ||
      normalizedRole === "staff" ||
      normalizedRole === "staff_reply"
    ) {
      return "staff";
    }
    if (normalizedRole === "system") return "system";
    if (normalizedRole === "ai_bot") return "ai";
    if (normalizedRole === "manager_intervention") return "manager";
    return "unknown";
  }

  const direction = normalizeToken(input.direction);
  const messageType = normalizeToken(input.messageType);
  if (
    direction === "system" ||
    messageType === "event" ||
    messageType === "notice" ||
    messageType === "system"
  ) {
    return "system";
  }

  return "unknown";
}

function firstNonEmpty(...values: Array<string | null | undefined>) {
  for (const value of values) {
    const normalized = nonEmpty(value);
    if (normalized) return normalized;
  }
  return undefined;
}

function isExplicitCurrentStaffMessage(input: CustomerServiceMessageSenderInput) {
  return input.isMine === true || input.isSelf === true;
}

function nonEmpty(value: string | null | undefined) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function normalizeToken(value: string | null | undefined) {
  return nonEmpty(value)?.toLowerCase().replace(/-/g, "_");
}
