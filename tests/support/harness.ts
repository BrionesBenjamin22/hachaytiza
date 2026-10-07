import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { test as base, expect } from '@playwright/test';

export type Mail = { to: string; kind: 'VERIFY' | 'RESET'; token: string };
export const api = process.env.E2E_API_URL ?? 'http://localhost:3001/api/v1';
const requireApi = createRequire(resolve('apps/api/package.json'));

export function isolatedDatabase() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required for the isolated browser test harness.');
  const database = new URL(process.env.DATABASE_URL);
  if (!['localhost', '127.0.0.1'].includes(database.hostname) || !/^\/hyt_slice(?:_test)?$/.test(database.pathname)) throw new Error('Unsafe fixture database');
  return process.env.DATABASE_URL;
}

export function prismaFixture() {
  isolatedDatabase();
  const { PrismaClient } = requireApi('@prisma/client');
  return new PrismaClient();
}

export async function hashFixturePassword(password: string): Promise<string> {
  return requireApi('argon2').hash(password);
}

export const test = base.extend<object, { mailbox: Mail[] }>({
  mailbox: [async ({}, use) => {
    isolatedDatabase();
    Object.assign(process.env, {
      NODE_ENV: 'development', PORT: '3001', CORS_ORIGINS: 'http://localhost:3000', FRONTEND_URL: 'http://localhost:3000',
      JWT_SECRET: 'test-only-jwt-secret-longer-than-32-characters', CSRF_SECRET: 'test-only-csrf-secret-longer-than-32-characters',
    });
    const { Test } = requireApi('@nestjs/testing');
    // Load the built NestJS application so decorator metadata matches production.
    const { AppModule } = requireApi('./dist/app.module.js');
    const { EmailService } = requireApi('./dist/auth/email.service.js');
    const { configureApplication } = requireApi('./dist/configure-app.js');
    const mailbox: Mail[] = [];
    const module = await Test.createTestingModule({ imports: [AppModule] }).overrideProvider(EmailService)
      .useValue({ send: async (to: string, kind: Mail['kind'], token: string) => { mailbox.push({ to, kind, token }); } }).compile();
    const app = module.createNestApplication({ logger: false });
    configureApplication(app);
    await app.listen(3001, '127.0.0.1');
    try { await use(mailbox); } finally { await app.close(); }
  }, { scope: 'worker', auto: true }],
});

export { expect };
