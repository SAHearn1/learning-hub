import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockAuth = vi.fn();
const mockDb = {
  user: {
    findUnique: vi.fn(),
  },
};

vi.mock('@clerk/nextjs/server', () => ({ auth: mockAuth }));
vi.mock('@/lib/db', () => ({ db: mockDb }));

describe('auth helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when there is no authenticated Clerk user', async () => {
    const { getCurrentUser } = await import('../auth');
    mockAuth.mockReturnValue({ userId: null });

    await expect(getCurrentUser()).resolves.toBeNull();
    expect(mockDb.user.findUnique).not.toHaveBeenCalled();
  });

  it('loads the user and role relationships when a Clerk user exists', async () => {
    const { getCurrentUser } = await import('../auth');
    mockAuth.mockReturnValue({ userId: 'clerk_123' });
    mockDb.user.findUnique.mockResolvedValue({ id: 'user_1', role: 'STUDENT' });

    const user = await getCurrentUser();

    expect(user).toEqual({ id: 'user_1', role: 'STUDENT' });
    expect(mockDb.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { clerkUserId: 'clerk_123' },
        include: expect.objectContaining({
          student: expect.objectContaining({
            include: expect.objectContaining({
              iepAccommodations: expect.any(Object),
            }),
          }),
          educator: true,
          parent: true,
          tenant: true,
        }),
      }),
    );
  });

  it('throws Unauthorized when requireUser is called without an authenticated user', async () => {
    const { requireUser } = await import('../auth');
    mockAuth.mockReturnValue({ userId: null });

    await expect(requireUser()).rejects.toThrow('Unauthorized');
  });

  it('throws Forbidden when requireRole does not include the user role', async () => {
    const { requireRole } = await import('../auth');
    mockAuth.mockReturnValue({ userId: 'clerk_123' });
    mockDb.user.findUnique.mockResolvedValue({ id: 'user_1', role: 'STUDENT' });

    await expect(requireRole(['EDUCATOR'])).rejects.toThrow('Forbidden');
  });

  it('returns user when requireRole includes the current user role', async () => {
    const { requireRole } = await import('../auth');
    mockAuth.mockReturnValue({ userId: 'clerk_123' });
    mockDb.user.findUnique.mockResolvedValue({ id: 'user_1', role: 'EDUCATOR' });

    await expect(requireRole(['EDUCATOR'])).resolves.toEqual({ id: 'user_1', role: 'EDUCATOR' });
  });
});
