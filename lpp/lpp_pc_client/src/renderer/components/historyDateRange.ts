import type { DateRange } from "react-day-picker";

import {
  getPcTimezoneOffsetMinutes,
  getUserDateParts,
  normalizePcUserTimezone,
  systemTimezone,
  type PcUserTimezone,
} from "../data/time/user-timezone";

export type HistoryDatePreset =
  | "all"
  | "today"
  | "yesterday"
  | "last7"
  | "last30"
  | "thisWeek"
  | "thisMonth"
  | "custom";

export function historyDatePresetRange(
  preset: HistoryDatePreset,
  timezone: PcUserTimezone,
  now = new Date(),
) {
  const today = startOfHistoryDayInTimezone(now, timezone);
  if (preset === "all" || preset === "custom") return { from: "", to: "" };
  if (preset === "today") {
    return { from: formatHistoryDateTime(today, "00:00:00"), to: formatHistoryDateTime(today, "23:59:59") };
  }
  if (preset === "yesterday") {
    const value = addHistoryDays(today, -1);
    return { from: formatHistoryDateTime(value, "00:00:00"), to: formatHistoryDateTime(value, "23:59:59") };
  }
  if (preset === "last7") {
    return { from: formatHistoryDateTime(addHistoryDays(today, -6), "00:00:00"), to: formatHistoryDateTime(today, "23:59:59") };
  }
  if (preset === "last30") {
    return { from: formatHistoryDateTime(addHistoryDays(today, -29), "00:00:00"), to: formatHistoryDateTime(today, "23:59:59") };
  }
  if (preset === "thisWeek") {
    const day = today.getDay() || 7;
    return { from: formatHistoryDateTime(addHistoryDays(today, 1 - day), "00:00:00"), to: formatHistoryDateTime(today, "23:59:59") };
  }
  if (preset === "thisMonth") {
    return {
      from: formatHistoryDateTime(new Date(today.getFullYear(), today.getMonth(), 1), "00:00:00"),
      to: formatHistoryDateTime(today, "23:59:59"),
    };
  }
  return { from: "", to: "" };
}

export function historyDateRangeLabel(range: DateRange, fromTime: string, toTime: string) {
  const from = formatHistoryDateTime(range.from, fromTime).replace("T", " ");
  const to = formatHistoryDateTime(range.to, toTime).replace("T", " ");
  if (from && to) return `${from} ~ ${to}`;
  if (from) return `${from} ~ 结束时间`;
  return "选择日期范围";
}

export function parseHistoryDate(value: string) {
  if (!value) return undefined;
  const datePart = value.trim().split(/[ T]/)[0] ?? "";
  const [yearText, monthText, dayText] = datePart.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return undefined;
  return new Date(year, month - 1, day);
}

export function formatHistoryDate(date?: Date) {
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatHistoryDateTime(date: Date | undefined, time: string) {
  const dateText = formatHistoryDate(date);
  if (!dateText) return "";
  return `${dateText}T${normalizeHistoryTime(time, "00:00:00")}`;
}

export function historyQueryDateTimeToUtc(value: string, timezone: PcUserTimezone) {
  if (!value) return "";
  const datePart = value.trim().split(/[ T]/)[0] ?? "";
  const [yearText, monthText, dayText] = datePart.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const [hourText = "", minuteText = "", secondText = ""] = historyTimePart(value, "00:00:00").split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day) ||
    !Number.isFinite(hour) ||
    !Number.isFinite(minute) ||
    !Number.isFinite(second)
  ) {
    return "";
  }

  const normalizedTimezone = normalizePcUserTimezone(timezone);
  if (normalizedTimezone === systemTimezone) {
    return isoSeconds(new Date(year, month - 1, day, hour, minute, second));
  }

  const offsetMinutes = getPcTimezoneOffsetMinutes(normalizedTimezone, new Date());
  const utcTimestamp = Date.UTC(year, month - 1, day, hour, minute, second) - offsetMinutes * 60_000;
  return isoSeconds(new Date(utcTimestamp));
}

export function historyTimePart(value: string, fallback: string) {
  const time = value.trim().split(/[ T]/)[1] ?? "";
  return normalizeHistoryTime(time, fallback);
}

export function normalizeHistoryTime(value: string, fallback: string) {
  const [hour = "", minute = "", second = ""] = value.split(":");
  const h = normalizeHistoryTimeUnit(hour, 23);
  const m = normalizeHistoryTimeUnit(minute, 59);
  const s = normalizeHistoryTimeUnit(second, 59);
  if (!h || !m || !s) return fallback;
  return `${h}:${m}:${s}`;
}

function normalizeHistoryTimeUnit(value: string, max: number) {
  if (!/^\d{1,2}$/.test(value)) return "";
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0 || number > max) return "";
  return String(number).padStart(2, "0");
}

function startOfHistoryDayInTimezone(date: Date, timezone: PcUserTimezone) {
  const parts = getUserDateParts(date, timezone);
  return new Date(parts.year, parts.month - 1, parts.day);
}

function addHistoryDays(date: Date, days: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function isoSeconds(date: Date) {
  return date.toISOString().slice(0, 19) + "Z";
}
