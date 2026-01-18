import { FastifyInstance } from 'fastify';
import {
  getDailyStats,
  getSingleDayStats,
} from '../repositories/electricity.repositories.js';

export async function daysRoutes(app: FastifyInstance) {
  const ISO_DATE_REGEX = '^\\d{4}-\\d{2}-\\d{2}$';

  function isRealISODate(s: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    const d = new Date(s);
    return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(s);
  }

  app.get(
    '/api/days',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'integer', minimum: 1, default: 1 },
            pageSize: {
              type: 'integer',
              minimum: 1,
              maximum: 200,
              default: 20,
            },
            sort: {
              type: 'string',
              enum: [
                'date',
                'total_consumption',
                'total_production',
                'avg_price',
                'longest_negative_streak_hours',
              ],
              default: 'date',
            },
            order: {
              type: 'string',
              enum: ['asc', 'desc'],
              default: 'asc',
            },
            dateFrom: {
              type: 'string',
              pattern: ISO_DATE_REGEX,
            },
            dateTo: {
              type: 'string',
              pattern: ISO_DATE_REGEX,
            },
            minPrice: { type: 'number' },
            maxPrice: { type: 'number' },
          },
          additionalProperties: false,
        },
      },
    },
    async (req, reply) => {
      const {
        page,
        pageSize,
        sort = 'day',
        order = 'asc',
        dateFrom,
        dateTo,
        minPrice,
        maxPrice,
      } = req.query as any;

      if (dateFrom && !isRealISODate(dateFrom)) {
        return reply
          .code(400)
          .send({ error: 'dateFrom must be a real YYYY-MM-DD date' });
      }

      if (dateTo && !isRealISODate(dateTo)) {
        return reply
          .code(400)
          .send({ error: 'dateTo must be a real YYYY-MM-DD date' });
      }

      if (dateFrom && dateTo && dateFrom > dateTo) {
        return reply.code(400).send({ error: 'dateFrom must be <= dateTo' });
      }

      const data = await getDailyStats({
        page,
        pageSize,
        sort: sort === 'day' ? 'date' : sort,
        order,
        dateFrom,
        dateTo,
        minPrice,
        maxPrice,
      });

      return { data };
    },
  );

  app.get(
    '/api/days/:date',
    {
      schema: {
        params: {
          type: 'object',
          properties: {
            date: {
              type: 'string',
              pattern: ISO_DATE_REGEX,
            },
          },
          required: ['date'],
          additionalProperties: false,
        },
      },
    },
    async (req, reply) => {
      const { date } = req.params as { date: string };
      const data = await getSingleDayStats(date);
      if (!isRealISODate(date)) {
        return reply
          .code(400)
          .send({ error: 'date must be a real YYYY-MM-DD date' });
      }
      if (!data) {
        return reply.code(404).send({ error: 'Date not found' });
      }
      return data;
    },
  );
}
