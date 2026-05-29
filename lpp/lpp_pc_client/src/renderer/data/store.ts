import { create } from 'zustand';
import type { TrayStatus } from '../../shared/desktop-api';
import type { PlatformTenant } from './api/types';
import type { ConversationReadState, ImConversationType } from './im-read-model';
import { conversationKey } from './im-read-model';
import {
  type ContactFilter,
  type CustomerServiceStatus,
  type ModuleKey,
} from './types';

export interface AuthSession {
  apiBaseUrl: string;
  tenantToken: string;
  platformToken?: string;
  platformRefreshToken?: string;
  refreshToken?: string;
  tenantId?: string;
  tenantCode?: string;
  tenantName?: string;
  tenantLogoUrl?: string | null;
  userId?: string;
  platformUserId?: string;
  lppId?: string;
  displayName: string;
  avatarUrl?: string | null;
  roleLabel?: string;
  tenants?: PlatformTenant[];
}

export interface PcRealtimeReminder {
  id: string;
  title: string;
  body: string;
  targetModule: ModuleKey;
  targetId?: string;
  severity?: 'info' | 'warning' | 'critical';
  icon?: 'im' | 'service' | 'sla';
  createdAt: number;
}

export interface LocalImConversationRead {
  readSeq: number;
  messageKey?: string;
  readAt?: number;
}

export interface LocalImPeerReadReceipt {
  readSeq: number;
  readAt?: number;
}

export type StoredImReadState = Record<string, ConversationReadState>;
export type MessageLayoutMode = 'full' | 'no-profile' | 'chat-focus' | 'rail-focus';

const authStorageKey = 'lpp.pc.authSession';
const localImReadsStoragePrefix = 'lpp.pc.im.localReads';
const localImPeerReadsStoragePrefix = 'lpp.pc.im.peerReads';

function readStoredAuth(): AuthSession | null {
  const envToken = import.meta.env.VITE_TENANT_TOKEN as string | undefined;
  const envBaseUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (envToken) {
    return {
      apiBaseUrl: envBaseUrl || 'https://chat.hearteasechat.com',
      tenantToken: envToken,
      displayName: '当前账号',
      roleLabel: '已配置 Token',
    };
  }
  try {
    const raw = localStorage.getItem(authStorageKey);
    return raw ? (JSON.parse(raw) as AuthSession) : null;
  } catch {
    return null;
  }
}

interface WorkspaceState {
  authSession: AuthSession | null;
  activeModule: ModuleKey;
  activeThreadId: string;
  activeImConversationId: string;
  locallyReadImConversationReads: Record<string, LocalImConversationRead>;
  imPeerReadReceipts: Record<string, LocalImPeerReadReceipt>;
  imReadStateByConversation: StoredImReadState;
  activeContactId: string;
  listPaneWidth: number;
  profilePaneWidth: number;
  serviceListPaneWidth: number;
  serviceProfilePaneWidth: number;
  messageProfileVisible: boolean;
  messageLayoutMode: MessageLayoutMode;
  filter: 'all' | 'queued' | 'serving' | 'vip';
  messageFilter: 'all' | 'friends' | 'groups' | 'unread';
  contactFilter: ContactFilter;
  imPresenceStatus: TrayStatus;
  customerServiceStatus: CustomerServiceStatus;
  pcSettings: PcSettings;
  realtimeReminders: PcRealtimeReminder[];
  setActiveModule: (module: ModuleKey) => void;
  setActiveThread: (id: string) => void;
  setActiveImConversation: (id: string) => void;
  markImConversationReadLocally: (
    id: string,
    readSeq?: number,
    messageKey?: string,
  ) => void;
  markImPeerReadReceipt: (id: string, readSeq: number) => void;
  upsertImReadState: (state: ConversationReadState) => void;
  clearPendingImRead: (
    conversationType: ImConversationType,
    conversationId: string,
    readSeq: number,
  ) => void;
  setActiveContact: (id: string) => void;
  setListPaneWidth: (width: number) => void;
  setProfilePaneWidth: (width: number) => void;
  setServiceListPaneWidth: (width: number) => void;
  setServiceProfilePaneWidth: (width: number) => void;
  setMessageProfileVisible: (visible: boolean) => void;
  setMessageLayoutMode: (mode: MessageLayoutMode) => void;
  setFilter: (filter: WorkspaceState['filter']) => void;
  setMessageFilter: (filter: WorkspaceState['messageFilter']) => void;
  setContactFilter: (filter: WorkspaceState['contactFilter']) => void;
  setImPresenceStatus: (status: TrayStatus) => void;
  setCustomerServiceStatus: (status: CustomerServiceStatus) => void;
  updatePcSetting: <K extends keyof PcSettings>(key: K, value: PcSettings[K]) => void;
  pushRealtimeReminder: (reminder: Omit<PcRealtimeReminder, 'createdAt'>) => void;
  dismissRealtimeReminder: (id: string) => void;
  dismissRealtimeRemindersForTarget: (targetModule: ModuleKey, targetId?: string) => void;
  setAuthSession: (session: AuthSession) => void;
  clearAuthSession: () => void;
}

