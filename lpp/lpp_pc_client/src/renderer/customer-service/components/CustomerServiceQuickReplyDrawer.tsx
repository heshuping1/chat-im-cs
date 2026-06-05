import {
  Check,
  Copy,
  CornerDownLeft,
  MessageSquareQuote,
  Search,
  Tags,
  X,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useDeferredValue, useMemo, useRef, useState } from "react";

import type {
  CustomerServiceQuickReplyDto,
  CustomerServiceThreadType,
  QuickReplyInsertPayload,
} from "../../data/api-client";
import type { AuthSession } from "../../data/auth/auth-session";
import {
  filterQuickRepliesForScope,
  quickReplyCategory,
  quickReplyMatchesKeyword,
  quickReplyScopeForThreadType,
  type QuickReplyFilterScope,
} from "../../data/api/quick-reply-normalizers";
import { pcQueryKeys } from "../../data/query-keys";
import { createApiClient } from "../../data/runtime";
import { useI18n } from "../../i18n/useI18n";
import { formatError } from "../../lib/format";

const recentQuickReplyStorageKey = "lpp.pc.customer-service.quick-reply.recent";
const categoryFilterPrefix = "category:";

type QuickReplyFilter = "all" | "current" | "recent" | `${typeof categoryFilterPrefix}${string}`;

export interface QuickReplyPickerEmptyState {
  text: string;
  tone?: "error" | "muted";
}

export interface QuickReplyFilterItem {
  count: number;
  disabled?: boolean;
  key: QuickReplyFilter;
  label: string;
}

export interface QuickReplyPickerViewModel {
  categories: string[];
  categoryCounts: Record<string, number>;
  emptyState?: QuickReplyPickerEmptyState;
  filterItems: QuickReplyFilterItem[];
  filterLabel: string;
  scopedReplies: CustomerServiceQuickReplyDto[];
  selectedReply?: CustomerServiceQuickReplyDto;
  totalCount: number;
  visibleReplies: CustomerServiceQuickReplyDto[];
}

interface QuickReplyPickerLabels {
  all: string;
  current: string;
  currentEmpty: string;
  categoryEmpty: string;
  empty: string;
  list: string;
  loadFailed: string;
  loading: string;
  noAvailable: string;
  noMatch: string;
  recent: string;
  recentEmpty: string;
}

export function CustomerServiceQuickReplyDrawer({
  onClose,
  onInsert,
  onNotice,
  session,
  threadType,
}: {
  onClose: () => void;
  onInsert: (payload: QuickReplyInsertPayload) => void;
  onNotice: (text: string) => void;
  session?: AuthSession | null;
  threadType?: CustomerServiceThreadType | string | null;
}) {
  return (
    <CustomerServiceQuickReplyPanel
      onClose={onClose}
      onInsert={onInsert}
      onNotice={onNotice}
      session={session}
      threadType={threadType}
      variant="drawer"
    />
  );
}

