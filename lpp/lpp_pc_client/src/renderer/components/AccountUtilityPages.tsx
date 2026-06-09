import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Building2,
  Check,
  CheckCircle2,
  Clock3,
  Copy,
  Star,
  FileText,
  Image,
  Info,
  MessageSquareText,
  Mic,
  Play,
  PlaySquare,
  Search,
  Tag,
  TriangleAlert,
} from "lucide-react";
import {
  ApiClient,
  type FavoriteItemDto,
  type FavoriteSummaryDto,
  type MessageItemDto,
  type PlatformJoinResultDto,
  type PlatformTenant,
  type TenantJoinRequestDto,
  type TenantCodePreviewDto,
} from "../data/api-client";
import { authTenantRoleLabel, mergePlatformTenants } from "../data/auth/auth-tenant-role";
import { useAuthSession, useSetAuthSession } from "../data/auth/auth-store";
import { pcQueryKeys } from "../data/query-keys";
import { createTraceId } from "../data/runtime";
import { requireApiClient } from "../data/runtime";
import { formatError, formatShortDate } from "../lib/format";
import { useI18n } from "../i18n/useI18n";
import { TenantInvitationPanel } from "../spaces/components/TenantInvitationPanel";
import { useSpaceSwitchController } from "../spaces/hooks/useSpaceSwitchController";
import {
  tenantJoinRequestStatus,
  tenantJoinRequestsPollIntervalMs,
} from "../spaces/models/tenantJoinReminderModel";
import { chatMediaItemsFromMessage, type ChatMediaItem } from "../media/domain/mediaMessage";
import { ImagePreviewViewer } from "../media/components/ImageMessageFrame";
import { useCachedImageMediaUrl } from "../media/runtime/useCachedImageMediaUrl";
import {
  openMessageMediaFile,
  openMessageVideoPlayer,
} from "../messages/runtime/messageMediaActions";
import { PcAvatar } from "./PcAvatar";

type UtilityNoticeTone = "info" | "success" | "warning" | "error";

interface UtilityNotice {
  tone: UtilityNoticeTone;
  title: string;
  detail?: string;
}

