import { useMutation } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import type { ClientUpdatePreferences, ClientUpdateState } from "../../../shared/desktop-api";
import type { AuthSession } from "../../data/auth/auth-session";
import { requireApiClient } from "../../data/runtime";
import { useI18n } from "../../i18n/useI18n";
import { formatError } from "../../lib/format";
import {
  updatePackageSummary,
  updatePhaseLabelKey,
  updateProgressText,
  updateStateCanDownload,
  updateStateCanInstall,
} from "../models/clientUpdateModel";
import { settingRowProps } from "../models/settingsCatalog";
import {
  checkClientUpdateRuntime,
  downloadClientUpdate,
  getClientUpdateState,
  installClientUpdate,
  isClientUpdateRuntimeAvailable,
  setClientUpdatePreferences,
  subscribeClientUpdateState,
} from "../runtime/clientUpdateRuntime";
import { ActionRow, InfoRow, InlineSettingsState, SelectRow, SwitchRow } from "./SettingsRows";

type LegalPanel = "terms" | "privacy" | null;
type LegalPartKind = "title" | "meta" | "section" | "body" | "footer";
type Translate = (key: string, params?: Record<string, string | number>) => string;

interface LegalPart {
  kind: LegalPartKind;
  key: string;
}

const legalContent: Record<Exclude<LegalPanel, null>, { titleKey: string; parts: LegalPart[] }> = {
  terms: {
    titleKey: "settings.helpAbout.legal.terms.title",
    parts: [
      { kind: "title", key: "settings.helpAbout.legal.terms.parts.0" },
      { kind: "meta", key: "settings.helpAbout.legal.terms.parts.1" },
      { kind: "meta", key: "settings.helpAbout.legal.terms.parts.2" },
      { kind: "body", key: "settings.helpAbout.legal.terms.parts.3" },
      { kind: "section", key: "settings.helpAbout.legal.terms.parts.4" },
      { kind: "body", key: "settings.helpAbout.legal.terms.parts.5" },
      { kind: "section", key: "settings.helpAbout.legal.terms.parts.6" },
      { kind: "body", key: "settings.helpAbout.legal.terms.parts.7" },
      { kind: "section", key: "settings.helpAbout.legal.terms.parts.8" },
      { kind: "body", key: "settings.helpAbout.legal.terms.parts.9" },
      { kind: "section", key: "settings.helpAbout.legal.terms.parts.10" },
      { kind: "body", key: "settings.helpAbout.legal.terms.parts.11" },
      { kind: "section", key: "settings.helpAbout.legal.terms.parts.12" },
      { kind: "body", key: "settings.helpAbout.legal.terms.parts.13" },
      { kind: "section", key: "settings.helpAbout.legal.terms.parts.14" },
      { kind: "body", key: "settings.helpAbout.legal.terms.parts.15" },
      { kind: "footer", key: "settings.helpAbout.legal.terms.parts.16" },
    ],
  },
  privacy: {
    titleKey: "settings.helpAbout.legal.privacy.title",
    parts: [
      { kind: "title", key: "settings.helpAbout.legal.privacy.parts.0" },
      { kind: "meta", key: "settings.helpAbout.legal.privacy.parts.1" },
      { kind: "meta", key: "settings.helpAbout.legal.privacy.parts.2" },
      { kind: "body", key: "settings.helpAbout.legal.privacy.parts.3" },
      { kind: "section", key: "settings.helpAbout.legal.privacy.parts.4" },
      { kind: "body", key: "settings.helpAbout.legal.privacy.parts.5" },
      { kind: "section", key: "settings.helpAbout.legal.privacy.parts.6" },
      { kind: "body", key: "settings.helpAbout.legal.privacy.parts.7" },
      { kind: "section", key: "settings.helpAbout.legal.privacy.parts.8" },
      { kind: "body", key: "settings.helpAbout.legal.privacy.parts.9" },
      { kind: "section", key: "settings.helpAbout.legal.privacy.parts.10" },
      { kind: "body", key: "settings.helpAbout.legal.privacy.parts.11" },
      { kind: "section", key: "settings.helpAbout.legal.privacy.parts.12" },
      { kind: "body", key: "settings.helpAbout.legal.privacy.parts.13" },
      { kind: "section", key: "settings.helpAbout.legal.privacy.parts.14" },
      { kind: "body", key: "settings.helpAbout.legal.privacy.parts.15" },
      { kind: "footer", key: "settings.helpAbout.legal.privacy.parts.16" },
    ],
  },
};

