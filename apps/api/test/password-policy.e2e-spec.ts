import { randomUUID } from 'node:crypto';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import * as argon2 from 'argon2';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { configureApplication } from '../src/configure-app.js';
import { PrismaService } from '../src/prisma/prisma.module.js';
import { EmailService } from '../src/auth/email.service.js';

describe('temporary password minimum against isolated PostgreSQL', { timeout: 30_000 }, () => {
  let app: INestApplication;
  let db: PrismaService;
  let locationId: string;
  const userIds: string[] = [];
  const mails: { kind: string; token: string }[] = [];
  class Browser {
    cookies = new Map<string, string>();
    csrf = '';
    async send(method: 'get' | 'post', path: string, body?: object) {
      const operation = request(app.getHttpServer())[method](`/api/v1${path}`)
        .set('Origin', 'http://localhost:3000')
        .set('Cookie', [...this.cookies].map(([key, value]) => `${key}=${value}`).join('; '));
      if (method === 'post') operation.set('X-CSRF-Token', this.csrf);
      if (body) operation.send(body);
      const response = await operation;
      for (const cookie of (response.headers['set-cookie'] as unknown as string[] | undefined) ?? []) {
        const [key, value] = cookie.split(';')[0].split('=');
        if (value) this.cookies.set(key, value); else this.cookies.delete(key);
      }
      return response;
    }
    async prepare() {
      const response = await this.send('get', '/auth/csrf');
      expect(response.status).toBe(200);
      this.csrf = response.body.csrfToken;
    }
  }
  beforeAll(async () => {
    const url = new URL(process.env.DATABASE_URL!);
    if (!['localhost', '127.0.0.1'].includes(url.hostname) || url.pathname !== '/hyt_slice_test') throw new Error('Password policy integration requires the isolated test database.');
    const module = await Test.createTestingModule({ imports: [AppModule] }).overrideProvider(EmailService)
      .useValue({ send: async (_to: string, kind: string, token: string) => { mails.push({ kind, token }); } }).compile();
    app = module.createNestApplication();
    configureApplication(app);
    await app.init();
    db = app.get(PrismaService);
    locationId = (await db.location.create({ data: { name: `Policy locality ${randomUUID()}`, type: 'LOCALIDAD' } })).id;
  });
  afterAll(async () => {
    if (db) {
      const sessions = await db.session.findMany({ where: { userId: { in: userIds } }, select: { id: true } });
      await db.usedRefreshToken.deleteMany({ where: { sessionId: { in: sessions.map(session => session.id) } } });
      await db.user.deleteMany({ where: { id: { in: userIds } } });
      if (locationId) await db.location.delete({ where: { id: locationId } });
    }
    await app?.close();
  });
  it('registers, logs in, changes and resets eight-character credentials while invalid boundaries preserve state', async () => {
    const browser = new Browser();
    const email = `policy-${randomUUID()}@example.test`;
    const registration = { name: 'Password Policy Fixture', email, primaryLocationId: locationId };
    await browser.prepare();
    for (const length of [7, 129]) {
      expect((await browser.send('post', '/auth/register', { ...registration, password: 'x'.repeat(length) })).status).toBe(400);
      expect(await db.user.findUnique({ where: { email } })).toBeNull();
    }
    const registered = await browser.send('post', '/auth/register', { ...registration, password: 'Reg8!pwd' });
    expect(registered.status).toBe(201);
    expect(registered.body.authenticated).toBe(true);
    userIds.push(registered.body.user.id);
    const id = userIds[0];
    expect(await argon2.verify((await db.user.findUniqueOrThrow({ where: { id } })).passwordHash!, 'Reg8!pwd')).toBe(true);
    await browser.prepare();
    const activeBefore = await db.session.count({ where: { userId: id, revokedAt: null } });
    for (const length of [7, 129]) {
      expect((await browser.send('post', '/auth/password/change', { currentPassword: 'Reg8!pwd', newPassword: 'x'.repeat(length) })).status).toBe(400);
      expect((await browser.send('post', '/auth/password/change', { currentPassword: 'x'.repeat(length), newPassword: 'New8!pwd' })).status).toBe(400);
    }
    expect(await db.session.count({ where: { userId: id, revokedAt: null } })).toBe(activeBefore);
    expect((await browser.send('post', '/auth/password/change', { currentPassword: 'Reg8!pwd', newPassword: 'New8!pwd' })).status).toBe(200);
    expect(await db.session.count({ where: { userId: id, revokedAt: null } })).toBe(0);
    await browser.prepare();
    expect((await browser.send('post', '/auth/login', { email, password: 'Reg8!pwd' })).status).toBe(401);
    expect((await browser.send('post', '/auth/login', { email, password: 'New8!pwd' })).status).toBe(200);
    await browser.prepare();
    expect((await browser.send('post', '/auth/password/forgot', { email })).status).toBe(200);
    await vi.waitFor(() => expect(mails.some(mail => mail.kind === 'RESET')).toBe(true));
    const token = mails.findLast(mail => mail.kind === 'RESET')!.token;
    for (const length of [7, 129]) {
      expect((await browser.send('post', '/auth/password/reset', { token, password: 'x'.repeat(length) })).status).toBe(400);
      expect((await browser.send('get', '/auth/session')).body.authenticated).toBe(true);
    }
    expect((await browser.send('post', '/auth/password/reset', { token, password: 'Reset8!x' })).status).toBe(200);
    expect(await db.session.count({ where: { userId: id, revokedAt: null } })).toBe(0);
    expect((await browser.send('get', '/auth/session')).body.authenticated).toBe(false);
    expect((await browser.send('post', '/auth/password/reset', { token, password: 'Reset8!x' })).status).toBe(400);
    await browser.prepare();
    expect((await browser.send('post', '/auth/login', { email, password: 'New8!pwd' })).status).toBe(401);
    expect((await browser.send('post', '/auth/login', { email, password: 'Reset8!x' })).status).toBe(200);
  });
});
