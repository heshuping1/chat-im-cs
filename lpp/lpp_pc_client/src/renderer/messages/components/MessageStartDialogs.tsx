import { Check, CheckSquare, QrCode, Search, Send, UserPlus, UserRound, UsersRound, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { PcAvatar } from "../../components/PcAvatar";

export type ContactPickerItem = {
  avatarUrl?: string | null;
  id: string;
  name: string;
  source: "friend" | "member" | "department";
  subtitle: string;
};

export function MessagePlusMenu({
  onAction,
}: {
  onAction: (action: "direct" | "group" | "requests" | "qr") => void;
}) {
  const items: Array<{
    action: "direct" | "group" | "requests" | "qr";
    icon: ReactNode;
    label: string;
  }> = [
    { action: "direct", icon: <UserPlus size={16} />, label: "发起聊天" },
    { action: "group", icon: <UsersRound size={16} />, label: "发起群聊" },
    { action: "requests", icon: <CheckSquare size={16} />, label: "好友申请" },
    { action: "qr", icon: <QrCode size={16} />, label: "我的二维码" },
  ];

  return (
    <div
      className="message-plus-menu"
      role="menu"
      aria-label="消息快捷操作"
      onClick={(event) => event.stopPropagation()}
    >
      {items.map((item) => (
        <button
          key={item.action}
          type="button"
          role="menuitem"
          onClick={() => onAction(item.action)}
        >
          {item.icon}
          <span>{item.label}</span>
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
  const [keyword, setKeyword] = useState("");
  const targets = filterContactPickerItems(contacts, keyword);
  return (
    <ContactPickerDialog
      contacts={targets}
      emptyText="没有可发起聊天的联系人"
      keyword={keyword}
      mode="single"
      pending={pending}
      title="发起聊天"
      onClose={onClose}
      onKeywordChange={setKeyword}
      onSingleSubmit={onSubmit}
    />
  );
}

export function GroupChatDialog({
  contacts,
  onClose,
  onSubmit,
  pending,
}: {
  contacts: ContactPickerItem[];
  onClose: () => void;
  onSubmit: (payload: { name: string; memberUserIds: string[] }) => void;
  pending: boolean;
}) {
  const [keyword, setKeyword] = useState("");
  const [name, setName] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const targets = filterContactPickerItems(contacts, keyword);
  const selectedContacts = contacts.filter((item) => selectedIds.has(item.id));
  const groupName = name.trim() || defaultGroupName(selectedContacts);
  return (
    <ContactPickerDialog
      contacts={targets}
      emptyText="没有可选择的群成员"
      groupName={name}
      keyword={keyword}
      mode="multi"
      pending={pending}
      selectedIds={selectedIds}
      selectedSummary={selectedContacts.map((item) => item.name).join(", ")}
      title="发起群聊"
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
          name: groupName,
          memberUserIds: Array.from(selectedIds),
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
  onSubmit: (contact: ContactPickerItem) => void;
  pending: boolean;
}) {
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
        aria-label="选择名片"
        onClick={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <h3>选择名片</h3>
            <p>选择一个联系人，确认后发送个人名片</p>
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
            placeholder="搜索联系人"
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
          {targets.length === 0 && <div className="panel-state muted">没有可发送的联系人名片</div>}
        </div>
        <footer className="message-start-footer message-card-confirm">
          <div className="message-card-confirm-preview">
            <UserRound size={16} />
            <span>{selected ? `发送 ${selected.name} 的名片` : "选择一张名片"}</span>
          </div>
          <button type="button" onClick={onClose}>取消</button>
          <button
            className="primary"
            type="button"
            disabled={pending || !selected}
            onClick={() => selected && onSubmit(selected)}
          >
            <Send size={15} />
            {pending ? "发送中..." : "发送"}
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
  mode,
  onClose,
  onGroupNameChange,
  onKeywordChange,
  onMultiSubmit,
  onMultiToggle,
  onSingleSubmit,
  pending,
  selectedIds,
  selectedSummary,
  title,
}: {
  contacts: ContactPickerItem[];
  emptyText: string;
  groupName?: string;
  keyword: string;
  mode: "single" | "multi";
  onClose: () => void;
  onGroupNameChange?: (value: string) => void;
  onKeywordChange: (value: string) => void;
  onMultiSubmit?: () => void;
  onMultiToggle?: (id: string) => void;
  onSingleSubmit?: (id: string) => void;
  pending: boolean;
  selectedIds?: Set<string>;
  selectedSummary?: string;
  title: string;
}) {
  const selectedCount = selectedIds?.size ?? 0;
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
            <p>{mode === "multi" ? "选择成员，确认后创建群聊" : "选择一个联系人，立即打开会话"}</p>
          </div>
          <button type="button" aria-label="关闭" onClick={onClose}>
            <X size={16} />
          </button>
        </header>
        <label className="e-search compact">
          <Search size={15} />
          <input
            value={keyword}
            onChange={(event) => onKeywordChange(event.target.value)}
            placeholder="搜索联系人"
            autoFocus
          />
        </label>
        {mode === "multi" && (
          <div className="message-group-fields">
            <input
              value={groupName}
              onChange={(event) => onGroupNameChange?.(event.target.value)}
              placeholder="群聊名称，不填则自动生成"
            />
            <small>{selectedSummary || "至少选择 2 个成员"}</small>
          </div>
        )}
        <div className="pc-forward-targets message-contact-targets">
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
            <button type="button" onClick={onClose}>取消</button>
            <button
              className="primary"
              type="button"
              disabled={pending || selectedCount < 2}
              onClick={() => onMultiSubmit?.()}
            >
              {pending ? "创建中..." : `创建(${selectedCount})`}
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

function defaultGroupName(items: ContactPickerItem[]) {
  return items.slice(0, 3).map((item) => item.name).join("、") || "新群聊";
}
