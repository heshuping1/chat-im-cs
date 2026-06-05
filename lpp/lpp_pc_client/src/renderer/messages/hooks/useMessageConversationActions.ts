import { useMutation, type QueryClient } from "@tanstack/react-query";
import type { Dispatch, SetStateAction } from "react";

import type { ConversationListItem } from "../../data/api-client";
import type { AuthSession } from "../../data/auth/auth-session";
import { requireApiClient } from "../../data/runtime";
import { useI18n } from "../../i18n/useI18n";
import { formatError } from "../../lib/format";
import {
  conversationActionRequiresDeleteConfirmation,
  conversationVisibilityHidden,
  nextConversationMuted,
  nextConversationPinned,
  type ConversationContextAction,
} from "../models/messageConversationActionModel";
import {
  messageDangerConfirmationDescriptor,
  requestMessageDangerConfirmation,
} from "../runtime/messageConfirm";

export function useMessageConversationActions({
  activeConversationId,
  queryClient,
  session,
  setActiveConversation,
  setLocalHiddenConversationIds,
  setLocalMutedConversationIds,
  setNotice,
}: {
  activeConversationId?: string | null;
  queryClient: QueryClient;
  session: AuthSession | null;
  setActiveConversation: (conversationId: string) => void;
  setLocalHiddenConversationIds: Dispatch<SetStateAction<Set<string>>>;
  setLocalMutedConversationIds: Dispatch<SetStateAction<Set<string>>>;
  setNotice: Dispatch<SetStateAction<string | null>>;
}) {
  const { t } = useI18n();

  const invalidateConversations = async () => {
    await queryClient.invalidateQueries({ queryKey: ["pc-im-conversations"] });
  };

  const pinMutation = useMutation({
    mutationFn: async ({ conversation }: { conversation: ConversationListItem }) => {
      if (!session) throw new Error(t("messages.actionMutations.loginRequired"));
      const isPinned = nextConversationPinned(conversation);
      await requireApiClient(session).setConversationPinned(conversation.conversationId, isPinned);
      return { conversationId: conversation.conversationId, isPinned };
    },
    onSuccess: async ({ isPinned }) => {
      setNotice(
        isPinned
          ? t("messages.conversationActions.pinned")
          : t("messages.conversationActions.unpinned"),
      );
      await invalidateConversations();
    },
    onError: (error) =>
      setNotice(t("messages.conversationActions.failed", { error: formatError(error) })),
  });

  const muteMutation = useMutation({
    mutationFn: async ({ conversation }: { conversation: ConversationListItem }) => {
      if (!session) throw new Error(t("messages.actionMutations.loginRequired"));
      const isMuted = nextConversationMuted(conversation);
      await requireApiClient(session).setConversationMuted(conversation.conversationId, isMuted);
      return { conversationId: conversation.conversationId, isMuted };
    },
    onSuccess: async ({ conversationId, isMuted }) => {
      setLocalMutedConversationIds((current) => {
        const next = new Set(current);
        if (isMuted) next.add(conversationId);
        else next.delete(conversationId);
        return next;
      });
      setNotice(
        isMuted
          ? t("messages.conversationActions.muted")
          : t("messages.conversationActions.unmuted"),
      );
      await invalidateConversations();
    },
    onError: (error) =>
      setNotice(t("messages.conversationActions.failed", { error: formatError(error) })),
  });

  const visibilityMutation = useMutation({
    mutationFn: async ({
      action,
      conversation,
    }: {
      action: ConversationContextAction;
      conversation: ConversationListItem;
    }) => {
      if (!session) throw new Error(t("messages.actionMutations.loginRequired"));
      const hidden = conversationVisibilityHidden(action);
      await requireApiClient(session).setConversationVisibility(conversation.conversationId, hidden);
      return { action, conversationId: conversation.conversationId, hidden };
    },
    onSuccess: async ({ action, conversationId, hidden }) => {
      setLocalHiddenConversationIds((current) => {
        const next = new Set(current);
        if (hidden) next.add(conversationId);
        else next.delete(conversationId);
        return next;
      });
      if (hidden && activeConversationId === conversationId) setActiveConversation("");
      setNotice(
        hidden
          ? action === "delete"
            ? t("messages.conversationActions.deleted")
            : t("messages.conversationActions.hidden")
          : t("messages.conversationActions.restored"),
      );
      await invalidateConversations();
    },
    onError: (error) =>
      setNotice(t("messages.conversationActions.failed", { error: formatError(error) })),
  });

  const runConversationAction = (
    action: ConversationContextAction,
    conversation: ConversationListItem,
  ) => {
    if (
      conversationActionRequiresDeleteConfirmation(action) &&
      !confirmDeleteConversation(t)
    ) {
      return;
    }
    if (action === "pin") {
      pinMutation.mutate({ conversation });
      return;
    }
    if (action === "mute") {
      muteMutation.mutate({ conversation });
      return;
    }
    visibilityMutation.mutate({ action, conversation });
  };

  return {
    conversationActionPending:
      pinMutation.isPending || muteMutation.isPending || visibilityMutation.isPending,
    runConversationAction,
  };
}

type ConversationActionTranslate = (key: string, params?: Record<string, string | number>) => string;

function confirmDeleteConversation(t: ConversationActionTranslate) {
  const descriptor = messageDangerConfirmationDescriptor("delete-conversation");
  return requestMessageDangerConfirmation({
    action: "delete-conversation",
    message: t(descriptor.key, descriptor.params),
  });
}
