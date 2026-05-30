import { useEffect, useState } from "react";

import type { CachedMediaStatus } from "../../../shared/desktop-api";
import type { MessageItemDto } from "../../data/api-client";
import type { AuthSession } from "../../data/auth/auth-session";
import {
  messageMediaActionPayload,
  messageMediaFileName,
  resolveMessageMediaUrl,
} from "../../media/domain/mediaMessage";
import { isVideoMessage } from "../models/messageContextMenuModel";
import { getCurrentCachedMediaStatus } from "../runtime/messageMediaDesktopActions";

export function useMessageMenuMediaStatus({
  activeConversationId,
  message,
  session,
}: {
  activeConversationId?: string;
  message?: MessageItemDto;
  session: AuthSession | null;
}) {
  const [mediaStatus, setMediaStatus] =
    useState<CachedMediaStatus>("not_cached");

  useEffect(() => {
    let canceled = false;
    setMediaStatus("not_cached");
    if (!message || !isVideoMessage(message)) return undefined;
    const url = resolveMessageMediaUrl(message, session?.apiBaseUrl);
    if (!url) return undefined;
    if (/^(blob:|data:|file:)/i.test(url)) {
      setMediaStatus("cached");
      return undefined;
    }
    const context = {
      accountId:
        session?.userId ||
        session?.platformUserId ||
        session?.lppId ||
        session?.tenantId,
      conversationId: activeConversationId,
      fileName: messageMediaFileName(message),
    };
    const statusPromise = getCurrentCachedMediaStatus(
      messageMediaActionPayload({
        message,
        url,
        authToken: session?.tenantToken,
        cacheContext: context,
      }),
    );
    if (!statusPromise) return undefined;
    void statusPromise
      .then((status) => {
        if (!canceled && status) setMediaStatus(status);
      })
      .catch(() => {
        if (!canceled) setMediaStatus("not_cached");
      });
    return () => {
      canceled = true;
    };
  }, [
    activeConversationId,
    message,
    session?.apiBaseUrl,
    session?.lppId,
    session?.platformUserId,
    session?.tenantId,
    session?.tenantToken,
    session?.userId,
  ]);

  return mediaStatus;
}
