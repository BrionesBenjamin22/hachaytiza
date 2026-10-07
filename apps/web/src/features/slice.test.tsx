import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi, type Mock } from "vitest";
import { Providers } from "./auth/session";
import { Home } from "./matches/home";
import { AuthForm } from "./auth/auth-form";
import { LocationForm } from "./auth/location-form";
import { EmailAction } from "./auth/email-action";
import { StrictMode } from "react";
import { Profile } from "./account/profile";
import { Security } from "./account/security";
import { Appearance } from "./appearance/appearance";
import { useSession } from "./auth/session";
import { AccountMenu } from "@/components/account-menu";
const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
const tolosa = { id: "10000000-0000-4000-8000-000000000001", name: "Tolosa", type: "LOCALIDAD" };
const cityBell = { id: "10000000-0000-4000-8000-000000000002", name: "City Bell", type: "LOCALIDAD" };
const user = { id: "user", name: "Benjamín", email: "ben@example.com", emailVerified: true, hasLocalPassword: true, createdAt: "2026-10-01T12:00:00Z", updatedAt: "2026-10-01T12:00:00Z", primaryLocation: tolosa };
let current = { authenticated: true, user: user as typeof user | null, refreshAvailable: true, accessExpiresAt: new Date(Date.now() + 3_600_000).toISOString() };
let fetchMock: Mock<(url: string, init: RequestInit) => Promise<Response>>;
beforeEach(() => {
  replace.mockClear();
  current = { authenticated: true, user: { ...user }, refreshAvailable: true, accessExpiresAt: new Date(Date.now() + 3_600_000).toISOString() };
  fetchMock = vi.fn(async (url: string, init: RequestInit = {}) => {
    const path = new URL(url).pathname;
    let body: unknown;
    if (path.endsWith("/auth/session")) body = current;
    else if (path.endsWith("/auth/csrf")) body = { csrfToken: "csrf" };
    else if (path.endsWith("/locations")) body = { items: [tolosa, cityBell] };
    else if (path.endsWith("/matches")) { const location = new URL(url).searchParams.get("locationId") === tolosa.id ? tolosa : cityBell; body = { items: [{ id: location.id, location, footballType: "FIVE", startsAt: "2026-11-01T22:00:00Z", venueName: `Cancha ${location.name}`, address: "Calle 1", pricePerPerson: "5000", availablePlaces: 2, status: "OPEN", description: null }], total: 1, page: 1, pageSize: 9, hasMore: false }; }
    else if (path.endsWith("/users/me/location")) { const input = JSON.parse(init?.body as string); current.user = { ...user, primaryLocation: input.primaryLocationId === tolosa.id ? tolosa : cityBell }; body = current.user; }
    else if (path.endsWith("/users/me/history")) body = { items: [], total: 0, page: 1, pageSize: 3, hasMore: false };
    else if (path.endsWith("/users/me")) { if (init?.method === "PATCH") { const input = JSON.parse(init.body as string); current.user = { ...user, name: input.name ?? user.name, primaryLocation: input.primaryLocationId === cityBell.id ? cityBell : tolosa }; } body = current.user; }
    else if (path.endsWith("/auth/password/change")) { current = { ...current, user: null, authenticated: false, refreshAvailable: false }; body = { message: "Contraseña actualizada." }; }
    else if (path.endsWith("/auth/register") || path.endsWith("/auth/login")) { current = { ...current, authenticated: true, user }; body = current; }
    else body = { message: "OK" };
    return new Response(JSON.stringify(body), { status: 200 });
  });
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => { vi.unstubAllGlobals(); window.history.replaceState({}, "", "/"); });
async function chooseLocation(label: string, locality: string) {
  const trigger = await screen.findByRole("combobox", { name: label });
  await waitFor(() => expect(trigger).toBeEnabled());
  fireEvent.click(trigger);
  fireEvent.change(screen.getByPlaceholderText("Buscar localidad…"), { target: { value: locality } });
  fireEvent.click(await screen.findByRole("option", { name: locality }));
}
it("starts at the primary locality and changes only the temporary match filter", async () => {
  render(<Providers><Home /></Providers>);
  expect(await screen.findByRole("heading", { name: "Partidos disponibles" })).toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "Partidos en Tolosa" })).not.toBeInTheDocument();
  expect(await screen.findByText("Cancha Tolosa")).toBeInTheDocument();
  await chooseLocation("Localidad seleccionada", "City Bell");
  expect(await screen.findByText("Cancha City Bell")).toBeInTheDocument();
  expect(current.user?.primaryLocation).toEqual(tolosa);
  expect(fetchMock.mock.calls.some(([url]) => url.includes("/users/me/location"))).toBe(false);
});
it("redirects an authenticated user with no primary locality", async () => {
  current.user = { ...user, primaryLocation: null } as unknown as typeof user;
  render(<Providers><Home /></Providers>);
  await waitFor(() => expect(replace).toHaveBeenCalledWith("/auth/location"));
});
it("saves the missing locality and continues to Home", async () => {
  current.user = { ...user, primaryLocation: null } as unknown as typeof user;
  render(<Providers><LocationForm /></Providers>);
  await chooseLocation("Localidad principal", "Tolosa");
  fireEvent.click(screen.getByRole("button", { name: "Guardar y continuar" }));
  await waitFor(() => expect(current.user?.primaryLocation).toEqual(tolosa));
  await waitFor(() => expect(replace).toHaveBeenCalledWith("/?success=location"));
});
it("validates register fields and sends the selected real locality", async () => {
  current = { ...current, authenticated: false, user: null };
  render(<Providers><AuthForm mode="register" /></Providers>);
  expect(screen.getByText(/Ya tenés cuenta\?/)).toHaveTextContent("Ya tenés cuenta?");
  expect(screen.getByText(/Ya tenés cuenta\?/)).not.toHaveTextContent("¿");
  await waitFor(() => expect(screen.getByRole("button", { name: "Crear cuenta" })).toBeEnabled());
  fireEvent.click(screen.getByRole("button", { name: "Crear cuenta" }));
  expect(await screen.findByText("Ingrese su nombre.")).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Benjamín" } });
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "ben@example.com" } });
  fireEvent.change(screen.getByLabelText("Contraseña"), { target: { value: "una contraseña extensa" } });
  await chooseLocation("Localidad principal", "Tolosa");
  fireEvent.click(screen.getByRole("button", { name: "Crear cuenta" }));
  await waitFor(() => expect(fetchMock.mock.calls.find(([url]) => url.endsWith("/auth/register"))?.[1]).toMatchObject({ body: JSON.stringify({ name: "Benjamín", email: "ben@example.com", password: "una contraseña extensa", primaryLocationId: tolosa.id }) }));
});
it("removes the email URL token before explicit confirmation and sends it only in a protected mutation", async () => {
  window.history.replaceState({}, "", "/auth/verify-email#token=one-time");
  render(<StrictMode><Providers><EmailAction mode="verify" /></Providers></StrictMode>);
  expect(window.location.hash).toBe("");
  expect(fetchMock.mock.calls.some(([url]) => url.endsWith("/auth/email/verify"))).toBe(false);
  fireEvent.click(screen.getByRole("button", { name: "Verificar email" }));
  expect(await screen.findByText("Email verificado correctamente.")).toBeInTheDocument();
  expect(fetchMock.mock.calls.find(([url]) => url.endsWith("/auth/email/verify"))?.[1]).toMatchObject({ body: JSON.stringify({ token: "one-time" }), headers: { "X-CSRF-Token": "csrf" } });
});
it("shows the visitor landing and preserves public discovery without auth", async () => {
  current = { ...current, authenticated: false, user: null };
  const view = render(<Providers><Home /></Providers>);
  expect(await screen.findByRole("heading", { name: /Te falta uno/ })).toBeInTheDocument();
  expect(screen.getByText("Futbol en La Argentina")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Buscar un partido" })).toHaveAttribute("href", "/partidos");
  view.unmount();
  render(<Providers><Home discovery /></Providers>);
  await screen.findByRole("heading", { name: "Partidos disponibles" });
  await chooseLocation("Localidad seleccionada", "Tolosa");
  expect(await screen.findByText("Cancha Tolosa")).toBeInTheDocument();
});
it("skips unchanged profile updates and sends only actual field changes", async () => {
  render(<Providers><Profile /></Providers>);
  await screen.findByDisplayValue("ben@example.com");
  fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
  expect(await screen.findByText("No hay cambios para guardar.")).toBeInTheDocument();
  expect(fetchMock.mock.calls.some(([url, init]) => url.endsWith("/users/me") && init?.method === "PATCH")).toBe(false);
  fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: " Benja " } });
  fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
  expect(await screen.findByText("Perfil actualizado correctamente.")).toBeInTheDocument();
  expect(fetchMock.mock.calls.find(([url, init]) => url.endsWith("/users/me") && init?.method === "PATCH")?.[1].body).toBe(JSON.stringify({ name: "Benja" }));
  expect(screen.getByLabelText("Email")).toHaveAttribute("readonly");
});
function IdentityControls() {
  const session = useSession();
  return <button onClick={() => void session.synchronize()}>Consultar nueva sesión</button>;
}
it("isolates private profile caches when identity changes without logout", async () => {
  render(<Providers><IdentityControls /><Profile /></Providers>);
  await screen.findByDisplayValue("ben@example.com");
  current.user = { ...user, id: "another-user", name: "Otra persona", email: "otra@example.com" };
  fireEvent.click(screen.getByRole("button", { name: "Consultar nueva sesión" }));
  await screen.findByDisplayValue("otra@example.com");
  expect(screen.queryByDisplayValue("ben@example.com")).not.toBeInTheDocument();
  expect(screen.getByLabelText("Nombre")).toHaveValue("Otra persona");
});
it("requires matching password confirmation then revokes the session and redirects to login", async () => {
  render(<Providers><Security /></Providers>);
  await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => url.endsWith("/auth/session"))).toBe(true));
  fireEvent.change(screen.getByLabelText("Contraseña actual"), { target: { value: "una contraseña previa" } });
  fireEvent.change(screen.getByLabelText("Nueva contraseña"), { target: { value: "una contraseña nueva" } });
  fireEvent.change(screen.getByLabelText("Confirmar nueva contraseña"), { target: { value: "no coincide" } });
  fireEvent.click(screen.getByRole("button", { name: "Cambiar contraseña" }));
  expect(await screen.findByText("Las contraseñas no coinciden.")).toBeInTheDocument();
  expect(fetchMock.mock.calls.some(([url]) => url.endsWith("/auth/password/change"))).toBe(false);
  fireEvent.change(screen.getByLabelText("Confirmar nueva contraseña"), { target: { value: "una contraseña nueva" } });
  fireEvent.click(screen.getByRole("button", { name: "Cambiar contraseña" }));
  await waitFor(() => expect(replace).toHaveBeenCalledWith("/auth/login?success=password-changed"));
  expect(current.authenticated).toBe(false);
  expect(fetchMock.mock.calls.find(([url]) => url.endsWith("/auth/password/change"))?.[1].body).toBe(JSON.stringify({ currentPassword: "una contraseña previa", newPassword: "una contraseña nueva" }));
});
it("persists only the appearance preference and applies dark/light themes", () => {
  localStorage.removeItem("hyt-theme-v1");
  render(<Appearance />);
  fireEvent.click(screen.getByRole("radio", { name: "Oscuro" }));
  expect(document.documentElement.dataset.theme).toBe("dark");
  expect(localStorage.getItem("hyt-theme-v1")).toBe("dark");
  fireEvent.click(screen.getByRole("radio", { name: "Claro" }));
  expect(document.documentElement.dataset.theme).toBe("light");
  fireEvent.click(screen.getByRole("radio", { name: "Sistema" }));
  expect(screen.getByRole("radio", { name: "Sistema" })).toBeChecked();
  localStorage.removeItem("hyt-theme-v1");
});
it("keeps appearance usable when browser storage is blocked", () => {
  const get = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("Blocked"); });
  const set = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Blocked"); });
  try { render(<Appearance />); fireEvent.click(screen.getByRole("radio", { name: "Oscuro" })); expect(document.documentElement.dataset.theme).toBe("dark"); expect(screen.getByRole("radio", { name: "Oscuro" })).toBeChecked(); } finally { get.mockRestore(); set.mockRestore(); }
});
it("opens the account menu by keyboard and exposes only implemented destinations", async () => {
  render(<Providers><AccountMenu /></Providers>);
  await waitFor(() => expect(screen.getByRole("button", { name: "Mi cuenta" })).toHaveTextContent("Benjamín"));
  fireEvent.keyDown(screen.getByRole("button", { name: "Mi cuenta" }), { key: "Enter" });
  expect(await screen.findByRole("menuitem", { name: "Perfil" })).toHaveAttribute("href", "/account/profile");
  expect(screen.getByRole("menuitem", { name: "Seguridad" })).toHaveAttribute("href", "/account/security");
  expect(screen.getByRole("menuitem", { name: "Apariencia" })).toHaveAttribute("href", "/account/appearance");
  expect(screen.getByRole("menuitem", { name: "Cerrar sesión" })).toBeInTheDocument();
  expect(screen.queryByText("Mis partidos")).not.toBeInTheDocument();
});
it("shows an empty locality search and closes it with Escape", async () => {
  render(<Providers><Home /></Providers>);
  const trigger = await screen.findByRole("combobox", { name: "Localidad seleccionada" });
  await waitFor(() => expect(trigger).toBeEnabled()); fireEvent.click(trigger);
  const search = screen.getByPlaceholderText("Buscar localidad…");
  fireEvent.change(search, { target: { value: "no-existe" } });
  expect(await screen.findByText("No encontramos localidades. Probá con otro nombre.")).toBeInTheDocument();
  fireEvent.keyDown(search, { key: "Escape" });
  await waitFor(() => expect(screen.queryByPlaceholderText("Buscar localidad…")).not.toBeInTheDocument());
  expect(trigger).toHaveAttribute("aria-expanded", "false");
});
it("paginates private field history in groups of three", async () => {
  const base = fetchMock.getMockImplementation()!;
  fetchMock.mockImplementation(async (url: string, init: RequestInit = {}) => {
    if (new URL(url).pathname.endsWith("/users/me/history")) {
      const page = Number(new URL(url).searchParams.get("page"));
      const all = [1, 2, 3, 4].map(number => ({ id: String(number), occurredAt: "2026-10-01T12:00:00Z", changes: { name: { before: "Benjamín", after: `Nombre ${number}` } } }));
      return new Response(JSON.stringify({ items: all.slice((page - 1) * 3, page * 3), total: 4, page, pageSize: 3, hasMore: page === 1 }));
    }
    return base(url, init);
  });
  render(<Providers><Profile /></Providers>);
  await screen.findByText("Nombre: Benjamín → Nombre 1");
  expect(screen.getByText("Nombre: Benjamín → Nombre 3")).toBeInTheDocument();
  expect(screen.queryByText("Nombre: Benjamín → Nombre 4")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
  expect(await screen.findByText("Nombre: Benjamín → Nombre 4")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Siguiente" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Anterior" })).toBeEnabled();
});
it("shows an empty match listing without inventing matches", async () => {
  const base = fetchMock.getMockImplementation()!;
  fetchMock.mockImplementation(async (url: string, init: RequestInit = {}) => new URL(url).pathname.endsWith("/matches") ? new Response(JSON.stringify({ items: [], total: 0, page: 1, pageSize: 9, hasMore: false })) : base(url, init));
  render(<Providers><Home /></Providers>);
  expect(await screen.findByText("Todavía no hay partidos en esta localidad. Probá con otra zona.")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Cargar más partidos" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Cambiar localidad" }));
  expect(await screen.findByPlaceholderText("Buscar localidad…")).toHaveFocus();
  fireEvent.click(screen.getByRole("option", { name: "City Bell" }));
  await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => url.includes("/matches?") && url.includes(cityBell.id))).toBe(true));
  expect(current.user?.primaryLocation).toEqual(tolosa);
});
it("replaces decorative match skeletons with real results after loading", async () => {
  const base = fetchMock.getMockImplementation()!;
  let release: () => void = () => {};
  const gate = new Promise<void>(resolve => { release = resolve; });
  fetchMock.mockImplementation(async (url: string, init: RequestInit = {}) => {
    if (new URL(url).pathname.endsWith("/matches")) await gate;
    return base(url, init);
  });
  const view = render(<Providers><Home /></Providers>);
  expect(await screen.findByText("Cargando partidos…")).toBeInTheDocument();
  expect(view.container.querySelector('.skeleton[aria-hidden="true"]')).toBeInTheDocument();
  expect(screen.queryByText("Todavía no hay partidos en esta localidad. Probá con otra zona.")).not.toBeInTheDocument();
  await act(async () => { release(); await gate; });
  expect(await screen.findByText("Cancha Tolosa")).toBeInTheDocument();
  expect(screen.queryByText("Cargando partidos…")).not.toBeInTheDocument();
  expect(view.container.querySelector(".skeleton")).not.toBeInTheDocument();
});
it("shows safe match errors with a retry action", async () => {
  const base = fetchMock.getMockImplementation()!;
  fetchMock.mockImplementation(async (url: string, init: RequestInit = {}) => new URL(url).pathname.endsWith("/matches") ? new Response(JSON.stringify({ code: "INTERNAL_SERVER_ERROR", message: "private debug information" }), { status: 500 }) : base(url, init));
  render(<Providers><Home /></Providers>);
  expect(await screen.findByRole("button", { name: "Reintentar partidos" }, { timeout: 5000 })).toBeInTheDocument();
  expect(screen.queryByText("private debug information")).not.toBeInTheDocument();
  expect(screen.getByRole("alert")).toHaveTextContent("Intente nuevamente.");
});
it.each(["reset", "verify"] as const)("captures a new %s link on the same page after an expired link", async mode => {
  const base = fetchMock.getMockImplementation()!;
  const endpoint = mode === "reset" ? "/auth/password/reset" : "/auth/email/verify";
  fetchMock.mockImplementation(async (url: string, init: RequestInit = {}) => {
    if (new URL(url).pathname.endsWith(endpoint) && JSON.parse(init.body as string).token === "expired") return new Response(JSON.stringify({ code: "TOKEN_INVALID", message: "Este enlace expiró." }), { status: 400 });
    return base(url, init);
  });
  const path = mode === "reset" ? "/auth/reset-password" : "/auth/verify-email";
  window.history.replaceState({}, "", `${path}#token=expired`);
  render(<StrictMode><Providers><EmailAction mode={mode} /></Providers></StrictMode>);
  if (mode === "reset") fireEvent.change(screen.getByLabelText("Nueva contraseña"), { target: { value: "contraseña nueva segura" } });
  fireEvent.click(screen.getByRole("button", { name: mode === "reset" ? "Guardar contraseña" : "Verificar email" }));
  expect(await screen.findByText("Lo sentimos! Este enlace expiró.")).toBeInTheDocument();
  act(() => { window.history.replaceState({}, "", `${path}#token=new-link`); window.dispatchEvent(new HashChangeEvent("hashchange")); });
  expect(window.location.hash).toBe("");
  expect(screen.queryByText("Lo sentimos! Este enlace expiró.")).not.toBeInTheDocument();
  expect(fetchMock.mock.calls.filter(([url]) => url.endsWith(endpoint))).toHaveLength(1);
  if (mode === "reset") { expect(screen.getByLabelText("Nueva contraseña")).toHaveValue(""); fireEvent.change(screen.getByLabelText("Nueva contraseña"), { target: { value: "contraseña nueva segura" } }); }
  fireEvent.click(screen.getByRole("button", { name: mode === "reset" ? "Guardar contraseña" : "Verificar email" }));
  expect(await screen.findByText(mode === "reset" ? "Contraseña actualizada correctamente. Ingrese con su nueva contraseña." : "Email verificado correctamente.")).toBeInTheDocument();
  expect(fetchMock.mock.calls.filter(([url]) => url.endsWith(endpoint)).map(([, init]) => JSON.parse(init.body as string).token)).toEqual(["expired", "new-link"]);
});
it("keeps a newly captured email token when an older in-flight confirmation completes", async () => {
  const base = fetchMock.getMockImplementation()!;
  let resolveOld: (response: Response) => void = () => {};
  const oldResponse = new Promise<Response>(resolve => { resolveOld = resolve; });
  fetchMock.mockImplementation(async (url: string, init: RequestInit = {}) => {
    if (new URL(url).pathname.endsWith("/auth/email/verify") && JSON.parse(init.body as string).token === "old-link") return oldResponse;
    return base(url, init);
  });
  window.history.replaceState({}, "", "/auth/verify-email#token=old-link");
  render(<Providers><EmailAction mode="verify" /></Providers>);
  fireEvent.click(screen.getByRole("button", { name: "Verificar email" }));
  await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => url.endsWith("/auth/email/verify"))).toBe(true));
  act(() => { window.history.replaceState({}, "", "/auth/verify-email#token=new-link"); window.dispatchEvent(new HashChangeEvent("hashchange")); });
  await act(async () => { resolveOld(new Response(JSON.stringify({ message: "OK" }))); await oldResponse; });
  await waitFor(() => expect(screen.getByRole("button", { name: "Verificar email" })).toBeEnabled());
  expect(screen.queryByText("Email verificado correctamente.")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Verificar email" }));
  expect(await screen.findByText("Email verificado correctamente.")).toBeInTheDocument();
  expect(fetchMock.mock.calls.filter(([url]) => url.endsWith("/auth/email/verify")).map(([, init]) => JSON.parse(init.body as string).token)).toEqual(["old-link", "new-link"]);
});
