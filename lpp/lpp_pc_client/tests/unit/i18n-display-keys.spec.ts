import { describe, expect, it } from 'vitest';
import { customerServiceStatusLabelKey } from '../../src/renderer/data/display/customer-service-display-keys';
import { errorMessageKey } from '../../src/renderer/data/display/error-display-keys';
import { displayKey } from '../../src/renderer/data/display/display-descriptor';
import { messageTypeLabelKey } from '../../src/renderer/data/display/message-display-keys';

describe('i18n display key mappers', () => {
  it('maps message types to stable display keys', () => {
    expect(messageTypeLabelKey('image')).toBe('message.imageFallback');
    expect(messageTypeLabelKey('audio')).toBe('message.voiceFallback');
    expect(messageTypeLabelKey('unknown')).toBe('message.messageFallback');
  });

  it('maps customer service statuses to stable display keys', () => {
    expect(customerServiceStatusLabelKey('queueing')).toBe(
      'customerService.status.queueing',
    );
    expect(customerServiceStatusLabelKey('closed_by_staff')).toBe(
      'customerService.status.closed',
    );
    expect(customerServiceStatusLabelKey('unexpected')).toBe(
      'customerService.status.unknown',
    );
  });

  it('maps user-facing errors to stable display keys', () => {
    expect(errorMessageKey('network')).toBe('error.network');
    expect(errorMessageKey('tenantAlreadyMember')).toBe('error.tenantAlreadyMember');
    expect(errorMessageKey('backend-internal-code')).toBe('error.unknown');
  });

  it('creates display descriptors without translated text', () => {
    expect(displayKey('message.unreadCount', { count: 2 })).toEqual({
      key: 'message.unreadCount',
      params: { count: 2 },
    });
  });
});
