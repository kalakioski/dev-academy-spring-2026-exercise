import 'dotenv/config';
import Fastify from 'fastify';
import { daysRoutes } from './routes/days.routes.js';

const app = Fastify();

app.register(daysRoutes);

app.listen({ port: 3000, host: '0.0.0.0' });
