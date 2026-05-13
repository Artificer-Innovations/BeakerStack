import { Navigate } from 'react-router-dom';
import { useAuthContext } from '@beakerstack/shared/contexts/AuthContext';
import { LandingPage } from '../components/landing/LandingPage';

export default function HomePage() {
  const { user } = useAuthContext();

  if (user) {
    return <Navigate to='/dashboard' replace />;
  }

  return <LandingPage />;
}
