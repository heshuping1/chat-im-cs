import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import type { CSSProperties } from 'react';
import { Suspense, lazy, useEffect } from 'react';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import { LoginPage } from './components/LoginPage';
import { ReminderCenter } from './components/ReminderCenter';
import { Sidebar } from './components/Sidebar';
import { ApiError } from './data/api-client';
import {
  getAuthSessionSnapshot,
  getClearAuthSessionAction,
  useAuthSession,
  useRestoreDesktopAuthSession,
  useSetAuthSession,
} from './data/auth/auth-store';
import { siteLineManager } from './data/network/site-line-manager';
import { recordMessageReminderDiagnostic } from './data/diagnostics/message-reminder-diagnostics';
import { markFirstInteractive } from './data/performance/startup-performance';
import { subscribeDesktopNotificationClicks } from './data/reminder/reminder-service';
import type { PcSettings } from './data/settings/pc-settings';
import { usePcSettings } from './data/settings/settings-store';
import type { ModuleKey } from './data/types';
import {
  derivePcWorkspaceAccess,
  normalizeActiveModuleForAccess,
  type PcWorkspaceAccess,
} from './data/workspace-access';
import {
  useActiveModule,
  useListPaneWidth,
  useMessageLayoutMode,
  useMessageProfileVisible,
  useProfilePaneWidth,
  useServiceLayoutMode,
  useSetActiveModule,
  useSetActiveImConversation,
  useSetActiveThread,
} from './data/workspace-ui/workspace-ui-store';
import './styles/theme.css';
import './styles/shared/panel-state.css';
import './styles/app.css';
import './styles/account/auth.css';
import './styles/shared/app-shell.css';
import './styles/messages/message-shared.css';
import './styles/messages/message-media-content.css';
import './styles/messages/composer-shell.css';
import './styles/pages/product-pages.css';
import './styles/shared/porcelain-shell.css';
import './styles/customer-service/customer-service-skin.css';
import './styles/messages/composer-rich-input.css';
import './styles/shared/porcelain-presence-footer.css';
import './styles/pages/workbench-knowledge.css';
import './styles/shared/scrollbar-theme-bridge.css';
import './styles/contacts/contacts.css';
import './styles/settings/settings.css';
import './styles/customer-service/customer-service.css';
import './styles/messages/message-center.css';
import './styles/messages/context-menu.css';
import './styles/messages/toast.css';

const GatewayBridge = lazy(() =>
  import('./components/GatewayBridge').then((module) => ({
    default: module.GatewayBridge,
  })),
);
const EnterpriseSwitchPage = lazy(() =>
  import('./components/AccountUtilityPages').then((module) => ({
    default: module.EnterpriseSwitchPage,
  })),
);
const FavoritesPage = lazy(() =>
  import('./components/AccountUtilityPages').then((module) => ({
    default: module.FavoritesPage,
  })),
);
const ContactsPage = lazy(() =>
  import('./components/ContactsPage').then((module) => ({
    default: module.ContactsPage,
  })),
);
const DataCenterPage = lazy(() =>
  import('./components/DataCenterPage').then((module) => ({
    default: module.DataCenterPage,
  })),
);
const CustomerDetailPage = lazy(() =>
  import('./components/CustomerDetailPage').then((module) => ({
    default: module.CustomerDetailPage,
  })),
);
const KnowledgeBasePage = lazy(() =>
  import('./components/KnowledgeBasePage').then((module) => ({
    default: module.KnowledgeBasePage,
  })),
);
const MePage = lazy(() =>
  import('./components/MePage').then((module) => ({
    default: module.MePage,
  })),
);
const MessageCenter = lazy(() =>
  import('./components/MessageCenter').then((module) => ({
    default: module.MessageCenter,
  })),
);
const OnlineServicePage = lazy(() =>
  import('./components/OnlineServicePage').then((module) => ({
    default: module.OnlineServicePage,
  })),
);
const TicketCenterPage = lazy(() =>
  import('./components/TicketCenterPage').then((module) => ({
    default: module.TicketCenterPage,
  })),
);
const WorkbenchPage = lazy(() =>
  import('./components/WorkbenchPage').then((module) => ({
    default: module.WorkbenchPage,
  })),
);

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: handleUnauthorizedError,
  }),
  mutationCache: new MutationCache({
    onError: handleUnauthorizedError,
  }),
  defaultOptions: {
    queries: {
      retry: (failureCount, error) =>
        !(error instanceof ApiError && error.status === 401) && failureCount < 1,
      staleTime: 10_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
    },
  },
});

