import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { installRuntimeErrorDiagnostics } from './data/diagnostics/runtime-error-diagnostics';
import { markRendererEntry } from './data/performance/startup-performance';

installRuntimeErrorDiagnostics();
markRendererEntry();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