export function EnterpriseSwitchPage() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const authSession = useAuthSession();
  const setAuthSession = useSetAuthSession();
  const [tenantKeyword, setTenantKeyword] = useState("");
  const [joinMessage, setJoinMessage] = useState("");
  const [tenantPreviewStarted, setTenantPreviewStarted] = useState(false);
  const [notice, setNotice] = useState<UtilityNotice | null>(null);
  const isPersonalSpace =
    authSession?.spaceType === 1 ||
    authSession?.roleLabel === "\u4e2a\u4eba\u7a7a\u95f4" ||
    authSession?.tenantName === "\u4e2a\u4eba\u7a7a\u95f4" ||
    isPersonalTenantPlaceholder(authSession?.tenantId);
  const tenantInfoQuery = useQuery({
    queryKey: pcQueryKeys.accountTenant(authSession?.apiBaseUrl, authSession?.tenantToken),
    enabled: Boolean(authSession && !isPersonalSpace),
    staleTime: 60_000,
    queryFn: async () => requireApiClient(authSession).getTenantInfo(),
  });
  const spacesQuery = useQuery({
    queryKey: pcQueryKeys.accountSpaces(authSession?.apiBaseUrl, authSession?.platformToken),
    enabled: Boolean(authSession?.platformToken),
    staleTime: 60_000,
    queryFn: async () => requireApiClient(authSession).getPlatformTenants(),
  });
  const joinRequestsQuery = useQuery({
    queryKey: pcQueryKeys.tenantJoinRequests(
      authSession?.apiBaseUrl,
      authSession?.platformToken,
    ),
    enabled: Boolean(authSession?.platformToken),
    staleTime: 60_000,
    refetchInterval: (query) =>
      tenantJoinRequestsPollIntervalMs(
        (query.state.data as TenantJoinRequestDto[] | undefined) ?? [],
      ),
    refetchIntervalInBackground: true,
    queryFn: async () => requireApiClient(authSession).getMyTenantJoinRequests(),
  });
  const tenantInfo = tenantInfoQuery.data;
  const tenantName = isPersonalSpace
    ? t("accountUtility.space.personalSpace")
    : tenantInfo?.tenantName || authSession?.tenantName || t("accountUtility.space.currentEnterprise");
  const tenantCode = isPersonalSpace ? "--" : tenantInfo?.tenantCode || authSession?.tenantCode || "--";
  const tenantId = isPersonalSpace ? "--" : tenantInfo?.tenantId || authSession?.tenantId || "--";
  const logoUrl = isPersonalSpace ? undefined : tenantInfo?.logoUrl ?? authSession?.tenantLogoUrl;
  const spaces = useMemo(
    () => normalizeSpaces(spacesQuery.data, authSession?.tenants),
    [authSession?.tenants, spacesQuery.data],
  );
  const pendingJoinRequests = useMemo(
    () =>
      (joinRequestsQuery.data ?? []).filter(
        (request) => tenantJoinRequestStatus(request) === "pending",
      ),
    [joinRequestsQuery.data],
  );
  const spaceByTenantId = useMemo(() => {
    const map = new Map<string, PlatformTenant>();
    spaces.forEach((space) => map.set(space.tenantId, space));
    return map;
  }, [spaces]);
  const { switchSpaceMutation } = useSpaceSwitchController({
    onError: (error) => setNotice(errorNotice(t("accountUtility.space.switchFailed"), formatError(error))),
    onSuccess: () =>
      setNotice({
        tone: "success",
        title: t("accountUtility.space.switchSuccess"),
        detail: t("accountUtility.space.switchSuccessDetail"),
      }),
  });
  const tenantSearchMutation = useMutation({
    mutationFn: async (code: string) => {
      if (!authSession?.platformToken) {
        throw new Error(t("accountUtility.space.missingPlatformPreview"));
      }
      return requireApiClient(authSession).previewTenantByCode(code);
    },
    onSuccess: () => {
      setJoinMessage("");
    },
    onError: (error) => setNotice(errorNotice(t("accountUtility.space.previewFailed"), formatError(error))),
  });
  const joinMutation = useMutation({
    mutationFn: async (tenant: TenantCodePreviewDto) => {
      if (!authSession?.platformToken) {
        throw new Error(t("accountUtility.space.missingPlatformJoin"));
      }
      const result = await requireApiClient(authSession).joinTenantByCode({
        tenantCode: tenant.tenantCode,
        message: joinMessage,
      });
      return { result, tenant };
    },
    onSuccess: async ({ result, tenant }) => {
      setJoinMessage("");
      if (result.accessToken) {
        await applyJoinedTenantSession(result, tenant);
        setNotice({
          tone: "success",
          title: t("accountUtility.space.joinSuccess"),
          detail: t("accountUtility.space.joinSuccessDetail"),
        });
        return;
      }
      setNotice({
        tone: "warning",
        title: t("accountUtility.space.joinPending"),
        detail: t("accountUtility.space.joinPendingDetail"),
      });
      await joinRequestsQuery.refetch();
      await spacesQuery.refetch();
    },
    onError: (error) => setNotice(tenantJoinErrorNotice(error, t)),
  });
  const previewTenant = tenantSearchMutation.data ?? null;
  const handleTenantSearch = () => {
    const code = tenantKeyword.trim();
    if (!code) {
      setNotice({
        tone: "info",
        title: t("accountUtility.space.enterCodeBeforePreview"),
        detail: t("accountUtility.space.enterCodeBeforePreviewDetail"),
      });
      return;
    }
    setNotice(null);
    setTenantPreviewStarted(true);
    tenantSearchMutation.mutate(code);
  };
  const handleEnterPreviewTenant = async (tenant: TenantCodePreviewDto) => {
    const existingSpace = spaceByTenantId.get(tenant.tenantId);
    if (existingSpace) {
      switchSpaceMutation.mutate(existingSpace);
      return;
    }
    const refreshed = await spacesQuery.refetch();
    const refreshedSpace = normalizeSpaces(refreshed.data, authSession?.tenants).find(
      (space) => space.tenantId === tenant.tenantId,
    );
    if (refreshedSpace) {
      switchSpaceMutation.mutate(refreshedSpace);
      return;
    }
    setNotice({
      tone: "warning",
      title: t("accountUtility.space.memberConfirmedUnsynced"),
      detail: t("accountUtility.space.memberConfirmedUnsyncedDetail"),
    });
  };
  const applyJoinedTenantSession = async (
    result: PlatformJoinResultDto,
    preview: TenantCodePreviewDto,
  ) => {
    if (!authSession || !result.accessToken) return;
    const sessionClient = new ApiClient({
      baseUrl: authSession.apiBaseUrl,
      tenantToken: result.accessToken,
      platformToken: authSession.platformToken,
      traceId: createTraceId("pc-space-join-profile"),
    });
    const [profile, currentTenant, refreshedSpaces] = await Promise.all([
      sessionClient.getMyProfile().catch(() => null),
      sessionClient.getTenantInfo().catch(() => null),
      spacesQuery.refetch().then((query) => normalizeSpaces(query.data, authSession.tenants)),
    ]);
    const joinedSpace = refreshedSpaces.find((space) => space.tenantId === preview.tenantId);
    setAuthSession({
      ...authSession,
      tenantToken: result.accessToken,
      refreshToken: result.refreshToken,
      tenantId: result.tenantId ?? preview.tenantId,
      tenantCode: currentTenant?.tenantCode ?? preview.tenantCode,
      tenantName: currentTenant?.tenantName ?? preview.tenantName,
      tenantLogoUrl: currentTenant?.logoUrl ?? preview.logoUrl,
      userId: profile?.userId ?? result.userId,
      platformUserId: profile?.platformUserId ?? result.platformUserId,
      lppId: profile?.lppId ?? result.lppId,
      displayName: profile?.displayName ?? result.displayName ?? authSession.displayName,
      avatarUrl: profile?.avatarUrl ?? result.avatarUrl,
      userType: profile?.userType ?? authSession.userType,
      tenants: refreshedSpaces.length > 0 ? refreshedSpaces : authSession.tenants,
      membershipRole: joinedSpace?.membershipRole,
      spaceType: 2,
      roleLabel: roleLabel(joinedSpace?.membershipRole),
    });
    await queryClient.invalidateQueries();
  };

  return (
    <main className="module-page account-utility-page enterprise-switch-page">
      <section className="account-utility-hero enterprise-switch-hero">
        <div>
          <span className="eyebrow">SPACES</span>
          <h1>{t("accountUtility.space.title")}</h1>
          <p>{t("accountUtility.space.subtitle")}</p>
        </div>
        <div className="space-hero-summary">
          <span>{t("accountUtility.space.currentAccount")}</span>
          <strong>{authSession?.displayName || "--"}</strong>
          <em>{authSession?.lppId ?? authSession?.platformUserId ?? "--"}</em>
        </div>
      </section>
      {notice && <UtilityNoticeBanner notice={notice} />}

      <section className="account-utility-card enterprise-space-panel">
          <header>
            <Building2 size={18} />
            <strong>{t("accountUtility.space.currentSpace")}</strong>
          </header>
          {!isPersonalSpace && tenantInfoQuery.isLoading && <InlineState text={t("accountUtility.space.loadingTenant")} />}
          {!isPersonalSpace && tenantInfoQuery.error && (
            <InlineState tone="error" text={t("accountUtility.space.tenantLoadFailed", { error: formatError(tenantInfoQuery.error) })} />
          )}
          <div className="enterprise-current-card">
            <PcAvatar
              avatarUrl={logoUrl}
              className="tenant-logo large"
              kind={isPersonalSpace ? "person" : "tenant"}
              name={isPersonalSpace ? authSession?.displayName ?? t("accountUtility.space.me") : tenantName}
            />
            <div>
              <strong>{tenantName}</strong>
              <span>{tenantCode}</span>
            </div>
            <span className="current-pill">{t("accountUtility.space.currentlyUsing")}</span>
          </div>
          <div className="enterprise-current-meta">
            <InfoLine label={t("accountUtility.space.spaceCode")} value={tenantCode} copyable />
            <InfoLine label={t("accountUtility.space.spaceId")} value={tenantId} copyable={!isPersonalSpace && tenantId !== "--"} />
            <InfoLine label={t("accountUtility.space.currentRole")} value={isPersonalSpace ? t("accountUtility.space.personalSpace") : authSession?.roleLabel || t("accountUtility.space.member")} />
          </div>

          <div className="space-panel-section">
            <header>
              <Building2 size={18} />
              <strong>{t("accountUtility.space.switchableSpaces")}</strong>
            </header>
            {!authSession?.platformToken && (
              <InlineState tone="error" text={t("accountUtility.space.missingPlatformSwitch")} />
            )}
            {spacesQuery.isLoading && <InlineState text={t("accountUtility.space.loadingSpaces")} />}
            {spacesQuery.error && (
              <InlineState tone="error" text={t("accountUtility.space.spacesLoadFailed", { error: formatError(spacesQuery.error) })} />
            )}
            <div className="space-page-list">
              <button
                className="space-page-item"
                type="button"
                disabled={switchSpaceMutation.isPending || !authSession?.platformToken}
                onClick={() => switchSpaceMutation.mutate("personal")}
              >
                <PcAvatar className="tenant-logo large" kind="person" name={authSession?.displayName ?? t("accountUtility.space.me")} />
                <span>
                  <strong>{t("accountUtility.space.personalSpace")}</strong>
                  <em>{authSession?.lppId ?? authSession?.platformUserId ?? "--"}</em>
                </span>
                {authSession?.roleLabel === "\u4e2a\u4eba\u7a7a\u95f4" ? <Check size={16} /> : <ChevronHint />}
              </button>
              {spaces.map((space) => (
                <button
                  className="space-page-item"
                  key={space.tenantId}
                  type="button"
                  disabled={switchSpaceMutation.isPending}
                  onClick={() => switchSpaceMutation.mutate(space)}
                >
                  <PcAvatar avatarUrl={space.logoUrl} className="tenant-logo large" kind="tenant" name={space.tenantName} />
                  <span>
                    <strong>{space.tenantName}</strong>
                    <em>{[space.tenantCode || space.tenantId, roleLabel(space.membershipRole)].filter(Boolean).join(" · ")}</em>
                  </span>
                  {space.tenantId === authSession?.tenantId ? <Check size={16} /> : <ChevronHint />}
                </button>
              ))}
            </div>
          </div>

          <div className="space-panel-section enterprise-join-panel">
          <header>
            <Building2 size={18} />
            <strong>{t("accountUtility.space.previewAndJoin")}</strong>
          </header>
          <form
            className="space-search-form"
            onSubmit={(event) => {
              event.preventDefault();
              handleTenantSearch();
            }}
          >
            <label className="space-search-input">
              <Search size={16} />
              <input
                value={tenantKeyword}
                onChange={(event) => {
                  setTenantKeyword(event.target.value);
                  setNotice(null);
                }}
                placeholder={t("accountUtility.space.codePlaceholder")}
              />
            </label>
            <button
              type="button"
              disabled={tenantSearchMutation.isPending || !authSession?.platformToken}
              onClick={handleTenantSearch}
            >
              {tenantSearchMutation.isPending ? t("accountUtility.space.previewing") : t("accountUtility.space.previewEnterprise")}
            </button>
          </form>
          {!authSession?.platformToken && (
            <InlineState tone="error" text={t("accountUtility.space.missingPlatformPreviewJoin")} />
          )}
          {pendingJoinRequests.length > 0 && (
            <InlineState
              text={t("accountUtility.space.pendingRequests", { count: pendingJoinRequests.length })}
            />
          )}
          {tenantSearchMutation.error && (
            <InlineState tone="error" text={t("accountUtility.space.previewFailedWithError", { error: formatError(tenantSearchMutation.error) })} />
          )}
          {!tenantPreviewStarted && (
            <div className="utility-empty space-search-empty">
              <strong>{t("accountUtility.space.previewEmptyTitle")}</strong>
              <span>{t("accountUtility.space.previewEmptyDetail")}</span>
            </div>
          )}
          {tenantPreviewStarted &&
            !tenantSearchMutation.isPending &&
            !tenantSearchMutation.error &&
            !previewTenant && (
            <div className="utility-empty space-search-empty">
              <strong>{t("accountUtility.space.notFoundTitle")}</strong>
              <span>{t("accountUtility.space.notFoundDetail")}</span>
            </div>
          )}
          {tenantSearchMutation.isPending && <InlineState text={t("accountUtility.space.previewLoading")} />}
          {previewTenant && (
            <div className="tenant-search-results">
              {(() => {
                const tenant = previewTenant;
                const isCurrentTenant = tenant.tenantId === authSession?.tenantId;
                const existingSpace = spaceByTenantId.get(tenant.tenantId);
                const canEnter = Boolean(isCurrentTenant || existingSpace || tenant.alreadyMember);
                const joinApprovalMode = tenant.joinApprovalMode === "manual" ? "manual" : "auto";
                const isJoinDisabled =
                  joinMutation.isPending ||
                  switchSpaceMutation.isPending ||
                  !authSession?.platformToken;
                return (
                  <article
                    className="tenant-search-item selected"
                    key={tenant.tenantId}
                  >
                    <PcAvatar avatarUrl={tenant.logoUrl} className="tenant-logo large" kind="tenant" name={tenant.tenantName} />
                    <div className="tenant-search-main">
                      <strong>{tenant.tenantName}</strong>
                      <span>{[tenant.tenantCode, tenant.industry].filter(Boolean).join(" · ") || tenant.tenantId}</span>
                      {tenant.tenantDescription && <p>{tenant.tenantDescription}</p>}
                      <div className="tenant-search-tags">
                        {typeof tenant.memberCount === "number" && <em>{t("accountUtility.space.memberCount", { count: tenant.memberCount })}</em>}
                        <em>
                          {joinApprovalMode === "manual"
                            ? t("accountUtility.space.manualApproval")
                            : t("accountUtility.space.autoApproval")}
                        </em>
                        {isCurrentTenant && <em>{t("accountUtility.space.currentlyUsing")}</em>}
                        {tenant.alreadyMember && <em>{t("accountUtility.space.alreadyJoined")}</em>}
                      </div>
                    </div>
                    <div className="tenant-search-actions">
                      {isCurrentTenant ? (
                        <button type="button" disabled>
                          {t("accountUtility.space.currentlyUsing")}
                        </button>
                      ) : canEnter ? (
                        <button
                          type="button"
                          disabled={switchSpaceMutation.isPending}
                          onClick={() => void handleEnterPreviewTenant(tenant)}
                        >
                          {existingSpace ? t("accountUtility.space.switchEnter") : t("accountUtility.space.enter")}
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={isJoinDisabled}
                          data-tenant-code={tenant.tenantCode}
                          onClick={() => joinMutation.mutate(tenant)}
                        >
                          {joinMutation.isPending
                            ? t("accountUtility.space.submitting")
                            : joinApprovalMode === "manual"
                              ? t("accountUtility.space.applyJoin")
                              : t("accountUtility.space.joinEnterprise")}
                        </button>
                      )}
                    </div>
                    {!canEnter && (
                      <div className="tenant-join-request">
                        <textarea
                          value={joinMessage}
                          onChange={(event) => setJoinMessage(event.target.value)}
                          placeholder={t("accountUtility.space.joinMessagePlaceholder")}
                          rows={3}
                        />
                        <button
                          type="button"
                          data-tenant-code={tenant.tenantCode}
                          disabled={isJoinDisabled}
                          onClick={() => joinMutation.mutate(tenant)}
                        >
                          {joinMutation.isPending
                            ? t("accountUtility.space.submitting")
                            : joinApprovalMode === "manual"
                              ? t("accountUtility.space.applyJoin")
                              : t("accountUtility.space.joinEnterprise")}
                        </button>
                      </div>
                    )}
                  </article>
                );
              })()}
            </div>
          )}
          </div>
          <TenantInvitationPanel isPersonalSpace={isPersonalSpace} />
        </section>
    </main>
  );
}

