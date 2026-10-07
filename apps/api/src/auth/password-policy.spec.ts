import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ChangePasswordDto, LoginDto, RegisterDto, ResetPasswordDto } from './auth.dto.js';

const cases = [
  { length: 7, valid: false },
  { length: 8, valid: true },
  { length: 128, valid: true },
  { length: 129, valid: false },
];
const email = 'policy-fixture@example.test';
const primaryLocationId = '10000000-0000-4000-8000-000000000001';

describe.each(cases)('password DTO boundary $length', ({ length, valid }) => {
  const password = 'x'.repeat(length);
  it('validates login without altering password bytes', async () => {
    const dto = plainToInstance(LoginDto, { email, password });
    expect((await validate(dto)).length === 0).toBe(valid);
    expect(dto.password).toBe(password);
  });
  it('validates registration', async () => {
    const dto = plainToInstance(RegisterDto, { name: 'Policy Fixture', email, password, primaryLocationId });
    expect((await validate(dto)).length === 0).toBe(valid);
  });
  it('validates reset', async () => {
    const dto = plainToInstance(ResetPasswordDto, { token: 'a'.repeat(64), password });
    expect((await validate(dto)).length === 0).toBe(valid);
  });
  it('validates current password independently during change', async () => {
    const dto = plainToInstance(ChangePasswordDto, { currentPassword: password, newPassword: 'New8!pwd' });
    expect((await validate(dto)).length === 0).toBe(valid);
  });
  it('validates new password independently during change', async () => {
    const dto = plainToInstance(ChangePasswordDto, { currentPassword: 'Old8!pwd', newPassword: password });
    expect((await validate(dto)).length === 0).toBe(valid);
  });
});
