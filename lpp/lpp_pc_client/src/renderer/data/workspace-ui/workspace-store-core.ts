import { create } from 'zustand';
import type { TrayStatus } from '../../../shared/desktop-api';
import {
  clearStoredAuthSession,
  persistAuthSession,
  readDesktopStoredAuthSession,
  readStoredAuthSession,
  type AuthSession,
} from '../auth/auth-session';
import {
  createAuthSessionAppliedState,
  createAuthSessionClearedState,
} from '../auth/auth-workspace-bridge';
import type { ConversationReadState, ImConversationType } from '../im-read-model';
import { conversationKey } from '../im-read-model';
import { logImReadDiagnostic } from '../im-read/im-read-diagnostics';
import { recordMessageReminderDiagnostic } from '../diagnostics/message-reminder-diagnostics';
import {
  normalizedStoredSeq,
  persistImReadState,
  persistLocalImConversationReads,
  persistLocalImPeerReadReceipts,
  readStoredImReadState,
  readStoredLocalImConversationReads,
  readStoredLocalImPeerReadReceipts,
  type LocalImConversationRead,
  type LocalImPeerReadReceipt,
  type StoredImReadState,
} from '../im-read/im-read-storage';
import {
  persistPcSettings,
  readStoredPcSettings,
  type PcSettings,
} from '../settings/pc-settings';
import { logSettingsDiagnostic } from '../settings/settings-diagnostics';
import { logReminderDiagnostic } from '../reminder/reminder-diagnostics';
import {
  reduceRealtimeReminders,
  dismissRealtimeReminderById,
  dismissRealtimeRemindersForTarget as reduceDismissRealtimeRemindersForTarget,
} from '../reminder/reminder-service';
import type {
  PcRealtimeReminder,
  PcRealtimeReminderInput,
} from '../reminder/reminder-types';
import {
  type ContactFilter,
  type CustomerServiceStatus,
  type ModuleKey,
} from '../types';
import { applyWorkspaceTrayStatus } from './workspaceTrayStatusEffect';
import {
  closeServiceThread,
  openServiceThread,
} from '../customer-service/cs-multi-open';

// Compatibility export only. New code should import AuthSession from data/auth/auth-session.
export type { AuthSession } from '../auth/auth-session';
// Compatibility export only. New code should import PcSettings from data/settings/pc-settings.
export type { PcSettings } from '../settings/pc-settings';
// Compatibility export only. New code should import IM read types from data/im-read/im-read-storage.
export type {
  LocalImConversationRead,
  LocalImPeerReadReceipt,
  StoredImReadState,
} from '../im-read/im-read-storage';
export {
  imConversationStorageKey,
  sanitizeStoredImReadState,
} from '../im-read/im-read-storage';
// Compatibility export only. New code should import reminder types from data/reminder/reminder-types.
export type { PcRealtimeReminder } from '../reminder/reminder-types';

export type MessageLayoutMode =
  | 'full'
  | 'no-assistant'
  | 'no-profile'
  | 'compact-sidebar'
  | 'no-sidebar'
  | 'chat-focus';
export type ServiceLayoutMode =
  | 'full'
  | 'no-assistant'
  | 'no-customer'
  | 'compact-sidebar'
  | 'no-sidebar'
  | 'queue-focus'
  | 'chat-focus';
export type ServiceAssistantPane = 'aiDraft' | 'knowledge' | 'quickReply' | null;
export type CustomerServiceThreadOpenSource = 'none' | 'auto' | 'user' | 'reminder' | 'claim';
export type GatewayRealtimeStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'retrying'
  | 'stopped';

const serviceLayoutStorageKey = 'lpp.pc.service-layout';
const serviceLayoutDefaults = {
  assistantPane: null as ServiceAssistantPane,
  assistantPaneWidth: 400,
  customerPaneCollapsed: false,
  listPaneCollapsed: false,
  listPaneWidth: 340,
  profilePaneWidth: 420,
};
const legacyServiceLayoutDefaults = {
  assistantPaneWidth: 360,
  profilePaneWidth: 330,
};

type StoredServiceLayout = Partial<typeof serviceLayoutDefaults> & {
  customerPaneUserCollapsed?: boolean;
  listPaneUserCollapsed?: boolean;
};

