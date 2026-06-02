import { describe, expect, it } from "vitest";

import {
  resolveCustomerServiceCompatUnreadCandidate,
  resolveCustomerServiceEffectiveCompatUnread,
  resolveCustomerServiceOverlayUnread,
  resolveCustomerServiceThreadUnread,
} from "../../src/renderer/data/customer-service/customer-service-unread-ledger";

describe("customer service unread ledger", () => {
  it("increments visitor overlay unread but preserves unread for staff sends", () => {
    expect(
      resolveCustomerServiceOverlayUnread({
        previousUnread: 2,
        read: false,
        sameMessage: false,
        source: "gateway",
      }),
    ).toBe(3);

    expect(
      resolveCustomerServiceOverlayUnread({
        previousUnread: 2,
        read: false,
        sameMessage: false,
        source: "send",
      }),
    ).toBe(2);
  });

  it("dedupes the same gateway message without dropping existing unread below one", () => {
    expect(
      resolveCustomerServiceOverlayUnread({
        previousUnread: 3,
        read: false,
        sameMessage: true,
        source: "gateway",
      }),
    ).toBe(3);

    expect(
      resolveCustomerServiceOverlayUnread({
        previousUnread: 0,
        read: false,
        sameMessage: true,
        source: "gateway",
      }),
    ).toBe(1);
  });

  it("bounds unknown compat unread by seq window and local staff sends", () => {
    const decision = resolveCustomerServiceCompatUnreadCandidate({
      lastMessageSeq: 5,
      lastReadSeq: 1,
      localStaffSentSeqs: [3, 4],
      rawUnreadCount: 5,
      unreadCount: 5,
      unreadReason: "compat-unknown-suppressed",
    });

    expect(decision).toMatchObject({
      candidate: 2,
      staffSentAfterRead: 2,
      unreadReason: "compat-unknown-bounded",
      unreadWindow: 4,
    });
  });

  it("uses trusted compat unread without staff-send subtraction", () => {
    expect(
      resolveCustomerServiceCompatUnreadCandidate({
        lastMessageSeq: 5,
        lastReadSeq: 0,
        localStaffSentSeqs: [3, 4],
        trustedUnread: true,
        unreadCount: 5,
        unreadReason: "compat-inbound-trusted",
      }),
    ).toMatchObject({
      candidate: 5,
      trustedUnread: true,
      unreadReason: "compat-inbound-trusted",
    });
  });

  it("does not resurrect compat unread after read clear", () => {
    expect(
      resolveCustomerServiceEffectiveCompatUnread({
        candidate: 5,
        lastMessageId: "m-read",
        lastMessageSeq: 5,
        readMessageId: "m-read",
        readSeq: 5,
      }),
    ).toBe(0);
  });

  it("chooses one final unread source without adding counts together", () => {
    expect(
      resolveCustomerServiceThreadUnread({
        serverUnread: 3,
        overlayUnread: 2,
        compatUnreadCandidate: 5,
      }),
    ).toEqual({ reason: "server", unreadCount: 3 });

    expect(
      resolveCustomerServiceThreadUnread({
        serverUnread: 0,
        overlayUnread: 2,
        compatUnreadCandidate: 5,
      }),
    ).toEqual({ reason: "gatewayOverlay", unreadCount: 2 });

    expect(
      resolveCustomerServiceThreadUnread({
        serverUnread: 0,
        overlayUnread: 0,
        compatUnreadCandidate: 5,
      }),
    ).toEqual({ reason: "imListCompatCandidate", unreadCount: 5 });
  });
});
