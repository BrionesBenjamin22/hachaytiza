import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.module.js';
import type { Prisma } from '@prisma/client';
import type { UpdateProfileDto } from './profile.dto.js';
import { lockUserCredentials } from '../prisma/user-lock.js';
export const userSelect = {
  id: true,
  name: true,
  email: true,
  emailVerifiedAt: true,
  passwordHash: true,
  createdAt: true,
  updatedAt: true,
  primaryLocation: { select: { id: true, name: true, type: true } },
} satisfies Prisma.UserSelect;
export const userDto = (
  user: Prisma.UserGetPayload<{ select: typeof userSelect }>,
) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  emailVerified: Boolean(user.emailVerifiedAt),
  hasLocalPassword: Boolean(user.passwordHash),
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
  primaryLocation: user.primaryLocation,
});
@Injectable()
export class UsersService {
  constructor(private readonly db: PrismaService) {}
  async profile(userId: string) {
    return userDto(
      await this.db.user.findUniqueOrThrow({
        where: { id: userId },
        select: userSelect,
      }),
    );
  }
  async updateProfile(userId: string, dto: UpdateProfileDto) {
    return this.db.$transaction(async (tx) => {
      await lockUserCredentials(tx, userId);
      const current = await tx.user.findUniqueOrThrow({
        where: { id: userId },
        select: { ...userSelect, primaryLocationId: true },
      });
      const data: Prisma.UserUpdateInput = {};
      const changes: Record<string, Prisma.InputJsonValue> = {};
      if (dto.name !== undefined && dto.name !== current.name) {
        data.name = dto.name;
        changes.name = { before: current.name, after: dto.name };
      }
      if (dto.primaryLocationId !== undefined) {
        const location = await tx.location.findFirst({
          where: {
            id: dto.primaryLocationId,
            active: true,
            type: { in: ['LOCALIDAD', 'BARRIO', 'ZONA'] },
          },
          select: { id: true, name: true },
        });
        if (!location)
          throw new BadRequestException({
            code: 'LOCATION_INVALID',
            message: 'Seleccione una localidad disponible.',
          });
        if (dto.primaryLocationId !== current.primaryLocationId) {
          data.primaryLocation = { connect: { id: dto.primaryLocationId } };
          changes.primaryLocation = {
            before: current.primaryLocation
              ? {
                  id: current.primaryLocation.id,
                  name: current.primaryLocation.name,
                }
              : null,
            after: location,
          };
        }
      }
      if (Object.keys(data).length === 0) return userDto(current);
      const user = await tx.user.update({
        where: { id: userId },
        data,
        select: userSelect,
      });
      await tx.userProfileChange.create({ data: { userId, changes } });
      return userDto(user);
    });
  }
  async history(userId: string, page: number) {
    const [items, total] = await this.db.$transaction(
      [
        this.db.userProfileChange.findMany({
          where: { userId },
          select: { id: true, occurredAt: true, changes: true },
          orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
          take: 3,
          skip: (page - 1) * 3,
        }),
        this.db.userProfileChange.count({ where: { userId } }),
      ],
      { isolationLevel: 'RepeatableRead' },
    );
    return { items, total, page, pageSize: 3, hasMore: page * 3 < total };
  }
  async validateLocation(id: string) {
    if (
      !(await this.db.location.findFirst({
        where: {
          id,
          active: true,
          type: { in: ['LOCALIDAD', 'BARRIO', 'ZONA'] },
        },
      }))
    )
      throw new BadRequestException({
        code: 'LOCATION_INVALID',
        message: 'Seleccione una localidad disponible.',
      });
  }
  async location(userId: string, id: string) {
    return this.updateProfile(userId, { primaryLocationId: id });
  }
}
