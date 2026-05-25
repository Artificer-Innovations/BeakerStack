export interface MarketingEmailAdapter {
  subscribeUser(email: string, tags: string[]): Promise<void>;
  applyTag(email: string, tag: string): Promise<void>;
  removeTag(email: string, tag: string): Promise<void>;
  deleteUser(email: string): Promise<void>;
  /**
   * Phase 4 (#286): validate HMAC signature and return identical response
   * bodies regardless of whether the email exists (prevents email enumeration).
   */
  handleWebhook?(req: Request): Promise<Response>;
}