export function FavoritesPage() {
  const { t } = useI18n();
  const authSession = useAuthSession();
  const [category, setCategory] = useState("all");
  const [keyword, setKeyword] = useState("");
  const [imagePreview, setImagePreview] = useState<FavoriteImagePreview | null>(null);
  const summaryQuery = useQuery({
    queryKey: pcQueryKeys.accountFavoritesSummary(authSession?.apiBaseUrl, authSession?.tenantToken),
    enabled: Boolean(authSession),
    staleTime: 60_000,
    queryFn: async () => requireApiClient(authSession).getFavoriteSummary(),
  });
  const favoritesQuery = useQuery({
    queryKey: pcQueryKeys.accountFavorites(
      authSession?.apiBaseUrl,
      authSession?.tenantToken,
      50,
      category,
      keyword,
    ),
    enabled: Boolean(authSession),
    staleTime: 60_000,
    queryFn: async () =>
      requireApiClient(authSession).getFavoriteList({ limit: 50, category, keyword }),
  });
  const favorites = normalizeFavorites(favoritesQuery.data);
  const summary = summaryQuery.data;
  const tags = uniqueTags(favorites);
  const assetBaseUrl = authSession?.apiBaseUrl;
  const authToken = authSession?.tenantToken;

  const openFavoritePreview = (preview: FavoriteMediaPreview) => {
    const openUrl = preview.openUrl || preview.previewUrl;
    if (!openUrl) return;
    if (preview.kind === "image") {
      setImagePreview({
        cacheKey: preview.cacheKey,
        fileName: preview.fileName,
        src: openUrl,
      });
      return;
    }
    const cacheContext = {
      accountId: authSession?.userId,
      conversationId: preview.message.conversationId,
      fileName: preview.fileName,
    };
    void openMessageVideoPlayer(preview.message, openUrl, authToken, cacheContext)
      .then((opened) => {
        if (!opened) return openMessageMediaFile(preview.message, openUrl, authToken, cacheContext);
        return undefined;
      })
      .catch(() => openMessageMediaFile(preview.message, openUrl, authToken, cacheContext));
  };

  return (
    <main className="module-page account-utility-page favorite-utility-page">
      <section className="account-utility-hero">
        <span className="eyebrow">FAVORITES</span>
        <h1>{t("accountUtility.favorites.title")}</h1>
        <p>{t("accountUtility.favorites.subtitle")}</p>
      </section>

      <section className="favorite-summary-grid">
        {favoriteCategories.map((item) => (
          <button
            className={`favorite-metric ${category === item.key ? "selected" : ""}`}
            type="button"
            key={item.key}
            onClick={() => setCategory(item.key)}
          >
            <span>{t(item.labelKey)}</span>
            <strong>{favoriteCount(item.key, summary, favorites.length)}</strong>
          </button>
        ))}
      </section>

      <section className="account-utility-card favorite-filter-card">
        <div className="favorite-search">
          <Search size={16} />
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder={t("accountUtility.favorites.searchPlaceholder")}
          />
        </div>
        <div className="favorite-tag-list">
          <Tag size={15} />
          {tags.length === 0 ? <span>{t("accountUtility.favorites.noTags")}</span> : tags.map((tag) => <button type="button" key={tag}>{tag}</button>)}
        </div>
      </section>

      <section className="account-utility-card">
        <header>
          <Star size={18} />
          <strong>{t("accountUtility.favorites.list")}</strong>
        </header>
        {(summaryQuery.isLoading || favoritesQuery.isLoading) && <InlineState text={t("accountUtility.favorites.loading")} />}
        {(summaryQuery.error || favoritesQuery.error) && (
          <InlineState
            tone="error"
            text={t("accountUtility.favorites.loadFailed", { error: formatError(summaryQuery.error || favoritesQuery.error) })}
          />
        )}
        {!summaryQuery.isLoading && !favoritesQuery.isLoading && favorites.length === 0 && (
          <div className="utility-empty">
            <strong>{t("accountUtility.favorites.emptyTitle")}</strong>
            <span>{t("accountUtility.favorites.emptyDetail")}</span>
          </div>
        )}
        {favorites.length > 0 && (
          <div className="favorite-page-list">
            {favorites.map((item) => {
              const mediaPreview = favoriteMediaPreviewFromItem({ assetBaseUrl, item });
              return (
              <article className="favorite-page-item" key={item.favoriteId || item.messageId}>
                {mediaPreview ? (
                  <button
                    className="favorite-media-preview"
                    type="button"
                    aria-label={t("accountUtility.favorites.previewMedia", {
                      name: mediaPreview.fileName,
                    })}
                    onClick={() => openFavoritePreview(mediaPreview)}
                  >
                    {mediaPreview.previewUrl ? (
                      <img src={mediaPreview.previewUrl} alt={mediaPreview.fileName} loading="lazy" />
                    ) : (
                      <span className="favorite-media-placeholder">
                        {mediaPreview.kind === "video" ? (
                          <Play size={18} />
                        ) : (
                          favoriteIcon(item.messageType || item.favoriteCategory)
                        )}
                      </span>
                    )}
                    {mediaPreview.kind === "video" && (
                      <em className="favorite-media-video">
                        <Play size={11} />
                        {formatFavoriteMediaDuration(mediaPreview.durationSeconds)}
                      </em>
                    )}
                  </button>
                ) : (
                  <span className="favorite-type-icon">
                    {favoriteIcon(item.messageType || item.favoriteCategory)}
                  </span>
                )}
                <div>
                  <strong>{item.preview || item.conversationTitle || "--"}</strong>
                  <span>
                    {[item.conversationTitle, item.senderDisplayName, formatShortDate(item.favoritedAt)]
                      .filter(Boolean)
                      .join(" · ") || "--"}
                  </span>
                </div>
              </article>
              );
            })}
          </div>
        )}
      </section>
      {imagePreview && (
        <FavoriteImagePreviewViewer
          authToken={authToken}
          preview={imagePreview}
          onClose={() => setImagePreview(null)}
        />
      )}
    </main>
  );
}

