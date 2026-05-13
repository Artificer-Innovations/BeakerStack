import { useState, useCallback } from 'react';
import { useNetwork } from './NetworkContext';
import { enqueue } from './requestQueue';

type Options<T> = {
  mutationFn: (arg: T) => Promise<void>;
  optimisticUpdate: (arg: T) => void;
  rollback: (arg: T) => void;
};

export function useOptimisticMutation<T>({ mutationFn, optimisticUpdate, rollback }: Options<T>) {
  const { isInternetReachable } = useNetwork();
  const [pending, setPending] = useState(false);

  const mutate = useCallback(async (arg: T) => {
    optimisticUpdate(arg);
    setPending(true);
    try {
      await enqueue(() => mutationFn(arg), isInternetReachable);
    } catch (err) {
      rollback(arg);
      throw err;
    } finally {
      setPending(false);
    }
  }, [mutationFn, optimisticUpdate, rollback, isInternetReachable]);

  return { mutate, pending };
}
