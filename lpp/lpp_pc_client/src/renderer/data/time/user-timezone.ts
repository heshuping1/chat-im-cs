const systemTimezone = "系统默认";

const fixedUtcTimezoneOptions = [
  "UTC-12:00",
  "UTC-11:00",
  "UTC-10:00",
  "UTC-09:00",
  "UTC-08:00",
  "UTC-07:00",
  "UTC-06:00",
  "UTC-05:00",
  "UTC-04:00",
  "UTC-03:00",
  "UTC-02:00",
  "UTC-01:00",
  "UTC+00:00",
  "UTC+01:00",
  "UTC+02:00",
  "UTC+03:00",
  "UTC+04:00",
  "UTC+05:00",
  "UTC+06:00",
  "UTC+07:00",
  "UTC+08:00",
  "UTC+09:00",
  "UTC+10:00",
  "UTC+11:00",
] as const;

export const pcUserTimezoneOptions = [
  systemTimezone,
  ...fixedUtcTimezoneOptions,
] as const;

export type PcSelectableUserTimezone = (typeof pcUserTimezoneOptions)[number];
export type PcLegacyUserTimezone = "Asia/Shanghai" | "UTC";
export type PcUserTimezone = PcSelectableUserTimezone | PcLegacyUserTimezone;

export interface UserTimezoneFormattingOptions {
  timezone?: PcUserTimezone;
  now?: Date | string | number;
}

interface DateParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

export const pcUserTimezoneLabels: Record<PcSelectableUserTimezone, string> = {
  "系统默认": "系统默认",
  "UTC-12:00": "UTC-12:00",
  "UTC-11:00": "UTC-11:00",
  "UTC-10:00": "UTC-10:00",
  "UTC-09:00": "UTC-09:00",
  "UTC-08:00": "UTC-08:00",
  "UTC-07:00": "UTC-07:00",
  "UTC-06:00": "UTC-06:00",
  "UTC-05:00": "UTC-05:00",
  "UTC-04:00": "UTC-04:00",
  "UTC-03:00": "UTC-03:00",
  "UTC-02:00": "UTC-02:00",
  "UTC-01:00": "UTC-01:00",
  "UTC+00:00": "UTC+00:00",
  "UTC+01:00": "UTC+01:00",
  "UTC+02:00": "UTC+02:00",
  "UTC+03:00": "UTC+03:00",
  "UTC+04:00": "UTC+04:00",
  "UTC+05:00": "UTC+05:00",
  "UTC+06:00": "UTC+06:00",
  "UTC+07:00": "UTC+07:00",
  "UTC+08:00": "UTC+08:00",
  "UTC+09:00": "UTC+09:00",
  "UTC+10:00": "UTC+10:00",
  "UTC+11:00": "UTC+11:00",
};

export function normalizePcUserTimezone(value: unknown): PcSelectableUserTimezone {
  if (value === "\u7cfb\u7edf\u9ed8\u8ba4") return systemTimezone;
  if (value === "System default") return systemTimezone;
  if (value === "Asia/Shanghai") return "UTC+08:00";
  if (value === "UTC") return "UTC+00:00";
  return pcUserTimezoneOptions.includes(value as PcSelectableUserTimezone)
    ? (value as PcSelectableUserTimezone)
    : systemTimezone;
}

export function formatUserShortDate(
  value?: string | null,
  options: UserTimezoneFormattingOptions = {},
) {
  const date = parseDateValue(value);
  if (!date) return value || "--";
  const parts = getUserDateParts(date, options.timezone);
  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`;
}

export function formatUserMonthDayTime(
  value?: string | null,
  options: UserTimezoneFormattingOptions = {},
) {
  const date = parseDateValue(value);
  if (!date) return value || "--";
  const parts = getUserDateParts(date, options.timezone);
  return `${pad2(parts.month)}/${pad2(parts.day)} ${pad2(parts.hour)}:${pad2(parts.minute)}`;
}

export function formatUserChatTime(
  value?: string | null,
  options: UserTimezoneFormattingOptions = {},
) {
  const date = parseDateValue(value);
  if (!date) return value || "--";
  const parts = getUserDateParts(date, options.timezone);
  const nowParts = getUserDateParts(parseNow(options.now), options.timezone);
  if (isSameUserDate(parts, nowParts)) {
    return `${pad2(parts.hour)}:${pad2(parts.minute)}`;
  }
  return `${parts.month}/${parts.day}`;
}

export function formatUserChatMessageTime(
  value?: string | null,
  options: UserTimezoneFormattingOptions = {},
) {
  const date = parseDateValue(value);
  if (!date) return value || "--";
  const parts = getUserDateParts(date, options.timezone);
  const time = `${pad2(parts.hour)}:${pad2(parts.minute)}`;
  if (isSameUserDate(parts, getUserDateParts(parseNow(options.now), options.timezone))) {
    return time;
  }
  return `${parts.month}/${parts.day} ${time}`;
}

export function formatUserClockTime(
  value?: string | null,
  options: UserTimezoneFormattingOptions = {},
) {
  const date = parseDateValue(value);
  if (!date) return value || "--";
  const parts = getUserDateParts(date, options.timezone);
  return `${pad2(parts.hour)}:${pad2(parts.minute)}`;
}

export function getUserDateParts(date: Date, timezone: unknown): DateParts {
  const normalized = normalizePcUserTimezone(timezone);
  if (normalized === systemTimezone) {
    return {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
      hour: date.getHours(),
      minute: date.getMinutes(),
    };
  }

  const zoned = new Date(date.getTime() + utcOffsetMinutes(normalized) * 60_000);
  return {
    year: zoned.getUTCFullYear(),
    month: zoned.getUTCMonth() + 1,
    day: zoned.getUTCDate(),
    hour: zoned.getUTCHours(),
    minute: zoned.getUTCMinutes(),
  };
}

function utcOffsetMinutes(timezone: PcSelectableUserTimezone) {
  const match = /^UTC([+-])(\d{2}):00$/.exec(timezone);
  if (!match) return 0;
  const sign = match[1] === "-" ? -1 : 1;
  return sign * Number(match[2]) * 60;
}

function parseDateValue(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseNow(value?: Date | string | number) {
  const date = value instanceof Date ? value : new Date(value ?? Date.now());
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function isSameUserDate(left: DateParts, right: DateParts) {
  return left.year === right.year && left.month === right.month && left.day === right.day;
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}
