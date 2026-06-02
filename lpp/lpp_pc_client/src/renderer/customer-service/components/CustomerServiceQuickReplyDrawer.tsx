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
      onNotice("这条话术暂无可插入文本。");
      return;
    }
    const nextRecentIds = rememberQuickReply(reply.quickReplyId);
    setRecentIds(nextRecentIds);
    onInsert(payload);
    onNotice("话术已插入输入框，发送前请确认。");
  };

  const copyReply = async (reply: CustomerServiceQuickReplyDto) => {
    const text = reply.content.trim();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      onNotice("话术已复制。");
    } catch (error) {
      onNotice(`复制失败：${formatError(error)}`);
    }
  };

  return (
    <aside
      className={`cs-quick-reply-picker cs-quick-reply-picker-${variant}`}
      aria-label="会话话术"
    >
      <header className="cs-quick-reply-head">
        <span className="cs-quick-reply-head-icon" aria-hidden="true">
          <MessageSquareQuote size={18} />
        </span>
        <div>
          <strong>快捷话术</strong>
          <p>选择企业标准回复，插入后仍可编辑再发送</p>
        </div>
        <button type="button" aria-label="关闭快捷话术" title="关闭" onClick={onClose}>
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
            placeholder="搜索标题、内容、分类或标签"
          />
          <button type="button" disabled={!keyword} onClick={() => setKeyword("")}>
            清空
          </button>
        </form>

      </div>

      <div className="cs-quick-reply-workbench">
        <nav className="cs-quick-reply-filter-rail" aria-label="话术分类">
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
            <span>{visibleReplies.length} / {totalCount} 条</span>
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
            <p>{selectedReply.content || "暂无内容预览"}</p>
            <div className="cs-quick-reply-actions">
              <button type="button" onClick={() => insertReply(selectedReply)}>
                <CornerDownLeft size={15} />
                插入回复
              </button>
              <button
                className="secondary"
                type="button"
                disabled={!selectedReply.content.trim()}
                onClick={() => void copyReply(selectedReply)}
              >
                <Copy size={15} />
                复制
              </button>
              <button className="ghost" type="button" onClick={onClose}>
                回到会话
              </button>
            </div>
          </>
        ) : (
          <QuickReplyState text="选择一条话术后预览内容。" />
        )}
      </section>
    </aside>
  );
}

export function createQuickReplyPickerViewModel({
  errorText,
  filter,
  keyword,
  loading = false,
  recentIds,
  replies,
  scope,
  selectedId,
}: {
  errorText?: string;
  filter: QuickReplyFilter;
  keyword: string;
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
    recentIds,
    scope,
    scopedReplies,
  });
  const filterLabel = filterItems.find((item) => item.key === filter)?.label ?? "话术列表";

  return {
    categories,
    categoryCounts,
    emptyState: createQuickReplyEmptyState({
      errorText,
      filter,
      keyword: normalizedKeyword,
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
  recentIds,
  scope,
  scopedReplies,
}: {
  categories: string[];
  categoryCounts: Record<string, number>;
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
    { count: scopedReplies.length, key: "all", label: "全部" },
    { count: currentCount, disabled: !scope, key: "current", label: "当前场景" },
    { count: recentCount, disabled: recentCount === 0, key: "recent", label: "最近使用" },
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
  loading,
  scopedCount,
  visibleCount,
}: {
  errorText?: string;
  filter: QuickReplyFilter;
  keyword: string;
  loading: boolean;
  scopedCount: number;
  visibleCount: number;
}): QuickReplyPickerEmptyState | undefined {
  if (loading) return { text: "正在读取快捷话术..." };
  if (errorText) return { text: `话术加载失败：${errorText}`, tone: "error" };
  if (scopedCount === 0) return { text: "当前会话暂无可用话术。" };
  if (visibleCount > 0) return undefined;
  if (keyword) return { text: `没有匹配“${keyword}”的话术。` };
  if (filter === "recent") return { text: "最近使用的话术暂不可用。" };
  if (filter === "current") return { text: "当前场景暂无可用话术。" };
  if (filter.startsWith(categoryFilterPrefix)) {
    return { text: `“${filter.slice(categoryFilterPrefix.length)}”分类暂无可用话术。` };
  }
  return { text: "暂无匹配话术。" };
}

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
