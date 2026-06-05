# PC Client Update Service Contract

This contract covers the first Windows x64 release of the LPP PC client updater.

## Client Request

`GET /api/client-updates/latest`

Query parameters:

- `appId`: `lppchat`
- `platform`: `windows`
- `arch`: `x64`
- `currentVersion`: client semantic version
- `channel`: `stable` or `beta`
- `tenantId`: optional tenant scope
- `deviceId`: stable desktop device id

The client sends `Authorization: Bearer <tenantToken>` when a tenant session exists.

## Latest Response

```json
{
  "hasUpdate": true,
  "version": "0.1.1",
  "force": false,
  "releaseNotes": "Bug fixes and desktop update support.",
  "updateKind": "delta",
  "packageUrl": "https://cdn.example.com/lppchat-0.1.0-to-0.1.1-win-x64.patch",
  "latestYmlUrl": "https://cdn.example.com/latest.yml",
  "sha512": "base64-sha512",
  "sizeBytes": 123456,
  "fallbackFullPackageUrl": "https://cdn.example.com/lppchat-0.1.1-win-x64.exe",
  "fallbackSha512": "base64-sha512",
  "publishedAt": "2026-06-05T00:00:00.000Z"
}
```

`latestYmlUrl` is optional in the API plan but required when the client should use `electron-updater` / NSIS differential download. Without it, the client derives the updater feed directory from the full package URL. A standalone custom binary patch URL is not enough for the first version because the client intentionally does not implement a custom binary diff engine.

When there is no update:

```json
{
  "hasUpdate": false
}
```

## Models

Version release:

- `version`
- `platform`
- `arch`
- `channel`
- `releaseNotes`
- `force`
- `enabled`
- `publishedAt`
- `minSupportedVersion`
- `grayPercent`
- `tenantScope`

Full package:

- `version`
- `platform`
- `arch`
- `installerUrl`
- `latestYmlUrl`
- `sha512`
- `sizeBytes`

Delta package:

- `fromVersion`
- `toVersion`
- `platform`
- `arch`
- `patchUrl`
- `sha512`
- `sizeBytes`
- `fallbackFullPackageId`

## Selection Logic

1. If there is no enabled newer version in the requested channel, return `hasUpdate=false`.
2. If `currentVersion < minSupportedVersion`, return a forced full update.
3. If the rollout policy excludes the tenant/device, return `hasUpdate=false`.
4. If an enabled delta package exists for `currentVersion -> latestVersion` and it has URL, hash, size, and fallback full package, return `updateKind="delta"`.
5. Otherwise return `updateKind="full"`.
6. If any package hash, size, version relation, or file URL is invalid, reject publishing instead of returning a broken package.

## Management APIs Needed

- Register/upload full package metadata.
- Register/upload delta package or blockmap metadata.
- Publish, unpublish, enable, and disable versions.
- Set forced update and minimum supported version.
- Configure channel, gray percent, and tenant scope.
- Query update check, download, install, and failure logs.

Large files should be stored in object storage/CDN. The service should store only URL, hash, size, version relation, channel, and release policy metadata.
