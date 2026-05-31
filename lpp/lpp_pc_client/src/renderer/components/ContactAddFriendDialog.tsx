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
import { formatError } from "../lib/format";
import type { ContactCardRelation } from "../messages/models/contactCardModel";
import { ContactsInviteQrCard } from "./ContactsInviteQrCard";
import { PanelState } from "./PanelState";
import { PcAvatar } from "./PcAvatar";

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
  const [keyword, setKeyword] = useState(initialTarget?.lppId ?? "");
  const [requestMessage, setRequestMessage] = useState("你好，我想添加你为好友");
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
        aria-label="添加联系人"
        aria-modal="true"
        className="contacts-add-dialog"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="contacts-add-head">
          <div>
            <strong>添加联系人</strong>
            <span>精准搜索绿泡泡号、手机号或邮箱</span>
          </div>
          <button type="button" aria-label="关闭添加联系人" onClick={onClose}>
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
                placeholder="输入绿泡泡号、手机号或邮箱"
              />
              <button type="submit" disabled={searchLoading}>
                {searchLoading ? "搜索中" : "搜索"}
              </button>
            </form>

            <div className="contacts-add-shortcuts">
              <button type="button" onClick={() => inputRef.current?.focus()}>
                <Search size={15} />
                搜索添加
              </button>
              <button type="button" onClick={onCreateInviteQr} disabled={createInviteQrPending}>
                <QrCode size={15} />
                我的好友二维码
              </button>
              <button type="button" onClick={onShowRequests}>
                <Inbox size={15} />
                收到的申请
              </button>
            </div>

            {Boolean(searchError) && (
              <PanelState tone="error" text={`搜索失败：${formatError(searchError)}`} />
            )}
            {searchLoading && <PanelState text="正在搜索联系人..." />}
            {!searchLoading && submittedKeyword && !searchError && results.length === 0 && (
              <PanelState text="没有找到用户，或对方不允许被搜索。" />
            )}

            <div className="contacts-add-results" aria-label="搜索结果">
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
                />
              ))}
            </div>

            {selectedUser && selectedRelation?.status === "none" && (
              <section className="contacts-add-confirm">
                <div>
                  <strong>发送好友申请</strong>
                  <span>{selectedUser.displayName || selectedUser.lppId || "联系人"}</span>
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
                  {pendingFriendRequestUserId === selectedUser.userId ? "发送中" : "发送申请"}
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
}) {
  return (
    <article className={`contacts-add-result ${selected ? "selected" : ""}`}>
      <PcAvatar
        avatarUrl={user.avatarUrl}
        className="contacts-avatar friend"
        name={user.displayName || "联系人"}
      />
      <div className="contacts-add-result-copy">
        <span className="contacts-name-line">
          <strong>{user.displayName || "联系人"}</strong>
          <em>{matchTypeLabel(user.matchType)}</em>
        </span>
        <small>{[user.lppId, user.signature].filter(Boolean).join(" · ") || user.userId}</small>
      </div>
      <div className="contacts-add-result-actions">
        {relation.status === "self" && <button type="button" disabled>这是你自己</button>}
        {relation.status === "friend" && (
          <button className="primary" type="button" disabled={actionPending} onClick={onStartChat}>
            <MessageSquare size={14} />
            发消息
          </button>
        )}
        {relation.status === "outgoingPending" && (
          <button type="button" disabled>
            <Check size={14} />
            好友申请已发送
          </button>
        )}
        {relation.status === "incomingPending" && (
          <>
            <button
              type="button"
              disabled={requestPending}
              onClick={() => onReject(relation.requestId)}
            >
              拒绝
            </button>
            <button
              className="primary"
              type="button"
              disabled={requestPending}
              onClick={() => onAccept(relation.requestId)}
            >
              通过
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
            添加到通讯录
          </button>
        )}
      </div>
    </article>
  );
}

function matchTypeLabel(matchType?: string | null) {
  const value = `${matchType ?? ""}`.trim().toLowerCase();
  if (value === "lpp_id" || value === "lppid") return "绿泡泡号";
  if (value === "mobile") return "手机号";
  if (value === "email") return "邮箱";
  return "精准匹配";
}
