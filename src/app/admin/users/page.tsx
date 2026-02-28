import Link from 'next/link';
import { requirePageUser } from '@/lib/page-auth';
import { db } from '@/lib/db';

const PAGE_SIZE = 50;

const ALL_ROLES = ['STUDENT', 'EDUCATOR', 'PARENT', 'SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN'] as const;
type Role = typeof ALL_ROLES[number];

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; role?: string }>;
}) {
  await requirePageUser(['PLATFORM_ADMIN']);
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? '1', 10));
  const roleFilter = ALL_ROLES.includes(params.role as Role) ? (params.role as Role) : undefined;
  const skip = (page - 1) * PAGE_SIZE;

  const where = roleFilter ? { role: roleFilter } : {};

  const [total, users] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({
      where,
      include: { tenant: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take: PAGE_SIZE,
    }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const roleColor = (role: string) => {
    switch (role) {
      case 'PLATFORM_ADMIN': return 'bg-purple-100 text-purple-800';
      case 'DISTRICT_ADMIN': return 'bg-indigo-100 text-indigo-800';
      case 'SCHOOL_ADMIN': return 'bg-blue-100 text-blue-800';
      case 'EDUCATOR': return 'bg-teal-100 text-teal-800';
      case 'PARENT': return 'bg-orange-100 text-orange-800';
      default: return 'bg-neutral-100 text-neutral-700'; // STUDENT
    }
  };

  const buildHref = (overrides: { page?: number; role?: string }) => {
    const p = overrides.page ?? page;
    const r = overrides.role !== undefined ? overrides.role : (roleFilter ?? '');
    const qs = new URLSearchParams();
    if (p > 1) qs.set('page', String(p));
    if (r) qs.set('role', r);
    const str = qs.toString();
    return `/admin/users${str ? `?${str}` : ''}`;
  };

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-6 py-12">
      <div>
        <div className="flex items-center gap-2 text-sm text-neutral-500">
          <Link href="/admin/dashboard" className="hover:underline">
            Admin Dashboard
          </Link>
          <span>/</span>
          <span>Users</span>
        </div>
        <h1 className="mt-2 text-3xl font-bold text-neutral-900">Users</h1>
        <p className="mt-1 text-neutral-600">
          All users across the platform. Showing up to {PAGE_SIZE} per page.
        </p>
      </div>

      {/* Role filter */}
      <div className="flex flex-wrap gap-2">
        <Link
          href={buildHref({ page: 1, role: '' })}
          className={`rounded-full px-3 py-1 text-xs font-medium border transition ${
            !roleFilter
              ? 'bg-neutral-900 text-white border-neutral-900'
              : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50'
          }`}
        >
          All roles
        </Link>
        {ALL_ROLES.map((r) => (
          <Link
            key={r}
            href={buildHref({ page: 1, role: r })}
            className={`rounded-full px-3 py-1 text-xs font-medium border transition ${
              roleFilter === r
                ? 'bg-neutral-900 text-white border-neutral-900'
                : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50'
            }`}
          >
            {r}
          </Link>
        ))}
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white shadow-sm">
        <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
          <span className="text-sm text-neutral-500">
            {total} user{total !== 1 ? 's' : ''}
            {roleFilter ? ` with role ${roleFilter}` : ''} &mdash; page {page} of {totalPages || 1}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100">
                <th className="px-6 py-3 text-left text-neutral-500 font-medium">Name</th>
                <th className="px-6 py-3 text-left text-neutral-500 font-medium">Email</th>
                <th className="px-6 py-3 text-left text-neutral-500 font-medium">Role</th>
                <th className="px-6 py-3 text-left text-neutral-500 font-medium">Tenant</th>
                <th className="px-6 py-3 text-left text-neutral-500 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-neutral-400">
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="border-t border-neutral-100 hover:bg-neutral-50">
                    <td className="px-6 py-4 font-medium text-neutral-900">
                      {u.firstName} {u.lastName}
                    </td>
                    <td className="px-6 py-4 text-neutral-700">{u.email}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${roleColor(u.role)}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-neutral-700">{u.tenant.name}</td>
                    <td className="px-6 py-4 text-neutral-500">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-neutral-100 flex items-center justify-between">
            <div>
              {page > 1 && (
                <Link
                  href={buildHref({ page: page - 1 })}
                  className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  Previous
                </Link>
              )}
            </div>
            <span className="text-sm text-neutral-500">
              Page {page} of {totalPages}
            </span>
            <div>
              {page < totalPages && (
                <Link
                  href={buildHref({ page: page + 1 })}
                  className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  Next
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
