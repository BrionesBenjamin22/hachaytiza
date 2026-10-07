import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { LoginDto, RegisterDto, ChangePasswordDto } from './auth.dto.js';
import { AuthService, hashToken } from './auth.service.js';

describe('authentication input and credential boundaries', () => {
  it('preserves password bytes and requires both password change credentials', async () => {
    const dto = plainToInstance(ChangePasswordDto, {
      currentPassword: '  current password  ',
      newPassword: '  replacement password  ',
    });
    expect(dto.currentPassword).toBe('  current password  ');
    expect(dto.newPassword).toBe('  replacement password  ');
    expect(await validate(dto)).toEqual([]);
    expect(
      (
        await validate(
          plainToInstance(ChangePasswordDto, {
            currentPassword: 'short',
            newPassword: null,
          }),
        )
      ).map((error) => error.property),
    ).toEqual(expect.arrayContaining(['currentPassword', 'newPassword']));
  });
  it('normalizes emails without modifying password bytes', async () => {
    const dto = plainToInstance(LoginDto, {
      email: '  TEST@EXAMPLE.COM ',
      password: ' a valid password ',
    });
    expect(dto.email).toBe('test@example.com');
    expect(dto.password).toBe(' a valid password ');
    expect(await validate(dto)).toEqual([]);
  });
  it('rejects weak passwords and non UUID locality references', async () => {
    const dto = plainToInstance(RegisterDto, {
      name: 'Test',
      email: 'test@example.com',
      password: 'short',
      primaryLocationId: 'Tolosa',
    });
    expect((await validate(dto)).map((error) => error.property)).toEqual(
      expect.arrayContaining(['password', 'primaryLocationId']),
    );
  });
  it('hashes high entropy credentials before persistence', () => {
    expect(hashToken('credential')).toMatch(/^[a-f0-9]{64}$/);
    expect(hashToken('credential')).not.toBe('credential');
  });
  it('does not wait for password reset delivery for an existing account', async () => {
    const service = Object.create(AuthService.prototype) as AuthService;
    let release!: () => void;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    Object.assign(service, {
      db: {
        user: {
          findUnique: async () => ({ id: 'user', email: 'test@example.com' }),
        },
      },
      logger: { warn: vi.fn() },
      issueEmail: vi.fn(() => pending),
    });
    const response = await service.forgot('test@example.com');
    expect(response.message).toContain('Si existe');
    release();
  });
});
