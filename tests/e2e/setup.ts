import { test as setup } from '@playwright/test';
import { setupTestUsers } from '../helpers/auth';

setup('setup test users', async () => {
  await setupTestUsers();
});
