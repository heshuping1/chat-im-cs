import {
  Check,
  CheckSquare,
  MessageSquare,
  QrCode,
  Search,
  Send,
  UserPlus,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { PcAvatar } from "../../components/PcAvatar";
import type { TranslationParams } from "../../i18n/dictionary";
import { useI18n } from "../../i18n/useI18n";
import { formatBadgeCount } from "../../lib/format";
import type { GroupCreateAccess } from "../models/groupCreateModel";

type Translate = (key: string, params?: TranslationParams) => string;

export type ContactPickerItem = {
  avatarUrl?: string | null;
  id: string;
  name: string;
  source: "friend" | "member" | "department";
  subtitle: string;
};

export type MessagePlusAction = "direct" | "group" | "addFriend" | "requests" | "qr";

export function MessagePlusMenu({
  friendRequestCount = 0,
  groupCreateAccess,
  onAction,
}: {
  friendRequestCount?: number;
  groupCreateAccess: GroupCreateAccess;
  onAction: (action: MessagePlusAction) => void;
}) {
  const { t } = useI18n();
  const items: Array<{
    action: MessagePlusAction;
    badge?: number;
    icon: ReactNode;
    label: string;
    disabled?: boolean;
    title?: string;
  }> = [
    { action: "direct", icon: <MessageSquare size={16} />, label: t("messages.start.direct") },
    {
      action: "group",
      disabled: !groupCreateAccess.canCreateGroup,
      icon: <UsersRound size={16} />,
      label: t("messages.start.group"),
      title: groupCreateAccess.reason ?? t("messages.start.noGroupPermission"),
    },
    { action: "addFriend", icon: <UserPlus size={16} />, label: t("messages.start.addFriend") },
    {
      action: "requests",
      badge: friendRequestCount,
      icon: <CheckSquare size={16} />,
      label: t("messages.start.requests"),
    },
    { action: "qr", icon: <QrCode size={16} />, label: t("messages.start.myQr") },
  ];

  return (
    <div
      className="message-plus-menu"
      role="menu"
      aria-label={t("messages.start.quickActionsAria")}
      onClick={(event) => event.stopPropagation()}
    >
      {items.map((item) => (
        <button
          key={item.action}
          type="button"
          role="menuitem"
          aria-disabled={item.disabled || undefined}
          disabled={item.disabled}
          title={item.disabled ? item.title : undefined}
          onClick={() => !item.disabled && onAction(item.action)}
        >
          {item.icon}
          <span>{item.label}</span>
          {Boolean(item.badge) && <em>{formatBadgeCount(item.badge ?? 0)}</em>}
        </button>
      ))}
    </div>
  );
}

export function DirectChatDialog({
  contacts,
  onClose,
  onSubmit,
  pending,
}: {
  contacts: ContactPickerItem[];
  onClose: () => void;
  onSubmit: (userId: string) => void;
  pending: boolean;
}) {
  const { t } = useI18n();
  const [keyword, setKeyword] = useState("");
  const targets = filterContactPickerItems(contacts, keyword);
  return (
    <ContactPickerDialog
      contacts={targets}
      emptyText={t("messages.start.emptyDirect")}
      keyword={keyword}
      mode="single"
      pending={pending}
      title={t("messages.start.direct")}
      t={t}
      onClose={onClose}
      onKeywordChange={setKeyword}
      onSingleSubmit={onSubmit}
    />
  );
}

export function GroupChatDialog({
  contacts,
  lockedContacts = [],
  onClose,
  onSubmit,
  pending,
}: {
  contacts: ContactPickerItem[];
  lockedContacts?: ContactPickerItem[];
  onClose: () => void;
  onSubmit: (payload: { title: string; memberUserIds: string[] }) => void;
  pending: boolean;
}) {
  const { t } = useI18n();
  const [keyword, setKeyword] = useState("");
  const [name, setName] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const lockedIds = new Set(lockedContacts.map((item) => item.id));
  const targets = filterContactPickerItems(
    contacts.filter((item) => !lockedIds.has(item.id)),
    keyword,
  );
  const selectedContacts = [
    ...lockedContacts,
    ...contacts.filter((item) => selectedIds.has(item.id) && !lockedIds.has(item.id)),
  ];
  const groupName = name.trim() || defaultGroupName(selectedContacts, t);
  return (
    <ContactPickerDialog
      contacts={targets}
      emptyText={t("messages.start.emptyGroupMembers")}
      groupName={name}
      keyword={keyword}
      lockedContacts={lockedContacts}
      mode="multi"
      pending={pending}
      selectedIds={selectedIds}
      title={t("messages.start.group")}
      t={t}
      onClose={onClose}
      onGroupNameChange={setName}
      onKeywordChange={setKeyword}
      onMultiToggle={(id) =>
        setSelectedIds((current) => {
          const next = new Set(current);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        })
      }
      onMultiSubmit={() =>
        onSubmit({
          title: groupName,
          memberUserIds: Array.from(new Set([...lockedIds, ...selectedIds])),
        })
      }
    />
  );
}

export function ContactCardDialog({
  contacts,
  onClose,
  onSubmit,
  pending,
}: {
  contacts: ContactPickerItem[];
  onClose: () => void;
  onSubmit: (contact: ContactPickerItem) => Promise<void> | void;
  pending: boolean;
}) {
  const { t } = useI18n();
  const [keyword, setKeyword] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const targets = filterContactPickerItems(contacts, keyword);
  const selected = contacts.find((item) => item.id === selectedId);
  return (
    <div className="pc-modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="pc-forward-dialog message-start-dialog message-card-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={t("messages.start.card.title")}
        onClick={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <h3>{t("messages.start.card.title")}</h3>
            <p>{t("messages.start.card.subtitle")}</p>
          </div>
          <button type="button" aria-label={t("common.close")} onClick={onClose}>
            <X size={16} />
          </button>
        </header>
        <label className="e-search compact">
          <Search size={15} />
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder={t("messages.start.searchPlaceholder")}
            autoFocus
          />
        </label>
        <div className="pc-forward-targets message-contact-targets">
          {targets.map((item) => {
            const selectedContact = item.id === selectedId;
            return (
              <button
                key={`${item.source}-${item.id}`}
                type="button"
                className={selectedContact ? "selected" : ""}
                disabled={pending}
                onClick={() => setSelectedId(item.id)}
              >
                <PcAvatar avatarUrl={item.avatarUrl} className="e-avatar" name={item.name} />
                <span>
                  <strong>{item.name}</strong>
                  <small>{item.subtitle}</small>
                </span>
                {selectedContact && <Check size={16} />}
              </button>
            );
          })}
          {targets.length === 0 && <div className="panel-state muted">{t("messages.start.card.empty")}</div>}
        </div>
        <footer className="message-start-footer message-card-confirm">
          <div className="message-card-confirm-preview">
            <UserRound size={16} />
            <span>
              {selected
                ? t("messages.start.card.selected", { name: selected.name })
                : t("messages.start.card.selectOne")}
            </span>
          </div>
          <button type="button" onClick={onClose}>{t("common.cancel")}</button>
          <button
            className="primary"
            type="button"
            disabled={pending || !selected}
            onClick={() => selected && void onSubmit(selected)}
          >
            <Send size={15} />
            {pending ? t("messages.start.sending") : t("messages.start.send")}
          </button>
        </footer>
      </section>
    </div>
  );
}

function ContactPickerDialog({
  contacts,
  emptyText,
  groupName,
  keyword,
  lockedContacts,
  mode,
  onClose,
  onGroupNameChange,
  onKeywordChange,
  onMultiSubmit,
  onMultiToggle,
  onSingleSubmit,
  pending,
  selectedIds,
  t,
  title,
}: {
  contacts: ContactPickerItem[];
  emptyText: string;
  groupName?: string;
  keyword: string;
  lockedContacts?: ContactPickerItem[];
  mode: "single" | "multi";
  onClose: () => void;
  onGroupNameChange?: (value: string) => void;
  onKeywordChange: (value: string) => void;
  onMultiSubmit?: () => void;
  onMultiToggle?: (id: string) => void;
  onSingleSubmit?: (id: string) => void;
  pending: boolean;
  selectedIds?: Set<string>;
  t: Translate;
  title: string;
}) {
  const selectedCount = selectedIds?.size ?? 0;
  const lockedCount = lockedContacts?.length ?? 0;
  const totalSelectedCount = selectedCount + lockedCount;
  return (
    <div className="pc-modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="pc-forward-dialog message-start-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <h3>{title}</h3>
            <p>{mode === "multi" ? t("messages.start.groupSubtitle") : t("messages.start.directSubtitle")}</p>
          </div>
          <button type="button" aria-label={t("common.close")} onClick={onClose}>
            <X size={16} />
          </button>
        </header>
        <label className="e-search compact">
          <Search size={15} />
          <input
            value={keyword}
            onChange={(event) => onKeywordChange(event.target.value)}
            placeholder={t("messages.start.searchPlaceholder")}
            autoFocus
          />
        </label>
        {mode === "multi" && (
          <div className="message-group-fields">
            <input
              value={groupName}
              onChange={(event) => onGroupNameChange?.(event.target.value)}
              placeholder={t("messages.start.groupNamePlaceholder")}
            />
          </div>
        )}
        <div className="pc-forward-targets message-contact-targets">
          {mode === "multi" && lockedContacts?.map((item) => (
            <button
              key={`locked-${item.source}-${item.id}`}
              type="button"
              className="selected locked"
              disabled
            >
              <PcAvatar avatarUrl={item.avatarUrl} className="e-avatar" name={item.name} />
              <span>
                <strong>{item.name}</strong>
                <small>{item.subtitle}</small>
              </span>
              <Check size={16} />
            </button>
          ))}
          {contacts.map((item) => {
            const selected = selectedIds?.has(item.id) ?? false;
            return (
              <button
                key={`${item.source}-${item.id}`}
                type="button"
                className={selected ? "selected" : ""}
                disabled={pending}
                onClick={() =>
                  mode === "multi" ? onMultiToggle?.(item.id) : onSingleSubmit?.(item.id)
                }
              >
                <PcAvatar avatarUrl={item.avatarUrl} className="e-avatar" name={item.name} />
                <span>
                  <strong>{item.name}</strong>
                  <small>{item.subtitle}</small>
                </span>
                {mode === "multi" && <Check size={16} />}
              </button>
            );
          })}
          {contacts.length === 0 && <div className="panel-state muted">{emptyText}</div>}
        </div>
        {mode === "multi" && (
          <footer className="message-start-footer">
            <button type="button" onClick={onClose}>{t("common.cancel")}</button>
            <button
              className="primary"
              type="button"
              disabled={pending || totalSelectedCount < 2}
              onClick={() => onMultiSubmit?.()}
            >
              {pending
                ? t("messages.start.creating")
                : t("messages.start.createCount", { count: totalSelectedCount })}
            </button>
          </footer>
        )}
      </section>
    </div>
  );
}

function filterContactPickerItems(items: ContactPickerItem[], keyword: string) {
  const normalized = keyword.trim().toLowerCase();
  if (!normalized) return items;
  return items.filter((item) =>
    `${item.name} ${item.subtitle}`.toLowerCase().includes(normalized),
  );
}

function defaultGroupName(items: ContactPickerItem[], t: Translate) {
  return items.slice(0, 3).map((item) => item.name).join(t("messages.start.nameSeparator"))
    || t("messages.start.defaultGroupName");
}
