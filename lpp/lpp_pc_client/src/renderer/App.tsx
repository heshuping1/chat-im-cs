import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import type { CSSProperties } from 'react';
import { Suspense, lazy, useEffect } from 'react';
import { LoginPage } from './components/LoginPage';
import { GatewayBridge } from './components/GatewayBridge';
import { ReminderCenter } from './components/ReminderCenter';
import { Sidebar } from './components/Sidebar';
import { ApiError } from './data/api-client';
import { useWorkspaceStore } from './data/store';
import './styles/theme.css';
import './styles/app.css';

const AiAssistantPage = lazy(() =>
  import('./components/AiAssistantPage').then((module) => ({
    default: module.AiAssistantPage,
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
  const { authSession, clearAuthSession } = useWorkspaceStore.getState();
  if (!authSession) return;
  queryClient.clear();
  clearAuthSession();
}

export default function App() {
  const activeModule = useWorkspaceStore((state) => state.activeModule);
  const listPaneWidth = useWorkspaceStore((state) => state.listPaneWidth);
  const profilePaneWidth = useWorkspaceStore((state) => state.profilePaneWidth);
  const authSession = useWorkspaceStore((state) => state.authSession);
  const pcSettings = useWorkspaceStore((state) => state.pcSettings);
  const messageProfileVisible = useWorkspaceStore(
    (state) => state.messageProfileVisible,
  );

  useTransientScrollbars();
  useAppearanceSettings(pcSettings);

  return (
    <QueryClientProvider client={queryClient}>
      {!authSession ? (
        <LoginPage />
      ) : (
        <div
          className={`app-shell ${
            activeModule === 'messages'
                ? `messages-layout ${messageProfileVisible ? '' : 'profile-collapsed'}`
              : 'page-layout'
          } ${pcSettings.highDensityContext ? 'is-density-compact' : ''} ${
            pcSettings.highContrastBoundary ? 'is-boundary-strong' : ''
          }`}
          data-theme={pcSettings.theme}
          data-skin={pcSettings.skin}
          style={
            activeModule === 'messages'
              ? ({
                  '--list-pane-width': `${listPaneWidth}px`,
                  '--profile-pane-width': `${profilePaneWidth}px`,
                } as CSSProperties)
              : undefined
          }
        >
          <GatewayBridge />
          <Sidebar />
          <ReminderCenter />
          <Suspense fallback={<PageFallback />}>
            {activeModule === 'onlineService' && <OnlineServicePage />}
            {activeModule === 'messages' && <MessageCenter />}
            {activeModule === 'contacts' && <ContactsPage />}
            {activeModule === 'knowledgeBase' && <KnowledgeBasePage />}
            {activeModule === 'aiAssistant' && <AiAssistantPage />}
            {activeModule === 'enterpriseSwitch' && <EnterpriseSwitchPage />}
            {activeModule === 'favorites' && <FavoritesPage />}
            {activeModule === 'ticketCenter' && <TicketCenterPage />}
            {activeModule === 'dataCenter' && <DataCenterPage />}
            {activeModule === 'workbench' && <WorkbenchPage />}
            {activeModule === 'settings' && <MePage />}
          </Suspense>
        </div>
      )}
    </QueryClientProvider>
  );
}

function useAppearanceSettings(settings: ReturnType<typeof useWorkspaceStore.getState>['pcSettings']) {
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

function fontSizeDatasetValue(fontSize: ReturnType<typeof useWorkspaceStore.getState>['pcSettings']['fontSize']) {
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
