import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@shared/contexts/AuthContext';
import { ProfileProvider } from '@shared/contexts/ProfileContext';
import { supabase } from './lib/supabase';
import App from './App';
import './index.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element #root not found');
}

// Get base path from environment variable, defaulting to '/' for local development
const basePath = import.meta.env.VITE_BASE_PATH || '/';

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <AuthProvider supabaseClient={supabase}>
      <ProfileProvider supabaseClient={supabase}>
        <BrowserRouter basename={basePath}>
          <App />
        </BrowserRouter>
      </ProfileProvider>
    </AuthProvider>
  </React.StrictMode>
);
