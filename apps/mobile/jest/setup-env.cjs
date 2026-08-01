'use strict';

// Ensure process.env exists before jest-expo loads expo winter polyfills.
if (typeof globalThis.process === 'undefined') {
  globalThis.process = { env: {} };
}
if (process.env == null || typeof process.env !== 'object') {
  process.env = {};
}
process.env.EXPO_OS = process.env.EXPO_OS || 'ios';
process.env.EXPO_PUBLIC_USE_RN_FETCH =
  process.env.EXPO_PUBLIC_USE_RN_FETCH || 'false';

// React 19 test-renderer calls window.dispatchEvent for error reporting.
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
