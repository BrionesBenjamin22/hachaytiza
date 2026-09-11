import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';
import { configureApplication } from '../src/configure-app.js';

describe('base API configuration (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApplication(app);
    await app.init();
  });

  it('serves the public health endpoint outside the API prefix', async () => {
    const response = await request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect({ status: 'ok' });

    expect(response.headers['x-request-id']).toMatch(/^req_/);
    await request(app.getHttpServer()).get('/api/v1/health').expect(404);
  });

  it('returns consistent errors with the generated request ID', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/missing')
      .expect(404);

    expect(response.body).toEqual({
      code: 'NOT_FOUND',
      message: 'No encontramos el recurso solicitado.',
      requestId: response.headers['x-request-id'],
    });
  });

  it('propagates a safe incoming request ID', async () => {
    const response = await request(app.getHttpServer())
      .get('/health')
      .set('x-request-id', 'client-request-123')
      .expect(200);

    expect(response.headers['x-request-id']).toBe('client-request-123');
  });

  it('publishes the generated OpenAPI document', async () => {
    const jsonResponse = await request(app.getHttpServer())
      .get('/api/v1/docs-json')
      .expect(200);
    const uiResponse = await request(app.getHttpServer())
      .get('/api/v1/docs')
      .expect(200);

    expect(jsonResponse.body.info.title).toBe('Hacha y Tiza API');
    expect(jsonResponse.body.paths).toHaveProperty('/health');
    expect(jsonResponse.headers['x-request-id']).toMatch(/^req_/);
    expect(uiResponse.headers['x-request-id']).toMatch(/^req_/);
  });

  afterAll(async () => {
    await app.close();
  });
});
