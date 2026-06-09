import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  Building2,
  Camera,
  CheckCircle2,
  DatabaseBackup,
  Globe2,
  Headphones,
  Info,
  Keyboard,
  LockKeyhole,
  MessageCircleMore,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import type { AppInstanceProfilePayload } from "../../shared/desktop-api";
import { getAppInstanceProfile } from "../data/app-instance/app-instance";
import { pcQueryKeys } from "../data/query-keys";
import { requireApiClient } from "../data/runtime";
import { workspaceScopeFromSession } from "../data/workspace-scope";
import type { TenantInfoDto, UserProfileDto } from "../data/api-client";
import type { AuthSession } from "../data/auth/auth-session";
import { useAuthSession, useClearAuthSession, useSetAuthSession } from "../data/auth/auth-store";
import type { PcSettings } from "../data/settings/pc-settings";
import { usePcSettings, useUpdatePcSetting } from "../data/settings/settings-store";
import { pcUserTimezoneLabels, pcUserTimezoneOptions } from "../data/time/user-timezone";
import { localeLabels, supportedLocales, type AppLocale } from "../i18n/locales";
import { useI18n } from "../i18n/useI18n";
import { formatError, formatShortDate } from "../lib/format";
import { requestMessageCustomConfirmation } from "../messages/runtime/messageConfirm";
import { PcAvatar } from "./PcAvatar";
import { exportCurrentDiagnosticsPackage } from "../settings/runtime/diagnosticsExport";
import {
  ActionRow,
  InfoRow,
  InlineSettingsState,
  SelectRow,
  SwitchRow,
} from "../settings/components/SettingsRows";
import {
  settingRowProps,
  settingsCapabilityLabel,
  settingsRowDescription,
  settingsRowLabel,
  settingsSections,
  settingsRowsForSection,
  type SettingsRowCatalog,
  type SettingsSectionId,
} from "../settings/models/settingsCatalog";
import { AccountSecuritySection } from "../settings/components/AccountSecuritySection";
import { ChatArchiveSection } from "../settings/components/ChatArchiveSection";
import { ChatBackgroundSection } from "../settings/components/ChatBackgroundSection";
import { ConnectivityHealthSection } from "../settings/components/ConnectivityHealthSection";
import { DiagnosticsRecordsSection } from "../settings/components/DiagnosticsRecordsSection";
import { HelpAboutSettingsSection } from "../settings/components/HelpAboutSettingsSection";
import { NetworkLineSettingsSection } from "../settings/components/NetworkLineSettingsSection";
import { NotificationSettingsSection } from "../settings/components/NotificationSettingsSection";
import { RuntimeStatusSettingsSection } from "../settings/components/RuntimeStatusSettingsSection";
import { PrivacySettingsSection } from "./MePrivacySections";

type SettingKey = keyof PcSettings;
type MeTranslate = (key: string, params?: Record<string, string | number>) => string;

const sectionIcons = {
  account: UserRound,
  enterprise: Building2,
  messages: MessageCircleMore,
  privacy: ShieldCheck,
  customerService: Headphones,
  network: Globe2,
  common: Keyboard,
  storageDiagnostics: DatabaseBackup,
  about: Info,
} satisfies Record<SettingsSectionId, typeof Bell>;

export function MePage() {
  const queryClient = useQueryClient();
  const pcSettings = usePcSettings();
  const authSession = useAuthSession();
  const clearAuthSession = useClearAuthSession();
  const setAuthSession = useSetAuthSession();
  const updatePcSetting = useUpdatePcSetting();
  const { locale, setLocale, t } = useI18n();
  const [activeSectionId, setActiveSectionId] =
    useState<SettingsSectionId>("account");
  const [notice, setNotice] = useState("");
  const activeSection = useMemo(
    () =>
      settingsSections.find((section) => section.id === activeSectionId) ??
      settingsSections[0],
    [activeSectionId],
  );

  const setSetting = <K extends SettingKey>(key: K, value: PcSettings[K]) => {
    updatePcSetting(key, value);
    setNotice(t("me.notice.saved"));
  };

  const exportDiagnostics = async () => {
    const result = await exportCurrentDiagnosticsPackage();
    setNotice(result ? t("me.notice.diagnosticsExported") : t("me.notice.diagnosticsExportCancelled"));
  };

  const ActiveIcon = sectionIcons[activeSection.id];
  const profileQuery = useQuery({
    queryKey: pcQueryKeys.accountProfile(authSession?.apiBaseUrl, authSession?.tenantToken),
    enabled: Boolean(authSession),
    staleTime: 60_000,
    queryFn: async () => requireApiClient(authSession).getMyProfile(),
  });
  const tenantInfoQuery = useQuery({
    queryKey: pcQueryKeys.accountTenant(authSession?.apiBaseUrl, authSession?.tenantToken),
    enabled: Boolean(authSession),
    staleTime: 60_000,
    queryFn: async () => requireApiClient(authSession).getTenantInfo(),
  });

  return (
    <main className="module-page me-page settings-page-v2">
      <aside className="settings-nav" aria-label={t("me.navAria")}>
        <div className="settings-nav-header">
          <span className="settings-nav-kicker">SETTINGS</span>
          <strong>{t("me.title")}</strong>
          <p>{t("me.navSubtitle")}</p>
        </div>
        <div className="settings-nav-list">
          {settingsSections.map((section) => {
            const Icon = sectionIcons[section.id];
            return (
              <button
                className={activeSectionId === section.id ? "selected" : ""}
                key={section.id}
                type="button"
                onClick={() => setActiveSectionId(section.id)}
              >
                <Icon size={16} />
                <span>
                  <strong>{settingsSectionTitle(section.id, t)}</strong>
                  <em>{settingsSectionDescription(section.id, t)}</em>
                </span>
              </button>
            );
          })}
        </div>
      </aside>

      <section className="settings-main">
        <section className="settings-hero-panel settings-hero-compact">
          <div>
            <span className="eyebrow">lppchat</span>
            <h1>{t("me.title")}</h1>
            <p>{t("me.heroSubtitle")}</p>
          </div>
          <div className="settings-health">
            <CheckCircle2 size={18} />
              <span>{notice || t("me.notice.autoSave")}</span>
          </div>
        </section>

        <section className="settings-detail-card" aria-live="polite">
          <header className="settings-detail-head">
            <div className="settings-detail-title">
              <span className="settings-detail-icon">
                <ActiveIcon size={22} />
              </span>
              <div>
                <h2>{settingsSectionTitle(activeSection.id, t)}</h2>
                <p>{settingsSectionDescription(activeSection.id, t)}</p>
              </div>
            </div>
            <div className="settings-detail-statusbar" aria-label={t("me.currentStatus")}>
              <CheckCircle2 size={15} />
              <span>{sectionStatusSummary(activeSection.id, notice, authSession, t)}</span>
            </div>
          </header>
          <div className="settings-detail-body">
            {renderSection(activeSectionId, pcSettings, setSetting, {
              exportDiagnostics,
              setNotice,
              authSession,
              profile: profileQuery.data,
              tenantInfo: tenantInfoQuery.data,
              profileLoading: profileQuery.isLoading,
              profileError: profileQuery.error,
              locale,
              setLocale,
              queryClient,
              clearAuthSession,
              setAuthSession,
              t,
            })}
          </div>
        </section>
      </section>
    </main>
  );
}

