import { BrowserRouter } from 'react-router';
import App from './App';

export interface PublicShellProps {
  basePath: string;
}

export function PublicShell({ basePath }: PublicShellProps) {
  return (
    <BrowserRouter basename={basePath}>
      <App />
    </BrowserRouter>
  );
}
