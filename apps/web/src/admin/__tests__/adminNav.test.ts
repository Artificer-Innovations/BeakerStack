import { describe, expect, it } from 'vitest';
import { adminNavItems } from '../adminNav';

describe('adminNav', () => {
  it('includes dashboard, users, and waitlist entries', () => {
    expect(adminNavItems.map(n => n.label)).toEqual([
      'Admin Dashboard',
      'Users',
      'Waitlist',
      'Waitlist settings',
    ]);
    expect(adminNavItems[0]?.to).toBe('/admin');
    expect(adminNavItems[1]?.to).toBe('/admin/users');
    expect(adminNavItems[2]?.to).toBe('/admin/waitlist');
    expect(adminNavItems[3]?.to).toBe('/admin/waitlist/settings');
  });
});
