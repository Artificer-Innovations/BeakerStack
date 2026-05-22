import type { EmailAdapter, EmailMessage } from './types.js';

export class EmailSendError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly body?: unknown
  ) {
    super(message);
    this.name = 'EmailSendError';
  }
}

export function createResendEmailAdapter({
  apiKey,
  from,
}: {
  apiKey: string;
  from: string;
}): EmailAdapter {
  return {
    async send(params: EmailMessage) {
      const payload: Record<string, unknown> = {
        from,
        to: [params.to],
        subject: params.subject,
        html: params.html,
      };
      if (params.text !== undefined) payload['text'] = params.text;

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let body: unknown;
        try {
          body = await res.json();
        } catch {
          body = await res.text();
        }
        throw new EmailSendError(
          `Resend API error: ${res.status}`,
          res.status,
          body
        );
      }
    },
  };
}
