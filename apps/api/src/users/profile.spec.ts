import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateProfileDto } from './profile.dto.js';
import { UsersService } from './users.service.js';

describe('profile patch boundaries', () => {
  it('accepts partial edits, preserves omission, and trims names', async () => {
    const dto = plainToInstance(UpdateProfileDto, { name: '  Benjamín  ' });
    expect(dto.name).toBe('Benjamín');
    expect(dto.primaryLocationId).toBeUndefined();
    expect(await validate(dto)).toEqual([]);
  });
  it('rejects null values and identity or credentials injection', async () => {
    const dto = plainToInstance(UpdateProfileDto, {
      name: null,
      primaryLocationId: null,
      userId: 'other',
      email: 'other@example.com',
      passwordHash: 'hash',
    });
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining([
        'name',
        'primaryLocationId',
        'userId',
        'email',
        'passwordHash',
      ]),
    );
  });
  it('does not write unchanged fields or advance updatedAt', async () => {
    const update = vi.fn();
    const user = {
      id: 'user',
      name: 'Benjamín',
      email: 'test@example.com',
      emailVerifiedAt: null,
      passwordHash: 'private',
      primaryLocation: null,
    };
    const tx = {
      $queryRaw: vi
        .fn()
        .mockResolvedValue([{ id: 'user', passwordHash: 'private' }]),
      user: {
        findUniqueOrThrow: vi
          .fn()
          .mockResolvedValue({ ...user, primaryLocationId: null }),
        update,
      },
      userProfileChange: { create: vi.fn() },
    };
    const service = new UsersService({
      $transaction: async (callback: (tx: unknown) => unknown) => callback(tx),
    } as never);
    const result = await service.updateProfile('user', { name: 'Benjamín' });
    expect(update).not.toHaveBeenCalled();
    expect(tx.userProfileChange.create).not.toHaveBeenCalled();
    expect(result.hasLocalPassword).toBe(true);
    expect(result).not.toHaveProperty('passwordHash');
  });
});
