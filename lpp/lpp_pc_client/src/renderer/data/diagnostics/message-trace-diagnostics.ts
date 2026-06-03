import { recordMessageReminderDiagnostic } from "./message-reminder-diagnostics";

export type MessageTraceOwner = "im" | "customerService" | "unknown";
export type MessageTraceSourceChannel = "gateway" | "http-query" | "send";

export type MessageTraceStage =
  | "send.compose.submit"
  | "send.local_echo.written"
  | "send.http.start"
  | "send.http.done"
  | "send.http.failed"
  | "send.server_ack.observed"
  | "receive.gateway.observed"
  | "receive.cache.written"
  | "receive.ui.observed"
  | "receive.paint.observed"
  | "query.message.discovered";

export interface MessageTraceEventInput {
  clientMsgId?: string;
  conversationId?: string;
  conversationSeq?: number;
  conversationType?: string;
  messageId?: string;
  owner?: MessageTraceOwner;
  route: string;
  serverSentAt?: string;
  source: string;
  sourceChannel: MessageTraceSourceChannel;
  stage: MessageTraceStage;
  threadId?: string;
  traceId?: string;
}

export interface MessageTraceSample {
  at: string;
  clientMsgId?: string;
  conversationId?: string;
  conversationSeq?: number;
  conversationType?: string;
  durationFromPreviousMs?: number;
  latencyMs?: number;
  messageId?: string;
  owner: MessageTraceOwner;
  route: string;
  serverSentAt?: string;
  sourceChannel: MessageTraceSourceChannel;
  stage: MessageTraceStage;
  threadId?: string;
  traceId: string;
}

export interface MessageTraceGroupSummary {
  cacheWriteMs?: number;
  clientMsgId?: string;
  firstAt: string;
  gatewayToCacheMs?: number;
  gatewayToUiMs?: number;
  lastAt: string;
  messageId?: string;
  owner: MessageTraceOwner;
  queryDiscoveredAt?: string;
  receiveRoute?: string;
  sendHttpMs?: number;
  sendToAckMs?: number;
  serverToGatewayMs?: number;
  stages: MessageTraceSample[];
  traceId: string;
}

const maxSamples = 500;
const recentSamples: MessageTraceSample[] = [];
const lastAtByTrace = new Map<string, number>();

export function recordMessageTraceEvent(input: MessageTraceEventInput) {
  const at = new Date().toISOString();
  const traceId = input.traceId || input.clientMsgId || input.messageId || input.conversationId;
  if (!traceId) return;
  const atMs = Date.parse(at);
  const previousAtMs = lastAtByTrace.get(traceId);
  lastAtByTrace.set(traceId, atMs);
  const sample: MessageTraceSample = {
    at,
    clientMsgId: input.clientMsgId,
    conversationId: input.conversationId,
    conversationSeq: input.conversationSeq,
    conversationType: input.conversationType,
    durationFromPreviousMs:
      previousAtMs && Number.isFinite(previousAtMs)
        ? Math.max(0, atMs - previousAtMs)
        : undefined,
    latencyMs: sourceLatencyMs(input.serverSentAt, at),
    messageId: input.messageId,
    owner: input.owner ?? "unknown",
    route: input.route,
    serverSentAt: input.serverSentAt,
    sourceChannel: input.sourceChannel,
    stage: input.stage,
    threadId: input.threadId,
    traceId,
  };

  recentSamples.push(sample);
  while (recentSamples.length > maxSamples) {
    recentSamples.shift();
  }

  recordMessageReminderDiagnostic({
    event: "message.trace",
    source: input.source,
    phase: input.stage,
    route: input.route,
    classification: {
      clientMsgId: input.clientMsgId,
      conversationId: input.conversationId,
      conversationSeq: input.conversationSeq,
      conversationType: input.conversationType,
      messageId: input.messageId,
      owner: input.owner ?? "unknown",
      sourceChannel: input.sourceChannel,
      threadId: input.threadId,
      traceId,
    },
    summary: {
      clientObservedAt: at,
      durationFromPreviousMs: sample.durationFromPreviousMs,
      latencyMs: sample.latencyMs,
      serverSentAt: input.serverSentAt,
    },
  });
}

