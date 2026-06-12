# APP Customer Service P0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add APP customer-service P0 read receipts, staff transfer, customer typing preview, and silent recall without changing ordinary IM semantics.

**Architecture:** Keep customer-service rules in `features/customer_service` domain/data/provider owners and reuse shared chat message rendering only after customer-service DTOs are normalized. Gateway raw events stay in `gateway_service.dart`, then route to customer-service reducers/providers; ordinary IM recall and 2-minute rules remain unchanged.

**Tech Stack:** Flutter/Dart, Riverpod 2, Dio, SignalR Gateway, SQLite-backed chat local data, `flutter_test`.

---

### Task 1: Documentation Gate

**Files:**
- Modify: `lpp/lpp_mobile/docs/requirements/01-APP端需求池.md`
- Modify: `lpp/lpp_mobile/docs/03-APP端功能矩阵.md`
- Modify: `lpp/lpp_mobile/docs/05-服务端支持.md`
- Modify: `lpp/lpp_mobile/docs/technical/02-消息与会话详细方案.md`

- [ ] **Step 1: Record the new P0 customer-service requirement**

Add `REQ-CS-004` to the requirement index with `需求状态=完成` and `设计状态=完成`, scoped to staff-side read receipts, transfer, typing preview, and silent recall. Mark continue-chat and monitor as related P1/P2 follow-up slices if they need separate APP surfaces.

- [ ] **Step 2: Update service contract references**

Add the 2026-06-10/06-11 API and Gateway contracts to `05-服务端支持.md`: `read-status`, `transfer`, `typing`, `recall-silent`, admin monitor read status, and `resumeRecentSession`.

- [ ] **Step 3: Update technical invariants**

In `technical/02-消息与会话详细方案.md`, add customer-service rules: silent recall removes the bubble; `silent=false` uses ordinary recall; customer typing preview has TTL and never exposes staff drafts to customers; temp-session and im-direct transfer use different endpoints; read receipt compares `conversationSeq`.

### Task 2: Customer-Service Domain Tests

**Files:**
- Create: `lpp/lpp_mobile/test/features/customer_service/domain/customer_service_realtime_models_test.dart`
- Create: `lpp/lpp_mobile/lib/features/customer_service/domain/customer_service_realtime_models.dart`

- [ ] **Step 1: Write failing tests**

Cover four pure behaviors:

```dart
test('silent recall removes messages while normal recall marks recalled', () {
  final messages = [message('m1'), message('m2')];
  expect(applyCustomerServiceRecall(messages, messageId: 'm1', silent: true), hasLength(1));
  expect(
    applyCustomerServiceRecall(messages, messageId: 'm1', silent: false).first.isRecalled,
    isTrue,
  );
});

test('typing preview ignores staff drafts and expires after ttl', () {
  expect(reduceCustomerServiceTypingPreview(event(senderRole: 'staff')), isNull);
  final preview = reduceCustomerServiceTypingPreview(event(senderRole: 'visitor', preview: ' hi '), now: now);
  expect(preview!.previewText, 'hi');
  expect(preview.isExpired(now.add(const Duration(seconds: 6))), isTrue);
});

test('transfer targets exclude current staff and non-service members', () {
  final targets = createCustomerServiceTransferTargets([...], currentUserId: 'me');
  expect(targets.map((target) => target.userId), ['staff-2']);
});

test('customer read status marks staff messages read by visitor seq', () {
  final next = applyCustomerServiceReadStatus(messages, currentUserId: 'staff-1', customerLastReadSeq: 2);
  expect(next.first.isReadByPeer, isTrue);
});
```

Run: `cd lpp/lpp_mobile && flutter test test/features/customer_service/domain/customer_service_realtime_models_test.dart`

Expected: FAIL because the domain file does not exist.

- [ ] **Step 2: Implement minimal pure domain code**

Add focused pure functions and small value types only; no Dio, Riverpod, Widget, storage, or UI text in this file.

- [ ] **Step 3: Run the tests**

