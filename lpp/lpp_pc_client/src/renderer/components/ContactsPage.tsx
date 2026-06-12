import {
  Ban,
  Building2,
  MessageSquare,
  Search,
  Trash2,
  UserCheck,
  UserPlus,
  UserRoundX,
  UsersRound,
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
  type FriendInviteQrDto,
  type FriendRequestDto,
} from "../data/api-client";
import {
  type ContactDirectoryEntry,
  type ContactDirectoryViewMode,
  createContactDirectoryEntries,
  groupOrganizationContactsByRole,
} from "../data/contact-directory";
import type { ContactFilter, ContactItem } from "../data/types";
import {
  useActiveModule,
  useActiveContactId,
  useContactFilter,
  useSetActiveContact,
  useSetContactFilter,
} from "../data/workspace-ui/workspace-ui-store";
import {
  createContactMessageOpenTrace,
  recordContactMessageOpenDiagnostic,
} from "../data/diagnostics/contact-message-open-diagnostics";
import { useContactsDirectoryController } from "../contacts/hooks/useContactsDirectoryController";
import type { TranslationParams } from "../i18n/dictionary";
import { useI18n } from "../i18n/useI18n";
import { formatError, formatShortDate } from "../lib/format";
import {
  messageDangerConfirmationDescriptor,
  requestMessageDangerConfirmation,
  type MessageDangerConfirmAction,
} from "../messages/runtime/messageConfirm";

type Translate = (key: string, params?: TranslationParams) => string;

const ROLE_LABEL = {
  admin: "contacts.page.role.admin",
  customerService: "contacts.page.role.customerService",
  member: "contacts.page.role.member",
  owner: "contacts.page.role.owner",
  technicalSupport: "contacts.page.role.technicalSupport",
} as const;

