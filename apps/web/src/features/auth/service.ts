import { mutate, request } from "@/lib/http";
import type { Location } from "@/features/locations/service";
export interface User { id: string; name: string; email: string; emailVerified: boolean; hasLocalPassword: boolean; createdAt: string; updatedAt: string; primaryLocation: Location | null }
export interface Session { authenticated: boolean; accessExpiresAt: string | null; refreshAvailable: boolean; user: User | null }
export interface RegisterInput { name: string; email: string; password: string; primaryLocationId: string }
export const authService = {
  session: () => request<Session>("/auth/session"),
  login: (input: { email: string; password: string }) => mutate<Session>("/auth/login", input),
  register: (input: RegisterInput) => mutate<Session>("/auth/register", input),
  logout: () => mutate("/auth/logout"),
  refresh: () => mutate<Session>("/auth/refresh"),
  setLocation: (primaryLocationId: string) => mutate<User>("/users/me/location", { primaryLocationId }, "PATCH"),
  requestReset: (email: string) => mutate("/auth/password/forgot", { email }),
  reset: (token: string, password: string) => mutate("/auth/password/reset", { token, password }),
  verify: (token: string) => mutate("/auth/email/verify", { token }),
  resendVerification: () => mutate("/auth/email/resend", {}),
};
