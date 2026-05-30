import { useWorkspaceStore } from "../workspace-ui/workspace-store-core";
import type { ModuleKey } from "../types";
import type {
  PcRealtimeReminder,
  PcRealtimeReminderInput,
} from "./reminder-types";

// Reminder state is still backed by workspace store during P2.
// New callers should depend on this file instead of reading reminder fields directly.
export interface ReminderStoreCompatibleState {
  realtimeReminders: PcRealtimeReminder[];
  pushRealtimeReminder: (reminder: PcRealtimeReminderInput) => void;
  dismissRealtimeReminder: (id: string) => void;
  dismissRealtimeRemindersForTarget: (targetModule: ModuleKey, targetId?: string) => void;
}

export function selectRealtimeReminders(state: ReminderStoreCompatibleState) {
  return state.realtimeReminders;
}

export function selectPushRealtimeReminder(state: ReminderStoreCompatibleState) {
  return state.pushRealtimeReminder;
}

export function selectDismissRealtimeReminder(state: ReminderStoreCompatibleState) {
  return state.dismissRealtimeReminder;
}

export function selectDismissRealtimeRemindersForTarget(
  state: ReminderStoreCompatibleState,
) {
  return state.dismissRealtimeRemindersForTarget;
}

export function useRealtimeReminders() {
  return useWorkspaceStore(selectRealtimeReminders);
}

export function usePushRealtimeReminder() {
  return useWorkspaceStore(selectPushRealtimeReminder);
}

export function useDismissRealtimeReminder() {
  return useWorkspaceStore(selectDismissRealtimeReminder);
}

export function useDismissRealtimeRemindersForTarget() {
  return useWorkspaceStore(selectDismissRealtimeRemindersForTarget);
}

export function getReminderSnapshot() {
  return {
    realtimeReminders: selectRealtimeReminders(useWorkspaceStore.getState()),
  };
}

export function getReminderActions() {
  const state = useWorkspaceStore.getState();
  return {
    dismissRealtimeReminder: state.dismissRealtimeReminder,
    dismissRealtimeRemindersForTarget: state.dismissRealtimeRemindersForTarget,
    pushRealtimeReminder: state.pushRealtimeReminder,
  };
}
