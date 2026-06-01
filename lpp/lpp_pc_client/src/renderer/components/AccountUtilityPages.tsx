import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Building2,
  Check,
  Copy,
  Star,
  FileText,
  Image,
  MessageSquareText,
  Mic,
  PlaySquare,
  Search,
  Tag,
  UserRound,
} from "lucide-react";
import {
  ApiClient,
  type FavoriteItemDto,
  type FavoriteSummaryDto,
  type PlatformJoinResultDto,
  type PlatformTenant,
  type TenantCodePreviewDto,
} from "../data/api-client";
import { useAuthSession, useSetAuthSession } from "../data/auth/auth-store";
import { pcQueryKeys } from "../data/query-keys";
import { createTraceId } from "../data/runtime";
import { requireApiClient } from "../data/runtime";
import { formatError, formatShortDate } from "../lib/format";
import { PcAvatar } from "./PcAvatar";

export function EnterpriseSwitchPage() {
  const queryClient = useQueryClient();
  const authSession = useAuthSession();
  const setAuthSession = useSetAuthSession();
  const [tenantKeyword, setTenantKeyword] = useState("");
  const [joinMessage, setJoinMessage] = useState("");
  const [tenantPreviewStarted, setTenantPreviewStarted] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const tenantInfoQuery = useQuery({
    queryKey: pcQueryKeys.accountTenant(authSession?.apiBaseUrl, authSession?.tenantToken),
    enabled: Boolean(authSession),
    staleTime: 60_000,
    queryFn: async () => requireApiClient(authSession).getTenantInfo(),
  });
  const spacesQuery = useQuery({
    queryKey: pcQueryKeys.accountSpaces(authSession?.apiBaseUrl, authSession?.platformToken),
    enabled: Boolean(authSession?.platformToken),
    staleTime: 60_000,
    queryFn: async () => requireApiClient(authSession).getPlatformTenants(),
  });
  const tenantInfo = tenantInfoQuery.data;
  const tenantName = tenantInfo?.tenantName || authSession?.tenantName || "当前企业";
  const tenantCode = tenantInfo?.tenantCode || authSession?.tenantCode || "--";
  const tenantId = tenantInfo?.tenantId || authSession?.tenantId || "--";
  const logoUrl = tenantInfo?.logoUrl ?? authSession?.tenantLogoUrl;
  const spaces = useMemo(
    () => normalizeSpaces(spacesQuery.data, authSession?.tenants),
    [authSession?.tenants, spacesQuery.data],
  );
  const spaceByTenantId = useMemo(() => {
    const map = new Map<string, PlatformTenant>();
    spaces.forEach((space) => map.set(space.tenantId, space));
    return map;
  }, [spaces]);
  const switchSpaceMutation = useMutation({
    mutationFn: async (space: PlatformTenant | "personal") => {
      if (!authSession?.platformToken) {
        throw new Error("当前登录未保留平台会话，请重新登录后切换空间");
      }
      const client = new ApiClient({
        baseUrl: authSession.apiBaseUrl,
        platformToken: authSession.platformToken,
        traceId: createTraceId("pc-space"),
      });
      const tenant =
        space === "personal"
          ? await client.selectPersonalSpace()
          : await client.selectTenant(space.tenantId);
      const sessionClient = new ApiClient({
        baseUrl: authSession.apiBaseUrl,
        tenantToken: tenant.accessToken,
        platformToken: authSession.platformToken,
        traceId: createTraceId("pc-space-profile"),
      });
      const [profile, currentTenant] = await Promise.all([
        sessionClient.getMyProfile().catch(() => null),
        sessionClient.getTenantInfo().catch(() => null),
      ]);
      return {
        tenant,
        space: space === "personal" ? null : space,
        profile,
        currentTenant,
      };
    },
    onSuccess: async ({ tenant, space, profile, currentTenant }) => {
      if (!authSession) return;
      setAuthSession({
        ...authSession,
        tenantToken: tenant.accessToken,
        refreshToken: tenant.refreshToken,
        tenantId: tenant.tenantId,
        tenantCode: currentTenant?.tenantCode ?? space?.tenantCode,
        tenantName:
          currentTenant?.tenantName ??
          space?.tenantName ??
          (tenant.tenantId ? "个人空间" : authSession.tenantName),
        tenantLogoUrl: currentTenant?.logoUrl ?? space?.logoUrl,
        userId: profile?.userId ?? tenant.userId,
        platformUserId: profile?.platformUserId ?? tenant.platformUserId,
        lppId: profile?.lppId ?? tenant.lppId,
        displayName: profile?.displayName ?? tenant.displayName,
        avatarUrl: profile?.avatarUrl ?? tenant.avatarUrl,
        userType: profile?.userType ?? authSession.userType,
        membershipRole: space ? space.membershipRole : undefined,
        spaceType: space ? 2 : 1,
        roleLabel: space ? roleLabel(space.membershipRole) : "个人空间",
      });
      await queryClient.invalidateQueries();
      setNotice("空间已切换");
    },
    onError: (error) => setNotice(`空间切换失败：${formatError(error)}`),
  });
  const tenantSearchMutation = useMutation({
    mutationFn: async (code: string) => {
      if (!authSession?.platformToken) {
        throw new Error("当前登录未保留平台会话，请重新登录后预览企业");
      }
      return requireApiClient(authSession).previewTenantByCode(code);
    },
    onSuccess: () => {
      setJoinMessage("");
    },
    onError: (error) => setNotice(`企业码预览失败：${formatError(error)}`),
  });
  const joinMutation = useMutation({
    mutationFn: async (tenant: TenantCodePreviewDto) => {
      if (!authSession?.platformToken) {
        throw new Error("当前登录未保留平台会话，请重新登录后加入企业");
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
        setNotice("已加入企业并进入空间");
        return;
      }
      setNotice("申请已提交，等待管理员审核");
      await spacesQuery.refetch();
    },
    onError: (error) => setNotice(`加入企业失败：${formatError(error)}`),
  });
  const previewTenant = tenantSearchMutation.data ?? null;
  const handleTenantSearch = () => {
    const code = tenantKeyword.trim();
    if (!code) {
      setNotice("请输入企业码后再预览");
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
    setNotice("已是成员，但本地空间列表暂未刷新出该企业，请刷新或重新登录后进入");
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
          <h1>空间切换</h1>
          <p>管理个人空间和企业空间，加入企业前先查询并确认目标企业。</p>
        </div>
        <div className="space-hero-summary">
          <span>当前账号</span>
          <strong>{authSession?.displayName || "--"}</strong>
          <em>{authSession?.lppId ?? authSession?.platformUserId ?? "--"}</em>
        </div>
      </section>
      {notice && <p className="utility-inline-state">{notice}</p>}

      <section className="account-utility-card enterprise-space-panel">
          <header>
            <Building2 size={18} />
            <strong>当前空间</strong>
          </header>
          {tenantInfoQuery.isLoading && <InlineState text="正在读取企业信息..." />}
          {tenantInfoQuery.error && (
            <InlineState tone="error" text={`企业信息加载失败：${formatError(tenantInfoQuery.error)}`} />
          )}
          <div className="enterprise-current-card">
            <PcAvatar avatarUrl={logoUrl} className="tenant-logo large" kind="tenant" name={tenantName} />
            <div>
              <strong>{tenantName}</strong>
              <span>{tenantCode}</span>
            </div>
            <span className="current-pill">当前使用中</span>
          </div>
          <div className="enterprise-current-meta">
            <InfoLine label="空间码" value={tenantCode} copyable />
            <InfoLine label="空间 ID" value={tenantId} copyable={tenantId !== "--"} />
            <InfoLine label="当前角色" value={authSession?.roleLabel || "成员"} />
          </div>

          <div className="space-panel-section">
            <header>
              <Building2 size={18} />
              <strong>可切换空间</strong>
            </header>
            {!authSession?.platformToken && (
              <InlineState tone="error" text="当前会话缺少平台 Token，请重新登录后切换空间。" />
            )}
            {spacesQuery.isLoading && <InlineState text="正在读取空间列表..." />}
            {spacesQuery.error && (
              <InlineState tone="error" text={`空间列表加载失败：${formatError(spacesQuery.error)}`} />
            )}
            <div className="space-page-list">
              <button
                className="space-page-item"
                type="button"
                disabled={switchSpaceMutation.isPending || !authSession?.platformToken}
                onClick={() => switchSpaceMutation.mutate("personal")}
              >
                <PcAvatar className="tenant-logo large" kind="person" name={authSession?.displayName ?? "我"} />
                <span>
                  <strong>个人空间</strong>
                  <em>{authSession?.lppId ?? authSession?.platformUserId ?? "--"}</em>
                </span>
                {authSession?.roleLabel === "个人空间" ? <Check size={16} /> : <ChevronHint />}
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
            <strong>企业码预览并加入</strong>
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
                placeholder="输入企业码"
              />
            </label>
            <button
              type="button"
              disabled={tenantSearchMutation.isPending || !authSession?.platformToken}
              onClick={handleTenantSearch}
            >
              {tenantSearchMutation.isPending ? "预览中" : "预览企业"}
            </button>
          </form>
          {!authSession?.platformToken && (
            <InlineState tone="error" text="当前会话缺少平台 Token，请重新登录后预览和加入企业。" />
          )}
          {tenantSearchMutation.error && (
            <InlineState tone="error" text={`企业码预览失败：${formatError(tenantSearchMutation.error)}`} />
          )}
          {!tenantPreviewStarted && (
            <div className="utility-empty space-search-empty">
              <strong>先输入企业码预览企业</strong>
              <span>确认企业名称、审批方式和成员状态后，再提交加入申请。</span>
            </div>
          )}
          {tenantPreviewStarted &&
            !tenantSearchMutation.isPending &&
            !tenantSearchMutation.error &&
            !previewTenant && (
            <div className="utility-empty space-search-empty">
              <strong>未找到该企业码</strong>
              <span>请确认企业码是否完整。企业码精确匹配，大小写由服务端兼容。</span>
            </div>
          )}
          {tenantSearchMutation.isPending && <InlineState text="正在预览企业..." />}
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
                        {typeof tenant.memberCount === "number" && <em>{tenant.memberCount} 人</em>}
                        <em>
                          {joinApprovalMode === "manual"
                            ? "申请后需管理员审批"
                            : "确认后可直接加入"}
                        </em>
                        {isCurrentTenant && <em>当前使用中</em>}
                        {tenant.alreadyMember && <em>已加入</em>}
                      </div>
                    </div>
                    <div className="tenant-search-actions">
                      {isCurrentTenant ? (
                        <button type="button" disabled>
                          当前使用中
                        </button>
                      ) : canEnter ? (
                        <button
                          type="button"
                          disabled={switchSpaceMutation.isPending}
                          onClick={() => void handleEnterPreviewTenant(tenant)}
                        >
                          {existingSpace ? "切换进入" : "进入"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={isJoinDisabled}
                          data-tenant-code={tenant.tenantCode}
                          onClick={() => joinMutation.mutate(tenant)}
                        >
                          {joinMutation.isPending
                            ? "提交中"
                            : joinApprovalMode === "manual"
                              ? "申请加入"
                              : "加入企业"}
                        </button>
                      )}
                    </div>
                    {!canEnter && (
                      <div className="tenant-join-request">
                        <textarea
                          value={joinMessage}
                          onChange={(event) => setJoinMessage(event.target.value)}
                          placeholder="申请说明，可选"
                          rows={3}
                        />
                        <button
                          type="button"
                          data-tenant-code={tenant.tenantCode}
                          disabled={isJoinDisabled}
                          onClick={() => joinMutation.mutate(tenant)}
                        >
                          {joinMutation.isPending
                            ? "提交中"
                            : joinApprovalMode === "manual"
                              ? "申请加入"
                              : "加入企业"}
                        </button>
                      </div>
                    )}
                  </article>
                );
              })()}
            </div>
          )}
          </div>
        </section>
    </main>
  );
}

