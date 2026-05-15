import { BrowserRouter } from 'react-router-dom';
import App from './App';

interface PublicShellProps {
  basePath: string;
}

export function PublicShell({ basePath }: PublicShellProps) {
  return (
    <BrowserRouter basename={basePath}>
      <App />
    </BrowserRouter>
  );
}
