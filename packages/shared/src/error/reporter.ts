export interface ErrorReporter {
  captureException(error: Error, context?: Record<string, unknown>): void;
}

let _adapter: ErrorReporter | null = null;

export const reporter = {
  init(adapter: ErrorReporter): void {
    _adapter = adapter;
  },
  captureException(error: Error, context?: Record<string, unknown>): void {
    _adapter?.captureException(error, context);
  },
};
