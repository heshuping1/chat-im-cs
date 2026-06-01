import type { CustomerServiceStatus } from "../../data/types";

export type ReceptionQueueMode = "manual" | "auto";

export type ReceptionControlLayout = "full" | "compact" | "header";

export type ReceptionControlStatusOption = {
  description: string;
  label: string;
  primary: boolean;
  tone: "online" | "busy" | "away" | "offline";
  value: CustomerServiceStatus;
};

export const receptionControlStatusOptions: ReceptionControlStatusOption[] = [
  {
    description: "可接入新会话，参与自动分配。",
    label: "在线",
    primary: true,
    tone: "online",
    value: "online",
  },
  {
    description: "暂停自动接入，继续处理当前会话。",
    label: "忙碌",
    primary: true,
    tone: "busy",
    value: "busy",
  },
  {
    description: "短时间离开坐席，不接收新的排队会话。",
    label: "短暂离开",
    primary: false,
    tone: "away",
    value: "break",
  },
  {
    description: "不参与接待，建议先处理或转交当前会话。",
    label: "离线",
    primary: true,
    tone: "offline",
    value: "offline",
  },
];

export function normalizeReceptionStatus(
  status?: string | null,
): CustomerServiceStatus {
  return receptionControlStatusOptions.some((item) => item.value === status)
    ? (status as CustomerServiceStatus)
    : "offline";
}

export function getReceptionStatusOption(
  status?: string | null,
): ReceptionControlStatusOption {
  const normalized = normalizeReceptionStatus(status);
  return (
    receptionControlStatusOptions.find((item) => item.value === normalized) ??
    receptionControlStatusOptions[3]
  );
}

export function getReceptionQueueMode(
  queueAcceptEnabled?: boolean | null,
): ReceptionQueueMode {
  return queueAcceptEnabled ? "auto" : "manual";
}

export function getReceptionQueueModeLabel(mode: ReceptionQueueMode) {
  return mode === "auto" ? "自动分配" : "手动接入";
}

export function getReceptionQueueModeDescription(mode: ReceptionQueueMode) {
  return mode === "auto"
    ? "服务端按规则把排队会话分配给在线客服。"
    : "排队会话保留在会话池，客服手动点击接入。";
}

export function getQueueAutoDisabledReason(
  status?: string | null,
): string | null {
  if (!receptionControlStatusOptions.some((item) => item.value === status)) {
    return "接待状态未同步，暂不能启用自动分配。";
  }
  return normalizeReceptionStatus(status) === "online"
    ? null
    : "仅在线状态可以启用自动分配。";
}

export function getReceptionControlLayout(
  mode: string,
): ReceptionControlLayout {
  if (mode === "no-sidebar" || mode === "queue-focus") return "header";
  if (mode === "compact-sidebar" || mode === "no-customer") return "compact";
  return "full";
}

export function getReceptionControlSummary(input: {
  activeSessions?: number | null;
  maxSessions?: number | null;
  queueAcceptEnabled?: boolean | null;
  serviceStatus?: string | null;
}) {
  const statusSynced = receptionControlStatusOptions.some(
    (item) => item.value === input.serviceStatus,
  );
  const status = statusSynced
    ? getReceptionStatusOption(input.serviceStatus)
    : {
        description: "正在等待真实接待状态同步。",
        label: "未同步",
        primary: false,
        tone: "offline" as const,
        value: "offline" as CustomerServiceStatus,
      };
  const queueMode = getReceptionQueueMode(input.queueAcceptEnabled);
  const sessionText =
    input.activeSessions === undefined || input.activeSessions === null
      ? "--"
      : `${input.activeSessions}/${input.maxSessions ?? "--"}`;
  return {
    queueMode,
    queueModeDescription: getReceptionQueueModeDescription(queueMode),
    queueModeLabel: getReceptionQueueModeLabel(queueMode),
    sessionText,
    status,
    statusSynced,
    summaryText: `${status.label} · ${getReceptionQueueModeLabel(queueMode)} · ${sessionText}`,
  };
}