function handleUnauthorizedError(error: unknown) {
  if (!(error instanceof ApiError) || error.status !== 401) return;
  const authSession = getAuthSessionSnapshot();
  if (!authSession) return;
  queryClient.clear();
  getClearAuthSessionAction()();
}

export default function App() {
  const activeModule = useActiveModule();
  const setActiveModule = useSetActiveModule();
  const setActiveImConversation = useSetActiveImConversation();
  const setActiveThread = useSetActiveThread();
  const listPaneWidth = useListPaneWidth();
  const profilePaneWidth = useProfilePaneWidth();
  const authSession = useAuthSession();
  const restoreDesktopAuthSession = useRestoreDesktopAuthSession();
  const setAuthSession = useSetAuthSession();
  const pcSettings = usePcSettings();
  const messageProfileVisible = useMessageProfileVisible();
  const messageLayoutMode = useMessageLayoutMode();
  const serviceLayoutMode = useServiceLayoutMode();
  const workspaceAccess = derivePcWorkspaceAccess(authSession);
  const safeKnownModule = normalizeActiveModule(activeModule);
  const safeActiveModule = normalizeActiveModuleForAccess(
    safeKnownModule,
    workspaceAccess,
  );

  useTransientScrollbars();
  useAppearanceSettings(pcSettings);
  useEffect(() => {
    if (activeModule !== safeActiveModule) setActiveModule(safeActiveModule);
  }, [activeModule, safeActiveModule, setActiveModule]);
  useEffect(() => {
    void restoreDesktopAuthSession?.();
  }, [restoreDesktopAuthSession]);
  useEffect(() => {
    let cancelled = false;
    void siteLineManager.bootstrap().then((result) => {
      if (cancelled) return;
      const latestSession = getAuthSessionSnapshot();
      if (!latestSession || latestSession.apiBaseUrl === result.currentSite.apiBaseUrl) return;
      queryClient.clear();
      setAuthSession({ ...latestSession, apiBaseUrl: result.currentSite.apiBaseUrl });
    });
    return () => {
      cancelled = true;
    };
  }, [setAuthSession]);
  useEffect(() => {
    const lineState = siteLineManager.getSnapshot();
    if (!authSession || !lineState.initialized) return;
    if (authSession.apiBaseUrl === lineState.currentSite.apiBaseUrl) return;
    queryClient.clear();
    setAuthSession({ ...authSession, apiBaseUrl: lineState.currentSite.apiBaseUrl });
  }, [authSession, setAuthSession]);
  useEffect(() => {
    markFirstInteractive(authSession ? 'authenticated-shell' : 'login');
  }, [authSession]);
  useEffect(() => {
    if (!authSession) return;
    recordMessageReminderDiagnostic({
      event: 'app.renderer.mounted',
      source: 'app',
      phase: 'mounted',
      route: safeActiveModule,
      classification: {
        activeModule,
        desktopApiPresent: Boolean(window.desktopApi),
        dev: import.meta.env.DEV,
        href: window.location.href,
        safeActiveModule,
      },
    });
  }, [activeModule, authSession, safeActiveModule]);
  useEffect(() => {
    if (!authSession) return undefined;
    return subscribeDesktopNotificationClicks((payload) => {
      const targetId = payload.targetId || payload.conversationId;
      if (payload.targetModule === 'onlineService' || payload.channel === 'serviceQueue') {
        if (targetId) setActiveThread(targetId);
        setActiveModule('onlineService');
        return;
      }
      if (payload.targetModule === 'contacts') {
        setActiveModule('contacts');
        return;
      }
      if (targetId) {
        setActiveImConversation(targetId);
        return;
      }
      setActiveModule('messages');
    });
  }, [authSession, setActiveImConversation, setActiveModule, setActiveThread]);

  return (
    <QueryClientProvider client={queryClient}>
      <AppErrorBoundary
        activeModule={authSession ? safeActiveModule : 'login'}
        resetKey={authSession ? safeActiveModule : 'login'}
      >
        {!authSession ? (
          <LoginPage />
        ) : (
          <div
            className={`app-shell ${
              safeActiveModule === 'messages'
                ? `messages-layout layout-${messageLayoutMode} ${messageProfileVisible ? '' : 'profile-collapsed'}`
                : safeActiveModule === 'onlineService'
                  ? `service-layout layout-${serviceLayoutMode}`
                  : 'page-layout'
            } ${pcSettings.highDensityContext ? 'is-density-compact' : ''} ${
              pcSettings.highContrastBoundary ? 'is-boundary-strong' : ''
            }`}
            data-theme={pcSettings.theme}
            data-skin={pcSettings.skin}
            style={
              safeActiveModule === 'messages'
                ? ({
                    '--list-pane-width': `${listPaneWidth}px`,
                    '--profile-pane-width': `${profilePaneWidth}px`,
                  } as CSSProperties)
                : undefined
            }
          >
            <Suspense fallback={null}>
              <GatewayBridge />
            </Suspense>
            <Sidebar />
            <ReminderCenter />
            <Suspense fallback={<PageFallback />}>
              <ActiveModulePage
                activeModule={safeActiveModule}
                workspaceAccess={workspaceAccess}
              />
            </Suspense>
          </div>
        )}
      </AppErrorBoundary>
    </QueryClientProvider>
  );
}

