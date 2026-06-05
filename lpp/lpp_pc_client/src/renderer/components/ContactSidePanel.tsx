import type { ContactFilter, ContactItem } from "../data/types";
import { useI18n } from "../i18n/useI18n";

function contactValue(value: string | undefined | null, t: (key: string, params?: Record<string, string | number>) => string) {
  if (!value) return value || "";
  return value.startsWith("contacts.") ? t(value) : value;
}

export function ContactSidePanel({
  filter,
  contact,
}: {
  filter: ContactFilter;
  contact?: ContactItem;
}) {
  const { t } = useI18n();
  if (contact?.kind === "staff") {
    return (
      <aside className="contacts-profile-panel contacts-side-empty">
        <h2>{t("contacts.side.staffTitle")}</h2>
        <p>{t("contacts.side.staffText")}</p>
        <div className="contacts-mini-rows">
          <InfoLine label={t("contacts.field.name")} value={contactValue(contact.name, t)} />
          <InfoLine label={t("contacts.field.identity")} value={t("contacts.identity.enterpriseMember")} />
          <InfoLine label={t("contacts.field.role")} value={contactValue(contact.roleLabel, t) || "--"} />
          <InfoLine label={t("contacts.field.department")} value={contactValue(contact.departmentName, t) || "--"} />
        </div>
      </aside>
    );
  }
  if (contact?.kind === "group") {
    return (
      <aside className="contacts-profile-panel contacts-side-empty">
        <h2>{t("contacts.side.groupTitle")}</h2>
        <p>{t("contacts.side.groupText")}</p>
        <div className="contacts-mini-rows">
          <InfoLine label={t("contacts.field.groupName")} value={contactValue(contact.name, t)} />
          <InfoLine label={t("contacts.field.memberCount")} value={contact.members ? t("contacts.memberCount", { count: contact.members }) : "--"} />
          <InfoLine label={t("contacts.field.reminder")} value={contact.muted ? t("contacts.reminder.muted") : t("contacts.reminder.normal")} />
        </div>
      </aside>
    );
  }
  return (
    <aside className="contacts-profile-panel contacts-side-empty">
      <h2>{filter === "requests" ? t("contacts.side.requestTitle") : t("contacts.side.profileTitle")}</h2>
      <p>
        {filter === "requests"
          ? t("contacts.side.requestText")
          : t("contacts.side.profileText")}
      </p>
    </aside>
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