export interface PcSettings {
  imNotifications: boolean;
  serviceQueueNotifications: boolean;
  slaTimeoutNotifications: boolean;
  desktopNotifications: boolean;
  minimizeToTray: boolean;
  launchAtStartup: boolean;
  autoReconnect: boolean;
  compactList: boolean;
  fontSize: '小' | '标准' | '大' | '超大';
  highDensityContext: boolean;
  theme: 'porcelain' | 'business' | 'classic-wechat' | 'dark' | 'high-contrast';
  skin: 'jade' | 'blue' | 'graphite';
  language: '简体中文' | 'English' | 'العربية';
  timezone: '系统默认' | 'Asia/Shanghai' | 'UTC';
  autoTranslate: boolean;
  screenshotShortcut: 'Alt+A' | 'Ctrl+Alt+A' | 'Ctrl+Shift+A' | 'None';
  dragUpload: boolean;
  localMessageCache: boolean;
  allowLppSearch: boolean;
  allowMobileSearch: boolean;
  friendRequestVerification: boolean;
  profileVisibility: '所有人' | '仅好友' | '不允许';
  sensitiveMasking: boolean;
  activeLine: '自动选择' | '主站' | '香港线路' | '新加坡线路';
  weakNetworkDiagnostics: boolean;
  reduceMotion: boolean;
  highContrastBoundary: boolean;
  keyboardFocusHint: boolean;
  busyDoNotDisturb: boolean;
  afterWorkReminder: boolean;
  shortcutHints: boolean;
}

const pcSettingsStorageKey = 'lpp.pc.settings';

const defaultPcSettings: PcSettings = {
  imNotifications: true,
  serviceQueueNotifications: true,
  slaTimeoutNotifications: true,
  desktopNotifications: true,
  minimizeToTray: true,
  launchAtStartup: false,
  autoReconnect: true,
  compactList: true,
  fontSize: '标准',
  highDensityContext: true,
  theme: 'porcelain',
  skin: 'jade',
  language: '简体中文',
  timezone: '系统默认',
  autoTranslate: false,
  screenshotShortcut: 'Alt+A',
  dragUpload: true,
  localMessageCache: true,
  allowLppSearch: true,
  allowMobileSearch: true,
  friendRequestVerification: true,
  profileVisibility: '仅好友',
  sensitiveMasking: true,
  activeLine: '自动选择',
  weakNetworkDiagnostics: true,
  reduceMotion: false,
  highContrastBoundary: false,
  keyboardFocusHint: true,
  busyDoNotDisturb: false,
  afterWorkReminder: false,
  shortcutHints: true,
};

function readStoredPcSettings(): PcSettings {
  try {
    const raw = localStorage.getItem(pcSettingsStorageKey);
    return raw
      ? { ...defaultPcSettings, ...(JSON.parse(raw) as Partial<PcSettings>) }
      : defaultPcSettings;
  } catch {
    return defaultPcSettings;
  }
}

