import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

import {
  appUserModelIdForProfile,
  buildAppProfileLaunchArgs,
  configureAppInstanceProfile,
  createNextProfileId,
  formatProfileWindowTitle,
  resolveAppInstanceProfileId,
} from "../../src/main/app-instance-profile";

describe("app instance profile", () => {
  it("keeps the default single profile when no profile is configured", () => {
    expect(resolveAppInstanceProfileId({ argv: ["electron", "."], env: {} })).toBeNull();
    expect(formatProfileWindowTitle("LPP", null)).toBe("LPP");
  });

  it("reads and normalizes profile ids from CLI args before env", () => {
    expect(
      resolveAppInstanceProfileId({
        argv: ["electron", ".", "--profile=Agent A"],
        env: { LPP_PC_PROFILE: "env-profile" },
      }),
    ).toBe("agent-a");

    expect(
      resolveAppInstanceProfileId({
        argv: ["electron", ".", "--pc-profile", "客服二号"],
        env: {},
      }),
    ).toBeNull();
  });

  it("uses environment profile when CLI args are not provided", () => {
    expect(
      resolveAppInstanceProfileId({
        argv: ["electron", "."],
        env: { LPP_PC_INSTANCE_PROFILE: "staff_02" },
      }),
    ).toBe("staff_02");
  });

  it("moves userData into a profile-specific directory", () => {
    const app = {
      getPath: vi.fn(() => join("C:", "Users", "tester", "AppData", "lppchat")),
      setPath: vi.fn(),
      setAppUserModelId: vi.fn(),
    };

    const profile = configureAppInstanceProfile(app, {
      argv: ["electron", ".", "--profile", "agent-b"],
      env: {},
    });

    expect(profile).toEqual({
      defaultUserDataPath: join("C:", "Users", "tester", "AppData", "lppchat"),
      profileId: "agent-b",
      profileName: "agent-b",
      userDataPath: join("C:", "Users", "tester", "AppData", "lppchat", "profiles", "agent-b"),
    });
    expect(app.setPath).toHaveBeenCalledWith("userData", profile.userDataPath);
  });

  it("keeps profile app user model ids under the product prefix", () => {
    expect(appUserModelIdForProfile(null)).toBe("com.lppchat.desktop");
    expect(appUserModelIdForProfile("agent-a")).toBe("com.lppchat.desktop.agent-a");
  });

  it("allocates the next explicit client profile id", () => {
    expect(createNextProfileId([])).toBe("client-2");
    expect(createNextProfileId(["client-2", "client-3"])).toBe("client-4");
  });

  it("replaces existing profile launch args with the target profile", () => {
    expect(
      buildAppProfileLaunchArgs(
        ["electron", ".", "--profile", "client-2", "--inspect"],
        "client-3",
      ),
    ).toEqual([".", "--inspect", "--profile=client-3"]);
    expect(
      buildAppProfileLaunchArgs(["electron", ".", "--profile=client-2"], "client-4"),
    ).toEqual([".", "--profile=client-4"]);
  });
});
