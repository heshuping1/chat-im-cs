import {
  Bot,
  BookOpenText,
  BrainCircuit,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  FileSearch,
  Loader2,
  MessageSquareText,
  Search,
  Send,
  Sparkles,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import type {
  AiSuggestionDto,
  CustomerServiceThread,
  KnowledgeSearchResultDto,
} from "../data/api-client";
import {
  isTerminalCustomerServiceThreadStatus,
  normalizeCustomerServiceThreadType,
  staffServiceHistoryItemToThread,
} from "../data/api-client";
import { pcQueryKeys } from "../data/query-keys";
import { createApiClient } from "../data/runtime";
import { useWorkspaceStore } from "../data/store";
import { formatError, formatMonthDayTime } from "../lib/format";

const quickPrompts = [
  "客户临时订单未到账，应该先确认哪些信息？",
  "客户问 KYC 审核失败，客服怎么回复？",
  "客户投诉出金慢，处理步骤是什么？",
];

export function AiAssistantPage() {
  const session = useWorkspaceStore((state) => state.authSession);
  const activeThreadId = useWorkspaceStore((state) => state.activeThreadId);
  const setActiveModule = useWorkspaceStore((state) => state.setActiveModule);
  const queryClient = useQueryClient();
  const [prompt, setPrompt] = useState("");
  const [submittedPrompt, setSubmittedPrompt] = useState("");
  const [selectedThreadId, setSelectedThreadId] = useState(activeThreadId);
  const [notice, setNotice] = useState<string | null>(null);
  const client = useMemo(() => (session ? createApiClient(session) : null), [session]);
  const queryBaseKey = [session?.apiBaseUrl, session?.tenantToken] as const;

  const threadsQuery = useQuery({
    queryKey: pcQueryKeys.customerServiceThreads(...queryBaseKey),
    enabled: Boolean(client),
    queryFn: async () => client!.getWorkbenchThreads(),
  });
  const historyQuery = useQuery({
    queryKey: pcQueryKeys.customerServiceHistory(...queryBaseKey, 20),
    enabled: Boolean(client),
    queryFn: async () =>
      client!.getStaffServiceHistory({ threadType: "temp_session", limit: 20 }),
  });

  const threadOptions = useMemo(() => {
    const current = [
      ...(threadsQuery.data?.queueItems ?? []),
      ...(threadsQuery.data?.activeItems ?? []),
    ].filter((thread) => !isTerminalCustomerServiceThreadStatus(thread.status));
    const history = (historyQuery.data?.items ?? [])
      .map(staffServiceHistoryItemToThread)
      .filter((thread) => thread.threadType === "temp_session");
    return dedupeThreads([...current, ...history]).slice(0, 20);
  }, [historyQuery.data?.items, threadsQuery.data?.activeItems, threadsQuery.data?.queueItems]);
  const selectedThread =
    threadOptions.find((thread) => thread.threadId === selectedThreadId) ??
    threadOptions.find((thread) => thread.threadId === activeThreadId) ??
    threadOptions[0];
  const effectiveThreadType = selectedThread
    ? normalizeCustomerServiceThreadType(selectedThread.threadType)
    : "temp_session";

  const trimmedPrompt = submittedPrompt.trim();
  const knowledgeQuery = useQuery({
    queryKey: pcQueryKeys.knowledgeSearch(
      ...queryBaseKey,
      trimmedPrompt,
      "ai-assistant",
    ),
    enabled: Boolean(client && trimmedPrompt),
    queryFn: async () =>
      client!.searchKnowledge({
        query: trimmedPrompt,
        topK: 8,
      }),
  });
  const knowledgeResults = knowledgeQuery.data?.items ?? [];

  const suggestionsQuery = useQuery({
    queryKey: [
      "pc-ai-suggestions",
      session?.apiBaseUrl ?? "",
      session?.tenantToken ?? "",
      effectiveThreadType,
      selectedThread?.threadId ?? "",
    ],
    enabled: Boolean(client && selectedThread),
    queryFn: async () => {
      const data = await client!.getAiSuggestions(
        effectiveThreadType,
        selectedThread!.threadId,
        20,
      );
      return Array.isArray(data) ? data : data.items ?? [];
    },
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!client || !selectedThread) throw new Error("请选择在线客服会话");
      return client.generateAiSuggestion(
        effectiveThreadType,
        selectedThread.threadId,
      );
    },
    onSuccess: async () => {
      setNotice("AI 建议草稿已生成。");
      await queryClient.invalidateQueries({ queryKey: ["pc-ai-suggestions"] });
    },
    onError: (error) => setNotice(`AI 生成失败：${formatError(error)}`),
  });

  const adoptMutation = useMutation({
    mutationFn: async (suggestionId: string) => {
      if (!client) throw new Error("请先登录");
      return client.adoptAiSuggestion(suggestionId);
    },
    onSuccess: async () => {
      setNotice("已标记采纳。请在对应会话中编辑后发送。");
      await queryClient.invalidateQueries({ queryKey: ["pc-ai-suggestions"] });
    },
    onError: (error) => setNotice(`采纳失败：${formatError(error)}`),
  });

  const submitSearch = () => {
    setSubmittedPrompt(prompt.trim());
    setNotice(null);
  };

  return (
    <main className="module-page ai-workspace-page">
      <section className="ai-workspace-left">
        <header className="ai-workspace-hero">
          <span className="eyebrow">AI ASSISTANT</span>
          <h1>AI 助手</h1>
          <p>查知识、找流程、生成在线客服建议草稿。AI 草稿不会直发客户。</p>
        </header>

        <form
          className="ai-command-box"
          onSubmit={(event) => {
            event.preventDefault();
            submitSearch();
          }}
        >
          <label>
            <Search size={17} />
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="输入客户问题、业务关键词或处理场景"
            />
          </label>
          <div>
            <button type="submit" disabled={!prompt.trim()}>
              <FileSearch size={16} />
              查资料
            </button>
            <button
              type="button"
              className="primary"
              disabled={!selectedThread || generateMutation.isPending}
              onClick={() => generateMutation.mutate()}
            >
              {generateMutation.isPending ? <Loader2 size={16} /> : <Sparkles size={16} />}
              生成草稿
            </button>
          </div>
        </form>

        <div className="ai-quick-grid">
          {quickPrompts.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                setPrompt(item);
                setSubmittedPrompt(item);
              }}
            >
              <Sparkles size={15} />
              {item}
            </button>
          ))}
        </div>

        <section className="ai-thread-context">
          <div className="ai-section-head">
            <strong>关联在线客服会话</strong>
            <span>{threadOptions.length}</span>
          </div>
          {threadsQuery.error || historyQuery.error ? (
            <AiState text={`会话读取失败：${formatError(threadsQuery.error || historyQuery.error)}`} error />
          ) : threadOptions.length === 0 ? (
            <AiState text="暂无可用于生成草稿的在线客服会话" />
          ) : (
            <div className="ai-thread-list">
              {threadOptions.map((thread) => (
                <button
                  key={`${thread.threadType}-${thread.threadId}`}
                  className={thread.threadId === selectedThread?.threadId ? "active" : ""}
                  type="button"
                  onClick={() => setSelectedThreadId(thread.threadId)}
                >
                  <span>{thread.title || "未命名客户"}</span>
                  <em>{thread.lastMessagePreview || thread.status || "--"}</em>
                </button>
              ))}
            </div>
          )}
        </section>
      </section>

      <section className="ai-workspace-center">
        {notice && (
          <p className="message-notice" role="status">
            {notice}
          </p>
        )}
        <PanelTitle
          icon={BrainCircuit}
          title="AI 建议草稿"
          subtitle={
            selectedThread
              ? `${selectedThread.title || "当前会话"} · ${selectedThread.status || "--"}`
              : "选择在线客服会话后可生成"
          }
        />
        {suggestionsQuery.isLoading ? (
          <AiState text="正在读取 AI 建议..." />
        ) : suggestionsQuery.error ? (
          <AiState error text={`AI 建议加载失败：${formatError(suggestionsQuery.error)}`} />
        ) : (suggestionsQuery.data ?? []).length === 0 ? (
          <AiState text="暂无建议草稿。点击生成草稿后会显示在这里。" />
        ) : (
          <div className="ai-suggestion-list">
            {(suggestionsQuery.data ?? []).map((suggestion) => (
              <SuggestionCard
                key={suggestion.suggestionId}
                suggestion={suggestion}
                pending={adoptMutation.isPending}
                onAdopt={() => adoptMutation.mutate(suggestion.suggestionId)}
              />
            ))}
          </div>
        )}
      </section>

      <aside className="ai-workspace-right">
        <PanelTitle
          icon={BookOpenText}
          title="知识依据"
          subtitle={trimmedPrompt ? `关键词：${trimmedPrompt}` : "查资料后展示匹配内容"}
        />
        {knowledgeQuery.isLoading ? (
          <AiState text="正在检索知识库..." />
        ) : knowledgeQuery.error ? (
          <AiState error text={`知识检索失败：${formatError(knowledgeQuery.error)}`} />
        ) : trimmedPrompt && knowledgeResults.length === 0 ? (
          <AiState text="暂无匹配资料" />
        ) : trimmedPrompt ? (
          <KnowledgeHitList items={knowledgeResults} />
        ) : (
          <div className="ai-empty-guide">
            <Bot size={24} />
            <strong>先输入问题</strong>
            <p>AI 助手会优先从企业知识库和客服规则中查找依据。</p>
          </div>
        )}
      </aside>
    </main>
  );
}

