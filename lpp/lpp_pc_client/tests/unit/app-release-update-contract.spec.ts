import { describe, expect, it } from "vitest";
import {
  normalizeAppReleaseUpdateResponse,
  resolveDesktopVersionCode,
} from "../../src/main/app-release-update-contract";

describe("app release update contract", () => {
  it("normalizes the server latest envelope for Windows updates", () => {
    const update = normalizeAppReleaseUpdateResponse(
      {
        code: "OK",
        data: {
          appKey: "staff",
          platform: "windows",
          clientVersionCode: 100,
          latestVersion: "1.0.5",
          latestVersionCode: 105,
          downloadUrl:
            "/api/client/v1/app-releases/download?appKey=staff&platform=windows&version=latest",
          fileSizeBytes: 62_914_560,
          fileHashSha256: "a".repeat(64),
          releaseNotes: "修复更新链路",
          updateAvailable: true,
          forceUpdate: false,
        },
      },
      "https://chat.hearteasechat.com",
    );

    expect(update).toMatchObject({
      fileHashSha256: "a".repeat(64),
      force: false,
      packageUrl:
        "https://chat.hearteasechat.com/api/client/v1/app-releases/download?appKey=staff&platform=windows&version=latest",
      releaseNotes: "修复更新链路",
      sizeBytes: 62_914_560,
      updateKind: "full",
      version: "1.0.5",
    });
  });

  it("returns undefined when the server reports no update", () => {
    expect(
      normalizeAppReleaseUpdateResponse(
        {
          code: "OK",
          data: {
            appKey: "staff",
            platform: "windows",
            clientVersionCode: 105,
            latestVersion: "1.0.5",
            latestVersionCode: 105,
            downloadUrl: null,
            fileSizeBytes: null,
            fileHashSha256: null,
            releaseNotes: null,
            updateAvailable: false,
            forceUpdate: false,
          },
        },
        "https://chat.hearteasechat.com",
      ),
    ).toBeUndefined();
  });

  it("uses explicit buildVersionCode before deriving from semver", () => {
    expect(resolveDesktopVersionCode("1.0.4", 104)).toBe(104);
    expect(resolveDesktopVersionCode("1.2.3", undefined)).toBe(10203);
  });
});
