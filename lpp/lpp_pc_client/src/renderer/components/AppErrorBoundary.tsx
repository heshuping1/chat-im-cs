import { Component, type ErrorInfo, type ReactNode } from 'react';
import { logRuntimeErrorDiagnostic } from '../data/diagnostics/runtime-error-diagnostics';

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

const appErrorTitle = 'PC 客户端暂时无法加载';
const appErrorMessage =
  '界面渲染出现异常。请先重试界面，若仍失败再重新加载客户端。';

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
      <main className="app-error-fallback" role="alert">
        <section>
          <h1>{fallback.title}</h1>
          <p>{fallback.message}</p>
          <small>错误编号：{referenceCode}</small>
          <div className="app-error-actions">
            <button type="button" onClick={this.retryRender}>
              重试界面
            </button>
            <button type="button" onClick={this.reloadClient}>
              重新加载
            </button>
          </div>
        </section>
      </main>
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
  return value.replace(/Bearer\s+[A-Za-z0-9._~+/=-]+|token=[^&\s]+|password=[^&\s]+/gi, '[redacted]');
}

function hashAppErrorText(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }
  return Math.abs(hash).toString(36).toUpperCase().padStart(6, '0').slice(0, 6);
}
