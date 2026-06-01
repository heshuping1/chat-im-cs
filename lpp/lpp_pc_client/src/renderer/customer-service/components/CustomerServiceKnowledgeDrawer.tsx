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
    ? buildKnowledgeInsertPayload(currentSelection, selectedBase)
    : null;

  const copySelection = async () => {
    if (!insertPayload?.text) return;
    try {
      await navigator.clipboard.writeText(insertPayload.text);
      onNotice("知识内容已复制。");
    } catch (error) {
      onNotice(`复制失败：${formatError(error)}`);
    }
  };

  return (
    <aside
      className={
        variant === "panel"
          ? "cs-knowledge-drawer cs-knowledge-panel"
          : "cs-knowledge-drawer"
      }
      aria-label="会话知识库"
    >
      <header className="cs-knowledge-drawer-head">
        <span>
          <ClipboardList size={18} />
        </span>
        <div>
          <strong>知识库</strong>
          <p>检索标准答案，插入草稿后人工确认发送</p>
        </div>
        <button type="button" aria-label="关闭知识库" title="关闭" onClick={onClose}>
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
          placeholder="搜索客户问题、规则、流程"
        />
        <button type="submit" disabled={!keyword.trim()}>
          检索
        </button>
      </form>

      <section className="cs-knowledge-base-strip" aria-label="知识库筛选">
        {basesQuery.isLoading ? (
          <KnowledgeDrawerState text="正在读取知识库..." />
        ) : basesQuery.error ? (
          <KnowledgeDrawerState
            error
            text={`知识库加载失败：${formatError(basesQuery.error)}`}
          />
        ) : bases.length === 0 ? (
          <KnowledgeDrawerState text="暂无可用知识库" />
        ) : (
          bases.map((base) => {
            const active = effectiveBaseId === base.knowledgeBaseId;
            return (
              <button
                key={base.knowledgeBaseId}
                className={active ? "active" : ""}
                type="button"
                title={baseTitle(base)}
                onClick={() => {
                  setSelectedBaseId(base.knowledgeBaseId);
                  setSelection(null);
                }}
              >
                <LibraryBig size={14} />
                <span>{baseTitle(base)}</span>
              </button>
            );
          })
        )}
      </section>

      <section className="cs-knowledge-result-zone">
        <div className="cs-knowledge-section-head">
          <strong>{trimmedKeyword ? "检索结果" : "知识文档"}</strong>
          <span>
            {trimmedKeyword ? `${searchResults.length} 条` : `${documents.length} 篇`}
          </span>
        </div>
        {trimmedKeyword ? (
          <SearchResultList
            error={searchQuery.error}
            loading={searchQuery.isLoading}
            results={searchResults}
            selection={currentSelection}
            onSelect={(item) => setSelection({ type: "search", item })}
          />
        ) : (
          <DocumentList
            documents={documents}
            error={documentsQuery.error}
            loading={documentsQuery.isLoading}
            selection={currentSelection}
            onSelect={(item) => setSelection({ type: "document", item })}
          />
        )}
      </section>

      <section className="cs-knowledge-preview">
        {insertPayload ? (
          <>
            <div className="cs-knowledge-preview-title">
              <strong>{insertPayload.title}</strong>
              <span>{insertPayload.sourceLabel || "知识来源"}</span>
            </div>
            <p>{insertPayload.text || "暂无内容预览"}</p>
            <div className="cs-knowledge-actions">
              <button
                type="button"
                disabled={!insertPayload.text}
                onClick={() => onInsert(insertPayload)}
              >
                <CornerDownLeft size={15} />
                插入回复
              </button>
              <button
                className="secondary"
                type="button"
                disabled={!insertPayload.text}
                onClick={() => void copySelection()}
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
          <KnowledgeDrawerState text="选择文档或检索结果后预览内容" />
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
  onSelect,
}: {
  error: unknown;
  loading: boolean;
  results: KnowledgeSearchResultDto[];
  selection: KnowledgeSelection;
  onSelect: (item: KnowledgeSearchResultDto) => void;
}) {
  if (loading) return <KnowledgeDrawerState text="正在检索知识库..." />;
  if (error) return <KnowledgeDrawerState error text={`检索失败：${formatError(error)}`} />;
  if (results.length === 0) return <KnowledgeDrawerState text="暂无匹配结果" />;
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
              <strong>{searchTitle(item)}</strong>
              <p>{searchSnippet(item) || "--"}</p>
              <em>
                {item.knowledgeBaseName || "知识库"}
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
  onSelect,
}: {
  documents: KnowledgeDocumentDto[];
  error: unknown;
  loading: boolean;
  selection: KnowledgeSelection;
  onSelect: (item: KnowledgeDocumentDto) => void;
}) {
  if (loading) return <KnowledgeDrawerState text="正在读取文档..." />;
  if (error) return <KnowledgeDrawerState error text={`文档加载失败：${formatError(error)}`} />;
  if (documents.length === 0) return <KnowledgeDrawerState text="当前知识库暂无启用文档" />;
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
              <strong>{documentTitle(item)}</strong>
              <p>{documentSummary(item) || "暂无摘要"}</p>
              <em>{shortDate(item.updatedAt) || "未提供更新时间"}</em>
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
): KnowledgeInsertPayload {
  if (selection.type === "search") {
    const item = selection.item;
    return {
      title: searchTitle(item),
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
    title: documentTitle(document),
    text: documentSummary(document),
    sourceLabel: selectedBase ? baseTitle(selectedBase) : "知识文档",
    knowledgeBaseId: document.knowledgeBaseId || selectedBase?.knowledgeBaseId,
    knowledgeBaseName: selectedBase ? baseTitle(selectedBase) : undefined,
    documentId: document.documentId,
    documentTitle: documentTitle(document),
  };
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
  const text = formatShortDate(value);
  return text === "--" ? "" : text;
}