function renderSection(
  section: SettingsSectionId,
  pcSettings: PcSettings,
  setSetting: <K extends SettingKey>(key: K, value: PcSettings[K]) => void,
  actions: {
    exportDiagnostics: () => Promise<void>;
    setNotice: (notice: string) => void;
    authSession: AuthSession | null;
    profile?: UserProfileDto;
    tenantInfo?: TenantInfoDto;
    profileLoading: boolean;
    profileError: unknown;
    locale: AppLocale;
    setLocale: (locale: AppLocale) => void;
    queryClient: QueryClient;
    clearAuthSession: () => void;
    setAuthSession: (session: AuthSession) => void;
    t: MeTranslate;
  },
) {
  const { t } = actions;
  switch (section) {
    case "account":
      return (
        <section className="settings-account-layout" aria-label={t("me.section.account.title")}>
          <div className="settings-account-profile-column">
            <ProfileSettingsSection {...actions} />
          </div>
          <div className="settings-account-security-column">
            <AccountSecuritySection
              authSession={actions.authSession}
              clearAuthSession={actions.clearAuthSession}
              setNotice={actions.setNotice}
            />
          </div>
          <PlanningSupportBlock sectionId={section} />
        </section>
      );
    case "enterprise":
      return (
        <>
          <EnterpriseIdentitySection
            authSession={actions.authSession}
            tenantInfo={actions.tenantInfo}
          />
          <PlanningSupportBlock sectionId={section} />
        </>
      );
    case "privacy":
      return (
        <section className="settings-privacy-layout" aria-label={t("me.section.privacy.title")}>
          <PrivacySettingsSection
            actions={actions}
            pcSettings={pcSettings}
            setSetting={setSetting}
          />
          <PlanningSupportBlock sectionId={section} />
        </section>
      );
    case "messages":
    case "customerService":
      return (
        <>
          <NotificationSettingsSection
            authSession={actions.authSession}
            pcSettings={pcSettings}
            sectionId={section}
            setNotice={actions.setNotice}
            setSetting={setSetting}
          />
          {section === "customerService" && (
            <SwitchRow
              {...settingRowProps("highDensityContext")}
              checked={pcSettings.highDensityContext}
              onChange={(value) => setSetting("highDensityContext", value)}
            />
          )}
          <PlanningSupportBlock sectionId={section} />
        </>
      );
    case "common":
      return (
        <>
          <SettingsGroupLabel title={t("me.group.languageTime")} />
          <SelectRow
            {...settingRowProps("language")}
            capability="localEffective"
            optionLabels={localeLabels}
            options={[...supportedLocales]}
            value={actions.locale}
            onChange={actions.setLocale}
          />
          <SelectRow
            {...settingRowProps("timezone")}
            capability="localEffective"
            optionLabels={pcUserTimezoneLabels}
            options={[...pcUserTimezoneOptions]}
            value={pcSettings.timezone}
            onChange={(value) => setSetting("timezone", value)}
          />
          <SettingsGroupLabel title={t("me.group.notifications")} />
          <NotificationSettingsSection
            authSession={actions.authSession}
            pcSettings={pcSettings}
            sectionId={section}
            setNotice={actions.setNotice}
            setSetting={setSetting}
          />
          <SettingsGroupLabel title={t("me.group.input")} />
          <SwitchRow
            {...settingRowProps("enterToSend")}
            checked={pcSettings.enterToSend}
            onChange={(value) => setSetting("enterToSend", value)}
          />
          <SelectRow
            {...settingRowProps("screenshotShortcut")}
            value={pcSettings.screenshotShortcut}
            options={["Alt+A", "Ctrl+Alt+A", "Ctrl+Shift+A", "None"]}
            optionLabels={{
              "Alt+A": "Alt + A",
              "Ctrl+Alt+A": "Ctrl + Alt + A",
              "Ctrl+Shift+A": "Ctrl + Shift + A",
              None: t("me.option.disabled"),
            }}
            onChange={(value) => setSetting("screenshotShortcut", value)}
          />
          <SwitchRow
            {...settingRowProps("dragUpload")}
            checked={pcSettings.dragUpload}
            onChange={(value) => setSetting("dragUpload", value)}
          />
          <SwitchRow
            {...settingRowProps("shortcutHints")}
            checked={pcSettings.shortcutHints}
            onChange={(value) => setSetting("shortcutHints", value)}
          />
          <SettingsGroupLabel title={t("me.group.translation")} />
          <SwitchRow
            {...settingRowProps("autoTranslate")}
            checked={pcSettings.autoTranslate}
            stateText={t("me.state.autoTranslate")}
            onChange={(value) => setSetting("autoTranslate", value)}
          />
          <SettingsGroupLabel title={t("me.group.chat")} />
          <ChatBackgroundSection
            pcSettings={pcSettings}
            setNotice={actions.setNotice}
            setSetting={setSetting}
          />
          <ChatArchiveSection
            authSession={actions.authSession}
            pcSettings={pcSettings}
            setNotice={actions.setNotice}
            setSetting={setSetting}
          />
          <SettingsGroupLabel title={t("me.group.appearance")} />
          <SelectRow
            {...settingRowProps("theme")}
            value={pcSettings.theme}
            options={["porcelain", "business", "classic-wechat", "dark", "high-contrast"]}
            optionLabels={{
              porcelain: t("me.option.theme.porcelain"),
              business: t("me.option.theme.business"),
              "classic-wechat": t("me.option.theme.classicWechat"),
              dark: t("me.option.theme.dark"),
              "high-contrast": t("me.option.theme.highContrast"),
            }}
            onChange={(value) => setSetting("theme", value)}
          />
          <SelectRow
            {...settingRowProps("skin")}
            value={pcSettings.skin}
            options={["jade", "blue", "graphite"]}
            optionLabels={{
              jade: t("me.option.skin.jade"),
              blue: t("me.option.skin.blue"),
              graphite: t("me.option.skin.graphite"),
            }}
            onChange={(value) => setSetting("skin", value)}
          />
          <SelectRow
            {...settingRowProps("fontSize")}
            value={pcSettings.fontSize}
            options={["\u5c0f", "\u6807\u51c6", "\u5927", "\u8d85\u5927"]}
            optionLabels={{
              "\u5c0f": t("me.option.fontSize.small"),
              "\u6807\u51c6": t("me.option.fontSize.standard"),
              "\u5927": t("me.option.fontSize.large"),
              "\u8d85\u5927": t("me.option.fontSize.extraLarge"),
            }}
            onChange={(value) => setSetting("fontSize", value)}
          />
          <SwitchRow
            {...settingRowProps("compactList")}
            checked={pcSettings.compactList}
            onChange={(value) => setSetting("compactList", value)}
          />
          <SwitchRow
            {...settingRowProps("reduceMotion")}
            checked={pcSettings.reduceMotion}
            onChange={(value) => setSetting("reduceMotion", value)}
          />
          <SwitchRow
            {...settingRowProps("highContrastBoundary")}
            checked={pcSettings.highContrastBoundary}
            onChange={(value) => setSetting("highContrastBoundary", value)}
          />
          <SwitchRow
            {...settingRowProps("keyboardFocusHint")}
            checked={pcSettings.keyboardFocusHint}
            onChange={(value) => setSetting("keyboardFocusHint", value)}
          />
          <SettingsGroupLabel title={t("me.group.desktop")} />
          <MinimizeToTraySwitch
            pcSettings={pcSettings}
            setNotice={actions.setNotice}
            setSetting={setSetting}
          />
          <LaunchAtStartupSwitch
            pcSettings={pcSettings}
            setNotice={actions.setNotice}
            setSetting={setSetting}
          />
          <AppProfileInfoRow />
          <PlanningSupportBlock sectionId={section} />
        </>
      );
    case "network":
      return (
        <>
          <InfoRow
            {...settingRowProps("currentEnvironment")}
            desc={formatEnvironment(actions.authSession?.apiBaseUrl, t)}
          />
          <NetworkLineSettingsSection
            authSession={actions.authSession}
            queryClient={actions.queryClient}
            setNotice={actions.setNotice}
          />
          <InfoRow
            {...settingRowProps("autoReconnect")}
            desc={pcSettings.autoReconnect ? t("me.network.autoReconnectOn") : t("me.network.off")}
          />
          <InfoRow
            {...settingRowProps("weakNetworkDiagnostics")}
            desc={pcSettings.weakNetworkDiagnostics ? t("me.network.weakNetworkOn") : t("me.network.weakNetworkOff")}
          />
          <PlanningSupportBlock sectionId={section} />
        </>
      );
    case "storageDiagnostics":
      return (
        <>
          <ActionRow
            {...settingRowProps("clearLocalCache")}
            action={t("me.action.clean")}
            onClick={() => {
              localStorage.removeItem("lpp.pc.message-cache");
              actions.setNotice(t("me.notice.chatCacheCleared"));
            }}
          />
          <LocalDataStorageRows
            authSession={actions.authSession}
            setNotice={actions.setNotice}
          />
          <ConnectivityHealthSection authSession={actions.authSession} />
          <SelectRow
            {...settingRowProps("apiTrafficLogLevel")}
            value={pcSettings.apiTrafficLogLevel}
            options={["off", "errors", "summary", "body"]}
            optionLabels={{
              off: t("me.option.apiLog.off"),
              errors: t("me.option.apiLog.errors"),
              summary: t("me.option.apiLog.summary"),
              body: t("me.option.apiLog.body"),
            }}
            onChange={(value) => setSetting("apiTrafficLogLevel", value)}
          />
          <DiagnosticsRecordsSection
            exportDiagnostics={actions.exportDiagnostics}
            setNotice={actions.setNotice}
          />
          <RuntimeStatusSettingsSection />
          {shouldShowDevelopmentDiagnostics(actions.authSession) && (
            <DevelopmentDiagnosticsSection authSession={actions.authSession} />
          )}
          <PlanningSupportBlock sectionId={section} />
        </>
      );
    case "about":
      return (
        <HelpAboutSettingsSection
          authSession={actions.authSession}
          setNotice={actions.setNotice}
        />
      );
  }
}

