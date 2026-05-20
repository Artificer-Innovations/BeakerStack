import { Logger } from '@beakerstack/logger';
import type { EmailAdapter, EmailMessage } from './types.js';

/** Default dev adapter: logs invite delivery without sending mail. */
export function createLogEmailAdapter(
  log: (line: string) => void = line => Logger.info(line)
): EmailAdapter {
  return {
    async send(params: EmailMessage) {
      log(
        `[beakerstack/email] to=${params.to} subject=${params.subject}\n${params.text ?? params.html}`
      );
    },
  };
}
