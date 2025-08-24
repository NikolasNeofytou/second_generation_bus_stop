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

  it('returns array for /alerts', async () => {
    const res = await request(app).get('/alerts');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('returns 404 for unknown stop arrivals', async () => {
    const res = await request(app).get('/arrivals/unknown');
    expect(res.status).toBe(404);
  });

  it('accepts board status reports', async () => {
    const payload = { uptime: 42, firmwareVersion: '1.0.0' };
    const postRes = await request(app).post('/board-status').send(payload);
    expect(postRes.status).toBe(201);
    const getRes = await request(app).get('/board-status');
    expect(getRes.status).toBe(200);
    expect(getRes.body[0]).toMatchObject(payload);
  });
});