export function getRecentMessageTraceSamples(limit = 20): MessageTraceSample[] {
  return recentSamples.slice(-limit).reverse();
}

export function summarizeRecentMessageTraceGroups(
  samples: MessageTraceSample[] = recentSamples,
  limit = 8,
): MessageTraceGroupSummary[] {
  const groups = new Map<string, MessageTraceSample[]>();
  for (const sample of samples) {
    const stages = groups.get(sample.traceId) ?? [];
    stages.push(sample);
    groups.set(sample.traceId, stages);
  }
  return [...groups.entries()]
    .map(([traceId, stages]) => summarizeGroup(traceId, stages))
    .sort((left, right) => {
      const priorityDelta = traceGroupPriority(right) - traceGroupPriority(left);
      if (priorityDelta) return priorityDelta;
      return Date.parse(right.lastAt) - Date.parse(left.lastAt);
    })
    .slice(0, limit);
}

export function messageTraceStageLabel(stage: MessageTraceStage) {
  switch (stage) {
    case "send.compose.submit":
      return "提交发送";
    case "send.local_echo.written":
      return "本地显示";
    case "send.http.start":
      return "发送请求开始";
    case "send.http.done":
      return "发送请求完成";
    case "send.http.failed":
      return "发送失败";
    case "send.server_ack.observed":
      return "服务端确认";
    case "receive.gateway.observed":
      return "长连接收到";
    case "receive.cache.written":
      return "写入本机缓存";
    case "receive.ui.observed":
      return "窗口状态收到";
    case "receive.paint.observed":
      return "窗口绘制完成";
    case "query.message.discovered":
      return "主动查询发现";
  }
}

function summarizeGroup(traceId: string, stages: MessageTraceSample[]): MessageTraceGroupSummary {
  const sorted = [...stages].sort((left, right) => Date.parse(left.at) - Date.parse(right.at));
  const first = sorted[0];
  const gateway = firstStage(sorted, "receive.gateway.observed");
  const cache = firstStage(sorted, "receive.cache.written");
  const ui = firstStage(sorted, "receive.ui.observed");
  const httpStart = firstStage(sorted, "send.http.start");
  const httpDone = firstStage(sorted, "send.http.done");
  const submit = firstStage(sorted, "send.compose.submit");
  const ack = firstStage(sorted, "send.server_ack.observed");
  return {
    cacheWriteMs: cache?.durationFromPreviousMs,
    clientMsgId: first.clientMsgId,
    firstAt: first.at,
    gatewayToCacheMs: elapsedMs(gateway?.at, cache?.at),
    gatewayToUiMs: elapsedMs(gateway?.at, ui?.at),
    lastAt: sorted[sorted.length - 1].at,
    messageId: first.messageId ?? sorted.find((sample) => sample.messageId)?.messageId,
    owner: first.owner,
    queryDiscoveredAt: firstStage(sorted, "query.message.discovered")?.at,
    receiveRoute: gateway?.route ?? firstStage(sorted, "query.message.discovered")?.route,
    sendHttpMs: elapsedMs(httpStart?.at, httpDone?.at),
    sendToAckMs: elapsedMs(submit?.at, ack?.at),
    serverToGatewayMs: gateway?.latencyMs,
    stages: sorted,
    traceId,
  };
}

function firstStage(samples: MessageTraceSample[], stage: MessageTraceStage) {
  return samples.find((sample) => sample.stage === stage);
}

function traceGroupPriority(group: MessageTraceGroupSummary) {
  return group.stages.some((sample) => sample.sourceChannel !== "http-query") ? 1 : 0;
}

function elapsedMs(startAt: string | undefined, endAt: string | undefined) {
  if (!startAt || !endAt) return undefined;
  const start = Date.parse(startAt);
  const end = Date.parse(endAt);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return undefined;
  return Math.max(0, end - start);
}

function sourceLatencyMs(serverSentAt: string | undefined, clientObservedAt: string) {
  if (!serverSentAt) return undefined;
  const serverTime = Date.parse(serverSentAt);
  const clientTime = Date.parse(clientObservedAt);
  if (!Number.isFinite(serverTime) || !Number.isFinite(clientTime)) return undefined;
  return Math.max(0, clientTime - serverTime);
}