export function CustomerServiceQuickReplyPanel({
  onClose,
  onInsert,
  onNotice,
  session,
  threadType,
  variant = "drawer",
}: {
  onClose: () => void;
  onInsert: (payload: QuickReplyInsertPayload) => void;
  onNotice: (text: string) => void;
  session?: AuthSession | null;
  threadType?: CustomerServiceThreadType | string | null;
  variant?: "drawer" | "panel";
}) {
  const { t } = useI18n();
  const client = useMemo(() => (session ? createApiClient(session) : null), [session]);
  const queryBaseKey = [session?.apiBaseUrl, session?.tenantToken] as const;
  const [keyword, setKeyword] = useState("");
  const deferredKeyword = useDeferredValue(keyword);
  const [filter, setFilter] = useState<QuickReplyFilter>("all");
  const [selectedId, setSelectedId] = useState("");
  const [recentIds, setRecentIds] = useState(() => readRecentQuickReplyIds());
  const listRef = useRef<HTMLDivElement | null>(null);
  const scope = quickReplyScopeForThreadType(threadType);

  const repliesQuery = useQuery({
    queryKey: pcQueryKeys.quickReplies(...queryBaseKey),
    enabled: Boolean(client),
    queryFn: async () => client!.getQuickReplies(),
  });

  const viewModel = useMemo(
    () =>
      createQuickReplyPickerViewModel({
        errorText: repliesQuery.error ? formatError(repliesQuery.error) : undefined,
        filter,
        keyword: deferredKeyword,
        labels: quickReplyPickerLabels(t),
        loading: repliesQuery.isLoading,
        recentIds,
        replies: repliesQuery.data ?? [],
        scope,
        selectedId,
      }),
    [
      filter,
      deferredKeyword,
      recentIds,
      repliesQuery.data,
      repliesQuery.error,
      repliesQuery.isLoading,
      scope,
      selectedId,
      t,
    ],
  );
  const { emptyState, filterItems, filterLabel, selectedReply, totalCount, visibleReplies } =
    viewModel;

  const selectFilter = (nextFilter: QuickReplyFilter) => {
    setFilter(nextFilter);
    setSelectedId("");
    listRef.current?.scrollTo({ top: 0 });
  };

  const insertReply = (reply: CustomerServiceQuickReplyDto) => {
    const payload = buildQuickReplyInsertPayload(reply);
    if (!payload.text.trim()) {
      onNotice(t("quickReply.noInsertableText"));
      return;
    }
    const nextRecentIds = rememberQuickReply(reply.quickReplyId);
    setRecentIds(nextRecentIds);
    onInsert(payload);
    onNotice(t("quickReply.insertedNotice"));
  };

  const copyReply = async (reply: CustomerServiceQuickReplyDto) => {
    const text = reply.content.trim();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      onNotice(t("quickReply.copiedNotice"));
    } catch (error) {
      onNotice(t("common.copyFailed", { error: formatError(error) }));
    }
  };

  return (
    <aside
      className={`cs-quick-reply-picker cs-quick-reply-picker-${variant}`}
      aria-label={t("quickReply.conversationAria")}
    >
      <header className="cs-quick-reply-head">
        <span className="cs-quick-reply-head-icon" aria-hidden="true">
          <MessageSquareQuote size={18} />
        </span>
        <div>
          <strong>{t("composer.quickReply")}</strong>
          <p>{t("quickReply.drawerSubtitle")}</p>
        </div>
        <button type="button" aria-label={t("quickReply.close")} title={t("common.close")} onClick={onClose}>
          <X size={17} />
        </button>
      </header>

      <div className="cs-quick-reply-controls">
        <form className="cs-quick-reply-search" onSubmit={(event) => event.preventDefault()}>
          <Search size={16} />
          <input
            value={keyword}
            onChange={(event) => {
              setKeyword(event.target.value);
              setSelectedId("");
            }}
            placeholder={t("quickReply.searchPlaceholder")}
          />
          <button type="button" disabled={!keyword} onClick={() => setKeyword("")}>
            {t("quickReply.clear")}
          </button>
        </form>

      </div>

      <div className="cs-quick-reply-workbench">
        <nav className="cs-quick-reply-filter-rail" aria-label={t("quickReply.categoryAria")}>
          {filterItems.map((item) => (
            <FilterButton
              key={item.key}
              active={filter === item.key}
              count={item.count}
              disabled={item.disabled}
              label={item.label}
              onClick={() => selectFilter(item.key)}
            />
          ))}
        </nav>

        <section className="cs-quick-reply-list-zone">
          <div className="cs-quick-reply-section-head">
            <strong>{filterLabel}</strong>
            <span>{t("quickReply.count", { visible: visibleReplies.length, total: totalCount })}</span>
          </div>
          {emptyState ? (
            <QuickReplyState text={emptyState.text} error={emptyState.tone === "error"} />
          ) : (
            <div className="cs-quick-reply-list" ref={listRef}>
              {visibleReplies.map((reply) => (
                <QuickReplyCard
                  key={reply.quickReplyId}
                  active={selectedReply?.quickReplyId === reply.quickReplyId}
                  reply={reply}
                  onSelect={() => setSelectedId(reply.quickReplyId)}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="cs-quick-reply-preview">
        {selectedReply ? (
          <>
            <div className="cs-quick-reply-preview-title">
              <strong>{selectedReply.title}</strong>
              <span>{quickReplyCategory(selectedReply)}</span>
            </div>
            <p>{selectedReply.content || t("knowledge.noPreview")}</p>
            <div className="cs-quick-reply-actions">
              <button type="button" onClick={() => insertReply(selectedReply)}>
                <CornerDownLeft size={15} />
                {t("aiDraft.insertReply")}
              </button>
              <button
                className="secondary"
                type="button"
                disabled={!selectedReply.content.trim()}
                onClick={() => void copyReply(selectedReply)}
              >
                <Copy size={15} />
                {t("common.copy")}
              </button>
              <button className="ghost" type="button" onClick={onClose}>
                {t("knowledge.backToConversation")}
              </button>
            </div>
          </>
        ) : (
          <QuickReplyState text={t("quickReply.previewEmpty")} />
        )}
      </section>
    </aside>
  );
}

export function createQuickReplyPickerViewModel({
  errorText,
  filter,
  keyword,
  labels = defaultQuickReplyPickerLabels,
  loading = false,
  recentIds,
  replies,
  scope,
  selectedId,
}: {
  errorText?: string;
  filter: QuickReplyFilter;
  keyword: string;
  labels?: QuickReplyPickerLabels;
  loading?: boolean;
  recentIds: string[];
  replies: CustomerServiceQuickReplyDto[];
  scope?: QuickReplyFilterScope | null;
  selectedId?: string;
}): QuickReplyPickerViewModel {
  const scopedReplies = filterQuickRepliesForScope(replies, scope);
  const categoryCounts = countQuickReplyCategories(scopedReplies);
  const categories = Object.keys(categoryCounts);
  const normalizedKeyword = keyword.trim();
  const searchedReplies = scopedReplies.filter((reply) =>
    quickReplyMatchesKeyword(reply, normalizedKeyword),
  );
  const visibleReplies = filterVisibleReplies({
    filter,
    recentIds,
    replies: searchedReplies,
    scope,
  });
  const selectedReply =
    visibleReplies.find((reply) => reply.quickReplyId === selectedId) ?? visibleReplies[0];
  const filterItems = createQuickReplyFilterItems({
    categories,
    categoryCounts,
    labels,
    recentIds,
    scope,
    scopedReplies,
  });
  const filterLabel = filterItems.find((item) => item.key === filter)?.label ?? labels.list;

  return {
    categories,
    categoryCounts,
    emptyState: createQuickReplyEmptyState({
      errorText,
      filter,
      keyword: normalizedKeyword,
      labels,
      loading,
      scopedCount: scopedReplies.length,
      visibleCount: visibleReplies.length,
    }),
    filterItems,
    filterLabel,
    scopedReplies,
    selectedReply,
    totalCount: scopedReplies.length,
    visibleReplies,
  };
}

function QuickReplyCard({
  active,
  onSelect,
  reply,
}: {
  active: boolean;
  onSelect: () => void;
  reply: CustomerServiceQuickReplyDto;
}) {
  const category = quickReplyCategory(reply);
  const tags = reply.tags?.slice(0, 2) ?? [];
  return (
    <button
      className={`cs-quick-reply-item ${active ? "active" : ""}`}
      type="button"
      aria-pressed={active}
      onClick={onSelect}
    >
      <span className="cs-quick-reply-marker" aria-hidden="true">
        {active ? <Check size={13} /> : <Tags size={13} />}
      </span>
      <span className="cs-quick-reply-copy">
        <span className="cs-quick-reply-title-row">
          <strong>{reply.title}</strong>
          <em>{category}</em>
        </span>
        <p>{reply.content}</p>
        {tags.length > 0 && (
          <span className="cs-quick-reply-tags">
            {tags.map((tag) => (
              <small key={tag}>{tag}</small>
            ))}
          </span>
        )}
      </span>
    </button>
  );
}

function FilterButton({
  active,
  count,
  disabled = false,
  label,
  onClick,
}: {
  active: boolean;
  count: number;
  disabled?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={active ? "active" : ""}
      disabled={disabled}
      type="button"
      title={label}
      onClick={onClick}
    >
      <span>{label}</span>
      <em>{count > 99 ? "99+" : count}</em>
    </button>
  );
}

function QuickReplyState({ text, error = false }: { text: string; error?: boolean }) {
  return <div className={`cs-quick-reply-state ${error ? "error" : ""}`}>{text}</div>;
}

function filterVisibleReplies({
  filter,
  recentIds,
  replies,
  scope,
}: {
  filter: QuickReplyFilter;
  recentIds: string[];
  replies: CustomerServiceQuickReplyDto[];
  scope?: QuickReplyFilterScope | null;
}) {
  if (filter === "all") return replies;
  if (filter === "current") {
    if (!scope) return [];
    return replies.filter((reply) => reply.scope === scope || reply.scope === "all");
  }
  if (filter === "recent") {
    return recentIds
      .map((id) => replies.find((reply) => reply.quickReplyId === id))
      .filter((reply): reply is CustomerServiceQuickReplyDto => Boolean(reply));
  }
  if (filter.startsWith(categoryFilterPrefix)) {
    const category = filter.slice(categoryFilterPrefix.length);
    return replies.filter((reply) => quickReplyCategory(reply) === category);
  }
  return replies;
}

function countQuickReplyCategories(replies: CustomerServiceQuickReplyDto[]) {
  return replies.reduce<Record<string, number>>((counts, reply) => {
    const category = quickReplyCategory(reply);
    if (!category) return counts;
    counts[category] = (counts[category] ?? 0) + 1;
    return counts;
  }, {});
}

function createQuickReplyFilterItems({
  categories,
  categoryCounts,
  labels,
  recentIds,
  scope,
  scopedReplies,
}: {
  categories: string[];
  categoryCounts: Record<string, number>;
  labels: QuickReplyPickerLabels;
  recentIds: string[];
  scope?: QuickReplyFilterScope | null;
  scopedReplies: CustomerServiceQuickReplyDto[];
}): QuickReplyFilterItem[] {
  const currentCount = scope
    ? scopedReplies.filter((reply) => reply.scope === scope || reply.scope === "all").length
    : 0;
  const availableIds = new Set(scopedReplies.map((reply) => reply.quickReplyId));
  const recentCount = recentIds.filter((id) => availableIds.has(id)).length;

  return [
    { count: scopedReplies.length, key: "all", label: labels.all },
    { count: currentCount, disabled: !scope, key: "current", label: labels.current },
    { count: recentCount, disabled: recentCount === 0, key: "recent", label: labels.recent },
    ...categories.map((category) => ({
      count: categoryCounts[category] ?? 0,
      key: categoryFilter(category),
      label: category,
    })),
  ];
}

function createQuickReplyEmptyState({
  errorText,
  filter,
  keyword,
  labels,
  loading,
  scopedCount,
  visibleCount,
}: {
  errorText?: string;
  filter: QuickReplyFilter;
  keyword: string;
  labels: QuickReplyPickerLabels;
  loading: boolean;
  scopedCount: number;
  visibleCount: number;
}): QuickReplyPickerEmptyState | undefined {
  if (loading) return { text: labels.loading };
  if (errorText) return { text: labels.loadFailed.replace("{error}", errorText), tone: "error" };
  if (scopedCount === 0) return { text: labels.noAvailable };
  if (visibleCount > 0) return undefined;
  if (keyword) return { text: labels.noMatch.replace("{keyword}", keyword) };
  if (filter === "recent") return { text: labels.recentEmpty };
  if (filter === "current") return { text: labels.currentEmpty };
  if (filter.startsWith(categoryFilterPrefix)) {
    return { text: labels.categoryEmpty.replace("{category}", filter.slice(categoryFilterPrefix.length)) };
  }
  return { text: labels.empty };
}

function quickReplyPickerLabels(
  t: (key: string, params?: Record<string, string | number>) => string,
): QuickReplyPickerLabels {
  return {
    all: t("quickReply.filter.all"),
    current: t("quickReply.filter.current"),
    currentEmpty: t("quickReply.empty.current"),
    categoryEmpty: t("quickReply.empty.category", { category: "{category}" }),
    empty: t("quickReply.empty.default"),
    list: t("quickReply.list"),
    loadFailed: t("quickReply.loadFailed", { error: "{error}" }),
    loading: t("quickReply.loading"),
    noAvailable: t("quickReply.empty.noAvailable"),
    noMatch: t("quickReply.empty.noMatch", { keyword: "{keyword}" }),
    recent: t("quickReply.filter.recent"),
    recentEmpty: t("quickReply.empty.recent"),
  };
}

const defaultQuickReplyPickerLabels: QuickReplyPickerLabels = {
  all: "全部",
  current: "当前场景",
  currentEmpty: "当前场景暂无可用话术。",
  categoryEmpty: "“{category}”分类暂无可用话术。",
  empty: "暂无匹配话术。",
  list: "话术列表",
  loadFailed: "话术加载失败：{error}",
  loading: "正在读取快捷话术...",
  noAvailable: "当前会话暂无可用话术。",
  noMatch: "没有匹配“{keyword}”的话术。",
  recent: "最近使用",
  recentEmpty: "最近使用的话术暂不可用。",
};

function categoryFilter(category: string): QuickReplyFilter {
  return `${categoryFilterPrefix}${category}`;
}

function buildQuickReplyInsertPayload(
  reply: CustomerServiceQuickReplyDto,
): QuickReplyInsertPayload {
  return {
    quickReplyId: reply.quickReplyId,
    title: reply.title,
    text: reply.content,
    category: reply.category,
    tags: reply.tags,
    scope: reply.scope,
  };
}

function readRecentQuickReplyIds() {
  try {
    const storage = typeof window === "undefined" ? null : window.localStorage;
    const parsed = JSON.parse(storage?.getItem(recentQuickReplyStorageKey) ?? "[]");
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string").slice(0, 12)
      : [];
  } catch {
    return [];
  }
}

function rememberQuickReply(quickReplyId: string) {
  const next = [
    quickReplyId,
    ...readRecentQuickReplyIds().filter((item) => item !== quickReplyId),
  ].slice(0, 12);
  try {
    const storage = typeof window === "undefined" ? null : window.localStorage;
    storage?.setItem(recentQuickReplyStorageKey, JSON.stringify(next));
  } catch {
    // Recent usage is best-effort local convenience.
  }
  return next;
}
