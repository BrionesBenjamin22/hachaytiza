import { randomUUID, createHash } from 'node:crypto';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { configureApplication } from '../src/configure-app.js';
import { PrismaService } from '../src/prisma/prisma.module.js';
import { EmailService } from '../src/auth/email.service.js';

const database = process.env.DATABASE_URL;
const run = database ? describe : describe.skip;
const origin = 'http://localhost:3000';
const password = 'Testing password 123!';
const digest = (value: string) => createHash('sha256').update(value).digest('hex');

run('vertical slice against real PostgreSQL', { timeout: 30_000 }, () => {
  let app: INestApplication;
  let db: PrismaService;
  let tolosa: string;
  let cityBell: string;
  const userIds: string[] = [];
  const locationIds: string[] = [];
  const emails: { to: string; kind: string; token: string }[] = [];

  class Browser {
    cookies = new Map<string, string>();
    csrf = '';
    async send(method: 'get' | 'post' | 'patch', path: string, body?: object, csrf = true, requestOrigin = origin) {
      const operation = request(app.getHttpServer())[method](`/api/v1${path}`)
        .set('Origin', requestOrigin)
        .set('Cookie', [...this.cookies].map(([key, value]) => `${key}=${value}`).join('; '));
      if (csrf && method !== 'get') operation.set('X-CSRF-Token', this.csrf);
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

  async function register(browser: Browser) {
    await browser.prepare();
    const email = `slice-${randomUUID()}@example.test`;
    const response = await browser.send('post', '/auth/register', { name: 'Slice Tester', email, password, primaryLocationId: tolosa });
    expect(response.status).toBe(201);
    userIds.push(response.body.user.id);
    return { response, email, id: response.body.user.id as string };
  }

  beforeAll(async () => {
    const url = new URL(database!);
    if (!['localhost', '127.0.0.1'].includes(url.hostname) || !/^\/hyt_slice(?:_test)?$/.test(url.pathname)) {
      throw new Error('Integration tests require an isolated loopback hyt_slice(_test) database.');
    }
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(EmailService).useValue({ send: async (to: string, kind: string, token: string) => { emails.push({ to, kind, token }); } }).compile();
    app = module.createNestApplication();
    configureApplication(app);
    await app.init();
    db = app.get(PrismaService);
    for (const name of ['Tolosa test', 'City Bell test']) {
      const location = await db.location.create({ data: { name, type: 'LOCALIDAD' } });
      locationIds.push(location.id);
    }
    [tolosa, cityBell] = locationIds;
  });

  afterAll(async () => {
    if (db) {
      const sessions = await db.session.findMany({ where: { userId: { in: userIds } }, select: { id: true } });
      await db.usedRefreshToken.deleteMany({ where: { sessionId: { in: sessions.map(session => session.id) } } });
      await db.participation.deleteMany({ where: { userId: { in: userIds } } });
      await db.match.deleteMany({ where: { locationId: { in: locationIds } } });
      await db.user.deleteMany({ where: { id: { in: userIds } } });
      await db.location.deleteMany({ where: { id: { in: locationIds } } });
    }
    await app?.close();
  });

  it('persists registration locality, Argon2id and only hashed refresh credentials', async () => {
    const browser = new Browser();
    const { response, id } = await register(browser);
    expect(response.body.authenticated).toBe(true);
    expect(response.body.user.primaryLocation.id).toBe(tolosa);
    const user = await db.user.findUniqueOrThrow({ where: { id } });
    expect(user.primaryLocationId).toBe(tolosa);
    expect(user.passwordHash).toMatch(/^\$argon2id\$/);
    const session = await db.session.findFirstOrThrow({ where: { userId: id } });
    expect(session.refreshHash).toBe(digest(browser.cookies.get('furvo-refresh')!));
    expect(JSON.stringify(response.body)).not.toMatch(/passwordHash|refreshHash|accessToken|refreshToken/);
    for (const name of ['access', 'refresh']) {
      const cookie = (response.headers['set-cookie'] as unknown as string[]).find(value => value.startsWith(`furvo-${name}=`));
      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('Secure');
      expect(cookie).toContain('SameSite=Lax');
      expect(cookie).toContain('Path=/');
    }
    expect((await browser.send('get', '/auth/session')).body.user.id).toBe(id);
  });

  it('rejects missing CSRF, hostile Origin, invalid locality and injected identity', async () => {
    const browser = new Browser();
    await browser.prepare();
    const credentials = { email: `invalid-${randomUUID()}@example.test`, password };
    expect((await browser.send('post', '/auth/login', credentials, false)).status).toBe(403);
    expect((await browser.send('post', '/auth/login', credentials, true, 'https://hostile.example')).status).toBe(403);
    expect((await browser.send('post', '/auth/register', { ...credentials, name: 'Tester', primaryLocationId: randomUUID() })).status).toBe(400);
    expect((await browser.send('patch', '/users/me/location', { primaryLocationId: tolosa })).status).toBe(401);
    await register(browser);
    await browser.prepare();
    expect((await browser.send('patch', '/users/me/location', { primaryLocationId: cityBell, userId: randomUUID() })).status).toBe(400);
  });

  it('filters upcoming noncancelled public matches and keeps profile locality independent', async () => {
    const browser = new Browser();
    const { id } = await register(browser);
    for (const [locationId, status, delay, venueName] of [
      [tolosa, 'OPEN', 100000, 'Tolosa future'], [cityBell, 'CLOSED', 200000, 'City Bell full'],
      [tolosa, 'CANCELLED', 200000, 'Cancelled'], [tolosa, 'OPEN', -100000, 'Past'],
    ] as const) {
      await db.match.create({ data: { organizerId: id, locationId, status, startsAt: new Date(Date.now() + delay), venueName, address: 'Test address', footballType: 'FIVE', pricePerPerson: 100, availablePlaces: status === 'CLOSED' ? 0 : 2 } });
    }
    const publicBrowser = new Browser();
    const initial = await publicBrowser.send('get', `/matches?locationId=${tolosa}`);
    expect(initial.status).toBe(200);
    expect(initial.body.items.map((match: { venueName: string }) => match.venueName)).toEqual(['Tolosa future']);
    const explored = await browser.send('get', `/matches?locationId=${cityBell}`);
    expect(explored.body.items[0].venueName).toBe('City Bell full');
    expect(JSON.stringify(explored.body)).not.toMatch(/example\.test|passwordHash|refreshHash/);
    expect((await browser.send('get', '/auth/session')).body.user.primaryLocation.id).toBe(tolosa);
    expect((await db.user.findUniqueOrThrow({ where: { id } })).primaryLocationId).toBe(tolosa);
    expect((await publicBrowser.send('get', '/matches?locationId=invalid')).status).toBe(400);
  });

  it('revokes logout credentials and restores persisted locality after login; handles null locality', async () => {
    const browser = new Browser();
    const { email, id } = await register(browser);
    const savedCookies = new Map(browser.cookies);
    await browser.prepare();
    expect((await browser.send('post', '/auth/logout')).status).toBeLessThan(300);
    const replay = new Browser(); replay.cookies = savedCookies;
    expect((await replay.send('get', '/auth/session')).body.authenticated).toBe(false);
    await replay.prepare();
    expect((await replay.send('post', '/auth/refresh')).status).toBe(401);
    await browser.prepare();
    expect((await browser.send('post', '/auth/login', { email, password })).body.user.primaryLocation.id).toBe(tolosa);
    await db.user.update({ where: { id }, data: { primaryLocationId: null } });
    expect((await browser.send('get', '/auth/session')).body.user.primaryLocation).toBeNull();
    await browser.prepare();
    expect((await browser.send('patch', '/users/me/location', { primaryLocationId: cityBell })).status).toBe(200);
    expect((await db.user.findUniqueOrThrow({ where: { id } })).primaryLocationId).toBe(cityBell);
  });

  it('rotates refresh and revokes its family upon reuse of an old credential', async () => {
    const browser = new Browser();
    const { id } = await register(browser);
    const session = await db.session.findFirstOrThrow({ where: { userId: id } });
    browser.cookies.set('furvo-access', await app.get(JwtService).signAsync({ sub: id, sid: session.id }, {
      secret: process.env.JWT_SECRET, issuer: 'hyt-api', audience: 'hyt-web', algorithm: 'HS256', expiresIn: -1,
    }));
    expect((await browser.send('get', '/auth/session')).body).toMatchObject({ authenticated: false, refreshAvailable: true, user: null });
    const oldRefresh = browser.cookies.get('furvo-refresh');
    await browser.prepare();
    expect((await browser.send('post', '/auth/refresh')).status).toBeLessThan(300);
    expect(browser.cookies.get('furvo-refresh')).not.toBe(oldRefresh);
    const replay = new Browser(); replay.cookies = new Map(browser.cookies); replay.cookies.set('furvo-refresh', oldRefresh!);
    await replay.prepare();
    expect((await replay.send('post', '/auth/refresh')).status).toBe(401);
    expect((await browser.send('get', '/auth/session')).body.authenticated).toBe(false);
  });

  it('verifies email once, rejects expired tokens, resets passwords once and revokes sessions', async () => {
    const browser = new Browser();
    const { email, id } = await register(browser);
    const verification = emails.find(value => value.to === email && value.kind === 'VERIFY')!.token;
    expect(verification).toMatch(/^[a-f0-9]{64}$/);
    expect((await db.emailToken.findUniqueOrThrow({ where: { hash: digest(verification) } })).hash).not.toBe(verification);
    await browser.prepare();
    expect((await browser.send('post', '/auth/email/verify', { token: verification })).status).toBeLessThan(300);
    expect((await browser.send('post', '/auth/email/verify', { token: verification })).status).toBe(400);
    expect((await browser.send('get', '/auth/session')).body.user.emailVerified).toBe(true);
    const known = await browser.send('post', '/auth/password/forgot', { email });
    const unknown = await browser.send('post', '/auth/password/forgot', { email: `unknown-${randomUUID()}@example.test` });
    expect(unknown.body).toEqual(known.body);
    await vi.waitFor(() => expect(emails.some(value => value.to === email && value.kind === 'RESET')).toBe(true));
    const expired = emails.filter(value => value.to === email && value.kind === 'RESET').at(-1)!.token;
    await db.emailToken.update({ where: { hash: digest(expired) }, data: { expiresAt: new Date(0) } });
    expect((await browser.send('post', '/auth/password/reset', { token: expired, password })).status).toBe(400);
    await browser.send('post', '/auth/password/forgot', { email });
    await vi.waitFor(() => expect(emails.filter(value => value.to === email && value.kind === 'RESET')).toHaveLength(2));
    const reset = emails.filter(value => value.to === email && value.kind === 'RESET').at(-1)!.token;
    const newPassword = 'Changed password 456!';
    expect((await browser.send('post', '/auth/password/reset', { token: reset, password: newPassword })).status).toBeLessThan(300);
    expect((await browser.send('get', '/auth/session')).body.authenticated).toBe(false);
    expect(await db.session.count({ where: { userId: id, revokedAt: null } })).toBe(0);
    expect((await browser.send('post', '/auth/password/reset', { token: reset, password: newPassword })).status).toBe(400);
    expect((await browser.send('post', '/auth/login', { email, password })).status).toBe(401);
    expect((await browser.send('post', '/auth/login', { email, password: newPassword })).body.authenticated).toBe(true);
  });

  it('paginates nine matches in deterministic ascending start order', async () => {
    const browser = new Browser();
    const { id } = await register(browser);
    const location = await db.location.create({ data: { name: 'Pagination test', type: 'LOCALIDAD' } });
    locationIds.push(location.id);
    const start = Date.now() + 86400000;
    for (let index = 9; index >= 0; index--) {
      await db.match.create({ data: { organizerId: id, locationId: location.id, startsAt: new Date(start + index * 60000), venueName: `Page match ${index}`, address: 'Test address', footballType: 'SEVEN', pricePerPerson: 100, availablePlaces: 1 } });
    }
    const first = await browser.send('get', `/matches?locationId=${location.id}&page=1`);
    const second = await browser.send('get', `/matches?locationId=${location.id}&page=2`);
    expect(first.body.items).toHaveLength(9);
    expect(first.body.items.map((match: { venueName: string }) => match.venueName)).toEqual(Array.from({ length: 9 }, (_, index) => `Page match ${index}`));
    expect(first.body.hasMore).toBe(true);
    expect(second.body.items.map((match: { venueName: string }) => match.venueName)).toEqual(['Page match 9']);
    expect(second.body.hasMore).toBe(false);
    expect((await browser.send('get', `/matches?locationId=${location.id}&page=0`)).status).toBe(400);
  });

  async function legacyAccount(browser: Browser) {
    const email = `concurrency-${randomUUID()}@example.test`;
    const user = await db.user.create({ data: { email, name: 'Concurrency Tester', primaryLocationId: tolosa, passwordHash: await argon2.hash(password, { type: argon2.argon2id }) } });
    userIds.push(user.id);
    await browser.prepare();
    expect((await browser.send('post', '/auth/login', { email, password })).status).toBe(200);
    return user;
  }

  it('does not leave two usable sessions after concurrent refresh of the same credential', async () => {
    const first = new Browser();
    const user = await legacyAccount(first);
    await first.prepare();
    const second = new Browser(); second.cookies = new Map(first.cookies); second.csrf = first.csrf;
    const responses = await Promise.all([first.send('post', '/auth/refresh'), second.send('post', '/auth/refresh')]);
    expect(responses.map(response => response.status).sort()).toEqual([200, 401]);
    const sessions = await Promise.all([first.send('get', '/auth/session'), second.send('get', '/auth/session')]);
    expect(sessions.filter(response => response.body.authenticated)).toHaveLength(0);
    expect(await db.session.count({ where: { userId: user.id, revokedAt: null } })).toBe(0);
  });

  it('consumes verification and reset tokens only once under simultaneous requests', async () => {
    const browser = new Browser();
    const user = await legacyAccount(browser);
    await browser.prepare();
    expect((await browser.send('post', '/auth/email/resend', {})).status).toBe(200);
    const verify = emails.find(value => value.to === user.email && value.kind === 'VERIFY')!.token;
    const verificationResults = await Promise.all([browser.send('post', '/auth/email/verify', { token: verify }), browser.send('post', '/auth/email/verify', { token: verify })]);
    expect(verificationResults.map(response => response.status).sort()).toEqual([200, 400]);
    expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).emailVerifiedAt).not.toBeNull();
    await browser.send('post', '/auth/password/forgot', { email: user.email });
    await vi.waitFor(() => expect(emails.some(value => value.to === user.email && value.kind === 'RESET')).toBe(true));
    const reset = emails.find(value => value.to === user.email && value.kind === 'RESET')!.token;
    const resetResults = await Promise.all([browser.send('post', '/auth/password/reset', { token: reset, password }), browser.send('post', '/auth/password/reset', { token: reset, password })]);
    expect(resetResults.map(response => response.status).sort()).toEqual([200, 400]);
    expect(await db.session.count({ where: { userId: user.id, revokedAt: null } })).toBe(0);
    expect((await browser.send('get', '/auth/session')).body.authenticated).toBe(false);
  });

  it('enforces nonnegative match values and one active participation per local day in PostgreSQL', async () => {
    const user = await db.user.create({ data: { name: 'Constraint Tester', email: `constraints-${randomUUID()}@example.test` } });
    userIds.push(user.id);
    const data = { organizerId: user.id, locationId: tolosa, startsAt: new Date(Date.now() + 86400000), venueName: 'Constraints match', address: 'Test address', footballType: 'FIVE' as const, pricePerPerson: 0, availablePlaces: 0 };
    await expect(db.match.create({ data: { ...data, pricePerPerson: -1 } })).rejects.toThrow();
    await expect(db.match.create({ data: { ...data, availablePlaces: -1 } })).rejects.toThrow();
    const first = await db.match.create({ data });
    const second = await db.match.create({ data });
    const localDate = new Date('2026-10-07T00:00:00Z');
    await db.participation.create({ data: { userId: user.id, matchId: first.id, role: 'ORGANIZER', localDate } });
    await expect(db.participation.create({ data: { userId: user.id, matchId: second.id, role: 'PLAYER', localDate } })).rejects.toMatchObject({ code: 'P2002' });
    await db.participation.create({ data: { userId: user.id, matchId: second.id, role: 'PLAYER', localDate, active: false } });
    expect(await db.participation.count({ where: { userId: user.id, active: true } })).toBe(1);
  });

  it('rejects expired verification and refresh sessions and applies login rate limiting', async () => {
    const browser = new Browser();
    const { id, email } = await register(browser);
    const token = emails.find(value => value.to === email && value.kind === 'VERIFY')!.token;
    await db.emailToken.update({ where: { hash: digest(token) }, data: { expiresAt: new Date(0) } });
    await browser.prepare();
    expect((await browser.send('post', '/auth/email/verify', { token })).status).toBe(400);
    await db.session.updateMany({ where: { userId: id }, data: { expiresAt: new Date(0) } });
    expect((await browser.send('get', '/auth/session')).body).toMatchObject({ authenticated: false, refreshAvailable: false, user: null });
    expect((await browser.send('post', '/auth/refresh')).status).toBe(401);
    const statuses: number[] = [];
    await browser.prepare();
    for (let index = 0; index < 11; index++) {
      statuses.push((await browser.send('post', '/auth/login', { email: 'unknown@example.test', password })).status);
    }
    expect(statuses).toContain(429);
    expect(statuses.every(status => status === 401 || status === 429)).toBe(true);
  });
});
