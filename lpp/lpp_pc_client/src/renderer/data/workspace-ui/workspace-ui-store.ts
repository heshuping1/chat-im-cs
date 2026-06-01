import {
  useWorkspaceStore,
  type MessageLayoutMode,
  type ServiceLayoutMode,
  type ServiceAssistantPane,
} from "./workspace-store-core";
import type { TrayStatus } from "../../../shared/desktop-api";
import type { ContactFilter, ModuleKey } from "../types";
import type { CustomerServiceStatus } from "../types";

export type {
  MessageLayoutMode,
  ServiceAssistantPane,
  ServiceLayoutMode,
} from "./workspace-store-core";

export type ServiceThreadFilter = "all" | "queued" | "serving" | "sla";
export type MessageConversationFilter = "all" | "friends" | "groups" | "unread";

// UI state is still backed by workspace store during P2.
// New callers should depend on this file instead of reading UI fields directly.
export interface WorkspaceUiCompatibleState {
  activeModule: ModuleKey;
  activeThreadId: string;
  openServiceThreadIds: string[];
  activeImConversationId: string;
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
  filter: ServiceThreadFilter;
  messageFilter: MessageConversationFilter;
  contactFilter: ContactFilter;
  imPresenceStatus: TrayStatus;
  customerServiceStatus: CustomerServiceStatus;
  setActiveModule: (module: ModuleKey) => void;
  setActiveThread: (id: string) => void;
  closeOpenServiceThread: (id: string) => void;
  setActiveImConversation: (id: string) => void;
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
  setFilter: (filter: ServiceThreadFilter) => void;
  setMessageFilter: (filter: MessageConversationFilter) => void;
  setContactFilter: (filter: ContactFilter) => void;
  setImPresenceStatus: (status: TrayStatus) => void;
  setCustomerServiceStatus: (status: CustomerServiceStatus) => void;
}

export function selectActiveModule(state: WorkspaceUiCompatibleState) {
  return state.activeModule;
}

export function selectSetActiveModule(state: WorkspaceUiCompatibleState) {
  return state.setActiveModule;
}

export function selectActiveThreadId(state: WorkspaceUiCompatibleState) {
  return state.activeThreadId;
}

export function selectOpenServiceThreadIds(state: WorkspaceUiCompatibleState) {
  return state.openServiceThreadIds;
}

export function selectSetActiveThread(state: WorkspaceUiCompatibleState) {
  return state.setActiveThread;
}

export function selectCloseOpenServiceThread(state: WorkspaceUiCompatibleState) {
  return state.closeOpenServiceThread;
}

export function selectActiveImConversationId(state: WorkspaceUiCompatibleState) {
  return state.activeImConversationId;
}

export function selectSetActiveImConversation(state: WorkspaceUiCompatibleState) {
  return state.setActiveImConversation;
}

export function selectActiveContactId(state: WorkspaceUiCompatibleState) {
  return state.activeContactId;
}

export function selectSetActiveContact(state: WorkspaceUiCompatibleState) {
  return state.setActiveContact;
}

export function selectMessageLayoutState(state: WorkspaceUiCompatibleState) {
  return {
    listPaneWidth: state.listPaneWidth,
    messageLayoutMode: state.messageLayoutMode,
    messageProfileVisible: state.messageProfileVisible,
    profilePaneWidth: state.profilePaneWidth,
    setListPaneWidth: state.setListPaneWidth,
    setMessageLayoutMode: state.setMessageLayoutMode,
    setMessageProfileVisible: state.setMessageProfileVisible,
    setProfilePaneWidth: state.setProfilePaneWidth,
  };
}

export function selectListPaneWidth(state: WorkspaceUiCompatibleState) {
  return state.listPaneWidth;
}

export function selectSetListPaneWidth(state: WorkspaceUiCompatibleState) {
  return state.setListPaneWidth;
}

export function selectProfilePaneWidth(state: WorkspaceUiCompatibleState) {
  return state.profilePaneWidth;
}

export function selectSetProfilePaneWidth(state: WorkspaceUiCompatibleState) {
  return state.setProfilePaneWidth;
}

export function selectMessageProfileVisible(state: WorkspaceUiCompatibleState) {
  return state.messageProfileVisible;
}

export function selectSetMessageProfileVisible(state: WorkspaceUiCompatibleState) {
  return state.setMessageProfileVisible;
}

export function selectMessageLayoutMode(state: WorkspaceUiCompatibleState) {
  return state.messageLayoutMode;
}

export function selectSetMessageLayoutMode(state: WorkspaceUiCompatibleState) {
  return state.setMessageLayoutMode;
}

