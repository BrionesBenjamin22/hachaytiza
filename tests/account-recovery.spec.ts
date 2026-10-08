import { randomUUID, createHash } from 'node:crypto';
import type { Page } from '@playwright/test';
import { test, expect, api, prismaFixture, hashFixturePassword } from './support/harness';
import { chooseLocation, expectHomeLocation } from './support/ui';

const password = 'Account browser password 123!';
const newPassword = 'New account browser password 456!';
async function assertThemeContrast(page: Page) {
  const colors = await page.locator('html').evaluate(element => {
    const style = getComputedStyle(element);
    return Object.fromEntries(['background', 'surface', 'solid', 'ink', 'muted', 'club', 'danger', 'focus', 'control-border'].map(name => [name, style.getPropertyValue(`--${name}`).trim()]));
  });
  function rgb(hex: string) {
    const full = hex.slice(1).length === 3 ? hex.slice(1).split('').map(value => value + value).join('') : hex.slice(1);
    return [0, 2, 4].map(offset => parseInt(full.slice(offset, offset + 2), 16) / 255);
  }
  function luminance(color: number[]) { return color.map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4).reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0); }
  function contrast(first: number[], second: number[]) { const a = luminance(first); const b = luminance(second); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); }
  const background = rgb(colors.background);
  const alpha = colors.surface.length === 9 ? parseInt(colors.surface.slice(7, 9), 16) / 255 : 1;
  const surface = rgb(colors.surface).map((channel, index) => alpha * channel + (1 - alpha) * background[index]);
  for (const foreground of ['ink', 'muted', 'club', 'danger']) {
    expect(contrast(rgb(colors[foreground]), surface), `${foreground} text over composed glass surface`).toBeGreaterThanOrEqual(4.5);
  }
  expect(contrast(rgb(colors['control-border']), rgb(colors.solid)), 'input border against solid control').toBeGreaterThanOrEqual(3);
  expect(contrast(rgb(colors.focus), surface), 'focus outline against glass surface').toBeGreaterThanOrEqual(3);
}
async function register(page: Page) {
  const email = `account-browser-${randomUUID()}@example.test`;
  await page.goto('/auth/register');
  await page.getByLabel('Nombre', { exact: true }).fill('Account Tester');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Contraseña', { exact: true }).fill(password);
  await chooseLocation(page, 'Localidad principal', 'Tolosa');
  await page.getByRole('button', { name: 'Crear cuenta', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Partidos disponibles', exact: true })).toBeVisible();
  return email;
}

test('landing offers registration and public discovery without an authenticated session', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Crear cuenta', exact: true }).first()).toBeVisible();
  await expect(page.getByRole('contentinfo')).toContainText('Hecho en Argentina para los que siempre buscan uno más.');
  await page.screenshot({ path: '.runtime/iteration2-landing-light.png', fullPage: true, animations: 'disabled' });
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.evaluate(() => new Promise<void>(resolvePaint => requestAnimationFrame(() => requestAnimationFrame(() => resolvePaint()))));
  await page.screenshot({ path: '.runtime/iteration2-landing-dark.png', fullPage: true, animations: 'disabled' });
  await page.getByRole('link', { name: 'Buscar un partido', exact: true }).click();
  await expect(page).toHaveURL(/\/partidos/);
  await chooseLocation(page, 'Localidad seleccionada', 'Tolosa');
  await expect(page.getByRole('heading', { name: 'Partidos en Tolosa', exact: true })).toBeVisible();
});

test('profile sends real differences and password change revokes every session and returns to login', async ({ page, context, browser }) => {
  const email = await register(page);
  const patches: object[] = [];
  page.on('request', request => { if (request.method() === 'PATCH' && new URL(request.url()).pathname === '/api/v1/users/me') patches.push(request.postDataJSON()); });
  await page.getByRole('button', { name: 'Mi cuenta', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Perfil', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Mi perfil', exact: true })).toBeVisible();
  await expect(page.getByLabel('Email', { exact: true })).toHaveAttribute('readonly', '');
  await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
  await expect(page.getByText('No hay cambios para guardar.', { exact: true })).toBeVisible();
  expect(patches).toHaveLength(0);
  await page.getByLabel('Nombre', { exact: true }).fill('Account Updated');
  await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
  await expect.poll(() => patches.length).toBe(1);
  expect(patches[0]).toEqual({ name: 'Account Updated' });
  await expect(page.getByText('Perfil actualizado correctamente.', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Nombre', { exact: true })).toHaveValue('Account Updated');
  await chooseLocation(page, 'Localidad principal', 'City Bell');
  await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
  await expect.poll(() => patches.length).toBe(2);
  expect(Object.keys(patches[1])).toEqual(['primaryLocationId']);
  expect((await (await context.request.get(`${api}/auth/session`)).json()).user.primaryLocation.name).toBe('City Bell');
  const otherContext = await browser.newContext();
  try {
    // A separate login creates a distinct server session, rather than a copied cookie jar.
    await otherContext.request.get(`${api}/auth/csrf`);
    const csrf = (await (await otherContext.request.get(`${api}/auth/csrf`)).json()).csrfToken;
    expect((await otherContext.request.post(`${api}/auth/login`, { headers: { Origin: new URL(process.env.E2E_WEB_URL ?? 'http://localhost:3000').origin, 'X-CSRF-Token': csrf }, data: { email, password } })).status()).toBe(200);
    await page.goto('/account/security');
    await page.getByLabel('Contraseña actual', { exact: true }).fill(password);
    await page.getByLabel('Nueva contraseña', { exact: true }).fill(newPassword);
    await page.getByLabel('Confirmar nueva contraseña', { exact: true }).fill('Mismatched password 789!');
    await page.getByRole('button', { name: 'Cambiar contraseña', exact: true }).click();
    await expect(page.getByText('Las contraseñas no coinciden.', { exact: true })).toBeVisible();
    await page.getByLabel('Confirmar nueva contraseña', { exact: true }).fill(newPassword);
    await page.getByRole('button', { name: 'Cambiar contraseña', exact: true }).click();
    await expect(page).toHaveURL(/\/auth\/login/);
    expect((await (await context.request.get(`${api}/auth/session`)).json()).authenticated).toBe(false);
    expect((await (await otherContext.request.get(`${api}/auth/session`)).json()).authenticated).toBe(false);
    expect((await context.cookies()).some(cookie => ['furvo-access', 'furvo-refresh'].includes(cookie.name))).toBe(false);
    await page.getByLabel('Email', { exact: true }).fill(email);
    await page.getByLabel('Contraseña', { exact: true }).fill(newPassword);
    await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
    await expectHomeLocation(page, 'City Bell');
  } finally { await otherContext.close(); }
});

test('real email verification and password recovery reject invalid, expired and reused links', async ({ page, context, mailbox }) => {
  const email = await register(page);
  const verification = mailbox.find(mail => mail.to === email && mail.kind === 'VERIFY')!.token;
  await page.goto(`/auth/verify-email#token=${verification}`);
  await expect(page).toHaveURL(/\/auth\/verify-email$/);
  await page.getByRole('button', { name: 'Verificar email', exact: true }).click();
  await expect(page.getByText('Email verificado correctamente.', { exact: true })).toBeVisible();
  expect((await (await context.request.get(`${api}/auth/session`)).json()).user.emailVerified).toBe(true);
  async function requestReset() {
    const previous = mailbox.filter(mail => mail.to === email && mail.kind === 'RESET').length;
    await page.goto('/auth/forgot-password');
    await page.getByLabel('Email', { exact: true }).fill(email);
    await page.getByRole('button', { name: 'Enviar enlace', exact: true }).click();
    await expect(page.getByText('Si el email corresponde a una cuenta, recibirá un enlace para restablecer su contraseña.')).toBeVisible();
    await expect.poll(() => mailbox.filter(mail => mail.to === email && mail.kind === 'RESET').length).toBe(previous + 1);
    return mailbox.filter(mail => mail.to === email && mail.kind === 'RESET').at(-1)!.token;
  }
  async function submitReset(token: string) {
    await page.goto(`/auth/reset-password#token=${token}`);
    await expect(page).toHaveURL(/\/auth\/reset-password$/);
    await page.getByLabel('Nueva contraseña', { exact: true }).fill(newPassword);
    await page.getByRole('button', { name: 'Guardar contraseña', exact: true }).click();
  }
  const expired = await requestReset();
  const db = prismaFixture();
  try { await db.emailToken.update({ where: { hash: createHash('sha256').update(expired).digest('hex') }, data: { expiresAt: new Date(0) } }); }
  finally { await db.$disconnect(); }
  await submitReset(expired);
  await expect(page.getByRole('alert').filter({ hasText: 'expiró' })).toBeVisible();
  await submitReset('f'.repeat(64));
  await expect(page.getByRole('alert').filter({ hasText: 'expiró' })).toBeVisible();
  const valid = await requestReset();
  await submitReset(valid);
  await expect(page.getByText('Contraseña actualizada correctamente. Ingrese con su nueva contraseña.', { exact: true })).toBeVisible();
  expect((await (await context.request.get(`${api}/auth/session`)).json()).authenticated).toBe(false);
  await submitReset(valid);
  await expect(page.getByRole('alert').filter({ hasText: 'expiró' })).toBeVisible();
  await page.goto('/auth/login');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Contraseña', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Revise su email' })).toBeVisible();
  await page.getByLabel('Contraseña', { exact: true }).fill(newPassword);
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Partidos disponibles', exact: true })).toBeVisible();
});