function persistPcSettings(settings: PcSettings) {
  localStorage.setItem(pcSettingsStorageKey, JSON.stringify(settings));
}

const initialAuthSession = readStoredAuth();

function localImReadsStorageKey(session: AuthSession | null) {
  if (!session) return `${localImReadsStoragePrefix}.anonymous`;
  return [
    localImReadsStoragePrefix,
    session.apiBaseUrl,
    session.tenantId || session.tenantCode || session.tenantToken.slice(0, 24),
    session.userId || session.platformUserId || session.lppId || session.displayName,
  ].join('|');
}

function localImPeerReadsStorageKey(session: AuthSession | null) {
  if (!session) return `${localImPeerReadsStoragePrefix}.anonymous`;
  return [
    localImPeerReadsStoragePrefix,
    session.apiBaseUrl,
    session.tenantId || session.tenantCode || session.tenantToken.slice(0, 24),
    session.userId || session.platformUserId || session.lppId || session.displayName,
  ].join('|');
}

export function imConversationStorageKey(session: AuthSession | null) {
  if (!session) return 'lpp.pc.im.readState.anonymous';
  return [
    'lpp.pc.im.readState',
    session.apiBaseUrl,
    session.tenantId || session.tenantCode || session.tenantToken.slice(0, 24),
    session.userId || session.platformUserId || session.lppId || session.displayName,
  ].join('|');
}

export function sanitizeStoredImReadState(input: unknown): StoredImReadState {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};

  return Object.fromEntries(
    Object.entries(input as Record<string, Partial<ConversationReadState>>)
      .filter(([key, value]) => isValidStoredImReadState(key, value))
      .map(([key, value]) => {
        const conversationType = value.conversationType as ImConversationType;
        const pendingReadSeq =
          value.pendingReadSeq === undefined
            ? undefined
            : normalizedStoredSeq(value.pendingReadSeq);
        return [
          key,
          {
            conversationKey: key,
            conversationId: value.conversationId as string,
            conversationType,
            myReadSeq: normalizedStoredSeq(value.myReadSeq),
            peerReadSeq: normalizedStoredSeq(value.peerReadSeq),
            lastMessageSeq: normalizedStoredSeq(value.lastMessageSeq),
            unreadCount: normalizedStoredSeq(value.unreadCount),
            pendingReadSeq,
            updatedAt: normalizedStoredSeq(value.updatedAt),
          } satisfies ConversationReadState,
        ];
      }),
  );
}

function isValidStoredImReadState(
  key: string,
  value: Partial<ConversationReadState> | undefined,
) {
  const expectedKey =
    value &&
    (value.conversationType === 'direct' || value.conversationType === 'group') &&
    typeof value.conversationId === 'string'
      ? conversationKey(value.conversationType, value.conversationId)
      : '';
  return (
    key === expectedKey &&
    value &&
    typeof value === 'object' &&
    (value.conversationType === 'direct' || value.conversationType === 'group') &&
    typeof value.conversationId === 'string' &&
    value.conversationId.length > 0 &&
    Number.isFinite(Number(value.myReadSeq)) &&
    Number.isFinite(Number(value.peerReadSeq)) &&
    Number.isFinite(Number(value.lastMessageSeq)) &&
    (value.unreadCount === undefined || Number.isFinite(Number(value.unreadCount))) &&
    (value.pendingReadSeq === undefined || Number.isFinite(Number(value.pendingReadSeq))) &&
    Number.isFinite(Number(value.updatedAt ?? 0))
  );
}

function normalizedStoredSeq(value: unknown) {
  return Number.isFinite(Number(value)) ? Math.max(0, Math.floor(Number(value))) : 0;
}

function sanitizeLocalReadEntries<T extends LocalImConversationRead | LocalImPeerReadReceipt>(
  input: unknown,
  createRead: (readSeq: number, value: Record<string, unknown>) => T,
): Record<string, T> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};

  return Object.fromEntries(
    Object.entries(input as Record<string, unknown>).flatMap(([id, value]) => {
      if (!id || !value || typeof value !== 'object' || Array.isArray(value)) return [];
      const readSeq = normalizedStoredSeq((value as Record<string, unknown>).readSeq);
      return [[id, createRead(readSeq, value as Record<string, unknown>)]];
    }),
  );
}

