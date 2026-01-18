import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { daysRoutes } from './routes/days.routes.js';

const app = Fastify({
  ajv: {
    customOptions: {
      coerceTypes: true,
      removeAdditional: true,
    },
  },
});

await app.register(cors, {
  origin: true,
});

app.register(daysRoutes);

app.listen({ port: 3000, host: '0.0.0.0' }, () => {
  console.log('Server is running at http://localhost:3000');
});
