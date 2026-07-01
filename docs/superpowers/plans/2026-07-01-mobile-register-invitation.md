# Mobile Register Invitation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the Flutter register flow support optional tenant code and optional invitation code, matching the PC invitation flow.

**Architecture:** The register page only collects and previews the optional join credential. AuthNotifier owns registration orchestration and applies invitation accept results into the existing tenant session path. Existing `PlatformTenantDataSource` remains the API owner for invitation preview and accept.

**Tech Stack:** Flutter, Riverpod, Dio, GoRouter, existing auth and space data sources.

---

### Task 1: Regression Tests

**Files:**
- Modify: `lpp/scripts/mobile/test/flutter/automated/auth/lpp_id_login_platform_test.dart`
- Modify: `lpp/lpp_mobile/test/features/startup/presentation/pages/startup_gate_timing_test.dart`

- [ ] Add a failing provider test proving `registerPlatform(..., invitationCode: "DD11D7976EDE33BB")` accepts the invitation after platform registration and applies the returned tenant session.
- [ ] Add a failing source test proving the register page passes an optional invitation code to `registerPlatform`.
- [ ] Run `flutter test ../scripts/mobile/test/flutter/automated/auth/lpp_id_login_platform_test.dart` and confirm the new test fails before implementation.

### Task 2: Auth Orchestration

**Files:**
- Modify: `lpp/lpp_mobile/lib/features/auth/domain/repositories/auth_repository.dart`
- Modify: `lpp/lpp_mobile/lib/features/auth/data/datasources/auth_remote_datasource.dart`
- Modify: `lpp/lpp_mobile/lib/features/auth/data/repositories/auth_repository_impl.dart`
- Modify: `lpp/lpp_mobile/lib/features/auth/presentation/providers/auth_provider.dart`

- [ ] Expose `acceptInvitation(code, platformToken)` through the auth repository by reusing the platform invitation endpoint shape.
- [ ] Add optional `invitationCode` to `registerPlatform`.
- [ ] After platform registration gets `platformToken`, accept the invitation and call existing tenant session application.
- [ ] Keep enterprise code registration unchanged.

### Task 3: Register UI

**Files:**
- Modify: `lpp/lpp_mobile/lib/features/auth/presentation/pages/register_page.dart`

- [ ] Rename the optional section to "企业码/邀请码".
- [ ] Detect long hex-style invitation codes and preview them via the existing platform invitation endpoint.
- [ ] Keep tenant code search and fallback behavior for tenant codes such as `mouse-corp`.
- [ ] Submit invitation code through platform registration; submit tenant code through enterprise registration.

### Task 4: Verification

**Commands:**
- `cd lpp/lpp_mobile && flutter test ../scripts/mobile/test/flutter/automated/auth/lpp_id_login_platform_test.dart`
- `cd lpp/lpp_mobile && flutter test test/features/startup/presentation/pages/startup_gate_timing_test.dart`
- `cd lpp/lpp_mobile && flutter analyze --no-fatal-infos lib/features/auth/presentation/pages/register_page.dart lib/features/auth/presentation/providers/auth_provider.dart lib/features/auth/data/datasources/auth_remote_datasource.dart lib/features/auth/data/repositories/auth_repository_impl.dart lib/features/auth/domain/repositories/auth_repository.dart`
- `cd lpp/lpp_mobile && flutter build apk --debug`
- `lpp/scripts/mobile/dev/install_all_android_devices.sh --debug --no-build --apk=/Users/treesoft/Downloads/lpp-flutte/lpp/lpp_mobile/build/app/outputs/flutter-apk/app-debug.apk`

### Task 5: Android True-Device Scenarios

**Device:** Android physical device via adb.

- [ ] Email register with no enterprise/invitation.
- [ ] Micro account register with no enterprise/invitation.
- [ ] Email register with tenant code `mouse-corp`.
- [ ] Micro account register with tenant code `mouse-corp`.
- [ ] Email register with invitation code `DD11D7976EDE33BB`.
- [ ] Record endpoint, status, server code, message, requestId, and screenshot paths.
