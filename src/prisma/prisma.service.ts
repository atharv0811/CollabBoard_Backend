import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

@Injectable()
export class PrismaService
  extends PrismaClient<{
    adapter: PrismaPg;
    log: { emit: 'event'; level: 'query' | 'warn' | 'error' }[];
  }>
  implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL!,
    });

    super({
      adapter,
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'warn' },
        { emit: 'event', level: 'error' },
      ],
    });

    this.$on('query', (event) => {
      this.logger.debug(
        `Query: ${event.query}\nExecution Time: ${event.duration.toFixed(2)}ms`,
      );
    });

    this.$on('warn', (event) => {
      this.logger.warn(event.message);
    });

    this.$on('error', (event) => {
      this.logger.error(event.message);
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
