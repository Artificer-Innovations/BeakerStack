'use strict';

// React Native / Expo Jest: ensure process.env exists before modules read EXPO_PUBLIC_*.
if (typeof globalThis.process === 'undefined') {
  globalThis.process = { env: {} };
}
if (process.env == null || typeof process.env !== 'object') {
  process.env = {};
}
process.env.EXPO_OS = process.env.EXPO_OS || 'ios';

// React 19 test-renderer may call window.dispatchEvent for error reporting.
if (typeof globalThis.window === 'undefined') {
  globalThis.window = globalThis;
}
if (typeof globalThis.window.dispatchEvent !== 'function') {
  globalThis.window.dispatchEvent = () => true;
}
if (typeof globalThis.Event === 'undefined') {
  globalThis.Event = class Event {
    constructor(type) {
      this.type = type;
    }
  };
}
