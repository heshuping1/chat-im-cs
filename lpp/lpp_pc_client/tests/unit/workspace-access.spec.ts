import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import type { ModuleKey } from "../../src/renderer/data/types";
import {
  derivePcWorkspaceAccess,
  normalizeActiveModuleForAccess,
} from "../../src/renderer/data/workspace-access";

const businessModules: ModuleKey[] = [
  "onlineService",
  "workbench",
  "ticketCenter",
  "dataCenter",
  "knowledgeBase",
  "aiAssistant",
];

describe("pc workspace access model", () => {
  it("keeps customer tenant members on default chat modules only", () => {
    const access = derivePcWorkspaceAccess({
      apiBaseUrl: "https://api.example",
      displayName: "客户",
      membershipRole: 0,
      tenantToken: "token",
      userType: 1,
    });

    expect(access).toMatchObject({
      canReadServiceWorkbench: false,
      identityKind: "customer",
      roleKind: "customer",
      settingsProfile: "customer",
    });
    expect(access.visibleModules).toEqual([
      "messages",
      "contacts",
      "enterpriseSwitch",
      "favorites",
      "settings",
    ]);
    for (const module of businessModules) {
      expect(access.visibleModules).not.toContain(module);
    }
  });

  it("keeps basic employees on default chat modules and opens service roles fully", () => {
    expect(
      derivePcWorkspaceAccess({
        apiBaseUrl: "https://api.example",
        displayName: "技术支持",
        membershipRole: 1,
        roleLabel: "技术支持",
        tenantToken: "token",
        userType: 2,
      }),
    ).toMatchObject({
      canReadServiceWorkbench: false,
      dataCenterView: undefined,
      identityKind: "employee",
      roleKind: "basic_employee",
    });

    const serviceAccess = derivePcWorkspaceAccess({
      apiBaseUrl: "https://api.example",
      displayName: "客服",
      membershipRole: 2,
      roleLabel: "客服",
      tenantToken: "token",
      userType: 2,
    });
    expect(serviceAccess.roleKind).toBe("customer_service");
    expect(serviceAccess.dataCenterView).toBe("self-service");
    expect(serviceAccess.canReadServiceWorkbench).toBe(true);
    for (const module of businessModules) {
      expect(serviceAccess.visibleModules).toContain(module);
    }
  });

  it("assigns admin and owner data center views", () => {
    expect(
      derivePcWorkspaceAccess({
        apiBaseUrl: "https://api.example",
        displayName: "管理员",
        membershipRole: 3,
        tenantToken: "token",
      }).dataCenterView,
    ).toBe("team-admin");

    expect(
      derivePcWorkspaceAccess({
        apiBaseUrl: "https://api.example",
        displayName: "所有者",
        membershipRole: 4,
        tenantToken: "token",
      }).dataCenterView,
    ).toBe("enterprise-owner");
  });

  it("falls back from hidden modules when a customer or basic employee switches accounts", () => {
    const customerAccess = derivePcWorkspaceAccess({
      apiBaseUrl: "https://api.example",
      displayName: "客户",
      membershipRole: 0,
      tenantToken: "token",
      userType: 1,
    });

    expect(normalizeActiveModuleForAccess("knowledgeBase", customerAccess)).toBe("messages");
    expect(normalizeActiveModuleForAccess("messages", customerAccess)).toBe("messages");
  });
});

describe("workspace access integration closure", () => {
  const appSource = readFileSync(resolve(process.cwd(), "src/renderer/App.tsx"), "utf8");
  const sidebarSource = readFileSync(
    resolve(process.cwd(), "src/renderer/components/Sidebar.tsx"),
    "utf8",
  );
  const mePageSource = readFileSync(
    resolve(process.cwd(), "src/renderer/components/MePage.tsx"),
    "utf8",
  );
  const composerSurfaceSource = readFileSync(
    resolve(
      process.cwd(),
      "src/renderer/messages/components/MessageComposerSurface.tsx",
    ),
    "utf8",
  );

  it("guards active modules and service workbench queries behind workspace access", () => {
    expect(appSource).toContain("normalizeActiveModuleForAccess");
    expect(sidebarSource).toContain("workspaceAccess.canReadServiceWorkbench");
    expect(sidebarSource).toContain("visiblePrimaryNavItems");
  });

  it("uses customer settings copy without customer-service-only reminders", () => {
    expect(mePageSource).toContain("settingsProfile");
    expect(mePageSource).toContain("客户设置");
    expect(mePageSource).toContain("visibleSettingSections");
    expect(mePageSource).not.toContain('label="在线客服排队提醒"');
    expect(mePageSource).not.toContain('label="SLA 超时提醒"');
  });

  it("hides knowledge and AI composer tools when modules are not visible", () => {
    expect(composerSurfaceSource).toContain("showKnowledgeTools");
    expect(composerSurfaceSource).toContain("showAiTools");
  });
});