export function selectServiceLayoutState(state: WorkspaceUiCompatibleState) {
  return {
    serviceAssistantPane: state.serviceAssistantPane,
    serviceAssistantPaneWidth: state.serviceAssistantPaneWidth,
    serviceCustomerPaneCollapsed: state.serviceCustomerPaneCollapsed,
    serviceListPaneCollapsed: state.serviceListPaneCollapsed,
    serviceListPaneWidth: state.serviceListPaneWidth,
    serviceProfilePaneWidth: state.serviceProfilePaneWidth,
    serviceLayoutMode: state.serviceLayoutMode,
    setServiceAssistantPane: state.setServiceAssistantPane,
    setServiceAssistantPaneWidth: state.setServiceAssistantPaneWidth,
    setServiceCustomerPaneCollapsed: state.setServiceCustomerPaneCollapsed,
    setServiceLayoutMode: state.setServiceLayoutMode,
    setServiceListPaneCollapsed: state.setServiceListPaneCollapsed,
    setServiceListPaneWidth: state.setServiceListPaneWidth,
    setServiceProfilePaneWidth: state.setServiceProfilePaneWidth,
  };
}

export function selectServiceListPaneWidth(state: WorkspaceUiCompatibleState) {
  return state.serviceListPaneWidth;
}

export function selectSetServiceListPaneWidth(state: WorkspaceUiCompatibleState) {
  return state.setServiceListPaneWidth;
}

export function selectServiceProfilePaneWidth(state: WorkspaceUiCompatibleState) {
  return state.serviceProfilePaneWidth;
}

export function selectSetServiceProfilePaneWidth(state: WorkspaceUiCompatibleState) {
  return state.setServiceProfilePaneWidth;
}

export function selectServiceAssistantPaneWidth(state: WorkspaceUiCompatibleState) {
  return state.serviceAssistantPaneWidth;
}

export function selectSetServiceAssistantPaneWidth(state: WorkspaceUiCompatibleState) {
  return state.setServiceAssistantPaneWidth;
}

export function selectServiceCustomerPaneCollapsed(state: WorkspaceUiCompatibleState) {
  return state.serviceCustomerPaneCollapsed;
}

export function selectSetServiceCustomerPaneCollapsed(state: WorkspaceUiCompatibleState) {
  return state.setServiceCustomerPaneCollapsed;
}

export function selectServiceListPaneCollapsed(state: WorkspaceUiCompatibleState) {
  return state.serviceListPaneCollapsed;
}

export function selectSetServiceListPaneCollapsed(state: WorkspaceUiCompatibleState) {
  return state.setServiceListPaneCollapsed;
}

export function selectServiceAssistantPane(state: WorkspaceUiCompatibleState) {
  return state.serviceAssistantPane;
}

export function selectSetServiceAssistantPane(state: WorkspaceUiCompatibleState) {
  return state.setServiceAssistantPane;
}

export function selectServiceLayoutMode(state: WorkspaceUiCompatibleState) {
  return state.serviceLayoutMode;
}

export function selectSetServiceLayoutMode(state: WorkspaceUiCompatibleState) {
  return state.setServiceLayoutMode;
}

export function selectSidebarCollapsed(state: WorkspaceUiCompatibleState) {
  return state.sidebarCollapsed;
}

export function selectSetSidebarCollapsed(state: WorkspaceUiCompatibleState) {
  return state.setSidebarCollapsed;
}

export function selectServiceThreadFilter(state: WorkspaceUiCompatibleState) {
  return state.filter;
}

export function selectSetServiceThreadFilter(state: WorkspaceUiCompatibleState) {
  return state.setFilter;
}

export function selectMessageConversationFilter(state: WorkspaceUiCompatibleState) {
  return state.messageFilter;
}

export function selectSetMessageConversationFilter(state: WorkspaceUiCompatibleState) {
  return state.setMessageFilter;
}

export function selectContactFilter(state: WorkspaceUiCompatibleState) {
  return state.contactFilter;
}

export function selectSetContactFilter(state: WorkspaceUiCompatibleState) {
  return state.setContactFilter;
}

export function selectImPresenceStatus(state: WorkspaceUiCompatibleState) {
  return state.imPresenceStatus;
}

export function selectSetImPresenceStatus(state: WorkspaceUiCompatibleState) {
  return state.setImPresenceStatus;
}

export function selectCustomerServiceStatus(state: WorkspaceUiCompatibleState) {
  return state.customerServiceStatus;
}

export function selectSetCustomerServiceStatus(state: WorkspaceUiCompatibleState) {
  return state.setCustomerServiceStatus;
}

export function useActiveModule() {
  return useWorkspaceStore(selectActiveModule);
}

export function useSetActiveModule() {
  return useWorkspaceStore(selectSetActiveModule);
}

export function useActiveThreadId() {
  return useWorkspaceStore(selectActiveThreadId);
}

export function useOpenServiceThreadIds() {
  return useWorkspaceStore(selectOpenServiceThreadIds);
}

export function useSetActiveThread() {
  return useWorkspaceStore(selectSetActiveThread);
}

