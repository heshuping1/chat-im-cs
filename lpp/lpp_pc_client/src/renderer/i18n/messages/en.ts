import type { MessageDictionary } from './zh-CN';

export const en: MessageDictionary = {
  app: {
    loading: 'Loading...',
    title: 'LPP',
  },
  common: {
    cancel: 'Cancel',
    close: 'Close',
    confirm: 'Confirm',
    copy: 'Copy',
    loading: 'Loading...',
    retry: 'Retry',
    save: 'Save',
  },
  customerService: {
    status: {
      closed: 'Closed',
      queueing: 'Customer queued',
      serving: 'Agent serving',
      unknown: 'Status pending',
    },
  },
  error: {
    forbidden: 'This account does not have permission for this action.',
    network: 'Network error. Check your connection and try again.',
    tenantAlreadyMember: 'You are already in this company. Switch to it directly.',
    unauthorized: 'Your session has expired. Sign in again.',
    unknown: 'Unknown error',
  },
  message: {
    fileFallback: '[File]',
    imageFallback: '[Image]',
    messageFallback: '[Message]',
    unreadCount: '{count} unread',
    videoFallback: '[Video]',
    voiceFallback: '[Voice]',
  },
  nav: {
    contacts: 'Contacts',
    messages: 'Messages',
    onlineService: 'Customer Service',
    settings: 'Settings',
  },
  settings: {
    language: 'Language',
  },
};
