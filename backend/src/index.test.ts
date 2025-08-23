import request from 'supertest';
import { app } from './index';

describe('API endpoints', () => {
  it('responds to GET /', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.text).toBe('Cyprus Bus Stop API');
  });

  it('returns array for /stops', async () => {
    const res = await request(app).get('/stops');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('returns 404 for unknown stop arrivals', async () => {
    const res = await request(app).get('/arrivals/unknown');
    expect(res.status).toBe(404);
  });
});