export function useCloseOpenServiceThread() {
  return useWorkspaceStore(selectCloseOpenServiceThread);
}

export function useActiveImConversationId() {
  return useWorkspaceStore(selectActiveImConversationId);
}

export function useSetActiveImConversation() {
  return useWorkspaceStore(selectSetActiveImConversation);
}

export function useActiveContactId() {
  return useWorkspaceStore(selectActiveContactId);
}

export function useSetActiveContact() {
  return useWorkspaceStore(selectSetActiveContact);
}

export function useMessageLayoutState() {
  return useWorkspaceStore(selectMessageLayoutState);
}

export function useListPaneWidth() {
  return useWorkspaceStore(selectListPaneWidth);
}

export function useSetListPaneWidth() {
  return useWorkspaceStore(selectSetListPaneWidth);
}

export function useProfilePaneWidth() {
  return useWorkspaceStore(selectProfilePaneWidth);
}

export function useSetProfilePaneWidth() {
  return useWorkspaceStore(selectSetProfilePaneWidth);
}

export function useMessageProfileVisible() {
  return useWorkspaceStore(selectMessageProfileVisible);
}

export function useSetMessageProfileVisible() {
  return useWorkspaceStore(selectSetMessageProfileVisible);
}

export function useMessageLayoutMode() {
  return useWorkspaceStore(selectMessageLayoutMode);
}

export function useSetMessageLayoutMode() {
  return useWorkspaceStore(selectSetMessageLayoutMode);
}

export function useServiceLayoutState() {
  return useWorkspaceStore(selectServiceLayoutState);
}

export function useServiceListPaneWidth() {
  return useWorkspaceStore(selectServiceListPaneWidth);
}

export function useSetServiceListPaneWidth() {
  return useWorkspaceStore(selectSetServiceListPaneWidth);
}

export function useServiceProfilePaneWidth() {
  return useWorkspaceStore(selectServiceProfilePaneWidth);
}

export function useSetServiceProfilePaneWidth() {
  return useWorkspaceStore(selectSetServiceProfilePaneWidth);
}

export function useServiceAssistantPaneWidth() {
  return useWorkspaceStore(selectServiceAssistantPaneWidth);
}

export function useSetServiceAssistantPaneWidth() {
  return useWorkspaceStore(selectSetServiceAssistantPaneWidth);
}

export function useServiceCustomerPaneCollapsed() {
  return useWorkspaceStore(selectServiceCustomerPaneCollapsed);
}

export function useSetServiceCustomerPaneCollapsed() {
  return useWorkspaceStore(selectSetServiceCustomerPaneCollapsed);
}

export function useServiceListPaneCollapsed() {
  return useWorkspaceStore(selectServiceListPaneCollapsed);
}

export function useSetServiceListPaneCollapsed() {
  return useWorkspaceStore(selectSetServiceListPaneCollapsed);
}

export function useServiceAssistantPane() {
  return useWorkspaceStore(selectServiceAssistantPane);
}

export function useSetServiceAssistantPane() {
  return useWorkspaceStore(selectSetServiceAssistantPane);
}

export function useServiceLayoutMode() {
  return useWorkspaceStore(selectServiceLayoutMode);
}

export function useSetServiceLayoutMode() {
  return useWorkspaceStore(selectSetServiceLayoutMode);
}

export function useSidebarCollapsed() {
  return useWorkspaceStore(selectSidebarCollapsed);
}

export function useSetSidebarCollapsed() {
  return useWorkspaceStore(selectSetSidebarCollapsed);
}

export function useServiceThreadFilter() {
  return useWorkspaceStore(selectServiceThreadFilter);
}

export function useSetServiceThreadFilter() {
  return useWorkspaceStore(selectSetServiceThreadFilter);
}

export function useMessageConversationFilter() {
  return useWorkspaceStore(selectMessageConversationFilter);
}

export function useSetMessageConversationFilter() {
  return useWorkspaceStore(selectSetMessageConversationFilter);
}

export function useContactFilter() {
  return useWorkspaceStore(selectContactFilter);
}

export function useSetContactFilter() {
  return useWorkspaceStore(selectSetContactFilter);
}

export function useImPresenceStatus() {
  return useWorkspaceStore(selectImPresenceStatus);
}

export function useSetImPresenceStatus() {
  return useWorkspaceStore(selectSetImPresenceStatus);
}

export function useCustomerServiceStatus() {
  return useWorkspaceStore(selectCustomerServiceStatus);
}

export function useSetCustomerServiceStatus() {
  return useWorkspaceStore(selectSetCustomerServiceStatus);
}

export function getWorkspaceUiSnapshot() {
  const state = useWorkspaceStore.getState();
  return {
    activeImConversationId: state.activeImConversationId,
    activeModule: state.activeModule,
    activeThreadId: state.activeThreadId,
  };
}
