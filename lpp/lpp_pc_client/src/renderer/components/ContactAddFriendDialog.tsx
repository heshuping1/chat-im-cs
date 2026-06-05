import {
  Check,
  Inbox,
  MessageSquare,
  QrCode,
  Search,
  Send,
  UserPlus,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import type { FriendInviteQrDto, SearchUserDto } from "../data/api-client";
import type { TranslationParams } from "../i18n/dictionary";
import { useI18n } from "../i18n/useI18n";
import { formatError } from "../lib/format";
import type { ContactCardRelation } from "../messages/models/contactCardModel";
import { ContactsInviteQrCard } from "./ContactsInviteQrCard";
import { PanelState } from "./PanelState";
import { PcAvatar } from "./PcAvatar";

type Translate = (key: string, params?: TranslationParams) => string;

interface ContactAddFriendDialogProps {
  actionPending: boolean;
  createInviteQrPending: boolean;
  initialTarget?: SearchUserDto | null;
  inviteQrError: unknown;
  inviteQrLoading: boolean;
  inviteQrs: FriendInviteQrDto[];
  pendingFriendRequestUserId?: string;
  requestPending: boolean;
  searchError: unknown;
  searchLoading: boolean;
  searchResults: SearchUserDto[];
  contactRelation: (userId?: string | null) => ContactCardRelation;
  onAccept: (requestId: string) => void;
  onClose: () => void;
  onCreateInviteQr: () => void;
  onReject: (requestId: string) => void;
  onShowRequests: () => void;
  onStartChat: (userId: string) => void;
  searchUsers: (keyword: string) => void;
  sendFriendRequest: (userId: string, message: string) => void;
}

export function ContactAddFriendDialog({
  actionPending,
  contactRelation,
  createInviteQrPending,
  initialTarget,
  inviteQrError,
  inviteQrLoading,
  inviteQrs,
  onAccept,
  onClose,
  onCreateInviteQr,
  onReject,
  onShowRequests,
  onStartChat,
  pendingFriendRequestUserId,
  requestPending,
  searchError,
  searchLoading,
  searchResults,
  searchUsers,
  sendFriendRequest,
}: ContactAddFriendDialogProps) {
  const { t } = useI18n();
  const [keyword, setKeyword] = useState(initialTarget?.lppId ?? "");
  const [requestMessage, setRequestMessage] = useState(t("contacts.addFriend.defaultMessage"));
  const [selectedUserId, setSelectedUserId] = useState(initialTarget?.userId ?? "");
  const [submittedKeyword, setSubmittedKeyword] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const results = useMemo(() => {
    const byUserId = new Map<string, SearchUserDto>();
    if (initialTarget?.userId) byUserId.set(initialTarget.userId, initialTarget);
    for (const item of searchResults) {
      if (item.userId) byUserId.set(item.userId, item);
    }
    return Array.from(byUserId.values());
  }, [initialTarget, searchResults]);

  const selectedUser = results.find((item) => item.userId === selectedUserId);
  const selectedRelation = selectedUser ? contactRelation(selectedUser.userId) : undefined;

  const submitSearch = () => {
    const trimmedKeyword = keyword.trim();
    setSubmittedKeyword(trimmedKeyword);
    if (!trimmedKeyword) return;
    setSelectedUserId("");
    searchUsers(trimmedKeyword);
  };

  return (
    <div className="pc-modal-backdrop contacts-add-backdrop" role="presentation" onClick={onClose}>
      <section
        aria-label={t("contacts.addFriend.aria")}
        aria-modal="true"
        className="contacts-add-dialog"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="contacts-add-head">
          <div>
            <strong>{t("contacts.addFriend.title")}</strong>
            <span>{t("contacts.addFriend.subtitle")}</span>
          </div>
          <button type="button" aria-label={t("contacts.addFriend.close")} onClick={onClose}>
            <X size={16} />
          </button>
        </header>

        <div className="contacts-add-layout">
          <section className="contacts-add-main">
            <form
              className="contacts-add-search"
              onSubmit={(event) => {
                event.preventDefault();
                submitSearch();
              }}
            >
              <Search size={16} />
              <input
                ref={inputRef}
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder={t("contacts.addFriend.searchPlaceholder")}
              />
              <button type="submit" disabled={searchLoading}>
                {searchLoading ? t("contacts.addFriend.searching") : t("contacts.addFriend.search")}
              </button>
            </form>

            <div className="contacts-add-shortcuts">
              <button type="button" onClick={() => inputRef.current?.focus()}>
                <Search size={15} />
                {t("contacts.addFriend.searchAdd")}
              </button>
              <button type="button" onClick={onCreateInviteQr} disabled={createInviteQrPending}>
                <QrCode size={15} />
                {t("contacts.addFriend.myQr")}
              </button>
              <button type="button" onClick={onShowRequests}>
                <Inbox size={15} />
                {t("contacts.addFriend.receivedRequests")}
              </button>
            </div>

            {Boolean(searchError) && (
              <PanelState
                tone="error"
                text={t("contacts.addFriend.searchFailed", { error: formatError(searchError) })}
              />
            )}
            {searchLoading && <PanelState text={t("contacts.addFriend.searchLoading")} />}
            {!searchLoading && submittedKeyword && !searchError && results.length === 0 && (
              <PanelState text={t("contacts.addFriend.noResults")} />
            )}

            <div className="contacts-add-results" aria-label={t("contacts.addFriend.resultsAria")}>
              {results.map((user) => (
                <SearchUserRow
                  actionPending={actionPending}
                  key={user.userId}
                  pendingFriendRequestUserId={pendingFriendRequestUserId}
                  relation={contactRelation(user.userId)}
                  requestPending={requestPending}
                  selected={selectedUserId === user.userId}
                  user={user}
                  onAccept={onAccept}
                  onReject={onReject}
                  onSelectRequest={() => setSelectedUserId(user.userId)}
                  onStartChat={() => onStartChat(user.userId)}
                  t={t}
                />
              ))}
            </div>

            {selectedUser && selectedRelation?.status === "none" && (
              <section className="contacts-add-confirm">
                <div>
                  <strong>{t("contacts.addFriend.sendRequestTitle")}</strong>
                  <span>{selectedUser.displayName || selectedUser.lppId || t("contacts.addFriend.contactFallback")}</span>
                </div>
                <textarea
                  maxLength={120}
                  value={requestMessage}
                  onChange={(event) => setRequestMessage(event.target.value)}
                />
                <button
                  className="primary"
                  type="button"
                  disabled={actionPending || pendingFriendRequestUserId === selectedUser.userId}
                  onClick={() => sendFriendRequest(selectedUser.userId, requestMessage)}
                >
                  <Send size={15} />
                  {pendingFriendRequestUserId === selectedUser.userId
                    ? t("contacts.addFriend.sending")
                    : t("contacts.addFriend.sendRequest")}
                </button>
              </section>
            )}
          </section>

          <aside className="contacts-add-side">
            <ContactsInviteQrCard
              creating={createInviteQrPending}
              error={inviteQrError}
              loading={inviteQrLoading}
              qrs={inviteQrs}
              onCreate={onCreateInviteQr}
            />
          </aside>
        </div>
      </section>
    </div>
  );
}

function SearchUserRow({
  actionPending,
  onAccept,
  onReject,
  onSelectRequest,
  onStartChat,
  pendingFriendRequestUserId,
  relation,
  requestPending,
  selected,
  user,
  t,
}: {
  actionPending: boolean;
  pendingFriendRequestUserId?: string;
  relation: ContactCardRelation;
  requestPending: boolean;
  selected: boolean;
  user: SearchUserDto;
  onAccept: (requestId: string) => void;
  onReject: (requestId: string) => void;
  onSelectRequest: () => void;
  onStartChat: () => void;
  t: Translate;
}) {
  return (
    <article className={`contacts-add-result ${selected ? "selected" : ""}`}>
      <PcAvatar
        avatarUrl={user.avatarUrl}
        className="contacts-avatar friend"
        name={user.displayName || t("contacts.addFriend.contactFallback")}
      />
      <div className="contacts-add-result-copy">
        <span className="contacts-name-line">
          <strong>{user.displayName || t("contacts.addFriend.contactFallback")}</strong>
          <em>{matchTypeLabel(user.matchType, t)}</em>
        </span>
        <small>{[user.lppId, user.signature].filter(Boolean).join(" · ") || user.userId}</small>
      </div>
      <div className="contacts-add-result-actions">
        {relation.status === "self" && (
          <button type="button" disabled>{t("contacts.addFriend.relation.self")}</button>
        )}
        {relation.status === "friend" && (
          <button className="primary" type="button" disabled={actionPending} onClick={onStartChat}>
            <MessageSquare size={14} />
            {t("contacts.addFriend.relation.message")}
          </button>
        )}
        {relation.status === "outgoingPending" && (
          <button type="button" disabled>
            <Check size={14} />
            {t("contacts.addFriend.relation.sent")}
          </button>
        )}
        {relation.status === "incomingPending" && (
          <>
            <button
              type="button"
              disabled={requestPending}
              onClick={() => onReject(relation.requestId)}
            >
              {t("contacts.addFriend.relation.reject")}
            </button>
            <button
              className="primary"
              type="button"
              disabled={requestPending}
              onClick={() => onAccept(relation.requestId)}
            >
              {t("contacts.addFriend.relation.accept")}
            </button>
          </>
        )}
        {relation.status === "none" && (
          <button
            className="primary"
            type="button"
            disabled={pendingFriendRequestUserId === user.userId}
            onClick={onSelectRequest}
          >
            <UserPlus size={14} />
            {t("contacts.addFriend.relation.add")}
          </button>
        )}
      </div>
    </article>
  );
}

function matchTypeLabel(matchType: string | null | undefined, t: Translate) {
  const value = `${matchType ?? ""}`.trim().toLowerCase();
  if (value === "lpp_id" || value === "lppid") return t("contacts.addFriend.matchType.lppId");
  if (value === "mobile") return t("contacts.addFriend.matchType.mobile");
  if (value === "email") return t("contacts.addFriend.matchType.email");
  return t("contacts.addFriend.matchType.exact");
}
