import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { AuthForm } from './auth-form';
import { Providers } from './session';

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));
const location = { id: '10000000-0000-4000-8000-000000000001', name: 'Tolosa', type: 'LOCALIDAD' };
const mutations: { path: string; body: unknown }[] = [];

beforeEach(() => {
  replace.mockClear();
  mutations.length = 0;
  vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit = {}) => {
    const path = new URL(url).pathname;
    if (init.method === 'POST') mutations.push({ path, body: JSON.parse(init.body as string) });
    const body = path.endsWith('/locations') ? { items: [location] }
      : path.endsWith('/auth/csrf') ? { csrfToken: 'unit-test-only-csrf' }
        : { authenticated: false, user: null, refreshAvailable: false, accessExpiresAt: null };
    return new Response(JSON.stringify(body), { status: 200 });
  }));
});
afterEach(() => { vi.unstubAllGlobals(); });

function fieldError(control: HTMLElement, message: string) {
  expect(control).toHaveAttribute('aria-invalid', 'true');
  expect(control).toHaveAccessibleDescription(expect.stringContaining(message));
  const references = control.getAttribute('aria-describedby')?.split(/\s+/) ?? [];
  expect(references.length).toBeGreaterThan(0);
  for (const id of references) expect(document.getElementById(id), `Description target ${id} exists`).not.toBeNull();
}

it('login reports associated field errors without sending credentials and clears them after a corrected submission', async () => {
  render(<Providers><AuthForm mode="login" /></Providers>);
  const email = screen.getByLabelText('Email', { exact: true });
  const password = screen.getByLabelText('Contraseña', { exact: true });
  fireEvent.change(email, { target: { value: 'invalid-email' } });
  fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }));
  expect(await screen.findByText('Ingrese un email válido.')).toBeInTheDocument();
  expect(screen.getByText('Ingrese su contraseña.')).toBeInTheDocument();
  fieldError(email, 'Ingrese un email válido.');
  fieldError(password, 'Ingrese su contraseña.');
  expect(mutations).toEqual([]);
  expect(replace).not.toHaveBeenCalled();

  fireEvent.change(email, { target: { value: 'player@example.test' } });
  fireEvent.change(password, { target: { value: 'Corrected login password 123!' } });
  fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }));
  await waitFor(() => expect(mutations).toEqual([{ path: '/api/v1/auth/login', body: { email: 'player@example.test', password: 'Corrected login password 123!' } }]));
  await waitFor(() => expect(replace).toHaveBeenCalledWith('/?success=login'));
  expect(email).toHaveAttribute('aria-invalid', 'false');
  expect(password).toHaveAttribute('aria-invalid', 'false');
  expect(screen.queryByText('Ingrese un email válido.')).not.toBeInTheDocument();
  expect(screen.queryByText('Ingrese su contraseña.')).not.toBeInTheDocument();
});

it('registration associates every invalid field with its message and submits only after all corrections', async () => {
  render(<Providers><AuthForm mode="register" /></Providers>);
  const submit = screen.getByRole('button', { name: 'Crear cuenta' });
  await waitFor(() => expect(submit).toBeEnabled());
  const name = screen.getByLabelText('Nombre', { exact: true });
  const email = screen.getByLabelText('Email', { exact: true });
  const password = screen.getByLabelText('Contraseña', { exact: true });
  const locality = screen.getByRole('combobox', { name: 'Localidad principal' });
  fireEvent.change(name, { target: { value: '   ' } });
  fireEvent.change(email, { target: { value: 'invalid-email' } });
  fireEvent.change(password, { target: { value: 'short' } });
  fireEvent.click(submit);
  expect(await screen.findByText('Ingrese su nombre.')).toBeInTheDocument();
  fieldError(name, 'Ingrese su nombre.');
  fieldError(email, 'Ingrese un email válido.');
  fieldError(password, 'Utilice al menos 8 caracteres.');
  fieldError(locality, 'Seleccione su localidad.');
  expect(password).toHaveAccessibleDescription(expect.stringContaining('Entre 8 y 128 caracteres.'));
  expect(mutations).toEqual([]);

  fireEvent.change(name, { target: { value: 'Jugador' } });
  fireEvent.change(email, { target: { value: 'player@example.test' } });
  fireEvent.change(password, { target: { value: 'Valid8!x' } });
  fireEvent.click(locality);
  fireEvent.click(await screen.findByRole('option', { name: 'Tolosa' }));
  fireEvent.click(submit);
  await waitFor(() => expect(mutations).toEqual([{ path: '/api/v1/auth/register', body: { name: 'Jugador', email: 'player@example.test', password: 'Valid8!x', primaryLocationId: location.id } }]));
  await waitFor(() => expect(replace).toHaveBeenCalledWith('/?success=registered'));
  for (const control of [name, email, password, locality]) expect(control).toHaveAttribute('aria-invalid', 'false');
  for (const message of ['Ingrese su nombre.', 'Ingrese un email válido.', 'Utilice al menos 8 caracteres.', 'Seleccione su localidad.']) expect(screen.queryByText(message)).not.toBeInTheDocument();
});
