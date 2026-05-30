import type {
  GatewayHandledEvent,
  GatewayCustomerServiceMessageReceivedEvent,
  GatewayCustomerServiceThreadChangedEvent,
  GatewayImMessageReceivedEvent,
  GatewayImReadReceivedEvent,
  GatewayTypedEvent,
} from "./gateway-event-types";

export interface GatewayDispatchHandlers {
  onCustomerServiceMessageReceived?: (event: GatewayCustomerServiceMessageReceivedEvent) => void;
  onCustomerServiceThreadChanged?: (event: GatewayCustomerServiceThreadChangedEvent) => void;
  onImMessageReceived?: (event: GatewayImMessageReceivedEvent) => void;
  onImReadReceived?: (event: GatewayImReadReceivedEvent) => void;
  onInvalidEvent?: (event: Extract<GatewayTypedEvent, { kind: "invalid" }>) => void;
  onIgnoredEvent?: (event: Extract<GatewayTypedEvent, { kind: "ignored" }>) => void;
  onHandlerError?: (error: GatewayDispatchError) => void;
}

export interface GatewayDispatchError {
  event: GatewayHandledEvent;
  error: unknown;
}

export interface GatewayDispatchResult {
  handled: boolean;
  kind: GatewayTypedEvent["kind"];
  error?: GatewayDispatchError;
}

export function dispatchGatewayEvent(
  event: GatewayTypedEvent,
  handlers: GatewayDispatchHandlers,
): GatewayDispatchResult {
  if (event.kind === "ignored") {
    handlers.onIgnoredEvent?.(event);
    return { handled: false, kind: event.kind };
  }

  if (event.kind === "invalid") {
    handlers.onInvalidEvent?.(event);
    return { handled: false, kind: event.kind };
  }

  try {
    if (event.kind === "im.message.received") {
      handlers.onImMessageReceived?.(event);
      return { handled: Boolean(handlers.onImMessageReceived), kind: event.kind };
    }

    if (event.kind === "im.read.received") {
      handlers.onImReadReceived?.(event);
      return { handled: Boolean(handlers.onImReadReceived), kind: event.kind };
    }

    if (event.kind === "cs.message.received") {
      handlers.onCustomerServiceMessageReceived?.(event);
      return { handled: Boolean(handlers.onCustomerServiceMessageReceived), kind: event.kind };
    }

    handlers.onCustomerServiceThreadChanged?.(event);
    return { handled: Boolean(handlers.onCustomerServiceThreadChanged), kind: event.kind };
  } catch (error) {
    const dispatchError = { event, error };
    handlers.onHandlerError?.(dispatchError);
    return { handled: false, kind: event.kind, error: dispatchError };
  }
}
