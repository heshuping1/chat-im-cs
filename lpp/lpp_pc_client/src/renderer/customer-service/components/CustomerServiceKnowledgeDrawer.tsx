import {
  ClipboardList,
  Copy,
  CornerDownLeft,
  FileSearch,
  FileText,
  LibraryBig,
  Search,
  X,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import type {
  KnowledgeBaseDto,
  KnowledgeDocumentDto,
  KnowledgeInsertPayload,
  KnowledgeSearchResultDto,
} from "../../data/api-client";
import type { AuthSession } from "../../data/auth/auth-session";
import {
  normalizeKnowledgeBasesResponse,
  normalizeKnowledgeDocumentsResponse,
  normalizeKnowledgeSearchResponse,
} from "../../data/api/knowledge-normalizers";
import { pcQueryKeys } from "../../data/query-keys";
import { createApiClient } from "../../data/runtime";
import { useI18n } from "../../i18n/useI18n";
import { formatError, formatShortDate } from "../../lib/format";

type KnowledgeSelection =
  | { type: "search"; item: KnowledgeSearchResultDto }
  | { type: "document"; item: KnowledgeDocumentDto }
  | null;

export function CustomerServiceKnowledgeDrawer({
  session,
  onClose,
  onInsert,
  onNotice,
}: {
  session?: AuthSession | null;
  onClose: () => void;
  onInsert: (payload: KnowledgeInsertPayload) => void;
  onNotice: (text: string) => void;
}) {
  return (
    <CustomerServiceKnowledgePanel
      session={session}
      variant="drawer"
      onClose={onClose}
      onInsert={onInsert}
      onNotice={onNotice}
    />
  );
}

export function CustomerServiceKnowledgePanel({
  session,
  onClose,
  onInsert,
  onNotice,
  variant = "drawer",
}: {
  session?: AuthSession | null;
  onClose: () => void;
  onInsert: (payload: KnowledgeInsertPayload) => void;
  onNotice: (text: string) => void;
  variant?: "drawer" | "panel";
}) {
  const { t } = useI18n();
  const client = useMemo(
    () => (session ? createApiClient(session) : null),
    [session],
  );
  const queryBaseKey = [session?.apiBaseUrl, session?.tenantToken] as const;
  const [keyword, setKeyword] = useState("");
  const [submittedKeyword, setSubmittedKeyword] = useState("");
  const [selectedBaseId, setSelectedBaseId] = useState("");
  const [selection, setSelection] = useState<KnowledgeSelection>(null);

  const basesQuery = useQuery({
    queryKey: pcQueryKeys.knowledgeBases(...queryBaseKey),
    enabled: Boolean(client),
    queryFn: async () => client!.getKnowledgeBases(),
  });
  const bases = normalizeKnowledgeBasesResponse(basesQuery.data);
  const effectiveBaseId =
    bases.find((base) => base.knowledgeBaseId === selectedBaseId)?.knowledgeBaseId ||
    bases[0]?.knowledgeBaseId ||
    "";
  const selectedBase = bases.find((base) => base.knowledgeBaseId === effectiveBaseId);

  const documentsQuery = useQuery({
    queryKey: pcQueryKeys.knowledgeDocuments(...queryBaseKey, effectiveBaseId),
    enabled: Boolean(client && effectiveBaseId),
    queryFn: async () => client!.getKnowledgeDocuments(effectiveBaseId),
  });
  const documents = normalizeKnowledgeDocumentsResponse(documentsQuery.data);

  const trimmedKeyword = submittedKeyword.trim();
  const searchQuery = useQuery({
    queryKey: pcQueryKeys.knowledgeSearch(
      ...queryBaseKey,
      trimmedKeyword,
      selectedBaseId,
    ),
    enabled: Boolean(client && trimmedKeyword),
    queryFn: async () =>
      client!.searchKnowledge({
        query: trimmedKeyword,
        topK: 8,
        knowledgeBaseId: selectedBaseId || undefined,
      }),
  });
  const searchResults = normalizeKnowledgeSearchResponse(searchQuery.data);
  const currentSelection =
    selection ??
    (searchResults[0]
      ? { type: "search" as const, item: searchResults[0] }
      : documents[0]
        ? { type: "document" as const, item: documents[0] }
        : null);
  const insertPayload = currentSelection
    ? buildKnowledgeInsertPayload(currentSelection, selectedBase, t)
    : null;

  const copySelection = async () => {
    if (!insertPayload?.text) return;
    try {
      await navigator.clipboard.writeText(insertPayload.text);
      onNotice(t("knowledge.copiedNotice"));
    } catch (error) {
      onNotice(t("common.copyFailed", { error: formatError(error) }));
    }
  };

  return (
    <aside
      className={
        variant === "panel"
          ? "cs-knowledge-drawer cs-knowledge-panel"
          : "cs-knowledge-drawer"
      }
      aria-label={t("knowledge.conversationAria")}
    >
      <header className="cs-knowledge-drawer-head">
        <span>
          <ClipboardList size={18} />
        </span>
        <div>
          <strong>{t("knowledge.title")}</strong>
          <p>{t("knowledge.drawerSubtitle")}</p>
        </div>
        <button type="button" aria-label={t("knowledge.close")} title={t("common.close")} onClick={onClose}>
          <X size={17} />
        </button>
      </header>

      <form
        className="cs-knowledge-search"
        onSubmit={(event) => {
          event.preventDefault();
          setSubmittedKeyword(keyword.trim());
          setSelection(null);
        }}
      >
        <Search size={16} />
        <input
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder={t("knowledge.searchPlaceholder")}
        />
        <button type="submit" disabled={!keyword.trim()}>
          {t("knowledge.search")}
        </button>
      </form>

      <section className="cs-knowledge-base-strip" aria-label={t("knowledge.filterAria")}>
        {basesQuery.isLoading ? (
          <KnowledgeDrawerState text={t("knowledge.loadingBases")} />
        ) : basesQuery.error ? (
          <KnowledgeDrawerState
            error
            text={t("knowledge.baseLoadFailed", { error: formatError(basesQuery.error) })}
          />
        ) : bases.length === 0 ? (
          <KnowledgeDrawerState text={t("knowledge.noBases")} />
        ) : (
          bases.map((base) => {
            const active = effectiveBaseId === base.knowledgeBaseId;
            return (
              <button
                key={base.knowledgeBaseId}
                className={active ? "active" : ""}
                type="button"
                title={baseTitle(base, t)}
                onClick={() => {
                  setSelectedBaseId(base.knowledgeBaseId);
                  setSelection(null);
                }}
              >
                <LibraryBig size={14} />
                <span>{baseTitle(base, t)}</span>
              </button>
            );
          })
        )}
      </section>

      <section className="cs-knowledge-result-zone">
        <div className="cs-knowledge-section-head">
          <strong>{trimmedKeyword ? t("knowledge.searchResults") : t("knowledge.documents")}</strong>
          <span>
            {trimmedKeyword
              ? t("knowledge.resultCount", { count: searchResults.length })
              : t("knowledge.documentCount", { count: documents.length })}
          </span>
        </div>
        {trimmedKeyword ? (
          <SearchResultList
            error={searchQuery.error}
            loading={searchQuery.isLoading}
            results={searchResults}
            selection={currentSelection}
            t={t}
            onSelect={(item) => setSelection({ type: "search", item })}
          />
        ) : (
          <DocumentList
            documents={documents}
            error={documentsQuery.error}
            loading={documentsQuery.isLoading}
            selection={currentSelection}
            t={t}
            onSelect={(item) => setSelection({ type: "document", item })}
          />
        )}
      </section>

      <section className="cs-knowledge-preview">
        {insertPayload ? (
          <>
            <div className="cs-knowledge-preview-title">
              <strong>{insertPayload.title}</strong>
              <span>{insertPayload.sourceLabel || t("knowledge.source")}</span>
            </div>
            <p>{insertPayload.text || t("knowledge.noPreview")}</p>
            <div className="cs-knowledge-actions">
              <button
                type="button"
                disabled={!insertPayload.text}
                onClick={() => onInsert(insertPayload)}
              >
                <CornerDownLeft size={15} />
                {t("aiDraft.insertReply")}
              </button>
              <button
                className="secondary"
                type="button"
                disabled={!insertPayload.text}
                onClick={() => void copySelection()}
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
          <KnowledgeDrawerState text={t("knowledge.previewAfterSelect")} />
        )}
      </section>
    </aside>
  );
}

function SearchResultList({
  error,
  loading,
  results,
  selection,
  t,
  onSelect,
}: {
  error: unknown;
  loading: boolean;
  results: KnowledgeSearchResultDto[];
  selection: KnowledgeSelection;
  t: (key: string, params?: Record<string, string | number>) => string;
  onSelect: (item: KnowledgeSearchResultDto) => void;
}) {
  if (loading) return <KnowledgeDrawerState text={t("knowledge.searching")} />;
  if (error) return <KnowledgeDrawerState error text={t("knowledge.searchFailed", { error: formatError(error) })} />;
  if (results.length === 0) return <KnowledgeDrawerState text={t("knowledge.noSearchResults")} />;
  return (
    <div className="cs-knowledge-result-list">
      {results.map((item, index) => {
        const active =
          selection?.type === "search" &&
          selection.item.documentId === item.documentId &&
          selection.item.chunkId === item.chunkId;
        return (
          <button
            key={`${item.chunkId ?? item.documentId ?? index}`}
            className={active ? "active" : ""}
            type="button"
            onClick={() => onSelect(item)}
          >
            <FileSearch size={15} />
            <span>
              <strong>{searchTitle(item, t)}</strong>
              <p>{searchSnippet(item) || "--"}</p>
              <em>
                {item.knowledgeBaseName || t("knowledge.title")}
                {headingPathText(item.headingPath) && ` · ${headingPathText(item.headingPath)}`}
                {item.score != null && ` · ${Math.round(item.score * 100)}%`}
              </em>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function DocumentList({
  documents,
  error,
  loading,
  selection,
  t,
  onSelect,
}: {
  documents: KnowledgeDocumentDto[];
  error: unknown;
  loading: boolean;
  selection: KnowledgeSelection;
  t: (key: string, params?: Record<string, string | number>) => string;
  onSelect: (item: KnowledgeDocumentDto) => void;
}) {
  if (loading) return <KnowledgeDrawerState text={t("knowledge.loadingDocuments")} />;
  if (error) return <KnowledgeDrawerState error text={t("knowledge.documentLoadFailed", { error: formatError(error) })} />;
  if (documents.length === 0) return <KnowledgeDrawerState text={t("knowledge.noDocuments")} />;
  return (
    <div className="cs-knowledge-result-list">
      {documents.map((item) => {
        const documentId = documentIdOf(item);
        const active =
          selection?.type === "document" && documentIdOf(selection.item) === documentId;
        return (
          <button
            key={documentId}
            className={active ? "active" : ""}
            type="button"
            onClick={() => onSelect(item)}
          >
            <FileText size={15} />
            <span>
              <strong>{documentTitle(item, t)}</strong>
              <p>{documentSummary(item) || t("knowledge.noSummary")}</p>
              <em>{shortDate(item.updatedAt) || t("knowledge.noUpdatedAt")}</em>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function KnowledgeDrawerState({
  text,
  error = false,
}: {
  text: string;
  error?: boolean;
}) {
  return <div className={`cs-knowledge-state ${error ? "error" : ""}`}>{text}</div>;
}

function buildKnowledgeInsertPayload(
  selection: Exclude<KnowledgeSelection, null>,
  selectedBase?: KnowledgeBaseDto,
  t?: (key: string, params?: Record<string, string | number>) => string,
): KnowledgeInsertPayload {
  if (selection.type === "search") {
    const item = selection.item;
    return {
      title: searchTitle(item, t),
      text: searchSnippet(item),
      sourceLabel: [item.knowledgeBaseName, headingPathText(item.headingPath)]
        .filter(Boolean)
        .join(" · "),
      knowledgeBaseId: item.knowledgeBaseId,
      knowledgeBaseName: item.knowledgeBaseName,
      documentId: item.documentId,
      documentTitle: item.documentTitle || item.title,
      chunkId: item.chunkId,
    };
  }
  const document = selection.item;
  return {
    title: documentTitle(document, t),
    text: documentSummary(document),
      sourceLabel: selectedBase ? baseTitle(selectedBase, t) : t?.("knowledge.document") ?? "Knowledge document",
    knowledgeBaseId: document.knowledgeBaseId || selectedBase?.knowledgeBaseId,
    knowledgeBaseName: selectedBase ? baseTitle(selectedBase, t) : undefined,
    documentId: document.documentId,
    documentTitle: documentTitle(document, t),
  };
}

function baseTitle(base: KnowledgeBaseDto, t?: (key: string) => string) {
  return base.name || base.title || t?.("knowledge.untitledBase") || "Knowledge base";
}

function documentTitle(document: KnowledgeDocumentDto, t?: (key: string) => string) {
  return document.title || document.name || t?.("knowledge.untitledDocument") || "Knowledge document";
}

function documentIdOf(document: KnowledgeDocumentDto) {
  return document.documentId || document.id || document.title || document.name || "";
}

function documentSummary(document: KnowledgeDocumentDto) {
  return document.summary || document.contentPreview || "";
}

function searchTitle(item: KnowledgeSearchResultDto, t?: (key: string) => string) {
  return item.documentTitle || item.title || t?.("knowledge.untitledResult") || "Knowledge result";
}

function searchSnippet(item: KnowledgeSearchResultDto) {
  return item.snippet || item.summary || item.contentPreview || item.content || "";
}

function headingPathText(value: string | string[] | null | undefined) {
  if (!value) return "";
  return Array.isArray(value) ? value.join(" / ") : value;
}

function shortDate(value?: string | null) {
  const text = formatShortDate(value);
  return text === "--" ? "" : text;
}
