import {
  Ban,
  Building2,
  MessageSquare,
  Search,
  Trash2,
  UserCheck,
  UserPlus,
  UserRoundX,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { CustomerInfoPanel } from "./CustomerInfoPanel";
import { ContactSidePanel } from "./ContactSidePanel";
import { ContactDetailContent } from "./ContactDetailViews";
import { ContactsInviteQrCard } from "./ContactsInviteQrCard";
import { PanelState } from "./PanelState";
import { PcAvatar } from "./PcAvatar";
import {
  type DepartmentDto,
  type FriendInviteQrDto,
  type FriendRequestDto,
} from "../data/api-client";
import {
  contactKindBadge,
  contactRowHint,
  contactRowSubtitle,
  normalizeContactDirectoryFilter,
  requestStatusLabel,
} from "../data/contact-directory";
import type { ContactFilter, ContactItem } from "../data/types";
import {
  useActiveContactId,
  useContactFilter,
  useSetActiveContact,
  useSetContactFilter,
} from "../data/workspace-ui/workspace-ui-store";
import { useContactsDirectoryController } from "../contacts/hooks/useContactsDirectoryController";
import { formatError, formatShortDate } from "../lib/format";
import { requestMessageDangerConfirmation } from "../messages/runtime/messageConfirm";

const filters: Array<{ key: ContactFilter; label: string }> = [
  { key: "customer", label: "客户" },
  { key: "friend", label: "好友" },
  { key: "organization", label: "组织" },
  { key: "group", label: "群聊" },
  { key: "requests", label: "申请" },
];

export function ContactsPage() {
  const activeContactId = useActiveContactId();
  const setActiveContact = useSetActiveContact();
  const contactFilter = useContactFilter();
  const setContactFilter = useSetContactFilter();
  const [keyword, setKeyword] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedRequestId, setSelectedRequestId] = useState("");
  const {
    activeRequest,
    blockContact,
    createDirectChatPending,
    createInviteQrPending,
    deleteFriend,
    departments,
    directoryContacts,
    directoryError,
    directoryLoading,
    handleRequest,
    inviteQrError,
    inviteQrLoading,
    inviteQrs,
    openMessage,
    onCreateInviteQr,
    relationshipActionPending,
    requestPending,
    visibleContacts,
    visibleRequests,
  } = useContactsDirectoryController({
    contactFilter,
    keyword,
    selectedRequestId,
    setNotice,
  });

  const effectiveFilter = filters.some(
    (item) => item.key === normalizeContactDirectoryFilter(contactFilter),
  )
    ? normalizeContactDirectoryFilter(contactFilter)
    : "customer";
  const activeContact =
    visibleContacts.find((item) => item.id === activeContactId) ??
    visibleContacts[0] ??
    (effectiveFilter !== "requests"
      ? directoryContacts.find((item) => item.kind === "customer") ?? directoryContacts[0]
      : undefined);

  const showProfilePanel =
    activeContact && activeContact.kind === "customer";
  const relationshipActionsAvailable =
    activeContact?.kind === "customer" || activeContact?.kind === "friend";

  const handleAddContact = () => {
    setContactFilter("requests");
    setSelectedRequestId("");
    setNotice("添加联系人可通过好友二维码、名片或收到的好友申请完成；申请会在这里集中处理。");
  };

  const onDeleteFriend = (contact: ContactItem) => {
    if (!contact.userId) {
      setNotice("当前联系人缺少用户 ID，无法删除好友。");
      return;
    }
    if (!requestMessageDangerConfirmation({ action: "delete-friend" })) return;
    deleteFriend(contact);
  };

  const onBlockContact = (contact: ContactItem) => {
    if (!contact.userId) {
      setNotice("当前联系人缺少用户 ID，无法加入黑名单。");
      return;
    }
    if (!requestMessageDangerConfirmation({ action: "block-user" })) return;
    blockContact(contact);
  };

  return (
    <main className="contacts-page contacts-b-layout">
      <section className="contacts-list-panel">
        <header className="contacts-b-head">
          <div>
            <span>CONTACTS</span>
            <h1>通讯录</h1>
          </div>
          <button
            className="contacts-icon-button"
            type="button"
            aria-label="添加联系人"
            title="添加好友与处理申请"
            onClick={handleAddContact}
          >
            <UserPlus size={17} />
          </button>
        </header>

        <label className="contacts-search">
          <Search size={16} />
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="搜索客户、好友、组织、群聊"
          />
        </label>

        <nav className="contacts-tabs" aria-label="通讯录筛选">
          {filters.map((item) => (
            <button
              className={effectiveFilter === item.key ? "selected" : ""}
              key={item.key}
              onClick={() => {
                setContactFilter(item.key);
                setSelectedRequestId("");
                setNotice(null);
              }}
              type="button"
            >
              {item.label}
              {item.key === "requests" && visibleRequests.length > 0 && (
                <em>{visibleRequests.length}</em>
              )}
            </button>
          ))}
        </nav>

        {notice && <PanelState text={notice} />}
        {directoryLoading && <PanelState text="正在加载通讯录..." />}
        {directoryError && (
          <PanelState
            tone="error"
            text={`通讯录接口失败：${formatError(directoryError)}`}
          />
        )}

        <div className="contacts-list" aria-label="通讯录列表">
          {effectiveFilter === "organization" ? (
            <OrganizationList
              departments={departments}
              contacts={visibleContacts}
              activeContactId={activeContact?.id}
              onSelect={setActiveContact}
            />
          ) : effectiveFilter === "requests" ? (
            <RequestList
              requests={visibleRequests}
              selectedRequestId={activeRequest?.requestId}
              onSelect={setSelectedRequestId}
            />
          ) : (
            visibleContacts.map((contact) => (
              <ContactRow
                contact={contact}
                key={contact.id}
                active={activeContact?.id === contact.id}
                onClick={() => setActiveContact(contact.id)}
              />
            ))
          )}
          {effectiveFilter !== "requests" && visibleContacts.length === 0 && (
            <PanelState text="暂无通讯录数据" />
          )}
          {effectiveFilter === "requests" && visibleRequests.length === 0 && (
            <PanelState text="暂无好友申请" />
          )}
        </div>
      </section>

      <section className="contacts-detail-panel">
        {effectiveFilter === "requests" ? (
          <RequestDetail
            creatingInviteQr={createInviteQrPending}
            inviteQrError={inviteQrError}
            inviteQrLoading={inviteQrLoading}
            inviteQrs={inviteQrs}
            request={activeRequest}
            pending={requestPending}
            onAccept={(requestId) => handleRequest(requestId, "accept")}
            onCreateInviteQr={onCreateInviteQr}
            onReject={(requestId) => handleRequest(requestId, "reject")}
          />
        ) : activeContact ? (
          <>
            <div className="contacts-detail-head">
              <ContactAvatar contact={activeContact} large />
              <div>
                <h2>{activeContact.name}</h2>
                <p>{activeContact.subtitle}</p>
              </div>
            </div>

            <div className="contacts-actions">
              <button className="primary" onClick={() => openMessage(activeContact)} type="button">
                <MessageSquare size={16} />
                {createDirectChatPending
                  ? "打开中..."
                  : activeContact.kind === "group"
                    ? "进入群聊"
                    : "发消息"}
              </button>
              {activeContact.kind === "customer" && (
                <button type="button" onClick={() => setNotice("右侧已展示当前客户资料")}>
                  客户画像
                </button>
              )}
              {relationshipActionsAvailable && (
                <button
                  className="danger-subtle"
                  disabled={relationshipActionPending}
                  onClick={() => onDeleteFriend(activeContact)}
                  type="button"
                >
                  <Trash2 size={15} />
                  删除好友
                </button>
              )}
              {relationshipActionsAvailable && (
                <button
                  className="danger-subtle"
                  disabled={relationshipActionPending}
                  onClick={() => onBlockContact(activeContact)}
                  type="button"
                >
                  <Ban size={15} />
                  加入黑名单
                </button>
              )}
            </div>

            <ContactDetailContent contact={activeContact} />
          </>
        ) : (
          <div className="contacts-empty-detail">
            <h2>暂无通讯录数据</h2>
            <p>请选择客户、好友、组织成员、群聊或申请查看详情。</p>
          </div>
        )}
      </section>

      {showProfilePanel ? (
        <CustomerInfoPanel
          className="contacts-profile-panel"
          contact={activeContact}
        />
      ) : (
        <ContactSidePanel filter={effectiveFilter} contact={activeContact} />
      )}
    </main>
  );
}