export function ContactsPage() {
  const { t } = useI18n();
  const activeModule = useActiveModule();
  const activeContactId = useActiveContactId();
  const setActiveContact = useSetActiveContact();
  const contactFilter = useContactFilter();
  const setContactFilter = useSetContactFilter();
  const [keyword, setKeyword] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedRequestId, setSelectedRequestId] = useState("");
  const {
    activeContact,
    activeContactDetail,
    activeRequest,
    blockContact,
    contactAccess,
    createDirectChatPending,
    createInviteQrPending,
    deleteFriend,
    directoryContacts,
    directoryError,
    directoryLoading,
    directoryViewMode,
    effectiveContactFilter,
    handleRequest,
    inviteQrError,
    inviteQrLoading,
    inviteQrs,
    openMessage,
    onCreateInviteQr,
    relationshipActionPending,
    requestListError,
    requestCount,
    requestPending,
    visibleContacts,
    visibleRequests,
  } = useContactsDirectoryController({
    activeContactId,
    contactFilter,
    keyword,
    selectedRequestId,
    setNotice,
  });

  const directoryEntries = useMemo(
    () =>
      createContactDirectoryEntries({
        contacts: directoryContacts,
        requestCount,
        viewMode: directoryViewMode,
        canReadOrganization: contactAccess.canReadOrganization,
      }),
    [
      contactAccess.canReadOrganization,
      directoryContacts,
      directoryViewMode,
      requestCount,
    ],
  );
  const effectiveFilter = effectiveContactFilter;
  const searchPlaceholder = translateContactSearchPlaceholder({
    viewMode: directoryViewMode,
    canReadOrganization: contactAccess.canReadOrganization,
    t,
  });
  const translatedDirectoryEntries = useMemo(
    () => ({
      fixed: directoryEntries.fixed.map((entry) => translateDirectoryEntry(entry, t)),
      shortcuts: directoryEntries.shortcuts.map((entry) => translateDirectoryEntry(entry, t)),
    }),
    [directoryEntries.fixed, directoryEntries.shortcuts, t],
  );
  const showProfilePanel =
    directoryViewMode === "staff" &&
    activeContactDetail &&
    activeContactDetail.kind === "customer";
  const relationshipActionsAvailable =
    activeContactDetail?.kind === "customer" || activeContactDetail?.kind === "friend";

  const handleAddContact = () => {
    setContactFilter("requests");
    setSelectedRequestId("");
    setNotice(t("contacts.page.notice.addContact"));
  };

  const onDeleteFriend = async (contact: ContactItem) => {
    if (!contact.userId) {
      setNotice(t("contacts.page.notice.missingUserDelete"));
      return;
    }
    if (!(await confirmMessageDanger("delete-friend", t))) return;
    deleteFriend(contact);
  };

  const onBlockContact = async (contact: ContactItem) => {
    if (!contact.userId) {
      setNotice(t("contacts.page.notice.missingUserBlock"));
      return;
    }
    if (!(await confirmMessageDanger("block-user", t))) return;
    blockContact(contact);
  };

  const onOpenMessage = (contact: ContactItem) => {
    const trace = createContactMessageOpenTrace(contact.id);
    recordContactMessageOpenDiagnostic(
      "contacts.message-click",
      {
        activeModule,
        contactId: contact.id,
        contactKind: contact.kind,
        conversationId: contact.conversationId,
        createDirectChatPending,
        hasConversationId: Boolean(contact.conversationId),
        hasUserId: Boolean(contact.userId),
        userId: contact.userId,
      },
      trace,
    );
    openMessage(contact, trace);
  };

  return (
    <main className="contacts-page contacts-b-layout">
      <section className="contacts-list-panel">
        <header className="contacts-b-head">
          <div>
            <span>CONTACTS</span>
            <h1>{t("contacts.page.title")}</h1>
          </div>
          <button
            className="contacts-icon-button"
            type="button"
            aria-label={t("contacts.page.addContact")}
            title={t("contacts.page.addContactTitle")}
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
            placeholder={searchPlaceholder}
          />
        </label>

        <nav className="contacts-entry-list" aria-label={t("contacts.page.entryAria")}>
          {[...translatedDirectoryEntries.fixed, ...translatedDirectoryEntries.shortcuts].map((entry) => (
            <ContactEntryButton
              active={effectiveFilter === entry.key}
              entry={entry}
              key={entry.key}
              onClick={() => {
                setContactFilter(entry.key);
                setSelectedRequestId("");
                setNotice(null);
              }}
            />
          ))}
        </nav>

        {notice && <PanelState text={notice} />}
        {directoryLoading && <PanelState text={t("contacts.page.loading")} />}
        {directoryError && (
          <PanelState
            tone="error"
            text={t("contacts.page.directoryError", { error: formatError(directoryError) })}
          />
        )}
        {effectiveFilter === "requests" && requestListError && (
          <PanelState
            tone="error"
            text={t("contacts.page.requestError", { error: formatError(requestListError) })}
          />
        )}

        <div className="contacts-list" aria-label={t("contacts.page.listAria")}>
          {effectiveFilter === "organization" ? (
            <OrganizationList
              contacts={visibleContacts}
              activeContactId={activeContact?.id}
              onSelect={setActiveContact}
              t={t}
            />
          ) : effectiveFilter === "requests" ? (
            <RequestList
              requests={visibleRequests}
              selectedRequestId={activeRequest?.requestId}
              onSelect={setSelectedRequestId}
              t={t}
            />
          ) : (
            visibleContacts.map((contact) => (
              <ContactRow
                contact={contact}
                key={contact.id}
                active={activeContact?.id === contact.id}
                onClick={() => setActiveContact(contact.id)}
                t={t}
              />
            ))
          )}
          {effectiveFilter !== "requests" && visibleContacts.length === 0 && (
            <PanelState text={translateContactEmptyText(effectiveFilter, directoryViewMode, t)} />
          )}
          {effectiveFilter === "requests" &&
            !requestListError &&
            visibleRequests.length === 0 && (
            <PanelState text={translateContactEmptyText(effectiveFilter, directoryViewMode, t)} />
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
            t={t}
          />
        ) : activeContactDetail ? (
          <>
            <div className="contacts-detail-head">
              <ContactAvatar contact={activeContactDetail} large />
              <div>
                <h2>{activeContactDetail.name}</h2>
                <p>{activeContactDetail.subtitle}</p>
              </div>
            </div>

            <div className="contacts-actions">
              <button className="primary" onClick={() => onOpenMessage(activeContactDetail)} type="button">
                <MessageSquare size={16} />
                {createDirectChatPending
                  ? t("contacts.page.action.opening")
                  : activeContactDetail.kind === "group"
                    ? t("contacts.page.action.openGroup")
                    : t("contacts.page.action.message")}
              </button>
              {activeContactDetail.kind === "customer" && (
                <button type="button" onClick={() => setNotice(t("contacts.page.notice.profileShown"))}>
                  {t("contacts.page.action.customerProfile")}
                </button>
              )}
              {relationshipActionsAvailable && (
                <button
                  className="danger-subtle"
                  disabled={relationshipActionPending}
                  onClick={() => onDeleteFriend(activeContactDetail)}
                  type="button"
                >
                  <Trash2 size={15} />
                  {t("contacts.page.action.deleteFriend")}
                </button>
              )}
              {relationshipActionsAvailable && (
                <button
                  className="danger-subtle"
                  disabled={relationshipActionPending}
                  onClick={() => onBlockContact(activeContactDetail)}
                  type="button"
                >
                  <Ban size={15} />
                  {t("contacts.page.action.blockUser")}
                </button>
              )}
            </div>

            <ContactDetailContent contact={activeContactDetail} />
          </>
        ) : (
          <div className="contacts-empty-detail">
            <h2>{t("contacts.page.emptyDetailTitle")}</h2>
            <p>{t("contacts.page.emptyDetailText")}</p>
          </div>
        )}
      </section>

      {showProfilePanel ? (
        <CustomerInfoPanel
          className="contacts-profile-panel"
          contact={activeContactDetail}
        />
      ) : (
        <ContactSidePanel filter={effectiveFilter} contact={activeContactDetail} />
      )}
    </main>
  );
}