test('light, dark and system themes persist without authentication storage and respect reduced motion', async ({ page }) => {
  await register(page);
  await page.goto('/account/appearance');
  await page.getByRole('radio', { name: 'Oscuro', exact: true }).check();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await assertThemeContrast(page);
  await page.screenshot({ path: '.runtime/iteration2-dark.png', fullPage: true, animations: 'disabled' });
  await page.reload();
  await expect(page.getByRole('radio', { name: 'Oscuro', exact: true })).toBeChecked();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('radio', { name: 'Claro', exact: true }).check();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await assertThemeContrast(page);
  await page.screenshot({ path: '.runtime/iteration2-light.png', fullPage: true, animations: 'disabled' });
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await page.getByRole('radio', { name: 'Sistema', exact: true }).check();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.reload();
  await expect(page.getByRole('radio', { name: 'Sistema', exact: true })).toBeChecked();
  expect(await page.evaluate(() => ({ local: { ...localStorage }, session: { ...sessionStorage } }))).toEqual({ local: { 'hyt-theme-v1': 'system' }, session: {} });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const motion = await page.locator('.panel').evaluate(element => ({ animation: getComputedStyle(element).animationDuration, transition: getComputedStyle(element).transitionDuration }));
  expect(parseFloat(motion.animation)).toBeLessThanOrEqual(0.001);
  expect(parseFloat(motion.transition)).toBeLessThanOrEqual(0.001);
});

