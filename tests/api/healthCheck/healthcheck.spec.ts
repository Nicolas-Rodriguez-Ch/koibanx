import request from 'supertest';
import express from 'express';
import { Express } from 'express-serve-static-core';
import healthCheck from '../../../src/api/healthCheck';
import routes from '../../../src/routes';

interface RouteLayer {
  route?: {
    path?: string;
    methods?: Record<string, boolean>;
  };
}

interface RegisteredRoute {
  path: string;
  methods: Record<string, boolean>;
}

describe('Health Check Route', () => {
  let app: Express;

  beforeAll(() => {
    app = express();
    routes(app);
  });

  it('should return 200 OK with correct response', async () => {
    const response = await request(app).get('/api/healthcheck').expect(200);

    expect(response.body).toEqual({
      message: 'Server running fine',
    });
  });
});