function SettingsGroupLabel({ title }: { title: string }) {
  return (
    <div className="settings-group-label">
      <strong>{title}</strong>
    </div>
  );
}

function settingsSectionTitle(sectionId: SettingsSectionId, t: MeTranslate) {
  return t(`me.section.${sectionId}.title`);
}

function settingsSectionDescription(sectionId: SettingsSectionId, t: MeTranslate) {
  return t(`me.section.${sectionId}.desc`);
}

function sectionStatusSummary(
  sectionId: SettingsSectionId,
  notice: string,
  authSession: AuthSession | null,
  t: MeTranslate,
) {
  if (notice && notice !== t("me.notice.saved") && notice !== t("me.notice.autoSave")) return notice;
  if (!authSession && sectionId !== "about") return t("me.status.notLoggedIn");
  if (sectionId === "common") return t("me.status.common");
  if (sectionId === "customerService") return t("me.status.customerService");
  if (sectionId === "storageDiagnostics") return t("me.status.storageDiagnostics");
  return t("me.status.default");
}

function PlanningSupportBlock({ sectionId }: { sectionId: SettingsSectionId }) {
  const { t } = useI18n();
  const plannedRows = settingsRowsForSection(sectionId).filter(
    (rowItem) => !rowItem.visibleInMainList,
  );
  if (!plannedRows.length) return null;

  return (
    <section className="settings-pending-support" aria-label={t("me.planning.aria")}>
      <div>
        <strong>{t("me.planning.title")}</strong>
        <p>{t("me.planning.subtitle")}</p>
      </div>
      <div className="settings-plan-grid">
        {plannedRows.map((rowItem) => (
          <PlanningCapabilityCard key={rowItem.id} rowItem={rowItem} />
        ))}
      </div>
    </section>
  );
}