function clampPaneWidth(width: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.round(width)));
}

function readStoredServiceLayout(): StoredServiceLayout {
  try {
    const storage = typeof window === 'undefined' ? null : window.localStorage;
    const raw = storage?.getItem(serviceLayoutStorageKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      assistantPane:
        parsed.assistantPane === 'aiDraft' ||
        parsed.assistantPane === 'knowledge' ||
        parsed.assistantPane === 'quickReply'
          ? parsed.assistantPane
          : null,
      assistantPaneWidth:
        typeof parsed.assistantPaneWidth === 'number'
          ? parsed.assistantPaneWidth === legacyServiceLayoutDefaults.assistantPaneWidth
            ? serviceLayoutDefaults.assistantPaneWidth
            : clampPaneWidth(parsed.assistantPaneWidth, 320, 420)
          : undefined,
      customerPaneCollapsed:
        typeof parsed.customerPaneUserCollapsed === 'boolean'
          ? parsed.customerPaneUserCollapsed
          : undefined,
      listPaneCollapsed:
        typeof parsed.listPaneUserCollapsed === 'boolean'
          ? parsed.listPaneUserCollapsed
          : undefined,
      listPaneWidth:
        typeof parsed.listPaneWidth === 'number'
          ? clampPaneWidth(parsed.listPaneWidth, 260, 420)
          : undefined,
      profilePaneWidth:
        typeof parsed.profilePaneWidth === 'number'
          ? parsed.profilePaneWidth === legacyServiceLayoutDefaults.profilePaneWidth
            ? serviceLayoutDefaults.profilePaneWidth
            : clampPaneWidth(parsed.profilePaneWidth, 300, 440)
          : undefined,
    };
  } catch {
    return {};
  }
}

function persistServiceLayoutPatch(patch: StoredServiceLayout) {
  try {
    const storage = typeof window === 'undefined' ? null : window.localStorage;
    if (!storage) return;
    const current = readStoredServiceLayout();
    storage.setItem(
      serviceLayoutStorageKey,
      JSON.stringify({ ...current, ...patch }),
    );
  } catch {
    // Layout persistence is best-effort; UI state still works in memory.
  }
}

function readStoredAuth(): AuthSession | null {
  return readStoredAuthSession();
}

interface WorkspaceState {
  authSession: AuthSession | null;
  activeModule: ModuleKey;
  activeThreadId: string;
  activeThreadOpenSource: CustomerServiceThreadOpenSource;
  openServiceThreadIds: string[];
  activeImConversationId: string;
  locallyReadImConversationReads: Record<string, LocalImConversationRead>;
  imPeerReadReceipts: Record<string, LocalImPeerReadReceipt>;
  imReadStateByConversation: StoredImReadState;
  activeContactId: string;
  listPaneWidth: number;
  profilePaneWidth: number;
  serviceListPaneWidth: number;
  serviceProfilePaneWidth: number;
  serviceAssistantPaneWidth: number;
  serviceCustomerPaneCollapsed: boolean;
  serviceListPaneCollapsed: boolean;
  serviceAssistantPane: ServiceAssistantPane;
  serviceLayoutMode: ServiceLayoutMode;
  sidebarCollapsed: boolean;
  messageProfileVisible: boolean;
  messageLayoutMode: MessageLayoutMode;
  filter: 'all' | 'queued' | 'serving' | 'sla';
  messageFilter: 'all' | 'friends' | 'groups' | 'unread';
  contactFilter: ContactFilter;
  imPresenceStatus: TrayStatus;
  customerServiceStatus: CustomerServiceStatus;
  gatewayRealtimeStatus: GatewayRealtimeStatus;
  gatewayRealtimeUpdatedAt: number;
  pcSettings: PcSettings;
  realtimeReminders: PcRealtimeReminder[];
  setActiveModule: (module: ModuleKey) => void;
  setActiveThread: (id: string) => void;
  openCustomerServiceThread: (
    id: string,
    source: Exclude<CustomerServiceThreadOpenSource, 'none'>,
  ) => void;
  closeOpenServiceThread: (id: string) => void;
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
  setServiceAssistantPaneWidth: (width: number) => void;
  setServiceCustomerPaneCollapsed: (collapsed: boolean) => void;
  setServiceListPaneCollapsed: (collapsed: boolean) => void;
  setServiceAssistantPane: (pane: ServiceAssistantPane) => void;
  setServiceLayoutMode: (mode: ServiceLayoutMode) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setMessageProfileVisible: (visible: boolean) => void;
  setMessageLayoutMode: (mode: MessageLayoutMode) => void;
  setFilter: (filter: WorkspaceState['filter']) => void;
  setMessageFilter: (filter: WorkspaceState['messageFilter']) => void;
  setContactFilter: (filter: WorkspaceState['contactFilter']) => void;
  setImPresenceStatus: (status: TrayStatus) => void;
  setCustomerServiceStatus: (status: CustomerServiceStatus) => void;
  setGatewayRealtimeStatus: (status: GatewayRealtimeStatus) => void;
  updatePcSetting: <K extends keyof PcSettings>(key: K, value: PcSettings[K]) => void;
  pushRealtimeReminder: (reminder: PcRealtimeReminderInput) => void;
  dismissRealtimeReminder: (id: string) => void;
  dismissRealtimeRemindersForTarget: (targetModule: ModuleKey, targetId?: string) => void;
  setAuthSession: (session: AuthSession) => void;
  restoreDesktopAuthSession: () => Promise<void>;
  clearAuthSession: () => void;
}

