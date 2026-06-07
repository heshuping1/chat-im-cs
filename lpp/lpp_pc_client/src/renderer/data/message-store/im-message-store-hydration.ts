import type { MessageItemDto } from "../api/types";

export type ImMessageHydrationSource = "server" | "hot" | "local" | "empty";

export interface LocalFirstMessagesInput {
  hotMessages?: MessageItemDto[];
  localLoading?: boolean;
  localMessages?: MessageItemDto[];
  serverError?: Error | null;
  serverLoading?: boolean;
  serverMessages?: MessageItemDto[];
}

export interface LocalFirstMessagesResult {
  hydrationSource: ImMessageHydrationSource;
  isLocalHydrated: boolean;
  messages: MessageItemDto[];
  messagesLoaded: boolean;
  messagesLoading: boolean;
  nonBlockingError?: Error;
}

export function imLocalMessagesQueryKey(
  scopeKey: string,
  conversationType: string,
  conversationId: string,
) {
  return [
    "pc-im-local-messages",
    scopeKey,
    conversationType,
    conversationId,
  ] as const;
}

export function resolveLocalFirstMessages(
  input: LocalFirstMessagesInput,
): LocalFirstMessagesResult {
  if (input.serverMessages !== undefined) {
    return result("server", input.serverMessages, {
      isLocalHydrated: false,
      messagesLoading: false,
    });
  }
  if (input.hotMessages !== undefined) {
    return result("hot", input.hotMessages, {
      isLocalHydrated: false,
      messagesLoading: false,
      nonBlockingError: input.serverError ?? undefined,
    });
  }
  if (input.localMessages && input.localMessages.length > 0) {
    return result("local", input.localMessages, {
      isLocalHydrated: true,
      messagesLoading: false,
      nonBlockingError: input.serverError ?? undefined,
    });
  }
  return result("empty", [], {
    isLocalHydrated: false,
    messagesLoaded: false,
    messagesLoading: Boolean(input.serverLoading || input.localLoading),
    nonBlockingError: input.serverError ?? undefined,
  });
}

function result(
  hydrationSource: ImMessageHydrationSource,
  messages: MessageItemDto[],
  options: {
    isLocalHydrated: boolean;
    messagesLoaded?: boolean;
    messagesLoading: boolean;
    nonBlockingError?: Error;
  },
): LocalFirstMessagesResult {
  return {
    hydrationSource,
    isLocalHydrated: options.isLocalHydrated,
    messages,
    messagesLoaded: options.messagesLoaded ?? true,
    messagesLoading: options.messagesLoading,
    ...(options.nonBlockingError ? { nonBlockingError: options.nonBlockingError } : {}),
  };
}
