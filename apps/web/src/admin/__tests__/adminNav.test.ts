import { describe, expect, it } from 'vitest';
import { adminNavItems } from '../adminNav';

describe('adminNav', () => {
  it('includes overview, users, waitlist, and marketing email entries', () => {
    expect(adminNavItems.map(n => n.label)).toEqual([
      'Overview',
      'Users',
      'Waitlist',
      'Waitlist settings',
      'Marketing email settings',
    ]);
    expect(adminNavItems[0]?.to).toBe('/admin');
    expect(adminNavItems[1]?.to).toBe('/admin/users');
    expect(adminNavItems[2]?.to).toBe('/admin/waitlist');
    expect(adminNavItems[3]?.to).toBe('/admin/waitlist/settings');
    expect(adminNavItems[4]?.to).toBe('/admin/marketing-email/settings');
  });
});
