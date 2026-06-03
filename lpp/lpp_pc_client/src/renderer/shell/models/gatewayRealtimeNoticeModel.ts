import type { GatewayRealtimeStatus } from "../../data/workspace-ui/workspace-ui-store";

export type GatewayRealtimeNotice = {
  kind: "offline";
  label: string;
  title: string;
};

export function gatewayRealtimeStatusNotice(
  status: GatewayRealtimeStatus,
): GatewayRealtimeNotice | null {
  if (status === "connected" || status === "idle") return null;
  if (status === "connecting" || status === "reconnecting" || status === "retrying") {
    return null;
  }
  return {
    kind: "offline",
    label: "实时连接异常",
    title: "消息长连接异常，消息可能延迟同步",
  };
}
