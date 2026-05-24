import '@testing-library/jest-dom';
import '../../../../packages/shared-tests/setup.adopter';

/** Node's experimental `--localstorage-file` / partial mocks can expose a broken Storage. */
function createMemoryLocalStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      const v = store.get(key);
      return v === undefined ? null : v;
    },
    key(index: number) {
      return [...store.keys()][index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
  };
}

function localStorageIsUsable(ls: unknown): ls is Storage {
  if (!ls || typeof ls !== 'object') return false;
  const s = ls as Storage;
  return (
    typeof s.getItem === 'function' &&
    typeof s.setItem === 'function' &&
    typeof s.removeItem === 'function' &&
    typeof s.clear === 'function' &&
    typeof s.key === 'function' &&
    typeof s.length === 'number'
  );
}

if (!localStorageIsUsable(globalThis.localStorage)) {
  Object.defineProperty(globalThis, 'localStorage', {
    value: createMemoryLocalStorage(),
    configurable: true,
    writable: true,
  });
}

// jsdom does not implement window.matchMedia. Provide a stub so components
// that call it (e.g. ThemeProvider OS-preference watcher) don't throw.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});