const favoriteCategories = [
  { key: "all", labelKey: "accountUtility.favorites.category.all" },
  { key: "text", labelKey: "accountUtility.favorites.category.text" },
  { key: "image", labelKey: "accountUtility.favorites.category.image" },
  { key: "video", labelKey: "accountUtility.favorites.category.video" },
  { key: "voice", labelKey: "accountUtility.favorites.category.voice" },
  { key: "file", labelKey: "accountUtility.favorites.category.file" },
  { key: "other", labelKey: "accountUtility.favorites.category.other" },
];

function FavoriteImagePreviewViewer({
  authToken,
  onClose,
  preview,
}: {
  authToken?: string;
  onClose: () => void;
  preview: FavoriteImagePreview;
}) {
  const { displaySrc } = useCachedImageMediaUrl(preview.src, authToken, preview.cacheKey);
  return (
    <ImagePreviewViewer
      fileName={preview.fileName}
      onClosePreview={onClose}
      src={displaySrc || preview.src}
    />
  );
}

function normalizeSpaces(
  remote?: PlatformTenant[],
  fallback?: PlatformTenant[],
) {
  return mergePlatformTenants(remote, fallback);
}

function roleLabel(role?: number) {
  return authTenantRoleLabel(role);
}

function isPersonalTenantPlaceholder(tenantId?: string | null) {
  return tenantId === "11111111-1111-1111-1111-111111111111";
}

