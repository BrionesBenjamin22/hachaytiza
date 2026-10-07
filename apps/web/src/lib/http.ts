const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";
export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}
export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, { ...init, credentials: "include", cache: "no-store", headers: { "Content-Type": "application/json", ...init.headers } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(response.status, body.code ?? "REQUEST_FAILED", typeof body.message === "string" ? body.message : "No pudimos completar la solicitud. Intente nuevamente.");
  return body as T;
}
// Acquire a fresh token per mutation; rotated sessions cannot retain stale bindings.
export async function mutate<T>(path: string, body?: unknown, method = "POST"): Promise<T> {
  const { csrfToken } = await request<{ csrfToken: string }>("/auth/csrf");
  return request<T>(path, { method, headers: { "X-CSRF-Token": csrfToken }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
}
export function errorMessage(error: unknown): string {
  return error instanceof ApiError && error.status < 500 ? `Lo sentimos! ${error.message}` : "Lo sentimos! No pudimos recuperar su información. Intente nuevamente.";
}
