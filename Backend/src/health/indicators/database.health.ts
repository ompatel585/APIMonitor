import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { DataSource } from 'typeorm';

@Injectable()
export class DatabaseHealthIndicator extends HealthIndicator {
  constructor(private readonly dataSource: DataSource) {
    super();
  }

  async check(key: string): Promise<HealthIndicatorResult> {
    try {
      await this.dataSource.query('SELECT 1');
      return this.getStatus(key, true);
    } catch {
      throw new HealthCheckError('Database check failed', this.getStatus(key, false));
    }
  }
}
