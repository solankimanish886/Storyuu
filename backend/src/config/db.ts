import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from './logger.js';

export async function connectDB() {
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.MONGO_URI);
  logger.info('mongo connected');

  mongoose.connection.on('disconnected', () => logger.warn('mongo disconnected'));
  mongoose.connection.on('error', (err) => logger.error({ err }, 'mongo error'));
}
