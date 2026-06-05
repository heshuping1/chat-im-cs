import { Component, type ErrorInfo, type ReactNode } from 'react';
import { logRuntimeErrorDiagnostic } from '../data/diagnostics/runtime-error-diagnostics';
import { I18nContext } from '../i18n/I18nProvider';

interface AppErrorBoundaryProps {
  activeModule?: string;
  children: ReactNode;
  resetKey?: string;
}

interface AppErrorBoundaryState {
  error: Error | null;
  referenceCode?: string;
}

export interface AppErrorFallbackModel {
  title: string;
  message: string;
  referenceCode: string;
}

const appErrorTitle = 'PC \u5ba2\u6237\u7aef\u6682\u65f6\u65e0\u6cd5\u52a0\u8f7d';
const appErrorMessage =
  '\u754c\u9762\u6e32\u67d3\u51fa\u73b0\u5f02\u5e38\u3002\u8bf7\u5148\u91cd\u8bd5\u754c\u9762\uff0c\u82e5\u4ecd\u5931\u8d25\u518d\u91cd\u65b0\u52a0\u8f7d\u5ba2\u6237\u7aef\u3002';

export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return {
      error,
      referenceCode: createAppErrorReferenceCode(error),
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    logRuntimeErrorDiagnostic({
      event: 'renderer.error',
      error,
      message: info.componentStack ?? undefined,
      source: 'AppErrorBoundary',
      context: {
        activeModule: this.props.activeModule ?? this.props.resetKey,
        componentStack: info.componentStack ?? undefined,
        resetKey: this.props.resetKey,
        url: window.location.href,
      },
    });
  }

  componentDidUpdate(previousProps: AppErrorBoundaryProps) {
    if (
      this.state.error &&
      (previousProps.resetKey !== this.props.resetKey ||
        previousProps.activeModule !== this.props.activeModule)
    ) {
      this.setState({ error: null, referenceCode: undefined });
    }
  }

  retryRender = () => {
    this.setState({ error: null, referenceCode: undefined });
  };

  reloadClient = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;
    const fallback = createAppErrorFallbackModel(this.state.error);
    const referenceCode = this.state.referenceCode ?? fallback.referenceCode;
    return (
      <I18nContext.Consumer>
        {(i18n) => (
          <main className="app-error-fallback" role="alert">
            <section>
              <h1>{i18n?.t('app.errorTitle') ?? fallback.title}</h1>
              <p>{i18n?.t('app.errorMessage') ?? fallback.message}</p>
              <small>
                {i18n?.t('app.errorReference', { referenceCode }) ??
                  `\u9519\u8bef\u7f16\u53f7\uff1a${referenceCode}`}
              </small>
              <div className="app-error-actions">
                <button type="button" onClick={this.retryRender}>
                  {i18n?.t('app.errorRetry') ?? '\u91cd\u8bd5\u754c\u9762'}
                </button>
                <button type="button" onClick={this.reloadClient}>
                  {i18n?.t('app.reload') ?? '\u91cd\u65b0\u52a0\u8f7d'}
                </button>
              </div>
            </section>
          </main>
        )}
      </I18nContext.Consumer>
    );
  }
}

export function createAppErrorFallbackModel(error: Error | null): AppErrorFallbackModel {
  return {
    title: appErrorTitle,
    message: appErrorMessage,
    referenceCode: createAppErrorReferenceCode(error),
  };
}

export function createAppErrorReferenceCode(error: Error | null) {
  const name = error?.name ?? 'UnknownError';
  const message = error?.message ?? 'unknown';
  return `PC-ERR-${hashAppErrorText(`${name}:${sanitizeAppErrorText(message)}`)}`;
}

function sanitizeAppErrorText(value: string) {
  return value.replace(
    /Bearer\s+[A-Za-z0-9._~+/=-]+|token=[^&\s]+|password=[^&\s]+/gi,
    '[redacted]',
  );
}

function hashAppErrorText(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }
  return Math.abs(hash).toString(36).toUpperCase().padStart(6, '0').slice(0, 6);
}
