import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';

// ═══════════════════════════════════════════════════════════════
// Database Connection Tests
// Tests the db module's singleton pattern, Vercel pooling config,
// and PrismaClient initialization behavior
// ═══════════════════════════════════════════════════════════════

describe('db module', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    // Clean up globalThis to avoid leaking between tests
    const g = globalThis as unknown as { prisma?: PrismaClient };
    delete g.prisma;
  });

  it('exports a PrismaClient instance', async () => {
    const { db } = await import('../db');
    expect(db).toBeDefined();
    expect(db).toBeInstanceOf(PrismaClient);
  });

  it('exports createPrismaClient factory', async () => {
    const { createPrismaClient } = await import('../db');
    expect(typeof createPrismaClient).toBe('function');
  });

  it('createPrismaClient returns a PrismaClient', async () => {
    const { createPrismaClient } = await import('../db');
    const client = createPrismaClient();
    expect(client).toBeInstanceOf(PrismaClient);
  });

  it('PrismaClient has expected model accessors', async () => {
    const { db } = await import('../db');
    // Verify key model delegates exist on the client
    expect(db.tenant).toBeDefined();
    expect(db.user).toBeDefined();
    expect(db.student).toBeDefined();
    expect(db.session).toBeDefined();
    expect(db.message).toBeDefined();
    expect(db.assessment).toBeDefined();
    expect(db.progress).toBeDefined();
    expect(db.standard).toBeDefined();
    expect(db.topic).toBeDefined();
    expect(db.problem).toBeDefined();
    expect(db.aIUsageLedger).toBeDefined();
    expect(db.auditLog).toBeDefined();
  });

  it('PrismaClient model accessors have CRUD methods', async () => {
    const { db } = await import('../db');
    // Each model delegate should have standard Prisma CRUD methods
    const crudMethods = ['findUnique', 'findFirst', 'findMany', 'create', 'update', 'delete', 'count'];
    for (const method of crudMethods) {
      expect(typeof (db.user as Record<string, unknown>)[method]).toBe('function');
      expect(typeof (db.student as Record<string, unknown>)[method]).toBe('function');
      expect(typeof (db.session as Record<string, unknown>)[method]).toBe('function');
    }
  });

  it('PrismaClient has $connect and $disconnect methods', async () => {
    const { db } = await import('../db');
    expect(typeof db.$connect).toBe('function');
    expect(typeof db.$disconnect).toBe('function');
  });

  it('PrismaClient has $transaction method for atomic operations', async () => {
    const { db } = await import('../db');
    expect(typeof db.$transaction).toBe('function');
  });
});

describe('Vercel Postgres compatibility', () => {
  it('schema datasource uses directUrl for migrations', async () => {
    // Verify the schema.prisma file has directUrl configured
    const fs = await import('fs');
    const path = await import('path');
    const schemaPath = path.resolve(__dirname, '../../../prisma/schema.prisma');
    const schema = fs.readFileSync(schemaPath, 'utf-8');

    expect(schema).toContain('directUrl = env("DIRECT_URL")');
    expect(schema).toContain('url       = env("DATABASE_URL")');
    expect(schema).toContain('provider  = "postgresql"');
  });

  it('DATABASE_URL env var is used for pooled connections', async () => {
    // The db module should reference DATABASE_URL
    const fs = await import('fs');
    const path = await import('path');
    const dbModulePath = path.resolve(__dirname, '../db.ts');
    const dbModule = fs.readFileSync(dbModulePath, 'utf-8');

    expect(dbModule).toContain('DATABASE_URL');
  });

  it('.env.example documents both DATABASE_URL and DIRECT_URL', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const envExamplePath = path.resolve(__dirname, '../../../.env.example');
    const envExample = fs.readFileSync(envExamplePath, 'utf-8');

    expect(envExample).toContain('DATABASE_URL');
    expect(envExample).toContain('DIRECT_URL');
  });
});

describe('database connection — error handling', () => {
  it('$connect rejects when database is unreachable', async () => {
    const client = new PrismaClient({
      datasourceUrl: 'postgresql://invalid:invalid@localhost:1/nonexistent',
    });

    await expect(client.$connect()).rejects.toThrow();
  });
});