function normalizeFavorites(data?: FavoriteItemDto[] | { items?: FavoriteItemDto[] }) {
  if (Array.isArray(data)) return data;
  return data?.items ?? [];
}

function favoriteCount(
  category: string,
  summary: FavoriteSummaryDto | undefined,
  fallbackTotal: number,
) {
  if (category === "all") return summary?.totalCount ?? fallbackTotal;
  const key = `${category}Count` as keyof NonNullable<typeof summary>;
  return Number(summary?.[key] ?? 0);
}

function uniqueTags(items: FavoriteItemDto[]) {
  const tags = new Set<string>();
  items.forEach((item) => {
    [...(item.tags ?? []), ...(item.tagNames ?? [])].forEach((tag) => {
      if (tag.trim()) tags.add(tag.trim());
    });
  });
  return Array.from(tags);
}

function favoriteIcon(type?: string | null) {
  const normalized = String(type || "").toLowerCase();
  if (normalized.includes("image")) return <Image size={17} />;
  if (normalized.includes("video")) return <PlaySquare size={17} />;
  if (normalized.includes("voice") || normalized.includes("audio")) return <Mic size={17} />;
  if (normalized.includes("file")) return <FileText size={17} />;
  return <MessageSquareText size={17} />;
}

type FavoriteMediaPreview = {
  cacheKey?: string;
  durationSeconds?: number;
  fileName: string;
  kind: "image" | "video";
  message: MessageItemDto;
  openUrl?: string;
  previewUrl?: string;
};

