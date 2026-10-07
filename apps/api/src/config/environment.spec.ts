import { parseCorsOrigins, validateEnvironment } from './environment.js';

describe('environment configuration', () => {
  const runtime = {
    NODE_ENV: 'development',
    PORT: '3001',
    CORS_ORIGINS: 'http://localhost:3000',
    FRONTEND_URL: 'http://localhost:3000',
    DATABASE_URL: 'postgresql://localhost/hyt_test',
    JWT_SECRET: 'test-jwt-secret-that-is-long-enough-32',
    CSRF_SECRET: 'test-csrf-secret-that-is-long-enough-32',
  };
  it('requires distinct strong credential secrets', () => {
    expect(() =>
      validateEnvironment({ ...runtime, JWT_SECRET: 'short' }),
    ).toThrow('JWT_SECRET');
    expect(() =>
      validateEnvironment({ ...runtime, CSRF_SECRET: runtime.JWT_SECRET }),
    ).toThrow('diferentes');
  });
  it('rejects HTTP origins and missing email configuration in production', () => {
    expect(() =>
      validateEnvironment({ ...runtime, NODE_ENV: 'production' }),
    ).toThrow('HTTPS');
    expect(() =>
      validateEnvironment({
        ...runtime,
        NODE_ENV: 'production',
        FRONTEND_URL: 'https://app.furvo.test',
        CORS_ORIGINS: 'https://app.furvo.test',
      }),
    ).toThrow('email');
  });
  it('validates frontend origin membership', () => {
    expect(() =>
      validateEnvironment({
        ...runtime,
        FRONTEND_URL: 'http://localhost:3002',
      }),
    ).toThrow('FRONTEND_URL');
  });
  it('normalizes a restricted list of CORS origins', () => {
    expect(
      parseCorsOrigins('https://app.furvo.test,http://localhost:3000'),
    ).toEqual(['https://app.furvo.test', 'http://localhost:3000']);
  });

  it.each([
    [{ PORT: '3000', CORS_ORIGINS: 'http://localhost:3000' }, 'NODE_ENV'],
    [
      {
        NODE_ENV: 'staging',
        PORT: '3000',
        CORS_ORIGINS: 'http://localhost:3000',
      },
      'NODE_ENV',
    ],
    [
      {
        NODE_ENV: 'development',
        PORT: 'invalid',
        CORS_ORIGINS: 'http://localhost:3000',
      },
      'PORT',
    ],
    [
      { NODE_ENV: 'development', PORT: '3000', CORS_ORIGINS: '*' },
      'CORS_ORIGINS',
    ],
  ])('rejects invalid configuration %#', (config, expectedMessage) => {
    expect(() => validateEnvironment(config)).toThrow(expectedMessage);
  });
});
