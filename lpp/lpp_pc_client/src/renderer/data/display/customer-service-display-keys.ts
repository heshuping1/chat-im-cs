export type DisplayCustomerServiceStatus = 'closed' | 'queueing' | 'serving' | 'unknown';

export function customerServiceStatusLabelKey(status: string | number | null | undefined) {
  switch (normalizeCustomerServiceStatus(status)) {
    case 'queueing':
      return 'customerService.status.queueing';
    case 'serving':
      return 'customerService.status.serving';
    case 'closed':
      return 'customerService.status.closed';
    default:
      return 'customerService.status.unknown';
  }
}

function normalizeCustomerServiceStatus(
  status: string | number | null | undefined,
): DisplayCustomerServiceStatus {
  const normalized = String(status ?? '').trim().toLowerCase();
  if (!normalized) return 'unknown';
  if (normalized === 'queueing' || normalized === 'queued' || normalized === 'waiting') {
    return 'queueing';
  }
  if (
    normalized === 'closed' ||
    normalized === 'archived' ||
    normalized.startsWith('closed') ||
    ['5', '6', '7', '8', '9'].includes(normalized)
  ) {
    return 'closed';
  }
  if (normalized === 'serving' || normalized === 'active' || normalized.includes('staff')) {
    return 'serving';
  }
  return 'unknown';
}
