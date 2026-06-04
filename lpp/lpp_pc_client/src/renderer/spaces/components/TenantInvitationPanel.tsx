import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, ShieldCheck, Trash2, UserPlus } from "lucide-react";
import { ApiError, type TenantInvitationDto } from "../../data/api-client";
import { useAuthSession } from "../../data/auth/auth-store";
import { pcQueryKeys } from "../../data/query-keys";
import { requireApiClient } from "../../data/runtime";
import { formatError, formatShortDate } from "../../lib/format";
import {
  canCreateTenantInvitations,
  createTenantInvitationDefaults,
  invitationAcceptedRoleText,
  invitationCopyTarget,
  invitationCreateButtonLabel,
  invitationRoleDescription,
  invitationRoleLabel,
  normalizeTenantInvitationRoleFields,
  tenantInvitationRoleOptionsFor,
  tenantInvitationStatusLabel,
} from "../models/tenantInvitationModel";

export function TenantInvitationPanel({ isPersonalSpace }: { isPersonalSpace: boolean }) {
  const authSession = useAuthSession();
  const queryClient = useQueryClient();
  const canInviteEmployees = canCreateTenantInvitations(authSession?.membershipRole);
  const roleOptions = useMemo(
    () => (canInviteEmployees ? tenantInvitationRoleOptionsFor(authSession?.membershipRole) : []),
    [authSession?.membershipRole, canInviteEmployees],
  );
  const defaults = useMemo(
    () => createTenantInvitationDefaults(authSession?.membershipRole),
    [authSession?.membershipRole],
  );
  const [targetMembershipRole, setTargetMembershipRole] = useState(defaults.targetMembershipRole);
  const [maxUses, setMaxUses] = useState(defaults.maxUses);
  const [expireHours, setExpireHours] = useState(defaults.expireHours);
  const [targetIdentifier, setTargetIdentifier] = useState(defaults.targetIdentifier);
  const [notice, setNotice] = useState<string | null>(null);
  const [createdInvitation, setCreatedInvitation] = useState<TenantInvitationDto | null>(null);

  useEffect(() => {
    if (!roleOptions.some((option) => option.role === targetMembershipRole)) {
      setTargetMembershipRole(defaults.targetMembershipRole);
    }
  }, [defaults.targetMembershipRole, roleOptions, targetMembershipRole]);

  const invitationsQuery = useQuery({
    queryKey: pcQueryKeys.tenantInvitations(authSession?.apiBaseUrl, authSession?.tenantToken),
    enabled: Boolean(authSession?.tenantToken && !isPersonalSpace && canInviteEmployees),
    staleTime: 30_000,
    queryFn: async () => requireApiClient(authSession).getTenantInvitations(),
  });
  const invitations = normalizeTenantInvitations(invitationsQuery.data);

  const createInvitationMutation = useMutation({
    mutationFn: async () =>
      requireApiClient(authSession).createTenantInvitation({
        expireHours,
        maxUses,
        targetIdentifier,
        targetMembershipRole,
      }),
    onSuccess: async (invitation) => {
      const normalizedInvitation = normalizeTenantInvitationRoleFields(invitation);
      setCreatedInvitation(normalizedInvitation);
      setNotice(`${invitationRoleLabel(normalizedInvitation.targetMembershipRole ?? targetMembershipRole)}邀请已创建`);
      await queryClient.invalidateQueries({
        queryKey: pcQueryKeys.tenantInvitations(authSession?.apiBaseUrl, authSession?.tenantToken),
      });
    },
    onError: (error) => setNotice(`创建邀请失败：${formatTenantInvitationError(error)}`),
  });

  const deleteInvitationMutation = useMutation({
    mutationFn: async (invitationId: string) =>
      requireApiClient(authSession).deleteTenantInvitation(invitationId),
    onSuccess: async () => {
      setNotice("邀请已撤销");
      await queryClient.invalidateQueries({
        queryKey: pcQueryKeys.tenantInvitations(authSession?.apiBaseUrl, authSession?.tenantToken),
      });
    },
    onError: (error) => setNotice(`撤销邀请失败：${formatTenantInvitationError(error)}`),
  });

  if (isPersonalSpace) return null;

  if (!canInviteEmployees || roleOptions.length === 0) {
    return (
      <section className="space-panel-section tenant-invitation-panel">
        <header>
          <UserPlus size={18} />
          <strong>邀请员工</strong>
        </header>
        <p className="utility-inline-state">当前角色暂无邀请员工权限。</p>
      </section>
    );
  }

  const selectedDescription = invitationRoleDescription(targetMembershipRole);
  const createdCopyTarget = createdInvitation ? invitationCopyTarget(createdInvitation) : null;

  return (
    <section className="space-panel-section tenant-invitation-panel">
      <header>
        <UserPlus size={18} />
        <strong>邀请员工</strong>
      </header>
      <div className="tenant-invitation-layout">
        <form
          className="tenant-invitation-form"
          onSubmit={(event) => {
            event.preventDefault();
            setNotice(null);
            createInvitationMutation.mutate();
          }}
        >
          <label className="tenant-invitation-field">
            <span>入职角色</span>
            <select
              value={targetMembershipRole}
              onChange={(event) => setTargetMembershipRole(toTargetInvitationRole(event.target.value))}
            >
              {roleOptions.map((option) => (
                <option key={option.role} value={option.role}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <div className="tenant-invitation-role-hint">
            <ShieldCheck size={15} />
            <span>{selectedDescription}</span>
          </div>
          <div className="tenant-invitation-fields">
            <label className="tenant-invitation-field">
              <span>可用次数</span>
              <input
                type="number"
                min={1}
                value={maxUses}
                onChange={(event) => setMaxUses(Math.max(1, Number(event.target.value) || 1))}
              />
            </label>
            <label className="tenant-invitation-field">
              <span>有效期（小时）</span>
              <input
                type="number"
                min={1}
                value={expireHours}
                onChange={(event) => setExpireHours(Math.max(1, Number(event.target.value) || 1))}
              />
            </label>
          </div>
          <label className="tenant-invitation-field">
            <span>定向对象</span>
            <input
              value={targetIdentifier}
              onChange={(event) => setTargetIdentifier(event.target.value)}
              placeholder="手机号 / 邮箱 / LPP 号，可选"
            />
          </label>
          {targetMembershipRole === 3 && (
            <p className="tenant-invitation-warning">
              管理员将拥有成员和空间管理权限，请只发送给可信员工。
            </p>
          )}
          <button
            type="submit"
            disabled={createInvitationMutation.isPending || !authSession?.tenantToken}
          >
            {createInvitationMutation.isPending
              ? "创建中"
              : invitationCreateButtonLabel(targetMembershipRole)}
          </button>
        </form>

        <div className="tenant-invitation-side">
          {notice && <p className="utility-inline-state">{notice}</p>}
          {createdInvitation && (
            <article className="tenant-invitation-created">
              <strong>{invitationAcceptedRoleText(createdInvitation.targetMembershipRole ?? targetMembershipRole)}</strong>
              <span>
                {createdCopyTarget?.value
                  ? `${createdCopyTarget.label}：${createdCopyTarget.value}`
                  : "服务端未返回邀请码"}
              </span>
              {createdCopyTarget?.value && (
                <button
                  type="button"
                  aria-label={createdCopyTarget.kind === "url" ? "复制邀请链接" : "复制邀请码"}
                  onClick={() =>
                    void copyInvitationValue(
                      createdCopyTarget.value,
                      createdCopyTarget.copiedNotice,
                      setNotice,
                    )
                  }
                >
                  <Copy size={14} />
                  {createdCopyTarget.buttonLabel}
                </button>
              )}
            </article>
          )}
          {invitationsQuery.isLoading && <p className="utility-inline-state">正在读取邀请列表...</p>}
          {invitationsQuery.error && (
            <p className="utility-inline-state error">
              邀请列表加载失败：{formatTenantInvitationError(invitationsQuery.error)}
            </p>
          )}
          {!invitationsQuery.isLoading && !invitationsQuery.error && invitations.length === 0 && (
            <div className="utility-empty">
              <strong>暂无员工邀请</strong>
              <span>创建后会在这里查看目标角色、有效期和撤销入口。</span>
            </div>
          )}
          {invitations.length > 0 && (
            <div className="tenant-invitation-list">
              {invitations.map((invitation, index) => {
                const listCopyTarget = invitationCopyTarget(invitation);
                return (
                  <article className="tenant-invitation-item" key={invitation.invitationId || index}>
                    <div>
                      <strong>{invitationRoleLabel(invitation.targetMembershipRole)}邀请</strong>
                      <span>{invitationAcceptedRoleText(invitation.targetMembershipRole)}</span>
                    </div>
                    <em>{tenantInvitationStatusLabel(invitation.status)}</em>
                    <span className="tenant-invitation-code">
                      邀请码：{listCopyTarget.value || "--"}
                    </span>
                    <span>
                      {formatInvitationUses(invitation)} · {formatInvitationExpiry(invitation)}
                    </span>
                    {invitation.createdAt && <span>创建于 {formatShortDate(invitation.createdAt)}</span>}
                    <div className="tenant-invitation-actions">
                      {listCopyTarget.value && (
                        <button
                          type="button"
                          aria-label={listCopyTarget.kind === "url" ? "复制邀请链接" : "复制邀请码"}
                          onClick={() =>
                            void copyInvitationValue(
                              listCopyTarget.value,
                              listCopyTarget.copiedNotice,
                              setNotice,
                            )
                          }
                        >
                          <Copy size={14} />
                          {listCopyTarget.buttonLabel}
                        </button>
                      )}
                      {invitation.invitationId && (
                        <button
                          type="button"
                          disabled={deleteInvitationMutation.isPending}
                          onClick={() => {
                            if (confirm("撤销后，已复制的邀请码将无法继续使用。确认撤销？")) {
                              deleteInvitationMutation.mutate(invitation.invitationId!);
                            }
                          }}
                        >
                          <Trash2 size={14} />
                          撤销
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function normalizeTenantInvitations(data?: TenantInvitationDto[] | { items?: TenantInvitationDto[] }) {
  const invitations = Array.isArray(data) ? data : data?.items ?? [];
  return invitations.map(normalizeTenantInvitationRoleFields);
}

function formatInvitationUses(invitation: TenantInvitationDto) {
  const maxUses = invitation.maxUses ?? 0;
  if (typeof invitation.remainingUses === "number") return `剩余 ${invitation.remainingUses}/${maxUses || "--"}`;
  return `已用 ${invitation.usedCount ?? 0}/${maxUses || "--"}`;
}

function formatInvitationExpiry(invitation: TenantInvitationDto) {
  const expiresAt = invitation.expiresAt ?? invitation.expiredAt;
  if (expiresAt) return `有效至 ${formatShortDate(expiresAt)}`;
  if (invitation.expireHours) return `${invitation.expireHours} 小时有效`;
  return "有效期 --";
}

function formatTenantInvitationError(error: unknown) {
  if (error instanceof ApiError) {
    if (error.code === "INVITATION_ROLE_TOO_HIGH") return "当前角色不能创建该入职角色邀请";
    if (error.code === "INVITATION_ROLE_INVALID") return "所有者不能通过邀请码授予";
    if (error.code === "TENANT_PERMISSION_DENIED") return "当前角色暂无邀请员工权限";
  }
  return formatError(error);
}

async function copyInvitationValue(
  value: string,
  copiedNotice: string,
  setNotice: (notice: string) => void,
) {
  await navigator.clipboard?.writeText(value).catch(() => undefined);
  setNotice(copiedNotice);
}

function toTargetInvitationRole(value: string) {
  const role = Number(value);
  if (role === 3 || role === 2 || role === 1) return role;
  return 0;
}
