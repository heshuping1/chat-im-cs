import { useState } from "react";

import type { AuthSession } from "../../data/auth/auth-session";
import type { PcSettings } from "../../data/settings/pc-settings";
import { requireApiClient } from "../../data/runtime";
import { useI18n } from "../../i18n/useI18n";
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
import {
  isChatArchiveFileRuntimeAvailable,
  openChatArchiveFile,
  saveChatArchiveFile,
} from "../runtime/chatArchiveFileRuntime";
import { ActionRow, InlineSettingsState } from "./SettingsRows";

type SettingKey = keyof PcSettings;
type Translate = ReturnType<typeof useI18n>["t"];

export function ChatArchiveSection({
  authSession,
  setNotice,
}: {
  authSession: AuthSession | null;
  pcSettings: PcSettings;
  setNotice: (notice: string) => void;
  setSetting: <K extends SettingKey>(key: K, value: PcSettings[K]) => void;
}) {
  const { t } = useI18n();
  const [state, setState] = useState(() => t("me.chatArchive.initialState"));
  const [pendingAction, setPendingAction] = useState<"export" | "backup" | "restore" | null>(
    null,
  );

  const runArchiveAction = async (action: "export" | "backup" | "restore") => {
    if (pendingAction) return;
    if (!isChatArchiveFileRuntimeAvailable()) {
      const message = t("me.chatArchive.error.desktopApiUnavailable");
      setState(message);
      setNotice(message);
      return;
    }
    setPendingAction(action);
    try {
      if (action === "restore") {
        await restoreChatArchive(authSession, t);
        setState(t("me.chatArchive.restoreSuccessState"));
        setNotice(t("me.chatArchive.restoreSuccessNotice"));
        return;
      }

      const archive = await loadChatArchiveConversations(authSession, t);
      const scope = chatArchiveScope(authSession, t);
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
        setState(t("me.chatArchive.cancelledState"));
        setNotice(t("me.chatArchive.cancelledNotice"));
        return;
      }
      const partialText =
        archive.failedCount > 0
          ? t("me.chatArchive.partialFailed", { count: archive.failedCount })
          : "";
      setState(
        t(action === "backup" ? "me.chatArchive.backupSuccessState" : "me.chatArchive.exportSuccessState", {
          conversations: archive.conversationCount,
          messages: archive.messageCount,
          partial: partialText,
        }),
      );
      setNotice(
        t(action === "backup" ? "me.chatArchive.backupSuccessNotice" : "me.chatArchive.exportSuccessNotice"),
      );
    } catch (error) {
      const message = formatError(error);
      setState(message);
      setNotice(message);
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <section className="settings-chat-archive" aria-label={t("me.chatArchive.aria")}>
      <InlineSettingsState text={state} />
      <ActionRow
        {...settingRowProps("chatExport")}
        action={pendingAction === "export" ? t("me.chatArchive.exporting") : t("me.chatArchive.export")}
        enabled={!pendingAction}
        onClick={() => void runArchiveAction("export")}
      />
      <ActionRow
        {...settingRowProps("chatBackup")}
        action={pendingAction === "backup" ? t("me.chatArchive.backingUp") : t("me.chatArchive.backup")}
        enabled={!pendingAction}
        onClick={() => void runArchiveAction("backup")}
      />
      <ActionRow
        {...settingRowProps("chatRestore")}
        action={pendingAction === "restore" ? t("me.chatArchive.restoring") : t("me.chatArchive.restore")}
        enabled={!pendingAction}
        onClick={() => void runArchiveAction("restore")}
      />
    </section>
  );
}

async function loadChatArchiveConversations(authSession: AuthSession | null, t: Translate) {
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
    throw new Error(
      failedCount > 0
        ? t("me.chatArchive.error.messageApiUnavailable")
        : t("me.chatArchive.error.noExportableMessages"),
    );
  }
  return {
    conversationCount: conversations.length,
    conversations,
    failedCount,
    messageCount,
  };
}

async function restoreChatArchive(authSession: AuthSession | null, t: Translate) {
  if (!authSession) throw new Error(t("me.chatArchive.error.loginExpired"));
  const result = await openChatArchiveFile();
  if (!result) return;
  const backup = parseChatArchiveBackup(result.content);
  const preflight = preflightChatArchiveRestore(backup, chatArchiveScope(authSession, t));
  if (!preflight.ok) throw new Error(preflight.reason ?? t("me.chatArchive.error.restoreInvalid"));
  persistRestoredChatArchive(backup);
}

function chatArchiveScope(authSession: AuthSession | null, t: Translate): ChatArchiveSessionScope {
  if (!authSession) throw new Error(t("me.chatArchive.error.loginExpired"));
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
