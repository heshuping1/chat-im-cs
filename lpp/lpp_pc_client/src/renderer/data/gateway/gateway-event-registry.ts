import type { CustomerServiceGatewayChangeKind } from "./gateway-event-types";

export const imMessageEventNames = [
  "msg.new",
  "message.new",
  "message.created",
  "chat.message",
  "chat.message.new",
  "im.message",
  "im.message.new",
] as const;

export const imReadEventNames = ["msg.read"] as const;

export const forceLogoutEventNames = [
  "auth.force_logout",
  "auth.session.revoked",
  "auth.device.kicked",
  "auth.password.changed",
  "auth.security.required",
  "auth.reuse.detected",
] as const;

export const customerServiceMessageEventNames = [
  "temp_session.message",
  "temp_session.message.new",
  "temp_session.message.created",
  "customer_service.message",
  "customer_service.message.new",
  "customer_service.message.created",
  "customer_service.thread.message",
] as const;

export const customerServiceQueueEventNames = [
  "temp_session.created",
  "temp_session.queued",
  "temp_session.waiting",
  "customer_service.queued",
  "customer_service.waiting",
  "customer_service.queue.created",
  "customer_service.queue.updated",
  "customer_service.thread.created",
  "customer_service.thread.queued",
] as const;

export const customerServiceLifecycleEventNames = [
  "temp_session.assigned",
  "temp_session.closed",
  "temp_session.rated",
  "customer_service.assigned",
  "customer_service.status_changed",
  "customer_service.auto_status_changed",
  "customer_service.staff.status_changed",
  "customer_service.staff.auto_offline",
  "customer_service.sla.warning",
  "customer_service.sla.breached",
] as const;

export const customerServiceTypingEventNames = [
  "temp_session.typing",
  "customer_service.typing",
  "customer_service.thread.typing",
] as const;

export const tenantJoinRequestEventNames = [
  "tenant.join_request.reviewed",
  "tenant.join_request.approved",
  "tenant.join_request.cancelled",
] as const;

export const gatewayEvents = [
  ...imMessageEventNames,
  ...imReadEventNames,
  "msg.recalled",
  "msg.typing",
  "space.notice",
  ...customerServiceQueueEventNames,
  ...customerServiceMessageEventNames,
  ...customerServiceLifecycleEventNames,
  ...customerServiceTypingEventNames,
  "friend.request.created",
  "friend.request.accepted",
  "friend.request.rejected",
  "friend.profile.updated",
  "presence.changed",
  ...tenantJoinRequestEventNames,
  ...forceLogoutEventNames,
] as const;

export const customerServiceThreadEventKinds = new Map<
  string,
  CustomerServiceGatewayChangeKind
>([
  ["temp_session.created", "thread_created"],
  ["temp_session.queued", "thread_queued"],
  ["temp_session.waiting", "thread_queued"],
  ["customer_service.queued", "thread_queued"],
  ["customer_service.waiting", "thread_queued"],
  ["customer_service.queue.created", "queue_created"],
  ["customer_service.queue.updated", "queue_created"],
  ["customer_service.thread.created", "thread_created"],
  ["customer_service.thread.queued", "thread_queued"],
  ["temp_session.assigned", "thread_assigned"],
  ["temp_session.closed", "thread_closed"],
  ["temp_session.rated", "thread_rated"],
  ["customer_service.assigned", "thread_assigned"],
  ["customer_service.status_changed", "thread_status_changed"],
  ["customer_service.auto_status_changed", "thread_status_changed"],
  ["customer_service.staff.status_changed", "staff_status_changed"],
  ["customer_service.staff.auto_offline", "staff_status_changed"],
  ["customer_service.sla.warning", "sla_warning"],
  ["customer_service.sla.breached", "sla_breached"],
]);

const imMessageEventNameSet = new Set<string>(imMessageEventNames);
const imReadEventNameSet = new Set<string>(imReadEventNames);
const forceLogoutEventNameSet = new Set<string>(forceLogoutEventNames);
const customerServiceMessageEventNameSet = new Set<string>(
  customerServiceMessageEventNames,
);
const customerServiceQueueEventNameSet = new Set<string>(
  customerServiceQueueEventNames,
);
const customerServiceLifecycleEventNameSet = new Set<string>(
  customerServiceLifecycleEventNames,
);
const customerServiceTypingEventNameSet = new Set<string>(
  customerServiceTypingEventNames,
);
const tenantJoinRequestEventNameSet = new Set<string>(tenantJoinRequestEventNames);

export function isImMessageEventName(eventName: string) {
  return imMessageEventNameSet.has(eventName);
}

export function isImReadEventName(eventName: string) {
  return imReadEventNameSet.has(eventName);
}

export function isForceLogoutEventName(eventName: string) {
  return forceLogoutEventNameSet.has(eventName);
}

export function isCustomerServiceMessageEventName(eventName: string) {
  return customerServiceMessageEventNameSet.has(eventName);
}

export function isCustomerServiceQueueEventName(eventName: string) {
  return customerServiceQueueEventNameSet.has(eventName);
}

export function isCustomerServiceLifecycleEventName(eventName: string) {
  return customerServiceLifecycleEventNameSet.has(eventName);
}

export function isCustomerServiceTypingEventName(eventName: string) {
  return customerServiceTypingEventNameSet.has(eventName);
}

export function isTenantJoinRequestEventName(eventName: string) {
  return tenantJoinRequestEventNameSet.has(eventName);
}
