import type { ErrorReporter } from '../reporter';

export class ConsoleAdapter implements ErrorReporter {
  captureException(error: Error, context?: Record<string, unknown>): void {
    // console.warn avoids triggering React Native's red screen overlay
    console.warn('[ErrorReporter]', new Date().toISOString(), error, context);
  }
}
