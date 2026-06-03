import { useState } from "react";

import type { AuthSession } from "../../data/auth/auth-session";
import type { PcSettings } from "../../data/settings/pc-settings";
import { requireApiClient } from "../../data/runtime";
import { formatError } from "../../lib/format";
import {
  buildChatArchiveBackup,
  conversationToArchiveConversation,
  exportChatArchiveJson,
  parseChatArchiveBackup,
  persistRestoredChatArchive,
  preflightChatArchiveRestore,
  type ChatArchiveConversation,
  type ChatArchiveSessionScope,
} from "../models/chatArchiveModel";
import { settingRowProps } from "../models/settingsCatalog";
import { openChatArchiveFile, saveChatArchiveFile } from "../runtime/chatArchiveFileRuntime";
import { ActionRow, InlineSettingsState } from "./SettingsRows";

type SettingKey = keyof PcSettings;

export function ChatArchiveSection({
  authSession,
  setNotice,
}: {
  authSession: AuthSession | null;
  pcSettings: PcSettings;
  setNotice: (notice: string) => void;
  setSetting: <K extends SettingKey>(key: K, value: PcSettings[K]) => void;
}) {
  const [state, setState] = useState("本地归档不会同步到云端，也不会写入服务端消息。");
  const [pendingAction, setPendingAction] = useState<"export" | "backup" | "restore" | null>(
    null,
  );

  const runArchiveAction = async (action: "export" | "backup" | "restore") => {
    if (pendingAction) return;
    setPendingAction(action);
    try {
      if (action === "restore") {
        await restoreChatArchive(authSession);
        setState("已导入本地备份归档，真实会话列表和未读状态未被修改。");
        setNotice("聊天记录备份已导入本机归档");
        return;
      }

      const archive = await loadChatArchiveConversations(authSession);
      const scope = chatArchiveScope(authSession);
      const generatedAt = new Date().toISOString();
      const fileName = archiveFileName(action, generatedAt);
      const content =
        action === "backup"
          ? buildChatArchiveBackup({
              conversations: archive.conversations,
              generatedAt,
              scope,
            })
          : exportChatArchiveJson({
              conversations: archive.conversations,
              generatedAt,
              scope,
            });
      const result = await saveChatArchiveFile({
        content,
        defaultName: fileName,
        kind: action,
      });
      if (!result) {
        setState("已取消聊天记录文件保存。");
        setNotice("已取消聊天记录文件保存");
        return;
      }
      const partialText =
        archive.failedCount > 0 ? `，${archive.failedCount} 个会话因接口失败未导出` : "";
      setState(
        `${action === "backup" ? "备份" : "导出"} ${archive.conversationCount} 个会话、${archive.messageCount} 条消息${partialText}。`,
      );
      setNotice(action === "backup" ? "聊天记录备份已保存" : "聊天记录已导出");
    } catch (error) {
      const message = formatError(error);
      setState(message);
      setNotice(message);
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <section className="settings-chat-archive" aria-label="聊天记录管理">
      <InlineSettingsState text={state} />
      <ActionRow
        {...settingRowProps("chatExport")}
        action={pendingAction === "export" ? "导出中" : "导出"}
        enabled={!pendingAction}
        onClick={() => void runArchiveAction("export")}
      />
      <ActionRow
        {...settingRowProps("chatBackup")}
        action={pendingAction === "backup" ? "备份中" : "备份"}
        enabled={!pendingAction}
        onClick={() => void runArchiveAction("backup")}
      />
      <ActionRow
        {...settingRowProps("chatRestore")}
        action={pendingAction === "restore" ? "导入中" : "导入"}
        enabled={!pendingAction}
        onClick={() => void runArchiveAction("restore")}
      />
    </section>
  );
}

async function loadChatArchiveConversations(authSession: AuthSession | null) {
  const apiClient = requireApiClient(authSession);
  const page = await apiClient.getConversations({ limit: 50 });
  const conversations: ChatArchiveConversation[] = [];
  let failedCount = 0;

  for (const conversation of page.items ?? []) {
    if (conversation.conversationType !== "direct" && conversation.conversationType !== "group") {
      continue;
    }
    try {
      const messages = await apiClient.getConversationMessages(
        conversation.conversationType,
        conversation.conversationId,
        100,
      );
      conversations.push(conversationToArchiveConversation(conversation, messages));
    } catch {
      failedCount += 1;
    }
  }

  const messageCount = conversations.reduce(
    (total, conversation) => total + conversation.messages.length,
    0,
  );
  if (!conversations.length) {
    throw new Error(failedCount > 0 ? "会话消息接口不可用，未能导出聊天记录。" : "暂无可导出的聊天记录。");
  }
  return {
    conversationCount: conversations.length,
    conversations,
    failedCount,
    messageCount,
  };
}

async function restoreChatArchive(authSession: AuthSession | null) {
  if (!authSession) throw new Error("登录状态已失效，请重新登录");
  const result = await openChatArchiveFile();
  if (!result) return;
  const backup = parseChatArchiveBackup(result.content);
  const preflight = preflightChatArchiveRestore(backup, chatArchiveScope(authSession));
  if (!preflight.ok) throw new Error(preflight.reason ?? "备份文件无法恢复");
  persistRestoredChatArchive(backup);
}

function chatArchiveScope(authSession: AuthSession | null): ChatArchiveSessionScope {
  if (!authSession) throw new Error("登录状态已失效，请重新登录");
  return {
    apiBaseUrl: authSession.apiBaseUrl,
    displayName: authSession.displayName,
    spaceType: authSession.spaceType,
    tenantId: authSession.tenantId,
    tenantName: authSession.tenantName,
    userId: authSession.userId,
  };
}

function archiveFileName(action: "export" | "backup", generatedAt: string) {
  const stamp = generatedAt.replace(/[:.]/g, "-");
  return action === "backup"
    ? `lpp-chat-backup-${stamp}.lpp-chat-backup`
    : `lpp-chat-export-${stamp}.json`;
}
