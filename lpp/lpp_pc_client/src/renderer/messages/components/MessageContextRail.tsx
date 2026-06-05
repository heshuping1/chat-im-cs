import { LibraryBig, MessageSquareText } from "lucide-react";
import type { ReactNode } from "react";

import type { ConversationListItem } from "../../data/api-client";
import { useI18n } from "../../i18n/useI18n";
import type { GroupConversationAvatar } from "../models/groupAvatarTypes";

export type MessageContextPane = "aiDraft" | "knowledge" | "quickReply" | null;

export function MessageContextRail({
  activeAssistantPane,
  conversation,
  profileOpen,
  showAiTools,
  onToggleAssistantPane,
  onToggleProfile,
}: {
  activeAssistantPane: MessageContextPane;
  conversation?: ConversationListItem;
  groupAvatar?: GroupConversationAvatar;
  isGroup: boolean;
  profileOpen: boolean;
  showAiTools: boolean;
  onToggleAssistantPane: (pane: Exclude<MessageContextPane, null>) => void;
  onToggleProfile: () => void;
}) {
  const { t } = useI18n();
  const profileTooltip = profileOpen
    ? t("messages.contextRail.collapseProfile")
    : t("messages.contextRail.expandProfile");

  return (
    <aside className="message-context-rail" aria-label={t("messages.contextRail.railAria")}>
      <button
        className={`message-context-rail-avatar ${profileOpen ? "active" : ""}`}
        type="button"
        title={profileTooltip}
        data-tooltip={profileTooltip}
        aria-label={profileTooltip}
        aria-pressed={profileOpen}
        onClick={onToggleProfile}
      >
        <img
          className="message-context-rail-avatar-image"
          src="/customer-info-entry.svg"
          alt=""
          aria-hidden="true"
        />
        {conversation && <span className="message-context-status-dot" />}
      </button>

      <div className="message-context-rail-actions" aria-label={t("messages.contextRail.toolsAria")}>
        <MessageContextRailButton
          active={activeAssistantPane === "quickReply"}
          label={t("messages.contextRail.quickReply")}
          onClick={() => onToggleAssistantPane("quickReply")}
        >
          <MessageSquareText size={18} />
        </MessageContextRailButton>
        {showAiTools && (
          <MessageContextRailButton
            active={activeAssistantPane === "aiDraft"}
            label={t("messages.contextRail.aiDraft")}
            onClick={() => onToggleAssistantPane("aiDraft")}
          >
            <img
              className="context-rail-tool-image ai-draft"
              src="/ai-draft-entry.svg"
              alt=""
              aria-hidden="true"
            />
          </MessageContextRailButton>
        )}
        <MessageContextRailButton
          active={activeAssistantPane === "knowledge"}
          label={t("messages.contextRail.knowledge")}
          onClick={() => onToggleAssistantPane("knowledge")}
        >
          <LibraryBig size={18} />
        </MessageContextRailButton>
      </div>
    </aside>
  );
}

function MessageContextRailButton({
  active,
  children,
  label,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={active ? "active" : ""}
      type="button"
      title={label}
      data-tooltip={label}
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
