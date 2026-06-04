export type UserFacingErrorCode =
  | 'forbidden'
  | 'network'
  | 'tenantAlreadyMember'
  | 'unauthorized'
  | 'unknown';

export function errorMessageKey(code: string | null | undefined) {
  switch (normalizeUserFacingErrorCode(code)) {
    case 'network':
      return 'error.network';
    case 'unauthorized':
      return 'error.unauthorized';
    case 'forbidden':
      return 'error.forbidden';
    case 'tenantAlreadyMember':
      return 'error.tenantAlreadyMember';
    default:
      return 'error.unknown';
  }
}

function normalizeUserFacingErrorCode(code: string | null | undefined): UserFacingErrorCode {
  const normalized = code?.trim();
  if (!normalized) return 'unknown';
  if (normalized === 'network') return 'network';
  if (normalized === 'unauthorized') return 'unauthorized';
  if (normalized === 'forbidden') return 'forbidden';
  if (normalized === 'tenantAlreadyMember') return 'tenantAlreadyMember';
  return 'unknown';
}
