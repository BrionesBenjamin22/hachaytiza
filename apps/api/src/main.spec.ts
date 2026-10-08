import { vi } from 'vitest';

const runtime = vi.hoisted(() => ({
  enableShutdownHooks: vi.fn(),
  listen: vi.fn().mockResolvedValue(undefined),
  get: vi.fn(() => ({ get: () => 3001 })),
}));
const configureApplication = vi.hoisted(() => vi.fn());

vi.mock('@nestjs/core', () => ({
  NestFactory: { create: vi.fn().mockResolvedValue(runtime) },
}));
vi.mock('./app.module.js', () => ({ AppModule: class {} }));
vi.mock('./configure-app.js', () => ({ configureApplication }));

describe('API process lifecycle', () => {
  it('registers shutdown hooks before listening so SIGTERM closes modules', async () => {
    await import('./main.js');

    expect(runtime.enableShutdownHooks).toHaveBeenCalledOnce();
    expect(configureApplication).toHaveBeenCalledWith(runtime);
    expect(runtime.listen).toHaveBeenCalledWith(3001);
    expect(runtime.enableShutdownHooks.mock.invocationCallOrder[0]).toBeLessThan(
      runtime.listen.mock.invocationCallOrder[0],
    );
  });
});
