export type Environment = {
  NODE_ENV: 'development' | 'production';
  PORT: number;
  CORS_ORIGINS: string;
  DATABASE_URL: string;
  JWT_SECRET: string;
  CSRF_SECRET: string;
  FRONTEND_URL: string;
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
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
  for (const key of ['DATABASE_URL', 'FRONTEND_URL']) {
    if (typeof rawConfig[key] !== 'string' || !rawConfig[key])
      throw new Error(`${key} es obligatoria.`);
  }
  for (const key of ['JWT_SECRET', 'CSRF_SECRET']) {
    if (typeof rawConfig[key] !== 'string' || rawConfig[key].length < 32)
      throw new Error(`${key} debe contener al menos 32 caracteres.`);
  }
  if (rawConfig.JWT_SECRET === rawConfig.CSRF_SECRET)
    throw new Error('Los secretos JWT y CSRF deben ser diferentes.');
  const frontend = parseCorsOrigins(rawConfig.FRONTEND_URL as string);
  if (!parseCorsOrigins(corsOrigins).includes(frontend[0]))
    throw new Error('FRONTEND_URL debe estar permitido en CORS_ORIGINS.');
  if (nodeEnvironment === 'production') {
    if (
      parseCorsOrigins(corsOrigins).some(
        (origin) => !origin.startsWith('https://'),
      )
    )
      throw new Error('Producción requiere orígenes HTTPS.');
    if (!rawConfig.RESEND_API_KEY || !rawConfig.EMAIL_FROM)
      throw new Error('Producción requiere configuración de email.');
  }

  return {
    ...rawConfig,
    NODE_ENV: nodeEnvironment as Environment['NODE_ENV'],
    PORT: Number(port),
    CORS_ORIGINS: corsOrigins,
    DATABASE_URL: rawConfig.DATABASE_URL as string,
    JWT_SECRET: rawConfig.JWT_SECRET as string,
    CSRF_SECRET: rawConfig.CSRF_SECRET as string,
    FRONTEND_URL: rawConfig.FRONTEND_URL as string,
  };
}
