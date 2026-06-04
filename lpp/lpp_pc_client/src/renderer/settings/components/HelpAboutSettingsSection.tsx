import { useMutation } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import type { AuthSession } from "../../data/auth/auth-session";
import { requireApiClient } from "../../data/runtime";
import { formatError } from "../../lib/format";
import { settingRowProps } from "../models/settingsCatalog";
import { ActionRow, InfoRow, InlineSettingsState } from "./SettingsRows";

type LegalPanel = "terms" | "privacy" | null;

type LegalPartKind = "title" | "meta" | "section" | "body" | "footer";

interface LegalPart {
  kind: LegalPartKind;
  text: string;
}

const legalContent = {
  terms: {
    title: "用户协议",
    parts: [
      { kind: "title", text: "绿泡泡用户服务协议" },
      { kind: "meta", text: "更新日期：2026年1月1日" },
      { kind: "meta", text: "生效日期：2026年1月1日" },
      {
        kind: "body",
        text: '欢迎您使用绿泡泡！在使用绿泡泡服务之前，请您仔细阅读本协议。本协议是您与绿泡泡科技有限公司（以下简称"我们"）之间关于您使用绿泡泡软件及相关服务所订立的协议。',
      },
      { kind: "section", text: "一、服务内容" },
      {
        kind: "body",
        text: "1.1 绿泡泡是一款即时通讯应用，提供文字、语音、视频通话、文件传输等通讯服务。\n\n1.2 我们保留随时修改、中断或终止部分或全部服务的权利，且无需对用户或第三方承担任何责任。\n\n1.3 我们有权定期或不定期地对提供服务的平台进行检修、维护、升级，此类情况可能导致服务在合理时间内中断。",
      },
      { kind: "section", text: "二、账号注册与使用" },
      {
        kind: "body",
        text: "2.1 您在使用本服务前需要注册一个绿泡泡账号。账号注册时，您需要提供真实、准确、完整的个人信息。\n\n2.2 您应妥善保管账号及密码，不得将账号转让或授权他人使用。因您保管不善导致的账号被盗用，由您自行承担相应责任。\n\n2.3 您注册的账号仅限本人使用，禁止出售、出租、转让账号。",
      },
      { kind: "section", text: "三、用户行为规范" },
      {
        kind: "body",
        text: "3.1 您在使用本服务时，必须遵守中华人民共和国相关法律法规。\n\n3.2 您不得利用本服务从事以下行为：\n• 发布、传播违法、违规、有害信息\n• 侵犯他人知识产权、隐私权等合法权益\n• 发送垃圾信息、广告信息\n• 从事任何危害网络安全的行为\n• 其他违反法律法规或本协议的行为\n\n3.3 如您违反上述规定，我们有权暂停或终止您的账号，并保留追究法律责任的权利。",
      },
      { kind: "section", text: "四、知识产权" },
      {
        kind: "body",
        text: "4.1 绿泡泡软件及相关服务中包含的所有内容，包括但不限于文字、图片、音频、视频、软件、程序、代码等，其知识产权均归我们所有。\n\n4.2 未经我们书面许可，您不得以任何方式复制、修改、传播或使用上述内容。",
      },
      { kind: "section", text: "五、免责声明" },
      {
        kind: "body",
        text: "5.1 我们不对因不可抗力或我们无法控制的原因造成的服务中断或其他缺陷承担任何责任。\n\n5.2 您通过本服务发布的内容，由您自行承担相应的法律责任。\n\n5.3 对于第三方提供的内容或服务，我们不承担任何责任。",
      },
      { kind: "section", text: "六、协议修改" },
      {
        kind: "body",
        text: "6.1 我们有权根据需要不定期修订本协议，修订后的协议将在本软件内公告。\n\n6.2 如您在协议修订后继续使用本服务，则视为您已接受修订后的协议。",
      },
      { kind: "section", text: "七、联系我们" },
      {
        kind: "body",
        text: "如您对本协议有任何疑问，请通过以下方式联系我们：\n\n公司名称：绿泡泡科技有限公司\n电子邮件：support@lpp.com\n客服电话：400-000-0000",
      },
      { kind: "footer", text: "© 2026 绿泡泡科技有限公司 保留所有权利" },
    ] satisfies LegalPart[],
  },
  privacy: {
    title: "隐私政策",
    parts: [
      { kind: "title", text: "绿泡泡隐私政策" },
      { kind: "meta", text: "更新日期：2026年1月1日" },
      { kind: "meta", text: "生效日期：2026年1月1日" },
      {
        kind: "body",
        text: '绿泡泡科技有限公司（以下简称"我们"）深知个人信息对您的重要性，我们将按照法律法规要求，采取相应安全保护措施，尽力保护您的个人信息安全可控。',
      },
      { kind: "section", text: "一、我们收集的信息" },
      {
        kind: "body",
        text: "1.1 账号信息\n注册时您需提供手机号码或邮箱地址，以及您设置的昵称、头像等个人资料。\n\n1.2 通讯内容\n您在使用绿泡泡时发送的消息、图片、语音、视频等内容，仅用于提供通讯服务，我们不会主动读取您的私信内容。\n\n1.3 设备信息\n为保障服务安全，我们会收集设备型号、操作系统版本、设备标识符等信息。\n\n1.4 日志信息\n您使用服务时，我们会自动收集服务日志信息，包括登录时间、使用功能等。",
      },
      { kind: "section", text: "二、我们如何使用信息" },
      {
        kind: "body",
        text: "2.1 提供、维护和改善我们的服务\n\n2.2 验证您的身份，保障账号安全\n\n2.3 向您发送服务通知和重要提醒\n\n2.4 分析服务使用情况，优化用户体验\n\n2.5 遵守法律法规要求",
      },
      { kind: "section", text: "三、信息共享" },
      {
        kind: "body",
        text: "3.1 我们不会向第三方出售您的个人信息。\n\n3.2 在以下情况下，我们可能共享您的信息：\n• 获得您的明确同意\n• 依据法律法规要求\n• 为保护用户或公众的合法权益\n\n3.3 我们可能与合作伙伴共享必要的信息以提供服务，但会要求其遵守严格的保密义务。",
      },
      { kind: "section", text: "四、信息存储与安全" },
      {
        kind: "body",
        text: "4.1 您的个人信息存储于中华人民共和国境内的服务器。\n\n4.2 我们采用加密传输、访问控制等安全措施保护您的信息。\n\n4.3 我们会在实现服务目的所必要的期限内保留您的信息，超出期限后将依法删除或匿名化处理。",
      },
      { kind: "section", text: "五、您的权利" },
      {
        kind: "body",
        text: '5.1 访问权：您可以在"设置 - 我的资料"中查看您的个人信息。\n\n5.2 更正权：您可以随时修改您的个人资料。\n\n5.3 删除权：您可以申请注销账号，注销后我们将删除您的个人信息。\n\n5.4 撤回同意：您可以通过关闭相关功能权限撤回您的授权同意。',
      },
      { kind: "section", text: "六、未成年人保护" },
      {
        kind: "body",
        text: "6.1 绿泡泡不向未满14周岁的未成年人提供服务。\n\n6.2 如果我们发现在未获得可证实的父母同意的情况下收集了未成年人的个人信息，我们会尽快删除相关信息。",
      },
      { kind: "section", text: "七、隐私政策更新" },
      {
        kind: "body",
        text: "7.1 我们可能适时修订本隐私政策，修订后将在本软件内公告。\n\n7.2 重大变更时，我们会通过推送通知等方式提醒您。",
      },
      { kind: "section", text: "八、联系我们" },
      {
        kind: "body",
        text: "如您对本隐私政策有任何疑问或投诉，请联系：\n\n公司名称：绿泡泡科技有限公司\n电子邮件：privacy@lpp.com\n客服电话：400-000-0000\n我们将在15个工作日内回复您的请求。",
      },
      { kind: "footer", text: "© 2026 绿泡泡科技有限公司 保留所有权利" },
    ] satisfies LegalPart[],
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

  useEffect(() => {
    document.querySelector(".settings-detail-body")?.scrollTo({ top: 0 });
  }, [legalPanel]);

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

  if (currentLegal) {
    return (
      <section className="settings-about-layout settings-about-legal-view" aria-label={currentLegal.title}>
        <header className="settings-about-legal-head">
          <button type="button" onClick={() => setLegalPanel(null)}>
            <ArrowLeft size={16} />
            返回
          </button>
          <strong>{currentLegal.title}</strong>
        </header>
        <div className="settings-legal-copy">
          {currentLegal.parts.map((part, index) => (
            <LegalCopyPart key={`${part.kind}-${index}`} part={part} />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="settings-about-layout" aria-label="关于设置">
      <div className="settings-sub-card">
        <header>
          <strong>版本信息</strong>
          <span>{version}</span>
        </header>
        <InfoRow {...settingRowProps("aboutClient")} desc={`lppchat ${version}`} />
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
    </section>
  );
}

function LegalCopyPart({ part }: { part: LegalPart }) {
  if (part.kind === "title") return <h3>{part.text}</h3>;
  if (part.kind === "section") return <h4>{part.text}</h4>;
  if (part.kind === "meta") return <em>{part.text}</em>;
  if (part.kind === "footer") return <small>{part.text}</small>;
  return <p>{part.text}</p>;
}

export async function checkClientUpdate() {
  throw new Error("当前客户端未接入更新检查接口");
}
