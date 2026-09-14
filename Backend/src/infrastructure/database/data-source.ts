import 'reflect-metadata';
import { config } from 'dotenv';
import { DataSource } from 'typeorm';

config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: ['src/modules/**/entities/*.entity.ts'],
  migrations: ['src/infrastructure/database/migrations/*.ts'],
  synchronize: false,
});
