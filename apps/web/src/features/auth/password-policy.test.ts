import { expect, it } from 'vitest';
import { loginSchema, passwordSchema, registerSchema } from './validation';

const cases = [
  { length: 7, valid: false },
  { length: 8, valid: true },
  { length: 128, valid: true },
  { length: 129, valid: false },
];

it.each(cases)('shared password schema accepts boundary $length: $valid', ({ length, valid }) => {
  expect(passwordSchema.safeParse('x'.repeat(length)).success).toBe(valid);
});

it.each(cases)('registration accepts password boundary $length: $valid', ({ length, valid }) => {
  expect(registerSchema.safeParse({
    name: 'Policy Fixture', email: 'policy-fixture@example.test',
    password: 'x'.repeat(length), primaryLocationId: '10000000-0000-4000-8000-000000000001',
  }).success).toBe(valid);
});

it('keeps existing login UX validation without imposing creation rules on entered credentials', () => {
  expect(loginSchema.safeParse({ email: 'policy-fixture@example.test', password: 'x' }).success).toBe(true);
  expect(loginSchema.safeParse({ email: 'policy-fixture@example.test', password: '' }).success).toBe(false);
});
