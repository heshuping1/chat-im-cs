import type {
  GatewayDispatchError,
  GatewayDispatchHandlers,
} from "./gateway-dispatcher";
import { dispatchGatewayEvent } from "./gateway-dispatcher";
import { adaptGatewayEvent } from "./gateway-event-adapter";
import {
  diagnosticFromDispatchError,
  diagnosticFromGatewayEvent,
  diagnosticFromHandledGatewayEvent,
  logGatewayDiagnostic,
} from "./gateway-diagnostics";
import type {
  GatewayImMessageReceivedEvent,
  GatewayImReadReceivedEvent,
  GatewayRawEventInput,
} from "./gateway-event-types";

export interface ImGatewayHandlerCallbacks {
  onMessageReceived: (event: GatewayImMessageReceivedEvent) => void;
  onReadReceived: (event: GatewayImReadReceivedEvent) => void;
  onHandlerError?: (error: GatewayDispatchError) => void;
}

export function createImGatewayDispatchHandlers(
  callbacks: ImGatewayHandlerCallbacks,
): GatewayDispatchHandlers {
  return {
    onImMessageReceived: callbacks.onMessageReceived,
    onImReadReceived: callbacks.onReadReceived,
    onHandlerError: callbacks.onHandlerError,
  };
}

export function handleFirstStageImGatewayEvent(
  input: GatewayRawEventInput,
  callbacks: ImGatewayHandlerCallbacks,
) {
  const gatewayEvent = adaptGatewayEvent(input);
  const diagnostic = diagnosticFromGatewayEvent(gatewayEvent);
  if (diagnostic) logGatewayDiagnostic(diagnostic);
  const dispatchResult = dispatchGatewayEvent(
    gatewayEvent,
    createImGatewayDispatchHandlers({
      ...callbacks,
      onHandlerError: (error) => {
        logGatewayDiagnostic(diagnosticFromDispatchError(error));
        callbacks.onHandlerError?.(error);
      },
    }),
  );
  if (
    dispatchResult.handled &&
    (gatewayEvent.kind === "im.message.received" ||
      gatewayEvent.kind === "im.read.received")
  ) {
    logGatewayDiagnostic(diagnosticFromHandledGatewayEvent(gatewayEvent));
  }
  return dispatchResult.handled;
}
