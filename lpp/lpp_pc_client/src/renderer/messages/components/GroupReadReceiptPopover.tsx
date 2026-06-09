import { RefreshCw, X } from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";

import { PcAvatar } from "../../components/PcAvatar";
import type {
  GroupReadReceiptMember,
  GroupReadReceipts,
} from "../../data/message/group-read-receipts-model";
import { useI18n } from "../../i18n/useI18n";

type ReceiptTab = "read" | "unread";

export function GroupReadReceiptPopover({
  anchorRect,
  error,
  loading,
  receipts,
  onClose,
  canOpenMemberProfile,
  onOpenMemberProfile,
  onRetry,
}: {
  anchorRect: DOMRect;
  error?: unknown;
  loading: boolean;
  receipts?: GroupReadReceipts;
  onClose: () => void;
  canOpenMemberProfile?: (member: GroupReadReceiptMember) => boolean;
  onOpenMemberProfile?: (target: HTMLElement, member: GroupReadReceiptMember) => void;
  onRetry: () => void;
}) {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<ReceiptTab>("read");
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const style = useMemo(() => popoverStyle(anchorRect), [anchorRect]);
  const readMembers = receipts?.readMembers ?? [];
  const unreadMembers = receipts?.unreadMembers ?? [];
  const members = activeTab === "read" ? readMembers : unreadMembers;

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (
        target instanceof Node &&
        ((popoverRef.current && popoverRef.current.contains(target)) ||
          isContactCardProfileTarget(target))
      ) {
        return;
      }
      onClose();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      aria-label={t("messages.groupReadReceipts.title")}
      aria-modal="false"
      className="pc-group-read-receipt-popover"
      ref={popoverRef}
      role="dialog"
      style={style}
    >
      <header>
        <strong>{t("messages.groupReadReceipts.title")}</strong>
        <button type="button" aria-label={t("common.close")} onClick={onClose}>
          <X size={15} />
        </button>
      </header>
      <div className="pc-group-read-receipt-tabs" role="tablist">
        <button
          aria-selected={activeTab === "read"}
          className={activeTab === "read" ? "is-active" : ""}
          onClick={() => setActiveTab("read")}
          role="tab"
          type="button"
        >
          {t("messages.groupReadReceipts.readTab", {
            count: readMembers.length,
          })}
        </button>
        <button
          aria-selected={activeTab === "unread"}
          className={activeTab === "unread" ? "is-active" : ""}
          onClick={() => setActiveTab("unread")}
          role="tab"
          type="button"
        >
          {t("messages.groupReadReceipts.unreadTab", {
            count: unreadMembers.length,
          })}
        </button>
      </div>
      <div className="pc-group-read-receipt-body">
        {loading ? (
          <div className="pc-group-read-receipt-loading">
            {t("messages.groupReadReceipts.loading")}
          </div>
        ) : error ? (
          <div className="pc-group-read-receipt-error">
            <span>{t("messages.groupReadReceipts.loadFailed")}</span>
            <button type="button" onClick={onRetry}>
              <RefreshCw size={14} />
              {t("common.retry")}
            </button>
          </div>
        ) : members.length === 0 ? (
          <div className="pc-group-read-receipt-empty">
            {activeTab === "read"
              ? t("messages.groupReadReceipts.readEmpty")
              : t("messages.groupReadReceipts.unreadEmpty")}
          </div>
        ) : (
          <div className="pc-group-read-receipt-members">
            {members.map((member) => (
              <ReceiptMemberRow
                key={member.userId || member.displayName}
                canOpenProfile={Boolean(canOpenMemberProfile?.(member))}
                member={member}
                onOpenProfile={onOpenMemberProfile}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function isContactCardProfileTarget(target: Node) {
  return target instanceof Element
    ? Boolean(target.closest(".contact-card-profile-dialog"))
    : false;
}

function ReceiptMemberRow({
  canOpenProfile,
  member,
  onOpenProfile,
}: {
  canOpenProfile: boolean;
  member: GroupReadReceiptMember;
  onOpenProfile?: (target: HTMLElement, member: GroupReadReceiptMember) => void;
}) {
  const content = (
    <>
      <PcAvatar
        avatarUrl={member.avatarUrl}
        className="pc-group-read-receipt-avatar"
        name={member.displayName}
      />
      <span>{member.displayName}</span>
    </>
  );
  return canOpenProfile && onOpenProfile ? (
    <button
      aria-label={member.displayName}
      className="pc-group-read-receipt-member clickable"
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onOpenProfile(event.currentTarget, member);
      }}
    >
      {content}
    </button>
  ) : (
    <div className="pc-group-read-receipt-member">
      {content}
    </div>
  );
}

function popoverStyle(anchorRect: DOMRect): CSSProperties {
  const width = 280;
  const margin = 12;
  const left = Math.min(
    Math.max(margin, anchorRect.right - width),
    Math.max(margin, window.innerWidth - width - margin),
  );
  const top = Math.min(
    anchorRect.bottom + 8,
    Math.max(margin, window.innerHeight - 360),
  );
  return {
    left,
    top,
    width,
  };
}
