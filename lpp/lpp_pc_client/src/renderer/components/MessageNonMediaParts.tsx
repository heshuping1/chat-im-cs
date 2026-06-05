import {
  ChevronRight,
  MapPin,
  PhoneCall,
} from "lucide-react";
import type { MouseEvent } from "react";
import {
  normalizeType,
  numberValue,
  stringValue,
} from "../data/im-message-normalize";
import { handleExternalLinkClick } from "../lib/openExternal";
import { normalizeContactCard } from "../messages/models/contactCardModel";
import { useI18n } from "../i18n/useI18n";
import { PcAvatar } from "./PcAvatar";

export function LocationPart({ value }: { value: Record<string, unknown> }) {
  const { t } = useI18n();
  const name = stringValue(value.name) || stringValue(value.title) || t("messageParts.locationMessage");
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
  const { t } = useI18n();
  const card = normalizeContactCard(value);
  const name = card.displayName || t("contacts.addFriend.contactFallback");
  const subtitle = card.subtitle || t("messageParts.personalCard");
  return (
    <button
      className="message-contact-card"
      type="button"
      aria-label={t("messageParts.viewContactCard", { name })}
      onClick={(event) => onContactClick?.(event, value)}
    >
      <PcAvatar
        avatarUrl={card.avatarUrl}
        className="message-contact-avatar"
        iconSize={18}
        name={name}
      />
      <span className="message-contact-main">
        <strong>{name}</strong>
        {subtitle && <em>{subtitle}</em>}
      </span>
      <ChevronRight className="message-contact-chevron" size={17} />
      <small>{t("messageParts.personalCard")}</small>
    </button>
  );
}

export function CallPart({ value }: { value: Record<string, unknown> }) {
  const { t } = useI18n();
  const mediaMode =
    normalizeType(stringValue(value.mediaMode) || stringValue(value.media_mode)) || "";
  const endReason =
    normalizeType(stringValue(value.endReason) || stringValue(value.end_reason)) || "";
  const title =
    stringValue(value.title) ||
    callTitle(mediaMode, endReason, t) ||
    stringValue(value.callType) ||
    t("messageParts.callRecord");
  const duration = numberValue(value.durationSeconds) ?? numberValue(value.duration);
  const detail =
    stringValue(value.durationText) ||
    (duration ? formatDuration(duration, t("messageParts.unknownDuration"), t("messageParts.secondsUnit")) : undefined) ||
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

function formatDuration(value: number | null | undefined, unknownDuration: string, secondsUnit: string) {
  if (!value || value <= 0) return unknownDuration;
  const seconds = Math.round(value);
  if (seconds < 60) return `${seconds} ${secondsUnit}`;
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function callTitle(mediaMode: string, endReason: string, t: (key: string) => string) {
  if (endReason === "missed") return t("messageParts.missedCall");
  if (endReason === "cancelled") return t("messageParts.cancelledCall");
  if (endReason === "rejected") return t("messageParts.rejectedCall");
  if (mediaMode === "video" || mediaMode === "audio_video" || mediaMode === "audiovideo") {
    return t("messageParts.videoCall");
  }
  if (mediaMode === "audio" || mediaMode === "voice") return t("messageParts.voiceCall");
  return "";
}
