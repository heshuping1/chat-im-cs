import {
  AlertTriangle,
  Building2,
  Check,
  ClipboardList,
  Crown,
  MessageSquare,
  Search,
  ShieldCheck,
  UsersRound,
  UserCheck,
  UserPlus,
  UserRoundX,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CustomerInfoPanel } from "./CustomerInfoPanel";
import { PcAvatar } from "./PcAvatar";
import {
  type DepartmentDto,
  type DepartmentMemberDto,
  type FriendRequestDto,
} from "../data/api-client";
import {
  contactKindBadge,
  contactKindLabels,
  contactRowHint,
  contactRowSubtitle,
  filterContacts,
  filterRequests,
  mapContacts,
  requestStatusLabel,
  sourceLabel,
} from "../data/contact-directory";
import { pcQueryKeys } from "../data/query-keys";
import { requireApiClient } from "../data/runtime";
import { useWorkspaceStore } from "../data/store";
import type { ContactFilter, ContactItem } from "../data/types";
import { formatError, formatShortDate } from "../lib/format";

const filters: Array<{ key: ContactFilter; label: string }> = [
  { key: "customer", label: "客户" },
  { key: "organization", label: "组织架构" },
  { key: "staff", label: "员工" },
  { key: "group", label: "群聊" },
  { key: "requests", label: "申请" },
];

