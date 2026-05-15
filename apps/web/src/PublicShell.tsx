import { BrowserRouter } from 'react-router-dom';
import App from './App';

export interface PublicShellProps {
  basePath: string;
}

export function PublicShell({ basePath }: PublicShellProps) {
  return (
    <BrowserRouter
      basename={basePath}
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <App />
    </BrowserRouter>
  );
}
