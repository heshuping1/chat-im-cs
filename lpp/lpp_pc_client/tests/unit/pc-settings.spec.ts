import { describe, expect, it, vi } from "vitest";
import {
  defaultPcSettings,
  parseStoredPcSettings,
  pcSettingsStorageKey,
  persistPcSettings,
  readStoredPcSettings,
} from "../../src/renderer/data/settings/pc-settings";
import {
  selectPcSettings,
  selectUpdatePcSetting,
} from "../../src/renderer/data/settings/settings-store";

function createMemoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      values.set(key, value);
    }),
    values,
  };
}

describe("pc settings service shell", () => {
  it("reads defaults when storage is empty", () => {
    const storage = createMemoryStorage();

    expect(readStoredPcSettings({ storage })).toEqual(defaultPcSettings);
    expect(defaultPcSettings.customerServiceMessageNotifications).toBe(true);
    expect(defaultPcSettings.foregroundInAppCustomerServiceReminders).toBe(true);
  });

  it("merges persisted settings over defaults", () => {
    const storage = createMemoryStorage({
      [pcSettingsStorageKey]: JSON.stringify({
        theme: "dark",
        desktopNotifications: false,
      }),
    });

    expect(readStoredPcSettings({ storage })).toMatchObject({
      theme: "dark",
      desktopNotifications: false,
      customerServiceMessageNotifications: true,
      foregroundInAppCustomerServiceReminders: true,
      serviceQueueNotifications: defaultPcSettings.serviceQueueNotifications,
    });
  });

  it("migrates the legacy disabled customer-service message reminder default", () => {
    expect(
      parseStoredPcSettings(
        JSON.stringify({
          customerServiceMessageNotifications: false,
          theme: "dark",
        }),
      ),
    ).toMatchObject({
      customerServiceMessageNotifications: true,
      settingsSchemaVersion: defaultPcSettings.settingsSchemaVersion,
      theme: "dark",
    });
  });

  it("keeps an explicitly disabled customer-service message reminder after migration", () => {
    expect(
      parseStoredPcSettings(
        JSON.stringify({
          customerServiceMessageNotifications: false,
          settingsSchemaVersion: defaultPcSettings.settingsSchemaVersion,
        }),
      ),
    ).toMatchObject({
      customerServiceMessageNotifications: false,
      settingsSchemaVersion: defaultPcSettings.settingsSchemaVersion,
    });
  });

  it("returns defaults for malformed persisted settings", () => {
    expect(parseStoredPcSettings("{bad-json")).toEqual(defaultPcSettings);
  });

  it("persists settings through the settings storage key", () => {
    const storage = createMemoryStorage();

    persistPcSettings(defaultPcSettings, storage);

    expect(storage.setItem).toHaveBeenCalledWith(
      pcSettingsStorageKey,
      JSON.stringify(defaultPcSettings),
    );
  });

  it("selects settings state and update action from compatible workspace state", () => {
    const updatePcSetting = vi.fn();
    const state = {
      pcSettings: defaultPcSettings,
      updatePcSetting,
    };

    expect(selectPcSettings(state)).toBe(defaultPcSettings);
    expect(selectUpdatePcSetting(state)).toBe(updatePcSetting);
  });
});
