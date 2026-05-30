import {
  Building2,
  ClipboardList,
  Crown,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import type { ContactItem } from "../data/types";
import { formatShortDate } from "../lib/format";

export function ContactDetailContent({ contact }: { contact: ContactItem }) {
  if (contact.kind === "customer") return <CustomerContactDetail contact={contact} />;
  if (contact.kind === "staff") return <StaffContactDetail contact={contact} />;
  if (contact.kind === "group") return <GroupContactDetail contact={contact} />;
  return <FriendContactDetail contact={contact} />;
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="contacts-info-card">
      <span>{label}</span>
      <strong>{value || "--"}</strong>
    </div>
  );
}

function CustomerContactDetail({ contact }: { contact: ContactItem }) {
  return (
    <>
      <div className="contacts-info-grid">
        <InfoCard label="客户分组" value={contact.groupName || "--"} />
        <InfoCard label="客户来源" value={contact.source || "客户通讯录"} />
        <InfoCard label="添加时间" value={formatShortDate(contact.createdAt)} />
        <InfoCard label="关联会话" value={contact.conversationId ? "已建立" : "未建立"} />
      </div>
      <section className="contacts-section-card">
        <h3>
          <ShieldCheck size={16} />
          客户标签
        </h3>
        <ContactTags tags={contact.tags} />
      </section>
      <section className="contacts-section-card">
        <h3>
          <ClipboardList size={16} />
          客户关系
        </h3>
        <div className="contacts-mini-rows">
          <InfoLine label="关系类型" value="客户好友" />
          <InfoLine label="备注" value={contact.remark || "--"} />
          <InfoLine label="用户 ID" value={contact.userId || "--"} />
        </div>
      </section>
    </>
  );
}

function FriendContactDetail({ contact }: { contact: ContactItem }) {
  return (
    <>
      <div className="contacts-info-grid">
        <InfoCard label="好友分组" value={contact.groupName || "--"} />
        <InfoCard label="来源" value={contact.source || "好友通讯录"} />
        <InfoCard label="添加时间" value={formatShortDate(contact.createdAt)} />
        <InfoCard label="关联会话" value={contact.conversationId ? "已建立" : "未建立"} />
      </div>
      <section className="contacts-section-card">
        <h3>
          <ShieldCheck size={16} />
          好友标签
        </h3>
        <ContactTags tags={contact.tags} />
      </section>
    </>
  );
}

function StaffContactDetail({ contact }: { contact: ContactItem }) {
  return (
    <>
      <div className="contacts-info-grid">
        <InfoCard label="员工角色" value={contact.roleLabel || "--"} />
        <InfoCard label="所属部门" value={contact.departmentName || "--"} />
        <InfoCard label="职位" value={contact.position || "--"} />
        <InfoCard label="加入时间" value={formatShortDate(contact.joinedAt)} />
      </div>
      <section className="contacts-section-card">
        <h3>
          <Building2 size={16} />
          组织信息
        </h3>
        <div className="contacts-mini-rows">
          <InfoLine label="组织路径" value={contact.departmentName || "企业成员"} />
          <InfoLine label="用户 ID" value={contact.userId || "--"} />
          <InfoLine label="关联会话" value={contact.conversationId ? "已建立" : "未建立"} />
        </div>
      </section>
      <section className="contacts-section-card">
        <h3>
          <Crown size={16} />
          权限身份
        </h3>
        <ContactTags tags={contact.tags} />
      </section>
    </>
  );
}

function GroupContactDetail({ contact }: { contact: ContactItem }) {
  return (
    <>
      <div className="contacts-info-grid">
        <InfoCard label="成员数" value={contact.members ? `${contact.members} 人` : "--"} />
        <InfoCard label="提醒状态" value={contact.muted ? "免打扰" : "正常提醒"} />
        <InfoCard label="最近消息" value={contact.lastMessagePreview || "--"} />
        <InfoCard label="最后时间" value={formatShortDate(contact.lastMessageAt)} />
      </div>
      <section className="contacts-section-card">
        <h3>
          <UsersRound size={16} />
          群聊信息
        </h3>
        <div className="contacts-mini-rows">
          <InfoLine label="群类型" value={contact.source || "普通群聊"} />
          <InfoLine label="会话 ID" value={contact.conversationId || "--"} />
          <InfoLine label="备注" value={contact.remark || "--"} />
        </div>
      </section>
      <section className="contacts-section-card">
        <h3>
          <ShieldCheck size={16} />
          群标签
        </h3>
        <ContactTags tags={contact.tags} />
      </section>
    </>
  );
}

function ContactTags({ tags }: { tags: string[] }) {
  return (
    <div className="contacts-tag-row">
      {tags.length > 0 ? tags.map((tag) => <span key={tag}>{tag}</span>) : <em>暂无标签</em>}
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value || "--"}</strong>
    </div>
  );
}
