import React, { createContext, useContext, useEffect, type ReactNode } from 'react';
import { useNetworkStatus, type NetworkStatus } from './useNetworkStatus';
import { drainQueue } from './requestQueue';

const STUB_STATUS: NetworkStatus = { isConnected: null, isInternetReachable: null, type: 'unknown' };

const NetworkContext = createContext<NetworkStatus>(STUB_STATUS);

const ENABLED = process.env.EXPO_PUBLIC_OFFLINE_RESILIENCE_ENABLED === 'true';

export function NetworkProvider({ children }: { children: ReactNode }) {
  const status = useNetworkStatus();

  useEffect(() => {
    if (status.isInternetReachable === true) {
      void drainQueue(status.isInternetReachable);
    }
  }, [status.isInternetReachable]);

  if (!ENABLED) {
    return <NetworkContext.Provider value={STUB_STATUS}>{children}</NetworkContext.Provider>;
  }
  return <NetworkContext.Provider value={status}>{children}</NetworkContext.Provider>;
}

export function useNetwork(): NetworkStatus {
  return useContext(NetworkContext);
}