const initialAuthSession = readStoredAuth();
const initialServiceLayout = readStoredServiceLayout();

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  authSession: initialAuthSession,
  activeModule: 'messages',
  activeThreadId: '',
  activeThreadOpenSource: 'none',
  openServiceThreadIds: [],
  activeImConversationId: '',
  locallyReadImConversationReads: readStoredLocalImConversationReads(initialAuthSession),
  imPeerReadReceipts: readStoredLocalImPeerReadReceipts(initialAuthSession),
  imReadStateByConversation: readStoredImReadState(initialAuthSession),
  activeContactId: '',
  listPaneWidth: 220,
  profilePaneWidth: 400,
  serviceListPaneWidth: initialServiceLayout.listPaneWidth ?? serviceLayoutDefaults.listPaneWidth,
  serviceProfilePaneWidth:
    initialServiceLayout.profilePaneWidth ?? serviceLayoutDefaults.profilePaneWidth,
  serviceAssistantPaneWidth:
    initialServiceLayout.assistantPaneWidth ?? serviceLayoutDefaults.assistantPaneWidth,
  serviceCustomerPaneCollapsed:
    initialServiceLayout.customerPaneCollapsed ?? serviceLayoutDefaults.customerPaneCollapsed,
  serviceListPaneCollapsed:
    initialServiceLayout.listPaneCollapsed ?? serviceLayoutDefaults.listPaneCollapsed,
  serviceAssistantPane:
    initialServiceLayout.assistantPane ?? serviceLayoutDefaults.assistantPane,
  serviceLayoutMode: 'full',
  sidebarCollapsed: false,
  messageProfileVisible: true,
  messageLayoutMode: 'full',
  filter: 'all',
  messageFilter: 'all',
  contactFilter: 'customer',
  imPresenceStatus: 'online',
  customerServiceStatus: 'busy',
  gatewayRealtimeStatus: 'idle',
  gatewayRealtimeUpdatedAt: 0,
  pcSettings: readStoredPcSettings(),
  realtimeReminders: [],
  setActiveModule: (activeModule) => set({ activeModule }),
  setActiveThread: (id) =>
    set((state) => ({
      activeThreadId: id,
      activeThreadOpenSource: id ? 'auto' : 'none',
      openServiceThreadIds: openServiceThread(state.openServiceThreadIds, id),
    })),
  openCustomerServiceThread: (id, source) =>
    set((state) => ({
      activeThreadId: id,
      activeThreadOpenSource: id ? source : 'none',
      openServiceThreadIds: openServiceThread(state.openServiceThreadIds, id),
    })),
  closeOpenServiceThread: (id) =>
    set((state) => {
      const next = closeServiceThread({
        activeThreadId: state.activeThreadId,
        closingThreadId: id,
        openThreadIds: state.openServiceThreadIds,
      });
      return {
        ...next,
        activeThreadOpenSource: next.activeThreadId ? 'auto' : 'none',
      };
    }),
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
      const mergedReadSeq = Math.max(current?.readSeq ?? 0, nextReadSeq);
      const locallyReadImConversationReads = {
        ...state.locallyReadImConversationReads,
        [id]: { readSeq: mergedReadSeq, messageKey, readAt: Date.now() },
      };
      const imReadStateByConversation = {
        ...state.imReadStateByConversation,
        [key]: mergeImReadState(currentReadState, {
          conversationKey: key,
          conversationId: id,
          conversationType: 'direct',
          myReadSeq: mergedReadSeq,
          peerReadSeq: currentReadState?.peerReadSeq ?? 0,
          lastMessageSeq: mergedReadSeq,
          unreadCount: 0,
          pendingReadSeq: mergedReadSeq > 0 ? mergedReadSeq : currentReadState?.pendingReadSeq,
          updatedAt: Date.now(),
        }),
      };
      persistLocalImConversationReads(state.authSession, locallyReadImConversationReads);
      persistImReadState(state.authSession, imReadStateByConversation);
      logImReadDiagnostic({
        event: 'im-read.mark-local',
        phase: 'mark',
        result: 'success',
        reason: 'local_conversation_read',
        context: {
          conversationId: id,
          conversationType: 'direct',
          readSeq: mergedReadSeq,
        },
      });
      recordMessageReminderDiagnostic({
        event: 'im.store.mark-local',
        source: 'workspace-store-core',
        phase: 'mark',
        route: 'local-read',
        classification: {
          activeConversationId: state.activeImConversationId,
          activeModule: state.activeModule,
          commandReason: 'markImConversationReadLocally',
          conversationId: id,
          conversationType: 'direct',
          lastMessageSeq: currentReadState?.lastMessageSeq,
          lastReadSeq: currentReadState?.myReadSeq,
          readSeq: mergedReadSeq,
          unreadAfter: 0,
          unreadBefore: currentReadState?.unreadCount,
        },
      });
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
      logImReadDiagnostic({
        event: 'im-read.mark-peer',
        phase: 'mark',
        result: 'success',
        reason: 'peer_read_receipt',
        context: {
          conversationId: id,
          conversationType: 'direct',
          peerReadSeq: nextReadSeq,
        },
      });
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
      logImReadDiagnostic({
        event: 'im-read.upsert-state',
        phase: 'upsert',
        result: 'success',
        reason: 'read_state_upserted',
        context: {
          conversationId: readState.conversationId,
          conversationType: readState.conversationType,
          lastMessageSeq: readState.lastMessageSeq,
          myReadSeq: readState.myReadSeq,
          peerReadSeq: readState.peerReadSeq,
          unreadCount: readState.unreadCount,
        },
      });
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
      logImReadDiagnostic({
        event: 'im-read.clear-pending',
        phase: 'clear',
        result: 'success',
        reason: 'pending_read_cleared',
        context: {
          conversationId,
          conversationType,
          readSeq: clearThroughSeq,
        },
      });
      return { imReadStateByConversation };
    }),
  setActiveContact: (id) => set({ activeContactId: id }),
  setListPaneWidth: (width) =>
    set({ listPaneWidth: Math.min(560, Math.max(220, Math.round(width))) }),
  setProfilePaneWidth: (width) =>
    set({ profilePaneWidth: Math.min(960, Math.max(280, Math.round(width))) }),
  setServiceListPaneWidth: (width) =>
    set(() => {
      const serviceListPaneWidth = clampPaneWidth(width, 260, 420);
      persistServiceLayoutPatch({ listPaneWidth: serviceListPaneWidth });
      return { serviceListPaneWidth };
    }),
  setServiceProfilePaneWidth: (width) =>
    set(() => {
      const serviceProfilePaneWidth = clampPaneWidth(width, 300, 440);
      persistServiceLayoutPatch({ profilePaneWidth: serviceProfilePaneWidth });
      return { serviceProfilePaneWidth };
    }),
  setServiceAssistantPaneWidth: (width) =>
    set(() => {
      const serviceAssistantPaneWidth = clampPaneWidth(width, 320, 420);
      persistServiceLayoutPatch({ assistantPaneWidth: serviceAssistantPaneWidth });
      return { serviceAssistantPaneWidth };
    }),
  setServiceCustomerPaneCollapsed: (serviceCustomerPaneCollapsed) =>
    set(() => {
      persistServiceLayoutPatch({ customerPaneUserCollapsed: serviceCustomerPaneCollapsed });
      return { serviceCustomerPaneCollapsed };
    }),
  setServiceListPaneCollapsed: (serviceListPaneCollapsed) =>
    set(() => {
      persistServiceLayoutPatch({ listPaneUserCollapsed: serviceListPaneCollapsed });
      return { serviceListPaneCollapsed };
    }),
  setServiceAssistantPane: (serviceAssistantPane) =>
    set(() => {
      persistServiceLayoutPatch({ assistantPane: serviceAssistantPane });
      return { serviceAssistantPane };
    }),
  setServiceLayoutMode: (serviceLayoutMode) =>
    set((state) =>
      state.serviceLayoutMode === serviceLayoutMode ? state : { serviceLayoutMode },
    ),
  setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
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
    applyWorkspaceTrayStatus(status);
  },
  setCustomerServiceStatus: (customerServiceStatus) =>
    set({ customerServiceStatus }),
  setGatewayRealtimeStatus: (gatewayRealtimeStatus) =>
    set({ gatewayRealtimeStatus, gatewayRealtimeUpdatedAt: Date.now() }),
  updatePcSetting: (key, value) =>
    set((state) => {
      const pcSettings = { ...state.pcSettings, [key]: value };
      persistPcSettings(pcSettings);
      logSettingsDiagnostic({
        event: 'settings.update',
        phase: 'update',
        result: 'success',
        reason: 'field_updated',
        context: {
          key,
          valueType: typeof value,
        },
      });
      return { pcSettings };
    }),
  pushRealtimeReminder: (reminder) =>
    set((state) => {
      const realtimeReminders = reduceRealtimeReminders(
        state.realtimeReminders,
        reminder,
      );
      logReminderDiagnostic({
        event: 'reminder.push',
        phase: 'push',
        result: 'success',
        reason: 'realtime_reminder_upserted',
        context: {
          reminderId: reminder.id,
          targetModule: reminder.targetModule,
          targetId: reminder.targetId,
          beforeCount: state.realtimeReminders.length,
          afterCount: realtimeReminders.length,
        },
      });
      return { realtimeReminders };
    }),
  dismissRealtimeReminder: (id) =>
    set((state) => {
      const realtimeReminders = dismissRealtimeReminderById(
        state.realtimeReminders,
        id,
      );
      logReminderDiagnostic({
        event: 'reminder.dismiss',
        phase: 'dismiss',
        result: 'success',
        reason: 'realtime_reminder_dismissed',
        context: {
          reminderId: id,
          beforeCount: state.realtimeReminders.length,
          afterCount: realtimeReminders.length,
        },
      });
      return { realtimeReminders };
    }),
  dismissRealtimeRemindersForTarget: (targetModule, targetId) =>
    set((state) => {
      const realtimeReminders = reduceDismissRealtimeRemindersForTarget(
        state.realtimeReminders,
        targetModule,
        targetId,
      );
      logReminderDiagnostic({
        event: 'reminder.dismiss-target',
        phase: 'dismiss',
        result: 'success',
        reason: 'realtime_reminder_target_dismissed',
        context: {
          targetModule,
          targetId,
          beforeCount: state.realtimeReminders.length,
          afterCount: realtimeReminders.length,
        },
      });
      return { realtimeReminders };
    }),
  setAuthSession: (authSession) => {
    persistAuthSession(authSession);
    set(createAuthSessionAppliedState(authSession, {
      readLocalReads: readStoredLocalImConversationReads,
      readPeerReads: readStoredLocalImPeerReadReceipts,
      readReadState: readStoredImReadState,
    }));
  },
  restoreDesktopAuthSession: async () => {
    if (get().authSession) return;
    const authSession = await readDesktopStoredAuthSession();
    if (!authSession || get().authSession) return;
    set(createAuthSessionAppliedState(authSession, {
      readLocalReads: readStoredLocalImConversationReads,
      readPeerReads: readStoredLocalImPeerReadReceipts,
      readReadState: readStoredImReadState,
    }));
  },
  clearAuthSession: () => {
    clearStoredAuthSession();
    set(createAuthSessionClearedState());
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
