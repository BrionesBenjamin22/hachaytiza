import { test, expect } from '@playwright/test';
import { chooseLocation } from './support/ui';

// Public, read-only suite: deliberately uses no auth/Prisma/email harness.
const titles = ['Elegí dónde jugar', 'Anotate a un partido', 'Sumá a tus compañeros'];
const descriptions = [
  'Podrás buscar partidos en las localidades disponibles y consultar todo lo que necesitás saber: cancha, fecha, horario, formato, precio y lugares libres.',
  'Tenés ganas de jugar? Elegí un partido y reservá tu lugar, no necesitás conocer a los jugadores para participar.',
  'Si vas con amigos, podrás reservar también sus lugares en el mismo partido. Vos te anotás y sumás a los que se prenden.',
];

test('visitor pages preserve hero and CTAs with the shared public navigation', async ({ page }) => {
  const mutations: string[] = [];
  page.on('request', request => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method())) mutations.push(request.url());
  });
  await page.goto('/');
  await expect(page.getByText('Futbol en La Argentina', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Te falta uno.A alguien le falta partido.');
  await expect(page.getByText('Explorá los partidos sin crear una cuenta.', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Partidos', exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Ingresar', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Crear cuenta', exact: true }).last()).toHaveAttribute('href', '/auth/register');
  await page.getByRole('link', { name: 'Buscar un partido', exact: true }).click();
  await expect(page).toHaveURL(/\/partidos$/);
  await expect(page.getByRole('link', { name: 'Partidos', exact: true })).toHaveCount(0);
  await expect(page.getByRole('combobox', { name: 'Localidad seleccionada', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Crear cuenta', exact: true }).click();
  await expect(page).toHaveURL(/\/auth\/register$/);
  await expect(page.getByLabel('Nombre', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Partidos', exact: true })).toHaveCount(0);
  await expect(page.getByText('Ya tenés cuenta?', { exact: false })).toBeVisible();
  await expect(page.locator('main')).not.toContainText('¿');
  await page.goto('/auth/login');
  await expect(page.getByRole('link', { name: 'Partidos', exact: true })).toHaveCount(0);
  await expect(page.getByText('Todavía no tenés cuenta?', { exact: false })).toBeVisible();
  await expect(page.locator('main')).not.toContainText('¿');
  expect(mutations).toEqual([]);
});

test('unknown route returns 404 with one shared shell and working recovery links', async ({ page }) => {
  const response = await page.goto('/ruta-inexistente-landing-functional');
  expect(response?.status()).toBe(404);
  const code = page.getByRole('heading', { level: 1, name: '404', exact: true });
  await expect(code).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Acá no hay partido', exact: true })).toBeVisible();
  // The announced error code stays stable while decorative text may scramble.
  await page.waitForTimeout(700);
  await expect(code).toHaveAccessibleName('404');
  await expect(code.locator('[aria-hidden="true"]').first()).toHaveText('404');
  await expect(page.getByRole('banner')).toHaveCount(1);
  await expect(page.getByRole('contentinfo')).toHaveCount(1);
  await expect(page.getByRole('link', { name: 'Partidos', exact: true })).toHaveCount(0);
  await page.getByRole('link', { name: 'Volver al inicio', exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Te falta uno.A alguien le falta partido.');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const reducedResponse = await page.goto('/ruta-inexistente-landing-functional');
  expect(reducedResponse?.status()).toBe(404);
  const reducedCode = page.getByRole('heading', { level: 1, name: '404', exact: true });
  await expect(reducedCode).toBeVisible();
  await expect(reducedCode.locator('[aria-hidden="true"]').first()).toHaveText('404');
  await page.getByRole('link', { name: 'Buscar un partido', exact: true }).click();
  await expect(page).toHaveURL(/\/partidos$/);
  await expect(page.getByRole('combobox', { name: 'Localidad seleccionada', exact: true })).toBeVisible();
});

test('discovery renders a loading skeleton and a real empty locality with an actionable selector', async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/v1/matches?**', async route => { await gate; await route.continue(); });
  const locations = page.waitForResponse(response => new URL(response.url()).pathname === '/api/v1/locations' && response.request().method() === 'GET');
  await page.goto('/partidos');
  const catalog = await (await locations).json() as { items: { id: string; name: string }[] };
  const abasto = catalog.items.find(location => location.name === 'Abasto');
  expect(abasto, 'Existing Abasto locality seed').toBeDefined();
  await chooseLocation(page, 'Localidad seleccionada', 'Abasto');
  const status = page.getByRole('status').filter({ hasText: 'Cargando partidos…' });
  await expect(status).toBeVisible();
  await expect(status).toHaveAttribute('aria-busy', 'true');
  await expect(status.locator('.skeleton[aria-hidden="true"]').first()).toBeAttached();
  const matches = page.waitForResponse(response => new URL(response.url()).pathname === '/api/v1/matches' && new URL(response.url()).searchParams.get('locationId') === abasto?.id && response.request().method() === 'GET');
  release();
  const response = await matches;
  expect(response.ok()).toBe(true);
  const payload = await response.json() as { total: number };
  expect(payload.total, 'Development seed Abasto has no matches').toBe(0);
  await expect(page.getByRole('heading', { name: 'Busquemos en otra zona', exact: true })).toBeVisible();
  await expect(page.getByText('Todavía no hay partidos en esta localidad. Probá con otra zona.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Cambiar localidad', exact: true }).click();
  await expect(page.getByPlaceholder('Buscar localidad…')).toBeVisible();
  await expect(page.getByPlaceholder('Buscar localidad…')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('combobox', { name: 'Localidad seleccionada', exact: true })).toContainText('Abasto');
});

test('manual carousel exposes three benefits and accessible indicators with keyboard navigation', async ({ page }) => {
  await page.goto('/');
  const carousel = page.getByRole('region', { name: 'Más fácil juntarse a jugar', exact: true });
  const track = page.getByLabel('Beneficios de Hacha y Tiza', { exact: true });
  await expect(carousel.getByRole('button', { name: 'Anterior', exact: true })).toHaveCount(0);
  await expect(carousel.getByRole('button', { name: 'Siguiente', exact: true })).toHaveCount(0);
  async function current(index: number) {
    await expect(carousel.getByRole('group', { name: /^[123] de 3$/ })).toHaveCount(1);
    await expect(carousel.getByRole('group', { name: `${index + 1} de 3`, exact: true })).toBeVisible();
    await expect(carousel.getByRole('heading', { name: titles[index], exact: true })).toBeVisible();
    await expect(carousel.getByText(descriptions[index], { exact: true })).toBeVisible();
    for (let i = 0; i < 3; i++) {
      const indicator = carousel.getByRole('button', { name: `Ir a ${titles[i]}`, exact: true });
      if (i === index) await expect(indicator).toHaveAttribute('aria-current', 'true');
      else await expect(indicator).not.toHaveAttribute('aria-current', 'true');
    }
  }
  await current(0);
  await carousel.getByRole('button', { name: `Ir a ${titles[1]}`, exact: true }).focus();
  await page.keyboard.press('Enter');
  await current(1);
  await carousel.getByRole('button', { name: `Ir a ${titles[2]}`, exact: true }).focus();
  await page.keyboard.press('Space');
  await current(2);
  await track.focus();
  await page.keyboard.press('Home');
  await current(0);
  await page.keyboard.press('ArrowRight');
  await current(1);
  await page.keyboard.press('End');
  await current(2);
  await page.keyboard.press('ArrowRight');
  await current(2);
  await page.keyboard.press('ArrowLeft');
  await current(1);
  const first = carousel.getByRole('button', { name: `Ir a ${titles[0]}`, exact: true });
  await first.focus();
  await page.keyboard.press('Enter');
  await current(0);
  // A finite observation plus source/unit review checks the absence of rotation.
  await page.waitForTimeout(1_500);
  await current(0);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await carousel.getByRole('button', { name: `Ir a ${titles[2]}`, exact: true }).click();
  await current(2);
  await track.focus();
  await page.keyboard.press('Home');
  await current(0);
  await page.keyboard.press('ArrowLeft');
  await current(0);
});

test('a real mobile swipe updates the selected slide without rotating automatically', async ({ page, context }) => {
  await page.goto('/');
  const carousel = page.getByRole('region', { name: 'Más fácil juntarse a jugar', exact: true });
  const track = page.getByLabel('Beneficios de Hacha y Tiza', { exact: true });
  await track.scrollIntoViewIfNeeded();
  await expect.poll(() => track.evaluate(element => {
    const rect = element.getBoundingClientRect();
    const hit = document.elementFromPoint(rect.x + rect.width * 0.75, rect.y + Math.min(rect.height / 2, 100));
    return !!hit && element.contains(hit);
  }), { message: 'Touch coordinates target the carousel track' }).toBe(true);
  const box = await track.boundingBox();
  expect(box).not.toBeNull();
  if (!box) throw new Error('Carousel track has no gesture target');
  const client = await context.newCDPSession(page);
  const startX = Math.round(box.x + box.width * 0.9);
  const endX = Math.round(box.x + box.width * 0.1);
  const y = Math.round(box.y + Math.min(box.height / 2, 100));
  async function swipe(from: number, to: number) {
    await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: from, y }] });
    for (let step = 1; step <= 12; step++) {
      await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: Math.round(from + (to - from) * step / 12), y }] });
      await page.waitForTimeout(30);
    }
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  }
  await swipe(startX, endX);
  await expect(carousel.getByRole('button', { name: `Ir a ${titles[1]}`, exact: true })).toHaveAttribute('aria-current', 'true');
  await expect(carousel.getByRole('heading', { name: titles[1], exact: true })).toBeVisible();
  await swipe(endX, startX);
  await expect(carousel.getByRole('button', { name: `Ir a ${titles[0]}`, exact: true })).toHaveAttribute('aria-current', 'true');
  await swipe(endX, startX);
  await expect(carousel.getByRole('button', { name: `Ir a ${titles[0]}`, exact: true })).toHaveAttribute('aria-current', 'true');
  await client.detach();
});
