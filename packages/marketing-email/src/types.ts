export interface MarketingEmailAdapter {
  subscribeUser(email: string, tags: string[]): Promise<void>;
  applyTag(email: string, tag: string): Promise<void>;
  removeTag(email: string, tag: string): Promise<void>;
  deleteUser(email: string): Promise<void>;
  handleWebhook?(req: Request): Promise<Response>;
}
