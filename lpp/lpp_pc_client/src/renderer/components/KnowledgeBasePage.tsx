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
import { pcQueryKeys } from "../data/query-keys";
import { createApiClient } from "../data/runtime";
import { useWorkspaceStore } from "../data/store";
import { formatError } from "../lib/format";

type KnowledgeSelection =
  | { type: "search"; item: KnowledgeSearchResultDto }
  | { type: "document"; item: KnowledgeDocumentDto }
  | null;

export function KnowledgeBasePage() {
  const session = useWorkspaceStore((state) => state.authSession);
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

  const bases = normalizeBases(basesQuery.data ?? []);
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
    queryFn: async () => normalizeDocuments(await client!.getKnowledgeDocuments(effectiveBaseId)),
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
  const searchResults = normalizeSearchResults(searchQuery.data?.items ?? []);

  const currentSelection =
    selection ??
    (searchResults[0]
      ? { type: "search" as const, item: searchResults[0] }
      : documentsQuery.data?.[0]
        ? { type: "document" as const, item: documentsQuery.data[0] }
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
          <h1>知识库</h1>
          <p>客服查规则、找流程、引用标准答案的统一入口。</p>
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
            placeholder="搜索客户问题、业务规则、处理流程"
          />
          <button type="submit">检索</button>
        </form>

        <section className="knowledge-base-panel">
          <div className="knowledge-section-head">
            <strong>知识库</strong>
            <span>{bases.length}</span>
          </div>
          {basesQuery.isLoading ? (
            <KnowledgeState text="正在读取知识库..." />
          ) : basesQuery.error ? (
            <KnowledgeState error text={`知识库加载失败：${formatError(basesQuery.error)}`} />
          ) : bases.length === 0 ? (
            <KnowledgeState text="暂无可用知识库" />
          ) : (
            <div className="knowledge-base-list" aria-label="知识库列表">
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
                    <strong>{baseTitle(base)}</strong>
                    <em>{base.description || base.summary || "已启用"}</em>
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
            <h2>{trimmedKeyword ? "检索结果" : "知识文档"}</h2>
            <p>
              {trimmedKeyword
                ? `关键词：${trimmedKeyword}`
                : selectedBase
                  ? baseTitle(selectedBase)
                  : "选择知识库后查看文档"}
            </p>
          </div>
          <span>
            {trimmedKeyword
              ? `${searchResults.length} 条`
              : `${documentsQuery.data?.length ?? 0} 篇`}
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
            documents={documentsQuery.data ?? []}
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
  if (loading) return <KnowledgeState text="正在检索知识库..." />;
  if (error) return <KnowledgeState error text={`检索失败：${formatError(error)}`} />;
  if (results.length === 0) return <KnowledgeState text="暂无匹配结果" />;
  return (
    <div className="knowledge-result-list" aria-label="知识库检索结果">
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
              <strong>{searchTitle(item)}</strong>
              <p>{item.snippet || item.summary || item.contentPreview || "--"}</p>
              <em>
                {item.knowledgeBaseName || "知识库"}
                {item.score != null && ` · 匹配度 ${Math.round(item.score * 100)}%`}
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
  if (loading) return <KnowledgeState text="正在读取文档..." />;
  if (error) return <KnowledgeState error text={`文档加载失败：${formatError(error)}`} />;
  if (documents.length === 0) return <KnowledgeState text="当前知识库暂无启用文档" />;
  return (
    <div className="knowledge-result-list" aria-label="知识库文档列表">
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
              <strong>{documentTitle(item)}</strong>
              <p>{item.summary || item.contentPreview || "暂无摘要"}</p>
              <em>{shortDate(item.updatedAt) || "未提供更新时间"}</em>
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
    ? searchTitle(item as KnowledgeSearchResultDto)
    : documentTitle(item as KnowledgeDocumentDto);
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
              ? (item as KnowledgeSearchResultDto).knowledgeBaseName || "检索命中"
              : selectedBase
                ? baseTitle(selectedBase)
                : "知识文档"}
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
        <p>{summary || "暂无内容预览"}</p>
      </section>
      <footer>
        <span>{isSearch ? "检索片段" : "文档预览"}</span>
        <button type="button" disabled title="完整详情接口未提供">
          打开全文
        </button>
      </footer>
    </aside>
  );
}

function KnowledgePreviewEmpty() {
  return (
    <div className="knowledge-preview-empty">
      <span>
        <DatabaseZap size={26} />
      </span>
      <h2>选择一条知识内容</h2>
      <p>左侧选择知识库，中间点击文档或检索结果后，这里会展示摘要、命中片段和来源。</p>
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

function normalizeBases(items: KnowledgeBaseDto[]) {
  return items
    .map((item) => ({
      ...item,
      knowledgeBaseId: item.knowledgeBaseId || item.id || "",
    }))
    .filter((item) => item.knowledgeBaseId);
}

function normalizeDocuments(
  payload: KnowledgeDocumentDto[] | { items?: KnowledgeDocumentDto[] },
) {
  const items = Array.isArray(payload) ? payload : payload.items ?? [];
  return items
    .map((item) => ({
      ...item,
      documentId: item.documentId || item.id || "",
    }))
    .filter((item) => item.documentId || item.title || item.name);
}

function normalizeSearchResults(items: KnowledgeSearchResultDto[]) {
  return items.filter((item) => item.documentId || item.documentTitle || item.title || item.snippet);
}

function baseTitle(base: KnowledgeBaseDto) {
  return base.name || base.title || "知识库";
}

function documentTitle(document: KnowledgeDocumentDto) {
  return document.title || document.name || "知识文档";
}

function documentIdOf(document: KnowledgeDocumentDto) {
  return document.documentId || document.id || document.title || document.name || "";
}

function documentSummary(document: KnowledgeDocumentDto) {
  return document.summary || document.contentPreview || "";
}

function searchTitle(item: KnowledgeSearchResultDto) {
  return item.documentTitle || item.title || "知识结果";
}

function searchSnippet(item: KnowledgeSearchResultDto) {
  return item.snippet || item.summary || item.contentPreview || item.content || "";
}

function headingPathText(value: string | string[] | null | undefined) {
  if (!value) return "";
  return Array.isArray(value) ? value.join(" / ") : value;
}

function shortDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}
