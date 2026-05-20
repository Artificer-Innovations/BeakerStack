import type { EmailAdapter, EmailMessage } from './types.js';

function defaultLog(line: string): void {
  // eslint-disable-next-line no-console -- dev adapter logs without sending mail
  console.log(line);
}

/** Default dev adapter: logs invite delivery without sending mail. */
export function createLogEmailAdapter(
  log: (line: string) => void = defaultLog
): EmailAdapter {
  return {
    async send(params: EmailMessage) {
      log(
        `[beakerstack/email] to=${params.to} subject=${params.subject}\n${params.text ?? params.html}`
      );
    },
  };
}
