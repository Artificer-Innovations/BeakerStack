// Self-contained Deno port of packages/email. Shared across Edge Functions via relative import.
// Keep in sync with packages/email/src/ — no automated sync guard exists between this file and its npm source.

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface EmailAdapter {
  send(params: EmailMessage): Promise<void>;
}

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

export function createLogEmailAdapter(
  log: (line: string) => void = (line: string) => console.log(line)
): EmailAdapter {
  return {
    async send(params: EmailMessage) {
      // Metadata only — omit body so Edge logs avoid PII.
      log(`[beakerstack/email] to=${params.to} subject=${params.subject}`);
    },
  };
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
        const text = await res.text();
        let body: unknown;
        try {
          body = JSON.parse(text);
        } catch {
          body = text;
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

export function renderEmailTemplate(
  template: string,
  vars: Record<string, string>
): string {
  return Object.entries(vars).reduce(
    (acc, [key, value]) => acc.replaceAll(`{{${key}}}`, value),
    template
  );
}