function ContactRow({
  contact,
  active,
  compact = false,
  onClick,
}: {
  contact: ContactItem;
  active: boolean;
  compact?: boolean;
  onClick: () => void;
}) {
  const roleOnly = contact.kind === "staff";
  const nameOnly = compact || contact.kind === "customer" || roleOnly;
  return (
    <button
      className={`contacts-row ${nameOnly ? "name-only" : ""} ${roleOnly ? "role-only" : ""} ${active ? "active" : ""}`}
      onClick={onClick}
      type="button"
    >
      <ContactAvatar contact={contact} />
      <span className="contacts-row-copy">
        <span className="contacts-name-line">
          <strong>{contact.name}</strong>
          {roleOnly && (
            <span className="contacts-role-chip">{contact.roleLabel || "成员"}</span>
          )}
        </span>
        {roleOnly && <em>{contactRowSubtitle(contact)}</em>}
        {!nameOnly && (
          <>
            <em>{contactRowSubtitle(contact)}</em>
            <small>{contactRowHint(contact)}</small>
          </>
        )}
      </span>
      {!nameOnly && (
        <span className="contacts-kind">{contactKindBadge(contact)}</span>
      )}
    </button>
  );
}

function ContactAvatar({
  contact,
  large = false,
}: {
  contact: ContactItem;
  large?: boolean;
}) {
  return (
    <PcAvatar
      avatarUrl={contact.avatarUrl}
      className={`contacts-avatar ${contact.kind} ${large ? "large" : ""}`}
      iconSize={large ? 27 : 17}
      kind={contact.kind === "group" ? "group" : "person"}
      name={contact.name}
    />
  );
}