function ActiveModulePage({
  activeModule,
  workspaceAccess,
}: {
  activeModule: ModuleKey;
  workspaceAccess: PcWorkspaceAccess;
}) {
  if (!workspaceAccess.visibleModules.includes(activeModule)) return <MessageCenter />;
  switch (activeModule) {
    case 'onlineService':
      return <OnlineServicePage />;
    case 'messages':
      return <MessageCenter />;
    case 'contacts':
      return <ContactsPage />;
    case 'knowledgeBase':
      return <KnowledgeBasePage />;
    case 'enterpriseSwitch':
      return <EnterpriseSwitchPage />;
    case 'favorites':
      return <FavoritesPage />;
    case 'ticketCenter':
      return <TicketCenterPage />;
    case 'customerDetail':
      return <CustomerDetailPage />;
    case 'dataCenter':
      return <DataCenterPage dataCenterView={workspaceAccess.dataCenterView} />;
    case 'workbench':
      return <WorkbenchPage />;
    case 'settings':
      return <MePage />;
    default:
      return <MessageCenter />;
  }
}

function normalizeActiveModule(activeModule: ModuleKey): ModuleKey {
  return knownModuleKeys.has(activeModule) ? activeModule : 'messages';
}

const knownModuleKeys = new Set<ModuleKey>([
  'messages',
  'onlineService',
  'knowledgeBase',
  'contacts',
  'ticketCenter',
  'customerDetail',
  'dataCenter',
  'workbench',
  'enterpriseSwitch',
  'favorites',
  'settings',
]);

function useAppearanceSettings(settings: PcSettings) {
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = settings.theme;
    root.dataset.skin = settings.skin;
    root.dataset.fontSize = fontSizeDatasetValue(settings.fontSize);
    root.dataset.density = settings.highDensityContext ? 'compact' : 'comfortable';
    root.dataset.boundary = settings.highContrastBoundary ? 'strong' : 'standard';
    root.dataset.motion = settings.reduceMotion ? 'reduced' : 'standard';
    return () => {
      delete root.dataset.theme;
      delete root.dataset.skin;
      delete root.dataset.fontSize;
      delete root.dataset.density;
      delete root.dataset.boundary;
      delete root.dataset.motion;
    };
  }, [
    settings.fontSize,
    settings.highContrastBoundary,
    settings.highDensityContext,
    settings.reduceMotion,
    settings.skin,
    settings.theme,
  ]);
}

function fontSizeDatasetValue(fontSize: PcSettings['fontSize']) {
  switch (fontSize) {
    case '小':
      return 'small';
    case '大':
      return 'large';
    case '超大':
      return 'extra-large';
    default:
      return 'standard';
  }
}

function useTransientScrollbars() {
  useEffect(() => {
    const timers = new WeakMap<Element, number>();
    const onScroll = (event: Event) => {
      const target =
        event.target instanceof Element ? event.target : document.scrollingElement;
      if (!target) return;
      target.classList.add('is-scrolling');
      const previousTimer = timers.get(target);
      if (previousTimer) window.clearTimeout(previousTimer);
      timers.set(
        target,
        window.setTimeout(() => {
          target.classList.remove('is-scrolling');
          timers.delete(target);
        }, 360),
      );
    };
    window.addEventListener('scroll', onScroll, true);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      document.querySelectorAll('.is-scrolling').forEach((element) => {
        element.classList.remove('is-scrolling');
      });
    };
  }, []);
}

function PageFallback() {
  return (
    <main className="page-fallback" aria-live="polite">
      正在加载...
    </main>
  );
}
