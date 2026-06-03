import { describe, expect, it, vi } from "vitest";
import {
  autoTranslateConversationPreferenceKey,
  autoTranslateConversationPreferencesStorageKey,
  readAutoTranslateConversationPreference,
  resolveAutoTranslateEnabled,
  updateAutoTranslateConversationPreference,
} from "../../src/renderer/translation/models/autoTranslatePreferences";

function memoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => values.set(key, value)),
    values,
  };
}

describe("auto translate conversation preferences", () => {
  it("resolves inherit enabled disabled modes over the global setting", () => {
    expect(resolveAutoTranslateEnabled(true, "inherit")).toBe(true);
    expect(resolveAutoTranslateEnabled(false, "inherit")).toBe(false);
    expect(resolveAutoTranslateEnabled(false, "enabled")).toBe(true);
    expect(resolveAutoTranslateEnabled(true, "disabled")).toBe(false);
    expect(resolveAutoTranslateEnabled(true, "bad-value")).toBe(true);
  });

  it("stores conversation preferences by workspace scope and conversation identity", () => {
    const storage = memoryStorage();

    updateAutoTranslateConversationPreference(storage, {
      conversationId: "c-1",
      conversationKind: "im-direct",
      mode: "enabled",
      scopeKey: "scope-a",
    });
    updateAutoTranslateConversationPreference(storage, {
      conversationId: "c-1",
      conversationKind: "im-direct",
      mode: "disabled",
      scopeKey: "scope-b",
    });

    expect(storage.setItem).toHaveBeenCalledWith(
      autoTranslateConversationPreferencesStorageKey,
      expect.any(String),
    );
    expect(
      readAutoTranslateConversationPreference(storage, {
        conversationId: "c-1",
        conversationKind: "im-direct",
        scopeKey: "scope-a",
      }),
    ).toBe("enabled");
    expect(
      readAutoTranslateConversationPreference(storage, {
        conversationId: "c-1",
        conversationKind: "im-direct",
        scopeKey: "scope-b",
      }),
    ).toBe("disabled");
    expect(
      autoTranslateConversationPreferenceKey({
        conversationId: "c-1",
        conversationKind: "customer-service",
        scopeKey: "scope-a",
      }),
    ).toBe("scope-a::customer-service::c-1");
  });

  it("falls back to inherit for malformed persisted data", () => {
    const storage = memoryStorage({
      [autoTranslateConversationPreferencesStorageKey]: "{bad-json",
    });

    expect(
      readAutoTranslateConversationPreference(storage, {
        conversationId: "c-1",
        conversationKind: "im-direct",
        scopeKey: "scope-a",
      }),
    ).toBe("inherit");
  });
});
