export const primarySiteId = "main-1";
export const primarySiteName = "主站1";
export const primarySiteBaseUrl = "https://chat.hearteasechat.com";
export const primaryAdminBaseUrl = "https://admin.hearteasechat.com";

const cachedSwitchableSitesKey = "site_line_cached_switchable_sites_v1";
const currentSiteIdKey = "site_line_current_site_id_v1";
const probeTimeoutMs = 4_000;

export interface AppSiteLine {
  id: string;
  name: string;
  apiBaseUrl: string;
  adminBaseUrl?: string;
  configFileUrl?: string;
  isPrimary?: boolean;
}

export interface SiteLineState {
  currentSite: AppSiteLine;
  switchableSites: AppSiteLine[];
  initialized: boolean;
  isRefreshing: boolean;
  refreshedConfig: boolean;
  selectedFromConfigFile?: string;
  error?: string;
}

export interface SiteLineBootstrapResult {
  currentSite: AppSiteLine;
  switchableSites: AppSiteLine[];
  refreshedConfig: boolean;
  selectedFromConfigFile?: string;
}

export interface SiteLineStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

export type SiteProbe = (site: AppSiteLine) => Promise<boolean>;
export type ConfigFetcher = (configFileUrl: string) => Promise<AppSiteLine[]>;

export const primarySiteLine: AppSiteLine = {
  id: primarySiteId,
  name: primarySiteName,
  apiBaseUrl: primarySiteBaseUrl,
  adminBaseUrl: primaryAdminBaseUrl,
  isPrimary: true,
};

const initialState: SiteLineState = {
  currentSite: primarySiteLine,
  switchableSites: [primarySiteLine],
  initialized: false,
  isRefreshing: false,
  refreshedConfig: false,
};

class PcSiteLineManager {
  private state: SiteLineState = initialState;
  private listeners = new Set<() => void>();
  private storage: SiteLineStorage | null = null;

  getSnapshot = () => this.state;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  async bootstrap(options: {
    storage?: SiteLineStorage | null;
    probe?: SiteProbe;
    fetchConfig?: ConfigFetcher;
    fallbackS3ConfigFileUrl?: string;
  } = {}): Promise<SiteLineBootstrapResult> {
    this.storage = options.storage ?? safeLocalStorage();
    this.setState({ ...this.state, isRefreshing: true, error: undefined });
    const cachedSwitchableSites = readCachedSwitchableSites(this.storage);
    const currentSite =
      siteById(readCurrentSiteId(this.storage), cachedSwitchableSites) ?? primarySiteLine;

    const candidates = configFetchCandidates({
      currentSite,
      cachedSwitchableSites,
      fallbackS3ConfigFileUrl:
        options.fallbackS3ConfigFileUrl ?? fallbackS3ConfigFileUrl(),
    });

    let switchableSites = cachedSwitchableSites;
    let refreshedConfig = false;
    let selectedFromConfigFile: string | undefined;
    const effectiveFetcher = options.fetchConfig ?? fetchConfigFile;
    for (const configFileUrl of candidates) {
      try {
        const fetched = await effectiveFetcher(configFileUrl);
        const normalized = dedupeSwitchableSites(fetched);
        if (normalized.length === 0) continue;
        switchableSites = normalized;
        writeCachedSwitchableSites(this.storage, normalized);
        refreshedConfig = true;
        selectedFromConfigFile = configFileUrl;
        break;
      } catch (error) {
        console.warn("[site-line:diagnostic] configfile failed", {
          configFileUrl,
          reason: error instanceof Error ? error.message : "unknown_error",
        });
      }
    }

    const selected = await selectFirstAvailableSite(
      [primarySiteLine, ...switchableSites],
      options.probe ?? probeSite,
    );
    writeCurrentSiteId(this.storage, selected.id);
    const result: SiteLineBootstrapResult = {
      currentSite: selected,
      switchableSites: [primarySiteLine, ...switchableSites],
      refreshedConfig,
      selectedFromConfigFile,
    };
    this.setState({
      ...result,
      initialized: true,
      isRefreshing: false,
      error: undefined,
    });
    return result;
  }

