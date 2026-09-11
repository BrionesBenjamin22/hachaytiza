import { parseCorsOrigins, validateEnvironment } from './environment.js';

describe('environment configuration', () => {
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
