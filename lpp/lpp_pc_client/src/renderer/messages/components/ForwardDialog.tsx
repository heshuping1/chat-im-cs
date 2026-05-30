import { Search, X } from "lucide-react";
import { useState } from "react";

import type { ConversationListItem, MessageItemDto } from "../../data/api-client";
import type { CurrentUserIdentity } from "../../data/message-display";
import { conversationMetaText, effectiveConversationUnreadCount } from "../../data/message-display";
import type { GroupConversationAvatar } from "../models/groupAvatarTypes";
import { ConversationAvatar } from "./ConversationListParts";

export function ForwardDialog({
  activeConversationId,
  conversations,
  messages,
  pending,
  resolveConversationAvatar,
  resolveConversationType,
  resolveMessagePreview,
  userIdentity,
  onClose,
  onForward,
}: {
  activeConversationId: string;
  conversations: ConversationListItem[];
  messages: MessageItemDto[];
  pending: boolean;
  resolveConversationAvatar: (conversation: ConversationListItem) => GroupConversationAvatar | undefined;
  resolveConversationType: (conversation: ConversationListItem) => "direct" | "group" | undefined;
  resolveMessagePreview: (message: MessageItemDto) => string;
  userIdentity?: CurrentUserIdentity | null;
  onClose: () => void;
  onForward: (conversationId: string) => void;
}) {
  const [keyword, setKeyword] = useState("");
  const preview =
    messages.length > 1 ? `${messages.length} 条消息` : resolveMessagePreview(messages[0]);
  const targets = conversations
    .filter((item) => item.conversationId !== activeConversationId)
    .filter((item) => item.title.toLowerCase().includes(keyword.trim().toLowerCase()));
  return (
    <div className="pc-modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="pc-forward-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="转发消息"
        onClick={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <h3>转发消息</h3>
            <p>{preview}</p>
          </div>
          <button type="button" aria-label="关闭" onClick={onClose}>
            <X size={16} />
          </button>
        </header>
        <label className="e-search compact">
          <Search size={15} />
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="搜索会话"
            autoFocus
          />
        </label>
        <div className="pc-forward-targets">
          {targets.map((item) => (
            <button
              key={item.conversationId}
              type="button"
              disabled={pending}
              onClick={() => onForward(item.conversationId)}
            >
              <ConversationAvatar
                avatarUrl={item.avatarUrl}
                groupAvatar={resolveConversationAvatar(item)}
                isGroup={resolveConversationType(item) === "group"}
                title={item.title}
                unread={effectiveConversationUnreadCount(item, userIdentity)}
              />
              <span>
                <strong>{item.title}</strong>
                <small>{conversationMetaText(item, userIdentity)}</small>
              </span>
            </button>
          ))}
          {targets.length === 0 && <p className="panel-state">没有可转发的会话</p>}
        </div>
      </section>
    </div>
  );
}
