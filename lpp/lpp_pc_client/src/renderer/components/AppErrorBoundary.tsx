import { Component, type ErrorInfo, type ReactNode } from 'react';
import { logRuntimeErrorDiagnostic } from '../data/diagnostics/runtime-error-diagnostics';

interface AppErrorBoundaryProps {
  children: ReactNode;
  resetKey?: string;
}

interface AppErrorBoundaryState {
  error: Error | null;
}

export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    logRuntimeErrorDiagnostic({
      event: 'renderer.error',
      error,
      message: info.componentStack ?? undefined,
      source: 'AppErrorBoundary',
    });
  }

  componentDidUpdate(previousProps: AppErrorBoundaryProps) {
    if (
      this.state.error &&
      previousProps.resetKey !== this.props.resetKey
    ) {
      this.setState({ error: null });
    }
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="app-error-fallback" role="alert">
        <section>
          <h1>PC 客户端加载失败</h1>
          <p>{this.state.error.message || '渲染进程出现未知错误。'}</p>
          <div className="app-error-actions">
            <button type="button" onClick={() => window.location.reload()}>
              重新加载
            </button>
          </div>
        </section>
      </main>
    );
  }
}
