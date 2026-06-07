import { useEffect, useState } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import { UsersRound } from "lucide-react";
import { useAuthSession } from "../data/auth/auth-store";
import {
  getCachedAvatar,
  getCachedAvatarDataUrlSync,
  refreshCachedAvatar,
} from "../lib/avatarCache";

export type PcAvatarKind = "person" | "group" | "tenant";

export function PcAvatar({
  avatarUrl,
  children,
  className = "",
  iconSize = 21,
  kind = "person",
  name,
  ...spanProps
}: HTMLAttributes<HTMLSpanElement> & {
  avatarUrl?: string | null;
  children?: ReactNode;
  className?: string;
  iconSize?: number;
  kind?: PcAvatarKind;
  name: string;
}) {
  return (
    <span {...spanProps} className={`pc-avatar ${kind} ${className}`.trim()}>
      {kind === "group" && !avatarUrl ? (
        <UsersRound size={iconSize} />
      ) : (
        <PcAvatarImage avatarUrl={avatarUrl} name={name} />
      )}
      {children}
    </span>
  );
}

export function avatarInitial(name?: string | null) {
  const trimmed = `${name ?? ""}`.trim();
  return trimmed ? trimmed.slice(0, 1).toUpperCase() : "?";
}

function PcAvatarImage({
  avatarUrl,
  name,
}: {
  avatarUrl?: string | null;
  name: string;
}) {
  const token = useAuthSession()?.tenantToken;
  const [src, setSrc] = useState(() => initialAvatarSrc(avatarUrl));
  const [failed, setFailed] = useState(() => !initialAvatarSrc(avatarUrl));

  useEffect(() => {
    let active = true;
    const objectUrls: string[] = [];
    const initialSrc = initialAvatarSrc(avatarUrl);

    const showBlob = (blob: Blob | null) => {
      if (!blob?.size) return;
      const objectUrl = URL.createObjectURL(blob);
      objectUrls.push(objectUrl);
      if (!active) return;
      setSrc(objectUrl);
      setFailed(false);
    };

    setSrc(initialSrc);
    setFailed(!initialSrc);
    if (!avatarUrl) {
      return () => {
        active = false;
        objectUrls.forEach((objectUrl) => URL.revokeObjectURL(objectUrl));
      };
    }

    if (/^(blob:|data:)/i.test(avatarUrl)) {
      setSrc(avatarUrl);
      setFailed(false);
      return () => {
        active = false;
        objectUrls.forEach((objectUrl) => URL.revokeObjectURL(objectUrl));
      };
    }

    getCachedAvatar(avatarUrl)
      .then((blob) => {
        if (!active) return;
        showBlob(blob);
      })
      .catch(() => undefined);

    refreshCachedAvatar({ token, url: avatarUrl })
      .then((blob) => {
        if (!active) return;
        showBlob(blob);
      })
      .catch(() => {
        if (active && !initialSrc) setFailed(true);
      });

    return () => {
      active = false;
      objectUrls.forEach((objectUrl) => URL.revokeObjectURL(objectUrl));
    };
  }, [avatarUrl, token]);

  if (!src || failed) {
    return (
      <span className="pc-avatar-initial" data-avatar-fallback="true">
        {avatarInitial(name)}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt=""
      onError={() => setFailed(true)}
    />
  );
}

function initialAvatarSrc(avatarUrl?: string | null) {
  if (!avatarUrl) return "";
  if (/^(blob:|data:)/i.test(avatarUrl)) return avatarUrl;
  return getCachedAvatarDataUrlSync(avatarUrl) ?? "";
}
