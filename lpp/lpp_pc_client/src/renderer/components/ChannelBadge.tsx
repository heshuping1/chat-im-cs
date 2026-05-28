import {
  AppWindow,
  Globe2,
  MessageCircle,
  Music2,
  Send,
  Waypoints,
  type LucideIcon,
} from "lucide-react";

export function ChannelBadge({
  source,
  compact = false,
}: {
  source?: string | null;
  compact?: boolean;
}) {
  const Icon = channelIcon(source);

  return (
    <span className={`channel-badge ${channelTone(source)} ${compact ? "compact" : ""}`}>
      <span className="channel-badge-icon" aria-hidden="true">
        <Icon size={compact ? 10 : 12} strokeWidth={2.4} />
      </span>
      {channelLabel(source)}
    </span>
  );
}

export function channelLabel(source?: string | null) {
  const value = source?.trim();
  if (!value) return "来源未知";
  const normalized = normalizeChannelSource(value);
  if (value.includes("抖音")) return "抖音";
  if (value.includes("微信")) return "微信";
  if (value.includes("网页") || value.includes("网站")) return "网页";
  if (normalized.includes("douyin") || normalized.includes("tiktok")) {
    return "抖音";
  }
  if (normalized.includes("whatsapp") || normalized.includes("wathsup")) {
    return "WhatsApp";
  }
  if (normalized.includes("telegram") || normalized === "tg") {
    return "Telegram";
  }
  if (
    normalized === "app" ||
    normalized.includes("own_app") ||
    normalized.includes("native") ||
    value.includes("自有") ||
    value === "APP" ||
    value === "App"
  ) {
    return "自有 App";
  }
  if (
    normalized.includes("widget") ||
    normalized.includes("website") ||
    normalized.includes("web") ||
    normalized.includes("site")
  ) {
    return "网页";
  }
  return value.length <= 18 ? value : `${value.slice(0, 18)}...`;
}

export function channelTone(source?: string | null) {
  const normalized = normalizeChannelSource(source);
  const raw = source?.trim() ?? "";
  if (raw.includes("抖音")) return "douyin";
  if (raw.includes("网页") || raw.includes("网站")) return "web";
  if (raw.includes("微信")) return "web";
  if (raw.includes("自有")) return "own-app";
  if (normalized.includes("douyin") || normalized.includes("tiktok")) return "douyin";
  if (normalized.includes("whatsapp") || normalized.includes("wathsup")) {
    return "whatsapp";
  }
  if (normalized.includes("telegram") || normalized === "tg") return "telegram";
  if (
    normalized === "app" ||
    normalized.includes("own_app") ||
    normalized.includes("native")
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
  if (raw.includes("抖音")) return Music2;
  if (raw.includes("微信")) return MessageCircle;
  if (raw.includes("网页") || raw.includes("网站")) return Globe2;
  if (raw.includes("自有")) return AppWindow;
  if (normalized.includes("douyin") || normalized.includes("tiktok")) return Music2;
  if (normalized.includes("whatsapp") || normalized.includes("wathsup")) return MessageCircle;
  if (normalized.includes("telegram") || normalized === "tg") return Send;
  if (
    normalized === "app" ||
    normalized.includes("own_app") ||
    normalized.includes("native")
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
  return source?.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_") ?? "";
}
