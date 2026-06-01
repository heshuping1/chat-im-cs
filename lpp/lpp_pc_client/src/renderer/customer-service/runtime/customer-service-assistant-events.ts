export const customerServiceAssistantInsertEvent = "lpp:customer-service:insert-assistant-text";

export function emitCustomerServiceAssistantInsert(text: string) {
  window.dispatchEvent(
    new CustomEvent(customerServiceAssistantInsertEvent, {
      detail: { text },
    }),
  );
}

export function readCustomerServiceAssistantInsertText(event: Event) {
  if (!(event instanceof CustomEvent)) return "";
  const text = (event.detail as { text?: unknown } | undefined)?.text;
  return typeof text === "string" ? text.trim() : "";
}
