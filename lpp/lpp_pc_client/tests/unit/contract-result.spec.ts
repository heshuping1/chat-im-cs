import { describe, expect, it } from "vitest";
import {
  createContractIssue,
  failedContract,
  hasContractErrorIssue,
  invalidContract,
  okContract,
} from "../../src/renderer/data/api-contract/contract-result";

describe("contract result", () => {
  it("creates ok and degraded results from issue presence", () => {
    expect(okContract({ id: "1" })).toEqual({
      status: "ok",
      data: { id: "1" },
      issues: [],
    });

    expect(
      okContract({ id: "1" }, [
        createContractIssue("im.message.missing_sender", "warning", {
          field: "sender",
        }),
      ]),
    ).toMatchObject({
      status: "degraded",
      data: { id: "1" },
      issues: [
        {
          code: "im.message.missing_sender",
          level: "warning",
          field: "sender",
        },
      ],
    });
  });

  it("creates invalid and failed results without raw payload", () => {
    const invalid = invalidContract([
      createContractIssue("im.conversation.missing_id", "error", {
        field: "conversationId",
      }),
    ]);
    const failed = failedContract(new Error("parse failed"));

    expect(invalid.status).toBe("invalid");
    expect(invalid.data).toBeUndefined();
    expect(hasContractErrorIssue(invalid.issues)).toBe(true);
    expect(failed).toMatchObject({
      status: "failed",
      issues: [],
      error: {
        name: "Error",
        message: "parse failed",
      },
    });
  });
});