type FavoriteImagePreview = {
  cacheKey?: string;
  fileName: string;
  src: string;
};

function favoriteMediaPreviewFromItem({
  assetBaseUrl,
  item,
}: {
  assetBaseUrl?: string;
  item: FavoriteItemDto;
}): FavoriteMediaPreview | undefined {
  const message = favoriteItemToMessage(item);
  const mediaItem = chatMediaItemsFromMessage({ assetBaseUrl, message }).find(
    (candidate): candidate is ChatMediaItem & { kind: "image" | "video" } =>
      candidate.kind === "image" || candidate.kind === "video",
  );
  if (!mediaItem) return undefined;
  return {
    durationSeconds:
      typeof mediaItem.media?.durationSeconds === "number"
        ? mediaItem.media.durationSeconds
        : undefined,
    fileName: mediaItem.fileName,
    kind: mediaItem.kind,
    cacheKey: mediaItem.kind === "image" ? mediaItem.imageCacheKey : undefined,
    message,
    openUrl: mediaItem.localOpenUrl || mediaItem.remoteSourceUrl || mediaItem.sourceUrl,
    previewUrl:
      mediaItem.kind === "video"
        ? mediaItem.posterUrl || mediaItem.localPreviewUrl || mediaItem.sourceUrl || mediaItem.remoteSourceUrl
        : mediaItem.sourceUrl || mediaItem.localPreviewUrl || mediaItem.remoteSourceUrl,
  };
}

