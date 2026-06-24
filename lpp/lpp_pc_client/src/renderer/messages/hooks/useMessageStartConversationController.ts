import { useMutation } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import type { Dispatch, SetStateAction } from "react";

import type { AuthSession } from "../../data/auth/auth-session";
import type { ContactMessageOpenTrace } from "../../data/diagnostics/contact-message-open-diagnostics";
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
type CreateDirectChatVariables =
  | string
  | {
      peerUserId: string;
      trace?: ContactMessageOpenTrace;
    };
type CreateGroupChatVariables =
  | CreateGroupChatPayload
  | {
      payload: CreateGroupChatPayload;
      trace?: ContactMessageOpenTrace;
    };

export function useMessageStartConversationController({
  queryClient,
  session,
  setActiveConversation,
  setComposerDialog,
  setNotice,
}: {
  queryClient: QueryClient;
  session: AuthSession | null;
  setActiveConversation: (
    conversationId: string,
    trace?: ContactMessageOpenTrace,
  ) => void;
  setComposerDialog: Dispatch<SetStateAction<ComposerDialogKind>>;
  setNotice: Dispatch<SetStateAction<string | null>>;
}) {
  const { t } = useI18n();
  const groupCreateAccess = deriveGroupCreateAccess(session);
  const createDirectChatMutation = useMutation({
    mutationFn: async (variables: CreateDirectChatVariables) =>
      requireApiClient(session).createDirectChat(
        normalizeCreateDirectChatVariables(variables).peerUserId,
      ),
    onSuccess: (chat, variables) => {
      const { peerUserId, trace } = normalizeCreateDirectChatVariables(variables);
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
      setActiveConversation(conversationId, trace);
      void queryClient.invalidateQueries({ queryKey: ["pc-im-conversations"] });
    },
    onError: (error) =>
      setNotice(t("messages.startConversation.directFailed", { error: formatError(error) })),
  });

  const createGroupChatMutation = useMutation({
    mutationFn: async (variables: CreateGroupChatVariables) => {
      if (!groupCreateAccess.canCreateGroup) {
        throw new Error(groupCreateAccess.reason ?? t("messages.startConversation.noGroupPermission"));
      }
      return requireApiClient(session).createGroupChat(
        normalizeCreateGroupChatPayload(
          normalizeCreateGroupChatVariables(variables).payload,
        ),
      );
    },
    onSuccess: (group, variables) => {
      const { trace } = normalizeCreateGroupChatVariables(variables);
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
      setActiveConversation(conversationId, trace);
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

function normalizeCreateDirectChatVariables(
  variables: CreateDirectChatVariables,
) {
  return typeof variables === "string"
    ? { peerUserId: variables }
    : variables;
}

function normalizeCreateGroupChatVariables(
  variables: CreateGroupChatVariables,
) {
  return "payload" in variables ? variables : { payload: variables };
}
