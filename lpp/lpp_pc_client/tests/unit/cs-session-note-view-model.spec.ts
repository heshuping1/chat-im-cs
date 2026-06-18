import { describe, expect, it } from "vitest";

import { createCustomerServiceSessionNotesViewModel } from "../../src/renderer/data/customer-service/cs-session-note-view-model";

describe("customer-service session note view model", () => {
  it("keeps pinned notes first and projects display-ready fields", () => {
    const notes = createCustomerServiceSessionNotesViewModel({
      notes: [
        {
          content: "regular",
          createdAt: "2026-06-17T09:00:00.000Z",
          isPinned: false,
          noteId: "note-2",
          staffDisplayName: "Agent B",
        },
        {
          content: "pinned",
          createdAt: "2026-06-16T09:00:00.000Z",
          isPinned: true,
          noteId: "note-1",
          staffDisplayName: "Agent A",
        },
      ],
      formatCreatedAt: (value) => `formatted:${value}`,
    });

    expect(notes).toEqual([
      expect.objectContaining({
        authorName: "Agent A",
        content: "pinned",
        createdAtText: "formatted:2026-06-16T09:00:00.000Z",
        isPinned: true,
        noteId: "note-1",
      }),
      expect.objectContaining({
        authorName: "Agent B",
        content: "regular",
        createdAtText: "formatted:2026-06-17T09:00:00.000Z",
        isPinned: false,
        noteId: "note-2",
      }),
    ]);
  });

  it("exposes contract issues instead of fabricating missing author or time", () => {
    const [note] = createCustomerServiceSessionNotesViewModel({
      notes: [
        {
          content: "missing contract fields",
          createdAt: null,
          isPinned: false,
          noteId: "note-1",
          staffDisplayName: "",
        },
      ],
      formatCreatedAt: (value) => `formatted:${value}`,
    });

    expect(note).toMatchObject({
      authorName: undefined,
      content: "missing contract fields",
      createdAtText: undefined,
      noteId: "note-1",
    });
    expect(note.contractIssues).toEqual([
      expect.objectContaining({
        code: "cs.session_note.staff_display_name_missing",
        field: "staffDisplayName",
        level: "warning",
      }),
      expect.objectContaining({
        code: "cs.session_note.created_at_missing",
        field: "createdAt",
        level: "warning",
      }),
    ]);
  });
});
