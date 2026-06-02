import type { MessageReminderDiagnosticPayload } from '../shared/desktop-api.js';

export interface ReminderDiagnosticsTarget {
  fileName:
    | 'message-reminder.jsonl'
    | 'im-read.jsonl'
    | 'customer-service-reminder.jsonl'
    | 'gateway-health.jsonl'
    | 'message-delivery.jsonl'
    | 'message-gap-sync.jsonl';
  maxLines: number;
}

export function reminderDiagnosticsTarget(
  payload: MessageReminderDiagnosticPayload,
): ReminderDiagnosticsTarget {
  if (payload.event === 'gateway.health') {
    return { fileName: 'gateway-health.jsonl', maxLines: 1200 };
  }
  if (payload.event === 'gateway.push.received' || payload.event.startsWith('message.delivery')) {
    return { fileName: 'message-delivery.jsonl', maxLines: 1600 };
  }
  if (payload.event.startsWith('message.gap-sync')) {
    return { fileName: 'message-gap-sync.jsonl', maxLines: 800 };
  }
  if (isImReadDiagnostic(payload)) {
    return { fileName: 'im-read.jsonl', maxLines: 1200 };
  }
  if (isCustomerServiceReminderDiagnostic(payload)) {
    return { fileName: 'customer-service-reminder.jsonl', maxLines: 800 };
  }
  return { fileName: 'message-reminder.jsonl', maxLines: 800 };
}

function isImReadDiagnostic(payload: MessageReminderDiagnosticPayload) {
  if (payload.event.startsWith('im.')) return true;
  if (payload.event === 'gateway.event.received' || payload.event === 'gateway.event.routed') {
    const eventName = stringValue(payload.classification, 'eventName');
    if (eventName === 'msg.new' || eventName === 'msg.read') return true;
    return typeof payload.route === 'string' && payload.route.includes('im');
  }
  return false;
}

function isCustomerServiceReminderDiagnostic(payload: MessageReminderDiagnosticPayload) {
  if (payload.event.startsWith('cs.')) return true;
  if (payload.event === 'gateway.event.received' || payload.event === 'gateway.event.routed') {
    const eventName = stringValue(payload.classification, 'eventName');
    if (eventName && eventName.includes('customer')) return true;
    return typeof payload.route === 'string' && payload.route.includes('customer-service');
  }
  return false;
}

function stringValue(value: unknown, key: string) {
  if (!value || typeof value !== 'object') return '';
  const record = value as Record<string, unknown>;
  return typeof record[key] === 'string' ? record[key] : '';
}
