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
import { useI18n } from "../i18n/useI18n";
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
  const { t } = useI18n();
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
      if (!client || !threadType || !threadId) throw new Error(t("aiDraft.unsupported"));
      return client.generateAiSuggestion(threadType, threadId, customerMessageId);
    },
    onSuccess: async (suggestion) => {
      if (suggestion.suggestionId) setSelectedSuggestionId(suggestion.suggestionId);
      onNotice(t("aiDraft.generatedNotice"));
      await queryClient.invalidateQueries({ queryKey: suggestionsKey });
    },
    onError: (error) => onNotice(t("aiDraft.generateFailed", { error: formatAiSuggestionError(error) })),
  });

  const adoptMutation = useMutation({
    mutationFn: async (suggestion: AiSuggestionDto) => {
      if (!client) throw new Error(t("auth.login"));
      if (!suggestion.suggestionId) return suggestion;
      return client.adoptAiSuggestion(suggestion.suggestionId);
    },
    onError: (error) => onNotice(t("aiDraft.adoptFailed", { error: formatAiSuggestionError(error) })),
  });

  const insertSuggestion = async () => {
    if (!selectedSuggestion) {
      onNotice(t("aiDraft.generateFirst"));
      return;
    }
    const text = selectedText.trim();
    if (!text) {
      onNotice(t("aiDraft.noInsertableText"));
      return;
    }
    const adopted = await adoptMutation.mutateAsync(selectedSuggestion);
    onInsert(suggestionText(adopted).trim() || text);
  };

  const copySuggestion = async () => {
    if (!selectedText.trim()) return;
    try {
      await navigator.clipboard.writeText(selectedText.trim());
      onNotice(t("aiDraft.copiedNotice"));
    } catch (error) {
      onNotice(t("common.copyFailed", { error: formatError(error) }));
    }
  };

  return (
    <aside
      className={variant === "panel" ? "cs-ai-drawer cs-ai-panel" : "cs-ai-drawer"}
      aria-label={t("aiDraft.title")}
    >
      <header className="cs-ai-drawer-head">
        <span>
          <Bot size={18} />
        </span>
        <div>
          <strong>{t("aiDraft.title")}</strong>
          <p>{threadTitle || t("aiDraft.currentThread")}{subtitle ? ` · ${subtitle}` : ""}</p>
        </div>
        <button type="button" aria-label={t("aiDraft.close")} title={t("common.close")} onClick={onClose}>
          <X size={17} />
        </button>
      </header>

      <section className="cs-ai-context">
        <strong>{t("aiDraft.contextTitle")}</strong>
        <p>
          {t("aiDraft.contextText")}
          {customerMessageId ? ` ${t("aiDraft.selectedMessageHint")}` : ""}
        </p>
      </section>

      <div className="cs-ai-primary-actions">
        <button
          type="button"
          disabled={!ready || generateMutation.isPending}
          onClick={() => generateMutation.mutate()}
        >
          {generateMutation.isPending ? <Loader2 size={15} className="spin" /> : <Sparkles size={15} />}
          {selectedSuggestion ? t("aiDraft.regenerate") : t("aiDraft.generate")}
        </button>
        <button
          className="secondary"
          type="button"
          disabled={!selectedText.trim() || adoptMutation.isPending}
          onClick={() => void insertSuggestion()}
        >
          <CornerDownLeft size={15} />
          {t("aiDraft.insertReply")}
        </button>
      </div>

      {disabledReason ? (
        <AiDrawerState error text={disabledReason} />
      ) : suggestionsQuery.isLoading ? (
        <AiDrawerState text={t("aiDraft.loadingHistory")} />
      ) : suggestionsQuery.error ? (
        <AiDrawerState
          error
          text={t("aiDraft.historyFailed", { error: formatAiSuggestionError(suggestionsQuery.error) })}
        />
      ) : suggestions.length === 0 ? (
        <AiDrawerState text={t("aiDraft.empty")} />
      ) : (
        <section className="cs-ai-suggestion-list" aria-label={t("aiDraft.historyAria")}>
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
                <p>{suggestionText(suggestion) || t("aiDraft.noSuggestionText")}</p>
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
              <strong>{t("aiDraft.previewTitle")}</strong>
              <span>{aiSuggestionSourceLabel(selectedSuggestion.source)}</span>
            </div>
            <p>{selectedText || t("aiDraft.noSuggestionText")}</p>
            <SourceList sources={selectedSuggestion.sources ?? []} />
            <div className="cs-ai-actions">
              <button
                type="button"
                disabled={!selectedText.trim() || adoptMutation.isPending}
                onClick={() => void insertSuggestion()}
              >
                <CornerDownLeft size={15} />
                {t("aiDraft.insertReply")}
              </button>
              <button
                className="secondary"
                type="button"
                disabled={!selectedText.trim()}
                onClick={() => void copySuggestion()}
              >
                <Copy size={15} />
                {t("common.copy")}
              </button>
              <button
                className="ghost"
                type="button"
                disabled={!ready || generateMutation.isPending}
                onClick={() => generateMutation.mutate()}
              >
                <RefreshCw size={15} />
                {t("aiDraft.regenerate")}
              </button>
            </div>
          </>
        ) : (
          <AiDrawerState text={t("aiDraft.previewEmpty")} />
        )}
      </section>
    </aside>
  );
}

function SourceList({ sources }: { sources: AiSuggestionSourceDto[] }) {
  const { t } = useI18n();
  if (sources.length === 0) return null;
  return (
    <div className="cs-ai-sources" aria-label={t("aiDraft.sourcesAria")}>
      {sources.slice(0, 3).map((source, index) => (
        <div key={`${source.documentTitle ?? source.knowledgeBaseName ?? index}`}>
          <FileSearch size={13} />
          <span>
            <strong>{source.documentTitle || source.knowledgeBaseName || t("aiDraft.sourceFallback")}</strong>
            <em>
              {source.knowledgeBaseName || t("knowledge.title")}
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
