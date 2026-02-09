import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasourceUrl: process.env.DATABASE_URL,
  });
}

export const db = globalForPrisma.prisma || createPrismaClient();

// Backward-compatible alias used across older modules.
export const prisma = db;

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;

export { createPrismaClient };
