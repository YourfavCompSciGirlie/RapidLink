import request from 'supertest';

import { createApp } from '../src/app.js';

describe('RapidLink API', () => {
  const app = createApp();

  it('reports its health', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ status: 'ok', service: 'rapidlink-api' });
    expect(new Date(response.body.timestamp).toISOString()).toBe(response.body.timestamp);
  });

  it('returns a structured response for unknown routes', async () => {
    const response = await request(app).get('/api/unknown');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: {
        code: 'NOT_FOUND',
        message: 'Route GET /api/unknown was not found',
      },
    });
  });
});