export function ContactsPage() {
  const session = useWorkspaceStore((state) => state.authSession);
  const activeContactId = useWorkspaceStore((state) => state.activeContactId);
  const setActiveContact = useWorkspaceStore((state) => state.setActiveContact);
  const contactFilter = useWorkspaceStore((state) => state.contactFilter);
  const setContactFilter = useWorkspaceStore((state) => state.setContactFilter);
  const setActiveConversation = useWorkspaceStore(
    (state) => state.setActiveImConversation,
  );
  const queryClient = useQueryClient();
  const [keyword, setKeyword] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedRequestId, setSelectedRequestId] = useState("");

  const friendsQuery = useQuery({
    queryKey: ["pc-friends", session?.apiBaseUrl, session?.tenantToken],
    enabled: Boolean(session),
    queryFn: async () => requireApiClient(session).getFriends(),
  });
  const requestsQuery = useQuery({
    queryKey: ["pc-friend-requests", session?.apiBaseUrl, session?.tenantToken],
    enabled: Boolean(session),
    queryFn: async () => requireApiClient(session).getFriendRequests(),
  });
  const membersQuery = useQuery({
    queryKey: ["pc-tenant-members", session?.apiBaseUrl, session?.tenantToken],
    enabled: Boolean(session),
    queryFn: async () => requireApiClient(session).getTenantMembers(),
  });
  const departmentsQuery = useQuery({
    queryKey: ["pc-departments", session?.apiBaseUrl, session?.tenantToken],
    enabled: Boolean(session),
    queryFn: async () => requireApiClient(session).getDepartments(),
  });
  const conversationsQuery = useQuery({
    queryKey: pcQueryKeys.imConversations(session?.apiBaseUrl, session?.tenantToken),
    enabled: Boolean(session),
    queryFn: async () => requireApiClient(session).getConversations({ limit: 100 }),
  });
  const departmentMembersQueries = useQuery({
    queryKey: [
      "pc-department-members-bundle",
      session?.apiBaseUrl,
      session?.tenantToken,
      departmentsQuery.data?.map((item) => item.departmentId).join(","),
    ],
    enabled: Boolean(session && departmentsQuery.data?.length),
    queryFn: async () => {
      const client = requireApiClient(session);
      const entries = await Promise.all(
        (departmentsQuery.data ?? []).map(async (department) => [
          department.departmentId,
          await client.getDepartmentMembers(department.departmentId).catch(
            () => [] as DepartmentMemberDto[],
          ),
        ] as const),
      );
      return Object.fromEntries(entries) as Record<string, DepartmentMemberDto[]>;
    },
  });
  const createDirectChatMutation = useMutation({
    mutationFn: async (peerUserId: string) =>
      requireApiClient(session).createDirectChat(peerUserId),
    onSuccess: (chat) => setActiveConversation(chat.chatId),
    onError: (error) => setNotice(`打开会话失败：${formatError(error)}`),
  });
  const requestMutation = useMutation({
    mutationFn: async ({
      requestId,
      action,
    }: {
      requestId: string;
      action: "accept" | "reject";
    }) => requireApiClient(session).handleFriendRequest(requestId, action),
    onSuccess: async (_result, variables) => {
      setNotice(variables.action === "accept" ? "已通过好友申请" : "已拒绝好友申请");
      await queryClient.invalidateQueries({ queryKey: ["pc-friend-requests"] });
      await queryClient.invalidateQueries({ queryKey: ["pc-friends"] });
    },
    onError: (error) => setNotice(`处理申请失败：${formatError(error)}`),
  });

  const directoryContacts = useMemo(
    () =>
      mapContacts({
        friends: friendsQuery.data ?? [],
        members: membersQuery.data ?? [],
        conversations: conversationsQuery.data?.items ?? [],
        departments: departmentsQuery.data ?? [],
        departmentMembersById: departmentMembersQueries.data ?? {},
        currentUserId: session?.userId,
      }),
    [
      conversationsQuery.data,
      departmentMembersQueries.data,
      departmentsQuery.data,
      friendsQuery.data,
      membersQuery.data,
      session?.userId,
    ],
  );

  const visibleContacts = useMemo(() => {
    if (contactFilter === "requests") return [];
    const base =
      contactFilter === "all"
        ? directoryContacts
        : contactFilter === "organization"
          ? directoryContacts.filter((item) => item.kind === "staff")
          : directoryContacts.filter((item) => item.kind === contactFilter);
    return filterContacts(base, keyword);
  }, [contactFilter, directoryContacts, keyword]);

  const visibleRequests = useMemo(
    () => filterRequests(requestsQuery.data ?? [], keyword),
    [keyword, requestsQuery.data],
  );

  const activeContact =
    visibleContacts.find((item) => item.id === activeContactId) ??
    visibleContacts[0] ??
    (contactFilter !== "requests"
      ? directoryContacts.find((item) => item.kind === "customer") ?? directoryContacts[0]
      : undefined);
  const activeRequest =
    visibleRequests.find((item) => item.requestId === selectedRequestId) ??
    visibleRequests[0];
  const effectiveFilter = filters.some((item) => item.key === contactFilter)
    ? contactFilter
    : "customer";
  const directoryError =
    friendsQuery.error ||
    membersQuery.error ||
    conversationsQuery.error ||
    departmentsQuery.error ||
    requestsQuery.error;
  const directoryLoading =
    friendsQuery.isLoading ||
    membersQuery.isLoading ||
    conversationsQuery.isLoading ||
    departmentsQuery.isLoading ||
    requestsQuery.isLoading;

  const openMessage = () => {
    if (!activeContact) return;
    if (activeContact.kind === "group" && activeContact.conversationId) {
      setActiveConversation(activeContact.conversationId);
      return;
    }
    if (activeContact.conversationId) {
      setActiveConversation(activeContact.conversationId);
      return;
    }
    if (activeContact.userId) {
      createDirectChatMutation.mutate(activeContact.userId);
    }
  };

  const showProfilePanel =
    activeContact && activeContact.kind === "customer";

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
            title="添加联系人接口未接入"
            disabled
          >
            <UserPlus size={17} />
          </button>
        </header>

        <label className="contacts-search">
          <Search size={16} />
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="搜索客户、员工、群聊、组织"
          />
        </label>

        <nav className="contacts-tabs" aria-label="通讯录筛选">
          {filters.map((item) => (
            <button
              className={effectiveFilter === item.key ? "selected" : ""}
              key={item.key}
              onClick={() => {
                setContactFilter(item.key);
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
              departments={departmentsQuery.data ?? []}
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
            request={activeRequest}
            pending={requestMutation.isPending}
            onAccept={(requestId) =>
              requestMutation.mutate({ requestId, action: "accept" })
            }
            onReject={(requestId) =>
              requestMutation.mutate({ requestId, action: "reject" })
            }
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
              <button className="primary" onClick={openMessage} type="button">
                <MessageSquare size={16} />
                {createDirectChatMutation.isPending
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
              {activeContact.kind !== "group" && (
                <button type="button" title="备注编辑接口未接入" disabled>
                  备注
                </button>
              )}
              {activeContact.kind === "group" ? (
                <button type="button" title="群成员管理接口未接入" disabled>
                  群成员
                </button>
              ) : (
                <button type="button" title="历史会话接口未接入" disabled>
                  历史会话
                </button>
              )}
            </div>

            <ContactDetailContent contact={activeContact} />
          </>
        ) : (
          <div className="contacts-empty-detail">
            <h2>暂无通讯录数据</h2>
            <p>请选择客户、员工、群聊或申请查看详情。</p>
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
        <strong>{contact.name}</strong>
        {roleOnly && <em>{contact.roleLabel || "员工"}</em>}
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
  request,
  pending,
  onAccept,
  onReject,
}: {
  request?: FriendRequestDto;
  pending: boolean;
  onAccept: (requestId: string) => void;
  onReject: (requestId: string) => void;
}) {
  if (!request) {
    return (
      <div className="contacts-empty-detail">
        <h2>暂无好友申请</h2>
        <p>新的好友申请会在这里处理，不进入在线客服临时会话。</p>
      </div>
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
    </>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="contacts-info-card">
      <span>{label}</span>
      <strong>{value || "--"}</strong>
    </div>
  );
}

function ContactDetailContent({ contact }: { contact: ContactItem }) {
  if (contact.kind === "customer") return <CustomerContactDetail contact={contact} />;
  if (contact.kind === "staff") return <StaffContactDetail contact={contact} />;
  if (contact.kind === "group") return <GroupContactDetail contact={contact} />;
  return <FriendContactDetail contact={contact} />;
}

function CustomerContactDetail({ contact }: { contact: ContactItem }) {
  return (
    <>
      <div className="contacts-info-grid">
        <InfoCard label="客户分组" value={contact.groupName || "--"} />
        <InfoCard label="客户来源" value={contact.source || "客户通讯录"} />
        <InfoCard label="添加时间" value={formatShortDate(contact.createdAt)} />
        <InfoCard label="关联会话" value={contact.conversationId ? "已建立" : "未建立"} />
      </div>
      <section className="contacts-section-card">
        <h3>
          <ShieldCheck size={16} />
          客户标签
        </h3>
        <ContactTags tags={contact.tags} />
      </section>
      <section className="contacts-section-card">
        <h3>
          <ClipboardList size={16} />
          客户关系
        </h3>
        <div className="contacts-mini-rows">
          <InfoLine label="关系类型" value="客户好友" />
          <InfoLine label="备注" value={contact.remark || "--"} />
          <InfoLine label="用户 ID" value={contact.userId || "--"} />
        </div>
      </section>
    </>
  );
}

function FriendContactDetail({ contact }: { contact: ContactItem }) {
  return (
    <>
      <div className="contacts-info-grid">
        <InfoCard label="好友分组" value={contact.groupName || "--"} />
        <InfoCard label="来源" value={contact.source || "好友通讯录"} />
        <InfoCard label="添加时间" value={formatShortDate(contact.createdAt)} />
        <InfoCard label="关联会话" value={contact.conversationId ? "已建立" : "未建立"} />
      </div>
      <section className="contacts-section-card">
        <h3>
          <ShieldCheck size={16} />
          好友标签
        </h3>
        <ContactTags tags={contact.tags} />
      </section>
    </>
  );
}

function StaffContactDetail({ contact }: { contact: ContactItem }) {
  return (
    <>
      <div className="contacts-info-grid">
        <InfoCard label="员工角色" value={contact.roleLabel || "--"} />
        <InfoCard label="所属部门" value={contact.departmentName || "--"} />
        <InfoCard label="职位" value={contact.position || "--"} />
        <InfoCard label="加入时间" value={formatShortDate(contact.joinedAt)} />
      </div>
      <section className="contacts-section-card">
        <h3>
          <Building2 size={16} />
          组织信息
        </h3>
        <div className="contacts-mini-rows">
          <InfoLine label="组织路径" value={contact.departmentName || "企业成员"} />
          <InfoLine label="用户 ID" value={contact.userId || "--"} />
          <InfoLine label="关联会话" value={contact.conversationId ? "已建立" : "未建立"} />
        </div>
      </section>
      <section className="contacts-section-card">
        <h3>
          <Crown size={16} />
          权限身份
        </h3>
        <ContactTags tags={contact.tags} />
      </section>
    </>
  );
}

function GroupContactDetail({ contact }: { contact: ContactItem }) {
  return (
    <>
      <div className="contacts-info-grid">
        <InfoCard label="成员数" value={contact.members ? `${contact.members} 人` : "--"} />
        <InfoCard label="提醒状态" value={contact.muted ? "免打扰" : "正常提醒"} />
        <InfoCard label="最近消息" value={contact.lastMessagePreview || "--"} />
        <InfoCard label="最后时间" value={formatShortDate(contact.lastMessageAt)} />
      </div>
      <section className="contacts-section-card">
        <h3>
          <UsersRound size={16} />
          群聊信息
        </h3>
        <div className="contacts-mini-rows">
          <InfoLine label="群类型" value={contact.source || "普通群聊"} />
          <InfoLine label="会话 ID" value={contact.conversationId || "--"} />
          <InfoLine label="备注" value={contact.remark || "--"} />
        </div>
      </section>
      <section className="contacts-section-card">
        <h3>
          <ShieldCheck size={16} />
          群标签
        </h3>
        <ContactTags tags={contact.tags} />
      </section>
    </>
  );
}

function ContactTags({ tags }: { tags: string[] }) {
  return (
    <div className="contacts-tag-row">
      {tags.length > 0 ? tags.map((tag) => <span key={tag}>{tag}</span>) : <em>暂无标签</em>}
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value || "--"}</strong>
    </div>
  );
}

function ContactSidePanel({
  filter,
  contact,
}: {
  filter: ContactFilter;
  contact?: ContactItem;
}) {
  if (contact?.kind === "staff") {
    return (
      <aside className="contacts-profile-panel contacts-side-empty">
        <h2>员工资料</h2>
        <p>员工只展示组织、职位、角色和会话入口，不展示客户画像。</p>
        <div className="contacts-mini-rows">
          <InfoLine label="姓名" value={contact.name} />
          <InfoLine label="角色" value={contact.roleLabel || "--"} />
          <InfoLine label="部门" value={contact.departmentName || "--"} />
        </div>
      </aside>
    );
  }
  if (contact?.kind === "group") {
    return (
      <aside className="contacts-profile-panel contacts-side-empty">
        <h2>群聊资料</h2>
        <p>群聊展示成员、提醒和最近消息；成员管理、群公告、群文件等待群详情接口接入。</p>
        <div className="contacts-mini-rows">
          <InfoLine label="群名" value={contact.name} />
          <InfoLine label="成员数" value={contact.members ? `${contact.members} 人` : "--"} />
          <InfoLine label="提醒" value={contact.muted ? "免打扰" : "正常提醒"} />
        </div>
      </aside>
    );
  }
  return (
    <aside className="contacts-profile-panel contacts-side-empty">
      <h2>{filter === "requests" ? "申请说明" : "资料"}</h2>
      <p>
        {filter === "requests"
          ? "好友申请支持通过或拒绝，处理后会刷新申请列表。"
          : "请选择联系人查看资料。"}
      </p>
    </aside>
  );
}

function PanelState({
  text,
  tone = "muted",
}: {
  text: string;
  tone?: "muted" | "error";
}) {
  return (
    <div className={`panel-state ${tone}`}>
      {tone === "error" && <AlertTriangle size={15} />}
      <span>{text}</span>
    </div>
  );
}
