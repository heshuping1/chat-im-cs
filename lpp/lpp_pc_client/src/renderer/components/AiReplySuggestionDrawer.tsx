import {
  Bot,
  Copy,
  CornerDownLeft,
  FileSearch,
  Loader2,
  RefreshCw,
  Sparkles,
  X,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import type {
  AiSuggestionDto,
  AiSuggestionSourceDto,
  CustomerServiceThreadType,
} from "../data/api-client";
import type { AuthSession } from "../data/auth/auth-session";
import {
  aiSuggestionSourceLabel,
  aiSuggestionStatusLabel,
  formatAiSuggestionError,
} from "../data/api/ai-suggestion-normalizers";
import { pcQueryKeys } from "../data/query-keys";
import { createApiClient } from "../data/runtime";
import { formatError, formatMonthDayTime } from "../lib/format";

const suggestionLimit = 20;

export function AiReplySuggestionDrawer({
  customerMessageId,
  disabledReason,
  onClose,
  onInsert,
  onNotice,
  session,
  subtitle,
  threadId,
  threadTitle,
  threadType,
}: {
  customerMessageId?: string | null;
  disabledReason?: string;
  onClose: () => void;
  onInsert: (text: string) => void;
  onNotice: (text: string) => void;
  session?: AuthSession | null;
  subtitle?: string;
  threadId?: string | null;
  threadTitle: string;
  threadType?: CustomerServiceThreadType | null;
}) {
  return (
    <AiReplySuggestionPanel
      customerMessageId={customerMessageId}
      disabledReason={disabledReason}
      session={session}
      subtitle={subtitle}
      threadId={threadId}
      threadTitle={threadTitle}
      threadType={threadType}
      variant="drawer"
      onClose={onClose}
      onInsert={onInsert}
      onNotice={onNotice}
    />
  );
}

export function AiReplySuggestionPanel({
  customerMessageId,
  disabledReason,
  onClose,
  onInsert,
  onNotice,
  session,
  subtitle,
  threadId,
  threadTitle,
  threadType,
  variant = "drawer",
}: {
  customerMessageId?: string | null;
  disabledReason?: string;
  onClose: () => void;
  onInsert: (text: string) => void;
  onNotice: (text: string) => void;
  session?: AuthSession | null;
  subtitle?: string;
  threadId?: string | null;
  threadTitle: string;
  threadType?: CustomerServiceThreadType | null;
  variant?: "drawer" | "panel";
}) {
  const queryClient = useQueryClient();
  const client = useMemo(() => (session ? createApiClient(session) : null), [session]);
  const queryBaseKey = [session?.apiBaseUrl, session?.tenantToken] as const;
  const [selectedSuggestionId, setSelectedSuggestionId] = useState("");
  const suggestionsKey = pcQueryKeys.aiSuggestions(
    ...queryBaseKey,
    threadType ?? "",
    threadId ?? "",
    suggestionLimit,
  );
  const ready = Boolean(client && threadType && threadId && !disabledReason);

  useEffect(() => {
    setSelectedSuggestionId("");
  }, [threadId, threadType, customerMessageId]);

  const suggestionsQuery = useQuery({
    queryKey: suggestionsKey,
    enabled: Boolean(client && threadType && threadId),
    queryFn: async () => client!.getAiSuggestions(threadType!, threadId!, suggestionLimit),
  });
  const suggestions = suggestionsQuery.data ?? [];
  const selectedSuggestion =
    suggestions.find((suggestion) => suggestion.suggestionId === selectedSuggestionId) ??
    suggestions[0];
  const selectedText = suggestionText(selectedSuggestion);

  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!client || !threadType || !threadId) throw new Error("当前会话暂不支持 AI 起草");
      return client.generateAiSuggestion(threadType, threadId, customerMessageId);
    },
    onSuccess: async (suggestion) => {
      if (suggestion.suggestionId) setSelectedSuggestionId(suggestion.suggestionId);
      onNotice("AI 回复建议已生成，客户不会收到任何消息。");
      await queryClient.invalidateQueries({ queryKey: suggestionsKey });
    },
    onError: (error) => onNotice(`AI 起草失败：${formatAiSuggestionError(error)}`),
  });

  const adoptMutation = useMutation({
    mutationFn: async (suggestion: AiSuggestionDto) => {
      if (!client) throw new Error("请先登录");
      if (!suggestion.suggestionId) return suggestion;
      return client.adoptAiSuggestion(suggestion.suggestionId);
    },
    onError: (error) => onNotice(`采纳失败：${formatAiSuggestionError(error)}`),
  });

  const insertSuggestion = async () => {
    if (!selectedSuggestion) {
      onNotice("请先生成一条 AI 回复建议。");
      return;
    }
    const text = selectedText.trim();
    if (!text) {
      onNotice("服务端未返回可插入的建议文本。");
      return;
    }
    const adopted = await adoptMutation.mutateAsync(selectedSuggestion);
    onInsert(suggestionText(adopted).trim() || text);
  };

  const copySuggestion = async () => {
    if (!selectedText.trim()) return;
    try {
      await navigator.clipboard.writeText(selectedText.trim());
      onNotice("AI 回复建议已复制。");
    } catch (error) {
      onNotice(`复制失败：${formatError(error)}`);
    }
  };

  return (
    <aside
      className={variant === "panel" ? "cs-ai-drawer cs-ai-panel" : "cs-ai-drawer"}
      aria-label="AI 回复建议"
    >
      <header className="cs-ai-drawer-head">
        <span>
          <Bot size={18} />
        </span>
        <div>
          <strong>AI 回复建议</strong>
          <p>{threadTitle || "当前会话"}{subtitle ? ` · ${subtitle}` : ""}</p>
        </div>
        <button type="button" aria-label="关闭 AI 回复建议" title="关闭" onClick={onClose}>
          <X size={17} />
        </button>
      </header>

      <section className="cs-ai-context">
        <strong>基于当前会话上下文生成草稿</strong>
        <p>
          AI 只负责起草，内容会先写入输入框，必须由客服人工确认后发送。
          {customerMessageId ? " 本次会优先参考右键选中的客户消息。" : ""}
        </p>
      </section>

      <div className="cs-ai-primary-actions">
        <button
          type="button"
          disabled={!ready || generateMutation.isPending}
          onClick={() => generateMutation.mutate()}
        >
          {generateMutation.isPending ? <Loader2 size={15} className="spin" /> : <Sparkles size={15} />}
          {selectedSuggestion ? "重新生成" : "生成建议"}
        </button>
        <button
          className="secondary"
          type="button"
          disabled={!selectedText.trim() || adoptMutation.isPending}
          onClick={() => void insertSuggestion()}
        >
          <CornerDownLeft size={15} />
          插入回复
        </button>
      </div>

      {disabledReason ? (
        <AiDrawerState error text={disabledReason} />
      ) : suggestionsQuery.isLoading ? (
        <AiDrawerState text="正在读取历史建议..." />
      ) : suggestionsQuery.error ? (
        <AiDrawerState
          error
          text={`历史建议读取失败：${formatAiSuggestionError(suggestionsQuery.error)}`}
        />
      ) : suggestions.length === 0 ? (
        <AiDrawerState text="暂无建议，点击生成建议开始起草。" />
      ) : (
        <section className="cs-ai-suggestion-list" aria-label="AI 历史建议">
          {suggestions.map((suggestion, index) => {
            const active =
              (selectedSuggestion?.suggestionId || "") === (suggestion.suggestionId || "") ||
              (!selectedSuggestionId && index === 0);
            return (
              <button
                key={suggestion.suggestionId || `${suggestion.createdAt ?? "suggestion"}-${index}`}
                className={active ? "active" : ""}
                type="button"
                onClick={() => setSelectedSuggestionId(suggestion.suggestionId)}
              >
                <strong>{aiSuggestionSourceLabel(suggestion.source)}</strong>
                <p>{suggestionText(suggestion) || "暂无建议文本"}</p>
                <em>
                  {aiSuggestionStatusLabel(suggestion.status)}
                  {suggestion.createdAt ? ` · ${formatMonthDayTime(suggestion.createdAt)}` : ""}
                </em>
              </button>
            );
          })}
        </section>
      )}

      <section className="cs-ai-preview">
        {selectedSuggestion ? (
          <>
            <div className="cs-ai-preview-title">
              <strong>建议预览</strong>
              <span>{aiSuggestionSourceLabel(selectedSuggestion.source)}</span>
            </div>
            <p>{selectedText || "服务端未返回建议文本"}</p>
            <SourceList sources={selectedSuggestion.sources ?? []} />
            <div className="cs-ai-actions">
              <button
                type="button"
                disabled={!selectedText.trim() || adoptMutation.isPending}
                onClick={() => void insertSuggestion()}
              >
                <CornerDownLeft size={15} />
                插入回复
              </button>
              <button
                className="secondary"
                type="button"
                disabled={!selectedText.trim()}
                onClick={() => void copySuggestion()}
              >
                <Copy size={15} />
                复制
              </button>
              <button
                className="ghost"
                type="button"
                disabled={!ready || generateMutation.isPending}
                onClick={() => generateMutation.mutate()}
              >
                <RefreshCw size={15} />
                重新生成
              </button>
            </div>
          </>
        ) : (
          <AiDrawerState text="生成或选择建议后在这里预览。" />
        )}
      </section>
    </aside>
  );
}

function SourceList({ sources }: { sources: AiSuggestionSourceDto[] }) {
  if (sources.length === 0) return null;
  return (
    <div className="cs-ai-sources" aria-label="建议依据">
      {sources.slice(0, 3).map((source, index) => (
        <div key={`${source.documentTitle ?? source.knowledgeBaseName ?? index}`}>
          <FileSearch size={13} />
          <span>
            <strong>{source.documentTitle || source.knowledgeBaseName || "知识依据"}</strong>
            <em>
              {source.knowledgeBaseName || "知识库"}
              {headingPathText(source.headingPath) && ` · ${headingPathText(source.headingPath)}`}
            </em>
          </span>
        </div>
      ))}
    </div>
  );
}

function AiDrawerState({ text, error = false }: { text: string; error?: boolean }) {
  return <div className={`cs-ai-state ${error ? "error" : ""}`}>{text}</div>;
}

function suggestionText(suggestion?: AiSuggestionDto | null) {
  return suggestion?.text?.trim() ?? "";
}

function headingPathText(value: string | string[] | null | undefined) {
  if (!value) return "";
  return Array.isArray(value) ? value.join(" / ") : value;
}
