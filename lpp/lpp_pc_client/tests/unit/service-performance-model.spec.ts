import { describe, expect, it } from "vitest";

import {
  canViewTeamServicePerformance,
  createServicePerformanceModel,
} from "../../src/renderer/customer-service/models/servicePerformanceModel";

const translate = (key: string) => key;

describe("service performance model", () => {
  it("allows only admin and owner roles to view team performance", () => {
    expect(canViewTeamServicePerformance({ membershipRole: 2 })).toBe(false);
    expect(canViewTeamServicePerformance({ membershipRole: 3 })).toBe(true);
    expect(canViewTeamServicePerformance({ membershipRole: 4 })).toBe(true);
    expect(canViewTeamServicePerformance(null)).toBe(false);
  });

  it("formats cross-channel staff performance with stable channel breakdown", () => {
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
              {
                channel: "im_direct",
                sessionsServed: 4,
                avgFirstResponseSeconds: 24,
                avgDurationSeconds: 260,
                avgRating: 4.9,
                excellentRate: 0.95,
              },
              {
                channel: "widget",
                sessionsServed: 5,
                avgFirstResponseSeconds: 35,
                avgDurationSeconds: 330,
                avgRating: 4.7,
                excellentRate: 0.9,
              },
            ],
          },
        ],
      },
      translate,
    });

    expect(model.isEmpty).toBe(false);
    expect(model.kpis.map((item) => item.value)).toEqual(["12", "10", "42s", "6m"]);
    expect(model.channelDistributionHint).toBe(
      "workbench.performance.sourcePlatformHint",
    );
    expect(model.channelDistribution).toEqual([{ label: "web", value: "7" }]);
    expect(model.staffRows[0]).toMatchObject({
      avgDuration: "5m",
      avgFirstResponse: "30s",
      avgRating: "4.8",
      displayName: "Alice",
      excellentRate: "92%",
      sessionsServed: "9",
      staffUserId: "staff-1",
    });
    expect(model.staffRows[0].channelBreakdown.map((item) => item.channel)).toEqual([
      "widget",
      "im_direct",
    ]);
    expect(model.staffRows[0].channelBreakdown.map((item) => item.sessionsServed)).toEqual([
      "5",
      "4",
    ]);
  });

  it("keeps missing stats empty without inventing business values", () => {
    const model = createServicePerformanceModel({ stats: undefined, translate });

    expect(model.isEmpty).toBe(true);
    expect(model.channelDistribution).toEqual([]);
    expect(model.staffRows).toEqual([]);
    expect(model.kpis.map((item) => item.value)).toEqual(["--", "--", "--", "--"]);
  });

  it("normalizes common staff performance aliases from admin stats responses", () => {
    const model = createServicePerformanceModel({
      stats: {
        totalSessions: 3,
        staff_daily_stats: [
          {
            staff_user_id: "staff-2",
            staff_name: "Bob",
            sessions_served: "3",
            avg_first_response_seconds: "45",
            avg_duration_seconds: 180,
            avg_rating: "4.6",
            excellent_rate: "0.8",
            by_channel: [
              {
                channel: "widget",
                sessions_served: "3",
                avg_first_response_seconds: 45,
              },
            ],
          },
        ],
      } as never,
      translate,
    });

    expect(model.isEmpty).toBe(false);
    expect(model.staffRows[0]).toMatchObject({
      avgDuration: "3m",
      avgFirstResponse: "45s",
      avgRating: "4.6",
      displayName: "Bob",
      excellentRate: "80%",
      sessionsServed: "3",
      staffUserId: "staff-2",
    });
    expect(model.staffRows[0].channelBreakdown[0].sessionsServed).toBe("3");
  });
});
