import {
  BookOpenText,
  ChevronRight,
  DatabaseZap,
  FileSearch,
  FileText,
  LibraryBig,
  Search,
  Sparkles,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import type {
  KnowledgeBaseDto,
  KnowledgeDocumentDto,
  KnowledgeSearchResultDto,
} from "../data/api-client";
import { useAuthSession } from "../data/auth/auth-store";
import {
  normalizeKnowledgeBasesResponse,
  normalizeKnowledgeDocumentsResponse,
  normalizeKnowledgeSearchResponse,
} from "../data/api/knowledge-normalizers";
import { pcQueryKeys } from "../data/query-keys";
import { createApiClient } from "../data/runtime";
import { useI18n } from "../i18n/useI18n";
import { formatError, formatShortDate } from "../lib/format";

type KnowledgeSelection =
  | { type: "search"; item: KnowledgeSearchResultDto }
  | { type: "document"; item: KnowledgeDocumentDto }
  | null;

export function KnowledgeBasePage() {
  const { t } = useI18n();
  const session = useAuthSession();
  const client = useMemo(
    () => (session ? createApiClient(session) : null),
    [session],
  );
  const queryBaseKey = [session?.apiBaseUrl, session?.tenantToken] as const;
  const [keyword, setKeyword] = useState("");
  const [submittedKeyword, setSubmittedKeyword] = useState("");
  const [selectedBaseId, setSelectedBaseId] = useState<string>("");
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
    queryKey: pcQueryKeys.knowledgeDocuments(
      ...queryBaseKey,
      effectiveBaseId,
    ),
    enabled: Boolean(client && effectiveBaseId),
    queryFn: async () => client!.getKnowledgeDocuments(effectiveBaseId),
  });

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
        topK: 10,
        knowledgeBaseId: selectedBaseId || undefined,
      }),
  });
  const searchResults = normalizeKnowledgeSearchResponse(searchQuery.data);
  const documents = normalizeKnowledgeDocumentsResponse(documentsQuery.data);

  const currentSelection =
    selection ??
    (searchResults[0]
      ? { type: "search" as const, item: searchResults[0] }
      : documents[0]
        ? { type: "document" as const, item: documents[0] }
        : null);

  const submitSearch = () => {
    setSubmittedKeyword(keyword.trim());
    setSelection(null);
  };

  return (
    <main className="module-page knowledge-page">
      <section className="knowledge-left">
        <header className="knowledge-title">
          <span className="eyebrow">KNOWLEDGE</span>
          <h1>{t("knowledge.title")}</h1>
          <p>{t("knowledge.description")}</p>
        </header>

        <form
          className="knowledge-search"
          onSubmit={(event) => {
            event.preventDefault();
            submitSearch();
          }}
        >
          <Search size={17} />
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder={t("knowledge.searchPlaceholder")}
          />
          <button type="submit">{t("knowledge.search")}</button>
        </form>

        <section className="knowledge-base-panel">
          <div className="knowledge-section-head">
            <strong>{t("knowledge.baseListTitle")}</strong>
            <span>{bases.length}</span>
          </div>
          {basesQuery.isLoading ? (
            <KnowledgeState text={t("knowledge.loadingBases")} />
          ) : basesQuery.error ? (
            <KnowledgeState
              error
              text={t("knowledge.baseLoadFailed", { error: formatError(basesQuery.error) })}
            />
          ) : bases.length === 0 ? (
            <KnowledgeState text={t("knowledge.noBases")} />
          ) : (
            <div className="knowledge-base-list" aria-label={t("knowledge.baseListAria")}>
              {bases.map((base) => {
                const active = effectiveBaseId === base.knowledgeBaseId;
                return (
                  <button
                    className={active ? "active" : ""}
                    type="button"
                    key={base.knowledgeBaseId}
                    onClick={() => {
                      setSelectedBaseId(base.knowledgeBaseId);
                      setSelection(null);
                    }}
                  >
                    <span>
                      <LibraryBig size={16} />
                    </span>
                    <strong>{baseTitle(base, t("knowledge.untitledBase"))}</strong>
                    <em>{base.description || base.summary || t("knowledge.enabled")}</em>
                    <ChevronRight size={14} />
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </section>

      <section className="knowledge-center">
        <header className="knowledge-center-head">
          <div>
            <h2>{trimmedKeyword ? t("knowledge.searchResults") : t("knowledge.documents")}</h2>
            <p>
              {trimmedKeyword
                ? t("knowledge.keyword", { keyword: trimmedKeyword })
                : selectedBase
                  ? baseTitle(selectedBase, t("knowledge.untitledBase"))
                  : t("knowledge.selectBaseHint")}
            </p>
          </div>
          <span>
            {trimmedKeyword
              ? t("knowledge.resultCount", { count: searchResults.length })
              : t("knowledge.documentCount", { count: documents.length })}
          </span>
        </header>

        {trimmedKeyword ? (
          <SearchResultList
            loading={searchQuery.isLoading}
            error={searchQuery.error}
            results={searchResults}
            selection={currentSelection}
            onSelect={(item) => setSelection({ type: "search", item })}
          />
        ) : (
          <DocumentList
            loading={documentsQuery.isLoading}
            error={documentsQuery.error}
            documents={documents}
            selection={currentSelection}
            onSelect={(item) => setSelection({ type: "document", item })}
          />
        )}
      </section>

      <KnowledgePreview selection={currentSelection} selectedBase={selectedBase} />
    </main>
  );
}

function SearchResultList({
  loading,
  error,
  results,
  selection,
  onSelect,
}: {
  loading: boolean;
  error: unknown;
  results: KnowledgeSearchResultDto[];
  selection: KnowledgeSelection;
  onSelect: (item: KnowledgeSearchResultDto) => void;
}) {
  const { t } = useI18n();
  if (loading) return <KnowledgeState text={t("knowledge.searching")} />;
  if (error) return <KnowledgeState error text={t("knowledge.searchFailed", { error: formatError(error) })} />;
  if (results.length === 0) return <KnowledgeState text={t("knowledge.noSearchResults")} />;
  return (
    <div className="knowledge-result-list" aria-label={t("knowledge.searchResultListAria")}>
      {results.map((item, index) => {
        const active =
          selection?.type === "search" &&
          selection.item.documentId === item.documentId &&
          selection.item.chunkId === item.chunkId;
        return (
          <button
            className={active ? "active" : ""}
            type="button"
            key={`${item.chunkId ?? item.documentId ?? index}`}
            onClick={() => onSelect(item)}
          >
            <span className="knowledge-item-icon">
              <FileSearch size={16} />
            </span>
            <div>
              <strong>{searchTitle(item, t("knowledge.untitledResult"))}</strong>
              <p>{item.snippet || item.summary || item.contentPreview || "--"}</p>
              <em>
                {item.knowledgeBaseName || t("knowledge.untitledBase")}
                {item.score != null && ` · ${t("knowledge.matchScore", { score: Math.round(item.score * 100) })}`}
              </em>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function DocumentList({
  loading,
  error,
  documents,
  selection,
  onSelect,
}: {
  loading: boolean;
  error: unknown;
  documents: KnowledgeDocumentDto[];
  selection: KnowledgeSelection;
  onSelect: (item: KnowledgeDocumentDto) => void;
}) {
  const { t } = useI18n();
  if (loading) return <KnowledgeState text={t("knowledge.loadingDocuments")} />;
  if (error) return <KnowledgeState error text={t("knowledge.documentLoadFailed", { error: formatError(error) })} />;
  if (documents.length === 0) return <KnowledgeState text={t("knowledge.noDocuments")} />;
  return (
    <div className="knowledge-result-list" aria-label={t("knowledge.documentListAria")}>
      {documents.map((item) => {
        const documentId = item.documentId || item.id || item.title || item.name || "";
        const active =
          selection?.type === "document" &&
          documentIdOf(selection.item) === documentId;
        return (
          <button
            className={active ? "active" : ""}
            type="button"
            key={documentId}
            onClick={() => onSelect(item)}
          >
            <span className="knowledge-item-icon document">
              <FileText size={16} />
            </span>
            <div>
              <strong>{documentTitle(item, t("knowledge.untitledDocument"))}</strong>
              <p>{item.summary || item.contentPreview || t("knowledge.noSummary")}</p>
              <em>{shortDate(item.updatedAt) || t("knowledge.noUpdatedAt")}</em>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function KnowledgePreview({
  selection,
  selectedBase,
}: {
  selection: KnowledgeSelection;
  selectedBase?: KnowledgeBaseDto;
}) {
  const { t } = useI18n();
  if (!selection) {
    return (
      <aside className="knowledge-preview">
        <KnowledgePreviewEmpty />
      </aside>
    );
  }
  const isSearch = selection.type === "search";
  const item = selection.item;
  const title = isSearch
    ? searchTitle(item as KnowledgeSearchResultDto, t("knowledge.untitledResult"))
    : documentTitle(item as KnowledgeDocumentDto, t("knowledge.untitledDocument"));
  const summary = isSearch
    ? searchSnippet(item as KnowledgeSearchResultDto)
    : documentSummary(item as KnowledgeDocumentDto);

  return (
    <aside className="knowledge-preview">
      <header>
        <span>
          {isSearch ? <Sparkles size={18} /> : <FileText size={18} />}
        </span>
        <div>
          <strong>{title}</strong>
          <p>
            {isSearch
              ? (item as KnowledgeSearchResultDto).knowledgeBaseName || t("knowledge.searchHit")
              : selectedBase
                ? baseTitle(selectedBase, t("knowledge.untitledBase"))
                : t("knowledge.document")}
          </p>
        </div>
      </header>
      <section className="knowledge-preview-body">
        {isSearch && (item as KnowledgeSearchResultDto).headingPath && (
          <div className="knowledge-path">
            {headingPathText((item as KnowledgeSearchResultDto).headingPath)}
          </div>
        )}
        <h2>{title}</h2>
        <p>{summary || t("knowledge.noPreview")}</p>
      </section>
      <footer>
        <span>{isSearch ? t("knowledge.searchChunk") : t("knowledge.documentPreview")}</span>
        <button type="button" disabled title={t("knowledge.fullDetailUnavailable")}>
          {t("knowledge.openFullText")}
        </button>
      </footer>
    </aside>
  );
}

function KnowledgePreviewEmpty() {
  const { t } = useI18n();
  return (
    <div className="knowledge-preview-empty">
      <span>
        <DatabaseZap size={26} />
      </span>
      <h2>{t("knowledge.previewEmptyTitle")}</h2>
      <p>{t("knowledge.previewEmptyText")}</p>
    </div>
  );
}

function KnowledgeState({ text, error = false }: { text: string; error?: boolean }) {
  return (
    <div className={`knowledge-state ${error ? "error" : ""}`}>
      <BookOpenText size={20} />
      <span>{text}</span>
    </div>
  );
}

function baseTitle(base: KnowledgeBaseDto, fallback: string) {
  return base.name || base.title || fallback;
}

function documentTitle(document: KnowledgeDocumentDto, fallback: string) {
  return document.title || document.name || fallback;
}

function documentIdOf(document: KnowledgeDocumentDto) {
  return document.documentId || document.id || document.title || document.name || "";
}

function documentSummary(document: KnowledgeDocumentDto) {
  return document.summary || document.contentPreview || "";
}

function searchTitle(item: KnowledgeSearchResultDto, fallback: string) {
  return item.documentTitle || item.title || fallback;
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
