# PC Customer Service Performance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the PC workbench customer-service performance entry to consume the new admin stats API, show role-aware team performance, and normalize acquisition/source fields without touching IM/Gateway/message core.

**Architecture:** Add typed API DTOs and an admin stats client method, keep React Query scoped by the existing session key, and move all formatting/channel interpretation into a focused customer-service presentation model. `WorkbenchPage` remains the UI assembly owner and renders the model with loading, empty, permission, and retry states.

**Tech Stack:** Electron + React + TypeScript + Vite + React Query + Vitest + lucide-react.

---

## File Structure

- Create: `src/renderer/customer-service/models/servicePerformanceModel.ts`
  - Owns stats normalization, role visibility, channel labels, KPI formatting, and source-platform explanation.
- Create: `tests/unit/service-performance-model.spec.ts`
  - TDD coverage for the model.
- Modify: `src/renderer/data/api/types.ts`
  - Adds stats and acquisition DTO interfaces.
- Modify: `src/renderer/data/api/endpoints.ts`
  - Adds `/api/admin/v1/customer-service/temp-sessions/stats`.
- Modify: `src/renderer/data/api/customer-service-client.ts`
  - Adds `getTempSessionStats()` using admin token.
- Modify: `src/renderer/data/query-keys.ts`
  - Adds `customerServiceTempSessionStats()`.
- Modify: `tests/unit/customer-service-client.spec.ts`
  - Adds admin stats request behavior test.
- Modify: `tests/unit/query-keys.spec.ts`
  - Adds stats key scope test.
- Modify: `src/renderer/components/WorkbenchPage.tsx`
  - Uses the model and query to render the upgraded performance panel.
- Modify: `src/renderer/styles/pages/workbench-knowledge.css`
  - Adds compact team performance styles.
- Modify: `src/renderer/i18n/messages/zh-CN.ts`
  - Adds visible strings for the new panel.
- Modify: `src/renderer/i18n/messages/zh-TW.ts`
  - Adds Traditional Chinese strings for the new panel.

## Task 1: Service Performance Model

**Files:**
- Create: `tests/unit/service-performance-model.spec.ts`
- Create: `src/renderer/customer-service/models/servicePerformanceModel.ts`

- [ ] **Step 1: Write failing model tests**

Use tests that assert:

```ts
const model = createServicePerformanceModel({
  stats: {
    totalSessions: 12,
    totalServed: 10,
    avgFirstResponseSeconds: 42,
    avgDurationSeconds: 360,
    channelDistribution: [{ label: "web", value: 7 }],
    staffPerformance: [
      {
        staffUserId: "staff-1",
        displayName: "Alice",
        sessionsServed: 9,
        avgFirstResponseSeconds: 30,
        avgDurationSeconds: 300,
        avgRating: 4.8,
        excellentRate: 0.92,
        byChannel: [
          { channel: "im_direct", sessionsServed: 4, avgFirstResponseSeconds: 24, avgDurationSeconds: 260, avgRating: 4.9, excellentRate: 0.95 },
          { channel: "widget", sessionsServed: 5, avgFirstResponseSeconds: 35, avgDurationSeconds: 330, avgRating: 4.7, excellentRate: 0.9 },
        ],
      },
    ],
  },
  translate: (key) => key,
});

expect(model.kpis[2].value).toBe("42s");
expect(model.staffRows[0].channelBreakdown.map((item) => item.channel)).toEqual(["widget", "im_direct"]);
expect(model.staffRows[0].excellentRate).toBe("92%");
```

- [ ] **Step 2: Run model test and verify RED**

Run:

```bash
npx vitest --configLoader runner run tests/unit/service-performance-model.spec.ts
```

Expected: FAIL because `servicePerformanceModel` does not exist.

- [ ] **Step 3: Implement minimal model**

Add:

```ts
export function canViewTeamServicePerformance(session?: { membershipRole?: number } | null) {
  return session?.membershipRole === 3 || session?.membershipRole === 4;
}

export function createServicePerformanceModel({ stats, translate }: CreateServicePerformanceModelInput): ServicePerformanceModel {
  return {
    isEmpty: !stats || stats.staffPerformance.length === 0,
    kpis: [...],
    channelDistribution: [...],
    channelDistributionHint: translate("workbench.performance.sourcePlatformHint"),
    staffRows: [...stats.staffPerformance].sort((a, b) => b.sessionsServed - a.sessionsServed).map(...),
  };
}
```

Use helper functions for seconds, rating, percent, and channel labels. Unknown or missing values return `"--"`; missing channel counts return `"0"`.

- [ ] **Step 4: Run model test and verify GREEN**

Run:

```bash
npx vitest --configLoader runner run tests/unit/service-performance-model.spec.ts
```

Expected: PASS.

## Task 2: Admin Stats API and Query Key

**Files:**
- Modify: `src/renderer/data/api/types.ts`
- Modify: `src/renderer/data/api/endpoints.ts`
- Modify: `src/renderer/data/api/customer-service-client.ts`
- Modify: `src/renderer/data/query-keys.ts`
- Modify: `tests/unit/customer-service-client.spec.ts`
- Modify: `tests/unit/query-keys.spec.ts`

- [ ] **Step 1: Write failing API/query tests**

Add a customer-service-client test:

