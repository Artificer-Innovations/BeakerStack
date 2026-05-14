import React from 'react';
import ReactDOM, { hydrateRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@beakerstack/shared/contexts/AuthContext';
import { ProfileProvider } from '@beakerstack/shared/contexts/ProfileContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { supabase } from './lib/supabase';
import App from './App';
import './index.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element #root not found');
}

// Get base path from environment variable, defaulting to '/' for local development
const basePath = import.meta.env.VITE_BASE_PATH || '/';

const app = (
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider supabaseClient={supabase}>
        <ProfileProvider supabaseClient={supabase}>
          <BrowserRouter basename={basePath}>
            <App />
          </BrowserRouter>
        </ProfileProvider>
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>
);

// Use hydrateRoot when prerendered HTML is present (home page served from
// prerender-home.html), createRoot for all other routes where #root is empty.
if (rootElement.childElementCount > 0) {
  // Pre-warm the home page bundle so React.lazy resolves from cache without suspending.
  // App wraps Routes in <Suspense fallback={null}>; if HomePage suspends at hydrateRoot
  // time, React shows null against the prerendered DOM — mismatch triggers error #418.
  import('./pages/HomePage').then(() => {
    hydrateRoot(rootElement, app);
  });
} else {
  ReactDOM.createRoot(rootElement).render(app);
}
