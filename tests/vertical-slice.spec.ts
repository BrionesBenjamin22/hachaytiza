import { randomUUID } from 'node:crypto';
import { test, expect, api, prismaFixture } from './support/harness';
import { chooseLocation, logout, expectHomeLocation } from './support/ui';

const password = 'Browser testing password 123!';

test('registration, locality discovery, temporary exploration and login restoration', async ({ page, context }) => {
  const email = `browser-${randomUUID()}@example.test`;
  await page.goto('/auth/register');
  await page.getByLabel('Nombre', { exact: true }).fill('Browser Tester');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Contraseña', { exact: true }).fill(password);
  await chooseLocation(page, 'Localidad principal', 'Tolosa');
  await page.getByRole('button', { name: 'Crear cuenta', exact: true }).click();
  await expectHomeLocation(page, 'Tolosa');
  await expect(page.getByText('Cancha de demostración 1', { exact: true })).toBeVisible();
  await page.screenshot({ path: '.runtime/iteration2-home-light.png', fullPage: true, animations: 'disabled' });
  const initialSession = await context.request.get(`${api}/auth/session`);
  expect((await initialSession.json()).user.primaryLocation.name).toBe('Tolosa');
  const cookies = await context.cookies();
  for (const name of ['furvo-access', 'furvo-refresh']) {
    const cookie = cookies.find(value => value.name === name);
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.secure).toBe(true);
  }
  expect(await page.evaluate(() => ({ local: { ...localStorage }, session: { ...sessionStorage }, cookies: document.cookie })))
    .toEqual({ local: {}, session: {}, cookies: '' });
  await page.reload();
  await expectHomeLocation(page, 'Tolosa');
  const cityBellId = (await (await context.request.get(`${api}/locations`)).json()).items.find((location: { name: string }) => location.name === 'City Bell').id;
  const cityBellResponse = page.waitForResponse(response => response.url().includes('/matches?') && new URL(response.url()).searchParams.get('locationId') === cityBellId && response.request().method() === 'GET');
  await chooseLocation(page, 'Localidad seleccionada', 'City Bell');
  const cityBell = await (await cityBellResponse).json();
  await expectHomeLocation(page, 'City Bell');
  expect(cityBell.items.length).toBeGreaterThan(0);
  expect(cityBell.items.every((match: { location: { name: string } }) => match.location.name === 'City Bell')).toBe(true);
  for (const match of cityBell.items) await expect(page.getByText(match.venueName, { exact: true })).toBeVisible();
  expect((await (await context.request.get(`${api}/auth/session`)).json()).user.primaryLocation.name).toBe('Tolosa');
  await page.getByRole('button', { name: 'Mi cuenta', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Perfil', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Localidad principal', exact: true })).toContainText('Tolosa');
  await page.getByRole('link', { name: 'Volver', exact: true }).click();
  await expectHomeLocation(page, 'City Bell');
  await logout(page);
  await expect.poll(async () => (await (await context.request.get(`${api}/auth/session`)).json()).authenticated).toBe(false);
  await page.goto('/auth/login');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Contraseña', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await expectHomeLocation(page, 'Tolosa');
});

test('unauthenticated route protection and public discovery', async ({ page }) => {
  await page.goto('/auth/location');
  await expect(page).toHaveURL(/\/auth\/login/);
  await page.goto('/partidos');
  await chooseLocation(page, 'Localidad seleccionada', 'Los Hornos');
  await expect(page.getByRole('heading', { name: 'Partidos en Los Hornos' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Ingresar', exact: true }).first()).toBeVisible();
});

test('existing account without locality selects it and continues to Home', async ({ page, context }) => {
  test.skip(!process.env.DATABASE_URL, 'Requires isolated local PostgreSQL for legacy-account fixture.');
  const db = prismaFixture();
  const email = `legacy-browser-${randomUUID()}@example.test`;
  try {
    await page.goto('/auth/register');
    await page.getByLabel('Nombre', { exact: true }).fill('Legacy Tester');
    await page.getByLabel('Email', { exact: true }).fill(email);
    await page.getByLabel('Contraseña', { exact: true }).fill(password);
    await chooseLocation(page, 'Localidad principal', 'Tolosa');
    await page.getByRole('button', { name: 'Crear cuenta', exact: true }).click();
    await expectHomeLocation(page, 'Tolosa');
    await db.user.update({ where: { email }, data: { primaryLocationId: null } });
    await logout(page);
    await expect.poll(async () => (await (await context.request.get(`${api}/auth/session`)).json()).authenticated).toBe(false);
    await page.goto('/auth/login');
    await page.getByLabel('Email', { exact: true }).fill(email);
    await page.getByLabel('Contraseña', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Elegí tu localidad' })).toBeVisible();
    await chooseLocation(page, 'Localidad principal', 'City Bell');
    await page.getByRole('button', { name: 'Guardar y continuar' }).click();
    await expectHomeLocation(page, 'City Bell');
    const saved = await db.user.findUniqueOrThrow({ where: { email }, include: { primaryLocation: true } });
    expect(saved.primaryLocation.name).toBe('City Bell');
  } finally {
    await db.$disconnect();
  }
});

test('Home shows loading, recoverable network error and an empty real locality', async ({ page }) => {
  let unavailable = true;
  await page.route('**/api/v1/matches?**', async route => {
    if (unavailable) await route.abort('failed');
    else {
      await new Promise(resolveDelay => setTimeout(resolveDelay, 400));
      await route.continue();
    }
  });
  await page.goto('/partidos');
  await chooseLocation(page, 'Localidad seleccionada', 'Tolosa');
  await expect(page.getByText('Cargando partidos…', { exact: true })).toBeVisible();
  await expect(page.getByRole('alert').filter({ hasText: 'Intente nuevamente' })).toBeVisible();
  unavailable = false;
  await page.getByRole('button', { name: 'Reintentar partidos' }).click();
  await expect(page.getByText('Cancha de demostración 1', { exact: true })).toBeVisible();
  await chooseLocation(page, 'Localidad seleccionada', 'Abasto');
  await expect(page.getByText('Todavía no hay partidos en esta localidad. Probá con otra zona.')).toBeVisible();
});
