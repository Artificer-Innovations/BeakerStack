import '@testing-library/jest-dom';

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
