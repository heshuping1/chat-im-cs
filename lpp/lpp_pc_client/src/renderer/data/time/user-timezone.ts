export type PcUserTimezone = "系统默认" | "Asia/Shanghai" | "UTC";

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

export const pcUserTimezoneOptions = [
  "系统默认",
  "Asia/Shanghai",
  "UTC",
] satisfies PcUserTimezone[];

export const pcUserTimezoneLabels: Record<PcUserTimezone, string> = {
  系统默认: "系统默认",
  "Asia/Shanghai": "中国标准时间",
  UTC: "UTC",
};

export function normalizePcUserTimezone(value: unknown): PcUserTimezone {
  return pcUserTimezoneOptions.includes(value as PcUserTimezone)
    ? (value as PcUserTimezone)
    : "系统默认";
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
  const timeZone = resolveIntlTimeZone(timezone);
  const formatter = new Intl.DateTimeFormat("en-US", {
    ...(timeZone ? { timeZone } : {}),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
  };
}

function resolveIntlTimeZone(timezone: unknown) {
  const normalized = normalizePcUserTimezone(timezone);
  return normalized === "系统默认" ? undefined : normalized;
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
