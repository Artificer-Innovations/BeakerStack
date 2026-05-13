type QueueEntry = {
  fn: () => Promise<unknown>;
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
};

const _queue: QueueEntry[] = [];
let _draining = false;

// true or null = allow; false = offline
function online(r: boolean | null): boolean {
  return r !== false;
}

export function enqueue<T>(fn: () => Promise<T>, isInternetReachable: boolean | null): Promise<T> {
  if (online(isInternetReachable)) {
    return fn();
  }
  return new Promise<T>((resolve, reject) => {
    _queue.push({
      fn: fn as () => Promise<unknown>,
      resolve: resolve as (v: unknown) => void,
      reject,
    });
  });
}

export async function drainQueue(isInternetReachable: boolean | null): Promise<void> {
  if (_draining || !online(isInternetReachable)) return;
  _draining = true;
  while (_queue.length > 0 && online(isInternetReachable)) {
    const entry = _queue.shift()!;
    try {
      entry.resolve(await entry.fn());
    } catch (err) {
      // Non-network errors (HTTP 4xx) reject this entry without blocking subsequent ones
      entry.reject(err);
    }
  }
  _draining = false;
}
