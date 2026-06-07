import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

import {
  hasGatewayMessageQuery,
  invalidateCustomerServiceGatewayQueries,
  invalidateImAvatarGatewayQueries,
  invalidateImGatewayQueries,
} from "../../src/renderer/data/gateway/gateway-query-invalidation";

describe("gateway query invalidation", () => {
  it("invalidates IM conversations and a scoped message query", () => {
    const queryClient = {
      invalidateQueries: vi.fn(),
    } as unknown as QueryClient;

    invalidateImGatewayQueries(queryClient, "conversation-1");

    expect(queryClient.invalidateQueries).toHaveBeenNthCalledWith(1, {
      queryKey: ["pc-im-conversations"],
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith(
      expect.objectContaining({
        predicate: expect.any(Function),
      }),
    );
  });

  it("keeps IM gateway invalidation inside the current workspace scope", () => {
    const queryClient = new QueryClient();
    const currentScope = "workspace|api|tenant|user|platform";
    const otherScope = "workspace|api|tenant|other-user|platform";
    queryClient.setQueryData(["pc-im-conversations", currentScope, 100], { items: [] });
    queryClient.setQueryData(["pc-im-conversations", otherScope, 100], { items: [] });
    queryClient.setQueryData(["pc-im-messages", currentScope, "direct", "conversation-1"], []);
    queryClient.setQueryData(["pc-im-messages", otherScope, "direct", "conversation-1"], []);

    invalidateImGatewayQueries(queryClient, "conversation-1", currentScope);

    expect(queryClient.getQueryCache().find({ queryKey: ["pc-im-conversations", currentScope, 100] })?.state.isInvalidated)
      .toBe(true);
    expect(queryClient.getQueryCache().find({ queryKey: ["pc-im-messages", currentScope, "direct", "conversation-1"] })?.state.isInvalidated)
      .toBe(true);
    expect(queryClient.getQueryCache().find({ queryKey: ["pc-im-conversations", otherScope, 100] })?.state.isInvalidated)
      .toBe(false);
    expect(queryClient.getQueryCache().find({ queryKey: ["pc-im-messages", otherScope, "direct", "conversation-1"] })?.state.isInvalidated)
      .toBe(false);
  });

  it("invalidates all customer service queries when no thread is scoped", () => {
    const queryClient = {
      invalidateQueries: vi.fn(),
    } as unknown as QueryClient;

    invalidateCustomerServiceGatewayQueries(queryClient);

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["pc-cs-workbench-threads"],
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["pc-cs-thread-detail"],
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["pc-cs-thread-profile"],
    });
  });

  it("detects whether a conversation message query is already cached", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["pc-im-messages", "conversation-1"], []);

    expect(hasGatewayMessageQuery(queryClient, "conversation-1")).toBe(true);
    expect(hasGatewayMessageQuery(queryClient, "conversation-2")).toBe(false);
  });

  it("invalidates current avatar sources for IM profile updates", () => {
    const queryClient = {
      invalidateQueries: vi.fn(),
    } as unknown as QueryClient;

    invalidateImAvatarGatewayQueries(queryClient);

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["pc-friends"] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["pc-tenant-members"] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["pc-user-profile"] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["pc-friend-profile-extra"] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["pc-group-members"] });
  });
});
