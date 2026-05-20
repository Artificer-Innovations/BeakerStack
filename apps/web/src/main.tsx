import React from 'react';
import ReactDOM from 'react-dom/client';
import {
  initObservability,
  ObservabilityProvider,
} from '@beakerstack/observability/web';
import { beakerstackObservabilityConfig } from './config/observability';
import { setupLogging } from './setupLogging';
import { ThemeProvider } from './contexts/ThemeContext';
import { PublicShell } from './PublicShell';
import './index.css';

void initObservability(beakerstackObservabilityConfig);
setupLogging();

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element #root not found');
}

const basePath = import.meta.env.VITE_BASE_PATH || '/';

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <ObservabilityProvider config={beakerstackObservabilityConfig}>
      <ThemeProvider>
        <PublicShell basePath={basePath} />
      </ThemeProvider>
    </ObservabilityProvider>
  </React.StrictMode>
);