function PlanningCapabilityCard({ rowItem }: { rowItem: SettingsRowCatalog }) {
  const { t } = useI18n();
  return (
    <article className="settings-plan-card">
      <header>
        <strong>{settingsRowLabel(rowItem, t)}</strong>
        <em>{settingsCapabilityLabel(rowItem.statusLabel, t) ?? t("me.planning.planned")}</em>
      </header>
      <p>{settingsRowDescription(rowItem, t)}</p>
      <dl>
        <div>
          <dt>{t("me.planning.value")}</dt>
          <dd>{rowItem.productValue ?? t("me.planning.defaultValue")}</dd>
        </div>
        <div>
          <dt>{t("me.planning.dependency")}</dt>
          <dd>{rowItem.dependency ?? t("me.planning.defaultDependency")}</dd>
        </div>
        <div>
          <dt>{t("me.planning.next")}</dt>
          <dd>{rowItem.nextAction ?? t("me.planning.defaultNext")}</dd>
        </div>
      </dl>
    </article>
  );
}

function ProfileSettingsSection({
  authSession,
  profile,
  profileLoading,
  profileError,
  queryClient,
  setAuthSession,
  setNotice,
}: {
  authSession: AuthSession | null;
  profile?: UserProfileDto;
  profileLoading: boolean;
  profileError: unknown;
  queryClient: QueryClient;
  setAuthSession: (session: AuthSession) => void;
  setNotice: (notice: string) => void;
}) {
  const { t } = useI18n();
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState("");
  const displayName = profile?.displayName || authSession?.displayName || "--";
  const profileSignature = profile?.signature || profile?.bio || "";
  const [displayNameDraft, setDisplayNameDraft] = useState(displayName === "--" ? "" : displayName);
  const [signatureDraft, setSignatureDraft] = useState(profileSignature);
  const avatarUrl = avatarPreviewUrl || profile?.avatarUrl || authSession?.avatarUrl;
  const updateAvatar = useMutation({
    mutationFn: async (file: File) => {
      const client = requireApiClient(authSession);
      const uploaded = await client.uploadMedia(file, "image");
      const nextAvatarUrl = uploadedAvatarUrl(uploaded);
      if (!nextAvatarUrl) throw new Error(t("me.profile.error.avatarNoUrl"));
      await client.updateMyProfile({ avatarUrl: nextAvatarUrl });
      const updatedProfile = await client.getMyProfile();
      const confirmedAvatarUrl = normalizeAvatarUrl(updatedProfile.avatarUrl);
      const previousAvatarUrl = normalizeAvatarUrl(profile?.avatarUrl || authSession?.avatarUrl);
      if (!confirmedAvatarUrl) {
        throw new Error(t("me.profile.error.avatarProfileNoUrl"));
      }
      if (
        previousAvatarUrl &&
        !sameAvatarResource(nextAvatarUrl, previousAvatarUrl) &&
        sameAvatarResource(confirmedAvatarUrl, previousAvatarUrl)
      ) {
        throw new Error(t("me.profile.error.avatarProfileUnchanged"));
      }
      const refreshedAvatarUrl = avatarUrlWithCacheBuster(confirmedAvatarUrl);
      return {
        avatarUrl: refreshedAvatarUrl,
        profile: {
          ...updatedProfile,
          avatarUrl: refreshedAvatarUrl,
        },
      };
    },
    onSuccess: async ({ avatarUrl: nextAvatarUrl, profile: updatedProfile }) => {
      setAvatarFile(null);
      queryClient.setQueryData(
        pcQueryKeys.accountProfile(authSession?.apiBaseUrl, authSession?.tenantToken),
        updatedProfile,
      );
      await queryClient.invalidateQueries({
        queryKey: pcQueryKeys.accountProfile(
          authSession?.apiBaseUrl,
          authSession?.tenantToken,
        ),
      });
      if (authSession) {
        setAuthSession({
          ...authSession,
          avatarUrl: nextAvatarUrl,
          displayName: updatedProfile.displayName || authSession.displayName,
          lppId: updatedProfile.lppId ?? authSession.lppId,
          userId: updatedProfile.userId ?? authSession.userId,
          platformUserId: updatedProfile.platformUserId ?? authSession.platformUserId,
          userType: updatedProfile.userType ?? authSession.userType,
        });
      }
      setNotice(t("me.profile.avatarUpdated"));
    },
    onError: (error) => setNotice(t("me.profile.avatarUpdateFailed", { error: formatError(error) })),
  });
  const updateProfile = useMutation({
    mutationFn: async () => {
      const nextDisplayName = displayNameDraft.trim();
      const nextSignature = signatureDraft.trim();
      if (!nextDisplayName) throw new Error(t("me.profile.error.emptyDisplayName"));
      const updatedProfile = await requireApiClient(authSession).updateMyProfile({
        displayName: nextDisplayName,
        signature: nextSignature || null,
      });
      return {
        ...updatedProfile,
        displayName: updatedProfile.displayName || nextDisplayName,
        signature: updatedProfile.signature ?? (nextSignature || null),
      };
    },
    onSuccess: async (updatedProfile) => {
      queryClient.setQueryData(
        pcQueryKeys.accountProfile(authSession?.apiBaseUrl, authSession?.tenantToken),
        updatedProfile,
      );
      await queryClient.invalidateQueries({
        queryKey: pcQueryKeys.accountProfile(
          authSession?.apiBaseUrl,
          authSession?.tenantToken,
        ),
      });
      setDisplayNameDraft(updatedProfile.displayName || "");
      setSignatureDraft(updatedProfile.signature || updatedProfile.bio || "");
      if (authSession) {
        setAuthSession({
          ...authSession,
          avatarUrl: updatedProfile.avatarUrl ?? authSession.avatarUrl,
          displayName: updatedProfile.displayName || authSession.displayName,
          lppId: updatedProfile.lppId ?? authSession.lppId,
          userId: updatedProfile.userId ?? authSession.userId,
          platformUserId: updatedProfile.platformUserId ?? authSession.platformUserId,
          userType: updatedProfile.userType ?? authSession.userType,
        });
      }
      setNotice(t("me.profile.saved"));
    },
    onError: (error) => setNotice(t("me.profile.saveFailed", { error: formatError(error) })),
  });

  useEffect(() => {
    setDisplayNameDraft(displayName === "--" ? "" : displayName);
    setSignatureDraft(profileSignature);
  }, [displayName, profileSignature]);

  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreviewUrl("");
      return;
    }
    const objectUrl = URL.createObjectURL(avatarFile);
    setAvatarPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [avatarFile]);

  const handleAvatarFileChange = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setNotice(t("me.profile.selectImageFile"));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setNotice(t("me.profile.avatarTooLarge"));
      return;
    }
    setAvatarFile(file);
    setNotice(t("me.profile.avatarSelected"));
  };

  return (
    <>
      {profileLoading && <InlineSettingsState text={t("me.profile.loading")} />}
      {profileError && (
        <InlineSettingsState
          tone="error"
          text={t("me.profile.loadFailed", { error: formatError(profileError) })}
        />
      )}
      <div className="settings-account-profile-grid">
        <div className="settings-account-overview-stack">
          <div className="settings-sub-card settings-avatar-card">
            <header>
              <strong>{t("me.profile.avatar")}</strong>
              <span className="settings-sub-card-meta">
                <Camera size={14} />
                <em>{t("me.profile.avatarFormat")}</em>
              </span>
            </header>
            <div className="settings-avatar-editor">
              <PcAvatar
                avatarUrl={avatarUrl}
                className="settings-profile-avatar"
                name={displayName}
              />
              <div className="settings-avatar-actions">
                <strong>{displayName}</strong>
                <em>{avatarFile ? avatarFile.name : t("me.profile.avatarSyncHint")}</em>
                <div>
                  <label className="settings-avatar-upload-button">
                    <input
                      accept="image/*"
                      type="file"
                      onChange={(event) => {
                        handleAvatarFileChange(event.currentTarget.files?.[0]);
                        event.currentTarget.value = "";
                      }}
                    />
                    {t("me.profile.chooseImage")}
                  </label>
                  <button
                    type="button"
                    disabled={!avatarFile || updateAvatar.isPending || !authSession}
                    onClick={() => {
                      if (avatarFile) updateAvatar.mutate(avatarFile);
                    }}
                  >
                    {updateAvatar.isPending ? t("common.saving") : t("me.profile.saveAvatar")}
                  </button>
                  {avatarFile && (
                    <button
                      type="button"
                      disabled={updateAvatar.isPending}
                      onClick={() => {
                        setAvatarFile(null);
                        setNotice(t("me.profile.avatarCancelled"));
                      }}
                    >
                      {t("common.cancel")}
                    </button>
                  )}
                </div>
              </div>
            </div>
            {!authSession && (
              <InlineSettingsState tone="error" text={t("me.profile.loginExpiredAvatar")} />
            )}
          </div>
          <InfoRow label={t("me.profile.lppId")} desc={profile?.lppId || authSession?.lppId || "--"} />
          <InfoRow label={t("me.profile.role")} desc={authSession?.roleLabel || t("me.profile.member")} />
        </div>
        <div className="settings-sub-card settings-profile-form">
          <header>
            <strong>{t("me.profile.info")}</strong>
            <span className="settings-sub-card-meta">
              <UserRound size={14} />
              <em>{t("me.profile.infoHint")}</em>
            </span>
          </header>
          <label>
            <span>{t("me.profile.displayName")}</span>
            <input
              maxLength={32}
              placeholder={t("me.profile.displayNamePlaceholder")}
              value={displayNameDraft}
              disabled={updateProfile.isPending || !authSession}
              onChange={(event) => setDisplayNameDraft(event.target.value)}
            />
          </label>
          <label>
            <span>{t("me.profile.signature")}</span>
            <textarea
              maxLength={120}
              placeholder={t("me.profile.signaturePlaceholder")}
              value={signatureDraft}
              disabled={updateProfile.isPending || !authSession}
              onChange={(event) => setSignatureDraft(event.target.value)}
            />
          </label>
          <div className="settings-profile-form-actions">
            <button
              type="button"
              disabled={updateProfile.isPending || !authSession}
              onClick={() => updateProfile.mutate()}
            >
              {updateProfile.isPending ? t("common.saving") : t("me.profile.saveProfile")}
            </button>
            <button
              type="button"
              disabled={updateProfile.isPending}
              onClick={() => {
                setDisplayNameDraft(displayName === "--" ? "" : displayName);
                setSignatureDraft(profileSignature);
                setNotice(t("me.profile.reverted"));
              }}
            >
              {t("me.profile.revert")}
            </button>
          </div>
        </div>
      </div>
      <div className="settings-account-info-grid">
        <InfoRow label={t("me.profile.loginName")} desc={profile?.loginName || "--"} />
        <InfoRow label={t("me.profile.userId")} desc={profile?.userId || authSession?.userId || "--"} />
        <InfoRow label={t("me.profile.mobile")} desc={maskMobile(profile?.mobile)} />
        <InfoRow label={t("me.profile.email")} desc={maskEmail(profile?.email)} />
        <InfoRow label={t("me.profile.createdAt")} desc={formatShortDate(profile?.createdAt)} />
      </div>
    </>
  );
}

