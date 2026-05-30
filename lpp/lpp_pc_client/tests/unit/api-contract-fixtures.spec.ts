import { describe, expect, it } from "vitest";
import { apiContractFixtures } from "./api-contract-fixtures";

describe("api contract fixtures", () => {
  it.each(apiContractFixtures)("$name", ({ normalize, expected }) => {
    const result = normalize();

    expect(result.status).toBe(expected.status);
    if (expected.data) expect(result.data).toMatchObject(expected.data);
    if (expected.issues) {
      expect(result.issues?.map((issue) => issue.code)).toEqual(expected.issues);
    }
  });
});
