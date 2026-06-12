# APP Customer Service Role Boundaries Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align APP online customer service role boundaries with the PC implementation so staff, transferred staff, admin/owner supervisors, basic employees, and customers see only the actions they can actually use.

**Architecture:** Add pure customer-service domain models for role capabilities and action permissions. Providers and pages consume those decisions; raw membership role checks stay out of UI behavior. Admin monitor remains read-only and staff reception remains staff-only.

**Tech Stack:** Flutter, Dart, Riverpod, existing `customer_service` domain/data/presentation structure, `flutter_test`.

---

### Task 1: Domain Role Capabilities

**Files:**
- Create: `lpp/lpp_mobile/lib/features/customer_service/domain/customer_service_role_capabilities.dart`
- Test: `lpp/lpp_mobile/test/features/customer_service/domain/customer_service_role_capabilities_test.dart`

- [ ] Write tests for staff/admin/owner/customer/basic/unknown role capabilities.
- [ ] Run the test and confirm it fails because the domain file does not exist.
- [ ] Implement `CustomerServiceRoleCapabilities` and helpers.
- [ ] Run the test and confirm it passes.

### Task 2: Domain Action Permissions

**Files:**
- Modify: `lpp/lpp_mobile/lib/features/customer_service/domain/customer_service_role_capabilities.dart`
- Test: `lpp/lpp_mobile/test/features/customer_service/domain/customer_service_role_capabilities_test.dart`

- [ ] Write tests for queued, AI, serving, closed, admin-monitor, and customer contexts.
- [ ] Run the test and confirm missing action APIs fail.
- [ ] Implement `CustomerServiceActionPermission` and action decision helpers.
- [ ] Run the test and confirm it passes.

### Task 3: Wire Providers And Chat UI

**Files:**
- Modify: `lpp/lpp_mobile/lib/features/customer_service/presentation/providers/customer_service_providers.dart`
- Modify: `lpp/lpp_mobile/lib/features/chat/presentation/providers/gateway_provider.dart`
- Modify: `lpp/lpp_mobile/lib/features/chat/presentation/pages/chat_page.dart`

- [ ] Replace local staff/admin capability checks with domain decisions.
- [ ] Gate transfer, silent recall, composer send, claim/takeover, and monitor read-only behavior through action permissions.
- [ ] Keep ordinary IM recall and read receipt behavior unchanged.

### Task 4: Docs And Verification

**Files:**
- Modify: `lpp/lpp_mobile/docs/technical/02-消息与会话详细方案.md`
- Modify: `lpp/lpp_mobile/docs/05-服务端支持.md`
- Modify: `lpp/lpp_mobile/docs/03-APP端功能矩阵.md`

- [ ] Document the role matrix and supervisor read-only boundary.
- [ ] Run focused Flutter tests.
- [ ] Run `flutter analyze --no-fatal-infos`.
- [ ] Run on Android device `PENM00` and verify app launch plus reachable customer-service workbench surfaces.
