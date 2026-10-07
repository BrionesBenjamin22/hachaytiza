import { mutate, request } from "@/lib/http";
import type { User } from "@/features/auth/service";
export const accountService = {
  history: (page: number) => request<{ items: { id: string; occurredAt: string; changes: { name?: { before: string; after: string }; primaryLocation?: { before: { id: string; name: string } | null; after: { id: string; name: string } } } }[]; total: number; page: number; pageSize: number; hasMore: boolean }>(`/users/me/history?page=${page}`),
  profile: () => request<User>("/users/me"),
  updateProfile: (input: { name?: string; primaryLocationId?: string }) => mutate<User>("/users/me", input, "PATCH"),
  changePassword: (input: { currentPassword: string; newPassword: string }) => mutate("/auth/password/change", input),
};
