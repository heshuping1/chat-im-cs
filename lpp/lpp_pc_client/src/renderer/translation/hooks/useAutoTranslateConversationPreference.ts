import { useEffect, useMemo, useState } from "react";

import {
  readAutoTranslateConversationPreference,
  resolveAutoTranslateEnabled,
  updateAutoTranslateConversationPreference,
  type AutoTranslateConversationKind,
  type AutoTranslateConversationMode,
} from "../models/autoTranslatePreferences";

export function useAutoTranslateConversationPreference({
  conversationId,
  conversationKind,
  globalEnabled,
  scopeKey,
}: {
  conversationId?: string | null;
  conversationKind: AutoTranslateConversationKind;
  globalEnabled: boolean;
  scopeKey?: string | null;
}) {
  const storage = safeLocalStorage();
  const [mode, setModeState] = useState<AutoTranslateConversationMode>(() =>
    readAutoTranslateConversationPreference(storage, {
      conversationId,
      conversationKind,
      scopeKey,
    }),
  );

  useEffect(() => {
    setModeState(
      readAutoTranslateConversationPreference(storage, {
        conversationId,
        conversationKind,
        scopeKey,
      }),
    );
  }, [conversationId, conversationKind, scopeKey, storage]);

  const setMode = (nextMode: AutoTranslateConversationMode) => {
    updateAutoTranslateConversationPreference(storage, {
      conversationId,
      conversationKind,
      mode: nextMode,
      scopeKey,
    });
    setModeState(nextMode);
  };

  return useMemo(
    () => ({
      enabled: resolveAutoTranslateEnabled(globalEnabled, mode),
      mode,
      setMode,
    }),
    [globalEnabled, mode],
  );
}

function safeLocalStorage() {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