function readStoredLocalImConversationReads(
  session: AuthSession | null,
): Record<string, LocalImConversationRead> {
  try {
    const raw = localStorage.getItem(localImReadsStorageKey(session));
    if (!raw) return {};
    return sanitizeLocalReadEntries(JSON.parse(raw), (readSeq, value) => ({
      readSeq,
      messageKey: typeof value.messageKey === 'string' ? value.messageKey : undefined,
      readAt: Number.isFinite(Number(value.readAt))
        ? normalizedStoredSeq(value.readAt)
        : undefined,
    }));
  } catch {
    return {};
  }
}

function readStoredLocalImPeerReadReceipts(
  session: AuthSession | null,
): Record<string, LocalImPeerReadReceipt> {
  try {
    const raw = localStorage.getItem(localImPeerReadsStorageKey(session));
    if (!raw) return {};
    return sanitizeLocalReadEntries(JSON.parse(raw), (readSeq, value) => ({
      readSeq,
      readAt: Number.isFinite(Number(value.readAt))
        ? normalizedStoredSeq(value.readAt)
        : undefined,
    }));
  } catch {
    return {};
  }
}

function readStoredImReadState(session: AuthSession | null): StoredImReadState {
  try {
    const raw = localStorage.getItem(imConversationStorageKey(session));
    return raw ? sanitizeStoredImReadState(JSON.parse(raw)) : {};
  } catch {
    return {};
  }
}

function persistLocalImConversationReads(
  session: AuthSession | null,
  reads: Record<string, LocalImConversationRead>,
) {
  if (!session) return;
  localStorage.setItem(localImReadsStorageKey(session), JSON.stringify(reads));
}

function persistLocalImPeerReadReceipts(
  session: AuthSession | null,
  receipts: Record<string, LocalImPeerReadReceipt>,
) {
  if (!session) return;
  localStorage.setItem(localImPeerReadsStorageKey(session), JSON.stringify(receipts));
}