test('revoked account cache cannot expose its profile or history to the next login', async ({ page }) => {
  const firstEmail = await register(page);
  await page.getByRole('button', { name: 'Mi cuenta', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Perfil', exact: true }).click();
  await page.getByLabel('Nombre', { exact: true }).fill('Private account A');
  await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
  await expect(page.getByText('Perfil actualizado correctamente.', { exact: true })).toBeVisible();
  await expect(page.getByText('Private account A', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Nombre: Account Tester → Private account A', { exact: true })).toBeVisible();
  const db = prismaFixture();
  const secondEmail = `second-account-${randomUUID()}@example.test`;
  try {
    const first = await db.user.findUniqueOrThrow({ where: { email: firstEmail } });
    await db.user.create({ data: { name: 'Account B', email: secondEmail, passwordHash: await hashFixturePassword(password), primaryLocationId: first.primaryLocationId } });
    await db.session.updateMany({ where: { userId: first.id, revokedAt: null }, data: { revokedAt: new Date() } });
    // Trigger TanStack's browser-session revalidation without reloading the page or clearing its cache.
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
      window.dispatchEvent(new Event('visibilitychange'));
      Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
      window.dispatchEvent(new Event('visibilitychange'));
      Reflect.deleteProperty(document, 'visibilityState');
    });
    await expect(page).toHaveURL(/\/auth\/login/);
    await page.getByLabel('Email', { exact: true }).fill(secondEmail);
    await page.getByLabel('Contraseña', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Partidos disponibles', exact: true })).toBeVisible();
    let releaseProfile!: () => void;
    const profileBarrier = new Promise<void>(resolve => { releaseProfile = resolve; });
    await page.route('**/api/v1/users/me', async route => {
      if (route.request().method() === 'GET') await profileBarrier;
      await route.continue();
    });
    await page.getByRole('button', { name: 'Mi cuenta', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Perfil', exact: true }).click();
    try {
      await expect(page.getByText('Cargando perfil…', { exact: true })).toBeVisible();
      await expect(page.getByText('Nombre: Account Tester → Private account A', { exact: true })).toHaveCount(0);
      await expect(page.getByLabel('Email', { exact: true })).toHaveCount(0);
    } finally { releaseProfile(); }
    await expect(page.getByLabel('Email', { exact: true })).toHaveValue(secondEmail);
    await expect(page.getByLabel('Nombre', { exact: true })).toHaveValue('Account B');
    await expect(page.getByText(firstEmail, { exact: true })).toHaveCount(0);
    await expect(page.getByText('Private account A', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Nombre: Account Tester → Private account A', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Todavía no hay cambios en tu perfil.', { exact: true })).toBeVisible();
  } finally { await db.$disconnect(); }
});