function ContactEntryButton({
  active,
  entry,
  onClick,
}: {
  active: boolean;
  entry: ContactDirectoryEntry;
  onClick: () => void;
}) {
  const Icon = contactEntryIcon(entry.key);
  const shouldShowCount = entry.key !== "requests" || Boolean(entry.count);
  return (
    <button
      className={`contacts-entry ${entry.kind} ${active ? "active" : ""}`}
      onClick={onClick}
      type="button"
    >
      <span className="contacts-entry-icon">
        <Icon size={18} />
      </span>
      <strong>{entry.label}</strong>
      {shouldShowCount && <em>{entry.count ?? 0}</em>}
    </button>
  );
}

function contactEntryIcon(key: ContactFilter) {
  if (key === "requests") return UserCheck;
  if (key === "customer" || key === "organization") return Building2;
  if (key === "group") return MessageSquare;
  return UsersRound;
}

function translateDirectoryEntry(
  entry: ContactDirectoryEntry,
  t: Translate,
): ContactDirectoryEntry {
  return {
    ...entry,
    label: entry.label.startsWith("contacts.") ? t(entry.label) : t(`contacts.page.entry.${entry.key}`),
  };
}

function translateContactSearchPlaceholder({
  viewMode,
  canReadOrganization,
  t,
}: {
  viewMode: ContactDirectoryViewMode;
  canReadOrganization: boolean;
  t: Translate;
}) {
  if (viewMode === "customer") return t("contacts.page.search.customerMode");
  return canReadOrganization
    ? t("contacts.page.search.staffWithOrganization")
    : t("contacts.page.search.staffBasic");
}

function translateContactEmptyText(
  filter: ContactFilter,
  viewMode: ContactDirectoryViewMode,
  t: Translate,
) {
  if (filter === "requests") return t("contacts.page.empty.requests");
  if (viewMode === "customer") {
    if (filter === "friend") return t("contacts.page.empty.customerFriend");
    if (filter === "group") return t("contacts.page.empty.customerGroup");
    return t("contacts.page.empty.customerAll");
  }
  if (filter === "customer") return t("contacts.page.empty.customer");
  if (filter === "organization") return t("contacts.page.empty.organization");
  if (filter === "group") return t("contacts.page.empty.group");
  if (filter === "friend") return t("contacts.page.empty.friend");
  return t("contacts.page.empty.all");
}

