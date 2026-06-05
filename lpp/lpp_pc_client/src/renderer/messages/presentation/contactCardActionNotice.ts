import { contactCardActionErrorDescriptor } from "../models/contactCardModel";

type Translate = (key: string, params?: Record<string, string | number>) => string;

export function contactCardActionErrorText(
  error: unknown,
  fallbackKey: string,
  t: Translate,
) {
  const descriptor = contactCardActionErrorDescriptor(error);
  if (descriptor.kind !== "unknown") {
    return t(`contacts.actionError.${descriptor.kind}`);
  }
  return descriptor.message
    ? t("contacts.actionError.withMessage", {
        fallback: t(fallbackKey),
        message: descriptor.message,
      })
    : t(fallbackKey);
}
