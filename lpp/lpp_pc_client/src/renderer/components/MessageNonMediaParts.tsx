import {
  ChevronRight,
  MapPin,
  PhoneCall,
  UserRound,
} from "lucide-react";
import { useState } from "react";
import type { MouseEvent } from "react";
import {
  normalizeType,
  numberValue,
  stringValue,
} from "../data/im-message-normalize";
import { handleExternalLinkClick } from "../lib/openExternal";

export function LocationPart({ value }: { value: Record<string, unknown> }) {
  const name = stringValue(value.name) || stringValue(value.title) || "位置消息";
  const address =
    stringValue(value.address) ||
    stringValue(value.detailAddress) ||
    stringValue(value.description) ||
    "--";
  const latitude = numberValue(value.latitude) ?? numberValue(value.lat);
  const longitude =
    numberValue(value.longitude) ?? numberValue(value.lng) ?? numberValue(value.lon);
  const href =
    latitude != null && longitude != null
      ? `https://maps.apple.com/?q=${latitude},${longitude}`
      : undefined;
  const content = (
    <>
      <MapPin size={22} />
      <span>
        <strong>{name}</strong>
        <em>{address}</em>
      </span>
    </>
  );

  if (!href) {
    return <div className="message-file-card static">{content}</div>;
  }
  return (
    <a
      className="message-file-card"
      href={href}
      onClick={(event) => handleExternalLinkClick(event, href)}
      target="_blank"
      rel="noreferrer"
    >
      {content}
    </a>
  );
}

export function ContactPart({
  onContactClick,
  value,
}: {
  onContactClick?: (event: MouseEvent<HTMLElement>, value: Record<string, unknown>) => void;
  value: Record<string, unknown>;
}) {
  const name =
    stringValue(value.displayName) ||
    stringValue(value.display_name) ||
    stringValue(value.name) ||
    stringValue(value.userName) ||
    stringValue(value.user_name) ||
    stringValue(value.realName) ||
    stringValue(value.real_name) ||
    stringValue(value.nickname) ||
    stringValue(value.nickName) ||
    stringValue(value.nick_name) ||
    "联系人名片";
  const subtitle =
    stringValue(value.lppId) ||
    stringValue(value.lpp_id) ||
    stringValue(value.userNo) ||
    stringValue(value.mobile) ||
    stringValue(value.phone) ||
    stringValue(value.email);
  return (
    <button
      className="message-contact-card"
      type="button"
      aria-label={`查看名片 ${name}`}
      onClick={(event) => onContactClick?.(event, value)}
    >
      <AvatarThumb value={value} />
      <span className="message-contact-main">
        <strong>{name}</strong>
        {subtitle && <em>{subtitle}</em>}
      </span>
      <ChevronRight className="message-contact-chevron" size={17} />
      <small>个人名片</small>
    </button>
  );
}

export function CallPart({ value }: { value: Record<string, unknown> }) {
  const mediaMode =
    normalizeType(stringValue(value.mediaMode) || stringValue(value.media_mode)) || "";
  const endReason =
    normalizeType(stringValue(value.endReason) || stringValue(value.end_reason)) || "";
  const title =
    stringValue(value.title) ||
    callTitle(mediaMode, endReason) ||
    stringValue(value.callType) ||
    "通话记录";
  const duration = numberValue(value.durationSeconds) ?? numberValue(value.duration);
  const detail =
    stringValue(value.durationText) ||
    (duration ? formatDuration(duration) : undefined) ||
    stringValue(value.status) ||
    "--";
  return (
    <div className="message-file-card static">
      <PhoneCall size={22} />
      <span>
        <strong>{title}</strong>
        <em>{detail}</em>
      </span>
    </div>
  );
}

function AvatarThumb({ value }: { value: Record<string, unknown> }) {
  const [failed, setFailed] = useState(false);
  const name =
    stringValue(value.displayName) ||
    stringValue(value.display_name) ||
    stringValue(value.name) ||
    stringValue(value.nickname) ||
    stringValue(value.nickName) ||
    stringValue(value.nick_name) ||
    "名";
  const avatarUrl =
    stringValue(value.avatarUrl) ||
    stringValue(value.avatar_url) ||
    stringValue(value.avatar) ||
    stringValue(value.photoUrl);
  if (avatarUrl && !failed) {
    return (
      <img
        className="message-contact-avatar"
        src={avatarUrl}
        alt={name}
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <span className="message-contact-avatar">
      {name === "联系人名片" ? <UserRound size={18} /> : name.slice(0, 1)}
    </span>
  );
}

function formatDuration(value?: number | null) {
  if (!value || value <= 0) return "未知时长";
  const seconds = Math.round(value);
  if (seconds < 60) return `${seconds} 秒`;
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function callTitle(mediaMode: string, endReason: string) {
  if (endReason === "missed") return "未接来电";
  if (endReason === "cancelled") return "已取消通话";
  if (endReason === "rejected") return "已拒绝通话";
  if (mediaMode === "video" || mediaMode === "audio_video" || mediaMode === "audiovideo") {
    return "视频通话";
  }
  if (mediaMode === "audio" || mediaMode === "voice") return "语音通话";
  return "";
}
