import { useMutation } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import type { Dispatch, SetStateAction } from "react";

import type { AuthSession } from "../../data/auth/auth-session";
import { requireApiClient } from "../../data/runtime";
import { useI18n } from "../../i18n/useI18n";
import { formatError } from "../../lib/format";
import {
  deriveGroupCreateAccess,
  extractCreatedGroupConversationId,
  formatGroupCreateError,
  normalizeCreateGroupChatPayload,
  type CreateGroupChatPayload,
} from "../models/groupCreateModel";
import {
  buildCreatedDirectConversationItem,
  buildCreatedGroupConversationItem,
  extractCreatedDirectConversationId,
  upsertImConversationListItem,
} from "../models/startConversationModel";

type ComposerDialogKind = "direct" | "group" | "qr" | "card" | null;

export function useMessageStartConversationController({
  queryClient,
  session,
  setActiveConversation,
  setComposerDialog,
  setNotice,
}: {
  queryClient: QueryClient;
  session: AuthSession | null;
  setActiveConversation: (conversationId: string) => void;
  setComposerDialog: Dispatch<SetStateAction<ComposerDialogKind>>;
  setNotice: Dispatch<SetStateAction<string | null>>;
}) {
  const { t } = useI18n();
  const groupCreateAccess = deriveGroupCreateAccess(session);
  const createDirectChatMutation = useMutation({
    mutationFn: async (peerUserId: string) =>
      requireApiClient(session).createDirectChat(peerUserId),
    onSuccess: (chat, peerUserId) => {
      const conversationId = extractCreatedDirectConversationId(chat);
      if (!conversationId) {
        setNotice(t("messages.startConversation.directMissingId"));
        return;
      }
      setComposerDialog(null);
      const preview = buildCreatedDirectConversationItem(chat, { peerUserId });
      if (preview) {
        upsertImConversationListItem(queryClient, session, preview);
      }
      setActiveConversation(conversationId);
      void queryClient.invalidateQueries({ queryKey: ["pc-im-conversations"] });
    },
    onError: (error) =>
      setNotice(t("messages.startConversation.directFailed", { error: formatError(error) })),
  });

  const createGroupChatMutation = useMutation({
    mutationFn: async (payload: CreateGroupChatPayload) => {
      if (!groupCreateAccess.canCreateGroup) {
        throw new Error(groupCreateAccess.reason ?? t("messages.startConversation.noGroupPermission"));
      }
      return requireApiClient(session).createGroupChat(
        normalizeCreateGroupChatPayload(payload),
      );
    },
    onSuccess: (group) => {
      const conversationId = extractCreatedGroupConversationId(group);
      if (!conversationId) {
        setNotice(t("messages.startConversation.groupMissingId"));
        return;
      }
      setComposerDialog(null);
      const preview = buildCreatedGroupConversationItem(group);
      if (preview) {
        upsertImConversationListItem(queryClient, session, preview);
      }
      setActiveConversation(conversationId);
      void queryClient.invalidateQueries({ queryKey: ["pc-im-conversations"] });
    },
    onError: (error) =>
      setNotice(t("messages.startConversation.groupFailed", { error: formatGroupCreateError(error) })),
  });

  const createInviteQrMutation = useMutation({
    mutationFn: async () => requireApiClient(session).createFriendInviteQr(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["pc-account-invite-qrs"] });
    },
    onError: (error) =>
      setNotice(t("messages.startConversation.qrFailed", { error: formatError(error) })),
  });

  return {
    createDirectChatMutation,
    createGroupChatMutation,
    createInviteQrMutation,
    groupCreateAccess,
  };
}