function favoriteItemToMessage(item: FavoriteItemDto): MessageItemDto {
  const record = item as unknown as Record<string, unknown>;
  const messageType = favoriteMessageType(item, record);
  return {
    body: favoriteBodyFromRecord(item, record, messageType),
    conversationId: item.conversationId,
    messageId: item.messageId || item.favoriteId,
    messageType,
    preview: item.preview ?? "",
    senderDisplayName: item.senderDisplayName ?? undefined,
    sentAt: item.favoritedAt ?? undefined,
  };
}

function favoriteBodyFromRecord(
  item: FavoriteItemDto,
  record: Record<string, unknown>,
  messageType: string,
) {
  const explicitBody =
    objectField(record, "body") ||
    objectField(record, "messageBody") ||
    objectField(record, "contentBody") ||
    objectField(record, "payload");
  if (explicitBody) return explicitBody;
  const mediaRecord =
    objectField(record, "media") ||
    objectField(record, "resource") ||
    objectField(record, "attachment") ||
    favoriteTopLevelMediaRecord(item, record);
  if (!mediaRecord) return { text: item.preview ?? "", messageType };
  if (messageType === "video") return { messageType, video: mediaRecord };
  if (messageType === "image") return { image: mediaRecord, messageType };
  return { file: mediaRecord, messageType };
}

