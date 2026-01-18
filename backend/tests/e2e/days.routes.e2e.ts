import Fastify from 'fastify';
import supertest from 'supertest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { daysRoutes } from '../../src/routes/days.routes.js';
import * as repo from '../../src/repositories/electricity.repositories.js';

describe('E2E: /api/days routes', () => {
  let app: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    app = Fastify();

    // Mock repository functions
    vi.spyOn(repo, 'getDailyStats').mockResolvedValue([
      {
        date: '2026-01-18',
        totalConsumption: 10,
        totalProduction: 5,
        avgPrice: 2.5,
        maxConsumptionHour: 15,
        cheapestHour: 3,
      },
    ]);

    vi.spyOn(repo, 'getSingleDayStats').mockImplementation(
      async (date: string) => {
        if (date === '2026-01-18') {
          return {
            date,
            totalConsumption: 10,
            totalProduction: 5,
            avgPrice: 2.5,
            maxConsumptionHour: 15,
            cheapestHour: 3,
          };
        }
        return null;
      },
    );

    app.register(daysRoutes);
    await app.ready();
  });

  it('GET /api/days returns daily stats', async () => {
    const res = await supertest(app.server).get('/api/days');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].date).toBe('2026-01-18');
  });

  it('GET /api/days with invalid dateFrom returns 400', async () => {
    const res = await supertest(app.server)
      .get('/api/days')
      .query({ dateFrom: 'invalid-date' });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('dateFrom');
  });

  it('GET /api/days/:date returns single day stats', async () => {
    const res = await supertest(app.server).get('/api/days/2026-01-18');
    expect(res.status).toBe(200);
    expect(res.body.date).toBe('2026-01-18');
  });

  it('GET /api/days/:date with nonexistent date returns 404', async () => {
    const res = await supertest(app.server).get('/api/days/2026-01-19');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Date not found');
  });

  it('GET /api/days/:date with invalid date returns 400', async () => {
    const res = await supertest(app.server).get('/api/days/invalid-date');
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('date');
  });
});
