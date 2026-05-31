import { MessageSquareMore, X } from "lucide-react";

import type { CustomerServiceThread } from "../../data/api-client";
import { createCustomerServiceIdentityViewModel } from "../../data/customer-service/cs-identity-view-model";
import { formatBadgeCount } from "../../lib/format";

export function CustomerServiceMultiOpenBar({
  activeThreadId,
  maxOpenCount,
  openThreads,
  onClose,
  onSelect,
}: {
  activeThreadId?: string | null;
  maxOpenCount: number;
  openThreads: CustomerServiceThread[];
  onClose: (threadId: string) => void;
  onSelect: (threadId: string) => void;
}) {
  if (openThreads.length === 0) return null;

  return (
    <nav className="h-service-open-tabs" aria-label="已打开客服会话">
      <span className="h-service-open-tabs-summary">
        <MessageSquareMore size={15} />
        {openThreads.length}/{maxOpenCount}
      </span>
      <div className="h-service-open-tabs-list">
        {openThreads.map((thread) => {
          const identity = createCustomerServiceIdentityViewModel({
            fallbackName: thread.title || "客户",
            thread,
          });
          const active = thread.threadId === activeThreadId;
          return (
            <span
              className={`h-service-open-tab ${active ? "active" : ""}`}
              key={`${thread.threadType}-${thread.threadId}`}
              title={identity.displayName}
            >
              <button type="button" onClick={() => onSelect(thread.threadId)}>
                <span>{identity.displayName}</span>
                {Number(thread.unreadCount ?? 0) > 0 && (
                  <em>{formatBadgeCount(Number(thread.unreadCount ?? 0))}</em>
                )}
              </button>
              <button
                className="h-service-open-tab-close"
                aria-label={`关闭 ${identity.displayName}`}
                type="button"
                title="关闭"
                onClick={() => onClose(thread.threadId)}
              >
                <X size={13} />
              </button>
            </span>
          );
        })}
      </div>
    </nav>
  );
}
