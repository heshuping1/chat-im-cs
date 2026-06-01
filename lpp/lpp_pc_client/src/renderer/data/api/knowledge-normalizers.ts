import type {
  KnowledgeBaseDto,
  KnowledgeDocumentDto,
  KnowledgeSearchResultDto,
} from "./types";

const baseListKeys = ["items", "knowledgeBases", "bases", "records", "list", "results", "data"];
const documentListKeys = ["items", "documents", "records", "list", "results", "data"];
const searchListKeys = ["items", "results", "chunks", "records", "list", "data"];

export function normalizeKnowledgeBasesResponse(payload: unknown): KnowledgeBaseDto[] {
  return extractArray(payload, baseListKeys)
    .map((item) => normalizeKnowledgeBase(item))
    .filter((item): item is KnowledgeBaseDto => Boolean(item?.knowledgeBaseId));
}

export function normalizeKnowledgeDocumentsResponse(payload: unknown): KnowledgeDocumentDto[] {
  return extractArray(payload, documentListKeys)
    .map((item) => normalizeKnowledgeDocument(item))
    .filter((item): item is KnowledgeDocumentDto =>
      Boolean(item?.documentId || item?.title || item?.name),
    );
}

export function normalizeKnowledgeSearchResponse(payload: unknown): KnowledgeSearchResultDto[] {
  return extractArray(payload, searchListKeys)
    .map((item) => normalizeKnowledgeSearchResult(item))
    .filter((item): item is KnowledgeSearchResultDto =>
      Boolean(item?.documentId || item?.documentTitle || item?.title || item?.snippet),
    );
}

function normalizeKnowledgeBase(payload: unknown): KnowledgeBaseDto | null {
  const item = asRecord(payload);
  if (!item) return null;
  return {
    ...(item as Partial<KnowledgeBaseDto>),
    knowledgeBaseId: readString(item, ["knowledgeBaseId", "id", "baseId", "kbId"]),
    id: readOptionalString(item, ["id"]),
    name: readOptionalString(item, ["name", "title"]),
    title: readOptionalString(item, ["title", "name"]),
    description: readNullableString(item, ["description", "summary"]),
    summary: readNullableString(item, ["summary", "description"]),
    documentCount: readOptionalNumber(item, ["documentCount", "document_count", "documentsCount"]),
    updatedAt: readNullableString(item, ["updatedAt", "updated_at"]),
  };
}

function normalizeKnowledgeDocument(payload: unknown): KnowledgeDocumentDto | null {
  const item = asRecord(payload);
  if (!item) return null;
  return {
    ...(item as Partial<KnowledgeDocumentDto>),
    documentId: readString(item, ["documentId", "id", "docId"]),
    id: readOptionalString(item, ["id"]),
    knowledgeBaseId: readOptionalString(item, ["knowledgeBaseId", "baseId", "kbId"]),
    title: readOptionalString(item, ["title", "name"]),
    name: readOptionalString(item, ["name", "title"]),
    summary: readNullableString(item, ["summary", "description"]),
    contentPreview: readNullableString(item, ["contentPreview", "preview", "snippet", "content"]),
    updatedAt: readNullableString(item, ["updatedAt", "updated_at"]),
  };
}

function normalizeKnowledgeSearchResult(payload: unknown): KnowledgeSearchResultDto | null {
  const item = asRecord(payload);
  if (!item) return null;
  return {
    ...(item as Partial<KnowledgeSearchResultDto>),
    chunkId: readOptionalString(item, ["chunkId", "chunk_id", "id"]),
    knowledgeBaseId: readOptionalString(item, ["knowledgeBaseId", "baseId", "kbId"]),
    knowledgeBaseName: readOptionalString(item, ["knowledgeBaseName", "baseName", "kbName"]),
    documentId: readOptionalString(item, ["documentId", "docId"]),
    documentTitle: readOptionalString(item, ["documentTitle", "title", "name"]),
    title: readOptionalString(item, ["title", "documentTitle", "name"]),
    headingPath: readHeadingPath(item.headingPath ?? item.heading_path ?? item.path),
    snippet: readNullableString(item, ["snippet", "contentPreview", "preview", "content"]),
    summary: readNullableString(item, ["summary", "description"]),
    contentPreview: readNullableString(item, ["contentPreview", "preview", "snippet"]),
    content: readNullableString(item, ["content", "text"]),
    score: readOptionalNumber(item, ["score", "similarity", "rankScore"]),
  };
}

function extractArray(payload: unknown, keys: string[]): unknown[] {
  if (Array.isArray(payload)) return payload;
  const record = asRecord(payload);
  if (!record) return [];
  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) return value;
    if (key === "data") {
      const nested = extractArray(value, keys.filter((item) => item !== "data"));
      if (nested.length > 0) return nested;
    }
  }
  return [];
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function readString(record: Record<string, unknown>, keys: string[]) {
  return readOptionalString(record, keys) ?? "";
}

function readOptionalString(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return undefined;
}

function readNullableString(record: Record<string, unknown>, keys: string[]) {
  const value = readOptionalString(record, keys);
  return value ?? null;
}

function readOptionalNumber(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return undefined;
}

function readHeadingPath(value: unknown) {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean);
  }
  return undefined;
}