Run: `cd lpp/lpp_mobile && flutter test test/features/customer_service/domain/customer_service_realtime_models_test.dart`

Expected: PASS.

### Task 3: Data Contracts and Gateway Event Normalization

**Files:**
- Modify: `lpp/lpp_mobile/lib/features/chat/data/datasources/gateway_service.dart`
- Modify: `lpp/lpp_mobile/lib/features/customer_service/data/datasources/customer_service_remote_datasource.dart`
- Modify: `lpp/lpp_mobile/lib/features/customer_service/data/repositories/customer_service_repository.dart`
- Test: `lpp/lpp_mobile/test/features/customer_service/domain/customer_service_realtime_models_test.dart`

- [ ] **Step 1: Add normalized event classes**

Add event classes for `CustomerServiceTypingEvent`, `CustomerServiceThreadTransferredEvent`, and extend read/recall events with `readAt` and `silent`.

- [ ] **Step 2: Register Gateway events**

Register `temp_session.typing`, `msg.typing`, `temp_session.transferred`, and `customer_service.thread.transferred`. Keep unknown fields ignored.

- [ ] **Step 3: Add repository methods**

Add:

```dart
Future<void> transferThread({
  required String threadType,
  required String threadId,
  required String toStaffUserId,
  String? reason,
});
Future<void> recallThreadMessageSilently(String messageId);
Future<void> sendTyping({
  required String threadType,
  required String threadId,
  required String preview,
});
Future<CustomerServiceReadStatus> getThreadReadStatus({
  required String threadType,
  required String threadId,
});
```

Map `temp_session` and `im_direct/direct_customer` to their documented endpoints.

### Task 4: Provider and Page Integration

**Files:**
- Modify: `lpp/lpp_mobile/lib/features/customer_service/presentation/providers/customer_service_providers.dart`
- Modify: `lpp/lpp_mobile/lib/features/chat/presentation/providers/gateway_provider.dart`
- Modify: `lpp/lpp_mobile/lib/features/chat/presentation/providers/chat_provider.dart`
- Modify: `lpp/lpp_mobile/lib/features/chat/presentation/pages/chat_page.dart`

- [ ] **Step 1: Apply customer-service read status**

When a customer-service detail/read-status is loaded, compare `customerLastReadSeq` or visitor member `lastReadSeq` with staff message `conversationSeq`; update only current staff messages.

- [ ] **Step 2: Show customer typing preview**

Store one preview per thread with a 5-second TTL. Display above the composer. Do not persist previews and do not show staff draft content to customers.

- [ ] **Step 3: Add transfer action**

Open a bottom sheet from customer-service chat header/actions, list service staff targets, allow optional reason, call transfer endpoint, then refresh workbench/thread.

- [ ] **Step 4: Add silent recall action**

For customer-service self sent server messages, call `recall-silent` and remove the message locally. Ordinary IM keeps the existing 2-minute `recall` behavior and recalled placeholder.

### Task 5: Verification

**Files:**
- Verify changed docs and Dart code.

- [ ] **Step 1: Run targeted tests**

Run: `cd lpp/lpp_mobile && flutter test test/features/customer_service/domain/customer_service_realtime_models_test.dart test/features/chat/domain/services/message_read_receipt_service_test.dart`

- [ ] **Step 2: Run static analysis if dependencies are available**

Run: `cd lpp/lpp_mobile && flutter analyze --no-fatal-infos`

- [ ] **Step 3: Record remaining manual verification**

Document that Android multi-account/Gateway real-event validation remains required for transfer notification, typing preview, silent recall replay, and monitor read status.

---

Plan self-review:

- Spec coverage: first implementation slice covers P0 read receipts, transfer, typing preview, and silent recall. Continue-chat and monitor are documented as next slices because they touch visitor-token and admin multi-window surfaces.
- Placeholder scan: no `TBD` or open-ended implementation steps.
- Type consistency: customer-service thread type names use canonical `temp_session` and `im_direct`, with `direct_customer` accepted as APP alias.
