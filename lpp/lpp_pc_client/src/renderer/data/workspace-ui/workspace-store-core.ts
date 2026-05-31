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

export type MessageLayoutMode = 'full' | 'no-profile' | 'chat-focus' | 'rail-focus';

function readStoredAuth(): AuthSession | null {
  return readStoredAuthSession();
}

interface WorkspaceState {
  authSession: AuthSession | null;
  activeModule: ModuleKey;
  activeThreadId: string;
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
  setMessageProfileVisible: (visible: boolean) => void;
  setMessageLayoutMode: (mode: MessageLayoutMode) => void;
  setFilter: (filter: WorkspaceState['filter']) => void;
  setMessageFilter: (filter: WorkspaceState['messageFilter']) => void;
  setContactFilter: (filter: WorkspaceState['contactFilter']) => void;
  setImPresenceStatus: (status: TrayStatus) => void;
  setCustomerServiceStatus: (status: CustomerServiceStatus) => void;
  updatePcSetting: <K extends keyof PcSettings>(key: K, value: PcSettings[K]) => void;
  pushRealtimeReminder: (reminder: PcRealtimeReminderInput) => void;
  dismissRealtimeReminder: (id: string) => void;
  dismissRealtimeRemindersForTarget: (targetModule: ModuleKey, targetId?: string) => void;
  setAuthSession: (session: AuthSession) => void;
  restoreDesktopAuthSession: () => Promise<void>;
  clearAuthSession: () => void;
}

const initialAuthSession = readStoredAuth();

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  authSession: initialAuthSession,
  activeModule: 'messages',
  activeThreadId: '',
  openServiceThreadIds: [],
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
  setActiveThread: (id) =>
    set((state) => ({
      activeThreadId: id,
      openServiceThreadIds: openServiceThread(state.openServiceThreadIds, id),
    })),
  closeOpenServiceThread: (id) =>
    set((state) =>
      closeServiceThread({
        activeThreadId: state.activeThreadId,
        closingThreadId: id,
        openThreadIds: state.openServiceThreadIds,
      }),
    ),
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
    applyWorkspaceTrayStatus(status);
  },
  setCustomerServiceStatus: (customerServiceStatus) =>
    set({ customerServiceStatus }),
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
