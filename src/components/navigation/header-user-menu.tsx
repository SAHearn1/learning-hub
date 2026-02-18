'use client';

import { UserButton } from '@clerk/nextjs';

export function HeaderUserMenu() {
  return (
    <UserButton
      afterSignOutUrl="/"
      appearance={{
        elements: {
          avatarBox: 'h-8 w-8',
        },
      }}
    />
  );
}

