process.env.NODE_ENV = 'development';
process.env.PORT = '3001';
process.env.CORS_ORIGINS = 'http://localhost:3000';
process.env.DATABASE_URL ??= 'postgresql://hyt_test@127.0.0.1:55432/hyt_slice?schema=public';
process.env.JWT_SECRET = 'test-only-jwt-secret-longer-than-32-characters';
process.env.CSRF_SECRET = 'test-only-csrf-secret-longer-than-32-characters';
process.env.FRONTEND_URL = 'http://localhost:3000';