export function FavoritesPage() {
  const authSession = useAuthSession();
  const [category, setCategory] = useState("all");
  const [keyword, setKeyword] = useState("");
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

  return (
    <main className="module-page account-utility-page">
      <section className="account-utility-hero">
        <span className="eyebrow">FAVORITES</span>
        <h1>收藏</h1>
        <p>按 App 口径统一查看文字、图片、视频、语音、文件、其他收藏和标签。</p>
      </section>

      <section className="favorite-summary-grid">
        {favoriteCategories.map((item) => (
          <button
            className={`favorite-metric ${category === item.key ? "selected" : ""}`}
            type="button"
            key={item.key}
            onClick={() => setCategory(item.key)}
          >
            <span>{item.label}</span>
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
            placeholder="搜索收藏内容、会话、发送人"
          />
        </div>
        <div className="favorite-tag-list">
          <Tag size={15} />
          {tags.length === 0 ? <span>暂无标签</span> : tags.map((tag) => <button type="button" key={tag}>{tag}</button>)}
        </div>
      </section>

      <section className="account-utility-card">
        <header>
          <Star size={18} />
          <strong>收藏列表</strong>
        </header>
        {(summaryQuery.isLoading || favoritesQuery.isLoading) && <InlineState text="正在读取收藏..." />}
        {(summaryQuery.error || favoritesQuery.error) && (
          <InlineState
            tone="error"
            text={`收藏加载失败：${formatError(summaryQuery.error || favoritesQuery.error)}`}
          />
        )}
        {!summaryQuery.isLoading && !favoritesQuery.isLoading && favorites.length === 0 && (
          <div className="utility-empty">
            <strong>暂无收藏内容</strong>
            <span>服务端当前返回为空。</span>
          </div>
        )}
        {favorites.length > 0 && (
          <div className="favorite-page-list">
            {favorites.map((item) => (
              <article className="favorite-page-item" key={item.favoriteId || item.messageId}>
                <span className="favorite-type-icon">
                  {favoriteIcon(item.messageType || item.favoriteCategory)}
                </span>
                <div>
                  <strong>{item.preview || item.conversationTitle || "--"}</strong>
                  <span>
                    {[item.conversationTitle, item.senderDisplayName, formatShortDate(item.favoritedAt)]
                      .filter(Boolean)
                      .join(" · ") || "--"}
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

const favoriteCategories = [
  { key: "all", label: "全部" },
  { key: "text", label: "文字" },
  { key: "image", label: "图片" },
  { key: "video", label: "视频" },
  { key: "voice", label: "语音" },
  { key: "file", label: "文件" },
  { key: "other", label: "其他" },
];

function normalizeSpaces(
  remote?: PlatformTenant[],
  fallback?: PlatformTenant[],
) {
  const map = new Map<string, PlatformTenant>();
  [...(fallback ?? []), ...(remote ?? [])].forEach((item) => {
    if (item.tenantId) map.set(item.tenantId, item);
  });
  return Array.from(map.values());
}

function roleLabel(role?: number) {
  if (role === 4) return "所有者";
  if (role === 3) return "管理员";
  if (role === 2) return "客服";
  if (role === 1) return "技术支持";
  return "成员";
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

function ChevronHint() {
  return <span className="space-page-chevron">进入</span>;
}

function InlineState({ text, tone = "muted" }: { text: string; tone?: "muted" | "error" }) {
  return <p className={`utility-inline-state ${tone}`}>{text}</p>;
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
  return (
    <div className="account-info-line">
      <span>{label}</span>
      <strong>{value || "--"}</strong>
      {copyable && value && value !== "--" && (
        <button
          type="button"
          aria-label={`复制${label}`}
          onClick={() => void navigator.clipboard?.writeText(value).catch(() => undefined)}
        >
          <Copy size={13} />
        </button>
      )}
    </div>
  );
}
