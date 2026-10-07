import type { Prisma } from '@prisma/client';

export async function lockUserCredentials(
  tx: Prisma.TransactionClient,
  userId: string,
) {
  const rows = await tx.$queryRaw<
    { id: string; passwordHash: string | null }[]
  >`SELECT "id", "passwordHash" FROM "User" WHERE "id" = ${userId}::uuid FOR UPDATE`;
  return rows[0];
}
