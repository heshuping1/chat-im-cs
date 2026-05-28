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
  type PlatformTenant,
} from "../data/api-client";
import { pcQueryKeys } from "../data/query-keys";
import { createTraceId } from "../data/runtime";
import { requireApiClient } from "../data/runtime";
import { useWorkspaceStore } from "../data/store";
import { formatError, formatShortDate } from "../lib/format";
import { PcAvatar } from "./PcAvatar";

export function EnterpriseSwitchPage() {
  const queryClient = useQueryClient();
  const authSession = useWorkspaceStore((state) => state.authSession);
  const setAuthSession = useWorkspaceStore((state) => state.setAuthSession);
  const clearAuthSession = useWorkspaceStore((state) => state.clearAuthSession);
  const [joinCode, setJoinCode] = useState("");
  const [joinMessage, setJoinMessage] = useState("");
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
        roleLabel: space ? roleLabel(space.membershipRole) : "个人空间",
      });
      await queryClient.invalidateQueries();
      setNotice("空间已切换");
    },
    onError: (error) => setNotice(`空间切换失败：${formatError(error)}`),
  });
  const joinMutation = useMutation({
    mutationFn: async () => {
      if (!joinCode.trim()) throw new Error("请输入企业码");
      return requireApiClient(authSession).joinTenantByCode({
        tenantCode: joinCode,
        message: joinMessage,
      });
    },
    onSuccess: async (result) => {
      setNotice(result.accessToken ? "已加入企业并可切换进入" : "申请已提交，等待管理员审核");
      setJoinCode("");
      setJoinMessage("");
      await spacesQuery.refetch();
    },
    onError: (error) => setNotice(`加入企业失败：${formatError(error)}`),
  });

  return (
    <main className="module-page account-utility-page">
      <section className="account-utility-hero">
        <span className="eyebrow">SPACES</span>
        <h1>空间切换</h1>
        <p>可在个人空间和企业空间之间切换，也可以通过企业码申请加入企业。</p>
      </section>
      {notice && <p className="utility-inline-state">{notice}</p>}

      <section className="account-utility-card">
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
        <InfoLine label="空间码" value={tenantCode} copyable />
        <InfoLine label="空间 ID" value={tenantId} copyable={tenantId !== "--"} />
        <InfoLine label="当前角色" value={authSession?.roleLabel || "成员"} />
      </section>

      <section className="account-utility-card">
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
                <em>{space.tenantCode || space.tenantId}</em>
              </span>
              {space.tenantId === authSession?.tenantId ? <Check size={16} /> : <ChevronHint />}
            </button>
          ))}
        </div>
      </section>

      <section className="account-utility-card">
        <header>
          <Building2 size={18} />
          <strong>加入企业</strong>
        </header>
        <div className="space-join-form">
          <input
            value={joinCode}
            onChange={(event) => setJoinCode(event.target.value)}
            placeholder="输入企业码"
          />
          <input
            value={joinMessage}
            onChange={(event) => setJoinMessage(event.target.value)}
            placeholder="申请说明，可选"
          />
          <button
            type="button"
            disabled={joinMutation.isPending || !authSession?.platformToken}
            onClick={() => joinMutation.mutate()}
          >
            {joinMutation.isPending ? "提交中" : "申请加入"}
          </button>
        </div>
      </section>
    </main>
  );
}

export function FavoritesPage() {
  const authSession = useWorkspaceStore((state) => state.authSession);
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