  async refresh(options: {
    probe?: SiteProbe;
    fetchConfig?: ConfigFetcher;
    fallbackS3ConfigFileUrl?: string;
  } = {}) {
    return this.bootstrap({
      storage: this.storage ?? safeLocalStorage(),
      ...options,
    });
  }

  selectSite(site: AppSiteLine) {
    const normalized = normalizeSiteLine(site);
    const storage = this.storage ?? safeLocalStorage();
    writeCurrentSiteId(storage, normalized.id);
    const nextSites = dedupeSites([primarySiteLine, ...this.state.switchableSites, normalized]);
    writeCachedSwitchableSites(
      storage,
      nextSites.filter((item) => item.id !== primarySiteId && !item.isPrimary),
    );
    this.setState({
      ...this.state,
      currentSite: normalized,
      switchableSites: nextSites,
    });
    return normalized;
  }

  private setState(next: SiteLineState) {
    this.state = {
      ...next,
      switchableSites: dedupeSites(next.switchableSites),
    };
    this.listeners.forEach((listener) => listener());
  }
}

export const siteLineManager = new PcSiteLineManager();

export function normalizeSiteLine(site: AppSiteLine): AppSiteLine {
  const apiBaseUrl = normalizeBaseUrl(site.apiBaseUrl);
  const id = (site.id || apiBaseUrl).trim();
  return {
    id,
    name: (site.name || id).trim(),
    apiBaseUrl,
    adminBaseUrl: normalizeNullableBaseUrl(site.adminBaseUrl),
    configFileUrl: site.configFileUrl?.trim() || undefined,
    isPrimary: site.isPrimary === true || id === primarySiteId,
  };
}

export function parseSiteLineConfig(body: unknown): AppSiteLine[] {
  const decoded = typeof body === "string" ? JSON.parse(body) : body;
  return dedupeSwitchableSites(
    extractSiteItems(decoded)
      .filter((item): item is Record<string, unknown> => item !== null && typeof item === "object" && !Array.isArray(item))
      .map((item) => siteLineFromRecord(item))
      .filter((site) => site.apiBaseUrl.length > 0),
  );
}

export function configFetchCandidates({
  currentSite,
  cachedSwitchableSites,
  fallbackS3ConfigFileUrl,
}: {
  currentSite: AppSiteLine;
  cachedSwitchableSites: AppSiteLine[];
  fallbackS3ConfigFileUrl: string;
}) {
  const orderedSites = [
    ...(currentSite.isPrimary ? [] : [currentSite]),
    ...cachedSwitchableSites.filter((site) => site.id !== currentSite.id),
  ];
  const seen = new Set<string>();
  const urls: string[] = [];
  for (const site of orderedSites) {
    const url = site.configFileUrl?.trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    urls.push(url);
  }
  const fallback = fallbackS3ConfigFileUrl.trim();
  if (fallback && !seen.has(fallback)) urls.push(fallback);
  return urls;
}

export async function selectFirstAvailableSite(
  sites: AppSiteLine[],
  probe: SiteProbe,
) {
  const deduped = dedupeSites(sites);
  for (const site of deduped) {
    try {
      if (await probe(site)) return site;
    } catch {
      // Ignore a failed probe and continue with the next configured line.
    }
  }
  return deduped[0] ?? primarySiteLine;
}

export async function probeSite(site: AppSiteLine) {
  try {
    const response = await fetchWithTimeout(site.apiBaseUrl, probeTimeoutMs);
    return response.status > 0 && response.status < 500;
  } catch {
    return false;
  }
}

export async function measureSiteLatency(site: AppSiteLine) {
  const startedAt = Date.now();
  const available = await probeSite(site);
  return available ? Date.now() - startedAt : null;
}

export function latencyText(value: number | null | undefined, testing = false) {
  if (testing) return "测试中";
  if (value === undefined) return "未测试";
  if (value === null) return "不可用";
  return `${value} ms`;
}

export function latencyTone(value: number | null | undefined) {
  if (value === undefined) return "muted";
  if (value === null || value >= 180) return "danger";
  if (value >= 80) return "warning";
  return "success";
}