export function HelpAboutSettingsSection({
  authSession,
  setNotice,
}: {
  authSession: AuthSession | null;
  setNotice: (notice: string) => void;
}) {
  const { t } = useI18n();
  const [version, setVersion] = useState("0.1.0");
  const [legalPanel, setLegalPanel] = useState<LegalPanel>(null);
  const [feedbackType, setFeedbackType] = useState("bug");
  const [feedbackTitle, setFeedbackTitle] = useState("");
  const [feedbackContent, setFeedbackContent] = useState("");
  const [feedbackContact, setFeedbackContact] = useState("");
  const [updateState, setUpdateState] = useState<ClientUpdateState>({
    currentVersion: version,
    preferences: {
      autoCheck: false,
      channel: "stable",
      downloadMode: "differential-first",
    },
    phase: "idle",
  });

  useEffect(() => {
    void window.desktopApi?.getAppVersion?.().then(setVersion).catch(() => setVersion("0.1.0"));
  }, []);

  useEffect(() => {
    void getClientUpdateState().then((state) => {
      setUpdateState(state);
      setVersion(state.currentVersion);
    });
    return subscribeClientUpdateState((state) => {
      setUpdateState(state);
      setVersion(state.currentVersion);
    });
  }, []);

  useEffect(() => {
    document.querySelector(".settings-detail-body")?.scrollTo({ top: 0 });
  }, [legalPanel]);

  const submitFeedback = useMutation({
    mutationFn: async () => {
      if (!feedbackTitle.trim()) throw new Error(t("settings.helpAbout.feedback.validation.title"));
      if (!feedbackContent.trim()) throw new Error(t("settings.helpAbout.feedback.validation.content"));
      return requireApiClient(authSession).submitFeedback({
        type: feedbackType,
        title: feedbackTitle,
        content: feedbackContent,
        contact: feedbackContact,
        diagnosticsIncluded: false,
        clientContext: {
          app: "lpp_pc_client",
          version,
          apiEnvironment: authSession?.apiBaseUrl ? "configured" : "default-test",
          tenantId: authSession?.tenantId,
          tenantCode: authSession?.tenantCode || "mouse-corp",
        },
      });
    },
    onSuccess: (result) => {
      setFeedbackTitle("");
      setFeedbackContent("");
      setFeedbackContact("");
      setNotice(
        result.feedbackId
          ? t("settings.helpAbout.feedback.submittedWithId", { id: result.feedbackId })
          : t("settings.helpAbout.feedback.submitted"),
      );
    },
    onError: (error) => setNotice(t("settings.helpAbout.feedback.submitFailed", { error: formatError(error) })),
  });

  const checkUpdate = useMutation({
    mutationFn: checkClientUpdate,
    onSuccess: (state) => {
      setUpdateState(state);
      setNotice(
        state.phase === "available"
          ? t("settings.helpAbout.update.available", { version: state.available?.version ?? "" })
          : t("settings.helpAbout.update.latest"),
      );
    },
    onError: (error) => setNotice(t("settings.helpAbout.update.failed", { error: formatError(error) })),
  });

  const downloadUpdate = useMutation({
    mutationFn: downloadClientUpdate,
    onSuccess: (state) => {
      setUpdateState(state);
      if (state.phase === "downloaded") setNotice(t("settings.helpAbout.update.downloaded"));
    },
    onError: (error) => setNotice(t("settings.helpAbout.update.failed", { error: formatError(error) })),
  });

  const installUpdate = useMutation({
    mutationFn: installClientUpdate,
    onError: (error) => setNotice(t("settings.helpAbout.update.failed", { error: formatError(error) })),
  });

  const updatePreferences = useMutation({
    mutationFn: setClientUpdatePreferences,
    onSuccess: (preferences) => {
      setUpdateState((state) => ({ ...state, preferences }));
    },
    onError: (error) => setNotice(t("settings.helpAbout.update.failed", { error: formatError(error) })),
  });

  const setUpdatePreference = (patch: Partial<ClientUpdatePreferences>) => {
    const nextPreferences = {
      ...updateState.preferences,
      ...patch,
      downloadMode: "differential-first" as const,
    };
    setUpdateState((state) => ({ ...state, preferences: nextPreferences }));
    updatePreferences.mutate(nextPreferences);
  };

  const currentLegal = legalPanel ? legalContent[legalPanel] : null;

  if (currentLegal) {
    const currentLegalTitle = t(currentLegal.titleKey);
    return (
      <section className="settings-about-layout settings-about-legal-view" aria-label={currentLegalTitle}>
        <header className="settings-about-legal-head">
          <button type="button" onClick={() => setLegalPanel(null)}>
            <ArrowLeft size={16} />
            {t("settings.helpAbout.back")}
          </button>
          <strong>{currentLegalTitle}</strong>
        </header>
        <div className="settings-legal-copy">
          {currentLegal.parts.map((part, index) => (
            <LegalCopyPart key={`${part.kind}-${index}`} part={part} t={t} />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="settings-about-layout" aria-label={t("settings.helpAbout.aria")}>
      <div className="settings-sub-card">
        <header>
          <strong>{t("settings.helpAbout.version.title")}</strong>
          <span>{version}</span>
        </header>
        <InfoRow {...settingRowProps("aboutClient")} desc={`lppchat ${version}`} />
        <SwitchRow
          {...settingRowProps("autoCheckUpdates")}
          checked={updateState.preferences.autoCheck}
          enabled={isClientUpdateRuntimeAvailable() && !updatePreferences.isPending}
          onChange={(autoCheck) => setUpdatePreference({ autoCheck })}
        />
        <SelectRow
          {...settingRowProps("updateChannel")}
          enabled={isClientUpdateRuntimeAvailable() && !updatePreferences.isPending}
          value={updateState.preferences.channel}
          options={["stable", "beta"]}
          optionLabels={{
            beta: t("settings.helpAbout.update.channel.beta"),
            stable: t("settings.helpAbout.update.channel.stable"),
          }}
          onChange={(channel) => setUpdatePreference({ channel })}
        />
        <InfoRow
          {...settingRowProps("updateDownloadStrategy")}
          desc={t("settings.helpAbout.update.strategyDesc")}
        />
        <InfoRow
          label={t("settings.helpAbout.update.status")}
          desc={updateStatusDescription(updateState, t)}
          stateText={t(updatePhaseLabelKey(updateState.phase))}
        />
      </div>
      <ActionRow
        {...settingRowProps("checkUpdate")}
        action={checkUpdate.isPending ? t("settings.helpAbout.update.checking") : t("settings.helpAbout.update.check")}
        enabled={isClientUpdateRuntimeAvailable() && !checkUpdate.isPending}
        onClick={() => checkUpdate.mutate()}
      />
      {updateState.available && (
        <div className="settings-sub-card">
          <header>
            <strong>{t("settings.helpAbout.update.newVersion")}</strong>
            <span>{updatePackageSummary(updateState.available)}</span>
          </header>
          {updateState.available.releaseNotes && (
            <InlineSettingsState text={updateState.available.releaseNotes} />
          )}
          {updateState.progress && (
            <InlineSettingsState text={updateProgressText(updateState.progress)} />
          )}
          <ActionRow
            label={t("settings.helpAbout.update.download")}
            desc={t("settings.helpAbout.update.downloadDesc")}
            action={
              downloadUpdate.isPending || updateState.phase === "downloading"
                ? t("settings.helpAbout.update.downloading")
                : t("settings.helpAbout.update.download")
            }
            enabled={
              updateStateCanDownload(updateState) &&
              !downloadUpdate.isPending &&
              updateState.phase !== "downloading"
            }
            onClick={() => downloadUpdate.mutate()}
          />
          <ActionRow
            label={t("settings.helpAbout.update.install")}
            desc={t("settings.helpAbout.update.installDesc")}
            action={t("settings.helpAbout.update.install")}
            enabled={updateStateCanInstall(updateState) && !installUpdate.isPending}
            onClick={() => installUpdate.mutate()}
          />
        </div>
      )}
      <div className="settings-sub-card">
        <header>
          <strong>{t("settings.helpAbout.feedback.title")}</strong>
          <span>{t("settings.helpAbout.feedback.subtitle")}</span>
        </header>
        <div className="settings-feedback-form">
          <select
            aria-label={t("settings.helpAbout.feedback.typeAria")}
            value={feedbackType}
            onChange={(event) => setFeedbackType(event.target.value)}
          >
            <option value="bug">{t("settings.helpAbout.feedback.types.bug")}</option>
            <option value="suggestion">{t("settings.helpAbout.feedback.types.suggestion")}</option>
            <option value="complaint">{t("settings.helpAbout.feedback.types.complaint")}</option>
            <option value="experience">{t("settings.helpAbout.feedback.types.experience")}</option>
          </select>
          <input
            value={feedbackTitle}
            placeholder={t("settings.helpAbout.feedback.titlePlaceholder")}
            onChange={(event) => setFeedbackTitle(event.target.value)}
          />
          <textarea
            value={feedbackContent}
            placeholder={t("settings.helpAbout.feedback.contentPlaceholder")}
            onChange={(event) => setFeedbackContent(event.target.value)}
          />
          <input
            value={feedbackContact}
            placeholder={t("settings.helpAbout.feedback.contactPlaceholder")}
            onChange={(event) => setFeedbackContact(event.target.value)}
          />
          <button type="button" disabled={submitFeedback.isPending} onClick={() => submitFeedback.mutate()}>
            {submitFeedback.isPending ? t("settings.helpAbout.feedback.submitting") : t("settings.helpAbout.feedback.submit")}
          </button>
        </div>
        <InlineSettingsState text={t("settings.helpAbout.feedback.privacyNote")} />
      </div>
      <ActionRow
        {...settingRowProps("terms")}
        action={t("settings.helpAbout.view")}
        onClick={() => setLegalPanel("terms")}
      />
      <ActionRow
        {...settingRowProps("privacyPolicy")}
        action={t("settings.helpAbout.view")}
        onClick={() => setLegalPanel("privacy")}
      />
    </section>
  );
}

function LegalCopyPart({ part, t }: { part: LegalPart; t: Translate }) {
  const text = t(part.key);
  if (part.kind === "title") return <h3>{text}</h3>;
  if (part.kind === "section") return <h4>{text}</h4>;
  if (part.kind === "meta") return <em>{text}</em>;
  if (part.kind === "footer") return <small>{text}</small>;
  return <p>{text}</p>;
}

export async function checkClientUpdate() {
  return checkClientUpdateRuntime();
}

function updateStatusDescription(
  state: ClientUpdateState,
  t: (key: string, params?: Record<string, string | number>) => string,
) {
  if (state.phase === "available" && state.available) return updatePackageSummary(state.available);
  if (state.phase === "downloading") return updateProgressText(state.progress) || t("settings.helpAbout.update.downloading");
  if (state.phase === "error" && state.error) return state.error;
  return t(`settings.helpAbout.update.desc.${state.phase}`);
}