function translateRequestStatus(status: string | undefined, t: Translate) {
  if (status === "accepted") return t("contacts.page.requestStatus.accepted");
  if (status === "rejected") return t("contacts.page.requestStatus.rejected");
  return t("contacts.page.requestStatus.pending");
}

function confirmMessageDanger(
  action: MessageDangerConfirmAction,
  t: Translate,
  count?: number,
) {
  const descriptor = messageDangerConfirmationDescriptor(action, count);
  return requestMessageDangerConfirmation({
    action,
    count,
    message: t(descriptor.key, descriptor.params),
  });
}

function translateRoleLabel(label: string | undefined, t: Translate) {
  if (label?.startsWith("contacts.")) return t(label);
  if (label === ROLE_LABEL.owner) return t("contacts.page.role.owner");
  if (label === ROLE_LABEL.admin) return t("contacts.page.role.admin");
  if (label === ROLE_LABEL.customerService) return t("contacts.page.role.customerService");
  if (label === ROLE_LABEL.technicalSupport) return t("contacts.page.role.technicalSupport");
  if (label === ROLE_LABEL.member || !label) return t("contacts.page.role.member");
  return label;
}

function translateContactValue(value: string | undefined | null, t: Translate) {
  if (!value) return value || "";
  if (value.startsWith("contacts.page.addedAt:")) {
    return t("contacts.page.addedAt", { time: value.slice("contacts.page.addedAt:".length) });
  }
  if (value.startsWith("contacts.page.groupMemberBadge:")) {
    return t("contacts.page.groupMemberBadge", { count: value.slice("contacts.page.groupMemberBadge:".length) });
  }
  return value.startsWith("contacts.") ? t(value) : value;
}

function contactKindLabel(contact: ContactItem, t: Translate) {
  if (contact.kind === "customer") return t("contacts.page.kind.customer");
  if (contact.kind === "friend") return t("contacts.page.kind.friend");
  if (contact.kind === "group") return t("contacts.page.kind.group");
  return t("contacts.page.kind.staff");
}

function contactRowSubtitleText(contact: ContactItem, t: Translate) {
  if (contact.kind === "customer") {
    return [t("contacts.page.kind.customer"), contact.groupName].filter(Boolean).join(" · ");
  }
  if (contact.kind === "staff") {
    return [
      contact.departmentName || t("contacts.page.role.enterpriseMember"),
      contact.position,
    ]
      .filter(Boolean)
      .join(" · ");
  }
  if (contact.kind === "group") {
    return t("contacts.page.groupSubtitle", {
      count: contact.members ?? "--",
      reminder: contact.muted
        ? t("contacts.reminder.muted")
        : t("contacts.reminder.normal"),
    });
  }
  return [t("contacts.page.kind.friend"), contact.groupName].filter(Boolean).join(" · ");
}

function contactRowHintText(contact: ContactItem, t: Translate) {
  if (contact.kind === "customer") {
    return contact.createdAt
      ? t("contacts.page.addedAt", { time: formatShortDate(contact.createdAt) })
      : t("contacts.detail.customerFriend");
  }
  if (contact.kind === "staff") {
    return [contact.position, contact.greenBubbleNo].filter(Boolean).join(" · ")
      || t("contacts.page.role.enterpriseMember");
  }
  if (contact.kind === "group") {
    return contact.lastMessagePreview || t("contacts.page.noRecentMessage");
  }
  return translateContactValue(contact.remark, t) || t("contacts.page.friendRelationship");
}

function contactKindBadgeText(contact: ContactItem, t: Translate) {
  if (contact.kind === "staff") return translateRoleLabel(contact.roleLabel, t);
  if (contact.kind === "group") {
    return contact.members
      ? t("contacts.page.groupMemberBadge", { count: contact.members })
      : t("contacts.page.kind.group");
  }
  return contactKindLabel(contact, t);
}