function siteLineFromRecord(record: Record<string, unknown>): AppSiteLine {
  const apiBaseUrl = normalizeBaseUrl(
    pickString(record, ["apiBaseUrl", "baseUrl", "chatUrl", "url", "domain", "host"]) ?? "",
  );
  const id = pickString(record, ["id", "siteId", "code", "key"]) ?? apiBaseUrl;
  return normalizeSiteLine({
    id,
    name: pickString(record, ["name", "title", "label", "displayName"]) ?? id,
    apiBaseUrl,
    adminBaseUrl: pickString(record, ["adminBaseUrl", "adminUrl"]),
    configFileUrl: pickString(record, ["configFileUrl", "configfile", "configFile", "configUrl"]),
    isPrimary: record.isPrimary === true || id === primarySiteId,
  });
}

function pickString(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function extractSiteItems(decoded: unknown): unknown[] {
  if (Array.isArray(decoded)) return decoded;
  if (decoded === null || typeof decoded !== "object") return [];
  const record = decoded as Record<string, unknown>;
  for (const key of ["sites", "siteList", "configline", "configLine", "lines", "data"]) {
    const value = record[key];
    if (Array.isArray(value)) return value;
    if (value && typeof value === "object") {
      const nested = extractSiteItems(value);
      if (nested.length > 0) return nested;
    }
  }
  return [];
}

function normalizeBaseUrl(raw: string) {
  let value = raw.trim();
  if (!value) return value;
  if (!value.startsWith("http://") && !value.startsWith("https://")) {
    value = `https://${value}`;
  }
  return value.replace(/\/$/, "");
}

function normalizeNullableBaseUrl(raw?: string) {
  if (!raw?.trim()) return undefined;
  return normalizeBaseUrl(raw);
}

function dedupeSwitchableSites(sites: AppSiteLine[]) {
  return dedupeSites(
    sites.map(normalizeSiteLine).filter((site) => site.id !== primarySiteId && !site.isPrimary),
  );
}

function dedupeSites(sites: AppSiteLine[]) {
  const seen = new Set<string>();
  const result: AppSiteLine[] = [];
  for (const site of sites.map(normalizeSiteLine)) {
    const key = site.id || site.apiBaseUrl;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(site);
  }
  return result;
}

function siteById(id: string | null, switchableSites: AppSiteLine[]) {
  if (!id || id === primarySiteId) return primarySiteLine;
  return switchableSites.find((site) => site.id === id) ?? null;
}

function readCachedSwitchableSites(storage: SiteLineStorage | null) {
  const raw = storage?.getItem(cachedSwitchableSitesKey);
  if (!raw) return [];
  try {
    const decoded = JSON.parse(raw);
    if (!Array.isArray(decoded)) return [];
    return dedupeSwitchableSites(
      decoded
        .filter((item): item is Record<string, unknown> => item !== null && typeof item === "object" && !Array.isArray(item))
        .map((item) => siteLineFromRecord(item)),
    );
  } catch {
    return [];
  }
}

function writeCachedSwitchableSites(storage: SiteLineStorage | null, sites: AppSiteLine[]) {
  storage?.setItem(cachedSwitchableSitesKey, JSON.stringify(sites.map(normalizeSiteLine)));
}

function readCurrentSiteId(storage: SiteLineStorage | null) {
  return storage?.getItem(currentSiteIdKey) ?? null;
}

function writeCurrentSiteId(storage: SiteLineStorage | null, siteId: string) {
  storage?.setItem(currentSiteIdKey, siteId);
}

async function fetchConfigFile(configFileUrl: string) {
  const response = await fetchWithTimeout(configFileUrl, 8_000);
  if (response.status < 200 || response.status >= 300) {
    throw new Error(`configfile status ${response.status}`);
  }
  return parseSiteLineConfig(await response.text());
}

async function fetchWithTimeout(url: string, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      cache: "no-store",
      credentials: "omit",
      redirect: "manual",
      signal: controller.signal,
    });
  } finally {
    globalThis.clearTimeout(timeout);
  }
}

function fallbackS3ConfigFileUrl() {
  return (import.meta.env.VITE_LPP_S3_CONFIGFILE_URL as string | undefined) ?? "";
}

function safeLocalStorage(): SiteLineStorage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