function SuggestionCard({
  suggestion,
  pending,
  onAdopt,
}: {
  suggestion: AiSuggestionDto;
  pending: boolean;
  onAdopt: () => void;
}) {
  const text = suggestion.text?.trim() || "服务端未返回草稿文本";
  return (
    <article className="ai-suggestion-card">
      <header>
        <span>
          <MessageSquareText size={16} />
          {sourceLabel(suggestion.source)}
        </span>
        <em>{confidenceText(suggestion.confidence)}</em>
      </header>
      <p>{text}</p>
      {suggestion.sources?.length ? (
        <div className="ai-source-tags">
          {suggestion.sources.slice(0, 3).map((source, index) => (
            <span key={`${source.documentTitle ?? index}`}>
              {source.documentTitle || source.knowledgeBaseName || "知识依据"}
            </span>
          ))}
        </div>
      ) : null}
      <footer>
        <small>{formatMonthDayTime(suggestion.createdAt)}</small>
        <button
          type="button"
          onClick={() => void navigator.clipboard?.writeText(text)}
        >
          <Copy size={15} />
          复制
        </button>
        <button type="button" disabled={pending} onClick={onAdopt}>
          <ClipboardCheck size={15} />
          采纳
        </button>
      </footer>
    </article>
  );
}

function KnowledgeHitList({ items }: { items: KnowledgeSearchResultDto[] }) {
  return (
    <div className="ai-knowledge-list">
      {items.map((item, index) => (
        <article key={`${item.chunkId ?? item.documentId ?? index}`}>
          <strong>{item.documentTitle || item.title || "知识命中"}</strong>
          <p>{item.snippet || item.summary || item.contentPreview || "--"}</p>
          <small>
            {item.knowledgeBaseName || "知识库"}
            {item.score != null ? ` · ${Math.round(item.score * 100)}%` : ""}
          </small>
        </article>
      ))}
    </div>
  );
}

function PanelTitle({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: typeof Sparkles;
  title: string;
  subtitle: string;
}) {
  return (
    <header className="ai-panel-title">
      <span>
        <Icon size={17} />
      </span>
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
    </header>
  );
}

function AiState({ text, error = false }: { text: string; error?: boolean }) {
  return (
    <div className={`ai-state ${error ? "error" : ""}`}>
      {error ? <CheckCircle2 size={20} /> : <Bot size={20} />}
      <span>{text}</span>
    </div>
  );
}

function dedupeThreads(items: CustomerServiceThread[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.threadType}-${item.threadId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function confidenceText(value?: number | null) {
  return value == null ? "置信度 --" : `置信度 ${Math.round(value * 100)}%`;
}

function sourceLabel(value?: string | null) {
  const source = String(value ?? "").replace(/_/g, " ");
  if (!source) return "AI 建议";
  if (source.includes("knowledge")) return "知识库建议";
  if (source.includes("rag")) return "RAG 建议";
  return source;
}
