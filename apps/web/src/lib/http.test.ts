import { afterEach, expect, it, vi } from "vitest";
import { mutate, request } from "./http";
afterEach(() => vi.unstubAllGlobals());
it("uses cookies and obtains a fresh CSRF token before each mutation", async () => {
  const fetch = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ csrfToken: "csrf-one" }))).mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }))).mockResolvedValueOnce(new Response(JSON.stringify({ csrfToken: "csrf-two" }))).mockResolvedValueOnce(new Response(null, { status: 204 }));
  vi.stubGlobal("fetch", fetch);
  await mutate("/auth/login", { email: "test@example.com", password: "secret" });
  await mutate("/auth/logout");
  expect(fetch.mock.calls[1][1]).toMatchObject({ credentials: "include", method: "POST", headers: { "X-CSRF-Token": "csrf-one" } });
  expect(fetch.mock.calls[3][1].headers["X-CSRF-Token"]).toBe("csrf-two");
});
it("does not automatically refresh failed authenticated requests", async () => {
  const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: "UNAUTHORIZED", message: "Sesión finalizada." }), { status: 401 }));
  vi.stubGlobal("fetch", fetch);
  await expect(request("/users/me")).rejects.toMatchObject({ status: 401 });
  expect(fetch).toHaveBeenCalledTimes(1);
});
