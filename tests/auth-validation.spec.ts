import { test, expect, type Page } from '@playwright/test';

// Public form validation only: no auth harness, valid submissions or data writes.
async function observeProtectedMutations(page: Page) {
  const requests: string[] = [];
  await page.route('**/api/v1/auth/**', async route => {
    if (route.request().method() === 'POST') {
      requests.push(new URL(route.request().url()).pathname);
      await route.abort();
    } else await route.continue();
  });
  return requests;
}

test('login invalid fields expose associated errors without submitting authentication', async ({ page }) => {
  const mutations = await observeProtectedMutations(page);
  await page.goto('/auth/login');
  const email = page.getByLabel('Email', { exact: true });
  const password = page.getByLabel('Contraseña', { exact: true });
  await email.fill('invalid-email');
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await expect(page.getByText('Ingrese un email válido.', { exact: true })).toBeVisible();
  await expect(page.getByText('Ingrese su contraseña.', { exact: true })).toBeVisible();
  await expect(email).toHaveAttribute('aria-invalid', 'true');
  await expect(email).toHaveAccessibleDescription('Ingrese un email válido.');
  await expect(password).toHaveAttribute('aria-invalid', 'true');
  await expect(password).toHaveAccessibleDescription('Ingrese su contraseña.');
  await email.fill('player@example.test');
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await expect(email).toHaveAttribute('aria-invalid', 'false');
  await expect(page.getByText('Ingrese un email válido.', { exact: true })).toHaveCount(0);
  await expect(password).toHaveAttribute('aria-invalid', 'true');
  expect(mutations).toEqual([]);
  await expect(page).toHaveURL(/\/auth\/login$/);
});

test('registration invalid fields include locality and retain only unresolved errors', async ({ page }) => {
  const mutations = await observeProtectedMutations(page);
  await page.goto('/auth/register');
  const submit = page.getByRole('button', { name: 'Crear cuenta', exact: true });
  await expect(submit).toBeEnabled();
  const name = page.getByLabel('Nombre', { exact: true });
  const email = page.getByLabel('Email', { exact: true });
  const password = page.getByLabel('Contraseña', { exact: true });
  const locality = page.getByRole('combobox', { name: 'Localidad principal', exact: true });
  await name.fill('   ');
  await email.fill('invalid-email');
  await password.fill('short');
  await submit.click();
  await expect(name).toHaveAttribute('aria-invalid', 'true');
  await expect(name).toHaveAccessibleDescription('Ingrese su nombre.');
  await expect(email).toHaveAttribute('aria-invalid', 'true');
  await expect(email).toHaveAccessibleDescription('Ingrese un email válido.');
  await expect(password).toHaveAttribute('aria-invalid', 'true');
  await expect(password).toHaveAccessibleDescription('Entre 8 y 128 caracteres. Utilice al menos 8 caracteres.');
  await expect(locality).toHaveAttribute('aria-invalid', 'true');
  await expect(locality).toHaveAccessibleDescription('Seleccione su localidad.');
  await name.fill('Jugador');
  await email.fill('player@example.test');
  await submit.click();
  await expect(name).toHaveAttribute('aria-invalid', 'false');
  await expect(email).toHaveAttribute('aria-invalid', 'false');
  await expect(password).toHaveAttribute('aria-invalid', 'true');
  await expect(locality).toHaveAttribute('aria-invalid', 'true');
  expect(mutations).toEqual([]);
  await expect(page).toHaveURL(/\/auth\/register$/);
});