function ContactRow({
  contact,
  active,
  compact = false,
  onClick,
  t,
}: {
  contact: ContactItem;
  active: boolean;
  compact?: boolean;
  onClick: () => void;
  t: Translate;
}) {
  const roleOnly = contact.kind === "staff";
  const nameOnly = compact || contact.kind === "customer" || roleOnly;
  const displayName = translateContactValue(contact.name, t);
  return (
    <button
      className={`contacts-row ${nameOnly ? "name-only" : ""} ${roleOnly ? "role-only" : ""} ${active ? "active" : ""}`}
      onClick={onClick}
      type="button"
    >
      <ContactAvatar contact={{ ...contact, name: displayName }} />
      <span className="contacts-row-copy">
        <span className="contacts-name-line">
          <strong>{displayName}</strong>
          {roleOnly && (
            <span className="contacts-role-chip">{translateRoleLabel(contact.roleLabel, t)}</span>
          )}
        </span>
        {roleOnly && <em>{contactRowSubtitleText(contact, t)}</em>}
        {!nameOnly && (
          <>
            <em>{contactRowSubtitleText(contact, t)}</em>
            <small>{contactRowHintText(contact, t)}</small>
          </>
        )}
      </span>
      {!nameOnly && (
        <span className="contacts-kind">{contactKindBadgeText(contact, t)}</span>
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
  contacts,
  activeContactId,
  onSelect,
  t,
}: {
  contacts: ContactItem[];
  activeContactId?: string;
  onSelect: (id: string) => void;
  t: Translate;
}) {
  const roleGroups = useMemo(() => groupOrganizationContactsByRole(contacts), [contacts]);

  return (
    <>
      {roleGroups.map((group) => (
        <section className="org-section" key={group.key}>
          <div className="org-section-head">
            <UsersRound size={15} />
            <strong>{translateRoleLabel(group.label, t)}</strong>
            <em>{t("contacts.memberCount", { count: group.count })}</em>
          </div>
          {group.contacts.map((contact) => (
            <ContactRow
              active={activeContactId === contact.id}
              compact
              contact={contact}
              key={contact.id}
              onClick={() => onSelect(contact.id)}
              t={t}
            />
          ))}
        </section>
      ))}
    </>
  );
}

function RequestList({
  requests,
  selectedRequestId,
  onSelect,
  t,
}: {
  requests: FriendRequestDto[];
  selectedRequestId?: string;
  onSelect: (id: string) => void;
  t: Translate;
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
            name={request.fromDisplayName || t("contacts.page.friendRequestFallback")}
          />
          <span className="contacts-row-copy">
            <strong>{request.fromDisplayName || t("contacts.page.friendRequestFallback")}</strong>
            <em>{request.message || t("contacts.page.requestDefaultMessage")}</em>
          </span>
          <span className="contacts-kind">{translateRequestStatus(request.status, t)}</span>
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
  t,
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
  t: Translate;
}) {
  if (!request) {
    return (
      <>
        <div className="contacts-empty-detail">
          <h2>{t("contacts.page.emptyRequestsTitle")}</h2>
          <p>{t("contacts.page.emptyRequestsText")}</p>
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
          name={request.fromDisplayName || t("contacts.page.friendRequestFallback")}
        />
        <div>
          <h2>{request.fromDisplayName || t("contacts.page.friendRequestFallback")}</h2>
          <p>{formatShortDate(request.createdAt)} · {translateRequestStatus(request.status, t)}</p>
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
          {t("contacts.page.action.accept")}
        </button>
        <button
          disabled={pending || request.status !== "pending"}
          onClick={() => onReject(request.requestId)}
          type="button"
        >
          <UserRoundX size={16} />
          {t("contacts.page.action.reject")}
        </button>
      </div>
      <section className="contacts-section-card">
        <h3>
          <MessageSquare size={16} />
          {t("contacts.page.verificationTitle")}
        </h3>
        <p className="contacts-request-message">
          {request.message || t("contacts.page.noVerificationMessage")}
        </p>
      </section>
      <section className="contacts-section-card">
        <h3>
          <X size={16} />
          {t("contacts.page.ruleTitle")}
        </h3>
        <div className="contacts-mini-rows">
          <div>
            <span>{t("contacts.page.applicant")}</span>
            <strong>{request.fromUserId || "--"}</strong>
          </div>
          <div>
            <span>{t("contacts.page.recipient")}</span>
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
