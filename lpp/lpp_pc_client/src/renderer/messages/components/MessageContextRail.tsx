import { LibraryBig, MessageSquareText } from "lucide-react";

import type { ConversationListItem } from "../../data/api-client";
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
  const profileTooltip = profileOpen ? "收起用户信息" : "展开用户信息";
  return (
    <aside className="message-context-rail" aria-label="消息右侧工具栏">
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

      <div className="message-context-rail-actions" aria-label="消息工具">
        <button
          className={activeAssistantPane === "quickReply" ? "active" : ""}
          type="button"
          title="快捷话术"
          data-tooltip="快捷话术"
          aria-label="快捷话术"
          aria-pressed={activeAssistantPane === "quickReply"}
          onClick={() => onToggleAssistantPane("quickReply")}
        >
          <MessageSquareText size={18} />
        </button>
        {showAiTools && (
          <button
            className={activeAssistantPane === "aiDraft" ? "active" : ""}
            type="button"
            title="AI 起草"
            data-tooltip="AI 起草"
            aria-label="AI 起草"
            aria-pressed={activeAssistantPane === "aiDraft"}
            onClick={() => onToggleAssistantPane("aiDraft")}
          >
            <img
              className="context-rail-tool-image ai-draft"
              src="/ai-draft-entry.svg"
              alt=""
              aria-hidden="true"
            />
          </button>
        )}
        <button
          className={activeAssistantPane === "knowledge" ? "active" : ""}
          type="button"
          title="知识库"
          data-tooltip="知识库"
          aria-label="知识库"
          aria-pressed={activeAssistantPane === "knowledge"}
          onClick={() => onToggleAssistantPane("knowledge")}
        >
          <LibraryBig size={18} />
        </button>
      </div>
    </aside>
  );
}
