export type { EmailAdapter, EmailMessage } from './types.js';
export { createLogEmailAdapter } from './logAdapter.js';
export { createResendEmailAdapter, EmailSendError } from './resendAdapter.js';
export { renderEmailTemplate } from './renderTemplate.js';