function uploadedAvatarUrl(uploaded: { thumbnailUrl?: string; url?: string }) {
  const record = uploaded as Record<string, unknown>;
  for (const key of ["url", "fileUrl", "thumbnailUrl", "downloadUrl"]) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function normalizeAvatarUrl(value?: string | null) {
  return typeof value === "string" ? value.trim() : "";
}

function sameAvatarResource(left?: string | null, right?: string | null) {
  const leftUrl = stripAvatarCacheBuster(normalizeAvatarUrl(left));
  const rightUrl = stripAvatarCacheBuster(normalizeAvatarUrl(right));
  return Boolean(leftUrl && rightUrl && leftUrl === rightUrl);
}

function stripAvatarCacheBuster(value: string) {
  if (!value) return "";
  try {
    const url = new URL(value, "https://avatar.local");
    url.searchParams.delete("_v");
    return url.pathname + url.search + url.hash;
  } catch {
    return value.replace(/([?&])_v=\d+(&?)/, (_match, prefix, suffix) =>
      suffix ? prefix : "",
    );
  }
}

function avatarUrlWithCacheBuster(value: string) {
  if (!value || /^(blob:|data:)/i.test(value)) return value;
  const separator = value.includes("?") ? "&" : "?";
  return `${value}${separator}_v=${Date.now()}`;
}

function EnterpriseIdentitySection({
  authSession,
  tenantInfo,
}: {
  authSession: AuthSession | null;
  tenantInfo?: TenantInfoDto;
}) {
  const { t } = useI18n();
  const tenantCode = tenantInfo?.tenantCode || authSession?.tenantCode || "mouse-corp";
  const tenantName = tenantInfo?.tenantName || authSession?.tenantName || "mouse_corp";
  return (
    <div className="settings-sub-card">
      <header>
        <strong>{t("me.enterprise.current")}</strong>
        <span className="settings-sub-card-meta">
          <Building2 size={14} />
          <em>{tenantCode}</em>
        </span>
      </header>
      <InfoRow
        {...settingRowProps("enterpriseIdentity")}
        desc={t("me.enterprise.identity", {
          code: tenantCode,
          name: tenantName,
          role: authSession?.roleLabel || t("me.profile.member"),
        })}
      />
    </div>
  );
}

function LaunchAtStartupSwitch({
  pcSettings,
  setNotice,
  setSetting,
}: {
  pcSettings: PcSettings;
  setNotice: (notice: string) => void;
  setSetting: <K extends SettingKey>(key: K, value: PcSettings[K]) => void;
}) {
  const { t } = useI18n();
  const desktopApi = typeof window === "undefined" ? undefined : window.desktopApi;
  const hasDesktopCapability = Boolean(
    desktopApi?.getLaunchAtStartup && desktopApi?.setLaunchAtStartup,
  );
  const [checked, setChecked] = useState<boolean | null>(null);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!hasDesktopCapability) return;
    let cancelled = false;
    desktopApi
      ?.getLaunchAtStartup()
      .then((value) => {
        if (!cancelled) {
          setChecked(value);
          setFailed(false);
        }
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [desktopApi, hasDesktopCapability]);

  const updateLaunchAtStartup = async (value: boolean) => {
    if (!desktopApi?.setLaunchAtStartup) {
      setNotice(t("me.desktop.launchUnsupported"));
      return;
    }
    const previous = checked ?? pcSettings.launchAtStartup;
    setPending(true);
    setChecked(value);
    try {
      const nextValue = await desktopApi.setLaunchAtStartup(value);
      setChecked(nextValue);
      setSetting("launchAtStartup", nextValue);
      setFailed(false);
      setNotice(nextValue ? t("me.desktop.launchEnabled") : t("me.desktop.launchDisabled"));
    } catch (error) {
      setChecked(previous);
      setFailed(true);
      setNotice(t("me.desktop.launchFailed", { error: formatError(error) }));
    } finally {
      setPending(false);
    }
  };

  return (
    <SwitchRow
      {...settingRowProps("launchAtStartup")}
      checked={checked ?? pcSettings.launchAtStartup}
      enabled={hasDesktopCapability && !pending}
      stateText={
        hasDesktopCapability
          ? failed
            ? t("me.desktop.statusReadFailed")
            : undefined
          : t("me.desktop.browserUnavailable")
      }
      onChange={(value) => void updateLaunchAtStartup(value)}
    />
  );
}

function MinimizeToTraySwitch({
  pcSettings,
  setNotice,
  setSetting,
}: {
  pcSettings: PcSettings;
  setNotice: (notice: string) => void;
  setSetting: <K extends SettingKey>(key: K, value: PcSettings[K]) => void;
}) {
  const { t } = useI18n();
  const desktopApi = typeof window === "undefined" ? undefined : window.desktopApi;
  const hasDesktopCapability = Boolean(
    desktopApi?.getMinimizeToTray && desktopApi?.setMinimizeToTray,
  );
  const [checked, setChecked] = useState<boolean | null>(null);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!hasDesktopCapability) return;
    let cancelled = false;
    desktopApi
      ?.setMinimizeToTray(pcSettings.minimizeToTray)
      .then((value) => {
        if (!cancelled) {
          setChecked(value);
          if (value !== pcSettings.minimizeToTray) setSetting("minimizeToTray", value);
          setFailed(false);
        }
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [desktopApi, hasDesktopCapability, pcSettings.minimizeToTray, setSetting]);

  const updateMinimizeToTray = async (value: boolean) => {
    if (!desktopApi?.setMinimizeToTray) {
      setNotice(t("me.desktop.trayUnsupported"));
      return;
    }
    const previous = checked ?? pcSettings.minimizeToTray;
    setPending(true);
    setChecked(value);
    try {
      const nextValue = await desktopApi.setMinimizeToTray(value);
      setChecked(nextValue);
      setSetting("minimizeToTray", nextValue);
      setFailed(false);
      setNotice(nextValue ? t("me.desktop.trayEnabled") : t("me.desktop.trayDisabled"));
    } catch (error) {
      setChecked(previous);
      setFailed(true);
      setNotice(t("me.desktop.trayFailed", { error: formatError(error) }));
    } finally {
      setPending(false);
    }
  };

  return (
    <SwitchRow
      {...settingRowProps("minimizeToTray")}
      checked={checked ?? pcSettings.minimizeToTray}
      enabled={hasDesktopCapability && !pending}
      stateText={
        hasDesktopCapability
          ? failed
            ? t("me.desktop.statusSyncFailed")
            : undefined
          : t("me.desktop.browserUnavailable")
      }
      onChange={(value) => void updateMinimizeToTray(value)}
    />
  );
}

function AppProfileInfoRow() {
  const { t } = useI18n();
  const [profile, setProfile] = useState<AppInstanceProfilePayload | null>(null);

  useEffect(() => {
    void getAppInstanceProfile().then(setProfile).catch(() => setProfile(null));
  }, []);

  return (
    <InfoRow
      {...settingRowProps("multiProfileIndicator")}
      desc={
        profile
          ? `${profile.profileName} / ${profile.clientInstanceId.slice(0, 8)}`
          : t("me.development.loadingProfile")
      }
    />
  );
}

function LocalDataStorageRows({
  authSession,
  setNotice,
}: {
  authSession: AuthSession | null;
  setNotice: (notice: string) => void;
}) {
  const { t } = useI18n();
  const scopeKey = useMemo(() => workspaceScopeFromSession(authSession).key, [authSession]);
  const desktopApi = typeof window !== "undefined" ? window.desktopApi : undefined;
  const statsQuery = useQuery({
    queryKey: ["pc-local-data-storage-stats", scopeKey],
    enabled: Boolean(desktopApi?.localDataGetStorageStats),
    queryFn: () => desktopApi!.localDataGetStorageStats({ scopeKey }),
    staleTime: 30_000,
  });
  const cleanupMutation = useMutation({
    mutationFn: async () => {
      if (!desktopApi?.localDataCleanup) {
        throw new Error(t("me.localDataStorage.unavailable"));
      }
      localStorage.removeItem("lpp.pc.message-cache");
      return desktopApi.localDataCleanup({ scopeKey, target: "message-index" });
    },
    onSuccess: (result) => {
      void statsQuery.refetch();
      setNotice(t("me.notice.localDataCleaned", { count: result.deletedMessages }));
    },
    onError: (error) => {
      setNotice(t("me.notice.localDataCleanFailed", { error: formatError(error) }));
    },
  });
  const cleanupMediaMutation = useMutation({
    mutationFn: async () => {
      if (!desktopApi?.localDataCleanup) {
        throw new Error(t("me.localDataStorage.unavailable"));
      }
      return desktopApi.localDataCleanup({ scopeKey, target: "media-cache" });
    },
    onSuccess: (result) => {
      void statsQuery.refetch();
      setNotice(t("me.notice.localMediaCleaned", { size: formatStorageSize(result.deletedBytes) }));
    },
    onError: (error) => {
      setNotice(t("me.notice.localMediaCleanFailed", { error: formatError(error) }));
    },
  });
  const repairMutation = useMutation({
    mutationFn: async () => {
      if (!desktopApi?.localDataRepair) {
        throw new Error(t("me.localDataStorage.unavailable"));
      }
      return desktopApi.localDataRepair({ rebuildFts: true, scopeKey });
    },
    onSuccess: (result) => {
      void statsQuery.refetch();
      setNotice(t("me.notice.localDataRepairDone", {
        stale: result.staleMediaVariants,
        status: result.dbIntegrity,
      }));
    },
    onError: (error) => {
      setNotice(t("me.notice.localDataRepairFailed", { error: formatError(error) }));
    },
  });
  const stats = statsQuery.data;
  const confirmCleanup = async () => {
    if (!(await requestMessageCustomConfirmation(t("me.localDataStorage.cleanupConfirm")))) return;
    cleanupMutation.mutate();
  };

  return (
    <>
      <InfoRow
        label={t("me.localDataStorage.title")}
        desc={
          stats
            ? t("me.localDataStorage.stats", {
                media: stats.mediaCount,
                messages: stats.messageCount,
                outbox: stats.outboxCount,
                size: formatStorageSize(stats.totalBytes),
              })
            : statsQuery.isError
              ? t("me.localDataStorage.unavailable")
              : t("me.localDataStorage.loading")
        }
      />
      <ActionRow
        action={cleanupMutation.isPending ? t("me.action.processing") : t("me.action.clean")}
        desc={t("me.localDataStorage.cleanupDesc")}
        enabled={Boolean(desktopApi?.localDataCleanup) && !cleanupMutation.isPending}
        label={t("me.localDataStorage.cleanupTitle")}
        onClick={confirmCleanup}
      />
      <ActionRow
        action={cleanupMediaMutation.isPending ? t("me.action.processing") : t("me.action.clean")}
        desc={t("me.localDataStorage.mediaCleanupDesc")}
        enabled={Boolean(desktopApi?.localDataCleanup) && !cleanupMediaMutation.isPending}
        label={t("me.localDataStorage.mediaCleanupTitle")}
        onClick={() => cleanupMediaMutation.mutate()}
      />
      <ActionRow
        action={repairMutation.isPending ? t("me.action.processing") : t("me.action.check")}
        desc={t("me.localDataStorage.repairDesc")}
        enabled={Boolean(desktopApi?.localDataRepair) && !repairMutation.isPending}
        label={t("me.localDataStorage.repairTitle")}
        onClick={() => repairMutation.mutate()}
      />
    </>
  );
}

function DevelopmentDiagnosticsSection({ authSession }: { authSession: AuthSession | null }) {
  const { t } = useI18n();
  const [version, setVersion] = useState(t("me.development.browserDebug"));
  const [profile, setProfile] = useState<AppInstanceProfilePayload | null>(null);

  useEffect(() => {
    void window.desktopApi?.getAppVersion?.().then(setVersion).catch(() => setVersion(t("me.development.unknownVersion")));
    void getAppInstanceProfile().then(setProfile).catch(() => setProfile(null));
  }, [t]);

  const diagnosticsCount =
    (window.__lppSettingsDiagnostics?.length ?? 0) +
    (window.__lppGatewayDiagnostics?.length ?? 0) +
    (window.__lppApiErrorDiagnostics?.length ?? 0) +
    (window.__lppMessageCenterDiagnostics?.length ?? 0);

  return (
    <div className="settings-sub-card settings-dev-diagnostics">
      <header>
        <strong>{t("me.development.title")}</strong>
        <span className="settings-sub-card-meta">
          <LockKeyhole size={14} />
          <em>{t("me.development.visibleHint")}</em>
        </span>
      </header>
      <InfoRow {...settingRowProps("developmentDiagnostics")} desc={t("me.development.redactedHint")} />
      <InfoRow label={t("me.development.currentEnvironment")} desc={import.meta.env.DEV ? t("me.development.devRuntime") : t("me.development.testConnection")} />
      <InfoRow label={t("me.development.version")} desc={version} />
      <InfoRow label={t("me.development.apiUrl")} desc={formatEnvironment(authSession?.apiBaseUrl, t)} />
      <InfoRow label={t("me.development.realtime")} desc={t("me.development.realtimeHint")} />
      <InfoRow
        label="Profile"
        desc={profile ? `${profile.profileName} / ${profile.deviceId.slice(0, 8)}` : t("me.development.browserDebug")}
      />
      <InfoRow label={t("me.development.recentDiagnostics")} desc={t("me.development.recentDiagnosticsCount", { count: diagnosticsCount })} />
    </div>
  );
}

function formatStorageSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value >= 10 || unitIndex === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[unitIndex]}`;
}

function shouldShowDevelopmentDiagnostics(authSession: AuthSession | null) {
  if (import.meta.env.DEV) return true;
  if (typeof window !== "undefined" && window.localStorage.getItem("lpp.devDiagnostics") === "1") {
    return true;
  }
  return /(?:localhost|127\.0\.0\.1|test|dev|staging|qa)/i.test(authSession?.apiBaseUrl ?? "");
}

function formatEnvironment(value: string | null | undefined, t?: MeTranslate) {
  const translate = t ?? ((key: string) => key);
  if (!value) return translate("me.development.defaultEnvironment");
  try {
    const url = new URL(value);
    return translate("me.development.environmentOrigin", { origin: url.origin });
  } catch {
    return translate("me.development.environmentMasked");
  }
}

function maskMobile(value?: string | null) {
  if (!value) return "--";
  const normalized = value.replace(/\s+/g, "");
  if (normalized.length < 7) return value;
  return `${normalized.slice(0, 3)}****${normalized.slice(-4)}`;
}

function maskEmail(value?: string | null) {
  if (!value) return "--";
  const [name, domain] = value.split("@");
  if (!name || !domain) return value;
  const visible = name.length <= 2 ? name.slice(0, 1) : name.slice(0, 2);
  return `${visible}***@${domain}`;
}
