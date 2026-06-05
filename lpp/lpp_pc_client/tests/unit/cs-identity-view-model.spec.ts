import { describe, expect, it } from "vitest";

import type {
  CustomerProfileCard,
  CustomerServiceThread,
} from "../../src/renderer/data/api/types";
import { createCustomerServiceIdentityViewModel } from "../../src/renderer/data/customer-service/cs-identity-view-model";

describe("customer service identity view model", () => {
  it("prefers profile identity before thread identity", () => {
    const identity = createCustomerServiceIdentityViewModel({
      profile: {
        avatarUrl: "profile.png",
        customerName: "Profile customer",
        displayName: "Profile display",
        isVip: true,
      } satisfies CustomerProfileCard,
      thread: thread({
        avatarUrl: "thread.png",
        customerAvatarUrl: "customer.png",
        isVip: false,
        title: "Thread title",
      }),
    });

    expect(identity).toEqual({
      ariaName: "Profile display",
      avatarName: "Profile display",
      avatarTone: "gold",
      avatarUrl: "profile.png",
      displayName: "Profile display",
      isVip: true,
    });
  });

  it("falls back to customer avatar, thread avatar and stable default names", () => {
    expect(
      createCustomerServiceIdentityViewModel({
        thread: thread({ customerAvatarUrl: "customer.png", title: "历史会话 #1" }),
      }),
    ).toMatchObject({
      avatarTone: "indigo",
      avatarUrl: "customer.png",
      displayName: "customerService.threadList.unknownCustomer",
    });

    expect(createCustomerServiceIdentityViewModel({ history: true })).toMatchObject({
      avatarName: "customerService.visitor",
      displayName: "customerService.visitor",
    });
  });
});

function thread(overrides: Partial<CustomerServiceThread> = {}): CustomerServiceThread {
  return {
    conversationId: "thread-1",
    status: "queued",
    threadId: "thread-1",
    threadType: "temp_session",
    title: "Visitor",
    unreadCount: 0,
    ...overrides,
  };
}