function OrganizationList({
  departments,
  contacts,
  activeContactId,
  onSelect,
}: {
  departments: DepartmentDto[];
  contacts: ContactItem[];
  activeContactId?: string;
  onSelect: (id: string) => void;
}) {
  const { contactsByDepartmentId, contactsWithoutDepartment } = useMemo(() => {
    const grouped = new Map<string, ContactItem[]>();
    const withoutDepartment: ContactItem[] = [];
    for (const contact of contacts) {
      if (!contact.departmentId) {
        withoutDepartment.push(contact);
        continue;
      }
      const group = grouped.get(contact.departmentId);
      if (group) {
        group.push(contact);
      } else {
        grouped.set(contact.departmentId, [contact]);
      }
    }
    return {
      contactsByDepartmentId: grouped,
      contactsWithoutDepartment: withoutDepartment,
    };
  }, [contacts]);

  if (departments.length === 0) {
    return contacts.map((contact) => (
      <ContactRow
        active={activeContactId === contact.id}
        compact
        contact={contact}
        key={contact.id}
        onClick={() => onSelect(contact.id)}
      />
    ));
  }
  return (
    <>
      {departments.map((department) => {
        const departmentContacts =
          contactsByDepartmentId.get(department.departmentId) ?? [];
        return (
          <section className="org-section" key={department.departmentId}>
            <div className="org-section-head">
              <Building2 size={15} />
              <strong>{department.departmentName}</strong>
              <em>{department.memberCount ?? departmentContacts.length} 人</em>
            </div>
            {departmentContacts.length > 0 ? (
              departmentContacts.map((contact) => (
                <ContactRow
                  active={activeContactId === contact.id}
                  compact
                  contact={contact}
                  key={contact.id}
                  onClick={() => onSelect(contact.id)}
                />
              ))
            ) : (
              <PanelState text="暂无成员" />
            )}
          </section>
        );
      })}
      {contactsWithoutDepartment.map((contact) => (
        <ContactRow
          active={activeContactId === contact.id}
          compact
          contact={contact}
          key={contact.id}
          onClick={() => onSelect(contact.id)}
        />
      ))}
    </>
  );
}

