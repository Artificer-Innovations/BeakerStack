import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider } from './contexts/ThemeContext';
import { PublicShell } from './PublicShell';
import './index.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element #root not found');
}

const basePath = import.meta.env.VITE_BASE_PATH || '/';

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <ThemeProvider>
      <PublicShell basePath={basePath} />
    </ThemeProvider>
  </React.StrictMode>
);
