import { useMutation } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import type { Dispatch, SetStateAction } from "react";

import type { AuthSession } from "../../data/auth/auth-session";
import { requireApiClient } from "../../data/runtime";
import { formatError } from "../../lib/format";

type ComposerDialogKind = "direct" | "group" | "qr" | null;

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
  const createDirectChatMutation = useMutation({
    mutationFn: async (peerUserId: string) =>
      requireApiClient(session).createDirectChat(peerUserId),
    onSuccess: async (chat) => {
      const conversationId = createdConversationId(chat);
      if (!conversationId) {
        setNotice("发起聊天失败：服务端未返回会话 ID");
        return;
      }
      setComposerDialog(null);
      await queryClient.invalidateQueries({ queryKey: ["pc-im-conversations"] });
      setActiveConversation(conversationId);
    },
    onError: (error) => setNotice(`发起聊天失败：${formatError(error)}`),
  });

  const createGroupChatMutation = useMutation({
    mutationFn: async (payload: { name: string; memberUserIds: string[] }) =>
      requireApiClient(session).createGroupChat(payload),
    onSuccess: async (group) => {
      const conversationId = createdConversationId(group);
      if (!conversationId) {
        setNotice("建群失败：服务端未返回群聊会话 ID");
        return;
      }
      setComposerDialog(null);
      await queryClient.invalidateQueries({ queryKey: ["pc-im-conversations"] });
      setActiveConversation(conversationId);
    },
    onError: (error) => setNotice(`建群失败：${formatError(error)}`),
  });

  const createInviteQrMutation = useMutation({
    mutationFn: async () => requireApiClient(session).createFriendInviteQr(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["pc-account-invite-qrs"] });
    },
    onError: (error) => setNotice(`生成二维码失败：${formatError(error)}`),
  });

  return {
    createDirectChatMutation,
    createGroupChatMutation,
    createInviteQrMutation,
  };
}

function createdConversationId(result: unknown) {
  if (!result || typeof result !== "object") return "";
  const record = result as Record<string, unknown>;
  return stringField(record, "conversationId", "chatId", "groupId", "id");
}

function stringField(record: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return undefined;
}
