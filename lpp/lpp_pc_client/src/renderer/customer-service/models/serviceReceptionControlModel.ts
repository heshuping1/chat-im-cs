import type { CustomerServiceStatus } from "../../data/types";

export type ReceptionQueueMode = "manual" | "auto";

export type ReceptionControlLayout = "full" | "compact" | "header";

export type ReceptionControlStatusOption = {
  description?: string;
  descriptionKey: string;
  label?: string;
  labelKey: string;
  primary: boolean;
  tone: "online" | "busy" | "away" | "offline";
  value: CustomerServiceStatus;
};

export const receptionControlStatusOptions: ReceptionControlStatusOption[] = [
  {
    descriptionKey: "customerService.reception.statusOption.online.description",
    labelKey: "customerService.reception.statusOption.online.label",
    label: "在线",
    primary: true,
    tone: "online",
    value: "online",
  },
  {
    descriptionKey: "customerService.reception.statusOption.busy.description",
    labelKey: "customerService.reception.statusOption.busy.label",
    label: "忙碌",
    primary: true,
    tone: "busy",
    value: "busy",
  },
  {
    descriptionKey: "customerService.reception.statusOption.break.description",
    labelKey: "customerService.reception.statusOption.break.label",
    label: "短暂离开",
    primary: false,
    tone: "away",
    value: "break",
  },
  {
    descriptionKey: "customerService.reception.statusOption.offline.description",
    labelKey: "customerService.reception.statusOption.offline.label",
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

export function getReceptionQueueModeLabelKey(mode: ReceptionQueueMode) {
  return mode === "auto"
    ? "customerService.reception.queueMode.auto.label"
    : "customerService.reception.queueMode.manual.label";
}

export function getReceptionQueueModeDescriptionKey(mode: ReceptionQueueMode) {
  return mode === "auto"
    ? "customerService.reception.queueMode.auto.description"
    : "customerService.reception.queueMode.manual.description";
}

export function getQueueAutoDisabledReasonKey(
  status?: string | null,
): string | null {
  if (!receptionControlStatusOptions.some((item) => item.value === status)) {
    return "customerService.reception.queueMode.auto.disabledUnsynced";
  }
  return normalizeReceptionStatus(status) === "online"
    ? null
    : "customerService.reception.queueMode.auto.disabledOffline";
}

export function getQueueAutoDisabledReason(status?: string | null): string | null {
  const key = getQueueAutoDisabledReasonKey(status);
  if (!key) return null;
  if (key === "customerService.reception.queueMode.auto.disabledUnsynced") {
    return "接待状态未同步，暂不能启用自动分配。";
  }
  return "仅在线状态可以启用自动分配。";
}

export function resolveReceptionQueueModePatch(
  mode: ReceptionQueueMode,
  currentStatus?: string | null,
): { serviceStatus: CustomerServiceStatus; queueAcceptEnabled: boolean } | null {
  if (mode === "auto") {
    return {
      queueAcceptEnabled: true,
      serviceStatus: "online",
    };
  }
  if (!receptionControlStatusOptions.some((item) => item.value === currentStatus)) {
    return null;
  }
  return {
    queueAcceptEnabled: false,
    serviceStatus: normalizeReceptionStatus(currentStatus),
  };
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
        descriptionKey: "customerService.reception.statusOption.unsynced.description",
        labelKey: getReceptionStatusOption("busy").labelKey,
        label: "忙碌",
        primary: false,
        tone: "busy" as const,
        value: "busy" as CustomerServiceStatus,
      };
  const queueMode = getReceptionQueueMode(input.queueAcceptEnabled);
  const sessionText =
    input.activeSessions === undefined || input.activeSessions === null
      ? "--"
      : `${input.activeSessions}/${input.maxSessions ?? "--"}`;
  return {
    queueMode,
    queueModeDescriptionKey: getReceptionQueueModeDescriptionKey(queueMode),
    queueModeLabelKey: getReceptionQueueModeLabelKey(queueMode),
    queueModeLabel: queueMode === "auto" ? "自动分配" : "手动接入",
    sessionText,
    status,
    statusSynced,
    summaryTextKey: "customerService.reception.summary",
    summaryText: `${status.label ?? "忙碌"} · ${queueMode === "auto" ? "自动分配" : "手动接入"} · ${sessionText}`,
  };
}
