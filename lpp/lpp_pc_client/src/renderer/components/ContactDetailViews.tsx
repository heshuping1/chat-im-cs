import {
  Building2,
  ClipboardList,
  Crown,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import type { ContactItem } from "../data/types";
import { useI18n } from "../i18n/useI18n";
import { formatShortDate } from "../lib/format";

export function ContactDetailContent({ contact }: { contact: ContactItem }) {
  if (contact.kind === "customer") return <CustomerContactDetail contact={contact} />;
  if (contact.kind === "staff") return <StaffContactDetail contact={contact} />;
  if (contact.kind === "group") return <GroupContactDetail contact={contact} />;
  return <FriendContactDetail contact={contact} />;
}

function contactValue(value: string | undefined | null, t: (key: string, params?: Record<string, string | number>) => string) {
  if (!value) return value || "";
  if (value.startsWith("contacts.page.addedAt:")) {
    return t("contacts.page.addedAt", { time: value.slice("contacts.page.addedAt:".length) });
  }
  if (value.startsWith("contacts.page.groupMemberBadge:")) {
    return t("contacts.page.groupMemberBadge", { count: value.slice("contacts.page.groupMemberBadge:".length) });
  }
  return value.startsWith("contacts.") ? t(value) : value;
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
  const { t } = useI18n();
  return (
    <>
      <div className="contacts-info-grid">
        <InfoCard label={t("contacts.detail.source")} value={contactValue(contact.source, t) || "--"} />
        <InfoCard label={t("contacts.detail.addedAt")} value={formatShortDate(contact.createdAt)} />
        <InfoCard label={t("contacts.detail.linkedConversation")} value={contact.conversationId ? t("contacts.detail.established") : t("contacts.detail.notEstablished")} />
      </div>
      <section className="contacts-section-card">
        <h3>
          <ShieldCheck size={16} />
          {t("contacts.detail.customerTags")}
        </h3>
        <ContactTags tags={contact.tags} />
      </section>
      <section className="contacts-section-card">
        <h3>
          <ClipboardList size={16} />
          {t("contacts.detail.customerRelationship")}
        </h3>
        <div className="contacts-mini-rows">
          <InfoLine label={t("contacts.detail.relationshipType")} value={t("contacts.detail.customerFriend")} />
          <InfoLine label={t("contacts.detail.group")} value={contact.groupName || "--"} />
          <InfoLine label={t("contacts.detail.remark")} value={contactValue(contact.remark, t) || "--"} />
          <InfoLine label={t("contacts.detail.greenBubbleNo")} value={contact.greenBubbleNo || "--"} />
        </div>
      </section>
    </>
  );
}

function FriendContactDetail({ contact }: { contact: ContactItem }) {
  const { t } = useI18n();
  return (
    <>
      <div className="contacts-info-grid">
        <InfoCard label={t("contacts.detail.source")} value={contactValue(contact.source, t) || "--"} />
        <InfoCard label={t("contacts.detail.addedAt")} value={formatShortDate(contact.createdAt)} />
        <InfoCard label={t("contacts.detail.linkedConversation")} value={contact.conversationId ? t("contacts.detail.established") : t("contacts.detail.notEstablished")} />
      </div>
      <section className="contacts-section-card">
        <h3>
          <ClipboardList size={16} />
          {t("contacts.detail.friendRelationship")}
        </h3>
        <div className="contacts-mini-rows">
          <InfoLine label={t("contacts.detail.group")} value={contact.groupName || "--"} />
          <InfoLine label={t("contacts.detail.remark")} value={contactValue(contact.remark, t) || "--"} />
          <InfoLine label={t("contacts.detail.greenBubbleNo")} value={contact.greenBubbleNo || "--"} />
        </div>
      </section>
      <section className="contacts-section-card">
        <h3>
          <ShieldCheck size={16} />
          {t("contacts.detail.friendTags")}
        </h3>
        <ContactTags tags={contact.tags} />
      </section>
    </>
  );
}

function StaffContactDetail({ contact }: { contact: ContactItem }) {
  const { t } = useI18n();
  return (
    <>
      <div className="contacts-info-grid">
        <InfoCard label={t("contacts.detail.identity")} value={t("contacts.detail.enterpriseMember")} />
        <InfoCard label={t("contacts.detail.role")} value={contactValue(contact.roleLabel, t) || "--"} />
        <InfoCard label={t("contacts.detail.department")} value={contact.departmentName || "--"} />
        <InfoCard label={t("contacts.detail.position")} value={contact.position || "--"} />
        <InfoCard label={t("contacts.detail.joinedAt")} value={formatShortDate(contact.joinedAt)} />
      </div>
      <section className="contacts-section-card">
        <h3>
          <Building2 size={16} />
          {t("contacts.detail.organizationInfo")}
        </h3>
        <div className="contacts-mini-rows">
          <InfoLine label={t("contacts.detail.organizationPath")} value={contactValue(contact.departmentName, t) || t("contacts.detail.enterpriseMember")} />
          <InfoLine label={t("contacts.detail.greenBubbleNo")} value={contact.greenBubbleNo || "--"} />
          <InfoLine label={t("contacts.detail.linkedConversation")} value={contact.conversationId ? t("contacts.detail.established") : t("contacts.detail.notEstablished")} />
        </div>
      </section>
      <section className="contacts-section-card">
        <h3>
          <Crown size={16} />
          {t("contacts.detail.permissionIdentity")}
        </h3>
        <div className="contacts-mini-rows">
          <InfoLine label={t("contacts.detail.identity")} value={t("contacts.detail.enterpriseMember")} />
          <InfoLine label={t("contacts.detail.role")} value={contactValue(contact.roleLabel, t) || "--"} />
        </div>
      </section>
    </>
  );
}

function GroupContactDetail({ contact }: { contact: ContactItem }) {
  const { t } = useI18n();
  return (
    <>
      <div className="contacts-info-grid">
        <InfoCard label={t("contacts.detail.memberCount")} value={contact.members ? t("contacts.detail.peopleCount", { count: contact.members }) : "--"} />
        <InfoCard label={t("contacts.detail.reminderStatus")} value={contact.muted ? t("contacts.detail.muted") : t("contacts.detail.normalReminder")} />
        <InfoCard label={t("contacts.detail.latestMessage")} value={contact.lastMessagePreview || "--"} />
        <InfoCard label={t("contacts.detail.lastTime")} value={formatShortDate(contact.lastMessageAt)} />
      </div>
      <section className="contacts-section-card">
        <h3>
          <UsersRound size={16} />
          {t("contacts.detail.groupInfo")}
        </h3>
        <div className="contacts-mini-rows">
          <InfoLine label={t("contacts.detail.groupType")} value={contactValue(contact.source, t) || "--"} />
          <InfoLine label={t("contacts.detail.conversationId")} value={contact.conversationId || "--"} />
          <InfoLine label={t("contacts.detail.remark")} value={contactValue(contact.remark, t) || "--"} />
        </div>
      </section>
      <section className="contacts-section-card">
        <h3>
          <ShieldCheck size={16} />
          {t("contacts.detail.groupTags")}
        </h3>
        <ContactTags tags={contact.tags} />
      </section>
    </>
  );
}

function ContactTags({ tags }: { tags: string[] }) {
  const { t } = useI18n();
  return (
    <div className="contacts-tag-row">
      {tags.length > 0 ? tags.map((tag) => <span key={tag}>{contactValue(tag, t)}</span>) : <em>{t("contacts.detail.noTags")}</em>}
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
