export type Environment = {
  NODE_ENV: 'development' | 'production';
  PORT: number;
  CORS_ORIGINS: string;
};

const allowedEnvironments = new Set<Environment['NODE_ENV']>([
  'development',
  'production',
]);

export function parseCorsOrigins(value: string): string[] {
  const origins = value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (origins.length === 0) {
    throw new Error('CORS_ORIGINS debe incluir al menos un origen permitido.');
  }

  const normalizedOrigins = origins.map((origin) => {
    if (origin === '*') {
      throw new Error('CORS_ORIGINS no permite comodines.');
    }

    let parsed: URL;
    try {
      parsed = new URL(origin);
    } catch {
      throw new Error(`CORS_ORIGINS contiene un origen inválido: ${origin}`);
    }

    if (
      !['http:', 'https:'].includes(parsed.protocol) ||
      parsed.origin !== origin ||
      parsed.username ||
      parsed.password
    ) {
      throw new Error(`CORS_ORIGINS contiene un origen inválido: ${origin}`);
    }

    return parsed.origin;
  });

  return [...new Set(normalizedOrigins)];
}

export function validateEnvironment(
  rawConfig: Record<string, unknown>,
): Record<string, unknown> & Environment {
  const nodeEnvironment = rawConfig.NODE_ENV;
  if (
    typeof nodeEnvironment !== 'string' ||
    !allowedEnvironments.has(nodeEnvironment as Environment['NODE_ENV'])
  ) {
    throw new Error('NODE_ENV debe ser development o production.');
  }

  const rawPort = rawConfig.PORT;
  const port = typeof rawPort === 'string' ? Number(rawPort) : rawPort;
  if (!Number.isInteger(port) || Number(port) < 1 || Number(port) > 65_535) {
    throw new Error('PORT debe ser un número entero entre 1 y 65535.');
  }

  const corsOrigins = rawConfig.CORS_ORIGINS;
  if (typeof corsOrigins !== 'string') {
    throw new Error('CORS_ORIGINS es obligatoria.');
  }
  parseCorsOrigins(corsOrigins);

  return {
    ...rawConfig,
    NODE_ENV: nodeEnvironment as Environment['NODE_ENV'],
    PORT: Number(port),
    CORS_ORIGINS: corsOrigins,
  };
}
