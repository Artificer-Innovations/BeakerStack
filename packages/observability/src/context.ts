import { createContext, useContext } from 'react';
import type { ObservabilityHandle } from './types.js';

export const ObservabilityContext = createContext<ObservabilityHandle | null>(
  null
);

export function useObservability(): ObservabilityHandle {
  const ctx = useContext(ObservabilityContext);
  if (!ctx)
    throw new Error(
      'useObservability must be called inside <ObservabilityProvider>'
    );
  return ctx;
}
