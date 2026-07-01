import type { ClientUpdatePackageInfo } from '../shared/desktop-api.js';

interface AppReleaseLatestEnvelope {
  code?: unknown;
  message?: unknown;
  data?: unknown;
}

interface AppReleaseLatestData {
  updateAvailable?: unknown;
  forceUpdate?: unknown;
  latestVersion?: unknown;
  latestVersionCode?: unknown;
  downloadUrl?: unknown;
  fileSizeBytes?: unknown;
  fileHashSha256?: unknown;
  releaseNotes?: unknown;
}

export function normalizeAppReleaseUpdateResponse(
  envelope: AppReleaseLatestEnvelope,
  apiBaseUrl: string,
): ClientUpdatePackageInfo | undefined {
  if (envelope.code !== 'OK') {
    throw new Error(optionalString(envelope.message) ?? '更新检查失败');
  }
  const data = objectValue(envelope.data, 'appRelease.data') as AppReleaseLatestData;
  if (data.updateAvailable !== true) return undefined;
  const version = requiredString(data.latestVersion, 'latestVersion');
  const downloadUrl = requiredString(data.downloadUrl, 'downloadUrl');
  return {
    fileHashSha256: optionalString(data.fileHashSha256),
    force: data.forceUpdate === true,
    latestVersionCode: optionalNumber(data.latestVersionCode),
    packageUrl: resolveUpdateDownloadUrl(apiBaseUrl, downloadUrl),
    releaseNotes: optionalString(data.releaseNotes),
    sizeBytes: optionalNumber(data.fileSizeBytes),
    updateKind: 'full',
    version,
  };
}

export function resolveDesktopVersionCode(
  version: string,
  explicitBuildVersionCode: unknown,
) {
  const explicit = optionalNumber(explicitBuildVersionCode);
  if (explicit && explicit > 0) return explicit;
  const [major = 0, minor = 0, patch = 0] = version
    .split('.')
    .map((part) => Number.parseInt(part, 10))
    .map((part) => (Number.isFinite(part) && part >= 0 ? part : 0));
  return major * 10000 + minor * 100 + patch;
}

export function resolveUpdateDownloadUrl(apiBaseUrl: string, downloadUrl: string) {
  const uri = new URL(downloadUrl, apiBaseUrl);
  return uri.toString();
}

function objectValue(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function requiredString(value: unknown, label: string) {
  const text = optionalString(value);
  if (!text) throw new Error(`更新服务返回缺少 ${label}`);
  return text;
}

function optionalString(value: unknown) {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function optionalNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}
