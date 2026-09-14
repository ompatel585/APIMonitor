import 'reflect-metadata';
import { AppDataSource } from './data-source';

async function runMigrations(): Promise<void> {
  const dataSource = await AppDataSource.initialize();

  try {
    await dataSource.runMigrations();
  } finally {
    await dataSource.destroy();
  }
}

runMigrations()
  .then(() => {
    process.exit(0);
  })
  .catch((error: unknown) => {
    process.stderr.write(`Migration failed: ${String(error)}\n`);
    process.exit(1);
  });
