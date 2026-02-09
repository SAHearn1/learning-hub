import { describe, expect, it } from 'vitest';
import { assertTenantAccess, canAccessTenant } from '@/lib/rbac';

describe('RBAC district isolation', () => {
  it('allows platform admins to cross tenant boundaries', () => {
    expect(canAccessTenant('PLATFORM_ADMIN', 't1', 't2')).toBe(true);
  });

  it('blocks district-scoped roles from crossing tenant boundaries', () => {
    expect(canAccessTenant('DISTRICT_ADMIN', 'district-a', 'district-b')).toBe(false);
  });

  it('throws for forbidden cross-district access', () => {
    expect(() => assertTenantAccess('EDUCATOR', 'district-a', 'district-b')).toThrow(/cross-district/);
  });
});
