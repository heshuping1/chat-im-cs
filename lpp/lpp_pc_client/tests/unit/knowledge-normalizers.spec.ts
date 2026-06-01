import { describe, expect, it } from "vitest";
import {
  normalizeKnowledgeBasesResponse,
  normalizeKnowledgeDocumentsResponse,
  normalizeKnowledgeSearchResponse,
} from "../../src/renderer/data/api/knowledge-normalizers";

describe("knowledge normalizers", () => {
  it("normalizes base list wrappers used by knowledge APIs", () => {
    expect(
      normalizeKnowledgeBasesResponse({
        items: [
          {
            id: 12,
            title: "FAQ",
            summary: "Common answers",
            document_count: "3",
          },
          { title: "missing id" },
        ],
      }),
    ).toEqual([
      expect.objectContaining({
        knowledgeBaseId: "12",
        name: "FAQ",
        documentCount: 3,
      }),
    ]);
  });

  it("normalizes document wrappers without throwing on empty or unexpected payloads", () => {
    expect(normalizeKnowledgeDocumentsResponse(null)).toEqual([]);
    expect(
      normalizeKnowledgeDocumentsResponse({
        data: {
          documents: [
            {
              docId: "doc-1",
              name: "Deposit guide",
              preview: "How to verify deposits",
            },
          ],
        },
      }),
    ).toEqual([
      expect.objectContaining({
        documentId: "doc-1",
        title: "Deposit guide",
        contentPreview: "How to verify deposits",
      }),
    ]);
  });

  it("normalizes search arrays and response objects into renderable hits", () => {
    expect(
      normalizeKnowledgeSearchResponse({
        results: [
          {
            chunk_id: "chunk-1",
            docId: "doc-1",
            title: "KYC rejection",
            path: ["KYC", "Review"],
            similarity: "0.83",
          },
        ],
      }),
    ).toEqual([
      expect.objectContaining({
        chunkId: "chunk-1",
        documentId: "doc-1",
        documentTitle: "KYC rejection",
        headingPath: ["KYC", "Review"],
        score: 0.83,
      }),
    ]);
  });

  it("keeps knowledge search source metadata from mixed server field aliases", () => {
    expect(
      normalizeKnowledgeSearchResponse({
        data: {
          chunks: [
            {
              id: "chunk-2",
              kbId: 7,
              kbName: "Trading Rules",
              documentTitle: "Withdrawal review",
              heading_path: "Risk / Withdrawal",
              content: "Verify beneficiary name before approval.",
              rankScore: 0.91,
            },
          ],
        },
      }),
    ).toEqual([
      expect.objectContaining({
        chunkId: "chunk-2",
        knowledgeBaseId: "7",
        knowledgeBaseName: "Trading Rules",
        documentTitle: "Withdrawal review",
        headingPath: "Risk / Withdrawal",
        snippet: "Verify beneficiary name before approval.",
        score: 0.91,
      }),
    ]);
  });

  it("drops unrenderable knowledge items but keeps documents with titles only", () => {
    expect(
      normalizeKnowledgeDocumentsResponse({
        list: [{ title: "Title-only article" }, { unknown: true }],
      }),
    ).toEqual([expect.objectContaining({ title: "Title-only article" })]);

    expect(
      normalizeKnowledgeSearchResponse({
        items: [{ score: 0.4 }, { title: "Renderable result" }],
      }),
    ).toEqual([expect.objectContaining({ title: "Renderable result" })]);
  });
});
