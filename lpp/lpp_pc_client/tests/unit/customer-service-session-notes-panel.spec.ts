import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("customer-service session notes panel boundaries", () => {
  const source = readFileSync(
    resolve(
      process.cwd(),
      "src/renderer/customer-service/components/CustomerServiceSessionNotesPanel.tsx",
    ),
    "utf8",
  );

  it("renders normalized note view models instead of parsing API DTO fields", () => {
    expect(source).toContain("createCustomerServiceSessionNotesViewModel");
    expect(source).toContain("CustomerServiceSessionNoteViewModel");
    expect(source).not.toContain("CustomerServiceSessionNoteDto");
    expect(source).not.toContain("note.staffDisplayName");
    expect(source).not.toMatch(/\bnote\.createdAt\b/);
    expect(source).not.toContain("unknownStaff");
    expect(source).not.toContain("unknownTime");
  });
});
