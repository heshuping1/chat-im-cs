import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

import type { MessageItemDto } from "../../data/api-client";
import type { AuthSession } from "../../data/auth/auth-session";
import { requireApiClient } from "../../data/runtime";
import { extractActionResultText } from "../../messages/models/messageComposerModel";
import {
  selectAutoTranslateMessages,
  translationAnnotationText,
} from "../models/autoTranslateModel";

type MessageAnnotationMap = Record<string, string>;

export function useAutoTranslateMessages({
  annotations,
  conversationKey,
  enabled,
  isMineMessage,
  messages,
  session,
  setAnnotations,
  targetLanguage,
}: {
  annotations: MessageAnnotationMap;
  conversationKey?: string;
  enabled: boolean;
  isMineMessage: (message: MessageItemDto) => boolean;
  messages: MessageItemDto[];
  session: AuthSession | null;
  setAnnotations: Dispatch<SetStateAction<MessageAnnotationMap>>;
  targetLanguage: string;
}) {
  const [activeTaskKeys, setActiveTaskKeys] = useState<Set<string>>(() => new Set());
  const completedTaskKeysRef = useRef(new Set<string>());
  const activeTaskKeySnapshot = useMemo(
    () => new Set([...activeTaskKeys, ...completedTaskKeysRef.current]),
    [activeTaskKeys],
  );

  useEffect(() => {
    if (!enabled || !session || !conversationKey) return;
    const candidates = selectAutoTranslateMessages({
      activeTaskKeys: activeTaskKeySnapshot,
      annotations,
      conversationKey,
      isMineMessage,
      messages,
    }).slice(-12);
    if (!candidates.length) return;
    let cancelled = false;

    for (const candidate of candidates) {
      setActiveTaskKeys((current) => new Set(current).add(candidate.taskKey));
      if (candidate.message.messageId) {
        setAnnotations((current) => ({
          ...current,
          [candidate.message.messageId]: translationAnnotationText("loading"),
        }));
      }
      void translateCandidate({
        message: candidate.message,
        targetLanguage,
        text: candidate.text,
        session,
      })
        .then((text) => {
          if (cancelled || !candidate.message.messageId) return;
          setAnnotations((current) => ({
            ...current,
            [candidate.message.messageId]: text
              ? translationAnnotationText("success", text)
              : translationAnnotationText("empty"),
          }));
        })
        .catch(() => {
          if (cancelled || !candidate.message.messageId) return;
          setAnnotations((current) => ({
            ...current,
            [candidate.message.messageId]: translationAnnotationText("failed"),
          }));
        })
        .finally(() => {
          completedTaskKeysRef.current.add(candidate.taskKey);
          setActiveTaskKeys((current) => {
            const next = new Set(current);
            next.delete(candidate.taskKey);
            return next;
          });
        });
    }

    return () => {
      cancelled = true;
    };
  }, [
    activeTaskKeySnapshot,
    annotations,
    conversationKey,
    enabled,
    isMineMessage,
    messages,
    session,
    setAnnotations,
    targetLanguage,
  ]);
}

async function translateCandidate({
  message,
  session,
  targetLanguage,
  text,
}: {
  message: MessageItemDto;
  session: AuthSession;
  targetLanguage: string;
  text: string;
}) {
  const client = requireApiClient(session);
  let translated: string | undefined;
  if (message.messageId) {
    try {
      translated = extractActionResultText(
        await client.translateMessage(message.messageId, targetLanguage),
      );
    } catch {
      translated = undefined;
    }
  }
  if (!translated) {
    translated = extractActionResultText(await client.translateText(text, targetLanguage));
  }
  return translated?.trim();
}