```ts
it("loads temp-session stats through the admin API for owner workspaces", async () => {
  const client = new RecordingCustomerServiceApiClient({
    membershipRole: 4,
    tenantId: "tenant-1",
    response: { totalSessions: 1, staffPerformance: [] },
  });

  await expect(client.getTempSessionStats()).resolves.toMatchObject({ totalSessions: 1 });
  expect(client.requests).toEqual([
    { admin: true, path: "/api/admin/v1/customer-service/temp-sessions/stats" },
  ]);
});
```

Add a query key test:

```ts
expect(pcQueryKeys.customerServiceTempSessionStats("https://api.example.test", "tenant-token")).toEqual([
  "pc-cs-temp-session-stats",
  "https://api.example.test",
  "tenant-token",
]);
```

- [ ] **Step 2: Run API/query tests and verify RED**

Run:

```bash
npx vitest --configLoader runner run tests/unit/customer-service-client.spec.ts tests/unit/query-keys.spec.ts
```

Expected: FAIL because `getTempSessionStats` and `customerServiceTempSessionStats` do not exist.

- [ ] **Step 3: Implement API DTOs, endpoint, client method, query key**

Add DTOs:

```ts
export interface TempSessionAcquisitionDto { applicationId?: string | null; sourcePlatform?: string | null; ... }
export interface StaffChannelBreakdownDto { channel: "widget" | "im_direct" | string; sessionsServed: number; ... }
export interface TempStaffPerformanceDto { staffUserId: string; displayName: string; sessionsServed: number; byChannel?: StaffChannelBreakdownDto[]; ... }
export interface TempSessionStatsDto { totalSessions: number; totalServed: number; channelDistribution?: TempDistributionPointDto[]; staffPerformance?: TempStaffPerformanceDto[]; ... }
```

Add endpoint:

```ts
adminCustomerServiceTempSessionStats:
  "/api/admin/v1/customer-service/temp-sessions/stats",
```

Add client method:

```ts
async getTempSessionStats() {
  const adminToken = await this.issueAdminToken();
  this.options.adminToken = adminToken;
  return this.request<TempSessionStatsDto>(
    endpointPlan.adminCustomerServiceTempSessionStats,
    {},
    true,
  );
}
```

Add query key:

```ts
customerServiceTempSessionStats: (apiBaseUrl?: string, tenantToken?: string) =>
  ["pc-cs-temp-session-stats", ...sessionKey(apiBaseUrl, tenantToken)] as const,
```

- [ ] **Step 4: Run API/query tests and verify GREEN**

Run:

```bash
npx vitest --configLoader runner run tests/unit/customer-service-client.spec.ts tests/unit/query-keys.spec.ts
```

Expected: PASS.

## Task 3: Workbench UI

**Files:**
- Modify: `src/renderer/components/WorkbenchPage.tsx`
- Modify: `src/renderer/styles/pages/workbench-knowledge.css`
- Modify: `src/renderer/i18n/messages/zh-CN.ts`
- Modify: `src/renderer/i18n/messages/zh-TW.ts`

- [ ] **Step 1: Wire stats query and model**

In `WorkbenchPage`, compute:

```ts
const canViewTeamPerformance = canViewTeamServicePerformance(authSession);
const performanceQuery = useQuery({
  queryKey: pcQueryKeys.customerServiceTempSessionStats(...queryBaseKey),
  enabled: Boolean(client && canViewTeamPerformance),
  queryFn: async () => client!.getTempSessionStats(),
});
const performanceModel = createServicePerformanceModel({
  stats: performanceQuery.data,
  translate: t,
});
```

Pass `canViewTeamPerformance`, `performanceModel`, `performanceLoading`, `performanceError`, and `retryPerformance` into `WorkbenchDetail`.

- [ ] **Step 2: Render role-aware performance panel**

For `customer_service`, keep the personal status/current conversation panel and online service entry.

For `admin/owner`, render:

```tsx
<div className="workbench-performance-panel">
  <div className="workbench-performance-kpis">...</div>
  <section className="workbench-performance-distribution">...</section>
  <section className="workbench-performance-staff">...</section>
</div>
```

Show permission/loading/error/empty states via existing `EmptyBlock` and a compact retry button.

- [ ] **Step 3: Add compact styles and localized strings**

Add classes:

```css
.workbench-performance-panel { display: grid; gap: 12px; }
.workbench-performance-kpis { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.performance-staff-row { display: grid; gap: 8px; padding: 10px; border: 1px solid rgba(220,229,239,.9); border-radius: 12px; }
.performance-channel-breakdown { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; }
```

Add i18n keys under `workbench.performance.*` for title, source-platform hint, no permission, empty, retry, widget visitor, IM direct, first response, duration, rating, excellent rate.

## Task 4: Verification

**Files:**
- All modified implementation and test files.

- [ ] **Step 1: Run focused unit tests**

Run:

```bash
npx vitest --configLoader runner run tests/unit/service-performance-model.spec.ts tests/unit/customer-service-client.spec.ts tests/unit/query-keys.spec.ts
```

Expected: PASS.

- [ ] **Step 2: Run lint/core or quick fallback**

Run:

```bash
npm run lint:core
```

Expected: PASS. If lint finds unrelated existing failures, record exact failures and run the narrow affected tests instead.

- [ ] **Step 3: Run docs check**

Run:

```bash
npm run docs:check
```

Expected: PASS.

- [ ] **Step 4: Review diff boundaries**

Run:

```bash
git diff --name-only
```

Expected: only PC client files from this plan plus the already-approved spec/plan docs are touched by this task. No mobile, Gateway, IM send/read, local data, or API contract files are changed by implementation.
