import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { installRuntimeErrorDiagnostics } from './data/diagnostics/runtime-error-diagnostics';
import { markRendererEntry } from './data/performance/startup-performance';
import { I18nProvider } from './i18n/I18nProvider';

installRuntimeErrorDiagnostics();
markRendererEntry();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </React.StrictMode>,
);
