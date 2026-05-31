import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { readOrCreateAppInstanceIdentity } from "../../src/main/app-instance-identity";

describe("app instance identity", () => {
  it("shares the physical device id across profiles and isolates client instance ids", async () => {
    const root = await mkdtemp(join(tmpdir(), "lpp-pc-identity-"));
    try {
      const main = await readOrCreateAppInstanceIdentity({
        defaultUserDataPath: root,
        profileId: null,
        profileName: "主客户端",
        userDataPath: root,
      });
      const secondary = await readOrCreateAppInstanceIdentity({
        defaultUserDataPath: root,
        profileId: "client-2",
        profileName: "client-2",
        userDataPath: join(root, "profiles", "client-2"),
      });
      const secondaryAgain = await readOrCreateAppInstanceIdentity({
        defaultUserDataPath: root,
        profileId: "client-2",
        profileName: "client-2",
        userDataPath: join(root, "profiles", "client-2"),
      });

      expect(main.deviceId).toBeTruthy();
      expect(secondary.deviceId).toBe(main.deviceId);
      expect(secondaryAgain.clientInstanceId).toBe(secondary.clientInstanceId);
      expect(secondary.clientInstanceId).not.toBe(main.clientInstanceId);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
