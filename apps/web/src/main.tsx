import React, { lazy, Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider } from './contexts/ThemeContext';
import './index.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element #root not found');
}

const basePath = import.meta.env.VITE_BASE_PATH || '/';

const AuthShell = lazy(() =>
  import('./AuthShell').then(m => ({ default: m.AuthShell }))
);

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <ThemeProvider>
      <Suspense>
        <AuthShell basePath={basePath} />
      </Suspense>
    </ThemeProvider>
  </React.StrictMode>
);
