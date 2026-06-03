import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { AuthSession } from "../../data/auth/auth-session";
import { requireApiClient } from "../../data/runtime";
import { formatError } from "../../lib/format";
import { settingRowProps } from "../models/settingsCatalog";
import { ActionRow, InfoRow, InlineSettingsState } from "./SettingsRows";

type LegalPanel = "terms" | "privacy" | null;

const legalContent = {
  terms: {
    title: "用户协议",
    body:
      "本客户端用于企业内部 IM 与在线客服工作。账号使用、企业数据、客户会话、文件消息和诊断信息应遵循企业管理要求、平台服务协议与适用法律法规。正式长文本接入后将与 APP 协议保持一致，并支持版本号与更新时间展示。",
  },
  privacy: {
    title: "隐私政策",
    body:
      "PC 客户端只展示客服工作所需的账号、企业、会话、客户资料和诊断信息。诊断、反馈和日志默认脱敏，不写入密码、token、Authorization、cookie 或完整手机号。正式长文本接入后将与 APP 隐私政策保持一致。",
  },
};

export function HelpAboutSettingsSection({
  authSession,
  setNotice,
}: {
  authSession: AuthSession | null;
  setNotice: (notice: string) => void;
}) {
  const [version, setVersion] = useState("0.1.0");
  const [legalPanel, setLegalPanel] = useState<LegalPanel>(null);
  const [feedbackType, setFeedbackType] = useState("bug");
  const [feedbackTitle, setFeedbackTitle] = useState("");
  const [feedbackContent, setFeedbackContent] = useState("");
  const [feedbackContact, setFeedbackContact] = useState("");

  useEffect(() => {
    void window.desktopApi?.getAppVersion?.().then(setVersion).catch(() => setVersion("0.1.0"));
  }, []);

  const submitFeedback = useMutation({
    mutationFn: async () => {
      if (!feedbackTitle.trim()) throw new Error("请输入反馈标题");
      if (!feedbackContent.trim()) throw new Error("请输入反馈内容");
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
      setNotice(result.feedbackId ? `反馈已提交：${result.feedbackId}` : "反馈已提交");
    },
    onError: (error) => setNotice(`反馈提交失败：${formatError(error)}`),
  });

  const checkUpdate = useMutation({
    mutationFn: checkClientUpdate,
    onSuccess: () => setNotice("当前已是最新版本"),
    onError: (error) => setNotice(`检查更新失败：${formatError(error)}`),
  });

  const currentLegal = legalPanel ? legalContent[legalPanel] : null;

  return (
    <>
      <div className="settings-sub-card">
        <header>
          <strong>版本信息</strong>
          <span>{version}</span>
        </header>
        <InfoRow {...settingRowProps("aboutClient")} desc={`LPP PC 客服客户端 ${version}`} />
        <InfoRow label="更新通道" desc="Windows 测试环境；自动更新依赖 Electron updater、签名安装包和发布通道。" />
      </div>
      <ActionRow
        {...settingRowProps("checkUpdate")}
        action={checkUpdate.isPending ? "检查中" : "检查"}
        enabled={!checkUpdate.isPending}
        onClick={() => checkUpdate.mutate()}
      />
      <div className="settings-sub-card">
        <header>
          <strong>反馈</strong>
          <span>提交后进入后台问题池</span>
        </header>
        <div className="settings-feedback-form">
          <select
            aria-label="反馈类型"
            value={feedbackType}
            onChange={(event) => setFeedbackType(event.target.value)}
          >
            <option value="bug">缺陷反馈</option>
            <option value="suggestion">产品建议</option>
            <option value="complaint">投诉</option>
            <option value="experience">体验问题</option>
          </select>
          <input
            value={feedbackTitle}
            placeholder="一句话说明问题"
            onChange={(event) => setFeedbackTitle(event.target.value)}
          />
          <textarea
            value={feedbackContent}
            placeholder="请描述场景、复现步骤、期望表现和实际表现。不要填写密码、token 或完整手机号。"
            onChange={(event) => setFeedbackContent(event.target.value)}
          />
          <input
            value={feedbackContact}
            placeholder="联系方式，可选"
            onChange={(event) => setFeedbackContact(event.target.value)}
          />
          <button
            type="button"
            disabled={submitFeedback.isPending}
            onClick={() => submitFeedback.mutate()}
          >
            {submitFeedback.isPending ? "提交中" : "提交反馈"}
          </button>
        </div>
        <InlineSettingsState text="反馈内容会带上脱敏后的客户端上下文，不会上传密码、token、Authorization 或 cookie。" />
      </div>
      <ActionRow
        {...settingRowProps("terms")}
        action="查看"
        onClick={() => setLegalPanel("terms")}
      />
      <ActionRow
        {...settingRowProps("privacyPolicy")}
        action="查看"
        onClick={() => setLegalPanel("privacy")}
      />
      {currentLegal && (
        <section className="settings-sub-card settings-legal-panel">
          <header>
            <strong>{currentLegal.title}</strong>
            <button type="button" onClick={() => setLegalPanel(null)}>
              关闭
            </button>
          </header>
          <p>{currentLegal.body}</p>
        </section>
      )}
    </>
  );
}

export async function checkClientUpdate() {
  throw new Error("当前客户端未接入更新检查接口");
}
