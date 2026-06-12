import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();
const srcRoot = join(repoRoot, "src");
const sourceExtensions = new Set([".ts", ".tsx", ".cts"]);
const rendererForbiddenRuntimeImports = new Set([
  "child_process",
  "electron",
  "fs",
  "node:child_process",
  "node:fs",
  "node:fs/promises",
  "node:path",
  "path",
]);

describe("architecture boundaries", () => {
  const files = listSourceFiles(srcRoot);

  it("keeps renderer isolated from main, preload and Node/Electron runtime modules", () => {
    const violations = files
      .filter((file) => isUnder(file, "src/renderer"))
      .flatMap((file) =>
        importsOf(file).flatMap((specifier) => {
          const resolvedImport = resolveImport(file, specifier);
          if (rendererForbiddenRuntimeImports.has(specifier)) {
            return [`${relative(file)} imports runtime module ${specifier}`];
          }
          if (
            resolvedImport &&
            (isUnder(resolvedImport, "src/main") || isUnder(resolvedImport, "src/preload"))
          ) {
            return [`${relative(file)} imports ${relative(resolvedImport)}`];
          }
          return [];
        }),
      );

    expect(violations).toEqual([]);
  });

  it("keeps main and preload independent from renderer modules", () => {
    const violations = files
      .filter((file) => isUnder(file, "src/main") || isUnder(file, "src/preload"))
      .flatMap((file) =>
        importsOf(file).flatMap((specifier) => {
          const resolvedImport = resolveImport(file, specifier);
          return resolvedImport && isUnder(resolvedImport, "src/renderer")
            ? [`${relative(file)} imports ${relative(resolvedImport)}`]
            : [];
        }),
      );

    expect(violations).toEqual([]);
  });

  it("keeps electron-log behind the main app logging facade", () => {
    const allowedImporter = "src/main/app-logging.ts";
    const violations = files.flatMap((file) =>
      importsOf(file).flatMap((specifier) =>
        specifier === "electron-log" || specifier.startsWith("electron-log/")
          ? relative(file) === allowedImporter
            ? []
            : [`${relative(file)} imports ${specifier} instead of using main app logging facade`]
          : [],
      ),
    );

    expect(violations).toEqual([]);
  });

  it("keeps shared modules free of renderer, main and preload dependencies", () => {
    const violations = files
      .filter((file) => isUnder(file, "src/shared"))
      .flatMap((file) =>
        importsOf(file).flatMap((specifier) => {
          const resolvedImport = resolveImport(file, specifier);
          return resolvedImport &&
            (isUnder(resolvedImport, "src/renderer") ||
              isUnder(resolvedImport, "src/main") ||
              isUnder(resolvedImport, "src/preload"))
            ? [`${relative(file)} imports ${relative(resolvedImport)}`]
            : [];
        }),
      );

    expect(violations).toEqual([]);
  });

  it("keeps preload exposure behind named minimal APIs", () => {
    const violations = files
      .filter((file) => isUnder(file, "src/preload"))
      .flatMap((file) => {
        const source = readFileSync(file, "utf8");
        return Array.from(source.matchAll(/exposeInMainWorld\((['"`])([^'"`]+)\1/g))
          .map((match) => match[2])
          .filter((apiName) => !["desktopApi", "screenshotSelector"].includes(apiName))
          .map((apiName) => `${relative(file)} exposes ${apiName}`);
      });

    expect(violations).toEqual([]);
  });

  it("keeps feature and page code away from the workspace backing store", () => {
    const guardedRoots = [
      "src/renderer/App.tsx",
      "src/renderer/main.tsx",
      "src/renderer/components",
      "src/renderer/customer-service",
      "src/renderer/messages",
      "src/renderer/settings",
    ];
    const violations = files
      .filter((file) => guardedRoots.some((root) => isUnder(file, root)))
      .flatMap((file) =>
        importsOf(file).flatMap((specifier) => {
          const resolvedImport = resolveImport(file, specifier);
          return resolvedImport &&
            relative(resolvedImport) ===
              "src/renderer/data/workspace-ui/workspace-store-core.ts"
            ? [`${relative(file)} imports workspace backing store directly`]
            : [];
        }),
      );

    expect(violations).toEqual([]);
  });

  it("keeps feature and page code away from API contract normalizers", () => {
    const guardedRoots = [
      "src/renderer/App.tsx",
      "src/renderer/main.tsx",
      "src/renderer/components",
      "src/renderer/customer-service",
      "src/renderer/messages",
      "src/renderer/settings",
    ];
    const forbiddenContracts = [
      "src/renderer/data/api-contract",
      "src/renderer/data/im-api-contract.ts",
      "src/renderer/data/im/im-conversation-contract.ts",
      "src/renderer/data/im/im-message-contract.ts",
      "src/renderer/data/customer-service/cs-contract.ts",
      "src/renderer/data/customer-service/cs-message-contract.ts",
    ];
    const violations = files
      .filter((file) => guardedRoots.some((root) => isUnder(file, root)))
      .flatMap((file) =>
        importsOf(file).flatMap((specifier) => {
          const resolvedImport = resolveImport(file, specifier);
          return resolvedImport &&
            forbiddenContracts.some((contractPath) => isUnder(resolvedImport, contractPath))
            ? [`${relative(file)} imports API contract normalizer ${relative(resolvedImport)}`]
            : [];
        }),
      );

    expect(violations).toEqual([]);
  });

  it("keeps API DTO types free of feature domain model imports", () => {
    const apiTypesPath = "src/renderer/data/api/types.ts";
    const apiTypesFile = join(repoRoot, apiTypesPath);
    const forbiddenTargets = [
      "src/renderer/customer-service",
      "src/renderer/messages",
      "src/renderer/components",
      "src/renderer/data/customer-service",
      "src/renderer/data/im-read",
      "src/renderer/data/send",
      "src/renderer/data/workspace-ui",
    ];
    const violations = importsOf(apiTypesFile).flatMap((specifier) => {
      const resolvedImport = resolveImport(apiTypesFile, specifier);
      return resolvedImport &&
        forbiddenTargets.some((target) => isUnder(resolvedImport, target))
        ? [`${apiTypesPath} imports feature domain model ${relative(resolvedImport)}`]
        : [];
    });

    expect(violations).toEqual([]);
  });

  it("keeps PanelState as a shared UI primitive", () => {
    const violations = files
      .filter((file) => isUnder(file, "src/renderer"))
      .filter((file) => relative(file) !== "src/renderer/components/PanelState.tsx")
      .flatMap((file) => {
        const source = readFileSync(file, "utf8");
        return /\bfunction\s+PanelState\b|\bconst\s+PanelState\s*=/.test(source)
          ? [`${relative(file)} defines local PanelState instead of reusing shared component`]
          : [];
      });

    expect(violations).toEqual([]);
  });

  it("keeps avatar fallback generation centralized in PcAvatar", () => {
    const violations = files
      .filter((file) => isUnder(file, "src/renderer"))
      .filter((file) => relative(file) !== "src/renderer/components/PcAvatar.tsx")
      .flatMap((file) => {
        const source = readFileSync(file, "utf8");
        return /\bfunction\s+avatarInitial\b|\bconst\s+avatarInitial\s*=/.test(source)
          ? [`${relative(file)} defines avatarInitial instead of reusing PcAvatar`]
          : [];
      });

    expect(violations).toEqual([]);
  });

  it("keeps desktop media IPC calls behind media runtime owners", () => {
    const allowedRoots = [
      "src/renderer/media/runtime",
      "src/renderer/messages/runtime",
    ];
    const mediaMethods =
      "copyMediaFile|saveMediaAs|openMediaFile|revealMediaInFolder|editMediaFile|cacheMediaFile|cacheLocalMediaFile|copyFilePath|copyImageFromUrl|openVideoPlayer|cacheMediaPoster";
    const directMediaIpcPattern = new RegExp(
      `\\b(?:window\\.)?desktopApi(?:\\?\\.)?\\.?(?:${mediaMethods})\\b`,
    );
    const violations = files
      .filter((file) => isUnder(file, "src/renderer"))
      .filter((file) => !allowedRoots.some((root) => isUnder(file, root)))
      .flatMap((file) => {
        const source = readFileSync(file, "utf8");
        return directMediaIpcPattern.test(source)
          ? [`${relative(file)} calls desktop media IPC outside runtime owner`]
          : [];
      });

    expect(violations).toEqual([]);
  });

  it("keeps cache adapter imports pinned to documented owners", () => {
    const cacheAdapterPaths = [
      "src/renderer/data/customer-service/cs-cache-adapter.ts",
      "src/renderer/messages/models/messageCacheMutationModel.ts",
    ];
    const allowedImporters = new Map([
      [
        "src/renderer/data/customer-service/cs-cache-adapter.ts",
        new Set([
          "src/renderer/components/ChatWorkspace.tsx",
          "src/renderer/components/GatewayBridge.tsx",
          "src/renderer/customer-service/hooks/useCustomerServiceIncomingNotifications.ts",
          "src/renderer/customer-service/hooks/useCustomerServiceSendController.ts",
          "src/renderer/customer-service/hooks/useCustomerServiceThreadLifecycle.ts",
          "src/renderer/customer-service/hooks/useCustomerServiceWorkspaceController.ts",
          "src/renderer/customer-service/models/customerServiceSessionNotesModel.ts",
          "src/renderer/customer-service/models/customerServiceThreadClaimModel.ts",
          "src/renderer/data/gateway/gateway-cs-side-effects.ts",
          "src/renderer/vite-env.d.ts",
        ]),
      ],
      [
        "src/renderer/messages/models/messageCacheMutationModel.ts",
        new Set([
          "src/renderer/messages/hooks/useImReadCommandExecutor.ts",
          "src/renderer/messages/hooks/useMessageActionMutations.ts",
          "src/renderer/messages/hooks/useMessageListData.ts",
          "src/renderer/messages/hooks/useMessageMediaSendController.ts",
          "src/renderer/messages/hooks/useMessageTextSendController.ts",
          "src/renderer/messages/models/groupReadReceiptCacheModel.ts",
        ]),
      ],
    ]);
    const violations = files
      .filter((file) => isUnder(file, "src/renderer"))
      .flatMap((file) =>
        importsOf(file).flatMap((specifier) => {
          const resolvedImport = resolveImport(file, specifier);
          if (!resolvedImport) return [];
          const importedPath = relative(resolvedImport);
          if (!cacheAdapterPaths.includes(importedPath)) return [];
          const importerPath = relative(file);
          if (allowedImporters.get(importedPath)?.has(importerPath)) return [];
          return [`${importerPath} imports cache owner ${importedPath}`];
        }),
      );

    expect(violations).toEqual([]);
  });

  it("keeps GatewayConnectionManager independent from business state owners", () => {
    const gatewayManagerPath =
      "src/renderer/data/gateway/gateway-connection-manager.ts";
    const forbiddenTargets = [
      "src/renderer/data/customer-service",
      "src/renderer/data/im-read",
      "src/renderer/data/send",
      "src/renderer/data/workspace-ui",
      "src/renderer/messages",
      "src/renderer/customer-service",
      "src/renderer/components",
    ];
    const managerFile = files.find((file) => relative(file) === gatewayManagerPath);
    const violations = managerFile
      ? importsOf(managerFile).flatMap((specifier) => {
          const resolvedImport = resolveImport(managerFile, specifier);
          return resolvedImport &&
            forbiddenTargets.some((target) => isUnder(resolvedImport, target))
            ? [`${gatewayManagerPath} imports business state owner ${relative(resolvedImport)}`]
            : [];
        })
      : [`${gatewayManagerPath} is missing`];

    expect(violations).toEqual([]);
  });

  it("keeps GatewayBridge away from direct read, ledger, badge and outbox owners", () => {
    const gatewayBridgePath = "src/renderer/components/GatewayBridge.tsx";
    const forbiddenTargets = [
      "src/renderer/data/customer-service/customer-service-badge-view.ts",
      "src/renderer/data/customer-service/customer-service-read-visibility.ts",
      "src/renderer/data/customer-service/customer-service-unread-ledger.ts",
      "src/renderer/data/im-read/im-conversation-read-view.ts",
      "src/renderer/data/send/chat-send-runtime.ts",
      "src/renderer/messages/models/messageCacheMutationModel.ts",
    ];
    const bridgeFile = files.find((file) => relative(file) === gatewayBridgePath);
    const violations = bridgeFile
      ? importsOf(bridgeFile).flatMap((specifier) => {
          const resolvedImport = resolveImport(bridgeFile, specifier);
          return resolvedImport &&
            forbiddenTargets.some((target) => relative(resolvedImport) === target)
            ? [`${gatewayBridgePath} imports direct business owner ${relative(resolvedImport)}`]
            : [];
        })
      : [`${gatewayBridgePath} is missing`];

    expect(violations).toEqual([]);
  });

  it("keeps SignalR gateway connection token-only without cross-origin credentials", () => {
    const gatewayBridgePath = "src/renderer/components/GatewayBridge.tsx";
    const source = readFileSync(join(repoRoot, gatewayBridgePath), "utf8");
    const withUrlOptions = source.match(
      /\.withUrl\(\s*gatewayUrl\.toString\(\),\s*\{(?<options>[\s\S]*?)\}\s*\)/,
    )?.groups?.options;

    expect(withUrlOptions).toBeTruthy();
    expect(withUrlOptions).toContain("accessTokenFactory");
    expect(withUrlOptions).toContain("withCredentials: false");
  });

  it("keeps renderer network requests from opting into cross-origin credentials", () => {
    const violations = files
      .filter((file) => isUnder(file, "src/renderer"))
      .flatMap((file) => {
        const source = readFileSync(file, "utf8");
        return /credentials\s*:\s*["']include["']/.test(source)
          ? [`${relative(file)} opts into cross-origin credentials`]
          : [];
      });

    expect(violations).toEqual([]);
  });

  it("keeps API anti-corruption requests token-only without browser credentials", () => {
    const apiBasePath = "src/renderer/data/api/base.ts";
    const source = readFileSync(join(repoRoot, apiBasePath), "utf8");

    expect(source).toContain("credentials: \"omit\"");
  });

  it("keeps gateway anti-corruption mappers from accepting legacy field aliases", () => {
    const mapperFiles = [
      "src/renderer/data/gateway/gateway-event-adapter.ts",
      "src/renderer/data/gateway/cs-gateway-event-adapter.ts",
    ];
    const forbiddenAliasPatterns = [
      /['"]conversation_id['"]/,
      /['"]chatId['"]/,
      /['"]chat_id['"]/,
      /['"]thread_id['"]/,
      /['"]message_id['"]/,
      /['"]msgId['"]/,
      /['"]msg_id['"]/,
      /['"]fromUserId['"]/,
      /['"]from_user_id['"]/,
      /['"]sender_id['"]/,
      /['"]is_mine['"]/,
      /['"]message_type['"]/,
    ];
    const violations = mapperFiles.flatMap((relativeFile) => {
      const file = join(repoRoot, relativeFile);
      const source = readFileSync(file, "utf8");
      return forbiddenAliasPatterns.flatMap((pattern) =>
        pattern.test(source)
          ? [`${relativeFile} accepts legacy alias matching ${pattern.source}`]
          : [],
      );
    });

    expect(violations).toEqual([]);
  });

  it("keeps conversation ownership resolver from guessing legacy aliases or business state", () => {
    const resolverPath = "src/renderer/data/gateway/conversation-ownership-resolver.ts";
    const resolverFile = join(repoRoot, resolverPath);
    const source = readFileSync(resolverFile, "utf8");
    const forbiddenAliasPatterns = [
      /['"]conversation_id['"]/,
      /['"]chatId['"]/,
      /['"]thread_id['"]/,
      /['"]session_id['"]/,
      /\bpayload\.temp_session\b/,
      /['"]message_info['"]/,
      /['"]direct_chat['"]/,
      /['"]group_chat['"]/,
    ];
    const aliasViolations = forbiddenAliasPatterns.flatMap((pattern) =>
      pattern.test(source)
        ? [`${resolverPath} guesses ownership through alias ${pattern.source}`]
        : [],
    );
    const importViolations = importsOf(resolverFile).flatMap((specifier) => {
      const resolvedImport = resolveImport(resolverFile, specifier);
      return resolvedImport &&
        [
          "src/renderer/data/customer-service/customer-service-unread-ledger.ts",
          "src/renderer/data/im-read/im-conversation-read-view.ts",
          "src/renderer/data/workspace-ui",
          "src/renderer/components",
        ].some((target) => isUnder(resolvedImport, target))
        ? [`${resolverPath} imports business state owner ${relative(resolvedImport)}`]
        : [];
    });

    expect([...aliasViolations, ...importViolations]).toEqual([]);
  });

  it("keeps MessageDeliveryService from accepting legacy aliases or direct read state owners", () => {
    const deliveryPath = "src/renderer/data/gateway/message-delivery-service.ts";
    const deliveryFile = join(repoRoot, deliveryPath);
    const source = readFileSync(deliveryFile, "utf8");
    const forbiddenAliasPatterns = [
      /['"]conversation_id['"]/,
      /['"]thread_id['"]/,
      /['"]sessionId['"]/,
      /['"]session_id['"]/,
      /['"]message_id['"]/,
      /['"]msgId['"]/,
      /['"]msg_id['"]/,
      /['"]messageSeq['"]/,
      /['"]message_seq['"]/,
    ];
    const aliasViolations = forbiddenAliasPatterns.flatMap((pattern) =>
      pattern.test(source)
        ? [`${deliveryPath} accepts legacy alias matching ${pattern.source}`]
        : [],
    );
    const importViolations = importsOf(deliveryFile).flatMap((specifier) => {
      const resolvedImport = resolveImport(deliveryFile, specifier);
      return resolvedImport &&
        [
          "src/renderer/data/customer-service/customer-service-unread-ledger.ts",
          "src/renderer/data/customer-service/customer-service-badge-view.ts",
          "src/renderer/data/im-read/im-conversation-read-view.ts",
          "src/renderer/data/workspace-ui",
          "src/renderer/components",
        ].some((target) => isUnder(resolvedImport, target))
        ? [`${deliveryPath} imports direct state owner ${relative(resolvedImport)}`]
        : [];
    });

    expect([...aliasViolations, ...importViolations]).toEqual([]);
  });

  it("keeps IM read view and customer-service unread ledger isolated", () => {
    const governedFiles = [
      "src/renderer/data/im-read/im-conversation-read-view.ts",
      "src/renderer/data/customer-service/customer-service-unread-ledger.ts",
      "src/renderer/data/customer-service/customer-service-read-visibility.ts",
      "src/renderer/data/customer-service/customer-service-badge-view.ts",
    ];
    const forbiddenByFile = new Map([
      [
        "src/renderer/data/im-read/im-conversation-read-view.ts",
        [
          "src/renderer/data/customer-service/customer-service-unread-ledger.ts",
          "src/renderer/data/customer-service/customer-service-read-visibility.ts",
          "src/renderer/data/customer-service/customer-service-badge-view.ts",
        ],
      ],
      [
        "src/renderer/data/customer-service/customer-service-unread-ledger.ts",
        ["src/renderer/data/im-read/im-conversation-read-view.ts"],
      ],
      [
        "src/renderer/data/customer-service/customer-service-read-visibility.ts",
        ["src/renderer/data/im-read/im-conversation-read-view.ts"],
      ],
      [
        "src/renderer/data/customer-service/customer-service-badge-view.ts",
        ["src/renderer/data/im-read/im-conversation-read-view.ts"],
      ],
    ]);
    const violations = governedFiles.flatMap((relativeFile) => {
      const file = join(repoRoot, relativeFile);
      return importsOf(file).flatMap((specifier) => {
        const resolvedImport = resolveImport(file, specifier);
        return resolvedImport &&
          (forbiddenByFile.get(relativeFile) ?? []).some(
            (target) => relative(resolvedImport) === target,
          )
          ? [`${relativeFile} imports isolated unread owner ${relative(resolvedImport)}`]
          : [];
      });
    });

    expect(violations).toEqual([]);
  });

  it("keeps ChatSendRuntime independent from read, reminder, delivery and UI owners", () => {
    const runtimePath = "src/renderer/data/send/chat-send-runtime.ts";
    const runtimeFile = join(repoRoot, runtimePath);
    const forbiddenTargets = [
      "src/renderer/data/customer-service/customer-service-unread-ledger.ts",
      "src/renderer/data/customer-service/customer-service-badge-view.ts",
      "src/renderer/data/customer-service/customer-service-read-visibility.ts",
      "src/renderer/data/gateway/message-delivery-service.ts",
      "src/renderer/data/im-read/im-conversation-read-view.ts",
      "src/renderer/data/reminder",
      "src/renderer/components",
      "src/renderer/messages",
    ];
    const violations = importsOf(runtimeFile).flatMap((specifier) => {
      const resolvedImport = resolveImport(runtimeFile, specifier);
      return resolvedImport &&
        forbiddenTargets.some((target) => isUnder(resolvedImport, target))
        ? [`${runtimePath} imports forbidden send-side owner ${relative(resolvedImport)}`]
        : [];
    });

    expect(violations).toEqual([]);
  });

  it("keeps GatewayEventRouter from writing IM or customer-service caches directly", () => {
    const routerPath = "src/renderer/data/gateway/gateway-event-router.ts";
    const routerFile = join(repoRoot, routerPath);
    const forbiddenTargets = [
      "src/renderer/data/customer-service/cs-cache-adapter.ts",
      "src/renderer/data/gateway/im-gateway-cache.ts",
      "src/renderer/messages/models/messageCacheMutationModel.ts",
    ];
    const violations = importsOf(routerFile).flatMap((specifier) => {
      const resolvedImport = resolveImport(routerFile, specifier);
      return resolvedImport &&
        forbiddenTargets.some((target) => relative(resolvedImport) === target)
        ? [`${routerPath} writes cache directly through ${relative(resolvedImport)}`]
        : [];
    });

    expect(violations).toEqual([]);
  });

  it("keeps page components from directly writing read, ledger or send outbox state", () => {
    const componentRoots = [
      "src/renderer/App.tsx",
      "src/renderer/main.tsx",
      "src/renderer/components",
    ];
    const forbiddenTargets = [
      "src/renderer/data/customer-service/customer-service-unread-ledger.ts",
      "src/renderer/data/send/send-outbox.ts",
      "src/renderer/data/send/chat-send-runtime.ts",
      "src/renderer/messages/models/messageCacheMutationModel.ts",
    ];
    const forbiddenReadStoreImportPattern =
      /\bimport\s+\{[^}]*\b(?:getImReadActions|selectMarkImConversationReadLocally|markImPeerReadReceipt)\b[^}]*\}\s+from\s+['"][^'"]*im-read-store['"]/;
    const violations = files
      .filter((file) => componentRoots.some((root) => isUnder(file, root)))
      .flatMap((file) => {
        const source = readFileSync(file, "utf8");
        const readStoreViolations = forbiddenReadStoreImportPattern.test(source)
          ? [`${relative(file)} imports IM read write actions directly`]
          : [];
        const importViolations = importsOf(file).flatMap((specifier) => {
          const resolvedImport = resolveImport(file, specifier);
          return resolvedImport &&
            forbiddenTargets.some((target) => relative(resolvedImport) === target)
            ? [`${relative(file)} imports direct state owner ${relative(resolvedImport)}`]
            : [];
        });
        return [...readStoreViolations, ...importViolations];
      });

    expect(violations).toEqual([]);
  });

  it("keeps UI components away from the persistent IM message store", () => {
    const componentRoots = [
      "src/renderer/App.tsx",
      "src/renderer/main.tsx",
      "src/renderer/components",
      "src/renderer/messages/components",
      "src/renderer/customer-service/components",
    ];
    const violations = files
      .filter((file) => componentRoots.some((root) => isUnder(file, root)))
      .flatMap((file) =>
        importsOf(file).flatMap((specifier) => {
          const resolvedImport = resolveImport(file, specifier);
          return resolvedImport && isUnder(resolvedImport, "src/renderer/data/message-store")
            ? [`${relative(file)} imports persistent IM message store ${relative(resolvedImport)}`]
            : [];
        }),
      );

    expect(violations).toEqual([]);
  });

  it("keeps runtime IM message query keys session-scoped", () => {
    const violations = files
      .filter((file) => isUnder(file, "src/renderer"))
      .flatMap((file) => {
        const source = readFileSync(file, "utf8");
        return source.includes("pcQueryKeys.imMessages(")
          ? [`${relative(file)} uses legacy token-scoped IM message query key`]
          : [];
      });

    expect(violations).toEqual([]);
  });

  it("keeps customer-service compat unread from becoming a final unread source", () => {
    const ledgerPath = "src/renderer/data/customer-service/customer-service-unread-ledger.ts";
    const source = readFileSync(join(repoRoot, ledgerPath), "utf8");
    const resolverBody = source.match(
      /export function resolveCustomerServiceThreadUnread\([\s\S]*?\n\}/,
    )?.[0] ?? "";

    expect(resolverBody).not.toContain("imListCompatCandidate");
    expect(resolverBody).not.toContain("compatUnreadCandidate > 0");
  });

  it("keeps message models independent from hooks and components", () => {
    const violations = files
      .filter((file) => isUnder(file, "src/renderer/messages/models"))
      .flatMap((file) =>
        importsOf(file).flatMap((specifier) => {
          const resolvedImport = resolveImport(file, specifier);
          return resolvedImport &&
            (isUnder(resolvedImport, "src/renderer/messages/hooks") ||
              isUnder(resolvedImport, "src/renderer/messages/components"))
            ? [`${relative(file)} imports presentation owner ${relative(resolvedImport)}`]
            : [];
        }),
      );

    expect(violations).toEqual([]);
  });

  it("keeps message models away from API runtime clients", () => {
    const violations = files
      .filter((file) => isUnder(file, "src/renderer/messages/models"))
      .flatMap((file) =>
        importsOf(file).flatMap((specifier) => {
          const resolvedImport = resolveImport(file, specifier);
          return resolvedImport &&
            relative(resolvedImport) === "src/renderer/data/runtime.ts"
            ? [`${relative(file)} imports API runtime client ${relative(resolvedImport)}`]
            : [];
        }),
      );

    expect(violations).toEqual([]);
  });

  it("keeps governed pages away from direct API clients", () => {
    const governedPages = new Set([
      "src/renderer/components/ChatWorkspace.tsx",
      "src/renderer/components/ContactsPage.tsx",
    ]);
    const forbiddenApiClients = new Set([
      "src/renderer/data/runtime.ts",
    ]);
    const violations = files
      .filter((file) => governedPages.has(relative(file)))
      .flatMap((file) =>
        importsOf(file).flatMap((specifier) => {
          const resolvedImport = resolveImport(file, specifier);
          return resolvedImport && forbiddenApiClients.has(relative(resolvedImport))
            ? [`${relative(file)} imports direct API client ${relative(resolvedImport)}`]
            : [];
        }),
      );

    expect(violations).toEqual([]);
  });

  it("keeps Sidebar from owning space switch transport or unread-summary parsing", () => {
    const sidebarSource = readFileSync(
      join(repoRoot, "src/renderer/components/Sidebar.tsx"),
      "utf8",
    );

    expect(sidebarSource).not.toContain("selectTenant(");
    expect(sidebarSource).not.toContain("selectPersonalSpace(");
    expect(sidebarSource).not.toContain("getPlatformSpaceUnreadSummary");
    expect(sidebarSource).not.toContain("PlatformSpaceUnreadSummaryDto");
  });

  it("keeps direct desktopApi calls pinned to documented owners", () => {
    const allowedDirectDesktopApiCallers = new Set([
      "src/renderer/data/app-instance/app-instance.ts",
      "src/renderer/data/api/api-traffic-diagnostics.ts",
      "src/renderer/data/auth/auth-session.ts",
      "src/renderer/data/customer-service/cs-routing-diagnostics.ts",
      "src/renderer/data/customer-service/cs-local-data-repository.ts",
      "src/renderer/data/logging/app-log.ts",
      "src/renderer/data/message-store/im-message-store.ts",
      "src/renderer/data/reminder/reminder-service.ts",
      "src/renderer/data/send/chat-send-runtime.ts",
      "src/renderer/data/workspace-ui/workspaceTrayStatusEffect.ts",
      "src/renderer/lib/openExternal.ts",
      "src/renderer/components/MePage.tsx",
      "src/renderer/components/Sidebar.tsx",
      "src/renderer/media/runtime/desktopMediaActions.ts",
      "src/renderer/media/runtime/imageMaterialization.ts",
      "src/renderer/media/runtime/imagePrecache.ts",
      "src/renderer/media/runtime/localMediaCache.ts",
      "src/renderer/media/runtime/mediaMaterialization.ts",
      "src/renderer/media/runtime/videoPosterRuntime.ts",
      "src/renderer/media/runtime/videoPlayer.ts",
      "src/renderer/messages/runtime/mediaActionCapabilities.ts",
      "src/renderer/messages/runtime/messageMediaActions.ts",
      "src/renderer/messages/runtime/messageMediaDesktopActions.ts",
      "src/renderer/messages/runtime/screenshotCapture.ts",
      "src/renderer/settings/components/HelpAboutSettingsSection.tsx",
      "src/renderer/settings/runtime/chatArchiveFileRuntime.ts",
      "src/renderer/settings/runtime/clientUpdateRuntime.ts",
      "src/renderer/settings/runtime/diagnosticsExport.ts",
    ]);
    const directDesktopApiPattern = /\b(?:window\.)?desktopApi(?:\?\.|\.)\w+/;
    const violations = files
      .filter((file) => isUnder(file, "src/renderer"))
      .flatMap((file) => {
        const relativeFile = relative(file);
        if (allowedDirectDesktopApiCallers.has(relativeFile)) return [];
        const source = readFileSync(file, "utf8");
        return directDesktopApiPattern.test(source)
          ? [`${relativeFile} calls desktopApi outside documented owner allowlist`]
          : [];
      });

    expect(violations).toEqual([]);
  });

  it("keeps message destructive confirmations behind the message runtime owner", () => {
    const allowedConfirmCallers = new Set([
      "src/renderer/messages/runtime/messageConfirm.ts",
    ]);
    const violations = files
      .filter((file) => isUnder(file, "src/renderer"))
      .flatMap((file) => {
        const relativeFile = relative(file);
        if (allowedConfirmCallers.has(relativeFile)) return [];
        const source = readFileSync(file, "utf8");
        return /\bwindow\.confirm\s*\(/.test(source)
          ? [`${relativeFile} calls window.confirm outside message confirmation runtime`]
          : [];
      });

    expect(violations).toEqual([]);
  });

  it("keeps data/main edge files documented in the responsibility exception ledger", () => {
    const responsibilityLedger = readFileSync(
      join(repoRoot, "docs/refactor/PC端P13职责审计任务清单.md"),
      "utf8",
    );
    const exceptionSection = responsibilityLedger.split("## 9. 职责例外清单")[1] ?? "";
    const violations = files
      .filter((file) => isUnder(file, "src/main") || isUnder(file, "src/renderer/data"))
      .filter((file) => lineCount(file) >= 450)
      .flatMap((file) => {
        const relativeFile = relative(file);
        const rowPattern = new RegExp(
          `\\| \`${escapeRegExp(relativeFile)}\` \\| [^|]+ \\| [^|]+ \\| [^|]+ \\| [^|]+ \\|`,
        );
        return rowPattern.test(exceptionSection)
          ? []
          : [`${relativeFile} is >=450 lines but missing owner/reason/trigger validation in responsibility exception ledger`];
      });

    expect(violations).toEqual([]);
  });

  it("keeps P19 AI context budget and routing governance recoverable", () => {
    const requiredFiles = [
      "docs/refactor/PC端P19文件职责与AI上下文治理清单.md",
      "docs/refactor/PC端AI文件路由表.md",
      "scripts/report-p19-context-health.mjs",
    ];
    const missingFiles = requiredFiles.filter((file) => !existsSync(join(repoRoot, file)));
    expect(missingFiles).toEqual([]);

    const ledger = readFileSync(join(repoRoot, requiredFiles[0]), "utf8");
    const routeTable = readFileSync(join(repoRoot, requiredFiles[1]), "utf8");
    const requiredLedgerTerms = [
      "AI 上下文预算线",
      "过碎文件审查结论",
      "`src/renderer/components/MessageBodyView.tsx`",
      "`src/renderer/messages/components/message-content/MessageMediaParts.tsx`",
    ];
    const requiredRouteTerms = [
      "普通 IM 页面装配",
      "在线客服工作台",
      "Gateway 事件",
      "Electron IPC/preload",
      "CSS 消息",
    ];

    expect(requiredLedgerTerms.filter((term) => !ledger.includes(term))).toEqual([]);
    expect(requiredRouteTerms.filter((term) => !routeTable.includes(term))).toEqual([]);
  });
});

function listSourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const filePath = join(dir, entry);
    const stat = statSync(filePath);
    if (stat.isDirectory()) return listSourceFiles(filePath);
    return sourceExtensions.has(extname(filePath)) ? [filePath] : [];
  });
}

function importsOf(file: string) {
  const source = readFileSync(file, "utf8");
  const imports = new Set<string>();
  for (const match of source.matchAll(/\bimport\s+(?:type\s+)?(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]/g)) {
    imports.add(match[1]);
  }
  for (const match of source.matchAll(/\bimport\(\s*['"]([^'"]+)['"]\s*\)/g)) {
    imports.add(match[1]);
  }
  for (const match of source.matchAll(/\brequire\(\s*['"]([^'"]+)['"]\s*\)/g)) {
    imports.add(match[1]);
  }
  return [...imports];
}

function resolveImport(file: string, specifier: string) {
  if (!specifier.startsWith(".")) return null;
  const base = resolve(dirname(file), specifier);
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.cts`,
    `${base}.js`,
    `${base}.jsx`,
    join(base, "index.ts"),
    join(base, "index.tsx"),
  ];
  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

function isUnder(file: string, segment: string) {
  const normalizedFile = normalize(file);
  return normalizedFile.startsWith(join(repoRoot, segment));
}

function relative(file: string) {
  const normalizedRoot = normalize(repoRoot);
  return normalize(file)
    .replace(`${normalizedRoot}\\`, "")
    .replace(`${normalizedRoot}/`, "")
    .replace(/\\/g, "/");
}

function lineCount(file: string) {
  return readFileSync(file, "utf8").split(/\r?\n/).length;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
