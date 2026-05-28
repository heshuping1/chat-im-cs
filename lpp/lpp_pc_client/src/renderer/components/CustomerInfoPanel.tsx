import type { ContactItem } from "../data/types";
import { CustomerProfileWorkspace } from "./CustomerProfileWorkspace";

export function CustomerInfoPanel({
  className,
  contact,
}: {
  className: string;
  contact?: ContactItem | null;
}) {
  return (
    <CustomerProfileWorkspace
      className={className}
      contact={contact}
      title="客户信息"
    />
  );
}
