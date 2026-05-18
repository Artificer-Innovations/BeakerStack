import { describe, expect, it } from 'vitest';
import { defineWaitlistConfig } from './schema.js';

describe('defineWaitlistConfig', () => {
  it('parses minimal config', () => {
    const c = defineWaitlistConfig({
      productId: 'beakerstack',
      appOrigin: 'http://localhost:5173',
      emailTemplates: {
        inviteSubject: 'You are invited',
        inviteHtml: '<p>{{inviteUrl}}</p>',
      },
    });
    expect(c.productId).toBe('beakerstack');
  });
});
