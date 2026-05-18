import { describe, expect, it } from 'vitest';
import { adminNavItems } from '../adminNav';

describe('adminNav', () => {
  it('includes dashboard and users entries', () => {
    expect(adminNavItems.map(n => n.label)).toEqual(['Dashboard', 'Users']);
    expect(adminNavItems[0]?.to).toBe('/admin');
    expect(adminNavItems[1]?.to).toBe('/admin/users');
  });
});
