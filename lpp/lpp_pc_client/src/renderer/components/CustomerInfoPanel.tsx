import type { ContactItem } from "../data/types";
import { useI18n } from "../i18n/useI18n";
import { CustomerProfileWorkspace } from "./CustomerProfileWorkspace";

export function CustomerInfoPanel({
  className,
  contact,
}: {
  className: string;
  contact?: ContactItem | null;
}) {
  const { t } = useI18n();

  return (
    <CustomerProfileWorkspace
      className={className}
      contact={contact}
      title={t("customerProfile.title")}
    />
  );
}