function persistImReadState(session: AuthSession | null, readState: StoredImReadState) {
  localStorage.setItem(imConversationStorageKey(session), JSON.stringify(readState));
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  authSession: initialAuthSession,
  activeModule: 'messages',
  activeThreadId: '',
  activeImConversationId: '',
  locallyReadImConversationReads: readStoredLocalImConversationReads(initialAuthSession),
  imPeerReadReceipts: readStoredLocalImPeerReadReceipts(initialAuthSession),
  imReadStateByConversation: readStoredImReadState(initialAuthSession),
  activeContactId: '',
  listPaneWidth: 220,
  profilePaneWidth: 330,
  serviceListPaneWidth: 340,
  serviceProfilePaneWidth: 330,
  messageProfileVisible: true,
  messageLayoutMode: 'full',
  filter: 'all',
  messageFilter: 'all',
  contactFilter: 'customer',
  imPresenceStatus: 'online',
  customerServiceStatus: 'offline',
  pcSettings: readStoredPcSettings(),
  realtimeReminders: [],
  setActiveModule: (activeModule) => set({ activeModule }),
  setActiveThread: (id) => set({ activeThreadId: id }),
  setActiveImConversation: (id) =>
    set({ activeImConversationId: id, activeModule: 'messages' }),
  markImConversationReadLocally: (id, readSeq = 0, messageKey) =>
    set((state) => {
      if (!id) return state;
      const nextReadSeq = Math.max(0, Math.floor(readSeq));
      const current = state.locallyReadImConversationReads[id];
      const key = conversationKey('direct', id);
      const currentReadState = state.imReadStateByConversation[key];
      if (
        current &&
        current.readSeq >= nextReadSeq &&
        (!messageKey || current.messageKey === messageKey) &&
        currentReadState &&
        currentReadState.myReadSeq >= nextReadSeq
      ) {
        return state;
      }
      const legacyReadSeq = Math.max(current?.readSeq ?? 0, nextReadSeq);
      const locallyReadImConversationReads = {
        ...state.locallyReadImConversationReads,
        [id]: { readSeq: legacyReadSeq, messageKey, readAt: Date.now() },
      };
      const imReadStateByConversation = {
        ...state.imReadStateByConversation,
        [key]: mergeImReadState(currentReadState, {
          conversationKey: key,
          conversationId: id,
          conversationType: 'direct',
          myReadSeq: legacyReadSeq,
          peerReadSeq: currentReadState?.peerReadSeq ?? 0,
          lastMessageSeq: legacyReadSeq,
          unreadCount: 0,
          pendingReadSeq: legacyReadSeq > 0 ? legacyReadSeq : currentReadState?.pendingReadSeq,
          updatedAt: Date.now(),
        }),
      };
      persistLocalImConversationReads(state.authSession, locallyReadImConversationReads);
      persistImReadState(state.authSession, imReadStateByConversation);
      return { locallyReadImConversationReads, imReadStateByConversation };
    }),
  markImPeerReadReceipt: (id, readSeq) =>
    set((state) => {
      if (!id) return state;
      const nextReadSeq = Math.max(0, Math.floor(readSeq));
      if (nextReadSeq <= 0) return state;
      const current = state.imPeerReadReceipts[id];
      const key = conversationKey('direct', id);
      const currentReadState = state.imReadStateByConversation[key];
      if (
        current &&
        current.readSeq >= nextReadSeq &&
        currentReadState &&
        currentReadState.peerReadSeq >= nextReadSeq
      ) {
        return state;
      }
      const imPeerReadReceipts = {
        ...state.imPeerReadReceipts,
        [id]: {
          readSeq: Math.max(current?.readSeq ?? 0, nextReadSeq),
          readAt: Date.now(),
        },
      };
      const imReadStateByConversation = {
        ...state.imReadStateByConversation,
        [key]: mergeImReadState(currentReadState, {
          conversationKey: key,
          conversationId: id,
          conversationType: 'direct',
          myReadSeq: currentReadState?.myReadSeq ?? 0,
          peerReadSeq: nextReadSeq,
          lastMessageSeq: currentReadState?.lastMessageSeq ?? 0,
          unreadCount: currentReadState?.unreadCount ?? 0,
          pendingReadSeq: currentReadState?.pendingReadSeq,
          updatedAt: Date.now(),
        }),
      };
      persistLocalImPeerReadReceipts(state.authSession, imPeerReadReceipts);
      persistImReadState(state.authSession, imReadStateByConversation);
      return { imPeerReadReceipts, imReadStateByConversation };
    }),
  upsertImReadState: (readState) =>
    set((state) => {
      if (!readState.conversationId) return state;
      const key = conversationKey(readState.conversationType, readState.conversationId);
      const imReadStateByConversation = {
        ...state.imReadStateByConversation,
        [key]: mergeImReadState(state.imReadStateByConversation[key], {
          ...readState,
          conversationKey: key,
        }),
      };
      persistImReadState(state.authSession, imReadStateByConversation);
      return { imReadStateByConversation };
    }),
  clearPendingImRead: (conversationType, conversationId, readSeq) =>
    set((state) => {
      const key = conversationKey(conversationType, conversationId);
      const current = state.imReadStateByConversation[key];
      const clearThroughSeq = normalizedStoredSeq(readSeq);
      if (
        !current ||
        current.pendingReadSeq === undefined ||
        normalizedStoredSeq(current.pendingReadSeq) > clearThroughSeq
      ) {
        return state;
      }
      const next = { ...current, pendingReadSeq: undefined, updatedAt: Date.now() };
      const imReadStateByConversation = {
        ...state.imReadStateByConversation,
        [key]: next,
      };
      persistImReadState(state.authSession, imReadStateByConversation);
      return { imReadStateByConversation };
    }),
  setActiveContact: (id) => set({ activeContactId: id }),
  setListPaneWidth: (width) =>
    set({ listPaneWidth: Math.min(560, Math.max(220, Math.round(width))) }),
  setProfilePaneWidth: (width) =>
    set({ profilePaneWidth: Math.min(440, Math.max(280, Math.round(width))) }),
  setServiceListPaneWidth: (width) =>
    set({ serviceListPaneWidth: Math.min(430, Math.max(300, Math.round(width))) }),
  setServiceProfilePaneWidth: (width) =>
    set({ serviceProfilePaneWidth: Math.min(440, Math.max(300, Math.round(width))) }),
  setMessageProfileVisible: (messageProfileVisible) => set({ messageProfileVisible }),
  setMessageLayoutMode: (messageLayoutMode) =>
    set((state) =>
      state.messageLayoutMode === messageLayoutMode ? state : { messageLayoutMode },
    ),
  setFilter: (filter) => set({ filter }),
  setMessageFilter: (messageFilter) => set({ messageFilter }),
  setContactFilter: (contactFilter) => set({ contactFilter }),
  setImPresenceStatus: (status) => {
    set({ imPresenceStatus: status });
    void window.desktopApi?.setTrayStatus(status);
  },
  setCustomerServiceStatus: (customerServiceStatus) =>
    set({ customerServiceStatus }),
  updatePcSetting: (key, value) =>
    set((state) => {
      const pcSettings = { ...state.pcSettings, [key]: value };
      persistPcSettings(pcSettings);
      return { pcSettings };
    }),
  pushRealtimeReminder: (reminder) =>
    set((state) => ({
      realtimeReminders: [
        { ...reminder, createdAt: Date.now() },
        ...state.realtimeReminders.filter((item) => item.id !== reminder.id),
      ].slice(0, 6),
    })),
  dismissRealtimeReminder: (id) =>
    set((state) => ({
      realtimeReminders: state.realtimeReminders.filter((item) => item.id !== id),
    })),
  dismissRealtimeRemindersForTarget: (targetModule, targetId) =>
    set((state) => ({
      realtimeReminders: state.realtimeReminders.filter((item) => {
        if (item.targetModule !== targetModule) return true;
        return targetId ? item.targetId !== targetId : false;
      }),
    })),
  setAuthSession: (authSession) => {
    localStorage.setItem(authStorageKey, JSON.stringify(authSession));
    set({
      authSession,
      locallyReadImConversationReads: readStoredLocalImConversationReads(authSession),
      imPeerReadReceipts: readStoredLocalImPeerReadReceipts(authSession),
      imReadStateByConversation: readStoredImReadState(authSession),
    });
  },
  clearAuthSession: () => {
    localStorage.removeItem(authStorageKey);
    set({
      authSession: null,
      activeThreadId: '',
      activeImConversationId: '',
      locallyReadImConversationReads: {},
      imPeerReadReceipts: {},
      imReadStateByConversation: {},
      activeContactId: '',
      activeModule: 'messages',
    });
  },
}));

function mergeImReadState(
  current: ConversationReadState | undefined,
  next: ConversationReadState,
): ConversationReadState {
  return {
    conversationKey: next.conversationKey,
    conversationId: next.conversationId,
    conversationType: next.conversationType,
    myReadSeq: Math.max(current?.myReadSeq ?? 0, normalizedStoredSeq(next.myReadSeq)),
    peerReadSeq: Math.max(current?.peerReadSeq ?? 0, normalizedStoredSeq(next.peerReadSeq)),
    lastMessageSeq: Math.max(
      current?.lastMessageSeq ?? 0,
      normalizedStoredSeq(next.lastMessageSeq),
    ),
    unreadCount: normalizedStoredSeq(next.unreadCount),
    pendingReadSeq:
      next.pendingReadSeq === undefined
        ? current?.pendingReadSeq
        : Math.max(current?.pendingReadSeq ?? 0, normalizedStoredSeq(next.pendingReadSeq)),
    updatedAt: Math.max(current?.updatedAt ?? 0, normalizedStoredSeq(next.updatedAt)),
  };
}