function favoriteMessageType(item: FavoriteItemDto, record: Record<string, unknown>) {
  const typeText = [
    item.messageType,
    item.favoriteCategory,
    stringValue(record.type),
    stringValue(record.category),
    stringValue(record.mimeType),
    stringValue(record.contentType),
    stringValue(record.mediaType),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (typeText.includes("video")) return "video";
  if (typeText.includes("image") || typeText.includes("picture") || typeText.includes("photo")) {
    return "image";
  }
  return item.messageType || item.favoriteCategory || "text";
}

function favoriteTopLevelMediaRecord(
  item: FavoriteItemDto,
  record: Record<string, unknown>,
) {
  const url = stringField(
    record,
    "url",
    "resourceUrl",
    "mediaUrl",
    "objectUrl",
    "originalUrl",
    "downloadUrl",
    "signedUrl",
    "fileUrl",
    "filePath",
    "uri",
    "path",
    "imageUrl",
    "image_url",
    "videoUrl",
    "video_url",
  );
  const thumbnailUrl = stringField(
    record,
    "thumbnailUrl",
    "thumbUrl",
    "previewUrl",
    "previewPath",
    "coverUrl",
    "cover",
    "thumbnail",
  );
  if (!url && !thumbnailUrl) return undefined;
  return {
    durationSeconds: numberValue(record.durationSeconds) ?? numberValue(record.duration),
    fileName:
      stringField(record, "fileName", "filename", "name", "originalName", "originalFileName") ||
      item.preview ||
      item.favoriteId,
    mimeType: stringField(record, "mimeType", "contentType", "mediaType"),
    sizeBytes: numberValue(record.sizeBytes) ?? numberValue(record.size) ?? numberValue(record.fileSize),
    thumbnailUrl,
    url,
  };
}

function formatFavoriteMediaDuration(durationSeconds?: number) {
  if (!durationSeconds || durationSeconds <= 0) return "";
  const totalSeconds = Math.round(durationSeconds);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function objectField(record: Record<string, unknown>, key: string) {
  const value = record[key];
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  return value as Record<string, unknown>;
}

function stringField(record: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = stringValue(record[key]);
    if (value) return value;
  }
  return undefined;
}

function stringValue(value: unknown) {
  if (typeof value === "string") {
    const text = value.trim();
    return text || undefined;
  }
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return undefined;
}

function numberValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return undefined;
}

function ChevronHint() {
  const { t } = useI18n();
  return <span className="space-page-chevron">{t("accountUtility.space.enter")}</span>;
}

function UtilityNoticeBanner({ notice }: { notice: UtilityNotice }) {
  const Icon =
    notice.tone === "success"
      ? CheckCircle2
      : notice.tone === "warning"
        ? Clock3
        : notice.tone === "error"
          ? TriangleAlert
          : Info;

  return (
    <div className={`utility-notice ${notice.tone}`} role={notice.tone === "error" ? "alert" : "status"}>
      <span className="utility-notice-icon" aria-hidden="true">
        <Icon size={17} />
      </span>
      <span className="utility-notice-copy">
        <strong>{notice.title}</strong>
        {notice.detail && <em>{notice.detail}</em>}
      </span>
    </div>
  );
}

function InlineState({ text, tone = "muted" }: { text: string; tone?: "muted" | "error" }) {
  return <p className={`utility-inline-state ${tone}`}>{text}</p>;
}

function errorNotice(title: string, detail: string): UtilityNotice {
  return {
    tone: "error",
    title,
    detail,
  };
}

type AccountUtilityTranslate = (key: string, params?: Record<string, string | number>) => string;

function tenantJoinErrorNotice(error: unknown, t: AccountUtilityTranslate): UtilityNotice {
  const message = formatError(error);
  if (isTenantJoinPendingMessage(message)) {
    return {
      tone: "warning",
      title: t("accountUtility.space.joinAlreadyPending"),
      detail: t("accountUtility.space.joinAlreadyPendingDetail"),
    };
  }
  if (message.includes("\u4f60\u5df2\u5728\u8be5\u4f01\u4e1a\u4e2d")) {
    return {
      tone: "info",
      title: t("accountUtility.space.alreadyInEnterprise"),
      detail: t("accountUtility.space.alreadyInEnterpriseDetail"),
    };
  }
  return errorNotice(t("accountUtility.space.joinFailed"), message);
}

function isTenantJoinPendingMessage(message: string) {
  return message.includes("\u5df2\u63d0\u4ea4\u52a0\u5165\u7533\u8bf7") || message.includes("\u7b49\u5f85\u7ba1\u7406\u5458\u5ba1\u6838");
}

function InfoLine({
  label,
  value,
  copyable = false,
}: {
  label: string;
  value: string;
  copyable?: boolean;
}) {
  const { t } = useI18n();
  return (
    <div className="account-info-line">
      <span>{label}</span>
      <strong>{value || "--"}</strong>
      {copyable && value && value !== "--" && (
        <button
          type="button"
          aria-label={t("accountUtility.copyLabel", { label })}
          onClick={() => void navigator.clipboard?.writeText(value).catch(() => undefined)}
        >
          <Copy size={13} />
        </button>
      )}
    </div>
  );
}