function RequestList({
  requests,
  selectedRequestId,
  onSelect,
}: {
  requests: FriendRequestDto[];
  selectedRequestId?: string;
  onSelect: (id: string) => void;
}) {
  return (
    <>
      {requests.map((request) => (
        <button
          className={`contacts-row request ${selectedRequestId === request.requestId ? "active" : ""}`}
          key={request.requestId}
          onClick={() => onSelect(request.requestId)}
          type="button"
        >
          <PcAvatar
            avatarUrl={request.fromAvatarUrl}
            className="contacts-avatar friend"
            name={request.fromDisplayName || "好友申请"}
          />
          <span className="contacts-row-copy">
            <strong>{request.fromDisplayName || "好友申请"}</strong>
            <em>{request.message || "请求添加你为好友"}</em>
          </span>
          <span className="contacts-kind">{requestStatusLabel(request.status)}</span>
        </button>
      ))}
    </>
  );
}

function RequestDetail({
  creatingInviteQr,
  inviteQrError,
  inviteQrLoading,
  inviteQrs,
  request,
  pending,
  onAccept,
  onCreateInviteQr,
  onReject,
}: {
  creatingInviteQr: boolean;
  inviteQrError: unknown;
  inviteQrLoading: boolean;
  inviteQrs: FriendInviteQrDto[];
  request?: FriendRequestDto;
  pending: boolean;
  onAccept: (requestId: string) => void;
  onCreateInviteQr: () => void;
  onReject: (requestId: string) => void;
}) {
  if (!request) {
    return (
      <>
        <div className="contacts-empty-detail">
          <h2>暂无好友申请</h2>
          <p>新的好友申请会在这里处理，不进入在线客服临时会话。</p>
        </div>
        <ContactsInviteQrCard
          creating={creatingInviteQr}
          error={inviteQrError}
          loading={inviteQrLoading}
          qrs={inviteQrs}
          onCreate={onCreateInviteQr}
        />
      </>
    );
  }
  return (
    <>
      <div className="contacts-detail-head">
        <PcAvatar
          avatarUrl={request.fromAvatarUrl}
          className="contacts-avatar friend large"
          name={request.fromDisplayName || "好友申请"}
        />
        <div>
          <h2>{request.fromDisplayName || "好友申请"}</h2>
          <p>{formatShortDate(request.createdAt)} · {requestStatusLabel(request.status)}</p>
        </div>
      </div>
      <div className="contacts-actions">
        <button
          className="primary"
          disabled={pending || request.status !== "pending"}
          onClick={() => onAccept(request.requestId)}
          type="button"
        >
          <UserCheck size={16} />
          通过
        </button>
        <button
          disabled={pending || request.status !== "pending"}
          onClick={() => onReject(request.requestId)}
          type="button"
        >
          <UserRoundX size={16} />
          拒绝
        </button>
      </div>
      <section className="contacts-section-card">
        <h3>
          <MessageSquare size={16} />
          验证信息
        </h3>
        <p className="contacts-request-message">
          {request.message || "对方没有填写验证信息。"}
        </p>
      </section>
      <section className="contacts-section-card">
        <h3>
          <X size={16} />
          处理规则
        </h3>
        <div className="contacts-mini-rows">
          <div>
            <span>申请人</span>
            <strong>{request.fromUserId || "--"}</strong>
          </div>
          <div>
            <span>接收人</span>
            <strong>{request.toDisplayName || request.toUserId || "--"}</strong>
          </div>
        </div>
      </section>
      <ContactsInviteQrCard
        creating={creatingInviteQr}
        error={inviteQrError}
        loading={inviteQrLoading}
        qrs={inviteQrs}
        onCreate={onCreateInviteQr}
      />
    </>
  );
}
