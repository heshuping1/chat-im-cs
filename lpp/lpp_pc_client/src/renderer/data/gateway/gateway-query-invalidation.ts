import type { QueryClient } from "@tanstack/react-query";

export function invalidateImGatewayQueries(
  queryClient: QueryClient,
  conversationId?: string,
) {
  void queryClient.invalidateQueries({ queryKey: ["pc-im-conversations"] });
  if (conversationId) {
    void queryClient.invalidateQueries({
      predicate: (query) =>
        query.queryKey[0] === "pc-im-messages" &&
        query.queryKey.includes(conversationId),
    });
    return;
  }
  void queryClient.invalidateQueries({ queryKey: ["pc-im-messages"] });
}

export function invalidateCustomerServiceGatewayQueries(
  queryClient: QueryClient,
  threadId?: string,
) {
  void queryClient.invalidateQueries({ queryKey: ["pc-cs-workbench-threads"] });
  void queryClient.invalidateQueries({ queryKey: ["pc-cs-staff-service-history"] });
  void queryClient.invalidateQueries({ queryKey: ["pc-cs-reception-status"] });
  if (threadId) {
    void queryClient.invalidateQueries({
      predicate: (query) =>
        (query.queryKey[0] === "pc-cs-thread-detail" ||
          query.queryKey[0] === "pc-cs-thread-profile") &&
        query.queryKey.includes(threadId),
    });
    return;
  }
  void queryClient.invalidateQueries({ queryKey: ["pc-cs-thread-detail"] });
  void queryClient.invalidateQueries({ queryKey: ["pc-cs-thread-profile"] });
}

export function hasGatewayMessageQuery(queryClient: QueryClient, conversationId?: string) {
  if (!conversationId) return false;
  return (
    queryClient
      .getQueryCache()
      .findAll({
        predicate: (query) =>
          query.queryKey[0] === "pc-im-messages" &&
          query.queryKey.includes(conversationId),
      }).length > 0
  );
}
