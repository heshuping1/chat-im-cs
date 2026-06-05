import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, ShieldCheck, Trash2, UserPlus } from "lucide-react";
import { ApiError, type TenantInvitationDto } from "../../data/api-client";
import { useAuthSession } from "../../data/auth/auth-store";
import { pcQueryKeys } from "../../data/query-keys";
import { requireApiClient } from "../../data/runtime";
import { formatError, formatShortDate } from "../../lib/format";
import { useI18n } from "../../i18n/useI18n";
import {
  canCreateTenantInvitations,
  createTenantInvitationDefaults,
  invitationAcceptedRoleTextKey,
  invitationCopyTarget,
  invitationCreateButtonLabelKey,
  invitationRoleDescriptionKey,
  invitationRoleLabelKey,
  normalizeTenantInvitationRoleFields,
  tenantInvitationStatusLabelKey,
  tenantInvitationRoleOptionsFor,
} from "../models/tenantInvitationModel";

export function TenantInvitationPanel({ isPersonalSpace }: { isPersonalSpace: boolean }) {
  const { t } = useI18n();
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
      setNotice(t("tenantInvitation.created", {
        role: tenantInvitationRoleLabelI18n(
          normalizedInvitation.targetMembershipRole ?? targetMembershipRole,
          t,
        ),
      }));
      await queryClient.invalidateQueries({
        queryKey: pcQueryKeys.tenantInvitations(authSession?.apiBaseUrl, authSession?.tenantToken),
      });
    },
    onError: (error) => setNotice(t("tenantInvitation.createFailed", { error: formatTenantInvitationError(error, t) })),
  });

  const deleteInvitationMutation = useMutation({
    mutationFn: async (invitationId: string) =>
      requireApiClient(authSession).deleteTenantInvitation(invitationId),
    onSuccess: async () => {
      setNotice(t("tenantInvitation.revoked"));
      await queryClient.invalidateQueries({
        queryKey: pcQueryKeys.tenantInvitations(authSession?.apiBaseUrl, authSession?.tenantToken),
      });
    },
    onError: (error) => setNotice(t("tenantInvitation.revokeFailed", { error: formatTenantInvitationError(error, t) })),
  });

  if (isPersonalSpace) return null;

  if (!canInviteEmployees || roleOptions.length === 0) {
    return (
      <section className="space-panel-section tenant-invitation-panel">
        <header>
          <UserPlus size={18} />
          <strong>{t("tenantInvitation.title")}</strong>
        </header>
        <p className="utility-inline-state">{t("tenantInvitation.noPermission")}</p>
      </section>
    );
  }

  const selectedDescription = tenantInvitationRoleDescriptionI18n(targetMembershipRole, t);
  const createdCopyTarget = createdInvitation ? tenantInvitationCopyTargetI18n(createdInvitation, t) : null;

  return (
    <section className="space-panel-section tenant-invitation-panel">
      <header>
        <UserPlus size={18} />
        <strong>{t("tenantInvitation.title")}</strong>
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
            <span>{t("tenantInvitation.role")}</span>
            <select
              value={targetMembershipRole}
              onChange={(event) => setTargetMembershipRole(toTargetInvitationRole(event.target.value))}
            >
              {roleOptions.map((option) => (
                <option key={option.role} value={option.role}>
                  {tenantInvitationRoleLabelI18n(option.role, t)}
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
              <span>{t("tenantInvitation.maxUses")}</span>
              <input
                type="number"
                min={1}
                value={maxUses}
                onChange={(event) => setMaxUses(Math.max(1, Number(event.target.value) || 1))}
              />
            </label>
            <label className="tenant-invitation-field">
              <span>{t("tenantInvitation.expireHours")}</span>
              <input
                type="number"
                min={1}
                value={expireHours}
                onChange={(event) => setExpireHours(Math.max(1, Number(event.target.value) || 1))}
              />
            </label>
          </div>
          <label className="tenant-invitation-field">
            <span>{t("tenantInvitation.target")}</span>
            <input
              value={targetIdentifier}
              onChange={(event) => setTargetIdentifier(event.target.value)}
              placeholder={t("tenantInvitation.targetPlaceholder")}
            />
          </label>
          {targetMembershipRole === 3 && (
            <p className="tenant-invitation-warning">
              {t("tenantInvitation.adminWarning")}
            </p>
          )}
          <button
            type="submit"
            disabled={createInvitationMutation.isPending || !authSession?.tenantToken}
          >
            {createInvitationMutation.isPending
              ? t("tenantInvitation.creating")
              : tenantInvitationCreateButtonLabelI18n(targetMembershipRole, t)}
          </button>
        </form>

        <div className="tenant-invitation-side">
          {notice && <p className="utility-inline-state">{notice}</p>}
          {createdInvitation && (
            <article className="tenant-invitation-created">
              <strong>{tenantInvitationAcceptedRoleTextI18n(createdInvitation.targetMembershipRole ?? targetMembershipRole, t)}</strong>
              <span>
                {createdCopyTarget?.value
                  ? `${createdCopyTarget.label}：${createdCopyTarget.value}`
                  : t("tenantInvitation.noCodeReturned")}
              </span>
              {createdCopyTarget?.value && (
                <button
                  type="button"
                  aria-label={createdCopyTarget.kind === "url" ? t("tenantInvitation.copyLink") : t("tenantInvitation.copyCode")}
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
          {invitationsQuery.isLoading && <p className="utility-inline-state">{t("tenantInvitation.loading")}</p>}
          {invitationsQuery.error && (
            <p className="utility-inline-state error">
              {t("tenantInvitation.listLoadFailed", { error: formatTenantInvitationError(invitationsQuery.error, t) })}
            </p>
          )}
          {!invitationsQuery.isLoading && !invitationsQuery.error && invitations.length === 0 && (
            <div className="utility-empty">
              <strong>{t("tenantInvitation.emptyTitle")}</strong>
              <span>{t("tenantInvitation.emptyText")}</span>
            </div>
          )}
          {invitations.length > 0 && (
            <div className="tenant-invitation-list">
              {invitations.map((invitation, index) => {
                const listCopyTarget = tenantInvitationCopyTargetI18n(invitation, t);
                return (
                  <article className="tenant-invitation-item" key={invitation.invitationId || index}>
                    <div>
                      <strong>{t("tenantInvitation.roleInvite", { role: tenantInvitationRoleLabelI18n(invitation.targetMembershipRole, t) })}</strong>
                      <span>{tenantInvitationAcceptedRoleTextI18n(invitation.targetMembershipRole, t)}</span>
                    </div>
                    <em>{tenantInvitationStatusLabelI18n(invitation.status, t)}</em>
                    <span className="tenant-invitation-code">
                      {t("tenantInvitation.codeValue", { value: listCopyTarget.value || "--" })}
                    </span>
                    <span>
                      {formatInvitationUses(invitation, t)} · {formatInvitationExpiry(invitation, t)}
                    </span>
                    {invitation.createdAt && <span>{t("tenantInvitation.createdAt", { time: formatShortDate(invitation.createdAt) })}</span>}
                    <div className="tenant-invitation-actions">
                      {listCopyTarget.value && (
                        <button
                          type="button"
                          aria-label={listCopyTarget.kind === "url" ? t("tenantInvitation.copyLink") : t("tenantInvitation.copyCode")}
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
                            if (confirm(t("tenantInvitation.revokeConfirm"))) {
                              deleteInvitationMutation.mutate(invitation.invitationId!);
                            }
                          }}
                        >
                          <Trash2 size={14} />
                          {t("tenantInvitation.revoke")}
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

type TenantInvitationTranslate = (key: string, params?: Record<string, string | number>) => string;

function formatInvitationUses(invitation: TenantInvitationDto, t: TenantInvitationTranslate) {
  const maxUses = invitation.maxUses ?? 0;
  if (typeof invitation.remainingUses === "number") {
    return t("tenantInvitation.remainingUses", {
      max: maxUses || "--",
      remaining: invitation.remainingUses,
    });
  }
  return t("tenantInvitation.usedCount", {
    max: maxUses || "--",
    used: invitation.usedCount ?? 0,
  });
}

function formatInvitationExpiry(invitation: TenantInvitationDto, t: TenantInvitationTranslate) {
  const expiresAt = invitation.expiresAt ?? invitation.expiredAt;
  if (expiresAt) return t("tenantInvitation.validUntil", { time: formatShortDate(expiresAt) });
  if (invitation.expireHours) return t("tenantInvitation.validHours", { hours: invitation.expireHours });
  return t("tenantInvitation.validEmpty");
}

function formatTenantInvitationError(error: unknown, t: TenantInvitationTranslate) {
  if (error instanceof ApiError) {
    if (error.code === "INVITATION_ROLE_TOO_HIGH") return t("tenantInvitation.error.roleTooHigh");
    if (error.code === "INVITATION_ROLE_INVALID") return t("tenantInvitation.error.roleInvalid");
    if (error.code === "TENANT_PERMISSION_DENIED") return t("tenantInvitation.noPermission");
  }
  return formatError(error);
}

function tenantInvitationRoleLabelI18n(role: number | null | undefined, t: TenantInvitationTranslate) {
  return t(invitationRoleLabelKey(role));
}

function tenantInvitationRoleDescriptionI18n(role: number, t: TenantInvitationTranslate) {
  return t(invitationRoleDescriptionKey(role));
}

function tenantInvitationCreateButtonLabelI18n(role: number, t: TenantInvitationTranslate) {
  return t(invitationCreateButtonLabelKey(role));
}

function tenantInvitationAcceptedRoleTextI18n(
  role: number | null | undefined,
  t: TenantInvitationTranslate,
) {
  return t(invitationAcceptedRoleTextKey(), {
    role: tenantInvitationRoleLabelI18n(role, t),
  });
}

function tenantInvitationStatusLabelI18n(status: string | number | null | undefined, t: TenantInvitationTranslate) {
  return t(tenantInvitationStatusLabelKey(status));
}

function tenantInvitationCopyTargetI18n(invitation: TenantInvitationDto, t: TenantInvitationTranslate) {
  const target = invitationCopyTarget(invitation);
  const isUrl = target.kind === "url";
  return {
    ...target,
    buttonLabel: t(isUrl ? "tenantInvitation.copyLinkButton" : "tenantInvitation.copyCodeButton"),
    copiedNotice: t(isUrl ? "tenantInvitation.linkCopied" : "tenantInvitation.codeCopied"),
    label: t(isUrl ? "tenantInvitation.inviteLink" : "tenantInvitation.inviteCode"),
  };
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
