import { formatApiErrorForUser } from "../data/api/api-error-model";
import { getPcSettingsSnapshot } from "../data/settings/settings-store";
import {
  formatUserChatMessageTime,
  formatUserChatTime,
  formatUserClockTime,
  formatUserMonthDayTime,
  formatUserShortDate,
  type UserTimezoneFormattingOptions,
} from "../data/time/user-timezone";

export function formatError(error: unknown, fallback = "Unknown error") {
  const apiMessage = formatApiErrorForUser(error, fallback);
  if (apiMessage !== fallback || isLikelyApiError(error)) return apiMessage;
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  return fallback;
}

function isLikelyApiError(error: unknown) {
  return Boolean(
    error &&
      typeof error === "object" &&
      ("status" in error || "code" in error || "requestId" in error),
  );
}

export function formatBadgeCount(count?: number | null) {
  const value = Number(count ?? 0);
  if (!Number.isFinite(value) || value <= 0) return "0";
  return value > 99 ? "99+" : String(value);
}

export function formatShortDate(
  value?: string | null,
  options: UserTimezoneFormattingOptions = currentTimezoneOptions(),
) {
  return formatUserShortDate(value, options);
}

export function formatMonthDayTime(
  value?: string | null,
  options: UserTimezoneFormattingOptions = currentTimezoneOptions(),
) {
  return formatUserMonthDayTime(value, options);
}

export function formatChatTime(
  value?: string | null,
  options: UserTimezoneFormattingOptions = currentTimezoneOptions(),
) {
  return formatUserChatTime(value, options);
}

export function formatChatMessageTime(
  value?: string | null,
  options: UserTimezoneFormattingOptions = currentTimezoneOptions(),
) {
  return formatUserChatMessageTime(value, options);
}

export function formatClockTime(
  value?: string | null,
  options: UserTimezoneFormattingOptions = currentTimezoneOptions(),
) {
  return formatUserClockTime(value, options);
}

export function timestampFromDateValue(value?: string | number | Date | null) {
  if (value === undefined || value === null || value === "") return 0;
  const date = value instanceof Date ? value : new Date(value);
  const time = date.getTime();
  return Number.isFinite(time) ? time : 0;
}

export function currentIsoTimestamp(now: Date | number = Date.now()) {
  const date = now instanceof Date ? now : new Date(now);
  return Number.isFinite(date.getTime()) ? date.toISOString() : new Date().toISOString();
}

function currentTimezoneOptions(): UserTimezoneFormattingOptions {
  return { timezone: getPcSettingsSnapshot().timezone };
}
