import {
  AppWindow,
  Globe2,
  MessageCircle,
  Music2,
  Send,
  Waypoints,
  type LucideIcon,
} from "lucide-react";
import { useI18n } from "../i18n/useI18n";

export function ChannelBadge({
  source,
  compact = false,
}: {
  source?: string | null;
  compact?: boolean;
}) {
  const { t } = useI18n();
  const Icon = channelIcon(source);
  const labelKey = channelLabelKey(source);

  return (
    <span className={`channel-badge ${channelTone(source)} ${compact ? "compact" : ""}`}>
      <span className="channel-badge-icon" aria-hidden="true">
        <Icon size={compact ? 10 : 12} strokeWidth={2.4} />
      </span>
      {labelKey ? t(labelKey) : channelLabel(source)}
    </span>
  );
}

export function channelLabel(source?: string | null) {
  const value = source?.trim();
  if (!value) return "Unknown source";
  const normalized = normalizeChannelSource(value);
  if (hasDouyin(value)) return "Douyin";
  if (hasWechat(value)) return "WeChat";
  if (hasWeb(value)) return "Web";
  if (normalized.includes("douyin") || normalized.includes("tiktok")) return "Douyin";
  if (normalized.includes("wechat") || normalized.includes("weixin")) return "WeChat";
  if (normalized.includes("whatsapp") || normalized.includes("wathsup")) return "WhatsApp";
  if (normalized.includes("telegram") || normalized === "tg") return "Telegram";
  if (
    normalized === "app" ||
    normalized.includes("own_app") ||
    normalized.includes("native") ||
    normalized.includes("mobile_app") ||
    value === "APP" ||
    value === "App" ||
    hasOwnApp(value)
  ) {
    return "Owned App";
  }
  if (
    normalized.includes("widget") ||
    normalized.includes("website") ||
    normalized.includes("web") ||
    normalized.includes("site")
  ) {
    return "Web";
  }
  return value.length <= 18 ? value : `${value.slice(0, 18)}...`;
}

export function channelLabelKey(source?: string | null) {
  const value = source?.trim();
  if (!value) return "channel.unknown";
  const normalized = normalizeChannelSource(value);
  if (hasDouyin(value) || normalized.includes("douyin") || normalized.includes("tiktok")) {
    return "channel.douyin";
  }
  if (hasWechat(value) || normalized.includes("wechat") || normalized.includes("weixin")) {
    return "channel.wechat";
  }
  if (normalized.includes("whatsapp") || normalized.includes("wathsup")) return "channel.whatsapp";
  if (normalized.includes("telegram") || normalized === "tg") return "channel.telegram";
  if (
    normalized === "app" ||
    normalized.includes("own_app") ||
    normalized.includes("native") ||
    normalized.includes("mobile_app") ||
    value === "APP" ||
    value === "App" ||
    hasOwnApp(value)
  ) {
    return "channel.ownApp";
  }
  if (
    hasWeb(value) ||
    normalized.includes("widget") ||
    normalized.includes("website") ||
    normalized.includes("web") ||
    normalized.includes("site")
  ) {
    return "channel.web";
  }
  return undefined;
}

export function channelTone(source?: string | null) {
  const normalized = normalizeChannelSource(source);
  const raw = source?.trim() ?? "";
  if (hasDouyin(raw)) return "douyin";
  if (hasWeb(raw)) return "web";
  if (hasWechat(raw)) return "web";
  if (hasOwnApp(raw)) return "own-app";
  if (normalized.includes("douyin") || normalized.includes("tiktok")) return "douyin";
  if (normalized.includes("whatsapp") || normalized.includes("wathsup")) return "whatsapp";
  if (normalized.includes("telegram") || normalized === "tg") return "telegram";
  if (
    normalized === "app" ||
    normalized.includes("own_app") ||
    normalized.includes("native") ||
    normalized.includes("mobile_app")
  ) {
    return "own-app";
  }
  if (
    normalized.includes("widget") ||
    normalized.includes("website") ||
    normalized.includes("web") ||
    normalized.includes("site")
  ) {
    return "web";
  }
  return "unknown";
}

function channelIcon(source?: string | null): LucideIcon {
  const normalized = normalizeChannelSource(source);
  const raw = source?.trim() ?? "";
  if (hasDouyin(raw)) return Music2;
  if (hasWechat(raw)) return MessageCircle;
  if (hasWeb(raw)) return Globe2;
  if (hasOwnApp(raw)) return AppWindow;
  if (normalized.includes("douyin") || normalized.includes("tiktok")) return Music2;
  if (normalized.includes("wechat") || normalized.includes("weixin")) return MessageCircle;
  if (normalized.includes("whatsapp") || normalized.includes("wathsup")) return MessageCircle;
  if (normalized.includes("telegram") || normalized === "tg") return Send;
  if (
    normalized === "app" ||
    normalized.includes("own_app") ||
    normalized.includes("native") ||
    normalized.includes("mobile_app")
  ) {
    return AppWindow;
  }
  if (
    normalized.includes("widget") ||
    normalized.includes("website") ||
    normalized.includes("web") ||
    normalized.includes("site")
  ) {
    return Globe2;
  }
  return Waypoints;
}

function normalizeChannelSource(source?: string | null) {
  return source?.trim().toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "_") ?? "";
}

function hasDouyin(value: string) {
  return value.includes("\u6296\u97f3");
}

function hasWechat(value: string) {
  return value.includes("\u5fae\u4fe1");
}

function hasWeb(value: string) {
  return value.includes("\u7f51\u9875") || value.includes("\u7f51\u7ad9");
}

function hasOwnApp(value: string) {
  return value.includes("\u81ea\u6709");
}
