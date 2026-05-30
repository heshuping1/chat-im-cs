import type {
  GatewayDispatchError,
  GatewayDispatchHandlers,
} from "./gateway-dispatcher";
import { dispatchGatewayEvent } from "./gateway-dispatcher";
import { adaptCustomerServiceGatewayEvent } from "./cs-gateway-event-adapter";
import {
  diagnosticFromDispatchError,
  diagnosticFromGatewayEvent,
  diagnosticFromHandledGatewayEvent,
  logGatewayDiagnostic,
} from "./gateway-diagnostics";
import type {
  GatewayCustomerServiceMessageReceivedEvent,
  GatewayCustomerServiceThreadChangedEvent,
  GatewayRawEventInput,
} from "./gateway-event-types";

export interface CustomerServiceGatewayHandlerCallbacks {
  onMessageReceived: (event: GatewayCustomerServiceMessageReceivedEvent) => void;
  onThreadChanged: (event: GatewayCustomerServiceThreadChangedEvent) => void;
  onHandlerError?: (error: GatewayDispatchError) => void;
}

export function createCustomerServiceGatewayDispatchHandlers(
  callbacks: CustomerServiceGatewayHandlerCallbacks,
): GatewayDispatchHandlers {
  return {
    onCustomerServiceMessageReceived: callbacks.onMessageReceived,
    onCustomerServiceThreadChanged: callbacks.onThreadChanged,
    onHandlerError: callbacks.onHandlerError,
  };
}

export function handleFirstStageCustomerServiceGatewayEvent(
  input: GatewayRawEventInput,
  callbacks: CustomerServiceGatewayHandlerCallbacks,
) {
  const gatewayEvent = adaptCustomerServiceGatewayEvent(input);
  const diagnostic = diagnosticFromGatewayEvent(gatewayEvent);
  if (diagnostic) logGatewayDiagnostic(diagnostic);

  const dispatchResult = dispatchGatewayEvent(
    gatewayEvent,
    createCustomerServiceGatewayDispatchHandlers({
      ...callbacks,
      onHandlerError: (error) => {
        logGatewayDiagnostic(diagnosticFromDispatchError(error));
        callbacks.onHandlerError?.(error);
      },
    }),
  );

  if (
    dispatchResult.handled &&
    (gatewayEvent.kind === "cs.message.received" || gatewayEvent.kind === "cs.thread.changed")
  ) {
    logGatewayDiagnostic(diagnosticFromHandledGatewayEvent(gatewayEvent));
  }

  return dispatchResult.handled;
}
