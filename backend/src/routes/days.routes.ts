import { FastifyInstance } from 'fastify';
import { getDailyStats } from '../repositories/electricity.repositories.js';

export async function daysRoutes(app: FastifyInstance) {
  app.get(
    '/api/days',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'number', default: 1 },
            pageSize: { type: 'number', default: 100 },
            sort: { type: 'string', default: 'date' },
            order: { type: 'string', default: 'asc' },
            dateFrom: { type: 'string' },
            dateTo: { type: 'string' },
            minPrice: { type: 'number' },
            maxPrice: { type: 'number' },
          },
        },
      },
    },
    async (req) => {
      const {
        page = 1,
        pageSize = 100,
        sort = 'day',
        order = 'asc',
        dateFrom,
        dateTo,
        minPrice,
        maxPrice,
      } = req.query as any;

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
    }
  );
}
