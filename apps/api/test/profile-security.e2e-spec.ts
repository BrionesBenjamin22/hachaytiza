import { randomUUID } from 'node:crypto';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import type { Request, Response } from 'express';
import * as argon2 from 'argon2';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { configureApplication } from '../src/configure-app.js';
import { PrismaService } from '../src/prisma/prisma.module.js';
import { AuthService } from '../src/auth/auth.service.js';
import { EmailService } from '../src/auth/email.service.js';

describe('profile and password security against real PostgreSQL', { timeout: 30_000 }, () => {
  let app: INestApplication;
  let db: PrismaService;
  const userIds: string[] = [];
  const locationIds: string[] = [];
  const mails: { to: string; kind: string; token: string }[] = [];
  const password = 'Original test password 123!';
  const newPassword = 'Changed test password 456!';
  class Browser {
    cookies = new Map<string, string>();
    csrf = '';
    async send(method: 'get' | 'post' | 'patch', path: string, body?: object, protect = true) {
      const operation = request(app.getHttpServer())[method](`/api/v1${path}`).set('Origin', 'http://localhost:3000')
        .set('Cookie', [...this.cookies].map(([key, value]) => `${key}=${value}`).join('; '));
      if (protect && method !== 'get') operation.set('X-CSRF-Token', this.csrf);
      if (body) operation.send(body);
      const response = await operation;
      for (const cookie of (response.headers['set-cookie'] as unknown as string[] | undefined) ?? []) {
        const [key, value] = cookie.split(';')[0].split('=');
        if (value) this.cookies.set(key, value); else this.cookies.delete(key);
      }
      return response;
    }
    async prepare() { const response = await this.send('get', '/auth/csrf'); expect(response.status).toBe(200); this.csrf = response.body.csrfToken; }
    clone() { const browser = new Browser(); browser.cookies = new Map(this.cookies); browser.csrf = this.csrf; return browser; }
  }
  async function fixture(browser: Browser) {
    const user = await db.user.create({ data: { name: 'Profile Tester', email: `profile-${randomUUID()}@example.test`, passwordHash: await argon2.hash(password), primaryLocationId: locationIds[0] } });
    userIds.push(user.id);
    await browser.prepare();
    expect((await browser.send('post', '/auth/login', { email: user.email, password })).status).toBe(200);
    await browser.prepare();
    return user;
  }
  beforeAll(async () => {
    const url = new URL(process.env.DATABASE_URL!);
    if (!['localhost', '127.0.0.1'].includes(url.hostname) || !/^\/hyt_slice(?:_test)?$/.test(url.pathname)) throw new Error('Tests require isolated local database.');
    const module = await Test.createTestingModule({ imports: [AppModule] }).overrideProvider(EmailService)
      .useValue({ send: async (to: string, kind: string, token: string) => { mails.push({ to, kind, token }); } }).compile();
    app = module.createNestApplication(); configureApplication(app); await app.init(); db = app.get(PrismaService);
    for (const name of ['Profile Tolosa', 'Profile City Bell']) locationIds.push((await db.location.create({ data: { name, type: 'LOCALIDAD' } })).id);
  });
  afterAll(async () => {
    vi.restoreAllMocks();
    if (db) {
      const sessions = await db.session.findMany({ where: { userId: { in: userIds } }, select: { id: true } });
      await db.usedRefreshToken.deleteMany({ where: { sessionId: { in: sessions.map(session => session.id) } } });
      await db.user.deleteMany({ where: { id: { in: userIds } } });
      await db.location.deleteMany({ where: { id: { in: locationIds } } });
    }
    await app?.close();
  });

  it('updates only requested profile differences and paginates private field history by three', async () => {
    const browser = new Browser(); const user = await fixture(browser);
    expect((await browser.send('get', '/users/me')).body).toMatchObject({ id: user.id, name: user.name, primaryLocation: { id: locationIds[0] } });
    const first = await browser.send('patch', '/users/me', { name: 'Updated Tester' });
    expect(first.status).toBe(200); expect(first.body.primaryLocation.id).toBe(locationIds[0]);
    expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).email).toBe(user.email);
    await browser.send('patch', '/users/me', {});
    await browser.send('patch', '/users/me', { name: 'Updated Tester' });
    expect((await browser.send('get', '/users/me/history')).body.total).toBe(1);
    await browser.send('patch', '/users/me', { primaryLocationId: locationIds[1] });
    await browser.send('patch', '/users/me', { name: 'Third Tester' });
    await browser.send('patch', '/users/me', { name: 'Fourth Tester' });
    const history = await browser.send('get', '/users/me/history?page=1');
    expect(history.body).toMatchObject({ total: 4, pageSize: 3, hasMore: true }); expect(history.body.items).toHaveLength(3);
    expect((await browser.send('get', '/users/me/history?page=2')).body.items).toHaveLength(1);
    expect(JSON.stringify(history.body)).not.toMatch(/password|Hash|refresh|token/);
    const other = new Browser(); const otherUser = await fixture(other);
    expect((await other.send('get', '/users/me')).body.id).toBe(otherUser.id);
    expect((await other.send('get', '/users/me/history')).body).toMatchObject({ total: 0, items: [] });
    expect((await other.send('patch', '/users/me', { userId: user.id, name: 'Cross-account edit' })).status).toBe(400);
    const guest = new Browser(); await guest.prepare();
    expect((await guest.send('get', '/users/me')).status).toBe(401);
    expect((await guest.send('get', '/users/me/history')).status).toBe(401);
    expect((await guest.send('patch', '/users/me', { name: 'Intruder' })).status).toBe(401);
    for (const body of [{ userId: randomUUID(), name: 'Intruder' }, { email: 'replace@example.test' }, { primaryLocationId: null }, { name: ' ' }, { name: null }, { primaryLocationId: randomUUID() }]) {
      expect((await browser.send('patch', '/users/me', body)).status).toBe(400);
    }
    expect((await browser.send('patch', '/users/me', { name: 'CSRF invalid' }, false)).status).toBe(403);
    expect((await browser.send('get', '/users/me/history?page=0')).status).toBe(400);
    expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).name).toBe('Fourth Tester');
  });

  it('rejects invalid passwords and clears all sessions after a valid authenticated change', async () => {
    const browser = new Browser(); const user = await fixture(browser);
    const second = new Browser(); await second.prepare();
    expect((await second.send('post', '/auth/login', { email: user.email, password })).status).toBe(200);
    const stale = browser.clone();
    expect((await browser.send('post', '/auth/password/change', { currentPassword: password, newPassword }, false)).status).toBe(403);
    expect((await browser.send('post', '/auth/password/change', { currentPassword: 'Wrong current password!', newPassword })).body.code).toBe('CURRENT_PASSWORD_INVALID');
    expect((await browser.send('post', '/auth/password/change', { currentPassword: password, newPassword: 'short' })).status).toBe(400);
    expect((await browser.send('post', '/auth/password/change', { currentPassword: password, newPassword, userId: randomUUID() })).status).toBe(400);
    expect((await browser.send('get', '/auth/session')).body.authenticated).toBe(true);
    await browser.send('post', '/auth/password/forgot', { email: user.email });
    await vi.waitFor(() => expect(mails.some(mail => mail.to === user.email && mail.kind === 'RESET')).toBe(true));
    const pendingReset = mails.find(mail => mail.to === user.email && mail.kind === 'RESET')!.token;
    const changed = await browser.send('post', '/auth/password/change', { currentPassword: password, newPassword });
    expect(changed.status).toBe(200);
    expect(browser.cookies.has('furvo-access')).toBe(false); expect(browser.cookies.has('furvo-refresh')).toBe(false);
    for (const client of [browser, second, stale]) expect((await client.send('get', '/auth/session')).body.authenticated).toBe(false);
    expect(await db.session.count({ where: { userId: user.id, revokedAt: null } })).toBe(0);
    expect(await argon2.verify((await db.user.findUniqueOrThrow({ where: { id: user.id } })).passwordHash!, newPassword)).toBe(true);
    await browser.prepare();
    expect((await browser.send('post', '/auth/password/reset', { token: pendingReset, password })).status).toBe(400);
    expect((await browser.send('post', '/auth/login', { email: user.email, password })).status).toBe(401);
    expect((await browser.send('post', '/auth/login', { email: user.email, password: newPassword })).status).toBe(200);
    await browser.prepare();
    await db.user.update({ where: { id: user.id }, data: { passwordHash: null } });
    expect((await browser.send('post', '/auth/password/change', { currentPassword: newPassword, newPassword: password })).body.code).toBe('LOCAL_PASSWORD_UNAVAILABLE');
  });

  for (const kind of ['reset', 'change'] as const) {
    it(`rejects a login verified before a concurrent password ${kind}`, async () => {
      const browser = new Browser(); const user = await fixture(browser);
      const auth = app.get(AuthService) as unknown as { createSession(id: string, verifiedHash: string, req: Request, res: Response): Promise<unknown> };
      const original = auth.createSession.bind(auth);
      let reached!: () => void; const reachedPromise = new Promise<void>(resolve => { reached = resolve; });
      let release!: () => void; const barrier = new Promise<void>(resolve => { release = resolve; });
      const spy = vi.spyOn(auth, 'createSession').mockImplementation(async (...args) => { reached(); await barrier; return original(...args); });
      const stale = new Browser(); await stale.prepare();
      const pending = stale.send('post', '/auth/login', { email: user.email, password });
      try {
        await reachedPromise;
        if (kind === 'reset') {
          await browser.send('post', '/auth/password/forgot', { email: user.email });
          await vi.waitFor(() => expect(mails.some(mail => mail.to === user.email && mail.kind === 'RESET')).toBe(true));
          const token = mails.find(mail => mail.to === user.email && mail.kind === 'RESET')!.token;
          expect((await browser.send('post', '/auth/password/reset', { token, password: newPassword })).status).toBe(200);
        } else expect((await browser.send('post', '/auth/password/change', { currentPassword: password, newPassword })).status).toBe(200);
      } finally { release(); spy.mockRestore(); }
      expect((await pending).status).toBe(401);
      expect((await stale.send('get', '/auth/session')).body.authenticated).toBe(false);
      expect(await db.session.count({ where: { userId: user.id, revokedAt: null } })).toBe(0);
    });
  }
});
